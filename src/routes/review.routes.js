import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const bodySchema = z.object({
  rating: z.coerce.number().int().min(1, 'Baho 1..5').max(5, 'Baho 1..5'),
  comment: z.string().trim().min(3, 'Izoh kamida 3 ta belgi').max(1000),
})

/** Mahsulotdagi o'rtacha baho va sharhlar sonini qayta hisoblaydi. */
async function recalcRating(productId) {
  const agg = await prisma.review.aggregate({
    where: { productId },
    _avg: { rating: true },
    _count: true,
  })
  await prisma.product.update({
    where: { id: productId },
    data: {
      rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
      reviewCount: agg._count,
    },
  })
}

// /api/products/:productId/reviews
export const productReviewRouter = Router()

productReviewRouter.get('/:productId/reviews', async (req, res) => {
  const reviews = await prisma.review.findMany({
    where: { productId: req.params.productId },
    include: { user: { select: { id: true, name: true, avatar: true } } },
    orderBy: { createdAt: 'desc' },
  })

  // Yulduzlar bo'yicha taqsimot — frontendda diagramma chizish uchun
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
  for (const r of reviews) breakdown[r.rating] += 1

  res.json({ items: reviews, total: reviews.length, breakdown })
})

productReviewRouter.post(
  '/:productId/reviews',
  requireAuth,
  validate(bodySchema),
  async (req, res) => {
    const { productId } = req.params

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) throw ApiError.notFound('Mahsulot topilmadi')

    const existing = await prisma.review.findUnique({
      where: { userId_productId: { userId: req.user.id, productId } },
    })
    if (existing) throw ApiError.conflict('Siz bu mahsulotga sharh yozgansiz', 'REVIEW_EXISTS')

    const review = await prisma.review.create({
      data: { ...req.body, productId, userId: req.user.id },
      include: { user: { select: { id: true, name: true, avatar: true } } },
    })
    await recalcRating(productId)

    res.status(201).json(review)
  },
)

// /api/reviews/:id
export const reviewRouter = Router()

reviewRouter.patch('/:id', requireAuth, validate(bodySchema.partial()), async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } })
  if (!review) throw ApiError.notFound('Sharh topilmadi')
  if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw ApiError.forbidden('Bu sharh sizniki emas')
  }

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: req.body,
    include: { user: { select: { id: true, name: true, avatar: true } } },
  })
  await recalcRating(review.productId)

  res.json(updated)
})

reviewRouter.delete('/:id', requireAuth, async (req, res) => {
  const review = await prisma.review.findUnique({ where: { id: req.params.id } })
  if (!review) throw ApiError.notFound('Sharh topilmadi')
  if (review.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw ApiError.forbidden('Bu sharh sizniki emas')
  }

  await prisma.review.delete({ where: { id: review.id } })
  await recalcRating(review.productId)

  res.status(204).end()
})
