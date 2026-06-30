import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

export default function Admin() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('reports')
  const [reports, setReports] = useState([])
  const [vendors, setVendors] = useState([])
  const [disputes, setDisputes] = useState([])
  const [activeDispute, setActiveDispute] = useState(null)
  const [disputeMsgs, setDisputeMsgs] = useState([])
  const [adminReply, setAdminReply] = useState('')
  const [payoutRequests, setPayoutRequests] = useState([])
  const [stats, setStats] = useState({ orders: 0, vendors: 0, revenue: 0 })
  const [loading, setLoading] = useState(true)
  const [isAdmin, setIsAdmin] = useState(null) // null = still checking, true/false = resolved

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/signin'); return }
    checkAdmin()
  }, [user, authLoading])

  async function checkAdmin() {
    const { data, error } = await supabase.from('profiles').select('is_admin').eq('id', user.id).maybeSingle()
    if (error || !data?.is_admin) {
      setIsAdmin(false)
      navigate('/home')
      return
    }
    setIsAdmin(true)
    loadAll()
  }

  useEffect(() => {
    if (activeDispute) loadDisputeMsgs(activeDispute.id)
  }, [activeDispute])

  async function loadAll() {
    try {
      const [{ data: reps }, { data: vends }, { data: ords }, { data: disps }, { data: payouts }] = await Promise.all([
        supabase.from('order_reports').select('*, orders(id,total,refund_status,products(name)), profiles(full_name)').order('created_at', { ascending: false }),
        supabase.from('vendors').select('*').order('created_at', { ascending: false }),
        supabase.from('orders').select('total,status').neq('status', 'cancelled'),
        supabase.from('disputes').select('*, orders(id,total,products(name,icon))').order('created_at', { ascending: false }),
        supabase.from('payout_requests').select('*, vendors(name,payout_phone,payout_network)').order('created_at', { ascending: false }),
      ])
      setReports(reps || [])
      setVendors(vends || [])
      setDisputes(disps || [])
      setPayoutRequests(payouts || [])
      setStats({ orders: (ords||[]).length, vendors: (vends||[]).length, revenue: (ords||[]).reduce((a,o)=>a+(o.total||0),0) })
    } catch(err) { console.error(err) }
    finally { setLoading(false) }
  }

  async function loadDisputeMsgs(id) {
    const { data } = await supabase.from('dispute_messages').select('*').eq('dispute_id', id).order('created_at', { ascending: true })
    setDisputeMsgs(data || [])
  }

  async function sendAdminReply() {
    if (!adminReply.trim() || !activeDispute) return
    const { data, error } = await supabase.from('dispute_messages').insert({ dispute_id: activeDispute.id, sender_id: user.id, sender_role: 'admin', text: adminReply.trim() }).select().single()
    if (!error && data) { setDisputeMsgs(p => [...p, data]); setAdminReply('') }
  }

  async function updateDisputeStatus(id, status) {
    await supabase.from('disputes').update({ status }).eq('id', id)
    setDisputes(prev => prev.map(d => d.id === id ? { ...d, status } : d))
    if (activeDispute?.id === id) setActiveDispute(p => ({ ...p, status }))
  }

  async function updatePayoutStatus(id, status) {
    await supabase.from('payout_requests').update({ status }).eq('id', id)
    setPayoutRequests(prev => prev.map(p => p.id === id ? { ...p, status } : p))
  }

  async function updateReportStatus(reportId, status) {
    const { error } = await supabase.from('order_reports').update({ status }).eq('id', reportId)
    if (!error) {
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, status } : r))
      if (status === 'resolved') {
        const report = reports.find(r => r.id === reportId)
        if (report?.orders?.id && report.orders.refund_status === 'requested') {
          if (window.confirm('Approve refund? MWK ' + (report.orders.total||0).toLocaleString())) {
            await supabase.from('orders').update({ refund_status: 'approved' }).eq('id', report.orders.id)
            setReports(prev => prev.map(r => r.id === reportId ? { ...r, orders: { ...r.orders, refund_status: 'approved' } } : r))
          }
        }
      }
    }
  }

  async function toggleVendorVerified(id, current) {
    const { error } = await supabase.from('vendors').update({ verified: !current }).eq('id', id)
    if (!error) setVendors(prev => prev.map(v => v.id === id ? { ...v, verified: !current } : v))
  }

  if (authLoading) return <div className="loading" style={{minHeight:'60vh'}}><div className="spinner"/><span>Loading...</span></div>
  if (!user || !isAdmin) return null

  const openDisputes = disputes.filter(d => d.status === 'open' || d.status === 'under_review')
  const pendingPayouts = payoutRequests.filter(p => p.status === 'pending')

  return (
    <div className="dash-page">
      <div className="dash-layout">
        <aside className="dash-sidebar">
          <div className="dash-user"><div className="dash-avatar">🛡️</div><div className="dash-user-name">Admin Panel</div></div>
          {[
            { id:'reports', icon:'🚨', label:'Reports' },
            { id:'disputes', icon:'⚖️', label:`Disputes${openDisputes.length?` (${openDisputes.length})`:''}` },
            { id:'payouts', icon:'💰', label:`Payouts${pendingPayouts.length?` (${pendingPayouts.length})`:''}` },
            { id:'vendors', icon:'🏪', label:'Vendors' },
            { id:'stats', icon:'📊', label:'Stats' },
          ].map(item => (
            <div key={item.id} className={`dash-nav-item${tab===item.id?' active':''}`} onClick={() => setTab(item.id)}>
              <span>{item.icon}</span>{item.label}
            </div>
          ))}
          <div className="dash-nav-item" onClick={() => navigate('/dashboard')}><span>←</span>Back</div>
        </aside>

        <main className="dash-main">
          {loading ? <div className="loading"><div className="spinner"/><span>Loading...</span></div> : (<>

            {tab === 'stats' && (
              <div>
                <h2 className="dash-title">📊 Platform Stats</h2>
                <div className="dash-cards">
                  <div className="dash-card"><div className="dash-card-label">Total Orders</div><div className="dash-card-val">{stats.orders}</div></div>
                  <div className="dash-card"><div className="dash-card-label">Active Vendors</div><div className="dash-card-val">{stats.vendors}</div></div>
                  <div className="dash-card"><div className="dash-card-label">Total Revenue</div><div className="dash-card-val" style={{fontSize:'14px'}}>MWK {stats.revenue.toLocaleString()}</div></div>
                  <div className="dash-card"><div className="dash-card-label">Open Disputes</div><div className="dash-card-val" style={{color:openDisputes.length?'#ef4444':'#22c55e'}}>{openDisputes.length}</div></div>
                  <div className="dash-card"><div className="dash-card-label">Pending Payouts</div><div className="dash-card-val" style={{color:pendingPayouts.length?'#f59e0b':'#22c55e'}}>{pendingPayouts.length}</div></div>
                </div>
              </div>
            )}

            {tab === 'disputes' && (
              <div style={{display:'flex',height:'calc(100vh - 80px)',overflow:'hidden',margin:'-24px'}}>
                <div style={{width:'260px',borderRight:'1.5px solid var(--border)',overflowY:'auto',flexShrink:0}}>
                  <div style={{padding:'14px 16px',borderBottom:'1.5px solid var(--border)',fontWeight:800,fontSize:'14px'}}>⚖️ All Disputes</div>
                  {disputes.length === 0 && <div style={{padding:'24px',textAlign:'center',color:'var(--gray)',fontSize:'13px'}}>No disputes</div>}
                  {disputes.map(d => (
                    <div key={d.id} onClick={() => setActiveDispute(d)}
                      style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:activeDispute?.id===d.id?'var(--wolf-light)':'white',borderLeft:activeDispute?.id===d.id?'3px solid var(--wolf)':'3px solid transparent'}}>
                      <div style={{fontWeight:700,fontSize:'12px',marginBottom:'2px'}}>{d.orders?.products?.icon} {d.orders?.products?.name||'Order'}</div>
                      <div style={{fontSize:'11px',color:'var(--gray)',marginBottom:'4px'}}>{d.reason}</div>
                      <span style={{fontSize:'10px',fontWeight:700,padding:'2px 7px',borderRadius:'20px',background:d.status==='resolved'?'#dcfce7':d.status==='open'?'#fee2e2':'#fef9c3',color:d.status==='resolved'?'#166534':d.status==='open'?'#991b1b':'#854d0e'}}>{d.status}</span>
                    </div>
                  ))}
                </div>
                {activeDispute ? (
                  <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
                    <div style={{padding:'12px 20px',borderBottom:'1.5px solid var(--border)',background:'white',display:'flex',justifyContent:'space-between',alignItems:'center',flexShrink:0}}>
                      <div>
                        <div style={{fontWeight:800,fontSize:'14px'}}>{activeDispute.orders?.products?.name}</div>
                        <div style={{fontSize:'12px',color:'var(--gray)'}}>{activeDispute.reason}</div>
                      </div>
                      <div style={{display:'flex',gap:'6px'}}>
                        {activeDispute.status==='open' && <button className="mini-btn" style={{background:'#fef9c3',border:'1px solid #fde68a',borderRadius:'6px',padding:'4px 10px',cursor:'pointer',fontSize:'12px',fontWeight:700}} onClick={()=>updateDisputeStatus(activeDispute.id,'under_review')}>🔍 Review</button>}
                        {activeDispute.status!=='resolved' && <button className="mini-btn confirm" onClick={()=>updateDisputeStatus(activeDispute.id,'resolved')}>✅ Resolve</button>}
                        {activeDispute.status!=='closed' && <button className="mini-btn report" onClick={()=>updateDisputeStatus(activeDispute.id,'closed')}>Close</button>}
                      </div>
                    </div>
                    <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'10px',background:'#f9fafb'}}>
                      {disputeMsgs.map(m => (
                        <div key={m.id} style={{display:'flex',justifyContent:m.sender_role==='admin'?'flex-end':'flex-start'}}>
                          <div style={{maxWidth:'70%',padding:'10px 14px',borderRadius:'12px',background:m.sender_role==='admin'?'#1e293b':m.sender_role==='buyer'?'white':'var(--wolf)',color:m.sender_role==='admin'||m.sender_role==='vendor'?'white':'var(--black)',fontSize:'13px',boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
                            <div style={{fontSize:'10px',opacity:.7,marginBottom:'3px'}}>{m.sender_role==='admin'?'🛡️ You (Admin)':m.sender_role==='vendor'?'🏪 Vendor':'👤 Buyer'}</div>
                            {m.text}
                            <div style={{fontSize:'10px',opacity:.6,marginTop:'4px',textAlign:'right'}}>{new Date(m.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div style={{padding:'12px 16px',borderTop:'1.5px solid var(--border)',background:'white',display:'flex',gap:'8px',flexShrink:0}}>
                      <textarea value={adminReply} onChange={e=>setAdminReply(e.target.value)}
                        onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendAdminReply()}}}
                        placeholder="Reply as Wolf Support..." rows={1}
                        style={{flex:1,border:'1.5px solid var(--border)',borderRadius:'10px',padding:'10px 14px',fontSize:'13px',fontFamily:'Inter,sans-serif',outline:'none',resize:'none'}}/>
                      <button onClick={sendAdminReply} style={{background:'#1e293b',color:'white',border:'none',borderRadius:'10px',width:'42px',height:'42px',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>➤</button>
                    </div>
                  </div>
                ) : <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gray)',fontSize:'14px'}}>Select a dispute</div>}
              </div>
            )}

            {tab === 'payouts' && (
              <div>
                <h2 className="dash-title">💰 Payout Requests</h2>
                {payoutRequests.length === 0
                  ? <div className="empty-state"><div className="empty-icon">💰</div><h3>No payout requests yet</h3></div>
                  : <div className="orders-list">
                      {payoutRequests.map(p => (
                        <div key={p.id} className="order-row" style={{flexWrap:'wrap',gap:'8px'}}>
                          <span className="order-icon">🏦</span>
                          <div className="order-info" style={{flex:1}}>
                            <div className="order-name">{p.vendors?.name}</div>
                            <div className="order-meta">MWK {(p.amount||0).toLocaleString()} → {p.vendors?.payout_network?.toUpperCase()} {p.vendors?.payout_phone}</div>
                            <div className="order-meta">{new Date(p.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
                          </div>
                          <div className="order-actions-col">
                            <div className={`status-chip ${p.status==='paid'?'confirmed':p.status==='pending'?'pending':'cancelled'}`}>{p.status}</div>
                            {p.status === 'pending' && (<>
                              <button className="mini-btn confirm" onClick={()=>updatePayoutStatus(p.id,'paid')}>✅ Mark Paid</button>
                              <button className="mini-btn report" onClick={()=>updatePayoutStatus(p.id,'rejected')}>Reject</button>
                            </>)}
                          </div>
                        </div>
                      ))}
                    </div>
                }
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
                            <div className="order-name">{r.reason.replace(/_/g,' ')} — {r.orders?.products?.name||'Order'}</div>
                            <div className="order-meta">By {r.profiles?.full_name||'User'} · {new Date(r.created_at).toLocaleDateString()}</div>
                            {r.details && <div className="order-meta" style={{marginTop:'4px',fontStyle:'italic'}}>"{r.details}"</div>}
                          </div>
                          <div className="order-actions-col">
                            <div className={`status-chip ${r.status}`}>{r.status}</div>
                            {r.status==='open' && (<>
                              <button className="mini-btn confirm" onClick={()=>updateReportStatus(r.id,'reviewing')}>Reviewing</button>
                              <button className="mini-btn confirm" onClick={()=>updateReportStatus(r.id,'resolved')}>Resolve</button>
                              <button className="mini-btn report" onClick={()=>updateReportStatus(r.id,'dismissed')}>Dismiss</button>
                            </>)}
                            {r.status==='reviewing' && (<>
                              <button className="mini-btn confirm" onClick={()=>updateReportStatus(r.id,'resolved')}>Resolve</button>
                              <button className="mini-btn report" onClick={()=>updateReportStatus(r.id,'dismissed')}>Dismiss</button>
                            </>)}
                            {r.orders?.refund_status && r.orders.refund_status!=='none' && (
                              <div className={`status-chip ${r.orders.refund_status==='approved'?'confirmed':'pending'}`} style={{fontSize:'11px'}}>Refund: {r.orders.refund_status}</div>
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
                      <span className="order-icon">{v.icon||'🏪'}</span>
                      <div className="order-info">
                        <div className="order-name">{v.name}</div>
                        <div className="order-meta">{v.university} · {v.category}</div>
                      </div>
                      <div className="order-actions-col">
                        <div className={`status-chip ${v.verified?'confirmed':'pending'}`}>{v.verified?'✅ Verified':'Unverified'}</div>
                        <button className={`mini-btn ${v.verified?'report':'confirm'}`} onClick={()=>toggleVendorVerified(v.id,v.verified)}>{v.verified?'Unverify':'Verify'}</button>
                        <button className="mini-btn confirm" onClick={()=>navigate(`/vendors/${v.id}`)}>View Store</button>
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

          </>)}
        </main>
      </div>
    </div>
  )
}
