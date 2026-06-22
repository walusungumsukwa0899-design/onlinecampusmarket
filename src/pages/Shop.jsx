import { useEffect, useState } from 'react'
import { useSEO } from '../lib/useSEO'
import { SkeletonGrid } from '../components/Skeleton'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import Footer from '../components/Footer'
import './Shop.css'

const CATS = ['All','Fashion & Clothing','Electronics','Food & Drinks','Books & Stationery','Beauty & Health','Services','Art & Crafts','Home & Living','Sports & Fitness','Auto Parts','Other']
const UNIS = ['All','UNIMA','The Polytechnic','Mzuzu University','MUST','College of Medicine','Catholic University of Malawi','MUBAS','LUANAR','Malawi Adventist University','Livingstonia University']

export default function Shop() {
  useSEO({ title: 'Shop', description: 'Browse all products listed by campus vendors across Malawi universities.' })
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState(searchParams.get('cat') || 'All')
  const [uni, setUni] = useState(searchParams.get('uni') || 'All')
  const [q, setQ] = useState('')

  useEffect(() => { setQ(''); loadProducts('') }, [cat, uni])

  // Debounce search so we don't fire a DB query on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => loadProducts(q), 300)
    return () => clearTimeout(timer)
  }, [q])

  async function loadProducts(searchQ = q) {
    setLoading(true)
    try {
      let query = supabase.from('products').select(`*, vendors${uni !== 'All' ? '!inner' : ''}(name, university)`).eq('available', true)
      if (cat !== 'All') query = query.eq('category', cat)
      if (uni !== 'All') query = query.eq('vendors.university', uni)
      if (searchQ.trim()) query = query.ilike('name', `%${searchQ.trim()}%`)
      const { data } = await query.order('created_at', { ascending: false })
      setProducts((data || []).filter(p => p.vendor_id && p.vendors))
    } catch (err) {
      console.error('Failed to load products:', err)
    } finally {
      setLoading(false)
    }
  }

  const filtered = products

  return (
    <div className="shop-page">
      <div className="shop-layout container">
        {/* Sidebar */}
        <aside className="shop-sidebar">
          <div className="sidebar-section">
            <div className="sidebar-title">Categories</div>
            {CATS.map(c => (
              <div key={c} className={`sidebar-item${cat===c?' active':''}`} onClick={() => setCat(c)}>
                <div className="sidebar-dot"/>{c}
              </div>
            ))}
          </div>
          <div className="sidebar-section">
            <div className="sidebar-title">University</div>
            {UNIS.map(u => (
              <div key={u} className={`sidebar-item${uni===u?' active':''}`} onClick={() => setUni(u)}>
                <div className="sidebar-dot"/>{u === 'All' ? 'All Universities' : u}
              </div>
            ))}
          </div>
        </aside>

        {/* Main */}
        <div className="shop-main">
          <div className="shop-topbar">
            <div className="search-wrap">
              <input placeholder="Search products..." value={q} onChange={e => setQ(e.target.value)}/>
              <button onClick={() => {}}>Search</button>
            </div>
            <span className="results-count">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {loading
            ? <div className="loading"><div className="spinner"/><span>Loading...</span></div>
            : filtered.length === 0
            ? <div className="empty-state"><div className="empty-icon">🔍</div><h3>No products found</h3><p>Try a different category or search term.</p></div>
            : <div className="products-grid">
                {filtered.map(p => (
                  <div key={p.id} className="product-card" onClick={() => navigate(`/products/${p.id}`)}>
                    <div className="product-img">
                      {p.image_url ? <img src={p.image_url} alt={p.name}/> : <span>{p.icon||'📦'}</span>}
                    </div>
                    <div className="product-body">
                      <div className="product-name">{p.name}</div>
                      <div className="product-seller" style={{color:'var(--wolf)'}}>by {p.vendors?.name}</div>
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
        </div>
      </div>
      <Footer />
    </div>
  )
}
