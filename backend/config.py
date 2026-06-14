import os

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = (
        f"postgresql://{os.environ['POSTGRES_USER']}:"
        f"{os.environ['POSTGRES_PASSWORD']}@"
        f"{os.environ.get('DATABASE_HOST', 'db')}:"
        f"{os.environ.get('DATABASE_PORT', '5432')}/"
        f"{os.environ['POSTGRES_DB']}"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    #OpenAPI / UI de Swagger mcJagger
    API_TITLE = "Game Store API"
    API_VERSION = "v1"
    OPENAPI_VERSION = "3.0.3"
    OPENAPI_URL_PREFIX = "/api"
    OPENAPI_SWAGGER_UI_PATH = "/docs"
    OPENAPI_SWAGGER_UI_URL = "https://cdn.jsdelivr.net/npm/swagger-ui-dist/"
    