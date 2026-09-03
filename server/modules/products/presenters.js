export function publicProduct(product) { return { ...product, id: product.id, name: product.name, priceCents: Number(product.price_cents ?? product.priceCents ?? 0), stock: Number(product.stock_quantity ?? product.stock ?? 0) }; }
export function publicProductListItem(product) { return publicProduct(product); }
export function publicUpload(upload) { return { ...upload, id: upload.id, url: upload.url || "" }; }
export function mediaFromUpload(upload) { return publicUpload(upload); }
export function publicCategory(category) { return { ...category, id: category.id, name: category.name }; }
