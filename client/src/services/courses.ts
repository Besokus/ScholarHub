import { API_BASE } from './api'

export const CoursesApi = {
  list: async () => {
    const res = await fetch(`${API_BASE}/courses`)
    if (!res.ok) throw new Error('HTTP error')
    return res.json()
  }
}

