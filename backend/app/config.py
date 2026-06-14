import uuid
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://lifeplanner:lifeplanner123@localhost:5432/life_planner"
    anthropic_api_key: str = ""
    gemini_api_key: str = ""
    dev_user_id: uuid.UUID = uuid.UUID("00000000-0000-0000-0000-000000000001")

    # JWT
    jwt_secret_key: str = "CHANGE_ME_USE_openssl_rand_-hex_32_IN_PRODUCTION"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 15
    refresh_token_expire_days: int = 7
    # Cookies
    cookie_secure: bool = False  # set True in production (HTTPS)
    # Session (for OAuth state)
    session_secret_key: str = "CHANGE_ME_SESSION_SECRET"
    # OAuth
    google_client_id: str = ""
    google_client_secret: str = ""
    github_client_id: str = ""
    github_client_secret: str = ""
    # URLs
    frontend_url: str = "http://localhost:5173"
    backend_url: str = "http://localhost:8000"


settings = Settings()
