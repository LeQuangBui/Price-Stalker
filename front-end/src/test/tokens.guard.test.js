import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

// src/test -> src
const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const HEX = /#[0-9a-fA-F]{3,8}\b/g
// White/black are legitimate constants (text on solid buttons), not theme colors.
const ALLOW = new Set(['#fff', '#ffffff', '#000', '#000000'])

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

const files = walk(SRC)

describe('design token guard (one token system)', () => {
  it('component CSS references var(--token), never raw hex colors (index.css is the single source)', () => {
    const offenders = []
    for (const file of files) {
      if (!file.endsWith('.css') || basename(file) === 'index.css') continue
      const hits = (readFileSync(file, 'utf8').match(HEX) || []).filter((h) => !ALLOW.has(h.toLowerCase()))
      if (hits.length) offenders.push(`${file}: ${hits.join(', ')}`)
    }
    expect(offenders, `Raw hex in component CSS — use a var(--token):\n${offenders.join('\n')}`).toEqual([])
  })

  it('JSX className/style use tokens, not raw hex colors', () => {
    const offenders = []
    for (const file of files) {
      if (!/\.(jsx|js)$/.test(file)) continue
      if (file.includes(`${join('src', 'test')}`) || /\.test\.(jsx|js)$/.test(file)) continue
      const text = readFileSync(file, 'utf8')
      const attrChunks = text.match(/className="[^"]*"|style=\{\{[^}]*\}\}/g) || []
      for (const chunk of attrChunks) {
        const hits = (chunk.match(HEX) || []).filter((h) => !ALLOW.has(h.toLowerCase()))
        if (hits.length) offenders.push(`${file}: ${hits.join(', ')}`)
      }
    }
    expect(offenders, `Raw hex in JSX className/style — use tokens:\n${offenders.join('\n')}`).toEqual([])
  })
})
