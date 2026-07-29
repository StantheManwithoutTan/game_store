from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_smorest import Api
from dotenv import load_dotenv

# aplica rate limiting al programa
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

db = SQLAlchemy()
migrate = Migrate()
api = Api()
limiter = Limiter(key_func=get_remote_address)