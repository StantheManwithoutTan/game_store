<script setup lang="ts">
import { computed, ref } from 'vue'

import type { TestTokenResponse } from '../../types/testTools'

const props = defineProps<{
  result: TestTokenResponse | null
}>()

const message = ref('')

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
    message.value = `${label} copiado.`
  } catch {
    message.value = 'No se pudo copiar. Hazlo manualmente.'
  }
}
</script>

<template>
  <section class="panel token-result">
    <h2>Resultado</h2>

    <p
        v-if="message"
        class="copy-feedback"
    >
      {{ message }}
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

      <label for="generated-token">Token</label>

      <textarea
          id="generated-token"
          :value="result.token"
          readonly
          rows="5"
      />

      <button
          class="btn btn-secondary"
          type="button"
          @click="copyText(result.token, 'Token')"
      >
        Copiar token
      </button>

      <label for="curl-example">cURL</label>

      <textarea
          id="curl-example"
          :value="curlCommand"
          readonly
          rows="5"
      />

      <button
          class="btn btn-outline"
          type="button"
          @click="copyText(curlCommand, 'cURL')"
      >
        Copiar cURL
      </button>
    </div>

    <p
        v-else
        class="token-placeholder"
    >
      Genera un token para verlo aquí.
    </p>
  </section>
</template>