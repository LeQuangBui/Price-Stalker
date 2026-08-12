import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// jsdom lacks ResizeObserver + scrollIntoView, which cmdk/radix (command palette,
// dialogs) call on mount, and which PriceHistoryChart measures its container with. Stub it so
// those components render under test — and record each instance with its callback, because jsdom
// performs no layout: a component can only receive a measurement if the test hands it one, by
// finding its observer in `ResizeObserver.instances` and calling the callback directly.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class ResizeObserver {
    static instances = []
    constructor(callback) {
      this.callback = callback
      ResizeObserver.instances.push(this)
    }

    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

// jsdom 26 has no PointerEvent constructor, and without one fireEvent.pointerMove falls back to
// a bare Event that drops clientX — the one field a scrub test exists to deliver. Pointer events
// are mouse events plus pointer identity, so a MouseEvent subclass carries the coordinates and
// React's onPointer* handlers, which route by event name, receive it unchanged.
if (typeof window !== 'undefined' && typeof window.PointerEvent === 'undefined') {
  window.PointerEvent = class PointerEvent extends window.MouseEvent {
    constructor(type, init = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 1
      this.pointerType = init.pointerType ?? 'mouse'
    }
  }
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
// (without this, a second render of the same component yields duplicate matches). Observers
// recorded during the test go with the tree they observed.
afterEach(() => {
  cleanup()
  globalThis.ResizeObserver.instances?.splice(0)
})
