const { randomWord, randomStarterWord, pickCategoryPair } = require('./words');
const { pickRandomQuestions } = require('./cs-questions');
const { pickSubwayQuestions } = require('./subway-stations');

const ROLES_6 = ['mafia', 'mafia', 'doctor', 'police', 'citizen', 'citizen'];

const MAFIA_PLAYER_COUNT = 6;
const LIAR_MIN_PLAYERS = 4;
const DRAWING_MIN_PLAYERS = 3;
const COFFEE_MIN_PLAYERS = 3;
const SCORE_GAME_MIN_PLAYERS = 2;
const BALANCE_MIN_PLAYERS = 1;
const GROUP_MAX_PLAYERS = 12;

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

class Room {
  constructor(code, mode, { isPublic = false } = {}) {
    this.code = code;
    this.isPublic = Boolean(isPublic);
    this.mode = ['liar', 'wordchain', 'quiz', 'csquiz', 'stack', 'horse', 'gukbap', 'drawing', 'memory', 'coffee', 'subway', 'tug', 'songquiz', 'balance', 'fashion', 'ssafy', 'goalkeeper', 'foodroulette', 'band'].includes(mode) ? mode : 'mafia';
    this.players = []; // {id, socketId, name, role, alive, isHost, yellowCards, score}
    this.phase = 'lobby';
    this.nightActions = {}; // { mafiaTarget, doctorTarget, policeTarget }
    this.votes = {}; // voterId -> targetId
    this.dayNumber = 0;
    this.lastNightDeath = null;

    // liar-mode fields
    this.liarId = null;
    this.category = null;
    this.word = null;
    this.decoyWord = null;
    this.speakingOrder = [];
    this.turnIndex = 0;

    // wordchain-mode fields
    this.chainDurationMs = 120000;
    this.chainWords = [];
    this.usedWords = new Set();
    this.wordValidationInFlight = false;

    // quiz-mode fields (host-uploaded photo quiz)
    this.quizItems = []; // [{ imageDataUrl, answer }]
    this.quizIndex = 0;

    // csquiz-mode fields (bundled CS knowledge quiz)
    this.csQuestions = []; // [{ question, choices, answerIndex }]
    this.csIndex = 0;

    // stack-mode fields (turn-based tower stacking)
    this.stackHeight = 0;
    this.stackLean = 0;
    this.stackOrder = [];
    this.stackTurnIndex = 0;

    // horse-mode fields (betting game)
    this.horseRound = 0;
    this.horseBets = {}; // playerId -> { horse, amount }
    this.horseWinHistory = {}; // horseId -> win count this game
    this.horseWeights = {}; // horseId -> this game's real (hidden) win weight

    // gukbap-mode fields (race minigame)
    this.gukbapProgress = {}; // playerId -> { name, stage, clicks }

    // drawing-mode fields
    this.drawingTopic = null;
    this.drawingRound = 0;
    this.drawingRoundTotal = 5;
    this.drawings = {}; // playerId -> image data URL
    this.drawVotes = {}; // voterId -> playerId

    // memory-match mode fields
    this.memoryCards = [];
    this.memoryMatched = new Set();
    this.memorySelected = [];
    this.memoryTurnIndex = 0;

    // coffee-buy game fields
    this.coffeeDrinks = [];
    this.coffeeRound = 0;
    this.coffeeRemainingIds = [];
    this.coffeeChoices = {}; // playerId -> drink index
    this.coffeeEscapedIds = new Set();
    this.coffeeRpsPlayers = [];
    this.coffeeRpsChoices = {}; // playerId -> rock | paper | scissors

    // subway line quiz fields
    this.subwayQuestions = [];
    this.subwayIndex = 0;
    this.subwayRoundAnswered = false;

    // song-quiz mode fields
    this.songItems = [];
    this.songIndex = 0;
    this.songRoundAnswered = false;
    this.songSkipVotes = {};
    this.songRoundEndsAt = 0;

    // tug-of-war mode fields
    this.tugPosition = 0; // -100: left-team win, +100: right-team win
    this.tugClicks = { left: 0, right: 0 };

    // developer balance game fields (casual votes with round scoring)
    this.balanceQuestions = [];
    this.balanceIndex = 0;
    this.balanceVotes = {};
    this.balanceResults = [];

    // fashion-show mode fields
    this.fashionQuestions = [];
    this.fashionIndex = 0;
    this.fashionTopic = null;
    this.fashionOutfits = {};
    this.fashionVotes = {};
    this.fashionResults = [];
    this.ssafyImages = [];
    this.goalkeeperTurn = 0;
    this.goalkeeperShot = 0;
    this.goalkeeperChoices = {};
    this.foodRouletteResult = null;
    this.bandNotes = [];
  }

  maxPlayers() {
    if (this.mode === 'mafia') return MAFIA_PLAYER_COUNT;
    if (this.mode === 'ssafy') return 1;
    if (this.mode === 'goalkeeper') return 2;
    if (this.mode === 'band') return Number.MAX_SAFE_INTEGER;
    return GROUP_MAX_PLAYERS;
  }

  minPlayersToStart() {
    if (this.mode === 'mafia') return MAFIA_PLAYER_COUNT;
    if (this.mode === 'liar') return LIAR_MIN_PLAYERS;
    if (this.mode === 'drawing') return DRAWING_MIN_PLAYERS;
    if (this.mode === 'coffee') return COFFEE_MIN_PLAYERS;
    if (this.mode === 'balance') return BALANCE_MIN_PLAYERS;
    if (this.mode === 'ssafy') return 1;
    if (this.mode === 'foodroulette') return 1;
    if (this.mode === 'band') return 1;
    if (this.mode === 'goalkeeper') return 2;
    if (this.mode === 'tug') return 2;
    return SCORE_GAME_MIN_PLAYERS;
  }

  addPlayer(socketId, name, accountPhone) {
    if (this.players.length >= this.maxPlayers()) return { error: 'ROOM_FULL' };
    if (this.players.some(p => p.name === name)) return { error: 'NAME_TAKEN' };
    const player = {
      id: socketId,
      socketId,
      name,
      accountPhone: accountPhone || null,
      role: null,
      alive: true,
      isHost: this.players.length === 0,
      yellowCards: 0,
      score: 0,
      bandInstrument: this.mode === 'band' ? 'piano' : null,
      tugTeam: this.mode === 'tug'
        ? (this.players.filter(p => p.tugTeam === 'left').length <= this.players.filter(p => p.tugTeam === 'right').length ? 'left' : 'right')
        : null,
    };
    this.players.push(player);
    return { player };
  }

  removePlayer(socketId) {
    const idx = this.players.findIndex(p => p.socketId === socketId);
    if (idx === -1) return;
    const wasHost = this.players[idx].isHost;
    this.players.splice(idx, 1);
    if (wasHost && this.players.length > 0) this.players[0].isHost = true;
  }

  assignRoles() {
    const roles = shuffle(ROLES_6.slice(0, this.players.length));
    this.players.forEach((p, i) => {
      p.role = roles[i];
      p.alive = true;
    });
  }

  assignLiar() {
    const { category, word, decoyWord } = pickCategoryPair();
    this.category = category;
    this.word = word;
    this.decoyWord = decoyWord;
    const liar = this.players[Math.floor(Math.random() * this.players.length)];
    this.liarId = liar.id;
    this.players.forEach(p => {
      p.alive = true;
      p.yellowCards = 0;
    });
    this.speakingOrder = shuffle(this.players.map(p => p.id));
    this.turnIndex = 0;
  }

  startWordChain() {
    const starter = randomStarterWord();
    this.chainWords = [starter];
    this.usedWords = new Set([starter]);
    this.wordValidationInFlight = false;
    this.players.forEach(p => {
      p.score = 0;
    });
    return starter;
  }

  lastChainWord() {
    return this.chainWords[this.chainWords.length - 1];
  }

  resetQuiz() {
    this.quizIndex = 0;
    this.players.forEach(p => {
      p.score = 0;
    });
  }

  startCsQuiz(count = 10) {
    this.csQuestions = pickRandomQuestions(count);
    this.csIndex = 0;
    this.players.forEach(p => {
      p.score = 0;
    });
  }

  startHorseGame() {
    this.horseRound = 0;
    this.horseBets = {};
    this.horseWinHistory = {};
    this.horseWeights = {};
    this.players.forEach(p => {
      p.score = 100; // starting tokens
    });
  }

  startStackGame() {
    this.stackHeight = 0;
    this.stackLean = 0;
    this.stackOrder = shuffle(this.players.map(p => p.id));
    this.stackTurnIndex = 0;
  }

  startDrawingGame(topic) {
    this.drawingRound = 1;
    this.players.forEach(p => {
      p.score = 0;
    });
    this.startDrawingRound(topic);
  }

  startDrawingRound(topic) {
    this.drawingTopic = topic;
    this.drawings = {};
    this.drawVotes = {};
  }

  startMemoryGame(symbols) {
    const cards = symbols.flatMap(symbol => [symbol, symbol]);
    this.memoryCards = shuffle(cards);
    this.memoryMatched = new Set();
    this.memorySelected = [];
    this.memoryTurnIndex = 0;
    this.players.forEach(p => {
      p.score = 0;
    });
  }

  startCoffeeGame(drinks) {
    this.coffeeDrinks = [...drinks];
    this.coffeeRound = 0;
    this.coffeeRemainingIds = this.players.map(p => p.id);
    this.coffeeChoices = {};
    this.coffeeEscapedIds = new Set();
    this.coffeeRpsPlayers = [];
    this.coffeeRpsChoices = {};
  }

  startSubwayGame(count = 10) {
    this.subwayQuestions = pickSubwayQuestions(count);
    this.subwayIndex = 0;
    this.subwayRoundAnswered = false;
    this.players.forEach(p => {
      p.score = 0;
    });
  }

  startSongQuiz(items) {
    this.songItems = [...items];
    this.songIndex = 0;
    this.songRoundAnswered = false;
    this.players.forEach(p => {
      p.score = 0;
    });
  }

  currentStackTurnPlayerId() {
    if (this.stackOrder.length === 0) return null;
    return this.stackOrder[this.stackTurnIndex % this.stackOrder.length];
  }

  alivePlayers() {
    return this.players.filter(p => p.alive);
  }

  aliveMafiaCount() {
    return this.alivePlayers().filter(p => p.role === 'mafia').length;
  }

  aliveNonMafiaCount() {
    return this.alivePlayers().filter(p => p.role !== 'mafia').length;
  }

  checkWinner() {
    const mafia = this.aliveMafiaCount();
    const others = this.aliveNonMafiaCount();
    if (mafia === 0) return 'citizens';
    if (mafia >= others) return 'mafia';
    return null;
  }

  resetForNewGame() {
    this.phase = 'lobby';
    this.nightActions = {};
    this.votes = {};
    this.dayNumber = 0;
    this.lastNightDeath = null;
    this.liarId = null;
    this.category = null;
    this.word = null;
    this.decoyWord = null;
    this.speakingOrder = [];
    this.turnIndex = 0;
    this.chainWords = [];
    this.usedWords = new Set();
    this.wordValidationInFlight = false;
    this.quizIndex = 0;
    this.csQuestions = [];
    this.csIndex = 0;
    this.stackHeight = 0;
    this.stackLean = 0;
    this.stackOrder = [];
    this.stackTurnIndex = 0;
    this.horseRound = 0;
    this.horseBets = {};
    this.horseWinHistory = {};
    this.horseWeights = {};
    this.gukbapProgress = {};
    this.drawingTopic = null;
    this.drawingRound = 0;
    this.drawings = {};
    this.drawVotes = {};
    this.memoryCards = [];
    this.memoryMatched = new Set();
    this.memorySelected = [];
    this.memoryTurnIndex = 0;
    this.coffeeDrinks = [];
    this.coffeeRound = 0;
    this.coffeeRemainingIds = [];
    this.coffeeChoices = {};
    this.coffeeEscapedIds = new Set();
    this.subwayQuestions = [];
    this.subwayIndex = 0;
    this.subwayRoundAnswered = false;
    this.songItems = [];
    this.songIndex = 0;
    this.songRoundAnswered = false;
    this.songSkipVotes = {};
    this.songRoundEndsAt = 0;
    this.tugPosition = 0;
    this.tugClicks = { left: 0, right: 0 };
    this.balanceQuestions = [];
    this.balanceIndex = 0;
    this.balanceVotes = {};
    this.balanceResults = [];
    this.fashionQuestions = [];
    this.fashionIndex = 0;
    this.fashionTopic = null;
    this.fashionOutfits = {};
    this.fashionVotes = {};
    this.fashionResults = [];
    this.ssafyImages = [];
    this.goalkeeperTurn = 0;
    this.goalkeeperShot = 0;
    this.goalkeeperChoices = {};
    this.foodRouletteResult = null;
    this.bandNotes = [];
    this.players.forEach(p => {
      p.role = null;
      p.alive = true;
      p.yellowCards = 0;
      p.score = 0;
    });
  }

  publicPlayerList() {
    return this.players.map(p => ({
      id: p.id,
      name: p.name,
      alive: p.alive,
      isHost: p.isHost,
      yellowCards: p.yellowCards,
      score: Math.max(0, p.score),
      tugTeam: p.tugTeam || null,
      bandInstrument: p.bandInstrument || null,
    }));
  }
}

class RoomManager {
  constructor() {
    this.rooms = new Map();
  }

  createRoom(mode, options = {}) {
    let code;
    do {
      code = Math.floor(1000 + Math.random() * 9000).toString();
    } while (this.rooms.has(code));
    const room = new Room(code, mode, options);
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(code);
  }

  deleteIfEmpty(code) {
    const room = this.rooms.get(code);
    if (room && room.players.length === 0) this.rooms.delete(code);
  }
}

module.exports = { RoomManager, Room };
