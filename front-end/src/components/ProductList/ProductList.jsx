import { Link } from 'react-router-dom'
import './ProductList.css'

export default function ProductList({ products }) {
  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  }

  if (products.length === 0) {
    return <p className="no-products">No products found.</p>
  }

  return (
    <div className="product-grid">
      {products.map(product => (
        <Link key={product.id} to={`/products/${product.id}`} className="product-card">
          <div className="product-image-container">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="product-image"
              />
            ) : (
              <span className="no-image">No image</span>
            )}
          </div>
          <div className="product-info">
            <span className="product-name" title={product.name}>
              {product.name}
            </span>
            <div className="product-price">
              {formatPrice(product.currentPrice)}{product.currency}
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
