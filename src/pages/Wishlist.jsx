import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../lib/CartContext'

function ShareWishlistModal({ wishlist, onClose }) {
  const [copied, setCopied] = useState(false)

  // Build a simple shareable text list
  const text = wishlist.map((p, i) =>
    `${i + 1}. ${p.name} — MWK ${Number(p.price || 0).toLocaleString()}`
  ).join('\n')

  const fullText = `🐺 My Wolf Marketplace Wishlist\n\n${text}\n\nShop at: https://onlinecampusmarket.vercel.app`

  function copy() {
    navigator.clipboard.writeText(fullText).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  function shareWhatsApp() {
    window.open(`https://wa.me/?text=${encodeURIComponent(fullText)}`, '_blank')
  }

  function shareFacebook() {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent('https://onlinecampusmarket.vercel.app')}`, '_blank')
  }

  async function nativeShare() {
    if (!navigator.share) return
    try {
      await navigator.share({ title: 'My Wolf Wishlist', text: fullText, url: 'https://onlinecampusmarket.vercel.app' })
    } catch (_) {}
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h3 style={{ marginBottom: '4px' }}>📤 Share Your Wishlist</h3>
        <p style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '16px' }}>
          {wishlist.length} item{wishlist.length !== 1 ? 's' : ''} on your wishlist
        </p>

        {/* Preview */}
        <div style={{ background: 'var(--light)', borderRadius: '10px', padding: '12px', marginBottom: '16px', fontSize: '12px', color: '#374151', lineHeight: 1.7, maxHeight: '120px', overflowY: 'auto' }}>
          {wishlist.map((p, i) => (
            <div key={p.id}>{i + 1}. {p.name} — MWK {Number(p.price || 0).toLocaleString()}</div>
          ))}
        </div>

        {/* Share buttons */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          <button onClick={shareWhatsApp}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#25D366', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 16px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: '18px' }}>💬</span> Share on WhatsApp
          </button>
          <button onClick={shareFacebook}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: '#1877F2', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 16px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: '18px' }}>📘</span> Share on Facebook
          </button>
          {navigator.share && (
            <button onClick={nativeShare}
              style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '10px', padding: '12px 16px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
              <span style={{ fontSize: '18px' }}>📲</span> Share via Phone
            </button>
          )}
          <button onClick={copy}
            style={{ display: 'flex', alignItems: 'center', gap: '10px', background: 'var(--light)', color: '#374151', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '12px 16px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: '18px' }}>{copied ? '✅' : '📋'}</span>
            {copied ? 'Copied!' : 'Copy as Text'}
          </button>
        </div>
        <button onClick={onClose} style={{ width: '100%', background: 'none', border: 'none', color: 'var(--gray)', fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', padding: '8px' }}>
          Close
        </button>
      </div>
    </div>
  )
}

export default function Wishlist() {
  const navigate = useNavigate()
  const { wishlist, toggleWishlist, addToCart } = useCart()
  const [showShare, setShowShare] = useState(false)

  return (
    <div>
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '100px 20px 80px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <h1 style={{ fontWeight: 900, fontSize: '24px', margin: 0 }}>❤️ My Wishlist</h1>
          {wishlist.length > 0 && (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setShowShare(true)}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'white', border: '1.5px solid var(--border)', borderRadius: '10px', padding: '8px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                📤 Share List
              </button>
              <button
                onClick={() => { wishlist.forEach(p => addToCart(p)) }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '10px', padding: '8px 14px', fontWeight: 700, fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
                🛒 Add All to Cart
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
                  {p.image_url ? <img src={p.image_url} alt={p.name} /> : <span>{p.icon || '📦'}</span>}
                </div>
                <div className="product-info">
                  <div className="product-name">{p.name}</div>
                  <div className="product-seller">{p.seller}</div>
                  <div className="product-price">MWK {Number(p.price || 0).toLocaleString()}</div>
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

      {showShare && <ShareWishlistModal wishlist={wishlist} onClose={() => setShowShare(false)} />}
    </div>
  )
}
