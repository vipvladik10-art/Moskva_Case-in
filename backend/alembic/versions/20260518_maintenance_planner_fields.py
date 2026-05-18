"""maintenance planner fields

Revision ID: 20260518_maint
Revises:
Create Date: 2026-05-18
"""

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "20260518_maint"
down_revision: str | None = None
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("maintenance_tasks", sa.Column("reason_code", sa.String(64), server_default=""))
    op.add_column("maintenance_tasks", sa.Column("trigger_source", sa.String(32), server_default=""))
    op.add_column("maintenance_tasks", sa.Column("dedup_key", sa.String(128), server_default=""))
    op.add_column(
        "maintenance_tasks",
        sa.Column("decision_ids", postgresql.JSONB(astext_type=sa.Text()), nullable=True),
    )
    op.add_column("maintenance_tasks", sa.Column("rule_id", sa.String(64), nullable=True))
    op.add_column("maintenance_tasks", sa.Column("created_by", sa.String(32), server_default="system"))
    op.add_column(
        "maintenance_tasks",
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.alter_column("maintenance_tasks", "reason", type_=sa.String(256))
    op.create_index("ix_maintenance_tasks_dedup_key", "maintenance_tasks", ["dedup_key"])
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_maintenance_tasks_dedup_active
        ON maintenance_tasks (dedup_key)
        WHERE status IN ('open', 'in_progress') AND dedup_key <> ''
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_maintenance_tasks_dedup_active")
    op.drop_index("ix_maintenance_tasks_dedup_key", table_name="maintenance_tasks")
    op.drop_column("maintenance_tasks", "updated_at")
    op.drop_column("maintenance_tasks", "created_by")
    op.drop_column("maintenance_tasks", "rule_id")
    op.drop_column("maintenance_tasks", "decision_ids")
    op.drop_column("maintenance_tasks", "dedup_key")
    op.drop_column("maintenance_tasks", "trigger_source")
    op.drop_column("maintenance_tasks", "reason_code")
