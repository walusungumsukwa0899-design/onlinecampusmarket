import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function OrderConfirmation() {
  const { chargeId } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { navigate('/signin'); return }
    loadOrders()
  }, [user])

  async function loadOrders() {
    try {
      const { data } = await supabase
        .from('orders')
        .select('*, products(name, icon, image_url), vendors(name, phone)')
        .eq('buyer_id', user.id)
        .like('notes', `%${chargeId}%`)
        .order('created_at', { ascending: true })
      setOrders(data || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const total = orders.reduce((a, o) => a + (o.total || 0), 0)
  const vendors = [...new Map(orders.map(o => [o.vendor_id, o.vendors])).values()]

  if (loading) return <div className="loading"><div className="spinner"/><span>Loading your receipt...</span></div>

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '560px', margin: '0 auto', padding: '100px 20px 60px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ fontSize: '64px', marginBottom: '12px' }}>✅</div>
          <h1 style={{ fontWeight: 900, fontSize: '26px', marginBottom: '8px' }}>Payment Confirmed!</h1>
          <p style={{ color: 'var(--gray)', fontSize: '14px' }}>
            Your order has been placed. The vendor will contact you to arrange delivery.
          </p>
          <div style={{ background: 'var(--light)', borderRadius: '10px', padding: '10px 16px', display: 'inline-block', marginTop: '12px', fontSize: '12px', color: 'var(--gray)' }}>
            Reference: <strong style={{ fontFamily: 'monospace' }}>{chargeId}</strong>
          </div>
        </div>

        {/* Items */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '20px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 800 }}>🛍️ Order Summary</div>
          {orders.map((o, i) => (
            <div key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 20px', borderBottom: i < orders.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: 'var(--light)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                {o.products?.image_url ? <img src={o.products.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px' }} /> : o.products?.icon || '📦'}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{o.products?.name || 'Product'}</div>
                <div style={{ fontSize: '12px', color: 'var(--gray)' }}>From {o.vendors?.name} · Qty {o.quantity || 1}</div>
              </div>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>MWK {(o.total || 0).toLocaleString()}</div>
            </div>
          ))}
          <div style={{ padding: '14px 20px', display: 'flex', justifyContent: 'space-between', background: 'var(--light)', fontWeight: 900 }}>
            <span>Total Paid</span>
            <span style={{ color: 'var(--wolf)' }}>MWK {total.toLocaleString()}</span>
          </div>
        </div>

        {/* Vendor contacts */}
        <div style={{ background: 'white', borderRadius: '14px', border: '1px solid var(--border)', overflow: 'hidden', marginBottom: '28px' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', fontWeight: 800 }}>📞 Vendor Contact{vendors.length > 1 ? 's' : ''}</div>
          {vendors.map((v, i) => v && (
            <div key={i} style={{ padding: '14px 20px', borderBottom: i < vendors.length - 1 ? '1px solid var(--border)' : 'none' }}>
              <div style={{ fontWeight: 700, marginBottom: '4px' }}>{v.name}</div>
              {v.phone && (
                <a href={`https://wa.me/${v.phone.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#25D366', color: 'white', borderRadius: '8px', padding: '6px 14px', fontSize: '13px', fontWeight: 700, textDecoration: 'none' }}>
                  💬 WhatsApp {v.phone}
                </a>
              )}
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button className="btn-outline" style={{ flex: 1 }} onClick={() => navigate('/dashboard')}>View My Orders</button>
          <button className="btn-primary" style={{ flex: 1 }} onClick={() => navigate('/shop')}>Keep Shopping</button>
        </div>
      </div>
      <Footer />
    </div>
  )
}
