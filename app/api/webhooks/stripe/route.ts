import { NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe/client'
import { createClient } from '@/utils/supabase/server'
import type Stripe from 'stripe'   

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function computeReady(acct: Stripe.Account) {
  const dueNow = (acct.requirements?.currently_due ?? []).length
  const pastDue = (acct.requirements?.past_due ?? []).length
  return !!acct.payouts_enabled && !acct.requirements?.disabled_reason && dueNow === 0 && pastDue === 0
}

export async function POST(req: Request) {
    const supabase = await createClient();
  const signature = req.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  let event: Stripe.Event
  try {
    const raw = await req.text() // ⚠️ raw body
    event = stripe.webhooks.constructEvent(raw, signature, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err: any) {
    return NextResponse.json({ error: `Bad signature: ${err.message}` }, { status: 400 })
  }

  if (event.type === 'account.updated') {
    const acct = event.data.object as Stripe.Account
    const payout_ready = computeReady(acct)

    // ⬇️ Update sellers by stripe_id
    const { error } = await supabase.rpc('set_payout_ready', {
        p_stripe_id: acct.id,
        p_ready: payout_ready
    })

    if (error) console.error('Failed to update payout_ready:', error)
  }

  if (event.type === 'account.application.deauthorized') {
    const acctId = (event as any).account as string | undefined
    if (acctId) {
      await supabase.from('sellers').update({ payout_ready: false }).eq('stripe_id', acctId)
    }
  }

  return NextResponse.json({ received: true })
}
