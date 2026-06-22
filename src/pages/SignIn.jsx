import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import './SignIn.css'

const UNIS = ['UNIMA','The Polytechnic','Mzuzu University','MUST','College of Medicine','Catholic University of Malawi','MUBAS','LUANAR','Malawi Adventist University','Livingstonia University','Daeyang Luke University','NIPA','Other']

export default function SignIn() {
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState('in') // 'in' | 'up' | 'reset' | 'check-email'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email:'', password:'', fullName:'', phone:'', university:'', referralCode:'' })

  function set(k, v) { setForm(f => ({...f, [k]: v})); setError('') }

  async function handle() {
    setLoading(true); setError('')
    try {
      if (tab === 'in') {
        if (!form.email.trim() || !form.password) {
          setError('Please enter your email and password')
          return
        }
        await signIn({ email: form.email.trim(), password: form.password })
        navigate('/')
      } else if (tab === 'up') {
        if (!form.fullName || !form.email || !form.password || !form.university) {
          setError('Please fill in all fields')
          return
        }
        if (form.password.length < 8) {
          setError('Password must be at least 8 characters')
          return
        }
        if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) {
          setError('Password must contain at least one letter and one number')
          return
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

  // Email confirmation / reset link sent screen
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

  return (
    <div className="signin-page">
      <div className="signin-card">
        <div className="signin-logo">
          <div className="signin-logo-icon">🐺</div>
          <div className="signin-logo-text">Wolf Marketplace</div>
          <div className="signin-logo-sub">Malawi's Campus Marketplace</div>
        </div>

        {tab !== 'reset' && (
          <div className="auth-toggle">
            <button className={`auth-tab${tab==='in'?' active':''}`} onClick={() => { setTab('in'); setError('') }}>Sign In</button>
            <button className={`auth-tab${tab==='up'?' active':''}`} onClick={() => { setTab('up'); setError('') }}>Sign Up</button>
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
            <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••"/></div>
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

        <button className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'12px'}} onClick={handle} disabled={loading}>
          {loading ? 'Please wait...' : tab === 'in' ? 'Sign In' : tab === 'up' ? 'Create Account' : 'Send Reset Link'}
        </button>

        {tab === 'reset' && (
          <div style={{textAlign:'center',marginTop:'16px'}}>
            <a style={{fontSize:'13px',color:'var(--wolf)',cursor:'pointer'}} onClick={() => { setTab('in'); setError('') }}>← Back to Sign In</a>
          </div>
        )}
      </div>
    </div>
  )
}
