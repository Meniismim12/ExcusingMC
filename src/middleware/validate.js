import { ApiError } from '../lib/errors.js'

/**
 * Zod sxemasi bilan body/query/params'ni tekshiradi.
 * Xato bo'lsa 422 + { details: { maydon: "xabar" } } qaytadi —
 * frontendda formaga to'g'ridan-to'g'ri ulash uchun qulay.
 */
export function validate(schema, source = 'body') {
  return (req, _res, next) => {
    const result = schema.safeParse(req[source])
    if (!result.success) {
      const details = {}
      for (const issue of result.error.issues) {
        const key = issue.path.join('.') || '_'
        if (!details[key]) details[key] = issue.message
      }
      return next(
        new ApiError(422, 'Ma\'lumotlar noto\'g\'ri', 'VALIDATION_ERROR', details),
      )
    }
    // query getter-only bo'lishi mumkin (Express 5) — alohida saqlaymiz
    if (source === 'query') req.validatedQuery = result.data
    else req[source] = result.data
    next()
  }
}
