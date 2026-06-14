"""smart deadlines — date+time on tasks, date on priorities and focuses

Revision ID: c7d3e5f1a8b2
Revises: b4e8f2c09a1d
Create Date: 2026-06-13 00:01:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "c7d3e5f1a8b2"
down_revision: Union[str, None] = "b4e8f2c09a1d"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Replace single deadline column with date + time pair on daily tasks
    op.drop_column("daily_tasks", "deadline")
    op.add_column("daily_tasks", sa.Column("deadline_date", sa.Date(), nullable=True))
    op.add_column("daily_tasks", sa.Column("deadline_time", sa.Time(), nullable=True))

    # Add deadline date to weekly priorities and monthly focuses (no time needed)
    op.add_column("weekly_priorities", sa.Column("deadline_date", sa.Date(), nullable=True))
    op.add_column("monthly_focuses", sa.Column("deadline_date", sa.Date(), nullable=True))


def downgrade() -> None:
    op.drop_column("monthly_focuses", "deadline_date")
    op.drop_column("weekly_priorities", "deadline_date")
    op.drop_column("daily_tasks", "deadline_time")
    op.drop_column("daily_tasks", "deadline_date")
    op.add_column("daily_tasks", sa.Column("deadline", sa.Date(), nullable=True))
