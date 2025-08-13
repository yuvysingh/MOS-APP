// /context/ToastContext.tsx
'use client';

import {
  createContext,
  useState,
  useCallback,
  useContext,
  ReactNode,
} from 'react';
import ToastContainer from '../components/ToastContainer';


export interface Toast {
  id: string;
  message: string;
  type?: 'info' | 'success' | 'error';
  duration?: number; // ms before auto-dismiss
}

// this is the type of value used in the toast context
interface ToastContextValue {
  showToast: (
    message: string,
    opts?: Omit<Toast, 'id' | 'message'>
  ) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// this is the tag used to give the context to its children
export function ToastProvider({ children }: { children: ReactNode }) {
    // list storing toasts
  const [toasts, setToasts] = useState<Toast[]>([]);

  // this is the callback that is passed the children so they can display a toast
  const showToast = useCallback(
    (
      message: string,
      opts: Omit<Toast, 'id' | 'message'> = {}
    ) => {
      const id = crypto.randomUUID();
      const toast: Toast = {
        id,
        message,
        type: opts.type,
        duration: opts.duration ?? 3000,
      };

      setToasts((prev) => [...prev, toast]);

      // auto-remove after duration
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, toast.duration);
    },
    []
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <ToastContainer toasts={toasts} />
    </ToastContext.Provider>
  );
}

// creating a hook to make it easier to use
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
