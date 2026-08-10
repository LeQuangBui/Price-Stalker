import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

// Component stylesheets are UNLAYERED, so when two of them define the same class the
// later-emitted file silently wins on every page — including pages that import neither.
//
// class -> the EXACT set of stylesheets permitted to mention it. Keying by owner set (not by
// bare name) is what makes this a ratchet: adding the class to a THIRD file, or re-adding it to
// a file it was removed from, is a new violation even though the name is listed. This list may
// only ever shrink. Do not add to it, or widen an entry, to make a build pass.
const ALLOWED = new Map([
  // Retired with Bookmarks.css in slice 2b-ii's second half. `bookmark-info` and `no-bookmarks`
  // left this list when UserProfile.css went: Bookmarks.css still defines both, but a single owner
  // is not a collision and a listed non-collision fails the stale-entry test below.
  ['bookmark-name-input', ['AddToBookmark.css', 'Bookmarks.css']],
  ['error', ['AddToBookmark.css', 'Alerts.css', 'Bookmarks.css']], // all resolve to var(--danger)
  // Compound state-modifier classes. Each is only ever written as a descendant/compound of an
  // owning block (`.foo.success`, `.bar .active`), so the declarations never meet on one element.
  // Verified: no live collision. Recorded as permitted, not as debt.
  ['success', ['AddToBookmark.css', 'ProductDetail.css']],
  ['danger', ['Alerts.css', 'ConfirmDialog.css', 'ProductDetail.css']],
  ['active', ['PriceHistoryChart.css', 'ProductDetail.css', 'ProductSearch.css']],
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

// Every class token in every rule prelude — not just a line-leading single class. A bare
// `/^\s*\.name\s*[,{]/` misses compound (`.a.b`), pseudo (`.a:hover`) and descendant
// (`.a .b`) forms, which is exactly how a deleted rule can be re-added unnoticed.
function collectOwners() {
  const owners = new Map()
  for (const file of walk(SRC)) {
    if (!file.endsWith('.css') || basename(file) === 'index.css') continue
    const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const rule of text.matchAll(/(?:^|[}{;])([^{}@;]*?)\{/g)) {
      for (const c of rule[1].matchAll(/\.([a-zA-Z0-9_-]+)/g)) {
        if (!owners.has(c[1])) owners.set(c[1], new Set())
        owners.get(c[1]).add(basename(file))
      }
    }
  }
  return owners
}

const key = (files) => [...files].sort().join(' + ')

describe('cross-stylesheet collision guard', () => {
  it('no class is mentioned by two component stylesheets, except known remainders', () => {
    const offenders = []
    for (const [cls, files] of collectOwners()) {
      if (files.size > 1 && key(files) !== key(ALLOWED.get(cls) ?? [])) {
        offenders.push(`${cls}: ${key(files)}`)
      }
    }
    expect(
      offenders,
      `Class defined in multiple stylesheets — later emit silently wins:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('the allowlist contains no entry that is already resolved or misrecorded', () => {
    const owners = collectOwners()
    const stale = []
    for (const [cls, expected] of ALLOWED) {
      const actual = owners.get(cls) ?? new Set()
      if (actual.size <= 1) stale.push(`${cls}: no longer collides (owners: ${key(actual) || 'none'})`)
      else if (key(actual) !== key(expected)) {
        stale.push(`${cls}: recorded ${key(expected)} but found ${key(actual)}`)
      }
    }
    expect(stale, `Allowlist no longer matches reality — update or delete:\n${stale.join('\n')}`).toEqual([])
  })
})
