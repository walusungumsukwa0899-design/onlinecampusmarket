import { useEffect, useState } from 'react'
import { useSEO } from '../lib/useSEO'
import { SkeletonGrid } from '../components/Skeleton'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import Footer from '../components/Footer'
import './Home.css'

const CATEGORIES = [
  {icon:'👗',name:'Fashion & Clothing'},{icon:'📱',name:'Electronics'},{icon:'🍱',name:'Food & Drinks'},
  {icon:'📚',name:'Books & Stationery'},{icon:'✏️',name:'Books & Stationery'},{icon:'💊',name:'Beauty & Health'},
  {icon:'🏠',name:'Home & Living'},{icon:'💄',name:'Beauty & Health'},{icon:'⚽',name:'Sports & Fitness'},
  {icon:'🔧',name:'Auto Parts'},{icon:'🛠️',name:'Services'},{icon:'📦',name:'Other'},
]

export default function Home() {
  useSEO({ title: 'Home', description: 'Discover products from student vendors across Malawi universities. Shop fashion, food, electronics and more.' })
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [recentlyViewed, setRecentlyViewed] = useState([])

  useEffect(() => {
    try {
      const rv = JSON.parse(localStorage.getItem('wolf_recently_viewed') || '[]')
      setRecentlyViewed(rv.slice(0, 4))
    } catch {}
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('products')
          .select('*, vendors(name)')
          .eq('available', true)
          .order('created_at', { ascending: false })
          .limit(8)
        setProducts((data || []).filter(p => p.vendor_id && p.vendors))
      } catch (err) {
        console.error('Failed to load products:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="home-page">
      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">🐺 Malawi's Campus Marketplace</div>
        <h1>Shop Smart.<br/><span>Study Hard.</span></h1>
        <p>Buy and sell everything on campus — fashion, food, electronics, books and more. Delivered to your hostel door.</p>
        <div className="hero-btns">
          <button className="btn-primary" onClick={() => navigate('/marketplaces')}>Choose Your Campus</button>
          <button className="btn-secondary" onClick={() => navigate('/vendors')}>Become a Vendor</button>
        </div>
        <div className="hero-stats">
          <div className="hero-stat"><div className="stat-num">2,400+</div><div className="stat-label">Products Listed</div></div>
          <div className="hero-stat"><div className="stat-num">380+</div><div className="stat-label">Campus Vendors</div></div>
          <div className="hero-stat"><div className="stat-num">12K+</div><div className="stat-label">Students Served</div></div>
          <div className="hero-stat"><div className="stat-num">15+</div><div className="stat-label">Institutions</div></div>
        </div>
      </section>

      {/* CATEGORIES */}
      <section className="section" style={{background:'white'}}>
        <div className="container">
          <div className="section-header">
            <div className="eyebrow">Browse by Category</div>
            <h2 className="section-title">Everything on Campus</h2>
          </div>
          <div className="cat-grid">
            {CATEGORIES.map(c => (
              <div key={c.name} className="cat-card" onClick={() => navigate(`/shop?cat=${c.name}`)}>
                <div className="cat-icon">{c.icon}</div>
                <div className="cat-name">{c.name}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="section features-bg">
        <div className="container">
          <div className="section-header">
            <div className="eyebrow">Why Wolf Marketplace</div>
            <h2 className="section-title">Built for Campus Life</h2>
          </div>
          <div className="features-grid">
            {[
              {icon:'🏪',title:'Student Vendors',desc:'Buy directly from fellow students and campus entrepreneurs. Real people, real products.'},
              {icon:'🚚',title:'Vendor Delivery',desc:'Pay securely, then arrange delivery or pickup directly with the vendor on chat.'},
              {icon:'📱',title:'Airtel & TNM Pay',desc:'Pay with Airtel Money or TNM Mpamba. No bank card needed.'},
              {icon:'💬',title:'Chat with Vendors',desc:'Ask vendors directly if items are available before placing an order.'},
              {icon:'⭐',title:'Buyer Reviews',desc:'Rate products and vendors after every purchase. Keep the marketplace honest.'},
              {icon:'🏛️',title:'Campus Markets',desc:'Each university has its own marketplace. Shop local or browse all campuses.'},
            ].map(f => (
              <div key={f.title} className="feature-card">
                <div className="feature-icon">{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FEATURED PRODUCTS */}
      <section className="section" style={{background:'white'}}>
        <div className="container">
          <div className="section-header">
            <div className="eyebrow">Just Listed</div>
            <h2 className="section-title">Fresh on Campus</h2>
          </div>
          {loading
            ? <div className="loading"><div className="spinner"/><span>Loading products...</span></div>
            : products.length === 0
            ? <div className="empty-state"><div className="empty-icon">📦</div><h3>No products yet</h3><p>Be the first to list a product!</p><button className="btn-primary" onClick={() => navigate('/sell')}>List a Product</button></div>
            : <div className="products-grid">
                {products.map(p => (
                  <div key={p.id} className="product-card" onClick={() => navigate(`/products/${p.id}`)}>
                    <div className="product-img">
                      {p.image_url ? <img src={p.image_url} alt={p.name}/> : <span>{p.icon || '📦'}</span>}
                    </div>
                    <div className="product-body">
                      <div className="product-name">{p.name}</div>
                      <div className="product-seller">by {p.vendors?.name}</div>
                      <div className="product-footer">
                        <div className="product-price">MWK {Number(p.price).toLocaleString()}</div>
                        <div className="product-badge">{p.category}</div>
                      </div>
                      <div style={{display:'flex',gap:'6px'}}>
                        <button className="add-cart-btn" style={{flex:1}} onClick={e => { e.stopPropagation(); addToCart({id:p.id,name:p.name,price:`MWK ${Number(p.price).toLocaleString()}`,rawPrice:p.price,icon:p.icon||'📦',seller:p.vendors?.name,vendor_id:p.vendor_id,image_url:p.image_url}) }}>Add to Cart</button>
                        <button onClick={e=>{ e.stopPropagation(); toggleWishlist({id:p.id,name:p.name,price:`MWK ${Number(p.price).toLocaleString()}`,rawPrice:p.price,icon:p.icon||'📦',seller:p.vendors?.name,vendor_id:p.vendor_id,image_url:p.image_url}) }} style={{background:isWishlisted(p.id)?'#fee2e2':'var(--light)',border:'none',borderRadius:'8px',padding:'0 10px',cursor:'pointer',fontSize:'15px'}}>{isWishlisted(p.id)?'❤️':'🤍'}</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
          }
          <div style={{textAlign:'center',marginTop:'24px'}}>
            <button className="btn-primary" onClick={() => navigate('/shop')}>View All Products</button>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-banner">
        <div className="container" style={{textAlign:'center'}}>
          <h2>Start Selling on Campus Today</h2>
          <p>Turn your skills and products into income. Join 380+ student vendors already earning on Wolf Marketplace.</p>
          <button className="btn-white" onClick={() => navigate('/sell')}>List Your Products →</button>
        </div>
      </section>

      <Footer />
    </div>
  )
}
