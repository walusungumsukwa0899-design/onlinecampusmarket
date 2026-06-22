// supabase/functions/paychangu-charge/index.ts
//
// Initiates a PayChangu Mobile Money charge (Airtel Money or TNM Mpamba).
// Called from the Cart page when the buyer taps Pay.
//
// Required Supabase secrets:
//   PAYCHANGU_SECRET_KEY   = YOUR_SECRET_KEY
//   PAYCHANGU_PUBLIC_KEY   = YOUR_PUBLIC_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2'

const PAYCHANGU_BASE = 'https://api.paychangu.com'

// Match network names to PayChangu operator name fragments
const OPERATOR_MATCH: Record<string, string[]> = {
  airtel: ['airtel'],
  tnm:    ['tnm', 'mpamba'],
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const secretKey   = Deno.env.get('PAYCHANGU_SECRET_KEY')
    const publicKey   = Deno.env.get('PAYCHANGU_PUBLIC_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!

    if (!secretKey) throw new Error('PAYCHANGU_SECRET_KEY secret is not set')

    // ── Declare supabaseAdmin first so it's available everywhere ──────────────
    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // ── Verify the caller is a logged-in user ─────────────────────────────────
    const authHeader = req.headers.get('Authorization') ?? ''
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Not authenticated' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Rate limit: max 5 charge attempts per user per 10 minutes ─────────────
    const windowStart = new Date(Date.now() - 10 * 60 * 1000).toISOString()
    const { count: attemptCount } = await supabaseAdmin
      .from('rate_limits')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('action', 'charge')
      .gte('window_start', windowStart)

    if ((attemptCount ?? 0) >= 5) {
      return new Response(JSON.stringify({ error: 'Too many payment attempts. Please wait 10 minutes before trying again.' }), {
        status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    await supabaseAdmin.from('rate_limits').insert({
      user_id: user.id, action: 'charge', window_start: new Date().toISOString(),
    })

    // ── Parse request body ────────────────────────────────────────────────────
    const body = await req.json()
    const { mobile, network, amount, items, deliveryAddress } = body

    if (!mobile || !network || !amount || !items?.length) {
      return new Response(JSON.stringify({ error: 'Missing required fields: mobile, network, amount, items' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 1. Fetch live operator list from PayChangu ────────────────────────────
    const opsController = new AbortController()
    const opsTimeout = setTimeout(() => opsController.abort(), 10000)
    const operatorsRes = await fetch(`${PAYCHANGU_BASE}/mobile-money`, {
      headers: { Authorization: `Bearer ${secretKey}`, Accept: 'application/json' },
      signal: opsController.signal,
    })
    clearTimeout(opsTimeout)
    const operatorsJson = await operatorsRes.json()
    const operatorList: any[] = operatorsJson?.data ?? operatorsJson?.operators ?? []

    const matchTerms = OPERATOR_MATCH[network]
    const operator = operatorList.find((op) => {
      const name = (op.name || op.short_code || '').toLowerCase()
      return matchTerms?.some((term) => name.includes(term))
    })

    if (!operator) {
      return new Response(JSON.stringify({ error: `No matching operator found for "${network}"`, operators: operatorList }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── 2. Create pending order rows in our DB ────────────────────────────────
    const chargeId = `WM-${user.id.slice(0, 8)}-${Date.now()}`
    const orderRows = items.map((item: any) => ({
      buyer_id:         user.id,
      product_id:       item.product_id,
      vendor_id:        item.vendor_id,
      quantity:         item.qty,
      total:            item.price * item.qty,
      status:           'pending',
      delivery_address: deliveryAddress ?? null,
      notes:            `charge_id:${chargeId}`,
    }))

    const { error: insertError } = await supabaseAdmin.from('orders').insert(orderRows)
    if (insertError) throw new Error(`Failed to create orders: ${insertError.message}`)

    // ── 3. Initiate charge with PayChangu ─────────────────────────────────────
    const chargeController = new AbortController()
    const chargeTimeout = setTimeout(() => chargeController.abort(), 15000)
    const chargeRes = await fetch(`${PAYCHANGU_BASE}/mobile-money/payments/initialize`, {
      method: 'POST',
      headers: {
        Authorization:  `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      signal: chargeController.signal,
      body: JSON.stringify({
        mobile,
        mobile_money_operator_ref_id: operator.ref_id,
        amount:     String(amount),
        charge_id:  chargeId,
        email:      user.email ?? undefined,
        first_name: user.user_metadata?.full_name?.split(' ')?.[0] ?? undefined,
        last_name:  user.user_metadata?.full_name?.split(' ')?.slice(1).join(' ') || undefined,
      }),
    })
    clearTimeout(chargeTimeout)
    const chargeJson = await chargeRes.json()

    if (!chargeRes.ok) {
      // Roll back pending orders — charge never started
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled' })
        .like('notes', `%charge_id:${chargeId}%`)
      return new Response(JSON.stringify({ error: chargeJson?.message ?? 'Charge failed', details: chargeJson }), {
        status: chargeRes.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(
      JSON.stringify({ success: true, charge_id: chargeId, data: chargeJson }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
