import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useSEO } from '../lib/useSEO'

export default function Privacy() {
  useSEO({ title: 'Privacy Policy', description: 'How Wolf Marketplace collects, uses, and protects your personal data.' })
  return (
    <div>
      <Navbar />
      <div style={{maxWidth:'720px',margin:'0 auto',padding:'100px 20px 60px',lineHeight:1.7}}>
        <h1 style={{fontWeight:900,fontSize:'28px',marginBottom:'8px'}}>Privacy Policy</h1>
        <p style={{color:'var(--gray)',fontSize:'13px',marginBottom:'32px'}}>Last updated: June 2026</p>

        {[
          {
            title: '1. Information We Collect',
            body: 'We collect information you provide when registering (name, email, university, phone number), information generated when you use the Platform (orders, messages, reviews, product listings), and technical information (device type, browser, IP address) for security and analytics purposes.'
          },
          {
            title: '2. How We Use Your Information',
            body: 'We use your information to operate the Platform, process payments, facilitate communication between buyers and vendors, send notifications about your orders and messages, improve our services, and prevent fraud and abuse.'
          },
          {
            title: '3. Information Sharing',
            body: 'We share limited information between buyers and vendors to facilitate transactions (e.g. your delivery address is shared with the vendor you purchase from). We do not sell your personal data to third parties. We may share data with payment processors (PayChangu) and hosting providers (Supabase) as necessary to operate the Platform.'
          },
          {
            title: '4. Mobile Money Data',
            body: 'Mobile money numbers used for payments are processed by PayChangu and are subject to their privacy policy. Wolf Marketplace stores your saved mobile number (if you opt in) to speed up future checkouts. You can delete this at any time from your account settings.'
          },
          {
            title: '5. Push Notifications',
            body: 'If you grant push notification permission, we may send you notifications about orders, messages, and promotions. You can withdraw this permission at any time in your browser or device settings.'
          },
          {
            title: '6. Data Retention',
            body: 'We retain your account data for as long as your account is active. Order records are retained for 3 years for legal and accounting purposes. You may request deletion of your account and associated data by contacting privacy@wolfmarketplace.mw.'
          },
          {
            title: '7. Security',
            body: 'We use industry-standard security measures including encryption at rest and in transit, row-level security on our database, and regular security reviews. However, no system is 100% secure and we cannot guarantee absolute security.'
          },
          {
            title: '8. Your Rights',
            body: 'You have the right to access, correct, or delete your personal data. You may update your name, phone, and university in the Dashboard → Settings. For data deletion requests or data exports, contact privacy@wolfmarketplace.mw.'
          },
          {
            title: '9. Contact',
            body: 'For privacy questions or requests, email privacy@wolfmarketplace.mw. We aim to respond within 5 business days.'
          },
        ].map(s => (
          <div key={s.title} style={{marginBottom:'28px'}}>
            <h2 style={{fontWeight:800,fontSize:'17px',marginBottom:'8px'}}>{s.title}</h2>
            <p style={{color:'var(--gray)',fontSize:'15px'}}>{s.body}</p>
          </div>
        ))}
      </div>
      <Footer />
    </div>
  )
}
