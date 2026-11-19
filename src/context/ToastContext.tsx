'use client';

import React, { createContext, useCallback, useContext, useState } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastItem {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev.slice(-3), { id, message, type }]);
      setTimeout(() => dismissToast(id), 4500);
    },
    [dismissToast]
  );

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="toast-stack" role="region" aria-label="Bildirimler" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast-item is-${toast.type}`} role="status">
            {toast.type === 'success' && <CheckCircle2 size={18} color="#4ade80" aria-hidden="true" />}
            {toast.type === 'error' && <AlertCircle size={18} color="#f87171" aria-hidden="true" />}
            {toast.type === 'info' && <Info size={18} color="#42a5f5" aria-hidden="true" />}
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              className="btn-ghost btn-icon toast-close-btn"
              aria-label="Bildirimi kapat"
              onClick={() => dismissToast(toast.id)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast, ToastProvider içinde kullanılmalıdır.');
  }
  return ctx;
}
