import { useState, useEffect } from 'react'
import { getPriceHistory } from '../../api/products'
import './PriceHistoryChart.css'

const TIME_RANGES = [
  { value: '1d', label: '1 Day' },
  { value: '5d', label: '5 Days' },
  { value: '1m', label: '1 Month' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All' }
]

export default function PriceHistoryChart({ productId }) {
  const [timeRange, setTimeRange] = useState('1d')
  const [priceHistory, setPriceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const fetchPriceHistory = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getPriceHistory(productId, timeRange)
        setPriceHistory(data)
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchPriceHistory()
  }, [productId, timeRange])

  const formatPrice = (price) =>
    price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')

  const formatDate = (dateString, range) => {
    const date = new Date(dateString)

    switch (range) {
      case '1d':
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
      case '5d':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' })
      case '1m':
      case '6m':
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      case '1y':
      case 'all':
        return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
      default:
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }
  }

  const renderChart = () => {
    if (loading) return <div className="chart-loading">Loading chart...</div>
    if (error) return <div className="chart-error">{error}</div>
    if (!priceHistory || priceHistory.length === 0) {
      return <div className="chart-empty">No price history available</div>
    }

    const prices = priceHistory.map(h => h.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)
    const priceRange = maxPrice - minPrice || 1

    const chartHeight = 300
    const chartWidth = 800
    const padding = { top: 20, right: 20, bottom: 60, left: 60 }
    const innerWidth = chartWidth - padding.left - padding.right
    const innerHeight = chartHeight - padding.top - padding.bottom

    const points = priceHistory.map((h, i) => {
      const x = padding.left + (i / (priceHistory.length - 1 || 1)) * innerWidth
      const y = padding.top + innerHeight - ((h.price - minPrice) / priceRange) * innerHeight
      return { x, y, price: h.price, recordedAt: h.recordedAt }
    })

    const pathData = points.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ')

    return (
      <svg className="price-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={padding.left + innerWidth}
          y2={padding.top + innerHeight}
          stroke="#ccc"
          strokeWidth="1"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + innerHeight}
          stroke="#ccc"
          strokeWidth="1"
        />

        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const price = minPrice + priceRange * ratio
          const y = padding.top + innerHeight - ratio * innerHeight
          return (
            <g key={ratio}>
              <line
                x1={padding.left}
                x2={padding.left + innerWidth}
                y1={y}
                y2={y}
                stroke="#f0f0f0"
                strokeWidth="1"
              />
              <text
                x={padding.left - 10}
                y={y + 4}
                textAnchor="end"
                fontSize="12"
                fill="#666"
              >
                {formatPrice(Math.round(price))}
              </text>
            </g>
          )
        })}

        <path
          d={pathData}
          fill="none"
          stroke="#2e7d32"
          strokeWidth="2"
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            fill="#2e7d32"
            className="chart-point"
          >
            <title>{`${formatPrice(p.price)} - ${new Date(p.recordedAt).toLocaleString()}`}</title>
          </circle>
        ))}

        {points.map((p, i) => {
          const showLabel = priceHistory.length <= 10 || i % Math.ceil(priceHistory.length / 10) === 0
          if (!showLabel) return null

          return (
            <text
              key={`label-${i}`}
              x={p.x}
              y={padding.top + innerHeight + 20}
              textAnchor="middle"
              fontSize="11"
              fill="#666"
            >
              {formatDate(p.recordedAt, timeRange)}
            </text>
          )
        })}
      </svg>
    )
  }

  return (
    <div className="price-history-chart">
      <div className="chart-header">
        <h3>Price History</h3>
        <div className="time-range-selector">
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={timeRange === range.value ? 'active' : ''}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div className="chart-container">
        {renderChart()}
      </div>
    </div>
  )
}

