import { Router } from 'express'
import prisma from '../db'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const type = String(req.query.type || 'answer')
    const status = String(req.query.status || 'unread')
    const uid = (req as any).userId || ''
    const where: any = { type }
    if (uid) where.userId = uid
    if (status === 'unread') where.read = false
    const items = await prisma.notification.findMany({ where, orderBy: { id: 'desc' } })
    res.json({ items })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    await prisma.notification.update({ where: { id }, data: { read: true } })
    res.json({ ok: true })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/read-all', async (req, res) => {
  try {
    const uid = (req as any).userId || ''
    const where: any = {}
    if (uid) where.userId = uid
    await prisma.notification.updateMany({ where, data: { read: true } })
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router
