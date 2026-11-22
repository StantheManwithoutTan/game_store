#!/usr/bin/env python3
"""Crea o actualiza de forma idempotente el usuario QA de Keycloak.

Se ejecuta después del despliegue de staging y antes del E2E. No forma parte
del realm export porque las credenciales no deben quedar versionadas y porque
el realm solo se importa la primera vez que arranca Keycloak.

Variables de entorno
--------------------
``KEYCLOAK_URL``
    URL pública de Keycloak, por ejemplo ``https://host:8443``.
``KEYCLOAK_ADMIN_USER`` / ``KEYCLOAK_ADMIN_PASSWORD``
    Credenciales del administrador bootstrap (realm ``master``).
``KEYCLOAK_REALM``
    Realm de la aplicación. Por defecto ``game-store``.
``QA_USERNAME`` / ``QA_PASSWORD``
    Usuario y contraseña que usará Playwright. Si ``QA_PASSWORD`` está vacío,
    el script termina con éxito y avisa que el E2E se omitirá.
``QA_EMAIL``
    Correo del usuario QA. Por defecto ``<QA_USERNAME>@game-store.local``.
``QA_ROLE``
    Rol de realm que se asigna. Por defecto ``store_admin``.
``VERIFY_TLS``
    ``true`` por defecto.

Ejemplo::

    python backend/tests/deployed/seed_keycloak_qa.py
"""

from __future__ import annotations

import os
import sys
from typing import NoReturn
from urllib.parse import quote

import requests


def _env_bool(name: str, default: bool = True) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _fail(message: str) -> NoReturn:
    print(f"[seed-keycloak] ERROR: {message}", file=sys.stderr)
    raise SystemExit(1)


def _admin_token(session: requests.Session, keycloak_url: str) -> str:
    """Autentica contra ``admin-cli`` en el realm master."""

    admin_user = os.getenv("KEYCLOAK_ADMIN_USER", "kcadmin")
    admin_password = os.getenv("KEYCLOAK_ADMIN_PASSWORD", "")

    if not admin_password:
        _fail("KEYCLOAK_ADMIN_PASSWORD no está configurado")

    response = session.post(
        f"{keycloak_url}/realms/master/protocol/openid-connect/token",
        data={
            "grant_type": "password",
            "client_id": "admin-cli",
            "username": admin_user,
            "password": admin_password,
        },
        timeout=30,
    )
    if response.status_code != 200:
        _fail(
            "No se pudo autenticar en Keycloak como administrador: "
            f"{response.status_code} {response.text[:500]}"
        )
    return response.json()["access_token"]


def _find_user(
    session: requests.Session,
    base_url: str,
    username: str,
) -> dict | None:
    """Busca un usuario por nombre exacto."""

    response = session.get(
        f"{base_url}/users",
        params={"username": username, "exact": "true"},
        timeout=30,
    )
    if response.status_code != 200:
        _fail(
            f"No se pudo consultar el usuario '{username}': "
            f"{response.status_code} {response.text[:500]}"
        )
    users = response.json()
    return users[0] if users else None


def _create_user(
    session: requests.Session,
    base_url: str,
    username: str,
    email: str,
) -> dict:
    """Crea el usuario QA y devuelve su representación."""

    payload = {
        "username": username,
        "email": email,
        "firstName": "QA",
        "lastName": "Staging",
        "enabled": True,
        "emailVerified": True,
        "requiredActions": [],
        "attributes": {"createdBy": ["seed_keycloak_qa.py"]},
    }
    response = session.post(f"{base_url}/users", json=payload, timeout=30)
    if response.status_code not in {201, 204}:
        _fail(
            f"No se pudo crear el usuario '{username}': "
            f"{response.status_code} {response.text[:500]}"
        )

    created = _find_user(session, base_url, username)
    if not created:
        _fail(f"El usuario '{username}' se creó pero no se pudo recuperar")
    return created


def _update_user(
    session: requests.Session,
    base_url: str,
    user: dict,
    email: str,
) -> None:
    """Asegura que el usuario esté habilitado y con el correo esperado."""

    payload = {
        **user,
        "email": email,
        "enabled": True,
        "emailVerified": True,
        "requiredActions": [],
    }
    response = session.put(
        f"{base_url}/users/{user['id']}",
        json=payload,
        timeout=30,
    )
    if response.status_code not in {204, 200}:
        _fail(
            f"No se pudo actualizar el usuario '{user['username']}': "
            f"{response.status_code} {response.text[:500]}"
        )


def _reset_password(
    session: requests.Session,
    base_url: str,
    user_id: str,
    password: str,
) -> None:
    """Asigna una contraseña permanente (no temporal) al usuario."""

    response = session.put(
        f"{base_url}/users/{user_id}/reset-password",
        json={"type": "password", "value": password, "temporary": False},
        timeout=30,
    )
    if response.status_code not in {204, 200}:
        _fail(
            "No se pudo asignar la contraseña al usuario QA: "
            f"{response.status_code} {response.text[:500]}"
        )


def _ensure_role(
    session: requests.Session,
    base_url: str,
    user_id: str,
    role_name: str,
) -> None:
    """Asigna el rol de realm si el usuario todavía no lo tiene."""

    role_response = session.get(
        f"{base_url}/roles/{quote(role_name, safe='')}",
        timeout=30,
    )
    if role_response.status_code != 200:
        _fail(
            f"El rol '{role_name}' no existe en el realm: "
            f"{role_response.status_code} {role_response.text[:500]}"
        )
    role = role_response.json()

    mappings_response = session.get(
        f"{base_url}/users/{user_id}/role-mappings/realm",
        timeout=30,
    )
    if mappings_response.status_code != 200:
        _fail(
            "No se pudieron consultar los roles del usuario QA: "
            f"{mappings_response.status_code} {mappings_response.text[:500]}"
        )
    current_roles = {item["name"] for item in mappings_response.json()}
    if role_name in current_roles:
        print(f"[seed-keycloak] El usuario ya tiene el rol '{role_name}'.")
        return

    assign_response = session.post(
        f"{base_url}/users/{user_id}/role-mappings/realm",
        json=[role],
        timeout=30,
    )
    if assign_response.status_code not in {204, 200}:
        _fail(
            f"No se pudo asignar el rol '{role_name}': "
            f"{assign_response.status_code} {assign_response.text[:500]}"
        )
    print(f"[seed-keycloak] Rol '{role_name}' asignado.")


def main() -> int:
    keycloak_url = (os.getenv("KEYCLOAK_URL") or "").rstrip("/")
    if not keycloak_url:
        _fail("KEYCLOAK_URL no está configurado")

    qa_password = os.getenv("QA_PASSWORD", "")
    if not qa_password:
        print(
            "[seed-keycloak] AVISO: QA_PASSWORD no está configurado. "
            "No se crea el usuario QA y las pruebas E2E de login se omitirán.",
            file=sys.stderr,
        )
        return 0

    realm = os.getenv("KEYCLOAK_REALM", "game-store")
    username = os.getenv("QA_USERNAME", "qa-admin")
    email = os.getenv("QA_EMAIL", f"{username}@game-store.local")
    role_name = os.getenv("QA_ROLE", "store_admin")
    verify_tls = _env_bool("VERIFY_TLS", True)

    session = requests.Session()
    session.verify = verify_tls
    session.headers.update({"Accept": "application/json"})
    if not verify_tls:
        requests.packages.urllib3.disable_warnings()  # type: ignore[attr-defined]

    try:
        token = _admin_token(session, keycloak_url)
        session.headers["Authorization"] = f"Bearer {token}"

        base_url = f"{keycloak_url}/admin/realms/{realm}"

        realm_response = session.get(base_url, timeout=30)
        if realm_response.status_code != 200:
            _fail(
                f"El realm '{realm}' no existe o no es accesible: "
                f"{realm_response.status_code} {realm_response.text[:500]}"
            )

        user = _find_user(session, base_url, username)
        if user is None:
            user = _create_user(session, base_url, username, email)
            print(f"[seed-keycloak] Usuario '{username}' creado.")
        else:
            _update_user(session, base_url, user, email)
            print(f"[seed-keycloak] Usuario '{username}' actualizado.")

        _reset_password(session, base_url, user["id"], qa_password)
        print("[seed-keycloak] Contraseña permanente asignada.")

        _ensure_role(session, base_url, user["id"], role_name)
        print(
            f"[seed-keycloak] Listo: {username} en el realm '{realm}' "
            f"con rol '{role_name}'."
        )
        return 0
    finally:
        session.close()


if __name__ == "__main__":
    raise SystemExit(main())
