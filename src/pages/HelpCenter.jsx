import { useState } from 'react'
import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import './HelpCenter.css'

const FAQS = [
  {
    category: 'Buying',
    items: [
      { q: 'How do I order something from a vendor?', a: 'Browse Vendors or a Campus Market, open a product, and tap Add to Cart. When you\'re ready, go to your Cart and pay — then message the vendor to arrange delivery or pickup.' },
      { q: 'What payment methods are accepted?', a: 'Airtel Money and TNM Mpamba are supported directly in the app at checkout.' },
      { q: 'Can I cancel an order after placing it?', a: 'Message the vendor directly as soon as possible — since they handle fulfillment themselves, cancellation depends on whether they\'ve already started preparing your order.' },
      { q: 'How do I arrange delivery or pickup?', a: 'After paying, open the vendor\'s store page and message them directly to agree on delivery or pickup. Wolf Market doesn\'t arrange delivery itself — each vendor handles their own.' },
    ],
  },
  {
    category: 'Selling',
    items: [
      { q: 'How do I become a vendor?', a: 'Tap Sell on Wolf in the footer or menu, fill in your shop details, and submit. Most applications are reviewed within 24 hours.' },
      { q: 'How do I list a new product?', a: 'From your Dashboard, go to Products and tap Add Product. Add a clear photo, price in MWK, and a short description.' },
      { q: 'When do I get paid for orders?', a: 'As soon as the buyer\'s payment is confirmed, your share is sent automatically to the payout number you set in Dashboard → Settings → Payout Details.' },
      { q: 'Can I message buyers directly?', a: 'Yes — buyers can message you from your seller profile to arrange delivery or pickup after they pay.' },
    ],
  },
  {
    category: 'Delivery & Payments',
    items: [
      { q: 'Does Wolf Market deliver my order?', a: 'No — Wolf Market handles payments only. Delivery or pickup is arranged directly between you and the vendor after you pay. See the Delivery page for details.' },
      { q: 'What if my payment fails?', a: 'Check your mobile money balance and PIN, then retry. If money was deducted but the order didn\'t go through, contact Support with your transaction ID.' },
      { q: 'Is there a delivery fee?', a: 'There\'s no Wolf Market delivery fee. Some vendors may charge their own fee for delivering to you, or ask you to pick up — agree on this with them directly before or after ordering.' },
    ],
  },
  {
    category: 'Account & Safety',
    items: [
      { q: 'How do I reset my password?', a: 'On the Sign In page, tap Forgot Password and follow the link sent to your registered email.' },
      { q: 'How do I report a vendor or a scam?', a: 'Use the Report Issue page in the footer, or tap Report on the vendor\'s profile. Our team reviews every report.' },
      { q: 'Is my personal information safe?', a: 'We only share your delivery details with the vendor fulfilling your order. See our Safety Policy for full details.' },
    ],
  },
]

export default function HelpCenter() {
  const [open, setOpen] = useState('Buying-0')

  return (
    <div className="page-wrap">
      <div className="container" style={{ padding: '48px 24px 64px' }}>
        <div className="section-header">
          <div className="eyebrow">Help Center</div>
          <h2 className="section-title">How Can We Help?</h2>
          <p className="section-sub">Answers to the most common questions about buying, selling, and using Wolf Market.</p>
        </div>

        {FAQS.map(group => (
          <div key={group.category} className="faq-group">
            <h3 className="faq-category">{group.category}</h3>
            <div className="faq-list">
              {group.items.map((item, i) => {
                const key = `${group.category}-${i}`
                const isOpen = open === key
                return (
                  <div key={key} className={`faq-item ${isOpen ? 'open' : ''}`}>
                    <button className="faq-question" onClick={() => setOpen(isOpen ? null : key)}>
                      <span>{item.q}</span>
                      <span className="faq-arrow">{isOpen ? '−' : '+'}</span>
                    </button>
                    {isOpen && <div className="faq-answer">{item.a}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        ))}

        <div className="faq-cta">
          <p>Still need help?</p>
          <Link to="/contact" className="btn-primary">Contact Support</Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
