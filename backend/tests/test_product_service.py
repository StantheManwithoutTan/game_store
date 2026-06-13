import pytest

from app import create_app
from config import Config
from extensions import db
from models import AuditLog, Product
from services.product_service import ProductService


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SQLALCHEMY_TRACK_MODIFICATIONS = False


@pytest.fixture()
def app():
    app = create_app(TestConfig)

    with app.app_context():
        db.create_all()
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def sample_product(app):
    product = ProductService.create({
        "name": "Nintendo Switch",
        "sku": "NSW-001",
        "description": "Consola Nintendo Switch",
        "category": "console",
        "price": 299.99,
        "quantity": 10,
        "min_stock": 2,
        "status": "active",
    })
    return product


def test_create_product_success(app):
    product = ProductService.create({
        "name": "PS5",
        "sku": "PS5-001",
        "price": 499.99,
        "quantity": 5,
    })

    assert product.id is not None
    assert product.name == "PS5"
    assert product.sku == "PS5-001"


def test_create_product_requires_name(app):
    with pytest.raises(ValueError, match="Product name is required"):
        ProductService.create({
            "sku": "NO-NAME",
            "price": 10,
            "quantity": 1,
        })


def test_create_product_requires_sku(app):
    with pytest.raises(ValueError, match="Product SKU is required"):
        ProductService.create({
            "name": "No SKU",
            "price": 10,
            "quantity": 1,
        })


def test_create_product_requires_positive_price(app):
    with pytest.raises(ValueError, match="Product price must be greater than 0"):
        ProductService.create({
            "name": "Invalid Price",
            "sku": "BAD-PRICE",
            "price": 0,
            "quantity": 1,
        })


def test_create_product_rejects_negative_quantity(app):
    with pytest.raises(ValueError, match="Product quantity cannot be negative"):
        ProductService.create({
            "name": "Negative Stock",
            "sku": "NEG-001",
            "price": 20,
            "quantity": -1,
        })


def test_create_product_rejects_duplicate_sku(app, sample_product):
    with pytest.raises(ValueError, match="Product SKU already exists"):
        ProductService.create({
            "name": "Duplicate",
            "sku": "NSW-001",
            "price": 299.99,
            "quantity": 1,
        })


def test_get_all_returns_products(app, sample_product):
    products = ProductService.get_all()

    assert products.total == 1
    assert products.items[0].sku == "NSW-001"


def test_get_all_filters_by_search(app, sample_product):
    products = ProductService.get_all(search="Nintendo")

    assert products.total == 1
    assert products.items[0].name == "Nintendo Switch"


def test_get_all_filters_by_category(app, sample_product):
    products = ProductService.get_all(category="console")

    assert products.total == 1
    assert products.items[0].category == "console"


def test_get_all_filters_by_status(app, sample_product):
    products = ProductService.get_all(status="active")

    assert products.total == 1
    assert products.items[0].status == "active"


def test_get_by_id_returns_product(app, sample_product):
    product = ProductService.get_by_id(sample_product.id)

    assert product.id == sample_product.id
    assert product.sku == "NSW-001"


def test_update_product_success(app, sample_product):
    product = ProductService.update(sample_product.id, {
        "name": "Nintendo Switch OLED",
        "price": 349.99,
        "quantity": 15,
    })

    assert product.name == "Nintendo Switch OLED"
    assert float(product.price) == 349.99
    assert product.quantity == 15


def test_update_product_requires_name(app, sample_product):
    with pytest.raises(ValueError, match="Product name is required"):
        ProductService.update(sample_product.id, {"name": ""})


def test_update_product_requires_positive_price(app, sample_product):
    with pytest.raises(ValueError, match="Product price must be greater than 0"):
        ProductService.update(sample_product.id, {"price": -10})


def test_update_product_rejects_negative_quantity(app, sample_product):
    with pytest.raises(ValueError, match="Product quantity cannot be negative"):
        ProductService.update(sample_product.id, {"quantity": -5})


def test_update_product_creates_audit_log(app, sample_product):
    ProductService.update(sample_product.id, {"price": 350})

    audit_log = AuditLog.query.filter_by(
        table_name="products",
        record_id=sample_product.id,
        action="UPDATE",
    ).first()

    assert audit_log is not None
    assert audit_log.old_values["price"] == 299.99
    assert audit_log.new_values["price"] == 350.0


def test_delete_product_success(app, sample_product):
    product_id = sample_product.id

    ProductService.delete(product_id)

    assert Product.query.get(product_id) is None