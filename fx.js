// ============================================================
// FX — sounds, vibration and on-screen effects (UNO Fiesta)
//
//   R1  cards fly: every play (read from what left the player's hand), draws, penalties
//   B1  "what just happened": other players' plays stop in the middle with a caption
//   R3  big moments: Wild +4 challenge stamps, ☝️ Apunta y Toma, 📚 Pila Salvaje,
//       🔗 Enlace / ⚡ Eco, reverse, skip, wild colour, ¡UNO!
//   R4  short synth sound effects (separate switch from the music)
//   R5  phone vibration when something happens to you
//   Y4  calm mode: no flying or particles, only fades (follows "reduce motion")
//
// Effects are worked out by comparing each new room state with the previous one
// (onState), so every way of moving — players and bots — is covered without touching
// the rules code in app.js. Nothing here writes to Firestore.
// ============================================================

const FX = (() => {

  // ---------- Preferences (saved per device) ----------
  const PREF_KEY = 'fiestaFxPrefs';
  const reduceMotion = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const prefs = Object.assign(
    { sfx: true, vol: 0.7, vibrate: true, calm: reduceMotion, colorblind: false },
    readPrefs()
  );
  function readPrefs() {
    try { return JSON.parse(localStorage.getItem(PREF_KEY) || '{}'); } catch (_) { return {}; }
  }
  function setPref(key, value) {
    prefs[key] = value;
    try { localStorage.setItem(PREF_KEY, JSON.stringify(prefs)); } catch (_) {}
    applyBodyClasses();
  }
  function applyBodyClasses() {
    document.body?.classList.toggle('calm', !!prefs.calm);
    document.body?.classList.toggle('colorblind', !!prefs.colorblind);
  }
  applyBodyClasses();

  // ---------- Sound (Web Audio synth, no files to download) ----------
  let ctx = null, master = null, noiseBuf = null;
  function audio() {
    if (!prefs.sfx) return null;
    try {
      if (!ctx) {
        ctx = new (window.AudioContext || window.webkitAudioContext)();
        master = ctx.createGain();
        master.connect(ctx.destination);
      }
      master.gain.value = Math.max(0, Math.min(1, prefs.vol)) * 0.9;
      if (ctx.state === 'suspended') ctx.resume();
      return ctx;
    } catch (_) { return null; }
  }
  function tone(type, f1, f2, dur, vol, delay = 0) {
    const c = audio(); if (!c) return;
    const t0 = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t0);
    if (f2 !== f1) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(master);
    o.start(t0); o.stop(t0 + dur + 0.03);
  }
  function noise(dur, vol, freq, delay = 0, q = 1, type = 'bandpass') {
    const c = audio(); if (!c) return;
    if (!noiseBuf) {
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    const t0 = c.currentTime + delay;
    const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuf;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    s.connect(f); f.connect(g); g.connect(master);
    s.start(t0); s.stop(t0 + dur + 0.02);
  }
  const SOUNDS = {
    play:     () => noise(.12, .25, 2600, 0, .8),
    draw:     () => noise(.08, .18, 3400, 0, 1.2),
    speed:    () => { tone('sawtooth', 400, 1600, .18, .14); noise(.15, .2, 5000, 0, 1.5, 'highpass'); },
    buzzer:   () => { tone('square', 140, 90, .45, .16); tone('sawtooth', 145, 92, .45, .1); },
    truth:    () => [523, 659, 784].forEach((f, i) => tone('triangle', f, f, .25, .2, i * .09)),
    suspense: () => { for (let i = 0; i < 3; i++) tone('sine', 330 + i * 40, 330 + i * 40, .14, .1, i * .16); },
    wild:     () => [392, 494, 587, 784].forEach((f, i) => tone('sine', f, f, .2, .18, i * .07)),
    point:    () => { tone('triangle', 880, 660, .12, .18); tone('triangle', 660, 880, .12, .18, .12); },
    pile:     () => [262, 330, 392, 523].forEach((f, i) => tone('square', f, f, .1, .08, i * .06)),
    link:     () => { tone('sine', 523, 523, .2, .18); tone('sine', 784, 784, .3, .16, .08); },
    reverse:  () => { tone('sine', 300, 900, .18, .18); tone('sine', 900, 300, .18, .18, .18); },
    skip:     () => { tone('square', 700, 700, .08, .1); tone('square', 450, 450, .12, .1, .1); },
    uno:      () => { tone('triangle', 784, 784, .14, .25); tone('triangle', 1047, 1047, .3, .25, .14); },
    turn:     () => { tone('sine', 660, 660, .18, .22); tone('sine', 990, 990, .3, .2, .14); },
    danger:   () => { tone('sine', 70, 55, .18, .6); tone('sine', 70, 55, .18, .5, .24); },
    win:      () => [523, 659, 784, 1047].forEach((f, i) => tone('triangle', f, f, i === 3 ? .6 : .18, .22, i * .13)),
    lose:     () => [392, 330, 262].forEach((f, i) => tone('triangle', f, f, .3, .18, i * .2)),
    pop:      () => tone('sine', 500, 900, .08, .22),
    tick:     () => tone('square', 1200, 1200, .03, .06),
    select:   () => tone('triangle', 700, 900, .06, .12)
  };
  function play(name) {
    if (!prefs.sfx) return;
    try { SOUNDS[name]?.(); } catch (_) {}
  }

  // ---------- Vibration (Android; iPhone ignores it) ----------
  function buzz(pattern) {
    if (!prefs.vibrate || !navigator.vibrate) return;
    try { navigator.vibrate(pattern); } catch (_) {}
  }

  // ---------- On-screen layer + small helpers ----------
  function layer() {
    let l = document.getElementById('fx-layer');
    if (!l) {
      l = document.createElement('div');
      l.id = 'fx-layer';
      l.setAttribute('aria-hidden', 'true');
      document.body.appendChild(l);
    }
    return l;
  }
  const sleep  = ms => new Promise(r => setTimeout(r, ms));
  const mid    = r => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  const motion = () => !prefs.calm;
  const HEX = { red: '#C81515', yellow: '#D4A800', green: '#189A20', blue: '#1040B8' };
  const ALL = ['#C81515', '#D4A800', '#189A20', '#1040B8', '#ffffff'];
  const colorsFor = c => HEX[c] ? [HEX[c], '#ffffff'] : ALL;

  function burst(rect, colors, n = 14, dist = 70, shape = 'dot') {
    if (!rect || !motion()) return;
    const c = mid(rect);
    for (let i = 0; i < n; i++) {
      const s = document.createElement('span');
      s.className = `fx-p fx-${shape}`;
      s.style.left = c.x + 'px';
      s.style.top  = c.y + 'px';
      s.style.background = colors[i % colors.length];
      s.style.color = colors[i % colors.length];
      layer().appendChild(s);
      const a = Math.random() * Math.PI * 2, d = dist * (.5 + Math.random() * .7);
      s.animate([
        { transform: 'translate(-50%,-50%) scale(1)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(a) * d}px), calc(-50% + ${Math.sin(a) * d + (shape === 'shard' ? 30 : 0)}px)) scale(.3) rotate(${Math.random() * 540}deg)`, opacity: 0 }
      ], { duration: 600 + Math.random() * 350, easing: 'cubic-bezier(.2,.7,.3,1)' }).onfinish = () => s.remove();
    }
  }
  function ring(rect, color, grow = 2.2, width = 3) {
    if (!rect || !motion()) return;
    const c = mid(rect), size = Math.max(rect.width, rect.height);
    const el = document.createElement('div');
    el.className = 'fx-ring';
    Object.assign(el.style, { left: c.x - size / 2 + 'px', top: c.y - size / 2 + 'px', width: size + 'px', height: size + 'px', borderColor: color, borderWidth: width + 'px' });
    layer().appendChild(el);
    el.animate([{ transform: 'scale(.6)', opacity: 1 }, { transform: `scale(${grow})`, opacity: 0 }], { duration: 700, easing: 'ease-out' }).onfinish = () => el.remove();
  }
  function popIcon(rect, html, size = 2.2, cls = '') {
    if (!rect) return;
    const c = mid(rect);
    const el = document.createElement('div');
    el.className = 'fx-icon ' + cls;
    el.innerHTML = html;
    el.style.left = c.x + 'px';
    el.style.top  = c.y + 'px';
    el.style.fontSize = size + 'rem';
    layer().appendChild(el);
    const frames = motion()
      ? [{ transform: 'translate(-50%,-50%) scale(.3)', opacity: 0 },
         { transform: 'translate(-50%,-90%) scale(1.15)', opacity: 1, offset: .3 },
         { transform: 'translate(-50%,-120%) scale(1)', opacity: 0 }]
      : [{ transform: 'translate(-50%,-50%)', opacity: 0 }, { transform: 'translate(-50%,-50%)', opacity: 1, offset: .3 }, { transform: 'translate(-50%,-50%)', opacity: 0 }];
    el.animate(frames, { duration: 1200, easing: 'ease-out' }).onfinish = () => el.remove();
  }
  function shake(el) {
    if (!el || !motion()) return;
    el.animate([
      { transform: 'translateX(0)' }, { transform: 'translateX(-7px) rotate(-3deg)' },
      { transform: 'translateX(6px) rotate(2deg)' }, { transform: 'translateX(-4px)' }, { transform: 'translateX(0)' }
    ], { duration: 420 });
  }
  function spin(el) {
    if (!el || !motion()) return;
    el.animate([{ transform: 'rotate(0)' }, { transform: 'rotate(360deg)' }], { duration: 650, easing: 'ease-in-out' });
  }
  function showCaption(title, line, y) {
    const cap = document.createElement('div');
    cap.className = 'fx-caption';
    cap.innerHTML = `<b>${esc(title)}</b>${line ? `<span>${line}</span>` : ''}`;
    cap.style.top = y + 'px';
    layer().appendChild(cap);
    return cap;
  }
  async function captionFor(title, line, ms = 900) {
    const c = showCaption(title, line, (pileRect()?.bottom || innerHeight * .45) + 10);
    await sleep(ms);
    c.remove();
  }

  // Big rubber stamp over the table (Wild +4 challenge result)
  async function stamp(text, sub, kind) {
    const el = document.createElement('div');
    el.className = `fx-stamp fx-stamp-${kind}`;
    el.innerHTML = `<b>${esc(text)}</b>${sub ? `<span>${sub}</span>` : ''}`;
    const r = document.getElementById('top-card')?.getBoundingClientRect();
    el.style.top = (r ? r.top + r.height / 2 : innerHeight * .4) + 'px';
    layer().appendChild(el);
    const frames = motion()
      ? [{ transform: 'translate(-50%,-50%) rotate(-12deg) scale(2.6)', opacity: 0 },
         { transform: 'translate(-50%,-50%) rotate(-8deg) scale(1)', opacity: 1, offset: .14 },
         { transform: 'translate(-50%,-50%) rotate(-8deg) scale(1)', opacity: 1, offset: .85 },
         { transform: 'translate(-50%,-50%) rotate(-8deg) scale(1.05)', opacity: 0 }]
      : [{ transform: 'translate(-50%,-50%) rotate(-8deg)', opacity: 0 }, { transform: 'translate(-50%,-50%) rotate(-8deg)', opacity: 1, offset: .12 },
         { transform: 'translate(-50%,-50%) rotate(-8deg)', opacity: 1, offset: .85 }, { transform: 'translate(-50%,-50%) rotate(-8deg)', opacity: 0 }];
    try { await el.animate(frames, { duration: 1700, easing: 'cubic-bezier(.2,.8,.3,1)' }).finished; } catch (_) {}
    el.remove();
  }

  // A wide banner across the middle of the screen (B2 "Tu turno", B3 danger)
  async function banner(title, sub, kind = 'turn', hold = 1100) {
    const el = document.createElement('div');
    el.className = `fx-banner fx-banner-${kind}`;
    el.innerHTML = `<b>${esc(title)}</b>${sub ? `<span>${esc(sub)}</span>` : ''}`;
    layer().appendChild(el);
    const frames = motion()
      ? [{ transform: 'translate(-120vw,-50%) skewX(-12deg)' }, { transform: 'translate(-50%,-50%) skewX(-6deg)', offset: .18 },
         { transform: 'translate(-50%,-50%) skewX(-6deg)', offset: .82 }, { transform: 'translate(120vw,-50%) skewX(-12deg)' }]
      : [{ transform: 'translate(-50%,-50%)', opacity: 0 }, { transform: 'translate(-50%,-50%)', opacity: 1, offset: .15 },
         { transform: 'translate(-50%,-50%)', opacity: 1, offset: .85 }, { transform: 'translate(-50%,-50%)', opacity: 0 }];
    try { await el.animate(frames, { duration: hold + 500, easing: 'cubic-bezier(.3,.8,.3,1)' }).finished; } catch (_) {}
    el.remove();
  }

  // ---------- Flying cards ----------
  const CARD_W = 60, CARD_H = 90;
  const place = (p, s, rot = 0) => `translate(${p.x - CARD_W / 2}px, ${p.y - CARD_H / 2}px) scale(${s}) rotate(${rot}deg)`;
  const fitScale = r => Math.max(.25, Math.min(1.1, r.height / CARD_H));

  async function flyCard(html, from, to, stop) {
    if (!from || !to) return;
    const el = document.createElement('div');
    el.className = 'fx-fly';
    el.innerHTML = html;
    layer().appendChild(el);
    const a = mid(from), b = mid(to);
    try {
      if (stop) {
        const c = { x: innerWidth / 2, y: innerHeight * .4 };
        await el.animate([{ transform: place(a, fitScale(from), -8), opacity: .5 }, { transform: place(c, 1.7, 0), opacity: 1 }],
          { duration: 400, easing: 'cubic-bezier(.16,1,.3,1)', fill: 'forwards' }).finished;
        // caption above the card, so it never covers the buttons below
        const cap = showCaption(stop.title, stop.line, Math.max(8, c.y - CARD_H * .85 - 62));
        await sleep(stop.hold);
        cap.remove();
        await el.animate([{ transform: place(c, 1.7, 0) }, { transform: place(b, fitScale(to), 4), opacity: .95 }],
          { duration: 330, easing: 'cubic-bezier(.5,0,.8,.4)', fill: 'forwards' }).finished;
      } else {
        // new look (step 7): a higher arc, the card grows a little and turns on the way
        const top = { x: (a.x + b.x) / 2, y: Math.min(a.y, b.y) - 80 };
        await el.animate([{ transform: place(a, fitScale(from), 0) }, { transform: place(top, 1.15, -12), offset: .5 },
          { transform: place(b, fitScale(to), 4), opacity: .95 }], { duration: 480, easing: 'cubic-bezier(.3,.7,.3,1)', fill: 'forwards' }).finished;
      }
    } catch (_) {}
    el.remove();
  }
  async function staticSpot(html, title, line, hold) {
    const el = document.createElement('div');
    el.className = 'fx-fly';
    el.innerHTML = html;
    const c = { x: innerWidth / 2, y: innerHeight * .4 };
    el.style.transform = place(c, 1.5, 0);
    layer().appendChild(el);
    const cap = showCaption(title, line, Math.max(8, c.y - CARD_H * .8 - 62));
    try { await el.animate([{ opacity: 0 }, { opacity: 1, offset: .15 }, { opacity: 1, offset: .85 }, { opacity: 0 }], { duration: hold + 300 }).finished; } catch (_) {}
    el.remove(); cap.remove();
  }

  // ---------- Where things are on screen ----------
  const seatEl = pid => pid === localUid ? document.getElementById('player-hand')
                      : document.querySelector(`.opponent[data-uid="${CSS.escape(pid || '')}"]`);
  const seatRect = pid => seatEl(pid)?.getBoundingClientRect() || null;
  const pileRect = () => document.getElementById('top-card')?.getBoundingClientRect() || null;
  const deckRect = () => document.querySelector('#draw-pile-area .card-back')?.getBoundingClientRect() || null;
  const backHTML = () => '<div class="card-back fly-back"><span class="back-uno">UNO</span><span class="back-party">FIESTA</span></div>';

  // My hand cards, measured just before I play (app.js calls noteHand in selectCard)
  let handRects = {};
  function noteHand() {
    handRects = {};
    document.querySelectorAll('#player-hand .card[data-index]').forEach(el => {
      handRects[el.dataset.index] = el.getBoundingClientRect();
    });
  }

  // ---------- Moods for the faces on each seat (R2, drawn in extras.js) ----------
  const moods = {};
  function setMood(pid, mood, ms = 4500) {
    if (!pid) return;
    moods[pid] = { mood, until: Date.now() + ms };
    redrawSeats();
    setTimeout(redrawSeats, ms + 50);
  }
  function moodOf(pid) {
    const m = moods[pid];
    return m && m.until > Date.now() ? m.mood : null;
  }
  function redrawSeats() {
    if (roomState?.status === 'playing' && typeof renderOpponents === 'function') renderOpponents(roomState);
  }

  // ---------- Reading what happened ----------
  const cardName = c => !c ? '?' : WILDS.includes(c.value) ? t('card.' + c.value)
                      : c.value === 'pointTaken' ? `${t('color.' + c.color)} ☝️`
                      : `${t('color.' + c.color)} ${VALUE_LABEL[c.value] ?? c.value}`;
  const cardColorHTML = c => {
    const hex = HEX[c?.color];
    return hex ? `<span style="color:${hex === HEX.blue ? '#6f9bff' : hex};font-weight:800">${esc(cardName(c))}</span>` : esc(cardName(c));
  };

  function newEntries(a = [], b = []) {
    if (!a.length) return b.slice(-3);
    const last = a[a.length - 1], before = a[a.length - 2];
    for (let i = b.length - 1; i >= 0; i--) {
      if (b[i] === last && (before === undefined || i === 0 || b[i - 1] === before)) return b.slice(i + 1);
    }
    return b.slice(-3);
  }
  function namesIn(line, state) {
    return (state.players || [])
      .map(p => ({ id: p.id, at: line.indexOf(p.name) }))
      .filter(x => x.at >= 0)
      .sort((x, y) => x.at - y.at)
      .map(x => x.id);
  }
  const key = c => `${c.color}|${c.value}`;
  // Cards that left / arrived in a hand (as lists)
  function handDiff(prevHand = [], curHand = []) {
    const left = [...curHand];
    const removed = [];
    for (const c of prevHand) {
      const i = left.findIndex(x => key(x) === key(c));
      if (i >= 0) left.splice(i, 1); else removed.push(c);
    }
    return { removed, added: left };
  }
  function removedIndex(prevHand = [], curHand = []) {
    const same = (x, y) => x && y && key(x) === key(y);
    for (let i = 0; i < prevHand.length; i++) if (!same(prevHand[i], curHand[i])) return i;
    return prevHand.length - 1;
  }

  // Called by renderGame() with the previous and the new room state
  function onState(prev, cur) {
    if (!prev || !cur || document.hidden) return;
    if (prev.status !== 'playing' || !['playing', 'ended'].includes(cur.status)) return;
    const logs = newEntries(prev.log, cur.log);
    const has = re => logs.find(l => re.test(l));
    const ev = [];

    // Plays: a hand lost exactly one card and gained none
    const speedLine = has(/jugó fuera de turno/);
    for (const p of cur.players) {
      const { removed, added } = handDiff(prev.hands?.[p.id], cur.hands?.[p.id]);
      if (removed.length === 1 && added.length === 0) {
        const card = { ...removed[0] };
        ev.push({ type: 'play', pid: p.id, card, speed: !!speedLine && namesIn(speedLine, cur)[0] === p.id,
                  idx: p.id === localUid ? removedIndex(prev.hands?.[p.id], cur.hands?.[p.id]) : null });
      }
    }
    if (has(/eligió el color|jugó Comodín y eligió|Comodín \+4 y eligió|Color: /)) ev.push({ type: 'color', color: cur.topColor });
    if ((prev.direction ?? 1) !== (cur.direction ?? 1)) ev.push({ type: 'reverse' });

    for (const l of logs) {
      if (/pierde su turno/.test(l)) ev.push({ type: 'skip', pid: namesIn(l, cur)[0] });
      if (/(grita|dice) ¡UNO!/.test(l)) ev.push({ type: 'uno', pid: namesIn(l, cur)[0] });
      if (/le gritó UNO a|atrapó a/.test(l)) ev.push({ type: 'unoCaught', pid: namesIn(l, cur)[1], by: namesIn(l, cur)[0] });
      if (/puede aceptar o desafiar/.test(l)) ev.push({ type: 'w4', target: cur.wild4Challenge?.targetName || '' });
      if (/El Comodín \+4 no era válido/.test(l)) ev.push({ type: 'w4Won', chooser: prev.wild4Challenge?.chooserId, target: prev.wild4Challenge?.targetId, name: prev.wild4Challenge?.chooserName });
      if (/El Comodín \+4 era válido/.test(l)) ev.push({ type: 'w4Valid', chooser: prev.wild4Challenge?.chooserId, target: prev.wild4Challenge?.targetId, name: prev.wild4Challenge?.targetName });
      if (/aceptó el Comodín \+4/.test(l)) ev.push({ type: 'w4Accept', target: prev.wild4Challenge?.targetId });
      if (/Carta Apunta y Toma/.test(l)) ev.push({ type: 'point' });
      if (/fue apuntado/.test(l)) ev.push({ type: 'pointed', pid: namesIn(l, cur)[0] });
      if (/Mini-pila con/.test(l)) ev.push({ type: 'pile' });
      if (/toma la mini-pila/.test(l)) ev.push({ type: 'pileTake', pid: namesIn(l, cur)[0] });
      if (/están enlazados/.test(l)) ev.push({ type: 'link', pids: cur.linkedPlayers || [] });
      if (/Modo Eco/.test(l)) ev.push({ type: 'echo' });
      if (/¡Eco!/.test(l)) ev.push({ type: 'echoHit', pid: namesIn(l.slice(l.indexOf('¡Eco!')), cur)[0] });
    }
    // Cards drawn (penalties, draws, +2/+4, pile, pointed at)
    for (const p of cur.players) {
      const before = prev.players.find(x => x.id === p.id)?.cardCount;
      if (before != null && p.cardCount > before) ev.push({ type: 'draw', pid: p.id, n: p.cardCount - before });
    }
    for (const e of ev) enqueue(() => run(e, cur));
    if (typeof onFxEvents === 'function') onFxEvents(ev, prev, cur);   // extras.js: stats
  }

  const nameOf = (state, pid) => state.players.find(p => p.id === pid)?.name || '?';

  async function run(e, state) {
    const rush = pending > 1;
    switch (e.type) {
      case 'play': {
        const mine = e.pid === localUid;
        const shown = WILDS.includes(e.card.value) ? { ...e.card, color: 'black' } : e.card;
        const html = buildCardHTML(shown);
        const from = mine ? (handRects[e.idx] || seatRect(localUid)) : seatRect(e.pid);
        play(e.speed ? 'speed' : 'play');
        if (e.speed) { setMood(e.pid, 'smug', 3000); popIcon(seatRect(e.pid), '⚡', 2.2); }
        const title = e.speed ? t('fx.speed') : t('fx.played', { name: nameOf(state, e.pid) });
        const line = e.speed ? `${esc(nameOf(state, e.pid))} · ${cardColorHTML(e.card)}` : cardColorHTML(e.card);
        if (!motion()) { if (!mine && !rush) await staticSpot(html, title, line, 700); break; }
        await flyCard(html, from, pileRect(), (mine && !e.speed) || rush ? null : { title, line, hold: 650 });
        ring(pileRect(), HEX[e.card.color] || '#fff', 1.7);
        // new look: the pile gives a small bounce as the card lands
        document.getElementById('top-card')?.animate([{ transform: 'scale(1.1) rotate(-3deg)' }, { transform: 'scale(1) rotate(0)' }], { duration: 220, easing: 'ease-out' });
        break;
      }
      case 'color':
        play('wild');
        ring(pileRect(), HEX[e.color] || '#fff', 2.4, 5);
        burst(pileRect(), colorsFor(e.color), 16, 80);
        break;
      case 'reverse':
        play('reverse');
        spin(document.getElementById('direction-indicator'));
        popIcon(pileRect(), '⇄', 3);
        if (!rush) await captionFor(t('fx.reverse'), '', 800);
        break;
      case 'skip':
        play('skip');
        setMood(e.pid, 'annoyed', 3000);
        popIcon(seatRect(e.pid), '⊘', 2.4, 'fx-skip');
        if (e.pid === localUid) buzz(50);
        break;
      case 'uno':
        play('uno');
        popIcon(seatRect(e.pid), `<span class="fx-uno-word">${esc(t('fx.uno'))}</span>`, 2);
        // new look (look.js): big ¡UNO! over the table with confetti
        if (typeof lookUnoBurst === 'function') lookUnoBurst(pileRect());
        break;
      case 'unoCaught':
        play('buzzer');
        setMood(e.pid, 'caught', 4000); setMood(e.by, 'smug', 4000);
        popIcon(seatRect(e.pid), '🚨', 2.2);
        shake(seatEl(e.pid));
        if (e.pid === localUid) buzz([80, 40, 80]);
        break;
      case 'w4':
        play('suspense');
        if (!rush) await captionFor(t('fx.w4Played'), esc(t('fx.w4Sub', { name: e.target })), 1000);
        break;
      case 'w4Won':
        play('buzzer');
        setMood(e.chooser, 'caught', 5000); setMood(e.target, 'smug', 5000);
        if (e.chooser === localUid) buzz([120, 60, 220]);
        shake(seatEl(e.chooser));
        burst(pileRect(), ['#ff3b3b', '#ffffff', '#7a0000'], 18, 90, 'shard');
        await stamp(t('fx.w4Won'), esc(t('fx.w4WonSub', { name: e.name || '?' })), 'liar');
        break;
      case 'w4Valid':
        play('truth');
        setMood(e.chooser, 'smug', 5000); setMood(e.target, 'oops', 5000);
        if (e.target === localUid) buzz(100);
        shake(seatEl(e.target));
        burst(pileRect(), ['#4ade80', '#ffffff', '#ffd54a'], 16, 80, 'spark');
        await stamp(t('fx.w4Valid'), esc(t('fx.w4ValidSub', { name: e.name || '?' })), 'truth');
        break;
      case 'w4Accept':
        setMood(e.target, 'worried', 3500);
        break;
      case 'point':
        play('point');
        if (!rush) await captionFor(t('fx.point'), '', 900);
        break;
      case 'pointed':
        play('point');
        setMood(e.pid, 'annoyed', 3500);
        popIcon(seatRect(e.pid), '☝️', 2.4);
        shake(seatEl(e.pid));
        break;
      case 'pile':
        play('pile');
        popIcon(pileRect(), '📚', 3);
        if (!rush) await captionFor(t('fx.pile'), '', 900);
        break;
      case 'pileTake':
        play('buzzer');
        setMood(e.pid, 'worried', 4500);
        if (!rush) await captionFor(t('fx.pileTake', { name: nameOf(state, e.pid) }), '', 900);
        break;
      case 'link':
        play('link');
        for (const pid of e.pids) { popIcon(seatRect(pid), '🔗', 2.2); ring(seatRect(pid), '#b388ff', 1.6); }
        if (!rush) await captionFor(t('fx.link'), e.pids.map(pid => esc(nameOf(state, pid))).join(' + '), 900);
        break;
      case 'echo':
        play('link');
        if (!rush) await captionFor(t('fx.echo'), '', 900);
        break;
      case 'echoHit':
        play('buzzer');
        popIcon(seatRect(e.pid), '⚡', 2.2);
        setMood(e.pid, 'oops', 3500);
        break;
      case 'draw': {
        const to = seatRect(e.pid), from = deckRect();
        const n = Math.min(e.n, 6);
        if (e.pid === localUid && e.n >= 2) buzz(60);
        if (e.n >= 2) popIcon(to, `+${e.n}`, 2, 'fx-plus');
        if (!motion()) { play('draw'); break; }
        await Promise.all(Array.from({ length: n }, (_, i) => sleep(i * 110).then(() => { play('draw'); return flyCard(backHTML(), from, to); })));
        break;
      }
    }
    await sleep(rush ? 80 : 180);
  }

  // ---------- Queue: one effect at a time, faster when several pile up ----------
  let queue = Promise.resolve();
  let pending = 0;
  function enqueue(fn) {
    pending++;
    queue = queue.then(fn).catch(e => console.warn('[fx]', e)).finally(() => { pending--; });
  }

  return { prefs, setPref, play, buzz, burst, ring, popIcon, shake, spin, stamp, banner, enqueue, onState,
           noteHand, setMood, moodOf, layer, sleep, motion, colorsFor, cardName, newEntries, namesIn };
})();
