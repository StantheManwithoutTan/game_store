from app import create_app
from config import Config
from extensions import db
from models import Product

def seed_data(app=None):
    if app is None:
        app = create_app(Config)

    with app.app_context():
        if Product.query.first():
            return  # ya hay datos

        products = [
            Product(name="PS5", sku="PS5-001", price=499.99, quantity=10, min_stock=2, status="active"),
            Product(name="Xbox Series X", sku="XBOX-001", price=499.99, quantity=8, min_stock=2, status="active"),
            Product(name="Nintendo Switch", sku="NSW-001", price=299.99, quantity=15, min_stock=3, status="active"),
        ]
        db.session.add_all(products)
        db.session.commit()


if __name__ == "__main__":
    seed_data()

def test_seeds_load_successfully(app):
    from seed import seed_data
    seed_data(app)
    assert Product.query.count() > 0
    assert Product.query.filter_by(sku="PS5-001").first() is not None
    assert Product.query.filter_by(sku="XBOX-001").first() is not None
    assert Product.query.filter_by(sku="NSW-001").first() is not None