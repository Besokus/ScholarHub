import { Router } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'
import { delByPrefix } from '../cache'
import fs from 'fs'

const router = Router()

function toClient(a: any) {
  const name = a.teacher?.fullName || a.teacher?.username || ''
  const role = a.teacher?.role || ''
  return { id: a.id, questionId: a.questionId, teacherId: a.teacherId, content: a.content, attachments: a.attachments || null, createTime: a.createTime, responderName: name, responderRole: role }
}

function sanitizeHtmlLite(input: string): string {
  let s = String(input || '')
  s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
  s = s.replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
  s = s.replace(/javascript\s*:/gi, '')
  s = s.replace(/<iframe[\s\S]*?>[\s\S]*?<\/iframe>/gi, '')
  return s
}

function normalizeAttachments(att: any): string | null {
  if (!att) return null
  let arr: any = null
  try {
    if (typeof att === 'string') arr = JSON.parse(att)
    else arr = att
  } catch {
    return null
  }
  if (!Array.isArray(arr)) return null
  const urls = arr.filter((u) => typeof u === 'string').map((u: string) => u.trim()).filter((u: string) => u.startsWith('/uploads/'))
  if (!urls.length) return null
  try { return JSON.stringify(urls) } catch { return null }
}

router.get('/questions/:id/answers', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const items = await prisma.answer.findMany({ where: { questionId: id }, orderBy: { id: 'desc' }, include: { teacher: { select: { fullName: true, username: true, role: true } } } })
    res.json({ items: items.map(toClient) })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/questions/:id/answers', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { content, attachments } = req.body || {}
    if (!content) return res.status(400).json({ message: 'Invalid' })
    const teacherId = (req as any).userId as string
    const sanitized = sanitizeHtmlLite(String(content))
    const normalizedAtt = normalizeAttachments(attachments)
    const created = await prisma.answer.create({ data: { questionId: id, teacherId, content: sanitized, attachments: normalizedAtt || undefined } , include: { teacher: { select: { fullName: true, username: true, role: true } } } })
    const q = await prisma.question.findUnique({ where: { id } })
    if (q?.studentId) {
      await prisma.notification.create({ data: { userId: q.studentId, questionId: id, answerId: created.id, type: 'answer' } })
      await delByPrefix('noti:list:')
    }
    res.json(toClient(created))
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/answers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const a = await prisma.answer.findUnique({ where: { id }, include: { teacher: { select: { fullName: true, username: true, role: true } } } })
    if (!a) return res.status(404).json({ message: 'Not found' })
    res.json(toClient(a))
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.delete('/answers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    await prisma.answer.delete({ where: { id } })
    res.json({ ok: true })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/questions/:id/view', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ message: 'Invalid id' })
    try {
      res.set('Cache-Control', 'no-cache, no-store, must-revalidate')
      res.set('Pragma', 'no-cache')
      res.set('Expires', '0')
    } catch {}
    const ip = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '')
    const key = `qview:ip:${ip}:qid:${id}`
    let limited = false
    try {
      const { incrWithTTL } = await import('../cache')
      const n = await incrWithTTL(key, 60)
      if (n > 1) {
        limited = true
        try { fs.appendFileSync('view.log', `${new Date().toISOString()} ${JSON.stringify({ phase: 'rate_limit', id, ip, key, n })}\n`) } catch {}
        return res.json({ ok: true, limited: true })
      }
    } catch {}
    const aggKey = `qview:agg:${id}`
    const AGG_TTL = 300
    let currentAgg = 1
    try {
      const { incrWithTTL } = await import('../cache')
      currentAgg = await incrWithTTL(aggKey, AGG_TTL)
    } catch {}
    let flushed = false
    let delta = 0
    // Batch update: only write to DB when we have accumulated enough views (e.g. 10)
    // or if we want to ensure low-traffic questions get updated, we could check time, but for now strict batching
    // The detail page combines DB + Cache, so users always see real-time count.
    // The list page might lag slightly, which is acceptable for performance.
    if (currentAgg >= 10) {
      try {
        const { getAndResetWithTTL } = await import('../cache')
        const prev = await getAndResetWithTTL(aggKey, '0', AGG_TTL)
        delta = parseInt(prev || '0', 10) || 0
      } catch { delta = 0 }
      if (delta > 0) {
        await prisma.$executeRaw`UPDATE "Question" SET "viewcount" = "viewcount" + ${delta} WHERE id = ${id}`
        flushed = true
        try { await delByPrefix('qa:list:') } catch {}
      }
    }
    try {
      let courseId = 0
      try {
        const { cacheGet, cacheSet } = await import('../cache')
        const mk = `q2c:${id}`
        const s = await cacheGet(mk)
        courseId = parseInt(s || '0', 10) || 0
        if (!courseId) {
          const q = await prisma.question.findUnique({ where: { id }, select: { courseId: true } })
          courseId = q?.courseId || 0
          if (courseId) await cacheSet(mk, String(courseId), 24 * 60 * 60)
        }
      } catch {}
      if (courseId) {
        const d = new Date()
        const y = d.getUTCFullYear()
        const m = String(d.getUTCMonth() + 1).padStart(2, '0')
        const dd = String(d.getUTCDate()).padStart(2, '0')
        const dayKey = `boardviews:daily:${courseId}:${y}${m}${dd}`
        try {
          const { incrWithTTL } = await import('../cache')
          await incrWithTTL(dayKey, 90 * 24 * 60 * 60)
        } catch {}
      }
    } catch {}
    let base = 0
    try {
      const rows: Array<{ viewcount: number }> = await prisma.$queryRaw`SELECT "viewcount" FROM "Question" WHERE id = ${id}`
      base = rows && rows[0] ? (rows[0].viewcount || 0) : 0
    } catch {}
    let aggNow = 0
    try {
      const { cacheGet } = await import('../cache')
      const s = await cacheGet(aggKey)
      aggNow = parseInt(s || '0', 10) || 0
    } catch {}
    const total = base + aggNow
    try { fs.appendFileSync('view.log', `${new Date().toISOString()} ${JSON.stringify({ phase: 'response', id, ip, limited, currentAgg, delta, flushed, base, aggNow, total })}\n`) } catch {}
    res.json({ ok: true, viewCount: total, flushed })
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Server error' })
  }
})

export default router
