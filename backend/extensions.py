from apispec.ext.marshmallow import MarshmallowPlugin
from apispec.ext.marshmallow.common import resolve_schema_cls
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_smorest import Api
from flask_sqlalchemy import SQLAlchemy


def schema_name_resolver(schema):
    schema_class = resolve_schema_cls(schema)

    if isinstance(schema_class, list):
        schema_class = schema_class[0]

    name = schema_class.__name__

    if name.endswith("Schema"):
        name = name[:-6]

    if getattr(schema, "partial", False):
        name += "Update"

    if getattr(schema, "many", False):
        name += "List"

    return name


db = SQLAlchemy()
migrate = Migrate()
api = Api()
limiter = Limiter(key_func=get_remote_address)

marshmallow_plugin = MarshmallowPlugin(
    schema_name_resolver=schema_name_resolver
)