"""add user_activity table and users.last_seen_at

Revision ID: b7e2c9a4d1f8
Revises: a9c1d4e7b3f2
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "b7e2c9a4d1f8"
down_revision: Union[str, None] = "a9c1d4e7b3f2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("last_seen_at", sa.DateTime(timezone=True), nullable=True))
    op.create_table(
        "user_activity",
        sa.Column("user_id", sa.Uuid(), nullable=False),
        sa.Column("day", sa.Date(), nullable=False),
        sa.Column("feature", sa.String(64), nullable=False),
        sa.Column("views", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("actions", sa.Integer(), nullable=False, server_default="0"),
        sa.PrimaryKeyConstraint("user_id", "day", "feature"),
    )
    op.create_index("ix_user_activity_day", "user_activity", ["day"])


def downgrade() -> None:
    op.drop_index("ix_user_activity_day", table_name="user_activity")
    op.drop_table("user_activity")
    op.drop_column("users", "last_seen_at")
