<script setup lang="ts">
import { onMounted, ref } from 'vue'

import AppAlert from '../components/common/AppAlert.vue'
import LoadingState from '../components/common/LoadingState.vue'

import { getUsers } from '../services/userService'
import { getApiErrorInformation } from '../utils/errors'

import type { KeycloakUser } from '../types/user'

const users = ref<KeycloakUser[]>([])
const loading = ref(false)
const error = ref('')

async function loadUsers(): Promise<void> {
  loading.value = true
  error.value = ''

  try {
    users.value = await getUsers()
  } catch (exception: unknown) {
    const information = getApiErrorInformation(
        exception,
        'No fue posible cargar los usuarios.',
    )

    if (information.status === 403) {
      error.value =
          'No tienes permiso para administrar usuarios.'
    } else {
      error.value = information.message
    }
  } finally {
    loading.value = false
  }
}

onMounted(loadUsers)
</script>

<template>
  <main class="users-page">
    <header class="page-header">
      <div>
        <p class="eyebrow">
          Administración de acceso
        </p>

        <h1>Usuarios y permisos</h1>

        <p>
          Consulta los usuarios existentes en Keycloak y los
          permisos asignados a cada uno.
        </p>
      </div>

      <RouterLink
          class="btn btn-outline"
          to="/dashboard"
      >
        Volver al dashboard
      </RouterLink>
    </header>

    <AppAlert
        v-if="error"
        type="error"
    >
      {{ error }}
    </AppAlert>

    <LoadingState
        v-if="loading"
        message="Cargando usuarios de Keycloak..."
    />

    <section
        v-else
        class="panel"
    >
      <div class="panel-header">
        <div>
          <p class="panel-label">
            Control de acceso
          </p>

          <h2>Usuarios existentes</h2>
        </div>

        <span class="users-count">
          {{ users.length }} usuarios
        </span>
      </div>

      <div
          v-if="users.length"
          class="table-container"
      >
        <table class="users-table">
          <thead>
          <tr>
            <th>Usuario</th>
            <th>Correo</th>
            <th>Estado</th>
            <th>Permisos</th>
            <th>Acción</th>
          </tr>
          </thead>

          <tbody>
          <tr
              v-for="user in users"
              :key="user.id"
          >
            <td>
              <strong>{{ user.name }}</strong>
              <small>@{{ user.username }}</small>
            </td>

            <td>
              {{ user.email || 'Sin correo' }}
            </td>

            <td>
                <span
                    class="status-badge"
                    :class="
                      user.enabled
                        ? 'status-active'
                        : 'status-inactive'
                    "
                >
                  {{ user.enabled ? 'Activo' : 'Inactivo' }}
                </span>
            </td>

            <td>
              <div
                  v-if="user.permissions.length"
                  class="permission-list"
              >
                  <span
                      v-for="permission in user.permissions"
                      :key="permission"
                      class="permission-badge"
                  >
                    {{ permission }}
                  </span>
              </div>

              <span
                  v-else
                  class="no-permissions"
              >
                  Sin permisos
                </span>
            </td>

            <td>
              <button
                  class="btn btn-small btn-secondary"
                  type="button"
                  disabled
                  title="Lo conectaremos en el siguiente paso"
              >
                Gestionar permisos
              </button>
            </td>
          </tr>
          </tbody>
        </table>
      </div>

      <p
          v-else
          class="empty-state"
      >
        No se encontraron usuarios.
      </p>
    </section>
  </main>
</template>