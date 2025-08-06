
import { createClient } from "@/utils/supabase/server";

export default async function SoldPage() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return <p>Please log in to view your listed tickets.</p>;
  }

  const { data: tickets, error: ticketError } = await supabase
    .from('selling_tickets')
    .select('id, phase, sell_price, sale_date')
    .eq('seller_id', user.id)
    .eq('sold', true);

  if (ticketError) {
    return <p>Error loading your tickets: {ticketError.message}</p>;
  }

  if (!tickets || tickets.length === 0) {
    return <p>You haven't listed any tickets yet.</p>;
  }

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Sold Tickets</h1>
      <ul className="space-y-4">
        {tickets.map((ticket) => (
          <li key={ticket.id} className="border p-4 rounded-lg">
            <p><strong>Type:</strong> {ticket.phase}</p>
            <p><strong>Price:</strong> ${ticket.sell_price}</p>
            <p><strong>Date:</strong> {ticket.sale_date}</p>

          </li>
        ))}
      </ul>
    </div>
  );
}