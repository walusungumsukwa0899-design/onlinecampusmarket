// Wolf Business Platform — Icon Generator
// Produces branded PNG icons with dark green bg + orange W mark.
//
// Option A: Uses 'canvas' npm package for full quality
//   npm install canvas
//   node scripts/generate-icons.cjs
//
// Option B: If canvas isn't available, run the Python fallback:
//   python3 scripts/generate-icons.py
//
// For production: replace outputs with your designer's artwork.

const fs = require('fs')
const path = require('path')

let canvas
try {
  canvas = require('canvas')
} catch {
  console.error('canvas not installed. Run: npm install canvas')
  console.log('Or use: python3 scripts/generate-icons.py')
  process.exit(1)
}

const { createCanvas } = canvas
const pub = path.join(__dirname, '../public')

function makeIcon(size, outPath, maskable = false) {
  const c = createCanvas(size, size)
  const ctx = c.getContext('2d')

  // Background gradient
  const radius = size * 0.22
  if (maskable) {
    ctx.fillStyle = '#0e1a12'
    ctx.fillRect(0, 0, size, size)
  } else {
    ctx.save()
    ctx.beginPath()
    ctx.roundRect(0, 0, size, size, radius)
    ctx.clip()
    const grad = ctx.createLinearGradient(0, 0, size, size)
    grad.addColorStop(0, '#0a1a0e')
    grad.addColorStop(1, '#1a3a20')
    ctx.fillStyle = grad
    ctx.fillRect(0, 0, size, size)
    ctx.restore()
  }

  // Orange glow
  const glow = ctx.createRadialGradient(size/2, size/2 - size*0.03, 0, size/2, size/2 - size*0.03, size*0.35)
  glow.addColorStop(0, 'rgba(232,99,10,0.25)')
  glow.addColorStop(1, 'rgba(232,99,10,0)')
  ctx.fillStyle = glow
  ctx.fillRect(0, 0, size, size)

  // W lettermark
  const stroke = Math.max(2, size / 18)
  ctx.strokeStyle = '#E8630A'
  ctx.lineWidth = stroke
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'

  const topY = size * 0.28
  const botY = size * 0.66
  const midY = size * 0.52
  const x1 = size * 0.22, x2 = size * 0.36, x3 = size * 0.5, x4 = size * 0.64, x5 = size * 0.78

  ctx.beginPath()
  ctx.moveTo(x1, topY)
  ctx.lineTo(x2, botY)
  ctx.lineTo(x3, midY)
  ctx.lineTo(x4, botY)
  ctx.lineTo(x5, topY)
  ctx.stroke()

  // Small dot
  const dotR = Math.max(2, size / 22)
  ctx.fillStyle = '#E8630A'
  ctx.beginPath()
  ctx.arc(size/2, size * 0.79, dotR, 0, Math.PI * 2)
  ctx.fill()

  fs.writeFileSync(outPath, c.toBuffer('image/png'))
  console.log(`✅ ${path.basename(outPath)} (${size}x${size})`)
}

console.log('Generating Wolf Business Platform icons...')
makeIcon(16,  path.join(pub, 'favicon-16.png'))
makeIcon(32,  path.join(pub, 'favicon-32.png'))
makeIcon(180, path.join(pub, 'apple-touch-icon.png'))
makeIcon(192, path.join(pub, 'icon-192.png'))
makeIcon(512, path.join(pub, 'icon-512.png'))
makeIcon(512, path.join(pub, 'icon-maskable-512.png'), true)
console.log('\nDone! Replace these with professional artwork for production.')
