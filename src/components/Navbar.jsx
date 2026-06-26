import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../lib/CartContext'
import { useAuth } from '../lib/AuthContext'
import { useInstallPrompt } from '../lib/useInstallPrompt'
import { useEffect, useState, useRef } from 'react'
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
  const [searchOpen, setSearchOpen] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const searchInputRef = useRef(null)

  useEffect(() => {
    if (!user) { setUnreadNotifs(0); setUnreadMsgs(0); return }
    // Load unread notification count
    supabase.from('notifications').select('id', { count: 'exact', head: true })
      .eq('user_id', user.id).eq('read', false)
      .then(({ count }) => setUnreadNotifs(count || 0))
    // Load unread messages count (messages from vendors to this buyer)
    supabase.from('messages').select('id', { count: 'exact', head: true })
      .eq('buyer_id', user.id).eq('sender', 'vendor').eq('read', false)
      .then(({ count }) => setUnreadMsgs(count || 0))
    // Realtime for notifications
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

  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 50)
  }, [searchOpen])

  // Close search on nav
  useEffect(() => { setSearchOpen(false) }, [path])

  function handleSearch(e) {
    e.preventDefault()
    if (searchQ.trim()) {
      navigate(`/search?q=${encodeURIComponent(searchQ.trim())}`)
      setSearchOpen(false)
      setSearchQ('')
    }
  }

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">🐺</div>
          <div className="nav-logo-text">Wolf <span>Market</span></div>
        </Link>

        {searchOpen ? (
          <form onSubmit={handleSearch} style={{ flex: 1, display: 'flex', gap: '8px', margin: '0 12px' }}>
            <input ref={searchInputRef} value={searchQ} onChange={e => setSearchQ(e.target.value)}
              placeholder="Search products…"
              style={{ flex: 1, padding: '8px 14px', borderRadius: '8px', border: '1.5px solid var(--wolf)', fontSize: '14px', outline: 'none', fontFamily: 'Inter,sans-serif' }} />
            <button type="submit" style={{ background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 14px', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>Go</button>
            <button type="button" onClick={() => setSearchOpen(false)} style={{ background: 'var(--light)', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: 'pointer', fontSize: '16px' }}>✕</button>
          </form>
        ) : (
          <div className="nav-links">
            <Link to="/" className={`nav-link${path==='/'?' active':''}`}>Home</Link>
            <Link to="/marketplaces" className={`nav-link${path==='/marketplaces'?' active':''}`}>Marketplaces</Link>
            <Link to="/vendors" className={`nav-link${path==='/vendors'?' active':''}`}>Vendors</Link>
            <Link to="/delivery" className={`nav-link${path==='/delivery'?' active':''}`}>Delivery</Link>
            <Link to="/contact" className={`nav-link${path==='/contact'?' active':''}`}>Contact</Link>
            {user && <Link to="/dashboard" className={`nav-link${path==='/dashboard'?' active':''}`}>Dashboard</Link>}
          </div>
        )}

        <div className="nav-actions">
          {canInstall && <button className="nav-install" onClick={promptInstall}>⬇️ Install App</button>}
          {/* Search button */}
          <button onClick={() => setSearchOpen(v => !v)} className="nav-cart" title="Search" style={{ fontSize: '16px' }}>🔍</button>
          {/* Messages */}
          {user && (
            <Link to="/messages" className="nav-cart" title="Messages" style={{ position: 'relative' }}>
              💬{unreadMsgs > 0 && <span className="cart-badge">{unreadMsgs > 9 ? '9+' : unreadMsgs}</span>}
            </Link>
          )}
          {/* Notifications */}
          {user && (
            <Link to="/dashboard?tab=notifications" className="nav-cart" title="Notifications">
              🔔{unreadNotifs > 0 && <span className="cart-badge">{unreadNotifs > 9 ? '9+' : unreadNotifs}</span>}
            </Link>
          )}
          <Link to="/wishlist" className="nav-cart" title="Wishlist">
            ❤️{wishlist.length > 0 && <span className="cart-badge">{wishlist.length}</span>}
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

      {/* Mobile Nav */}
      <div className="mobile-nav">
        <Link to="/" className={`mob-item${path==='/'?' active':''}`}><span>🏠</span><span>Home</span></Link>
        <Link to="/search" className={`mob-item${path==='/search'?' active':''}`}><span>🔍</span><span>Search</span></Link>
        <Link to="/vendors" className={`mob-item${path==='/vendors'?' active':''}`}><span>🏪</span><span>Vendors</span></Link>
        {user ? (
          <Link to="/messages" className={`mob-item${path==='/messages'?' active':''}`}>
            <span style={{ position: 'relative', display: 'inline-block' }}>💬{unreadMsgs > 0 && <span className="mob-cart-dot">{unreadMsgs}</span>}</span>
            <span>Chats</span>
          </Link>
        ) : (
          <Link to="/wishlist" className={`mob-item${path==='/wishlist'?' active':''}`}>
            <span style={{ position: 'relative', display: 'inline-block' }}>❤️{wishlist.length > 0 && <span className="mob-cart-dot">{wishlist.length}</span>}</span>
            <span>Saved</span>
          </Link>
        )}
        {user
          ? <Link to="/dashboard" className={`mob-item${path==='/dashboard'?' active':''}`}>
              <span style={{ position: 'relative', display: 'inline-block' }}>👤{unreadNotifs > 0 && <span className="mob-cart-dot">{unreadNotifs}</span>}</span>
              <span>Account</span>
            </Link>
          : <Link to="/signin" className={`mob-item${path==='/signin'?' active':''}`}><span>🔑</span><span>Sign In</span></Link>
        }
      </div>
    </>
  )
}
