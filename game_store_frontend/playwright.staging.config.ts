import { defineConfig, devices } from '@playwright/test'
import { config as loadEnv } from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// Carga variables locales (STAGING_URL, QA_USERNAME, QA_PASSWORD, etc.).
loadEnv()

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
)

// Los resultados se guardan en la raíz del repositorio, no dentro del frontend.
const resultsDir = path.join(projectRoot, 'results', 'frontend')

const baseURL = (
  process.env.STAGING_URL ||
  process.env.BASE_URL ||
  ''
).replace(/\/$/, '')

/**
 * Configuración de Playwright para el sistema YA DESPLEGADO.
 *
 * Diferencias con `playwright.config.ts`:
 * - No levanta `npm run dev` ni ningún servidor local (`webServer`).
 * - No usa mocks: el frontend llama a la API real y el login va a Keycloak.
 * - Guarda JUnit/HTML/trazas en `results/frontend`.
 *
 * Variables:
 * - `STAGING_URL` o `BASE_URL`: URL pública (obligatoria para ejecutar).
 * - `KEYCLOAK_URL`: por defecto `https://<host>:8443`.
 * - `QA_USERNAME` / `QA_PASSWORD`: usuario sembrado por `seed_keycloak_qa.py`.
 * - `PLAYWRIGHT_IGNORE_HTTPS=true`: solo para certificados autofirmados.
 */
export default defineConfig({
  testDir: './tests/staging',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 90_000,
  expect: {
    timeout: 15_000,
  },
  outputDir: path.join(resultsDir, 'artifacts'),
  reporter: [
    ['list'],
    [
      'junit',
      {
        outputFile: path.join(resultsDir, 'junit.xml'),
      },
    ],
    [
      'html',
      {
        outputFolder: path.join(resultsDir, 'html'),
        open: 'never',
      },
    ],
  ],
  use: {
    baseURL,
    headless: true,
    ignoreHTTPSErrors:
      (process.env.PLAYWRIGHT_IGNORE_HTTPS || '').toLowerCase() === 'true',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
})
