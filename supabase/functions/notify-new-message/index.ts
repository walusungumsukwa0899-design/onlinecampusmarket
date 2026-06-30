// notify-new-message/index.ts
// Called as a Supabase Database Webhook on INSERT to messages table.
// Sends a push notification (and inbox record) to the recipient.
// Set up in Supabase Dashboard: Database → Webhooks → messages → INSERT

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const payload = await req.json()
    const record = payload.record // the new message row

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Determine recipient: if sender is 'buyer', notify the vendor owner; else notify the buyer
    let recipientUserId: string | null = null
    let senderLabel = 'Someone'

    if (record.sender === 'buyer') {
      // Notify vendor owner
      const { data: vendor } = await supabaseAdmin
        .from('vendors')
        .select('user_id, name')
        .eq('id', record.vendor_id)
        .maybeSingle()
      recipientUserId = vendor?.user_id ?? null
      // Get buyer name
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('full_name')
        .eq('id', record.buyer_id)
        .maybeSingle()
      senderLabel = profile?.full_name || 'A buyer'
    } else if (record.sender === 'vendor') {
      // Notify buyer
      recipientUserId = record.buyer_id
      // Get vendor name
      const { data: vendor } = await supabaseAdmin
        .from('vendors')
        .select('name')
        .eq('id', record.vendor_id)
        .maybeSingle()
      senderLabel = vendor?.name || 'The vendor'
    }

    if (!recipientUserId) {
      return new Response(JSON.stringify({ skipped: true }), { headers: corsHeaders })
    }

    // Fire push notification via push-notify function
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    await fetch(`${supabaseUrl}/functions/v1/push-notify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
      },
      body: JSON.stringify({
        user_id: recipientUserId,
        title: `💬 New message from ${senderLabel}`,
        body: record.text?.slice(0, 100) || 'Tap to read',
        url: record.sender === 'buyer' ? '/dashboard' : `/vendors/${record.vendor_id}`,
      }),
    })

    return new Response(JSON.stringify({ ok: true }), { headers: corsHeaders })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
