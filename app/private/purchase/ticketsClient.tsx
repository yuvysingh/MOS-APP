'use client'
import React, { useState, useRef } from 'react'
import FilterBar from './filterBar'
import TicketCard from './ticket'
import Modal from './modal'
import { createClient } from '@/utils/supabase/client'
import {redirect } from 'next/navigation'
import { useToast } from '@/app/context/ToastContext'


export type Ticket = {
  id: string
  seller_id: string
  sale_date: string       // “YYYY-MM-DD”
  sell_price: number
  phase: 'early' | 'normal' | 'late'
  inserted_at: string     // timestamptz
  sold: boolean
}




interface TicketsClientProps {
  initialTickets: Ticket[]
}

async function purchaseTicket(ticketId: string) {
  const res = await fetch('/api/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ticketId }),
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(error?.error || 'Purchase failed');
  }

  return await res.json();
}



export default function TicketsClient({initialTickets}: TicketsClientProps) {
    const [allTickets, setAllTickets] = useState<Ticket[]>(initialTickets)
    const [dateFilter, setDateFilter] = useState<string>('')
    const [typeFilter, setTypeFilter] = useState<Ticket['phase'] | ''>('')
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [rowId, setRowId]       = useState<String | null>(null)
    const { showToast } = useToast();

    async function isTicketReserved(ticketId: string): Promise<boolean> {
      const supabase = await createClient();
      const { data, error } = await supabase.rpc('is_ticket_reserved', {
      p_ticket_id: ticketId
      });

      if (error) {
        console.error('RPC error:', error.message);
        throw error;
      }

      // `data` is a boolean indicating existence of a reservation
      return data as boolean;
    }

    const openModal =  async (ticket:Ticket) => {
      const supabase = await createClient();
        setSelectedTicket(ticket);
        setIsModalOpen(true);
        timerRef.current = setTimeout(() => {
                closeModal();
                timerRef.current = null;
            }, 5 * 60 * 1000);
        // add reservation supabase
        let {data: {user}, error: authError} = await supabase.auth.getUser();
        if (authError) {
            redirect('/login')
        }
        const { data, error } = await supabase
        .from('ticket_reservations')
        .insert({ ticket_id: ticket.id, user_id: user?.id })
        .select('id')
        .single();
        
        
        if (error) {
          console.log(error);
        }

        setRowId(data?.id);
    };
    const closeModal = async () => {
        const supabase = await createClient();
        setSelectedTicket(null);
        setIsModalOpen(false);
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        if (rowId) {
          
          const { error: deleteError } = await supabase
          .from('ticket_reservations')
          .delete()
          .eq('id', rowId);
          setRowId(null);
          if (deleteError) {
            console.log(deleteError);
          }
        }
        // remove reservation supabase
    };
    const visible = allTickets
    .filter(t => !dateFilter   || t.sale_date === dateFilter)
    .filter(t => !typeFilter   || t.phase     === typeFilter)

    return (
    <div className="p-4">
      
      <header className="sticky top-0 bg-white z-10 p-4 flex flex-col md:flex-row items-center gap-4 border-b">
        <FilterBar
          dateFilter={dateFilter}
          setDateFilter={setDateFilter}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
        />
      </header>

      <main className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <ol>
            {visible.map(t => (
          <li key={t.id}><TicketCard  ticket={t} /><button onClick={async () => {
            const reserved = await isTicketReserved(t.id)
            if (!reserved) {await openModal(t)}
            else {showToast('Ticket is reserved', { type: 'error' }); }
            // ADD little error message that ticket is reserved
          }}>Buy</button></li>
        ))}
        </ol>
            <Modal
      open={isModalOpen}
      onClose={async () => await closeModal()}
    >
      {selectedTicket && (
        <div>
          <h2 className="text-xl font-bold">
            Confirm Purchase
          </h2>
          <p className="mt-2">
            Buy <strong>{selectedTicket.phase}</strong> ticket on the <strong>{selectedTicket.sale_date}</strong> for $
            {selectedTicket.sell_price}?
          </p>
          <button
            onClick={async () => {
              const supabase = await createClient();
              /* your purchase logic */
              await purchaseTicket(selectedTicket.id)
              
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
                  setAllTickets(tickets)
              setIsModalOpen(false);
              showToast('Purchase successful!', { type: 'success' });
              
            }}
            className="mt-4 px-4 py-2 bg-green-500 text-white rounded-lg"
          >
            Confirm
          </button>
        </div>
      )}
    </Modal>
        
      </main>
    </div>
  )


}