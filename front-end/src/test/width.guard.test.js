import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const LIMIT = 320

// Known blind spots — not caught by either pattern below, by design:
// - `minmax()` grid sizing, e.g. Bookmarks.css:86's
//   `grid-template-columns: repeat(auto-fill, minmax(380px, 1fr))` — a real 380px minimum, over
//   LIMIT, but not `width:`/`w-[…]` syntax so neither regex sees it. Bookmarks.css is Phase 2's
//   to convert; this guard doesn't cover it yet.
// - Sub-LIMIT values that combine to overflow. `AddByUrl.css:11`'s `min-width: 250px` is the one
//   still standing: under the floor individually, so deliberately unflagged, even though it wraps
//   in the same row as `.search-input` inside an expanded bookmark card. `.search-input` carried
//   the same 250px until slice 2b-ii and now uses `flex: 1 1 250px; min-width: 0`, which keeps the
//   wrap and drops the floor. Slice 2b-iv gives AddByUrl the same treatment.

// Only `width` and `min-width` can force a viewport to overflow. The lookbehind requires that
// nothing directly before "width" is a word character or a hyphen — i.e. "width" must sit at a
// property-name boundary. This excludes `max-width` (a CAP, not an overflow risk) but, unlike a
// literal `(?<!max-)` check, it also excludes *any* other `-width` property or custom token
// (`border-width`, `--card-width`, a future `--drawer-width`/`--rail-width` design token) rather
// than special-casing just the one word "max". Media queries are excluded separately.
const CSS_WIDTH = /(?<![\w-])(?:min-)?width\s*:\s*(\d+)px/g
// Tailwind arbitrary values, same reasoning: `w-[380px]` and `min-w-[380px]` overflow;
// `max-w-[1400px]` does not, nor would a hypothetical `rail-w-[380px]`. Boundary-anchored for the
// same reason as CSS_WIDTH above — without it, `\b(?:min-w|w)-\[` still matches the "w-[" tail
// inside "max-w-[1400px]" (a word boundary sits right after the hyphen), which would
// false-positive on the Task 4 shell container in RootLayout.jsx.
const TW_WIDTH = /(?<![\w-])(?:min-w|w)-\[(\d+)px\]/g

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function offendersIn(text, pattern) {
  const hits = []
  for (const line of text.split('\n')) {
    if (line.includes('@media')) continue
    pattern.lastIndex = 0
    let m
    while ((m = pattern.exec(line)) !== null) {
      if (Number(m[1]) > LIMIT) hits.push(m[0].trim())
    }
  }
  return hits
}

describe(`fixed width guard (nothing wider than ${LIMIT}px)`, () => {
  const files = walk(SRC)

  it('no CSS declares a fixed width that would overflow a 360px phone', () => {
    const offenders = []
    for (const file of files) {
      if (!file.endsWith('.css') || basename(file) === 'index.css') continue
      const hits = offendersIn(readFileSync(file, 'utf8'), CSS_WIDTH)
      if (hits.length) offenders.push(`${file}: ${hits.join(', ')}`)
    }
    expect(offenders, `Fixed widths over ${LIMIT}px:\n${offenders.join('\n')}`).toEqual([])
  })

  it('no JSX uses an arbitrary Tailwind width that would overflow a 360px phone', () => {
    const offenders = []
    for (const file of files) {
      if (!/\.jsx$/.test(file) || /\.test\.jsx$/.test(file)) continue
      const hits = offendersIn(readFileSync(file, 'utf8'), TW_WIDTH)
      if (hits.length) offenders.push(`${file}: ${hits.join(', ')}`)
    }
    expect(offenders, `Arbitrary widths over ${LIMIT}px:\n${offenders.join('\n')}`).toEqual([])
  })
})
