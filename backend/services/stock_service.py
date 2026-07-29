from models import Product, StockMovement
from extensions import db

class StockService:
    @staticmethod
    def entrada_stock(product_id, amount, motive=None, usuario=None):
        product = Product.query.get_or_404(product_id)
        stock_before = product.quantity
        product.quantity += amount

        product.critico_stock = (product.quantity <= product.min_stock)

        mov = StockMovement(
            product_id=product_id,
            type_movement="entrada",
            amount=amount,
            stock_before=stock_before,
            stock_after=product.quantity,
            motive=motive,
            usuario=usuario,
        )
        db.session.add(mov)
        db.session.commit()
        return mov

    @staticmethod
    def salida_stock(product_id, amount, motive=None, usuario=None):
        product = Product.query.get_or_404(product_id)
        if product.quantity < amount:
            raise ValueError("Stock insuficiente")
        stock_before = product.quantity
        product.quantity -= amount

        product.critico_stock = (product.quantity <= product.min_stock)

        mov = StockMovement(
            product_id=product_id,
            type_movement="salida",
            amount=amount,
            stock_before=stock_before,
            stock_after=product.quantity,
            motive=motive,
            usuario=usuario,
        )
        db.session.add(mov)
        db.session.commit()
        return mov

    # Utilizados para stock robado, perdido o para arreglar errores 
    @staticmethod
    def ajuste_stock(product_id, stock_after, motive=None, usuario=None):
        product = Product.query.get_or_404(product_id)
        if stock_after < 0:
            raise ValueError("La cantidad no puede ser negativa")
        stock_before = product.quantity
        diff = stock_after - stock_before
        product.quantity = stock_after

        product.critico_stock = (product.quantity <= product.min_stock)

        mov = StockMovement(
            product_id=product_id,
            type_movement="ajuste",
            amount=diff,
            stock_before=stock_before,
            stock_after=stock_after,
            motive=motive,
            usuario=usuario,
        )
        db.session.add(mov)
        db.session.commit()
        return mov

    @staticmethod
    def historial(product_id=None, fecha_desde=None, fecha_hasta=None):
        query = StockMovement.query
        if product_id:
            query = query.filter(StockMovement.product_id == product_id)
        if fecha_desde:
            query = query.filter(StockMovement.created_at >= fecha_desde)
        if fecha_hasta:
            query = query.filter(StockMovement.created_at <= fecha_hasta)
        return query.order_by(StockMovement.created_at.desc()).all()

    @staticmethod
    def criticos():
        return Product.query.filter(
            Product.status == "active",
            db.or_(
                Product.quantity <= Product.min_stock,
                Product.critico_stock == True
            )
        ).all()

    