import { Router } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'
import { cacheGet, cacheSet, delByPrefix } from '../cache'
import fs from 'fs'

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
    viewCount: typeof q.viewCount === 'number' ? q.viewCount : (typeof (q as any).viewcount === 'number' ? (q as any).viewcount : 0),
    hot: typeof q.viewCount === 'number' ? q.viewCount : (typeof (q as any).viewcount === 'number' ? (q as any).viewcount : 0),
    createdAt: new Date(q.createTime).getTime(),
    createdById: q.studentId ? String(q.studentId) : undefined,
    askerName: q.student?.username || null,
    askerAvatar: q.student?.avatar || null,
    answersCount: typeof (q as any).answersCount === 'number'
      ? (q as any).answersCount
      : (q._count && typeof q._count.answers === 'number' ? q._count.answers : 0)
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
  const orderBy =
    sort === 'viewCount'
      ? { viewCount: 'desc' } as any
      : { createTime: 'desc' }
  const cacheKey = `qa:list:${JSON.stringify({ courseName, sort, status, my, page, pageSize, userId: my === '1' ? userId : '' })}`
  
  // Skip cache for "my questions" to ensure instant updates
  if (my !== '1') {
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(JSON.parse(cached))
  }

  let items: any[] = []
  let total = 0
  if (sort === 'hot') {
    total = await prisma.question.count({ where })
    const list = await prisma.question.findMany({
      where,
      orderBy: { answers: { _count: 'desc' } } as any,
      include: { course: true, student: true, _count: { select: { answers: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
    items = list.map((q) => ({ ...q, answersCount: q._count?.answers || 0 }))
  } else {
    const list = await prisma.question.findMany({
      where,
      orderBy,
      include: { course: true, student: true, _count: { select: { answers: true } } },
      skip: (page - 1) * pageSize,
      take: pageSize
    })
    total = await prisma.question.count({ where })
    items = list.map((q) => ({ ...q, answersCount: q._count?.answers || 0 }))
  }
  try {
    const details: Array<{ id: number; base: number; agg: number; next: number }> = []
    for (const q of items) {
      let agg = 0
      try {
        const s = await cacheGet(`qview:agg:${q.id}`)
        agg = parseInt(s || '0', 10) || 0
      } catch {}
      const base = typeof (q as any).viewCount === 'number'
        ? (q as any).viewCount
        : (typeof (q as any).viewcount === 'number' ? (q as any).viewcount : 0)
      const next = base + agg
      ;(q as any).viewCount = next
      details.push({ id: q.id, base, agg, next })
    }
    try { fs.appendFileSync('qa.log', `${new Date().toISOString()} ${JSON.stringify({ path: '/qa/questions', sort, status, my, page, pageSize, count: items.length, details })}\n`) } catch {}
  } catch {}
  const payload = { items: items.map(toClient), total }
  
  if (my !== '1') {
    await cacheSet(cacheKey, JSON.stringify(payload), 60)
  }
  res.json(payload)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/questions/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const q = await prisma.question.findUnique({ where: { id }, include: { course: true, student: true } })
    if (!q) return res.status(404).json({ message: 'Not found' })
    let agg = 0
    try {
      const s = await cacheGet(`qview:agg:${id}`)
      agg = parseInt(s || '0', 10) || 0
    } catch {}
    const base = typeof (q as any).viewCount === 'number'
      ? (q as any).viewCount
      : (typeof (q as any).viewcount === 'number' ? (q as any).viewcount : 0)
    const next = base + agg
    const merged = { ...q, viewCount: next }
    try { res.set('Cache-Control', 'no-store') } catch {}
    try { fs.appendFileSync('qa.log', `${new Date().toISOString()} ${JSON.stringify({ path: '/qa/questions/:id', id, base, agg, next })}\n`) } catch {}
    res.json(toClient(merged))
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

router.put('/questions/:id', requireAuth, async (req, res) => {
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
    const before = await prisma.question.findUnique({ where: { id } })
    const updated = await prisma.question.update({ where: { id }, data, include: { course: true, student: true } })
    if (status && before && before.status !== updated.status) {
      try {
        const entry = { ts: Date.now(), id, user: (req as any).userId || 'unknown', from: before.status, to: updated.status }
        require('fs').appendFileSync('status.log', `${new Date().toISOString()} ${JSON.stringify(entry)}\n`)
      } catch {}
    }
    await delByPrefix('qa:list:')
    res.json(toClient(updated))
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.delete('/questions/:id', requireAuth, async (req, res) => {
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

router.get('/boards/rank/viewed', async (req, res) => {
  try {
    const range = String(req.query.range || 'all')
    const limit = parseInt(String(req.query.limit || '10')) || 10
    const cacheKey = `qa:boards:rank:${JSON.stringify({ range, limit })}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(JSON.parse(cached))
    let items: Array<{ id: number; name: string; description: string; views: number }> = []
    if (range === 'all') {
      const rows: Array<{ id: number; name: string; description: string | null; views: number | null }> = await prisma.$queryRaw`
        SELECT c.id, c.name, c.description, COALESCE(SUM(q.viewcount), 0) AS views
        FROM "Course" c
        LEFT JOIN "Question" q ON q."courseId" = c.id
        GROUP BY c.id
        ORDER BY views DESC
        LIMIT ${limit}
      `
      items = rows.map(r => ({ id: r.id, name: r.name, description: r.description || '', views: (r.views || 0) }))
    } else {
      const days = range === '7d' ? 7 : 30
      const courses = await prisma.course.findMany({ select: { id: true, name: true, description: true } })
      const now = Date.now()
      const list: Array<{ id: number; name: string; description: string; views: number }> = []
      for (const c of courses) {
        let sum = 0
        for (let i = 0; i < days; i++) {
          const d = new Date(now - i * 24 * 60 * 60 * 1000)
          const y = d.getUTCFullYear()
          const m = String(d.getUTCMonth() + 1).padStart(2, '0')
          const dd = String(d.getUTCDate()).padStart(2, '0')
          const key = `boardviews:daily:${c.id}:${y}${m}${dd}`
          const v = await cacheGet(key)
          sum += parseInt(v || '0', 10) || 0
        }
        list.push({ id: c.id, name: c.name, description: c.description || '', views: sum })
      }
      list.sort((a, b) => b.views - a.views)
      items = list.slice(0, limit)
    }
    const payload = { items }
    await cacheSet(cacheKey, JSON.stringify(payload), 60)
    try { fs.appendFileSync('qa.log', `${new Date().toISOString()} ${JSON.stringify({ path: '/qa/boards/rank/viewed', range, limit, count: items.length, top: items[0] || null })}\n`) } catch {}
    res.json(payload)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router
