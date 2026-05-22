from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    database_url: str
    redis_url: str
    qdrant_url: str
    ollama_url: str
    jwt_secret: str
    jwt_algorithm: str = "HS256"
    jwt_expire_hours: int = 24

    environment: str = "development"
    allowed_origins: list[str] = ["http://localhost:3001"]


@lru_cache
def get_settings() -> Settings:
    return Settings()
