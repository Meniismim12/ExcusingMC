const MAP = { ъ: '', ь: '', ' ': '-', "'": '', '’': '', '`': '' }

export function slugify(text) {
  return String(text)
    .toLowerCase()
    .trim()
    .replace(/[ъь'’`]/g, (c) => MAP[c] ?? '')
    .replace(/[^a-z0-9\u0400-\u04FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

/** Bir xil slug bo'lsa -2, -3 ... qo'shadi. */
export async function uniqueSlug(model, base, ignoreId = null) {
  let slug = slugify(base) || 'item'
  let i = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const found = await model.findUnique({ where: { slug } })
    if (!found || found.id === ignoreId) return slug
    i += 1
    slug = `${slugify(base)}-${i}`
  }
}
