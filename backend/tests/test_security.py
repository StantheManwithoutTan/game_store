import os
os.environ.setdefault("SECRET_KEY", "test-secret")

import pytest
import jwt
import time

from app import create_app
from config import Config


TEST_SECRET = "test-secret"


def make_token(*scopes):
    payload = {
        "roles": list(scopes),
        "email": "admin@test.com",
        "sub": "test-sub",
        "exp": int(time.time()) + 3600,
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


@pytest.fixture()
def headers():
    token = make_token("product:view")
    return {"Authorization": f"Bearer {token}"}


# ── HTTP Security Headers ──────────────────────────────────────

def test_hsts_header(client, headers):
    response = client.get("/api/products/", headers=headers)
    assert response.headers.get("Strict-Transport-Security") == "max-age=31536000; includeSubDomains"


def test_x_frame_options_header(client, headers):
    response = client.get("/api/products/", headers=headers)
    assert response.headers.get("X-Frame-Options") == "DENY"


def test_x_content_type_options_header(client, headers):
    response = client.get("/api/products/", headers=headers)
    assert response.headers.get("X-Content-Type-Options") == "nosniff"


# ── CORS ───────────────────────────────────────────────────────

def test_cors_rejects_wrong_origin(client, headers):
    response = client.get("/api/products/", headers={
        **headers,
        "Origin": "https://evil.com",
    })
    allow_origin = response.headers.get("Access-Control-Allow-Origin")
    assert allow_origin != "https://evil.com"


def test_cors_allows_frontend_origin(client, headers):
    response = client.get("/api/products/", headers={
        **headers,
        "Origin": "http://localhost:5173",
    })
    allow_origin = response.headers.get("Access-Control-Allow-Origin")
    assert allow_origin == "http://localhost:5173"
