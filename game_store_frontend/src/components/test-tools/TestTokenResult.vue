<script setup lang="ts">
import { computed, ref } from 'vue'

import type { TestTokenResponse } from '../../types/testTools'

const props = defineProps<{
  result: TestTokenResponse | null
}>()

const feedback = ref('')
const copyError = ref('')

const apiBaseUrl = (
    import.meta.env.VITE_API_URL || 'http://localhost:5000'
).replace(/\/$/, '')

const curlCommand = computed(() => {
  if (!props.result) {
    return ''
  }

  return [
    `curl "${apiBaseUrl}/api/products/"`,
    `  -H "Authorization: Bearer ${props.result.token}"`,
  ].join(' \\\n')
})

async function copyText(
    text: string,
    label: string,
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    feedback.value = `${label} copiado al portapapeles.`
    copyError.value = ''
  } catch {
    copyError.value =
        'El navegador bloqueó el portapapeles. Cópialo manualmente.'
    feedback.value = ''
  }
}
</script>

<template>
  <section class="panel token-result">
    <div class="panel-header">
      <div>
        <p class="panel-label">Paso 2</p>
        <h2>Usar en la prueba</h2>
      </div>
    </div>

    <p
        v-if="feedback"
        class="copy-feedback"
    >
      {{ feedback }}
    </p>

    <p
        v-if="copyError"
        class="copy-error"
    >
      {{ copyError }}
    </p>

    <div
        v-if="result"
        class="token-output"
    >
      <div class="token-meta">
        <span>
          Expira:
          <strong>
            {{ new Date(result.expires_at).toLocaleString() }}
          </strong>
        </span>

        <span>
          Permisos:
          <strong>{{ result.roles.length }}</strong>
        </span>
      </div>

      <label for="generated-token">Bearer token</label>

      <textarea
          id="generated-token"
          :value="result.token"
          readonly
          rows="7"
      />

      <button
          class="btn btn-secondary"
          type="button"
          @click="copyText(result.token, 'Token')"
      >
        Copiar token
      </button>

      <label for="curl-example">Ejemplo cURL</label>

      <textarea
          id="curl-example"
          :value="curlCommand"
          readonly
          rows="8"
      />

      <button
          class="btn btn-outline"
          type="button"
          @click="copyText(curlCommand, 'Comando cURL')"
      >
        Copiar cURL
      </button>

      <div class="postman-help">
        <strong>En Postman</strong>

        <p>
          Authorization → Bearer Token → pega el token.
        </p>
      </div>
    </div>

    <div
        v-else
        class="token-placeholder"
    >
      <strong>Aún no hay un token generado.</strong>

      <p>
        Selecciona los permisos y presiona “Generar token”.
      </p>
    </div>
  </section>
</template>