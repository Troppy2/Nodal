"""Web search and fetch for the research agent. `WebResearch` is the interface the pipeline uses;
`TinyFishWebResearch` implements it against TinyFish (docs.tinyfish.ai):

- Search: GET https://api.search.tinyfish.ai/?query=...  -> {results: [{title, url, snippet, site_name}]}
- Fetch:  POST https://api.fetch.tinyfish.ai/ {urls (<=10), format, per_url_timeout_ms}
          -> {results: [{url, title, text}], errors: [{url, error}]}

Both take the key in an `X-API-Key` header. Fetched pages are untrusted data; nothing here follows
links found in them."""

from typing import Protocol

import httpx

from ..config import settings

SEARCH_URL = "https://api.search.tinyfish.ai/"
FETCH_URL = "https://api.fetch.tinyfish.ai/"
EXCLUDE = "pinterest.com,quora.com,facebook.com,instagram.com,tiktok.com"
PAGE_CHARS = 8000
PER_URL_TIMEOUT_MS = 20000


class WebResearch(Protocol):
    def search(self, query: str, max_results: int = 5) -> list[dict]: ...
    def fetch(self, urls: list[str]) -> dict[str, dict]: ...


class TinyFishWebResearch:
    def __init__(self, api_key: str | None = None):
        self.headers = {"X-API-Key": api_key or settings.tinyfish_api_key}

    def search(self, query: str, max_results: int = 5) -> list[dict]:
        r = httpx.get(SEARCH_URL, headers=self.headers, timeout=30,
                      params={"query": query, "exclude_domains": EXCLUDE, "purpose": "Market research on a product idea"})
        r.raise_for_status()
        return [{"title": x.get("title") or "", "url": x["url"], "snippet": x.get("snippet") or ""}
                for x in r.json().get("results", [])[:max_results]]

    def fetch(self, urls: list[str]) -> dict[str, dict]:
        """{url: {title, markdown}} for pages that loaded, truncated to PAGE_CHARS. Failed pages are left out."""
        out: dict[str, dict] = {}
        for i in range(0, len(urls), 10):
            r = httpx.post(FETCH_URL, headers=self.headers, timeout=PER_URL_TIMEOUT_MS / 1000 + 15,
                           json={"urls": urls[i:i + 10], "format": "markdown", "per_url_timeout_ms": PER_URL_TIMEOUT_MS})
            r.raise_for_status()
            for page in r.json().get("results", []):
                if isinstance(page.get("text"), str) and page["text"].strip():
                    out[page["url"]] = {"title": page.get("title") or "", "markdown": page["text"][:PAGE_CHARS]}
        return out
