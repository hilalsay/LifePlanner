"""add book cover_url and review

Revision ID: a1b2c3d4e5f6
Revises: f7ef2c6c0df2
Create Date: 2026-06-22 20:00:00.000000
"""
from alembic import op
import sqlalchemy as sa

revision = 'a1b2c3d4e5f6'
down_revision = 'f7ef2c6c0df2'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('book_entries', sa.Column('cover_url', sa.String(500), nullable=True))
    op.add_column('book_entries', sa.Column('review', sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column('book_entries', 'review')
    op.drop_column('book_entries', 'cover_url')
