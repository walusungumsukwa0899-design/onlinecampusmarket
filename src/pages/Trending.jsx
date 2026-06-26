import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import Footer from '../components/Footer'

export default function Trending() {
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [trending, setTrending] = useState([])
  const [newArrivals, setNewArrivals] = useState([])
  const [onSale, setOnSale] = useState([])
  const [tab, setTab] = useState('trending')
  const [loading, setLoading] = useState(true)

  useEffect(() => { load() }, [])

  async function load() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const [{ data: trend }, { data: newest }, { data: sale }] = await Promise.all([
      // Trending = most views + orders in last 7 days
      supabase.from('products').select('*, vendors(name, avg_rating)')
        .eq('available', true).gt('view_count', 0)
        .order('view_count', { ascending: false }).limit(20),
      // New arrivals = listed in last 7 days
      supabase.from('products').select('*, vendors(name, avg_rating)')
        .eq('available', true).gte('created_at', sevenDaysAgo)
        .order('created_at', { ascending: false }).limit(20),
      // On sale = products with compare_at_price > price
      supabase.from('products').select('*, vendors(name, avg_rating)')
        .eq('available', true).not('compare_at_price', 'is', null)
        .order('created_at', { ascending: false }).limit(20),
    ])
    setTrending((trend || []).filter(p => p.vendors))
    setNewArrivals((newest || []).filter(p => p.vendors))
    setOnSale((sale || []).filter(p => p.vendors && p.compare_at_price > p.price))
    setLoading(false)
  }

  const TABS = [
    { id: 'trending', label: '🔥 Trending', data: trending },
    { id: 'new', label: '✨ New Arrivals', data: newArrivals },
    { id: 'sale', label: '🏷️ On Sale', data: onSale },
  ]
  const activeData = TABS.find(t => t.id === tab)?.data || []

  return (
    <div style={{minHeight:'100vh',paddingBottom:'80px'}}>
      <div style={{background:'linear-gradient(135deg,#0e1a12,#1a3a20)',padding:'80px 24px 0'}}>
        <div style={{maxWidth:'1100px',margin:'0 auto'}}>
          <h1 style={{color:'white',fontWeight:900,fontSize:'26px',marginBottom:'4px'}}>🔥 Discover</h1>
          <p style={{color:'rgba(255,255,255,.7)',fontSize:'14px',marginBottom:'20px'}}>What's hot, what's new, and what's on sale right now</p>
          <div style={{display:'flex',gap:'4px'}}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{padding:'10px 18px',borderRadius:'10px 10px 0 0',border:'none',background:tab===t.id?'white':'transparent',color:tab===t.id?'var(--wolf)':'rgba(255,255,255,.75)',fontWeight:700,fontSize:'13px',cursor:'pointer',transition:'all .15s'}}>
                {t.label} {t.data.length > 0 && <span style={{fontSize:'10px',opacity:.7}}>({t.data.length})</span>}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:'1100px',margin:'0 auto',padding:'24px 16px'}}>
        {loading ? (
          <div className="loading"><div className="spinner"/><span>Loading...</span></div>
        ) : activeData.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">{tab==='trending'?'🔥':tab==='new'?'✨':'🏷️'}</div>
            <h3>{tab==='trending'?'Nothing trending yet':tab==='new'?'No new arrivals this week':'No items on sale right now'}</h3>
            <p>Check back soon!</p>
            <button className="btn-primary" onClick={() => navigate('/vendors')}>Browse All Products</button>
          </div>
        ) : (
          <div className="products-grid">
            {activeData.map((p, i) => {
              const cartItem = { id:p.id, name:p.name, price:`MWK ${Number(p.price).toLocaleString()}`, rawPrice:p.price, icon:p.icon||'📦', seller:p.vendors?.name, vendor_id:p.vendor_id, image_url:p.image_url }
              const discount = p.compare_at_price ? Math.round((1 - p.price/p.compare_at_price)*100) : 0
              return (
                <div key={p.id} className="product-card" onClick={() => navigate(`/products/${p.id}`)}>
                  <div className="product-img" style={{position:'relative'}}>
                    {p.image_url ? <img src={p.image_url} alt={p.name}/> : <span>{p.icon||'📦'}</span>}
                    {tab==='trending' && i < 3 && (
                      <div style={{position:'absolute',top:'8px',left:'8px',background:['#E8630A','#6366f1','#0ea5e9'][i],color:'white',borderRadius:'20px',padding:'3px 10px',fontSize:'10px',fontWeight:900}}>
                        {['🥇 #1','🥈 #2','🥉 #3'][i]}
                      </div>
                    )}
                    {discount > 0 && <div style={{position:'absolute',top:'8px',right:'8px',background:'#ef4444',color:'white',borderRadius:'20px',padding:'3px 10px',fontSize:'10px',fontWeight:900}}>-{discount}%</div>}
                    {tab==='new' && <div style={{position:'absolute',top:'8px',left:'8px',background:'#22c55e',color:'white',borderRadius:'20px',padding:'3px 10px',fontSize:'10px',fontWeight:900}}>NEW</div>}
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
                      <div>
                        <div className="product-price">MWK {Number(p.price).toLocaleString()}</div>
                        {discount > 0 && <div style={{fontSize:'11px',color:'#9ca3af',textDecoration:'line-through'}}>MWK {Number(p.compare_at_price).toLocaleString()}</div>}
                      </div>
                    </div>
                    {tab==='trending' && p.view_count > 0 && (
                      <div style={{fontSize:'10px',color:'var(--gray)',marginTop:'4px'}}>👀 {p.view_count} views</div>
                    )}
                    <div style={{display:'flex',gap:'6px',marginTop:'8px'}}>
                      <button className="add-cart-btn" style={{flex:1}} onClick={e=>{e.stopPropagation();addToCart(cartItem)}} disabled={!p.available||p.stock_qty===0}>
                        {p.available&&p.stock_qty!==0?'Add to Cart':'Unavailable'}
                      </button>
                      <button onClick={e=>{e.stopPropagation();toggleWishlist(cartItem)}} style={{background:isWishlisted(p.id)?'#fee2e2':'var(--light)',border:'none',borderRadius:'8px',padding:'0 10px',cursor:'pointer',fontSize:'15px'}}>
                        {isWishlisted(p.id)?'❤️':'🤍'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Footer/>
    </div>
  )
}
