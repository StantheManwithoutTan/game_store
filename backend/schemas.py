from marshmallow import Schema, fields, validate


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
    price = fields.Decimal(as_string=True, required=True)
    stock = fields.Int(load_default=0)
    console_id = fields.Int(required=True)


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

