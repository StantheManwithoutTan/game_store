#!/usr/bin/env bash
# Uso: bash scripts/restore-db.sh <archivo.sql.gz> <appdb|keycloak> [--yes]
# Operación destructiva: borra la base indicada y restaura el dump.
set -Eeuo pipefail
# Impide que usuarios distintos al operador lean dumps o archivos temporales.
umask 077

# Parámetros: archivo comprimido, base destino y confirmación opcional.
FILE="${1:-}"
DB="${2:-}"
CONFIRM="${3:-}"
# Trabaja desde la raíz remota para localizar .env y el Compose correcto.
REMOTE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REMOTE_DIR"

log() { printf '[restore] %s\n' "$*"; }
die() { printf '[restore] ERROR: %s\n' "$*" >&2; exit 1; }

[[ -n "$FILE" && -n "$DB" ]] \
  || die "Uso: $0 <archivo.sql.gz> <appdb|keycloak> [--yes]"
[[ -f "$FILE" ]] || die "No existe: $FILE"
[[ -z "$CONFIRM" || "$CONFIRM" == "--yes" ]] || die "Opción inválida: $CONFIRM"
[[ -f .env ]] || die "Falta .env"

# Comprueba que estén instaladas las herramientas necesarias.
for cmd in docker flock gzip; do
  command -v "$cmd" >/dev/null 2>&1 || die "Falta '$cmd'"
done

# Lee variables sencillas de .env sin ejecutar su contenido.
read_env() {
  local key="$1" value
  # Selecciona la última definición y elimina retorno de carro y comillas externas.
  value="$(grep -E "^${key}=" .env | tail -n1 | cut -d= -f2- || true)"
  value="${value%$'\r'}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "$value"
}

# Obtiene la configuración necesaria para conectar con PostgreSQL y mostrar URLs.
POSTGRES_USER="$(read_env POSTGRES_USER)"
POSTGRES_DB="$(read_env POSTGRES_DB)"
PUBLIC_HOST="$(read_env PUBLIC_HOST)"
KEYCLOAK_REALM="$(read_env KEYCLOAK_REALM)"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-game-store}"

[[ -n "$POSTGRES_USER" && -n "$POSTGRES_DB" && -n "$PUBLIC_HOST" ]] \
  || die "Faltan POSTGRES_USER/POSTGRES_DB/PUBLIC_HOST en .env"
[[ "$DB" == "$POSTGRES_DB" || "$DB" == "keycloak" ]] \
  || die "La base debe ser '$POSTGRES_DB' o 'keycloak'"
[[ "$DB" =~ ^[A-Za-z0-9_-]+$ ]] || die "Nombre de base inválido"

# Valida la compresión y avisa si el nombre del archivo no coincide con la base.
gzip -t "$FILE" || die "El archivo no es un gzip válido"
[[ "$FILE" == *-"$DB".sql.gz ]] \
  || log "AVISO: el archivo no parece un backup de la base '$DB'"

if [[ "$CONFIRM" != "--yes" ]]; then
  # Sin --yes se exige escribir el nombre exacto de la base antes de borrar.
  printf 'Se va a BORRAR la base "%s" y restaurar:\n  %s\n' "$DB" "$FILE"
  read -r -p "Escribe '$DB' para confirmar: " answer || die "Cancelado"
  [[ "$answer" == "$DB" ]] || die "Cancelado"
fi

# PostgreSQL debe estar iniciado y saludable antes de detener servicios.
cid="$(docker compose ps -q db 2>/dev/null || true)"
[[ -n "$cid" ]] || die "El contenedor db no está creado"
status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")"
[[ "$status" == "healthy" ]] || die "PostgreSQL no está healthy ($status)"

# Bloquea restauraciones simultáneas sobre el mismo entorno.
exec 9>"$REMOTE_DIR/.restore.lock"
flock -n 9 || die "Ya hay un restore en curso"

if [[ "$DB" == "$POSTGRES_DB" ]]; then
  # La API no debe acceder a la base mientras esta se reemplaza.
  log "Deteniendo backend..."
  docker compose stop backend >/dev/null 2>&1 || true
else
  # Keycloak se detiene cuando se restaura su base independiente.
  log "Deteniendo Keycloak..."
  docker compose stop keycloak >/dev/null 2>&1 || true
fi

log "Eliminando y recreando la base $DB..."
# Termina conexiones activas para que DROP DATABASE pueda ejecutarse.
docker compose exec -T db sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1' <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB' AND pid <> pg_backend_pid();
SQL

# Elimina la base y la crea vacía con el usuario de la aplicación como propietario.
docker compose exec -T db sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" dropdb -U "$POSTGRES_USER" --if-exists --force "$1"' sh "$DB"
docker compose exec -T db sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$1"' sh "$DB"

log "Restaurando $FILE en $DB..."
# Descomprime el dump y lo importa; ON_ERROR_STOP detiene el primer error SQL.
if ! gunzip -c "$FILE" | docker compose exec -T db sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 --quiet' sh "$DB"; then
  die "Falló el restore; '$DB' quedó incompleta. Los servicios afectados siguen detenidos."
fi

if [[ "$DB" == "$POSTGRES_DB" ]]; then
  # Tras restaurar la base de la aplicación, actualiza su esquema y la reactiva.
  log "Aplicando migraciones..."
  docker compose --profile tools run --rm --no-deps migrate \
    || die "Restore OK, pero fallaron las migraciones. Backend detenido."
  docker compose up -d backend frontend
else
  # Para Keycloak basta volver a iniciar el servicio correspondiente.
  docker compose up -d keycloak
fi
# Caddy se reinicia para que vuelva a detectar el estado de los servicios.
docker compose restart caddy >/dev/null 2>&1 || true

log "Restore completado."
log "Verifica: https://$PUBLIC_HOST/health"
log "Keycloak:  https://$PUBLIC_HOST:8443/realms/$KEYCLOAK_REALM"
docker compose ps || true
# Funciones para mostrar avances o terminar de forma explícita.
# Valida argumentos, archivo de backup, opción de confirmación y configuración.
# Solo se permite restaurar una de las dos bases administradas por la aplicación.