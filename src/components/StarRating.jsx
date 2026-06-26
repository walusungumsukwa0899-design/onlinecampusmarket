// Renders filled/empty stars for a given numeric rating
export function StarRating({ rating, count, size = 12 }) {
  if (!rating || rating === 0) return null
  const full = Math.floor(rating)
  const half = rating - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
      <div style={{ display: 'flex', lineHeight: 1 }}>
        {'★'.repeat(full).split('').map((_, i) => <span key={i} style={{ color: '#f59e0b', fontSize: `${size}px` }}>★</span>)}
        {half && <span style={{ color: '#f59e0b', fontSize: `${size}px` }}>½</span>}
        {'★'.repeat(empty).split('').map((_, i) => <span key={i} style={{ color: '#d1d5db', fontSize: `${size}px` }}>★</span>)}
      </div>
      <span style={{ fontSize: `${size - 1}px`, color: '#6b7280', fontWeight: 600 }}>
        {Number(rating).toFixed(1)}{count !== undefined ? ` (${count})` : ''}
      </span>
    </div>
  )
}
