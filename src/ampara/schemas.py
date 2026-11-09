from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from ampara.domain import validate_reading


class TelemetryCreate(BaseModel):
    event_id: UUID = Field(
        description="Identificador único do evento, gerado pelo dispositivo. Reutilize-o ao reenviar a mesma leitura.",
        examples=["8d1c1e4a-6f7a-4d1b-9c2e-5a6b7c8d9e01"],
    )
    vehicle_id: str = Field(
        min_length=1,
        max_length=80,
        pattern=r"^[A-Za-z0-9_-]+$",
        description="Identificador do veículo autorizado para este dispositivo no MVP.",
        examples=["classic-demo"],
    )
    recorded_at: datetime = Field(
        description="Data e hora em ISO 8601 com fuso horário. A API armazena o instante em UTC.",
        examples=["2026-11-06T12:30:00-03:00"],
    )
    pid: str = Field(
        min_length=4,
        max_length=4,
        description=(
            "Código OBD-II aceito: 0105 (temperatura do líquido de arrefecimento), "
            "010C (rotação do motor) ou 010D (velocidade). A disponibilidade depende do veículo."
        ),
        json_schema_extra={"enum": ["0105", "010C", "010D"]},
        examples=["010C"],
    )
    value: float = Field(
        allow_inf_nan=False,
        description=(
            "Valor numérico já convertido para a unidade indicada. Faixas aceitas: "
            "0105 de -40 a 215 celsius; 010C de 0 a 8000 rpm; 010D de 0 a 255 km/h."
        ),
        examples=[850],
    )
    unit: str = Field(
        min_length=1,
        max_length=16,
        description="Unidade correspondente ao PID: 0105 usa celsius, 010C usa rpm e 010D usa km/h.",
        json_schema_extra={"enum": ["celsius", "rpm", "km/h"]},
        examples=["rpm"],
    )

    @field_validator("recorded_at")
    @classmethod
    def timestamp_must_include_timezone(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.utcoffset() is None:
            raise ValueError("recorded_at precisa incluir fuso horário")
        return value

    @field_validator("pid")
    @classmethod
    def normalize_pid(cls, value: str) -> str:
        return value.upper()

    @model_validator(mode="after")
    def validate_pid_and_value(self) -> "TelemetryCreate":
        validate_reading(self.pid, self.value, self.unit)
        return self


class TelemetryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    event_id: UUID = Field(description="Identificador do evento enviado pelo dispositivo.")
    vehicle_id: str = Field(description="Identificador do veículo associado à leitura.")
    recorded_at: datetime = Field(description="Instante da leitura, normalizado para UTC.")
    pid: str = Field(description="Código OBD-II da leitura.")
    value: float = Field(description="Valor convertido para a unidade indicada.")
    unit: str = Field(description="Unidade do valor: celsius, rpm ou km/h.")
    duplicate: bool = Field(
        default=False,
        description=(
            "true quando o envio repete uma leitura idêntica já persistida; "
            "false quando uma nova leitura foi criada."
        ),
    )


class ErrorResponse(BaseModel):
    detail: str = Field(description="Mensagem que explica por que a solicitação foi rejeitada.")


class HealthResponse(BaseModel):
    status: Literal["ok"] = Field(
        description="Indica que a API e o banco estão disponíveis.",
        examples=["ok"],
    )


class ValidationError(BaseModel):
    loc: list[str | int] = Field(description="Localização do campo inválido no corpo ou nos parâmetros.")
    msg: str = Field(description="Motivo da rejeição do campo.")
    type: str = Field(description="Código da categoria de erro de validação.")


class HTTPValidationError(BaseModel):
    detail: list[ValidationError] = Field(description="Erros de validação da solicitação.")
