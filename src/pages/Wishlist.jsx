import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../lib/CartContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function Wishlist() {
  const navigate = useNavigate()
  const { wishlist, toggleWishlist, addToCart } = useCart()
  const [shared, setShared] = useState(false)

  async function shareWishlist() {
    const text = `My Wolf Marketplace wishlist 🐺❤️\n\n` + wishlist.map(p => `• ${p.name} — MWK ${Number(p.rawPrice || p.price).toLocaleString()}`).join('\n') + `\n\nShop at wolfmarketplace.app`
    if (navigator.share) {
      await navigator.share({ title: 'My Wolf Wishlist', text }).catch(() => {})
    } else {
      await navigator.clipboard.writeText(text)
      setShared(true)
      setTimeout(() => setShared(false), 2500)
    }
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 20px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontWeight: 900, fontSize: '24px', margin: 0 }}>❤️ My Wishlist {wishlist.length > 0 && <span style={{ fontSize: '16px', color: 'var(--gray)', fontWeight: 400 }}>({wishlist.length})</span>}</h1>
          {wishlist.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => wishlist.forEach(p => addToCart(p))}
                style={{ background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                🛒 Add All to Cart
              </button>
              <button onClick={shareWishlist}
                style={{ background: 'var(--light)', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
                {shared ? '✅ Copied!' : '📤 Share List'}
              </button>
            </div>
          )}
        </div>
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
                  {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" onError={e=>{e.target.style.display='none';e.target.nextElementSibling.style.display='flex';}}/> : null}
                  <span style={{display:p.image_url?'none':'flex'}}>{p.icon || '📦'}</span>
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
