import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

// Component stylesheets are UNLAYERED, so when two of them define the same class the
// later-emitted file silently wins on every page — including pages that import neither.
// Each entry here is a known remaining collision awaiting its Phase 2b conversion.
// This list may only ever shrink. Do not add to it to make a build pass.
const ALLOWED = new Set([
  'product-price',       // ProductList.css + Bookmarks.css — both retire in Phase 2b
  'product-name',        // ProductList.css + Bookmarks.css — values agree, benign
  'bookmark-info',       // UserProfile.css + Bookmarks.css
  'no-bookmarks',        // UserProfile.css + Bookmarks.css
  'bookmark-name-input', // AddToBookmark.css + Bookmarks.css
  'error',               // UserProfile.css + Bookmarks.css — both resolve to var(--danger)
])

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

describe('cross-stylesheet collision guard', () => {
  it('no class is defined in two component stylesheets, except known remainders', () => {
    const owners = new Map()
    for (const file of walk(SRC)) {
      if (!file.endsWith('.css') || basename(file) === 'index.css') continue
      const text = readFileSync(file, 'utf8')
      for (const m of text.matchAll(/^\s*\.([a-zA-Z0-9_-]+)\s*[,{]/gm)) {
        const cls = m[1]
        if (!owners.has(cls)) owners.set(cls, new Set())
        owners.get(cls).add(basename(file))
      }
    }
    const offenders = []
    for (const [cls, files] of owners) {
      if (files.size > 1 && !ALLOWED.has(cls)) {
        offenders.push(`${cls}: ${[...files].join(' + ')}`)
      }
    }
    expect(offenders, `Class defined in multiple stylesheets — later emit silently wins:\n${offenders.join('\n')}`).toEqual([])
  })

  it('the allowlist contains no entry that is already resolved', () => {
    const owners = new Map()
    for (const file of walk(SRC)) {
      if (!file.endsWith('.css') || basename(file) === 'index.css') continue
      for (const m of readFileSync(file, 'utf8').matchAll(/^\s*\.([a-zA-Z0-9_-]+)\s*[,{]/gm)) {
        if (!owners.has(m[1])) owners.set(m[1], new Set())
        owners.get(m[1]).add(basename(file))
      }
    }
    const stale = [...ALLOWED].filter((c) => (owners.get(c)?.size ?? 0) <= 1)
    expect(stale, `Allowlist entries no longer colliding — delete them:\n${stale.join('\n')}`).toEqual([])
  })
})
