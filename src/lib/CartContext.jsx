import { createContext, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

const CartContext = createContext(null)

export function CartProvider({ children }) {
  const [cart, setCart] = useState([])
  const [wishlist, setWishlist] = useState(() => {
    try { return JSON.parse(localStorage.getItem('wolf_wishlist') || '[]') } catch { return [] }
  })

  // Persist wishlist locally
  useEffect(() => {
    localStorage.setItem('wolf_wishlist', JSON.stringify(wishlist))
  }, [wishlist])

  function isWishlisted(productId) { return wishlist.some(w => w.id === productId) }

  function toggleWishlist(product) {
    setWishlist(prev => {
      const exists = prev.some(w => w.id === product.id)
      if (exists) {
        showToast('Removed from wishlist')
        return prev.filter(w => w.id !== product.id)
      }
      showToast('❤️ Saved to wishlist')
      return [...prev, { id: product.id, name: product.name, price: product.price, rawPrice: product.rawPrice, icon: product.icon, seller: product.seller, vendor_id: product.vendor_id, image_url: product.image_url }]
    })
  }

  function clearWishlist() { setWishlist([]) }
  const [toast, setToast] = useState(null)
  const toastTimer = useRef(null)

  function showToast(msg) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast(msg)
    toastTimer.current = setTimeout(() => setToast(null), 2500)
  }

  function addToCart(item) {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) return prev.map(i => i.id === item.id ? { ...i, qty: i.qty + 1 } : i)
      return [...prev, { ...item, qty: 1 }]
    })
    showToast(`✅ ${item.name} added to cart`)
  }

  function removeFromCart(id) {
    setCart(prev => prev.filter(i => i.id !== id))
    showToast('Item removed from cart')
  }

  function changeQty(id, delta) {
    setCart(prev => prev.map(i => i.id === id ? { ...i, qty: Math.max(1, i.qty + delta) } : i))
  }

  function clearCart() { setCart([]) }

  const totalItems = cart.reduce((a, i) => a + i.qty, 0)

  return (
    <CartContext.Provider value={{ cart, addToCart, removeFromCart, changeQty, clearCart, totalItems, toast, showToast, wishlist, toggleWishlist, isWishlisted, clearWishlist }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() { return useContext(CartContext) }
