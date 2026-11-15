"""add is_admin to users

Revision ID: a9c1d4e7b3f2
Revises: f7ef2c6c0df2
"""
from typing import Sequence, Union
import sqlalchemy as sa
from alembic import op

revision: str = "a9c1d4e7b3f2"
down_revision: Union[str, None] = "f7ef2c6c0df2"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("is_admin", sa.Boolean(), nullable=False, server_default="false"))


def downgrade() -> None:
    op.drop_column("users", "is_admin")
