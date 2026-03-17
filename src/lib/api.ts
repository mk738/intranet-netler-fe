import axios, { type AxiosError } from 'axios'
import { getIdToken } from './firebase'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
  headers: {
    'Content-Type': 'application/json',
  },
})

// Inject Firebase JWT on every request
api.interceptors.request.use(async (config) => {
  try {
    const token = await getIdToken()
    config.headers.Authorization = `Bearer ${token}`
  } catch {
    // No token — let the request go through, server will 401
  }
  return config
})

// Global error handling
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && window.location.pathname !== '/login') {
      // Token expired or invalid — redirect to login
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default api

// ── API error extraction ───────────────────────────────────────

export function getApiError(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const axiosErr = error as AxiosError<{ message?: string; error?: string }>
    return (
      axiosErr.response?.data?.message ??
      axiosErr.response?.data?.error ??
      'Something went wrong. Please try again.'
    )
  }
  return 'Something went wrong. Please try again.'
}
