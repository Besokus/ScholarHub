import { API_BASE } from './api'

export const CoursesApi = {
  list: async (params?: { majorCategoryId?: number }) => {
    const q = new URLSearchParams()
    if (params?.majorCategoryId) q.set('majorCategoryId', String(params.majorCategoryId))
    const url = q.toString() ? `${API_BASE}/courses?${q.toString()}` : `${API_BASE}/courses`
    const res = await fetch(url)
    if (!res.ok) throw new Error('HTTP error')
    return res.json()
  }
}

