import json
import uuid
from datetime import datetime, timezone
from typing import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sse_starlette.sse import EventSourceResponse

from app.core.dependencies import get_current_user
from app.db.models.chat import ChatMessage, ChatSession
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.chat import (
    ChatSessionCreate,
    ChatSessionResponse,
    ChatSessionUpdate,
    MessageCreate,
    MessageResponse,
)
from app.services.ai_gateway import AIGateway
from app.services.files import FileService
from app.services.rag import RAGService
from app.services.search import SearchService

router = APIRouter()


# ── Sessions ──────────────────────────────────────────────────────────────────

@router.get("/sessions", response_model=list[ChatSessionResponse])
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(ChatSession)
        .where(ChatSession.user_id == current_user.id)
        .order_by(ChatSession.updated_at.desc())
    )
    return result.scalars().all()


@router.post("/sessions", response_model=ChatSessionResponse, status_code=status.HTTP_201_CREATED)
async def create_session(
    body: ChatSessionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = ChatSession(user_id=current_user.id, title=body.title)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return session


@router.patch("/sessions/{session_id}", response_model=ChatSessionResponse)
async def rename_session(
    session_id: uuid.UUID,
    body: ChatSessionUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session(session_id, current_user.id, db)
    session.title = body.title
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(session)
    return session


@router.delete("/sessions/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    session = await _get_session(session_id, current_user.id, db)
    await db.delete(session)
    await db.commit()


# ── Messages ──────────────────────────────────────────────────────────────────

@router.get("/sessions/{session_id}/messages", response_model=list[MessageResponse])
async def list_messages(
    session_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _get_session(session_id, current_user.id, db)
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    return result.scalars().all()


@router.post("/sessions/{session_id}/messages/stream")
async def stream_message(
    session_id: uuid.UUID,
    body: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """
    Save the user message, assemble context (RAG + optional web search),
    stream assistant tokens via SSE, then persist the assistant message.

    SSE event types:
      token  — partial content chunk  {"content": "..."}
      done   — stream complete        {"message_id": "uuid"}
      error  — fatal error            {"detail": "..."}
    """
    session = await _get_session(session_id, current_user.id, db)

    # Persist user message
    user_msg = ChatMessage(
        session_id=session_id,
        role="user",
        content=body.content,
        file_keys=body.file_keys,
        created_at=datetime.now(timezone.utc),
    )
    db.add(user_msg)
    session.updated_at = datetime.now(timezone.utc)
    await db.commit()

    # Build LLM message list
    history_result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.session_id == session_id)
        .order_by(ChatMessage.created_at)
    )
    history = history_result.scalars().all()

    system_parts: list[str] = [
        "You are a helpful assistant that analyses data, images, and text notes to answer questions and compose reports."
    ]

    # RAG context
    rag_records = await RAGService.retrieve(body.content, current_user.id, db)
    rag_block = RAGService.format_for_prompt(rag_records)
    if rag_block:
        system_parts.append(rag_block)

    # Web search context
    if body.include_web_search:
        search_results = await SearchService.search(body.content)
        search_block = SearchService.format_for_prompt(search_results)
        if search_block:
            system_parts.append(search_block)

    # Image context: attach presigned URLs for any file keys in recent messages
    image_messages: list[dict] = []
    for msg in history[-10:]:  # look back 10 messages for attached images
        if msg.file_keys:
            content_parts: list[dict] = [{"type": "text", "text": msg.content}]
            for key in msg.file_keys:
                url = await FileService.presigned_url(key)
                content_parts.append({"type": "image_url", "image_url": {"url": url}})
            image_messages.append({"role": msg.role, "content": content_parts})
        else:
            image_messages.append({"role": msg.role, "content": msg.content})

    llm_messages = [{"role": "system", "content": "\n\n".join(system_parts)}] + image_messages

    async def event_generator() -> AsyncIterator[dict]:
        full_content = ""
        try:
            async for token in AIGateway.stream(llm_messages, model=body.model):
                full_content += token
                yield {"event": "token", "data": json.dumps({"content": token})}

            # Persist assistant reply
            assistant_msg = ChatMessage(
                session_id=session_id,
                role="assistant",
                content=full_content,
                file_keys=[],
                created_at=datetime.now(timezone.utc),
            )
            db.add(assistant_msg)
            session.updated_at = datetime.now(timezone.utc)
            await db.commit()
            await db.refresh(assistant_msg)

            yield {"event": "done", "data": json.dumps({"message_id": str(assistant_msg.id)})}
        except Exception as exc:
            yield {"event": "error", "data": json.dumps({"detail": str(exc)})}

    return EventSourceResponse(event_generator())


# ── Helpers ───────────────────────────────────────────────────────────────────

async def _get_session(
    session_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> ChatSession:
    result = await db.execute(
        select(ChatSession).where(
            ChatSession.id == session_id, ChatSession.user_id == user_id
        )
    )
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return session
