import { Router } from 'express'

const router = Router()

type Noti = { id: string; questionId: string; title: string; createdAt: number; read: boolean }

let unread: Noti[] = [
  { id: 'n1', questionId: 'q1', title: '你的问题有新回答', createdAt: Date.now(), read: false }
]

router.get('/', (req, res) => {
  const type = String(req.query.type || 'answer')
  const status = String(req.query.status || 'unread')
  const list = status === 'unread' ? unread : []
  res.json({ items: list })
})

router.post('/:id/read', (req, res) => {
  const id = req.params.id
  unread = unread.filter(n => n.id !== id)
  res.json({ ok: true })
})

router.post('/read-all', (_req, res) => {
  unread = []
  res.json({ ok: true })
})

export default router
