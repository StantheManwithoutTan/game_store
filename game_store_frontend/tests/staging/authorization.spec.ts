import { expect, test } from '@playwright/test'

import {
  getSessionToken,
  mintRoleToken,
  productPayload,
} from './helpers/api'
import {
  hasQaCredentials,
  hasStagingUrl,
  loginWithQaUser,
} from './helpers/auth'

/**
 * Autorización del frontend y de la API reales.
 *
 * Se valida que las rutas protegidas redirijan sin sesión, que el token de
 * Keycloak tenga los roles esperados y que los permisos se apliquen también
 * cuando se llama a la API directamente (sin pasar por la UI).
 */

test.beforeEach(() => {
  test.skip(
    !hasStagingUrl,
    'STAGING_URL/BASE_URL no configurado: se omite el E2E de staging.',
  )
})

test.describe('rutas protegidas sin sesión', () => {
  /**
   * Qué prueba: que las rutas privadas no se puedan abrir sin token.
   * Resultado esperado: `/dashboard`, `/productos` y `/stock` terminan en
   * `/login`.
   */
  test('redirige dashboard, productos y stock al login', async ({ page }) => {
    for (const path of ['/dashboard', '/productos', '/stock']) {
      await page.goto(path)
      await page.waitForURL(/\/login\/?$/, { timeout: 15_000 })
      await expect(
        page.getByRole('heading', { name: 'Game Store Inventory' }),
      ).toBeVisible()
    }
  })

  /**
   * Qué prueba: que la API rechace una petición sin token.
   * Resultado esperado: 401 con ``Missing token``.
   */
  test('la API rechaza peticiones sin token', async ({ page }) => {
    const response = await page.request.get('/api/products/')

    expect(response.status()).toBe(401)
    const body = (await response.json()) as { error?: string }
    expect(body.error).toBe('Missing token')
  })
})

test.describe('autorización con sesión real', () => {
  test.skip(
    !hasQaCredentials,
    'QA_PASSWORD no configurado: se omite el E2E autenticado.',
  )

  test.beforeEach(async ({ page }) => {
    await loginWithQaUser(page)
  })

  /**
   * Qué prueba: que el usuario QA pueda abrir la gestión de productos.
   * Resultado esperado: heading "Productos" y tabla (o estado vacío) sin
   * alerta de permisos.
   */
  test('el usuario QA accede a la gestión de productos', async ({ page }) => {
    await page.goto('/productos')

    await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible()
    await expect(
      page.locator('table.products-table, .empty-state').first(),
    ).toBeVisible({ timeout: 20_000 })
    await expect(page.locator('.app-alert-error')).toHaveCount(0)
  })

  /**
   * Qué prueba: que el token de sesión contenga los roles que entrega
   * Keycloak para `store_admin`.
   * Resultado esperado: `/auth/verify` válido y roles de producto/stock.
   */
  test('el token de sesión contiene los roles de Keycloak', async ({ page }) => {
    const token = await getSessionToken(page)

    const response = await page.request.post('/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(response.status()).toBe(200)

    const body = (await response.json()) as {
      valid: boolean
      user: { roles: string[] }
    }
    expect(body.valid).toBe(true)
    expect(body.user.roles).toEqual(
      expect.arrayContaining([
        'product:view',
        'product:manage',
        'stock:view',
        'stock:manage',
      ]),
    )
  })

  /**
   * Qué prueba: que un token de solo lectura pueda consultar productos.
   * Resultado esperado: 200 en `GET /api/products/`.
   */
  test('un token de solo lectura puede listar productos', async ({ page }) => {
    const viewerToken = await mintRoleToken(page, ['product:view'])

    const response = await page.request.get('/api/products/', {
      headers: { Authorization: `Bearer ${viewerToken}` },
    })

    expect(response.status()).toBe(200)
  })

  /**
   * Qué prueba: que un token de solo lectura no pueda crear productos.
   * Resultado esperado: 403 en `POST /api/products/`.
   */
  test('un token de solo lectura no puede crear productos', async ({ page }) => {
    const viewerToken = await mintRoleToken(page, ['product:view'])

    const response = await page.request.post('/api/products/', {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: productPayload(),
    })

    expect(response.status()).toBe(403)
  })

  /**
   * Qué prueba: que la emisión de tokens de prueba exija `user:manage`.
   * Resultado esperado: 403 al llamar a `/api/test-tools/token` con un token
   * de solo lectura.
   */
  test('un token de solo lectura no puede emitir tokens', async ({ page }) => {
    const viewerToken = await mintRoleToken(page, ['product:view'])

    const response = await page.request.post('/api/test-tools/token', {
      headers: { Authorization: `Bearer ${viewerToken}` },
      data: { roles: ['product:view'] },
    })

    expect(response.status()).toBe(403)
  })

  /**
   * Qué prueba: que un token manipulado en localStorage sea rechazado y el
   * frontend limpie la sesión.
   * Resultado esperado: la API responde 401 y la app vuelve a `/login`.
   */
  test('un token manipulado provoca el cierre de sesión', async ({ page }) => {
    await page.evaluate(() => {
      window.localStorage.setItem('session_token', 'token-manipulado')
    })

    await page.goto('/productos')
    await page.waitForURL(/\/login\/?$/, { timeout: 20_000 })

    const token = await page.evaluate(() =>
      window.localStorage.getItem('session_token'),
    )
    expect(token).toBeNull()
  })
})
