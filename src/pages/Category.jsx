import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

const CATEGORY_ICONS = {
  'Fashion & Clothing':'👗','Electronics':'📱','Food & Drinks':'🍔',
  'Books & Stationery':'📚','Beauty & Health':'💄','Services':'🛠️',
  'Art & Crafts':'🎨','Home & Living':'🏠','Sports & Fitness':'⚽',
  'Auto Parts':'🔧','Other':'📦'
}

export default function Category() {
  const { slug } = useParams()
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [sortBy, setSortBy] = useState('newest')

  // Decode slug back to category name
  const catName = decodeURIComponent(slug)
  const icon = CATEGORY_ICONS[catName] || '📦'

  useEffect(() => { loadProducts() }, [slug, sortBy])

  async function loadProducts() {
    setLoading(true)
    try {
      let query = supabase
        .from('products')
        .select('*, vendors(name, university, avg_rating)')
        .eq('category', catName)
        .eq('available', true)
      if (sortBy === 'newest') query = query.order('created_at', { ascending: false })
      else if (sortBy === 'price_asc') query = query.order('price', { ascending: true })
      else if (sortBy === 'price_desc') query = query.order('price', { ascending: false })
      else if (sortBy === 'popular') query = query.order('view_count', { ascending: false })
      const { data } = await query
      setProducts((data || []).filter(p => p.vendor_id && p.vendors))
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '960px', margin: '0 auto', padding: '90px 16px 60px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
          <div style={{ fontSize: '52px' }}>{icon}</div>
          <div>
            <h1 style={{ fontWeight: 900, fontSize: '28px', margin: 0 }}>{catName}</h1>
            <p style={{ color: 'var(--gray)', margin: '4px 0 0', fontSize: '14px' }}>{products.length} products available on campus</p>
          </div>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)}
            style={{ marginLeft: 'auto', padding: '8px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', background: 'white', cursor: 'pointer' }}>
            <option value="newest">Newest first</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="popular">Most Viewed</option>
          </select>
        </div>

        {loading ? (
          <div className="loading"><div className="spinner"/><span>Loading...</span></div>
        ) : products.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{icon}</div>
            <h3>No products in {catName} yet</h3>
            <p>Be the first to sell in this category!</p>
            <button className="btn-primary" onClick={() => navigate('/sell')}>Start Selling</button>
          </div>
        ) : (
          <div className="products-grid">
            {products.map(p => (
              <div key={p.id} className="product-card" onClick={() => navigate(`/products/${p.id}`)}>
                <div className="product-img">
                  {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy"/> : <span>{p.icon || icon}</span>}
                </div>
                <div className="product-info">
                  <div className="product-name">{p.name}</div>
                  <div className="product-seller">{p.vendors?.name} · {p.vendors?.university}</div>
                  <div className="product-price">MWK {Number(p.price).toLocaleString()}</div>
                  {p.stock_qty !== null && p.stock_qty <= 5 && p.stock_qty > 0 && (
                    <div style={{ fontSize: '11px', color: '#f97316', fontWeight: 700 }}>Only {p.stock_qty} left!</div>
                  )}
                  <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                    <button className="add-cart-btn" style={{ flex: 1 }}
                      disabled={p.stock_qty === 0}
                      onClick={e => { e.stopPropagation(); addToCart({ id: p.id, name: p.name, price: `MWK ${Number(p.price).toLocaleString()}`, rawPrice: p.price, icon: p.icon || '📦', seller: p.vendors?.name, vendor_id: p.vendor_id, image_url: p.image_url }) }}>
                      {p.stock_qty === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                    <button onClick={e => { e.stopPropagation(); toggleWishlist({ id: p.id, name: p.name, price: `MWK ${Number(p.price).toLocaleString()}`, rawPrice: p.price, icon: p.icon || '📦', seller: p.vendors?.name, vendor_id: p.vendor_id, image_url: p.image_url }) }}
                      style={{ background: isWishlisted(p.id) ? '#fee2e2' : 'var(--light)', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: 'pointer', fontSize: '15px' }}>
                      {isWishlisted(p.id) ? '❤️' : '🤍'}
                    </button>
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
