from datetime import datetime
from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column
from app.models import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    kakao_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    supabase_uid: Mapped[str | None] = mapped_column(String, unique=True, nullable=True, index=True)
    nickname: Mapped[str] = mapped_column(String, default="")
    profile_image: Mapped[str] = mapped_column(String, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    last_login: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
