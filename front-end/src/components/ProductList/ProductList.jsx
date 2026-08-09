import { Link } from 'react-router-dom'
import EmptyState from '../primitives/EmptyState'
import PriceDisplay from '../primitives/PriceDisplay'
import { getPrimaryImage, getTrackedPrice, hasFlashSalePrice, hasOriginalPrice } from '../../utils/formatters'

// Mobile-up: two columns from 360px, matching how Vietnamese storefronts lay out a phone.
// The second column is gated on the price fitting, not on a stock breakpoint. The card is
// `overflow-hidden` and a formatted price contains a non-breaking space, so a price too wide
// for its column is sliced with no ellipsis and no scrollbar. At 320px the card interior is
// 77px, under the narrowest step on the type scale, so 320 keeps its single column; 360 clears
// it, which is why the break sits there rather than at `sm:` (640px, four phone widths late).
export const PRODUCT_GRID =
  'grid grid-cols-1 gap-[18px] min-[360px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

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
