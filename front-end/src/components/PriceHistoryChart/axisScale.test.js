import { describe, expect, it } from 'vitest'
import {
  axisDomain,
  axisGutter,
  axisTicks,
  currencySymbol,
  estimateLabelWidth,
  TICK_GAP
} from './axisScale'

// The chart shipped with a hardcoded 60-unit gutter and full currency strings on every tick, and
// nothing in the suite could see the result: a full VND amount needs 56-114 user units to draw, so
// the SVG viewport cut the leading digits off and five different prices rendered as one string.
// jsdom has no layout engine, so these tests assert the two properties the fix actually rests on —
// the labels are distinct, and the gutter reserved for them is at least as wide as they are. The
// real-browser measurements that confirm the width estimate is conservative live in the fix report.

// formatPrice passes `undefined` on this branch, so the reader's own browser locale decides how
// every number is written. Anything asserted for one locale has to hold for all of them.
const LOCALES = ['vi-VN', 'en-AU', 'en-US']

// Real Vietnamese price points, 6 to 10 digits: a phone case, a kettle, a laptop, a motorbike, a
// second-hand car.
const MAGNITUDES = [199000, 1290000, 12900000, 45000000, 129000000, 1290000000]

// Fraction of the price the series moves across. 1 is a doubling; 0 is a series that never moved.
const SPANS = [1, 0.5, 0.2, 0.05, 0.01, 0.001, 0.0001, 0]

describe('axis tick labels', () => {
  it.each(LOCALES)('keeps all five ticks distinct across every price range (%s)', (locale) => {
    const collisions = []

    for (const base of MAGNITUDES) {
      for (const span of SPANS) {
        const { ticks } = axisTicks(base, base + base * span, locale)
        const labels = ticks.map((tick) => tick.label)
        if (new Set(labels).size !== labels.length) {
          collisions.push(`${base} +${span * 100}% -> ${labels.join(' | ')}`)
        }
      }
    }

    expect(collisions, `Ticks a reader cannot tell apart:\n${collisions.join('\n')}`).toEqual([])
  })

  it.each(LOCALES)('reserves a gutter at least as wide as the labels it draws (%s)', (locale) => {
    const overflows = []

    for (const base of MAGNITUDES) {
      for (const span of SPANS) {
        const { ticks } = axisTicks(base, base + base * span, locale)
        const labels = ticks.map((tick) => tick.label)
        const gutter = axisGutter(labels)

        for (const label of labels) {
          // Labels are end-anchored at `gutter - TICK_GAP`, so this much room is what they get
          // before they cross x=0 and the viewBox clips them.
          if (estimateLabelWidth(label) > gutter - TICK_GAP) {
            overflows.push(`${base} +${span * 100}%: "${label}" needs ${estimateLabelWidth(label)}u of ${gutter - TICK_GAP}u`)
          }
        }
      }
    }

    expect(overflows, `Labels wider than their gutter:\n${overflows.join('\n')}`).toEqual([])
  })

  it('spends decimals only where the span needs them', () => {
    // ICU separates a Vietnamese compact number from its unit with U+00A0, not a plain space.
    const vi = (...labels) => labels.map((label) => label.replace(' ', '\u00a0'))

    // 1.29M to 129M: whole units already separate the ticks.
    expect(axisTicks(1290000, 129000000, 'vi-VN').ticks.map((t) => t.label))
      .toEqual(vi('1 Tr', '33 Tr', '65 Tr', '97 Tr', '129 Tr'))

    // A 50.000 d move on a 12.9M laptop needs two, or every tick would read "12,9 Tr".
    expect(axisTicks(12900000, 12950000, 'vi-VN').ticks.map((t) => t.label))
      .toEqual(vi('12,90 Tr', '12,91 Tr', '12,93 Tr', '12,94 Tr', '12,95 Tr'))
  })

  it('abbreviates rather than printing a full currency amount per tick', () => {
    for (const locale of LOCALES) {
      for (const { label } of axisTicks(12900000, 45000000, locale).ticks) {
        // The string that used to be drawn here — "12.900.000 d" and friends — is 11+ characters.
        expect(label.length, `${locale}: "${label}"`).toBeLessThanOrEqual(9)
      }
    }
  })

  it('keeps the gutter inside the 800-unit viewBox for the widest label it can emit', () => {
    for (const locale of LOCALES) {
      // Near-flat span at the top of the range forces the longest fallback labels.
      const { ticks } = axisTicks(1290000000, 1290000004, locale)
      expect(axisGutter(ticks.map((t) => t.label))).toBeLessThan(200)
    }
  })
})

describe('axis domain', () => {
  it('leaves a real range exactly as it found it', () => {
    expect(axisDomain(12900000, 45000000)).toEqual({ low: 12900000, high: 45000000 })
  })

  it('gives a flat series a band, so its ticks are distinct prices and the line is not on the floor', () => {
    const { low, high } = axisDomain(15900000, 15900000)
    expect(low).toBeLessThan(15900000)
    expect(high).toBeGreaterThan(15900000)

    // The old `|| 1` produced "15.900.000, 15.900.000, 15.900.001, 15.900.001, 15.900.001".
    const labels = axisTicks(15900000, 15900000, 'vi-VN').ticks.map((t) => t.label)
    expect(new Set(labels).size).toBe(5)
  })
})

describe('label width estimate', () => {
  it('grows with the label, so a longer currency widens the axis instead of being cut', () => {
    expect(estimateLabelWidth('129,0 Tr')).toBeGreaterThan(estimateLabelWidth('129M'))
    expect(axisGutter(['129,0 Tr'])).toBeGreaterThan(axisGutter(['129M']))
  })

  it('counts group separators as narrower than digits', () => {
    expect(estimateLabelWidth('.')).toBeLessThan(estimateLabelWidth('0'))
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
