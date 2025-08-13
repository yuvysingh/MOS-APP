import { NextResponse } from 'next/server'
import { stripe } from '@/utils/stripe/client'// adjust path if needed

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req:Request) {
  try {
    const { account } = await req.json()
    if (!account) {
      return NextResponse.json({ error: 'Missing `account` in body' }, { status: 400 })
    }

    const origin = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin

    const accountLink = await stripe.accountLinks.create({
      account,
      type: 'account_onboarding',
      refresh_url: `${origin}/refresh/${account}`,
      return_url: `${origin}/return/${account}`,
    })

    return NextResponse.json({ url: accountLink.url })
  } catch (error) {
    console.error('Error creating Stripe Account Link:', error)
    return NextResponse.json({ error: error }, { status: 500 })
  }
}
