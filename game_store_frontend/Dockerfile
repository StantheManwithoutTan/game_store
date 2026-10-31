# 1. Etapa de Compilacion

# Usa Node.js sobre Alpine y define /app como directorio de trabajo.
FROM node:22-alpine AS build
WORKDIR /app

# Copa las dependencias e instala SOLAMENTE lo que esta definido en package-lock.json.
# --ignore-scripts evita ejecutar scripts automáticos de los paquetes, reduciendo riesgos durante la construcción.
COPY package*.json ./
RUN npm ci --ignore-scripts

# Copia los archivos/carpetas especificados 
COPY index.html ./
COPY src ./src
COPY public ./public
COPY vite.config.ts ./
COPY tsconfig.json tsconfig.app.json tsconfig.node.json ./

# Genera los archivos optimizados de produccion en /app/dist
RUN npm run build

# 2. Etapa de Ejecucion

# # Usa una imagen final más pequeña que contiene únicamente Nginx, no Node.js ni las dependencias de desarrollo.
FROM nginx:1.27-alpine

# Configura Nginx. Copia solamente el resultado compilado del frontend.
# No incluye el código fuente ni node_modules.
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html


# 3. Preparación para usuario no privilegiado (Sugerida por Sonarcloud)

# Crea directorios donde el usuario nginx puede escribir.
# nginx corre como usuario no privilegiado: necesita escribir pid, temporales y logs.
RUN mkdir -p /tmp/nginx /var/cache/nginx \
 && sed -i 's#^pid .*#pid /tmp/nginx/nginx.pid;#' /etc/nginx/nginx.conf \
 && sed -i \
   -e 's#^error_log .*#error_log /dev/stderr warn;#' \
   -e 's#^access_log .*#access_log /dev/stdout main;#' \
   /etc/nginx/nginx.conf \
 && chown -R nginx:nginx /var/cache/nginx /usr/share/nginx/html /tmp/nginx

# 4. Ejecución segura
USER nginx

# Hace que Nginx se ejecute sin root. Si el proceso fuera comprometido, el atacante tendría menos permisos dentro del contenedor.
EXPOSE 8080

# Documenta que la aplicación pretende escuchar en el puerto 8080, que no requiere privilegios especiales.
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:8080/healthz || exit 1