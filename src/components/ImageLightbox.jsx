import { useEffect, useRef, useState } from 'react'

export default function ImageLightbox({ images, activeIndex, onClose, onPrev, onNext, title, description }) {
  const [scale, setScale] = useState(1)
  const [pos, setPos] = useState({ x: 0, y: 0 })
  const dragRef = useRef(null) // { startX, startY, origX, origY }
  const pinchRef = useRef(null) // { startDist, startScale }

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

  // Reset zoom/pan whenever the photo changes
  useEffect(() => { setScale(1); setPos({ x: 0, y: 0 }) }, [activeIndex])

  if (!images?.length && !title && !description) return null
  const hasImages = images?.length > 0
  const src = hasImages ? images[activeIndex] : null

  function clampScale(s) { return Math.min(4, Math.max(1, s)) }

  function toggleZoom(e) {
    e.stopPropagation()
    setScale(s => (s > 1 ? 1 : 2.5))
    setPos({ x: 0, y: 0 })
  }

  function onWheel(e) {
    e.stopPropagation()
    e.preventDefault()
    setScale(s => clampScale(s - e.deltaY * 0.0015))
  }

  // Mouse/touch drag-to-pan (only meaningful once zoomed in)
  function onPointerDown(e) {
    if (scale <= 1) return
    e.stopPropagation()
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: pos.x, origY: pos.y }
  }
  function onPointerMove(e) {
    if (!dragRef.current) return
    e.stopPropagation()
    const dx = e.clientX - dragRef.current.startX
    const dy = e.clientY - dragRef.current.startY
    setPos({ x: dragRef.current.origX + dx, y: dragRef.current.origY + dy })
  }
  function onPointerUp() { dragRef.current = null }

  // Pinch-to-zoom (two-finger touch)
  function dist(touches) {
    const [a, b] = touches
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY)
  }
  function onTouchStart(e) {
    if (e.touches.length === 2) {
      e.stopPropagation()
      pinchRef.current = { startDist: dist(e.touches), startScale: scale }
    }
  }
  function onTouchMove(e) {
    if (e.touches.length === 2 && pinchRef.current) {
      e.stopPropagation()
      e.preventDefault()
      const ratio = dist(e.touches) / pinchRef.current.startDist
      setScale(clampScale(pinchRef.current.startScale * ratio))
    }
  }
  function onTouchEnd(e) {
    if (e.touches.length < 2) pinchRef.current = null
  }

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,.92)',
      zIndex: 9999, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
    }}>
      {/* Close */}
      <button onClick={onClose} style={{
        position: 'absolute', top: '16px', right: '20px',
        background: 'rgba(255,255,255,.15)', border: 'none', color: 'white',
        borderRadius: '50%', width: '40px', height: '40px', fontSize: '20px',
        cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2
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
          position: 'absolute', left: '16px', top: '45%', background: 'rgba(255,255,255,.35)',
          border: '1.5px solid rgba(255,255,255,.6)', color: 'white', borderRadius: '50%', width: '48px', height: '48px',
          fontSize: '24px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
          boxShadow: '0 2px 10px rgba(0,0,0,.4)'
        }}>‹</button>
      )}

      {/* Image — click/double-click to zoom, drag to pan once zoomed, pinch on touch, wheel on desktop */}
      {hasImages ? (
        <div
          style={{ flex: 1, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', touchAction: 'none' }}
          onClick={e => e.stopPropagation()}
          onWheel={onWheel}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <img
            src={src} alt={title || ''}
            onDoubleClick={toggleZoom}
            draggable={false}
            style={{
              maxWidth: '92vw', maxHeight: description || title ? '38vh' : '78vh', objectFit: 'contain', borderRadius: '8px',
              transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
              cursor: scale > 1 ? 'grab' : 'zoom-in',
              transition: dragRef.current ? 'none' : 'transform .15s ease-out',
            }}
          />
        </div>
      ) : (
        <div style={{ flex: 1, width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,.3)' }}>
          <div style={{ fontSize: '52px', marginBottom: '10px' }}>📦</div>
          <div style={{ fontSize: '12px' }}>No photo uploaded</div>
        </div>
      )}

      {images.length > 1 && (
        <button onClick={e => { e.stopPropagation(); onNext() }} style={{
          position: 'absolute', right: '16px', top: '45%', background: 'rgba(255,255,255,.35)',
          border: '1.5px solid rgba(255,255,255,.6)', color: 'white', borderRadius: '50%', width: '48px', height: '48px',
          fontSize: '24px', fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2,
          boxShadow: '0 2px 10px rgba(0,0,0,.4)'
        }}>›</button>
      )}

      {/* Zoom hint */}
      {hasImages && scale === 1 && (
        <div style={{ position: 'absolute', bottom: images.length > 1 && !(title || description) ? '90px' : '4px', left: '50%', transform: 'translateX(-50%)', color: 'rgba(255,255,255,.5)', fontSize: '11px' }}>
          🔍 Double-tap or pinch to zoom
        </div>
      )}

      {/* Caption: title + description — always visible, never hidden behind a tap */}
      {(title || description) && (
        <div onClick={e => e.stopPropagation()} style={{
          width: '100%', maxWidth: '600px', padding: '18px 20px calc(18px + env(safe-area-inset-bottom))',
          background: 'rgba(20,20,20,.97)', borderTop: '1px solid rgba(255,255,255,.1)', flexShrink: 0,
          maxHeight: '48vh', overflowY: 'auto'
        }}>
          {title && <div style={{ color: 'white', fontWeight: 800, fontSize: '16px', marginBottom: description ? '10px' : 0 }}>{title}</div>}
          {description && <div style={{ color: 'rgba(255,255,255,.8)', fontSize: '14px', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{description}</div>}
        </div>
      )}

      {/* Thumbnails (only shown when there's no caption panel taking that space) */}
      {images.length > 1 && !(title || description) && (
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
