from flask.views import MethodView
from flask_smorest import Blueprint
from extensions import db
from models import Game
from schemas import GameSchema

blp_games = Blueprint(
    "games", "games", url_prefix="/api/games", description="Video games"
)

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
    # api.register_blueprint(blp_consoles)
    # api.register_blueprint(blp_controllers)
    # api.register_blueprint(blp_users)