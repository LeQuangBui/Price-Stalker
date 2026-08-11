import { describe, expect, it } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const SRC = join(dirname(fileURLToPath(import.meta.url)), '..')
const FLOOR = 16

// Below 16px iOS Safari zooms in when a form control takes focus, and it does not zoom back out.
// Every plan since Phase 2a has carried this as a written constraint with nothing enforcing it.
//
// `stylesheet selector` -> the size it still declares. Shrink-only, like the collision guard: the
// second test fails on any entry that no longer violates, so a fix must delete its entry. EMPTY
// since slice 2b-iv retired the last two offenders (ProductSearch.css's 15px .search-select,
// AddToBookmark.css's 14px .bookmark-name-input — both read text-base now). The Map stays: it is
// the mechanism, and the next sub-16px control belongs in it with a reason, not in a rewrite.
const ALLOWED = new Map([
])

// Arbitrary px type in JSX, which the CSS scan above cannot see at all. The house convention is
// that type sizes are rem so they grow with the reader; these five predate it, counted across the
// tree on 2026-08-10. Keyed `<basename> <token>` because line numbers go stale, and deliberately
// NOT stale-checked: `<basename> <token>` is not unique enough to prove an entry dead (Home.jsx
// writes `text-[11px]` twice), so a fourth test here would only be able to lie. Treat it as
// shrink-only by hand — delete an entry when you convert its file, never add one.
const ALLOWED_JSX_PX_TYPE = new Set([
  'Field.jsx text-[11px]',
  'TabBar.jsx text-[11px]',
  'Home.jsx text-[11px]',
  'Header.jsx text-[10px]',
  'Header.jsx text-[22px]',
])

// Prelude + body, for rules whose body holds no nested braces — which is every rule in this tree.
// An `@media` wrapper is skipped rather than mistaken for a selector, because its own body does
// contain braces and never matches.
const RULE = /([^{}]+)\{([^{}]*)\}/g
// `input` / `select` / `textarea` as a whole selector token, at a real boundary on both sides.
// The lookahead is what keeps `.time-range-selector` out: the character after `select` is `o`.
const CONTROL = /(?:^|[\s.>+~-])(?:input|select|textarea)(?=$|[\s.:,>+~[])/
const FONT_SIZE = /font-size:\s*(\d+(?:\.\d+)?)px/
const JSX_PX_TYPE = /\btext-\[(\d+)px\]/g

// TWO blind spots, both recorded rather than papered over.
//
// 1. DECLARED sizes only. A control that INHERITS a sub-16px size is invisible: `index.css`'s
//    `font: inherit` reset hands the ancestor's size straight to the control. The instance this
//    note used to cite — `Alerts.css:80`'s 14px `.alert-field` wrapping an `.alert-field input`
//    that declared no size of its own — was retired with that file in slice 2b-iii, and the fix
//    was not a rule but a primitive: `Field`'s input carries an explicit `text-base`. Note that a
//    wrapper given `text-sm` instead would have stayed invisible to test 3 as well, since 0.875rem
//    is not `text-[Npx]`. Same trap Field.jsx had in 2b-i. Not solvable one rule at a time.
// 2. CONTROL matches on the NAME. It does catch a bare element selector (`input`, `.alert-field
//    input`, `input[type="text"]`) and a control-shaped class (`.search-input`, `.search-select`,
//    `.bookmark-name-input`) — checked against all three forms. What it cannot catch is a form control
//    behind a class whose name says nothing: `<input class="query-box">` at 13px is invisible,
//    because the selector `.query-box` contains no `input` substring for the regex to find. The
//    third test below is the counterweight — it closes the JSX side by token, not by name, and its
//    coverage GROWS as pages convert to utilities, where this one's shrinks.
function walk(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) out.push(...walk(full))
    else out.push(full)
  }
  return out
}

function violations() {
  const found = new Map()
  for (const file of walk(SRC)) {
    if (!file.endsWith('.css') || basename(file) === 'index.css') continue
    const text = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    for (const [, prelude, body] of text.matchAll(RULE)) {
      const size = body.match(FONT_SIZE)
      if (!size || Number(size[1]) >= FLOOR) continue
      for (const selector of prelude.split(',').map((s) => s.trim()).filter(Boolean)) {
        if (CONTROL.test(selector)) found.set(`${basename(file)} ${selector}`, Number(size[1]))
      }
    }
  }
  return found
}

describe(`iOS zoom guard (no form control under ${FLOOR}px)`, () => {
  it('no form control declares a font-size that force-zooms iOS Safari', () => {
    const offenders = [...violations()]
      .filter(([key]) => !ALLOWED.has(key))
      .map(([key, size]) => `${key}: ${size}px`)
    expect(
      offenders,
      `Form controls under ${FLOOR}px — Safari zooms in on focus and never zooms back:\n${offenders.join('\n')}`,
    ).toEqual([])
  })

  it('the allowlist contains no entry that is already fixed', () => {
    const found = violations()
    const stale = [...ALLOWED.keys()].filter((key) => !found.has(key))
    expect(stale, `Allowlist entries no longer violating — delete them:\n${stale.join('\n')}`).toEqual([])
  })

  // The CSS scan above loses a rule every time a stylesheet retires. This one gains a file every
  // time a page converts, and it catches the case a selector-name regex never can: a control sized
  // in the JSX. Arbitrary px type is banned outright rather than only under 16 — the convention is
  // rem so type grows with the reader, and `text-[16px]` is just as frozen as `text-[13px]`.
  it('no JSX writes an arbitrary px type size', () => {
    const offenders = []
    for (const file of walk(SRC)) {
      if (!file.endsWith('.jsx')) continue
      for (const [token] of readFileSync(file, 'utf8').matchAll(JSX_PX_TYPE)) {
        const key = `${basename(file)} ${token}`
        if (!ALLOWED_JSX_PX_TYPE.has(key)) offenders.push(key)
      }
    }
    expect(
      [...new Set(offenders)],
      `Arbitrary px type in JSX — use a rem size so it grows with the reader:\n${offenders.join('\n')}`,
    ).toEqual([])
  })
})
