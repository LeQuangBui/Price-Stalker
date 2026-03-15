import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { getProduct } from '../../api/products'
import AddToBookmark from '../../components/AddToBookmark/AddToBookmark'
import PriceHistoryChart from '../../components/PriceHistoryChart/PriceHistoryChart'
import './ProductDetail.css'

export default function ProductDetail({ isSignedIn }) {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [selectedImage, setSelectedImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const formatPrice = (price) =>
    price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const data = await getProduct(id)
        setProduct(data)
      } catch (err) {
        setError(err.message)
        if (err.message.includes('401') || err.message.includes('Unauthorized')) {
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchProduct()
  }, [id, navigate])

  if (loading) {
    return <div className="product-detail-container">Loading...</div>
  }

  if (error) {
    return <div className="product-detail-container error">{error}</div>
  }

  if (!product) {
    return <div className="product-detail-container">Product not found</div>
  }

  return (
    <div className="product-detail-container">
      <Link to="/" className="back-link">← Back to products</Link>

      <div className="product-detail">
        <div className="product-images">
          {product.images && product.images.length > 0 ? (
            <>
              <div className="main-image">
                <img src={product.images[selectedImage]} alt={product.name} />
              </div>
              {product.images.length > 1 && (
                <div className="image-thumbnails">
                  {product.images.map((img, index) => (
                    <img
                      key={index}
                      src={img}
                      alt={`${product.name} ${index + 1}`}
                      className={selectedImage === index ? 'active' : ''}
                      onClick={() => setSelectedImage(index)}
                    />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="no-image">No image available</div>
          )}
        </div>

        <div className="product-info">
          <h1>{product.name}</h1>

          <div className="product-price">
            <span className="price-amount">
              {formatPrice(product.currentPrice)} {product.currency}
            </span>
          </div>

          <div className="product-meta">
            <div className="meta-item">
              <span className="meta-label">Added:</span>
              <span className="meta-value">
                {new Date(product.createdAt).toLocaleDateString()}
              </span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Last updated:</span>
              <span className="meta-value">
                {new Date(product.updatedAt).toLocaleDateString()}
              </span>
            </div>
          </div>

          <a
            href={product.url}
            target="_blank"
            rel="noopener noreferrer"
            className="view-product-btn"
          >
            View on website →
          </a>

          {isSignedIn && <AddToBookmark productId={product.id} />}
        </div>
      </div>

      <PriceHistoryChart productId={product.id} />
    </div>
  )
}

