import crypto from 'node:crypto'
import jwt from 'jsonwebtoken'
import { prisma } from './prisma.js'

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET
const REFRESH_DAYS = Number(process.env.REFRESH_TOKEN_TTL_DAYS || 7)
const ACCESS_TTL = process.env.ACCESS_TOKEN_TTL || '15m'

export function signAccessToken(user) {
  return jwt.sign({ sub: user.id, role: user.role }, ACCESS_SECRET, {
    expiresIn: ACCESS_TTL,
  })
}

export function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET)
}

/**
 * Refresh token — JWT emas, DB'dagi tasodifiy satr.
 * Shunda logout / "hamma qurilmadan chiqish" haqiqatan ishlaydi.
 */
export async function issueRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex')
  const expiresAt = new Date(Date.now() + REFRESH_DAYS * 24 * 60 * 60 * 1000)
  await prisma.refreshToken.create({ data: { token, userId, expiresAt } })
  return token
}

export async function rotateRefreshToken(oldToken) {
  const row = await prisma.refreshToken.findUnique({
    where: { token: oldToken },
    include: { user: true },
  })
  if (!row || row.expiresAt < new Date()) return null

  await prisma.refreshToken.delete({ where: { id: row.id } })
  const token = await issueRefreshToken(row.userId)
  return { user: row.user, refreshToken: token }
}

export async function revokeRefreshToken(token) {
  await prisma.refreshToken.deleteMany({ where: { token } })
}
