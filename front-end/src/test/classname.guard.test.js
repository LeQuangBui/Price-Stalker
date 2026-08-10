import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')

// A className whose rules have been deleted still renders, still passes every query, and still
// passes every guard in this directory. collision.guard only sees names owned by two files;
// width, tokens, cascade and input-zoom all read CSS text, not the JSX that carries it. Proven by
// experiment on 2026-08-10: removing `.bookmark-date` from UserProfile.css, with three live call
// sites, left the suite at exactly its baseline.
//
// The check is inverted on purpose. Allowlisting UTILITIES would mean maintaining a ~392-token
// Tailwind list that grows on most commits. BESPOKE is the other side: the vocabulary this
// project's own CSS owns. It only shrinks — every stylesheet retirement takes a slice of it — and
// it reaches zero when the last one goes.
const BESPOKE = new Set([
  'active',
  'add-by-url',
  'add-by-url-btn',
  'add-by-url-error',
  'add-by-url-input',
  'add-by-url-status',
  'add-by-url-status-pill',
  'add-by-url-status-url',
  'add-to-bookmark',
  'add-to-bookmark-btn',
  'alert-action-button',
  'alert-actions',
  'alert-card',
  'alert-card-actions',
  'alert-card-controls',
  'alert-card-main',
  'alert-card-skeleton',
  'alert-checkbox',
  'alert-field',
  'alert-form',
  'alert-product-link',
  'alert-product-meta',
  'alert-status',
  'alerts-list',
  'alerts-state',
  'bookmark-create-btn',
  'bookmark-create-form',
  'bookmark-dropdown',
  'bookmark-dropdown-label',
  'bookmark-dropdown-status',
  'bookmark-dropdown-title',
  'bookmark-existing-action',
  'bookmark-existing-count',
  'bookmark-existing-list',
  'bookmark-existing-meta',
  'bookmark-existing-name',
  'bookmark-existing-row',
  'bookmark-name-input',
  'btn',
  'btn-block',
  'btn-danger',
  'btn-lg',
  'btn-primary',
  'btn-secondary',
  'btn-spinner',
  'chart-axis',
  'chart-container',
  'chart-empty',
  'chart-error',
  'chart-grid',
  'chart-header',
  'chart-label',
  'chart-line',
  'chart-point',
  'chart-skeleton',
  'checkbox-row',
  'compact',
  'confirm-dialog',
  'confirm-dialog-actions',
  'confirm-dialog-body',
  'confirm-dialog-cancel',
  'confirm-dialog-confirm',
  'confirm-dialog-message',
  'confirm-dialog-title',
  'danger',
  'empty-state',
  'empty-state-cta',
  'error',
  'error-message',
  'page-error',
  'panel-button',
  'panel-hint',
  'panel-input',
  'panel-label',
  'panel-message',
  'panel-text',
  'paused',
  'price-chart',
  'price-history-chart',
  'product-panel',
  'product-panel-header',
  'product-search',
  'product-search-row',
  'retry-btn',
  'search-button',
  'search-dropdown',
  'search-dropdown-btn',
  'search-dropdown-info',
  'search-dropdown-item',
  'search-dropdown-name',
  'search-dropdown-price',
  'search-input',
  'search-select',
  'search-status',
  'secondary',
  'skeleton',
  'skip-link',
  'sr-only',
  'success',
  'swiper',
  'swiper-btn',
  'swiper-dot',
  'swiper-dots',
  'swiper-next',
  'swiper-prev',
  'swiper-slide',
  'swiper-track',
  'time-range-selector',
])

// `search-layer` (Home.jsx:69) is deliberately absent. It has no rule and is not meant to: it is a
// marker for the z-40 layer in Home's three-way z-index contract with Header (z-50) and TabBar
// (z-40), and Home.test.jsx asserts it stays on the element. A name with no rule BY DESIGN is the
// one thing this guard would otherwise get wrong, so it is recorded here instead of allowlisted
// silently.

function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

// Every class SELECTOR in every stylesheet, index.css included — unlike collision.guard, which
// skips index.css because it is asking a different question. Here index.css is where `.btn`,
// `.empty-state`, `.skeleton` and `.retry-btn` live, and those are exactly the names the
// conversions move onto.
function definedClasses() {
  const defined = new Set()
  for (const file of walk(SRC)) {
    if (!file.endsWith('.css')) continue
    const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const rule of text.matchAll(/(?:^|[}{;])([^{}@;]*?)\{/g)) {
      for (const c of rule[1].matchAll(/\.([a-zA-Z0-9_-]+)/g)) defined.add(c[1])
    }
  }
  return defined
}

// className="a b", className={`a ${x}`}, className={'a'} and className={cx('a', …)}. Interpolated
// fragments are not resolvable statically and are not meant to be — the two runtime-built names in
// this tree (`search-dropdown-item${active…}`, `confirm-dialog-confirm${danger…}`) have their base
// written literally, which is the part this guard needs.
//
// This over-collects: a long `//` comment inside a multi-line cx() call — PriceDisplay.jsx has two —
// gets split into English words alongside the real tokens. Harmless, because both tests are gated on
// the CSS side. Test 1 only looks at tokens in BESPOKE and test 2 only at tokens that are defined
// class selectors, and "overflow" is neither. Not worth a JSX parser to tidy.
function usedClasses() {
  const used = new Map()
  for (const file of walk(SRC)) {
    if (!file.endsWith('.jsx')) continue
    const text = readFileSync(file, 'utf8')
    const pattern = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\}|\{cx\(([\s\S]*?)\)\})/g
    for (const m of text.matchAll(pattern)) {
      const line = text.slice(0, m.index).split('\n').length
      for (const token of (m[1] || m[2] || m[3] || m[4] || '').split(/[\s`'"{}$(),]+/)) {
        if (!token) continue
        if (!used.has(token)) used.set(token, new Set())
        used.get(token).add(`${file.slice(SRC.length + 1)}:${line}`)
      }
    }
  }
  return used
}

describe('bespoke className guard', () => {
  it('every bespoke className still resolves to a rule', () => {
    const defined = definedClasses()
    const orphans = []
    for (const [token, sites] of usedClasses()) {
      if (!BESPOKE.has(token) || defined.has(token)) continue
      orphans.push(`${token} — written at ${[...sites].join(', ')}, defined nowhere`)
    }
    expect(
      orphans,
      `className with no rule behind it. Either the rule was deleted and the carrier left behind\n` +
        `(delete the className too), or the name is a deliberate marker (exempt it, with a reason):\n` +
        orphans.join('\n'),
    ).toEqual([])
  })

  // The ratchet. BESPOKE is the project's own vocabulary and this slice is spending it down; a new
  // entry means a new hand-rolled stylesheet name, which is the direction Phase 2b exists to
  // reverse. Converting a page DELETES entries — that is the expected diff.
  it('the bespoke vocabulary only shrinks', () => {
    const defined = definedClasses()
    const added = [...usedClasses().keys()].filter((t) => defined.has(t) && !BESPOKE.has(t))
    expect(
      added,
      `New bespoke class names. Use utilities, or a primitive:\n${added.join('\n')}`,
    ).toEqual([])
  })
})
