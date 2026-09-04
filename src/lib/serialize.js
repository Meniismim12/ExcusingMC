/** Parolni hech qachon javobga qo'shmaymiz. */
export function publicUser(user) {
  if (!user) return null
  const { password, ...rest } = user
  return rest
}

/** SQLite'da `images` JSON satr — tashqariga massiv bo'lib chiqadi. */
export function publicProduct(product) {
  if (!product) return null
  let images = []
  try {
    images = JSON.parse(product.images ?? '[]')
  } catch {
    images = []
  }
  return { ...product, images }
}

export function publicProducts(products) {
  return products.map(publicProduct)
}
