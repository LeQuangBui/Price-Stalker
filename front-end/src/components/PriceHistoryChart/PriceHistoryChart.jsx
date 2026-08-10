import { useState, useEffect } from 'react'
import { getPriceHistory } from '../../api/products'
import { formatPrice } from '../../utils/formatters'
import {
  axisGutter,
  axisTicks,
  currencySymbol,
  dateLabels,
  dateLabelX,
  CAPTION_FONT_SIZE,
  DATE_FONT_SIZE,
  TICK_FONT_SIZE,
  TICK_GAP
} from './axisScale'
import './PriceHistoryChart.css'

const TIME_RANGES = [
  { value: '1d', label: '1 Day' },
  { value: '5d', label: '5 Days' },
  { value: '1m', label: '1 Month' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All' }
]

export default function PriceHistoryChart({ productId, currency }) {
  const [timeRange, setTimeRange] = useState('1d')
  const [priceHistory, setPriceHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)

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
  }, [productId, timeRange, reloadKey])

  const renderChart = () => {
    if (loading) return <div className="skeleton chart-skeleton" aria-hidden="true" />
    if (error) {
      return (
        <div className="chart-error">
          <span>{error}</span>
          <button type="button" className="retry-btn" onClick={() => setReloadKey((value) => value + 1)}>Retry</button>
        </div>
      )
    }
    if (!priceHistory || priceHistory.length === 0) {
      return <div className="chart-empty">No price history available</div>
    }

    const prices = priceHistory.map(h => h.price)
    const minPrice = Math.min(...prices)
    const maxPrice = Math.max(...prices)

    // The axis owns the domain, the tick labels and the width they need. Sizing the gutter from the
    // labels themselves is what keeps a 129.000.000 ₫ motorbike from running off the left edge the
    // way a hardcoded 60 units did. `low` and `high` are the snapped gridline bounds rather than the
    // data's own min and max, so the line has to be plotted against them or it would drift off its
    // own gridlines.
    const { low, high, ticks } = axisTicks(minPrice, maxPrice)
    const priceRange = high - low
    const unit = currencySymbol(currency)

    const chartHeight = 300
    const chartWidth = 800
    // The unit caption shares the ticks' right edge, so it is sized with them.
    const gutter = axisGutter([...ticks.map(tick => tick.label), unit])
    // Top padding leaves room for the unit caption to clear the highest tick.
    const padding = { top: 26, right: 20, bottom: 60, left: gutter }
    const innerWidth = chartWidth - padding.left - padding.right
    const innerHeight = chartHeight - padding.top - padding.bottom

    // role="img" makes the SVG opaque to assistive tech, so this sentence — not the gridlines — is
    // the entire chart for a screen reader. It quotes the data's own low, high and latest at full
    // precision: the ticks are abbreviated and the outer gridlines now sit a step beyond the data,
    // so this is the only place the exact figures appear.
    const rangeLabel = TIME_RANGES.find(range => range.value === timeRange)?.label ?? timeRange
    const description = `Price history over ${rangeLabel}. `
      + `Low ${formatPrice(minPrice, currency)}, `
      + `high ${formatPrice(maxPrice, currency)}, `
      + `latest ${formatPrice(prices[prices.length - 1], currency)}.`

    const points = priceHistory.map((h, i) => {
      const x = padding.left + (i / (priceHistory.length - 1 || 1)) * innerWidth
      const y = padding.top + innerHeight - ((h.price - low) / priceRange) * innerHeight
      return { x, y, price: h.price, recordedAt: h.recordedAt }
    })

    const pathData = points.map((p, i) =>
      `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`
    ).join(' ')

    // Roughly ten dates along the bottom, and their wording decided by the span those ten cover
    // and by the room the plot has for them — a three-day history viewed on "All" wrote "thg 1 26"
    // under every one of them when the range button chose the format, and a wording long enough to
    // tell them apart then ran them into each other. The gridlines the labels belong to go in with
    // them, because the two at the ends get clamped away from their own x and no longer have an
    // equal share of the plot to sit in.
    const dated = points.filter((point, i) =>
      priceHistory.length <= 10 || i % Math.ceil(priceHistory.length / 10) === 0)
    const dates = dateLabels(dated.map((point) => point.recordedAt), undefined, {
      xs: dated.map((point) => point.x),
      viewWidth: chartWidth,
      fontSize: DATE_FONT_SIZE
    })

    return (
      <svg
        className="price-chart"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={description}
      >
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={padding.left + innerWidth}
          y2={padding.top + innerHeight}
          className="chart-axis"
          strokeWidth="1"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + innerHeight}
          className="chart-axis"
          strokeWidth="1"
        />

        {unit && (
          <text
            x={padding.left - TICK_GAP}
            y={padding.top - 13}
            textAnchor="end"
            fontSize={CAPTION_FONT_SIZE}
            className="chart-label chart-unit"
          >
            {unit}
          </text>
        )}

        {ticks.map(({ ratio, value, label }) => {
          const y = padding.top + innerHeight - ratio * innerHeight
          return (
            <g key={value}>
              <line
                x1={padding.left}
                x2={padding.left + innerWidth}
                y1={y}
                y2={y}
                className="chart-grid"
                strokeWidth="1"
              />
              <text
                x={padding.left - TICK_GAP}
                y={y + 4}
                textAnchor="end"
                fontSize={TICK_FONT_SIZE}
                className="chart-label chart-tick"
              >
                {label}
              </text>
            </g>
          )
        })}

        <path
          d={pathData}
          fill="none"
          className="chart-line"
          strokeWidth="2"
        />

        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            className="chart-point"
          >
            <title>{`${formatPrice(p.price, currency)} - ${new Date(p.recordedAt).toLocaleString()}`}</title>
          </circle>
        ))}

        {/* The last date sits 20 units from the right edge, so a label wider than 40 units ran past
            the viewBox and lost its tail. dateLabelX slides it back in by the overhang alone, which
            keeps it as close to its own gridline as the edge allows. */}
        {dated.map((p, i) => (
          <text
            key={`date-${p.x}`}
            x={dateLabelX(p.x, dates[i], chartWidth)}
            y={padding.top + innerHeight + 20}
            textAnchor="middle"
            fontSize={DATE_FONT_SIZE}
            className="chart-label chart-date"
          >
            {dates[i]}
          </text>
        ))}
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

