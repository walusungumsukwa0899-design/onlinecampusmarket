import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../lib/CartContext'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'
import './Cart.css'

function EmptyCart({ navigate }) {
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [recommended, setRecommended] = useState([])

  useEffect(() => {
    // Show recently viewed first, then random products
    try {
      const rv = JSON.parse(localStorage.getItem('wolf_recently_viewed') || '[]')
      if (rv.length > 0) { setRecommended(rv.slice(0, 4)); return }
    } catch {}
    supabase.from('products').select('*, vendors(name)').eq('available', true)
      .order('created_at', { ascending: false }).limit(8)
      .then(({ data }) => setRecommended((data || []).filter(p => p.vendors).slice(0, 4)))
  }, [])

  return (
    <div className="cart-page">
      <div style={{ maxWidth: '700px', margin: '0 auto', padding: '100px 20px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>🛒</div>
          <h2 style={{ fontWeight: 900, fontSize: '22px', marginBottom: '8px' }}>Your cart is empty</h2>
          <p style={{ color: 'var(--gray)', fontSize: '14px', marginBottom: '20px' }}>Add some products and come back here to checkout.</p>
          <button className="btn-primary" onClick={() => navigate('/vendors')}>Browse Products</button>
        </div>
        {recommended.length > 0 && (
          <>
            <h3 style={{ fontWeight: 800, fontSize: '16px', marginBottom: '16px' }}>
              {JSON.parse(localStorage.getItem('wolf_recently_viewed') || '[]').length > 0 ? '👀 Recently Viewed' : '✨ Popular Right Now'}
            </h3>
            <div className="products-grid">
              {recommended.map(p => {
                const cartItem = { id: p.id, name: p.name, price: `MWK ${Number(p.price).toLocaleString()}`, rawPrice: p.price, icon: p.icon || '📦', seller: p.seller || p.vendors?.name, vendor_id: p.vendor_id, image_url: p.image_url }
                return (
                  <div key={p.id} className="product-card" onClick={() => navigate(`/products/${p.id}`)}>
                    <div className="product-img">
                      {p.image_url ? <img src={p.image_url} alt={p.name} loading="lazy" /> : <span>{p.icon || '📦'}</span>}
                    </div>
                    <div className="product-body">
                      <div className="product-name">{p.name}</div>
                      <div className="product-seller">{p.seller || p.vendors?.name}</div>
                      <div className="product-footer">
                        <div className="product-price">MWK {Number(p.price).toLocaleString()}</div>
                      </div>
                      <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                        <button className="add-cart-btn" style={{ flex: 1 }} onClick={e => { e.stopPropagation(); addToCart(cartItem) }}>Add to Cart</button>
                        <button onClick={e => { e.stopPropagation(); toggleWishlist(cartItem) }}
                          style={{ background: isWishlisted(p.id) ? '#fee2e2' : 'var(--light)', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: 'pointer', fontSize: '15px' }}>
                          {isWishlisted(p.id) ? '❤️' : '🤍'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>
      <Footer />
    </div>
  )
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`

function withTimeout(promise, ms, message) {
  let timer
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms)
  })
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer))
}

export default function Cart() {
  const navigate = useNavigate()

  const { cart, removeFromCart, changeQty, clearCart } = useCart()
  const { user } = useAuth()

  const [network, setNetwork] = useState(null) // 'airtel' | 'tnm' | null
  const [mobile, setMobile] = useState('')
  const [deliveryHostel, setDeliveryHostel] = useState('')
  const [deliveryRoom, setDeliveryRoom] = useState('')
  const [deliveryNote, setDeliveryNote] = useState('')
  const [stage, setStage] = useState('idle') // idle | charging | polling | success | failed
  const [errorMsg, setErrorMsg] = useState('')
  const lastChargeId = useRef(null) // track last charge so we can cancel it on retry
  const [saveMobileChecked, setSaveMobileChecked] = useState(true)
  const [creditBalance, setCreditBalance] = useState(0)
  const [useCredit, setUseCredit] = useState(false)
  const [promoCode, setPromoCode] = useState('')
  const [promoApplied, setPromoApplied] = useState(null) // { code, discount, type }
  const [promoError, setPromoError] = useState('')
  const [promoLoading, setPromoLoading] = useState(false)
  const [deliverySlot, setDeliverySlot] = useState('')

  // Pre-fill saved mobile + credit balance from profile
  useEffect(() => {
    async function loadProfile() {
      if (!user) return
      const { data } = await supabase.from('profiles').select('saved_mobile, saved_network, credit_balance').eq('id', user.id).maybeSingle()
      if (data?.saved_mobile) setMobile(data.saved_mobile)
      if (data?.saved_network) setNetwork(data.saved_network)
      if (data?.credit_balance) setCreditBalance(data.credit_balance)
    }
    loadProfile()
  }, [user])

  const subtotal = cart.reduce((a, i) => a + (parseInt(String(i.rawPrice || i.price).replace(/[^0-9]/g,'')) * i.qty), 0)
  const creditApplied = useCredit ? Math.min(creditBalance, subtotal) : 0
  const promoDiscount = promoApplied
    ? promoApplied.type === 'percent'
      ? Math.round(subtotal * promoApplied.discount / 100)
      : Math.min(promoApplied.discount, subtotal)
    : 0
  const total = subtotal - creditApplied - promoDiscount

  async function applyPromoCode() {
    if (!promoCode.trim()) return
    setPromoLoading(true)
    setPromoError('')
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', promoCode.trim().toUpperCase())
      .eq('active', true)
      .maybeSingle()
    if (error || !data) { setPromoError('Invalid or expired promo code.'); setPromoLoading(false); return }
    if (data.expires_at && new Date(data.expires_at) < new Date()) { setPromoError('This promo code has expired.'); setPromoLoading(false); return }
    if (data.max_uses && data.uses_count >= data.max_uses) { setPromoError('This promo code has reached its usage limit.'); setPromoLoading(false); return }
    if (data.min_order && subtotal < data.min_order) { setPromoError(`Minimum order of MWK ${data.min_order.toLocaleString()} required.`); setPromoLoading(false); return }
    setPromoApplied({ code: data.code, discount: data.discount, type: data.discount_type, id: data.id })
    setPromoLoading(false)
  }

  function selectNetwork(n) {
    setNetwork(n)
    setErrorMsg('')
  }

  async function callFunction(path, payload) {
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession(), 10000, 'Could not verify your session. Please try again.'
    )
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    let res
    try {
      res = await fetch(`${FUNCTIONS_URL}/${path}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.access_token ?? ''}`,
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      })
    } catch (err) {
      if (err.name === 'AbortError') throw new Error('The connection timed out. Please check your internet and try again.')
      throw new Error('Network error. Please check your connection and try again.')
    } finally {
      clearTimeout(timeoutId)
    }
    const json = await res.json()
    if (!res.ok) throw new Error(json?.error || 'Request failed')
    return json
  }

  async function cancelPendingOrders(chargeId) {
    if (!chargeId || !user) return
    await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('buyer_id', user.id)
      .like('notes', `%charge_id:${chargeId}%`)
      .eq('status', 'pending')
  }

  async function pollVerification(chargeId) {
    const MAX_ATTEMPTS = 20 // ~60s at 3s intervals
    for (let attempt = 0; attempt <= MAX_ATTEMPTS; attempt++) {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 3000))
      try {
        const result = await callFunction('paychangu-verify', { charge_id: chargeId })
        if (result.status === 'successful' || result.status === 'success') {
          clearCart()
          navigate(`/order-confirmation/${chargeId}`)
          return
        }
        if (result.status === 'failed') {
          setStage('failed')
          setErrorMsg('Payment was not completed. You can try again.')
          return
        }
        // still pending — continue loop
      } catch (err) {
        setStage('failed')
        setErrorMsg(err.message || 'Could not verify payment status.')
        return
      }
    }
    setStage('failed')
    setErrorMsg('Payment is taking longer than expected. Check your phone for a pending prompt, or try again.')
  }

  async function placeOrder() {
    if (!user) { navigate('/signin'); return }
    if (!network) { setErrorMsg('Choose Airtel Money or TNM Mpamba first.'); return }
    if (!mobile.trim()) { setErrorMsg('Enter the mobile money number to charge.'); return }

    setErrorMsg('')
    setStage('charging')

    // Save mobile number to profile if requested
    if (saveMobileChecked && user && mobile && network) {
      supabase.from('profiles').update({ saved_mobile: mobile, saved_network: network }).eq('id', user.id).then(() => {}).catch(() => {})
    }

    try {
      // Cancel any lingering pending orders from a previous failed attempt
      if (lastChargeId.current) {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(), 10000, 'Could not verify your session. Please try again.'
        )
        if (session) {
          await supabase
            .from('orders')
            .update({ status: 'cancelled' })
            .eq('buyer_id', user.id)
            .like('notes', `%charge_id:${lastChargeId.current}%`)
            .eq('status', 'pending')
        }
        lastChargeId.current = null
      }

      const deliveryAddress = [deliveryHostel.trim(), deliveryRoom.trim(), deliverySlot ? `Slot: ${deliverySlot}` : '', deliveryNote.trim()].filter(Boolean).join(', ')
      const items = cart.map(i => ({
        product_id: i.id,
        vendor_id: i.vendor_id,
        name: i.name,
        qty: i.qty,
        price: i.rawPrice,
      }))
      const result = await callFunction('paychangu-charge', {
        mobile: mobile.trim(),
        network,
        amount: total,
        items,
        deliveryAddress: deliveryAddress || null,
      })
      // Deduct credit balance if used
      if (useCredit && creditApplied > 0 && user) {
        supabase.rpc('add_referral_credit', { referrer_id: user.id, amount: -creditApplied }).then(() => {}).catch(() => {})
      }
      // Increment promo code usage
      if (promoApplied?.id) {
        supabase.from('promo_codes').update({ uses_count: supabase.rpc('increment', { x: 1 }) }).eq('id', promoApplied.id).then(() => {}).catch(() => {})
      }
      lastChargeId.current = result.charge_id
      setStage('polling')
      await pollVerification(result.charge_id)
      // If polling set stage to success, navigate to receipt
      // (checked via stage ref since setState is async)
    } catch (err) {
      setStage('failed')
      setErrorMsg(err.message || 'Could not start the payment. Please try again.')
    }
  }

  if (stage === 'success') return (
    <div className="cart-page">
      <div className="empty-state">
        <div className="empty-icon">🎉</div>
        <h3>Payment received!</h3>
        <p>Your order is confirmed. Message the vendor from their store page to arrange delivery or pickup.</p>
        <button className="btn-primary" onClick={() => navigate('/dashboard')}>View My Orders</button>
      </div>
      <Footer />
    </div>
  )

  if (cart.length === 0) return (
    <EmptyCart navigate={navigate} />
  )

  return (
    <div className="cart-page">
      <div className="cart-container">
        <div className="cart-header">
          <h2>🛒 My Cart <span>({cart.length} item{cart.length !== 1 ? 's' : ''})</span></h2>
          <button className="clear-btn" onClick={clearCart}>Clear all</button>
        </div>

        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((item, idx) => (
              <div key={item.id || idx} className="cart-item">
                <div className="cart-item-img">{item.icon}</div>
                <div className="cart-item-info">
                  <div className="cart-item-name">{item.name}</div>
                  <div className="cart-item-seller">{item.seller}</div>
                  <div className="cart-item-price">{item.price}</div>
                  <div className="qty-row">
                    <button className="qty-btn" onClick={() => changeQty(item.id, -1)}>−</button>
                    <span className="qty-num">{item.qty}</span>
                    <button className="qty-btn" onClick={() => changeQty(item.id, 1)}>+</button>
                  </div>
                </div>
                <button className="remove-btn" onClick={() => removeFromCart(item.id)}>✕</button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3>Order Summary</h3>
            <div className="summary-row"><span>Subtotal</span><span>MWK {subtotal.toLocaleString()}</span></div>
            {promoDiscount > 0 && <div className="summary-row" style={{color:'#16a34a'}}><span>🏷️ Promo ({promoApplied.code})</span><span>- MWK {promoDiscount.toLocaleString()}</span></div>}
            {creditApplied > 0 && <div className="summary-row" style={{color:'#16a34a'}}><span>🎁 Referral Credit</span><span>- MWK {creditApplied.toLocaleString()}</span></div>}
            <div className="summary-row total"><span>Total</span><span>MWK {total.toLocaleString()}</span></div>

            {/* Promo code */}
            {!promoApplied ? (
              <div style={{display:'flex',gap:'6px',margin:'12px 0'}}>
                <input value={promoCode} onChange={e=>{setPromoCode(e.target.value.toUpperCase());setPromoError('')}}
                  placeholder="Promo code" className="form-input" style={{flex:1,padding:'8px 12px',fontSize:'13px'}}
                  onKeyDown={e=>e.key==='Enter'&&applyPromoCode()} disabled={stage==='charging'||stage==='polling'}/>
                <button onClick={applyPromoCode} disabled={promoLoading||!promoCode.trim()||stage==='charging'||stage==='polling'}
                  style={{background:'var(--wolf)',color:'white',border:'none',borderRadius:'8px',padding:'0 14px',fontWeight:700,fontSize:'13px',cursor:'pointer',flexShrink:0,opacity:promoLoading||!promoCode.trim()?0.5:1}}>
                  {promoLoading?'...':'Apply'}
                </button>
              </div>
            ) : (
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',margin:'12px 0',background:'#f0fdf4',border:'1.5px solid #bbf7d0',borderRadius:'8px',padding:'8px 12px'}}>
                <span style={{fontSize:'13px',color:'#166534',fontWeight:700}}>✅ {promoApplied.code} — {promoApplied.type==='percent'?`${promoApplied.discount}% off`:`MWK ${promoApplied.discount.toLocaleString()} off`}</span>
                <button onClick={()=>{setPromoApplied(null);setPromoCode('');setPromoError('')}} style={{background:'none',border:'none',color:'#6b7280',cursor:'pointer',fontSize:'12px',fontWeight:700}}>Remove</button>
              </div>
            )}
            {promoError && <div style={{fontSize:'12px',color:'#ef4444',marginBottom:'8px',fontWeight:600}}>{promoError}</div>}

            {/* Credit toggle */}
            {creditBalance > 0 && (
              <label style={{display:'flex',alignItems:'center',gap:'8px',fontSize:'13px',margin:'4px 0 12px',cursor:'pointer'}}>
                <input type="checkbox" checked={useCredit} onChange={e=>setUseCredit(e.target.checked)} style={{accentColor:'var(--wolf)'}} disabled={stage==='charging'||stage==='polling'}/>
                Use MWK {creditBalance.toLocaleString()} referral credit
              </label>
            )}

            {/* Guest checkout notice */}
            {!user && (
              <div style={{background:'#fffbeb',border:'1.5px solid #fde68a',borderRadius:'10px',padding:'12px 14px',marginBottom:'12px',fontSize:'13px'}}>
                <div style={{fontWeight:700,marginBottom:'4px'}}>👤 Sign in to checkout</div>
                <div style={{color:'var(--gray)',marginBottom:'8px'}}>You need an account to complete your purchase and track your order.</div>
                <button className="btn-primary" style={{padding:'8px 16px',fontSize:'12px'}} onClick={()=>navigate('/signin')}>Sign In / Create Account</button>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Delivery location or pickup note (optional)</label>
              {/* Saved address book */}
              {(() => {
                let saved = []
                try { saved = JSON.parse(localStorage.getItem('wolf_saved_addresses') || '[]') } catch {}
                return saved.length > 0 ? (
                  <div style={{display:'flex',gap:'6px',flexWrap:'wrap',marginBottom:'8px'}}>
                    {saved.map((addr, i) => (
                      <button key={i} onClick={() => setDeliveryNote(addr)}
                        style={{background:'var(--light)',border:'1.5px solid var(--border)',borderRadius:'8px',padding:'5px 10px',fontSize:'11px',fontWeight:600,cursor:'pointer',maxWidth:'180px',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',color:'var(--wolf)'}}>
                        📍 {addr}
                      </button>
                    ))}
                  </div>
                ) : null
              })()}
              <div style={{display:'flex',gap:'6px'}}>
                <input className="form-input" style={{flex:1}} value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="e.g. Block C Hostel, UNIMA — or 'I'll pick up'" disabled={stage==='charging'||stage==='polling'}/>
                {deliveryNote.trim() && (
                  <button onClick={() => {
                    let saved = []
                    try { saved = JSON.parse(localStorage.getItem('wolf_saved_addresses') || '[]') } catch {}
                    if (!saved.includes(deliveryNote.trim())) {
                      saved = [deliveryNote.trim(), ...saved].slice(0, 5)
                      localStorage.setItem('wolf_saved_addresses', JSON.stringify(saved))
                      alert('📍 Address saved!')
                    }
                  }} style={{background:'var(--light)',border:'1.5px solid var(--border)',borderRadius:'8px',padding:'0 10px',cursor:'pointer',fontSize:'12px',fontWeight:700,color:'var(--wolf)',flexShrink:0,whiteSpace:'nowrap'}}
                  disabled={stage==='charging'||stage==='polling'}>
                    💾 Save
                  </button>
                )}
              </div>
            </div>

            <div className="pay-methods">
              <div className="pay-label">Pay with:</div>
              <div className="pay-btns">
                <button className={`pay-btn airtel${network==='airtel'?' selected':''}`} onClick={() => selectNetwork('airtel')} disabled={stage==='charging'||stage==='polling'}>📱 Airtel Money</button>
                <button className={`pay-btn tnm${network==='tnm'?' selected':''}`} onClick={() => selectNetwork('tnm')} disabled={stage==='charging'||stage==='polling'}>📱 TNM Mpamba</button>
              </div>
            </div>

            {network && (
              <div className="form-group">
                <label className="form-label">{network === 'airtel' ? 'Airtel Money' : 'TNM Mpamba'} number</label>
                <input className="form-input" value={mobile} onChange={e => setMobile(e.target.value)} placeholder="e.g. 0991 234 567" disabled={stage==='charging'||stage==='polling'}/>
              </div>
            )}

            {errorMsg && <div className="auth-error">{errorMsg}</div>}

            {(stage === 'charging' || stage === 'polling') && (
              <div className="loading" style={{padding:'16px 0'}}>
                <div className="spinner"/>
                <span>{stage === 'charging' ? 'Starting payment...' : 'Check your phone — enter your PIN to approve, then wait here.'}</span>
              </div>
            )}

            <button className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'13px',marginTop:'4px'}}
              onClick={placeOrder} disabled={stage==='charging'||stage==='polling'}>
              {stage==='charging'||stage==='polling' ? 'Processing...' : 'Place Order →'}
            </button>
            <button className="continue-btn" onClick={() => navigate('/vendors')}>← Continue Shopping</button>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  )
}
