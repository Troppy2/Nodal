"""One OpenAI-compatible client for OpenRouter (deployed) and Ollama (local dev only).

`llm_json` asks for JSON only, validates it with a Pydantic model, and on failure retries once with
the validation error appended. A second failure raises `LLMError`. Keys are never logged."""

import json
import re
from functools import lru_cache
from typing import TypeVar

from openai import OpenAI
from pydantic import BaseModel, ValidationError

from ..config import settings

T = TypeVar("T", bound=BaseModel)
TIMEOUT_S = 60


class LLMError(Exception):
    pass


@lru_cache
def _client() -> OpenAI:
    if not settings.llm_model:
        raise LLMError("LLM_MODEL is not set")
    return OpenAI(base_url=settings.llm_base_url, api_key=settings.llm_api_key or "none", timeout=TIMEOUT_S)


def _complete(messages: list[dict]) -> str:
    resp = _client().chat.completions.create(model=settings.llm_model, messages=messages, temperature=0.2)
    return resp.choices[0].message.content or ""


def _parse(text: str, schema: type[T]) -> T:
    # Models sometimes wrap JSON in a ```json fence; take the outermost object.
    match = re.search(r"\{.*\}", text, re.S)
    return schema.model_validate(json.loads(match.group(0) if match else text))


def llm_json(messages: list[dict], schema: type[T], complete=None) -> T:
    """`complete(messages) -> str` is injectable for tests; it defaults to the configured model."""
    complete = complete or _complete
    shape = json.dumps(schema.model_json_schema())
    msgs = [{"role": "system", "content": f"Reply with one JSON object only, matching this JSON schema: {shape}"},
            *messages]
    text = ""
    for attempt in range(2):
        try:
            text = complete(msgs)
            return _parse(text, schema)
        except (ValueError, ValidationError) as exc:  # json.JSONDecodeError is a ValueError
            if attempt:
                raise LLMError(f"Model returned invalid JSON: {str(exc)[:200]}") from exc
            msgs = [*msgs, {"role": "assistant", "content": text},
                    {"role": "user", "content": f"That was not valid. Fix it and reply with JSON only. Error: {str(exc)[:500]}"}]
        except LLMError:
            raise
        except Exception as exc:  # network, auth, rate limit
            raise LLMError(f"LLM call failed: {type(exc).__name__}") from exc
    raise LLMError("unreachable")
