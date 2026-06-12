from models import Product
from extensions import db


class ProductService:
    @staticmethod
    def create(data):
        name = data.get("name")
        sku = data.get("sku")
        price = data.get("price")
        quantity = data.get("quantity", 0)

        if not name:
            raise ValueError("Product name is required")

        if not sku:
            raise ValueError("Product SKU is required")

        if price is None or price <= 0:
            raise ValueError("Product price must be greater than 0")

        if quantity < 0:
            raise ValueError("Product quantity cannot be negative")

        existing_product = Product.query.filter_by(sku=sku).first()

        if existing_product:
            raise ValueError("Product SKU already exists")

        product = Product(**data)

        db.session.add(product)
        db.session.commit()

        return product