/**
 * Barcha "kutilgan" xatolar shu klass orqali tashlanadi.
 * Error middleware uni { message, code } ko'rinishida qaytaradi.
 */
export class ApiError extends Error {
  constructor(status, message, code = 'ERROR', details = undefined) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }

  static badRequest(message, details) {
    return new ApiError(400, message, 'BAD_REQUEST', details)
  }
  static unauthorized(message = 'Avtorizatsiya talab qilinadi') {
    return new ApiError(401, message, 'UNAUTHORIZED')
  }
  static forbidden(message = 'Ruxsat yo\'q') {
    return new ApiError(403, message, 'FORBIDDEN')
  }
  static notFound(message = 'Topilmadi') {
    return new ApiError(404, message, 'NOT_FOUND')
  }
  static conflict(message, code = 'CONFLICT') {
    return new ApiError(409, message, code)
  }
}
