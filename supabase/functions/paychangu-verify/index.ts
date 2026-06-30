// supabase/functions/paychangu-verify/index.ts
//
// Checks payment status for a given charge_id.
// Called repeatedly by the Cart page (polling) until status is confirmed or failed.
//
// Required Supabase secrets:
//   PAYCHANGU_SECRET_KEY = YOUR_SECRET_KEY

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { payoutForConfirmedOrders } from '../_shared/payout.ts'

const PAYCHANGU_BASE = 'https://api.paychangu.com'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const secretKey   = Deno.env.get('PAYCHANGU_SECRET_KEY')
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey     = Deno.env.get('SUPABASE_ANON_KEY')!

    if (!secretKey) throw new Error('PAYCHANGU_SECRET_KEY secret is not set')

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // Verify caller is authenticated
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

    const { charge_id } = await req.json()
    if (!charge_id) {
      return new Response(JSON.stringify({ error: 'Missing charge_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // ── Verify payment status with PayChangu ──────────────────────────────────
    const verifyController = new AbortController()
    const verifyTimeout = setTimeout(() => verifyController.abort(), 10000)
    const verifyRes = await fetch(`${PAYCHANGU_BASE}/mobile-money/payments/${charge_id}/verify`, {
      headers: { Authorization: `Bearer ${secretKey}`, Accept: 'application/json' },
      signal: verifyController.signal,
    })
    clearTimeout(verifyTimeout)
    const verifyJson = await verifyRes.json()

    // PayChangu returns status in verifyJson.data.status or verifyJson.status
    const status: string = (verifyJson?.data?.status ?? verifyJson?.status ?? '').toLowerCase()

    if (status === 'successful' || status === 'success') {
      // Confirm orders in our DB
      await supabaseAdmin
        .from('orders')
        .update({ status: 'confirmed' })
        .eq('buyer_id', user.id)
        .like('notes', `%charge_id:${charge_id}%`)
        .eq('status', 'pending')

      // Trigger vendor payouts
      await payoutForConfirmedOrders(supabaseAdmin, secretKey, charge_id)

      // Push notification to buyer
      fetch(`${supabaseUrl}/functions/v1/push-notify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${serviceKey}`,
        },
        body: JSON.stringify({
          user_id: user.id,
          title:   '✅ Payment Confirmed!',
          body:    'Your order has been confirmed. The vendor will contact you to arrange delivery.',
          url:     '/dashboard',
        }),
      }).catch(() => {})

      return new Response(JSON.stringify({ status: 'successful' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (status === 'failed' || status === 'failure') {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled' })
        .eq('buyer_id', user.id)
        .like('notes', `%charge_id:${charge_id}%`)
        .eq('status', 'pending')

      return new Response(JSON.stringify({ status: 'failed' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Still pending
    return new Response(JSON.stringify({ status: status || 'pending', raw: verifyJson }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message ?? 'Unknown error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
