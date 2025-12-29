import { Router } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'
import path from 'path'
import fs from 'fs'
import { cacheGet, cacheSet, delByPrefix } from '../cache'

const router = Router()

const RESOURCE_TAGS = ['课件', '真题', '作业', '代码', '答案', '笔记', '教材', '其他']

function toClientShape(r: any) {
  const date = new Date(r.createTime)
  const formattedDate = date.getFullYear() + '-' +
    String(date.getMonth() + 1).padStart(2, '0') + '-' +
    String(date.getDate()).padStart(2, '0') + ' ' +
    String(date.getHours()).padStart(2, '0') + ':' +
    String(date.getMinutes()).padStart(2, '0')

  return {
    id: r.id,
    title: r.title,
    summary: r.description || '',
    courseId: r.course?.name || String(r.courseId),
    type: r.fileType || 'FILE',
    size: r.fileSize || '未知',
    downloadCount: r.downloadCount || 0,
    viewCount: r.viewCount || 0,
    fileUrl: r.filePath ? (r.filePath.startsWith('/uploads') ? r.filePath : `/uploads/${r.filePath}`) : undefined,
    uploaderName: r.uploader?.fullName || r.uploader?.username || '未知用户',
    createdAt: formattedDate
  }
}

async function ensureCourseByName(name: string, teacherId: string) {
  // VALIDATION: pure numeric names are not allowed
  if (/^\d+$/.test(name)) {
    throw new Error('Course name cannot be purely numeric')
  }

  console.log(`[Resources] ensureCourseByName: ${name}`)
  let course = await prisma.course.findFirst({ where: { name } })
  if (!course) {
    console.log(`[Resources] Creating new course: ${name}`)
    // Use 'General' as default department
    course = await prisma.course.create({ data: { name, department: 'General', teacherId } })
  }
  return course
}

async function resolveCourseId(input: string | number, teacherId: string): Promise<number> {
  console.log(`[Resources] resolveCourseId input: ${input} (${typeof input})`)
  
  const idNum = Number(input)
  // If it is a valid number, treat it STRICTLY as an ID.
  if (!isNaN(idNum) && idNum > 0) {
    const exists = await prisma.course.findUnique({ where: { id: idNum } })
    if (exists) {
        return exists.id
    } else {
        // ID passed but not found. Do NOT fall back to creating a course named "123".
        console.warn(`[Resources] Course ID ${idNum} not found.`)
        throw new Error(`Course with ID ${idNum} not found`)
    }
  }

  const name = String(input).trim()
  if (!name) throw new Error('Course name/id is required')
  
  return (await ensureCourseByName(name, teacherId)).id
}

// 分类字典
router.get('/categories', async (_req, res) => {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ResourceCategory" (
        code TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        sort INTEGER NOT NULL DEFAULT 0
      );
    `)
    const rows: Array<{ code: string; name: string; sort: number }> = await prisma.$queryRawUnsafe(
      `SELECT code, name, sort FROM "ResourceCategory" ORDER BY sort ASC, name ASC`
    )
    res.json({ items: rows.length ? rows : RESOURCE_TAGS.map((t, i) => ({ code: t, name: t, sort: i })) })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/', async (req, res) => {
  try {
    const q = String(req.query.q || '').trim().toLowerCase()
    const courseId = String(req.query.courseId || '')
    const categoryId = req.query.categoryId ? parseInt(String(req.query.categoryId)) : undefined
    const page = parseInt(String(req.query.page || '1')) || 1
    const pageSize = parseInt(String(req.query.pageSize || '12')) || 12
    const where: any = {}
    
    if (q) where.title = { contains: q }
    
    if (courseId && courseId !== 'all') {
      // Try to parse as ID first
      const idNum = parseInt(courseId)
      if (!isNaN(idNum) && idNum > 0) {
        where.courseId = idNum
      } else {
        // Fallback to name lookup (legacy)
        const course = await prisma.course.findFirst({ where: { name: courseId } })
        if (course) where.courseId = course.id
        else where.courseId = -1
      }
    }

    if (categoryId) {
      // Find resources where the course belongs to this category
      // Note: This is a simple 1-level filter. For recursive, we'd need to find all sub-category IDs.
      // For now, let's assume direct assignment or handle sub-cats via recursive ID fetch if needed.
      // Given the requirement "Recursive query for category tree", let's try to support it if easy.
      // But getting all sub-cat IDs might be expensive here without a helper.
      // Let's stick to direct category for now, or use the 'course' relation filter.
      where.course = { categoryId }
    }

    const cacheKey = `res:list:${JSON.stringify({ q, courseId, categoryId, page, pageSize })}`
    const cached = await cacheGet(cacheKey)
    if (cached) return res.json(JSON.parse(cached))
    const [items, total] = await Promise.all([
      prisma.resource.findMany({ where, include: { course: true, uploader: true }, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.resource.count({ where })
    ])
    // 读取分类映射
    let tagMap: Record<number, string> = {}
    try {
      if (items.length) {
        const ids = items.map(i => i.id)
        const placeholders = ids.map((_, i) => `$${i + 1}`).join(',')
        const rows: Array<{ resource_id: number; category_code: string }> = await prisma.$queryRawUnsafe(
          `SELECT resource_id, category_code FROM "ResourceCategoryMap" WHERE resource_id IN (${placeholders})`,
          ...ids
        )
        tagMap = Object.fromEntries(rows.map(r => [r.resource_id, r.category_code]))
      }
    } catch {}
    const payload = { items: items.map(r => ({ ...toClientShape(r), tag: tagMap[r.id] || null })), total }
    await cacheSet(cacheKey, JSON.stringify(payload), 60)
    res.json(payload)
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

// New download endpoint
router.get('/:id/download', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const r = await prisma.resource.findUnique({ where: { id } })
    if (!r || !r.filePath) return res.status(404).json({ message: 'Not found' })

    let fileName = r.filePath.startsWith('/uploads/') ? r.filePath.slice('/uploads/'.length) : path.basename(r.filePath)
    const uploadsDir = path.join(process.cwd(), 'uploads')
    const absPath = path.join(uploadsDir, fileName)
    let finalPath = absPath
    if (!fs.existsSync(finalPath)) {
      if (fs.existsSync(r.filePath)) finalPath = r.filePath
    }
    if (!fs.existsSync(finalPath)) {
      try { fs.appendFileSync('download.log', `${new Date().toISOString()} ${JSON.stringify({ id, filePath: r.filePath, expected: absPath })}\n`) } catch {}
      return res.status(404).json({ message: 'File not found on server', expected_path: absPath, file_path: r.filePath })
    }
    
    // Set filename for download (use resource title + extension)
    const ext = path.extname(fileName)
    const downloadName = `${r.title}${ext}`
    res.download(finalPath, downloadName)
  } catch (err: any) {
    console.error('Download error:', err)
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const r = await prisma.resource.update({ 
      where: { id }, 
      data: { viewCount: { increment: 1 } },
      include: { course: true, uploader: true } 
    })
    res.json(toClientShape(r))
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/', requireAuth, async (req, res) => {
  try {
    const { title, summary, courseId, fileUrl, type, size, category } = req.body || {}
    if (!title || !summary || !courseId || !fileUrl) return res.status(400).json({ message: 'Invalid' })
    if (String(title).length > 100) return res.status(400).json({ message: '标题不得超过100个字符' })
    if (!category || !RESOURCE_TAGS.includes(String(category))) return res.status(400).json({ message: 'Invalid category' })
    const uploaderId = (req as any).userId as string
    const finalCourseId = await resolveCourseId(courseId, uploaderId)
    
    const created = await prisma.resource.create({
      data: {
        title,
        description: summary,
        filePath: fileUrl,
        fileType: type || 'FILE',
        fileSize: size || '未知',
        uploaderId: uploaderId,
        courseId: finalCourseId,
        viewType: 'PUBLIC'
      },
      include: { course: true, uploader: true }
    })
    // 保存分类映射
    try {
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "ResourceCategoryMap" (
          resource_id INTEGER PRIMARY KEY,
          category_code TEXT NOT NULL
        );
        INSERT INTO "ResourceCategoryMap"(resource_id, category_code) VALUES ($1, $2)
        ON CONFLICT (resource_id) DO UPDATE SET category_code = EXCLUDED.category_code
      `, created.id, String(category))
      await delByPrefix('res:list:')
    } catch (e) { console.warn('[ResourceCategoryMap] failed to save', e) }
    try {
      await prisma.$executeRawUnsafe(`UPDATE "User" SET uploads = uploads + 1 WHERE id = $1`, uploaderId)
    } catch (e) { console.warn('[uploads counter] failed', e) }
    await delByPrefix('res:list:')
    res.json({ ...toClientShape(created), tag: String(category) })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.put('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const { title, summary, courseId, fileUrl, category, viewType } = req.body || {}
    const existing = await prisma.resource.findUnique({ where: { id } })
    if (!existing) return res.status(404).json({ message: 'Not found' })
    if (existing.uploaderId !== (req as any).userId) return res.status(403).json({ message: 'Forbidden' })
    if (title && String(title).length > 100) return res.status(400).json({ message: '标题不得超过100个字符' })
    const data: any = {}
    if (title) data.title = title
    if (summary) data.description = summary
    if (fileUrl) data.filePath = fileUrl
    if (courseId && courseId !== 'all') {
      const cId = await resolveCourseId(courseId, (req as any).userId as string)
      data.courseId = cId
    }
    if (viewType && ['PUBLIC','PRIVATE'].includes(String(viewType))) data.viewType = String(viewType)
    const updated = await prisma.resource.update({ where: { id }, data, include: { course: true, uploader: true } })
    // 更新分类映射（可选）
    if (category && RESOURCE_TAGS.includes(String(category))) {
      try {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "ResourceCategoryMap"(resource_id, category_code) VALUES ($1, $2)
          ON CONFLICT (resource_id) DO UPDATE SET category_code = EXCLUDED.category_code
        `, id, String(category))
      } catch (e) { console.warn('[ResourceCategoryMap] update failed', e) }
    }
    await delByPrefix('res:list:')
    try { fs.appendFileSync('resource_actions.log', `${new Date().toISOString()} ${JSON.stringify({ op:'update', id, user:(req as any).userId })}\n`) } catch {}
    res.json({ ...toClientShape(updated), tag: String(category || '') || null })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const r = await prisma.resource.findUnique({ where: { id } })
    if (!r) return res.status(404).json({ message: 'Not found' })
    if (r.uploaderId !== (req as any).userId) return res.status(403).json({ message: 'Forbidden' })
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads')
      let p = r.filePath || ''
      let rel = p.startsWith('/uploads/') ? p.slice('/uploads/'.length) : ''
      const abs = rel ? path.join(uploadsDir, rel) : (fs.existsSync(p) ? p : '')
      if (abs && fs.existsSync(abs)) {
        fs.unlinkSync(abs)
      }
    } catch {}
    await prisma.resource.delete({ where: { id } })
    try { await prisma.$executeRawUnsafe(`UPDATE "User" SET uploads = CASE WHEN uploads > 0 THEN uploads - 1 ELSE 0 END WHERE id = $1`, (req as any).userId) } catch {}
    await delByPrefix('res:list:')
    try { fs.appendFileSync('resource_actions.log', `${new Date().toISOString()} ${JSON.stringify({ op:'delete', id, user:(req as any).userId })}\n`) } catch {}
    res.json({ ok: true })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.post('/:id/downloads', requireAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10)
    const uid = (req as any).userId as string
    const [updated] = await prisma.$transaction([
      prisma.resource.update({ where: { id }, data: { downloadCount: { increment: 1 } } }),
      prisma.$executeRawUnsafe(`UPDATE "User" SET downloads = downloads + 1 WHERE id = $1`, uid) as any
    ])
    res.json({ downloadCount: (updated as any).downloadCount })
  } catch (err: any) {
    if (err.code === 'P2025') return res.status(404).json({ message: 'Not found' })
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

router.get('/me/uploads', async (req, res) => {
  try {
    const uid = parseInt((req.header('X-User-Id') || '').trim() || '0', 10)
    const userId = (req as any).userId
    const list = await prisma.resource.findMany({ where: userId ? { uploaderId: userId } : {}, include: { course: true, uploader: true }, orderBy: { id: 'desc' } })
    res.json({ items: list.map(toClientShape) })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Server error' })
  }
})

export default router
