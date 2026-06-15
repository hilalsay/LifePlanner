"""add deadline_date to yearly_goals

Revision ID: e2a4f8c1d6b3
Revises: c7d3e5f1a8b2
Create Date: 2026-06-16 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "e2a4f8c1d6b3"
down_revision: Union[str, None] = "c7d3e5f1a8b2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("yearly_goals", sa.Column("deadline_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("yearly_goals", "deadline_date")
