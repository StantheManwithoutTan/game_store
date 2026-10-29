-- Crea la base de Keycloak sin asumir el nombre del superusuario.
-- El entrypoint corre esto con ON_ERROR_STOP=1: cualquier error aborta el arranque.
SELECT format('CREATE DATABASE keycloak OWNER %I', current_user)
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'keycloak')\gexec