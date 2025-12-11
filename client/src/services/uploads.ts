import { API_BASE } from './api'

const getHeaders = () => {
  const token = localStorage.getItem('token')
  const uid = localStorage.getItem('id')
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (uid) headers['X-User-Id'] = uid
  return headers
}

export const UploadsApi = {
  uploadImageBatch: async (files: File[]) => {
    const fd = new FormData()
    files.forEach(f => fd.append('images', f))
    const res = await fetch(`${API_BASE}/uploads/images`, { 
      method: 'POST', 
      body: fd,
      headers: getHeaders()
    })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  },
  uploadFile: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API_BASE}/uploads/files`, { 
      method: 'POST', 
      body: fd,
      headers: getHeaders()
    })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  }
}
