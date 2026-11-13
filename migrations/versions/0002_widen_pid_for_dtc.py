"""Ampliar coluna pid para acomodar codigos DTC (5 caracteres).

Revision ID: 0002_widen_pid_for_dtc
Revises: 0001_create_telemetry
"""
from alembic import op
import sqlalchemy as sa

revision = "0002_widen_pid_for_dtc"
down_revision = "0001_create_telemetry"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "telemetryrecord",
        "pid",
        existing_type=sa.String(length=4),
        type_=sa.String(length=5),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "telemetryrecord",
        "pid",
        existing_type=sa.String(length=5),
        type_=sa.String(length=4),
        existing_nullable=False,
    )
