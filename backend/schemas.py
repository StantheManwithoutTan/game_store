from marshmallow import Schema, fields, validate


# warning Multiple schemas, OpenAPI porque GameSchema y ProductSchema se usan en versiones normales, listas y parciales. APIspec permite resolverlo asignando nombres distintos a cada variante.
from apispec.ext.marshmallow import MarshmallowPlugin
from apispec.ext.marshmallow.common import resolve_schema_cls

def schema_name_resolver(schema):
    schema_class = resolve_schema_cls(schema)
    name = schema_class.__name__

    if name.endswith("Schema"):
        name = name[:-6]

    if getattr(schema, "partial", False):
        name += "Update"

    if getattr(schema, "many", False):
        name += "List"

    return name


marshmallow_plugin = MarshmallowPlugin(
    schema_name_resolver=schema_name_resolver
)


# Schemas para los modelos de la base de datos
# Utilizadas para validar validar entrada, serializar salida y generar OpenAPI automáticamente.


class ConsoleSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    manufacturer = fields.Str(required=True)
    release_year = fields.Int(allow_none=True)
    price = fields.Decimal(as_string=True, required=True)
    stock = fields.Int(load_default=0)


class GameSchema(Schema):
    id = fields.Int(dump_only=True)
    title = fields.Str(required=True)
    genre = fields.Str(allow_none=True)
    release_date = fields.Date(allow_none=True)
    price = fields.Decimal(as_string=True, required=True)
    stock = fields.Int(load_default=0)
    console_id = fields.Int(required=True)


class ControllerSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True)
    wireless = fields.Bool(load_default=True)
    price = fields.Decimal(required=True)
    stock = fields.Int(load_default=0)
    console_id = fields.Int(required=True)


class AuditLogSchema(Schema):
    id = fields.Int(dump_only=True)
    table_name = fields.Str()
    record_id = fields.Int()
    action = fields.Str()
    old_values = fields.Raw(allow_none=True)
    new_values = fields.Raw(allow_none=True)
    changed_by = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)

class UserSchema(Schema):
    id = fields.Int(dump_only=True)
    keycloak_sub = fields.Str(dump_only=True)
    email = fields.Email(required=True)
    name = fields.Str(allow_none=True)


class ProductSchema(Schema):
    id = fields.Int(dump_only=True)
    name = fields.Str(required=True, validate=validate.Length(min=1, max=120))
    sku = fields.Str(required=True, validate=validate.Length(min=1, max=80))
    description = fields.Str(allow_none=True)
    category = fields.Str(allow_none=True, validate=validate.Length(max=80))
    price = fields.Decimal(as_string=True, required=True)
    quantity = fields.Int(load_default=0)
    min_stock = fields.Int(load_default=0)
    status = fields.Str(load_default="active")
    critico_stock = fields.Bool(dump_default=False)


class StockMovementSchema(Schema):
    id = fields.Int(dump_only=True)
    product_id = fields.Int(required=True)
    usuario = fields.Str(dump_only=True)
    type_movement = fields.Str(dump_only=True)
    amount = fields.Int(required=True)
    stock_before = fields.Int(dump_only=True)
    stock_after = fields.Int(dump_only=True)
    motive = fields.Str(allow_none=True)
    created_at = fields.DateTime(dump_only=True)

class StockEntradaSchema(Schema):
    product_id = fields.Int(required=True)
    amount = fields.Int(required=True, validate=validate.Range(min=1))
    motive = fields.Str(allow_none=True)

class StockSalidaSchema(Schema):
    product_id = fields.Int(required=True)
    amount = fields.Int(required=True, validate=validate.Range(min=1))
    motive = fields.Str(allow_none=True)

class StockAjusteSchema(Schema):
    product_id = fields.Int(required=True)
    stock_after = fields.Int(required=True, validate=validate.Range(min=0))
    motive = fields.Str(allow_none=True)