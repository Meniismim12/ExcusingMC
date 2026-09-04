import { ApiError } from '../lib/errors.js'

/**
 * "Qiyinchilik rejimi" — ataylab sekinlik va xatolar.
 *
 * Busiz frontendda loading / error / retry mantig'i hech qachon sinalmaydi:
 * localhost 3ms da javob beradi va hech qachon yiqilmaydi, real internet esa yo'q.
 *
 * Ikki xil boshqaruv bor:
 *   1. Global   — .env (DELAY_MS, CHAOS_RATE) yoki POST /api/__chaos (serverni qayta
 *                 ishga tushirmasdan). Tasodifiy, "hayotdagidek".
 *   2. So'rovga — ?__delay=1500 va ?__fail=500. Aniq holatni ataylab chaqirish uchun.
 */
export const chaosState = {
  delayMs: Number(process.env.DELAY_MS || 0),
  failRate: Number(process.env.CHAOS_RATE || 0), // 0..1
}

const FORCED = {
  400: () => ApiError.badRequest('Ataylab yuborilgan 400'),
  401: () => new ApiError(401, 'Ataylab yuborilgan 401', 'TOKEN_EXPIRED'),
  403: () => ApiError.forbidden('Ataylab yuborilgan 403'),
  404: () => ApiError.notFound('Ataylab yuborilgan 404'),
  409: () => ApiError.conflict('Ataylab yuborilgan 409', 'CONFLICT'),
  422: () =>
    new ApiError(422, 'Ataylab yuborilgan 422', 'VALIDATION_ERROR', {
      field: 'Bu maydonda xato bor',
    }),
  500: () => new ApiError(500, 'Serverda kutilmagan xatolik (ataylab)', 'CHAOS'),
  503: () => new ApiError(503, 'Server vaqtincha ishlamayapti (ataylab)', 'SERVICE_UNAVAILABLE'),
}

/**
 * Tasodifiy 500 bulardan chetlab o'tadi: refresh yoki login yiqilsa
 * interceptor cheksiz aylanib, sababi tushunarsiz bo'lib qoladi.
 * Majburiy ?__fail= bu yerda ham ishlaydi.
 */
const RANDOM_FAIL_SKIP = ['/auth/refresh', '/auth/login']

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

export async function chaos(req, _res, next) {
  if (req.path === '/__chaos') return next() // boshqaruv endpointining o'ziga tegmaymiz

  // 1. Kechikish. ?__delay=0 — global kechikishni shu so'rov uchun o'chiradi.
  const queryDelay = Number(req.query.__delay)
  const hasQueryDelay =
    req.query.__delay !== undefined && Number.isFinite(queryDelay) && queryDelay >= 0
  const delayMs = Math.min(hasQueryDelay ? queryDelay : chaosState.delayMs, 10000)
  if (delayMs > 0) await sleep(delayMs)

  // 2. Majburiy xato: ?__fail=500 | 401 | 404 | timeout ...
  const forced = req.query.__fail
  if (forced) {
    if (forced === 'timeout') return // hech qachon javob bermaymiz — timeout mantig'i uchun
    const make = FORCED[Number(forced)]
    if (make) return next(make())
    return next(ApiError.badRequest(`__fail qiymati noto'g'ri: ${forced}`))
  }

  // 3. Tasodifiy 500
  if (
    chaosState.failRate > 0 &&
    !RANDOM_FAIL_SKIP.includes(req.path) &&
    Math.random() < chaosState.failRate
  ) {
    return next(FORCED[500]())
  }

  next()
}
