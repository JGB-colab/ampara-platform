from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.pool import StaticPool
from sqlmodel import Session, SQLModel, create_engine

from ampara import api
from ampara.config import Settings
from ampara.database import get_session


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> Generator[TestClient, None, None]:
    test_engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    SQLModel.metadata.create_all(test_engine)
    monkeypatch.setattr(
        "ampara.api.settings",
        Settings(
            database_url="sqlite://",
            device_token="test-device-token",
            allowed_vehicle_id="classic-demo",
        ),
    )

    def get_test_session() -> Generator[Session, None, None]:
        with Session(test_engine) as session:
            yield session

    api.app.dependency_overrides[get_session] = get_test_session
    with TestClient(api.app) as test_client:
        yield test_client
    api.app.dependency_overrides.clear()
    test_engine.dispose()


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"X-Device-Token": "test-device-token"}


@pytest.fixture
def valid_reading() -> dict[str, object]:
    return {
        "event_id": "37b43d80-6288-4b05-bf9f-49de5e849a88",
        "vehicle_id": "classic-demo",
        "recorded_at": "2026-11-06T12:00:00Z",
        "pid": "010C",
        "value": 850.0,
        "unit": "rpm",
    }
