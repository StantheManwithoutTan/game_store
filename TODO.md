# TODO — Sistema de Gestión de Inventarios Empresarial

> **Stack:** Flask · Vue 3 · PostgreSQL · Docker · Keycloak · OpenTelemetry  
> **Curso:** Aseguramiento de Calidad de Software — PUCMM  
> **Formato de commits:** [Conventional Commits](#-conventional-commits)  
> **Formato de ramas:** [Branch Strategy](#-branch-strategy)

---

## Índice

- [Cómo usar este TODO](#-cómo-usar-este-todo)
- [Conventional Commits](#-conventional-commits)
- [Branch Strategy](#-branch-strategy)
- [Parte I — Avance](#parte-i--avance-días-1--7)
- [Parte II — Proyecto Final](#parte-ii--proyecto-final-días-8--20)
- [Rúbrica de Evaluación](#-rúbrica-de-evaluación)

---

## Cómo usar este TODO

- Marca una tarea como completada cambiando `[ ]` por `[x]`
- Marca una tarea en proceso cambiando `[ ]` por `[O]`
- Cada tarea debería corresponderse con al menos un commit o PR
- Las viñetas debajo de una tarea son detalles de implementación, no tareas separadas
- Los días del **Avance (1–7)** son prioridad — completa esos primero
- Puedes referenciar este archivo en un commit: `docs: mark day 1 tasks as complete`

---

## Conventional Commits

Todo commit en este repositorio **debe** seguir el formato Conventional Commits. Esto permite generar changelogs automáticos, facilita la revisión de código y muestra madurez técnica.

### Formato

```
<tipo>(<scope opcional>): <descripción corta en imperativo>

[cuerpo opcional — explicación del por qué, no del qué]

[footer opcional — referencias a issues, breaking changes]
```

### Tipos permitidos

| Tipo | Cuándo usarlo | Ejemplo |
|------|--------------|---------|
| `feat` | Nueva funcionalidad | `feat(stock): add minimum stock alert endpoint` |
| `fix` | Corrección de bug | `fix(auth): handle expired JWT token correctly` |
| `test` | Agregar o corregir tests | `test(product): add integration tests with Testcontainers` |
| `docs` | Documentación | `docs: update README with setup instructions` |
| `chore` | Configuración, dependencias, CI | `chore: add GitHub Actions workflow` |
| `refactor` | Refactoring sin cambio de comportamiento | `refactor(service): extract validation logic` |
| `style` | Formato de código (sin lógica) | `style: apply black formatter to all files` |
| `perf` | Mejora de rendimiento | `perf(query): add index on products.sku` |
| `ci` | Cambios al pipeline CI/CD | `ci: add SonarQube quality gate to Jenkins` |
| `revert` | Revertir un commit anterior | `revert: feat(stock): add minimum stock alert` |

### Scopes recomendados para este proyecto

`auth` · `product` · `stock` · `audit` · `api` · `db` · `docker` · `ci` · `obs` · `e2e` · `frontend` · `docs`

### Ejemplos completos

```bash
# Feature nueva
feat(product): implement paginated product listing with filters

# Bug fix con referencia a issue
fix(stock): prevent negative stock on exit movement
Closes #12

# Commit con cuerpo explicativo
feat(auth): add granular permission decorator

Replace role-based check with scope-based validation.
Each endpoint now verifies the specific scope instead
of a broad role, following the project security matrix.

# Chore de configuración
chore(docker): add keycloak service to docker-compose

# Test
test(product): add 15 unit tests for ProductService — coverage 62%

# Documentación
docs: mark day 3 tasks as complete in TODO.md
```

### Reglas importantes

- Usa el **imperativo** en presente: `add`, `fix`, `update` — no `added`, `fixing`, `updates`
- La descripción corta va en **minúsculas** y sin punto al final
- Máximo **72 caracteres** en la primera línea
- Si el commit rompe compatibilidad, agrega `BREAKING CHANGE:` en el footer
- **Un commit = una cosa.** No mezcles feat + fix en el mismo commit

---

## Estrategia de Rama

### Estructura de ramas

```
main          ← producción, siempre estable, protegida
  └── develop ← rama de integración, base para features
        ├── feature/setup
        ├── feature/crud-product
        ├── feature/keycloak-auth
        ├── feature/unit-tests
        └── hotfix/fix-stock-validation  ← sale de main directamente
```

### Convención de nombres

```
<tipo>/<descripción-en-kebab-case>
```

| Tipo de rama | Cuándo crearla | Ejemplo |
|---|---|---|
| `feature/` | Funcionalidad nueva o día de trabajo | `feature/flask-crud` |
| `fix/` | Corrección de bug en develop | `fix/negative-stock-validation` |
| `hotfix/` | Corrección urgente en producción | `hotfix/jwt-expiry-crash` |
| `test/` | Agregar tests sin cambio funcional | `test/integration-testcontainers` |
| `ci/` | Cambios al pipeline | `ci/add-sonarqube-gate` |
| `docs/` | Solo documentación | `docs/update-readme-observability` |
| `refactor/` | Refactoring sin funcionalidad nueva | `refactor/extract-stock-service` |

### Flujo de trabajo diario

```bash
# 1. Crear rama desde develop
git checkout develop
git pull origin develop
git checkout -b feature/setup

# 2. Trabajar y commitear
git add .
git commit -m "feat(docker): add postgresql service to docker-compose"

# 3. Subir la rama
git push origin feature/setup

# 4. Abrir Pull Request hacia develop
#    → Título del PR = resumen del día
#    → Descripción = qué se hizo, decisiones tomadas, cómo probar
#    → Asignar reviewer al otro integrante

# 5. Después del review y merge, borrar la rama
git branch -d feature/setup
```

### Protección de ramas (configurar en GitHub)

- **main**: requiere PR + 1 review aprobado, no permite push directo, requiere que CI pase
- **develop**: requiere PR, no permite push directo

### Reglas importantes

- Nunca hagas `git push` directo a `main` o `develop`
- Una rama = un propósito claro. No acumules cambios no relacionados
- Los nombres de rama van en **inglés y kebab-case**: `feature/stock-alert` ✅ · `feature/alerta stock` ❌
- Borra las ramas después del merge para mantener el repo limpio

---



























## Parte I — Avance (Días 1 – 7)

> Completar antes de la entrega parcial. Cubre todos los requisitos del documento de Avance.

---

### Día 1 · Semana 1 — Setup: Repositorio, Docker y Base de datos

**Rama sugerida:** `feature/setup`

- [ ] **Crear repositorio GitHub y configurar estrategia de ramas**
  - Repo público, compartido con el docente
  - Branches: `main`, `develop`, `feature/*`, `hotfix/*`
  - Activar branch protection en `main` y `develop` (requiere PR + review)
  - Escribir README inicial con descripción, tecnologías y pasos para levantar el proyecto

- [X] **Levantar PostgreSQL con Docker Compose**
  - Crear `docker-compose.yml` con servicio `postgres:15`
  - Agregar volumen persistente y healthcheck
  - Gestionar credenciales en archivo `.env` — nunca hardcoded

- [O] **Configurar Alembic + SqlAlchemy + flask-smorest y crear las 4 migraciones base**
  - `V1`: tabla `productos` (id, nombre, sku, descripcion, categoria, precio, cantidad, stock_min, estado, created_at) X
  - `V2`: tabla `movimientos_stock` (id, producto_id, tipo, cantidad_anterior, cantidad_nueva, usuario, observaciones, fecha)
  - `V3`: tablas `categorias` y `usuarios`
  - `V4`: tabla `audit_log`

- [X] **Realizar primer commit siguiendo Conventional Commits**
  - Ejemplo: `feat: initial project setup with docker and migrations`

---

### Día 2 · Semana 1 — Backend Flask: Estructura y CRUD de Producto

**Rama sugerida:** `feature/flask-crud`

- [ ] **Estructurar el proyecto Flask y configurar SQLAlchemy**
  - Crear carpetas: `app/`, `models/`, `routes/`, `services/`, `tests/`
  - Configurar `create_app()` con factory pattern
  - Integrar Flask-Migrate / Alembic con SQLAlchemy

- [ ] **Crear modelo `Product` y `ProductService` con validaciones**
  - Modelo con todos los campos del alcance funcional
  - Servicio con métodos: `create`, `get_all`, `get_by_id`, `update`, `delete`
  - Validaciones: SKU único, precio > 0, stock >= 0, nombre obligatorio

- [ ] **Implementar los 5 endpoints REST del CRUD de Producto**
  - `POST /api/products`
  - `GET /api/products` — paginación (`?page=&per_page=`) y búsqueda (`?search=&categoria=&estado=`)
  - `GET /api/products/<id>`
  - `PUT /api/products/<id>`
  - `DELETE /api/products/<id>`

- [ ] **Abrir PR #1 hacia `develop` con descripción de los cambios**

---

### Día 3 · Semana 1 — Seguridad: Keycloak, OAuth2 y JWT

**Rama sugerida:** `feature/keycloak-auth`

- [ ] **Agregar Keycloak al Docker Compose y configurar el realm**
  - Servicio Keycloak con imagen `quay.io/keycloak/keycloak`
  - Crear realm `inventory-realm` y client `inventory-api` (Authorization Code + PKCE)
  - Crear todos los scopes: `product:view`, `product:manage`, `stock:view`, `stock:manage`, `report:view`, `user:manage`, `audit:view`

- [ ] **Crear usuarios y asignar permisos en Keycloak**
  - Usuario `admin`: `product:manage`, `stock:manage`, `report:view`, `user:manage`, `audit:view`
  - Usuario `empleado`: `product:view`, `stock:view`, `report:view`

- [ ] **Integrar validación JWT en Flask y proteger endpoints**
  - Instalar `python-keycloak` o `authlib`
  - Crear decorador `@require_permission('scope')` para cada endpoint
  - Proteger `GET /api/products` con `product:view` y `POST/PUT/DELETE` con `product:manage`
  - Configurar refresh tokens (Access: 5 min) y CORS solo para el origen Vue

---

### Día 4 · Semana 2 — Swagger / OpenAPI, Auditoría y Unit Tests

**Rama sugerida:** `feature/openapi-audit-tests`

- [ ] **Configurar Swagger UI con `flask-openapi3` o `flasgger`**
  - Exponer `/api/docs` con Swagger UI interactivo
  - Documentar todos los endpoints: esquemas de request, response y códigos de error
  - Verificar que `/api/openapi.json` se genera sin errores

- [ ] **Implementar auditoría tipo Envers con SQLAlchemy-Continuum**
  - Alternativa: triggers PostgreSQL que escriban en `audit_log`
  - Verificar que al editar un producto queda registrada la versión anterior
  - Capturar evidencia (screenshot de la tabla de auditoría)

- [ ] **Escribir 15+ unit tests con pytest y alcanzar 60% de cobertura**
  - ~5 tests para `ProductService.create` (casos válidos e inválidos)
  - ~5 tests para validaciones de negocio (SKU duplicado, precio negativo, etc.)
  - ~5 tests para `update` y `delete`
  - Configurar `pytest-cov` y generar reporte HTML de cobertura

---

### Día 5 · Semana 2 — Integration Tests, API Tests y Dockerización

**Rama sugerida:** `feature/integration-tests-docker`

- [ ] **Configurar Testcontainers y escribir 5 integration tests**
  - `pip install testcontainers`
  - Fixture pytest que levanta PostgreSQL real con Testcontainers
  - Tests: crear, editar, eliminar producto en BD real; paginación; búsqueda y filtros

- [ ] **Escribir 10 escenarios de API testing**
  - `POST` válido → 201; `POST` inválido → 400/422
  - `GET` sin token → 401; con token sin permiso → 403
  - Validación de contratos: respuesta coincide con el schema OpenAPI

- [ ] **Dockerizar Flask y actualizar Docker Compose**
  - Crear `Dockerfile` para Flask (multi-stage build recomendado)
  - Actualizar `docker-compose.yml` con servicios: `flask-app`, `postgres`, `keycloak`

- [ ] **Abrir PR #2 con los tests y la dockerización**

---

### Día 6 · Semana 2 — GitHub Actions, Jenkins y Grafana inicial

**Rama sugerida:** `feature/cicd-grafana`

- [ ] **Crear pipeline GitHub Actions con build y tests automáticos**
  - Archivo `.github/workflows/ci.yml`
  - Steps: checkout → instalar dependencias → unit tests → integration tests → publicar reporte de cobertura

- [ ] **Crear pipeline Jenkins funcional**
  - `Jenkinsfile` con stages: Checkout, Build, Unit Tests, Integration Tests
  - Verificar que los stages se visualizan en Blue Ocean o Stage View

- [ ] **Configurar Grafana con primer dashboard operativo**
  - Agregar Prometheus y Grafana al `docker-compose.yml`
  - Instalar `prometheus-flask-exporter` para exponer métricas de la app
  - Crear dashboard básico en Grafana: request rate y latencia promedio

---

### Día 7 · Semana 3 — Frontend Vue: Setup, CRUD y Playwright

**Rama sugerida:** `feature/vue-frontend-playwright`

- [ ] **Crear proyecto Vue 3 con Vite y configurar routing + auth**
  - `npm create vue@latest` (Vue 3 + Vue Router + Pinia)
  - Instalar `axios` y Keycloak JS adapter
  - Configurar rutas: `/login`, `/dashboard`, `/productos`, `/stock`
  - Implementar login OAuth2 que redirige a Keycloak

- [ ] **Implementar UI completa del CRUD de Producto**
  - Componente `ProductList`: tabla, paginación y búsqueda
  - Componente `ProductForm`: crear y editar
  - Eliminar producto con modal de confirmación
  - Dockerizar Vue (nginx + build) y agregarlo al `docker-compose.yml`

- [ ] **Automatizar login y CRUD de Producto con Playwright**
  - `npm install @playwright/test && npx playwright install`
  - Test: flujo de login completo con Keycloak
  - Tests: crear, ver, editar y eliminar un producto desde la UI

- [ ] **Verificar que el repositorio tiene 15+ commits con Conventional Commits y 2+ PRs cerrados**

---

## Parte II — Proyecto Final (Días 8 – 20)

> Trabajar después de aprobado el Avance.

---

### Día 8 · Semana 3 — Control de Stock: Backend y tests

**Rama sugerida:** `feature/stock-control`

- [ ] **Implementar módulo de Control de Stock en Flask**
  - `StockService`: `entrada_stock`, `salida_stock`, `ajuste_stock`
  - Validar que salida no deje stock negativo
  - Lógica de alerta: si `cantidad <= stock_min`, marcar producto como crítico

- [ ] **Exponer endpoints de stock y protegerlos con permisos**
  - `POST /api/stock/entrada` y `POST /api/stock/salida` → requieren `stock:manage`
  - `GET /api/stock/historial` (filtros por fecha y producto) → `stock:view`
  - `GET /api/stock/criticos` → `stock:view`

- [ ] **Agregar tests unitarios y de integración para Stock**
  - Unit tests: `StockService` (entrada, salida, ajuste, alerta de stock mínimo)
  - Integration tests con Testcontainers: endpoints de stock con datos reales

---

### Día 9 · Semana 3 — Permisos granulares completos y Seguridad avanzada

**Rama sugerida:** `feature/granular-permissions`

- [ ] **Implementar y verificar los permisos restantes de la matriz**
  - Proteger `/api/reports` con `report:view`, `/api/audit` con `audit:view`, `/api/users` con `user:manage`
  - Verificar que ningún endpoint valida solo el rol — siempre el permiso específico
  - Tests: token de `empleado` en ruta de admin → 403; token expirado → 401

- [ ] **Agregar hardening de seguridad a la aplicación**
  - Cabeceras HTTP: `Strict-Transport-Security`, `X-Frame-Options`, `X-Content-Type-Options`
  - Rate limiting con `flask-limiter` para prevenir abuso de endpoints
  - Validar que CORS rechaza peticiones de orígenes no permitidos

---

### Día 10 · Semana 4 — Frontend Vue: Dashboard, Stock y navegación completa

**Rama sugerida:** `feature/vue-dashboard-stock`

- [ ] **Construir Dashboard principal con métricas del negocio**
  - Cards: total productos, productos críticos, últimos movimientos de stock
  - Gráfico de productos más movidos (Chart.js o Recharts)
  - Indicadores operacionales y KPIs

- [ ] **Implementar UI de Control de Stock**
  - Componente para registrar entradas y salidas de stock
  - Historial de movimientos con filtros por fecha y producto
  - Badge rojo en productos con stock crítico (`cantidad <= stock_min`)

- [ ] **Pulir UX, accesibilidad y responsive design**
  - `aria-labels` y navegación por teclado en componentes críticos
  - Responsive en 1024px y 1440px
  - Manejo de sesión: logout y redirección automática si el token expira

- [ ] **Ampliar Playwright: stock, responsive y screenshots**
  - Test: flujo completo de registro de stock y verificación en historial
  - Tests en viewport 375px (mobile) y 768px (tablet)
  - Screenshots automáticos en pasos críticos como evidencia

---

### Día 11 · Semana 4 — Contract Testing y Performance Testing con k6

**Rama sugerida:** `feature/contract-performance-tests`

- [ ] **Contract Testing con Schemathesis contra el spec OpenAPI**
  - `pip install schemathesis`; ejecutar contra `/api/openapi.json`
  - Corregir discrepancias entre la especificación y la implementación real

- [ ] **Implementar performance testing con k6**
  - Load test: `GET /api/products` con 50 usuarios virtuales, 2 minutos
  - Stress test: escalar a 200 usuarios y medir punto de quiebre
  - Concurrent test: `POST /api/stock` con múltiples usuarios simultáneos

- [ ] **Analizar resultados y documentar criterios de aceptación**
  - Reporte HTML de k6 con p50, p95, p99, error rate y throughput
  - Criterio mínimo: p95 < 500ms en condiciones de load test normal
  - Documentar hallazgos y cualquier bottleneck identificado

- [ ] **Abrir PR describiendo resultados de performance y correcciones aplicadas**

---

### Día 12 · Semana 4 — Security Testing: OWASP ZAP y Dependency Check

**Rama sugerida:** `feature/security-testing`

- [ ] **Ejecutar OWASP ZAP contra el sistema en staging**
  - `docker run owasp/zap2docker-stable zap-api-scan.py -t http://staging/api/openapi.json`
  - Clasificar hallazgos: Critical, High, Medium, Low
  - Corregir todos los hallazgos Critical y High

- [ ] **Ejecutar análisis de dependencias y validar JWT**
  - `snyk test` o `pip-audit` para detectar CVEs en dependencias Python
  - Actualizar dependencias con vulnerabilidades críticas
  - Test manual: enviar token manipulado → debe retornar 401

- [ ] **Integrar security scans al pipeline y documentar hallazgos**
  - Agregar step de Snyk/safety al GitHub Actions workflow
  - Guardar reportes ZAP y Dependency Check como artefactos del pipeline
  - Documentar vulnerabilidades encontradas, severidad y resolución

---

### Día 13 · Semana 5 — Observabilidad: OpenTelemetry, Loki y Tempo

**Rama sugerida:** `feature/opentelemetry-loki-tempo`

- [ ] **Instrumentar Flask con OpenTelemetry y configurar Alloy**
  - `pip install opentelemetry-sdk opentelemetry-instrumentation-flask opentelemetry-exporter-otlp`
  - Configurar `TracerProvider` con exportador OTLP hacia Alloy (puertos 4317/4318)
  - Instrumentar queries SQLAlchemy para que aparezcan como spans en las trazas

- [ ] **Agregar Alloy, Tempo y Loki al Docker Compose**
  - Verificar que las trazas llegan a Tempo y son visibles en Grafana
  - Configurar logging estructurado en Flask: emitir `traceId`, `spanId`, `correlationId`, usuario y endpoint
  - Enviar logs a Loki vía Alloy y verificar búsqueda en Grafana

- [ ] **Configurar reglas de Alertmanager**
  - Alerta: error rate > 5% en 5 minutos
  - Alerta: latencia p95 > 1 segundo
  - Alerta: fallos de autenticación > 10 en 1 minuto

---

### Día 14 · Semana 5 — Dashboards Grafana y provisioning automático

**Rama sugerida:** `feature/grafana-dashboards`

- [ ] **Crear los 4 dashboards requeridos en Grafana**
  - **Infraestructura**: CPU, memoria, disco y red del host Docker
  - **Aplicación**: request rate, latencia p50/p95/p99, error rate
  - **Negocio**: total productos, movimientos de stock por hora, productos críticos
  - **Seguridad**: intentos de login fallidos, tokens inválidos, accesos 403

- [ ] **Configurar provisioning y verificar que todo levanta solo**
  - Exportar dashboards como JSON en `grafana/dashboards/` del repo
  - Configurar provisioning de Grafana para carga automática al hacer `docker-compose up`
  - Agregar panel de trazas distribuidas: ver request completo con spans de API y BD

- [ ] **Actualizar README con capturas de los dashboards**
  - Verificar que `docker-compose up` levanta todo el stack sin pasos manuales

---

### Día 15 · Semana 5 — SonarQube, Data Testing y Exploratory Testing

**Rama sugerida:** `feature/sonar-data-exploratory`

- [ ] **Integrar SonarQube o SonarCloud al proyecto**
  - Agregar SonarQube al `docker-compose.yml` o conectar SonarCloud con el repo
  - Configurar `sonar-project.properties`; ejecutar análisis y revisar: coverage, bugs, vulnerabilities, code smells, duplicación
  - Corregir issues Blocker/Critical y agregar SonarQube como quality gate en Jenkins

- [ ] **Escribir Data Tests para validar integridad de la base de datos**
  - Test: migraciones se aplican correctamente en BD limpia
  - Test: SKU duplicado falla con constraint unique
  - Test: movimiento de stock sin producto existente falla con FK constraint
  - Crear seeds de datos de prueba y validar que cargan sin errores

- [ ] **Realizar sesión de Manual Exploratory Testing**
  - Escribir exploratory charter: objetivo, área a explorar, tiempo y riesgos a investigar
  - Registrar bugs encontrados como GitHub Issues con pasos para reproducir
  - Documentar escenarios explorados y hallazgos inesperados

---

### Día 16 · Semana 6 — Pipeline CI/CD completo

**Rama sugerida:** `ci/full-pipeline`

- [ ] **Completar pipeline GitHub Actions de extremo a extremo**
  - Stages: checkout → build → unit tests → integration tests → API tests → security scan → Docker build → deploy a staging → E2E tests contra staging
  - Gestionar todos los secrets en GitHub Secrets (sin variables hardcoded)

- [ ] **Completar Jenkinsfile con todos los stages requeridos**
  - Checkout, Build, Unit Tests, Integration Tests, API Tests, E2E Tests, Security Scan, SonarQube Quality Gate, Docker Build, Deploy
  - Pipeline visual completo en Blue Ocean o Stage View

- [ ] **Configurar y verificar los 3 entornos (dev, staging, production)**
  - Entorno staging con `docker-compose` separado: app + BD + Keycloak + observabilidad
  - Confirmar que integration, API y E2E tests se ejecutan contra el sistema **ya desplegado** en staging
  - Configurar entorno production como tercer entorno

---

### Día 17 · Semana 6 — E2E Testing completo con Playwright

**Rama sugerida:** `test/e2e-playwright`

- [ ] **Expandir cobertura E2E con flujos por rol de usuario**
  - Flujo admin: login → CRUD producto → registro de stock → verificar historial
  - Flujo empleado: login → ver productos → intentar crear (debe ver error 403)
  - Test: acceder a URL protegida sin sesión → debe redirigir al login

- [ ] **Agregar responsive testing, screenshots y grabación de video**
  - Tests en viewport 375px (mobile), 768px (tablet) y 1440px (desktop)
  - Screenshots automáticos en cada paso crítico
  - Configurar Playwright para grabar video en caso de falla

- [ ] **Integrar Playwright al pipeline y generar reporte HTML**
  - Agregar step de Playwright a GitHub Actions y Jenkins
  - Publicar reporte HTML con resultados, screenshots y videos como artefacto del pipeline

---

### Día 18 · Semana 6 — Documentación técnica completa

**Rama sugerida:** `docs/technical-docs`

- [ ] **Escribir documento de Requisitos Funcionales y No Funcionales**

- [ ] **Crear diagramas técnicos del sistema**
  - Arquitectura: componentes y relaciones
  - Despliegue: containers Docker, puertos y redes
  - Seguridad: flujo OAuth2/JWT entre Vue, Flask y Keycloak
  - Observabilidad: flujo de datos desde la app hasta Grafana

- [ ] **Escribir guía de instalación y manual de mantenimiento**
  - Prerrequisitos, comandos paso a paso y cómo verificar que todo funciona
  - Cómo agregar nuevas migraciones, endpoints y dashboards

- [ ] **Documentar casos de prueba y actualizar el README final**
  - Tabla de casos de prueba con resultado esperado vs resultado real
  - README con badges de CI, cobertura y SonarQube; capturas del sistema funcionando

---

### Día 19 · Semana 7 — Regresión final y cierre técnico

**Rama sugerida:** `fix/regression-cleanup`

- [ ] **Ejecutar suite completa de tests en staging y corregir fallas**
  - Corregir todos los bugs registrados en GitHub Issues
  - Re-ejecutar OWASP ZAP y confirmar que vulnerabilidades críticas fueron resueltas
  - Verificar cobertura final >= 60% y generar reporte definitivo

- [ ] **Verificar que todos los pipelines y quality gates pasan en verde**
  - GitHub Actions: todos los stages en verde
  - Jenkins: pipeline visual sin errores
  - SonarQube: quality gate aprobado (sin Blocker/Critical)

- [ ] **Revisión final de accesibilidad y calidad del frontend**
  - Ejecutar Lighthouse o axe para detectar problemas de accesibilidad
  - Verificar contraste de colores, labels de formularios y navegación por teclado

- [ ] **Verificar participación equitativa y estado del repositorio**
  - Ambos integrantes tienen commits, Issues y PRs aproximadamente iguales
  - Todos los Issues están cerrados o tienen estado actualizado

---

### Día 20 · Semana 7 — Presentación final: Demo funcional

**Rama sugerida:** `docs/final-presentation`

- [ ] **Preparar guión y estructura de la presentación**
  - Resumen del sistema, arquitectura, decisiones técnicas y desafíos encontrados
  - Cronometrar el demo para ajustarlo al tiempo disponible en clase

- [ ] **Ensayar el demo en vivo del sistema completo**
  - Login con Keycloak → CRUD de producto → movimiento de stock → alerta de stock mínimo
  - Mostrar dashboards Grafana con datos en tiempo real mientras se usa el sistema
  - Mostrar trazas distribuidas en Grafana/Tempo para una petición completa

- [ ] **Preparar evidencias de calidad y CI/CD para mostrar**
  - Pipeline GitHub Actions + Jenkins ejecutándose (o con resultado reciente)
  - Reporte SonarQube, cobertura de tests y reporte OWASP ZAP
  - Reporte de Playwright con screenshots como evidencia de E2E testing

- [ ] **Verificaciones finales antes de presentar**
  - Repositorio GitHub público y accesible
  - README actualizado con toda la información
  - `docker-compose up` levanta el sistema completo sin errores

---

## 📊 Rúbrica de Evaluación

| Área | % | Criterios principales |
|------|---|-----------------------|
| Funcionalidad | 15% | CRUD productos, control de stock, alertas, historial, dashboard |
| Testing | 20% | Unit, integration, API/contract, E2E, security, performance, data, exploratory |
| Seguridad | 10% | Keycloak, OAuth2, JWT, permisos granulares, OWASP ZAP |
| Observabilidad | 15% | OpenTelemetry, Prometheus, Loki, Tempo, 4 dashboards Grafana, Alertmanager |
| CI/CD | 15% | GitHub Actions + Jenkins completos, 3 entornos, tests contra staging |
| Calidad de código | 10% | SonarQube: coverage ≥ 60%, bugs, vulnerabilities, code smells, duplicación |
| Documentación | 10% | Requisitos, diagramas, guía instalación, casos de prueba |
| Presentación | 5% | Demo funcional del sistema completo en clase |

---

*Generado para el proyecto final de Aseguramiento de Calidad de Software — PUCMM*
