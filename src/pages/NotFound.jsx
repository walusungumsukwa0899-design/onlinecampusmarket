import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

const POPULAR = [
  { icon: '🏪', label: 'Browse Vendors', path: '/vendors' },
  { icon: '🔥', label: 'Trending Now', path: '/trending' },
  { icon: '🔍', label: 'Search Products', path: '/search' },
  { icon: '🎓', label: 'Campus Marketplaces', path: '/marketplaces' },
]

export default function NotFound() {
  const navigate = useNavigate()
  const [suggested, setSuggested] = useState([])

  useEffect(() => {
    supabase.from('products').select('id, name, icon, price, vendors(name)')
      .eq('available', true).order('view_count', { ascending: false }).limit(4)
      .then(({ data }) => setSuggested((data || []).filter(p => p.vendors)))
  }, [])

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg,#0e1a12,#1a3a20)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ maxWidth: '560px', width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '80px', marginBottom: '16px' }}>🐺</div>
        <h1 style={{ color: 'white', fontWeight: 900, fontSize: '32px', marginBottom: '8px', fontFamily: 'Syne,sans-serif' }}>404</h1>
        <h2 style={{ color: 'white', fontWeight: 700, fontSize: '20px', marginBottom: '12px' }}>This page doesn't exist</h2>
        <p style={{ color: 'rgba(255,255,255,.65)', fontSize: '14px', marginBottom: '32px', lineHeight: 1.6 }}>
          The link may have expired or the page was moved. Here are some places to go instead:
        </p>

        {/* Quick links */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '10px', marginBottom: '28px' }}>
          {POPULAR.map(p => (
            <button key={p.path} onClick={() => navigate(p.path)}
              style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.15)', borderRadius: '12px', padding: '14px', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '10px', transition: 'background .15s', fontFamily: 'Inter,sans-serif' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.15)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.08)'}>
              <span style={{ fontSize: '22px' }}>{p.icon}</span>
              <span style={{ fontWeight: 700, fontSize: '13px' }}>{p.label}</span>
            </button>
          ))}
        </div>

        {/* Trending products */}
        {suggested.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,.07)', border: '1px solid rgba(255,255,255,.12)', borderRadius: '14px', padding: '16px', marginBottom: '20px' }}>
            <div style={{ color: 'rgba(255,255,255,.7)', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '12px' }}>Trending Products</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {suggested.map(p => (
                <div key={p.id} onClick={() => navigate(`/products/${p.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px', background: 'rgba(255,255,255,.06)', borderRadius: '8px', cursor: 'pointer', transition: 'background .15s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,.12)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,.06)'}>
                  <span style={{ fontSize: '20px' }}>{p.icon || '📦'}</span>
                  <div style={{ flex: 1, textAlign: 'left' }}>
                    <div style={{ color: 'white', fontWeight: 600, fontSize: '13px' }}>{p.name}</div>
                    <div style={{ color: 'rgba(255,255,255,.5)', fontSize: '11px' }}>{p.vendors?.name}</div>
                  </div>
                  <div style={{ color: '#E8630A', fontWeight: 700, fontSize: '13px' }}>MWK {Number(p.price).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button onClick={() => navigate('/home')}
          style={{ background: '#E8630A', color: 'white', border: 'none', borderRadius: '12px', padding: '13px 32px', fontWeight: 700, fontSize: '15px', cursor: 'pointer' }}>
          ← Go Home
        </button>
      </div>
    </div>
  )
}
