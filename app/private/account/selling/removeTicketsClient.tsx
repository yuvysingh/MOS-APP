'use client'
import { createClient } from "@/utils/supabase/client"
import Modal from "../../purchase/modal"
import { useState } from "react"
import { useRouter } from 'next/navigation';
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
    
    
    const openModal = (ticket:Ticket) => {
            setTicket(ticket);
            setIsModalOpen(true);
        };
    const closeModal = () => {
        setTicket(null);
        setIsModalOpen(false);
    };

    return <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">Your Listed Tickets</h1>
      <ul className="space-y-4">
        {initialTickets.map((ticket) => (
          <li key={ticket.id} className="border p-4 rounded-lg">
            <p><strong>Type:</strong> {ticket.phase}</p>
            <p><strong>Price:</strong> ${ticket.sell_price}</p>
            <p><strong>Date:</strong> {ticket.sale_date}</p>
            <button onClick={() => openModal(ticket)} className="mt-4 px-2 py-1 bg-red-500 text-white rounded-lg">Delete</button>
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

                    }}
                    className="mt-4 px-4 py-2 bg-red-500 text-white rounded-lg"
                  >
                    Confirm
                  </button>
                </div>
              
      </Modal>
    </div>
}