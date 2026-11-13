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
import re
import sys
import tempfile
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
    "0105": ("celsius", (82.0, 95.0)),   # temperatura do refrigerante
    "010C": ("rpm", (700.0, 3200.0)),  # rotação do motor
    "010D": ("km/h", (0.0, 120.0)),  # velocidade
}

_LOCK_FH = None  # mantém a trava viva durante a execução


def _take_lock() -> None:
    """Trava de instância única: impede dois coletores disputando a mesma
    porta COM. A trava é liberada pelo SO se o processo morrer."""
    global _LOCK_FH
    if _LOCK_FH is not None:
        return
    path = os.path.join(tempfile.gettempdir(), "ampara-coletor.lock")
    fh = open(path, "a+", encoding="utf-8")
    try:
        if os.name == "nt":
            import msvcrt

            fh.seek(0)
            msvcrt.locking(fh.fileno(), msvcrt.LK_NBLCK, 1)
        else:
            import fcntl

            fh.seek(0)
            fcntl.flock(fh.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
    except OSError:
        fh.close()
        raise SystemExit(
            "Ja existe uma coleta rodando em outra janela. "
            "Feche-a (Ctrl+C) antes de iniciar uma nova."
        )
    _LOCK_FH = fh


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


def connect_with_retry(port: str, attempts: int = 4, delay: float = 3.0):
    """Abre a porta com retry: o perfil Bluetooth SPP do Windows precisa de
    alguns segundos para religar depois que outra sessão fecha a porta."""
    import obd

    last_error = None
    for attempt in range(1, attempts + 1):
        print(f"Conectando ao ELM327 em {port} (tentativa {attempt}/{attempts})...")
        try:
            connection = obd.OBD(portstr=port)
        except Exception as exc:  # porta ocupada/desconectada durante a abertura
            last_error = exc
            print(f"  porta ocupada ou desconectada ({exc}); aguardando {delay:.0f}s...")
            time.sleep(delay)
            continue
        if connection.is_connected():
            return connection
        last_error = "sem resposta do ELM327"
        print(f"  sem resposta ainda; aguardando {delay:.0f}s...")
        time.sleep(delay)
    raise SystemExit(
        f"Não foi possível conectar ao ELM327 em {port} após {attempts} tentativas "
        f"({last_error}). Verifique pareamento, ignição ligada e se outra "
        f"aplicação (ex.: Car Scanner) não está usando a porta."
    )


def real(port: str, interval: float, count: int | None) -> None:
    import obd

    _take_lock()
    connection = connect_with_retry(port)
    print(f"[real] conectado em {port}")

    sent = 0
    try:
        while count is None or sent < count:
            readings = 0
            for pid, command_name in COMMANDS.items():
                response = connection.query(getattr(obd.commands, command_name))
                if response.is_null():
                    continue
                readings += 1
                post(pid, round(float(response.value), 1), PIDS[pid][0])
            sent += 1
            if readings == 0:
                print(
                    f"[real] ciclo {sent}: 0 leituras - nenhum PID respondeu "
                    "(ignicao ligada? dongle na porta certa?)",
                    file=sys.stderr,
                )
            else:
                print(f"[real] ciclo {sent} enviado ({readings} leituras)")
            time.sleep(interval)
    except KeyboardInterrupt:
        print("\n[real] interrompido")
    finally:
        connection.close()


DTC_PATTERN = re.compile(r"^[PCBU][0-9A-F]{4}$")


def read_dtcs(port: str) -> None:
    try:
        import obd
    except ImportError:
        raise SystemExit("Modo real requer: pip install obd")

    connection = obd.OBD(portstr=port)
    if not connection.is_connected():
        raise SystemExit(f"Não foi possível conectar ao ELM327 em {port}.")
    try:
        response = connection.query(obd.commands.GET_DTC)
        if response.is_null():
            print("Nenhum código de falha ativo.")
            return
        count = 0
        for dtc in response.value:
            code = getattr(dtc, "name", None) or str(dtc)
            code = code.strip().upper()
            if not DTC_PATTERN.match(code):
                continue
            post(code, 1, "dtc")
            print(f"DTC {code} registrado")
            count += 1
        if count == 0:
            print("Resposta de DTC não reconhecida:", response.value)
    finally:
        connection.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Coletor de telemetria Ampara")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--sim", action="store_true", help="leituras simuladas")
    group.add_argument("--real", metavar="COMx", help="porta serial do ELM327 (ex.: COM5)")
    parser.add_argument("--dtc", action="store_true", help="apenas lê e envia códigos de falha (modo real)")
    parser.add_argument("--interval", type=float, default=5.0, help="segundos entre ciclos (padrão 5)")
    parser.add_argument("--count", type=int, default=None, help="nº de ciclos (padrão: infinito)")
    args = parser.parse_args()

    if not TOKEN:
        raise SystemExit("AMAPARA_DEVICE_TOKEN precisa estar configurado")

    if args.dtc:
        if not args.real:
            raise SystemExit("--dtc requer --real COMx")
        _take_lock()
        read_dtcs(args.real)
    elif args.sim:
        simulate(args.interval, args.count)
    else:
        real(args.real, args.interval, args.count)


if __name__ == "__main__":
    main()
