import uuid
from datetime import datetime, timezone
from typing import Optional

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base

# Embedding dimension for text-embedding-3-small
EMBEDDING_DIM = 1536


class DataRecord(Base):
    """Stores user-uploaded structured data: time series, text, numbers, JSON blobs."""

    __tablename__ = "data_records"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    # Discriminator: "timeseries" | "text" | "number" | "json"
    data_type: Mapped[str] = mapped_column(String(50), nullable=False)
    # All content stored as JSONB for flexibility
    content: Mapped[dict] = mapped_column(JSONB, nullable=False)
    # Optional free-form metadata (units, source, tags, etc.)
    meta: Mapped[dict] = mapped_column(JSONB, default=dict)
    # pgvector embedding for semantic search / RAG
    embedding: Mapped[Optional[list]] = mapped_column(Vector(EMBEDDING_DIM), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    user: Mapped["User"] = relationship(back_populates="data_records")  # noqa: F821


class Report(Base):
    """Stores AI-generated reports (Markdown source + optional PDF key)."""

    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    # Optional link to the chat session that produced this report
    session_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        ForeignKey("chat_sessions.id", ondelete="SET NULL"), nullable=True, index=True
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    # Raw Markdown produced by the LLM
    markdown_content: Mapped[str] = mapped_column(Text, nullable=False)
    # MinIO key for the PDF, set after PDF generation
    pdf_key: Mapped[Optional[str]] = mapped_column(String(512), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    user: Mapped["User"] = relationship(back_populates="reports")  # noqa: F821
