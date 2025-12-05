import { Router } from 'express'

const router = Router()

type Resource = { id: string; title: string; summary: string; courseId: string; size: string; type: string; downloadCount: number; uploaderId?: string; uploaderName?: string; fileUrl?: string }

const resources: Resource[] = [
  { id: 'r1', title: '数据结构题库', summary: '常见题型', courseId: '数据结构', size: '2.4MB', type: 'PDF', downloadCount: 12 },
  { id: 'r2', title: '线性代数总结', summary: '知识点整理', courseId: '线性代数', size: '1.1MB', type: 'PDF', downloadCount: 4 },
  { id: 'r3', title: '英语阅读答案', summary: '第三章', courseId: '大学英语', size: '0.8MB', type: 'PDF', downloadCount: 6 }
]

router.get('/', (req, res) => {
  const q = String(req.query.q || '').toLowerCase()
  const courseId = String(req.query.courseId || '')
  const page = parseInt(String(req.query.page || '1')) || 1
  const pageSize = parseInt(String(req.query.pageSize || '20')) || 20
  let list = resources
  if (q) list = list.filter(r => r.title.toLowerCase().includes(q))
  if (courseId && courseId !== 'all') list = list.filter(r => r.courseId === courseId)
  const total = list.length
  const items = list.slice((page - 1) * pageSize, page * pageSize)
  res.json({ items, total })
})

router.get('/:id', (req, res) => {
  const r = resources.find(x => x.id === req.params.id)
  if (!r) return res.status(404).json({ message: 'Not found' })
  res.json(r)
})

router.post('/', (req, res) => {
  const { title, summary, courseId, type, size, fileUrl } = req.body || {}
  if (!title || !summary || !courseId) return res.status(400).json({ message: 'Invalid' })
  const id = `r${Date.now()}`
  const uploaderId = (req.header('X-User-Id') || '').trim() || undefined
  const item: Resource = { id, title, summary, courseId, type: type || 'PDF', size: size || '0MB', downloadCount: 0, uploaderId, uploaderName: uploaderId ? `用户${uploaderId}` : '系统', fileUrl }
  resources.unshift(item)
  res.json(item)
})

const downloadLogs: { id: string; resourceId: string; userId?: string; time: number }[] = []

router.post('/:id/downloads', (req, res) => {
  const r = resources.find(x => x.id === req.params.id)
  if (!r) return res.status(404).json({ message: 'Not found' })
  r.downloadCount += 1
  const userId = (req.header('X-User-Id') || '').trim() || undefined
  downloadLogs.push({ id: `d${Date.now()}`, resourceId: r.id, userId, time: Date.now() })
  res.json({ downloadCount: r.downloadCount })
})

router.get('/downloads/me', (req, res) => {
  const userId = (req.header('X-User-Id') || '').trim()
  const list = downloadLogs.filter(l => !userId || l.userId === userId)
  res.json({ items: list })
})

router.get('/me/uploads', (req, res) => {
  const userId = (req.header('X-User-Id') || '').trim()
  const list = resources.filter(r => !userId || r.uploaderId === userId)
  res.json({ items: list })
})

export default router
