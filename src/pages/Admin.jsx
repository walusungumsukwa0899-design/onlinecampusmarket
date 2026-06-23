import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

// Admin emails — replace with your own
const ADMIN_EMAILS = ['admin@wolfmarketplace.mw', 'walusungumsukwa0899@gmail.com']

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('reports')
  const [reports, setReports] = useState([])
  const [vendors, setVendors] = useState([])
  const [stats, setStats] = useState({ orders: 0, users: 0, vendors: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)

  const isAdmin = user && ADMIN_EMAILS.includes(user.email)

  useEffect(() => {
    if (authLoading) return // wait until we actually know if there's a session
    if (!user) { navigate('/signin'); return }
    if (!isAdmin) { navigate('/'); return }
    loadAll()
  }, [user, authLoading])

  async function loadAll() {
    try {
      const [{ data: reps }, { data: vends }, { data: ords }] = await Promise.all([
        supabase.from('order_reports').select('*, orders(id, total, refund_status, products(name)), profiles(full_name)').order('created_at', { ascending: false }),
        supabase.from('vendors').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('total, status').neq('status', 'cancelled'),
      ])
      setReports(reps || [])
      setVendors(vends || [])
      const revenue = (ords || []).reduce((a, o) => a + (o.total || 0), 0)
      setStats({ orders: (ords || []).length, vendors: (vends || []).length, revenue })
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function updateReportStatus(reportId, status) {
    const { error } = await supabase.from('order_reports').update({ status }).eq('id', reportId)
    if (!error) {
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r))
      // If resolved, offer to approve refund
      if (status === 'resolved') {
        const report = reports.find(r => r.id === reportId)
        if (report?.orders?.id && report.orders.refund_status === 'requested') {
          const approve = window.confirm('Approve refund for this order? (MWK ' + (report.orders.total || 0).toLocaleString() + ')')
          if (approve) {
            await supabase.from('orders').update({ refund_status: 'approved' }).eq('id', report.orders.id)
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, orders: { ...r.orders, refund_status: 'approved' } } : r))
          }
        }
      }
    }
  }

  async function toggleVendorVerified(vendorId, current) {
    const { error } = await supabase.from('vendors').update({ verified: !current }).eq('id', vendorId)
    if (!error) setVendors(prev => prev.map(v => v.id === vendorId ? { ...v, verified: !current } : v))
  }

  if (authLoading) return <div className="loading" style={{minHeight:'60vh'}}><div className="spinner"/><span>Loading...</span></div>
  if (!user || !isAdmin) return null

  return (
    <div className="dash-page">
      <div className="dash-layout">
        <aside className="dash-sidebar">
          <div className="dash-user">
            <div className="dash-avatar">🛡️</div>
            <div className="dash-user-name">Admin Panel</div>
          </div>
          {[
            { id: 'reports', icon: '🚨', label: 'Reports' },
            { id: 'vendors', icon: '🏪', label: 'Vendors' },
            { id: 'stats', icon: '📊', label: 'Stats' },
          ].map(item => (
            <div key={item.id} className={`dash-nav-item${tab === item.id ? ' active' : ''}`} onClick={() => setTab(item.id)}>
              <span>{item.icon}</span>{item.label}
            </div>
          ))}
          <div className="dash-nav-item" onClick={() => navigate('/dashboard')}><span>←</span>Back</div>
        </aside>

        <main className="dash-main">
          {loading ? <div className="loading"><div className="spinner"/><span>Loading...</span></div> : (
            <>
              {tab === 'stats' && (
                <div>
                  <h2 className="dash-title">📊 Platform Stats</h2>
                  <div className="dash-cards">
                    <div className="dash-card"><div className="dash-card-label">Total Orders</div><div className="dash-card-val">{stats.orders}</div></div>
                    <div className="dash-card"><div className="dash-card-label">Active Vendors</div><div className="dash-card-val">{stats.vendors}</div></div>
                    <div className="dash-card"><div className="dash-card-label">Total Revenue</div><div className="dash-card-val" style={{fontSize:'14px'}}>MWK {stats.revenue.toLocaleString()}</div></div>
                  </div>
                </div>
              )}

              {tab === 'reports' && (
                <div>
                  <h2 className="dash-title">🚨 Issue Reports</h2>
                  {reports.length === 0
                    ? <div className="empty-state"><div className="empty-icon">✅</div><h3>No reports</h3></div>
                    : <div className="orders-list">
                        {reports.map(r => (
                          <div key={r.id} className="order-row order-row-expanded" style={{flexWrap:'wrap',gap:'8px'}}>
                            <div className="order-info" style={{flex:1,minWidth:'200px'}}>
                              <div className="order-name">{r.reason.replace(/_/g,' ')} — {r.orders?.products?.name || 'Order'}</div>
                              <div className="order-meta">By {r.profiles?.full_name || 'User'} · {new Date(r.created_at).toLocaleDateString()}</div>
                              {r.details && <div className="order-meta" style={{marginTop:'4px',fontStyle:'italic'}}>"{r.details}"</div>}
                            </div>
                            <div className="order-actions-col">
                              <div className={`status-chip ${r.status}`}>{r.status}</div>
                              {r.status === 'open' && (
                                <>
                                  <button className="mini-btn confirm" onClick={() => updateReportStatus(r.id, 'reviewing')}>Mark Reviewing</button>
                                  <button className="mini-btn confirm" onClick={() => updateReportStatus(r.id, 'resolved')}>Resolve</button>
                                  <button className="mini-btn report" onClick={() => updateReportStatus(r.id, 'dismissed')}>Dismiss</button>
                                </>
                              )}
                              {r.orders?.refund_status && r.orders.refund_status !== 'none' && (
                                <div className={`status-chip ${r.orders.refund_status === 'approved' ? 'confirmed' : 'pending'}`} style={{fontSize:'11px'}}>
                                  Refund: {r.orders.refund_status}
                                </div>
                              )}
                              {r.status === 'reviewing' && (
                                <>
                                  <button className="mini-btn confirm" onClick={() => updateReportStatus(r.id, 'resolved')}>Resolve</button>
                                  <button className="mini-btn report" onClick={() => updateReportStatus(r.id, 'dismissed')}>Dismiss</button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                  }
                </div>
              )}

              {tab === 'vendors' && (
                <div>
                  <h2 className="dash-title">🏪 All Vendors</h2>
                  <div className="orders-list">
                    {vendors.map(v => (
                      <div key={v.id} className="order-row">
                        <span className="order-icon">{v.icon || '🏪'}</span>
                        <div className="order-info">
                          <div className="order-name">{v.name}</div>
                          <div className="order-meta">{v.university} · {v.category}</div>
                        </div>
                        <div className="order-actions-col">
                          <div className={`status-chip ${v.verified ? 'confirmed' : 'pending'}`}>{v.verified ? '✅ Verified' : 'Unverified'}</div>
                          <button className={`mini-btn ${v.verified ? 'report' : 'confirm'}`} onClick={() => toggleVendorVerified(v.id, v.verified)}>
                            {v.verified ? 'Unverify' : 'Verify'}
                          </button>
                          <button className="mini-btn confirm" onClick={() => navigate(`/vendors/${v.id}`)}>View Store</button>
                          <button className={`mini-btn ${v.is_featured?'report':'confirm'}`} onClick={async()=>{
                            const {error}=await supabase.from('vendors').update({is_featured:!v.is_featured}).eq('id',v.id)
                            if(!error) setVendors(prev=>prev.map(vv=>vv.id===v.id?{...vv,is_featured:!v.is_featured}:vv))
                          }}>{v.is_featured?'★ Unfeature':'☆ Feature'}</button>
                        </div>
                      </div>
                    ))}
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
