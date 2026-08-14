const backendUrl = window.APP_CONFIG?.backendUrl?.trim() || window.location.origin;
const socket = io(backendUrl);

const ROLE_INFO = {
  mafia: { label: '🔪 마피아', desc: '밤마다 한 명을 지목해 제거하세요. 정체를 들키지 마세요.' },
  doctor: { label: '💉 의사', desc: '밤마다 한 명을 치료해 마피아의 공격을 막으세요.' },
  police: { label: '🔍 경찰', desc: '밤마다 한 명을 조사해 마피아인지 확인하세요.' },
  citizen: { label: '🙂 시민', desc: '특별한 능력은 없어요. 토론과 투표로 마피아를 찾아내세요.' },
};

const MODE_LABEL = {
  mafia: '🕵️ 마피아 게임',
  liar: '🤥 라이어 게임',
  wordchain: '🔗 끝말잇기',
  drawing: '🎨 피카소게임',
  memory: '🧠 짝맞추기게임',
  coffee: '☕ 커피쏘기게임',
  subway: '🚇 서울 지하철 호선맞추기',
  quiz: '🖼️ 인물 맞추기',
  csquiz: '💻 CS 지식대결',
  stack: '🧱 쌓기 게임',
  horse: '🐎 경마게임(김성진 게임)',
  gukbap: '🍲 안성국밥 게임',
  tug: '🪢 줄다리기 팀대항전',
  songquiz: '🎵 노래맞추기',
  balance: '⚖️ 개발자 밸런스게임',
  fashion: '👗 패션쇼 게임',
  ssafy: '🧅 싸피 게임',
  goalkeeper: '🥅 골키퍼 게임',
  foodroulette: '🎰 메뉴추천 룰렛',
  band: '🎶 합주 게임',
};
const MODE_PREVIEW = {
  mafia: { icon: '🕵️', name: '마피아 게임', description: '역할을 나누고 토론과 투표로 마피아를 찾아내는 게임', ratings: { '추리력': 5, '순발력': 3, '소통력': 5 } },
  liar: { icon: '🤥', name: '라이어 게임', description: '제시어를 모르는 라이어를 대화로 찾아내는 게임', ratings: { '추리력': 5, '순발력': 4, '소통력': 5 } },
  wordchain: { icon: '🔗', name: '끝말잇기', description: '한국어 단어를 이어가며 빠르게 대결하는 게임', ratings: { '순발력': 5, '어휘력': 5, '집중력': 4 } },
  drawing: { icon: '🎨', name: '피카소게임', description: '주제를 보고 동시에 그림을 그리고 투표하는 게임', ratings: { '창의성': 5, '순발력': 3, '표현력': 5 } },
  memory: { icon: '🧠', name: '짝맞추기게임', description: '100장의 카드에서 기억력으로 50쌍을 맞히는 게임', ratings: { '기억력': 5, '집중력': 5, '순발력': 3 } },
  coffee: { icon: '☕', name: '커피쏘기게임', description: '겹치지 않는 음료를 골라 커피 내기를 피하는 게임', ratings: { '눈치': 5, '전략성': 4, '순발력': 3 } },
  subway: { icon: '🚇', name: '서울 지하철 호선맞추기', description: '역 이름을 보고 해당 호선을 선착순으로 맞히는 게임', ratings: { '순발력': 5, '기억력': 4, '집중력': 4 } },
  quiz: { icon: '🖼️', name: '인물 맞추기', description: '사진 속 인물을 가장 먼저 맞히는 게임', ratings: { '순발력': 5, '기억력': 4, '추리력': 4 } },
  csquiz: { icon: '💻', name: 'CS 지식대결', description: '컴퓨터 과학 상식 문제를 풀어 점수를 얻는 게임', ratings: { '지식': 5, '집중력': 4, '순발력': 3 } },
  stack: { icon: '🧱', name: '쌓기 게임', description: '타이밍을 맞춰 블록을 높게 쌓는 게임', ratings: { '순발력': 5, '집중력': 5, '정밀함': 4 } },
  horse: { icon: '🐎', name: '경마게임(김성진 게임)', description: '말에 베팅하고 달리기 결과를 예측하는 게임', ratings: { '전략성': 5, '운': 5, '판단력': 4 } },
  gukbap: { icon: '🍲', name: '안성국밥 게임', description: '클릭과 선택으로 가장 빠르게 완주하는 게임', ratings: { '순발력': 5, '집중력': 4, '전략성': 3 } },
  tug: { icon: '🪢', name: '줄다리기 팀대항전', description: '팀을 나누고 클릭으로 줄을 당겨 상대 팀을 선 밖으로 밀어내는 게임', ratings: { '순발력': 5, '협동심': 5, '체력': 4 } },
  songquiz: { icon: '🎵', name: '노래맞추기', description: '최신 K-POP을 듣고 가수와 제목을 모두 맞히는 게임', ratings: { '청음력': 5, '기억력': 4, '순발력': 5 } },
  balance: { icon: '⚖️', name: '개발자 밸런스게임', description: '개발자라면 고민되는 선택지를 가볍게 투표하는 게임', ratings: { '토론력': 4, '공감력': 5, '재미': 5 } },
  fashion: { icon: '👗', name: '패션쇼 게임', description: '주제에 맞춰 캐릭터를 꾸미고 익명 투표로 우승자를 뽑는 게임', ratings: { '창의성': 5, '패션감각': 5, '순발력': 4 } },
  ssafy: { icon: '🧅', name: '싸피 게임', description: '내 사진으로 동그란 캐릭터를 합쳐 2048처럼 성장시키는 게임', ratings: { '순발력': 5, '집중력': 5, '전략성': 4 } },
  goalkeeper: { icon: '🥅', name: '골키퍼 게임', description: '공격과 수비를 번갈아 맡아 방향 심리전으로 골을 넣는 게임', ratings: { '순발력': 5, '심리전': 5, '집중력': 4 } },
  foodroulette: { icon: '🎰', name: '메뉴추천 룰렛', description: '젊은 입맛 메뉴 100개 중 오늘 먹을 메뉴를 랜덤으로 추천받는 게임', ratings: { '운': 5, '재미': 5, '순발력': 1 } },
  band: { icon: '🎶', name: '합주 게임', description: '피아노·일렉·베이스·드럼·보컬을 함께 연주하고 녹음하는 게임', ratings: { '창의성': 5, '협동심': 5, '리듬감': 5 } },
};
const GAME_HELP = {
  mafia: {
    title: '마피아 게임', summary: '역할을 숨기고 밤 행동과 낮 토론으로 승부해요.',
    control: '역할을 확인하고, 밤에는 역할에 맞는 대상을 선택하세요. 낮에는 채팅으로 토론한 뒤 투표합니다.',
    score: '승리한 팀의 플레이어는 10점을 얻어요. 시민팀은 마피아를 모두 찾고, 마피아팀은 시민 수를 줄이면 승리합니다.',
    tip: '역할 카드의 설명을 먼저 읽고 행동하세요.',
  },
  liar: {
    title: '라이어 게임', summary: '제시어를 모르는 라이어를 대화와 투표로 찾아요.',
    control: '내 제시어를 확인한 뒤 차례대로 설명하고, 라이어라고 생각되는 사람에게 투표하세요.',
    score: '시민팀 승리 시 시민은 10점, 라이어가 역전하면 라이어는 15점을 얻어요.',
    tip: '제시어를 너무 직접적으로 말하면 라이어에게 힌트를 줄 수 있어요.',
  },
  wordchain: {
    title: '끝말잇기', summary: '앞 단어의 마지막 글자로 단어를 이어가요.',
    control: '내 차례에 단어를 입력하고 제출하세요. 제한 시간 안에 두음법칙을 포함한 유효한 단어를 입력해야 합니다.',
    score: '인정된 단어를 제출할 때마다 1점이에요. 게임 종료 시 누적 점수가 랭킹에 반영됩니다.',
    tip: '이미 나온 단어와 끝 글자를 빠르게 확인하세요.',
  },
  drawing: {
    title: '피카소게임', summary: '주제를 보고 그림을 그린 뒤 익명으로 서로 투표해요.',
    control: '60초 동안 캔버스에 그리고 제출하세요. 투표 단계에서는 본인 그림을 제외한 작품 하나를 선택합니다.',
    score: '라운드에서 가장 많은 표를 받은 작품의 제작자가 10점을 얻어요. 총 5라운드입니다.',
    tip: '작은 디테일보다 주제가 한눈에 보이도록 그려보세요.',
  },
  memory: {
    title: '짝맞추기게임', summary: '100장의 카드에서 같은 그림 50쌍을 찾아요.',
    control: '처음 5초 동안 카드를 기억한 뒤, 내 차례에 카드 두 장을 클릭하세요. 맞으면 열린 상태로 유지됩니다.',
    score: '맞춘 카드 쌍 하나마다 1점이에요. 모든 쌍이 맞춰지면 누적 점수로 승부합니다.',
    tip: '카드 위치와 주변 카드의 모양을 함께 기억하면 좋아요.',
  },
  coffee: {
    title: '커피쏘기게임', summary: '다른 사람과 겹치지 않는 음료를 골라 탈락을 피하세요.',
    control: '각 라운드에 비공개로 음료 하나를 선택합니다. 같은 음료를 고른 사람은 다음 라운드로 넘어가고, 혼자 고른 사람은 탈출합니다.',
    score: '점수는 기록하지 않아요. 마지막 두 명은 가위바위보로 커피를 살 사람을 정합니다.',
    tip: '사람들이 고를 것 같은 인기 음료를 피하는 게 핵심이에요.',
  },
  subway: {
    title: '서울 지하철 호선맞추기', summary: '역 이름을 보고 해당하는 모든 호선을 선착순으로 맞혀요.',
    control: '제시된 역의 호선 버튼을 선택하고 제출하세요. 선택한 버튼은 다시 눌러 취소할 수 있고, 환승역은 모든 호선을 골라야 합니다.',
    score: '정답을 가장 먼저 맞힌 플레이어가 라운드 1점을 얻어요. 총 10라운드입니다.',
    tip: '환승역인지 먼저 확인한 뒤 호선 버튼을 빠르게 선택하세요.',
  },
  quiz: {
    title: '인물 맞추기', summary: '사진 속 인물을 가장 먼저 맞히는 게임이에요.',
    control: '사진을 보고 이름을 입력해 정답을 제출하세요. 방장이 등록한 사진과 공용 인물 DB가 문제로 출제됩니다.',
    score: '라운드 정답자에게 1점이 주어져요. 총 10라운드 누적 점수로 승부합니다.',
    tip: '이름의 띄어쓰기나 별칭보다 등록된 이름을 먼저 떠올려보세요.',
  },
  csquiz: {
    title: 'CS 지식대결', summary: '컴퓨터 과학 객관식 문제를 빠르게 풀어요.',
    control: '문제를 읽고 보기 하나를 클릭하세요. 제한 시간 안에 답을 제출해야 합니다.',
    score: '정답을 맞힐 때마다 1점이에요. 총 10문제 누적 점수로 승부합니다.',
    tip: '정답 제출 후에는 선택을 바꿀 수 없으니 신중하게 고르세요.',
  },
  stack: {
    title: '쌓기 게임', summary: '움직이는 블록을 타이밍에 맞춰 떨어뜨려요.',
    control: '내 차례에 Space 키 또는 화면 버튼으로 블록을 낙하시킵니다. 블록이 어긋나면 게임이 끝날 수 있어요.',
    score: '끝까지 살아남은 플레이어가 10점을 얻어요. 쌓은 높이도 실시간으로 표시됩니다.',
    tip: '블록 중앙이 아래 블록과 겹치는 순간을 노리세요.',
  },
  horse: {
    title: '경마게임', summary: '말에 토큰을 베팅하고 경주 결과를 예측해요.',
    control: '말을 하나 선택하고 보유 토큰에서 베팅액을 입력해 제출하세요. 경주 중에는 결과를 지켜봅니다.',
    score: '맞힌 베팅 결과에 따라 토큰이 늘거나 줄어요. 최종 보유 토큰 차이가 랭킹 점수에 반영됩니다.',
    tip: '지난 승률 종이는 참고용이며 결과를 보장하지 않아요.',
  },
  gukbap: {
    title: '안성국밥 게임', summary: '순서대로 재료를 클릭해 국밥을 완성하는 게임이에요.',
    control: '화면에 나타나는 재료와 버튼을 빠르게 클릭해 다음 단계로 진행하세요.',
    score: '가장 먼저 완주한 플레이어가 10점을 얻어요.',
    tip: '다음에 눌러야 할 재료를 미리 찾아두면 유리합니다.',
  },
  tug: {
    title: '줄다리기 팀대항전', summary: '팀원들과 클릭을 모아 줄을 우리 팀 쪽으로 당겨요.',
    control: '내 팀의 당기기 버튼을 클릭하세요. 팀 배치는 대기실에서 내 이름을 드래그해 바꿀 수 있습니다.',
    score: '상대 팀을 승리선 밖으로 밀어낸 팀이 승리합니다. 줄다리기는 별도 점수를 기록하지 않아요.',
    tip: '한 번의 클릭이 크게 움직이니 팀원들과 타이밍을 맞추세요.',
  },
  songquiz: {
    title: '노래맞추기', summary: '화면에 제목이 노출되지 않는 음원을 듣고 맞혀요.',
    control: '노래를 듣고 가수와 제목을 각각 입력해 제출하세요. 재생 중 조작은 제한되고 다시 재생만 가능합니다.',
    score: '가수와 제목을 모두 맞힌 정답만 1점이에요. 총 10라운드입니다.',
    tip: '피처링 가수는 필수 정답이 아니며, 메인 가수와 곡명을 정확히 입력하세요.',
  },
  balance: {
    title: '개발자 밸런스게임', summary: '개발자 취향을 고르고 다른 사람들과 결과를 비교해요.',
    control: '두 선택지 중 하나를 클릭하세요. 혼자서도 플레이할 수 있고, 총 10라운드가 진행됩니다.',
    score: '1인은 점수 없음, 2인은 같은 선택이면 양쪽 모두 +1점, 3인 이상은 다수 선택 쪽만 +1점이에요.',
    tip: '정답은 없으니 가장 끌리는 쪽을 빠르게 선택하세요.',
  },
  fashion: {
    title: '패션쇼 게임', summary: '주제에 맞춰 캐릭터를 꾸미고 익명 투표로 우승자를 뽑아요.',
    control: '60초 동안 아이템을 클릭하거나 캐릭터 슬롯으로 드래그하세요. 카테고리마다 하나만 선택하고 제출합니다.',
    score: '각 라운드 최다 득표 스타일의 제작자가 +1점이에요. 총 8라운드 누적 점수로 승부합니다.',
    tip: '주제와 어울리는 조합을 만들고 투표 단계에서는 본인 작품을 선택할 수 없어요.',
  },
  ssafy: {
    title: '싸피 게임', summary: '사진 캐릭터를 떨어뜨려 같은 단계끼리 합치고 더 큰 단계로 성장시켜요.',
    control: '마우스·터치로 떨어질 위치를 정하고 클릭하거나 Space를 눌러 캐릭터를 떨어뜨립니다. 같은 단계가 만나면 자동으로 합쳐져요.',
    score: '합쳐진 단계가 높을수록 더 많은 점수를 얻어요. 보드 위로 넘쳐 게임오버가 되면 현재 점수가 기록됩니다.',
    tip: '큰 캐릭터를 한쪽에 몰아두고 다음 합성을 위한 공간을 남겨두세요.',
  },
  goalkeeper: {
    title: '골키퍼 게임', summary: '두 명이 공격수와 골키퍼를 번갈아 맡아 방향을 맞히는 심리전이에요.',
    control: '공격수와 골키퍼 모두 왼쪽 또는 오른쪽을 선택하세요. 두 선택이 공개된 뒤 다음 슛으로 넘어갑니다. 한 턴은 10번입니다.',
    score: '공격수가 고른 방향과 골키퍼가 고른 방향이 다르면 공격수에게 +1골, 같으면 선방으로 0골입니다. 양쪽 모두 공격을 한 뒤 골 수가 높은 사람이 승리합니다.',
    tip: '상대가 직전에 선택한 방향을 기억하고 다음 선택을 바꿔보세요.',
  },
  foodroulette: {
    title: '메뉴추천 룰렛', summary: '무엇을 먹을지 고민될 때 100가지 메뉴 중 하나를 골라줘요.',
    control: '룰렛 돌리기 버튼을 누르면 방 안의 모든 사람에게 같은 추천 메뉴가 표시됩니다. 누구나 여러 번 다시 돌릴 수 있어요.',
    score: '점수 없이 친구들과 짧게 즐기는 게임입니다. 마음에 드는 메뉴가 나올 때까지 돌려보세요.',
    tip: '결과가 마음에 들면 바로 오늘의 메뉴로 결정해보세요!',
  },
  band: {
    title: '합주 게임', summary: '참가자가 악기를 나눠 맡아 브라우저에서 함께 연주해요.',
    control: '피아노는 건반, 드럼은 패드, 일렉·베이스는 코드 버튼을 누르세요. 보컬은 마이크를 켜면 다른 참가자에게 들립니다.',
    score: '점수 없이 합주를 즐기는 게임입니다. 녹음 시작 후 연주를 끝내면 오디오 파일로 저장할 수 있어요.',
    tip: '각자 다른 악기를 선택하면 더 풍성한 합주가 됩니다.',
  },
};
const MAFIA_PLAYER_COUNT = 6;
const LIAR_MIN_PLAYERS = 4;
const DRAWING_MIN_PLAYERS = 3;
const COFFEE_MIN_PLAYERS = 3;
const SCORE_GAME_MIN_PLAYERS = 2;
const BALANCE_MIN_PLAYERS = 1;
const SSAFY_MIN_PLAYERS = 1;
const GROUP_MAX_PLAYERS = 12;
const TUG_TEAM_MAX = 6;
const LIVE_SCORE_MODES = new Set(['wordchain', 'drawing', 'memory', 'subway', 'quiz', 'csquiz', 'horse', 'songquiz', 'balance', 'fashion', 'ssafy', 'goalkeeper']);

function groupMinPlayers(mode) {
  if (mode === 'liar') return LIAR_MIN_PLAYERS;
  if (mode === 'drawing') return DRAWING_MIN_PLAYERS;
  if (mode === 'coffee') return COFFEE_MIN_PLAYERS;
  if (mode === 'balance') return BALANCE_MIN_PLAYERS;
  if (mode === 'ssafy') return SSAFY_MIN_PLAYERS;
  if (mode === 'foodroulette') return 1;
  return SCORE_GAME_MIN_PLAYERS;
}
let selectedChainDurationSec = 120;

let state = {
  account: null, // { nickname, totalScore, gamesPlayed }
  selectedMode: 'mafia',
  roomCode: null,
  myId: null,
  myRole: null,
  myWord: null, // { isLiar, category, word }
  isHost: false,
  players: [],
  phase: 'entry',
  mode: 'mafia',
  quizItemCount: 0,
  friends: [],
  friendRequests: { incoming: [], outgoing: [] },
  leaderboard: [],
  personDbCount: 0,
  personDbRecent: [],
  fashionOutfit: {},
  ssafyPhotoCount: 0,
  isAdmin: false,
};

let countdownInterval = null;
let publicRoomRefreshTimer = null;
let ssafyAutoStart = false;
let entryRoomMode = true;

// ---------- view helpers ----------
const GAME_HELP_VIEW_MODES = {
  'view-wordchain': 'wordchain',
  'view-tug': 'tug',
  'view-songquiz': 'songquiz',
  'view-balance': 'balance',
  'view-fashion': 'fashion',
  'view-drawing': 'drawing',
  'view-memory': 'memory',
  'view-coffee': 'coffee',
  'view-subway': 'subway',
  'view-quiz-round': 'quiz',
  'view-stack': 'stack',
  'view-cs-round': 'csquiz',
  'view-horse-bet': 'horse',
  'view-horse-race': 'horse',
  'view-gukbap': 'gukbap',
  'view-ssafy': 'ssafy',
  'view-goalkeeper': 'goalkeeper',
  'view-foodroulette': 'foodroulette',
  'view-band': 'band',
};
const SHARED_SOCIAL_GAME_VIEWS = new Set(['view-role', 'view-night', 'view-day', 'view-vote', 'view-liar-turn', 'view-liar-guess']);

function isActiveGameView(viewId) {
  return Boolean(GAME_HELP_VIEW_MODES[viewId]) || SHARED_SOCIAL_GAME_VIEWS.has(viewId);
}

function renderGameHelp(viewId) {
  const panel = el('game-help-panel');
  if (!panel) return;
  const mode = GAME_HELP_VIEW_MODES[viewId]
    || (SHARED_SOCIAL_GAME_VIEWS.has(viewId) && ['mafia', 'liar'].includes(state.mode) ? state.mode : null);
  const help = GAME_HELP[mode];
  panel.classList.toggle('hidden', !help);
  if (!help) return;
  el('game-help-title').textContent = help.title;
  el('game-help-summary').textContent = help.summary;
  el('game-help-control').textContent = help.control;
  el('game-help-score').textContent = help.score;
  el('game-help-tip').textContent = `💡 ${help.tip}`;
}

function setFashionTheme(topic) {
  const text = String(topic || '');
  const theme = text.includes('메이크업') ? 'makeup'
    : text.includes('스타트업') ? 'startup'
      : text.includes('바캉스') ? 'vacation'
        : text.includes('레트로') ? 'retro'
          : text.includes('레드카펫') ? 'redcarpet'
            : text.includes('비 오는') ? 'rainy'
              : text.includes('우주') ? 'space'
                : text.includes('해커톤') ? 'hackathon'
                  : '';
  if (theme) document.body.dataset.fashionTheme = theme;
  else delete document.body.dataset.fashionTheme;
}

function showView(id) {
  document.querySelectorAll('.view').forEach(v => v.classList.add('hidden'));
  document.getElementById(id).classList.remove('hidden');
  document.body.classList.toggle('fashion-active', id === 'view-fashion');
  el('btn-game-leave').classList.toggle('hidden', !state.roomCode || !isActiveGameView(id));
  if (id === 'view-entry') {
    el('entry-title').textContent = MODE_LABEL[state.selectedMode] || MODE_LABEL.mafia;
    renderEntryPreview(state.selectedMode);
    if (entryRoomMode) startPublicRoomRefresh();
    else stopPublicRoomRefresh();
  } else {
    stopPublicRoomRefresh();
  }
  document.body.classList.add('bg-hero');
  if (id !== 'view-stack') {
    el('stack-key-guide').classList.add('hidden');
    stackIsMyTurn = false;
    if (typeof stopStackOscillation === 'function') stopStackOscillation();
  }
  if (id !== 'view-horse-bet' && id !== 'view-horse-race') {
    el('horse-leaderboard').classList.add('hidden');
  }
  if (id !== 'view-fashion') delete document.body.dataset.fashionTheme;
  renderGameHelp(id);
  renderLiveScorePanel();
}

function el(id) { return document.getElementById(id); }

let modalConfirmAction = null;

function showModal(title, message) {
  modalConfirmAction = null;
  el('modal-title').textContent = title;
  el('modal-message').textContent = message;
  el('btn-modal-confirm').textContent = '네';
  el('btn-close-modal').textContent = '확인';
  el('btn-modal-confirm').classList.add('hidden');
  el('app-modal').classList.remove('hidden');
}

function showConfirmModal(title, message, onConfirm) {
  modalConfirmAction = onConfirm;
  el('modal-title').textContent = title;
  el('modal-message').textContent = message;
  el('btn-modal-confirm').textContent = '네';
  el('btn-close-modal').textContent = '아니오';
  el('btn-modal-confirm').classList.remove('hidden');
  el('app-modal').classList.remove('hidden');
}

function hideModal() {
  modalConfirmAction = null;
  el('app-modal').classList.add('hidden');
}

function nonNegativeScore(value) {
  return Math.max(0, Number(value) || 0);
}

function hideLiveScorePanel() {
  const panel = el('live-score-panel');
  if (!panel) return;
  panel.classList.add('hidden');
  el('live-score-list').innerHTML = '';
  el('live-score-mode').textContent = '';
}

function renderLiveScorePanel() {
  const panel = el('live-score-panel');
  if (!panel) return;
  const activeView = document.querySelector('.view:not(.hidden)')?.id || '';
  const show = !!state.roomCode
    && state.phase !== 'result'
    && LIVE_SCORE_MODES.has(state.mode)
    && activeView !== 'view-lobby'
    && activeView !== 'view-entry'
    && activeView !== 'view-result';
  if (!show) {
    hideLiveScorePanel();
    return;
  }
  panel.classList.remove('hidden');

  el('live-score-mode').textContent = MODE_LABEL[state.mode] || '';
  const list = el('live-score-list');
  list.innerHTML = '';
  [...state.players]
    .sort((a, b) => nonNegativeScore(b.score) - nonNegativeScore(a.score))
    .forEach((player, index) => {
      const item = document.createElement('li');
      item.classList.toggle('me', player.id === state.myId);
      const rank = document.createElement('span');
      rank.className = 'live-score-rank';
      rank.textContent = `${index + 1}.`;
      const name = document.createElement('span');
      name.className = 'live-score-name';
      name.textContent = player.name;
      const score = document.createElement('span');
      score.className = 'live-score-points';
      score.textContent = `${nonNegativeScore(player.score)}점`;
      item.append(rank, name, score);
      list.appendChild(item);
    });
}

function renderAvatar(target, profile, sizeClass = '') {
  target.className = `avatar ${sizeClass}`.trim();
  target.innerHTML = '';
  if (profile?.profileImage) {
    const image = document.createElement('img');
    image.src = profile.profileImage;
    image.alt = `${profile.nickname || '사용자'} 프로필 사진`;
    target.appendChild(image);
  } else {
    target.textContent = (profile?.nickname || '?').slice(0, 1).toUpperCase();
  }
}

function renderEntryPreview(mode) {
  const preview = MODE_PREVIEW[mode] || MODE_PREVIEW.mafia;
  el('entry-preview-icon').textContent = preview.icon;
  el('entry-preview-name').textContent = preview.name;
  el('entry-preview-description').textContent = preview.description;
  const stats = el('entry-preview-stats');
  stats.innerHTML = '';
  Object.entries(preview.ratings).forEach(([label, score]) => {
    const row = document.createElement('div');
    row.className = 'entry-rating-row';
    const name = document.createElement('span');
    name.className = 'entry-rating-label';
    name.textContent = label;
    const stars = document.createElement('span');
    stars.className = 'entry-rating-stars';
    stars.setAttribute('aria-label', `${label} ${score}점 / 5점`);
    stars.textContent = '★'.repeat(score) + '☆'.repeat(5 - score);
    row.append(name, stars);
    stats.appendChild(row);
  });
}

function renderProfileSummary(profile = state.account) {
  if (!profile) return;
  renderAvatar(el('home-profile-avatar'), profile, 'avatar-large');
  el('home-profile-name').textContent = profile.nickname || '-';
  el('home-profile-rank').textContent = `순위 ${profile.rank || '-'}위`;
  el('home-profile-score').textContent = `누적 점수 ${nonNegativeScore(profile.totalScore)}점`;
  renderAvatar(el('profile-avatar-preview'), profile, 'avatar-xl');
  el('profile-nickname').value = profile.nickname || '';
  el('profile-rank').textContent = `순위 ${profile.rank || '-'}위`;
  el('profile-score').textContent = `누적 점수 ${nonNegativeScore(profile.totalScore)}점`;
  el('profile-games').textContent = `플레이 ${profile.gamesPlayed || 0}회`;
}

function applyProfile(profile) {
  state.account = { ...state.account, ...profile, totalScore: nonNegativeScore(profile.totalScore) };
  el('mode-select-greeting').textContent = `${profile.nickname}님 환영합니다! (누적 점수: ${nonNegativeScore(profile.totalScore)})`;
  renderProfileSummary(state.account);
}

function renderPlayerList(target, players, { showDead = true } = {}) {
  target.innerHTML = '';
  players.forEach(p => {
    const li = document.createElement('li');
    if (!p.alive && showDead) li.classList.add('dead');
    li.innerHTML = `<span>${p.name}${p.isHost ? '<span class="tag-host">방장</span>' : ''}</span><span>${p.alive === false ? '사망' : ''}</span>`;
    target.appendChild(li);
  });
}

function renderTugTeamSetup(players) {
  const lists = {
    left: el('tug-left-lobby'),
    right: el('tug-right-lobby'),
  };
  const counts = {
    left: el('tug-left-count'),
    right: el('tug-right-count'),
  };
  Object.values(lists).forEach(list => { list.innerHTML = ''; });

  players.forEach(player => {
    const team = player.tugTeam || 'left';
    const chip = document.createElement('div');
    chip.className = `tug-lobby-player${player.id === state.myId ? ' is-me' : ''}`;
    chip.textContent = `${player.name}${player.isHost ? ' · 방장' : ''}${player.id === state.myId ? ' · 나' : ''}`;
    chip.draggable = player.id === state.myId;
    chip.title = player.id === state.myId ? '이 이름을 드래그해서 팀을 바꿀 수 있어요.' : '다른 참가자의 팀은 직접 바꿀 수 없어요.';
    if (player.id === state.myId) {
      chip.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/plain', player.id);
        event.dataTransfer.effectAllowed = 'move';
      });
    }
    (lists[team] || lists.left).appendChild(chip);
  });

  const leftCount = players.filter(player => player.tugTeam === 'left').length;
  const rightCount = players.filter(player => player.tugTeam === 'right').length;
  counts.left.textContent = `${leftCount}/${TUG_TEAM_MAX}`;
  counts.right.textContent = `${rightCount}/${TUG_TEAM_MAX}`;
}

document.querySelectorAll('.tug-team-zone').forEach(zone => {
  zone.addEventListener('dragover', event => {
    event.preventDefault();
    zone.classList.add('drag-over');
    event.dataTransfer.dropEffect = 'move';
  });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
  zone.addEventListener('drop', event => {
    event.preventDefault();
    zone.classList.remove('drag-over');
    const playerId = event.dataTransfer.getData('text/plain');
    const team = zone.dataset.tugTeam;
    if (!playerId || !team) return;
    socket.emit('tug_team_move', { playerId, team }, result => {
      if (result?.error === 'TUG_TEAM_FULL') showModal('팀 이동 불가', '한 팀은 최대 6명까지 들어갈 수 있어요.');
      else if (result?.error) showModal('팀 이동 불가', '내 이름만 원하는 팀으로 옮길 수 있어요.');
    });
  });
});

function startCountdown(displayEl, durationMs, onEnd) {
  if (countdownInterval) clearInterval(countdownInterval);
  const endAt = Date.now() + durationMs;
  function tick() {
    const remain = Math.max(0, endAt - Date.now());
    const s = Math.ceil(remain / 1000);
    displayEl.textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
    if (remain <= 0) {
      clearInterval(countdownInterval);
      onEnd?.();
    }
  }
  tick();
  countdownInterval = setInterval(tick, 250);
}

function selectedRoomVisibility() {
  return document.querySelector('input[name="room-visibility"]:checked')?.value === 'public' ? 'public' : 'private';
}

function renderPublicRooms(rooms = []) {
  const list = el('public-room-list');
  const empty = el('public-room-empty');
  if (!list || !empty) return;
  const filtered = rooms.filter(room => room.mode === state.selectedMode);
  list.innerHTML = '';
  empty.classList.toggle('hidden', filtered.length > 0);
  filtered.forEach(room => {
    const item = document.createElement('li');
    item.className = 'public-room-item';
    const info = document.createElement('div');
    info.className = 'public-room-info';
    const title = document.createElement('strong');
    title.textContent = `#${room.code} · ${room.hostName}님의 방`;
    const count = document.createElement('span');
    const capacity = room.maxPlayers ? `${room.playerCount}/${room.maxPlayers}명` : `${room.playerCount}명`;
    count.textContent = room.phase === 'band_playing' ? `${capacity} · 합주 중` : `${capacity} · 대기 중`;
    info.append(title, count);
    const join = document.createElement('button');
    join.type = 'button';
    join.className = 'small-btn public-room-join';
    join.textContent = '입장';
    join.addEventListener('click', () => requestJoinRoom(room.code));
    item.append(info, join);
    list.appendChild(item);
  });
}

function loadPublicRooms() {
  socket.emit('get_public_rooms', { mode: state.selectedMode }, result => {
    if (!result?.error) renderPublicRooms(result.rooms || []);
  });
}

function startPublicRoomRefresh() {
  stopPublicRoomRefresh();
  loadPublicRooms();
  publicRoomRefreshTimer = setInterval(loadPublicRooms, 5000);
}

function stopPublicRoomRefresh() {
  if (publicRoomRefreshTimer) clearInterval(publicRoomRefreshTimer);
  publicRoomRefreshTimer = null;
}

// ---------- mode select ----------
document.querySelectorAll('[data-mode]').forEach(button => {
  button.addEventListener('click', () => selectMode(button.dataset.mode));
});

function prepareSsafyEntry(mode) {
  const isSsafy = mode === 'ssafy';
  const isSoloChoice = ['balance', 'foodroulette'].includes(mode);
  entryRoomMode = !isSsafy && !isSoloChoice;
  el('standard-entry-room-card').classList.toggle('hidden', isSsafy || isSoloChoice);
  el('ssafy-entry-card').classList.toggle('hidden', !isSsafy);
  el('foodroulette-entry-card').classList.toggle('hidden', !isSoloChoice);
  const setup = el('ssafy-upload-area');
  const target = isSsafy ? el('ssafy-entry-content') : el('ssafy-upload-placeholder');
  if (setup && target && setup.parentElement !== target) target.appendChild(setup);
  if (setup) setup.classList.toggle('hidden', !isSsafy);
  if (isSsafy) {
    el('ssafy-entry-status').textContent = state.ssafyPhotoCount >= 11
      ? '사진 준비 완료! 혼자 바로 시작할 수 있어요.'
      : `사진 ${state.ssafyPhotoCount}/11단계를 준비하면 시작할 수 있어요.`;
    el('btn-ssafy-entry-start').disabled = state.ssafyPhotoCount < 11;
    socket.emit('ssafy_get_photos', payload => {
      if (payload?.photos) renderSsafyLobbyPhotos(payload.photos);
    });
  }
  if (isSoloChoice) {
    const isBalance = mode === 'balance';
    el('solo-choice-icon').textContent = isBalance ? '⚖️' : '🎰';
    el('solo-choice-title').textContent = MODE_LABEL[mode];
    el('solo-choice-description').textContent = isBalance
      ? '혼자 연습하거나 친구들과 선택을 비교할 수 있어요.'
      : '혼자 추천받거나 친구들과 메뉴를 함께 골라보세요.';
    el('btn-foodroulette-entry-start').textContent = isBalance ? '혼자하기' : '혼자하기';
  }
}

el('btn-back-mode').addEventListener('click', () => {
  ssafyAutoStart = false;
  prepareSsafyEntry('');
  showView('view-mode-select');
});

function selectMode(mode) {
  if (!MODE_LABEL[mode]) return;
  state.selectedMode = mode;
  state.mode = mode;
  prepareSsafyEntry(mode);
  el('entry-title').textContent = MODE_LABEL[mode];
  renderEntryPreview(mode);
  el('entry-error').textContent = '';
  el('chain-duration-row').classList.toggle('hidden', mode !== 'wordchain');
  showView('view-entry');
}

document.querySelectorAll('.chain-duration-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    selectedChainDurationSec = Number(btn.dataset.sec);
    document.querySelectorAll('.chain-duration-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
  });
});

// ---------- entry ----------
el('btn-quick-join').addEventListener('click', () => {
  const button = el('btn-quick-join');
  button.disabled = true;
  socket.emit('quick_join_preview', preview => {
    button.disabled = false;
    if (preview.error) return showModal('빠른 참여 실패', errMsg(preview.error));
    if (preview.available === false) return showModal('빠른 참여 불가', '지금은 빠른 참여 할 수 있는 방이 없습니다.');
    const gameName = MODE_LABEL[preview.mode] || '게임';
    showConfirmModal('빠른 참여', `${gameName}입니다. 참여하시겠습니까?`, () => {
      socket.emit('quick_join', preview, result => {
        if (result.error) return showModal('빠른 참여 실패', errMsg(result.error));
        state.roomCode = result.code;
        state.myId = result.playerId;
        state.mode = result.mode;
        state.selectedMode = result.mode;
        showView('view-lobby');
      });
    });
  });
});

el('btn-create').addEventListener('click', () => {
  socket.emit('create_room', {
    mode: state.selectedMode,
    chainDurationSec: selectedChainDurationSec,
    isPublic: selectedRoomVisibility() === 'public',
  }, res => {
    if (res.error) return (el('entry-error').textContent = errMsg(res.error));
    state.roomCode = res.code;
    state.myId = res.playerId;
    state.mode = res.mode;
    showView('view-lobby');
  });
});

el('btn-ssafy-entry-start').addEventListener('click', () => {
  if (state.ssafyPhotoCount < 11) return;
  const button = el('btn-ssafy-entry-start');
  button.disabled = true;
  ssafyAutoStart = true;
  socket.emit('create_room', { mode: 'ssafy', isPublic: false }, res => {
    if (res.error) {
      ssafyAutoStart = false;
      button.disabled = false;
      return (el('ssafy-entry-status').textContent = errMsg(res.error));
    }
    state.roomCode = res.code;
    state.myId = res.playerId;
    state.mode = res.mode;
    socket.emit('start_game');
  });
});

function startSoloEntryGame(mode, button) {
  button.disabled = true;
  ssafyAutoStart = true;
  socket.emit('create_room', { mode, isPublic: false }, res => {
    if (res.error) {
      ssafyAutoStart = false;
      button.disabled = false;
      return (el('entry-error').textContent = errMsg(res.error));
    }
    state.roomCode = res.code;
    state.myId = res.playerId;
    state.mode = res.mode;
    socket.emit('start_game');
  });
}

el('btn-foodroulette-entry-start').addEventListener('click', () => {
  const button = el('btn-foodroulette-entry-start');
  startSoloEntryGame(state.selectedMode, button);
});

el('btn-solo-mode-group').addEventListener('click', () => {
  entryRoomMode = true;
  el('foodroulette-entry-card').classList.add('hidden');
  el('standard-entry-room-card').classList.remove('hidden');
  startPublicRoomRefresh();
});

el('btn-refresh-public-rooms').addEventListener('click', loadPublicRooms);
socket.on('public_rooms_update', rooms => {
  if (document.querySelector('#view-entry:not(.hidden)')) renderPublicRooms(rooms || []);
});

function requestJoinRoom(code, onError) {
  socket.emit('join_room', { code }, res => {
    if (res.error) {
      if (onError) return onError(errMsg(res.error));
      return (el('entry-error').textContent = errMsg(res.error));
    }
    state.roomCode = res.code;
    state.myId = res.playerId;
    state.mode = res.mode;
    showView('view-lobby');
  });
}

el('btn-join').addEventListener('click', () => {
  const code = el('code-input').value.trim();
  if (!code) return (el('entry-error').textContent = '방 코드를 입력하세요.');
  requestJoinRoom(code);
});

function errMsg(code) {
  return {
    ROOM_FULL: '방이 가득 찼습니다.',
    NAME_TAKEN: '이미 사용 중인 닉네임입니다.',
    ROOM_NOT_FOUND: '존재하지 않는 방입니다.',
    GAME_IN_PROGRESS: '이미 게임이 진행 중입니다.',
    NOT_LOGGED_IN: '로그인이 필요합니다.',
    ALREADY_IN_ROOM: '이미 다른 방에 참가 중입니다.',
    QUICK_JOIN_UNAVAILABLE: '지금은 빠른 참여 할 수 있는 방이 없습니다.',
  }[code] || '오류가 발생했습니다.';
}

// ---------- login ----------
const LOGIN_STORAGE_KEY = 'party_game_login';
const THEME_STORAGE_KEY = 'party_game_theme';
const THEME_LABELS = {
  dark: '☀️ 화이트모드',
  light: '🌙 다크모드',
  ide: 'IDE 모드',
  google: 'Google 모드',
};

function applyTheme(theme) {
  const nextTheme = Object.prototype.hasOwnProperty.call(THEME_LABELS, theme) ? theme : 'dark';
  document.body.classList.toggle('light-mode', nextTheme === 'light');
  document.body.dataset.uiTheme = nextTheme;
  el('btn-theme-toggle').textContent = THEME_LABELS[nextTheme];
  document.querySelectorAll('.theme-option').forEach(option => {
    const selected = option.dataset.theme === nextTheme;
    option.classList.toggle('selected', selected);
    option.setAttribute('aria-pressed', String(selected));
  });
  try { localStorage.setItem(THEME_STORAGE_KEY, nextTheme); } catch (e) { /* ignore */ }
}

function loadTheme() {
  try { return localStorage.getItem(THEME_STORAGE_KEY) || 'dark'; } catch (e) { return 'dark'; }
}

applyTheme(loadTheme());
const themeToggle = el('btn-theme-toggle');
const themePicker = el('theme-picker');
themeToggle.addEventListener('click', () => {
  const isOpen = themePicker.classList.toggle('hidden');
  themeToggle.setAttribute('aria-expanded', String(!isOpen));
});
document.querySelectorAll('.theme-option').forEach(option => {
  option.addEventListener('click', () => {
    applyTheme(option.dataset.theme);
    themePicker.classList.add('hidden');
    themeToggle.setAttribute('aria-expanded', 'false');
  });
});
document.addEventListener('click', event => {
  if (!event.target.closest('.theme-controls')) {
    themePicker.classList.add('hidden');
    themeToggle.setAttribute('aria-expanded', 'false');
  }
});

// 좁은 화면에서는 게임 메뉴를 우선 노출하고, 좌우 보조 패널은 아이콘으로 열고 닫습니다.
[
  ['btn-home-profile-toggle', 'home-profile-panel'],
  ['btn-home-ranking-toggle', 'home-ranking-panel'],
  ['btn-home-tools-toggle', 'ranking-utility-buttons'],
  ['btn-home-notice-toggle', 'home-notice-board'],
].forEach(([buttonId, panelId]) => {
  const button = el(buttonId);
  const panel = el(panelId);
  if (!button || !panel) return;
  button.addEventListener('click', () => {
    const isOpen = panel.classList.toggle('home-side-panel-open');
    button.setAttribute('aria-expanded', String(isOpen));
    button.classList.toggle('active', isOpen);
  });
});

function updateNotificationButton() {
  const button = el('btn-notification-toggle');
  if (!button) return;
  if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    button.textContent = '🔒 HTTPS 필요';
    button.title = '크롬 알림은 HTTPS 또는 localhost에서만 사용할 수 있어요.';
    return;
  }
  if (!('Notification' in window)) {
    button.textContent = '🔕 알림 미지원';
    button.disabled = true;
    button.title = '이 브라우저에서는 알림을 지원하지 않아요.';
    return;
  }
  if (Notification.permission === 'granted') {
    button.textContent = '🔔 알림 켜짐';
    button.title = '다른 크롬 페이지를 보고 있어도 친구 초대 알림을 받아요.';
  } else if (Notification.permission === 'denied') {
    button.textContent = '🔕 알림 차단됨';
    button.title = '크롬 사이트 설정에서 알림 권한을 허용해야 해요.';
  } else {
    button.textContent = '🔔 알림 켜기';
    button.title = '다른 크롬 페이지를 보고 있어도 초대 알림을 받아요.';
  }
}

function requestBrowserNotifications() {
  if (!('Notification' in window)) {
    return showModal('알림을 지원하지 않아요', '현재 브라우저에서는 시스템 알림을 사용할 수 없어요.');
  }
  if (!window.isSecureContext && location.hostname !== 'localhost' && location.hostname !== '127.0.0.1') {
    return showModal('보안 연결이 필요해요', '크롬 알림은 HTTPS 사이트 또는 localhost에서만 허용됩니다. 현재 주소가 사설 IP라면 localhost:3000으로 접속하거나 HTTPS로 배포해주세요.');
  }
  if (Notification.permission === 'denied') {
    return showModal('알림이 차단되어 있어요', '주소창 왼쪽 사이트 설정 → 알림 → 허용으로 바꾼 뒤 페이지를 새로고침해주세요. 회사·학교 PC에서 “관리자가 설정함”이라고 나오면 브라우저 정책이라 사이트에서 해제할 수 없습니다.');
  }
  Notification.requestPermission().then(permission => {
    updateNotificationButton();
    if (permission === 'granted') {
      showModal('알림 켜짐', '다른 크롬 페이지를 보고 있어도 친구 요청과 방 초대 알림을 받을 수 있어요.');
    }
  }).catch(() => showModal('알림 설정 실패', '브라우저의 알림 권한을 확인해주세요.'));
}

function sendBrowserNotification(title, body) {
  if (!document.hidden || !('Notification' in window) || Notification.permission !== 'granted') return;
  const notification = new Notification(title, { body, tag: 'party-game-notification' });
  notification.onclick = () => {
    window.focus();
    notification.close();
  };
}

updateNotificationButton();
el('btn-notification-toggle').addEventListener('click', requestBrowserNotifications);

function saveLoginToStorage(nickname, phone) {
  try {
    localStorage.setItem(LOGIN_STORAGE_KEY, JSON.stringify({ nickname, phone }));
  } catch (e) { /* localStorage unavailable — ignore */ }
}

function loadLoginFromStorage() {
  try {
    const raw = localStorage.getItem(LOGIN_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function doLogin(nickname, phone) {
  socket.emit('login', { nickname, phone }, res => {
    if (res.error) return (el('login-error').textContent = res.error);
    state.account = { ...res, totalScore: nonNegativeScore(res.totalScore) };
    state.isAdmin = Boolean(res.isAdmin);
    el('btn-admin-open').classList.toggle('hidden', !state.isAdmin);
    saveLoginToStorage(nickname, phone);
    renderProfileSummary(res);
    socket.emit('get_friends', result => {
      if (!result.error) renderFriendList(result.friends);
    });
    socket.emit('get_friend_requests', result => {
      if (!result.error) renderFriendRequests(result);
    });
    loadNotices();
    showView('view-mode-select');
  });
}

function renderPersonDb(data = {}) {
  state.personDbCount = Number(data.count) || 0;
  state.personDbRecent = Array.isArray(data.recent) ? data.recent : [];
  const count = el('person-db-count');
  if (count) count.textContent = `등록 ${state.personDbCount}명`;
  const recentWrap = document.querySelector('.person-db-recent-wrap');
  if (recentWrap) recentWrap.classList.toggle('hidden', !data.canView);
  const recent = el('person-db-recent');
  if (!recent) return;
  recent.innerHTML = '';
  if (state.personDbRecent.length === 0) {
    recent.textContent = '아직 등록된 인물이 없어요.';
    return;
  }
  state.personDbRecent.forEach(person => {
    const tag = document.createElement('span');
    tag.className = 'person-db-tag';
    tag.textContent = `${person.name} · ${person.addedBy}`;
    recent.appendChild(tag);
  });
}

let personDbImageDraft = null;
el('person-db-image-input').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const edge = 512;
      const scale = Math.min(edge / image.width, edge / image.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      personDbImageDraft = canvas.toDataURL('image/jpeg', 0.82);
      el('person-db-file-name').textContent = `${file.name} 선택됨`;
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

el('btn-person-db-add').addEventListener('click', () => {
  const name = el('person-db-name-input').value.trim();
  const message = el('person-db-message');
  message.textContent = '';
  if (!name) return (message.textContent = '인물 이름을 입력하세요.');
  if (!personDbImageDraft) return (message.textContent = '사진을 선택하세요.');
  const button = el('btn-person-db-add');
  button.disabled = true;
  socket.emit('add_person_db', { name, imageDataUrl: personDbImageDraft }, result => {
    button.disabled = false;
    if (result.error) {
      message.textContent = personDbErrMsg(result.error);
      return;
    }
    el('person-db-name-input').value = '';
    el('person-db-image-input').value = '';
    el('person-db-file-name').textContent = '선택된 사진 없음';
    personDbImageDraft = null;
    message.textContent = '인물이 공용 DB에 추가됐어요!';
  });
});

el('btn-open-person-db').addEventListener('click', () => {
  el('person-db-message').textContent = '';
  showView('view-person-db');
});

el('btn-person-db-back').addEventListener('click', () => showView('view-mode-select'));

el('btn-feedback-open').addEventListener('click', () => {
  el('feedback-message').textContent = '';
  showView('view-feedback');
  el('feedback-title').focus();
});

el('btn-feedback-back').addEventListener('click', () => showView('view-mode-select'));

el('btn-feedback-cancel').addEventListener('click', () => {
  el('feedback-title').value = '';
  el('feedback-content').value = '';
  el('feedback-message').textContent = '';
  showView('view-mode-select');
});

el('btn-feedback-submit').addEventListener('click', () => {
  const title = el('feedback-title').value.trim();
  const content = el('feedback-content').value.trim();
  const message = el('feedback-message');
  message.textContent = '';
  if (!title) return (message.textContent = '제목을 입력하세요.');
  if (!content) return (message.textContent = '내용을 입력하세요.');

  const button = el('btn-feedback-submit');
  button.disabled = true;
  socket.emit('submit_feedback', { title, content }, result => {
    button.disabled = false;
    if (result.error) {
      message.textContent = feedbackErrMsg(result.error);
      return;
    }
    el('feedback-title').value = '';
    el('feedback-content').value = '';
    message.textContent = '소중한 피드백이 전송됐어요. 감사합니다!';
  });
});

function renderAdminData(data = {}) {
  const people = Array.isArray(data.people) ? data.people : [];
  const feedback = Array.isArray(data.feedback) ? data.feedback : [];
  el('admin-person-count').textContent = `${people.length}명`;
  el('admin-feedback-count').textContent = `${feedback.length}건`;

  const personList = el('admin-person-list');
  personList.innerHTML = '';
  if (!people.length) {
    personList.textContent = '등록된 인물이 없습니다.';
  } else {
    people.forEach(person => {
      const item = document.createElement('div');
      item.className = 'admin-person-item';
      if (person.imageDataUrl) {
        const image = document.createElement('img');
        image.src = person.imageDataUrl;
        image.alt = person.name;
        item.appendChild(image);
      }
      const text = document.createElement('div');
      const name = document.createElement('strong');
      name.textContent = person.name;
      const meta = document.createElement('span');
      meta.textContent = `${person.addedBy || '사용자'} · ${formatNoticeDate(person.createdAt)}`;
      text.append(name, meta);
      item.appendChild(text);
      personList.appendChild(item);
    });
  }

  const feedbackList = el('admin-feedback-list');
  feedbackList.innerHTML = '';
  if (!feedback.length) {
    feedbackList.textContent = '등록된 피드백이 없습니다.';
  } else {
    feedback.forEach(item => {
      const article = document.createElement('article');
      article.className = 'admin-feedback-item';
      const heading = document.createElement('div');
      heading.className = 'admin-feedback-heading';
      const title = document.createElement('strong');
      title.textContent = item.title || '제목 없음';
      const date = document.createElement('time');
      date.textContent = formatNoticeDate(item.createdAt);
      heading.append(title, date);
      const meta = document.createElement('small');
      meta.textContent = `${item.nickname || '사용자'} · ${item.phone || ''}`;
      const content = document.createElement('p');
      content.textContent = item.content || '';
      article.append(heading, meta, content);
      feedbackList.appendChild(article);
    });
  }
}

function loadAdminData() {
  if (!state.isAdmin) return showModal('관리자 전용', '관리자 계정만 확인할 수 있어요.');
  socket.emit('get_admin_data', result => {
    if (result?.error) return showModal('관리자 데이터 확인 실패', result.error);
    renderAdminData(result);
  });
}

el('btn-admin-open').addEventListener('click', () => {
  if (!state.isAdmin) return;
  showView('view-admin');
  loadAdminData();
});
el('btn-admin-back').addEventListener('click', () => showView('view-mode-select'));
el('btn-admin-refresh').addEventListener('click', loadAdminData);
el('btn-admin-notice-submit').addEventListener('click', () => {
  const title = el('admin-notice-title').value.trim();
  const content = el('admin-notice-content').value.trim();
  const message = el('admin-notice-message');
  message.textContent = '';
  if (!title) return (message.textContent = '공지 제목을 입력해주세요.');
  if (!content) return (message.textContent = '공지 내용을 입력해주세요.');
  const button = el('btn-admin-notice-submit');
  button.disabled = true;
  socket.emit('submit_notice', { title, content }, result => {
    button.disabled = false;
    if (result?.error) return (message.textContent = noticeErrMsg(result.error));
    el('admin-notice-title').value = '';
    el('admin-notice-content').value = '';
    message.textContent = '공지가 등록됐어요.';
    loadAdminData();
  });
});

function formatNoticeDate(timestamp) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

let latestNoticeId = null;
let noticeCache = [];
let noticeDetailReturnView = 'view-mode-select';

function openNoticeDetail(notice, returnView = 'view-mode-select') {
  if (!notice) return;
  noticeDetailReturnView = returnView;
  el('notice-detail-title').dataset.noticeId = notice.id || '';
  el('notice-detail-title').textContent = notice.title || '제목 없음';
  el('notice-detail-date').textContent = formatNoticeDate(notice.createdAt);
  el('notice-detail-meta').textContent = `작성자 ${notice.nickname || '사용자'}`;
  el('notice-detail-content').textContent = notice.content || '';
  renderNoticeComments(notice, 'notice-detail-comments-list');
  el('notice-detail-comment-input').value = '';
  el('notice-detail-comment-message').textContent = '';
  showView('view-notice-detail');
}

function createNoticeItem(notice, compact = false) {
  const article = document.createElement('article');
  article.className = `notice-item${compact ? ' notice-item-compact' : ''}`;
  const heading = document.createElement('div');
  heading.className = 'notice-item-heading';
  const title = document.createElement('h2');
  title.textContent = notice.title || '제목 없음';
  const date = document.createElement('time');
  const dateValue = new Date(notice.createdAt);
  if (!Number.isNaN(dateValue.getTime())) date.dateTime = dateValue.toISOString();
  date.textContent = formatNoticeDate(notice.createdAt);
  heading.append(title, date);
  const meta = document.createElement('p');
  meta.className = 'notice-item-meta';
  meta.textContent = `작성자 ${notice.nickname || '사용자'}`;
  const content = document.createElement('p');
  content.className = 'notice-item-content';
  content.textContent = notice.content || '';
  article.append(heading, meta, content);
  article.tabIndex = 0;
  article.setAttribute('role', 'button');
  article.addEventListener('click', () => openNoticeDetail(notice, compact ? 'view-mode-select' : 'view-notices'));
  article.addEventListener('keydown', event => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      openNoticeDetail(notice, compact ? 'view-mode-select' : 'view-notices');
    }
  });
  return article;
}

function renderNoticeComments(notice, targetId = 'home-notice-comments-list') {
  const list = el(targetId);
  if (!list) return;
  list.innerHTML = '';
  const comments = notice?.comments || [];
  if (!comments.length) {
    const empty = document.createElement('p');
    empty.className = 'notice-empty';
    empty.textContent = notice ? '첫 댓글을 남겨보세요.' : '댓글을 작성할 공지사항이 없습니다.';
    list.appendChild(empty);
    return;
  }
  comments.slice(-30).forEach(comment => {
    const item = document.createElement('div');
    item.className = 'notice-comment-item';
    const author = document.createElement('strong');
    author.textContent = comment.nickname || '사용자';
    const content = document.createElement('span');
    content.textContent = comment.content || '';
    item.append(author, content);
    list.appendChild(item);
  });
}

function renderNoticeBoard(notices = []) {
  const ordered = Array.isArray(notices) ? notices : [];
  noticeCache = ordered;
  latestNoticeId = ordered[0]?.id || null;
  const lists = [el('home-notice-list'), el('notice-list')].filter(Boolean);
  lists.forEach(list => {
    list.innerHTML = '';
    if (!ordered.length) {
      const empty = document.createElement('p');
      empty.className = 'notice-empty';
      empty.textContent = '아직 등록된 공지사항이 없습니다.';
      list.appendChild(empty);
      return;
    }
    ordered.forEach(notice => list.appendChild(createNoticeItem(notice, list.id === 'home-notice-list')));
  });
  renderNoticeComments(ordered[0]);
  const selected = noticeCache.find(notice => notice.id === el('notice-detail-title')?.dataset.noticeId);
  if (selected && !el('view-notice-detail').classList.contains('hidden')) openNoticeDetail(selected, noticeDetailReturnView);
}

function loadNotices() {
  socket.emit('get_notices', renderNoticeBoard);
}

el('btn-home-notice-comment').addEventListener('click', () => {
  const input = el('home-notice-comment-input');
  const message = el('home-notice-comment-message');
  const content = input.value.trim();
  message.textContent = '';
  if (!latestNoticeId) return (message.textContent = '아직 댓글을 작성할 공지사항이 없어요.');
  if (!content) return (message.textContent = '댓글 내용을 입력해주세요.');
  const button = el('btn-home-notice-comment');
  button.disabled = true;
  socket.emit('submit_notice_comment', { noticeId: latestNoticeId, content }, result => {
    button.disabled = false;
    if (result?.error) {
      message.textContent = noticeErrMsg(result.error);
      return;
    }
    input.value = '';
    message.textContent = '댓글이 등록됐어요.';
  });
});

el('home-notice-comment-input').addEventListener('keydown', event => {
  if (event.key === 'Enter') el('btn-home-notice-comment').click();
});

el('btn-notice-detail-comment').addEventListener('click', () => {
  const input = el('notice-detail-comment-input');
  const message = el('notice-detail-comment-message');
  const content = input.value.trim();
  const noticeId = el('notice-detail-title').dataset.noticeId;
  message.textContent = '';
  if (!noticeId) return (message.textContent = '공지사항을 찾을 수 없어요.');
  if (!content) return (message.textContent = '댓글 내용을 입력해주세요.');
  const button = el('btn-notice-detail-comment');
  button.disabled = true;
  socket.emit('submit_notice_comment', { noticeId, content }, result => {
    button.disabled = false;
    if (result?.error) {
      message.textContent = noticeErrMsg(result.error);
      return;
    }
    input.value = '';
    message.textContent = '댓글이 등록됐어요.';
  });
});

el('notice-detail-comment-input').addEventListener('keydown', event => {
  if (event.key === 'Enter') el('btn-notice-detail-comment').click();
});

el('btn-notices-back').addEventListener('click', () => showView('view-mode-select'));
el('btn-notice-detail-back').addEventListener('click', () => showView(noticeDetailReturnView));

el('btn-notice-submit').addEventListener('click', () => {
  const title = el('notice-title').value.trim();
  const content = el('notice-content').value.trim();
  const message = el('notice-message');
  message.textContent = '';
  if (!title) return (message.textContent = '제목을 입력해주세요.');
  if (!content) return (message.textContent = '내용을 입력해주세요.');
  const button = el('btn-notice-submit');
  button.disabled = true;
  socket.emit('submit_notice', { title, content }, result => {
    button.disabled = false;
    if (result.error) {
      message.textContent = noticeErrMsg(result.error);
      return;
    }
    el('notice-title').value = '';
    el('notice-content').value = '';
    message.textContent = '공지사항이 등록됐습니다.';
  });
});

function noticeErrMsg(code) {
  return {
    INVALID_NOTICE_TITLE: '제목을 입력해주세요.',
    INVALID_NOTICE_CONTENT: '내용을 입력해주세요.',
    INVALID_NOTICE_COMMENT: '댓글 내용을 입력해주세요.',
    NOTICE_NOT_FOUND: '댓글을 작성할 공지사항을 찾을 수 없어요.',
    NOT_LOGGED_IN: '로그인이 필요해요.',
  }[code] || '공지사항 등록에 실패했어요.';
}

function feedbackErrMsg(code) {
  return {
    INVALID_FEEDBACK_TITLE: '제목을 입력하세요.',
    INVALID_FEEDBACK_CONTENT: '내용을 입력하세요.',
    NOT_LOGGED_IN: '로그인이 필요해요.',
  }[code] || '피드백 전송에 실패했어요.';
}

function personDbErrMsg(code) {
  return {
    INVALID_PERSON_NAME: '인물 이름을 입력하세요.',
    INVALID_PERSON_IMAGE: 'PNG, JPG, WEBP, GIF 사진만 등록할 수 있어요.',
    PERSON_IMAGE_TOO_LARGE: '사진 용량이 너무 커요. 더 작은 사진을 선택하세요.',
    PERSON_ALREADY_EXISTS: '같은 인물 사진이 이미 등록돼 있어요.',
    NOT_LOGGED_IN: '로그인이 필요해요.',
  }[code] || '인물 등록에 실패했어요.';
}

socket.on('person_db_update', data => {
  renderPersonDb(data);
  renderQuizItemCount();
});

socket.on('notice_update', renderNoticeBoard);

el('btn-login').addEventListener('click', () => {
  const nickname = el('login-nickname').value.trim();
  const phone = el('login-phone').value.trim();
  if (!nickname) return (el('login-error').textContent = '닉네임을 입력하세요.');
  if (!phone) return (el('login-error').textContent = '전화번호를 입력하세요.');
  doLogin(nickname, phone);
});

function logout() {
  socket.emit('logout');
  try { localStorage.removeItem(LOGIN_STORAGE_KEY); } catch (e) { /* ignore */ }
  state.account = null;
  state.isAdmin = false;
  el('btn-admin-open').classList.add('hidden');
  state.friends = [];
  state.friendRequests = { incoming: [], outgoing: [] };
  renderFriendList([]);
  renderFriendRequests(state.friendRequests);
  el('login-nickname').value = '';
  el('login-phone').value = '';
  showView('view-login');
}

el('btn-logout-main').addEventListener('click', logout);
el('btn-profile-back').addEventListener('click', () => showView('view-mode-select'));
el('btn-open-profile').addEventListener('click', () => {
  profileImageDraft = null;
  el('profile-image-input').value = '';
  renderProfileSummary(state.account);
  el('profile-error').textContent = '';
  showView('view-profile');
});

function openFriendRequests() {
  showView('view-profile');
  setTimeout(() => el('friend-requests-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
}

el('btn-open-friend-requests').addEventListener('click', openFriendRequests);
el('btn-profile-friend-requests').addEventListener('click', openFriendRequests);
el('btn-modal-confirm').addEventListener('click', () => {
  const action = modalConfirmAction;
  hideModal();
  action?.();
});
el('btn-close-modal').addEventListener('click', hideModal);
el('app-modal').addEventListener('click', event => {
  if (event.target === el('app-modal')) hideModal();
});

let profileImageDraft = null;
el('profile-image-input').addEventListener('change', event => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const image = new Image();
    image.onload = () => {
      const edge = 256;
      const scale = Math.min(edge / image.width, edge / image.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      profileImageDraft = canvas.toDataURL('image/jpeg', 0.82);
      renderAvatar(el('profile-avatar-preview'), { ...state.account, profileImage: profileImageDraft }, 'avatar-xl');
    };
    image.src = reader.result;
  };
  reader.readAsDataURL(file);
});

el('btn-save-profile').addEventListener('click', () => {
  const nickname = el('profile-nickname').value.trim();
  if (!nickname) return (el('profile-error').textContent = '닉네임을 입력하세요.');
  el('profile-error').textContent = '';
  const payload = { nickname };
  if (profileImageDraft !== null) payload.profileImage = profileImageDraft;
  socket.emit('update_profile', payload, result => {
    if (result.error) return (el('profile-error').textContent = profileErrMsg(result.error));
    profileImageDraft = null;
    el('profile-image-input').value = '';
    applyProfile(result);
    showModal('프로필 저장 완료', '프로필 사진과 닉네임이 저장되었습니다.');
  });
});

function profileErrMsg(code) {
  return {
    NICKNAME_TAKEN: '이미 사용 중인 닉네임이에요.',
    INVALID_NICKNAME: '닉네임을 입력하세요.',
    INVALID_PROFILE_IMAGE: '지원하지 않는 프로필 사진 형식이에요.',
    PROFILE_IMAGE_TOO_LARGE: '프로필 사진 용량이 너무 커요.',
  }[code] || errMsg(code);
}

socket.on('connect', () => {
  const saved = loadLoginFromStorage();
  if (saved?.nickname && saved?.phone) {
    el('login-nickname').value = saved.nickname;
    el('login-phone').value = saved.phone;
    doLogin(saved.nickname, saved.phone);
  }
});

socket.on('room_resumed', data => {
  state.roomCode = data.code;
  state.myId = data.playerId;
  state.mode = data.mode;
  state.selectedMode = data.mode;
  state.phase = data.phase;
});

// ---------- global leaderboard ----------
function renderGlobalLeaderboard(list) {
  const leaderboard = (list || []).map(a => ({ ...a, totalScore: nonNegativeScore(a.totalScore) }));
  state.leaderboard = leaderboard;
  if (state.account) {
    const mine = state.leaderboard.find(a => a.nickname === state.account.nickname);
    if (mine) {
      state.account = { ...state.account, ...mine, rank: state.leaderboard.indexOf(mine) + 1 };
      renderProfileSummary(state.account);
    }
  }
  const ul = el('global-leaderboard-list');
  ul.innerHTML = '';
  if (leaderboard.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = '<span>아직 기록이 없어요.</span>';
    ul.appendChild(li);
    return;
  }
  leaderboard.forEach((a, idx) => {
    const li = document.createElement('li');
    const mine = state.account && a.nickname === state.account.nickname;
    if (mine) li.classList.add('me');
    const row = document.createElement('div');
    row.className = 'leaderboard-row';
    const player = document.createElement('div');
    player.className = 'leaderboard-player';
    const avatar = document.createElement('div');
    renderAvatar(avatar, a, '');
    player.appendChild(avatar);
    const name = document.createElement('span');
    name.className = 'leaderboard-name';
    name.textContent = `${idx + 1}위 ${a.nickname}`;
    const presence = document.createElement('span');
    presence.className = `online-dot${a.online ? '' : ' offline'}`;
    presence.title = a.online ? '온라인' : '오프라인';
    presence.setAttribute('aria-label', presence.title);
    player.append(name, presence);

    const actions = document.createElement('div');
    actions.className = 'leaderboard-actions';
    const score = document.createElement('span');
    score.className = 'leaderboard-score';
    score.textContent = `${a.totalScore}점`;
    actions.appendChild(score);
    if (!mine) {
      const alreadyFriend = state.friends.some(friend => friend.nickname === a.nickname);
      const requestPending = state.friendRequests.outgoing.some(friend => friend.nickname === a.nickname);
      const addButton = document.createElement('button');
      addButton.type = 'button';
      addButton.className = `friend-add-btn${alreadyFriend || requestPending ? ' added' : ''}`;
      addButton.textContent = alreadyFriend ? '친구' : requestPending ? '요청됨' : '+';
      addButton.title = alreadyFriend ? '친구' : requestPending ? '친구 요청 대기 중' : `${a.nickname}님에게 친구 요청 보내기`;
      addButton.setAttribute('aria-label', addButton.title);
      addButton.disabled = alreadyFriend || requestPending;
      addButton.addEventListener('click', () => {
        socket.emit('add_friend', { query: a.nickname }, result => {
          if (result.error) return showModal('친구 추가 실패', friendErrMsg(result.error));
          showModal('친구 요청 전송', `${a.nickname}님에게 친구 요청을 보냈어요.`);
        });
      });
      actions.appendChild(addButton);
    }
    row.append(player, actions);
    li.appendChild(row);
    ul.appendChild(li);
  });
}

socket.on('leaderboard_update', renderGlobalLeaderboard);

// ---------- friends ----------
function renderFriendList(friends = []) {
  state.friends = friends;
  if (state.leaderboard.length > 0) renderGlobalLeaderboard(state.leaderboard);
  renderLobbyFriendList(friends);
  const list = el('friend-list');
  list.innerHTML = '';
  if (friends.length === 0) {
    list.innerHTML = '<li><span class="friend-status offline">아직 친구가 없어요.</span></li>';
    return;
  }

  friends.forEach(friend => {
    const li = document.createElement('li');
    const meta = document.createElement('div');
    meta.className = 'friend-meta';
    const identity = document.createElement('div');
    identity.className = 'friend-identity';
    const avatar = document.createElement('div');
    renderAvatar(avatar, friend, '');
    identity.appendChild(avatar);
    const name = document.createElement('span');
    name.className = 'friend-name';
    name.textContent = friend.nickname;
    const presence = document.createElement('span');
    presence.className = `online-dot${friend.online ? '' : ' offline'}`;
    presence.title = friend.online ? '온라인' : '오프라인';
    presence.setAttribute('aria-label', presence.title);
    identity.append(name, presence);
    const status = document.createElement('span');
    status.className = `friend-status${friend.online ? '' : ' offline'}`;
    status.textContent = friend.online ? '🟢 온라인' : '⚪ 오프라인';
    meta.append(identity, status);
    li.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'friend-actions';
    const invite = document.createElement('button');
    invite.type = 'button';
    invite.textContent = '방 초대';
    const canInvite = friend.online && state.roomCode && state.phase === 'lobby';
    invite.disabled = !canInvite;
    invite.title = canInvite ? '현재 대기실로 초대' : '대기실에서 온라인 친구만 초대할 수 있어요.';
    invite.addEventListener('click', () => {
      socket.emit('invite_friend', { phone: friend.phone }, result => {
        if (result.error) return showModal('초대 실패', friendErrMsg(result.error));
        showModal('초대 완료', `${friend.nickname}님에게 방 초대장을 보냈어요.`);
      });
    });
    actions.appendChild(invite);
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'danger-btn';
    remove.textContent = '삭제';
    remove.addEventListener('click', () => {
      if (!window.confirm(`${friend.nickname}님을 친구 목록에서 삭제할까요?`)) return;
      socket.emit('remove_friend', { phone: friend.phone }, result => {
        if (result.error) return showModal('친구 삭제 실패', friendErrMsg(result.error));
        showModal('친구 삭제 완료', `${friend.nickname}님을 친구 목록에서 삭제했어요.`);
      });
    });
    actions.appendChild(remove);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

function renderLobbyFriendList(friends = state.friends) {
  const list = el('lobby-friend-list');
  if (!list) return;
  list.innerHTML = '';
  if (friends.length === 0) {
    list.innerHTML = '<li><span class="friend-status offline">친구를 먼저 추가하고 수락받아 보세요.</span></li>';
    return;
  }
  friends.forEach(friend => {
    const li = document.createElement('li');
    const meta = document.createElement('div');
    meta.className = 'friend-meta';
    const identity = document.createElement('div');
    identity.className = 'friend-identity';
    const avatar = document.createElement('div');
    renderAvatar(avatar, friend, '');
    const name = document.createElement('span');
    name.className = 'friend-name';
    name.textContent = friend.nickname;
    identity.append(avatar, name);
    const status = document.createElement('span');
    status.className = `friend-status${friend.online ? '' : ' offline'}`;
    status.textContent = friend.online ? '🟢 온라인' : '⚪ 오프라인';
    meta.append(identity, status);
    li.appendChild(meta);

    const invite = document.createElement('button');
    invite.type = 'button';
    invite.textContent = '방 초대';
    invite.disabled = !friend.online;
    invite.title = friend.online ? '현재 방으로 초대' : '온라인인 친구만 초대할 수 있어요.';
    invite.addEventListener('click', () => {
      socket.emit('invite_friend', { phone: friend.phone }, result => {
        if (result.error) return showModal('초대 실패', friendErrMsg(result.error));
        showModal('초대 완료', `${friend.nickname}님에게 방 초대장을 보냈어요.`);
      });
    });
    li.appendChild(invite);
    list.appendChild(li);
  });
}

function renderFriendRequests(requests = { incoming: [], outgoing: [] }) {
  state.friendRequests = {
    incoming: requests.incoming || [],
    outgoing: requests.outgoing || [],
  };
  if (state.leaderboard.length > 0) renderGlobalLeaderboard(state.leaderboard);
  const section = el('friend-requests-section');
  const list = el('friend-request-list');
  const count = state.friendRequests.incoming.length;
  ['home-friend-request-count', 'profile-friend-request-count'].forEach(id => {
    const badge = el(id);
    if (badge) badge.textContent = String(count);
  });
  if (!section || !list) return;
  list.innerHTML = '';
  section.classList.toggle('hidden', state.friendRequests.incoming.length === 0);
  state.friendRequests.incoming.forEach(request => {
    const li = document.createElement('li');
    const meta = document.createElement('div');
    meta.className = 'friend-meta';
    const identity = document.createElement('div');
    identity.className = 'friend-identity';
    const avatar = document.createElement('div');
    renderAvatar(avatar, request, '');
    const name = document.createElement('span');
    name.className = 'friend-name';
    name.textContent = `${request.nickname}님의 친구 요청`;
    identity.append(avatar, name);
    meta.appendChild(identity);
    li.appendChild(meta);

    const actions = document.createElement('div');
    actions.className = 'friend-actions';
    const accept = document.createElement('button');
    accept.type = 'button';
    accept.className = 'accept-btn';
    accept.textContent = '수락';
    accept.addEventListener('click', () => {
      socket.emit('accept_friend_request', { phone: request.phone }, result => {
        if (result.error) return showModal('친구 요청 처리 실패', friendErrMsg(result.error));
        showModal('친구 맺기 완료', `${request.nickname}님과 친구가 되었습니다.`);
      });
    });
    const reject = document.createElement('button');
    reject.type = 'button';
    reject.className = 'reject-btn';
    reject.textContent = '거절';
    reject.addEventListener('click', () => {
      socket.emit('reject_friend_request', { phone: request.phone }, result => {
        if (result.error) return showModal('친구 요청 처리 실패', friendErrMsg(result.error));
        showModal('친구 요청 거절', '친구 요청을 거절했습니다.');
      });
    });
    actions.append(accept, reject);
    li.appendChild(actions);
    list.appendChild(li);
  });
}

function friendErrMsg(code) {
  return {
    FRIEND_NOT_FOUND: '가입된 친구를 찾을 수 없어요.',
    CANNOT_ADD_FRIEND: '자기 자신은 친구로 추가할 수 없어요.',
    FRIEND_OFFLINE: '친구가 현재 오프라인이에요.',
    NOT_FRIEND: '먼저 친구로 추가해 주세요.',
    INVITE_LOBBY_ONLY: '게임 시작 전 대기실에서만 초대할 수 있어요.',
    ALREADY_IN_ROOM: '친구가 이미 이 방에 있어요.',
    NICKNAME_TAKEN: '이미 사용 중인 닉네임이에요.',
    ALREADY_FRIENDS: '이미 친구인 사용자예요.',
    REQUEST_ALREADY_SENT: '이미 친구 요청을 보냈어요.',
    REQUEST_RECEIVED: '상대가 보낸 친구 요청을 먼저 수락해 주세요.',
    REQUEST_NOT_FOUND: '해당 친구 요청을 찾을 수 없어요.',
  }[code] || errMsg(code);
}

el('btn-add-friend').addEventListener('click', () => {
  const query = el('friend-query').value.trim();
  if (!query) return (el('friend-error').textContent = '전화번호 또는 닉네임을 입력하세요.');
  socket.emit('add_friend', { query }, result => {
    if (result.error) return showModal('친구 추가 실패', friendErrMsg(result.error));
    el('friend-query').value = '';
    showModal('친구 요청 전송', '상대방이 수락하면 서로 친구가 됩니다.');
  });
});

el('friend-query').addEventListener('keydown', event => {
  if (event.key === 'Enter') el('btn-add-friend').click();
});

socket.on('friend_list_update', renderFriendList);
socket.on('friend_request_update', renderFriendRequests);
socket.on('friend_request', request => {
  sendBrowserNotification('친구 요청 도착', `${request.nickname}님이 친구 요청을 보냈어요.`);
  showModal('친구 요청 도착', `${request.nickname}님이 친구 요청을 보냈어요.\n내 프로필에서 수락할 수 있습니다.`);
});

socket.on('friend_room_invite', invite => {
  sendBrowserNotification('게임방 초대 도착', `${invite.inviterName}님이 ${MODE_LABEL[invite.mode] || '게임'} 방으로 초대했어요.`);
  const banner = el('friend-invite-banner');
  banner.innerHTML = '';
  const message = document.createElement('p');
  message.textContent = `${invite.inviterName}님이 ${MODE_LABEL[invite.mode] || '게임'} 방(#${invite.roomCode})에 초대했어요.`;
  const actions = document.createElement('div');
  actions.className = 'friend-invite-actions';
  const accept = document.createElement('button');
  accept.type = 'button';
  accept.textContent = '입장하기';
  accept.addEventListener('click', () => {
    banner.classList.add('hidden');
    requestJoinRoom(invite.roomCode, message => {
      showModal('방 입장 실패', message);
    });
  });
  const reject = document.createElement('button');
  reject.type = 'button';
  reject.className = 'secondary';
  reject.textContent = '닫기';
  reject.addEventListener('click', () => banner.classList.add('hidden'));
  actions.append(accept, reject);
  banner.append(message, actions);
  banner.classList.remove('hidden');
});

// ---------- lobby ----------
el('btn-start').addEventListener('click', () => socket.emit('start_game'));

socket.on('room_update', data => {
  state.players = data.players;
  state.phase = data.phase;
  state.mode = data.mode;
  if (state.mode === 'band') {
    renderBandMembers(data.players);
    if (state.phase === 'band_playing') {
      bandBuildUi();
      bandEnsureAudio();
      bandSyncPeers(data.players);
    }
  }
  if (Number.isInteger(data.quizItemCount)) {
    state.quizItemCount = data.quizItemCount;
    renderQuizItemCount();
  }
  if (Number.isInteger(data.ssafyPhotoCount)) state.ssafyPhotoCount = data.ssafyPhotoCount;
  const me = data.players.find(p => p.id === state.myId);
  state.isHost = !!me?.isHost;
  renderFriendList(state.friends);
  renderLiveScorePanel();

  el('room-code-label').textContent = state.roomCode
    ? `#${state.roomCode}`
    : '';

  if (data.phase === 'lobby') {
    if (!(['ssafy', 'foodroulette'].includes(state.mode) && ssafyAutoStart)) showView('view-lobby');
    renderPlayerList(el('player-list'), data.players, { showDead: false });
    const isTug = state.mode === 'tug';
    el('player-list').classList.toggle('hidden', isTug);
    el('tug-team-setup').classList.toggle('hidden', !isTug);
    if (isTug) renderTugTeamSetup(data.players);
    renderLobbyFriendList(state.friends);
    const count = data.players.length;
    let ready;
    if (state.mode === 'mafia') {
      ready = count === MAFIA_PLAYER_COUNT;
      el('lobby-hint').textContent = ready
        ? '6명이 모였습니다!'
        : `${count}/${MAFIA_PLAYER_COUNT}명 모임`;
    } else if (state.mode === 'tug') {
      const leftCount = data.players.filter(player => player.tugTeam === 'left').length;
      const rightCount = data.players.filter(player => player.tugTeam === 'right').length;
      const isEvenCount = count >= 2 && count <= 12 && count % 2 === 0;
      ready = isEvenCount && leftCount === rightCount;
      el('lobby-hint').textContent = ready
        ? `${count}명 참가 중 · ${leftCount}명 vs ${rightCount}명 팀 배치 완료`
        : count % 2 !== 0
          ? `${count}명 참가 중 · 줄다리기는 짝수 인원만 시작할 수 있어요.`
          : `${count}명 참가 중 · 양 팀을 같은 인원으로 배치해야 시작할 수 있어요.`;
    } else if (state.mode === 'band') {
      ready = count >= 1;
      el('lobby-hint').textContent = '인원 제한 없음 · 원하는 만큼 참가한 뒤 합주를 시작하세요. 게임 중에도 새 참가자가 들어올 수 있어요.';
    } else {
      const minPlayers = groupMinPlayers(state.mode);
      ready = count >= minPlayers;
      el('lobby-hint').textContent = ready
        ? `${count}명 참가 중 (${minPlayers}명 이상이면 시작 가능, 최대 ${GROUP_MAX_PLAYERS}명)`
        : `${count}/${minPlayers}명 이상 모여야 시작할 수 있어요.`;
    }

    const isQuiz = state.mode === 'quiz';
    el('quiz-upload-area').classList.toggle('hidden', !(isQuiz && state.isHost));
    if (isQuiz) ready = ready && (state.quizItemCount > 0 || state.personDbCount > 0);
    const isSsafy = state.mode === 'ssafy';
    el('ssafy-upload-area').classList.toggle('hidden', !isSsafy);
    if (isSsafy) {
      socket.emit('ssafy_get_photos', payload => {
        if (payload?.photos) renderSsafyLobbyPhotos(payload.photos);
      });
      ready = count >= 1 && state.ssafyPhotoCount >= 11;
      el('lobby-hint').textContent = ready
        ? '11단계 사진이 모두 준비됐어요. 혼자 시작할 수 있습니다.'
        : `사진 ${state.ssafyPhotoCount}/11단계를 등록하면 시작할 수 있어요.`;
    }

    el('btn-start').classList.toggle('hidden', !(state.isHost && ready));
  }

  // The shared live score panel is used for horse rounds too, so the old
  // horse-only panel stays hidden and cannot overlap the game UI.
  el('horse-leaderboard').classList.add('hidden');
  if (data.phase === 'result') {
    // Switch immediately on the authoritative room state. The game-specific
    // *_over event fills in the title and result details right after this.
    showView('view-result');
    updateResultActions();
  }
});

function renderHorseLeaderboard() {
  const list = el('horse-leaderboard-list');
  const sorted = [...state.players].sort((a, b) => b.score - a.score);

  const oldTops = {};
  Array.from(list.children).forEach(li => {
    oldTops[li.dataset.pid] = li.getBoundingClientRect().top;
  });

  sorted.forEach((p, idx) => {
    let li = list.querySelector(`[data-pid="${p.id}"]`);
    if (!li) {
      li = document.createElement('li');
      li.dataset.pid = p.id;
      list.appendChild(li);
    }
    li.classList.toggle('me', p.id === state.myId);
    li.innerHTML = `<span>${idx + 1}위 ${p.name}</span><span>${p.score}</span>`;
    list.appendChild(li); // reorders to current rank position
  });

  Array.from(list.children).forEach(li => {
    const oldTop = oldTops[li.dataset.pid];
    if (oldTop == null) return;
    const newTop = li.getBoundingClientRect().top;
    const delta = oldTop - newTop;
    if (delta) {
      li.style.transition = 'none';
      li.style.transform = `translateY(${delta}px)`;
      requestAnimationFrame(() => {
        li.style.transition = 'transform 0.4s ease';
        li.style.transform = '';
      });
    }
  });
}

// ---------- quiz upload (lobby, host only) ----------
el('btn-quiz-add').addEventListener('click', () => {
  const fileInput = el('quiz-file-input');
  const answer = el('quiz-answer-input').value.trim();
  const file = fileInput.files?.[0];
  if (!file || !answer) return;
  const reader = new FileReader();
  reader.onload = () => {
    socket.emit('quiz_upload_item', { imageDataUrl: reader.result, answer });
    fileInput.value = '';
    el('quiz-answer-input').value = '';
  };
  reader.readAsDataURL(file);
});

socket.on('quiz_items_update', ({ count }) => {
  state.quizItemCount = count;
  renderQuizItemCount();
  el('btn-start').classList.toggle('hidden', !(state.isHost && state.players.length >= groupMinPlayers('quiz') && (count > 0 || state.personDbCount > 0)));
});

function renderQuizItemCount() {
  const count = state.quizItemCount || 0;
  const shared = state.personDbCount || 0;
  el('quiz-item-count').textContent = `방 직접 등록 ${count}개 · 공용 인물 DB ${shared}명`;
}

function renderSsafyLobbyPhotos(photos = []) {
  const grid = el('ssafy-photo-grid');
  if (!grid) return;
  grid.innerHTML = '';
  state.ssafyPhotoCount = photos.filter(photo => photo?.imageDataUrl).length;
  photos.forEach((photo, index) => {
    const level = index + 1;
    const slot = document.createElement('button');
    slot.type = 'button';
    slot.className = `ssafy-photo-slot${photo?.imageDataUrl ? ' filled' : ''}`;
    slot.dataset.level = level;
    slot.innerHTML = photo?.imageDataUrl
      ? `<img src="${photo.imageDataUrl}" alt="${level}단계 사진" /><span>${level}단계</span>`
      : `<span class="ssafy-photo-placeholder">＋</span><span>${level}단계</span>`;
    slot.addEventListener('click', () => {
      el('ssafy-photo-level').value = String(level);
      el('ssafy-photo-input').click();
    });
    grid.appendChild(slot);
  });
  el('ssafy-photo-message').textContent = `${state.ssafyPhotoCount}/11단계 등록됨`;
  if (el('ssafy-entry-status')) {
    const ready = state.ssafyPhotoCount >= 11;
    el('ssafy-entry-status').textContent = ready
      ? '사진 준비 완료! 혼자 바로 시작할 수 있어요.'
      : `사진 ${state.ssafyPhotoCount}/11단계를 준비하면 시작할 수 있어요.`;
    el('btn-ssafy-entry-start').disabled = !ready;
  }
}

for (let level = 1; level <= 11; level += 1) {
  const option = document.createElement('option');
  option.value = String(level);
  option.textContent = `${level}단계 사진`;
  el('ssafy-photo-level').appendChild(option);
}

function saveSsafyPhotoFile(file, level) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => socket.emit('ssafy_save_photo', { level, imageDataUrl: reader.result }, result => {
    if (result?.error) return (el('ssafy-photo-message').textContent = '?ъ쭊 ?깅줉???ㅽ뙣?덉뼱??');
    el('ssafy-photo-input').value = '';
    if (result.photos) renderSsafyLobbyPhotos(result.photos);
  });
  reader.readAsDataURL(file);
}

el('ssafy-photo-input').addEventListener('change', () => {
  saveSsafyPhotoFile(el('ssafy-photo-input').files?.[0], Number(el('ssafy-photo-level').value));
});

el('btn-ssafy-photo-save').addEventListener('click', () => {
  const file = el('ssafy-photo-input').files?.[0];
  const level = Number(el('ssafy-photo-level').value);
  if (!file) return (el('ssafy-photo-message').textContent = '등록할 사진을 선택하세요.');
  const reader = new FileReader();
  reader.onload = () => socket.emit('ssafy_save_photo', { level, imageDataUrl: reader.result }, result => {
    if (result?.error) return (el('ssafy-photo-message').textContent = '사진 등록에 실패했어요.');
    el('ssafy-photo-input').value = '';
    if (result.photos) renderSsafyLobbyPhotos(result.photos);
  });
  reader.readAsDataURL(file);
});

socket.on('ssafy_photo_update', ({ photos = [] }) => renderSsafyLobbyPhotos(photos));

// ---------- role / word reveal ----------
socket.on('your_role', ({ role }) => {
  state.myRole = role;
});

socket.on('your_word', data => {
  state.myWord = data;
});

socket.on('phase_change', data => {
  if (data.phase === 'role_reveal') {
    showView('view-role');
    el('role-view-title').textContent = '당신의 역할';
    const info = ROLE_INFO[state.myRole];
    el('role-card').innerHTML = `${info.label}<div class="role-desc">${info.desc}</div>`;
    el('role-ack-status').textContent = '';
    el('btn-role-ack').disabled = false;
  } else if (data.phase === 'word_reveal') {
    showView('view-role');
    el('role-view-title').textContent = '제시어 확인';
    const w = state.myWord;
    el('role-card').innerHTML = `🙂 카테고리: ${w?.category}<div class="role-desc">제시어: <b>${w?.word}</b><br>제시어를 직접 말하지 말고 설명하며 라이어를 찾아내세요.<br><small>※ 당신이 라이어인지 아닌지는 아무도 모릅니다!</small></div>`;
    el('role-ack-status').textContent = '';
    el('btn-role-ack').disabled = false;
  } else if (data.phase === 'night') {
    el('night-day-num').textContent = data.dayNumber > 0 ? `(${data.dayNumber}일차 밤)` : '';
    renderNightAction();
    startCountdown(el('night-timer'), data.durationMs, () => {});
    showView('view-night');
  } else if (data.phase === 'day_discussion') {
    if (state.mode === 'liar') {
      el('day-view-title').innerHTML = '💬 라이어를 찾는 토론 시간';
      el('night-result-msg').textContent = '설명을 주고받으며 라이어를 추리해보세요.';
    } else {
      el('day-view-title').innerHTML = `☀️ 낮 토론 <span id="day-num">(${data.dayNumber}일차)</span>`;
      el('night-result-msg').textContent = data.lastNightDeath
        ? `🌙 지난 밤, ${data.lastNightDeath}님이 사망했습니다.`
        : '🌙 지난 밤, 아무도 사망하지 않았습니다.';
    }
    el('chat-box').innerHTML = '';
    el('btn-skip-vote').classList.toggle('hidden', !state.isHost);
    startCountdown(el('day-timer'), data.durationMs, () => {});
    showView('view-day');
  } else if (data.phase === 'liar_turns') {
    showView('view-liar-turn');
    if (data.turnNumber === 1) el('liar-turn-chat-box').innerHTML = '';
    el('liar-turn-progress').textContent = `${data.turnNumber}/${data.totalTurns}번째 발언`;
    const isMe = data.speakerId === state.myId;
    el('liar-turn-speaker').textContent = isMe ? '지금 당신의 차례입니다! 채팅으로 발언하세요.' : `${data.speakerName}님이 발언 중입니다.`;
    el('btn-finish-turn').classList.toggle('hidden', !isMe);
    renderYellowCardList();
    startCountdown(el('liar-turn-timer'), data.durationMs, () => {});
  } else if (data.phase === 'day_vote') {
    renderVoteList();
    el('vote-progress').textContent = '';
    startCountdown(el('vote-timer'), data.durationMs, () => {});
    showView('view-vote');
  } else if (data.phase === 'liar_guess') {
    showView('view-liar-guess');
    const isMeLiar = data.liarId === state.myId;
    if (isMeLiar) {
      el('liar-guess-sub').textContent = `사실 당신이 라이어였습니다! 받았던 단어 "${state.myWord?.word}"는 가짜였어요. 진짜 제시어를 맞히면 역전승할 수 있어요!`;
    } else {
      el('liar-guess-sub').textContent = `${data.liarName}님이 라이어였습니다! 마지막으로 제시어를 맞혀보는 중입니다...`;
    }
    el('liar-guess-form').classList.toggle('hidden', !isMeLiar);
    el('btn-liar-guess').disabled = false;
    el('liar-guess-input').value = '';
    startCountdown(el('liar-guess-timer'), data.durationMs, () => {});
  } else if (data.phase === 'wordchain_playing') {
    showView('view-wordchain');
    if (data.firstWord) {
      state.chainWords = [data.firstWord];
      renderChainDisplay();
    }
    el('chain-error').textContent = '';
    startCountdown(el('chain-timer'), data.durationMs, () => {});
  } else if (data.phase === 'tug_playing') {
    showView('view-tug');
    renderTugGameTeams();
    updateTugDisplay(data.position || 0, data.clicks || { left: 0, right: 0 });
    updateTugPlayerStatus();
  } else if (data.phase === 'song_round') {
    showView('view-songquiz');
    el('song-round-num').textContent = `(${data.roundNumber}/${data.totalRounds}라운드)`;
    el('song-artist-input').value = '';
    el('song-title-input').value = '';
    el('song-round-msg').textContent = '가수와 노래 제목을 모두 입력해 제출하세요.';
    el('song-submit').disabled = false;
    el('song-skip').disabled = false;
    el('song-skip').textContent = `라운드 스킵 (0/${state.players.length}명)`;
    loadSongVideo(data.videoId, data.startSeconds, data.clipDurationMs);
    renderScoreBoard('song-score-board');
    startCountdown(el('song-timer'), data.durationMs, () => {
      el('song-submit').disabled = true;
    });
  } else if (data.phase === 'balance_round') {
    showView('view-balance');
    el('balance-round-num').textContent = `(${data.roundNumber}/${data.totalRounds}라운드)`;
    el('balance-choice-left').textContent = data.question.left;
    el('balance-choice-right').textContent = data.question.right;
    el('balance-choice-left').disabled = false;
    el('balance-choice-right').disabled = false;
    el('balance-result').classList.add('hidden');
    el('balance-vote-status').textContent = `아직 투표하지 않았어요 · 0/${state.players.length}명 참여`;
    startCountdown(el('balance-timer'), data.durationMs, () => {
      el('balance-choice-left').disabled = true;
      el('balance-choice-right').disabled = true;
    });
  } else if (data.phase === 'ssafy_playing') {
    ssafyAutoStart = false;
    showView('view-ssafy');
    startSsafyGame(data.images || []);
  } else if (data.phase === 'goalkeeper_shot') {
    showView('view-goalkeeper');
    renderGoalkeeperShot(data);
  } else if (data.phase === 'foodroulette_playing') {
    ssafyAutoStart = false;
    showView('view-foodroulette');
    el('foodroulette-menu-count').textContent = data.menuCount || 100;
    el('foodroulette-result').textContent = data.currentResult || '오늘의 메뉴는?';
    el('foodroulette-status').textContent = data.currentResult
      ? `오늘은 ${data.currentResult} 어때요?`
      : '누구나 룰렛을 돌릴 수 있어요. 마음에 드는 메뉴를 골라보세요!';
    el('foodroulette-spin').disabled = false;
    el('foodroulette-wheel').classList.remove('is-spinning');
  } else if (data.phase === 'band_playing') {
    showView('view-band');
    el('band-status').textContent = data.lateJoin ? '합주 중인 방에 참여했어요. 원하는 파트를 골라보세요!' : '악기를 고르고 친구들과 함께 연주해보세요.';
    bandStartSession();
  } else if (data.phase === 'fashion_dressing') {
    showView('view-fashion');
    setFashionTheme(data.topic);
    el('fashion-round-num').textContent = `(${data.roundNumber}/${data.totalRounds}라운드)`;
    el('fashion-topic').textContent = `주제: ${data.topic}`;
    el('fashion-dressing-area').classList.remove('hidden');
    el('fashion-voting-area').classList.add('hidden');
    el('fashion-round-result').classList.add('hidden');
    state.fashionOutfit = {};
    buildFashionDoll(el('fashion-doll'), state.fashionOutfit, true);
    renderFashionPalette();
    el('fashion-submit').disabled = false;
    el('fashion-status').textContent = '아이템을 골라 캐릭터를 꾸며주세요.';
    startCountdown(el('fashion-timer'), data.durationMs, submitFashionOutfit);
  } else if (data.phase === 'fashion_voting') {
    showView('view-fashion');
    setFashionTheme(data.topic);
    el('fashion-round-num').textContent = `(${data.roundNumber}/${data.totalRounds}라운드 · 투표)`;
    el('fashion-topic').textContent = `주제: ${data.topic}`;
    el('fashion-dressing-area').classList.add('hidden');
    el('fashion-voting-area').classList.remove('hidden');
    el('fashion-round-result').classList.add('hidden');
    renderFashionGallery(data.gallery || []);
    el('fashion-vote-status').textContent = '나를 제외한 스타일 하나를 골라주세요.';
    startCountdown(el('fashion-timer'), data.durationMs, () => {
      document.querySelectorAll('.fashion-vote-btn').forEach(button => { button.disabled = true; });
    });
  } else if (data.phase === 'drawing') {
    showView('view-drawing');
    el('draw-round-num').textContent = `(${data.roundNumber}/${data.totalRounds}라운드)`;
    el('draw-topic').textContent = `주제: ${data.topic}`;
    el('draw-canvas-area').classList.remove('hidden');
    el('draw-voting-area').classList.add('hidden');
    el('draw-round-result').classList.add('hidden');
    initDrawingCanvas();
    startCountdown(el('draw-timer'), data.durationMs, submitDrawing);
  } else if (data.phase === 'drawing_voting') {
    showView('view-drawing');
    el('draw-round-num').textContent = `(${data.roundNumber}/${data.totalRounds}라운드 투표)`;
    el('draw-topic').textContent = `주제: ${data.topic}`;
    el('draw-canvas-area').classList.add('hidden');
    el('draw-voting-area').classList.remove('hidden');
    el('draw-round-result').classList.add('hidden');
    renderDrawingGallery(data.drawings || []);
    el('draw-vote-progress').textContent = '0명 투표 완료';
    startCountdown(el('draw-timer'), data.durationMs, () => {});
  } else if (data.phase === 'memory_preview') {
    showView('view-memory');
    memoryCurrentTurnId = null;
    el('memory-turn-label').textContent = '카드 위치를 기억하세요!';
    el('memory-status').textContent = '5초 후 모든 카드가 뒤집힙니다.';
    renderMemoryBoard(data.cards || [], true);
    startCountdown(el('memory-timer'), data.durationMs, () => {});
  } else if (data.phase === 'memory_playing') {
    showView('view-memory');
    memoryCurrentTurnId = data.turnPlayerId;
    updateMemoryTurnLabel(data.turnPlayerName, data.matchedCount || 0, data.totalCards || 100);
    renderMemoryBoard(data.cards || []);
    startCountdown(el('memory-timer'), data.durationMs, () => {});
  } else if (data.phase === 'coffee_selecting') {
    showView('view-coffee');
    el('coffee-round-num').textContent = `(${data.round}라운드)`;
    el('coffee-status').textContent = '음료를 하나 골라주세요. 선택은 공개되지 않습니다.';
    el('coffee-round-result').classList.add('hidden');
    el('coffee-active-label').textContent = `이번 라운드 참가자: ${(data.activePlayers || []).map(p => p.name).join(', ')}`;
    renderCoffeeDrinks(data.drinks || []);
    el('coffee-rps-area').classList.add('hidden');
    startCountdown(el('coffee-timer'), data.durationMs, () => {});
  } else if (data.phase === 'coffee_rps') {
    showView('view-coffee');
    el('coffee-round-num').textContent = '(최종 가위바위보)';
    el('coffee-status').textContent = '최종 두 명만 선택할 수 있습니다.';
    el('coffee-drinks').innerHTML = '';
    el('coffee-round-result').classList.add('hidden');
    el('coffee-active-label').textContent = '';
    renderCoffeeRps(data.finalists || []);
    startCountdown(el('coffee-timer'), data.durationMs, () => {});
  } else if (data.phase === 'subway_round') {
    showView('view-subway');
    el('subway-round-num').textContent = `(${data.roundNumber}/${data.totalRounds}라운드)`;
    el('subway-station').textContent = data.station;
    el('subway-instruction').textContent = data.transfer
      ? '환승역입니다. 해당 역의 모든 호선을 선택한 뒤 제출하세요!'
      : '호선을 하나 선택한 뒤 제출하세요!';
    el('subway-round-msg').textContent = '선착순으로 정답을 제출해주세요.';
    renderSubwayChoices(data.choices || []);
    renderScoreBoard('subway-score-board');
    startCountdown(el('subway-timer'), data.durationMs, () => {});
  } else if (data.phase === 'quiz_round') {
    showView('view-quiz-round');
    el('quiz-round-num').textContent = `(${data.roundNumber}/${data.totalRounds})`;
    el('quiz-image').src = data.imageDataUrl;
    el('quiz-answer-guess').value = '';
    el('quiz-round-msg').textContent = '';
    renderScoreBoard('quiz-score-board');
    startCountdown(el('quiz-timer'), data.durationMs, () => {});
  } else if (data.phase === 'stack_playing') {
    showView('view-stack');
    if (data.height === 0) stackCameraShift = 0;
    stackWorld = { worldWidth: data.worldWidth, groundY: data.groundY };
    stackIsMyTurn = data.turnPlayerId === state.myId;
    stackBlockWidth = data.blockWidth;
    stackIsRainbow = data.isRainbow;
    stackPreviewOffset = 0;
    el('stack-turn-msg').textContent = stackIsMyTurn
      ? (data.isRainbow ? '🌈 무지개 블록! 놓으면 아래 블록이 모두 사라져요!' : '당신의 차례입니다! 타이밍 맞춰 Space로 낙하')
      : `${data.turnPlayerName}님의 차례입니다.`;
    el('stack-key-guide').classList.toggle('hidden', !stackIsMyTurn);
    if (stackIsMyTurn) {
      startStackOscillation();
    } else {
      stopStackOscillation();
      renderPreviewBlock();
    }
    el('stack-height-label').textContent = `높이: ${data.height}단`;
    renderStackBlocks(data.blocks);
    startCountdown(el('stack-timer'), data.durationMs, () => {});
  } else if (data.phase === 'cs_round') {
    showView('view-cs-round');
    el('cs-round-num').textContent = `(${data.roundNumber}/${data.totalRounds})`;
    el('cs-question').textContent = data.question;
    el('cs-round-msg').textContent = '';
    renderCsChoices(data.choices);
    renderScoreBoard('cs-score-board');
    startCountdown(el('cs-timer'), data.durationMs, () => {});
  } else if (data.phase === 'horse_betting') {
    showView('view-horse-bet');
    horseRoster = data.roster;
    horseSelectedHorse = null;
    el('horse-round-num').textContent = `(${data.round}/${data.totalRounds}라운드)`;
    const me = state.players.find(p => p.id === state.myId);
    el('horse-my-tokens').textContent = `보유 토큰: ${me?.score ?? 0}`;
    el('horse-bet-status').textContent = '';
    el('horse-bet-amount').value = '';
    el('horse-stats-paper').classList.add('hidden');
    renderHorseLanes();
    startCountdown(el('horse-timer'), data.durationMs, () => {});
  } else if (data.phase === 'gukbap_playing') {
    showView('view-gukbap');
    resetGukbapGame();
  }
});

function renderTugGameTeams() {
  const lists = { left: el('tug-left-players'), right: el('tug-right-players') };
  const characters = { left: el('tug-left-characters'), right: el('tug-right-characters') };
  Object.values(lists).forEach(list => { list.innerHTML = ''; });
  Object.values(characters).forEach(list => { list.innerHTML = ''; });
  const people = ['🧑🏻', '👩🏻', '👨🏻', '🧑🏼', '👩🏼', '👨🏼', '🧑🏽', '👩🏽', '👨🏽', '🧑🏾', '👩🏾', '👨🏾'];
  state.players.forEach((player, index) => {
    const list = lists[player.tugTeam];
    const characterList = characters[player.tugTeam];
    if (!list || !characterList) return;
    const character = document.createElement('div');
    character.className = `tug-character${player.id === state.myId ? ' is-me' : ''}`;
    character.title = player.name;
    const figure = document.createElement('span');
    figure.className = 'tug-character-figure';
    figure.textContent = people[index % people.length];
    const label = document.createElement('span');
    label.className = 'tug-character-name';
    label.textContent = player.id === state.myId ? `${player.name} (나)` : player.name;
    character.append(figure, label);
    characterList.appendChild(character);

    const item = document.createElement('li');
    item.textContent = player.name;
    list.appendChild(item);
  });
}

function updateTugDisplay(position, clicks = { left: 0, right: 0 }) {
  const safePosition = Math.max(-100, Math.min(100, Number(position) || 0));
  const handle = el('tug-rope-handle');
  handle.style.left = `${50 + safePosition * 0.42}%`;
  el('tug-left-score').textContent = `왼쪽 팀 ${clicks.left || 0}회`;
  el('tug-right-score').textContent = `오른쪽 팀 ${clicks.right || 0}회`;
}

function updateTugPlayerStatus() {
  const me = state.players.find(player => player.id === state.myId);
  const teamLabel = me?.tugTeam === 'left' ? '왼쪽 팀' : me?.tugTeam === 'right' ? '오른쪽 팀' : '팀 미배정';
  el('tug-status').textContent = me?.tugTeam
    ? `당신은 ${teamLabel}입니다. 우리 팀 버튼을 연속 클릭해서 줄을 당기세요!`
    : '팀이 배정되지 않았습니다.';
  const button = el('btn-tug-pull');
  button.disabled = !me?.tugTeam;
  button.textContent = me?.tugTeam === 'left' ? '🔵 왼쪽 팀 힘껏 당기기' : '🔴 오른쪽 팀 힘껏 당기기';
}

el('btn-tug-pull').addEventListener('click', () => {
  el('btn-tug-pull').classList.add('pulling');
  window.setTimeout(() => el('btn-tug-pull').classList.remove('pulling'), 100);
  socket.emit('tug_pull');
});

socket.on('tug_update', ({ position, clicks }) => {
  updateTugDisplay(position, clicks);
});

let currentSongClip = null;
let songLoadToken = 0;

function loadSongVideo(videoId, startSeconds = 0, clipDurationMs = 30000) {
  const loadToken = ++songLoadToken;
  const clipStart = Math.max(0, Number(startSeconds) || 0);
  const clipDuration = Math.max(1, Number(clipDurationMs) || 30000);
  const clipEnd = clipStart + Math.ceil(clipDuration / 1000);
  currentSongClip = { videoId, startSeconds: clipStart, clipDurationMs: clipDuration };
  const player = el('song-youtube-player');
  if (!videoId) {
    player.removeAttribute('src');
    return;
  }
  const params = new URLSearchParams({
    autoplay: '1',
    controls: '0',
    disablekb: '1',
    fs: '0',
    modestbranding: '1',
    rel: '0',
    playsinline: '1',
    iv_load_policy: '3',
    start: String(clipStart),
    end: String(clipEnd),
  });
  // 같은 영상 다시 재생도 확실히 새 구간부터 시작하도록 iframe을 교체합니다.
  player.src = 'about:blank';
  window.setTimeout(() => {
    if (loadToken !== songLoadToken
      || currentSongClip?.videoId !== videoId
      || currentSongClip.startSeconds !== clipStart) return;
    player.src = `https://www.youtube.com/embed/${encodeURIComponent(videoId)}?${params}`;
  }, 0);
}

function stopSongVideo() {
  songLoadToken += 1;
  currentSongClip = null;
  const player = el('song-youtube-player');
  // YouTube iframe의 end 파라미터가 브라우저별로 지연될 수 있어
  // 라운드/게임 종료 시 iframe을 비워 음원을 확실히 정지합니다.
  player.src = 'about:blank';
}

el('song-replay').addEventListener('click', () => {
  if (currentSongClip) {
    loadSongVideo(currentSongClip.videoId, currentSongClip.startSeconds, currentSongClip.clipDurationMs);
  }
});
el('song-submit').addEventListener('click', () => {
  const artist = el('song-artist-input').value.trim();
  const title = el('song-title-input').value.trim();
  if (!artist || !title) {
    el('song-round-msg').textContent = '가수와 제목을 모두 입력하세요.';
    return;
  }
  el('song-submit').disabled = true;
  socket.emit('song_answer', { artist, title }, result => {
    if (result?.error) el('song-submit').disabled = false;
    else if (result?.ok === false) el('song-submit').disabled = false;
  });
});

el('song-skip').addEventListener('click', () => {
  el('song-skip').disabled = true;
  socket.emit('song_skip', result => {
    if (result?.error) el('song-skip').disabled = false;
  });
});

['song-artist-input', 'song-title-input'].forEach(id => {
  el(id).addEventListener('keydown', event => {
    if (event.key === 'Enter') el('song-submit').click();
  });
});

socket.on('song_wrong', () => {
  el('song-round-msg').textContent = '아직 정답이 아니에요. 다시 입력해보세요!';
});

socket.on('song_skip_update', ({ skippedCount = 0, totalPlayers = state.players.length }) => {
  const button = el('song-skip');
  if (!button) return;
  button.textContent = `라운드 스킵 (${skippedCount}/${totalPlayers}명)`;
});

socket.on('song_round_result', ({ correct, answerArtist, answerTitle, winnerName, skipped = false }) => {
  stopSongVideo();
  el('song-submit').disabled = true;
  el('song-skip').disabled = true;
  el('song-round-msg').textContent = correct
    ? `🎉 ${winnerName}님 정답! ${answerArtist} - ${answerTitle}`
    : skipped
      ? `전원 스킵! 정답: ${answerArtist} - ${answerTitle}`
      : `정답: ${answerArtist} - ${answerTitle}`;
  renderScoreBoard('song-score-board');
});

const FASHION_ITEMS = {
  hair: {
    label: '헤어',
    items: [
      { id: 'hair-wave', label: '웨이브 헤어', icon: '💇‍♀️' },
      { id: 'hair-crown', label: '왕관 헤어', icon: '👑' },
      { id: 'hair-cap', label: '캡모자', icon: '🧢' },
    ],
  },
  accessory: {
    label: '악세서리',
    items: [
      { id: 'accessory-glasses', label: '선글라스', icon: '🕶️' },
      { id: 'accessory-necklace', label: '목걸이', icon: '📿' },
      { id: 'accessory-bag', label: '파티백', icon: '👜' },
    ],
  },
  top: {
    label: '상의',
    items: [
      { id: 'top-tshirt', label: '티셔츠', icon: '👕' },
      { id: 'top-dress', label: '드레스', icon: '👗' },
      { id: 'top-hoodie', label: '후드티', icon: '🧥' },
    ],
  },
  outer: {
    label: '겉옷',
    items: [
      { id: 'outer-jacket', label: '재킷', icon: '🧥' },
      { id: 'outer-scarf', label: '머플러', icon: '🧣' },
      { id: 'outer-coat', label: '코트', icon: '🥼' },
    ],
  },
  bottom: {
    label: '하의',
    items: [
      { id: 'bottom-jeans', label: '청바지', icon: '👖' },
      { id: 'bottom-skirt', label: '스커트', icon: '🩰' },
      { id: 'bottom-shorts', label: '반바지', icon: '🩳' },
    ],
  },
  shoes: {
    label: '신발',
    items: [
      { id: 'shoes-sneakers', label: '운동화', icon: '👟' },
      { id: 'shoes-boots', label: '부츠', icon: '🥾' },
      { id: 'shoes-heels', label: '구두', icon: '👠' },
    ],
  },
};

const FASHION_SLOT_ORDER = ['hair', 'accessory', 'top', 'outer', 'bottom', 'shoes'];
const FASHION_ITEM_BY_ID = Object.values(FASHION_ITEMS).flatMap(group => group.items)
  .reduce((map, item) => ({ ...map, [item.id]: item }), {});

function buildFashionDoll(container, outfit = {}, interactive = false) {
  container.innerHTML = '';
  container.classList.add('fashion-doll');
  const person = document.createElement('div');
  person.className = 'fashion-person';

  const shadow = document.createElement('div');
  shadow.className = 'fashion-person-shadow';
  person.appendChild(shadow);

  const bodyParts = [
    'fashion-person-head-base',
    'fashion-person-neck',
    'fashion-person-torso',
    'fashion-person-arm fashion-person-arm-left',
    'fashion-person-arm fashion-person-arm-right',
    'fashion-person-leg fashion-person-leg-left',
    'fashion-person-leg fashion-person-leg-right',
    'fashion-person-foot fashion-person-foot-left',
    'fashion-person-foot fashion-person-foot-right',
  ];
  bodyParts.forEach(className => {
    const part = document.createElement('div');
    part.className = className;
    person.appendChild(part);
  });

  const face = document.createElement('div');
  face.className = 'fashion-doll-face fashion-person-face';
  face.textContent = '🙂';
  person.appendChild(face);

  FASHION_SLOT_ORDER.forEach(category => {
    const slot = document.createElement('div');
    slot.className = `fashion-slot fashion-slot-${category}`;
    slot.dataset.fashionSlot = category;
    const item = FASHION_ITEM_BY_ID[outfit[category]];
    slot.textContent = item?.icon || '＋';
    slot.title = item?.label || `${FASHION_ITEMS[category].label} 놓기`;
    slot.setAttribute('aria-label', slot.title);
    if (item) slot.classList.add('filled');
    if (interactive) {
      slot.addEventListener('dragover', event => event.preventDefault());
      slot.addEventListener('drop', event => {
        event.preventDefault();
        const itemId = event.dataTransfer.getData('text/fashion-item');
        const dropped = FASHION_ITEM_BY_ID[itemId];
        if (dropped && FASHION_SLOT_ORDER.includes(category)) applyFashionItem(category, dropped.id);
      });
    }
    person.appendChild(slot);
  });
  container.appendChild(person);
}

function applyFashionItem(category, itemId) {
  state.fashionOutfit[category] = itemId;
  buildFashionDoll(el('fashion-doll'), state.fashionOutfit, true);
  document.querySelectorAll('.fashion-item').forEach(button => {
    button.classList.toggle('selected', state.fashionOutfit[button.dataset.category] === button.dataset.itemId);
  });
}

function renderFashionPalette() {
  const palette = el('fashion-palette');
  palette.innerHTML = '';
  Object.entries(FASHION_ITEMS).forEach(([category, group]) => {
    const section = document.createElement('div');
    section.className = 'fashion-palette-group';
    const title = document.createElement('h3');
    title.textContent = group.label;
    section.appendChild(title);
    const items = document.createElement('div');
    items.className = 'fashion-items';
    group.items.forEach(item => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'fashion-item';
      button.draggable = true;
      button.dataset.category = category;
      button.dataset.itemId = item.id;
      button.title = item.label;
      button.innerHTML = `<span>${item.icon}</span><small>${item.label}</small>`;
      button.addEventListener('click', () => applyFashionItem(category, item.id));
      button.addEventListener('dragstart', event => {
        event.dataTransfer.setData('text/fashion-item', item.id);
      });
      items.appendChild(button);
    });
    section.appendChild(items);
    palette.appendChild(section);
  });
}

function submitFashionOutfit() {
  const button = el('fashion-submit');
  if (button.disabled) return;
  button.disabled = true;
  el('fashion-status').textContent = '제출 완료! 다른 참가자를 기다리는 중...';
  socket.emit('fashion_submit', { outfit: state.fashionOutfit }, result => {
    if (result?.error) {
      button.disabled = false;
      el('fashion-status').textContent = '제출에 실패했어요. 다시 눌러주세요.';
    }
  });
}

el('fashion-submit').addEventListener('click', submitFashionOutfit);

function renderFashionGallery(gallery = []) {
  const area = el('fashion-gallery');
  area.innerHTML = '';
  const candidates = gallery.filter(item => item.candidateId !== state.myId);
  candidates.forEach((candidate, index) => {
    const card = document.createElement('div');
    card.className = 'fashion-candidate-card';
    const label = document.createElement('h3');
    label.textContent = `스타일 ${index + 1}`;
    const doll = document.createElement('div');
    buildFashionDoll(doll, candidate.outfit, false);
    const vote = document.createElement('button');
    vote.type = 'button';
    vote.className = 'fashion-vote-btn';
    vote.textContent = '이 스타일에 투표';
    vote.dataset.candidateId = candidate.candidateId;
    vote.addEventListener('click', () => {
      document.querySelectorAll('.fashion-vote-btn').forEach(button => { button.disabled = true; });
      el('fashion-vote-status').textContent = '투표 완료! 다른 사람들의 선택을 기다리는 중...';
      socket.emit('fashion_vote', { candidateId: candidate.candidateId }, result => {
        if (result?.error) {
          document.querySelectorAll('.fashion-vote-btn').forEach(button => { button.disabled = false; });
          el('fashion-vote-status').textContent = '투표에 실패했어요. 다시 선택해주세요.';
        }
      });
    });
    card.append(label, doll, vote);
    area.appendChild(card);
  });
}

socket.on('fashion_submit_progress', ({ submittedCount, totalPlayers }) => {
  el('fashion-status').textContent = `제출 현황 ${submittedCount}/${totalPlayers}명`;
});

socket.on('fashion_vote_progress', ({ votedCount, totalVoters }) => {
  el('fashion-vote-status').textContent = `투표 현황 ${votedCount}/${totalVoters}명`;
});

socket.on('fashion_round_result', ({ winnerIds = [], maxVotes }) => {
  const result = el('fashion-round-result');
  result.textContent = maxVotes > 0
    ? `이번 라운드 ${maxVotes}표로 ${winnerIds.length}개 스타일이 공동 1위예요!`
    : '이번 라운드는 투표가 없어 무승부예요.';
  result.classList.remove('hidden');
});

function submitBalanceVote(choice) {
  el('balance-choice-left').disabled = true;
  el('balance-choice-right').disabled = true;
  el('balance-vote-status').textContent = '투표 완료! 다른 사람들의 선택을 기다리는 중...';
  socket.emit('balance_vote', { choice }, result => {
    if (result?.error) {
      el('balance-choice-left').disabled = false;
      el('balance-choice-right').disabled = false;
      el('balance-vote-status').textContent = '투표에 실패했어요. 다시 선택해주세요.';
    }
  });
}

el('balance-choice-left').addEventListener('click', () => submitBalanceVote('left'));
el('balance-choice-right').addEventListener('click', () => submitBalanceVote('right'));

socket.on('balance_vote_update', ({ votedCount, totalPlayers }) => {
  el('balance-vote-status').textContent = `투표 현황 ${votedCount}/${totalPlayers}명 · 결과를 기다리는 중`;
});

socket.on('balance_round_result', ({ left, right, votedCount, totalPlayers, roundWinners = [] }) => {
  const total = left + right;
  const leftPercent = total ? Math.round((left / total) * 100) : 0;
  const rightPercent = total ? 100 - leftPercent : 0;
  el('balance-choice-left').disabled = true;
  el('balance-choice-right').disabled = true;
  const roundMessage = roundWinners.length > 0
    ? `${roundWinners.join(', ')}님 +1점`
    : '이번 라운드는 점수 없음';
  el('balance-vote-status').textContent = `투표 완료 ${votedCount}/${totalPlayers}명 · ${roundMessage}`;
  el('balance-left-count').textContent = `${left}표`;
  el('balance-right-count').textContent = `${right}표`;
  el('balance-left-percent').textContent = `${leftPercent}%`;
  el('balance-right-percent').textContent = `${rightPercent}%`;
  el('balance-result').classList.remove('hidden');
});

function renderScoreBoard(listId) {
  const list = el(listId);
  list.innerHTML = '';
  [...state.players].sort((a, b) => b.score - a.score).forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${p.name}</span><span>${p.score}점</span>`;
    list.appendChild(li);
  });
}

el('btn-role-ack').addEventListener('click', () => {
  socket.emit('role_ack');
  el('btn-role-ack').disabled = true;
  el('role-ack-status').textContent = '다른 사람을 기다리는 중...';
});

socket.on('role_ack_update', ({ readyCount, total }) => {
  el('role-ack-status').textContent = `${readyCount}/${total}명 확인 완료`;
});

// ---------- night (mafia mode) ----------
let selectedNightTarget = null;

function renderNightAction() {
  const area = el('night-action-area');
  const waitMsg = el('night-wait-msg');
  selectedNightTarget = null;

  const alive = state.players.filter(p => p.alive);
  const targets = alive.filter(p => p.id !== state.myId);
  const me = state.players.find(p => p.id === state.myId);

  if (me && me.alive === false) {
    area.innerHTML = '';
    waitMsg.textContent = '당신은 사망했습니다. 결과를 기다려주세요...';
    waitMsg.classList.remove('hidden');
    return;
  }

  const roleToActionType = { mafia: 'mafia', doctor: 'doctor', police: 'police' };
  const actionType = roleToActionType[state.myRole];

  if (!actionType) {
    area.innerHTML = '';
    waitMsg.textContent = '각자의 역할이 은밀히 행동 중입니다...';
    waitMsg.classList.remove('hidden');
    return;
  }
  waitMsg.classList.add('hidden');

  const verbMap = { mafia: '지목', doctor: '치료', police: '조사' };
  area.innerHTML = `<p>${verbMap[actionType]}할 대상을 고르세요.</p>`;
  targets.forEach(p => {
    const btn = document.createElement('button');
    btn.className = 'action-target-btn';
    btn.textContent = p.name;
    btn.addEventListener('click', () => {
      selectedNightTarget = p.id;
      document.querySelectorAll('.action-target-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      socket.emit('night_action', { type: actionType, targetId: p.id });
    });
    area.appendChild(btn);
  });
}

// ---------- liar turns ----------
function renderYellowCardList() {
  const list = el('liar-turn-cards');
  list.innerHTML = '';
  state.players.forEach(p => {
    const li = document.createElement('li');
    if (!p.alive) li.classList.add('dead');
    const cards = '🟨'.repeat(p.yellowCards || 0);
    li.innerHTML = `<span>${p.name}</span><span>${cards}${p.alive === false ? ' 탈락' : ''}</span>`;
    list.appendChild(li);
  });
}

el('btn-finish-turn').addEventListener('click', () => {
  socket.emit('finish_turn');
  el('btn-finish-turn').classList.add('hidden');
});

socket.on('yellow_card', () => {
  renderYellowCardList();
});

socket.on('police_result', ({ targetName, isMafia }) => {
  const area = el('night-action-area');
  const p = document.createElement('p');
  p.style.fontWeight = '700';
  p.style.marginTop = '12px';
  p.textContent = `조사 결과: ${targetName}님은 ${isMafia ? '마피아입니다!' : '마피아가 아닙니다.'}`;
  area.appendChild(p);
});

// ---------- chat ----------
function appendChat({ name, text }) {
  ['chat-box', 'liar-turn-chat-box'].forEach(id => {
    const box = el(id);
    if (!box) return;
    const div = document.createElement('div');
    div.className = 'chat-msg';
    div.innerHTML = `<span class="sender">${name}</span><span>${escapeHtml(text)}</span>`;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
  });
}

function escapeHtml(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function sendChatFrom(inputId) {
  const input = el(inputId);
  const text = input.value.trim();
  if (!text) return;
  socket.emit('chat_message', { text });
  input.value = '';
}

el('btn-chat-send').addEventListener('click', () => sendChatFrom('chat-input'));
el('chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChatFrom('chat-input');
});

el('btn-liar-turn-chat-send').addEventListener('click', () => sendChatFrom('liar-turn-chat-input'));
el('liar-turn-chat-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') sendChatFrom('liar-turn-chat-input');
});

socket.on('chat_message', appendChat);

el('btn-skip-vote').addEventListener('click', () => socket.emit('skip_to_vote'));

// ---------- vote ----------
let selectedVoteTarget = null;

function renderVoteList() {
  const list = el('vote-list');
  list.innerHTML = '';
  selectedVoteTarget = null;
  const me = state.players.find(p => p.id === state.myId);
  const alive = state.players.filter(p => p.alive);

  if (me && me.alive === false) {
    const p = document.createElement('p');
    p.textContent = '당신은 사망했습니다. 투표 결과를 기다려주세요...';
    list.appendChild(p);
    return;
  }

  alive.forEach(p => {
    const li = document.createElement('li');
    const btn = document.createElement('button');
    const cards = state.mode === 'liar' ? ' ' + '🟨'.repeat(p.yellowCards || 0) : '';
    btn.textContent = (p.id === state.myId ? `${p.name} (나)` : p.name) + cards;
    btn.addEventListener('click', () => {
      selectedVoteTarget = p.id;
      document.querySelectorAll('#vote-list button').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      socket.emit('day_vote', { targetId: p.id });
    });
    li.appendChild(btn);
    list.appendChild(li);
  });
}

socket.on('vote_progress', ({ votedCount, total }) => {
  el('vote-progress').textContent = `${votedCount}/${total}명 투표 완료`;
});

socket.on('vote_result', ({ eliminatedName, tie }) => {
  let msg;
  if (tie) msg = '동점으로 아무도 처형되지 않았습니다.';
  else if (eliminatedName) msg = `${eliminatedName}님이 투표로 지목되었습니다.`;
  else msg = '아무도 지목되지 않았습니다.';
  el('vote-progress').textContent = msg;
});

// ---------- liar guess ----------
el('btn-liar-guess').addEventListener('click', () => {
  const guess = el('liar-guess-input').value.trim();
  if (!guess) return;
  socket.emit('liar_guess', { guess });
  el('btn-liar-guess').disabled = true;
});

// ---------- wordchain ----------
state.chainWords = [];

function renderChainDisplay() {
  const words = state.chainWords;
  el('chain-word-display').textContent = words[words.length - 1] || '';
  const recent = words.slice(-6);
  el('chain-log').textContent = recent.join(' → ');
}

el('btn-chain-submit').addEventListener('click', submitChainWord);
el('chain-input').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitChainWord();
});
function submitChainWord() {
  const input = el('chain-input');
  const word = input.value.trim();
  if (!word) return;
  socket.emit('wordchain_submit', { word });
  input.value = '';
}

socket.on('word_rejected', ({ word, reason }) => {
  el('chain-error').textContent = `'${word}' 실패: ${reason}`;
});

socket.on('word_result', ({ word, accepted, submitterName, lastWord }) => {
  if (accepted) {
    state.chainWords.push(word);
    renderChainDisplay();
  } else {
    el('chain-error').textContent = `"${word}"(${submitterName}) 무효 처리되었습니다.`;
  }
  renderScoreBoard('chain-score-board');
});

// ---------- drawing game ----------
let drawingCanvas;
let drawingContext;
let drawingInProgress = false;
let drawingSubmitted = false;
let drawingVoteSubmitted = false;
let drawingVoteTargetId = null;
let drawingVotePending = false;
let drawingEraser = false;

function initDrawingCanvas() {
  drawingCanvas = el('draw-canvas');
  drawingContext = drawingCanvas.getContext('2d');
  drawingContext.fillStyle = '#fff';
  drawingContext.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
  drawingContext.lineCap = 'round';
  drawingContext.lineJoin = 'round';
  drawingEraser = false;
  el('btn-draw-eraser').classList.remove('active');
  el('btn-draw-eraser').setAttribute('aria-pressed', 'false');
  drawingSubmitted = false;
  el('btn-draw-submit').disabled = false;
  el('draw-status').textContent = '주제에 맞게 그린 뒤 제출하세요. 시간이 끝나면 자동 제출됩니다.';
}

function drawingPoint(event) {
  const rect = drawingCanvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (drawingCanvas.width / rect.width),
    y: (event.clientY - rect.top) * (drawingCanvas.height / rect.height),
  };
}

drawingCanvas = el('draw-canvas');
drawingCanvas.addEventListener('pointerdown', event => {
  if (drawingSubmitted) return;
  drawingInProgress = true;
  drawingCanvas.setPointerCapture?.(event.pointerId);
  const point = drawingPoint(event);
  drawingContext.beginPath();
  drawingContext.moveTo(point.x, point.y);
});
drawingCanvas.addEventListener('pointermove', event => {
  if (!drawingInProgress || drawingSubmitted) return;
  const point = drawingPoint(event);
  drawingContext.strokeStyle = drawingEraser ? '#fff' : el('draw-color').value;
  drawingContext.lineWidth = Number(el('draw-size').value);
  drawingContext.lineTo(point.x, point.y);
  drawingContext.stroke();
  drawingContext.beginPath();
  drawingContext.moveTo(point.x, point.y);
});
['pointerup', 'pointercancel', 'pointerleave'].forEach(type => {
  drawingCanvas.addEventListener(type, () => { drawingInProgress = false; });
});

el('btn-draw-clear').addEventListener('click', () => {
  if (drawingSubmitted) return;
  drawingContext.fillStyle = '#fff';
  drawingContext.fillRect(0, 0, drawingCanvas.width, drawingCanvas.height);
});

el('btn-draw-eraser').addEventListener('click', () => {
  if (drawingSubmitted) return;
  drawingEraser = !drawingEraser;
  el('btn-draw-eraser').classList.toggle('active', drawingEraser);
  el('btn-draw-eraser').setAttribute('aria-pressed', String(drawingEraser));
  el('draw-status').textContent = drawingEraser
    ? '부분 지우개가 켜졌어요. 굵기만큼 지워집니다.'
    : '그리기 모드로 돌아왔어요.';
});

function submitDrawing() {
  if (drawingSubmitted || !drawingCanvas) return;
  drawingSubmitted = true;
  el('btn-draw-submit').disabled = true;
  const exportCanvas = document.createElement('canvas');
  exportCanvas.width = 480;
  exportCanvas.height = 320;
  const exportContext = exportCanvas.getContext('2d');
  exportContext.fillStyle = '#fff';
  exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
  exportContext.drawImage(drawingCanvas, 0, 0, exportCanvas.width, exportCanvas.height);
  const imageDataUrl = exportCanvas.toDataURL('image/jpeg', 0.62);
  socket.emit('drawing_submit', { imageDataUrl }, result => {
    if (result?.error) {
      drawingSubmitted = false;
      el('btn-draw-submit').disabled = false;
      el('draw-status').textContent = '제출에 실패했어요. 다시 시도해 주세요.';
      return;
    }
    el('draw-status').textContent = '제출 완료! 다른 참가자들의 그림을 기다리는 중...';
  });
}

el('btn-draw-submit').addEventListener('click', submitDrawing);

socket.on('drawing_progress', ({ submittedCount, total }) => {
  if (state.phase === 'drawing') el('draw-status').textContent = `${submittedCount}/${total}명 제출 완료`;
});

function renderDrawingGallery(drawings) {
  const gallery = el('draw-gallery');
  gallery.innerHTML = '';
  drawingVoteSubmitted = false;
  drawingVoteTargetId = null;
  drawingVotePending = false;
  drawings.forEach(drawing => {
    const card = document.createElement('div');
    card.className = `draw-card${drawing.playerId === state.myId ? ' me' : ''}`;
    const image = document.createElement('img');
    image.src = drawing.imageDataUrl;
    image.alt = `그림 ${drawings.indexOf(drawing) + 1}`;
    const name = document.createElement('span');
    name.className = 'draw-card-name';
    name.textContent = drawing.playerId === state.myId ? '내 그림' : `그림 ${drawings.indexOf(drawing) + 1}`;
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = drawing.playerId === state.myId ? '내 그림' : '이 그림에 투표';
    button.disabled = drawing.playerId === state.myId;
    button.addEventListener('click', () => {
      if (drawingVotePending || drawingVoteTargetId === drawing.playerId) return;
      drawingVotePending = true;
      socket.emit('drawing_vote', { targetId: drawing.playerId }, result => {
        drawingVotePending = false;
        if (result?.error) return;
        drawingVoteSubmitted = true;
        drawingVoteTargetId = drawing.playerId;
        document.querySelectorAll('#draw-gallery button').forEach(btn => { btn.classList.remove('selected'); });
        button.classList.add('selected');
        el('draw-vote-help').textContent = '투표 완료! 다른 그림을 누르면 투표를 변경할 수 있어요.';
      });
    });
    card.append(image, name, button);
    gallery.appendChild(card);
  });
  if (drawings.length <= 1) el('draw-vote-help').textContent = '투표할 다른 사람의 그림이 없어요.';
  else el('draw-vote-help').textContent = '내 그림을 제외하고 가장 잘 그린 그림을 골라주세요.';
}

socket.on('drawing_vote_progress', ({ votedCount, total }) => {
  el('draw-vote-progress').textContent = `${votedCount}/${total}명 투표 완료`;
});

socket.on('drawing_round_result', ({ round, totalRounds, topic, winners, scores }) => {
  showView('view-drawing');
  el('draw-round-num').textContent = `(${round}/${totalRounds}라운드 결과)`;
  el('draw-topic').textContent = `주제: ${topic}`;
  el('draw-canvas-area').classList.add('hidden');
  el('draw-voting-area').classList.add('hidden');
  const winnerText = winners.length > 0 ? `${winners.join(', ')}님이 이번 라운드 우승!` : '이번 라운드는 득표자가 없어요.';
  const scoreText = scores.map(p => `${p.name} ${p.score}점`).join(' · ');
  el('draw-round-result').textContent = `${winnerText}\n현재 누적 점수: ${scoreText}`;
  el('draw-round-result').classList.remove('hidden');
});

// ---------- memory match game ----------
let memoryCurrentTurnId = null;
let memoryPreview = false;

function updateMemoryTurnLabel(turnPlayerName, matchedCount, totalCards) {
  const isMe = memoryCurrentTurnId === state.myId;
  el('memory-turn-label').textContent = isMe
    ? '🟢 내 턴 — 카드 두 장을 선택하세요.'
    : `현재 턴: ${turnPlayerName || '다른 참가자'}님`;
  el('memory-status').textContent = `${matchedCount / 2} / ${totalCards / 2}쌍 완성`;
}

function memoryErrorMessage(code) {
  return {
    NOT_YOUR_TURN: '아직 내 턴이 아니에요.',
    CARD_ALREADY_REVEALED: '이미 맞춘 카드거나 뒤집힌 카드예요.',
  }[code] || '카드를 선택할 수 없어요.';
}

function renderMemoryBoard(cards, preview = false) {
  memoryPreview = preview;
  const board = el('memory-board');
  board.innerHTML = '';
  cards.forEach(card => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'memory-card';
    const revealed = preview || card.symbol !== null;
    if (revealed) {
      button.classList.add(card.matched ? 'matched' : 'revealed');
      button.textContent = card.symbol || '';
    } else {
      button.textContent = '❔';
    }
    const canSelect = !preview && state.phase === 'memory_playing'
      && memoryCurrentTurnId === state.myId && !revealed;
    button.disabled = !canSelect;
    button.addEventListener('click', () => {
      if (!canSelect) return;
      socket.emit('memory_select', { index: card.index }, result => {
        if (result?.error) el('memory-status').textContent = memoryErrorMessage(result.error);
      });
    });
    board.appendChild(button);
  });
}

socket.on('memory_state', ({ phase, cards, matchedCount, totalCards, turnPlayerId, turnPlayerName }) => {
  if (phase === 'memory_preview') return;
  memoryCurrentTurnId = turnPlayerId;
  updateMemoryTurnLabel(turnPlayerName, matchedCount, totalCards);
  renderMemoryBoard(cards || []);
});

socket.on('memory_pair_result', ({ matched, playerName }) => {
  el('memory-status').textContent = matched
    ? `🎉 ${playerName}님이 짝을 맞혔어요!`
    : '아쉬워요. 카드를 다시 뒤집습니다.';
});

// ---------- coffee-buy game ----------
let coffeeChoiceSubmitted = false;

function renderCoffeeDrinks(drinks) {
  const area = el('coffee-drinks');
  area.innerHTML = '';
  coffeeChoiceSubmitted = false;
  drinks.forEach((drink, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'coffee-drink';
    button.textContent = drink;
    button.addEventListener('click', () => {
      if (coffeeChoiceSubmitted) return;
      socket.emit('coffee_choice', { drinkIndex: index }, result => {
        if (result?.error) return;
        coffeeChoiceSubmitted = true;
        document.querySelectorAll('#coffee-drinks button').forEach(btn => { btn.disabled = true; });
        button.classList.add('selected');
        el('coffee-status').textContent = '선택 완료! 다른 참가자들의 선택을 기다리는 중...';
      });
    });
    area.appendChild(button);
  });
}

let coffeeRpsSubmitted = false;

function renderCoffeeRps(finalists) {
  const area = el('coffee-rps-area');
  area.classList.remove('hidden');
  coffeeRpsSubmitted = false;
  const finalistArea = el('coffee-rps-finalists');
  finalistArea.innerHTML = '';
  finalists.forEach(finalist => {
    const badge = document.createElement('span');
    badge.className = 'coffee-rps-finalist';
    badge.textContent = finalist.name;
    finalistArea.appendChild(badge);
  });

  const isFinalist = finalists.some(finalist => finalist.id === state.myId);
  const buttons = document.querySelectorAll('#coffee-rps-buttons button');
  buttons.forEach(button => {
    button.disabled = !isFinalist;
    button.classList.remove('selected');
    button.onclick = () => {
      if (coffeeRpsSubmitted || !isFinalist) return;
      socket.emit('coffee_rps_choice', { choice: button.dataset.rpsChoice }, result => {
        if (result?.error) {
          el('coffee-rps-status').textContent = '이미 선택했거나 선택할 수 없는 상태입니다.';
          return;
        }
        coffeeRpsSubmitted = true;
        buttons.forEach(item => { item.disabled = true; });
        button.classList.add('selected');
        el('coffee-rps-status').textContent = '선택 완료! 상대의 선택을 기다리는 중...';
      });
    };
  });
  el('coffee-rps-status').textContent = isFinalist
    ? '가위, 바위, 보 중 하나를 선택하세요.'
    : '최종 결승 참가자들의 선택을 기다리는 중입니다.';
}

socket.on('coffee_choice_progress', ({ chosenCount, total }) => {
  el('coffee-status').textContent = `${chosenCount}/${total}명 선택 완료`;
});

socket.on('coffee_rps_progress', ({ chosenCount, total }) => {
  el('coffee-rps-status').textContent = `${chosenCount}/${total}명 선택 완료`;
});

socket.on('coffee_rps_result', ({ draw, winnerName, buyerName, choices = [], autoSelectedNames = [] }) => {
  const choiceText = choices.map(item => `${item.name}: ${item.choice}`).join(' · ');
  const autoText = autoSelectedNames.length > 0
    ? ` 시간 초과로 자동 선택: ${autoSelectedNames.join(', ')}`
    : '';
  el('coffee-rps-status').textContent = draw
    ? `무승부! 다시 선택합니다. (${choiceText})${autoText}`
    : `${winnerName}님 승리! ${buyerName}님이 커피를 삽니다. (${choiceText})${autoText}`;
  if (!draw) {
    document.querySelectorAll('#coffee-rps-buttons button').forEach(button => { button.disabled = true; });
  }
});

socket.on('coffee_round_result', ({ round, drinkResults, safeNames, remainingNames, autoSelectedNames }) => {
  const lines = drinkResults.map(result => {
    const names = result.names.join(', ');
    return `${result.drink}: ${names} — ${result.unique ? '✅ 커피쏘기에서 제외' : '🔁 다음 라운드'}`;
  });
  if (autoSelectedNames.length > 0) lines.push(`시간 초과 자동 선택: ${autoSelectedNames.join(', ')}`);
  lines.push(`이번 라운드 제외: ${safeNames.join(', ') || '없음'}`);
  lines.push(`다음 라운드 참가: ${remainingNames.join(', ') || '없음'}`);
  el('coffee-round-result').textContent = `${round}라운드 결과\n${lines.join('\n')}`;
  el('coffee-round-result').classList.remove('hidden');
  el('coffee-drinks').innerHTML = '';
  el('coffee-rps-area').classList.add('hidden');
  el('coffee-status').textContent = '다음 라운드를 준비하는 중...';
});

// ---------- Seoul subway line quiz ----------
let subwayAnswerLocked = false;
let subwaySelectedLines = new Set();

function renderSubwayChoices(choices) {
  const area = el('subway-lines');
  area.innerHTML = '';
  subwayAnswerLocked = false;
  subwaySelectedLines = new Set();
  el('btn-subway-submit').disabled = true;
  choices.forEach(choice => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'subway-line';
    button.dataset.line = choice.id;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = choice.label;
    button.addEventListener('click', () => {
      if (subwayAnswerLocked) return;
      if (subwaySelectedLines.has(choice.id)) {
        subwaySelectedLines.delete(choice.id);
        button.classList.remove('selected');
        button.setAttribute('aria-pressed', 'false');
      } else {
        subwaySelectedLines.add(choice.id);
        button.classList.add('selected');
        button.setAttribute('aria-pressed', 'true');
      }
      el('btn-subway-submit').disabled = subwaySelectedLines.size === 0;
    });
    area.appendChild(button);
  });
}

el('btn-subway-submit').addEventListener('click', () => {
  if (subwayAnswerLocked || subwaySelectedLines.size === 0) return;
  socket.emit('subway_answer', { lines: [...subwaySelectedLines] }, result => {
    if (result?.error) return;
    if (result?.ok) {
      subwayAnswerLocked = true;
      el('btn-subway-submit').disabled = true;
      document.querySelectorAll('#subway-lines button').forEach(btn => { btn.disabled = true; });
    } else {
      el('subway-round-msg').textContent = '호선을 모두 정확히 선택해야 해요. 다시 확인해주세요.';
    }
  });
});

socket.on('subway_wrong', ({ selectedLines = [] }) => {
  selectedLines.forEach(line => {
    const button = [...document.querySelectorAll('#subway-lines button')]
      .find(btn => btn.dataset.line === line);
    button?.classList.add('wrong');
    if (button) setTimeout(() => button.classList.remove('wrong'), 500);
  });
  el('subway-round-msg').textContent = '아니에요! 환승역은 모든 호선을 정확히 골라야 해요.';
});

socket.on('subway_round_result', ({ station, answerLines, winnerName }) => {
  subwayAnswerLocked = true;
  const buttons = [...document.querySelectorAll('#subway-lines button')];
  const labels = answerLines.map(line => buttons.find(btn => btn.dataset.line === line)?.textContent || line);
  buttons.forEach(button => {
    button.disabled = true;
    if (answerLines.includes(button.dataset.line)) button.classList.add('correct');
  });
  el('btn-subway-submit').disabled = true;
  el('subway-round-msg').textContent = winnerName
    ? `🎉 ${winnerName}님 정답! ${station}은 ${labels.join(', ')}입니다.`
    : `시간 종료! 정답: ${labels.join(', ')}`;
  renderScoreBoard('subway-score-board');
});

// ---------- photo quiz ----------
el('btn-quiz-guess').addEventListener('click', submitQuizGuess);
el('quiz-answer-guess').addEventListener('keydown', e => {
  if (e.key === 'Enter') submitQuizGuess();
});
function submitQuizGuess() {
  const input = el('quiz-answer-guess');
  const guess = input.value.trim();
  if (!guess) return;
  socket.emit('quiz_answer', { guess });
}

socket.on('quiz_wrong', () => {
  el('quiz-round-msg').textContent = '틀렸어요! 다시 시도해보세요.';
});

socket.on('quiz_round_result', ({ correct, answer, winnerName }) => {
  el('quiz-round-msg').textContent = correct
    ? `🎉 정답: ${answer} (${winnerName}님이 맞혔어요!)`
    : `시간 종료! 정답은 ${answer}였습니다.`;
  renderScoreBoard('quiz-score-board');
});

// ---------- cs quiz ----------
function renderCsChoices(choices) {
  const area = el('cs-choices');
  area.innerHTML = '';
  choices.forEach((choice, idx) => {
    const btn = document.createElement('button');
    btn.className = 'choice-btn';
    btn.textContent = choice;
    btn.addEventListener('click', () => {
      document.querySelectorAll('#cs-choices .choice-btn').forEach(b => (b.disabled = true));
      socket.emit('cs_answer', { choiceIndex: idx });
    });
    area.appendChild(btn);
  });
}

socket.on('cs_wrong', ({ choiceIndex }) => {
  const btns = document.querySelectorAll('#cs-choices .choice-btn');
  if (btns[choiceIndex]) btns[choiceIndex].classList.add('wrong');
});

socket.on('cs_round_result', ({ correct, answerIndex, winnerName }) => {
  const btns = document.querySelectorAll('#cs-choices .choice-btn');
  btns.forEach(b => (b.disabled = true));
  if (btns[answerIndex]) btns[answerIndex].classList.add('correct');
  el('cs-round-msg').textContent = correct
    ? `🎉 정답! (${winnerName}님이 맞혔어요!)`
    : '시간 종료! 아무도 못 맞혔습니다.';
  renderScoreBoard('cs-score-board');
});

// ---------- stack game (real physics, driven by server matter.js ticks) ----------
let stackWorld = { worldWidth: 280, groundY: 420 };
let stackIsMyTurn = false;
let stackBlockWidth = 60;
let stackIsRainbow = false;
let stackPreviewOffset = 0;

let stackCameraShift = 0; // world units — pans the view down as the tower grows, never decreases
const STACK_CAMERA_MARGIN = 50; // keep at least this much world-space headroom above the topmost block

function renderStackBlocks(blocks) {
  const wrap = el('stack-tower-wrap');
  const tower = el('stack-tower');
  const rect = wrap.getBoundingClientRect();
  const scaleX = rect.width / stackWorld.worldWidth;
  const scaleY = rect.height / stackWorld.groundY;

  const list = blocks || [];
  if (list.length > 0) {
    const minY = Math.min(...list.map(b => b.y - b.height / 2));
    const neededShift = Math.max(0, STACK_CAMERA_MARGIN - minY);
    if (neededShift > stackCameraShift) stackCameraShift = neededShift;
  }

  const existing = tower.children;
  while (existing.length > list.length) tower.removeChild(tower.lastChild);
  while (existing.length < list.length) {
    const div = document.createElement('div');
    div.className = 'stack-block';
    tower.appendChild(div);
  }
  list.forEach((b, i) => {
    const div = tower.children[i];
    div.className = b.isRainbow ? 'stack-block rainbow' : 'stack-block';
    div.style.width = `${b.width * scaleX}px`;
    div.style.height = `${b.height * scaleY}px`;
    div.style.left = `${b.x * scaleX}px`;
    div.style.top = `${(b.y + stackCameraShift) * scaleY}px`;
    div.style.transform = `translate(-50%, -50%) rotate(${b.angle}rad)`;
  });
}

function renderPreviewBlock() {
  const block = el('stack-drag-block');
  const lane = el('stack-drag-lane');
  const rect = lane.getBoundingClientRect();
  const scaleX = rect.width / (stackWorld.worldWidth || 280);
  block.style.width = `${stackBlockWidth * scaleX}px`;
  const percent = 50 + (stackPreviewOffset / (stackWorld.worldWidth / 2)) * 50;
  block.style.left = `${percent}%`;
  block.classList.toggle('rainbow', !!stackIsRainbow);
  block.classList.toggle('others-turn', !stackIsMyTurn);
}

// Block auto-oscillates left-right; player times the Space press to drop it.
const STACK_OSC_AMPLITUDE = 130;
const STACK_OSC_PERIOD_MS = 1600;
let stackOscillating = false;
let stackOscRAF = null;
let stackOscStart = 0;

function startStackOscillation() {
  stopStackOscillation();
  stackOscillating = true;
  stackOscStart = performance.now();
  let lastEmit = 0;
  function tick(now) {
    if (!stackOscillating) return;
    const t = (now - stackOscStart) / STACK_OSC_PERIOD_MS;
    stackPreviewOffset = Math.round(STACK_OSC_AMPLITUDE * Math.sin(t * 2 * Math.PI));
    renderPreviewBlock();
    if (now - lastEmit > 100) {
      socket.emit('stack_preview', { offset: stackPreviewOffset });
      lastEmit = now;
    }
    stackOscRAF = requestAnimationFrame(tick);
  }
  stackOscRAF = requestAnimationFrame(tick);
}

function stopStackOscillation() {
  stackOscillating = false;
  if (stackOscRAF) cancelAnimationFrame(stackOscRAF);
  stackOscRAF = null;
}

document.addEventListener('keydown', e => {
  if (!stackIsMyTurn) return;
  if (e.key === ' ' || e.code === 'Space') {
    stopStackOscillation();
    socket.emit('stack_place', { offset: stackPreviewOffset });
    stackIsMyTurn = false;
    el('stack-key-guide').classList.add('hidden');
    e.preventDefault();
  }
});

socket.on('stack_preview_update', ({ offset }) => {
  if (stackIsMyTurn) return; // my own moves already render locally
  stackPreviewOffset = offset;
  renderPreviewBlock();
});

socket.on('stack_dropped', ({ placedBy }) => {
  el('stack-turn-msg').textContent = `${placedBy}님이 블록을 떨어뜨렸습니다...`;
  el('stack-key-guide').classList.add('hidden');
  stackIsMyTurn = false;
});

socket.on('stack_tick', ({ blocks }) => {
  renderStackBlocks(blocks);
});

socket.on('stack_rainbow_clear', ({ clearedBy, blocks }) => {
  el('stack-turn-msg').textContent = `🌈 ${clearedBy}님의 무지개 블록이 탑을 싹 지웠습니다!`;
  el('stack-height-label').textContent = '높이: 1단';
  stackCameraShift = 0;
  renderStackBlocks(blocks);
});

socket.on('stack_over', ({ loserName, height }) => {
  showView('view-result');
  el('result-title').textContent = `😱 ${loserName}님이 탑을 무너뜨렸습니다!`;
  el('result-word-info').textContent = `${height}단까지 쌓았습니다.`;
  el('result-roles').innerHTML = '';
  el('result-score-board').classList.add('hidden');
  updateResultActions();
});

// ---------- SSAFY onion-style solo game ----------
const ssafyCanvas = el('ssafy-canvas');
const ssafyCtx = ssafyCanvas.getContext('2d');
const SSAFY_WIDTH = ssafyCanvas.width;
const SSAFY_HEIGHT = ssafyCanvas.height;
const SSAFY_GROUND = SSAFY_HEIGHT - 24;
const SSAFY_GRAVITY = 0.45;
const SSAFY_RESTITUTION = 0.34;
const SSAFY_FRICTION = 0.82;
const SSAFY_AIR_DRAG = 0.998;
const SSAFY_SUBSTEPS = 3;
const SSAFY_SETTLE_SPEED = 0.8;
const SSAFY_SETTLE_DELAY_MS = 180;
const SSAFY_STUCK_RELEASE_MS = 1200;
const SSAFY_DROP_START_SPEED = 0.9;
const SSAFY_MAX_GAME_LEVEL = 30;
let ssafyImages = [];
let ssafyImageObjects = [];
let ssafyBalls = [];
let ssafyCurrent = null;
let ssafyDropX = SSAFY_WIDTH / 2;
let ssafyDropCount = 0;
let ssafyScore = 0;
let ssafyHighestLevel = 1;
let ssafyDropping = false;
let ssafyGameOver = false;
let ssafyFrame = null;
let ssafyWatchdog = null;
let ssafyLastFrameAt = 0;

function ssafyRadius(level) {
  // 1단계는 작게 시작하고, 단계가 올라갈수록 확실히 커지게 합니다.
  return 13 + Math.pow(Math.max(0, level - 1), 1.08) * 5.05;
}

function ssafyMass(ball) {
  const radius = ssafyRadius(ball.level);
  return radius * radius * (0.72 + ball.level * 0.1);
}

function ssafySetHud() {
  el('ssafy-score-label').textContent = `점수 ${ssafyScore}`;
  el('ssafy-level-label').textContent = `최고 단계 ${ssafyHighestLevel}`;
  const me = state.players.find(player => player.id === state.myId);
  if (me) me.score = ssafyScore;
  renderLiveScorePanel();
}

function ssafyPickLevel() {
  const maxLevel = Math.min(6, 2 + Math.floor(ssafyDropCount / 8));
  const roll = Math.random();
  if (maxLevel <= 2) return roll < 0.72 ? 1 : 2;
  if (maxLevel <= 3) return roll < 0.55 ? 1 : roll < 0.87 ? 2 : 3;
  if (maxLevel <= 4) return roll < 0.42 ? 1 : roll < 0.73 ? 2 : roll < 0.93 ? 3 : 4;
  return Math.max(1, Math.min(maxLevel, Math.floor(Math.random() * maxLevel) + 1));
}

function ssafyDrawBall(ball, alpha = 1) {
  const radius = ssafyRadius(ball.level);
  ssafyCtx.save();
  ssafyCtx.globalAlpha = alpha;
  ssafyCtx.beginPath();
  ssafyCtx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
  ssafyCtx.clip();
  const image = ssafyImageObjects[ball.level - 1];
  if (image?.complete && image.naturalWidth) {
    const size = radius * 2;
    ssafyCtx.drawImage(image, ball.x - radius, ball.y - radius, size, size);
  } else {
    ssafyCtx.fillStyle = `hsl(${(ball.level * 43) % 360} 72% 65%)`;
    ssafyCtx.fill();
  }
  ssafyCtx.restore();
  ssafyCtx.beginPath();
  ssafyCtx.arc(ball.x, ball.y, radius, 0, Math.PI * 2);
  ssafyCtx.strokeStyle = 'rgba(86,45,16,0.7)';
  ssafyCtx.lineWidth = 3;
  ssafyCtx.stroke();
  ssafyCtx.beginPath();
  ssafyCtx.ellipse(ball.x, ball.y + radius * 0.78, radius * 0.72, Math.max(2, radius * 0.12), 0, 0, Math.PI * 2);
  ssafyCtx.fillStyle = 'rgba(86,45,16,0.16)';
  ssafyCtx.fill();
  return;
  ssafyCtx.fillStyle = 'rgba(255,255,255,0.88)';
  ssafyCtx.font = `800 ${Math.max(8, Math.min(13, radius * 0.42))}px sans-serif`;
  ssafyCtx.textAlign = 'center';
  ssafyCtx.fillText(`${ball.level}단계`, ball.x, ball.y + 5);
}

function ssafyRender() {
  ssafyCtx.clearRect(0, 0, SSAFY_WIDTH, SSAFY_HEIGHT);
  ssafyCtx.fillStyle = '#fff8eb';
  ssafyCtx.fillRect(0, 0, SSAFY_WIDTH, SSAFY_HEIGHT);
  ssafyCtx.fillStyle = '#d7a75f';
  ssafyCtx.fillRect(0, SSAFY_GROUND, SSAFY_WIDTH, SSAFY_HEIGHT - SSAFY_GROUND);
  ssafyBalls.forEach(ball => ssafyDrawBall(ball));
  if (ssafyCurrent && !ssafyDropping) ssafyDrawBall({ ...ssafyCurrent, x: ssafyDropX, y: 42 }, 0.72);
}

function ssafyCanMerge(a, b) {
  if (a.level !== b.level || a.level >= SSAFY_MAX_GAME_LEVEL) return false;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const distance = Math.sqrt(dx * dx + dy * dy);
  return distance <= ssafyRadius(a.level) + ssafyRadius(b.level) + 1;
}

function ssafyResolveMerges() {
  let activeWasMerged = false;
  let merged = true;
  while (merged) {
    merged = false;
    for (let i = 0; i < ssafyBalls.length; i += 1) {
      for (let j = i + 1; j < ssafyBalls.length; j += 1) {
        if (!ssafyCanMerge(ssafyBalls[i], ssafyBalls[j])) continue;
        const first = ssafyBalls[i];
        const second = ssafyBalls[j];
        const firstMass = ssafyMass(first);
        const secondMass = ssafyMass(second);
        const totalMass = firstMass + secondMass;
        const level = first.level + 1;
        activeWasMerged ||= first.isDropping || second.isDropping;
        ssafyBalls.splice(j, 1);
        ssafyBalls.splice(i, 1);
        ssafyBalls.push({
          level,
          x: (first.x * firstMass + second.x * secondMass) / totalMass,
          y: (first.y * firstMass + second.y * secondMass) / totalMass,
          vx: (first.vx * firstMass + second.vx * secondMass) / totalMass,
          vy: -Math.max(1.4, (Math.abs(first.vy) + Math.abs(second.vy)) * 0.14),
          settleMs: 0,
          isDropping: false,
        });
        ssafyScore = Math.min(10, ssafyScore + 1);
        ssafyHighestLevel = Math.max(ssafyHighestLevel, level);
        ssafySetHud();
        merged = true;
        break;
      }
      if (merged) break;
    }
  }
  return activeWasMerged;
}

function ssafyPrepareNext() {
  if (ssafyGameOver) return;
  ssafyDropCount += 1;
  ssafyCurrent = { level: ssafyPickLevel(), x: ssafyDropX, y: 42, vx: 0, vy: 0, settleMs: 0, dropMs: 0, isDropping: false };
  ssafyDropping = false;
  el('ssafy-status').textContent = '위치를 정하고 클릭 또는 Space로 떨어뜨리세요.';
}

function ssafyIsFiniteBall(ball) {
  return Boolean(ball)
    && Number.isFinite(ball.level)
    && ball.level >= 1
    && ball.level <= SSAFY_MAX_GAME_LEVEL
    && Number.isFinite(ball.x)
    && Number.isFinite(ball.y)
    && Number.isFinite(ball.vx)
    && Number.isFinite(ball.vy)
    && Number.isFinite(ball.settleMs);
}

function ssafyClampBall(ball) {
  if (!ssafyIsFiniteBall(ball)) return false;
  const radius = ssafyRadius(ball.level);
  ball.x = Math.max(radius, Math.min(SSAFY_WIDTH - radius, ball.x));
  ball.y = Math.max(radius, Math.min(SSAFY_GROUND - radius, ball.y));
  ball.vx = Math.max(-24, Math.min(24, ball.vx));
  ball.vy = Math.max(-24, Math.min(24, ball.vy));
  return true;
}

function ssafyRecoverPhysics(error) {
  console.warn('SSAFY physics loop recovered', error);
  ssafyBalls = ssafyBalls.filter(ssafyClampBall);
  ssafyCurrent = null;
  ssafyDropping = false;
  ssafyLastFrameAt = performance.now();
  if (ssafyGameOver) return;
  el('ssafy-status').textContent = '물리 상태를 복구했어요. 다시 떨어뜨릴 수 있습니다.';
  ssafyPrepareNext();
  ssafyRender();
  ssafyFrame = requestAnimationFrame(ssafyStep);
}

function ssafyFinish() {
  if (ssafyGameOver) return;
  ssafyGameOver = true;
  ssafyDropping = false;
  if (ssafyFrame) cancelAnimationFrame(ssafyFrame);
  if (ssafyWatchdog) clearInterval(ssafyWatchdog);
  ssafyWatchdog = null;
  el('ssafy-status').textContent = `게임오버! ${ssafyHighestLevel}단계까지 성장했어요.`;
  socket.emit('ssafy_game_over', { score: ssafyScore, highestLevel: ssafyHighestLevel });
}

function ssafyKeepInside(ball) {
  if (!ssafyIsFiniteBall(ball)) return false;
  const radius = ssafyRadius(ball.level);
  if (ball.x - radius < 0) {
    ball.x = radius;
    if (ball.vx < 0) ball.vx = -ball.vx * SSAFY_RESTITUTION;
  } else if (ball.x + radius > SSAFY_WIDTH) {
    ball.x = SSAFY_WIDTH - radius;
    if (ball.vx > 0) ball.vx = -ball.vx * SSAFY_RESTITUTION;
  }
  if (ball.y + radius > SSAFY_GROUND) {
    ball.y = SSAFY_GROUND - radius;
    // 바닥에 가만히 놓인 공의 미세한 중력 보정은 충돌로 보지 않습니다.
    // 실제로 내려와 부딪힌 경우에만 튕김과 마찰을 적용해 바닥 공이 무거워지지 않게 합니다.
    if (ball.vy > 0) {
      ball.vy = -ball.vy * SSAFY_RESTITUTION;
      ball.vx *= SSAFY_FRICTION;
    }
    if (Math.abs(ball.vy) < 0.06) ball.vy = 0;
  }
  return true;
}

function ssafySnapRestingBallToGround(ball) {
  if (!ssafyIsFiniteBall(ball)) return;
  const radius = ssafyRadius(ball.level);
  const gap = SSAFY_GROUND - (ball.y + radius);
  const isNearGround = gap >= 0 && gap <= SSAFY_GROUND_SNAP_GAP;
  const isNearlyResting = ball.vy >= -0.05 && ball.vy <= 0.05;
  if (!isNearGround || !isNearlyResting) return;
  ball.y = SSAFY_GROUND - radius;
  if (Math.abs(ball.vy) < 0.35) ball.vy = 0;
  // 바닥에 정착한 공은 충돌 보정으로 생긴 미세한 수평 드리프트를 제거합니다.
  ball.vx = 0;
}

function ssafyResolveCollision(first, second) {
  if (!ssafyIsFiniteBall(first) || !ssafyIsFiniteBall(second)) return false;
  const dx = second.x - first.x;
  const dy = second.y - first.y;
  const minimumDistance = ssafyRadius(first.level) + ssafyRadius(second.level);
  const distance = Math.sqrt(dx * dx + dy * dy);
  if (distance >= minimumDistance) return false;

  const safeDistance = distance || 0.001;
  const nx = dx / safeDistance;
  const ny = dy / safeDistance;
  const overlap = minimumDistance - safeDistance;
  const firstMass = ssafyMass(first);
  const secondMass = ssafyMass(second);
  const inverseFirst = 1 / firstMass;
  const inverseSecond = 1 / secondMass;
  const inverseTotal = inverseFirst + inverseSecond;

  // 가벼운 공이 더 많이 밀려나도록 분리합니다. 작은 공이 틈을 비집고 들어갈 수 있어요.
  first.x -= nx * overlap * (inverseFirst / inverseTotal);
  first.y -= ny * overlap * (inverseFirst / inverseTotal);
  second.x += nx * overlap * (inverseSecond / inverseTotal);
  second.y += ny * overlap * (inverseSecond / inverseTotal);

  const relativeVelocity = (second.vx - first.vx) * nx + (second.vy - first.vy) * ny;
  if (relativeVelocity < 0) {
    const impulse = -(1 + SSAFY_RESTITUTION) * relativeVelocity / inverseTotal;
    first.vx -= impulse * inverseFirst * nx;
    first.vy -= impulse * inverseFirst * ny;
    second.vx += impulse * inverseSecond * nx;
    second.vy += impulse * inverseSecond * ny;
  }

  const tangentX = -ny;
  const tangentY = nx;
  const tangentVelocity = (second.vx - first.vx) * tangentX + (second.vy - first.vy) * tangentY;
  // 공끼리 비스듬히 부딪힐 때 접선 마찰이 낙하 속도까지 과하게 줄이지 않도록 합니다.
  const frictionImpulse = tangentVelocity * 0.035;
  first.vx += frictionImpulse * inverseFirst * tangentX;
  first.vy += frictionImpulse * inverseFirst * tangentY;
  second.vx -= frictionImpulse * inverseSecond * tangentX;
  second.vy -= frictionImpulse * inverseSecond * tangentY;
  return true;
}

function ssafyKeepWallSlide(ball) {
  if (!ssafyIsFiniteBall(ball) || !ball.isDropping) return;
  const radius = ssafyRadius(ball.level);
  const atWall = ball.x <= radius + 0.5 || ball.x >= SSAFY_WIDTH - radius - 0.5;
  if (atWall && ball.y + radius < SSAFY_GROUND - 2 && ball.vy >= 0) {
    ball.vy = Math.max(ball.vy, SSAFY_WALL_SLIDE_SPEED);
  }
}

function ssafyHasSupport(ball) {
  if (!ssafyIsFiniteBall(ball)) return false;
  const radius = ssafyRadius(ball.level);
  if (ball.y + radius >= SSAFY_GROUND - 1) return true;
  return ssafyBalls.some(other => other !== ball
    && Math.hypot(ball.x - other.x, ball.y - other.y) <= radius + ssafyRadius(other.level) + 1);
}

function ssafyStep(now = performance.now()) {
  if (ssafyGameOver) return;
  try {
  ssafyBalls = ssafyBalls.filter(ssafyIsFiniteBall);
  const elapsedMs = ssafyLastFrameAt ? Math.min(133, Math.max(8, now - ssafyLastFrameAt)) : 1000 / 60;
  const frameScale = Math.min(8, elapsedMs / (1000 / 60));
  ssafyLastFrameAt = now;
  const substepScale = frameScale / SSAFY_SUBSTEPS;
  let activeWasMerged = false;
  for (let substep = 0; substep < SSAFY_SUBSTEPS; substep += 1) {
    ssafyBalls.forEach(ball => {
      ball.vy += SSAFY_GRAVITY * substepScale;
      ball.x += ball.vx * substepScale;
      ball.y += ball.vy * substepScale;
      ball.vx *= Math.pow(SSAFY_AIR_DRAG, substepScale);
      ball.vy *= Math.pow(SSAFY_AIR_DRAG, substepScale);
      ssafyKeepInside(ball);
    });

    // 여러 번 분리해 밀려나는 충돌을 안정적으로 처리합니다.
    for (let pass = 0; pass < 2; pass += 1) {
      for (let i = 0; i < ssafyBalls.length; i += 1) {
        for (let j = i + 1; j < ssafyBalls.length; j += 1) {
          if (ssafyCanMerge(ssafyBalls[i], ssafyBalls[j])) continue;
          ssafyResolveCollision(ssafyBalls[i], ssafyBalls[j]);
        }
      }
      ssafyBalls.forEach(ssafyKeepInside);
    }
    // 물리 충돌로 위치가 바뀐 뒤에도 같은 단계가 닿으면 즉시 합칩니다.
    activeWasMerged = ssafyResolveMerges() || activeWasMerged;
  }

  const active = ssafyBalls.find(ball => ball.isDropping);
  if (active) {
    active.dropMs = (Number.isFinite(active.dropMs) ? active.dropMs : 0) + elapsedMs;
    const speed = Math.hypot(active.vx, active.vy);
    const supported = ssafyHasSupport(active);
    if (speed < SSAFY_SETTLE_SPEED && supported) active.settleMs += elapsedMs;
    else active.settleMs = 0;
    // 바닥/스택의 미세한 진동으로 속도 기준을 계속 넘는 경우에도 다음 공을 막지 않습니다.
    const normalSettled = active.settleMs >= SSAFY_SETTLE_DELAY_MS;
    const stuckSettled = supported && active.dropMs >= SSAFY_STUCK_RELEASE_MS;
    if (normalSettled || stuckSettled) {
      active.isDropping = false;
      active.settleMs = 0;
      active.dropMs = 0;
      ssafyDropping = false;
    }
  }
  if (ssafyDropping && !active) ssafyDropping = false;
  if (!ssafyDropping && !ssafyCurrent && !ssafyGameOver) ssafyPrepareNext();

  if (activeWasMerged || !ssafyDropping) {
    const overflowing = ssafyBalls.some(ball => !ball.isDropping && ball.y - ssafyRadius(ball.level) < 18);
    if (overflowing) ssafyFinish();
  }
  ssafyRender();
  if (ssafyGameOver) return;
  ssafyFrame = requestAnimationFrame(ssafyStep);
  } catch (error) {
    ssafyRecoverPhysics(error);
  }
}

function ssafyDrop() {
  if (ssafyGameOver || ssafyDropping || !ssafyCurrent || !ssafyIsFiniteBall(ssafyCurrent)) return;
  if (!Number.isFinite(ssafyDropX)) ssafyDropX = SSAFY_WIDTH / 2;
  ssafyCurrent.x = Math.max(ssafyRadius(ssafyCurrent.level), Math.min(SSAFY_WIDTH - ssafyRadius(ssafyCurrent.level), ssafyDropX));
  ssafyCurrent.vy = SSAFY_DROP_START_SPEED;
  // 중력값은 유지하면서 시작 직후의 느린 가속 구간만 줄입니다.
  ssafyCurrent.isDropping = true;
  ssafyBalls.push(ssafyCurrent);
  ssafyCurrent = null;
  ssafyDropping = true;
  el('ssafy-status').textContent = '떨어지는 중...';
}

function startSsafyGame(images) {
  ssafyImages = images;
  ssafyImageObjects = images.map(src => { const image = new Image(); image.src = src; return image; });
  ssafyBalls = [];
  ssafyDropX = SSAFY_WIDTH / 2;
  ssafyDropCount = 0;
  ssafyScore = 0;
  ssafyHighestLevel = 1;
  ssafyDropping = false;
  ssafyGameOver = false;
  ssafyLastFrameAt = 0;
  if (ssafyWatchdog) clearInterval(ssafyWatchdog);
  ssafyWatchdog = null;
  ssafySetHud();
  ssafyPrepareNext();
  if (ssafyFrame) cancelAnimationFrame(ssafyFrame);
  ssafyStep(performance.now());
  ssafyWatchdog = setInterval(() => {
    if (ssafyGameOver || document.querySelector('#view-ssafy.hidden')) return;
    const now = performance.now();
    if (now - ssafyLastFrameAt < 900) return;
    if (ssafyFrame) cancelAnimationFrame(ssafyFrame);
    ssafyFrame = null;
    ssafyStep(now);
  }, 500);
}

function ssafyMoveDropTarget(event) {
  const rect = ssafyCanvas.getBoundingClientRect();
  if (!rect.width || !Number.isFinite(event.clientX)) return;
  const radius = ssafyCurrent ? ssafyRadius(ssafyCurrent.level) : 18;
  const canvasX = (event.clientX - rect.left) * SSAFY_WIDTH / rect.width;
  ssafyDropX = Math.max(radius, Math.min(SSAFY_WIDTH - radius, canvasX));
  if (ssafyCurrent && !ssafyDropping) ssafyCurrent.x = ssafyDropX;
}

ssafyCanvas.addEventListener('pointermove', ssafyMoveDropTarget);
ssafyCanvas.addEventListener('mousemove', ssafyMoveDropTarget);
ssafyCanvas.addEventListener('touchmove', event => {
  if (event.touches[0]) ssafyMoveDropTarget(event.touches[0]);
}, { passive: true });
ssafyCanvas.addEventListener('pointerdown', event => { event.preventDefault(); ssafyDrop(); });
el('btn-ssafy-drop').addEventListener('click', ssafyDrop);
document.addEventListener('keydown', event => {
  if (!document.querySelector('#view-ssafy:not(.hidden)')) return;

  if (!ssafyDropping && ssafyCurrent && (event.key === 'ArrowLeft' || event.key === 'ArrowRight')) {
    const direction = event.key === 'ArrowLeft' ? -1 : 1;
    const radius = ssafyRadius(ssafyCurrent.level);
    ssafyDropX = Math.max(radius, Math.min(SSAFY_WIDTH - radius, ssafyDropX + direction * 28));
    ssafyCurrent.x = ssafyDropX;
    ssafyRender();
    event.preventDefault();
    return;
  }

  if (event.key === ' ' || event.code === 'Space') {
    event.preventDefault();
    ssafyDrop();
  }
});

socket.on('ssafy_over', ({ scores = [], winners = [], highestLevel = 1 }) => {
  showScoreResult('🧅 싸피 게임 종료!', `${highestLevel}단계까지 성장 · 합성 점수 누적`, scores, winners);
});

// ---------- goalkeeper game ----------
function renderGoalkeeperShot(data) {
  const attacker = state.players.find(player => player.id === data.attackerId);
  const keeper = state.players.find(player => player.id === data.keeperId);
  const isAttacker = data.attackerId === state.myId;
  el('goalkeeper-turn-label').textContent = isAttacker
    ? `⚽ 이번 턴: 공격수 · ${attacker?.name || data.attackerName}님이 차는 차례`
    : `🧤 이번 턴: 골키퍼 · ${keeper?.name || data.keeperName}님이 막는 차례`;
  el('goalkeeper-shot-label').textContent = `${data.turnNumber}번째 공격 · ${data.shotNumber}/${data.totalShots} 슛`;
  el('goalkeeper-status').textContent = `두 사람 모두 선택 중... (${data.durationMs / 1000}초)`;
  el('goalkeeper-shot-result').classList.add('hidden');
  const ball = el('goalkeeper-ball');
  ball.classList.remove('goal-left', 'goal-right', 'saved', 'rolling');
  el('goalkeeper-score-me-name').textContent = state.players.find(player => player.id === state.myId)?.name || '나';
  el('goalkeeper-score-other-name').textContent = state.players.find(player => player.id !== state.myId)?.name || '상대';
  updateGoalkeeperScores();
  document.querySelectorAll('.goalkeeper-choice').forEach(button => {
    button.disabled = false;
    button.classList.remove('selected');
  });
  startCountdown(el('goalkeeper-timer'), data.durationMs, () => {
    document.querySelectorAll('.goalkeeper-choice').forEach(button => { button.disabled = true; });
  });
}

function updateGoalkeeperScores(scores = null) {
  const list = scores || state.players.map(player => ({ id: player.id, name: player.name, score: player.score }));
  const me = list.find(player => player.id === state.myId || player.name === state.account?.nickname);
  const other = list.find(player => player.id !== state.myId && player.name !== state.account?.nickname);
  el('goalkeeper-score-me').textContent = `${me?.score || 0}골`;
  el('goalkeeper-score-other').textContent = `${other?.score || 0}골`;
}

document.querySelectorAll('.goalkeeper-choice').forEach(button => {
  button.addEventListener('click', () => {
    document.querySelectorAll('.goalkeeper-choice').forEach(item => { item.disabled = true; item.classList.remove('selected'); });
    button.classList.add('selected');
    el('goalkeeper-status').textContent = '선택 완료! 상대의 선택을 기다리는 중...';
    socket.emit('goalkeeper_choice', { side: button.dataset.goalkeeperSide }, result => {
      if (result?.error) {
        document.querySelectorAll('.goalkeeper-choice').forEach(item => { item.disabled = false; });
        el('goalkeeper-status').textContent = '선택에 실패했어요. 다시 선택하세요.';
      }
    });
  });
});

socket.on('goalkeeper_choice_progress', ({ chosenCount, totalPlayers }) => {
  el('goalkeeper-status').textContent = `선택 현황 ${chosenCount}/${totalPlayers}명 · 상대의 선택을 기다리는 중...`;
});

socket.on('goalkeeper_shot_result', ({ attackSide, keeperSide, goal, attackerName, turnNumber, shotNumber, scores }) => {
  const sideLabel = { left: '왼쪽', right: '오른쪽' };
  const ball = el('goalkeeper-ball');
  ball.classList.remove('goal-left', 'goal-right', 'saved', 'rolling');
  void ball.offsetWidth;
  ball.classList.add(goal ? `goal-${attackSide}` : 'saved');
  const result = el('goalkeeper-shot-result');
  result.textContent = goal
    ? `⚽ 골! ${attackerName}님이 ${sideLabel[attackSide]}로 차서 성공했어요. +1골`
    : `🧤 선방! 두 사람 모두 ${sideLabel[attackSide] || '선택 없음'}을 선택했어요.`;
  result.classList.remove('hidden');
  el('goalkeeper-turn-label').textContent = `${turnNumber}번째 공격 결과`;
  el('goalkeeper-shot-label').textContent = `${shotNumber}/10 슛 결과`;
  el('goalkeeper-status').textContent = `공격: ${sideLabel[attackSide] || '시간 초과'} · 수비: ${sideLabel[keeperSide] || '시간 초과'}`;
  document.querySelectorAll('.goalkeeper-choice').forEach(button => { button.disabled = true; });
  updateGoalkeeperScores(scores);
});

socket.on('goalkeeper_over', ({ scores = [], winners = [] }) => {
  const title = winners.length > 0 ? `🏆 ${winners.join(', ')}님 승리!` : '🥅 골키퍼 게임 무승부!';
  showScoreResult(title, '양쪽 모두 공격 10회 · 골을 더 많이 넣은 사람이 승리', scores, winners);
});

// ---------- food recommendation roulette ----------
let foodRouletteSpinTimer = null;

el('foodroulette-spin').addEventListener('click', () => {
  const button = el('foodroulette-spin');
  if (button.disabled) return;
  button.disabled = true;
  el('foodroulette-status').textContent = '메뉴를 고르는 중...';
  el('foodroulette-result').textContent = '🎲 두근두근...';
  el('foodroulette-wheel').classList.remove('is-spinning');
  void el('foodroulette-wheel').offsetWidth;
  el('foodroulette-wheel').classList.add('is-spinning');
  clearTimeout(foodRouletteSpinTimer);
  foodRouletteSpinTimer = setTimeout(() => {
    socket.emit('foodroulette_spin', result => {
      if (result?.error) {
        button.disabled = false;
        el('foodroulette-status').textContent = '룰렛을 돌리지 못했어요. 다시 눌러주세요.';
      }
    });
  }, 650);
});

socket.on('foodroulette_result', ({ menu }) => {
  clearTimeout(foodRouletteSpinTimer);
  el('foodroulette-result').textContent = menu || '메뉴를 고르지 못했어요.';
  el('foodroulette-status').textContent = menu ? `오늘은 ${menu} 어때요?` : '다시 돌려보세요.';
  el('foodroulette-spin').disabled = false;
});

// ---------- band / ensemble game ----------
let bandAudioContext = null;
let bandMasterGain = null;
let bandRecordDestination = null;
let bandLocalMicStream = null;
let bandLocalMicSource = null;
let bandRecorder = null;
let bandRecordChunks = [];
let bandRecordUrl = null;
let bandUiBuilt = false;
const bandPeers = new Map();

const BAND_PIANO_NOTES = [60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71];
const BAND_PIANO_LABELS = ['C4', 'C#4', 'D4', 'D#4', 'E4', 'F4', 'F#4', 'G4', 'G#4', 'A4', 'A#4', 'B4'];
const BAND_KEYBOARD_MAP = ['a', 'w', 's', 'e', 'd', 'f', 't', 'g', 'y', 'h', 'u', 'j'];
const BAND_CHORDS = {
  C: [60, 64, 67],
  G: [55, 59, 62],
  Am: [57, 60, 64],
  F: [53, 57, 60],
  Dm: [50, 53, 57],
  Em: [52, 55, 59],
  E: [52, 56, 59],
};

function bandEnsureAudio() {
  if (!bandAudioContext) {
    bandAudioContext = new (window.AudioContext || window.webkitAudioContext)();
    bandMasterGain = bandAudioContext.createGain();
    bandMasterGain.gain.value = 0.72;
    bandMasterGain.connect(bandAudioContext.destination);
    bandRecordDestination = bandAudioContext.createMediaStreamDestination();
    bandMasterGain.connect(bandRecordDestination);
  }
  if (bandAudioContext.state === 'suspended') bandAudioContext.resume().catch(() => {});
  return bandAudioContext;
}

function bandNoteFrequency(note) {
  return 440 * Math.pow(2, (Number(note) - 69) / 12);
}

function bandPlayTone(note, instrument = 'piano', durationMs = 450, velocity = 0.8) {
  const ctx = bandEnsureAudio();
  const now = ctx.currentTime;
  const duration = Math.max(0.08, Math.min(3, Number(durationMs) / 1000));
  const frequency = bandNoteFrequency(note);
  const output = ctx.createGain();
  const oscillator = ctx.createOscillator();
  const overtone = ctx.createOscillator();
  const peak = Math.max(0.02, Math.min(0.32, Number(velocity) * (instrument === 'bass' ? 0.22 : 0.3)));
  const type = instrument === 'piano' ? 'triangle' : instrument === 'bass' ? 'sawtooth' : 'square';
  oscillator.type = type;
  oscillator.frequency.value = instrument === 'bass' ? frequency / 2 : frequency;
  overtone.type = instrument === 'piano' ? 'sine' : 'sawtooth';
  overtone.frequency.value = instrument === 'bass' ? frequency : frequency * 2;
  output.gain.setValueAtTime(0.0001, now);
  output.gain.exponentialRampToValueAtTime(peak, now + 0.012);
  output.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.35), now + Math.min(0.18, duration * 0.35));
  output.gain.exponentialRampToValueAtTime(0.0001, now + duration);
  oscillator.connect(output);
  overtone.connect(output);
  output.connect(bandMasterGain);
  oscillator.start(now);
  overtone.start(now);
  oscillator.stop(now + duration + 0.04);
  overtone.stop(now + duration + 0.04);
}

function bandPlayNoise(durationMs, volume, highpass = 0) {
  const ctx = bandEnsureAudio();
  const length = Math.max(1, Math.floor(ctx.sampleRate * Math.min(1.5, durationMs / 1000)));
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < length; index += 1) data[index] = Math.random() * 2 - 1;
  const source = ctx.createBufferSource();
  const filter = ctx.createBiquadFilter();
  const gain = ctx.createGain();
  source.buffer = buffer;
  filter.type = highpass ? 'highpass' : 'bandpass';
  filter.frequency.value = highpass || 1800;
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + Math.min(1.5, durationMs / 1000));
  source.connect(filter);
  filter.connect(gain);
  gain.connect(bandMasterGain);
  source.start();
}

function bandPlayDrum(drum) {
  const ctx = bandEnsureAudio();
  const now = ctx.currentTime;
  if (drum === 'kick') {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, now);
    osc.frequency.exponentialRampToValueAtTime(48, now + 0.16);
    gain.gain.setValueAtTime(0.7, now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
    osc.connect(gain); gain.connect(bandMasterGain); osc.start(now); osc.stop(now + 0.24);
  } else if (drum === 'tom') {
    bandPlayTone(43, 'bass', 260, 0.9);
  } else if (drum === 'hihat') {
    bandPlayNoise(120, 0.18, 5000);
  } else if (drum === 'crash') {
    bandPlayNoise(900, 0.22, 2800);
  } else {
    bandPlayNoise(240, 0.32, 900);
  }
}

function bandPlayEvent(event) {
  if (!event) return;
  bandEnsureAudio();
  if (event.type === 'drum') return bandPlayDrum(event.drum);
  if (event.type === 'chord') {
    (event.notes || []).forEach((note, index) => bandPlayTone(note, event.instrument, event.durationMs || 650, (event.velocity || 0.8) / (index ? 1.4 : 1)));
    return;
  }
  bandPlayTone(event.note, event.instrument, event.durationMs || 450, event.velocity || 0.8);
}

function bandSelectedInstrument() {
  return el('band-instrument-select')?.value || 'piano';
}

function bandSendNote(payload) {
  if (state.mode !== 'band' || state.phase !== 'band_playing') return;
  bandEnsureAudio();
  socket.emit('band_note', { instrument: bandSelectedInstrument(), ...payload });
}

function renderBandMembers(players = []) {
  const wrap = el('band-members');
  if (!wrap) return;
  const labels = { piano: '🎹 피아노', electric1: '🎸 일렉 1', electric2: '🎸 일렉 2', bass: '🎸 베이스', drums: '🥁 드럼', vocal: '🎤 보컬' };
  wrap.innerHTML = '';
  players.forEach(player => {
    const chip = document.createElement('span');
    chip.className = `band-member-chip${player.id === state.myId ? ' is-me' : ''}`;
    chip.textContent = `${player.name} · ${labels[player.bandInstrument] || '🎹 피아노'}`;
    wrap.appendChild(chip);
  });
}

function bandShowInstrumentPanel() {
  const instrument = bandSelectedInstrument();
  el('band-piano-panel').classList.toggle('hidden', instrument !== 'piano');
  el('band-chord-panel').classList.toggle('hidden', !['electric1', 'electric2', 'bass'].includes(instrument));
  el('band-drums-panel').classList.toggle('hidden', instrument !== 'drums');
  el('band-vocal-panel').classList.toggle('hidden', instrument !== 'vocal');
}

function bandBuildUi() {
  if (bandUiBuilt) return;
  bandUiBuilt = true;
  const piano = el('band-piano-keys');
  BAND_PIANO_NOTES.forEach((note, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `band-piano-key${BAND_PIANO_LABELS[index].includes('#') ? ' black-key' : ''}`;
    button.dataset.bandNote = note;
    button.innerHTML = `<span>${BAND_PIANO_LABELS[index]}</span><small>${BAND_KEYBOARD_MAP[index].toUpperCase()}</small>`;
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      bandSendNote({ type: 'note', note, durationMs: 480, velocity: 0.82 });
      button.classList.add('pressed');
      setTimeout(() => button.classList.remove('pressed'), 130);
    });
    piano.appendChild(button);
  });
  const chordWrap = el('band-chord-buttons');
  Object.keys(BAND_CHORDS).forEach(chord => {
    const button = document.createElement('button');
    button.type = 'button';
    button.dataset.bandChord = chord;
    button.textContent = chord;
    button.addEventListener('click', () => {
      const instrument = bandSelectedInstrument();
      const notes = instrument === 'bass' ? [BAND_CHORDS[chord][0], BAND_CHORDS[chord][0] + 12] : BAND_CHORDS[chord];
      bandSendNote({ type: 'chord', notes, durationMs: 720, velocity: 0.78 });
    });
    chordWrap.appendChild(button);
  });
  document.querySelectorAll('[data-band-drum]').forEach(button => {
    button.addEventListener('pointerdown', event => {
      event.preventDefault();
      bandSendNote({ type: 'drum', drum: button.dataset.bandDrum, durationMs: 300, velocity: 0.9 });
      button.classList.add('pressed');
      setTimeout(() => button.classList.remove('pressed'), 120);
    });
  });
  el('band-instrument-select').addEventListener('change', () => {
    bandEnsureAudio();
    bandShowInstrumentPanel();
    const me = state.players.find(player => player.id === state.myId);
    if (me) me.bandInstrument = bandSelectedInstrument();
    renderBandMembers(state.players);
    socket.emit('band_instrument_set', { instrument: bandSelectedInstrument() });
  });
  el('band-mic-toggle').addEventListener('click', bandToggleMic);
  el('band-record-start').addEventListener('click', bandStartRecording);
  el('band-record-stop').addEventListener('click', bandStopRecording);
}

function bandStartSession() {
  bandBuildUi();
  bandEnsureAudio();
  bandShowInstrumentPanel();
  renderBandMembers(state.players);
  bandSyncPeers(state.players);
}

document.addEventListener('keydown', event => {
  if (!document.querySelector('#view-band:not(.hidden)') || event.repeat) return;
  const key = event.key.toLowerCase();
  const pianoIndex = BAND_KEYBOARD_MAP.indexOf(key);
  if (pianoIndex >= 0 && bandSelectedInstrument() === 'piano') {
    bandSendNote({ type: 'note', note: BAND_PIANO_NOTES[pianoIndex], durationMs: 420, velocity: 0.8 });
    event.preventDefault();
  }
  const drumIndex = ['1', '2', '3', '4', '5'].indexOf(event.key);
  if (drumIndex >= 0 && bandSelectedInstrument() === 'drums') {
    const drums = ['kick', 'snare', 'hihat', 'tom', 'crash'];
    bandSendNote({ type: 'drum', drum: drums[drumIndex], durationMs: 300, velocity: 0.9 });
    event.preventDefault();
  }
});

async function bandToggleMic() {
  const button = el('band-mic-toggle');
  if (bandLocalMicStream) {
    bandLocalMicStream.getTracks().forEach(track => track.stop());
    bandLocalMicStream = null;
    bandLocalMicSource?.disconnect();
    bandLocalMicSource = null;
    for (const peer of bandPeers.values()) peer.transceiver?.sender.replaceTrack(null).catch(() => {});
    button.textContent = '🎤 마이크 켜기';
    el('band-status').textContent = '마이크를 껐어요. 악기 연주는 계속할 수 있습니다.';
    return;
  }
  if (!navigator.mediaDevices?.getUserMedia) {
    return showModal('마이크를 사용할 수 없어요', 'HTTPS 또는 localhost 환경에서 마이크 권한을 사용할 수 있습니다.');
  }
  try {
    bandEnsureAudio();
    bandLocalMicStream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } });
    bandLocalMicSource = bandAudioContext.createMediaStreamSource(bandLocalMicStream);
    bandLocalMicSource.connect(bandRecordDestination);
    for (const peer of bandPeers.values()) {
      const track = bandLocalMicStream.getAudioTracks()[0];
      peer.transceiver?.sender.replaceTrack(track).catch(() => {});
    }
    button.textContent = '🔴 마이크 끄기';
    el('band-status').textContent = '마이크가 켜졌어요. 모든 참가자에게 목소리가 들립니다.';
  } catch (error) {
    el('band-status').textContent = '마이크 권한이 필요해요. 브라우저에서 허용해주세요.';
  }
}

function bandStartRecording() {
  bandEnsureAudio();
  if (!window.MediaRecorder || !bandRecordDestination) return showModal('녹음을 지원하지 않아요', '현재 브라우저에서는 오디오 녹음을 지원하지 않습니다.');
  if (bandRecorder?.state === 'recording') return;
  bandRecordChunks = [];
  const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm';
  bandRecorder = new MediaRecorder(bandRecordDestination.stream, { mimeType });
  bandRecorder.ondataavailable = event => { if (event.data.size) bandRecordChunks.push(event.data); };
  bandRecorder.onstop = () => {
    if (bandRecordUrl) URL.revokeObjectURL(bandRecordUrl);
    bandRecordUrl = URL.createObjectURL(new Blob(bandRecordChunks, { type: mimeType }));
    const link = el('band-record-download');
    link.href = bandRecordUrl;
    link.classList.remove('hidden');
    el('band-status').textContent = '녹음이 끝났어요. 녹음 파일 저장을 눌러 다운로드하세요.';
  };
  bandRecorder.start();
  el('band-record-start').disabled = true;
  el('band-record-stop').disabled = false;
  el('band-status').textContent = '합주를 녹음 중이에요...';
}

function bandStopRecording() {
  if (bandRecorder?.state !== 'recording') return;
  bandRecorder.stop();
  el('band-record-start').disabled = false;
  el('band-record-stop').disabled = true;
}

async function bandCreatePeer(remoteId, initiator) {
  if (bandPeers.has(remoteId)) return bandPeers.get(remoteId);
  bandEnsureAudio();
  const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
  const transceiver = pc.addTransceiver('audio', { direction: 'sendrecv' });
  const peer = { pc, transceiver, pendingCandidates: [], remoteStream: null, audioSource: null };
  bandPeers.set(remoteId, peer);
  if (bandLocalMicStream) transceiver.sender.replaceTrack(bandLocalMicStream.getAudioTracks()[0]).catch(() => {});
  pc.onicecandidate = event => {
    if (event.candidate) socket.emit('band_signal', { targetId: remoteId, signal: { candidate: event.candidate } });
  };
  pc.ontrack = event => {
    const stream = event.streams?.[0];
    if (!stream || peer.remoteStream === stream) return;
    peer.remoteStream = stream;
    peer.audioSource?.disconnect();
    peer.audioSource = bandAudioContext.createMediaStreamSource(stream);
    peer.audioSource.connect(bandMasterGain);
  };
  pc.onconnectionstatechange = () => {
    if (['failed', 'closed', 'disconnected'].includes(pc.connectionState)) {
      peer.audioSource?.disconnect();
      pc.close();
      bandPeers.delete(remoteId);
    }
  };
  if (initiator) {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('band_signal', { targetId: remoteId, signal: { description: pc.localDescription } });
  }
  return peer;
}

function bandSyncPeers(players = []) {
  if (state.mode !== 'band' || state.phase !== 'band_playing' || !window.RTCPeerConnection) return;
  const remoteIds = new Set(players.filter(player => player.id !== state.myId).map(player => player.id));
  for (const player of players) {
    if (player.id === state.myId || bandPeers.has(player.id)) continue;
    bandCreatePeer(player.id, String(state.myId) < String(player.id)).catch(() => {});
  }
  for (const [remoteId, peer] of bandPeers) {
    if (!remoteIds.has(remoteId)) {
      peer.audioSource?.disconnect();
      peer.pc.close();
      bandPeers.delete(remoteId);
    }
  }
}

socket.on('band_note', bandPlayEvent);
socket.on('band_signal', async ({ fromId, signal }) => {
  if (state.mode !== 'band') return;
  const peer = await bandCreatePeer(fromId, false);
  try {
    if (signal.description) {
      await peer.pc.setRemoteDescription(signal.description);
      if (signal.description.type === 'offer') {
        const answer = await peer.pc.createAnswer();
        await peer.pc.setLocalDescription(answer);
        socket.emit('band_signal', { targetId: fromId, signal: { description: peer.pc.localDescription } });
      }
      for (const candidate of peer.pendingCandidates.splice(0)) await peer.pc.addIceCandidate(candidate);
    } else if (signal.candidate) {
      if (peer.pc.remoteDescription) await peer.pc.addIceCandidate(signal.candidate);
      else peer.pendingCandidates.push(signal.candidate);
    }
  } catch (error) {
    // A stale peer can be rebuilt on the next room update.
  }
});

function bandCleanupSession() {
  if (bandRecorder?.state === 'recording') bandRecorder.stop();
  bandRecorder = null;
  bandLocalMicStream?.getTracks().forEach(track => track.stop());
  bandLocalMicStream = null;
  bandLocalMicSource?.disconnect();
  bandLocalMicSource = null;
  for (const peer of bandPeers.values()) {
    peer.audioSource?.disconnect();
    peer.pc.close();
  }
  bandPeers.clear();
  if (bandRecordUrl) URL.revokeObjectURL(bandRecordUrl);
  bandRecordUrl = null;
  bandAudioContext?.close().catch(() => {});
  bandAudioContext = null;
  bandMasterGain = null;
  bandRecordDestination = null;
}

// ---------- horse race ----------
let horseRoster = [];
let horseSelectedHorse = null;

function renderHorseLanes() {
  const wrap = el('horse-lanes');
  wrap.innerHTML = '';
  horseRoster.forEach(h => {
    const btn = document.createElement('button');
    btn.className = 'horse-lane-btn';
    btn.innerHTML = `<img class="horse-lane-img" src="${h.image}" alt="${h.name}" /><span class="horse-lane-name">${h.id}. ${h.name}</span>`;
    btn.addEventListener('click', () => {
      horseSelectedHorse = h.id;
      document.querySelectorAll('.horse-lane-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
    wrap.appendChild(btn);
  });
}

const HORSE_MIN_BET = 10;

el('btn-horse-bet').addEventListener('click', () => {
  const amount = parseInt(el('horse-bet-amount').value, 10);
  const me = state.players.find(p => p.id === state.myId);
  const myTokens = me?.score ?? 0;
  if (!horseSelectedHorse) return (el('horse-bet-status').textContent = '말을 선택하세요.');
  if (!amount || amount < HORSE_MIN_BET) return (el('horse-bet-status').textContent = `최소 ${HORSE_MIN_BET} 토큰 이상 베팅하세요.`);
  if (amount > myTokens) return (el('horse-bet-status').textContent = `보유 토큰(${myTokens})보다 많이 베팅할 수 없습니다.`);
  socket.emit('horse_bet', { horse: horseSelectedHorse, amount });
  el('horse-bet-status').textContent = `${amount} 토큰을 ${horseSelectedHorse}번 말에 베팅했습니다. 대기 중...`;
  el('btn-horse-bet').disabled = true;
});

socket.on('horse_bet_error', ({ reason }) => {
  el('horse-bet-status').textContent = reason;
  el('btn-horse-bet').disabled = false;
});

el('btn-horse-stats').addEventListener('click', () => {
  socket.emit('horse_buy_stats');
});

socket.on('horse_stats_error', ({ reason }) => {
  el('horse-bet-status').textContent = reason;
});

socket.on('horse_stats_result', ({ history, totalRaces }) => {
  const paper = el('horse-stats-paper');
  const list = el('horse-stats-list');
  paper.classList.remove('hidden');
  list.innerHTML = '';
  if (totalRaces === 0) {
    const li = document.createElement('li');
    li.innerHTML = '<span>아직 이번 판 기록이 없습니다.</span>';
    list.appendChild(li);
    return;
  }
  horseRoster.forEach(h => {
    const count = history[h.id] || 0;
    const pct = ((count / totalRaces) * 100).toFixed(0);
    const li = document.createElement('li');
    li.innerHTML = `<span>${h.name}</span><span>${count}승 (${pct}%)</span>`;
    list.appendChild(li);
  });
});

socket.on('horse_bet_progress', ({ betCount, total }) => {
  if (el('btn-horse-bet').disabled) {
    el('horse-bet-status').textContent += ` (${betCount}/${total}명 베팅 완료)`;
  }
});

socket.on('horse_race_result', ({ winner, results, round, totalRounds, durationMs }) => {
  showView('view-horse-race');
  el('btn-horse-bet').disabled = false;
  renderHorseTrack(winner, durationMs);
  el('horse-result-msg').textContent = `${round}/${totalRounds}라운드 — ${winner}번 말 우승!`;
  const list = el('horse-result-list');
  list.innerHTML = '';
  if (results.length === 0) {
    const li = document.createElement('li');
    li.innerHTML = '<span>이번 라운드는 아무도 베팅하지 않았어요.</span>';
    list.appendChild(li);
  }
  results.forEach(r => {
    const li = document.createElement('li');
    const net = r.won ? r.amount * 2 : -r.amount;
    li.innerHTML = `<span>${r.name} (${r.horse}번)</span><span>${r.won ? '🎉' : '💸'} ${net > 0 ? '+' : ''}${net}</span>`;
    list.appendChild(li);
  });
});

function renderHorseTrack(winner, durationMs) {
  const track = el('horse-track');
  track.innerHTML = '';
  track.scrollLeft = 0;
  const runDurationSec = Math.max(1, (durationMs - 800) / 1000);

  horseRoster.forEach(h => {
    const row = document.createElement('div');
    row.className = 'horse-lane-row';
    const finish = document.createElement('div');
    finish.className = 'horse-lane-finish';
    const runner = document.createElement('div');
    runner.className = `horse-runner run-${h.style}`;
    runner.style.transition = `left ${runDurationSec}s cubic-bezier(0.3, 0, 0.2, 1)`;
    if (h.id === winner) runner.classList.add('winner-runner');
    runner.innerHTML = `<img src="${h.image}" alt="${h.name}" />`;
    runner.style.left = '4px';
    row.appendChild(finish);
    row.appendChild(runner);
    track.appendChild(row);

    // kick off the run on next frame so the CSS transition animates
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const finalLeft = h.id === winner ? 'calc(100% - 34px)' : `${20 + Math.random() * 55}%`;
        runner.style.left = finalLeft;
      });
    });
  });

  // slowly auto-scroll the track so the race stays in view as it plays out
  const scrollStart = performance.now();
  function autoScroll(now) {
    const t = Math.min(1, (now - scrollStart) / (runDurationSec * 1000));
    track.scrollLeft = t * (track.scrollWidth - track.clientWidth);
    if (t < 1) requestAnimationFrame(autoScroll);
  }
  requestAnimationFrame(autoScroll);
}

socket.on('horse_over', ({ scores, winners }) => {
  const title = winners.length > 0 ? `🏆 ${winners.join(', ')}님 우승!` : '게임 종료!';
  showScoreResult(title, '경마게임(김성진 게임) 최종 결과', scores, winners);
});

// ---------- gukbap ----------
const GUKBAP_MIX_TARGET = 15;
const GUKBAP_EAT_TARGET = 15;
let gukbapStage = 'idle';
let gukbapClicks = 0;

function resetGukbapGame() {
  gukbapStage = 'idle';
  gukbapClicks = 0;
  el('gukbap-stage-msg').textContent = '밥을 국그릇으로 드래그하세요!';
  el('gukbap-rice').classList.remove('hidden-rice', 'dragging');
  el('gukbap-rice').style.left = '20px';
  el('gukbap-rice').style.top = '20px';
  el('gukbap-progress-row').classList.add('hidden');
  el('gukbap-progress-fill').style.width = '0%';
  el('gukbap-others').innerHTML = '';
}

(function setupGukbapDrag() {
  const rice = el('gukbap-rice');
  const bowl = el('gukbap-bowl');
  const area = el('gukbap-area');
  let dragging = false;
  let offsetX = 0;
  let offsetY = 0;

  function clientPos(e) {
    const t = e.touches ? e.touches[0] : e;
    return { x: t.clientX, y: t.clientY };
  }

  function onDown(e) {
    if (gukbapStage !== 'idle') return;
    dragging = true;
    rice.classList.add('dragging');
    const rect = rice.getBoundingClientRect();
    const p = clientPos(e);
    offsetX = p.x - rect.left;
    offsetY = p.y - rect.top;
    e.preventDefault();
  }

  function onMove(e) {
    if (!dragging) return;
    if (e.touches) e.preventDefault();
    const areaRect = area.getBoundingClientRect();
    const p = clientPos(e);
    rice.style.left = `${p.x - areaRect.left - offsetX}px`;
    rice.style.top = `${p.y - areaRect.top - offsetY}px`;
  }

  function onUp() {
    if (!dragging) return;
    dragging = false;
    rice.classList.remove('dragging');
    const riceRect = rice.getBoundingClientRect();
    const bowlRect = bowl.getBoundingClientRect();
    const overlap = !(riceRect.right < bowlRect.left || riceRect.left > bowlRect.right ||
      riceRect.bottom < bowlRect.top || riceRect.top > bowlRect.bottom);
    if (overlap) {
      gukbapStage = 'mixing';
      gukbapClicks = 0;
      rice.classList.add('hidden-rice');
      el('gukbap-stage-msg').textContent = '국그릇을 계속 클릭해서 밥을 말아주세요!';
      el('gukbap-progress-row').classList.remove('hidden');
      el('gukbap-progress-label').textContent = `말기 0/${GUKBAP_MIX_TARGET}`;
      el('gukbap-progress-fill').style.width = '0%';
      socket.emit('gukbap_progress', { stage: 'poured', clicks: 0 });
    } else {
      rice.style.left = '20px';
      rice.style.top = '20px';
    }
  }

  rice.addEventListener('mousedown', onDown);
  rice.addEventListener('touchstart', onDown, { passive: false });
  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onUp);
  window.addEventListener('touchend', onUp);
})();

el('gukbap-bowl').addEventListener('click', () => {
  if (gukbapStage === 'mixing') {
    gukbapClicks += 1;
    const pct = Math.min(100, (gukbapClicks / GUKBAP_MIX_TARGET) * 100);
    el('gukbap-progress-fill').style.width = `${pct}%`;
    el('gukbap-progress-label').textContent = `말기 ${gukbapClicks}/${GUKBAP_MIX_TARGET}`;
    if (gukbapClicks >= GUKBAP_MIX_TARGET) {
      gukbapStage = 'eating';
      gukbapClicks = 0;
      el('gukbap-stage-msg').textContent = '이제 계속 클릭해서 국밥을 다 드세요!';
      el('gukbap-progress-label').textContent = `먹기 0/${GUKBAP_EAT_TARGET}`;
      el('gukbap-progress-fill').style.width = '0%';
      socket.emit('gukbap_progress', { stage: 'mixing', clicks: gukbapClicks });
    } else {
      socket.emit('gukbap_progress', { stage: 'mixing', clicks: gukbapClicks });
    }
  } else if (gukbapStage === 'eating') {
    gukbapClicks += 1;
    const pct = Math.min(100, (gukbapClicks / GUKBAP_EAT_TARGET) * 100);
    el('gukbap-progress-fill').style.width = `${pct}%`;
    el('gukbap-progress-label').textContent = `먹기 ${gukbapClicks}/${GUKBAP_EAT_TARGET}`;
    if (gukbapClicks >= GUKBAP_EAT_TARGET) {
      gukbapStage = 'done';
      el('gukbap-stage-msg').textContent = '다 먹었습니다! 결과를 기다리는 중...';
      socket.emit('gukbap_progress', { stage: 'done', clicks: gukbapClicks });
      socket.emit('gukbap_finish');
    } else {
      socket.emit('gukbap_progress', { stage: 'eating', clicks: gukbapClicks });
    }
  }
});

socket.on('gukbap_progress_update', ({ playerId, name, stage, clicks }) => {
  if (playerId === state.myId) return;
  const stageLabel = { idle: '준비 중', poured: '밥 넣음', mixing: `말기 ${clicks}/${GUKBAP_MIX_TARGET}`, eating: `먹기 ${clicks}/${GUKBAP_EAT_TARGET}`, done: '완료!' }[stage] || stage;
  const list = el('gukbap-others');
  let li = list.querySelector(`[data-pid="${playerId}"]`);
  if (!li) {
    li = document.createElement('li');
    li.dataset.pid = playerId;
    list.appendChild(li);
  }
  li.innerHTML = `<span>${name}</span><span>${stageLabel}</span>`;
});

socket.on('gukbap_over', ({ winnerName }) => {
  showView('view-result');
  el('result-title').textContent = winnerName ? `🏆 ${winnerName}님이 제일 먼저 다 먹었습니다!` : '게임 종료!';
  el('result-word-info').textContent = '';
  el('result-roles').innerHTML = '';
  el('result-score-board').classList.add('hidden');
  updateResultActions();
});

socket.on('tug_over', ({ winnerTeam, clicks, teams }) => {
  showView('view-result');
  const winnerLabel = winnerTeam === 'left' ? '🔵 왼쪽 팀' : '🔴 오른쪽 팀';
  el('result-title').textContent = `🏆 ${winnerLabel} 승리!`;
  el('result-word-info').textContent = `최종 당기기 횟수 · 왼쪽 ${clicks.left}회 / 오른쪽 ${clicks.right}회`;
  const list = el('result-roles');
  list.innerHTML = '';
  [['left', '🔵 왼쪽 팀'], ['right', '🔴 오른쪽 팀']].forEach(([team, label]) => {
    const members = (teams?.[team] || []).map(player => player.name).join(', ') || '없음';
    const item = document.createElement('li');
    item.innerHTML = `<span>${label}</span><span>${members}</span>`;
    list.appendChild(item);
  });
  el('result-score-board').classList.add('hidden');
  updateResultActions();
});

socket.on('song_quiz_over', ({ scores, winners }) => {
  stopSongVideo();
  const title = winners.length > 0 ? `🏆 ${winners.join(', ')}님 우승!` : '🎵 노래맞추기 종료!';
  showScoreResult(title, '가수와 노래 제목을 모두 맞힌 정답만 1점으로 계산했습니다.', scores, winners);
});

socket.on('balance_over', ({ results = [], scores = [], winners = [] }) => {
  const title = winners.length > 0 ? `🏆 ${winners.join(', ')}님 우승!` : '⚖️ 개발자 밸런스게임 종료!';
  showScoreResult(title, '2인은 같은 선택, 3인 이상은 다수 선택에 +1점 · 1인 플레이는 점수 없음', scores, winners);
  const list = el('result-roles');
  list.innerHTML = '';
  results.forEach((result, index) => {
    const item = document.createElement('li');
    const question = document.createElement('span');
    question.textContent = `${index + 1}. ${result.question.left} / ${result.question.right}`;
    const votes = document.createElement('span');
    votes.textContent = `${result.left}표 : ${result.right}표`;
    item.append(question, votes);
    list.appendChild(item);
  });
  updateResultActions();
});

socket.on('fashion_over', ({ scores, winners }) => {
  const title = winners.length > 0 ? `🏆 패션쇼 우승: ${winners.join(', ')}님!` : '👗 패션쇼 종료!';
  showScoreResult(title, '8라운드 익명 투표 누적 결과 · 라운드 우승 시 1점', scores, winners);
});

// ---------- result ----------
socket.on('game_over', ({ winner, roles }) => {
  showView('view-result');
  el('result-word-info').textContent = '';
  el('result-title').textContent = winner === 'mafia' ? '😈 마피아 승리!' : '🎉 시민 승리!';
  const list = el('result-roles');
  list.innerHTML = '';
  roles.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${p.name}</span><span>${ROLE_INFO[p.role].label}</span>`;
    list.appendChild(li);
  });
  updateResultActions();
});

socket.on('liar_game_over', ({ winner, word, category, liarName, accusedName }) => {
  showView('view-result');
  el('result-title').textContent = winner === 'liar' ? '🤥 라이어 승리!' : '🎉 시민 승리!';
  el('result-word-info').textContent = `제시어는 [${category} - ${word}] 였습니다. 라이어는 ${liarName}님이었습니다.`;
  const list = el('result-roles');
  list.innerHTML = '';
  state.players.forEach(p => {
    const li = document.createElement('li');
    const tag = p.name === liarName ? '🤥 라이어' : '🙂 시민';
    li.innerHTML = `<span>${p.name}</span><span>${tag}</span>`;
    list.appendChild(li);
  });
  updateResultActions();
});

function showScoreResult(title, subInfo, scores, winners) {
  showView('view-result');
  el('result-title').textContent = title;
  el('result-word-info').textContent = subInfo;
  el('result-roles').innerHTML = '';
  const board = el('result-score-board');
  board.classList.remove('hidden');
  board.innerHTML = '';
  [...scores].sort((a, b) => b.score - a.score).forEach(p => {
    const li = document.createElement('li');
    const crown = winners.includes(p.name) ? '👑 ' : '';
    li.innerHTML = `<span>${crown}${p.name}</span><span>${p.score}점</span>`;
    board.appendChild(li);
  });
  updateResultActions();
}

function updateResultActions() {
  const restart = el('btn-restart');
  restart.classList.remove('hidden');
  restart.disabled = !state.isHost;
  restart.title = state.isHost ? '방장 권한으로 게임을 다시 시작합니다.' : '방장만 다시하기를 누를 수 있습니다.';
}

socket.on('wordchain_over', ({ scores, winners }) => {
  const title = winners.length > 0 ? `🏆 ${winners.join(', ')}님 승리!` : '게임 종료!';
  showScoreResult(title, `총 ${state.chainWords.length}개의 단어가 이어졌어요.`, scores, winners);
});

socket.on('quiz_over', ({ scores, winners }) => {
  const title = winners.length > 0 ? `🏆 ${winners.join(', ')}님 승리!` : '게임 종료!';
  showScoreResult(title, '인물 맞추기 결과', scores, winners);
});

socket.on('cs_quiz_over', ({ scores, winners }) => {
  const title = winners.length > 0 ? `🏆 ${winners.join(', ')}님 승리!` : '게임 종료!';
  showScoreResult(title, 'CS 지식대결 결과', scores, winners);
});

socket.on('drawing_over', ({ topic, totalRounds, scores, winners }) => {
  const title = winners.length > 0 ? `🏆 피카소게임: ${winners.join(', ')}님 우승!` : '피카소게임 종료!';
  showScoreResult(title, `${totalRounds}라운드 누적 결과 · 마지막 주제: ${topic}`, scores, winners);
});

socket.on('memory_over', ({ scores, winners }) => {
  const title = winners.length > 0 ? `🏆 ${winners.join(', ')}님 우승!` : '짝맞추기게임 종료!';
  showScoreResult(title, '50쌍을 모두 맞혔습니다.', scores, winners);
});

socket.on('coffee_over', ({ buyerName, candidateNames }) => {
  showView('view-result');
  el('result-title').textContent = `☕ ${buyerName}님이 커피를 쏩니다!`;
  el('result-word-info').textContent = `최종 후보: ${candidateNames.join(', ')}`;
  el('result-roles').innerHTML = '';
  el('result-score-board').classList.add('hidden');
  updateResultActions();
});

socket.on('subway_over', ({ scores, winners }) => {
  const title = winners.length > 0 ? `🏆 ${winners.join(', ')}님 우승!` : '지하철게임 종료!';
  showScoreResult(title, '10라운드 선착순 호선 맞히기 결과', scores, winners);
});

el('btn-restart').addEventListener('click', () => {
  if (!state.isHost) return;
  socket.emit('restart_game');
});

function returnToMainHome() {
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = null;
  bandCleanupSession();
  hideLiveScorePanel();
  if (typeof stopStackOscillation === 'function') stopStackOscillation();
  if (ssafyFrame) cancelAnimationFrame(ssafyFrame);
  ssafyFrame = null;
  if (ssafyWatchdog) clearInterval(ssafyWatchdog);
  ssafyWatchdog = null;
  socket.emit('leave_room');
  state.roomCode = null;
  state.myId = null;
  state.isHost = false;
  state.players = [];
  state.phase = 'entry';
  state.mode = 'mafia';
  state.selectedMode = 'mafia';
  showView('view-mode-select');
}

el('btn-main-home').addEventListener('click', returnToMainHome);
el('btn-lobby-home').addEventListener('click', returnToMainHome);
el('btn-game-leave').addEventListener('click', () => {
  showConfirmModal('게임 나가기', '현재 게임을 포기하고 메인화면으로 돌아갈까요?', returnToMainHome);
});
