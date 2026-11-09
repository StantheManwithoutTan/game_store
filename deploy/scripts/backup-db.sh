#!/usr/bin/env bash
# Uso: bash scripts/backup-db.sh [prefijo]
# Guarda appdb y keycloak en backups/ y aplica retención.
set -Eeuo pipefail
# Evita que otros usuarios puedan leer los archivos temporales y los backups.
umask 077

# Permite etiquetar el backup; si no se indica, se usa "manual".
PREFIX="${1:-manual}"
# Conserva los backups durante 14 días, salvo que se configure otro valor.
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
# Obtiene la carpeta deploy y trabaja desde ella para usar su .env y backups/.
REMOTE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REMOTE_DIR"

# Funciones pequeñas para informar avances o terminar mostrando un error.
log() { printf '[backup] %s\n' "$*"; }
die() { printf '[backup] ERROR: %s\n' "$*" >&2; exit 1; }

# Valida los parámetros y confirma que existe la configuración local.
[[ "$PREFIX" =~ ^[A-Za-z0-9._-]+$ ]] || die "Prefijo inválido: $PREFIX"
[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || die "BACKUP_RETENTION_DAYS inválido"
[[ -f .env ]] || die "Falta .env"

# Verifica que estén disponibles todas las herramientas utilizadas.
for cmd in docker flock gzip; do
  command -v "$cmd" >/dev/null 2>&1 || die "Falta '$cmd'"
done

# Lee una variable KEY=VALUE de .env sin ejecutar el archivo como código Bash.
read_env() {
  local key="$1" value
  # Toma la última definición de la variable y conserva todo lo que sigue al "=".
  value="$(grep -E "^${key}=" .env | tail -n1 | cut -d= -f2- || true)"
  # Elimina retorno de carro de archivos creados en Windows y comillas externas.
  value="${value%$'\r'}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "$value"
}

POSTGRES_USER="$(read_env POSTGRES_USER)"
POSTGRES_DB="$(read_env POSTGRES_DB)"
# El dump necesita usuario y nombre de base válidos.
[[ -n "$POSTGRES_USER" && -n "$POSTGRES_DB" ]] || die "Faltan POSTGRES_USER/POSTGRES_DB"
[[ "$POSTGRES_DB" =~ ^[A-Za-z0-9_-]+$ ]] || die "POSTGRES_DB inválido"

# Obtiene el contenedor db y exige que PostgreSQL esté saludable.
cid="$(docker compose ps -q db 2>/dev/null || true)"
[[ -n "$cid" ]] || die "El contenedor db no está creado"
status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")"
[[ "$status" == "healthy" ]] || die "PostgreSQL no está healthy ($status)"

# Prepara el directorio privado y un nombre común para ambos backups.
BACKUP_DIR="$REMOTE_DIR/backups"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

# Los temporales se eliminan si el script termina con éxito o con error.
TMP_FILES=()
cleanup() { local f; for f in "${TMP_FILES[@]}"; do rm -f -- "$f"; done; }
trap cleanup EXIT

# El descriptor 9 y flock impiden ejecutar dos backups simultáneamente.
exec 9>"$REMOTE_DIR/.backup.lock"
flock -n 9 || die "Ya hay un backup en curso"

backup_db() {
  local db="$1" file tmp
  # Primero se escribe .tmp: así nunca se presenta un archivo incompleto como backup final.
  file="$BACKUP_DIR/${PREFIX}-${STAMP}-${db}.sql.gz"
  tmp="${file}.tmp"
  TMP_FILES+=("$tmp")

  log "Respaldando $db..."
  # Ejecuta pg_dump dentro de PostgreSQL, comprime la salida y la guarda localmente.
  if ! docker compose exec -T db sh -c \
      'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$1" --no-owner --no-acl' \
      sh "$db" | gzip -9 > "$tmp"; then
    die "Falló pg_dump de $db"
  fi

  # Comprueba la integridad gzip antes de publicar el archivo.
  gzip -t "$tmp" || die "El backup de $db está corrupto"
  chmod 600 "$tmp"
  mv -- "$tmp" "$file"
  log "OK: $file ($(du -h "$file" | cut -f1))"
}

# Respalda la aplicación y la base utilizada por Keycloak.
backup_db "$POSTGRES_DB"
backup_db "keycloak"

# Borra únicamente backups comprimidos que superan el periodo de retención.
find "$BACKUP_DIR" -type f -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
log "Backups completados. Retención: $RETENTION_DAYS días."