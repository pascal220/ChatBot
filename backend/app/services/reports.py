"""Report generation: Markdown via LLM → PDF via WeasyPrint."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone

import markdown as md
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from weasyprint import HTML

from app.db.models.chat import ChatMessage, ChatSession
from app.db.models.data import DataRecord, Report
from app.services.ai_gateway import AIGateway
from app.services.files import FileService


SYSTEM_PROMPT = """You are an expert analyst. Given a conversation and relevant data,
produce a well-structured Markdown report. Use headings, bullet points, and tables
where appropriate. Be concise, precise, and professional."""


class ReportService:
    @staticmethod
    async def generate(
        user_id: uuid.UUID,
        session_id: uuid.UUID,
        title: str,
        data_records: list[DataRecord],
        db: AsyncSession,
        model: str | None = None,
    ) -> Report:
        """
        Build context from the chat session + data records, call the LLM to
        produce a Markdown report, then persist and return the Report record.
        """
        # Fetch conversation history
        result = await db.execute(
            select(ChatMessage)
            .where(ChatMessage.session_id == session_id)
            .order_by(ChatMessage.created_at)
        )
        messages = result.scalars().all()

        # Build context block
        context_parts: list[str] = []
        if data_records:
            context_parts.append("### Attached Data\n")
            for rec in data_records:
                context_parts.append(f"**{rec.name}** ({rec.data_type}):\n```json\n{rec.content}\n```\n")

        conversation_text = "\n".join(
            f"{m.role.upper()}: {m.content}" for m in messages
        )

        user_prompt = (
            f"# Report Request: {title}\n\n"
            + ("\n".join(context_parts) + "\n\n" if context_parts else "")
            + f"## Conversation\n\n{conversation_text}\n\n"
            "Please generate a comprehensive Markdown report based on the above."
        )

        markdown_content = await AIGateway.complete(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            model=model,
        )

        report = Report(
            user_id=user_id,
            session_id=session_id,
            title=title,
            markdown_content=markdown_content,
            created_at=datetime.now(timezone.utc),
        )
        db.add(report)
        await db.flush()  # get report.id before PDF upload

        # Generate and upload PDF
        pdf_bytes = ReportService._markdown_to_pdf(markdown_content, title)
        pdf_key = await FileService.upload(pdf_bytes, "application/pdf", f"report_{report.id}.pdf")
        report.pdf_key = pdf_key

        await db.commit()
        await db.refresh(report)
        return report

    @staticmethod
    def _markdown_to_pdf(markdown_content: str, title: str) -> bytes:
        html_body = md.markdown(markdown_content, extensions=["tables", "fenced_code"])
        full_html = f"""
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <title>{title}</title>
          <style>
            body {{ font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; line-height: 1.6; }}
            h1, h2, h3 {{ color: #333; }}
            code {{ background: #f4f4f4; padding: 2px 4px; border-radius: 3px; }}
            pre {{ background: #f4f4f4; padding: 12px; border-radius: 4px; overflow-x: auto; }}
            table {{ border-collapse: collapse; width: 100%; }}
            th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
            th {{ background-color: #f2f2f2; }}
          </style>
        </head>
        <body>{html_body}</body>
        </html>
        """
        return HTML(string=full_html).write_pdf()
