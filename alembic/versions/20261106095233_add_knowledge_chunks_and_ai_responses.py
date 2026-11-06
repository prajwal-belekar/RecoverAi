"""add knowledge_chunks and ai_responses tables

Revision ID: 20261106095233
Revises: 9526a7bb6887
Create Date: 2026-11-06 09:52:33.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '20261106095233'
down_revision: Union[str, Sequence[str], None] = '9526a7bb6887'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('knowledge_chunks',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('knowledge_base_id', sa.Integer(), nullable=False),
    sa.Column('chunk_index', sa.Integer(), nullable=False),
    sa.Column('content', sa.Text(), nullable=False),
    sa.Column('embedding', sa.JSON(), nullable=False),
    sa.Column('token_count', sa.Integer(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['knowledge_base_id'], ['knowledge_base.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_knowledge_chunks_id'), 'knowledge_chunks', ['id'], unique=False)
    op.create_index(op.f('ix_knowledge_chunks_knowledge_base_id'), 'knowledge_chunks', ['knowledge_base_id'], unique=False)

    op.create_table('ai_responses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('ticket_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('generated_response', sa.Text(), nullable=False),
    sa.Column('edited_response', sa.Text(), nullable=True),
    sa.Column('final_response', sa.Text(), nullable=True),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('citations', sa.JSON(), nullable=True),
    sa.Column('confidence', sa.Float(), nullable=True),
    sa.Column('has_sufficient_context', sa.Boolean(), nullable=True),
    sa.Column('created_at', sa.DateTime(), nullable=True),
    sa.Column('updated_at', sa.DateTime(), nullable=True),
    sa.Column('approved_at', sa.DateTime(), nullable=True),
    sa.Column('approved_by', sa.Integer(), nullable=True),
    sa.Column('sent_at', sa.DateTime(), nullable=True),
    sa.ForeignKeyConstraint(['approved_by'], ['users.id'], ),
    sa.ForeignKeyConstraint(['ticket_id'], ['tickets.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_ai_responses_id'), 'ai_responses', ['id'], unique=False)
    op.create_index(op.f('ix_ai_responses_ticket_id'), 'ai_responses', ['ticket_id'], unique=False)
    op.create_index(op.f('ix_ai_responses_user_id'), 'ai_responses', ['user_id'], unique=False)
    op.create_index(op.f('ix_ai_responses_status'), 'ai_responses', ['status'], unique=False)

    # Backfill knowledge_chunks for existing knowledge_base entries
    connection = op.get_bind()
    
    # Check if there are existing knowledge_base entries
    result = connection.execute(sa.text("SELECT id, title, content FROM knowledge_base"))
    kb_entries = result.fetchall()
    
    for kb_id, title, content in kb_entries:
        if content and content.strip():
            # Simple chunking: 500 chars with 50 overlap
            chunk_size = 500
            overlap = 50
            chunks = []
            start = 0
            while start < len(content):
                end = min(start + chunk_size, len(content))
                chunk_text = content[start:end]
                if chunk_text.strip():
                    chunks.append(chunk_text)
                start += chunk_size - overlap
            
            for i, chunk_text in enumerate(chunks):
                # Generate a simple hash-based embedding for backfill
                import hashlib
                import json
                hash_obj = hashlib.sha256(chunk_text.encode('utf-8'))
                embedding = [float(b) / 255.0 for b in hash_obj.digest()]
                # Pad to 1536 dimensions
                while len(embedding) < 1536:
                    embedding.append(0.0)
                embedding = embedding[:1536]
                # Normalize
                norm = sum(x**2 for x in embedding) ** 0.5
                if norm > 0:
                    embedding = [x / norm for x in embedding]
                
                connection.execute(
                    sa.text("""
                        INSERT INTO knowledge_chunks (knowledge_base_id, chunk_index, content, embedding, token_count, created_at)
                        VALUES (:kb_id, :idx, :content, :embedding, :token_count, datetime('now'))
                    """),
                    {
                        "kb_id": kb_id,
                        "idx": i,
                        "content": chunk_text,
                        "embedding": json.dumps(embedding),
                        "token_count": len(chunk_text.split())
                    }
                )
            
            # Update chunk_count
            connection.execute(
                sa.text("UPDATE knowledge_base SET chunk_count = :count WHERE id = :kb_id"),
                {"count": len(chunks), "kb_id": kb_id}
            )


def downgrade() -> None:
    op.drop_index(op.f('ix_ai_responses_status'), table_name='ai_responses')
    op.drop_index(op.f('ix_ai_responses_user_id'), table_name='ai_responses')
    op.drop_index(op.f('ix_ai_responses_ticket_id'), table_name='ai_responses')
    op.drop_index(op.f('ix_ai_responses_id'), table_name='ai_responses')
    op.drop_table('ai_responses')
    op.drop_index(op.f('ix_knowledge_chunks_knowledge_base_id'), table_name='knowledge_chunks')
    op.drop_index(op.f('ix_knowledge_chunks_id'), table_name='knowledge_chunks')
    op.drop_table('knowledge_chunks')