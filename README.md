# Example Shop API

> Frontend o'rganayotganlar uchun mashq backendi — **ataylab sekin va ishonchsiz** qilib yozilgan.

`Express 5` · `Prisma` · `SQLite` · `JWT` · Ma'lumotlar bazasini o'rnatish shart emas

---

## Bu nima?

To'liq ishlaydigan online do'kon API'si: mahsulotlar, filtrlar, savat, buyurtmalar,
sharhlar, autentifikatsiya, admin panel va rasm yuklash. 35 ta endpoint,
7 kategoriya va 54 ta namuna mahsulot bilan tayyor holda keladi.

Maqsadi — frontend mashq qilayotganda **backend kutib o'tirmaslik**.
Bitta buyruq bilan ishga tushadi, ichida real ma'lumot bor, va eng muhimi:
u ataylab yomon tarmoq sharoitini taqlid qiladi.

## Nega "ataylab yomon"?

Localhost 3 millisekundda javob beradi va hech qachon yiqilmaydi. Shunday muhitda
yozilgan frontend real internetga chiqqanda birinchi kunidayoq sinadi — chunki
loading skeleton, error holati va "qaytadan urinish" tugmasi hech qachon yozilmagan,
ular kerak bo'lmagani uchun.

Shuning uchun bu server **standart holatda**:

- har bir so'rovni **~1 soniya** ushlab turadi,
- so'rovlarning **15% iga `500` xato** qaytaradi.

Bu buzuqlik emas — asosiy xususiyat. Yoqmasa bitta buyruq bilan o'chiriladi
([Qiyinchilik rejimi](#qiyinchilik-rejimi)).

## Kimlar uchun?

| Kim | Nima uchun |
| --- | --- |
| **React / Vue / Svelte o'rganayotganlar** | Fetch, cache, loading/error, optimistic update, auth — hammasi bitta API'da |
| **Portfolio yig'ayotganlar** | Tayyor va real API — "todo app" dan uzoqroq narsa qurish uchun |
| **Intervyuga tayyorlanayotganlar** | Pagination, filtr, refresh token, roli bo'yicha kirish — ko'p so'raladigan mavzular |
| **O'qituvchi va mentorlar** | Guruh uchun bir xil backend; hamma bir xil ma'lumot bilan ishlaydi |
| **Backend o'rganmoqchi bo'lganlar** | ~1400 qator o'qiladigan kod: middleware zanjiri, JWT, tranzaksiya, RLS'siz egalik tekshiruvi |

**Kimlar uchun emas:** bu ishlab chiqarishga (production) mo'ljallanmagan.
Haqiqiy do'kon qurmoqchi bo'lsangiz, buni asos qilib olmang —
[Cheklovlar](#cheklovlar) bo'limini o'qing.

---

## Tez boshlash

Kerak: **Node.js 20+**. Boshqa hech narsa — Docker ham, Postgres ham, akkaunt ham kerak emas.

```bash
git clone <repo-manzili>
cd Example
npm install
cp .env.example .env
npm run db:push
npm run db:seed
npm run dev
```

Tayyor:

```
  Example Shop API
  http://localhost:4000/api
  Endpointlar ro'yxati: http://localhost:4000/api/docs
```

Tekshirish uchun brauzerda oching: <http://localhost:4000/api/products?limit=5>

> Windows'da `cp .env.example .env` o'rniga PowerShell'da:
> `Copy-Item .env.example .env`

### Test akkauntlar

| Rol | Email | Parol |
| --- | --- | --- |
| Admin | `admin@example.uz` | `admin123` |
| Foydalanuvchi | `ali@example.uz` | `user123` |

Yana uchta oddiy foydalanuvchi: `dilnoza@`, `sardor@`, `malika@example.uz` — parol `user123`.

### Skriptlar

| Buyruq | Vazifasi |
| --- | --- |
| `npm run dev` | Server, fayl o'zgarsa avtomatik qayta yuklanadi |
| `npm start` | Server, kuzatuvsiz |
| `npm run db:push` | Sxemani bazaga qo'llaydi va Prisma client yasaydi |
| `npm run db:seed` | Namuna ma'lumot yozadi |
| `npm run db:reset` | Bazani tozalab, qaytadan seed qiladi |
| `npm run db:studio` | Bazani brauzerda ko'rish (Prisma Studio) |

---

## Nima mashq qilish mumkin

Har bir endpoint aniq bir frontend ko'nikmasini "majburlaydi":

| API imkoniyati | Frontendda nima chiqadi |
| --- | --- |
| `GET /products` — search, 6 xil filtr, 7 xil saralash, pagination | URL'ga bog'langan filtr holati, debounce'li qidiruv, sahifalash |
| `GET /products/filters` | Filtrlarni qattiq kodlamasdan, serverdan qurish |
| Access token (15 daq) + **rotation** bilan refresh token | Interceptor, avtomatik token yangilash, parallel 401'larni bitta refresh bilan hal qilish |
| `role: USER \| ADMIN` | Himoyalangan yo'nalishlar, rolga qarab menyu |
| `POST /cart` — har amal butun savatni qaytaradi | Global state, optimistic update va **rollback** |
| `POST /orders` — tranzaksiya, ombor kamayadi | Ko'p bosqichli forma, muvaffaqiyat sahifasi, cache'ni yangilash |
| `409 NOT_ENOUGH_STOCK` va boshqa `code`'lar | Xato turiga qarab har xil UI (toast, forma xatosi, modal) |
| `422` + `details: { maydon: "xabar" }` | Server validatsiyasini forma maydonlariga ulash |
| `GET /products/:id/reviews` — `breakdown` bilan | Yulduz reyting, diagramma, sharh qoldirish formasi |
| `POST /upload` — multipart | Fayl tanlash, oldindan ko'rish, yuklash progressi |
| `GET /admin/stats` | Dashboard, kartochkalar, jadvallar |
| 1 soniya kechikish + 15% xato | **Skeleton, error state, retry** — bularsiz ilova ishlamaydi |

### Taklif qilinadigan reja

- **1-kun** — mahsulotlar ro'yxati, filtr, detal sahifa. Har bir so'rov uchun
  skeleton va xato holati. Qiyinchilik rejimini standart holatda qoldiring.
- **2-kun** — savat (optimistic update), buyurtma, login va 401 → refresh oqimi.
  `failRate` ni `0.3` ga ko'taring, `ACCESS_TOKEN_TTL` ni `"45s"` qiling.

---

## Qiyinchilik rejimi

### Bitta so'rovga

Istalgan URL'ga parametr qo'shing:

| Parametr | Nima qiladi |
| --- | --- |
| `?__delay=2500` | Shu so'rov 2.5 soniya kechikadi |
| `?__delay=0` | Shu so'rovda kechikish yo'q (debug paytida qulay) |
| `?__fail=500` | Ataylab server xatosi |
| `?__fail=401` | `TOKEN_EXPIRED` — 15 daqiqa kutmasdan refresh oqimini sinash |
| `?__fail=403` `404` `409` `422` `503` | Mos xato |
| `?__fail=timeout` | Server **umuman javob bermaydi** — timeout mantig'i uchun |

Masalan: `GET /api/cart?__fail=401`

### Global — serverni qayta ishga tushirmasdan

Hozirgi sozlamalar: <http://localhost:4000/api/__chaos>

O'chirish (bash / macOS / Linux):

```bash
curl -X POST http://localhost:4000/api/__chaos -H "Content-Type: application/json" -d '{"delayMs":0,"failRate":0}'
```

O'chirish (Windows PowerShell — bu yerda `curl` boshqa buyruqning taxallusi):

```powershell
Invoke-RestMethod "http://localhost:4000/api/__chaos" -Method Post -ContentType "application/json" -Body '{"delayMs":0,"failRate":0}'
```

Qattiq rejim uchun `{"delayMs":2000,"failRate":0.3}` yuboring.
Doimiy o'zgartirish uchun `.env` dagi `DELAY_MS` va `CHAOS_RATE`.

> `/auth/login` va `/auth/refresh` **tasodifiy** xatodan himoyalangan — aks holda
> interceptor cheksiz aylanib, sababini topish qiyin bo'lardi. Majburiy `?__fail=`
> ular uchun ham ishlaydi.

---

## API hujjati

📘 **[API.md](API.md)** — to'liq ma'lumotnoma: har bir endpoint, query parametrlari,
javob shakli va xato kodlari.

Undagi barcha JSON namunalar **ishlayotgan serverdan olingan**, qo'lda yozilmagan —
ya'ni kodga mos kelmay qolmaydi.

Server ishlayotganda qisqa ro'yxatni <http://localhost:4000/api/docs> dan ham ko'rish mumkin.

### Eng muhim uchta narsa

**1. Ro'yxatlar doim bir xil shaklda:**

```json
{
  "items": [],
  "meta": { "page": 1, "limit": 12, "total": 54, "totalPages": 5, "hasNext": true, "hasPrev": false }
}
```

**2. Xatolar ham doim bir xil shaklda:**

```json
{ "message": "Omborda faqat 3 dona qoldi", "code": "NOT_ENOUGH_STOCK" }
```

Shartni doim `code` bo'yicha yozing — `message` matni o'zgarishi mumkin.

**3. Narxlar — butun son, so'mda.** `3100000` = 3 100 000 so'm, kasr yo'q.

```js
new Intl.NumberFormat('uz-UZ').format(3100000) + " so'm"
```

---

## Sinash usullari

| Usul | Nimaga yaxshi |
| --- | --- |
| **Brauzer** | Faqat `GET`. Eng tez: <http://localhost:4000/api/products> |
| **[requests.http](requests.http)** | Hammasi uchun. VS Code + `humao.rest-client` kengaytmasi; avval **Login** so'rovini yuboring — token qolganlariga o'zi qo'shiladi |
| **Postman / Insomnia** | Odatdagidek; `Authorization: Bearer <accessToken>` |
| **PowerShell** | `Invoke-RestMethod` (PowerShell'da `curl` — bu `Invoke-WebRequest` taxallusi, oddiy curl emas) |
| **`npm run db:studio`** | Bazani ko'zdan kechirish — buyurtmadan keyin `stock` kamayganini ko'rish |

PowerShell namunasi:

```powershell
$body = @{ email = "ali@example.uz"; password = "user123" } | ConvertTo-Json
$auth = Invoke-RestMethod "http://localhost:4000/api/auth/login" -Method Post -ContentType "application/json" -Body $body
$h = @{ Authorization = "Bearer $($auth.accessToken)" }
Invoke-RestMethod "http://localhost:4000/api/cart" -Headers $h
```

CORS hamma domendan ochiq, shuning uchun frontend qaysi portda bo'lsa ham ishlaydi.

---

## Loyiha tuzilishi

```
prisma/
  schema.prisma          jadvallar va bog'lanishlar
  seed.js                namuna ma'lumot
src/
  server.js              kirish nuqtasi
  app.js                 middleware zanjiri — avval shuni o'qing
  docs.js                /api/docs javobi
  lib/
    prisma.js            bitta PrismaClient
    jwt.js               access (JWT) va refresh (bazada) tokenlar
    errors.js            ApiError — status + code bilan xato tashlash
    serialize.js         parolni yashirish, images'ni massivga aylantirish
    slug.js              nomdan slug yasash, takrorlanmasligini ta'minlash
  middleware/
    auth.js              token → req.user; requireAuth, requireAdmin
    validate.js          Zod bilan tekshirish → 422 + details
    chaos.js             kechikish va ataylab xatolar
    error.js             barcha xatolarni bitta shaklga keltiradi
  routes/                auth, product, category, cart, order, review, admin, upload
uploads/                 yuklangan rasmlar
```

### Bitta so'rovning yo'li

`GET /api/products?category=audio` qanday bajariladi:

```
server.js              portni ochadi
  └─ app.js            cors → json parser → morgan → /uploads static
      └─ chaos.js      kechikish va ataylab xatolar
          └─ routes/index.js
              └─ product.routes.js
                  ├─ validate(schema,'query')   Zod: page/limit/sort tekshiriladi
                  │                             xato bo'lsa → 422, handler'ga bormaydi
                  ├─ handler                    Prisma bilan bazadan oladi
                  └─ publicProduct()            images JSON satrini massivga aylantiradi
      └─ error.js      har qanday xato shu yerga tushadi → { message, code }
```

Himoyalangan endpointlarda `validate` dan oldin yana ikki bosqich bor:
`requireAuth` (token → `req.user`) va kerak bo'lsa `requireAdmin`.

### O'zini tekshirish uchun savollar

Kodni o'qib chiqqach shularga javob bera olsangiz — tushungansiz:

1. `POST /api/cart` javobida nega butun savat qaytadi, faqat qo'shilgan element emas?
2. Refresh token nega JWT emas, balki bazadagi tasodifiy satr?
3. `POST /api/orders` da ombor kamayishi va savat tozalanishi nega **bitta**
   `prisma.$transaction` ichida?
4. `OrderItem` da nega `title` va `price` takrorlangan — `productId` yetarli emasmi?
5. Login xato bo'lganda nega "email topilmadi" emas, "email yoki parol noto'g'ri" deyiladi?
6. `validate` middleware'i nega `req.query` ga yozmasdan `req.validatedQuery` ga yozadi?

Javoblarning ko'pi kod izohlarida.

---

## Sozlamalar

`.env` fayli (`.env.example` dan nusxa olinadi):

| O'zgaruvchi | Standart | Izoh |
| --- | --- | --- |
| `PORT` | `4000` | Server porti |
| `DATABASE_URL` | `file:./dev.db` | SQLite fayli |
| `CORS_ORIGIN` | `*` | Vergul bilan ro'yxat ham mumkin |
| `JWT_ACCESS_SECRET` | dev qiymat | **Ochiq serverda albatta almashtiring** |
| `JWT_REFRESH_SECRET` | dev qiymat | Xuddi shunday |
| `ACCESS_TOKEN_TTL` | `15m` | Refresh oqimini sinash uchun `45s` qiling |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | |
| `DELAY_MS` | `1000` | Har so'rovga kechikish |
| `CHAOS_RATE` | `0.15` | Ataylab xato ulushi (0..1) |

## Ma'lumotlar bazasi

SQLite — bitta fayl (`prisma/dev.db`), server yoki akkaunt kerak emas.

Seed'dan keyin: **7 kategoriya, 54 mahsulot, 5 foydalanuvchi**, tasodifiy sharhlar,
6 ta namuna buyurtma va bitta to'ldirilgan savat. Sharhlar va tavsiflar deterministik
generator bilan yasaladi — `db:reset` har safar bir xil taqsimotni qaytaradi
(`id` lar esa har safar yangi bo'ladi).

Rasmlar [picsum.photos](https://picsum.photos) dan olinadi, ya'ni internet kerak.

Jadvallar: `User`, `RefreshToken`, `Category`, `Product`, `CartItem`, `Order`,
`OrderItem`, `Review`. To'liq sxema — [`prisma/schema.prisma`](prisma/schema.prisma).

## Cheklovlar

Bu **o'quv loyihasi**. Ishlab chiqarishga chiqarishdan oldin bilib qo'ying:

- **SQLite fayl + local disk** — Vercel kabi serverless muhitda ishlamaydi.
  Kerak bo'lsa: baza → Postgres, rasmlar → S3/Cloudinary, host → uzluksiz konteyner
  (Render, Railway, Fly.io).
- **Sirlar `.env.example` da ochiq** — ochiq serverga chiqarishdan oldin almashtiring,
  aks holda istalgan odam o'ziga admin token yasay oladi.
- **Qiyinchilik rejimi yoqilgan** — demo ko'rsatishdan oldin `DELAY_MS=0` va
  `CHAOS_RATE=0` qiling.
- **Rate limiting, email tasdiqlash, to'lov, xavfsizlik sarlavhalari yo'q.**
- `POST /api/__chaos` **himoyalanmagan** — dev vositasi, ochiq serverda o'chiring.

## Foydali havolalar

- [API.md](API.md) — to'liq API ma'lumotnomasi
- [requests.http](requests.http) — sinash uchun tayyor so'rovlar
- [prisma/schema.prisma](prisma/schema.prisma) — ma'lumot modellari
- [Prisma hujjati](https://www.prisma.io/docs) · [Express 5](https://expressjs.com) · [Zod](https://zod.dev)
