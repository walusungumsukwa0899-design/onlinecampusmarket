/**
 * useSEO – dynamically updates <title>, <meta name="description">,
 * and Open Graph tags for any page.
 *
 * Usage:
 *   useSEO({ title: 'Shop | Wolf Marketplace', description: '...' })
 */
import { useEffect } from 'react'

const SITE = 'Wolf Marketplace'
const DEFAULT_IMG = '/icon-512.png'

export function useSEO({ title, description, image, url } = {}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE}` : SITE
    const desc = description || "Malawi's premier campus marketplace – buy, sell and discover products from student vendors across all universities."
    const img = image || DEFAULT_IMG
    const canonical = url || window.location.href

    document.title = fullTitle

    setMeta('name', 'description', desc)

    // Open Graph
    setMeta('property', 'og:title', fullTitle)
    setMeta('property', 'og:description', desc)
    setMeta('property', 'og:image', img)
    setMeta('property', 'og:url', canonical)
    setMeta('property', 'og:type', 'website')

    // Twitter
    setMeta('name', 'twitter:card', 'summary_large_image')
    setMeta('name', 'twitter:title', fullTitle)
    setMeta('name', 'twitter:description', desc)
    setMeta('name', 'twitter:image', img)

    return () => {
      document.title = SITE
    }
  }, [title, description, image, url])
}

function setMeta(attr, key, value) {
  let el = document.querySelector(`meta[${attr}="${key}"]`)
  if (!el) {
    el = document.createElement('meta')
    el.setAttribute(attr, key)
    document.head.appendChild(el)
  }
  el.setAttribute('content', value)
}
