import schemathesis
from app import create_app
from config import Config
from test_permissions import make_token
from schemathesis.checks import not_a_server_error

class TestConfig(Config):
    TESTING = True
    TEST_AUTH = True
    SECRET_KEY = "schemathesis-test-secret"
    RATELIMIT_ENABLED = False  # avoid rate-limit noise during fuzzing too

# 1. Crear app
app = create_app(TestConfig)

# 2. Crear schema (antes de la función)
schema = schemathesis.from_wsgi("/api/openapi.json", app)

@schema.parametrize()
def test_api_schema(case):
    token = make_token('product:view', 'product:manage', 'stock:manage', 'stock:view')
    case.call_and_validate(
        headers={"Authorization": f"Bearer {token}"},
        checks=(not_a_server_error,)  # only fail on 5xx, not schema mismatches
    )