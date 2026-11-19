import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  isAllowedImageUrl,
  sanitizeImageUrl,
  normalizeAvatarUrl,
  sanitizePrompt,
  isValidYouTubeKey,
  validateImageFile,
  DEFAULT_AVATAR,
} from '@/lib/security';

function walkDir(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(full, out);
    } else {
      out.push(full);
    }
  }
  return out;
}

describe('Güvenlik ve XSS Doğrulamaları', () => {
  it('tehlikeli görsel URL protokollerini ve XSS vektörlerini reddeder', () => {
    expect(isAllowedImageUrl('javascript:alert(1)')).toBe(false);
    expect(isAllowedImageUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
    expect(isAllowedImageUrl('http://image.tmdb.org/t/p/w500/abc.jpg')).toBe(false);
    expect(isAllowedImageUrl('https://evil.example.com/x.png')).toBe(false);
    expect(isAllowedImageUrl('<img src=x onerror=alert(1)>')).toBe(false);
    expect(sanitizeImageUrl('javascript:alert(1)')).toBeNull();
  });

  it('yalnızca izinli HTTPS kaynaklarını ve güvenli yerel avatar yollarını kabul eder', () => {
    expect(isAllowedImageUrl('https://image.tmdb.org/t/p/w500/poster.jpg')).toBe(true);
    expect(isAllowedImageUrl('https://firebasestorage.googleapis.com/v0/b/app/o/img.webp')).toBe(true);
    expect(isAllowedImageUrl('https://lh3.googleusercontent.com/a/photo')).toBe(true);
    expect(isAllowedImageUrl('/img/user/user-1.webp')).toBe(true);
    expect(normalizeAvatarUrl('/public/img/user/user-1.jpg')).toBe('/img/user/user-1.jpg');
    expect(normalizeAvatarUrl('https://evil.com/p.png')).toBe(DEFAULT_AVATAR);
  });

  it('prompt temizleyici kontrol karakterlerini ayıklar ve uzunluğu sınırlar', () => {
    const dirty = '  Inception\u0000\u0007   benzeri\n\tfilmler  ';
    expect(sanitizePrompt(dirty, 250)).toBe('Inception benzeri filmler');
    expect(sanitizePrompt('a'.repeat(500), 240).length).toBe(240);
  });

  it('YouTube video anahtarını enjeksiyona karşı doğrular', () => {
    expect(isValidYouTubeKey('YoHD9XEInc0')).toBe(true);
    expect(isValidYouTubeKey('abc" onload="alert(1)')).toBe(false);
    expect(isValidYouTubeKey('https://youtube.com/watch?v=123')).toBe(false);
  });

  it('dosya yüklemesinde yalnızca 2MB altı JPG/PNG/WebP kabul eder', () => {
    const validFile = new File(['abc'], 'poster.webp', { type: 'image/webp' });
    expect(validateImageFile(validFile).valid).toBe(true);

    const svgFile = new File(['<svg onload=alert(1)/>'], 'xss.svg', { type: 'image/svg+xml' });
    expect(validateImageFile(svgFile).valid).toBe(false);

    const hugeBuffer = new Uint8Array(2 * 1024 * 1024 + 10);
    const hugeFile = new File([hugeBuffer], 'big.jpg', { type: 'image/jpeg' });
    expect(validateImageFile(hugeFile).valid).toBe(false);
  });

  it('kaynak kodda ve .env.example içinde sızdırılmış gerçek API anahtarı bulunmaz', () => {
    const root = process.cwd();
    const filesToScan = [
      ...walkDir(path.join(root, 'src')),
      path.join(root, '.env.example'),
      path.join(root, 'README.md'),
    ].filter((f) => fs.existsSync(f));

    const forbiddenPatterns = [
      /sk-proj-/,
      /b2b675bb84525726b8c8cea1c8aed29b/,
      /eyJhbGciOiJIUzI1NiJ9\.eyJhdWQiOiJiMmI2/,
      /AIzaSyDxzwT5RvvKrJq8qcR1AQGoMCvZU7keQsk/,
    ];

    for (const file of filesToScan) {
      const content = fs.readFileSync(file, 'utf8');
      for (const pattern of forbiddenPatterns) {
        expect(pattern.test(content), `Sızıntı tespit edildi: ${file}`).toBe(false);
      }
    }
  });

  it('src altında güvensiz innerHTML veya inline onclick kullanımı yoktur', () => {
    const srcFiles = walkDir(path.join(process.cwd(), 'src'));
    for (const file of srcFiles) {
      const content = fs.readFileSync(file, 'utf8');
      expect(content.includes('.innerHTML'), `innerHTML bulundu: ${file}`).toBe(false);
      expect(/onclick\s*=\s*"/i.test(content), `inline onclick bulundu: ${file}`).toBe(false);
    }
  });
});
