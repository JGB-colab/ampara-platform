import hmac
from contextlib import asynccontextmanager
from datetime import UTC
from pathlib import Path as FsPath
from typing import Annotated

from fastapi import Body, Depends, FastAPI, HTTPException, Path, Query, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import FileResponse, JSONResponse
from fastapi.security import APIKeyHeader
from fastapi.staticfiles import StaticFiles
from prometheus_fastapi_instrumentator import Instrumentator
from sqlalchemy.exc import IntegrityError
from sqlmodel import Session, select

from ampara.config import settings
from ampara.database import get_session
from ampara.models import TelemetryRecord
from ampara.schemas import (
    ErrorResponse,
    HealthResponse,
    HTTPValidationError,
    TelemetryCreate,
    TelemetryRead,
    ValidationError,
)


device_token_header = APIKeyHeader(
    name="X-Device-Token",
    scheme_name="DeviceToken",
    auto_error=False,
    description="Token configurado localmente para o dispositivo.",
)


@asynccontextmanager
async def lifespan(_: FastAPI):
    # Schema changes are managed by Alembic; do not mutate schema on app startup.
    yield


app = FastAPI(
    title="Ampara Telemetry API",
    description=(
        "API didática para registrar e consultar leituras sintéticas de telemetria. "
        "Uma leitura é um valor de um PID OBD-II em um instante; ela não é, por si só, um diagnóstico do veículo. "
        "Use /docs para explorar as operações e exemplos. A credencial deste MVP autoriza somente um veículo configurado."
    ),
    version="0.1.0",
    lifespan=lifespan,
)

Instrumentator().instrument(app).expose(app, endpoint="/metrics", include_in_schema=False)

STATIC_DIR = FsPath(__file__).parent / "static"
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")


@app.get("/", include_in_schema=False)
def index() -> FileResponse:
    return FileResponse(STATIC_DIR / "index.html")


@app.get("/coletor", include_in_schema=False)
def coletor() -> FileResponse:
    return FileResponse(STATIC_DIR / "coletor.html")


@app.exception_handler(RequestValidationError)
async def sanitize_validation_error(
    _request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    detail = [
        ValidationError(
            loc=list(error["loc"]),
            msg=error["msg"],
            type=error["type"],
        )
        for error in exc.errors()
    ]
    body = HTTPValidationError(detail=detail)
    return JSONResponse(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, content=body.model_dump(mode="json"))


def _authorize_vehicle(vehicle_id: str, x_device_token: str | None) -> None:
    if not settings.device_token or not settings.allowed_vehicle_id:
        raise HTTPException(status_code=503, detail="Autenticação do dispositivo não configurada")
    if not x_device_token or not hmac.compare_digest(x_device_token, settings.device_token):
        raise HTTPException(status_code=401, detail="Credencial de dispositivo inválida")
    if settings.allowed_vehicle_id != "*" and not hmac.compare_digest(vehicle_id, settings.allowed_vehicle_id):
        raise HTTPException(status_code=403, detail="Dispositivo não autorizado para este veículo")


def require_authorized_vehicle(
    vehicle_id: str = Path(
        description="Identificador do veículo autorizado para este dispositivo.",
        examples=["classic-demo"],
    ),
    x_device_token: str | None = Depends(device_token_header),
) -> None:
    _authorize_vehicle(vehicle_id, x_device_token)


@app.get(
    "/health",
    response_model=HealthResponse,
    tags=["health"],
    summary="Verificar disponibilidade da API e do banco",
    description="Confirma que a API responde e consegue executar uma consulta simples no banco de dados.",
    responses={503: {"model": ErrorResponse, "description": "O banco de dados está indisponível."}},
)
def health(session: Session = Depends(get_session)) -> HealthResponse:
    try:
        session.connection().exec_driver_sql("SELECT 1")
    except Exception as exc:
        raise HTTPException(status_code=503, detail="Banco indisponível") from exc
    return HealthResponse(status="ok")


@app.post(
    "/v1/telemetria",
    response_model=TelemetryRead,
    status_code=status.HTTP_201_CREATED,
    tags=["telemetria"],
    summary="Registrar uma leitura de telemetria",
    description=(
        "Recebe uma leitura por solicitação. O token deve estar autorizado para o vehicle_id informado. "
        "Envie event_id como UUID e reutilize-o ao repetir o mesmo evento: conteúdo idêntico retorna 200 "
        "sem criar outra linha; conteúdo diferente retorna 409. O timestamp precisa incluir fuso horário e é armazenado em UTC."
    ),
    responses={
        201: {
            "model": TelemetryRead,
            "description": "Leitura criada.",
            "content": {
                "application/json": {
                    "example": {
                        "event_id": "8d1c1e4a-6f7a-4d1b-9c2e-5a6b7c8d9e01",
                        "vehicle_id": "classic-demo",
                        "recorded_at": "2026-11-06T15:30:00Z",
                        "pid": "010C",
                        "value": 850,
                        "unit": "rpm",
                        "duplicate": False,
                    }
                }
            },
        },
        200: {
            "model": TelemetryRead,
            "description": "A leitura idêntica já existia; nenhuma linha nova foi criada.",
            "content": {
                "application/json": {
                    "example": {
                        "event_id": "8d1c1e4a-6f7a-4d1b-9c2e-5a6b7c8d9e01",
                        "vehicle_id": "classic-demo",
                        "recorded_at": "2026-11-06T15:30:00Z",
                        "pid": "010C",
                        "value": 850,
                        "unit": "rpm",
                        "duplicate": True,
                    }
                }
            },
        },
        401: {"model": ErrorResponse, "description": "Token ausente ou inválido."},
        403: {"model": ErrorResponse, "description": "O token não está autorizado para o veículo informado."},
        409: {"model": ErrorResponse, "description": "O event_id já foi usado com conteúdo diferente."},
        422: {"model": HTTPValidationError, "description": "Solicitação inválida ou fora dos limites documentados."},
        503: {"model": ErrorResponse, "description": "A autenticação do dispositivo não está configurada."},
    },
)
def ingest_telemetry(
    payload: Annotated[
        TelemetryCreate,
        Body(
            openapi_examples={
                "engine-rpm-reading": {
                    "summary": "Leitura sintética de rotação do motor",
                    "value": {
                        "event_id": "8d1c1e4a-6f7a-4d1b-9c2e-5a6b7c8d9e01",
                        "vehicle_id": "classic-demo",
                        "recorded_at": "2026-11-06T12:30:00-03:00",
                        "pid": "010C",
                        "value": 850,
                        "unit": "rpm",
                    },
                },
            }
        ),
    ],
    response: Response,
    session: Session = Depends(get_session),
    x_device_token: str | None = Depends(device_token_header),
) -> TelemetryRead:
    _authorize_vehicle(payload.vehicle_id, x_device_token)

    existing = session.exec(
        select(TelemetryRecord).where(
            TelemetryRecord.vehicle_id == payload.vehicle_id,
            TelemetryRecord.event_id == str(payload.event_id),
        )
    ).first()
    if existing:
        if not _same_event(existing, payload):
            raise HTTPException(status_code=409, detail="event_id já usado com outro conteúdo")
        response.status_code = status.HTTP_200_OK
        return TelemetryRead.model_validate(existing, from_attributes=True).model_copy(update={"duplicate": True})

    record = TelemetryRecord(
        event_id=str(payload.event_id),
        vehicle_id=payload.vehicle_id,
        recorded_at=payload.recorded_at.astimezone(UTC),
        pid=payload.pid,
        value=payload.value,
        unit=payload.unit,
    )
    session.add(record)
    try:
        session.commit()
    except IntegrityError:
        session.rollback()
        duplicate = session.exec(
            select(TelemetryRecord).where(
                TelemetryRecord.vehicle_id == payload.vehicle_id,
                TelemetryRecord.event_id == str(payload.event_id),
            )
        ).first()
        if duplicate and _same_event(duplicate, payload):
            response.status_code = status.HTTP_200_OK
            return TelemetryRead.model_validate(duplicate, from_attributes=True).model_copy(
                update={"duplicate": True}
            )
        raise HTTPException(status_code=409, detail="Conflito ao persistir event_id") from None

    session.refresh(record)
    return TelemetryRead.model_validate(record, from_attributes=True)


@app.get(
    "/v1/veiculos/{vehicle_id}/telemetria",
    response_model=list[TelemetryRead],
    tags=["telemetria"],
    summary="Consultar leituras de um veículo",
    description=(
        "Retorna as leituras mais recentes primeiro. O dispositivo só pode consultar o veículo ao qual está vinculado. "
        "Use limit para escolher quantas leituras retornar (1 a 500; padrão 100)."
    ),
    responses={
        401: {"model": ErrorResponse, "description": "Token ausente ou inválido."},
        403: {"model": ErrorResponse, "description": "O token não está autorizado para este veículo."},
        422: {"model": HTTPValidationError, "description": "Solicitação inválida ou fora dos limites documentados."},
        503: {"model": ErrorResponse, "description": "A autenticação do dispositivo não está configurada."},
    },
)
def list_telemetry(
    vehicle_id: str = Path(
        description="Identificador do veículo autorizado para este dispositivo.",
        examples=["classic-demo"],
    ),
    _: None = Depends(require_authorized_vehicle),
    session: Session = Depends(get_session),
    limit: int = Query(
        default=100,
        ge=1,
        le=500,
        description="Número máximo de leituras retornadas (1 a 500).",
        examples=[100],
    ),
) -> list[TelemetryRead]:
    records = session.exec(
        select(TelemetryRecord)
        .where(TelemetryRecord.vehicle_id == vehicle_id)
        .order_by(TelemetryRecord.recorded_at.desc())
        .limit(limit)
    ).all()
    return [TelemetryRead.model_validate(record, from_attributes=True) for record in records]


def _same_event(record: TelemetryRecord, payload: TelemetryCreate) -> bool:
    stored_at = record.recorded_at
    if stored_at.tzinfo is None or stored_at.utcoffset() is None:
        stored_at = stored_at.replace(tzinfo=UTC)
    else:
        stored_at = stored_at.astimezone(UTC)
    return (
        record.pid == payload.pid
        and record.value == payload.value
        and record.unit == payload.unit
        and stored_at == payload.recorded_at.astimezone(UTC)
    )
