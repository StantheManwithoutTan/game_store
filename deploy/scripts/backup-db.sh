#!/usr/bin/env bash
# Uso: bash scripts/backup-db.sh [prefijo]
# Guarda appdb y keycloak en backups/ y aplica retención.
set -Eeuo pipefail
umask 077

PREFIX="${1:-manual}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
REMOTE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REMOTE_DIR"

log() { printf '[backup] %s\n' "$*"; }
die() { printf '[backup] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$PREFIX" =~ ^[A-Za-z0-9._-]+$ ]] || die "Prefijo inválido: $PREFIX"
[[ "$RETENTION_DAYS" =~ ^[0-9]+$ ]] || die "BACKUP_RETENTION_DAYS inválido"
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
[[ -n "$POSTGRES_USER" && -n "$POSTGRES_DB" ]] || die "Faltan POSTGRES_USER/POSTGRES_DB"
[[ "$POSTGRES_DB" =~ ^[A-Za-z0-9_-]+$ ]] || die "POSTGRES_DB inválido"

cid="$(docker compose ps -q db 2>/dev/null || true)"
[[ -n "$cid" ]] || die "El contenedor db no está creado"
status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid")"
[[ "$status" == "healthy" ]] || die "PostgreSQL no está healthy ($status)"

BACKUP_DIR="$REMOTE_DIR/backups"
mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"

TMP_FILES=()
cleanup() { local f; for f in "${TMP_FILES[@]}"; do rm -f -- "$f"; done; }
trap cleanup EXIT

exec 9>"$REMOTE_DIR/.backup.lock"
flock -n 9 || die "Ya hay un backup en curso"

backup_db() {
  local db="$1" file tmp
  file="$BACKUP_DIR/${PREFIX}-${STAMP}-${db}.sql.gz"
  tmp="${file}.tmp"
  TMP_FILES+=("$tmp")

  log "Respaldando $db..."
  if ! docker compose exec -T db sh -c \
      'PGPASSWORD="$POSTGRES_PASSWORD" pg_dump -U "$POSTGRES_USER" -d "$1" --no-owner --no-acl' \
      sh "$db" | gzip -9 > "$tmp"; then
    die "Falló pg_dump de $db"
  fi

  gzip -t "$tmp" || die "El backup de $db está corrupto"
  chmod 600 "$tmp"
  mv -- "$tmp" "$file"
  log "OK: $file ($(du -h "$file" | cut -f1))"
}

backup_db "$POSTGRES_DB"
backup_db "keycloak"

find "$BACKUP_DIR" -type f -name '*.sql.gz' -mtime +"$RETENTION_DAYS" -delete
log "Backups completados. Retención: $RETENTION_DAYS días."