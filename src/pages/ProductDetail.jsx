import { useEffect, useState } from 'react'
import { useSEO } from '../lib/useSEO'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import { useAuth } from '../lib/AuthContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

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
  const [selectedVariants, setSelectedVariants] = useState({}) // { Size: 'M', Color: 'Red' }
  const [loading, setLoading] = useState(true)
  const [hasVerifiedPurchase, setHasVerifiedPurchase] = useState(false)
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
      // Save to recently viewed
      try {
        const key = 'wolf_recently_viewed'
        const prev = JSON.parse(localStorage.getItem(key) || '[]')
        const entry = { id: p.id, name: p.name, price: p.price, image_url: p.image_url, icon: p.icon, vendor_id: p.vendor_id, seller: p.vendors?.name }
        const updated = [entry, ...prev.filter(x => x.id !== p.id)].slice(0, 10)
        localStorage.setItem(key, JSON.stringify(updated))
      } catch {}
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
      // Check if current user has a delivered order for this product (verified purchase)
      if (user) {
        const { data: purchaseCheck } = await supabase.from('orders')
          .select('id').eq('product_id', id).eq('buyer_id', user.id).eq('status', 'delivered').maybeSingle()
        setHasVerifiedPurchase(!!purchaseCheck)
      }
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

  if (loading) return <div className="loading"><div className="spinner"/><span>Loading product...</span></div>
  // SEO — only runs when product is loaded, so no null-derived strings
  useSEO({
    title: product ? `${product.name} – MWK ${Number(product.price).toLocaleString()}` : 'Product',
    description: product.description || `Buy ${product.name} from ${vendor?.name} on Wolf Marketplace.`,
    image: product.image_url || undefined,
    url: window.location.href,
  })

  if (!product) return null

  const images = product.images?.length ? product.images : (product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : []))

  // Support both new grouped format and legacy flat array
  const variantGroups = Array.isArray(product.variant_groups) && product.variant_groups.length > 0
    ? product.variant_groups
    : (Array.isArray(product.variants) && product.variants.length > 0
        ? [{ name: 'Option', options: product.variants }]
        : (typeof product.variants === 'string' && product.variants
            ? [{ name: 'Option', options: product.variants.split(',').map(v => v.trim()).filter(Boolean) }]
            : []))

  const variantLabel = Object.entries(selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')
  const allVariantsSelected = variantGroups.length === 0 || variantGroups.every(g => selectedVariants[g.name])

  const cartItem = {
    id: product.id,
    name: product.name + (variantLabel ? ` (${variantLabel})` : ''),
    price: `MWK ${Number(product.price).toLocaleString()}`,
    rawPrice: product.price,
    icon: product.icon || '📦',
    seller: vendor?.name,
    vendor_id: product.vendor_id,
    image_url: product.image_url,
    selectedVariants: Object.keys(selectedVariants).length > 0 ? selectedVariants : null,
  }
  const whatsappMsg = encodeURIComponent(`Hi! I saw your product "${product.name}" on Wolf Marketplace and I'm interested. Is it still available?`)
  const whatsappUrl = vendor?.phone ? `https://wa.me/${vendor.phone.replace(/\D/g,'')}?text=${whatsappMsg}` : null
  const shareUrl = `${window.location.origin}/products/${product.id}`

  function shareWhatsApp() {
    const text = encodeURIComponent(`Check out "${product.name}" on Wolf Marketplace — MWK ${Number(product.price).toLocaleString()}\n${shareUrl}`)
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
            <div style={{ borderRadius: '16px', overflow: 'hidden', background: 'var(--light)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '80px', marginBottom: '10px', position: 'relative' }}>
              {images.length > 0
                ? <img src={images[imgIdx]} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <span>{product.icon || '📦'}</span>
              }
              {images.length > 1 && (
                <>
                  <button onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>‹</button>
                  <button onClick={() => setImgIdx(i => (i + 1) % images.length)} style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer', fontSize: '16px' }}>›</button>
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

            {/* Grouped variant selectors */}
            {variantGroups.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {variantGroups.map(group => (
                  <div key={group.name}>
                    <div style={{ fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                      {group.name}
                      {selectedVariants[group.name] && (
                        <span style={{ color: 'var(--wolf)', fontWeight: 600, marginLeft: '8px' }}>
                          — {selectedVariants[group.name]}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {group.options.map(opt => {
                        const selected = selectedVariants[group.name] === opt
                        return (
                          <button key={opt}
                            onClick={() => setSelectedVariants(sv => ({
                              ...sv,
                              [group.name]: sv[group.name] === opt ? undefined : opt,
                            }))}
                            style={{
                              padding: '7px 16px', borderRadius: '8px', fontWeight: 700, fontSize: '13px',
                              cursor: 'pointer', transition: 'all .15s', fontFamily: 'inherit',
                              border: `1.5px solid ${selected ? 'var(--wolf)' : 'var(--border)'}`,
                              background: selected ? 'var(--wolf)' : 'white',
                              color: selected ? 'white' : 'var(--black)',
                            }}>
                            {opt}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ))}
                {variantGroups.length > 0 && !allVariantsSelected && (
                  <div style={{ fontSize: '12px', color: '#f97316', fontWeight: 600 }}>
                    ⚠️ Please select all options before adding to cart.
                  </div>
                )}
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
              <p style={{ fontSize: '14px', color: 'var(--gray)', lineHeight: 1.6, margin: 0 }}>{product.description}</p>
            )}

            {/* Vendor */}
            {vendor && (
              <div onClick={() => navigate(`/vendors/${vendor.id}`)} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px', background: 'var(--light)', borderRadius: '10px', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'var(--wolf)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 900, fontSize: '16px', flexShrink: 0 }}>
                  {vendor.avatar_url ? <img src={vendor.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} /> : vendor.name?.[0] || '🏪'}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '14px' }}>{vendor.name}</div>
                  <div style={{ fontSize: '12px', color: 'var(--gray)' }}>{vendor.university} · View store →</div>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button className="btn-primary" style={{ flex: 1, minWidth: '120px' }}
                disabled={!product.available || product.stock_qty === 0 || !allVariantsSelected}
                onClick={() => addToCart(cartItem)}>
                {!product.available || product.stock_qty === 0
                  ? 'Unavailable'
                  : !allVariantsSelected
                  ? 'Select options first'
                  : '🛒 Add to Cart'}
              </button>
              <button onClick={() => toggleWishlist(cartItem)}
                style={{ background: isWishlisted(product.id) ? '#fee2e2' : 'var(--light)', border: 'none', borderRadius: '10px', padding: '0 16px', cursor: 'pointer', fontSize: '20px' }}>
                {isWishlisted(product.id) ? '❤️' : '🤍'}
              </button>
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
              <button onClick={() => navigate(`/messages?vendor=${product.vendor_id}`)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'var(--wolf-light)', color: 'var(--wolf)', border: '1.5px solid var(--wolf)', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', flex: whatsappUrl ? undefined : 1, justifyContent: 'center' }}>
                ✉️ Message in App
              </button>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                <div style={{ fontWeight: 800, fontSize: '14px' }}>Write a review</div>
                {hasVerifiedPurchase && (
                  <span style={{ fontSize: '11px', fontWeight: 700, background: '#dcfce7', color: '#166534', borderRadius: '20px', padding: '2px 10px', border: '1px solid #bbf7d0' }}>
                    ✅ Verified Purchase
                  </span>
                )}
              </div>
              {!hasVerifiedPurchase && (
                <div style={{ fontSize: '12px', color: '#f97316', background: '#fff7ed', borderRadius: '8px', padding: '8px 12px', marginBottom: '12px', fontWeight: 600 }}>
                  💡 Reviews are more trusted when from verified buyers. Yours will be marked as unverified.
                </div>
              )}
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
                  const { data: existing } = await supabase.from('product_reviews').select('id').eq('product_id', id).eq('user_id', user.id).maybeSingle()
                  if (existing) { alert('You have already reviewed this product.'); return }
                  setReviewSubmitting(true)
                  const { error } = await supabase.from('product_reviews').insert({
                    product_id: id, vendor_id: product.vendor_id, user_id: user.id,
                    buyer_name: user.user_metadata?.full_name || 'Anonymous',
                    stars: reviewRating, text: reviewText.trim(),
                    verified_purchase: hasVerifiedPurchase,
                  })
                  if (!error) {
                    setProductReviews(prev => [{ stars: reviewRating, text: reviewText.trim(),
                      buyer_name: user.user_metadata?.full_name || 'Anonymous',
                      verified_purchase: hasVerifiedPurchase, created_at: new Date().toISOString() }, ...prev])
                    setReviewDone(true)
                  }
                  setReviewSubmitting(false)
                }}>
                {reviewSubmitting ? 'Submitting...' : 'Submit Review'}
              </button>
            </div>
          )}
          {reviewDone && <div style={{ background: '#f0fdf4', border: '1.5px solid #bbf7d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#166534', fontWeight: 700 }}>✅ Thanks for your review!</div>}
          {productReviews.length === 0 ? (
            <div style={{ background: 'var(--light)', borderRadius: '14px', padding: '24px', textAlign: 'center', color: 'var(--gray)', fontSize: '14px' }}>
              No reviews yet — be the first!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {productReviews.map((r, i) => (
                <div key={i} style={{ background: 'white', border: '1.5px solid var(--border)', borderRadius: '12px', padding: '14px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--wolf)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: '14px', flexShrink: 0 }}>
                      {(r.buyer_name || '?')[0].toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '13px' }}>{r.buyer_name || 'Anonymous'}</div>
                      <div style={{ display: 'flex', gap: '1px' }}>
                        {[1,2,3,4,5].map(n => <span key={n} style={{ color: n <= r.stars ? '#f59e0b' : '#d1d5db', fontSize: '12px' }}>★</span>)}
                      </div>
                    </div>
                    <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px' }}>
                      <div style={{ fontSize: '11px', color: 'var(--gray)' }}>{new Date(r.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short' })}</div>
                      {r.verified_purchase && (
                        <span style={{ fontSize: '10px', fontWeight: 700, background: '#dcfce7', color: '#166534', borderRadius: '20px', padding: '1px 8px', border: '1px solid #bbf7d0', whiteSpace: 'nowrap' }}>
                          ✅ Verified
                        </span>
                      )}
                    </div>
                  </div>
                  {r.text && <p style={{ fontSize: '13px', color: 'var(--black)', margin: 0, lineHeight: 1.6 }}>{r.text}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Related products */}
        {related.length > 0 && (
          <div style={{ marginTop: '48px' }}>
            <h2 style={{ fontWeight: 900, fontSize: '18px', marginBottom: '20px' }}>More in {product.category}</h2>
            <div className="products-grid">
              {related.map(p => (
                <div key={p.id} className="product-card" onClick={() => navigate(`/products/${p.id}`)}>
                  <div className="product-img">
                    {p.image_url ? <img src={p.image_url} alt={p.name} /> : <span>{p.icon || '📦'}</span>}
                  </div>
                  <div className="product-info">
                    <div className="product-name">{p.name}</div>
                    <div className="product-seller">{p.vendors?.name}</div>
                    <div className="product-price">MWK {Number(p.price).toLocaleString()}</div>
                    <button className="add-cart-btn" onClick={e => { e.stopPropagation(); addToCart({ id: p.id, name: p.name, price: `MWK ${Number(p.price).toLocaleString()}`, rawPrice: p.price, icon: p.icon || '📦', seller: p.vendors?.name, vendor_id: p.vendor_id, image_url: p.image_url }) }}>Add to Cart</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  )
}
