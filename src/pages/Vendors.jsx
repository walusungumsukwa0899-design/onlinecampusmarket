import { useEffect, useState } from 'react'
import { useSEO } from '../lib/useSEO'
import { SkeletonGrid } from '../components/Skeleton'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'
import './Vendors.css'

export default function Vendors() {
  useSEO({ title: 'Vendors', description: 'Browse trusted student entrepreneurs on Wolf Marketplace. View ratings, products, and contact vendors directly.' })
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(searchParams.get('uni') || searchParams.get('cat') || '')

  useEffect(() => {
    async function load() {
      try {
        const { data } = await supabase
          .from('vendor_stats')
          .select('*')
          .order('is_featured', { ascending: false })
          .order('created_at', { ascending: false })
        setVendors(data || [])
      } catch (err) {
        console.error('Failed to load vendors:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = vendors.filter(v =>
    !search || v.name.toLowerCase().includes(search.toLowerCase()) ||
    v.category?.toLowerCase().includes(search.toLowerCase()) ||
    v.university?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="vendors-page">
      <div className="vendors-hero">
        <h1>Campus <span>Vendors</span></h1>
        <p>Browse trusted student entrepreneurs. View their stores, chat with them, and rate their products.</p>
        <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
          <button className="btn-primary" onClick={() => navigate('/sell')}>Open Your Store</button>
        </div>
      </div>

      <div className="container">
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'20px',alignItems:'center'}}>
          <input className="vendors-search" placeholder="Search vendors by name, category, or university..." value={search} onChange={e => setSearch(e.target.value)} style={{flex:'1 1 240px'}}/>
        </div>

        {loading
          ? <div className="loading"><div className="spinner"/><span>Loading vendors...</span></div>
          : filtered.length === 0
          ? <div className="empty-state"><div className="empty-icon">🏪</div><h3>No vendors found</h3><p>Try a different search or be the first to open a store!</p><button className="btn-primary" onClick={() => navigate('/sell')}>Open Your Store</button></div>
          : <div className="vendors-grid">
              {filtered.map(v => (
                <div key={v.id} className="vendor-card" onClick={() => navigate(`/vendors/${v.id}`)}>
                  <div className="vendor-banner" style={{background:`linear-gradient(135deg,#0e1a12,#1a3a20)`}}>
                    {v.banner_url && <img src={v.banner_url} alt=""/>}
                  </div>
                  <div className="vendor-avatar">
                    {v.avatar_url ? <img src={v.avatar_url} alt={v.name}/> : <span>{v.icon || '🏪'}</span>}
                  </div>
                  <div className="vendor-body">
                    <div className="vendor-name">{v.name}</div>
                    <div className="vendor-cat-tag">{v.category}</div>
                    <div className="vendor-uni">📍 {v.university}</div>
                    <div className="vendor-stats">
                      <div className="vstat"><strong>{v.product_count || 0}</strong><span>Products</span></div>
                      <div className="vstat">
                        <strong>
                          {v.avg_rating
                            ? <span title={`${v.avg_rating} out of 5`}>{v.avg_rating} <span style={{color:'#f59e0b'}}>★</span></span>
                            : <span style={{color:'var(--gray)',fontSize:'12px'}}>New</span>}
                        </strong>
                        <span>Rating</span>
                      </div>
                      <div className="vstat"><strong>{v.total_sales || 0}+</strong><span>Sales</span></div>
                    </div>
                    {v.is_featured && <div style={{background:'linear-gradient(135deg,#f59e0b,#ef4444)',color:'white',borderRadius:'6px',padding:'2px 10px',fontSize:'11px',fontWeight:800,display:'inline-block',marginBottom:'6px'}}>⭐ FEATURED</div>}
                  <div className="vendor-verified">✅ Verified Vendor</div>
                    <button className="vendor-btn">View Store →</button>
                  </div>
                </div>
              ))}
            </div>
        }
      </div>
      <Footer />
    </div>
  )
}
