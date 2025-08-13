'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation";
import TicketsClient from "../private/purchase/ticketsClient";




export default async function TicketsPage() {
    const supabase = await createClient();
    
    const { data: tickets, error: ticketError } = await supabase
    .from('selling_tickets')
    .select('*')
    .eq('sold', false);

    if (ticketError) {
        console.log(ticketError);
        throw ticketError;
    }
    return <main className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <ol>
                {tickets.map(t => (
              <li key={t.id}>{t.phase} ticket for sale</li>
            ))}
            </ol>
            </main>
}

