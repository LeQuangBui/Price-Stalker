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
