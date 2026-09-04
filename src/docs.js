/**
 * Oddiy endpoint ro'yxati — GET /api/docs.
 * (Swagger emas, lekin frontend yozayotganda qo'l ostida turishi uchun yetarli.)
 */
export const docs = {
  baseUrl: '/api',
  auth: 'Himoyalangan endpointlarga `Authorization: Bearer <accessToken>` sarlavhasi kerak',
  testAccounts: {
    admin: { email: 'admin@example.uz', password: 'admin123' },
    user: { email: 'ali@example.uz', password: 'user123' },
  },
  fullDocs: 'Batafsil hujjat va JSON namunalar: loyihadagi API.md fayli',
  tips: [
    'Server ATAYLAB sekin: standart holatda har so\'rov 1s kechikadi va 15% so\'rov 500 qaytaradi.',
    'accessToken 15 daqiqada tugaydi. 401 + code:"TOKEN_EXPIRED" kelsa /auth/refresh chaqiring.',
    'Refresh rotation bilan: javobdagi yangi refreshToken ni saqlamasangiz, keyingisi 401 beradi.',
    'Xato javoblari doim { message, code, details? } ko\'rinishida.',
    'Ro\'yxatlar doim { items, meta } ko\'rinishida.',
  ],
  chaos: {
    perRequest: {
      '?__delay=2500': 'shu so\'rov 2.5s kechikadi',
      '?__delay=0': 'shu so\'rovda kechikish yo\'q',
      '?__fail=500': 'ataylab 500',
      '?__fail=401': 'ataylab TOKEN_EXPIRED — refresh oqimini sinash uchun',
      '?__fail=403|404|409|422|503': 'mos xato',
      '?__fail=timeout': 'server umuman javob bermaydi',
    },
    global: {
      'GET /api/__chaos': 'hozirgi sozlamalar',
      'POST /api/__chaos': '{ delayMs, failRate } — serverni qayta ishga tushirmasdan',
      note: '/auth/login va /auth/refresh tasodifiy xatodan himoyalangan',
    },
  },
  endpoints: {
    auth: [
      'POST   /api/auth/register   { name, email, password, phone? }',
      'POST   /api/auth/login      { email, password }',
      'POST   /api/auth/refresh    { refreshToken }',
      'POST   /api/auth/logout     { refreshToken }',
      'GET    /api/auth/me         (auth)',
      'PATCH  /api/auth/me         (auth) { name?, phone?, avatar? }',
    ],
    products: [
      'GET    /api/products?search=&category=&brand=&minPrice=&maxPrice=&inStock=&featured=&sort=&page=&limit=',
      '       sort: newest | oldest | price_asc | price_desc | rating | popular | title',
      'GET    /api/products/filters      (brendlar, narx oralig\'i, kategoriyalar)',
      'GET    /api/products/:idOrSlug    (+ related)',
      'POST   /api/products              (admin)',
      'PATCH  /api/products/:id          (admin)',
      'DELETE /api/products/:id          (admin)',
    ],
    categories: [
      'GET    /api/categories',
      'GET    /api/categories/:slug',
      'POST   /api/categories            (admin) { name, image? }',
      'PATCH  /api/categories/:id        (admin)',
      'DELETE /api/categories/:id        (admin)',
    ],
    reviews: [
      'GET    /api/products/:productId/reviews',
      'POST   /api/products/:productId/reviews  (auth) { rating, comment }',
      'PATCH  /api/reviews/:id                  (auth, o\'ziniki)',
      'DELETE /api/reviews/:id                  (auth, o\'ziniki)',
    ],
    cart: [
      'GET    /api/cart                  (auth)',
      'POST   /api/cart                  (auth) { productId, quantity? }',
      'PATCH  /api/cart/:itemId          (auth) { quantity }',
      'DELETE /api/cart/:itemId          (auth)',
      'DELETE /api/cart                  (auth) — bo\'shatish',
    ],
    orders: [
      'POST   /api/orders                (auth) { fullName, phone, address, note? }',
      'GET    /api/orders?status=&page=&limit=   (auth)',
      'GET    /api/orders/:id            (auth)',
      'POST   /api/orders/:id/cancel     (auth, faqat PENDING)',
    ],
    admin: [
      'GET    /api/admin/stats',
      'GET    /api/admin/orders?status=&search=&page=&limit=',
      'PATCH  /api/admin/orders/:id/status  { status }',
      'GET    /api/admin/users?search=&page=&limit=',
    ],
    upload: [
      'POST   /api/upload        (admin, multipart, field: "image")  -> { url }',
      'POST   /api/upload/many   (admin, multipart, field: "images") -> { urls }',
    ],
  },
  orderStatuses: ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'],
}
