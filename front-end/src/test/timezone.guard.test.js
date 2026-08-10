import { describe, expect, it } from 'vitest'

// The suite formats dates, and `Intl.DateTimeFormat` with no `timeZone` renders in the host's.
// Left unpinned, the same pinned instant reads "03:43" on a UTC+10 laptop and "17:43" on a UTC
// runner: the chart's date-axis tests then assert against strings that exist on one machine and
// not the other, and the browser-measured label widths they check against were only ever taken for
// one of the two sets. That is a green local run and a red CI run over code nobody touched.
//
// `test.env.TZ` in vite.config.js fixes the zone for every worker. This file is the ratchet on it:
// remove the pin and these fail here, next to the reason, instead of two thousand strings later in
// a chart test that reads like a fixture problem.
//
// None of this says anything about production. The chart renders in the reader's own zone, which
// is what a reader wants; it is the test run that has to be the same everywhere.

// 17:43Z. Chosen because every offset produces a different wall clock for it: UTC+10 turns it into
// the next day, UTC+5:30 into 23:13 with the minutes moved as well.
const INSTANT = Date.UTC(2026, 0, 26, 17, 43)

describe('test timezone', () => {
  it('is pinned, whatever zone the machine or the CI runner is in', () => {
    expect(process.env.TZ).toBe('UTC')
    expect(Intl.DateTimeFormat().resolvedOptions().timeZone).toBe('UTC')
  })

  it('is the zone Date itself reads local time in, not just the one Intl reports', () => {
    // Node re-reads TZ when it is assigned, but only the assignment ordering makes that stick
    // before the first Date is formatted. If the pin landed too late, the resolved zone above can
    // still say UTC while Date keeps the offset it cached.
    const date = new Date(INSTANT)
    expect(date.getTimezoneOffset()).toBe(0)
    expect(date.getHours()).toBe(17)
    expect(date.getDate()).toBe(26)
  })

  it('renders a fixed instant the same way for every locale the chart is tested in', () => {
    // A whole-hour zone would pass an hours-only check while still moving the minute; reading the
    // clock out catches UTC+5:30 as well.
    const clock = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
    expect(clock.format(new Date(INSTANT))).toBe('17:43')

    // The other locales are read as parts, not as rendered strings. How a locale words a clock is a
    // property of the runtime's ICU data rather than of the zone — a build carrying less of it
    // renders this instant in whatever it falls back to, and then the string differs while the zone
    // is perfectly right. The hour and the minute are what this file is about, so those are what it
    // asks for; the hour cycle is pinned because otherwise ko-KR answers 05 and means 17.
    for (const locale of ['vi-VN', 'en-AU', 'en-US', 'ja-JP', 'de-DE', 'fr-FR', 'ko-KR']) {
      const parts = new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })
        .formatToParts(new Date(INSTANT))
      const value = (type) => parts.find((part) => part.type === type)?.value
      expect(value('hour'), `${locale} put this instant at hour ${value('hour')}`).toBe('17')
      expect(value('minute'), `${locale} put this instant at minute ${value('minute')}`).toBe('43')
    }
  })
})
