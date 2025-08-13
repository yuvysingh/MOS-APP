
import { NextResponse } from 'next/server'
import {stripe} from '@/utils/stripe/client'
import { createClient } from '@/utils/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    const supabase = await createClient();
    const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
    const account = await stripe.accounts.create({
      controller: { stripe_dashboard: { type: 'none' } },
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      country: 'GB',
      business_type: 'individual',
      business_profile: {
      url: 'http://localhost:3000/tickets',                                  // ← this is the “seller URL”
      product_description: 'Individual seller on mos-app marketplace',
      mcc: '5399',                          // choose an MCC that fits your marketplace
    }
    })

    const { error: upsertErr } = await supabase
      .from('sellers')
      .upsert(
        { user_id: user.id, stripe_id: account.id, payout_ready: false },
        { onConflict: 'user_id' }
      )

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 })
    }


    return NextResponse.json({ account: account.id })
  } catch (error) {
    console.error('Error creating Stripe account:', error)
    return NextResponse.json({ error: error }, { status: 500 })
  }
}
