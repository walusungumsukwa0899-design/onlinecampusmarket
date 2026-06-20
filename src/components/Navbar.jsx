import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useCart } from '../lib/CartContext'
import { useAuth } from '../lib/AuthContext'
import './Navbar.css'

export default function Navbar() {
  const { totalItems } = useCart()
  const { user, signOut } = useAuth()
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
          <Link to="/shop" className={`nav-link${path==='/shop'?' active':''}`}>Shop</Link>
          <Link to="/vendors" className={`nav-link${path==='/vendors'?' active':''}`}>Vendors</Link>
          <Link to="/delivery" className={`nav-link${path==='/delivery'?' active':''}`}>Delivery</Link>
          <Link to="/contact" className={`nav-link${path==='/contact'?' active':''}`}>Contact</Link>
          {user && <Link to="/dashboard" className={`nav-link${path==='/dashboard'?' active':''}`}>Dashboard</Link>}
        </div>

        <div className="nav-actions">
          <Link to="/cart" className="nav-cart">
            🛒
            {totalItems > 0 && <span className="cart-badge">{totalItems}</span>}
          </Link>
          {user
            ? <button className="nav-cta" onClick={() => { signOut(); navigate('/') }}>Sign Out</button>
            : <Link to="/signin"><button className="nav-cta">Sign In</button></Link>
          }
        </div>
      </nav>

      {/* Mobile Nav */}
      <div className="mobile-nav">
        <Link to="/" className={`mob-item${path==='/'?' active':''}`}><span>🏠</span><span>Home</span></Link>
        <Link to="/marketplaces" className={`mob-item${path==='/marketplaces'?' active':''}`}><span>🏛️</span><span>Markets</span></Link>
        <Link to="/shop" className={`mob-item${path==='/shop'?' active':''}`}><span>🛍️</span><span>Shop</span></Link>
        <Link to="/vendors" className={`mob-item${path==='/vendors'?' active':''}`}><span>🏪</span><span>Vendors</span></Link>
        <Link to="/cart" className={`mob-item${path==='/cart'?' active':''}`}>
          <span>🛒{totalItems > 0 && <span className="mob-cart-dot">{totalItems}</span>}</span>
          <span>Cart</span>
        </Link>
      </div>
    </>
  )
}
