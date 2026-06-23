import { useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { CartProvider, useCart } from './lib/CartContext'
import { AuthProvider } from './lib/AuthContext'
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

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <ScrollToTop />
        <Navbar />
        <Toast />
        <Routes>
          <Route path="/" element={<Home />} />
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
          <Route path="*" element={<NotFound />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  )
}
