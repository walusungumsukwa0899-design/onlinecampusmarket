import { useNavigate } from 'react-router-dom'
import { useCart } from '../lib/CartContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Wishlist() {
  const navigate = useNavigate()
  const { wishlist, toggleWishlist, addToCart } = useCart()

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 20px 40px' }}>
        <h1 style={{ fontWeight: 900, fontSize: '24px', marginBottom: '24px' }}>❤️ My Wishlist</h1>
        {wishlist.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">❤️</div>
            <h3>Nothing saved yet</h3>
            <p>Tap the heart on any product to save it here.</p>
            <button className="btn-primary" onClick={() => navigate('/vendors')}>Browse Products</button>
          </div>
        ) : (
          <div className="products-grid">
            {wishlist.map(p => (
              <div key={p.id} className="product-card" onClick={() => navigate(`/products/${p.id}`)}>
                <div className="product-img">
                  {p.image_url ? <img src={p.image_url} alt={p.name} /> : <span>{p.icon || '📦'}</span>}
                </div>
                <div className="product-info">
                  <div className="product-name">{p.name}</div>
                  <div className="product-seller">{p.seller}</div>
                  <div className="product-price">{p.price}</div>
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button className="add-cart-btn" style={{ flex: 1 }}
                      onClick={e => { e.stopPropagation(); addToCart(p) }}>Add to Cart</button>
                    <button onClick={e => { e.stopPropagation(); toggleWishlist(p) }}
                      style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '0 12px', cursor: 'pointer', fontSize: '16px' }}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
