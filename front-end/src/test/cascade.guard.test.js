import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const css = readFileSync(join(SRC, 'index.css'), 'utf8')

describe('cascade layer guard', () => {
  it('index.css opens an @layer base block', () => {
    expect(css.indexOf('@layer base')).toBeGreaterThan(-1)
  })

  it('the form-element reset is layered, so utilities outrank font: inherit', () => {
    const layerStart = css.indexOf('@layer base')
    const reset = css.indexOf('font: inherit')
    expect(reset).toBeGreaterThan(layerStart)
  })

  it('the .btn system is layered, so utilities outrank it', () => {
    const layerStart = css.indexOf('@layer base')
    expect(css.indexOf('.btn {')).toBeGreaterThan(layerStart)
  })

  // All four of these must stay unlayered: :root and .dark define custom
  // properties, not cascading rules, and @theme inline / @custom-variant
  // define Tailwind config. Layering any of them breaks the token system
  // silently — in particular, layering .dark would break dark-mode theming,
  // and layering @custom-variant would break the `dark:` variant that drives it.
  it('token definitions stay OUTSIDE the layer (custom properties, not rules)', () => {
    const layerStart = css.indexOf('@layer base')
    expect(css.indexOf(':root {')).toBeLessThan(layerStart)
    expect(css.indexOf('.dark {')).toBeLessThan(layerStart)
    expect(css.indexOf('@theme inline')).toBeLessThan(layerStart)
    expect(css.indexOf('@custom-variant')).toBeLessThan(layerStart)
  })
})

describe('shared control primitives', () => {
  function block(name) {
    const start = css.indexOf(`\n${name} {`)
    return start === -1 ? '' : css.slice(start, css.indexOf('}', start))
  }

  it('.btn meets the 44px touch-target floor', () => {
    expect(block('.btn')).toMatch(/min-height:\s*44px/)
  })

  it('.retry-btn meets the 44px touch-target floor', () => {
    expect(block('.retry-btn')).toMatch(/min-height:\s*44px/)
  })

  // Hard-coded names, not a scan: an unbridged token is invisible to a test that only knows the
  // ones already written down. `--primary-light`, `--accent-soft`, `--danger-dark`, `--warning` and
  // `--text-on-primary` are all still unbridged and this test does not know it. `--scrim` is here
  // because it was minted in slice 2b-iii for a single consumer, and a token with one consumer is
  // the kind that gets half-deleted: the :root value survives, the bridge goes, and the background
  // utility that reads it stops matching anything with no error anywhere.
  //
  // That utility is deliberately NOT named in full anywhere in this file. Tailwind v4 scans source
  // files as plain text and does not know what a comment is, so writing the class name here is
  // enough on its own to emit the rule into the bundle — verified by building with and without it.
  // The slice that consumes the token proves it compiled by grepping the built stylesheet for the
  // emitted rule, and that grep would have passed on the strength of this comment whether or not
  // the page ever used the class. Leave the name out so the check stays a real one.
  it('every semantic colour token this file knows about is bridged to a Tailwind utility', () => {
    for (const token of ['--color-success', '--color-success-deep', '--color-scrim']) {
      expect(css).toContain(token)
    }
  })

  it('the scrim is defined in both themes, not only in :root', () => {
    const root = css.slice(css.indexOf(':root {'), css.indexOf('.dark {'))
    const dark = css.slice(css.indexOf('.dark {'), css.indexOf('@theme inline'))
    expect(root).toMatch(/--scrim:/)
    expect(dark).toMatch(/--scrim:/)
  })
})

// `.bookmark-dropdown-status.error` used to draw its box — background, border, radius — from
// UserProfile.css's `.no-bookmarks, .error` rule, in a stylesheet the product page never imports.
// Slice 2b-ii retires that file, so the three declarations were re-homed onto the component that
// renders the element. Asserted here because nothing renders it under test and no screenshot
// covers it.
describe('re-homed cross-file boxes', () => {
  const addToBookmark = readFileSync(
    join(SRC, 'components', 'AddToBookmark', 'AddToBookmark.css'), 'utf8',
  )
  const start = addToBookmark.indexOf('.bookmark-dropdown-status.error')
  const errorRule = addToBookmark.slice(start, addToBookmark.indexOf('}', start))

  it('AddToBookmark owns its error box instead of inheriting it from another page', () => {
    expect(start).toBeGreaterThan(-1)
    expect(errorRule).toMatch(/background:\s*var\(--bg-primary\)/)
    expect(errorRule).toMatch(/border:\s*1px solid var\(--danger\)/)
    expect(errorRule).toMatch(/border-radius:\s*var\(--radius\)/)
  })

  // Same shape, second instance. `Bookmarks.css` was the only file declaring colour and background
  // on `.bookmark-name-input`, and AddToBookmark's own rule set neither — so the retirement left
  // the field's ink to preflight and its ground to the dropdown behind it. Both happen to match,
  // which is why nothing moved on screen and why nothing else here would go red.
  it('AddToBookmark owns its name field colours instead of inheriting them from another page', () => {
    const from = addToBookmark.indexOf('.bookmark-name-input {')
    const rule = addToBookmark.slice(from, addToBookmark.indexOf('}', from))
    expect(from).toBeGreaterThan(-1)
    expect(rule).toMatch(/color:\s*var\(--text-primary\)/)
    expect(rule).toMatch(/background:\s*var\(--bg-primary\)/)
  })
})

describe('safe-area opt-in', () => {
  const html = readFileSync(join(SRC, '..', 'index.html'), 'utf8')

  it('the viewport meta opts into safe-area insets', () => {
    expect(html).toMatch(/name="viewport"[^>]*viewport-fit=cover/)
  })

  it('shell spacing tokens are exposed to Tailwind', () => {
    for (const token of ['--spacing-tabbar', '--spacing-safe-b', '--spacing-shell-b']) {
      expect(css).toContain(token)
    }
  })
})
