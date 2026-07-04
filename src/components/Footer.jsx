import { Link } from 'react-router-dom'
import './Footer.css'

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-brand footer-brand-centered">
          <div className="footer-logo">
            <div className="footer-logo-icon">🐺</div>
            <div className="footer-logo-text">Wolf <span>Business Platform</span></div>
          </div>
          <p className="footer-tagline">Do your business online, anywhere, anytime.</p>
        </div>
        <div className="footer-bottom">
          <p>© 2026 Wolf Business Platform · Malawi. All rights reserved.</p>
          <div className="footer-legal-links">
            <Link to="/terms">Terms of Service</Link>
            <span>·</span>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
        </div>
      </div>
      <div className="footer-slogan">Powered and operated by <span>la wolf</span> 🐺</div>
    </footer>
  )
}
