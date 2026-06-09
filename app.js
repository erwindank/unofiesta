// ============================================================
// UNO PARTY
//
// SETUP (one-time):
//   1. Go to https://console.firebase.google.com
//   2. Create a new project (any name, e.g. "unoparty")
//   3. Add a Web App (+) → copy the firebaseConfig object
//   4. Paste the values below
//   5. In the project console:
//      - Firestore Database → Create database → Start in test mode
//      - Authentication → Get started → Anonymous → Enable
// ============================================================

const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyDD88huoZNmnG8HKPb0aYYFUl5L_-tjVzQ",
  authDomain:        "unomentiroso-b5742.firebaseapp.com",
  projectId:         "unomentiroso-b5742",
  storageBucket:     "unomentiroso-b5742.firebasestorage.app",
  messagingSenderId: "771588309649",
  appId:             "1:771588309649:web:f2e1f4450a2975f1d7f530"
};

// ============================================================
// CONSTANTS
// ============================================================

const COLORS  = ['red', 'yellow', 'green', 'blue'];
const NUMBERS = ['1','2','3','4','5','6','7','8','9'];
const ACTIONS = ['skip','reverse','draw2'];
const WILDS   = ['wild','wild4','wildPileUp','wildDrawnTogether','wildc4Plus'];
// UNO Fiesta colored action cards (not wilds)
const PARTY_CARDS = ['pointTaken'];
const ALL_VALUES = [...NUMBERS, ...ACTIONS, ...WILDS, ...PARTY_CARDS];

const VALUE_LABEL = {
  '1':'1','2':'2','3':'3','4':'4',
  '5':'5','6':'6','7':'7','8':'8','9':'9',
  skip:'⊘', reverse:'⇄', draw2:'+2', wild:'C', wild4:'+4',
  pointTaken:'☝️', wildPileUp:'⬆', wildDrawnTogether:'⬌', wildc4Plus:'+4'
};
const CARD_POINTS = {
  '1':1,'2':2,'3':3,'4':4,'5':5,'6':6,'7':7,'8':8,'9':9,
  skip:20, reverse:20, draw2:20, wild:50, wild4:50,
  pointTaken:20, wildPileUp:50, wildDrawnTogether:50, wildc4Plus:50
};
const COLOR_NAME = { red:'Rojo', yellow:'Amarillo', green:'Verde', blue:'Azul', black:'Comodín' };

// Declared here (not in the Spotify section below) because handleSpotifyCallback()
// is called from init() before the Spotify section is reached, and const is not hoisted.
const SPOTIFY_CLIENT_ID    = '3b539ada3a4b43f48efdb4a790ced26c';
const SPOTIFY_REDIRECT_URI = 'https://erwindank.github.io/unomentiroso/';
const SPOTIFY_SCOPES       = 'user-read-currently-playing user-read-playback-state';

function rainbowHTML(text) {
  const colors = ['#C81515','#D4A800','#189A20','#1040B8'];
  return text.split('').map((ch, i) =>
    `<span style="color:${colors[i%4]};font-weight:700">${ch}</span>`
  ).join('');
}

function cardStatusHTML(card) {
  if (!card) return '?';
  const hex = LOG_COLOR_HEX[card.color] || '#fff';
  const colorSpan = `<span style="color:${hex};font-weight:700">${COLOR_NAME[card.color]}</span>`;
  if (card.value === 'wild')  return `${rainbowHTML('Comodín')} y cambia el color a ${colorSpan}`;
  if (card.value === 'wild4') return `${rainbowHTML('Comodín')} <b>+4</b> y cambia el color a ${colorSpan}`;
  if (card.value === 'wildc4Plus') return `${rainbowHTML('Comodín')} <b>+4</b> y cambia el color a ${colorSpan}`;
  return `<span style="color:${hex};font-weight:700">${COLOR_NAME[card.color]} ${VALUE_LABEL[card.value]}</span>`;
}

function cardLogName(card) {
  if (!card) return '?';
  if (card.value === 'wild')  return `Comodín y cambia el color a ${COLOR_NAME[card.color]}`;
  if (card.value === 'wild4') return `Comodín +4 y cambia el color a ${COLOR_NAME[card.color]}`;
  if (card.value === 'wildc4Plus') return `Comodín +4 y cambia el color a ${COLOR_NAME[card.color]}`;
  return `${COLOR_NAME[card.color]} ${VALUE_LABEL[card.value]}`;
}

function buildCardHTML(card, extraStyle) {
  if (!card) return '';
  const lbl = VALUE_LABEL[card.value];
  const isWild = WILDS.includes(card.value);
  const isParty = ['pointTaken','wildPileUp','wildDrawnTogether'].includes(card.value);
  const centerHTML = isWild ? wildCenterHTML(card.value)
    : card.value === 'reverse' ? reverseCenterHTML()
    : `<span class="card-label center">${lbl}</span>`;
  return `<div class="card ${card.color}${isParty ? ' party' : ''}"${extraStyle ? ` style="${extraStyle}"` : ''}>
    ${cornerLabelHTML(card.value,'tl')}${centerHTML}${cornerLabelHTML(card.value,'br')}
  </div>`;
}

function cornerLabelHTML(value, posClass) {
  const lbl = VALUE_LABEL[value];
  return `<span class="card-label ${posClass}">${lbl}</span>`;
}

function reverseCenterHTML() {
  return `<span class="reverse-center"><span class="rev-arrow">↗</span><span class="rev-arrow">↙</span></span>`;
}

function wildCenterHTML(value) {
  let label = '';
  if (value === 'wild4') label = '+4';
  else if (value === 'wildc4Plus') label = '+4';
  else if (value === 'pointTaken') label = '☝️';
  else if (value === 'wildPileUp') label = '⬆';
  else if (value === 'wildDrawnTogether') label = '⬌';
  
  return `<span class="wild-quad">\
<span class="wq r"></span><span class="wq b"></span>\
<span class="wq y"></span><span class="wq g"></span>\
</span>${label ? `<span class="wild-extra-label">${label}</span>` : ''}`;
}

// ============================================================
// DECK
// ============================================================

function createDeck() {
  const deck = [];
  for (const color of COLORS) {
    // 1–9: one copy each
    for (const v of ['1','2','3','4','5','6','7','8','9']) {
      deck.push({ color, value: v });
    }
    // Action cards: two of each
    for (const a of ACTIONS) {
      deck.push({ color, value: a });
      deck.push({ color, value: a });
    }
    // Colored action card (1 per color)
    deck.push({ color, value: 'pointTaken' });
  }
  // Wild cards: 4 copies each (all black)
  for (let i = 0; i < 4; i++) {
    deck.push({ color: 'black', value: 'wild' });
    deck.push({ color: 'black', value: 'wild4' });
    deck.push({ color: 'black', value: 'wildPileUp' });
    deck.push({ color: 'black', value: 'wildDrawnTogether' });
  }
  return deck;
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ============================================================
// FIREBASE INIT
// ============================================================

firebase.initializeApp(FIREBASE_CONFIG);
const auth = firebase.auth();
const db   = firebase.firestore();
const rtdb = firebase.database();

let localUid  = null;
let localName = null;
let currentRoomId = null;
let selectedEmoji = '';
let _emojiPicker  = null;
let roomUnsub     = null;
let roomState     = null;

// Presence state
let presenceRef    = null;
let rtdbRoomRef    = null;
const disconnectTimers = {};

// Re-establish RTDB presence when the tab becomes visible again (mobile bg/fg)
function refreshPresence() {
  if (presenceRef && localUid) {
    presenceRef.set({ name: localName, t: firebase.database.ServerValue.TIMESTAMP });
    presenceRef.onDisconnect().remove();
  }
}
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible') refreshPresence();
});
window.addEventListener('focus', refreshPresence);
// iOS/Android page lifecycle freeze/resume
window.addEventListener('resume', refreshPresence);

// Ephemeral play state (never stored in Firestore)
let selectedCardIdx = null;
let selectedActualCard = null;
let claimColor = null;
let claimValue = null;
let unoAlertTimeout = null;
let currentUnoCallRequired = null;
let unoCallClearPending = false;
let drawnCardState = null; // { cardIdx, canPlay } — set after drawing, cleared when turn ends

// Chat state
let chatOpen = false;
let chatUnreadCount = 0;
const seenMessageIds = new Set();

// Notification state
let notifEnabled = localStorage.getItem('notifEnabled') === 'true';
let prevNotifState = null;
let notifAudioCtx = null;

function ensureNotifAudioCtx() {
  if (notifAudioCtx) return;
  try { notifAudioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (_) {}
}
document.addEventListener('click', ensureNotifAudioCtx, { once: true });

// Music state
const _savedMusicPref = localStorage.getItem('musicEnabled');
let musicEnabled = _savedMusicPref === null ? null : _savedMusicPref === 'true';
let musicMasterGain = null;
let musicPlaying = false;
let musicLoopTimer = null;

function isPartyCard(card) {
  return card && PARTY_CARDS.includes(card.value);
}

function handPoints(hand) {
  return (hand || []).reduce((sum, c) => sum + (CARD_POINTS[c.value] || 0), 0);
}

function computeStandings(state) {
  return (state.players || [])
    .map(p => {
      const hand = state.hands?.[p.id] || [];
      return { id: p.id, name: p.name, cards: hand.length, points: handPoints(hand) };
    })
    .sort((a, b) => a.cards - b.cards || a.points - b.points);
}

function determineWinner(state) {
  const standings = computeStandings(state);
  if (!standings.length) return { winner: null, winnerName: null, winCondition: 'cards' };
  const first = standings[0], second = standings[1];
  const winCondition = (second && first.cards === second.cards) ? 'points' : 'cards';
  return { winner: first.id, winnerName: first.name, winCondition };
}

function isActualPlayable(card, state) {
  if (!state || !card) return false;
  if (WILDS.includes(card.value)) return true;
  return card.color === state.topColor || card.value === state.topValue;
}

// ============================================================
// INIT — sign in anonymously, restore session
// ============================================================

async function init() {
  await handleSpotifyCallback();

  try {
    await auth.signInAnonymously();
    localUid = auth.currentUser.uid;
  } catch (e) {
    console.error('Auth failed:', e);
  }

  const savedRoom  = sessionStorage.getItem('roomId');
  const savedName  = sessionStorage.getItem('playerName');
  const savedEmoji = sessionStorage.getItem('playerEmoji');
  if (savedEmoji) {
    selectedEmoji = savedEmoji;
    const btn = document.getElementById('emoji-trigger-btn');
    if (btn) {
      btn.querySelector('.emoji-face').textContent = savedEmoji;
      btn.classList.add('has-emoji');
    }
  }
  if (savedRoom && savedName && localUid) {
    localName = savedName;
    await tryRejoin(savedRoom);
  }

  if (musicEnabled === true) {
    document.addEventListener('click', function startMusicOnInteraction() {
      ensureNotifAudioCtx();
      if (!musicPlaying) startMusic();
    }, { once: true });
  } else if (musicEnabled === null && !savedRoom) {
    setTimeout(showMusicPrompt, 700);
  }
}

init();
updateNotifButton();
updateMusicButton();

// ============================================================
// HELPERS
// ============================================================

function esc(s) {
  return String(s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function stripLeadingEmoji(s) {
  return s.replace(/^\p{Emoji_Presentation}\s*/u, '').trim();
}

const LOG_COLOR_HEX = { red:'#C81515', yellow:'#D4A800', green:'#189A20', blue:'#1040B8' };
const LOG_WILD_COLORS = ['#C81515','#D4A800','#189A20','#1040B8'];
const LOG_VALUE_PAT = '[0-9⊘↺C]|\\+[24]';

function colorizeLog(msg) {
  let s = esc(msg);
  s = s.replace(new RegExp(`Comodín(?:\\s+(${LOG_VALUE_PAT}))?`, 'g'), (_, val) => {
    const rain = 'Comodín'.split('').map((ch, i) =>
      `<span style="color:${LOG_WILD_COLORS[i % 4]};font-weight:700">${ch}</span>`
    ).join('');
    return val ? rain + `<b> ${val}</b>` : rain;
  });
  s = s.replace(new RegExp(`(Rojo|Amarillo|Verde|Azul)(?:\\s+(${LOG_VALUE_PAT}))?`, 'g'), (_, name, val) => {
    const key = Object.entries(COLOR_NAME).find(([, v]) => v === name)?.[0];
    const hex = LOG_COLOR_HEX[key] || '#fff';
    return `<span class="log-color-${key}" style="color:${hex};font-weight:700">${name}${val ? ' '+val : ''}</span>`;
  });
  return s;
}

function genRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

function addLog(log, msg) {
  if (!msg) return log || [];
  return [...(log || []), msg].slice(-20);
}

function isMyTurn(state) {
  if (!state?.players?.length) return false;
  return state.players[state.currentPlayerIndex]?.id === localUid;
}

function nextPlayerIndex(state) {
  const n = state.players.length;
  return ((state.currentPlayerIndex + state.direction) % n + n) % n;
}

function showScreen(id) {
  if (id !== 'game') {
    if (chatOpen) {
      chatOpen = false;
      document.getElementById('chat-panel')?.classList.add('hidden');
    }
    leaveVoice();
    stopSpotifyPolling();
    stopLastfmPolling();
    stopListeningSpotifyTracks();
  }
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById('screen-' + id).classList.add('active');
  const gameCodeText = document.getElementById('game-room-code-text');
  if (gameCodeText) gameCodeText.textContent = currentRoomId || '';
  if (id === 'game') {
    listenSpotifyTracks();
    if (isSpotifyConnected()) startSpotifyPolling();
    if (isLastfmConnected()) startLastfmPolling();
    updateSpotifyButton();
    updateLastfmButton();
    const cbOk  = sessionStorage.getItem('spotify_callback_ok');
    const cbErr = sessionStorage.getItem('spotify_callback_error');
    if (cbOk) {
      sessionStorage.removeItem('spotify_callback_ok');
      setTimeout(openSpotifyModal, 400);
    } else if (cbErr) {
      sessionStorage.removeItem('spotify_callback_error');
      const msg = cbErr === 'access_denied'   ? 'Cancelaste la conexión con Spotify.'
                : cbErr === 'verifier_missing' ? 'Error de sesión Spotify. Intenta de nuevo.'
                : cbErr === 'fetch_failed'     ? 'No se pudo contactar Spotify. Revisa tu conexión.'
                :                               `Error de Spotify: ${cbErr}`;
      setTimeout(() => showSpotifyError(msg), 400);
    }
  }
}

function showLandingError(msg) {
  const el = document.getElementById('landing-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3500);
}

// ============================================================
// EMOJI PICKER
// ============================================================

function toggleEmojiPicker(e) {
  e && e.stopPropagation();
  if (selectedEmoji) {
    clearEmoji();
    return;
  }
  const wrap = document.getElementById('emoji-picker-wrap');
  if (!wrap.classList.contains('hidden')) {
    wrap.classList.add('hidden');
    return;
  }
  if (!_emojiPicker) {
    EmojiMart.init({
      data: async () => {
        const r = await fetch('https://cdn.jsdelivr.net/npm/@emoji-mart/data');
        return r.json();
      }
    });
    _emojiPicker = new EmojiMart.Picker({
      theme: 'dark',
      locale: 'en',
      set: 'native',
      onEmojiSelect(emoji) {
        selectedEmoji = emoji.native;
        const btn = document.getElementById('emoji-trigger-btn');
        btn.querySelector('.emoji-face').textContent = emoji.native;
        btn.classList.add('has-emoji');
        sessionStorage.setItem('playerEmoji', selectedEmoji);
        document.getElementById('emoji-picker-wrap').classList.add('hidden');
      }
    });
    wrap.appendChild(_emojiPicker);
  }
  wrap.classList.remove('hidden');
}

function clearEmoji() {
  selectedEmoji = '';
  sessionStorage.removeItem('playerEmoji');
  const btn = document.getElementById('emoji-trigger-btn');
  btn.querySelector('.emoji-face').textContent = '🙂';
  btn.classList.remove('has-emoji');
}

document.addEventListener('click', (e) => {
  const wrap = document.getElementById('emoji-picker-wrap');
  if (!wrap || wrap.classList.contains('hidden')) return;
  const btn = document.getElementById('emoji-trigger-btn');
  if (!wrap.contains(e.target) && !btn.contains(e.target)) {
    wrap.classList.add('hidden');
  }
});

// ============================================================
// LANDING
// ============================================================

function showJoin() {
  document.getElementById('join-form').classList.toggle('hidden');
}

async function handleCreate() {
  const rawName = document.getElementById('player-name').value.trim();
  if (!rawName) { showLandingError('Escribe tu nombre primero'); return; }
  if (!localUid) { showLandingError('Aún conectando… intenta de nuevo'); return; }
  const name = selectedEmoji ? selectedEmoji + ' ' + rawName : rawName;
  localName = name;

  const roomId = genRoomCode();
  await db.collection('rooms').doc(roomId).set({
    status: 'lobby',
    hostId: localUid,
    players: [{ id: localUid, name, cardCount: 0 }],
    currentPlayerIndex: 0,
    direction: 1,
    topColor: null,
    topValue: null,
    prevTopColor: null,
    prevTopValue: null,
    lastPlayerId: null,
    lastActualCard: null,
    lastClaimedCard: null,
    challengeOpen: false,
    hands: {},
    drawPile: [],
    log: [],
    winner: null,
    winnerName: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });

  currentRoomId = roomId;
  sessionStorage.setItem('roomId', roomId);
  sessionStorage.setItem('playerName', name);
  sessionStorage.setItem('playerEmoji', selectedEmoji);
  subscribeToRoom(roomId);
  showScreen('lobby');
}

function getUniqueName(desiredName, players) {
  if (!players.some(p => p.name === desiredName)) return desiredName;
  let n = 2;
  while (players.some(p => p.name === desiredName + n)) n++;
  return desiredName + n;
}

async function handleJoin() {
  const rawName = document.getElementById('player-name').value.trim();
  const code = document.getElementById('room-code-input').value.trim().toUpperCase();
  if (!rawName) { showLandingError('Escribe tu nombre primero'); return; }
  if (code.length !== 6) { showLandingError('Introduce el código de sala de 6 caracteres'); return; }
  if (!localUid) { showLandingError('Aún conectando… intenta de nuevo'); return; }
  const name = selectedEmoji ? selectedEmoji + ' ' + rawName : rawName;

  const snap = await db.collection('rooms').doc(code).get();
  if (!snap.exists) { showLandingError('Sala no encontrada'); return; }
  const data = snap.data();
  if (data.status === 'ended') { showLandingError('La partida ya terminó'); return; }

  if (data.status === 'lobby') {
    if (data.players.length >= 10) { showLandingError('Sala llena (máximo 10)'); return; }

    if (!data.players.find(p => p.id === localUid)) {
      const uniqueName = getUniqueName(name, data.players);
      localName = uniqueName;
      await db.collection('rooms').doc(code).update({
        players: firebase.firestore.FieldValue.arrayUnion({ id: localUid, name: uniqueName, cardCount: 0 })
      });
    } else {
      localName = data.players.find(p => p.id === localUid).name;
    }

    currentRoomId = code;
    sessionStorage.setItem('roomId', code);
    sessionStorage.setItem('playerName', localName);
    sessionStorage.setItem('playerEmoji', selectedEmoji);
    subscribeToRoom(code);
    showScreen('lobby');

  } else if (data.status === 'playing') {
    // Try exact match, then match ignoring emoji prefix (for cross-device reconnect)
    const existingPlayer = data.players.find(p =>
      p.name === name || p.name === rawName || stripLeadingEmoji(p.name) === rawName
    );

    if (existingPlayer) {
      // Reconnect: take over that player's slot, clear disconnected flag
      const oldUid = existingPlayer.id;
      const wasDisconnected = !!existingPlayer.disconnected;

      if (oldUid !== localUid || wasDisconnected) {
        const newPlayers = data.players.map(p =>
          p.id === oldUid ? { ...p, id: localUid, disconnected: false } : p
        );
        const updates = {
          players: newPlayers,
          lastActivity: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (oldUid !== localUid) {
          const hand = data.hands?.[oldUid] || [];
          updates[`hands.${localUid}`] = hand;
          updates[`hands.${oldUid}`] = firebase.firestore.FieldValue.delete();
        }
        if (wasDisconnected) {
          updates.log = addLog(data.log, `${existingPlayer.name} se reconectó.`);
        }
        await db.collection('rooms').doc(code).update(updates);
      }
      localName = existingPlayer.name;
    } else {
      // New player joining mid-game: deal 7 cards from the draw pile
      if (data.players.length >= 10) { showLandingError('Sala llena (máximo 10)'); return; }
      const uniqueName = getUniqueName(name, data.players);
      const { drawn, newDrawPile } = takeCards(data.drawPile, 7);
      localName = uniqueName;
      await db.collection('rooms').doc(code).update({
        players: firebase.firestore.FieldValue.arrayUnion({ id: localUid, name: uniqueName, cardCount: 7 }),
        [`hands.${localUid}`]: drawn,
        drawPile: newDrawPile,
        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    currentRoomId = code;
    sessionStorage.setItem('roomId', code);
    sessionStorage.setItem('playerName', localName);
    sessionStorage.setItem('playerEmoji', selectedEmoji);
    subscribeToRoom(code);
    showScreen('game');
  }
}

async function tryRejoin(roomId) {
  try {
    const snap = await db.collection('rooms').doc(roomId).get();
    if (!snap.exists) { sessionStorage.clear(); return; }
    const data = snap.data();
    const player = data.players.find(p => p.id === localUid);
    if (!player) { sessionStorage.clear(); return; }

    if (player.disconnected) {
      const newPlayers = data.players.map(p =>
        p.id === localUid ? { ...p, disconnected: false } : p
      );
      await db.collection('rooms').doc(roomId).update({
        players: newPlayers,
        log: addLog(data.log, `${player.name} se reconectó.`),
        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
      });
    }

    currentRoomId = roomId;
    subscribeToRoom(roomId);
    if (data.status === 'lobby') showScreen('lobby');
    else if (data.status === 'playing') showScreen('game');
    else if (data.status === 'ended') showScreen('winner');
  } catch (_) { sessionStorage.clear(); }
}

function copyCode() {
  navigator.clipboard.writeText(currentRoomId).catch(() => {});
  const btn = document.querySelector('.btn-copy');
  btn.textContent = '¡Copiado!';
  setTimeout(() => { btn.textContent = 'Copiar'; }, 1500);
}

function copyGameCode(el) {
  navigator.clipboard.writeText(currentRoomId).catch(() => {});
  const textEl = el.querySelector('#game-room-code-text');
  const original = textEl.textContent;
  textEl.textContent = '¡Copiado!';
  el.querySelector('svg').style.display = 'none';
  setTimeout(() => {
    textEl.textContent = original;
    el.querySelector('svg').style.display = '';
  }, 1500);
}

// ============================================================
// PRESENCE — disconnect detection via RTDB + beforeunload
// ============================================================

function setupPresence(roomId) {
  teardownPresence();

  presenceRef  = rtdb.ref(`presence/${roomId}/${localUid}`);
  rtdbRoomRef  = rtdb.ref(`presence/${roomId}`);

  presenceRef.set({ name: localName, t: firebase.database.ServerValue.TIMESTAMP });
  presenceRef.onDisconnect().remove();

  rtdbRoomRef.on('value', snap => {
    if (!roomState || !currentRoomId) return;
    const present = snap.val() || {};

    for (const player of roomState.players) {
      if (player.id === localUid) continue;

      if (!present[player.id]) {
        if (!disconnectTimers[player.id]) {
          const pid  = player.id;
          const pname = player.name;
          disconnectTimers[pid] = setTimeout(async () => {
            delete disconnectTimers[pid];
            if (roomState?.players.find(p => p.id === pid)) {
              await markPlayerDisconnected(pid, pname);
            }
          }, 180000);
        }
      } else {
        if (disconnectTimers[player.id]) {
          clearTimeout(disconnectTimers[player.id]);
          delete disconnectTimers[player.id];
        }
      }
    }
  });
}

function teardownPresence() {
  if (presenceRef) {
    presenceRef.onDisconnect().cancel();
    presenceRef.remove();
    presenceRef = null;
  }
  if (rtdbRoomRef) {
    rtdbRoomRef.off();
    rtdbRoomRef = null;
  }
  Object.keys(disconnectTimers).forEach(uid => {
    clearTimeout(disconnectTimers[uid]);
    delete disconnectTimers[uid];
  });
  if (voiceActivityRef) { voiceActivityRef.off(); voiceActivityRef = null; }
  voiceActivityLoaded = false;
}

function setupVoiceActivityListener(roomId) {
  if (voiceActivityRef) { voiceActivityRef.off(); voiceActivityRef = null; }
  voiceActivityLoaded = false;
  const ref = rtdb.ref(`voice/${roomId}/active`);
  voiceActivityRef = ref;
  ref.on('child_added', snap => {
    if (!voiceActivityLoaded) return;
    const uid = snap.key;
    if (uid === localUid) return;
    const player = roomState?.players?.find(p => p.id === uid);
    const name = player?.name || 'Alguien';
    notify('🎤 Chat de voz', `${name} abrió el micrófono.`);
    showVoiceJoinToast(`🎤 ${name} abrió el micrófono`);
  });
  ref.on('child_removed', snap => {
    const uid = snap.key;
    if (uid === localUid) return;
    const player = roomState?.players?.find(p => p.id === uid);
    const name = player?.name || 'Alguien';
    showVoiceJoinToast(`📵 ${name} dejó el chat de voz`);
  });
  ref.on('child_changed', snap => {
    const uid = snap.key;
    if (uid === localUid) return;
    const player = roomState?.players?.find(p => p.id === uid);
    const name = player?.name || 'Alguien';
    if (snap.val()?.muted) {
      showVoiceJoinToast(`🔇 ${name} silenció el micrófono`);
    } else {
      showVoiceJoinToast(`🎤 ${name} activó el micrófono`);
    }
  });
  ref.once('value', () => { voiceActivityLoaded = true; });
}

async function markPlayerDisconnected(uid, name) {
  if (!currentRoomId) return;
  try {
    await db.runTransaction(async tx => {
      const ref  = db.collection('rooms').doc(currentRoomId);
      const snap = await tx.get(ref);
      if (!snap.exists) return;

      const state  = snap.data();
      const player = state.players.find(p => p.id === uid);
      if (!player || player.disconnected) return; // not found or already marked

      const newPlayers = state.players.map(p =>
        p.id === uid ? { ...p, disconnected: true } : p
      );
      tx.update(ref, {
        players: newPlayers,
        log: addLog(state.log, `${name} se desconectó.`),
        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  } catch (e) {
    console.error('markPlayerDisconnected failed:', e);
  }
}

function removeDisconnectedFromLobby(state) {
  const newPlayers = state.players.filter(p => !p.disconnected);
  if (newPlayers.length === 0) {
    db.collection('rooms').doc(currentRoomId).delete().catch(() => {});
    return;
  }
  const removedIds = state.players.filter(p => p.disconnected).map(p => p.id);
  const update = {
    players: newPlayers,
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (removedIds.includes(state.hostId)) update.hostId = newPlayers[0].id;
  db.collection('rooms').doc(currentRoomId).update(update).catch(() => {});
}

function skipDisconnectedTurn(state) {
  const current = state.players[state.currentPlayerIndex];
  db.collection('rooms').doc(currentRoomId).update({
    currentPlayerIndex: nextPlayerIndex(state),
    log: addLog(state.log, `Se saltó el turno de ${current.name} (desconectado).`),
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  }).catch(() => {});
}

function skipLinkedTurn(state) {
  const current = state.players[state.currentPlayerIndex];
  const newSkips = (state.pendingSkips || []).filter(id => id !== current.id);
  const update = {
    currentPlayerIndex: nextPlayerIndex(state),
    log: addLog(state.log, `${current.name} pierde su turno (enlazado).`),
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };
  update.pendingSkips = newSkips.length > 0 ? newSkips : firebase.firestore.FieldValue.delete();
  db.collection('rooms').doc(currentRoomId).update(update).catch(() => {});
}

// ============================================================
// ROOM SUBSCRIPTION
// ============================================================

function subscribeToRoom(roomId) {
  if (roomUnsub) roomUnsub();
  prevNotifState = null;
  roomUnsub = db.collection('rooms').doc(roomId).onSnapshot(snap => {
    if (!snap.exists) return;
    roomState = snap.data();
    onRoomUpdate(roomState);
  });
  setupPresence(roomId);
  setupVoiceActivityListener(roomId);
}

function onRoomUpdate(state) {
  checkNotifications(state);
  if (state.status === 'lobby') {
    const hasDisconnected = state.players.some(p => p.disconnected);
    if (hasDisconnected) removeDisconnectedFromLobby(state);
    showScreen('lobby');
    renderLobby(state);
  } else if (state.status === 'playing') {
    // Check if all players agreed to end — any client that detects it triggers the update;
    // Firestore's atomic write means duplicate triggers just overwrite with the same result.
    const votes = state.endVotes || [];
    const connectedPlayers = state.players.filter(p => !p.disconnected);
    if (connectedPlayers.length > 0 && connectedPlayers.every(p => votes.includes(p.id))) {
      const result = determineWinner(state);
      db.collection('rooms').doc(currentRoomId).update({
        status: 'ended',
        winner: result.winner,
        winnerName: result.winnerName,
        winCondition: result.winCondition,
        winnerReason: 'vote',
        log: addLog(state.log, `Partida terminada por acuerdo. ¡${result.winnerName} gana!`)
      }).catch(() => {});
      return;
    }
    // Auto-skip disconnected players' turns (any client can trigger; same result from all)
    const currentPlayer = state.players[state.currentPlayerIndex];
    const activePlayers = state.players.filter(p => !p.disconnected);
    if (currentPlayer?.disconnected && activePlayers.length > 0 &&
        !state.wildChallenge) {
      skipDisconnectedTurn(state);
    }
    // Auto-skip linked partners who drew cards and lost their turn
    if (state.pendingSkips?.includes(currentPlayer?.id) && !currentPlayer?.disconnected &&
        !state.wildChallenge && !state.wild4Challenge &&
        !state.pointTakenPhase && !state.wildPileUpPhase) {
      skipLinkedTurn(state);
    }
    showScreen('game');
    renderGame(state);
    scheduleBotTick(state);
  } else if (state.status === 'ended') {
    showScreen('winner');
    renderWinner(state);
  }
}

// ============================================================
// LOBBY RENDER
// ============================================================

function renderLobby(state) {
  document.getElementById('lobby-code').textContent = currentRoomId;

  const prevNames  = state.prevPlayerNames || [];
  const readyVotes = state.readyVotes || [];
  const isRematch  = prevNames.length > 0;

  const isHost = state.hostId === localUid;
  document.getElementById('player-list').innerHTML = state.players.map(p => {
    const isReady   = readyVotes.includes(p.id);
    const wasHere   = isRematch && prevNames.includes(p.name);
    const removeBtn = isHost && isBot(p.id)
      ? `<button class="btn-remove-bot" onclick="handleRemoveBot('${p.id}')" title="Quitar bot">✕</button>`
      : '';
    return `<div class="player-item ${p.id === localUid ? 'me' : ''} ${p.disconnected ? 'player-disconnected' : ''} ${isBot(p.id) ? 'is-bot' : ''}">
      ${p.id === state.hostId ? '👑 ' : ''}${esc(p.name)}
      ${wasHere ? '<span class="prev-badge">vuelve</span>' : ''}
      ${isReady  ? '<span class="ready-badge">✓ listo</span>' : ''}
      ${p.disconnected ? ' <span class="dc-badge">desconectado</span>' : ''}
      ${removeBtn}
    </div>`;
  }).join('');

  // Ready-up button (only shown in rematch lobbies)
  let readyArea = document.getElementById('lobby-ready-area');
  if (!readyArea) {
    readyArea = document.createElement('div');
    readyArea.id = 'lobby-ready-area';
    document.querySelector('.lobby-actions').prepend(readyArea);
  }
  if (isRematch) {
    const alreadyReady = readyVotes.includes(localUid);
    readyArea.innerHTML = alreadyReady
      ? '<p class="muted ready-confirmed">✓ Estás listo para jugar</p>'
      : '<button class="btn btn-primary" onclick="handleReadyVote()">¡Quiero jugar de nuevo!</button>';
  } else {
    readyArea.innerHTML = '';
  }

  const canStart = state.players.length >= 2;
  const startBtn = document.getElementById('start-btn');
  const waitMsg  = document.getElementById('waiting-msg');

  startBtn.classList.toggle('hidden', !isHost);
  waitMsg.classList.toggle('hidden', isHost);

  // Bot button (host only)
  let botArea = document.getElementById('lobby-bot-area');
  if (!botArea) {
    botArea = document.createElement('div');
    botArea.id = 'lobby-bot-area';
    document.querySelector('.lobby-actions').appendChild(botArea);
  }
  if (isHost) {
    const canAddBot = state.players.length < 10;
    botArea.innerHTML = canAddBot
      ? `<button class="btn btn-sm" style="background:#c0186c;color:#fff;font-weight:700;border:none;box-shadow:0 0 12px rgba(192,24,108,.5);" onclick="handleAddBot()">+ Añadir bot</button>`
      : '';
  } else {
    botArea.innerHTML = '';
  }

  if (isHost) {
    startBtn.disabled = !canStart;
    startBtn.textContent = canStart ? 'Iniciar partida' : 'Esperando jugadores…';
  }
}

// ============================================================
// START GAME — host deals cards
// ============================================================

async function handleStart() {
  if (!roomState || roomState.players.length < 2) return;

  const deck   = shuffle(createDeck());
  const players = roomState.players;
  const hands  = {};
  let idx = 0;

  for (const p of players) {
    hands[p.id] = deck.slice(idx, idx + 7);
    idx += 7;
  }

  // First card must not be a Wild
  let startCard = deck[idx++];
  while (WILDS.includes(startCard.value)) startCard = deck[idx++];

  const playersWithCounts = players.map(p => ({ ...p, cardCount: 7 }));

  await db.collection('rooms').doc(currentRoomId).update({
    status: 'playing',
    players: playersWithCounts,
    currentPlayerIndex: 0,
    direction: 1,
    topColor: startCard.color,
    topValue: startCard.value,
    prevTopColor: startCard.color,
    prevTopValue: startCard.value,
    lastPlayerId: null,
    lastActualCard: null,
    lastClaimedCard: null,
    challengeOpen: false,
    hands,
    drawPile: deck.slice(idx),
    log: [`¡Partida iniciada! ${esc(players[0].name)} va primero.`],
    winner: null,
    winnerName: null,
    winnerReason: null,
    endVotes: [],
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ============================================================
// GAME RENDER
// ============================================================

function renderGame(state) {
  if (!isMyTurn(state)) drawnCardState = null;
  renderTopCard(state);
  renderOpponents(state);
  renderStatus(state);
  renderUnoAlert(state);

  renderHand(state);
  renderLog(state);
  renderUnoCallOverlay(state);
  renderTurnActions(state);
  renderEndVoteStatus(state);
  renderWildChallenge(state);
  renderPointTakenOverlay(state);
  renderWildPileUpPanel(state);
  renderDrawnTogetherDialog(state);
  renderWild4ChallengeArea(state);
  renderChatPanel(state);
  renderSpeechBubbles(state);

  const myTurn = isMyTurn(state);
  const canDraw = myTurn && drawnCardState === null;
  document.getElementById('draw-pile-area').style.opacity = canDraw ? '1' : '0.5';

  const myHand           = state.hands?.[localUid] || [];
  const hasPlayable      = myHand.some(c => isActualPlayable(c, state));
  
  if (canDraw && !hasPlayable) {
    document.getElementById('draw-pile-area').classList.add('must-draw');
  } else {
    document.getElementById('draw-pile-area').classList.remove('must-draw');
  }
}

function renderTurnActions(state) {
  const myTurn = isMyTurn(state);
  const passBtn = document.getElementById('pass-btn');
  passBtn.classList.toggle('hidden', !myTurn);
  if (myTurn) passBtn.disabled = drawnCardState === null;
}

function renderUnoAlert(state) {
  const alertEl = document.getElementById('uno-alert');

  if (state?.unoAlert) {
    alertEl.classList.remove('hidden');
    alertEl.innerHTML = `<span>${esc(state.unoAlert)}</span>`;

    if (!unoAlertTimeout) {
      unoAlertTimeout = setTimeout(async () => {
        unoAlertTimeout = null;
        if (!roomState || !roomState.unoAlert) return;
        await db.collection('rooms').doc(currentRoomId).update({
          unoAlert: firebase.firestore.FieldValue.delete()
        });
      }, 3000);
    }
  } else {
    alertEl.classList.add('hidden');
    alertEl.textContent = '';
    if (unoAlertTimeout) {
      clearTimeout(unoAlertTimeout);
      unoAlertTimeout = null;
    }
  }
}

function renderUnoCallOverlay(state) {
  const overlay = document.getElementById('uno-call-overlay');
  const req = state.unoCallRequired;

  if (!req) {
    overlay.classList.add('hidden');
    currentUnoCallRequired = null;
    return;
  }

  const reqPlayer = state.players.find(p => p.id === req.playerId);
  if (!reqPlayer || reqPlayer.cardCount !== 1) {
    overlay.classList.add('hidden');
    currentUnoCallRequired = null;
    if (!unoCallClearPending) {
      unoCallClearPending = true;
      db.collection('rooms').doc(currentRoomId).update({
        unoCallRequired: firebase.firestore.FieldValue.delete()
      }).catch(() => {}).then(() => { unoCallClearPending = false; });
    }
    return;
  }

  currentUnoCallRequired = req;
  const label = document.getElementById('uno-call-label');
  const btn   = document.getElementById('uno-call-btn');

  if (req.playerId === localUid) {
    label.textContent = '¡Solo te queda 1 carta!';
    btn.textContent   = '¡GRITA UNO!';
  } else {
    label.textContent = `¡${req.playerName} tiene 1 carta!`;
    btn.textContent   = `GRITARLE UNO A ${req.playerName.toUpperCase()}`;
  }

  overlay.classList.remove('hidden');
}

async function handleUnoCallBtn() {
  const req = currentUnoCallRequired;
  if (!req || !roomState) return;

  document.getElementById('uno-call-overlay').classList.add('hidden');
  currentUnoCallRequired = null;

  if (req.playerId === localUid) {
    const log = addLog(roomState.log, `${localName} grita ¡UNO! 🎴`);
    await db.collection('rooms').doc(currentRoomId).update({
      unoCallRequired: firebase.firestore.FieldValue.delete(),
      log,
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    const roomRef = db.collection('rooms').doc(currentRoomId);
    await db.runTransaction(async (transaction) => {
      const doc = await transaction.get(roomRef);
      const state = doc.data();

      // Bail out if the player already safely shouted UNO (unoCallRequired was deleted)
      if (!state.unoCallRequired || state.unoCallRequired.playerId !== req.playerId) return;

      // Bail out if they no longer have exactly 1 card
      const reqPlayer = state.players.find(p => p.id === req.playerId);
      if (!reqPlayer || reqPlayer.cardCount !== 1) return;

      let { hands, players, drawPile } = state;
      const { drawn, newDrawPile } = takeCards(drawPile, 2);
      hands   = { ...hands, [req.playerId]: [...(hands[req.playerId] || []), ...drawn] };
      players = players.map(p =>
        p.id === req.playerId ? { ...p, cardCount: hands[p.id].length } : p
      );
      const log = addLog(state.log,
        `🚨 ${localName} le gritó UNO a ${req.playerName}. ${req.playerName} roba 2 cartas.`
      );
      transaction.update(roomRef, {
        hands,
        players,
        drawPile: newDrawPile,
        unoCallRequired: firebase.firestore.FieldValue.delete(),
        log,
        lastActivity: firebase.firestore.FieldValue.serverTimestamp()
      });
    });
  }
}

function renderTopCard(state) {
  const el = document.getElementById('top-card');
  el.className = 'card ' + (state.topColor || 'red');
  const lbl = VALUE_LABEL[state.topValue] || '?';
  const isWild = WILDS.includes(state.topValue);
  const isReverse = state.topValue === 'reverse';
  const tlHTML = cornerLabelHTML(state.topValue, 'tl');
  const brHTML = cornerLabelHTML(state.topValue, 'br');
  el.innerHTML = isWild
    ? `${tlHTML}${wildCenterHTML(state.topValue)}${brHTML}`
    : isReverse
    ? `${tlHTML}${reverseCenterHTML()}${brHTML}`
    : `${tlHTML}<span class="card-label center">${lbl}</span>${brHTML}`;
}

function renderOpponents(state) {
  const row = document.getElementById('opponents-row');
  const others = state.players.filter(p => p.id !== localUid);

  row.innerHTML = others.map(p => {
    const isCurrent = state.players[state.currentPlayerIndex]?.id === p.id;
    const nextIdx = nextPlayerIndex(state);
    const isNext = state.players[nextIdx]?.id === p.id;
    const isDisconnected = !!p.disconnected;
    const isSpeaking = !!speakingStates[p.id];
    const hasVoice = !!peerConns[p.id];
    const miniCards = Array(Math.min(p.cardCount, 12)).fill(0)
      .map(() => `<div class="card-back mini"></div>`).join('');
    return `<div class="opponent ${isCurrent ? 'active-player' : ''}
                                  ${isDisconnected ? 'player-disconnected' : ''}
                                  ${isSpeaking ? 'voice-speaking' : ''}"
                 data-uid="${esc(p.id)}">
      <div class="opponent-name">${esc(p.name)}${isDisconnected ? ' <span class="dc-badge">desconectado</span>' : ''}${hasVoice ? ' <span class="voice-mic-icon">🎤</span>' : ''}</div>
      <div class="opponent-cards">${miniCards}</div>
      <div class="opponent-count">${p.cardCount}🃏</div>
    </div>`;
  }).join('');
}

function renderStatus(state) {
  const el = document.getElementById('game-status');
  const current = state.players[state.currentPlayerIndex];

  const myTurn = isMyTurn(state);
  el.classList.toggle('my-turn',    myTurn);
  el.classList.toggle('other-turn', !myTurn);

  const dirEl = document.getElementById('direction-indicator');
  if (dirEl) dirEl.textContent = state.direction === 1 ? '↻' : '↺';

  if (myTurn) {
    el.textContent = '🎊 ¡Tu turno! Elige una carta.';
  } else {
    el.textContent = `Turno de ${current?.name || '?'}`;
  }
}

function renderHand(state) {
  const handEl = document.getElementById('player-hand');
  const myHand = state.hands?.[localUid] || [];
  const myTurn = isMyTurn(state);
  const inDrawMode = myTurn && drawnCardState !== null;

  // Pile-up phase: the pile holder sees only pile-playable cards highlighted
  const pilePhase = state.wildPileUpPhase;
  const isPileHolder = pilePhase && state.players[pilePhase.holderIndex]?.id === localUid;

  // Speed play: cards clickable out of turn when they match both color+value
  const canSpeedPlay = !myTurn && !pilePhase &&
    !state.pointTakenPhase && !state.wild4Challenge;

  handEl.innerHTML = myHand.map((card, i) => {
    let isPlayable, onclick, extraClass = '';
    const speedPlayable = canSpeedPlay && NUMBERS.includes(card.value) &&
      card.color === state.topColor && card.value === state.topValue;
    const pilePlayable = isPileHolder && card.color === pilePhase.pileColor;

    if (inDrawMode) {
      const isDrawn = i === drawnCardState.cardIdx;
      if (isDrawn) extraClass = ' drawn-fresh';
      isPlayable = myTurn;
      onclick = myTurn ? `selectCard(${i})` : '';
    } else if (pilePlayable) {
      isPlayable = true;
      onclick = `selectCard(${i})`;
      extraClass = ' speed-playable';
    } else if (speedPlayable) {
      isPlayable = true;
      onclick = `selectCard(${i})`;
      extraClass = ' speed-playable';
    } else {
      isPlayable = myTurn;
      onclick = myTurn ? `selectCard(${i})` : '';
    }
    const lbl = VALUE_LABEL[card.value];
    const isWild = WILDS.includes(card.value);
    const centerHTML = isWild ? wildCenterHTML(card.value)
      : card.value === 'reverse' ? reverseCenterHTML()
      : `<span class="card-label center">${lbl}</span>`;
    return `<div class="card ${card.color}${isPlayable ? ' playable' : ''}${extraClass}"
      data-index="${i}"
      onclick="${onclick}"
    >
      ${cornerLabelHTML(card.value, 'tl')}
      ${centerHTML}
      ${cornerLabelHTML(card.value, 'br')}
    </div>`;
  }).join('');

  if (isPileHolder) {
    const hasMatch = myHand.some(c => c.color === 'black' || c.color === pilePhase.pileColor);
    document.getElementById('hand-label').textContent = hasMatch
      ? `Mini-pila (${COLOR_NAME[pilePhase.pileColor]}) — juega una carta que coincida o toca "Tomar pila"`
      : `Mini-pila (${COLOR_NAME[pilePhase.pileColor]}) — no tienes cartas jugables`;
  } else if (inDrawMode) {
    document.getElementById('hand-label').textContent = drawnCardState.canPlay
      ? '¡Carta robada jugable! Juega cualquier carta válida o pasa.'
      : 'Carta robada no jugable. Juega una carta válida o pasa.';
  } else {
    document.getElementById('hand-label').textContent =
      myTurn ? 'Tu turno — haz clic en una carta para jugar' : `Tu mano (${myHand.length})`;
  }

  // Yellow glow when it's my turn
  handEl.closest('.hand-area').classList.toggle('my-turn', myTurn);

  // Turn order info bar
  const toiEl = document.getElementById('turn-order-info');
  const n = state?.players?.length || 0;
  if (n >= 2) {
    const curIdx = state.currentPlayerIndex;
    const dir = state.direction ?? 1;
    const prevIdx = ((curIdx - dir) % n + n) % n;
    const nextIdx = ((curIdx + dir) % n + n) % n;
    const prevName = esc(state.players[prevIdx]?.name || '—');
    const nextName = esc(state.players[nextIdx]?.name || '—');
    const curName  = esc(state.players[curIdx]?.name  || '—');
    const center = myTurn
      ? `<span class="toi-label" style="color:rgba(255,255,255,.3)">tu turno</span>`
      : `<span class="toi-current">${curName}</span>`;
    const leftItem  = dir >= 0
      ? `<span class="toi-item"><span class="toi-arrow">←</span><span class="toi-label toi-prev-label">anterior</span><span class="toi-name toi-prev-name">${prevName}</span></span>`
      : `<span class="toi-item"><span class="toi-arrow">←</span><span class="toi-label toi-next-label">siguiente</span><span class="toi-name toi-next-name">${nextName}</span></span>`;
    const rightItem = dir >= 0
      ? `<span class="toi-item"><span class="toi-name toi-next-name">${nextName}</span><span class="toi-label toi-next-label">siguiente</span><span class="toi-arrow">→</span></span>`
      : `<span class="toi-item"><span class="toi-name toi-prev-name">${prevName}</span><span class="toi-label toi-prev-label">anterior</span><span class="toi-arrow">→</span></span>`;
    toiEl.innerHTML = leftItem + center + rightItem;
    toiEl.classList.remove('hidden');
  } else {
    toiEl.classList.add('hidden');
  }

  document.getElementById('uno-btn').classList.add('hidden');
}

function renderLog(state) {
  const el = document.getElementById('game-log');
  el.innerHTML = [...(state.log || [])].reverse()
    .map(msg => {
      const cls = msg.includes('descubrió') || msg.includes('¡Mintió!') ? ' log-lie'
                : /dijo la verdad/i.test(msg) || msg.includes('¡sí tenía') ? ' log-truth'
                : msg.includes('le gritó UNO') ? ' log-uno'
                : msg.includes('¡UNO! 🎴') ? ' log-uno-call'
                : /intercambi/.test(msg) ? ' log-swap'
                : '';
      return `<div class="log-entry${cls}">${colorizeLog(msg)}</div>`;
    })
    .join('');
  el.scrollTop = 0;
}

// ============================================================
// CHAT
// ============================================================

function toggleChat() {
  chatOpen = !chatOpen;
  const panel = document.getElementById('chat-panel');
  panel.classList.toggle('hidden', !chatOpen);
  if (chatOpen) {
    chatUnreadCount = 0;
    updateChatBadge();
    if (roomState) renderChatPanel(roomState);
    const el = document.getElementById('chat-messages');
    if (el) el.scrollTop = el.scrollHeight;
    setTimeout(() => document.getElementById('chat-input')?.focus(), 50);
  }
}

function updateChatBadge() {
  const badge = document.getElementById('chat-unread');
  if (!badge) return;
  if (chatUnreadCount > 0) {
    badge.textContent = chatUnreadCount > 9 ? '9+' : String(chatUnreadCount);
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
}

async function sendChatMessage(text) {
  if (!text || !text.trim() || !currentRoomId) return;
  const trimmed = text.trim();
  await db.runTransaction(async tx => {
    const ref  = db.collection('rooms').doc(currentRoomId);
    const snap = await tx.get(ref);
    if (!snap.exists) return;
    const msgs = snap.data().messages || [];
    const msg  = {
      id:   Date.now().toString(36) + Math.random().toString(36).slice(2),
      pid:  localUid,
      name: localName,
      text: trimmed,
      ts:   Date.now()
    };
    tx.update(ref, { messages: [...msgs, msg].slice(-50) });
  });
}

function sendEmote(emoji) {
  sendChatMessage(emoji).catch(() => {});
}

async function handleChatSend() {
  const input = document.getElementById('chat-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  input.value = '';
  await sendChatMessage(text);
}

function handleChatKeydown(e) {
  if (e.key === 'Enter') handleChatSend();
}

function renderChatPanel(state) {
  const msgs = state.messages || [];

  // Count new messages from others and mark all as seen
  let newCount = 0;
  for (const msg of msgs) {
    if (!seenMessageIds.has(msg.id) && msg.pid !== localUid) newCount++;
    seenMessageIds.add(msg.id);
  }
  if (!chatOpen && newCount > 0) {
    chatUnreadCount += newCount;
    updateChatBadge();
    playChatSound();
  }

  if (!chatOpen) return;

  chatUnreadCount = 0;
  updateChatBadge();

  const playersEl = document.getElementById('chat-players');
  if (playersEl) {
    const players = state.players || [];
    playersEl.innerHTML = players.map(p => {
      const isMe = p.id === localUid;
      const dc = p.disconnected;
      return `<span class="chat-player-chip ${dc ? 'dc' : ''}">${esc(p.name)}${isMe ? ' (yo)' : ''}</span>`;
    }).join('');
  }

  const el = document.getElementById('chat-messages');
  if (!el) return;
  const wasAtBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  el.innerHTML = msgs.map(msg => {
    const mine = msg.pid === localUid;
    const time = msg.ts ? new Date(msg.ts).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'}) : '';
    return `<div class="chat-msg ${mine ? 'mine' : ''}">
      ${!mine ? `<span class="chat-msg-name">${esc(msg.name)}</span>` : ''}
      <div class="chat-msg-bubble">${esc(msg.text)}</div>
      ${time ? `<span class="chat-msg-time">${time}</span>` : ''}
    </div>`;
  }).join('');
  if (wasAtBottom || msgs.length <= 3) el.scrollTop = el.scrollHeight;
}

function renderSpeechBubbles(state) {
  if (chatOpen) return;
  const msgs = state.messages || [];
  const container = document.getElementById('speech-bubbles');
  if (!container) return;
  const now = Date.now();
  for (const msg of msgs) {
    const bubbleKey = 'b_' + msg.id;
    if (seenMessageIds.has(bubbleKey)) continue;
    seenMessageIds.add(bubbleKey);
    if (msg.pid === localUid) continue;
    if (now - msg.ts > 6000) continue;
    const bubble = document.createElement('div');
    bubble.className = 'speech-bubble';
    bubble.innerHTML = `<strong>${esc(msg.name)}:</strong> ${esc(msg.text)}`;
    container.appendChild(bubble);
    setTimeout(() => bubble.remove(), 4000);
  }
}

// ============================================================
// NOTIFICATIONS
// ============================================================

function toggleNotifications() {
  if (!('Notification' in window)) return;
  if (!notifEnabled) {
    Notification.requestPermission().then(perm => {
      notifEnabled = perm === 'granted';
      localStorage.setItem('notifEnabled', notifEnabled ? 'true' : 'false');
      updateNotifButton();
      if (notifEnabled) {
        try {
          notifAudioCtx = new (window.AudioContext || window.webkitAudioContext)();
          notifAudioCtx.resume();
        } catch (_) {}
        try { new Notification('🔔 Notificaciones activadas', { body: 'Recibirás avisos del juego.', tag: 'notif-test' }); } catch (_) {}
        showVoiceToast('🔔 Notificaciones activadas');
      }
    });
  } else {
    notifEnabled = false;
    localStorage.setItem('notifEnabled', 'false');
    updateNotifButton();
  }
}

function updateNotifButton() {
  const btn = document.getElementById('notif-toggle-btn');
  if (!btn) return;
  const active = notifEnabled && Notification.permission === 'granted';
  btn.classList.toggle('notif-active', active);
  btn.title = active ? 'Desactivar notificaciones' : 'Activar notificaciones';
  btn.textContent = active ? '🔔' : '🔕';
}

function playChatSound() {
  ensureNotifAudioCtx();
  if (!notifAudioCtx) return;
  try {
    notifAudioCtx.resume().then(() => {
      const ctx = notifAudioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'triangle';
      osc.frequency.value = 520;
      const t = ctx.currentTime;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
      osc.start(t);
      osc.stop(t + 0.18);
    });
  } catch (_) {}
}

function playNotifSound() {
  ensureNotifAudioCtx();
  if (!notifAudioCtx) return;
  try {
    notifAudioCtx.resume().then(() => {
      const ctx = notifAudioCtx;
      const notes = [880, 1108];
      notes.forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.value = freq;
        const t = ctx.currentTime + i * 0.12;
        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.3, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
        osc.start(t);
        osc.stop(t + 0.25);
      });
    });
  } catch (_) {}
}

// ============================================================
// BACKGROUND MUSIC
// ============================================================

// 4-bar loop in D major at 104 BPM
// Each entry: [beat_offset, duration_beats, freq_Hz, volume, osc_type]
const MUSIC_BPM = 104;
const MUSIC_BEAT = 60 / MUSIC_BPM;
const MUSIC_TOTAL_BEATS = 16;
const MUSIC_SCORE = [
  // Melody (triangle wave)
  [0,    1.0, 293.7, 0.18, 'triangle'], // D4
  [1,    0.5, 329.6, 0.14, 'triangle'], // E4
  [1.5,  0.5, 392.0, 0.16, 'triangle'], // G4
  [2,    1.5, 440.0, 0.20, 'triangle'], // A4
  [3.5,  0.5, 493.9, 0.16, 'triangle'], // B4
  [4,    1.0, 440.0, 0.18, 'triangle'], // A4
  [5,    0.5, 392.0, 0.14, 'triangle'], // G4
  [5.5,  0.5, 369.9, 0.13, 'triangle'], // F#4
  [6,    1.0, 329.6, 0.16, 'triangle'], // E4
  [7,    1.0, 293.7, 0.18, 'triangle'], // D4
  [8,    1.0, 392.0, 0.18, 'triangle'], // G4
  [9,    0.5, 440.0, 0.14, 'triangle'], // A4
  [9.5,  0.5, 493.9, 0.14, 'triangle'], // B4
  [10,   1.0, 587.3, 0.20, 'triangle'], // D5
  [11,   1.0, 554.4, 0.18, 'triangle'], // C#5
  [12,   0.5, 493.9, 0.14, 'triangle'], // B4
  [12.5, 0.5, 440.0, 0.14, 'triangle'], // A4
  [13,   1.0, 392.0, 0.16, 'triangle'], // G4
  [14,   1.0, 369.9, 0.15, 'triangle'], // F#4
  [15,   1.0, 293.7, 0.22, 'triangle'], // D4
  // Bass (sine wave)
  [0,    2,   146.8, 0.14, 'sine'],     // D3
  [2,    2,   110.0, 0.12, 'sine'],     // A2
  [4,    2,   110.0, 0.13, 'sine'],     // A2
  [6,    1,   164.8, 0.11, 'sine'],     // E3
  [7,    1,   146.8, 0.11, 'sine'],     // D3
  [8,    1,   196.0, 0.12, 'sine'],     // G3
  [9,    1,   196.0, 0.11, 'sine'],     // G3
  [10,   2,   146.8, 0.12, 'sine'],     // D3
  [12,   2,   110.0, 0.13, 'sine'],     // A2
  [14,   2,   146.8, 0.12, 'sine'],     // D3
];

function scheduleMusicNote(ctx, startTime, durationBeats, freq, vol, oscType) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(musicMasterGain);
  osc.type = oscType;
  osc.frequency.value = freq;
  const dur = durationBeats * MUSIC_BEAT;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.02);
  gain.gain.setValueAtTime(vol, startTime + dur - 0.06);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + dur + 0.04);
  osc.start(startTime);
  osc.stop(startTime + dur + 0.06);
}

function scheduleMusicLoop(loopStartTime) {
  const ctx = notifAudioCtx;
  if (!ctx || !musicPlaying) return;
  MUSIC_SCORE.forEach(([beat, dur, freq, vol, type]) => {
    scheduleMusicNote(ctx, loopStartTime + beat * MUSIC_BEAT, dur, freq, vol, type);
  });
  const loopDuration = MUSIC_TOTAL_BEATS * MUSIC_BEAT;
  musicLoopTimer = setTimeout(() => {
    if (musicPlaying) scheduleMusicLoop(loopStartTime + loopDuration);
  }, (loopDuration - 0.5) * 1000);
}

function startMusic() {
  if (musicPlaying || !notifAudioCtx) return;
  musicPlaying = true;
  notifAudioCtx.resume().then(() => {
    musicMasterGain = notifAudioCtx.createGain();
    musicMasterGain.gain.setValueAtTime(0, notifAudioCtx.currentTime);
    musicMasterGain.gain.linearRampToValueAtTime(0.5, notifAudioCtx.currentTime + 2.0);
    musicMasterGain.connect(notifAudioCtx.destination);
    scheduleMusicLoop(notifAudioCtx.currentTime + 0.15);
    updateMusicButton();
  });
}

function stopMusic() {
  musicPlaying = false;
  clearTimeout(musicLoopTimer);
  if (musicMasterGain && notifAudioCtx) {
    const oldGain = musicMasterGain;
    musicMasterGain = null;
    oldGain.gain.cancelScheduledValues(notifAudioCtx.currentTime);
    oldGain.gain.setTargetAtTime(0, notifAudioCtx.currentTime, 0.2);
    setTimeout(() => { try { oldGain.disconnect(); } catch (_) {} }, 1200);
  }
  updateMusicButton();
}

function toggleMusic() {
  if (musicPlaying) {
    musicEnabled = false;
    localStorage.setItem('musicEnabled', 'false');
    stopMusic();
  } else {
    musicEnabled = true;
    localStorage.setItem('musicEnabled', 'true');
    ensureNotifAudioCtx();
    startMusic();
  }
}

function enableMusic() {
  musicEnabled = true;
  localStorage.setItem('musicEnabled', 'true');
  document.getElementById('music-prompt')?.classList.add('hidden');
  ensureNotifAudioCtx();
  startMusic();
  updateMusicButton();
}

function disableMusic() {
  musicEnabled = false;
  localStorage.setItem('musicEnabled', 'false');
  document.getElementById('music-prompt')?.classList.add('hidden');
  updateMusicButton();
}

function showMusicPrompt() {
  document.getElementById('music-prompt')?.classList.remove('hidden');
}

function updateMusicButton() {
  const btn = document.getElementById('music-toggle-btn');
  if (!btn) return;
  btn.textContent = musicPlaying ? '🎵' : '🔇';
  btn.title = musicPlaying ? 'Silenciar música' : 'Activar música';
  btn.classList.toggle('music-active', musicPlaying);
}

// ============================================================
// SPOTIFY INTEGRATION
// ============================================================

const SPOTIFY_SVG_SMALL    = `<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;
const SPOTIFY_SVG_LARGE    = `<svg class="spotify-modal-logo" viewBox="0 0 24 24" width="36" height="36" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;

let spotifyPollTimer      = null;
let spotifyTracksRef      = null;
let spotifyTracksData     = {};

// ----- PKCE helpers -----

function generateCodeVerifier() {
  const arr = new Uint8Array(32);
  crypto.getRandomValues(arr);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

async function generateCodeChallenge(verifier) {
  const data   = new TextEncoder().encode(verifier);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return btoa(String.fromCharCode(...new Uint8Array(digest))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}

// ----- Auth -----

async function initiateSpotifyAuth() {
  const verifier   = generateCodeVerifier();
  const challenge  = await generateCodeChallenge(verifier);
  localStorage.setItem('spotify_code_verifier', verifier);
  const params = new URLSearchParams({
    client_id:             SPOTIFY_CLIENT_ID,
    response_type:         'code',
    redirect_uri:          SPOTIFY_REDIRECT_URI,
    scope:                 SPOTIFY_SCOPES,
    code_challenge_method: 'S256',
    code_challenge:        challenge,
  });
  window.location.href = `https://accounts.spotify.com/authorize?${params}`;
}

async function handleSpotifyCallback() {
  const params = new URLSearchParams(window.location.search);
  const error  = params.get('error');
  const code   = params.get('code');
  if (!code && !error) return;
  window.history.replaceState({}, '', window.location.pathname);
  if (error) {
    localStorage.removeItem('spotify_code_verifier');
    sessionStorage.setItem('spotify_callback_error', error);
    return;
  }
  const verifier = localStorage.getItem('spotify_code_verifier');
  if (!verifier) {
    sessionStorage.setItem('spotify_callback_error', 'verifier_missing');
    return;
  }
  try {
    const res  = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     SPOTIFY_CLIENT_ID,
        grant_type:    'authorization_code',
        code,
        redirect_uri:  SPOTIFY_REDIRECT_URI,
        code_verifier: verifier,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('spotify_access_token',  data.access_token);
      localStorage.setItem('spotify_refresh_token', data.refresh_token);
      localStorage.setItem('spotify_expires_at',    Date.now() + data.expires_in * 1000);
      sessionStorage.setItem('spotify_callback_ok', '1');
    } else {
      console.error('Spotify token error:', data);
      sessionStorage.setItem('spotify_callback_error', data.error || 'unknown');
    }
  } catch (e) {
    console.error('Spotify fetch error:', e);
    sessionStorage.setItem('spotify_callback_error', 'fetch_failed');
  }
  localStorage.removeItem('spotify_code_verifier');
}

async function refreshSpotifyToken() {
  const rt = localStorage.getItem('spotify_refresh_token');
  if (!rt) return false;
  try {
    const res  = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'refresh_token',
        refresh_token: rt,
        client_id:     SPOTIFY_CLIENT_ID,
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      localStorage.setItem('spotify_access_token', data.access_token);
      localStorage.setItem('spotify_expires_at',   Date.now() + data.expires_in * 1000);
      if (data.refresh_token) localStorage.setItem('spotify_refresh_token', data.refresh_token);
      return true;
    }
  } catch (_) {}
  return false;
}

async function getSpotifyToken() {
  const exp = parseInt(localStorage.getItem('spotify_expires_at') || '0');
  if (Date.now() > exp - 60000) {
    const ok = await refreshSpotifyToken();
    if (!ok) return null;
  }
  return localStorage.getItem('spotify_access_token');
}

function isSpotifyConnected() {
  return !!localStorage.getItem('spotify_access_token');
}

function disconnectSpotify() {
  stopSpotifyPolling();
  clearSpotifyTrackFromRoom();
  localStorage.removeItem('spotify_access_token');
  localStorage.removeItem('spotify_refresh_token');
  localStorage.removeItem('spotify_expires_at');
  updateSpotifyButton();
  closeSpotifyModal();
}

// ----- Now Playing -----

async function fetchNowPlaying() {
  const token = await getSpotifyToken();
  if (!token) return;
  try {
    const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 204 || res.status === 404) { updateSpotifyTrackInRoom(null); return; }
    if (!res.ok) return;
    const data = await res.json();
    if (!data.is_playing || !data.item) { updateSpotifyTrackInRoom(null); return; }
    updateSpotifyTrackInRoom({
      title:    data.item.name,
      artist:   data.item.artists.map(a => a.name).join(', '),
      albumArt: data.item.album.images.at(-1)?.url || null,
      source:   'spotify',
    });
  } catch (_) {}
}

function startSpotifyPolling() {
  stopSpotifyPolling();
  fetchNowPlaying();
  spotifyPollTimer = setInterval(fetchNowPlaying, 30000);
}

function stopSpotifyPolling() {
  clearInterval(spotifyPollTimer);
  spotifyPollTimer = null;
}

// ----- RTDB track sharing -----

function updateSpotifyTrackInRoom(track) {
  if (!currentRoomId || !localUid) return;
  const ref = rtdb.ref(`rooms/${currentRoomId}/spotifyTracks/${localUid}`);
  if (track) {
    ref.set(track);
    ref.onDisconnect().remove();
  } else {
    ref.remove();
  }
}

function clearSpotifyTrackFromRoom() {
  if (!currentRoomId || !localUid) return;
  rtdb.ref(`rooms/${currentRoomId}/spotifyTracks/${localUid}`).remove();
}

// ----- Carousel -----

function listenSpotifyTracks() {
  stopListeningSpotifyTracks();
  if (!currentRoomId) return;
  spotifyTracksRef = rtdb.ref(`rooms/${currentRoomId}/spotifyTracks`);
  spotifyTracksRef.on('value', snap => {
    spotifyTracksData = snap.val() || {};
    renderNowPlayingCarousel();
  });
}

function stopListeningSpotifyTracks() {
  if (spotifyTracksRef) { spotifyTracksRef.off('value'); spotifyTracksRef = null; }
  spotifyTracksData = {};
  renderNowPlayingCarousel();
}

function renderNowPlayingCarousel() {
  const container = document.getElementById('now-playing-carousel');
  if (!container) return;
  const entries = Object.entries(spotifyTracksData);
  if (!entries.length) { container.classList.add('hidden'); return; }
  container.classList.remove('hidden');
  container.innerHTML = entries.map(([uid, track]) => {
    const player    = roomState?.players?.find(p => p.id === uid);
    const name      = player ? esc(player.name) : '';
    const artHTML   = track.albumArt
      ? `<img class="now-playing-art" src="${esc(track.albumArt)}" alt="" loading="lazy">`
      : `<div class="now-playing-art-placeholder">♪</div>`;
    const sourceLogo = track.source === 'lastfm'
      ? `<svg class="now-playing-service-logo" viewBox="0 0 24 24" width="11" height="11" fill="#d51007"><path d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.75c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"/></svg>`
      : `<svg class="now-playing-service-logo" viewBox="0 0 24 24" width="10" height="10" fill="#1DB954"><path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/></svg>`;
    return `<div class="now-playing-item">
      ${artHTML}
      <div class="now-playing-text">
        <span class="now-playing-player">${name}</span>
        <span class="now-playing-title">${esc(track.title)}</span>
        <span class="now-playing-artist">${esc(track.artist)}</span>
      </div>
      ${sourceLogo}
    </div>`;
  }).join('');
}

// ----- Modal -----

function openSpotifyModal() {
  const card = document.getElementById('spotify-modal-card');
  if (!card) return;
  if (isSpotifyConnected()) {
    const raw   = spotifyTracksData[localUid];
    const track = raw?.source === 'lastfm' ? null : raw;
    const trackHTML = track
      ? `<div class="spotify-modal-track">
          ${track.albumArt ? `<img class="spotify-modal-art" src="${esc(track.albumArt)}" alt="">` : ''}
          <div style="min-width:0">
            <div class="spotify-modal-track-title">${esc(track.title)}</div>
            <div class="spotify-modal-track-artist">${esc(track.artist)}</div>
          </div>
        </div>`
      : `<p class="spotify-modal-desc">Sin reproducción activa ahora mismo.</p>`;
    card.innerHTML = `
      ${SPOTIFY_SVG_LARGE}
      <div class="spotify-modal-connected">● Conectado a Spotify</div>
      ${trackHTML}
      <div class="spotify-modal-btns">
        <button class="btn btn-ghost btn-sm" onclick="disconnectSpotify()">Desconectar</button>
        <button class="btn btn-primary btn-sm" onclick="closeSpotifyModal()">Cerrar</button>
      </div>`;
  } else {
    card.innerHTML = `
      ${SPOTIFY_SVG_LARGE}
      <h3 class="spotify-modal-title">Conectar Spotify</h3>
      <p class="spotify-modal-desc">Comparte lo que estás escuchando con los demás jugadores. Aparecerá en la barra superior.</p>
      <div class="spotify-modal-btns">
        <button class="btn spotify-connect-btn btn-sm" onclick="initiateSpotifyAuth()">Conectar cuenta</button>
        <button class="btn btn-ghost btn-sm" onclick="closeSpotifyModal()">Cancelar</button>
      </div>`;
  }
  document.getElementById('spotify-modal').classList.remove('hidden');
}

function closeSpotifyModal() {
  document.getElementById('spotify-modal')?.classList.add('hidden');
}

function spotifyModalBackdropClick(e) {
  if (e.target === document.getElementById('spotify-modal')) closeSpotifyModal();
}

function updateSpotifyButton() {
  const btn = document.getElementById('spotify-btn');
  if (!btn) return;
  btn.classList.toggle('spotify-active', isSpotifyConnected());
  btn.title = isSpotifyConnected() ? 'Spotify conectado' : 'Conectar Spotify';
}

function showSpotifyError(msg) {
  const card = document.getElementById('spotify-modal-card');
  if (!card) return;
  card.innerHTML = `
    ${SPOTIFY_SVG_LARGE}
    <h3 class="spotify-modal-title">Error de Spotify</h3>
    <p class="spotify-modal-desc" style="color:var(--color-danger,#e55)">${esc(msg)}</p>
    <div class="spotify-modal-btns">
      <button class="btn spotify-connect-btn btn-sm" onclick="initiateSpotifyAuth()">Reintentar</button>
      <button class="btn btn-ghost btn-sm" onclick="closeSpotifyModal()">Cerrar</button>
    </div>`;
  document.getElementById('spotify-modal').classList.remove('hidden');
}

// ============================================================
// LAST.FM INTEGRATION
// Polls user.getrecenttracks every 30s. Always shows the most recent track;
// uses @attr.nowplaying to distinguish "now playing" from "last played".
// Works with any service the user has connected to Last.fm (Spotify,
// Apple Music, Tidal, etc.) via scrobbling.
// ============================================================

const LASTFM_API_KEY  = '80b47bbd69a91cddc6d615d8078a86d2';
const LASTFM_API_BASE = 'https://ws.audioscrobbler.com/2.0/';
const LASTFM_SVG_SMALL = `<svg viewBox="0 0 24 24" width="12" height="12" fill="#d51007"><path d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.75c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"/></svg>`;
const LASTFM_SVG_LARGE = `<svg class="lastfm-modal-logo" viewBox="0 0 24 24" width="40" height="40" fill="#d51007"><path d="M10.584 17.21l-.88-2.392s-1.43 1.594-3.573 1.594c-1.897 0-3.244-1.649-3.244-4.288 0-3.382 1.704-4.591 3.381-4.591 2.42 0 3.189 1.567 3.849 3.574l.88 2.749c.88 2.666 2.529 4.81 7.285 4.81 3.409 0 5.718-1.044 5.718-3.793 0-2.227-1.265-3.381-3.63-3.931l-1.758-.385c-1.21-.275-1.567-.77-1.567-1.595 0-.934.742-1.484 1.952-1.484 1.32 0 2.034.495 2.144 1.677l2.749-.33c-.22-2.474-1.924-3.492-4.729-3.492-2.474 0-4.893.935-4.893 3.932 0 1.87.907 3.051 3.189 3.601l1.87.44c1.402.33 1.869.907 1.869 1.704 0 1.017-.99 1.43-2.86 1.43-2.776 0-3.93-1.457-4.59-3.464l-.907-2.75c-1.155-3.573-2.997-4.893-6.653-4.893C2.144 5.333 0 7.89 0 12.233c0 4.18 2.144 6.434 5.993 6.434 3.106 0 4.591-1.457 4.591-1.457z"/></svg>`;

let lastfmPollTimer = null;

function isLastfmConnected() {
  return !!localStorage.getItem('lastfm_username');
}

function disconnectLastfm() {
  stopLastfmPolling();
  clearSpotifyTrackFromRoom();
  localStorage.removeItem('lastfm_username');
  updateLastfmButton();
  closeLastfmModal();
}

async function connectLastfm() {
  const input    = document.getElementById('lastfm-username-input');
  const errEl    = document.getElementById('lastfm-input-error');
  const username = input?.value.trim();
  if (!username) return;
  if (errEl) errEl.textContent = '';
  try {
    const res  = await fetch(`${LASTFM_API_BASE}?method=user.getinfo&user=${encodeURIComponent(username)}&api_key=${LASTFM_API_KEY}&format=json`);
    const data = await res.json();
    if (data.error) {
      if (errEl) errEl.textContent = 'Usuario no encontrado en Last.fm.';
      return;
    }
    localStorage.setItem('lastfm_username', data.user.name);
    startLastfmPolling();
    updateLastfmButton();
    openLastfmModal();
  } catch (e) {
    if (errEl) errEl.textContent = 'Error de conexión. Intenta de nuevo.';
  }
}

async function fetchLastfmNowPlaying() {
  const username = localStorage.getItem('lastfm_username');
  if (!username) return;
  try {
    const res  = await fetch(`${LASTFM_API_BASE}?method=user.getrecenttracks&user=${encodeURIComponent(username)}&api_key=${LASTFM_API_KEY}&format=json&limit=1`);
    const data = await res.json();
    if (data.error) {
      if (data.error === 6) {
        localStorage.removeItem('lastfm_username');
        updateLastfmButton();
      }
      clearSpotifyTrackFromRoom();
      return;
    }
    const tracks = data.recenttracks?.track;
    const track  = Array.isArray(tracks) ? tracks[0] : tracks;
    if (track) {
      const img       = track.image?.find(i => i.size === 'medium')?.['#text'] || '';
      const isPlaying = track?.['@attr']?.nowplaying === 'true';
      updateSpotifyTrackInRoom({
        title:     track.name,
        artist:    track.artist['#text'],
        albumArt:  img.startsWith('http') ? img : null,
        source:    'lastfm',
        isPlaying,
      });
    } else {
      clearSpotifyTrackFromRoom();
    }
  } catch (e) {
    console.error('Last.fm fetch error:', e);
  }
}

function startLastfmPolling() {
  stopLastfmPolling();
  fetchLastfmNowPlaying();
  lastfmPollTimer = setInterval(fetchLastfmNowPlaying, 30000);
}

function stopLastfmPolling() {
  clearInterval(lastfmPollTimer);
  lastfmPollTimer = null;
}

function openLastfmModal() {
  const card = document.getElementById('lastfm-modal-card');
  if (!card) return;
  const username = localStorage.getItem('lastfm_username');
  if (username) {
    const raw   = spotifyTracksData[localUid];
    const track = raw?.source === 'lastfm' ? raw : null;
    const trackLabel = track?.isPlaying ? 'Escuchando ahora' : 'Última escuchada';
    const trackHTML = track
      ? `<div class="lastfm-modal-track">
          ${track.albumArt ? `<img class="lastfm-modal-art" src="${esc(track.albumArt)}" alt="">` : ''}
          <div style="min-width:0">
            <div class="lastfm-modal-track-label">${trackLabel}</div>
            <div class="lastfm-modal-track-title">${esc(track.title)}</div>
            <div class="lastfm-modal-track-artist">${esc(track.artist)}</div>
          </div>
        </div>`
      : `<p class="lastfm-modal-desc">Sin historial de Last.fm.</p>`;
    card.innerHTML = `
      ${LASTFM_SVG_LARGE}
      <div class="lastfm-modal-connected">● Conectado como ${esc(username)}</div>
      ${trackHTML}
      <div class="lastfm-modal-btns">
        <button class="btn btn-ghost btn-sm" onclick="disconnectLastfm()">Desconectar</button>
        <button class="btn btn-primary btn-sm" onclick="closeLastfmModal()">Cerrar</button>
      </div>`;
  } else {
    card.innerHTML = `
      ${LASTFM_SVG_LARGE}
      <h3 class="lastfm-modal-title">Conectar Last.fm</h3>
      <p class="lastfm-modal-desc">Introduce tu usuario de Last.fm para compartir lo que escuchas (funciona con Spotify, Apple Music, Tidal y más).</p>
      <input id="lastfm-username-input" class="lastfm-username-input" type="text" placeholder="Tu usuario de Last.fm" autocomplete="off" onkeydown="if(event.key==='Enter')connectLastfm()">
      <span id="lastfm-input-error" class="lastfm-input-error"></span>
      <div class="lastfm-modal-btns">
        <button class="btn lastfm-connect-btn btn-sm" onclick="connectLastfm()">Conectar</button>
        <button class="btn btn-ghost btn-sm" onclick="closeLastfmModal()">Cancelar</button>
      </div>`;
    setTimeout(() => document.getElementById('lastfm-username-input')?.focus(), 50);
  }
  document.getElementById('lastfm-modal').classList.remove('hidden');
}

function closeLastfmModal() {
  document.getElementById('lastfm-modal')?.classList.add('hidden');
}

function lastfmModalBackdropClick(e) {
  if (e.target === document.getElementById('lastfm-modal')) closeLastfmModal();
}

function updateLastfmButton() {
  const btn = document.getElementById('lastfm-btn');
  if (!btn) return;
  btn.classList.toggle('lastfm-active', isLastfmConnected());
  btn.title = isLastfmConnected()
    ? `Last.fm: ${localStorage.getItem('lastfm_username')}`
    : 'Conectar Last.fm';
}

function notify(title, body) {
  if (!notifEnabled || Notification.permission !== 'granted') return;
  if (!document.hidden && document.hasFocus()) return;
  playNotifSound();
  try { new Notification(title, { body, tag: 'unomentiroso' }); } catch (_) {}
}

function checkNotifications(state) {
  const prev = prevNotifState;
  prevNotifState = {
    status: state.status,
    currentPlayerIndex: state.currentPlayerIndex,

    unoCallRequiredFor: state.unoCallRequired?.playerId || null,
  };
  if (!prev) return;

  if (prev.status === 'lobby' && state.status === 'playing') {
    const first = state.players[state.currentPlayerIndex];
    notify('¡La partida comenzó!', `${first?.name || '?'} va primero.`);
    return;
  }
  if (prev.status !== 'ended' && state.status === 'ended') {
    const won = state.winner === localUid;
    notify(won ? '🥳 ¡Ganaste!' : '🃏 Partida terminada',
           won ? '¡Felicidades!' : `Ganó ${state.winnerName || '?'}`);
    return;
  }
  if (state.status !== 'playing') return;

  if (prev.currentPlayerIndex !== state.currentPlayerIndex &&
      state.players[state.currentPlayerIndex]?.id === localUid) {
    notify('¡Es tu turno!', 'Elige una carta para jugar.');
    return;
  }

  if (!prev.unoCallRequiredFor && state.unoCallRequired?.playerId === localUid) {
    notify('¡UNO!', '¡Solo te queda 1 carta! Grita UNO antes de que alguien te atrape.');
  }
}

// ============================================================
// CARD SELECTION — opens claim dialog
// ============================================================

async function selectCard(index) {
  if (!roomState) return;
  if (roomState.wildChallenge) return;
  const myHand = roomState.hands?.[localUid] || [];
  const card = myHand[index];
  if (!card) return;

  // Speed Play: number card matching both color AND value when not your turn
  if (!isMyTurn(roomState) && !roomState.wildPileUpPhase &&
      !roomState.pointTakenPhase && !roomState.wild4Challenge) {
    if (NUMBERS.includes(card.value) &&
        card.color === roomState.topColor && card.value === roomState.topValue) {
      await speedPlayCard(index, card);
    }
    return;
  }

  // Wild Pile Up phase: player must play on the pile or take it
  if (roomState.wildPileUpPhase) {
    const phase = roomState.wildPileUpPhase;
    const holderPlayer = roomState.players[phase.holderIndex];
    if (holderPlayer?.id === localUid) {
      if (card.color === phase.pileColor) {
        await handlePlayOnPile(index);
      }
    }
    return;
  }

  if (!isMyTurn(roomState)) return;

  if (drawnCardState !== null && index === drawnCardState.cardIdx && !drawnCardState.canPlay) return;

  if (!isActualPlayable(card, roomState)) {
    alert('No puedes jugar esta carta. Elige otra o roba.');
    return;
  }

  selectedCardIdx = index;
  selectedActualCard = card;
  if (card.color === 'black') {
    claimColor = roomState.topColor || 'red';
  } else {
    claimColor = card.color;
  }
  claimValue = card.value;

  const preview = document.getElementById('actual-card-preview');
  const _lbl = VALUE_LABEL[card.value];
  const _isWild = WILDS.includes(card.value);
  const _centerHTML = _isWild ? wildCenterHTML(card.value)
    : card.value === 'reverse' ? reverseCenterHTML()
    : `<span class="card-label center" style="font-size:1.2rem">${_lbl}</span>`;
  preview.innerHTML = `<div class="card ${card.color}" style="width:50px;height:75px;margin:0 auto">
    ${cornerLabelHTML(card.value, 'tl')}
    ${_centerHTML}
    ${cornerLabelHTML(card.value, 'br')}
  </div>`;

  if (card.value === 'pointTaken') {
    document.getElementById('claim-dialog').classList.add('hidden');
    await startPointTakenPhase(card, index);
    selectedCardIdx = null;
    selectedActualCard = null;
  } else if (card.value === 'wildPileUp') {
    document.getElementById('claim-dialog').classList.add('hidden');
    await startWildPileUp(card, index);
    selectedCardIdx = null;
    selectedActualCard = null;
  } else if (card.value === 'wildDrawnTogether') {
    document.getElementById('claim-dialog').classList.add('hidden');
    showDrawnTogetherDialog(index);
  } else if (card.value === 'wild') {
    document.getElementById('claim-dialog-title').textContent = 'Elige el color del Comodín';
    document.getElementById('actual-card-preview').classList.add('hidden');
    renderClaimPicker();
    document.getElementById('claim-dialog').classList.remove('hidden');
  } else if (card.value === 'wild4') {
    document.getElementById('claim-dialog-title').textContent = 'Elige el color para el +4';
    document.getElementById('actual-card-preview').classList.add('hidden');
    renderClaimPicker();
    document.getElementById('claim-dialog').classList.remove('hidden');
  } else if (card.value === 'wildc4Plus') {
    document.getElementById('claim-dialog-title').textContent = 'Elige el color para el +4';
    document.getElementById('actual-card-preview').classList.add('hidden');
    renderClaimPicker();
    document.getElementById('claim-dialog').classList.remove('hidden');
  } else {
    document.getElementById('claim-dialog').classList.add('hidden');
    await playNormalCard(card, index);
    selectedCardIdx = null;
    selectedActualCard = null;
  }
}

function renderClaimPicker() {
  document.getElementById('claim-color-picker').innerHTML = COLORS.map(c =>
    `<button class="color-btn ${c} ${claimColor === c ? 'selected' : ''}"
      onclick="setClaimColor('${c}')" title="${COLOR_NAME[c]}"></button>`
  ).join('');

  const valuePicker = document.getElementById('claim-value-picker');
  if (selectedActualCard?.value === 'wild') {
    valuePicker.innerHTML = '';
  } else {
    // Regular wild is always face-up — can never be lied about.
    // Wild4 can be declared by any party card.
    const allowedValues = ALL_VALUES.filter(v => v !== 'wild');
    valuePicker.innerHTML = allowedValues.map(v => {
      const label = v === 'wild4' ? 'COMODÍN +4' : VALUE_LABEL[v];
      return `<button class="value-btn ${claimValue === v ? 'selected' : ''}"
        onclick="setClaimValue('${v}')">${label}</button>`;
    }).join('');
  }
}

function setClaimColor(color) { claimColor = color; renderClaimPicker(); }
function setClaimValue(value) {
  if (value === 'wild') return;
  claimValue = value;
  renderClaimPicker();
}

function cancelPlay() {
  selectedCardIdx = null;
  selectedActualCard = null;
  document.getElementById('claim-dialog').classList.add('hidden');
}

async function confirmPlay() {
  if (selectedCardIdx === null || !claimColor || !claimValue) return;
  const myHand = roomState?.hands?.[localUid] || [];
  const actualCard = myHand[selectedCardIdx];
  if (!actualCard) return;

  if (actualCard.value === 'wild4' || actualCard.value === 'wildc4Plus') {
    document.getElementById('claim-dialog').classList.add('hidden');
    await startWild4Challenge(actualCard, claimColor, selectedCardIdx);
    selectedCardIdx = null;
    selectedActualCard = null;
    return;
  }

  document.getElementById('claim-dialog').classList.add('hidden');
  await playNormalCard(actualCard, selectedCardIdx, claimColor);

  selectedCardIdx = null;
  selectedActualCard = null;
}

// ============================================================
// WILD CHALLENGE
// ============================================================

async function startWildChallenge(actualCard, chosenColor, cardIndex) {
  const state = roomState;
  const myHand = [...(state.hands?.[localUid] || [])];
  const newHand = myHand.filter((_, i) => i !== cardIndex);
  const newHands = { ...state.hands, [localUid]: newHand };
  const players = state.players.map(p =>
    p.id === localUid ? { ...p, cardCount: newHand.length } : p
  );
  const others = state.players.filter(p => p.id !== localUid).map(p => p.id);

  const log = addLog(state.log,
    `${localName} jugó Comodín y elige ${COLOR_NAME[chosenColor]}. ¡Todos ponen una carta boca abajo!`
  );

  await db.collection('rooms').doc(currentRoomId).update({
    players, hands: newHands,
    topColor: 'black', topValue: 'wild',
    challengeOpen: false,
    lastActualCard: null, lastClaimedCard: null,
    wildChallenge: {
      phase: 'collecting',
      chooserId: localUid,
      chooserName: localName,
      chosenColor,
      playersNeeded: others,
      submittedCards: {},
      flippedCards: {},
      accusePool: [...others],
      accusedWrong: [],
      foundPlayerId: null,
      discardQueue: [],
      nextPlayerIndex: nextPlayerIndex(state),
    },
    log,
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function submitWildCard(cardIndex) {
  const state = roomState;
  const wc = state.wildChallenge;
  if (!wc || wc.phase !== 'collecting') return;
  if (!wc.playersNeeded.includes(localUid)) return;

  const myHand = [...(state.hands?.[localUid] || [])];
  const card = myHand[cardIndex];
  if (!card) return;
  if (card.color === 'black') { alert('No puedes usar un comodín en esta actividad.'); return; }

  const newHand = myHand.filter((_, i) => i !== cardIndex);
  const newHands = { ...state.hands, [localUid]: newHand };
  const players = state.players.map(p =>
    p.id === localUid ? { ...p, cardCount: newHand.length } : p
  );
  const newSubmitted = { ...wc.submittedCards, [localUid]: card };
  const newPlayersNeeded = wc.playersNeeded.filter(id => id !== localUid);
  const allIn = newPlayersNeeded.length === 0;

  const newWC = {
    ...wc,
    submittedCards: newSubmitted,
    playersNeeded: newPlayersNeeded,
    phase: allIn ? 'accusing' : 'collecting',
  };

  const updates = { hands: newHands, players, wildChallenge: newWC,
    lastActivity: firebase.firestore.FieldValue.serverTimestamp() };
  if (allIn) {
    updates.log = addLog(state.log,
      `Todos pusieron su carta. ¡${wc.chooserName} elige a quién acusar!`);
  }
  await db.collection('rooms').doc(currentRoomId).update(updates);
}

async function accuseWildPlayer(targetId) {
  const state = roomState;
  const wc = state.wildChallenge;
  if (!wc || wc.phase !== 'accusing') return;
  if (wc.chooserId !== localUid) return;
  if (!wc.accusePool.includes(targetId)) return;

  const targetName = state.players.find(p => p.id === targetId)?.name || '?';
  const submitted = wc.submittedCards[targetId];
  if (!submitted) return;

  const hasColor = submitted.color === wc.chosenColor;
  let { hands, players, drawPile } = state;
  let log = state.log;

  const newAccusePool = wc.accusePool.filter(id => id !== targetId);
  const newFlipped = { ...(wc.flippedCards || {}), [targetId]: { card: submitted, result: hasColor ? 'correct' : 'wrong' } };

  if (!hasColor) {
    const { drawn, newDrawPile } = takeCards(drawPile, 1);
    drawPile = newDrawPile;
    hands = { ...hands, [targetId]: [...(hands[targetId] || []), submitted, ...drawn] };
    players = players.map(p => p.id === targetId ? { ...p, cardCount: hands[p.id].length } : p);
    const newSubmitted = { ...wc.submittedCards };
    delete newSubmitted[targetId];

    log = addLog(log,
      `${localName} acusa a ${targetName} - ¡Mintió! No tiene ${COLOR_NAME[wc.chosenColor]}. Devuelve la carta a su mano y roba 1.`);

    const goChoosing = newAccusePool.length === 0;
    await db.collection('rooms').doc(currentRoomId).update({
      hands, players, drawPile,
      wildChallenge: { ...wc, submittedCards: newSubmitted, accusePool: newAccusePool,
        accusedWrong: [...wc.accusedWrong, targetId],
        flippedCards: newFlipped,
        phase: goChoosing ? 'choosing' : 'accusing' },
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    // Found — flip all remaining unaccused players' cards face-up as 'discarded'
    const discardQueue = newAccusePool;
    let finalFlipped = { ...newFlipped };
    const newSubmittedAfterDiscard = { ...wc.submittedCards };
    delete newSubmittedAfterDiscard[targetId];
    const discardedDescriptions = [];
    for (const rid of discardQueue) {
      const rCard = wc.submittedCards[rid];
      if (rCard) {
        finalFlipped[rid] = { card: rCard, result: 'discarded' };
        delete newSubmittedAfterDiscard[rid];
        const rName = state.players.find(p => p.id === rid)?.name || '?';
        discardedDescriptions.push(`${rName}: ${COLOR_NAME[rCard.color]} ${VALUE_LABEL[rCard.value]}`);
      }
    }
    const discardNote = discardedDescriptions.length > 0
      ? ` Cartas descartadas — ${discardedDescriptions.join(', ')}.`
      : '';
    log = addLog(log,
      `✅ ${localName} acusa a ${targetName} — ¡sí tenía ${COLOR_NAME[wc.chosenColor]}! Actividad terminada.${discardNote}`);

    await db.collection('rooms').doc(currentRoomId).update({
      wildChallenge: { ...wc, accusePool: newAccusePool, foundPlayerId: targetId,
        submittedCards: newSubmittedAfterDiscard,
        discardQueue, flippedCards: finalFlipped,
        phase: discardQueue.length > 0 ? 'resolving' : 'choosing' },
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

async function discardWildResolved() {
  const state = roomState;
  const wc = state.wildChallenge;
  if (!wc || wc.phase !== 'resolving') return;
  if (wc.chooserId !== localUid) return;

  const log = addLog(state.log, `Las cartas restantes son descartadas.`);
  await db.collection('rooms').doc(currentRoomId).update({
    wildChallenge: { ...wc, discardQueue: [], phase: 'choosing' },
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function finalizeWildColor(color) {
  const state = roomState;
  const wc = state.wildChallenge;
  if (!wc || wc.phase !== 'choosing') return;
  if (wc.chooserId !== localUid) return;

  const log = addLog(state.log, `${localName} elige el color final: ${COLOR_NAME[color]}.`);
  await db.collection('rooms').doc(currentRoomId).update({
    topColor: color, topValue: 'wild',
    currentPlayerIndex: wc.nextPlayerIndex,
    wildChallenge: firebase.firestore.FieldValue.delete(),
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function buildWcCardTable(wc, state) {
  const nonChoosers = state.players.filter(p => p.id !== wc.chooserId);
  const flipped = wc.flippedCards || {};
  const slots = nonChoosers.map(p => {
    const pid = p.id;
    const flippedEntry = flipped[pid];
    let cardHTML;
    if (flippedEntry) {
      const cls = flippedEntry.result === 'correct' ? 'wc-flip-correct'
                : flippedEntry.result === 'discarded' ? 'wc-flip-discarded'
                : 'wc-flip-wrong';
      const badge = flippedEntry.result === 'correct' ? '✓'
                  : flippedEntry.result === 'discarded' ? '✕'
                  : '✗';
      cardHTML = `<div class="wc-slot-flipped ${cls}">${buildCardHTML(flippedEntry.card)}<div class="wc-flip-badge">${badge}</div></div>`;
    } else if (wc.submittedCards?.[pid]) {
      cardHTML = `<div class="wc-card-back"><span class="back-uno">UNO</span><span class="back-party">FIESTA</span></div>`;
    } else if (wc.playersNeeded?.includes(pid)) {
      cardHTML = `<div class="wc-slot-empty">?</div>`;
    } else {
      cardHTML = `<div class="wc-card-back"><span class="back-uno">UNO</span><span class="back-party">FIESTA</span></div>`;
    }
    return `<div class="wc-card-slot">${cardHTML}<span class="wc-slot-name">${esc(p.name)}</span></div>`;
  }).join('');
  return `<div class="wc-table">${slots}</div>`;
}

function renderWildChallenge(state) {
  const panel = document.getElementById('wild-challenge-panel');
  const wc = state.wildChallenge;
  if (!wc) { panel.classList.add('hidden'); return; }

  panel.classList.remove('hidden');
  const title   = document.getElementById('wc-title');
  const body    = document.getElementById('wc-body');
  const handEl  = document.getElementById('wc-hand');
  const actions = document.getElementById('wc-actions');
  const logEl   = document.getElementById('wc-log');

  const colorSpan = (c) => {
    const hex = LOG_COLOR_HEX[c] || '#fff';
    return `<span style="color:${hex};font-weight:700">${COLOR_NAME[c]}</span>`;
  };

  handEl.classList.add('hidden');
  handEl.innerHTML = '';
  actions.innerHTML = '';

  if (logEl) {
    logEl.innerHTML = [...(state.log || [])].reverse().slice(0, 6).map(msg => {
      const cls = msg.includes('descubrió') || msg.includes('¡Mintió!') ? ' log-lie'
                : /dijo la verdad/i.test(msg) || msg.includes('¡sí tenía') ? ' log-truth'
                : msg.includes('le gritó UNO') ? ' log-uno'
                : msg.includes('¡UNO! 🎴') ? ' log-uno-call'
                : /intercambi/.test(msg) ? ' log-swap'
                : '';
      return `<div class="log-entry${cls}">${colorizeLog(msg)}</div>`;
    }).join('');
  }

  const table = buildWcCardTable(wc, state);

  if (wc.phase === 'collecting') {
    const needsToSubmit = wc.playersNeeded?.includes(localUid) && wc.chooserId !== localUid;

    if (needsToSubmit) {
      title.innerHTML = `🃏 ${esc(wc.chooserName)} jugó ${rainbowHTML('Comodín')}<br>¡Pon una carta — color ${colorSpan(wc.chosenColor)}!`;
      body.innerHTML = `<p>Toca una carta de tu mano (no comodines)</p>${table}`;
      const myHand = state.hands?.[localUid] || [];
      handEl.classList.remove('hidden');
      handEl.innerHTML = myHand.map((card, i) => {
        const disabled = card.color === 'black';
        const lbl = VALUE_LABEL[card.value];
        const center = WILDS.includes(card.value) ? wildCenterHTML(card.value)
          : card.value === 'reverse' ? reverseCenterHTML()
          : `<span class="card-label center">${lbl}</span>`;
        return `<div class="card ${card.color} ${disabled?'wc-disabled':'playable'}"
          ${disabled ? '' : `onclick="submitWildCard(${i})"`}>
          ${cornerLabelHTML(card.value,'tl')}${center}${cornerLabelHTML(card.value,'br')}
        </div>`;
      }).join('');
    } else {
      title.innerHTML = `🃏 Comodín — ${colorSpan(wc.chosenColor)}`;
      const waitingNames = (wc.playersNeeded || [])
        .map(id => esc(state.players.find(p => p.id === id)?.name || '?')).join(', ');
      const waitingLine = waitingNames
        ? `<p style="color:rgba(255,255,255,.45);font-size:.8rem">Esperando: ${waitingNames}</p>` : '';
      body.innerHTML = `${table}${waitingLine}`;
    }
  }

  else if (wc.phase === 'accusing') {
    if (wc.chooserId === localUid) {
      title.innerHTML = `🫵 ¿Quién tiene ${colorSpan(wc.chosenColor)}?`;
      const buttons = wc.accusePool.map(id => {
        const p = state.players.find(pl => pl.id === id);
        return `<button class="btn btn-danger" style="width:100%" onclick="accuseWildPlayer('${id}')">
          Acusar a ${esc(p?.name || '?')}</button>`;
      }).join('');
      body.innerHTML = `${table}<div class="wc-accuse-list">${buttons}</div>`;
    } else {
      title.innerHTML = `🫵 ${esc(wc.chooserName)} está acusando…`;
      body.innerHTML = table;
    }
  }

  else if (wc.phase === 'resolving') {
    const found = state.players.find(p => p.id === wc.foundPlayerId);
    title.innerHTML = `✅ ¡${esc(found?.name||'?')} tenía ${colorSpan(wc.chosenColor)}!`;
    body.innerHTML = table;
    if (wc.chooserId === localUid) {
      actions.innerHTML = `<button class="btn btn-primary" onclick="discardWildResolved()">Descartar y elegir color</button>`;
    } else {
      body.innerHTML += `<p style="margin-top:.5rem;color:rgba(255,255,255,.45);font-size:.85rem">Esperando a ${esc(wc.chooserName)}…</p>`;
    }
  }

  else if (wc.phase === 'choosing') {
    if (wc.chooserId === localUid) {
      title.innerHTML = `🎨 Elige el color final del ${rainbowHTML('Comodín')}`;
      const btns = COLORS.map(c =>
        `<button class="color-btn ${c}" onclick="finalizeWildColor('${c}')" title="${COLOR_NAME[c]}"></button>`
      ).join('');
      body.innerHTML = `${table}<div class="wc-color-row">${btns}</div>`;
    } else {
      title.innerHTML = `🎨 ${esc(wc.chooserName)} elige el color final…`;
      body.innerHTML = table;
    }
  }
}

// ============================================================
// POINT TAKEN CARD
// ============================================================

async function startPointTakenPhase(card, cardIndex) {
  const state = roomState;
  const myHand = [...(state.hands?.[localUid] || [])];
  const newHand = myHand.filter((_, i) => i !== cardIndex);
  const newHands = { ...state.hands, [localUid]: newHand };
  const players = state.players.map(p =>
    p.id === localUid ? { ...p, cardCount: newHand.length } : p
  );
  const n = state.players.length;
  const nextIdx = ((state.currentPlayerIndex + state.direction) % n + n) % n;
  const log = addLog(state.log,
    `${localName} jugó ☝️ Carta Apunta y Toma. ¡Todos apuntan a un jugador!`
  );
  await db.collection('rooms').doc(currentRoomId).update({
    players, hands: newHands,
    topColor: card.color, topValue: 'pointTaken',
    pointTakenPhase: { triggerPlayerId: localUid, nextPlayerIndex: nextIdx, votes: {} },
    linkedPlayers: firebase.firestore.FieldValue.delete(),
    pendingSkips: firebase.firestore.FieldValue.delete(),
    challengeOpen: false,
    lastActualCard: null, lastClaimedCard: null,
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function handlePointTakenVote(targetId) {
  const state = roomState;
  const phase = state.pointTakenPhase;
  if (!phase || phase.votes[localUid]) return;

  const newVotes = { ...phase.votes, [localUid]: targetId };
  const eligible = state.players.filter(p => !p.disconnected);
  const allVoted = eligible.every(p => newVotes[p.id]);

  if (!allVoted) {
    await db.collection('rooms').doc(currentRoomId).update({
      'pointTakenPhase.votes': newVotes,
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  // All voted — tally and apply draws
  let { hands, players, drawPile } = state;
  let log = state.log;
  const voteCounts = {};
  for (const vid of Object.values(newVotes)) {
    voteCounts[vid] = (voteCounts[vid] || 0) + 1;
  }
  const n = players.length;
  for (let i = 0; i < n; i++) {
    const p = players[(phase.nextPlayerIndex + i) % n];
    const count = Math.min(voteCounts[p.id] || 0, 5);
    if (count > 0) {
      const { drawn, newDrawPile } = takeCards(drawPile, count);
      drawPile = newDrawPile;
      hands = { ...hands, [p.id]: [...(hands[p.id] || []), ...drawn] };
      log = addLog(log, `${p.name} fue apuntado ${count} vez/veces → roba ${count}.`);
    }
  }
  players = players.map(p => ({ ...p, cardCount: (hands[p.id] || []).length }));
  await db.collection('rooms').doc(currentRoomId).update({
    hands, players, drawPile,
    pointTakenPhase: firebase.firestore.FieldValue.delete(),
    currentPlayerIndex: phase.nextPlayerIndex,
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function renderPointTakenOverlay(state) {
  const el = document.getElementById('point-taken-overlay');
  const phase = state.pointTakenPhase;
  if (!phase) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');

  const myVote = phase.votes[localUid];
  const eligible = state.players.filter(p => !p.disconnected);
  const voted = eligible.filter(p => phase.votes[p.id]).length;

  document.getElementById('pt-wait-msg').textContent =
    `${voted} / ${eligible.length} jugadores apuntaron`;

  if (myVote) {
    document.getElementById('pt-targets').classList.add('hidden');
    document.getElementById('pt-voted').classList.remove('hidden');
    const target = state.players.find(p => p.id === myVote);
    document.getElementById('pt-voted').textContent = `✓ Apuntaste a ${esc(target?.name || '?')}`;
  } else {
    document.getElementById('pt-voted').classList.add('hidden');
    document.getElementById('pt-targets').classList.remove('hidden');
    const others = state.players.filter(p => p.id !== localUid && !p.disconnected);
    document.getElementById('pt-targets').innerHTML = others.map(p =>
      `<button class="btn btn-secondary pt-target-btn" onclick="handlePointTakenVote('${p.id}')">
        👉 ${esc(p.name)}
      </button>`
    ).join('');
  }
}

// ============================================================
// WILD PILE UP CARD
// ============================================================

async function startWildPileUp(card, cardIndex) {
  const state = roomState;
  const myHand = [...(state.hands?.[localUid] || [])];
  const newHand = myHand.filter((_, i) => i !== cardIndex);
  const newHands = { ...state.hands, [localUid]: newHand };
  const players = state.players.map(p =>
    p.id === localUid ? { ...p, cardCount: newHand.length } : p
  );
  let { drawPile } = state;

  // Draw cards from the pile until we get a non-Wild card
  const pile = [];
  for (let attempts = 0; attempts < 10; attempts++) {
    const { drawn, newDrawPile } = takeCards(drawPile, 1);
    if (!drawn.length) break;
    drawPile = newDrawPile;
    pile.push(drawn[0]);
    if (drawn[0].color !== 'black') break;
  }
  const pileColor = pile.length ? pile[pile.length - 1].color : state.topColor;

  const n = state.players.length;
  const nextIdx = ((state.currentPlayerIndex + state.direction) % n + n) % n;

  const log = addLog(state.log,
    `${localName} jugó ⬆ Comodín Pila Salvaje. Mini-pila con ${pile.length} carta(s), color ${COLOR_NAME[pileColor]}.`
  );
  await db.collection('rooms').doc(currentRoomId).update({
    players, hands: newHands, drawPile,
    topColor: pileColor, topValue: 'wildPileUp',
    wildPileUpPhase: { pile, pileColor, holderIndex: nextIdx },
    challengeOpen: false,
    lastActualCard: null, lastClaimedCard: null,
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function handlePlayOnPile(cardIndex) {
  const state = roomState;
  const phase = state.wildPileUpPhase;
  if (!phase) return;
  const myPlayer = state.players[phase.holderIndex];
  if (myPlayer?.id !== localUid) return;

  const myHand = [...(state.hands?.[localUid] || [])];
  const card = myHand[cardIndex];
  if (!card) return;
  if (card.color !== phase.pileColor) return;

  const newHand = myHand.filter((_, i) => i !== cardIndex);
  let newHands = { ...state.hands, [localUid]: newHand };
  let players = state.players.map(p =>
    p.id === localUid ? { ...p, cardCount: newHand.length } : p
  );
  // Wild cards do NOT change pile color
  const newPile = [...phase.pile, card];
  const newPileColor = phase.pileColor;

  const n = players.length;
  const nextIdx = ((phase.holderIndex + state.direction) % n + n) % n;
  const nextHolder = players[nextIdx];
  const nextHand = state.hands?.[nextHolder?.id] || [];
  const nextCanPlay = nextHand.some(c => c.color === newPileColor);

  let log = addLog(state.log,
    `${localName} jugó ${COLOR_NAME[card.color]} ${VALUE_LABEL[card.value]} en la mini-pila.`
  );

  if (!nextCanPlay && nextHolder && !nextHolder.disconnected) {
    // Give entire pile to next holder — they can't play
    newHands = { ...newHands, [nextHolder.id]: [...nextHand, ...newPile] };
    players = players.map(p => ({ ...p, cardCount: (newHands[p.id] || []).length }));
    const afterNextIdx = ((nextIdx + state.direction) % n + n) % n;
    log = addLog(log,
      `${nextHolder.name} no puede jugar → toma la mini-pila (${newPile.length} cartas). El color que continúa es ${COLOR_NAME[newPileColor]}.`
    );
    await db.collection('rooms').doc(currentRoomId).update({
      hands: newHands, players,
      topColor: newPileColor, topValue: 'wildPileUp',
      wildPileUpPhase: firebase.firestore.FieldValue.delete(),
      currentPlayerIndex: afterNextIdx,
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    await db.collection('rooms').doc(currentRoomId).update({
      hands: newHands, players,
      topColor: newPileColor,
      wildPileUpPhase: { ...phase, pile: newPile, pileColor: newPileColor, holderIndex: nextIdx },
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

async function handleTakePile() {
  const state = roomState;
  const phase = state.wildPileUpPhase;
  if (!phase) return;
  const myPlayer = state.players[phase.holderIndex];
  if (myPlayer?.id !== localUid) return;

  let newHands = { ...state.hands };
  let players = [...state.players];
  const myHand = state.hands?.[localUid] || [];
  newHands[localUid] = [...myHand, ...phase.pile];
  players = players.map(p => ({ ...p, cardCount: (newHands[p.id] || []).length }));

  const n = players.length;
  const afterIdx = ((phase.holderIndex + state.direction) % n + n) % n;
  const log = addLog(state.log,
    `${localName} toma la mini-pila (${phase.pile.length} cartas). El color que continúa es ${COLOR_NAME[phase.pileColor]}.`
  );
  await db.collection('rooms').doc(currentRoomId).update({
    hands: newHands, players,
    topColor: phase.pileColor, topValue: 'wildPileUp',
    wildPileUpPhase: firebase.firestore.FieldValue.delete(),
    currentPlayerIndex: afterIdx,
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function renderWildPileUpPanel(state) {
  const el = document.getElementById('pile-up-panel');
  const phase = state.wildPileUpPhase;
  if (!phase) { el.classList.add('hidden'); return; }
  el.classList.remove('hidden');

  const holder = state.players[phase.holderIndex];
  const isHolder = holder?.id === localUid;
  const myHand = state.hands?.[localUid] || [];
  const hasMatch = myHand.some(c => c.color === phase.pileColor);

  document.getElementById('pu-title').innerHTML =
    `⬆ Mini-Pila — color <strong style="color:${LOG_COLOR_HEX[phase.pileColor]}">${COLOR_NAME[phase.pileColor]}</strong>` +
    ` (${phase.pile.length} carta${phase.pile.length !== 1 ? 's' : ''})`;
  document.getElementById('pu-holder').textContent =
    isHolder ? '¡Es tu turno! Juega una carta del color de la pila o toma la pila.'
             : `Esperando que ${esc(holder?.name || '?')} juegue…`;
  document.getElementById('pu-cards').innerHTML =
    phase.pile.map(c => buildCardHTML(c)).join('');
  const takePileBtn = document.getElementById('pu-take-btn');
  if (isHolder) {
    takePileBtn.classList.toggle('hidden', hasMatch);
  } else {
    takePileBtn.classList.add('hidden');
  }
}

// ============================================================
// WILD DRAWN TOGETHER CARD
// ============================================================

let drawnTogetherCardIndex = null;
let drawnTogetherSelected = [];

function showDrawnTogetherDialog(cardIndex) {
  drawnTogetherCardIndex = cardIndex;
  drawnTogetherSelected = [];
  selectedCardIdx = cardIndex;
  selectedActualCard = roomState?.hands?.[localUid]?.[cardIndex] || null;
  claimColor = roomState?.topColor || 'red';
  renderDrawnTogetherDialog(roomState);
  document.getElementById('drawn-together-dialog').classList.remove('hidden');
}

function cancelDrawnTogether() {
  document.getElementById('drawn-together-dialog').classList.add('hidden');
  drawnTogetherCardIndex = null;
  drawnTogetherSelected = [];
  selectedCardIdx = null;
  selectedActualCard = null;
}

function toggleDrawnTogetherPlayer(pid) {
  const idx = drawnTogetherSelected.indexOf(pid);
  if (idx === -1) {
    if (drawnTogetherSelected.length < 2) drawnTogetherSelected.push(pid);
  } else {
    drawnTogetherSelected.splice(idx, 1);
  }
  renderDrawnTogetherDialog(roomState);
}

function setDTColor(color) { claimColor = color; renderDrawnTogetherDialog(roomState); }

function renderDrawnTogetherDialog(state) {
  const el = document.getElementById('drawn-together-dialog');
  if (!state || el.classList.contains('hidden')) return;
  const others = state.players.filter(p => p.id !== localUid && !p.disconnected);
  document.getElementById('dt-players').innerHTML = others.map(p => {
    const sel = drawnTogetherSelected.includes(p.id);
    return `<button class="btn ${sel ? 'btn-primary' : 'btn-secondary'} dt-player-btn"
      onclick="toggleDrawnTogetherPlayer('${p.id}')">
      ${sel ? '⛓ ' : ''}${esc(p.name)}
    </button>`;
  }).join('');
  document.getElementById('dt-color-picker').innerHTML = COLORS.map(c =>
    `<button class="color-btn ${c} ${claimColor === c ? 'selected' : ''}"
      onclick="setDTColor('${c}')" title="${COLOR_NAME[c]}"></button>`
  ).join('');
  const confirmBtn = document.getElementById('dt-confirm-btn');
  confirmBtn.disabled = drawnTogetherSelected.length !== 2;
}

async function confirmDrawnTogether() {
  if (drawnTogetherSelected.length !== 2 || drawnTogetherCardIndex === null) return;
  document.getElementById('drawn-together-dialog').classList.add('hidden');
  await startWildDrawnTogether(drawnTogetherCardIndex, [...drawnTogetherSelected], claimColor);
  drawnTogetherCardIndex = null;
  drawnTogetherSelected = [];
  selectedCardIdx = null;
  selectedActualCard = null;
}

async function startWildDrawnTogether(cardIndex, linkedIds, chosenColor) {
  const state = roomState;
  const myHand = [...(state.hands?.[localUid] || [])];
  const newHand = myHand.filter((_, i) => i !== cardIndex);
  const newHands = { ...state.hands, [localUid]: newHand };
  const players = state.players.map(p =>
    p.id === localUid ? { ...p, cardCount: newHand.length } : p
  );
  const p1 = state.players.find(p => p.id === linkedIds[0])?.name || '?';
  const p2 = state.players.find(p => p.id === linkedIds[1])?.name || '?';
  const log = addLog(state.log,
    `${localName} jugó ⬌ Comodín de Enlace. ¡${p1} y ${p2} están enlazados! Color: ${COLOR_NAME[chosenColor]}.`
  );
  await db.collection('rooms').doc(currentRoomId).update({
    players, hands: newHands,
    topColor: chosenColor, topValue: 'wildDrawnTogether',
    linkedPlayers: linkedIds,
    currentPlayerIndex: nextPlayerIndex(state),
    challengeOpen: false,
    lastActualCard: null, lastClaimedCard: null,
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ============================================================
// WILD DRAW 4 — UNO FIESTA CHALLENGE
// ============================================================

async function startWild4Challenge(actualCard, chosenColor, cardIndex) {
  const state = roomState;
  const myHand = [...(state.hands?.[localUid] || [])];
  const newHand = myHand.filter((_, i) => i !== cardIndex);
  const newHands = { ...state.hands, [localUid]: newHand };
  const players = state.players.map(p =>
    p.id === localUid ? { ...p, cardCount: newHand.length } : p
  );
  const n = state.players.length;
  const targetIdx = ((state.currentPlayerIndex + state.direction) % n + n) % n;
  const target = state.players[targetIdx];
  const prevTopColor = state.topColor;

  const log = addLog(state.log,
    `${localName} jugó +4 y eligió ${COLOR_NAME[chosenColor]}. ${target?.name || '?'} puede aceptar o desafiar.`
  );
  await db.collection('rooms').doc(currentRoomId).update({
    players, hands: newHands,
    topColor: chosenColor, topValue: 'wild4',
    prevTopColor,
    wild4Challenge: {
      chooserId: localUid, chooserName: localName,
      targetId: target?.id, targetName: target?.name,
      targetIndex: targetIdx, chosenColor, prevTopColor,
      nextPlayerIndex: ((targetIdx + state.direction) % n + n) % n
    },
    currentPlayerIndex: targetIdx,
    challengeOpen: false,
    lastActualCard: null, lastClaimedCard: null,
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function handleWild4Accept() {
  const state = roomState;
  const ch = state.wild4Challenge;
  if (!ch || ch.targetId !== localUid) return;

  let { hands, players, drawPile } = state;
  // Target draws 4
  const { drawn, newDrawPile } = takeCards(drawPile, 4);
  drawPile = newDrawPile;
  hands = { ...hands, [localUid]: [...(hands[localUid] || []), ...drawn] };
  // Linked partner draws 4 too and loses their turn
  const linked = state.linkedPlayers;
  let pendingSkips = state.pendingSkips ? [...state.pendingSkips] : [];
  if (linked?.includes(localUid)) {
    const partnerId = linked[0] === localUid ? linked[1] : linked[0];
    const partner = players.find(p => p.id === partnerId && !p.disconnected);
    if (partner) {
      const { drawn: pd, newDrawPile: npd } = takeCards(drawPile, 4);
      drawPile = npd;
      hands = { ...hands, [partnerId]: [...(hands[partnerId] || []), ...pd] };
      if (!pendingSkips.includes(partnerId)) pendingSkips.push(partnerId);
    }
  }
  players = players.map(p => ({ ...p, cardCount: (hands[p.id] || []).length }));
  const log = addLog(state.log,
    `${localName} acepta: roba 4 y pierde su turno.`
  );
  const update4a = {
    hands, players, drawPile,
    wild4Challenge: firebase.firestore.FieldValue.delete(),
    currentPlayerIndex: ch.nextPlayerIndex,
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };
  update4a.pendingSkips = pendingSkips.length > 0 ? pendingSkips : firebase.firestore.FieldValue.delete();
  await db.collection('rooms').doc(currentRoomId).update(update4a);
}

async function handleWild4Challenge() {
  const state = roomState;
  const ch = state.wild4Challenge;
  if (!ch || ch.targetId !== localUid) return;

  const chooserHand = state.hands?.[ch.chooserId] || [];
  // Wild cards also count as a "match"
  const hadMatch = chooserHand.some(c =>
    c.color === ch.prevTopColor || WILDS.includes(c.value)
  );

  let { hands, players, drawPile } = state;
  let log = state.log;
  const n = players.length;

  if (hadMatch) {
    // Challenge succeeded: chooser draws 4, target draws 0, target goes next
    const { drawn, newDrawPile } = takeCards(drawPile, 4);
    drawPile = newDrawPile;
    hands = { ...hands, [ch.chooserId]: [...(hands[ch.chooserId] || []), ...drawn] };
    players = players.map(p => ({ ...p, cardCount: (hands[p.id] || []).length }));
    log = addLog(log,
      `🚨 ${localName} desafió a ${ch.chooserName} — ¡tenía ${COLOR_NAME[ch.prevTopColor]}! ${ch.chooserName} roba 4. Turno de ${localName}.`
    );
    await db.collection('rooms').doc(currentRoomId).update({
      hands, players, drawPile,
      wild4Challenge: firebase.firestore.FieldValue.delete(),
      currentPlayerIndex: ch.targetIndex,
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    // Challenge failed: target draws 6, loses turn
    const { drawn, newDrawPile } = takeCards(drawPile, 6);
    drawPile = newDrawPile;
    hands = { ...hands, [localUid]: [...(hands[localUid] || []), ...drawn] };
    // Linked partner draws 6 too and loses their turn
    const linked = state.linkedPlayers;
    let pendingSkips6 = state.pendingSkips ? [...state.pendingSkips] : [];
    if (linked?.includes(localUid)) {
      const partnerId = linked[0] === localUid ? linked[1] : linked[0];
      const partner = players.find(p => p.id === partnerId && !p.disconnected);
      if (partner) {
        const { drawn: pd, newDrawPile: npd } = takeCards(drawPile, 6);
        drawPile = npd;
        hands = { ...hands, [partnerId]: [...(hands[partnerId] || []), ...pd] };
        if (!pendingSkips6.includes(partnerId)) pendingSkips6.push(partnerId);
      }
    }
    players = players.map(p => ({ ...p, cardCount: (hands[p.id] || []).length }));
    log = addLog(log,
      `${localName} desafió pero ${ch.chooserName} no tenía ${COLOR_NAME[ch.prevTopColor]}. ${localName} roba 6 y pierde su turno.`
    );
    const update6f = {
      hands, players, drawPile,
      wild4Challenge: firebase.firestore.FieldValue.delete(),
      currentPlayerIndex: ch.nextPlayerIndex,
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    };
    update6f.pendingSkips = pendingSkips6.length > 0 ? pendingSkips6 : firebase.firestore.FieldValue.delete();
    await db.collection('rooms').doc(currentRoomId).update(update6f);
  }
}

function renderWild4ChallengeArea(state) {
  const el = document.getElementById('wild4-challenge-area');
  const ch = state.wild4Challenge;
  if (!ch) { el.classList.add('hidden'); return; }

  const isTarget = ch.targetId === localUid;
  el.classList.remove('hidden');
  document.getElementById('w4c-text').innerHTML =
    `<strong>${esc(ch.chooserName)}</strong> jugó <b>+4</b> y eligió color <strong style="color:${LOG_COLOR_HEX[ch.chosenColor]}">${COLOR_NAME[ch.chosenColor]}</strong>.`;

  const btns = document.getElementById('w4c-btns');
  if (isTarget) {
    btns.innerHTML = `
      <button class="btn btn-secondary" onclick="handleWild4Accept()">Robar 4 y pasar</button>
      <button class="btn btn-danger"    onclick="handleWild4Challenge()">¡Desafiar!</button>`;
  } else {
    btns.innerHTML = `<p style="font-size:.8rem;color:rgba(255,255,255,.55)">Esperando que ${esc(ch.targetName || '?')} decida…</p>`;
  }
}

// ============================================================
// SPEED PLAY
// ============================================================

async function speedPlayCard(index, card) {
  const state = roomState;
  // Re-validate: card must still match both color and value of current top
  if (!NUMBERS.includes(card.value)) return;
  if (card.color !== state.topColor || card.value !== state.topValue) return;

  const myHand = [...(state.hands?.[localUid] || [])];
  const newHand = myHand.filter((_, i) => i !== index);
  const won = newHand.length === 0;
  const newHands = { ...state.hands, [localUid]: newHand };
  let players = state.players.map(p =>
    p.id === localUid ? { ...p, cardCount: newHand.length } : p
  );

  // Find my index and compute next player from me
  const myIdx = state.players.findIndex(p => p.id === localUid);
  const n = state.players.length;
  const nextIdx = ((myIdx + state.direction) % n + n) % n;

  const log = addLog(state.log,
    `⚡ ${localName} jugó fuera de turno: ${COLOR_NAME[card.color]} ${VALUE_LABEL[card.value]}!`
  );
  const update = {
    players, hands: newHands,
    topColor: card.color, topValue: card.value,
    currentPlayerIndex: nextIdx,
    challengeOpen: false,
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };
  update.unoCallRequired = (!won && newHand.length === 1)
    ? { playerId: localUid, playerName: localName }
    : firebase.firestore.FieldValue.delete();
  if (won) { update.status = 'ended'; update.winner = localUid; update.winnerName = localName; }
  await db.collection('rooms').doc(currentRoomId).update(update);
}

async function playNormalCard(actualCard, cardIndex, chosenColor = null) {
  const state = roomState;
  const myHand = [...(state.hands?.[localUid] || [])];
  const newHand = myHand.filter((_, i) => i !== cardIndex);
  const won = newHand.length === 0;

  let topColor = actualCard.color;
  let topValue = actualCard.value;
  let log = addLog(state.log,
    `${localName} jugó ${COLOR_NAME[actualCard.color]} ${VALUE_LABEL[actualCard.value]}.`
  );

  const newHands = { ...state.hands, [localUid]: newHand };
  let players = state.players.map(p =>
    p.id === localUid ? { ...p, cardCount: newHand.length } : p
  );

  if (actualCard.value === 'wild') {
    topColor = chosenColor || 'red';
    log = addLog(log, `${localName} eligió el color ${COLOR_NAME[topColor]}.`);
  }

  // Compute action card effects (reverse, skip, draw2)
  const n = state.players.length;
  const activeN = state.players.filter(p => !p.disconnected).length;
  let direction = state.direction;
  let drawPile = state.drawPile || [];

  const nextActive = (fromIdx, dir) => {
    let idx = ((fromIdx + dir) % n + n) % n;
    for (let i = 0; i < n && state.players[idx]?.disconnected; i++) {
      idx = ((idx + dir) % n + n) % n;
    }
    return idx;
  };

  const nextIdx = nextActive(state.currentPlayerIndex, direction);
  let newCurrentPlayerIndex = nextIdx;
  let draw2LinkedPartnerId = null;

  if (actualCard.value === 'reverse') {
    direction = -direction;
    if (activeN === 2) {
      log = addLog(log, `${state.players[nextIdx]?.name} pierde su turno (reversa).`);
      newCurrentPlayerIndex = state.currentPlayerIndex;
    } else {
      log = addLog(log, '¡Dirección invertida!');
      newCurrentPlayerIndex = nextActive(state.currentPlayerIndex, direction);
    }
  } else if (actualCard.value === 'skip') {
    log = addLog(log, `${state.players[nextIdx]?.name} pierde su turno.`);
    newCurrentPlayerIndex = nextActive(nextIdx, direction);
  } else if (actualCard.value === 'draw2') {
    const drawTarget = state.players[nextIdx];
    const { drawn, newDrawPile } = takeCards(drawPile, 2);
    drawPile = newDrawPile;
    newHands[drawTarget.id] = [...(newHands[drawTarget.id] || []), ...drawn];
    log = addLog(log, `${drawTarget.name} roba 2 y pierde su turno.`);
    // Linked partner draws 2 too and loses their turn
    const linked2 = state.linkedPlayers;
    if (linked2?.includes(drawTarget.id)) {
      const partnerId2 = linked2[0] === drawTarget.id ? linked2[1] : linked2[0];
      const partner2 = state.players.find(p => p.id === partnerId2 && !p.disconnected);
      if (partner2) {
        const { drawn: pd2, newDrawPile: npd2 } = takeCards(drawPile, 2);
        drawPile = npd2;
        newHands[partnerId2] = [...(newHands[partnerId2] || []), ...pd2];
        draw2LinkedPartnerId = partnerId2;
        log = addLog(log, `${partner2.name} también roba 2 (enlazados).`);
      }
    }
    players = players.map(p => ({ ...p, cardCount: (newHands[p.id] || []).length }));
    newCurrentPlayerIndex = nextActive(nextIdx, direction);
  }

  const update = {
    players,
    hands: newHands,
    topColor,
    topValue,
    direction,
    drawPile,
    currentPlayerIndex: newCurrentPlayerIndex,
    challengeOpen: false,
    lastActualCard: null,
    lastClaimedCard: null,
    log,
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (draw2LinkedPartnerId) {
    update.pendingSkips = [...new Set([...(state.pendingSkips || []), draw2LinkedPartnerId])];
  }

  update.unoCallRequired = (newHand.length === 1 && !won)
    ? { playerId: localUid, playerName: localName }
    : firebase.firestore.FieldValue.delete();

  if (won) {
    update.status = 'ended';
    update.winner = localUid;
    update.winnerName = localName;
  }

  await db.collection('rooms').doc(currentRoomId).update(update);
}

function isClaimPlayable(claimed, state) {
  if (WILDS.includes(claimed.value) || PARTY_CARDS.includes(claimed.value)) return true;
  return claimed.color === state.topColor || claimed.value === state.topValue;
}

// ============================================================
// APPLY EFFECTS + ADVANCE TURN
// Resolves the claimed card's effect and returns the new state.
// `state.currentPlayerIndex` = the player who just played.
// ============================================================

function applyEffectsAndAdvance(state) {
  const claimed = state.lastClaimedCard;
  let { players, hands, drawPile, direction, currentPlayerIndex } = state;
  const n = players.length;
  const activeN = players.filter(p => !p.disconnected).length;

  let topColor = claimed.color;
  let topValue = claimed.value;
  let logExtra = '';

  // Advances from fromIdx in dir, skipping disconnected players
  const nextActive = (fromIdx, dir) => {
    let idx = ((fromIdx + dir) % n + n) % n;
    for (let i = 0; i < n && players[idx]?.disconnected; i++) {
      idx = ((idx + dir) % n + n) % n;
    }
    return idx;
  };

  const nextIdx = nextActive(currentPlayerIndex, direction);
  let newIdx    = nextIdx;

  switch (claimed.value) {

    case 'skip': {
      logExtra = `${players[nextIdx]?.name} pierde su turno.`;
      newIdx   = nextActive(nextIdx, direction);
      break;
    }

    case 'reverse': {
      direction = -direction;
      if (activeN === 2) {
        // Con 2 jugadores activos, Reverse = Skip: el mismo jugador juega de nuevo
        logExtra = `${players[nextIdx]?.name} pierde su turno (reversa).`;
        newIdx   = currentPlayerIndex;
      } else {
        logExtra = '¡Dirección invertida!';
        newIdx   = nextActive(currentPlayerIndex, direction);
      }
      break;
    }

    case 'draw2': {
      const tid = players[nextIdx].id;
      let { drawn, newDrawPile } = takeCards(drawPile, 2);
      drawPile = newDrawPile;
      hands = { ...hands, [tid]: [...(hands[tid] || []), ...drawn] };
      logExtra = `${players[nextIdx]?.name} roba 2 y pierde su turno.`;
      // Wild Drawn Together: partner draws same amount
      const linked2 = state.linkedPlayers;
      if (linked2?.includes(tid)) {
        const partnerId2 = linked2[0] === tid ? linked2[1] : linked2[0];
        const partner2 = players.find(p => p.id === partnerId2 && !p.disconnected);
        if (partner2) {
          const { drawn: pd, newDrawPile: npd } = takeCards(drawPile, 2);
          drawPile = npd;
          hands = { ...hands, [partnerId2]: [...(hands[partnerId2] || []), ...pd] };
          logExtra += ` ${partner2.name} también roba 2 (enlazados).`;
        }
      }
      players = players.map(p => ({ ...p, cardCount: (hands[p.id] || []).length }));
      newIdx  = nextActive(nextIdx, direction);
      break;
    }

    // wild4 is now handled by startWild4Challenge; this case only runs for forced draws
    // applied from handleWild4Accept/handleWild4Challenge
    case 'wild4': {
      const tid = players[nextIdx].id;
      const { drawn, newDrawPile } = takeCards(drawPile, 4);
      drawPile = newDrawPile;
      hands    = { ...hands, [tid]: [...(hands[tid] || []), ...drawn] };
      players  = players.map(p => p.id === tid ? { ...p, cardCount: hands[p.id].length } : p);
      logExtra = `${players[nextIdx]?.name} roba 4 y pierde su turno.`;
      newIdx   = nextActive(nextIdx, direction);
      break;
    }
  }

  return {
    changes: { topColor, topValue, direction, currentPlayerIndex: newIdx, players, hands, drawPile },
    logExtra
  };
}

// ============================================================
// DRAW CARD
// ============================================================

function showDrawConfirm(accent, icon, title, message, okLabel, cancelLabel, thirdLabel) {
  return new Promise(resolve => {
    const card   = document.getElementById('draw-confirm-card');
    card.className = `draw-confirm-card accent-${accent}`;
    document.getElementById('draw-confirm-icon').textContent  = icon;
    document.getElementById('draw-confirm-title').textContent = title;
    document.getElementById('draw-confirm-msg').textContent   = message;
    const modal    = document.getElementById('draw-confirm-modal');
    const okBtn    = document.getElementById('draw-confirm-ok');
    const canBtn   = document.getElementById('draw-confirm-cancel');
    const thirdBtn = document.getElementById('draw-confirm-third');
    okBtn.textContent  = okLabel     || 'Sí, robar';
    canBtn.textContent = cancelLabel || 'Cancelar';
    if (thirdLabel) {
      thirdBtn.textContent = thirdLabel;
      thirdBtn.classList.remove('hidden');
    } else {
      thirdBtn.classList.add('hidden');
    }
    modal.classList.remove('hidden');
    function done(result) {
      modal.classList.add('hidden');
      okBtn.removeEventListener('click', onOk);
      canBtn.removeEventListener('click', onCancel);
      thirdBtn.removeEventListener('click', onThird);
      resolve(result);
    }
    function onOk()     { done(true);    }
    function onCancel() { done(false);   }
    function onThird()  { done('third'); }
    okBtn.addEventListener('click', onOk);
    canBtn.addEventListener('click', onCancel);
    thirdBtn.addEventListener('click', onThird);
  });
}

async function handleDraw() {
  const state = roomState;
  if (!isMyTurn(state) || state.wildChallenge) return;
  if (drawnCardState !== null) return;

  const myHand = state.hands?.[localUid] || [];
  const hasPlayable = myHand.some(c => isActualPlayable(c, state));

  if (hasPlayable) {
    const ok = await showDrawConfirm(
      'white', '✋',
      'Tienes cartas jugables',
      'Tienes cartas que puedes jugar. ¿Quieres robar de todas formas?'
    );
    if (!ok) return;
  }

  let drawPile = state.drawPile;
  let newHands = { ...state.hands };

  const { drawn, newDrawPile } = takeCards(drawPile, 1);
  drawPile = newDrawPile;
  newHands[localUid] = [...(newHands[localUid] || []), ...drawn];

  // Wild Drawn Together: linked partner also draws 1 and loses their turn
  const linked = state.linkedPlayers;
  let drawLinkedPartnerId = null;
  if (linked?.includes(localUid) && drawn.length > 0) {
    const partnerId = linked[0] === localUid ? linked[1] : linked[0];
    const partner = state.players.find(p => p.id === partnerId && !p.disconnected);
    if (partner) {
      const { drawn: pd, newDrawPile: npd } = takeCards(drawPile, 1);
      drawPile = npd;
      newHands[partnerId] = [...(newHands[partnerId] || []), ...pd];
      drawLinkedPartnerId = partnerId;
    }
  }

  const newHand = newHands[localUid];
  const players = state.players.map(p => ({ ...p, cardCount: (newHands[p.id] || []).length }));

  const drawnCard = newHand[newHand.length - 1];
  const canPlay = !!(drawnCard && isActualPlayable(drawnCard, state));
  drawnCardState = { cardIdx: newHand.length - 1, canPlay };

  const drawUpdate = {
    hands: newHands,
    drawPile,
    players,
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (drawLinkedPartnerId) {
    drawUpdate.pendingSkips = [...new Set([...(state.pendingSkips || []), drawLinkedPartnerId])];
  }
  await db.collection('rooms').doc(currentRoomId).update(drawUpdate);
}

async function handlePassTurn() {
  const state = roomState;
  if (!isMyTurn(state) || state.wildChallenge || drawnCardState === null) return;

  const hadDrawn = drawnCardState !== null;
  drawnCardState = null;

  const logMsg = hadDrawn
    ? `${localName} robó una carta y pasó.`
    : `${localName} pasó su turno.`;

  await db.collection('rooms').doc(currentRoomId).update({
    currentPlayerIndex: nextPlayerIndex(state),
    unoCallRequired: firebase.firestore.FieldValue.delete(),
    log: addLog(state.log, logMsg),
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ============================================================
// TAKE CARDS FROM DRAW PILE (reshuffle fresh deck if empty)
// ============================================================

function takeCards(drawPile, count) {
  let pile = [...(drawPile || [])];
  if (pile.length < count) pile = [...pile, ...shuffle(createDeck())];
  const drawn = pile.splice(0, count);
  return { drawn, newDrawPile: pile };
}

// ============================================================
// UNO CALL
// ============================================================

async function callUno() {
  if (currentUnoCallRequired) {
    await handleUnoCallBtn();
    return;
  }
  const state = roomState;
  if (!state) return;

  const myHand = state.hands?.[localUid] || [];
  const targets = state.players.filter(p => p.id !== localUid && p.cardCount === 1);

  if (myHand.length === 1) {
    const log = addLog(state.log, `${localName} dice ¡UNO! 🎴`);
    await db.collection('rooms').doc(currentRoomId).update({
      unoCallRequired: firebase.firestore.FieldValue.delete(),
      log,
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  if (targets.length === 0) {
    const log = addLog(state.log, `${localName} intenta atrapar UNO pero no hay nadie con una carta.`);
    await db.collection('rooms').doc(currentRoomId).update({
      log,
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  let { hands, players, drawPile } = state;
  let log = state.log;

  for (const target of targets) {
    const { drawn, newDrawPile } = takeCards(drawPile, 2);
    drawPile = newDrawPile;
    hands = { ...hands, [target.id]: [...(hands[target.id] || []), ...drawn] };
    players = players.map(p =>
      p.id === target.id ? { ...p, cardCount: hands[p.id].length } : p
    );
    log = addLog(log,
      `🚨 ${localName} atrapó a ${target.name} con una carta. ${target.name} roba 2 cartas.`
    );
  }

  const targetNames = targets
    .map(t => (t.name && t.name.trim()) ? t.name.trim() : 'el jugador')
    .join(', ');
  const unoAlert = `GRITARLE UNO a ${targetNames}!`;

  await db.collection('rooms').doc(currentRoomId).update({
    hands,
    players,
    drawPile,
    log,
    unoAlert,
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ============================================================
// BACK TO LOBBY
// ============================================================

async function backToLobby() {
  if (!roomState) return;
  await db.collection('rooms').doc(currentRoomId).update({
    status: 'lobby',
    winner: null,
    winnerName: null,
    winnerReason: null,
    endVotes: [],
    hands: {},
    drawPile: [],
    log: [],
    challengeOpen: false,
    lastActualCard: null,
    lastClaimedCard: null,
    prevPlayerNames: roomState.players.map(p => p.name),
    readyVotes: [],
    players: roomState.players.map(p => ({ ...p, cardCount: 0 }))
  });
}

async function handleReadyVote() {
  if (!currentRoomId || !localUid) return;
  await db.collection('rooms').doc(currentRoomId).update({
    readyVotes: firebase.firestore.FieldValue.arrayUnion(localUid)
  });
}

// ============================================================
// LEAVE GAME
// ============================================================

async function handleLeaveLobby() {
  if (!roomState || !currentRoomId) { showScreen('landing'); return; }

  const state = roomState;
  const roomId = currentRoomId;
  const newPlayers = state.players.filter(p => p.id !== localUid);
  const newReadyVotes = (state.readyVotes || []).filter(id => id !== localUid);

  clearSpotifyTrackFromRoom();
  teardownPresence();
  if (roomUnsub) { roomUnsub(); roomUnsub = null; }
  sessionStorage.clear();
  currentRoomId = null;
  roomState = null;
  showScreen('landing');

  if (newPlayers.length === 0) {
    await db.collection('rooms').doc(roomId).delete().catch(() => {});
    return;
  }

  const update = {
    players: newPlayers,
    readyVotes: newReadyVotes,
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (state.hostId === localUid) update.hostId = newPlayers[0].id;

  await db.collection('rooms').doc(roomId).update(update).catch(() => {});
}

async function handleLeaveGame() {
  if (!roomState || !currentRoomId) { showScreen('landing'); return; }
  const ok = await showDrawConfirm(
    'red', '🚪',
    '¿Seguro que quieres salir?',
    'Si sales ahora no podrás ver la puntuación final ni serás incluido en el marcador. Si quieres terminar la partida y ver los resultados, vota para finalizar.',
    'Salir', 'Quedarme', 'Votar Terminar'
  );
  if (ok === 'third') { handleEndGameVote(); return; }
  if (!ok) return;

  const state = roomState;
  const roomId = currentRoomId;
  const myIdx = state.players.findIndex(p => p.id === localUid);
  const newPlayers = state.players.filter(p => p.id !== localUid);
  const newHands = { ...state.hands };
  delete newHands[localUid];
  const newEndVotes = (state.endVotes || []).filter(id => id !== localUid);
  const leaveLog = addLog(state.log, `${localName} salió de la partida.`);

  clearSpotifyTrackFromRoom();
  teardownPresence();
  if (roomUnsub) { roomUnsub(); roomUnsub = null; }
  sessionStorage.clear();
  currentRoomId = null;
  roomState = null;
  showScreen('landing');

  if (newPlayers.length === 0) return;

  if (newPlayers.length === 1) {
    const winner = newPlayers[0];
    await db.collection('rooms').doc(roomId).update({
      players: newPlayers,
      hands: newHands,
      status: 'ended',
      winner: winner.id,
      winnerName: winner.name,
      winnerReason: 'lastPlayer',
      challengeOpen: false,
      lastActualCard: null,
      lastClaimedCard: null,
      unoCallRequired: firebase.firestore.FieldValue.delete(),
      endVotes: newEndVotes,
      log: addLog(leaveLog, `¡${winner.name} gana por ser el último jugador!`)
    });
    return;
  }

  // Adjust currentPlayerIndex: remove my slot and keep the "next to play" player correct.
  let newIdx = state.currentPlayerIndex;
  if (myIdx < newIdx) {
    newIdx = newIdx - 1;
  } else if (myIdx === newIdx) {
    newIdx = newIdx % newPlayers.length;
  }

  const update = {
    players: newPlayers,
    hands: newHands,
    currentPlayerIndex: newIdx,
    challengeOpen: false,
    lastActualCard: null,
    lastClaimedCard: null,
    unoCallRequired: firebase.firestore.FieldValue.delete(),
    endVotes: newEndVotes,
    log: leaveLog,
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };

  if (state.hostId === localUid) update.hostId = newPlayers[0].id;

  await db.collection('rooms').doc(roomId).update(update);
}

// ============================================================
// END GAME VOTE
// ============================================================

async function handleEndGameVote() {
  const state = roomState;
  if (!state || state.status !== 'playing') return;

  const votes = state.endVotes || [];
  const hasVoted = votes.includes(localUid);

  if (hasVoted) {
    const log = addLog(state.log, `${localName} retiró su voto para terminar.`);
    await db.collection('rooms').doc(currentRoomId).update({
      endVotes: firebase.firestore.FieldValue.arrayRemove(localUid),
      log,
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    const log = addLog(state.log,
      `${localName} propone terminar (${votes.length + 1}/${state.players.filter(p => !p.disconnected).length}).`);
    await db.collection('rooms').doc(currentRoomId).update({
      endVotes: firebase.firestore.FieldValue.arrayUnion(localUid),
      log,
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

function renderEndVoteStatus(state) {
  const votes = state.endVotes || [];
  const statusEl = document.getElementById('end-vote-status');
  const btn = document.getElementById('end-game-btn');
  const hasVoted = votes.includes(localUid);

  statusEl.textContent = votes.length > 0
    ? `${votes.length}/${state.players.filter(p => !p.disconnected).length} quieren terminar`
    : '';

  if (btn) {
    btn.textContent = hasVoted ? 'Retirar voto' : 'Terminar';
    btn.classList.toggle('btn-voted', hasVoted);
  }
}

// ============================================================
// WINNER SCREEN
// ============================================================

function renderWinner(state) {
  const reason = state.winnerReason;
  const titleEl = document.getElementById('winner-title');
  const nameEl  = document.getElementById('winner-name');
  const standingsEl = document.getElementById('winner-standings');

  document.getElementById('join-another-form')?.classList.add('hidden');
  document.getElementById('winner-error')?.classList.add('hidden');

  if (reason === 'vote') {
    titleEl.textContent = '🤝 ¡Partida terminada!';
    const winLabel = state.winCondition === 'points' ? 'ganó con menos puntos' : 'ganó con menos cartas';
    nameEl.textContent  = `${state.winnerName || '?'} ${winLabel}`;
  } else if (reason === 'lastPlayer') {
    titleEl.textContent = '🏆 ¡Último en pie!';
    nameEl.textContent  = state.winnerName || '?';
  } else {
    titleEl.textContent = '🎉 ¡Ganador!';
    nameEl.textContent  = state.winnerName || '?';
  }

  if (reason === 'vote' && state.hands && state.players?.length) {
    const standings = computeStandings(state);
    standingsEl.innerHTML = standings.map((s, i) =>
      `<div class="standing-row ${s.id === state.winner ? 'winner-row' : ''}">
        <span class="standing-rank">#${i + 1}</span>
        <span class="standing-name">${esc(s.name)}</span>
        <span class="standing-stats">${s.cards} cartas · ${s.points} pts</span>
      </div>`
    ).join('');
    standingsEl.classList.remove('hidden');
  } else {
    standingsEl.classList.add('hidden');
  }
}

function showJoinAnother() {
  document.getElementById('join-another-form').classList.toggle('hidden');
}

async function handleJoinAnother() {
  const code = document.getElementById('winner-room-code').value.trim().toUpperCase();
  if (code.length !== 6) { showWinnerError('Introduce el código de sala de 6 caracteres'); return; }
  if (!localUid) { showWinnerError('Aún conectando… intenta de nuevo'); return; }

  const snap = await db.collection('rooms').doc(code).get();
  if (!snap.exists) { showWinnerError('Sala no encontrada'); return; }
  const data = snap.data();
  if (data.status !== 'lobby') { showWinnerError('La partida ya comenzó'); return; }
  if (data.players.length >= 10) { showWinnerError('Sala llena (máximo 10)'); return; }

  if (roomUnsub) { roomUnsub(); roomUnsub = null; }

  if (!data.players.find(p => p.id === localUid)) {
    await db.collection('rooms').doc(code).update({
      players: firebase.firestore.FieldValue.arrayUnion({ id: localUid, name: localName, cardCount: 0 })
    });
  }

  currentRoomId = code;
  sessionStorage.setItem('roomId', code);
  sessionStorage.setItem('playerName', localName);
  sessionStorage.setItem('playerEmoji', selectedEmoji);
  subscribeToRoom(code);
  showScreen('lobby');
}

function showWinnerError(msg) {
  const el = document.getElementById('winner-error');
  el.textContent = msg;
  el.classList.remove('hidden');
  setTimeout(() => el.classList.add('hidden'), 3500);
}

function returnToMain() {
  clearSpotifyTrackFromRoom();
  teardownPresence();
  if (roomUnsub) { roomUnsub(); roomUnsub = null; }
  currentRoomId = null;
  roomState = null;
  sessionStorage.clear();
  showScreen('landing');
}

window.addEventListener('beforeunload', () => {
  if (presenceRef) {
    presenceRef.onDisconnect().cancel();
    presenceRef.remove();
  }
  if (voiceActiveRef) {
    voiceActiveRef.onDisconnect().cancel();
    voiceActiveRef.remove();
  }
});

// ============================================================
// VOICE CHAT (WebRTC mesh, Firebase RTDB signaling)
// ============================================================

const STUN_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};

// voiceState cycles: 'off' → 'on' (unmuted) → 'muted' → 'off'
let voiceState = 'off';
let localStream = null;
const peerConns = {};
const voiceIceRefs = {};
let voiceActiveRef = null;
let voiceActiveRtdb = null;
let voiceSignalRtdb = null;
let voiceActivityRef = null;
let voiceActivityLoaded = false;
let audioCtx = null;
const voiceAnalysers = {};
const speakingStates = {};

async function toggleVoice() {
  if (voiceState === 'off') {
    await joinVoice();
  } else if (voiceState === 'on') {
    muteVoice();
  } else {
    unmuteVoice();
  }
}

// Modify SDP to prefer Opus with FEC, DTX, and higher bitrate for better voice quality
function preferOpus(sdp) {
  const lines = sdp.split('\r\n');
  let opusPt = null;
  for (const line of lines) {
    const m = line.match(/^a=rtpmap:(\d+) opus\/48000\/2/i);
    if (m) { opusPt = m[1]; break; }
  }
  if (!opusPt) return sdp;

  const fmtpLine = `a=fmtp:${opusPt} minptime=10;useinbandfec=1;usedtx=1;maxaveragebitrate=64000`;
  let hasFmtp = false;
  const result = lines.map(line => {
    if (line.startsWith('m=audio ')) {
      const parts = line.split(' ');
      const others = parts.slice(3).filter(p => p !== opusPt);
      return [...parts.slice(0, 3), opusPt, ...others].join(' ');
    }
    if (line.startsWith(`a=fmtp:${opusPt} `)) {
      hasFmtp = true;
      return fmtpLine;
    }
    return line;
  });
  if (!hasFmtp) {
    const idx = result.findIndex(l => l.startsWith(`a=rtpmap:${opusPt} `));
    if (idx >= 0) result.splice(idx + 1, 0, fmtpLine);
  }
  return result.join('\r\n');
}

async function joinVoice() {
  if (!currentRoomId) return;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
        channelCount: 1,
        sampleRate: { ideal: 48000 },
      },
      video: false,
    });
  } catch (e) {
    showVoiceToast('No se pudo acceder al micrófono');
    return;
  }

  voiceState = 'on';
  updateVoiceButton();
  startSpeakingMonitor(localUid, localStream);

  voiceActiveRef = rtdb.ref(`voice/${currentRoomId}/active/${localUid}`);
  voiceActiveRef.set({ muted: false });
  voiceActiveRef.onDisconnect().remove();

  voiceActiveRtdb = rtdb.ref(`voice/${currentRoomId}/active`);
  voiceActiveRtdb.on('child_added', snap => {
    const uid = snap.key;
    if (uid === localUid || peerConns[uid]) return;
    if (localUid > uid) initiateVoiceCall(uid);
    // else: the other peer (with higher uid) will initiate to us
  });
  voiceActiveRtdb.on('child_removed', snap => closePeerConn(snap.key));

  voiceSignalRtdb = rtdb.ref(`voice/${currentRoomId}/signals/${localUid}`);
  voiceSignalRtdb.on('child_added', snap => {
    const fromUid = snap.key;
    const data = snap.val();
    snap.ref.remove();
    if (!data) return;
    if (data.type === 'offer') handleVoiceOffer(fromUid, data.sdp);
    else if (data.type === 'answer') handleVoiceAnswer(fromUid, data.sdp);
  });
}

async function initiateVoiceCall(targetUid) {
  const pc = createPeerConn(targetUid);
  try {
    const offer = await pc.createOffer({ voiceActivityDetection: true });
    const offerSdp = preferOpus(offer.sdp);
    await pc.setLocalDescription({ type: offer.type, sdp: offerSdp });
    rtdb.ref(`voice/${currentRoomId}/signals/${targetUid}/${localUid}`)
      .set({ type: 'offer', sdp: offerSdp, ts: firebase.database.ServerValue.TIMESTAMP });
  } catch (e) {
    console.error('voice initiateCall:', e);
    closePeerConn(targetUid);
  }
}

async function handleVoiceOffer(fromUid, sdp) {
  const pc = createPeerConn(fromUid);
  try {
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'offer', sdp }));
    pc._flushCandidates();
    const answer = await pc.createAnswer({ voiceActivityDetection: true });
    const answerSdp = preferOpus(answer.sdp);
    await pc.setLocalDescription({ type: answer.type, sdp: answerSdp });
    rtdb.ref(`voice/${currentRoomId}/signals/${fromUid}/${localUid}`)
      .set({ type: 'answer', sdp: answerSdp, ts: firebase.database.ServerValue.TIMESTAMP });
  } catch (e) {
    console.error('voice handleOffer:', e);
    closePeerConn(fromUid);
  }
}

async function handleVoiceAnswer(fromUid, sdp) {
  const pc = peerConns[fromUid];
  if (!pc) return;
  try {
    await pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp }));
    pc._flushCandidates();
  } catch (e) {
    console.error('voice handleAnswer:', e);
  }
}

function createPeerConn(remoteUid) {
  if (peerConns[remoteUid]) peerConns[remoteUid].close();

  const pc = new RTCPeerConnection(STUN_CONFIG);
  peerConns[remoteUid] = pc;

  // Queue ICE candidates received before setRemoteDescription completes
  const pending = [];
  pc._flushCandidates = () => {
    pending.splice(0).forEach(c =>
      pc.addIceCandidate(new RTCIceCandidate(c)).catch(() => {})
    );
  };

  if (localStream) {
    localStream.getTracks().forEach(t => pc.addTrack(t, localStream));
  }

  pc.ontrack = e => {
    const stream = e.streams[0] || new MediaStream([e.track]);
    let audio = document.getElementById('voice-audio-' + remoteUid);
    if (!audio) {
      audio = document.createElement('audio');
      audio.id = 'voice-audio-' + remoteUid;
      audio.autoplay = true;
      audio.playsInline = true;
      document.body.appendChild(audio);
    }
    audio.srcObject = stream;
    // Tune jitter buffer: 60ms balances latency vs. choppiness from network jitter
    pc.getReceivers().forEach(recv => {
      if (recv.track.kind === 'audio' && recv.jitterBufferTarget !== undefined) {
        recv.jitterBufferTarget = 60;
      }
    });
    startSpeakingMonitor(remoteUid, stream);
  };

  pc.onicecandidate = e => {
    if (e.candidate && currentRoomId) {
      rtdb.ref(`voice/${currentRoomId}/ice/${remoteUid}/${localUid}`)
        .push(e.candidate.toJSON());
    }
  };

  const iceRef = rtdb.ref(`voice/${currentRoomId}/ice/${localUid}/${remoteUid}`);
  iceRef.on('child_added', snap => {
    const candidate = snap.val();
    snap.ref.remove();
    if (pc.remoteDescription) {
      pc.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    } else {
      pending.push(candidate);
    }
  });
  voiceIceRefs[remoteUid] = iceRef;

  pc.onconnectionstatechange = () => {
    if (pc.connectionState === 'failed') closePeerConn(remoteUid);
  };

  return pc;
}

function closePeerConn(uid) {
  if (voiceIceRefs[uid]) { voiceIceRefs[uid].off(); delete voiceIceRefs[uid]; }
  if (peerConns[uid]) { peerConns[uid].close(); delete peerConns[uid]; }
  const a = document.getElementById('voice-audio-' + uid);
  if (a) a.remove();
  stopSpeakingMonitor(uid);
  updateVoiceSpeaking(uid, false);
}

function muteVoice() {
  voiceState = 'muted';
  if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = false; });
  if (voiceActiveRef) voiceActiveRef.set({ muted: true });
  updateVoiceButton();
}

function unmuteVoice() {
  voiceState = 'on';
  if (localStream) localStream.getAudioTracks().forEach(t => { t.enabled = true; });
  if (voiceActiveRef) voiceActiveRef.set({ muted: false });
  updateVoiceButton();
}

function leaveVoice() {
  if (voiceState === 'off') return;
  const roomId = currentRoomId;
  voiceState = 'off';

  if (voiceActiveRef) {
    voiceActiveRef.onDisconnect().cancel();
    voiceActiveRef.remove();
    voiceActiveRef = null;
  }
  if (voiceActiveRtdb) { voiceActiveRtdb.off(); voiceActiveRtdb = null; }
  if (voiceSignalRtdb) { voiceSignalRtdb.off(); voiceSignalRtdb = null; }

  Object.keys(peerConns).forEach(closePeerConn);

  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
  }
  stopSpeakingMonitor(localUid);
  Object.keys(speakingStates).forEach(uid => {
    delete speakingStates[uid];
    updateVoiceSpeaking(uid, false);
  });

  if (roomId) {
    rtdb.ref(`voice/${roomId}/signals/${localUid}`).remove().catch(() => {});
    rtdb.ref(`voice/${roomId}/ice/${localUid}`).remove().catch(() => {});
  }
  updateVoiceButton();
}

function startSpeakingMonitor(uid, stream) {
  stopSpeakingMonitor(uid);
  try {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    const source = audioCtx.createMediaStreamSource(stream);
    const analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;
    analyser.smoothingTimeConstant = 0.4;
    source.connect(analyser);
    const data = new Uint8Array(analyser.frequencyBinCount);
    const timer = setInterval(() => {
      analyser.getByteFrequencyData(data);
      const avg = data.reduce((a, b) => a + b, 0) / data.length;
      const speaking = avg > 8;
      if (speaking !== speakingStates[uid]) {
        speakingStates[uid] = speaking;
        updateVoiceSpeaking(uid, speaking);
      }
    }, 100);
    voiceAnalysers[uid] = { source, analyser, timer };
  } catch (_) {}
}

function stopSpeakingMonitor(uid) {
  const e = voiceAnalysers[uid];
  if (!e) return;
  clearInterval(e.timer);
  try { e.source.disconnect(); } catch (_) {}
  delete voiceAnalysers[uid];
}

function updateVoiceSpeaking(uid, speaking) {
  if (uid === localUid) {
    document.getElementById('voice-toggle-btn')
      ?.classList.toggle('voice-self-speaking', speaking && voiceState === 'on');
  } else {
    document.querySelector(`.opponent[data-uid="${uid}"]`)
      ?.classList.toggle('voice-speaking', speaking);
  }
}

function updateVoiceButton() {
  const btn = document.getElementById('voice-toggle-btn');
  if (!btn) return;
  btn.classList.remove('voice-active', 'voice-muted', 'voice-self-speaking');
  if (voiceState === 'off') {
    btn.textContent = '🎤';
    btn.title = 'Unirse al chat de voz';
  } else if (voiceState === 'on') {
    btn.textContent = '🎤';
    btn.title = 'Silenciar micrófono';
    btn.classList.add('voice-active');
  } else {
    btn.textContent = '🔇';
    btn.title = 'Salir del chat de voz';
    btn.classList.add('voice-muted');
  }
}

function showVoiceToast(msg) {
  const el = document.getElementById('voice-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden', 'voice-join');
  setTimeout(() => el.classList.add('hidden'), 3000);
}

function showVoiceJoinToast(msg) {
  const el = document.getElementById('voice-toast');
  if (!el) return;
  el.textContent = msg;
  el.classList.remove('hidden');
  el.classList.add('voice-join');
  setTimeout(() => { el.classList.add('hidden'); el.classList.remove('voice-join'); }, 3500);
}

// ============================================================
// BOT SYSTEM
// Only the host client runs bot logic. Bots are stored in the
// players array with UIDs starting with 'bot_'.
// ============================================================

function isBot(uid) { return typeof uid === 'string' && uid.startsWith('bot_'); }

function botGenUid() {
  return 'bot_' + Math.random().toString(36).slice(2, 10);
}

const BOT_NAMES = ['🤖 Robo', '🤖 Chip', '🤖 Bleep', '🤖 Zap', '🤖 Mec', '🤖 Unit'];

async function handleAddBot() {
  if (!roomState || roomState.hostId !== localUid) return;
  if (roomState.players.length >= 10) return;
  const usedNames = roomState.players.map(p => p.name);
  const availName = BOT_NAMES.find(n => !usedNames.includes(n)) ||
    `🤖 Bot${roomState.players.length}`;
  const botUid = botGenUid();
  await db.collection('rooms').doc(currentRoomId).update({
    players: firebase.firestore.FieldValue.arrayUnion(
      { id: botUid, name: availName, cardCount: 0, isBot: true }
    ),
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function handleRemoveBot(botId) {
  if (!roomState || roomState.hostId !== localUid) return;
  if (!isBot(botId)) return;
  const newPlayers = roomState.players.filter(p => p.id !== botId);
  await db.collection('rooms').doc(currentRoomId).update({
    players: newPlayers,
    lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ----- Bot turn scheduling -----

let botTickTimer = null;
let botTickRunning = false;

function scheduleBotTick(state) {
  if (!state || state.hostId !== localUid) return;
  if (!state.players.some(p => isBot(p.id))) return;
  clearTimeout(botTickTimer);
  const delay = 900 + Math.random() * 600;
  botTickTimer = setTimeout(() => doBotTick(roomState || state), delay);
}

async function doBotTick(state) {
  if (botTickRunning) return;
  state = roomState || state;
  if (!state || state.status !== 'playing') return;
  if (state.hostId !== localUid) return;
  botTickRunning = true;
  try {
    await runBotTick(state);
  } finally {
    botTickRunning = false;
  }
}

async function runBotTick(state) {
  // 1. Wild challenge phase
  if (state.wildChallenge) { await botHandleWildChallenge(state); return; }

  // 3. Point taken phase: bots vote
  if (state.pointTakenPhase) {
    const bots = state.players.filter(p =>
      isBot(p.id) && !p.disconnected && !state.pointTakenPhase.votes?.[p.id]
    );
    if (bots.length > 0) { await botPointTakenVote(state, bots); return; }
  }

  // 4. Wild4 challenge — bot is target, auto-accept
  if (state.wild4Challenge && isBot(state.wild4Challenge.targetId)) {
    await botWild4Accept(state); return;
  }

  // 6. Wild pile up — bot is holder
  if (state.wildPileUpPhase) {
    const holder = state.players[state.wildPileUpPhase.holderIndex];
    if (holder && isBot(holder.id)) {
      await botWildPileUpAct(state, holder.id, holder.name); return;
    }
  }

  // 7. Normal turn — current player is a bot
  const current = state.players[state.currentPlayerIndex];
  if (current && isBot(current.id) && !current.disconnected) {
    await botDoTurn(state, current.id, current.name);
  }
}


// ----- Bot: wild challenge multi-phase handler -----

async function botHandleWildChallenge(state) {
  const wc = state.wildChallenge;

  if (wc.phase === 'collecting') {
    const botsNeeded = (wc.playersNeeded || []).filter(id => isBot(id));
    if (botsNeeded.length === 0) return;
    let { hands, players } = state;
    let newWC = { ...wc };
    let log = state.log;

    for (const botId of botsNeeded) {
      const hand = [...(hands[botId] || [])];
      const nonBlackIdx = hand.findIndex(c => c.color !== 'black');
      // If the bot only has wilds, still submit one (they'll get penalized — extremely rare)
      const submIdx = nonBlackIdx !== -1 ? nonBlackIdx : 0;
      if (hand.length === 0) continue;
      const card = hand[submIdx];
      const newHand = hand.filter((_, i) => i !== submIdx);
      hands = { ...hands, [botId]: newHand };
      players = players.map(p => p.id === botId ? { ...p, cardCount: newHand.length } : p);
      newWC = {
        ...newWC,
        submittedCards: { ...newWC.submittedCards, [botId]: card },
        playersNeeded: newWC.playersNeeded.filter(id => id !== botId)
      };
    }

    const allIn = newWC.playersNeeded.length === 0;
    if (allIn) {
      newWC.phase = 'accusing';
      log = addLog(log, `Todos pusieron su carta. ¡${wc.chooserName} elige a quién acusar!`);
    }
    await db.collection('rooms').doc(currentRoomId).update({
      hands, players, wildChallenge: newWC, log,
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  if (wc.phase === 'accusing' && isBot(wc.chooserId)) {
    if (!wc.accusePool?.length) return;
    const targetId = wc.accusePool[Math.floor(Math.random() * wc.accusePool.length)];
    await botAccuseWildPlayer(state, targetId);
    return;
  }

  if (wc.phase === 'resolving' && isBot(wc.chooserId)) {
    const log = addLog(state.log, `Las cartas restantes son descartadas.`);
    await db.collection('rooms').doc(currentRoomId).update({
      wildChallenge: { ...wc, discardQueue: [], phase: 'choosing' },
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  if (wc.phase === 'choosing' && isBot(wc.chooserId)) {
    const color = wc.chosenColor || COLORS[0];
    const botName = state.players.find(p => p.id === wc.chooserId)?.name || 'Bot';
    const log = addLog(state.log, `${botName} elige el color final: ${COLOR_NAME[color]}.`);
    await db.collection('rooms').doc(currentRoomId).update({
      topColor: color, topValue: 'wild',
      currentPlayerIndex: wc.nextPlayerIndex,
      wildChallenge: firebase.firestore.FieldValue.delete(),
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

async function botAccuseWildPlayer(state, targetId) {
  const wc = state.wildChallenge;
  const botName = state.players.find(p => p.id === wc.chooserId)?.name || 'Bot';
  const targetName = state.players.find(p => p.id === targetId)?.name || '?';
  const submitted = wc.submittedCards?.[targetId];
  if (!submitted) return;

  const hasColor = submitted.color === wc.chosenColor;
  let { hands, players, drawPile } = state;
  let log = state.log;
  const newAccusePool = wc.accusePool.filter(id => id !== targetId);
  const newFlipped = {
    ...(wc.flippedCards || {}),
    [targetId]: { card: submitted, result: hasColor ? 'correct' : 'wrong' }
  };

  if (!hasColor) {
    const { drawn, newDrawPile } = takeCards(drawPile, 1);
    drawPile = newDrawPile;
    hands = { ...hands, [targetId]: [...(hands[targetId] || []), submitted, ...drawn] };
    players = players.map(p => p.id === targetId ? { ...p, cardCount: hands[p.id].length } : p);
    const newSubmitted = { ...wc.submittedCards };
    delete newSubmitted[targetId];
    log = addLog(log,
      `${botName} acusa a ${targetName} - ¡Mintió! No tiene ${COLOR_NAME[wc.chosenColor]}. Devuelve la carta y roba 1.`
    );
    const goChoosing = newAccusePool.length === 0;
    await db.collection('rooms').doc(currentRoomId).update({
      hands, players, drawPile,
      wildChallenge: {
        ...wc, submittedCards: newSubmitted, accusePool: newAccusePool,
        accusedWrong: [...(wc.accusedWrong || []), targetId],
        flippedCards: newFlipped,
        phase: goChoosing ? 'choosing' : 'accusing'
      },
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    const discardQueue = newAccusePool;
    const finalFlipped = { ...newFlipped };
    const newSubmittedAfterDiscard = { ...wc.submittedCards };
    delete newSubmittedAfterDiscard[targetId];
    for (const rid of discardQueue) {
      const rCard = wc.submittedCards[rid];
      if (rCard) { finalFlipped[rid] = { card: rCard, result: 'discarded' }; delete newSubmittedAfterDiscard[rid]; }
    }
    log = addLog(log,
      `✅ ${botName} acusa a ${targetName} — ¡sí tenía ${COLOR_NAME[wc.chosenColor]}! Actividad terminada.`
    );
    await db.collection('rooms').doc(currentRoomId).update({
      wildChallenge: {
        ...wc, accusePool: newAccusePool, foundPlayerId: targetId,
        submittedCards: newSubmittedAfterDiscard,
        discardQueue, flippedCards: finalFlipped,
        phase: discardQueue.length > 0 ? 'resolving' : 'choosing'
      },
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

// ----- Bot: point taken vote -----

async function botPointTakenVote(state, bots) {
  const phase = state.pointTakenPhase;
  let votes = { ...phase.votes };

  for (const bot of bots) {
    const candidates = state.players.filter(p => p.id !== bot.id && !p.disconnected);
    if (!candidates.length) continue;
    const target = candidates.reduce((a, b) =>
      (b.cardCount || 0) > (a.cardCount || 0) ? b : a
    );
    votes[bot.id] = target.id;
  }

  const eligible = state.players.filter(p => !p.disconnected);
  const allVoted = eligible.every(p => votes[p.id]);

  if (!allVoted) {
    await db.collection('rooms').doc(currentRoomId).update({
      'pointTakenPhase.votes': votes,
      lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  let { hands, players, drawPile } = state;
  let log = state.log;
  const voteCounts = {};
  for (const vid of Object.values(votes)) voteCounts[vid] = (voteCounts[vid] || 0) + 1;

  const n = players.length;
  for (let i = 0; i < n; i++) {
    const p = players[(phase.nextPlayerIndex + i) % n];
    const count = Math.min(voteCounts[p.id] || 0, 5);
    if (count > 0) {
      const { drawn, newDrawPile } = takeCards(drawPile, count);
      drawPile = newDrawPile;
      hands = { ...hands, [p.id]: [...(hands[p.id] || []), ...drawn] };
      log = addLog(log, `${p.name} fue apuntado ${count} vez/veces → roba ${count}.`);
    }
  }
  players = players.map(p => ({ ...p, cardCount: (hands[p.id] || []).length }));
  await db.collection('rooms').doc(currentRoomId).update({
    hands, players, drawPile,
    pointTakenPhase: firebase.firestore.FieldValue.delete(),
    currentPlayerIndex: phase.nextPlayerIndex,
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  });
}

// ----- Bot: wild4 accept -----

async function botWild4Accept(state) {
  const ch = state.wild4Challenge;
  const botId = ch.targetId;
  const botName = state.players.find(p => p.id === botId)?.name || 'Bot';
  let { hands, players, drawPile } = state;

  const { drawn, newDrawPile } = takeCards(drawPile, 4);
  drawPile = newDrawPile;
  hands = { ...hands, [botId]: [...(hands[botId] || []), ...drawn] };

  const linked = state.linkedPlayers;
  let pendingSkipsBot = state.pendingSkips ? [...state.pendingSkips] : [];
  if (linked?.includes(botId)) {
    const partnerId = linked[0] === botId ? linked[1] : linked[0];
    const partner = players.find(p => p.id === partnerId && !p.disconnected);
    if (partner) {
      const { drawn: pd, newDrawPile: npd } = takeCards(drawPile, 4);
      drawPile = npd;
      hands = { ...hands, [partnerId]: [...(hands[partnerId] || []), ...pd] };
      if (!pendingSkipsBot.includes(partnerId)) pendingSkipsBot.push(partnerId);
    }
  }

  players = players.map(p => ({ ...p, cardCount: (hands[p.id] || []).length }));
  const log = addLog(state.log, `${botName} acepta: roba 4 y pierde su turno.`);
  const updateBotW4 = {
    hands, players, drawPile,
    wild4Challenge: firebase.firestore.FieldValue.delete(),
    currentPlayerIndex: ch.nextPlayerIndex,
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };
  updateBotW4.pendingSkips = pendingSkipsBot.length > 0 ? pendingSkipsBot : firebase.firestore.FieldValue.delete();
  await db.collection('rooms').doc(currentRoomId).update(updateBotW4);
}

// ----- Bot: wild pile up -----

async function botWildPileUpAct(state, botId, botName) {
  const phase = state.wildPileUpPhase;
  const myHand = [...(state.hands?.[botId] || [])];
  const matchIdx = myHand.findIndex(c => c.color === phase.pileColor);

  if (matchIdx === -1) {
    // Take the pile
    let newHands = { ...state.hands, [botId]: [...myHand, ...phase.pile] };
    let players = state.players.map(p => ({ ...p, cardCount: (newHands[p.id] || []).length }));
    const n = players.length;
    const afterIdx = ((phase.holderIndex + state.direction) % n + n) % n;
    const log = addLog(state.log,
      `${botName} toma la mini-pila (${phase.pile.length} cartas). El color que continúa es ${COLOR_NAME[phase.pileColor]}.`
    );
    await db.collection('rooms').doc(currentRoomId).update({
      hands: newHands, players,
      topColor: phase.pileColor, topValue: 'wildPileUp',
      wildPileUpPhase: firebase.firestore.FieldValue.delete(),
      currentPlayerIndex: afterIdx,
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  const card = myHand[matchIdx];
  const newHand = myHand.filter((_, i) => i !== matchIdx);
  let newHands = { ...state.hands, [botId]: newHand };
  let players = state.players.map(p =>
    p.id === botId ? { ...p, cardCount: newHand.length } : p
  );
  const newPile = [...phase.pile, card];
  const newPileColor = phase.pileColor;
  const n = players.length;
  const nextIdx = ((phase.holderIndex + state.direction) % n + n) % n;
  const nextHolder = players[nextIdx];
  const nextHand = state.hands?.[nextHolder?.id] || [];
  const nextCanPlay = nextHand.some(c => c.color === newPileColor);

  let log = addLog(state.log,
    `${botName} jugó ${COLOR_NAME[card.color]} ${VALUE_LABEL[card.value]} en la mini-pila.`
  );

  if (!nextCanPlay && nextHolder && !nextHolder.disconnected) {
    newHands = { ...newHands, [nextHolder.id]: [...nextHand, ...newPile] };
    players = players.map(p => ({ ...p, cardCount: (newHands[p.id] || []).length }));
    const afterNextIdx = ((nextIdx + state.direction) % n + n) % n;
    log = addLog(log,
      `${nextHolder.name} no puede jugar → toma la mini-pila (${newPile.length} cartas). El color que continúa es ${COLOR_NAME[newPileColor]}.`
    );
    await db.collection('rooms').doc(currentRoomId).update({
      hands: newHands, players,
      topColor: newPileColor, topValue: 'wildPileUp',
      wildPileUpPhase: firebase.firestore.FieldValue.delete(),
      currentPlayerIndex: afterNextIdx,
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  } else {
    await db.collection('rooms').doc(currentRoomId).update({
      hands: newHands, players,
      topColor: newPileColor,
      wildPileUpPhase: { ...phase, pile: newPile, pileColor: newPileColor, holderIndex: nextIdx },
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
  }
}

// ----- Bot: normal turn -----

function botPickColor(hand) {
  const counts = { red: 0, yellow: 0, green: 0, blue: 0 };
  for (const c of hand) if (COLORS.includes(c.color)) counts[c.color]++;
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || 'red';
}

async function botDoTurn(state, botId, botName) {
  const myHand = state.hands?.[botId] || [];
  const playable = myHand
    .map((card, idx) => ({ card, idx }))
    .filter(({ card }) => isActualPlayable(card, state));

  if (!playable.length) {
    await botDrawAndPass(state, botId, botName);
    return;
  }

  // Prefer non-wild cards; among them prefer action cards, then numbers
  const nonWild = playable.filter(({ card }) => !WILDS.includes(card.value));
  const wilds   = playable.filter(({ card }) => WILDS.includes(card.value));

  let chosen;
  if (nonWild.length > 0) {
    const actions  = nonWild.filter(({ card }) => ACTIONS.includes(card.value));
    const specials = nonWild.filter(({ card }) => card.value === 'pointTaken');
    const numbers  = nonWild.filter(({ card }) => NUMBERS.includes(card.value));
    chosen = actions[0] || numbers[0] || specials[0] || nonWild[0];
  } else {
    const pile    = wilds.find(({ card }) => card.value === 'wildPileUp');
    const together = wilds.find(({ card }) => card.value === 'wildDrawnTogether');
    const w4      = wilds.find(({ card }) => card.value === 'wild4' || card.value === 'wildc4Plus');
    const w       = wilds.find(({ card }) => card.value === 'wild');
    chosen = pile || together || w4 || w || wilds[0];
  }

  await botPlayCard(state, botId, botName, chosen.card, chosen.idx);
}

async function botPlayCard(state, botId, botName, card, cardIdx) {
  const myHand = [...(state.hands?.[botId] || [])];
  const newHand = myHand.filter((_, i) => i !== cardIdx);
  const won = newHand.length === 0;
  const n = state.players.length;

  // Wild → change color and advance turn
  if (card.value === 'wild') {
    const color = botPickColor(myHand);
    const newHands = { ...state.hands, [botId]: newHand };
    const players = state.players.map(p =>
      p.id === botId ? { ...p, cardCount: newHand.length } : p
    );
    const log = addLog(state.log, `${botName} jugó Comodín y eligió ${COLOR_NAME[color]}.`);
    const update = {
      players, hands: newHands,
      topColor: color, topValue: 'wild',
      currentPlayerIndex: nextPlayerIndex(state),
      challengeOpen: false, lastActualCard: null, lastClaimedCard: null,
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    };
    update.unoCallRequired = (!won && newHand.length === 1)
      ? { playerId: botId, playerName: botName }
      : firebase.firestore.FieldValue.delete();
    if (won) { update.status = 'ended'; update.winner = botId; update.winnerName = botName; }
    await db.collection('rooms').doc(currentRoomId).update(update);
    return;
  }

  // Wild4 / wildc4Plus → start wild4 challenge for next player
  if (card.value === 'wild4' || card.value === 'wildc4Plus') {
    const color = botPickColor(myHand);
    const newHands = { ...state.hands, [botId]: newHand };
    const players = state.players.map(p =>
      p.id === botId ? { ...p, cardCount: newHand.length } : p
    );
    const targetIdx = ((state.currentPlayerIndex + state.direction) % n + n) % n;
    const target = state.players[targetIdx];
    const prevTopColor = state.topColor;
    const log = addLog(state.log,
      `${botName} jugó +4 y eligió ${COLOR_NAME[color]}. ${target?.name || '?'} puede aceptar o desafiar.`
    );
    await db.collection('rooms').doc(currentRoomId).update({
      players, hands: newHands,
      topColor: color, topValue: 'wild4', prevTopColor,
      wild4Challenge: {
        chooserId: botId, chooserName: botName,
        targetId: target?.id, targetName: target?.name,
        targetIndex: targetIdx, chosenColor: color, prevTopColor,
        nextPlayerIndex: ((targetIdx + state.direction) % n + n) % n
      },
      currentPlayerIndex: targetIdx,
      challengeOpen: false, lastActualCard: null, lastClaimedCard: null,
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  // Wild Pile Up
  if (card.value === 'wildPileUp') {
    const newHands = { ...state.hands, [botId]: newHand };
    const players = state.players.map(p =>
      p.id === botId ? { ...p, cardCount: newHand.length } : p
    );
    let { drawPile } = state;
    const pile = [];
    for (let attempts = 0; attempts < 10; attempts++) {
      const { drawn, newDrawPile } = takeCards(drawPile, 1);
      if (!drawn.length) break;
      drawPile = newDrawPile;
      pile.push(drawn[0]);
      if (drawn[0].color !== 'black') break;
    }
    const pileColor = pile.length ? pile[pile.length - 1].color : (state.topColor || 'red');
    const nextIdx = ((state.currentPlayerIndex + state.direction) % n + n) % n;
    const log = addLog(state.log,
      `${botName} jugó ⬆ Comodín Pila Salvaje. Mini-pila con ${pile.length} carta(s), color ${COLOR_NAME[pileColor]}.`
    );
    await db.collection('rooms').doc(currentRoomId).update({
      players, hands: newHands, drawPile,
      topColor: pileColor, topValue: 'wildPileUp',
      wildPileUpPhase: { pile, pileColor, holderIndex: nextIdx },
      challengeOpen: false, lastActualCard: null, lastClaimedCard: null,
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  // Wild Drawn Together
  if (card.value === 'wildDrawnTogether') {
    const others = state.players.filter(p => p.id !== botId && !p.disconnected);
    if (others.length < 2) {
      // Not enough players — draw a different card instead (fallback: draw and pass)
      await botDrawAndPass(state, botId, botName);
      return;
    }
    const newHands = { ...state.hands, [botId]: newHand };
    const players = state.players.map(p =>
      p.id === botId ? { ...p, cardCount: newHand.length } : p
    );
    const nonBots = others.filter(p => !isBot(p.id));
    const linked = (nonBots.length >= 2 ? nonBots : others).slice(0, 2).map(p => p.id);
    const color = botPickColor(myHand);
    const p1 = state.players.find(p => p.id === linked[0])?.name || '?';
    const p2 = state.players.find(p => p.id === linked[1])?.name || '?';
    const log = addLog(state.log,
      `${botName} jugó ⬌ Comodín de Enlace. ¡${p1} y ${p2} están enlazados! Color: ${COLOR_NAME[color]}.`
    );
    await db.collection('rooms').doc(currentRoomId).update({
      players, hands: newHands,
      topColor: color, topValue: 'wildDrawnTogether',
      linkedPlayers: linked,
      currentPlayerIndex: nextPlayerIndex(state),
      challengeOpen: false, lastActualCard: null, lastClaimedCard: null,
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  // Point Taken
  if (card.value === 'pointTaken') {
    const newHands = { ...state.hands, [botId]: newHand };
    const players = state.players.map(p =>
      p.id === botId ? { ...p, cardCount: newHand.length } : p
    );
    const nextIdx = ((state.currentPlayerIndex + state.direction) % n + n) % n;
    const log = addLog(state.log,
      `${botName} jugó ☝️ Carta Apunta y Toma. ¡Todos apuntan a un jugador!`
    );
    await db.collection('rooms').doc(currentRoomId).update({
      players, hands: newHands,
      topColor: card.color, topValue: 'pointTaken',
      pointTakenPhase: { triggerPlayerId: botId, nextPlayerIndex: nextIdx, votes: {} },
      linkedPlayers: firebase.firestore.FieldValue.delete(),
      pendingSkips: firebase.firestore.FieldValue.delete(),
      challengeOpen: false, lastActualCard: null, lastClaimedCard: null,
      log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
    });
    return;
  }

  const newHands = { ...state.hands, [botId]: newHand };
  let players = state.players.map(p =>
    p.id === botId ? { ...p, cardCount: newHand.length } : p
  );
  const log = addLog(state.log,
    `${botName} jugó ${COLOR_NAME[card.color]} ${VALUE_LABEL[card.value]}.`
  );

  const update = {
    players, hands: newHands,
    topColor: card.color, topValue: card.value,
    currentPlayerIndex: nextPlayerIndex(state),
    challengeOpen: false, lastActualCard: null, lastClaimedCard: null,
    unoCallRequired: firebase.firestore.FieldValue.delete(),
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };
  if (won) { update.status = 'ended'; update.winner = botId; update.winnerName = botName; }
  await db.collection('rooms').doc(currentRoomId).update(update);
}

async function botDrawAndPass(state, botId, botName) {
  let { drawn, newDrawPile: drawPile } = takeCards(state.drawPile, 1);
  const newHand = [...(state.hands?.[botId] || []), ...drawn];
  let newHands = { ...state.hands, [botId]: newHand };

  // Linked partner also draws 1 and loses their turn
  const linked = state.linkedPlayers;
  let botDrawSkips = state.pendingSkips ? [...state.pendingSkips] : [];
  if (linked?.includes(botId) && drawn.length > 0) {
    const partnerId = linked[0] === botId ? linked[1] : linked[0];
    const partner = state.players.find(p => p.id === partnerId && !p.disconnected);
    if (partner) {
      const { drawn: pd, newDrawPile: npd } = takeCards(drawPile, 1);
      drawPile = npd;
      newHands = { ...newHands, [partnerId]: [...(newHands[partnerId] || []), ...pd] };
      if (!botDrawSkips.includes(partnerId)) botDrawSkips.push(partnerId);
    }
  }

  const players = state.players.map(p => ({ ...p, cardCount: (newHands[p.id] || []).length }));
  const log = addLog(state.log, `${botName} robó una carta y pasó.`);
  const botDrawUpdate = {
    hands: newHands, players, drawPile,
    currentPlayerIndex: nextPlayerIndex(state),
    unoCallRequired: firebase.firestore.FieldValue.delete(),
    log, lastActivity: firebase.firestore.FieldValue.serverTimestamp()
  };
  botDrawUpdate.pendingSkips = botDrawSkips.length > 0 ? botDrawSkips : firebase.firestore.FieldValue.delete();
  await db.collection('rooms').doc(currentRoomId).update(botDrawUpdate);
}
