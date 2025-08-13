// app/api/sales/preflight/route.js
import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'


export const runtime = 'nodejs'

export async function POST(req:Request) {
  const supabase = await createClient()

  // 1) Auth: identify the current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2) Read seller row (RLS should allow user to select their own row)
  const { data: seller, error } = await supabase
    .from('sellers')
    .select('stripe_id, payout_ready')
    .eq('user_id', user.id)
    .maybeSingle()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // 3) Decide the preflight state
  if (!seller || !seller.stripe_id) {
    return NextResponse.json({
      state: 'NEEDS_ACCOUNT',
      message: 'Create your Stripe account to get paid.',
    })
  }

  if (seller.payout_ready) {
    return NextResponse.json({
      state: 'OK',
      message: 'You are all set to receive instant payouts.',
    })
  }

  // 4) Not payout-ready yet → create a fresh single-use Account Link
  const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin
  const linkRes = await fetch(`${origin}/api/account_link`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ account: seller.stripe_id }),
  })

  if (!linkRes.ok) {
    const errText = await linkRes.text().catch(() => '')
    return NextResponse.json(
      { error: `Failed to create onboarding link. ${errText || ''}`.trim() },
      { status: 500 }
    )
  }

  const { url } = await linkRes.json()

  return NextResponse.json({
    state: 'NEEDS_ONBOARDING',
    onboardingUrl: url,
    message: 'Finish verification with Stripe to enable payouts.',
  })
}
