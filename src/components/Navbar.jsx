import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../lib/CartContext'
import { useAuth } from '../lib/AuthContext'
import { useInstallPrompt } from '../lib/useInstallPrompt'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import './Navbar.css'

export default function Navbar() {
  const { totalItems, wishlist } = useCart()
  const { user, signOut } = useAuth()
  const { canInstall, promptInstall } = useInstallPrompt()
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname
  const [unreadNotifs, setUnreadNotifs] = useState(0)
  const [unreadMsgs, setUnreadMsgs] = useState(0)

  useEffect(() => {
    if (!user) { setUnreadNotifs(0); setUnreadMsgs(0); return }
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('read', false)
      .then(({ count }) => setUnreadNotifs(count || 0))
    supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('buyer_id', user.id).eq('sender', 'vendor').eq('read', false)
      .then(({ count }) => setUnreadMsgs(count || 0))
    const notifSub = supabase.channel('navbar-notifs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => setUnreadNotifs(c => c + 1))
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => {
          supabase.from('notifications').select('id', { count: 'exact', head: true })
            .eq('user_id', user.id).eq('read', false)
            .then(({ count }) => setUnreadNotifs(count || 0))
        })
      .subscribe()
    const msgSub = supabase.channel('navbar-msgs')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `buyer_id=eq.${user.id}` },
        payload => { if (payload.new.sender === 'vendor') setUnreadMsgs(c => c + 1) })
      .subscribe()
    return () => { notifSub.unsubscribe(); msgSub.unsubscribe() }
  }, [user])

  return (
    <>
      <nav className="navbar">
        {/* Row 1 — Logo */}
        <Link to="/home" className="nav-logo">
          <div className="nav-logo-icon">🐺</div>
          <div className="nav-logo-text">Wolf <span>Market</span></div>
        </Link>

        {/* Desktop centre links */}
        <div className="nav-links">
          <Link to="/home" className={`nav-link${path==='/home'?' active':''}`}>Home</Link>
          <Link to="/marketplaces" className={`nav-link${path==='/marketplaces'?' active':''}`}>Marketplaces</Link>
          <Link to="/vendors" className={`nav-link${path==='/vendors'?' active':''}`}>Vendors</Link>
          <Link to="/delivery" className={`nav-link${path==='/delivery'?' active':''}`}>Delivery</Link>
          <Link to="/contact" className={`nav-link${path==='/contact'?' active':''}`}>Contact</Link>
          {user && <Link to="/dashboard" className={`nav-link${path==='/dashboard'?' active':''}`}>Dashboard</Link>}
        </div>

        {/* Desktop right actions */}
        <div className="nav-actions">
          {canInstall && <button className="nav-install" onClick={promptInstall}>⬇️ Install App</button>}
          {user && (
            <Link to="/dashboard?tab=notifications" className="nav-cart" title="Notifications">
              🔔{unreadNotifs > 0 && <span className="cart-badge">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>}
            </Link>
          )}
          <Link to="/wishlist" className="nav-cart" title="Saved">
            🔖{wishlist.length > 0 && <span className="cart-badge">{wishlist.length}</span>}
          </Link>
          <Link to="/cart" className="nav-cart" title="Cart">
            🛒{totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
          {user
            ? <button className="nav-cta" onClick={() => { signOut(); navigate('/') }}>Sign Out</button>
            : <Link to="/signin"><button className="nav-cta">Sign In</button></Link>
          }
        </div>

        {/* Row 2 — Mobile icon strip (below logo) */}
        <div className="mobile-icon-row">
          {user && (
            <Link to="/dashboard?tab=notifications" className="nav-cart" title="Notifications">
              🔔{unreadNotifs > 0 && <span className="cart-badge">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>}
            </Link>
          )}
          <Link to="/wishlist" className="nav-cart" title="Saved">
            🔖{wishlist.length > 0 && <span className="cart-badge">{wishlist.length}</span>}
          </Link>
          <Link to="/cart" className="nav-cart" title="Cart">
            🛒{totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
          {user
            ? <button className="nav-cta" onClick={() => { signOut(); navigate('/') }}>Sign Out</button>
            : <Link to="/signin"><button className="nav-cta">Sign In</button></Link>
          }
        </div>
      </nav>

      {canInstall && (
        <div className="install-banner">
          <span>📲 Install Wolf Market for quicker access</span>
          <button onClick={promptInstall}>Install</button>
        </div>
      )}

      {/* Mobile Bottom Nav */}
      <div className="mobile-nav">
        <Link to="/home" className={`mob-item${path==='/home'?' active':''}`}><span>🏠</span><span>Home</span></Link>
        <Link to="/search" className={`mob-item${path==='/search'?' active':''}`}><span>🔍</span><span>Search</span></Link>
        <Link to="/vendors" className={`mob-item${path==='/vendors'?' active':''}`}><span>🏪</span><span>Vendors</span></Link>
        <Link to="/messages" className={`mob-item${path==='/messages'?' active':''}`}>
          <span style={{ position: 'relative', display: 'inline-block' }}>
            💬{unreadMsgs > 0 && <span className="mob-cart-dot">{unreadMsgs}</span>}
          </span>
          <span>Chats</span>
        </Link>
        {user
          ? <Link to="/dashboard" className={`mob-item${path==='/dashboard'?' active':''}`}>
              <span style={{ position: 'relative', display: 'inline-block' }}>
                👤{unreadNotifs > 0 && <span className="mob-cart-dot">{unreadNotifs}</span>}
              </span>
              <span>Account</span>
            </Link>
          : <Link to="/signin" className={`mob-item${path==='/signin'?' active':''}`}><span>🔑</span><span>Sign In</span></Link>
        }
      </div>
    </>
  )
}
