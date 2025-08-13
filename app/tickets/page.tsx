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

    return <TicketsClient initialTickets={tickets}/>
}

