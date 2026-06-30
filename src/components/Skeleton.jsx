import './Skeleton.css'

export function SkeletonCard() {
  return (
    <div className="sk-card">
      <div className="sk-img sk-pulse"/>
      <div className="sk-body">
        <div className="sk-line sk-pulse" style={{width:'75%',height:'14px'}}/>
        <div className="sk-line sk-pulse" style={{width:'50%',height:'12px',marginTop:'6px'}}/>
        <div className="sk-line sk-pulse" style={{width:'40%',height:'16px',marginTop:'8px'}}/>
        <div className="sk-line sk-pulse" style={{width:'100%',height:'32px',marginTop:'10px',borderRadius:'8px'}}/>
      </div>
    </div>
  )
}

export function SkeletonVendorCard() {
  return (
    <div className="sk-vendor sk-pulse"/>
  )
}

export function SkeletonOrderRow() {
  return (
    <div className="sk-order-row">
      <div className="sk-circle sk-pulse"/>
      <div style={{flex:1}}>
        <div className="sk-line sk-pulse" style={{width:'60%',height:'14px'}}/>
        <div className="sk-line sk-pulse" style={{width:'40%',height:'12px',marginTop:'6px'}}/>
      </div>
      <div className="sk-line sk-pulse" style={{width:'70px',height:'24px',borderRadius:'20px'}}/>
    </div>
  )
}

export function SkeletonGrid({ count = 4 }) {
  return (
    <div className="products-grid">
      {Array.from({ length: count }).map((_, i) => <SkeletonCard key={i}/>)}
    </div>
  )
}

export function SkeletonList({ count = 5 }) {
  return (
    <div className="orders-list">
      {Array.from({ length: count }).map((_, i) => <SkeletonOrderRow key={i}/>)}
    </div>
  )
}
