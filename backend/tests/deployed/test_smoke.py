"""Pruebas de humo contra el sistema desplegado.

Estas pruebas se ejecutan tanto en staging como en producción (modo ``smoke``)
y solo usan endpoints públicos. No necesitan tokens ni credenciales.

Objetivo: confirmar en menos de un minuto que el despliegue está vivo, que
Caddy sirve el frontend, que la API responde y que Keycloak publica su
configuración OIDC.
"""

from __future__ import annotations

import pytest
import requests

pytestmark = [pytest.mark.deployed, pytest.mark.smoke]


# Qué prueba: que ``GET /health`` responda 200 y que la versión coincida con la
# imagen que se acaba de desplegar.
# Resultado esperado: ``status == "ok"`` y ``version == EXPECTED_VERSION``.
# Si no se define EXPECTED_VERSION, solo se valida que exista una versión.
def test_health_returns_ok_and_expected_version(
    http: requests.Session,
    settings,
) -> None:
    response = http.get(f"{settings.base_url}/health", timeout=15)

    assert response.status_code == 200
    payload = response.json()
    assert payload.get("status") == "ok"
    assert payload.get("version"), "El endpoint /health no reporta versión"

    if settings.expected_version:
        assert payload["version"] == settings.expected_version, (
            "La versión desplegada no coincide con la imagen esperada: "
            f"{payload['version']} != {settings.expected_version}"
        )


# Qué prueba: que Caddy sirva la SPA del frontend en la raíz.
# Resultado esperado: 200, HTML y el contenedor ``#app`` que monta Vue.
def test_frontend_serves_spa(http: requests.Session, settings) -> None:
    response = http.get(f"{settings.base_url}/", timeout=15)

    assert response.status_code == 200
    assert "text/html" in response.headers.get("Content-Type", "")
    assert '<div id="app"></div>' in response.text


# Qué prueba: que el backend esté detrás de Caddy y que la API exija
# autenticación incluso para listar productos.
# Resultado esperado: 401 con un mensaje JSON, nunca una lista de productos.
def test_api_requires_authentication(http: requests.Session, settings) -> None:
    response = http.get(f"{settings.base_url}/api/products/", timeout=15)

    assert response.status_code == 401
    assert response.headers.get("Content-Type", "").startswith("application/json")
    assert "error" in response.json()


# Qué prueba: que Keycloak esté disponible y publique la metadata OIDC del
# realm que usa la aplicación.
# Resultado esperado: 200, issuer del realm y endpoints de autorización/token.
def test_keycloak_discovery_is_available(
    http: requests.Session,
    settings,
) -> None:
    url = (
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
        "/.well-known/openid-configuration"
    )
    response = http.get(url, timeout=20)

    assert response.status_code == 200
    metadata = response.json()
    assert metadata.get("issuer") == (
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
    )
    assert metadata.get("authorization_endpoint")
    assert metadata.get("token_endpoint")
    assert metadata.get("jwks_uri")
    assert "code" in metadata.get("response_types_supported", [])


# Qué prueba: que las respuestas públicas incluyan las cabeceras de seguridad
# que configuran Flask y Caddy.
# Resultado esperado: HSTS, ``X-Content-Type-Options`` y ``X-Frame-Options``.
def test_public_response_includes_security_headers(
    http: requests.Session,
    settings,
) -> None:
    response = http.get(f"{settings.base_url}/health", timeout=15)

    assert response.status_code == 200
    assert "max-age=31536000" in response.headers.get(
        "Strict-Transport-Security", ""
    )
    assert response.headers.get("X-Content-Type-Options") == "nosniff"
    assert response.headers.get("X-Frame-Options") in {"DENY", "SAMEORIGIN"}


# Qué prueba: que el frontend no exponga trazas de Python ni páginas de error
# internas al pedir una ruta inexistente.
# Resultado esperado: la SPA responde sin ``Traceback`` ni ``werkzeug``.
def test_unknown_frontend_route_does_not_leak_stack_traces(
    http: requests.Session,
    settings,
) -> None:
    response = http.get(
        f"{settings.base_url}/ruta-que-no-existe-para-smoke",
        timeout=15,
    )

    body = response.text.lower()
    assert "traceback (most recent call last)" not in body
    assert "werkzeug" not in body
    assert "debugger" not in body
