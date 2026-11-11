from fastapi.testclient import TestClient


def test_ingest_and_query_valid_reading(
    client: TestClient,
    auth_headers: dict[str, str],
    valid_reading: dict[str, object],
) -> None:
    created = client.post("/v1/telemetria", json=valid_reading, headers=auth_headers)

    assert created.status_code == 201
    assert created.json()["event_id"] == valid_reading["event_id"]
    assert created.json()["duplicate"] is False

    result = client.get(
        "/v1/veiculos/classic-demo/telemetria",
        headers=auth_headers,
    )

    assert result.status_code == 200
    assert len(result.json()) == 1
    assert result.json()[0]["pid"] == "010C"
    assert result.json()[0]["value"] == 850.0


def test_rejects_unknown_pid(
    client: TestClient,
    auth_headers: dict[str, str],
    valid_reading: dict[str, object],
) -> None:
    invalid = {**valid_reading, "pid": "FFFF"}

    response = client.post("/v1/telemetria", json=invalid, headers=auth_headers)

    assert response.status_code == 422
    assert "PID não permitido" in response.text


def test_rejects_value_outside_pid_range(
    client: TestClient,
    auth_headers: dict[str, str],
    valid_reading: dict[str, object],
) -> None:
    invalid = {**valid_reading, "value": 9000}

    response = client.post("/v1/telemetria", json=invalid, headers=auth_headers)

    assert response.status_code == 422


def test_rejects_timestamp_without_timezone(
    client: TestClient,
    auth_headers: dict[str, str],
    valid_reading: dict[str, object],
) -> None:
    invalid = {**valid_reading, "recorded_at": "2026-11-06T12:00:00"}

    response = client.post("/v1/telemetria", json=invalid, headers=auth_headers)

    assert response.status_code == 422


def test_requires_device_token(
    client: TestClient,
    valid_reading: dict[str, object],
) -> None:
    response = client.post("/v1/telemetria", json=valid_reading)

    assert response.status_code == 401


def test_device_cannot_write_for_another_vehicle(
    client: TestClient,
    auth_headers: dict[str, str],
    valid_reading: dict[str, object],
) -> None:
    invalid = {**valid_reading, "vehicle_id": "other-vehicle"}

    response = client.post("/v1/telemetria", json=invalid, headers=auth_headers)

    assert response.status_code == 403


def test_duplicate_event_is_idempotent(
    client: TestClient,
    auth_headers: dict[str, str],
    valid_reading: dict[str, object],
) -> None:
    first = client.post("/v1/telemetria", json=valid_reading, headers=auth_headers)
    second = client.post("/v1/telemetria", json=valid_reading, headers=auth_headers)

    assert first.status_code == 201
    assert second.status_code == 200
    assert second.json()["duplicate"] is True
    history = client.get("/v1/veiculos/classic-demo/telemetria", headers=auth_headers)
    assert len(history.json()) == 1


def test_rejects_reused_event_id_with_different_content(
    client: TestClient,
    auth_headers: dict[str, str],
    valid_reading: dict[str, object],
) -> None:
    client.post("/v1/telemetria", json=valid_reading, headers=auth_headers)
    changed = {**valid_reading, "value": 900.0}

    response = client.post("/v1/telemetria", json=changed, headers=auth_headers)

    assert response.status_code == 409


def test_health_and_openapi_are_available(client: TestClient) -> None:
    health = client.get("/health")
    contract = client.get("/openapi.json")

    assert health.status_code == 200
    assert health.json() == {"status": "ok"}
    assert contract.status_code == 200
    assert "/v1/telemetria" in contract.json()["paths"]


def test_metrics_endpoint_exposes_http_metrics(client: TestClient) -> None:
    client.get("/health")

    response = client.get("/metrics")

    assert response.status_code == 200
    assert "http_requests_total" in response.text
    assert "http_request_duration_seconds" in response.text
