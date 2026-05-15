import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import get_current_user
from app.db.models.data import DataRecord, Report
from app.db.models.user import User
from app.db.session import get_db
from app.schemas.reports import ReportGenerateRequest, ReportResponse
from app.services.files import FileService
from app.services.reports import ReportService

router = APIRouter()


@router.post("/generate", response_model=ReportResponse, status_code=201)
async def generate_report(
    body: ReportGenerateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Fetch requested data records (or all records if none specified)
    if body.data_record_ids:
        result = await db.execute(
            select(DataRecord).where(
                DataRecord.id.in_(body.data_record_ids),
                DataRecord.user_id == current_user.id,
            )
        )
    else:
        result = await db.execute(
            select(DataRecord).where(DataRecord.user_id == current_user.id)
        )
    data_records = result.scalars().all()

    report = await ReportService.generate(
        user_id=current_user.id,
        session_id=body.session_id,
        title=body.title,
        data_records=list(data_records),
        db=db,
        model=body.model,
    )
    return report


@router.get("/", response_model=list[ReportResponse])
async def list_reports(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Report)
        .where(Report.user_id == current_user.id)
        .order_by(Report.created_at.desc())
    )
    return result.scalars().all()


@router.get("/{report_id}", response_model=ReportResponse)
async def get_report(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await _get_report(report_id, current_user.id, db)


@router.get("/{report_id}/pdf")
async def download_pdf(
    report_id: uuid.UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    report = await _get_report(report_id, current_user.id, db)
    if not report.pdf_key:
        raise HTTPException(status_code=404, detail="PDF not available for this report")

    pdf_bytes = await FileService.download(report.pdf_key)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="report_{report_id}.pdf"'},
    )


async def _get_report(report_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Report:
    result = await db.execute(
        select(Report).where(Report.id == report_id, Report.user_id == user_id)
    )
    report = result.scalar_one_or_none()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report
