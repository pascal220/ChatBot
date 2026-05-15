from fastapi import APIRouter

from app.api.v1.endpoints import auth, chat, data, files, reports

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(chat.router, prefix="/chat", tags=["chat"])
api_router.include_router(files.router, prefix="/files", tags=["files"])
api_router.include_router(data.router, prefix="/data", tags=["data"])
api_router.include_router(reports.router, prefix="/reports", tags=["reports"])
