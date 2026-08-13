# Backend Architecture — game-store

## Índice

1. [config.py — Configuración central](#1-configpy--configuración-central)
2. [extensions.py — Inicialización de librerías](#2-extensionspy--inicialización-de-librerías)
3. [app.py — Punto de entrada + autenticación](#3-apppy--punto-de-entrada--autenticación)
4. [decorators.py — Control de acceso por permisos](#4-decoratorspy--control-de-acceso-por-permisos)
5. [routes.py — Endpoints de la API](#5-routespy--endpoints-de-la-api)
6. [schemas.py — Validación y serialización](#6-schemaspy--validación-y-serialización)
7. [metrics.py — Métricas de Prometheus](#7-metricspy--métricas-de-prometheus)
8. [telemetry.py — OpenTelemetry + Logging estructurado](#8-telemetrypy--opentelemetry--logging-estructurado)
9. [Diagrama visual de arquitectura](#9-diagrama-visual-de-arquitectura)
10. [Tabla de relaciones entre archivos](#10-tabla-de-relaciones-entre-archivos)
11. [Análisis de app.py — qué se puede eliminar](#11-análisis-de-apppy--qué-se-puede-eliminar)

---

## 1. `config.py` — Configuración central

```python
class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY') or os.environ.get('FLASK_SECRET_KEY')
    SQLALCHEMY_DATABASE_URI = f"postgresql://{user}:{pass}@{host}:{port}/{db}"
    RATELIMIT_DEFAULT = '10000/hour'
    ...
```

**Propósito:** Define todas las constantes de configuración de la aplicación.

**Qué contiene:**

| Variable | Propósito |
|----------|-----------|
| `SECRET_KEY` | Clave para firmar/verificar JWT. Lee de `SECRET_KEY` o `FLASK_SECRET_KEY` del entorno |
| `SQLALCHEMY_DATABASE_URI` | URL de conexión a PostgreSQL, construida desde variables de entorno |
| `API_TITLE`, `OPENAPI_VERSION` | Configuración de la documentación Swagger/OpenAPI |
| `RATELIMIT_DEFAULT` | Límite global de rate limiting: 10000 requests/hora |
| `FRONTEND_URL` | URL del frontend Vue (para CORS) |

**Por qué es importante:** Centraliza TODA la configuración en un solo lugar. Si necesitas cambiar la BD, secret key, o límites, solo tocas este archivo.

---

## 2. `extensions.py` — Inicialización de librerías

```python
db = SQLAlchemy()
migrate = Migrate()
api = Api()
limiter = Limiter(key_func=get_remote_address)
```

**Propósito:** Crea las instancias de las librerías de Flask **antes** de que la app exista. Esto evita importaciones circulares.

**Qué contiene:**

| Instancia | Librería | Función |
|-----------|----------|---------|
| `db` | Flask-SQLAlchemy | ORM para conectar y operar PostgreSQL |
| `migrate` | Flask-Migrate | Migraciones de esquema de BD (Alembic) |
| `api` | Flask-Smorest | API REST con documentación OpenAPI automática |
| `limiter` | Flask-Limiter | Rate limiting por IP para prevenir abuso |

**Por qué es importante:** Sin este patrón, los modelos y rutas no podrían importar `db` sin causar circular imports.

---

## 3. `app.py` — Punto de entrada + autenticación

**Propósito:** Crea la aplicación Flask, configura extensiones, y define rutas de autenticación.

**Secciones clave:**

| Sección | Líneas | Qué hace |
|---------|--------|----------|
| `create_app()` | 27-86 | Fábrica de aplicación: configura CORS, BD, migraciones, API, telemetría, Prometheus, cabeceras de seguridad |
| `keycloak_openid` | 90-95 | Cliente de Keycloak para autenticación SSO |
| `extract_roles()` | 100-114 | Extrae roles de Keycloak desde `realm_access` y `resource_access` |
| `GET /auth/openid_connect` | 131-188 | Login con redirección a Keycloak (SSO desde HTML) |
| `POST /auth/login` | 191-239 | Login API (desde SPA Vue). Recibe `code` de Keycloak y devuelve `session_token` |
| `POST /auth/logout` | 242-270 | Cierra sesión en Keycloak y limpia la sesión |
| `POST /auth/verify` | 275-287 | Verifica si un token JWT es válido |
| `POST /auth/refresh` | 289-321 | Renueva el token usando refresh_token de Keycloak |

**Flujo de autenticación:**

```
Usuario → Frontend (Vue:5173/login) → click "Iniciar sesión"
→ Redirige a Keycloak (directo desde el browser)
→ Keycloak redirige a Vue:5173/login/callback?code=xxx
→ LoginCallback.vue llama POST /auth/login { code }
→ Backend canjea code por tokens de Keycloak
→ Backend genera session_token (JWT propio) → lo devuelve en JSON
→ Frontend guarda session_token en localStorage
→ Cada request API incluye session_token en header Authorization
```

---

## 4. `decorators.py` — Control de acceso por permisos

```python
def require_permission(*scopes):
    def decorator(f):
        def wrapper(*args, **kwargs):
            # 1. Verifica si está en modo test sin auth
            # 2. Extrae token del header Authorization o session
            # 3. Decodifica JWT con SECRET_KEY
            # 4. Verifica que los scopes del usuario contengan al menos uno requerido
            # 5. Si no: 401 (sin token) o 403 (sin permiso)
```

**Propósito:** Decorador que protege rutas verificando permisos.

**Uso en rutas:**

```python
@require_permission('product:view')    # GET /api/products
@require_permission('product:manage')   # POST/PUT/DELETE /api/products
@require_permission('stock:manage')     # POST /api/stocks/entrada
```

**Respuestas posibles:**

| Código | Mensaje | Causa |
|--------|---------|-------|
| 401 | `"Missing token"` | No hay `Authorization` header ni token en sesión |
| 401 | `"Token expired"` | JWT expirado |
| 401 | `"Invalid token"` | Firma inválida o token corrupto |
| 403 | `"Forbidden"` | Token válido pero no tiene el scope requerido |

---

## 5. `routes.py` — Endpoints de la API

**Propósito:** Define todos los endpoints REST organizados por blueprints.

**Blueprints registrados:**

| Blueprint | Prefijo | Permisos | Endpoints |
|-----------|---------|----------|-----------|
| `blp_products` | `/api/products` | `product:view`, `product:manage` | GET lista, GET por ID, POST crear, PUT actualizar, DELETE |
| `blp_games` | `/api/games` | `game:view`, `game:manage` | CRUD completo |
| `blp_stocks` | `/api/stocks` | `stock:view`, `stock:manage` | POST entrada/salida/ajuste, GET historial, GET críticos |
| `blp_reports` | `/api/reports` | `report:view` | GET reportes |
| `blp_audit` | `/api/audit` | `audit:view` | GET últimos 50 logs de auditoría |
| `blp_users` | `/api/users` | `user:manage` | GET lista de usuarios |

**Patrón de cada endpoint:**

1. Decorador `@require_permission('scope')` — verifica autenticación
2. Decorador `@blp_xxx.response(200, Schema)` — documenta respuesta OpenAPI
3. Decorador `@blp_xxx.arguments(Schema)` — valida body (para POST/PUT)
4. Lógica de negocio delegada a `ProductService` o `StockService`

**Métricas integradas:**

- `products_total.set()` — cada GET /api/products actualiza el gauge
- `stock_movements_total.labels(type="entrada").inc()` — cada movimiento incrementa el counter
- `critical_products.set()` — cada GET /api/stocks/criticos actualiza el gauge

---

## 6. `schemas.py` — Validación y serialización

```python
class ProductSchema(Schema):
    id = fields.Int(dump_only=True)        # solo salida
    name = fields.Str(required=True)       # requerido en entrada
    price = fields.Decimal(as_string=True) # decimal como string
    status = fields.Str(load_default="active")  # valor por defecto
```

**Propósito:** Usando Marshmallow, define la estructura de datos para:
1. **Validar** datos de entrada (POST/PUT)
2. **Serializar** datos de salida (JSON)
3. **Generar** documentación OpenAPI automáticamente

**Schemas principales:**

| Schema | Campos clave | Uso |
|--------|-------------|-----|
| `ProductSchema` | name, sku, price, quantity, status | CRUD de productos |
| `StockMovementSchema` | product_id, type_movement, amount, stock_before, stock_after | Historial de movimientos |
| `StockEntradaSchema` | product_id, amount (min=1), motive | Body de POST entrada |
| `StockSalidaSchema` | product_id, amount (min=1), motive | Body de POST salida |
| `StockAjusteSchema` | product_id, stock_after (min=0), motive | Body de POST ajuste |
| `GameSchema` | title, genre, price, console_id | CRUD de videojuegos |
| `UserSchema` | email, name | Usuarios del sistema |

**Campos especiales:**

- `dump_only=True` — solo se incluye en respuestas, no en entrada
- `load_default=0` — si no se envía, usa 0 como valor por defecto
- `allow_none=True` — puede ser `null`
- `as_string=True` — Decimal se serializa como string (evita errores de precisión JSON)

---

## 7. `metrics.py` — Métricas de Prometheus

```python
# Negocio
products_total = Gauge("game_store_products_total", "Total de productos activos")
stock_movements_total = Counter("game_store_stock_movements_total", ..., ["type"])
critical_products = Gauge("game_store_critical_products", "Productos con stock crítico")

# Seguridad
login_failures = Counter("game_store_login_failures_total", "Fallos de login")
token_invalid = Counter("game_store_token_invalid_total", "Tokens inválidos")
forbidden_access = Counter("game_store_forbidden_total", "Accesos 403")
```

**Propósito:** Define métricas personalizadas que Prometheus scrapea del endpoint `/metrics`.

**Tres categorías:**

| Categoría | Métricas | Dónde se incrementan |
|-----------|----------|---------------------|
| **Negocio** | `game_store_products_total`, `game_store_stock_movements_total{type}`, `game_store_critical_products` | En `routes.py` al hacer GET /products, POST /stocks/*, GET /stocks/criticos |
| **Seguridad** | `game_store_login_failures_total` | En `app.py` cuando falla POST /auth/login |
| | `game_store_token_invalid_total` | En `app.py` cuando falla POST /auth/verify |
| | `game_store_forbidden_total` | En `decorators.py` cuando hay 403 |

**Tipo de métricas:**

| Tipo | Comportamiento | Útil para |
|------|---------------|-----------|
| `Gauge` | Valor que sube y baja | stock actual, productos activos |
| `Counter` | Solo incrementa | número de errores, movimientos acumulados |
| `Histogram` | Distribución de valores | (no usado aquí, pero disponible) |

---

## 8. `telemetry.py` — OpenTelemetry + Logging estructurado

```python
def setup_telemetry(app):
    # 1. Crea recurso con nombre del servicio
    # 2. Configura exporter OTLP gRPC → alloy:4317
    # 3. Instrumenta Flask y SQLAlchemy automáticamente

def setup_logging(app):
    # 1. Logger JSON estructurado con trace_id, span_id
    # 2. Log de cada request con: endpoint, method, user, correlation_id
```

**Propósito:**

1. **Traces distribuidos** — cada request genera un trace que viaja Flask → Alloy → Tempo (Grafana)
2. **Logs JSON** — cada request se loguea con metadatos en formato JSON → Loki

**Flujo de datos:**

```
Request → Flask (trace) → OTLP gRPC → Alloy (puerto 4317) → Tempo (storage)
Request → log JSON → stdout del contenedor → Docker socket → Alloy → Loki
```

**Campos incluidos en cada log:**

| Campo | Origen | Ejemplo |
|-------|--------|---------|
| `trace_id` | Span de OpenTelemetry | `"0x...32 hex chars"` |
| `span_id` | Span de OpenTelemetry | `"0x...16 hex chars"` |
| `correlation_id` | Header `X-Correlation-ID` | `"req-abc123"` |
| `user` | Token JWT (email/sub) | `"admin@test.com"` |
| `endpoint` | URL del request | `"/api/products"` |
| `method` | HTTP method | `"GET"` |

---

## 9. Diagrama visual de arquitectura

```
                Config(app.py → config.py)
                       │
        ┌──────────────┼──────────────┐
        │              │              │
   extensions.py   telemetry.py   metrics.py
   (db, api,       (traces +      (Prometheus
    limiter)        logs JSON)     counters)
        │              │              │
        └──────────────┼──────────────┘
                       │
                  routes.py
                       │
              ┌────────┴────────┐
              │                 │
        decorators.py      schemas.py
        (JWT auth +        (validación
         permisos)          OpenAPI)
```

---

## 10. Tabla de relaciones entre archivos

| Archivo | Importado por | Importa desde |
|---------|--------------|---------------|
| `config.py` | `app.py` | `os` |
| `extensions.py` | `app.py`, `routes.py` | `flask_sqlalchemy`, `flask_smorest`, `flask_limiter` |
| `app.py` | — (entry point) | `config`, `extensions`, `routes`, `telemetry`, `metrics`, `keycloak` |
| `decorators.py` | `routes.py` | `metrics` (forbidden counter) |
| `routes.py` | `app.py` | `extensions` (db), `decorators`, `schemas`, `services`, `metrics` |
| `schemas.py` | `routes.py` | `marshmallow` |
| `metrics.py` | `app.py`, `decorators.py`, `routes.py` | `prometheus_client` |
| `telemetry.py` | `app.py` | `opentelemetry`, `pythonjsonlogger` |

---

## 11. Análisis de `app.py` — qué se puede eliminar

El frontend Vue SPA (servido en `:5173`) maneja el login UI y la redirección a Keycloak directamente desde el browser. Como resultado, varias rutas en `app.py` ya no son utilizadas.

### Auth Flow Actual

| Paso | Quién lo maneja |
|------|----------------|
| Renderizar página de login | **Vue SPA** (LoginView.vue) |
| Redirigir a Keycloak | **Vue SPA** (redirect directo desde browser) |
| Recibir callback code | **Vue SPA** (LoginCallback.vue) |
| Intercambiar code por tokens | **Backend** (`POST /auth/login`) |
| Guardar session_token | **Vue SPA** (localStorage) |
| Logout | **Vue SPA** llama `POST /auth/logout` |
| Verify / Refresh | **No se usan** — ni SPA ni frontend los llaman |

### Lo que DEBE quedarse (~210 líneas)

| Líneas | Elemento | Motivo |
|--------|----------|--------|
| 1-86 | `create_app()` | Flask setup, CORS, DB, extensiones, telemetría, métricas, blueprints, cabeceras de seguridad |
| 90-114 | Keycloak client + `extract_roles()` | Necesario para `POST /auth/login` |
| 191-239 | `POST /auth/login` | Intercambia `code` de Keycloak por JWT |
| 242-270 | `POST /auth/logout` | Cierra sesión |

### Lo que se PUEDE ELIMINAR (~120 líneas)

| Líneas | Ruta | Razón |
|--------|------|-------|
| 118-123 | `GET /` (renderiza `home.html`) | Vue SPA redirige `/` → `/login` |
| 126-128 | `GET /login` (renderiza `login.html`) | Vue SPA tiene su propio LoginView |
| 131-188 | `GET /auth/openid_connect` | Flujo HTML redirect SSO; SPA redirige a Keycloak directo |
| 275-287 | `POST /auth/verify` | Nunca se llama (la validación JWT la hace `require_permission`) |
| 289-321 | `POST /auth/refresh` | Nunca se llama (SPA almacena refresh_token pero nunca refresca) |
| 324-326 | `GET /debug` | Solo desarrollo |
