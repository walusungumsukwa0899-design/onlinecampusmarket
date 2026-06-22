import { useEffect, useState } from 'react'
import { SkeletonList, SkeletonGrid } from '../components/Skeleton'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import './Dashboard.css'

function OrderTimeline({ status, createdAt, receivedAt }) {
  const steps = [
    { key: 'pending',   label: 'Order Placed',    icon: '🛒' },
    { key: 'confirmed', label: 'Payment Confirmed', icon: '✅' },
    { key: 'transit',   label: 'In Transit',       icon: '🚚' },
    { key: 'delivered', label: 'Delivered',         icon: '📦' },
  ]
  const ORDER = ['pending','confirmed','transit','delivered']
  const currentIdx = ORDER.indexOf(status)
  return (
    <div style={{display:'flex',alignItems:'flex-start',gap:'0',margin:'12px 0 4px',overflowX:'auto'}}>
      {steps.map((s, i) => {
        const done = i <= currentIdx
        const active = i === currentIdx
        return (
          <div key={s.key} style={{display:'flex',alignItems:'center',flex:1,minWidth:'70px'}}>
            <div style={{display:'flex',flexDirection:'column',alignItems:'center',flex:1}}>
              <div style={{width:'28px',height:'28px',borderRadius:'50%',background:done?'var(--wolf)':'var(--light)',color:done?'white':'var(--gray)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'13px',fontWeight:900,border:active?'2px solid var(--wolf)':'none',transition:'all 0.3s'}}>
                {done ? (i < currentIdx ? '✓' : s.icon) : i+1}
              </div>
              <div style={{fontSize:'10px',color:done?'var(--wolf)':'var(--gray)',fontWeight:done?700:400,textAlign:'center',marginTop:'4px',lineHeight:1.2}}>{s.label}</div>
            </div>
            {i < steps.length - 1 && (
              <div style={{height:'2px',flex:1,background:i < currentIdx?'var(--wolf)':'var(--light)',transition:'background 0.3s',minWidth:'12px',marginBottom:'16px'}}/>
            )}
          </div>
        )
      })}
    </div>
  )
}

function OnboardingChecklist({ vendor, myProducts, payoutPhone }) {
  const steps = [
    { done: !!vendor?.avatar_url, label: 'Add a store photo', hint: 'Go to your store → tap your avatar' },
    { done: !!vendor?.banner_url, label: 'Add a store banner', hint: 'Go to your store → tap the banner area' },
    { done: myProducts.length > 0, label: 'List your first product', hint: 'Click "Sell" in the menu' },
    { done: !!payoutPhone, label: 'Set up your payout number', hint: 'Go to Settings → Payout Details' },
    { done: !!vendor?.phone, label: 'Add a WhatsApp number', hint: 'Edit your store to add a contact number' },
  ]
  const done = steps.filter(s => s.done).length
  if (done === steps.length) return null // hide when complete
  return (
    <div className="settings-card" style={{marginBottom:'20px',border:'2px solid var(--wolf)'}}>
      <h4 style={{fontWeight:900,marginBottom:'4px'}}>🚀 Set Up Your Store</h4>
      <p style={{fontSize:'13px',color:'var(--gray)',marginBottom:'14px'}}>{done}/{steps.length} steps complete</p>
      <div style={{background:'var(--light)',borderRadius:'8px',height:'6px',marginBottom:'16px',overflow:'hidden'}}>
        <div style={{height:'100%',background:'var(--wolf)',borderRadius:'8px',width:`${(done/steps.length)*100}%`,transition:'width 0.4s'}}/>
      </div>
      {steps.map((s, i) => (
        <div key={i} style={{display:'flex',alignItems:'flex-start',gap:'10px',marginBottom:'10px',opacity:s.done?0.5:1}}>
          <span style={{fontSize:'16px',flexShrink:0,marginTop:'1px'}}>{s.done ? '✅' : '⭕'}</span>
          <div>
            <div style={{fontWeight:700,fontSize:'13px',textDecoration:s.done?'line-through':'none'}}>{s.label}</div>
            {!s.done && <div style={{fontSize:'11px',color:'var(--gray)'}}>{s.hint}</div>}
          </div>
        </div>
      ))}
    </div>
  )
}

function SettingsForm({ user }) {
  const [fullName, setFullName] = useState(user.user_metadata?.full_name || '')
  const [phone, setPhone] = useState(user.user_metadata?.phone || '')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function saveProfile() {
    setSaving(true)
    const { error } = await supabase.auth.updateUser({
      data: { full_name: fullName, phone },
    })
    setSaving(false)
    if (!error) {
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } else {
      alert('Could not save profile: ' + error.message)
    }
  }

  return (
    <div className="settings-card">
      <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" value={fullName} onChange={e => setFullName(e.target.value)}/></div>
      <div className="form-group"><label className="form-label">Email</label><input className="form-input" value={user.email} disabled style={{background:'var(--light)'}}/></div>
      <div className="form-group"><label className="form-label">Phone</label><input className="form-input" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+265 9xx xxx xxx"/></div>
      <div className="form-group"><label className="form-label">University</label><input className="form-input" value={user.user_metadata?.university || ''} disabled style={{background:'var(--light)'}}/></div>
      <button className="btn-primary" onClick={saveProfile} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button>
      {saved && <div style={{color:'var(--green)',fontSize:'13px',marginTop:'10px',fontWeight:600}}>✅ Profile saved</div>}
    </div>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const { user, signOut, registerPush } = useAuth()
  const [tab, setTab] = useState('overview')
  const [orders, setOrders] = useState([])
  const [sales, setSales] = useState([])
  const [myProducts, setMyProducts] = useState([])
  const [vendor, setVendor] = useState(null)
  const [payoutPhone, setPayoutPhone] = useState('')
  const [payoutNetwork, setPayoutNetwork] = useState('')
  const [savingPayout, setSavingPayout] = useState(false)
  const [payoutSaved, setPayoutSaved] = useState(false)
  const [reportingOrder, setReportingOrder] = useState(null)
  const [reportReason, setReportReason] = useState('not_delivered')
  const [reportDetails, setReportDetails] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportedIds, setReportedIds] = useState(new Set())
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, topProducts: [] })
  const [profile, setProfile] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null) // product being edited
  const [editProductForm, setEditProductForm] = useState({})
  const [editProductSaving, setEditProductSaving] = useState(false)
  const [bulkSelected, setBulkSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')

  useEffect(() => {
    if (!user) { navigate('/signin'); return }
    loadData()
    // Prompt for push notifications after user lands on dashboard
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => { if (p === 'granted') registerPush() })
    } else if ('Notification' in window && Notification.permission === 'granted') {
      registerPush()
    }
  }, [user, navigate])

  async function loadData() {
    try {
      // Fetch vendor first so we can use vendor.id in subsequent queries
      const { data: vend } = await supabase.from('vendors').select('*').eq('user_id', user.id).maybeSingle()
      setVendor(vend || null)
      setPayoutPhone(vend?.payout_phone || '')
      setPayoutNetwork(vend?.payout_network || '')

      const queries = [
        supabase.from('orders').select('*, products(name,icon)').eq('buyer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('order_reports').select('order_id').eq('reporter_id', user.id),
        supabase.from('profiles').select('referral_code, credit_balance, referred_by').eq('id', user.id).maybeSingle(),
      ]
      if (vend?.id) {
        queries.push(supabase.from('products').select('*').eq('vendor_id', vend.id).order('created_at', { ascending: false }))
        queries.push(supabase.from('orders').select('*, products(name,icon,view_count)').eq('vendor_id', vend.id).order('created_at', { ascending: false }))
      }

      const results = await Promise.all(queries)
      const [{ data: ords }, { data: reports }, { data: prof }] = results
      setOrders(ords || [])
      setReportedIds(new Set((reports || []).map(r => r.order_id)))
      setProfile(prof || null)

      if (vend?.id) {
        const prods = results[3]?.data || []
        const salesData = results[4]?.data || []
        setMyProducts(prods)
        setSales(salesData)
        const totalRevenue = salesData.filter(o => o.status !== 'cancelled').reduce((a, o) => a + (o.total || 0), 0)
        const productMap = new Map()
        for (const o of salesData) {
          if (o.status === 'cancelled') continue
          const key = o.product_id
          const entry = productMap.get(key) || { name: o.products?.name || 'Product', icon: o.products?.icon || '📦', sales: 0, revenue: 0, views: o.products?.view_count || 0 }
          entry.sales += o.quantity || 1
          entry.revenue += o.total || 0
          productMap.set(key, entry)
        }
        setAnalytics({ totalRevenue, topProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5) })
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err)
    } finally {
      setLoading(false)
    }
  }

  async function savePayoutDetails() {
    if (!vendor) return
    setSavingPayout(true)
    const { error } = await supabase.from('vendors').update({
      payout_phone: payoutPhone.trim(),
      payout_network: payoutNetwork,
    }).eq('id', vendor.id)
    setSavingPayout(false)
    if (!error) {
      setPayoutSaved(true)
      setTimeout(() => setPayoutSaved(false), 3000)
    } else {
      alert('Could not save payout details: ' + error.message)
    }
  }

  async function markReceived(orderId) {
    const { error } = await supabase.from('orders').update({ received_at: new Date().toISOString() }).eq('id', orderId)
    if (!error) {
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, received_at: new Date().toISOString() } : o))
    } else {
      alert('Could not update order: ' + error.message)
    }
  }

  async function submitReport() {
    if (!reportingOrder) return
    setReportSubmitting(true)
    const { error } = await supabase.from('order_reports').insert({
      order_id: reportingOrder.id,
      reporter_id: user.id,
      reason: reportReason,
      details: reportDetails.trim() || null,
    })
    setReportSubmitting(false)
    if (!error) {
      setReportedIds(prev => new Set(prev).add(reportingOrder.id))
      setReportingOrder(null)
      setReportDetails('')
      setReportReason('not_delivered')
    } else {
      alert('Could not submit report: ' + error.message)
    }
  }

  async function toggleAvailability(productId, current) {
    const { error } = await supabase.from('products').update({ available: !current }).eq('id', productId)
    if (!error) {
      setMyProducts(prev => prev.map(p => p.id === productId ? { ...p, available: !current } : p))
    } else {
      alert('Could not update product: ' + error.message)
    }
  }

  async function deleteProduct(productId) {
    if (!confirm('Delete this product?')) return
    const { error } = await supabase.from('products').delete().eq('id', productId)
    if (!error) {
      setMyProducts(prev => prev.filter(p => p.id !== productId))
    } else {
      alert('Could not delete product: ' + error.message)
    }
  }

  async function retryPayout(orderId) {
    const { error } = await supabase.from('orders').update({ payout_status: 'not_started' }).eq('id', orderId)
    if (!error) {
      setSales(prev => prev.map(o => o.id === orderId ? { ...o, payout_status: 'not_started' } : o))
      // Re-trigger payout via verify function (reuses existing chargeId from notes)
      const order = sales.find(o => o.id === orderId)
      if (order?.notes) {
        const match = order.notes.match(/charge_id:([^\s,]+)/)
        if (match) {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paychangu-verify`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.access_token}` },
              body: JSON.stringify({ charge_id: match[1] }),
            }).catch(() => {})
          }
        }
      }
      alert('Payout retry initiated. Check back in a minute.')
    } else {
      alert('Could not retry payout: ' + error.message)
    }
  }

  async function saveProductEdit() {
    if (!editingProduct) return
    setEditProductSaving(true)
    const updates = {
      name: editProductForm.name?.trim(),
      price: parseInt(editProductForm.price) || editingProduct.price,
      description: editProductForm.description?.trim(),
      category: editProductForm.category,
      stock_qty: editProductForm.stock_qty !== '' ? parseInt(editProductForm.stock_qty) : null,
    }
    if (!updates.name) { alert('Product name is required'); setEditProductSaving(false); return }
    const { error } = await supabase.from('products').update(updates).eq('id', editingProduct.id)
    setEditProductSaving(false)
    if (!error) {
      setMyProducts(prev => prev.map(p => p.id === editingProduct.id ? { ...p, ...updates } : p))
      setEditingProduct(null)
    } else {
      alert('Could not save product: ' + error.message)
    }
  }

  async function bulkSetAvailability(available) {
    if (bulkSelected.size === 0) return
    setBulkLoading(true)
    const ids = [...bulkSelected]
    const { error } = await supabase.from('products').update({ available }).in('id', ids)
    if (!error) {
      setMyProducts(prev => prev.map(p => bulkSelected.has(p.id) ? { ...p, available } : p))
      setBulkSelected(new Set())
    } else {
      alert('Bulk update failed: ' + error.message)
    }
    setBulkLoading(false)
  }

  async function bulkDelete() {
    if (bulkSelected.size === 0) return
    if (!confirm(`Delete ${bulkSelected.size} product(s)? This cannot be undone.`)) return
    setBulkLoading(true)
    const ids = [...bulkSelected]
    const { error } = await supabase.from('products').delete().in('id', ids)
    if (!error) {
      setMyProducts(prev => prev.filter(p => !bulkSelected.has(p.id)))
      setBulkSelected(new Set())
    } else {
      alert('Bulk delete failed: ' + error.message)
    }
    setBulkLoading(false)
  }

  async function updateOrderStatus(orderId, newStatus) {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId)
    if (!error) {
      setSales(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
    } else {
      alert('Could not update order status: ' + error.message)
    }
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
            {id:'notifications',icon:'🔔',label:unreadNotifCount>0?`Notifications (${unreadNotifCount})`:'Notifications'},
            {id:'orders',icon:'🛍️',label:'My Orders'},
            ...(vendor ? [{id:'sales',icon:'💵',label:'My Sales'},{id:'analytics',icon:'📈',label:'Analytics'},{id:'payouts',icon:'💰',label:'Payout History'}] : []),
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
              {tab === 'notifications' && (
                <div>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'20px'}}>
                    <h2 className="dash-title" style={{margin:0}}>🔔 Notifications</h2>
                    {unreadNotifCount > 0 && (
                      <button className="mini-btn confirm" onClick={async () => {
                        await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
                        setNotifications(prev => prev.map(n => ({ ...n, read: true })))
                        setUnreadNotifCount(0)
                      }}>Mark all read</button>
                    )}
                  </div>
                  {notifications.length === 0
                    ? <div className="empty-state"><div className="empty-icon">🔔</div><h3>No notifications yet</h3><p>We'll notify you when orders confirm, messages arrive, and more.</p></div>
                    : <div className="orders-list">
                        {notifications.map(n => (
                          <div key={n.id} className="order-row" style={{cursor:n.url?'pointer':'default',background:n.read?undefined:'var(--wolf-light)',borderLeft:n.read?undefined:'3px solid var(--wolf)'}}
                            onClick={async () => {
                              if (!n.read) {
                                await supabase.from('notifications').update({ read: true }).eq('id', n.id)
                                setNotifications(prev => prev.map(x => x.id===n.id?{...x,read:true}:x))
                                setUnreadNotifCount(c => Math.max(0, c - 1))
                              }
                              if (n.url) navigate(n.url)
                            }}>
                            <div className="order-icon" style={{fontSize:'20px'}}>{n.read ? '🔔' : '🟠'}</div>
                            <div className="order-info">
                              <div className="order-name" style={{fontWeight:n.read?500:800}}>{n.title}</div>
                              {n.body && <div className="order-meta">{n.body}</div>}
                              <div className="order-meta">{new Date(n.created_at).toLocaleString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div>
                            </div>
                            {!n.read && <div style={{width:'8px',height:'8px',borderRadius:'50%',background:'var(--wolf)',flexShrink:0,alignSelf:'center'}}/>}
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

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
                          <div key={o.id} className="order-row order-row-expanded">
                            <span className="order-icon">{o.products?.icon || '📦'}</span>
                            <div className="order-info">
                              <div className="order-name">{o.products?.name || 'Product'}</div>
                              <div className="order-meta">{new Date(o.created_at).toLocaleDateString()} · MWK {Number(o.total || 0).toLocaleString()}</div>
                              <OrderTimeline status={o.status || 'pending'} createdAt={o.created_at} receivedAt={o.received_at}/>
                              {o.received_at && <div className="order-received">✅ Marked received {new Date(o.received_at).toLocaleDateString()}</div>}
                            </div>
                            <div className="order-actions-col">
                              <div className={`status-chip ${o.status || 'pending'}`}>{o.status || 'Pending'}</div>
                              {o.status === 'confirmed' && !o.received_at && (
                                <button className="mini-btn confirm" onClick={() => markReceived(o.id)}>Mark as Received</button>
                              )}
                              {o.status === 'confirmed' && !o.received_at && !o.refund_status?.match(/requested|approved|refunded/) && (
                                <button className="mini-btn report" onClick={async () => {
                                  const reason = prompt('Briefly describe the issue (e.g. item not received, wrong item):')
                                  if (!reason) return
                                  const { error } = await supabase.from('order_reports').upsert({ order_id: o.id, reporter_id: user.id, reason: 'dispute', details: reason, status: 'open' })
                                  if (!error) await supabase.from('orders').update({ refund_status: 'requested' }).eq('id', o.id)
                                  alert('Your dispute has been submitted. Our team will review it within 24 hours.')
                                }}>Request Refund</button>
                              )}
                              {o.refund_status && o.refund_status !== 'none' && (
                                <div className={`status-chip ${o.refund_status === 'refunded' ? 'confirmed' : o.refund_status === 'rejected' ? 'cancelled' : 'pending'}`}>
                                  {o.refund_status === 'requested' ? '🔄 Refund Pending' : o.refund_status === 'approved' ? '✅ Refund Approved' : o.refund_status === 'rejected' ? '❌ Refund Denied' : '💰 Refunded'}
                                </div>
                              )}
                              {o.status === 'confirmed' && (
                                reportedIds.has(o.id)
                                  ? <span className="mini-note">Reported</span>
                                  : <button className="mini-btn report" onClick={() => setReportingOrder(o)}>Report an Issue</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                  }

                  {reportingOrder && (
                    <div className="modal-overlay" onClick={() => setReportingOrder(null)}>
                      <div className="modal-card" onClick={e => e.stopPropagation()}>
                        <h3>Report an Issue</h3>
                        <p className="modal-sub">{reportingOrder.products?.name || 'This order'} · MWK {Number(reportingOrder.total || 0).toLocaleString()}</p>
                        <div className="form-group">
                          <label className="form-label">What went wrong?</label>
                          <select className="form-input" value={reportReason} onChange={e => setReportReason(e.target.value)}>
                            <option value="not_delivered">Never received the item</option>
                            <option value="wrong_item">Received the wrong item</option>
                            <option value="damaged">Item was damaged</option>
                            <option value="vendor_unresponsive">Vendor isn't responding</option>
                            <option value="other">Other</option>
                          </select>
                        </div>
                        <div className="form-group">
                          <label className="form-label">Details (optional)</label>
                          <textarea className="form-input" value={reportDetails} onChange={e => setReportDetails(e.target.value)} placeholder="Anything else we should know?"/>
                        </div>
                        <div className="modal-actions">
                          <button className="continue-btn" onClick={() => setReportingOrder(null)}>Cancel</button>
                          <button className="btn-primary" onClick={submitReport} disabled={reportSubmitting}>{reportSubmitting ? 'Submitting...' : 'Submit Report'}</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {tab === 'sales' && vendor && (
                <div>
                  <h2 className="dash-title">My Sales</h2>
                  {!vendor.payout_phone && (
                    <div className="auth-error" style={{marginBottom:'16px',maxWidth:'480px'}}>
                      ⚠️ Set your payout phone number in Settings so you can be paid automatically when you make a sale.
                    </div>
                  )}
                  {sales.length === 0
                    ? <div className="empty-state"><div className="empty-icon">💵</div><h3>No sales yet</h3><p>Once buyers purchase your products, they'll show up here.</p></div>
                    : <div className="orders-list">
                        {sales.map(o => (
                          <div key={o.id} className="order-row">
                            <span className="order-icon">{o.products?.icon || '📦'}</span>
                            <div className="order-info">
                              <div className="order-name">{o.products?.name || 'Product'}</div>
                              <div className="order-meta">{new Date(o.created_at).toLocaleDateString()} · MWK {Number(o.total || 0).toLocaleString()}</div>
                              {o.delivery_address && <div className="order-delivery">📍 {o.delivery_address}</div>}
                            </div>
                            <div style={{display:'flex',flexDirection:'column',gap:'4px',alignItems:'flex-end'}}>
                              <div className={`status-chip ${o.status || 'pending'}`}>{o.status || 'Pending'}</div>
                              <div className={`status-chip payout-${o.payout_status || 'not_started'}`}>
                                {o.payout_status === 'paid' ? '✅ Paid out' :
                                 o.payout_status === 'processing' ? '⏳ Paying out...' :
                                 o.payout_status === 'failed' ? '❌ Payout failed' :
                                 'Awaiting payout'}
                              </div>
                              {o.payout_status === 'failed' && (
                                <button className="mini-btn report" onClick={() => retryPayout(o.id)}>🔁 Retry Payout</button>
                              )}
                              {o.status === 'confirmed' && (
                                <button className="mini-btn confirm" onClick={() => updateOrderStatus(o.id, 'transit')}>Mark In Transit</button>
                              )}
                              {o.status === 'transit' && (
                                <button className="mini-btn confirm" onClick={() => updateOrderStatus(o.id, 'delivered')}>Mark Delivered</button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              {tab === 'payouts' && vendor && (
                <div>
                  <h2 className="dash-title">💰 Payout History</h2>
                  {(() => {
                    const paid = sales.filter(o => o.payout_status === 'paid')
                    const processing = sales.filter(o => o.payout_status === 'processing')
                    const failed = sales.filter(o => o.payout_status === 'failed')
                    const pending = sales.filter(o => !o.payout_status || o.payout_status === 'not_started')
                    const totalPaid = paid.reduce((a, o) => a + (o.total || 0), 0)
                    return (
                      <>
                        <div className="dash-cards">
                          <div className="dash-card"><div className="dash-card-label">Total Paid Out</div><div className="dash-card-val" style={{fontSize:'14px',color:'#22c55e'}}>MWK {totalPaid.toLocaleString()}</div></div>
                          <div className="dash-card"><div className="dash-card-label">Processing</div><div className="dash-card-val">{processing.length}</div></div>
                          <div className="dash-card"><div className="dash-card-label">Pending</div><div className="dash-card-val">{pending.length}</div></div>
                          {failed.length > 0 && <div className="dash-card" style={{borderColor:'#ef4444'}}><div className="dash-card-label">Failed</div><div className="dash-card-val" style={{color:'#ef4444'}}>{failed.length}</div></div>}
                        </div>
                        <h3 className="dash-section-title" style={{marginTop:'24px'}}>All Transactions</h3>
                        {sales.length === 0
                          ? <div className="empty-state"><div className="empty-icon">💰</div><h3>No sales yet</h3></div>
                          : <div className="orders-list">
                              {sales.map(o => (
                                <div key={o.id} className="order-row">
                                  <span className="order-icon">{o.products?.icon || '📦'}</span>
                                  <div className="order-info">
                                    <div className="order-name">{o.products?.name || 'Product'}</div>
                                    <div className="order-meta">MWK {(o.total||0).toLocaleString()} · {new Date(o.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
                                  </div>
                                  <div className={`status-chip payout-${o.payout_status||'not_started'}`} style={{fontSize:'11px',whiteSpace:'nowrap'}}>
                                    {o.payout_status==='paid'?'✅ Paid out':o.payout_status==='processing'?'⏳ Processing':o.payout_status==='failed'?'❌ Failed':'⏸ Pending'}
                                  </div>
                                </div>
                              ))}
                            </div>
                        }
                      </>
                    )
                  })()}
                </div>
              )}

              {tab === 'analytics' && vendor && (
                <div>
                  <h2 className="dash-title">📈 Store Analytics</h2>
                  <div className="dash-cards">
                    <div className="dash-card">
                      <div className="dash-card-label">Total Revenue</div>
                      <div className="dash-card-val" style={{fontSize:'15px'}}>MWK {analytics.totalRevenue.toLocaleString()}</div>
                      <div className="dash-card-sub">All confirmed sales</div>
                    </div>
                    <div className="dash-card">
                      <div className="dash-card-label">Total Sales</div>
                      <div className="dash-card-val">{sales.filter(o => o.status !== 'cancelled').length}</div>
                      <div className="dash-card-sub">Completed orders</div>
                    </div>
                    <div className="dash-card">
                      <div className="dash-card-label">Avg Order Value</div>
                      <div className="dash-card-val" style={{fontSize:'15px'}}>
                        {sales.filter(o=>o.status!=='cancelled').length > 0
                          ? `MWK ${Math.round(analytics.totalRevenue / sales.filter(o=>o.status!=='cancelled').length).toLocaleString()}`
                          : '—'}
                      </div>
                      <div className="dash-card-sub">Per order</div>
                    </div>
                  </div>
                  <h3 className="dash-section-title">Top Products by Revenue</h3>
                  {analytics.topProducts.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📦</div><h3>No sales yet</h3></div>
                    : <div className="orders-list">
                        {analytics.topProducts.map((p, i) => (
                          <div key={i} className="order-row">
                            <span className="order-icon">{p.icon}</span>
                            <div className="order-info">
                              <div className="order-name">{p.name}</div>
                              <div className="order-meta">{p.sales} sold · {p.views} views</div>
                            </div>
                            <div style={{fontWeight:800,color:'var(--wolf)'}}>MWK {p.revenue.toLocaleString()}</div>
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
                  {myProducts.length > 5 && (
                    <div style={{marginBottom:'14px'}}>
                      <input className="form-input" value={productSearch} onChange={e=>setProductSearch(e.target.value)} placeholder="🔍 Search your products..."/>
                    </div>
                  )}
                  {myProducts.length === 0
                    ? <div className="empty-state"><div className="empty-icon">📦</div><h3>No products listed</h3><p>Start selling by listing your first product.</p><button className="btn-primary" onClick={() => navigate('/sell')}>List a Product</button></div>
                    : <>
                        {bulkSelected.size > 0 && (
                          <div style={{display:'flex',gap:'8px',padding:'10px 12px',background:'var(--light)',borderRadius:'10px',marginBottom:'12px',alignItems:'center',flexWrap:'wrap'}}>
                            <span style={{fontSize:'13px',fontWeight:700}}>{bulkSelected.size} selected</span>
                            <button className="mini-btn confirm" onClick={() => bulkSetAvailability(true)} disabled={bulkLoading}>Mark Available</button>
                            <button className="mini-btn confirm" onClick={() => bulkSetAvailability(false)} disabled={bulkLoading}>Mark Hidden</button>
                            <button className="mini-btn report" onClick={bulkDelete} disabled={bulkLoading}>🗑️ Delete All</button>
                            <button className="mini-btn" style={{background:'white',border:'1px solid var(--border)',borderRadius:'6px',padding:'4px 10px',cursor:'pointer',fontSize:'12px'}} onClick={() => setBulkSelected(new Set())}>Clear</button>
                          </div>
                        )}
                        <div className="my-products-list">
                        {myProducts.filter(p => !productSearch || p.name.toLowerCase().includes(productSearch.toLowerCase())).map(p => (
                          <div key={p.id} className="my-product-row">
                            <input type="checkbox" checked={bulkSelected.has(p.id)} onChange={e => setBulkSelected(prev => { const s = new Set(prev); e.target.checked ? s.add(p.id) : s.delete(p.id); return s })} onClick={e => e.stopPropagation()} style={{marginRight:'8px',cursor:'pointer'}}/>
                            <div className="my-product-icon">{p.icon || '📦'}</div>
                            <div className="my-product-info">
                              <div className="my-product-name">{p.name}</div>
                              <div className="my-product-meta">MWK {Number(p.price).toLocaleString()} · {p.category}</div>
                            </div>
                            <div className="my-product-actions">
                              <button className={`avail-toggle ${p.available ? 'on' : 'off'}`} onClick={() => toggleAvailability(p.id, p.available)}>
                                {p.available ? '✅ Available' : '❌ Hidden'}
                              </button>
                              <button className="mini-btn confirm" onClick={() => { setEditingProduct(p); setEditProductForm({ name: p.name, price: p.price, description: p.description || '', category: p.category || '', stock_qty: p.stock_qty ?? '' }) }}>✏️</button>
                              <button className="delete-btn" onClick={() => deleteProduct(p.id)}>🗑️</button>
                            </div>
                          </div>
                        ))}
                      </div>
                  </>}
                </div>
              )}

              {tab === 'settings' && (
                <div>
                  <h2 className="dash-title">Account Settings</h2>
                  {vendor && <OnboardingChecklist vendor={vendor} myProducts={myProducts} payoutPhone={payoutPhone}/>}
                  <SettingsForm user={user} />
                  {profile && (
                    <div className="settings-card" style={{marginTop:'20px'}}>
                      <h4 style={{marginBottom:'12px',fontWeight:800}}>🎁 Referral Program</h4>
                      <div style={{marginBottom:'12px'}}>
                        <div style={{fontSize:'12px',color:'var(--gray)',marginBottom:'4px'}}>Your referral code</div>
                        <div style={{display:'flex',gap:'8px',alignItems:'center'}}>
                          <code style={{background:'var(--light)',padding:'8px 14px',borderRadius:'8px',fontWeight:900,fontSize:'16px',letterSpacing:'2px'}}>{profile.referral_code || '—'}</code>
                          <button className="mini-btn confirm" onClick={()=>{navigator.clipboard.writeText(profile.referral_code||'');alert('Copied!')}}>Copy</button>
                        </div>
                      </div>
                      <div style={{display:'flex',gap:'20px'}}>
                        <div><div style={{fontSize:'12px',color:'var(--gray)'}}>Your credit balance</div><div style={{fontWeight:900,color:'var(--wolf)',fontSize:'18px'}}>MWK {(profile.credit_balance||0).toLocaleString()}</div></div>
                      </div>
                      <div style={{fontSize:'12px',color:'var(--gray)',marginTop:'10px'}}>Share your code with friends. Both of you get MWK 500 when they sign up.</div>
                    </div>
                  )}

                  {vendor && (
                    <div className="settings-card" style={{marginTop:'20px'}}>
                      <h3 style={{fontSize:'15px',fontWeight:800,marginBottom:'4px'}}>💰 Payout Details</h3>
                      <p style={{fontSize:'12.5px',color:'var(--gray)',marginBottom:'16px'}}>
                        This is where we send your earnings automatically after each sale. Make sure it's a mobile money number you control.
                      </p>
                      <div className="form-group">
                        <label className="form-label">Payout Network</label>
                        <div className="pay-btns" style={{display:'flex',gap:'8px'}}>
                          <button type="button" className={`pay-btn airtel${payoutNetwork==='airtel'?' selected':''}`} onClick={() => setPayoutNetwork('airtel')}>📱 Airtel Money</button>
                          <button type="button" className={`pay-btn tnm${payoutNetwork==='tnm'?' selected':''}`} onClick={() => setPayoutNetwork('tnm')}>📱 TNM Mpamba</button>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Payout Phone Number</label>
                        <input className="form-input" value={payoutPhone} onChange={e => setPayoutPhone(e.target.value)} placeholder="e.g. 0991 234 567"/>
                      </div>
                      <button className="btn-primary" onClick={savePayoutDetails} disabled={savingPayout || !payoutNetwork || !payoutPhone.trim()}>
                        {savingPayout ? 'Saving...' : 'Save Payout Details'}
                      </button>
                      {payoutSaved && <div style={{color:'var(--green)',fontSize:'13px',marginTop:'10px',fontWeight:600}}>✅ Payout details saved</div>}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Edit Product Modal */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-card" style={{maxWidth:'440px'}} onClick={e => e.stopPropagation()}>
            <h3>✏️ Edit Product</h3>
            <div className="form-group"><label className="form-label">Product Name *</label><input className="form-input" value={editProductForm.name||''} onChange={e=>setEditProductForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Price (MWK) *</label><input className="form-input" type="number" value={editProductForm.price||''} onChange={e=>setEditProductForm(f=>({...f,price:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-input" value={editProductForm.category||''} onChange={e=>setEditProductForm(f=>({...f,category:e.target.value}))}>
                {['Fashion & Clothing','Electronics','Food & Drinks','Books & Stationery','Beauty & Health','Services','Art & Crafts','Home & Living','Sports & Fitness','Auto Parts','Other'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={editProductForm.description||''} onChange={e=>setEditProductForm(f=>({...f,description:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Stock Quantity <span style={{color:'var(--gray)',fontWeight:400}}>(blank = unlimited)</span></label><input className="form-input" type="number" min="0" value={editProductForm.stock_qty??''} onChange={e=>setEditProductForm(f=>({...f,stock_qty:e.target.value}))}/></div>
            <div className="modal-actions">
              <button className="continue-btn" onClick={() => setEditingProduct(null)}>Cancel</button>
              <button className="btn-primary" onClick={saveProductEdit} disabled={editProductSaving}>{editProductSaving?'Saving...':'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
