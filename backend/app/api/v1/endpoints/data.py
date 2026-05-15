import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.models.data import DataRecord
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.data import DataRecordCreate, DataRecordResponse, DataRecordUpdate
from app.services.rag import RAGService

router = APIRouter()


@router.get("/records", response_model=list[DataRecordResponse])
async def list_records(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(DataRecord)
        .where(DataRecord.user_id == current_user.id)
        .order_by(DataRecord.created_at.desc())
    )
    return result.scalars().all()


@router.post("/records", response_model=DataRecordResponse, status_code=status.HTTP_201_CREATED)
async def create_record(
    body: DataRecordCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = DataRecord(
        user_id=current_user.id,
        name=body.name,
        data_type=body.data_type,
        content=body.content,
        meta=body.meta,
    )
    db.add(record)
    await db.flush()

    # Generate embedding asynchronously (best-effort — no error on failure)
    try:
        await RAGService.upsert_embedding(record, db)
    except Exception:
        await db.commit()

    await db.refresh(record)
    return record


@router.get("/records/{record_id}", response_model=DataRecordResponse)
async def get_record(
    record_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_record(record_id, current_user.id, db)


@router.put("/records/{record_id}", response_model=DataRecordResponse)
async def update_record(
    record_id: uuid.UUID,
    body: DataRecordUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await _get_record(record_id, current_user.id, db)
    if body.name is not None:
        record.name = body.name
    if body.content is not None:
        record.content = body.content
        # Re-embed on content change
        try:
            await RAGService.upsert_embedding(record, db)
        except Exception:
            pass
    if body.meta is not None:
        record.meta = body.meta
    await db.commit()
    await db.refresh(record)
    return record


@router.delete("/records/{record_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_record(
    record_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    record = await _get_record(record_id, current_user.id, db)
    await db.delete(record)
    await db.commit()


async def _get_record(
    record_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession
) -> DataRecord:
    result = await db.execute(
        select(DataRecord).where(DataRecord.id == record_id, DataRecord.user_id == user_id)
    )
    record = result.scalar_one_or_none()
    if not record:
        raise HTTPException(status_code=404, detail="Record not found")
    return record
