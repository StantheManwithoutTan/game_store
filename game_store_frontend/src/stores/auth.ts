import { defineStore } from 'pinia'
import api from '../services/api'

interface AuthUser {
  name?: string
  email?: string
}

interface AuthState {
  accessToken: string | null
  idToken: string | null
  sessionToken: string | null
  user: AuthUser | null
  refreshToken: string | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    idToken: null,
    sessionToken: localStorage.getItem('session_token'),
    user: null,
    refreshToken: null,
  }),

  actions: {
    async loginWithKeycloak(code: string) {
      try {
        const response = await api.post('/auth/login', {
          code,
        })

        this.accessToken = response.data.access_token
        this.idToken = response.data.id_token
        this.sessionToken = response.data.session_token
        this.user = response.data.user
        this.refreshToken = response.data.refresh_token

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
        await api.post('/auth/logout', {
          refresh_token: this.refreshToken,
        })
      } finally {
        this.accessToken = null
        this.idToken = null
        this.sessionToken = null
        this.user = null
        this.refreshToken = null

        localStorage.removeItem('session_token')
      }
    },
  },
})