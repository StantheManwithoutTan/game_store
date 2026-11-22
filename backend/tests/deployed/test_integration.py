"""Pruebas de integración del sistema desplegado.

Aquí se combinan las piezas reales: API + PostgreSQL + Keycloak. No se usa
ningún mock ni base efímera; los datos viajan por HTTPS y quedan persistidos
en la base del ambiente.

Las pruebas de stock crean productos con movimientos. Esos productos no se
pueden borrar por la clave foránea de ``movimientos_stock``; la limpieza de
``product_factory`` es *best effort* y deja el registro cuando corresponde.
"""

from __future__ import annotations

import pytest
import requests

pytestmark = [pytest.mark.deployed, pytest.mark.integration]


def _get_product(
    http: requests.Session,
    settings,
    headers: dict[str, str],
    product_id: int,
) -> dict:
    response = http.get(
        f"{settings.base_url}/api/products/{product_id}",
        headers=headers,
        timeout=20,
    )
    assert response.status_code == 200
    return response.json()


# Qué prueba: que una entrada de stock actualice la cantidad del producto en
# PostgreSQL y quede registrada en el historial.
# Resultado esperado: 201, ``stock_after = stock_before + amount`` y movimiento
# visible en ``/api/stocks/historial``.
def test_stock_entry_updates_quantity_and_history(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    product = product_factory(quantity=5, min_stock=1)

    response = http.post(
        f"{settings.base_url}/api/stocks/entrada",
        json={
            "product_id": product["id"],
            "amount": 7,
            "motive": "Entrada registrada por prueba de integración",
        },
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 201
    movement = response.json()
    assert movement["type_movement"] == "entrada"
    assert movement["amount"] == 7
    assert movement["stock_before"] == 5
    assert movement["stock_after"] == 12
    assert movement["usuario"] == "test-tools@game-store.local"

    persisted = _get_product(http, settings, admin_headers, product["id"])
    assert persisted["quantity"] == 12

    history = http.get(
        f"{settings.base_url}/api/stocks/historial",
        params={"product_id": product["id"]},
        headers=admin_headers,
        timeout=20,
    )
    assert history.status_code == 200
    assert any(item["id"] == movement["id"] for item in history.json())


# Qué prueba: que una salida de stock descuente unidades y respete el stock
# mínimo para marcar el producto como crítico.
# Resultado esperado: 201, cantidad 6 y ``critico_stock`` verdadero porque
# 6 <= min_stock (8).
def test_stock_exit_decreases_quantity_and_marks_critical(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    product = product_factory(quantity=10, min_stock=8)

    response = http.post(
        f"{settings.base_url}/api/stocks/salida",
        json={
            "product_id": product["id"],
            "amount": 4,
            "motive": "Salida registrada por prueba de integración",
        },
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 201
    movement = response.json()
    assert movement["stock_before"] == 10
    assert movement["stock_after"] == 6

    persisted = _get_product(http, settings, admin_headers, product["id"])
    assert persisted["quantity"] == 6
    assert persisted["critico_stock"] is True


# Qué prueba: que no se pueda sacar más stock del disponible.
# Resultado esperado: 400 con ``Stock insuficiente`` y cantidad intacta.
def test_stock_exit_with_insufficient_stock_returns_400(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    product = product_factory(quantity=1, min_stock=0)

    response = http.post(
        f"{settings.base_url}/api/stocks/salida",
        json={
            "product_id": product["id"],
            "amount": 5,
            "motive": "Intento inválido de salida",
        },
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 400
    assert "insuficiente" in response.json().get("message", "").lower()

    persisted = _get_product(http, settings, admin_headers, product["id"])
    assert persisted["quantity"] == 1


# Qué prueba: que un ajuste fije la cantidad absoluta y registre la diferencia
# como ``amount`` del movimiento.
# Resultado esperado: 201, ``amount = -7`` y cantidad final 3.
def test_stock_adjustment_sets_absolute_quantity(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    product = product_factory(quantity=10, min_stock=1)

    response = http.post(
        f"{settings.base_url}/api/stocks/ajuste",
        json={
            "product_id": product["id"],
            "stock_after": 3,
            "motive": "Ajuste por conteo físico",
        },
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 201
    movement = response.json()
    assert movement["type_movement"] == "ajuste"
    assert movement["amount"] == -7
    assert movement["stock_after"] == 3

    persisted = _get_product(http, settings, admin_headers, product["id"])
    assert persisted["quantity"] == 3


# Qué prueba: que un producto por debajo del mínimo aparezca en el endpoint de
# productos críticos que consume el dashboard.
# Resultado esperado: 200 y el id del producto dentro de la lista.
def test_critical_product_appears_in_criticos(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    product_factory,
) -> None:
    product = product_factory(quantity=0, min_stock=3, status="active")

    response = http.get(
        f"{settings.base_url}/api/stocks/criticos",
        headers=admin_headers,
        timeout=20,
    )

    assert response.status_code == 200
    ids = {item["id"] for item in response.json()}
    assert product["id"] in ids


# Qué prueba: que el token emitido tras un login real de Keycloak tenga los
# roles necesarios para consultar la API.
# Resultado esperado: 200 al listar productos con el ``session_token``.
def test_keycloak_session_token_can_read_products(
    http: requests.Session,
    settings,
    keycloak_session,
) -> None:
    response = http.get(
        f"{settings.base_url}/api/products/",
        headers={"Authorization": f"Bearer {keycloak_session.session_token}"},
        timeout=20,
    )

    assert response.status_code == 200
    assert isinstance(response.json(), list)


# Qué prueba: que el usuario QA con rol ``store_admin`` pueda crear un producto
# usando el token obtenido por el flujo real de Keycloak.
# Resultado esperado: 201 y producto persistido; se elimina con el token admin.
def test_keycloak_admin_session_can_create_product(
    http: requests.Session,
    settings,
    admin_headers: dict[str, str],
    keycloak_session,
    run_id: str,
) -> None:
    sku = f"{run_id}-KC".upper()
    payload = {
        "name": "Producto creado con sesión Keycloak",
        "sku": sku,
        "description": "Integración Keycloak -> backend -> PostgreSQL",
        "category": "qa",
        "price": "12.00",
        "quantity": 2,
        "min_stock": 1,
        "status": "active",
    }

    response = http.post(
        f"{settings.base_url}/api/products/",
        json=payload,
        headers={"Authorization": f"Bearer {keycloak_session.session_token}"},
        timeout=20,
    )

    assert response.status_code == 201, response.text[:500]
    created = response.json()
    assert created["sku"] == sku

    try:
        persisted = _get_product(http, settings, admin_headers, created["id"])
        assert persisted["name"] == payload["name"]
    finally:
        http.delete(
            f"{settings.base_url}/api/products/{created['id']}",
            headers=admin_headers,
            timeout=20,
        )
