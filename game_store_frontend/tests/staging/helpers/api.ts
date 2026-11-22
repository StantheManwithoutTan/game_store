import { expect, type Page } from '@playwright/test'

/**
 * Utilidades para preparar y verificar datos por API durante el E2E.
 *
 * Se usa `page.request`, que comparte el `baseURL` de la configuración. La
 * autenticación se toma del `session_token` real guardado por el frontend,
 * por lo que también se valida el token emitido por el backend.
 */

export interface ProductPayload {
  name: string
  sku: string
  description: string
  category: string
  price: string
  quantity: number
  min_stock: number
  status: 'active' | 'inactive' | 'discontinued'
}

export interface Product {
  id: number
  name: string
  sku: string
  description: string | null
  category: string | null
  price: string
  quantity: number
  min_stock: number
  status: string
  critico_stock: boolean
}

export function uniqueSku(prefix = 'QA'): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now()}-${random}`.toUpperCase()
}

export function productPayload(
  overrides: Partial<ProductPayload> = {},
): ProductPayload {
  const sku = overrides.sku || uniqueSku('QA')

  return {
    name: `Producto E2E ${sku}`,
    sku,
    description: 'Producto creado por Playwright en staging',
    category: 'qa',
    price: '29.99',
    quantity: 5,
    min_stock: 1,
    status: 'active',
    ...overrides,
  }
}

/** Recupera el JWT de sesión que el frontend guardó tras el login real. */
export async function getSessionToken(page: Page): Promise<string> {
  const token = await page.evaluate(() =>
    window.localStorage.getItem('session_token'),
  )

  expect(token, 'No hay session_token en localStorage').toBeTruthy()
  return token as string
}

async function authHeaders(page: Page): Promise<Record<string, string>> {
  return { Authorization: `Bearer ${await getSessionToken(page)}` }
}

/** Crea un producto con el token de la sesión actual. */
export async function createProductViaApi(
  page: Page,
  payload: ProductPayload,
): Promise<Product> {
  const response = await page.request.post('/api/products/', {
    headers: await authHeaders(page),
    data: payload,
  })

  expect(
    response.status(),
    `No se pudo crear el producto: ${await response.text()}`,
  ).toBe(201)

  return (await response.json()) as Product
}

/** Elimina un producto; devuelve el status para limpieza tolerante a fallos. */
export async function deleteProductViaApi(
  page: Page,
  productId: number,
): Promise<number> {
  const token = await getSessionToken(page).catch(() => null)
  if (!token) {
    return 0
  }

  const response = await page.request.delete(`/api/products/${productId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return response.status()
}

/** Consulta un producto por id. */
export async function getProductViaApi(
  page: Page,
  productId: number,
): Promise<Product> {
  const response = await page.request.get(`/api/products/${productId}`, {
    headers: await authHeaders(page),
  })

  expect(
    response.status(),
    `No se pudo consultar el producto ${productId}`,
  ).toBe(200)

  return (await response.json()) as Product
}

/** Busca un producto por SKU exacto usando el filtro de la API. */
export async function findProductBySku(
  page: Page,
  sku: string,
): Promise<Product | null> {
  const response = await page.request.get('/api/products/', {
    headers: await authHeaders(page),
    params: { search: sku, per_page: 100 },
  })

  expect(response.status(), 'No se pudo buscar el producto').toBe(200)
  const products = (await response.json()) as Product[]
  return products.find((product) => product.sku === sku) ?? null
}

/**
 * Emite un token con roles específicos usando `/api/test-tools/token`.
 * El token administrativo de la sesión real es la llave de arranque.
 */
export async function mintRoleToken(
  page: Page,
  roles: string[],
): Promise<string> {
  const response = await page.request.post('/api/test-tools/token', {
    headers: await authHeaders(page),
    data: { roles, expires_minutes: 15 },
  })

  expect(
    response.status(),
    `No se pudo emitir el token de prueba: ${await response.text()}`,
  ).toBe(201)

  const body = (await response.json()) as { token: string }
  return body.token
}

/** Historial de movimientos de un producto. */
export async function getStockHistory(
  page: Page,
  productId: number,
): Promise<Array<Record<string, unknown>>> {
  const response = await page.request.get('/api/stocks/historial', {
    headers: await authHeaders(page),
    params: { product_id: productId },
  })

  expect(response.status(), 'No se pudo consultar el historial').toBe(200)
  return (await response.json()) as Array<Record<string, unknown>>
}
