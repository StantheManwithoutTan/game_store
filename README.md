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

docker inspect --format='{{json .State.Health}}' devcontainer-db-1
    - Para revisar los healthchecks de la base de datos
        - "Status":"healthy" - significa que Docker ha declarado que el contenedor de la base de datos es saludable
        - "FailingStreak":0 - No se ha producido ningún fallo consecutivo; todas las comprobaciones se están realizando correctamente.
        - "ExitCode":0 - Cada entrada del registro muestra un código de salida de 0, que es el código universal de éxito.
        - "Output":"... accepting connections" - El comando interno pg_isready se comunica correctamente con el motor de la base de datos a través de sockets Unix locales. (/var/run/postgresql:5432).

        - PROXIMO PASO*** agrega una herramienta de migracion de base de datos para correr schematics para reemplazar esta parte del README.md

docker compose down
    - baja todos los contenedores







Tipos de Productos en tienda preliminar:
- Game
- Console
- Controller