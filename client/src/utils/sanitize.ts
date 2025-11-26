export function sanitizeHTML(html: string) {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const scripts = Array.from(doc.querySelectorAll('script'))
  scripts.forEach(s => s.remove())
  const all = Array.from(doc.body.querySelectorAll('*'))
  const dangerous = ['onerror','onload','onclick','onmouseover','onfocus','onblur']
  all.forEach(el => {
    dangerous.forEach(attr => el.removeAttribute(attr))
  })
  return doc.body.innerHTML
}

