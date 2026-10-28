#!/usr/bin/env bash
# Uso: bash deploy/scripts/deploy.sh <host> <ruta-clave-ssh>
# Variables opcionales:
#   DEPLOY_USER=azureuser
#   DEPLOY_PORT=22
#   REMOTE_DIR=/opt/gamestore
#   GHCR_USER / GHCR_TOKEN
set -Eeuo pipefail

HOST="${1:-}"
SSH_KEY="${2:-}"
SSH_USER="${DEPLOY_USER:-azureuser}"
SSH_PORT="${DEPLOY_PORT:-22}"
REMOTE_DIR="${REMOTE_DIR:-/opt/gamestore}"
GHCR_USER="${GHCR_USER:-${GITHUB_ACTOR:-github-actions}}"

REPO_ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/../.." && pwd)"
DEPLOY_DIR="$REPO_ROOT/deploy"
ENV_FILE="$REPO_ROOT/deploy.env"

log() { printf '[deploy] %s\n' "$*"; }
die() { printf '[deploy] ERROR: %s\n' "$*" >&2; exit 1; }

read_env() {
  local key="$1" value
  value="$(grep -E "^${key}=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- || true)"
  value="${value%$'\r'}"
  value="${value%\"}"; value="${value#\"}"
  value="${value%\'}"; value="${value#\'}"
  printf '%s' "$value"
}

[[ -n "$HOST" && -n "$SSH_KEY" ]] || die "Uso: $0 <host> <ruta-clave-ssh>"
[[ -f "$ENV_FILE" ]] || die "Falta deploy.env; lo genera .github/workflows/deploy.yml"
[[ -f "$SSH_KEY" ]] || die "No existe la clave SSH: $SSH_KEY"
[[ "$HOST" =~ ^[A-Za-z0-9.-]+$ ]] || die "Host inválido: $HOST"
[[ "$SSH_USER" =~ ^[a-z_][a-z0-9_-]*$ ]] || die "Usuario SSH inválido: $SSH_USER"

DEPLOY_ENV="$(read_env DEPLOY_ENV)"
PUBLIC_HOST="$(read_env PUBLIC_HOST)"
PUBLIC_URL="$(read_env PUBLIC_URL)"
REGISTRY="$(read_env REGISTRY)"
IMAGE_TAG="$(read_env IMAGE_TAG)"

HOST="${HOST,,}"
PUBLIC_HOST="${PUBLIC_HOST,,}"

case "$DEPLOY_ENV" in
  staging)
    [[ "$HOST" == *staging* ]] || die "DEPLOY_ENV=staging pero el host no contiene 'staging'"
    ;;
  production)
    [[ "$HOST" == *production* ]] || die "DEPLOY_ENV=production pero el host no contiene 'production'"
    ;;
  *)
    die "DEPLOY_ENV inválido: '$DEPLOY_ENV'"
    ;;
esac

[[ -n "$PUBLIC_HOST" && -n "$REGISTRY" && -n "$IMAGE_TAG" ]] \
  || die "Faltan PUBLIC_HOST, REGISTRY o IMAGE_TAG en deploy.env"
[[ "$HOST" == "$PUBLIC_HOST" ]] \
  || die "El host '$HOST' no coincide con PUBLIC_HOST '$PUBLIC_HOST'"
[[ "$IMAGE_TAG" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] \
  || die "IMAGE_TAG inválido: '$IMAGE_TAG'"
[[ "$IMAGE_TAG" != "latest" ]] || die "No se permite desplegar la etiqueta 'latest'"
[[ "$REGISTRY" =~ ^[a-z0-9.-]+(:[0-9]+)?/[a-z0-9._/-]+$ ]] \
  || die "REGISTRY inválido: '$REGISTRY'"
[[ -n "$PUBLIC_URL" ]] || PUBLIC_URL="https://$HOST"

for f in docker-compose.yml Caddyfile scripts/remote-deploy.sh scripts/backup-db.sh \
         scripts/restore-db.sh postgres/init-keycloak-db.sh keycloak/realm-export.template.json; do
  [[ -f "$DEPLOY_DIR/$f" ]] || die "Falta deploy/$f"
done

SSH_OPTS=(
  -p "$SSH_PORT"
  -i "$SSH_KEY"
  -o BatchMode=yes
  -o ConnectTimeout=15
  -o StrictHostKeyChecking=accept-new
  -o ServerAliveInterval=30
)
chmod 600 "$SSH_KEY" 2>/dev/null || true

log "Verificando conexión y Docker en $SSH_USER@$HOST..."
ssh "${SSH_OPTS[@]}" "$SSH_USER@$HOST" \
  "test -w '$REMOTE_DIR' && docker info >/dev/null 2>&1" \
  || die "No hay conexión, $REMOTE_DIR no es escribible o Docker no funciona. ¿Ejecutaste bootstrap-vm.sh?"

log "Copiando archivos a $REMOTE_DIR..."
STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT

mkdir -p "$STAGE/scripts" "$STAGE/postgres" "$STAGE/keycloak/import"
install -m 600 "$ENV_FILE" "$STAGE/.env"
install -m 644 "$DEPLOY_DIR/docker-compose.yml" "$STAGE/docker-compose.yml"
install -m 644 "$DEPLOY_DIR/Caddyfile" "$STAGE/Caddyfile"
install -m 755 "$DEPLOY_DIR/scripts/remote-deploy.sh" "$STAGE/scripts/remote-deploy.sh"
install -m 755 "$DEPLOY_DIR/scripts/backup-db.sh" "$STAGE/scripts/backup-db.sh"
install -m 755 "$DEPLOY_DIR/scripts/restore-db.sh" "$STAGE/scripts/restore-db.sh"
install -m 755 "$DEPLOY_DIR/postgres/init-keycloak-db.sh" "$STAGE/postgres/init-keycloak-db.sh"
install -m 644 "$DEPLOY_DIR/keycloak/realm-export.template.json" "$STAGE/keycloak/realm-export.template.json"

tar -C "$STAGE" -czf - . \
  | ssh "${SSH_OPTS[@]}" "$SSH_USER@$HOST" \
      "mkdir -p '$REMOTE_DIR/keycloak/import' '$REMOTE_DIR/backups' \
       && tar -xzf - -C '$REMOTE_DIR' \
       && chmod 600 '$REMOTE_DIR/.env' \
       && chmod +x '$REMOTE_DIR/scripts/'*.sh"

if [[ -n "${GHCR_TOKEN:-}" ]]; then
  log "Autenticando Docker contra ghcr.io como $GHCR_USER..."
  printf '%s' "$GHCR_TOKEN" \
    | ssh "${SSH_OPTS[@]}" "$SSH_USER@$HOST" \
        "docker login ghcr.io -u '$GHCR_USER' --password-stdin >/dev/null"
else
  log "AVISO: GHCR_TOKEN no definido; se usarán credenciales existentes en la VM."
fi

log "Desplegando $IMAGE_TAG en $DEPLOY_ENV..."
ssh "${SSH_OPTS[@]}" "$SSH_USER@$HOST" \
  "cd '$REMOTE_DIR' && PUBLIC_URL='$PUBLIC_URL' bash scripts/remote-deploy.sh '$IMAGE_TAG'"

log "Despliegue completado: https://$PUBLIC_HOST (tag $IMAGE_TAG)"