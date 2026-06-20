import { useEffect, useState, useRef } from 'react'
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
  const [rating, setRating] = useState(0)
  const [reviewText, setReviewText] = useState('')
  const [reviewItem, setReviewItem] = useState('')
  const [reviewSuccess, setReviewSuccess] = useState(false)
  const chatRef = useRef(null)

  useEffect(() => {
    loadVendor()
    loadProducts()
    loadReviews()
    loadMessages()
  }, [id])

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight
  }, [messages])

  // Realtime messages
  useEffect(() => {
    const channel = supabase
      .channel('messages-' + id)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `vendor_id=eq.${id}` },
        payload => setMessages(prev => [...prev, payload.new]))
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [id])

  async function loadVendor() {
    const { data } = await supabase.from('vendors').select('*').eq('id', id).single()
    setVendor(data)
    setLoading(false)
  }

  async function loadProducts() {
    const { data } = await supabase.from('products').select('*').eq('vendor_id', id).order('created_at', { ascending: false })
    setProducts(data || [])
  }

  async function loadReviews() {
    const { data } = await supabase.from('reviews').select('*').eq('vendor_id', id).order('created_at', { ascending: false })
    setReviews(data || [])
  }

  async function loadMessages() {
    if (!user) return
    const { data } = await supabase.from('messages')
      .select('*')
      .eq('vendor_id', id)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
  }

  async function sendMessage() {
    if (!msgText.trim()) return
    if (!user) { navigate('/signin'); return }
    const msg = { vendor_id: id, buyer_id: user.id, text: msgText.trim(), sender: 'buyer' }
    setMessages(prev => [...prev, { ...msg, created_at: new Date().toISOString() }])
    setMsgText('')
    await supabase.from('messages').insert(msg)
  }

  async function submitReview() {
    if (!rating) { alert('Please select a star rating'); return }
    if (!reviewText.trim()) { alert('Please write a review'); return }
    if (!user) { navigate('/signin'); return }
    const rev = { vendor_id: id, buyer_id: user.id, buyer_name: user.user_metadata?.full_name || 'Anonymous', stars: rating, text: reviewText.trim(), item_purchased: reviewItem }
    await supabase.from('reviews').insert(rev)
    setReviews(prev => [{ ...rev, created_at: new Date().toISOString() }, ...prev])
    setReviewSuccess(true)
    setRating(0); setReviewText(''); setReviewItem('')
  }

  async function uploadBanner(e) {
    const file = e.target.files[0]; if (!file) return
    const path = `banners/${id}-${Date.now()}`
    await supabase.storage.from('vendor-images').upload(path, file)
    const { data } = supabase.storage.from('vendor-images').getPublicUrl(path)
    await supabase.from('vendors').update({ banner_url: data.publicUrl }).eq('id', id)
    setVendor(v => ({ ...v, banner_url: data.publicUrl }))
  }

  async function uploadAvatar(e) {
    const file = e.target.files[0]; if (!file) return
    const path = `avatars/${id}-${Date.now()}`
    await supabase.storage.from('vendor-images').upload(path, file)
    const { data } = supabase.storage.from('vendor-images').getPublicUrl(path)
    await supabase.from('vendors').update({ avatar_url: data.publicUrl }).eq('id', id)
    setVendor(v => ({ ...v, avatar_url: data.publicUrl }))
  }

  function askAboutItem(name) {
    setMsgText(`Hi! Is "${name}" still available?`)
    setTab('contact')
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
            <h1>{vendor.name}</h1>
            <div className="vp-meta-tags">
              <span>🏷️ {vendor.category}</span>
              <span>📍 {vendor.university}</span>
              <span style={{color:'#4ade80'}}>✅ Verified</span>
              {avgRating && <span>⭐ {avgRating} ({reviews.length} reviews)</span>}
            </div>
          </div>
        </div>

        <div className="vp-stats-row">
          <div className="vp-stat"><div className="vp-stat-val">{products.length}</div><div className="vp-stat-label">Products</div></div>
          <div className="vp-stat"><div className="vp-stat-val">{avgRating || 'New'}⭐</div><div className="vp-stat-label">Rating</div></div>
          <div className="vp-stat"><div className="vp-stat-val">{vendor.total_sales || 0}+</div><div className="vp-stat-label">Sales</div></div>
          <div className="vp-stat"><div className="vp-stat-val">{reviews.length}</div><div className="vp-stat-label">Reviews</div></div>
        </div>

        <div className="vp-tabs">
          {['products','contact','reviews'].map(t => (
            <button key={t} className={`vp-tab${tab===t?' active':''}`} onClick={() => setTab(t)}>
              {t==='products'?'🛍️ Products':t==='contact'?'📞 Contact & Chat':'⭐ Reviews'}
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
                {products.map(p => (
                  <div key={p.id} className="product-card">
                    <div className="product-img">
                      {p.image_url ? <img src={p.image_url} alt={p.name}/> : <span>{p.icon||'📦'}</span>}
                    </div>
                    <div className="product-body">
                      <div className="product-name">{p.name}</div>
                      <div className={`avail-tag ${p.available?'avail':'unavail'}`}>{p.available ? '✅ In Stock' : '❌ Out of Stock'}</div>
                      <div className="product-footer">
                        <div className="product-price">MWK {Number(p.price).toLocaleString()}</div>
                        <button className="ask-btn" onClick={() => askAboutItem(p.name)}>Ask →</button>
                      </div>
                      {p.available
                        ? <button className="add-cart-btn" onClick={() => addToCart({id:p.id,name:p.name,price:`MWK ${Number(p.price).toLocaleString()}`,rawPrice:p.price,icon:p.icon||'📦',seller:vendor.name})}>Add to Cart</button>
                        : <button className="add-cart-btn" disabled>Out of Stock</button>
                      }
                    </div>
                  </div>
                ))}
              </div>
        )}

        {/* Contact & Chat */}
        {tab === 'contact' && (
          <div className="contact-chat-grid">
            {/* Contact info */}
            <div className="vp-panel">
              <h3>📞 Contact Info</h3>
              <div className="contact-list">
                <div className="ci"><div className="ci-icon">📱</div><div><div className="ci-label">Phone / WhatsApp</div><div className="ci-val">{vendor.phone || 'Not provided'}</div></div></div>
                <div className="ci"><div className="ci-icon">📧</div><div><div className="ci-label">Email</div><div className="ci-val">{vendor.email || 'Not provided'}</div></div></div>
                <div className="ci"><div className="ci-icon">📍</div><div><div className="ci-label">Location</div><div className="ci-val">{vendor.location || 'Not provided'}</div></div></div>
                <div className="ci"><div className="ci-icon">⏰</div><div><div className="ci-label">Open Hours</div><div className="ci-val">{vendor.hours || 'Not specified'}</div></div></div>
              </div>
              <div className="delivery-section">
                <div className="ci-section-title">🚚 Delivery Details</div>
                <div className="ci"><div className="ci-icon">📦</div><div><div className="ci-label">Delivery Area</div><div className="ci-val">{vendor.delivery_area || 'On campus'}</div></div></div>
                <div className="ci"><div className="ci-icon">⏱️</div><div><div className="ci-label">Delivery Time</div><div className="ci-val">{vendor.delivery_time || 'Same day'}</div></div></div>
                <div className="ci"><div className="ci-icon">💰</div><div><div className="ci-label">Delivery Fee</div><div className="ci-val">{vendor.delivery_fee ? `MWK ${Number(vendor.delivery_fee).toLocaleString()}` : 'Free'}</div></div></div>
              </div>
            </div>

            {/* Chat */}
            <div className="vp-panel">
              <h3>💬 Ask the Vendor</h3>
              <p className="chat-subtitle">Ask about availability, prices, or delivery.</p>
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
              <div className="chat-input-row">
                <textarea id="chat-input" className="chat-input" value={msgText} onChange={e => setMsgText(e.target.value)}
                  placeholder={user ? 'Type a message...' : 'Sign in to chat with this vendor'}
                  onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendMessage()} }}
                  rows={2} disabled={!user}/>
                <button className="send-btn" onClick={sendMessage} disabled={!user}>➤</button>
              </div>
              {!user && <p className="signin-hint"><button onClick={() => navigate('/signin')}>Sign in</button> to chat with this vendor</p>}
            </div>
          </div>
        )}

        {/* Reviews */}
        {tab === 'reviews' && (
          <div className="reviews-pane">
            <div className="add-review">
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
              {reviewSuccess && <div className="success-msg">✅ Review posted! Thank you for your feedback.</div>}
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
                  </div>
                ))
            }
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
