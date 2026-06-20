import { useNavigate } from 'react-router-dom'
import { useCart } from '../lib/CartContext'
import Footer from '../components/Footer'
import './Cart.css'

export default function Cart() {
  const navigate = useNavigate()
  const { cart, removeFromCart, changeQty, clearCart } = useCart()

  const subtotal = cart.reduce((a, i) => a + (parseInt(String(i.rawPrice || i.price).replace(/[^0-9]/g,'')) * i.qty), 0)
  const delivery = cart.length > 0 ? 300 : 0
  const total = subtotal + delivery

  if (cart.length === 0) return (
    <div className="cart-page">
      <div className="empty-state">
        <div className="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Browse products and add items to your cart.</p>
        <button className="btn-primary" onClick={() => navigate('/shop')}>Start Shopping</button>
      </div>
      <Footer />
    </div>
  )

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <h2>🛒 My Cart <span>({cart.length} item{cart.length !== 1 ? 's' : ''})</span></h2>
          <button className="clear-btn" onClick={clearCart}>Clear all</button>
        </div>

        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((item, idx) => (
              <div key={item.id || idx} className="cart-item">
                <div className="cart-item-img">{item.icon}</div>
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-seller">{item.seller}</div>
                  <div className="cart-item-price">{item.price}</div>
                  <div className="qty-row">
                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                  </div>
                </div>
                <button className="remove-btn" onClick={() => removeFromCart(item.id)}>✕</button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="summary-row"><span>Subtotal</span><span>MWK {subtotal.toLocaleString()}</span></div>
            <div className="summary-row"><span>Delivery fee</span><span>MWK {delivery.toLocaleString()}</span></div>
            <div className="summary-row total"><span>Total</span><span>MWK {total.toLocaleString()}</span></div>
            <div className="pay-methods">
              <div className="pay-label">Pay with:</div>
              <div className="pay-btns">
                <button className="pay-btn airtel" onClick={() => alert('Redirecting to Airtel Money...')}>📱 Airtel Money</button>
                <button className="pay-btn tnm" onClick={() => alert('Redirecting to TNM Mpamba...')}>📱 TNM Mpamba</button>
              </div>
            </div>
            <button className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'13px',marginTop:'4px'}}
              onClick={() => alert('🎉 Order placed! You will be contacted by the vendor shortly.')}>
              Place Order →
            </button>
            <button className="continue-btn" onClick={() => navigate('/shop')}>← Continue Shopping</button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
