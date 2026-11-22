import { expect, test, type Page } from '@playwright/test'

import {
  createProductViaApi,
  deleteProductViaApi,
  getProductViaApi,
  getStockHistory,
  productPayload,
  type Product,
} from './helpers/api'
import {
  hasQaCredentials,
  hasStagingUrl,
  loginWithQaUser,
} from './helpers/auth'

/**
 * Movimientos de stock contra el frontend y la API reales.
 *
 * Se valida la UI (formulario, mensajes y panel de críticos) y también el
 * efecto en PostgreSQL mediante consultas posteriores a la API.
 */

const createdProductIds: number[] = []

async function openStockPage(page: Page): Promise<void> {
  await page.goto('/stock')
  await expect(
    page.getByRole('heading', { name: 'Control de stock' }),
  ).toBeVisible()
}

async function selectProduct(page: Page, product: Product): Promise<void> {
  await page.locator('#movement-product').selectOption(String(product.id))
  await expect(page.locator('.selected-product')).toContainText('Stock actual')
}

async function registerMovement(
  page: Page,
  type: 'entrada' | 'salida' | 'ajuste',
  value: number,
  motive: string,
): Promise<void> {
  await page.locator(`input[type="radio"][value="${type}"]`).check()
  await page.locator('#movement-value').fill(String(value))
  await page.locator('#movement-motive').fill(motive)
  await page.getByRole('button', { name: 'Registrar movimiento' }).click()
}

test.beforeEach(async ({ page }) => {
  test.skip(
    !hasStagingUrl,
    'STAGING_URL/BASE_URL no configurado: se omite el E2E de staging.',
  )
  test.skip(
    !hasQaCredentials,
    'QA_PASSWORD no configurado: se omite el E2E autenticado.',
  )

  await loginWithQaUser(page)
})

test.afterEach(async ({ page }) => {
  for (const productId of createdProductIds.splice(0)) {
    // Los productos con movimientos no se pueden borrar por la FK; se ignora.
    await deleteProductViaApi(page, productId).catch(() => 0)
  }
})

test.describe('stock', () => {
  /**
   * Qué prueba: que la página de stock cargue sus paneles principales.
   * Resultado esperado: heading, panel de críticos e historial visibles.
   */
  test('carga el panel de stock', async ({ page }) => {
    await openStockPage(page)

    await expect(page.locator('.critical-panel')).toBeVisible()
    await expect(page.locator('.history-panel')).toBeVisible()
    await expect(
      page.getByRole('button', { name: 'Registrar movimiento' }),
    ).toBeVisible()
  })

  /**
   * Qué prueba: registrar una entrada desde el formulario.
   * Resultado esperado: mensaje de éxito, cantidad 8 en la API y movimiento
   * "entrada" en el historial.
   */
  test('registra una entrada y actualiza el stock', async ({ page }) => {
    const payload = productPayload({ quantity: 5, min_stock: 1 })
    const product = await createProductViaApi(page, payload)
    createdProductIds.push(product.id)

    await openStockPage(page)
    await selectProduct(page, product)

    await registerMovement(page, 'entrada', 3, 'Reposición E2E')

    await expect(
      page.getByText('El movimiento de stock fue registrado correctamente.'),
    ).toBeVisible({ timeout: 20_000 })

    const persisted = await getProductViaApi(page, product.id)
    expect(persisted.quantity).toBe(8)

    const history = await getStockHistory(page, product.id)
    expect(
      history.some(
        (movement) =>
          movement.type_movement === 'entrada' &&
          movement.amount === 3 &&
          movement.stock_after === 8,
      ),
    ).toBe(true)
  })

  /**
   * Qué prueba: registrar una salida desde el formulario.
   * Resultado esperado: cantidad 6 en la API y movimiento "salida".
   */
  test('registra una salida y descuenta el stock', async ({ page }) => {
    const payload = productPayload({ quantity: 10, min_stock: 1 })
    const product = await createProductViaApi(page, payload)
    createdProductIds.push(product.id)

    await openStockPage(page)
    await selectProduct(page, product)

    await registerMovement(page, 'salida', 4, 'Venta E2E')

    await expect(
      page.getByText('El movimiento de stock fue registrado correctamente.'),
    ).toBeVisible({ timeout: 20_000 })

    const persisted = await getProductViaApi(page, product.id)
    expect(persisted.quantity).toBe(6)

    const history = await getStockHistory(page, product.id)
    expect(
      history.some(
        (movement) =>
          movement.type_movement === 'salida' && movement.amount === 4,
      ),
    ).toBe(true)
  })

  /**
   * Qué prueba: que una salida mayor al stock disponible muestre el error del
   * backend y no modifique la cantidad.
   * Resultado esperado: alerta con "Stock insuficiente" y cantidad 1.
   */
  test('rechaza una salida sin stock suficiente', async ({ page }) => {
    const payload = productPayload({ quantity: 1, min_stock: 0 })
    const product = await createProductViaApi(page, payload)
    createdProductIds.push(product.id)

    await openStockPage(page)
    await selectProduct(page, product)

    await registerMovement(page, 'salida', 5, 'Salida inválida E2E')

    const errorAlert = page.locator('.app-alert-error').first()
    await expect(errorAlert).toBeVisible({ timeout: 20_000 })
    await expect(errorAlert).toContainText(/insuficiente/i)

    const persisted = await getProductViaApi(page, product.id)
    expect(persisted.quantity).toBe(1)
  })

  /**
   * Qué prueba: que un producto con stock por debajo del mínimo aparezca en
   * el panel de productos críticos.
   * Resultado esperado: nombre y SKU visibles dentro de `.critical-panel`.
   */
  test('muestra el producto crítico en el panel', async ({ page }) => {
    const payload = productPayload({ quantity: 0, min_stock: 2 })
    const product = await createProductViaApi(page, payload)
    createdProductIds.push(product.id)

    await openStockPage(page)

    const criticalPanel = page.locator('.critical-panel')
    await expect(criticalPanel).toContainText(product.name)
    await expect(criticalPanel).toContainText(product.sku)
  })
})
