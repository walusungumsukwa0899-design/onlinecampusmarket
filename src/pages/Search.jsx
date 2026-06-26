import { useEffect, useState, useRef } from 'react'
import { useSEO } from '../lib/useSEO'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import Footer from '../components/Footer'

const CATS = ['All','Fashion & Clothing','Electronics','Food & Drinks','Books & Stationery','Beauty & Health','Services','Art & Crafts','Home & Living','Sports & Fitness','Auto Parts','Other']
const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'name', label: 'Name A–Z' },
]

export default function Search() {
  useSEO({ title: 'Search Products', description: 'Search products across all campus vendors on Wolf Marketplace.' })
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { addToCart, toggleWishlist, isWishlisted } = useCart()

  const [query, setQuery] = useState(searchParams.get('q') || '')
  const [category, setCategory] = useState(searchParams.get('cat') || 'All')
  const [sort, setSort] = useState(searchParams.get('sort') || 'newest')
  const [minPrice, setMinPrice] = useState(searchParams.get('min') || '')
  const [maxPrice, setMaxPrice] = useState(searchParams.get('max') || '')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searched, setSearched] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const inputRef = useRef(null)
  const debounceRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    if (query || category !== 'All') doSearch(query, category, sort, minPrice, maxPrice)
  }, [])

  function updateParams(q, cat, s, min, max) {
    const p = {}
    if (q) p.q = q
    if (cat && cat !== 'All') p.cat = cat
    if (s && s !== 'newest') p.sort = s
    if (min) p.min = min
    if (max) p.max = max
    setSearchParams(p)
  }

  async function doSearch(q, cat, s, min, max) {
    setLoading(true)
    setSearched(true)
    try {
      let qb = supabase.from('products').select('*, vendors(name, university, avatar_url, icon, avg_rating, review_count)').eq('available', true)
      if (q?.trim()) qb = qb.or(`name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%`)
      if (cat && cat !== 'All') qb = qb.eq('category', cat)
      if (min) qb = qb.gte('price', parseInt(min))
      if (max) qb = qb.lte('price', parseInt(max))
      if (s === 'price_asc') qb = qb.order('price', { ascending: true })
      else if (s === 'price_desc') qb = qb.order('price', { ascending: false })
      else if (s === 'name') qb = qb.order('name', { ascending: true })
      else qb = qb.order('created_at', { ascending: false })
      qb = qb.limit(60)
      const { data } = await qb
      const filtered = (data || []).filter(p => p.vendor_id && p.vendors)
      setResults(filtered)

      // Track search analytics (fire-and-forget, only for non-empty queries)
      if (q?.trim()) {
        supabase.from('search_analytics').insert({
          query: q.trim().toLowerCase(),
          category: cat !== 'All' ? cat : null,
          result_count: filtered.length,
        }).then(() => {}).catch(() => {})
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleQueryChange(val) {
    setQuery(val)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      updateParams(val, category, sort, minPrice, maxPrice)
      doSearch(val, category, sort, minPrice, maxPrice)
    }, 350)
  }

  function applyFilters() {
    updateParams(query, category, sort, minPrice, maxPrice)
    doSearch(query, category, sort, minPrice, maxPrice)
    setShowFilters(false)
  }

  function clearFilters() {
    setCategory('All')
    setSort('newest')
    setMinPrice('')
    setMaxPrice('')
    updateParams(query, 'All', 'newest', '', '')
    doSearch(query, 'All', 'newest', '', '')
    setShowFilters(false)
  }

  const hasActiveFilters = category !== 'All' || sort !== 'newest' || minPrice || maxPrice

  return (
    <div style={{ minHeight: '100vh', paddingBottom: '80px' }}>
      {/* Search bar hero */}
      <div style={{ background: 'linear-gradient(135deg,#0e1a12,#1a3a20)', padding: '80px 24px 28px' }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <h1 style={{ color: 'white', fontWeight: 900, fontSize: '22px', marginBottom: '14px', textAlign: 'center' }}>
            🔍 Search Wolf Marketplace
          </h1>
          <div style={{ position: 'relative' }}>
            <input
              ref={inputRef}
              value={query}
              onChange={e => handleQueryChange(e.target.value)}
              placeholder="Search products, categories, vendors..."
              style={{ width: '100%', padding: '14px 50px 14px 18px', borderRadius: '12px', border: 'none', fontSize: '15px', fontFamily: 'Inter,sans-serif', outline: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.2)' }}
            />
            {query && (
              <button onClick={() => { setQuery(''); handleQueryChange('') }}
                style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#6b7280' }}>✕</button>
            )}
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '20px 16px' }}>
        {/* Filter bar */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap' }}>
          <button onClick={() => setShowFilters(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', background: hasActiveFilters ? 'var(--wolf)' : 'white', color: hasActiveFilters ? 'white' : 'var(--black)', border: '1.5px solid ' + (hasActiveFilters ? 'var(--wolf)' : 'var(--border)'), borderRadius: '8px', padding: '8px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
            🎛️ Filters {hasActiveFilters && '●'}
          </button>
          {/* Quick category pills */}
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', flex: 1 }}>
            {['All','Fashion & Clothing','Electronics','Food & Drinks','Books & Stationery'].map(c => (
              <button key={c} onClick={() => { setCategory(c); updateParams(query, c, sort, minPrice, maxPrice); doSearch(query, c, sort, minPrice, maxPrice) }}
                style={{ background: category === c ? 'var(--wolf)' : 'var(--light)', color: category === c ? 'white' : 'var(--black)', border: 'none', borderRadius: '20px', padding: '5px 12px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                {c}
              </button>
            ))}
          </div>
          {searched && <div style={{ fontSize: '13px', color: 'var(--gray)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>{results.length} result{results.length !== 1 ? 's' : ''}</div>}
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div style={{ background: 'white', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: '16px' }}>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Category</label>
              <select value={category} onChange={e => setCategory(e.target.value)} className="form-input" style={{ padding: '8px 10px', fontSize: '13px' }}>
                {CATS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Sort By</label>
              <select value={sort} onChange={e => setSort(e.target.value)} className="form-input" style={{ padding: '8px 10px', fontSize: '13px' }}>
                {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Min Price (MWK)</label>
              <input type="number" value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0" className="form-input" style={{ padding: '8px 10px', fontSize: '13px' }} />
            </div>
            <div>
              <label style={{ fontSize: '12px', fontWeight: 700, display: 'block', marginBottom: '6px' }}>Max Price (MWK)</label>
              <input type="number" value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="No limit" className="form-input" style={{ padding: '8px 10px', fontSize: '13px' }} />
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
              <button onClick={applyFilters} className="btn-primary" style={{ padding: '8px 18px', fontSize: '13px' }}>Apply</button>
              {hasActiveFilters && <button onClick={clearFilters} style={{ background: 'none', border: '1.5px solid var(--border)', borderRadius: '8px', padding: '8px 14px', fontSize: '13px', cursor: 'pointer', fontWeight: 600 }}>Clear</button>}
            </div>
          </div>
        )}

        {/* Results */}
        {loading ? (
          <div className="loading"><div className="spinner" /><span>Searching...</span></div>
        ) : !searched ? (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h3>Search for anything</h3>
            <p>Try "second-hand laptop", "jollof rice", "Syne font t-shirt"…</p>
          </div>
        ) : results.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">😕</div>
            <h3>No results found</h3>
            <p>Try different keywords or <button onClick={clearFilters} style={{ color: 'var(--wolf)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '14px' }}>clear filters</button></p>
          </div>
        ) : (
          <div className="products-grid">
            {results.map(p => {
              const cartItem = { id: p.id, name: p.name, price: `MWK ${Number(p.price).toLocaleString()}`, rawPrice: p.price, icon: p.icon || '📦', seller: p.vendors?.name, vendor_id: p.vendor_id, image_url: p.image_url }
              return (
                <div key={p.id} className="product-card" onClick={() => navigate(`/products/${p.id}`)}>
                  <div className="product-img">
                    {p.image_url ? <img src={p.image_url} alt={p.name} /> : <span>{p.icon || '📦'}</span>}
                  </div>
                  <div className="product-body">
                    <div className="product-name">{p.name}</div>
                    <div className="product-seller">by {p.vendors?.name}</div>
                    <div style={{ fontSize: '10px', color: 'var(--gray)', marginTop: '2px' }}>{p.vendors?.university}</div>
                    {p.vendors?.avg_rating > 0 && (
                      <div style={{display:'flex',alignItems:'center',gap:'2px',margin:'3px 0'}}>
                        {'★'.repeat(Math.floor(p.vendors.avg_rating)).split('').map((_,i)=><span key={i} style={{color:'#f59e0b',fontSize:'10px'}}>★</span>)}
                        <span style={{fontSize:'10px',color:'#6b7280',fontWeight:600}}>{Number(p.vendors.avg_rating).toFixed(1)}</span>
                      </div>
                    )}
                    <div className="product-footer">
                      <div className="product-price">MWK {Number(p.price).toLocaleString()}</div>
                      <div className="product-badge">{p.category}</div>
                    </div>
                    {p.condition && p.condition !== 'New' && (
                      <div style={{ fontSize: '10px', color: '#f59e0b', fontWeight: 700, marginTop: '4px' }}>🏷️ {p.condition}</div>
                    )}
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button className="add-cart-btn" style={{ flex: 1 }}
                        disabled={!p.available || p.stock_qty === 0}
                        onClick={e => { e.stopPropagation(); addToCart(cartItem) }}>
                        {p.available && p.stock_qty !== 0 ? 'Add to Cart' : 'Unavailable'}
                      </button>
                      <button onClick={e => { e.stopPropagation(); toggleWishlist(cartItem) }}
                        style={{ background: isWishlisted(p.id) ? '#fee2e2' : 'var(--light)', border: 'none', borderRadius: '8px', padding: '0 10px', cursor: 'pointer', fontSize: '15px' }}>
                        {isWishlisted(p.id) ? '❤️' : '🤍'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
