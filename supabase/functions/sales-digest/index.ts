import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { period = 'weekly' } = await req.json().catch(() => ({}))
    const daysBack = period === 'daily' ? 1 : 7
    const since = new Date(Date.now() - daysBack * 24 * 60 * 60 * 1000).toISOString()

    // Get all vendors with email
    const { data: vendors } = await supabaseAdmin
      .from('vendors')
      .select('id, name, user_id')
      .eq('active', true)

    if (!vendors?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders })

    const RESEND_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_KEY) return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500, headers: corsHeaders })

    let sent = 0

    for (const vendor of vendors) {
      // Get vendor email from auth
      const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(vendor.user_id)
      const email = authUser?.user?.email
      if (!email) continue

      // Get sales in period
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('*, products(name, icon)')
        .eq('vendor_id', vendor.id)
        .gte('created_at', since)
        .neq('status', 'cancelled')

      const total = (orders || []).reduce((a, o) => a + (o.total || 0), 0)
      const count = orders?.length || 0

      // Only send if there was activity OR it's weekly summary
      if (count === 0 && period === 'daily') continue

      // Product breakdown
      const productMap = new Map()
      for (const o of orders || []) {
        const k = o.product_id
        const e = productMap.get(k) || { name: o.products?.name || 'Product', icon: o.products?.icon || '📦', qty: 0, rev: 0 }
        e.qty += o.quantity || 1
        e.rev += o.total || 0
        productMap.set(k, e)
      }
      const topProducts = [...productMap.values()].sort((a, b) => b.rev - a.rev).slice(0, 5)

      // Low stock check
      const { data: lowStock } = await supabaseAdmin
        .from('products')
        .select('name, icon, stock_qty')
        .eq('vendor_id', vendor.id)
        .lte('stock_qty', 3)
        .gte('stock_qty', 0)
        .eq('available', true)

      const periodLabel = period === 'daily' ? 'Today' : 'This Week'
      const productRows = topProducts.map(p =>
        `<tr><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0">${p.icon} ${p.name}</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right">${p.qty} sold</td><td style="padding:8px 12px;border-bottom:1px solid #f0f0f0;text-align:right;font-weight:700;color:#E8630A">MWK ${p.rev.toLocaleString()}</td></tr>`
      ).join('')

      const lowStockRows = (lowStock || []).map(p =>
        `<li style="padding:4px 0;font-size:13px;color:#9a3412">${p.icon} ${p.name} — <strong>${p.stock_qty === 0 ? 'Out of stock' : `${p.stock_qty} left`}</strong></li>`
      ).join('')

      const html = `
<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f9fafb;margin:0;padding:24px">
  <div style="max-width:540px;margin:0 auto;background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#0e1a12,#1a3a20);padding:28px 32px;text-align:center">
      <div style="font-size:36px;margin-bottom:8px">🐺</div>
      <h1 style="color:white;font-size:20px;font-weight:900;margin:0">${periodLabel}'s Sales Summary</h1>
      <p style="color:rgba(255,255,255,.7);font-size:13px;margin:6px 0 0">${vendor.name}</p>
    </div>
    <div style="padding:28px 32px">
      <div style="display:flex;gap:16px;margin-bottom:28px">
        <div style="flex:1;background:#fff4ee;border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:24px;font-weight:900;color:#E8630A">${count}</div>
          <div style="font-size:12px;color:#6b7280;font-weight:600;margin-top:4px">Orders</div>
        </div>
        <div style="flex:1;background:#f0fdf4;border-radius:12px;padding:16px;text-align:center">
          <div style="font-size:18px;font-weight:900;color:#16a34a">MWK ${total.toLocaleString()}</div>
          <div style="font-size:12px;color:#6b7280;font-weight:600;margin-top:4px">Revenue</div>
        </div>
      </div>
      ${topProducts.length > 0 ? `
      <h3 style="font-size:14px;font-weight:800;margin:0 0 12px;color:#0e0e0e">Top Products</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;margin-bottom:24px">
        <thead><tr style="background:#f9fafb"><th style="padding:8px 12px;text-align:left;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase">Product</th><th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase">Sold</th><th style="padding:8px 12px;text-align:right;font-size:11px;color:#6b7280;font-weight:700;text-transform:uppercase">Revenue</th></tr></thead>
        <tbody>${productRows}</tbody>
      </table>` : `<p style="color:#6b7280;font-size:14px;text-align:center;padding:20px 0">No sales ${period === 'daily' ? 'today' : 'this week'} yet. Keep sharing your store!</p>`}
      ${lowStock?.length ? `
      <div style="background:#fff7ed;border:1.5px solid #fed7aa;border-radius:10px;padding:14px 16px;margin-bottom:20px">
        <div style="font-weight:800;font-size:13px;color:#c2410c;margin-bottom:8px">⚠️ Low Stock Alert</div>
        <ul style="margin:0;padding:0 0 0 16px">${lowStockRows}</ul>
      </div>` : ''}
      <a href="${Deno.env.get('APP_URL') || 'https://wolfmarketplace.app'}/dashboard?tab=analytics" style="display:block;background:#E8630A;color:white;text-align:center;padding:14px;border-radius:10px;font-weight:700;font-size:14px;text-decoration:none">View Full Analytics →</a>
    </div>
    <div style="background:#f9fafb;padding:16px 32px;text-align:center;font-size:11px;color:#9ca3af">Wolf Marketplace · Campus Commerce Platform<br>You're receiving this because you're a registered vendor.</div>
  </div>
</body></html>`

      // Send via Resend
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${RESEND_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: 'Wolf Marketplace <noreply@wolfmarketplace.app>',
          to: email,
          subject: `${periodLabel}'s Sales Summary — ${vendor.name} 🐺`,
          html
        })
      })

      if (res.ok) sent++
    }

    return new Response(JSON.stringify({ sent, vendors: vendors.length }), { headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
