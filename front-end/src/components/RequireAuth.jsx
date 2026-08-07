import { Navigate, useOutletContext } from 'react-router-dom'

/**
 * Route guard for auth-only pages: redirects a signed-out visitor to /login instead of rendering
 * authed chrome and firing a doomed API call. Reads isSignedIn from the RootLayout Outlet context,
 * so it must be used as a route element under RootLayout.
 */
export default function RequireAuth({ children }) {
  const { isSignedIn } = useOutletContext()
  if (!isSignedIn) {
    return <Navigate to="/login" replace />
  }
  return children
}
