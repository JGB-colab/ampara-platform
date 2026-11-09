import os
from dataclasses import dataclass


@dataclass(frozen=True)
class Settings:
    database_url: str
    device_token: str
    allowed_vehicle_id: str


def load_settings() -> Settings:
    return Settings(
        database_url=os.getenv("DATABASE_URL", "sqlite:///./ampara.db"),
        device_token=os.getenv("AMAPARA_DEVICE_TOKEN", ""),
        allowed_vehicle_id=os.getenv("AMAPARA_ALLOWED_VEHICLE_ID", ""),
    )


settings = load_settings()
