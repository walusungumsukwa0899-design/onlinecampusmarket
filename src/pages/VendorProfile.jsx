import { useEffect, useState, useRef } from 'react'
import { useSEO } from '../lib/useSEO'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import { useAuth } from '../lib/AuthContext'
import Footer from '../components/Footer'
import './VendorProfile.css'

export default function VendorProfile() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart } = useCart()
  const { user } = useAuth()
  const [vendor, setVendor] = useState(null)
  const [products, setProducts] = useState([])
  const [reviews, setReviews] = useState([])
  const [messages, setMessages] = useState([])
  const [tab, setTab] = useState('products')
  const [loading, setLoading] = useState(true)
  const [msgText, setMsgText] = useState('')
  const [vendorBuyerId, setVendorBuyerId] = useState(null) // which buyer convo the vendor is viewing
  const [following, setFollowing] = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [buyerThreads, setBuyerThreads] = useState([]) // list of {buyer_id, buyer_name, last_msg} for vendor inbox
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewItem, setReviewItem] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const [hasReviewed, setHasReviewed] = useState(false)
  const [galleryProduct, setGalleryProduct] = useState(null) // {images, idx}
  const [storeSearch, setStoreSearch] = useState('')
  useSEO({
    title: vendor ? vendor.name : 'Store',
    description: vendor ? `Shop at ${vendor.name} on Wolf Marketplace – ${vendor.category} at ${vendor.university}` : undefined,
    image: vendor?.avatar_url || undefined,
  })
  const [replyTexts, setReplyTexts] = useState({}) // reviewId -> text
  const [replyOpen, setReplyOpen] = useState({}) // reviewId -> bool
  const [editMode, setEditMode] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [editForm, setEditForm] = useState({})
  const [editSaving, setEditSaving] = useState(false)
  const chatRef = useRef(null)

  useEffect(() => {
    loadVendor()
    loadProducts()
    loadReviews()
  }, [id])

  useEffect(() => {
    loadMessages()
  }, [id, user])

  useEffect(() => {
    if (user && tab === 'messages') loadVendorInbox()
  }, [tab, user, id])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  // Realtime messages — replace matching optimistic entry with real DB row to avoid duplicates
  useEffect(() => {
    const channel = supabase
      .channel('messages-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `vendor_id=eq.${id}` },
        payload => {
          setMessages(prev => {
            const idx = prev.findIndex(m => !m.id && m.text === payload.new.text && m.sender === payload.new.sender)
            if (idx !== -1) {
              const next = [...prev]
              next[idx] = payload.new
              return next
            }
            return [...prev, payload.new]
          })
        })
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  async function loadVendor() {
    try {
      const { data } = await supabase.from('vendors').select('*').eq('id', id).single()
      setVendor(data)
      if (user) {
        const { data: fol } = await supabase.from('vendor_follows').select('id').eq('vendor_id', id).eq('user_id', user.id).maybeSingle()
        setFollowing(!!fol)
      }
    } catch (err) {
      console.error('Failed to load vendor:', err)
    } finally {
      setLoading(false)
    }
  }

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').eq('vendor_id', id).order('created_at', { ascending: false })
    setProducts(data || [])
  }

  async function trackProductView(productId) {
    await supabase.rpc('increment_product_views', { product_id: productId })
  }

  async function loadReviews() {
    const { data } = await supabase.from('reviews').select('*, review_replies(id, text, created_at)').eq('vendor_id', id).order('created_at', { ascending: false })
    setReviews(data || [])
    if (user) {
      const already = (data || []).some(r => r.buyer_id === user.id)
      setHasReviewed(already)
    }
  }

  async function loadMessages() {
    if (!user) return
    const { data } = await supabase.from('messages')
      .select('*')
      .eq('vendor_id', id)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    const unread = (data || []).filter(m => m.sender === 'vendor' && !m.read).length
    setUnreadCount(unread)
    // Mark vendor messages as read now that buyer opened chat
    if (unread > 0) {
      await supabase.from('messages').update({ read: true })
        .eq('vendor_id', id).eq('buyer_id', user.id).eq('sender', 'vendor')
    }
  }

  async function loadVendorInbox() {
    if (!vendor) return
    if (user?.id !== vendor.user_id) return
    const { data } = await supabase
      .from('messages')
      .select('buyer_id, text, sender, created_at, profiles(full_name)')
      .eq('vendor_id', id)
      .order('created_at', { ascending: false })
    if (!data) return
    // Group by buyer_id, take most recent message per buyer
    const map = new Map()
    for (const m of data) {
      if (!map.has(m.buyer_id)) {
        map.set(m.buyer_id, { buyer_id: m.buyer_id, buyer_name: m.profiles?.full_name || 'Student', last_msg: m.text, last_time: m.created_at })
      }
    }
    setBuyerThreads([...map.values()])
    // Auto-open first thread
    if (map.size > 0 && !vendorBuyerId) setVendorBuyerId([...map.keys()][0])
  }

  async function loadVendorThread(buyerId) {
    setVendorBuyerId(buyerId)
    const { data } = await supabase.from('messages')
      .select('*')
      .eq('vendor_id', id)
      .eq('buyer_id', buyerId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    // Mark vendor's unread as read
    await supabase.from('messages').update({ read: true })
      .eq('vendor_id', id).eq('buyer_id', buyerId).eq('sender', 'buyer')
  }

  async function sendMessage() {
    if (!msgText.trim()) return
    if (!user) { navigate('/signin'); return }
    const optimistic = { vendor_id: id, buyer_id: user.id, text: msgText.trim(), sender: 'buyer', created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setMsgText('')
    const { error } = await supabase.from('messages').insert({ vendor_id: id, buyer_id: user.id, text: optimistic.text, sender: 'buyer' })
    if (error) {
      setMessages(prev => prev.filter(m => m !== optimistic))
      setMsgText(optimistic.text)
      alert('Message could not be sent. Please try again.')
    }
  }

  async function sendVendorReply() {
    if (!msgText.trim() || !vendorBuyerId) return
    const optimistic = { vendor_id: id, buyer_id: vendorBuyerId, text: msgText.trim(), sender: 'vendor', created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setMsgText('')
    const { error } = await supabase.from('messages').insert({ vendor_id: id, buyer_id: vendorBuyerId, text: optimistic.text, sender: 'vendor' })
    if (error) {
      setMessages(prev => prev.filter(m => m !== optimistic))
      setMsgText(optimistic.text)
      alert('Could not send reply: ' + error.message)
    }
  }

  async function submitReply(reviewId) {
    const text = replyTexts[reviewId]?.trim()
    if (!text) return
    const { error } = await supabase.from('review_replies').upsert({ review_id: reviewId, vendor_id: id, text })
    if (!error) {
      setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, review_replies: [{ text, created_at: new Date().toISOString() }] } : r))
      setReplyOpen(o => ({ ...o, [reviewId]: false }))
      setReplyTexts(t => ({ ...t, [reviewId]: '' }))
    } else {
      alert('Could not post reply: ' + error.message)
    }
  }

  async function submitReview() {
    if (isOwner) { alert('You cannot review your own store.'); return }
    if (!rating) { alert('Please select a star rating'); return }
    if (!reviewText.trim()) { alert('Please write a review'); return }
    if (!user) { navigate('/signin'); return }
    const rev = { vendor_id: id, buyer_id: user.id, buyer_name: user.user_metadata?.full_name || 'Anonymous', stars: rating, text: reviewText.trim(), item_purchased: reviewItem }
    const { error: reviewError } = await supabase.from('reviews').insert(rev)
    if (reviewError) {
      alert('Could not submit review: ' + reviewError.message)
      return
    }
    setReviews(prev => [{ ...rev, created_at: new Date().toISOString() }, ...prev])
    setReviewSuccess(true)
    setHasReviewed(true)
    setRating(0); setReviewText(''); setReviewItem('')
  }

  function openEdit() {
    setEditForm({
      name: vendor.name || '',
      category: vendor.category || '',
      phone: vendor.phone || '',
      email: vendor.email || '',
      location: vendor.location || '',
      hours: vendor.hours || '',
      delivery_area: vendor.delivery_area || '',
      delivery_time: vendor.delivery_time || '',
      delivery_fee: vendor.delivery_fee || '',
      delivery_zones: vendor.delivery_zones || '',
      payout_phone: vendor.payout_phone || '',
      payout_network: vendor.payout_network || '',
      is_available: vendor.is_available !== false,
      unavailable_reason: vendor.unavailable_reason || '',
    })
    setEditMode(true)
  }

  async function saveStoreEdit() {
    setEditSaving(true)
    const updates = {
      name: editForm.name.trim(),
      category: editForm.category,
      phone: editForm.phone.trim(),
      email: editForm.email.trim(),
      location: editForm.location.trim(),
      hours: editForm.hours.trim(),
      delivery_area: editForm.delivery_area.trim(),
      delivery_time: editForm.delivery_time,
      delivery_fee: editForm.delivery_fee ? parseInt(editForm.delivery_fee) : null,
      delivery_zones: editForm.delivery_zones?.trim() || null,
      payout_phone: editForm.payout_phone?.trim() || null,
      payout_network: editForm.payout_network || null,
      is_available: editForm.is_available !== false,
      unavailable_reason: editForm.is_available === false ? (editForm.unavailable_reason?.trim() || null) : null,
    }
    const { error } = await supabase.from('vendors').update(updates).eq('id', id)
    setEditSaving(false)
    if (!error) {
      setVendor(v => ({ ...v, ...updates }))
      setEditMode(false)
    } else {
      alert('Could not save changes: ' + error.message)
    }
  }

  async function toggleVendorAvailability() {
    const newVal = !vendor.is_available
    const reason = !newVal ? prompt('Why are you marking yourself unavailable? (e.g. "On exam leave until 20th June")') : null
    const { error } = await supabase.from('vendors').update({ is_available: newVal, unavailable_reason: reason || null }).eq('id', id)
    if (!error) setVendor(v => ({ ...v, is_available: newVal, unavailable_reason: reason || null }))
    else alert('Could not update availability: ' + error.message)
  }

  async function uploadBanner(e) {
    const file = e.target.files[0]; if (!file) return
    const path = `banners/${id}-${Date.now()}`
    const { error: uploadError } = await supabase.storage.from('vendor-images').upload(path, file)
    if (uploadError) { alert('Could not upload banner: ' + uploadError.message); return }
    const { data } = supabase.storage.from('vendor-images').getPublicUrl(path)
    const { error: updateError } = await supabase.from('vendors').update({ banner_url: data.publicUrl }).eq('id', id)
    if (!updateError) setVendor(v => ({ ...v, banner_url: data.publicUrl }))
  }

  async function uploadAvatar(e) {
    const file = e.target.files[0]; if (!file) return
    const path = `avatars/${id}-${Date.now()}`
    const { error: uploadError } = await supabase.storage.from('vendor-images').upload(path, file)
    if (uploadError) { alert('Could not upload photo: ' + uploadError.message); return }
    const { data } = supabase.storage.from('vendor-images').getPublicUrl(path)
    const { error: updateError } = await supabase.from('vendors').update({ avatar_url: data.publicUrl }).eq('id', id)
    if (!updateError) setVendor(v => ({ ...v, avatar_url: data.publicUrl }))
  }

  function askAboutItem(name) {
    setMsgText(`Hi! Is "${name}" still available?`)
    setTab('messages')
    setTimeout(() => document.getElementById('chat-input')?.focus(), 100)
  }

  const avgRating = reviews.length ? (reviews.reduce((a, r) => a + r.stars, 0) / reviews.length).toFixed(1) : null

  if (loading) return <div className="loading" style={{paddingTop:'100px'}}><div className="spinner"/><span>Loading store...</span></div>
  if (!vendor) return <div className="empty-state" style={{paddingTop:'100px'}}><div className="empty-icon">🏪</div><h3>Vendor not found</h3><button className="btn-primary" onClick={() => navigate('/vendors')}>Back to Vendors</button></div>

  const isOwner = user?.id === vendor.user_id

  return (
    <div className="vp-page">
      {/* Header */}
      <div className="vp-header">
        <button className="vp-back" onClick={() => navigate('/vendors')}>← Back to Vendors</button>
        <div className="vp-banner">
          {vendor.banner_url && <img src={vendor.banner_url} alt=""/>}
          {isOwner && (
            <>
              <label className="banner-upload-btn" htmlFor="banner-input">📷 Change Cover</label>
              <input id="banner-input" type="file" accept="image/*" style={{display:'none'}} onChange={uploadBanner}/>
            </>
          )}
        </div>
        <div className="vp-info-row">
          <div className="vp-avatar">
            {vendor.avatar_url ? <img src={vendor.avatar_url} alt={vendor.name}/> : <span>{vendor.icon || '🏪'}</span>}
            {isOwner && (
              <>
                <label className="avatar-upload-overlay" htmlFor="avatar-input">📷</label>
                <input id="avatar-input" type="file" accept="image/*" style={{display:'none'}} onChange={uploadAvatar}/>
              </>
            )}
          </div>
          <div className="vp-meta">
            <h1 style={{display:'flex',alignItems:'center',gap:'8px'}}>{vendor.name}{vendor.verified && <span title="Verified Vendor" style={{background:'#3b82f6',color:'white',fontSize:'11px',fontWeight:800,padding:'2px 8px',borderRadius:'20px',verticalAlign:'middle'}}>✓ Verified</span>}</h1>
            <div className="vp-meta-tags">
              <span>🏷️ {vendor.category}</span>
              <span>📍 {vendor.university}</span>
              <span style={{color:'#4ade80'}}>✅ Verified</span>
              {avgRating && <span>⭐ {avgRating} ({reviews.length} reviews)</span>}
            </div>
            {isOwner && (
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'8px'}}>
                <button className="mini-btn confirm" onClick={openEdit}>✏️ Edit Store</button>
                <button className={`mini-btn ${vendor.is_available===false?'confirm':'report'}`} onClick={toggleVendorAvailability}>
                  {vendor.is_available === false ? '✅ Mark Open' : '😴 Mark Unavailable'}
                </button>
              </div>
            )}
            {!isOwner && vendor.is_available === false && (
              <div style={{marginTop:'10px',background:'#fff7ed',border:'1px solid #fed7aa',borderRadius:'8px',padding:'8px 12px',fontSize:'13px',color:'#9a3412'}}>
                😴 This vendor is currently unavailable{vendor.unavailable_reason ? `: ${vendor.unavailable_reason}` : '. Check back later.'}
              </div>
            )}
            {!isOwner && (
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap',marginTop:'8px'}}>
                <button onClick={async () => {
                  if (!user) { navigate('/signin'); return }
                  setFollowLoading(true)
                  if (following) {
                    const { error } = await supabase.from('vendor_follows').delete().eq('vendor_id', id).eq('user_id', user.id)
                    if (!error) setFollowing(false)
                    else alert('Could not unfollow. Please try again.')
                  } else {
                    const { error } = await supabase.from('vendor_follows').upsert({ vendor_id: id, user_id: user.id }, { onConflict: 'vendor_id,user_id' })
                    if (!error) setFollowing(true)
                    else alert('Could not follow. Please try again.')
                  }
                  setFollowLoading(false)
                }} disabled={followLoading}
                  style={{background:following?'var(--wolf)':'white',color:following?'white':'var(--wolf)',border:'1.5px solid var(--wolf)',borderRadius:'8px',padding:'6px 14px',fontSize:'12px',fontWeight:700,cursor:'pointer',transition:'all .2s'}}>
                  {following ? '✓ Following' : '+ Follow'}
                </button>
                <button onClick={() => { const text=encodeURIComponent(`Check out ${vendor.name} on Wolf Marketplace!\n${window.location.href}`); window.open(`https://wa.me/?text=${text}`,'_blank') }}
                  style={{background:'#25D366',color:'white',border:'none',borderRadius:'8px',padding:'6px 14px',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>
                  📤 Share Store
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="vp-stats-row">
          <div className="vp-stat"><div className="vp-stat-val">{products.length}</div><div className="vp-stat-label">Products</div></div>
          <div className="vp-stat"><div className="vp-stat-val">{avgRating || 'New'}⭐</div><div className="vp-stat-label">Rating</div></div>
          <div className="vp-stat"><div className="vp-stat-val">{vendor.total_sales || 0}+</div><div className="vp-stat-label">Sales</div></div>
          <div className="vp-stat"><div className="vp-stat-val">{reviews.length}</div><div className="vp-stat-label">Reviews</div></div>
        </div>

        <div className="vp-tabs">
          {['products','messages','reviews'].map(t => (
            <button key={t} className={`vp-tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
              {t==='products'?'🛍️ Products':t==='messages'?(
              <span>💬 Messages{!isOwner && unreadCount > 0 && <span style={{marginLeft:'6px',background:'#ef4444',color:'white',borderRadius:'99px',padding:'1px 7px',fontSize:'11px',fontWeight:700}}>{unreadCount}</span>}</span>
            ):'⭐ Reviews'}
            </button>
          ))}
        </div>
      </div>

      <div className="vp-body container">
        {/* Products */}
        {tab === 'products' && (
          products.length === 0
            ? <div className="empty-state"><div className="empty-icon">📦</div><h3>No products yet</h3></div>
            : <div className="products-grid">
                {products.filter(p => !storeSearch || p.name.toLowerCase().includes(storeSearch.toLowerCase()) || p.description?.toLowerCase().includes(storeSearch.toLowerCase())).map(p => (
                  <div key={p.id} className="product-card">
                    <div className="product-img" style={{position:"relative", cursor: p.image_urls?.length > 1 ? 'zoom-in' : 'default'}}
                      onClick={() => p.image_urls?.length > 1 && setGalleryProduct({images: p.image_urls, idx: 0})}>
                      {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy"/> : <span>{p.icon||'📦'}</span>}
                      {p.image_urls?.length > 1 && (
                        <div style={{position:'absolute',bottom:'6px',left:0,right:0,display:'flex',justifyContent:'center',gap:'4px'}}>
                          {p.image_urls.map((_,i) => <span key={i} style={{width:'5px',height:'5px',borderRadius:'50%',background:'white',opacity:0.9,display:'block'}}/>)}
                        </div>
                      )}
                    </div>
                    <div className="product-body">
                      <div className="product-name">{p.name}</div>
                      <div className={`avail-tag ${p.available?'avail':'unavail'}`}>{p.available ? '✅ In Stock' : '❌ Out of Stock'}</div>
                      {avgRating && (
                        <div style={{display:'flex',alignItems:'center',gap:'3px',marginBottom:'4px'}}>
                          {'★'.repeat(Math.floor(avgRating)).split('').map((_,i)=><span key={i} style={{color:'#f59e0b',fontSize:'11px'}}>★</span>)}
                          <span style={{fontSize:'11px',color:'#6b7280',fontWeight:600}}>{avgRating} ({reviews.length})</span>
                        </div>
                      )}
                      <div className="product-footer">
                        <div className="product-price">MWK {Number(p.price).toLocaleString()}</div>
                    {p.stock_qty !== null && p.stock_qty !== undefined && (
                      <div style={{fontSize:'11px',fontWeight:700,color:p.stock_qty>5?'#22c55e':p.stock_qty>0?'#f97316':'#ef4444',marginBottom:'4px'}}>
                        {p.stock_qty>5?`${p.stock_qty} in stock`:p.stock_qty>0?`Only ${p.stock_qty} left!`:'Out of stock'}
                      </div>
                    )}
                        <button className="ask-btn" onClick={() => askAboutItem(p.name)}>Ask →</button>
                      </div>
                      {p.available
                        ? <button className="add-cart-btn" onClick={() => addToCart({id:p.id,name:p.name,price:`MWK ${Number(p.price).toLocaleString()}`,rawPrice:p.price,icon:p.icon||'📦',seller:vendor.name,vendor_id:vendor.id})}>Add to Cart</button>
                        : <button className="add-cart-btn" disabled>Out of Stock</button>
                      }
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* Contact & Chat */}
        {tab === 'messages' && (
          <div style={{maxWidth:'600px',margin:'0 auto'}}>
            {/* Chat panel — full width, prominent */}
            <div className="vp-panel" style={{marginBottom:'16px'}}>
              {isOwner ? (
                <>
                  <h3>📥 Customer Messages</h3>
                  {buyerThreads.length === 0
                    ? <div className="chat-empty" style={{padding:'24px 0'}}>No messages yet from buyers.</div>
                    : (
                      <div style={{display:'flex',gap:'12px',height:'340px'}}>
                        <div style={{width:'140px',borderRight:'1px solid var(--border)',overflowY:'auto',flexShrink:0}}>
                          {buyerThreads.map(t => (
                            <div key={t.buyer_id}
                              onClick={() => loadVendorThread(t.buyer_id)}
                              style={{padding:'10px 8px',cursor:'pointer',background:vendorBuyerId===t.buyer_id?'var(--light)':'',borderBottom:'1px solid var(--border)'}}>
                              <div style={{fontWeight:700,fontSize:'12px',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.buyer_name}</div>
                              <div style={{fontSize:'11px',color:'var(--gray)',whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{t.last_msg}</div>
                            </div>
                          ))}
                        </div>
                        <div style={{flex:1,display:'flex',flexDirection:'column'}}>
                          <div className="chat-box" ref={chatRef} style={{flex:1}}>
                            {messages.length === 0
                              ? <div className="chat-empty">Select a conversation</div>
                              : messages.map((m, i) => (
                                  <div key={i} className={`chat-msg ${m.sender === 'vendor' ? 'me' : 'vendor'}`}>
                                    <div className="bubble">{m.text}</div>
                                    <div className="msg-time">{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                                  </div>
                                ))
                            }
                          </div>
                          <div className="chat-input-row" style={{marginTop:'8px'}}>
                            <textarea className="chat-input" value={msgText} onChange={e => setMsgText(e.target.value)}
                              placeholder="Reply to customer..."
                              onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendVendorReply()} }}
                              rows={2} disabled={!vendorBuyerId}/>
                            <button className="send-btn" onClick={sendVendorReply} disabled={!vendorBuyerId}>➤</button>
                          </div>
                        </div>
                      </div>
                    )
                  }
                </>
              ) : (
                <>
                  <h3>💬 Message {vendor.name}</h3>
                  <p className="chat-subtitle">Ask about availability, prices, or delivery. Messages go directly to the vendor.</p>
                  <div className="chat-box" ref={chatRef}>
                    {messages.length === 0
                      ? <div className="chat-empty">No messages yet. Say hello! 👋</div>
                      : messages.map((m, i) => (
                          <div key={i} className={`chat-msg ${m.sender === 'buyer' ? 'me' : 'vendor'}`}>
                            <div className="bubble">{m.text}</div>
                            <div className="msg-time">{new Date(m.created_at).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}</div>
                          </div>
                        ))
                    }
                  </div>
                  {user ? (
                    <div className="chat-input-row">
                      <textarea id="chat-input" className="chat-input" value={msgText} onChange={e => setMsgText(e.target.value)}
                        placeholder="Type a message..."
                        onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()} }}
                        rows={2}/>
                      <button className="send-btn" onClick={sendMessage}>➤</button>
                    </div>
                  ) : (
                    <p className="signin-hint"><button onClick={() => navigate('/signin')}>Sign in</button> to message this vendor</p>
                  )}
                  {vendor.phone && (
                    <a href={`https://wa.me/${vendor.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                      style={{display:'flex',alignItems:'center',gap:'8px',marginTop:'12px',background:'#25D366',color:'white',padding:'10px 14px',borderRadius:'10px',fontWeight:700,fontSize:'13px',textDecoration:'none'}}>
                      <span style={{fontSize:'18px'}}>💬</span> Chat on WhatsApp
                    </a>
                  )}
                </>
              )}
            </div>

            {/* Contact info — compact, below chat */}
            {!isOwner && (
              <div className="vp-panel" style={{fontSize:'13px'}}>
                <h4 style={{margin:'0 0 10px',fontSize:'14px',fontWeight:700}}>📞 Contact & Delivery</h4>
                <div className="contact-list">
                  {vendor.phone && <div className="ci"><div className="ci-icon">📱</div><div><div className="ci-label">Phone / WhatsApp</div><div className="ci-val">{vendor.phone}</div></div></div>}
                  {vendor.location && <div className="ci"><div className="ci-icon">📍</div><div><div className="ci-label">Location</div><div className="ci-val">{vendor.location}</div></div></div>}
                  {vendor.hours && <div className="ci"><div className="ci-icon">⏰</div><div><div className="ci-label">Open Hours</div><div className="ci-val">{vendor.hours}</div></div></div>}
                  <div className="ci"><div className="ci-icon">💰</div><div><div className="ci-label">Delivery Fee</div><div className="ci-val">{vendor.delivery_fee ? `MWK ${Number(vendor.delivery_fee).toLocaleString()}` : 'Free'}</div></div></div>
                  <div className="ci"><div className="ci-icon">⏱️</div><div><div className="ci-label">Delivery Time</div><div className="ci-val">{vendor.delivery_time || 'Same day'}</div></div></div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reviews */}
        {tab === 'reviews' && (
          <div className="reviews-pane">
            <div className="add-review">
              {isOwner ? (
                <div className="success-msg" style={{background:'var(--light)'}}>You can&apos;t review your own store.</div>
              ) : hasReviewed || reviewSuccess ? (
                <div className="success-msg">✅ {reviewSuccess ? 'Review posted! Thank you.' : "You've already reviewed this store."}</div>
              ) : !user ? (
                <p className="signin-hint"><button onClick={() => navigate('/signin')}>Sign in</button> to leave a review</p>
              ) : (
                <>
                  <h4>✍️ Leave a Review</h4>
                  <div className="stars-row">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} className={`star-btn${rating>=n?' on':''}`} onClick={() => setRating(n)}>★</button>
                    ))}
                    <span className="rating-label">{rating ? ['','Poor','Fair','Good','Great','Excellent'][rating] : 'Tap to rate'}</span>
                  </div>
                  <div className="form-group"><label className="form-label">Item purchased (optional)</label><input className="form-input" value={reviewItem} onChange={e => setReviewItem(e.target.value)} placeholder="e.g. Ankara Dress"/></div>
                  <div className="form-group"><label className="form-label">Your review</label><textarea className="form-input" value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Share your experience with this vendor..." rows={3}/></div>
                  <button className="btn-primary" onClick={submitReview}>Submit Review</button>
                </>
              )}
            </div>

            {reviews.length === 0
              ? <div className="empty-state"><div className="empty-icon">⭐</div><h3>No reviews yet</h3><p>Be the first to review this vendor!</p></div>
              : reviews.map((r, i) => (
                  <div key={i} className="review-card">
                    <div className="review-top">
                      <div className="review-name">{r.buyer_name}</div>
                      <div className="review-stars">{'★'.repeat(r.stars)}{'☆'.repeat(5-r.stars)}</div>
                    </div>
                    {r.item_purchased && <div className="review-item">Purchased: {r.item_purchased}</div>}
                    <div className="review-text">{r.text}</div>
                    <div className="review-date">{new Date(r.created_at).toLocaleDateString()}</div>
                    {/* Vendor reply */}
                    {r.review_replies?.[0] && (
                      <div style={{background:'var(--light)',borderRadius:'8px',padding:'10px 12px',marginTop:'10px',fontSize:'13px'}}>
                        <div style={{fontWeight:700,marginBottom:'4px',color:'var(--wolf)'}}>🏪 Vendor replied:</div>
                        <div style={{color:'var(--gray)'}}>{r.review_replies[0].text}</div>
                      </div>
                    )}
                    {isOwner && !r.review_replies?.[0] && (
                      replyOpen[r.id]
                        ? <div style={{marginTop:'10px'}}>
                            <textarea className="form-input" rows={2} placeholder="Write a reply..." value={replyTexts[r.id]||''} onChange={e=>setReplyTexts(t=>({...t,[r.id]:e.target.value}))} style={{marginBottom:'6px'}}/>
                            <div style={{display:'flex',gap:'8px'}}>
                              <button className="mini-btn confirm" onClick={()=>submitReply(r.id)}>Post Reply</button>
                              <button className="mini-btn" style={{background:'var(--light)',border:'none',borderRadius:'6px',padding:'4px 10px',cursor:'pointer',fontSize:'12px'}} onClick={()=>setReplyOpen(o=>({...o,[r.id]:false}))}>Cancel</button>
                            </div>
                          </div>
                        : <button className="mini-btn confirm" style={{marginTop:'8px'}} onClick={()=>setReplyOpen(o=>({...o,[r.id]:true}))}>Reply to Review</button>
                    )}
                  </div>
                ))
            }
          </div>
        )}
      </div>
      <Footer />

      {/* Image Gallery Lightbox */}
      {galleryProduct && (
        <div className="modal-overlay" onClick={() => setGalleryProduct(null)} style={{zIndex:1000}}>
          <div style={{position:'relative',maxWidth:'500px',width:'90%'}} onClick={e => e.stopPropagation()}>
            <img src={galleryProduct.images[galleryProduct.idx]} alt="" style={{width:'100%',borderRadius:'12px',display:'block'}}/>
            <button onClick={() => setGalleryProduct(null)} style={{position:'absolute',top:'10px',right:'10px',background:'rgba(0,0,0,0.6)',color:'white',border:'none',borderRadius:'50%',width:'32px',height:'32px',fontSize:'16px',cursor:'pointer'}}>×</button>
            {galleryProduct.images.length > 1 && (
              <>
                <button onClick={() => setGalleryProduct(g => ({...g, idx: (g.idx - 1 + g.images.length) % g.images.length}))}
                  style={{position:'absolute',left:'10px',top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.5)',color:'white',border:'none',borderRadius:'50%',width:'36px',height:'36px',fontSize:'18px',cursor:'pointer'}}>‹</button>
                <button onClick={() => setGalleryProduct(g => ({...g, idx: (g.idx + 1) % g.images.length}))}
                  style={{position:'absolute',right:'10px',top:'50%',transform:'translateY(-50%)',background:'rgba(0,0,0,0.5)',color:'white',border:'none',borderRadius:'50%',width:'36px',height:'36px',fontSize:'18px',cursor:'pointer'}}>›</button>
                <div style={{position:'absolute',bottom:'12px',left:0,right:0,display:'flex',justifyContent:'center',gap:'6px'}}>
                  {galleryProduct.images.map((_,i) => (
                    <span key={i} onClick={() => setGalleryProduct(g => ({...g, idx: i}))}
                      style={{width:'8px',height:'8px',borderRadius:'50%',background: i===galleryProduct.idx ? 'white' : 'rgba(255,255,255,0.5)',cursor:'pointer',display:'block'}}/>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Edit Store Modal */}
      {editMode && (
        <div className="modal-overlay" onClick={() => setEditMode(false)}>
          <div className="modal-card" style={{maxWidth:'480px',maxHeight:'85vh',overflowY:'auto'}} onClick={e => e.stopPropagation()}>
            <h3>✏️ Edit Store</h3>
            {[
              {label:'Store Name', key:'name', placeholder:'Your store name'},
              {label:'Category', key:'category', placeholder:'e.g. Fashion'},
              {label:'Phone / WhatsApp', key:'phone', placeholder:'+265 9xx xxx xxx'},
              {label:'Email', key:'email', placeholder:'store@example.com'},
              {label:'Location on Campus', key:'location', placeholder:'e.g. Block C Hostel'},
              {label:'Open Hours', key:'hours', placeholder:'e.g. Mon–Sat 8am–7pm'},
              {label:'Delivery Area', key:'delivery_area', placeholder:'e.g. UNIMA Campus'},
              {label:'Delivery Fee (MWK)', key:'delivery_fee', placeholder:'Leave blank for free'},
            ].map(f => (
              <div className="form-group" key={f.key}>
                <label className="form-label">{f.label}</label>
                <input className="form-input" value={editForm[f.key] || ''} onChange={e => setEditForm(ef => ({...ef, [f.key]: e.target.value}))} placeholder={f.placeholder}/>
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Estimated Delivery Time</label>
              <select className="form-input" value={editForm.delivery_time || ''} onChange={e => setEditForm(ef => ({...ef, delivery_time: e.target.value}))}>
                <option value="">Select...</option>
                <option>Within 1 hour</option>
                <option>Same day (2–5 hours)</option>
                <option>Next day</option>
                <option>2–3 days</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Delivery Zones <span style={{fontWeight:400,color:'var(--gray)'}}>— campuses/areas you deliver to</span></label>
              <input className="form-input" value={editForm.delivery_zones || ''} onChange={e => setEditForm(ef => ({...ef, delivery_zones: e.target.value}))} placeholder="e.g. UNIMA, Poly, Chancellor College, Zomba Town"/>
              <div style={{fontSize:'11px',color:'var(--gray)',marginTop:'4px'}}>Separate with commas. Leave blank for all areas.</div>
            </div>
            <div className="form-group">
              <label className="form-label">Payout Phone Number <span style={{fontWeight:400,color:'var(--gray)'}}>— Airtel Money or TNM Mpamba</span></label>
              <input className="form-input" value={editForm.payout_phone || ''} onChange={e => setEditForm(ef => ({...ef, payout_phone: e.target.value}))} placeholder="e.g. 0991234567"/>
            </div>
            <div className="form-group">
              <label className="form-label">Mobile Money Network</label>
              <select className="form-input" value={editForm.payout_network || ''} onChange={e => setEditForm(ef => ({...ef, payout_network: e.target.value}))}>
                <option value="">Select network...</option>
                <option value="airtel">Airtel Money</option>
                <option value="tnm">TNM Mpamba</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">🏖️ Vacation Mode</label>
              <label style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',cursor:'pointer',marginBottom:'8px'}}>
                <input type="checkbox" checked={editForm.is_available === false} onChange={e => setEditForm(ef => ({...ef, is_available: !e.target.checked}))} style={{accentColor:'var(--wolf)'}}/>
                Mark store as temporarily unavailable
              </label>
              {editForm.is_available === false && (
                <input className="form-input" value={editForm.unavailable_reason || ''} onChange={e => setEditForm(ef => ({...ef, unavailable_reason: e.target.value}))} placeholder="Reason (e.g. Away until 15 Jan — back soon!)"/>
              )}
            </div>
            <div className="modal-actions">
              <button className="continue-btn" onClick={() => setEditMode(false)}>Cancel</button>
              <button className="btn-primary" onClick={saveStoreEdit} disabled={editSaving}>{editSaving ? 'Saving...' : 'Save Changes'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
