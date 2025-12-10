import { Router } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'

const router = Router()

function toClientShape(r: any) {
  return {
    id: r.id,
    title: r.title,
    summary: r.description || '',
    courseId: r.course?.name || String(r.courseId),
    type: 'FILE',
    size: '',
    downloadCount: r.downloadCount || 0,
    fileUrl: r.filePath ? (r.filePath.startsWith('/uploads') ? r.filePath : `/uploads/${r.filePath}`) : undefined
  }
}

async function ensureCourseByName(name: string, teacherId: string) {
  let course = await prisma.course.findFirst({ where: { name } })
  if (!course) {
    course = await prisma.course.create({ data: { name, department: 'ͨʶ', teacherId } })
  }
  return course
}

router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    const courseId = String(req.query.courseId || '')
    const page = parseInt(String(req.query.page || '1')) || 1
    const pageSize = parseInt(String(req.query.pageSize || '20')) || 20
    const where: any = {}
    if (q) where.title = { contains: q }
    if (courseId && courseId !== 'all') {
      const course = await prisma.course.findFirst({ where: { name: courseId } })
      if (course) where.courseId = course.id
      else where.courseId = -1
    }
    const [items, total] = await Promise.all([
      prisma.resource.findMany({ where, include: { course: true }, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.resource.count({ where })
    ])
    res.json({ items: items.map(toClientShape), total })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const r = await prisma.resource.findUnique({ where: { id }, include: { course: true } })
    if (!r) return res.status(404).json({ message: 'Not found' })
    res.json(toClientShape(r))
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, summary, courseId, fileUrl } = req.body || {}
    if (!title || !summary || !courseId || !fileUrl) return res.status(400).json({ message: 'Invalid' })
    const uploaderId = (req as any).userId as string
    const course = await ensureCourseByName(String(courseId), uploaderId)
    const created = await prisma.resource.create({
      data: {
        title,
        description: summary,
        filePath: fileUrl,
        uploaderId: uploaderId,
        courseId: course.id,
        viewType: 'PUBLIC'
      },
      include: { course: true }
    })
    res.json(toClientShape(created))
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { title, summary, courseId, fileUrl } = req.body || {}
    const data: any = {}
    if (title) data.title = title
    if (summary) data.description = summary
    if (fileUrl) data.filePath = fileUrl
    if (courseId && courseId !== 'all') {
      const course = await ensureCourseByName(String(courseId), (req as any).userId as string)
      data.courseId = course.id
    }
    const updated = await prisma.resource.update({ where: { id }, data, include: { course: true } })
    res.json(toClientShape(updated))
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    await prisma.resource.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/:id/downloads', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const updated = await prisma.resource.update({ where: { id }, data: { downloadCount: { increment: 1 } } })
    res.json({ downloadCount: updated.downloadCount })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/me/uploads', async (req, res) => {
  try {
    const uid = parseInt((req.header('X-User-Id') || '').trim() || '0', 10)
    const userId = (req as any).userId
    const list = await prisma.resource.findMany({ where: userId ? { uploaderId: userId } : {}, include: { course: true }, orderBy: { id: 'desc' } })
    res.json({ items: list.map(toClientShape) })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router

