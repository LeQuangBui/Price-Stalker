import { useState, useEffect, useRef } from 'react'
import { getPriceHistory } from '../../api/products'
import { formatPrice } from '../../utils/formatters'
import { cx } from '../../lib/cx'
import EmptyState from '../primitives/EmptyState'
import ErrorState from '../primitives/ErrorState'
import {
  axisGutter,
  axisTicks,
  currencySymbol,
  datedIndices,
  dateLabels,
  dateLabelX,
  CAPTION_FONT_SIZE,
  DATE_FONT_SIZE,
  TICK_FONT_SIZE,
  TICK_GAP
} from './axisScale'
import { scrubIndex, tooltipBox, tooltipPlacement, TOOLTIP_PAD_X } from './scrub'

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
  // The viewBox width. 800 until the container has been measured, so the first paint and any
  // environment with no layout engine get the geometry this chart has always had; once the
  // ResizeObserver reports, user units become CSS pixels and 12px text renders at 12px on every
  // device — a fixed 800 scaled to a 320px phone painted the same text at ~4.5px.
  const [width, setWidth] = useState(800)
  const containerRef = useRef(null)
  // The index of the reading under the pointer, or null. Held as an index rather than a point so
  // a re-render from a resize keeps the scrub on the same reading.
  const [scrub, setScrub] = useState(null)

  useEffect(() => {
    const node = containerRef.current
    if (!node) return undefined

    // Whole units only: a phone mid-rotation reports fractional widths, and re-laying the axis
    // out over sub-pixel churn buys nothing. Zero means "not laid out yet" — keep what we have.
    const measure = (measured) => {
      const next = Math.round(measured)
      if (next > 0) setWidth(next)
    }

    measure(node.getBoundingClientRect().width)
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) measure(entry.contentRect.width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const fetchPriceHistory = async () => {
      setLoading(true)
      setError('')
      // A scrub index is only meaningful against the series it was read from.
      setScrub(null)
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

    // Height holds 300 CSS px at every width — a portrait phone gives the plot more relative
    // room, which is the right trade for a price line. Width is whatever the container measured.
    const chartHeight = 300
    const chartWidth = width
    // The unit caption shares the ticks' right edge, so it is sized with them.
    const gutter = axisGutter([...ticks.map(tick => tick.label), unit])
    // Top padding leaves room for the unit caption to clear the highest tick.
    const padding = { top: 26, right: 20, bottom: 60, left: gutter }
    // Floored at one unit: a pathological container narrower than the gutter plus the right
    // padding would send this negative, which collapses every point onto one x (duplicate React
    // keys) and zeroes the scrub step. Unreachable at any real viewport on this page — the guard
    // is for the next page that embeds the chart somewhere smaller.
    const innerWidth = Math.max(1, chartWidth - padding.left - padding.right)
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

    // How many readings get a date comes from the room the plot really has — ten at full width,
    // three or four in what a 320px phone leaves — and their wording is decided by the span those
    // readings cover and by that same room: a three-day history viewed on "All" wrote "thg 1 26"
    // under every one of them when the range button chose the format, and a wording long enough to
    // tell them apart then ran them into each other. The gridlines the labels belong to go in with
    // them, because the two at the ends get clamped away from their own x and no longer have an
    // equal share of the plot to sit in.
    const dated = datedIndices(priceHistory.length, innerWidth).map((i) => points[i])
    const dates = dateLabels(dated.map((point) => point.recordedAt), undefined, {
      xs: dated.map((point) => point.x),
      viewWidth: chartWidth,
      fontSize: DATE_FONT_SIZE
    })

    // The scrub. One transparent surface over the plot answers mouse and finger alike through
    // pointer events; the nearest reading by x gets the crosshair, the grown point and the
    // tooltip. clientX crosses into user units through the SVG's own on-screen box — with the
    // viewBox at the measured width the ratio is ~1, but the chart can be mid-resize.
    const active = scrub === null ? null : Math.min(scrub, points.length - 1)
    const scrubTo = (event) => {
      const rect = event.currentTarget.ownerSVGElement.getBoundingClientRect()
      if (!rect.width) return
      const x = ((event.clientX - rect.left) / rect.width) * chartWidth
      setScrub(scrubIndex(x, padding.left, innerWidth, points.length))
    }
    const clearScrub = () => setScrub(null)

    // Sized against the same width oracle as every label, placed by the flip-and-clamp that
    // keeps every digit inside the viewBox. The instant line is the wording the per-point
    // <title> used to carry.
    let tooltip = null
    if (active !== null) {
      const point = points[active]
      const priceLabel = formatPrice(point.price, currency)
      const dateLabel = new Date(point.recordedAt).toLocaleString()
      const box = tooltipBox(priceLabel, dateLabel)
      const { left, top } = tooltipPlacement(point.x, point.y, box, chartWidth, chartHeight)
      tooltip = { priceLabel, dateLabel, box, left, top }
    }

    // `chart-tick`, `chart-unit` and `chart-date` below are deliberate no-rule markers, recorded
    // as such in classname.guard: the tests select each text role by the thing it means rather
    // than by font size. The paint the retired classes carried rides each element as a utility.
    // touch-pan-y rides the SVG root, not the pointer surface: Chrome ignores touch-action on
    // inner SVG elements when it decides who owns a drag, and answered a horizontal scrub over
    // the rect with pointercancel — measured over CDP, ten identical drags, two pointermoves
    // then the cancel. On the root it splits exactly as intended: horizontal drags scrub,
    // vertical drags scroll the page.
    return (
      <svg
        className="mx-auto block h-auto w-full max-w-full touch-pan-y"
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

        {/* The crosshair goes in under the line and the points: it is a gridline the scrub
            summons, not data ink. */}
        {active !== null && (
          <line
            x1={points[active].x}
            x2={points[active].x}
            y1={padding.top}
            y2={padding.top + innerHeight}
            className="stroke-line"
            strokeWidth="1"
          />
        )}

        <path
          d={pathData}
          fill="none"
          className="stroke-oxblood"
          strokeWidth="2"
        />

        {/* The scrubbed point grows by attribute, not by :hover — `r` is what the retired CSS
            transitioned, and a finger never hovers. `[transition:r_.2s]` keeps the growth
            animated; the pointer surface owns the events, so the circles carry none. */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === active ? 6 : 4}
            className="fill-oxblood [transition:r_.2s]"
          />
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

        {/* The pointer surface, over everything it reports on. Pointer events unify mouse and
            touch, so this is the whole input story; the root's touch-pan-y leaves a vertical
            drag to the page — scrolling past the chart still works — while a horizontal one
            scrubs. pointercancel is the browser claiming that vertical drag, and the scrub
            yields. */}
        <rect
          x={padding.left}
          y={padding.top}
          width={innerWidth}
          height={innerHeight}
          className="cursor-crosshair fill-transparent"
          onPointerDown={scrubTo}
          onPointerMove={scrubTo}
          // A finger LIFT is a leave: the spec mandates pointerup → pointerout → pointerleave for
          // non-hovering pointers, and Chrome fires exactly that train — so clearing here
          // unconditionally killed the tooltip 150ms after a tap, which is the one gesture a
          // phone reader has. Touch lifts keep the tooltip up for reading (it is inert:
          // aria-hidden, pointer-events-none; the next tap moves it, a refetch clears it). A
          // mouse leaving really has left, and clears.
          onPointerLeave={(event) => {
            if (event.pointerType !== 'touch') clearScrub()
          }}
          onPointerCancel={clearScrub}
        />

        {/* aria-hidden: the aria sentence on the SVG is the accessible interface, and this box is
            a visual affordance over it. pointer-events-none so the finger under the tooltip keeps
            scrubbing the surface instead of the box swallowing the drag. */}
        {tooltip && (
          <g aria-hidden="true" className="pointer-events-none">
            <rect
              x={tooltip.left}
              y={tooltip.top}
              width={tooltip.box.width}
              height={tooltip.box.height}
              rx="6"
              className="fill-paper stroke-line"
              strokeWidth="1"
            />
            <text
              x={tooltip.left + TOOLTIP_PAD_X}
              y={tooltip.top + tooltip.box.priceBaseline}
              fontSize={TICK_FONT_SIZE}
              className="fill-ink font-bold"
            >
              {tooltip.priceLabel}
            </text>
            <text
              x={tooltip.left + TOOLTIP_PAD_X}
              y={tooltip.top + tooltip.box.dateBaseline}
              fontSize={DATE_FONT_SIZE}
              className="fill-ink-soft"
            >
              {tooltip.dateLabel}
            </text>
          </g>
        )}
      </svg>
    )
  }

  return (
    <div className="rounded-[var(--radius-lg)] border border-line bg-paper p-5 shadow-[var(--shadow-sm)] md:p-8">
      <div className="mb-7 flex flex-col flex-wrap items-start gap-4 md:flex-row md:items-center md:justify-between">
        {/* leading-[1.15] because text-2xl brings its own 2rem line-height — the retired rule
            inherited the base heading 1.15, and without this the title grows 4.4px taller. */}
        <h3 className="m-0 text-2xl font-bold leading-[1.15] text-ink">Price History</h3>
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
      {/* The measured element. It exists in every state — skeleton, error, empty, chart — so the
          width is already known by the time the data lands. overflow-x-auto stays as a safety
          valve, but with the viewBox at the measured width nothing should ever scroll. */}
      <div ref={containerRef} className="w-full overflow-x-auto py-4">
        {renderChart()}
      </div>
    </div>
  )
}
