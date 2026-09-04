# Example Shop API — hujjat

Base URL: `http://localhost:4000/api`

Bu yerdagi barcha JSON namunalar **ishlayotgan serverdan olingan**, qo'lda yozilmagan.
Frontend yozayotganda backend kodini ochish shart emas — kerak bo'lgan hamma narsa shu faylda.

**Mundarija:** [Umumiy qoidalar](#umumiy-qoidalar) · [Auth](#auth) · [Mahsulotlar](#mahsulotlar) ·
[Kategoriyalar](#kategoriyalar) · [Sharhlar](#sharhlar) · [Savat](#savat) · [Buyurtmalar](#buyurtmalar) ·
[Admin](#admin) · [Fayl yuklash](#fayl-yuklash) · [Xato kodlari](#xato-kodlari) ·
[Qiyinchilik rejimi](#qiyinchilik-rejimi)

---

## Umumiy qoidalar

**Autentifikatsiya.** Himoyalangan endpointlarga sarlavha kerak:

```
Authorization: Bearer <accessToken>
```

**Narxlar** — butun son, so'mda. `3100000` = 3 100 000 so'm. Kasr yo'q.

**Sanalar** — ISO 8601 UTC: `"2026-09-04T07:18:43.652Z"`.

**Ro'yxatlar** doim bir xil shaklda: `items` + `meta`.

```json
{
  "items": [],
  "meta": { "page": 1, "limit": 2, "total": 8, "totalPages": 4, "hasNext": true, "hasPrev": false }
}
```

**Xatolar** ham doim bir xil shaklda:

```json
{ "message": "Mahsulot topilmadi", "code": "NOT_FOUND" }
```

`code` — mashinaga, `message` — odamga. Shartni doim `code` bo'yicha yozing,
`message` matni o'zgarishi mumkin.

---

## Auth

### `POST /api/auth/register`

Body: `{ name, email, password, phone? }` — `name` ≥ 2, `password` ≥ 6 belgi.

**201** — javob `login` bilan bir xil (pastda).
Email band bo'lsa **409 `EMAIL_TAKEN`**.

### `POST /api/auth/login`

Body: `{ email, password }`

**200:**

```json
{
  "user": {
    "id": "cmtmmhj690001w0d0neu4vd6c",
    "email": "ali@example.uz",
    "name": "Ali Valiyev",
    "phone": null,
    "avatar": null,
    "role": "USER",
    "createdAt": "2026-09-04T07:18:43.282Z"
  },
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "6f3c9a...48 baytlik hex satr"
}
```

Email yoki parol xato bo'lsa **401** (qaysi biri xatoligi aytilmaydi — bu ataylab).

`role` — `"USER"` yoki `"ADMIN"`. Admin panelni shu maydon bo'yicha ko'rsating.

### `POST /api/auth/refresh`

Body: `{ refreshToken }` → **200**, javob `login` bilan bir xil.

⚠️ **Rotation:** eski refresh token darhol bekor bo'ladi. Javobdagi yangi
`refreshToken` ni saqlamasangiz, keyingi refresh **401** beradi.

### `POST /api/auth/logout`

Body: `{ refreshToken }` → **204** (javob tanasi yo'q).

### `GET /api/auth/me` · auth

**200:**

```json
{
  "id": "cmtmmhj690001w0d0neu4vd6c",
  "email": "ali@example.uz",
  "name": "Ali Valiyev",
  "phone": null,
  "avatar": null,
  "role": "USER",
  "createdAt": "2026-09-04T07:18:43.282Z"
}
```

### `PATCH /api/auth/me` · auth

Body: `{ name?, phone?, avatar? }` → **200**, yangilangan user.

### Token muddati va refresh oqimi

`accessToken` **15 daqiqada** tugaydi (`.env` dagi `ACCESS_TOKEN_TTL`).
Tugagach har qanday himoyalangan endpoint shuni qaytaradi:

```json
{ "message": "Token muddati tugagan", "code": "TOKEN_EXPIRED" }
```

Frontend tomonda bajarilishi kerak bo'lgan qadamlar:

1. Javob `401` va `code === 'TOKEN_EXPIRED'` ekanini aniqlash.
2. `POST /auth/refresh` ga saqlangan `refreshToken` ni yuborish.
3. Javobdagi **ikkala** yangi tokenni saqlash (rotation!).
4. **Asl so'rovni** yangi access token bilan qaytadan yuborish.
5. Bir so'rovni cheksiz qayta urinmaslik — bitta "retry" bayrog'i yetarli.
6. Bir vaqtda 5 ta so'rov 401 olsa, 5 marta refresh qilmaslik.
7. Refresh ham 401 bersa — tokenlarni tozalab, login sahifasiga.

6-qadam eng ko'p o'tkazib yuboriladigan joyi — sahifada bir nechta so'rov parallel
ketayotganini unutmang.

Buni 15 daqiqa kutmasdan sinash uchun: istalgan so'rovga `?__fail=401` qo'shing.
`.env` da `ACCESS_TOKEN_TTL="45s"` qilsangiz, oqim o'z-o'zidan takrorlanadi.

---

## Mahsulotlar

### `GET /api/products`

| Parametr             | Turi   | Izoh                                                                       |
| -------------------- | ------ | -------------------------------------------------------------------------- |
| `search`             | matn   | nom, tavsif va brend bo'yicha qidiradi                                     |
| `category`           | matn   | kategoriya **slug**i; vergul bilan bir nechta: `telefonlar,audio`          |
| `brand`              | matn   | brend nomi; vergul bilan bir nechta: `Apple,Samsung`                       |
| `minPrice`,`maxPrice`| son    | so'mda                                                                      |
| `inStock`            | `true` | faqat `stock > 0` bo'lganlari                                              |
| `featured`           | `true`/`false` | tanlangan mahsulotlar                                              |
| `sort`               | matn   | `newest` (default), `oldest`, `price_asc`, `price_desc`, `rating`, `popular`, `title` |
| `page`               | son    | 1 dan boshlanadi (default 1)                                               |
| `limit`              | son    | 1..60 (default 12)                                                          |

Noto'g'ri qiymat → **422** (masalan `page=0`).

**200** (`?limit=2&category=audio&sort=price_asc`):

```json
{
  "items": [
    {
      "id": "cmtmmhjhf001lw0d08im18win",
      "title": "Xiaomi Redmi Buds 6",
      "slug": "xiaomi-redmi-buds-6",
      "description": "Xiaomi Redmi Buds 6 — Xiaomi. Eng ko'p sotilayotgan mahsulotlardan biri...",
      "brand": "Xiaomi",
      "price": 390000,
      "oldPrice": null,
      "stock": 40,
      "image": "https://picsum.photos/seed/xiaomi-redmi-buds-6/800/800",
      "images": [
        "https://picsum.photos/seed/xiaomi-redmi-buds-6-1/800/800",
        "https://picsum.photos/seed/xiaomi-redmi-buds-6-2/800/800",
        "https://picsum.photos/seed/xiaomi-redmi-buds-6-3/800/800"
      ],
      "featured": false,
      "rating": 4,
      "reviewCount": 2,
      "categoryId": "cmtmmhjdb0007w0d0gadis8c5",
      "createdAt": "2026-09-04T07:18:43.683Z",
      "updatedAt": "2026-09-04T07:18:44.066Z",
      "category": {
        "id": "cmtmmhjdb0007w0d0gadis8c5",
        "name": "Audio",
        "slug": "audio",
        "image": "https://picsum.photos/seed/cat-audio/600/400"
      }
    }
  ],
  "meta": { "page": 1, "limit": 2, "total": 8, "totalPages": 4, "hasNext": true, "hasPrev": false }
}
```

`oldPrice` `null` bo'lmasa — chegirma bor, uni chizib ko'rsatish mumkin.

### `GET /api/products/filters`

Filtr panelini qattiq kodlamaslik uchun.

**200:**

```json
{
  "brands": ["ASUS", "Adidas", "Anker", "Apple", "Artel", "..."],
  "priceRange": { "min": 62000, "max": 27500000 },
  "categories": [{ "id": "cmtmmhjdb...", "name": "Audio", "slug": "audio", "productCount": 8 }]
}
```

### `GET /api/products/:idOrSlug`

`id` ham, `slug` ham ishlaydi — URL'da `slug` chiroyliroq.

**200** — yuqoridagi mahsulot obyekti + qo'shimcha `related` maydoni:
shu kategoriyadagi 4 ta mahsulot (reyting bo'yicha, o'zidan boshqa).
`related` elementlarida `category` bo'lmaydi.

Topilmasa **404 `NOT_FOUND`**.

### Admin CRUD

| Metod    | Yo'l                  |
| -------- | --------------------- |
| `POST`   | `/api/products`       |
| `PATCH`  | `/api/products/:id`   |
| `DELETE` | `/api/products/:id`   |

POST body:

```json
{
  "title": "Sinov mahsuloti",
  "description": "Kamida 10 ta belgi",
  "brand": "Apple",
  "price": 123000,
  "oldPrice": null,
  "stock": 5,
  "image": "https://.../rasm.jpg",
  "images": ["https://.../1.jpg"],
  "featured": false,
  "categoryId": "cmtmmhjdb0007w0d0gadis8c5"
}
```

`slug` avtomatik yasaladi (bir xil bo'lsa `-2`, `-3` qo'shiladi). PATCH'da hamma maydon ixtiyoriy.
DELETE → **204**. Admin bo'lmasa **403**.

---

## Kategoriyalar

### `GET /api/categories`

**200** — massiv (bu yerda `meta` yo'q, ro'yxat kichik):

```json
[
  {
    "id": "cmtmmhjdb0007w0d0gadis8c5",
    "name": "Audio",
    "slug": "audio",
    "image": "https://picsum.photos/seed/cat-audio/600/400",
    "productCount": 8
  }
]
```

`GET /api/categories/:slug` — bitta kategoriya (`productCount` siz).
Admin uchun `POST` / `PATCH /:id` / `DELETE /:id`, body: `{ name, image? }`.

---

## Sharhlar

### `GET /api/products/:productId/reviews`

⚠️ Bu yerda **`id`** kerak, `slug` emas.

**200:**

```json
{
  "items": [
    {
      "id": "cmtmmhjqp0051w0d0rja0e1rv",
      "userId": "cmtmmhjcs0004w0d0ey3gjsco",
      "productId": "cmtmmhjgk0019w0d0yq7hzt1u",
      "rating": 4,
      "comment": "O'rtacha. Ishlaydi, lekin ajablanarli joyi yo'q.",
      "createdAt": "2026-09-04T07:18:44.017Z",
      "user": { "id": "cmtmmhjcs0004w0d0ey3gjsco", "name": "Malika Tosheva", "avatar": null }
    }
  ],
  "total": 1,
  "breakdown": { "1": 0, "2": 0, "3": 0, "4": 1, "5": 0 }
}
```

`breakdown` — yulduzlar bo'yicha taqsimot, diagramma chizish uchun tayyor.

### `POST /api/products/:productId/reviews` · auth

Body: `{ rating, comment }` — `rating` 1..5, `comment` ≥ 3 belgi. → **201**.

Bir foydalanuvchi bitta mahsulotga faqat bitta sharh yozadi → ikkinchisida **409 `REVIEW_EXISTS`**.
Sharh qo'shilganda mahsulotning `rating` va `reviewCount` maydonlari avtomatik qayta hisoblanadi.

### `PATCH` / `DELETE /api/reviews/:id` · auth

Faqat o'z sharhi (yoki admin), aks holda **403**. DELETE → **204**.

---

## Savat

Hammasi auth talab qiladi. **Har bir amal savatning to'liq yangi holatini qaytaradi** —
o'zgartirgandan keyin alohida `GET /api/cart` yuborish shart emas.

### `GET /api/cart` → **200**

```json
{
  "items": [
    {
      "id": "cmtmmpy86001sw0tsakr2ty7z",
      "quantity": 2,
      "product": { "...": "to'liq mahsulot obyekti, category bilan" },
      "lineTotal": 6200000
    }
  ],
  "count": 2,
  "subtotal": 6200000
}
```

`count` — jami dona soni (element soni emas). `lineTotal` = `quantity × product.price`.

| Metod    | Yo'l                  | Body               | Izoh                                  |
| -------- | --------------------- | ------------------ | ------------------------------------- |
| `POST`   | `/api/cart`           | `{ productId, quantity? }` | bor bo'lsa sonini **qo'shadi**; **201** |
| `PATCH`  | `/api/cart/:itemId`   | `{ quantity }`     | aniq songa o'rnatadi                  |
| `DELETE` | `/api/cart/:itemId`   | —                  | bitta elementni olib tashlaydi        |
| `DELETE` | `/api/cart`           | —                  | savatni bo'shatadi                    |

`quantity` 1..99 oralig'ida bo'lishi kerak (aks holda **422**).
Ombordan ko'p so'ralsa **409 `NOT_ENOUGH_STOCK`**:

```json
{ "message": "Omborda faqat 25 dona qoldi", "code": "NOT_ENOUGH_STOCK" }
```

Bo'lmagan mahsulot → **404**. Boshqa odamning savat elementiga tegsangiz ham **404**.

---

## Buyurtmalar

### `POST /api/orders` · auth

Body: `{ fullName, phone, address, note? }` — savatdagi hamma narsadan buyurtma yasaydi.

Bitta tranzaksiyada: buyurtma yaratiladi → ombor kamayadi → savat tozalanadi.
Narx buyurtma paytida "muzlatiladi" (keyin mahsulot narxi o'zgarsa, buyurtmada eskisi qoladi).

**201:**

```json
{
  "id": "cmtmmpy8k001uw0tsv4snp9jn",
  "userId": "cmtmmhj690001w0d0neu4vd6c",
  "status": "PENDING",
  "total": 6200000,
  "fullName": "Ali Valiyev",
  "phone": "+998901234567",
  "address": "Toshkent, Yunusobod 4-kv",
  "note": "Kechqurun qo'ng'iroq qiling",
  "createdAt": "2026-09-04T07:25:16.053Z",
  "updatedAt": "2026-09-04T07:25:16.053Z",
  "items": [
    {
      "id": "cmtmmpy8k001ww0tsiq47pwpw",
      "orderId": "cmtmmpy8k001uw0tsv4snp9jn",
      "productId": "cmtmmhjgk0019w0d0yq7hzt1u",
      "title": "AirPods Pro 2",
      "image": "https://picsum.photos/seed/airpods-pro-2/800/800",
      "price": 3100000,
      "quantity": 2
    }
  ]
}
```

Savat bo'sh bo'lsa **400**. Ombor yetmasa **409 `NOT_ENOUGH_STOCK`** (hech narsa yaratilmaydi).

### `GET /api/orders` · auth

Query: `status`, `page`, `limit` (1..50, default 10). → `items` + `meta`, yangisi birinchi.

### `GET /api/orders/:id` · auth

**200** — buyurtma + `items` + `user`. O'zining emas bo'lsa **403**.

### `POST /api/orders/:id/cancel` · auth

Faqat `PENDING` holatida ishlaydi; ombor qaytariladi, status `CANCELLED` bo'ladi.
Boshqa holatda **409 `NOT_CANCELLABLE`**.

**Statuslar:** `PENDING` → `PAID` → `SHIPPED` → `DELIVERED`, yoki `CANCELLED`.

---

## Admin

Hammasi auth + `role === "ADMIN"`. Oddiy user uchun **403**.

### `GET /api/admin/stats`

```json
{
  "revenue": 65850000,
  "orderCount": 8,
  "userCount": 6,
  "productCount": 54,
  "ordersByStatus": { "PENDING": 1, "PAID": 1, "SHIPPED": 1, "DELIVERED": 2, "CANCELLED": 3 },
  "lowStock": [
    {
      "id": "cmtmmhjfl000vw0d052fubxqj",
      "title": "MacBook Pro 14 M3 Pro",
      "stock": 3,
      "image": "https://picsum.photos/seed/macbook-pro-14-m3-pro/800/800"
    }
  ],
  "recentOrders": [{ "...": "oxirgi 5 ta buyurtma, user bilan" }]
}
```

`revenue` — faqat `PAID`/`SHIPPED`/`DELIVERED` buyurtmalar yig'indisi.
`lowStock` — `stock ≤ 5` bo'lgan 5 ta mahsulot.

### `GET /api/admin/orders`

Query: `status`, `search` (ism / telefon / buyurtma id), `page`, `limit`. → `items` + `meta`.

### `PATCH /api/admin/orders/:id/status`

Body: `{ "status": "SHIPPED" }` → **200**, yangilangan buyurtma.
Noto'g'ri status → **422**.

### `GET /api/admin/users`

Query: `search` (ism / email), `page`, `limit`.

```json
{
  "items": [
    {
      "id": "cmtmmhj690001w0d0neu4vd6c",
      "email": "ali@example.uz",
      "name": "Ali Valiyev",
      "phone": null,
      "avatar": null,
      "role": "USER",
      "createdAt": "2026-09-04T07:18:43.282Z",
      "orderCount": 2
    }
  ],
  "meta": { "...": "" }
}
```

Parol hech qachon javobga tushmaydi.

---

## Fayl yuklash

Admin. `multipart/form-data`, maks **5MB**, faqat `jpeg` / `png` / `webp` / `gif`.

| Metod  | Yo'l                | Maydon nomi | Javob                    |
| ------ | ------------------- | ----------- | ------------------------ |
| `POST` | `/api/upload`       | `image`     | `{ url, size }`          |
| `POST` | `/api/upload/many`  | `images`    | `{ urls: [...] }` (6 ta) |

**201:**

```json
{ "url": "http://localhost:4000/uploads/1788506240273-3b019b1576b4.png", "size": 70 }
```

Fayl darhol shu URL'dan ochiladi. Noto'g'ri tur → **400**, katta fayl → **413 `FILE_TOO_LARGE`**.

Frontendda:

```js
const fd = new FormData()
fd.append('image', file)
await api.post('/upload', fd) // Content-Type'ni QO'LDA qo'ymang — brauzer o'zi qo'yadi
```

---

## Xato kodlari

| HTTP | `code`                | Qachon                                              |
| ---- | --------------------- | --------------------------------------------------- |
| 400  | `BAD_REQUEST`         | Savat bo'sh, fayl turi noto'g'ri                     |
| 400  | `BAD_JSON`            | Yuborilgan JSON buzuq                                |
| 401  | `UNAUTHORIZED`        | Token yo'q yoki yaroqsiz; login xato                 |
| 401  | `TOKEN_EXPIRED`       | **Access token muddati tugagan → refresh qiling**    |
| 403  | `FORBIDDEN`           | Admin emas, yoki begona resurs                       |
| 404  | `NOT_FOUND`           | Resurs topilmadi                                     |
| 404  | `ROUTE_NOT_FOUND`     | Bunday endpoint yo'q (yo'lda xato)                   |
| 409  | `EMAIL_TAKEN`         | Ro'yxatdan o'tishda email band                       |
| 409  | `NOT_ENOUGH_STOCK`    | Omborda yetarli emas                                 |
| 409  | `REVIEW_EXISTS`       | Bu mahsulotga allaqachon sharh yozgan                |
| 409  | `NOT_CANCELLABLE`     | Buyurtma `PENDING` emas                              |
| 413  | `FILE_TOO_LARGE`      | Fayl 5MB dan katta                                   |
| 422  | `VALIDATION_ERROR`    | Body yoki query noto'g'ri — **`details` bilan**      |
| 500  | `INTERNAL_ERROR`      | Kutilmagan xato                                      |
| 500  | `CHAOS`               | Qiyinchilik rejimi ataylab yiqitdi                   |
| 503  | `SERVICE_UNAVAILABLE` | Qiyinchilik rejimi (`?__fail=503`)                   |

Validatsiya xatosi maydon nomlari bilan keladi — formaga to'g'ridan-to'g'ri ulanadi:

```json
{
  "message": "Ma'lumotlar noto'g'ri",
  "code": "VALIDATION_ERROR",
  "details": {
    "name": "Ism kamida 2 ta belgi",
    "email": "Email formati noto'g'ri",
    "password": "Parol kamida 6 ta belgi"
  }
}
```

---

## Qiyinchilik rejimi

Localhost 3 millisekundda javob beradi va hech qachon yiqilmaydi. Shunday muhitda
loading, error va retry mantig'ini yozib bo'lmaydi — chunki ularni ko'rmaysiz.
Shuning uchun server **ataylab sekin va ishonchsiz** qilib sozlangan.

**Standart holat** (`.env`): har bir so'rov **1000 ms** kechikadi va **15%** so'rov `500` qaytaradi.

### Bitta so'rovga

| Parametr           | Nima qiladi                                             |
| ------------------ | ------------------------------------------------------- |
| `?__delay=2500`    | shu so'rov 2.5 s kechikadi                              |
| `?__delay=0`       | shu so'rovda kechikish **yo'q** (debug paytida qulay)   |
| `?__fail=500`      | ataylab 500                                             |
| `?__fail=401`      | ataylab `TOKEN_EXPIRED` → refresh oqimini sinash        |
| `?__fail=403/404/409/422/503` | mos xato                                     |
| `?__fail=timeout`  | server **umuman javob bermaydi** → timeout mantig'i     |

Masalan interceptor'ingizni sinash: `GET /api/cart?__fail=401`.

### Global — serverni qayta ishga tushirmasdan

```bash
# hozirgi sozlamalar
curl http://localhost:4000/api/__chaos

# xatolarni o'chirish (tinch ishlash uchun)
curl -X POST http://localhost:4000/api/__chaos -H "Content-Type: application/json" -d "{\"delayMs\":0,\"failRate\":0}"

# qattiq rejim: 2 s kechikish, 30% xato
curl -X POST http://localhost:4000/api/__chaos -H "Content-Type: application/json" -d "{\"delayMs\":2000,\"failRate\":0.3}"
```

`/api/auth/login` va `/api/auth/refresh` **tasodifiy** xatodan himoyalangan —
aks holda interceptor cheksiz aylanib, sababini topish qiyin bo'lardi.
Majburiy `?__fail=` ular uchun ham ishlaydi.

### Tavsiya

- **1-kun** (CRUD + loading/error): shu holatda qoldiring. Har bir ro'yxat uchun
  skeleton, har bir xato uchun "qaytadan urinish" tugmasi kerak bo'ladi.
- **2-kun** (optimistic update, auth): `failRate` ni 0.3 ga ko'taring — optimistic
  update rollback'i ishlashini faqat shunda ko'rasiz. `.env` da `ACCESS_TOKEN_TTL="45s"`
  qilsangiz, refresh oqimi har daqiqada o'zi ishga tushadi.
