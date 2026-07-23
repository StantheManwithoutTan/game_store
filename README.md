# game_store




Para correr proyecto inicial:


Para entrar ambiente venv:

Si no lo ha implementado:
- python -m venv .venv

Para entrar el ambiente venv:
- .venv\Scripts\Activate.ps1



cd backend
flask --app app run 


Revisando los contenedores de docker:


docker compose up -d 
    - sube todos los contenedores del backend, frontend, keycloak, base de datos de postgres, etc.
    - -d significa que corre en modo desacoplado, que los contenedores siguen corriendo fuera del terminal.

docker compose ps
    - revisar los estados de cada contenedor

docker compose build <nombre de contenedor> --no-cache
    - reconstruir un contenedor sin datos de la subida anterior, mas usado para backend donde los plugins del requirements.txt pueden cambiar.

docker inspect --format='{{json .State.Health}}' devcontainer-db-1
    - Para revisar los healthchecks de la base de datos
        - "Status":"healthy" - significa que Docker ha declarado que el contenedor de la base de datos es saludable
        - "FailingStreak":0 - No se ha producido ningún fallo consecutivo; todas las comprobaciones se están realizando correctamente.
        - "ExitCode":0 - Cada entrada del registro muestra un código de salida de 0, que es el código universal de éxito.
        - "Output":"... accepting connections" - El comando interno pg_isready se comunica correctamente con el motor de la base de datos a través de sockets Unix locales. (/var/run/postgresql:5432).

        - PROXIMO PASO*** agrega una herramienta de migracion de base de datos para correr schematics para reemplazar esta parte del README.md

docker compose down
    - baja todos los contenedores

-- Pruebas unitarias

Para ejecutar las pruebas unitarias:

Para crear base de datos basado en contenido de backend (models.py, extensions.py, schemas.py)


# 1. Inicializar el repositorio de migraciones (crea carpeta migrations/)
docker compose -f docker-compose.yml exec backend flask db init

# 2. Generar script de migración automática basado en models.py
docker compose -f docker-compose.yml exec backend flask db migrate -m "Initial migration"

# 3. Aplicar la migración (crea las tablas en PostgreSQL)
docker compose -f docker-compose.yml exec backend flask db upgrade




Para guardar y subir cambios de la base de datos (de models.py o schemas.py).

# 1. Entra la carpeta de devcontainers
cd .\.devcontainer\

# 2. Crear el commit dentro de flask db (wrapper de alembic):
docker compose exec backend flask db revision --autogenerate -m "add critico_stock"

# 3. Actualizar la base de datos:
docker compose exec backend flask db upgrade

# 4. Ver la historia de las migraciones de la base de datos:
docker compose exec backend flask db history














Keycloak:
Con el archivo realm-export.json ubicado en la carpeta keycloak, corre el contenedor normal como antes con docker compose up -d. Debe tomar la configuracion de ese archivo y recrearlo en el puerto 8080.

En el caso de que se tiene que recrear de nuevo bajo modificaciones y ajustes al archivo original, ejecuta:

docker compose -f .devcontainer/docker-compose.yml cp keycloak:/tmp/export/game-store-realm.json keycloak/realm-export.json


Probando controles de acceso y averiguacion de keycloak:

curl -s http://localhost:8080/realms/game-store/.well-known/openid-configuration
    - Pruebe que Keycloak responde











- Probar GET /api/products (requiere product:view)

curl.exe -s http://localhost:5000/api/products/ \ -H "Authorization: Bearer <session_token>"
(Esperado: 200 con lista de productos)

- Probar POST /api/products (requiere product:manage, prueba con admin y usuario)

1. $token = "<session-token>"

2. $body = @{ name = "Test Game 1"; sku = "GAME-001"; price = 39.99 } | ConvertTo-Json

3. Invoke-RestMethod -Uri http://localhost:5000/api/products/ -Method Post -Headers @{Authorization = "Bearer $token"} -ContentType "application/json" -Body $body
(Esperado: 201 si tiene product:manage, 403 si no)

- Probar sin token

curl.exe -s http://localhost:5000/api/products/
(Esperado: 401)

pytest backend/tests/test_product_service.py -v

Para ejecutar las pruebas con cobertura:

pytest backend/tests/test_product_service.py --cov=backend --cov-report=html

El reporte HTML se genera en:

backend/htmlcov/index.html

-- Pruebas de integración y API

Para ejecutar las pruebas de integración:

pytest backend/tests/test_product_integration.py -v

También se implementaron pruebas para los endpoints de la API relacionados con productos.

Para ejecutar las pruebas de API:

pytest backend/tests/test_product_api.py -v


Para ejecutar las pruebas unitarias de stock:
- pytest tests/test_stock_integration.py -v

Para ejecutar las pruebas de integración de stock:
- pytest tests/test_stock_service.py -v



Tipos de Productos en tienda preliminar:
- Game
- Console
- Controller




Como probar Jenkins:

curl -X POST -u usuario:token \
  -F "jenkinsfile=<Jenkinsfile" \
  "http://localhost:8080/pipeline-syntax/validate"


# Frontend (Vue 3)

El frontend del proyecto está desarrollado utilizando Vue 3 + Vite.

Para ejecutar el frontend localmente:

```bash
cd game_store_frontend
npm install
npm run dev
```

La aplicación estará disponible en:

```
http://localhost:5173
```

## Funcionalidades implementadas

* Login mediante Keycloak (OpenID Connect).
* Dashboard inicial.
* Vista de Productos.
* Vista de Stock.
* Navegación mediante Vue Router.
* Manejo de estado con Pinia.

---

# Keycloak

Realm utilizado:

```
game-store
```

Cliente utilizado:

```
game-store-client
```

Credenciales administrativas de desarrollo:

```
Usuario: admin
Contraseña: admin
```

Una vez autenticado, el usuario es redirigido automáticamente al Dashboard.

---

# Swagger

La documentación interactiva de la API se encuentra disponible en:

```
http://localhost:5000/api/docs
```

---

# Pruebas E2E con Playwright

Instalar Playwright:

```bash
npm install -D @playwright/test
npx playwright install
```

Ejecutar las pruebas:

```bash
npx playwright test
```

Prueba implementada actualmente:

* Verificación de carga de la página de Login.

Resultado esperado:

```
1 passed
```

---





# Probando alertas con AlertManager:

# Para probar alerta de high auth failure:
1..15 | ForEach-Object {
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:5000/auth/login" -Method Post -Body '{"code":"invalido"}' -ContentType "application/json" -UseBasicParsing
        Write-Host "Success Status: $($response.StatusCode)" -ForegroundColor Green
    } catch {
        # Catch and print the exact numerical status code
        $statusCode = $_.Exception.Response.StatusCode.value__
        Write-Host "Error Status Code: $statusCode" -ForegroundColor Yellow
    }
}




# Para probar todas las alertas: 
$body = '[
    {
        "labels": {
            "alertname": "TestAlert",
            "severity": "critical",
            "job": "flask"
        },
        "annotations": {
            "summary": "Simulando alerta directa sin Prometheus"
        }
    }
]'

Invoke-RestMethod -Uri "http://localhost:9093/api/v2/alerts" -Method Post -Body $body -ContentType "application/json"

















# Estado del Proyecto (Día 7)

## Completado

* Docker Compose configurado.
* PostgreSQL funcionando.
* Backend Flask funcionando.
* Frontend Vue funcionando.
* Integración con Keycloak.
* Login mediante OpenID Connect.
* Dashboard inicial.
* Gestión inicial de Productos.
* Gestión inicial de Stock.
* Configuración de Playwright.
* Primera prueba E2E ejecutada exitosamente.

## Próximos pasos

* Integrar el CRUD real de productos desde el frontend.
* Implementar gestión completa de stock.
* Ampliar cobertura E2E con Playwright.
* Incorporar protección basada en roles en la interfaz de usuario.
