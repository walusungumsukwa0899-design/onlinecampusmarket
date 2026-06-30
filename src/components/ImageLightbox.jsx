import { useEffect } from 'react'

export default function ImageLightbox({ images, activeIndex, onClose, onPrev, onNext }) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') onPrev()
      if (e.key === 'ArrowRight') onNext()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose, onPrev, onNext])

  if (!images?.length) return null
  const src = images[activeIndex]

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)',
      zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: '16px', right: '20px',
        background: 'rgba(255,255,255,.15)', border: 'none', color: 'white',
        borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>✕</button>

      {/* Counter */}
      {images.length > 1 && (
        <div style={{
          position: 'absolute', top: '20px', left: '50%', transform: 'translateX(-50%)',
          color: 'rgba(255,255,255,.7)', fontSize: '13px', fontWeight: 600
        }}>{activeIndex + 1} / {images.length}</div>
      )}

      {/* Prev */}
      {images.length > 1 && (
        <button onClick={e => { e.stopPropagation(); onPrev() }} style={{
          position: 'absolute', left: '16px', background: 'rgba(255,255,255,.15)',
          border: 'none', color: 'white', borderRadius: '50%', width: '44px', height: '44px',
          fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>‹</button>
      )}

      {/* Image */}
      <img onClick={e => e.stopPropagation()} src={src} alt=""
        style={{ maxWidth: '92vw', maxHeight: '88vh', objectFit: 'contain', borderRadius: '8px' }} />

      {/* Next */}
      {images.length > 1 && (
        <button onClick={e => { e.stopPropagation(); onNext() }} style={{
          position: 'absolute', right: '16px', background: 'rgba(255,255,255,.15)',
          border: 'none', color: 'white', borderRadius: '50%', width: '44px', height: '44px',
          fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>›</button>
      )}

      {/* Thumbnails */}
      {images.length > 1 && (
        <div onClick={e => e.stopPropagation()} style={{
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: '8px'
        }}>
          {images.map((img, i) => (
            <img key={i} src={img} alt="" onClick={() => onNext(i - activeIndex)}
              style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '6px',
                border: i === activeIndex ? '2px solid #E8630A' : '2px solid rgba(255,255,255,.3)',
                cursor: 'pointer', opacity: i === activeIndex ? 1 : 0.6, transition: 'all .15s' }} />
          ))}
        </div>
      )}
    </div>
  )
}
