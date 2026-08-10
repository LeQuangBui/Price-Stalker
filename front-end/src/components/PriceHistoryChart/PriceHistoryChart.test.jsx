import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import PriceHistoryChart from './PriceHistoryChart'
import { currencySymbol, estimateLabelWidth, TICK_GAP } from './axisScale'

// formatPrice is not locale-pinned on this branch, so the chart writes "12.900.000 ₫" for one
// reader and "₫12,900,000" for the next. Every assertion below is therefore made against the
// digits or against what Intl resolves for the running locale — never against one locale's
// punctuation, which would pass here and still ship the bug for everyone else.
const digitsOf = (text) => text.replace(/\D/g, '')

const getPriceHistory = vi.fn()
vi.mock('../../api/products', () => ({ getPriceHistory: (...args) => getPriceHistory(...args) }))

// A 12.9M to 45M laptop — the range whose ticks all rendered as "00.000 d" before the fix.
const series = (min, max, count = 8) =>
  Array.from({ length: count }, (_, i) => ({
    price: Math.round(min + ((max - min) * i) / (count - 1)),
    recordedAt: new Date(Date.UTC(2026, 0, 1, i)).toISOString()
  }))

const NO_CURRENCY = Symbol('no currency')

async function renderChart(history, currency = 'VND') {
  getPriceHistory.mockResolvedValue(history)
  const props = currency === NO_CURRENCY ? {} : { currency }
  const view = render(<PriceHistoryChart productId="p1" {...props} />)
  await waitFor(() => expect(view.container.querySelector('svg.price-chart')).not.toBeNull())
  return view
}

// The y-axis ticks are the end-anchored labels; the dates along the bottom are middle-anchored.
const tickLabels = (container) =>
  [...container.querySelectorAll('text.chart-label[text-anchor="end"]')]
    .filter((node) => node.getAttribute('font-size') === '12')
    .map((node) => node.textContent)

beforeEach(() => {
  getPriceHistory.mockReset()
})

describe('PriceHistoryChart y-axis', () => {
  it('labels every gridline with a string no other gridline uses', async () => {
    const { container } = await renderChart(series(12900000, 45000000))
    const labels = tickLabels(container)

    expect(labels).toHaveLength(5)
    expect(new Set(labels).size, `Duplicate ticks: ${labels.join(' | ')}`).toBe(5)
  })

  it('keeps each label inside the gutter the axis reserved for it', async () => {
    const { container } = await renderChart(series(129000000, 189000000))
    const labels = tickLabels(container)

    // Every tick is end-anchored at the same x; everything left of x=0 is outside the viewBox and
    // is what the reader lost before this fix.
    const anchors = [...new Set(
      [...container.querySelectorAll('text.chart-label[text-anchor="end"]')]
        .filter((node) => node.getAttribute('font-size') === '12')
        .map((node) => Number(node.getAttribute('x')))
    )]
    expect(anchors).toHaveLength(1)

    for (const label of labels) {
      expect(estimateLabelWidth(label), `"${label}" overruns the axis`).toBeLessThanOrEqual(anchors[0])
    }
    expect(anchors[0]).toBeGreaterThanOrEqual(TICK_GAP)
  })

  it('states the currency once instead of on every tick', async () => {
    const { container } = await renderChart(series(12900000, 45000000))

    const symbol = currencySymbol('VND')
    const unit = container.querySelector('text.chart-label[font-size="11"][text-anchor="end"]')
    expect(unit?.textContent).toBe(symbol)
    for (const label of tickLabels(container)) {
      expect(label, 'the unit belongs above the axis, not on every gridline').not.toContain(symbol)
    }
  })

  it('omits the unit when there is no currency to name', async () => {
    const { container } = await renderChart(series(12900000, 45000000), NO_CURRENCY)
    expect(container.querySelector('text.chart-label[font-size="11"][text-anchor="end"]')).toBeNull()
  })

  it('still speaks the low, high and latest price in full to a screen reader', async () => {
    await renderChart(series(12900000, 45000000))
    const chart = screen.getByRole('img')
    const description = chart.getAttribute('aria-label')

    // Abbreviated ticks make this the only place the exact figures survive, so it has to carry
    // every digit — whatever grouping the reader's locale uses.
    expect(digitsOf(description)).toContain('12900000')
    expect(digitsOf(description)).toContain('45000000')
    expect(digitsOf(description.slice(description.indexOf('latest')))).toContain('45000000')
    expect(description).toContain('Price history over 1 Day')
  })

  it('does not collapse a flat series onto one repeated label', async () => {
    const { container } = await renderChart(series(15900000, 15900000))
    const labels = tickLabels(container)
    expect(new Set(labels).size, `Flat series ticks: ${labels.join(' | ')}`).toBe(5)
  })
})
