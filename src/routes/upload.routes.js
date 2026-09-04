import path from 'node:path'
import crypto from 'node:crypto'
import { Router } from 'express'
import multer from 'multer'
import { ApiError } from '../lib/errors.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'

const router = Router()

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, path.resolve('uploads')),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg'
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED.includes(file.mimetype)) {
      return cb(ApiError.badRequest('Faqat jpeg/png/webp/gif rasm yuklash mumkin'))
    }
    cb(null, true)
  },
})

function fileUrl(req, file) {
  return `${req.protocol}://${req.get('host')}/uploads/${file.filename}`
}

// POST /api/upload — field nomi: "image"
router.post('/', requireAuth, requireAdmin, upload.single('image'), (req, res) => {
  if (!req.file) throw ApiError.badRequest('Fayl yuborilmadi ("image" maydoni)')
  res.status(201).json({ url: fileUrl(req, req.file), size: req.file.size })
})

// POST /api/upload/many — field nomi: "images" (maks 6 ta)
router.post('/many', requireAuth, requireAdmin, upload.array('images', 6), (req, res) => {
  if (!req.files?.length) throw ApiError.badRequest('Fayllar yuborilmadi ("images" maydoni)')
  res.status(201).json({ urls: req.files.map((f) => fileUrl(req, f)) })
})

export default router
