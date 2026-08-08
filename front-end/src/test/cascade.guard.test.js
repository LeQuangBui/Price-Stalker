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

  it('token definitions stay OUTSIDE the layer (custom properties, not rules)', () => {
    const layerStart = css.indexOf('@layer base')
    expect(css.indexOf(':root {')).toBeLessThan(layerStart)
    expect(css.indexOf('@theme inline')).toBeLessThan(layerStart)
  })
})
