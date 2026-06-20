import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Footer from '../components/Footer'
import './Marketplaces.css'

const UNIS = [
  {id:'unima',name:'UNIMA',full:'University of Malawi',loc:'Zomba',type:'Public',emoji:'📚',color:'#0e1a12',vendors:48,products:320},
  {id:'poly',name:'The Polytechnic',full:'The Polytechnic',loc:'Blantyre',type:'Public',emoji:'⚙️',color:'#1a1a2e',vendors:62,products:410},
  {id:'mzuni',name:'Mzuzu University',full:'Mzuzu University',loc:'Mzuzu',type:'Public',emoji:'🌿',color:'#2e1a1a',vendors:35,products:220},
  {id:'must',name:'MUST',full:'Malawi University of Science & Technology',loc:'Thyolo',type:'Public',emoji:'🔭',color:'#1a2a2e',vendors:29,products:180},
  {id:'com',name:'College of Medicine',full:'College of Medicine',loc:'Blantyre',type:'Public',emoji:'💊',color:'#1a2e20',vendors:18,products:95},
  {id:'cau',name:'Catholic University',full:'Catholic University of Malawi',loc:'Balaka',type:'Private',emoji:'🕊️',color:'#2e2a1a',vendors:14,products:78},
  {id:'mau',name:'Malawi Adventist',full:'Malawi Adventist University',loc:'Ntcheu',type:'Private',emoji:'📖',color:'#1a2e28',vendors:10,products:54},
  {id:'luanar',name:'LUANAR',full:'Lilongwe University of Agriculture',loc:'Lilongwe',type:'Public',emoji:'🌾',color:'#2e2a1a',vendors:22,products:130},
  {id:'mubas',name:'MUBAS',full:'Malawi University of Business & Applied Sciences',loc:'Blantyre',type:'Public',emoji:'💼',color:'#1a1a2e',vendors:31,products:190},
  {id:'liuniv',name:'Livingstonia',full:'Livingstonia University',loc:'Mzuzu',type:'Private',emoji:'🏫',color:'#2e1a2a',vendors:9,products:45},
  {id:'daeyang',name:'Daeyang Luke',full:'Daeyang Luke University',loc:'Lilongwe',type:'Private',emoji:'🏥',color:'#1a2e1a',vendors:7,products:32},
  {id:'nipa',name:'NIPA',full:'National Institute of Public Administration',loc:'Lilongwe',type:'Public',emoji:'🏛️',color:'#2a1a2e',vendors:5,products:20},
]

export default function Marketplaces() {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('All')

  const list = filter === 'All' ? UNIS : UNIS.filter(u => u.type === filter)

  return (
    <div className="marketplaces-page">
      <div className="market-hero">
        <h1>Choose Your <span>Campus</span></h1>
        <p>Each university has its own marketplace. Shop local or browse all campuses at once.</p>
      </div>

      <div className="container">
        <div className="filter-bar">
          {['All','Public','Private'].map(f => (
            <button key={f} className={`filter-btn${filter===f?' active':''}`} onClick={() => setFilter(f)}>
              {f === 'All' ? '🌍 All Institutions' : f === 'Public' ? '🎓 Public Universities' : '🏫 Private / Faith'}
            </button>
          ))}
          <button className="filter-btn" onClick={() => navigate('/shop')}>🛍️ Browse All Products</button>
        </div>

        <div className="market-grid">
          {list.map(u => (
            <div key={u.id} className="market-card" onClick={() => navigate(`/shop?uni=${encodeURIComponent(u.full)}`)}>
              <div className="market-card-banner" style={{background:`linear-gradient(135deg,${u.color},${u.color}cc)`}}>
                <span className="market-emoji">{u.emoji}</span>
              </div>
              <div className="market-card-body">
                <div className="market-card-name">{u.name}</div>
                <div className="market-card-full">{u.full}</div>
                <div className="market-card-loc">📍 {u.loc} · <span className={`type-tag ${u.type.toLowerCase()}`}>{u.type}</span></div>
                <div className="market-card-stats">
                  <div className="mstat"><strong>{u.vendors}</strong><span>Vendors</span></div>
                  <div className="mstat"><strong>{u.products}</strong><span>Products</span></div>
                </div>
                <button className="market-card-btn">Shop {u.name} →</button>
              </div>
            </div>
          ))}
        </div>
      </div>
      <Footer />
    </div>
  )
}
