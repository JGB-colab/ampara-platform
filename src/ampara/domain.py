import re
from dataclasses import dataclass


@dataclass(frozen=True)
class PidRule:
    unit: str
    minimum: float
    maximum: float


# O MVP accepts only a small allowlist; supported PIDs still vary by vehicle.
PID_RULES = {
    "0105": PidRule(unit="celsius", minimum=-40, maximum=215),
    "010C": PidRule(unit="rpm", minimum=0, maximum=8000),
    "010D": PidRule(unit="km/h", minimum=0, maximum=255),
}

# SAE J2012: códigos de falha diagnóstica (DTC) começam com P/C/B/U + 4 hex.
DTC_PATTERN = re.compile(r"^[PCBU][0-9A-F]{4}$")
DTC_UNIT = "dtc"


def validate_reading(pid: str, value: float, unit: str) -> None:
    pid = pid.upper()
    if DTC_PATTERN.match(pid):
        if unit != DTC_UNIT:
            raise ValueError(f"Unidade inválida para o código {pid}; esperado: {DTC_UNIT}")
        if value not in (0.0, 1.0):
            raise ValueError(f"Código {pid} aceita apenas valor 0 (ausente) ou 1 (presente)")
        return
    rule = PID_RULES.get(pid)
    if rule is None:
        raise ValueError("PID não permitido")
    if unit != rule.unit:
        raise ValueError(f"Unidade inválida para o PID {pid}; esperado: {rule.unit}")
    if not rule.minimum <= value <= rule.maximum:
        raise ValueError(
            f"Valor fora do intervalo permitido para {pid} "
            f"({rule.minimum} a {rule.maximum} {rule.unit})"
        )
