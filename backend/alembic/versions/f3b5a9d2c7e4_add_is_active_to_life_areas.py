"""add is_active to life_areas

Revision ID: f3b5a9d2c7e4
Revises: e2a4f8c1d6b3
Create Date: 2026-06-16 01:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "f3b5a9d2c7e4"
down_revision: Union[str, None] = "e2a4f8c1d6b3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "life_areas",
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
    )


def downgrade() -> None:
    op.drop_column("life_areas", "is_active")
