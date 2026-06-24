import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCart } from '../lib/CartContext'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'
import './Cart.css'

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
  const total = subtotal - creditApplied

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
    <div className="cart-page">
      <div className="empty-state">
        <div className="empty-icon">🛒</div>
        <h3>Your cart is empty</h3>
        <p>Browse products and add items to your cart.</p>
        <button className="btn-primary" onClick={() => navigate('/vendors')}>Start Shopping</button>
      </div>
      <Footer />
    </div>
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
          {creditApplied > 0 && <div className="summary-row" style={{color:'#16a34a'}}><span>🎁 Referral Credit</span><span>- MWK {creditApplied.toLocaleString()}</span></div>}
            <div className="summary-row total"><span>Total</span><span>MWK {total.toLocaleString()}</span></div>
            <p className="delivery-note">📦 Delivery or pickup is arranged directly with each vendor after payment — message them from their store page to coordinate.</p>

            <div className="form-group">
              <label className="form-label">Delivery location or pickup note (optional)</label>
              <input className="form-input" value={deliveryNote} onChange={e => setDeliveryNote(e.target.value)} placeholder="e.g. Block C Hostel, UNIMA — or 'I'll pick up'" disabled={stage==='charging'||stage==='polling'}/>
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
