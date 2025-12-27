import { Router } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'
import { cacheGet, cacheSet, delByPrefix } from '../cache'

const router = Router()

function toClient(c: any) { return { id: c.id, name: c.name, description: c.description || '', department: c.department || '', teacherId: c.teacherId, categoryId: c.categoryId || null, majorCategoryId: c.courseCategoryId || null } }

router.get('/', async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? parseInt(String(req.query.categoryId)) : undefined
    const majorCategoryId = req.query.majorCategoryId ? parseInt(String(req.query.majorCategoryId)) : undefined
    const cacheKey = `courses:list:${categoryId || 'all'}:${majorCategoryId || 'all'}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(JSON.parse(cached))
    
    const where: any = {}
    if (categoryId) where.categoryId = categoryId
    if (majorCategoryId) where.courseCategoryId = majorCategoryId

    const items = await prisma.course.findMany({ where, orderBy: { id: 'desc' } })
    const payload = { items: items.map(toClient) }
    await cacheSet(cacheKey, JSON.stringify(payload), 60)
    res.json(payload)
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
    const { name, description, department, teacherId, categoryId, majorCategoryId } = req.body || {}
    if (!name) return res.status(400).json({ message: 'Invalid' })
    let tId: string = String(teacherId || '')
    if (!tId) {
      tId = (req as any).userId as string
    }
    const created = await prisma.course.create({ 
      data: { 
        name, 
        description, 
        department, 
        teacherId: tId,
        categoryId: categoryId ? parseInt(categoryId) : undefined,
        courseCategoryId: majorCategoryId ? parseInt(majorCategoryId) : undefined
      } 
    })
    await delByPrefix('courses:list')
    try {
      const mcid = (created as any).courseCategoryId as number | null
      if (mcid && mcid > 0) {
        await delByPrefix(`course_categories:${mcid}:courses`)
      }
    } catch {}
    res.json(toClient(created))
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { name, description, department, teacherId, categoryId, majorCategoryId } = req.body || {}
    const data: any = {}
    if (name) data.name = name
    if (description !== undefined) data.description = description
    if (department !== undefined) data.department = department
    if (teacherId !== undefined) data.teacherId = String(teacherId)
    if (categoryId !== undefined) data.categoryId = categoryId ? parseInt(categoryId) : null
    if (majorCategoryId !== undefined) data.courseCategoryId = majorCategoryId ? parseInt(majorCategoryId) : null
    const before = await prisma.course.findUnique({ where: { id }, select: { courseCategoryId: true } })
    const updated = await prisma.course.update({ where: { id }, data })
    await delByPrefix('courses:list')
    try {
      const prev = before?.courseCategoryId || null
      const next = (updated as any).courseCategoryId as number | null
      if (prev && prev > 0) {
        await delByPrefix(`course_categories:${prev}:courses`)
      }
      if (next && next > 0 && next !== prev) {
        await delByPrefix(`course_categories:${next}:courses`)
      }
    } catch {}
    res.json(toClient(updated))
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const old = await prisma.course.findUnique({ where: { id }, select: { courseCategoryId: true } })
    await prisma.course.delete({ where: { id } })
    await delByPrefix('courses:list')
    try {
      const mcid = old?.courseCategoryId || null
      if (mcid && mcid > 0) {
        await delByPrefix(`course_categories:${mcid}:courses`)
      }
    } catch {}
    res.json({ ok: true })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router
