import { Router } from 'express'
import prisma from '../db'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { cacheGet, cacheSet, delByPrefix } from '../cache'

const router = Router()

// Helper to build tree
function buildTree(items: any[], parentId: number | null = null): any[] {
  return items
    .filter(item => item.parentId === parentId)
    .map(item => ({
      ...item,
      children: buildTree(items, item.id)
    }))
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

// Get full category tree
router.get('/tree', async (req, res) => {
  try {
    const cacheKey = 'categories:tree'
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(JSON.parse(cached))

    const allCategories = await prisma.category.findMany({
      include: {
        _count: { select: { courses: true } }
      },
      orderBy: { sortOrder: 'asc' }
    })
    
    const tree = buildTree(allCategories)
    await cacheSet(cacheKey, JSON.stringify(tree), 3600) // 1 hour cache
    res.json(tree)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// Get flat list
router.get('/', async (req, res) => {
  try {
    const items = await prisma.category.findMany({
      orderBy: { sortOrder: 'asc' }
    })
    res.json(items)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// Create category
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, code, parentId, sortOrder } = req.body
    if (!name || !code) return res.status(400).json({ message: 'Name and Code are required' })

    const exists = await prisma.category.findUnique({ where: { code } })
    if (exists) return res.status(400).json({ message: 'Code already exists' })

    const category = await prisma.category.create({
      data: {
        name,
        code,
        parentId: parentId ? parseInt(parentId) : null,
        sortOrder: parseInt(sortOrder) || 0
      }
    })
    
    await delByPrefix('categories:')
    res.json(category)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// Update category
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    const { name, code, parentId, sortOrder } = req.body

    const category = await prisma.category.update({
      where: { id },
      data: {
        name,
        code,
        parentId: parentId !== undefined ? (parentId ? parseInt(parentId) : null) : undefined,
        sortOrder: sortOrder !== undefined ? parseInt(sortOrder) : undefined
      }
    })

    await delByPrefix('categories:')
    res.json(category)
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// Delete category
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const id = parseInt(req.params.id)
    
    // Check for children or courses
    const childrenCount = await prisma.category.count({ where: { parentId: id } })
    if (childrenCount > 0) return res.status(400).json({ message: 'Cannot delete category with children' })
    
    const coursesCount = await prisma.course.count({ where: { categoryId: id } })
    if (coursesCount > 0) return res.status(400).json({ message: 'Cannot delete category with assigned courses' })

    await prisma.category.delete({ where: { id } })
    
    await delByPrefix('categories:')
    res.json({ ok: true })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router
