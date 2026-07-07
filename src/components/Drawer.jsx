import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import './Drawer.css'

export default function Drawer({ open, onClose }) {
  const { user, signOut } = useAuth()
  const [openSections, setOpenSections] = useState(() => new Set(['quick']))

  function go() {
    onClose()
  }

  function toggleSection(key) {
    setOpenSections(prev => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function isOpen(key) {
    return openSections.has(key)
  }

  function Section({ id, title, children }) {
    const expanded = isOpen(id)
    return (
      <div className="drawer-section">
        <button
          className="drawer-section-toggle"
          onClick={() => toggleSection(id)}
          aria-expanded={expanded}
        >
          <h4>{title}</h4>
          <span className={`drawer-chevron${expanded ? ' open' : ''}`}>▾</span>
        </button>
        <div className={`drawer-section-content${expanded ? ' open' : ''}`}>
          <div className="drawer-section-inner">
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className={`drawer-overlay${open ? ' open' : ''}`} onClick={onClose} />
      <aside className={`drawer${open ? ' open' : ''}`}>
        <div className="drawer-header">
          <div className="drawer-logo">
            <div className="drawer-logo-icon">🐺</div>
            <div className="drawer-logo-text">Wolf <span>Business Platform</span></div>
          </div>
          <button className="drawer-close" onClick={onClose} aria-label="Close menu">✕</button>
        </div>

        <div className="drawer-body">
          <Section id="quick" title="Quick Access">
            <Link to="/home" onClick={go}>🏠 Home</Link>
            <Link to="/search" onClick={go}>🔍 Search</Link>
            <Link to="/vendors" onClick={go}>🏪 Vendors</Link>
            <Link to="/messages" onClick={go}>💬 Chats</Link>
            <Link to={user ? '/dashboard' : '/signin'} onClick={go}>👤 {user ? 'Account' : 'Sign In'}</Link>
          </Section>

          <Section id="activity" title="My Activity">
            <Link to="/dashboard?tab=products" onClick={go}>My Listings</Link>
            <Link to="/dashboard?tab=orders" onClick={go}>Order History</Link>
            <Link to="/wishlist" onClick={go}>Wishlist</Link>
          </Section>

          <Section id="money" title="Money & Perks">
            <Link to="/referrals" onClick={go}>Referrals &amp; Credits</Link>
            <Link to="/disputes" onClick={go}>Disputes</Link>
          </Section>

          <Section id="discover" title="Discover">
            <Link to="/trending" onClick={go}>Trending</Link>
            <Link to="/marketplaces" onClick={go}>Campus Markets</Link>
          </Section>

          <Section id="support" title="Support">
            <Link to="/contact" onClick={go}>Contact Us</Link>
            <Link to="/help" onClick={go}>Help Center</Link>
            <Link to="/safety" onClick={go}>Safety Policy</Link>
            <Link to="/terms" onClick={go}>Terms of Service</Link>
            <Link to="/privacy" onClick={go}>Privacy Policy</Link>
            <Link to="/report" onClick={go}>Report an Issue</Link>
          </Section>

          {user && (
            <Section id="account" title="Account">
              <Link to="/dashboard?tab=settings" onClick={go}>Profile Settings</Link>
              {user.email?.toLowerCase() === 'walusungumsukwa0899@gmail.com' && (
                <Link to="/admin" onClick={go}>🛡️ Admin Panel</Link>
              )}
              <button className="drawer-signout" onClick={() => { signOut(); onClose() }}>Sign Out</button>
            </Section>
          )}
        </div>
      </aside>
    </>
  )
}
