import { useEffect, useState } from 'react'

const STORAGE_KEY = 'theme' // cached current value (avoids a flash on reload)
const PINNED_KEY = 'theme_pinned' // set ONLY when the user explicitly toggles

function isPinned() {
  try {
    return localStorage.getItem(PINNED_KEY) === '1'
  } catch {
    return false
  }
}

function prefersDark() {
  return (
    typeof window !== 'undefined' &&
    !!window.matchMedia &&
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )
}

function getPreferredTheme() {
  // Only honor a saved value if the user explicitly pinned it. A bare 'theme' key (older builds
  // wrote it on every mount) must NOT block live OS-follow for the existing user base.
  try {
    if (isPinned()) {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved === 'light' || saved === 'dark') return saved
    }
  } catch {
    /* storage unavailable */
  }
  return prefersDark() ? 'dark' : 'light'
}

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  document.documentElement.setAttribute('data-theme', theme)
}

export function useThemeMode() {
  const [theme, setTheme] = useState(getPreferredTheme)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  // Follow OS theme changes live until the user pins a choice.
  useEffect(() => {
    if (!window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = (event) => {
      if (!isPinned()) setTheme(event.matches ? 'dark' : 'light')
    }
    mq.addEventListener?.('change', onChange)
    return () => mq.removeEventListener?.('change', onChange)
  }, [])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    try {
      localStorage.setItem(STORAGE_KEY, next)
      localStorage.setItem(PINNED_KEY, '1') // explicit pin overrides OS preference
    } catch {
      /* storage unavailable — choice just won't persist across reloads */
    }
    setTheme(next)
  }

  return { theme, toggleTheme }
}
