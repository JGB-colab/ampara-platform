"""Gera eventos de telemetria sintéticos e reproduzíveis para o teste de carga k6.

Uso:
    python scripts/gerar_carga.py [quantidade] [arquivo_de_saida]

Padrão: 20000 eventos em scripts/carga/eventos.json, semente fixa 42.
Cada evento usa UUID5 derivado do índice, garantindo event_id único e
reproduzível entre execuções. Os valores respeitam as faixas do contrato:
0105 (-40 a 215 celsius), 010C (0 a 8000 rpm) e 010D (0 a 255 km/h).
"""

import json
import random
import sys
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import NAMESPACE_URL, uuid5

SEED = 42
DEFAULT_COUNT = 20_000
DEFAULT_OUTPUT = Path(__file__).parent / "carga" / "eventos.json"
VEHICLE_ID = "classic-demo"

PIDS = {
    "0105": ("celsius", -40.0, 215.0),
    "010C": ("rpm", 0.0, 8000.0),
    "010D": ("km/h", 0.0, 255.0),
}


def generate_events(count: int) -> list[dict]:
    rng = random.Random(SEED)
    base_time = datetime(2026, 11, 10, 12, 0, 0, tzinfo=UTC)
    pids = list(PIDS)
    events = []
    for index in range(count):
        pid = rng.choice(pids)
        unit, minimum, maximum = PIDS[pid]
        # Valores concentrados em faixas realistas de operação, não uniformes.
        if pid == "010C":
            value = round(rng.uniform(600.0, 3500.0), 1)
        elif pid == "0105":
            value = round(rng.uniform(75.0, 105.0), 1)
        else:
            value = round(rng.uniform(0.0, 140.0), 1)
        events.append(
            {
                "event_id": str(uuid5(NAMESPACE_URL, f"ampara-carga-{SEED}-{index}")),
                "vehicle_id": VEHICLE_ID,
                "recorded_at": (base_time - timedelta(seconds=rng.uniform(0, 86_400))).isoformat(),
                "pid": pid,
                "value": min(max(value, minimum), maximum),
                "unit": unit,
            }
        )
    return events


def main() -> None:
    count = int(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_COUNT
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else DEFAULT_OUTPUT
    events = generate_events(count)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(events, ensure_ascii=False, indent=1), encoding="utf-8")
    print(f"{len(events)} eventos gerados em {output}")


if __name__ == "__main__":
    main()
