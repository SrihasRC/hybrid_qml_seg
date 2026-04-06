from __future__ import annotations

from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    api_title: str = "Meningioma Segmentation Backend"
    api_version: str = "1.0.0"
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    model_device: str = "cpu"
    allow_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000"

    project_root: Path = Path(__file__).resolve().parents[2]
    backend_root: Path = Path(__file__).resolve().parents[1]
    registry_path: Path = Path(__file__).resolve().parents[1] / "model_registry.json"
    report_diagrams_dir: Path = Path(__file__).resolve().parents[2] / "report_docs" / "diagrams+flowcharts"

    model_config = SettingsConfigDict(
        env_file=Path(__file__).resolve().parents[1] / ".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allow_origins.split(",") if origin.strip()]


settings = Settings()
