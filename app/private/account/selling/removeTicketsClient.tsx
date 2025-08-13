'use client'
import { createClient } from "@/utils/supabase/client"
import Modal from "../../purchase/modal"
import { useState, useRef } from "react"
import { useRouter } from 'next/navigation';
import {redirect } from 'next/navigation'
import { useToast } from "@/app/hooks/ToastContext";
type Ticket = {
  id: string 
  sale_date: string       // “YYYY-MM-DD”
  sell_price: number
  phase: 'early' | 'normal' | 'late'
}
interface TicketsClientProps {
  initialTickets: Ticket[]
}

async function handleDelete(ticketId: string) {
  const res = await fetch(`/api/sell/${ticketId}`, {
    method: 'DELETE',
  });

  if (!res.ok) {
    console.log(res);
    return;
  }

  
}


export default function RemoveTicketsClient({initialTickets}: TicketsClientProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentTicket, setTicket] = useState<Ticket|null>(null);
    const router = useRouter();
    const {showToast} = useToast();
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const [rowId, setRowId]       = useState<String | null>(null);


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

    
    
    const openModal = async (ticket:Ticket) => {
            const supabase = await createClient();
            setTicket(ticket);
            setIsModalOpen(true);
            
            timerRef.current = setTimeout(() => {
                closeModal();
                timerRef.current = null;
            }, 5 * 60 * 1000);
            // start a timer
            // add reservation in supabase
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
        setTicket(null);
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
        
        
        // remove reservation in supabase
    };

    return <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Listed Tickets</h1>
      <ul className="space-y-4">
        {initialTickets.map((ticket) => (
          <li key={ticket.id} className="border p-4 rounded-lg">
            <p><strong>Type:</strong> {ticket.phase}</p>
            <p><strong>Price:</strong> ${ticket.sell_price}</p>
            <p><strong>Date:</strong> {ticket.sale_date}</p>
            <button onClick={async () => {
                const reserved = await isTicketReserved(ticket.id)
                console.log(reserved)
                if (!reserved) {await openModal(ticket)}
                else {showToast('Ticket is reserved', { type: 'error' });}
                // TODO add pop up to say resrved
        }} className="mt-4 px-2 py-1 bg-red-500 text-white rounded-lg">Delete</button>
          </li>
        ))}
      </ul>
      <Modal open = {isModalOpen} onClose={() => closeModal()}>
        <div>
                  <h2 className="text-xl font-bold">
                    Stop Selling Ticket 
                  </h2>
                  <p className="mt-2">
                    Delete <strong>{currentTicket?.phase}</strong> ticket on the <strong>{currentTicket?.sale_date}</strong> for $
                    {currentTicket?.sell_price}?
                  </p>
                  <button
                    onClick={async () => {
                      /* removal */
                      
                      await handleDelete(currentTicket!!.id)
                      
                      router.refresh();
                      closeModal();
                      showToast('Removal Succesful', { type: 'success' });
                    }}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg"
                  >
                    Confirm
                  </button>
                </div>
              
      </Modal>
    </div>
}