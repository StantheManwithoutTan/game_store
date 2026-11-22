import { expect, test, type Page } from '@playwright/test'

import {
  createProductViaApi,
  deleteProductViaApi,
  findProductBySku,
  getProductViaApi,
  productPayload,
  type ProductPayload,
} from './helpers/api'
import {
  hasQaCredentials,
  hasStagingUrl,
  loginWithQaUser,
} from './helpers/auth'

/**
 * CRUD de productos contra el frontend y la API reales.
 *
 * Cada prueba prepara sus datos por API y limpia al final. La UI se usa para
 * la acción que se quiere validar, no para montar el escenario.
 */

const createdProductIds: number[] = []

function productRow(page: Page, sku: string) {
  return page
    .locator('table.products-table tbody tr')
    .filter({ hasText: sku })
}

async function fillProductForm(
  page: Page,
  payload: ProductPayload,
): Promise<void> {
  await page.locator('#product-name').fill(payload.name)
  await page.locator('#product-sku').fill(payload.sku)
  await page.locator('#product-description').fill(payload.description)
  await page.locator('#product-category').fill(payload.category)
  await page.locator('#product-price').fill(payload.price)
  await page.locator('#product-quantity').fill(String(payload.quantity))
  await page.locator('#product-min-stock').fill(String(payload.min_stock))
  await page.locator('#product-status').selectOption(payload.status)
}

async function searchForProduct(page: Page, sku: string): Promise<void> {
  await page.locator('#product-search').fill(sku)
  await expect(productRow(page, sku)).toBeVisible({ timeout: 15_000 })
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
    await deleteProductViaApi(page, productId).catch(() => 0)
  }
})

test.describe('productos', () => {
  /**
   * Qué prueba: crear un producto desde el formulario del frontend.
   * Resultado esperado: mensaje "Producto creado correctamente." y la fila
   * visible al buscar por SKU.
   */
  test('crea un producto desde la UI', async ({ page }) => {
    const payload = productPayload()

    await page.goto('/productos')
    await expect(page.getByRole('heading', { name: 'Productos' })).toBeVisible()

    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await fillProductForm(page, payload)
    await page.getByRole('button', { name: 'Crear producto' }).click()

    await expect(
      page.getByText('Producto creado correctamente.'),
    ).toBeVisible({ timeout: 20_000 })

    await searchForProduct(page, payload.sku)

    const created = await findProductBySku(page, payload.sku)
    expect(created).not.toBeNull()
    if (created) {
      createdProductIds.push(created.id)
    }
  })

  /**
   * Qué prueba: que el buscador filtre por SKU usando la API real.
   * Resultado esperado: solo la fila del producto buscado.
   */
  test('busca un producto por SKU', async ({ page }) => {
    const payload = productPayload()
    const created = await createProductViaApi(page, payload)
    createdProductIds.push(created.id)

    await page.goto('/productos')
    await searchForProduct(page, payload.sku)

    await expect(productRow(page, payload.sku)).toHaveCount(1)
    await expect(productRow(page, payload.sku)).toContainText(payload.name)
  })

  /**
   * Qué prueba: editar el nombre de un producto desde la tabla.
   * Resultado esperado: mensaje "Producto actualizado correctamente." y el
   * nuevo nombre persistido en la API.
   */
  test('edita un producto desde la UI', async ({ page }) => {
    const payload = productPayload()
    const created = await createProductViaApi(page, payload)
    createdProductIds.push(created.id)

    await page.goto('/productos')
    await searchForProduct(page, payload.sku)

    await productRow(page, payload.sku)
      .getByRole('button', { name: 'Editar' })
      .click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Editar producto')).toBeVisible()

    const newName = `${payload.name} actualizado`
    await page.locator('#product-name').fill(newName)
    await page.getByRole('button', { name: 'Actualizar producto' }).click()

    await expect(
      page.getByText('Producto actualizado correctamente.'),
    ).toBeVisible({ timeout: 20_000 })

    await searchForProduct(page, payload.sku)
    await expect(productRow(page, payload.sku)).toContainText(newName)

    const persisted = await getProductViaApi(page, created.id)
    expect(persisted.name).toBe(newName)
  })

  /**
   * Qué prueba: eliminar un producto aceptando el diálogo de confirmación.
   * Resultado esperado: mensaje "Producto eliminado correctamente." y la fila
   * desaparece de la tabla.
   */
  test('elimina un producto desde la UI', async ({ page }) => {
    const payload = productPayload()
    const created = await createProductViaApi(page, payload)
    createdProductIds.push(created.id)

    await page.goto('/productos')
    await searchForProduct(page, payload.sku)

    page.once('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm')
      await dialog.accept()
    })

    await productRow(page, payload.sku)
      .getByRole('button', { name: 'Eliminar' })
      .click()

    await expect(
      page.getByText('Producto eliminado correctamente.'),
    ).toBeVisible({ timeout: 20_000 })

    await expect(productRow(page, payload.sku)).toHaveCount(0, {
      timeout: 15_000,
    })
  })

  /**
   * Qué prueba: que el backend rechace un SKU duplicado y el frontend muestre
   * el mensaje de error sin cerrar el formulario.
   * Resultado esperado: alerta con "Product SKU already exists" y modal abierto.
   */
  test('muestra el error de SKU duplicado', async ({ page }) => {
    const payload = productPayload()
    const created = await createProductViaApi(page, payload)
    createdProductIds.push(created.id)

    await page.goto('/productos')
    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    await fillProductForm(page, {
      ...productPayload(),
      sku: payload.sku,
    })
    await page.getByRole('button', { name: 'Crear producto' }).click()

    const errorAlert = page.locator('.app-alert-error').first()
    await expect(errorAlert).toBeVisible({ timeout: 20_000 })
    await expect(errorAlert).toContainText(/already exists/i)

    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('button', { name: 'Cancelar' }).click()
  })
})
