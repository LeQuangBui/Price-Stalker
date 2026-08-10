import { useEffect, useState } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import { getUserProfile, isUnauthorizedError } from '../../api/auth'
import { formatDate } from '../../utils/formatters'
import NotificationSettings from '../../components/NotificationSettings/NotificationSettings'
import AppLink from '../../components/AppLink'
import Kicker from '../../components/primitives/Kicker'
import ErrorState from '../../components/primitives/ErrorState'
import EmptyState from '../../components/primitives/EmptyState'

/**
 * Sign Out is the app's ONLY sign-out control (the header's was retired in Phase 1), so it
 * must survive every state this page can land in. If it only rendered on the success branch,
 * any non-401 failure of GET /users/me — backend 500, offline, CORS, malformed payload —
 * would strand the user in a session they cannot leave. Rendered outside the state switch, so
 * it is present in the loading, error, empty and loaded states alike.
 */
function SignOutSection({ onSignOut, navigate }) {
  return (
    <section className="mt-8 border-t border-line pt-6">
      <button
        type="button"
        className="btn btn-danger btn-block"
        onClick={() => {
          onSignOut()
          navigate('/')
        }}
      >
        Sign Out
      </button>
    </section>
  )
}

// A px cap, like the shell's own max-w-[1400px]. A cap does not gate content against a rem-sized
// box the way a breakpoint does — it only stops the measure getting too long — so it does not need
// to grow with the reader.
const PAGE = 'mx-auto max-w-[900px]'

// 20px of padding on a phone, 32 from md: up. 32px each side is a fifth of a 320px viewport, and
// NotificationSettings nests its own p-5 card inside this one: measured at 320px, the drop hands
// that card 207px -> 231px of width.
//
// It does NOT widen that card's description, which stays at 102.55px over six lines. That column
// is a flex item sitting at its min-content width next to a `shrink-0` button, so `justify-between`
// spends the new room on the gap instead. The fix belongs to NotificationSettings, not here.
const SECTION = 'mb-6 rounded-[var(--radius-lg)] border border-line bg-paper p-5 shadow-[var(--shadow-sm)] md:p-8'

// These two were the page's 42px touch targets — the retired UserProfile.css set min-height: 42px
// on a hand-rolled link style — and they are <a> elements, which are the easiest thing to quietly
// unpick from a button primitive later. The floor should not leave with the class, so it is written
// out even though `.btn` already carries one.
//
// Not a duplicate of it, either: `.btn`'s floor is a flat 44px and `min-h-11` is 2.75rem, so it
// grows with the reader's browser font. Measured at 320px: 42px before, 44px after at a 16px root
// and 66px at a 24px root.
const ACTION_LINK = 'btn btn-secondary min-h-11'

export default function UserProfile() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reloadKey, setReloadKey] = useState(0)
  const navigate = useNavigate()
  const { onSignOut } = useOutletContext()

  useEffect(() => {
    const fetchUserProfile = async () => {
      setLoading(true)
      setError('')
      try {
        const data = await getUserProfile()
        setUser(data)
      } catch (err) {
        setError(err.message)
        if (isUnauthorizedError(err)) {
          navigate('/login')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchUserProfile()
  }, [navigate, reloadKey])

  let body
  if (loading) {
    body = (
      <>
        <div className="skeleton mb-5 h-8 w-2/5" />
        <div className="skeleton h-40" />
      </>
    )
  } else if (error) {
    body = <ErrorState message={error} onRetry={() => setReloadKey((value) => value + 1)} />
  } else if (!user) {
    body = 'No user data'
  } else {
    body = <ProfileBody user={user} />
  }

  // One return with a switched body — not four early returns. Keeping SignOutSection at a
  // fixed position in the tree means it is the same DOM node in every state, so it never
  // unmounts (or flickers) as the fetch settles or is retried.
  return (
    <div className={PAGE}>
      {body}
      <SignOutSection onSignOut={onSignOut} navigate={navigate} />
    </div>
  )
}

// Label above value on a phone, label-left / value-right from md: up.
function ProfileItem({ label, value }) {
  return (
    <div className="flex flex-col gap-4 border-b border-line-soft py-4 last:border-b-0 md:flex-row md:justify-between">
      <span className="font-semibold text-ink-soft">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  )
}

function ProfileBody({ user }) {
  return (
    <>
      <Kicker>Account</Kicker>
      <h1 className="mt-3 mb-6 font-display text-display-sm font-semibold text-ink">
        Your profile
      </h1>

      <div className={SECTION}>
        <ProfileItem label="Username:" value={user.username} />
        <ProfileItem label="Email:" value={user.email} />
        <ProfileItem label="Member since:" value={formatDate(user.createdAt)} />
      </div>

      <div className="mb-8 flex flex-wrap gap-3">
        <AppLink to="/bookmarks" className={ACTION_LINK}>View Bookmarks</AppLink>
        <AppLink to="/alerts" className={ACTION_LINK}>Manage Alerts</AppLink>
      </div>

      <div className={SECTION}>
        <NotificationSettings />
      </div>

      {/* `.bookmarks-section` had exactly one rule — a margin on this heading — so the wrapper keeps
          the grouping and loses the class. */}
      <div>
        <h3 className="mb-[18px]">Bookmarks ({user.bookmarks?.length || 0})</h3>
        {user.bookmarks && user.bookmarks.length > 0 ? (
          <div className="flex flex-col gap-4">
            {user.bookmarks.map((bookmark) => (
              <div key={bookmark.id} className="rounded-[var(--radius)] border border-line bg-paper p-5">
                <div className="flex flex-col gap-1.5">
                  {/* Prominent again. This line is weight 700 and was meant to lead the card, but
                      `Bookmarks.css`'s `.bookmark-info` block (retired in 2b-ii) was reaching it
                      through the shared class name and rendering it at 14px in the same grey as the
                      two meta lines under it. */}
                  <span className="font-bold">{bookmark.name || 'Unnamed'}</span>
                  {/* These two carried `bookmark-date`, whose only rule lived in this page's own
                      retired stylesheet and whose third call site is in Bookmarks.jsx. Written out
                      here rather than left to a name that would resolve to nothing. */}
                  <span className="text-sm text-ink-soft">
                    Created {formatDate(bookmark.createdAt)}
                  </span>
                  <span className="text-sm text-ink-soft">
                    {bookmark.products?.length || 0} products
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          // No `action` — a design call, not a test constraint. All four queries in
          // UserProfile.signout.test.jsx already filter by name, so a CTA here would not make any
          // of them ambiguous; this panel is a summary of another page and the CTA belongs there.
          <EmptyState title="No bookmarks yet." />
        )}
      </div>
    </>
  )
}
