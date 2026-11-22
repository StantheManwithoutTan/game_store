"""Pruebas de contrato y CRUD contra la API desplegada.

A diferencia de ``backend/tests/test_product_api.py`` (que usa el test client
de Flask y una base efímera), aquí se llama por HTTPS a la API real detrás de
Caddy. Los tokens se obtienen de ``/api/test-tools/token`` usando el secreto
real del ambiente.
"""

from __future__ import annotations

import time

import jwt
import pytest
import requests

pytestmark = [pytest.mark.deployed, pytest.mark.api]

# Roles usados por la prueba de JWT manipulado. Se declara aquí para que el
# test sea explícito y no dependa de fixtures de autenticación.
ADMIN_ROLES_FOR_TEST = [
    "product:view",
    "product:manage",
    "stock:view",
    "stock:manage",
    "report:view",
    "audit:view",
    "user:manage",
]


def _valid_payload(sku: str, **overrides) -> dict:
    """Payload mínimo válido según ``ProductSchema``."""

    payload = {
        "name": f"Producto API {sku}",
        "sku": sku,
        "description": "Producto de prueba de contrato",
        "category": "qa",
        "price": "25.50",
        "quantity": 4,
        "min_stock": 1,
        "status": "active",
    }
    payload.update(overrides)
    return payload


# Qué prueba: que el listado de productos devuelva un arreglo paginado.
# Resultado esperado: 200, JSON tipo lista y como máximo ``per_page`` elementos.
def test_list_products_returns_paginated_array(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
) -> None:
    response = http.get(
        f"{settings.base_url}/api/products/",
        params={"page": 1, "per_page": 5},
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 200
    products = response.json()
    assert isinstance(products, list)
    assert len(products) <= 5
    if products:
        assert {"id", "name", "sku", "price", "quantity"} <= set(products[0])


# Qué prueba: que un producto creado por la API se pueda consultar después por
# su id (persistencia real en PostgreSQL, no en memoria).
# Resultado esperado: 201 al crear y 200 con los mismos datos al consultar.
def test_create_product_persists_and_can_be_read(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    created = product_factory()

    response = http.get(
        f"{settings.base_url}/api/products/{created['id']}",
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 200
    fetched = response.json()
    assert fetched["id"] == created["id"]
    assert fetched["sku"] == created["sku"]
    assert fetched["name"] == created["name"]


# Qué prueba: que el SKU sea único a nivel de base de datos y que el error se
# traduzca en una respuesta controlada.
# Resultado esperado: 400 con el mensaje ``Product SKU already exists``.
def test_create_product_rejects_duplicate_sku(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    first = product_factory()
    payload = _valid_payload(first["sku"], name="Duplicado")

    response = http.post(
        f"{settings.base_url}/api/products/",
        json=payload,
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 400
    assert "already exists" in response.json().get("message", "").lower()


# Qué prueba: que la validación de esquema rechace un precio no positivo antes
# de llegar al servicio.
# Resultado esperado: 400
def test_create_product_rejects_non_positive_price(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    run_id: str,
) -> None:
    payload = _valid_payload(f"{run_id}-PRICE", price="0")

    response = http.post(
        f"{settings.base_url}/api/products/",
        json=payload,
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 400  # Debe dar 400 para indicar que no se puede procesaar
    assert "price" in response.json().get("message", "").lower()


# Qué prueba: que la regla de negocio de cantidad no negativa se aplique en el
# servicio y devuelva un 400 legible.
# Resultado esperado: 400 con el mensaje ``Product quantity cannot be negative``.
def test_create_product_rejects_negative_quantity(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    run_id: str,
) -> None:
    payload = _valid_payload(f"{run_id}-QTY".upper(), quantity=-1)

    response = http.post(
        f"{settings.base_url}/api/products/",
        json=payload,
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 400
    assert "negative" in response.json().get("message", "").lower()


# Qué prueba: que una actualización parcial (PUT) modifique el producto y
# devuelva el recurso actualizado.
# Resultado esperado: 200 y el nuevo nombre en la respuesta.
def test_update_product_returns_new_values(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    created = product_factory()

    response = http.put(
        f"{settings.base_url}/api/products/{created['id']}",
        json={"name": "Nombre actualizado por QA"},
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 200
    assert response.json()["name"] == "Nombre actualizado por QA"


# Qué prueba: que no se pueda reutilizar el SKU de otro producto al editar.
# Resultado esperado: 400 con el mensaje de SKU duplicado.
def test_update_product_rejects_duplicate_sku(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    first = product_factory()
    second = product_factory()

    response = http.put(
        f"{settings.base_url}/api/products/{second['id']}",
        json={"sku": first["sku"]},
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 400
    assert "already exists" in response.json().get("message", "").lower()


# Qué prueba: que eliminar un producto devuelva 204 y que luego ya no exista.
# Resultado esperado: 204 en el DELETE y 404 en el GET posterior.
def test_delete_product_returns_204_and_removes_it(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    created = product_factory()

    delete_response = http.delete(
        f"{settings.base_url}/api/products/{created['id']}",
        headers=admin_headers,
        timeout=20,
    )
    get_response = http.get(
        f"{settings.base_url}/api/products/{created['id']}",
        headers=admin_headers,
        timeout=20,
    )

    assert delete_response.status_code == 204
    assert get_response.status_code == 404


# Qué prueba: que consultar un id inexistente devuelva un 404 controlado.
# Resultado esperado: 404 con mensaje JSON, sin traza interna.
def test_get_missing_product_returns_404(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
) -> None:
    response = http.get(
        f"{settings.base_url}/api/products/2147483647",
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 404
    assert response.headers.get("Content-Type", "").startswith("application/json")


# Qué prueba: que la validación de ids fuera de rango también devuelva 404.
# Resultado esperado: 404 para ``/api/products/0``.
def test_invalid_product_id_returns_404(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
) -> None:
    response = http.get(
        f"{settings.base_url}/api/products/0",
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 404


# Qué prueba: que el parámetro ``search`` filtre por nombre en la base real.
# Resultado esperado: 200 y el producto recién creado dentro de los resultados.
def test_search_products_filters_by_name(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
    run_id: str,
) -> None:
    unique_name = f"Busqueda QA {run_id}"
    created = product_factory(name=unique_name)

    response = http.get(
        f"{settings.base_url}/api/products/",
        params={"search": unique_name},
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 200
    ids = {product["id"] for product in response.json()}
    assert created["id"] in ids


# Qué prueba: que la paginación limite realmente el número de elementos.
# Resultado esperado: 200 y como máximo 2 productos con ``per_page=2``.
def test_pagination_limits_results(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
) -> None:
    response = http.get(
        f"{settings.base_url}/api/products/",
        params={"page": 1, "per_page": 2},
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 200
    assert len(response.json()) <= 2


# Qué prueba: que el contrato OpenAPI esté publicado y describa los endpoints
# principales del sistema.
# Resultado esperado: 200 y rutas de productos y stock en ``paths``.
def test_openapi_contract_is_published(
    http: requests.Session,
    settings,
) -> None:
    response = http.get(f"{settings.base_url}/api/openapi.json", timeout=20)

    assert response.status_code == 200
    document = response.json()
    assert document.get("openapi")
    paths = document.get("paths", {})
    assert any(path.rstrip("/") == "/api/products" for path in paths)
    assert any(path.rstrip("/") == "/api/stocks/entrada" for path in paths)


# Qué prueba: que ``/api/reports/`` respete el rol ``report:view``.
# Resultado esperado: 200 para el token administrador y 403 para solo lectura.
def test_reports_endpoint_enforces_report_role(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    viewer_headers: dict[str, str],
) -> None:
    admin_response = http.get(
        f"{settings.base_url}/api/reports/",
        headers=admin_headers,
        timeout=20,
    )
    viewer_response = http.get(
        f"{settings.base_url}/api/reports/",
        headers=viewer_headers,
        timeout=20,
    )

    assert admin_response.status_code == 200
    assert viewer_response.status_code == 403


# Qué prueba: que la auditoría registre la actualización de un producto y que
# el endpoint de auditoría sea legible con el rol correcto.
# Resultado esperado: 200 y una entrada ``products`` con el id actualizado.
def test_audit_endpoint_records_product_update(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    created = product_factory()
    update = http.put(
        f"{settings.base_url}/api/products/{created['id']}",
        json={"description": "Cambio auditado por las pruebas de staging"},
        headers=admin_headers,
        timeout=20,
    )
    assert update.status_code == 200

    response = http.get(
        f"{settings.base_url}/api/audit/",
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 200
    logs = response.json()
    assert isinstance(logs, list)
    assert any(
        log.get("table_name") == "products"
        and log.get("record_id") == created["id"]
        and log.get("action") == "UPDATE"
        for log in logs
    )


# Qué prueba: que ``/api/users/`` exija el permiso ``user:manage``.
# Resultado esperado: 200 para administrador y 403 para un token de solo lectura.
def test_users_endpoint_requires_user_manage(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    viewer_headers: dict[str, str],
) -> None:
    admin_response = http.get(
        f"{settings.base_url}/api/users/",
        headers=admin_headers,
        timeout=20,
    )
    viewer_response = http.get(
        f"{settings.base_url}/api/users/",
        headers=viewer_headers,
        timeout=20,
    )

    assert admin_response.status_code == 200
    assert viewer_response.status_code == 403


# Qué prueba: que ``/api/test-tools/token`` rechace roles que no existen en la
# lista blanca del backend.
# Resultado esperado: 400 con ``Invalid roles``.
def test_test_tools_rejects_unknown_roles(
    http: requests.Session,
    settings,
    bootstrap_headers: dict[str, str],
) -> None:
    response = http.post(
        f"{settings.base_url}/api/test-tools/token",
        json={"roles": ["super:admin"]},
        headers=bootstrap_headers,
        timeout=20,
    )

    assert response.status_code == 400
    assert "invalid roles" in response.json().get("message", "").lower()


# Qué prueba: que la API no acepte peticiones sin token.
# Resultado esperado: 401 con ``Missing token``.
def test_products_endpoint_rejects_missing_token(
    http: requests.Session,
    settings,
) -> None:
    response = http.get(f"{settings.base_url}/api/products/", timeout=20)

    assert response.status_code == 401
    assert response.json().get("error") == "Missing token"


# Qué prueba: que un JWT firmado con otro secreto no sea aceptado.
# Resultado esperado: 401 con ``Invalid token``.
def test_products_endpoint_rejects_tampered_jwt(
    http: requests.Session,
    settings,
) -> None:
    forged = jwt.encode(
        {
            "sub": "attacker",
            "email": "attacker@example.com",
            "roles": ADMIN_ROLES_FOR_TEST,
            "exp": int(time.time()) + 300,
        },
        "secreto-que-no-es-el-del-ambiente",
        algorithm="HS256",
    )

    response = http.get(
        f"{settings.base_url}/api/products/",
        headers={"Authorization": f"Bearer {forged}"},
        timeout=20,
    )

    assert response.status_code == 401
    assert response.json().get("error") == "Invalid token"

