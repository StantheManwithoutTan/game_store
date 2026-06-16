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
from extensions import db


@pytest.fixture(scope="session")
def postgres_container():
    with PostgresContainer("postgres:15") as postgres:
        yield postgres


@pytest.fixture
def client(postgres_container):

    class TestConfig:
        TESTING = True
        SQLALCHEMY_DATABASE_URI = postgres_container.get_connection_url()
        SQLALCHEMY_TRACK_MODIFICATIONS = False

        API_TITLE = "Test API"
        API_VERSION = "v1"
        OPENAPI_VERSION = "3.0.3"
        OPENAPI_URL_PREFIX = "/api"
        OPENAPI_SWAGGER_UI_PATH = "/docs"
        OPENAPI_SWAGGER_UI_URL = ""

    app = create_app(TestConfig)

    with app.app_context():
        db.create_all()

        yield app.test_client()

        db.session.remove()
        db.drop_all()


def test_create_product(client):

    response = client.post(
        "/api/products/",
        json={
            "name": "PS5",
            "sku": "PS5-001",
            "price": "499.99",
            "quantity": 10,
            "min_stock": 2,
            "status": "active",
        },
    )

    assert response.status_code == 201


def test_get_products(client):

    response = client.get("/api/products/")

    assert response.status_code == 200


def test_get_product_not_found(client):

    response = client.get("/api/products/999")

    assert response.status_code == 404


def test_update_product_not_found(client):

    response = client.put(
        "/api/products/999",
        json={"name": "Nuevo"},
    )

    assert response.status_code in [400, 404]


def test_delete_product_not_found(client):

    response = client.delete("/api/products/999")

    assert response.status_code in [204, 404]