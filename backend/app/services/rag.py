"""RAG: embed DataRecords and retrieve relevant context via pgvector."""

from __future__ import annotations

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models.data import DataRecord
from app.services.ai_gateway import AIGateway

if TYPE_CHECKING:
    pass


class RAGService:
    TOP_K = 5

    @staticmethod
    async def upsert_embedding(record: DataRecord, db: AsyncSession) -> None:
        """Compute and store an embedding for a DataRecord."""
        content_str = str(record.content)
        embedding = await AIGateway.embed(content_str)
        record.embedding = embedding
        await db.commit()

    @staticmethod
    async def retrieve(
        query: str,
        user_id: uuid.UUID,
        db: AsyncSession,
        top_k: int = TOP_K,
    ) -> list[DataRecord]:
        """Return the most semantically similar DataRecords for a user query."""
        query_embedding = await AIGateway.embed(query)
        # Serialize to Postgres vector literal
        vec_literal = "[" + ",".join(str(x) for x in query_embedding) + "]"

        result = await db.execute(
            text(
                """
                SELECT id FROM data_records
                WHERE user_id = :user_id
                  AND embedding IS NOT NULL
                ORDER BY embedding <=> CAST(:embedding AS vector)
                LIMIT :top_k
                """
            ),
            {"user_id": str(user_id), "embedding": vec_literal, "top_k": top_k},
        )
        ids = [row[0] for row in result.fetchall()]

        records: list[DataRecord] = []
        for rid in ids:
            row = await db.execute(select(DataRecord).where(DataRecord.id == rid))
            rec = row.scalar_one_or_none()
            if rec:
                records.append(rec)
        return records

    @staticmethod
    def format_for_prompt(records: list[DataRecord]) -> str:
        """Format retrieved records as a Markdown block for LLM context."""
        if not records:
            return ""
        lines = ["### Relevant Data from Your Database\n"]
        for r in records:
            lines.append(f"**{r.name}** (type: {r.data_type})\n```json\n{r.content}\n```\n")
        return "\n".join(lines)
