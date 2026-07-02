import { supabase } from './supabase'

const KEY = 'wolf_recently_viewed'
const MAX_ENTRIES = 10

// Call this when a product page loads — just stores the id + timestamp,
// nothing else, so there's no stale name/price/image_url to go bad later.
export function addRecentlyViewed(productId) {
  try {
    const prev = JSON.parse(localStorage.getItem(KEY) || '[]')
    const ids = Array.isArray(prev) && typeof prev[0] === 'object'
      ? prev.map(x => x.id) // migrate old snapshot format if present
      : prev
    const updated = [productId, ...ids.filter(id => id !== productId)].slice(0, MAX_ENTRIES)
    localStorage.setItem(KEY, JSON.stringify(updated))
  } catch {}
}

// Call this wherever recently-viewed products are displayed.
// Re-fetches live rows from Supabase so deleted/edited products never
// show stale data, then prunes any ids that no longer exist/are unavailable.
export async function getRecentlyViewed(limit = 4) {
  let ids = []
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    ids = Array.isArray(raw) && typeof raw[0] === 'object' ? raw.map(x => x.id) : raw
  } catch {}
  if (!ids.length) return []

  const { data, error } = await supabase
    .from('products')
    .select('*, vendors(name)')
    .in('id', ids)
    .eq('available', true)

  if (error || !data) return []

  // Preserve most-recently-viewed-first order, drop any id no longer found
  const byId = Object.fromEntries(data.map(p => [p.id, p]))
  const ordered = ids.map(id => byId[id]).filter(Boolean)

  // Prune the pruned/dead ids out of localStorage so it self-heals
  try {
    localStorage.setItem(KEY, JSON.stringify(ordered.map(p => p.id)))
  } catch {}

  return ordered.slice(0, limit)
}
