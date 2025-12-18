import { Router } from 'express'
import prisma from '../db'
import { requireAuth } from '../middleware/auth'
import path from 'path'
import fs from 'fs'

const router = Router()

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
      prisma.resource.findMany({ where, include: { course: true, uploader: true }, orderBy: { id: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      prisma.resource.count({ where })
    ])
    res.json({ items: items.map(toClientShape), total })
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

    // Construct absolute path
    let fileName = path.basename(r.filePath)
    const absPath = path.join(process.cwd(), 'uploads', fileName)
    
    if (!fs.existsSync(absPath)) {
        console.error(`File not found: ${absPath}`)
        return res.status(404).json({ message: 'File not found on server' })
    }
    
    // Set filename for download (use resource title + extension)
    const ext = path.extname(fileName)
    const downloadName = `${r.title}${ext}`
    
    res.download(absPath, downloadName)
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
    const { title, summary, courseId, fileUrl, type, size } = req.body || {}
    if (!title || !summary || !courseId || !fileUrl) return res.status(400).json({ message: 'Invalid' })
    
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
    try {
      await prisma.$executeRawUnsafe(`UPDATE "User" SET uploads = uploads + 1 WHERE id = $1`, uploaderId)
    } catch (e) { console.warn('[uploads counter] failed', e) }
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
    const updated = await prisma.resource.update({ where: { id }, data, include: { course: true, uploader: true } })
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
