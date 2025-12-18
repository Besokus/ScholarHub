export const API_BASE = (import.meta as any).env?.VITE_API_URL || 'http://localhost:3001/api'
export const API_ORIGIN = new URL(API_BASE).origin

export async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('token')
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
    res = await fetch(`${API_BASE}${path}`, { ...options, headers, signal: ctrl.signal })
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
  if (!res.ok) {
    const message = (data && (data.message || data.error)) || `HTTP ${res.status}`
    const err: any = new Error(message)
    err.status = res.status
    err.data = data
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
 
export const ResourcesApi = {
  list: (params: { q?: string; courseId?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params.q) q.set('q', params.q)
    if (params.courseId) q.set('courseId', params.courseId)
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
  detail: (id: string) => apiFetch(`/qa/questions/${id}`)
}

export const AnswersApi = {
  listByQuestion: (id: string | number) => apiFetch(`/questions/${id}/answers`),
  createForQuestion: (id: string | number, body: { content: string; attachments?: string | null }) =>
    apiFetch(`/questions/${id}/answers`, { method: 'POST', body: JSON.stringify(body) }),
  detail: (id: string | number) => apiFetch(`/answers/${id}`),
  remove: (id: string | number) => apiFetch(`/answers/${id}`, { method: 'DELETE' })
}

export const NotiApi = {
  unreadAnswers: () => apiFetch('/notifications?type=answer&status=unread'),
  markRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'POST' }),
  readAll: () => apiFetch('/notifications/read-all', { method: 'POST' })
}
