import os
os.environ.setdefault("SECRET_KEY", "test-secret")
os.environ.setdefault("POSTGRES_USER", "postgres")
os.environ.setdefault("POSTGRES_PASSWORD", "postgres")
os.environ.setdefault("POSTGRES_DB", "test_db")
os.environ.setdefault("DATABASE_HOST", "localhost")
os.environ.setdefault("DATABASE_PORT", "5432")

import pytest
import jwt
import time
from testcontainers.postgres import PostgresContainer

from app import create_app
from extensions import db


TEST_SECRET = "test-secret"


def make_token(*scopes):
    """Genera un JWT de prueba con los roles especificados."""
    payload = {
        "roles": list(scopes),
        "email": "admin@test.com",
        "sub": "test-sub",
        "exp": int(time.time()) + 3600,
    }
    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")


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


@pytest.fixture
def headers():
    return {"Authorization": f"Bearer {make_token('stock:manage', 'stock:view')}"}


@pytest.fixture
def sample_product(client, headers):
    resp = client.post("/api/products/", json={
        "name": "PS5", "sku": "PS5-001", "price": "499.99",
        "quantity": 10, "min_stock": 2, "status": "active",
    }, headers=headers)
    return resp.get_json()


#pruebas de endpoints
def test_entrada_stock_retorna_201(client, headers, sample_product):
    response = client.post("/api/stocks/entrada", json={
        "product_id": sample_product["id"],
        "amount": 5,
        "motive": "reabastecimiento",
    }, headers=headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data["type_movement"] == "entrada"
    assert data["amount"] == 5
    assert data["stock_before"] == 10
    assert data["stock_after"] == 15

def test_entrada_stock_sin_auth_retorna_401(client, sample_product):
    response = client.post("/api/stocks/entrada", json={
        "product_id": sample_product["id"], "amount": 5,
    })
    assert response.status_code == 401

def test_salida_stock_retorna_201(client, headers, sample_product):
    response = client.post("/api/stocks/salida", json={
        "product_id": sample_product["id"],
        "amount": 3,
    }, headers=headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data["type_movement"] == "salida"
    assert data["stock_after"] == 7

def test_salida_stock_sin_stock_retorna_400(client, headers, sample_product):
    response = client.post("/api/stocks/salida", json={
        "product_id": sample_product["id"], "amount": 999,
    }, headers=headers)
    assert response.status_code == 400
    assert "insuficiente" in response.get_json()["message"]

def test_ajuste_stock_retorna_201(client, headers, sample_product):
    response = client.post("/api/stocks/ajuste", json={
        "product_id": sample_product["id"],
        "stock_after": 20,
        "motive": "inventario",
    }, headers=headers)
    assert response.status_code == 201
    data = response.get_json()
    assert data["type_movement"] == "ajuste"
    assert data["stock_after"] == 20
    assert data["amount"] == 10

def test_ajuste_stock_a_cero_retorna_201(client, headers, sample_product):
    response = client.post("/api/stocks/ajuste", json={
        "product_id": sample_product["id"],
        "stock_after": 0,
    }, headers=headers)
    assert response.status_code == 201
    assert response.get_json()["stock_after"] == 0

def test_get_historial_retorna_200(client, headers, sample_product):
    client.post("/api/stocks/entrada", json={
        "product_id": sample_product["id"], "amount": 5,
    }, headers=headers)
    client.post("/api/stocks/salida", json={
        "product_id": sample_product["id"], "amount": 2,
    }, headers=headers)
    response = client.get("/api/stocks/historial", headers=headers)
    assert response.status_code == 200
    assert len(response.get_json()) == 2

def test_get_criticos_con_stock_bajo(client, headers, sample_product):
    client.post("/api/stocks/ajuste", json={
        "product_id": sample_product["id"], "stock_after": 1,
    }, headers=headers)
    response = client.get("/api/stocks/criticos", headers=headers)
    assert len(response.get_json()) == 1

def test_stock_endpoint_sin_permiso_retorna_403(client, sample_product):
    headers_view = {"Authorization": f"Bearer {make_token('product:view')}"}
    response = client.post("/api/stocks/entrada", json={
        "product_id": sample_product["id"], "amount": 5,
    }, headers=headers_view)
    assert response.status_code == 403