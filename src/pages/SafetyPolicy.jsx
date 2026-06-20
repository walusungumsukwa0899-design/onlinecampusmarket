import { Link } from 'react-router-dom'
import Footer from '../components/Footer'
import './SafetyPolicy.css'

const GUIDELINES = [
  {
    icon: '🤝',
    title: 'Meeting & Pickup Safety',
    points: [
      'Prefer delivery or well-lit, public campus locations for in-person pickups.',
      'Avoid sharing your hostel room number with vendors you don\'t know — use common areas or reception.',
      'Trust your instincts. If a meet-up feels off, cancel and report it.',
    ],
  },
  {
    icon: '💳',
    title: 'Payments',
    points: [
      'Only pay through Wolf Market\'s checkout (Airtel Money, TNM Mpamba, bank transfer) — never send money outside the app.',
      'Never share your mobile money PIN with anyone, including vendors or "support agents."',
      'Keep your transaction confirmation SMS until the order is delivered.',
    ],
  },
  {
    icon: '🛍️',
    title: 'Vendor & Product Trust',
    points: [
      'Check vendor ratings and reviews before ordering, especially for new sellers.',
      'Verify product photos and descriptions match what\'s being sold.',
      'Be cautious of deals that seem too good to be true — report suspicious listings.',
    ],
  },
  {
    icon: '🔒',
    title: 'Account Security',
    points: [
      'Use a strong, unique password and don\'t share your login with anyone.',
      'We will never ask for your password via WhatsApp, SMS, or email.',
      'Sign out of shared or public devices after use.',
    ],
  },
  {
    icon: '🚩',
    title: 'Reporting Problems',
    points: [
      'Use Report Issue for scams, harassment, fake products, or unsafe behavior.',
      'Reports are reviewed by our team and serious cases may lead to account suspension.',
      'In an emergency or immediate danger, contact local authorities first.',
    ],
  },
]

export default function SafetyPolicy() {
  return (
    <div className="page-wrap">
      <div className="container" style={{ padding: '48px 24px 64px' }}>
        <div className="section-header">
          <div className="eyebrow">Safety Policy</div>
          <h2 className="section-title">Staying Safe on Wolf Market</h2>
          <p className="section-sub">Simple guidelines to help you buy and sell safely across Malawi's campuses.</p>
        </div>

        <div className="safety-grid">
          {GUIDELINES.map(g => (
            <div key={g.title} className="safety-card">
              <div className="safety-icon">{g.icon}</div>
              <h3>{g.title}</h3>
              <ul>
                {g.points.map((p, i) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          ))}
        </div>

        <div className="safety-note">
          <strong>Spotted something unsafe?</strong>
          <p>Don't hesitate to report it. Every report helps keep the Wolf Market community safe.</p>
          <Link to="/report" className="btn-primary">Report an Issue</Link>
        </div>
      </div>
      <Footer />
    </div>
  )
}
