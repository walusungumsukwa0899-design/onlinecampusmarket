// supabase/functions/push-notify/index.ts
// Sends a Web Push notification to a user's registered endpoint.
// Called internally by other functions (order confirmed, new message).
// Requires VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY project secrets.
// Generate keys with: npx web-push generate-vapid-keys

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { user_id, title, body, url } = await req.json()
    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: 'Missing user_id or title' }), { status: 400, headers: corsHeaders })
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Always record in inbox regardless of push delivery
    await supabaseAdmin.from('notifications').insert({ user_id, title, body: body || null, url: url || '/' })

    const { data: subs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('subscription')
      .eq('user_id', user_id)

    if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders })

    const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY')!
    const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY')!
    const payload = JSON.stringify({ title, body, url: url || '/' })

    // @ts-ignore — web-push via esm.sh
    const webpush = await import('https://esm.sh/web-push@3.6.7')
    webpush.setVapidDetails('mailto:admin@wolfmarketplace.mw', vapidPublicKey, vapidPrivateKey)

    let sent = 0
    for (const { subscription } of subs) {
      try {
        await webpush.sendNotification(subscription, payload)
        sent++
      } catch (err: any) {
        // 410 Gone / 404 Not Found = subscription no longer valid.
        // FIX: was deleting ALL subscriptions for the user — now correctly
        // deletes only the specific stale subscription by its endpoint URL.
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabaseAdmin
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user_id)
            .eq('subscription->>endpoint', subscription.endpoint)
        }
      }
    }

    return new Response(JSON.stringify({ sent }), { headers: corsHeaders })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
