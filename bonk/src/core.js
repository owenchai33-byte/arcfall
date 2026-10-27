'use strict';
// ===== Bonk Royale: core (constants, assets, audio, simulation) =====
const AW = 18, AH = 32;                 // arena size in tiles
const RIVER_TOP = 15, RIVER_BOT = 17;   // river band (y)
const BRIDGES = [3.5, 14.5], BRIDGE_HALF = 1.1;
const REG_TIME = 180, OT_TIME = 120, DOUBLE_AT = 60;
const ELIXIR_RATE = 1 / 2.8, MAX_ELIXIR = 10, START_ELIXIR = 5;
const DEPLOY_TIME = 1;
const TEAM_COL = ['#3d8bff', '#ff4d5a'], TEAM_DARK = ['#1d4fb8', '#b5202c'], TEAM_LIGHT = ['#9cc8ff', '#ffb0b6'];

const rnd = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const lerp = (a, b, t) => a + (b - a) * t;
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const side = y => y >= 16 ? 0 : 1;       // which half a y coordinate belongs to (0 = blue/bottom)
const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

// ---------- assets ----------
const IMG = {};
function loadAssets() {
  const list = Object.entries(window.ASSETS || {});
  return Promise.all(list.map(([k, src]) => new Promise(res => {
    const im = new Image(); im.onload = () => { IMG[k] = im; res(); }; im.onerror = res; im.src = src;
  })));
}

// ---------- audio (all synthesized, no files) ----------
const SFX = (() => {
  let ac = null, master = null, noiseBuf = null, muted = false;
  function init() {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try {
      ac = new (window.AudioContext || window.webkitAudioContext)();
      master = ac.createGain(); master.gain.value = .55; master.connect(ac.destination);
      noiseBuf = ac.createBuffer(1, ac.sampleRate * .6, ac.sampleRate);
      const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { ac = null; }
  }
  const last = {};
  function gate(name, gap) { const t = performance.now(); if (last[name] && t - last[name] < gap) return false; last[name] = t; return true; }
  function tone(f, dur, type = 'sine', vol = .3, f2 = null, delay = 0) {
    if (!ac || muted) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + .01); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + .02);
  }
  function noise(dur, vol = .3, freq = 1200, q = 1, delay = 0, type = 'bandpass') {
    if (!ac || muted) return;
    const t = ac.currentTime + delay, s = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    s.buffer = noiseBuf; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur + .02);
  }
  const P = {
    tap() { tone(880, .05, 'triangle', .12); },
    select() { tone(660, .06, 'triangle', .15, 990); },
    deny() { tone(220, .12, 'square', .08, 160); },
    deploy(key) {
      noise(.12, .18, 500, 1.2); tone(300, .12, 'sine', .2, 520);
      const v = {
        ducks: () => { tone(1300, .09, 'square', .06, 1800); tone(1250, .09, 'square', .06, 1700, .1); },
        bigbaby: () => { tone(500, .45, 'sawtooth', .07, 380); tone(520, .4, 'sine', .08, 400, .05); },
        toaster: () => tone(1760, .5, 'sine', .12),
        nuggets: () => { tone(900, .07, 'square', .05, 1200); tone(1000, .07, 'square', .05, 1300, .08); },
        hotdog: () => { tone(160, .3, 'sawtooth', .08, 90); noise(.3, .12, 300, .7); },
        granny: () => tone(1200, .25, 'sine', .07, 1500),
        chompers: () => { for (let i = 0; i < 4; i++) noise(.03, .2, 3000, 4, i * .05); },
        pigeon: () => { tone(700, .08, 'triangle', .1, 500); tone(650, .08, 'triangle', .1, 480, .12); },
        vacuum: () => { noise(.7, .12, 900, .4); tone(90, .7, 'sawtooth', .07, 140); },
        sally: () => { noise(.25, .15, 700, 1.5); },
        hiccup: () => { tone(400, .08, 'sine', .15, 900); },
        wizard: () => { tone(1760, .2, 'sine', .08); tone(2217, .25, 'sine', .07, null, .08); },
        sirloin: () => { noise(.08, .2, 2500, 3); tone(1500, .2, 'triangle', .06); },
        selfie: () => { noise(.03, .25, 5000, 2); tone(2000, .05, 'square', .04); },
        spud: () => { noise(.2, .2, 200, .8); },
      }[key]; if (v) v();
    },
    melee() { if (gate('melee', 45)) { noise(.08, .25, 350, 1); tone(140, .08, 'sine', .15, 80); } },
    heavy() { if (gate('heavy', 60)) { noise(.18, .4, 220, .8); tone(90, .2, 'sine', .3, 45); } },
    shoot() { if (gate('shoot', 40)) noise(.06, .12, 2800, 2); },
    pop() { if (gate('pop', 40)) { tone(500, .07, 'triangle', .1, 260); } },
    boom() { if (gate('boom', 70)) { noise(.5, .5, 180, .6); tone(110, .45, 'sine', .35, 35); } },
    zap() { noise(.25, .3, 4000, 1); tone(1500, .2, 'sawtooth', .07, 300); },
    forks() { for (let i = 0; i < 6; i++) tone(2400 + i * 200, .06, 'triangle', .04, 3000, i * .03); },
    die() { if (gate('die', 60)) { tone(700, .15, 'triangle', .08, 200); noise(.1, .1, 1500, 1); } },
    tower() { noise(1.2, .6, 140, .5); tone(80, 1.2, 'sine', .4, 30); noise(1.4, .25, 1800, .3, .25); },
    crown() { [523, 659, 784, 1047].forEach((f, i) => tone(f, .25, 'triangle', .14, null, i * .09)); },
    beep(hi) { tone(hi ? 1046 : 523, hi ? .4 : .15, 'square', .1); },
    fanfare(win) { const n = win ? [523, 659, 784, 1047, 1319] : [392, 349, 330, 262]; n.forEach((f, i) => tone(f, .35, 'triangle', .15, null, i * .14)); },
    emote() { tone(500, .15, 'sine', .12, 1100); },
    elixirFull() { },
  };
  return { init, ...P, get muted() { return muted; }, set muted(v) { muted = v; } };
})();

// ---------- battle state ----------
let B = null;  // current battle
let nextId = 1;

function makeTower(team, sub, x, y) {
  const t = TOWERS[sub];
  return { id: nextId++, team, kind: 'tower', sub, key: sub, x, y, r: t.r, mass: 1e9, air: false,
    hp: t.hp, maxHp: t.hp, dmg: t.dmg, hs: t.hs, range: t.range, targets: 'all', sight: t.range,
    proj: { kind: sub === 'king' ? 'ball' : 'arrow', speed: 13 }, active: sub !== 'king',
    atk: 0, target: null, deploy: 0, stun: 0, flash: 0, dead: false, face: 1, anim: 0, lunge: 0 };
}

function newBattle(decks, mode) {
  nextId = 1;
  const b = {
    mode, t: 0, phase: 'countdown', cd: 3.2, over: null, ot: false,
    elixir: [START_ELIXIR, START_ELIXIR], crowns: [0, 0],
    hand: [[], []], queue: [[], []], sel: [null, null],
    ents: [], projs: [], fx: [], texts: [], banners: [], emotes: [], shake: 0,
    bot: { think: 1.5, wait: rnd(2, 4) }, stats: [{ played: 0, elixir: 0 }, { played: 0, elixir: 0 }],
    doubleAnnounced: false, lastMinAnnounced: false,
  };
  for (let p = 0; p < 2; p++) {
    const d = shuffle(decks[p].slice());
    b.hand[p] = d.slice(0, 4); b.queue[p] = d.slice(4);
  }
  // towers: team 0 bottom, team 1 top (mirrored)
  for (const team of [0, 1]) {
    const Y = y => team === 0 ? y : AH - y;
    b.ents.push(makeTower(team, 'king', 9, Y(29)));
    b.ents.push(makeTower(team, 'princess', 3.5, Y(25.5)));
    b.ents.push(makeTower(team, 'princess', 14.5, Y(25.5)));
  }
  return b;
}

const kingOf = team => B.ents.find(e => e.kind === 'tower' && e.sub === 'king' && e.team === team);
const isBuilding = e => e.kind === 'tower' || e.kind === 'building';

function timeLeft() { return B.ot ? REG_TIME + OT_TIME - B.t : REG_TIME - B.t; }
function elixirMult() {
  if (B.ot) return timeLeft() <= 60 ? 3 : 2;
  return timeLeft() <= DOUBLE_AT ? 2 : 1;
}

// ---------- deploy rules ----------
function princessAlive(team, left) {
  return B.ents.some(e => !e.dead && e.kind === 'tower' && e.sub === 'princess' && e.team === team && (e.x < 9) === left);
}
function canDeploy(team, key, x, y) {
  const c = CARDS[key];
  if (x < 0 || x > AW || y < 0 || y > AH) return false;
  if (c.type === 'spell') return true;
  if (x < .5 || x > AW - .5) return false;
  const my = team === 0 ? y : AH - y;        // mirror into team 0 space
  let ok = my > RIVER_BOT;
  if (!ok && my > 11 && my < RIVER_TOP) {     // pocket after an enemy princess falls
    const enemy = 1 - team, left = x < 9;
    if (!princessAlive(enemy, left)) ok = true;
  }
  if (!ok) return false;
  if (my > AH - .5) return false;
  for (const e of B.ents) if (!e.dead && e.kind === 'tower' && Math.abs(e.x - x) < e.r + .2 && Math.abs(e.y - y) < e.r + .2) return false;
  return true;
}
function snap(x, y) { return [Math.floor(clamp(x, 0, AW - .01)) + .5, Math.floor(clamp(y, 0, AH - .01)) + .5]; }

// ---------- playing cards ----------
function playCard(team, slot, x, y) {
  const key = B.hand[team][slot]; if (!key) return false;
  const c = CARDS[key];
  if (B.phase !== 'play' || B.elixir[team] < c.cost || !canDeploy(team, key, x, y)) return false;
  B.elixir[team] -= c.cost;
  B.stats[team].played++; B.stats[team].elixir += c.cost;
  B.queue[team].push(key);
  B.hand[team][slot] = B.queue[team].shift();
  B.sel[team] = null;
  B.texts.push({ x, y, txt: '-' + c.cost, col: '#e36bff', t: 0, life: 1 });
  addFx({ type: 'card', key, team, x, y, t: 0, life: 1.1 });
  if (c.type === 'spell') castSpell(team, key, x, y);
  else spawnCard(team, key, x, y);
  SFX.deploy(key);
  if (navigator.vibrate && team === 0) try { navigator.vibrate(12); } catch (e) { }
  return true;
}

function formation(n) {
  if (n === 1) return [[0, 0]];
  if (n === 2) return [[-.55, 0], [.55, 0]];
  if (n === 3) return [[0, -.45], [-.55, .4], [.55, .4]];
  const pts = [[0, 0]]; let ring = 1;
  while (pts.length < n) {
    const k = Math.min(n - pts.length, ring * 6);
    for (let i = 0; i < k; i++) { const a = i / k * Math.PI * 2 + ring; pts.push([Math.cos(a) * ring * .62, Math.sin(a) * ring * .62]); }
    ring++;
  }
  return pts;
}

function spawnUnit(team, key, x, y, deploy = DEPLOY_TIME) {
  const c = CARDS[key];
  const u = { id: nextId++, team, kind: c.type === 'building' ? 'building' : 'troop', key, art: c.art,
    x: clamp(x, .4, AW - .4), y: clamp(y, .4, AH - .4), r: c.r, mass: c.mass, air: !!c.air,
    hp: c.hp, maxHp: c.hp, dmg: c.dmg, hs: c.hs, range: c.range, targets: c.targets, sight: c.sight,
    speed: c.speed, splash: c.splash || 0, spin: c.spin || 0, proj: c.proj || null, jumps: !!c.jumps,
    life: c.life || 0, lifeMax: c.life || 0, deploy, deployMax: deploy, atk: 0, atkTarget: null, target: null, rt: 0,
    stun: 0, flash: 0, dead: false, face: team === 0 ? 1 : -1, anim: Math.random() * 10, lunge: 0, kx: 0, ky: 0, z: 0, moving: false };
  B.ents.push(u); return u;
}
function spawnCard(team, key, x, y) {
  const c = CARDS[key], f = formation(c.count), m = team === 0 ? 1 : -1;
  for (const [dx, dy] of f) spawnUnit(team, key, x + dx, y + dy * m, DEPLOY_TIME + rnd(0, .08) * (c.count > 1));
  addFx({ type: 'ring', x, y, t: 0, life: .5, r: c.count > 3 ? 2 : 1.2, col: TEAM_LIGHT[team] });
}

function castSpell(team, key, x, y) {
  const c = CARDS[key];
  if (key === 'sock') {
    addFx({ type: 'zap', x, y, t: 0, life: .45, r: c.radius });
    SFX.zap(); B.shake = Math.max(B.shake, .15);
    areaDamage(team, x, y, c.radius, c.dmg, c.towerDmg, { stun: c.stun });
    return;
  }
  const k = kingOf(team);
  const sx = k.x, sy = k.y + (team === 0 ? -1 : 1);
  if (key === 'forks') {
    SFX.forks();
    for (let w = 0; w < c.waves; w++)
      B.projs.push({ kind: 'forks', team, x: sx, y: sy, sx, sy, tx: x, ty: y, speed: c.speed, delay: w * .22, spell: key,
        dmg: c.dmg / c.waves, towerDmg: c.towerDmg / c.waves, radius: c.radius, t: 0 });
    addFx({ type: 'target', x, y, t: 0, life: .9, r: c.radius, col: TEAM_LIGHT[team] });
  } else {
    B.projs.push({ kind: 'meatball', team, x: sx, y: sy, sx, sy, tx: x, ty: y, speed: c.speed, delay: 0, spell: key,
      dmg: c.dmg, towerDmg: c.towerDmg, radius: c.radius, knock: c.knock, t: 0 });
    addFx({ type: 'target', x, y, t: 0, life: Math.hypot(x - sx, y - sy) / c.speed + .1, r: c.radius, col: TEAM_LIGHT[team] });
  }
}

function areaDamage(team, x, y, radius, dmg, towerDmg, opt = {}) {
  for (const e of B.ents) {
    if (e.dead || e.team === team) continue;
    if (Math.hypot(e.x - x, e.y - y) > radius + e.r * .6) continue;
    damage(e, e.kind === 'tower' ? towerDmg : dmg);
    if (opt.stun && e.kind !== 'tower' || opt.stun && e.kind === 'tower') { e.stun = Math.max(e.stun, opt.stun); e.atk = Math.max(e.atk, e.hs * .5); }
    if (opt.knock && e.kind === 'troop' && e.mass <= 7) {
      const a = Math.atan2(e.y - y, e.x - x); e.kx += Math.cos(a) * 5; e.ky += Math.sin(a) * 5;
    }
  }
}

// ---------- combat ----------
function canHit(u, e) {
  if (e.dead || e.rubble || e.team === u.team || e.deploy > 0) return false;
  if (u.targets === 'buildings') return isBuilding(e);
  if (u.targets === 'ground') return !e.air;
  return true;
}
function bridgeFor(u, tx) {
  let best = BRIDGES[0], bd = Infinity;
  for (const bx of BRIDGES) { const d = Math.abs(u.x - bx) + Math.abs(tx - bx); if (d < bd) { bd = d; best = bx; } }
  return best;
}
function onBridge(x) { return BRIDGES.some(bx => Math.abs(x - bx) <= BRIDGE_HALF); }
function crossesRiver(u, ty) { return !u.air && !u.jumps && side(u.y) !== side(ty) && !(u.y > RIVER_TOP && u.y < RIVER_BOT); }
function pathDist(u, e) {
  if (u.air || u.jumps || side(u.y) === side(e.y)) return Math.hypot(u.x - e.x, u.y - e.y);
  const bx = bridgeFor(u, e.x);
  return Math.hypot(u.x - bx, u.y - 16) + Math.hypot(bx - e.x, 16 - e.y);
}
function edgeDist(u, e) { return Math.hypot(u.x - e.x, u.y - e.y) - e.r - u.r; }

function findTarget(u) {
  let best = null, bd = Infinity;
  const isTower = u.kind === 'tower', isBld = u.kind === 'building';
  for (const e of B.ents) {
    if (!canHit(u, e)) continue;
    const ed = edgeDist(u, e);
    if (isTower || isBld) { if (ed > u.range) continue; }
    else if (u.targets !== 'buildings' && ed > u.sight) continue;
    const d = u.targets === 'buildings' ? pathDist(u, e) : ed;
    if (d < bd) { bd = d; best = e; }
  }
  if (!best && u.kind === 'troop') {           // default: march on the nearest enemy crown tower
    for (const e of B.ents) {
      if (e.dead || e.team === u.team || e.kind !== 'tower') continue;
      const d = pathDist(u, e); if (d < bd) { bd = d; best = e; }
    }
  }
  return best;
}

function damage(e, amt) {
  if (e.dead || e.rubble || amt <= 0) return;
  e.hp -= amt; e.flash = .12;
  if (e.kind === 'tower' && e.sub === 'king' && !e.active) activateKing(e);
  if (e.kind === 'tower') B.texts.push({ x: e.x + rnd(-.6, .6), y: e.y - 1.2, txt: Math.round(amt), col: '#fff', t: 0, life: .7, small: true });
  if (e.hp <= 0) kill(e);
}
function activateKing(k) { if (!k.active) { k.active = true; addFx({ type: 'wake', x: k.x, y: k.y, t: 0, life: .8 }); } }

function kill(e) {
  if (e.dead) return;
  e.dead = true; e.hp = 0;
  if (e.kind === 'tower') {
    const other = 1 - e.team;
    SFX.tower(); B.shake = .6;
    addFx({ type: 'boom', x: e.x, y: e.y, t: 0, life: .9, r: 3 });
    for (let i = 0; i < 26; i++) addFx({ type: 'debris', x: e.x, y: e.y, vx: rnd(-6, 6), vy: rnd(-6, 6), vz: rnd(6, 12), z: 0, t: 0, life: rnd(.9, 1.5), col: i % 3 ? '#8d8f99' : '#5d5f69', s: rnd(.15, .35) });
    if (e.sub === 'king') {
      B.crowns[other] = 3;
      for (const t of B.ents) if (t.kind === 'tower' && t.team === e.team) t.dead = true, t.hp = 0;
      endGame(other);
    } else {
      B.crowns[other] = Math.min(3, B.crowns[other] + 1);
      B.banners.push({ txt: 'CROWN!', sub: (other === 0 ? 'Blue' : 'Red') + ' took a tower', col: TEAM_COL[other], t: 0, life: 1.6 });
      SFX.crown();
      activateKing(kingOf(e.team));
      if (B.ot) endGame(other);
    }
    B.ents.push({ id: nextId++, kind: 'rubble', team: e.team, sub: e.sub, x: e.x, y: e.y, r: 0, dead: false, hp: 1, deploy: 0, rubble: true });
    return;
  }
  const c = CARDS[e.key];
  SFX.die();
  addFx({ type: 'poof', x: e.x, y: e.y, t: 0, life: .45, r: e.r * 1.6 });
  for (let i = 0; i < 6; i++) addFx({ type: 'spark', x: e.x, y: e.y, vx: rnd(-3, 3), vy: rnd(-3, 3), t: 0, life: rnd(.25, .45), col: '#ffffff' });
  if (c.deathDmg) {
    SFX.boom(); B.shake = Math.max(B.shake, .25);
    addFx({ type: 'boom', x: e.x, y: e.y, t: 0, life: .6, r: c.deathR });
    for (const o of B.ents) if (!o.dead && o.team !== e.team && !o.air && Math.hypot(o.x - e.x, o.y - e.y) <= c.deathR + o.r * .5) damage(o, c.deathDmg);
  }
}

function doHit(u, t) {
  u.lunge = .14;
  if (u.proj) {
    const hz = u.kind === 'tower' ? (u.sub === 'king' ? 2.3 : 2) : (u.air ? 1.2 : .6);
    B.projs.push({ kind: u.proj.kind, team: u.team, x: u.x, y: u.y, z: hz, sz: hz, sx: u.x, sy: u.y, target: t, tx: t.x, ty: t.y,
      speed: u.proj.speed, dmg: u.dmg, splash: u.splash, hitsAir: u.targets === 'all', t: 0, delay: 0, src: u.key });
    if (u.kind === 'tower' || u.key === 'selfie' || u.key === 'granny') SFX.shoot(); else SFX.pop();
    return;
  }
  if (u.spin) {
    SFX.melee();
    addFx({ type: 'spin', x: u.x, y: u.y, t: 0, life: .3, r: u.spin });
    for (const e of B.ents) if (!e.dead && e.team !== u.team && !e.air && e.deploy <= 0 && Math.hypot(e.x - u.x, e.y - u.y) <= u.spin + e.r) damage(e, u.dmg);
    return;
  }
  if (u.dmg >= 600) { SFX.heavy(); B.shake = Math.max(B.shake, .12); } else SFX.melee();
  addFx({ type: 'hit', x: (u.x + t.x) / 2 * .3 + t.x * .7, y: (u.y + t.y) / 2 * .3 + t.y * .7, t: 0, life: .25, big: u.dmg >= 600 });
  damage(t, u.dmg);
}

function addFx(f) { if (B.fx.length < 400) B.fx.push(f); }

// ---------- per-tick update ----------
const DT = 1 / 60;
function stepBattle() {
  const b = B;
  if (b.phase === 'countdown') {
    const before = Math.ceil(b.cd);
    b.cd -= DT;
    if (Math.ceil(b.cd) !== before && b.cd > 0) SFX.beep(false);
    if (b.cd <= 0) { b.phase = 'play'; SFX.beep(true); b.banners.push({ txt: 'BONK!', sub: 'Fight!', col: '#ffd84a', t: 0, life: 1.1 }); }
    updateFx(); return;
  }
  if (b.phase === 'over') { updateFx(); for (const e of b.ents) if (e.flash > 0) e.flash -= DT; return; }

  b.t += DT;
  const tl = timeLeft();
  if (!b.ot && tl <= DOUBLE_AT && !b.doubleAnnounced) { b.doubleAnnounced = true; b.banners.push({ txt: 'x2 ELIXIR', sub: 'Last 60 seconds!', col: '#e36bff', t: 0, life: 1.8 }); SFX.crown(); }
  if (b.ot && tl <= 60 && !b.lastMinAnnounced) { b.lastMinAnnounced = true; b.banners.push({ txt: 'x3 ELIXIR', sub: 'Final minute!', col: '#e36bff', t: 0, life: 1.8 }); SFX.crown(); }
  if (tl <= 0) {
    if (!b.ot && b.crowns[0] === b.crowns[1]) {
      b.ot = true; b.banners.push({ txt: 'OVERTIME', sub: 'Next crown wins!', col: '#ff9a3c', t: 0, life: 2 }); SFX.fanfare(true);
    } else if (!b.ot) { endGame(b.crowns[0] > b.crowns[1] ? 0 : 1); return; }
    else { // tiebreaker: whoever owns the weakest tower loses
      let low = Infinity, loser = -1;
      for (const e of b.ents) if (e.kind === 'tower' && !e.dead && e.hp < low) { low = e.hp; loser = e.team; }
      const lowOther = Math.min(...b.ents.filter(e => e.kind === 'tower' && !e.dead && e.team !== loser).map(e => e.hp));
      endGame(lowOther === low ? -1 : 1 - loser, true); return;
    }
  }
  const m = elixirMult();
  for (let p = 0; p < 2; p++) b.elixir[p] = Math.min(MAX_ELIXIR, b.elixir[p] + ELIXIR_RATE * m * DT);
  if (b.mode === 'bot') botThink(1);
  if (b.mode === 'sim') { botThink(0); botThink(1); }

  const ents = b.ents;
  for (const u of ents) if (!u.dead && !u.rubble) updateUnit(u);
  resolveCollisions();
  updateProjectiles();
  updateFx();
  // sweep
  if (ents.some(e => e.dead && !e.rubble && e.kind !== 'tower')) b.ents = ents.filter(e => !e.dead || e.kind === 'tower' || e.rubble);
  if (b.shake > 0) b.shake = Math.max(0, b.shake - DT * 1.5);
}

function updateUnit(u) {
  if (u.flash > 0) u.flash -= DT;
  if (u.lunge > 0) u.lunge -= DT;
  if (u.landT > 0) u.landT -= DT;
  u.anim += DT;
  if (u.kind === 'tower') {
    if (!u.active) return;
    if (u.stun > 0) { u.stun -= DT; return; }
    if (!u.target || !canHit(u, u.target) || edgeDist(u, u.target) > u.range) { u.target = findTarget(u); if (u.target) u.atk = Math.max(u.atk, u.hs * .3); }
    if (u.atk > 0) u.atk -= DT;
    if (u.target && u.atk <= 0) { doHit(u, u.target); u.atk += u.hs; u.face = u.target.x >= u.x ? 1 : -1; }
    return;
  }
  if (u.deploy > 0) { u.deploy -= DT; if (u.deploy <= 0) { addFx({ type: 'land', x: u.x, y: u.y, t: 0, life: .35, r: u.r * 1.6 }); u.rt = 0; u.landT = .25; } return; }
  if (u.kind === 'building') {
    u.hp -= u.maxHp / u.lifeMax * DT;
    if (u.hp <= 0) { kill(u); return; }
  }
  // knockback
  if (u.kx || u.ky) {
    u.x += u.kx * DT; u.y += u.ky * DT; u.kx *= .86; u.ky *= .86;
    if (Math.abs(u.kx) + Math.abs(u.ky) < .05) u.kx = u.ky = 0;
  }
  if (u.stun > 0) { u.stun -= DT; u.moving = false; return; }

  u.rt -= DT;
  const t = u.target;
  const valid = t && !t.dead && canHit(u, t);
  const inRange = valid && edgeDist(u, t) <= u.range;
  if (!valid || (!inRange && u.rt <= 0)) {
    const nt = findTarget(u);
    if (nt !== u.target) { u.target = nt; }
    u.rt = .2;
  }
  const tg = u.target;
  if (!tg) { u.moving = false; return; }
  const ed = edgeDist(u, tg);
  if (ed <= u.range) {
    u.moving = false;
    if (u.atkTarget !== tg) { u.atkTarget = tg; u.atk = Math.max(u.atk, u.hs * .45); }
    u.face = tg.x > u.x + .05 ? 1 : tg.x < u.x - .05 ? -1 : u.face;
    u.atk -= DT;
    if (u.atk <= 0) { doHit(u, tg); u.atk = u.hs; }
    return;
  }
  if (u.atk > 0) u.atk = Math.max(u.atk - DT, 0);
  u.atkTarget = null;
  if (u.speed <= 0) return;
  // steering with river and bridges
  let wx = tg.x, wy = tg.y;
  const inRiver = u.y > RIVER_TOP - .05 && u.y < RIVER_BOT + .05;
  if (!u.air && !u.jumps) {
    if (inRiver) {
      // on a bridge: walk straight across toward the target's side
      const bx = BRIDGES.reduce((a, b) => Math.abs(u.x - a) < Math.abs(u.x - b) ? a : b);
      if (side(tg.y) !== side(u.y + (u.team === 0 ? -1 : 1) * 0)) { wx = bx; wy = tg.y < 16 ? RIVER_TOP - .6 : RIVER_BOT + .6; }
      if (Math.abs(tg.y - 16) < 1.2) { wx = tg.x; wy = tg.y; }
    } else if (crossesRiver(u, tg.y)) {
      const bx = bridgeFor(u, tg.x), by = side(u.y) === 0 ? RIVER_BOT + .3 : RIVER_TOP - .3;
      if (Math.abs(u.x - bx) < .35 && Math.abs(u.y - by) < 1.2) { wx = bx; wy = side(u.y) === 0 ? RIVER_TOP - .6 : RIVER_BOT + .6; }
      else { wx = bx; wy = by; }
    }
  }
  const dx = wx - u.x, dy = wy - u.y, d = Math.hypot(dx, dy) || 1;
  const sp = u.speed * DT;
  u.x += dx / d * Math.min(sp, d); u.y += dy / d * Math.min(sp, d);
  u.moving = true;
  if (Math.abs(dx) > .02) u.face = dx > 0 ? 1 : -1;
  if (u.jumps) u.z = (u.y > RIVER_TOP - .6 && u.y < RIVER_BOT + .6) ? Math.sin(clamp((u.y - (RIVER_TOP - .6)) / 3.2, 0, 1) * Math.PI) * 1.1 : 0;
}

function resolveCollisions() {
  const ents = B.ents, n = ents.length;
  for (let i = 0; i < n; i++) {
    const a = ents[i]; if (a.dead || a.rubble || a.kind === 'tower' && a.dead) continue;
    if (a.kind === 'tower') continue;
    for (let j = i + 1; j < n; j++) {
      const b = ents[j]; if (b.dead || b.rubble || a.air !== b.air) continue;
      if (b.kind === 'tower' && a.air) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
      if (Math.abs(dx) > rr || Math.abs(dy) > rr) continue;
      const d2 = dx * dx + dy * dy; if (d2 >= rr * rr) continue;
      const d = Math.sqrt(d2) || .001, ov = (rr - d) * .5, nx = dx / d || rnd(-1, 1), ny = dy / d;
      const ma = a.kind !== 'troop' ? 1e9 : a.mass, mb = b.kind !== 'troop' ? 1e9 : b.mass;
      const wa = mb / (ma + mb), wb = ma / (ma + mb);
      // sideways bias so blobs slide around each other instead of jamming
      const sx = -ny * .25, sy = nx * .25;
      a.x -= (nx + sx) * ov * wa * 1.6; a.y -= (ny + sy) * ov * wa * 1.6;
      b.x += (nx + sx) * ov * wb * 1.6; b.y += (ny + sy) * ov * wb * 1.6;
    }
    // towers as static obstacles for ground troops
    if (!a.air && a.kind === 'troop') {
      for (const t of ents) {
        if (t.kind !== 'tower' || t.dead) continue;
        const dx = a.x - t.x, dy = a.y - t.y, rr = a.r + t.r, d = Math.hypot(dx, dy);
        if (d < rr) { const k = (rr - d) / (d || 1); a.x += dx * k; a.y += dy * k; }
      }
    }
  }
  for (const u of ents) {
    if (u.dead || u.kind !== 'troop') continue;
    u.x = clamp(u.x, .35, AW - .35); u.y = clamp(u.y, .35, AH - .35);
    if (!u.air && !u.jumps && u.y > RIVER_TOP && u.y < RIVER_BOT && !onBridge(u.x)) {
      // keep ground troops out of the water: snap onto the nearest bridge edge or bank
      const bx = BRIDGES.reduce((p, q) => Math.abs(u.x - p) < Math.abs(u.x - q) ? p : q);
      const toBridge = Math.abs(u.x - bx) - BRIDGE_HALF, toBank = Math.min(u.y - RIVER_TOP, RIVER_BOT - u.y);
      if (toBridge < toBank) u.x = bx + Math.sign(u.x - bx) * BRIDGE_HALF;
      else u.y = u.y - RIVER_TOP < RIVER_BOT - u.y ? RIVER_TOP : RIVER_BOT;
    }
  }
}

function updateProjectiles() {
  const keep = [];
  for (const p of B.projs) {
    if (p.delay > 0) { p.delay -= DT; keep.push(p); continue; }
    p.t += DT;
    if (p.target && !p.target.dead) { p.tx = p.target.x; p.ty = p.target.y; }
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), sp = p.speed * DT;
    if (d <= sp) { p.x = p.tx; p.y = p.ty; impact(p); continue; }
    p.x += dx / d * sp; p.y += dy / d * sp;
    keep.push(p);
  }
  B.projs = keep;
}

function impact(p) {
  if (p.spell) {
    if (p.kind === 'meatball') { SFX.boom(); B.shake = Math.max(B.shake, .3); addFx({ type: 'boom', x: p.x, y: p.y, t: 0, life: .6, r: p.radius }); }
    else { addFx({ type: 'forkhit', x: p.x, y: p.y, t: 0, life: .35, r: p.radius }); SFX.melee(); }
    areaDamage(p.team, p.x, p.y, p.radius, p.dmg, p.towerDmg, { knock: p.knock });
    return;
  }
  if (p.splash) {
    addFx({ type: 'splash', x: p.x, y: p.y, t: 0, life: .35, r: p.splash, kind: p.kind });
    for (const e of B.ents) {
      if (e.dead || e.team === p.team || e.deploy > 0) continue;
      if (e.air && !p.hitsAir) continue;
      if (Math.hypot(e.x - p.x, e.y - p.y) <= p.splash + e.r * .5) damage(e, p.dmg);
    }
    SFX.pop();
  } else if (p.target && !p.target.dead) {
    damage(p.target, p.dmg);
    addFx({ type: 'hit', x: p.x, y: p.y, t: 0, life: .2, small: true });
  }
}

function updateFx() {
  for (const f of B.fx) {
    f.t += DT;
    if (f.vx !== undefined) { f.x += f.vx * DT; f.y += f.vy * DT; f.vx *= .97; f.vy *= .97; }
    if (f.vz !== undefined) { f.z += f.vz * DT; f.vz -= 25 * DT; if (f.z < 0) { f.z = 0; f.vz *= -.3; f.vx *= .6; f.vy *= .6; } }
  }
  B.fx = B.fx.filter(f => f.t < f.life);
  for (const t of B.texts) t.t += DT;
  B.texts = B.texts.filter(t => t.t < t.life);
  for (const bn of B.banners) bn.t += DT;
  B.banners = B.banners.filter(bn => bn.t < bn.life);
  for (const em of B.emotes) em.t += DT;
  B.emotes = B.emotes.filter(em => em.t < 2.2);
}

function endGame(winner, tiebreak) {
  if (B.phase === 'over') return;
  B.phase = 'over'; B.over = { winner, tiebreak, t: 0 };
  setTimeout(() => SFX.fanfare(winner !== -1), 600);
  setTimeout(() => UI.showResult(), 1700);
}

// ---------- bot (plays red) ----------
function botThink(me = 1) {
  const b = B, bot = me === 1 ? b.bot : (b.bot0 || (b.bot0 = { think: 1, wait: rnd(2, 4) }));
  bot.think -= DT; if (bot.think > 0) return;
  bot.think = rnd(.35, .7);
  // work in "bot space": the bot's own king sits at small y
  const Y = y => me === 1 ? y : AH - y;
  const el = b.elixir[me], hand = b.hand[me];
  const enemies = b.ents.filter(e => !e.dead && e.team !== me && (e.kind === 'troop' || e.kind === 'building'));
  const threats = enemies.filter(e => Y(e.y) < 19);
  const afford = i => CARDS[hand[i]].cost <= el;
  const idx = pred => { const c = [0, 1, 2, 3].filter(i => afford(i) && pred(CARDS[hand[i]], hand[i])); return c.length ? c[Math.floor(Math.random() * c.length)] : -1; };
  const play = (i, x, y) => playCard(me, i, x, Y(y));
  // 1) spell big clumps
  for (const e of enemies) {
    const near = enemies.filter(o => Math.hypot(o.x - e.x, o.y - e.y) < 2.6);
    const val = near.reduce((s, o) => s + CARDS[o.key].cost / CARDS[o.key].count, 0);
    if (near.length >= 3 || val >= 4.5) {
      const i = idx(c => c.type === 'spell' && c.cost <= val + .5);
      if (i >= 0) {
        const cx = near.reduce((s, o) => s + o.x, 0) / near.length, cy = near.reduce((s, o) => s + Y(o.y), 0) / near.length;
        if (play(i, cx, cy + .6)) { bot.wait = rnd(1, 2.5); return; }
      }
    }
  }
  // 2) defend
  if (threats.length) {
    const th = threats.reduce((a, c) => Y(a.y) < Y(c.y) ? a : c);
    const air = th.air, bld = th.targets === 'buildings';
    const i = idx(c => c.type !== 'spell' && (air ? c.targets === 'all' : true) && (bld ? (c.dmg >= 200 || c.type === 'building') : true));
    if (i >= 0) {
      const c = CARDS[hand[i]];
      let x = th.x + rnd(-1, 1), y = Math.min(Y(th.y) - (c.range > 3 ? 4 : 1.5), 13.5);
      if (c.type === 'building') { x = 9 + (th.x < 9 ? -2 : 2); y = 9.5; }
      [x, y] = snap(x, y);
      for (let k = 0; k < 8 && !canDeploy(me, hand[i], x, Y(y)); k++) { y = Math.max(.5, y - 1); x = clamp(x + rnd(-1, 1), 1, 17); [x, y] = snap(x, y); }
      if (play(i, x, y)) { bot.wait = rnd(.5, 1.5); return; }
    }
  }
  // 2b) finish a weak tower with a spell
  for (const t of b.ents) {
    if (t.dead || t.team === me || t.kind !== 'tower') continue;
    const i = idx(c => c.type === 'spell' && c.towerDmg >= t.hp);
    if (i >= 0 && play(i, t.x, Y(t.y))) return;
  }
  // 2c) support an ongoing push from behind
  if (bot.push && b.t - bot.push.t < 6) {
    const tank = bot.push.u;
    if (tank && !tank.dead && Y(tank.y) > 10) {
      const i = idx(c => c.type === 'troop' && c.hp < 1500 && c.targets !== 'buildings');
      if (i >= 0) { const [x, y] = snap(tank.x + rnd(-1, 1), Math.max(Y(tank.y) - 2.5, 10.5)); if (play(i, x, Math.min(y, 13.5))) { bot.push = null; return; } }
    }
  }
  // 3) attack when rich
  bot.wait -= .5;
  if (el >= 8 || (el >= 5.5 && bot.wait <= 0)) {
    // hit the weaker lane
    const pr = b.ents.filter(t => t.kind === 'tower' && t.sub === 'princess' && t.team !== me && !t.dead);
    const weak = pr.sort((p, q) => p.hp - q.hp)[0];
    const lane = weak && Math.random() < .7 ? weak.x : (Math.random() < .5 ? 3.5 : 14.5);
    const i = idx(c => c.type === 'troop');
    if (i >= 0) {
      const c = CARDS[hand[i]];
      let x = lane + rnd(-1, 1), y = c.hp > 1500 ? 13.5 : (c.range > 3 ? 8.5 : 12.5);
      [x, y] = snap(x, y);
      if (play(i, x, y)) {
        bot.wait = rnd(2, 5);
        if (c.hp > 1500) bot.push = { t: b.t, u: b.ents[b.ents.length - 1] };
        return;
      }
    }
  }
}
