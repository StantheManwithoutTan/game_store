import os

os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("POSTGRES_USER", "postgres")
os.environ.setdefault("POSTGRES_PASSWORD", "postgres")
os.environ.setdefault("POSTGRES_DB", "test_db")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_PORT", "5432")

import pytest
from testcontainers.postgres import PostgresContainer

from app import create_app
from config import Config
from extensions import db
from models import Product, StockMovement
from sqlalchemy import text
from services.product_service import ProductService


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = None  # se asigna en fixture
    SQLALCHEMY_TRACK_MODIFICATIONS = False


@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:15") as postgres:
        yield postgres


@pytest.fixture
def app(postgres_container):
    TestConfig.SQLALCHEMY_DATABASE_URI = postgres_container.get_connection_url()
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()

# Asegura que flask db upgrade crea las tablas esperadas despues de realizar un upgrade (confirma y actualiza los cambios implementados del usuario a la base de datos)
def test_migrations_apply_on_clean_db(postgres_container):
    """Verifica que flask db upgrade crea todas las tablas."""
    from flask_migrate import upgrade

    TestConfig.SQLALCHEMY_DATABASE_URI = postgres_container.get_connection_url()
    app = create_app(TestConfig)
    with app.app_context():
        upgrade(directory="migrations")
        tables = db.session.execute(
            text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'")
        ).fetchall()
        table_names = [t[0] for t in tables]
        assert "products" in table_names
        assert "movimientos_stock" in table_names
        assert "audit_log" in table_names


# Asegura que cada producto tiene un SKU unico en la base de atosy tira un error si hay duplicados 
def test_sku_unique_at_db_level(app):
    from sqlalchemy.exc import IntegrityError

    product_a = Product(
        name="A", sku="UNIQUE-TEST", price=10,
        quantity=1, min_stock=0, status="active",
    )
    db.session.add(product_a)
    db.session.commit()

    product_b = Product(
        name="B", sku="UNIQUE-TEST", price=20,
        quantity=1, min_stock=0, status="active",
    )
    db.session.add(product_b)
    with pytest.raises(IntegrityError):
        db.session.commit()

# No permite movimientos de stock sin producto
def test_stock_movement_without_product_fails_fk(app):
    from sqlalchemy.exc import IntegrityError

    product = Product(
        name="Test", sku="TST-001", price=10,
        quantity=5, min_stock=1, status="active",
    )
    db.session.add(product)
    db.session.commit()
    product_id = product.id
    db.session.delete(product)
    db.session.commit()

    mov = StockMovement(
        product_id=product_id, type_movement="entrada",
        amount=1, stock_before=0, stock_after=1,
    )
    db.session.add(mov)
    with pytest.raises(IntegrityError):
        db.session.commit()