import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import RootLayout from './RootLayout'

// RootLayout reads hasToken() (-> localStorage.getItem) on mount. Other suites in this repo
// stub `localStorage` for the same reason (see src/api/client.test.js, src/api/auth.test.js) —
// under this toolchain's jsdom + Node combination, globalThis.localStorage is not populated
// for us, so an unstubbed render throws before any assertion runs.
function createLocalStorageMock() {
  const store = new Map()
  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear()),
  }
}

beforeEach(() => {
  vi.stubGlobal('localStorage', createLocalStorageMock())
})

afterEach(() => {
  vi.unstubAllGlobals()
})

function renderShell() {
  return render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<p>page body</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
}

describe('RootLayout shell', () => {
  it('reserves space below main so the fixed tab bar cannot cover content', () => {
    renderShell()
    expect(screen.getByRole('main').className).toContain('pb-shell-b')
  })

  it('uses dynamic viewport height so a collapsing URL bar cannot orphan the background', () => {
    const { container } = renderShell()
    expect(container.querySelector('.min-h-dvh')).not.toBeNull()
    expect(container.querySelector('.min-h-screen')).toBeNull()
  })
})
