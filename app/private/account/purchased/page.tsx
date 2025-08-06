

import { createClient } from '@/utils/supabase/server';

export default async function BoughtPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return <p>Please log in to view your purchased tickets.</p>;
  }

  const { data: purchases, error: purchaseError } = await supabase
    .from('purchases')
    .select('purchased_at, selling_tickets(id, phase, sell_price, sale_date)')
    .eq('purchaser_id', user.id);

  if (purchaseError) {
    return <p>Error loading purchases: {purchaseError.message}</p>;
  }

  if (!purchases || purchases.length === 0) {
    return <p>You haven't purchased any tickets yet.</p>;
  }
  console.log(purchases)
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Purchased Tickets</h1>
      <ul className="space-y-4">
        {purchases.map((row) => {
          const ticket = row.selling_tickets;
          return (
            <li key={ticket.id} className="border p-4 rounded-lg">
              <p><strong>Type:</strong> {ticket.phase}</p>
              <p><strong>Price:</strong> ${ticket.sell_price}</p>
              <p><strong>Date:</strong> {ticket.sale_date}</p>
              <p className="text-sm text-gray-500">
                Purchased at: {new Date(row.purchased_at).toLocaleString()}
              </p>
            </li>
          );
          
          
          
        })}
      </ul>
    </div>
  );
}