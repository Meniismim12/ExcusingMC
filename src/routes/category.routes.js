import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../lib/prisma.js'
import { ApiError } from '../lib/errors.js'
import { uniqueSlug } from '../lib/slug.js'
import { requireAdmin, requireAuth } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

const router = Router()

const bodySchema = z.object({
  name: z.string().trim().min(2, 'Nom kamida 2 ta belgi'),
  image: z.string().url().nullish(),
})

// GET /api/categories
router.get('/', async (_req, res) => {
  const categories = await prisma.category.findMany({
    orderBy: { name: 'asc' },
    include: { _count: { select: { products: true } } },
  })
  res.json(
    categories.map((c) => ({
      id: c.id,
      name: c.name,
      slug: c.slug,
      image: c.image,
      productCount: c._count.products,
    })),
  )
})

// GET /api/categories/:slug
router.get('/:slug', async (req, res) => {
  const category = await prisma.category.findUnique({ where: { slug: req.params.slug } })
  if (!category) throw ApiError.notFound('Kategoriya topilmadi')
  res.json(category)
})

router.post('/', requireAuth, requireAdmin, validate(bodySchema), async (req, res) => {
  const category = await prisma.category.create({
    data: { ...req.body, slug: await uniqueSlug(prisma.category, req.body.name) },
  })
  res.status(201).json(category)
})

router.patch(
  '/:id',
  requireAuth,
  requireAdmin,
  validate(bodySchema.partial()),
  async (req, res) => {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(category)
  },
)

router.delete('/:id', requireAuth, requireAdmin, async (req, res) => {
  await prisma.category.delete({ where: { id: req.params.id } })
  res.status(204).end()
})

export default router
