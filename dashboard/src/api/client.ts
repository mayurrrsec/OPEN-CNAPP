import axios from 'axios'

const TOKEN_KEY = 'opencnapp_token'

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000' })

api.interceptors.request.use((config) => {
  const t = localStorage.getItem(TOKEN_KEY)
  if (t) {
    config.headers.Authorization = `Bearer ${t}`
  }
  return config
})

api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      const path = window.location.pathname
      if (path === '/login' || path === '/auth/callback') {
        return Promise.reject(err)
      }
      localStorage.removeItem(TOKEN_KEY)
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)
