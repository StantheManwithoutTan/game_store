<script setup lang="ts">
import { ref } from 'vue'

import type { TestTokenRequest } from '../../types/testTools'

interface RoleOption {
  value: string
  label: string
  description: string
}

defineProps<{
  generating: boolean
}>()

const emit = defineEmits<{
  generate: [data: TestTokenRequest]
}>()

const roleOptions: RoleOption[] = [
  {
    value: 'product:view',
    label: 'Ver productos',
    description: 'Consultar el catálogo.',
  },
  {
    value: 'product:manage',
    label: 'Gestionar productos',
    description: 'Crear, editar y eliminar productos.',
  },
  {
    value: 'stock:view',
    label: 'Ver stock',
    description: 'Consultar existencias e historial.',
  },
  {
    value: 'stock:manage',
    label: 'Gestionar stock',
    description: 'Registrar entradas, salidas y ajustes.',
  },
  {
    value: 'game:view',
    label: 'Ver juegos',
    description: 'Consultar los juegos.',
  },
  {
    value: 'game:manage',
    label: 'Gestionar juegos',
    description: 'Modificar los juegos.',
  },
  {
    value: 'report:view',
    label: 'Ver reportes',
    description: 'Consultar los reportes.',
  },
  {
    value: 'audit:view',
    label: 'Ver auditoría',
    description: 'Consultar el registro de auditoría.',
  },
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
    <div class="panel-header">
      <div>
        <p class="panel-label">Paso 1</p>
        <h2>Configurar token</h2>
      </div>
    </div>

    <fieldset class="role-options">
      <legend>Permisos incluidos</legend>

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

        <span>
          <strong>{{ role.label }}</strong>
          <small>{{ role.description }}</small>
          <code>{{ role.value }}</code>
        </span>
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