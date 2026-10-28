FROM node:22-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci --ignore-scripts

COPY index.html ./
COPY src ./src
COPY public ./public
COPY vite.config.ts ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./
RUN npm run build && \
  # Configurar permisos para otro usuario no privilegiado 'nginx' preinstalado en Alpine
  chown -R nginx:nginx /usr/share/nginx/html && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid

# Cambiar el usuario por defecto del contenedor (para no correr con el user root en la configuracion de nginxx)
USER nginx

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1