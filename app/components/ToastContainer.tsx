// /components/ToastContainer.tsx
'use client';

import { Toast } from '../hooks/ToastContext';

export default function ToastContainer({
  toasts,
}: {
  toasts: Toast[];
}) {
  return (
    <div className="fixed bottom-4 right-4 flex flex-col gap-2 z-50">
      {toasts.map(({ id, message, type }) => (
        <div
          key={id}
          className={
            `px-4 py-2 rounded shadow-lg transition-transform duration-200 ` +
            (type === 'error'
              ? 'bg-red-600 text-white'
              : type === 'success'
              ? 'bg-green-600 text-white'
              : 'bg-gray-800 text-white')
          }
        >
          {message}
        </div>
      ))}
    </div>
  );
}
