"""Pruebas del Keycloak real del ambiente.

Se valida la metadata OIDC, la configuración del cliente, los roles del realm,
el usuario QA sembrado y el flujo completo de login por authorization-code.
El objetivo es detectar diferencias entre el realm de prueba y el desplegado.
"""

from __future__ import annotations

import os

import pytest
import requests

pytestmark = [pytest.mark.deployed, pytest.mark.keycloak]


def _admin_token(settings) -> str:
    """Obtiene un token del realm ``master`` para consultar la Admin REST API."""

    password = os.getenv("KEYCLOAK_ADMIN_PASSWORD")
    if not password:
        pytest.skip(
            "KEYCLOAK_ADMIN_PASSWORD no configurado: se omiten las consultas "
            "a la Admin REST API."
        )

    response = requests.post(
        f"{settings.keycloak_url}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": os.getenv("KEYCLOAK_ADMIN_USER", "kcadmin"),
            "password": password,
        },
        timeout=30,
        verify=settings.verify_tls,
    )
    assert response.status_code == 200, (
        "No se pudo autenticar contra el realm master de Keycloak: "
        f"{response.status_code} {response.text[:500]}"
    )
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def admin_api(settings) -> tuple[str, dict[str, str]]:
    """Devuelve la URL base de administración y las cabeceras autenticadas."""

    token = _admin_token(settings)
    return (
        f"{settings.keycloak_url}/admin/realms/{settings.keycloak_realm}",
        {"Authorization": f"Bearer {token}", "Accept": "application/json"},
    )


# Qué prueba: que la metadata OIDC pública corresponda al realm y a la URL
# externa configurada.
# Resultado esperado: issuer exacto y endpoints de autorización, token y JWKS.
def test_discovery_document_matches_public_realm(
    http: requests.Session,
    settings,
) -> None:
    response = http.get(
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
        "/.well-known/openid-configuration",
        timeout=20,
    )

    assert response.status_code == 200
    metadata = response.json()
    assert metadata["issuer"] == (
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
    )
    assert metadata["authorization_endpoint"].endswith("/protocol/openid-connect/auth")
    assert metadata["token_endpoint"].endswith("/protocol/openid-connect/token")
    assert metadata["jwks_uri"].endswith("/protocol/openid-connect/certs")
    assert "authorization_code" in metadata.get("grant_types_supported", [])


# Qué prueba: que el cliente de la SPA siga siendo confidencial y use el flujo
# de authorization-code, no password grant.
# Resultado esperado: ``publicClient=false``, ``standardFlowEnabled=true`` y
# ``directAccessGrantsEnabled=false``; el redirect del frontend está permitido.
def test_client_uses_confidential_authorization_code_flow(
    settings,
    admin_api: tuple[str, dict[str, str]],
) -> None:
    base, headers = admin_api
    response = requests.get(
        f"{base}/clients",
        params={"clientId": settings.keycloak_client_id},
        headers=headers,
        timeout=20,
        verify=settings.verify_tls,
    )

    assert response.status_code == 200
    clients = response.json()
    assert len(clients) == 1, "El cliente OIDC no existe en el realm"
    client = clients[0]
    assert client["publicClient"] is False
    assert client["standardFlowEnabled"] is True
    assert client["directAccessGrantsEnabled"] is False
    assert any(
        uri.startswith(f"{settings.base_url}/login/callback")
        for uri in client.get("redirectUris", [])
    )


# Qué prueba: que los roles que exige el backend existan en el realm.
# Resultado esperado: roles de producto, stock, reportes, auditoría y usuarios.
def test_realm_contains_backend_roles(
    settings,
    admin_api: tuple[str, dict[str, str]],
) -> None:
    base, headers = admin_api
    response = requests.get(
        f"{base}/roles",
        headers=headers,
        timeout=20,
        verify=settings.verify_tls,
    )

    assert response.status_code == 200
    role_names = {role["name"] for role in response.json()}
    expected = {
        "store_admin",
        "store_user",
        "store_vendor",
        "product:view",
        "product:manage",
        "stock:view",
        "stock:manage",
        "report:view",
        "audit:view",
        "user:manage",
    }
    assert expected <= role_names


# Qué prueba: que el usuario QA exista, esté habilitado y tenga el rol
# ``store_admin`` que usa el E2E.
# Resultado esperado: usuario encontrado y rol presente en sus mappings.
def test_qa_user_exists_with_store_admin_role(
    settings,
    admin_api: tuple[str, dict[str, str]],
) -> None:
    if not settings.qa_password:
        pytest.skip("QA_PASSWORD no configurado: no se creó el usuario QA.")

    base, headers = admin_api
    users_response = requests.get(
        f"{base}/users",
        params={"username": settings.qa_username, "exact": "true"},
        headers=headers,
        timeout=20,
        verify=settings.verify_tls,
    )

    assert users_response.status_code == 200
    users = users_response.json()
    assert users, f"El usuario QA '{settings.qa_username}' no existe en Keycloak"
    user = users[0]
    assert user["enabled"] is True

    roles_response = requests.get(
        f"{base}/users/{user['id']}/role-mappings/realm",
        headers=headers,
        timeout=20,
        verify=settings.verify_tls,
    )
    assert roles_response.status_code == 200
    role_names = {role["name"] for role in roles_response.json()}
    assert "store_admin" in role_names


# Qué prueba: que el formulario de login de Keycloak se sirva correctamente
# para el cliente y redirect del frontend.
# Resultado esperado: 200 y campos ``username``/``password`` presentes.
def test_login_page_is_served(
    http: requests.Session,
    settings,
) -> None:
    from urllib.parse import urlencode

    query = urlencode(
        {
            "client_id": settings.keycloak_client_id,
            "redirect_uri": f"{settings.base_url}/login/callback",
            "response_type": "code",
            "scope": "openid",
        }
    )
    auth_url = (
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
        f"/protocol/openid-connect/auth?{query}"
    )

    response = http.get(auth_url, timeout=30)

    assert response.status_code == 200
    body = response.text
    assert 'name="username"' in body
    assert 'name="password"' in body


# Qué prueba: que el flujo real de authorization-code funcione de punta a
# punta con el usuario QA.
# Resultado esperado: el backend devuelve ``session_token``, ``access_token``,
# ``id_token`` y los datos del usuario.
def test_real_authorization_code_login_returns_tokens(
    settings,
    keycloak_session,
) -> None:
    assert keycloak_session.session_token
    assert keycloak_session.access_token
    assert keycloak_session.id_token
    assert keycloak_session.user.get("email"), "El id_token no incluyó email"


# Qué prueba: que una contraseña incorrecta no produzca un código de
# autorización.
# Resultado esperado: Keycloak responde con error y ``code`` es ``None``.
def test_invalid_password_is_rejected(
    settings,
    keycloak_login_attempt,
) -> None:
    if not settings.qa_password:
        pytest.skip("QA_PASSWORD no configurado: no hay usuario QA para probar.")

    attempt = keycloak_login_attempt(
        settings.qa_username,
        "contrasena-incorrecta-para-qa",
    )

    assert attempt.code is None
    assert attempt.status_code in {200, 401}


# Qué prueba: que el ``session_token`` emitido por el backend contenga los
# roles expandidos del usuario de Keycloak.
# Resultado esperado: ``/auth/verify`` devuelve ``valid=true`` y los permisos
# administrativos que otorga ``store_admin``.
def test_session_token_contains_keycloak_roles(
    http: requests.Session,
    settings,
    keycloak_session,
) -> None:
    response = http.post(
        f"{settings.base_url}/auth/verify",
        headers={"Authorization": f"Bearer {keycloak_session.session_token}"},
        timeout=20,
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["valid"] is True
    roles = set(payload["user"].get("roles", []))
    assert {"product:view", "product:manage", "stock:manage"} <= roles


# Qué prueba: que el password grant esté deshabilitado en el cliente, tal como
# exige el diseño de seguridad (solo authorization-code desde la SPA).
# Resultado esperado: 400 con ``unauthorized_client``.
def test_password_grant_is_disabled(
    settings,
) -> None:
    client_secret = os.getenv("KEYCLOAK_CLIENT_SECRET")
    if not client_secret:
        pytest.skip(
            "KEYCLOAK_CLIENT_SECRET no configurado: no se puede validar el "
            "password grant del cliente confidencial."
        )
    if not settings.qa_password:
        pytest.skip("QA_PASSWORD no configurado: no hay usuario QA para probar.")

    response = requests.post(
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
        "/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": settings.keycloak_client_id,
            "client_secret": client_secret,
            "username": settings.qa_username,
            "password": settings.qa_password,
        },
        timeout=30,
        verify=settings.verify_tls,
    )

    assert response.status_code == 400
    assert response.json().get("error") == "unauthorized_client"
