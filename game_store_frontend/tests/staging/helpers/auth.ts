import { expect, type Page } from '@playwright/test'

/**
 * Utilidades de autenticación para el E2E de staging.
 *
 * El login es REAL: se navega a Keycloak, se rellena el formulario y se vuelve
 * al callback del frontend. No se usa `page.route()` ni se inyectan tokens
 * falsos en `localStorage`.
 */

export const stagingBaseUrl = (
  process.env.STAGING_URL ||
  process.env.BASE_URL ||
  ''
).replace(/\/$/, '')

export const hasStagingUrl = Boolean(stagingBaseUrl)
export const qaUsername = process.env.QA_USERNAME || 'qa-admin'
export const qaPassword = process.env.QA_PASSWORD || ''
export const hasQaCredentials = Boolean(qaPassword)

/** URL de Keycloak; por defecto se deriva del host público en el puerto 8443. */
export function keycloakBaseUrl(): string {
  const configured = process.env.KEYCLOAK_URL
  if (configured) {
    return configured.replace(/\/$/, '')
  }

  const parsed = new URL(stagingBaseUrl)
  return `${parsed.protocol}//${parsed.hostname}:8443`
}

async function fillKeycloakForm(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  const usernameInput = page
    .locator('#username, input[name="username"]')
    .first()
  const passwordInput = page
    .locator('#password, input[name="password"]')
    .first()

  await expect(usernameInput).toBeVisible({ timeout: 30_000 })
  await usernameInput.fill(username)
  await passwordInput.fill(password)

  const submitButton = page
    .locator('#kc-login, button[type="submit"], input[type="submit"]')
    .first()
  await submitButton.click()
}

/**
 * Inicia el flujo desde `/login`, espera a Keycloak y envía las credenciales.
 * No espera al dashboard: sirve también para probar credenciales inválidas.
 */
export async function submitKeycloakLogin(
  page: Page,
  username: string,
  password: string,
): Promise<void> {
  await page.goto('/login')
  await expect(
    page.getByRole('heading', { name: 'Game Store Inventory' }),
  ).toBeVisible()

  await page.getByRole('button', { name: 'Iniciar sesión' }).click()
  await page.waitForURL(
    /\/realms\/game-store\/protocol\/openid-connect\/auth/,
    { timeout: 30_000 },
  )

  await fillKeycloakForm(page, username, password)
}

/**
 * Login completo con el usuario QA.
 * Resultado esperado: la aplicación queda en `/dashboard` con el token de
 * sesión guardado en `localStorage`.
 */
export async function loginWithQaUser(page: Page): Promise<void> {
  if (!hasQaCredentials) {
    throw new Error(
      'QA_PASSWORD no está configurado: no se puede ejecutar el login real.',
    )
  }

  await submitKeycloakLogin(page, qaUsername, qaPassword)
  await page.waitForURL(/\/dashboard\/?$/, { timeout: 60_000 })
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible()

  const token = await page.evaluate(() =>
    window.localStorage.getItem('session_token'),
  )
  expect(token, 'El login no guardó session_token').toBeTruthy()
}

/**
 * Cierra la sesión desde el dashboard.
 *
 * El frontend cierra la sesión local y redirige al endpoint de logout de
 * Keycloak. Si Keycloak muestra una pantalla de confirmación, se acepta.
 */
export async function logoutFromDashboard(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Cerrar sesión' }).click()

  // Puede navegar a Keycloak o directamente a /login.
  await page
    .waitForURL((url) => !url.pathname.startsWith('/dashboard'), {
      timeout: 30_000,
    })
    .catch(() => undefined)

  await page.waitForTimeout(1_000)

  if (page.url().includes('logout')) {
    const confirmButton = page
      .locator(
        '#kc-logout, input[name="logout"], button[type="submit"], ' +
          'button:has-text("Logout"), button:has-text("Cerrar sesión")',
      )
      .first()

    if (await confirmButton.isVisible().catch(() => false)) {
      await confirmButton.click()
    }
  }

  await page.waitForURL(/\/login\/?$/, { timeout: 30_000 })
  await expect(
    page.getByRole('heading', { name: 'Game Store Inventory' }),
  ).toBeVisible()
}
