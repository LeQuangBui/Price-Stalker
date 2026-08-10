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

// The gap BESPOKE alone leaves open, and the reason this second set exists.
//
// Test 1 skips any token that is not in BESPOKE. Test 2 skips any token that is not a defined class
// selector. A name pruned from BESPOKE and deleted from its stylesheet in the SAME commit satisfies
// neither, so a className left behind in the JSX sails through both — and pruning-plus-deleting is
// precisely what retiring a stylesheet does, the one motion this guard was written for. Reproduced
// on 2026-08-10 on the live tree: deleting `.alerts-list` from `Alerts.css` and its entry from
// BESPOKE together left the suite at exactly its baseline with `className="alerts-list"` still on
// two elements in Alerts.jsx.
//
// RETIRED is where a pruned name goes, and test 1 reads BESPOKE ∪ RETIRED. That closes the ratchet
// at the moment of retirement instead of one commit later. RETIRED only grows, BESPOKE only
// shrinks, and no name is ever in both — the diff between them across a conversion commit is the
// list of names that slice spent. It starts at slice 2b-ii because that is when this file was
// written; 2b-i's retirements (`ProductList.css`, `Home.css`) predate it and cannot be recovered
// from a set that did not exist.
//
// Names below are the 46 that 2b-ii spent retiring `Bookmarks.css` and `UserProfile.css`, plus
// `empty-state-cta` — an `index.css` rule rather than a stylesheet retirement, moved here when its
// last consumer went to `btn btn-primary`. RETIRED is not only for whole-file conversions.
const RETIRED = new Set([
  'bookmark-actions',
  'bookmark-card',
  'bookmark-card-skeleton',
  'bookmark-date',
  'bookmark-dirty',
  'bookmark-editor',
  'bookmark-empty',
  'bookmark-header',
  'bookmark-info',
  'bookmark-item',
  'bookmark-name',
  'bookmark-products',
  'bookmarks-container',
  'bookmarks-grid',
  'bookmarks-header',
  'bookmarks-header-actions',
  'bookmarks-list',
  'bookmarks-section',
  'bookmarks-subtitle',
  'create-bookmark-btn',
  'create-bookmark-form',
  'delete-btn',
  'editor-actions',
  'empty-state-cta',
  'expand-btn',
  'no-bookmarks',
  'or-divider',
  'product-count',
  'product-name',
  'product-preview',
  'product-preview-info',
  'product-preview-link',
  'product-preview-placeholder',
  'product-price',
  'product-search-panel',
  'profile-action-link',
  'profile-actions',
  'profile-item',
  'profile-label',
  'profile-section',
  'profile-value',
  'remove-product-btn',
  'save-btn',
  'save-error',
  'secondary-header-btn',
  'submit-btn',
  'user-profile-container',
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
const AT_ATTRIBUTE = /className=(?:"([^"]*)"|\{`([^`]*)`\}|\{'([^']*)'\}|\{cx\(([\s\S]*?)\)\})/g

// The other half, and none of the four arms above can see it. `className={PAGE}` is a bare
// identifier, so the class string lives at the CONSTANT, one screen further up the file. Slice
// 2b-ii alone hoisted six of them — `PAGE` in two pages, `BOOKMARKS_GRID`, `PREVIEW_THUMB`,
// `SECTION`, `ACTION_LINK` — and `ACTION_LINK` is `btn btn-secondary min-h-11`, two bespoke names
// the attribute scan never reads. ProductList.jsx's `PRODUCT_GRID` and Header.jsx's `LINK` predate
// the slice and were invisible the same way.
//
// Module scope and SCREAMING_CASE only, which is the house convention for a hoisted class string
// (2b-i left the convention unsettled; the conversions since have all used it). A single-quoted or
// backtick literal, so a computed value is skipped rather than half-read.
const AT_CONSTANT = /^\s*(?:export\s+)?const\s+[A-Z][A-Z0-9_]*\s*=\s*(?:'([^']*)'|`([^`]*)`)/gm

// Both patterns over-collect, on purpose, and it costs nothing.
//
// A long `//` comment inside a multi-line cx() call — PriceDisplay.jsx has two — gets split into
// English words alongside the real tokens. A SCREAMING_CASE constant that is not a class string —
// NotificationBell.jsx's `LAST_SEEN_KEY = 'notif_last_seen_at'` — contributes one junk token. Both
// are harmless because both tests are gated on the CSS side: test 1 only looks at tokens in
// BESPOKE ∪ RETIRED and test 2 only at tokens that are defined class selectors, and "overflow" and
// "notif_last_seen_at" are neither. Not worth a JSX parser to tidy.
function usedClasses() {
  const used = new Map()
  for (const file of walk(SRC)) {
    if (!file.endsWith('.jsx')) continue
    const text = readFileSync(file, 'utf8')
    for (const pattern of [AT_ATTRIBUTE, AT_CONSTANT]) {
      pattern.lastIndex = 0
      for (const m of text.matchAll(pattern)) {
        const line = text.slice(0, m.index).split('\n').length
        for (const token of (m[1] || m[2] || m[3] || m[4] || '').split(/[\s`'"{}$(),]+/)) {
          if (!token) continue
          if (!used.has(token)) used.set(token, new Set())
          used.get(token).add(`${file.slice(SRC.length + 1)}:${line}`)
        }
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
      if (!(BESPOKE.has(token) || RETIRED.has(token)) || defined.has(token)) continue
      orphans.push(`${token} — written at ${[...sites].join(', ')}, defined nowhere`)
    }
    expect(
      orphans,
      `className with no rule behind it. Either the rule was deleted and the carrier left behind\n` +
        `(delete the className too), or the name is a deliberate marker (exempt it, with a reason).\n` +
        `A name pruned from BESPOKE this commit belongs in RETIRED — that is what caught this:\n` +
        orphans.join('\n'),
    ).toEqual([])
  })

  // The ratchet. BESPOKE is the project's own vocabulary and this slice is spending it down; a new
  // entry means a new hand-rolled stylesheet name, which is the direction Phase 2b exists to
  // reverse. Converting a page MOVES entries into RETIRED — that is the expected diff, and moving
  // rather than deleting is what keeps test 1 watching the name it just gave up.
  it('the bespoke vocabulary only shrinks', () => {
    const defined = definedClasses()
    const added = [...usedClasses().keys()].filter((t) => defined.has(t) && !BESPOKE.has(t))
    expect(
      added,
      `New bespoke class names. Use utilities, or a primitive:\n${added.join('\n')}`,
    ).toEqual([])
  })

  // What makes RETIRED self-enforcing rather than a convention.
  //
  // Test 1 above only watches a name that is in one of the two sets, so the escape hatch is to
  // DELETE the entry from BESPOKE instead of moving it — the same one-line diff, and the guard goes
  // quiet on a className that is now unbacked. Nothing in the file could see that, because both
  // sets are the file's only memory of what it used to know.
  //
  // So record the size of the memory. A name enters the vocabulary when a stylesheet coins it,
  // moves BESPOKE -> RETIRED when its rule is deleted, and never leaves: BESPOKE shrinks, RETIRED
  // grows, the union only ever holds steady or grows with it. A floor is therefore a true ratchet
  // and never needs raising to stay green — raise it only to tighten, after a legitimate addition
  // that test 2 has already forced you to justify.
  it('a retired name moves to RETIRED — deleting it outright shrinks the vocabulary', () => {
    const VOCABULARY = 154 // BESPOKE 108 + RETIRED 46, recorded 2026-08-10 at the end of slice 2b-ii
    expect(
      BESPOKE.size + RETIRED.size,
      `BESPOKE + RETIRED is smaller than the vocabulary this project has coined. A name was\n` +
        `deleted from BESPOKE rather than moved into RETIRED, which silences test 1 for it. Move\n` +
        `it. (If you genuinely added a bespoke name — test 2 will have said so — raise the floor.)`,
    ).toBeGreaterThanOrEqual(VOCABULARY)
  })
})
