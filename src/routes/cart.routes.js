import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../lib/errors.js'
import { publicProduct } from '../lib/serialize.js'
import { requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()
router.use(requireAuth)

const addSchema = z.object({
  productId: z.string().min(1, 'productId kerak'),
  quantity: z.coerce.number().int().min(1).max(99).default(1),
})

const updateSchema = z.object({
  quantity: z.coerce.number().int().min(1).max(99),
})

async function getCart(userId) {
  const items = await prisma.cartItem.findMany({
    where: { userId },
    include: { product: { include: { category: true } } },
    orderBy: { createdAt: 'asc' },
  })

  const mapped = items.map((item) => ({
    id: item.id,
    quantity: item.quantity,
    product: publicProduct(item.product),
    lineTotal: item.quantity * item.product.price,
  }))

  return {
    items: mapped,
    count: mapped.reduce((sum, i) => sum + i.quantity, 0),
    subtotal: mapped.reduce((sum, i) => sum + i.lineTotal, 0),
  }
}

// GET /api/cart
router.get('/', async (req, res) => {
  res.json(await getCart(req.user.id))
})

// POST /api/cart — bor bo'lsa sonini oshiradi
router.post('/', validate(addSchema), async (req, res) => {
  const { productId, quantity } = req.body

  const product = await prisma.product.findUnique({ where: { id: productId } })
  if (!product) throw ApiError.notFound('Mahsulot topilmadi')

  const existing = await prisma.cartItem.findUnique({
    where: { userId_productId: { userId: req.user.id, productId } },
  })
  const nextQty = (existing?.quantity ?? 0) + quantity
  if (nextQty > product.stock) {
    throw ApiError.conflict(`Omborda faqat ${product.stock} dona qoldi`, 'NOT_ENOUGH_STOCK')
  }

  await prisma.cartItem.upsert({
    where: { userId_productId: { userId: req.user.id, productId } },
    create: { userId: req.user.id, productId, quantity },
    update: { quantity: nextQty },
  })

  res.status(201).json(await getCart(req.user.id))
})

// PATCH /api/cart/:itemId
router.patch('/:itemId', validate(updateSchema), async (req, res) => {
  const item = await prisma.cartItem.findUnique({
    where: { id: req.params.itemId },
    include: { product: true },
  })
  if (!item || item.userId !== req.user.id) throw ApiError.notFound('Savatda bunday element yo\'q')
  if (req.body.quantity > item.product.stock) {
    throw ApiError.conflict(`Omborda faqat ${item.product.stock} dona qoldi`, 'NOT_ENOUGH_STOCK')
  }

  await prisma.cartItem.update({
    where: { id: item.id },
    data: { quantity: req.body.quantity },
  })
  res.json(await getCart(req.user.id))
})

// DELETE /api/cart/:itemId
router.delete('/:itemId', async (req, res) => {
  const item = await prisma.cartItem.findUnique({ where: { id: req.params.itemId } })
  if (!item || item.userId !== req.user.id) throw ApiError.notFound('Savatda bunday element yo\'q')

  await prisma.cartItem.delete({ where: { id: item.id } })
  res.json(await getCart(req.user.id))
})

// DELETE /api/cart — savatni bo'shatish
router.delete('/', async (req, res) => {
  await prisma.cartItem.deleteMany({ where: { userId: req.user.id } })
  res.json(await getCart(req.user.id))
})

export default router
