// app/api/selling_tickets/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  const { id } = await params
  const supabase = await createClient();

  // 1) ensure user is authenticated
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
  }

  // 2) delete only if this user owns the ticket
  const { error: deleteError } = await supabase
    .from('selling_tickets')
    .delete()
    .match({ id: id, seller_id: user.id });

  if (deleteError) {
    return NextResponse.json(
      { error: deleteError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true }, { status: 200 });
}
