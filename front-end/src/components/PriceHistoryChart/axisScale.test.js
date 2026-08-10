import { describe, expect, it } from 'vitest'
import widths from './widths.fixture.json'
import {
  axisDomain,
  axisGutter,
  axisTicks,
  currencySymbol,
  dateLabels,
  estimateLabelWidth,
  labelAnchor,
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
//   - that the width estimate never under-reserves is checked against widths.fixture.json, 1,891
//     strings measured in a real browser in both faces the app renders in. The previous suite
//     asserted `estimateLabelWidth(w) <= ceil(estimateLabelWidth(w)) + TICK_GAP - TICK_GAP`, which
//     is true of any advance table at all: halving the digit advance kept it green while 35 ticks
//     clipped in Chrome.
//
// formatPrice passes `undefined` on this branch, so the reader's own browser locale decides how
// every number is written. Anything asserted for one locale has to hold for all of them, and this
// machine resolves to en-AU, so nothing below is pinned to vi-VN or en-US punctuation.

const LOCALES = ['vi-VN', 'en-AU', 'en-US', 'ja-JP', 'de-DE', 'fr-FR', 'ko-KR']

// Real Vietnamese price points, plus the two degenerate ends: a stored 0 and a car.
const MAGNITUDES = [0, 199000, 1290000, 12900000, 45000000, 129000000, 1290000000, 45000000000]

// Fraction of the price the series moves across. 9 is a tenfold rise over a product's whole
// tracked life; 0 is a series that never moved.
const SPANS = [0, 0.0001, 0.001, 0.01, 0.05, 0.2, 0.5, 1, 3, 9]

const DAY = 24 * 60 * 60 * 1000
const END = Date.UTC(2026, 0, 26, 17, 43)
const HISTORIES = [DAY / 8, DAY / 4, DAY, 2 * DAY, 3 * DAY, 20 * DAY, 100 * DAY, 400 * DAY, 1100 * DAY]
const POINT_COUNTS = [8, 10]

const CURRENCIES = ['VND', 'USD', 'EUR', 'JPY', 'KRW', 'AUD', 'XPF', 'CHF']

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

// The largest reading the browser gave this string, in em. Absent means the fixture and the code
// have drifted: re-measure rather than skip, or the width tests stop covering anything.
function measuredWidth(text, fontSize) {
  const em = widths.em[text]
  expect(em, `"${text}" is not in widths.fixture.json — re-measure it in a browser`).toBeTypeOf('number')
  return em * fontSize
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
  it('never claims a label is narrower than the browser draws it', () => {
    const under = []

    for (const [text, em] of Object.entries(widths.em)) {
      const estimate = estimateLabelWidth(text, 1)
      if (estimate < em) under.push(`"${text}": estimated ${estimate.toFixed(3)}em, measured ${em.toFixed(3)}em`)
    }

    expect(under, `Labels the estimate under-reserves for:\n${under.slice(0, 20).join('\n')}`).toEqual([])
  })

  it('is measured against every string the axes can produce', () => {
    const unmeasured = new Set()
    eachChart(({ locale, ticks }) => {
      for (const { label } of ticks) if (!(label in widths.em)) unmeasured.add(`${locale}: "${label}"`)
    })
    eachDateAxis(({ locale, labels }) => {
      for (const label of labels) if (!(label in widths.em)) unmeasured.add(`${locale}: "${label}"`)
    })
    for (const locale of LOCALES) {
      for (const code of CURRENCIES) {
        const unit = currencySymbol(code, locale)
        if (unit && !(unit in widths.em)) unmeasured.add(`${locale}: "${unit}"`)
      }
    }

    expect([...unmeasured], `Strings with no browser measurement behind them:\n${[...unmeasured].slice(0, 20).join('\n')}`).toEqual([])
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

  it('anchors the ends inward so no label leaves the viewBox', () => {
    const outside = []
    const chartWidth = 800
    // The widest gutter the y-axis can ask for still leaves the first date at x = gutter, and the
    // last is always at chartWidth - 20.
    for (const gutter of [44, 105, 199]) {
      const innerWidth = chartWidth - gutter - 20

      eachDateAxis(({ locale, labels }) => {
        labels.forEach((label, index) => {
          const x = gutter + (index / (labels.length - 1)) * innerWidth
          const drawn = measuredWidth(label, DATE_FONT_SIZE)
          const anchor = labelAnchor(x, label, chartWidth)
          const left = anchor === 'start' ? x : anchor === 'end' ? x - drawn : x - drawn / 2
          if (left < 0 || left + drawn > chartWidth) {
            outside.push(`${locale} gutter ${gutter}: "${label}" spans ${left.toFixed(1)}..${(left + drawn).toFixed(1)}`)
          }
        })
      })
    }

    expect(outside, `Date labels the viewport would cut:\n${outside.slice(0, 20).join('\n')}`).toEqual([])
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
    expect(currencySymbol('VND', 'en-AU')).toBe('VND')
  })

  it('prints nothing rather than guessing when there is no usable currency', () => {
    expect(currencySymbol(undefined, 'vi-VN')).toBe('')
    expect(currencySymbol('NOT-A-CODE', 'vi-VN')).toBe('')
  })
})
