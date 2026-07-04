import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { useSEO } from '../lib/useSEO'

export default function Terms() {
  useSEO({ title: 'Terms of Service', description: 'Wolf Business Platform Terms of Service and User Agreement.' })
  return (
    <div>
      <Navbar />
      <div style={{maxWidth:'720px',margin:'0 auto',padding:'100px 20px 60px',lineHeight:1.7}}>
        <h1 style={{fontWeight:900,fontSize:'28px',marginBottom:'8px'}}>Terms of Service</h1>
        <p style={{color:'var(--gray)',fontSize:'13px',marginBottom:'32px'}}>Last updated: June 2026</p>

        {[
          {
            title: '1. Acceptance of Terms',
            body: 'By accessing or using Wolf Business Platform ("the Platform"), you agree to be bound by these Terms of Service. If you do not agree, please do not use the Platform. Wolf Business Platform is operated for students and staff of accredited Malawian universities.'
          },
          {
            title: '2. User Accounts',
            body: 'You must register with a valid email address. You are responsible for maintaining the confidentiality of your account credentials. You must be at least 16 years old to create an account. Wolf Business Platform reserves the right to suspend or terminate accounts that violate these terms.'
          },
          {
            title: '3. Buying and Selling',
            body: 'Wolf Business Platform is a peer-to-peer marketplace. We do not hold inventory or ship goods. Buyers and vendors transact directly. Vendors are responsible for the accuracy of product listings, including descriptions, prices, photos, and availability. Buyers are responsible for verifying product details before purchase.'
          },
          {
            title: '4. Payments',
            body: 'Payments are processed via PayChangu using Airtel Money and TNM Mpamba. Wolf Business Platform is not responsible for failed transactions due to insufficient funds, network outages, or incorrect mobile numbers. All prices are listed in Malawian Kwacha (MWK).'
          },
          {
            title: '5. Prohibited Items',
            body: 'The following are strictly prohibited on Wolf Business Platform: illegal goods or services, stolen property, counterfeit goods, weapons, drugs or controlled substances, alcohol sold to minors, and anything violating Malawian law. Violations will result in immediate account termination and may be reported to authorities.'
          },
          {
            title: '6. Disputes',
            body: 'In the event of a dispute between a buyer and vendor, Wolf Business Platform may act as a mediator but is not obligated to resolve disputes. We may issue refunds at our discretion for verified cases of fraud or non-delivery. Dispute requests must be submitted within 7 days of the expected delivery date.'
          },
          {
            title: '7. Limitation of Liability',
            body: 'Wolf Business Platform is provided "as is". We do not guarantee uninterrupted service, the quality or safety of goods listed, or the accuracy of vendor information. To the fullest extent permitted by law, Wolf Business Platform shall not be liable for any indirect, incidental, or consequential damages.'
          },
          {
            title: '8. Changes to Terms',
            body: 'We may update these Terms at any time. Continued use of the Platform after changes constitutes acceptance of the new Terms. We will notify users of significant changes via the Platform.'
          },
          {
            title: '9. Contact',
            body: 'For questions about these Terms, contact us at legal@wolfmarketplace.mw or via the Help Center.'
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
