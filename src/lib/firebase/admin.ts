import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getAuth, type DecodedIdToken } from 'firebase-admin/auth';

if (typeof window !== 'undefined') {
  throw new Error('Firebase Admin SDK yalnızca sunucu tarafında kullanılabilir.');
}

let adminApp: App | null = null;

function getAdminApp(): App | null {
  if (adminApp) return adminApp;
  if (getApps().length > 0) {
    adminApp = getApps()[0];
    return adminApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  try {
    adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return adminApp;
  } catch (error) {
    console.error('[AiFlix Admin] Firebase Admin başlatılamadı:', error);
    return null;
  }
}

export function isAdminConfigured(): boolean {
  return Boolean(
    (process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID) &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY
  );
}

/**
 * Authorization: Bearer <idToken> başlığını Firebase Admin SDK ile doğrular.
 * Geçerli token varsa DecodedIdToken, yoksa/geçersizse null döner.
 */
export async function verifyRequestUser(
  authHeader: string | null
): Promise<DecodedIdToken | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  if (!token || token.length > 4096) return null;

  const app = getAdminApp();
  if (!app) return null;

  try {
    const decoded = await getAuth(app).verifyIdToken(token, true);
    return decoded;
  } catch {
    return null;
  }
}
