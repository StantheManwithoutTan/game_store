import pytest

from app import create_app
from config import Config
from extensions import db
from models import Product, StockMovement
from services.stock_service import StockService


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
    from services.product_service import ProductService
    return ProductService.create({
        "name": "Nintendo Switch",
        "sku": "NSW-001",
        "price": 299.99,
        "quantity": 10,
        "min_stock": 2,
        "status": "active",
    })

# pruebas de entrada_stock
def test_entrada_stock_incrementa_cantidad(app, sample_product):
    mov = StockService.entrada_stock(sample_product.id, 5,
        motive="reabastecimiento", usuario="admin@email.com")

    assert mov.type_movement == "entrada"
    assert mov.amount == 5
    assert mov.stock_before == 10
    assert mov.stock_after == 15
    assert mov.usuario == "admin@email.com"
    assert mov.motive == "reabastecimiento"
    assert db.session.get(Product, sample_product.id).quantity == 15

def test_entrada_stock_crea_registro_historial(app, sample_product):
    StockService.entrada_stock(sample_product.id, 3)
    movs = StockMovement.query.all()
    assert len(movs) == 1
    assert movs[0].type_movement == "entrada"
    assert movs[0].product_id == sample_product.id


#pruebas de salida_stock
def test_salida_stock_decrementa_cantidad(app, sample_product):
    mov = StockService.salida_stock(sample_product.id, 3, motive="venta")
    assert mov.type_movement == "salida"
    assert mov.amount == 3
    assert mov.stock_before == 10
    assert mov.stock_after == 7
    assert db.session.get(Product, sample_product.id).quantity == 7

def test_salida_stock_sin_stock_lanza_error(app, sample_product):
    with pytest.raises(ValueError, match="Stock insuficiente"):
        StockService.salida_stock(sample_product.id, 999)

def test_salida_stock_con_stock_exacto_funciona(app, sample_product):
    mov = StockService.salida_stock(sample_product.id, 10)
    assert mov.stock_after == 0


# pruebas de ajuste
def test_ajuste_stock_aumenta_cantidad(app, sample_product):
    mov = StockService.ajuste_stock(sample_product.id, 20, motive="inventario")
    assert mov.type_movement == "ajuste"
    assert mov.amount == 10      # 20 - 10
    assert mov.stock_before == 10
    assert mov.stock_after == 20

def test_ajuste_stock_disminuye_cantidad(app, sample_product):
    mov = StockService.ajuste_stock(sample_product.id, 5)
    assert mov.amount == -5      # 5 - 10
    assert mov.stock_after == 5

def test_ajuste_stock_a_cero_funciona(app, sample_product):
    mov = StockService.ajuste_stock(sample_product.id, 0)
    assert mov.stock_after == 0

def test_ajuste_stock_rechaza_negativo(app, sample_product):
    with pytest.raises(ValueError, match="La cantidad no puede ser negativa"):
        StockService.ajuste_stock(sample_product.id, -1)


#pruebas criticas 
def test_criticos_con_stock_bajo(app, sample_product):
    assert len(StockService.criticos()) == 0
    StockService.ajuste_stock(sample_product.id, 1)
    assert len(StockService.criticos()) == 1

def test_criticos_excluye_inactivos(app, sample_product):
    StockService.ajuste_stock(sample_product.id, 1)
    from services.product_service import ProductService
    ProductService.update(sample_product.id, {"status": "discontinued"})
    assert len(StockService.criticos()) == 0


#pruebas historial
def test_historial_filtra_por_producto(app, sample_product):
    from services.product_service import ProductService
    otro = ProductService.create({"name": "Xbox", "sku": "XBOX-001", "price": 399.99, "quantity": 5})
    StockService.entrada_stock(sample_product.id, 5)
    StockService.entrada_stock(otro.id, 3)
    hist = StockService.historial(product_id=sample_product.id)
    assert len(hist) == 1
    assert hist[0].product_id == sample_product.id


