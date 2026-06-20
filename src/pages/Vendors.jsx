import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'
import './Vendors.css'

export default function Vendors() {
  const navigate = useNavigate()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('vendors')
        .select('*')
        .order('created_at', { ascending: false })
      setVendors(data || [])
      setLoading(false)
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
        <div className="vendors-search">
          <input placeholder="Search vendors by name, category, or university..." value={search} onChange={e => setSearch(e.target.value)}/>
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
                      <div className="vstat"><strong>{v.avg_rating ? `${v.avg_rating}⭐` : 'New'}</strong><span>Rating</span></div>
                      <div className="vstat"><strong>{v.total_sales || 0}+</strong><span>Sales</span></div>
                    </div>
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
