'use client'
import Modal from "../../purchase/modal"




type Ticket = {
  id: string 
  sale_date: string       // “YYYY-MM-DD”
  sell_price: number
  phase: 'early' | 'normal' | 'late'
}
interface TicketsClientProps {
  initialTickets: Ticket[]
}


export default function RemoveTicketsClient({initialTickets}: TicketsClientProps) {
    return <></>
}