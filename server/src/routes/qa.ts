import { Router } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'
import { cacheGet, cacheSet, delByPrefix } from '../cache'

const router = Router()

function toClient(q: any) {
  const imgs = (q.images || '').split(',').filter(Boolean)
  return {
    id: q.id,
    courseId: q.course?.name || String(q.courseId),
    title: q.title,
    content: q.content,
    contentHTML: q.content,
    images: imgs,
    status: q.status === 'ANSWERED' ? 'solved' : 'open',
    hot: 0,
    createdAt: new Date(q.createTime).getTime(),
    createdById: q.studentId ? String(q.studentId) : undefined
  }
}

async function ensureCourseByName(name: string, teacherId: string) {
  let course = await prisma.course.findFirst({ where: { name } })
  if (!course) course = await prisma.course.create({ data: { name, department: '通识', teacherId } })
  return course
}

router.get('/questions', async (req, res) => {
  try {
    const courseName = String(req.query.courseId || '')
    const sort = String(req.query.sort || 'latest')
    const status = String(req.query.status || '')
    const my = String(req.query.my || '')
    const userId = (req as any).userId || ''
    const page = parseInt(String(req.query.page || '1')) || 1
    const pageSize = parseInt(String(req.query.pageSize || '15')) || 15
    const where: any = {}
    if (courseName) {
      const course = await prisma.course.findFirst({ where: { name: courseName } })
      if (course) where.courseId = course.id
      else where.courseId = -1
    }
    if (status === 'unanswered') where.status = 'UNANSWERED'
    if (my === '1' && userId) where.studentId = userId
    const orderBy = sort === 'hot' ? { downloadCount: 'desc' } as any : { createTime: 'desc' }
    const cacheKey = `qa:list:${JSON.stringify({ courseName, sort, status, my, page, pageSize })}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(JSON.parse(cached))
    const [items, total] = await Promise.all([
      prisma.question.findMany({ where, orderBy, include: { course: true }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.question.count({ where })
    ])
    const payload = { items: items.map(toClient), total }
    await cacheSet(cacheKey, JSON.stringify(payload), 60)
    res.json(payload)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/questions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const q = await prisma.question.findUnique({ where: { id }, include: { course: true } })
    if (!q) return res.status(404).json({ message: 'Not found' })
    res.json(toClient(q))
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/questions', requireAuth, async (req, res) => {
  try {
    const { courseId, title, content, contentHTML, images } = req.body || {}
    const text = contentHTML || content
    if (!courseId || !title || !text) return res.status(400).json({ message: 'Invalid' })
    const studentId = (req as any).userId as string
    const course = await ensureCourseByName(String(courseId), studentId)
    const created = await prisma.question.create({
      data: {
        courseId: course.id,
        title,
        content: text,
        studentId: studentId,
        images: Array.isArray(images) ? images.join(',') : undefined
      },
      include: { course: true }
    })
    await delByPrefix('qa:list:')
    res.json(toClient(created))
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.put('/questions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { courseId, title, content, contentHTML, images, status } = req.body || {}
    const data: any = {}
  if (courseId) { const c = await ensureCourseByName(String(courseId), (req as any).userId || 'admin'); data.courseId = c.id }
    if (title) data.title = title
    const text = contentHTML || content
    if (text) data.content = text
    if (Array.isArray(images)) data.images = images.join(',')
    if (status) data.status = status === 'solved' ? 'ANSWERED' : 'UNANSWERED'
    const updated = await prisma.question.update({ where: { id }, data, include: { course: true } })
    await delByPrefix('qa:list:')
    res.json(toClient(updated))
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.delete('/questions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    await prisma.question.delete({ where: { id } })
    await delByPrefix('qa:list:')
    res.json({ ok: true })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router
