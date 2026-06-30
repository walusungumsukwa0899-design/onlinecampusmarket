import { useState } from 'react'
import Footer from '../components/Footer'
import { WHATSAPP_NUMBERS } from '../lib/whatsapp'
import './ReportIssue.css'

const ISSUE_TYPES = [
  'Order problem (wrong/missing item)',
  'Vendor scam or fraud',
  'Harassment or unsafe behavior',
  'Fake or misleading product listing',
  'Payment issue',
  'App bug',
  'Other',
]

export default function ReportIssue() {
  const [form, setForm] = useState({ type: ISSUE_TYPES[0], orderId: '', contact: '', details: '' })
  const [waNumber, setWaNumber] = useState(WHATSAPP_NUMBERS[0].value)
  const [sent, setSent] = useState(false)

  function set(key, val) { setForm(f => ({ ...f, [key]: val })) }

  function handleSubmit() {
    if (!form.contact.trim() || !form.details.trim()) {
      alert('Please add your phone/email and describe what happened.')
      return
    }
    const lines = [
      'New issue report from Wolf Market site:',
      `Type: ${form.type}`,
      form.orderId.trim() ? `Order ID: ${form.orderId}` : null,
      `Contact: ${form.contact}`,
      `Details: ${form.details}`,
    ].filter(Boolean).join('\n')

    const url = `https://wa.me/${waNumber}?text=${encodeURIComponent(lines)}`
    window.open(url, '_blank')

    setSent(true)
    setForm({ type: ISSUE_TYPES[0], orderId: '', contact: '', details: '' })
    setTimeout(() => setSent(false), 5000)
  }

  return (
    <div className="page-wrap">
      <div className="container" style={{ padding: '48px 24px 64px' }}>
        <div className="section-header">
          <div className="eyebrow">Report an Issue</div>
          <h2 className="section-title">Tell Us What Happened</h2>
          <p className="section-sub">Every report is reviewed by our team. For your safety, never resolve scams or harassment directly with a vendor.</p>
        </div>

        <div className="report-form">
          <div className="form-group">
            <label className="form-label">Issue Type</label>
            <select className="form-input" value={form.type} onChange={e => set('type', e.target.value)}>
              {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Order ID (if applicable)</label>
            <input className="form-input" placeholder="e.g. WM-10234" value={form.orderId} onChange={e => set('orderId', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Phone or Email</label>
            <input className="form-input" placeholder="So we can follow up" value={form.contact} onChange={e => set('contact', e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">What happened?</label>
            <textarea className="form-input" placeholder="Describe the issue in as much detail as you can" value={form.details} onChange={e => set('details', e.target.value)} style={{ minHeight: 130 }} />
          </div>
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
          <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSubmit}>📱 Send Report via WhatsApp</button>
          {sent && <div className="success-msg">✅ Opening WhatsApp with your report…</div>}
        </div>

        <p className="report-emergency">In an emergency or immediate danger, please contact local authorities first.</p>
      </div>
      <Footer />
    </div>
  )
}
