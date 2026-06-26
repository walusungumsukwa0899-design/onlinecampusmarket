import { useEffect, useState } from 'react'
import { Routes, Route, useLocation, Navigate } from 'react-router-dom'
import { CartProvider, useCart } from './lib/CartContext'
import { AuthProvider, useAuth } from './lib/AuthContext'
import ErrorBoundary from './components/ErrorBoundary'
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
    <div style={{ background: '#fffbeb', borderBottom: '1.5px solid #fde68a', padding: '10px 20px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '13px', position: 'fixed', top: '60px', left: 0, right: 0, zIndex: 999 }}>
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

/** Auth gate: unauthenticated users visiting "/" see SignIn first */
function AuthGatedHome() {
  const { user, loading } = useAuth()
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🐺</div>
          <div className="spinner" style={{ margin: '0 auto' }} />
        </div>
      </div>
    )
  }
  if (!user) return <SignIn isLanding />
  return <Home />
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <CartProvider>
          <ScrollToTop />
          <Navbar />
          <EmailVerificationBanner />
          <Toast />
          <Routes>
            {/* "/" shows Sign In for guests, Home for authenticated users */}
            <Route path="/" element={<AuthGatedHome />} />
            <Route path="/home" element={<Home />} />
            <Route path="/marketplaces" element={<Marketplaces />} />
            <Route path="/vendors" element={<Vendors />} />
            <Route path="/vendors/:id" element={<VendorProfile />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/sell" element={<Sell />} />
            <Route path="/delivery" element={<Delivery />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/help" element={<HelpCenter />} />
            <Route path="/safety" element={<SafetyPolicy />} />
            <Route path="/report" element={<ReportIssue />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/products/:id" element={<ProductDetail />} />
            <Route path="/order-confirmation/:chargeId" element={<OrderConfirmation />} />
            <Route path="/category/:slug" element={<Category />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/search" element={<Search />} />
            <Route path="/messages" element={<Messages />} />
            <Route path="/referrals" element={<Referrals />} />
            <Route path="/disputes" element={<Disputes />} />
            <Route path="/trending" element={<Trending />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </CartProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}
