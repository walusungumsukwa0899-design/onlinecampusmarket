import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { CartProvider, useCart } from './lib/CartContext'
import { AuthProvider, useAuth } from './lib/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Marketplaces from './pages/Marketplaces'
import Vendors from './pages/Vendors'
import VendorProfile from './pages/VendorProfile'
import Cart from './pages/Cart'
import Sell from './pages/Sell'
import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import { Delivery, Contact } from './pages/DeliveryContact'
import HelpCenter from './pages/HelpCenter'
import SafetyPolicy from './pages/SafetyPolicy'
import ReportIssue from './pages/ReportIssue'
import NotFound from './pages/NotFound'
import Admin from './pages/Admin'
import Wishlist from './pages/Wishlist'
import OrderConfirmation from './pages/OrderConfirmation'
import ProductDetail from './pages/ProductDetail'
import Category from './pages/Category'
import Terms from './pages/Terms'
import Privacy from './pages/Privacy'
import Search from './pages/Search'
import Messages from './pages/Messages'
import Referrals from './pages/Referrals'
import Disputes from './pages/Disputes'
import Trending from './pages/Trending'
import { supabase } from './lib/supabase'

// Redirects to /signin if not logged in, waits while auth is loading
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div style={{ fontSize: '32px' }}>🐺</div>
    </div>
  )
  if (!user) return <Navigate to="/signin" replace />
  return children
}

function EmailVerificationBanner() {
  const { user } = useAuth()
  const [dismissed, setDismissed] = useState(false)
  const [resent, setResent] = useState(false)
  if (!user || dismissed) return null
  if (user.email_confirmed_at) return null
  async function resend() {
    await supabase.auth.resend({ type: 'signup', email: user.email })
    setResent(true)
  }
  return (
    <div style={{ background: '#fffbeb', borderBottom: '1.5px solid #fde68a', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '13px', position: 'fixed', top: '108px', left: 0, right: 0, zIndex: 999 }}>
      <span>📧 <strong>Verify your email</strong> — check your inbox for a link from Wolf Marketplace.</span>
      {!resent
        ? <button onClick={resend} style={{ background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '6px', padding: '4px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>Resend Email</button>
        : <span style={{ color: '#22c55e', fontWeight: 700 }}>✅ Sent!</span>
      }
      <button onClick={() => setDismissed(true)} style={{ marginLeft: 'auto', background: 'none', border: 'none', fontSize: '16px', cursor: 'pointer', color: '#9ca3af' }}>✕</button>
    </div>
  )
}

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => { window.scrollTo(0, 0) }, [pathname])
  return null
}

function Toast() {
  const { toast } = useCart()
  if (!toast) return null
  return <div className="toast">{toast}</div>
}

function CookieBanner() {
  const [visible, setVisible] = useState(() => !localStorage.getItem('wolf_cookie_ok'))
  if (!visible) return null
  return (
    <div style={{ position: 'fixed', bottom: '70px', left: '16px', right: '16px', maxWidth: '540px', margin: '0 auto', background: 'white', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '16px 20px', zIndex: 9998, boxShadow: '0 8px 32px rgba(0,0,0,.15)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ flex: 1, fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>
        🍪 We use cookies to keep you signed in and improve your experience.{' '}
        <a href="/privacy" style={{ color: 'var(--wolf)', fontWeight: 600 }}>Privacy Policy</a>
      </div>
      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
        <button onClick={() => { localStorage.setItem('wolf_cookie_ok', '1'); setVisible(false) }}
          style={{ background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '8px', padding: '8px 16px', fontWeight: 700, fontSize: '13px', cursor: 'pointer' }}>
          Accept
        </button>
        <button onClick={() => setVisible(false)}
          style={{ background: 'var(--light)', border: '1px solid var(--border)', borderRadius: '8px', padding: '8px 12px', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}>
          Dismiss
        </button>
      </div>
    </div>
  )
}

function AppShell({ children }) {
  const { pathname } = useLocation()
  const isLanding = pathname === '/' || pathname === '/signin'
  return (
    <>
      <ScrollToTop />
      {!isLanding && <Navbar />}
      {!isLanding && <EmailVerificationBanner />}
      <Toast />
      {children}
      <CookieBanner />
    </>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <AppShell>
          <Routes>
            {/* Only these two are accessible without login */}
            <Route path="/" element={<SignIn />} />
            <Route path="/signin" element={<SignIn />} />

            {/* Everything else requires login */}
            <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
            <Route path="/marketplaces" element={<ProtectedRoute><Marketplaces /></ProtectedRoute>} />
            <Route path="/vendors" element={<ProtectedRoute><Vendors /></ProtectedRoute>} />
            <Route path="/vendors/:id" element={<ProtectedRoute><VendorProfile /></ProtectedRoute>} />
            <Route path="/cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="/sell" element={<ProtectedRoute><Sell /></ProtectedRoute>} />
            <Route path="/delivery" element={<ProtectedRoute><Delivery /></ProtectedRoute>} />
            <Route path="/contact" element={<ProtectedRoute><Contact /></ProtectedRoute>} />
            <Route path="/help" element={<ProtectedRoute><HelpCenter /></ProtectedRoute>} />
            <Route path="/safety" element={<ProtectedRoute><SafetyPolicy /></ProtectedRoute>} />
            <Route path="/report" element={<ProtectedRoute><ReportIssue /></ProtectedRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/admin" element={<ProtectedRoute><Admin /></ProtectedRoute>} />
            <Route path="/wishlist" element={<ProtectedRoute><Wishlist /></ProtectedRoute>} />
            <Route path="/products/:id" element={<ProtectedRoute><ProductDetail /></ProtectedRoute>} />
            <Route path="/order-confirmation/:chargeId" element={<ProtectedRoute><OrderConfirmation /></ProtectedRoute>} />
            <Route path="/category/:slug" element={<ProtectedRoute><Category /></ProtectedRoute>} />
            <Route path="/terms" element={<ProtectedRoute><Terms /></ProtectedRoute>} />
            <Route path="/privacy" element={<ProtectedRoute><Privacy /></ProtectedRoute>} />
            <Route path="/search" element={<ProtectedRoute><Search /></ProtectedRoute>} />
            <Route path="/messages" element={<ProtectedRoute><Messages /></ProtectedRoute>} />
            <Route path="/referrals" element={<ProtectedRoute><Referrals /></ProtectedRoute>} />
            <Route path="/disputes" element={<ProtectedRoute><Disputes /></ProtectedRoute>} />
            <Route path="/trending" element={<ProtectedRoute><Trending /></ProtectedRoute>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AppShell>
      </CartProvider>
    </AuthProvider>
  )
}
