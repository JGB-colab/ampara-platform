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


def validate_reading(pid: str, value: float, unit: str) -> None:
    rule = PID_RULES.get(pid.upper())
    if rule is None:
        raise ValueError("PID não permitido")
    if unit != rule.unit:
        raise ValueError(f"Unidade inválida para o PID {pid.upper()}; esperado: {rule.unit}")
    if not rule.minimum <= value <= rule.maximum:
        raise ValueError(
            f"Valor fora do intervalo permitido para {pid.upper()} "
            f"({rule.minimum} a {rule.maximum} {rule.unit})"
        )
