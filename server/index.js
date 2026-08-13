const path = require('path');
const fs = require('fs');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { RoomManager } = require('./rooms');
const { StackWorld, WORLD_WIDTH, GROUND_Y } = require('./stackPhysics');
const { HORSE_ROSTER, rollHorseWeights, pickWeightedWinner } = require('./horses');
const { normalizeWord, validateKoreanWord, canChainFrom, chainStartReason } = require('./wordValidator');
const { SUBWAY_LINES } = require('./subway-stations');
const accounts = require('./accounts');
const personDb = require('./person-db');
const feedbackDb = require('./feedback');
const noticeDb = require('./notices');
const ssafyDb = require('./ssafy-db');

// Node 20.12+ can load a local .env file without an extra dependency.
const envFile = path.join(__dirname, '..', '.env');
if (typeof process.loadEnvFile === 'function' && fs.existsSync(envFile)) {
  process.loadEnvFile(envFile);
}
const DEVELOPER_PHONE = accounts.normalizePhone(process.env.DEVELOPER_PHONE || '');
const configuredFrontendOrigins = (process.env.FRONTEND_URL || '')
  .split(',')
  .map(origin => origin.trim().replace(/\/$/, ''))
  .filter(Boolean);
const localFrontendOrigins = new Set([
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

function isAllowedFrontendOrigin(origin) {
  if (!origin) return true;
  return configuredFrontendOrigins.includes(origin) || localFrontendOrigins.has(origin);
}

function socketCorsOrigin(origin, callback) {
  if (isAllowedFrontendOrigin(origin)) return callback(null, true);
  return callback(new Error('Origin is not allowed by CORS'));
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  maxHttpBufferSize: 16 * 1024 * 1024,
  cors: {
    origin: socketCorsOrigin,
    methods: ['GET', 'POST'],
  },
});
const rooms = new RoomManager();
const onlineSockets = new Map(); // phone -> Set<socket>
const RECONNECT_GRACE_MS = 15000;
const reconnectingPlayers = new Map(); // phone -> { roomCode, playerId, oldSocketId, timer }

function addOnlineSocket(socket) {
  const phone = socket.account?.phone;
  if (!phone) return;
  const sockets = onlineSockets.get(phone) || new Set();
  sockets.add(socket);
  onlineSockets.set(phone, sockets);
  socket.onlinePhone = phone;
}

function removeOnlineSocket(socket) {
  const phone = socket.onlinePhone;
  if (!phone) return;
  const sockets = onlineSockets.get(phone);
  sockets?.delete(socket);
  if (!sockets?.size) onlineSockets.delete(phone);
  socket.onlinePhone = null;
}

function friendListFor(phone) {
  return accounts.getFriends(phone).map(friend => ({
    ...friend,
    online: onlineSockets.has(friend.phone),
  }));
}

function friendRequestsFor(phone) {
  return accounts.getFriendRequests(phone);
}

function emitFriendRequests(phone) {
  const requests = friendRequestsFor(phone);
  onlineSockets.get(phone)?.forEach(socket => socket.emit('friend_request_update', requests));
}

function broadcastFriendLists() {
  const sent = new Set();
  onlineSockets.forEach(sockets => sockets.forEach(socket => {
    if (sent.has(socket.id) || !socket.account) return;
    sent.add(socket.id);
    socket.emit('friend_list_update', friendListFor(socket.account.phone));
  }));
}

const DAY_DISCUSSION_MS = 120000;
const DAY_VOTE_MS = 45000;
const NIGHT_MS = 60000;
const LIAR_GUESS_MS = 30000;
const LIAR_TURN_MS = 30000;
const LIAR_SPEAKING_ROUNDS = 2;
const YELLOW_CARD_LIMIT = 2;

const NEXT_ROUND_DELAY_MS = 3000;
const QUIZ_ROUND_MS = 20000;
const CS_ROUND_MS = 20000;
const CS_QUESTION_COUNT = 10;

const STACK_TURN_MS = 25000;
const STACK_TICK_MS = 16;
const STACK_BROADCAST_EVERY = 2;
const STACK_SETTLE_MAX_MS = 2500;
const STACK_SETTLE_SPEED_EPS = 0.05;

const HORSE_BET_MS = 20000;
const HORSE_MIN_BET = 10;
const HORSE_STATS_COST = 50;
const HORSE_RACE_MS = 6500;
const HORSE_TOTAL_ROUNDS = 5;

const GUKBAP_MAX_MS = 120000;
const GUKBAP_STAGE_RANK = { idle: 0, poured: 1, mixing: 2, eating: 3, done: 4 };

const DRAWING_DURATION_MS = 60000;
const DRAWING_VOTE_MS = 20000;
const DRAWING_ROUND_TOTAL = 5;
const DRAWING_WIN_POINTS = 10;
const DRAWING_TOPICS = [
  '우주에서 피자 배달하기',
  '비 오는 날의 고양이',
  '용이 운영하는 카페',
  '바다에서 보물 찾기',
  '놀이공원에서 가장 신나는 순간',
  '잠에서 깬 공룡',
  '내가 상상한 미래의 학교',
  '햄버거를 먹는 외계인',
  '구름 위의 마을',
  '동물들의 운동회',
];

const MEMORY_PREVIEW_MS = 5000;
const MEMORY_TURN_MS = 20000;
const MEMORY_PAIR_REVEAL_MS = 1000;
const MEMORY_CARD_SYMBOLS = [
  '🍎', '🍊', '🍋', '🍉', '🍇', '🍓', '🫐', '🍒', '🍑', '🥭',
  '🍍', '🥝', '🍅', '🥥', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊',
  '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔',
  '🐧', '🐦', '🐤', '🦄', '🐝', '🦋', '🐢', '🐙', '🦀', '🐳',
  '🦖', '🦕', '🍕', '🍔', '🍟', '🍩', '🍪', '🍰', '🍦', '🧸',
];

const COFFEE_ROUND_MS = 15000;
const COFFEE_RESULT_DELAY_MS = 2500;
const COFFEE_MAX_ROUNDS = 10;
const COFFEE_DRINKS = [
  '☕ 아메리카노',
  '🥛 카페라떼',
  '🍵 녹차',
  '🧋 버블티',
  '🥤 콜라',
  '🍹 주스',
  '🧃 과일주스',
  '🍋 레몬에이드',
  '🥛 초코우유',
  '🫖 홍차',
  '🍓 딸기라떼',
];

const SUBWAY_ROUND_COUNT = 10;
const SUBWAY_ROUND_MS = 10000;
const TUG_WIN_THRESHOLD = 100;
const TUG_PULL_POWER = 5;
const TUG_MAX_TEAM_SIZE = 6;
const SONG_ROUND_MS = 30000;
const SONG_ROUND_TOTAL = 10;
const SONG_CLIP_MS = 30000;
const QUICK_JOIN_MODES = ['wordchain', 'coffee', 'memory', 'stack', 'subway', 'gukbap', 'horse', 'csquiz', 'drawing', 'quiz', 'mafia', 'liar', 'tug', 'songquiz', 'balance', 'ssafy', 'goalkeeper', 'foodroulette', 'band'];
const GOALKEEPER_SHOTS_PER_TURN = 10;
const GOALKEEPER_SHOT_MS = 12000;
const GOALKEEPER_RESULT_MS = 1800;
const SOLO_QUICK_JOIN_MODES = ['balance', 'ssafy', 'foodroulette', 'band'];
const BAND_INSTRUMENTS = new Set(['piano', 'electric1', 'electric2', 'bass', 'drums', 'vocal']);
const BAND_NOTE_TYPES = new Set(['note', 'chord', 'drum']);

const FOOD_ROULETTE_MENUS = [
  '떡볶이', '로제떡볶이', '마라떡볶이', '엽기떡볶이', '닭발', '국물닭발', '닭갈비', '찜닭',
  '치킨', '닭강정', '후라이드치킨', '양념치킨', '마라탕', '마라샹궈', '꿔바로우', '훠궈',
  '초밥', '연어초밥', '회덮밥', '육회', '연어덮밥', '참치마요덮밥', '김치볶음밥', '오므라이스',
  '제육덮밥', '불고기덮밥', '돈까스', '치즈돈까스', '냉모밀', '우동', '라멘', '탄탄멘',
  '쌀국수', '팟타이', '분짜', '타코', '부리또', '퀘사디아', '햄버거', '수제버거',
  '치즈버거', '핫도그', '피자', '페퍼로니피자', '고르곤졸라피자', '파스타', '로제파스타', '크림파스타',
  '알리오올리오', '리조또', '감바스', '샐러드파스타', '샌드위치', '잠봉뵈르', '크로플', '김밥',
  '참치김밥', '돈까스김밥', '삼각김밥', '라면', '불닭볶음면', '짜파게티', '비빔면', '냉면',
  '만두', '군만두', '순대', '어묵', '김치찌개', '부대찌개', '된장찌개', '순두부찌개',
  '돼지국밥', '설렁탕', '곰탕', '삼겹살', '목살', '곱창', '막창', '대창',
  '족발', '보쌈', '샤브샤브', '소고기', '닭한마리', '장어덮밥', '텐동', '카레',
  '돈부리', '규동', '가츠동', '떡국', '호떡', '붕어빵', '와플', '빙수',
  '아이스크림', '마카롱', '탕후루', '크레페',
];
function song(videoId, artist, title, highlightStart = 50, artistAliases = [], titleAliases = []) {
  return { videoId, artist, artistAliases, title, titleAliases, highlightStart };
}

// 공식 MV 기준 100곡. start/end 파라미터로 앞부분 대신 하이라이트 30초만 재생합니다.
const SONG_ITEMS = [
  song('b4iVv91Z6lY', 'BTS', 'SWIM', 58, ['방탄소년단'], ['스윔']),
  song('9qkpcLK422o', 'IVE', 'BANG BANG', 52, ['아이브'], ['뱅뱅']),
  song('x3eqqoZPV_E', 'BABYMONSTER', 'CHOOM', 46, ['베이비몬스터'], ['춤']),
  song('gdZLi9oWNZg', 'BTS', 'Dynamite', 54),
  song('WMweEpGlu_U', 'BTS', 'Butter', 48),
  song('XsX3ATc3FbA', 'BTS', 'Boy With Luv', 62),
  song('MBdVXkSdhwU', 'BTS', 'DNA', 58),
  song('7C2z4GqqS5E', 'BTS', 'Fake Love', 72),
  song('pBuZEGYXA6E', 'BTS', 'IDOL', 63),
  song('kTlv5_Bs8aw', 'BTS', 'MIC Drop', 70),
  song('hmE9f-TEutc', 'BTS', 'Blood Sweat & Tears', 66),
  song('xEeFrLSkMm8', 'BTS', 'Spring Day', 60),
  song('CuklIb9d3fI', 'BTS', 'Permission to Dance', 54),
  song('IHNzOHi8sJs', 'BLACKPINK', 'DDU-DU DDU-DU', 64),
  song('2S24-y0Ij3Y', 'BLACKPINK', 'Kill This Love', 55),
  song('bwmSjveL3Lc', 'BLACKPINK', 'BOOMBAYAH', 67),
  song('Amq-qlqbjYA', 'BLACKPINK', "AS IF IT'S YOUR LAST", 57),
  song('ioNng23DkIM', 'BLACKPINK', 'How You Like That', 61),
  song('vRXZj0DzXIA', 'BLACKPINK', 'Lovesick Girls', 68),
  song('gQlMMD8auMs', 'BLACKPINK', 'Pink Venom', 56),
  song('POe9SOEKotk', 'BLACKPINK', 'Shut Down', 48),
  song('dISNgvVpWlo', 'BLACKPINK', 'WHISTLE', 70),
  song('9pdj4iJD08s', 'BLACKPINK', 'PLAYING WITH FIRE', 65),
  song('i0p1bmr0EmE', 'TWICE', 'What is Love?', 58),
  song('ePpPVE-GGJw', 'TWICE', 'TT', 66),
  song('kOHB85vDuow', 'TWICE', 'FANCY', 60),
  song('V2hlQkVJZhE', 'TWICE', 'LIKEY', 53),
  song('3ymwOvzhwHs', 'TWICE', 'Feel Special', 62),
  song('CM4CkVFmTds', 'TWICE', "I CAN'T STOP ME", 57),
  song('c7rCyll5AeY', 'TWICE', 'CHEER UP', 69),
  song('f5_wn8mexmM', 'TWICE', 'The Feels', 55),
  song('mH0_XpSHkZo', 'TWICE', 'MORE & MORE', 64),
  song('js1CtxSY38I', 'NewJeans', 'Attention', 49),
  song('11ctaROsWxI', 'NewJeans', 'Hype Boy', 61),
  song('pSUydWEqKwE', 'NewJeans', 'Ditto', 58),
  song('sVTy_wmn5SU', 'NewJeans', 'OMG', 54),
  song('ArmDp-zijuc', 'NewJeans', 'Super Shy', 45),
  song('jOTfBlKSQYY', 'NewJeans', 'ETA', 52),
  song('--FmExEAsM8', 'IVE', 'ELEVEN', 62),
  song('Y8JFxS1HlDo', 'IVE', 'LOVE DIVE', 67),
  song('F0B7HDiY-10', 'IVE', 'After LIKE', 55),
  song('6ZUIwj3FgUY', 'IVE', 'I AM', 71),
  song('pG6iaOMV46I', 'IVE', 'Kitsch', 59),
  song('oA8QPRqdVYA', 'IVE', 'Baddie', 63),
  song('4vbDFu0PUew', 'LE SSERAFIM', 'FEARLESS', 55),
  song('pyf8cbqyfPs', 'LE SSERAFIM', 'ANTIFRAGILE', 65),
  song('UBURTj20HXI', 'LE SSERAFIM', 'UNFORGIVEN', 57),
  song('dZs_cLHfnNA', 'LE SSERAFIM', 'Eve, Psyche & The Bluebeard\'s wife', 73),
  song('hLvWy2b8770', 'LE SSERAFIM', 'Perfect Night', 49),
  song('bNKXxwOQYB8', 'LE SSERAFIM', 'EASY', 62),
  song('ZeerrnuLi5E', 'aespa', 'Black Mamba', 60),
  song('4TWR90KJl84', 'aespa', 'Next Level', 68),
  song('WPdWvnAAurg', 'aespa', 'Savage', 55),
  song('Os_heh8vPpM', 'aespa', 'Spicy', 61),
  song('D8VEhcPeSlc', 'aespa', 'Drama', 57),
  song('phuiiNCxRMg', 'aespa', 'Supernova', 64),
  song('9mQk7Evt6Vs', '(G)I-DLE', 'LATATA', 59),
  song('Jh4QFaPmdss', '(G)I-DLE', 'TOMBOY', 66),
  song('fCO7f0SmrDc', '(G)I-DLE', 'Nxde', 62),
  song('7HDeem-JaSY', '(G)I-DLE', 'Queencard', 54),
  song('TEDw01ilFMc', '(G)I-DLE', 'Super Lady', 70),
  song('hqXwRaAFEtk', '(G)I-DLE', 'Klaxon', 52),
  song('pNfTK39k55U', 'ITZY', 'DALLA DALLA', 63),
  song('jbGRowa5tIk', 'ITZY', 'WANNABE', 61),
  song('wTowEkG3vOw', 'ITZY', 'Not Shy', 56),
  song('MjCZfZfucEc', 'ITZY', 'LOCO', 62),
  song('Hbb5GPxXF1w', 'ITZY', 'SNEAKERS', 50),
  song('TQTlCHxyuu8', 'Stray Kids', "God's Menu", 60),
  song('X-uJtV8ScYk', 'Stray Kids', 'Back Door', 65),
  song('EaswWiwMVs8', 'Stray Kids', 'Thunderous', 62),
  song('OvioeS1ZZ7o', 'Stray Kids', 'MANIAC', 56),
  song('JsOOis4bBFg', 'Stray Kids', 'S-Class', 69),
  song('jYSlpC6Ud2A', 'Stray Kids', 'CASE 143', 54),
  song('0P0aQreFs8w', 'Stray Kids', 'LALALALA', 60),
  song('5MUtmsNDL9g', 'Stray Kids', 'MIROH', 71),
  song('J-wFp43XOrA', 'SEVENTEEN', 'Very Nice', 63),
  song('HdZdxocqzq4', 'SEVENTEEN', 'Left & Right', 55),
  song('gRnuFC4UAlw', 'SEVENTEEN', 'HOT', 59),
  song('-GQg25oP0S4', 'SEVENTEEN', 'Super', 68),
  song('zSQ48zyWZrY', 'SEVENTEEN', 'God of Music', 53),
  song('Fc7-Oe0tj5k', 'ENHYPEN', 'Drunk-Dazed', 64),
  song('X7d6Dt17yHk', 'ENHYPEN', 'FEVER', 57),
  song('wXFLzODIdUI', 'ENHYPEN', 'Bite Me', 62),
  song('qedonJosQ3g', 'ENHYPEN', 'Sweet Venom', 55),
  song('AjrUX_vWz1Y', 'ENHYPEN', 'XO (Only If You Say Yes)', 60),
  song('W3iSnJ663II', 'TXT', 'CROWN', 58),
  song('Vd9QkWsd5p4', 'TXT', 'Blue Hour', 63),
  song('P9tKTxbgdkk', 'TXT', 'Sugar Rush Ride', 55),
  song('DiHUEWBRQEI', 'TXT', 'Deja Vu', 67),
  song('pSudEWBAYRE', 'EXO', 'Love Shot', 61),
  song('KSH-FVVtTf0', 'EXO', 'Monster', 64),
  song('I3dezFzsNss', 'EXO', 'Growl', 57),
  song('IdssuxDdqKk', 'EXO', 'Ko Ko Bop', 52),
  song('0AUFyFEt35g', 'NCT U', 'BOSS', 60),
  song('2OvyA2__Eas', 'NCT 127', 'Kick It', 68),
  song('tyrVtwE8Gv0', 'NCT U', 'Make A Wish', 56),
  song('FRilMXZqNhA', 'NCT 127', '2 Baddies', 62),
  song('0-q1KafFCLU', 'IU', 'Celebrity', 55),
  song('v7bnOxV4jAc', 'IU', 'LILAC', 64),
  song('d9IxdwEFk1c', 'IU', 'Palette', 58),
];

const BALANCE_ROUND_MS = 30000;
const BALANCE_WIN_POINTS = 1;
const BALANCE_QUESTIONS = [
  { left: '매일 1시간씩 야근', right: '토요일 출근' },
  { left: '이재용 회장에게 주식 정보 얻기', right: '샘 알트만과 친구하기' },
  { left: '코딩의 신 유원우와 코딩하기', right: 'ChatGPT와 코딩하기' },
  { left: '버그가 절대 없는 대신 느린 코드', right: '엄청 빠르지만 버그가 있는 코드' },
  { left: '평생 키보드만 사용하기', right: '평생 마우스만 사용하기' },
  { left: '월급 2배, 출퇴근 2시간', right: '월급 그대로, 완전 재택근무' },
  { left: '모든 문서가 최신 상태', right: '모든 테스트가 완벽한 상태' },
  { left: '혼자서 자유롭게 개발하기', right: '최고의 팀과 협업하기' },
  { left: '새 기술을 매일 공부하기', right: '검증된 기술만 깊게 파기' },
  { left: '코드 리뷰를 매일 받기', right: '코드 리뷰 없이 빠르게 배포하기' },
  { left: '평생 재택근무', right: '평생 사무실 출근' },
  { left: '주 4일 출근, 하루 10시간', right: '주 5일 출근, 하루 8시간' },
  { left: '연봉 10% 인상', right: '주 4일 근무' },
  { left: '출근 시간을 자유롭게 선택하기', right: '매일 오전 8시 정시 퇴근' },
  { left: '회의가 하나도 없는 회사', right: '메신저가 하나도 없는 회사' },
  { left: '동료의 생각을 읽을 수 있기', right: '디버거처럼 버그 원인을 볼 수 있기' },
  { left: '최고급 기계식 키보드', right: '최고급 4K 모니터' },
  { left: '고성능 노트북 하나', right: '최고급 데스크톱 두 대' },
  { left: '기계식 키보드 소리 가득한 사무실', right: '완전 무소음 사무실' },
  { left: '커피 무제한', right: '간식 무제한' },
  { left: '윈도우만 사용하기', right: '맥만 사용하기' },
  { left: '평생 다크모드', right: '평생 화이트모드' },
  { left: '1년 동안 Vim만 사용하기', right: '1년 동안 마우스만 사용하기' },
  { left: '터미널만 사용하기', right: 'GUI 도구만 사용하기' },
  { left: '단축키를 모두 외우기', right: '자동완성이 항상 정답 맞히기' },
  { left: '한 언어만 평생 사용하기', right: '분기마다 새로운 언어 배우기' },
  { left: '자바스크립트로 모든 것을 만들기', right: '파이썬으로 모든 것을 만들기' },
  { left: 'TypeScript 엄격 모드 강제', right: 'JavaScript 자유롭게 사용' },
  { left: 'React만 사용하기', right: 'Vue만 사용하기' },
  { left: '프론트엔드만 담당하기', right: '백엔드만 담당하기' },
  { left: 'CSS를 전혀 작성하지 않기', right: 'HTML을 전혀 작성하지 않기' },
  { left: 'SQL만 사용하기', right: 'NoSQL만 사용하기' },
  { left: 'REST API만 사용하기', right: 'GraphQL만 사용하기' },
  { left: '거대한 모놀리식 서비스', right: '작은 마이크로서비스 100개' },
  { left: '서버리스만 사용하기', right: '직접 서버만 관리하기' },
  { left: '쿠버네티스를 직접 운영하기', right: '도커 컨테이너만 직접 운영하기' },
  { left: '로그가 너무 많아서 찾기 힘들기', right: '로그가 하나도 남지 않기' },
  { left: '금요일 오후에 배포하기', right: '한 달 동안 배포 금지하기' },
  { left: 'CI가 매번 1시간 걸리기', right: 'CI 없이 바로 배포하기' },
  { left: '느리지만 정확한 테스트', right: '빠르지만 가끔 실패하는 테스트' },
  { left: '코드 커버리지 100% 강제', right: '테스트 없이 빠르게 개발' },
  { left: '새 기능 대신 대규모 리팩터링', right: '기술 부채를 안고 새 기능 개발' },
  { left: '읽기 좋은 코드지만 실행이 느리기', right: '실행은 빠르지만 읽기 어려운 코드' },
  { left: '주석을 많이 작성하기', right: '코드만 보고 이해되게 작성하기' },
  { left: '오래된 코드와 완벽한 문서', right: '최신 코드와 문서 없음' },
  { left: 'Git rebase만 사용하기', right: 'Git merge만 사용하기' },
  { left: '커밋 하나에 모든 변경 담기', right: '커밋 100개로 아주 잘게 나누기' },
  { left: '6개월 동안 유지되는 장기 브랜치', right: 'main 브랜치에 바로 커밋' },
  { left: '충돌 100개를 직접 해결하기', right: '내 커밋 하나를 완전히 잃기' },
  { left: '새벽에 운영 장애 대응하기', right: '발표 직전에 치명적 버그 발견하기' },
  { left: '운영 서버에 직접 접속 가능', right: '운영 서버에 절대 접속 불가' },
  { left: 'Stack Overflow만 참고하기', right: '공식 문서만 참고하기' },
  { left: '에러 메시지는 모호하지만 드물게 발생', right: '에러 메시지는 명확하지만 자주 발생' },
  { left: '재현은 쉽지만 수정이 어려운 버그', right: '재현은 어렵지만 수정은 쉬운 버그' },
  { left: '거대한 버그 하나 해결하기', right: '작은 버그 100개 해결하기' },
  { left: '프론트엔드 버그만 담당하기', right: '백엔드 버그만 담당하기' },
  { left: '응답 속도 1초 느려지기', right: '메모리 사용량 2배 늘어나기' },
  { left: '서비스 1시간 중단', right: '데이터 1건 유실' },
  { left: '로그는 완벽하지만 메트릭 없음', right: '메트릭은 완벽하지만 로그 없음' },
  { left: 'AI가 코드를 전부 작성하기', right: 'AI가 코드 리뷰만 해주기' },
  { left: '1년 동안 AI 없이 코딩하기', right: '1년 동안 AI 자동완성만 사용하기' },
  { left: 'AI가 답만 알려주기', right: 'AI가 힌트만 알려주기' },
  { left: '한 줄 프롬프트로 원하는 답 받기', right: '100줄 프롬프트를 직접 작성하기' },
  { left: 'ChatGPT와 페어 프로그래밍', right: '혼자 조용히 프로그래밍' },
  { left: '직접 모델을 학습시키기', right: '완성된 AI API 사용하기' },
  { left: '유명 오픈소스 프로젝트 운영', right: '수익성 높은 비공개 프로젝트 운영' },
  { left: '모든 것을 처음부터 만들기', right: '검증된 프로젝트를 포크해서 만들기' },
  { left: '코드를 쓰기 전에 종이에 설계하기', right: '일단 만들고 계속 수정하기' },
  { left: '스타트업 스톡옵션 받기', right: '대기업 안정적인 연봉 받기' },
  { left: '직함이 멋진 회사', right: '연봉이 높은 회사' },
  { left: '관리자가 되어 팀 이끌기', right: '끝까지 개인 개발자로 남기' },
  { left: '좋은 멘토에게 배우기', right: '후배를 가르치며 성장하기' },
  { left: '개발자 컨퍼런스 참가', right: '개발자 해커톤 참가' },
  { left: '유명 개발자의 강의 듣기', right: '실시간 라이브 코딩 보기' },
  { left: '개발 블로그 꾸준히 쓰기', right: '개발 영상을 꾸준히 만들기' },
  { left: '퇴근 후 사이드 프로젝트', right: '퇴근 후 완전한 휴식' },
  { left: '알고리즘 문제만 공부하기', right: '클라우드 기술만 공부하기' },
  { left: '시스템 디자인 면접만 보기', right: '코딩 테스트 면접만 보기' },
  { left: '시차가 12시간인 원격 팀', right: '매일 왕복 2시간 통근하는 팀' },
  { left: '천재 2명과 일하기', right: '평범한 동료 10명과 일하기' },
  { left: '실력은 최고지만 무례한 상사', right: '친절하지만 개발을 모르는 상사' },
  { left: '말로만 소통하는 팀', right: '문서로만 소통하는 팀' },
  { left: '매일 아침 스탠드업', right: '일주일에 한 번 긴 회의' },
  { left: '계획대로만 진행되는 프로젝트', right: '즉흥적으로 빠르게 바뀌는 프로젝트' },
  { left: '마감일을 지키지만 기능이 단순하기', right: '기능은 완벽하지만 마감이 늦기' },
  { left: '완벽한 포트폴리오', right: '완벽한 이력서' },
  { left: '모든 프레임워크를 조금씩 알기', right: '프레임워크 하나를 깊게 알기' },
  { left: '퇴사 후 바로 이직하기', right: '한 달 쉬고 이직하기' },
  { left: '스크린샷이 있는 버그 리포트', right: '"안 돼요" 한 줄 버그 리포트' },
  { left: '500줄짜리 거대한 PR 하나', right: '50개의 작은 PR' },
  { left: '변수명을 모두 한국어로 작성', right: '변수명을 모두 영어로 작성' },
  { left: '탭만 사용하기', right: '스페이스만 사용하기' },
  { left: '세미콜론을 항상 작성', right: '세미콜론을 절대 작성하지 않기' },
  { left: '함수는 무조건 5줄 이하', right: '함수 하나에 100줄까지 허용' },
  { left: '커밋 메시지에 이모지 사용', right: '커밋 메시지를 숫자로만 작성' },
  { left: '롤백 버튼이 없는 배포', right: '수동으로만 롤백 가능한 배포' },
  { left: '카페에서 집중해서 코딩하기', right: '사무실에서 편하게 코딩하기' },
  { left: '시간을 멈추는 개발자 초능력', right: '나와 똑같은 분신을 만드는 초능력' },
  { left: '모든 커밋을 직접 작성하기', right: '모든 커밋을 AI에게 맡기기' },
  { left: '버그를 먼저 발견하는 능력', right: '요구사항을 먼저 예측하는 능력' },
];
const FASHION_DRESSING_MS = 60000;
const FASHION_VOTE_MS = 20000;
const FASHION_ROUND_TOTAL = 8;
const FASHION_TOPICS = [
  '메이크업 브랜드 파티장',
  '스타트업 데모데이',
  '여름 바캉스',
  '레트로 게임쇼',
  '시상식 레드카펫',
  '비 오는 날의 출근룩',
  '우주 여행 승무원',
  '개발자 해커톤 파티',
];

const stackWorlds = new Map(); // roomCode -> StackWorld
const stackIntervals = new Map(); // roomCode -> Interval

function clearStackInterval(code) {
  const t = stackIntervals.get(code);
  if (t) {
    clearInterval(t);
    stackIntervals.delete(code);
  }
}

const DISCUSSION_MIN_MS = 40000;
const DISCUSSION_STEP_MS = 15000; // shaved off per day
const VOTE_MIN_MS = 20000;
const VOTE_STEP_MS = 5000;

function discussionDuration(dayNumber) {
  return Math.max(DISCUSSION_MIN_MS, DAY_DISCUSSION_MS - (dayNumber - 1) * DISCUSSION_STEP_MS);
}

function voteDuration(dayNumber) {
  return Math.max(VOTE_MIN_MS, DAY_VOTE_MS - (dayNumber - 1) * VOTE_STEP_MS);
}

app.use((req, res, next) => {
  const origin = req.get('Origin');
  if (!origin) return next();
  if (!isAllowedFrontendOrigin(origin)) {
    return res.status(403).json({ error: 'Origin is not allowed by CORS' });
  }
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Vary', 'Origin');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  return next();
});
app.use(express.static(path.join(__dirname, '..', 'public')));

const timers = new Map(); // roomCode -> Timeout

function clearRoomTimer(code) {
  const t = timers.get(code);
  if (t) {
    clearTimeout(t);
    timers.delete(code);
  }
}

function setRoomTimer(code, ms, fn) {
  clearRoomTimer(code);
  const t = setTimeout(fn, ms);
  timers.set(code, t);
}

// Secondary timer channel for short round-level timeouts that run alongside
// a room's main phase timer (e.g. wordchain challenge windows, quiz rounds).
const subTimers = new Map();

function clearSubTimer(code) {
  const t = subTimers.get(code);
  if (t) {
    clearTimeout(t);
    subTimers.delete(code);
  }
}

function setSubTimer(code, ms, fn) {
  clearSubTimer(code);
  const t = setTimeout(fn, ms);
  subTimers.set(code, t);
}

function emitCurrentSongRound(socket, room) {
  if (room.mode !== 'songquiz' || room.phase !== 'song_round') return;
  const song = room.songItems[room.songIndex];
  if (!song) return;
  const remainingMs = Math.max(1000, (room.songRoundEndsAt || Date.now() + SONG_ROUND_MS) - Date.now());
  socket.emit('phase_change', {
    phase: 'song_round',
    videoId: song.videoId,
    startSeconds: Math.max(0, Number(song.highlightStart) || 0),
    clipDurationMs: SONG_CLIP_MS,
    roundNumber: room.songIndex + 1,
    totalRounds: room.songItems.length,
    durationMs: remainingMs,
  });
  socket.emit('song_skip_update', {
    skippedCount: Object.keys(room.songSkipVotes || {}).length,
    totalPlayers: room.players.length,
  });
}

function restorePlayerToSocket(socket, room, player) {
  player.socketId = socket.id;
  player.disconnected = false;
  socket.data.roomCode = room.code;
  socket.join(room.code);
  socket.emit('room_resumed', {
    code: room.code,
    playerId: player.id,
    mode: room.mode,
    phase: room.phase,
  });
  if (room.mode === 'foodroulette' && room.phase === 'foodroulette_playing') {
    socket.emit('phase_change', {
      phase: 'foodroulette_playing',
      menuCount: FOOD_ROULETTE_MENUS.length,
      currentResult: room.foodRouletteResult,
    });
  }
  if (room.mode === 'band' && room.phase === 'band_playing') {
    socket.emit('phase_change', { phase: 'band_playing', lateJoin: true });
  }
  emitCurrentSongRound(socket, room);
  broadcastState(room);
}

function resumeDisconnectedPlayer(socket) {
  const phone = socket.account?.phone;
  const pending = phone ? reconnectingPlayers.get(phone) : null;
  if (!pending) return null;

  clearTimeout(pending.timer);
  reconnectingPlayers.delete(phone);
  const room = rooms.getRoom(pending.roomCode);
  const player = room?.players.find(item => item.id === pending.playerId && item.accountPhone === phone);
  if (!room || !player) return null;

  restorePlayerToSocket(socket, room, player);
  return room.code;
}

function deferSocketRemoval(socket) {
  const roomCode = socket.data?.roomCode;
  const phone = socket.account?.phone;
  const room = roomCode ? rooms.getRoom(roomCode) : null;
  const player = room?.players.find(item => item.socketId === socket.id);
  if (!room || !player || !phone) {
    removeSocketFromRoom(socket);
    return;
  }

  const previous = reconnectingPlayers.get(phone);
  if (previous) clearTimeout(previous.timer);
  player.disconnected = true;
  socket.data.roomCode = null;
  const pending = {
    roomCode: room.code,
    playerId: player.id,
    oldSocketId: socket.id,
    timer: null,
  };
  pending.timer = setTimeout(() => {
    if (reconnectingPlayers.get(phone) !== pending) return;
    reconnectingPlayers.delete(phone);
    const currentRoom = rooms.getRoom(pending.roomCode);
    const currentPlayer = currentRoom?.players.find(item => item.id === pending.playerId);
    if (!currentRoom || !currentPlayer) return;
    currentRoom.removePlayer(currentPlayer.socketId);
    if (currentRoom.players.length === 0) {
      clearRoomTimer(currentRoom.code);
      clearSubTimer(currentRoom.code);
      clearStackInterval(currentRoom.code);
      stackWorlds.delete(currentRoom.code);
      rooms.deleteIfEmpty(currentRoom.code);
    } else {
      broadcastState(currentRoom);
      if (currentRoom.mode === 'songquiz'
        && currentRoom.phase === 'song_round'
        && currentRoom.players.every(currentPlayer => currentRoom.songSkipVotes?.[currentPlayer.id])) {
        resolveSongRound(currentRoom, null, { skipped: true });
      }
    }
  }, RECONNECT_GRACE_MS);

  // A page reload can authenticate the new socket before the old socket's
  // disconnect event arrives. Hand the player over immediately in that case
  // so the reconnect does not get stranded on the home screen.
  const replacementSocket = [...(onlineSockets.get(phone) || [])]
    .find(candidate => candidate.id !== socket.id);
  if (replacementSocket) {
    clearTimeout(pending.timer);
    restorePlayerToSocket(replacementSocket, room, player);
    return;
  }

  reconnectingPlayers.set(phone, pending);
  broadcastState(room);
}

function removeSocketFromRoom(socket) {
  const roomCode = socket.data?.roomCode;
  if (!roomCode) return;
  const room = rooms.getRoom(roomCode);
  socket.data.roomCode = null;
  if (!room) return;

  room.removePlayer(socket.id);
  socket.leave(room.code);
  if (room.players.length === 0) {
    clearRoomTimer(room.code);
    clearSubTimer(room.code);
    clearStackInterval(room.code);
    stackWorlds.delete(room.code);
    rooms.deleteIfEmpty(room.code);
    broadcastPublicRooms();
  } else {
    broadcastState(room);
  }
}

function getPublicRooms(mode = null) {
  return [...rooms.rooms.values()]
    .filter(room => room.isPublic
      && (!mode || room.mode === mode)
      && (room.phase === 'lobby' || (room.mode === 'band' && room.phase === 'band_playing'))
      && room.players.length < room.maxPlayers())
    .map(room => ({
      code: room.code,
      mode: room.mode,
      phase: room.phase,
      playerCount: room.players.length,
      maxPlayers: Number.isFinite(room.maxPlayers()) ? room.maxPlayers() : null,
      hostName: room.players.find(player => player.isHost)?.name || '방장',
      isPublic: true,
    }));
}

function broadcastPublicRooms() {
  io.emit('public_rooms_update', getPublicRooms());
}

function broadcastState(room) {
  io.to(room.code).emit('room_update', {
    code: room.code,
    mode: room.mode,
    phase: room.phase,
    isPublic: room.isPublic,
    players: room.publicPlayerList(),
    dayNumber: room.dayNumber,
    quizItemCount: room.quizItems.length,
    ssafyPhotoCount: ssafyDb.getAll().filter(photo => photo.imageDataUrl).length,
  });
  broadcastPublicRooms();
}

// 게임별 점수 단위가 달라도 한 게임에서 랭킹에 반영되는 점수는 최대 10점으로 통일합니다.
function pointsFromScores(room) {
  const points = {};
  room.players.forEach(p => {
    points[p.id] = Math.max(0, Math.min(10, Math.floor(Number(p.score) || 0)));
  });
  return points;
}

function broadcastLeaderboard() {
  io.emit('leaderboard_update', accounts.getLeaderboardWithPresence(phone => onlineSockets.has(phone)));
}

function broadcastPersonDb() {
  onlineSockets.forEach(sockets => sockets.forEach(socket => {
    socket.emit('person_db_update', personDbPayload(socket));
  }));
}

function personDbPayload(socket) {
  const canView = Boolean(socket.account?.isAdmin || (DEVELOPER_PHONE && socket.account?.phone === DEVELOPER_PHONE));
  return {
    count: personDb.getCount(),
    canView,
    recent: canView ? personDb.getRecent() : [],
  };
}

function isAdminSocket(socket) {
  return Boolean(socket.account?.isAdmin);
}

function canQuickJoinRoom(room) {
  if (!room || room.players.length >= room.maxPlayers()) return false;
  if (room.mode === 'band' && room.phase === 'band_playing') return true;
  if (room.phase !== 'lobby') return false;
  const nextCount = room.players.length + 1;
  if (room.mode === 'quiz' && room.quizItems.length === 0 && personDb.getCount() === 0) return false;
  if (room.mode === 'ssafy' && !ssafyDb.isComplete()) return false;
  if (room.mode === 'tug') {
    let left = room.players.filter(player => player.tugTeam === 'left').length;
    let right = room.players.filter(player => player.tugTeam === 'right').length;
    if (left <= right) left += 1;
    else right += 1;
    return nextCount >= 2 && nextCount <= 12 && nextCount % 2 === 0 && left === right;
  }
  return nextCount >= room.minPlayersToStart();
}

function quickJoinPreview(socketId) {
  const currentRoom = [...rooms.rooms.values()].find(room =>
    room.players.some(player => player.socketId === socketId),
  );
  if (currentRoom) return { error: 'ALREADY_IN_ROOM' };

  const openRooms = [...rooms.rooms.values()].filter(room =>
    canQuickJoinRoom(room),
  );
  if (openRooms.length > 0) {
    const room = openRooms[Math.floor(Math.random() * openRooms.length)];
    return { mode: room.mode, roomCode: room.code, isNew: false };
  }

  const availableModes = SOLO_QUICK_JOIN_MODES.filter(mode => mode !== 'ssafy' || ssafyDb.isComplete());
  if (availableModes.length === 0) return { available: false };
  const mode = availableModes[Math.floor(Math.random() * availableModes.length)] || 'wordchain';
  return { mode, roomCode: null, isNew: true };
}

// Adds points to each player's persistent account and refreshes the global
// leaderboard. pointsMap: { playerId: pointsDelta }
function awardPointsForGame(room, pointsMap) {
  let changed = false;
  Object.entries(pointsMap).forEach(([playerId, points]) => {
    const normalizedPoints = Math.max(-10, Math.min(10, Math.floor(Number(points) || 0)));
    if (!normalizedPoints) return;
    const player = room.players.find(p => p.id === playerId);
    if (player?.accountPhone) {
      accounts.addScore(player.accountPhone, normalizedPoints);
      changed = true;
    }
  });
  if (changed) broadcastLeaderboard();
}

function sendRoles(room) {
  room.players.forEach(p => {
    io.to(p.socketId).emit('your_role', { role: p.role });
  });
}

function sendWords(room) {
  // Nobody is told they're the liar — the liar just quietly receives a
  // different word from the same category and believes it's the real one.
  room.players.forEach(p => {
    const isLiar = p.id === room.liarId;
    io.to(p.socketId).emit('your_word', {
      isLiar: false,
      category: room.category,
      word: isLiar ? room.decoyWord : room.word,
    });
  });
}

// ---------------- Mafia flow ----------------

function startNight(room) {
  room.phase = 'night';
  room.nightActions = {};
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'night',
    dayNumber: room.dayNumber,
    durationMs: NIGHT_MS,
  });
  setRoomTimer(room.code, NIGHT_MS, () => resolveNight(room));
}

function maybeResolveNightEarly(room) {
  const alive = room.alivePlayers();
  const mafiaAlive = alive.filter(p => p.role === 'mafia');
  const doctorAlive = alive.find(p => p.role === 'doctor');
  const policeAlive = alive.find(p => p.role === 'police');

  const mafiaDone = mafiaAlive.length === 0 || room.nightActions.mafiaTarget !== undefined;
  const doctorDone = !doctorAlive || room.nightActions.doctorTarget !== undefined;
  const policeDone = !policeAlive || room.nightActions.policeTarget !== undefined;

  if (mafiaDone && doctorDone && policeDone) {
    resolveNight(room);
  }
}

function resolveNight(room) {
  if (room.phase !== 'night') return;
  clearRoomTimer(room.code);

  const { mafiaTarget, doctorTarget, policeTarget } = room.nightActions;
  let deathId = null;
  if (mafiaTarget && mafiaTarget !== doctorTarget) {
    deathId = mafiaTarget;
  }

  if (deathId) {
    const victim = room.players.find(p => p.id === deathId);
    if (victim) victim.alive = false;
  }
  room.lastNightDeath = deathId
    ? room.players.find(p => p.id === deathId)?.name || null
    : null;

  if (policeTarget) {
    const suspect = room.players.find(p => p.id === policeTarget);
    const officer = room.players.find(p => p.role === 'police' && p.alive !== false);
    if (suspect && officer) {
      io.to(officer.socketId).emit('police_result', {
        targetName: suspect.name,
        isMafia: suspect.role === 'mafia',
      });
    }
  }

  const winner = room.checkWinner();
  broadcastState(room);

  if (winner) {
    endMafiaGame(room, winner);
  } else {
    startDayDiscussion(room);
  }
}

function endMafiaGame(room, winner) {
  clearRoomTimer(room.code);
  room.phase = 'result';
  broadcastState(room);
  io.to(room.code).emit('game_over', {
    winner,
    roles: room.players.map(p => ({ name: p.name, role: p.role, alive: p.alive })),
  });

  const points = {};
  room.players.forEach(p => {
    const onWinningSide = winner === 'mafia' ? p.role === 'mafia' : p.role !== 'mafia';
    points[p.id] = onWinningSide ? 10 : 0;
  });
  awardPointsForGame(room, points);
}

// ---------------- Shared day discussion / vote ----------------

function startDayDiscussion(room) {
  room.dayNumber += 1;
  room.phase = 'day_discussion';
  const duration = discussionDuration(room.dayNumber);
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'day_discussion',
    dayNumber: room.dayNumber,
    durationMs: duration,
    lastNightDeath: room.mode === 'mafia' ? room.lastNightDeath : undefined,
  });
  setRoomTimer(room.code, duration, () => startDayVote(room));
}

function startDayVote(room) {
  room.phase = 'day_vote';
  room.votes = {};
  const duration = voteDuration(room.dayNumber);
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'day_vote',
    dayNumber: room.dayNumber,
    durationMs: duration,
  });
  setRoomTimer(room.code, duration, () => resolveVote(room));
}

function maybeResolveVoteEarly(room) {
  const alive = room.alivePlayers();
  const voted = Object.keys(room.votes).length;
  if (voted >= alive.length) {
    resolveVote(room);
  }
}

function tallyVotes(room) {
  const tally = {};
  Object.values(room.votes).forEach(targetId => {
    if (!targetId) return;
    tally[targetId] = (tally[targetId] || 0) + 1;
  });
  let maxVotes = 0;
  let topIds = [];
  Object.entries(tally).forEach(([id, count]) => {
    if (count > maxVotes) {
      maxVotes = count;
      topIds = [id];
    } else if (count === maxVotes) {
      topIds.push(id);
    }
  });
  return { tally, maxVotes, topIds };
}

function resolveVote(room) {
  if (room.phase !== 'day_vote') return;
  clearRoomTimer(room.code);

  const { tally, maxVotes, topIds } = tallyVotes(room);

  let eliminatedId = null;
  let eliminatedName = null;
  if (topIds.length === 1 && maxVotes > 0) {
    eliminatedId = topIds[0];
    const eliminated = room.players.find(p => p.id === eliminatedId);
    if (eliminated) {
      eliminated.alive = false;
      eliminatedName = eliminated.name;
    }
  }
  const tie = topIds.length > 1;

  broadcastState(room);
  io.to(room.code).emit('vote_result', { tally, eliminatedName, tie });

  if (room.mode === 'mafia') {
    const winner = room.checkWinner();
    if (winner) {
      endMafiaGame(room, winner);
    } else {
      startNight(room);
    }
    return;
  }

  // liar mode — identity is hidden all game. Only when the liar is actually
  // voted out do we reveal it and give them one last chance to guess the
  // real word for a comeback win. If they weren't caught, they win outright.
  const wasCaught = !!eliminatedId && eliminatedId === room.liarId;
  if (wasCaught) {
    startLiarGuess(room, eliminatedName);
  } else {
    endLiarGame(room, 'liar', null);
  }
}

// ---------------- Liar flow ----------------

function startLiarTurns(room) {
  room.phase = 'liar_turns';
  room.turnIndex = 0;
  broadcastState(room);
  advanceLiarTurn(room);
}

function advanceLiarTurn(room) {
  if (room.phase !== 'liar_turns') return;

  const totalTurns = room.speakingOrder.length * LIAR_SPEAKING_ROUNDS;

  while (
    room.turnIndex < totalTurns &&
    !room.players.find(p => p.id === room.speakingOrder[room.turnIndex % room.speakingOrder.length] && p.alive)
  ) {
    room.turnIndex += 1;
  }

  if (room.turnIndex >= totalTurns) {
    startDayVote(room);
    return;
  }

  const speakerId = room.speakingOrder[room.turnIndex % room.speakingOrder.length];
  const speaker = room.players.find(p => p.id === speakerId);
  room.turnHasSpoken = false;
  io.to(room.code).emit('phase_change', {
    phase: 'liar_turns',
    speakerId,
    speakerName: speaker?.name,
    turnNumber: room.turnIndex + 1,
    totalTurns,
    durationMs: LIAR_TURN_MS,
  });
  setRoomTimer(room.code, LIAR_TURN_MS, () => handleTurnTimeout(room, speakerId));
}

function finishLiarTurn(room, speakerId) {
  if (room.phase !== 'liar_turns') return;
  if (room.speakingOrder[room.turnIndex % room.speakingOrder.length] !== speakerId) return;
  clearRoomTimer(room.code);
  if (!room.turnHasSpoken) {
    if (applyLiarYellowCard(room, speakerId)) return; // game ended (liar caught by silence)
  } else {
    broadcastState(room);
  }
  room.turnIndex += 1;
  advanceLiarTurn(room);
}

function handleTurnTimeout(room, speakerId) {
  if (room.phase !== 'liar_turns') return;
  if (room.speakingOrder[room.turnIndex % room.speakingOrder.length] !== speakerId) return;

  if (!room.turnHasSpoken) {
    if (applyLiarYellowCard(room, speakerId)) return; // game ended (liar caught by silence)
  } else {
    broadcastState(room);
  }
  room.turnIndex += 1;
  advanceLiarTurn(room);
}

// Gives a yellow card to a silent speaker. Returns true if the game ended as a result.
function applyLiarYellowCard(room, speakerId) {
  const player = room.players.find(p => p.id === speakerId);
  if (!player) return false;
  player.yellowCards += 1;
  io.to(room.code).emit('yellow_card', { playerId: player.id, name: player.name, count: player.yellowCards });

  if (player.yellowCards >= YELLOW_CARD_LIMIT) {
    player.alive = false;
    if (player.id === room.liarId) {
      broadcastState(room);
      endLiarGame(room, 'citizens', player.name);
      return true;
    }
  }
  broadcastState(room);
  return false;
}

function startLiarGuess(room, accusedName) {
  room.phase = 'liar_guess';
  room.liarWasCaught = true;
  const liar = room.players.find(p => p.id === room.liarId);
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'liar_guess',
    durationMs: LIAR_GUESS_MS,
    liarId: room.liarId,
    liarName: liar?.name,
    wasCaught: true,
  });
  setRoomTimer(room.code, LIAR_GUESS_MS, () => endLiarGame(room, 'citizens', accusedName));
}

function endLiarGame(room, winner, accusedName) {
  clearRoomTimer(room.code);
  room.phase = 'result';
  const liar = room.players.find(p => p.id === room.liarId);
  broadcastState(room);
  io.to(room.code).emit('liar_game_over', {
    winner, // 'liar' | 'citizens'
    word: room.word,
    category: room.category,
    liarName: liar?.name,
    accusedName,
  });

  const points = {};
  room.players.forEach(p => {
    const isLiar = p.id === room.liarId;
    if (winner === 'liar') {
      points[p.id] = isLiar ? 15 : 0;
    } else {
      points[p.id] = isLiar ? 0 : 10;
    }
  });
  awardPointsForGame(room, points);
}

// ---------------- Word chain flow ----------------

function startWordChainGame(room) {
  const starter = room.startWordChain();
  room.phase = 'wordchain_playing';
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'wordchain_playing',
    firstWord: starter,
    durationMs: room.chainDurationMs,
  });
  setRoomTimer(room.code, room.chainDurationMs, () => endWordChainGame(room));
}

function endWordChainGame(room) {
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.phase = 'result';
  broadcastState(room);
  const maxScore = Math.max(0, ...room.players.map(p => p.score));
  const winners = room.players.filter(p => p.score === maxScore && maxScore > 0).map(p => p.name);
  io.to(room.code).emit('wordchain_over', {
    chain: room.chainWords,
    scores: room.players.map(p => ({ name: p.name, score: p.score })),
    winners,
  });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- Drawing game flow ----------------

function drawingEntries(room) {
  return Object.entries(room.drawings).map(([playerId, imageDataUrl]) => {
    const player = room.players.find(p => p.id === playerId);
    return player ? { playerId, imageDataUrl } : null;
  }).filter(Boolean);
}

function startDrawingGame(room) {
  room.drawingRoundTotal = DRAWING_ROUND_TOTAL;
  room.startDrawingGame();
  startDrawingRound(room);
}

function startDrawingRound(room) {
  const topic = DRAWING_TOPICS[Math.floor(Math.random() * DRAWING_TOPICS.length)];
  room.startDrawingRound(topic);
  room.phase = 'drawing';
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'drawing',
    topic,
    roundNumber: room.drawingRound,
    totalRounds: room.drawingRoundTotal,
    durationMs: DRAWING_DURATION_MS,
  });
  setRoomTimer(room.code, DRAWING_DURATION_MS, () => startDrawingVote(room));
}

function startDrawingVote(room) {
  if (room.phase !== 'drawing') return;
  clearRoomTimer(room.code);
  room.phase = 'drawing_voting';
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'drawing_voting',
    topic: room.drawingTopic,
    roundNumber: room.drawingRound,
    totalRounds: room.drawingRoundTotal,
    drawings: drawingEntries(room),
    durationMs: DRAWING_VOTE_MS,
  });
  setRoomTimer(room.code, DRAWING_VOTE_MS, () => resolveDrawingRound(room));
}

function resolveDrawingRound(room) {
  if (room.phase !== 'drawing_voting') return;
  clearRoomTimer(room.code);

  const voteCounts = {};
  Object.values(room.drawVotes).forEach(targetId => {
    voteCounts[targetId] = (voteCounts[targetId] || 0) + 1;
  });
  const maxVotes = Math.max(0, ...Object.values(voteCounts));
  const winnerIds = maxVotes > 0
    ? Object.keys(voteCounts).filter(playerId => voteCounts[playerId] === maxVotes)
    : [];
  const roundWinners = [];
  winnerIds.forEach(playerId => {
    const player = room.players.find(p => p.id === playerId);
    if (player) {
      player.score += DRAWING_WIN_POINTS;
      roundWinners.push(player.name);
    }
  });

  const roundResult = {
    round: room.drawingRound,
    totalRounds: room.drawingRoundTotal,
    topic: room.drawingTopic,
    drawings: drawingEntries(room),
    voteCounts,
    winners: roundWinners,
    scores: room.players.map(p => ({ name: p.name, score: p.score })),
  };

  if (room.drawingRound < room.drawingRoundTotal) {
    room.phase = 'drawing_round_result';
    room.drawingRound += 1;
    broadcastState(room);
    io.to(room.code).emit('drawing_round_result', roundResult);
    setSubTimer(room.code, NEXT_ROUND_DELAY_MS, () => startDrawingRound(room));
    return;
  }

  finishDrawingGame(room, roundResult);
}

function finishDrawingGame(room, finalRoundResult) {
  room.phase = 'result';
  const maxScore = Math.max(0, ...room.players.map(p => p.score));
  const winners = room.players
    .filter(p => p.score === maxScore && maxScore > 0)
    .map(p => p.name);
  broadcastState(room);
  io.to(room.code).emit('drawing_over', {
    topic: finalRoundResult.topic,
    round: finalRoundResult.round,
    totalRounds: finalRoundResult.totalRounds,
    drawings: finalRoundResult.drawings,
    voteCounts: finalRoundResult.voteCounts,
    roundWinners: finalRoundResult.winners,
    scores: room.players.map(p => ({ name: p.name, score: p.score })),
    winners,
  });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- Tug-of-war team game flow ----------------

function tugTeamPayload(room) {
  return {
    left: room.players.filter(player => player.tugTeam === 'left').map(player => ({ id: player.id, name: player.name })),
    right: room.players.filter(player => player.tugTeam === 'right').map(player => ({ id: player.id, name: player.name })),
  };
}

function startTugGame(room) {
  room.tugPosition = 0;
  room.tugClicks = { left: 0, right: 0 };
  room.phase = 'tug_playing';
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'tug_playing',
    position: room.tugPosition,
    clicks: room.tugClicks,
    teams: tugTeamPayload(room),
  });
}

function finishTugGame(room, winnerTeam) {
  if (room.phase !== 'tug_playing') return;
  room.phase = 'result';
  const teams = tugTeamPayload(room);
  broadcastState(room);
  io.to(room.code).emit('tug_over', {
    winnerTeam,
    position: room.tugPosition,
    clicks: room.tugClicks,
    teams,
  });
}

// ---------------- Developer balance game flow ----------------

function startBalanceGame(room) {
  room.balanceQuestions = [...BALANCE_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 10);
  room.balanceIndex = 0;
  room.balanceVotes = {};
  room.balanceResults = [];
  room.players.forEach(player => { player.score = 0; });
  startBalanceRound(room);
}

function startBalanceRound(room) {
  if (room.balanceIndex >= room.balanceQuestions.length) {
    endBalanceGame(room);
    return;
  }
  clearSubTimer(room.code);
  room.phase = 'balance_round';
  room.balanceVotes = {};
  const question = room.balanceQuestions[room.balanceIndex];
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'balance_round',
    question,
    roundNumber: room.balanceIndex + 1,
    totalRounds: room.balanceQuestions.length,
    durationMs: BALANCE_ROUND_MS,
  });
  setRoomTimer(room.code, BALANCE_ROUND_MS, () => resolveBalanceRound(room));
}

function resolveBalanceRound(room) {
  if (room.phase !== 'balance_round') return;
  clearRoomTimer(room.code);
  const left = Object.values(room.balanceVotes).filter(choice => choice === 'left').length;
  const right = Object.values(room.balanceVotes).filter(choice => choice === 'right').length;
  const question = room.balanceQuestions[room.balanceIndex];
  let winningChoice = null;
  if (room.players.length === 2) {
    const choices = room.players.map(player => room.balanceVotes[player.id]).filter(Boolean);
    if (choices.length === 2 && choices[0] === choices[1]) winningChoice = choices[0];
  } else if (room.players.length > 2 && Object.keys(room.balanceVotes).length >= 2) {
    if (left > right) winningChoice = 'left';
    if (right > left) winningChoice = 'right';
  }
  const roundWinners = [];
  if (winningChoice) {
    room.players.forEach(player => {
      if (room.balanceVotes[player.id] !== winningChoice) return;
      player.score += BALANCE_WIN_POINTS;
      roundWinners.push(player.name);
    });
  }
  const scores = room.players.map(player => ({ name: player.name, score: Math.max(0, player.score) }));
  room.balanceResults.push({ question, left, right, winningChoice, roundWinners, scores });
  room.phase = 'balance_result';
  broadcastState(room);
  io.to(room.code).emit('balance_round_result', {
    question,
    roundNumber: room.balanceIndex + 1,
    totalRounds: room.balanceQuestions.length,
    left,
    right,
    votedCount: Object.keys(room.balanceVotes).length,
    totalPlayers: room.players.length,
    winningChoice,
    roundWinners,
    scores,
  });
  room.balanceIndex += 1;
  setSubTimer(room.code, NEXT_ROUND_DELAY_MS, () => startBalanceRound(room));
}

function endBalanceGame(room) {
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.phase = 'result';
  const scores = room.players.map(player => ({ name: player.name, score: Math.max(0, player.score) }));
  const maxScore = Math.max(0, ...room.players.map(player => player.score));
  const winners = room.players
    .filter(player => player.score === maxScore && maxScore > 0)
    .map(player => player.name);
  broadcastState(room);
  io.to(room.code).emit('balance_over', { results: room.balanceResults, scores, winners });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- Fashion show game flow ----------------

const FASHION_CATEGORIES = ['hair', 'accessory', 'top', 'outer', 'bottom', 'shoes'];

function sanitizeFashionOutfit(outfit = {}) {
  const safe = {};
  FASHION_CATEGORIES.forEach(category => {
    const itemId = String(outfit[category] || '').trim().slice(0, 60);
    if (itemId) safe[category] = itemId;
  });
  return safe;
}

function fashionGalleryPayload(room) {
  return room.players
    .filter(player => room.fashionOutfits[player.id])
    .map(player => ({ candidateId: player.id, outfit: room.fashionOutfits[player.id] }));
}

function startFashionGame(room) {
  room.fashionQuestions = [...FASHION_TOPICS].sort(() => Math.random() - 0.5).slice(0, FASHION_ROUND_TOTAL);
  room.fashionIndex = 0;
  room.fashionTopic = null;
  room.fashionOutfits = {};
  room.fashionVotes = {};
  room.fashionResults = [];
  room.players.forEach(player => { player.score = 0; });
  startFashionRound(room);
}

function startFashionRound(room) {
  if (room.fashionIndex >= room.fashionQuestions.length) {
    endFashionGame(room);
    return;
  }
  clearSubTimer(room.code);
  room.phase = 'fashion_dressing';
  room.fashionTopic = room.fashionQuestions[room.fashionIndex];
  room.fashionOutfits = {};
  room.fashionVotes = {};
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'fashion_dressing',
    topic: room.fashionTopic,
    roundNumber: room.fashionIndex + 1,
    totalRounds: room.fashionQuestions.length,
    durationMs: FASHION_DRESSING_MS,
  });
  setRoomTimer(room.code, FASHION_DRESSING_MS, () => startFashionVoting(room));
}

function startFashionVoting(room) {
  if (room.phase !== 'fashion_dressing') return;
  clearRoomTimer(room.code);
  room.phase = 'fashion_voting';
  room.fashionVotes = {};
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'fashion_voting',
    topic: room.fashionTopic,
    roundNumber: room.fashionIndex + 1,
    totalRounds: room.fashionQuestions.length,
    gallery: fashionGalleryPayload(room),
    durationMs: FASHION_VOTE_MS,
  });
  setRoomTimer(room.code, FASHION_VOTE_MS, () => resolveFashionRound(room));
}

function resolveFashionRound(room) {
  if (room.phase !== 'fashion_voting') return;
  clearRoomTimer(room.code);
  const candidateIds = new Set(fashionGalleryPayload(room).map(item => item.candidateId));
  const counts = {};
  Object.values(room.fashionVotes).forEach(candidateId => {
    if (candidateIds.has(candidateId)) counts[candidateId] = (counts[candidateId] || 0) + 1;
  });
  const maxVotes = Math.max(0, ...Object.values(counts));
  const winnerIds = maxVotes > 0
    ? [...candidateIds].filter(candidateId => (counts[candidateId] || 0) === maxVotes)
    : [];
  winnerIds.forEach(candidateId => {
    const winner = room.players.find(player => player.id === candidateId);
    if (winner) winner.score += 1;
  });
  room.fashionResults.push({ topic: room.fashionTopic, counts, winnerIds });
  room.phase = 'fashion_result';
  broadcastState(room);
  io.to(room.code).emit('fashion_round_result', {
    topic: room.fashionTopic,
    counts,
    winnerIds,
    maxVotes,
  });
  room.fashionIndex += 1;
  setSubTimer(room.code, NEXT_ROUND_DELAY_MS, () => startFashionRound(room));
}

function endFashionGame(room) {
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.phase = 'result';
  broadcastState(room);
  const maxScore = Math.max(0, ...room.players.map(player => player.score));
  const winners = room.players.filter(player => player.score === maxScore && maxScore > 0).map(player => player.name);
  io.to(room.code).emit('fashion_over', {
    scores: room.players.map(player => ({ name: player.name, score: player.score })),
    winners,
  });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- SSAFY onion-style solo game flow ----------------

function startSsafyGame(room) {
  if (!ssafyDb.isComplete() || room.players.length !== 1) return;
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.ssafyImages = ssafyDb.getImages();
  const player = room.players[0];
  player.score = 0;
  room.phase = 'ssafy_playing';
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'ssafy_playing',
    images: room.ssafyImages,
    score: 0,
    durationMs: 0,
  });
}

function endSsafyGame(room, score, highestLevel) {
  if (room.phase !== 'ssafy_playing') return;
  const player = room.players[0];
  if (!player) return;
  player.score = Math.max(0, Math.min(10, Math.floor(Number(score) || 0)));
  room.phase = 'result';
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  const scores = [{ name: player.name, score: player.score }];
  broadcastState(room);
  io.to(room.code).emit('ssafy_over', {
    scores,
    winners: player.score > 0 ? [player.name] : [],
    highestLevel: Math.max(1, Math.min(ssafyDb.MAX_GAME_LEVEL, Math.floor(Number(highestLevel) || 1))),
  });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- Goalkeeper one-on-one game flow ----------------

function startGoalkeeperGame(room) {
  if (room.players.length !== 2) return;
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.goalkeeperTurn = 0;
  room.goalkeeperShot = 0;
  room.goalkeeperChoices = {};
  room.players.forEach(player => { player.score = 0; });
  startGoalkeeperShot(room);
}

function startGoalkeeperShot(room) {
  if (room.goalkeeperTurn >= room.players.length) return endGoalkeeperGame(room);
  clearSubTimer(room.code);
  room.phase = 'goalkeeper_shot';
  room.goalkeeperChoices = {};
  const attacker = room.players[room.goalkeeperTurn];
  const keeper = room.players[1 - room.goalkeeperTurn];
  room.goalkeeperShot += 1;
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'goalkeeper_shot',
    turnNumber: room.goalkeeperTurn + 1,
    shotNumber: room.goalkeeperShot,
    totalShots: GOALKEEPER_SHOTS_PER_TURN,
    attackerId: attacker.id,
    attackerName: attacker.name,
    keeperId: keeper.id,
    keeperName: keeper.name,
    durationMs: GOALKEEPER_SHOT_MS,
  });
  setRoomTimer(room.code, GOALKEEPER_SHOT_MS, () => resolveGoalkeeperShot(room));
}

function resolveGoalkeeperShot(room) {
  if (room.phase !== 'goalkeeper_shot') return;
  clearRoomTimer(room.code);
  const attacker = room.players[room.goalkeeperTurn];
  const keeper = room.players[1 - room.goalkeeperTurn];
  if (!attacker || !keeper) return;
  const attackSide = room.goalkeeperChoices[attacker.id] || null;
  const keeperSide = room.goalkeeperChoices[keeper.id] || null;
  const goal = Boolean(attackSide && keeperSide && attackSide !== keeperSide);
  if (goal) attacker.score += 1;
  room.phase = 'goalkeeper_result';
  broadcastState(room);
  io.to(room.code).emit('goalkeeper_shot_result', {
    turnNumber: room.goalkeeperTurn + 1,
    shotNumber: room.goalkeeperShot,
    totalShots: GOALKEEPER_SHOTS_PER_TURN,
    attackerName: attacker.name,
    attackSide,
    keeperSide,
    goal,
    scores: room.players.map(player => ({ name: player.name, score: Math.max(0, player.score) })),
  });
  if (room.goalkeeperShot >= GOALKEEPER_SHOTS_PER_TURN) {
    room.goalkeeperTurn += 1;
    room.goalkeeperShot = 0;
  }
  setSubTimer(room.code, GOALKEEPER_RESULT_MS, () => startGoalkeeperShot(room));
}

function endGoalkeeperGame(room) {
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.phase = 'result';
  const maxScore = Math.max(0, ...room.players.map(player => player.score));
  const winners = room.players
    .filter(player => player.score === maxScore && maxScore > 0)
    .map(player => player.name);
  const scores = room.players.map(player => ({ name: player.name, score: Math.max(0, player.score) }));
  broadcastState(room);
  io.to(room.code).emit('goalkeeper_over', { scores, winners });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- Memory match game flow ----------------

function memoryCurrentPlayer(room) {
  if (room.players.length === 0) return null;
  return room.players[room.memoryTurnIndex % room.players.length];
}

function memoryCardsPayload(room) {
  const revealSelected = room.phase === 'memory_playing' || room.phase === 'memory_resolving';
  return room.memoryCards.map((symbol, index) => {
    const matched = room.memoryMatched.has(index);
    const revealed = matched || (revealSelected && room.memorySelected.includes(index));
    return { index, symbol: revealed ? symbol : null, matched };
  });
}

function emitMemoryState(room) {
  const current = memoryCurrentPlayer(room);
  io.to(room.code).emit('memory_state', {
    phase: room.phase,
    cards: memoryCardsPayload(room),
    matchedCount: room.memoryMatched.size,
    totalCards: room.memoryCards.length,
    turnPlayerId: current?.id || null,
    turnPlayerName: current?.name || null,
  });
}

function startMemoryGame(room) {
  room.startMemoryGame(MEMORY_CARD_SYMBOLS);
  room.phase = 'memory_preview';
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'memory_preview',
    cards: room.memoryCards.map((symbol, index) => ({ index, symbol, matched: false })),
    durationMs: MEMORY_PREVIEW_MS,
  });
  setRoomTimer(room.code, MEMORY_PREVIEW_MS, () => startMemoryPlaying(room));
}

function startMemoryPlaying(room) {
  if (room.phase !== 'memory_preview') return;
  clearRoomTimer(room.code);
  room.phase = 'memory_playing';
  room.memoryTurnIndex = 0;
  room.memorySelected = [];
  const current = memoryCurrentPlayer(room);
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'memory_playing',
    cards: memoryCardsPayload(room),
    matchedCount: 0,
    totalCards: room.memoryCards.length,
    turnPlayerId: current?.id || null,
    turnPlayerName: current?.name || null,
    durationMs: MEMORY_TURN_MS,
  });
  setRoomTimer(room.code, MEMORY_TURN_MS, () => memoryTurnTimeout(room));
}

function beginNextMemoryTurn(room) {
  clearSubTimer(room.code);
  if (room.players.length === 0) return;
  const currentId = memoryCurrentPlayer(room)?.id;
  const currentIndex = room.players.findIndex(p => p.id === currentId);
  room.memoryTurnIndex = currentIndex >= 0
    ? (currentIndex + 1) % room.players.length
    : 0;
  room.memorySelected = [];
  room.phase = 'memory_playing';
  broadcastState(room);
  emitMemoryState(room);
  setRoomTimer(room.code, MEMORY_TURN_MS, () => memoryTurnTimeout(room));
}

function memoryTurnTimeout(room) {
  if (room.phase !== 'memory_playing') return;
  clearRoomTimer(room.code);
  room.memorySelected = [];
  beginNextMemoryTurn(room);
}

function resolveMemoryPair(room, player) {
  const [firstIndex, secondIndex] = room.memorySelected;
  const matched = room.memoryCards[firstIndex] === room.memoryCards[secondIndex];
  if (matched) {
    room.memoryMatched.add(firstIndex);
    room.memoryMatched.add(secondIndex);
    player.score += 1;
  }
  room.phase = 'memory_resolving';
  io.to(room.code).emit('memory_pair_result', {
    firstIndex,
    secondIndex,
    matched,
    symbol: matched ? room.memoryCards[firstIndex] : null,
    playerName: player.name,
  });
  broadcastState(room);
  emitMemoryState(room);

  setSubTimer(room.code, MEMORY_PAIR_REVEAL_MS, () => {
    if (room.phase !== 'memory_resolving') return;
    if (room.memoryMatched.size >= room.memoryCards.length) {
      endMemoryGame(room);
    } else {
      beginNextMemoryTurn(room);
    }
  });
}

function endMemoryGame(room) {
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.phase = 'result';
  const maxScore = Math.max(0, ...room.players.map(p => p.score));
  const winners = room.players
    .filter(p => p.score === maxScore && maxScore > 0)
    .map(p => p.name);
  broadcastState(room);
  io.to(room.code).emit('memory_over', {
    scores: room.players.map(p => ({ name: p.name, score: p.score })),
    winners,
  });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- Coffee-buy game flow ----------------

function coffeeActivePlayers(room) {
  return room.coffeeRemainingIds
    .map(id => room.players.find(p => p.id === id))
    .filter(Boolean);
}

function startCoffeeGame(room) {
  const drinkCount = Math.max(0, room.players.length - 1);
  room.startCoffeeGame(COFFEE_DRINKS.slice(0, drinkCount));
  startCoffeeRound(room);
}

function startCoffeeRound(room) {
  clearSubTimer(room.code);
  const active = coffeeActivePlayers(room);
  if (active.length <= 2) {
    if (active.length === 2) startCoffeeRps(room, active.map(p => p.id));
    else finishCoffeeGame(room, active.map(p => p.id));
    return;
  }

  room.coffeeRound += 1;
  room.coffeeChoices = {};
  room.phase = 'coffee_selecting';
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'coffee_selecting',
    round: room.coffeeRound,
    maxRounds: COFFEE_MAX_ROUNDS,
    drinks: room.coffeeDrinks,
    activePlayers: active.map(p => ({ id: p.id, name: p.name })),
    durationMs: COFFEE_ROUND_MS,
  });
  setRoomTimer(room.code, COFFEE_ROUND_MS, () => resolveCoffeeRound(room, true));
}

function resolveCoffeeRound(room, timedOut = false) {
  if (room.phase !== 'coffee_selecting') return;
  clearRoomTimer(room.code);
  const active = coffeeActivePlayers(room);
  const autoSelectedNames = [];
  active.forEach(player => {
    if (room.coffeeChoices[player.id] == null) {
      room.coffeeChoices[player.id] = Math.floor(Math.random() * room.coffeeDrinks.length);
      autoSelectedNames.push(player.name);
    }
  });

  const grouped = new Map();
  active.forEach(player => {
    const drinkIndex = room.coffeeChoices[player.id];
    const group = grouped.get(drinkIndex) || [];
    group.push(player);
    grouped.set(drinkIndex, group);
  });

  const safeIds = [];
  const duplicateIds = [];
  const drinkResults = [...grouped.entries()].map(([drinkIndex, players]) => {
    const unique = players.length === 1;
    players.forEach(player => (unique ? safeIds : duplicateIds).push(player.id));
    return {
      drink: room.coffeeDrinks[drinkIndex],
      names: players.map(player => player.name),
      unique,
    };
  });
  safeIds.forEach(id => room.coffeeEscapedIds.add(id));
  room.coffeeRemainingIds = duplicateIds;

  const result = {
    round: room.coffeeRound,
    drinkResults,
    safeNames: safeIds.map(id => room.players.find(p => p.id === id)?.name).filter(Boolean),
    remainingNames: duplicateIds.map(id => room.players.find(p => p.id === id)?.name).filter(Boolean),
    autoSelectedNames,
    timedOut,
  };
  io.to(room.code).emit('coffee_round_result', result);

  if (duplicateIds.length === 2) {
    room.phase = 'coffee_round_result';
    broadcastState(room);
    setSubTimer(room.code, COFFEE_RESULT_DELAY_MS, () => startCoffeeRps(room, duplicateIds));
  } else if (duplicateIds.length <= 1 || room.coffeeRound >= COFFEE_MAX_ROUNDS) {
    const candidates = duplicateIds.length > 0 ? duplicateIds : (safeIds.length > 0 ? safeIds : active.map(p => p.id));
    room.phase = 'coffee_round_result';
    broadcastState(room);
    setSubTimer(room.code, COFFEE_RESULT_DELAY_MS, () => finishCoffeeGame(room, candidates));
  } else {
    room.phase = 'coffee_round_result';
    broadcastState(room);
    setSubTimer(room.code, COFFEE_RESULT_DELAY_MS, () => startCoffeeRound(room));
  }
}

function startCoffeeRps(room, finalistIds) {
  const finalists = finalistIds
    .map(id => room.players.find(player => player.id === id))
    .filter(Boolean)
    .slice(0, 2);
  if (finalists.length < 2) {
    finishCoffeeGame(room, finalists.map(player => player.id));
    return;
  }

  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.coffeeRpsPlayers = finalists.map(player => player.id);
  room.coffeeRpsChoices = {};
  room.phase = 'coffee_rps';
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'coffee_rps',
    finalists: finalists.map(player => ({ id: player.id, name: player.name })),
    durationMs: COFFEE_ROUND_MS,
  });
  setRoomTimer(room.code, COFFEE_ROUND_MS, () => resolveCoffeeRps(room, true));
}

function resolveCoffeeRps(room, timedOut = false) {
  if (room.phase !== 'coffee_rps') return;
  clearRoomTimer(room.code);
  const finalists = room.coffeeRpsPlayers
    .map(id => room.players.find(player => player.id === id))
    .filter(Boolean);
  if (finalists.length < 2) {
    finishCoffeeGame(room, finalists.map(player => player.id));
    return;
  }

  const choices = ['rock', 'paper', 'scissors'];
  const autoSelectedNames = [];
  finalists.forEach(player => {
    if (!room.coffeeRpsChoices[player.id]) {
      room.coffeeRpsChoices[player.id] = choices[Math.floor(Math.random() * choices.length)];
      autoSelectedNames.push(player.name);
    }
  });

  const first = room.coffeeRpsChoices[finalists[0].id];
  const second = room.coffeeRpsChoices[finalists[1].id];
  const labels = { rock: '바위', paper: '보', scissors: '가위' };
  const choiceSummary = finalists.map(player => ({
    name: player.name,
    choice: labels[room.coffeeRpsChoices[player.id]],
  }));
  if (first === second) {
    room.phase = 'coffee_rps_result';
    broadcastState(room);
    io.to(room.code).emit('coffee_rps_result', {
      draw: true,
      choices: choiceSummary,
      autoSelectedNames,
      timedOut,
    });
    setSubTimer(room.code, COFFEE_RESULT_DELAY_MS, () => startCoffeeRps(room, finalists.map(player => player.id)));
    return;
  }

  const firstWins = (first === 'rock' && second === 'scissors')
    || (first === 'scissors' && second === 'paper')
    || (first === 'paper' && second === 'rock');
  const winner = firstWins ? finalists[0] : finalists[1];
  const buyer = firstWins ? finalists[1] : finalists[0];
  room.phase = 'coffee_rps_result';
  broadcastState(room);
  io.to(room.code).emit('coffee_rps_result', {
    draw: false,
    winnerName: winner.name,
    buyerName: buyer.name,
    choices: choiceSummary,
    autoSelectedNames,
    timedOut,
  });
  setSubTimer(room.code, COFFEE_RESULT_DELAY_MS, () => finishCoffeeGame(room, [buyer.id], buyer.id));
}

function finishCoffeeGame(room, candidateIds, buyerIdOverride = null) {
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  const candidates = candidateIds.filter(id => room.players.some(p => p.id === id));
  const fallbackCandidates = candidates.length > 0 ? candidates : room.players.map(p => p.id);
  const buyerId = buyerIdOverride && fallbackCandidates.includes(buyerIdOverride)
    ? buyerIdOverride
    : fallbackCandidates[Math.floor(Math.random() * fallbackCandidates.length)];
  const buyer = room.players.find(p => p.id === buyerId);
  room.phase = 'result';
  broadcastState(room);
  io.to(room.code).emit('coffee_over', {
    buyerName: buyer?.name || '알 수 없는 참가자',
    candidateNames: fallbackCandidates.map(id => room.players.find(p => p.id === id)?.name).filter(Boolean),
  });
}

// ---------------- Subway line quiz flow ----------------

function startSubwayGame(room) {
  room.startSubwayGame(SUBWAY_ROUND_COUNT);
  startSubwayRound(room);
}

function startSubwayRound(room) {
  if (room.subwayIndex >= room.subwayQuestions.length) {
    endSubwayGame(room);
    return;
  }
  clearSubTimer(room.code);
  const question = room.subwayQuestions[room.subwayIndex];
  room.phase = 'subway_round';
  room.subwayRoundAnswered = false;
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'subway_round',
    station: question.name,
    choices: SUBWAY_LINES,
    roundNumber: room.subwayIndex + 1,
    totalRounds: room.subwayQuestions.length,
    transfer: question.lines.length > 1,
    durationMs: SUBWAY_ROUND_MS,
  });
  setRoomTimer(room.code, SUBWAY_ROUND_MS, () => resolveSubwayRound(room, null));
}

function resolveSubwayRound(room, winner) {
  if (room.phase !== 'subway_round' || room.subwayRoundAnswered) return;
  clearRoomTimer(room.code);
  room.subwayRoundAnswered = true;
  const question = room.subwayQuestions[room.subwayIndex];
  if (winner) winner.score += 1;
  broadcastState(room);
  io.to(room.code).emit('subway_round_result', {
    station: question.name,
    answerLines: question.lines,
    winnerName: winner?.name || null,
  });
  room.subwayIndex += 1;
  setSubTimer(room.code, NEXT_ROUND_DELAY_MS, () => startSubwayRound(room));
}

function endSubwayGame(room) {
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.phase = 'result';
  const maxScore = Math.max(0, ...room.players.map(p => p.score));
  const winners = room.players
    .filter(p => p.score === maxScore && maxScore > 0)
    .map(p => p.name);
  broadcastState(room);
  io.to(room.code).emit('subway_over', {
    scores: room.players.map(p => ({ name: p.name, score: p.score })),
    winners,
  });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- Song quiz flow ----------------

function normalizeSongAnswer(value) {
  return String(value || '')
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\u00a0'"\x60~!@#$%^&*()_+=[\]{};:,.<>/?\\|\-]/g, '');
}

function songAnswerMatches(value, canonical, aliases = []) {
  const answer = normalizeSongAnswer(value);
  return [canonical, ...aliases].some(item => normalizeSongAnswer(item) === answer);
}

function shuffleSongs(items) {
  const shuffled = [...items];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

function startSongQuizGame(room) {
  // 곡을 한 번씩 모두 소진한 뒤 다시 섞습니다. 따라서 등록된 곡이
  // 전부 나오기 전에는 같은 곡이 반복되지 않습니다.
  const items = [];
  let pool = [];
  while (items.length < SONG_ROUND_TOTAL && SONG_ITEMS.length > 0) {
    if (pool.length === 0) {
      pool = shuffleSongs(SONG_ITEMS);
      const previous = items.at(-1);
      if (previous && pool.length > 1 && pool[0].videoId === previous.videoId) {
        [pool[0], pool[1]] = [pool[1], pool[0]];
      }
    }
    items.push(pool.shift());
  }
  room.startSongQuiz(items);
  startSongRound(room);
}

function startSongRound(room) {
  if (room.songIndex >= room.songItems.length) {
    endSongQuizGame(room);
    return;
  }
  clearSubTimer(room.code);
  room.phase = 'song_round';
  room.songRoundAnswered = false;
  room.songSkipVotes = {};
  room.songRoundEndsAt = Date.now() + SONG_ROUND_MS;
  const song = room.songItems[room.songIndex];
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'song_round',
    videoId: song.videoId,
    startSeconds: Math.max(0, Number(song.highlightStart) || 0),
    clipDurationMs: SONG_CLIP_MS,
    roundNumber: room.songIndex + 1,
    totalRounds: room.songItems.length,
    durationMs: SONG_ROUND_MS,
  });
  io.to(room.code).emit('song_skip_update', {
    skippedCount: 0,
    totalPlayers: room.players.length,
  });
  setRoomTimer(room.code, SONG_ROUND_MS, () => resolveSongRound(room, null));
}

function startFoodRouletteGame(room) {
  room.phase = 'foodroulette_playing';
  room.foodRouletteResult = null;
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'foodroulette_playing',
    menuCount: FOOD_ROULETTE_MENUS.length,
  });
}

function spinFoodRoulette(room) {
  if (room.phase !== 'foodroulette_playing') return;
  const menu = FOOD_ROULETTE_MENUS[Math.floor(Math.random() * FOOD_ROULETTE_MENUS.length)];
  room.foodRouletteResult = menu;
  io.to(room.code).emit('foodroulette_result', { menu });
}

function startBandGame(room) {
  room.phase = 'band_playing';
  room.bandNotes = [];
  broadcastState(room);
  io.to(room.code).emit('phase_change', { phase: 'band_playing' });
}

function resolveSongRound(room, winner, { skipped = false } = {}) {
  if (room.phase !== 'song_round' || room.songRoundAnswered) return;
  clearRoomTimer(room.code);
  room.songRoundAnswered = true;
  room.songRoundEndsAt = 0;
  const song = room.songItems[room.songIndex];
  if (winner) winner.score += 1;
  broadcastState(room);
  io.to(room.code).emit('song_round_result', {
    correct: !!winner,
    answerArtist: song.artist,
    answerTitle: song.title,
    winnerName: winner?.name || null,
    skipped,
  });
  room.songIndex += 1;
  setSubTimer(room.code, NEXT_ROUND_DELAY_MS, () => startSongRound(room));
}

function endSongQuizGame(room) {
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.phase = 'result';
  broadcastState(room);
  const maxScore = Math.max(0, ...room.players.map(p => p.score));
  const winners = room.players.filter(p => p.score === maxScore && maxScore > 0).map(p => p.name);
  io.to(room.code).emit('song_quiz_over', {
    scores: room.players.map(p => ({ name: p.name, score: p.score })),
    winners,
  });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- Photo quiz flow ----------------

function startQuizGame(room) {
  // Use a few entries from the shared person database when the host did not
  // add room-specific items. Room uploads remain supported and are combined
  // with shared entries up to ten rounds.
  const sharedLimit = Math.max(0, 10 - room.quizItems.length);
  if (sharedLimit > 0) room.quizItems.push(...personDb.pickRandom(sharedLimit));
  room.resetQuiz();
  room.phase = 'quiz_round';
  broadcastState(room);
  startQuizRound(room);
}

function startQuizRound(room) {
  if (room.quizIndex >= room.quizItems.length) {
    endQuizGame(room);
    return;
  }
  room.phase = 'quiz_round';
  room.roundAnswered = false;
  const item = room.quizItems[room.quizIndex];
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'quiz_round',
    imageDataUrl: item.imageDataUrl,
    roundNumber: room.quizIndex + 1,
    totalRounds: room.quizItems.length,
    durationMs: QUIZ_ROUND_MS,
  });
  setRoomTimer(room.code, QUIZ_ROUND_MS, () => resolveQuizRound(room, null));
}

function resolveQuizRound(room, winner) {
  if (room.phase !== 'quiz_round') return;
  clearRoomTimer(room.code);
  const item = room.quizItems[room.quizIndex];
  if (winner) winner.score += 1;
  broadcastState(room);
  io.to(room.code).emit('quiz_round_result', {
    correct: !!winner,
    answer: item.answer,
    winnerName: winner?.name || null,
  });
  room.quizIndex += 1;
  setSubTimer(room.code, NEXT_ROUND_DELAY_MS, () => startQuizRound(room));
}

function endQuizGame(room) {
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.phase = 'result';
  broadcastState(room);
  const maxScore = Math.max(0, ...room.players.map(p => p.score));
  const winners = room.players.filter(p => p.score === maxScore && maxScore > 0).map(p => p.name);
  io.to(room.code).emit('quiz_over', {
    scores: room.players.map(p => ({ name: p.name, score: p.score })),
    winners,
  });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- CS quiz flow ----------------

function startCsQuizGame(room) {
  room.startCsQuiz(CS_QUESTION_COUNT);
  room.phase = 'cs_round';
  broadcastState(room);
  startCsRound(room);
}

function startCsRound(room) {
  if (room.csIndex >= room.csQuestions.length) {
    endCsQuizGame(room);
    return;
  }
  room.phase = 'cs_round';
  room.roundAnswered = false;
  const q = room.csQuestions[room.csIndex];
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'cs_round',
    question: q.question,
    choices: q.choices,
    roundNumber: room.csIndex + 1,
    totalRounds: room.csQuestions.length,
    durationMs: CS_ROUND_MS,
  });
  setRoomTimer(room.code, CS_ROUND_MS, () => resolveCsRound(room, null));
}

function resolveCsRound(room, winner) {
  if (room.phase !== 'cs_round') return;
  clearRoomTimer(room.code);
  const q = room.csQuestions[room.csIndex];
  if (winner) winner.score += 1;
  broadcastState(room);
  io.to(room.code).emit('cs_round_result', {
    correct: !!winner,
    answerIndex: q.answerIndex,
    answerText: q.choices[q.answerIndex],
    winnerName: winner?.name || null,
  });
  room.csIndex += 1;
  setSubTimer(room.code, NEXT_ROUND_DELAY_MS, () => startCsRound(room));
}

function endCsQuizGame(room) {
  clearRoomTimer(room.code);
  clearSubTimer(room.code);
  room.phase = 'result';
  broadcastState(room);
  const maxScore = Math.max(0, ...room.players.map(p => p.score));
  const winners = room.players.filter(p => p.score === maxScore && maxScore > 0).map(p => p.name);
  io.to(room.code).emit('cs_quiz_over', {
    scores: room.players.map(p => ({ name: p.name, score: p.score })),
    winners,
  });
  awardPointsForGame(room, pointsFromScores(room));
}

// ---------------- Stack (tower) flow — real physics via matter-js ----------------

function startStackGame(room) {
  room.startStackGame();
  room.settling = false;
  stackWorlds.set(room.code, new StackWorld());
  room.phase = 'stack_playing';
  broadcastState(room);
  advanceStackTurn(room);
}

function advanceStackTurn(room) {
  if (room.phase !== 'stack_playing') return;
  const physics = stackWorlds.get(room.code);
  const turnPlayerId = room.currentStackTurnPlayerId();
  const turnPlayer = room.players.find(p => p.id === turnPlayerId);
  room.nextBlockSpec = physics.rollBlockSpec();
  io.to(room.code).emit('phase_change', {
    phase: 'stack_playing',
    turnPlayerId,
    turnPlayerName: turnPlayer?.name,
    height: room.stackHeight,
    blockWidth: room.nextBlockSpec.width,
    isRainbow: room.nextBlockSpec.isRainbow,
    blocks: physics.snapshot(),
    worldWidth: WORLD_WIDTH,
    groundY: GROUND_Y,
    durationMs: STACK_TURN_MS,
  });
  setRoomTimer(room.code, STACK_TURN_MS, () => handleStackPlace(room, turnPlayerId, 0));
}

function handleStackPlace(room, playerId, offsetPx) {
  if (room.phase !== 'stack_playing' || room.settling) return;
  if (room.currentStackTurnPlayerId() !== playerId) return;
  clearRoomTimer(room.code);

  const physics = stackWorlds.get(room.code);
  const player = room.players.find(p => p.id === playerId);
  const entry = physics.dropBlock(offsetPx, room.nextBlockSpec.width, room.nextBlockSpec.isRainbow);
  room.stackHeight += 1;
  room.settling = true;
  io.to(room.code).emit('stack_dropped', { placedBy: player?.name });
  runStackSettleLoop(room, physics, player, entry);
}

function runStackSettleLoop(room, physics, placer, entry) {
  let elapsed = 0;
  let tickCount = 0;
  const interval = setInterval(() => {
    physics.step(STACK_TICK_MS);
    elapsed += STACK_TICK_MS;
    tickCount += 1;

    if (tickCount % STACK_BROADCAST_EVERY === 0) {
      io.to(room.code).emit('stack_tick', { blocks: physics.snapshot() });
    }

    const settled = physics.maxSpeed() < STACK_SETTLE_SPEED_EPS;
    if (settled || elapsed >= STACK_SETTLE_MAX_MS) {
      clearInterval(interval);
      stackIntervals.delete(room.code);
      io.to(room.code).emit('stack_tick', { blocks: physics.snapshot() });
      finalizeStackTurn(room, physics, placer, entry);
    }
  }, STACK_TICK_MS);
  stackIntervals.set(room.code, interval);
}

function finalizeStackTurn(room, physics, placer, entry) {
  room.settling = false;
  if (physics.isCollapsed()) {
    endStackGame(room, placer);
    return;
  }

  if (entry.isRainbow) {
    physics.clearBelow(entry);
    room.stackHeight = 1;
    io.to(room.code).emit('stack_rainbow_clear', {
      clearedBy: placer?.name,
      blocks: physics.snapshot(),
    });
  }

  room.stackTurnIndex += 1;
  broadcastState(room);
  advanceStackTurn(room);
}

function endStackGame(room, loser) {
  clearRoomTimer(room.code);
  clearStackInterval(room.code);
  room.settling = false;
  room.phase = 'result';
  broadcastState(room);
  io.to(room.code).emit('stack_over', {
    loserName: loser?.name,
    height: room.stackHeight,
  });

  const points = {};
  room.players.forEach(p => {
    points[p.id] = p.id === loser?.id ? 0 : 10;
  });
  awardPointsForGame(room, points);
}

// ---------------- Horse race (betting) flow ----------------

function startHorseGame(room) {
  room.startHorseGame();
  room.horseWeights = rollHorseWeights();
  room.phase = 'horse_betting';
  room.horseRound = 1;
  broadcastState(room);
  startHorseBetting(room);
}

function startHorseBetting(room) {
  room.phase = 'horse_betting';
  room.horseBets = {};
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'horse_betting',
    round: room.horseRound,
    totalRounds: HORSE_TOTAL_ROUNDS,
    roster: HORSE_ROSTER,
    durationMs: HORSE_BET_MS,
  });
  setRoomTimer(room.code, HORSE_BET_MS, () => resolveHorseRace(room));
}

function maybeResolveHorseBettingEarly(room) {
  if (Object.keys(room.horseBets).length >= room.players.length) {
    resolveHorseRace(room);
  }
}

function resolveHorseRace(room) {
  if (room.phase !== 'horse_betting') return;
  clearRoomTimer(room.code);

  const winner = pickWeightedWinner(room.horseWeights);
  room.horseWinHistory[winner] = (room.horseWinHistory[winner] || 0) + 1;
  const results = [];
  room.players.forEach(p => {
    const bet = room.horseBets[p.id];
    if (bet && bet.amount > 0) {
      const won = bet.horse === winner;
      p.score = Math.max(0, p.score + (won ? bet.amount * 2 : -bet.amount));
      results.push({ name: p.name, horse: bet.horse, amount: bet.amount, won });
    }
  });

  room.phase = 'horse_racing';
  broadcastState(room);
  io.to(room.code).emit('horse_race_result', {
    winner,
    results,
    round: room.horseRound,
    totalRounds: HORSE_TOTAL_ROUNDS,
    durationMs: HORSE_RACE_MS,
  });

  setRoomTimer(room.code, HORSE_RACE_MS, () => advanceHorseRound(room));
}

function advanceHorseRound(room) {
  if (room.horseRound >= HORSE_TOTAL_ROUNDS) {
    endHorseGame(room);
    return;
  }
  room.horseRound += 1;
  startHorseBetting(room);
}

function endHorseGame(room) {
  clearRoomTimer(room.code);
  room.phase = 'result';
  broadcastState(room);
  const maxScore = Math.max(0, ...room.players.map(p => p.score));
  const winners = room.players.filter(p => p.score === maxScore).map(p => p.name);
  io.to(room.code).emit('horse_over', {
    scores: room.players.map(p => ({ name: p.name, score: p.score })),
    winners,
  });

  const points = {};
  room.players.forEach(p => {
    points[p.id] = p.score - 100; // net tokens gained/lost from the starting stake
  });
  awardPointsForGame(room, points);
}

// ---------------- Gukbap (race minigame) flow ----------------

function startGukbapGame(room) {
  room.gukbapProgress = {};
  room.phase = 'gukbap_playing';
  broadcastState(room);
  io.to(room.code).emit('phase_change', {
    phase: 'gukbap_playing',
    durationMs: GUKBAP_MAX_MS,
  });
  setRoomTimer(room.code, GUKBAP_MAX_MS, () => resolveGukbapTimeout(room));
}

function resolveGukbapTimeout(room) {
  if (room.phase !== 'gukbap_playing') return;
  let best = null;
  Object.entries(room.gukbapProgress).forEach(([playerId, p]) => {
    const rank = GUKBAP_STAGE_RANK[p.stage] || 0;
    if (!best || rank > best.rank || (rank === best.rank && p.clicks > best.clicks)) {
      best = { playerId, rank, clicks: p.clicks, name: p.name };
    }
  });
  const winner = best ? room.players.find(p => p.id === best.playerId) : null;
  endGukbapGame(room, winner);
}

function endGukbapGame(room, winner) {
  clearRoomTimer(room.code);
  room.phase = 'result';
  broadcastState(room);
  io.to(room.code).emit('gukbap_over', { winnerName: winner?.name || null });

  if (winner) awardPointsForGame(room, { [winner.id]: 10 });
}

io.on('connection', socket => {
  let currentRoomCode = null;

  socket.on('login', ({ nickname, phone }, cb) => {
    const cleanNickname = (nickname || '').trim().slice(0, 10);
    const cleanPhone = accounts.normalizePhone(phone);
    if (!cleanNickname) return cb?.({ error: '닉네임을 입력하세요.' });
    if (cleanPhone.length < 9) return cb?.({ error: '올바른 전화번호를 입력하세요.' });

    const acc = accounts.getOrCreateAccount(cleanPhone, cleanNickname);
    removeOnlineSocket(socket);
    socket.account = { phone: acc.phone, nickname: acc.nickname, isAdmin: Boolean(acc.isAdmin) };
    addOnlineSocket(socket);
    cb?.(accounts.getProfile(acc.phone));
    socket.emit('leaderboard_update', accounts.getLeaderboardWithPresence(phone => onlineSockets.has(phone)));
    socket.emit('friend_list_update', friendListFor(acc.phone));
    socket.emit('friend_request_update', friendRequestsFor(acc.phone));
    socket.emit('person_db_update', personDbPayload(socket));
    const resumedRoomCode = resumeDisconnectedPlayer(socket);
    if (resumedRoomCode) currentRoomCode = resumedRoomCode;
    broadcastLeaderboard();
    broadcastFriendLists();
  });

  socket.on('get_profile', cb => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    cb?.(accounts.getProfile(socket.account.phone));
  });

  socket.on('update_profile', (payload = {}, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const result = accounts.updateProfile(socket.account.phone, payload);
    if (result.error) return cb?.({ error: result.error });

    socket.account.nickname = result.account.nickname;
    const room = rooms.getRoom(currentRoomCode);
    const player = room?.players.find(item => item.socketId === socket.id);
    if (player) {
      player.name = result.account.nickname;
      broadcastState(room);
    }
    const profile = accounts.getProfile(socket.account.phone);
    cb?.(profile);
    socket.emit('leaderboard_update', accounts.getLeaderboardWithPresence(phone => onlineSockets.has(phone)));
    broadcastFriendLists();
  });

  socket.on('get_leaderboard', cb => {
    cb?.(accounts.getLeaderboardWithPresence(phone => onlineSockets.has(phone)));
  });

  socket.on('get_person_db', cb => {
    if (!isAdminSocket(socket)) return cb?.({ error: 'ADMIN_ONLY' });
    cb?.({ ...personDbPayload(socket), people: personDb.getAll() });
  });

  socket.on('submit_feedback', ({ title, content }, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const result = feedbackDb.addFeedback({
      title,
      content,
      nickname: socket.account.nickname,
      phone: socket.account.phone,
    });
    if (result.error) return cb?.({ error: result.error });
    cb?.({ ok: true });
  });

  socket.on('get_notices', cb => {
    cb?.(noticeDb.getNotices());
  });

  socket.on('get_admin_data', cb => {
    if (!isAdminSocket(socket)) return cb?.({ error: 'ADMIN_ONLY' });
    cb?.({
      people: personDb.getAll(),
      feedback: feedbackDb.getFeedback(),
      notices: noticeDb.getNotices(),
    });
  });

  socket.on('submit_notice_comment', ({ noticeId, content }, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const result = noticeDb.addComment({
      noticeId,
      content,
      nickname: socket.account.nickname,
    });
    if (result.error) return cb?.({ error: result.error });
    cb?.({ ok: true });
    io.emit('notice_update', noticeDb.getNotices());
  });

  socket.on('submit_notice', ({ title, content }, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    if (!isAdminSocket(socket)) return cb?.({ error: 'ADMIN_ONLY' });
    const result = noticeDb.addNotice({
      title,
      content,
      nickname: socket.account.nickname,
    });
    if (result.error) return cb?.({ error: result.error });
    cb?.({ ok: true, item: result.item });
    io.emit('notice_update', noticeDb.getNotices());
  });

  socket.on('quick_join_preview', cb => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    cb?.(quickJoinPreview(socket.id));
  });

  socket.on('get_public_rooms', ({ mode } = {}, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    cb?.({ rooms: getPublicRooms(mode ? String(mode) : null) });
  });

  socket.on('quick_join', ({ mode, roomCode } = {}, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const currentRoom = rooms.getRoom(currentRoomCode);
    if (currentRoom?.players.some(player => player.socketId === socket.id)) {
      return cb?.({ error: 'ALREADY_IN_ROOM' });
    }

    let room = roomCode ? rooms.getRoom(String(roomCode)) : null;
    if (room && !canQuickJoinRoom(room)) return cb?.({ error: 'QUICK_JOIN_UNAVAILABLE' });
    const canJoinActiveBand = room?.mode === 'band' && room.phase === 'band_playing';
    if (!room || (!canJoinActiveBand && room.phase !== 'lobby') || room.mode !== mode || room.players.length >= room.maxPlayers()) {
      if (!SOLO_QUICK_JOIN_MODES.includes(mode) || (mode === 'ssafy' && !ssafyDb.isComplete())) {
        return cb?.({ error: 'QUICK_JOIN_UNAVAILABLE' });
      }
      room = rooms.createRoom(mode);
    }

    const { player, error } = room.addPlayer(socket.id, socket.account.nickname, socket.account.phone);
    if (error) return cb?.({ error });
    currentRoomCode = room.code;
    socket.data.roomCode = room.code;
    socket.join(room.code);
    cb?.({ code: room.code, playerId: player.id, mode: room.mode });
    broadcastState(room);
    if (room.mode === 'band' && room.phase === 'band_playing') {
      socket.emit('phase_change', { phase: 'band_playing', lateJoin: true });
    }
  });

  socket.on('add_person_db', ({ name, imageDataUrl }, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const result = personDb.addPerson({
      name,
      imageDataUrl,
      addedBy: socket.account.nickname,
    });
    if (result.error) return cb?.({ error: result.error });
    cb?.({ ok: true, person: result.person });
    broadcastPersonDb();
  });

  socket.on('get_friends', cb => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    cb?.({ friends: friendListFor(socket.account.phone) });
  });

  socket.on('get_friend_requests', cb => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    cb?.(friendRequestsFor(socket.account.phone));
  });

  socket.on('add_friend', ({ query }, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const target = String(query || '').trim();
    const friendPhone = accounts.normalizePhone(target);
    const friend = accounts.findByPhone(friendPhone) || accounts.findByNickname(target);
    if (!friend) return cb?.({ error: 'FRIEND_NOT_FOUND' });

    const result = accounts.sendFriendRequest(socket.account.phone, friend.phone);
    if (result.error) return cb?.({ error: result.error });
    cb?.({ ok: true, status: 'REQUEST_SENT', friend: { nickname: friend.nickname, phone: friend.phone } });
    emitFriendRequests(socket.account.phone);
    emitFriendRequests(friend.phone);
    onlineSockets.get(friend.phone)?.forEach(targetSocket => targetSocket.emit('friend_request', {
      nickname: socket.account.nickname,
      phone: socket.account.phone,
    }));
  });

  socket.on('accept_friend_request', ({ phone }, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const requesterPhone = accounts.normalizePhone(phone);
    const requester = accounts.findByPhone(requesterPhone);
    const result = accounts.acceptFriendRequest(socket.account.phone, requesterPhone);
    if (result.error) return cb?.({ error: result.error });
    cb?.({ ok: true });
    broadcastFriendLists();
    emitFriendRequests(socket.account.phone);
    if (requester) emitFriendRequests(requester.phone);
  });

  socket.on('reject_friend_request', ({ phone }, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const requesterPhone = accounts.normalizePhone(phone);
    const requester = accounts.findByPhone(requesterPhone);
    const result = accounts.rejectFriendRequest(socket.account.phone, requesterPhone);
    if (result.error) return cb?.({ error: result.error });
    cb?.({ ok: true });
    emitFriendRequests(socket.account.phone);
    if (requester) emitFriendRequests(requester.phone);
  });

  socket.on('remove_friend', ({ phone }, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const friendPhone = accounts.normalizePhone(phone);
    const result = accounts.removeFriend(socket.account.phone, friendPhone);
    if (result.error) return cb?.({ error: 'FRIEND_NOT_FOUND' });
    cb?.({ ok: true });
    broadcastFriendLists();
  });

  socket.on('invite_friend', ({ phone }, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const room = rooms.getRoom(currentRoomCode);
    if (!room || (room.phase !== 'lobby' && !(room.mode === 'band' && room.phase === 'band_playing'))) {
      return cb?.({ error: 'INVITE_LOBBY_ONLY' });
    }
    const friendPhone = accounts.normalizePhone(phone);
    const isFriend = accounts.getFriends(socket.account.phone).some(friend => friend.phone === friendPhone);
    if (!isFriend) return cb?.({ error: 'NOT_FRIEND' });
    if (room.players.some(player => player.accountPhone === friendPhone)) {
      return cb?.({ error: 'ALREADY_IN_ROOM' });
    }

    const friend = accounts.findByPhone(friendPhone);
    const targets = onlineSockets.get(friendPhone);
    if (!friend || !targets?.size) return cb?.({ error: 'FRIEND_OFFLINE' });

    const invite = {
      roomCode: room.code,
      mode: room.mode,
      inviterName: socket.account.nickname,
      friendName: friend.nickname,
    };
    targets.forEach(targetSocket => targetSocket.emit('friend_room_invite', invite));
    cb?.({ ok: true });
  });

  socket.on('logout', () => {
    removeOnlineSocket(socket);
    socket.account = null;
    broadcastLeaderboard();
    broadcastFriendLists();
  });

  socket.on('create_room', ({ mode, chainDurationSec, isPublic } = {}, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const room = rooms.createRoom(mode, { isPublic: Boolean(isPublic) });
    if (room.mode === 'wordchain' && chainDurationSec) {
      const clamped = Math.min(180, Math.max(60, Number(chainDurationSec) || 120));
      room.chainDurationMs = clamped * 1000;
    }
    const { player, error } = room.addPlayer(socket.id, socket.account.nickname, socket.account.phone);
    if (error) return cb?.({ error });
    currentRoomCode = room.code;
    socket.data.roomCode = room.code;
    socket.join(room.code);
    cb?.({ code: room.code, playerId: player.id, mode: room.mode });
    broadcastState(room);
  });

  socket.on('join_room', ({ code }, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const room = rooms.getRoom(code);
    if (!room) return cb?.({ error: 'ROOM_NOT_FOUND' });
    if (room.phase !== 'lobby' && !(room.mode === 'band' && room.phase === 'band_playing')) {
      return cb?.({ error: 'GAME_IN_PROGRESS' });
    }
    const currentRoom = rooms.getRoom(currentRoomCode);
    if (currentRoom?.players.some(player => player.socketId === socket.id)) {
      return cb?.({ error: 'ALREADY_IN_ROOM' });
    }
    const { player, error } = room.addPlayer(socket.id, socket.account.nickname, socket.account.phone);
    if (error) return cb?.({ error });
    currentRoomCode = room.code;
    socket.data.roomCode = room.code;
    socket.join(room.code);
    cb?.({ code: room.code, playerId: player.id, mode: room.mode });
    broadcastState(room);
    if (room.mode === 'band' && room.phase === 'band_playing') {
      socket.emit('phase_change', { phase: 'band_playing', lateJoin: true });
    }
  });

  socket.on('tug_team_move', ({ playerId, team }, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.mode !== 'tug' || room.phase !== 'lobby') return cb?.({ error: 'TUG_TEAM_NOT_EDITABLE' });
    if (!['left', 'right'].includes(team)) return cb?.({ error: 'INVALID_TUG_TEAM' });
    const player = room.players.find(p => p.socketId === socket.id);
    const target = room.players.find(p => p.id === playerId);
    if (!player || !target || player.id !== target.id) return cb?.({ error: 'ONLY_MOVE_YOURSELF' });
    const teamCount = room.players.filter(p => p.tugTeam === team).length;
    if (target.tugTeam !== team && teamCount >= TUG_MAX_TEAM_SIZE) return cb?.({ error: 'TUG_TEAM_FULL' });
    target.tugTeam = team;
    cb?.({ ok: true });
    broadcastState(room);
  });

  socket.on('start_game', () => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room) return;
    const host = room.players.find(p => p.socketId === socket.id);
    if (!host?.isHost) return;
    if (room.players.length < room.minPlayersToStart()) return;

    if (room.mode === 'liar') {
      room.assignLiar();
      room.phase = 'word_reveal';
      room.dayNumber = 0;
      broadcastState(room);
      sendWords(room);
      io.to(room.code).emit('phase_change', { phase: 'word_reveal' });
    } else if (room.mode === 'wordchain') {
      startWordChainGame(room);
    } else if (room.mode === 'quiz') {
      if (room.quizItems.length === 0 && personDb.getCount() === 0) return;
      startQuizGame(room);
    } else if (room.mode === 'csquiz') {
      startCsQuizGame(room);
    } else if (room.mode === 'stack') {
      startStackGame(room);
    } else if (room.mode === 'horse') {
      startHorseGame(room);
    } else if (room.mode === 'gukbap') {
      startGukbapGame(room);
    } else if (room.mode === 'drawing') {
      startDrawingGame(room);
    } else if (room.mode === 'memory') {
      startMemoryGame(room);
    } else if (room.mode === 'coffee') {
      startCoffeeGame(room);
    } else if (room.mode === 'subway') {
      startSubwayGame(room);
    } else if (room.mode === 'tug') {
      const leftCount = room.players.filter(player => player.tugTeam === 'left').length;
      const rightCount = room.players.filter(player => player.tugTeam === 'right').length;
      const playerCount = room.players.length;
      if (playerCount < 2 || playerCount > 12 || playerCount % 2 !== 0 || leftCount !== rightCount) return;
      startTugGame(room);
    } else if (room.mode === 'songquiz') {
      startSongQuizGame(room);
    } else if (room.mode === 'balance') {
      startBalanceGame(room);
    } else if (room.mode === 'fashion') {
      startFashionGame(room);
    } else if (room.mode === 'ssafy') {
      if (!ssafyDb.isComplete()) return;
      startSsafyGame(room);
    } else if (room.mode === 'goalkeeper') {
      if (room.players.length !== 2) return;
      startGoalkeeperGame(room);
    } else if (room.mode === 'foodroulette') {
      startFoodRouletteGame(room);
    } else if (room.mode === 'band') {
      startBandGame(room);
    } else {
      room.assignRoles();
      room.phase = 'role_reveal';
      broadcastState(room);
      sendRoles(room);
      io.to(room.code).emit('phase_change', { phase: 'role_reveal' });
    }
  });

  socket.on('role_ack', () => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || (room.phase !== 'role_reveal' && room.phase !== 'word_reveal')) return;
    room.readyPlayers = room.readyPlayers || new Set();
    room.readyPlayers.add(socket.id);
    io.to(room.code).emit('role_ack_update', { readyCount: room.readyPlayers.size, total: room.players.length });
    if (room.readyPlayers.size >= room.players.length) {
      room.readyPlayers = new Set();
      if (room.mode === 'liar') {
        startLiarTurns(room);
      } else {
        room.dayNumber = 0;
        startNight(room);
      }
    }
  });

  socket.on('night_action', ({ type, targetId }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'night') return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !player.alive) return;
    if (type === 'mafia' && player.role === 'mafia') {
      room.nightActions.mafiaTarget = targetId;
    } else if (type === 'doctor' && player.role === 'doctor') {
      room.nightActions.doctorTarget = targetId;
    } else if (type === 'police' && player.role === 'police') {
      room.nightActions.policeTarget = targetId;
    } else {
      return;
    }
    maybeResolveNightEarly(room);
  });

  socket.on('day_vote', ({ targetId }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'day_vote') return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !player.alive) return;
    room.votes[player.id] = targetId || null;
    io.to(room.code).emit('vote_progress', {
      votedCount: Object.keys(room.votes).length,
      total: room.alivePlayers().length,
    });
    maybeResolveVoteEarly(room);
  });

  socket.on('skip_to_vote', () => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'day_discussion') return;
    const host = room.players.find(p => p.socketId === socket.id);
    if (!host?.isHost) return;
    startDayVote(room);
  });

  socket.on('finish_turn', () => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'liar_turns') return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    finishLiarTurn(room, player.id);
  });

  socket.on('liar_guess', ({ guess }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'liar_guess') return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || player.id !== room.liarId) return;
    const normalize = s => (s || '').trim().replace(/\s+/g, '');
    const correct = normalize(guess) === normalize(room.word);
    if (correct) {
      endLiarGame(room, 'liar', player.name);
    } else {
      endLiarGame(room, room.liarWasCaught ? 'citizens' : 'liar', room.liarWasCaught ? player.name : null);
    }
  });

  socket.on('wordchain_submit', async ({ word }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'wordchain_playing') return;
    if (room.wordValidationInFlight) return; // one dictionary request at a time
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;

    const w = normalizeWord(word);
    if (w.length < 2) {
      return socket.emit('word_rejected', { word: w, reason: '두 글자 이상 입력하세요.' });
    }
    const last = room.lastChainWord();
    if (!canChainFrom(last, w)) {
      return socket.emit('word_rejected', { word: w, reason: chainStartReason(last) });
    }
    if (room.usedWords.has(w)) {
      return socket.emit('word_rejected', { word: w, reason: '이미 사용된 단어예요.' });
    }

    room.wordValidationInFlight = true;
    let validation;
    try {
      validation = await validateKoreanWord(w);
    } finally {
      room.wordValidationInFlight = false;
    }
    if (room.phase !== 'wordchain_playing' || !room.players.some(p => p.id === player.id)) return;
    if (!validation.valid) {
      return socket.emit('word_rejected', { word: w, reason: validation.reason || '사전에 없는 단어예요.' });
    }

    // The room may have advanced while the dictionary request was in flight.
    const currentLast = room.lastChainWord();
    if (!canChainFrom(currentLast, w)) {
      return socket.emit('word_rejected', { word: w, reason: chainStartReason(currentLast) });
    }
    if (room.usedWords.has(w)) {
      return socket.emit('word_rejected', { word: w, reason: '이미 사용된 단어예요.' });
    }

    room.chainWords.push(w);
    room.usedWords.add(w);
    player.score += 1;
    broadcastState(room);
    io.to(room.code).emit('word_result', {
      word: w,
      accepted: true,
      submitterName: player.name,
      lastWord: room.lastChainWord(),
    });
  });

  socket.on('drawing_submit', ({ imageDataUrl }, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'drawing') return cb?.({ error: 'DRAWING_NOT_ACTIVE' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    if (typeof imageDataUrl !== 'string' || !/^data:image\/(png|jpe?g);base64,/i.test(imageDataUrl)) {
      return cb?.({ error: 'INVALID_DRAWING' });
    }
    if (imageDataUrl.length > 900_000) return cb?.({ error: 'DRAWING_TOO_LARGE' });

    room.drawings[player.id] = imageDataUrl;
    cb?.({ ok: true });
    io.to(room.code).emit('drawing_progress', {
      submittedCount: Object.keys(room.drawings).length,
      total: room.players.length,
    });
    if (Object.keys(room.drawings).length >= room.players.length) startDrawingVote(room);
  });

  socket.on('drawing_vote', ({ targetId }, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'drawing_voting') return cb?.({ error: 'VOTING_NOT_ACTIVE' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    if (targetId === player.id) return cb?.({ error: 'CANNOT_VOTE_SELF' });
    if (!room.drawings[targetId]) return cb?.({ error: 'DRAWING_NOT_FOUND' });

    room.drawVotes[player.id] = targetId;
    cb?.({ ok: true });
    io.to(room.code).emit('drawing_vote_progress', {
      votedCount: Object.keys(room.drawVotes).length,
      total: room.players.length,
    });
    if (Object.keys(room.drawVotes).length >= room.players.length) resolveDrawingRound(room);
  });

  socket.on('memory_select', ({ index }, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'memory_playing') return cb?.({ error: 'MEMORY_NOT_ACTIVE' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    const current = memoryCurrentPlayer(room);
    if (!current || current.id !== player.id) return cb?.({ error: 'NOT_YOUR_TURN' });

    const cardIndex = Number(index);
    if (!Number.isInteger(cardIndex) || cardIndex < 0 || cardIndex >= room.memoryCards.length) {
      return cb?.({ error: 'INVALID_CARD' });
    }
    if (room.memoryMatched.has(cardIndex) || room.memorySelected.includes(cardIndex)) {
      return cb?.({ error: 'CARD_ALREADY_REVEALED' });
    }

    room.memorySelected.push(cardIndex);
    if (room.memorySelected.length === 1) {
      cb?.({ ok: true });
      emitMemoryState(room);
      return;
    }

    clearRoomTimer(room.code);
    cb?.({ ok: true });
    resolveMemoryPair(room, player);
  });

  socket.on('coffee_choice', ({ drinkIndex }, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'coffee_selecting') return cb?.({ error: 'COFFEE_NOT_ACTIVE' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !room.coffeeRemainingIds.includes(player.id)) return cb?.({ error: 'NOT_IN_THIS_ROUND' });
    if (room.coffeeChoices[player.id] != null) return cb?.({ error: 'ALREADY_CHOSEN' });

    const selected = Number(drinkIndex);
    if (!Number.isInteger(selected) || selected < 0 || selected >= room.coffeeDrinks.length) {
      return cb?.({ error: 'INVALID_DRINK' });
    }
    room.coffeeChoices[player.id] = selected;
    cb?.({ ok: true });
    const activeCount = coffeeActivePlayers(room).length;
    io.to(room.code).emit('coffee_choice_progress', {
      chosenCount: Object.keys(room.coffeeChoices).length,
      total: activeCount,
    });
    if (Object.keys(room.coffeeChoices).length >= activeCount) resolveCoffeeRound(room);
  });

  socket.on('coffee_rps_choice', ({ choice }, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'coffee_rps') return cb?.({ error: 'COFFEE_RPS_NOT_ACTIVE' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !room.coffeeRpsPlayers.includes(player.id)) return cb?.({ error: 'NOT_A_FINALIST' });
    if (!['rock', 'paper', 'scissors'].includes(choice)) return cb?.({ error: 'INVALID_RPS_CHOICE' });
    if (room.coffeeRpsChoices[player.id]) return cb?.({ error: 'ALREADY_CHOSEN' });

    room.coffeeRpsChoices[player.id] = choice;
    cb?.({ ok: true });
    io.to(room.code).emit('coffee_rps_progress', {
      chosenCount: Object.keys(room.coffeeRpsChoices).length,
      total: room.coffeeRpsPlayers.length,
    });
    if (Object.keys(room.coffeeRpsChoices).length >= room.coffeeRpsPlayers.length) resolveCoffeeRps(room);
  });

  socket.on('tug_pull', cb => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'tug_playing') return cb?.({ error: 'TUG_NOT_ACTIVE' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player?.tugTeam) return cb?.({ error: 'TUG_TEAM_NOT_FOUND' });

    room.tugClicks[player.tugTeam] += 1;
    room.tugPosition += player.tugTeam === 'left' ? -TUG_PULL_POWER : TUG_PULL_POWER;
    cb?.({ ok: true });
    io.to(room.code).emit('tug_update', {
      position: room.tugPosition,
      clicks: room.tugClicks,
      lastPlayerId: player.id,
    });

    if (room.tugPosition <= -TUG_WIN_THRESHOLD) finishTugGame(room, 'left');
    else if (room.tugPosition >= TUG_WIN_THRESHOLD) finishTugGame(room, 'right');
  });

  socket.on('song_answer', ({ artist, title }, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'song_round' || room.songRoundAnswered) return cb?.({ error: 'SONG_NOT_ACTIVE' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    const song = room.songItems[room.songIndex];
    const artistCorrect = songAnswerMatches(artist, song.artist, song.artistAliases);
    const titleCorrect = songAnswerMatches(title, song.title, song.titleAliases);
    if (!artistCorrect || !titleCorrect) {
      cb?.({ ok: false });
      return socket.emit('song_wrong', { artistCorrect, titleCorrect });
    }
    cb?.({ ok: true });
    resolveSongRound(room, player);
  });

  socket.on('song_skip', cb => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'song_round' || room.songRoundAnswered) return cb?.({ error: 'SONG_NOT_ACTIVE' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    if (room.songSkipVotes[player.id]) return cb?.({ error: 'SONG_ALREADY_SKIPPED' });

    room.songSkipVotes[player.id] = true;
    const skippedCount = Object.keys(room.songSkipVotes).length;
    const totalPlayers = room.players.length;
    cb?.({ ok: true });
    io.to(room.code).emit('song_skip_update', { skippedCount, totalPlayers });
    if (totalPlayers > 0 && room.players.every(currentPlayer => room.songSkipVotes[currentPlayer.id])) {
      resolveSongRound(room, null, { skipped: true });
    }
  });

  socket.on('balance_vote', ({ choice }, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'balance_round') return cb?.({ error: 'BALANCE_NOT_ACTIVE' });
    if (!['left', 'right'].includes(choice)) return cb?.({ error: 'INVALID_BALANCE_CHOICE' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    if (room.balanceVotes[player.id]) return cb?.({ error: 'BALANCE_ALREADY_VOTED' });

    room.balanceVotes[player.id] = choice;
    cb?.({ ok: true });
    io.to(room.code).emit('balance_vote_update', {
      votedCount: Object.keys(room.balanceVotes).length,
      totalPlayers: room.players.length,
    });
    if (Object.keys(room.balanceVotes).length >= room.players.length) resolveBalanceRound(room);
  });

  socket.on('fashion_submit', ({ outfit } = {}, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'fashion_dressing') return cb?.({ error: 'FASHION_NOT_DRESSING' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    if (room.fashionOutfits[player.id]) return cb?.({ error: 'FASHION_ALREADY_SUBMITTED' });
    room.fashionOutfits[player.id] = sanitizeFashionOutfit(outfit);
    cb?.({ ok: true });
    io.to(room.code).emit('fashion_submit_progress', {
      submittedCount: Object.keys(room.fashionOutfits).length,
      totalPlayers: room.players.length,
    });
    if (Object.keys(room.fashionOutfits).length >= room.players.length) startFashionVoting(room);
  });

  socket.on('fashion_vote', ({ candidateId } = {}, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'fashion_voting') return cb?.({ error: 'FASHION_NOT_VOTING' });
    const voter = room.players.find(p => p.socketId === socket.id);
    if (!voter) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    if (voter.id === candidateId) return cb?.({ error: 'CANNOT_VOTE_SELF' });
    const candidates = new Set(fashionGalleryPayload(room).map(item => item.candidateId));
    if (!candidates.has(candidateId)) return cb?.({ error: 'INVALID_FASHION_CANDIDATE' });
    if (room.fashionVotes[voter.id]) return cb?.({ error: 'FASHION_ALREADY_VOTED' });
    room.fashionVotes[voter.id] = candidateId;
    cb?.({ ok: true });
    const eligibleVoters = room.players.filter(player => candidates.has(player.id) && candidates.size > 1);
    io.to(room.code).emit('fashion_vote_progress', {
      votedCount: Object.keys(room.fashionVotes).length,
      totalVoters: eligibleVoters.length,
    });
    if (Object.keys(room.fashionVotes).length >= eligibleVoters.length) resolveFashionRound(room);
  });

  socket.on('ssafy_get_photos', cb => {
    cb?.({ photos: ssafyDb.getAll(), count: ssafyDb.getAll().filter(photo => photo.imageDataUrl).length, ready: ssafyDb.isComplete() });
  });

  socket.on('ssafy_save_photo', ({ level, imageDataUrl } = {}, cb) => {
    if (!socket.account) return cb?.({ error: 'NOT_LOGGED_IN' });
    const room = rooms.getRoom(currentRoomCode);
    const result = ssafyDb.setPhoto(level, imageDataUrl, socket.account?.nickname);
    if (result.error) return cb?.({ error: result.error });
    const payload = { photos: ssafyDb.getAll(), count: ssafyDb.getAll().filter(photo => photo.imageDataUrl).length, ready: ssafyDb.isComplete() };
    cb?.({ ok: true, ...payload });
    io.emit('ssafy_photo_update', payload);
    if (room?.mode === 'ssafy' && room.phase === 'lobby') broadcastState(room);
  });

  socket.on('ssafy_game_over', ({ score, highestLevel } = {}, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.mode !== 'ssafy') return cb?.({ error: 'SSAFY_NOT_ACTIVE' });
    if (!room.players.some(player => player.socketId === socket.id)) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    cb?.({ ok: true });
    endSsafyGame(room, score, highestLevel);
  });

  socket.on('goalkeeper_choice', ({ side } = {}, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.mode !== 'goalkeeper' || room.phase !== 'goalkeeper_shot') return cb?.({ error: 'GOALKEEPER_NOT_ACTIVE' });
    if (!['left', 'right'].includes(side)) return cb?.({ error: 'INVALID_GOALKEEPER_SIDE' });
    const player = room.players.find(item => item.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    if (room.goalkeeperChoices[player.id]) return cb?.({ error: 'GOALKEEPER_ALREADY_CHOSEN' });
    room.goalkeeperChoices[player.id] = side;
    cb?.({ ok: true });
    io.to(room.code).emit('goalkeeper_choice_progress', {
      chosenCount: Object.keys(room.goalkeeperChoices).length,
      totalPlayers: room.players.length,
    });
    if (Object.keys(room.goalkeeperChoices).length >= 2) resolveGoalkeeperShot(room);
  });

  socket.on('foodroulette_spin', cb => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.mode !== 'foodroulette' || room.phase !== 'foodroulette_playing') {
      return cb?.({ error: 'FOOD_ROULETTE_NOT_ACTIVE' });
    }
    if (!room.players.some(player => player.socketId === socket.id)) {
      return cb?.({ error: 'PLAYER_NOT_FOUND' });
    }
    spinFoodRoulette(room);
    cb?.({ ok: true });
  });

  socket.on('band_instrument_set', ({ instrument } = {}, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.mode !== 'band' || !['lobby', 'band_playing'].includes(room.phase)) {
      return cb?.({ error: 'BAND_NOT_ACTIVE' });
    }
    if (!BAND_INSTRUMENTS.has(instrument)) return cb?.({ error: 'INVALID_BAND_INSTRUMENT' });
    const player = room.players.find(item => item.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    player.bandInstrument = instrument;
    cb?.({ ok: true });
    broadcastState(room);
  });

  socket.on('band_note', (payload = {}, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.mode !== 'band' || room.phase !== 'band_playing') {
      return cb?.({ error: 'BAND_NOT_ACTIVE' });
    }
    const player = room.players.find(item => item.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });
    const instrument = BAND_INSTRUMENTS.has(payload.instrument) ? payload.instrument : player.bandInstrument || 'piano';
    const type = BAND_NOTE_TYPES.has(payload.type) ? payload.type : 'note';
    const note = Number(payload.note);
    const notes = Array.isArray(payload.notes)
      ? payload.notes.map(value => Number(value)).filter(value => Number.isFinite(value) && value >= 20 && value <= 110).slice(0, 8)
      : [];
    const drum = String(payload.drum || '').slice(0, 20);
    if (type === 'note' && (!Number.isFinite(note) || note < 20 || note > 110)) return cb?.({ error: 'INVALID_BAND_NOTE' });
    if (type === 'chord' && notes.length === 0) return cb?.({ error: 'INVALID_BAND_CHORD' });
    if (type === 'drum' && !drum) return cb?.({ error: 'INVALID_BAND_DRUM' });
    const event = {
      playerId: player.id,
      playerName: player.name,
      instrument,
      type,
      note: Number.isFinite(note) ? note : null,
      notes,
      drum,
      velocity: Math.max(0.1, Math.min(1, Number(payload.velocity) || 0.8)),
      durationMs: Math.max(80, Math.min(3000, Number(payload.durationMs) || 500)),
    };
    io.to(room.code).emit('band_note', event);
    cb?.({ ok: true });
  });

  socket.on('band_signal', ({ targetId, signal } = {}, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.mode !== 'band' || !['lobby', 'band_playing'].includes(room.phase)) {
      return cb?.({ error: 'BAND_NOT_ACTIVE' });
    }
    const target = room.players.find(item => item.id === targetId);
    if (!target || !signal) return cb?.({ error: 'INVALID_BAND_SIGNAL' });
    io.to(target.socketId).emit('band_signal', { fromId: socket.id, signal });
    cb?.({ ok: true });
  });

  socket.on('subway_answer', (payload = {}, cb) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'subway_round') return cb?.({ error: 'SUBWAY_NOT_ACTIVE' });
    if (room.subwayRoundAnswered) return cb?.({ error: 'ROUND_ALREADY_ANSWERED' });
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return cb?.({ error: 'PLAYER_NOT_FOUND' });

    const selectedLines = Array.isArray(payload.lines)
      ? [...new Set(payload.lines.map(line => String(line)))]
      : [String(payload.line ?? '')];
    const question = room.subwayQuestions[room.subwayIndex];
    const isCorrect = question
      && selectedLines.length === question.lines.length
      && question.lines.every(line => selectedLines.includes(line));
    if (!isCorrect) {
      cb?.({ ok: false });
      socket.emit('subway_wrong', { selectedLines, requiredCount: question?.lines.length || 1 });
      return;
    }

    cb?.({ ok: true });
    resolveSubwayRound(room, player);
  });

  socket.on('quiz_upload_item', ({ imageDataUrl, answer }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.mode !== 'quiz' || room.phase !== 'lobby') return;
    const host = room.players.find(p => p.socketId === socket.id);
    if (!host?.isHost) return;
    if (!imageDataUrl || !answer?.trim()) return;
    if (room.quizItems.length >= 30) return;
    room.quizItems.push({ imageDataUrl, answer: answer.trim() });
    io.to(room.code).emit('quiz_items_update', { count: room.quizItems.length });
  });

  socket.on('quiz_answer', ({ guess }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'quiz_round' || room.roundAnswered) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    const item = room.quizItems[room.quizIndex];
    const normalize = s => (s || '').trim().replace(/\s+/g, '').toLowerCase();
    if (normalize(guess) === normalize(item.answer)) {
      room.roundAnswered = true;
      resolveQuizRound(room, player);
    } else {
      socket.emit('quiz_wrong', { guess });
    }
  });

  socket.on('cs_answer', ({ choiceIndex }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'cs_round' || room.roundAnswered) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    const q = room.csQuestions[room.csIndex];
    if (choiceIndex === q.answerIndex) {
      room.roundAnswered = true;
      resolveCsRound(room, player);
    } else {
      socket.emit('cs_wrong', { choiceIndex });
    }
  });

  socket.on('stack_preview', ({ offset }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'stack_playing' || room.settling) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || room.currentStackTurnPlayerId() !== player.id) return;
    const clamped = Math.max(-(WORLD_WIDTH / 2), Math.min(WORLD_WIDTH / 2, Number(offset) || 0));
    socket.to(room.code).emit('stack_preview_update', { offset: clamped });
  });

  socket.on('stack_place', ({ offset }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'stack_playing') return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || room.currentStackTurnPlayerId() !== player.id) return;
    const clamped = Math.max(-(WORLD_WIDTH / 2), Math.min(WORLD_WIDTH / 2, Number(offset) || 0));
    handleStackPlace(room, player.id, clamped);
  });

  socket.on('horse_bet', ({ horse, amount }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'horse_betting') return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    const horseNum = Math.round(Number(horse));
    if (!HORSE_ROSTER.some(h => h.id === horseNum)) return;

    const amt = Math.round(Number(amount) || 0);
    if (amt !== 0 && amt < HORSE_MIN_BET) {
      return socket.emit('horse_bet_error', { reason: `최소 ${HORSE_MIN_BET} 토큰 이상 베팅해야 합니다.` });
    }
    if (amt > player.score) {
      return socket.emit('horse_bet_error', { reason: '보유 토큰보다 많이 베팅할 수 없습니다.' });
    }

    room.horseBets[player.id] = { horse: horseNum, amount: amt };
    io.to(room.code).emit('horse_bet_progress', {
      betCount: Object.keys(room.horseBets).length,
      total: room.players.length,
    });
    maybeResolveHorseBettingEarly(room);
  });

  socket.on('horse_buy_stats', () => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.mode !== 'horse' || room.phase !== 'horse_betting') return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    if (player.score < HORSE_STATS_COST) {
      return socket.emit('horse_stats_error', { reason: `통계를 보려면 ${HORSE_STATS_COST} 토큰이 필요합니다.` });
    }
    player.score = Math.max(0, player.score - HORSE_STATS_COST);
    broadcastState(room);
    const totalRaces = Object.values(room.horseWinHistory).reduce((sum, c) => sum + c, 0);
    socket.emit('horse_stats_result', {
      history: room.horseWinHistory,
      totalRaces,
    });
  });

  socket.on('gukbap_progress', ({ stage, clicks }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'gukbap_playing') return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !(stage in GUKBAP_STAGE_RANK)) return;
    room.gukbapProgress[player.id] = { name: player.name, stage, clicks: Math.max(0, Math.round(Number(clicks) || 0)) };
    io.to(room.code).emit('gukbap_progress_update', {
      playerId: player.id,
      name: player.name,
      stage,
      clicks: room.gukbapProgress[player.id].clicks,
    });
  });

  socket.on('gukbap_finish', () => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room || room.phase !== 'gukbap_playing') return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player) return;
    endGukbapGame(room, player);
  });

  socket.on('chat_message', ({ text }) => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room) return;
    const player = room.players.find(p => p.socketId === socket.id);
    if (!player || !text?.trim()) return;

    if (room.phase === 'liar_turns' && room.speakingOrder[room.turnIndex % room.speakingOrder.length] === player.id) {
      room.turnHasSpoken = true;
    }

    const msg = {
      name: player.name,
      text: text.trim().slice(0, 500),
      ts: Date.now(),
    };
    io.to(room.code).emit('chat_message', msg);
  });

  socket.on('restart_game', () => {
    const room = rooms.getRoom(currentRoomCode);
    if (!room) return;
    const host = room.players.find(p => p.socketId === socket.id);
    if (!host?.isHost) return;
    clearRoomTimer(room.code);
    clearSubTimer(room.code);
    clearStackInterval(room.code);
    stackWorlds.delete(room.code);
    room.resetForNewGame();
    broadcastState(room);
  });

  socket.on('leave_room', cb => {
    removeSocketFromRoom(socket);
    currentRoomCode = null;
    cb?.({ ok: true });
  });

  socket.on('disconnect', () => {
    removeOnlineSocket(socket);
    broadcastLeaderboard();
    broadcastFriendLists();
    deferSocketRemoval(socket);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Game server running on port ${PORT}`);
});
