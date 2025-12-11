import { Router } from 'express'
import { requireAuth } from '../middleware/auth'
import multer from 'multer'
import path from 'path'
import fs from 'fs'

const router = Router()

const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir)

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
  const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'application/zip', 'application/x-rar-compressed']
  if (!allowed.includes(file.mimetype)) return cb(new Error('Unsupported file type'))
  cb(null, true)
}

const imagesUpload = multer({ storage, fileFilter, limits: { fileSize: 2 * 1024 * 1024 } })
const filesUpload = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } })

router.post('/images', requireAuth, imagesUpload.array('images', 3), (req, res) => {
  const files = (req.files as Express.Multer.File[]) || []
  const urls = files.map(f => ({ url: `/uploads/${path.basename(f.path)}`, size: f.size }))
  res.json({ urls })
})

router.post('/files', requireAuth, filesUpload.single('file'), (req, res) => {
  const f = req.file
  if (!f) return res.status(400).json({ message: 'No file' })
  const url = `/uploads/${path.basename(f.path)}`
  res.json({ url, size: f.size, type: f.mimetype })
})

export default router

