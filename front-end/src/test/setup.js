import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom lacks ResizeObserver + scrollIntoView, which cmdk/radix (command palette,
// dialogs) call on mount. Stub them so those components can render under test.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

// jsdom 26 ships no HTMLDialogElement behaviour: `showModal` and `close` are undefined, so a
// component built on the native <dialog> throws the moment it opens one. useConfirm (Bookmarks,
// Alerts, ProductDetail) opens one from an effect. Track `open` so `useConfirm`'s
// `if (opts && !dialog.open)` guard still behaves; the top layer itself is not simulated and
// nothing here depends on it.
if (typeof HTMLDialogElement !== 'undefined' && !HTMLDialogElement.prototype.showModal) {
  HTMLDialogElement.prototype.showModal = function showModal() {
    this.open = true
  }
  HTMLDialogElement.prototype.close = function close() {
    this.open = false
    this.dispatchEvent(new Event('close'))
  }
}

// Unmount React trees between tests so DOM from one test never leaks into the next
// (without this, a second render of the same component yields duplicate matches).
afterEach(() => {
  cleanup()
})
