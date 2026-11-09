import json
import os
import time
from datetime import UTC, datetime
from urllib.error import URLError
from urllib.request import Request, urlopen
from uuid import uuid4


base_url = os.getenv("AMAPARA_BASE_URL", "http://localhost:8001").rstrip("/")
token = os.getenv("AMAPARA_DEVICE_TOKEN")
vehicle_id = os.getenv("AMAPARA_ALLOWED_VEHICLE_ID", "classic-demo")
if not token:
    raise SystemExit("AMAPARA_DEVICE_TOKEN precisa estar configurado")


def request(url: str, method: str = "GET", body: dict | None = None) -> tuple[int, dict]:
    data = json.dumps(body).encode("utf-8") if body is not None else None
    headers = {"X-Device-Token": token}
    if data is not None:
        headers["Content-Type"] = "application/json"
    req = Request(url, data=data, headers=headers, method=method)
    with urlopen(req, timeout=3) as response:
        return response.status, json.loads(response.read().decode("utf-8"))


for attempt in range(30):
    try:
        with urlopen(f"{base_url}/health", timeout=2) as response:
            if response.status == 200:
                break
    except (OSError, URLError):
        if attempt == 29:
            raise SystemExit("API não ficou saudável dentro do tempo limite")
        time.sleep(2)

event = {
    "event_id": str(uuid4()),
    "vehicle_id": vehicle_id,
    "recorded_at": datetime.now(UTC).isoformat(),
    "pid": "010C",
    "value": 850.0,
    "unit": "rpm",
}
status, created = request(f"{base_url}/v1/telemetria", method="POST", body=event)
if status not in (200, 201):
    raise SystemExit(f"Ingestão falhou: HTTP {status}")

status, readings = request(f"{base_url}/v1/veiculos/{vehicle_id}/telemetria")
if status != 200 or not any(item["event_id"] == event["event_id"] for item in readings):
    raise SystemExit("Leitura não apareceu na consulta após a ingestão")

print("Smoke test aprovado: health, ingestão autenticada e consulta confirmados.")
