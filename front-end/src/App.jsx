import { createBrowserRouter, RouterProvider, useOutletContext } from 'react-router-dom'
import RootLayout from './layouts/RootLayout'
import Home from './pages/Home/Home'
import Login from './pages/Auth/Login'
import Signup from './pages/Auth/Signup'
import VerifyEmail from './pages/Auth/VerifyEmail'
import ResetPassword from './pages/Auth/ResetPassword'
import UserProfile from './pages/User/UserProfile'
import Bookmarks from './pages/Bookmarks/Bookmarks'
import ProductDetail from './pages/Product/ProductDetail'
import Alerts from './pages/Alerts/Alerts'
import Landing from './pages/Landing/Landing'
import NotFound from './pages/NotFound/NotFound'
import RequireAuth from './components/RequireAuth'
import './App.css'

// Thin route wrappers: pull shared auth state/handlers from the RootLayout's
// Outlet context so pages keep their existing prop contracts.
function HomeOrLanding() {
  const { isSignedIn } = useOutletContext()
  return isSignedIn ? <Home isSignedIn /> : <Landing />
}
function BrowseRoute() {
  const { isSignedIn } = useOutletContext()
  return <Home isSignedIn={isSignedIn} />
}
function LoginRoute() {
  const { onLogin } = useOutletContext()
  return <Login onLogin={onLogin} />
}
function VerifyEmailRoute() {
  const { onLogin } = useOutletContext()
  return <VerifyEmail onVerified={onLogin} />
}
function ProductRoute() {
  const { isSignedIn } = useOutletContext()
  return <ProductDetail isSignedIn={isSignedIn} />
}

const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: '/', element: <HomeOrLanding /> },
      { path: '/browse', element: <BrowseRoute /> },
      { path: '/login', element: <LoginRoute /> },
      { path: '/signup', element: <Signup /> },
      { path: '/verify-email', element: <VerifyEmailRoute /> },
      { path: '/reset-password', element: <ResetPassword /> },
      { path: '/profile', element: <RequireAuth><UserProfile /></RequireAuth> },
      { path: '/bookmarks', element: <RequireAuth><Bookmarks /></RequireAuth> },
      { path: '/alerts', element: <RequireAuth><Alerts /></RequireAuth> },
      { path: '/products/:id', element: <ProductRoute /> },
      { path: '*', element: <NotFound /> },
    ],
  },
])

export default function App() {
  return <RouterProvider router={router} />
}
