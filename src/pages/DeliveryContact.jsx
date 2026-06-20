import { useState } from 'react'
import Footer from '../components/Footer'
import { WHATSAPP_NUMBERS } from '../lib/whatsapp'
import './DeliveryContact.css'

export function Delivery() {
  return (
    <div className="page-wrap">
      <div className="delivery-hero">
        <h1>Fast <span>Delivery</span><br/>to Your Hostel</h1>
        <p>Order anything on campus and get it delivered straight to your door — same day.</p>
      </div>
      <div className="steps-section">
        <div className="container">
          <div className="section-header"><div className="eyebrow">How It Works</div><h2 className="section-title">4 Simple Steps</h2></div>
          <div className="steps-grid">
            {[
              {n:1,title:'Browse & Order',desc:'Find what you need from campus vendors and place your order in seconds.'},
              {n:2,title:'Pay via Mobile',desc:'Pay securely with Airtel Money or TNM Mpamba. No bank card required.'},
              {n:3,title:'Track Your Order',desc:'Get updates as your order is prepared and dispatched to you.'},
              {n:4,title:'Delivered!',desc:'Your order arrives at your hostel room. Rate the vendor after.'},
            ].map(s => (
              <div key={s.n} className="step-card">
                <div className="step-num">{s.n}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="zones-section">
        <div className="container">
          <div className="section-header"><div className="eyebrow">Coverage Areas</div><h2 className="section-title">Delivering Across Malawi</h2></div>
          <div className="zones-grid">
            {[
              {name:'UNIMA',loc:'Zomba',time:'30–60 min',fee:'MWK 300'},
              {name:'The Polytechnic',loc:'Blantyre',time:'30–60 min',fee:'MWK 300'},
              {name:'Mzuzu University',loc:'Mzuzu',time:'30–60 min',fee:'MWK 300'},
              {name:'MUST',loc:'Thyolo',time:'30–60 min',fee:'MWK 300'},
              {name:'College of Medicine',loc:'Blantyre',time:'45–90 min',fee:'MWK 400'},
              {name:'Catholic University',loc:'Balaka',time:'45–90 min',fee:'MWK 400'},
              {name:'MUBAS',loc:'Blantyre',time:'45–90 min',fee:'MWK 400'},
              {name:'LUANAR',loc:'Lilongwe',time:'45–90 min',fee:'MWK 400'},
            ].map(z => (
              <div key={z.name} className="zone-card">
                <div className="zone-icon">🎓</div>
                <div className="zone-name">{z.name}</div>
                <div className="zone-loc">{z.loc}</div>
                <div className="zone-time">{z.time}</div>
                <div className="zone-fee">{z.fee} delivery</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  )
}

export function Contact() {
  const [form, setForm] = useState({ name: '', contact: '', subject: '', message: '' })
  const [waNumber, setWaNumber] = useState(WHATSAPP_NUMBERS[0].value)
  const [sent, setSent] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handleSend() {
    if (!form.name.trim() || !form.contact.trim() || !form.message.trim()) {
      alert('Please fill in your name, phone/email, and message.')
      return
    }
    const lines = [
      'New message from Wolf Market site:',
      `Name: ${form.name}`,
      `Contact: ${form.contact}`,
      form.subject.trim() ? `Subject: ${form.subject}` : null,
      `Message: ${form.message}`,
    ].filter(Boolean).join('\n')

    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines)}`
    window.open(url, '_blank')

    setSent(true)
    setForm({ name: '', contact: '', subject: '', message: '' })
    setTimeout(() => setSent(false), 5000)
  }

  return (
    <div className="page-wrap">
      <div className="container" style={{padding:'48px 24px 64px'}}>
        <div className="section-header">
          <div className="eyebrow">Get in Touch</div>
          <h2 className="section-title">We're Here to Help</h2>
          <p className="section-sub">Questions about buying, selling, or delivery? Reach us anytime.</p>
        </div>
        <div className="contact-layout">
          <div className="contact-info">
            {[
              {icon:'📍',label:'Location',val:'Malawi · Operating Nationwide'},
              {icon:'📱',label:'WhatsApp',val:'+265 998 531 738 · +265 882 966 086'},
              {icon:'📧',label:'Email',val:'lawolf22005@gmail.com'},
              {icon:'⏰',label:'Support Hours',val:'Mon–Sat, 7am – 9pm'},
            ].map(c => (
              <div key={c.label} className="contact-item">
                <div className="contact-icon">{c.icon}</div>
                <div>
                  <div className="contact-label">{c.label}</div>
                  <div className="contact-val">{c.val}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="contact-form">
            <h3>Send a Message</h3>
            <div className="form-group"><label className="form-label">Full Name</label><input className="form-input" placeholder="Your name" value={form.name} onChange={e => set('name', e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Phone or Email</label><input className="form-input" placeholder="+265 or email" value={form.contact} onChange={e => set('contact', e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Subject</label><input className="form-input" placeholder="What's this about?" value={form.subject} onChange={e => set('subject', e.target.value)}/></div>
            <div className="form-group"><label className="form-label">Message</label><textarea className="form-input" placeholder="How can we help?" value={form.message} onChange={e => set('message', e.target.value)}/></div>
            <div className="form-group">
              <label className="form-label">Send to</label>
              <div className="wa-number-picker">
                {WHATSAPP_NUMBERS.map(n => (
                  <button
                    key={n.value}
                    type="button"
                    className={`wa-chip ${waNumber === n.value ? 'active' : ''}`}
                    onClick={() => setWaNumber(n.value)}
                  >
                    {n.label}
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-primary" style={{width:'100%',justifyContent:'center'}} onClick={handleSend}>📱 Send via WhatsApp</button>
            {sent && <div className="success-msg">✅ Opening WhatsApp with your message…</div>}
          </div>
        </div>
      </div>
      <Footer/>
    </div>
  )
}
