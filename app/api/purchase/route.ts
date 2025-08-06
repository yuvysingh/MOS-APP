// /app/api/purchase/route.ts
import { NextResponse } from 'next/server';

import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request) {
  const { ticketId } = await req.json();
  const supabase = await createClient();

  // 1) retrieve current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) insert into purchases (now accounting for purchaser_id and purchased_at)
  const { error: insertError } = await supabase
    .from('purchases')
    .insert({
      ticket_id: ticketId,
      purchaser_id: user.id,
    });

  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 500 });
  }

  // 3) mark the ticket sold
  const { error: rpcError } = await supabase
    .rpc('mark_ticket_sold', { p_ticket_id: ticketId });

  if (rpcError) {
    return NextResponse.json({ error: rpcError.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
