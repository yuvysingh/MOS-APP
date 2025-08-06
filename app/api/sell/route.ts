// app/api/sell/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  // 1. Parse request body
  const { type, price, date } = await req.json();

  // 2. Initialize Supabase client with auth context
  const supabase = await createClient();

  // 3. Get authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: 'Not authenticated' },
      { status: 401 }
    );
  }

  // 4. Insert new selling ticket record
  const { error: insertError } = await supabase
    .from('selling_tickets')
    .insert({
      seller_id: user.id,
      phase: type,
      sell_price: price,
      sale_date: date,
    });

  if (insertError) {
    console.log(insertError);
    return NextResponse.json(
      { error: insertError.message },
      { status: 500 }
    );
  }

  // 5. Respond with success
  return NextResponse.json({ success: true }, { status: 200 });
}






