import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../lib/errors.js'
import { publicUser } from '../lib/serialize.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()
router.use(requireAuth, requireAdmin)

const STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED']

const ordersQuerySchema = z.object({
  status: z.enum(STATUSES).optional(),
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

const statusSchema = z.object({ status: z.enum(STATUSES) })

const usersQuerySchema = z.object({
  search: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

// GET /api/admin/stats — dashboard uchun
router.get('/stats', async (_req, res) => {
  const paidStatuses = { in: ['PAID', 'SHIPPED', 'DELIVERED'] }

  const [revenue, orderCount, userCount, productCount, byStatus, lowStock, recentOrders] =
    await Promise.all([
      prisma.order.aggregate({ where: { status: paidStatuses }, _sum: { total: true } }),
      prisma.order.count(),
      prisma.user.count(),
      prisma.product.count(),
      prisma.order.groupBy({ by: ['status'], _count: true }),
      prisma.product.findMany({
        where: { stock: { lte: 5 } },
        orderBy: { stock: 'asc' },
        take: 5,
        select: { id: true, title: true, stock: true, image: true },
      }),
      prisma.order.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: { user: { select: { id: true, name: true, email: true } } },
      }),
    ])

  res.json({
    revenue: revenue._sum.total ?? 0,
    orderCount,
    userCount,
    productCount,
    ordersByStatus: STATUSES.reduce((acc, s) => {
      acc[s] = byStatus.find((b) => b.status === s)?._count ?? 0
      return acc
    }, {}),
    lowStock,
    recentOrders,
  })
})

// GET /api/admin/orders — hamma buyurtmalar
router.get('/orders', validate(ordersQuerySchema, 'query'), async (req, res) => {
  const q = req.validatedQuery
  const where = { AND: [] }
  if (q.status) where.AND.push({ status: q.status })
  if (q.search) {
    where.AND.push({
      OR: [
        { fullName: { contains: q.search } },
        { phone: { contains: q.search } },
        { id: { contains: q.search } },
      ],
    })
  }

  const [total, items] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      include: { items: true, user: { select: { id: true, name: true, email: true } } },
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

// PATCH /api/admin/orders/:id/status
router.patch('/orders/:id/status', validate(statusSchema), async (req, res) => {
  const order = await prisma.order.findUnique({ where: { id: req.params.id } })
  if (!order) throw ApiError.notFound('Buyurtma topilmadi')

  const updated = await prisma.order.update({
    where: { id: order.id },
    data: { status: req.body.status },
    include: { items: true },
  })
  res.json(updated)
})

// GET /api/admin/users
router.get('/users', validate(usersQuerySchema, 'query'), async (req, res) => {
  const q = req.validatedQuery
  const where = q.search
    ? { OR: [{ name: { contains: q.search } }, { email: { contains: q.search } }] }
    : {}

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
      include: { _count: { select: { orders: true } } },
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / q.limit))
  res.json({
    items: users.map(({ _count, ...user }) => ({ ...publicUser(user), orderCount: _count.orders })),
    meta: { page: q.page, limit: q.limit, total, totalPages, hasNext: q.page < totalPages, hasPrev: q.page > 1 },
  })
})

export default router
