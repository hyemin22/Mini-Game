const KOREAN_DICT_API_URL = 'https://krdict.korean.go.kr/api/search';
const REQUEST_TIMEOUT_MS = 5000;
const cache = new Map();

function normalizeWord(word) {
  return (word || '').trim().replace(/\s+/g, '');
}

const HANGUL_BASE = 0xac00;
const HANGUL_INITIAL_COUNT = 588;
const HANGUL_VOWEL_COUNT = 28;
const INITIAL_NIEUN = 2;
const INITIAL_RIEUL = 5;
const INITIAL_IEUNG = 11;

// Vowels that trigger the initial-sound rule for ㄴ/ㄹ.
const DUEUM_IEUNG_VOWELS = new Set([2, 6, 7, 12, 17, 20]); // ㅑ, ㅕ, ㅖ, ㅛ, ㅠ, ㅣ
const DUEUM_NIEUN_VOWELS = new Set([0, 1, 8, 11, 13, 18]); // ㅏ, ㅐ, ㅗ, ㅚ, ㅜ, ㅡ

function composeHangul(initial, vowel, final) {
  return String.fromCharCode(HANGUL_BASE + initial * HANGUL_INITIAL_COUNT + vowel * HANGUL_VOWEL_COUNT + final);
}

function dueumInitialVariants(syllable) {
  const code = syllable?.charCodeAt(0) - HANGUL_BASE;
  if (code < 0 || code > 11171) return [];

  const initial = Math.floor(code / HANGUL_INITIAL_COUNT);
  const vowel = Math.floor((code % HANGUL_INITIAL_COUNT) / HANGUL_VOWEL_COUNT);
  const final = code % HANGUL_VOWEL_COUNT;
  const variants = [];

  if (initial === INITIAL_NIEUN && DUEUM_IEUNG_VOWELS.has(vowel)) {
    variants.push(composeHangul(INITIAL_IEUNG, vowel, final));
  } else if (initial === INITIAL_RIEUL) {
    if (DUEUM_IEUNG_VOWELS.has(vowel)) {
      variants.push(composeHangul(INITIAL_IEUNG, vowel, final));
    } else if (DUEUM_NIEUN_VOWELS.has(vowel)) {
      variants.push(composeHangul(INITIAL_NIEUN, vowel, final));
    }
  }

  return variants;
}

function allowedChainStarts(previousWord) {
  const lastSyllable = normalizeWord(previousWord).slice(-1);
  return [lastSyllable, ...dueumInitialVariants(lastSyllable)];
}

function canChainFrom(previousWord, nextWord) {
  const normalizedNext = normalizeWord(nextWord);
  return allowedChainStarts(previousWord).includes(normalizedNext[0]);
}

function chainStartReason(previousWord) {
  const starts = allowedChainStarts(previousWord).filter(Boolean);
  if (starts.length <= 1) return `'${starts[0] || ''}'(으)로 시작해야 해요.`;
  return `'${starts[0]}'(으)로 시작해야 해요. 두음법칙으로 '${starts.slice(1).join("' 또는 '")}'도 가능해요.`;
}

function decodeXml(value) {
  return value
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}

function getErrorMessage(xml) {
  const code = xml.match(/<error_code>\s*([^<]+?)\s*<\/error_code>/i)?.[1];
  const message = xml.match(/<message>\s*([^<]+?)\s*<\/message>/i)?.[1];
  return code || message ? `${code || 'API'} ${message || '오류'}` : null;
}

function getWordsFromXml(xml) {
  return [...xml.matchAll(/<item>[\s\S]*?<word>\s*([^<]+?)\s*<\/word>[\s\S]*?<\/item>/gi)]
    .map(match => decodeXml(match[1]).trim());
}

async function validateKoreanWord(word) {
  const normalized = normalizeWord(word);
  if (!/^[가-힣]+$/.test(normalized)) {
    return { valid: false, reason: '한글 단어만 입력할 수 있어요.' };
  }

  const apiKey = (process.env.KOREAN_DICT_API_KEY || '').trim();
  if (!apiKey) {
    return { valid: false, reason: '서버에 KOREAN_DICT_API_KEY가 설정되지 않았어요.' };
  }

  if (cache.has(normalized)) return { valid: cache.get(normalized) };

  const params = new URLSearchParams({
    key: apiKey,
    q: normalized,
    start: '1',
    num: '10',
    part: 'word',
    method: 'exact',
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(`${KOREAN_DICT_API_URL}?${params}`, {
      signal: controller.signal,
      headers: { Accept: 'application/xml, text/xml' },
    });
    const xml = await response.text();
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const apiError = getErrorMessage(xml);
    if (apiError) throw new Error(apiError);

    const valid = getWordsFromXml(xml).some(entry => entry === normalized);
    cache.set(normalized, valid);
    if (cache.size > 5000) cache.delete(cache.keys().next().value);
    return { valid };
  } catch (error) {
    console.warn(`Korean dictionary validation failed for "${normalized}": ${error.message}`);
    return { valid: false, reason: '단어 사전을 확인하지 못했어요. 잠시 후 다시 제출해 주세요.' };
  } finally {
    clearTimeout(timeout);
  }
}

module.exports = {
  normalizeWord,
  validateKoreanWord,
  canChainFrom,
  chainStartReason,
};
