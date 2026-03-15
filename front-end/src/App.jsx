import { useState } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Header from './components/Header/Header'
import Home from './pages/Home/Home'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import UserProfile from './pages/User/UserProfile'
import Bookmarks from './pages/Bookmarks/Bookmarks'
import ProductDetail from './pages/Product/ProductDetail'
import { getToken, logout } from './api/auth'
import './App.css'

export default function App() {
  const [isSignedIn, setIsSignedIn] = useState(() => !!getToken())

  const handleLogin = () => setIsSignedIn(true)
  const handleSignup = () => setIsSignedIn(true)

  const handleSignOut = () => {
    logout()
    setIsSignedIn(false)
  }

  return (
    <BrowserRouter>
      <div className="app-container">
        <Header isSignedIn={isSignedIn} onSignOut={handleSignOut} />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login onLogin={handleLogin} />} />
          <Route path="/signup" element={<Signup onSignup={handleSignup} />} />
          <Route path="/profile" element={<UserProfile />} />
          <Route path="/bookmarks" element={<Bookmarks />} />
          <Route path="/products/:id" element={<ProductDetail isSignedIn={isSignedIn} />} />
        </Routes>
      </div>
    </BrowserRouter>
  )
}
