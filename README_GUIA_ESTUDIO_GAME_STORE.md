# Game Store — Guía de estudio y defensa técnica

> Guía para comprender, explicar y demostrar el funcionamiento del proyecto **Game Store** durante la presentación.

Repositorio estudiado: [StantheManwithoutTan/game_store](https://github.com/StantheManwithoutTan/game_store/tree/develop)  
Rama utilizada: `develop`  
Última verificación de esta guía: 28 de julio de 2026

---

## 1. Cómo responder cualquier pregunta del profesor

La forma más segura de explicar el proyecto es seguir siempre este orden:

1. **Qué es:** define el concepto en una oración.
2. **Dónde está:** abre el archivo que lo implementa.
3. **Cómo circulan los datos:** sigue el recorrido entre las capas.
4. **Qué resultado produce:** menciona la respuesta HTTP, el cambio visual o el registro en la base de datos.
5. **Qué limitación tiene:** reconoce con honestidad lo que todavía no está completo.

Ejemplo:

> “Axios es la librería que comunica el frontend con Flask mediante HTTP. En `api.ts` se crea una instancia común; su interceptor busca el `session_token` y lo agrega como `Authorization: Bearer`. Flask recibe la petición, valida el JWT y los permisos y, dependiendo del resultado, responde 200, 401 o 403.”

---

## 2. Mapa general del sistema

| Capa | Tecnología | Responsabilidad |
|---|---|---|
| Interfaz | Vue 3 + TypeScript + Vite | Pantallas, formularios, tablas y reactividad |
| Navegación | Vue Router | Cambia de pantalla y bloquea rutas cuando no existe sesión |
| Estado | Pinia | Conserva los datos de autenticación usados por Vue |
| Comunicación | Axios | Envía peticiones HTTP y agrega el JWT |
| Identidad | Keycloak | Autentica usuarios y entrega roles/tokens |
| API | Flask | Expone endpoints, coordina seguridad y devuelve respuestas HTTP |
| Validación | Marshmallow | Valida y serializa los datos de entrada y salida |
| Negocio | `ProductService` y `StockService` | Aplica reglas de productos, stock y auditoría |
| Persistencia | SQLAlchemy + PostgreSQL | Representa las tablas y guarda los datos |
| Calidad | Pytest, Testcontainers y Playwright | Pruebas unitarias, integración, API, permisos y UI |
| Seguridad | JWT, cabeceras, `pip-audit` y ZAP | Control de acceso y análisis de vulnerabilidades |
| Observabilidad | Prometheus, Loki, Tempo, Alloy y Grafana | Métricas, logs, trazas y visualización |

```mermaid
flowchart TD
    A["Usuario en el navegador"] --> B["Vue: vistas y componentes"]
    B --> C["Composables y servicios"]
    C --> D["Axios + JWT"]
    D --> E["Flask: rutas y permisos"]
    E --> F["Servicios de negocio"]
    F --> G["SQLAlchemy + PostgreSQL"]
    H["Keycloak"] --> B
    H --> E
```

### Respuesta oral corta

> “Game Store es una aplicación distribuida. Vue ejecuta la interfaz en el navegador; Axios comunica el frontend con la API Flask; Keycloak autentica al usuario; Flask verifica permisos y aplica las reglas de negocio; y SQLAlchemy persiste los datos en PostgreSQL.”

---

## 3. Cómo se organiza el frontend

| Elemento | Función | Ejemplo |
|---|---|---|
| `views/` | Representa páginas completas | `DashboardView.vue`, `ProductsView.vue` |
| `components/` | Divide una página en partes visuales reutilizables | `DashboardMetrics.vue` |
| `composables/` | Maneja estado reactivo y operaciones de una funcionalidad | `useDashboard.ts`, `useProducts.ts` |
| `services/` | Realiza las peticiones HTTP y transforma respuestas | `dashboardService.ts`, `productService.ts` |
| `stores/` | Mantiene estado global con Pinia | `auth.ts` |
| `router/` | Declara las rutas y controla la navegación | `router/index.ts` |
| `types/` | Define la forma de los datos con TypeScript | `Product`, `StockMovement` |
| `utils/` | Contiene funciones auxiliares | fechas, errores y etiquetas de movimientos |

### ¿Por qué existe esta separación?

> “Aplicamos separación de responsabilidades. La vista organiza la página, los componentes presentan información, el composable controla el estado, y el servicio se comunica con la API. Esto evita archivos gigantes, reduce duplicación y facilita probar o modificar una capa sin reescribir las demás.”

### Inicio de la aplicación

[`main.ts`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/main.ts) hace cuatro cosas:

1. Crea la aplicación Vue desde `App.vue`.
2. Instala Pinia.
3. Instala Vue Router.
4. Monta la aplicación en el elemento HTML `#app`.

```ts
const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
```

[`App.vue`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/App.vue) contiene:

```vue
<template>
  <router-view />
</template>
```

`router-view` es el espacio donde Vue Router renderiza la pantalla correspondiente a la URL actual.

```mermaid
flowchart LR
    A["main.ts"] --> B["Crea Vue"]
    B --> C["Instala Pinia"]
    C --> D["Instala Router"]
    D --> E["App.vue → router-view"]
```

### Aclaraciones importantes

- `main.ts` **no inicializa Axios directamente**. Axios se configura en `services/api.ts` y se utiliza cuando algún servicio hace una petición.
- Pinia **no comprueba la identidad por sí sola**. Guarda el estado de autenticación que recibe el frontend.
- `router/index.ts` **no llama directamente a `app.py`**. Solo controla las rutas del navegador. La comunicación con Flask ocurre cuando Axios envía una petición HTTP.
- Una vista puede navegar mediante `<RouterLink>` sin ejecutar `router.push()` manualmente.

---

## 4. Flujo completo del inicio de sesión

```mermaid
sequenceDiagram
    actor U as Usuario
    participant V as Vue
    participant K as Keycloak
    participant F as Flask
    participant S as LocalStorage

    U->>V: Pulsa Iniciar sesión
    V->>K: Redirección al formulario
    K-->>V: Regresa al callback con code
    V->>F: POST /auth/login con code
    F->>K: Intercambia code por tokens
    K-->>F: ID, access y refresh token
    F-->>V: session_token + usuario
    V->>S: Guarda session_token
    V-->>U: Navega a /dashboard
```

### Paso a paso en el código

1. [`LoginView.vue`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/views/LoginView.vue) construye la URL de autorización y redirige a Keycloak mediante `window.location.href`.
2. Keycloak autentica al usuario y lo devuelve a `/login/callback?code=...`.
3. [`LoginCallback.vue`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/views/LoginCallback.vue) extrae el parámetro `code`.
4. El callback llama a `authStore.loginWithKeycloak(code)`.
5. [`stores/auth.ts`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/stores/auth.ts) envía `POST /auth/login` a Flask.
6. [`backend/app.py`](https://github.com/StantheManwithoutTan/game_store/blob/develop/backend/app.py) intercambia el código con Keycloak, extrae identidad y roles y genera el JWT interno `session_token`.
7. Pinia conserva los datos recibidos y `localStorage` guarda `session_token`.
8. Vue navega a `/dashboard`.

### ¿El callback crea el código?

No. El código lo genera **Keycloak**. `LoginCallback.vue` solamente lo lee de la URL y lo envía al backend.

### Tokens involucrados

| Elemento | Para qué sirve |
|---|---|
| Authorization code | Código temporal que Flask intercambia con Keycloak |
| ID token | Describe la identidad del usuario |
| Access token | Contiene acceso y roles entregados por Keycloak |
| Refresh token | Permite solicitar tokens nuevos o cerrar la sesión en Keycloak |
| `session_token` | JWT interno que el frontend envía a la API Flask |

### Autenticación frente a autorización

- **Autenticación:** responde “¿quién eres?”. La realiza Keycloak.
- **Autorización:** responde “¿qué puedes hacer?”. La aplica Flask mediante permisos.

---

## 5. Protección de rutas, JWT y permisos

### Primera barrera: Vue Router

[`router/index.ts`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/router/index.ts) registra las pantallas:

- `/login`
- `/login/callback`
- `/dashboard`
- `/productos`
- `/stock`

Antes de navegar, `router.beforeEach()` busca `session_token`:

```ts
router.beforeEach((to, _from, next) => {
    const token = localStorage.getItem('session_token')

    if (to.path === '/login' || to.path === '/login/callback') {
        next()
    } else if (!token) {
        next('/login')
    } else {
        next()
    }
})
```

El router solo comprueba que exista un texto guardado. **No valida la firma, la expiración ni los permisos del JWT.**

### Segunda barrera: interceptor de Axios

[`services/api.ts`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/services/api.ts) crea una instancia común de Axios.

Antes de cada petición:

```ts
const token = localStorage.getItem('session_token')

if (token) {
    config.headers.Authorization = `Bearer ${token}`
}
```

La petición viaja de esta manera:

```http
GET /api/stocks/historial
Authorization: Bearer eyJhbGciOiJIUzI1Ni...
```

Si cualquier respuesta devuelve `401`, el interceptor global:

1. Elimina `session_token`.
2. Evita un bucle si ya está en el login.
3. Redirige a `/login`.

### Tercera barrera: Flask

[`backend/decorators.py`](https://github.com/StantheManwithoutTan/game_store/blob/develop/backend/decorators.py) valida:

1. Que exista el encabezado `Authorization: Bearer`.
2. Que el JWT pueda decodificarse con la clave secreta.
3. Que el token no esté vencido.
4. Que el arreglo `roles` contenga el permiso exigido por el endpoint.

### Diferencia entre 401, 403 y 200

| Código | Significado | Comportamiento actual |
|---:|---|---|
| `401 Unauthorized` | Falta el token, está vencido o es inválido | Axios borra la sesión y redirige a `/login` |
| `403 Forbidden` | El token es válido, pero faltan permisos | El usuario permanece autenticado y la vista muestra un error |
| `200 OK` | Token válido y permiso correcto | La operación continúa y se muestran los datos |

> Frase para memorizar: **401 = no puedo validar quién eres; 403 = sé quién eres, pero no puedes hacer esto.**

### Permisos principales

| Permiso | Permite |
|---|---|
| `product:view` | Consultar productos |
| `product:manage` | Crear, editar o eliminar productos |
| `stock:view` | Consultar productos críticos e historial |
| `stock:manage` | Registrar entradas, salidas y ajustes |

Los permisos granulares cumplen el principio de mínimo privilegio: un usuario puede consultar productos sin tener autoridad para modificarlos.

---

## 6. Dashboard: flujo completo de datos

El dashboard no obtiene todo desde un único endpoint. Combina tres peticiones y calcula parte de la información en el frontend.

```mermaid
flowchart TD
    A["Usuario abre /dashboard"] --> B{"¿Existe session_token?"}
    B -->|No| C["Redirección a /login"]
    B -->|Sí| D["DashboardView.vue"]
    D --> E["useDashboard.ts"]
    E --> F["3 peticiones con Axios + JWT"]
    F --> G{"Token y permisos"}
    G -->|401| C
    G -->|403| H["Error dentro del dashboard"]
    G -->|200| I["PostgreSQL → métricas y tablas"]
```

### Recorrido por los archivos

```mermaid
flowchart TD
    A["DashboardView.vue"] --> B["useDashboard.ts"]
    B --> C["dashboardService.ts"]
    C --> D["productService.ts"]
    C --> E["stockService.ts"]
    D --> F["api.ts → Axios + JWT"]
    E --> F
    F --> G["Flask → servicios → PostgreSQL"]
```

1. [`DashboardView.vue`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/views/DashboardView.vue) organiza la pantalla e importa sus componentes.
2. La vista llama a `useDashboard()`.
3. [`useDashboard.ts`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/composables/useDashboard.ts) ejecuta `onMounted(fetchDashboard)`.
4. `fetchDashboard()` activa `loading` y llama a `loadDashboardData()`.
5. [`dashboardService.ts`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/services/dashboardService.ts) realiza tres solicitudes en paralelo con `Promise.all()`.
6. Axios agrega el JWT.
7. Flask valida el token y los permisos.
8. El servicio del dashboard calcula métricas y devuelve un objeto listo para los componentes.
9. `useDashboard.ts` guarda los resultados en referencias reactivas.
10. Vue actualiza automáticamente la pantalla.

### Las tres peticiones

```ts
const [productResult, criticalProducts, movements] =
    await Promise.all([
        getProducts({ page: 1, per_page: 100 }),
        getCriticalProducts(),
        getStockHistory(),
    ])
```

| Petición | Permiso | Resultado |
|---|---|---|
| `GET /api/products` | `product:view` | Primeros 100 productos |
| `GET /api/stocks/criticos` | `stock:view` | Productos con inventario crítico |
| `GET /api/stocks/historial` | `stock:view` | Movimientos de inventario |

`Promise.all()` permite ejecutar las tres peticiones prácticamente al mismo tiempo. Sin embargo, si falla una sola, la carga completa entra al `catch` y no se presentan resultados parciales.

### Estados del dashboard

| Estado | Qué ve el usuario |
|---|---|
| `loading = true` | “Cargando dashboard...” |
| Carga correcta | Métricas, gráfico, críticos y movimientos |
| Listas vacías | Mensajes de estado vacío |
| `403` | Alerta: “No tienes permiso para consultar el dashboard.” |
| Otro error | Mensaje obtenido o mensaje genérico |

### Qué muestran las cuatro tarjetas

Los cálculos están en `dashboardService.ts`; `DashboardMetrics.vue` solamente los presenta.

| Tarjeta | Cálculo |
|---|---|
| Total de productos | `products.length` |
| Productos críticos | `criticalProducts.length` |
| Unidades disponibles | Suma de `product.quantity` |
| Movimientos | `movements.length` |

```ts
metrics: {
    totalProducts: products.length,
    criticalProducts: criticalProducts.length,
    totalUnits: products.reduce(
        (total, product) => total + product.quantity,
        0,
    ),
    totalMovements: movements.length,
}
```

Recorrido:

```text
Flask devuelve listas
        ↓
dashboardService.ts calcula los totales
        ↓
useDashboard.ts guarda los resultados
        ↓
DashboardMetrics.vue los presenta
```

### Lista de productos críticos

[`CriticalProductsList.vue`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/components/dashboard/CriticalProductsList.vue) muestra:

- Nombre.
- SKU.
- Cantidad disponible.
- Stock mínimo.

En el backend, `StockService.criticos()` considera crítico un producto activo cuando:

```python
Product.quantity <= Product.min_stock
```

o cuando `critico_stock` está marcado como verdadero.

Si la lista está vacía se muestra: “No hay productos con stock crítico.”

### Tabla de últimos movimientos

[`RecentMovementsTable.vue`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/components/dashboard/RecentMovementsTable.vue) muestra:

| Columna | Origen |
|---|---|
| Fecha | `movement.created_at` |
| Producto | Nombre asociado a `movement.product_id` |
| Tipo | Entrada, salida o ajuste |
| Cantidad | `movement.amount` |

El backend ordena el historial desde el movimiento más reciente. Después, el frontend conserva solo diez:

```ts
const recentMovements = movements.slice(0, 10)
```

Como cada movimiento trae `product_id` y no necesariamente el nombre, `useDashboard.ts` crea un diccionario reactivo:

```ts
const productNames = computed(() =>
    Object.fromEntries(
        products.value.map((product) => [
            product.id,
            product.name,
        ]),
    ),
)
```

Si no encuentra el producto, la tabla muestra `Producto #<id>`.

### Gráfico de movimientos

[`StockMovementChart.vue`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/components/dashboard/StockMovementChart.vue) usa Chart.js y presenta tres barras:

- Entradas.
- Salidas.
- Ajustes.

El gráfico **cuenta operaciones**, no suma la cantidad de unidades. Además, trabaja con `recentMovements`; por eso representa los tipos de los diez movimientos más recientes, no todo el historial.

### Respuesta oral del dashboard

> “Cuando el usuario abre `/dashboard`, Vue Router comprueba si existe `session_token`. Sin token lo envía al login. Con token carga la vista y `useDashboard` ejecuta tres peticiones paralelas: productos, críticos e historial. Axios agrega el JWT y Flask verifica `product:view` y `stock:view`. Un 401 elimina la sesión y redirige; un 403 mantiene al usuario y muestra un error. Con 200, el frontend calcula cuatro métricas, toma los diez movimientos recientes y llena las tarjetas, el gráfico y las tablas.”

---

## 7. Flujo completo de creación de un producto

Este recorrido conecta prácticamente toda la arquitectura.

```mermaid
flowchart TD
    A["ProductsView.vue"] --> B["useProducts.ts"]
    B --> C["productService.ts"]
    C --> D["Axios + JWT"]
    D --> E["Ruta Flask + permiso"]
    E --> F["ProductSchema"]
    F --> G["ProductService"]
    G --> H["SQLAlchemy → PostgreSQL"]
```

### Paso a paso

1. El usuario completa el formulario en `ProductsView.vue` y pulsa guardar.
2. La vista delega la operación a `saveProduct()` en [`useProducts.ts`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/composables/useProducts.ts).
3. `saveProduct()` decide mediante un `if/else` si debe crear o actualizar.
4. [`productService.ts`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/services/productService.ts) envía `POST /api/products` para crear.
5. `api.ts` agrega `Authorization: Bearer <session_token>`.
6. [`backend/routes.py`](https://github.com/StantheManwithoutTan/game_store/blob/develop/backend/routes.py) exige `product:manage`.
7. `ProductSchema` valida los campos recibidos.
8. [`product_service.py`](https://github.com/StantheManwithoutTan/game_store/blob/develop/backend/services/product_service.py) aplica las reglas de negocio: nombre, SKU, precio, cantidad y duplicados.
9. SQLAlchemy utiliza el modelo `Product` para insertar el registro en PostgreSQL.
10. Flask responde `201 Created`.
11. Vue presenta el mensaje de éxito y vuelve a cargar la lista.

### Aclaración sobre `models.py`

No es correcto decir que “al final el sistema pasa a `models.py` y este carga las tablas”. La explicación precisa es:

> “`models.py` define la representación Python de las tablas. `ProductService` crea o consulta objetos del modelo `Product`, y SQLAlchemy convierte esas operaciones en consultas SQL para PostgreSQL.”

### Respuesta oral corta

> “La vista captura la acción; el composable decide crear o editar; el servicio HTTP envía la petición; Axios agrega el JWT; Flask verifica `product:manage`; Marshmallow valida los campos; `ProductService` aplica las reglas; y SQLAlchemy persiste el producto. Si todo funciona, la API devuelve 201 y la interfaz actualiza la lista.”

---

## 8. Flujo de stock

[`stockService.ts`](https://github.com/StantheManwithoutTan/game_store/blob/develop/game_store_frontend/src/services/stockService.ts) expone cinco operaciones principales:

| Función | Endpoint | Acción |
|---|---|---|
| `registerStockEntry()` | `POST /api/stocks/entrada` | Aumenta existencias |
| `registerStockExit()` | `POST /api/stocks/salida` | Disminuye existencias |
| `registerStockAdjustment()` | `POST /api/stocks/ajuste` | Establece una cantidad corregida |
| `getStockHistory()` | `GET /api/stocks/historial` | Consulta movimientos |
| `getCriticalProducts()` | `GET /api/stocks/criticos` | Consulta inventario crítico |

En una salida, `StockService` compara la cantidad solicitada con la existencia actual. Si intenta retirar más unidades de las disponibles, lanza un error de “Stock insuficiente”. Si es válida:

1. Guarda el stock anterior.
2. Modifica la cantidad del producto.
3. Registra un `StockMovement`.
4. Guarda el stock posterior, el tipo, la cantidad y el motivo.
5. Confirma la transacción.

---

## 9. Backend: lo mínimo que debes dominar

| Archivo | Responsabilidad |
|---|---|
| `app.py` | Crea Flask, configura extensiones, autenticación, CORS, seguridad y telemetría |
| `routes.py` | Define endpoints, permisos y códigos HTTP |
| `decorators.py` | Valida JWT y permisos |
| `schemas.py` | Valida entrada y serializa salida |
| `services/product_service.py` | Reglas de negocio de productos y auditoría |
| `services/stock_service.py` | Reglas de entradas, salidas, ajustes y críticos |
| `models.py` | Define tablas como clases SQLAlchemy |
| `extensions.py` | Declara objetos compartidos como base de datos, migraciones y API |
| `config.py` | Lee configuración y secretos desde el entorno |

### El backend no es una sola “capa de seguridad”

El recorrido correcto es:

```text
Petición HTTP
    ↓
Ruta Flask
    ↓
Decorador de permisos
    ↓
Schema de validación
    ↓
Servicio de negocio
    ↓
Modelo SQLAlchemy
    ↓
PostgreSQL
```

La ruta coordina el proceso; el decorador protege; el schema valida; el servicio decide; y el modelo representa la persistencia.

---

## 10. Pruebas del proyecto

| Tipo | Qué comprueba | Evidencia |
|---|---|---|
| Unitarias | Reglas de un servicio de forma aislada | `test_product_service.py`, `test_stock_service.py` |
| API | Endpoints, datos y códigos HTTP | `test_product_api.py` |
| Permisos | Casos 200, 401, 403 y token vencido | `test_permissions.py` |
| Integración | Flask + SQLAlchemy + PostgreSQL real | `test_product_integration.py` |
| Seguridad | Cabeceras HTTP y CORS | `test_security.py` |
| UI/E2E | Navegación y comportamiento del frontend | `tests/products.spec.ts` |

### ¿Por qué Testcontainers?

> “Testcontainers levanta un PostgreSQL desechable para las pruebas. Así probamos contra el mismo motor de base de datos del proyecto y detectamos diferencias que SQLite podría ocultar.”

### Precisión sobre Playwright

La prueba de productos usa `page.route()` para simular respuestas de la API. Por tanto:

- Sí comprueba navegación, formulario y mensajes de la interfaz.
- No recorre actualmente todo el camino real hasta Flask y PostgreSQL.

Es más preciso describirla como una prueba funcional de la interfaz con API simulada que como una E2E completa del sistema.

---

## 11. Seguridad y OWASP ZAP

### Controles implementados

- Login centralizado con Keycloak.
- JWT interno para acceder a la API.
- Permisos granulares por endpoint.
- Respuestas diferentes para 401 y 403.
- CORS limitado al frontend configurado.
- Rate limiting.
- Cabeceras como HSTS, CSP, `X-Frame-Options` y `X-Content-Type-Options`.
- `pip-audit` para dependencias Python.
- OWASP ZAP para análisis dinámico HTTP.

### Diferencia entre `pip-audit` y ZAP

| Herramienta | Analiza |
|---|---|
| `pip-audit` | Dependencias Python y vulnerabilidades conocidas |
| OWASP ZAP | La aplicación HTTP mientras está ejecutándose |

### ¿Cómo conoce ZAP las rutas?

ZAP comienza desde la URL entregada, visita enlaces y analiza las respuestas que puede descubrir. También puede recibir una especificación OpenAPI para conocer endpoints. Las rutas protegidas requieren configurar autenticación, un contexto o un encabezado `Authorization`.

No se debe afirmar que ZAP “adivina todas las rutas” ni que obtiene automáticamente un token válido.

---

## 12. Observabilidad

| Herramienta | Función |
|---|---|
| Prometheus | Recolecta métricas |
| Loki | Almacena logs |
| Tempo | Almacena trazas |
| Alloy | Recibe y distribuye telemetría |
| Grafana | Visualiza métricas, logs y trazas |
| Alertmanager | Procesa y agrupa alertas |

```mermaid
flowchart TD
    A["Flask + SQLAlchemy"] --> B["OpenTelemetry"]
    B --> C["Alloy"]
    C --> D["Tempo: trazas"]
    C --> E["Loki: logs"]
    A --> F["Prometheus: métricas"]
    D --> G["Grafana"]
    E --> G
    F --> G
```

### Identificadores importantes

- `traceId`: identifica el recorrido completo de una petición.
- `spanId`: identifica una operación concreta dentro de la traza.
- `correlationId`: permite relacionar eventos y logs de una petición desde la aplicación.

El proyecto instrumenta Flask y SQLAlchemy en `backend/telemetry.py`. También define métricas de negocio y seguridad en `backend/metrics.py`, como productos críticos, movimientos, fallos de login, tokens inválidos y accesos prohibidos.

---

## 13. CI/CD

```mermaid
flowchart TD
    A["Push o Pull Request"] --> B["Instalar dependencias"]
    B --> C["Auditar dependencias"]
    C --> D["Ejecutar pruebas y cobertura"]
    D --> E["Levantar aplicación"]
    E --> F["Escaneo con ZAP"]
    A --> G["Workflow Playwright"]
```

GitHub Actions automatiza la integración continua. Los archivos principales son:

- `.github/workflows/ci.yml`
- `.github/workflows/e2e.yml`
- `JenkinsFile`

La respuesta honesta es que el proyecto tiene **CI**, pero no debe afirmarse que ya posee un despliegue automático completo a staging y producción si ese recorrido no aparece implementado en los workflows.

---

## 14. Limitaciones reales que conviene reconocer

Estas observaciones no destruyen la presentación; demostrar que las entiendes aumenta tu credibilidad.

1. El guard de Vue Router comprueba existencia del token, no firma, expiración ni roles.
2. Los permisos reales se protegen en Flask; el frontend no debe considerarse una barrera de seguridad.
3. Un `403` no redirige al login. Muestra un error dentro de la vista.
4. El dashboard necesita `product:view` y `stock:view`; si falla una de las tres peticiones, `Promise.all()` falla completo.
5. “Total de productos” y “Unidades disponibles” se calculan sobre un máximo de 100 productos.
6. El gráfico representa solo los diez movimientos recientes y cuenta operaciones, no unidades.
7. Los botones de productos y stock se muestran aunque el usuario no tenga permiso para ejecutar esas operaciones.
8. Después de recargar el navegador, Pinia recupera `session_token`, pero no necesariamente el objeto `user`; la barra puede mostrar “Usuario”.
9. Playwright simula endpoints de productos y no llega hasta PostgreSQL en esas pruebas.
10. `models.py` describe tablas; no es una pantalla ni un paso que se “ejecute al final”.
11. `router/index.ts` no llama a `app.py`; Axios es quien comunica ambos lados mediante HTTP.
12. En el login actual, el backend decodifica inicialmente tokens de Keycloak sin verificar su firma antes de crear el JWT interno; es un punto de endurecimiento pendiente.

---

## 15. Preguntas probables y respuestas rápidas

### ¿Qué hace Vue?

> “Construye la interfaz reactiva y actualiza la pantalla cuando cambia el estado.”

### ¿Qué hace Pinia?

> “Mantiene estado compartido. En este proyecto se usa principalmente para los datos de autenticación.”

### ¿Qué hace Axios?

> “Envía peticiones HTTP desde Vue hacia Flask. La instancia común agrega el JWT y maneja globalmente los errores 401.”

### ¿Qué hace Vue Router?

> “Relaciona URLs con vistas y evita abrir rutas privadas cuando no existe `session_token`.”

### ¿Por qué no basta con proteger botones en el frontend?

> “Porque el usuario puede modificar el navegador o llamar directamente a la API. La seguridad real debe estar en Flask.”

### ¿Qué hace Keycloak?

> “Autentica al usuario y entrega identidad, tokens y roles mediante OpenID Connect.”

### ¿Qué hace `require_permission`?

> “Extrae el JWT, valida su firma y expiración, obtiene los roles y comprueba que contengan el permiso solicitado.”

### ¿Qué ocurre sin token?

> “Vue Router redirige al login antes de montar una pantalla privada.”

### ¿Qué ocurre con un token inválido o vencido?

> “Flask devuelve 401; Axios elimina la sesión y redirige al login.”

### ¿Qué ocurre sin permisos?

> “Flask devuelve 403. El usuario sigue autenticado, pero la interfaz muestra que no está autorizado.”

### ¿Dónde se calculan las métricas del dashboard?

> “En `dashboardService.ts`. El backend devuelve listas y el frontend calcula los totales.”

### ¿Por qué usar servicios y composables?

> “El servicio se ocupa de HTTP y el composable del estado reactivo y las operaciones de la pantalla. Esa separación reduce acoplamiento.”

### ¿Cómo llega un producto a PostgreSQL?

> “Vista → composable → servicio HTTP → Axios → ruta Flask → permiso → schema → servicio de negocio → modelo SQLAlchemy → PostgreSQL.”

### ¿Qué impide sacar más stock del disponible?

> “`StockService` compara la salida solicitada con la cantidad actual y rechaza la operación si no hay suficiente inventario.”

### ¿Qué diferencia hay entre pruebas unitarias e integración?

> “La unitaria prueba una regla aislada; la de integración prueba varias capas juntas, incluyendo PostgreSQL real mediante Testcontainers.”

### ¿Qué hacen Prometheus, Loki y Tempo?

> “Prometheus maneja métricas, Loki logs y Tempo trazas. Grafana permite consultarlos en un mismo lugar.”

---

## 16. Archivos que debes saber abrir durante la defensa

### Frontend

1. `game_store_frontend/src/main.ts`
2. `game_store_frontend/src/router/index.ts`
3. `game_store_frontend/src/stores/auth.ts`
4. `game_store_frontend/src/services/api.ts`
5. `game_store_frontend/src/views/LoginView.vue`
6. `game_store_frontend/src/views/LoginCallback.vue`
7. `game_store_frontend/src/views/DashboardView.vue`
8. `game_store_frontend/src/composables/useDashboard.ts`
9. `game_store_frontend/src/services/dashboardService.ts`
10. `game_store_frontend/src/composables/useProducts.ts`
11. `game_store_frontend/src/services/productService.ts`

### Backend

1. `backend/app.py`
2. `backend/routes.py`
3. `backend/decorators.py`
4. `backend/schemas.py`
5. `backend/services/product_service.py`
6. `backend/services/stock_service.py`
7. `backend/models.py`
8. `backend/telemetry.py`
9. `backend/metrics.py`

### Calidad y automatización

1. `backend/tests/test_permissions.py`
2. `backend/tests/test_product_integration.py`
3. `game_store_frontend/tests/products.spec.ts`
4. `.github/workflows/ci.yml`
5. `.github/workflows/e2e.yml`
6. `JenkinsFile`

---

## 17. Resumen de un minuto

> “La aplicación inicia en `main.ts`, donde Vue instala Pinia y Vue Router. El router muestra las vistas y exige que exista `session_token` para las rutas privadas. El login redirige a Keycloak; Keycloak devuelve un código; Vue lo envía a Flask; y Flask crea un JWT interno con los roles. Los servicios del frontend usan Axios, cuyo interceptor agrega ese JWT. En el backend, los decoradores validan firma, expiración y permisos; los schemas validan datos; los servicios aplican reglas; y SQLAlchemy persiste en PostgreSQL. El dashboard ejecuta tres GET en paralelo, calcula métricas en el frontend y muestra críticos, movimientos y un gráfico. El proyecto se prueba con Pytest, Testcontainers y Playwright, se analiza con `pip-audit` y ZAP, y se observa con Prometheus, Loki, Tempo y Grafana.”

---

## 18. Orden recomendado para estudiar

1. Inicio de Vue: `main.ts` y `App.vue`.
2. Navegación: `router/index.ts`.
3. Login: `LoginView.vue` → `LoginCallback.vue` → `auth.ts` → `app.py`.
4. Seguridad: `api.ts` → `decorators.py` → 401/403.
5. Dashboard: vista → composable → servicio → tres endpoints → componentes.
6. Producto: vista → composable → servicio → ruta → schema → servicio → modelo.
7. Stock y auditoría.
8. Pruebas.
9. Seguridad dinámica y CI.
10. Observabilidad.

Si puedes explicar sin mirar los flujos de **login**, **dashboard** y **creación de producto**, ya tienes dominada la columna vertebral del sistema.
