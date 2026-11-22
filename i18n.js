// ============================================================
// I18N — Spanish / English text (idea Y6)
//
// t('key', { name: 'Ana' }) returns the text in the chosen language, with {name}
// replaced. Missing English keys fall back to Spanish, missing keys show the key.
// Loaded before every other script so all of them can use t().
// ============================================================

const I18N = { es: {}, en: {} };

// The chosen language: saved per device, Spanish by default
let LANG = (() => {
  try { return localStorage.getItem('fiestaLang') === 'en' ? 'en' : 'es'; } catch (_) { return 'es'; }
})();
try { document.documentElement.lang = LANG; } catch (_) {}

function t(key, params) {
  let s = I18N[LANG]?.[key] ?? I18N.es[key] ?? key;
  if (params) s = s.replace(/\{(\w+)\}/g, (m, k) => (params[k] ?? m));
  return s;
}

// Adds a block of strings: addStrings({ key: ['español', 'English'], ... })
function addStrings(map) {
  for (const [k, [es, en]] of Object.entries(map)) {
    I18N.es[k] = es;
    I18N.en[k] = en ?? es;
  }
}

// English only: for fixed text in index.html, whose Spanish is written in the page
function addEnglish(map) { Object.assign(I18N.en, map); }

// Switches language, saves it, and tells the page to redraw ('langchange' event)
function setLanguage(lang) {
  LANG = lang === 'en' ? 'en' : 'es';
  try { localStorage.setItem('fiestaLang', LANG); } catch (_) {}
  document.documentElement.lang = LANG;
  applyStaticI18n();
  document.dispatchEvent(new Event('langchange'));
}

// Fixed text in index.html: elements with data-i18n="key" (text) or
// data-i18n-ph="key" (placeholder) / data-i18n-title="key" (tooltip).
// The Spanish text written in the HTML is kept as the fallback.
function applyStaticI18n() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    if (el.dataset.i18nEs === undefined) el.dataset.i18nEs = el.innerHTML;
    const k = el.dataset.i18n;
    el.innerHTML = (LANG === 'es' || !I18N.en[k]) ? (I18N.es[k] ?? el.dataset.i18nEs) : I18N.en[k];
  });
  document.querySelectorAll('[data-i18n-ph]').forEach(el => {
    if (el.dataset.i18nPhEs === undefined) el.dataset.i18nPhEs = el.placeholder;
    el.placeholder = I18N[LANG][el.dataset.i18nPh] ?? el.dataset.i18nPhEs;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    if (el.dataset.i18nTitleEs === undefined) el.dataset.i18nTitleEs = el.title;
    el.title = I18N[LANG][el.dataset.i18nTitle] ?? el.dataset.i18nTitleEs;
  });
  document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('selected', b.dataset.lang === LANG));
}

// A colour's name on screen (the saved log keeps Spanish names: see translateLog)
const colorLabel = c => t('color.' + c);

// ---- Card words ----
addStrings({
  'color.red': ['Rojo', 'Red'], 'color.yellow': ['Amarillo', 'Yellow'], 'color.green': ['Verde', 'Green'],
  'color.blue': ['Azul', 'Blue'], 'color.black': ['Comodín', 'Wild'],
  'card.wild': ['Comodín', 'Wild'], 'card.wild4': ['Comodín +4', 'Wild +4'],
  'card.wildPileUp': ['Comodín Pila Salvaje', 'Wild Pile'], 'card.wildDrawnTogether': ['Comodín de Enlace', 'Link Wild'],
  'card.pointTaken': ['Apunta y Toma', 'Point & Take']
});

// ---- Game words (app.js) ----
addStrings({
  'ui.copy': ['Copiar', 'Copy'], 'ui.copied': ['¡Copiado!', 'Copied!'], 'ui.cancel': ['Cancelar', 'Cancel'],
  'ui.close': ['Cerrar', 'Close'], 'ui.retry': ['Reintentar', 'Try again'], 'ui.disconnect': ['Desconectar', 'Disconnect'],
  'ui.someone': ['Alguien', 'Someone'], 'chat.me': ['(yo)', '(me)'],
  'err.name': ['Escribe tu nombre primero', 'Type your name first'],
  'err.connecting': ['Aún conectando… intenta de nuevo', 'Still connecting… try again'],
  'err.code': ['Introduce el código de sala de 6 caracteres', 'Enter the 6-character room code'],
  'err.notFound': ['Sala no encontrada', 'Room not found'],
  'err.ended': ['La partida ya terminó', 'That game has already ended'],
  'err.started': ['La partida ya comenzó', 'That game has already started'],
  'err.full': ['Sala llena (máximo {n})', 'Room full (max {n})'],
  'lob.removeBot': ['Quitar bot', 'Remove bot'], 'lob.back': ['vuelve', 'back'], 'lob.readyBadge': ['✓ listo', '✓ ready'],
  'lob.dc': ['desconectado', 'disconnected'], 'lob.ready': ['✓ Estás listo para jugar', "✓ You're ready to play"],
  'lob.again': ['¡Quiero jugar de nuevo!', 'I want to play again!'], 'lob.start': ['Iniciar partida', 'Start game'],
  'lob.waitingPlayers': ['Esperando jugadores…', 'Waiting for players…'], 'lob.addBot': ['+ Añadir bot', '+ Add bot'],
  'vc.title': ['Chat de voz', 'Voice chat'], 'vc.opened': ['{name} abrió el micrófono', '{name} turned their mic on'],
  'vc.left': ['{name} dejó el chat de voz', '{name} left voice chat'], 'vc.muted': ['{name} silenció el micrófono', '{name} muted their mic'],
  'vc.unmuted': ['{name} activó el micrófono', '{name} unmuted their mic'], 'vc.noMic': ['No se pudo acceder al micrófono', 'Could not use the microphone'],
  'vc.join': ['Unirse al chat de voz', 'Join voice chat'], 'vc.mute': ['Silenciar micrófono', 'Mute microphone'], 'vc.leave': ['Salir del chat de voz', 'Leave voice chat'],
  'uno.mine': ['¡Solo te queda 1 carta!', 'You only have 1 card left!'], 'uno.shout': ['¡GRITA UNO!', 'SHOUT UNO!'],
  'uno.other': ['¡{name} tiene 1 carta!', '{name} has 1 card!'], 'uno.callOn': ['Gritarle UNO a {name}', 'Call UNO on {name}'],
  'st.yourTurn': ['🎊 ¡Tu turno! Elige una carta.', '🎊 Your turn! Pick a card.'],
  'st.turnOf': ['Turno de {name}', "{name}'s turn"],
  'hand.mine': ['Tu mano', 'Your hand'], 'hand.linked': ['🔗 ENLAZADO', '🔗 LINKED'], 'hand.echo': ['⚡ ECO ACTIVO', '⚡ ECHO ON'],
  'hand.pileMatch': ['Mini-pila ({c}) — juega una carta que coincida o toca "Tomar pila"', 'Mini-pile ({c}) — play a matching card or tap "Take pile"'],
  'hand.pileNone': ['Mini-pila ({c}) — no tienes cartas jugables', "Mini-pile ({c}) — you have no playable cards"],
  'hand.drawnOk': ['¡Sacaste una carta jugable! Juega cualquier carta válida o pasa.', 'You drew a playable card! Play any valid card or pass.'],
  'hand.drawnNo': ['Sacaste una carta no jugable. Juega una carta válida o pasa.', "The card you drew can't be played. Play a valid card or pass."],
  'hand.pick': ['Tu turno — haz clic en una carta para jugar', 'Your turn — tap a card to play it'],
  'hand.count': ['Tu mano ({n})', 'Your hand ({n})'],
  'toi.you': ['tu turno', 'your turn'], 'toi.prev': ['anterior', 'previous'], 'toi.next': ['siguiente', 'next'],
  'opp.linked': ['🔗 ENLAZADO', '🔗 LINKED'], 'opp.echo': ['⚡ ECO', '⚡ ECHO'],
  'nt.on': ['🔔 Notificaciones activadas', '🔔 Notifications on'], 'nt.onBody': ['Recibirás avisos del juego.', "You'll get game alerts."],
  'nt.disable': ['Desactivar notificaciones', 'Turn off notifications'], 'nt.enable': ['Activar notificaciones', 'Turn on notifications'],
  'nt.started': ['¡La partida comenzó!', 'The game has started!'], 'nt.first': ['{name} va primero.', '{name} goes first.'],
  'nt.won': ['🏆 ¡Ganaste!', '🏆 You won!'], 'nt.over': ['🎉 Partida terminada', '🎉 Game over'],
  'nt.congrats': ['¡Felicidades!', 'Congratulations!'], 'nt.whoWon': ['Ganó {name}', '{name} won'],
  'nt.yourTurn': ['¡Es tu turno!', "It's your turn!"], 'nt.yourTurnBody': ['Elige una carta para jugar.', 'Pick a card to play.'],
  'nt.uno': ['¡Solo te queda 1 carta! Grita UNO antes de que alguien te atrape.', 'Only 1 card left! Shout UNO before someone catches you.'],
  'mu.mute': ['Silenciar música', 'Mute music'], 'mu.play': ['Activar música', 'Play music'],
  'claim.wildTitle': ['Elige el color del Comodín', 'Pick the Wild colour'], 'claim.w4Title': ['Elige el color para el +4', 'Pick the colour for the +4'],
  'draw.ok': ['Sí, robar', 'Yes, draw'],
  'g.leaveQ': ['¿Seguro que quieres salir?', 'Are you sure you want to leave?'],
  'g.leaveBody': ['Si sales ahora no podrás ver la puntuación final ni serás incluido en el marcador. Si quieres terminar la partida y ver los resultados, vota para finalizar.', "If you leave now you won't see the final score or be counted in it. To end the game and see the results, vote to end instead."],
  'g.leave': ['Salir', 'Leave'], 'g.stay': ['Quedarme', 'Stay'], 'g.voteEnd': ['Votar Terminar', 'Vote to end'],
  'g.votes': ['{n}/{t} quieren terminar', '{n}/{t} want to end'], 'g.withdraw': ['Retirar voto', 'Withdraw vote'], 'g.end': ['Terminar', 'End game'],
  'w.vote': ['🤝 ¡Partida terminada!', '🤝 Game over!'], 'w.byPoints': ['{name} ganó con menos puntos', '{name} won with the fewest points'],
  'w.byCards': ['{name} ganó con menos cartas', '{name} won with the fewest cards'], 'w.last': ['🏆 ¡Último en pie!', '🏆 Last one standing!'],
  'w.winner': ['🎉 ¡Ganador!', '🎉 Winner!'],
  'pt.count': ['{v} / {n} jugadores apuntaron', '{v} / {n} players have pointed'],
  'pt.youPointed': ['✓ Apuntaste a {name}', '✓ You pointed at {name}'],
  'pt.cards': ['({n} cartas)', '({n} cards)'],
  'sp.cancel': ['Cancelaste la conexión con Spotify.', 'You cancelled the Spotify connection.'],
  'sp.session': ['Error de sesión Spotify. Intenta de nuevo.', 'Spotify session error. Try again.'],
  'sp.fetch': ['No se pudo contactar Spotify. Revisa tu conexión.', "Couldn't reach Spotify. Check your connection."],
  'sp.other': ['Error de Spotify: {e}', 'Spotify error: {e}'], 'sp.nothing': ['Sin reproducción activa ahora mismo.', 'Nothing playing right now.'],
  'sp.connected': ['Conectado a Spotify', 'Connected to Spotify'], 'sp.on': ['Spotify conectado', 'Spotify connected'],
  'sp.connectTitle': ['Conectar Spotify', 'Connect Spotify'],
  'sp.desc': ['Comparte lo que estás escuchando con los demás jugadores. Aparecerá en la barra superior.', "Share what you're listening to with the other players. It shows in the top bar."],
  'sp.connectBtn': ['Conectar cuenta', 'Connect account'], 'sp.errTitle': ['Error de Spotify', 'Spotify error'],
  'lf.notFound': ['Usuario no encontrado en Last.fm.', 'User not found on Last.fm.'], 'lf.netError': ['Error de conexión. Intenta de nuevo.', 'Connection error. Try again.'],
  'lf.now': ['Escuchando ahora', 'Listening now'], 'lf.last': ['Última escuchada', 'Last played'], 'lf.none': ['Sin historial de Last.fm.', 'No Last.fm history.'],
  'lf.as': ['Conectado como {name}', 'Connected as {name}'], 'lf.connectTitle': ['Conectar Last.fm', 'Connect Last.fm'],
  'lf.desc': ['Introduce tu usuario de Last.fm para compartir lo que escuchas (funciona con Spotify, Apple Music, Tidal y más).', 'Enter your Last.fm username to share what you listen to (works with Spotify, Apple Music, Tidal and more).'],
  'lf.placeholder': ['Tu usuario de Last.fm', 'Your Last.fm username'], 'lf.connect': ['Conectar', 'Connect'],
  // Mini-pile panel, Link dialog, Wild +4 challenge, draw question, final standings
  'pu.title': ['⬆ Mini-Pila — color {c} ({n} cartas)', '⬆ Mini-pile — colour {c} ({n} cards)'],
  'pu.title1': ['⬆ Mini-Pila — color {c} (1 carta)', '⬆ Mini-pile — colour {c} (1 card)'],
  'pu.yourTurn': ['¡Es tu turno! Juega una carta del color de la pila.', "It's your turn! Play a card in the pile's colour."],
  'pu.noColor': ['No tienes cartas de color {c}. Debes tomar la mini-pila.', 'You have no {c} cards. You must take the mini-pile.'],
  'pu.waiting': ['Esperando que {name} juegue…', 'Waiting for {name} to play…'],
  'dt.echoTitle': ['⬌ Comodín de Enlace — Modo Eco', '⬌ Link Wild — Echo mode'],
  'dt.echoOk': ['Activar Eco', 'Turn on Echo'],
  'w4c.waitOther': ['{t} está decidiendo sobre el Comodín +4 de {c}…', '{t} is deciding about {c}\'s Wild +4…'],
  'w4c.waitMine': ['{t} está decidiendo si desafiar tu Comodín +4…', '{t} is deciding whether to challenge your Wild +4…'],
  'w4c.hand': ['Mano de {c} — {n} cartas:', "{c}'s hand — {n} cards:"],
  'w4c.hand1': ['Mano de {c} — 1 carta:', "{c}'s hand — 1 card:"],
  'w4c.handAt': ['Mano de {c} al jugar el Comodín +4 — color era {col}:', "{c}'s hand when the Wild +4 was played — the colour was {col}:"],
  'w4c.empty': ['Mano vacía', 'Empty hand'],
  'w4c.accept': ['Aceptar (tomar 4)', 'Accept (draw 4)'], 'w4c.challenge': ['Desafiar', 'Challenge'],
  'w4c.confirm': ['Confirmar desafío', 'Confirm challenge'],
  'w4c.invalid': ['{c} sí tenía cartas que podía poner. El Comodín +4 no era <strong>válido</strong>.', '{c} did have cards they could play. The Wild +4 was <strong>not allowed</strong>.'],
  'w4c.valid': ['{c} no tenía ninguna carta jugable. El Comodín +4 era <strong>válido</strong>.', '{c} had no playable cards. The Wild +4 was <strong>allowed</strong>.'],
  'draw.haveTitle': ['Tienes cartas jugables', 'You have playable cards'],
  'draw.haveBody': ['Tienes cartas que puedes jugar. ¿Quieres sacar una de todas formas?', 'You have cards you can play. Draw one anyway?'],
  'w.standing': ['{c} cartas · {p} pts', '{c} cards · {p} pts']
});

// ---- Game log in English ----
// Log lines are saved in Spanish by everyone (so all players read the same log); with
// English on they're translated as they're shown. Most specific patterns first.
const LOG_EN = [
  [/^(.+) se reconectó\.$/, '$1 reconnected.'],
  [/^(.+) se desconectó\.$/, '$1 disconnected.'],
  [/^Se saltó el turno de (.+) \(desconectado\)\.$/, "$1's turn was skipped (disconnected)."],
  [/^Partida terminada por acuerdo\. ¡(.+) gana!$/, 'Game ended by agreement. $1 wins!'],
  [/^¡Partida iniciada! (.+) va primero\.$/, 'Game started! $1 goes first.'],
  [/^(.+) grita ¡UNO! 🎴$/, '$1 shouts UNO! 🎴'],
  [/^(.+) dice ¡UNO! 🎴$/, '$1 says UNO! 🎴'],
  [/^🚨 (.+) le gritó UNO a (.+)\. (.+) saca 2 cartas\.(.*)$/, '🚨 $1 called UNO on $2. $3 draws 2 cards.$4'],
  [/^🚨 (.+) atrapó a (.+) con una carta\. (.+) saca 2 cartas\.$/, '🚨 $1 caught $2 with one card. $3 draws 2 cards.'],
  [/^(.+) intenta atrapar UNO pero no hay nadie con una carta\.$/, '$1 tries to call UNO but nobody has one card.'],
  [/^(.+) jugó ☝️ Carta Apunta y Toma\. ¡Todos apuntan a un jugador!$/, '$1 played ☝️ Point & Take. Everyone points at a player!'],
  [/^(.+) fue apuntado (\d+) (?:vez|veces) por (.+) → saca (\d+)\.$/, '$1 was pointed at $2× by $3 → draws $4.'],
  [/^(.+) también saca 1 carta \(enlazados\)\.$/, '$1 also draws 1 card (linked).'],
  [/^(.+) también saca (\d+) \(enlazados\)\.$/, '$1 also draws $2 (linked).'],
  [/^(.+) también pierde su turno \(enlazados\)\.$/, '$1 also loses their turn (linked).'],
  [/^Se sacó (.+) del mazo: no es carta de color para la dinámica Pila Salvaje — fue descartada\.$/, '$1 came off the deck: not a colour card for the Wild Pile — it was discarded.'],
  [/^(.+) jugó ⬆ Comodín Pila Salvaje\. Mini-pila con (\d+) carta\(s\), color (.+)\.$/, '$1 played ⬆ Wild Pile. Mini-pile with $2 card(s), colour $3.'],
  [/^(.+) jugó (.+) en la mini-pila\.$/, '$1 played $2 on the mini-pile.'],
  [/^(.+) toma la mini-pila \((\d+) cartas\)\.(.*)$/, '$1 takes the mini-pile ($2 cards).$3'],
  [/^(.+) jugó ⬌ Comodín de Enlace\. ¡Modo Eco! Si (.+) juega \+2 o \+4 contra (.+), (.+) también sacará esas cartas\. Color: (.+)\.$/, '$1 played ⬌ Link Wild. Echo mode! If $2 plays +2 or +4 against $3, $4 draws those cards too. Colour: $5.'],
  [/^(.+) jugó ⬌ Comodín de Enlace\. ¡(.+) y (.+) están enlazados! Color: (.+)\.$/, '$1 played ⬌ Link Wild. $2 and $3 are linked! Colour: $4.'],
  [/^(.+) jugó Comodín \+4 y eligió (.+)\. (.+) puede aceptar o desafiar\.$/, '$1 played Wild +4 and chose $2. $3 can accept or challenge.'],
  [/^(.+) aceptó el Comodín \+4 y sacó 4 cartas\.(.*)$/, '$1 accepted the Wild +4 and drew 4 cards.$2'],
  [/^¡Eco! (.+) también saca (\d+)\.$/, 'Echo! $1 also draws $2.'],
  [/^(.+) no tenía ninguna carta jugable\. El Comodín \+4 era válido\. (.+) saca 6 cartas y pierde su turno\.$/, '$1 had no playable card. The Wild +4 was valid. $2 draws 6 cards and loses their turn.'],
  [/^(.+) desafió el Comodín \+4\. (.+) sí tenía cartas que podía poner\. El Comodín \+4 no era válido\. (.+) saca 4\.$/, '$1 challenged the Wild +4. $2 did have cards to play. The Wild +4 was not valid. $3 draws 4.'],
  [/^(.+) sí tenía cartas que podía poner\. El Comodín \+4 no era válido\. (.+) saca 4\.$/, '$1 did have cards to play. The Wild +4 was not valid. $2 draws 4.'],
  [/^⚡ (.+) jugó fuera de turno: (.+)!$/, '⚡ $1 played out of turn: $2!'],
  [/^(.+) jugó Comodín y eligió (.+)\.$/, '$1 played a Wild and chose $2.'],
  [/^(.+) eligió el color (.+)\.$/, '$1 chose $2.'],
  [/^(.+) pierde su turno \(reversa\)\.$/, '$1 loses their turn (reverse).'],
  [/^(.+) pierde su turno \(enlazado\)\.$/, '$1 loses their turn (linked).'],
  [/^(.+) pierde su turno\.$/, '$1 loses their turn.'],
  [/^¡Dirección invertida!$/, 'Direction reversed!'],
  [/^(.+) saca 2 y pierde su turno\.$/, '$1 draws 2 and loses their turn.'],
  [/^(.+) sacó una carta y pasó\.$/, '$1 drew a card and passed.'],
  [/^(.+) salió de la partida\.$/, '$1 left the game.'],
  [/^¡(.+) gana por ser el último jugador!$/, '$1 wins as the last player left!'],
  [/^(.+) retiró su voto para terminar\.$/, '$1 withdrew their vote to end.'],
  [/^(.+) propone terminar \((\d+)\/(\d+)\)\.$/, '$1 wants to end the game ($2/$3).'],
  [/^⏰ (.+) se quedó sin tiempo: robó una carta y pasó\.$/, '⏰ $1 ran out of time: drew a card and passed.'],
  [/^(.+) jugó (.+)\.$/, '$1 played $2.']   // the general one goes last
];
// Words inside a line (after the sentence itself was translated)
const LOG_WORDS_EN = [
  [/ ([^.]+?) también saca (\d+) \(enlazados\)\./g, ' $1 also draws $2 (linked).'],
  [/ ¡Eco! ([^.]+?) también saca (\d+)\./g, ' Echo! $1 also draws $2.'],
  [/ El color que continúa es /g, ' The colour carries on as '],
  [/Comodín Pila Salvaje/g, 'Wild Pile'], [/Comodín Pila/g, 'Wild Pile'],
  [/Comodín Unión/g, 'Link Wild'], [/Comodín de Enlace/g, 'Link Wild'],
  [/Comodín/g, 'Wild'],
  [/(?<!\p{L})Rojo(?!\p{L})/gu, 'Red'], [/(?<!\p{L})Amarillo(?!\p{L})/gu, 'Yellow'],
  [/(?<!\p{L})Verde(?!\p{L})/gu, 'Green'], [/(?<!\p{L})Azul(?!\p{L})/gu, 'Blue']
];
function translateLog(msg) {
  if (LANG !== 'en' || typeof msg !== 'string') return msg;
  let out = msg;
  for (const [re, rep] of LOG_EN) { if (re.test(out)) { out = out.replace(re, rep); break; } }
  for (const [re, rep] of LOG_WORDS_EN) out = out.replace(re, rep);
  return out;
}

// ---- Fixed text in index.html (its Spanish is written in the page) ----
addEnglish({
  'land.tagline':  'The UNO party with special cards!',
  'land.howTitle': 'How to play',
  'land.how1':     'Play cards that match the top card\'s <strong>colour, number or symbol</strong>. If you can\'t, draw a card from the deck. When you have one card left, shout <strong>UNO!</strong>',
  'land.how2':     'UNO Fiesta has special cards that make the game more unpredictable:',
  'land.how3':     '<li><strong>Draw Two, Reverse, Skip and Wild</strong>: the usual UNO cards; draw 2 and lose a turn, change direction, skip the next turn, or pick a colour.</li><li><strong>Speed plays</strong>: if you have a number card of the same number and colour, you can play it out of turn.</li><li><strong>Wild +4</strong>: only playable if you have no other valid card. The target can challenge it.</li><li><strong>Point & Take</strong>: everyone points at a player, who draws a card for each point.</li><li><strong>Wild Pile</strong>: starts a surprise mini-pile the next players must follow.</li><li><strong>Link Wild</strong>: links two players so they draw together.</li>',
  'land.how4':     'The first to run out of cards wins. To play with points, add up the cards left in your opponents\' hands at the end of each round.',
  'land.allRules': 'See all the rules →',
  'land.emoji': 'Pick an emoji', 'land.name': 'Your name', 'land.create': 'Create room', 'land.joinCode': 'Join with a code',
  'land.codePh': 'Room code (e.g. XK7M2P)', 'land.join': 'Join', 'land.players': 'Up to 10 players · No account needed',
  'lob.title': 'Waiting room', 'lob.code': 'Code:', 'lob.waitHost': 'Waiting for the host…', 'lob.leave': 'Leave room',
  'lob.share': 'Share the code with friends so they can join',
  'g.copyCode': 'Copy code', 'g.rules': 'Rules', 'g.chat': 'Chat', 'g.drawPile': 'Draw', 'g.discardPile': 'Discard',
  'g.pass': 'Pass turn', 'g.playCard': 'Play card',
  'w.again': 'Play again', 'w.other': 'Join another room', 'chat.ph': 'Message…',
  'mp.title': 'Background music?', 'mp.desc': 'Adds some atmosphere to the game', 'mp.yes': 'Yes, with music', 'mp.no': 'No music',
  'pt.title': '☝️ Point & Take!', 'pt.sub': 'Point at someone — whoever gets pointed at draws cards',
  'pu.take': 'Take the mini-pile',
  'dt.title': '⬌ Link Wild — pick 2 players to link', 'dt.echo': 'Echo mode! If your rival plays a +2 or +4 on you, they draw the same cards too.',
  'dt.color': 'Pick the colour:', 'dt.ok': 'Link',
  'rules.title': '📖 UNO Fiesta rules',
  'rules.goalT': 'Goal', 'rules.goal': 'Be the first to run out of cards. Each card must match the top card\'s <strong>colour</strong> or <strong>number/symbol</strong>, or be a wild.',
  'rules.basicT': 'Usual cards', 'rules.basic': '<strong>+2</strong> the next player draws 2 and loses their turn · <strong>⊘</strong> skip · <strong>⇄</strong> reverse (with 2 players it works like a skip) · <strong>Wild</strong> pick a colour.',
  'rules.w4T': 'Wild +4', 'rules.w4': 'Only allowed if you have no card of the current colour. The target picks: <strong>accept</strong> (draws 4) or <strong>challenge</strong>. If the player had a card of that colour, they draw 4; if not, the challenger draws 6 and loses their turn.',
  'rules.ptT': '☝️ Point & Take', 'rules.pt': 'Everyone points at a player. Each player draws one card for every time they were pointed at (5 at most).',
  'rules.puT': '📚 Wild Pile', 'rules.pu': 'Starts a mini-pile of one colour. Whoever holds it must play a card of that colour on it — or take the whole pile.',
  'rules.dtT': '🔗 Link Wild', 'rules.dt': 'Links two players: when one draws cards, the other draws the same number. With 2 players it becomes <strong>Echo</strong>: a +2/+4 played against you comes back to the player who played it. Point & Take breaks a link.',
  'rules.speedT': '⚡ Speed play', 'rules.speed': 'A number card with exactly the same colour and number as the top card can be played even when it isn\'t your turn.',
  'rules.unoT': 'UNO!', 'rules.uno': 'When you have one card left, shout <strong>UNO!</strong>. If someone calls it on you first, you draw 2.',
  'rules.hereT': 'How to play here', 'rules.here': 'On your turn each card shows <strong>✓</strong> if you can play it and <strong>✕</strong> if not. Hold a card to see it bigger with its rule. Tap another player to throw something at them.',
  'rules.ok': 'Got it'
});

// ---- Effects / spotlight captions (fx.js) ----
addStrings({
  'fx.played':    ['{name} juega', '{name} plays'],
  'fx.speed':     ['⚡ ¡Fuera de turno!', '⚡ Out of turn!'],
  'fx.w4Won':     ['¡DESAFÍO GANADO!', 'CHALLENGE WON!'],
  'fx.w4WonSub':  ['{name} sí tenía otra carta: roba 4', '{name} had another card: draws 4'],
  'fx.w4Valid':   ['¡ERA VÁLIDO!', 'IT WAS VALID!'],
  'fx.w4ValidSub':['{name} roba 6 y pierde el turno', '{name} draws 6 and loses the turn'],
  'fx.w4Played':  ['Comodín +4', 'Wild +4'],
  'fx.w4Sub':     ['{name}: ¿aceptar o desafiar?', '{name}: accept or challenge?'],
  'fx.point':     ['☝️ ¡Todos apuntan!', '☝️ Everyone points!'],
  'fx.pile':      ['📚 ¡Pila Salvaje!', '📚 Wild Pile!'],
  'fx.pileTake':  ['{name} se lleva la pila', '{name} takes the pile'],
  'fx.link':      ['🔗 ¡Enlazados!', '🔗 Linked!'],
  'fx.echo':      ['⚡ ¡Modo Eco!', '⚡ Echo mode!'],
  'fx.reverse':   ['¡Cambio de sentido!', 'Direction reversed!'],
  'fx.uno':       ['¡UNO!', 'UNO!'],
  'fx.caught':    ['¡Pillado!', 'Caught!']
});
