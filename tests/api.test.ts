import { describe, it, expect, beforeEach } from 'vitest';
import { checkRateLimit, resetRateLimits } from '@/lib/rate-limit';
import { GET as healthGet } from '@/app/api/health/route';
import { GET as trendingGet } from '@/app/api/trending/route';
import { GET as movieGet } from '@/app/api/movie/[id]/route';
import { POST as cinebotPost } from '@/app/api/cinebot/route';

describe('Rate Limiter & API Route Kontrolleri', () => {
  beforeEach(() => {
    resetRateLimits();
    process.env.TMDB_API_KEY = 'dummy-test-key';
  });

  it('rate limiter limit aşımında 429 tetikler ve retryAfterSeconds döner', () => {
    for (let i = 0; i < 5; i++) {
      const res = checkRateLimit({
        namespace: 'test',
        identifier: 'ip:1.2.3.4',
        limit: 5,
        windowMs: 60_000,
      });
      expect(res.allowed).toBe(true);
    }
    const blocked = checkRateLimit({
      namespace: 'test',
      identifier: 'ip:1.2.3.4',
      limit: 5,
      windowMs: 60_000,
    });
    expect(blocked.allowed).toBe(false);
    expect(blocked.remaining).toBe(0);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('GET /api/health 200 döner ve anahtar değeri sızdırmaz', async () => {
    const res = await healthGet();
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(JSON.stringify(json)).not.toContain('dummy-test-key');
  });

  it('GET /api/movie/[id] sayısal olmayan film kimliğini 400 ile reddeder', async () => {
    const req = new Request('http://localhost/api/movie/abc');
    const res = await movieGet(req, { params: Promise.resolve({ id: 'abc' }) });
    expect(res.status).toBe(400);
  });

  it('GET /api/trending geçersiz limit parametresini 400 ile reddeder', async () => {
    const req = new Request('http://localhost/api/trending?limit=999');
    const res = await trendingGet(req);
    expect(res.status).toBe(400);
  });

  it('POST /api/cinebot boş/kısa sorguyu 400 ile reddeder ve 7. istekte 429 rate-limit uygular', async () => {
    const ipHeaders = {
      'Content-Type': 'application/json',
      'x-forwarded-for': '203.0.113.42',
    };

    // İlk 6 geçersiz/kısa istek 400 döner, 7. istek 429 rate-limit'e takılır
    for (let i = 0; i < 6; i++) {
      const req = new Request('http://localhost/api/cinebot', {
        method: 'POST',
        headers: ipHeaders,
        body: JSON.stringify({ query: 'a', mode: 'movie', genre: 'all', count: 4 }),
      });
      const res = await cinebotPost(req);
      expect(res.status).toBe(400);
      expect(res.headers.get('X-RateLimit-Limit')).toBe('6');
    }

    const seventhReq = new Request('http://localhost/api/cinebot', {
      method: 'POST',
      headers: ipHeaders,
      body: JSON.stringify({ query: 'Inception', mode: 'movie', genre: 'all', count: 4 }),
    });
    const rateLimitedRes = await cinebotPost(seventhReq);
    expect(rateLimitedRes.status).toBe(429);
    expect(Number(rateLimitedRes.headers.get('Retry-After'))).toBeGreaterThan(0);
  });
});
