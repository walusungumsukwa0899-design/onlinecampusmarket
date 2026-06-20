import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/AuthContext'
import Footer from '../components/Footer'
import './Sell.css'

const CATS = ['Fashion','Electronics','Food & Drinks','Books','Stationery','Health','Home & Living','Beauty','Sports','Auto Parts','Services','Other']
const UNIS = ['UNIMA','The Polytechnic','Mzuzu University','MUST','College of Medicine','Catholic University of Malawi','MUBAS','LUANAR','Malawi Adventist University','Livingstonia University','Daeyang Luke University','NIPA','Other']

export default function Sell() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [photoPreviews, setPhotoPreviews] = useState([])
  const [photoFiles, setPhotoFiles] = useState([])
  const [selectedCat, setSelectedCat] = useState('')
  const [form, setForm] = useState({
    name:'', price:'', description:'', phone:'', location:'', university:'',
    delivery:'', deliveryTime:'', deliveryFee:'', hours:''
  })

  function set(key, val) { setForm(f => ({...f, [key]: val})) }

  function handlePhotos(e) {
    const files = Array.from(e.target.files).slice(0, 5)
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
    let { data: vendor } = await supabase.from('vendors').select('id').eq('user_id', user.id).single()
    if (!vendor) {
      const { data: newVendor } = await supabase.from('vendors').insert({
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
      vendor = newVendor
    }

    // Upload first photo
    let imageUrl = null
    if (photoFiles.length > 0) {
      const path = `products/${vendor.id}-${Date.now()}`
      await supabase.storage.from('product-images').upload(path, photoFiles[0])
      const { data } = supabase.storage.from('product-images').getPublicUrl(path)
      imageUrl = data.publicUrl
    }

    await supabase.from('products').insert({
      vendor_id: vendor.id,
      name: form.name,
      price: parseInt(form.price),
      description: form.description,
      category: selectedCat,
      image_url: imageUrl,
      available: true,
    })

    setLoading(false)
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
          <button className="btn-primary" onClick={() => { setSuccess(false); setForm({name:'',price:'',description:'',phone:'',location:'',university:'',delivery:'',deliveryTime:'',deliveryFee:'',hours:''}); setSelectedCat(''); setPhotoPreviews([]); setPhotoFiles([]) }}>List Another</button>
          <button className="btn-outline" onClick={() => navigate('/shop')}>View Marketplace</button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="sell-page">
      <div className="sell-container">
        <h2>List Your Product</h2>
        <p className="sell-sub">Add your items to Wolf Marketplace and start selling to students on your campus.</p>

        {/* Photo upload */}
        <label className="photo-upload-area" htmlFor="product-photos">
          <div className="upload-icon">📸</div>
          <div className="upload-text">Tap to upload product photos</div>
          <div className="upload-sub">Upload from your gallery — up to 5 photos</div>
          <input id="product-photos" type="file" accept="image/*" multiple onChange={handlePhotos} style={{display:'none'}}/>
          {photoPreviews.length > 0 && (
            <div className="photo-previews">
              {photoPreviews.map((url, i) => <img key={i} src={url} alt="" className="preview-img"/>)}
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
      </div>
      <Footer />
    </div>
  )
}
