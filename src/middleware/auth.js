import { ApiError } from '../lib/errors.js'
import { verifyAccessToken } from '../lib/jwt.js'
import { prisma } from '../lib/prisma.js'

function readToken(req) {
  const header = req.headers.authorization || ''
  if (!header.startsWith('Bearer ')) return null
  return header.slice(7).trim() || null
}

/** Token bo'lsa req.user'ni to'ldiradi, bo'lmasa ham o'tkazadi. */
export async function optionalAuth(req, _res, next) {
  const token = readToken(req)
  if (!token) return next()
  try {
    const payload = verifyAccessToken(token)
    req.user = await prisma.user.findUnique({ where: { id: payload.sub } })
  } catch {
    // yaroqsiz token — mehmon sifatida davom etamiz
  }
  next()
}

/** Token majburiy. Muddati o'tgan bo'lsa 401 + TOKEN_EXPIRED. */
export async function requireAuth(req, _res, next) {
  const token = readToken(req)
  if (!token) return next(ApiError.unauthorized('Token yuborilmadi'))

  let payload
  try {
    payload = verifyAccessToken(token)
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      // Frontend shu kodni ko'rib /auth/refresh'ga boradi.
      return next(new ApiError(401, 'Token muddati tugagan', 'TOKEN_EXPIRED'))
    }
    return next(ApiError.unauthorized('Token yaroqsiz'))
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } })
  if (!user) return next(ApiError.unauthorized('Foydalanuvchi topilmadi'))

  req.user = user
  next()
}

export function requireAdmin(req, _res, next) {
  if (!req.user) return next(ApiError.unauthorized())
  if (req.user.role !== 'ADMIN') {
    return next(ApiError.forbidden('Bu amal faqat admin uchun'))
  }
  next()
}
