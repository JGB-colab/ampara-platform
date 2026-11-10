import os
from collections.abc import Generator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlmodel import Session, create_engine

from ampara import api
from ampara.config import Settings
from ampara.database import get_session


@pytest.fixture
def postgres_client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        pytest.skip("DATABASE_URL is required for PostgreSQL integration tests")

    test_engine = create_engine(database_url, pool_pre_ping=True)
    monkeypatch.setattr(
        "ampara.api.settings",
        Settings(
            database_url=database_url,
            device_token="integration-device-token",
            allowed_vehicle_id="integration-demo",
        ),
    )

    def get_postgres_session() -> Generator[Session, None, None]:
        with Session(test_engine) as session:
            yield session

    api.app.dependency_overrides[get_session] = get_postgres_session
    try:
        with TestClient(api.app) as test_client:
            yield test_client
    finally:
        api.app.dependency_overrides.clear()
        test_engine.dispose()


@pytest.mark.integration
def test_telemetry_persists_and_can_be_queried_from_postgres(postgres_client: TestClient) -> None:
    event_id = str(uuid4())
    payload = {
        "event_id": event_id,
        "vehicle_id": "integration-demo",
        "recorded_at": "2026-11-06T12:00:00Z",
        "pid": "010C",
        "value": 850,
        "unit": "rpm",
    }
    headers = {"X-Device-Token": "integration-device-token"}

    created = postgres_client.post("/v1/telemetria", json=payload, headers=headers)
    queried = postgres_client.get(
        "/v1/veiculos/integration-demo/telemetria",
        headers=headers,
    )

    assert created.status_code == 201
    assert created.json()["event_id"] == event_id
    assert created.json()["duplicate"] is False
    assert queried.status_code == 200
    assert any(item["event_id"] == event_id for item in queried.json())
