'use client';

import React, { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { isValidYouTubeKey } from '@/lib/security';

interface TrailerModalProps {
  trailerKey: string | null;
  title: string;
  onClose: () => void;
}

/**
 * Klavye (ESC) ve Focus Trap destekli erişilebilir YouTube fragman modalı.
 */
export function TrailerModal({ trailerKey, title, onClose }: TrailerModalProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!trailerKey) return;
    const prevFocus = document.activeElement as HTMLElement | null;
    closeBtnRef.current?.focus();
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], iframe, [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus();
    };
  }, [trailerKey, onClose]);

  if (!trailerKey || !isValidYouTubeKey(trailerKey)) return null;

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trailer-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog" ref={dialogRef}>
        <div className="modal-header">
          <h2 id="trailer-modal-title" className="modal-title">
            {title} — Fragman
          </h2>
          <button
            ref={closeBtnRef}
            type="button"
            className="btn btn-ghost btn-icon"
            aria-label="Fragman penceresini kapat"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        <div className="video-ratio">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1&rel=0`}
            title={`${title} fragmanı`}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  );
}
