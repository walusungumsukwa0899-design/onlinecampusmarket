import { useEffect, useState } from 'react'
import { useSEO } from '../lib/useSEO'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useCart } from '../lib/CartContext'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { addToCart, toggleWishlist, isWishlisted } = useCart()
  const [product, setProduct] = useState(null)
  const [vendor, setVendor] = useState(null)
  const [related, setRelated] = useState([])
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

  const images = product.image_urls?.length ? product.image_urls : (product.image_url ? [product.image_url] : [])
  const cartItem = { id: product.id, name: product.name, price: `MWK ${Number(product.price).toLocaleString()}`, rawPrice: product.price, icon: product.icon || '📦', seller: vendor?.name, vendor_id: product.vendor_id, image_url: product.image_url }
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
          <span style={{ cursor: 'pointer', color: 'var(--wolf)' }} onClick={() => navigate('/shop')}>Shop</span>
          <span>›</span>
          <span style={{ cursor: 'pointer', color: 'var(--wolf)' }} onClick={() => navigate('/shop')}>{product.category}</span>
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
              <div style={{ fontSize: '26px', fontWeight: 900, color: 'var(--wolf)' }}>MWK {Number(product.price).toLocaleString()}</div>
            </div>

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
                disabled={!product.available || product.stock_qty === 0}
                onClick={() => addToCart(cartItem)}>
                {product.available && product.stock_qty !== 0 ? '🛒 Add to Cart' : 'Unavailable'}
              </button>
              <button onClick={() => toggleWishlist(cartItem)}
                style={{ background: isWishlisted(product.id) ? '#fee2e2' : 'var(--light)', border: 'none', borderRadius: '10px', padding: '0 16px', cursor: 'pointer', fontSize: '20px' }}>
                {isWishlisted(product.id) ? '❤️' : '🤍'}
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              {whatsappUrl && (
                <a href={whatsappUrl} target="_blank" rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: '#25D366', color: 'white', borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 700, textDecoration: 'none', flex: 1, justifyContent: 'center' }}>
                  💬 Ask Vendor on WhatsApp
                </a>
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
