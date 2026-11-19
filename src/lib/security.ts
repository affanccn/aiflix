/**
 * Güvenlik ve Doğrulama Yardımcıları
 * XSS, tehlikeli protokoller (javascript:, data:) ve prompt enjeksiyonlarına karşı koruma sağlar.
 */

export const ALLOWED_IMAGE_HOSTS = new Set([
  'image.tmdb.org',
  'firebasestorage.googleapis.com',
  'lh3.googleusercontent.com',
]);

export const PRESET_AVATARS = [
  { id: 'avatar-1', label: 'Sinema Sever', url: '/img/user/user-1.webp', legacyUrl: '/img/user/user-1.jpg' },
  { id: 'avatar-2', label: 'Yönetmen', url: '/img/user/userman1.webp', legacyUrl: '/img/user/userman1.jpg' },
  { id: 'avatar-3', label: 'Eleştirmen', url: '/img/user/userwoman1.webp', legacyUrl: '/img/user/userwoman1.jpg' },
  { id: 'avatar-4', label: 'Senarist', url: '/img/user/userwoman2.webp', legacyUrl: '/img/user/userwoman2.jpg' },
] as const;

export const DEFAULT_AVATAR = '/img/user/user-1.webp';

export const ALLOWED_UPLOAD_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const MAX_UPLOAD_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

/**
 * Görsel URL'sinin yalnızca HTTPS + izinli domain veya yerel güvenli avatar yolu olduğunu doğrular.
 */
export function isAllowedImageUrl(url: unknown): url is string {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed || trimmed.length > 1000) return false;

  // Güvenli yerel yollar
  if (/^\/img\/user\/[a-zA-Z0-9._-]+$/.test(trimmed)) return true;
  if (/^\/public\/img\/user\/[a-zA-Z0-9._-]+$/.test(trimmed)) return true;

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return false;
    if (ALLOWED_IMAGE_HOSTS.has(parsed.hostname)) return true;
    if (parsed.hostname.endsWith('.firebasestorage.app')) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Güvenli görsel URL döndürür; geçersizse null döner.
 */
export function sanitizeImageUrl(url: unknown): string | null {
  if (!isAllowedImageUrl(url)) return null;
  const trimmed = url.trim();
  if (trimmed.startsWith('/public/img/')) {
    return trimmed.replace('/public/img/', '/img/');
  }
  return trimmed;
}

/**
 * Avatar URL'sini doğrular ve eski /public/img/... yollarını normalize eder.
 */
export function normalizeAvatarUrl(url: unknown): string {
  const safe = sanitizeImageUrl(url);
  return safe ?? DEFAULT_AVATAR;
}

/**
 * Kullanıcı promptunu temizler, kontrol karakterlerini ayıklar ve uzunluğu sınırlar.
 */
export function sanitizePrompt(input: string, maxLength = 250): string {
  return input
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLength);
}

/**
 * YouTube video anahtarını sıkı biçimde doğrular (iframe src güvenliği).
 */
export function isValidYouTubeKey(key: unknown): key is string {
  return typeof key === 'string' && /^[a-zA-Z0-9_-]{6,20}$/.test(key);
}

/**
 * İstemci tarafı görsel yükleme doğrulaması (storage.rules ile uyumlu).
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  if (!ALLOWED_UPLOAD_MIME_TYPES.has(file.type)) {
    return {
      valid: false,
      error: 'Sadece JPG, PNG veya WebP formatında görseller yüklenebilir.',
    };
  }
  if (file.size > MAX_UPLOAD_SIZE_BYTES) {
    return {
      valid: false,
      error: 'Görsel boyutu en fazla 2 MB olabilir.',
    };
  }
  return { valid: true };
}

/**
 * TMDB görsel URL oluşturucu.
 */
export function getTmdbImageUrl(
  path: string | null | undefined,
  size: 'w185' | 'w342' | 'w500' | 'w780' | 'w1280' = 'w500'
): string | null {
  if (!path || typeof path !== 'string' || !path.startsWith('/')) return null;
  return `https://image.tmdb.org/t/p/${size}${path}`;
}
