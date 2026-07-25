from flask import request, current_app
from flask.views import MethodView
from flask_smorest import Blueprint, abort
import jwt

from extensions import db
from models import Game
from schemas import GameSchema, ProductSchema, StockMovementSchema, StockEntradaSchema, StockSalidaSchema, StockAjusteSchema
from services.product_service import ProductService
from services.stock_service import StockService
from decorators import require_permission

from metrics import stock_movements_total, products_total, critical_products
from models import Product, StockMovement


blp_games = Blueprint(
    "games", "games", url_prefix="/api/games", description="Video games"
)

blp_products = Blueprint(
    "products", "products", url_prefix="/api/products", description="Products"
)

blp_stocks = Blueprint(
    "stock", "stock", url_prefix="/api/stocks", description="Stocks"
)

blp_reports = Blueprint(
    "report", "report", url_prefix="/api/reports", description="Report"
)

blp_audit = Blueprint("audit", "audit", url_prefix="/api/audit")
blp_users = Blueprint("users", "users", url_prefix="/api/users")



def _get_current_user():
    auth = request.headers.get('Authorization', '')
    token = auth.replace('Bearer ', '')
    if not token:
        return None
    try:
        payload = jwt.decode(
            token,
            current_app.config['SECRET_KEY'],
            algorithms=['HS256']
        )
        return payload.get('email') or payload.get('sub')
    except Exception:
        return None

@blp_products.route("/", strict_slashes=False)
class ProductList(MethodView):
    @require_permission('product:view')
    @blp_products.response(200, ProductSchema(many=True))
    def get(self):
        page = request.args.get("page", 1, type=int)
        per_page = request.args.get("per_page", 10, type=int)
        search = request.args.get("search")
        category = request.args.get("category")
        status = request.args.get("status")

        products = ProductService.get_all(
            page=page,
            per_page=per_page,
            search=search,
            category=category,
            status=status
        )

        products_total.set(Product.query.count())

        return products.items

    @require_permission('product:manage')
    @blp_products.arguments(ProductSchema)
    @blp_products.response(201, ProductSchema)
    def post(self, data):
        try:
            return ProductService.create(data)
        except ValueError as error:
            abort(400, message=str(error))


@blp_products.route("/<int:product_id>")
class ProductById(MethodView):
    @require_permission('product:view')
    @blp_products.response(200, ProductSchema)
    def get(self, product_id):
        return ProductService.get_by_id(product_id)

    @require_permission('product:manage')
    @blp_products.arguments(ProductSchema(partial=True))
    @blp_products.response(200, ProductSchema)
    def put(self, data, product_id):
        try:
            return ProductService.update(product_id, data)
        except ValueError as error:
            abort(400, message=str(error))

    @require_permission('product:manage')
    @blp_products.response(204)
    def delete(self, product_id):
        ProductService.delete(product_id)


@blp_games.route("/")
class GameList(MethodView):
    @require_permission('game:view')
    @blp_games.response(200, GameSchema(many=True))
    def get(self):
        return Game.query.all()

    @require_permission('game:manage')
    @blp_games.arguments(GameSchema)
    @blp_games.response(201, GameSchema)
    def post(self, data):
        game = Game(**data)
        db.session.add(game)
        db.session.commit()
        return game


@blp_games.route("/<int:game_id>")
class GameById(MethodView):
    @require_permission('game:view')
    @blp_games.response(200, GameSchema)
    def get(self, game_id):
        return Game.query.get_or_404(game_id)

    @require_permission('game:manage')
    @blp_games.arguments(GameSchema(partial=True))
    @blp_games.response(200, GameSchema)
    def put(self, data, game_id):
        game = Game.query.get_or_404(game_id)
        for key, value in data.items():
            setattr(game, key, value)
        db.session.commit()
        return game

    @require_permission('game:manage')
    @blp_games.response(204)
    def delete(self, game_id):
        game = Game.query.get_or_404(game_id)
        db.session.delete(game)
        db.session.commit()

    
@blp_stocks.route("/entrada")
class StockEntrada(MethodView):
    @require_permission('stock:manage')
    @blp_stocks.arguments(StockEntradaSchema)
    @blp_stocks.response(201, StockMovementSchema)
    def post(self, data):
        usuario = _get_current_user()
        try:
            stock_movements_total.labels(type="entrada").inc()  
            return StockService.entrada_stock(**data, usuario=usuario)
        except ValueError as e:
            abort(400, message=str(e))

@blp_stocks.route("/salida")
class StockSalida(MethodView):
    @require_permission('stock:manage')
    @blp_stocks.arguments(StockSalidaSchema)
    @blp_stocks.response(201, StockMovementSchema)
    def post(self, data):
        usuario = _get_current_user()
        try:
            stock_movements_total.labels(type="salida").inc()
            return StockService.salida_stock(**data, usuario=usuario)
        except ValueError as e:
            abort(400, message=str(e))

@blp_stocks.route("/ajuste")
class StockAjuste(MethodView):
    @require_permission('stock:manage')
    @blp_stocks.arguments(StockAjusteSchema)
    @blp_stocks.response(201, StockMovementSchema)
    def post(self, data):
        usuario = _get_current_user()
        try:
            stock_movements_total.labels(type="ajuste").inc() 
            return StockService.ajuste_stock(**data, usuario=usuario)
        except ValueError as e:
            abort(400, message=str(e))

@blp_stocks.route("/historial")
class StockHistorial(MethodView):
    @require_permission('stock:view')
    @blp_stocks.response(200, StockMovementSchema(many=True))
    def get(self):
        product_id = request.args.get("product_id", type=int)
        fecha_desde = request.args.get("fecha_desde")
        fecha_hasta = request.args.get("fecha_hasta")
        return StockService.historial(product_id, fecha_desde, fecha_hasta)

# NOTA: CAMBIA RESULTADO DE ESTA PRUEBA 
@blp_stocks.route("/criticos")
class StockCriticos(MethodView):
    @require_permission('stock:view')
    @blp_stocks.response(200, ProductSchema(many=True))
    def get(self):
        critical = StockService.criticos()
        critical_products.set(len(critical)) 
        return critical


@blp_reports.route("/")
class ReportList(MethodView):
    @require_permission('report:view')
    @blp_reports.response(200)
    def get(self):
        return {"message": "Reports endpoint", "reports": []}


@blp_audit.route("/")
class AuditList(MethodView):
    @require_permission('audit:view')
    @blp_audit.response(200)
    def get(self):
        from models import AuditLog
        logs = AuditLog.query.order_by(AuditLog.created_at.desc()).limit(50).all()
        return [
            {
                "id": log.id,
                "table_name": log.table_name,
                "record_id": log.record_id,
                "action": log.action,
                "changed_by": log.changed_by,
                "created_at": log.created_at.isoformat(),
            }
            for log in logs
        ]


@blp_users.route("/")
class UserList(MethodView):
    @require_permission('user:manage')
    @blp_users.response(200)
    def get(self):
        from models import User
        users = User.query.all()
        return [
            {
                "id": u.id,
                "email": u.email,
                "name": u.name,
                "keycloak_sub": u.keycloak_sub,
            }
            for u in users
        ]


def register_blueprints(api):
    api.register_blueprint(blp_games)
    api.register_blueprint(blp_products)
    api.register_blueprint(blp_stocks)
    api.register_blueprint(blp_reports)
    api.register_blueprint(blp_audit)
    api.register_blueprint(blp_users)
    # api.register_blueprint(blp_consoles)
    # api.register_blueprint(blp_controllers)