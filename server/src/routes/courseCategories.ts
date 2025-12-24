import { Router } from 'express'
import prisma from '../db'
import { cacheGet, cacheSet, delByPrefix } from '../cache'
import { requireAuth } from '../middleware/auth'

const router = Router()

function toClient(c: any) {
  return {
    id: c.id,
    name: c.name,
    description: c.description || '',
    createdAt: c.createdAt
  }
}

router.get('/', async (_req, res) => {
  try {
    const cacheKey = 'course_categories:list'
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(JSON.parse(cached))
    const items = await prisma.courseCategory.findMany({ orderBy: { id: 'asc' } })
    const payload = { items: items.map(toClient) }
    await cacheSet(cacheKey, JSON.stringify(payload), 300)
    res.json(payload)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/:id/courses', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!id || id <= 0) return res.status(400).json({ message: 'Invalid category id' })
    const cacheKey = `course_categories:${id}:courses`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(JSON.parse(cached))
    const items = await prisma.course.findMany({
      where: { courseCategoryId: id },
      orderBy: { id: 'desc' },
      select: { id: true, name: true, description: true }
    })
    const payload = { items }
    await cacheSet(cacheKey, JSON.stringify(payload), 300)
    res.json(payload)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// Create single category (admin only)
router.post('/', requireAuth, async (req, res) => {
  try {
    const role = (req as any).userRole
    if (role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' })
    const { name, description } = (req.body || {}) as { name?: string; description?: string }
    const n = String(name || '').trim()
    if (!n) return res.status(400).json({ message: 'Name required' })
    const created = await prisma.courseCategory.create({ data: { name: n, description: description || undefined } })
    await delByPrefix('course_categories')
    res.json(toClient(created))
  } catch (err: any) {
    if (err?.code === 'P2002') return res.status(400).json({ message: 'Duplicate category name' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// Bulk create categories (admin only)
router.post('/bulk', requireAuth, async (req, res) => {
  try {
    const role = (req as any).userRole
    if (role !== 'ADMIN') return res.status(403).json({ message: 'Forbidden' })
    const { names } = (req.body || {}) as { names?: string[] }
    if (!Array.isArray(names) || !names.length) return res.status(400).json({ message: 'Names required' })
    const items = names.map(n => ({ name: String(n || '').trim() })).filter(x => !!x.name)
    if (!items.length) return res.status(400).json({ message: 'No valid names' })
    await prisma.courseCategory.createMany({ data: items, skipDuplicates: true })
    await delByPrefix('course_categories')
    const list = await prisma.courseCategory.findMany({ orderBy: { id: 'asc' } })
    res.json({ items: list.map(toClient) })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router
