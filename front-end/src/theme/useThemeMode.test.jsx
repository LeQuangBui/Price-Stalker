import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useThemeMode } from './useThemeMode'

function createLocalStorageMock() {
  const store = new Map()

  return {
    getItem: vi.fn((key) => store.get(key) ?? null),
    setItem: vi.fn((key, value) => store.set(key, String(value))),
    removeItem: vi.fn((key) => store.delete(key)),
    clear: vi.fn(() => store.clear())
  }
}

describe('useThemeMode', () => {
  beforeEach(() => {
    vi.stubGlobal('localStorage', createLocalStorageMock())
  })

  afterEach(() => {
    document.documentElement.classList.remove('dark')
    vi.unstubAllGlobals()
  })

  it('applies an explicitly-pinned saved theme to the document root', () => {
    localStorage.setItem('theme', 'dark')
    localStorage.setItem('theme_pinned', '1')

    const { result } = renderHook(() => useThemeMode())

    expect(result.current.theme).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('ignores a non-pinned saved theme (older builds wrote it) and falls back', () => {
    // jsdom has no matchMedia → prefersDark() is false → light, despite the stale saved value.
    localStorage.setItem('theme', 'dark') // no theme_pinned key

    const { result } = renderHook(() => useThemeMode())

    expect(result.current.theme).toBe('light')
  })

  it('toggles theme and persists the choice as an explicit pin', () => {
    localStorage.setItem('theme', 'light')
    localStorage.setItem('theme_pinned', '1')
    const { result } = renderHook(() => useThemeMode())

    act(() => {
      result.current.toggleTheme()
    })

    expect(result.current.theme).toBe('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(localStorage.getItem('theme_pinned')).toBe('1')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })
})
