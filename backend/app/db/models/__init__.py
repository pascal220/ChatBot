# Import all models here so Alembic's autogenerate can discover them.
from app.db.models.chat import ChatMessage, ChatSession  # noqa: F401
from app.db.models.data import DataRecord, Report  # noqa: F401
from app.db.models.user import User  # noqa: F401
