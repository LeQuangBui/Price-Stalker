import { useState, useEffect } from 'react'
import { getPriceHistory } from '../../api/products'
import { formatPrice } from '../../utils/formatters'
import { cx } from '../../lib/cx'
import EmptyState from '../primitives/EmptyState'
import ErrorState from '../primitives/ErrorState'
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

const TIME_RANGES = [
  { value: '1d', label: '1 Day' },
  { value: '5d', label: '5 Days' },
  { value: '1m', label: '1 Month' },
  { value: '6m', label: '6 Months' },
  { value: '1y', label: '1 Year' },
  { value: 'all', label: 'All' }
]

// One geometry for all six range buttons. `min-h-11`: "1 Year" and "All" measured 126×35.19 under
// the retired CSS — the other four cleared 44px only by wrapping to two lines. `text-xs` at every
// width: the retired file wrote 13px, dropping to 12 under 768, and 13 has no rem step — the
// compact-control precedent is 12 throughout. Bare `transition`, not `transition-colors`: the
// active state carries a box-shadow and all three of background, color and shadow animate.
// `cursor-pointer` because preflight sets no button cursor. `flex-1 md:flex-none` is the retired
// 768px block inverted mobile-first — both states on the same `md:` swap, like `px-3 md:px-4`.
const RANGE_BTN = 'min-h-11 flex-1 cursor-pointer rounded-[var(--radius-sm)] px-3 py-2 text-xs font-semibold transition duration-200 md:flex-none md:px-4'

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
    if (loading) return <div className="skeleton h-[300px] rounded-[var(--radius)]" aria-hidden="true" />
    if (error) {
      return <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
    }
    if (!priceHistory || priceHistory.length === 0) {
      return <EmptyState title="No price history available" />
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

    // `chart-tick`, `chart-unit` and `chart-date` below are deliberate no-rule markers, recorded
    // as such in classname.guard: the tests select each text role by the thing it means rather
    // than by font size. The paint the retired classes carried rides each element as a utility.
    return (
      <svg
        className="mx-auto block h-auto w-full max-w-full"
        viewBox={`0 0 ${chartWidth} ${chartHeight}`}
        role="img"
        aria-label={description}
      >
        <line
          x1={padding.left}
          y1={padding.top + innerHeight}
          x2={padding.left + innerWidth}
          y2={padding.top + innerHeight}
          className="stroke-line"
          strokeWidth="1"
        />
        <line
          x1={padding.left}
          y1={padding.top}
          x2={padding.left}
          y2={padding.top + innerHeight}
          className="stroke-line"
          strokeWidth="1"
        />

        {unit && (
          <text
            x={padding.left - TICK_GAP}
            y={padding.top - 13}
            textAnchor="end"
            fontSize={CAPTION_FONT_SIZE}
            className="chart-unit fill-ink-soft"
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
                className="stroke-line-soft"
                strokeWidth="1"
              />
              <text
                x={padding.left - TICK_GAP}
                y={y + 4}
                textAnchor="end"
                fontSize={TICK_FONT_SIZE}
                className="chart-tick fill-ink-soft"
              >
                {label}
              </text>
            </g>
          )
        })}

        <path
          d={pathData}
          fill="none"
          className="stroke-oxblood"
          strokeWidth="2"
        />

        {/* `r` is an SVG2 presentation property, so the grow-on-hover is CSS: Tailwind has no `r`
            utility, hence both halves in arbitrary form — `[transition:r_.2s]` and `hover:[r:6]`,
            the retired rule verbatim. */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r="4"
            className="cursor-pointer fill-oxblood [transition:r_.2s] hover:[r:6]"
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
            className="chart-date fill-ink-soft"
          >
            {dates[i]}
          </text>
        ))}
      </svg>
    )
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-paper p-5 shadow-[var(--shadow-sm)] md:p-8">
      <div className="mb-7 flex flex-col flex-wrap items-start gap-4 md:flex-row md:items-center md:justify-between">
        <h3 className="m-0 text-2xl font-bold text-ink">Price History</h3>
        <div className="flex w-full flex-wrap justify-between gap-2 rounded-[var(--radius-sm)] bg-ground p-1 md:w-auto md:justify-normal">
          {TIME_RANGES.map(range => (
            <button
              key={range.value}
              onClick={() => setTimeRange(range.value)}
              className={cx(
                RANGE_BTN,
                timeRange === range.value
                  ? 'bg-oxblood text-white shadow-[var(--shadow-sm)]'
                  : 'bg-transparent text-ink-soft hover:bg-tertiary hover:text-ink'
              )}
            >
              {range.label}
            </button>
          ))}
        </div>
      </div>
      <div className="w-full overflow-x-auto py-4">
        {renderChart()}
      </div>
    </div>
  )
}
