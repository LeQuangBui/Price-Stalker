import { afterEach, describe, expect, it } from 'vitest'
import { formatPrice } from './formatters'

// The gap Intl puts before the ₫ is a no-break space, which is exactly why a price string has
// no break opportunity in it and gets sliced rather than wrapped inside an overflow-hidden card.
const NBSP = '\u00a0'

// An omitted `locales` argument resolves against the host's ICU default, which a test cannot
// change at runtime. Standing a constructor in front of Intl.NumberFormat that fills in only
// that empty slot reproduces what a phone set to each language would do.
const RealNumberFormat = Intl.NumberFormat

function browserLanguage(locale) {
  function Stub(locales, options) {
    return new RealNumberFormat(locales === undefined ? locale : locales, options)
  }
  Stub.supportedLocalesOf = RealNumberFormat.supportedLocalesOf.bind(RealNumberFormat)
  Intl.NumberFormat = Stub
}

afterEach(() => {
  Intl.NumberFormat = RealNumberFormat
})

describe('formatPrice', () => {
  // Every column measurement behind the two-up product grid assumes the Vietnamese rendering,
  // which is also the narrowest one. A browser set to English gives the same value as
  // `VND 12,900,000`, four characters wider, and the card is overflow-hidden around a string
  // with no break opportunity in it — so the extra width comes off the end of the number with
  // no ellipsis and no scrollbar to show anyone that digits went missing.
  it('renders VND identically whatever the browser language is', () => {
    const rendered = ['en-AU', 'en-US', 'vi-VN', 'ja-JP', 'de-DE'].map((locale) => {
      browserLanguage(locale)
      return formatPrice(12900000, 'VND')
    })

    expect(new Set(rendered).size, rendered.join(' | ')).toBe(1)
    expect(rendered[0]).toBe(`12.900.000${NBSP}₫`)
  })

  it('groups VND thousands with dots and carries no minor units', () => {
    browserLanguage('en-AU')
    expect(formatPrice(999999999, 'VND')).toBe(`999.999.999${NBSP}₫`)
    expect(formatPrice(150000, 'VND')).toBe(`150.000${NBSP}₫`)
  })

  // Only đồng is pinned. Every other currency still follows the reader's own locale, so its
  // rendered width is whatever that locale makes it — and measured, some of those renderings run
  // past the card's clip edge at 360px. They are no longer sliced there: the price value carries
  // `overflow-wrap: anywhere`, which is currency-agnostic, so an over-wide string wraps with every
  // character still on screen. Fitting on one line is what is not promised.
  it('leaves other currencies on the browser language', () => {
    browserLanguage('en-US')
    const american = formatPrice(1299, 'USD')
    browserLanguage('de-DE')
    const german = formatPrice(1299, 'USD')

    expect(american).not.toBe(german)
  })

  it('shows a dash for a missing price and passes a non-number straight through', () => {
    expect(formatPrice(null, 'VND')).toBe('—')
    expect(formatPrice(undefined, 'VND')).toBe('—')
    expect(formatPrice('', 'VND')).toBe('—')
    expect(formatPrice('n/a', 'VND')).toBe('n/a')
  })

  it('falls back to a plain number when the currency code is not a real one', () => {
    expect(formatPrice(1500, 'NOTACURRENCY')).toBe(Number(1500).toLocaleString(undefined))
  })
})
