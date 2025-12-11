import { Router } from 'express'
import prisma from '../db'
import { cacheGet, cacheSet, delByPrefix } from '../cache'

const router = Router()

router.get('/', async (req, res) => {
  try {
    const type = String(req.query.type || 'answer')
    const status = String(req.query.status || 'unread')
    const uid = (req as any).userId || ''
    const where: any = { type }
    if (uid) where.userId = uid
    if (status === 'unread') where.read = false
    const cacheKey = `noti:list:${JSON.stringify({ type, status, uid })}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(JSON.parse(cached))
    const items = await prisma.notification.findMany({ where, orderBy: { id: 'desc' } })
    const payload = { items }
    await cacheSet(cacheKey, JSON.stringify(payload), 30)
    res.json(payload)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/:id/read', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    await prisma.notification.update({ where: { id }, data: { read: true } })
    await delByPrefix('noti:list:')
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
    await delByPrefix('noti:list:')
    res.json({ ok: true })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router
