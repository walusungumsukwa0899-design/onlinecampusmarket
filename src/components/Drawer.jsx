import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import './Drawer.css'

export default function Drawer({ open, onClose }) {
  const { user, signOut } = useAuth()

  function go() {
    onClose()
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
          <div className="drawer-section">
            <h4>Quick Access</h4>
            <Link to="/home" onClick={go}>🏠 Home</Link>
            <Link to="/search" onClick={go}>🔍 Search</Link>
            <Link to="/vendors" onClick={go}>🏪 Vendors</Link>
            <Link to="/messages" onClick={go}>💬 Chats</Link>
            <Link to={user ? '/dashboard' : '/signin'} onClick={go}>👤 {user ? 'Account' : 'Sign In'}</Link>
          </div>

          <div className="drawer-section">
            <h4>My Activity</h4>
            <Link to="/dashboard?tab=products" onClick={go}>My Listings</Link>
            <Link to="/dashboard?tab=orders" onClick={go}>Order History</Link>
            <Link to="/wishlist" onClick={go}>Wishlist</Link>
          </div>

          <div className="drawer-section">
            <h4>Money &amp; Perks</h4>
            <Link to="/referrals" onClick={go}>Referrals &amp; Credits</Link>
            <Link to="/disputes" onClick={go}>Disputes</Link>
          </div>

          <div className="drawer-section">
            <h4>Discover</h4>
            <Link to="/trending" onClick={go}>Trending</Link>
            <Link to="/marketplaces" onClick={go}>Campus Markets</Link>
          </div>

          <div className="drawer-section">
            <h4>Support</h4>
            <Link to="/contact" onClick={go}>Contact Us</Link>
            <Link to="/help" onClick={go}>Help Center</Link>
            <Link to="/safety" onClick={go}>Safety Policy</Link>
            <Link to="/terms" onClick={go}>Terms of Service</Link>
            <Link to="/privacy" onClick={go}>Privacy Policy</Link>
            <Link to="/report" onClick={go}>Report an Issue</Link>
          </div>

          {user && (
            <div className="drawer-section">
              <h4>Account</h4>
              <Link to="/dashboard?tab=settings" onClick={go}>Profile Settings</Link>
              <button className="drawer-signout" onClick={() => { signOut(); onClose() }}>Sign Out</button>
            </div>
          )}
        </div>
      </aside>
    </>
  )
}
