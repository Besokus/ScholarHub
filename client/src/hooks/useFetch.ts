export async function useFetch(url: string, options?: RequestInit) {
  const token = localStorage.getItem('token')
  const headers = {
    ...(options?.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
  const res = await fetch(url, { ...options, headers })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json()
}

