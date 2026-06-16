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


def product_payload(sku="API-001", name="Nintendo Switch"):
    return {
        "name": name,
        "sku": sku,
        "description": "Console product",
        "category": "console",
        "price": "299.99",
        "quantity": 5,
        "min_stock": 1,
        "status": "active",
    }


def test_api_post_valid_product_returns_201(client):
    response = client.post("/api/products/", json=product_payload())
    assert response.status_code == 201


def test_api_post_invalid_product_returns_422(client):
    response = client.post("/api/products/", json={})
    assert response.status_code in [400, 422]


def test_api_post_duplicate_sku_returns_400(client):
    client.post("/api/products/", json=product_payload("DUP-001"))
    response = client.post("/api/products/", json=product_payload("DUP-001"))
    assert response.status_code == 400


def test_api_get_products_returns_200(client):
    response = client.get("/api/products/")
    assert response.status_code == 200
    assert isinstance(response.get_json(), list)


def test_api_get_product_by_id_returns_200(client):
    created = client.post("/api/products/", json=product_payload("GET-001")).get_json()
    response = client.get(f"/api/products/{created['id']}")
    assert response.status_code == 200
    assert response.get_json()["sku"] == "GET-001"


def test_api_put_product_returns_200(client):
    created = client.post("/api/products/", json=product_payload("PUT-001")).get_json()
    response = client.put(
        f"/api/products/{created['id']}",
        json={"name": "Nintendo Switch OLED"},
    )
    assert response.status_code == 200
    assert response.get_json()["name"] == "Nintendo Switch OLED"


def test_api_delete_product_returns_204(client):
    created = client.post("/api/products/", json=product_payload("DEL-001")).get_json()
    response = client.delete(f"/api/products/{created['id']}")
    assert response.status_code == 204


def test_api_search_products_returns_matching_product(client):
    client.post("/api/products/", json=product_payload("SEARCH-001", "PlayStation 5"))
    response = client.get("/api/products/?search=PlayStation")
    assert response.status_code == 200
    assert len(response.get_json()) >= 1


def test_api_filter_by_category_returns_200(client):
    client.post("/api/products/", json=product_payload("CAT-001"))
    response = client.get("/api/products/?category=console")
    assert response.status_code == 200


def test_api_openapi_schema_available(client):
    response = client.get("/api/openapi.json")
    assert response.status_code == 200
    assert "openapi" in response.get_json()