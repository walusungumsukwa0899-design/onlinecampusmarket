// supabase/functions/_shared/payout.ts
//
// Shared helper: triggers automatic vendor payouts after a payment is confirmed.
// Called by both paychangu-verify (polling) and paychangu-webhook (callback).
//
// Required Supabase secrets:
//   PAYCHANGU_SECRET_KEY = YOUR_SECRET_KEY

const PAYCHANGU_BASE = 'https://api.paychangu.com'

export async function payoutForConfirmedOrders(
  supabaseAdmin: any,
  secretKey: string,
  chargeId: string
) {
  // Fetch all confirmed orders for this charge
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, vendor_id, total, quantity')
    .like('notes', `%charge_id:${chargeId}%`)
    .eq('status', 'confirmed')
    .eq('payout_status', 'not_started')

  if (!orders?.length) return

  // Group orders by vendor (a cart can contain items from multiple vendors)
  const vendorMap = new Map<string, { orderIds: string[]; total: number }>()
  for (const o of orders) {
    const entry = vendorMap.get(o.vendor_id) ?? { orderIds: [], total: 0 }
    entry.orderIds.push(o.id)
    entry.total += o.total ?? 0
    vendorMap.set(o.vendor_id, entry)
  }

  // Fetch the live mobile money operator list once
  const opsController = new AbortController()
  const opsTimeout = setTimeout(() => opsController.abort(), 10000)
  let operatorList: any[] = []
  try {
    const opsRes = await fetch(`${PAYCHANGU_BASE}/mobile-money`, {
      headers: { Authorization: `Bearer ${secretKey}`, Accept: 'application/json' },
      signal: opsController.signal,
    })
    clearTimeout(opsTimeout)
    const opsJson = await opsRes.json()
    operatorList = opsJson?.data ?? opsJson?.operators ?? []
  } catch {
    clearTimeout(opsTimeout)
    // Can't reach operator list — mark all as failed
    const allIds = orders.map((o: any) => o.id)
    await supabaseAdmin.from('orders').update({ payout_status: 'failed' }).in('id', allIds)
    return
  }

  // Process each vendor
  for (const [vendorId, { orderIds, total }] of vendorMap) {
    // Mark as processing
    await supabaseAdmin.from('orders').update({ payout_status: 'processing' }).in('id', orderIds)

    // Fetch vendor payout details
    const { data: vendor } = await supabaseAdmin
      .from('vendors')
      .select('payout_phone, payout_network, name')
      .eq('id', vendorId)
      .maybeSingle()

    if (!vendor?.payout_phone || !vendor?.payout_network) {
      // Vendor hasn't set payout details — mark failed so it's visible in dashboard
      await supabaseAdmin.from('orders').update({ payout_status: 'failed' }).in('id', orderIds)
      console.warn(`Vendor ${vendorId} has no payout details — marked orders as payout failed`)
      continue
    }

    // Find matching operator
    const networkTerms: Record<string, string[]> = {
      airtel: ['airtel'],
      tnm:    ['tnm', 'mpamba'],
    }
    const terms = networkTerms[vendor.payout_network] ?? []
    const operator = operatorList.find((op: any) => {
      const name = (op.name || op.short_code || '').toLowerCase()
      return terms.some((t) => name.includes(t))
    })

    if (!operator) {
      await supabaseAdmin.from('orders').update({ payout_status: 'failed' }).in('id', orderIds)
      console.warn(`No operator found for ${vendor.payout_network} — payout failed for vendor ${vendorId}`)
      continue
    }

    const payoutReference = `WM-PAY-${vendorId.slice(0, 8)}-${Date.now()}`

    try {
      const payoutController = new AbortController()
      const payoutTimeout = setTimeout(() => payoutController.abort(), 15000)
      const payoutRes = await fetch(`${PAYCHANGU_BASE}/mobile-money/payouts/initialize`, {
        method: 'POST',
        headers: {
          Authorization:  `Bearer ${secretKey}`,
          'Content-Type': 'application/json',
          Accept:         'application/json',
        },
        signal: payoutController.signal,
        body: JSON.stringify({
          mobile_money_operator_ref_id: operator.ref_id,
          mobile:    vendor.payout_phone,
          amount:    String(total),
          charge_id: payoutReference,
        }),
      })
      clearTimeout(payoutTimeout)
      const payoutJson = await payoutRes.json()

      if (payoutRes.ok) {
        await supabaseAdmin
          .from('orders')
          .update({ payout_status: 'paid', payout_reference: payoutReference })
          .in('id', orderIds)
      } else {
        console.error(`Payout failed for vendor ${vendorId}:`, payoutJson)
        await supabaseAdmin.from('orders').update({ payout_status: 'failed' }).in('id', orderIds)
      }
    } catch (err: any) {
      console.error(`Payout error for vendor ${vendorId}:`, err.message)
      await supabaseAdmin.from('orders').update({ payout_status: 'failed' }).in('id', orderIds)
    }
  }
}
