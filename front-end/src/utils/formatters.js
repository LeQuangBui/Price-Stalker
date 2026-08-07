export function formatPrice(value, currency) {
  if (value === null || value === undefined || value === '') {
    return '—'
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return String(value)
  }

  if (currency) {
    try {
      return new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(numeric)
    } catch {
      // Unknown currency code — fall through to plain number formatting.
    }
  }

  return numeric.toLocaleString(undefined)
}

export function formatDate(value, options = {}) {
  if (!value) {
    return 'N/A'
  }

  return new Date(value).toLocaleDateString(undefined, options)
}

export function formatDateTime(value, options = {}) {
  if (!value) {
    return 'N/A'
  }

  return new Date(value).toLocaleString(undefined, options)
}

export function getPrimaryImage(product) {
  return product?.images?.[0] || null
}

export function hasFlashSalePrice(product) {
  return product?.flash_sale_price !== null
    && product?.flash_sale_price !== undefined
    && Number(product.flash_sale_price) > 0
}

export function hasOriginalPrice(product) {
  return product?.originalPrice !== null
    && product?.originalPrice !== undefined
    && Number(product.originalPrice) > 0
    && String(product.originalPrice) !== String(product.price)
}

export function getTrackedPrice(product) {
  if (!product) {
    return null
  }

  if (hasFlashSalePrice(product)) {
    return product.flash_sale_price
  }

  // A stored 0 (out-of-stock / parse glitch) is not a real price — fall through rather than render
  // "$0" and a fake ~100% drop badge. Mirrors the >0 guard in hasFlashSalePrice/hasOriginalPrice.
  if (product.price !== null && product.price !== undefined && Number(product.price) > 0) {
    return product.price
  }

  if (product.originalPrice !== null && product.originalPrice !== undefined && Number(product.originalPrice) > 0) {
    return product.originalPrice
  }

  return null
}
