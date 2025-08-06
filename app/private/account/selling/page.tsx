
import { createClient } from "@/utils/supabase/server";
import RemoveTicketsClient from "./removeTicketsClient";

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
    .eq('sold', false);

  if (ticketError) {
    return <p>Error loading your tickets: {ticketError.message}</p>;
  }

  if (!tickets || tickets.length === 0) {
    return <p>You haven't listed any tickets yet.</p>;
  }

  return (
    <RemoveTicketsClient initialTickets = {tickets}/>
  );
}