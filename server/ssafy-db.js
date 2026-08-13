const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'ssafy-images.json');
const TOTAL_LEVELS = 11;
const MAX_GAME_LEVEL = 30;
const MAX_IMAGE_LENGTH = 3_500_000;

let photos = new Map();
let saveTimer = null;

function load() {
  try {
    if (!fs.existsSync(DATA_FILE)) return;
    const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
    if (!Array.isArray(raw)) return;
    raw.forEach(item => {
      const level = Number(item.level);
      if (Number.isInteger(level) && level >= 1 && level <= TOTAL_LEVELS && typeof item.imageDataUrl === 'string') {
        photos.set(level, item);
      }
    });
  } catch (error) {
    console.error('Failed to load ssafy-images.json:', error.message);
    photos = new Map();
  }
}

function saveNow() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify([...photos.values()].sort((a, b) => a.level - b.level), null, 2));
  } catch (error) {
    console.error('Failed to save ssafy-images.json:', error.message);
  }
}

function saveDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
}

function publicPhoto(item) {
  return item ? { level: item.level, imageDataUrl: item.imageDataUrl, updatedBy: item.updatedBy, updatedAt: item.updatedAt } : { level: null, imageDataUrl: null };
}

function getAll() {
  return Array.from({ length: TOTAL_LEVELS }, (_, index) => publicPhoto(photos.get(index + 1)));
}

function getImages() {
  const registered = getAll().map(item => item.imageDataUrl);
  const fallback = registered[registered.length - 1] || registered.find(Boolean) || null;
  return Array.from({ length: MAX_GAME_LEVEL }, (_, index) => registered[index] || fallback);
}

function isComplete() {
  return photos.size === TOTAL_LEVELS && getAll().every(item => item.imageDataUrl);
}

function setPhoto(level, imageDataUrl, updatedBy) {
  const cleanLevel = Number(level);
  if (!Number.isInteger(cleanLevel) || cleanLevel < 1 || cleanLevel > TOTAL_LEVELS) return { error: 'INVALID_SSAFY_LEVEL' };
  if (typeof imageDataUrl !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(imageDataUrl)) return { error: 'INVALID_SSAFY_IMAGE' };
  if (imageDataUrl.length > MAX_IMAGE_LENGTH) return { error: 'SSAFY_IMAGE_TOO_LARGE' };
  const item = { level: cleanLevel, imageDataUrl, updatedBy: String(updatedBy || '사용자').trim().slice(0, 10), updatedAt: Date.now() };
  photos.set(cleanLevel, item);
  saveDebounced();
  return { item: publicPhoto(item) };
}

load();

module.exports = { TOTAL_LEVELS, MAX_GAME_LEVEL, getAll, getImages, isComplete, setPhoto };
