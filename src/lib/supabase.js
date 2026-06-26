import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Startup environment check — shows a clear error instead of a silent crash
if (!supabaseUrl || !supabaseAnonKey) {
  const missing = [
    !supabaseUrl && 'VITE_SUPABASE_URL',
    !supabaseAnonKey && 'VITE_SUPABASE_ANON_KEY',
  ].filter(Boolean).join(' and ')

  console.error(
    `[Wolf Marketplace] ⚠️  Missing env variable(s): ${missing}.\n` +
    `Add them in Vercel → Settings → Environment Variables, then redeploy.\n` +
    `Local: create a .env.local file with these values.`
  )

  // Render a visible banner in the DOM so the blank-screen problem is diagnosable
  if (typeof document !== 'undefined' && document.readyState !== 'loading') {
    const banner = document.createElement('div')
    banner.id = 'env-error-banner'
    banner.innerHTML = `
      <div style="font-family:sans-serif;background:#fff7ed;border-bottom:2px solid #E8630A;padding:16px 24px;font-size:14px;color:#92400e;display:flex;gap:12px;align-items:flex-start;">
        <span style="font-size:20px">⚠️</span>
        <div>
          <strong>Wolf Marketplace — configuration required</strong><br/>
          Missing environment variable(s): <code style="background:#fed7aa;padding:2px 6px;border-radius:4px">${missing}</code><br/>
          Add them in <strong>Vercel → Settings → Environment Variables</strong> and redeploy.
          For local dev, add them to <code>.env.local</code>.
        </div>
      </div>`
    document.body.prepend(banner)
  }
}

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    }
  }
)
