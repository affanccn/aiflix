import type { CineBotRecommendation, SimilarityBreakdown } from '@/types';
import type { RichMovieMetadata } from '@/lib/tmdb';

export interface CandidateSignals {
  fromGemini?: boolean;
  geminiRank?: number;
  geminiSemanticScore?: number;
  geminiReason?: string;
  geminiSharedThemes?: string[];
  fromTmdbRecs?: boolean;
  tmdbRecsRank?: number;
  fromTmdbSimilar?: boolean;
  fromKeywordDiscover?: boolean;
  fromDirectSearch?: boolean;
}

export interface ScoredCandidate {
  metadata: RichMovieMetadata;
  signals: CandidateSignals;
  similarityScore: number;
  similarityBreakdown: SimilarityBreakdown;
  matchHighlights: string[];
  sharedKeywords: string[];
  sharedDirectors: string[];
  sharedWriters: string[];
  sharedCast: string[];
  sharedGenres: string[];
  plotOverlapTerms: string[];
  isSameSeedCollection: boolean;
}

export interface VibeIntent {
  tokens: string[];
  matchedThemesTr: string[];
  inferredGenreIds: number[];
  inferredKeywordIds: number[];
  searchTermsEn: string[];
  wantsAnimation: boolean;
}

const STOPWORDS = new Set([
  // Türkçe
  've', 'ile', 'bir', 'bu', 'şu', 'da', 'de', 'ki', 'mi', 'mu', 'mı', 'mü',
  'için', 'gibi', 'daha', 'çok', 'en', 'ama', 'fakat', 'ancak', 'veya', 'ya',
  'olan', 'olarak', 'olanlar', 'üzerine', 'hakkında', 'tarafından', 'sonra',
  'önce', 'kadar', 'her', 'tüm', 'bütün', 'kendi', 'hem', 'ne', 'nasıl', 'neden',
  'film', 'filmi', 'filmler', 'filmleri', 'hikaye', 'hikayesi', 'hikâye', 'hikâyesi',
  'konusu', 'anlatır', 'anlatan', 'izle', 'izlenecek', 'benzer', 'tarzında', 'göre',
  'dünya', 'dünyasında', 'hayat', 'hayatı', 'yaşam', 'insan', 'insanlar', 'yeni',
  'eski', 'büyük', 'küçük', 'genç', 'adam', 'kadın', 'gün', 'yıl', 'zamanla',
  'karşı', 'arasında', 'içinde', 'dışında', 'birlikte', 'ortaya', 'çıkar', 'başlar',
  'çalışır', 'eder', 'olan', 'olur', 'bulur', 'geçen', 'konulu', 'temalı', 'yapım',
  // İngilizce
  'the', 'and', 'for', 'with', 'that', 'this', 'from', 'into', 'about', 'after',
  'before', 'their', 'there', 'where', 'when', 'while', 'which', 'whose', 'who',
  'what', 'have', 'has', 'had', 'been', 'being', 'will', 'would', 'could', 'should',
  'they', 'them', 'his', 'her', 'its', 'our', 'your', 'not', 'but', 'are', 'was',
  'were', 'one', 'two', 'new', 'old', 'man', 'woman', 'life', 'world', 'story',
  'movie', 'film', 'finds', 'must', 'takes', 'young', 'only', 'more', 'most',
  'some', 'over', 'through', 'between', 'against', 'during', 'under', 'after',
]);

/**
 * TMDB İngilizce anahtar kelimelerini doğal Türkçe tema ifadelerine çevirir.
 * Yalnızca gerçekten eşleşen doğrulanmış anahtar kelimeler için kullanılır.
 */
const KEYWORD_TR_MAP: Record<string, string> = {
  'space travel': 'uzay yolculuğu',
  'space': 'uzay atmosferi',
  'outer space': 'derin uzay',
  'spacecraft': 'uzay gemisi yolculuğu',
  'astronaut': 'astronot mücadelesi',
  'wormhole': 'solucan deliği ve kozmik fizik',
  'black hole': 'kara delik ve görelilik',
  'time travel': 'zaman yolculuğu',
  'time loop': 'zaman döngüsü',
  'time manipulation': 'zaman algısı kırılması',
  'artificial intelligence': 'yapay zekâ',
  'artificial intelligence (a.i.)': 'yapay zekâ',
  'cyberpunk': 'cyberpunk evreni',
  'dystopia': 'distopik düzen',
  'post-apocalyptic future': 'kıyamet sonrası atmosfer',
  'post-apocalyptic': 'kıyamet sonrası dünya',
  'simulated reality': 'simülasyon ve gerçeklik sorgulaması',
  'virtual reality': 'sanal gerçeklik',
  'dream': 'rüya ve bilinç katmanları',
  'lucid dreaming': 'bilinçaltı ve rüya mimarisi',
  'memory': 'bellek ve kimlik arayışı',
  'memory loss': 'hafıza kaybı gizemi',
  'amnesia': 'hafıza kaybı ve kimlik',
  'plot twist': 'ters köşe kurgu',
  'twist ending': 'beklenmedik final',
  'nonlinear timeline': 'doğrusal olmayan anlatım',
  'unreliable narrator': 'güvenilmez anlatıcı',
  'mindfuck': 'zihin bükücü kurgu',
  'psychological thriller': 'psikolojik gerilim',
  'paranoia': 'paranoya ve tekinsizlik',
  'conspiracy': 'komplo ve gizli ağlar',
  'investigation': 'dedektiflik soruşturması',
  'detective': 'dedektif takibi',
  'serial killer': 'seri katil soruşturması',
  'murder mystery': 'cinayet gizemi',
  'neo-noir': 'neo-noir atmosfer',
  'film noir': 'kara film estetiği',
  'heist': 'kusursuz soygun planı',
  'revenge': 'intikam öyküsü',
  'survival': 'hayatta kalma mücadelesi',
  'isolation': 'yalnızlık ve izolasyon',
  'alien': 'uzaylı teması ve bilinmeyen',
  'first contact': 'ilk temas teması',
  'father daughter relationship': 'baba-kız bağı',
  'father son relationship': 'baba-oğul ilişkisi',
  'family relationships': 'aile bağları',
  'grief': 'yas ve kayıpla yüzleşme',
  'existentialism': 'varoluşsal sorgulama',
  'philosophy': 'felsefi alt metin',
  'coming of age': 'büyüme ve olgunlaşma hikâyesi',
  'nostalgia': 'nostaljik dönem hissi',
  'friendship': 'derin dostluk teması',
  'road trip': 'yol hikâyesi',
  'organized crime': 'organize suç dünyası',
  'mafia': 'mafya ve güç dengeleri',
  'corruption': 'yozlaşma ve sistem eleştirisi',
  'class differences': 'sınıf çatışması',
  'social commentary': 'toplumsal eleştiri',
  'satire': 'keskin taşlama',
  'superhero': 'süper kahraman mitolojisi',
  'vigilante': 'kanunsuz adalet arayışı',
  'martial arts': 'dövüş sanatları koreografisi',
  'war': 'savaşın insani yüzü',
  'world war ii': 'II. Dünya Savaşı dönemi',
  'historical': 'tarihsel atmosfer',
  'biography': 'gerçek yaşam öyküsü',
  'music': 'müzik tutkusu',
  'obsession': 'takıntı ve mükemmeliyetçilik',
  'mental illness': 'zihinsel kırılma',
  'split personality': 'çoklu kişilik teması',
  'secret society': 'gizli örgütler',
  'escape': 'kaçış gerilimi',
  'prison': 'hapishane dramı',
  'romance': 'duygusal aşk anlatısı',
  'tragic romance': 'hüzünlü aşk hikâyesi',
  'haunted house': 'tekinsiz mekân korkusu',
  'supernatural': 'doğaüstü gizem',
  'magic': 'büyü ve fantastik evren',
  'epic': 'epik anlatım ölçeği',
};

interface VibeRule {
  patterns: RegExp[];
  themeTr: string;
  genreIds: number[];
  keywordIds: number[];
  boostTokens: string[];
}

/**
 * Türkçe ve İngilizce ruh hali / tema ifadelerini gerçek TMDB tür ve anahtar kelime ID'lerine eşler.
 */
const VIBE_INTENT_RULES: VibeRule[] = [
  {
    patterns: [/uzay/, /space/, /galaksi/, /gezegen/, /astronot/, /kozmik/],
    themeTr: 'uzay ve kozmik keşif',
    genreIds: [878],
    keywordIds: [9882, 1432, 3801, 161176], // space, space travel, spacecraft, astronaut
    boostTokens: ['space', 'uzay', 'planet', 'gezegen', 'astronaut', 'astronot', 'cosmic', 'galaksi', 'mars', 'earth'],
  },
  {
    patterns: [/zaman/, /time/, /paradoks/, /döngü/],
    themeTr: 'zaman kırılması ve paradoks',
    genreIds: [878, 9648],
    keywordIds: [4379, 10854], // time travel, time loop
    boostTokens: ['time', 'zaman', 'loop', 'future', 'past', 'gelecek', 'geçmiş', 'paradox'],
  },
  {
    patterns: [/ters\s*köşe/, /zihin\s*bükücü/, /twist/, /mind\s*bend/, /akıl\s*oyun/, /şaşırt/],
    themeTr: 'ters köşe ve zihin bükücü kurgu',
    genreIds: [53, 9648],
    keywordIds: [10683, 156866, 207928], // twist ending, plot twist, mindfuck
    boostTokens: ['twist', 'secret', 'gizem', 'gerçek', 'reality', 'illusion', 'memory', 'hafıza', 'mind', 'zihin'],
  },
  {
    patterns: [/cyberpunk/, /distop/, /distopya/, /gelecek/, /yapay\s*zek/, /robot/, /siber/],
    themeTr: 'distopik gelecek ve yapay zekâ',
    genreIds: [878, 28],
    keywordIds: [4565, 12190, 310], // dystopia, cyberpunk, artificial intelligence
    boostTokens: ['dystopia', 'cyberpunk', 'future', 'gelecek', 'ai', 'robot', 'yapay', 'system', 'distopya'],
  },
  {
    patterns: [/polisiye/, /dedektif/, /seri\s*katil/, /cinayet/, /suç/, /noir/, /soruşturma/],
    themeTr: 'karanlık polisiye ve soruşturma',
    genreIds: [80, 9648, 53],
    keywordIds: [10714, 703, 207268], // serial killer, detective, neo-noir
    boostTokens: ['detective', 'dedektif', 'murder', 'cinayet', 'killer', 'katil', 'crime', 'suç', 'investigation', 'police'],
  },
  {
    patterns: [/nostalj/, /yağmur/, /sıcak/, /huzur/, /duygusal/, /dokunaklı/, /içimi\s*ısıt/],
    themeTr: 'sıcak ve nostaljik duygu dünyası',
    genreIds: [18, 10749, 35],
    keywordIds: [10683, 9713, 6054], // coming of age, friendship
    boostTokens: ['nostalgia', 'memory', 'friend', 'dostluk', 'love', 'aşk', 'family', 'aile', 'warm', 'heart', 'childhood'],
  },
  {
    patterns: [/yol\s*hikay/, /yolculuk/, /road\s*trip/, /macera/, /keşif/],
    themeTr: 'yolculuk ve keşif teması',
    genreIds: [12, 35, 18],
    keywordIds: [7312, 10051], // road trip, adventure
    boostTokens: ['journey', 'yolculuk', 'road', 'trip', 'travel', 'adventure', 'macera', 'quest'],
  },
  {
    patterns: [/karanlık/, /kasvet/, /tekinsiz/, /gerilim/, /psikolojik/, /paranoy/],
    themeTr: 'karanlık atmosfer ve psikolojik gerilim',
    genreIds: [53, 9648],
    keywordIds: [12565, 10085], // psychological thriller, paranoia
    boostTokens: ['dark', 'karanlık', 'psychological', 'psikolojik', 'obsession', 'fear', 'korku', 'tension', 'gerilim'],
  },
  {
    patterns: [/hayatta\s*kalma/, /survival/, /yalnız/, /izolas/],
    themeTr: 'yalnızlık ve hayatta kalma mücadelesi',
    genreIds: [53, 18, 12],
    keywordIds: [10349, 14601], // survival, isolation
    boostTokens: ['survival', 'survive', 'hayatta', 'alone', 'yalnız', 'isolated', 'stranded', 'escape'],
  },
  {
    patterns: [/intikam/, /revenge/, /soygun/, /heist/, /mafya/],
    themeTr: 'intikam ve yüksek tempolu suç',
    genreIds: [28, 80, 53],
    keywordIds: [9748, 10051, 642], // revenge, heist
    boostTokens: ['revenge', 'intikam', 'heist', 'soygun', 'gang', 'mafia', 'vengeance'],
  },
  {
    patterns: [/kork/, /urper/, /kabus/, /horror/, /scary/, /dogaustu/, /hayalet/, /lanet/, /seytan/, /cin\b/],
    themeTr: 'tekinsiz korku ve doğaüstü gerilim',
    genreIds: [27, 9648, 53],
    keywordIds: [162846, 9853, 15001, 10224], // ghost, supernatural, demon, haunted house
    boostTokens: ['horror', 'korku', 'korkan', 'fear', 'haunted', 'ghost', 'supernatural', 'demon', 'curse', 'lanet', 'scary', 'nightmare'],
  },
  {
    patterns: [/cocuk/, /bebek/, /oglan/, /child/, /kid\b/, /kids/, /boy\b/],
    themeTr: 'çocuk kahraman ve büyüme hikâyesi',
    genreIds: [18, 9648, 12],
    keywordIds: [10683, 6054, 156091], // coming of age, friendship, child
    boostTokens: ['child', 'children', 'cocuk', 'kid', 'boy', 'girl', 'family', 'aile', 'school', 'okul'],
  },
  {
    patterns: [/kiz\b/, /kizlar/, /girl/, /girls/, /kadin/, /woman/, /women/, /genc/, /lise/, /teen/, /okul/],
    themeTr: 'gençlik, dostluk ve kadın odaklı anlatı',
    genreIds: [18, 35, 10749],
    keywordIds: [10683, 6054, 6270, 9713], // coming of age, friendship, high school
    boostTokens: ['girl', 'girls', 'kiz', 'woman', 'women', 'kadin', 'teen', 'genc', 'lise', 'school', 'friend', 'friendship', 'dostluk'],
  },
  {
    patterns: [/ask\b/, /romantik/, /sevgi/, /sevgili/, /love/, /romance/, /ayrilik/],
    themeTr: 'duygusal aşk ve ilişki hikâyesi',
    genreIds: [10749, 18],
    keywordIds: [9673, 128], // love, romance
    boostTokens: ['love', 'romance', 'ask', 'romantik', 'heart', 'relationship', 'couple'],
  },
  {
    patterns: [/komik/, /komedi/, /eglence/, /gul/, /kahkaha/, /comedy/, /funny/],
    themeTr: 'eğlenceli ve tempolu komedi',
    genreIds: [35],
    keywordIds: [6054, 9716], // friendship, stand-up/comedy
    boostTokens: ['comedy', 'funny', 'komedi', 'komik', 'laugh', 'humor', 'fun'],
  },
  {
    patterns: [/vampir/, /zombi/, /canavar/, /yaratik/, /buyu/, /fantastik/, /ejderha/, /magic/, /fantasy/],
    themeTr: 'fantastik evren ve doğaüstü kurgu',
    genreIds: [14, 27, 12],
    keywordIds: [3133, 12377, 2343], // vampire, zombie, magic
    boostTokens: ['vampire', 'zombie', 'monster', 'magic', 'fantasy', 'dragon', 'supernatural', 'fantastik', 'buyu'],
  },
  {
    patterns: [/spor/, /futbol/, /basketbol/, /boks/, /yaris/, /araba/, /sport/],
    themeTr: 'spor tutkusu ve rekabet hikâyesi',
    genreIds: [18, 28],
    keywordIds: [6075, 2070], // sports, boxing
    boostTokens: ['sport', 'football', 'boxing', 'race', 'racing', 'team', 'champion', 'spor', 'futbol', 'yaris'],
  },
  {
    patterns: [/muzik/, /dans/, /sanat/, /ressam/, /sarkici/, /music/],
    themeTr: 'müzik, sanat ve tutku anlatısı',
    genreIds: [18, 10402],
    keywordIds: [4344, 6027], // musical, music
    boostTokens: ['music', 'song', 'band', 'singer', 'dance', 'art', 'muzik', 'sanat', 'dans'],
  },
  {
    patterns: [/savas/, /tarih/, /epik/, /historical/, /war\b/],
    themeTr: 'tarihsel ve epik anlatım',
    genreIds: [10752, 36, 18],
    keywordIds: [1956, 15060], // world war ii, historical
    boostTokens: ['war', 'savas', 'soldier', 'battle', 'history', 'tarih', 'empire', 'epic'],
  },
];

export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/ı/g, 'i')
    .replace(/İ/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ş/g, 's')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenizePlotText(text: string): string[] {
  const norm = normalizeText(text);
  if (!norm) return [];
  return norm
    .split(' ')
    .filter((tok) => tok.length >= 3 && !STOPWORDS.has(tok) && !/^\d+$/.test(tok));
}

export function computeCosineTokenSimilarity(tokensA: string[], tokensB: string[]): {
  score: number;
  sharedTerms: string[];
} {
  if (tokensA.length === 0 || tokensB.length === 0) {
    return { score: 0, sharedTerms: [] };
  }

  const freqA = new Map<string, number>();
  const freqB = new Map<string, number>();

  for (const t of tokensA) freqA.set(t, (freqA.get(t) || 0) + 1);
  for (const t of tokensB) freqB.set(t, (freqB.get(t) || 0) + 1);

  let dot = 0;
  let magA = 0;
  let magB = 0;
  const shared: string[] = [];

  for (const [term, countA] of freqA.entries()) {
    magA += countA * countA;
    const countB = freqB.get(term);
    if (countB) {
      dot += countA * countB;
      shared.push(term);
    }
  }
  for (const countB of freqB.values()) {
    magB += countB * countB;
  }

  if (magA === 0 || magB === 0) return { score: 0, sharedTerms: [] };
  return {
    score: dot / (Math.sqrt(magA) * Math.sqrt(magB)),
    sharedTerms: shared,
  };
}

export function translateKeywordToTurkish(keyword: string): string | null {
  const clean = keyword.toLowerCase().trim();
  if (KEYWORD_TR_MAP[clean]) return KEYWORD_TR_MAP[clean];
  // Kısmi eşleşme kontrolü (örn. "space exploration" -> "uzay atmosferi")
  for (const [key, tr] of Object.entries(KEYWORD_TR_MAP)) {
    if (clean.includes(key) && key.length >= 5) {
      return tr;
    }
  }
  return null;
}

export function extractVibeIntent(prompt: string, requestedGenreId: number | null): VibeIntent {
  const lower = prompt.toLowerCase();
  const ascii = normalizeText(prompt);
  const matchedThemesTr: string[] = [];
  const genreSet = new Set<number>();
  const keywordSet = new Set<number>();
  const boostTokens = new Set<string>(tokenizePlotText(prompt));
  const searchTermsEn = new Set<string>();

  if (requestedGenreId) genreSet.add(requestedGenreId);

  for (const rule of VIBE_INTENT_RULES) {
    if (rule.patterns.some((p) => p.test(lower) || p.test(ascii))) {
      matchedThemesTr.push(rule.themeTr);
      for (const gid of rule.genreIds) genreSet.add(gid);
      for (const kid of rule.keywordIds) keywordSet.add(kid);
      for (const bt of rule.boostTokens) boostTokens.add(normalizeText(bt));
      if (rule.boostTokens[0]) searchTermsEn.add(rule.boostTokens[0]);
    }
  }

  // Kullanıcının yazdığı orijinal İngilizce/uluslararası kelimeleri de TMDB keyword aramasına ekle (örn. "girls", "cyberpunk")
  for (const tok of tokenizePlotText(prompt)) {
    if (tok.length >= 3) searchTermsEn.add(tok);
  }

  const wantsAnimation =
    requestedGenreId === 16 ||
    /animasyon|anime|cizgi|pixar|ghibli|cartoon/i.test(ascii);

  return {
    tokens: Array.from(boostTokens),
    matchedThemesTr,
    inferredGenreIds: Array.from(genreSet),
    inferredKeywordIds: Array.from(keywordSet),
    searchTermsEn: Array.from(searchTermsEn).slice(0, 4),
    wantsAnimation,
  };
}

function extractSingleTitleRoot(rawTitle: string): string {
  const norm = normalizeText(
    rawTitle
      .split(':')[0]
      .split(' - ')[0]
      .split(' – ')[0]
  )
    .replace(/^the\s+/i, '')
    .replace(/\b(part|chapter|volume|vol|episode|bolum|kisim)\s*[ivx0-9]+\b/gi, '')
    .replace(/\b(ii|iii|iv|v|vi|vii|viii|ix|x|[1-9]|1[0-9]|20)\b\s*$/gi, '')
    .replace(/\s+/g, ' ')
    .trim();
  return norm.length >= 3 ? norm : normalizeText(rawTitle).replace(/^the\s+/i, '').trim();
}

/**
 * Seri/franchise adı kökü çıkarır (TMDB belongs_to_collection null olsa bile aynı seriyi yakalar).
 */
export function extractFranchiseRoot(title: string, originalTitle: string): string {
  const raw = originalTitle || title || '';
  return extractSingleTitleRoot(raw);
}

/**
 * İki yapımın aynı seri/devam filmi olup olmadığını (TMDB collectionId + Türkçe/İngilizce başlık kökü) kesin olarak kontrol eder.
 * Örn: "Recep İvedik" vs "Recep İvedik 2..7", "The Maze Runner" vs "Maze Runner: The Scorch Trials",
 * "Labirent: Ölümcül Kaçış" vs "Labirent: Alev Deneyleri".
 */
export function isSameFranchiseOrSeries(
  seed: Pick<RichMovieMetadata, 'collectionId' | 'summary'>,
  candidate: Pick<RichMovieMetadata, 'collectionId' | 'summary'>
): boolean {
  if (seed.collectionId && candidate.collectionId && seed.collectionId === candidate.collectionId) {
    return true;
  }

  const seedRoots = Array.from(
    new Set(
      [seed.summary.title, seed.summary.originalTitle]
        .filter(Boolean)
        .map(extractSingleTitleRoot)
        .filter((r) => r.length >= 4)
    )
  );
  const candRoots = Array.from(
    new Set(
      [candidate.summary.title, candidate.summary.originalTitle]
        .filter(Boolean)
        .map(extractSingleTitleRoot)
        .filter((r) => r.length >= 4)
    )
  );

  for (const sr of seedRoots) {
    for (const cr of candRoots) {
      if (sr === cr) return true;
      // Uzun seri köklerinde kelime sınırı önek kontrolü (örn. "recep ivedik" -> "recep ivedik 5")
      if (sr.length >= 6 && (cr.startsWith(`${sr} `) || sr.startsWith(`${cr} `))) {
        return true;
      }
    }
  }

  return false;
}

function jaccardRatio<T>(a: T[], b: T[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setA = new Set(a);
  const setB = new Set(b);
  let intersection = 0;
  for (const item of setA) {
    if (setB.has(item)) intersection++;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

/**
 * 1) Film-Film çok boyutlu benzerlik skoru (0-100) hesaplar.
 * Sadece kategori (tür) benzerliğine izin vermez; konu, tema, atmosfer, anlatım, yönetmen ve oyuncuyu ölçer.
 */
export function computeMovieSimilarity(
  seed: RichMovieMetadata,
  candidate: RichMovieMetadata,
  signals: CandidateSignals = {},
  requestedGenreId: number | null = null
): ScoredCandidate {
  // 1. Tema & Anahtar Kelime Eşleşmesi (TMDB Keywords + Doğrulanmış Ortak Temalar)
  const seedKwSet = new Set(seed.keywordIds);
  const sharedKeywordNames: string[] = [];
  for (let i = 0; i < candidate.keywordIds.length; i++) {
    if (seedKwSet.has(candidate.keywordIds[i])) {
      const name = candidate.keywordNames[i];
      if (name) sharedKeywordNames.push(name);
    }
  }
  const kwJaccard = jaccardRatio(seed.keywordIds, candidate.keywordIds);
  const kwOverlapCoeff =
    Math.min(seed.keywordIds.length, candidate.keywordIds.length) > 0
      ? sharedKeywordNames.length /
        Math.min(seed.keywordIds.length, candidate.keywordIds.length)
      : 0;

  // 2. Konu / Özet / Anlatım Metin Benzerliği
  const seedTextTokens = tokenizePlotText(
    `${seed.overviewText} ${seed.tagline} ${seed.keywordNames.join(' ')}`
  );
  const candTextTokens = tokenizePlotText(
    `${candidate.overviewText} ${candidate.tagline} ${candidate.keywordNames.join(' ')}`
  );
  const plotSim = computeCosineTokenSimilarity(seedTextTokens, candTextTokens);

  // 3. Yaratıcı Kadro (Yönetmen, Senarist, Başrol/Kadro)
  const sharedDirectors = candidate.directorNames.filter((d) =>
    seed.directorNames.includes(d)
  );
  const sharedWriters = candidate.writerNames.filter((w) =>
    seed.writerNames.includes(w)
  );
  const sharedCast = candidate.castNames.filter((c) => seed.castNames.includes(c));

  // 4. Tür & Ton Uyumu (bilinçli olarak sınırlı ağırlıkta — tek başına yüksek skor veremez!)
  const seedGenreSet = new Set(seed.genreIds);
  const sharedGenreIds = candidate.genreIds.filter((id) => seedGenreSet.has(id));
  const sharedGenres = candidate.genres.filter((g) => seed.genres.includes(g));
  const genreJaccard = jaccardRatio(seed.genreIds, candidate.genreIds);

  // Animasyon / Canlı çekim ton uyumsuzluğu cezası (seçilen film animasyon değilse animasyon adayını kırp)
  const seedIsAnimation = seed.genreIds.includes(16);
  const candIsAnimation = candidate.genreIds.includes(16);
  const animationMismatch = !seedIsAnimation && candIsAnimation && requestedGenreId !== 16;

  // 5. Dönem, Tempo & Atmosfer Bağlamı
  let eraScore = 0.55;
  if (seed.yearNum && candidate.yearNum) {
    const diff = Math.abs(seed.yearNum - candidate.yearNum);
    if (diff <= 5) eraScore = 1.0;
    else if (diff <= 12) eraScore = 0.82;
    else if (diff <= 22) eraScore = 0.65;
    else if (diff <= 35) eraScore = 0.48;
    else eraScore = 0.32;
  }

  let pacingScore = 0.6;
  if (seed.summary.runtime && candidate.summary.runtime) {
    const rDiff = Math.abs(seed.summary.runtime - candidate.summary.runtime);
    if (rDiff <= 15) pacingScore = 1.0;
    else if (rDiff <= 30) pacingScore = 0.78;
    else if (rDiff <= 50) pacingScore = 0.55;
    else pacingScore = 0.35;
  }

  const languageMatch =
    seed.originalLanguage && candidate.originalLanguage && seed.originalLanguage === candidate.originalLanguage
      ? 1.0
      : 0.55;

  // --- Alt Skorlar (her biri 0..100 ölçeğinde) ---

  // A) Hikâye, Tema ve Anlatım Skoru (en yüksek ağırlık: %54)
  const metadataThemeScore = clamp(
    Math.round(
      Math.min(1, sharedKeywordNames.length * 0.24 + kwJaccard * 1.4 + kwOverlapCoeff * 0.6) * 58 +
        Math.min(1, plotSim.score * 3.6) * 42
    ),
    0,
    100
  );

  let graphAndSemanticBoost = 0;
  if (signals.fromGemini) {
    // Gemini'nin semantik değerlendirmesi gerçek TMDB teması/özet/türle desteklendikçe tam ağırlık alır
    const gemRaw = clamp(signals.geminiSemanticScore ?? 78, 50, 96);
    const rankFactor = signals.geminiRank !== undefined ? Math.max(0.84, 1 - signals.geminiRank * 0.025) : 0.92;
    graphAndSemanticBoost = Math.round(gemRaw * rankFactor);
  } else if (signals.fromTmdbRecs) {
    const rank = signals.tmdbRecsRank ?? 8;
    graphAndSemanticBoost = clamp(Math.round(78 - rank * 2.2), 52, 78);
  } else if (signals.fromKeywordDiscover) {
    graphAndSemanticBoost = clamp(58 + sharedKeywordNames.length * 8, 56, 82);
  } else if (signals.fromTmdbSimilar) {
    graphAndSemanticBoost = 52;
  }

  const storyAndTheme = signals.fromGemini
    ? clamp(Math.round(graphAndSemanticBoost * 0.62 + metadataThemeScore * 0.38 + (signals.fromTmdbRecs ? 8 : 0)), 0, 100)
    : signals.fromTmdbRecs || signals.fromKeywordDiscover
      ? clamp(Math.round(graphAndSemanticBoost * 0.52 + metadataThemeScore * 0.48 + (sharedKeywordNames.length > 0 ? 8 : 0)), 0, 100)
      : clamp(Math.round(metadataThemeScore * 0.78 + graphAndSemanticBoost * 0.22), 0, 100);

  // B) Tür & Ton Skoru (ağırlık: %18 — tek başına filmi yukarı taşıyamaz)
  let genreAndTone = Math.round(
    (genreJaccard * 0.72 + (sharedGenreIds.length > 0 && seed.genreIds[0] === candidate.genreIds[0] ? 0.28 : 0)) * 100
  );
  if (requestedGenreId && candidate.genreIds.includes(requestedGenreId)) {
    genreAndTone = Math.min(100, genreAndTone + 15);
  }
  if (animationMismatch) {
    genreAndTone = Math.max(0, genreAndTone - 55);
  }

  // C) Yaratıcı Kadro DNA'sı (ağırlık: %13)
  let creativeDna = 20; // nötr taban (farklı yönetmenler de çok benzer olabilir, cezalandırmayız)
  if (sharedDirectors.length > 0) creativeDna += 55;
  if (sharedWriters.length > 0) creativeDna += 20;
  if (sharedCast.length > 0) creativeDna += Math.min(35, sharedCast.length * 18);
  creativeDna = clamp(creativeDna, 0, 100);

  // D) Atmosfer, Dönem & Tempo (ağırlık: %15)
  const atmosphereAndEra = clamp(
    Math.round((eraScore * 0.45 + pacingScore * 0.35 + languageMatch * 0.2) * 100),
    0,
    100
  );

  // Ağırlıklı Toplam Benzerlik Skoru (0-100)
  // Not: IMDb/TMDB puanı (voteAverage) benzerlik puanına karıştırılmaz!
  let overall = Math.round(
    storyAndTheme * 0.54 +
      genreAndTone * 0.18 +
      creativeDna * 0.13 +
      atmosphereAndEra * 0.15
  );

  // Güvenilirlik & Alakasız Film Korumaları:
  // 1) Sadece tür eşleşmesi varsa ama konu/tema/yaratıcı/semantik bağ yoksa skoru sertçe kırp!
  const hasRealContentConnection =
    sharedKeywordNames.length > 0 ||
    plotSim.score >= 0.08 ||
    sharedDirectors.length > 0 ||
    sharedWriters.length > 0 ||
    sharedCast.length > 0 ||
    Boolean(signals.fromGemini) ||
    Boolean(signals.fromTmdbRecs);

  if (!hasRealContentConnection) {
    overall = Math.min(overall, 39);
  }

  // 2) Sadece TMDB similar'dan gelmiş ama keyword ve özet örtüşmesi sıfırsa kırp
  if (
    !signals.fromGemini &&
    !signals.fromTmdbRecs &&
    sharedKeywordNames.length === 0 &&
    plotSim.score < 0.06 &&
    sharedDirectors.length === 0 &&
    sharedCast.length === 0
  ) {
    overall = Math.min(overall, 42);
  }

  // 3) Animasyon uyumsuzluğu cezası
  if (animationMismatch) {
    overall = Math.max(20, overall - 26);
  }

  // 4) Çok az oylanmış alakasız/belirsiz yapımları hafifçe düşür (benzerliği puanla karıştırmadan)
  if (candidate.summary.voteCount < 40) {
    overall = Math.max(20, overall - 14);
  }

  // 5) Gerçekçi 0-98 aralığı (birebir aynı film olmadığı sürece %100 göstermeyiz)
  const similarityScore = clamp(overall, 15, 98);

  // Doğrulanmış eşleşme etiketleri (UI rozetleri için, %100 gerçek metadata)
  const matchHighlights: string[] = [];
  if (sharedDirectors.length > 0) {
    matchHighlights.push(`Aynı Yönetmen: ${sharedDirectors[0]}`);
  }
  if (sharedCast.length > 0) {
    matchHighlights.push(`Ortak Oyuncu: ${sharedCast[0]}`);
  }
  const trThemes = sharedKeywordNames
    .map(translateKeywordToTurkish)
    .filter((v): v is string => Boolean(v));
  const uniqueTrThemes = Array.from(new Set(trThemes));

  if (uniqueTrThemes.length > 0) {
    matchHighlights.push(`Tema: ${uniqueTrThemes[0]}`);
  } else if (signals.geminiSharedThemes && signals.geminiSharedThemes.length > 0) {
    matchHighlights.push(`Tema: ${signals.geminiSharedThemes[0]}`);
  }

  if (signals.fromTmdbRecs && matchHighlights.length < 3) {
    matchHighlights.push('Benzer İzleyici Tercihi');
  } else if (plotSim.score >= 0.1 && matchHighlights.length < 3) {
    matchHighlights.push('Benzer Hikâye Örgüsü');
  } else if (atmosphereAndEra >= 78 && matchHighlights.length < 3) {
    matchHighlights.push('Yakın Dönem & Tempo');
  }

  const isSameSeedCollection = isSameFranchiseOrSeries(seed, candidate);

  return {
    metadata: candidate,
    signals,
    similarityScore,
    similarityBreakdown: {
      storyAndTheme,
      genreAndTone,
      creativeDna,
      atmosphereAndEra,
    },
    matchHighlights: matchHighlights.slice(0, 3),
    sharedKeywords: uniqueTrThemes.length > 0 ? uniqueTrThemes : sharedKeywordNames.slice(0, 4),
    sharedDirectors,
    sharedWriters,
    sharedCast,
    sharedGenres,
    plotOverlapTerms: plotSim.sharedTerms.slice(0, 5),
    isSameSeedCollection,
  };
}

/**
 * 2) Ruh hali / tema (Vibe) modunda 0-100 benzerlik skoru hesaplar.
 */
export function computeVibeSimilarity(
  prompt: string,
  requestedGenreId: number | null,
  candidate: RichMovieMetadata,
  signals: CandidateSignals = {}
): ScoredCandidate {
  const intent = extractVibeIntent(prompt, requestedGenreId);

  const candTokens = tokenizePlotText(
    `${candidate.summary.title} ${candidate.summary.originalTitle} ${candidate.overviewText} ${candidate.tagline} ${candidate.keywordNames.join(' ')} ${candidate.genres.join(' ')}`
  );
  const textSim = computeCosineTokenSimilarity(intent.tokens, candTokens);

  const matchedKeywordIds = candidate.keywordIds.filter((id) =>
    intent.inferredKeywordIds.includes(id)
  );
  const matchedTrKeywords = candidate.keywordNames
    .map(translateKeywordToTurkish)
    .filter((v): v is string => Boolean(v));

  // Tür uyumu
  const matchedGenreIds = candidate.genreIds.filter((id) =>
    intent.inferredGenreIds.includes(id)
  );
  const requestedGenreMatched = requestedGenreId
    ? candidate.genreIds.includes(requestedGenreId)
    : true;

  const animationMismatch = !intent.wantsAnimation && candidate.genreIds.includes(16);

  const lexicalStoryScore = clamp(
    Math.round(
      Math.min(1, textSim.score * 3.2) * 55 +
        Math.min(1, matchedKeywordIds.length * 0.35) * 45
    ),
    0,
    100
  );

  const discoverySignalBoost = signals.fromDirectSearch
    ? 68
    : signals.fromKeywordDiscover
      ? 60 + Math.min(18, matchedGenreIds.length * 9)
      : 0;

  const storyAndTheme = signals.fromGemini
    ? clamp(
        Math.round(
          clamp(signals.geminiSemanticScore ?? 80, 52, 96) * 0.68 +
            lexicalStoryScore * 0.32
        ),
        0,
        100
      )
    : discoverySignalBoost > 0
      ? clamp(
          Math.round(
            Math.max(lexicalStoryScore, discoverySignalBoost * 0.72 + lexicalStoryScore * 0.35) +
              (matchedGenreIds.length > 0 ? 8 : 0)
          ),
          0,
          100
        )
      : clamp(Math.round(lexicalStoryScore * 0.85 + (matchedGenreIds.length > 0 ? 15 : 0)), 0, 100);

  let genreAndTone = requestedGenreMatched ? 75 : 35;
  if (intent.inferredGenreIds.length > 0) {
    genreAndTone = Math.round(
      (matchedGenreIds.length / Math.min(intent.inferredGenreIds.length, 2)) * 75 +
        (requestedGenreMatched ? 25 : 0)
    );
  }
  genreAndTone = clamp(genreAndTone, 0, 100);
  if (animationMismatch) genreAndTone = Math.max(0, genreAndTone - 55);

  const creativeDna = candidate.directorNames.length > 0 && candidate.castNames.length > 0 ? 70 : 45;
  const atmosphereAndEra = clamp(
    Math.round(
      (candidate.overviewText.length > 40 ? 45 : 20) +
        (candidate.summary.voteCount >= 150 ? 35 : candidate.summary.voteCount >= 50 ? 20 : 5) +
        (matchedTrKeywords.length > 0 ? 20 : 10)
    ),
    0,
    100
  );

  let overall = Math.round(
    storyAndTheme * 0.58 +
      genreAndTone * 0.22 +
      atmosphereAndEra * 0.12 +
      creativeDna * 0.08
  );

  const hasVibeEvidence =
    Boolean(signals.fromGemini) ||
    Boolean(signals.fromDirectSearch) ||
    Boolean(signals.fromKeywordDiscover) ||
    matchedKeywordIds.length > 0 ||
    textSim.score >= 0.06;

  if (!hasVibeEvidence) {
    overall = Math.min(overall, 42);
  }
  if (animationMismatch) {
    overall = Math.max(20, overall - 28);
  }
  if (candidate.summary.voteCount < 40) {
    overall = Math.max(20, overall - 14);
  }

  const similarityScore = clamp(overall, 15, 97);

  const matchHighlights: string[] = [];
  if (signals.geminiSharedThemes && signals.geminiSharedThemes.length > 0) {
    matchHighlights.push(`Tema: ${signals.geminiSharedThemes[0]}`);
  } else if (intent.matchedThemesTr.length > 0) {
    matchHighlights.push(`Tema: ${intent.matchedThemesTr[0]}`);
  } else if (matchedTrKeywords.length > 0) {
    matchHighlights.push(`Tema: ${matchedTrKeywords[0]}`);
  }
  if (candidate.directorNames[0]) {
    matchHighlights.push(`Yönetmen: ${candidate.directorNames[0]}`);
  }
  if (candidate.genres[0] && matchHighlights.length < 3) {
    matchHighlights.push(`Atmosfer: ${candidate.genres.slice(0, 2).join(' / ')}`);
  }

  return {
    metadata: candidate,
    signals,
    similarityScore,
    similarityBreakdown: {
      storyAndTheme,
      genreAndTone,
      creativeDna,
      atmosphereAndEra,
    },
    matchHighlights: matchHighlights.slice(0, 3),
    sharedKeywords: Array.from(new Set([...matchedTrKeywords, ...intent.matchedThemesTr])).slice(0, 4),
    sharedDirectors: [],
    sharedWriters: [],
    sharedCast: [],
    sharedGenres: candidate.genres.slice(0, 3),
    plotOverlapTerms: textSim.sharedTerms.slice(0, 5),
    isSameSeedCollection: false,
  };
}

/**
 * 3) Çeşitlilik ve Alaka Düzeyi Seçicisi (Greedy MMR-tarzı seçim)
 * - Hedef: en fazla 6 (maxCount) film.
 * - Alakasız filmleri sırf 6'ya tamamlamak için ASLA eklemez (minSimilarityScore eşiği).
 * - Aynı yönetmenden en fazla 1 film, aynı seri/koleksiyondan en fazla 1 film.
 * - Film türleri arasında mantıklı çeşitlilik sağlar.
 * - Sonuçları benzerlik skoruna göre en yüksekten en düşüğe sıralar.
 */
export function selectDiverseRecommendations(
  candidates: ScoredCandidate[],
  options: {
    maxCount?: number;
    minSimilarityScore?: number;
    requestedGenreId?: number | null;
  } = {}
): ScoredCandidate[] {
  const maxCount = options.maxCount ?? 6;
  const minSimilarityScore = options.minSimilarityScore ?? 48;

  // Alaka eşiği altındaki adayları ve aranan yapımın kendi serisindeki devam/ön filmlerini KESİN olarak ele
  const eligible = candidates.filter(
    (c) => !c.isSameSeedCollection && c.similarityScore >= minSimilarityScore
  );
  if (eligible.length === 0) return [];

  const selected: ScoredCandidate[] = [];
  const usedKeys = new Set<string>();
  const usedCollectionIds = new Set<number>();
  const usedFranchiseRoots = new Set<string>();
  const directorCounts = new Map<string, number>();
  const primaryGenreCounts = new Map<string, number>();
  const genreComboCounts = new Map<string, number>();

  const remaining = [...eligible];

  while (selected.length < maxCount && remaining.length > 0) {
    let bestIdx = -1;
    let bestEffectiveScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const cand = remaining[i];
      const mediaKey = `${cand.metadata.summary.mediaType || 'movie'}:${cand.metadata.summary.id}`;
      if (usedKeys.has(mediaKey)) continue;

      // Aynı koleksiyon / seri kuralı: aynı seriden en fazla 1 yapım
      if (cand.metadata.collectionId && usedCollectionIds.has(cand.metadata.collectionId)) {
        continue;
      }
      const franchiseRoot = extractFranchiseRoot(
        cand.metadata.summary.title,
        cand.metadata.summary.originalTitle
      );
      if (franchiseRoot && usedFranchiseRoots.has(franchiseRoot)) {
        continue;
      }

      // Aynı yönetmen kuralı: bir yönetmenden en fazla 1 yapım
      const primaryDirector = cand.metadata.directorNames[0]?.toLowerCase() || '';
      if (primaryDirector && (directorCounts.get(primaryDirector) || 0) >= 1) {
        continue;
      }

      let effective = cand.similarityScore;

      // Tür çeşitliliği dengesi: aynı tür kombinasyonu veya ana tür üst üste yığılıyorsa çeşitliliği ödüllendir
      const primaryGenre = cand.metadata.genres[0] || '';
      const genreCombo = cand.metadata.genres.slice(0, 2).sort().join('|');
      if (!options.requestedGenreId) {
        const samePrimaryCount = primaryGenre ? primaryGenreCounts.get(primaryGenre) || 0 : 0;
        const sameComboCount = genreCombo ? genreComboCounts.get(genreCombo) || 0 : 0;
        if (samePrimaryCount >= 2) effective -= (samePrimaryCount - 1) * 5;
        if (sameComboCount >= 1) effective -= sameComboCount * 4;
      } else {
        const sameComboCount = genreCombo ? genreComboCounts.get(genreCombo) || 0 : 0;
        if (sameComboCount >= 2) effective -= (sameComboCount - 1) * 4;
      }

      if (
        effective > bestEffectiveScore ||
        (effective === bestEffectiveScore &&
          bestIdx >= 0 &&
          cand.metadata.summary.voteAverage > remaining[bestIdx].metadata.summary.voteAverage)
      ) {
        bestEffectiveScore = effective;
        bestIdx = i;
      }
    }

    if (bestIdx === -1) break;

    const chosen = remaining.splice(bestIdx, 1)[0];
    selected.push(chosen);
    usedKeys.add(`${chosen.metadata.summary.mediaType || 'movie'}:${chosen.metadata.summary.id}`);
    if (chosen.metadata.collectionId) {
      usedCollectionIds.add(chosen.metadata.collectionId);
    }
    const chosenRoot = extractFranchiseRoot(
      chosen.metadata.summary.title,
      chosen.metadata.summary.originalTitle
    );
    if (chosenRoot) usedFranchiseRoots.add(chosenRoot);

    const chosenDirector = chosen.metadata.directorNames[0]?.toLowerCase();
    if (chosenDirector) {
      directorCounts.set(chosenDirector, (directorCounts.get(chosenDirector) || 0) + 1);
    }

    const chosenPrimaryGenre = chosen.metadata.genres[0];
    if (chosenPrimaryGenre) {
      primaryGenreCounts.set(chosenPrimaryGenre, (primaryGenreCounts.get(chosenPrimaryGenre) || 0) + 1);
    }
    const chosenCombo = chosen.metadata.genres.slice(0, 2).sort().join('|');
    if (chosenCombo) {
      genreComboCounts.set(chosenCombo, (genreComboCounts.get(chosenCombo) || 0) + 1);
    }
  }

  // Son sıralama kesinlikle en yüksek benzerlik skorundan en düşüğe doğru
  selected.sort(
    (a, b) =>
      b.similarityScore - a.similarityScore ||
      b.metadata.summary.voteAverage - a.metadata.summary.voteAverage
  );

  return selected;
}

/**
 * 4) Her film için birbirinden farklı, %100 doğrulanmış metadata'ya dayanan
 * ve asla aynı şablonu tekrarlamayan Türkçe öneri gerekçeleri üretir.
 */
function buildFallbackReasonForCandidate(
  scored: ScoredCandidate,
  context: { mode: 'movie' | 'vibe'; query: string; seedTitle: string | null },
  index: number
): string {
  const { metadata, sharedKeywords, sharedDirectors, sharedCast, sharedGenres } = scored;
  const title = metadata.summary.title;
  const year = metadata.summary.year;
  const director = metadata.directorNames[0] || null;
  const leadActor = metadata.castNames[0] || null;
  const genrePair =
    sharedGenres.length >= 2
      ? `${sharedGenres[0]} ve ${sharedGenres[1]}`
      : metadata.genres.slice(0, 2).join(' ile ') || 'sinema';

  const topThemes = sharedKeywords
    .filter((k) => /[çğıöşüa-z]/i.test(k))
    .slice(0, 2);

  if (context.mode === 'movie' && context.seedTitle) {
    const seed = context.seedTitle;

    // 1. Ortak yönetmen varsa (gerçek TMDB verisinden doğrulanmış)
    if (sharedDirectors.length > 0) {
      const themeNote =
        topThemes.length > 0
          ? `özellikle ${topThemes.join(' ve ')} ekseninde`
          : `${genrePair.toLowerCase()} anlatımında`;
      return `${sharedDirectors[0]}'ın yönetmenlik imzasını taşıyan ${title}, "${seed}" ile aynı görsel disiplin ve kurgu ritmini ${themeNote} farklı bir öyküyle sürdürüyor.`;
    }

    // 2. Ortak oyuncu varsa (gerçek TMDB verisinden doğrulanmış)
    if (sharedCast.length > 0) {
      const themePart =
        topThemes.length > 0
          ? `${topThemes.join(' ve ')} temalarıyla`
          : `${genrePair.toLowerCase()} dokusuyla`;
      return `${sharedCast[0]}'ın da kadrosunda yer aldığı bu ${year ? `${year} yapımı ` : ''}film, "${seed}" izlerken yakalanan gerilimi ve duygu yoğunluğunu ${themePart} destekliyor.`;
    }

    // 3. Zengin ortak tema/anahtar kelime varsa — kart indeksine göre farklı sözdizimi seç
    if (topThemes.length > 0) {
      const themePhrase = topThemes.join(' ve ');
      const directorPrefix = director ? `${director} yönetimindeki ` : '';
      const patterns = [
        `${directorPrefix}${title}, "${seed}" ile ortaklaştığı ${themePhrase} motiflerini ${genrePair.toLowerCase()} çatısı altında derinleştiriyor.`,
        `"${seed}" filmindeki ${themePhrase} atmosferini sevenler için ${title}${year ? ` (${year})` : ''}, bu temaları ${leadActor ? `${leadActor}'ın merkezinde olduğu ` : ''}farklı bir dramatik çatışmayla işliyor.`,
        `Konusu itibarıyla ${themePhrase} odağında ilerleyen ${directorPrefix}${title}, "${seed}" yapımının kurduğu anlatı gerilimine ve tematik katmanlarına doğrudan karşılık veriyor.`,
        `${title}, yalnızca ${genrePair.toLowerCase()} kalıbında kalmayıp "${seed}" ile paylaştığı ${themePhrase} izleği sayesinde benzer bir izleme deneyimi sunuyor.`,
        `${year ? `${year} tarihli ` : ''}${title}, ${themePhrase} üzerine kurduğu hikâyesiyle "${seed}" sonrası aynı düşünsel ve atmosferik çizgide kalmak isteyenlere hitap ediyor.`,
        `Anlatım temposu ve ${themePhrase} vurgusuyla dikkat çeken ${directorPrefix}${title}, "${seed}" hayranlarının ilgisini çekecek güçlü bir hikâye paralelliği kuruyor.`,
      ];
      return patterns[index % patterns.length];
    }

    // 4. Ortak tema çevirisi yoksa ancak TMDB recommendations/özet örtüşmesi varsa — yine benzersiz şablonlar
    const directorPart = director ? `${director} imzalı ` : '';
    const castPart = leadActor ? `${leadActor} başrolündeki ` : '';
    const diverseNarrativePatterns = [
      `${directorPart}${title}${year ? ` (${year})` : ''}, "${seed}" ile örtüşen ${genrePair.toLowerCase()} dengesi ve karakter odaklı anlatım yapısıyla öne çıkıyor.`,
      `"${seed}" yapımını beğenen izleyicilerin sıkça yöneldiği ${castPart}${title}, benzer bir atmosfer ve dramatik gerilim kurmayı başarıyor.`,
      `${genrePair} öğelerini dengeli bir tempoyla harmanlayan ${directorPart}${title}, "${seed}" sonrası benzer tonda ama özgün bir hikâye arayanlar için isabetli bir seçim.`,
      `${year ? `${year} yapımı ` : ''}${title}, hikâye kurulumu ve ${genrePair.toLowerCase()} estetiği bakımından "${seed}" ile güçlü bir sinematik akrabalık taşıyor.`,
      `${castPart}${title}, "${seed}" filmindeki anlatı ciddiyetini ve atmosferik derinliği farklı bir olay örgüsü içinde yeniden yakalıyor.`,
      `Görsel atmosferi ve ${genrePair.toLowerCase()} yaklaşımıyla ${directorPart}${title}, "${seed}" izledikten sonra listenize ekleyebileceğiniz tutarlı bir devam deneyimi sunuyor.`,
    ];
    return diverseNarrativePatterns[index % diverseNarrativePatterns.length];
  }

  // Vibe modu için her filmde farklılaşan, gerçek metadata'ya dayalı açıklamalar
  const themePhrase = topThemes.length > 0 ? topThemes.join(' ve ') : genrePair.toLowerCase();
  const directorPart = director ? `${director} yönetimindeki ` : '';
  const vibePatterns = [
    `${directorPart}${title}${year ? ` (${year})` : ''}, aradığınız ${themePhrase} hissini ${genrePair.toLowerCase()} anlatımıyla tutarlı biçimde yansıtıyor.`,
    `"${context.query}" atmosferine doğrudan karşılık veren ${title}, özellikle ${themePhrase} odağındaki kurgusuyla öne çıkıyor.`,
    `${genrePair} türlerini ${themePhrase} ekseninde buluşturan ${title}${leadActor ? `, ${leadActor}'ın performansıyla` : ''} istediğiniz tona yakın bir deneyim sunuyor.`,
    `${year ? `${year} tarihli ` : ''}${directorPart}${title}, tematik derinliği ve ${themePhrase} atmosferiyle aramanızdaki ruh haline güçlü bir eşleşme sağlıyor.`,
    `Hikâye yapısı ve ${themePhrase} vurgusuyla dikkat çeken ${title}, "${context.query}" arayışınızda farklı bir yönetmenlik bakış açısı kazandırıyor.`,
    `${directorPart}${title}, yalnızca türüyle değil ${themePhrase} üzerine kurduğu ton ve anlatı ritmiyle de bu listeye yüksek uyumla giriyor.`,
  ];
  return vibePatterns[index % vibePatterns.length];
}

function getOpeningSignature(text: string): string {
  return normalizeText(text).split(' ').slice(0, 4).join(' ');
}

/**
 * Seçilmiş öneriler için Gemini veya TMDB tabanlı gerekçeleri birleştirir;
 * tekrar eden açılış şablonlarını eler ve CineBotRecommendation dizisi döner.
 */
export function finalizeRecommendations(
  selected: ScoredCandidate[],
  context: { mode: 'movie' | 'vibe'; query: string; seedTitle: string | null }
): CineBotRecommendation[] {
  const usedOpenings = new Set<string>();

  return selected.map((scored, idx) => {
    const geminiReason = scored.signals.geminiReason?.trim() || '';
    let finalReason = '';

    if (geminiReason.length >= 25) {
      const opening = getOpeningSignature(geminiReason);
      if (!usedOpenings.has(opening)) {
        finalReason = geminiReason;
        usedOpenings.add(opening);
      }
    }

    if (!finalReason) {
      // Benzersiz, şablon tekrarsız ve doğrulanmış metadata temelli gerekçe üret
      for (let attempt = 0; attempt < 6; attempt++) {
        const candidateReason = buildFallbackReasonForCandidate(scored, context, idx + attempt);
        const opening = getOpeningSignature(candidateReason);
        if (!usedOpenings.has(opening) || attempt === 5) {
          finalReason = candidateReason;
          usedOpenings.add(opening);
          break;
        }
      }
    }

    return {
      ...scored.metadata.summary,
      aiReason: finalReason,
      similarityScore: scored.similarityScore,
      similarityBreakdown: scored.similarityBreakdown,
      matchHighlights: scored.matchHighlights,
      director: scored.metadata.directorNames[0] ?? null,
      topCast: scored.metadata.castNames.slice(0, 4),
      imdbId: scored.metadata.imdbId,
    };
  });
}
