import { useEffect, useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import Header from '../components/Header/Header'
import CommandPalette from '../components/CommandPalette/CommandPalette'
import { ToastProvider } from '../components/Toast/ToastProvider'
import { hasToken, logout } from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import { useThemeMode } from '../theme/useThemeMode'

/**
 * App shell: holds auth + theme state, renders the chrome (Header, command
 * palette, toast host) and the routed page via <Outlet>. Auth state + handlers
 * are shared with routes through Outlet context (useOutletContext).
 */
export default function RootLayout() {
  const [isSignedIn, setIsSignedIn] = useState(() => hasToken())
  const { theme, toggleTheme } = useThemeMode()
  const navigate = useNavigate()

  const onLogin = () => setIsSignedIn(true)
  const onSignOut = () => {
    logout()
    setIsSignedIn(false)
  }

  // When any authenticated request hits 401, the session is dead: drop signed-in chrome and
  // send the user to /login (the token is already cleared in client.js).
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setIsSignedIn(false)
      navigate('/login')
    })
    return () => setUnauthorizedHandler(null)
  }, [navigate])

  return (
    <ToastProvider>
      <div className="min-h-screen bg-ground text-ink transition-colors duration-300">
        <a href="#main" className="skip-link">Skip to content</a>
        <div className="mx-auto w-full max-w-[1400px] pt-4 pb-6 pl-[max(1rem,var(--safe-l))] pr-[max(1rem,var(--safe-r))] md:pt-[18px] md:pb-6 md:pl-6 md:pr-6">
          <Header
            isSignedIn={isSignedIn}
            onSignOut={onSignOut}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <main id="main" className="pb-12">
            <Outlet context={{ isSignedIn, onLogin, onSignOut }} />
          </main>
        </div>
        {isSignedIn ? <CommandPalette onNavigate={(to) => navigate(to)} /> : null}
      </div>
    </ToastProvider>
  )
}
