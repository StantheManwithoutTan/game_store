#!/usr/bin/env bash
# Uso: bash scripts/restore-db.sh <archivo.sql.gz> <appdb|keycloak> [--yes]
# Operación destructiva: borra la base indicada y restaura el dump.
set -Eeuo pipefail
umask 077

FILE="${1:-}"
DB="${2:-}"
CONFIRM="${3:-}"
REMOTE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REMOTE_DIR"

log() { printf '[restore] %s\n' "$*"; }
die() { printf '[restore] ERROR: %s\n' "$*" >&2; exit 1; }

[[ -n "$FILE" && -n "$DB" ]] \
  || die "Uso: $0 <archivo.sql.gz> <appdb|keycloak> [--yes]"
[[ -f "$FILE" ]] || die "No existe: $FILE"
[[ -z "$CONFIRM" || "$CONFIRM" == "--yes" ]] || die "Opción inválida: $CONFIRM"
[[ -f .env ]] || die "Falta .env"

for cmd in docker flock gzip; do
  command -v "$cmd" >/dev/null 2>&1 || die "Falta '$cmd'"
done

read_env() {
  local key="$1" value
  value="$(grep -E "^${key}=" .env | tail -n1 | cut -d= -f2- || true)"
  value="${value%$'\r'}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "$value"
}

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

gzip -t "$FILE" || die "El archivo no es un gzip válido"
[[ "$FILE" == *-"$DB".sql.gz ]] \
  || log "AVISO: el archivo no parece un backup de la base '$DB'"

if [[ "$CONFIRM" != "--yes" ]]; then
  printf 'Se va a BORRAR la base "%s" y restaurar:\n  %s\n' "$DB" "$FILE"
  read -r -p "Escribe '$DB' para confirmar: " answer || die "Cancelado"
  [[ "$answer" == "$DB" ]] || die "Cancelado"
fi

cid="$(docker compose ps -q db 2>/dev/null || true)"
[[ -n "$cid" ]] || die "El contenedor db no está creado"
status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")"
[[ "$status" == "healthy" ]] || die "PostgreSQL no está healthy ($status)"

exec 9>"$REMOTE_DIR/.restore.lock"
flock -n 9 || die "Ya hay un restore en curso"

if [[ "$DB" == "$POSTGRES_DB" ]]; then
  log "Deteniendo backend..."
  docker compose stop backend >/dev/null 2>&1 || true
else
  log "Deteniendo Keycloak..."
  docker compose stop keycloak >/dev/null 2>&1 || true
fi

log "Eliminando y recreando la base $DB..."
docker compose exec -T db sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d postgres -v ON_ERROR_STOP=1' <<SQL
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = '$DB' AND pid <> pg_backend_pid();
SQL

docker compose exec -T db sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" dropdb -U "$POSTGRES_USER" --if-exists --force "$1"' sh "$DB"
docker compose exec -T db sh -c \
  'PGPASSWORD="$POSTGRES_PASSWORD" createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" "$1"' sh "$DB"

log "Restaurando $FILE en $DB..."
if ! gunzip -c "$FILE" | docker compose exec -T db sh -c \
    'PGPASSWORD="$POSTGRES_PASSWORD" psql -U "$POSTGRES_USER" -d "$1" -v ON_ERROR_STOP=1 --quiet' sh "$DB"; then
  die "Falló el restore; '$DB' quedó incompleta. Los servicios afectados siguen detenidos."
fi

if [[ "$DB" == "$POSTGRES_DB" ]]; then
  log "Aplicando migraciones..."
  docker compose --profile tools run --rm --no-deps migrate \
    || die "Restore OK, pero fallaron las migraciones. Backend detenido."
  docker compose up -d backend frontend
else
  docker compose up -d keycloak
fi
docker compose restart caddy >/dev/null 2>&1 || true

log "Restore completado."
log "Verifica: https://$PUBLIC_HOST/health"
log "Keycloak:  https://$PUBLIC_HOST:8443/realms/$KEYCLOAK_REALM"
docker compose ps || true