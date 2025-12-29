import { API_BASE, getAuthToken } from './api'

const getHeaders = () => {
  const token = getAuthToken()
  const uid = localStorage.getItem('id')
  const headers: HeadersInit = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  if (uid) headers['X-User-Id'] = uid
  return headers
}

export const UploadsApi = {
  uploadImageBatch: async (files: File[], onProgress?: (pct: number) => void) => {
    const fd = new FormData()
    files.forEach(f => fd.append('images', f))
    let attempt = 0
    const send = (): Promise<any> => new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('POST', `${API_BASE}/uploads/images`)
      const headers = getHeaders()
      Object.entries(headers).forEach(([k,v]) => xhr.setRequestHeader(k, String(v)))
      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable && onProgress) {
          const pct = Math.round((e.loaded / e.total) * 100)
          onProgress(pct)
        }
      }
      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            try { resolve(JSON.parse(xhr.responseText || '{}')) } catch { resolve({}) }
          } else {
            reject(new Error(`HTTP ${xhr.status}`))
          }
        }
      }
      xhr.onerror = () => reject(new Error('Network error'))
      xhr.send(fd)
    })
    while (attempt < 3) {
      try { return await send() } catch { attempt++ }
    }
    throw new Error('Upload failed')
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
  },
  uploadAvatar: async (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(`${API_BASE}/uploads/avatar`, {
      method: 'POST',
      body: fd,
      headers: getHeaders()
    })
    if (!res.ok) throw new Error('Upload failed')
    return res.json()
  }
}
