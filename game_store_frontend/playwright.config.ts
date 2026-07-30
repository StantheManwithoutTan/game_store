import { defineConfig } from '@playwright/test'
import { config } from 'dotenv'

config() 

export default defineConfig({
  testDir: './tests',           // 1. Dónde buscar los tests
  timeout: 30000,               // 2. Timeout máximo por test (30s)
  expect: { timeout: 10000 },   // 3. Timeout para aserciones (10s)
  use: {
    baseURL: 'http://localhost:5173',  // 4. URL base para rutas relativas
    headless: true,                    // 5. Sin ventana visible (modo CI)
  },
  webServer: {                        // 6. Auto-inicia el frontend
    command: 'npm run dev',           //    Ejecuta Vite dev server
    url: 'http://localhost:5173',     //    Espera a que responda aquí
    reuseExistingServer: true,        //    Si ya corre, lo reusa
  },
})