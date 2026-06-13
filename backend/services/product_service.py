from models import Product
from extensions import db

class ProductService:
    @staticmethod
    def create(data):
        name = data.get("name")
        sku = data.get("sku")
        price = data.get("price")
        quantity = data.get("quantity", 0)

        if not name: raise ValueError("Product name is required")
        if not sku: raise ValueError("Product SKU is required")
        if price is None or price <= 0: raise ValueError("Product price must be greater than 0")
        if quantity < 0: raise ValueError("Product quantity cannot be negative")

        existing_product = Product.query.filter_by(sku=sku).first()

        if existing_product: raise ValueError("Product SKU already exists")

        product = Product(**data)

        db.session.add(product)
        db.session.commit()

        return product

    @staticmethod
    def get_all(page=1, per_page=10, search=None, category=None, status=None):
        query = Product.query

        if search: query = query.filter(Product.name.ilike(f"%{search}%"))
        if category: query = query.filter(Product.category == category)
        if status: query = query.filter(Product.status == status)

        return query.paginate(page=page,per_page=per_page,error_out=False)


    @staticmethod
    def get_by_id(product_id):
        return Product.query.get_or_404(product_id)


    @staticmethod
    def update(product_id, data):
        product = ProductService.get_by_id(product_id)

        if "name" in data and not data["name"]: raise ValueError("Product name is required")
        if "price" in data and data["price"] <= 0: raise ValueError("Product price must be greater than 0")
        if "quantity" in data and data["quantity"] < 0: raise ValueError("Product quantity cannot be negative")

        for key, value in data.items():
            setattr(product, key, value)

        db.session.commit()

        return product

    @staticmethod
    def delete(product_id):
        product = ProductService.get_by_id(product_id)

        db.session.delete(product)
        db.session.commit()