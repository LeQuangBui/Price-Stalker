// Domain, tick placement, labelling and gutter sizing for the price chart's two axes.
//
// Y axis. Gridlines sit on round numbers — 0, 5 Tr, 10 Tr, 15 Tr — rather than at low + k/4 of
// the span, so each label is an exact statement of the value under it. Placing a tick at an
// arbitrary value and rounding its label afterwards produces an axis that is confident and wrong:
// a gridline drawn at 1.290.000 ₫ came out labelled "1 Tr", 22.5% below the price it marked, on
// the very line that carries the lowest price the product has ever been. Snapping the value
// instead makes the abbreviation lossless, at the cost of a domain that reaches a little past the
// data — the conventional trade, and the reason a chart's axis usually starts on a round number.
//
// Labels stay abbreviated ("12,9 Tr" in vi-VN, "12.9M" in en-US). A full VND amount renders
// 56-114 user units wide at 12px depending on locale and magnitude, against a viewBox only 800
// units across, so printing one per tick ran every label off the left edge and the SVG viewport
// cut the leading digits off. Ticks reading "00.000 ₫" for 12.900.000 ₫ are worse than no ticks.
//
// X axis. The date format is chosen from the span the data actually covers, not from the range
// button that was pressed. A product with three days of history viewed on "All" used to get eight
// gridlines all reading "thg 1 26" — one distinct label out of eight. It is also chosen from the
// room the plot has: ten labels sharing 700 units cannot each be 90 wide, so a format that would
// not lay out gives way to a narrower rendering of the same instant.
//
// Four invariants hold this together, each established by construction and fuzzed in
// axisScale.test.js rather than argued for:
//   1. No two labels on an axis render the same string.
//   2. Every y-axis label states the exact value of the gridline it sits on.
//   3. No label's box crosses the edge of the viewBox: the y-axis gutter is measured from the
//      labels actually drawn, and a date label's x is clamped to keep its box inside.
//   4. No two date labels overlap. Clamping and the format ladder are both settled against the
//      same layout the browser will perform, so fitting is decided rather than hoped for.
//
// Exact figures are not lost. The chart's aria-label speaks low, high and latest in full, every
// data point carries a full-precision <title>, and the unit is stated once above the axis.

const TARGET_TICKS = 5
const MAX_COMPACT_FRACTION_DIGITS = 3
const MAX_PLAIN_FRACTION_DIGITS = 6

// Gap between the longest tick label and the axis line. Exported so the component positions labels
// against the same constant the gutter reserves for them; if these two drift apart, clipping
// silently returns.
export const TICK_GAP = 10

// The three text sizes in the chart. The component reads all of them from here so the size the
// gutter is computed against and the size actually rendered cannot drift apart, and so the tests
// can select a node by the role it plays instead of by a hardcoded "11".
export const TICK_FONT_SIZE = 12
export const CAPTION_FONT_SIZE = 11
export const DATE_FONT_SIZE = 11

// Nothing measures text at render time — there is no layout engine in the middle of a React render,
// and the viewBox is fixed while the element is fluid, so a pixel measurement would be the wrong
// unit anyway. Label widths are therefore estimated from the characters in the label.
//
// Advances are a fraction of the font size, so the estimate holds at any text size, and each is an
// upper bound rather than an average: under-reserving costs the reader a digit, over-reserving
// costs a little plot width. Every bound below was measured glyph by glyph in a real browser, in
// both faces the app can render in — Inter, and the system sans the display=swap link leaves on
// screen for every cold load:
//   digit     '4' 0.650 em   (Inter's default figures are proportional, not tabular: '1' is 0.471)
//   separator ',' '.' and ':' 0.307 em, U+00A0 0.290 em
//   other     CJK ideographs 1.024 em, 'W' 0.988 em
// widths.fixture.json carries those measurements for 7,673 strings and the suite checks this
// function against every one of them. That check is the point: an earlier version of this table
// was internally consistent, passed every test, and still under-reserved for '万' and for a group
// separator, which is exactly the failure a test written against the arithmetic cannot see.
const ADVANCE_SEPARATOR = 0.32
const ADVANCE_DIGIT = 0.7
const ADVANCE_OTHER = 1.05

// Space, no-break space and narrow no-break space all serve as group separators across locales;
// ICU writes Vietnamese compact units with U+00A0 rather than a plain space. The colon joins them
// for the date axis: it measures 0.307 em, exactly what the comma and full stop do, and charging a
// clock time 1.05 em for each of its colons is what makes "03:43:12 AM" look unplaceable.
const SEPARATORS = new Set([' ', '\u00a0', '\u202f', ',', '.', ':', '\u2019', "'"])

// Floor keeps the axis off the left edge when labels are very short ("5 Tr"); ceiling stops a
// pathological label from eating the plot. Neither binds for any realistic price — over 40,000
// fuzzed spans across seven locales and eight currencies the widest gutter asked for was 143u, for
// "9,999,900,000,000" — they are guard rails, not layout.
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

function widestLabelWidth(labels, fontSize = TICK_FONT_SIZE) {
  return labels.reduce((max, label) => Math.max(max, estimateLabelWidth(label, fontSize)), 0)
}

export function axisGutter(labels) {
  return Math.min(MAX_GUTTER, Math.max(MIN_GUTTER, Math.ceil(widestLabelWidth(labels)) + TICK_GAP))
}

// 1, 2, 2.5 and 5 times a power of ten: the intervals a reader can add up without thinking, and
// the only ones whose multiples stay short in compact notation. Rounding the raw step UP to one of
// these is what buys accurate labels — the step, not the label, absorbs the rounding.
const NICE_MULTIPLES = [1, 2, 2.5, 5, 10]

function niceStep(raw) {
  if (!(raw > 0) || !Number.isFinite(raw)) return 1
  const power = Math.pow(10, Math.floor(Math.log10(raw)))
  const mantissa = raw / power
  const multiple = NICE_MULTIPLES.find((candidate) => mantissa <= candidate * (1 + 1e-9)) ?? 10
  return multiple * power
}

// How many multiples of `step` fit under (or over) `value`. Snapped to the nearest integer when
// the division lands within floating-point noise of one, so a value already sitting exactly on a
// gridline does not gain a spurious extra gridline beneath it.
function stepIndex(value, step, round) {
  const exact = value / step
  const nearest = Math.round(exact)
  if (Math.abs(exact - nearest) <= 1e-9 * Math.max(1, Math.abs(nearest))) return nearest
  return round(exact)
}

// index * step accumulates error once the power of ten goes negative — 7 x 0.1 is
// 0.7000000000000001 — and a gridline a fifteenth decimal off its step cannot be labelled exactly.
// Trimming to 15 significant figures drops the noise without putting a floor under the step.
function tickValue(index, step) {
  return Number((index * step).toPrecision(15))
}

// A series where every reading is identical has no range to draw. The old `maxPrice - minPrice || 1`
// spanned the whole axis across a single dong, which rounded the ticks onto two or three identical
// strings and pinned the line to the floor as though the price had bottomed out. Give a flat series
// a real band around its value instead.
//
// The band is clamped at zero for a non-negative series. A stored 0 is a real out-of-stock reading
// or a parse artefact — formatters.js guards for it elsewhere — and an axis answering it with
// "-1 ₫" states a price that cannot exist.
function paddedRange(min, max) {
  if (max > min) return [min, max]
  const padding = Math.max(Math.abs(min) * 0.05, 1)
  return [min >= 0 ? Math.max(0, min - padding) : min - padding, min + padding]
}

/**
 * The drawn domain and the gridlines inside it.
 *
 * `low` and `high` are the snapped bounds, which reach at most one step past the data; the line and
 * the points must be plotted against them, not against the raw min and max, or the curve will not
 * line up with its own gridlines. `values` are the gridline positions, every one an exact multiple
 * of `step`.
 */
export function axisDomain(min, max) {
  const [rawLow, rawHigh] = paddedRange(min, max)
  const step = niceStep((rawHigh - rawLow) / (TARGET_TICKS - 1))

  const firstIndex = stepIndex(rawLow, step, Math.floor)
  const lastIndex = Math.max(firstIndex + 1, stepIndex(rawHigh, step, Math.ceil))

  const values = []
  for (let index = firstIndex; index <= lastIndex; index += 1) values.push(tickValue(index, step))

  return { low: values[0], high: values[values.length - 1], step, values }
}

function labelsAreDistinct(labels) {
  return new Set(labels).size === labels.length
}

// The power of ten ICU folds into a compact unit for this value — 10^6 behind "Tr" in vi-VN, 10^4
// behind "万" in ja-JP. Read back out of the formatter rather than tabulated here, because which
// unit applies at which magnitude is a property of the locale's data, not of the number.
function compactScale(value, locale) {
  if (!value) return 1
  const parts = new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: 20,
    numberingSystem: 'latn'
  }).formatToParts(Math.abs(value))

  let mantissa = ''
  for (const part of parts) {
    if (part.type === 'integer') mantissa += part.value
    else if (part.type === 'fraction') mantissa += `.${part.value}`
  }

  const exponent = Math.round(Math.log10(Math.abs(value) / Number(mantissa)))
  return Number.isFinite(exponent) ? Math.pow(10, exponent) : 1
}

// Decimal places needed to write `ratio` exactly, or null if it needs more than an axis should.
function exactDecimals(ratio, limit) {
  for (let digits = 0; digits <= limit; digits += 1) {
    const scaled = ratio * Math.pow(10, digits)
    if (Math.abs(scaled - Math.round(scaled)) <= 1e-9 * Math.max(1, Math.abs(scaled))) return digits
  }
  return null
}

function format(locale, options) {
  return new Intl.NumberFormat(locale, { minimumFractionDigits: 0, ...options })
}

// Compact labels, or null when compact notation cannot state these values exactly, cannot state
// them in one unit, or cannot keep them apart.
function compactLabels(values, step, locale) {
  const magnitudes = values.filter((value) => value !== 0).map(Math.abs)
  if (!magnitudes.length) return null

  const scale = compactScale(Math.max(...magnitudes), locale)
  // One tick set, one unit. "950 / 975 / 1 N / 1,03 N / 1,05 N" switches scale halfway up the axis
  // and leaves the reader to notice; when the ticks straddle a compact boundary, write them out in
  // full instead. Zero is exempt — it carries no unit in any locale and reads correctly beside one.
  if (values.some((value) => value !== 0 && compactScale(value, locale) !== scale)) return null

  const digits = exactDecimals(step / scale, MAX_COMPACT_FRACTION_DIGITS)
  if (digits === null) return null

  const formatter = format(locale, {
    notation: 'compact',
    compactDisplay: 'short',
    maximumFractionDigits: digits
  })
  const labels = values.map((value) => formatter.format(value))
  return labelsAreDistinct(labels) ? labels : null
}

// Full grouped numbers, for spans too tight or too awkwardly placed for compact notation. Every
// value is a whole multiple of the step, so the step's own precision writes all of them exactly;
// the loop past it only exists so the distinctness invariant is checked here too rather than
// assumed, which is how the previous fallback quietly escaped it.
function plainLabels(values, step, locale) {
  const exact = exactDecimals(step, MAX_PLAIN_FRACTION_DIGITS) ?? 0
  let widest = null

  for (let digits = exact; digits <= MAX_PLAIN_FRACTION_DIGITS; digits += 1) {
    const formatter = format(locale, { maximumFractionDigits: digits })
    const labels = values.map((value) => formatter.format(value))
    widest = labels
    if (labelsAreDistinct(labels)) return labels
  }

  return widest
}

/**
 * Gridlines over the price domain, each labelled with its own exact value.
 *
 * `locale` exists so tests can pin a locale. Production passes nothing, matching formatPrice, which
 * on this branch also resolves against the reader's browser locale.
 */
export function axisTicks(min, max, locale) {
  const { low, high, step, values } = axisDomain(min, max)

  // Both forms state the value exactly, so the axis takes whichever is narrower. Compact usually
  // wins by a mile ("15 Tr" against "15.000.000"), but a step fine enough to need three decimals
  // inverts it — "124,775 Mio." is 97 user units against 83 for writing the number out — and an
  // abbreviation that costs width has nothing left to recommend it.
  const compact = compactLabels(values, step, locale)
  const plain = plainLabels(values, step, locale)
  const labels = compact && widestLabelWidth(compact) <= widestLabelWidth(plain) ? compact : plain

  const range = high - low

  return {
    low,
    high,
    step,
    ticks: values.map((value, index) => ({
      ratio: range > 0 ? (value - low) / range : 0,
      value,
      label: labels[index]
    }))
  }
}

const DAY_MS = 24 * 60 * 60 * 1000

// Coarsest first: the least detail that still tells two gridlines apart is the most readable one.
// A clock time with no date is only offered when the whole series fits inside a day, because
// outside one it says nothing about which day the reading belongs to.
//
// Within one level of detail the fullest rendering comes first and progressively shorter ways of
// naming the same instant follow it, because which of them is legible depends on how much room the
// plot has. Ten gridlines share 736 user units at the narrowest gutter and 637 at the widest, so a
// label gets 82 units at best and 71 at worst — and the two at the ends get less again, because the
// clamp has moved them off their own gridlines. Four things come off, in that order, each measured
// in Chromium at 11px: the month stops being spelled out, the hour loses its leading zero, the
// clock goes to 24 hours so no "AM", "Uhr" or "오전" has to be carried (ko-KR's "1. 26. 오전 03시"
// is 77u and its "1. 26. 03시" is 55u), and last of all the month drops out and the day names the
// reading alone ("26일 03시", 50u) — which is only reached at a span short enough that no two
// readings share a day. Carrying the minute is the odd one out: it is more detail, not less, but in
// a locale that spells the hour it is the cheaper way to say the same thing (de-DE's "26.1., 03:43"
// is 56u against 67u for "26.1., 03 Uhr"), so it is tried before the month is given up. Every rung
// below is taken by some locale at some width; none of them is there for symmetry.
const WITHIN_DAY_FORMATS = [
  { hour: '2-digit', minute: '2-digit' },
  { hour: '2-digit', minute: '2-digit', second: '2-digit' },
  { hour: 'numeric', minute: '2-digit', second: '2-digit' },
  { hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }
]
const ACROSS_DAY_FORMATS = [
  { month: 'short', year: '2-digit' },
  { month: 'numeric', year: '2-digit' },
  { month: 'short', day: 'numeric' },
  { month: 'numeric', day: 'numeric' },
  { month: 'numeric', day: 'numeric', hour: '2-digit' },
  { month: 'numeric', day: 'numeric', hour: 'numeric' },
  { month: 'numeric', day: 'numeric', hour: '2-digit', hourCycle: 'h23' },
  { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' },
  { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' },
  { day: 'numeric', hour: '2-digit' },
  { day: 'numeric', hour: '2-digit', hourCycle: 'h23' },
  { day: 'numeric', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }
]

/**
 * Where a date label's box lands, given the gridline it belongs to.
 *
 * The last gridline sits 20 units from the right edge, so a middle-anchored label wider than 40
 * units ran past it and the viewport cut the tail off. Clamping the centre moves the label by only
 * the overhang — half a unit for "thg 1 26" — where anchoring its far end inward moved it by half
 * its own width and drove it into the label before it: de-DE's default view had "27.1., 01 Uhr"
 * and "27.1., 03 Uhr" rendering as one smear 15.7 units deep. Nothing was cut off and nothing was
 * repeated, and both labels were still unreadable.
 */
export function dateLabelX(x, label, viewWidth, fontSize = DATE_FONT_SIZE) {
  const half = estimateLabelWidth(label, fontSize) / 2
  return Math.min(Math.max(x, half), viewWidth - half)
}

// Do these labels, placed and clamped the way the chart will place and clamp them, leave each
// other alone? Asking the layout rather than dividing the plot into equal slots is what covers the
// two ends, where the clamp has moved a label off its gridline and it no longer owns a whole slot.
function labelsAreClear(labels, xs, viewWidth, fontSize) {
  let previousRight = -Infinity
  for (let i = 0; i < labels.length; i += 1) {
    const half = estimateLabelWidth(labels[i], fontSize) / 2
    const centre = dateLabelX(xs[i], labels[i], viewWidth, fontSize)
    if (centre - half < previousRight) return false
    previousRight = centre + half
  }
  return true
}

/**
 * Labels for the timestamps drawn along the bottom of the chart.
 *
 * The format comes from the span these readings actually cover, then from whether that format can
 * tell them apart — never from the range button, which is what put eight identical "thg 1 26"
 * labels under a product that had been tracked for three days.
 *
 * `layout` is optional; pass `{ xs, viewWidth }` — the x of every gridline being labelled, and the
 * width of the viewBox — and the coarsest format that both tells the readings apart *and* lays out
 * without collision wins. Telling them apart comes first and is never traded away for room; where
 * it cannot be had at all, because the readings share an instant, the coarsest format that lays out
 * is taken instead. The count of labels is not a lever here — the chart draws the same number of
 * them either way, in shorter words.
 */
export function dateLabels(times, locale, layout) {
  const dates = times.map((time) => new Date(time))
  const stamps = dates.map((date) => date.getTime()).filter(Number.isFinite)
  const span = stamps.length ? Math.max(...stamps) - Math.min(...stamps) : 0
  const fontSize = layout?.fontSize ?? DATE_FONT_SIZE

  // Nothing beats telling the readings apart, and among formats that do equally well on that, one
  // that lays out beats one that does not. Between two that both lay out, the coarser is already in
  // hand and is kept; between two that do not, the narrower is kept, because the overlap it leaves
  // is the smaller of the two.
  let best = null

  for (const options of span < DAY_MS ? WITHIN_DAY_FORMATS : ACROSS_DAY_FORMATS) {
    const formatter = new Intl.DateTimeFormat(locale, options)
    const labels = dates.map((date) => (Number.isFinite(date.getTime()) ? formatter.format(date) : ''))
    const distinct = labelsAreDistinct(labels)

    if (!layout) {
      if (distinct) return labels
      if (!best) best = { labels }
      continue
    }

    const clear = labelsAreClear(labels, layout.xs, layout.viewWidth, fontSize)
    if (distinct && clear) return labels

    const standing = (distinct ? 2 : 0) + (clear ? 1 : 0)
    const width = widestLabelWidth(labels, fontSize)
    if (!best || standing > best.standing || (standing === best.standing && !clear && width < best.width)) {
      best = { labels, standing, width }
    }
  }

  return best?.labels ?? []
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
