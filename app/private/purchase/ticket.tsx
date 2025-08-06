'use client'

import React from 'react'
import type { Ticket } from './ticketsClient'

interface TicketCardProps {
  ticket: Ticket
}

/**
 * A reusable card to display ticket details.
 * Uses the `.ticket-card` Tailwind component for styling.
 */
export default function TicketCard({ ticket }: TicketCardProps) {
  return (
    <div className="ticket-card">
      {/* Display the sale date */}
      <p className="text-sm text-gray-500">
        Sale Date: {new Date(ticket.sale_date).toLocaleDateString('en-GB')}
      </p>

      {/* Display the price */}
      <p className="font-bold text-lg mt-1">
        £{ticket.sell_price.toFixed(2)}
      </p>

      {/* Display the ticket phase/type */}
      <p className="capitalize mt-2">
        Type: {ticket.phase}
      </p>
    </div>
  )
}