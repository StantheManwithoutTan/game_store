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



Para crear base de datos basado en contenido de backend (models.py, extensions.py, schemas.py)


# 1. Inicializar el repositorio de migraciones (crea carpeta migrations/)
docker compose -f docker-compose.yml exec backend flask db init

# 2. Generar script de migración automática basado en models.py
docker compose -f docker-compose.yml exec backend flask db migrate -m "Initial migration"

# 3. Aplicar la migración (crea las tablas en PostgreSQL)
docker compose -f docker-compose.yml exec backend flask db upgrade




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











Tipos de Productos en tienda preliminar:
- Game
- Console
- Controller