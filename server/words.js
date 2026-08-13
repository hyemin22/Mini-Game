// Word bank for Liar Game — everyday nouns, kept at similar (easy/common) difficulty.
const WORD_BANK = [
  { category: '음식', word: '김치찌개' },
  { category: '음식', word: '떡볶이' },
  { category: '음식', word: '삼겹살' },
  { category: '음식', word: '짜장면' },
  { category: '음식', word: '치킨' },
  { category: '음식', word: '초밥' },
  { category: '동물', word: '코끼리' },
  { category: '동물', word: '고양이' },
  { category: '동물', word: '펭귄' },
  { category: '동물', word: '기린' },
  { category: '동물', word: '토끼' },
  { category: '장소', word: '도서관' },
  { category: '장소', word: '해수욕장' },
  { category: '장소', word: '놀이공원' },
  { category: '장소', word: '편의점' },
  { category: '장소', word: '영화관' },
  { category: '직업', word: '소방관' },
  { category: '직업', word: '요리사' },
  { category: '직업', word: '선생님' },
  { category: '직업', word: '의사' },
  { category: '물건', word: '우산' },
  { category: '물건', word: '냉장고' },
  { category: '물건', word: '자전거' },
  { category: '물건', word: '헤드폰' },
  { category: '운동', word: '축구' },
  { category: '운동', word: '수영' },
  { category: '운동', word: '농구' },
  { category: '계절', word: '겨울' },
  { category: '계절', word: '장마' },
];

function randomWord() {
  return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
}

// Picks a category with at least two words, then returns the citizens' word
// plus a different "decoy" word from the same category for the liar.
function pickCategoryPair() {
  const byCategory = {};
  WORD_BANK.forEach(w => {
    (byCategory[w.category] = byCategory[w.category] || []).push(w.word);
  });
  const eligible = Object.entries(byCategory).filter(([, words]) => words.length >= 2);
  const [category, words] = eligible[Math.floor(Math.random() * eligible.length)];
  const shuffled = [...words].sort(() => Math.random() - 0.5);
  return { category, word: shuffled[0], decoyWord: shuffled[1] };
}

const STARTER_WORDS = WORD_BANK.map(w => w.word).filter(w => w.length >= 2);

function randomStarterWord() {
  return STARTER_WORDS[Math.floor(Math.random() * STARTER_WORDS.length)];
}

module.exports = { WORD_BANK, randomWord, randomStarterWord, pickCategoryPair };
