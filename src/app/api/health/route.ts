import { NextResponse } from 'next/server';
import { isTmdbConfigured } from '@/lib/tmdb';
import { isGeminiConfigured } from '@/lib/gemini';
import { isAdminConfigured } from '@/lib/firebase/admin';

export async function GET() {
  return NextResponse.json(
    {
      status: 'ok',
      service: 'AiFlix API v2',
      services: {
        tmdb: isTmdbConfigured(),
        gemini: isGeminiConfigured(),
        firebaseAdmin: isAdminConfigured(),
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: {
        'Cache-Control': 'no-store',
      },
    }
  );
}
