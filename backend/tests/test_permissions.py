import os
os.environ.setdefault("SECRET_KEY", "test-secret")

import pytest
import jwt
import time

from app import create_app
from config import Config


TEST_SECRET = "test-secret"


def make_token(*scopes, exp_offset=3600):
    payload = {
        "roles": list(scopes),
        "email": "admin@test.com",
        "sub": "test-sub",
        "exp": int(time.time()) + exp_offset,
    }
    return jwt.encode(payload, TEST_SECRET, algorithm="HS256")


class TestConfig(Config):
    TESTING = True
    TEST_AUTH = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False


@pytest.fixture()
def client():
    app = create_app(TestConfig)
    with app.app_context():
        from extensions import db
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


# Pruebas sin autenticación, debe dar error 401 (Unauthorized)

def test_sin_token_retorna_401(client):
    response = client.get("/api/products/")
    assert response.status_code == 401


def test_token_expirado_retorna_401(client):
    token = make_token("product:view", exp_offset=-10)
    response = client.get("/api/products/", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 401


# Rol incorrecto, debe dar error 403 (forbidden)

def test_rol_incorrecto_retorna_403(client):
    token = make_token("stock:view")
    response = client.post("/api/products/", json={
        "name": "X", 
        "sku": "X-001", 
        "price": "10"
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


def test_empleado_en_ruta_admin_retorna_403(client):
    token = make_token("empleado")
    response = client.post("/api/stocks/entrada", json={
        "product_id": 1, 
        "amount": 5
    }, headers={"Authorization": f"Bearer {token}"})
    assert response.status_code == 403


# Token válido, debe mostrar 200 (OK)

def test_token_valido_accede_productos(client):
    token = make_token("product:view")
    response = client.get("/api/products/", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200


def test_token_valido_accede_stock(client):
    token = make_token("stock:view")
    response = client.get("/api/stocks/historial", headers={
        "Authorization": f"Bearer {token}"
    })
    assert response.status_code == 200
