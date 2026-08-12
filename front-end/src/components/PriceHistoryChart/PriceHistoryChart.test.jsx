import { describe, expect, it, vi, beforeEach } from 'vitest'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import PriceHistoryChart from './PriceHistoryChart'
import { formatPrice } from '../../utils/formatters'
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
// estimateLabelWidth to 7,673 real browser measurements, so the estimate is a sound upper bound
// wherever the running locale takes us; where the exact string is in the fixture, the measurement
// is used as well and the larger of the two has to fit.
const drawnWidth = (text, fontSize) =>
  Math.max(estimateLabelWidth(text, fontSize), (widths.em[text] ?? 0) * fontSize)

const CHART_WIDTH = 800
// A label clamped hard against the right edge lands on 800 - w/2 and then spans w/2 either side,
// which in binary comes back a fifteenth decimal past 800. That is arithmetic, not a clipped glyph:
// a real overrun is user units, not 1e-13 of one.
const ROUNDING = 1e-9

const getPriceHistory = vi.fn()
vi.mock('../../api/products', () => ({ getPriceHistory: (...args) => getPriceHistory(...args) }))

const DAY = 24 * 60 * 60 * 1000
// Fixed instant, and the run is fixed to UTC in vite.config.js so it is a fixed wall clock too:
// the chart writes its dates in the reader's zone, which would otherwise make the labels this file
// lays out differ from one machine to the next.
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
  await waitFor(() => expect(view.container.querySelector('svg[role="img"]')).not.toBeNull())
  return view
}

// The three text roles carry their own marker class — no-rule handles, recorded as such in
// classname.guard — so a test asks for the thing it means rather than for a font size: the ticks,
// the unit caption and the dates are all `text`, and two of the three share a size.
const nodes = (container, role) => [...container.querySelectorAll(`text.${role}`)]
const textsOf = (list) => list.map((node) => node.textContent)
const attr = (node, name) => Number(node.getAttribute(name))

// Where the browser will put this label's box. Date labels are middle-anchored and the component
// moves the x instead, so the box is the x with half the drawn width on either side; a label whose
// anchor had been pulled to one end would sit somewhere else entirely, which is why the anchor is
// asserted rather than read.
function span(node, fontSize) {
  const width = drawnWidth(node.textContent, fontSize)
  expect(node.getAttribute('text-anchor'), `"${node.textContent}" is not middle-anchored`).toBe('middle')
  const left = attr(node, 'x') - width / 2
  return [left, left + width]
}

beforeEach(() => {
  getPriceHistory.mockReset()
})

// jsdom performs no layout — getBoundingClientRect answers 0 — so the measurement effect never
// fires on its own and every other describe in this file exercises the 800-unit default. The
// resize path is driven by hand through the recorded observer stub in setup.js.
describe('PriceHistoryChart layout', () => {
  const viewBox = (container) => container.querySelector('svg[role="img"]').getAttribute('viewBox')

  it('lays out at 800 units until the container is measured', async () => {
    const { container } = await renderChart(series(12900000, 45000000))
    expect(viewBox(container)).toBe('0 0 800 300')
  })

  it('adopts the measured width, whole units only, and dates fewer points in it', async () => {
    const { container } = await renderChart(series(12900000, 45000000, 20))
    expect(nodes(container, 'chart-date')).toHaveLength(10)

    // 320.4 is what a real phone reports mid-rotation; the viewBox takes the integer. The chart's
    // own observer is the only one this render registers.
    act(() => {
      for (const observer of globalThis.ResizeObserver.instances) {
        observer.callback([{ contentRect: { width: 320.4 } }], observer)
      }
    })

    expect(viewBox(container)).toBe('0 0 320 300')
    // Twenty readings kept ten dates at 800 units; the 244-unit plot a 320 phone leaves after
    // the VND gutter holds four. datedIndices owns the arithmetic; this pins that the component
    // actually feeds it the measured width.
    expect(nodes(container, 'chart-date')).toHaveLength(4)
  })
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
    // Cut the sentence on its own clause words, not on punctuation. Every separator a price could
    // be cut on belongs to some locale's grouping: vi-VN writes 12.900.000 and en-US ₫12,900,000,
    // so keying on either "." or "," reads one clause as the first two or three digits of its own
    // number and passes for the wrong reason. These words come from the component, not from Intl.
    const clause = (word, next) => description.slice(
      description.indexOf(word),
      next ? description.indexOf(next, description.indexOf(word)) : description.length
    )
    expect(digitsOf(clause('Low', ', high'))).toContain('12900000')
    expect(digitsOf(clause('high', ', latest'))).toContain('45000000')
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
  // Structural selectors, not class handles: every horizontal `line` is a gridline plus the
  // x-axis, and the axis shares the lowest gridline's y (the ratio-0 tick), so the sorted ends —
  // the only entries these tests read — are unchanged by including it. Every `circle` is a data
  // point.
  const gridlines = (container) =>
    [...container.querySelectorAll('line')]
      .filter((node) => attr(node, 'y1') === attr(node, 'y2'))
      .map((node) => attr(node, 'y1'))
      .sort((a, b) => a - b)
  const pointYs = (container) =>
    [...container.querySelectorAll('circle')].map((node) => attr(node, 'cy')).sort((a, b) => a - b)

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
  // Ten readings is the count the chart draws by default and the count the plot is tightest at;
  // eight leave enough slack to hide a collision, which is how one shipped.
  const HISTORIES = [DAY / 4, DAY, 3 * DAY, 20 * DAY, 100 * DAY, 400 * DAY]
  const COUNTS = [8, 10, 12, 20]

  it('keeps every date label inside the viewBox', async () => {
    // A history far shorter than the range button is the case that clipped: the last label sits
    // 20 units from the right edge, and "thg 1 26" is 41 units wide from its middle.
    for (const history of HISTORIES) {
      for (const count of COUNTS) {
        const { container, unmount } = await renderChart(series(12900000, 45000000, count, history))
        for (const node of nodes(container, 'chart-date')) {
          const [left, right] = span(node, DATE_FONT_SIZE)
          expect(left, `"${node.textContent}" starts at ${left.toFixed(1)}`).toBeGreaterThanOrEqual(-ROUNDING)
          expect(right, `"${node.textContent}" ends at ${right.toFixed(1)}`).toBeLessThanOrEqual(CHART_WIDTH + ROUNDING)
        }
        unmount()
      }
    }
  })

  it('does not draw one date on top of the next', async () => {
    for (const history of HISTORIES) {
      for (const count of COUNTS) {
        const { container, unmount } = await renderChart(series(12900000, 45000000, count, history))
        const boxes = nodes(container, 'chart-date')
          .map((node) => ({ text: node.textContent, box: span(node, DATE_FONT_SIZE) }))
          .sort((a, b) => a.box[0] - b.box[0])

        for (let i = 1; i < boxes.length; i += 1) {
          expect(
            boxes[i].box[0],
            `"${boxes[i - 1].text}" ends at ${boxes[i - 1].box[1].toFixed(1)} but "${boxes[i].text}" starts at ${boxes[i].box[0].toFixed(1)}`
          ).toBeGreaterThanOrEqual(boxes[i - 1].box[1])
        }
        unmount()
      }
    }
  })

  it('gives every date a string no other date uses, whatever range is selected', async () => {
    for (const history of [DAY / 8, DAY / 4, 3 * DAY, 20 * DAY, 400 * DAY]) {
      for (const count of COUNTS) {
        const { container, unmount } = await renderChart(series(12900000, 45000000, count, history))
        const labels = textsOf(nodes(container, 'chart-date'))
        // Ten readings or fewer are all dated; above that the chart dates every nth one.
        if (count <= 10) expect(labels).toHaveLength(count)
        expect(labels.length).toBeGreaterThanOrEqual(6)
        expect(new Set(labels).size, `${history / DAY}d of history: ${labels.join(' | ')}`).toBe(labels.length)
        unmount()
      }
    }
  })
})

describe('PriceHistoryChart scrub', () => {
  // jsdom lays nothing out, so the SVG's on-screen box is stated by hand: the identity mapping,
  // one user unit per CSS pixel, which is exactly what the px-true viewBox produces live.
  const surfaceOf = (container) => {
    const svg = container.querySelector('svg[role="img"]')
    svg.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 300 })
    // The pointer surface is the first rect the chart draws; the tooltip's backing rect only
    // exists once a scrub is live, and is drawn after it.
    return container.querySelector('rect')
  }
  const tooltipOf = (container) => container.querySelector('g[aria-hidden="true"]')

  it('grows the reading nearest the pointer and states its price and instant', async () => {
    const history = series(12900000, 45000000, 8)
    const { container } = await renderChart(history)
    const surface = surfaceOf(container)
    const circles = [...container.querySelectorAll('circle')]

    // Aim a little short of the sixth reading: the nearest one answers, not the one before.
    const x = attr(circles[5], 'cx')
    fireEvent.pointerMove(surface, { clientX: x - 10, clientY: 150 })

    expect(circles.map((node) => attr(node, 'r'))).toEqual([4, 4, 4, 4, 4, 6, 4, 4])

    // The crosshair stands on the reading's own x, full plot height.
    const crosshair = [...container.querySelectorAll('line')]
      .filter((node) => attr(node, 'x1') === attr(node, 'x2') && attr(node, 'x1') === x)
    expect(crosshair).toHaveLength(1)

    // The price every phone reader was owed: bold line, then the instant, in whatever words the
    // running locale uses — both sides of the assertion resolve through the same Intl calls.
    const tooltip = tooltipOf(container)
    expect(tooltip).not.toBeNull()
    expect(tooltip.textContent).toContain(formatPrice(history[5].price, 'VND'))
    expect(tooltip.textContent).toContain(new Date(history[5].recordedAt).toLocaleString())
  })

  it('clears the scrub when the pointer leaves or the gesture is taken over', async () => {
    const { container } = await renderChart(series(12900000, 45000000, 8))
    const surface = surfaceOf(container)
    const circles = [...container.querySelectorAll('circle')]

    fireEvent.pointerMove(surface, { clientX: attr(circles[3], 'cx'), clientY: 150 })
    expect(tooltipOf(container)).not.toBeNull()
    fireEvent.pointerLeave(surface)
    expect(tooltipOf(container)).toBeNull()
    expect(circles.map((node) => attr(node, 'r'))).toEqual([4, 4, 4, 4, 4, 4, 4, 4])

    // pointercancel is what a browser fires when it claims the drag for vertical scrolling.
    fireEvent.pointerDown(surface, { clientX: attr(circles[3], 'cx'), clientY: 150 })
    expect(tooltipOf(container)).not.toBeNull()
    fireEvent.pointerCancel(surface)
    expect(tooltipOf(container)).toBeNull()
  })

  it('keeps every digit of the tooltip inside the viewBox at both ends', async () => {
    const { container } = await renderChart(series(12900000, 45000000, 8))
    const surface = surfaceOf(container)
    const circles = [...container.querySelectorAll('circle')]

    for (const index of [0, circles.length - 1]) {
      fireEvent.pointerMove(surface, { clientX: attr(circles[index], 'cx'), clientY: 150 })
      const backing = tooltipOf(container).querySelector('rect')
      const left = attr(backing, 'x')
      expect(left, `tooltip on reading ${index}`).toBeGreaterThanOrEqual(0)
      expect(left + attr(backing, 'width'), `tooltip on reading ${index}`).toBeLessThanOrEqual(800)
    }
  })

  it('leaves the sentence as the accessible interface and hovers up no second tooltip', async () => {
    const { container } = await renderChart(series(12900000, 45000000, 8))
    const surface = surfaceOf(container)
    const circles = [...container.querySelectorAll('circle')]

    fireEvent.pointerDown(surface, { clientX: attr(circles[2], 'cx'), clientY: 150 })

    // The aria sentence still carries the chart; the tooltip is a visual affordance only.
    expect(screen.getByRole('img').getAttribute('aria-label')).toContain('Price history over')
    expect(tooltipOf(container).getAttribute('aria-hidden')).toBe('true')
    // The per-point <title> elements are gone: they were hover-only — no phone ever saw one —
    // and leaving them would float a second, native tooltip next to this one on desktop.
    expect(container.querySelectorAll('svg title')).toHaveLength(0)
  })
})

// Characterization of the shell — header, range buttons, error and empty branches — written ahead
// of the CSS retirement and green against the unconverted component. Queries are by role, name and
// text. The one look at className is an invariant, not a token: "the selected button is styled
// unlike the other five" is true of `.active` today and stays true of whatever utilities carry the
// selected fill afterwards, so nothing here needs an edit when the stylesheet goes.
describe('PriceHistoryChart shell', () => {
  const RANGE_LABELS = ['1 Day', '5 Days', '1 Month', '6 Months', '1 Year', 'All']

  it('renders the heading and all six range buttons', async () => {
    await renderChart(series(12900000, 45000000))
    expect(screen.getByRole('heading', { level: 3, name: 'Price History' })).toBeInTheDocument()
    for (const label of RANGE_LABELS) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('styles exactly the selected range apart, and moves the mark on click', async () => {
    await renderChart(series(12900000, 45000000))
    expect(getPriceHistory).toHaveBeenLastCalledWith('p1', '1d')

    // The button whose className no other range button shares. Exactly one must exist — zero
    // would mean the selected range is not marked at all, two that the mark failed to move.
    const marked = () => {
      const classes = RANGE_LABELS.map((label) => screen.getByRole('button', { name: label }).className)
      const unique = classes.filter((cls) => classes.indexOf(cls) === classes.lastIndexOf(cls))
      expect(unique, 'exactly one range button styled apart from the rest').toHaveLength(1)
      return RANGE_LABELS[classes.indexOf(unique[0])]
    }
    expect(marked()).toBe('1 Day')

    await userEvent.click(screen.getByRole('button', { name: 'All' }))
    await waitFor(() => expect(getPriceHistory).toHaveBeenLastCalledWith('p1', 'all'))
    expect(marked()).toBe('All')
    await screen.findByRole('img')
  })

  it('shows the fetch error with a Retry that refetches', async () => {
    getPriceHistory.mockRejectedValueOnce(new Error('History fetch failed'))
    getPriceHistory.mockResolvedValueOnce(series(12900000, 45000000))
    render(<PriceHistoryChart productId="p1" currency="VND" />)

    expect(await screen.findByText('History fetch failed')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Retry' }))
    expect(await screen.findByRole('img')).toBeInTheDocument()
    expect(screen.queryByText('History fetch failed')).toBeNull()
  })

  it('says so when there is no history', async () => {
    getPriceHistory.mockResolvedValue([])
    render(<PriceHistoryChart productId="p1" currency="VND" />)
    expect(await screen.findByText('No price history available')).toBeInTheDocument()
  })

  it('holds a skeleton while the fetch is pending', () => {
    getPriceHistory.mockReturnValue(new Promise(() => {}))
    const { container } = render(<PriceHistoryChart productId="p1" currency="VND" />)
    const skeleton = container.querySelector('.skeleton')
    expect(skeleton).not.toBeNull()
    expect(skeleton).toHaveAttribute('aria-hidden', 'true')
  })
})
