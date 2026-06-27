from models import Product, StockMovement
from extensions import db

class StockService:
    @staticmethod
    def entrada_stock(product_id, cantidad, motivo = None):
        product = Product.query.get_or_404(product_id)
        stock_antes = Product.quantity
        product.quantity += cantidad

        mov = StockMovement(
            product_id=product_id, 
            tipo="entrada",
            cantidad=cantidad, 
            stock_antes=stock_antes,
            stock_despues=product.quantity
            motivo=motivo
        )
        db.session.add(mov)
        db.session.commit()
        return mov

    @staticmethod
    def salida_stock(product_id, cantidad, motivo = None):
        product = Product.query.get_or_404(product_id)
        if product.quantity < cantidad:
            raise ValueError("Cantidad inusuable")
        stock_antes = product.quantity
        product.quantity -= cantidad

        mov = StockMovement(
            product_id=product_id, 
            tipo="salida",
            cantidad=cantidad, 
            stock_antes=stock_antes,
            stock_despues=product.quantity
            motivo=motivo
        )
        db.session.add(mov)
        db.session.commit()
        return mov

    # Utilizados para stock robado, perdido o para arreglar errores 
    @staticmethod
    def ajuste_stock(product_id, cantidad, motive=None)
        product = Product.query.get_or_404(product_id)
        if cantidad < 0:
            raise ValueError("Valores negativos no soportados")
        stock_antes = product.quantity
        diferencia = cantidad - stock_antes
        product.quantity = cantidad

        mov = StockMovement(
            product_id=product_id, 
            tipo="ajuste",
            cantidad=cantidad, 
            stock_antes=stock_antes,
            stock_despues=product.quantity
            motivo=motivo
        )
        db.session.add(mov)
        db.session.commit()

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
            Product.quantity <= Product.min_stock,
            Product.status == "active"
        ).all()

    