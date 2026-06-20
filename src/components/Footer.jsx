import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-grid">
          <div className="footer-brand">
            <div className="footer-logo">
              <div className="footer-logo-icon">🐺</div>
              <div className="footer-logo-text">Wolf <span>Market</span></div>
            </div>
            <p>Malawi's campus marketplace connecting student buyers and sellers across all universities.</p>
          </div>
          <div className="footer-col">
            <h4>Marketplace</h4>
            <Link to="/marketplaces">Campus Markets</Link>
            <Link to="/shop">Browse Products</Link>
            <Link to="/vendors">Vendors</Link>
            <Link to="/delivery">Delivery</Link>
          </div>
          <div className="footer-col">
            <h4>Account</h4>
            <Link to="/signin">Sign In</Link>
            <Link to="/signin">Register</Link>
            <Link to="/sell">Sell on Wolf</Link>
            <Link to="/dashboard">Dashboard</Link>
          </div>
          <div className="footer-col">
            <h4>Support</h4>
            <Link to="/contact">Contact Us</Link>
            <a>Help Center</a>
            <a>Safety Policy</a>
            <a>Report Issue</a>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Wolf Marketplace · Malawi. All rights reserved.</p>
          <div className="footer-socials">
            <div className="social-btn">📘</div>
            <div className="social-btn">📸</div>
            <div className="social-btn">🐦</div>
          </div>
        </div>
      </div>
      <div className="footer-slogan">Powered and operated by <span>la wolf</span> 🐺</div>
    </footer>
  )
}
