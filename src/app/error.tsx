'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCcw, Home } from 'lucide-react';

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[AiFlix Error Boundary]:', error);
  }, [error]);

  return (
    <div className="container error-page-container">
      <div className="state-box">
        <AlertTriangle size={52} color="#f87171" aria-hidden="true" />
        <h1 className="state-box-title text-2xl">Beklenmeyen bir hata oluştu (500)</h1>
        <p className="state-box-text">
          Sunucu veya bağlantı kaynaklı geçici bir sorun yaşandı. Sayfayı yeniden denemeyi
          seçebilir ya da anasayfaya dönebilirsiniz.
        </p>
        <div className="flex-center flex-wrap gap-12 mt-8">
          <button type="button" className="btn btn-primary" onClick={() => reset()}>
            <RotateCcw size={16} /> Tekrar Dene
          </button>
          <Link href="/" className="btn btn-secondary">
            <Home size={16} /> Anasayfa
          </Link>
        </div>
      </div>
    </div>
  );
}
