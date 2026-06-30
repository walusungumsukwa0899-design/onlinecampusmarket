import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const { product_id, product_name } = await req.json()
    const supabaseAdmin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '')
    // Get all subscribers for this product
    const { data: subs } = await supabaseAdmin.from('restock_alerts').select('user_id, profiles(full_name)').eq('product_id', product_id).eq('notified', false)
    if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders })

    let sent = 0
    for (const sub of subs) {
      // Create in-app notification
      await supabaseAdmin.from('notifications').insert({
        user_id: sub.user_id,
        title: '🎉 Back in stock!',
        body: `${product_name} is available again. Get it before it sells out!`,
        type: 'restock',
        data: JSON.stringify({ product_id })
      })
      sent++
    }
    // Mark all as notified
    await supabaseAdmin.from('restock_alerts').update({ notified: true }).eq('product_id', product_id).eq('notified', false)
    return new Response(JSON.stringify({ sent }), { headers: corsHeaders })
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: corsHeaders })
  }
})
