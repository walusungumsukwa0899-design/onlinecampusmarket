import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import { supabase } from '../lib/supabase'
import './SignIn.css'

const UNIS = ['UNIMA','The Polytechnic','Mzuzu University','MUST','College of Medicine','Catholic University of Malawi','MUBAS','LUANAR','Malawi Adventist University','Livingstonia University','Daeyang Luke University','NIPA','Other']

const FEATURES = [
  { icon: '🛍️', title: 'Buy from campus vendors', desc: 'Food, fashion, electronics, services — all nearby' },
  { icon: '💰', title: 'Sell anything', desc: 'List products in minutes, get paid via mobile money' },
  { icon: '🚀', title: 'Fast campus delivery', desc: 'Order from vendors on your campus and get it fast' },
  { icon: '🔒', title: 'Secure payments', desc: 'Pay safely with Airtel Money or TNM Mpamba' },
]

export default function SignIn() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { user, signIn, signUp, loading: authLoading } = useAuth()
  const [tab, setTab] = useState('in')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    email: '', password: '', fullName: '', phone: '', university: '',
    referralCode: searchParams.get('ref') || ''
  })
  const [termsAccepted, setTermsAccepted] = useState(false)

  // Already signed in → go home
  useEffect(() => {
    if (!authLoading && user) navigate('/home')
  }, [user, authLoading])

  function set(k, v) { setForm(f => ({ ...f, [k]: v })); setError('') }

  async function handle() {
    setLoading(true); setError('')
    try {
      if (tab === 'in') {
        if (!form.email.trim() || !form.password) { setError('Please enter your email and password'); return }
        await signIn({ email: form.email.trim(), password: form.password })
        navigate(searchParams.get('from') || '/home')
      } else if (tab === 'up') {
        if (!form.fullName || !form.email || !form.password || !form.university) { setError('Please fill in all required fields'); return }
        if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
        if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) { setError('Password must contain at least one letter and one number'); return }
        if (!termsAccepted) { setError('Please accept the Terms & Privacy Policy to continue'); return }
        await signUp({ email: form.email.trim(), password: form.password, fullName: form.fullName, phone: form.phone, university: form.university, referralCode: form.referralCode })
        setTab('check-email')
      } else if (tab === 'reset') {
        if (!form.email.trim()) { setError('Please enter your email address'); return }
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(form.email.trim(), { redirectTo: `${window.location.origin}/signin` })
        if (resetError) throw resetError
        setTab('check-email')
      }
    } catch (e) {
      const msg = typeof e === 'string' ? e : e?.message || JSON.stringify(e) || 'Something went wrong. Please try again.'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  function onKey(e) { if (e.key === 'Enter') handle() }

  if (authLoading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0e1a12,#1a3a20)' }}>
      <div style={{ textAlign: 'center', color: 'white' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🐺</div>
        <div className="spinner" style={{ borderColor: 'rgba(255,255,255,.3)', borderTopColor: 'white', margin: '0 auto' }} />
      </div>
    </div>
  )

  if (tab === 'check-email') return (
    <div className="landing-page">
      <div className="landing-left">
        <LandingHero />
      </div>
      <div className="landing-right">
        <div className="signin-card" style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>{!form.fullName ? '📧' : '🎉'}</div>
          <h2 style={{ marginBottom: '8px', fontWeight: 900 }}>{!form.fullName ? 'Check your email' : 'Almost there!'}</h2>
          <p style={{ color: 'var(--gray)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.6 }}>
            {!form.fullName
              ? `We sent a password reset link to ${form.email}. Click it to set a new password.`
              : `We sent a confirmation link to ${form.email}. Click it to activate your account, then sign in below.`}
          </p>
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => setTab('in')}>
            Back to Sign In
          </button>
        </div>
      </div>
    </div>
  )

  const pwScore = form.password.length > 0
    ? [form.password.length >= 8, /[A-Z]/.test(form.password), /[0-9]/.test(form.password), /[^A-Za-z0-9]/.test(form.password)].filter(Boolean).length
    : 0
  const pwLabels = ['', 'Weak', 'Fair', 'Good', 'Strong']
  const pwColors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e']

  return (
    <div className="landing-page">
      {/* Left: hero */}
      <div className="landing-left">
        <LandingHero />
      </div>

      {/* Right: auth form */}
      <div className="landing-right">
        <div className="signin-card">
          <div className="signin-logo">
            <div className="signin-logo-icon">🐺</div>
            <div className="signin-logo-text">Wolf Marketplace</div>
            <div className="signin-logo-sub">Malawi&apos;s Campus Marketplace</div>
          </div>

          {tab !== 'reset' && (
            <div className="auth-toggle">
              <button className={`auth-tab${tab === 'in' ? ' active' : ''}`} onClick={() => { setTab('in'); setError('') }}>Sign In</button>
              <button className={`auth-tab${tab === 'up' ? ' active' : ''}`} onClick={() => { setTab('up'); setError('') }}>Create Account</button>
            </div>
          )}

          {tab === 'reset' && (
            <>
              <h3 style={{ marginBottom: '4px', fontWeight: 800 }}>Reset your password</h3>
              <p style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '16px' }}>Enter your email and we&apos;ll send a reset link.</p>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} onKeyDown={onKey} placeholder="you@example.com" autoFocus />
              </div>
            </>
          )}

          {tab === 'in' && (
            <>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} onKeyDown={onKey} placeholder="you@example.com" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} onKeyDown={onKey} placeholder="••••••••" />
              </div>
              <div style={{ textAlign: 'right', marginBottom: '16px' }}>
                <span style={{ fontSize: '12px', color: 'var(--wolf)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setTab('reset'); setError('') }}>Forgot password?</span>
              </div>
            </>
          )}

          {tab === 'up' && (
            <>
              <div className="form-group">
                <label className="form-label">Full Name *</label>
                <input className="form-input" value={form.fullName} onChange={e => set('fullName', e.target.value)} placeholder="Your full name" autoFocus />
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+265 9xx xxx xxx" />
              </div>
              <div className="form-group">
                <label className="form-label">University *</label>
                <select className="form-input" value={form.university} onChange={e => set('university', e.target.value)}>
                  <option value="">Select your university</option>
                  {UNIS.map(u => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Password *</label>
                <input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} onKeyDown={onKey} placeholder="Min 8 chars, include a number" />
                {form.password.length > 0 && (
                  <div style={{ marginTop: '6px' }}>
                    <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                      {[1, 2, 3, 4].map(i => <div key={i} style={{ flex: 1, height: '3px', borderRadius: '99px', background: i <= pwScore ? pwColors[pwScore] : 'var(--border)', transition: 'background .2s' }} />)}
                    </div>
                    <div style={{ fontSize: '11px', color: pwColors[pwScore], fontWeight: 600 }}>{pwLabels[pwScore]}</div>
                  </div>
                )}
              </div>
              {form.referralCode && (
                <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '8px', padding: '8px 12px', marginBottom: '14px', fontSize: '13px', color: '#166534', fontWeight: 700 }}>
                  🎁 Referral code applied: {form.referralCode} — you'll get MWK 500 credit!
                </div>
              )}
              <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', fontSize: '13px', cursor: 'pointer', marginBottom: '4px', lineHeight: 1.5 }}>
                <input type="checkbox" checked={termsAccepted} onChange={e => { setTermsAccepted(e.target.checked); setError('') }}
                  style={{ marginTop: '2px', accentColor: 'var(--wolf)', flexShrink: 0 }} />
                <span style={{ color: '#374151' }}>
                  I agree to the{' '}
                  <a href="/terms" target="_blank" rel="noreferrer" style={{ color: 'var(--wolf)', fontWeight: 700 }}>Terms of Service</a>
                  {' '}and{' '}
                  <a href="/privacy" target="_blank" rel="noreferrer" style={{ color: 'var(--wolf)', fontWeight: 700 }}>Privacy Policy</a>
                </span>
              </label>
            </>
          )}

          {error && <div className="auth-error">⚠️ {error}</div>}

          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '15px' }} onClick={handle} disabled={loading}>
            {loading ? '⏳ Please wait...' : tab === 'in' ? '→ Sign In' : tab === 'up' ? '🚀 Create Account' : '📧 Send Reset Link'}
          </button>

          {tab === 'reset' && (
            <div style={{ textAlign: 'center', marginTop: '16px' }}>
              <span style={{ fontSize: '13px', color: 'var(--wolf)', cursor: 'pointer', fontWeight: 600 }} onClick={() => { setTab('in'); setError('') }}>← Back to Sign In</span>
            </div>
          )}


        </div>
      </div>
    </div>
  )
}

function LandingHero() {
  return (
    <div className="landing-hero">
      <div className="landing-hero-inner">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
          <div style={{ width: '52px', height: '52px', background: 'rgba(232,99,10,.2)', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', border: '1.5px solid rgba(232,99,10,.4)' }}>🐺</div>
          <div>
            <div style={{ color: 'white', fontWeight: 900, fontSize: '18px', fontFamily: 'Syne,sans-serif' }}>Wolf Marketplace</div>
            <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '12px' }}>Malawi&apos;s Campus Marketplace</div>
          </div>
        </div>
        <h1 className="landing-headline">
          Buy & sell anything<br />
          <span style={{ color: '#E8630A' }}>on campus</span>
        </h1>
        <p className="landing-sub">
          Join thousands of students buying food, fashion, electronics and services — right on their campus.
        </p>
        <div className="landing-features">
          {FEATURES.map(f => (
            <div key={f.title} className="landing-feature">
              <span className="landing-feature-icon">{f.icon}</span>
              <div>
                <div style={{ color: 'white', fontWeight: 700, fontSize: '13px' }}>{f.title}</div>
                <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '12px', marginTop: '2px' }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>
        <div className="landing-stats">
          {[['🏪', '500+', 'Vendors'], ['📦', '2,000+', 'Products'], ['🎓', '13', 'Universities']].map(([icon, num, label]) => (
            <div key={label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '20px', marginBottom: '2px' }}>{icon}</div>
              <div style={{ color: 'white', fontWeight: 900, fontSize: '18px' }}>{num}</div>
              <div style={{ color: 'rgba(255,255,255,.6)', fontSize: '11px' }}>{label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
