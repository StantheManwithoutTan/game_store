from flask import request
from flask.views import MethodView
from flask_smorest import Blueprint, abort

from extensions import db
from models import Game
from schemas import GameSchema, ProductSchema
from services.product_service import ProductService


blp_games = Blueprint(
    "games", "games", url_prefix="/api/games", description="Video games"
)

blp_products = Blueprint(
    "products", "products", url_prefix="/api/products", description="Products"
)


@blp_products.route("/")
class ProductList(MethodView):
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

        return products.items

    @blp_products.arguments(ProductSchema)
    @blp_products.response(201, ProductSchema)
    def post(self, data):
        try:
            return ProductService.create(data)
        except ValueError as error:
            abort(400, message=str(error))


@blp_products.route("/<int:product_id>")
class ProductById(MethodView):
    @blp_products.response(200, ProductSchema)
    def get(self, product_id):
        return ProductService.get_by_id(product_id)

    @blp_products.arguments(ProductSchema(partial=True))
    @blp_products.response(200, ProductSchema)
    def put(self, data, product_id):
        try:
            return ProductService.update(product_id, data)
        except ValueError as error:
            abort(400, message=str(error))

    @blp_products.response(204)
    def delete(self, product_id):
        ProductService.delete(product_id)


@blp_games.route("/")
class GameList(MethodView):
    @blp_games.response(200, GameSchema(many=True))
    def get(self):
        return Game.query.all()

    @blp_games.arguments(GameSchema)
    @blp_games.response(201, GameSchema)
    def post(self, data):
        game = Game(**data)
        db.session.add(game)
        db.session.commit()
        return game


@blp_games.route("/<int:game_id>")
class GameById(MethodView):
    @blp_games.response(200, GameSchema)
    def get(self, game_id):
        return Game.query.get_or_404(game_id)

    @blp_games.arguments(GameSchema(partial=True))
    @blp_games.response(200, GameSchema)
    def put(self, data, game_id):
        game = Game.query.get_or_404(game_id)
        for key, value in data.items():
            setattr(game, key, value)
        db.session.commit()
        return game

    @blp_games.response(204)
    def delete(self, game_id):
        game = Game.query.get_or_404(game_id)
        db.session.delete(game)
        db.session.commit()


def register_blueprints(api):
    api.register_blueprint(blp_games)
    api.register_blueprint(blp_products)
    # api.register_blueprint(blp_consoles)
    # api.register_blueprint(blp_controllers)
    # api.register_blueprint(blp_users)