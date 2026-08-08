import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const LIMIT = 320

// Only `width` and `min-width` can force a viewport to overflow. `max-width` is a CAP — it
// constrains rather than expands, so `max-width: 1200px` on a page container is healthy and
// must NOT be flagged. Media queries are legitimate and excluded separately.
const CSS_WIDTH = /(?<!max-)(?:min-)?width\s*:\s*(\d+)px/g
// Tailwind arbitrary values, same reasoning: `w-[380px]` and `min-w-[380px]` overflow;
// `max-w-[1400px]` does not. The lookbehind is required here too: without it, `\b(?:min-w|w)-\[`
// still matches the "w-[" tail inside "max-w-[1400px]" (a word boundary sits right after the
// hyphen), which would false-positive on the Task 4 shell container in RootLayout.jsx.
const TW_WIDTH = /(?<!max-)\b(?:min-w|w)-\[(\d+)px\]/g

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
