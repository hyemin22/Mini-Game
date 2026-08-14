const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DATA_FILE = path.join(DATA_DIR, 'accounts.json');

let accounts = new Map(); // phone -> { phone, nickname, profileImage, totalScore, gamesPlayed, friends: [phone], friendRequests, updatedAt }
let saveTimer = null;

function normalizePhone(phone) {
  return (phone || '').replace(/\D/g, ''); // digits only
}

function load() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = JSON.parse(fs.readFileSync(DATA_FILE, 'utf8'));
      let changed = false;
      accounts = new Map(raw.map(a => {
        const totalScore = Math.max(0, Number(a.totalScore) || 0);
        const gameScores = a.gameScores && typeof a.gameScores === 'object' ? a.gameScores : {};
        if (totalScore !== Number(a.totalScore) || !Array.isArray(a.friends) || !a.friendRequests || !a.gameScores) changed = true;
        return [a.phone, {
          friends: [],
          friendRequests: { incoming: [], outgoing: [] },
          ...a,
          profileImage: a.profileImage || null,
          friendRequests: {
            incoming: Array.isArray(a.friendRequests?.incoming) ? a.friendRequests.incoming : [],
            outgoing: Array.isArray(a.friendRequests?.outgoing) ? a.friendRequests.outgoing : [],
          },
          gameScores: Object.fromEntries(Object.entries(gameScores).map(([key, value]) => [key, Math.max(0, Number(value) || 0)])),
          totalScore,
        }];
      }));
      if (changed) saveNow();
    }
  } catch (err) {
    console.error('Failed to load accounts.json, starting fresh:', err.message);
    accounts = new Map();
  }
}

function saveNow() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    fs.writeFileSync(DATA_FILE, JSON.stringify([...accounts.values()], null, 2));
  } catch (err) {
    console.error('Failed to save accounts.json:', err.message);
  }
}

function saveDebounced() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 500);
}

function getOrCreateAccount(phone, nickname) {
  const key = normalizePhone(phone);
  let acc = accounts.get(key);
  if (!acc) {
    acc = { phone: key, nickname, profileImage: null, totalScore: 0, gamesPlayed: 0, gameScores: {}, friends: [], friendRequests: { incoming: [], outgoing: [] }, updatedAt: Date.now() };
    accounts.set(key, acc);
    saveDebounced();
  } else if (nickname && acc.nickname !== nickname) {
    acc.nickname = nickname; // keep the display name current
    saveDebounced();
  }
  acc.friendRequests ||= { incoming: [], outgoing: [] };
  acc.gameScores ||= {};
  return acc;
}

function findByPhone(phone) {
  return accounts.get(normalizePhone(phone)) || null;
}

function findByNickname(nickname) {
  const target = (nickname || '').trim().toLowerCase();
  return [...accounts.values()].find(a => a.nickname.toLowerCase() === target) || null;
}

function addScore(phone, delta, gameKey = null) {
  const key = normalizePhone(phone);
  const acc = accounts.get(key);
  if (!acc || !delta) return;
  const amount = Number(delta) || 0;
  acc.totalScore = Math.max(0, acc.totalScore + amount);
  if (gameKey) {
    acc.gameScores ||= {};
    acc.gameScores[gameKey] = Math.max(0, (Number(acc.gameScores[gameKey]) || 0) + amount);
  }
  acc.gamesPlayed += 1;
  acc.updatedAt = Date.now();
  saveDebounced();
}

function addGameScore(phone, gameKey, delta) {
  const key = normalizePhone(phone);
  const acc = accounts.get(key);
  const amount = Number(delta) || 0;
  if (!acc || !gameKey || amount <= 0) return;
  acc.gameScores ||= {};
  acc.gameScores[gameKey] = Math.max(0, (Number(acc.gameScores[gameKey]) || 0) + amount);
  acc.updatedAt = Date.now();
  saveDebounced();
}

// Mutual friendship — adds each phone to the other's friends list.
function addFriend(phone, friendPhone) {
  const me = findByPhone(phone);
  const friend = findByPhone(friendPhone);
  if (!me || !friend || me.phone === friend.phone) return { error: 'INVALID' };
  if (!me.friends.includes(friend.phone)) me.friends.push(friend.phone);
  if (!friend.friends.includes(me.phone)) friend.friends.push(me.phone);
  saveDebounced();
  return { me, friend };
}

function sendFriendRequest(phone, friendPhone) {
  const me = findByPhone(phone);
  const friend = findByPhone(friendPhone);
  if (!me || !friend) return { error: 'FRIEND_NOT_FOUND' };
  if (me.phone === friend.phone) return { error: 'CANNOT_ADD_FRIEND' };
  me.friendRequests ||= { incoming: [], outgoing: [] };
  friend.friendRequests ||= { incoming: [], outgoing: [] };
  if (me.friends.includes(friend.phone)) return { error: 'ALREADY_FRIENDS' };
  if (me.friendRequests.outgoing.includes(friend.phone)) return { error: 'REQUEST_ALREADY_SENT' };
  if (me.friendRequests.incoming.includes(friend.phone)) return { error: 'REQUEST_RECEIVED' };

  me.friendRequests.outgoing.push(friend.phone);
  friend.friendRequests.incoming.push(me.phone);
  saveDebounced();
  return { me, friend };
}

function acceptFriendRequest(phone, requesterPhone) {
  const me = findByPhone(phone);
  const requester = findByPhone(requesterPhone);
  if (!me || !requester || !me.friendRequests?.incoming.includes(requester.phone)) {
    return { error: 'REQUEST_NOT_FOUND' };
  }
  me.friendRequests.incoming = me.friendRequests.incoming.filter(p => p !== requester.phone);
  requester.friendRequests.outgoing = (requester.friendRequests.outgoing || []).filter(p => p !== me.phone);
  if (!me.friends.includes(requester.phone)) me.friends.push(requester.phone);
  if (!requester.friends.includes(me.phone)) requester.friends.push(me.phone);
  saveDebounced();
  return { me, friend: requester };
}

function rejectFriendRequest(phone, requesterPhone) {
  const me = findByPhone(phone);
  const requester = findByPhone(requesterPhone);
  if (!me || !requester || !me.friendRequests?.incoming.includes(requester.phone)) {
    return { error: 'REQUEST_NOT_FOUND' };
  }
  me.friendRequests.incoming = me.friendRequests.incoming.filter(p => p !== requester.phone);
  requester.friendRequests.outgoing = (requester.friendRequests.outgoing || []).filter(p => p !== me.phone);
  saveDebounced();
  return { me, friend: requester };
}

function removeFriend(phone, friendPhone) {
  const me = findByPhone(phone);
  const friend = findByPhone(friendPhone);
  if (!me || !friend || me.phone === friend.phone) return { error: 'INVALID' };
  me.friends = me.friends.filter(fp => fp !== friend.phone);
  friend.friends = friend.friends.filter(fp => fp !== me.phone);
  me.friendRequests = me.friendRequests || { incoming: [], outgoing: [] };
  friend.friendRequests = friend.friendRequests || { incoming: [], outgoing: [] };
  me.friendRequests.incoming = me.friendRequests.incoming.filter(fp => fp !== friend.phone);
  me.friendRequests.outgoing = me.friendRequests.outgoing.filter(fp => fp !== friend.phone);
  friend.friendRequests.incoming = friend.friendRequests.incoming.filter(fp => fp !== me.phone);
  friend.friendRequests.outgoing = friend.friendRequests.outgoing.filter(fp => fp !== me.phone);
  saveDebounced();
  return { me, friend };
}

function updateProfile(phone, { nickname, profileImage } = {}) {
  const acc = findByPhone(phone);
  if (!acc) return { error: 'NOT_FOUND' };

  const cleanNickname = String(nickname ?? acc.nickname).trim().slice(0, 10);
  if (!cleanNickname) return { error: 'INVALID_NICKNAME' };
  const duplicate = findByNickname(cleanNickname);
  if (duplicate && duplicate.phone !== acc.phone) return { error: 'NICKNAME_TAKEN' };

  if (profileImage !== undefined && profileImage !== null) {
    if (typeof profileImage !== 'string' || !/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(profileImage)) {
      return { error: 'INVALID_PROFILE_IMAGE' };
    }
    if (profileImage.length > 2_500_000) return { error: 'PROFILE_IMAGE_TOO_LARGE' };
    acc.profileImage = profileImage;
  }
  acc.nickname = cleanNickname;
  acc.updatedAt = Date.now();
  saveDebounced();
  return { account: acc };
}

function getFriends(phone) {
  const me = findByPhone(phone);
  if (!me) return [];
  return me.friends
    .map(fp => findByPhone(fp))
    .filter(Boolean)
    .map(f => ({ nickname: f.nickname, phone: f.phone, profileImage: f.profileImage || null }));
}

function getFriendRequests(phone) {
  const me = findByPhone(phone);
  if (!me) return { incoming: [], outgoing: [] };
  const incoming = (me.friendRequests?.incoming || [])
    .map(fp => findByPhone(fp)).filter(Boolean)
    .map(f => ({ nickname: f.nickname, phone: f.phone, profileImage: f.profileImage || null }));
  const outgoing = (me.friendRequests?.outgoing || [])
    .map(fp => findByPhone(fp)).filter(Boolean)
    .map(f => ({ nickname: f.nickname, phone: f.phone, profileImage: f.profileImage || null }));
  return { incoming, outgoing };
}

function publicProfile(acc) {
  return {
    nickname: acc.nickname,
    profileImage: acc.profileImage || null,
    totalScore: Math.max(0, Number(acc.totalScore) || 0),
    gamesPlayed: Math.max(0, Number(acc.gamesPlayed) || 0),
  };
}

function getProfile(phone) {
  const acc = findByPhone(phone);
  if (!acc) return null;
  const sorted = [...accounts.values()].sort((a, b) => Math.max(0, b.totalScore) - Math.max(0, a.totalScore));
  const rank = sorted.findIndex(item => item.phone === acc.phone) + 1;
  return { ...publicProfile(acc), rank, isAdmin: Boolean(acc.isAdmin) };
}

function getLeaderboard(limit = 20) {
  return [...accounts.values()]
    .sort((a, b) => Math.max(0, b.totalScore) - Math.max(0, a.totalScore))
    .slice(0, limit)
    .map(a => ({ ...publicProfile(a) }));
}

function getLeaderboardWithPresence(isOnline, limit = 20) {
  return [...accounts.values()]
    .sort((a, b) => Math.max(0, b.totalScore) - Math.max(0, a.totalScore))
    .slice(0, limit)
    .map(a => ({ ...publicProfile(a), online: !!isOnline?.(a.phone) }));
}

function getGameLeaderboard(gameKey, isOnline, limit = 20) {
  return [...accounts.values()]
    .sort((a, b) => (Number(b.gameScores?.[gameKey]) || 0) - (Number(a.gameScores?.[gameKey]) || 0))
    .slice(0, limit)
    .map(a => ({
      nickname: a.nickname,
      profileImage: a.profileImage || null,
      score: Math.max(0, Number(a.gameScores?.[gameKey]) || 0),
      online: !!isOnline?.(a.phone),
    }));
}

load();

module.exports = {
  getOrCreateAccount,
  findByPhone,
  findByNickname,
  addScore,
  addGameScore,
  addFriend,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  removeFriend,
  updateProfile,
  getFriends,
  getFriendRequests,
  getProfile,
  getLeaderboard,
  getLeaderboardWithPresence,
  getGameLeaderboard,
  normalizePhone,
};
