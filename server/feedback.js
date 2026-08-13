const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'feedback.json');

let feedback = [];
let saveTimer = null;

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      feedback = Array.isArray(raw) ? raw : [];
    }
  } catch (error) {
    console.error('Failed to load feedback.json, starting fresh:', error.message);
    feedback = [];
  }
}

function saveNow() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(feedback, null, 2));
  } catch (error) {
    console.error('Failed to save feedback.json:', error.message);
  }
}

function saveDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
}

function addFeedback({ title, content, nickname, phone } = {}) {
  const cleanTitle = String(title || '').trim().slice(0, 100);
  const cleanContent = String(content || '').trim().slice(0, 3000);
  if (!cleanTitle) return { error: 'INVALID_FEEDBACK_TITLE' };
  if (!cleanContent) return { error: 'INVALID_FEEDBACK_CONTENT' };

  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanTitle,
    content: cleanContent,
    nickname: String(nickname || '사용자').trim().slice(0, 10) || '사용자',
    phone: String(phone || ''),
    createdAt: Date.now(),
  };
  feedback.push(item);
  saveDebounced();
  return { item: { id: item.id, createdAt: item.createdAt } };
}

function getFeedback() {
  return feedback
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .map(item => ({ ...item }));
}

load();

module.exports = { addFeedback, getFeedback };
