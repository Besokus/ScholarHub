import { Router } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'

const router = Router()

function toClient(c: any) { return { id: c.id, name: c.name, description: c.description || '', department: c.department || '', teacherId: c.teacherId } }

router.get('/', async (req, res) => {
  try {
    const items = await prisma.course.findMany({ orderBy: { id: 'desc' } })
    res.json({ items: items.map(toClient) })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const c = await prisma.course.findUnique({ where: { id } })
    if (!c) return res.status(404).json({ message: 'Not found' })
    res.json(toClient(c))
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { name, description, department, teacherId } = req.body || {}
    if (!name) return res.status(400).json({ message: 'Invalid' })
    let tId: string = String(teacherId || '')
    if (!tId) {
      tId = (req as any).userId as string
    }
    const created = await prisma.course.create({ data: { name, description, department, teacherId: tId } })
    res.json(toClient(created))
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { name, description, department, teacherId } = req.body || {}
    const data: any = {}
    if (name) data.name = name
    if (description !== undefined) data.description = description
    if (department !== undefined) data.department = department
    if (teacherId !== undefined) data.teacherId = String(teacherId)
    const updated = await prisma.course.update({ where: { id }, data })
    res.json(toClient(updated))
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    await prisma.course.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router
