import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, signOut } = useAuth()
  const [tab, setTab] = useState('overview')
  const [orders, setOrders] = useState([])
  const [myProducts, setMyProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/signin'); return }
    loadData()
  }, [user])

  async function loadData() {
    const [{ data: ords }, { data: prods }] = await Promise.all([
      supabase.from('orders').select('*, products(name,icon)').eq('buyer_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('products').select('*, vendors!inner(user_id)').eq('vendors.user_id', user.id).order('created_at', { ascending: false }),
    ])
    setOrders(ords || [])
    setMyProducts(prods || [])
    setLoading(false)
  }

  async function toggleAvailability(productId, current) {
    await supabase.from('products').update({ available: !current }).eq('id', productId)
    setMyProducts(prev => prev.map(p => p.id === productId ? { ...p, available: !current } : p))
  }

  async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return
    await supabase.from('products').delete().eq('id', productId)
    setMyProducts(prev => prev.filter(p => p.id !== productId))
  }

  if (!user) return null

  const name = user.user_metadata?.full_name || user.email
  const uni = user.user_metadata?.university || ''

  return (
    <div className="dash-page">
      <div className="dash-layout">
        {/* Sidebar */}
        <aside className="dash-sidebar">
          <div className="dash-user">
            <div className="dash-avatar">{name[0]?.toUpperCase()}</div>
            <div className="dash-user-name">{name}</div>
            <div className="dash-user-uni">{uni}</div>
          </div>
          {[
            {id:'overview',icon:'📊',label:'Overview'},
            {id:'orders',icon:'🛍️',label:'My Orders'},
            {id:'products',icon:'🏪',label:'My Products'},
            {id:'settings',icon:'⚙️',label:'Settings'},
          ].map(item => (
            <div key={item.id} className={`dash-nav-item${tab===item.id?' active':''}`} onClick={() => setTab(item.id)}>
              <span>{item.icon}</span>{item.label}
            </div>
          ))}
          <div className="dash-nav-item sell-btn" onClick={() => navigate('/sell')}><span>➕</span>List Product</div>
          <div className="dash-nav-item signout-btn" onClick={() => { signOut(); navigate('/') }}><span>🚪</span>Sign Out</div>
        </aside>

        {/* Main */}
        <main className="dash-main">
          {loading ? (
            <div className="loading"><div className="spinner"/><span>Loading...</span></div>
          ) : (
            <>
              {tab === 'overview' && (
                <div>
                  <h2 className="dash-title">Welcome back, {name.split(' ')[0]}! 👋</h2>
                  <div className="dash-cards">
                    <div className="dash-card"><div className="dash-card-label">Total Orders</div><div className="dash-card-val">{orders.length}</div><div className="dash-card-sub">All time</div></div>
                    <div className="dash-card"><div className="dash-card-label">My Products</div><div className="dash-card-val">{myProducts.length}</div><div className="dash-card-sub">Listed</div></div>
                    <div className="dash-card"><div className="dash-card-label">Total Spent</div><div className="dash-card-val" style={{fontSize:'16px'}}>MWK {orders.reduce((a,o)=>a+(o.total||0),0).toLocaleString()}</div><div className="dash-card-sub">All orders</div></div>
                  </div>
                  <h3 className="dash-section-title">Recent Orders</h3>
                  {orders.length === 0
                    ? <div className="empty-state"><div className="empty-icon">🛍️</div><h3>No orders yet</h3><p>Start shopping on campus!</p><button className="btn-primary" onClick={() => navigate('/shop')}>Browse Products</button></div>
                    : <div className="orders-list">
                        {orders.slice(0,5).map(o => (
                          <div key={o.id} className="order-row">
                            <span className="order-icon">{o.products?.icon || '📦'}</span>
                            <div className="order-info"><div className="order-name">{o.products?.name || 'Product'}</div><div className="order-meta">MWK {Number(o.total || 0).toLocaleString()}</div></div>
                            <div className={`status-chip ${o.status || 'pending'}`}>{o.status || 'Pending'}</div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              {tab === 'orders' && (
                <div>
                  <h2 className="dash-title">My Orders</h2>
                  {orders.length === 0
                    ? <div className="empty-state"><div className="empty-icon">🛍️</div><h3>No orders yet</h3><button className="btn-primary" onClick={() => navigate('/shop')}>Browse Products</button></div>
                    : <div className="orders-list">
                        {orders.map(o => (
                          <div key={o.id} className="order-row">
                            <span className="order-icon">{o.products?.icon || '📦'}</span>
                            <div className="order-info"><div className="order-name">{o.products?.name || 'Product'}</div><div className="order-meta">{new Date(o.created_at).toLocaleDateString()} · MWK {Number(o.total || 0).toLocaleString()}</div></div>
                            <div className={`status-chip ${o.status || 'pending'}`}>{o.status || 'Pending'}</div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              {tab === 'products' && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                    <h2 className="dash-title" style={{margin:0}}>My Products</h2>
                    <button className="btn-primary" onClick={() => navigate('/sell')}>+ Add Product</button>
                  </div>
                  {myProducts.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📦</div><h3>No products listed</h3><p>Start selling by listing your first product.</p><button className="btn-primary" onClick={() => navigate('/sell')}>List a Product</button></div>
                    : <div className="my-products-list">
                        {myProducts.map(p => (
                          <div key={p.id} className="my-product-row">
                            <div className="my-product-icon">{p.icon || '📦'}</div>
                            <div className="my-product-info">
                              <div className="my-product-name">{p.name}</div>
                              <div className="my-product-meta">MWK {Number(p.price).toLocaleString()} · {p.category}</div>
                            </div>
                            <div className="my-product-actions">
                              <button className={`avail-toggle ${p.available ? 'on' : 'off'}`} onClick={() => toggleAvailability(p.id, p.available)}>
                                {p.available ? '✅ Available' : '❌ Hidden'}
                              </button>
                              <button className="delete-btn" onClick={() => deleteProduct(p.id)}>🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              {tab === 'settings' && (
                <div>
                  <h2 className="dash-title">Account Settings</h2>
                  <div className="settings-card">
                    <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" defaultValue={user.user_metadata?.full_name}/></div>
                    <div className="form-group"><label className="form-label">Email</label><input className="form-input" defaultValue={user.email} disabled style={{background:'var(--light)'}}/></div>
                    <div className="form-group"><label className="form-label">Phone</label><input className="form-input" defaultValue={user.user_metadata?.phone} placeholder="+265 9xx xxx xxx"/></div>
                    <div className="form-group"><label className="form-label">University</label><input className="form-input" defaultValue={user.user_metadata?.university} disabled style={{background:'var(--light)'}}/></div>
                    <button className="btn-primary">Save Changes</button>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
