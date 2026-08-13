import { test, expect } from '@playwright/test'
import { makeToken } from './helpers/jwt'


// Extrae JWT_SECRET desde el .env
const JWT_SECRET = process.env.JWT_SECRET_ACTUAL
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is required. ' +
    'Add it to game_store_frontend/.env or set it as an environment variable.'
  )
}

async function setupAuth(page: any): Promise<void> {
  const token = makeToken(['product:view', 'product:manage'], JWT_SECRET)
  await page.goto('/login')
  await page.evaluate((t: string) => {
    localStorage.setItem('session_token', t)
  }, token)
}

function mockProductList(route: any): void {
  route.fulfill({
    status: 200,
    headers: { 'x-total-pages': '1' },
    body: JSON.stringify([]),
  })
}


test.describe('Productos', () => {
  test.beforeEach(async ({ page }) => {
    await setupAuth(page)
    // Mock GET list de productos (el más llamado)
    await page.route('**/api/products?*', mockProductList)
    await page.route('**/api/products', (route) => {
      if (route.request().method() === 'GET') {
        mockProductList(route)
      } else {
        route.continue()
      }
    })
  })

  test('navegar desde dashboard a la pagina de productos', async ({ page }) => {
    // Mock dashboard APIs necesarias
    await page.route('**/api/products**', mockProductList)
    await page.route('**/api/stocks/criticos', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify([]) })
    )

    await page.route('**/api/stocks/historial', (route) =>
      route.fulfill({ status: 200, body: JSON.stringify([]) }) )

    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    await page.getByRole('link', { name: 'Gestionar productos' }).click()
    await page.waitForURL('/productos')

    await expect(
        page.getByRole('heading', { name: 'Productos' })
    ).toBeVisible()
  })

    test('crear un producto exitosamente', async ({ page }) => {
    // Mock: lista vacía inicial
    await page.route('**/api/products**', async (route) => {
        await route.fulfill({
        status: 200,
        headers: { 'x-total-pages': '1' },
        body: JSON.stringify([]),
        })
    })

    await page.goto('/productos')
    await page.waitForLoadState('networkidle')

    // Abrir modal de nuevo producto
    await page.getByRole('button', { name: 'Nuevo producto' }).click()
    await page.waitForSelector('#product-name')

    // Llenar formulario
    await page.fill('#product-name', 'Laptop Gamer')
    await page.fill('#product-sku', 'LAP-001')
    await page.fill('#product-description', 'Laptop de alta gama')
    await page.fill('#product-category', 'Electrónica')
    await page.fill('#product-price', '1500')
    await page.fill('#product-quantity', '10')
    await page.fill('#product-min-stock', '2')

    // Mock POST de creación
    await page.route('**/api/products', async (route) => {
        if (route.request().method() === 'POST') {
        await route.fulfill({
            status: 201,
            body: JSON.stringify({
            id: 1, name: 'Laptop Gamer', sku: 'LAP-001',
            price: '1500.00', quantity: 10, status: 'active',
            }),
        })
        }
    })

    // Hacer clic en "Crear producto"
    await page.getByRole('button', { name: 'Crear producto' }).click()

    // Verificar mensaje de éxito
    await expect(page.getByText('Producto creado correctamente')).toBeVisible()
    })


})
