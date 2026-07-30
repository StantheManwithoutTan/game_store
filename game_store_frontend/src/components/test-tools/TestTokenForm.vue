<script setup lang="ts">
import { ref } from 'vue'

import type { TestTokenRequest } from '../../types/testTools'

interface RoleOption {
  value: string
  label: string
}

defineProps<{
  generating: boolean
}>()

const emit = defineEmits<{
  generate: [data: TestTokenRequest]
}>()

const roleOptions: RoleOption[] = [
  { value: 'product:view', label: 'Ver productos' },
  { value: 'product:manage', label: 'Gestionar productos' },
  { value: 'stock:view', label: 'Ver stock' },
  { value: 'stock:manage', label: 'Gestionar stock' },
  { value: 'game:view', label: 'Ver juegos' },
  { value: 'game:manage', label: 'Gestionar juegos' },
  { value: 'report:view', label: 'Ver reportes' },
  { value: 'audit:view', label: 'Ver auditoría' },
]

const selectedRoles = ref<string[]>([
  'product:view',
  'stock:view',
])

const expiresInMinutes = ref(15)

function submitForm(): void {
  emit('generate', {
    roles: [...selectedRoles.value],
    expires_minutes: expiresInMinutes.value,
  })
}
</script>

<template>
  <form
      class="panel token-form"
      @submit.prevent="submitForm"
  >
    <h2>Permisos</h2>

    <fieldset class="role-options">
      <legend class="sr-only">
        Selecciona los permisos
      </legend>

      <label
          v-for="role in roleOptions"
          :key="role.value"
          class="role-option"
      >
        <input
            v-model="selectedRoles"
            type="checkbox"
            :value="role.value"
        >

        <span>{{ role.label }}</span>
      </label>
    </fieldset>

    <div class="form-group">
      <label for="token-expiration">Duración</label>

      <select
          id="token-expiration"
          v-model="expiresInMinutes"
      >
        <option :value="5">5 minutos</option>
        <option :value="15">15 minutos</option>
        <option :value="30">30 minutos</option>
        <option :value="60">60 minutos</option>
      </select>
    </div>

    <button
        class="btn btn-primary"
        type="submit"
        :disabled="generating"
    >
      {{ generating ? 'Generando...' : 'Generar token' }}
    </button>
  </form>
</template>