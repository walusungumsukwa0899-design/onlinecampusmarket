import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Footer from '../components/Footer'

export default function Referrals() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [referrals, setReferrals] = useState([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/signin'); return }
    load()
  }, [user])

  async function load() {
    const [{ data: prof }, { data: refs }] = await Promise.all([
      supabase.from('profiles').select('referral_code, credit_balance, referred_by').eq('id', user.id).maybeSingle(),
      supabase.from('profiles').select('full_name, created_at').eq('referred_by', user.user_metadata?.referral_code || '').order('created_at', { ascending: false }),
    ])
    // Also fetch by referral_code match
    if (prof?.referral_code) {
      const { data: byCode } = await supabase
        .from('profiles').select('full_name, created_at').eq('referred_by', prof.referral_code).order('created_at', { ascending: false })
      setReferrals(byCode || [])
    }
    setProfile(prof)
    setLoading(false)
  }

  function copyLink() {
    const link = `${window.location.origin}/signin?ref=${profile?.referral_code}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  function shareLink() {
    const link = `${window.location.origin}/signin?ref=${profile?.referral_code}`
    const text = `Join me on Wolf Marketplace — Malawi's campus marketplace! Use my link to sign up and we both get MWK 500 credit 🐺`
    if (navigator.share) navigator.share({ title: 'Join Wolf Marketplace', text, url: link })
    else copyLink()
  }

  const refLink = `${window.location.origin}/signin?ref=${profile?.referral_code || ''}`
  const earned = referrals.length * 500

  if (loading) return <div className="loading" style={{paddingTop:'80px'}}><div className="spinner"/><span>Loading referrals...</span></div>

  return (
    <div style={{minHeight:'100vh',paddingBottom:'80px'}}>
      <div style={{background:'linear-gradient(135deg,#0e1a12,#1a3a20)',padding:'80px 24px 32px'}}>
        <div style={{maxWidth:'600px',margin:'0 auto',textAlign:'center'}}>
          <div style={{fontSize:'48px',marginBottom:'12px'}}>🎁</div>
          <h1 style={{color:'white',fontWeight:900,fontSize:'24px',marginBottom:'8px'}}>Refer & Earn</h1>
          <p style={{color:'rgba(255,255,255,.75)',fontSize:'14px'}}>Invite friends to Wolf Marketplace. You both get MWK 500 credit when they make their first purchase.</p>
        </div>
      </div>

      <div style={{maxWidth:'600px',margin:'0 auto',padding:'24px 16px'}}>
        {/* Stats */}
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:'12px',marginBottom:'24px'}}>
          {[
            {label:'Friends Referred',val:referrals.length,icon:'👥'},
            {label:'Credits Earned',val:`MWK ${earned.toLocaleString()}`,icon:'💰'},
            {label:'Credit Balance',val:`MWK ${(profile?.credit_balance||0).toLocaleString()}`,icon:'🏦'},
          ].map(s => (
            <div key={s.label} style={{background:'white',border:'1.5px solid var(--border)',borderRadius:'12px',padding:'16px',textAlign:'center'}}>
              <div style={{fontSize:'24px',marginBottom:'4px'}}>{s.icon}</div>
              <div style={{fontWeight:900,fontSize:'16px',color:'var(--wolf)'}}>{s.val}</div>
              <div style={{fontSize:'11px',color:'var(--gray)',marginTop:'2px'}}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Referral link */}
        <div style={{background:'white',border:'1.5px solid var(--border)',borderRadius:'14px',padding:'20px',marginBottom:'20px'}}>
          <div style={{fontWeight:800,fontSize:'14px',marginBottom:'12px'}}>🔗 Your Referral Link</div>
          <div style={{background:'var(--light)',borderRadius:'10px',padding:'12px 14px',fontSize:'12px',fontFamily:'monospace',wordBreak:'break-all',marginBottom:'12px',color:'var(--wolf)',fontWeight:600}}>{refLink}</div>
          <div style={{display:'flex',gap:'8px'}}>
            <button onClick={copyLink} style={{flex:1,background:copied?'#22c55e':'var(--wolf)',color:'white',border:'none',borderRadius:'10px',padding:'11px',fontWeight:700,fontSize:'13px',cursor:'pointer',transition:'background .2s'}}>
              {copied ? '✅ Copied!' : '📋 Copy Link'}
            </button>
            <button onClick={shareLink} style={{flex:1,background:'var(--light)',color:'var(--black)',border:'1.5px solid var(--border)',borderRadius:'10px',padding:'11px',fontWeight:700,fontSize:'13px',cursor:'pointer'}}>
              📤 Share
            </button>
          </div>
        </div>

        {/* How it works */}
        <div style={{background:'white',border:'1.5px solid var(--border)',borderRadius:'14px',padding:'20px',marginBottom:'20px'}}>
          <div style={{fontWeight:800,fontSize:'14px',marginBottom:'14px'}}>💡 How it works</div>
          {[
            {n:'1',t:'Share your link',d:'Send your referral link to friends via WhatsApp, socials, or anywhere.'},
            {n:'2',t:'They sign up',d:'Your friend creates an account using your referral link.'},
            {n:'3',t:'Both get rewarded',d:'When they complete their first purchase, you both get MWK 500 credit automatically.'},
          ].map(s => (
            <div key={s.n} style={{display:'flex',gap:'12px',marginBottom:'14px',alignItems:'flex-start'}}>
              <div style={{width:'28px',height:'28px',borderRadius:'50%',background:'var(--wolf)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:'13px',flexShrink:0}}>{s.n}</div>
              <div><div style={{fontWeight:700,fontSize:'13px'}}>{s.t}</div><div style={{fontSize:'12px',color:'var(--gray)',marginTop:'2px'}}>{s.d}</div></div>
            </div>
          ))}
        </div>

        {/* Referred friends list */}
        <div style={{background:'white',border:'1.5px solid var(--border)',borderRadius:'14px',overflow:'hidden'}}>
          <div style={{padding:'16px 20px',borderBottom:'1.5px solid var(--border)',fontWeight:800,fontSize:'14px'}}>
            👥 Friends You've Referred ({referrals.length})
          </div>
          {referrals.length === 0 ? (
            <div style={{padding:'32px',textAlign:'center',color:'var(--gray)',fontSize:'14px'}}>
              <div style={{fontSize:'32px',marginBottom:'8px'}}>🤝</div>
              No referrals yet — share your link to get started!
            </div>
          ) : (
            referrals.map((r, i) => (
              <div key={i} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 20px',borderBottom:i<referrals.length-1?'1px solid var(--border)':'none'}}>
                <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
                  <div style={{width:'32px',height:'32px',borderRadius:'50%',background:'var(--wolf)',color:'white',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,fontSize:'14px'}}>{(r.full_name||'?')[0].toUpperCase()}</div>
                  <div>
                    <div style={{fontWeight:700,fontSize:'13px'}}>{r.full_name || 'Anonymous'}</div>
                    <div style={{fontSize:'11px',color:'var(--gray)'}}>{new Date(r.created_at).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}</div>
                  </div>
                </div>
                <div style={{fontSize:'12px',fontWeight:700,color:'#22c55e'}}>+MWK 500</div>
              </div>
            ))
          )}
        </div>
      </div>
      <Footer />
    </div>
  )
}
