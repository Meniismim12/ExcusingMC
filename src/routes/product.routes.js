import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../lib/errors.js'
import { publicProduct, publicProducts } from '../lib/serialize.js'
import { uniqueSlug } from '../lib/slug.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

const boolish = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')
  .optional()

const listQuerySchema = z.object({
  search: z.string().trim().optional(),
  category: z.string().trim().optional(), // slug, vergul bilan bir nechta
  brand: z.string().trim().optional(), // vergul bilan bir nechta
  minPrice: z.coerce.number().int().nonnegative().optional(),
  maxPrice: z.coerce.number().int().nonnegative().optional(),
  inStock: boolish,
  featured: boolish,
  sort: z
    .enum(['newest', 'oldest', 'price_asc', 'price_desc', 'rating', 'popular', 'title'])
    .default('newest'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(60).default(12),
})

const ORDER_BY = {
  newest: { createdAt: 'desc' },
  oldest: { createdAt: 'asc' },
  price_asc: { price: 'asc' },
  price_desc: { price: 'desc' },
  rating: { rating: 'desc' },
  popular: { reviewCount: 'desc' },
  title: { title: 'asc' },
}

const productBodySchema = z.object({
  title: z.string().trim().min(2, 'Nom kamida 2 ta belgi'),
  description: z.string().trim().min(10, 'Tavsif kamida 10 ta belgi'),
  brand: z.string().trim().optional(),
  price: z.coerce.number().int().positive('Narx musbat bo\'lsin'),
  oldPrice: z.coerce.number().int().positive().nullish(),
  stock: z.coerce.number().int().nonnegative().default(0),
  image: z.string().url('image URL bo\'lsin'),
  images: z.array(z.string().url()).default([]),
  featured: z.boolean().default(false),
  categoryId: z.string().min(1, 'Kategoriya tanlang'),
})

// GET /api/products — filtr + saralash + sahifalash
router.get('/', validate(listQuerySchema, 'query'), async (req, res) => {
  const q = req.validatedQuery
  const where = { AND: [] }

  if (q.search) {
    where.AND.push({
      OR: [
        { title: { contains: q.search } },
        { description: { contains: q.search } },
        { brand: { contains: q.search } },
      ],
    })
  }
  if (q.category) {
    where.AND.push({ category: { slug: { in: q.category.split(',').filter(Boolean) } } })
  }
  if (q.brand) {
    where.AND.push({ brand: { in: q.brand.split(',').filter(Boolean) } })
  }
  if (q.minPrice != null) where.AND.push({ price: { gte: q.minPrice } })
  if (q.maxPrice != null) where.AND.push({ price: { lte: q.maxPrice } })
  if (q.inStock) where.AND.push({ stock: { gt: 0 } })
  if (q.featured != null) where.AND.push({ featured: q.featured })

  const [total, items] = await Promise.all([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: ORDER_BY[q.sort],
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    }),
  ])

  const totalPages = Math.max(1, Math.ceil(total / q.limit))
  res.json({
    items: publicProducts(items),
    meta: {
      page: q.page,
      limit: q.limit,
      total,
      totalPages,
      hasNext: q.page < totalPages,
      hasPrev: q.page > 1,
    },
  })
})

// GET /api/products/filters — filtr paneli uchun brendlar va narx oralig'i
router.get('/filters', async (_req, res) => {
  const [brands, range, categories] = await Promise.all([
    prisma.product.findMany({
      where: { brand: { not: null } },
      distinct: ['brand'],
      select: { brand: true },
      orderBy: { brand: 'asc' },
    }),
    prisma.product.aggregate({ _min: { price: true }, _max: { price: true } }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    }),
  ])

  res.json({
    brands: brands.map((b) => b.brand),
    priceRange: { min: range._min.price ?? 0, max: range._max.price ?? 0 },
    categories: categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      productCount: c._count.products,
    })),
  })
})

// GET /api/products/:idOrSlug
router.get('/:idOrSlug', async (req, res) => {
  const { idOrSlug } = req.params
  const product = await prisma.product.findFirst({
    where: { OR: [{ id: idOrSlug }, { slug: idOrSlug }] },
    include: { category: true },
  })
  if (!product) throw ApiError.notFound('Mahsulot topilmadi')

  const related = await prisma.product.findMany({
    where: { categoryId: product.categoryId, NOT: { id: product.id } },
    take: 4,
    orderBy: { rating: 'desc' },
  })

  res.json({ ...publicProduct(product), related: publicProducts(related) })
})

// --- Admin ---

// POST /api/products
router.post('/', requireAuth, requireAdmin, validate(productBodySchema), async (req, res) => {
  const { images, ...data } = req.body

  const category = await prisma.category.findUnique({ where: { id: data.categoryId } })
  if (!category) throw ApiError.badRequest('Bunday kategoriya yo\'q')

  const product = await prisma.product.create({
    data: {
      ...data,
      images: JSON.stringify(images),
      slug: await uniqueSlug(prisma.product, data.title),
    },
    include: { category: true },
  })
  res.status(201).json(publicProduct(product))
})

// PATCH /api/products/:id
router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(productBodySchema.partial()),
  async (req, res) => {
    const { images, ...data } = req.body

    const existing = await prisma.product.findUnique({ where: { id: req.params.id } })
    if (!existing) throw ApiError.notFound('Mahsulot topilmadi')

    const product = await prisma.product.update({
      where: { id: existing.id },
      data: {
        ...data,
        ...(images ? { images: JSON.stringify(images) } : {}),
        ...(data.title && data.title !== existing.title
          ? { slug: await uniqueSlug(prisma.product, data.title, existing.id) }
          : {}),
      },
      include: { category: true },
    })
    res.json(publicProduct(product))
  },
)

// DELETE /api/products/:id
router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await prisma.product.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

export default router
