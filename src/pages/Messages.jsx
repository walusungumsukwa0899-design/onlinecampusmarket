import { useEffect, useState, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Footer from '../components/Footer'

export default function Messages() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, loading: authLoading } = useAuth()

  const [conversations, setConversations] = useState([])
  const [activeVendorId, setActiveVendorId] = useState(searchParams.get('vendor') || null)
  const [activeVendor, setActiveVendor] = useState(null)
  const [messages, setMessages] = useState([])
  const [newMsg, setNewMsg] = useState('')
  const [sending, setSending] = useState(false)
  const [loading, setLoading] = useState(true)
  const [myVendor, setMyVendor] = useState(null)
  const messagesEndRef = useRef(null)
  const realtimeRef = useRef(null)
  // Rate limiting: max 3 messages per 5 seconds
  const lastSentTimestamps = useRef([])
  const [rateLimited, setRateLimited] = useState(false)
  const rateLimitTimer = useRef(null)

  useEffect(() => {
    if (authLoading) return
    if (!user) { navigate('/signin'); return }
    loadConversations()
    // Check if user is a vendor
    supabase.from('vendors').select('id,name').eq('user_id', user.id).maybeSingle()
      .then(({ data }) => setMyVendor(data || null))
  }, [user, authLoading])

  useEffect(() => {
    if (activeVendorId) loadMessages(activeVendorId)
  }, [activeVendorId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Realtime subscription for active conversation
  useEffect(() => {
    if (!activeVendorId || !user) return
    realtimeRef.current?.unsubscribe()
    realtimeRef.current = supabase
      .channel(`messages-${activeVendorId}-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'messages',
        filter: `vendor_id=eq.${activeVendorId}`
      }, payload => {
        const msg = payload.new
        if (msg.buyer_id === user.id || (myVendor && msg.vendor_id === myVendor?.id)) {
          setMessages(prev => {
            if (prev.find(m => m.id === msg.id)) return prev
            return [...prev, msg]
          })
        }
      })
      .subscribe()
    return () => realtimeRef.current?.unsubscribe()
  }, [activeVendorId, user, myVendor])

  async function loadConversations() {
    setLoading(true)
    try {
      // Load all unique conversations for this user (as buyer)
      const { data: buyerMsgs } = await supabase
        .from('messages')
        .select('vendor_id, vendors(id, name, avatar_url, icon, university), created_at, text, read, sender')
        .eq('buyer_id', user.id)
        .order('created_at', { ascending: false })

      // Load vendor conversations if user is a vendor
      let vendorMsgs = []
      if (myVendor) {
        const { data } = await supabase
          .from('messages')
          .select('buyer_id, profiles(id, full_name, avatar_url), created_at, text, read, sender')
          .eq('vendor_id', myVendor.id)
          .order('created_at', { ascending: false })
        vendorMsgs = data || []
      }

      // Deduplicate by vendor_id (take most recent per vendor)
      const convMap = new Map()
      for (const m of (buyerMsgs || [])) {
        if (!convMap.has(m.vendor_id)) {
          convMap.set(m.vendor_id, {
            type: 'buyer',
            vendorId: m.vendor_id,
            vendor: m.vendors,
            lastMsg: m.text,
            lastTime: m.created_at,
            unread: !m.read && m.sender === 'vendor'
          })
        }
      }
      setConversations([...convMap.values()])

      // Auto-select first or URL param
      if (activeVendorId) {
        const v = convMap.get(activeVendorId)
        if (v) setActiveVendor(v.vendor)
        else {
          // Fetch vendor info even if no prior messages
          const { data: vd } = await supabase.from('vendors').select('id,name,avatar_url,icon,university').eq('id', activeVendorId).maybeSingle()
          if (vd) setActiveVendor(vd)
        }
      } else if (convMap.size > 0) {
        const first = [...convMap.values()][0]
        setActiveVendorId(first.vendorId)
        setActiveVendor(first.vendor)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function loadMessages(vendorId) {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('vendor_id', vendorId)
      .eq('buyer_id', user.id)
      .order('created_at', { ascending: true })
    setMessages(data || [])
    // Mark vendor messages as read
    await supabase.from('messages').update({ read: true })
      .eq('vendor_id', vendorId).eq('buyer_id', user.id).eq('sender', 'vendor').eq('read', false)
  }

  async function sendMessage() {
    if (!newMsg.trim() || !activeVendorId || sending || rateLimited) return

    // Rate limiting: max 3 messages per 5 seconds
    const now = Date.now()
    lastSentTimestamps.current = lastSentTimestamps.current.filter(t => now - t < 5000)
    if (lastSentTimestamps.current.length >= 3) {
      setRateLimited(true)
      clearTimeout(rateLimitTimer.current)
      rateLimitTimer.current = setTimeout(() => setRateLimited(false), 5000)
      return
    }
    lastSentTimestamps.current.push(now)

    setSending(true)
    const msgData = {
      vendor_id: activeVendorId,
      buyer_id: user.id,
      text: newMsg.trim(),
      sender: 'buyer',
    }
    const { data, error } = await supabase.from('messages').insert(msgData).select().single()
    if (!error && data) {
      setMessages(prev => [...prev, data])
      setNewMsg('')
      // Notify vendor via edge function
      supabase.functions.invoke('notify-new-message', {
        body: { vendorId: activeVendorId, buyerId: user.id, message: newMsg.trim() }
      }).catch(() => {})
    }
    setSending(false)
  }

  function selectConversation(conv) {
    setActiveVendorId(conv.vendorId)
    setActiveVendor(conv.vendor)
  }

  if (authLoading || loading) {
    return <div className="loading" style={{ paddingTop: '80px' }}><div className="spinner" /><span>Loading messages...</span></div>
  }

  return (
    <div style={{ display: 'flex', height: '100vh', paddingTop: '64px', overflow: 'hidden' }}>
      {/* Sidebar */}
      <div style={{
        width: activeVendorId ? '280px' : '100%',
        borderRight: '1.5px solid var(--border)',
        overflowY: 'auto',
        background: 'white',
        flexShrink: 0,
        display: activeVendorId ? 'block' : 'block'
      }} className="msgs-sidebar">
        <div style={{ padding: '16px', borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button onClick={() => navigate(-1)} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>←</button>
          <h2 style={{ fontWeight: 900, fontSize: '16px' }}>💬 Messages</h2>
        </div>
        {conversations.length === 0 ? (
          <div className="empty-state" style={{ padding: '40px 20px' }}>
            <div className="empty-icon">💬</div>
            <h3 style={{ fontSize: '16px' }}>No conversations yet</h3>
            <p>Message a vendor from their store page or a product page</p>
            <button className="btn-primary" style={{ marginTop: '12px', fontSize: '13px', padding: '10px 18px' }} onClick={() => navigate('/vendors')}>Browse Vendors</button>
          </div>
        ) : (
          conversations.map(conv => (
            <div key={conv.vendorId} onClick={() => selectConversation(conv)}
              style={{ padding: '14px 16px', borderBottom: '1px solid var(--border)', cursor: 'pointer', background: activeVendorId === conv.vendorId ? 'var(--wolf-light)' : 'white', borderLeft: activeVendorId === conv.vendorId ? '3px solid var(--wolf)' : '3px solid transparent', transition: 'all .15s' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--wolf)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '16px', flexShrink: 0, overflow: 'hidden' }}>
                  {conv.vendor?.avatar_url ? <img src={conv.vendor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (conv.vendor?.name?.[0] || '🏪')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: conv.unread ? 800 : 600, fontSize: '13px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{conv.vendor?.name || 'Vendor'}</div>
                  <div style={{ fontSize: '11px', color: 'var(--gray)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>{conv.lastMsg}</div>
                </div>
                {conv.unread && <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'var(--wolf)', flexShrink: 0 }} />}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Chat window */}
      {activeVendorId && (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          {/* Chat header */}
          <div style={{ padding: '12px 16px', borderBottom: '1.5px solid var(--border)', display: 'flex', alignItems: 'center', gap: '12px', background: 'white', flexShrink: 0 }}>
            <button onClick={() => { setActiveVendorId(null); setActiveVendor(null) }}
              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', display: 'none' }} className="msg-back-btn">←</button>
            <div onClick={() => navigate(`/vendors/${activeVendorId}`)}
              style={{ width: '38px', height: '38px', borderRadius: '50%', background: 'var(--wolf)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, overflow: 'hidden', cursor: 'pointer', flexShrink: 0 }}>
              {activeVendor?.avatar_url ? <img src={activeVendor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (activeVendor?.name?.[0] || '🏪')}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '14px', cursor: 'pointer' }} onClick={() => navigate(`/vendors/${activeVendorId}`)}>{activeVendor?.name || 'Vendor'}</div>
              <div style={{ fontSize: '11px', color: 'var(--gray)' }}>{activeVendor?.university}</div>
            </div>
            <button onClick={() => navigate(`/vendors/${activeVendorId}`)}
              style={{ marginLeft: 'auto', background: 'var(--light)', border: 'none', borderRadius: '8px', padding: '6px 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer' }}>View Store →</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px', background: '#f9fafb' }}>
            {messages.length === 0 && (
              <div style={{ textAlign: 'center', color: 'var(--gray)', fontSize: '13px', marginTop: '40px' }}>
                <div style={{ fontSize: '40px', marginBottom: '8px' }}>👋</div>
                Say hi to {activeVendor?.name || 'the vendor'}!
              </div>
            )}
            {messages.map(m => {
              const isMine = m.sender === 'buyer'
              return (
                <div key={m.id} style={{ display: 'flex', justifyContent: isMine ? 'flex-end' : 'flex-start' }}>
                  <div style={{
                    maxWidth: '70%', padding: '10px 14px', borderRadius: isMine ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                    background: isMine ? 'var(--wolf)' : 'white', color: isMine ? 'white' : 'var(--black)',
                    fontSize: '13px', lineHeight: 1.5, boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
                  }}>
                    {m.text}
                    <div style={{ fontSize: '10px', opacity: 0.65, marginTop: '4px', textAlign: 'right' }}>
                      {new Date(m.created_at).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Rate limit warning */}
          {rateLimited && (
            <div style={{ padding: '6px 16px', background: '#fff7ed', borderTop: '1px solid #fed7aa', fontSize: '12px', color: '#92400e', display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
              ⏱️ Slow down — you can send 3 messages every 5 seconds.
            </div>
          )}
          {/* Input */}
          <div style={{ padding: '12px 16px', borderTop: '1.5px solid var(--border)', background: 'white', display: 'flex', gap: '10px', alignItems: 'flex-end', flexShrink: 0 }}>
            <textarea
              value={newMsg}
              onChange={e => setNewMsg(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder={rateLimited ? 'Too many messages — wait a moment…' : 'Type a message...'}
              rows={1}
              disabled={rateLimited}
              style={{ flex: 1, border: `1.5px solid ${rateLimited ? '#fed7aa' : 'var(--border)'}`, borderRadius: '10px', padding: '10px 14px', fontSize: '14px', fontFamily: 'Inter,sans-serif', outline: 'none', resize: 'none', maxHeight: '100px', overflowY: 'auto', opacity: rateLimited ? 0.6 : 1 }}
            />
            <button onClick={sendMessage} disabled={sending || !newMsg.trim() || rateLimited}
              style={{ background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '10px', width: '42px', height: '42px', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, opacity: (!newMsg.trim() || sending || rateLimited) ? 0.5 : 1 }}>
              ➤
            </button>
          </div>
        </div>
      )}

      <style>{`
        @media(max-width:600px) {
          .msgs-sidebar { width: 100% !important; display: ${activeVendorId ? 'none' : 'block'} !important; }
          .msg-back-btn { display: flex !important; }
        }
      `}</style>
    </div>
  )
}
