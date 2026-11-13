from datetime import datetime

from sqlalchemy import DateTime, UniqueConstraint
from sqlmodel import Field, SQLModel


class TelemetryRecord(SQLModel, table=True):
    __table_args__ = (UniqueConstraint("vehicle_id", "event_id", name="uq_telemetry_vehicle_event"),)

    id: int | None = Field(default=None, primary_key=True)
    event_id: str = Field(index=True, max_length=36)
    vehicle_id: str = Field(index=True, max_length=80)
    recorded_at: datetime = Field(sa_type=DateTime(timezone=True))
    pid: str = Field(max_length=5)
    value: float
    unit: str = Field(max_length=16)
