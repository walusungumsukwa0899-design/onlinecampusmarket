import { useEffect, useState } from 'react'
import { SkeletonList, SkeletonGrid } from '../components/Skeleton'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'
import Onboarding from './Onboarding'
import './Dashboard.css'

// Lightweight variant group editor used inside the edit-product modal
function EditVariantGroups({ variantGroups, setVariantGroups }) {
  const [drafts, setDrafts] = useState({})
  function addGroup() { setVariantGroups([...variantGroups, { name: '', options: [] }]) }
  function removeGroup(i) { setVariantGroups(variantGroups.filter((_, idx) => idx !== i)) }
  function setName(i, name) { setVariantGroups(variantGroups.map((g, idx) => idx === i ? { ...g, name } : g)) }
  function addOpt(i) {
    const t = (drafts[i] || '').trim(); if (!t) return
    setVariantGroups(variantGroups.map((g, idx) => idx === i ? { ...g, options: [...g.options, t] } : g))
    setDrafts(d => ({ ...d, [i]: '' }))
  }
  function removeOpt(gi, oi) { setVariantGroups(variantGroups.map((g, i) => i === gi ? { ...g, options: g.options.filter((_, j) => j !== oi) } : g)) }
  return (
    <div>
      {variantGroups.map((g, i) => (
        <div key={i} style={{ background: 'var(--light)', borderRadius: '10px', padding: '10px 12px', marginBottom: '8px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
            <input className="form-input" value={g.name} onChange={e => setName(i, e.target.value)} placeholder="Group (e.g. Size)" style={{ flex: 1, padding: '6px 10px', fontSize: '12px' }} />
            <button type="button" onClick={() => removeGroup(i)} style={{ background: '#fee2e2', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', color: '#b91c1c', fontSize: '12px', fontFamily: 'inherit' }}>✕</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '6px' }}>
            {g.options.map((opt, oi) => (
              <span key={oi} style={{ background: 'white', border: '1.5px solid var(--wolf)', borderRadius: '20px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, color: 'var(--wolf)', display: 'flex', alignItems: 'center', gap: '3px' }}>
                {opt}
                <button type="button" onClick={() => removeOpt(i, oi)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'var(--wolf)', lineHeight: 1, fontSize: '13px' }}>×</button>
              </span>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '4px' }}>
            <input className="form-input" value={drafts[i] || ''} onChange={e => setDrafts(d => ({ ...d, [i]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOpt(i) } }} placeholder="Add option, press Enter" style={{ flex: 1, padding: '5px 9px', fontSize: '12px' }} />
            <button type="button" onClick={() => addOpt(i)} style={{ background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '6px', padding: '5px 10px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>+</button>
          </div>
        </div>
      ))}
      <button type="button" onClick={addGroup} style={{ width: '100%', background: 'none', border: '1.5px dashed var(--border)', borderRadius: '8px', padding: '7px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', color: 'var(--gray)', fontFamily: 'inherit' }}>
        + Add Variant Group
      </button>
    </div>
  )
}

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

function buildRevenueByDay(salesData) {
  const map = new Map()
  const now = new Date()
  // Last 30 days
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    map.set(key, { date: key, revenue: 0, orders: 0 })
  }
  for (const o of salesData) {
    if (o.status === 'cancelled') continue
    const key = o.created_at?.slice(0, 10)
    if (map.has(key)) {
      const entry = map.get(key)
      entry.revenue += o.total || 0
      entry.orders += 1
    }
  }
  return [...map.values()].map(d => ({
    ...d,
    label: new Date(d.date + 'T00:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  }))
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading, signOut, registerPush } = useAuth()
  const [tab, setTab] = useState(searchParams.get('tab') || 'overview')
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
  const [analytics, setAnalytics] = useState({ totalRevenue: 0, topProducts: [], revenueByDay: [] })
  const [profile, setProfile] = useState(null)
  const [editingProduct, setEditingProduct] = useState(null) // product being edited
  const [editProductForm, setEditProductForm] = useState({})
  const [editProductSaving, setEditProductSaving] = useState(false)
  const [bulkSelected, setBulkSelected] = useState(new Set())
  const [bulkLoading, setBulkLoading] = useState(false)
  const [productSearch, setProductSearch] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadNotifCount, setUnreadNotifCount] = useState(0)

  // Order history filters
  const [orderStatusFilter, setOrderStatusFilter] = useState('all')
  const [orderDateFilter, setOrderDateFilter] = useState('all') // 'all' | '7d' | '30d' | '90d'
  const [orderSearch, setOrderSearch] = useState('')

  // Address book
  const [addresses, setAddresses] = useState([])
  const [newAddress, setNewAddress] = useState({ label: '', address: '', phone: '' })
  const [addingAddress, setAddingAddress] = useState(false)
  const [savingAddress, setSavingAddress] = useState(false)

  // Scheduled availability
  const [scheduleOpen, setScheduleOpen] = useState('')   // e.g. "08:00"
  const [scheduleClose, setScheduleClose] = useState('') // e.g. "20:00"
  const [scheduleDays, setScheduleDays] = useState(['Mon','Tue','Wed','Thu','Fri'])
  const [savingSchedule, setSavingSchedule] = useState(false)
  const [scheduleEnabled, setScheduleEnabled] = useState(false)

  useEffect(() => {
    if (authLoading) return // wait until we actually know if there's a session
    if (!user) { navigate('/signin'); return }
    loadData()
    // Prompt for push notifications after user lands on dashboard
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(p => { if (p === 'granted') registerPush() })
    } else if ('Notification' in window && Notification.permission === 'granted') {
      registerPush()
    }
  }, [user, authLoading, navigate])

  async function loadData() {
    try {
      // Fetch vendor first so we can use vendor.id in subsequent queries
      const { data: vend } = await supabase.from('vendors').select('*').eq('user_id', user.id).maybeSingle()
      setVendor(vend || null)
      setPayoutPhone(vend?.payout_phone || '')
      setPayoutNetwork(vend?.payout_network || '')

      // Load vendor schedule if set
      if (vend?.schedule_open) {
        setScheduleOpen(vend.schedule_open || '')
        setScheduleClose(vend.schedule_close || '')
        setScheduleDays(vend.schedule_days ? JSON.parse(vend.schedule_days) : ['Mon','Tue','Wed','Thu','Fri'])
        setScheduleEnabled(!!vend.schedule_enabled)
      }

      const queries = [
        supabase.from('orders').select('*, products(name,icon,vendor_id,vendors(name))').eq('buyer_id', user.id).order('created_at', { ascending: false }),
        supabase.from('order_reports').select('order_id').eq('reporter_id', user.id),
        supabase.from('profiles').select('referral_code, credit_balance, referred_by').eq('id', user.id).maybeSingle(),
        supabase.from('notifications').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('address_book').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      ]
      if (vend?.id) {
        queries.push(supabase.from('products').select('*').eq('vendor_id', vend.id).order('created_at', { ascending: false }))
        queries.push(supabase.from('orders').select('*, products(name,icon,view_count)').eq('vendor_id', vend.id).order('created_at', { ascending: false }))
      }

      const results = await Promise.all(queries)
      const [{ data: ords }, { data: reports }, { data: prof }, { data: notifs }, { data: addrs }] = results
      setOrders(ords || [])
      setReportedIds(new Set((reports || []).map(r => r.order_id)))
      setProfile(prof || null)
      setNotifications(notifs || [])
      setUnreadNotifCount((notifs || []).filter(n => !n.read).length)
      setAddresses(addrs || [])

      if (vend?.id) {
        const prods = results[5]?.data || []
        const salesData = results[6]?.data || []
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
        setAnalytics({ totalRevenue, topProducts: [...productMap.values()].sort((a, b) => b.revenue - a.revenue).slice(0, 5), revenueByDay: buildRevenueByDay(salesData) })
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
    const reorderedImages = editProductForm.images || editingProduct.images
    const updates = {
      name: editProductForm.name?.trim(),
      price: parseInt(editProductForm.price) || editingProduct.price,
      description: editProductForm.description?.trim(),
      category: editProductForm.category,
      stock_qty: editProductForm.stock_qty !== '' ? parseInt(editProductForm.stock_qty) : null,
      variant_groups: editProductForm.variant_groups || null,
      // Persist reordered images: first image becomes the cover
      ...(reorderedImages && reorderedImages.length > 0 && {
        images: reorderedImages,
        image_url: reorderedImages[0], // first image is always the cover
      }),
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

  async function bulkPriceUpdate() {
    if (bulkSelected.size === 0) return
    const newPriceStr = prompt(`Set new price (MWK) for ${bulkSelected.size} selected product(s):`)
    if (!newPriceStr) return
    const newPrice = parseInt(newPriceStr)
    if (isNaN(newPrice) || newPrice <= 0) { alert('Enter a valid price.'); return }
    setBulkLoading(true)
    const ids = [...bulkSelected]
    const { error } = await supabase.from('products').update({ price: newPrice }).in('id', ids)
    if (!error) {
      setMyProducts(prev => prev.map(p => bulkSelected.has(p.id) ? { ...p, price: newPrice } : p))
      setBulkSelected(new Set())
    } else {
      alert('Bulk price update failed: ' + error.message)
    }
    setBulkLoading(false)
  }

  async function updateOrderStatus(orderId, newStatus) {
    const { data: updatedOrder, error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId).select('*, products(name, icon), buyer_id').single()
    if (!error && updatedOrder) {
      setSales(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o))
      // In-app notification to buyer
      const statusLabels = { transit: '🚚 Your order is on the way!', delivered: '✅ Order delivered!', confirmed: '✅ Order confirmed!' }
      await supabase.from('notifications').insert({
        user_id: updatedOrder.buyer_id,
        title: statusLabels[newStatus] || `Order ${newStatus}`,
        body: `${updatedOrder.products?.name || 'Your order'} has been ${newStatus === 'transit' ? 'dispatched and is on its way to you' : newStatus === 'delivered' ? 'marked as delivered' : 'confirmed by the vendor'}.`,
        type: 'order_update',
        data: JSON.stringify({ order_id: orderId })
      })
      // Push notification via edge function
      supabase.functions.invoke('push-notify', {
        body: { userId: updatedOrder.buyer_id, title: statusLabels[newStatus], body: updatedOrder.products?.name || 'Your order status changed' }
      }).catch(() => {})
    } else if (error) {
      alert('Could not update order status: ' + error.message)
    }
  }

  // ── Address Book ──────────────────────────────────────────────
  async function saveAddress() {
    if (!newAddress.address.trim()) { alert('Please enter an address'); return }
    setSavingAddress(true)
    const { data, error } = await supabase.from('address_book').insert({
      user_id: user.id,
      label: newAddress.label.trim() || 'Home',
      address: newAddress.address.trim(),
      phone: newAddress.phone.trim(),
    }).select().single()
    setSavingAddress(false)
    if (!error && data) {
      setAddresses(prev => [data, ...prev])
      setNewAddress({ label: '', address: '', phone: '' })
      setAddingAddress(false)
    } else {
      alert('Could not save address: ' + (error?.message || 'Unknown error'))
    }
  }

  async function deleteAddress(id) {
    if (!confirm('Remove this saved address?')) return
    const { error } = await supabase.from('address_book').delete().eq('id', id)
    if (!error) setAddresses(prev => prev.filter(a => a.id !== id))
  }

  // ── Scheduled Availability ─────────────────────────────────────
  async function saveSchedule() {
    if (!vendor) return
    setSavingSchedule(true)
    const { error } = await supabase.from('vendors').update({
      schedule_open: scheduleOpen,
      schedule_close: scheduleClose,
      schedule_days: JSON.stringify(scheduleDays),
      schedule_enabled: scheduleEnabled,
    }).eq('id', vendor.id)
    setSavingSchedule(false)
    if (error) alert('Could not save schedule: ' + error.message)
  }

  // ── Order cancellation ─────────────────────────────────────────
  const [cancellingOrder, setCancellingOrder] = useState(null)
  const [cancelReason, setCancelReason] = useState('changed_mind')
  const [cancelNote, setCancelNote] = useState('')
  const [cancelling, setCancelling] = useState(false)

  async function cancelOrder() {
    if (!cancellingOrder) return
    setCancelling(true)
    const { error } = await supabase.from('orders').update({
      status: 'cancelled',
      cancel_reason: cancelReason,
      cancel_note: cancelNote.trim(),
      cancelled_at: new Date().toISOString(),
    }).eq('id', cancellingOrder.id).eq('buyer_id', user.id)

    if (!error) {
      setOrders(prev => prev.map(o => o.id === cancellingOrder.id
        ? { ...o, status: 'cancelled', cancel_reason: cancelReason }
        : o))
      // Notify vendor (fire and forget)
      supabase.functions.invoke('notify-order-cancelled', {
        body: { orderId: cancellingOrder.id, vendorId: cancellingOrder.products?.vendor_id, reason: cancelReason }
      }).catch(() => {})
      setCancellingOrder(null)
      setCancelNote('')
    } else {
      alert('Could not cancel: ' + error.message)
    }
    setCancelling(false)
  }

  // ── Inline review prompt state ─────────────────────────────────
  const [reviewingOrder, setReviewingOrder] = useState(null)
  const [inlineRating, setInlineRating] = useState(0)
  const [inlineText, setInlineText] = useState('')
  const [inlineSubmitting, setInlineSubmitting] = useState(false)
  const [reviewedOrderIds, setReviewedOrderIds] = useState(new Set())

  async function submitInlineReview() {
    if (!reviewingOrder || !inlineRating) return
    setInlineSubmitting(true)
    const { error } = await supabase.from('product_reviews').insert({
      product_id: reviewingOrder.product_id,
      vendor_id: reviewingOrder.products?.vendor_id,
      user_id: user.id,
      buyer_name: user.user_metadata?.full_name || 'Anonymous',
      stars: inlineRating,
      text: inlineText.trim(),
      verified_purchase: true,
    })
    if (!error) {
      setReviewedOrderIds(prev => new Set([...prev, reviewingOrder.id]))
      setReviewingOrder(null)
      setInlineRating(0)
      setInlineText('')
    } else {
      alert('Could not submit review: ' + error.message)
    }
    setInlineSubmitting(false)
  }

  // ── Order filter helpers ──────────────────────────────────────
  function filteredOrders() {
    let result = [...orders]
    if (orderStatusFilter !== 'all') result = result.filter(o => o.status === orderStatusFilter)
    if (orderDateFilter !== 'all') {
      const days = orderDateFilter === '7d' ? 7 : orderDateFilter === '30d' ? 30 : 90
      const cutoff = new Date(Date.now() - days * 86400000)
      result = result.filter(o => new Date(o.created_at) >= cutoff)
    }
    if (orderSearch.trim()) {
      const q = orderSearch.toLowerCase()
      result = result.filter(o =>
        o.products?.name?.toLowerCase().includes(q) ||
        o.products?.vendors?.name?.toLowerCase().includes(q)
      )
    }
    return result
  }

  if (authLoading) return <div className="loading" style={{minHeight:'60vh'}}><div className="spinner"/><span>Loading...</span></div>
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
                  {vendor && <Onboarding />}
                  <div className="dash-cards">
                    <div className="dash-card"><div className="dash-card-label">Total Orders</div><div className="dash-card-val">{orders.length}</div><div className="dash-card-sub">All time</div></div>
                    <div className="dash-card"><div className="dash-card-label">My Products</div><div className="dash-card-val">{myProducts.length}</div><div className="dash-card-sub">Listed</div></div>
                    <div className="dash-card"><div className="dash-card-label">Total Spent</div><div className="dash-card-val" style={{fontSize:'16px'}}>MWK {orders.reduce((a,o)=>a+(o.total||0),0).toLocaleString()}</div><div className="dash-card-sub">All orders</div></div>
                  </div>
                  {/* Quick links */}
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:'10px',marginBottom:'24px'}}>
                    {[
                      {icon:'🎁',label:'Referrals & Credits',link:'/referrals'},
                      {icon:'⚖️',label:'Disputes',link:'/disputes'},
                      {icon:'💬',label:'Messages',link:'/messages'},
                      {icon:'🔥',label:'Trending',link:'/trending'},
                    ].map(q => (
                      <div key={q.label} onClick={() => navigate(q.link)}
                        style={{background:'white',border:'1.5px solid var(--border)',borderRadius:'12px',padding:'14px',cursor:'pointer',display:'flex',alignItems:'center',gap:'10px',transition:'box-shadow .15s'}}
                        onMouseEnter={e=>e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.08)'}
                        onMouseLeave={e=>e.currentTarget.style.boxShadow='none'}>
                        <span style={{fontSize:'20px'}}>{q.icon}</span>
                        <span style={{fontWeight:700,fontSize:'12px'}}>{q.label}</span>
                      </div>
                    ))}
                  </div>
                  <h3 className="dash-section-title">Recent Orders</h3>
                  {orders.length === 0
                    ? <div className="empty-state"><div className="empty-icon">🛍️</div><h3>No orders yet</h3><p>Start shopping on campus!</p><button className="btn-primary" onClick={() => navigate('/vendors')}>Browse Products</button></div>
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
                  <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px',flexWrap:'wrap',gap:'10px'}}>
                    <h2 className="dash-title" style={{margin:0}}>My Orders</h2>
                    <span style={{fontSize:'12px',color:'var(--gray)',fontWeight:600}}>{filteredOrders().length} of {orders.length} orders</span>
                  </div>

                  {/* Filter bar */}
                  {orders.length > 0 && (
                    <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginBottom:'16px',alignItems:'center'}}>
                      <input
                        value={orderSearch}
                        onChange={e => setOrderSearch(e.target.value)}
                        placeholder="Search orders…"
                        style={{padding:'7px 12px',border:'1.5px solid var(--border)',borderRadius:'8px',fontSize:'13px',fontFamily:'inherit',outline:'none',minWidth:'140px'}}
                      />
                      <select value={orderStatusFilter} onChange={e => setOrderStatusFilter(e.target.value)}
                        style={{padding:'7px 10px',border:'1.5px solid var(--border)',borderRadius:'8px',fontSize:'13px',fontFamily:'inherit',cursor:'pointer',background:'white'}}>
                        <option value="all">All statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <select value={orderDateFilter} onChange={e => setOrderDateFilter(e.target.value)}
                        style={{padding:'7px 10px',border:'1.5px solid var(--border)',borderRadius:'8px',fontSize:'13px',fontFamily:'inherit',cursor:'pointer',background:'white'}}>
                        <option value="all">Any time</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                      </select>
                      {(orderStatusFilter !== 'all' || orderDateFilter !== 'all' || orderSearch) && (
                        <button onClick={() => { setOrderStatusFilter('all'); setOrderDateFilter('all'); setOrderSearch('') }}
                          style={{padding:'7px 12px',background:'var(--light)',border:'none',borderRadius:'8px',fontSize:'12px',fontWeight:700,cursor:'pointer',color:'var(--gray)',fontFamily:'inherit'}}>
                          ✕ Clear
                        </button>
                      )}
                    </div>
                  )}

                  {orders.length === 0
                    ? <div className="empty-state"><div className="empty-icon">🛍️</div><h3>No orders yet</h3><button className="btn-primary" onClick={() => navigate('/vendors')}>Browse Products</button></div>
                    : filteredOrders().length === 0
                    ? <div className="empty-state" style={{padding:'40px 0'}}><div className="empty-icon">🔍</div><h3>No matching orders</h3><p>Try adjusting your filters.</p></div>
                    : <div className="orders-list">
                        {filteredOrders().map(o => (
                          <div key={o.id} className="order-row order-row-expanded">
                            <span className="order-icon">{o.products?.icon || '📦'}</span>
                            <div className="order-info">
                              <div className="order-name">{o.products?.name || 'Product'}</div>
                              <div className="order-meta">{new Date(o.created_at).toLocaleDateString()} · MWK {Number(o.total || 0).toLocaleString()}</div>
                              {o.products?.vendors?.name && <div style={{fontSize:'11px',color:'var(--gray)',marginBottom:'4px'}}>from {o.products.vendors.name}</div>}
                              <OrderTimeline status={o.status || 'pending'} createdAt={o.created_at} receivedAt={o.received_at}/>
                              {o.received_at && <div className="order-received">✅ Marked received {new Date(o.received_at).toLocaleDateString()}</div>}
                            </div>
                            <div className="order-actions-col">
                              <div className={`status-chip ${o.status || 'pending'}`}>{o.status || 'Pending'}</div>
                              {o.status === 'confirmed' && !o.received_at && (
                                <button className="mini-btn confirm" onClick={() => markReceived(o.id)}>Mark as Received</button>
                              )}
                              {/* Cancel — only while pending */}
                              {o.status === 'pending' && (
                                <button className="mini-btn report"
                                  onClick={() => { setCancellingOrder(o); setCancelReason('changed_mind'); setCancelNote('') }}>
                                  Cancel Order
                                </button>
                              )}
                              {/* Review prompt for delivered orders */}
                              {o.status === 'delivered' && !reviewedOrderIds.has(o.id) && (
                                <button className="mini-btn confirm"
                                  onClick={() => { setReviewingOrder(o); setInlineRating(0); setInlineText('') }}
                                  style={{ background: '#fef3c7', color: '#92400e', borderColor: '#fde68a' }}>
                                  ⭐ Leave a Review
                                </button>
                              )}
                              {reviewedOrderIds.has(o.id) && (
                                <span className="mini-note" style={{ color: '#166534' }}>✅ Review submitted</span>
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
                  <h2 className="dash-title">💰 Payouts</h2>
                  {(() => {
                    const completedSales = sales.filter(o => o.status !== 'cancelled' && o.payout_status !== 'paid')
                    const pendingBalance = completedSales.reduce((a, o) => a + (o.total || 0), 0)
                    const paid = sales.filter(o => o.payout_status === 'paid')
                    const totalPaid = paid.reduce((a, o) => a + (o.total || 0), 0)
                    return (
                      <>
                        <div className="dash-cards">
                          <div className="dash-card" style={{borderColor:'var(--wolf)'}}><div className="dash-card-label">Available Balance</div><div className="dash-card-val" style={{fontSize:'14px',color:'var(--wolf)'}}>MWK {pendingBalance.toLocaleString()}</div><div className="dash-card-sub">Ready to request</div></div>
                          <div className="dash-card"><div className="dash-card-label">Total Paid Out</div><div className="dash-card-val" style={{fontSize:'14px',color:'#22c55e'}}>MWK {totalPaid.toLocaleString()}</div></div>
                        </div>

                        {/* Payout request form */}
                        {pendingBalance > 0 && vendor?.payout_phone && (
                          <div style={{background:'white',border:'1.5px solid var(--border)',borderRadius:'14px',padding:'20px',margin:'20px 0'}}>
                            <div style={{fontWeight:800,fontSize:'14px',marginBottom:'12px'}}>🏦 Request Payout</div>
                            <div style={{fontSize:'13px',color:'var(--gray)',marginBottom:'12px'}}>
                              Funds will be sent to <strong>{vendor.payout_network?.toUpperCase() || 'mobile money'}</strong> number <strong>{vendor.payout_phone}</strong>
                            </div>
                            <button className="btn-primary" style={{padding:'11px 24px',fontSize:'13px'}}
                              onClick={async () => {
                                if (!confirm(`Request payout of MWK ${pendingBalance.toLocaleString()} to ${vendor.payout_phone}?`)) return
                                const { error } = await supabase.from('payout_requests').insert({
                                  vendor_id: vendor.id, amount: pendingBalance, phone: vendor.payout_phone,
                                  network: vendor.payout_network, status: 'pending'
                                })
                                if (error) alert('Failed: ' + error.message)
                                else alert('✅ Payout requested! Admin will process within 24 hours.')
                              }}>
                              Request MWK {pendingBalance.toLocaleString()} Payout →
                            </button>
                          </div>
                        )}
                        {!vendor?.payout_phone && (
                          <div style={{background:'#fff7ed',border:'1.5px solid #fed7aa',borderRadius:'10px',padding:'14px',margin:'16px 0',fontSize:'13px'}}>
                            ⚠️ Add your payout phone number in <button onClick={()=>setTab('settings')} style={{background:'none',border:'none',color:'var(--wolf)',fontWeight:700,cursor:'pointer',fontSize:'13px',padding:0}}>Settings</button> to request payouts.
                          </div>
                        )}

                        <h3 className="dash-section-title" style={{marginTop:'24px'}}>Transaction History</h3>
                        {sales.length === 0
                          ? <div className="empty-state"><div className="empty-icon">💰</div><h3>No sales yet</h3></div>
                          : <div className="orders-list">
                              {sales.map(o => (
                                <div key={o.id} className="order-row">
                                  <span className="order-icon">{o.products?.icon || '📦'}</span>
                                  <div className="order-info">
                                    <div className="order-name">{o.products?.name || 'Product'}</div>
                                    <div className="order-meta">MWK {(o.total||0).toLocaleString()} · {new Date(o.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short'})}</div>
                                  </div>
                                  <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:'4px'}}>
                                    <div className={`status-chip ${o.status}`} style={{fontSize:'10px'}}>{o.status}</div>
                                    <div style={{fontSize:'10px',color:o.payout_status==='paid'?'#22c55e':o.payout_status==='processing'?'#f59e0b':'#9ca3af',fontWeight:700}}>
                                      {o.payout_status==='paid'?'✅ Paid':o.payout_status==='processing'?'⏳ Processing':'⏸ Pending payout'}
                                    </div>
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

              {tab === 'analytics' && vendor && (() => {
                const completedSales = sales.filter(o => o.status !== 'cancelled')
                const avgOrder = completedSales.length > 0 ? Math.round(analytics.totalRevenue / completedSales.length) : 0
                const hasChartData = analytics.revenueByDay.some(d => d.revenue > 0)
                return (
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
                        <div className="dash-card-val">{completedSales.length}</div>
                        <div className="dash-card-sub">Completed orders</div>
                      </div>
                      <div className="dash-card">
                        <div className="dash-card-label">Avg Order Value</div>
                        <div className="dash-card-val" style={{fontSize:'15px'}}>{avgOrder > 0 ? `MWK ${avgOrder.toLocaleString()}` : '—'}</div>
                        <div className="dash-card-sub">Per order</div>
                      </div>
                    </div>

                    {/* Revenue chart */}
                    <h3 className="dash-section-title" style={{marginTop:'28px'}}>Revenue — Last 30 Days</h3>
                    {!hasChartData ? (
                      <div className="empty-state" style={{padding:'32px 0'}}><div className="empty-icon">📊</div><h3>No sales yet</h3><p>Your revenue chart will appear here once you make your first sale.</p></div>
                    ) : (
                      <div style={{background:'white',border:'1.5px solid var(--border)',borderRadius:'14px',padding:'20px 8px 12px',marginBottom:'28px'}}>
                        <ResponsiveContainer width="100%" height={200}>
                          <AreaChart data={analytics.revenueByDay} margin={{top:4,right:16,left:0,bottom:0}}>
                            <defs>
                              <linearGradient id="wolfGrad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#E8630A" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#E8630A" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                            <XAxis dataKey="label" tick={{fontSize:10,fill:'#9ca3af'}} interval={6} tickLine={false} axisLine={false}/>
                            <YAxis tick={{fontSize:10,fill:'#9ca3af'}} tickLine={false} axisLine={false} tickFormatter={v => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} width={38}/>
                            <Tooltip formatter={(val) => [`MWK ${Number(val).toLocaleString()}`, 'Revenue']} labelStyle={{fontSize:'12px'}} contentStyle={{borderRadius:'8px',border:'1px solid var(--border)',fontSize:'12px'}}/>
                            <Area type="monotone" dataKey="revenue" stroke="#E8630A" strokeWidth={2} fill="url(#wolfGrad)" dot={false} activeDot={{r:4,fill:'#E8630A'}}/>
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    {/* Orders per day chart */}
                    {hasChartData && (
                      <>
                        <h3 className="dash-section-title">Orders — Last 30 Days</h3>
                        <div style={{background:'white',border:'1.5px solid var(--border)',borderRadius:'14px',padding:'20px 8px 12px',marginBottom:'28px'}}>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={analytics.revenueByDay} margin={{top:4,right:16,left:0,bottom:0}}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0"/>
                              <XAxis dataKey="label" tick={{fontSize:10,fill:'#9ca3af'}} interval={6} tickLine={false} axisLine={false}/>
                              <YAxis tick={{fontSize:10,fill:'#9ca3af'}} tickLine={false} axisLine={false} allowDecimals={false} width={24}/>
                              <Tooltip formatter={(val) => [val, 'Orders']} labelStyle={{fontSize:'12px'}} contentStyle={{borderRadius:'8px',border:'1px solid var(--border)',fontSize:'12px'}}/>
                              <Bar dataKey="orders" fill="#E8630A" radius={[4,4,0,0]} maxBarSize={24}/>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </>
                    )}

                    <h3 className="dash-section-title">Top Products by Revenue</h3>
                    {analytics.topProducts.length === 0
                      ? <div className="empty-state"><div className="empty-icon">📦</div><h3>No sales yet</h3></div>
                      : <div className="orders-list">
                          {analytics.topProducts.map((p, i) => (
                            <div key={i} className="order-row">
                              <span className="order-icon" style={{minWidth:'32px',textAlign:'center'}}>{i+1}</span>
                              <span className="order-icon">{p.icon}</span>
                              <div className="order-info">
                                <div className="order-name">{p.name}</div>
                                <div className="order-meta">{p.sales} sold · {p.views || 0} views</div>
                              </div>
                              <div style={{fontWeight:800,color:'var(--wolf)',whiteSpace:'nowrap'}}>MWK {p.revenue.toLocaleString()}</div>
                            </div>
                          ))}
                        </div>
                    }
                  </div>
                )
              })()}

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
                            <button className="mini-btn confirm" onClick={bulkPriceUpdate} disabled={bulkLoading}>💰 Set Price</button>
                            <button className="mini-btn report" onClick={bulkDelete} disabled={bulkLoading}>🗑️ Delete All</button>
                            <button className="mini-btn" style={{background:'white',border:'1px solid var(--border)',borderRadius:'6px',padding:'4px 10px',cursor:'pointer',fontSize:'12px'}} onClick={() => setBulkSelected(new Set())}>Clear</button>
                          </div>
                        )}
                        {/* Low stock alerts */}
                        {myProducts.filter(p => p.stock_qty !== null && p.stock_qty !== undefined && p.stock_qty <= 3).length > 0 && (
                          <div style={{background:'#fff7ed',border:'1.5px solid #fed7aa',borderRadius:'10px',padding:'12px 14px',marginBottom:'14px'}}>
                            <div style={{fontWeight:800,fontSize:'13px',color:'#c2410c',marginBottom:'6px'}}>⚠️ Low Stock Alert</div>
                            {myProducts.filter(p => p.stock_qty !== null && p.stock_qty !== undefined && p.stock_qty <= 3).map(p => (
                              <div key={p.id} style={{fontSize:'12px',color:'#9a3412',display:'flex',justifyContent:'space-between',alignItems:'center',padding:'2px 0'}}>
                                <span>{p.icon || '📦'} {p.name}</span>
                                <span style={{fontWeight:700,color: p.stock_qty === 0 ? '#ef4444' : '#f97316'}}>{p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`}</span>
                              </div>
                            ))}
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
                              {p.stock_qty !== null && p.stock_qty !== undefined && (
                                <div style={{fontSize:'11px',fontWeight:700,color: p.stock_qty === 0 ? '#ef4444' : p.stock_qty <= 3 ? '#f97316' : '#22c55e',marginTop:'2px'}}>
                                  {p.stock_qty === 0 ? '❌ Out of stock' : p.stock_qty <= 3 ? `⚠️ ${p.stock_qty} left` : `✅ ${p.stock_qty} in stock`}
                                </div>
                              )}
                            </div>
                            <div className="my-product-actions">
                              <button className={`avail-toggle ${p.available ? 'on' : 'off'}`} onClick={() => toggleAvailability(p.id, p.available)}>
                                {p.available ? '✅ Available' : '❌ Hidden'}
                              </button>
                              <button className="mini-btn confirm" onClick={() => { setEditingProduct(p); setEditProductForm({ name: p.name, price: p.price, description: p.description || '', category: p.category || '', stock_qty: p.stock_qty ?? '', images: p.images || (p.image_url ? [p.image_url] : []), variant_groups: p.variant_groups || [] }) }}>✏️</button>
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

                  {/* Address Book */}
                  <div className="settings-card" style={{marginTop:'20px'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'16px'}}>
                      <h4 style={{fontWeight:800,margin:0}}>📍 Saved Addresses</h4>
                      {!addingAddress && (
                        <button className="mini-btn confirm" onClick={() => setAddingAddress(true)}>+ Add Address</button>
                      )}
                    </div>

                    {addresses.length === 0 && !addingAddress && (
                      <p style={{fontSize:'13px',color:'var(--gray)',margin:'0 0 12px'}}>
                        Save delivery addresses so you don't have to retype them every order.
                      </p>
                    )}

                    {addresses.map(a => (
                      <div key={a.id} style={{display:'flex',alignItems:'flex-start',gap:'10px',padding:'12px',background:'var(--light)',borderRadius:'10px',marginBottom:'8px'}}>
                        <div style={{flex:1}}>
                          <div style={{fontWeight:700,fontSize:'13px',marginBottom:'2px'}}>
                            {a.label || 'Address'}
                          </div>
                          <div style={{fontSize:'12px',color:'#374151'}}>{a.address}</div>
                          {a.phone && <div style={{fontSize:'12px',color:'var(--gray)',marginTop:'2px'}}>📱 {a.phone}</div>}
                        </div>
                        <button onClick={() => deleteAddress(a.id)}
                          style={{background:'none',border:'none',cursor:'pointer',fontSize:'16px',color:'var(--gray)',padding:'4px',flexShrink:0}}>
                          🗑️
                        </button>
                      </div>
                    ))}

                    {addingAddress && (
                      <div style={{background:'var(--light)',borderRadius:'10px',padding:'16px',marginTop:'8px'}}>
                        <div className="form-group" style={{marginBottom:'10px'}}>
                          <label className="form-label">Label</label>
                          <input className="form-input" value={newAddress.label}
                            onChange={e => setNewAddress(a => ({...a, label: e.target.value}))}
                            placeholder="e.g. Home, Hostel Room 204"/>
                        </div>
                        <div className="form-group" style={{marginBottom:'10px'}}>
                          <label className="form-label">Delivery Address *</label>
                          <input className="form-input" value={newAddress.address}
                            onChange={e => setNewAddress(a => ({...a, address: e.target.value}))}
                            placeholder="e.g. Block C, Chancellor College, Zomba"/>
                        </div>
                        <div className="form-group" style={{marginBottom:'12px'}}>
                          <label className="form-label">Phone at this address</label>
                          <input className="form-input" value={newAddress.phone}
                            onChange={e => setNewAddress(a => ({...a, phone: e.target.value}))}
                            placeholder="+265 9xx xxx xxx"/>
                        </div>
                        <div style={{display:'flex',gap:'8px'}}>
                          <button onClick={() => { setAddingAddress(false); setNewAddress({label:'',address:'',phone:''}) }}
                            style={{flex:1,background:'white',border:'1.5px solid var(--border)',borderRadius:'10px',padding:'9px',fontWeight:600,fontSize:'13px',cursor:'pointer',fontFamily:'inherit'}}>
                            Cancel
                          </button>
                          <button onClick={saveAddress} disabled={savingAddress}
                            style={{flex:1,background:'var(--wolf)',color:'white',border:'none',borderRadius:'10px',padding:'9px',fontWeight:700,fontSize:'13px',cursor:'pointer',fontFamily:'inherit',opacity:savingAddress?0.6:1}}>
                            {savingAddress ? 'Saving…' : 'Save Address'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

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

                  {/* Scheduled Store Hours (vendor only) */}
                  {vendor && (
                    <div className="settings-card" style={{marginTop:'20px'}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'4px'}}>
                        <h3 style={{fontSize:'15px',fontWeight:800,margin:0}}>🕐 Scheduled Hours</h3>
                        <label style={{display:'flex',alignItems:'center',gap:'8px',cursor:'pointer',fontSize:'13px',fontWeight:600}}>
                          <input type="checkbox" checked={scheduleEnabled} onChange={e => setScheduleEnabled(e.target.checked)}
                            style={{width:'16px',height:'16px',accentColor:'var(--wolf)'}}/>
                          Enable auto-schedule
                        </label>
                      </div>
                      <p style={{fontSize:'12.5px',color:'var(--gray)',marginBottom:'16px'}}>
                        Set when your store opens and closes automatically each day. Outside these hours, your store shows as unavailable.
                      </p>

                      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'12px',marginBottom:'16px'}}>
                        <div className="form-group" style={{marginBottom:0}}>
                          <label className="form-label">Open at</label>
                          <input type="time" className="form-input" value={scheduleOpen}
                            onChange={e => setScheduleOpen(e.target.value)} disabled={!scheduleEnabled}/>
                        </div>
                        <div className="form-group" style={{marginBottom:0}}>
                          <label className="form-label">Close at</label>
                          <input type="time" className="form-input" value={scheduleClose}
                            onChange={e => setScheduleClose(e.target.value)} disabled={!scheduleEnabled}/>
                        </div>
                      </div>

                      <div style={{marginBottom:'16px'}}>
                        <label className="form-label">Active days</label>
                        <div style={{display:'flex',gap:'6px',flexWrap:'wrap'}}>
                          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
                            <button key={d} type="button" disabled={!scheduleEnabled}
                              onClick={() => setScheduleDays(prev => prev.includes(d) ? prev.filter(x=>x!==d) : [...prev,d])}
                              style={{
                                padding:'6px 12px',borderRadius:'8px',border:'1.5px solid',fontSize:'12px',fontWeight:700,
                                cursor:scheduleEnabled?'pointer':'default',fontFamily:'inherit',transition:'all 0.15s',
                                background: scheduleDays.includes(d) && scheduleEnabled ? 'var(--wolf)' : 'white',
                                color: scheduleDays.includes(d) && scheduleEnabled ? 'white' : 'var(--gray)',
                                borderColor: scheduleDays.includes(d) && scheduleEnabled ? 'var(--wolf)' : 'var(--border)',
                                opacity: scheduleEnabled ? 1 : 0.5,
                              }}>
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>

                      <button className="btn-primary" onClick={saveSchedule} disabled={savingSchedule || !scheduleEnabled}>
                        {savingSchedule ? 'Saving…' : 'Save Schedule'}
                      </button>
                      {!scheduleEnabled && (
                        <p style={{fontSize:'12px',color:'var(--gray)',marginTop:'8px',marginBottom:0}}>
                          Enable auto-schedule above to configure and save hours.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Cancel Order Modal */}
      {cancellingOrder && (
        <div className="modal-overlay" onClick={() => setCancellingOrder(null)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <h3>Cancel Order</h3>
            <p className="modal-sub" style={{ marginBottom: '16px' }}>
              {cancellingOrder.products?.name || 'This order'} · MWK {Number(cancellingOrder.total || 0).toLocaleString()}
            </p>
            <div className="form-group">
              <label className="form-label">Why are you cancelling?</label>
              <select className="form-input" value={cancelReason} onChange={e => setCancelReason(e.target.value)}>
                <option value="changed_mind">I changed my mind</option>
                <option value="found_elsewhere">Found it cheaper elsewhere</option>
                <option value="taking_too_long">Taking too long to confirm</option>
                <option value="ordered_by_mistake">Ordered by mistake</option>
                <option value="other">Other reason</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Note <span style={{ fontWeight: 400, color: 'var(--gray)' }}>(optional)</span></label>
              <textarea className="form-input" rows={2} value={cancelNote}
                onChange={e => setCancelNote(e.target.value)} placeholder="Anything else you'd like to tell the vendor?" />
            </div>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '10px 12px', fontSize: '12px', color: '#92400e', marginBottom: '16px' }}>
              ⚠️ Once cancelled, you'll need to place a new order if you change your mind. Cancellations can only be done before the vendor confirms.
            </div>
            <div className="modal-actions">
              <button className="continue-btn" onClick={() => setCancellingOrder(null)}>Keep Order</button>
              <button onClick={cancelOrder} disabled={cancelling}
                style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px', fontWeight: 700, fontSize: '14px', cursor: 'pointer', fontFamily: 'inherit', opacity: cancelling ? 0.6 : 1 }}>
                {cancelling ? 'Cancelling…' : 'Yes, Cancel Order'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Review Modal (from Dashboard order list) */}
      {reviewingOrder && (
        <div className="modal-overlay" onClick={() => setReviewingOrder(null)}>
          <div className="modal-card" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <h3>⭐ Review Your Purchase</h3>
            <p className="modal-sub" style={{ marginBottom: '4px' }}>{reviewingOrder.products?.name || 'Product'}</p>
            <span style={{ fontSize: '11px', fontWeight: 700, background: '#dcfce7', color: '#166534', borderRadius: '20px', padding: '2px 10px', border: '1px solid #bbf7d0', display: 'inline-block', marginBottom: '16px' }}>
              ✅ Verified Purchase
            </span>
            <div className="form-group">
              <label className="form-label">Your rating *</label>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} type="button" onClick={() => setInlineRating(n)}
                    style={{ background: 'none', border: 'none', fontSize: '28px', cursor: 'pointer', color: inlineRating >= n ? '#f59e0b' : '#d1d5db', padding: '0 2px' }}>★</button>
                ))}
              </div>
              {inlineRating > 0 && (
                <div style={{ fontSize: '12px', color: 'var(--gray)', fontWeight: 600 }}>
                  {['','Poor','Fair','Good','Very Good','Excellent!'][inlineRating]}
                </div>
              )}
            </div>
            <div className="form-group">
              <label className="form-label">Review <span style={{ fontWeight: 400, color: 'var(--gray)' }}>(optional)</span></label>
              <textarea className="form-input" rows={3} value={inlineText}
                onChange={e => setInlineText(e.target.value)} placeholder="How was the product? Was it as described?" />
            </div>
            <div className="modal-actions">
              <button className="continue-btn" onClick={() => setReviewingOrder(null)}>Skip</button>
              <button className="btn-primary" onClick={submitInlineReview} disabled={inlineSubmitting || !inlineRating}>
                {inlineSubmitting ? 'Submitting…' : 'Submit Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Product Modal — with image reorder */}
      {editingProduct && (
        <div className="modal-overlay" onClick={() => setEditingProduct(null)}>
          <div className="modal-card" style={{maxWidth:'480px',maxHeight:'90vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
            <h3>✏️ Edit Product</h3>

            {/* Image reorder */}
            {editingProduct.images && editingProduct.images.length > 1 && (
              <div style={{marginBottom:'16px'}}>
                <label className="form-label">Cover Photo — drag to reorder</label>
                <div style={{display:'flex',gap:'8px',overflowX:'auto',paddingBottom:'6px'}}>
                  {(editProductForm.images || editingProduct.images).map((img, idx) => (
                    <div key={img} style={{position:'relative',flexShrink:0,width:'72px'}}>
                      <img src={img} alt="" style={{width:'72px',height:'72px',objectFit:'cover',borderRadius:'8px',border: idx===0 ? '2.5px solid var(--wolf)' : '1.5px solid var(--border)'}}/>
                      {idx === 0 && (
                        <div style={{position:'absolute',top:'3px',left:'3px',background:'var(--wolf)',color:'white',fontSize:'9px',fontWeight:800,padding:'1px 5px',borderRadius:'4px'}}>COVER</div>
                      )}
                      {idx > 0 && (
                        <button
                          onClick={() => {
                            const imgs = [...(editProductForm.images || editingProduct.images)]
                            const [item] = imgs.splice(idx, 1)
                            imgs.unshift(item)
                            setEditProductForm(f => ({...f, images: imgs}))
                          }}
                          style={{position:'absolute',bottom:'3px',left:'50%',transform:'translateX(-50%)',background:'rgba(0,0,0,0.65)',color:'white',border:'none',borderRadius:'4px',padding:'2px 6px',fontSize:'10px',fontWeight:700,cursor:'pointer',whiteSpace:'nowrap'}}>
                          Make Cover
                        </button>
                      )}
                    </div>
                  ))}
                </div>
                <p style={{fontSize:'11px',color:'var(--gray)',marginTop:'4px',marginBottom:0}}>
                  Tap "Make Cover" on any photo to set it as the main product image.
                </p>
              </div>
            )}

            <div className="form-group"><label className="form-label">Product Name *</label><input className="form-input" value={editProductForm.name||''} onChange={e=>setEditProductForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Price (MWK) *</label><input className="form-input" type="number" value={editProductForm.price||''} onChange={e=>setEditProductForm(f=>({...f,price:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Category</label>
              <select className="form-input" value={editProductForm.category||''} onChange={e=>setEditProductForm(f=>({...f,category:e.target.value}))}>
                {['Fashion & Clothing','Electronics','Food & Drinks','Books & Stationery','Beauty & Health','Services','Art & Crafts','Home & Living','Sports & Fitness','Auto Parts','Other'].map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="form-group"><label className="form-label">Description</label><textarea className="form-input" rows={3} value={editProductForm.description||''} onChange={e=>setEditProductForm(f=>({...f,description:e.target.value}))}/></div>
            <div className="form-group"><label className="form-label">Stock Quantity <span style={{color:'var(--gray)',fontWeight:400}}>(blank = unlimited)</span></label><input className="form-input" type="number" min="0" value={editProductForm.stock_qty??''} onChange={e=>setEditProductForm(f=>({...f,stock_qty:e.target.value}))}/></div>
            <div className="form-group">
              <label className="form-label">Variants <span style={{fontWeight:400,color:'var(--gray)'}}>optional</span></label>
              <EditVariantGroups
                variantGroups={editProductForm.variant_groups || []}
                setVariantGroups={vg => setEditProductForm(f => ({...f, variant_groups: vg}))}
              />
            </div>
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
