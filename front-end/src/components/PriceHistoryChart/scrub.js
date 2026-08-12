// Geometry for reading a single price off the chart with a finger or a mouse.
//
// The chart's only per-point affordance used to be a native <title> per circle: hover-only, so no
// reader on a phone ever saw an individual price. The replacement is a scrub — one pointer
// surface over the plot, the nearest reading by x, a crosshair and an SVG tooltip — and this
// module owns the arithmetic for it, pure and layout-free, the same way axisScale owns the axes.
//
// Everything is in user units, which the rendered-width viewBox makes CSS pixels. Widths come
// from estimateLabelWidth, the house oracle the y-gutter and date clamps are already settled
// against; the vertical constants are Inter's proportions at the two label sizes, with room above
// the ascenders and below the descenders. The cardinal rule the placement enforces is the same
// one the axes live under: no digit is ever clipped.

import { estimateLabelWidth, DATE_FONT_SIZE, TICK_FONT_SIZE } from './axisScale'

// The crosshair-to-tooltip gap. Wide enough that the box clears the grown 6-unit point with the
// stroke on top of it, close enough to read as attached to it.
export const TOOLTIP_GAP = 14

export const TOOLTIP_PAD_X = 10

// The price line is drawn bold, and the advance table was measured in the regular face. Inter's
// bold digits run just under 5% wider — the widest, measured at 12px in Chrome, is 0.676em at
// weight 700 against 0.646 regular, and "₫" moves 0.613 to 0.632 — so 1.08 over a table that is
// already an upper bound keeps the reservation an upper bound in bold too.
const PRICE_BOLD_WIDTH = 1.08

// Two stacked baselines. The price sits its 12px ascenders 8 units under the top padding line;
// the instant line follows a full line advance later; three units of descender room before the
// bottom padding. 8 + 9 + 16 + 3 + 8.
const TOOLTIP_PAD_Y = 8
const PRICE_BASELINE = TOOLTIP_PAD_Y + 9
const DATE_BASELINE = PRICE_BASELINE + 16
const TOOLTIP_HEIGHT = DATE_BASELINE + 3 + TOOLTIP_PAD_Y

/**
 * The reading nearest an x, in user units. Points are evenly spaced, so this is arithmetic, not
 * search — and it is clamped, because a finger can be over the gutter or the right padding before
 * pointerleave has fired, and the answer still has to be a reading that exists.
 */
export function scrubIndex(x, plotLeft, plotWidth, count) {
  if (count <= 1) return 0
  // The width is floored at one unit for the same reason the component floors innerWidth: a
  // container narrower than the gutter would otherwise send step to zero or negative, and
  // round((x - left) / 0) is NaN — an index that dereferences nothing.
  const step = Math.max(1, plotWidth) / (count - 1)
  return Math.min(count - 1, Math.max(0, Math.round((x - plotLeft) / step)))
}

/**
 * The box the tooltip needs for these two lines: the wider line, bold-corrected for the price,
 * plus padding. Baselines ride along so the component draws the text against the same constants
 * the box was sized with.
 */
export function tooltipBox(priceLabel, dateLabel) {
  const width = Math.ceil(2 * TOOLTIP_PAD_X + Math.max(
    estimateLabelWidth(priceLabel, TICK_FONT_SIZE) * PRICE_BOLD_WIDTH,
    estimateLabelWidth(dateLabel, DATE_FONT_SIZE)
  ))
  return {
    width,
    height: TOOLTIP_HEIGHT,
    priceBaseline: PRICE_BASELINE,
    dateBaseline: DATE_BASELINE
  }
}

/**
 * Where the box goes: beside the crosshair, flipped to the other side when it would cross the
 * right edge, and clamped inside the viewBox both ways. The final clamp is the rule that outranks
 * the rest — mid-resize neither side may fit, and every digit staying on the paper beats staying
 * clear of the crosshair. Vertically it centres on the reading and clamps the same way.
 */
export function tooltipPlacement(x, y, box, viewWidth, viewHeight) {
  // Clamped to half a unit, not zero: the border is a 1-unit stroke centred on the rect's edge,
  // so a rect flush against the viewBox loses the outer half of its stroke. Half a unit keeps the
  // whole border on the paper; the digits were never at risk either way.
  const inset = 0.5
  let left = x + TOOLTIP_GAP
  if (left + box.width > viewWidth) left = x - TOOLTIP_GAP - box.width
  left = Math.min(Math.max(inset, left), Math.max(inset, viewWidth - box.width - inset))

  const top = Math.min(
    Math.max(inset, y - box.height / 2),
    Math.max(inset, viewHeight - box.height - inset)
  )
  return { left, top }
}
