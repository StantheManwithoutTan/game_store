import os
import time

import jwt
import pytest

os.environ.setdefault("SECRET_KEY", "test-secret")

from app import create_app
from config import Config
from extensions import db


TEST_SECRET = "test-secret"


def make_token(*roles):
    return jwt.encode(
        {
            "sub": "test-admin",
            "email": "admin@test.com",
            "roles": list(roles),
            "exp": int(time.time()) + 3600,
        },
        TEST_SECRET,
        algorithm="HS256",
    )


class TestConfig(Config):
    TESTING = True
    TEST_AUTH = True
    ENABLE_TEST_TOOLS = True
    SECRET_KEY = TEST_SECRET
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False


@pytest.fixture()
def client():
    app = create_app(TestConfig)

    with app.app_context():
        db.create_all()
        yield app.test_client()
        db.session.remove()
        db.drop_all()


def authorization(*roles):
    token = make_token(*roles)
    return {"Authorization": f"Bearer {token}"}


def test_requires_authentication(client):
    response = client.post(
        "/api/test-tools/token",
        json={"roles": ["product:view"]},
    )

    assert response.status_code == 401


def test_requires_user_manage_permission(client):
    response = client.post(
        "/api/test-tools/token",
        json={"roles": ["product:view"]},
        headers=authorization("product:view"),
    )

    assert response.status_code == 403


def test_returns_404_when_disabled(client):
    client.application.config["ENABLE_TEST_TOOLS"] = False

    response = client.post(
        "/api/test-tools/token",
        json={"roles": ["product:view"]},
        headers=authorization("user:manage"),
    )

    assert response.status_code == 404


def test_rejects_invalid_roles(client):
    response = client.post(
        "/api/test-tools/token",
        json={"roles": ["super-admin"]},
        headers=authorization("user:manage"),
    )

    assert response.status_code == 400


def test_generates_short_lived_token(client):
    response = client.post(
        "/api/test-tools/token",
        json={
            "roles": ["product:view", "stock:view"],
            "expires_minutes": 15,
        },
        headers=authorization("user:manage"),
    )

    assert response.status_code == 201

    body = response.get_json()

    payload = jwt.decode(
        body["token"],
        TEST_SECRET,
        algorithms=["HS256"],
    )

    assert body["token_type"] == "Bearer"
    assert body["expires_in"] == 900
    assert payload["roles"] == ["product:view", "stock:view"]
    assert payload["token_use"] == "testing"
    assert 850 <= payload["exp"] - payload["iat"] <= 900