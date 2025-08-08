'use client';

import React, { useState } from 'react';
import Modal from '../purchase/modal';
import { useToast } from '@/app/context/ToastContext';

export default function SellPage() {
  const [modalData, setModalData] = useState<{ type: string; price: string; date: string } | null>(null);
  const {showToast} = useToast();
  function handleSell(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setModalData({
      type: formData.get('type') as string,
      price: formData.get('price') as string,
      date: formData.get('date') as string,
    });
  }

  function closeModal() {
    setModalData(null);
  }

  async function confirmSell() {
    if (!modalData) return;
    await fetch('/api/sell', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: modalData.type,
        price: parseFloat(modalData.price),
        date: modalData.date,
      }),
    });
    closeModal();
    showToast('Your ticket is now for sale', { type: 'success' });
  }

  const isOpen = modalData !== null;

  return (
    <div className="p-4">
      <form onSubmit={handleSell} className="space-y-2">
        <label className="block">
          Type:
          <select name="type" className="ml-2">
            <option value="normal">Normal</option>
            <option value="early">Early</option>
            <option value="late">Late</option>
          </select>
        </label>

        <label className="block">
          Price:
          <input name="price" type="number" className="ml-2" />
        </label>

        <label className="block">
          Date:
          <input name="date" type="date" className="ml-2" />
        </label>

        <button
          type="submit"
          className="mt-2 bg-blue-500 text-white px-4 py-2 rounded"
        >
          Sell
        </button>
      </form>
      <Modal open={isOpen} onClose={closeModal}>
          <p>Type: {modalData?.type}</p>
          <p>Price: {modalData?.price}</p>
          <p>Date: {modalData?.date}</p>
          <button
            onClick={confirmSell}
            className="mt-4 bg-green-500 text-white px-4 py-2 rounded"
          >
            Confirm
          </button>
        </Modal>
        </div>)
}