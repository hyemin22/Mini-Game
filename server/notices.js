const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'notices.json');
const COMMENT_LIMIT = 30;

let notices = [];
let saveTimer = null;

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      notices = Array.isArray(raw) ? raw : [];
      let pruned = false;
      notices.forEach(notice => {
        if (!Array.isArray(notice.comments)) return;
        const comments = notice.comments.slice(-COMMENT_LIMIT);
        if (comments.length !== notice.comments.length) {
          notice.comments = comments;
          pruned = true;
        }
      });
      if (pruned) saveNow();
    }
  } catch (error) {
    console.error('Failed to load notices.json, starting fresh:', error.message);
    notices = [];
  }
}

function saveNow() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify(notices, null, 2));
  } catch (error) {
    console.error('Failed to save notices.json:', error.message);
  }
}

function saveDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
}

function getNotices() {
  return notices
    .slice()
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 100)
    .map(item => ({
      ...item,
      comments: Array.isArray(item.comments) ? item.comments.slice(-COMMENT_LIMIT) : [],
    }));
}

function addNotice({ title, content, nickname } = {}) {
  const cleanTitle = String(title || '').trim().slice(0, 100);
  const cleanContent = String(content || '').trim().slice(0, 5000);
  if (!cleanTitle) return { error: 'INVALID_NOTICE_TITLE' };
  if (!cleanContent) return { error: 'INVALID_NOTICE_CONTENT' };

  const item = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: cleanTitle,
    content: cleanContent,
    nickname: String(nickname || '사용자').trim().slice(0, 10) || '사용자',
    createdAt: Date.now(),
    comments: [],
  };
  notices.push(item);
  saveDebounced();
  return { item: { ...item } };
}

function addComment({ noticeId, content, nickname } = {}) {
  const cleanContent = String(content || '').trim().slice(0, 1000);
  if (!cleanContent) return { error: 'INVALID_NOTICE_COMMENT' };
  const ordered = notices.slice().sort((a, b) => b.createdAt - a.createdAt);
  const target = ordered.find(item => item.id === noticeId) || ordered[0];
  if (!target) return { error: 'NOTICE_NOT_FOUND' };
  if (!Array.isArray(target.comments)) target.comments = [];
  const comment = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    content: cleanContent,
    nickname: String(nickname || '사용자').trim().slice(0, 10) || '사용자',
    createdAt: Date.now(),
  };
  target.comments.push(comment);
  target.comments = target.comments.slice(-COMMENT_LIMIT);
  saveDebounced();
  return { item: { ...comment }, noticeId: target.id };
}

load();

module.exports = { getNotices, addNotice, addComment };
