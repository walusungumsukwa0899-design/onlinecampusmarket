import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Footer from '../components/Footer'
import './Sell.css'

const CATS = ['Fashion & Clothing','Electronics','Food & Drinks','Books & Stationery','Beauty & Health','Services','Art & Crafts','Home & Living','Sports & Fitness','Auto Parts','Other']
const UNIS = ['UNIMA','The Polytechnic','Mzuzu University','MUST','College of Medicine','Catholic University of Malawi','MUBAS','LUANAR','Malawi Adventist University','Livingstonia University','Daeyang Luke University','NIPA','Other']

// ── Variant Group Builder ─────────────────────────────────────
const PRESET_GROUPS = [
  { name: 'Size', options: ['XS', 'S', 'M', 'L', 'XL', 'XXL'] },
  { name: 'Color', options: ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow'] },
  { name: 'Material', options: [] },
  { name: 'Flavour', options: [] },
]

function VariantGroupBuilder({ variantGroups, setVariantGroups }) {
  const [draftOption, setDraftOption] = useState({}) // { groupIdx: 'text' }

  function addGroup() {
    setVariantGroups(g => [...g, { name: '', options: [] }])
  }

  function removeGroup(idx) {
    setVariantGroups(g => g.filter((_, i) => i !== idx))
  }

  function setGroupName(idx, name) {
    setVariantGroups(g => g.map((grp, i) => i === idx ? { ...grp, name } : grp))
    // Auto-fill preset options when a known name is typed
    const preset = PRESET_GROUPS.find(p => p.name.toLowerCase() === name.toLowerCase())
    if (preset?.options.length) {
      setVariantGroups(g => g.map((grp, i) => i === idx ? { ...grp, name, options: grp.options.length ? grp.options : preset.options } : grp))
    }
  }

  function addOption(idx) {
    const text = (draftOption[idx] || '').trim()
    if (!text) return
    setVariantGroups(g => g.map((grp, i) => i === idx ? { ...grp, options: [...grp.options, text] } : grp))
    setDraftOption(d => ({ ...d, [idx]: '' }))
  }

  function removeOption(groupIdx, optIdx) {
    setVariantGroups(g => g.map((grp, i) => i === groupIdx ? { ...grp, options: grp.options.filter((_, oi) => oi !== optIdx) } : grp))
  }

  return (
    <div>
      {variantGroups.map((grp, idx) => (
        <div key={idx} style={{ background: 'var(--light)', borderRadius: '12px', padding: '14px', marginBottom: '10px', border: '1.5px solid var(--border)' }}>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
            <input
              className="form-input" value={grp.name}
              onChange={e => setGroupName(idx, e.target.value)}
              placeholder="Group name (e.g. Size, Colour)"
              style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }}
              list={`vg-presets-${idx}`}
            />
            <datalist id={`vg-presets-${idx}`}>
              {PRESET_GROUPS.map(p => <option key={p.name} value={p.name} />)}
            </datalist>
            <button type="button" onClick={() => removeGroup(idx)}
              style={{ background: '#fee2e2', border: 'none', borderRadius: '8px', padding: '7px 10px', cursor: 'pointer', color: '#b91c1c', fontWeight: 700, fontSize: '13px', flexShrink: 0, fontFamily: 'inherit' }}>
              Remove
            </button>
          </div>

          {/* Options chips */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
            {grp.options.map((opt, oi) => (
              <div key={oi} style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'white', border: '1.5px solid var(--wolf)', borderRadius: '20px', padding: '3px 10px', fontSize: '12px', fontWeight: 700, color: 'var(--wolf)' }}>
                {opt}
                <button type="button" onClick={() => removeOption(idx, oi)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 0 4px', color: 'var(--wolf)', fontSize: '14px', lineHeight: 1 }}>×</button>
              </div>
            ))}
          </div>

          {/* Add option input */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <input className="form-input" value={draftOption[idx] || ''}
              onChange={e => setDraftOption(d => ({ ...d, [idx]: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addOption(idx) } }}
              placeholder="Type option, press Enter"
              style={{ flex: 1, padding: '7px 12px', fontSize: '13px' }}
            />
            <button type="button" onClick={() => addOption(idx)}
              style={{ background: 'var(--wolf)', color: 'white', border: 'none', borderRadius: '8px', padding: '7px 14px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}>
              + Add
            </button>
          </div>
        </div>
      ))}

      <button type="button" onClick={addGroup}
        style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--light)', border: '1.5px dashed var(--border)', borderRadius: '10px', padding: '9px 16px', fontSize: '13px', fontWeight: 700, cursor: 'pointer', color: 'var(--gray)', width: '100%', justifyContent: 'center', fontFamily: 'inherit' }}>
        + Add Variant Group
      </button>
      {variantGroups.length > 0 && (
        <div style={{ fontSize: '11px', color: 'var(--gray)', marginTop: '6px' }}>
          Buyers will see a separate picker for each group — e.g. "Size" and "Colour" shown separately.
        </div>
      )}
    </div>
  )
}

export default function Sell() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [photoFiles, setPhotoFiles] = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [variantGroups, setVariantGroups] = useState([]) // [{ name:'Size', options:['S','M','L'] }]
  const [form, setForm] = useState({
    name:'', price:'', description:'', phone:'', location:'', university:'',
    delivery:'', deliveryTime:'', deliveryFee:'', hours:''
  })

  function set(key, val) { setForm(f => ({...f, [key]: val})) }

  useEffect(() => {
    return () => { photoPreviews.forEach(url => URL.revokeObjectURL(url)) }
  }, [photoPreviews])

  function handlePhotos(e) {
    photoPreviews.forEach(url => URL.revokeObjectURL(url))
    const MAX_SIZE_MB = 8
    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
    const raw = Array.from(e.target.files).slice(0, 5)

    const oversized = raw.filter(f => f.size > MAX_SIZE_MB * 1024 * 1024)
    const wrongType = raw.filter(f => !ALLOWED_TYPES.includes(f.type))

    if (wrongType.length > 0) {
      alert(`Only JPEG, PNG, WebP, and GIF images are allowed. Please remove: ${wrongType.map(f => f.name).join(', ')}`)
      e.target.value = ''
      return
    }
    if (oversized.length > 0) {
      alert(`Each photo must be under ${MAX_SIZE_MB}MB. The following are too large: ${oversized.map(f => `${f.name} (${(f.size/1024/1024).toFixed(1)}MB)`).join(', ')}`)
      e.target.value = ''
      return
    }

    const files = raw
    setPhotoFiles(files)
    setPhotoPreviews(files.map(f => URL.createObjectURL(f)))
  }

  async function submit() {
    if (!user) { navigate('/signin'); return }
    if (!form.name || !form.price || !selectedCat || !form.university) {
      alert('Please fill in all required fields (name, price, category, university)'); return
    }
    setLoading(true)

    // Ensure vendor profile exists
    let { data: vendor, error: vendorFetchError } = await supabase.from('vendors').select('id').eq('user_id', user.id).maybeSingle()
    if (vendorFetchError) {
      alert('Could not load your vendor profile: ' + vendorFetchError.message)
      setLoading(false)
      return
    }
    if (!vendor) {
      const { data: newVendor, error: vendorInsertError } = await supabase.from('vendors').insert({
        user_id: user.id,
        name: user.user_metadata?.full_name || 'My Store',
        phone: form.phone,
        email: user.email,
        location: form.location,
        university: form.university,
        hours: form.hours,
        delivery_area: form.location,
        delivery_time: form.deliveryTime,
        delivery_fee: form.deliveryFee ? parseInt(form.deliveryFee) : null,
      }).select().single()
      if (vendorInsertError || !newVendor) {
        alert('Could not create your store: ' + (vendorInsertError?.message || 'Unknown error'))
        setLoading(false)
        return
      }
      vendor = newVendor
    }

    // Upload all photos and collect URLs
    const imageUrls = []
    for (let i = 0; i < photoFiles.length; i++) {
      const path = `products/${vendor.id}-${Date.now()}-${i}`
      const { error: uploadError } = await supabase.storage.from('product-images').upload(path, photoFiles[i])
      if (uploadError) {
        alert(`Could not upload photo ${i + 1}: ${uploadError.message}`)
        setLoading(false)
        return
      }
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      imageUrls.push(data.publicUrl)
    }

    const { error: productError } = await supabase.from('products').insert({
      vendor_id: vendor.id,
      name: form.name,
      price: parseInt(form.price),
      description: form.description,
      category: selectedCat,
      image_url: imageUrls[0] || null,
      image_urls: imageUrls.length > 0 ? imageUrls : null,
      stock_qty: form.stockQty ? parseInt(form.stockQty) : null,
      condition: form.condition || 'New',
      compare_at_price: form.compareAtPrice ? parseInt(form.compareAtPrice) : null,
      variants: null, // legacy — no longer used for new listings
      variant_groups: variantGroups.length > 0 ? variantGroups : null,
      available: true,
    })

    setLoading(false)
    if (productError) {
      alert('Could not list your product: ' + productError.message)
      return
    }
    setSuccess(true)
  }

  if (!user) return (
    <div className="sell-page">
      <div className="empty-state" style={{paddingTop:'80px'}}>
        <div className="empty-icon">🔐</div>
        <h3>Sign in to sell</h3>
        <p>You need an account to list products on Wolf Marketplace.</p>
        <button className="btn-primary" onClick={() => navigate('/signin')}>Sign In / Register</button>
      </div>
    </div>
  )

  if (success) return (
    <div className="sell-page">
      <div className="sell-success-screen">
        <div style={{fontSize:'64px',marginBottom:'20px'}}>🎉</div>
        <h2>Product Listed!</h2>
        <p>Your product is now visible in your campus marketplace.</p>
        <div style={{display:'flex',gap:'12px',justifyContent:'center',marginTop:'24px',flexWrap:'wrap'}}>
          <button className="btn-primary" onClick={() => { photoPreviews.forEach(url => URL.revokeObjectURL(url)); setSuccess(false); setForm({name:'',price:'',description:'',phone:'',location:'',university:'',delivery:'',deliveryTime:'',deliveryFee:'',hours:''}); setSelectedCat(''); setPhotoPreviews([]); setPhotoFiles([]) }}>List Another</button>
          <button className="btn-outline" onClick={() => navigate('/vendors')}>View Marketplace</button>
        </div>
      </div>
    </div>
  )

  const [csvMode, setCsvMode] = useState(false)
  const [csvText, setCsvText] = useState('')
  const [csvImporting, setCsvImporting] = useState(false)
  const [csvResults, setCsvResults] = useState(null)

  async function importCSV() {
    if (!user) { navigate('/signin'); return }
    setCsvImporting(true)
    setCsvResults(null)
    try {
      const lines = csvText.trim().split('\n').filter(Boolean)
      const headers = lines[0].toLowerCase().split(',').map(h => h.trim().replace(/"/g,''))
      const rows = lines.slice(1)
      let { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).maybeSingle()
      if (!vendor) {
        const { data: nv } = await supabase.from('vendors').insert({ user_id: user.id, name: user.user_metadata?.full_name || 'My Store', email: user.email, university: 'Other' }).select('id').single()
        vendor = nv
      }
      let ok = 0, fail = 0
      for (const row of rows) {
        const cols = row.split(',').map(c => c.trim().replace(/"/g,''))
        const obj = {}
        headers.forEach((h, i) => { obj[h] = cols[i] || '' })
        if (!obj.name || !obj.price) { fail++; continue }
        const { error } = await supabase.from('products').insert({
          vendor_id: vendor.id, name: obj.name, price: parseInt(obj.price) || 0,
          description: obj.description || '', category: obj.category || 'Other',
          stock_qty: obj.stock_qty ? parseInt(obj.stock_qty) : null,
          available: true, icon: obj.icon || '📦',
          compare_at_price: obj.compare_at_price ? parseInt(obj.compare_at_price) : null,
        })
        if (error) fail++; else ok++
      }
      setCsvResults({ ok, fail, total: rows.length })
    } catch (e) {
      setCsvResults({ error: e.message })
    }
    setCsvImporting(false)
  }

  return (
    <div className="sell-page">
      <div className="sell-container">
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:'4px'}}>
          <h2 style={{margin:0}}>{csvMode ? '📂 Bulk Import via CSV' : 'List Your Product'}</h2>
          <button onClick={() => setCsvMode(v => !v)} style={{background:'var(--light)',border:'1.5px solid var(--border)',borderRadius:'8px',padding:'7px 14px',fontSize:'12px',fontWeight:700,cursor:'pointer'}}>
            {csvMode ? '← Single Product' : '📂 Bulk Import'}
          </button>
        </div>

        {csvMode ? (
          <div>
            <p className="sell-sub">Paste a CSV with columns: <code>name, price, description, category, stock_qty, icon, compare_at_price</code></p>
            <div style={{background:'var(--light)',borderRadius:'8px',padding:'10px 14px',fontSize:'12px',fontFamily:'monospace',color:'var(--gray)',marginBottom:'12px'}}>
              name,price,description,category,stock_qty,icon<br/>
              "Calculus Textbook",5000,"Used textbook good condition","Books & Stationery",3,📚<br/>
              "UNIMA Hoodie",8000,"Black hoodie size M","Fashion & Clothing",10,👕
            </div>
            <textarea value={csvText} onChange={e => setCsvText(e.target.value)}
              placeholder="Paste your CSV here..." rows={12}
              style={{width:'100%',border:'1.5px solid var(--border)',borderRadius:'10px',padding:'12px',fontSize:'13px',fontFamily:'monospace',outline:'none',resize:'vertical',marginBottom:'12px'}}/>
            {csvResults && (
              <div style={{background:csvResults.error?'#fee2e2':'#f0fdf4',border:`1.5px solid ${csvResults.error?'#fca5a5':'#bbf7d0'}`,borderRadius:'10px',padding:'12px 16px',marginBottom:'12px',fontSize:'13px',fontWeight:700,color:csvResults.error?'#991b1b':'#166534'}}>
                {csvResults.error ? `❌ Error: ${csvResults.error}` : `✅ Imported ${csvResults.ok} of ${csvResults.total} products${csvResults.fail>0?` (${csvResults.fail} failed)`:''}`}
              </div>
            )}
            <button className="btn-primary" style={{width:'100%',padding:'13px',justifyContent:'center'}} disabled={csvImporting||!csvText.trim()} onClick={importCSV}>
              {csvImporting ? 'Importing...' : `Import Products`}
            </button>
          </div>
        ) : (
          <><p className="sell-sub">Add your items to Wolf Marketplace and start selling to students on your campus.</p>

        {/* Photo upload */}
        <label className="photo-upload-area" htmlFor="product-photos">
          <div className="upload-icon">📸</div>
          <div className="upload-text">Tap to upload product photos</div>
          <div className="upload-sub">Up to 5 photos · Max 8MB each · JPEG, PNG, WebP</div>
          <input id="product-photos" type="file" accept="image/*" multiple onChange={handlePhotos} style={{display:'none'}}/>
          {photoPreviews.length > 0 && (
            <div>
              <div style={{fontSize:'12px',color:'var(--gray)',marginBottom:'8px'}}>Tap ‹ to move left · × to remove · First photo is the cover image</div>
              <div style={{display:'flex',gap:'8px',flexWrap:'wrap'}}>
                {photoPreviews.map((src, i) => (
                  <div key={i} style={{position:'relative',width:'80px',height:'80px',borderRadius:'10px',overflow:'hidden',border:i===0?'2px solid var(--wolf)':'2px solid var(--border)',flexShrink:0}}>
                    <img src={src} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
                    {i === 0 && <div style={{position:'absolute',bottom:0,left:0,right:0,background:'var(--wolf)',color:'white',fontSize:'9px',fontWeight:800,textAlign:'center',padding:'2px'}}>COVER</div>}
                    <button type="button" onClick={() => { const np=photoPreviews.filter((_,j)=>j!==i); const nf=photoFiles.filter((_,j)=>j!==i); URL.revokeObjectURL(src); setPhotoPreviews(np); setPhotoFiles(nf) }} style={{position:'absolute',top:'2px',right:'2px',background:'rgba(0,0,0,0.65)',color:'white',border:'none',borderRadius:'50%',width:'18px',height:'18px',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
                    {i > 0 && <button type="button" onClick={() => { const np=[...photoPreviews]; const nf=[...photoFiles]; [np[i],np[i-1]]=[np[i-1],np[i]]; [nf[i],nf[i-1]]=[nf[i-1],nf[i]]; setPhotoPreviews(np); setPhotoFiles(nf) }} style={{position:'absolute',top:'2px',left:'2px',background:'rgba(0,0,0,0.65)',color:'white',border:'none',borderRadius:'50%',width:'18px',height:'18px',fontSize:'11px',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </label>

        <div className="form-group">
          <label className="form-label">Product Name *</label>
          <input className="form-input" value={form.name} onChange={e => set('name', e.target.value)} placeholder="e.g. Ankara Dress"/>
        </div>
        <div className="form-group">
          <label className="form-label">Price (MWK) *</label>
          <input className="form-input" type="number" value={form.price} onChange={e => set('price', e.target.value)} placeholder="e.g. 8500"/>
        </div>
        <div className="form-group">
          <label className="form-label">Sale Price / Compare-at (MWK) <span style={{fontWeight:400,color:"var(--gray)"}}>optional — shows strikethrough original price</span></label>
          <input className="form-input" type="number" value={form.compareAtPrice||''} onChange={e => set('compareAtPrice', e.target.value)} placeholder="e.g. 10000 (original price before discount)"/>
        </div>
        <div className="form-group">
          <label className="form-label">Variants <span style={{fontWeight:400,color:"var(--gray)"}}>optional — e.g. sizes or colours</span></label>
          <VariantGroupBuilder variantGroups={variantGroups} setVariantGroups={setVariantGroups} />
        </div>
        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea className="form-input" value={form.description} onChange={e => set('description', e.target.value)} placeholder="Describe your product — size, condition, colour..." rows={3}/>
        </div>

        <div className="form-group">
          <label className="form-label">Category *</label>
          <div className="cat-select-grid">
            {CATS.map(c => (
              <div key={c} className={`cat-select-btn${selectedCat===c?' selected':''}`} onClick={() => setSelectedCat(c)}>{c}</div>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Your Phone Number</label>
          <input className="form-input" value={form.phone} onChange={e => set('phone', e.target.value)} placeholder="+265 9xx xxx xxx"/>
        </div>
        <div className="form-group">
          <label className="form-label">Your Location on Campus</label>
          <input className="form-input" value={form.location} onChange={e => set('location', e.target.value)} placeholder="e.g. Block C Hostel, UNIMA"/>
        </div>
        <div className="form-group">
          <label className="form-label">University *</label>
          <select className="form-input" value={form.university} onChange={e => set('university', e.target.value)}>
            <option value="">Select your university</option>
            {UNIS.map(u => <option key={u}>{u}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Delivery Available?</label>
          <select className="form-input" value={form.delivery} onChange={e => set('delivery', e.target.value)}>
            <option value="">Select...</option>
            <option>Yes — I deliver to hostels</option>
            <option>Pickup only — buyer collects</option>
            <option>Both delivery & pickup available</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Estimated Delivery Time</label>
          <select className="form-input" value={form.deliveryTime} onChange={e => set('deliveryTime', e.target.value)}>
            <option value="">Select...</option>
            <option>Within 1 hour</option>
            <option>Same day (2–5 hours)</option>
            <option>Next day</option>
            <option>2–3 days</option>
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Delivery Fee (MWK)</label>
          <input className="form-input" type="number" value={form.deliveryFee} onChange={e => set('deliveryFee', e.target.value)} placeholder="e.g. 200 (or leave blank for free)"/>
        </div>
        <div className="form-group">
          <label className="form-label">Open Hours</label>
          <input className="form-input" value={form.hours} onChange={e => set('hours', e.target.value)} placeholder="e.g. Mon–Sat 8am–7pm"/>
        </div>

        <button className="btn-primary" style={{width:'100%',justifyContent:'center',padding:'13px'}} onClick={submit} disabled={loading}>
          {loading ? 'Listing product...' : 'List Product →'}
        </button>
        </>)}
      </div>
      <Footer />
    </div>
  )
}
