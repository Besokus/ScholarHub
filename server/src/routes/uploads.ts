import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import multer from 'multer'
import crypto from 'crypto'
import path from 'path'
import fs from 'fs'

const router = Router()

const uploadDir = path.join(process.cwd(), 'uploads')
const profileDir = path.join(uploadDir, 'profile')
const questionsDir = path.join(uploadDir, 'questions')
const resourcesDir = path.join(uploadDir, 'resources')
for (const d of [uploadDir, profileDir, questionsDir, resourcesDir]) { if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true, mode: 0o755 }) }

const tsName = (ext: string) => {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const rand = Math.random().toString(36).slice(2, 8)
  return `${yyyy}${mm}${dd}_${rand}${ext}`
}

const imagesStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, questionsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, tsName(ext))
  }
})

const genericStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`)
  }
})

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  if (!allowed.includes(file.mimetype)) return cb(new Error('Unsupported image type'))
  cb(null, true)
}

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  // Allow all, validate later with magic numbers
  cb(null, true)
}

const imagesUpload = multer({ storage: imagesStorage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } })
const filesUpload = multer({ storage: genericStorage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } })
const avatarUpload = multer({ storage: multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, profileDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const uid = (req as any).userId || 'user'
    cb(null, `${uid}-${Date.now()}${ext}`)
  }
}), fileFilter: (req, file, cb) => {
  const ok = ['image/jpeg','image/png','image/gif'].includes(file.mimetype)
  if (!ok) return cb(new Error('Unsupported image type'))
  cb(null, true)
}, limits: { fileSize: 5 * 1024 * 1024 } })

async function sha256File(p: string): Promise<string> {
  return await new Promise<string>((resolve, reject) => {
    const h = crypto.createHash('sha256')
    const s = fs.createReadStream(p)
    s.on('data', (chunk) => h.update(chunk))
    s.on('error', reject)
    s.on('end', () => resolve(h.digest('hex')))
  })
}

function isExecutable(buffer: Buffer): boolean {
  const sig = buffer.slice(0, 4)
  const hex = sig.toString('hex').toUpperCase()
  if (hex.startsWith('4D5A')) return true
  if (hex.startsWith('7F454C46')) return true
  return false
}

function validateImageMagic(p: string): boolean {
  const fd = fs.openSync(p, 'r')
  const buffer = Buffer.alloc(16)
  fs.readSync(fd, buffer, 0, 16, 0)
  fs.closeSync(fd)
  const hex = buffer.toString('hex').toUpperCase()
  if (hex.startsWith('FFD8FF')) return true
  if (hex.startsWith('89504E47')) return true
  if (hex.startsWith('47494638')) return true
  if (hex.startsWith('52494646')) return true
  return false
}

router.post('/images', requireAuth, imagesUpload.array('images', 9), async (req, res) => {
  const key = `uploads:day:${new Date().toISOString().slice(0,10)}`
  try {
    const { incrWithTTL } = await import('../cache')
    const c = await incrWithTTL(key, 86400)
    if (c > 5000) return res.status(429).json({ message: 'Daily upload limit reached' })
  } catch {}
  const files = (req.files as Express.Multer.File[]) || []
  const indexPath = path.join(uploadDir, 'uploads_index.json')
  let index: Record<string, string> = {}
  try { index = JSON.parse(fs.readFileSync(indexPath,'utf-8')) } catch {}
  const urls: { url: string; size: number }[] = []
  for (const f of files) {
    try {
      const fd = fs.openSync(f.path, 'r')
      const chunk = Buffer.alloc(16)
      fs.readSync(fd, chunk, 0, 16, 0)
      fs.closeSync(fd)
      if (isExecutable(chunk)) { fs.unlinkSync(f.path); return res.status(400).json({ message: 'Executable files are not allowed' }) }
      if (!validateImageMagic(f.path)) { fs.unlinkSync(f.path); return res.status(400).json({ message: 'Invalid image content' }) }
      const hash = await sha256File(f.path)
      if (index[hash]) {
        urls.push({ url: index[hash], size: f.size })
        fs.unlinkSync(f.path)
        continue
      }
      fs.chmodSync(f.path, 0o644)
      const url = `/uploads/questions/${path.basename(f.path)}`
      urls.push({ url, size: f.size })
      index[hash] = url
      try { fs.appendFileSync(path.join(process.cwd(),'uploads.log'), `${new Date().toISOString()} ${JSON.stringify({ user:(req as any).userId, url, size:f.size, hash, type:'question_image' })}\n`) } catch {}
    } catch {
      try { if (fs.existsSync(f.path)) fs.unlinkSync(f.path) } catch {}
      return res.status(500).json({ message: 'Image validation failed' })
    }
  }
  try { fs.writeFileSync(indexPath, JSON.stringify(index)) } catch {}
  res.json({ urls })
})

router.post('/files', requireAuth, filesUpload.single('file'), (req, res) => {
  const f = req.file
  if (!f) return res.status(400).json({ message: 'No file' })
  
  // Magic number check
  try {
    const fd = fs.openSync(f.path, 'r')
    const buffer = Buffer.alloc(262)
    fs.readSync(fd, buffer, 0, 262, 0)
    fs.closeSync(fd)
    
    const header = buffer.toString('hex', 0, 20).toUpperCase() // First 20 bytes enough for most
    let type = 'UNKNOWN'
    
    if (header.startsWith('504B0304')) type = 'ZIP' // Could be DOCX/XLSX/PPTX
    else if (header.startsWith('52617221')) type = 'RAR'
    else if (header.startsWith('377ABCAF')) type = '7Z'
    else if (header.startsWith('25504446')) type = 'PDF'
    else if (header.startsWith('FFD8FF')) type = 'JPG'
    else if (header.startsWith('89504E47')) type = 'PNG'
    else if (header.startsWith('47494638')) type = 'GIF'
    else if (header.startsWith('494433') || header.startsWith('FFFB')) type = 'MP3'
    else if (f.mimetype === 'video/mp4') type = 'MP4' // MP4 magic number is variable (ftyp), trust mimetype if extension matches? 
    // MP4 check: usually 4th byte is 'ftyp'
    else if (buffer.toString('ascii', 4, 8) === 'ftyp') type = 'MP4'
    
    // Check extension for ZIP/Office distinction
    const ext = path.extname(f.originalname).toLowerCase()
    if (type === 'ZIP') {
       if (['.docx', '.xlsx', '.pptx', '.doc', '.ppt', '.xls'].includes(ext)) {
         type = ext.substring(1).toUpperCase()
       }
    }
    
    if (type === 'UNKNOWN') {
       // Fallback to extension for text files or others if magic number fails but we want to allow it?
       // User requirement: "Use file header information for accurate type judgment" and "Provide friendly error message when uploading unsupported file types"
       if (ext === '.txt') type = 'TXT'
       else {
         fs.unlinkSync(f.path)
         return res.status(400).json({ message: 'Unsupported file type or content mismatch' })
       }
    }

    const url = `/uploads/${path.basename(f.path)}`
    res.json({ url, size: f.size, type })
  } catch (err) {
    if (fs.existsSync(f.path)) fs.unlinkSync(f.path)
    res.status(500).json({ message: 'File validation failed' })
  }
})

const resMimes: Record<string, string[]> = {
  pdf: ['application/pdf'],
  video: ['video/mp4','video/mpeg','video/quicktime'],
  audio: ['audio/mpeg','audio/mp3','audio/wav','audio/aac']
}

router.post('/resources', requireAuth, multer({ storage: genericStorage, fileFilter, limits: { fileSize: 200 * 1024 * 1024 } }).single('file'), async (req, res) => {
  const f = req.file
  const body: any = (req as any).body || {}
  const resourceType = String(body.resourceType || '').toLowerCase()
  const resourceId = String(body.resourceId || '').trim()
  const version = String(body.version || '').trim()
  if (!f) return res.status(400).json({ message: 'No file' })
  if (!['pdf','video','audio'].includes(resourceType)) return res.status(400).json({ message: 'Invalid resource type' })
  const allowed = resMimes[resourceType] || []
  if (!allowed.includes(f.mimetype)) { try { fs.unlinkSync(f.path) } catch {}; return res.status(400).json({ message: 'Unsupported MIME type' }) }
  if (!resourceId || !version) { try { fs.unlinkSync(f.path) } catch {}; return res.status(400).json({ message: 'resourceId and version required' }) }
  const ext = path.extname(f.originalname).toLowerCase()
  const subDir = path.join(resourcesDir, resourceType)
  if (!fs.existsSync(subDir)) fs.mkdirSync(subDir, { recursive: true, mode: 0o755 })
  let sizeLimit = 50 * 1024 * 1024
  if (resourceType === 'pdf') sizeLimit = 50 * 1024 * 1024
  if (resourceType === 'audio') sizeLimit = 100 * 1024 * 1024
  if (resourceType === 'video') sizeLimit = 500 * 1024 * 1024
  if (f.size > sizeLimit) { try { fs.unlinkSync(f.path) } catch {}; return res.status(413).json({ message: 'File too large' }) }

  const targetName = `${resourceId}_${version}${ext}`
  const targetPath = path.join(subDir, targetName)
  try {
    fs.renameSync(f.path, targetPath)
    fs.chmodSync(targetPath, 0o644)
    const hash = await sha256File(targetPath)
    const url = `/uploads/resources/${resourceType}/${targetName}`
    try { fs.appendFileSync(path.join(process.cwd(),'uploads.log'), `${new Date().toISOString()} ${JSON.stringify({ user:(req as any).userId, url, size:fs.statSync(targetPath).size, hash, type:`resource_${resourceType}` })}\n`) } catch {}
    res.json({ url, size: fs.statSync(targetPath).size })
  } catch {
    try { fs.unlinkSync(f.path) } catch {}
    res.status(500).json({ message: 'Save failed' })
  }
})

router.post('/avatar', requireAuth, avatarUpload.single('file'), (req, res) => {
  const f = req.file
  if (!f) return res.status(400).json({ message: 'No file' })
  try {
    const url = `/uploads/profile/${path.basename(f.path)}`
    fs.appendFileSync('settings.log', `${new Date().toISOString()} ${JSON.stringify({ op:'avatar_upload', user:(req as any).userId, url })}\n`)
    res.json({ url })
  } catch (err: any) {
    res.status(500).json({ message: err?.message || 'Server error' })
  }
})

export default router

