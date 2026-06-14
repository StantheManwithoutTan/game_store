from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_smorest import Api
from dotenv import load_dotenv

db = SQLAlchemy()
migrate = Migrate()
api = Api()