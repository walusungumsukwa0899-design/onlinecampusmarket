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
            <Link to="/help">Help Center</Link>
            <Link to="/safety">Safety Policy</Link>
            <Link to="/terms">Terms of Service</Link>
            <Link to="/privacy">Privacy Policy</Link>
            <Link to="/report">Report Issue</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Wolf Marketplace · Malawi. All rights reserved.</p>
          <div className="footer-socials">
            <a className="social-btn" href="https://facebook.com/wolfmarketplace" target="_blank" rel="noreferrer" title="Facebook">📘</a>
            <a className="social-btn" href="https://instagram.com/wolfmarketplace" target="_blank" rel="noreferrer" title="Instagram">📸</a>
            <a className="social-btn" href="https://twitter.com/wolfmarket_mw" target="_blank" rel="noreferrer" title="Twitter/X">🐦</a>
            <a className="social-btn" href="https://wa.me/265990000000" target="_blank" rel="noreferrer" title="WhatsApp Support">💬</a>
          </div>
        </div>
      </div>
      <div className="footer-slogan">Powered and operated by <span>la wolf</span> 🐺</div>
    </footer>
  )
}
