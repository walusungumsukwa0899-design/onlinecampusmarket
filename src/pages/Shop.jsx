import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import Footer from '../components/Footer'
import './Shop.css'

const CATS = ['All','Fashion','Electronics','Food & Drinks','Books','Stationery','Health','Home & Living','Beauty','Sports','Auto Parts','Services','Other']
const UNIS = ['All','UNIMA','The Polytechnic','Mzuzu University','MUST','College of Medicine','Catholic University of Malawi','MUBAS','LUANAR','Malawi Adventist University','Livingstonia University']

export default function Shop() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { addToCart } = useCart()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cat, setCat] = useState(searchParams.get('cat') || 'All')
  const [uni, setUni] = useState(searchParams.get('uni') || 'All')
  const [q, setQ] = useState('')

  useEffect(() => { loadProducts() }, [cat, uni])

  async function loadProducts() {
    setLoading(true)
    let query = supabase.from('products').select(`*, vendors${uni !== 'All' ? '!inner' : ''}(name, university)`).eq('available', true)
    if (cat !== 'All') query = query.eq('category', cat)
    if (uni !== 'All') query = query.eq('vendors.university', uni)
    const { data } = await query.order('created_at', { ascending: false })
    setProducts(data || [])
    setLoading(false)
  }

  const filtered = products.filter(p =>
    !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.category?.toLowerCase().includes(q.toLowerCase())
  )

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
                  <div key={p.id} className="product-card" onClick={() => navigate(`/vendors/${p.vendor_id}`)}>
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
                      <button className="add-cart-btn" onClick={e => { e.stopPropagation(); addToCart({id:p.id,name:p.name,price:`MWK ${Number(p.price).toLocaleString()}`,rawPrice:p.price,icon:p.icon||'📦',seller:p.vendors?.name}) }}>Add to Cart</button>
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
