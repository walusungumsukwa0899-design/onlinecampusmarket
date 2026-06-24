import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../lib/CartContext'
import { useAuth } from '../lib/AuthContext'
import { useInstallPrompt } from '../lib/useInstallPrompt'
import './Navbar.css'

export default function Navbar() {
  const { totalItems, wishlist } = useCart()
  const { user, signOut } = useAuth()
  const { canInstall, promptInstall } = useInstallPrompt()
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  return (
    <>
      <nav className="navbar">
        <Link to="/" className="nav-logo">
          <div className="nav-logo-icon">🐺</div>
          <div className="nav-logo-text">Wolf <span>Market</span></div>
        </Link>

        <div className="nav-links">
          <Link to="/" className={`nav-link${path==='/'?' active':''}`}>Home</Link>
          <Link to="/marketplaces" className={`nav-link${path==='/marketplaces'?' active':''}`}>Marketplaces</Link>
          <Link to="/vendors" className={`nav-link${path==='/vendors'?' active':''}`}>Vendors</Link>
          <Link to="/delivery" className={`nav-link${path==='/delivery'?' active':''}`}>Delivery</Link>
          <Link to="/contact" className={`nav-link${path==='/contact'?' active':''}`}>Contact</Link>
          {user && <Link to="/dashboard" className={`nav-link${path==='/dashboard'?' active':''}`}>Dashboard</Link>}
        </div>

        <div className="nav-actions">
          {canInstall && <button className="nav-install" onClick={promptInstall}>⬇️ Install App</button>}
          <Link to="/wishlist" className="nav-cart" title="Wishlist" style={{marginRight:'2px'}}>
            ❤️{wishlist.length > 0 && <span className="cart-badge">{wishlist.length}</span>}
          </Link>
          <Link to="/cart" className="nav-cart" title="Cart" style={{marginRight:'2px'}}>
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
        <Link to="/vendors" className={`mob-item${path==='/vendors'?' active':''}`}><span>🏪</span><span>Vendors</span></Link>
        <Link to="/wishlist" className={`mob-item${path==='/wishlist'?' active':''}`}>
          <span style={{position:'relative',display:'inline-block'}}>❤️{wishlist.length > 0 && <span className="mob-cart-dot">{wishlist.length}</span>}</span>
          <span>Saved</span>
        </Link>
        <Link to="/marketplaces" className={`mob-item${path==='/marketplaces'?' active':''}`}><span>🎓</span><span>Campus</span></Link>
        {user
          ? <Link to="/dashboard" className={`mob-item${path==='/dashboard'?' active':''}`}><span>👤</span><span>Account</span></Link>
          : <Link to="/signin" className={`mob-item${path==='/signin'?' active':''}`}><span>🔑</span><span>Sign In</span></Link>
        }
      </div>
    </>
  )
}
