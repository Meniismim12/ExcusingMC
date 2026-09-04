import { ApiError } from '../lib/errors.js'

export function notFoundHandler(req, res) {
  res.status(404).json({
    message: `Bunday endpoint yo'q: ${req.method} ${req.originalUrl}`,
    code: 'ROUTE_NOT_FOUND',
  })
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ApiError) {
    return res.status(err.status).json({
      message: err.message,
      code: err.code,
      ...(err.details ? { details: err.details } : {}),
    })
  }

  // Prisma: unique constraint
  if (err.code === 'P2002') {
    const field = err.meta?.target?.[0] ?? 'maydon'
    return res.status(409).json({
      message: `Bu ${field} allaqachon band`,
      code: 'DUPLICATE',
    })
  }
  if (err.code === 'P2025') {
    return res.status(404).json({ message: 'Topilmadi', code: 'NOT_FOUND' })
  }
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({ message: 'JSON noto\'g\'ri', code: 'BAD_JSON' })
  }
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ message: 'Fayl juda katta (maks 5MB)', code: 'FILE_TOO_LARGE' })
  }

  console.error(err)
  res.status(500).json({ message: 'Serverda xatolik', code: 'INTERNAL_ERROR' })
}
