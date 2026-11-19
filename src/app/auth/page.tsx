import React from 'react';
import type { Metadata } from 'next';
import { AuthClient } from '@/components/AuthClient';

export const metadata: Metadata = {
  title: 'Giriş Yap / Kayıt Ol',
  description:
    'AiFlix hesabınıza giriş yapın veya ücretsiz üye olun; favorilerinizi, izleme listenizi ve CineBot öneri geçmişinizi yönetin.',
  alternates: { canonical: '/auth' },
};

export default function AuthPage() {
  return <AuthClient />;
}
