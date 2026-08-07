import { Link } from 'react-router-dom'
import {
  formatPrice,
  getPrimaryImage,
  getTrackedPrice,
  hasFlashSalePrice,
  hasOriginalPrice
} from '../../utils/formatters'
import './ProductList.css'

export default function ProductList({ products }) {
  if (products.length === 0) {
    return <p className="no-products">No products found.</p>
  }

  return (
    <div className="product-grid">
      {products.map((product) => {
        const primaryImage = getPrimaryImage(product)
        const trackedPrice = getTrackedPrice(product)
        const showFlash = hasFlashSalePrice(product)
        const showOriginal = hasOriginalPrice(product)

        return (
          <Link
            key={product.id}
            to={`/products/${product.id}`}
            className="product-card group"
          >
            <div className="product-image-container">
              {primaryImage ? (
                <img
                  src={primaryImage}
                  alt={product.name}
                  className="product-image"
                />
              ) : (
                <span className="no-image">No image</span>
              )}
            </div>
            <div className="product-info">
              <span className="product-name group-hover:text-[var(--primary)]" title={product.name}>
                {product.name}
              </span>
              <div className="product-price">
                <span className={showFlash ? 'product-price-flash' : 'product-price-current'}>
                  {formatPrice(trackedPrice, product.currency)}
                </span>
                {showFlash && product.price !== null && product.price !== undefined && (
                  <span className="product-price-original">
                    {formatPrice(product.price, product.currency)}
                  </span>
                )}
                {!showFlash && showOriginal && (
                  <span className="product-price-original">
                    {formatPrice(product.originalPrice, product.currency)}
                  </span>
                )}
              </div>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
