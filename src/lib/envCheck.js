// Called once at app startup — validates required env vars
const REQUIRED = [
  ['VITE_SUPABASE_URL', 'Supabase project URL'],
  ['VITE_SUPABASE_ANON_KEY', 'Supabase anon key'],
]

export function checkEnv() {
  const missing = REQUIRED.filter(([key]) => !import.meta.env[key])
  if (missing.length === 0) return

  const msg = [
    '🐺 Wolf Marketplace — Missing environment variables:',
    ...missing.map(([key, desc]) => `  • ${key}  (${desc})`),
    '',
    'Create a .env.local file with these values.',
    'See .env.example for reference.',
  ].join('\n')

  console.error(msg)

  // Show a visible banner in the DOM
  const banner = document.createElement('div')
  banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#dc2626;color:white;padding:16px 24px;font-family:monospace;font-size:13px;z-index:99999;white-space:pre-line;line-height:1.6'
  banner.textContent = msg
  document.body.prepend(banner)
}
