import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PriceHistoryChart from './PriceHistoryChart'
import widths from './widths.fixture.json'
import {
  currencySymbol,
  estimateLabelWidth,
  CAPTION_FONT_SIZE,
  DATE_FONT_SIZE,
  TICK_FONT_SIZE,
  TICK_GAP
} from './axisScale'

// formatPrice is not locale-pinned on this branch, so the chart writes "12.900.000 ₫" for one
// reader and "₫12,900,000" for the next. Every assertion below is therefore made against the
// digits or against what Intl resolves for the running locale — never against one locale's
// punctuation, which would pass here and still ship the bug for everyone else.
const digitsOf = (text) => text.replace(/\D/g, '')

// What the browser will actually draw this string as, in user units. axisScale.test.js pins
// estimateLabelWidth to 1,891 real browser measurements, so the estimate is a sound upper bound
// wherever the running locale takes us; where the exact string is in the fixture, the measurement
// is used as well and the larger of the two has to fit.
const drawnWidth = (text, fontSize) =>
  Math.max(estimateLabelWidth(text, fontSize), (widths.em[text] ?? 0) * fontSize)

const CHART_WIDTH = 800

const getPriceHistory = vi.fn()
vi.mock('../../api/products', () => ({ getPriceHistory: (...args) => getPriceHistory(...args) }))

const DAY = 24 * 60 * 60 * 1000
const END = Date.UTC(2026, 0, 26, 17, 43)

// A 12.9M to 45M laptop — the range whose ticks all rendered as "00.000 d" before the fix.
const series = (min, max, count = 8, history = DAY / 4) =>
  Array.from({ length: count }, (_, i) => ({
    price: Math.round(min + ((max - min) * i) / (count - 1)),
    recordedAt: new Date(END - history + (history * i) / (count - 1)).toISOString()
  }))

// A series whose high is not its latest, so "high" and "latest" cannot be pinned by one number.
const peaked = (low, peak, latest, count = 9) =>
  Array.from({ length: count }, (_, i) => {
    const half = (count - 1) / 2
    const price = i <= half
      ? Math.round(low + ((peak - low) * i) / half)
      : Math.round(peak - ((peak - latest) * (i - half)) / half)
    return { price, recordedAt: new Date(END - DAY / 4 + (DAY / 4 * i) / (count - 1)).toISOString() }
  })

const NO_CURRENCY = Symbol('no currency')

async function renderChart(history, currency = 'VND') {
  getPriceHistory.mockResolvedValue(history)
  const props = currency === NO_CURRENCY ? {} : { currency }
  const view = render(<PriceHistoryChart productId="p1" {...props} />)
  await waitFor(() => expect(view.container.querySelector('svg.price-chart')).not.toBeNull())
  return view
}

// The three text roles carry their own class, so a test asks for the thing it means rather than
// for a font size — the ticks, the unit caption and the dates share `.chart-label` and two of the
// three share a size.
const nodes = (container, role) => [...container.querySelectorAll(`text.chart-label.${role}`)]
const textsOf = (list) => list.map((node) => node.textContent)
const attr = (node, name) => Number(node.getAttribute(name))

// Where the browser will put this label's box, given the anchor the component chose.
function span(node, fontSize) {
  const width = drawnWidth(node.textContent, fontSize)
  const x = attr(node, 'x')
  const anchor = node.getAttribute('text-anchor')
  const left = anchor === 'start' ? x : anchor === 'end' ? x - width : x - width / 2
  return [left, left + width]
}

beforeEach(() => {
  getPriceHistory.mockReset()
})

describe('PriceHistoryChart y-axis', () => {
  it('labels every gridline with a string no other gridline uses', async () => {
    const { container } = await renderChart(series(12900000, 45000000))
    const labels = textsOf(nodes(container, 'chart-tick'))

    expect(labels.length).toBeGreaterThanOrEqual(4)
    expect(new Set(labels).size, `Duplicate ticks: ${labels.join(' | ')}`).toBe(labels.length)
  })

  it('keeps each label inside the gutter the axis reserved for it', async () => {
    const { container } = await renderChart(series(129000000, 189000000))
    const ticks = nodes(container, 'chart-tick')

    // Every tick is end-anchored at the same x; everything left of x=0 is outside the viewBox and
    // is what the reader lost before this fix.
    const anchors = [...new Set(ticks.map((node) => attr(node, 'x')))]
    expect(anchors).toHaveLength(1)

    for (const node of ticks) {
      expect(drawnWidth(node.textContent, TICK_FONT_SIZE), `"${node.textContent}" overruns the axis`)
        .toBeLessThanOrEqual(anchors[0])
    }
    expect(anchors[0]).toBeGreaterThanOrEqual(TICK_GAP)
  })

  it('states the currency once instead of on every tick', async () => {
    const { container } = await renderChart(series(12900000, 45000000))

    const symbol = currencySymbol('VND')
    const caption = nodes(container, 'chart-unit')
    expect(textsOf(caption)).toEqual([symbol])
    for (const label of textsOf(nodes(container, 'chart-tick'))) {
      expect(label, 'the unit belongs above the axis, not on every gridline').not.toContain(symbol)
    }
  })

  it('widens the gutter for a caption longer than any tick label', async () => {
    // The gutter is sized from the ticks *and* the caption. Single-digit prices make the ticks
    // trivially short, so whichever currency this locale writes longest is the only thing holding
    // the axis open; drop it from the measurement and the caption runs off the left edge.
    const code = ['VND', 'USD', 'EUR', 'JPY', 'KRW', 'AUD', 'XPF', 'CHF']
      .reduce((widest, next) =>
        drawnWidth(currencySymbol(next), TICK_FONT_SIZE) > drawnWidth(currencySymbol(widest), TICK_FONT_SIZE) ? next : widest)

    const { container } = await renderChart(series(1, 5), code)
    const caption = nodes(container, 'chart-unit')[0]
    const unit = currencySymbol(code)

    expect(caption.textContent).toBe(unit)
    expect(drawnWidth(unit, TICK_FONT_SIZE), `the "${unit}" caption does not fit its gutter`)
      .toBeLessThanOrEqual(attr(caption, 'x'))
  })

  it('omits the unit when there is no currency to name', async () => {
    const { container } = await renderChart(series(12900000, 45000000), NO_CURRENCY)
    expect(nodes(container, 'chart-unit')).toHaveLength(0)
  })

  it('draws each text at the size the axis measured it at', async () => {
    const { container } = await renderChart(series(12900000, 45000000))
    for (const [role, size] of [
      ['chart-tick', TICK_FONT_SIZE],
      ['chart-unit', CAPTION_FONT_SIZE],
      ['chart-date', DATE_FONT_SIZE]
    ]) {
      const drawn = nodes(container, role)
      expect(drawn.length).toBeGreaterThan(0)
      for (const node of drawn) expect(attr(node, 'font-size')).toBe(size)
    }
  })

  it('still speaks the low, high and latest price in full to a screen reader', async () => {
    // High in the middle, so no single number can stand in for two of the three.
    await renderChart(peaked(12900000, 45000000, 31500000))
    const description = screen.getByRole('img').getAttribute('aria-label')

    // Abbreviated ticks make this the only place the exact figures survive, so it has to carry
    // every digit — whatever grouping the reader's locale uses. The gridlines now run past the
    // data as well, so these must be the data's own numbers, not the axis bounds.
    const clause = (word) => description.slice(description.indexOf(word), description.indexOf('.', description.indexOf(word)))
    expect(digitsOf(clause('Low'))).toContain('12900000')
    expect(digitsOf(clause('high'))).toContain('45000000')
    expect(digitsOf(clause('latest'))).toContain('31500000')
    expect(description).toContain('Price history over 1 Day')
  })

  it('does not collapse a flat series onto one repeated label', async () => {
    const { container } = await renderChart(series(15900000, 15900000))
    const labels = textsOf(nodes(container, 'chart-tick'))
    expect(new Set(labels).size, `Flat series ticks: ${labels.join(' | ')}`).toBe(labels.length)
  })
})

describe('PriceHistoryChart plot', () => {
  const gridlines = (container) =>
    [...container.querySelectorAll('line.chart-grid')].map((node) => attr(node, 'y1')).sort((a, b) => a - b)
  const pointYs = (container) =>
    [...container.querySelectorAll('circle.chart-point')].map((node) => attr(node, 'cy')).sort((a, b) => a - b)

  it('draws a reading that lands on a gridline value on that gridline', async () => {
    // 10M to 50M snaps to itself, so the lowest and highest readings sit exactly on the outer
    // gridlines. Plot against the raw min and max instead of the snapped domain and the curve
    // drifts off the very lines it is measured against.
    const { container } = await renderChart(series(10000000, 50000000))
    const grid = gridlines(container)
    const points = pointYs(container)

    expect(points[0]).toBeCloseTo(grid[0], 6)
    expect(points[points.length - 1]).toBeCloseTo(grid[grid.length - 1], 6)
  })

  it('lets the axis reach past the data instead of pinning the line to the floor', async () => {
    const { container } = await renderChart(series(12900000, 45000000))
    const grid = gridlines(container)
    const points = pointYs(container)

    expect(points[points.length - 1]).toBeLessThan(grid[grid.length - 1])
    expect(points[0]).toBeGreaterThan(grid[0])
  })
})

describe('PriceHistoryChart x-axis', () => {
  it('keeps every date label inside the viewBox', async () => {
    // A history far shorter than the range button is the case that clipped: the last label sits
    // 20 units from the right edge, and "thg 1 26" is 41 units wide from its middle.
    for (const history of [DAY / 4, 3 * DAY, 100 * DAY, 400 * DAY]) {
      const { container, unmount } = await renderChart(series(12900000, 45000000, 8, history))
      for (const node of nodes(container, 'chart-date')) {
        const [left, right] = span(node, DATE_FONT_SIZE)
        expect(left, `"${node.textContent}" starts at ${left.toFixed(1)}`).toBeGreaterThanOrEqual(0)
        expect(right, `"${node.textContent}" ends at ${right.toFixed(1)}`).toBeLessThanOrEqual(CHART_WIDTH)
      }
      unmount()
    }
  })

  it('gives every date a string no other date uses, whatever range is selected', async () => {
    for (const history of [DAY / 8, DAY / 4, 3 * DAY, 20 * DAY, 400 * DAY]) {
      const { container, unmount } = await renderChart(series(12900000, 45000000, 8, history))
      const labels = textsOf(nodes(container, 'chart-date'))
      expect(labels).toHaveLength(8)
      expect(new Set(labels).size, `${history / DAY}d of history: ${labels.join(' | ')}`).toBe(8)
      unmount()
    }
  })
})
