import { Router } from 'express'
import prisma from '../db'

const router = Router()

function toClient(a: any) {
  return { id: a.id, questionId: a.questionId, teacherId: a.teacherId, content: a.content, attachments: a.attachments || null, createTime: a.createTime }
}

router.get('/questions/:id/answers', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const items = await prisma.answer.findMany({ where: { questionId: id }, orderBy: { id: 'desc' } })
    res.json({ items: items.map(toClient) })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/questions/:id/answers', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { content, attachments } = req.body || {}
    if (!content) return res.status(400).json({ message: 'Invalid' })
    const teacherId = (req as any).userId || (await prisma.user.findUnique({ where: { username: 'admin' } }))!.id
    const created = await prisma.answer.create({ data: { questionId: id, teacherId, content, attachments } })
    const q = await prisma.question.findUnique({ where: { id } })
    if (q?.studentId) {
      await prisma.notification.create({ data: { userId: q.studentId, questionId: id, answerId: created.id, type: 'answer' } })
    }
    res.json(toClient(created))
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/answers/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const a = await prisma.answer.findUnique({ where: { id } })
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

export default router
