export const API_BASE = 'http://localhost:3000/api'

export async function apiFetch(path: string, options?: RequestInit) {
  const token = localStorage.getItem('token')
  const uid = localStorage.getItem('id')
  const headers = {
    'Content-Type': 'application/json',
    ...(options?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(uid ? { 'X-User-Id': uid } : {})
  }
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
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
  downloadLog: (id: string) => apiFetch(`/resources/${id}/downloads`, { method: 'POST' })
}

export const QaApi = {
  list: (params: { courseId?: string; sort?: string; status?: string; page?: number; pageSize?: number }) => {
    const q = new URLSearchParams()
    if (params.courseId) q.set('courseId', params.courseId)
    if (params.sort) q.set('sort', params.sort)
    if (params.status) q.set('status', params.status)
    q.set('page', String(params.page || 1))
    q.set('pageSize', String(params.pageSize || 15))
    return apiFetch(`/qa/questions?${q.toString()}`)
  },
  create: (body: any) => apiFetch('/qa/questions', { method: 'POST', body: JSON.stringify(body) }),
  detail: (id: string) => apiFetch(`/qa/questions/${id}`)
}

export const NotiApi = {
  unreadAnswers: () => apiFetch('/notifications?type=answer&status=unread'),
  markRead: (id: string) => apiFetch(`/notifications/${id}/read`, { method: 'POST' })
}
