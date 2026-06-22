// supabase/functions/paychangu-webhook/index.ts
//
// Receives payment status callbacks from PayChangu.
// This is a backup to the polling in paychangu-verify — PayChangu will POST here
// when a payment succeeds or fails, even if the user closed the app.
//
// Required Supabase secrets:
//   PAYCHANGU_SECRET_KEY    = YOUR_SECRET_KEY
//   PAYCHANGU_WEBHOOK_SECRET = your chosen webhook secret (set in PayChangu dashboard)
//
// Webhook URL to enter in PayChangu Dashboard → API & Webhook → Setup Webhook:
//   https://YOUR-PROJECT-REF.supabase.co/functions/v1/paychangu-webhook

import { createClient } from 'jsr:@supabase/supabase-js@2'
import { payoutForConfirmedOrders } from '../_shared/payout.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-paychangu-signature',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const secretKey   = Deno.env.get('PAYCHANGU_SECRET_KEY')!
    const webhookSecret = Deno.env.get('PAYCHANGU_WEBHOOK_SECRET')

    const supabaseAdmin = createClient(supabaseUrl, serviceKey)

    // ── Optional: verify webhook signature if secret is configured ────────────
    if (webhookSecret) {
      const signature = req.headers.get('x-paychangu-signature') ?? ''
      if (signature !== webhookSecret) {
        return new Response(JSON.stringify({ error: 'Invalid webhook signature' }), {
          status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const payload = await req.json()

    // PayChangu webhook payload shape:
    // { charge_id, status, amount, mobile, ... }
    const charge_id: string = payload?.charge_id ?? payload?.data?.charge_id ?? ''
    const rawStatus: string = (payload?.status ?? payload?.data?.status ?? '').toLowerCase()

    if (!charge_id) {
      return new Response(JSON.stringify({ error: 'No charge_id in payload' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (rawStatus === 'successful' || rawStatus === 'success') {
      // Find the buyer for this charge
      const { data: orders } = await supabaseAdmin
        .from('orders')
        .select('buyer_id')
        .like('notes', `%charge_id:${charge_id}%`)
        .eq('status', 'pending')
        .limit(1)

      const buyerId = orders?.[0]?.buyer_id

      // Confirm all pending orders for this charge
      await supabaseAdmin
        .from('orders')
        .update({ status: 'confirmed' })
        .like('notes', `%charge_id:${charge_id}%`)
        .eq('status', 'pending')

      // Trigger vendor payouts
      await payoutForConfirmedOrders(supabaseAdmin, secretKey, charge_id)

      // Notify buyer if we found their ID
      if (buyerId) {
        fetch(`${supabaseUrl}/functions/v1/push-notify`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${serviceKey}`,
          },
          body: JSON.stringify({
            user_id: buyerId,
            title:   '✅ Payment Confirmed!',
            body:    'Your order has been confirmed. The vendor will contact you soon.',
            url:     '/dashboard',
          }),
        }).catch(() => {})
      }
    }

    if (rawStatus === 'failed' || rawStatus === 'failure') {
      await supabaseAdmin
        .from('orders')
        .update({ status: 'cancelled' })
        .like('notes', `%charge_id:${charge_id}%`)
        .eq('status', 'pending')
    }

    // Always return 200 to acknowledge receipt
    return new Response(JSON.stringify({ received: true, charge_id, status: rawStatus }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })

  } catch (err: any) {
    // Still return 200 — PayChangu will retry on non-200 responses
    return new Response(JSON.stringify({ received: true, error: err.message }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
