import { Link } from 'react-router-dom'
import EmptyState from '../primitives/EmptyState'
import PriceDisplay from '../primitives/PriceDisplay'
import { getPrimaryImage, getTrackedPrice, hasFlashSalePrice, hasOriginalPrice } from '../../utils/formatters'

// Mobile-up: two columns from 22.5rem, matching how Vietnamese storefronts lay out a phone.
// The second column is gated on the price fitting, not on a stock breakpoint. The card is
// `overflow-hidden` and a formatted price contains a no-break space, so a price too wide for its
// column is sliced with no ellipsis and no scrollbar. A second column at 320px would leave a 77px
// interior, under the narrowest step on the type scale — an 8-digit price is 99px at 16px — so 320
// keeps its single column; 22.5rem clears it, which is why the break sits there rather than at
// `sm:` (640px, four phone widths late).
//
// 22.5rem MUST stay identical to the price's first step-down in PriceDisplay — see
// CARD_PRICE_SIZE, which carries the same warning. Two columns at a width where the price has
// not yet stepped down is a band of sliced prices. One decision, two files, one number; a test
// asserts they match.
//
// rem rather than the 360px it reads as at default settings: the gutters, the card padding and
// the price are all rem and grow when a reader raises the browser's default font size, and a px
// breakpoint would hand the second column the same viewport width with less room inside it.
export const PRODUCT_GRID =
  'grid grid-cols-1 gap-[18px] min-[22.5rem]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

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
              {/*
                Two lines, not one truncated one. A single `truncate` line in a two-up column left
                about ten characters of a forty-five character name, and on a tracker watching one
                specific SKU that cannot tell an iPhone 15 from an iPhone 15 Pro Max. The clamp
                roughly doubles what survives, and every storefront this grid is modelled on —
                Shopee, Lazada, Tiki — clamps the name at two lines here.

                `min-h-[2.75em]` reserves both lines whether or not the name needs them, so the
                price sits at one height across a row instead of riding up on the short names.
                2.75em is `leading-snug` (1.375) twice over, in em so it holds at both type sizes
                without a second number to keep in sync. Not the `lh` unit, which would say the
                same thing more directly but is too recent for this project's Safari floor.
              */}
              <span
                className="mb-2.5 line-clamp-2 min-h-[2.75em] text-[13px] font-semibold leading-snug text-ink transition-colors group-hover:text-oxblood sm:text-[15px]"
                title={product.name}
              >
                {product.name}
              </span>
              <PriceDisplay value={getTrackedPrice(product)} currency={product.currency} was={was} size="sm" reserveWas />
            </div>
          </Link>
        )
      })}
    </div>
  )
}
