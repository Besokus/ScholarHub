import { Router } from 'express'

const router = Router()

type Question = { id: string; courseId: string; title: string; content: string; contentHTML?: string; images?: string[]; status: 'open' | 'solved'; hot: number; createdAt: number; createdById?: string }

const questions: Question[] = [
  { id: 'q1', courseId: '数据结构', title: '栈与队列的区别', content: '入栈出栈与先进先出', status: 'open', hot: 12, createdAt: Date.now() - 86400000 },
  { id: 'q2', courseId: '线性代数', title: '矩阵秩如何理解', content: '线性无关数量', status: 'solved', hot: 30, createdAt: Date.now() - 3600000 }
]

router.get('/questions', (req, res) => {
  const courseId = String(req.query.courseId || '')
  const sort = String(req.query.sort || 'latest')
  const status = String(req.query.status || '')
  const my = String(req.query.my || '')
  const userId = (req.header('X-User-Id') || '').trim()
  const page = parseInt(String(req.query.page || '1')) || 1
  const pageSize = parseInt(String(req.query.pageSize || '15')) || 15
  let list = questions
  if (courseId) list = list.filter(q => q.courseId === courseId)
  if (status === 'unanswered') list = list.filter(q => q.status === 'open')
  if (my === '1' && userId) list = list.filter(q => q.createdById === userId)
  if (sort === 'latest') list = list.sort((a, b) => b.createdAt - a.createdAt)
  if (sort === 'hot') list = list.sort((a, b) => b.hot - a.hot)
  const total = list.length
  const items = list.slice((page - 1) * pageSize, page * pageSize)
  res.json({ items, total })
})

router.get('/questions/:id', (req, res) => {
  const q = questions.find(x => x.id === req.params.id)
  if (!q) return res.status(404).json({ message: 'Not found' })
  res.json(q)
})

router.post('/questions', (req, res) => {
  const { courseId, title, content, contentHTML, images } = req.body || {}
  if (!courseId || !title || (!content && !contentHTML)) return res.status(400).json({ message: 'Invalid' })
  const createdById = (req.header('X-User-Id') || '').trim() || undefined
  const item: Question = { id: `q${Date.now()}`, courseId, title, content: content || '', contentHTML, images, status: 'open', hot: 0, createdAt: Date.now(), createdById }
  questions.unshift(item)
  res.json(item)
})

export default router
