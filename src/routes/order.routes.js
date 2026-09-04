import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../lib/errors.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()
router.use(requireAuth)

const checkoutSchema = z.object({
  fullName: z.string().trim().min(2, 'Ism kamida 2 ta belgi'),
  phone: z.string().trim().min(7, 'Telefon raqam noto\'g\'ri'),
  address: z.string().trim().min(5, 'Manzil kamida 5 ta belgi'),
  note: z.string().trim().max(500).optional(),
})

const listQuerySchema = z.object({
  status: z.enum(['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

// POST /api/orders — savatdan buyurtma yasaydi
router.post('/', validate(checkoutSchema), async (req, res) => {
  const cartItems = await prisma.cartItem.findMany({
    where: { userId: req.user.id },
    include: { product: true },
  })
  if (cartItems.length === 0) throw ApiError.badRequest('Savat bo\'sh')

  // Ombor yetarliligini avval tekshiramiz — yarim buyurtma yaratmaslik uchun.
  for (const item of cartItems) {
    if (item.quantity > item.product.stock) {
      throw ApiError.conflict(
        `"${item.product.title}" — omborda faqat ${item.product.stock} dona qoldi`,
        'NOT_ENOUGH_STOCK',
      )
    }
  }

  const total = cartItems.reduce((sum, i) => sum + i.quantity * i.product.price, 0)

  // Tranzaksiya: buyurtma + ombor kamayishi + savat tozalanishi — birgalikda.
  const order = await prisma.$transaction(async (tx) => {
    const created = await tx.order.create({
      data: {
        userId: req.user.id,
        total,
        ...req.body,
        items: {
          create: cartItems.map((i) => ({
            productId: i.productId,
            title: i.product.title,
            image: i.product.image,
            price: i.product.price, // narx buyurtma paytida "muzlatiladi"
            quantity: i.quantity,
          })),
        },
      },
      include: { items: true },
    })

    for (const item of cartItems) {
      await tx.product.update({
        where: { id: item.productId },
        data: { stock: { decrement: item.quantity } },
      })
    }

    await tx.cartItem.deleteMany({ where: { userId: req.user.id } })
    return created
  })

  res.status(201).json(order)
})

// GET /api/orders — o'z buyurtmalari
router.get('/', validate(listQuerySchema, 'query'), async (req, res) => {
  const q = req.validatedQuery
  const where = { userId: req.user.id, ...(q.status ? { status: q.status } : {}) }

  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / q.limit))
  res.json({
    items,
    meta: { page: q.page, limit: q.limit, total, totalPages, hasNext: q.page < totalPages, hasPrev: q.page > 1 },
  })
})

// GET /api/orders/:id
router.get('/:id', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true, user: { select: { id: true, name: true, email: true } } },
  })
  if (!order) throw ApiError.notFound('Buyurtma topilmadi')
  if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw ApiError.forbidden('Bu buyurtma sizniki emas')
  }
  res.json(order)
})

// POST /api/orders/:id/cancel — faqat PENDING holatida
router.post('/:id/cancel', async (req, res) => {
  const order = await prisma.order.findUnique({
    where: { id: req.params.id },
    include: { items: true },
  })
  if (!order) throw ApiError.notFound('Buyurtma topilmadi')
  if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
    throw ApiError.forbidden('Bu buyurtma sizniki emas')
  }
  if (order.status !== 'PENDING') {
    throw ApiError.conflict('Faqat kutilayotgan buyurtmani bekor qilish mumkin', 'NOT_CANCELLABLE')
  }

  const updated = await prisma.$transaction(async (tx) => {
    for (const item of order.items) {
      if (item.productId) {
        await tx.product.update({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        })
      }
    }
    return tx.order.update({
      where: { id: order.id },
      data: { status: 'CANCELLED' },
      include: { items: true },
    })
  })

  res.json(updated)
})

export default router
