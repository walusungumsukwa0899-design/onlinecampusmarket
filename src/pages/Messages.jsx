import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import './Messages.css'

export default function Messages() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading, isOnline } = useAuth()

  const [conversations, setConversations] = useState([])
  const [activeConv, setActiveConv] = useState(null) // { vendorId, buyerId, type:'buyer'|'vendor', vendor, buyer }
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [myVendor, setMyVendor] = useState(undefined) // undefined=unchecked, null=not a vendor, object=is vendor
  const [otherLastSeen, setOtherLastSeen] = useState(null)
  const messagesEndRef = useRef(null)
  const realtimeRef = useRef(null)

  // Whichever user is on "the other side" of the active conversation
  const otherUserId = activeConv
    ? (activeConv.type === 'buyer' ? activeConv.vendor?.user_id : activeConv.buyerId)
    : null
  const otherIsOnline = otherUserId ? isOnline(otherUserId) : false

  // Fetch last_seen for the other participant whenever the active conversation changes
  useEffect(() => {
    if (!otherUserId) { setOtherLastSeen(null); return }
    supabase.from('profiles').select('last_seen').eq('id', otherUserId).maybeSingle()
      .then(({ data }) => setOtherLastSeen(data?.last_seen || null))
  }, [otherUserId])

  function formatLastSeen(iso) {
    if (!iso) return 'Offline'
    const diffMs = Date.now() - new Date(iso).getTime()
    const mins = Math.floor(diffMs / 60000)
    if (mins < 1) return 'Last seen just now'
    if (mins < 60) return `Last seen ${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `Last seen ${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days < 7) return `Last seen ${days}d ago`
    return `Last seen ${new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`
  }

  // Load vendor profile first, then conversations
  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/signin'); return }
    supabase.from('vendors').select('id,name,avatar_url').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => { setMyVendor(data ?? null) })
  }, [user, authLoading])

  // Load conversations once we know vendor status (myVendor is null=not a vendor, undefined=not checked yet)
  useEffect(() => {
    if (!user || authLoading || myVendor === undefined) return
    loadConversations(myVendor)
  }, [user, myVendor, authLoading])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime for active conversation
  useEffect(() => {
    if (!activeConv || !user) return
    if (realtimeRef.current) supabase.removeChannel(realtimeRef.current)
    const ch = supabase
      .channel(`msgs-${activeConv.vendorId}-${activeConv.buyerId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `vendor_id=eq.${activeConv.vendorId}`
      }, payload => {
        const msg = payload.new
        // Only show if it belongs to this conversation
        if (msg.buyer_id === activeConv.buyerId) {
          setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])
        }
      })
      .subscribe()
    realtimeRef.current = ch
    return () => { supabase.removeChannel(ch) }
  }, [activeConv, user])

  async function loadConversations(vendor) {
    setLoading(true)
    try {
      const convMap = new Map()

      // Buyer side: conversations where user is the buyer
      const { data: buyerMsgs, error: buyerMsgsErr } = await supabase
        .from('messages')
        .select('vendor_id, buyer_id, vendors(id,name,avatar_url,icon,university,user_id), created_at, text, read, sender')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      if (buyerMsgsErr) console.error('buyerMsgs error:', buyerMsgsErr)

      for (const m of (buyerMsgs || [])) {
        const key = `buyer-${m.vendor_id}`
        if (!convMap.has(key)) {
          convMap.set(key, {
            key, type: 'buyer',
            vendorId: m.vendor_id, buyerId: user.id,
            vendor: m.vendors, buyer: null,
            label: m.vendors?.name || 'Vendor',
            avatar: m.vendors?.avatar_url,
            lastMsg: m.text, lastTime: m.created_at,
            unread: !m.read && m.sender === 'vendor'
          })
        }
      }

      // Vendor side: conversations where user is the vendor
      if (vendor) {
        // Note: no FK exists between messages.buyer_id and profiles.id
        // (buyer_id only references auth.users), so profiles can't be
        // embedded in this query — fetch messages and profiles separately.
        const { data: vendorMsgs, error: vendorMsgsErr } = await supabase
          .from('messages')
          .select('vendor_id, buyer_id, created_at, text, read, sender')
          .eq('vendor_id', vendor.id)
          .order('created_at', { ascending: false })

        if (vendorMsgsErr) console.error('vendorMsgs error:', vendorMsgsErr)

        const buyerIds = [...new Set((vendorMsgs || []).map(m => m.buyer_id))]
        let profilesById = {}
        if (buyerIds.length > 0) {
          const { data: buyerProfiles, error: profilesErr } = await supabase
            .from('profiles')
            .select('id,full_name,avatar_url')
            .in('id', buyerIds)
          if (profilesErr) console.error('buyerProfiles error:', profilesErr)
          profilesById = Object.fromEntries((buyerProfiles || []).map(p => [p.id, p]))
        }

        for (const m of (vendorMsgs || [])) {
          const key = `vendor-${m.buyer_id}`
          if (!convMap.has(key)) {
            const buyerProfile = profilesById[m.buyer_id] || null
            convMap.set(key, {
              key, type: 'vendor',
              vendorId: vendor.id, buyerId: m.buyer_id,
              vendor: null, buyer: buyerProfile,
              label: buyerProfile?.full_name || 'Customer',
              avatar: buyerProfile?.avatar_url,
              lastMsg: m.text, lastTime: m.created_at,
              unread: !m.read && m.sender === 'buyer'
            })
          }
        }
      }

      const convList = [...convMap.values()].sort((a, b) => new Date(b.lastTime) - new Date(a.lastTime))
      setConversations(convList)

      // Auto-select from URL param or first conversation
      const urlVendor = searchParams.get('vendor')
      const urlPrefill = searchParams.get('prefill')
      if (urlVendor && myVendor?.id === urlVendor) {
        // Vendors can't message their own store
        navigate('/messages', { replace: true })
      } else if (urlVendor) {
        const match = convList.find(c => c.vendorId === urlVendor && c.type === 'buyer')
          || convList.find(c => c.vendorId === urlVendor)
        if (match) selectConversation(match)
        else {
          // New conversation with this vendor
          const { data: vd } = await supabase.from('vendors').select('id,name,avatar_url,icon,university,avg_rating,user_id').eq('id', urlVendor).maybeSingle()
          if (vd) {
            const newConv = { key: `buyer-${urlVendor}`, type: 'buyer', vendorId: urlVendor, buyerId: user.id, vendor: vd, buyer: null, label: vd.name, avatar: vd.avatar_url, lastMsg: '', lastTime: new Date().toISOString(), unread: false }
            setActiveConv(newConv)
          }
        }
        if (urlPrefill) setNewMsg(urlPrefill)
      }
      // No urlVendor: land on the conversation list rather than
      // re-opening whichever chat was last active.
    } catch (err) {
      console.error('loadConversations error:', err)
    } finally {
      setLoading(false)
    }
  }

  async function selectConversation(conv) {
    setActiveConv(conv)
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('vendor_id', conv.vendorId)
      .eq('buyer_id', conv.buyerId)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    // Mark unread messages as read
    const unreadSender = conv.type === 'buyer' ? 'vendor' : 'buyer'
    await supabase.from('messages').update({ read: true })
      .eq('vendor_id', conv.vendorId).eq('buyer_id', conv.buyerId)
      .eq('sender', unreadSender).eq('read', false)
    setConversations(prev => prev.map(c => c.key === conv.key ? { ...c, unread: false } : c))
  }

  async function sendMessage() {
    if (!newMsg.trim() || !activeConv || sending) return
    if (activeConv.type === 'buyer' && myVendor && activeConv.vendorId === myVendor.id) {
      alert("You can't message your own store.")
      return
    }
    const now = Date.now()
    const key = `wolf_msg_times_${activeConv.vendorId}_${activeConv.buyerId}`
    let times = []
    try { times = JSON.parse(sessionStorage.getItem(key) || '[]') } catch {}
    times = times.filter(t => now - t < 60000)
    if (times.length >= 5) { alert('Please wait a moment before sending more messages.'); return }
    times.push(now); sessionStorage.setItem(key, JSON.stringify(times))

    setSending(true)
    const sender = activeConv.type === 'buyer' ? 'buyer' : 'vendor'
    const msgData = { vendor_id: activeConv.vendorId, buyer_id: activeConv.buyerId, text: newMsg.trim(), sender }
    const optimistic = { ...msgData, id: `opt-${Date.now()}`, created_at: new Date().toISOString() }
    setMessages(prev => [...prev, optimistic])
    setNewMsg('')
    const { data, error } = await supabase.from('messages').insert(msgData).select().single()
    if (error) {
      setMessages(prev => prev.filter(m => m.id !== optimistic.id))
      setNewMsg(msgData.text)
      alert(`Message failed: ${error.message}`)
    } else if (data) {
      setMessages(prev => prev.map(m => m.id === optimistic.id ? data : m))
      supabase.functions.invoke('notify-new-message', {
        body: { record: { vendor_id: data.vendor_id, buyer_id: data.buyer_id, sender: data.sender, text: data.text } }
      }).catch(() => {})
    }
    setSending(false)
  }

  async function deleteConversation(conv, e) {
    if (e) e.stopPropagation()
    if (!confirm(`Delete this conversation with ${conv.label}? This cannot be undone.`)) return
    const { error } = await supabase.from('messages').delete()
      .eq('vendor_id', conv.vendorId).eq('buyer_id', conv.buyerId)
    if (error) { alert('Could not delete conversation: ' + error.message); return }
    setConversations(prev => prev.filter(c => c.key !== conv.key))
    if (activeConv?.key === conv.key) { setActiveConv(null); setMessages([]) }
  }

  if (authLoading || loading) {
    return <div className="loading" style={{ paddingTop: '80px' }}><div className="spinner" /><span>Loading messages...</span></div>
  }

  const isMineMsg = (m) => {
    if (!activeConv) return false
    return activeConv.type === 'buyer' ? m.sender === 'buyer' : m.sender === 'vendor'
  }

  return (
    <div className="msgs-page">
      {/* Sidebar */}
      <div style={{ width: activeConv ? '280px' : '100%', borderRight: '1.5px solid var(--border)', overflowY: 'auto', background: 'white', flexShrink: 0 }} className="msgs-sidebar">
        <div style={{ padding: '16px', borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontWeight: 900, fontSize: '16px' }}>💬 Messages</h2>
        </div>
        {conversations.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-icon">💬</div>
            <h3 style={{ fontSize: '16px' }}>No conversations yet</h3>
            <p>Message a vendor from their store page</p>
            <button className="btn-primary" style={{ marginTop: '12px', fontSize: '13px', padding: '10px 18px' }} onClick={() => navigate('/vendors')}>Browse Vendors</button>
          </div>
        ) : (
          conversations.map(conv => (
            <div key={conv.key} onClick={() => selectConversation(conv)}
              style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: activeConv?.key === conv.key ? 'var(--wolf-light)' : 'white', borderLeft: activeConv?.key === conv.key ? '3px solid var(--wolf)' : '3px solid transparent', transition: 'all .15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--wolf)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '16px', flexShrink: 0, overflow: 'hidden' }}>
                  {conv.avatar ? <img src={conv.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (conv.label?.[0] || '?')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ fontWeight: conv.unread ? 800 : 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.label}</div>
                    {conv.type === 'vendor' && <span style={{ fontSize: '10px', background: 'var(--wolf)', color: 'white', borderRadius: '4px', padding: '1px 5px', fontWeight: 700 }}>Customer</span>}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{conv.lastMsg}</div>
                </div>
                {conv.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--wolf)', flexShrink: 0 }} />}
                <button onClick={(e) => deleteConversation(conv, e)} title="Delete conversation"
                  style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: '15px', cursor: 'pointer', flexShrink: 0, padding: '4px', borderRadius: '6px', lineHeight: 1 }}>
                  🗑️
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat window */}
      {activeConv && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'white', flexShrink: 0 }}>
            <button onClick={() => setActiveConv(null)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', display: 'none' }} className="msg-back-btn">←</button>
            <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--wolf)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, overflow: 'hidden', flexShrink: 0 }}>
              {activeConv.avatar ? <img src={activeConv.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (activeConv.label?.[0] || '?')}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '14px' }}>{activeConv.label}</div>
              <div style={{ fontSize: '11px', color: otherIsOnline ? 'var(--green)' : 'var(--gray)', fontWeight: otherIsOnline ? 700 : 400 }}>
                {otherIsOnline ? '🟢 Online' : formatLastSeen(otherLastSeen)}
              </div>
            </div>
            {activeConv.type === 'buyer' && (
              <button onClick={() => navigate(`/vendors/${activeConv.vendorId}`)}
                style={{ background: 'var(--light)', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>View Store →</button>
            )}
            <button onClick={() => deleteConversation(activeConv)} title="Delete conversation"
              style={{ background: 'none', border: 'none', color: 'var(--gray)', fontSize: '17px', cursor: 'pointer', padding: '4px' }}>
              🗑️
            </button>
          </div>

          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f9fafb' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--gray)', fontSize: '13px', marginTop: '40px' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>👋</div>
                Start the conversation!
              </div>
            )}
            {messages.map(m => {
              const mine = isMineMsg(m)
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
                  <div style={{ maxWidth: '70%', padding: '10px 14px', borderRadius: mine ? '14px 14px 4px 14px' : '14px 14px 14px 4px', background: mine ? 'var(--wolf)' : 'white', color: mine ? 'white' : 'var(--black)', fontSize: '13px', lineHeight: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
                    {m.text}
                    <div style={{ fontSize: '10px', opacity: 0.65, marginTop: '4px', textAlign: 'right', display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                      {mine && <span title={otherIsOnline ? 'Online' : 'Offline'}>{otherIsOnline ? '✓✓' : '✓'}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          <div style={{ padding: '12px 16px', borderTop: '1.5px solid var(--border)', background: 'white', display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0 }}>
            <textarea value={newMsg} onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="Type a message..." rows={1}
              style={{ flex: 1, border: '1.5px solid var(--border)', borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', resize: 'none', maxHeight: '100px', overflowY: 'auto' }} />
            <button onClick={sendMessage} disabled={sending || !newMsg.trim()}
              style={{ background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '10px', width: '42px', height: '42px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (!newMsg.trim() || sending) ? 0.5 : 1 }}>
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:600px) {
          .msgs-sidebar { width: 100% !important; display: ${activeConv ? 'none' : 'block'} !important; }
          .msg-back-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
