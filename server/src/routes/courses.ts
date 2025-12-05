import { Router } from 'express'

const router = Router()

const courses = [
  { id: '数据结构', name: '数据结构' },
  { id: '线性代数', name: '线性代数' },
  { id: '大学英语', name: '大学英语' }
]

router.get('/', (_req, res) => {
  res.json({ items: courses })
})

export default router

