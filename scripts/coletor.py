"""Coletor de telemetria Ampara.

Dois modos:
  --sim           gera leituras realistas contínuas (teste do pipeline sem hardware)
  --real COMx     lê PIDs reais via python-OBD no dongle ELM327 pareado

Env: AMAPARA_BASE_URL, AMAPARA_DEVICE_TOKEN, AMAPARA_ALLOWED_VEHICLE_ID.
"""

import argparse
import json
import os
import random
import sys
import time
from datetime import UTC, datetime
from urllib.error import URLError
from urllib.request import Request, urlopen
from uuid import uuid4

BASE_URL = os.getenv("AMAPARA_BASE_URL", "http://localhost:8001").rstrip("/")
TOKEN = os.getenv("AMAPARA_DEVICE_TOKEN")
VEHICLE_ID = os.getenv("AMAPARA_ALLOWED_VEHICLE_ID", "classic-demo")

# PID -> (unidade, faixa de simulação)
PIDS = {
    "0105": ("°C", (82.0, 95.0)),   # temperatura do refrigerante
    "010C": ("rpm", (700.0, 3200.0)),  # rotação do motor
    "010D": ("km/h", (0.0, 120.0)),  # velocidade
}


def post(pid: str, value: float, unit: str) -> None:
    body = {
        "event_id": str(uuid4()),
        "vehicle_id": VEHICLE_ID,
        "recorded_at": datetime.now(UTC).isoformat(),
        "pid": pid,
        "value": value,
        "unit": unit,
    }
    req = Request(
        f"{BASE_URL}/v1/telemetria",
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Device-Token": TOKEN},
        method="POST",
    )
    try:
        with urlopen(req, timeout=10) as res:
            if res.status not in (200, 201):
                print(f"[!] {pid}: HTTP {res.status}", file=sys.stderr)
    except (OSError, URLError) as exc:
        print(f"[!] {pid}: falha ao enviar ({exc})", file=sys.stderr)


def simulate(interval: float, count: int | None) -> None:
    sent = 0
    try:
        while count is None or sent < count:
            for pid, (unit, (lo, hi)) in PIDS.items():
                # deriva suave: cada ciclo se aproxima do centro da faixa
                value = round(random.uniform(lo, hi), 1)
                post(pid, value, unit)
            sent += 1
            print(f"[sim] ciclo {sent} enviado para {BASE_URL}")
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[sim] interrompido")


# PID OBD-II -> comando python-OBD
COMMANDS = {
    "0105": "COOLANT_TEMP",
    "010C": "RPM",
    "010D": "SPEED",
}


def real(port: str, interval: float, count: int | None) -> None:
    try:
        import obd
    except ImportError:
        raise SystemExit("Modo real requer: pip install obd")

    connection = obd.OBD(portstr=port)
    if not connection.is_connected():
        raise SystemExit(f"Não foi possível conectar ao ELM327 em {port}. Verifique o pareamento e a porta COM.")
    print(f"[real] conectado em {port}")

    sent = 0
    try:
        while count is None or sent < count:
            for pid, command_name in COMMANDS.items():
                response = connection.query(getattr(obd.commands, command_name))
                if response.is_null():
                    continue
                post(pid, round(float(response.value), 1), PIDS[pid][0])
            sent += 1
            print(f"[real] ciclo {sent} enviado")
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[real] interrompido")
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Coletor de telemetria Ampara")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--sim", action="store_true", help="leituras simuladas")
    group.add_argument("--real", metavar="COMx", help="porta serial do ELM327 (ex.: COM5)")
    parser.add_argument("--interval", type=float, default=5.0, help="segundos entre ciclos (padrão 5)")
    parser.add_argument("--count", type=int, default=None, help="nº de ciclos (padrão: infinito)")
    args = parser.parse_args()

    if not TOKEN:
        raise SystemExit("AMAPARA_DEVICE_TOKEN precisa estar configurado")

    if args.sim:
        simulate(args.interval, args.count)
    else:
        real(args.real, args.interval, args.count)


if __name__ == "__main__":
    main()
