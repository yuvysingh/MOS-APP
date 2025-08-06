// app/tickets/FilterBar.tsx
'use client'
import React from 'react'

type TicketType = 'early' | 'normal' | 'late'

interface FilterBarProps {
  dateFilter: string
  setDateFilter: (d: string) => void
  typeFilter: TicketType | ''
  setTypeFilter: (t: TicketType | '') => void
}

export default function FilterBar({
  dateFilter,
  setDateFilter,
  typeFilter,
  setTypeFilter,
}: FilterBarProps) {
  return (
    <div className="filter-bar">
      <input
        type="date"
        value={dateFilter}
        onChange={e => setDateFilter(e.target.value)}
        className="form-input"
      />
      <select
        value={typeFilter}
        onChange={e => setTypeFilter(e.target.value as TicketType | '')}
        className="form-input"
      >
        <option value="">All Types</option>
        <option value="early">Early</option>
        <option value="normal">Normal</option>
        <option value="late">Late</option>
      </select>
    </div>
  )
}
