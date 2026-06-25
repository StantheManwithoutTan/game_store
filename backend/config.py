import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.environ.get('FLASK_SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{os.environ.get('POSTGRES_USER', 'postgres')}:"
        f"{os.environ.get('POSTGRES_PASSWORD', 'postgres')}@"
        f"{os.environ.get('DATABASE_HOST', 'db')}:"
        f"{os.environ.get('DATABASE_PORT', '5432')}/"
        f"{os.environ.get('POSTGRES_DB', 'appdb')}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    #OpenAPI / UI de Swagger mcJagger
    API_TITLE = "Game Store API"
    API_VERSION = "v1"
    OPENAPI_VERSION = "3.0.3"
    OPENAPI_URL_PREFIX = "/api"
    OPENAPI_SWAGGER_UI_PATH = "/docs"
    OPENAPI_SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"
    