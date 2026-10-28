# Despliegue de Game Store

## Arquitectura

Dos VMs Ubuntu en Azure, una por ambiente:

| Ambiente | Rama | VM | Host |
|---|---|---|---|
| staging | develop | vm-gamestore-staging | gamestore-staging-dev.mexicocentral.cloudapp.azure.com |
| production | main | vm-gamestore-production | gamestore-production-dev.mexicocentral.cloudapp.azure.com |

```text
Internet
   │ 80 / 443 / 8443
   ▼
Caddy
   ├── https://HOST/          → frontend:80
   ├── https://HOST/api/*     → backend:5000
   ├── https://HOST/health    → backend:5000
   └── https://HOST:8443/*    → keycloak:8080

PostgreSQL: appdb + keycloak (sin puertos públicos)
```

- Imágenes en GHCR.
- GitHub Actions construye, publica y despliega.
- staging se despliega desde `develop`; production desde `main` con aprobación manual.

## Requisitos previos

- VMs Ubuntu 22.04/24.04 con `bootstrap-vm.sh`.
- DNS de Azure apuntando a la IP pública de cada VM.
- NSG: inbound 80, 443 y 8443; 22 solo desde la IP del administrador.
- Salida a 443 para GHCR, Quay, Docker Hub y Let's Encrypt.
- Paquetes GHCR accesibles desde la VM; token con `read:packages`.
- GitHub Environments `staging` y `production`; production con required reviewers.
- `backend` con `/health` que devuelva `GIT_SHA`.
- Migraciones en `backend/migrations/` versionadas, fuera de `.gitignore`.
- Dockerfile de producción del frontend.
- Workflows `ci.yml`, `cd.yml` y `deploy.yml` corregidos.
- `.gitattributes` con LF para `*.sh`, `Dockerfile`, `Caddyfile` y `*.yml`.

### Nota sobre el frontend

El frontend usa `VITE_KEYCLOAK_URL`, `VITE_APP_URL` y `VITE_API_URL`, que Vite resuelve en build time. Una sola imagen no puede tener valores distintos para staging y production salvo que:

1. Se derive la URL en runtime:

   ```ts
   const keycloakUrl =
     import.meta.env.VITE_KEYCLOAK_URL ||
     `${window.location.protocol}//${window.location.hostname}:8443`

   const appUrl =
     import.meta.env.VITE_APP_URL ||
     window.location.origin

   const apiUrl =
     import.meta.env.VITE_API_URL ||
     ''
   ```

   Y el build de producción no defina esas variables.

2. O se construyan dos imágenes, una por ambiente.

La opción recomendada es la 1. Si se dejan los fallbacks actuales a `localhost`, el frontend desplegado intentará autenticarse contra localhost.

## Configuración de GitHub

### Secrets

| Secret | Contenido |
|---|---|
| `SSH_PRIVATE_KEY` | Clave privada de la VM del ambiente |
| `POSTGRES_PASSWORD` | 64 caracteres hex (`openssl rand -hex 32`) |
| `FLASK_SECRET_KEY` | `openssl rand -hex 32` |
| `KEYCLOAK_CLIENT_SECRET` | Secreto del cliente `game-store-client` |
| `KEYCLOAK_ADMIN_PASSWORD` | Password del admin de Keycloak |
| `GRAFANA_ADMIN_PASSWORD` | Opcional |
| `QA_PASSWORD` | Opcional |
| `GHCR_TOKEN` | Opcional si se usa `GITHUB_TOKEN` con `packages: read` |

`POSTGRES_PASSWORD` debe ser hexadecimal porque `backend/config.py` concatena la contraseña en la URL de SQLAlchemy sin hacer URL-encoding.

### Variables

| Variable | Ejemplo |
|---|---|
| `STAGING_HOST` | `gamestore-staging-dev...` |
| `PRODUCTION_HOST` | `gamestore-production-dev...` |
| `ACME_EMAIL` | `admin@tudominio.com` |
| `KEYCLOAK_VERSION` | `26.2` |
| `KEYCLOAK_REALM` | `game-store` |
| `KEYCLOAK_CLIENT_ID` | `game-store-client` |

Define los secrets que cambian por ambiente dentro de cada Environment. `SSH_PRIVATE_KEY`, `POSTGRES_PASSWORD`, `FLASK_SECRET_KEY` y `KEYCLOAK_CLIENT_SECRET` deben ser distintos entre staging y production.

### Workflows

- `ci.yml`: tests, build y push a GHCR de `backend` y `frontend` con tag `${{ github.sha }}` y build arg `GIT_SHA=${{ github.sha }}`.
- `cd.yml`: en `push` a `develop` despliega staging; en `push` a `main` despliega production. Debe llamar a `deploy.yml` con `secrets: inherit`.
- `deploy.yml`: genera `deploy.env`, ejecuta `deploy/scripts/deploy.sh` y verifica `/health`.
- `deploy.yml` debe incluir `PUBLIC_URL=https://$HOST`, `GHCR_TOKEN` y `GHCR_USER` en el step de despliegue.
- Añade `permissions: packages: read` para descargar imágenes de GHCR.

## Generar la plantilla del realm

No uses `keycloak/realm-export.json` directamente: tiene redirects a localhost/Vercel, el secreto está enmascarado y no está versionado. Úsalo solo como fuente.

Con `jq`:

```bash
jq '
  .clients = (.clients | map(
    if .clientId == "game-store-client" then
      .rootUrl = "${PUBLIC_URL}"
      | .baseUrl = "${PUBLIC_URL}"
      | .redirectUris = [
          "${PUBLIC_URL}/*",
          "${PUBLIC_URL}/login/callback*"
        ]
      | .webOrigins = ["${PUBLIC_URL}"]
      | .attributes["post.logout.redirect.uris"] = "${PUBLIC_URL}/*"
      | .secret = "${KEYCLOAK_CLIENT_SECRET}"
    else .
    end
  ))
' keycloak/realm-export.json > deploy/keycloak/realm-export.template.json

jq -e . deploy/keycloak/realm-export.template.json >/dev/null
```

`remote-deploy.sh` sustituye solo `${PUBLIC_URL}` y `${KEYCLOAK_CLIENT_SECRET}` con `envsubst`. Keycloak importa el realm solo cuando la base está vacía; cambios posteriores en la plantilla no se aplican solos. Para cambiarlos usa la Admin API/consola o borra y recrea el realm, lo que elimina usuarios y sesiones.

## Primer despliegue

1. Ejecuta el bootstrap en cada VM:

   ```bash
   scp deploy/scripts/bootstrap-vm.sh azureuser@HOST:/tmp/
   ssh azureuser@HOST 'bash /tmp/bootstrap-vm.sh'
   ```

2. Cierra y vuelve a abrir la sesión SSH, o ejecuta `newgrp docker`.
3. Verifica DNS y NSG.
4. Genera y commitea `deploy/keycloak/realm-export.template.json`.
5. Configura los GitHub Environments, secrets y variables.
6. Asegúrate de que CI publicó `backend` y `frontend` con el SHA que vas a desplegar.
7. Lanza staging y valida:

   ```bash
   curl -fsS https://HOST/health | jq
   curl -fsS https://HOST:8443/realms/game-store/.well-known/openid-configuration | jq -r .issuer
   ```

8. Lanza production; GitHub pedirá aprobación.

El primer despliegue crea el volumen de PostgreSQL, las bases `appdb` y `keycloak`, importa el realm y solicita los certificados TLS.

## Operación

```bash
ssh azureuser@HOST
cd /opt/gamestore

docker compose ps
docker compose logs -f --tail=200 backend
docker compose logs -f --tail=200 keycloak
docker compose logs -f --tail=200 caddy

docker compose restart backend
docker compose exec backend sh
docker compose exec caddy caddy reload --config /etc/caddy/Caddyfile
```

`docker compose down` conserva los volúmenes. `docker compose down -v` borra PostgreSQL, Caddy y los certificados; no lo uses en producción.

## Backups

- Antes de cada despliegue, `remote-deploy.sh` ejecuta `scripts/backup-db.sh pre-deploy-<sha>`.
- Manual: `bash scripts/backup-db.sh manual`.
- Retención por defecto: 14 días (`BACKUP_RETENTION_DAYS`).
- Los archivos quedan en `/opt/gamestore/backups` con modo `600`.

Cron sugerido:

```cron
0 3 * * * cd /opt/gamestore && PATH=/usr/bin:/bin bash scripts/backup-db.sh cron >> backups/backup.log 2>&1
```

Los backups locales no protegen contra la pérdida de la VM. Copia periódicamente `backups/` a Azure Blob Storage u otro destino.

Restaurar:

```bash
bash scripts/restore-db.sh backups/pre-deploy-<sha>-appdb.sql.gz appdb
bash scripts/restore-db.sh backups/pre-deploy-<sha>-keycloak.sql.gz keycloak
```

Prueba el restore en staging antes de necesitarlo en production.

## Rollback

- Si falla `/health`, `remote-deploy.sh` vuelve automáticamente a `backend`/`frontend` al tag anterior guardado en `.deployed-tag`.
- Las migraciones no se revierten. Si el esquema es incompatible, restaura el backup previo:

  ```bash
  bash scripts/restore-db.sh backups/pre-deploy-<sha>-appdb.sql.gz appdb
  ```

- Keycloak y Caddy no tienen rollback automático de configuración. Los cambios de Caddyfile, compose o realm deben probarse primero en staging.
- Rollback manual de la app: ejecuta `bash scripts/remote-deploy.sh <sha-anterior>` o vuelve a lanzar el workflow con ese SHA.

## Keycloak

- Consola: `https://HOST:8443/admin/`
- Realm: `game-store`
- Cliente: `game-store-client`
- El admin se crea solo en el primer arranque con `KEYCLOAK_ADMIN_USER`/`KEYCLOAK_ADMIN_PASSWORD`.
- Cambiar el password del admin después del primer arranque requiere la consola; el secret de GitHub no lo actualiza.
- Para rotar el secreto del cliente: Keycloak Admin Console → Clients → `game-store-client` → Credentials → Regenerate; actualiza `KEYCLOAK_CLIENT_SECRET` en GitHub y vuelve a desplegar el backend. Si solo cambias el secret en GitHub, Keycloak conservará el anterior y el backend no podrá autenticarse.
- `--import-realm` no actualiza un realm existente.

## Troubleshooting

| Síntoma | Causa probable | Acción |
|---|---|---|
| `502 Bad Gateway` | backend/frontend caído | `docker compose ps`, logs del servicio |
| Error de certificado TLS | DNS, puertos 80/443 o ACME | `docker compose logs caddy`; revisa NSG |
| `unauthorized` al hacer pull | GHCR sin login o sin permisos | `docker login ghcr.io`, revisa `packages: read` |
| `/health` devuelve otro tag | `GIT_SHA` no coincide con la imagen | rebuild con `GIT_SHA=${{ github.sha }}` |
| Keycloak 404 en el realm | import falló o base no vacía | logs de keycloak, revisa `keycloak/import/realm-export.json` |
| `password authentication failed` | cambió `POSTGRES_PASSWORD` | vuelve al password anterior o restaura el volumen |
| `permission denied /var/run/docker.sock` | usuario sin grupo docker | cierra sesión y entra de nuevo |
| `port is already allocated` | otro proceso usa 80/443/8443 | `ss -ltnp` en la VM |
| Disco lleno | imágenes/volúmenes/backups | `docker system df`, `docker system prune` |

## Seguridad

- Rota `KEYCLOAK_CLIENT_SECRET`, `FLASK_SECRET_KEY` y cualquier secreto que haya estado en el historial de Git.
- Mantén `.env` en modo `600`.
- No publiques PostgreSQL.
- Restringe el puerto 22 en el NSG y mantén fail2ban activo.
- Usa tokens GHCR con el mínimo permiso.
- Copia los backups fuera de la VM.
- Considera Azure Key Vault para secretos en una siguiente iteración.

## Limitaciones

- Una VM por ambiente, sin alta disponibilidad.
- Hay downtime breve durante el despliegue y al reiniciar Caddy.
- Las migraciones deben ser compatibles hacia atrás.
- Los backups son locales por defecto.
- El frontend necesita configuración de runtime o builds separados por ambiente.