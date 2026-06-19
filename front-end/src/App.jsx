import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header/Header'
import Home from './pages/Home/Home'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import VerifyEmail from './pages/Auth/VerifyEmail'
import ResetPassword from './pages/Auth/ResetPassword'
import UserProfile from './pages/User/UserProfile'
import Bookmarks from './pages/Bookmarks/Bookmarks'
import ProductDetail from './pages/Product/ProductDetail'
import Alerts from './pages/Alerts/Alerts'
import { hasToken, logout } from './api/auth'
import { useThemeMode } from './theme/useThemeMode'
import './App.css'

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(() => hasToken())
  const { theme, toggleTheme } = useThemeMode()

  const handleLogin = () => setIsSignedIn(true)

  const handleSignOut = () => {
    logout()
    setIsSignedIn(false)
  }

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[var(--bg-secondary)] text-[var(--text-primary)] transition-colors duration-300">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-[radial-gradient(circle_at_15%_10%,rgba(20,184,166,0.14),transparent_26%),radial-gradient(circle_at_85%_0%,rgba(244,63,94,0.10),transparent_24%),linear-gradient(180deg,var(--bg-secondary),var(--bg-primary))]" />
        <div className="app-container">
          <Header
            isSignedIn={isSignedIn}
            onSignOut={handleSignOut}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
          <main className="pb-12">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login onLogin={handleLogin} />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail onVerified={handleLogin} />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/profile" element={<UserProfile />} />
              <Route path="/bookmarks" element={<Bookmarks />} />
              <Route path="/alerts" element={<Alerts />} />
              <Route path="/products/:id" element={<ProductDetail isSignedIn={isSignedIn} />} />
            </Routes>
          </main>
        </div>
      </div>
    </BrowserRouter>
  )
}
