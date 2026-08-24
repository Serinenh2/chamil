/**
 * Client Axios CHAMIL.
 * Injecte le jeton d'accès, rafraîchit automatiquement à l'expiration et
 * met en file d'attente les requêtes concurrentes pendant le rafraîchissement.
 */
import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || '/api/v1'
const ACCESS_KEY = 'chamil_access'
const REFRESH_KEY = 'chamil_refresh'

export const tokens = {
  get access() { return localStorage.getItem(ACCESS_KEY) },
  get refresh() { return localStorage.getItem(REFRESH_KEY) },
  set({ access, refresh }) {
    if (access) localStorage.setItem(ACCESS_KEY, access)
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh)
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY)
    localStorage.removeItem(REFRESH_KEY)
  },
}

const api = axios.create({ baseURL: BASE_URL, headers: { 'Content-Type': 'application/json' } })

api.interceptors.request.use((config) => {
  const token = tokens.access
  if (token) config.headers.Authorization = `Bearer ${token}`
  const lang = localStorage.getItem('chamil_lang') || 'fr'
  config.headers['Accept-Language'] = lang
  return config
})

let refreshing = null
let queue = []

const flush = (error, token = null) => {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)))
  queue = []
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    const status = error.response?.status

    if (status !== 401 || original._retry || original.url?.includes('/auth/')) {
      return Promise.reject(error)
    }

    if (refreshing) {
      return new Promise((resolve, reject) => queue.push({ resolve, reject }))
        .then((token) => {
          original.headers.Authorization = `Bearer ${token}`
          return api(original)
        })
    }

    original._retry = true
    refreshing = axios
      .post(`${BASE_URL}/auth/refresh/`, { refresh: tokens.refresh })
      .then(({ data }) => {
        tokens.set({ access: data.access, refresh: data.refresh })
        flush(null, data.access)
        return data.access
      })
      .catch((err) => {
        flush(err)
        tokens.clear()
        window.location.href = '/login'
        throw err
      })
      .finally(() => { refreshing = null })

    const token = await refreshing
    original.headers.Authorization = `Bearer ${token}`
    return api(original)
  },
)

/** Raccourcis REST utilisés par les hooks React Query. */
export const rest = {
  list: (resource, params) => api.get(`/${resource}/`, { params }).then((r) => r.data),
  get: (resource, id) => api.get(`/${resource}/${id}/`).then((r) => r.data),
  create: (resource, payload) => api.post(`/${resource}/`, payload).then((r) => r.data),
  update: (resource, id, payload) => api.patch(`/${resource}/${id}/`, payload).then((r) => r.data),
  remove: (resource, id) => api.delete(`/${resource}/${id}/`).then((r) => r.data),
  action: (path, payload) => api.post(path, payload).then((r) => r.data),
  fetch: (path, params) => api.get(path, { params }).then((r) => r.data),
}

export default api
