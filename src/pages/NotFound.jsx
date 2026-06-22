import { useNavigate } from 'react-router-dom'

export default function NotFound() {
  const navigate = useNavigate()
  return (
    <div style={{minHeight:'80vh',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',textAlign:'center',padding:'40px 20px'}}>
      <div style={{fontSize:'80px',marginBottom:'16px'}}>🐺</div>
      <h1 style={{fontSize:'48px',fontWeight:900,margin:'0 0 8px'}}>404</h1>
      <h2 style={{fontSize:'20px',fontWeight:700,marginBottom:'12px'}}>Page Not Found</h2>
      <p style={{color:'var(--gray)',maxWidth:'360px',marginBottom:'28px'}}>
        This page doesn't exist or may have been moved. Head back to the marketplace.
      </p>
      <div style={{display:'flex',gap:'12px',flexWrap:'wrap',justifyContent:'center'}}>
        <button className="btn-primary" onClick={() => navigate('/')}>Go Home</button>
        <button className="btn-outline" onClick={() => navigate('/shop')}>Browse Shop</button>
      </div>
    </div>
  )
}
