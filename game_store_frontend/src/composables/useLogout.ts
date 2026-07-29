import { ref } from 'vue'

import { redirectToKeycloakLogout } from '../services/authService'
import { useAuthStore } from '../stores/auth'

export function useLogout() {
    const authStore = useAuthStore()
    const loggingOut = ref(false)

    async function logout(): Promise<void> {
        if (loggingOut.value) {
            return
        }

        loggingOut.value = true

        try {
            await authStore.logout()
        } finally {
            redirectToKeycloakLogout()
        }
    }

    return {
        loggingOut,
        logout,
    }
}