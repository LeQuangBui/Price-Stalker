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

// Unmount React trees between tests so DOM from one test never leaks into the next
// (without this, a second render of the same component yields duplicate matches).
afterEach(() => {
  cleanup()
})
