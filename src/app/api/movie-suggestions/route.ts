import { POST as cinebotPost } from '@/app/api/cinebot/route';

/**
 * Geriye dönük uyumluluk alias'ı: Eski /api/movie-suggestions isteklerini /api/cinebot'a yönlendirir.
 */
export async function POST(request: Request) {
  return cinebotPost(request);
}
