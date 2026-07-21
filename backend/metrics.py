from prometheus_client import Counter, Gauge, Histogram
import functools

# Negocio
products_total = Gauge("game_store_products_total", "Total de productos activos")
stock_movements_total = Counter(
    "game_store_stock_movements_total", "Total de movimientos de stock",
    ["type"]
)
critical_products = Gauge("game_store_critical_products", "Productos con stock crítico")

# Seguridad
login_failures = Counter("game_store_login_failures_total", "Fallos de login")
token_invalid = Counter("game_store_token_invalid_total", "Tokens inválidos")
forbidden_access = Counter("game_store_forbidden_total", "Accesos 403")