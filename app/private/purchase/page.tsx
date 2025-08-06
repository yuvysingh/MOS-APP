'use server'

import { createClient } from "@/utils/supabase/server"
import { redirect } from "next/navigation";
import TicketsClient from "./ticketsClient";




export default async function TicketsPage() {
    const supabase = await createClient();
    let {data: {user}, error: authError} = await supabase.auth.getUser();
    if (authError) {
        redirect('/login')
    }
    const { data: tickets, error: ticketError } = await supabase
    .from('selling_tickets')
    .select('*')
    .eq('sold', false)
    .neq('seller_id', user!!.id)

    if (ticketError) {
        console.log(ticketError);
        throw ticketError;
    }

    return <TicketsClient initialTickets={tickets}/>


}