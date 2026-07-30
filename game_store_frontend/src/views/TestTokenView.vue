<script setup lang="ts">
import { ref } from 'vue'

import AppAlert from '../components/common/AppAlert.vue'
import TestTokenForm from '../components/test-tools/TestTokenForm.vue'
import TestTokenResult from '../components/test-tools/TestTokenResult.vue'
import { generateTestToken } from '../services/testToolsService'
import type {
  TestTokenRequest,
  TestTokenResponse,
} from '../types/testTools'

const generating = ref(false)
const result = ref<TestTokenResponse | null>(null)
const error = ref('')
const feedback = ref('')

async function createToken(
    request: TestTokenRequest,
): Promise<void> {
  if (!request.roles.length) {
    error.value = 'Selecciona por lo menos un permiso.'
    return
  }

  generating.value = true
  error.value = ''
  feedback.value = ''

  try {
    result.value = await generateTestToken(request)
    feedback.value = 'Token generado correctamente.'
  } catch (requestError: unknown) {
    result.value = null

    const apiError = requestError as {
      response?: {
        status?: number
        data?: {
          message?: string
          error?: string
        }
      }
    }

    if (apiError.response?.status === 404) {
      error.value =
          'Las herramientas de prueba están deshabilitadas.'
    } else if (apiError.response?.status === 403) {
      error.value =
          'Tu usuario no tiene permiso para generar tokens.'
    } else {
      error.value =
          apiError.response?.data?.message ||
          apiError.response?.data?.error ||
          'No fue posible generar el token.'
    }
  } finally {
    generating.value = false
  }
}
</script>

<template>
  <main class="test-tools-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">Herramientas de desarrollo</p>

        <h1>Token para Postman y cURL</h1>

        <p>
          Genera un JWT temporal sin exponer la llave secreta
          del servidor.
        </p>
      </div>
    </header>

    <AppAlert
        v-if="error"
        type="error"
    >
      {{ error }}
    </AppAlert>

    <AppAlert
        v-if="feedback"
        type="success"
    >
      {{ feedback }}
    </AppAlert>

    <section class="test-tools-grid">
      <TestTokenForm
          :generating="generating"
          @generate="createToken"
      />

      <TestTokenResult :result="result" />
    </section>

    <aside class="security-note">
      <strong>Protección incluida:</strong>
      esta función solamente se habilita en desarrollo, exige una
      sesión administrativa y limita la duración y los permisos.
    </aside>
  </main>
</template>