# Example Shop API

Frontend mashq qilish uchun yozilgan mini online do'kon backendi.
**Express 5 + Prisma + SQLite + JWT.**

📘 **To'liq API ma'lumotnomasi: [API.md](API.md)** — endpointlar, query parametrlar,
JSON namunalar, xato kodlari. Frontend yozayotganda faqat shu fayl kerak bo'ladi.

## Ishga tushirish

```bash
npm install
npm run db:push
npm run db:seed
npm run dev
```

`http://localhost:4000` · endpointlar ro'yxati: `http://localhost:4000/api/docs`

### Test akkauntlar

| Rol   | Email              | Parol      |
| ----- | ------------------ | ---------- |
| Admin | `admin@example.uz` | `admin123` |
| User  | `ali@example.uz`   | `user123`  |

Yana: `dilnoza@`, `sardor@`, `malika@example.uz` — parol `user123`.

### Skriptlar

| Buyruq              | Vazifasi                                    |
| ------------------- | ------------------------------------------- |
| `npm run dev`       | Avtomatik qayta yuklanadigan server         |
| `npm run db:push`   | Sxemani bazaga qo'llaydi + Prisma client    |
| `npm run db:seed`   | Namuna ma'lumot (7 kategoriya, 54 mahsulot) |
| `npm run db:reset`  | Bazani tozalab qaytadan seed qiladi         |
| `npm run db:studio` | Bazani brauzerda ko'rish                    |

## ⚠️ Server ataylab sekin va ishonchsiz

Standart holatda **har bir so'rov 1 soniya kechikadi** va **15% so'rov 500 qaytaradi**.

Bu xato emas — maqsadli. Localhost 3 ms da javob bersa va hech qachon yiqilmasa,
loading skeleton, error state va retry tugmasi yozilmay qolib ketadi.

Tez o'chirish kerak bo'lsa:

```bash
curl -X POST http://localhost:4000/api/__chaos -H "Content-Type: application/json" -d "{\"delayMs\":0,\"failRate\":0}"
```

Bitta so'rovga: `?__delay=0` · `?__fail=500` · `?__fail=401` · `?__fail=timeout`.
Batafsil: [API.md → Qiyinchilik rejimi](API.md#qiyinchilik-rejimi).

## Kodni tushunish

Bu backend sizga qora quti bo'lib qolmasligi kerak. Quyida so'rov qayerdan qayerga borishi.

### Bitta so'rovning yo'li

`GET /api/products?category=audio` qanday bajariladi:

```
src/server.js          portni ochadi
  └─ src/app.js        cors → json parser → morgan → /uploads static
      └─ chaos.js      kechikish va ataylab xatolar (middleware/)
          └─ routes/index.js        /api ostidagi barcha routerlar
              └─ product.routes.js
                  ├─ validate(schema,'query')   zod: page/limit/sort tekshiriladi
                  │                             xato bo'lsa → 422, keyingisiga o'tmaydi
                  ├─ handler                    prisma bilan bazadan oladi
                  └─ publicProduct()            images JSON satrini massivga aylantiradi
      └─ error.js      har qanday xato shu yerga tushadi → { message, code }
```

Himoyalangan endpointlarda `validate` dan oldin yana ikkita bosqich bor:
`requireAuth` (token → `req.user`) va kerak bo'lsa `requireAdmin`.

### Nima qayerda

| Fayl / papka                | Javobgarligi                                            |
| --------------------------- | ------------------------------------------------------- |
| `prisma/schema.prisma`      | Jadvallar va ular orasidagi bog'lanishlar               |
| `prisma/seed.js`            | Namuna ma'lumot                                          |
| `src/app.js`                | Middleware zanjiri — **avval shuni o'qing**             |
| `src/routes/`               | Har bir resurs uchun bitta fayl                          |
| `src/middleware/auth.js`    | Token → `req.user`; `requireAuth`, `requireAdmin`       |
| `src/middleware/validate.js`| Zod sxemasi bilan tekshirish, 422 + `details`           |
| `src/middleware/error.js`   | Barcha xatolarni bitta shaklga keltiradi                |
| `src/middleware/chaos.js`   | Kechikish va ataylab xatolar                             |
| `src/lib/jwt.js`            | Access token (JWT) va refresh token (bazada) mantig'i   |
| `src/lib/errors.js`         | `ApiError` — status + `code` bilan xato tashlash        |
| `src/lib/serialize.js`      | Parolni yashirish, `images` ni massivga aylantirish     |

### O'zingizni tekshirish uchun savollar

Kodni o'qib chiqqach shularga javob bera olsangiz — tushungansiz:

1. `POST /api/cart` javobida nega butun savat qaytadi, faqat qo'shilgan element emas?
2. Refresh token nega JWT emas, balki bazadagi tasodifiy satr?
3. `POST /api/orders` da ombor kamayishi va savat tozalanishi nega **bitta**
   `prisma.$transaction` ichida?
4. Buyurtma elementida (`OrderItem`) nega `title` va `price` takrorlangan, `productId`
   yetarli emasmi?
5. Login xato bo'lganda nega "email topilmadi" emas, "email yoki parol noto'g'ri" deyiladi?
6. `validate` middleware'i nega `req.query` ga yozmasdan `req.validatedQuery` ga yozadi?

Javoblarning ko'pi kod izohlarida bor. Topolmasangiz — so'rang.

## Frontend uchun eslatmalar

Narxlar butun son, so'mda:

```js
new Intl.NumberFormat('uz-UZ').format(3100000) + " so'm" // 3 100 000 so'm
```

Auth oqimi: `login` → `accessToken` (15 daq) + `refreshToken` saqlanadi →
har so'rovga `Authorization: Bearer ...` → `401 TOKEN_EXPIRED` kelsa `/auth/refresh` →
yangi tokenlarni saqlab, asl so'rovni qaytarish.

⚠️ Refresh **rotation** bilan: eski refresh token darhol o'ladi, javobdagi yangisini
saqlamasangiz keyingi refresh 401 beradi.

Batafsil: [API.md → Auth](API.md#auth).
