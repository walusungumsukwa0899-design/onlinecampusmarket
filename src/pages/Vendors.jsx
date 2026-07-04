import { useEffect, useState, useRef, useCallback } from 'react'
import { useSEO } from '../lib/useSEO'
import { SkeletonGrid } from '../components/Skeleton'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Footer from '../components/Footer'
import './Vendors.css'

const PAGE_SIZE = 16

export default function Vendors() {
  useSEO({ title: 'Vendors', description: 'Browse trusted student entrepreneurs on Wolf Business Platform.' })
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [vendors, setVendors] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [search, setSearch] = useState('')
  const uniFilter = searchParams.get('uni') || ''
  const loaderRef = useRef(null)

  useEffect(() => {
    setVendors([])
    setPage(0)
    setHasMore(true)
    loadVendors(0, true)
  }, [uniFilter])

  async function loadVendors(pageNum, reset = false) {
    reset ? setLoading(true) : setLoadingMore(true)
    try {
      let q = supabase.from('vendor_stats').select('*')
        .order('is_featured', { ascending: false })
        .order('created_at', { ascending: false })
        .range(pageNum * PAGE_SIZE, (pageNum + 1) * PAGE_SIZE - 1)
      if (uniFilter) q = q.ilike('university', `%${uniFilter}%`)
      const { data } = await q
      const results = data || []
      setVendors(prev => reset ? results : [...prev, ...results])
      setHasMore(results.length === PAGE_SIZE)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }

  // Infinite scroll observer
  useEffect(() => {
    if (!loaderRef.current) return
    const obs = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) {
        const next = page + 1
        setPage(next)
        loadVendors(next)
      }
    }, { threshold: 0.1 })
    obs.observe(loaderRef.current)
    return () => obs.disconnect()
  }, [hasMore, loadingMore, loading, page])

  const filtered = vendors.filter(v => {
    if (!search) return true
    const q = search.toLowerCase()
    return v.name?.toLowerCase().includes(q) || v.category?.toLowerCase().includes(q) || v.university?.toLowerCase().includes(q)
  })

  return (
    <div className="vendors-page">
      <div className="vendors-hero">
        {uniFilter
          ? <><h1><span>{uniFilter}</span> Market</h1><p>Vendors and stores from {uniFilter}.</p></>
          : <><h1>Campus <span>Vendors</span></h1><p>Browse trusted student entrepreneurs. View their stores, chat, and rate their products.</p></>
        }
        <div style={{display:'flex',gap:'10px',justifyContent:'center',flexWrap:'wrap'}}>
          <button className="btn-primary" onClick={() => navigate('/sell')}>Open Your Store</button>
          {uniFilter && <button className="btn-secondary" onClick={() => navigate('/vendors')}>View All Vendors</button>}
        </div>
      </div>

      <div className="container">
        <div style={{display:'flex',gap:'10px',flexWrap:'wrap',marginBottom:'20px',alignItems:'center'}}>
          <input className="vendors-search" placeholder="Search vendors by name, category, or university..." value={search} onChange={e => setSearch(e.target.value)} style={{flex:'1 1 240px'}}/>
        </div>

        {loading
          ? <div className="loading"><div className="spinner"/><span>Loading vendors...</span></div>
          : filtered.length === 0
          ? <div className="empty-state"><div className="empty-icon">🏪</div><h3>No vendors found</h3><p>{uniFilter ? `No vendors from ${uniFilter} yet. Be the first!` : 'Try a different search or be the first to open a store!'}</p><button className="btn-primary" onClick={() => navigate('/sell')}>Open Your Store</button></div>
          : <>
              <div className="vendors-grid">
                {filtered.map(v => (
                  <div key={v.id} className="vendor-card" onClick={() => navigate(`/vendors/${v.id}`)}>
                    <div className="vendor-banner" style={{background:'linear-gradient(135deg,#0e1a12,#1a3a20)'}}>
                      {v.banner_url && <img src={v.banner_url} alt="" loading="lazy" onError={e=>{e.target.style.display='none'}}/>}
                    </div>
                    <div className="vendor-avatar">
                      {v.avatar_url ? <img loading="lazy" src={v.avatar_url} alt={v.name} onError={e=>{e.target.style.display='none';e.target.insertAdjacentHTML('afterend',`<span>${v.icon || '🏪'}</span>`)}}/> : <span>{v.icon || '🏪'}</span>}
                    </div>
                    <div className="vendor-body">
                      <div className="vendor-name" style={{display:'flex',alignItems:'center',gap:'6px'}}>
                        {v.name}
                        {v.verified && <span style={{background:'#3b82f6',color:'white',fontSize:'10px',fontWeight:800,padding:'1px 6px',borderRadius:'20px'}}>✓</span>}
                      </div>
                      <div className="vendor-cat-tag">{v.category}</div>
                      <div className="vendor-uni">📍 {v.university}</div>
                      {v.is_available === false && <div style={{fontSize:'11px',color:'#f97316',fontWeight:700,margin:'4px 0'}}>😴 Currently unavailable</div>}
                      <div className="vendor-stats">
                        <div className="vstat"><strong>{v.product_count || 0}</strong><span>Products</span></div>
                        <div className="vstat">
                          <strong>{v.avg_rating ? <span>{v.avg_rating} <span style={{color:'#f59e0b'}}>★</span></span> : <span style={{color:'var(--gray)',fontSize:'12px'}}>New</span>}</strong>
                          <span>Rating</span>
                        </div>
                        <div className="vstat"><strong>{v.total_sales || 0}+</strong><span>Sales</span></div>
                      </div>
                      {v.is_featured && <div style={{background:'linear-gradient(135deg,#f59e0b,#ef4444)',color:'white',borderRadius:'6px',padding:'2px 10px',fontSize:'11px',fontWeight:800,display:'inline-block',marginBottom:'6px'}}>⭐ FEATURED</div>}
                      <button className="vendor-btn">View Store →</button>
                    </div>
                  </div>
                ))}
              </div>
              {/* Infinite scroll loader */}
              <div ref={loaderRef} style={{height:'40px',display:'flex',alignItems:'center',justifyContent:'center',margin:'16px 0'}}>
                {loadingMore && <div className="spinner" style={{width:'24px',height:'24px'}}/>}
                {!hasMore && vendors.length > PAGE_SIZE && <div style={{fontSize:'13px',color:'var(--gray)'}}>All {vendors.length} vendors loaded</div>}
              </div>
            </>
        }
      </div>
      <Footer />
    </div>
  )
}
