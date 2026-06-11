from datetime import datetime, date
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy import String, Integer, Numeric, Boolean, Date, ForeignKey, Text
from extensions import db

class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        default=datetime.utcnow, onupdate=datetime.utcnow
    )

class User(db.Model, TimestampMixin):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    keycloak_sub: Mapped[str] = mapped_column(String(36), unique=True, index=True)
    email: Mapped[str] = mapped_column(String(255), unique=True)
    name: Mapped[str | None] = mapped_column(String(255))

class Console(db.Model, TimestampMixin):
    __tablename__ = "consoles"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120), unique=True)
    manufacturer: Mapped[str] = mapped_column(String(120))
    release_year: Mapped[int | None] = mapped_column(Integer)
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    stock: Mapped[int] = mapped_column(Integer, default=0)

    games: Mapped[list["Game"]] = relationship(back_populates="console")
    controllers: Mapped[list["Controller"]] = relationship(back_populates="console")

class Game(db.Model, TimestampMixin):
    __tablename__ = "games"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str] = mapped_column(String(200))
    genre: Mapped[str | None] = mapped_column(String(80))
    release_date: Mapped[date | None] = mapped_column(Date)
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    console_id: Mapped[int] = mapped_column(ForeignKey("consoles.id"), index=True)

    console: Mapped["Console"] = relationship(back_populates="games")

class Controller(db.Model, TimestampMixin):
    __tablename__ = "controllers"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str] = mapped_column(String(120))
    wireless: Mapped[bool] = mapped_column(Boolean, default=True)
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    stock: Mapped[int] = mapped_column(Integer, default=0)
    console_id: Mapped[int] = mapped_column(ForeignKey("consoles.id"), index=True)

    console: Mapped["Console"] = relationship(back_populates="controllers")