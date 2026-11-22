// ============================================================
// G7 — Guided first game (UNO Fiesta)
//
// A short game on this device only, against "Profe Fiesta", with a fixed deck so every
// lesson works:
//   1 match the colour         5 play a Comodín and pick a colour
//   2 play a +2                6 play down to one card
//   3 play ☝️ Apunta y Toma     7 shout ¡UNO!
//   4 point at someone          8 play your last card and win
//
// While LOCAL_GAME is on, the room id 'TUTORIAL' is answered by a small in-memory
// stand-in (doc().get/update and runTransaction) and every save redraws the game
// through onRoomUpdate(). Nothing is saved and it doesn't count in your stats.
// ============================================================

let LOCAL_GAME = false;
const TUT_ROOM = 'TUTORIAL', TUT_BOT = 'bot_profe', TUT_ME_FALLBACK = 'tut-me';

addStrings({
  'tut.open':  ['🎓 ¿Primera vez? Aprende jugando (2 min)', '🎓 First time? Learn by playing (2 min)'],
  'tut.bot':   ['Profe Fiesta', 'Prof. Party'],
  'tut.step':  ['Paso {n} de 8', 'Step {n} of 8'],
  'tut.skip':  ['Salir del tutorial', 'Leave tutorial'],
  'tut.start': ['Tutorial: aprende a jugar contra el Profe.', 'Tutorial: learn to play against the Prof.'],
  'tut.s1': ['Juega una carta que coincida en <b>color o número</b> con el descarte. Toca el <b>Rojo 5</b>.', 'Play a card that matches the top card\'s <b>colour or number</b>. Tap the <b>Red 5</b>.'],
  'tut.s2': ['¡Ataca! El <b>Rojo +2</b> hace que el Profe robe 2 y pierda su turno. Tócalo.', 'Attack! The <b>Red +2</b> makes the Prof draw 2 and lose his turn. Tap it.'],
  'tut.s3': ['Ahora una carta de fiesta: <b>☝️ Apunta y Toma</b>. Todos señalan a alguien y cada uno roba una carta por cada vez que lo apuntan. Tócala.', 'Now a party card: <b>☝️ Point & Take</b>. Everyone points at someone and each player draws a card for every point. Tap it.'],
  'tut.s4': ['¡A apuntar! Toca <b>👉 Profe Fiesta</b>. (Él te apuntará a ti, así que los dos robáis 1.)', 'Time to point! Tap <b>👉 Prof. Party</b>. (He\'ll point at you, so you both draw 1.)'],
  'tut.s5': ['Un <b>Comodín</b> vale sobre cualquier carta y eliges el color. Tócalo y elige <b>Azul</b>.', 'A <b>Wild</b> goes on any card and you pick the colour. Tap it and pick <b>Blue</b>.'],
  'tut.s6': ['Juega el <b>Azul 4</b>. Te quedará una sola carta…', 'Play the <b>Blue 4</b>. You\'ll have just one card left…'],
  'tut.s7': ['¡Grita <b>¡UNO!</b> antes de que te pillen (si te lo gritan, robas 2).', 'Shout <b>UNO!</b> before someone catches you (if they call it on you, you draw 2).'],
  'tut.s8': ['Juega tu última carta, el <b>Azul 7</b>, y gana.', 'Play your last card, the <b>Blue 7</b>, and win.'],
  'tut.wait':  ['Turno del Profe… mira lo que hace.', "The Prof's turn… watch what he does."],
  'tut.doneT': ['¡Ganaste tu primera partida!', 'You won your first game!'],
  'tut.done':  ['Ya sabes lo básico. Aún te quedan sorpresas: la <b>📚 Pila Salvaje</b>, el <b>🔗 Comodín de Enlace</b>, el desafío del <b>Comodín +4</b> y las <b>⚡ jugadas fuera de turno</b>. Míralas en las reglas o mantén pulsada una carta.',
                'You know the basics. More surprises are waiting: the <b>📚 Wild Pile</b>, the <b>🔗 Link Wild</b>, the <b>Wild +4</b> challenge and <b>⚡ out-of-turn plays</b>. See the rules or hold a card.'],
  'tut.again': ['Jugar contra bots', 'Play against bots'],
  'tut.home':  ['Volver al inicio', 'Back to start']
});
// This file loads after extras.js already filled in the page text, so fill it in again
// for the keys added just above (e.g. the winner screen's "Back to start")
applyStaticI18n();

// ---------- In-memory stand-in for the room document ----------
const LocalRoom = { data: null };
const FV = firebase.firestore.FieldValue;
const tutClone = o => JSON.parse(JSON.stringify(o));
function localApply(update) {
  const d = LocalRoom.data;
  for (const [key, value] of Object.entries(update)) {
    const path = key.split('.');
    let obj = d;
    for (let i = 0; i < path.length - 1; i++) obj = obj[path[i]] ??= {};
    const last = path[path.length - 1];
    if (value instanceof FV) {
      const m = value._delegate?._methodName || '';
      if (value.isEqual(FV.delete())) delete obj[last];
      else if (value.isEqual(FV.serverTimestamp())) obj[last] = Date.now();
      else if (m.includes('arrayUnion')) obj[last] = [...new Set([...(obj[last] || []), ...(value._delegate._elements || [])])];
      else if (m.includes('arrayRemove')) obj[last] = (obj[last] || []).filter(x => !(value._delegate._elements || []).includes(x));
      else if (m.includes('increment')) obj[last] = (obj[last] || 0) + (value._delegate._operand || 0);
    } else {
      obj[last] = value === undefined ? null : tutClone(value);
    }
  }
}
let _commitTimer = null;
function localCommit() {
  clearTimeout(_commitTimer);
  _commitTimer = setTimeout(() => {
    if (!LOCAL_GAME || !LocalRoom.data) return;
    roomState = tutClone(LocalRoom.data);
    onRoomUpdate(roomState);
  }, 0);
}
const localRef = {
  id: TUT_ROOM,
  get: async () => ({ exists: !!LocalRoom.data, data: () => tutClone(LocalRoom.data) }),
  update: async (update) => { if (LocalRoom.data && update && typeof update === 'object') { localApply(update); localCommit(); } },
  set: async (data) => { LocalRoom.data = tutClone(data); localCommit(); },
  delete: async () => {},
  onSnapshot: () => () => {}
};
(function installLocalRoom() {
  const realCollection = db.collection.bind(db);
  const realTransaction = db.runTransaction.bind(db);
  db.collection = name => {
    const real = realCollection(name);
    return new Proxy(real, {
      get(target, prop) {
        if (prop === 'doc') return id => (LOCAL_GAME && id === TUT_ROOM) ? localRef : target.doc(id);
        const v = target[prop];
        return typeof v === 'function' ? v.bind(target) : v;
      }
    });
  };
  db.runTransaction = fn => {
    if (!LOCAL_GAME) return realTransaction(fn);
    const tx = {
      get: async ref => ref.get(),
      update: (ref, update) => { if (ref === localRef) localApply(update); return tx; },
      set: (ref, data) => { if (ref === localRef) LocalRoom.data = tutClone(data); return tx; }
    };
    return Promise.resolve(fn(tx)).then(r => { localCommit(); return r; });
  };
})();

// ---------- The lesson ----------
const tc = (color, value) => ({ color, value });
const MY_ORDER  = [['red', '5', 1], ['red', 'draw2', 2], ['red', 'pointTaken', 3], ['black', 'wild', 5], ['blue', '4', 6], ['blue', '7', 8]];
const BOT_ORDER_TUT = [['red', '8'], ['red', '1'], ['blue', '2'], ['blue', '9']];

function startTutorial() {
  closeRules();
  LOCAL_GAME = true;
  if (!localUid) localUid = TUT_ME_FALLBACK;
  const me = localUid;
  const raw = document.getElementById('player-name').value.trim() || t('land.defaultName');
  const myName = selectedEmoji ? `${selectedEmoji} ${raw}` : raw;
  localName = myName;
  currentRoomId = TUT_ROOM;
  LocalRoom.data = {
    game: 'fiesta', status: 'playing', hostId: me,
    players: [
      { id: me, name: myName, cardCount: 5 },
      { id: TUT_BOT, name: `🎉 ${t('tut.bot')}`, cardCount: 5, isBot: true, persona: 'balanced' }
    ],
    currentPlayerIndex: 0, direction: 1,
    topColor: 'red', topValue: '3', prevTopColor: 'red', prevTopValue: '3', lastPlayerId: null,
    hands: {
      [me]:      [tc('red', '5'), tc('red', 'draw2'), tc('red', 'pointTaken'), tc('black', 'wild'), tc('blue', '7')],
      [TUT_BOT]: [tc('red', '8'), tc('red', '1'), tc('blue', '2'), tc('blue', '9'), tc('green', '6')]
    },
    // drawn in this order: the Profe's +2 (2), then Apunta y Toma: Profe 1, me 1 (Azul 4)
    drawPile: [tc('green', '1'), tc('yellow', '6'), tc('green', '3'), tc('blue', '4'),
               tc('yellow', '2'), tc('green', '8'), tc('red', '9'), tc('yellow', '5')],
    log: [t('tut.start')],
    winner: null, winnerName: null, winnerReason: null, endVotes: [], stats: {}
  };
  document.body.classList.add('tutorial');
  fxPrevState = null;
  roomState = tutClone(LocalRoom.data);
  onRoomUpdate(roomState);
}

const tutHas = (hand, color, value) => hand.findIndex(c => c.color === color && c.value === value);

// Which lesson we're on, read from the game itself
function tutorialStep(state) {
  const me = localUid;
  if (state.pointTakenPhase) return state.pointTakenPhase.votes?.[me] ? 0 : 4;
  if (state.unoCallRequired?.playerId === me) return 7;
  if (!isMyTurn(state)) return 0;
  const hand = state.hands?.[me] || [];
  const next = MY_ORDER.find(([c, v]) => tutHas(hand, c, v) >= 0);
  return next ? next[2] : 0;
}
function tutorialWantCard(step) {
  return MY_ORDER.find(x => x[2] === step) || null;
}
function tutorialAllowsCard(card) {
  const want = tutorialWantCard(tutorialStep(roomState));
  return !!want && card.color === want[0] && card.value === want[1];
}

function tutorialRender(state) {
  let coach = document.getElementById('coach');
  if (!coach) {
    coach = document.createElement('div');
    coach.id = 'coach';
    coach.className = 'coach';
    document.querySelector('.hand-area')?.before(coach);
  }
  const step = tutorialStep(state);
  coach.innerHTML = `
    <div class="coach-head"><span class="coach-step">${step ? t('tut.step', { n: step }) : ''}</span>
      <button type="button" class="link-btn coach-skip" onclick="endTutorial()">${t('tut.skip')}</button></div>
    <div class="coach-text">${step ? t('tut.s' + step) : t('tut.wait')}</div>`;
  coach.classList.toggle('waiting', !step);
  const want = tutorialWantCard(step);
  const hand = state.hands?.[localUid] || [];
  document.querySelectorAll('#player-hand .card[data-index]').forEach(el => {
    const c = hand[+el.dataset.index];
    el.classList.toggle('coach-pulse', !!want && !!c && c.color === want[0] && c.value === want[1]);
  });
}

// The Profe follows the script (called from runBotTick instead of the normal bot brain)
async function tutorialBotTick(state) {
  if (state.status !== 'playing') return;
  const bot = state.players.find(p => p.id === TUT_BOT);
  if (state.pointTakenPhase) {
    if (!state.pointTakenPhase.votes?.[TUT_BOT]) await botPointTakenVote(state, [bot]);   // points at me
    return;
  }
  if (state.unoCallRequired?.playerId === localUid) return;     // waiting for my UNO
  if (state.players[state.currentPlayerIndex]?.id !== TUT_BOT) return;
  const hand = state.hands?.[TUT_BOT] || [];
  for (const [c, v] of BOT_ORDER_TUT) {
    const i = tutHas(hand, c, v);
    if (i >= 0) { await botPlayCard(state, TUT_BOT, bot.name, hand[i], i); return; }
  }
}

function tutorialOutro() {
  document.getElementById('coach')?.remove();
  let m = document.getElementById('tut-outro');
  if (!m) {
    m = document.createElement('div');
    m.id = 'tut-outro';
    m.className = 'spotify-modal';
    document.body.appendChild(m);
  }
  m.innerHTML = `<div class="spotify-modal-card tut-card">
    <div class="tut-trophy">🏆</div>
    <h3 class="spotify-modal-title">${t('tut.doneT')}</h3>
    <p class="spotify-modal-desc">${t('tut.done')}</p>
    <div class="spotify-modal-btns">
      <button class="btn btn-primary" onclick="endTutorial(); handleQuickBots();">🤖 ${t('tut.again')}</button>
      <button class="btn btn-ghost" onclick="endTutorial()">${t('tut.home')}</button>
    </div>
  </div>`;
  m.classList.remove('hidden');
  try { localStorage.setItem('fiestaTutorialDone', '1'); } catch (_) {}
  updateTutorialLink();
}

function endTutorial() {
  LOCAL_GAME = false;
  LocalRoom.data = null;
  if (localUid === TUT_ME_FALLBACK) localUid = auth.currentUser?.uid || null;
  _celebrated = null;
  roomState = null;
  currentRoomId = null;
  fxPrevState = null;
  document.body.classList.remove('tutorial');
  document.getElementById('coach')?.remove();
  document.getElementById('tut-outro')?.remove();
  ['uno-call-overlay', 'claim-dialog', 'point-taken-overlay'].forEach(id => document.getElementById(id)?.classList.add('hidden'));
  FX.layer().innerHTML = '';
  showScreen('landing');
}

function updateTutorialLink() {
  const el = document.getElementById('tutorial-link');
  if (!el) return;
  el.innerHTML = t('tut.open');
  let seen = false;
  try { seen = !!localStorage.getItem('fiestaTutorialDone') || loadMyStats().games > 0; } catch (_) {}
  el.classList.toggle('first-time', !seen);
}
document.addEventListener('langchange', updateTutorialLink);
updateTutorialLink();

// ============================================================
// Y2 — install as an app: register the service worker (sw.js)
// ============================================================
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
