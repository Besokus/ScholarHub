import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = Router()

const uploadDir = path.join(process.cwd(), 'uploads')
const profileDir = path.join(uploadDir, 'profile')
const questionsDir = path.join(uploadDir, 'questions')
const resourcesDir = path.join(uploadDir, 'resources')
for (const d of [uploadDir, profileDir, questionsDir, resourcesDir]) { if (!fs.existsSync(d)) fs.mkdirSync(d) }

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname)
    cb(null, `${Date.now()}-${Math.random().toString(16).slice(2)}${ext}`)
  }
})

const imageFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png']
  if (!allowed.includes(file.mimetype)) return cb(new Error('Unsupported image type'))
  cb(null, true)
}

const fileFilter: multer.Options['fileFilter'] = (_req, file, cb) => {
  // Allow all, validate later with magic numbers
  cb(null, true)
}

const imagesUpload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } })
const filesUpload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } })
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

router.post('/images', requireAuth, imagesUpload.array('images', 9), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || []
  const urls = files.map(f => ({ url: `/uploads/${path.basename(f.path)}`, size: f.size }))
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

