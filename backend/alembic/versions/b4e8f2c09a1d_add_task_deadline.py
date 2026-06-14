"""add task deadline

Revision ID: b4e8f2c09a1d
Revises: 7af20d172999
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b4e8f2c09a1d"
down_revision: Union[str, None] = "7af20d172999"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("daily_tasks", sa.Column("deadline", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("daily_tasks", "deadline")
