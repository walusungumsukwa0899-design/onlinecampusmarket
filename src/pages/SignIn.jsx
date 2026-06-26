import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import './SignIn.css'

const UNIS = ['UNIMA','The Polytechnic','Mzuzu University','MUST','College of Medicine','Catholic University of Malawi','MUBAS','LUANAR','Malawi Adventist University','Livingstonia University','Daeyang Luke University','NIPA','Other']

const LANDING_STATS = [
  { icon: '🏪', value: '500+', label: 'Campus Vendors' },
  { icon: '🎓', value: '13', label: 'Universities' },
  { icon: '📦', value: '5,000+', label: 'Products Listed' },
]

/** isLanding = true when rendered from App.jsx auth gate at "/" */
export default function SignIn({ isLanding = false }) {
  const navigate = useNavigate()
  const { signIn, signUp, user, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('in') // 'in' | 'up' | 'reset' | 'check-email'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email:'', password:'', fullName:'', phone:'', university:'', referralCode:'' })

  // If already signed in, go straight to home
  useEffect(() => {
    if (!authLoading && user) navigate('/')
  }, [user, authLoading, navigate])

  function set(k, v) { setForm(f => ({...f, [k]: v})); setError('') }

  async function handle() {
    setLoading(true); setError('')
    try {
      if (tab === 'in') {
        if (!form.email.trim() || !form.password) {
          setError('Please enter your email and password'); return
        }
        await signIn({ email: form.email.trim(), password: form.password })
        navigate('/')
      } else if (tab === 'up') {
        if (!form.fullName || !form.email || !form.password || !form.university) {
          setError('Please fill in all fields'); return
        }
        if (form.password.length < 8) {
          setError('Password must be at least 8 characters'); return
        }
        if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
          setError('Password must contain at least one letter and one number'); return
        }
        await signUp({ email: form.email.trim(), password: form.password, fullName: form.fullName, phone: form.phone, university: form.university, referralCode: form.referralCode })
        setTab('check-email')
      } else if (tab === 'reset') {
        if (!form.email.trim()) { setError('Please enter your email address'); return }
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(form.email.trim(), {
          redirectTo: `${window.location.origin}/signin`,
        })
        if (resetError) throw resetError
        setTab('check-email')
      }
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (tab === 'check-email') {
    const isReset = !form.fullName
    return (
      <div className="signin-page">
        <div className="signin-card" style={{textAlign:'center'}}>
          <div style={{fontSize:'48px',marginBottom:'16px'}}>{isReset ? '📧' : '🎉'}</div>
          <h2 style={{marginBottom:'8px'}}>{isReset ? 'Check your email' : 'Almost there!'}</h2>
          <p style={{color:'var(--gray)',fontSize:'14px',marginBottom:'24px'}}>
            {isReset
              ? `We sent a password reset link to ${form.email}. Click it to choose a new password.`
              : `We sent a confirmation link to ${form.email}. Click it to activate your account, then sign in.`}
          </p>
          <button className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'12px'}} onClick={() => setTab('in')}>
            Back to Sign In
          </button>
        </div>
      </div>
    )
  }

  // Landing hero shown when app loads with no session
  const LandingHero = () => (
    <div className="signin-hero">
      <div className="signin-hero-badge">🇲🇼 Made for Malawian Students</div>
      <h1 className="signin-hero-title">
        Buy &amp; Sell on<br />
        <span className="signin-hero-accent">Campus</span>
      </h1>
      <p className="signin-hero-sub">
        Wolf Marketplace connects students and vendors across every university in Malawi — from food &amp; fashion to textbooks &amp; tech.
      </p>
      <div className="signin-hero-stats">
        {LANDING_STATS.map(s => (
          <div key={s.label} className="signin-stat">
            <span className="signin-stat-icon">{s.icon}</span>
            <strong className="signin-stat-val">{s.value}</strong>
            <span className="signin-stat-label">{s.label}</span>
          </div>
        ))}
      </div>
      <div className="signin-hero-scroll">↓ Sign in to explore</div>
    </div>
  )

  return (
    <div className={`signin-page${isLanding ? ' signin-page--landing' : ''}`}>
      {isLanding && <LandingHero />}

      <div className="signin-card">
        {!isLanding && (
          <div className="signin-logo">
            <div className="signin-logo-icon">🐺</div>
            <div className="signin-logo-text">Wolf Marketplace</div>
            <div className="signin-logo-sub">Malawi's Campus Marketplace</div>
          </div>
        )}

        {isLanding && (
          <div className="signin-card-header">
            <span style={{fontSize:'28px'}}>🐺</span>
            <div>
              <div style={{fontWeight:900,fontSize:'16px',color:'var(--wolf)'}}>Wolf Marketplace</div>
              <div style={{fontSize:'12px',color:'var(--gray)'}}>Sign in to your account</div>
            </div>
          </div>
        )}

        {tab !== 'reset' && (
          <div className="auth-toggle">
            <button className={`auth-tab${tab==='in'?' active':''}`} onClick={() => { setTab('in'); setError('') }}>Sign In</button>
            <button className={`auth-tab${tab==='up'?' active':''}`} onClick={() => { setTab('up'); setError('') }}>Create Account</button>
          </div>
        )}

        {tab === 'reset' && (
          <>
            <h3 style={{marginBottom:'4px',fontWeight:800}}>Reset your password</h3>
            <p style={{fontSize:'13px',color:'var(--gray)',marginBottom:'16px'}}>Enter your email and we'll send you a reset link.</p>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" autoFocus/></div>
          </>
        )}

        {tab === 'in' && (
          <>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com"/></div>
            <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && handle()}/></div>
            <div style={{textAlign:'right',marginBottom:'16px'}}>
              <a style={{fontSize:'12px',color:'var(--wolf)',cursor:'pointer'}} onClick={() => { setTab('reset'); setError('') }}>Forgot password?</a>
            </div>
          </>
        )}

        {tab === 'up' && (
          <>
            <div className="form-group"><label className="form-label">Full Name *</label><input className="form-input" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Your full name"/></div>
            <div className="form-group"><label className="form-label">Email *</label><input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com"/></div>
            <div className="form-group"><label className="form-label">Phone Number</label><input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+265 9xx xxx xxx"/></div>
            <div className="form-group">
              <label className="form-label">University *</label>
              <select className="form-input" value={form.university} onChange={e => set('university', e.target.value)}>
                <option value="">Select your university</option>
                {UNIS.map(u => <option key={u}>{u}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Referral Code <span style={{fontWeight:400,color:'var(--gray)'}}>(optional)</span></label>
              <input className="form-input" value={form.referralCode} onChange={e => set('referralCode', e.target.value)} placeholder="e.g. WLF123" style={{textTransform:'uppercase'}}/>
            </div>
            <div className="form-group">
              <label className="form-label">Password *</label>
              <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Min 8 chars, include a number"/>
              {form.password.length > 0 && (() => {
                const score = [form.password.length >= 8, /[A-Z]/.test(form.password), /[0-9]/.test(form.password), /[^A-Za-z0-9]/.test(form.password)].filter(Boolean).length
                const labels = ['','Weak','Fair','Good','Strong']
                const colors = ['','#ef4444','#f97316','#eab308','#22c55e']
                return (
                  <div style={{marginTop:'6px'}}>
                    <div style={{display:'flex',gap:'4px',marginBottom:'4px'}}>
                      {[1,2,3,4].map(i => <div key={i} style={{flex:1,height:'3px',borderRadius:'99px',background:i<=score?colors[score]:'var(--border)'}}/>)}
                    </div>
                    <div style={{fontSize:'11px',color:colors[score],fontWeight:600}}>{labels[score]}</div>
                  </div>
                )
              })()}
            </div>
          </>
        )}

        {error && <div className="auth-error">{error}</div>}

        <button className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'13px',fontSize:'15px'}} onClick={handle} disabled={loading}>
          {loading ? 'Please wait...' : tab === 'in' ? '→ Sign In' : tab === 'up' ? '→ Create Account' : 'Send Reset Link'}
        </button>

        {tab === 'reset' && (
          <div style={{textAlign:'center',marginTop:'16px'}}>
            <a style={{fontSize:'13px',color:'var(--wolf)',cursor:'pointer'}} onClick={() => { setTab('in'); setError('') }}>← Back to Sign In</a>
          </div>
        )}

        {isLanding && tab === 'in' && (
          <div style={{marginTop:'16px',textAlign:'center',fontSize:'12px',color:'var(--gray)'}}>
            Don't have an account?{' '}
            <a style={{color:'var(--wolf)',cursor:'pointer',fontWeight:700}} onClick={() => { setTab('up'); setError('') }}>
              Create one free →
            </a>
          </div>
        )}
      </div>

      {isLanding && (
        <div className="signin-browse-hint">
          <button onClick={() => navigate('/vendors')} style={{background:'none',border:'1.5px solid rgba(255,255,255,0.3)',borderRadius:'10px',color:'white',padding:'10px 20px',fontSize:'13px',cursor:'pointer',fontWeight:600,backdropFilter:'blur(4px)'}}>
            👀 Browse without account
          </button>
        </div>
      )}
    </div>
  )
}
