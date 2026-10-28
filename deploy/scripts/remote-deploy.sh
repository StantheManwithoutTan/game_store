#!/usr/bin/env bash
# Uso: bash scripts/remote-deploy.sh <tag>
# Se ejecuta en la VM, dentro de /opt/gamestore.
set -Eeuo pipefail
umask 027

NEW_TAG="${1:-}"
REMOTE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REMOTE_DIR"

log() { printf '[remote-deploy] %s\n' "$*"; }
die() { printf '[remote-deploy] ERROR: %s\n' "$*" >&2; exit 1; }

[[ -n "$NEW_TAG" ]] || die "Uso: $0 <tag>"
[[ "$NEW_TAG" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] || die "Tag inválido: $NEW_TAG"
[[ "$NEW_TAG" != "latest" ]] || die "No se permite desplegar 'latest'"
[[ -f .env ]] || die "Falta $REMOTE_DIR/.env"
chmod 600 .env

for cmd in docker curl jq envsubst flock; do
  command -v "$cmd" >/dev/null 2>&1 || die "Falta '$cmd' (ejecuta bootstrap-vm.sh)"
done
docker compose version >/dev/null 2>&1 || die "Falta el plugin docker compose"

exec 9>"$REMOTE_DIR/.deploy.lock"
flock -n 9 || die "Ya hay otro despliegue en curso"

# Carga .env sin expandir $ ni ejecutar su contenido.
load_env() {
  local line key value
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line%$'\r'}"
    if [[ "$line" =~ ^[[:space:]]*# ]]; then continue; fi
    if [[ "$line" != *=* ]]; then continue; fi
    key="${line%%=*}"
    value="${line#*=}"
    key="${key//[[:space:]]/}"
    [[ "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] || continue
    if [[ ${#value} -ge 2 ]]; then
      if [[ "$value" == \"*\" && "$value" == *\" ]]; then
        value="${value:1:${#value}-2}"
      elif [[ "$value" == \'*\' && "$value" == *\' ]]; then
        value="${value:1:${#value}-2}"
      fi
    fi
    printf -v "$key" '%s' "$value"
    export "$key"
  done < .env
}
load_env

export IMAGE_TAG="$NEW_TAG"
PUBLIC_HOST="${PUBLIC_HOST:-}"
PUBLIC_HOST="${PUBLIC_HOST,,}"
PUBLIC_URL="${PUBLIC_URL:-https://$PUBLIC_HOST}"
PUBLIC_URL="${PUBLIC_URL%/}"
PUBLIC_URL="${PUBLIC_URL,,}"
FRONTEND_URL="${FRONTEND_URL:-}"
FRONTEND_URL="${FRONTEND_URL%/}"
FRONTEND_URL="${FRONTEND_URL,,}"
KEYCLOAK_REALM="${KEYCLOAK_REALM:-game-store}"
KEYCLOAK_SERVER_URL_EXTERNAL="${KEYCLOAK_SERVER_URL_EXTERNAL:-https://$PUBLIC_HOST:8443}"
KEYCLOAK_SERVER_URL_EXTERNAL="${KEYCLOAK_SERVER_URL_EXTERNAL%/}"
export PUBLIC_URL FRONTEND_URL KEYCLOAK_SERVER_URL_EXTERNAL

for var in DEPLOY_ENV PUBLIC_HOST PUBLIC_URL REGISTRY KEYCLOAK_VERSION \
           POSTGRES_USER POSTGRES_PASSWORD POSTGRES_DB FLASK_SECRET_KEY \
           FRONTEND_URL KEYCLOAK_SERVER_URL KEYCLOAK_CLIENT_ID \
           KEYCLOAK_CLIENT_SECRET KEYCLOAK_ADMIN_USER KEYCLOAK_ADMIN_PASSWORD; do
  value="${!var:-}"
  [[ -n "$value" ]] || die "Falta $var en .env"
done

[[ "$DEPLOY_ENV" == "staging" || "$DEPLOY_ENV" == "production" ]] \
  || die "DEPLOY_ENV inválido: $DEPLOY_ENV"
case "$DEPLOY_ENV" in
  staging)
    [[ "$PUBLIC_HOST" == *staging* ]] || die "El host no parece de staging"
    ;;
  production)
    [[ "$PUBLIC_HOST" == *production* ]] || die "El host no parece de producción"
    ;;
  *)
    die "DEPLOY_ENV no reconocido: $DEPLOY_ENV"
    ;;
esac
[[ "$PUBLIC_HOST" =~ ^[a-z0-9.-]+$ ]] || die "PUBLIC_HOST inválido: $PUBLIC_HOST"
[[ "$PUBLIC_URL" == "https://$PUBLIC_HOST" ]] \
  || die "PUBLIC_URL debe ser https://$PUBLIC_HOST"
[[ "$FRONTEND_URL" == "$PUBLIC_URL" ]] \
  || die "FRONTEND_URL debe ser $PUBLIC_URL"
[[ "$KEYCLOAK_SERVER_URL_EXTERNAL" == "https://$PUBLIC_HOST:8443" ]] \
  || die "KEYCLOAK_SERVER_URL_EXTERNAL debe ser https://$PUBLIC_HOST:8443"
[[ "$KEYCLOAK_REALM" =~ ^[A-Za-z0-9._-]+$ ]] || die "KEYCLOAK_REALM inválido"
[[ "$REGISTRY" =~ ^[a-z0-9.-]+(:[0-9]+)?/[a-z0-9._/-]+$ ]] \
  || die "REGISTRY inválido: $REGISTRY"
[[ "$POSTGRES_PASSWORD" =~ ^[0-9a-fA-F]{16,}$ ]] \
  || log "AVISO: POSTGRES_PASSWORD no es hexadecimal; SQLAlchemy podría fallar"
[[ -n "${ACME_EMAIL:-}" ]] || log "AVISO: ACME_EMAIL vacío"

render_realm() {
  local template="keycloak/realm-export.template.json"
  local output="keycloak/import/realm-export.json"
  local tmp
  [[ -f "$template" ]] || die "Falta $template"
  mkdir -p keycloak/import
  tmp="$(mktemp)"
  if ! PUBLIC_URL="$PUBLIC_URL" KEYCLOAK_CLIENT_SECRET="$KEYCLOAK_CLIENT_SECRET" \
       envsubst '${PUBLIC_URL} ${KEYCLOAK_CLIENT_SECRET}' < "$template" > "$tmp"; then
    rm -f "$tmp"
    die "No se pudo renderizar el realm"
  fi
  if ! jq -e . "$tmp" >/dev/null 2>&1; then
    rm -f "$tmp"
    die "El realm renderizado no es JSON válido"
  fi
  install -m 644 "$tmp" "$output"
  rm -f "$tmp"
  log "Realm renderizado para $PUBLIC_URL"
}

wait_for_healthy() {
  local service="$1" timeout="${2:-180}" elapsed=0 cid status
  while (( elapsed < timeout )); do
    cid="$(docker compose ps -q "$service" 2>/dev/null || true)"
    if [[ -n "$cid" ]]; then
      status="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$cid" 2>/dev/null || true)"
      if [[ "$status" == "healthy" ]]; then return 0; fi
    fi
    sleep 3
    elapsed=$((elapsed + 3))
  done
  return 1
}

wait_for_version() {
  local expected="$1" timeout="${2:-300}" elapsed=0 version
  while (( elapsed < timeout )); do
    version="$(curl -fsS --max-time 5 "$PUBLIC_URL/health" 2>/dev/null \
      | jq -r '.version // empty' 2>/dev/null || true)"
    if [[ "$version" == "$expected" ]]; then return 0; fi
    sleep 5
    elapsed=$((elapsed + 5))
  done
  return 1
}

wait_for_keycloak() {
  local timeout="${1:-300}" elapsed=0
  local url="$KEYCLOAK_SERVER_URL_EXTERNAL/realms/$KEYCLOAK_REALM/.well-known/openid-configuration"
  while (( elapsed < timeout )); do
    if curl -fsS --max-time 10 "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep 5
    elapsed=$((elapsed + 5))
  done
  return 1
}

rollback() {
  trap - ERR
  set +e
  if [[ -z "$PREVIOUS_TAG" || "$PREVIOUS_TAG" == "$NEW_TAG" ]]; then
    log "No hay una versión anterior distinta; se dejan los contenedores para diagnóstico."
    return 1
  fi
  log "Rollback de la aplicación a $PREVIOUS_TAG..."
  export IMAGE_TAG="$PREVIOUS_TAG"
  docker compose pull --quiet backend frontend
  docker compose up -d --no-deps --force-recreate backend frontend
  docker compose restart caddy >/dev/null 2>&1 || true
  if wait_for_healthy backend 180 && wait_for_version "$PREVIOUS_TAG" 180; then
    printf '%s\n' "$PREVIOUS_TAG" > .deployed-tag
    log "Rollback completado con $PREVIOUS_TAG."
    return 0
  fi
  log "El rollback no alcanzó un estado saludable. Revisa logs o restaura el backup."
  docker compose logs --tail=80 backend caddy 2>/dev/null || true
  return 1
}

ROLLBACK_ARMED=0
on_error() {
  local code=$?
  trap - ERR
  set +e
  log "ERROR: falló el despliegue (código $code)."
  docker compose ps || true
  docker compose logs --tail=80 backend keycloak caddy 2>/dev/null || true
  if [[ "$ROLLBACK_ARMED" == "1" ]]; then
    rollback
  fi
  exit "$code"
}
trap on_error ERR

render_realm
docker compose config -q || die "docker-compose.yml o .env inválidos"

PREVIOUS_TAG="$(cat .deployed-tag 2>/dev/null || true)"
if [[ -z "$PREVIOUS_TAG" ]]; then
  old_cid="$(docker compose ps -q backend 2>/dev/null || true)"
  if [[ -n "$old_cid" ]]; then
    old_image="$(docker inspect -f '{{.Config.Image}}' "$old_cid" 2>/dev/null || true)"
    PREVIOUS_TAG="${old_image##*:}"
  fi
fi
[[ "$PREVIOUS_TAG" =~ ^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$ ]] || PREVIOUS_TAG=""
log "Tag anterior: ${PREVIOUS_TAG:-ninguno}; nuevo: $NEW_TAG"

log "Levantando PostgreSQL..."
docker compose up -d db
wait_for_healthy db 120 || die "PostgreSQL no quedó saludable"

log "Verificando base de datos 'keycloak'..."
kc_db="$(docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db \
  psql -U "$POSTGRES_USER" -d postgres -tAc \
  "SELECT 1 FROM pg_database WHERE datname = 'keycloak'")"
kc_db="${kc_db//[[:space:]]/}"
if [[ "$kc_db" != "1" ]]; then
  log "Creando base de datos 'keycloak'..."
  docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" db \
    createdb -U "$POSTGRES_USER" -O "$POSTGRES_USER" keycloak
else
  log "La base de datos 'keycloak' ya existe."
fi

log "Creando backup previo al despliegue..."
bash scripts/backup-db.sh "pre-deploy-$NEW_TAG" \
  || die "Falló el backup; se aborta antes de tocar la aplicación"

log "Descargando imágenes backend y frontend con tag $NEW_TAG..."
docker compose pull --quiet backend frontend \
  || die "No se pudieron descargar las imágenes; revisa docker login ghcr.io"

log "Aplicando migraciones..."
docker compose --profile tools run --rm --no-deps migrate \
  || die "Fallaron las migraciones; la aplicación anterior sigue en ejecución"

log "Levantando servicios..."
ROLLBACK_ARMED=1
docker compose up -d --remove-orphans
docker compose restart caddy >/dev/null 2>&1 || true

log "Esperando backend..."
wait_for_healthy backend 180
log "Esperando frontend..."
wait_for_healthy frontend 120
log "Esperando versión $NEW_TAG en $PUBLIC_URL/health..."
wait_for_version "$NEW_TAG" 300
log "Esperando Keycloak y realm $KEYCLOAK_REALM..."
wait_for_keycloak 300

ROLLBACK_ARMED=0
printf '%s\n' "$NEW_TAG" > .deployed-tag \
  || log "AVISO: no se pudo guardar .deployed-tag"
log "Despliegue completado: $DEPLOY_ENV / $NEW_TAG / $PUBLIC_URL"
docker compose ps || true