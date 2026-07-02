import { useEffect, useState } from 'react'
import { useSEO } from '../lib/useSEO'
import { SkeletonGrid } from '../components/Skeleton'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import { getRecentlyViewed } from '../lib/recentlyViewed'
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
  const [heroSearch, setHeroSearch] = useState('')

  function handleHeroSearch(e) {
    e.preventDefault()
    if (heroSearch.trim()) navigate(`/search?q=${encodeURIComponent(heroSearch.trim())}`)
  }

  useEffect(() => {
    getRecentlyViewed(4).then(setRecentlyViewed)
  }, [])

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('products')
          .select('*, vendors(name, avg_rating, review_count)')
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

    // Live-update the "Fresh on Campus" feed the instant a new product is listed,
    // without needing a page refresh.
    const feedSub = supabase
      .channel('home-fresh-feed')
      .on('postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'products', filter: 'available=eq.true' },
        async (payload) => {
          const { data: full } = await supabase
            .from('products')
            .select('*, vendors(name, avg_rating, review_count)')
            .eq('id', payload.new.id)
            .single()
          if (!full || !full.vendor_id || !full.vendors) return
          setProducts(prev => {
            if (prev.some(p => p.id === full.id)) return prev
            return [full, ...prev].slice(0, 8)
          })
        }
      )
      .subscribe()

    return () => { feedSub.unsubscribe() }
  }, [])

  return (
    <div className="home-page">
      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">🐺 Malawi&apos;s Campus Marketplace</div>
        <h1>Shop Smart.<br/><span>Study Hard.</span></h1>
        <p>Buy and sell everything on campus — fashion, food, electronics, books and more. Delivered to your hostel door.</p>
        <div className="hero-btns">
          <button className="btn-primary" onClick={() => navigate('/marketplaces')}>Choose Your Campus</button>
          <button className="btn-secondary" onClick={() => navigate('/vendors')}>Become a Vendor</button>
        </div>
        <form onSubmit={handleHeroSearch} style={{ display: 'flex', gap: '8px', maxWidth: '480px', margin: '24px auto 0', width: '100%' }}>
          <input value={heroSearch} onChange={e => setHeroSearch(e.target.value)}
            placeholder="Search products, e.g. laptop, jollof…"
            style={{ flex: 1, padding: '12px 18px', borderRadius: '10px', border: 'none', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', background: 'rgba(255,255,255,0.95)' }} />
          <button type="submit" style={{ background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '10px', padding: '0 20px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', flexShrink: 0 }}>Search</button>
        </form>
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
              <div key={c.name} className="cat-card" onClick={() => navigate(`/vendors?cat=${c.name}`)}>
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
                      {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" onError={e=>{e.target.style.display='none';e.target.nextElementSibling.style.display='flex';}}/> : null}
                      <span style={{display:p.image_url?'none':'flex'}}>{p.icon || '📦'}</span>
                    </div>
                    <div className="product-body">
                      <div className="product-name">{p.name}</div>
                      <div className="product-seller">by {p.vendors?.name}</div>
                      {p.vendors?.avg_rating > 0 && (
                        <div style={{display:'flex',alignItems:'center',gap:'2px',margin:'3px 0'}}>
                          {'★'.repeat(Math.floor(p.vendors.avg_rating)).split('').map((_,i)=><span key={i} style={{color:'#f59e0b',fontSize:'10px'}}>★</span>)}
                          <span style={{fontSize:'10px',color:'#6b7280',fontWeight:600}}>{Number(p.vendors.avg_rating).toFixed(1)}</span>
                        </div>
                      )}
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
            <button className="btn-primary" onClick={() => navigate('/vendors')}>View All Products</button>
          </div>
        </div>
      </section>

      {/* RECENTLY VIEWED */}
      {recentlyViewed.length > 0 && (
        <section className="section" style={{background:'var(--light)',padding:'40px 0'}}>
          <div className="container">
            <div className="section-header" style={{marginBottom:'20px'}}>
              <div className="eyebrow">Your History</div>
              <h2 className="section-title" style={{fontSize:'20px'}}>Recently Viewed</h2>
            </div>
            <div className="products-grid">
              {recentlyViewed.map(p => (
                <div key={p.id} className="product-card" onClick={() => navigate(`/products/${p.id}`)}>
                  <div className="product-img">
                    {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" onError={e=>{e.target.style.display='none';e.target.nextElementSibling.style.display='flex';}}/> : null}
                    <span style={{display:p.image_url?'none':'flex'}}>{p.icon || '📦'}</span>
                  </div>
                  <div className="product-body">
                    <div className="product-name">{p.name}</div>
                    <div className="product-seller">by {p.vendors?.name}</div>
                    <div className="product-footer">
                      <div className="product-price">MWK {Number(p.price).toLocaleString()}</div>
                    </div>
                    <button className="add-cart-btn" style={{marginTop:'8px'}} onClick={e => { e.stopPropagation(); addToCart({id:p.id,name:p.name,price:`MWK ${Number(p.price).toLocaleString()}`,rawPrice:p.price,icon:p.icon||'📦',seller:p.vendors?.name,vendor_id:p.vendor_id,image_url:p.image_url}) }}>Add to Cart</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      {/* DISCOVER STRIP */}
      <section style={{background:'white',padding:'32px 0',borderTop:'1.5px solid var(--border)'}}>
        <div className="container">
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:'16px'}}>
            {[
              {icon:'🔥',title:'Trending Now',desc:'The most-viewed products this week',color:'#fff4ee',border:'#fed7aa',link:'/trending'},
              {icon:'✨',title:'New Arrivals',desc:'Products listed in the last 7 days',color:'#f0fdf4',border:'#bbf7d0',link:'/trending?tab=new'},
              {icon:'🏷️',title:'On Sale',desc:'Discounted items from campus vendors',color:'#fef9c3',border:'#fde68a',link:'/trending?tab=sale'},
            ].map(s => (
              <div key={s.title} onClick={() => navigate(s.link)}
                style={{background:s.color,border:`1.5px solid ${s.border}`,borderRadius:'14px',padding:'20px',cursor:'pointer',display:'flex',alignItems:'center',gap:'14px'}}>
                <div style={{fontSize:'32px',flexShrink:0}}>{s.icon}</div>
                <div>
                  <div style={{fontWeight:800,fontSize:'14px'}}>{s.title}</div>
                  <div style={{fontSize:'12px',color:'var(--gray)',marginTop:'2px'}}>{s.desc}</div>
                </div>
                <span style={{marginLeft:'auto',color:'var(--wolf)',fontWeight:700,fontSize:'16px'}}>→</span>
              </div>
            ))}
          </div>
        </div>
      </section>

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
