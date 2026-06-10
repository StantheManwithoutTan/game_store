import { defineStore } from 'pinia'  // If using Pinia for state
import axios from 'axios'

interface AuthState {
  accessToken: string | null
  idToken: string | null
  sessionToken: string | null
  user: any | null
}

export const useAuthStore = defineStore('auth', {
  state: (): AuthState => ({
    accessToken: null,
    idToken: null,
    sessionToken: null,
    user: null
  }),

  actions: {
    async loginWithKeycloak(code: string) {
      try {
        const response = await axios.post('http://localhost:5000/auth/login', {
          code
        })
        
        this.accessToken = response.data.access_token
        this.idToken = response.data.id_token
        this.sessionToken = response.data.session_token
        this.user = response.data.user
        
        // Store in localStorage
        localStorage.setItem('session_token', this.sessionToken)
      } catch (error) {
        console.error('Login failed', error)
        throw error
      }
    },

    async logout() {
      try {
        await axios.post('http://localhost:5000/auth/logout', {
          refresh_token: this.accessToken
        })
      } finally {
        this.accessToken = null
        this.idToken = null
        this.sessionToken = null
        this.user = null
        localStorage.removeItem('session_token')
      }
    }
  }
})