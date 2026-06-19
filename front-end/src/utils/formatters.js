export function formatPrice(value) {
  if (value === null || value === undefined || value === '') {
    return 'N/A'
  }

  const numeric = Number(value)
  if (Number.isFinite(numeric)) {
    return numeric.toLocaleString('en-US')
  }

  return String(value)
}

export function formatDate(value, options = {}) {
  if (!value) {
    return 'N/A'
  }

  return new Date(value).toLocaleDateString('en-US', options)
}

export function formatDateTime(value, options = {}) {
  if (!value) {
    return 'N/A'
  }

  return new Date(value).toLocaleString('en-US', options)
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

  if (product.price !== null && product.price !== undefined) {
    return product.price
  }

  return product.originalPrice ?? null
}
