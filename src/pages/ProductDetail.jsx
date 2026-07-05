import { useEffect, useState } from 'react'
import { useSEO } from '../lib/useSEO'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import { useAuth } from '../lib/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import ImageLightbox from '../components/ImageLightbox'
import { sanitizeText } from '../lib/sanitize'
import { addRecentlyViewed } from '../lib/recentlyViewed'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [product, setProduct] = useState(null)
  const [vendor, setVendor] = useState(null)
  const [related, setRelated] = useState([])
  const [productReviews, setProductReviews] = useState([])
  const [restockSub, setRestockSub] = useState(false)
  const [restockLoading, setRestockLoading] = useState(false)
  const [reviewText, setReviewText] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewDone, setReviewDone] = useState(false)
  const [selectedVariant, setSelectedVariant] = useState('')
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIdx, setLightboxIdx] = useState(0)
  const [loading, setLoading] = useState(true)
  const [imgIdx, setImgIdx] = useState(0)

  useEffect(() => { loadProduct() }, [id])

  async function loadProduct() {
    try {
      const { data: p } = await supabase
        .from('products')
        .select('*, vendors(*)')
        .eq('id', id)
        .single()
      if (!p) { navigate('/404'); return }
      setProduct(p)
      setVendor(p.vendors)
      // Save to recently viewed (stores id only — live data is fetched fresh on render)
      addRecentlyViewed(p.id)
      // Track view
      supabase.rpc('increment_product_views', { product_id: id }).catch(() => {})
      // Load related products (same category, different product)
      const { data: rel } = await supabase
        .from('products')
        .select('*, vendors(name)')
        .eq('category', p.category)
        .eq('available', true)
        .neq('id', id)
        .limit(4)
      setRelated(rel || [])
      // Load product-level reviews
      const { data: revs } = await supabase.from('product_reviews').select('*').eq('product_id', id).order('created_at', { ascending: false })
      setProductReviews(revs || [])
      // Check restock subscription
      if (user) {
        const { data: sub } = await supabase.from('restock_alerts').select('id').eq('product_id', id).eq('user_id', user.id).maybeSingle()
        setRestockSub(!!sub)
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  // SEO — runs every render; falls back to defaults while product is still loading
  useSEO({
    title: product ? `${product.name} – MWK ${Number(product.price).toLocaleString()}` : 'Product',
    description: product?.description || `Buy ${product?.name || 'this product'} from ${vendor?.name || 'a campus vendor'} on Wolf Business Platform.`,
    image: product?.image_url || undefined,
    url: window.location.href,
  })

  if (loading) return <div className="loading"><div className="spinner"/><span>Loading product...</span></div>

  if (!product) return null

  const images = product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : [])
  const variants = Array.isArray(product.variants) ? product.variants : (product.variants ? product.variants.split(',').map(v=>v.trim()).filter(Boolean) : [])
  const cartItem = { id: product.id, name: product.name + (selectedVariant ? ` (${selectedVariant})` : ''), price: `MWK ${Number(product.price).toLocaleString()}`, rawPrice: product.price, icon: product.icon || '📦', seller: vendor?.name, vendor_id: product.vendor_id, image_url: product.image_url }
  const isOwnProduct = user && vendor && vendor.user_id === user.id
  const whatsappMsg = encodeURIComponent(`Hi! I saw your product "${product.name}" on Wolf Business Platform and I'm interested. Is it still available?`)
  const whatsappUrl = vendor?.phone ? `https://wa.me/${vendor.phone.replace(/\D/g,'')}?text=${whatsappMsg}` : null
  const shareUrl = `${window.location.origin}/products/${product.id}`

  function shareWhatsApp() {
    const text = encodeURIComponent(`Check out "${product.name}" on Wolf Business Platform — MWK ${Number(product.price).toLocaleString()}\n${shareUrl}`)
    window.open(`https://wa.me/?text=${text}`, '_blank')
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '90px 16px 60px' }}>
        {/* Breadcrumb */}
        <div style={{ fontSize: '13px', color: 'var(--gray)', marginBottom: '20px', display: 'flex', gap: '6px', alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ cursor: 'pointer', color: 'var(--wolf)' }} onClick={() => navigate('/vendors')}>Vendors</span>
          <span>›</span>
          <span style={{ cursor: 'pointer', color: 'var(--wolf)' }} onClick={() => navigate('/vendors')}>{product.category}</span>
          <span>›</span>
          <span>{product.name}</span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: '32px' }}>
          {/* Image gallery */}
          <div>
            <div style={{ borderRadius: '16px', overflow: 'hidden', background: 'var(--light)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px', marginBottom: '10px', position: 'relative', cursor: images.length > 0 ? 'zoom-in' : 'default' }}
              onClick={() => { if (images.length > 0) { setLightboxIdx(imgIdx); setLightboxOpen(true) } }}>
              {images.length > 0
                ? <img src={images[imgIdx]} alt={product.name} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span>{product.icon || '📦'}</span>
              }
              {images.length > 0 && (
                <div style={{ position: 'absolute', bottom: '8px', right: '8px', background: 'rgba(0,0,0,.5)', color: 'white', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 700 }}>
                  🔍 Tap to zoom
                </div>
              )}
              {images.length > 1 && (
                <>
                  <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + images.length) % images.length) }} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
                  <button onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % images.length) }} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>›</button>
                </>
              )}
            </div>
            {images.length > 1 && (
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {images.map((img, i) => (
                  <div key={i} onClick={() => setImgIdx(i)} style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', cursor: 'pointer', border: i === imgIdx ? '2px solid var(--wolf)' : '2px solid transparent' }}>
                    <img src={img} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div>
              <div style={{ fontSize: '12px', color: 'var(--wolf)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>{product.category}</div>
              <h1 style={{ fontSize: '22px', fontWeight: 900, margin: '0 0 8px' }}>{product.name}</h1>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', flexWrap: 'wrap' }}>
                <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--wolf)' }}>MWK {Number(product.price).toLocaleString()}</div>
                {product.compare_at_price && product.compare_at_price > product.price && (
                  <>
                    <div style={{ fontSize: '16px', color: '#9ca3af', textDecoration: 'line-through' }}>MWK {Number(product.compare_at_price).toLocaleString()}</div>
                    <div style={{ fontSize: '12px', fontWeight: 800, background: '#ef4444', color: 'white', padding: '2px 8px', borderRadius: '20px' }}>
                      -{Math.round((1 - product.price / product.compare_at_price) * 100)}%
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Price tiers */}
            {Array.isArray(product.price_tiers) && product.price_tiers.length > 0 && (
              <div style={{marginBottom:'12px'}}>
                <div style={{fontSize:'13px',fontWeight:700,marginBottom:'8px'}}>Pricing Options</div>
                <div style={{display:'flex',flexDirection:'column',gap:'6px'}}>
                  {product.price_tiers.map((t,i) => (
                    <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 14px',background:'var(--light)',borderRadius:'8px',border:'1.5px solid var(--border)'}}>
                      <span style={{fontWeight:600,fontSize:'13px'}}>{t.label}</span>
                      <span style={{fontWeight:800,color:'var(--wolf)',fontSize:'14px'}}>MWK {Number(t.price).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Variant selector */}
            {variants.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                  Select Option {selectedVariant && <span style={{ color: 'var(--wolf)' }}>— {selectedVariant}</span>}
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  {variants.map(v => (
                    <button key={v} onClick={() => setSelectedVariant(v === selectedVariant ? '' : v)}
                      style={{ padding: '7px 16px', borderRadius: '8px', border: `1.5px solid ${selectedVariant === v ? 'var(--wolf)' : 'var(--border)'}`, background: selectedVariant === v ? 'var(--wolf)' : 'white', color: selectedVariant === v ? 'white' : 'var(--black)', fontWeight: 700, fontSize: '13px', cursor: 'pointer', transition: 'all .15s' }}>
                      {v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {product.condition && product.condition !== 'New' && (
              <div style={{display:'inline-flex',alignItems:'center',gap:'6px',background:'#f8f9fa',border:'1px solid var(--border)',borderRadius:'8px',padding:'4px 12px',fontSize:'13px',fontWeight:700}}>
                🏷️ Condition: <span style={{color: product.condition==='Like New'?'#84cc16':product.condition==='Good'?'#f59e0b':product.condition==='Fair'?'#f97316':'#ef4444'}}>{product.condition}</span>
              </div>
            )}
            {product.stock_qty !== null && (
              <div style={{ fontSize: '13px', color: product.stock_qty > 5 ? '#22c55e' : product.stock_qty > 0 ? '#f97316' : '#ef4444', fontWeight: 700 }}>
                {product.stock_qty > 5 ? `✅ ${product.stock_qty} in stock` : product.stock_qty > 0 ? `⚠️ Only ${product.stock_qty} left!` : '❌ Out of stock'}
              </div>
            )}

            {product.description && (
              <p style={{ fontSize: '14px', color: 'var(--gray)', lineHeight: 1.6, margin: 0 }}>{sanitizeText(product.description)}</p>
            )}

            {/* Vendor */}
            {vendor && (
              <div onClick={() => navigate(`/vendors/${vendor.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--light)', borderRadius: '10px', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--wolf)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '16px', flexShrink: 0 }}>
                  {vendor.avatar_url ? <img src={vendor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} onError={e=>{e.target.style.display='none';e.target.insertAdjacentHTML('afterend',`<span>${vendor.name?.[0] || '🏪'}</span>`)}} /> : vendor.name?.[0] || '🏪'}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>{vendor.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray)' }}>{vendor.university} · View store →</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {isOwnProduct ? (
                <button className="btn-primary" style={{ flex: 1, minWidth: '120px', background: 'var(--gray)' }}
                  onClick={() => navigate(`/dashboard?tab=products&edit=${product.id}`)}>
                  ✏️ Edit Your Product
                </button>
              ) : (
                <button className="btn-primary" style={{ flex: 1, minWidth: '120px' }}
                  disabled={!product.available || product.stock_qty === 0}
                  onClick={() => addToCart(cartItem)}>
                  {product.available && product.stock_qty !== 0 ? '🛒 Add to Cart' : 'Unavailable'}
                </button>
              )}
              {!isOwnProduct && (
                <button onClick={() => toggleWishlist(cartItem)}
                  style={{ background: isWishlisted(product.id) ? '#fee2e2' : 'var(--light)', border: 'none', borderRadius: '10px', padding: '0 16px', cursor: 'pointer', fontSize: '20px' }}>
                  {isWishlisted(product.id) ? '❤️' : '🤍'}
                </button>
              )}
            </div>

            {/* Notify me when back in stock */}
            {(product.stock_qty === 0 || !product.available) && user && (
              <button onClick={async () => {
                setRestockLoading(true)
                if (restockSub) {
                  await supabase.from('restock_alerts').delete().eq('product_id', id).eq('user_id', user.id)
                  setRestockSub(false)
                } else {
                  await supabase.from('restock_alerts').upsert({ product_id: id, user_id: user.id, notified: false })
                  setRestockSub(true)
                }
                setRestockLoading(false)
              }} disabled={restockLoading}
                style={{ width: '100%', background: restockSub ? '#dcfce7' : 'var(--light)', color: restockSub ? '#166534' : 'var(--black)', border: `1.5px solid ${restockSub ? '#22c55e' : 'var(--border)'}`, borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                {restockSub ? '🔔 Subscribed — we\'ll notify you!' : '🔔 Notify me when back in stock'}
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#25D366', color: 'white', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', flex: 1, justifyContent: 'center' }}>
                  💬 Ask Vendor on WhatsApp
                </a>
              )}
              {user?.id !== vendor?.user_id && (
                <button onClick={() => navigate(`/messages?vendor=${product.vendor_id}`)}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--wolf-light)', color: 'var(--wolf)', border: '1.5px solid var(--wolf)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flex: whatsappUrl ? undefined : 1, justifyContent: 'center' }}>
                  ✉️ Message in App
                </button>
              )}
              <button onClick={shareWhatsApp}
                style={{ background: 'var(--light)', border: 'none', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                📤 Share
              </button>
            </div>

            {vendor?.location && <div style={{ fontSize: '13px', color: 'var(--gray)' }}>📍 {vendor.location}</div>}
            {vendor?.delivery_time && <div style={{ fontSize: '13px', color: 'var(--gray)' }}>🚚 Delivery: {vendor.delivery_time}{vendor.delivery_fee ? ` · MWK ${vendor.delivery_fee.toLocaleString()}` : ' · Free'}</div>}
          </div>
        </div>

        {/* Product Reviews */}
        <div style={{ marginTop: '40px' }}>
          <h2 style={{ fontWeight: 900, fontSize: '18px', marginBottom: '20px' }}>
            ⭐ Product Reviews
            {productReviews.length > 0 && (
              <span style={{ fontSize: '14px', color: 'var(--gray)', fontWeight: 400, marginLeft: '8px' }}>
                ({productReviews.length}) · {(productReviews.reduce((a,r)=>a+r.stars,0)/productReviews.length).toFixed(1)} avg
              </span>
            )}
          </h2>
          {/* Write a review */}
          {user && !reviewDone && (
            <div style={{ background: 'white', border: '1.5px solid var(--border)', borderRadius: '14px', padding: '20px', marginBottom: '20px' }}>
              <div style={{ fontWeight: 800, fontSize: '14px', marginBottom: '12px' }}>Write a review</div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setReviewRating(n)}
                    style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: reviewRating >= n ? '#f59e0b' : '#d1d5db', padding: '0 2px' }}>★</button>
                ))}
              </div>
              <textarea value={reviewText} onChange={e => setReviewText(e.target.value)}
                placeholder="Share your experience with this product..."
                className="form-input" rows={3} style={{ resize: 'none', marginBottom: '12px' }} />
              <button className="btn-primary" style={{ padding: '10px 20px', fontSize: '13px' }}
                disabled={reviewSubmitting || !reviewRating}
                onClick={async () => {
                  if (!reviewRating) { alert('Please select a star rating'); return }
                  // Check if user already reviewed this product
                  const { data: existing } = await supabase.from('product_reviews').select('id').eq('product_id', id).eq('user_id', user.id).maybeSingle()
                  if (existing) { alert('You have already reviewed this product.'); setReviewSubmitting(false); return }
                  setReviewSubmitting(true)
                  const { error } = await supabase.from('product_reviews').insert({
                    product_id: id, vendor_id: product.vendor_id, user_id: user.id,
                 