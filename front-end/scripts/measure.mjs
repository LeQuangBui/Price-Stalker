#!/usr/bin/env node
// Viewport x root-font-size sweep over one route, straight down CDP. No npm dependency: Chrome is
// driven over the DevTools protocol with node's built-in WebSocket.
//
// It exists because `Page.setFontSizes` — the only way to emulate a reader who has raised the
// browser's default font — is not on the browse CLI's allowlist, and because three separate
// measurement campaigns in this slice want the same grid. One driver, three probe files.
//
//   node scripts/measure.mjs --url http://localhost:5173/alerts \
//     --viewports 320,344,360,390 --roots 16,20,24 \
//     --probe scripts/probes/alert-card.js --out /tmp/alerts.json
//
// A probe file is a JS expression (not a statement) evaluated in the page; it returns a plain
// object, which lands under `cells[].probe`. Every cell also records `scrollbar` — the real
// difference between innerWidth and documentElement.clientWidth — because a sweep run with the
// scrollbar suppressed silently loses a whole class of clipping, and the number is the only proof
// of which case was measured. See the note under Step 3: on this machine it is 0.
import { spawn } from 'node:child_process'
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const CHROME = process.env.CHROME_BIN
  || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) {
    if (fallback === undefined) throw new Error(`missing --${name}`)
    return fallback
  }
  return process.argv[i + 1]
}
const nums = (s) => s.split(',').map((n) => Number(n.trim()))

const url = arg('url')
const viewports = nums(arg('viewports'))
const roots = nums(arg('roots'))
const height = Number(arg('height', '900'))
const locale = arg('locale', 'vi-VN')
const probeSrc = readFileSync(arg('probe'), 'utf8')
const out = arg('out')
const settleMs = Number(arg('settle', '350'))
// Header.jsx's action cluster pins the page's scroll width to a viewport-independent floor and
// drowns any page-level measurement under it. Pass `--ablate header` to take it out first.
const ablate = arg('ablate', '')

// --lang sets the UI language; Emulation.setLocaleOverride below is what Intl in the page reads,
// and an unpinned locale renders a vi-VN price four characters wider. Deliberately NOT
// --hide-scrollbars.
const profile = mkdtempSync(join(tmpdir(), 'measure-'))
const chrome = spawn(CHROME, [
  '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
  '--no-first-run', '--no-default-browser-check', `--lang=${locale}`,
  `--window-size=${Math.max(...viewports)},${height}`,
], { stdio: ['ignore', 'ignore', 'pipe'] })

const wsUrl = await new Promise((resolve, reject) => {
  let buf = ''
  const t = setTimeout(() => reject(new Error('chrome did not report a debugging port')), 20000)
  chrome.stderr.on('data', (d) => {
    buf += d
    const m = /ws:\/\/[^\s]+/.exec(buf)
    if (m) { clearTimeout(t); resolve(m[0]) }
  })
})

const res = await fetch(new URL('/json/list', wsUrl.replace('ws://', 'http://')).href)
const page = (await res.json()).find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => ws.addEventListener('open', r, { once: true }))

let nextId = 0
const pending = new Map()
const waiters = []
ws.addEventListener('message', (ev) => {
  const msg = JSON.parse(ev.data)
  if (msg.id !== undefined) {
    const p = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? p.reject(new Error(`${msg.error.message} (${p.method})`)) : p.resolve(msg.result)
    return
  }
  for (let i = waiters.length - 1; i >= 0; i--) {
    if (waiters[i].method === msg.method) waiters.splice(i, 1)[0].resolve(msg.params)
  }
})
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++nextId
  pending.set(id, { resolve, reject, method })
  ws.send(JSON.stringify({ id, method, params }))
})
const once = (method, ms = 20000) => new Promise((resolve, reject) => {
  waiters.push({ method, resolve })
  setTimeout(() => reject(new Error(`timed out waiting for ${method}`)), ms)
})

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setLocaleOverride', { locale })

const cells = []
for (const root of roots) {
  for (const width of viewports) {
    await send('Emulation.setDeviceMetricsOverride', {
      width, height, deviceScaleFactor: 1, mobile: false,
    })
    // Asked for explicitly rather than defaulted, so the intent is in the file even where the
    // platform declines: a suppressed scrollbar hands back the layout gutter that narrow-viewport
    // clipping lives in.
    await send('Emulation.setScrollbarsHidden', { hidden: false })
    await send('Page.setFontSizes', { fontSizes: { standard: root, fixed: root } })
    const loaded = once('Page.loadEventFired')
    await send('Page.navigate', { url })
    await loaded
    await new Promise((r) => setTimeout(r, settleMs))
    if (ablate) {
      await send('Runtime.evaluate', {
        expression: `document.querySelectorAll(${JSON.stringify(ablate)})`
          + `.forEach(function (e) { e.remove() })`,
      })
    }
    const { result, exceptionDetails } = await send('Runtime.evaluate', {
      expression: `(function () {
        var probe = (${probeSrc});
        return {
          scrollbar: window.innerWidth - document.documentElement.clientWidth,
          docScrollWidth: document.documentElement.scrollWidth,
          docClientWidth: document.documentElement.clientWidth,
          probe: typeof probe === 'function' ? probe() : probe
        }
      })()`,
      returnByValue: true,
      awaitPromise: true,
    })
    if (exceptionDetails) throw new Error(`probe threw at ${width}/${root}: ${exceptionDetails.text}`)
    cells.push({ width, root, ...result.value })
  }
}

writeFileSync(out, JSON.stringify({ url, locale, height, cells }, null, 2))
console.log(`${cells.length} cells -> ${out}`)
ws.close()
chrome.kill()
