// ===== Bonk Royale: rendering, layout and touch input =====
const cv = document.getElementById('game');
const ctx = cv.getContext('2d');
const FONT = '"Lilita One", "Arial Rounded MT Bold", system-ui, sans-serif';
let L = null;              // layout
const VIS = 1.9;           // sprite height multiplier (tiles -> drawn height)

// ---------- layout ----------
function layout() {
  const W = window.innerWidth, H = window.innerHeight;
  const dpr = Math.min(window.devicePixelRatio || 1, W * H > 900000 ? 1.5 : 2);
  cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
  cv.style.width = W + 'px'; cv.style.height = H + 'px';
  const land = W > H * 1.05;
  const bot = B && B.mode === 'bot';
  let s, ox, oy, panels = [], mat;
  if (land) {
    const pw = clamp(Math.round(W * .16), 104, 230);
    s = Math.min((W - pw * 2 - 8) / AH, (H - 6) / AW);
    const aw = AH * s, ah = AW * s;
    ox = Math.round((W - aw) / 2); oy = Math.round((H - ah) / 2);
    // world (x,y) -> screen: sx = ox + (AH - y) s, sy = oy + x s   (blue base on the left)
    mat = [0, s, -s, 0, ox + AH * s, oy];
    const pwReal = Math.max(pw, ox - 4);
    panels = [
      { team: 0, x: 0, y: 0, w: pwReal, h: H, rot: 0, orient: 'col' },
      { team: 1, x: W - pwReal, y: 0, w: pwReal, h: H, rot: 0, orient: 'col' },
    ];
  } else {
    const ph = clamp(Math.round(H * .17), 112, 190);
    const phTop = bot ? clamp(Math.round(H * .075), 46, 70) : ph;
    s = Math.min((W - 4) / AW, (H - ph - phTop - 6) / AH);
    const aw = AW * s, ah = AH * s;
    ox = Math.round((W - aw) / 2); oy = Math.round(phTop + (H - ph - phTop - ah) / 2);
    mat = [s, 0, 0, s, ox, oy];
    panels = [
      { team: 0, x: 0, y: H - ph, w: W, h: ph, rot: 0, orient: 'row' },
      { team: 1, x: 0, y: 0, w: W, h: phTop, rot: bot ? 0 : Math.PI, orient: bot ? 'mini' : 'row' },
    ];
  }
  L = { W, H, dpr, land, s, mat, panels, ox, oy, arena: null, cards: {}, sprites: {} };
  for (const p of panels) layoutPanel(p);
  L.arena = renderArena(s, dpr);
  if (B) B.lastLayout = performance.now();
}
window.addEventListener('resize', () => { layoutQueued = true; });
let layoutQueued = false;

const W2S = (x, y) => [L.mat[0] * x + L.mat[2] * y + L.mat[4], L.mat[1] * x + L.mat[3] * y + L.mat[5]];
function S2W(sx, sy) {
  const [a, b, c, d, e, f] = L.mat, det = a * d - b * c;
  const X = sx - e, Y = sy - f;
  return [(d * X - c * Y) / det, (-b * X + a * Y) / det];
}

// panel-local coordinates
function toLocal(p, sx, sy) {
  if (p.rot) return [p.x + p.w - sx, p.y + p.h - sy];
  return [sx - p.x, sy - p.y];
}
function inPanel(p, sx, sy) { return sx >= p.x && sx <= p.x + p.w && sy >= p.y && sy <= p.y + p.h; }

function layoutPanel(p) {
  const { w, h } = p, pad = Math.max(5, Math.round(Math.min(w, h) * .04));
  p.pad = pad;
  if (p.orient === 'mini') {
    p.hud = { x: pad, y: pad, w: w - pad * 2, h: h - pad * 2 };
    const eh = Math.min(18, h * .36);
    p.slots = []; p.next = null; p.elx = { x: w * .42, y: (h - eh) / 2, w: w * .58 - pad * 2, h: eh };
    return;
  }
  if (p.orient === 'row') {
    const hudH = Math.round(clamp(h * .17, 20, 30));
    const elH = Math.round(clamp(h * .14, 16, 26));
    const cardsH = h - hudH - elH - pad * 3;
    const nextW = Math.round(w * .13);
    let cw = Math.min((w - nextW - pad * 7) / 4, cardsH / 1.2);
    const ch = cw * 1.2;
    const totalW = nextW + pad * 2 + cw * 4 + pad * 3;
    const x0 = (w - totalW) / 2;
    p.hud = { x: pad, y: pad * .6, w: w - pad * 2, h: hudH };
    p.next = { x: x0, y: hudH + pad + (ch - nextW * 1.2) , w: nextW, h: nextW * 1.2 };
    p.slots = [0, 1, 2, 3].map(i => ({ x: x0 + nextW + pad * 2 + i * (cw + pad), y: hudH + pad * 1.4, w: cw, h: ch }));
    p.elx = { x: x0 + nextW + pad * 2, y: h - elH - pad, w: cw * 4 + pad * 3, h: elH };
    p.emote = { x: x0 + nextW / 2, y: hudH + pad + (ch - nextW * 1.2) / 2 - 2, r: Math.min(nextW * .32, 16) };
    if (p.emote.y - p.emote.r < hudH) p.emote = null;
  } else {
    const hudH = Math.round(clamp(h * .16, 50, 74));
    const elH = Math.round(clamp(h * .06, 16, 24));
    let cw = (w - pad * 3) / 2;
    const avail = h - hudH - elH - pad * 6 - 14;
    const nextH = clamp(avail * .2, 34, 80);
    cw = Math.min(cw, (avail - nextH - pad) / 2 / 1.2);
    const ch = cw * 1.2;
    const gx = (w - cw * 2 - pad) / 2;
    const gy = hudH + pad * 2 + nextH + Math.max(14, nextH * .3);
    p.hud = { x: pad, y: pad, w: w - pad * 2, h: hudH };
    p.next = { x: gx, y: hudH + pad * 2, w: nextH / 1.2, h: nextH };
    p.emote = { x: w - gx - nextH * .35, y: hudH + pad * 2 + nextH / 2, r: Math.min(nextH * .36, 18) };
    p.slots = [0, 1, 2, 3].map(i => ({ x: gx + (i % 2) * (cw + pad), y: gy + Math.floor(i / 2) * (ch + pad), w: cw, h: ch }));
    p.elx = { x: gx, y: gy + ch * 2 + pad * 2.5, w: cw * 2 + pad, h: elH };
    // centre the whole stack vertically
    const used = p.elx.y + elH - hudH, off = Math.max(0, (h - hudH - pad - used) / 2);
    if (off > 0) { p.next.y += off; p.emote.y += off; p.slots.forEach(r => r.y += off); p.elx.y += off; }
  }
}

// ---------- offscreen helpers ----------
function mk(w, h) { const c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w)); c.height = Math.max(1, Math.ceil(h)); return c; }
function rr(g, x, y, w, h, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); }
function hash(x, y) { const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return s - Math.floor(s); }

// sprite scaled to a pixel height, cached (plus a white silhouette for hit flashes)
function sprite(name, hpx) {
  const im = IMG[name]; if (!im) return null;
  const key = name + '|' + Math.round(hpx);
  let sp = L.sprites[key]; if (sp) return sp;
  const dpr = L.dpr, h = Math.max(4, Math.round(hpx * dpr)), w = Math.round(im.width / im.height * h);
  const c = mk(w, h), g = c.getContext('2d');
  g.imageSmoothingQuality = 'high'; g.drawImage(im, 0, 0, w, h);
  const wc = mk(w, h), wg = wc.getContext('2d');
  wg.drawImage(c, 0, 0); wg.globalCompositeOperation = 'source-in'; wg.fillStyle = '#fff'; wg.fillRect(0, 0, w, h);
  sp = L.sprites[key] = { c, white: wc, w: w / dpr, h: h / dpr };
  return sp;
}

// ---------- arena painting (once per layout) ----------
function renderArena(s, dpr) {
  const M = 1.4;  // border tiles drawn around the field
  const W = (AW + M * 2) * s, H = (AH + M * 2) * s;
  const c = mk(W * dpr, H * dpr), g = c.getContext('2d');
  g.scale(dpr, dpr); g.translate(M * s, M * s);
  const T = (x) => x * s;
  // outer ground
  g.fillStyle = '#3f6e2a'; g.fillRect(-M * s, -M * s, W, H);
  for (let i = 0; i < 260; i++) {
    const x = (hash(i, 1) * (AW + M * 2) - M), y = (hash(i, 2) * (AH + M * 2) - M);
    if (x > -.2 && x < AW + .2 && y > -.2 && y < AH + .2) continue;
    g.fillStyle = hash(i, 3) > .5 ? '#2f5a1f' : '#4f8234';
    g.beginPath(); g.arc(T(x), T(y), T(.25 + hash(i, 4) * .5), 0, 7); g.fill();
  }
  // stone rim
  g.fillStyle = '#7d7a72'; rr(g, T(-.45), T(-.45), T(AW + .9), T(AH + .9), T(.6)); g.fill();
  g.fillStyle = '#a19d92'; rr(g, T(-.3), T(-.3), T(AW + .6), T(AH + .6), T(.5)); g.fill();
  // grass checker
  for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++) {
    const n = hash(x, y) * .06;
    const base = (x + y) % 2 ? [122, 196, 76] : [111, 186, 67];
    g.fillStyle = `rgb(${base[0] * (1 - n) | 0},${base[1] * (1 - n) | 0},${base[2] * (1 - n) | 0})`;
    g.fillRect(T(x), T(y), T(1) + .5, T(1) + .5);
  }
  // grass tufts
  g.strokeStyle = 'rgba(40,110,30,.35)'; g.lineWidth = Math.max(1, s * .06);
  for (let i = 0; i < 220; i++) {
    const x = hash(i, 7) * AW, y = hash(i, 8) * AH;
    g.beginPath(); g.moveTo(T(x), T(y)); g.lineTo(T(x - .08), T(y - .25)); g.moveTo(T(x + .1), T(y)); g.lineTo(T(x + .14), T(y - .22)); g.stroke();
  }
  // dirt lanes: tower -> bridge, both halves
  g.fillStyle = 'rgba(214,180,120,.55)';
  for (const bx of BRIDGES) {
    rr(g, T(bx - .9), T(4.5), T(1.8), T(AH - 9), T(.9)); g.fill();
  }
  g.fillStyle = 'rgba(214,180,120,.45)';
  rr(g, T(3.5), T(2.4), T(11), T(1.6), T(.8)); g.fill();
  rr(g, T(3.5), T(AH - 4), T(11), T(1.6), T(.8)); g.fill();
  // tower pads
  const pad = (x, y, r, col) => {
    g.fillStyle = 'rgba(0,0,0,.18)'; rr(g, T(x - r - .1), T(y - r + .1), T(r * 2 + .2), T(r * 2 + .2), T(.5)); g.fill();
    g.fillStyle = col; rr(g, T(x - r), T(y - r), T(r * 2), T(r * 2), T(.45)); g.fill();
    g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = Math.max(1, s * .08); g.stroke();
  };
  for (const team of [0, 1]) {
    const Y = y => team === 0 ? y : AH - y;
    pad(9, Y(29), 2.3, '#c9c1a8'); pad(3.5, Y(25.5), 1.8, '#c9c1a8'); pad(14.5, Y(25.5), 1.8, '#c9c1a8');
  }
  // river
  const rg = g.createLinearGradient(0, T(RIVER_TOP), 0, T(RIVER_BOT));
  rg.addColorStop(0, '#2f8fd6'); rg.addColorStop(.5, '#4fb4f0'); rg.addColorStop(1, '#2f8fd6');
  g.fillStyle = '#6a5136'; g.fillRect(T(-.3), T(RIVER_TOP - .18), T(AW + .6), T(RIVER_BOT - RIVER_TOP + .36));
  g.fillStyle = rg; g.fillRect(T(-.3), T(RIVER_TOP), T(AW + .6), T(RIVER_BOT - RIVER_TOP));
  g.fillStyle = 'rgba(255,255,255,.18)';
  g.fillRect(T(-.3), T(RIVER_TOP), T(AW + .6), T(.12)); g.fillRect(T(-.3), T(RIVER_BOT - .12), T(AW + .6), T(.12));
  // bridges
  for (const bx of BRIDGES) {
    const x0 = bx - BRIDGE_HALF, y0 = RIVER_TOP - .45, bw = BRIDGE_HALF * 2, bh = RIVER_BOT - RIVER_TOP + .9;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(T(x0 + .1), T(y0 + .15), T(bw), T(bh));
    g.fillStyle = '#a0703f'; g.fillRect(T(x0), T(y0), T(bw), T(bh));
    g.strokeStyle = '#7a5129'; g.lineWidth = Math.max(1, s * .07);
    for (let y = y0 + .3; y < y0 + bh; y += .38) { g.beginPath(); g.moveTo(T(x0), T(y)); g.lineTo(T(x0 + bw), T(y)); g.stroke(); }
    g.fillStyle = '#6b4520'; g.fillRect(T(x0 - .12), T(y0), T(.24), T(bh)); g.fillRect(T(x0 + bw - .12), T(y0), T(.24), T(bh));
    g.fillStyle = '#8a5a2c'; for (const yy of [y0, y0 + bh - .3]) for (const xx of [x0 - .15, x0 + bw - .15]) g.fillRect(T(xx), T(yy), T(.3), T(.3));
  }
  // center line markers
  g.strokeStyle = 'rgba(255,255,255,.12)'; g.lineWidth = 1;
  // flowers near the rim
  for (let i = 0; i < 40; i++) {
    const x = hash(i, 11) * AW, y = hash(i, 12) < .5 ? hash(i, 13) * 1.2 + .3 : AH - hash(i, 13) * 1.2 - .3;
    if (Math.abs(x - 9) < 3) continue;
    g.fillStyle = ['#ffe066', '#ff8fb1', '#ffffff', '#b8a4ff'][i % 4];
    g.beginPath(); g.arc(T(x), T(y), T(.09), 0, 7); g.fill();
  }
  return { c, M, W, H };
}

// ---------- card faces ----------
const RARITY = {
  common: { edge: '#b9cde0', edge2: '#6e88a6', bg1: '#5a8fd0', bg2: '#2c4f8f' },
  rare: { edge: '#ffc35a', edge2: '#c7651a', bg1: '#f0a050', bg2: '#a2461c' },
  epic: { edge: '#e39bff', edge2: '#7b2fb3', bg1: '#b45cf0', bg2: '#4f1d86' },
};
function drawCardFace(g, key, x, y, w, h, opts = {}) {
  const c = CARDS[key], R = RARITY[c.rarity], rad = Math.max(4, w * .12);
  g.save();
  rr(g, x, y, w, h, rad); g.fillStyle = R.edge2; g.fill();
  const b = Math.max(2, w * .055);
  rr(g, x + b * .5, y + b * .5, w - b, h - b, rad * .9); g.fillStyle = R.edge; g.fill();
  const ix = x + b * 1.4, iy = y + b * 1.4, iw = w - b * 2.8, ih = h - b * 2.8;
  rr(g, ix, iy, iw, ih, rad * .7);
  const bg = g.createLinearGradient(0, iy, 0, iy + ih); bg.addColorStop(0, R.bg1); bg.addColorStop(1, R.bg2);
  g.fillStyle = bg; g.fill();
  g.clip();
  // light rays
  g.globalAlpha = .18; g.fillStyle = '#fff';
  for (let i = 0; i < 5; i++) { g.beginPath(); g.moveTo(ix + iw / 2, iy + ih * .45); const a = i * 1.26 + .3; g.arc(ix + iw / 2, iy + ih * .45, iw, a, a + .35); g.fill(); }
  g.globalAlpha = 1;
  const im = IMG[c.art];
  if (im) {
    const spell = c.type === 'spell' || c.type === 'building';
    const scale = spell ? Math.min(iw * 1.02 / im.width, ih * .98 / im.height) : iw * 1.18 / im.width;
    const dw = im.width * scale, dh = im.height * scale;
    const dx = ix + (iw - dw) / 2, dy = spell ? iy + (ih - dh) / 2 + ih * .03 : iy + ih * .1;
    g.drawImage(im, dx, dy, dw, dh);
  }
  // bottom shade + name
  if (opts.name) {
    const sh = g.createLinearGradient(0, iy + ih * .62, 0, iy + ih); sh.addColorStop(0, 'rgba(0,0,0,0)'); sh.addColorStop(1, 'rgba(0,0,0,.75)');
    g.fillStyle = sh; g.fillRect(ix, iy + ih * .6, iw, ih * .4);
    g.font = `${Math.round(w * .13)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'alphabetic';
    g.lineWidth = Math.max(2, w * .03); g.strokeStyle = '#000'; g.fillStyle = '#fff';
    const nm = c.name.length > 12 ? c.name.replace(' ', '\n') : c.name;
    const lines = nm.split('\n');
    lines.forEach((ln, i) => { const yy = iy + ih - w * .06 - (lines.length - 1 - i) * w * .13; g.strokeText(ln, ix + iw / 2, yy); g.fillText(ln, ix + iw / 2, yy); });
  }
  g.restore();
  // gloss
  g.save(); rr(g, x + b, y + b, w - b * 2, (h - b * 2) * .4, rad * .8); g.clip();
  const gl = g.createLinearGradient(0, y, 0, y + h * .4); gl.addColorStop(0, 'rgba(255,255,255,.28)'); gl.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = gl; g.fillRect(x, y, w, h * .4); g.restore();
  // elixir drop
  drawDrop(g, x + w * .17, y + w * .19, w * .17, c.cost);
}
function drawDrop(g, x, y, r, n) {
  g.save();
  g.beginPath(); g.moveTo(x, y - r * 1.35);
  g.bezierCurveTo(x + r * .6, y - r * .6, x + r * 1.05, y - r * .1, x + r, y + r * .25);
  g.arc(x, y + r * .25, r, 0, Math.PI); g.bezierCurveTo(x - r * 1.05, y - r * .1, x - r * .6, y - r * .6, x, y - r * 1.35); g.closePath();
  const gr = g.createRadialGradient(x - r * .3, y - r * .2, r * .1, x, y, r * 1.3); gr.addColorStop(0, '#ff9cf3'); gr.addColorStop(.6, '#d02fd0'); gr.addColorStop(1, '#7a0f8f');
  g.fillStyle = gr; g.fill(); g.lineWidth = Math.max(1.5, r * .16); g.strokeStyle = '#3d0a49'; g.stroke();
  if (n !== undefined) {
    g.font = `${Math.round(r * 1.35)}px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = Math.max(2, r * .3); g.strokeStyle = '#3d0a49'; g.strokeText(n, x, y + r * .22); g.fillStyle = '#fff'; g.fillText(n, x, y + r * .22);
  }
  g.restore();
}
function cardCanvas(key, w, h, grey) {
  const id = key + '|' + Math.round(w) + '|' + Math.round(h) + (grey ? 'g' : '');
  if (L.cards[id]) return L.cards[id];
  const d = L.dpr, c = mk(w * d, h * d), g = c.getContext('2d');
  g.scale(d, d); drawCardFace(g, key, 0, 0, w, h);
  if (grey) {
    try {
      const im = g.getImageData(0, 0, c.width, c.height), a = im.data;
      for (let i = 0; i < a.length; i += 4) { const v = (a[i] * .3 + a[i + 1] * .59 + a[i + 2] * .11) * .7; a[i] = a[i + 1] = a[i + 2] = v; }
      g.putImageData(im, 0, 0);
    } catch (e) { g.globalCompositeOperation = 'source-atop'; g.fillStyle = 'rgba(60,60,70,.7)'; g.fillRect(0, 0, w, h); }
  }
  return L.cards[id] = c;
}

// ---------- input ----------
const drags = new Map();   // pointerId -> {team, slot, sx, sy, x, y, moved, wx, wy, over}
function humanTeams() { return B.mode === 'bot' ? [0] : [0, 1]; }
function slotAt(p, lx, ly) {
  for (let i = 0; i < p.slots.length; i++) { const r = p.slots[i]; if (lx >= r.x - 3 && lx <= r.x + r.w + 3 && ly >= r.y - 6 && ly <= r.y + r.h + 3) return i; }
  return -1;
}
function arenaPos(sx, sy) {
  const [wx, wy] = S2W(sx, sy);
  return { wx, wy, inside: wx >= -.3 && wx <= AW + .3 && wy >= -.3 && wy <= AH + .3 };
}
cv.addEventListener('pointerdown', e => {
  SFX.init();
  if (!B || !L) return;
  e.preventDefault();
  try { cv.setPointerCapture(e.pointerId); } catch (_) { }
  const sx = e.clientX, sy = e.clientY;
  for (const p of L.panels) {
    if (!inPanel(p, sx, sy)) continue;
    if (!humanTeams().includes(p.team)) return;
    const [lx, ly] = toLocal(p, sx, sy);
    if (p.emote && Math.hypot(lx - p.emote.x, ly - p.emote.y) < p.emote.r * 1.5) { openEmotes(p.team); return; }
    if (B.emotePick === p.team) { const k = emoteHit(p, lx, ly); if (k >= 0) { sendEmote(p.team, k); } B.emotePick = null; return; }
    const slot = slotAt(p, lx, ly);
    if (slot >= 0 && B.phase !== 'over') {
      drags.set(e.pointerId, { team: p.team, slot, sx, sy, x: sx, y: sy, moved: false, over: false });
      SFX.tap();
    }
    return;
  }
  // tap on arena with a selected card
  const ap = arenaPos(sx, sy); if (!ap.inside) return;
  const teams = humanTeams().filter(t => B.sel[t] !== null);
  if (!teams.length) return;
  let team = teams[0];
  if (teams.length > 1) team = ap.wy >= 16 ? 0 : 1;
  const key = B.hand[team][B.sel[team]];
  let [x, y] = CARDS[key].type === 'spell' ? [ap.wx, ap.wy] : snap(ap.wx, ap.wy);
  if (!tryPlay(team, B.sel[team], x, y)) { SFX.deny(); B.denied = { t: 0, x, y }; }
}, { passive: false });
cv.addEventListener('pointermove', e => {
  const d = drags.get(e.pointerId); if (!d) return;
  e.preventDefault();
  d.x = e.clientX; d.y = e.clientY;
  if (!d.moved && Math.hypot(d.x - d.sx, d.y - d.sy) > 10) d.moved = true;
  const p = L.panels[d.team];
  const ap = arenaPos(d.x, d.y);
  d.over = !inPanel(p, d.x, d.y) && ap.inside;
  const key = B.hand[d.team][d.slot];
  if (d.over && key) {
    const sp = CARDS[key].type === 'spell';
    [d.wx, d.wy] = sp ? [clamp(ap.wx, 0, AW), clamp(ap.wy, 0, AH)] : snap(ap.wx, ap.wy);
  }
}, { passive: false });
function endDrag(e, cancel) {
  const d = drags.get(e.pointerId); if (!d) return;
  drags.delete(e.pointerId);
  if (cancel || !B) return;
  if (!d.moved) {
    B.sel[d.team] = B.sel[d.team] === d.slot ? null : d.slot;
    if (B.sel[d.team] !== null) SFX.select();
    return;
  }
  if (d.over) {
    if (!tryPlay(d.team, d.slot, d.wx, d.wy)) { SFX.deny(); B.denied = { t: 0, x: d.wx, y: d.wy }; }
  }
}
function tryPlay(team, slot, x, y) {
  const ok = playCard(team, slot, x, y);
  if (ok) for (const [, d] of drags) if (d.team === team && d.slot === slot) d.cancelled = true;
  return ok;
}
cv.addEventListener('pointerup', e => endDrag(e, false));
cv.addEventListener('pointercancel', e => endDrag(e, true));
cv.addEventListener('contextmenu', e => e.preventDefault());

const EMOTES = ['emote-laugh', 'emote-cry', 'emote-angry', 'emote-wink'];
function openEmotes(team) { B.emotePick = B.emotePick === team ? null : team; SFX.tap(); }
function emoteRects(p) {
  const r = p.emote.r * 2.1, gap = 6, n = EMOTES.length;
  const tw = n * r + (n - 1) * gap;
  let x0 = p.orient === 'col' ? (p.w - Math.min(tw, p.w - 8)) / 2 : clamp(p.emote.x - r / 2, 4, p.w - tw - 4);
  const rs = Math.min(r, (p.w - 8 - (n - 1) * gap) / n);
  const y = p.orient === 'col' ? p.emote.y + p.emote.r + 8 : p.slots[0].y + 4;
  return EMOTES.map((k, i) => ({ x: x0 + i * (rs + gap), y, w: rs, h: rs }));
}
function emoteHit(p, lx, ly) { const rs = emoteRects(p); for (let i = 0; i < rs.length; i++) { const r = rs[i]; if (lx >= r.x && lx <= r.x + r.w && ly >= r.y && ly <= r.y + r.h) return i; } return -1; }
function sendEmote(team, k) { B.emotes = B.emotes.filter(e => e.team !== team); B.emotes.push({ team, k, t: 0 }); SFX.emote(); }

// ---------- drawing ----------
function txt(g, s, x, y, size, col = '#fff', align = 'center', stroke = '#000', base = 'middle') {
  g.font = `${Math.round(size)}px ${FONT}`; g.textAlign = align; g.textBaseline = base;
  g.lineJoin = 'round'; g.lineWidth = Math.max(2, size * .2); g.strokeStyle = stroke; g.strokeText(s, x, y);
  g.fillStyle = col; g.fillText(s, x, y);
}
function fmtTime(t) { t = Math.max(0, Math.ceil(t)); return Math.floor(t / 60) + ':' + String(t % 60).padStart(2, '0'); }

function draw(now) {
  const g = ctx, d = L.dpr, s = L.s;
  g.setTransform(d, 0, 0, d, 0, 0);
  g.fillStyle = '#2c5420'; g.fillRect(0, 0, L.W, L.H);
  // screen shake
  let shx = 0, shy = 0;
  if (B.shake > 0) { shx = rnd(-1, 1) * B.shake * 6; shy = rnd(-1, 1) * B.shake * 6; }
  g.save(); g.translate(shx, shy);
  // arena
  const A = L.arena, [a, b, c, dd, e, f] = L.mat;
  g.save(); g.transform(a / s, b / s, c / s, dd / s, e, f);
  g.drawImage(A.c, -A.M * s, -A.M * s, A.W, A.H);
  // animated water
  g.globalAlpha = .22; g.fillStyle = '#fff';
  const tt = now / 1000;
  for (let i = 0; i < 9; i++) {
    const x = ((i * 2.3 + tt * .6) % (AW + 2)) - 1, y = RIVER_TOP + .45 + (i % 3) * .5;
    g.fillRect(x * s, y * s, s * (.9 + (i % 2) * .5), s * .07);
  }
  g.globalAlpha = 1;
  drawDeployZones(g, s);
  g.restore();

  // world objects sorted by screen y
  const objs = [];
  for (const en of B.ents) {
    if (en.dead && en.kind !== 'tower') continue;
    if (en.kind === 'tower' && en.dead) continue;
    const [sx, sy] = W2S(en.x, en.y);
    objs.push({ en, sx, sy: sy + (en.air ? 1000 : 0) });
  }
  objs.sort((p, q) => p.sy - q.sy);
  // shadows first
  for (const o of objs) drawShadow(g, o.en);
  for (const o of objs) if (o.en.rubble) drawRubble(g, o.en);
  for (const o of objs) if (!o.en.rubble) o.en.kind === 'tower' ? drawTower(g, o.en, now) : drawUnit(g, o.en, now);
  for (const p of B.projs) drawProj(g, p, now);
  for (const fx of B.fx) drawFx(g, fx);
  for (const o of objs) if (!o.en.rubble && o.en.kind !== 'tower') drawUnitBars(g, o.en);
  for (const o of objs) if (o.en.kind === 'tower') drawTowerBar(g, o.en);
  for (const t of B.texts) {
    const [sx, sy] = W2S(t.x, t.y);
    const k = t.t / t.life;
    g.globalAlpha = 1 - k * k;
    txt(g, String(t.txt), sx, sy - k * s * 1.2, (t.small ? .55 : .8) * s * (1 + Math.min(.3, t.t * 3)), t.col);
    g.globalAlpha = 1;
  }
  drawGhosts(g, now);
  drawEmotes(g);
  g.restore();

  for (const p of L.panels) drawPanel(g, p, now);
  drawOverlays(g, now);
}

function drawDeployZones(g, s) {
  // red tint over forbidden ground while a player drags a troop card
  const teams = new Set();
  for (const [, d] of drags) if (d.moved && !d.cancelled) teams.add(d.team);
  for (const t of humanTeams()) if (B.sel[t] !== null) teams.add(t);
  for (const team of teams) {
    let key = null;
    for (const [, d] of drags) if (d.team === team && d.moved) key = B.hand[team][d.slot];
    if (!key && B.sel[team] !== null) key = B.hand[team][B.sel[team]];
    if (!key || CARDS[key].type === 'spell') continue;
    // red tint over every tile this player cannot use (pockets open up as towers fall)
    g.fillStyle = 'rgba(230,40,40,.22)'; g.beginPath();
    for (let y = 0; y < AH; y++) for (let x = 0; x < AW; x++)
      if (!canDeploy(team, key, x + .5, y + .5)) g.rect(x * s, y * s, s + .5, s + .5);
    g.fill();
    // light grid on the allowed half
    g.strokeStyle = 'rgba(255,255,255,.10)'; g.lineWidth = 1;
    g.beginPath();
    const ys = team === 0 ? [RIVER_BOT, AH] : [0, RIVER_TOP];
    for (let x = 1; x < AW; x++) { g.moveTo(x * s, ys[0] * s); g.lineTo(x * s, ys[1] * s); }
    for (let y = ys[0] + 1; y < ys[1]; y++) { g.moveTo(0, y * s); g.lineTo(AW * s, y * s); }
    g.stroke();
  }
}

function drawShadow(g, en) {
  if (en.rubble) return;
  const [sx, sy] = W2S(en.x, en.y), s = L.s;
  const r = en.kind === 'tower' ? en.r * 1.05 : en.r * (en.air ? .8 : 1.05);
  g.fillStyle = en.air ? 'rgba(0,0,0,.18)' : 'rgba(0,0,0,.28)';
  g.beginPath(); g.ellipse(sx, sy + (en.kind === 'tower' ? r * s * .35 : 0), r * s, r * s * .5, 0, 0, 7); g.fill();
}

function drawRubble(g, en) {
  const [sx, sy] = W2S(en.x, en.y), s = L.s, r = (en.sub === 'king' ? 2 : 1.5) * s;
  for (let i = 0; i < 9; i++) {
    const a = hash(en.id, i) * 7, d = hash(i, en.id) * r * .8;
    g.fillStyle = i % 2 ? '#6d6a62' : '#8d897e';
    g.beginPath(); g.ellipse(sx + Math.cos(a) * d, sy + Math.sin(a) * d * .6, r * .28, r * .18, a, 0, 7); g.fill();
  }
}

function drawTower(g, en, now) {
  const [sx, sy] = W2S(en.x, en.y), s = L.s;
  const name = (en.sub === 'king' ? 'king' : 'princess') + (en.team === 1 ? '_r' : '');
  const wTiles = en.sub === 'king' ? 4.9 : 3.6;
  const im = IMG[name]; if (!im) return;
  const hpx = wTiles * s * im.height / im.width;
  const sp = sprite(name, hpx);
  const baseY = sy + en.r * s * .62;
  const top = baseY - sp.h;
  g.drawImage(sp.c, sx - sp.w / 2, top, sp.w, sp.h);
  if (en.flash > 0) { g.globalAlpha = en.flash / .12 * .35; g.drawImage(sp.white, sx - sp.w / 2, top, sp.w, sp.h); g.globalAlpha = 1; }
  if (en.sub === 'king' && !en.active && B.phase !== 'over') {
    const t = now / 1000;
    for (let i = 0; i < 3; i++) {
      const k = ((t * .6 + i / 3) % 1);
      g.globalAlpha = 1 - k; txt(g, 'z', sx + s * (.6 + k * 1.2), top + s * (.4 - k * 1.4), s * (.45 + k * .4), '#cfe3ff', 'center', '#123');
    }
    g.globalAlpha = 1;
  }
}

function barCol(team) { return team === 0 ? ['#4aa8ff', '#1a5fc4'] : ['#ff5b6b', '#b8202f']; }
function drawTowerBar(g, en) {
  if (en.dead || B.phase === 'countdown' && false) return;
  const [sx, sy] = W2S(en.x, en.y), s = L.s;
  const w = (en.sub === 'king' ? 3.4 : 2.6) * s, h = Math.max(7, s * .42);
  const name = (en.sub === 'king' ? 'king' : 'princess') + (en.team === 1 ? '_r' : '');
  const im = IMG[name]; const wTiles = en.sub === 'king' ? 4.9 : 3.6;
  const hpx = im ? wTiles * s * im.height / im.width : 3 * s;
  const y = sy + en.r * s * .62 - hpx - h * .2;
  const x = sx - w / 2;
  const [c1, c2] = barCol(en.team);
  g.fillStyle = 'rgba(0,0,0,.65)'; rr(g, x - 2, y - 2, w + 4, h + 4, h * .5); g.fill();
  g.fillStyle = '#2a2a2a'; rr(g, x, y, w, h, h * .4); g.fill();
  const k = clamp(en.hp / en.maxHp, 0, 1);
  if (k > 0) { g.fillStyle = c1; rr(g, x, y, Math.max(h * .8, w * k), h, h * .4); g.fill(); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(x + 2, y + 1, Math.max(0, w * k - 4), h * .3); }
  txt(g, String(Math.ceil(en.hp)), sx, y + h / 2 + .5, h * 1.05, '#fff', 'center', 'rgba(0,0,0,.9)');
  if (en.sub === 'king') drawCrownIcon(g, x - h * .2, y + h / 2, h * 1.2, c1);
}
function drawCrownIcon(g, x, y, r, col) {
  g.save(); g.translate(x, y);
  g.beginPath(); g.moveTo(-r * .8, r * .5); g.lineTo(-r * .9, -r * .35); g.lineTo(-r * .4, 0); g.lineTo(0, -r * .6); g.lineTo(r * .4, 0); g.lineTo(r * .9, -r * .35); g.lineTo(r * .8, r * .5); g.closePath();
  g.fillStyle = col; g.fill(); g.lineWidth = Math.max(1.5, r * .18); g.strokeStyle = '#000'; g.stroke();
  g.restore();
}

function unitHeight(en) { return CARDS[en.key].h * L.s * VIS; }
function drawUnit(g, en, now) {
  const c = CARDS[en.key], s = L.s;
  let [sx, sy] = W2S(en.x, en.y);
  const hpx = unitHeight(en);
  const sp = sprite(c.art, hpx); if (!sp) return;
  let lift = en.air ? s * 1.25 + Math.sin(en.anim * 4) * s * .12 : 0;
  lift += (en.z || 0) * s;
  // walking bob and attack lunge
  let rot = 0, sxs = 1, sys = 1;
  if (en.moving) { lift += Math.abs(Math.sin(en.anim * 9)) * s * .12; rot = Math.sin(en.anim * 9) * .06; }
  if (en.lunge > 0) { const k = en.lunge / .14; sxs = 1 + .14 * k; sys = 1 - .1 * k; }
  if (en.landT > 0) { const k = en.landT / .25; sxs *= 1 + .25 * k; sys *= 1 - .2 * k; }
  if (en.kind === 'building') { rot = 0; lift = 0; }
  let alpha = 1, drop = 0;
  if (en.deploy > 0) {
    const k = en.deploy / en.deployMax;
    alpha = .5; drop = 0;
    // deploy clock
    g.save(); g.globalAlpha = .9;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.beginPath(); g.arc(sx, sy, s * .5, 0, 7); g.fill();
    g.fillStyle = TEAM_COL[en.team]; g.beginPath(); g.moveTo(sx, sy); g.arc(sx, sy, s * .45, -Math.PI / 2, -Math.PI / 2 + (1 - k) * Math.PI * 2); g.closePath(); g.fill();
    g.restore();
  }
  // team ring
  if (en.deploy <= 0) {
    g.strokeStyle = TEAM_COL[en.team]; g.lineWidth = Math.max(1.5, s * .1); g.globalAlpha = .9;
    g.beginPath(); g.ellipse(sx, sy, en.r * s * 1.05, en.r * s * .52, 0, 0, 7); g.stroke(); g.globalAlpha = 1;
  }
  const face = en.face;
  g.save();
  g.globalAlpha = alpha;
  g.translate(sx, sy - lift - drop);
  g.rotate(rot);
  g.scale(face * sxs, sys);
  if (en.stun > 0) g.globalAlpha = alpha * (.75 + Math.sin(now / 40) * .25);
  g.drawImage(sp.c, -sp.w / 2, -sp.h, sp.w, sp.h);
  if (en.flash > 0) { g.globalAlpha = (en.flash / .12) * .7; g.drawImage(sp.white, -sp.w / 2, -sp.h, sp.w, sp.h); }
  g.restore();
  if (en.stun > 0) {
    g.strokeStyle = '#9fe8ff'; g.lineWidth = 2;
    for (let i = 0; i < 3; i++) { const a = now / 120 + i * 2.1; g.beginPath(); g.arc(sx + Math.cos(a) * s * .4, sy - lift - hpx * .9 + Math.sin(a) * s * .15, s * .08, 0, 7); g.stroke(); }
  }
}
function drawUnitBars(g, en) {
  if (en.deploy > 0) return;
  const always = en.kind === 'building';
  if (en.hp >= en.maxHp - .5 && !always) return;
  const s = L.s; const [sx, sy0] = W2S(en.x, en.y);
  const lift = en.air ? s * 1.25 : 0;
  const hpx = unitHeight(en);
  const w = clamp(en.r * 2.4, .9, 2.2) * s, h = Math.max(4, s * .2);
  const x = sx - w / 2, y = sy0 - lift - hpx * .88 - h - 2;
  const [c1] = barCol(en.team);
  g.fillStyle = 'rgba(0,0,0,.7)'; g.fillRect(x - 1, y - 1, w + 2, h + 2);
  g.fillStyle = c1; g.fillRect(x, y, w * clamp(en.hp / en.maxHp, 0, 1), h);
}

const PROJ_COL = { arrow: '#f5e6c8', tea: '#a5682a', spit: '#ffffff', fire: '#ff8a1c', popcorn: '#fff3a8', spud: '#c79a5a', ball: '#2b2b2b' };
function drawProj(g, p, now) {
  if (p.delay > 0) return;
  const s = L.s;
  const [sx, sy] = W2S(p.x, p.y);
  if (p.spell) {
    const total = Math.hypot(p.tx - p.sx, p.ty - p.sy) || 1, k = 1 - Math.hypot(p.tx - p.x, p.ty - p.y) / total;
    const z = Math.sin(k * Math.PI) * s * (p.kind === 'meatball' ? 4 : 3) + (1 - k) * s * 1.5;
    g.fillStyle = 'rgba(0,0,0,.25)'; g.beginPath(); g.ellipse(sx, sy, s * .6, s * .3, 0, 0, 7); g.fill();
    if (p.kind === 'meatball') {
      const sp = sprite('meatball', s * 1.6);
      if (sp) { g.save(); g.translate(sx, sy - z); g.rotate(Math.atan2(sy - W2S(p.sx, p.sy)[1], sx - W2S(p.sx, p.sy)[0]) + Math.PI); g.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h); g.restore(); }
    } else {
      g.save(); g.translate(sx, sy - z);
      g.strokeStyle = '#e8eef5'; g.lineWidth = Math.max(1.5, s * .08);
      for (let i = 0; i < 9; i++) {
        const ox = (hash(i, p.delay * 10 + 1) - .5) * s * 2.2, oy = (hash(i + 3, 2) - .5) * s * 1.6;
        g.beginPath(); g.moveTo(ox, oy - s * .35); g.lineTo(ox, oy + s * .3); g.stroke();
        g.beginPath(); g.moveTo(ox - s * .1, oy + s * .3); g.lineTo(ox - s * .1, oy + s * .45); g.moveTo(ox + s * .1, oy + s * .3); g.lineTo(ox + s * .1, oy + s * .45); g.stroke();
      }
      g.restore();
    }
    return;
  }
  const total = Math.hypot(p.tx - p.sx, p.ty - p.sy) || 1, k = clamp(1 - Math.hypot(p.tx - p.x, p.ty - p.y) / total, 0, 1);
  const z = (p.sz * (1 - k) + (p.target && p.target.air ? 1.2 : .5) * k) * s + Math.sin(k * Math.PI) * s * (p.kind === 'spud' || p.kind === 'ball' ? 1.2 : .3);
  const y = sy - z;
  const col = PROJ_COL[p.kind] || '#fff';
  if (p.kind === 'arrow' || p.kind === 'tea') {
    const [tx, ty] = W2S(p.tx, p.ty), a = Math.atan2(ty - sy, tx - sx);
    g.save(); g.translate(sx, y); g.rotate(a);
    g.strokeStyle = col; g.lineWidth = Math.max(1.5, s * .09); g.beginPath(); g.moveTo(-s * .45, 0); g.lineTo(s * .2, 0); g.stroke();
    g.fillStyle = p.kind === 'tea' ? '#e0b070' : '#d8d8d8'; g.beginPath(); g.moveTo(s * .32, 0); g.lineTo(s * .12, -s * .1); g.lineTo(s * .12, s * .1); g.fill();
    g.restore();
  } else if (p.kind === 'fire') {
    g.fillStyle = 'rgba(255,140,30,.35)'; g.beginPath(); g.arc(sx, y, s * .42, 0, 7); g.fill();
    g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(sx, y, s * .22, 0, 7); g.fill();
  } else if (p.kind === 'popcorn') {
    for (let i = 0; i < 4; i++) { g.fillStyle = i % 2 ? '#fff6c2' : '#ffd84a'; g.beginPath(); g.arc(sx + Math.cos(now / 60 + i * 1.6) * s * .18, y + Math.sin(now / 60 + i * 1.6) * s * .18, s * .14, 0, 7); g.fill(); }
    g.fillStyle = 'rgba(255,120,30,.35)'; g.beginPath(); g.arc(sx, y, s * .38, 0, 7); g.fill();
  } else if (p.kind === 'spud') {
    g.save(); g.translate(sx, y); g.rotate(now / 80); g.fillStyle = '#b98a4e'; g.beginPath(); g.ellipse(0, 0, s * .26, s * .18, 0, 0, 7); g.fill();
    g.fillStyle = '#8a6232'; g.beginPath(); g.arc(s * .07, -s * .04, s * .03, 0, 7); g.fill(); g.restore();
  } else {
    g.fillStyle = col; g.beginPath(); g.arc(sx, y, s * (p.kind === 'ball' ? .22 : .14), 0, 7); g.fill();
    if (p.kind === 'ball') { g.fillStyle = 'rgba(255,255,255,.4)'; g.beginPath(); g.arc(sx - s * .06, y - s * .06, s * .07, 0, 7); g.fill(); }
  }
}

function drawFx(g, f) {
  const s = L.s, [sx, sy] = W2S(f.x, f.y), k = f.t / f.life;
  switch (f.type) {
    case 'ring': case 'land': {
      g.strokeStyle = f.col || 'rgba(255,255,255,.8)'; g.globalAlpha = 1 - k; g.lineWidth = Math.max(2, s * .15);
      g.beginPath(); g.ellipse(sx, sy, f.r * s * (.5 + k), f.r * s * .5 * (.5 + k), 0, 0, 7); g.stroke(); g.globalAlpha = 1; break;
    }
    case 'target': {
      g.globalAlpha = .55 * (1 - k * .5); g.strokeStyle = f.col; g.lineWidth = 2; g.setLineDash([6, 5]);
      g.beginPath(); g.ellipse(sx, sy, f.r * s, f.r * s * (L.land ? 1 : 1), 0, 0, 7); g.stroke(); g.setLineDash([]); g.globalAlpha = 1; break;
    }
    case 'zap': {
      g.globalAlpha = 1 - k; g.fillStyle = 'rgba(140,220,255,.25)'; g.beginPath(); g.arc(sx, sy, f.r * s, 0, 7); g.fill();
      g.strokeStyle = '#d8f6ff'; g.lineWidth = Math.max(2, s * .12);
      for (let i = 0; i < 7; i++) {
        let a = hash(i, Math.floor(f.t * 30)) * 7, x = sx, y = sy;
        g.beginPath(); g.moveTo(x, y - s * 3);
        for (let j = 0; j < 5; j++) { x = sx + Math.cos(a) * f.r * s * (j / 5) + rnd(-s * .3, s * .3); y = sy + Math.sin(a) * f.r * s * (j / 5) * .7 - s * 3 * (1 - j / 4); g.lineTo(x, y); }
        g.stroke();
      }
      g.globalAlpha = 1; break;
    }
    case 'boom': {
      g.globalAlpha = 1 - k;
      g.fillStyle = k < .3 ? '#fff3b0' : '#ff8a1c';
      g.beginPath(); g.ellipse(sx, sy, f.r * s * (.4 + k * .8), f.r * s * (.3 + k * .5), 0, 0, 7); g.fill();
      g.fillStyle = 'rgba(90,80,80,.6)';
      for (let i = 0; i < 6; i++) { const a = i * 1.05; g.beginPath(); g.arc(sx + Math.cos(a) * f.r * s * k * .8, sy + Math.sin(a) * f.r * s * k * .5 - k * s, s * (.5 + k * .6), 0, 7); g.fill(); }
      g.globalAlpha = 1; break;
    }
    case 'debris': {
      g.globalAlpha = 1 - k * k; g.fillStyle = f.col;
      g.fillRect(sx - f.s * s / 2, sy - f.z * s * .5 - f.s * s / 2, f.s * s, f.s * s); g.globalAlpha = 1; break;
    }
    case 'poof': {
      g.globalAlpha = (1 - k) * .8; g.fillStyle = '#fff';
      for (let i = 0; i < 5; i++) { const a = i * 1.3; g.beginPath(); g.arc(sx + Math.cos(a) * f.r * s * k, sy - s * .4 + Math.sin(a) * f.r * s * k * .6, s * .3 * (1 - k * .5), 0, 7); g.fill(); }
      g.globalAlpha = 1; break;
    }
    case 'spark': { g.globalAlpha = 1 - k; g.fillStyle = f.col; g.fillRect(sx - 2, sy - s * .5 - 2, 4, 4); g.globalAlpha = 1; break; }
    case 'hit': {
      g.globalAlpha = 1 - k; g.fillStyle = f.big ? '#ffe46b' : '#fff';
      const r = s * (f.small ? .25 : f.big ? .7 : .4) * (1 + k);
      g.save(); g.translate(sx, sy - s * .6); g.rotate(k * 2);
      g.beginPath(); for (let i = 0; i < 10; i++) { const rr2 = i % 2 ? r * .4 : r; g.lineTo(Math.cos(i * Math.PI / 5) * rr2, Math.sin(i * Math.PI / 5) * rr2); } g.closePath(); g.fill();
      g.restore(); g.globalAlpha = 1; break;
    }
    case 'spin': {
      g.globalAlpha = 1 - k; g.strokeStyle = '#fff'; g.lineWidth = Math.max(2, s * .2);
      g.beginPath(); g.ellipse(sx, sy - s * .3, f.r * s, f.r * s * .5, 0, k * 6, k * 6 + 4.2); g.stroke(); g.globalAlpha = 1; break;
    }
    case 'splash': {
      g.globalAlpha = (1 - k) * .7; g.fillStyle = f.kind === 'popcorn' ? '#ffcf4a' : '#ff8a1c';
      g.beginPath(); g.ellipse(sx, sy, f.r * s * (.5 + k * .5), f.r * s * .5 * (.5 + k * .5), 0, 0, 7); g.fill(); g.globalAlpha = 1; break;
    }
    case 'forkhit': {
      g.globalAlpha = (1 - k) * .9; g.strokeStyle = '#eef4fb'; g.lineWidth = Math.max(1.5, s * .08);
      for (let i = 0; i < 14; i++) {
        const a = hash(i, 5) * 7, d = Math.sqrt(hash(i, 6)) * f.r * s, x = sx + Math.cos(a) * d, y = sy + Math.sin(a) * d * .8;
        g.beginPath(); g.moveTo(x, y - s * .45 * (1 - k)); g.lineTo(x, y); g.stroke();
      }
      g.globalAlpha = 1; break;
    }
    case 'card': {
      const cw = s * 1.5, ch = cw * 1.2, a = k < .7 ? 1 : (1 - k) / .3;
      const flip = !L.land && f.team === 1 && B.mode !== 'bot';
      g.globalAlpha = a; g.save(); g.translate(sx, sy - s * 2.2 - k * s * .8); if (flip) g.rotate(Math.PI);
      g.drawImage(cardCanvas(f.key, cw, ch), -cw / 2, -ch / 2, cw, ch); g.restore(); g.globalAlpha = 1; break;
    }
    case 'wake': { g.globalAlpha = 1 - k; txt(g, '!', sx, sy - s * 4 - k * s, s * 1.4, '#ffd84a'); g.globalAlpha = 1; break; }
  }
}

function drawGhosts(g, now) {
  for (const [, d] of drags) {
    if (!d.moved || d.cancelled) continue;
    const key = B.hand[d.team][d.slot]; if (!key) continue;
    const c = CARDS[key];
    if (!d.over) {
      // card follows the finger
      const pn = L.panels[d.team], cw = pn.slots[0].w * .9, ch = cw * 1.2;
      g.globalAlpha = .9; g.save(); g.translate(d.x, d.y); if (pn.rot) g.rotate(pn.rot);
      g.drawImage(cardCanvas(key, cw, ch), -cw / 2, -ch / 2, cw, ch); g.restore(); g.globalAlpha = 1;
      continue;
    }
    drawPlacementPreview(g, d.team, key, d.wx, d.wy, now);
  }
  // selected-card hover not shown (no hover on touch)
  if (B.denied) { B.denied.t += 1 / 60; if (B.denied.t > .5) B.denied = null; else { const [sx, sy] = W2S(B.denied.x, B.denied.y); g.globalAlpha = 1 - B.denied.t * 2; txt(g, '✕', sx, sy, L.s * 1.2, '#ff5050'); g.globalAlpha = 1; } }
}
function drawPlacementPreview(g, team, key, wx, wy, now) {
  const c = CARDS[key], s = L.s, ok = canDeploy(team, key, wx, wy) && B.elixir[team] >= c.cost;
  const [sx, sy] = W2S(wx, wy);
  if (c.type === 'spell') {
    g.fillStyle = ok ? 'rgba(255,255,255,.18)' : 'rgba(255,60,60,.2)';
    g.strokeStyle = ok ? 'rgba(255,255,255,.9)' : 'rgba(255,80,80,.9)'; g.lineWidth = 2;
    g.beginPath(); g.arc(sx, sy, c.radius * s, 0, 7); g.fill(); g.stroke();
    const sp = sprite(c.art, s * 1.6); if (sp) { g.globalAlpha = .85; g.drawImage(sp.c, sx - sp.w / 2, sy - sp.h / 2, sp.w, sp.h); g.globalAlpha = 1; }
    return;
  }
  if (c.range > 2) { g.strokeStyle = 'rgba(255,255,255,.35)'; g.setLineDash([5, 5]); g.lineWidth = 1.5; g.beginPath(); g.arc(sx, sy, (c.range + c.r) * s, 0, 7); g.stroke(); g.setLineDash([]); }
  const f = formation(c.count), m = team === 0 ? 1 : -1;
  for (const [dx, dy] of f) {
    const [px, py] = W2S(wx + dx, wy + dy * m);
    const sp = sprite(c.art, c.h * s * VIS); if (!sp) continue;
    g.globalAlpha = .55; g.drawImage(sp.c, px - sp.w / 2, py - sp.h - (c.air ? s * 1.25 : 0), sp.w, sp.h); g.globalAlpha = 1;
  }
  g.strokeStyle = ok ? '#fff' : '#ff4b4b'; g.lineWidth = 2;
  g.beginPath(); g.ellipse(sx, sy, s * .6, s * .3, 0, 0, 7); g.stroke();
  if (!ok) txt(g, B.elixir[team] < c.cost ? 'Not enough elixir' : 'Not here', sx, sy + s * .9, s * .55, '#ff8080');
}

function drawEmotes(g) {
  for (const em of B.emotes) {
    const k = kingOf(em.team); if (!k) continue;
    const [sx, sy] = W2S(k.x, k.y), s = L.s;
    const pop = Math.min(1, em.t * 6) * (em.t > 1.9 ? Math.max(0, 1 - (em.t - 1.9) * 3.3) : 1);
    const sz = s * 3.3 * (0.6 + .4 * pop);
    const im = IMG[EMOTES[em.k]]; if (!im) continue;
    const sp = sprite(EMOTES[em.k], sz);
    let x = sx + (L.land ? (em.team === 0 ? s * 2.6 : -s * 2.6) : s * 3.2), y = sy - s * 3.6 + Math.sin(em.t * 6) * 2;
    g.globalAlpha = pop;
    g.fillStyle = '#fff'; g.strokeStyle = '#223'; g.lineWidth = 2;
    g.beginPath(); g.ellipse(x, y, sp.w * .62, sp.h * .6, 0, 0, 7); g.fill(); g.stroke();
    if (L.land || em.team === 0) g.drawImage(sp.c, x - sp.w / 2, y - sp.h / 2, sp.w, sp.h);
    else { g.save(); g.translate(x, y); g.rotate(Math.PI); g.drawImage(sp.c, -sp.w / 2, -sp.h / 2, sp.w, sp.h); g.restore(); }
    g.globalAlpha = 1;
  }
}

// ---------- player panels ----------
function drawPanel(g, p, now) {
  g.save();
  if (p.rot) { g.translate(p.x + p.w, p.y + p.h); g.rotate(Math.PI); } else g.translate(p.x, p.y);
  const { w, h } = p, team = p.team, human = humanTeams().includes(team);
  // background
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#34406e'); bg.addColorStop(1, '#1a1f3d');
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = TEAM_COL[team]; g.globalAlpha = .9;
  if (p.orient === 'col') g.fillRect(team === 0 ? w - 4 : 0, 0, 4, h); else g.fillRect(0, 0, w, 3);
  g.globalAlpha = 1;
  if (p.orient === 'mini') {
    const sp = sprite('emote-angry', h * .8);
    if (sp) g.drawImage(sp.c, p.pad, (h - sp.h) / 2, sp.w, sp.h);
    txt(g, 'Bot', p.pad + (sp ? sp.w : 0) + 8, h / 2, Math.min(22, h * .42), TEAM_LIGHT[1], 'left');
    drawElixir(g, p, now); g.restore(); return;
  }
  drawHud(g, p, now);
  // next card
  const nk = B.queue[team][0];
  if (p.next && nk) {
    const r = p.next;
    if (human) { g.globalAlpha = .9; g.drawImage(cardCanvas(nk, r.w, r.h), r.x, r.y, r.w, r.h); g.globalAlpha = 1; }
    else drawCardBack(g, r.x, r.y, r.w, r.h);
    txt(g, 'Next', r.x + r.w / 2, r.y + r.h + Math.max(8, r.w * .18), Math.max(9, r.w * .22), '#cfd8ff');
  }
  // hand
  const el = B.elixir[team];
  p.slots.forEach((r, i) => {
    const key = B.hand[team][i];
    if (!key) return;
    let dragging = false;
    for (const [, d] of drags) if (d.team === team && d.slot === i && d.moved && !d.cancelled) dragging = true;
    const sel = B.sel[team] === i;
    const y = r.y - (sel ? r.h * .1 : 0);
    if (!human) { drawCardBack(g, r.x, r.y, r.w, r.h); return; }
    if (dragging) { g.globalAlpha = .35; }
    const cost = CARDS[key].cost;
    if (el >= cost) g.drawImage(cardCanvas(key, r.w, r.h), r.x, y, r.w, r.h);
    else {
      g.drawImage(cardCanvas(key, r.w, r.h, true), r.x, y, r.w, r.h);
      const k = el / cost;
      g.save(); g.beginPath(); g.rect(r.x, y + r.h * (1 - k), r.w, r.h * k); g.clip();
      g.globalAlpha *= .55; g.drawImage(cardCanvas(key, r.w, r.h), r.x, y, r.w, r.h); g.restore();
    }
    g.globalAlpha = 1;
    if (sel) { g.strokeStyle = '#fff'; g.lineWidth = 3; rr(g, r.x - 2, y - 2, r.w + 4, r.h + 4, r.w * .13); g.stroke(); }
  });
  drawElixir(g, p, now);
  // emote button + picker
  if (p.emote && human) {
    const e = p.emote;
    g.fillStyle = 'rgba(255,255,255,.14)'; g.beginPath(); g.arc(e.x, e.y, e.r, 0, 7); g.fill();
    const sp = sprite('emote-laugh', e.r * 1.6);
    if (sp) g.drawImage(sp.c, e.x - sp.w / 2, e.y - sp.h / 2, sp.w, sp.h);
    if (B.emotePick === team) {
      const rs = emoteRects(p);
      g.fillStyle = 'rgba(10,14,40,.92)'; const r0 = rs[0], rl = rs[rs.length - 1];
      rr(g, r0.x - 6, r0.y - 6, rl.x + rl.w - r0.x + 12, r0.h + 12, 10); g.fill();
      rs.forEach((r, i) => { const sp2 = sprite(EMOTES[i], r.h); if (sp2) g.drawImage(sp2.c, r.x + (r.w - sp2.w) / 2, r.y, sp2.w, sp2.h); });
    }
  }
  g.restore();
}
function drawCardBack(g, x, y, w, h) {
  rr(g, x, y, w, h, w * .12); g.fillStyle = '#5a2a2e'; g.fill();
  rr(g, x + 3, y + 3, w - 6, h - 6, w * .1); g.fillStyle = '#8c3a40'; g.fill();
  txt(g, '?', x + w / 2, y + h / 2, w * .45, '#ffd0d4', 'center', '#3a1215');
}
function drawElixir(g, p, now) {
  const r = p.elx, team = p.team, el = B.elixir[team];
  const x = r.x + r.h * .9, w = r.w - r.h * .9;
  g.fillStyle = '#120a25'; rr(g, x, r.y, w, r.h, r.h * .35); g.fill();
  const segs = 10, gw = w / segs;
  const full = Math.floor(el), frac = el - full;
  const gr = g.createLinearGradient(0, r.y, 0, r.y + r.h); gr.addColorStop(0, '#f78cff'); gr.addColorStop(.5, '#d53fe0'); gr.addColorStop(1, '#8e1ea8');
  g.fillStyle = gr;
  if (full > 0) { rr(g, x + 1.5, r.y + 1.5, gw * full - 3, r.h - 3, r.h * .3); g.fill(); }
  if (full < 10) { g.globalAlpha = .55; g.fillRect(x + gw * full + 1.5, r.y + 1.5, Math.max(0, gw * frac - 2), r.h - 3); g.globalAlpha = 1; }
  g.strokeStyle = 'rgba(0,0,0,.45)'; g.lineWidth = 1;
  for (let i = 1; i < segs; i++) { g.beginPath(); g.moveTo(x + gw * i, r.y + 2); g.lineTo(x + gw * i, r.y + r.h - 2); g.stroke(); }
  drawDrop(g, r.x + r.h * .55, r.y + r.h * .45, r.h * .55, full);
  const m = B.phase === 'play' ? elixirMult() : 1;
  if (m > 1) txt(g, 'x' + m, x + w - r.h * .6, r.y + r.h / 2, r.h * .7, '#ffe36b');
}
function drawHud(g, p, now) {
  const r = p.hud, team = p.team, other = 1 - team;
  const big = p.orient === 'col';
  const fs = big ? Math.min(r.h * .38, 22) : r.h * .72;
  // timer
  const tl = B.phase === 'countdown' ? REG_TIME : timeLeft();
  const label = B.ot ? 'Overtime' : 'Time left';
  const urgent = B.phase === 'play' && tl <= 10;
  const tcol = B.ot ? '#ffb04d' : urgent ? '#ff6b6b' : '#fff';
  if (big) {
    txt(g, label, r.x + r.w / 2, r.y + fs * .5, fs * .62, '#cfd8ff', 'center', '#000');
    txt(g, fmtTime(tl), r.x + r.w / 2, r.y + fs * 1.45, fs * 1.15 * (urgent ? 1 + Math.abs(Math.sin(now / 200)) * .1 : 1), tcol);
    // crowns: mine vs theirs
    const cy = r.y + r.h - fs * .45;
    drawCrownIcon(g, r.x + r.w * .2, cy, fs * .45, TEAM_COL[team]); txt(g, String(B.crowns[team]), r.x + r.w * .35, cy, fs * .85);
    drawCrownIcon(g, r.x + r.w * .65, cy, fs * .45, TEAM_COL[other]); txt(g, String(B.crowns[other]), r.x + r.w * .8, cy, fs * .85);
  } else {
    const cy = r.y + r.h / 2;
    drawCrownIcon(g, r.x + fs * .5, cy, fs * .42, TEAM_COL[team]); txt(g, String(B.crowns[team]), r.x + fs * 1.25, cy, fs * .8, '#fff', 'left');
    drawCrownIcon(g, r.x + fs * 2.6, cy, fs * .42, TEAM_COL[other]); txt(g, String(B.crowns[other]), r.x + fs * 3.35, cy, fs * .8, '#fff', 'left');
    txt(g, fmtTime(tl), r.x + r.w - 2, cy, fs * .9, tcol, 'right');
    txt(g, label, r.x + r.w - fs * 2.9, cy, fs * .52, '#cfd8ff', 'right');
    const who = B.mode === 'bot' ? (team === 0 ? 'You' : 'Bot') : (team === 0 ? 'Blue' : 'Red');
    txt(g, who, r.x + r.w * .42, cy, fs * .62, TEAM_LIGHT[team], 'center');
  }
}

function drawOverlays(g, now) {
  // centered texts per viewer orientation
  const views = L.land || B.mode === 'bot' ? [{ x: L.W / 2, y: L.H / 2, rot: 0 }] :
    [{ x: L.W / 2, y: L.oy + L.s * AH * .72, rot: 0 }, { x: L.W / 2, y: L.oy + L.s * AH * .28, rot: Math.PI }];
  const s = L.s;
  for (const v of views) {
    g.save(); g.translate(v.x, v.y); g.rotate(v.rot);
    if (B.phase === 'countdown') {
      const n = Math.ceil(B.cd);
      const k = B.cd - Math.floor(B.cd);
      if (n <= 3 && n >= 1) { g.globalAlpha = Math.min(1, k * 3); txt(g, String(n), 0, 0, s * 4 * (1 + (1 - k) * .3), '#fff', 'center', '#1b2a6b'); g.globalAlpha = 1; }
      txt(g, 'Drag cards onto your side of the arena', 0, s * 3.4, s * .75, '#fff');
    }
    for (const bn of B.banners) {
      const k = bn.t / bn.life, a = k < .15 ? k / .15 : k > .8 ? (1 - k) / .2 : 1;
      const sc = k < .15 ? .6 + .4 * (k / .15) : 1;
      g.globalAlpha = a;
      g.fillStyle = 'rgba(0,0,0,.45)'; g.fillRect(-L.W, -s * 1.6, L.W * 2, s * 3.2);
      txt(g, bn.txt, 0, -s * .35, s * 1.9 * sc, bn.col, 'center', '#000');
      if (bn.sub) txt(g, bn.sub, 0, s * 1, s * .8, '#fff');
      g.globalAlpha = 1;
    }
    g.restore();
  }
}
