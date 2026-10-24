from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    supabase_url: str = ""
    supabase_anon_key: str = ""
    supabase_jwt_secret: str = "dev-secret-change-me-dev-secret-change-me"
    supabase_service_key: str = ""
    frontend_origin: str = "http://localhost:3000"
    # Name-only sign-in (POST /auth/name): anyone who types a name signs in as that person.
    # Fine for the demo; set NAME_SIGNIN_ENABLED=false anywhere real accounts live.
    name_signin_enabled: bool = True
    source_max_zip_mb: int = 25
    source_max_files: int = 1000
    source_max_uncompressed_mb: int = 100
    llm_base_url: str = "https://openrouter.ai/api/v1"
    llm_api_key: str = ""
    llm_model: str = ""
    tinyfish_api_key: str = ""
    research_mode: str = "live"
    research_max_queries: int = 6
    research_max_pages: int = 8
    research_timeout_s: int = 180
    research_runs_per_day: int = 3


settings = Settings()
