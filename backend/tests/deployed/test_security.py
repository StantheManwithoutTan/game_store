"""Pruebas de seguridad del ambiente desplegado.

No reemplazan al análisis estático ni a ZAP: validan la configuración real de
Caddy/TLS, las cabeceras HTTP, CORS, el manejo de JWT y la postura de
``ENABLE_TEST_TOOLS`` en cada ambiente.
"""

from __future__ import annotations

import re
import time
from urllib.parse import urljoin, urlparse

import jwt
import pytest
import requests

pytestmark = [pytest.mark.deployed, pytest.mark.security]


def _token(settings, roles: list[str], exp_offset: int = 300) -> str:
    """Firma un token con el secreto real del ambiente."""

    assert settings.secret_key
    now = int(time.time())
    return jwt.encode(
        {
            "sub": "security-test",
            "email": "security@game-store.local",
            "roles": roles,
            "iat": now,
            "exp": now + exp_offset,
        },
        settings.secret_key,
        algorithm="HS256",
    )


# Qué prueba: que Caddy redirija el tráfico HTTP hacia HTTPS.
# Resultado esperado: 301/302/307/308 con ``Location`` en https.
def test_http_redirects_to_https(
    http: requests.Session,
    settings,
) -> None:
    parsed = urlparse(settings.base_url)
    http_url = f"http://{parsed.netloc}/health"

    response = http.get(http_url, allow_redirects=False, timeout=15)

    assert response.status_code in {301, 302, 307, 308}
    assert response.headers.get("Location", "").startswith("https://")


# Qué prueba: que el certificado TLS sea confiable para un cliente estándar
# (no se acepta un certificado autofirmado en staging/producción).
# Resultado esperado: la petición con verificación TLS estricta responde 200.
def test_tls_certificate_is_trusted(settings) -> None:
    if not settings.verify_tls:
        pytest.skip("VERIFY_TLS=false: el ambiente usa un certificado no confiable.")

    response = requests.get(
        f"{settings.base_url}/health",
        timeout=20,
        verify=True,
    )

    assert response.status_code == 200


# Qué prueba: que las respuestas del backend incluyan HSTS y protecciones de
# contenido, incluso en errores 401.
# Resultado esperado: cabeceras de seguridad presentes en ``/api/products/``.
def test_api_error_response_keeps_security_headers(
    http: requests.Session,
    settings,
) -> None:
    response = http.get(f"{settings.base_url}/api/products/", timeout=15)

    assert response.status_code == 401
    assert "max-age=31536000" in response.headers.get(
        "Strict-Transport-Security", ""
    )
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") in {"DENY", "SAMEORIGIN"}


# Qué prueba: que Caddy aplique una CSP y cabeceras defensivas al frontend.
# Resultado esperado: CSP, ``X-Frame-Options``, ``Referrer-Policy`` y
# ``Permissions-Policy`` presentes en la raíz.
def test_frontend_includes_csp_and_browser_protections(
    http: requests.Session,
    settings,
) -> None:
    response = http.get(f"{settings.base_url}/", timeout=15)

    assert response.status_code == 200
    csp = response.headers.get("Content-Security-Policy", "")
    assert "default-src 'self'" in csp
    assert "frame-ancestors 'none'" in csp
    assert response.headers.get("X-Frame-Options") == "DENY"
    assert response.headers.get("Referrer-Policy")
    assert response.headers.get("Permissions-Policy")


# Qué prueba: que CORS permita exactamente el origen del frontend, con
# credenciales, y no un comodín.
# Resultado esperado: ``Access-Control-Allow-Origin`` igual a ``BASE_URL``.
def test_cors_allows_only_the_frontend_origin(
    http: requests.Session,
    settings,
) -> None:
    response = http.options(
        f"{settings.base_url}/api/products/",
        headers={
            "Origin": settings.base_url,
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
        timeout=20,
    )

    assert response.status_code in {200, 204}
    assert response.headers.get("Access-Control-Allow-Origin") == settings.base_url
    assert response.headers.get("Access-Control-Allow-Credentials") == "true"


# Qué prueba: que un origen ajeno no reciba permiso CORS.
# Resultado esperado: no se devuelve ``Access-Control-Allow-Origin`` para
# ``https://evil.example``.
def test_cors_rejects_unknown_origin(
    http: requests.Session,
    settings,
) -> None:
    response = http.options(
        f"{settings.base_url}/api/products/",
        headers={
            "Origin": "https://evil.example",
            "Access-Control-Request-Method": "GET",
        },
        timeout=20,
    )

    allowed = response.headers.get("Access-Control-Allow-Origin")
    assert allowed != "https://evil.example"


# Qué prueba: que la API rechace un JWT expirado aunque esté firmado con el
# secreto correcto.
# Resultado esperado: 401 con ``Token expired``.
def test_expired_token_is_rejected(
    http: requests.Session,
    settings,
) -> None:
    if not settings.secret_key:
        pytest.skip("FLASK_SECRET_KEY no configurado")

    expired = _token(settings, ["product:view"], exp_offset=-60)
    response = http.get(
        f"{settings.base_url}/api/products/",
        headers={"Authorization": f"Bearer {expired}"},
        timeout=20,
    )

    assert response.status_code == 401
    assert response.json().get("error") == "Token expired"


# Qué prueba: que un token válido pero sin el rol requerido reciba 403 y no
# 401 (autenticado, pero sin autorización).
# Resultado esperado: 403 al consultar ``/api/users/`` con solo ``product:view``.
def test_authenticated_user_without_role_gets_403(
    http: requests.Session,
    settings,
    viewer_headers: dict[str, str],
) -> None:
    response = http.get(
        f"{settings.base_url}/api/users/",
        headers=viewer_headers,
        timeout=20,
    )

    assert response.status_code == 403
    assert response.json().get("error") == "Forbidden"


# Qué prueba: que ``ENABLE_TEST_TOOLS`` tenga la postura correcta según el
# ambiente: habilitado en staging (lo necesita el E2E) y deshabilitado en
# producción.
# Resultado esperado: 201 en staging; 404 en producción.
def test_test_tools_environment_posture(
    http: requests.Session,
    settings,
    bootstrap_headers: dict[str, str],
) -> None:
    response = http.post(
        f"{settings.base_url}/api/test-tools/token",
        json={"roles": ["product:view"]},
        headers=bootstrap_headers,
        timeout=20,
    )

    if settings.expected_environment == "production":
        assert response.status_code == 404
    else:
        assert response.status_code == 201


# Qué prueba: que el bundle JavaScript del frontend no contenga secretos del
# backend ni la contraseña del usuario QA.
# Resultado esperado: ninguno de esos valores aparece en los archivos servidos.
def test_frontend_bundle_does_not_expose_secrets(
    http: requests.Session,
    settings,
) -> None:
    index = http.get(f"{settings.base_url}/", timeout=20)
    assert index.status_code == 200

    script_sources = re.findall(
        r'<script[^>]+src=["\']([^"\']+)["\']',
        index.text,
        flags=re.IGNORECASE,
    )
    assert script_sources, "El index del frontend no referencia ningún bundle JS"

    secret_values = [
        value
        for value in (settings.secret_key, settings.qa_password)
        if value and len(value) >= 8
    ]
    secret_names = [
        "FLASK_SECRET_KEY",
        "POSTGRES_PASSWORD",
        "KEYCLOAK_CLIENT_SECRET",
        "KEYCLOAK_ADMIN_PASSWORD",
    ]

    for source in script_sources:
        bundle = http.get(urljoin(f"{settings.base_url}/", source), timeout=30)
        assert bundle.status_code == 200
        body = bundle.text
        for secret in secret_values:
            assert secret not in body, "Un secreto del backend aparece en el bundle"
        for name in secret_names:
            assert name not in body


# Qué prueba: que el contrato OpenAPI no publique nombres de variables
# sensibles.
# Resultado esperado: el JSON no contiene nombres de secretos del despliegue.
def test_openapi_does_not_expose_secret_names(
    http: requests.Session,
    settings,
) -> None:
    response = http.get(f"{settings.base_url}/api/openapi.json", timeout=20)

    assert response.status_code == 200
    body = response.text
    for name in (
        "FLASK_SECRET_KEY",
        "POSTGRES_PASSWORD",
        "KEYCLOAK_CLIENT_SECRET",
        "KEYCLOAK_ADMIN_PASSWORD",
    ):
        assert name not in body


# Qué prueba: que el servidor no anuncie tecnología vulnerable con versión.
# Resultado esperado: ``Server`` no contiene ``werkzeug`` ni ``python``.
def test_server_header_does_not_reveal_python_stack(
    http: requests.Session,
    settings,
) -> None:
    response = http.get(f"{settings.base_url}/health", timeout=15)

    server = response.headers.get("Server", "").lower()
    assert "werkzeug" not in server
    assert "python" not in server
