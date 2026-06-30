import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Footer from '../components/Footer'

const STATUS_LABELS = { open:'🔴 Open', under_review:'🟡 Under Review', resolved:'✅ Resolved', closed:'⚫ Closed' }

export default function Disputes() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [disputes, setDisputes] = useState([])
  const [active, setActive] = useState(null)
  const [messages, setMessages] = useState([])
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [newReason, setNewReason] = useState('')
  const [newDetails, setNewDetails] = useState('')
  const [newOrderId, setNewOrderId] = useState(searchParams.get('order') || '')
  const [myOrders, setMyOrders] = useState([])
  const [showNew, setShowNew] = useState(!!searchParams.get('order'))

  useEffect(() => {
    if (!user) { navigate('/signin'); return }
    load()
  }, [user])

  useEffect(() => {
    if (active) loadMessages(active.id)
  }, [active])

  async function load() {
    const [{ data: disp }, { data: ords }] = await Promise.all([
      supabase.from('disputes').select('*, orders(id, total, products(name, icon)), vendors(name)').eq('buyer_id', user.id).order('created_at', { ascending: false }),
      supabase.from('orders').select('id, products(name, icon), total, created_at').eq('buyer_id', user.id).order('created_at', { ascending: false }).limit(20),
    ])
    setDisputes(disp || [])
    setMyOrders(ords || [])
    if (disp?.length && !active) setActive(disp[0])
    setLoading(false)
  }

  async function loadMessages(disputeId) {
    const { data } = await supabase.from('dispute_messages').select('*').eq('dispute_id', disputeId).order('created_at', { ascending: true })
    setMessages(data || [])
  }

  async function sendReply() {
    if (!reply.trim() || !active || sending) return
    setSending(true)
    const { data, error } = await supabase.from('dispute_messages').insert({
      dispute_id: active.id, sender_id: user.id, sender_role: 'buyer', text: reply.trim()
    }).select().single()
    if (!error && data) { setMessages(p => [...p, data]); setReply('') }
    setSending(false)
  }

  async function openDispute() {
    if (!newOrderId || !newReason || !newDetails.trim()) { alert('Fill all fields'); return }
    const { data, error } = await supabase.from('disputes').insert({
      buyer_id: user.id, order_id: newOrderId,
      reason: newReason, description: newDetails.trim(), status: 'open'
    }).select('*, orders(id, total, products(name, icon)), vendors(name)').single()
    if (error) { alert('Failed: ' + error.message); return }
    setDisputes(p => [data, ...p])
    setActive(data)
    setMessages([])
    setShowNew(false)
    setNewReason(''); setNewDetails(''); setNewOrderId('')
    // First message = opening statement
    await supabase.from('dispute_messages').insert({ dispute_id: data.id, sender_id: user.id, sender_role: 'buyer', text: newDetails.trim() })
    loadMessages(data.id)
  }

  if (loading) return <div className="loading" style={{paddingTop:'80px'}}><div className="spinner"/><span>Loading disputes...</span></div>

  return (
    <div style={{display:'flex',height:'100vh',paddingTop:'64px',overflow:'hidden'}}>
      {/* Sidebar */}
      <div style={{width:'280px',borderRight:'1.5px solid var(--border)',overflowY:'auto',background:'white',flexShrink:0}}>
        <div style={{padding:'14px 16px',borderBottom:'1.5px solid var(--border)',display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:'8px'}}>
            <button onClick={() => navigate(-1)} style={{background:'none',border:'none',fontSize:'18px',cursor:'pointer'}}>←</button>
            <h2 style={{fontWeight:900,fontSize:'15px',margin:0}}>⚖️ Disputes</h2>
          </div>
          <button onClick={() => setShowNew(v => !v)} style={{background:'var(--wolf)',color:'white',border:'none',borderRadius:'8px',padding:'6px 12px',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>+ New</button>
        </div>

        {showNew && (
          <div style={{padding:'14px 16px',borderBottom:'1.5px solid var(--border)',background:'#fff4ee'}}>
            <div style={{fontWeight:800,fontSize:'13px',marginBottom:'10px'}}>Open a Dispute</div>
            <select value={newOrderId} onChange={e => setNewOrderId(e.target.value)} className="form-input" style={{marginBottom:'8px',fontSize:'12px',padding:'8px'}}>
              <option value="">Select order...</option>
              {myOrders.map(o => <option key={o.id} value={o.id}>{o.products?.icon} {o.products?.name} — MWK {(o.total||0).toLocaleString()}</option>)}
            </select>
            <select value={newReason} onChange={e => setNewReason(e.target.value)} className="form-input" style={{marginBottom:'8px',fontSize:'12px',padding:'8px'}}>
              <option value="">Reason...</option>
              {['Item not delivered','Wrong item received','Item damaged','Vendor unresponsive','Quality not as described','Other'].map(r => <option key={r}>{r}</option>)}
            </select>
            <textarea value={newDetails} onChange={e => setNewDetails(e.target.value)} placeholder="Describe the issue in detail..." className="form-input" rows={3} style={{fontSize:'12px',padding:'8px',resize:'none',marginBottom:'8px'}}/>
            <button onClick={openDispute} className="btn-primary" style={{width:'100%',padding:'9px',fontSize:'13px'}}>Submit Dispute</button>
          </div>
        )}

        {disputes.length === 0 && !showNew ? (
          <div style={{padding:'32px 16px',textAlign:'center',color:'var(--gray)',fontSize:'13px'}}>
            <div style={{fontSize:'32px',marginBottom:'8px'}}>⚖️</div>
            No disputes yet
          </div>
        ) : disputes.map(d => (
          <div key={d.id} onClick={() => setActive(d)}
            style={{padding:'12px 16px',borderBottom:'1px solid var(--border)',cursor:'pointer',background:active?.id===d.id?'var(--wolf-light)':'white',borderLeft:active?.id===d.id?'3px solid var(--wolf)':'3px solid transparent'}}>
            <div style={{fontWeight:700,fontSize:'12px',marginBottom:'2px'}}>{d.orders?.products?.icon} {d.orders?.products?.name || 'Order'}</div>
            <div style={{fontSize:'11px',color:'var(--gray)',marginBottom:'4px'}}>{d.reason}</div>
            <div style={{fontSize:'10px',display:'inline-block',background:d.status==='resolved'?'#dcfce7':d.status==='open'?'#fee2e2':'#fef9c3',color:d.status==='resolved'?'#166534':d.status==='open'?'#991b1b':'#854d0e',padding:'2px 7px',borderRadius:'20px',fontWeight:700}}>
              {STATUS_LABELS[d.status] || d.status}
            </div>
          </div>
        ))}
      </div>

      {/* Chat */}
      {active ? (
        <div style={{flex:1,display:'flex',flexDirection:'column',overflow:'hidden'}}>
          <div style={{padding:'12px 20px',borderBottom:'1.5px solid var(--border)',background:'white',flexShrink:0}}>
            <div style={{fontWeight:800,fontSize:'14px'}}>{active.orders?.products?.icon} {active.orders?.products?.name}</div>
            <div style={{fontSize:'12px',color:'var(--gray)',marginTop:'2px',display:'flex',gap:'12px'}}>
              <span>{active.reason}</span>
              <span style={{fontWeight:700,color:active.status==='resolved'?'#22c55e':active.status==='open'?'#ef4444':'#f59e0b'}}>{STATUS_LABELS[active.status]}</span>
            </div>
          </div>
          <div style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'10px',background:'#f9fafb'}}>
            {messages.length === 0 && <div style={{textAlign:'center',color:'var(--gray)',fontSize:'13px',marginTop:'40px'}}>No messages yet. Add details to start the resolution process.</div>}
            {messages.map(m => {
              const isMine = m.sender_id === user.id
              return (
                <div key={m.id} style={{display:'flex',justifyContent:isMine?'flex-end':'flex-start'}}>
                  <div style={{maxWidth:'72%',padding:'10px 14px',borderRadius:isMine?'14px 14px 4px 14px':'14px 14px 14px 4px',background:m.sender_role==='admin'?'#1e293b':isMine?'var(--wolf)':'white',color:isMine||m.sender_role==='admin'?'white':'var(--black)',fontSize:'13px',boxShadow:'0 1px 4px rgba(0,0,0,.08)'}}>
                    {m.sender_role==='admin' && <div style={{fontSize:'10px',fontWeight:700,marginBottom:'4px',opacity:.75}}>🛡️ Wolf Support</div>}
                    {m.sender_role==='vendor' && <div style={{fontSize:'10px',fontWeight:700,marginBottom:'4px',opacity:.75}}>🏪 Vendor</div>}
                    {m.text}
                    <div style={{fontSize:'10px',opacity:.65,marginTop:'4px',textAlign:'right'}}>{new Date(m.created_at).toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'})}</div>
                  </div>
                </div>
              )
            })}
          </div>
          {active.status !== 'resolved' && active.status !== 'closed' && (
            <div style={{padding:'12px 16px',borderTop:'1.5px solid var(--border)',background:'white',display:'flex',gap:'8px',flexShrink:0}}>
              <textarea value={reply} onChange={e => setReply(e.target.value)}
                onKeyDown={e => { if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();sendReply()} }}
                placeholder="Add more details or respond..." rows={1}
                style={{flex:1,border:'1.5px solid var(--border)',borderRadius:'10px',padding:'10px 14px',fontSize:'14px',fontFamily:'Inter,sans-serif',outline:'none',resize:'none'}}/>
              <button onClick={sendReply} disabled={sending||!reply.trim()} style={{background:'var(--wolf)',color:'white',border:'none',borderRadius:'10px',width:'42px',height:'42px',fontSize:'18px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',opacity:(!reply.trim()||sending)?.5:1}}>➤</button>
            </div>
          )}
          {(active.status === 'resolved' || active.status === 'closed') && (
            <div style={{padding:'12px 20px',borderTop:'1.5px solid var(--border)',background:'#f0fdf4',textAlign:'center',fontSize:'13px',color:'#166534',fontWeight:700}}>✅ This dispute has been {active.status}. No further replies needed.</div>
          )}
        </div>
      ) : (
        <div style={{flex:1,display:'flex',alignItems:'center',justifyContent:'center',color:'var(--gray)',fontSize:'14px'}}>Select a dispute or open a new one</div>
      )}
    </div>
  )
}
