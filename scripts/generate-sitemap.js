// Run: node scripts/generate-sitemap.js
// Generates public/sitemap.xml from live Supabase data
import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

const BASE_URL = process.env.VITE_APP_URL || 'https://wolfmarketplace.app'
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY)

const STATIC_ROUTES = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/vendors', priority: '0.9', changefreq: 'daily' },
  { url: '/marketplaces', priority: '0.8', changefreq: 'weekly' },
  { url: '/trending', priority: '0.8', changefreq: 'daily' },
  { url: '/search', priority: '0.7', changefreq: 'weekly' },
  { url: '/delivery', priority: '0.5', changefreq: 'monthly' },
  { url: '/contact', priority: '0.5', changefreq: 'monthly' },
  { url: '/terms', priority: '0.3', changefreq: 'yearly' },
  { url: '/privacy', priority: '0.3', changefreq: 'yearly' },
]

async function generate() {
  const { data: vendors } = await supabase.from('vendors').select('id, updated_at').eq('active', true)
  const { data: products } = await supabase.from('products').select('id, updated_at').eq('available', true)
  const now = new Date().toISOString().split('T')[0]
  const urls = [
    ...STATIC_ROUTES.map(r => `  <url>\n    <loc>${BASE_URL}${r.url}</loc>\n    <lastmod>${now}</lastmod>\n    <changefreq>${r.changefreq}</changefreq>\n    <priority>${r.priority}</priority>\n  </url>`),
    ...(vendors || []).map(v => `  <url>\n    <loc>${BASE_URL}/vendors/${v.id}</loc>\n    <lastmod>${v.updated_at?.split('T')[0] || now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.7</priority>\n  </url>`),
    ...(products || []).map(p => `  <url>\n    <loc>${BASE_URL}/products/${p.id}</loc>\n    <lastmod>${p.updated_at?.split('T')[0] || now}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.6</priority>\n  </url>`),
  ]
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>`
  fs.writeFileSync('public/sitemap.xml', xml)
  console.log(`Sitemap generated: ${urls.length} URLs`)
}
generate().catch(console.error)
