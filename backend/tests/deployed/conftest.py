"""Configuración común para las pruebas contra el sistema desplegado.

Estas pruebas NO importan ``app``, ``db`` ni ``models``: se ejecutan desde
fuera del contenedor y hablan por HTTPS con el sistema real detrás de Caddy.
Eso permite validar el ambiente completo (Caddy, TLS, backend, PostgreSQL y
Keycloak) y no solo la lógica interna de Flask.

Variables de entorno principales
--------------------------------
``BASE_URL``
    URL pública del sistema, por ejemplo ``https://game-store-staging.example.com``.
    Si no está definida, todas las pruebas de este directorio se omiten.
``FLASK_SECRET_KEY``
    Secreto real del backend. Solo se usa para firmar el token "bootstrap"
    que permite llamar a ``/api/test-tools/token`` y obtener tokens por rol.
``KEYCLOAK_URL``
    URL pública de Keycloak. Por defecto se deriva de ``BASE_URL`` usando el
    puerto 8443, que es el que publica ``deploy/docker-compose.yml``.
``KEYCLOAK_REALM`` / ``KEYCLOAK_CLIENT_ID``
    Realm y cliente OIDC. Por defecto ``game-store`` y ``game-store-client``.
``QA_USERNAME`` / ``QA_PASSWORD``
    Usuario de Keycloak creado por ``seed_keycloak_qa.py`` para el login real.
``EXPECTED_VERSION``
    SHA de la imagen desplegada. Se compara con ``/health``.
``EXPECTED_ENVIRONMENT``
    ``staging`` o ``production``. Permite verificar que las herramientas de
    prueba estén habilitadas solo donde corresponde.
``PYTEST_RESULT_PREFIX``
    Prefijo opcional para los archivos de resultados (``smoke``, ``api``...).
``VERIFY_TLS``
    ``true`` por defecto. Solo se desactiva para certificados autofirmados.

Resultados
----------
Los reportes JUnit y HTML se guardan en ``<raíz del proyecto>/results/backend``.
"""

from __future__ import annotations

import html
import importlib.util
import json
import os
import re
import time
import uuid
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Callable
from urllib.parse import parse_qs, urlencode, urljoin, urlparse

import jwt
import pytest
import requests

# ``results/`` vive en la raíz del repositorio, no dentro de ``backend/``.
# conftest.py -> deployed -> tests -> backend -> raíz del proyecto.
PROJECT_ROOT = Path(__file__).resolve().parents[3]
RESULTS_DIR = PROJECT_ROOT / "results" / "backend"

# Roles que usa la suite administrativa. ``/api/test-tools/token`` solo acepta
# los roles declarados en ``ALLOWED_TEST_ROLES`` (routes.py).
ADMIN_ROLES = [
    "product:view",
    "product:manage",
    "stock:view",
    "stock:manage",
    "report:view",
    "audit:view",
    "user:manage",
]
VIEWER_ROLES = ["product:view", "stock:view"]


def _base_url() -> str:
    """Devuelve la URL pública normalizada o cadena vacía si no está configurada."""

    return (os.getenv("BASE_URL") or os.getenv("STAGING_URL") or "").rstrip("/")


def _env_bool(name: str, default: bool = True) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().lower() in {"1", "true", "yes", "on"}


def _default_keycloak_url(base_url: str) -> str:
    """Deriva ``https://<host>:8443`` a partir de la URL pública."""

    parsed = urlparse(base_url)
    host = parsed.hostname or ""
    scheme = parsed.scheme or "https"
    return f"{scheme}://{host}:8443"


@dataclass(frozen=True)
class Settings:
    """Configuración inmutable compartida por toda la sesión de pruebas."""

    base_url: str
    keycloak_url: str
    keycloak_realm: str
    keycloak_client_id: str
    secret_key: str | None
    expected_version: str | None
    expected_environment: str | None
    verify_tls: bool
    qa_username: str
    qa_password: str | None


@dataclass
class KeycloakSession:
    """Tokens y usuario obtenidos mediante el flujo real authorization-code."""

    session_token: str
    access_token: str
    id_token: str
    refresh_token: str | None
    user: dict[str, Any]


@dataclass
class LoginAttempt:
    """Resultado de intentar autenticarse en el formulario de Keycloak."""

    status_code: int
    code: str | None
    location: str
    body: str


def auth_headers(token: str) -> dict[str, str]:
    """Construye la cabecera Bearer que espera el backend."""

    return {"Authorization": f"Bearer {token}"}


def pytest_configure(config: pytest.Config) -> None:
    """Configura los reportes solo cuando hay un ambiente real que probar.

    Si se ejecuta ``pytest`` sin ``BASE_URL`` (por ejemplo en un desarrollador
    local), no se crean artefactos vacíos en ``results/backend``.
    """

    if not _base_url():
        return

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    prefix = os.getenv("PYTEST_RESULT_PREFIX", "").strip()
    file_prefix = f"{prefix}-" if prefix else ""

    junit_path = RESULTS_DIR / f"{file_prefix}junit.xml"
    if not getattr(config.option, "junitxml", None):
        config.option.junitxml = str(junit_path)

    # pytest-html es opcional: las pruebas deben poder ejecutarse aunque el
    # plugin no esté instalado (por ejemplo en un entorno mínimo).
    if importlib.util.find_spec("pytest_html") is not None:
        if not getattr(config.option, "htmlpath", None):
            config.option.htmlpath = str(RESULTS_DIR / f"{file_prefix}report.html")
        config.option.self_contained_html = True


def pytest_collection_modifyitems(config: pytest.Config, items: list[pytest.Item]) -> None:
    """Omite las pruebas desplegadas cuando no hay ``BASE_URL``.

    Se marca cada elemento (y no se usa ``collect_ignore``) para que el reporte
    muestre explícitamente los tests como *skipped* y quede claro por qué no se
    ejecutaron.
    """

    if _base_url():
        return

    skip = pytest.mark.skip(
        reason=(
            "BASE_URL no está configurado. Estas pruebas requieren un sistema "
            "desplegado (staging/producción)."
        )
    )
    for item in items:
        node_path = str(getattr(item, "fspath", item.path)).replace("\\", "/")
        if "/tests/deployed/" in node_path or item.get_closest_marker("deployed"):
            item.add_marker(skip)


def pytest_sessionfinish(session: pytest.Session, exitstatus: int) -> None:
    """Guarda metadatos útiles junto a los reportes de la ejecución."""

    base_url = _base_url()
    if not base_url:
        return

    RESULTS_DIR.mkdir(parents=True, exist_ok=True)
    prefix = os.getenv("PYTEST_RESULT_PREFIX", "").strip()
    file_prefix = f"{prefix}-" if prefix else ""
    metadata = {
        "base_url": base_url,
        "keycloak_url": os.getenv("KEYCLOAK_URL") or _default_keycloak_url(base_url),
        "expected_version": os.getenv("EXPECTED_VERSION"),
        "expected_environment": os.getenv("EXPECTED_ENVIRONMENT"),
        "exit_status": int(exitstatus),
        "finished_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    (RESULTS_DIR / f"{file_prefix}metadata.json").write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )


@pytest.fixture(scope="session")
def settings() -> Settings:
    """Entrega la configuración del ambiente y omite la suite si falta."""

    base_url = _base_url()
    if not base_url:
        pytest.skip("BASE_URL no configurado")

    return Settings(
        base_url=base_url,
        keycloak_url=(os.getenv("KEYCLOAK_URL") or _default_keycloak_url(base_url)).rstrip("/"),
        keycloak_realm=os.getenv("KEYCLOAK_REALM", "game-store"),
        keycloak_client_id=os.getenv("KEYCLOAK_CLIENT_ID", "game-store-client"),
        secret_key=os.getenv("FLASK_SECRET_KEY") or os.getenv("SECRET_KEY"),
        expected_version=os.getenv("EXPECTED_VERSION") or None,
        expected_environment=(os.getenv("EXPECTED_ENVIRONMENT") or "").lower() or None,
        verify_tls=_env_bool("VERIFY_TLS", True),
        qa_username=os.getenv("QA_USERNAME", "qa-admin"),
        qa_password=os.getenv("QA_PASSWORD") or None,
    )


@pytest.fixture(scope="session")
def http(settings: Settings) -> requests.Session:
    """Sesión HTTP reutilizable con TLS verificado y timeout controlado."""

    session = requests.Session()
    session.verify = settings.verify_tls
    session.headers.update(
        {
            "User-Agent": "game-store-deployed-tests/1.0",
            "Accept": "application/json",
        }
    )

    if not settings.verify_tls:
        # El usuario decidió explícitamente aceptar certificados no confiables.
        requests.packages.urllib3.disable_warnings()  # type: ignore[attr-defined]

    yield session
    session.close()


@pytest.fixture(scope="session")
def bootstrap_token(settings: Settings) -> str:
    """Firma un JWT con el secreto real para poder pedir tokens de prueba.

    El backend exige el rol ``user:manage`` para llamar a
    ``/api/test-tools/token``. Este token solo se usa como llave de arranque;
    las pruebas de autorización usan los tokens emitidos por ese endpoint.
    """

    if not settings.secret_key:
        pytest.skip(
            "FLASK_SECRET_KEY no configurado: se requieren tokens de prueba "
            "para las verificaciones autenticadas."
        )

    now = int(time.time())
    payload = {
        "sub": "deployed-test-bootstrap",
        "email": "deployed-tests@game-store.local",
        "name": "Deployed Test Bootstrap",
        "roles": ["user:manage"],
        "iat": now,
        "exp": now + 600,
    }
    return jwt.encode(payload, settings.secret_key, algorithm="HS256")


@pytest.fixture(scope="session")
def token_factory(
    http: requests.Session,
    settings: Settings,
    bootstrap_token: str,
) -> Callable[..., str]:
    """Fábrica de tokens con roles específicos emitidos por el propio backend."""

    cache: dict[tuple[str, ...], str] = {}

    def _factory(roles: list[str], expires_minutes: int = 15) -> str:
        cache_key = tuple(sorted(roles))
        if cache_key in cache:
            return cache[cache_key]

        response = http.post(
            f"{settings.base_url}/api/test-tools/token",
            json={"roles": roles, "expires_minutes": expires_minutes},
            headers=auth_headers(bootstrap_token),
            timeout=30,
        )

        if response.status_code == 404:
            pytest.skip(
                "ENABLE_TEST_TOOLS está deshabilitado en este ambiente; "
                "no es posible emitir tokens por rol."
            )

        assert response.status_code == 201, (
            "No se pudo emitir el token de prueba: "
            f"{response.status_code} {response.text[:500]}"
        )
        token = response.json()["token"]
        cache[cache_key] = token
        return token

    return _factory


@pytest.fixture(scope="session")
def admin_token(token_factory: Callable[..., str]) -> str:
    """Token con todos los permisos usados por la suite administrativa."""

    return token_factory(ADMIN_ROLES)


@pytest.fixture(scope="session")
def admin_headers(admin_token: str) -> dict[str, str]:
    """Cabeceras listas para usar con permisos administrativos."""

    return auth_headers(admin_token)


@pytest.fixture(scope="session")
def viewer_token(token_factory: Callable[..., str]) -> str:
    """Token de solo lectura para probar respuestas 403."""

    return token_factory(VIEWER_ROLES)


@pytest.fixture(scope="session")
def viewer_headers(viewer_token: str) -> dict[str, str]:
    """Cabeceras de solo lectura."""

    return auth_headers(viewer_token)


@pytest.fixture(scope="session")
def bootstrap_headers(bootstrap_token: str) -> dict[str, str]:
    """Cabeceras con el token de arranque (rol ``user:manage``)."""

    return auth_headers(bootstrap_token)


@pytest.fixture(scope="session")
def run_id() -> str:
    """Identificador único para no chocar con datos de ejecuciones anteriores."""

    return f"qa-{int(time.time())}-{uuid.uuid4().hex[:6]}"


def _product_payload(run_id: str, **overrides: Any) -> dict[str, Any]:
    """Payload válido de producto con un SKU único por ejecución."""

    suffix = uuid.uuid4().hex[:8]
    payload: dict[str, Any] = {
        "name": f"Producto QA {suffix}",
        "sku": f"{run_id}-{suffix}".upper(),
        "description": "Producto creado por las pruebas de staging",
        "category": "qa",
        "price": "19.99",
        "quantity": 10,
        "min_stock": 2,
        "status": "active",
    }
    payload.update(overrides)
    return payload


@pytest.fixture
def product_factory(
    http: requests.Session,
    settings: Settings,
    admin_headers: dict[str, str],
    run_id: str,
) -> Callable[..., dict[str, Any]]:
    """Crea productos por API y los elimina al terminar la prueba.

    La limpieza es *best effort*: un producto con movimientos de stock no puede
    borrarse por la clave foránea de ``movimientos_stock``. En ese caso se deja
    el registro y se documenta en la prueba correspondiente.
    """

    created: list[dict[str, Any]] = []

    def _create(**overrides: Any) -> dict[str, Any]:
        payload = _product_payload(run_id, **overrides)
        response = http.post(
            f"{settings.base_url}/api/products/",
            json=payload,
            headers=admin_headers,
            timeout=30,
        )
        assert response.status_code == 201, (
            "No se pudo crear el producto de prueba: "
            f"{response.status_code} {response.text[:500]}"
        )
        product = response.json()
        created.append(product)
        return product

    yield _create

    for product in reversed(created):
        try:
            http.delete(
                f"{settings.base_url}/api/products/{product['id']}",
                headers=admin_headers,
                timeout=15,
            )
        except requests.RequestException:
            # La limpieza nunca debe ocultar el resultado real de la prueba.
            pass


# ---------------------------------------------------------------------------
# Flujo real de login contra Keycloak (authorization-code)
# ---------------------------------------------------------------------------


def _authorization_url(settings: Settings) -> str:
    """Construye la URL de autorización que usa el frontend."""

    query = urlencode(
        {
            "client_id": settings.keycloak_client_id,
            "redirect_uri": f"{settings.base_url}/login/callback",
            "response_type": "code",
            "scope": "openid",
        }
    )
    return (
        f"{settings.keycloak_url}/realms/{settings.keycloak_realm}"
        f"/protocol/openid-connect/auth?{query}"
    )


def _extract_login_action(page_html: str) -> str | None:
    """Extrae el ``action`` del formulario de login de Keycloak.

    Se buscan primero los formularios con ``id="kc-form-login"`` y, si el tema
    cambia, cualquier formulario con ``action``. El HTML puede contener ``&amp;``
    en la URL, por eso se decodifica antes de devolverla.
    """

    patterns = [
        r'<form[^>]*id=["\']kc-form-login["\'][^>]*action=["\']([^"\']+)["\']',
        r'<form[^>]*action=["\']([^"\']+)["\'][^>]*>',
    ]
    for pattern in patterns:
        match = re.search(pattern, page_html, flags=re.IGNORECASE | re.DOTALL)
        if match:
            return html.unescape(match.group(1))
    return None


def _extract_code(location: str) -> str | None:
    """Obtiene ``code`` del ``Location`` de la redirección de Keycloak."""

    if not location:
        return None
    query = parse_qs(urlparse(location).query)
    codes = query.get("code")
    return codes[0] if codes else None


def perform_keycloak_login(
    settings: Settings,
    username: str,
    password: str,
) -> LoginAttempt:
    """Automatiza el formulario de Keycloak sin navegador.

    Se usa ``requests`` para mantener las cookies de sesión de Keycloak. El
    flujo es el mismo que sigue el navegador: GET a ``/auth``, POST del
    formulario y captura del ``code`` en la redirección final.
    """

    session = requests.Session()
    session.verify = settings.verify_tls
    session.headers.update({"User-Agent": "game-store-deployed-tests/1.0"})

    try:
        page = session.get(_authorization_url(settings), timeout=30, allow_redirects=True)
        if page.status_code != 200:
            return LoginAttempt(page.status_code, None, page.url, page.text[:2000])

        action = _extract_login_action(page.text)
        if not action:
            return LoginAttempt(
                page.status_code,
                None,
                page.url,
                "No se encontró el formulario de login de Keycloak: " + page.text[:1000],
            )

        action = urljoin(page.url, action)
        response = session.post(
            action,
            data={
                "username": username,
                "password": password,
                "credentialId": "",
                "login": "Sign In",
            },
            headers={"Referer": page.url},
            timeout=30,
            allow_redirects=False,
        )
        location = response.headers.get("Location", "")
        return LoginAttempt(
            response.status_code,
            _extract_code(location),
            location,
            response.text[:2000],
        )
    finally:
        session.close()


def exchange_code_for_session(settings: Settings, code: str) -> dict[str, Any]:
    """Canjea el ``code`` de Keycloak por el token de sesión del backend."""

    response = requests.post(
        f"{settings.base_url}/auth/login",
        json={"code": code},
        timeout=30,
        verify=settings.verify_tls,
    )
    assert response.status_code == 200, (
        "El backend no pudo canjear el código de Keycloak: "
        f"{response.status_code} {response.text[:500]}"
    )
    return response.json()


@pytest.fixture(scope="session")
def keycloak_login_attempt(settings: Settings) -> Callable[[str, str], LoginAttempt]:
    """Expone el intento de login para probar credenciales inválidas."""

    def _attempt(username: str, password: str) -> LoginAttempt:
        return perform_keycloak_login(settings, username, password)

    return _attempt


@pytest.fixture(scope="session")
def keycloak_session(settings: Settings) -> KeycloakSession:
    """Sesión real de Keycloak usando el usuario QA sembrado en staging."""

    if not settings.qa_password:
        pytest.skip(
            "QA_PASSWORD no configurado: se omite el login real contra Keycloak."
        )

    attempt = perform_keycloak_login(
        settings,
        settings.qa_username,
        settings.qa_password,
    )
    if not attempt.code:
        pytest.fail(
            "Keycloak no devolvió un código de autorización. "
            f"status={attempt.status_code}, location={attempt.location!r}, "
            f"body={attempt.body[:800]}"
        )

    data = exchange_code_for_session(settings, attempt.code)
    return KeycloakSession(
        session_token=data["session_token"],
        access_token=data.get("access_token", ""),
        id_token=data.get("id_token", ""),
        refresh_token=data.get("refresh_token"),
        user=data.get("user") or {},
    )
