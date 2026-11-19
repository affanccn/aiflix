import React, { Suspense } from 'react';
import type { Metadata } from 'next';
import { ProfileClient } from '@/components/ProfileClient';

export const metadata: Metadata = {
  title: 'Profilim & Listelerim',
  description: 'AiFlix profil ayarlarınız, favori filmleriniz, izleme listeniz ve CineBot geçmişiniz.',
  robots: { index: false, follow: false },
};

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="container page-section">
          <div className="surface-card">
            <div className="skeleton sk-block-180" />
          </div>
        </div>
      }
    >
      <ProfileClient />
    </Suspense>
  );
}
