import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

describe('Firestore ve Storage Güvenlik Kuralları Doğrulaması', () => {
  const firestoreRules = fs.readFileSync(path.join(process.cwd(), 'firestore.rules'), 'utf8');
  const storageRules = fs.readFileSync(path.join(process.cwd(), 'storage.rules'), 'utf8');

  it('firestore.rules hiçbir yerde güvensiz "allow read, write: if true" içermez', () => {
    expect(firestoreRules).not.toMatch(/allow\s+read\s*,\s*write\s*:\s*if\s+true/i);
    expect(firestoreRules).not.toMatch(/allow\s+write\s*:\s*if\s+true/i);
  });

  it('firestore.rules başlık ve içerik uzunluk sınırlarını ve sahip doğrulamasını içerir', () => {
    expect(firestoreRules).toContain('request.resource.data.authorId == request.auth.uid');
    expect(firestoreRules).toContain('isValidString(request.resource.data.title, 3, 120)');
    expect(firestoreRules).toContain('isValidString(request.resource.data.content, 10, 5000)');
    expect(firestoreRules).toContain('match /likes/{uid}');
    expect(firestoreRules).toContain('match /comments/{commentId}');
    expect(firestoreRules).toContain('existsAfter(');
    expect(firestoreRules).toContain('currentLikesCount(resource.data) + 1');
    expect(firestoreRules).toContain('currentLikesCount(resource.data) - 1');
    expect(firestoreRules).toContain('allow read, write: if false;');
  });

  it('storage.rules yalnızca giriş yapmış kullanıcıya max 2MB JPG/PNG/WebP yükleme izni verir', () => {
    expect(storageRules).toContain('2 * 1024 * 1024');
    expect(storageRules).toContain('image/(jpeg|png|webp)');
    expect(storageRules).toContain('request.auth.uid == uid');
    expect(storageRules).not.toMatch(/allow\s+read\s*,\s*write\s*:\s*if\s+true/i);
  });
});
