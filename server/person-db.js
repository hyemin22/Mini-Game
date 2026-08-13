const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'person-db.json');
const MAX_IMAGE_LENGTH = 3_500_000;

let people = [];
let saveTimer = null;

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    people = Array.isArray(raw)
      ? raw.filter(item => item && typeof item.name === 'string' && typeof item.imageDataUrl === 'string')
      : [];
  } catch (error) {
    console.error('Failed to load person-db.json, starting fresh:', error.message);
    people = [];
  }
}

function saveNow() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(people, null, 2));
  } catch (error) {
    console.error('Failed to save person-db.json:', error.message);
  }
}

function saveDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
}

function publicPerson(person) {
  return {
    id: person.id,
    name: person.name,
    addedBy: person.addedBy || '사용자',
    createdAt: person.createdAt,
  };
}

function getCount() {
  return people.length;
}

function getRecent(limit = 8) {
  return people.slice(-limit).reverse().map(publicPerson);
}

function getAll() {
  return people.slice().reverse().map(person => ({
    ...publicPerson(person),
    imageDataUrl: person.imageDataUrl,
  }));
}

function addPerson({ name, imageDataUrl, addedBy } = {}) {
  const cleanName = String(name || '').trim().slice(0, 30);
  if (!cleanName) return { error: 'INVALID_PERSON_NAME' };
  if (typeof imageDataUrl !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(imageDataUrl)) {
    return { error: 'INVALID_PERSON_IMAGE' };
  }
  if (imageDataUrl.length > MAX_IMAGE_LENGTH) return { error: 'PERSON_IMAGE_TOO_LARGE' };

  const duplicate = people.some(person =>
    person.name.replace(/\s+/g, '').toLowerCase() === cleanName.replace(/\s+/g, '').toLowerCase()
    && person.imageDataUrl === imageDataUrl,
  );
  if (duplicate) return { error: 'PERSON_ALREADY_EXISTS' };

  const person = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: cleanName,
    imageDataUrl,
    addedBy: String(addedBy || '사용자').trim().slice(0, 10) || '사용자',
    createdAt: Date.now(),
  };
  people.push(person);
  saveDebounced();
  return { person: publicPerson(person) };
}

function pickRandom(limit = 10) {
  const shuffled = [...people];
  for (let i = shuffled.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.slice(0, Math.max(0, limit)).map(person => ({
    imageDataUrl: person.imageDataUrl,
    answer: person.name,
  }));
}

load();

module.exports = {
  addPerson,
  getCount,
  getRecent,
  getAll,
  pickRandom,
};
