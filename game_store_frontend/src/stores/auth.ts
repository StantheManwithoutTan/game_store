import { defineStore } from 'pinia'  // If using Pinia for state
import axios from 'axios'

interface AuthState {
  accessToken: string | null
  idToken: string | null
  sessionToken: string | null
  user: any | null
  refreshToken: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    idToken: null,
    sessionToken: localStorage.getItem('session_token'),
    user: null,
    refreshToken: null
  }),

  actions: {
    async loginWithKeycloak(code: string) {
      try {
        const response = await axios.post('http://localhost:5000/auth/login', {
          code
        })
        
        // Autoriza resuestas de API
        this.accessToken = response.data.access_token
        // Prueba identidad del usuario
        this.idToken = response.data.id_token
        // rastrea datos de login dentro de un cookie 
        this.sessionToken = response.data.session_token

        this.user = response.data.user
        // Genera nuevos tokens de id/acceso
        this.refreshToken = response.data.refresh_token
        
        // Store in localStorage
        if (this.sessionToken) {
          localStorage.setItem('session_token', this.sessionToken)
        }
      } catch (error) {
        console.error('Login failed', error)
        throw error
      }
    },

    async logout() {
      try {
        await axios.post('http://localhost:5000/auth/logout', {
          refresh_token: this.refreshToken
        })
      } finally {
        this.accessToken = null
        this.idToken = null
        this.sessionToken = null
        this.user = null
        this.refreshToken = null
        localStorage.removeItem('session_token')
      }
    }
  }
})