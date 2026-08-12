import { describe, expect, it } from 'vitest'
import { estimateLabelWidth, DATE_FONT_SIZE, TICK_FONT_SIZE } from './axisScale'
import { scrubIndex, tooltipBox, tooltipPlacement, TOOLTIP_GAP, TOOLTIP_PAD_X } from './scrub'

// The default chart's plot: 800 wide, the "50 Tr" gutter (56) on the left, 20 units of padding on
// the right. Eight readings put a point every 103.43 units.
const PLOT_LEFT = 56
const PLOT_WIDTH = 724
const STEP = PLOT_WIDTH / 7

describe('scrub index', () => {
  it('answers the reading nearest the pointer, in either direction', () => {
    expect(scrubIndex(PLOT_LEFT, PLOT_LEFT, PLOT_WIDTH, 8)).toBe(0)
    expect(scrubIndex(PLOT_LEFT + PLOT_WIDTH, PLOT_LEFT, PLOT_WIDTH, 8)).toBe(7)
    // Short of the fourth reading and past it: nearest wins, not floor.
    expect(scrubIndex(PLOT_LEFT + 3 * STEP - 40, PLOT_LEFT, PLOT_WIDTH, 8)).toBe(3)
    expect(scrubIndex(PLOT_LEFT + 3 * STEP + 40, PLOT_LEFT, PLOT_WIDTH, 8)).toBe(3)
    expect(scrubIndex(PLOT_LEFT + 3 * STEP + 60, PLOT_LEFT, PLOT_WIDTH, 8)).toBe(4)
  })

  it('clamps to the ends instead of naming a reading that does not exist', () => {
    // The finger can leave the plot before pointerleave fires — over the gutter, over the
    // right padding — and the answer has to stay a real index.
    expect(scrubIndex(0, PLOT_LEFT, PLOT_WIDTH, 8)).toBe(0)
    expect(scrubIndex(-200, PLOT_LEFT, PLOT_WIDTH, 8)).toBe(0)
    expect(scrubIndex(4000, PLOT_LEFT, PLOT_WIDTH, 8)).toBe(7)
  })

  it('answers the only reading there is when the series has one point', () => {
    expect(scrubIndex(400, PLOT_LEFT, PLOT_WIDTH, 1)).toBe(0)
  })
})

describe('scrub tooltip geometry', () => {
  // A real VND price and the instant line the tooltip writes for it. The exact strings vary by
  // locale; nothing below depends on which one produced them.
  const PRICE = '12.900.000 ₫'
  const DATE = '26/1/2026, 17:43:00'
  const box = tooltipBox(PRICE, DATE)

  it('reserves room for the wider line plus padding on both sides', () => {
    expect(box.width).toBeGreaterThanOrEqual(
      Math.max(
        estimateLabelWidth(PRICE, TICK_FONT_SIZE),
        estimateLabelWidth(DATE, DATE_FONT_SIZE)
      ) + 2 * TOOLTIP_PAD_X
    )
    // Two text lines stacked with padding cannot be shorter than their font sizes.
    expect(box.height).toBeGreaterThan(TICK_FONT_SIZE + DATE_FONT_SIZE)
    expect(box.dateBaseline).toBeGreaterThan(box.priceBaseline)
    expect(box.height).toBeGreaterThan(box.dateBaseline)
  })

  it('sits beside the crosshair where the plot is open', () => {
    const { left, top } = tooltipPlacement(400, 150, box, 800, 300)
    expect(left).toBe(400 + TOOLTIP_GAP)
    expect(top).toBe(150 - box.height / 2)
  })

  it('flips to the left of a crosshair near the right edge', () => {
    const { left } = tooltipPlacement(780, 150, box, 800, 300)
    expect(left + box.width).toBeLessThanOrEqual(780 - TOOLTIP_GAP)
    expect(left).toBeGreaterThanOrEqual(0)
  })

  it('stays to the right of a crosshair near the left edge', () => {
    const { left } = tooltipPlacement(56, 150, box, 800, 300)
    expect(left).toBe(56 + TOOLTIP_GAP)
    expect(left + box.width).toBeLessThanOrEqual(800)
  })

  it('flips on a 320-unit chart the same way', () => {
    const { left } = tooltipPlacement(300, 150, box, 320, 300)
    expect(left + box.width).toBeLessThanOrEqual(300 - TOOLTIP_GAP)
    expect(left).toBeGreaterThanOrEqual(0)
  })

  it('clamps vertically instead of leaving the viewBox', () => {
    // Half a unit in, not flush: the border is a 1-unit stroke centred on the rect's edge, so a
    // rect at 0 paints half its stroke outside the viewBox.
    expect(tooltipPlacement(400, 5, box, 800, 300).top).toBe(0.5)
    expect(tooltipPlacement(400, 295, box, 800, 300).top).toBe(300 - box.height - 0.5)
  })

  it('never puts a digit outside the viewBox, wherever the crosshair lands', () => {
    // The cardinal rule, swept: every crosshair x on the two widths that matter, phone and full.
    for (const viewWidth of [320, 800]) {
      for (let x = 0; x <= viewWidth; x += 5) {
        const { left, top } = tooltipPlacement(x, 150, box, viewWidth, 300)
        expect(left, `x=${x} at ${viewWidth}`).toBeGreaterThanOrEqual(0)
        expect(left + box.width, `x=${x} at ${viewWidth}`).toBeLessThanOrEqual(viewWidth)
        expect(top).toBeGreaterThanOrEqual(0)
        expect(top + box.height).toBeLessThanOrEqual(300)
      }
    }
  })
})
