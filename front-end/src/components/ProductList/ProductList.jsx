import { Link } from 'react-router-dom'
import EmptyState from '../primitives/EmptyState'
import PriceDisplay from '../primitives/PriceDisplay'
import { getPrimaryImage, getTrackedPrice, hasFlashSalePrice, hasOriginalPrice } from '../../utils/formatters'

// Mobile-up: one column on phones, widening with the viewport. The old
// `repeat(auto-fill, minmax(230px, 1fr))` needed 478px of content for two columns, so a 390px
// phone only ever got one — explicit column counts make the phone case deliberate.
export const PRODUCT_GRID = 'grid grid-cols-1 gap-[18px] sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

const CARD = [
  'group block overflow-hidden rounded-2xl border border-line bg-surface',
  'text-inherit no-underline shadow-[var(--shadow-sm)] transition',
  'hover:-translate-y-0.5 hover:shadow-[var(--shadow-lg)]',
  'hover:border-[color-mix(in_srgb,var(--primary)_42%,var(--border))]',
].join(' ')

export default function ProductList({ products }) {
  if (products.length === 0) {
    return <EmptyState title="No products found." />
  }

  return (
    <div className={PRODUCT_GRID}>
      {products.map((product) => {
        const primaryImage = getPrimaryImage(product)
        const showFlash = hasFlashSalePrice(product)
        const was = showFlash ? product.price : hasOriginalPrice(product) ? product.originalPrice : null

        return (
          <Link key={product.id} to={`/products/${product.id}`} className={CARD}>
            <div className="flex aspect-[1.15] w-full items-center justify-center overflow-hidden bg-tertiary">
              {primaryImage ? (
                <img src={primaryImage} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm text-ink-mute">No image</span>
              )}
            </div>
            <div className="p-4 pb-[18px]">
              <span
                className="mb-2.5 block truncate text-[15px] font-semibold text-ink transition-colors group-hover:text-oxblood"
                title={product.name}
              >
                {product.name}
              </span>
              <PriceDisplay value={getTrackedPrice(product)} currency={product.currency} was={was} size="sm" />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
