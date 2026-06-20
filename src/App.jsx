import { Routes, Route } from 'react-router-dom'
import { CartProvider, useCart } from './lib/CartContext'
import { AuthProvider } from './lib/AuthContext'
import Navbar from './components/Navbar'
import Home from './pages/Home'
import Marketplaces from './pages/Marketplaces'
import Shop from './pages/Shop'
import Vendors from './pages/Vendors'
import VendorProfile from './pages/VendorProfile'
import Cart from './pages/Cart'
import Sell from './pages/Sell'
import SignIn from './pages/SignIn'
import Dashboard from './pages/Dashboard'
import { Delivery, Contact } from './pages/DeliveryContact'

function Toast() {
  const { toast } = useCart()
  if (!toast) return null
  return <div className="toast">{toast}</div>
}

export default function App() {
  return (
    <AuthProvider>
      <CartProvider>
        <Navbar />
        <Toast />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/marketplaces" element={<Marketplaces />} />
          <Route path="/shop" element={<Shop />} />
          <Route path="/vendors" element={<Vendors />} />
          <Route path="/vendors/:id" element={<VendorProfile />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/sell" element={<Sell />} />
          <Route path="/delivery" element={<Delivery />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/signin" element={<SignIn />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="*" element={<Home />} />
        </Routes>
      </CartProvider>
    </AuthProvider>
  )
}
