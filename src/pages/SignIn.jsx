import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext'
import './SignIn.css'

const UNIS = ['UNIMA','The Polytechnic','Mzuzu University','MUST','College of Medicine','Catholic University of Malawi','MUBAS','LUANAR','Malawi Adventist University','Livingstonia University','Daeyang Luke University','NIPA','Other']

export default function SignIn() {
  const navigate = useNavigate()
  const { signIn, signUp } = useAuth()
  const [tab, setTab] = useState('in')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ email:'', password:'', fullName:'', phone:'', university:'' })

  function set(k, v) { setForm(f => ({...f, [k]: v})); setError('') }

  async function handle() {
    setLoading(true); setError('')
    try {
      if (tab === 'in') {
        await signIn({ email: form.email, password: form.password })
      } else {
        if (!form.fullName || !form.email || !form.password || !form.university) {
          setError('Please fill in all fields'); setLoading(false); return
        }
        await signUp({ email: form.email, password: form.password, fullName: form.fullName, phone: form.phone, university: form.university })
      }
      navigate('/')
    } catch (e) {
      setError(e.message || 'Something went wrong. Please try again.')
    }
    setLoading(false)
  }

  return (
    <div className="signin-page">
      <div className="signin-card">
        <div className="signin-logo">
          <div className="signin-logo-icon">🐺</div>
          <div className="signin-logo-text">Wolf Marketplace</div>
          <div className="signin-logo-sub">Malawi's Campus Marketplace</div>
        </div>

        <div className="auth-toggle">
          <button className={`auth-tab${tab==='in'?' active':''}`} onClick={() => setTab('in')}>Sign In</button>
          <button className={`auth-tab${tab==='up'?' active':''}`} onClick={() => setTab('up')}>Sign Up</button>
        </div>

        {tab === 'in' ? (
          <>
            <div className="form-group"><label className="form-label">Email</label><input className="form-input" type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="you@example.com"/></div>
            <div className="form-group"><label className="form-label">Password</label><input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="••••••••"/></div>
            <div style={{textAlign:'right',marginBottom:'16px'}}><a style={{fontSize:'12px',color:'var(--wolf)',cursor:'pointer'}}>Forgot password?</a></div>
          </>
        ) : (
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
            <div className="form-group"><label className="form-label">Password *</label><input className="form-input" type="password" value={form.password} onChange={e => set('password', e.target.value)} placeholder="Create a password"/></div>
          </>
        )}

        {error && <div className="auth-error">{error}</div>}

        <button className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'12px'}} onClick={handle} disabled={loading}>
          {loading ? 'Please wait...' : tab === 'in' ? 'Sign In' : 'Create Account'}
        </button>
      </div>
    </div>
  )
}
