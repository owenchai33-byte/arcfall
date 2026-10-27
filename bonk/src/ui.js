// ===== Bonk Royale: menus, deck builder, result screen, main loop =====
const UI = (() => {
  const root = document.getElementById('ui');
  let faces = {};            // card key -> data URL (face with name)
  let mode = 'pvp', decks = [null, null], picking = 0, menuBtn = null;
  const store = {
    get(k, d) { try { const v = localStorage.getItem('bonk_' + k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem('bonk_' + k, JSON.stringify(v)); } catch (e) { } },
  };
  const KEYS = Object.keys(CARDS);
  const validDeck = d => Array.isArray(d) && d.length === 8 && d.every(k => CARDS[k]) && new Set(d).size === 8;

  function makeFaces() {
    const w = 180, h = 216, c = mk(w * 2, h * 2), g = c.getContext('2d');
    for (const k of KEYS) {
      g.setTransform(2, 0, 0, 2, 0, 0); g.clearRect(0, 0, w, h);
      drawCardFace(g, k, 0, 0, w, h, { name: true });
      faces[k] = c.toDataURL('image/png');
    }
  }
  const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };
  function clear() { root.innerHTML = ''; if (menuBtn) { menuBtn.remove(); menuBtn = null; } }
  const isLand = () => window.innerWidth > window.innerHeight * 1.05;
  function toast(msg) { const t = el(`<div class="toast">${msg}</div>`); root.appendChild(t); setTimeout(() => t.remove(), 1600); }
  function tap(fn) { return e => { SFX.init(); SFX.tap(); fn(e); }; }

  // ---------- home ----------
  function home() {
    clear(); B = null; drags.clear();
    const s = el(`<div class="screen sky home ${isLand() ? 'land' : ''}">
      <div class="rays"></div>
      <img class="logo" src="${window.ASSETS.logo || ''}" alt="Bonk Royale">
      <div class="tag">Silly cards. Serious battles.</div>
      <div class="btns">
        <button class="btn gold" data-a="pvp">2 PLAYERS<small>one phone · side by side</small></button>
        <button class="btn" data-a="bot">VS BOT<small>practice against the computer</small></button>
        <button class="btn purple" data-a="cards">CARDS<small>all 18 cards and their stats</small></button>
      </div>
      <div class="hint">Turn the phone sideways to sit side by side. Hold it upright to play face to face.</div>
      <button class="btn grey sm corner" data-a="snd">${SFX.muted ? '🔇' : '🔊'}</button>
    </div>`);
    if (!window.ASSETS.logo) s.querySelector('.logo').replaceWith(el('<div class="logo textlogo"><span>BONK</span><span>ROYALE</span></div>'));
    // floating characters around the logo
    const fl = [['bigbaby', 4, 8, -6], ['hotdog', 70, 6, 5], ['ducky', 6, 62, 4], ['granny', 74, 60, -4], ['chompers', 40, 2, 3]];
    const land = isLand();
    fl.forEach(([k, x, y, r], i) => {
      if (land && (i === 4 || i === 2 || i === 3)) return;
      const im = el(`<img class="floater" src="${window.ASSETS[k]}" style="left:${x}%;top:${y}%;--r:${r}deg;animation-delay:${i * .4}s">`);
      if (!land && (i === 2 || i === 3)) im.style.top = (y + 22) + '%';
      s.appendChild(im);
    });
    s.addEventListener('click', tap(e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      const act = a.dataset.a;
      if (act === 'snd') { SFX.muted = !SFX.muted; a.textContent = SFX.muted ? '🔇' : '🔊'; return; }
      if (act === 'cards') return collection();
      mode = act; picking = 0;
      goFullscreen();
      deckBuilder(0);
    }));
    root.appendChild(s);
  }

  // ---------- card info ----------
  function info(k, action) {
    const c = CARDS[k];
    const st = [];
    const push = (a, b) => st.push(`<div class="stat"><span>${a}</span><b>${b}</b></div>`);
    push('Elixir', c.cost);
    if (c.type === 'spell') {
      push('Damage', c.dmg); push('Tower damage', c.towerDmg); push('Radius', c.radius + ' tiles');
      if (c.stun) push('Stun', c.stun + 's'); if (c.waves) push('Waves', c.waves);
    } else {
      push('Hitpoints', c.hp + (c.count > 1 ? ' ×' + c.count : ''));
      push('Damage', c.dmg); push('Hit speed', c.hs + 's'); push('DPS', Math.round(c.dmg / c.hs));
      push('Range', c.range <= 1.2 ? 'Melee' : c.range + ' tiles');
      push('Targets', { ground: 'Ground', all: 'Air & ground', buildings: 'Buildings' }[c.targets]);
      if (c.speed) push('Speed', { .75: 'Slow', 1: 'Medium', 1.5: 'Fast', 2: 'Very fast' }[c.speed] || c.speed);
      if (c.count > 1) push('Count', '×' + c.count);
      if (c.splash || c.spin) push('Splash', (c.splash || c.spin) + ' tiles');
      if (c.life) push('Lifetime', c.life + 's');
      if (c.air) push('Type', 'Flying');
      if (c.deathDmg) push('Death bomb', c.deathDmg);
    }
    const m = el(`<div class="modal ${isLand() ? 'land' : ''}"><div class="sheet">
      <div class="top"><img src="${faces[k]}"><div><h3>${c.name}</h3>
      <span class="pill ${c.rarity}">${c.rarity[0].toUpperCase() + c.rarity.slice(1)}</span><span class="pill">${c.type === 'spell' ? 'Spell' : c.type === 'building' ? 'Building' : 'Troop'}</span>
      <div class="desc" style="margin-top:8px">${c.desc}</div></div></div>
      <div class="stats">${st.join('')}</div>
      <div class="hint" style="text-align:left;margin-bottom:10px">Same stats and behaviour as the classic ${c.model}.</div>
      <div class="row">${action ? `<button class="btn sm ${action.cls}" data-act style="flex:1">${action.label}</button>` : ''}<button class="btn sm grey" style="flex:1">${action ? 'Close' : 'Got it'}</button></div></div></div>`);
    m.addEventListener('click', tap(e => {
      if (e.target.closest('[data-act]')) { m.remove(); action.fn(); return; }
      if (e.target === m || e.target.closest('button')) m.remove();
    }));
    if (action && action.rot) m.firstChild.style.transform = 'rotate(180deg)';
    root.appendChild(m);
  }

  function collection() {
    clear();
    const s = el(`<div class="screen deck ${isLand() ? 'land' : ''}"><h2>All cards</h2>
      <div class="hint">Every card copies a classic card's exact stats, just sillier.</div>
      <div class="pool"></div><div class="foot"><button class="btn grey" data-a="back">Back</button></div></div>`);
    const pool = s.querySelector('.pool');
    KEYS.forEach((k, i) => { const c = el(`<div class="card" data-k="${k}" style="animation-delay:${i * 20}ms"><img src="${faces[k]}"></div>`); pool.appendChild(c); });
    s.addEventListener('click', tap(e => {
      if (e.target.closest('[data-a=back]')) return home();
      const c = e.target.closest('.card'); if (c) info(c.dataset.k);
    }));
    root.appendChild(s);
  }

  // ---------- deck builder ----------
  function deckBuilder(p) {
    clear();
    const who = mode === 'bot' ? 'Your deck' : (p === 0 ? '<b style="color:#7fb6ff">Blue</b> player' : '<b style="color:#ff8a94">Red</b> player');
    let deck = store.get('deck' + p, null);
    if (!validDeck(deck)) deck = DEFAULT_DECKS[p].slice();
    const s = el(`<div class="screen deck ${isLand() ? 'land' : ''}">
      <h2>${who}: pick 8 cards</h2><div class="hint">Tap a card to see it and add or remove it.</div>
      <div class="chosen">${Array(8).fill('<div class="slot"></div>').join('')}</div>
      <div class="meta"><span class="avg"></span><span class="cnt"></span></div>
      <div class="pool"></div>
      <div class="foot"><button class="btn grey" data-a="back">Back</button><button class="btn purple" data-a="rand">Random</button><button class="btn gold" data-a="go">Ready</button></div>
    </div>`);
    if (mode === 'pvp' && p === 1 && !isLand()) s.style.transform = 'rotate(180deg)';  // face-to-face: red reads from the top
    const pool = s.querySelector('.pool');
    KEYS.forEach((k, i) => {
      const c = el(`<div class="card" data-k="${k}" style="animation-delay:${i * 18}ms"><img src="${faces[k]}"></div>`);
      pool.appendChild(c);
    });
    const refresh = () => {
      pool.querySelectorAll('.card').forEach(c => { const on = deck.includes(c.dataset.k); c.classList.toggle('on', on); c.classList.toggle('off', !on && deck.length >= 8); });
      s.querySelectorAll('.chosen .slot').forEach((sl, i) => { sl.innerHTML = deck[i] ? `<img src="${faces[deck[i]]}" data-k="${deck[i]}">` : ''; });
      const avg = deck.length ? deck.reduce((a, k) => a + CARDS[k].cost, 0) / deck.length : 0;
      s.querySelector('.avg').textContent = 'Average elixir: ' + avg.toFixed(1);
      s.querySelector('.cnt').textContent = deck.length + '/8';
      s.querySelector('[data-a=go]').style.opacity = deck.length === 8 ? 1 : .5;
    };
    s.addEventListener('click', tap(e => {
      const a = e.target.closest('[data-a]');
      if (a) {
        if (a.dataset.a === 'back') return p === 1 && mode === 'pvp' ? deckBuilder(0) : home();
        if (a.dataset.a === 'rand') { deck = shuffle(KEYS.slice()).slice(0, 8); return refresh(); }
        if (a.dataset.a === 'go') {
          if (deck.length !== 8) return toast('Pick 8 cards first');
          store.set('deck' + p, deck); decks[p] = deck.slice();
          if (mode === 'pvp' && p === 0) return deckBuilder(1);
          if (mode === 'bot') decks[1] = shuffle(KEYS.slice()).slice(0, 8);
          return startBattle();
        }
        return;
      }
      const c = e.target.closest('[data-k]'); if (!c) return;
      const k = c.dataset.k, rot = mode === 'pvp' && p === 1 && !isLand();
      if (deck.includes(k)) info(k, { label: 'Remove', cls: 'red', rot, fn: () => { deck = deck.filter(x => x !== k); refresh(); } });
      else if (deck.length < 8) info(k, { label: 'Add to deck', cls: 'gold', rot, fn: () => { deck.push(k); refresh(); } });
      else info(k, { label: 'Deck full', cls: 'grey', rot, fn: () => toast('Remove a card first: tap one in your deck') });
    }));
    root.appendChild(s); refresh();
  }

  // ---------- battle ----------
  function startBattle() {
    clear(); drags.clear();
    B = newBattle(decks, mode);
    layout();
    requestWake();
    menuBtn = el('<button class="menuBtn">☰</button>');
    document.body.appendChild(menuBtn);
    placeMenuBtn();
    menuBtn.addEventListener('click', tap(pauseMenu));
  }
  function placeMenuBtn() {
    if (!menuBtn || !L) return;
    // top-left corner of the arena, clear of both hands
    const [x, y] = L.land ? [L.ox + 6, 6] : [6, L.oy + 6];
    menuBtn.style.left = x + 'px'; menuBtn.style.top = y + 'px';
  }
  function pauseMenu() {
    if (!B || B.phase === 'over') return;
    B.paused = true;
    const m = el(`<div class="modal"><div class="sheet" style="text-align:center"><h3>Paused</h3><div class="btns" style="margin:14px auto 0">
      <button class="btn gold" data-a="r">Resume</button><button class="btn" data-a="re">Restart</button><button class="btn red" data-a="q">Quit</button></div></div></div>`);
    m.addEventListener('click', tap(e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      m.remove(); B.paused = false;
      if (a.dataset.a === 'q') home();
      if (a.dataset.a === 're') startBattle();
    }));
    root.appendChild(m);
  }
  const crownSvg = (col, on) => `<svg viewBox="0 0 40 32"><path d="M4 28 L2 8 L12 16 L20 3 L28 16 L38 8 L36 28 Z" fill="${on ? col : 'rgba(255,255,255,.12)'}" stroke="#000" stroke-width="3" stroke-linejoin="round"/></svg>`;
  function showResult() {
    if (!B || !B.over) return;
    const w = B.over.winner;
    let title;
    if (w === -1) title = 'DRAW!';
    else if (B.mode === 'bot') title = w === 0 ? 'YOU WIN!' : 'BOT WINS!';
    else title = (w === 0 ? 'BLUE' : 'RED') + ' WINS!';
    const col = w === -1 ? '#fff' : TEAM_COL[w];
    const names = B.mode === 'bot' ? ['You', 'Bot'] : ['Blue', 'Red'];
    const side = t => `<div class="side"><div class="cr">${[0, 1, 2].map(i => crownSvg(TEAM_COL[t], i < B.crowns[t])).join('')}</div><div style="color:${TEAM_LIGHT[t]}">${names[t]}</div>
      <div class="hint">${B.stats[t].played} cards · ${B.stats[t].elixir} elixir</div></div>`;
    const s = el(`<div class="screen result ${isLand() ? 'land' : ''}">
      <h1 style="color:${col}">${title}</h1>
      ${B.over.tiebreak ? '<div class="hint">Tiebreak: the weakest tower decided it</div>' : ''}
      <div class="crowns">${side(0)}<div class="vs">vs</div>${side(1)}</div>
      <div class="btns"><button class="btn gold" data-a="re">Rematch</button><button class="btn" data-a="deck">Change decks</button><button class="btn grey" data-a="home">Home</button></div>
    </div>`);
    s.addEventListener('click', tap(e => {
      const a = e.target.closest('[data-a]'); if (!a) return;
      if (a.dataset.a === 're') startBattle();
      if (a.dataset.a === 'deck') { picking = 0; deckBuilder(0); }
      if (a.dataset.a === 'home') home();
    }));
    clear(); root.appendChild(s);
  }

  // ---------- platform helpers ----------
  function goFullscreen() {
    const d = document.documentElement;
    try { if (!document.fullscreenElement && d.requestFullscreen) d.requestFullscreen({ navigationUI: 'hide' }).catch(() => { }); } catch (e) { }
  }
  let wake = null;
  async function requestWake() { try { if ('wakeLock' in navigator && !wake) { wake = await navigator.wakeLock.request('screen'); wake.addEventListener('release', () => wake = null); } } catch (e) { } }
  document.addEventListener('visibilitychange', () => { if (!document.hidden && B && B.phase !== 'over') requestWake(); });

  return { home, makeFaces, showResult, placeMenuBtn, get mode() { return mode; } };
})();

// ---------- main loop ----------
let lastT = 0, acc = 0;
function frame(t) {
  requestAnimationFrame(frame);
  if (!B) { lastT = t; return; }
  if (layoutQueued || !L) { layoutQueued = false; layout(); UI.placeMenuBtn(); }
  let dt = Math.min(.1, (t - lastT) / 1000 || 0); lastT = t;
  if (document.hidden || B.paused) dt = 0;
  acc += dt;
  let n = 0;
  while (acc >= DT && n < 6) { stepBattle(); acc -= DT; n++; }
  if (n === 6) acc = 0;
  draw(t);
}

(async function boot() {
  await loadAssets();
  try { await Promise.race([document.fonts.load('20px "Lilita One"'), new Promise(r => setTimeout(r, 2500))]); } catch (e) { }
  UI.makeFaces();
  document.getElementById('loading').remove();
  UI.home();
  requestAnimationFrame(frame);
  window.addEventListener('resize', () => { if (!B) { const h = document.querySelector('.home'); if (h) UI.home(); } });
  // stop iOS pinch/double-tap zoom
  document.addEventListener('gesturestart', e => e.preventDefault());
  let lastTouch = 0;
  document.addEventListener('touchend', e => { const n = Date.now(); if (n - lastTouch < 300 && e.target === cv) e.preventDefault(); lastTouch = n; }, { passive: false });
})();
