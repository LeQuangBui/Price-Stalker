// Y-axis domain, tick labelling and gutter sizing for the price chart.
//
// The visible ticks are deliberately abbreviated — "12,9 Tr" in vi-VN, "12.9M" in en-US — rather
// than full currency strings. A full VND amount renders 56-114 user units wide at 12px depending
// on locale and magnitude, against a viewBox only 800 units across, so printing one per tick ran
// every label off the left edge and the SVG viewport cut the leading digits off. Ticks that read
// "00.000 ₫" for 12.900.000 ₫ are worse than no ticks at all.
//
// Two invariants hold everything together:
//   1. The five labels in a chart are always mutually distinct (see axisTicks) — an abbreviation
//      that collapses two gridlines into the same string helps nobody.
//   2. The gutter is measured from the labels actually being rendered (see axisGutter), so a
//      longer currency or a bigger price widens the axis instead of getting clipped.
//
// Exact figures are not lost: the chart's aria-label speaks the low, high and latest values in
// full, every data point carries a full-precision <title>, and the unit is stated once above the
// axis.

const TICK_RATIOS = [0, 0.25, 0.5, 0.75, 1]
const MAX_COMPACT_FRACTION_DIGITS = 3

// Gap between the longest tick label and the axis line. Exported so the component positions labels
// against the same constant the gutter reserves for them; if these two drift apart, clipping
// silently returns.
export const TICK_GAP = 10

// Tick labels are drawn at this size. The component reads it from here so the size the gutter is
// computed against and the size actually rendered cannot drift apart.
export const TICK_FONT_SIZE = 12

// Nothing measures text at render time — there is no layout engine in the middle of a React render,
// and the viewBox is fixed while the element is fluid, so a pixel measurement would be the wrong
// unit anyway. The gutter is therefore estimated from the characters in the label.
//
// Advances are a fraction of the font size, so the estimate holds at any tick size, and each is an
// upper bound rather than an average: under-reserving costs the reader a digit, over-reserving
// costs a little plot width. Measured in a headless browser in the app's sans stack, where Inter's
// default figures turn out to be proportional rather than tabular — the digits are not all one
// width, and '1' is barely half of '4':
//   widest digit '4' 0.646em · widest Latin letter 'M' 0.903em · comma / no-break space 0.288em
// The digit bound sits well above that 0.646em because the stack falls through to the system sans
// whenever Inter has not loaded and those digits are wider. Everything that is neither digit nor
// separator is charged a whole em, which assumes nothing at all about the glyph — enough for a
// Latin unit suffix, and for a compact unit in a script whose forms are full-width.
const ADVANCE_SEPARATOR = 0.3
const ADVANCE_DIGIT = 0.7
const ADVANCE_OTHER = 1

// Space, no-break space and narrow no-break space all serve as group separators across locales;
// ICU writes Vietnamese compact units with U+00A0 rather than a plain space.
const SEPARATORS = new Set([' ', '\u00a0', '\u202f', ',', '.', '\u2019', "'"])

// Floor keeps the axis off the left edge when labels are very short ("5 N"); ceiling stops a
// pathological label from eating the plot. Neither binds for any realistic price — the widest
// label this module can emit estimates at ~120u — they are guard rails, not layout.
const MIN_GUTTER = 44
const MAX_GUTTER = 200

export function estimateLabelWidth(label, fontSize = TICK_FONT_SIZE) {
  let advances = 0
  for (const char of label) {
    if (SEPARATORS.has(char)) advances += ADVANCE_SEPARATOR
    else if (char >= '0' && char <= '9') advances += ADVANCE_DIGIT
    else advances += ADVANCE_OTHER
  }
  return advances * fontSize
}

export function axisGutter(labels) {
  const widest = labels.reduce((max, label) => Math.max(max, estimateLabelWidth(label)), 0)
  return Math.min(MAX_GUTTER, Math.max(MIN_GUTTER, Math.ceil(widest) + TICK_GAP))
}

// A series where every reading is identical has no range to draw. The old `maxPrice - minPrice || 1`
// spanned the whole axis across a single dong, which rounded the five ticks onto two or three
// identical strings and pinned the line to the floor as though the price had bottomed out. Give a
// flat series a real band around its value instead, so the ticks are distinct prices and the line
// sits mid-chart where a flat line belongs.
export function axisDomain(min, max) {
  if (max > min) return { low: min, high: max }
  const padding = Math.max(Math.abs(min) * 0.05, 1)
  return { low: min - padding, high: min + padding }
}

function labelsAreDistinct(labels) {
  return new Set(labels).size === labels.length
}

function compactLabels(values, locale, digits) {
  const format = new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
  return values.map((value) => format.format(value))
}

// Decimals needed for full grouped numbers to separate ticks a `step` apart. One digit finer than
// the step itself, so neighbouring values differ by ~10 units in the last place and cannot round
// together.
function plainFractionDigits(step) {
  if (!(step > 0)) return 0
  return Math.min(6, Math.max(0, Math.ceil(-Math.log10(step)) + 1))
}

function plainLabels(values, locale, digits) {
  const format = new Intl.NumberFormat(locale, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits
  })
  return values.map((value) => format.format(value))
}

/**
 * Five evenly spaced ticks over the price domain, labelled as compactly as the span allows.
 *
 * Fraction digits are derived from the data, not guessed: the shortest compact form that keeps all
 * five labels distinct wins, so a wide span reads "1 Tr / 33 Tr / 65 Tr / 97 Tr / 129 Tr" while a
 * span narrow enough to need them gets "12,90 Tr / 12,91 Tr / …". Spans too tight for compact
 * notation at any precision fall back to full grouped numbers.
 *
 * `locale` exists so tests can pin a locale. Production passes nothing, matching formatPrice, which
 * on this branch also resolves against the reader's browser locale.
 */
export function axisTicks(min, max, locale) {
  const { low, high } = axisDomain(min, max)
  const values = TICK_RATIOS.map((ratio) => low + (high - low) * ratio)

  let labels = null
  for (let digits = 0; digits <= MAX_COMPACT_FRACTION_DIGITS && !labels; digits += 1) {
    const candidate = compactLabels(values, locale, digits)
    if (labelsAreDistinct(candidate)) labels = candidate
  }

  if (!labels) labels = plainLabels(values, locale, plainFractionDigits((high - low) / 4))

  return {
    low,
    high,
    ticks: values.map((value, index) => ({ ratio: TICK_RATIOS[index], value, label: labels[index] }))
  }
}

// The unit, stated once above the axis instead of repeated on every tick. Whatever the locale calls
// this currency — "₫" in vi-VN and en-US, "VND" in en-AU — is what the reader sees elsewhere on the
// page, so it is read back out of Intl rather than hardcoded.
export function currencySymbol(currency, locale) {
  if (!currency) return ''
  try {
    const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0)
    return parts.find((part) => part.type === 'currency')?.value || ''
  } catch {
    // Unknown currency code — formatPrice degrades to a plain number here too, so print no unit.
    return ''
  }
}
