#!/usr/bin/env bash
# Uso: bash deploy/scripts/bootstrap-vm.sh
# Se ejecuta UNA VEZ en cada VM Ubuntu, como azureuser con sudo.
set -Eeuo pipefail

DEPLOY_USER="${SUDO_USER:-$USER}"
[[ "$DEPLOY_USER" != "root" ]] || {
  echo "Ejecuta como usuario no root (azureuser) con sudo" >&2
  exit 1
}
id "$DEPLOY_USER" >/dev/null 2>&1 || {
  echo "No existe el usuario $DEPLOY_USER" >&2
  exit 1
}
sudo -v

log() { printf '[bootstrap] %s\n' "$*"; }

if ! . /etc/os-release || [[ "${ID:-}" != "ubuntu" ]]; then
  echo "Este script está pensado para Ubuntu" >&2
  exit 1
fi

log "Instalando paquetes base..."
sudo apt-get update
sudo apt-get install -y \
  ca-certificates curl gnupg jq gettext-base fail2ban \
  python3-systemd gzip util-linux

log "Configurando el repositorio de Docker..."
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg \
  -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null

sudo apt-get update
sudo apt-get install -y \
  docker-ce docker-ce-cli containerd.io \
  docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker

log "Añadiendo $DEPLOY_USER al grupo docker..."
sudo usermod -aG docker "$DEPLOY_USER"

log "Configurando swap de 2 GB..."
if ! swapon --show=NAME --noheadings | grep -q .; then
  if ! sudo fallocate -l 2G /swapfile 2>/dev/null; then
    sudo dd if=/dev/zero of=/swapfile bs=1M count=2048 status=none
  fi
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile >/dev/null
  sudo swapon /swapfile
  if ! grep -q '^/swapfile ' /etc/fstab; then
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab >/dev/null
  fi
  echo 'vm.swappiness=10' | sudo tee /etc/sysctl.d/99-gamestore.conf >/dev/null
  sudo sysctl --system >/dev/null
else
  log "Ya existe swap; no se modifica."
fi

log "Configurando fail2ban para SSH..."
sudo tee /etc/fail2ban/jail.d/gamestore.local >/dev/null <<'EOF'
[sshd]
enabled = true
backend = systemd
journalmatch = _SYSTEMD_UNIT=ssh.service
maxretry = 5
findtime = 10m
bantime = 1h
EOF
sudo systemctl enable --now fail2ban
sudo systemctl restart fail2ban

log "Configurando log rotation de Docker..."
if [[ ! -f /etc/docker/daemon.json ]]; then
  sudo tee /etc/docker/daemon.json >/dev/null <<'EOF'
{
  "log-driver": "json-file",
  "log-opts": { "max-size": "10m", "max-file": "3" }
}
EOF
  sudo systemctl restart docker
else
  log "AVISO: /etc/docker/daemon.json ya existe; revísalo manualmente."
fi

log "Creando /opt/gamestore..."
sudo install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/gamestore
sudo install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/gamestore/scripts
sudo install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/gamestore/postgres
sudo install -d -m 755 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/gamestore/keycloak/import
sudo install -d -m 700 -o "$DEPLOY_USER" -g "$DEPLOY_USER" /opt/gamestore/backups

log "Versiones instaladas:"
docker --version
docker compose version
jq --version
envsubst --version | head -n1
fail2ban-client status sshd 2>/dev/null || true

cat <<EOF

Bootstrap completado.

Siguientes pasos:
  1. Abre en el NSG de Azure los puertos 80, 443 y 8443.
     El puerto 22 debe quedar restringido a tu IP.
  2. Cierra la sesión SSH y vuelve a entrar para aplicar el grupo docker.
     También puedes ejecutar: newgrp docker
  3. Configura secretos y variables en GitHub Environments.
  4. Lanza el workflow de despliegue.

Usuario de despliegue: $DEPLOY_USER
Directorio: /opt/gamestore
EOF