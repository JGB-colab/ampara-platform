"""Create telemetry table.

Revision ID: 0001_create_telemetry
Revises:
"""
from alembic import op
import sqlalchemy as sa

revision = "0001_create_telemetry"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "telemetryrecord",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("event_id", sa.String(length=36), nullable=False),
        sa.Column("vehicle_id", sa.String(length=80), nullable=False),
        sa.Column("recorded_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("pid", sa.String(length=4), nullable=False),
        sa.Column("value", sa.Float(), nullable=False),
        sa.Column("unit", sa.String(length=16), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("vehicle_id", "event_id", name="uq_telemetry_vehicle_event"),
    )
    op.create_index(op.f("ix_telemetryrecord_event_id"), "telemetryrecord", ["event_id"], unique=False)
    op.create_index(op.f("ix_telemetryrecord_vehicle_id"), "telemetryrecord", ["vehicle_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_telemetryrecord_vehicle_id"), table_name="telemetryrecord")
    op.drop_index(op.f("ix_telemetryrecord_event_id"), table_name="telemetryrecord")
    op.drop_table("telemetryrecord")
