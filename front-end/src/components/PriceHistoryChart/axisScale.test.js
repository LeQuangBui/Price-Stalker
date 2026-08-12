import { describe, expect, it } from 'vitest'
import widths from './widths.fixture.json'
import {
  axisDomain,
  axisGutter,
  axisTicks,
  currencySymbol,
  datedIndices,
  dateLabels,
  dateLabelX,
  estimateLabelWidth,
  DATE_FONT_SIZE,
  TICK_FONT_SIZE,
  TICK_GAP
} from './axisScale'

// jsdom has no layout engine, so nothing here can measure text. Two of the three things this
// module promises are therefore checked against evidence gathered elsewhere:
//
//   - that a label states the value of its own gridline is checked by reading the label back into
//     a number and comparing it to the gridline, over the whole price matrix. The version of this
//     module that placed ticks at low + k/4 of the span and rounded the label afterwards fails it
//     on 9.3% of endpoint ticks, by up to 33%.
//   - that the width estimate never under-reserves is checked against widths.fixture.json, which
//     holds two kinds of browser measurement taken in both faces the app renders in: an advance
//     for each of the 105 glyphs the axes can write, and a width for each of 7,673 whole strings.
//     The previous suite asserted `estimateLabelWidth(w) <= ceil(estimateLabelWidth(w)) +
//     TICK_GAP - TICK_GAP`, which is true of any advance table at all: halving the digit advance
//     kept it green while 35 ticks clipped in Chrome.
//
// The two measurements answer different questions and both are needed. Glyph advances bound every
// string, including the ones this run does not produce: `Intl` output is a property of the
// runtime's ICU data, not of the code, so the set of strings is not enumerable and a fixture keyed
// on it can never be complete. A CI runner whose ICU wrote ko-KR's day-period-first pattern with
// the English "PM" — "PM 02:43" where this machine renders "오후 02:43" — failed a suite that
// demanded every produced string be listed, over code nobody had touched. Whole-string widths stay
// because they are the stronger check where they exist: a sum of advances misses kerning, and 63
// of the 7,673 strings draw up to 0.0044 em wider than their own glyphs add up to.
//
// formatPrice passes `undefined` on this branch, so the reader's own browser locale decides how
// every number is written. Anything asserted for one locale has to hold for all of them, and this
// machine resolves to en-AU, so nothing below is pinned to vi-VN or en-US punctuation.

const LOCALES = ['vi-VN', 'en-AU', 'en-US', 'ja-JP', 'de-DE', 'fr-FR', 'ko-KR']

// Real Vietnamese price points, plus the degenerate ends: a stored 0, a car, and a figure only a
// scrape of the wrong field produces — which is the one that opens the gutter widest and squeezes
// the date axis hardest.
const MAGNITUDES = [0, 199000, 1290000, 12900000, 45000000, 129000000, 1290000000, 45000000000, 9999635434151]

// Fraction of the price the series moves across. 9 is a tenfold rise over a product's whole
// tracked life; 0 is a series that never moved.
const SPANS = [0, 0.0001, 0.001, 0.01, 0.05, 0.2, 0.5, 1, 3, 9]

const DAY = 24 * 60 * 60 * 1000
// An instant, not a wall clock. Which strings the date axis writes for it depends on the zone as
// well — 17:43 in UTC, 03:43 the next day at UTC+10 — and the fixture below only holds measurements
// for strings that were actually rendered. vite.config.js pins the run to UTC so both ends of that
// agree on every machine; src/test/timezone.guard.test.js fails first if the pin ever comes off.
const END = Date.UTC(2026, 0, 26, 17, 43)
const HISTORIES = [DAY / 8, DAY / 4, DAY, 2 * DAY, 3 * DAY, 20 * DAY, 100 * DAY, 400 * DAY, 1100 * DAY]
// Every count the chart can draw. Eight labels leave room the tenth does not: a matrix that stops
// at eight had nothing to say about the pair of dates that ran into each other on the default view.
const POINT_COUNTS = Array.from({ length: 19 }, (_, i) => i + 2)

const CURRENCIES = ['VND', 'USD', 'EUR', 'JPY', 'KRW', 'AUD', 'XPF', 'CHF']

// Chart geometry, copied from the component: the viewBox is as wide as the container measured —
// 800 by default and until measured — the plot ends 20 units short of its right edge, and it
// starts at whatever gutter the y-axis labels asked for. 320 and 360 are nominal phone widths,
// but the widths the app actually renders are narrower: on the product page the shell and card
// padding eat 122px, so 320/360/390px viewports measure the chart at 198/238/268 units. Those are
// the widths a reader holds, so they are in the sweep — behind the widest gutter in the matrix,
// 198 leaves a plot in the seventies, which is the tightest date row that ships anywhere.
const CHART_WIDTH = 800
const VIEW_WIDTHS = [198, 238, 268, 320, 360, CHART_WIDTH]
const RIGHT_PADDING = 20

function eachChart(visit) {
  for (const locale of LOCALES) {
    for (const base of MAGNITUDES) {
      for (const span of SPANS) {
        const max = Math.round(base + base * span) || base + 1
        visit({ locale, base, max, ...axisTicks(base, max, locale) })
      }
    }
  }
}

function eachDateAxis(visit) {
  for (const locale of LOCALES) {
    for (const history of HISTORIES) {
      for (const count of POINT_COUNTS) {
        const times = Array.from({ length: count }, (_, i) =>
          new Date(END - history + (history * i) / (count - 1)).toISOString())
        visit({ locale, history, count, times, labels: dateLabels(times, locale) })
      }
    }
  }
}

// How narrow the plot can get. Every price in the matrix is put to the axis against every currency,
// exactly as the component sizes its gutter, and the widest any of them asks for is the tightest the
// date labels ever have to be — read off the y axis rather than guessed at, so a wider currency or
// a longer number moves this on its own.
const WIDEST_GUTTER = (() => {
  let widest = 0
  eachChart(({ locale, ticks }) => {
    for (const code of CURRENCIES) {
      widest = Math.max(widest, axisGutter([...ticks.map((tick) => tick.label), currencySymbol(code, locale)]))
    }
  })
  return widest
})()
const GUTTERS = [44, Math.round((44 + WIDEST_GUTTER) / 2), WIDEST_GUTTER]

// The same axes, laid out the way the component lays them out: the readings datedIndices picks
// for the room, and the labels chosen knowing where they will land. This is the path that ships —
// dateLabels without a layout only answers the distinctness question.
function eachDateLayoutLive(visit) {
  for (const viewWidth of VIEW_WIDTHS) {
    for (const gutter of GUTTERS) {
      // The same floor the component applies: a gutter wider than the view must not send the
      // plot negative in the sweep either, or the sweep tests a geometry that cannot render.
      const innerWidth = Math.max(1, viewWidth - gutter - RIGHT_PADDING)
      eachDateAxis(({ locale, history, count, times }) => {
        const indices = datedIndices(count, innerWidth)
        const dated = indices.map((i) => times[i])
        const xs = indices.map((i) => gutter + (i / (count - 1)) * innerWidth)
        visit({
          locale, history, count, gutter, viewWidth, innerWidth, xs,
          labels: dateLabels(dated, locale, { xs, viewWidth })
        })
      })
    }
  }
}

// The layout sweep, run ONCE and cached. Four call sites used to each re-run it, which held under
// vitest's 5s budget at three view widths and blew it on CI's slower runner the day the real page
// widths joined the matrix — three tests timing out at 7-11s while green locally. Every consumer
// iterates this array instead; the assertions are unchanged.
const DATE_LAYOUTS = (() => {
  const out = []
  eachDateLayoutLive((chart) => out.push(chart))
  return out
})()
const eachDateLayout = (visit) => { for (const chart of DATE_LAYOUTS) visit(chart) }

// Every string the axes put on screen, mapped to where it came from. Built once: the layout-aware
// sweep is the expensive one and two tests read it.
//
// What is in here depends on the runtime — ICU decides whether ko-KR's afternoon is "오후" or "PM",
// and a reduced build answers differently from a full one. That is why nothing below asserts the
// contents of this set. It is a supply of real labels to hold the estimate against, not a spec.
const AXIS_STRINGS = (() => {
  const strings = new Map()
  const add = (text, where) => { if (!strings.has(text)) strings.set(text, where) }

  eachChart(({ locale, base, max, ticks }) => {
    for (const { label } of ticks) add(label, `${locale} ${base}-${max}`)
  })
  eachDateAxis(({ locale, history, count, labels }) => {
    for (const label of labels) add(label, `${locale} ${(history / DAY).toFixed(2)}d over ${count} points`)
  })
  // The layout-aware ladder reaches wordings the distinctness ladder never gets to — narrower at
  // 320 than 800 ever forced — and those are the ones the reader actually sees.
  eachDateLayout(({ locale, gutter, viewWidth, count, labels }) => {
    for (const label of labels) add(label, `${locale} ${viewWidth}w gutter ${gutter}, ${count} readings`)
  })
  for (const locale of LOCALES) {
    for (const code of CURRENCIES) {
      const unit = currencySymbol(code, locale)
      if (unit) add(unit, `${locale} ${code}`)
    }
  }

  return strings
})()

// Where the browser will paint this label, given the x the chart clamped it to. The clamp works off
// the estimate and the estimate never under-reserves, so the measured box always sits inside the
// box the clamp reasoned about.
function drawnSpan(label, x, viewWidth) {
  const drawn = measuredWidth(label, DATE_FONT_SIZE)
  const left = dateLabelX(x, label, viewWidth) - drawn / 2
  return [left, left + drawn]
}

// The inverse of the formatter: what quantity does this string say? Built out of Intl for the same
// locale, so no separator or compact unit is assumed here — "Tr" is 10^6 in vi-VN and "万" is 10^4
// in ja-JP because ICU says so, not because this file has a table.
const SUFFIXES = new Map()
function compactSuffixes(locale) {
  if (!SUFFIXES.has(locale)) {
    const formatter = new Intl.NumberFormat(locale, { notation: 'compact', compactDisplay: 'short' })
    const table = new Map()
    for (let power = 0; power <= 15; power += 1) {
      const parts = formatter.formatToParts(Math.pow(10, power))
      const suffix = parts.filter((part) => part.type === 'compact').map((part) => part.value).join('')
      const mantissa = parts.filter((part) => part.type === 'integer').map((part) => part.value).join('')
      if (suffix && !table.has(suffix)) table.set(suffix, Math.pow(10, power) / Number(mantissa))
    }
    SUFFIXES.set(locale, table)
  }
  return SUFFIXES.get(locale)
}

function readsAs(label, locale) {
  let suffix = ''
  let scale = 1
  for (const [candidate, multiplier] of compactSuffixes(locale)) {
    if (label.includes(candidate) && candidate.length > suffix.length) {
      suffix = candidate
      scale = multiplier
    }
  }

  const decimal = new Intl.NumberFormat(locale).formatToParts(1.5).find((part) => part.type === 'decimal').value
  let digits = ''
  for (const char of suffix ? label.replace(suffix, '') : label) {
    if (char >= '0' && char <= '9') digits += char
    else if (char === decimal) digits += '.'
  }
  return Number(digits) * scale
}

const glyphName = (glyph) => `"${glyph}" (U+${glyph.codePointAt(0).toString(16).toUpperCase().padStart(4, '0')})`

// Glyphs in this string the fixture has no advance for. A label the axes can write is made of
// characters somebody has to have measured; which characters those are is a bounded question with
// a stable answer, where which strings get composed out of them is neither.
function unmeasuredGlyphs(text) {
  const missing = []
  for (const glyph of text) if (typeof widths.glyph[glyph] !== 'number') missing.push(glyphName(glyph))
  return missing
}

// What this string is worth on its glyphs alone, in em. Holds for a string nobody listed, which is
// the point; it is a shade under the truth where the face kerns, and `measuredWidth` prefers the
// whole-string reading for exactly that reason.
function glyphFloor(text) {
  let advances = 0
  for (const glyph of text) advances += widths.glyph[glyph] ?? 0
  return advances
}

// The widest the browser is known to draw this string, in user units: its own measurement where the
// fixture has one, and its glyphs' advances where it does not. A glyph with no advance behind it is
// a real gap and fails here — but it names one character, not a string, so the fix is one
// measurement rather than another sweep of a corpus that changes with the runtime.
function measuredWidth(text, fontSize) {
  const missing = unmeasuredGlyphs(text)
  expect(missing, `No measured advance for ${missing.join(', ')}, in "${text}" — measure it in a browser`).toEqual([])
  return Math.max(glyphFloor(text), widths.em[text] ?? 0) * fontSize
}

describe('y-axis gridlines', () => {
  it('labels every gridline with its own exact value', () => {
    const wrong = []

    eachChart(({ locale, base, max, ticks }) => {
      for (const { value, label } of ticks) {
        const said = readsAs(label, locale)
        const error = value === 0 ? Math.abs(said) : Math.abs(said - value) / Math.abs(value)
        if (error > 1e-9) {
          wrong.push(`${locale} ${base}-${max}: gridline ${value} is labelled "${label}" (= ${said})`)
        }
      }
    })

    expect(wrong, `Labels that misstate their own gridline:\n${wrong.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('puts the gridlines on round numbers, evenly spaced', () => {
    const ragged = []

    eachChart(({ locale, base, max, step, ticks }) => {
      const mantissa = step / Math.pow(10, Math.floor(Math.log10(step)))
      if (![1, 2, 2.5, 5].some((nice) => Math.abs(mantissa - nice) < 1e-9)) {
        ragged.push(`${locale} ${base}-${max}: step ${step} is not 1, 2, 2.5 or 5 times a power of ten`)
      }
      for (let i = 1; i < ticks.length; i += 1) {
        const gap = ticks[i].value - ticks[i - 1].value
        if (Math.abs(gap - step) > step * 1e-9) {
          ragged.push(`${locale} ${base}-${max}: gridlines ${ticks[i - 1].value} and ${ticks[i].value} are ${gap} apart, not ${step}`)
        }
      }
    })

    expect(ragged, `Gridlines off the step:\n${ragged.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('covers the data without letting the axis run away from it', () => {
    const bad = []

    eachChart(({ locale, base, max, low, high }) => {
      if (low > base || high < max) bad.push(`${locale} ${base}-${max}: domain [${low}, ${high}] does not contain the data`)
      // Snapping outward costs plot height. One step at each end is the most it can cost, which
      // leaves the series occupying at least half the axis.
      if (max > base && (max - base) / (high - low) < 0.5) {
        bad.push(`${locale} ${base}-${max}: the series is only ${((max - base) / (high - low) * 100).toFixed(0)}% of the axis`)
      }
    })

    expect(bad, `Domains that lost the data:\n${bad.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('never charges a price to a negative axis', () => {
    const negative = []
    eachChart(({ locale, base, max, ticks }) => {
      for (const { value } of ticks) if (value < 0) negative.push(`${locale} ${base}-${max}: gridline ${value}`)
    })
    // A stored 0 is a real out-of-stock reading, and the axis used to answer it with -1 and -0,5.
    expect(negative, `Negative money on the axis:\n${negative.join('\n')}`).toEqual([])
  })

  it('keeps all the labels on one axis distinct', () => {
    const collisions = []

    eachChart(({ locale, base, max, ticks }) => {
      const labels = ticks.map((tick) => tick.label)
      if (new Set(labels).size !== labels.length) {
        collisions.push(`${locale} ${base}-${max}: ${labels.join(' | ')}`)
      }
    })

    expect(collisions, `Ticks a reader cannot tell apart:\n${collisions.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('states one unit per axis, never two', () => {
    const mixed = []

    eachChart(({ locale, base, max, ticks }) => {
      // Whatever is left after the digits and separators come out is the unit. "950" and "1 N" in
      // the same tick set leaves the reader to notice the axis changed scale halfway up.
      const units = new Set(ticks.map((tick) => tick.label.replace(/[\d\s.,'  ’]/g, '')))
      units.delete('')
      if (units.size > 1) mixed.push(`${locale} ${base}-${max}: ${ticks.map((t) => t.label).join(' | ')}`)
    })

    expect(mixed, `Two scales in one tick set:\n${mixed.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('falls back to full numbers often enough for that path to be the one under test', () => {
    let plain = 0
    let total = 0
    eachChart(({ ticks }) => {
      total += 1
      if (ticks.some((tick) => /\d[\s.,  ]\d{3}\b/.test(tick.label))) plain += 1
    })
    // Guards the distinctness and exactness assertions above from quietly covering only the
    // compact branch, which is how the old fallback escaped the distinctness check entirely.
    expect(plain, `${plain} of ${total} charts took the plain-number fallback`).toBeGreaterThan(total / 20)
  })
})

describe('label width estimate', () => {
  it('reserves at least what its glyphs measure, for every string the axes produce', () => {
    // The guarantee that holds for a string nobody enumerated. A label is worth no less than its
    // characters' advances added up, so an estimate that clears that sum cannot cut a label short,
    // whatever wording the runtime's ICU handed the axis.
    const under = []

    for (const [text, where] of AXIS_STRINGS) {
      const missing = unmeasuredGlyphs(text)
      if (missing.length) {
        under.push(`${where}: no measured advance for ${missing.join(', ')}, in "${text}"`)
        continue
      }
      const estimate = estimateLabelWidth(text, 1)
      const floor = glyphFloor(text)
      if (estimate < floor) {
        under.push(`${where}: "${text}" estimated ${estimate.toFixed(3)}em, its glyphs measure ${floor.toFixed(3)}em`)
      }
    }

    expect(under, `Labels the estimate under-reserves for:\n${under.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('never claims a label is narrower than the browser drew it, over every string on file', () => {
    // The tighter check, and the only one that sees kerning: a whole string measured in one piece,
    // where the sum above measures its glyphs apart. It covers fewer strings than the axes can
    // write and is not asked to cover them all — being a subset is what stopped it turning a
    // difference in ICU data into a test failure.
    const under = []

    for (const [text, em] of Object.entries(widths.em)) {
      const estimate = estimateLabelWidth(text, 1)
      if (estimate < em) under.push(`"${text}": estimated ${estimate.toFixed(3)}em, measured ${em.toFixed(3)}em`)
    }

    expect(under, `Labels the estimate under-reserves for:\n${under.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('has a measured advance for every glyph the axes can write', () => {
    // Not the same statement as the first test, which only reads the glyphs this run happened to
    // produce. This one is the ratchet: the repertoire on file has to stay a superset of what any
    // runtime writes, and a gap in it is named as one character rather than as a list of strings.
    const unmeasured = new Map()
    for (const [text, where] of AXIS_STRINGS) {
      for (const glyph of text) {
        if (typeof widths.glyph[glyph] !== 'number') unmeasured.set(glyph, `${glyphName(glyph)} in "${text}" (${where})`)
      }
    }

    const gaps = [...unmeasured.values()]
    expect(gaps, `Glyphs with no browser measurement behind them:\n${gaps.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('grows with the label, so a longer currency widens the axis instead of being cut', () => {
    expect(estimateLabelWidth('129,0 Tr')).toBeGreaterThan(estimateLabelWidth('129M'))
    expect(axisGutter(['129,0 Tr'])).toBeGreaterThan(axisGutter(['129M']))
  })

  it('counts group separators as narrower than digits', () => {
    expect(estimateLabelWidth('.')).toBeLessThan(estimateLabelWidth('0'))
  })
})

describe('y-axis gutter', () => {
  it('reserves at least the width the browser draws, for every chart in the matrix', () => {
    const overflows = []

    eachChart(({ locale, base, max, ticks }) => {
      const labels = ticks.map((tick) => tick.label)
      const gutter = axisGutter(labels)
      for (const label of labels) {
        // Labels are end-anchored at `gutter - TICK_GAP`, so this much room is what they get
        // before they cross x=0 and the viewBox clips them.
        const drawn = measuredWidth(label, TICK_FONT_SIZE)
        if (drawn > gutter - TICK_GAP) {
          overflows.push(`${locale} ${base}-${max}: "${label}" draws ${drawn.toFixed(1)}u in ${gutter - TICK_GAP}u`)
        }
      }
    })

    expect(overflows, `Labels wider than their gutter:\n${overflows.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('leaves the plot the greater part of the 800-unit viewBox', () => {
    let widest = 0
    eachChart(({ ticks }) => {
      widest = Math.max(widest, axisGutter(ticks.map((tick) => tick.label)))
    })
    expect(widest).toBeLessThan(200)
  })
})

describe('x-axis date labels', () => {
  it('gives every gridline a string no other gridline uses', () => {
    const collisions = []

    eachDateAxis(({ locale, history, count, labels }) => {
      if (new Set(labels).size !== labels.length) {
        collisions.push(`${locale} ${(history / DAY).toFixed(2)}d over ${count} points: ${labels.join(' | ')}`)
      }
    })

    // Eight readings from a three-day-old product, viewed on "All", all read "thg 1 26" before
    // the format stopped coming from the range button.
    expect(collisions, `Dates a reader cannot tell apart:\n${collisions.join('\n')}`).toEqual([])
  })

  it('reads the format off the data, not off the range that was selected', () => {
    const times = (history, count) => Array.from({ length: count }, (_, i) =>
      new Date(END - history + (history * i) / (count - 1)).toISOString())

    for (const locale of LOCALES) {
      // Inside a day, the date is the same on every reading and only the clock separates them.
      const clock = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' })
      const within = times(DAY / 4, 8)
      expect(dateLabels(within, locale)).toEqual(within.map((time) => clock.format(new Date(time))))

      // Across three years, the month and year do it, and no finer detail is spent.
      const wide = times(1100 * DAY, 8)
      const monthly = new Intl.DateTimeFormat(locale, { month: 'short', year: '2-digit' })
      expect(dateLabels(wide, locale)).toEqual(wide.map((time) => monthly.format(new Date(time))))

      // Three days is neither: the month and year repeat, so the format has to get finer.
      const short = times(3 * DAY, 8)
      expect(new Set(dateLabels(short, locale)).size).toBe(8)
      expect(dateLabels(short, locale)).not.toEqual(short.map((time) => monthly.format(new Date(time))))
    }
  })

  it('clamps the ends inward so no label leaves the viewBox', () => {
    const outside = []

    eachDateLayout(({ locale, gutter, viewWidth, count, xs, labels }) => {
      labels.forEach((label, index) => {
        const [left, right] = drawnSpan(label, xs[index], viewWidth)
        if (left < 0 || right > viewWidth) {
          outside.push(`${locale} ${viewWidth}w gutter ${gutter}, ${count} readings: "${label}" spans ${left.toFixed(1)}..${right.toFixed(1)}`)
        }
      })
    })

    expect(outside, `Date labels the viewport would cut:\n${outside.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('leaves a gap between one date and the next', () => {
    const collisions = []

    eachDateLayout(({ locale, gutter, viewWidth, count, xs, labels }) => {
      let previous = null
      labels.forEach((label, index) => {
        const [left, right] = drawnSpan(label, xs[index], viewWidth)
        if (previous && left < previous.right) {
          collisions.push(`${locale} ${viewWidth}w gutter ${gutter}, ${count} readings: "${previous.label}" ends at ${previous.right.toFixed(1)} but "${label}" starts at ${left.toFixed(1)}`)
        }
        previous = { label, right }
      })
    })

    // Pinning the last label's far end to its gridline instead of clamping its centre pulled it
    // half its own width to the left, into the label before it: ten readings on the default 1 Day
    // view put "27.1., 01 Uhr" and "27.1., 03 Uhr" 15.7 units on top of each other. Neither was cut
    // off and neither was repeated, and a reader could not read either of them.
    expect(collisions, `Dates drawn on top of each other:\n${collisions.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('buys the room with shorter wording, never with fewer labels or repeated ones', () => {
    // Making room by dropping gridlines is the other way to stop labels colliding, and it is the
    // one that loses readings. How many readings get dated is settled by datedIndices before the
    // wording is chosen; every one of them keeps a label, and that label still names an instant
    // no other one names, however tight the plot gets.
    const lost = []

    eachDateLayout(({ locale, gutter, viewWidth, innerWidth, count, labels }) => {
      const expected = datedIndices(count, innerWidth).length
      if (labels.length !== expected) lost.push(`${locale} ${viewWidth}w gutter ${gutter}: ${labels.length} labels for ${expected} dated readings`)
      if (new Set(labels).size !== labels.length) {
        lost.push(`${locale} ${viewWidth}w gutter ${gutter}, ${count} readings: ${labels.join(' | ')}`)
      }
    })

    expect(lost, `Readings the axis stopped naming:\n${lost.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('takes the wordier format when there is room and a shorter one when there is not', () => {
    // The whole mechanism in one case: nine readings across a day and a half, so the format has to
    // carry an hour. Widen the y-axis gutter until the labels no longer fit and the axis answers
    // with a narrower rendering of the same instants rather than with an overlap.
    const count = 9
    const times = Array.from({ length: count }, (_, i) =>
      new Date(END - 1.5 * DAY + (1.5 * DAY * i) / (count - 1)).toISOString())

    const shortened = []
    for (const locale of LOCALES) {
      const width = (gutter) => {
        const xs = Array.from({ length: count }, (_, i) =>
          gutter + (i / (count - 1)) * (CHART_WIDTH - gutter - RIGHT_PADDING))
        const labels = dateLabels(times, locale, { xs, viewWidth: CHART_WIDTH })
        return Math.max(...labels.map((label) => measuredWidth(label, DATE_FONT_SIZE)))
      }

      const roomy = width(44)
      const cramped = width(WIDEST_GUTTER)
      expect(cramped, `${locale} widened its dates for a ${WIDEST_GUTTER}-unit gutter`).toBeLessThanOrEqual(roomy)
      if (cramped < roomy) shortened.push(locale)
    }

    // A locale whose dates are short enough either way is entitled to keep them, so the assertion
    // above passes for most of the list on its own. Somebody has to be doing the work.
    //
    // This one does want the runtime to carry data for the seven locales, unlike the width checks
    // above: a build that resolves them all to the same data has one locale in this list, and one
    // locale that keeps its wording is a legitimate outcome rather than a bug in the ladder.
    expect(
      shortened.length,
      `no locale shortened its dates when the plot narrowed, out of ${new Set(LOCALES.map((l) => new Intl.DateTimeFormat(l).resolvedOptions().locale)).size} this runtime tells apart`
    ).toBeGreaterThan(0)
  })
})

describe('date point thinning', () => {
  // The two plot widths a VND chart actually leaves: 800 and 320 wide minus the "50 Tr" gutter
  // (56) and the 20-unit right padding.
  const FULL_PLOT = 724
  const PHONE_PLOT = 244

  it('keeps the ten-date density the 800-unit chart always had', () => {
    expect(datedIndices(8, FULL_PLOT)).toEqual([0, 1, 2, 3, 4, 5, 6, 7])
    expect(datedIndices(10, FULL_PLOT)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
    expect(datedIndices(20, FULL_PLOT)).toEqual([0, 2, 4, 6, 8, 10, 12, 14, 16, 18])
  })

  it('dates four points, not ten, in the plot a 320px phone leaves', () => {
    // Ten labels sharing 244 units get 24 apiece against the 83 the widest short-format date
    // needs; four get 81. The reader loses six gridline dates and gains the ability to read the
    // remaining four.
    expect(datedIndices(8, PHONE_PLOT)).toEqual([0, 2, 4, 6])
    expect(datedIndices(20, PHONE_PLOT)).toEqual([0, 5, 10, 15])
  })

  it('never asks for a gap narrower than the narrowest date wording', () => {
    // 157 units is the tightest plot in the matrix: 320 wide behind the widest fuzzed gutter.
    // Four of twelve readings would sit 57.1 units apart — under the 58 the widest day+hour
    // rendering measures — and no format on the ladder can lay that out, so the stride grows
    // and three dates share the room instead.
    expect(datedIndices(12, 157)).toEqual([0, 5, 10])
  })

  it('holds the three-date floor on the tightest plots', () => {
    expect(datedIndices(6, 157)).toEqual([0, 2, 4])
    // 116 units is exactly two 58-unit gaps, the narrowest room where three labels lay out.
    expect(datedIndices(3, 116)).toEqual([0, 1, 2])
    // One unit narrower and the gap floor thins even a three-reading series to its ends — the
    // early path that used to date every small series skipped the floor, and the sweep caught
    // real overlaps at the product page's own widths.
    expect(datedIndices(3, 100)).toEqual([0, 2])
  })

  // The floor under the floor. The product page's shell and card padding leave a 320px phone a
  // 198-unit chart, and behind a 9-digit plain-label gutter that is a plot in the seventies —
  // under two MIN_DATE_GAPs, so the overlap-proof stride outranks the three-label target and TWO
  // dates ship. Two a format can lay out beat three that collide; this pins the trade so a future
  // "fix" to the count re-derives the geometry instead of reintroducing the overlap.
  it('drops to two dates, never fewer, when the plot cannot hold three 58-unit gaps', () => {
    for (const plot of [72, 90, 115]) {
      const indices = datedIndices(20, plot)
      expect(indices.length, `${plot}-unit plot`).toBe(2)
    }
    // The 3-label boundary is count-dependent because the stride is an integer: with 20 readings
    // the third label needs stride ≤ 9, i.e. room ≥ ceil(58 · 19 / 9) = 123 units, not 2 · 58.
    expect(datedIndices(20, 123).length).toBeGreaterThanOrEqual(3)
    // 72 units is the narrowest plot the product page can produce (198-unit chart behind a
    // 9-digit plain-label gutter); from there up, two dates always ship. Below one 58-unit gap
    // even a pair cannot lay out, and the floor honestly draws one label rather than two that
    // collide — reachable by no real viewport, pinned so the trade is deliberate.
    for (const plot of [72, 115, 157, 244, 724]) {
      expect(datedIndices(20, plot).length, `${plot}-unit plot`).toBeGreaterThanOrEqual(2)
    }
    expect(datedIndices(20, 40)).toEqual([0])
  })
})

describe('axis domain', () => {
  it('snaps a real range out to the round numbers around it', () => {
    const { low, high, step, values } = axisDomain(12900000, 45000000)
    expect(low).toBeLessThanOrEqual(12900000)
    expect(high).toBeGreaterThanOrEqual(45000000)
    expect(values[0]).toBe(low)
    expect(values[values.length - 1]).toBe(high)
    expect((high - low) / step).toBe(values.length - 1)
  })

  it('gives a flat series a band, so its ticks are distinct prices and the line is not on the floor', () => {
    const { low, high } = axisDomain(15900000, 15900000)
    expect(low).toBeLessThan(15900000)
    expect(high).toBeGreaterThan(15900000)

    // The old `|| 1` produced "15.900.000, 15.900.000, 15.900.001, 15.900.001, 15.900.001".
    const labels = axisTicks(15900000, 15900000, 'vi-VN').ticks.map((tick) => tick.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('keeps a series stuck at zero on a non-negative axis', () => {
    const { low, ticks } = axisTicks(0, 0, 'vi-VN')
    expect(low).toBe(0)
    for (const tick of ticks) expect(tick.value).toBeGreaterThanOrEqual(0)
  })
})

describe('currency symbol', () => {
  it('uses whatever the reader\'s locale calls the currency', () => {
    expect(currencySymbol('VND', 'vi-VN')).toBe('₫')
    expect(currencySymbol('VND', 'en-US')).toBe('₫')
    // en-AU is the one in the chart's list that writes the code where the others write the symbol,
    // which is the whole reason this is read out of Intl instead of tabulated. It does ask the
    // runtime to carry en-AU: a build that has only the root locale answers "₫" here and is right
    // to, so a failure on this line is a question about the runtime, not about the axis.
    expect(currencySymbol('VND', 'en-AU'), 'this runtime resolves en-AU to something else').toBe('VND')
  })

  it('prints nothing rather than guessing when there is no usable currency', () => {
    expect(currencySymbol(undefined, 'vi-VN')).toBe('')
    expect(currencySymbol('NOT-A-CODE', 'vi-VN')).toBe('')
  })
})
