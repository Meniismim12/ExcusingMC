import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
import { slugify } from '../src/lib/slug.js'

const prisma = new PrismaClient()

const CATEGORIES = [
  ['Telefonlar', 'telefonlar'],
  ['Noutbuklar', 'noutbuklar'],
  ['Audio', 'audio'],
  ['Maishiy texnika', 'maishiy-texnika'],
  ['Kiyim', 'kiyim'],
  ['Kitoblar', 'kitoblar'],
  ['Sport', 'sport'],
]

// [nom, brend, narx (so'm), ombor, kategoriya slug]
const PRODUCTS = [
  ['iPhone 15 Pro Max 256GB', 'Apple', 17500000, 8, 'telefonlar'],
  ['iPhone 14 128GB', 'Apple', 11200000, 12, 'telefonlar'],
  ['Samsung Galaxy S24 Ultra', 'Samsung', 16800000, 6, 'telefonlar'],
  ['Samsung Galaxy A55', 'Samsung', 4300000, 20, 'telefonlar'],
  ['Xiaomi Redmi Note 13 Pro', 'Xiaomi', 3250000, 30, 'telefonlar'],
  ['Xiaomi 14T', 'Xiaomi', 7900000, 9, 'telefonlar'],
  ['Google Pixel 8a', 'Google', 6400000, 5, 'telefonlar'],
  ['Honor X9b', 'Honor', 3900000, 14, 'telefonlar'],

  ['MacBook Air 13 M3', 'Apple', 15900000, 7, 'noutbuklar'],
  ['MacBook Pro 14 M3 Pro', 'Apple', 27500000, 3, 'noutbuklar'],
  ['ASUS Vivobook 15', 'ASUS', 7200000, 11, 'noutbuklar'],
  ['ASUS ROG Strix G16', 'ASUS', 19800000, 4, 'noutbuklar'],
  ['Lenovo IdeaPad Slim 3', 'Lenovo', 5600000, 18, 'noutbuklar'],
  ['Lenovo Legion 5 Pro', 'Lenovo', 18400000, 5, 'noutbuklar'],
  ['HP Pavilion 14', 'HP', 6900000, 9, 'noutbuklar'],
  ['Dell XPS 13', 'Dell', 16200000, 4, 'noutbuklar'],

  ['AirPods Pro 2', 'Apple', 3100000, 25, 'audio'],
  ['AirPods 4', 'Apple', 2250000, 15, 'audio'],
  ['Sony WH-1000XM5', 'Sony', 4700000, 8, 'audio'],
  ['JBL Tune 770NC', 'JBL', 1450000, 22, 'audio'],
  ['JBL Flip 6 kolonka', 'JBL', 1650000, 17, 'audio'],
  ['Marshall Emberton II', 'Marshall', 2400000, 6, 'audio'],
  ['Xiaomi Redmi Buds 6', 'Xiaomi', 390000, 40, 'audio'],
  ['Anker Soundcore Q30', 'Anker', 980000, 13, 'audio'],

  ['Artel changyutgich AVC-2000', 'Artel', 1750000, 10, 'maishiy-texnika'],
  ["Samsung mikroto'lqinli pech", 'Samsung', 1980000, 8, 'maishiy-texnika'],
  ['Philips blender HR2100', 'Philips', 720000, 26, 'maishiy-texnika'],
  ['Tefal dazmol FV1710', 'Tefal', 540000, 30, 'maishiy-texnika'],
  ['Bosch kir yuvish mashinasi 7kg', 'Bosch', 8400000, 4, 'maishiy-texnika'],
  ['Xiaomi Robot Vacuum S10', 'Xiaomi', 5200000, 5, 'maishiy-texnika'],
  ['Artel muzlatgich ART BF 250', 'Artel', 6100000, 6, 'maishiy-texnika'],
  ['Redmond multipishirgich RMC-M90', 'Redmond', 1320000, 12, 'maishiy-texnika'],

  ["Oq klassik ko'ylak", 'Zara', 320000, 45, 'kiyim'],
  ['Nike Sportswear futbolka', 'Nike', 380000, 38, 'kiyim'],
  ['Adidas Essentials xudi', 'Adidas', 690000, 20, 'kiyim'],
  ["Levi's 501 jinsi shim", "Levi's", 890000, 16, 'kiyim'],
  ['Uniqlo qishki kurtka', 'Uniqlo', 1250000, 9, 'kiyim'],
  ['Nike Air Force 1 krossovka', 'Nike', 1480000, 11, 'kiyim'],
  ['Adidas Samba OG', 'Adidas', 1620000, 7, 'kiyim'],
  ['Charm ayollar sumkasi', 'Charm', 540000, 14, 'kiyim'],

  ["O'tkan kunlar — Abdulla Qodiriy", 'Sharq', 68000, 60, 'kitoblar'],
  ['Mehrobdan chayon — Abdulla Qodiriy', 'Sharq', 62000, 40, 'kitoblar'],
  ['Yulduzli tunlar — Pirimqul Qodirov', 'Sharq', 74000, 30, 'kitoblar'],
  ["Boy ota, kambag'al ota", 'Asaxiy', 85000, 35, 'kitoblar'],
  ["Atomic Habits (o'zbekcha)", 'Asaxiy', 95000, 28, 'kitoblar'],
  ['Sapiens: insoniyat qisqacha tarixi', 'Asaxiy', 110000, 22, 'kitoblar'],
  ['Clean Code — Robert Martin', 'Asaxiy', 210000, 12, 'kitoblar'],
  ["JavaScript: to'liq qo'llanma", 'Asaxiy', 185000, 15, 'kitoblar'],

  ["Gantel to'plami 20kg", 'Torneo', 780000, 12, 'sport'],
  ['Yoga gilamchasi', 'Reebok', 240000, 33, 'sport'],
  ['Velosiped Trek Marlin 5', 'Trek', 8900000, 4, 'sport'],
  ["Futbol to'pi Adidas", 'Adidas', 320000, 25, 'sport'],
  ['Professional skakalka', 'Torneo', 95000, 50, 'sport'],
  ["Fitness rezina to'plami", 'Reebok', 165000, 28, 'sport'],
]

const DESCRIPTIONS = [
  "Rasmiy kafolat bilan, original mahsulot. Yetkazib berish Toshkent bo'ylab 1 kun, viloyatlarga 2-4 kun.",
  "Sifat va narx muvozanati yaxshi bo'lgan mashhur model. Do'konimizda sinovdan o'tkazilgan.",
  'Eng ko\'p sotilayotgan mahsulotlardan biri. 14 kun ichida sababsiz qaytarish mumkin.',
  'Yangi kolleksiya. Rasmiy distribyutordan keltirilgan, seriya raqami tekshirilgan.',
]

const COMMENTS = [
  'Juda tez yetkazib berishdi, mahsulot rasmdagidek.',
  'Narxiga arziydi, tavsiya qilaman.',
  'Sifati yaxshi, lekin qadoq biroz shikastlangan edi.',
  'Ikkinchi marta shu yerdan olyapman, hammasi joyida.',
  'Kutganimdan ham yaxshi chiqdi, rahmat!',
  'Yaxshi, lekin narxi biroz baland.',
  'Original ekan, kafolat kartasi ham bor.',
  "O'rtacha. Ishlaydi, lekin ajablanarli joyi yo'q.",
]

// Har safar bir xil natija chiqishi uchun deterministik generator
let seedValue = 42
function rnd() {
  seedValue = (seedValue * 1664525 + 1013904223) % 4294967296
  return seedValue / 4294967296
}
const pick = (arr) => arr[Math.floor(rnd() * arr.length)]

async function main() {
  console.log("Eski ma'lumotlar tozalanmoqda...")
  await prisma.orderItem.deleteMany()
  await prisma.order.deleteMany()
  await prisma.cartItem.deleteMany()
  await prisma.review.deleteMany()
  await prisma.product.deleteMany()
  await prisma.category.deleteMany()
  await prisma.refreshToken.deleteMany()
  await prisma.user.deleteMany()

  console.log('Foydalanuvchilar...')
  const hash = (p) => bcrypt.hashSync(p, 10)
  await prisma.user.create({
    data: {
      name: 'Admin',
      email: 'admin@example.uz',
      password: hash('admin123'),
      role: 'ADMIN',
      phone: '+998901112233',
    },
  })
  const users = []
  for (const [name, email] of [
    ['Ali Valiyev', 'ali@example.uz'],
    ['Dilnoza Karimova', 'dilnoza@example.uz'],
    ['Sardor Rahimov', 'sardor@example.uz'],
    ['Malika Tosheva', 'malika@example.uz'],
  ]) {
    users.push(await prisma.user.create({ data: { name, email, password: hash('user123') } }))
  }

  console.log('Kategoriyalar...')
  const categories = {}
  for (const [name, slug] of CATEGORIES) {
    categories[slug] = await prisma.category.create({
      data: { name, slug, image: `https://picsum.photos/seed/cat-${slug}/600/400` },
    })
  }

  console.log('Mahsulotlar...')
  const products = []
  for (const [index, row] of PRODUCTS.entries()) {
    const [title, brand, price, stock, catSlug] = row
    const slug = slugify(title) || `mahsulot-${index}`
    const hasDiscount = index % 4 === 0
    products.push(
      await prisma.product.create({
        data: {
          title,
          slug,
          brand,
          price,
          oldPrice: hasDiscount ? Math.round((price * 1.18) / 1000) * 1000 : null,
          stock,
          featured: index % 7 === 0,
          description: `${title} — ${brand}. ${pick(DESCRIPTIONS)}`,
          image: `https://picsum.photos/seed/${slug}/800/800`,
          images: JSON.stringify([
            `https://picsum.photos/seed/${slug}-1/800/800`,
            `https://picsum.photos/seed/${slug}-2/800/800`,
            `https://picsum.photos/seed/${slug}-3/800/800`,
          ]),
          categoryId: categories[catSlug].id,
        },
      }),
    )
  }

  console.log('Sharhlar...')
  for (const product of products) {
    for (const user of users) {
      if (rnd() < 0.55) continue
      await prisma.review.create({
        data: {
          userId: user.id,
          productId: product.id,
          rating: 3 + Math.floor(rnd() * 3), // 3..5
          comment: pick(COMMENTS),
        },
      })
    }
    const agg = await prisma.review.aggregate({
      where: { productId: product.id },
      _avg: { rating: true },
      _count: true,
    })
    await prisma.product.update({
      where: { id: product.id },
      data: {
        rating: Math.round((agg._avg.rating ?? 0) * 10) / 10,
        reviewCount: agg._count,
      },
    })
  }

  console.log('Namuna buyurtmalar...')
  const statuses = ['DELIVERED', 'SHIPPED', 'PAID', 'PENDING', 'CANCELLED']
  for (let i = 0; i < 6; i += 1) {
    const buyer = users[i % users.length]
    const picked = [products[i * 3], products[i * 3 + 1]].filter(Boolean)
    const total = picked.reduce((sum, p) => sum + p.price, 0)
    await prisma.order.create({
      data: {
        userId: buyer.id,
        status: statuses[i % statuses.length],
        total,
        fullName: buyer.name,
        phone: `+9989012345${10 + i}`,
        address: `Toshkent sh., Chilonzor tumani, ${10 + i}-uy`,
        createdAt: new Date(Date.now() - i * 36 * 60 * 60 * 1000),
        items: {
          create: picked.map((p) => ({
            productId: p.id,
            title: p.title,
            image: p.image,
            price: p.price,
            quantity: 1,
          })),
        },
      },
    })
  }

  console.log('Namuna savat (ali@example.uz)...')
  await prisma.cartItem.createMany({
    data: [
      { userId: users[0].id, productId: products[16].id, quantity: 1 },
      { userId: users[0].id, productId: products[22].id, quantity: 2 },
    ],
  })

  console.log(`
Tayyor!
  Kategoriya:    ${CATEGORIES.length}
  Mahsulot:      ${products.length}
  Foydalanuvchi: ${users.length + 1}

  Admin: admin@example.uz / admin123
  User:  ali@example.uz / user123
`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
