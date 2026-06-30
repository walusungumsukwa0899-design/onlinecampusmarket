import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'

const STEPS = [
  { id: 'profile',   icon: '🖼️', title: 'Add a store logo',       desc: 'Upload a photo or logo so buyers recognise your brand.',            check: v => !!v?.avatar_url },
  { id: 'product',   icon: '📦', title: 'List your first product', desc: 'Add at least one product to your store.',                           check: (v, p) => p > 0 },
  { id: 'payout',    icon: '💰', title: 'Set payout details',      desc: 'Add your Airtel Money or TNM Mpamba number to receive payments.',    check: v => !!v?.payout_phone },
  { id: 'phone',     icon: '📱', title: 'Add a WhatsApp number',   desc: 'Buyers use this to contact you. Make sure it\'s on WhatsApp.',       check: v => !!v?.phone },
  { id: 'delivery',  icon: '🚚', title: 'Set delivery info',       desc: 'Tell buyers how you deliver and how long it takes.',                  check: v => !!v?.delivery_time },
]

export default function Onboarding() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vendor, setVendor] = useState(null)
  const [productCount, setProductCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    if (!user) return
    load()
  }, [user])

  async function load() {
    const { data: v } = await supabase.from('vendors').select('*').eq('user_id', user.id).maybeSingle()
    if (v) {
      const { count } = await supabase.from('products').select('id', { count: 'exact', head: true }).eq('vendor_id', v.id)
      setProductCount(count || 0)
    }
    setVendor(v || null)
    setLoading(false)
  }

  async function dismiss() {
    if (vendor) await supabase.from('vendors').update({ onboarding_dismissed: true }).eq('id', vendor.id)
    setDismissed(true)
  }

  if (loading || dismissed || !vendor) return null
  if (vendor.onboarding_dismissed) return null

  const steps = STEPS.map(s => ({ ...s, done: s.check(vendor, productCount) }))
  const completed = steps.filter(s => s.done).length
  const pct = Math.round((completed / steps.length) * 100)
  if (pct === 100) return null // all done, hide

  return (
    <div style={{background:'white',border:'1.5px solid var(--border)',borderRadius:'16px',padding:'20px',marginBottom:'24px',position:'relative'}}>
      <button onClick={dismiss} style={{position:'absolute',top:'12px',right:'12px',background:'none',border:'none',fontSize:'18px',cursor:'pointer',color:'var(--gray)'}}>✕</button>
      <div style={{display:'flex',alignItems:'center',gap:'12px',marginBottom:'16px'}}>
        <div style={{width:'48px',height:'48px',borderRadius:'12px',background:'var(--wolf)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'24px',flexShrink:0}}>🐺</div>
        <div>
          <div style={{fontWeight:900,fontSize:'15px'}}>Set up your store</div>
          <div style={{fontSize:'12px',color:'var(--gray)'}}>{completed} of {steps.length} steps completed</div>
        </div>
      </div>
      {/* Progress bar */}
      <div style={{height:'6px',background:'var(--light)',borderRadius:'10px',marginBottom:'16px',overflow:'hidden'}}>
        <div style={{height:'100%',width:`${pct}%`,background:'var(--wolf)',borderRadius:'10px',transition:'width .4s'}}/>
      </div>
      <div style={{display:'flex',flexDirection:'column',gap:'8px'}}>
        {steps.map(s => (
          <div key={s.id} style={{display:'flex',alignItems:'center',gap:'12px',padding:'10px 14px',background:s.done?'#f0fdf4':'var(--light)',borderRadius:'10px',cursor:s.done?'default':'pointer'}}
            onClick={() => {
              if (s.done) return
              if (s.id==='product') navigate('/sell')
              else navigate('/dashboard?tab=settings')
            }}>
            <div style={{width:'28px',height:'28px',borderRadius:'50%',background:s.done?'#22c55e':'var(--border)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,color:'white',fontSize:'14px'}}>
              {s.done ? '✓' : s.icon}
            </div>
            <div style={{flex:1}}>
              <div style={{fontWeight:700,fontSize:'13px',color:s.done?'#166534':'var(--black)',textDecoration:s.done?'line-through':'none'}}>{s.title}</div>
              {!s.done && <div style={{fontSize:'11px',color:'var(--gray)'}}>{s.desc}</div>}
            </div>
            {!s.done && <span style={{fontSize:'12px',color:'var(--wolf)',fontWeight:700}}>→</span>}
          </div>
        ))}
      </div>
    </div>
  )
}
