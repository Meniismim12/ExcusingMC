import { Router } from 'express'
import { z } from 'zod'
import { chaosState } from '../middleware/chaos.js'
import { validate } from '../middleware/validate.js'
import authRouter from './auth.routes.js'
import productRouter from './product.routes.js'
import categoryRouter from './category.routes.js'
import cartRouter from './cart.routes.js'
import orderRouter from './order.routes.js'
import adminRouter from './admin.routes.js'
import uploadRouter from './upload.routes.js'
import { productReviewRouter, reviewRouter } from './review.routes.js'

const router = Router()

router.get('/', (_req, res) => {
  res.json({
    name: 'Example Shop API',
    version: '1.0.0',
    docs: '/api/docs',
  })
})

// Qiyinchilik rejimini serverni qayta ishga tushirmasdan boshqarish.
// Faqat dev uchun — shuning uchun himoyalanmagan.
const chaosSchema = z.object({
  delayMs: z.coerce.number().int().min(0).max(10000).optional(),
  failRate: z.coerce.number().min(0).max(1).optional(),
})

router.get('/__chaos', (_req, res) => res.json(chaosState))

router.post('/__chaos', validate(chaosSchema), (req, res) => {
  if (req.body.delayMs != null) chaosState.delayMs = req.body.delayMs
  if (req.body.failRate != null) chaosState.failRate = req.body.failRate
  res.json(chaosState)
})

router.use('/auth', authRouter)
router.use('/categories', categoryRouter)
router.use('/products', productReviewRouter) // /products/:productId/reviews
router.use('/products', productRouter)
router.use('/reviews', reviewRouter)
router.use('/cart', cartRouter)
router.use('/orders', orderRouter)
router.use('/admin', adminRouter)
router.use('/upload', uploadRouter)

export default router
