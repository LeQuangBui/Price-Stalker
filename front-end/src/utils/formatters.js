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
      // đồng is pinned to vi-VN rather than left on the reader's browser language. Two reasons,
      // and the second one is the load-bearing one. A Vietnamese price tracker should render
      // Vietnamese currency the Vietnamese way whatever language the phone is set to; and the
      // string then has ONE width. Left on the ambient locale the same value is `12.900.000 ₫`
      // in vi-VN but `VND 12,900,000` in en-AU — four characters wider — and the product card is
      // overflow-hidden around a string with no break opportunity in it (Intl puts a no-break
      // space before the ₫), so the overflow is sliced off the end of the number with no ellipsis
      // and no scrollbar. Every column width behind the two-up grid is measured against the
      // vi-VN string, so the grid only holds if that is the string everyone gets.
      //
      // Other currencies deliberately keep the ambient locale — nobody should read US dollars in
      // Vietnamese grouping. Their rendered width is therefore NOT guaranteed and the grid makes
      // no promise about them.
      const locale = currency === 'VND' ? 'vi-VN' : undefined
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(numeric)
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
