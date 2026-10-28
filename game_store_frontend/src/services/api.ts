import axios from 'axios'
import { getApiBaseUrl } from '../config'

const api = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000,
})

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('session_token')

    if (token) {
        config.headers.Authorization = `Bearer ${token}`
    }

    return config
})

api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('session_token')

            if (
                window.location.pathname !== '/login' &&
                window.location.pathname !== '/login/callback'
            ) {
                window.location.href = '/login'
            }
        }

        return Promise.reject(error)
    },
)

export default api