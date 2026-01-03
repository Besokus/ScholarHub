type AppEnv = 'development' | 'testing' | 'production'

type RawEnv = {
  VITE_API_URL?: string
  VITE_ADMIN_API_URL?: string
  VITE_AUTH_TTL_MIN?: string | number
  VITE_API_TIMEOUT_MS?: string | number
  VITE_AUTH_KEY?: string
  VITE_ENV?: string
}

type ResolvedConfig = {
  env: AppEnv
  apiBase: string
  apiOrigin: string
  adminApiBase: string
  authTtlMinutes: number
  apiTimeoutMs: number
  authKey: string
}

const rawEnv: RawEnv = (import.meta as any).env || {}

const normalizeEnv = (v: unknown): RawEnv => {
  const src: any = v || {}
  return {
    VITE_API_URL: src.VITE_API_URL || src.vite_api_url,
    VITE_ADMIN_API_URL: src.VITE_ADMIN_API_URL || src.vite_admin_api_url,
    VITE_AUTH_TTL_MIN: src.VITE_AUTH_TTL_MIN,
    VITE_API_TIMEOUT_MS: src.VITE_API_TIMEOUT_MS,
    VITE_AUTH_KEY: src.VITE_AUTH_KEY,
    VITE_ENV: src.VITE_ENV || src.MODE || src.mode
  }
}

const parseNumber = (value: string | number | undefined, fallback: number, min?: number, max?: number): number => {
  if (value === undefined || value === null) return fallback
  const n = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(n)) return fallback
  let v = n
  if (typeof min === 'number' && v < min) v = min
  if (typeof max === 'number' && v > max) v = max
  return v
}

const parseEnvName = (v: string | undefined): AppEnv => {
  const x = (v || '').toLowerCase()
  if (x === 'production') return 'production'
  if (x === 'testing' || x === 'test') return 'testing'
  return 'development'
}

const resolveConfig = (): ResolvedConfig => {
  const e = normalizeEnv(rawEnv)
  const env = parseEnvName(typeof e.VITE_ENV === 'string' ? e.VITE_ENV : (import.meta as any).env?.MODE)
  // 2. 修正后的学生端 API 基础路径逻辑
  const apiBase = (() => {
    // 优先读取环境变量，如果没有则默认为相对路径 /api
    const v = e.VITE_API_URL || (import.meta as any).env?.VITE_API_BASE_URL || '/api';
    // 移除末尾多余的斜杠，并直接返回字符串，不再使用会报错的 new URL()
    return v.replace(/\/+$/, '');
  })();
  // 3. 修正后的管理端 API 基础路径逻辑
  const adminApiBase = (() => {
    // 对应 Nginx 配置中的 /admin-api
    const v = e.VITE_ADMIN_API_URL || '/admin-api';
    return v.replace(/\/+$/, '');
  })();
  const authTtlMinutes = parseNumber(e.VITE_AUTH_TTL_MIN, 30, 1, 1440)
  const apiTimeoutMs = parseNumber(e.VITE_API_TIMEOUT_MS, 15000, 1000, 60000)
  const authKey = typeof e.VITE_AUTH_KEY === 'string' && e.VITE_AUTH_KEY.trim()
    ? String(e.VITE_AUTH_KEY)
    : 'token'
  return {
    env,
    apiBase,
    // 4. 修正 apiOrigin：如果是相对路径，则使用当前页面的域名
    apiOrigin: apiBase.startsWith('http') 
      ? new URL(apiBase).origin 
      : window.location.origin,
    adminApiBase,
    authTtlMinutes,
    apiTimeoutMs,
    authKey
  }
}

export const API_CONFIG = resolveConfig()

export const API_BASE = API_CONFIG.apiBase
export const API_ORIGIN = API_CONFIG.apiOrigin

const getAuthTTLMinutes = (): number => {
  const overrideStr = localStorage.getItem('auth_ttl_min')
  const override = overrideStr ? Number(overrideStr) : NaN
  if (Number.isFinite(override) && override > 0 && override <= 1440) return override
  if (Number.isFinite(API_CONFIG.authTtlMinutes) && API_CONFIG.authTtlMinutes > 0 && API_CONFIG.authTtlMinutes <= 1440) {
    return API_CONFIG.authTtlMinutes
  }
  return 30
}

export const setAuthTTLMinutes = (minutes: number) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return
  const m = Math.min(Math.max(minutes, 1), 1440)
  localStorage.setItem('auth_ttl_min', String(m))
  const token = localStorage.getItem('token')
  if (token) {
    const expiresAt = Date.now() + m * 60 * 1000
    localStorage.setItem('auth_expires_at', String(expiresAt))
  }
}

export const clearAuthCache = () => {
  localStorage.removeItem('token')
  localStorage.removeItem('id')
  localStorage.removeItem('role')
  localStorage.removeItem('auth_expires_at')
  localStorage.removeItem('auth_ttl_min')
  localStorage.removeItem('username')
  localStorage.removeItem('fullName')
  localStorage.removeItem('auth_last_active_at')
}

export const getAuthToken = (): string | null => {
  const token = localStorage.getItem(API_CONFIG.authKey)
  if (!token) return null
  const expStr = localStorage.getItem('auth_expires_at')
  if (!expStr) return token
  const exp = Number(expStr)
  if (Number.isFinite(exp) && Date.now() > exp) {
    clearAuthCache()
    return null
  }
  return token
}

export const getAuthTimeoutMs = (): number => {
  return getAuthTTLMinutes() * 60 * 1000
}

export const isAuthenticated = (): boolean => {
  return !!getAuthToken()
}

export const setAuthCache = (token: string, user: any, ttlMinutes?: number) => {
  const ttl = ttlMinutes && ttlMinutes > 0 ? ttlMinutes : getAuthTTLMinutes()
  const expiresAt = Date.now() + ttl * 60 * 1000
  localStorage.setItem(API_CONFIG.authKey, token)
  if (user && user.id) localStorage.setItem('id', String(user.id))
  if (user && user.role) localStorage.setItem('role', String(user.role))
  if (user && user.username) localStorage.setItem('username', String(user.username))
  if (user && user.fullName) localStorage.setItem('fullName', String(user.fullName))
  localStorage.setItem('auth_expires_at', String(expiresAt))
  localStorage.setItem('auth_last_active_at', String(Date.now()))
}

export async function apiFetch(path: string, options?: RequestInit) {
  const token = getAuthToken()
  const uid = localStorage.getItem('id')
  if (token) {
    try {
      localStorage.setItem('auth_last_active_at', String(Date.now()))
    } catch {}
  }
  const method = String(options?.method || 'GET').toUpperCase()
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(uid ? { 'X-User-Id': uid } : {}),
    ...(method === 'GET' ? { 'Cache-Control': 'no-cache', Pragma: 'no-cache' } : {})
  }
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 15000)
  let res: Response
  try {
    if ((import.meta as any).env?.DEV) {
      try { console.debug('[apiFetch] request', { method, path }) } catch {}
    }
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: ctrl.signal, cache: 'no-store' as RequestCache })
  } catch (err: any) {
    clearTimeout(timeout)
    const isAbort = err && (err.name === 'AbortError' || String(err).includes('aborted'))
    const e: any = new Error(isAbort ? 'Request timeout' : (err?.message || 'Network error'))
    e.status = 0
    e.data = null
    throw e
  }
  clearTimeout(timeout)
  let data: any = null
  try { data = await res.json() } catch {}
  if ((import.meta as any).env?.DEV) {
    try { console.debug('[apiFetch] response', { method, path, status: res.status }) } catch {}
    try {
      const sample = (() => {
        try { return JSON.stringify(data).slice(0, 500) } catch { return String(data).slice(0, 200) }
      })()
      console.debug('[apiFetch] payload', { path, sample })
    } catch {}
  }
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${res.status}`
    const err: any = new Error(message)
    err.status = res.status
    err.data = data
    if ((import.meta as any).env?.DEV) { try { console.debug('[apiFetch] error', { path, status: res.status, message, data }) } catch {} }
    throw err
  }
  return data
}

export const AuthApi = {
  register: (body: { id: string; username: string; email: string; password: string; role: 'STUDENT' | 'TEACHER' }) =>
    apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: { username: string; password: string }) =>
    apiFetch('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => apiFetch('/auth/me'),
  updateUsername: (username: string) => apiFetch('/auth/username', { method: 'PATCH', body: JSON.stringify({ username }) }),
  stats: () => apiFetch('/auth/stats'),
  resetPassword: (email: string) => apiFetch('/auth/reset-password', { method: 'POST', body: JSON.stringify({ email }) })
  ,resetPasswordConfirm: (email: string, code: string, newPassword: string) =>
    apiFetch('/auth/reset-password/confirm', { method: 'POST', body: JSON.stringify({ email, code, newPassword }) })
  ,sendEmailCode: (email: string) => apiFetch('/send-email-code', { method: 'POST', body: JSON.stringify({ email }) })
  ,updatePassword: (currentPassword: string, newPassword: string) =>
    apiFetch('/auth/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) })
  ,emailCheck: (email: string) => apiFetch(`/auth/email/check?email=${encodeURIComponent(email)}`)
  ,updateEmail: (email: string) => apiFetch('/auth/email', { method: 'POST', body: JSON.stringify({ email }) })
  ,updateAvatar: (avatarUrl: string) =>
    apiFetch('/auth/avatar', { method: 'POST', body: JSON.stringify({ avatarUrl }) })
  ,checkUsername: (u: string) => apiFetch(`/auth/username/check?u=${encodeURIComponent(u)}`)
}
 
export const CategoryApi = {
  tree: () => apiFetch('/categories/tree'),
  list: () => apiFetch('/categories'),
  create: (body: any) => apiFetch('/categories', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: number, body: any) => apiFetch(`/categories/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: number) => apiFetch(`/categories/${id}`, { method: 'DELETE' })
}

export const CourseCategoryApi = {
  list: () => apiFetch('/course-categories'),
  courses: (id: number) => apiFetch(`/course-categories/${id}/courses`),
}

export const ResourcesApi = {
  list: (params: { q?: string; courseId?: string; category?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.courseId) q.set('courseId', params.courseId)
    if (params.category) q.set('category', String(params.category))
    q.set('page', String(params.page || 1))
    q.set('pageSize', String(params.pageSize || 20))
    return apiFetch(`/resources?${q.toString()}`)
  },
  detail: (id: string) => apiFetch(`/resources/${id}`),
  create: (body: any) => apiFetch('/resources', { method: 'POST', body: JSON.stringify(body) }),
  update: (id: string, body: any) => apiFetch(`/resources/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string) => apiFetch(`/resources/${id}`, { method: 'DELETE' }),
  downloadLog: (id: string) => apiFetch(`/resources/${id}/downloads`, { method: 'POST' }),
  myDownloads: () => apiFetch('/resources/downloads/me'),
  myUploads: () => apiFetch('/resources/me/uploads')
}

export const ResourceCategoriesApi = {
  list: () => apiFetch('/resources/categories')
}

export const QaApi = {
  list: (params: { courseId?: string; sort?: string; status?: string; my?: boolean; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params.courseId) q.set('courseId', params.courseId)
    if (params.sort) q.set('sort', params.sort)
    if (params.status) q.set('status', params.status)
    if (params.my) q.set('my', '1')
    q.set('page', String(params.page || 1))
    q.set('pageSize', String(params.pageSize || 15))
    return apiFetch(`/qa/questions?${q.toString()}`)
  },
  create: (body: any) => apiFetch('/qa/questions', { method: 'POST', body: JSON.stringify(body) }),
  detail: (id: string | number) => apiFetch(`/qa/questions/${id}?_=${Date.now()}`),
  update: (id: string | number, body: any) => apiFetch(`/qa/questions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (id: string | number) => apiFetch(`/qa/questions/${id}`, { method: 'DELETE' })
  ,
  boardsRankByViews: (params: { range?: '7d' | '30d' | 'all'; limit?: number }) => {
    const q = new URLSearchParams()
    q.set('range', String(params.range || 'all'))
    q.set('limit', String(params.limit || 10))
    return apiFetch(`/qa/boards/rank/viewed?${q.toString()}`)
  }
}

export const AnswersApi = {
  listByQuestion: (id: string | number) => apiFetch(`/questions/${id}/answers`),
  createForQuestion: (id: string | number, body: { content: string; attachments?: string | null }) =>
    apiFetch(`/questions/${id}/answers`, { method: 'POST', body: JSON.stringify(body) }),
  detail: (id: string | number) => apiFetch(`/answers/${id}`),
  remove: (id: string | number) => apiFetch(`/answers/${id}`, { method: 'DELETE' }),
  trackView: (id: string | number) => apiFetch(`/questions/${id}/view?_=${Date.now()}`, { method: 'POST' })
}

export const NotiApi = {
  unreadAnswers: () => apiFetch('/notifications?type=answer&status=unread'),
  markRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'POST' }),
  readAll: () => apiFetch('/notifications/read-all', { method: 'POST' })
}

export const API_ADMIN_BASE = (import.meta as any).env?.VITE_ADMIN_API_URL || 'http://localhost:4000/api'

export async function adminFetch(path: string, options?: RequestInit) {
  const token = getAuthToken()
  const uid = localStorage.getItem('id')
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(uid ? { 'X-User-Id': uid } : {})
  }
  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 15000)
  let res: Response
  try {
    res = await fetch(`${API_ADMIN_BASE}${path}`, { ...options, headers, signal: ctrl.signal })
  } catch (err: any) {
    clearTimeout(timeout)
    const isAbort = err && (err.name === 'AbortError' || String(err).includes('aborted'))
    const e: any = new Error(isAbort ? 'Request timeout' : (err?.message || 'Network error'))
    e.status = 0
    e.data = null
    throw e
  }
  clearTimeout(timeout)
  let data: any = null
  try { data = await res.json() } catch {}
  const normalized = (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'Data'))
    ? { ...data, data: (data as any).Data }
    : data
  if (!res.ok) {
    const message = (normalized && ((normalized as any).message || (normalized as any).error || (normalized as any).Msg)) || `HTTP ${res.status}`
    const err: any = new Error(message)
    err.status = res.status
    err.data = normalized
    throw err
  }
  return normalized
}

export const AdminApi = {
  stats: (params?: { ts?: number }) => {
    const q = new URLSearchParams()
    if (params?.ts) q.set('ts', String(params.ts))
    q.set('_', String(Date.now()))
    return adminFetch(`/admin/stats?${q.toString()}`)
  },
  health: () => adminFetch(`/admin/health?_=${Date.now()}`),
  serviceStatus: () => adminFetch(`/admin/service/status?_=${Date.now()}`),
  healthTrend: (days?: number) => {
    const q = new URLSearchParams()
    if (days && days > 0) q.set('days', String(days))
    q.set('_', String(Date.now()))
    return adminFetch(`/admin/health/trend?${q.toString()}`)
  },
  healthSamples: (since?: number, limit?: number) => {
    const q = new URLSearchParams()
    if (since && since > 0) q.set('since', String(since))
    if (limit && limit > 0) q.set('limit', String(limit))
    q.set('_', String(Date.now()))
    return adminFetch(`/admin/health/samples?${q.toString()}`)
  },
  teachers: {
    list: (params: any) => {
      const q = new URLSearchParams()
      if (params.q) q.set('q', params.q)
      q.set('page', String(params.page || 1))
      q.set('pageSize', String(params.pageSize || 20))
      return adminFetch(`/admin/teachers?${q.toString()}`)
    },
    create: (body: any) => adminFetch('/admin/teachers', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: any) => adminFetch(`/admin/teachers/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: string) => adminFetch(`/admin/users/${id}`, { method: 'DELETE' })
  },
  audit: {
    resources: (params: any) => {
      const q = new URLSearchParams()
      if (params.status) q.set('status', params.status)
      q.set('page', String(params.page || 1))
      return adminFetch(`/admin/resources?${q.toString()}`)
    },
    auditResource: (id: string, body: any) => adminFetch(`/admin/resources/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    deleteResource: (id: string) => adminFetch(`/admin/resources/${id}`, { method: 'DELETE' }),
    
    questions: (params: any) => {
      const q = new URLSearchParams()
      if (params.status) q.set('status', params.status)
      q.set('page', String(params.page || 1))
      return adminFetch(`/admin/questions?${q.toString()}`)
    },
    auditQuestion: (id: string, body: any) => adminFetch(`/admin/questions/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    auditAnswer: (id: string, body: any) => adminFetch(`/admin/answers/${id}`, { method: 'PUT', body: JSON.stringify(body) })
  }
  ,
  announcements: {
    list: (params: { severity?: string; page?: number; pageSize?: number }) => {
      const q = new URLSearchParams()
      if (params.severity) q.set('severity', params.severity)
      q.set('page', String(params.page || 1))
      q.set('pageSize', String(params.pageSize || 10))
      return adminFetch(`/admin/announcements?${q.toString()}`)
    },
    create: (body: { title: string; markdown: string; scope?: string; severity?: string; pinned?: boolean; validFrom?: number | null; validTo?: number | null }) =>
      adminFetch('/admin/announcements', { method: 'POST', body: JSON.stringify(body) }),
    update: (id: string, body: Partial<{ title: string; markdown: string; scope: string; severity: string; pinned: boolean; validFrom: number; validTo: number }>) =>
      adminFetch(`/admin/announcements/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
    remove: (id: string) => adminFetch(`/admin/announcements/${id}`, { method: 'DELETE' })
  }
}

export const AnnApi = {
  list: (params: { severity?: string; page?: number; pageSize?: number; status?: string }) => {
    const q = new URLSearchParams()
    if (params.severity) q.set('severity', params.severity)
    if (params.status) q.set('status', params.status)
    q.set('page', String(params.page || 1))
    q.set('pageSize', String(params.pageSize || 10))
    return adminFetch(`/announcements?${q.toString()}`)
  },
  detail: (id: string) => adminFetch(`/announcements/${id}`),
  markRead: (id: string) => adminFetch(`/announcements/${id}/read`, { method: 'POST' }),
  markReadBatch: (ids: string[]) => adminFetch(`/announcements/read-batch`, { method: 'POST', body: JSON.stringify({ ids }) }),
  toggleFav: (id: string) => adminFetch(`/announcements/${id}/fav`, { method: 'POST' }),
  unreadCount: () => adminFetch('/announcements/unread-count')
}
