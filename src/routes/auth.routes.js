import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../lib/errors.js'
import { publicUser } from '../lib/serialize.js'
import {
  issueRefreshToken,
  revokeRefreshToken,
  rotateRefreshToken,
  signAccessToken,
} from '../lib/jwt.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

const registerSchema = z.object({
  name: z.string().trim().min(2, 'Ism kamida 2 ta belgi'),
  email: z.string().trim().toLowerCase().email('Email formati noto\'g\'ri'),
  password: z.string().min(6, 'Parol kamida 6 ta belgi'),
  phone: z.string().trim().min(7, 'Telefon noto\'g\'ri').optional(),
})

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email formati noto\'g\'ri'),
  password: z.string().min(1, 'Parol kiriting'),
})

const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'refreshToken yuborilmadi'),
})

const updateMeSchema = z.object({
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(7).optional(),
  avatar: z.string().url().optional(),
})

async function buildSession(user) {
  return {
    user: publicUser(user),
    accessToken: signAccessToken(user),
    refreshToken: await issueRefreshToken(user.id),
  }
}

// POST /api/auth/register
router.post('/register', validate(registerSchema), async (req, res) => {
  const { name, email, password, phone } = req.body

  const exists = await prisma.user.findUnique({ where: { email } })
  if (exists) throw ApiError.conflict('Bu email ro\'yxatdan o\'tgan', 'EMAIL_TAKEN')

  const user = await prisma.user.create({
    data: { name, email, phone, password: await bcrypt.hash(password, 10) },
  })

  res.status(201).json(await buildSession(user))
})

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res) => {
  const { email, password } = req.body

  const user = await prisma.user.findUnique({ where: { email } })
  // Qaysi biri xato ekanini aytmaymiz — email borligini tekshirib bo'lmasin.
  if (!user || !(await bcrypt.compare(password, user.password))) {
    throw ApiError.unauthorized('Email yoki parol noto\'g\'ri')
  }

  res.json(await buildSession(user))
})

// POST /api/auth/refresh — eski token bekor qilinadi, yangisi beriladi
router.post('/refresh', validate(refreshSchema), async (req, res) => {
  const result = await rotateRefreshToken(req.body.refreshToken)
  if (!result) throw ApiError.unauthorized('Refresh token yaroqsiz yoki muddati tugagan')

  res.json({
    user: publicUser(result.user),
    accessToken: signAccessToken(result.user),
    refreshToken: result.refreshToken,
  })
})

// POST /api/auth/logout
router.post('/logout', validate(refreshSchema), async (req, res) => {
  await revokeRefreshToken(req.body.refreshToken)
  res.status(204).end()
})

// GET /api/auth/me
router.get('/me', requireAuth, (req, res) => {
  res.json(publicUser(req.user))
})

// PATCH /api/auth/me
router.patch('/me', requireAuth, validate(updateMeSchema), async (req, res) => {
  const user = await prisma.user.update({
    where: { id: req.user.id },
    data: req.body,
  })
  res.json(publicUser(user))
})

export default router
