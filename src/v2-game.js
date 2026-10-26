
/* ---------------- basics ---------------- */
const SHARE_URL = 'https://claude.ai/artifact/LT7ek5Hk4ATwwb1xTjwn77';
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v,a,b) => v<a?a:v>b?b:v;
const lerp = (a,b,t) => a+(b-a)*t;
const W = 1600, H = 1066, HERO_H = 112, BODY_Y = 50, HIT_R = 36, G = 520;
// shot physics fitted to DDTank's force charts (20, 30, 50 and 65 degrees): speed grows with Force and air drag slows the shell.
// It also makes DDTank's sky shot work: Force 95, angle = 90 - distance, plus or minus 2 degrees for each point of wind.
const UNIT = 110, SPD = 30.31, SHOT_G = 1360, DRAG = .2908, WIND_A = 47, CHARGE_RATE = 45, SKY_FORCE = 95;
const store = {
  get(k,d){ try{ const v = localStorage.getItem('arcfall.'+k); return v ? JSON.parse(v) : d; }catch{ return d; } },
  set(k,v){ try{ localStorage.setItem('arcfall.'+k, JSON.stringify(v)); }catch{} }
};
function toast(msg, ms=2600){ const t = document.createElement('div'); t.className='toast'; t.textContent = msg; document.body.appendChild(t); setTimeout(()=>{ t.style.opacity=0; setTimeout(()=>t.remove(), 400); }, ms); }
function show(id, on=true){ $('#'+id).classList.toggle('on', on); }
function mulberry(a){ return function(){ a|=0; a=a+0x6D2B79F5|0; let t=Math.imul(a^a>>>15,1|a); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

/* ---------------- data ---------------- */
const CHARS = [
  {id:'juno', name:'Juno', role:'Sky Captain', hp:1000, atk:1.0, def:1.0, sta:1.0, col:'#ff7a3d', sup:'meteor', blurb:'Balanced flyer. Super calls a meteor shower.'},
  {id:'brick', name:'Brick', role:'Stone Golem', hp:1250, atk:0.95, def:1.2, sta:0.7, col:'#7fb069', sup:'quake', blurb:'Huge health, slow feet. Super blasts a giant crater.'},
  {id:'pip', name:'Pip', role:'Tinkerer', hp:850, atk:1.0, def:0.9, sta:1.5, col:'#53c3ff', sup:'drones', blurb:'Fast mover. Super sends three homing drones.'},
  {id:'nyx', name:'Nyx', role:'Moon Thief', hp:900, atk:1.2, def:0.85, sta:1.1, col:'#b48bff', sup:'lance', blurb:'Hits hardest. Super lance drills through rock.'},
  {id:'coco', name:'Coco', role:'Bloom Medic', hp:950, atk:0.9, def:1.0, sta:1.0, col:'#ff8fc7', sup:'bloom', blurb:'Team healer. Super blooms: hurts foes, heals friends.'},
  {id:'rex', name:'Rex', role:'Dino Rider', hp:1100, atk:1.1, def:1.0, sta:0.85, col:'#3ee6a8', sup:'cluster', blurb:'Tough brawler. Super scatters six bomblets.'},
];
const CH = Object.fromEntries(CHARS.map(c=>[c.id,c]));
const WEAPONS = {
  thunder:{name:'Thunder Shell', dmg:250, r:44, delay:0, grav:1, wind:1, desc:'Easy all-rounder, big boom', color:'#ffc45a'},
  splitter:{name:'Twin Splitter', dmg:140, r:32, delay:10, grav:1, wind:1, split:3, desc:'Splits into 3 at the top', color:'#7af0c8'},
  burrow:{name:'Burrower', dmg:230, r:40, delay:5, grav:1, wind:1, drill:80, desc:'Digs into the ground, then blows up', color:'#d8925a'},
  bounce:{name:'Bounce Bomb', dmg:220, r:40, delay:5, grav:1, wind:1, bounces:2, desc:'Bounces 2 times before it blows', color:'#ff7ab0'},
  comet:{name:'Comet Lance', dmg:285, r:28, delay:15, grav:1, wind:1, desc:'Small blast, huge damage on a direct hit', color:'#8fd8ff'},
  frost:{name:'Frost Orb', dmg:120, r:38, delay:0, grav:1, wind:1, freeze:true, desc:'Freezes them: they miss a turn', color:'#bfefff'},
};
const SUPERS = {
  meteor:{name:'Meteor Rain', dmg:110, r:32, grav:1, wind:1, meteor:5, color:'#ff7a3d'},
  quake:{name:'Earthshaker', dmg:360, r:100, grav:1, wind:1, color:'#c9a26b'},
  drones:{name:'Drone Swarm', dmg:165, r:32, grav:1, wind:.5, homing:true, count:3, color:'#53c3ff'},
  lance:{name:'Phantom Lance', dmg:400, r:34, grav:1, wind:1, drill:560, color:'#b48bff'},
  bloom:{name:'Heal Bloom', dmg:210, r:90, grav:1, wind:1, bloom:180, color:'#ff8fc7'},
  cluster:{name:'Cluster Rain', dmg:130, r:34, grav:1, wind:1, cluster:6, color:'#3ee6a8'},
};
const ICON = {
  encore:'<i class="bdg">x2</i>',
  triple:'<i class="bdg">x3</i>',
  power:'<i class="bdg">+50%</i>',
  heal:'<i class="bdg">+HP</i>',
  warp:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round"><path d="M12 3v4M12 17v4M3 12h4M17 12h4"/><circle cx="12" cy="12" r="3"/></svg>',
  shield:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6"><path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/></svg>',
};
const ITEMS = {
  encore:{name:'x2 Shots', short:'Shots', desc:'Fire 2 times this turn', delay:40, uses:2},
  triple:{name:'x3 Spread', short:'Spread', desc:'Fire 3 shells at once', delay:45, uses:2},
  power:{name:'+50% Power', short:'Power', desc:'This shot hits 50% harder', delay:35, uses:2},
  heal:{name:'Heal', short:'Heal', desc:'Get back 30% health now', delay:30, uses:2},
  warp:{name:'Teleport', short:'Teleport', desc:'You fly to where your shot lands', delay:40, uses:2},
  shield:{name:'Shield', short:'Shield', desc:'Take half damage until your next turn', delay:30, uses:2},
};
const EMOTES = ['GG', '\u{1F602}', '\u{1F621}', '\u{1F60E}', 'Nice!', 'Oops!'];
const stars = (v, max=5) => '★'.repeat(v) + '☆'.repeat(max-v);
const HATS = ['none']; const HAT_NAMES = {none:'None'}; const EYES = ['round'];
const PALETTE = ['#ff7a3d','#ff5d6c','#ff8fc7','#b48bff','#6b4bd6','#53c3ff','#2bb3a3','#3ee6a8','#7bd389','#ffd84a','#ffb23f','#f4efe6'];
const MAPS = {
  sunset:{name:'Sunspire Isles', short:'Sunspire', grass:[123,211,137], soil1:[214,140,84], soil2:[150,80,52], stone:[92,58,60], burn:'#3a1d16', water:['#ffb48a','#5a5fb0','#2a2a6a'], foam:'#fff2e0', sky:['#3a3a8a','#ff9a8a']},
  frost:{name:'Glacier Teeth', short:'Glacier', grass:[238,248,255], soil1:[150,196,230], soil2:[86,130,186], stone:[48,78,124], burn:'#1d2f4f', water:['#bfeaff','#3a7ab8','#103060'], foam:'#ffffff', sky:['#0d1b3d','#6fa8dc']},
  ember:{name:'Ember Forge', short:'Ember', grass:[255,170,70], soil1:[98,62,62], soil2:[62,40,50], stone:[36,24,32], burn:'#170b0b', water:['#ffd27a','#ff5a1f','#8a1a0a'], foam:'#ffe7a0', sky:['#12080f','#c2410c'], lava:true},
  candy:{name:'Sugar Reef', short:'Sugar', grass:[255,143,199], soil1:[255,214,130], soil2:[232,146,192], stone:[155,92,168], burn:'#5a2a4a', water:['#e0fffb','#58d0d6','#2a8a9a'], foam:'#ffffff', sky:['#5b3ea8','#ffc6e0']},
};

/* ---------------- assets ---------------- */
const IMG = {};
function loadImg(key, src){ src = (window.ASSET_DATA||{})[key] || src; return new Promise(res=>{ const im = new Image(); im.onload = ()=>{ IMG[key] = im; res(im); }; im.onerror = ()=>res(null); im.src = src; }); }
const heroURL = id => (window.ASSET_DATA||{})['hero-'+id] || `assets/hero-${id}.webp`;
const assetsReady = Promise.all([
  ...CHARS.map(c=>loadImg('hero-'+c.id, heroURL(c.id))),
  ...Object.keys(MAPS).flatMap(m=>[loadImg('bg-'+m, `assets/bg-${m}.webp`), loadImg('ground-'+m, `assets/ground-${m}.webp`)]),
  ...Object.keys(window.ASSET_DATA||{}).filter(k=>k.startsWith('skin-')).map(k=>loadImg(k, '')),
]);
/* ---------------- settings & slots ---------------- */
const settings = Object.assign({map:'sunset', mode:'ffa', timer:20, wind:'normal', guide:'short', hp:1, view:'follow'}, store.get('settings', {}));
if(!store.get('v7view')){ settings.view = 'follow'; store.set('v7view', 1); store.set('settings', settings); }
if(!store.get('v8chart')){ settings.chart = false; store.set('v8chart', 1); store.set('settings', settings); } // the chart now starts closed so it never covers a hero
const MAXP = 8;
const BOT_NAMES = ['Ace','Blitz','Comet','Dash','Echo','Flare','Gale','Hex'];
function defaultLook(i){ const c = CHARS[i % CHARS.length]; return {name:BOT_NAMES[i % 8], ch:c.id, c1:PALETTE[(i*5) % PALETTE.length] || c.col, c2:'#ffd84a', hat:'none', eyes:'round', wpn:['thunder','splitter','bounce','thunder','splitter','bounce','thunder','splitter'][i % 8], items:['encore','power','heal']}; }
let slots = store.get('slots3', null);
if(!Array.isArray(slots) || slots.length!==MAXP){ const old = store.get('slots2', null); slots = Array.from({length:MAXP}, (_, i)=>(Array.isArray(old) && old[i]) ? old[i] : {ctl: i===0?'local': i===1?'bot':'empty', bot:'normal', look:defaultLook(i), peer:null}); }
slots.forEach((s,i)=>{ s.peer=null; if(s.ctl==='phone') s.ctl='empty'; if(!s.look) s.look = defaultLook(i); if(!CH[s.look.ch]) s.look.ch='juno'; if(!s.bot) s.bot='normal'; });
function saveSlots(){ store.set('slots3', slots.map(s=>({ctl:s.ctl==='phone'?'empty':s.ctl, bot:s.bot, look:s.look}))); }
const faceCSS = id => `url(${heroURL(id)})`;

/* ================= LOOKS: skins, wings, auras, trails, booms, frames, titles ================= */
const RAR = {c:{n:'Common', col:'#cfc6ea', d:'#5a4f7a'}, r:{n:'Rare', col:'#5cc8ff', d:'#1a5a94'}, e:{n:'Epic', col:'#c98bff', d:'#5a2a94'}, l:{n:'Legendary', col:'#ffc83a', d:'#8a4a06'}};
const PRICE = {c:0, r:600, e:1800, l:4500};
const LVREQ = {c:1, r:1, e:4, l:8};
const EPIC = {juno:'Sky Pirate', brick:'Frost Golem', pip:'Neon Racer', nyx:'Shadow Ninja', coco:'Candy Witch', rex:'Shark Diver'};
const LEGEND = {juno:['Solar Phoenix','#ffa62a','embers'], brick:['Obsidian Titan','#ff6a1a','lava'], pip:['Storm Engineer','#59d6ff','sparks'], nyx:['Void Empress','#b77bff','stars'], coco:['Sakura Seraph','#ff9fd2','petals'], rex:['Dragon King','#ff5a2a','embers']};
const SKINS = {};
CHARS.forEach(c=>{
  SKINS[c.id+':base'] = {id:c.id+':base', hero:c.id, name:'Classic', rar:'c', img:'hero-'+c.id};
  SKINS[c.id+':gold'] = {id:c.id+':gold', hero:c.id, name:'Golden Statue', rar:'r', img:'hero-'+c.id, map:'gold'};
  SKINS[c.id+':shade'] = {id:c.id+':shade', hero:c.id, name:'Shadow Clone', rar:'r', img:'hero-'+c.id, map:'shade'};
  SKINS[c.id+':epic'] = {id:c.id+':epic', hero:c.id, name:EPIC[c.id], rar:'e', img:'skin-'+c.id+'-epic'};
  SKINS[c.id+':leg'] = {id:c.id+':leg', hero:c.id, name:LEGEND[c.id][0], rar:'l', img:'skin-'+c.id+'-leg', glow:LEGEND[c.id][1], fx:LEGEND[c.id][2]};
});
const skinOK = id => { const s = SKINS[id]; return !!(s && (s.rar==='c' || s.map || (window.ASSET_DATA||{})[s.img] || IMG[s.img])); };
const COS = {
  wings:{ angel:{name:'Angel Wings', rar:'r'}, bat:{name:'Bat Wings', rar:'r'}, fairy:{name:'Fairy Wings', rar:'e'}, mecha:{name:'Mecha Wings', rar:'e'}, phoenix:{name:'Phoenix Wings', rar:'l'}, void:{name:'Void Wings', rar:'l'} },
  aura:{ sparkle:{name:'Sparkle', rar:'r'}, bubbles:{name:'Bubbles', rar:'r'}, flame:{name:'Flame Ring', rar:'e'}, frost:{name:'Frost Ring', rar:'e'}, volt:{name:'Thunder Ring', rar:'e'}, galaxy:{name:'Galaxy', rar:'l'}, royal:{name:'Royal Light', rar:'l'} },
  trail:{ rainbow:{name:'Rainbow', rar:'r'}, hearts:{name:'Hearts', rar:'r'}, fire:{name:'Fire Tail', rar:'e'}, zap:{name:'Lightning', rar:'e'}, stardust:{name:'Stardust', rar:'l'} },
  boom:{ confetti:{name:'Confetti Pop', rar:'r'}, fireworks:{name:'Fireworks', rar:'e'}, inferno:{name:'Inferno', rar:'e'}, blackhole:{name:'Black Hole', rar:'l'} },
  frame:{ silver:{name:'Silver Plate', rar:'r'}, gold:{name:'Gold Plate', rar:'r'}, diamond:{name:'Diamond Plate', rar:'e'}, royal:{name:'Royal Crown', rar:'l'} },
  title:{ boss:{name:'The Boss', rar:'r'}, sniper:{name:'Sky Sniper', rar:'r'}, untouchable:{name:'Untouchable', rar:'e'}, goat:{name:'The GOAT', rar:'l'} },
  emote:{ taunt:{name:'Taunt pack', rar:'r', list:['Too easy', '\u{1F60F}', 'Bye bye!', '\u{1F480}']}, hype:{name:'Hype pack', rar:'r', list:['\u{1F525}', "LET'S GO", '\u{1F44F}', 'WOW!']}, cute:{name:'Cute pack', rar:'r', list:['\u{1F97A}', '❤️', 'Sorry!', '\u{1F92A}']} },
};
const LEVEL_TITLES = [[1,'Rookie'],[3,'Gunner'],[6,'Sharpshooter'],[10,'Sky Ace'],[15,'Cannon Master'],[25,'Arcfall Legend']];
const EMOTE_ALL = EMOTES.concat(...Object.values(COS.emote).map(e=>e.list));
const WPN_UNLOCK = {thunder:[1,0], splitter:[1,0], bounce:[1,0], burrow:[3,500], comet:[5,900], frost:[7,1300]};
const WUP_COST = [300, 600, 1000, 1600, 2500];

/* ----- profiles: gold, level, owned and worn looks. Each device keeps its own. ----- */
const today = () => new Date().toISOString().slice(0,10);
const xpNeed = l => 250 + 120*(l-1);
function fixProfile(r, name){ r = r || {}; r.name = r.name || name || 'Player';
  for(const [k,v] of Object.entries({games:0, wins:0, kills:0, dmg:0, shots:0, hits:0, best:0, fav:{}, xp:0, lvl:1, gold:600, own:{}, eq:{}, wl:{}, day:'', dayWin:false})) if(r[k]===undefined) r[k] = typeof v==='object' ? {} : v;
  if(!r.eq.skin) r.eq.skin = {}; return r; }
function allProfiles(){ return store.get('profiles', {}); }
function profFor(name){ const k = (name||'Player').trim().slice(0,18) || 'Player'; const all = allProfiles(); return fixProfile(all[k], k); }
function saveProf(r){ const all = allProfiles(); all[r.name] = r; store.set('profiles', all); }
function myProf(){ return fixProfile(store.get('me', null), 'Player'); }
function saveMyProf(r){ store.set('me', r); }
const owns = (r, key) => !!(r.own[key]) || key.endsWith(':base');
function levelTitle(l){ let t = 'Rookie'; for(const [lv,n] of LEVEL_TITLES) if(l>=lv) t = n; return t; }
function wpnOpen(r, id){ const u = WPN_UNLOCK[id] || [1,0]; return r.lvl >= u[0] || owns(r, 'wpn:'+id); }
function cosFromProf(r, heroId, wpn){ const e = r.eq; const sk = e.skin[heroId]; const has = cat => e[cat] && COS[cat][e[cat]] && owns(r, cat+':'+e[cat]) ? e[cat] : '';
  return {sk: sk && skinOK(sk) && owns(r, 'skin:'+sk) ? sk : heroId+':base', wg:has('wings'), au:has('aura'), tr:has('trail'), bm:has('boom'), fr:has('frame'), ti:has('title'), wl:r.wl[wpn]||0, lv:r.lvl}; }
function randomCos(heroId, wpn, rng=Math.random){ const pick = (cat, p) => rng() < p ? Object.keys(COS[cat])[rng()*Object.keys(COS[cat]).length|0] : '';
  const roll = rng(); const v = roll < .1 ? 'leg' : roll < .2 ? 'epic' : roll < .32 ? 'shade' : roll < .42 ? 'gold' : 'base'; const sk = skinOK(heroId+':'+v) ? heroId+':'+v : heroId+':base';
  return {sk, wg:pick('wings',.35), au:pick('aura',.35), tr:pick('trail',.5), bm:pick('boom',.4), fr:pick('frame',.4), ti:'', wl:rng()*4|0, lv:1 + (rng()*18|0)}; }
function cleanCos(o, heroId){ o = o || {}; const s = v => typeof v==='string' ? v : '';
  const sk = s(o.sk); return {sk: SKINS[sk] && SKINS[sk].hero===heroId && skinOK(sk) ? sk : heroId+':base', wg:COS.wings[o.wg]?o.wg:'', au:COS.aura[o.au]?o.au:'', tr:COS.trail[o.tr]?o.tr:'', bm:COS.boom[o.bm]?o.bm:'', fr:COS.frame[o.fr]?o.fr:'', ti:COS.title[o.ti]?o.ti:'', wl:clamp(o.wl|0,0,5), lv:clamp(o.lv|0,1,99)}; }
function emoteList(r){ let l = EMOTES.map((t,i)=>i); Object.entries(COS.emote).forEach(([k,e])=>{ if(owns(r, 'emote:'+k)){ const base = EMOTE_ALL.indexOf(e.list[0]); e.list.forEach((t,j)=>l.push(base+j)); } }); return l; }

/* ----- sprites per skin (recolours are done pixel by pixel so they work on every browser) ----- */
const SPR = {};
function mkCanvas(w, h){ const c = document.createElement('canvas'); c.width = Math.max(1,w|0); c.height = Math.max(1,h|0); return c; }
function skinSprite(id){
  const sk = SKINS[id] && skinOK(id) ? SKINS[id] : SKINS[(id||'juno').split(':')[0]+':base'] || SKINS['juno:base'];
  if(SPR[sk.id]) return SPR[sk.id];
  const base = IMG['hero-'+sk.hero]; if(!IMG[sk.img] && sk.img!=='hero-'+sk.hero) return sk.rar==='c' ? null : skinSprite(sk.hero+':base'); const im = IMG[sk.img] || base; if(!im || !base) return null;
  const k = (HERO_H*2)/base.height; const w = Math.round(im.width*k), h = Math.round(im.height*k);
  const c = mkCanvas(w, h); const x = c.getContext('2d', {willReadFrequently:true}); x.imageSmoothingQuality = 'high'; x.drawImage(im, 0, 0, w, h);
  const data = x.getImageData(0, 0, w, h), d = data.data;
  if(sk.map){ for(let i=0;i<d.length;i+=4){ if(!d[i+3]) continue; const L = (d[i]*.3 + d[i+1]*.59 + d[i+2]*.11)/255; let r, g, b;
      if(sk.map==='gold'){ const v = Math.pow(L, .8); r = 70 + 190*v + (v>.8?40:0); g = 38 + 170*v; b = 8 + 60*v*v; }
      else { const v = Math.pow(L, 1.1); r = 18 + 120*v; g = 8 + 70*v; b = 48 + 200*v; if(d[i] > 200 && d[i+1] > 200 && d[i+2] > 200){ r = 255; g = 120; b = 255; } }
      d[i] = Math.min(255, r); d[i+1] = Math.min(255, g); d[i+2] = Math.min(255, b); } x.putImageData(data, 0, 0); }
  // stand the hero on their feet: anchor = middle of the bottom rows
  let sx = 0, n = 0; for(let yy=Math.floor(h*.86); yy<h; yy++) for(let xx=0; xx<w; xx++){ if(d[(yy*w+xx)*4+3] > 60){ sx += xx; n++; } }
  const ax = n ? sx/n/w : .5;
  const f = mkCanvas(w, h); const fx = f.getContext('2d'); fx.drawImage(c,0,0); fx.globalCompositeOperation='source-atop'; fx.fillStyle='#fff'; fx.fillRect(0,0,w,h);
  const g = mkCanvas(w, h); const gx = g.getContext('2d'); gx.drawImage(c, 0, 0); const gd = gx.getImageData(0,0,w,h); for(let i=0;i<gd.data.length;i+=4){ const L = gd.data[i]*.3 + gd.data[i+1]*.59 + gd.data[i+2]*.11; gd.data[i] = gd.data[i+1] = gd.data[i+2] = L*.8; } gx.putImageData(gd, 0, 0);
  let gl = null, pad = 0;
  if(sk.rar==='l'){ pad = 30; gl = mkCanvas(w + pad*2, h + pad*2); const glx = gl.getContext('2d'); const sil = mkCanvas(w, h); const sx2 = sil.getContext('2d'); sx2.drawImage(c,0,0); sx2.globalCompositeOperation='source-in'; sx2.fillStyle = sk.glow; sx2.fillRect(0,0,w,h);
    for(const [rr, a] of [[22,.09],[15,.13],[9,.2],[4,.32]]) for(let j=0;j<12;j++){ const an = j/12*Math.PI*2; glx.globalAlpha = a; glx.drawImage(sil, pad + Math.cos(an)*rr, pad + Math.sin(an)*rr); } }
  return SPR[sk.id] = {c, f, g, gl, pad, w:w/2, h:h/2, ax, sk, shim:null};
}
const skinURLCache = {};
function skinURL(id){ const sk = SKINS[id]; if(!sk) return heroURL('juno'); if(!sk.map) return (window.ASSET_DATA||{})[sk.img] || heroURL(sk.hero);
  if(skinURLCache[id]) return skinURLCache[id]; const s = skinSprite(id); if(!s) return heroURL(sk.hero); try{ return skinURLCache[id] = s.c.toDataURL('image/webp', .85); }catch{ return heroURL(sk.hero); } }
const skinFace = id => `url(${skinURL(id)})`;

/* ----- tiny stateless particle helpers (same look in the game and the shop preview) ----- */
const hash = i => { const v = Math.sin(i*127.1 + 311.7)*43758.5453; return v - Math.floor(v); };
const frac = v => v - Math.floor(v);
function star4(c, x, y, r){ c.beginPath(); c.moveTo(x, y - r); c.quadraticCurveTo(x, y, x + r, y); c.quadraticCurveTo(x, y, x, y + r); c.quadraticCurveTo(x, y, x - r, y); c.quadraticCurveTo(x, y, x, y - r); c.fill(); }
function heartPath(c, x, y, r){ c.beginPath(); c.moveTo(x, y + r*.9); c.bezierCurveTo(x - r*1.6, y - r*.2, x - r*.7, y - r*1.3, x, y - r*.45); c.bezierCurveTo(x + r*.7, y - r*1.3, x + r*1.6, y - r*.2, x, y + r*.9); c.fill(); }
function petal(c, x, y, r, rot){ c.save(); c.translate(x, y); c.rotate(rot); c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(r*.9, -r*.2, 0, r); c.quadraticCurveTo(-r*.9, -r*.2, 0, -r); c.fill(); c.restore(); }

/* ----- wings: drawn in the hero's own space (facing right, back is -x, up is -y) ----- */
const WING_AT = {juno:[-.05,-.62], brick:[-.02,-.6], pip:[-.06,-.6], nyx:[-.08,-.6], coco:[-.06,-.6], rex:[-.08,-.58]};
const WSTY = {
  angel:{a:'#ffffff', b:'#ffe7a3', e:'#b88a2c', glow:'#fff2b0'},
  phoenix:{a:'#fff27a', b:'#ff5a1a', e:'#8a1a06', glow:'#ff9a2a', fire:true},
  void:{a:'#3a2466', b:'#0d0820', e:'#b98cff', glow:'#9a5cff', stars:true},
};
function featherWing(c, S, st, t, far, flap){
  const arm = u => { const a = 1-u; return [a*a*0 + 2*a*u*(-S*.22) + u*u*(-S*.98), a*a*0 + 2*a*u*(-S*.95) + u*u*(-S*.62)]; };
  const N = 8; const rows = [[1, far ? st.e : st.b, st.a], [.58, st.a, st.b]];
  rows.forEach(([lk, c1, c2], ri)=>{
    for(let i=N-1;i>=0;i--){ const u = (i+.7)/(N+.2); const [rx, ry] = arm(u);
      let dx = lerp(-.25, -1, u), dy = lerp(1, .18, u); const m = Math.hypot(dx, dy); dx /= m; dy /= m;
      let L = S*(.42 + .62*u)*lk; if(st.fire) L *= 1 + .12*Math.sin(t*14 + i*1.7);
      const wd = S*(.11 + .05*u)*(ri ? .9 : 1); const px = -dy, py = dx;
      const g = c.createLinearGradient(rx, ry, rx + dx*L, ry + dy*L); g.addColorStop(0, c2); g.addColorStop(1, c1); c.fillStyle = g;
      c.beginPath(); c.moveTo(rx - px*wd*.4, ry - py*wd*.4); c.quadraticCurveTo(rx + dx*L*.55 + px*wd, ry + dy*L*.55 + py*wd, rx + dx*L, ry + dy*L); c.quadraticCurveTo(rx + dx*L*.5 - px*wd*.9, ry + dy*L*.5 - py*wd*.9, rx + px*wd*.4, ry + py*wd*.4); c.closePath(); c.fill();
      c.strokeStyle = st.e; c.globalAlpha *= .55; c.lineWidth = S*.018; c.stroke(); c.globalAlpha /= .55;
    } });
  c.strokeStyle = st.a; c.lineWidth = S*.07; c.lineCap = 'round'; c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(-S*.22, -S*.95, -S*.98, -S*.62); c.stroke();
  if(st.stars){ c.fillStyle = '#fff'; for(let i=0;i<7;i++){ const u = hash(i+3), v = hash(i+11); const tw = .5 + .5*Math.sin(t*5 + i*2.1); c.globalAlpha = tw; star4(c, -S*(.2 + .7*u), -S*(.1 + .7*v) + S*.35*u, S*.05*(.6+tw)); } c.globalAlpha = 1; }
}
function batWing(c, S, t, far){
  const tip = [-S*1.02, -S*.7], el = [-S*.32, -S*.92]; const fingers = [[-S*1.1, S*.05], [-S*.85, S*.22], [-S*.55, S*.3], [-S*.25, S*.22]];
  const g = c.createLinearGradient(0, -S, 0, S*.3); g.addColorStop(0, far ? '#4a2470' : '#7a3cc0'); g.addColorStop(1, far ? '#1e0c36' : '#3a1466'); c.fillStyle = g;
  c.beginPath(); c.moveTo(0, 0); c.quadraticCurveTo(el[0], el[1], tip[0], tip[1]); c.lineTo(fingers[0][0], fingers[0][1]);
  for(let i=1;i<fingers.length;i++){ const a = fingers[i-1], b = fingers[i]; c.quadraticCurveTo((a[0]+b[0])/2, (a[1]+b[1])/2 - S*.16, b[0], b[1]); }
  c.quadraticCurveTo(-S*.1, S*.02, 0, 0); c.closePath(); c.fill();
  c.strokeStyle = '#1a0830'; c.lineWidth = S*.045; c.lineCap = 'round'; c.beginPath(); c.moveTo(0,0); c.quadraticCurveTo(el[0], el[1], tip[0], tip[1]); fingers.forEach(f=>{ c.moveTo(tip[0]*.55, tip[1]*.7); c.lineTo(f[0], f[1]); }); c.stroke();
}
function mechaWing(c, S, t, far){
  for(let i=0;i<4;i++){ const a = -.25 - i*.32; const L = S*(1.05 - i*.12); c.save(); c.rotate(a + Math.PI);
    const g = c.createLinearGradient(0, -S*.1, 0, S*.1); g.addColorStop(0, far ? '#6a7690' : '#dfe8f5'); g.addColorStop(1, far ? '#2a3044' : '#7a88a4'); c.fillStyle = g;
    c.beginPath(); c.moveTo(0, -S*.07); c.lineTo(L*.85, -S*.11); c.lineTo(L, 0); c.lineTo(L*.85, S*.07); c.lineTo(0, S*.06); c.closePath(); c.fill(); c.strokeStyle = '#1a2236'; c.lineWidth = S*.02; c.stroke();
    c.globalCompositeOperation = 'lighter'; c.strokeStyle = '#4fd8ff'; c.globalAlpha = .6 + .4*Math.sin(t*6 + i); c.lineWidth = S*.025; c.beginPath(); c.moveTo(L*.15, 0); c.lineTo(L*.8, -S*.02); c.stroke(); c.globalAlpha = 1; c.globalCompositeOperation = 'source-over'; c.restore(); }
  c.fillStyle = '#3a4258'; c.beginPath(); c.arc(0, 0, S*.12, 0, 7); c.fill(); c.fillStyle = '#4fd8ff'; c.beginPath(); c.arc(0, 0, S*.05, 0, 7); c.fill();
}
function fairyWing(c, S, t, far){
  const lobes = [[-S*.5, -S*.5, S*.62, S*.2, -.75], [-S*.36, S*.02, S*.42, S*.13, .5]];
  lobes.forEach(([x, y, rx, ry, rot])=>{ c.save(); c.translate(x*.95, y); c.rotate(rot);
    const g = c.createRadialGradient(-rx*.3, 0, 2, 0, 0, rx); g.addColorStop(0, far ? 'rgba(140,240,255,.35)' : 'rgba(200,255,255,.7)'); g.addColorStop(.7, far ? 'rgba(160,120,255,.25)' : 'rgba(255,150,230,.45)'); g.addColorStop(1, 'rgba(255,255,255,.85)');
    c.fillStyle = g; c.beginPath(); c.ellipse(0, 0, rx, ry, 0, 0, 7); c.fill(); c.strokeStyle = 'rgba(255,255,255,.9)'; c.lineWidth = S*.02; c.stroke();
    c.strokeStyle = 'rgba(255,255,255,.5)'; c.beginPath(); c.moveTo(rx*.9, 0); c.lineTo(-rx*.7, -ry*.3); c.moveTo(rx*.9, 0); c.lineTo(-rx*.6, ry*.4); c.stroke(); c.restore(); });
  c.fillStyle = '#fff'; for(let i=0;i<4;i++){ const ph = frac(t*.6 + hash(i)); c.globalAlpha = Math.sin(ph*Math.PI); star4(c, -S*(.3 + .7*hash(i+5)), -S*(.9*hash(i+9)) + ph*S*.4, S*.06); } c.globalAlpha = 1;
}
function drawWings(c, id, S, t, flapK=1){
  if(!id || !COS.wings[id]) return;
  const sp = id==='fairy' ? 11 : id==='mecha' ? 2 : 4.2, amp = id==='mecha' ? .06 : .2;
  for(const far of [true, false]){
    c.save(); if(far){ c.translate(S*.12, -S*.08); c.scale(.86, .86); }
    const flap = Math.sin(t*sp + (far ? .5 : 0))*amp*flapK; c.rotate(-.12 + flap);
    if(id==='bat') batWing(c, S, t, far); else if(id==='mecha') mechaWing(c, S, t, far); else if(id==='fairy') fairyWing(c, S, t, far);
    else { const st = WSTY[id] || WSTY.angel;
      if(!far && (st.fire || st.stars)){ c.save(); c.globalCompositeOperation = 'lighter'; const gs = {...st, a:st.glow, b:st.glow, e:st.glow, stars:false}; const pulse = .5 + .5*Math.sin(t*6); c.globalAlpha = .14 + .06*pulse; featherWing(c, S*1.16, gs, t, far, flap); c.globalAlpha = .26 + .1*pulse; featherWing(c, S*1.07, gs, t, far, flap); c.restore(); }
      featherWing(c, S, st, t, far, flap); }
    c.restore(); }
}

/* ----- auras (around the feet and body, in screen space) ----- */
function drawAura(c, id, X, Y, z, t, layer){
  if(!id) return; const R = 46*z, Hh = 120*z; c.save();
  if(id==='sparkle'){ if(layer==='front'){ c.globalCompositeOperation='lighter'; for(let i=0;i<9;i++){ const ph = frac(t*.45 + hash(i)); c.globalAlpha = Math.sin(ph*Math.PI); c.fillStyle = i%3 ? '#fff4b0' : '#ffffff'; star4(c, X + Math.sin(hash(i+2)*9 + t)*R*1.1, Y - ph*Hh*1.1, (5 + 4*hash(i+4))*z); } } }
  else if(id==='bubbles'){ if(layer==='front'){ for(let i=0;i<8;i++){ const ph = frac(t*.35 + hash(i)); const r = (4 + 6*hash(i+3))*z; const x = X + Math.sin(hash(i+1)*7 + t*2 + ph*6)*R; const y = Y - ph*Hh*1.2;
      c.globalAlpha = Math.sin(ph*Math.PI)*.8; c.strokeStyle = '#bff4ff'; c.lineWidth = 1.5*z; c.beginPath(); c.arc(x, y, r, 0, 7); c.stroke(); c.fillStyle = 'rgba(190,240,255,.25)'; c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(x - r*.35, y - r*.35, r*.25, 0, 7); c.fill(); } } }
  else if(id==='flame' || id==='frost' || id==='volt' || id==='galaxy' || id==='royal'){
    const col = {flame:['#ffcf4a','#ff4a1a'], frost:['#e6fbff','#58b8ff'], volt:['#f2ffff','#3ad0ff'], galaxy:['#e8d6ff','#7a3cff'], royal:['#fff6c8','#ffb81a']}[id];
    const back = layer==='back';
    // ground ring (back half behind the hero, front half in front)
    c.globalCompositeOperation = 'lighter'; c.lineWidth = 5*z; const g = c.createLinearGradient(X - R, 0, X + R, 0); g.addColorStop(0, col[1]); g.addColorStop(.5, col[0]); g.addColorStop(1, col[1]); c.strokeStyle = g;
    c.globalAlpha = .75 + .25*Math.sin(t*4); c.beginPath(); c.ellipse(X, Y - 2*z, R*1.15, R*.32, 0, back ? Math.PI : 0, back ? Math.PI*2 : Math.PI); c.stroke();
    if(id==='flame'){ for(let i=0;i<12;i++){ const a = i/12*Math.PI*2 + t*.6; const fz = Math.sin(a) < 0; if(fz !== back) continue; const fx = X + Math.cos(a)*R*1.12, fy = Y - 2*z + Math.sin(a)*R*.3; const hgt = (18 + 14*Math.sin(t*9 + i*2.3))*z;
        const fg = c.createLinearGradient(0, fy, 0, fy - hgt); fg.addColorStop(0, '#ff5a1a'); fg.addColorStop(1, 'rgba(255,220,80,0)'); c.fillStyle = fg; c.globalAlpha = .85; c.beginPath(); c.moveTo(fx - 6*z, fy); c.quadraticCurveTo(fx - 4*z, fy - hgt*.6, fx + Math.sin(t*7 + i)*4*z, fy - hgt); c.quadraticCurveTo(fx + 4*z, fy - hgt*.6, fx + 6*z, fy); c.fill(); }
      if(!back) for(let i=0;i<6;i++){ const ph = frac(t*.7 + hash(i)); c.globalAlpha = 1 - ph; c.fillStyle = '#ffb04a'; c.beginPath(); c.arc(X + (hash(i+3)-.5)*R*2, Y - ph*Hh, 2.5*z, 0, 7); c.fill(); } }
    else if(id==='frost' && !back){ c.fillStyle = '#ffffff'; for(let i=0;i<9;i++){ const ph = frac(t*.25 + hash(i)); c.globalAlpha = Math.sin(ph*Math.PI); const x = X + (hash(i+6)-.5)*R*2.4 + Math.sin(t + i)*6*z, y = Y - Hh*1.15 + ph*Hh*1.1; c.save(); c.translate(x, y); c.rotate(t + i); c.fillRect(-4*z, -.8*z, 8*z, 1.6*z); c.rotate(1.05); c.fillRect(-4*z, -.8*z, 8*z, 1.6*z); c.rotate(1.05); c.fillRect(-4*z, -.8*z, 8*z, 1.6*z); c.restore(); } }
    else if(id==='volt' && !back){ const k = Math.floor(t*14); for(let j=0;j<2;j++){ const s = k*7 + j*31; if(hash(s) < .35) continue; c.globalAlpha = .9; c.beginPath(); let a = hash(s+1)*Math.PI*2; let x = X + Math.cos(a)*R, y = Y - 20*z - hash(s+2)*Hh*.8; c.moveTo(x, y); for(let q=0;q<5;q++){ x += (hash(s+q+5)-.5)*26*z; y -= (6 + hash(s+q+9)*12)*z; c.lineTo(x, y); } c.globalAlpha = .35; c.strokeStyle = '#3ad0ff'; c.lineWidth = 7*z; c.stroke(); c.globalAlpha = .95; c.strokeStyle = '#e8feff'; c.lineWidth = 2.2*z; c.stroke(); } c.globalAlpha = 1; }
    else if(id==='galaxy'){ for(let i=0;i<22;i++){ const a = hash(i)*Math.PI*2 + t*(.4 + hash(i+1)*.5); const fz = Math.sin(a) < 0; if(fz !== back) continue; const rr = R*(.7 + .7*hash(i+2)); c.globalAlpha = .5 + .5*Math.sin(t*4 + i); c.fillStyle = i%4 ? '#d8c4ff' : '#7af0ff'; star4(c, X + Math.cos(a)*rr, Y - 2*z + Math.sin(a)*rr*.3 - 8*z, (2 + 3*hash(i+5))*z); }
      if(!back){ c.globalAlpha = .18 + .08*Math.sin(t*2); const gg = c.createRadialGradient(X, Y - 55*z, 4*z, X, Y - 55*z, 85*z); gg.addColorStop(0, '#b48bff'); gg.addColorStop(1, 'rgba(60,20,140,0)'); c.fillStyle = gg; c.beginPath(); c.arc(X, Y - 55*z, 85*z, 0, 7); c.fill(); } }
    else if(id==='royal'){ if(back){ c.globalAlpha = .22 + .08*Math.sin(t*3); const pg = c.createLinearGradient(0, Y, 0, Y - Hh*1.8); pg.addColorStop(0, 'rgba(255,220,120,.9)'); pg.addColorStop(1, 'rgba(255,220,120,0)'); c.fillStyle = pg; c.fillRect(X - R*.9, Y - Hh*1.8, R*1.8, Hh*1.8); }
      else { for(let i=0;i<8;i++){ const ph = frac(t*.4 + hash(i)); c.globalAlpha = Math.sin(ph*Math.PI); c.fillStyle = '#ffe58a'; c.beginPath(); c.arc(X + (hash(i+4)-.5)*R*1.6, Y - ph*Hh*1.4, 2.4*z, 0, 7); c.fill(); }
        c.globalAlpha = .9; c.strokeStyle = '#ffd447'; c.lineWidth = 3*z; c.beginPath(); c.ellipse(X, Y - Hh*1.12 - Math.sin(t*2)*3*z, 22*z, 6*z, 0, 0, 7); c.stroke(); } }
  }
  c.restore();
}
/* ----- legendary skin extras: glow, shimmer and floating bits ----- */
function legendBits(c, sk, X, Y, z, t){
  const fx = sk.fx, R = 52*z, Hh = 125*z; c.save(); c.globalCompositeOperation = 'lighter';
  for(let i=0;i<10;i++){ const ph = frac(t*(fx==='petals' ? .25 : .5) + hash(i+20)); const a = Math.sin(ph*Math.PI);
    const x = X + (hash(i+21)-.5)*R*2 + Math.sin(t*1.7 + i)*8*z, y = Y - 10*z - ph*Hh;
    c.globalAlpha = a*.9;
    if(fx==='petals'){ c.globalCompositeOperation = 'source-over'; c.fillStyle = i%2 ? '#ffc4e1' : '#ff8fc7'; petal(c, x, Y - Hh*1.05 + ph*Hh*1.05, 5*z, t*2 + i); }
    else if(fx==='stars'){ c.fillStyle = i%3 ? '#d9c2ff' : '#ffffff'; star4(c, x, y, (3 + 3*hash(i+7))*z*(.6 + a*.6)); }
    else if(fx==='sparks'){ c.strokeStyle = '#bff6ff'; c.lineWidth = 1.6*z; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (hash(i+3)-.5)*10*z, y - 7*z); c.lineTo(x + (hash(i+5)-.5)*10*z, y - 14*z); c.stroke(); }
    else { c.fillStyle = fx==='lava' ? (i%2 ? '#ff7a1a' : '#ffd24a') : (i%2 ? '#ffb43a' : '#ff5a1a'); c.beginPath(); c.arc(x, y, (1.8 + 2*hash(i+9))*z, 0, 7); c.fill(); }
  }
  // two orbiting motes
  for(let i=0;i<2;i++){ const a = t*2.4 + i*Math.PI; const ox = X + Math.cos(a)*R*.95, oy = Y - 60*z + Math.sin(a)*R*.28; if(Math.sin(a) < 0) continue; c.globalAlpha = .9; c.drawImage(glowSprite(sk.glow), ox - 12*z, oy - 12*z, 24*z, 24*z); }
  c.restore();
}
function legendBitsBack(c, sk, X, Y, z, t){ c.save(); c.globalCompositeOperation = 'lighter'; for(let i=0;i<2;i++){ const a = t*2.4 + i*Math.PI; if(Math.sin(a) >= 0) continue; const ox = X + Math.cos(a)*52*z*.95, oy = Y - 60*z + Math.sin(a)*52*z*.28; c.globalAlpha = .7; c.drawImage(glowSprite(sk.glow), ox - 10*z, oy - 10*z, 20*z, 20*z); } c.restore(); }
function shimmer(c, spr, t){ const W2 = spr.c.width, H2 = spr.c.height; if(!spr.shim) spr.shim = mkCanvas(W2, H2); const s = spr.shim.getContext('2d'); const ph = frac(t/3.2); if(ph > .35) return null;
  s.globalCompositeOperation = 'source-over'; s.clearRect(0,0,W2,H2); s.drawImage(spr.c, 0, 0); s.globalCompositeOperation = 'source-in';
  const p = (ph/.35)*(W2 + H2) - H2; const g = s.createLinearGradient(p, 0, p + H2*.5, H2*.5); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(.5, 'rgba(255,255,255,.42)'); g.addColorStop(1, 'rgba(255,255,255,0)'); s.fillStyle = g; s.fillRect(0, 0, W2, H2); return spr.shim; }
/* one call draws a hero with every look: used by the battle, the lobby and the shop */
function drawHero(c, X, Y, z, face, cos, t, o={}){
  const spr = skinSprite(cos.sk); if(!spr) return; const sk = spr.sk; const legend = sk.rar==='l';
  drawAura(c, cos.au, X, Y, z, t, 'back'); if(legend && !o.grey) legendBitsBack(c, sk, X, Y, z, t);
  c.save(); c.translate(X + (o.dx||0), Y - (o.lift||0)); if(o.rot) c.rotate(o.rot); c.scale(face*z*(o.kx||1), z*(o.ky||1)); if(o.alpha!=null) c.globalAlpha = o.alpha;
  const w = spr.w, h = spr.h, left = -spr.ax*w;
  if(cos.wg){ const wa = WING_AT[sk.hero] || [-.06,-.6]; c.save(); c.translate(wa[0]*w, wa[1]*h); drawWings(c, cos.wg, h*.62, t, o.flap ?? 1); c.restore(); }
  if(legend && spr.gl && !o.grey){ c.save(); c.globalCompositeOperation = 'lighter'; c.globalAlpha = (o.alpha ?? 1)*(.5 + .22*Math.sin(t*3.2)); c.drawImage(spr.gl, left - spr.pad/2, -h - spr.pad/2, w + spr.pad, h + spr.pad); c.restore(); }
  c.drawImage(o.grey ? spr.g : spr.c, left, -h, w, h);
  if(legend && !o.grey){ const sh = shimmer(c, spr, t + (o.seed||0)); if(sh){ c.globalCompositeOperation = 'lighter'; c.drawImage(sh, left, -h, w, h); c.globalCompositeOperation = 'source-over'; } }
  if(o.flash > 0){ c.globalAlpha = Math.min(1, o.flash*6); c.drawImage(spr.f, left, -h, w, h); }
  c.restore();
  if(legend && !o.grey) legendBits(c, sk, X, Y, z, t);
  drawAura(c, cos.au, X, Y, z, t, 'front');
}
/* name plate frames */
function plateStyle(c, fr, bx, by, w, h, t){
  const r = 8; c.save();
  if(fr==='silver' || fr==='gold' || fr==='diamond' || fr==='royal'){
    const cols = {silver:['#f4f7ff','#8a96b0'], gold:['#fff1a0','#c98a12'], diamond:['#e8fdff','#4fc8ff'], royal:['#fff6c8','#ff9a1a']}[fr];
    const g = c.createLinearGradient(bx, by, bx + w, by + h); g.addColorStop(0, cols[0]); g.addColorStop(.5, cols[1]); g.addColorStop(1, cols[0]);
    c.strokeStyle = g; c.lineWidth = fr==='royal' ? 3.5 : 2.5; c.beginPath(); c.roundRect(bx - 1, by - 1, w + 2, h + 2, r); c.stroke();
    if(fr==='diamond' || fr==='royal'){ const ph = frac(t*.5); c.globalCompositeOperation = 'lighter'; c.fillStyle = '#fff'; star4(c, bx + ph*w, by, 4); }
    if(fr==='royal'){ c.fillStyle = '#ffd447'; c.strokeStyle = '#7a3a08'; c.lineWidth = 1.5; const cx = bx + w/2, cy = by - 3; c.beginPath(); c.moveTo(cx - 10, cy); c.lineTo(cx - 10, cy - 8); c.lineTo(cx - 5, cy - 4); c.lineTo(cx, cy - 11); c.lineTo(cx + 5, cy - 4); c.lineTo(cx + 10, cy - 8); c.lineTo(cx + 10, cy); c.closePath(); c.fill(); c.stroke(); }
  }
  c.restore();
}

/* ================= REWARDS ================= */
function baseReward(p, won, mvp){
  const s = p.stats, L = [['Played a battle', 40]]; if(won) L.push(['Victory', 80]);
  const dg = Math.min(100, Math.round(s.dmg/20)); if(dg) L.push(['Damage dealt', dg]);
  if(s.kills) L.push(['Knockouts x'+s.kills, 30*s.kills]);
  const sk = Math.min(90, s.crits*10 + s.arcs*10 + s.doubles*25 + s.longs*10); if(sk) L.push(['Skill shots', sk]);
  if(mvp) L.push(['MVP', 40]);
  return {w: won ? 1 : 0, l: L, xp: Math.round(120 + s.dmg/4 + s.kills*60 + (won ? 120 : 0) + sk)};
}
function applyReward(r, rw){
  const lines = rw.l.map(x=>[String(x[0]).slice(0,30), clamp(x[1]|0, 0, 400)]);
  if(rw.w && r.day !== today()){ lines.push(['First win today', 150]); r.day = today(); }
  let gold = lines.reduce((a,b)=>a + b[1], 0); const from = r.lvl; r.xp += clamp(rw.xp|0, 0, 2000);
  while(r.xp >= xpNeed(r.lvl) && r.lvl < 99){ r.xp -= xpNeed(r.lvl); r.lvl++; const bonus = 100 + r.lvl*20; lines.push(['Reached level '+r.lvl, bonus]); gold += bonus; }
  r.gold += gold; return {lines, gold, xp: rw.xp|0, from, to: r.lvl};
}
function rewardHTML(sum, name){
  const up = sum.to > sum.from;
  return `<div class="rw"><div class="rw-top"><b>${name ? esc(name)+' ' : ''}+${sum.gold}</b><i class="coin"></i><span>+${sum.xp} XP</span></div>${up ? `<div class="rw-up">LEVEL UP! Lv ${sum.to}</div>` : ''}<ul>${sum.lines.map(l=>`<li><span>${esc(l[0])}</span><em>+${l[1]}</em></li>`).join('')}</ul></div>`;
}
const esc = s => String(s).replace(/[&<>"']/g, ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));

/* ================= SHOP & LOCKER ================= */
const SHOP_TABS = [['skin','Outfits'],['wings','Wings'],['aura','Auras'],['trail','Trails'],['boom','Booms'],['frame','Plates'],['title','Titles'],['weapon','Weapons'],['emote','Emotes']];
let shopCtx = null;
function openShop(o){ shopCtx = Object.assign({tab:'skin', hero:'juno', sel:null}, o); if(!CH[shopCtx.hero]) shopCtx.hero = 'juno'; renderShop(); if(o.modal) show('shop', true); }
function closeShop(){ const s = shopCtx; shopCtx = null; if(s && s.modal) show('shop', false); if(s && s.onClose) s.onClose(); }
function shopEntries(){
  const S = shopCtx, r = S.prof, tab = S.tab;
  if(tab==='skin') return Object.values(SKINS).filter(s=>s.hero===S.hero && skinOK(s.id)).map(s=>({key:'skin:'+s.id, id:s.id, name:s.name, rar:s.rar, equipped:(r.eq.skin[S.hero]||S.hero+':base')===s.id}));
  if(tab==='weapon') return Object.entries(WEAPONS).map(([id,w])=>({key:'wpn:'+id, id, name:w.name, rar:'c', weapon:true}));
  if(tab==='emote') return Object.entries(COS.emote).map(([id,e])=>({key:'emote:'+id, id, name:e.name, rar:e.rar, pack:true}));
  const none = {key:tab+':none', id:'', name:'None', rar:'c', equipped:!r.eq[tab]};
  return [none].concat(Object.entries(COS[tab]).map(([id,e])=>({key:tab+':'+id, id, name:e.name, rar:e.rar, equipped:r.eq[tab]===id})));
}
function entryState(e){ const r = shopCtx.prof;
  if(e.weapon){ const open = wpnOpen(r, e.id); const u = WPN_UNLOCK[e.id]; const lv = r.wl[e.id]||0;
    if(!open) return {owned:false, price:u[1], lvl:u[0], label: `Level ${u[0]} or ${u[1]}`, act: r.gold >= u[1] ? 'Unlock for '+u[1] : 'Need '+u[1]+' gold', can: r.gold >= u[1]};
    if(lv >= 5) return {owned:true, label:'+5 MAX', act:'Fully upgraded', can:false};
    const cost = WUP_COST[lv]; return {owned:true, label: lv ? '+'+lv : 'Unlocked', act: r.gold >= cost ? `Upgrade to +${lv+1} for ${cost}` : `+${lv+1} needs ${cost} gold`, can: r.gold >= cost, up:true, cost}; }
  const owned = e.rar==='c' || owns(r, e.key); if(owned) return {owned, label: e.equipped ? 'Wearing' : e.pack ? 'Owned' : 'Owned', act: e.pack ? 'Owned' : e.equipped ? (e.id && e.key.indexOf('skin:')!==0 ? 'Take off' : 'Wearing') : 'Wear', can: !e.pack && !(e.equipped && (!e.id || e.key.indexOf('skin:')===0))};
  const price = PRICE[e.rar], need = LVREQ[e.rar];
  if(r.lvl < need) return {owned, label:`Level ${need}`, act:`Unlocks at level ${need}`, can:false, price};
  return {owned, label: price+'', coin:true, act: r.gold >= price ? `Buy for ${price}` : `Need ${price - r.gold} more gold`, can: r.gold >= price, price};
}
function shopAct(e){
  const S = shopCtx, r = S.prof, st = entryState(e); if(!st.can) return;
  if(e.weapon){ if(!wpnOpen(r, e.id)){ r.gold -= st.price; r.own[e.key] = 1; SFX.play('buy'); toast(WEAPONS[e.id].name+' unlocked!'); }
    else { r.gold -= st.cost; r.wl[e.id] = (r.wl[e.id]||0) + 1; SFX.play('levelup'); toast(WEAPONS[e.id].name+' is now +'+r.wl[e.id]); } }
  else if(!st.owned){ r.gold -= st.price; r.own[e.key] = 1; SFX.play('buy'); toast('Got '+e.name+'!'); if(!e.pack) equipEntry(e); }
  else equipEntry(e);
  S.save(r); renderShop();
}
function equipEntry(e){ const S = shopCtx, r = S.prof;
  if(e.key.indexOf('skin:')===0){ r.eq.skin[S.hero] = e.id; }
  else { const cat = e.key.split(':')[0]; r.eq[cat] = e.equipped ? '' : e.id; }
  SFX.play('equip'); }
function tryCos(e){ const S = shopCtx, r = S.prof; const c = cosFromProf(r, S.hero, 'thunder'); if(!e) return c;
  if(e.key.indexOf('skin:')===0) c.sk = e.id; else if(e.weapon){ c.wpn = e.id; c.wl = r.wl[e.id]||0; } else if(!e.pack){ const cat = e.key.split(':')[0]; const k = {wings:'wg', aura:'au', trail:'tr', boom:'bm', frame:'fr', title:'ti'}[cat]; if(k) c[k] = e.id; }
  return c; }
function renderShop(){
  const S = shopCtx; if(!S) return; const r = S.prof, el = S.el; el.innerHTML = '';
  const wrap = document.createElement('div'); wrap.className = 'shop' + (S.phone ? ' phone' : ''); el.appendChild(wrap);
  const need = xpNeed(r.lvl);
  wrap.insertAdjacentHTML('beforeend', `<div class="shop-head"><h2 class="ribbon">Shop &amp; Locker</h2><div class="shop-who"></div><div class="lvl"><b>Lv ${r.lvl}</b><span>${levelTitle(r.lvl)}</span><div class="xpbar"><i style="width:${Math.round(100*r.xp/need)}%"></i></div><small>${r.xp} / ${need} XP</small></div><div class="goldpill"><i class="coin"></i><b>${r.gold.toLocaleString()}</b></div><button class="btn dark small" id="shopClose">${S.phone ? 'Back' : 'Close'}</button></div>`);
  const who = wrap.querySelector('.shop-who');
  if(S.names && S.names.length){ const sel = document.createElement('select'); sel.className = 'txt'; S.names.forEach(n=>{ const o = document.createElement('option'); o.value = n; o.textContent = n; if(n===r.name) o.selected = true; sel.appendChild(o); }); sel.onchange = ()=>{ S.prof = profFor(sel.value); S.sel = null; renderShop(); }; who.append('Player ', sel); }
  else who.textContent = r.name;
  wrap.querySelector('#shopClose').onclick = closeShop;
  const tabs = document.createElement('div'); tabs.className = 'shop-tabs'; SHOP_TABS.forEach(([k,l])=>{ const b = document.createElement('button'); b.textContent = l; b.className = S.tab===k ? 'sel' : ''; b.onclick = ()=>{ S.tab = k; S.sel = null; SFX.play('ui'); renderShop(); }; tabs.appendChild(b); }); wrap.appendChild(tabs);
  const body = document.createElement('div'); body.className = 'shop-body'; wrap.appendChild(body);
  // preview
  const pv = document.createElement('div'); pv.className = 'shop-prev'; body.appendChild(pv);
  const heroRow = document.createElement('div'); heroRow.className = 'shop-heroes'; CHARS.forEach(c=>{ const b = document.createElement('i'); b.style.backgroundImage = skinFace(r.eq.skin[c.id] && owns(r, 'skin:'+r.eq.skin[c.id]) ? r.eq.skin[c.id] : c.id+':base'); b.className = S.hero===c.id ? 'sel' : ''; b.title = c.name; b.onclick = ()=>{ S.hero = c.id; if(S.tab==='skin') S.sel = null; SFX.play('ui'); renderShop(); }; heroRow.appendChild(b); }); pv.appendChild(heroRow);
  const cv2 = document.createElement('canvas'); cv2.className = 'shop-cv'; pv.appendChild(cv2);
  const list = shopEntries(); const sel = list.find(e=>e.key===S.sel) || list.find(e=>e.equipped) || list[0]; S.sel = sel.key;
  const st = entryState(sel); const info = document.createElement('div'); info.className = 'shop-info';
  const desc = sel.weapon ? WEAPONS[sel.id].desc + '. Upgrades change how the shell looks, never the damage.' : sel.pack ? 'Adds: ' + COS.emote[sel.id].list.join('  ') : sel.key.indexOf('skin:')===0 ? (sel.rar==='l' ? 'Glows, shimmers and leaves sparkles. Looks only.' : sel.rar==='e' ? 'A whole new painted outfit. Looks only.' : sel.rar==='r' ? 'A special colour style. Looks only.' : 'The original look.') : {wings:'Wings that flap on your back.', aura:'Lights and sparkles around you.', trail:'What your shells leave in the sky.', boom:'How your shells explode.', frame:'The border around your name.', title:'A title above your name.'}[S.tab] || '';
  info.innerHTML = `<div class="rar" style="--rc:${RAR[sel.rar].col}">${sel.weapon ? 'Weapon' : RAR[sel.rar].n}</div><b>${esc(sel.name)}</b><p>${esc(desc)}</p>`;
  const act = document.createElement('button'); act.className = 'btn ' + (st.can ? (st.owned && !st.up ? 'green' : '') : 'dark'); act.textContent = st.act; act.disabled = !st.can; act.onclick = ()=>shopAct(sel); info.appendChild(act); pv.appendChild(info);
  // grid
  const grid = document.createElement('div'); grid.className = 'shop-grid'; body.appendChild(grid);
  list.forEach(e=>{ const es = entryState(e); const d = document.createElement('div'); d.className = 'sitem' + (e.key===S.sel ? ' sel' : '') + (e.equipped ? ' on' : ''); d.style.setProperty('--rc', RAR[e.rar].col); d.style.setProperty('--rd', RAR[e.rar].d);
    const th = shopThumb(e); d.appendChild(th);
    const nm = document.createElement('b'); nm.textContent = e.name; d.appendChild(nm);
    const lab = document.createElement('span'); lab.innerHTML = (es.coin ? '<i class="coin"></i>' : '') + esc(es.label); if(es.owned) lab.className = 'own'; d.appendChild(lab);
    if(e.rar==='l') d.classList.add('legend');
    d.onclick = ()=>{ S.sel = e.key; SFX.play('ui'); renderShop(); }; grid.appendChild(d); });
  const foot = document.createElement('div'); foot.className = 'shop-foot'; foot.textContent = 'Earn gold by playing: 40 a battle, 80 for a win, extra for damage, knockouts and skill shots, 150 for your first win each day, and a bonus every level. Everything here is looks only, so nobody can buy a win.' + (S.phone ? ' Your gold and items are saved on this phone.' : ''); wrap.appendChild(foot);
  startShopPreview(cv2, sel);
}
function shopThumb(e){
  const S = shopCtx; const c = mkCanvas(160, 160); c.className = 'th'; const x = c.getContext('2d');
  if(e.key.indexOf('skin:')===0){ const sp = skinSprite(e.id); if(sp){ const s = Math.min(140/sp.h, 150/sp.w); x.drawImage(sp.c, 80 - sp.w*s/2, 154 - sp.h*s, sp.w*s, sp.h*s); } return c; }
  if(e.weapon){ const col = WEAPONS[e.id].color; for(let i=6;i>=1;i--){ x.globalAlpha = .1 + .07*(6-i); x.fillStyle = col; x.beginPath(); x.arc(92 - i*11, 70 + i*9 - i*i*.6, 30 - i*3.2, 0, 7); x.fill(); } x.globalAlpha = 1; drawShell(x, 96, 66, 36, col, S.prof.wl[e.id]||0, 1.2); return c; }
  if(e.pack){ x.textAlign = 'center'; x.textBaseline = 'middle'; COS.emote[e.id].list.slice(0,4).forEach((t,i)=>{ const cx = 42 + (i%2)*76, cy = 50 + (i>>1)*60; let fs = 26; x.font = `400 ${fs}px 'Lilita One', Nunito`; while(x.measureText(t).width > 58 && fs > 11){ fs -= 1; x.font = `400 ${fs}px 'Lilita One', Nunito`; }
      x.fillStyle = '#fff'; x.strokeStyle = '#1a1030'; x.lineWidth = 3; x.beginPath(); x.roundRect(cx - 35, cy - 22, 70, 44, 14); x.fill(); x.stroke(); x.beginPath(); x.moveTo(cx - 6, cy + 21); x.lineTo(cx - 12, cy + 31); x.lineTo(cx + 4, cy + 21); x.fill();
      x.fillStyle = '#2a1a50'; x.fillText(t, cx, cy + 1); }); return c; }
  const tab = e.key.split(':')[0]; const cos = cosFromProf(S.prof, S.hero, 'thunder'); cos.sk = S.hero+':base'; cos.wg = cos.au = '';
  if(tab==='wings'){ cos.wg = e.id; drawHero(x, 92, 150, .78, 1, cos, 1.1, {flap:0}); }
  else if(tab==='aura'){ cos.au = e.id; drawHero(x, 80, 145, .78, 1, cos, 1.6); }
  else if(tab==='trail'){ drawTrailDemo(x, e.id, 1.6, 160, 160); }
  else if(tab==='boom'){ drawBoomDemo(x, e.id, .25, 80, 80, 1); }
  else if(tab==='frame'){ drawPlateAt(x, 80, 90, 'Player', e.id, '', 7, '#ffd447', 1.2); }
  else if(tab==='title'){ x.font = "400 22px 'Lilita One', Nunito"; x.textAlign = 'center'; x.fillStyle = e.id ? '#ffd447' : '#9a8cc0'; x.strokeStyle = '#2a1640'; x.lineWidth = 5; x.strokeText(e.name, 80, 88); x.fillText(e.name, 80, 88); }
  return c;
}
let shopRAF = 0;
function startShopPreview(cv2, sel){
  cancelAnimationFrame(shopRAF); const t0 = performance.now();
  const frame = ()=>{ if(!shopCtx || !cv2.isConnected) return; shopRAF = requestAnimationFrame(frame);
    const r = cv2.getBoundingClientRect(); const dpr = Math.min(2, devicePixelRatio||1); const W2 = Math.round(r.width*dpr), H2 = Math.round(r.height*dpr); if(!W2 || !H2) return; if(cv2.width!==W2 || cv2.height!==H2){ cv2.width = W2; cv2.height = H2; }
    const x = cv2.getContext('2d'); const t = (performance.now() - t0)/1000; x.setTransform(1,0,0,1,0,0); x.clearRect(0,0,W2,H2);
    const g = x.createRadialGradient(W2/2, H2*.55, 10, W2/2, H2*.55, W2*.7); g.addColorStop(0, RAR[sel.rar].d); g.addColorStop(1, '#120a26'); x.fillStyle = g; x.fillRect(0,0,W2,H2);
    // spotlight + podium
    x.save(); x.globalCompositeOperation = 'lighter'; x.globalAlpha = .18; const sp = x.createLinearGradient(0, 0, 0, H2); sp.addColorStop(0, RAR[sel.rar].col); sp.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = sp; x.beginPath(); x.moveTo(W2*.42, 0); x.lineTo(W2*.58, 0); x.lineTo(W2*.78, H2*.86); x.lineTo(W2*.22, H2*.86); x.fill(); x.restore();
    const fy = H2*.84; x.fillStyle = '#0c0618'; x.beginPath(); x.ellipse(W2/2, fy, W2*.3, H2*.05, 0, 0, 7); x.fill(); x.strokeStyle = RAR[sel.rar].col; x.globalAlpha = .6; x.lineWidth = 2*dpr; x.stroke(); x.globalAlpha = 1;
    const cos = tryCos(sel); const z = Math.min(W2/260, H2/235)*1.0; const tab = shopCtx.tab;
    const heroX = tab==='trail' || tab==='boom' || tab==='weapon' ? W2*.3 : W2/2;
    drawHero(x, heroX, fy, z, 1, cos, t);
    if(tab==='trail' || tab==='weapon' || tab==='boom'){ const cyc = 2.6, ph = (t % cyc)/cyc; const sx0 = heroX + 40*z, sy0 = fy - 60*z, ex = W2*.86, ey = fy - 6*z;
      const pos = u => [lerp(sx0, ex, u), lerp(sy0, ey, u) - Math.sin(u*Math.PI)*H2*.45];
      if(ph < .62){ const u = ph/.62; const trail = cos.tr; for(let k=24;k>=1;k--){ const uu = u - k*.012; if(uu < 0) continue; const [px, py] = pos(uu); trailDot(x, trail, px, py, z, k, t, uu); } const [px, py] = pos(u); drawShell(x, px, py, 9*z, (WEAPONS[cos.wpn||'thunder']||WEAPONS.thunder).color, cos.wl, z/1.4, t); }
      else drawBoomDemo(x, cos.bm, (ph - .62)/.38, ex, ey, z, cos.wl); }
    if(tab==='frame' || tab==='title'){ drawPlateAt(x, W2/2, fy - 150*z, shopCtx.prof.name, cos.fr, cos.ti, shopCtx.prof.lvl, CH[shopCtx.hero].col, z*1.1, t); }
    if(tab==='emote' && sel.pack){ const l = COS.emote[sel.id].list; const k = Math.floor(t/1.2) % l.length; emoteBubble(x, W2/2, fy - 160*z, l[k], z*1.2, 1); }
  };
  frame();
}
/* little painters used by the shop and the battle */
function drawShell(x, X, Y, r, color, wl=0, k=1, t=0){
  x.save(); if(wl >= 3){ x.globalCompositeOperation = 'lighter'; x.globalAlpha = .7; x.drawImage(glowSprite(wl >= 5 ? '#ffd447' : color), X - r*3.4, Y - r*3.4, r*6.8, r*6.8); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; }
  x.fillStyle = '#2a2240'; x.beginPath(); x.arc(X, Y, r + 2.5*k, 0, 7); x.fill();
  const gg = x.createRadialGradient(X - r*.35, Y - r*.35, 1, X, Y, r); gg.addColorStop(0, '#fff'); gg.addColorStop(.35, wl >= 5 ? '#ffd447' : color); gg.addColorStop(1, wl >= 5 ? '#8a4a06' : '#3a2a5a'); x.fillStyle = gg; x.beginPath(); x.arc(X, Y, r, 0, 7); x.fill();
  if(wl >= 1){ x.strokeStyle = wl >= 4 ? '#ffd447' : '#ffffffaa'; x.lineWidth = 2*k; x.beginPath(); x.arc(X, Y, r + 5*k, t*4, t*4 + 4); x.stroke(); }
  if(wl >= 2){ x.fillStyle = '#fff'; star4(x, X + Math.cos(t*6)*(r + 7*k), Y + Math.sin(t*6)*(r + 7*k), 3*k); }
  x.restore();
}
function trailDot(x, tr, X, Y, z, k, t, u){ const a = 1 - k/25; x.save(); x.globalAlpha = a;
  if(tr==='rainbow'){ x.globalCompositeOperation = 'lighter'; x.drawImage(glowSprite(`hsl(${Math.round(((u*900 + t*200) % 360)/30)*30},100%,60%)`), X - 9*z, Y - 9*z, 18*z, 18*z); }
  else if(tr==='hearts'){ if(k % 3===0){ x.fillStyle = k%2 ? '#ff5d8a' : '#ff9ac0'; heartPath(x, X, Y + Math.sin(k)*4*z, 5*z*(1 - k/40)); } }
  else if(tr==='fire'){ x.globalCompositeOperation = 'lighter'; x.drawImage(glowSprite(k < 8 ? '#ffd24a' : '#ff4a1a'), X - 11*z*(1-k/30), Y - 11*z*(1-k/30), 22*z*(1-k/30), 22*z*(1-k/30)); }
  else if(tr==='zap'){ if(k % 2===0){ x.strokeStyle = '#bff6ff'; x.lineWidth = 2*z; x.beginPath(); x.moveTo(X, Y); x.lineTo(X + (hash(k + Math.floor(t*12))-.5)*14*z, Y + (hash(k*3 + Math.floor(t*12))-.5)*14*z); x.stroke(); } x.globalCompositeOperation = 'lighter'; x.drawImage(glowSprite('#3ad0ff'), X - 6*z, Y - 6*z, 12*z, 12*z); }
  else if(tr==='stardust'){ x.globalCompositeOperation = 'lighter'; x.fillStyle = k%3 ? '#ffe58a' : '#fff'; star4(x, X + (hash(k)-.5)*10*z, Y + (hash(k+9)-.5)*10*z, (3 + 3*Math.sin(t*10 + k))*z*(1 - k/30)); if(k%4===0) x.drawImage(glowSprite('#b48bff'), X - 8*z, Y - 8*z, 16*z, 16*z); }
  else { x.globalCompositeOperation = 'lighter'; x.drawImage(glowSprite('#ffb04a'), X - 7*z, Y - 7*z, 14*z, 14*z); }
  x.restore(); }
function drawTrailDemo(x, tr, t, W2, H2){ for(let k=24;k>=1;k--){ const u = 1 - k/26; trailDot(x, tr, 20 + u*120, 130 - Math.sin(u*Math.PI*.9)*90, 1, k, t, u); } drawShell(x, 140, 120, 9, '#ffc45a', 0, 1, t); }
function drawBoomDemo(x, bm, ph, X, Y, z, wl=0){
  const r = 60*z*(.4 + ph*.9); x.save(); x.globalCompositeOperation = 'lighter';
  if(bm==='blackhole'){ x.globalCompositeOperation = 'source-over'; x.globalAlpha = 1 - ph*.6; const g = x.createRadialGradient(X, Y, 2, X, Y, r*1.1); g.addColorStop(0, '#000'); g.addColorStop(.55, '#2a0a5a'); g.addColorStop(1, 'rgba(120,60,255,0)'); x.fillStyle = g; x.beginPath(); x.arc(X, Y, r*1.1, 0, 7); x.fill();
    x.strokeStyle = '#b48bff'; x.lineWidth = 3*z; x.beginPath(); x.arc(X, Y, 60*z*(1.3 - ph), 0, 7); x.stroke(); x.fillStyle = '#fff'; for(let i=0;i<10;i++){ const a = i/10*Math.PI*2 + ph*5; const rr = 70*z*(1 - ph); star4(x, X + Math.cos(a)*rr, Y + Math.sin(a)*rr*.6, 3*z); } }
  else { const cols = bm==='confetti' ? ['#ff5d6c','#ffd447','#53c3ff','#7af0c8','#ff8fc7'] : bm==='fireworks' ? ['#ff5d6c','#ffd447','#53c3ff','#b48bff'] : bm==='inferno' ? ['#ff4a1a','#ffb43a','#ffe27a'] : ['#ffd27a','#ff8a3a'];
    x.globalAlpha = 1 - ph; x.drawImage(glowSprite(cols[0]), X - r*1.4, Y - r*1.4, r*2.8, r*2.8);
    for(let i=0;i<18;i++){ const a = i/18*Math.PI*2 + hash(i); const d = r*(.6 + hash(i+3)*.9); const px = X + Math.cos(a)*d, py = Y + Math.sin(a)*d + (bm==='confetti' ? ph*30*z : 0); x.fillStyle = cols[i % cols.length];
      if(bm==='confetti'){ x.globalCompositeOperation = 'source-over'; x.save(); x.translate(px, py); x.rotate(i + ph*8); x.fillRect(-4*z, -2*z, 8*z, 4*z); x.restore(); }
      else if(bm==='fireworks'){ x.strokeStyle = cols[i % cols.length]; x.lineWidth = 2.5*z; x.beginPath(); x.moveTo(X + Math.cos(a)*d*.6, Y + Math.sin(a)*d*.6); x.lineTo(px, py); x.stroke(); star4(x, px, py, 4*z); }
      else { x.beginPath(); x.arc(px, py, (3 + 3*hash(i+7))*z, 0, 7); x.fill(); } }
    if(bm==='inferno'){ x.globalAlpha = (1 - ph)*.8; for(let i=0;i<6;i++){ const fx = X + (i - 2.5)*14*z, hgt = r*(1 + hash(i)); const g = x.createLinearGradient(0, Y, 0, Y - hgt); g.addColorStop(0, '#ff4a1a'); g.addColorStop(1, 'rgba(255,220,80,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(fx - 8*z, Y); x.quadraticCurveTo(fx, Y - hgt*.5, fx + Math.sin(ph*20 + i)*6*z, Y - hgt); x.quadraticCurveTo(fx, Y - hgt*.5, fx + 8*z, Y); x.fill(); } } }
  if(wl >= 4){ x.globalAlpha = 1 - ph; x.strokeStyle = '#ffd447'; x.lineWidth = 4*z; x.beginPath(); x.arc(X, Y, r*1.2, 0, 7); x.stroke(); }
  x.restore(); }
function drawPlateAt(x, X, Y, name, fr, ti, lv, col, k=1, t=0){
  const fs = 15*k; x.save(); x.font = `900 ${fs}px Nunito, sans-serif`; const tw = x.measureText(name).width; const w = Math.max(tw + 16*k + 26*k, 80*k), h = fs + 9*k; const bx = X - w/2, by = Y - h;
  x.fillStyle = 'rgba(16,8,36,.88)'; x.beginPath(); x.roundRect(bx, by, w, h, 8*k); x.fill(); plateStyle(x, fr, bx, by, w, h, t);
  x.fillStyle = '#ffd447'; x.font = `400 ${11*k}px 'Lilita One', Nunito`; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText(lv, bx + 7*k, by + h/2 + 1);
  x.font = `900 ${fs}px Nunito, sans-serif`; x.fillStyle = col; x.textAlign = 'center'; x.fillText(name, X + 10*k, by + h/2 + 1);
  if(ti){ const tt = (COS.title[ti]||{}).name || ti; x.font = `400 ${12*k}px 'Lilita One', Nunito`; x.lineWidth = 4*k; x.strokeStyle = '#2a1640'; x.fillStyle = '#ffd447'; x.strokeText(tt, X, by - 9*k); x.fillText(tt, X, by - 9*k); }
  x.restore(); }
function emoteBubble(x, X, Y, text, k=1, a=1){ x.save(); x.globalAlpha = a; x.font = `400 ${22*k}px 'Lilita One', Nunito`; const ew = Math.max(48*k, x.measureText(text).width + 26*k), eh = 40*k;
  x.translate(X, Y); x.fillStyle = '#fff'; x.strokeStyle = '#2a1640'; x.lineWidth = 3*k; x.beginPath(); x.roundRect(-ew/2, -eh, ew, eh, 14*k); x.moveTo(-8*k, 0); x.lineTo(0, 12*k); x.lineTo(8*k, 0); x.fill(); x.stroke();
  x.fillStyle = '#fff'; x.fillRect(-9*k, -3*k, 18*k, 4*k); x.fillStyle = '#2a1640'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, 0, -eh/2 + 1); x.restore(); }

/* ---------------- sound effects (all made in code, no files) ---------------- */
const SFX = {
  ctx:null, on: store.get('sound', true), master:null,
  init(){ if(this.ctx) return; try{
    const c = this.ctx = new (window.AudioContext||window.webkitAudioContext)();
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -16; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .25; comp.connect(c.destination);
    this.master = c.createGain(); this.master.gain.value = .85; this.master.connect(comp);
    this.bus = c.createGain(); this.bus.gain.value = 1; this.bus.connect(this.master);
    this.rev = c.createConvolver(); this.rev.buffer = this.impulse(2.4, 3); this.revIn = c.createGain(); this.revIn.gain.value = .5; this.revIn.connect(this.rev); this.rev.connect(this.master);
    const n = c.sampleRate*2, b = c.createBuffer(1, n, c.sampleRate), d = b.getChannelData(0); for(let i=0;i<n;i++) d[i] = Math.random()*2-1; this.nbuf = b;
  }catch{ this.ctx = null; } },
  impulse(dur, decay){ const c = this.ctx, n = c.sampleRate*dur, b = c.createBuffer(2, n, c.sampleRate); for(let ch=0;ch<2;ch++){ const d = b.getChannelData(ch); for(let i=0;i<n;i++) d[i] = (Math.random()*2-1)*Math.pow(1-i/n, decay); } return b; },
  route(node, rev){ node.connect(this.bus); if(rev){ const g = this.ctx.createGain(); g.gain.value = rev; node.connect(g); g.connect(this.revIn); } },
  env(t, att, dur, peak){ const g = this.ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(.0002, peak), t + att); g.gain.exponentialRampToValueAtTime(.0001, t + att + dur); return g; },
  tone(type, f0, f1, t, dur, peak, o={}){ const c = this.ctx; const s = c.createOscillator(); s.type = type; s.frequency.setValueAtTime(f0, t); if(f1 && f1!==f0) s.frequency.exponentialRampToValueAtTime(f1, t + (o.glide || dur)); if(o.detune) s.detune.value = o.detune;
    let n = s; if(o.cut){ const f = c.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.cut, t); if(o.cut2) f.frequency.exponentialRampToValueAtTime(o.cut2, t + dur); f.Q.value = o.q || .8; s.connect(f); n = f; }
    const g = this.env(t, o.att || .004, dur, peak); n.connect(g); this.route(g, o.rev || 0); s.start(t); s.stop(t + (o.att||.004) + dur + .05); },
  hiss(t, dur, peak, o={}){ const c = this.ctx; const s = c.createBufferSource(); s.buffer = this.nbuf; s.loop = true; const f = c.createBiquadFilter(); f.type = o.ft || 'lowpass'; f.frequency.setValueAtTime(o.f0 || 1000, t); if(o.f1) f.frequency.exponentialRampToValueAtTime(o.f1, t + dur); f.Q.value = o.q || .7;
    s.connect(f); const g = this.env(t, o.att || .004, dur, peak); f.connect(g); this.route(g, o.rev || 0); s.start(t, Math.random()*1.5); s.stop(t + (o.att||.004) + dur + .05); },
  play(kind, size=1){
    if(!this.on || !this.ctx) return; const c = this.ctx, t = c.currentTime + .005;
    switch(kind){
      case 'boom': { const k = clamp(size, .5, 2.2);
        this.tone('sine', 140, 30, t, .55*k, .95, {glide:.45});
        this.tone('triangle', 70, 38, t, .35*k, .5);
        this.hiss(t, .07, .7, {ft:'highpass', f0:1800});
        this.hiss(t, 1.0*k, .85, {f0:1600*k, f1:70, rev:.35});
        for(let i=0;i<7*k;i++){ const d = t + .12 + Math.random()*.7; this.hiss(d, .03 + Math.random()*.05, .06 + Math.random()*.08, {ft:'bandpass', f0:2500 + Math.random()*4000, q:3}); }
        break; }
      case 'shoot':
        this.tone('sine', 170, 48, t, .2, .8);
        this.hiss(t, .28, .45, {ft:'bandpass', f0:1400, f1:260, q:1.2, rev:.18});
        this.tone('square', 1900, 900, t, .025, .08); break;
      case 'crit':
        [880, 1109, 1319, 1760].forEach((f,i)=>this.tone('sawtooth', f, f, t + i*.012, .5, .06, {cut:5000, cut2:1200, rev:.6}));
        this.hiss(t - .002, .35, .25, {ft:'highpass', f0:3000, f1:9000, rev:.4});
        this.tone('sine', 1760, 3520, t, .25, .12, {rev:.5}); break;
      case 'double':
        [110, 164.8, 220, 277.2, 329.6].forEach((f,i)=>{ this.tone('sawtooth', f, f, t, 1.1, .09, {cut:3600, cut2:500, detune:(i%2?8:-8), rev:.6}); this.tone('sawtooth', f, f, t, 1.1, .06, {cut:3600, cut2:500, detune:(i%2?-12:12)}); });
        this.tone('sine', 98, 55, t, 1.0, .9, {glide:.8}); this.hiss(t, 1.6, .35, {ft:'highpass', f0:5000, rev:.7}); break;
      case 'arc':
        [2093, 2637, 3136].forEach((f,i)=>this.tone('triangle', f, f, t + i*.05, .5, .08, {rev:.6})); this.hiss(t, .4, .15, {ft:'bandpass', f0:900, f1:5000, q:2, rev:.4}); break;
      case 'ko':
        this.tone('sawtooth', 520, 70, t, .7, .22, {cut:2400, cut2:300, glide:.65, rev:.3}); this.tone('square', 260, 50, t + .05, .6, .08, {cut:1200}); break;
      case 'coin':
        this.tone('square', 1568, 1568, t, .06, .07, {cut:6000}); this.tone('square', 2093, 2093, t + .06, .22, .07, {cut:6000, rev:.25}); break;
      case 'buy':
        for(let i=0;i<5;i++){ const d = t + i*.06; this.tone('square', 1568 + i*90, 1568 + i*90, d, .05, .05, {cut:6000}); this.tone('square', 2093 + i*120, 2093 + i*120, d + .03, .12, .05, {cut:6000, rev:.3}); }
        this.tone('triangle', 523, 1046, t + .3, .4, .15, {rev:.4}); break;
      case 'equip':
        this.hiss(t, .18, .2, {ft:'bandpass', f0:600, f1:4000, q:1.5}); this.tone('triangle', 1318, 1318, t + .1, .35, .12, {rev:.5}); this.tone('triangle', 1976, 1976, t + .16, .35, .09, {rev:.5}); break;
      case 'levelup':
        [523, 659, 784, 1046].forEach((f,i)=>this.tone('square', f, f, t + i*.09, .16, .07, {cut:4000, rev:.3}));
        [523, 659, 784, 1046, 1318].forEach(f=>this.tone('sawtooth', f, f, t + .38, 1.1, .045, {cut:5000, cut2:1500, rev:.6, att:.02}));
        for(let i=0;i<10;i++) this.tone('sine', 2000 + Math.random()*3000, 0, t + .4 + i*.06, .12, .04, {rev:.6}); break;
      case 'ui': this.tone('sine', 1300, 1000, t, .05, .12); break;
      case 'turn':
        this.tone('sine', 1319, 1319, t, .5, .18, {rev:.45}); this.tone('sine', 2637, 2637, t, .25, .05, {rev:.45});
        this.tone('sine', 1976, 1976, t + .12, .7, .18, {rev:.45}); this.tone('sine', 3951, 3951, t + .12, .3, .04, {rev:.45}); break;
      case 'heart': this.tone('sine', 70, 42, t, .14, .7); this.tone('sine', 66, 40, t + .2, .16, .55); break;
      case 'heal': [784, 988, 1175, 1568, 1976].forEach((f,i)=>this.tone('triangle', f, f, t + i*.05, .35, .08, {rev:.5})); break;
      case 'splash': this.hiss(t, .8, .45, {ft:'highpass', f0:500, f1:2500, rev:.3}); for(let i=0;i<5;i++) this.tone('sine', 300 + Math.random()*500, 900 + Math.random()*700, t + i*.07, .08, .08); break;
      case 'item': this.tone('square', 392, 1568, t, .2, .07, {cut:3500, glide:.18, rev:.3}); this.tone('sine', 784, 3136, t + .02, .2, .07, {glide:.18}); break;
      case 'tick': this.tone('sine', 1050, 900, t, .035, .12); this.hiss(t, .02, .05, {ft:'highpass', f0:4000}); break;
      case 'bounce': this.tone('sine', 220, 520, t, .16, .3, {glide:.08}); break;
      case 'drop': this.hiss(t, .9, .15, {ft:'bandpass', f0:300, f1:1600, q:1, att:.3}); break;
      case 'emote': this.tone('sine', 620, 1240, t, .1, .18, {glide:.06}); break;
      case 'callout': this.hiss(t, .3, .18, {ft:'bandpass', f0:500, f1:3500, q:1.4}); this.tone('triangle', 784, 1568, t, .14, .07, {glide:.1}); break;
      case 'win':
        [[523,0],[659,.14],[784,.28],[1046,.42],[784,.62],[1046,.76]].forEach(([f,d])=>{ this.tone('square', f, f, t + d, .22, .06, {cut:3000, rev:.35}); this.tone('triangle', f/2, f/2, t + d, .22, .08); });
        [523, 659, 784, 1046].forEach(f=>this.tone('sawtooth', f, f, t + .95, 1.4, .04, {cut:4000, cut2:1200, att:.03, rev:.6})); this.tone('sine', 98, 49, t + .95, .8, .6); this.hiss(t + .95, 1.5, .2, {ft:'highpass', f0:6000, rev:.6}); break;
    }
  },
  chargeOsc:null,
  charge(p){ if(!this.on || !this.ctx){ return; } const c = this.ctx;
    if(p===null){ if(this.chargeOsc){ const o = this.chargeOsc; try{ o.g.gain.setTargetAtTime(.0001, c.currentTime, .03); o.o.stop(c.currentTime + .2); o.o2.stop(c.currentTime + .2); }catch{} this.chargeOsc = null; } return; }
    if(!this.chargeOsc){ const o = c.createOscillator(), o2 = c.createOscillator(); o.type = 'sawtooth'; o2.type = 'square'; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.Q.value = 6; const g = c.createGain(); g.gain.value = .0001; g.gain.setTargetAtTime(.05, c.currentTime, .03);
      o.connect(f); o2.connect(f); f.connect(g); this.route(g, .15); o.start(); o2.start(); this.chargeOsc = {o, o2, f, g}; }
    const k = this.chargeOsc, now = c.currentTime; k.o.frequency.setTargetAtTime(90 + p*4.2, now, .02); k.o2.frequency.setTargetAtTime(180 + p*8.4 + 3, now, .02); k.f.frequency.setTargetAtTime(500 + p*38, now, .02); },
  wh:null,
  whistle(f){ if(!this.on || !this.ctx) return; const c = this.ctx;
    if(f==null){ if(this.wh){ const w = this.wh; try{ w.g.gain.setTargetAtTime(.0001, c.currentTime, .02); w.o.stop(c.currentTime + .15); w.lfo.stop(c.currentTime + .15); }catch{} this.wh = null; } return; }
    if(!this.wh){ const o = c.createOscillator(); o.type = 'sine'; const g = c.createGain(); g.gain.value = .0001; g.gain.setTargetAtTime(.045, c.currentTime, .08); const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 9; lg.gain.value = 14; lfo.connect(lg); lg.connect(o.frequency); lfo.start(); o.connect(g); this.route(g, .25); o.start(); this.wh = {o, g, lfo}; }
    this.wh.o.frequency.setTargetAtTime(f, c.currentTime, .05); }
};
window.addEventListener('pointerdown', ()=>SFX.init(), {once:true});
window.addEventListener('keydown', ()=>SFX.init(), {once:true});


/* ---------------- music (a little band made in code, one tune per arena) ---------------- */
const MUSIC = { on: store.get('music', true), timer:null, next:0, step:0, out:null, theme:'title', hype:0,
  THEMES: {
    title:{bpm:96, root:57, prog:[[0,'m'],[-4,'M'],[3,'M'],[-2,'M']], style:'chill', lead:'triangle', seed:7},
    sunset:{bpm:122, root:60, prog:[[0,'M'],[7,'M'],[9,'m'],[5,'M']], style:'pop', lead:'square', seed:11},
    frost:{bpm:108, root:57, prog:[[0,'m'],[-4,'M'],[3,'M'],[-2,'M']], style:'dream', lead:'triangle', seed:23},
    ember:{bpm:138, root:52, prog:[[0,'m'],[0,'m'],[-4,'M'],[-2,'M']], style:'drive', lead:'sawtooth', seed:31},
    candy:{bpm:126, root:65, prog:[[0,'M'],[9,'m'],[2,'m'],[7,'M']], style:'bounce', lead:'square', seed:47},
  },
  start(theme){ if(theme) this.theme = theme; if(!this.on || !SFX.on) return; SFX.init(); const c = SFX.ctx; if(!c) return;
    if(this.timer){ if(this.playing===this.theme) return; this.stop(true); }
    this.playing = this.theme; this.motif = null;
    this.out = c.createGain(); this.out.gain.setValueAtTime(.0001, c.currentTime); this.out.gain.exponentialRampToValueAtTime(.62, c.currentTime + 1.5); this.out.connect(SFX.master);
    this.dl = c.createDelay(1); this.dl.delayTime.value = 60/this.T().bpm*.75; const fb = c.createGain(); fb.gain.value = .3; const wet = c.createGain(); wet.gain.value = .22; this.dl.connect(fb); fb.connect(this.dl); this.dl.connect(wet); wet.connect(this.out);
    this.next = c.currentTime + .1; this.step = 0; this.timer = setInterval(()=>this.tick(), 50); },
  stop(quick){ if(!this.timer) return; clearInterval(this.timer); this.timer = null; this.playing = null; const o = this.out, c = SFX.ctx; try{ o.gain.setTargetAtTime(.0001, c.currentTime, quick ? .08 : .3); setTimeout(()=>o.disconnect(), 1800); }catch{} },
  T(){ return this.THEMES[this.theme] || this.THEMES.title; },
  tick(){ const c = SFX.ctx; if(!c) return; const th = this.T(); const s16 = 60/(th.bpm*(1 + this.hype*.07))/4;
    while(this.next < c.currentTime + .25){ this.note(this.step, this.next, s16, th); this.next += s16; this.step++; } },
  mtof(m){ return 440*Math.pow(2, (m-69)/12); },
  v(type, m, t, dur, peak, o={}){ const c = SFX.ctx; const s = c.createOscillator(); s.type = type; s.frequency.value = this.mtof(m); if(o.det) s.detune.value = o.det;
    let n = s; if(o.cut){ const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.setValueAtTime(o.cut, t); if(o.cut2) f.frequency.exponentialRampToValueAtTime(o.cut2, t + dur); f.Q.value = o.q || .7; s.connect(f); n = f; }
    const g = c.createGain(); const a = o.att || .006; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); if(o.hold) g.gain.setValueAtTime(peak, t + a + o.hold); g.gain.exponentialRampToValueAtTime(.0001, t + a + (o.hold||0) + dur);
    n.connect(g); g.connect(this.out); if(o.echo) g.connect(this.dl); s.start(t); s.stop(t + a + (o.hold||0) + dur + .05); },
  drum(kind, t, amp=1){ const c = SFX.ctx;
    if(kind==='kick'){ const o = c.createOscillator(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(40, t + .12); const g = c.createGain(); g.gain.setValueAtTime(.5*amp, t); g.gain.exponentialRampToValueAtTime(.0001, t + .22); o.connect(g); g.connect(this.out); o.start(t); o.stop(t + .25); return; }
    const s = c.createBufferSource(); s.buffer = SFX.nbuf; const f = c.createBiquadFilter(); const g = c.createGain();
    if(kind==='snare'){ f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = .8; g.gain.setValueAtTime(.2*amp, t); g.gain.exponentialRampToValueAtTime(.0001, t + .16); this.v('triangle', 50, t, .08, .12*amp); }
    else if(kind==='clap'){ f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.4; g.gain.setValueAtTime(.0001, t); [0, .012, .024].forEach(d=>{ g.gain.setValueAtTime(.22*amp, t + d); g.gain.exponentialRampToValueAtTime(.03, t + d + .01); }); g.gain.exponentialRampToValueAtTime(.0001, t + .18); }
    else if(kind==='hat'){ f.type = 'highpass'; f.frequency.value = 7500; g.gain.setValueAtTime(.06*amp, t); g.gain.exponentialRampToValueAtTime(.0001, t + .04); }
    else if(kind==='ohat'){ f.type = 'highpass'; f.frequency.value = 6500; g.gain.setValueAtTime(.05*amp, t); g.gain.exponentialRampToValueAtTime(.0001, t + .22); }
    else if(kind==='shaker'){ f.type = 'bandpass'; f.frequency.value = 6000; f.Q.value = 2; g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(.04*amp, t + .02); g.gain.exponentialRampToValueAtTime(.0001, t + .07); }
    s.connect(f); f.connect(g); g.connect(this.out); s.start(t, Math.random()*1.5); s.stop(t + .3); },
  chord(th, bar){ const [off, q] = th.prog[bar % th.prog.length]; const r = th.root + off; return q==='m' ? [r, r+3, r+7] : [r, r+4, r+7]; },
  makeMotif(th){ const rng = mulberry(th.seed*977 + 13); const m = [];
    for(let bar=0; bar<4; bar++){ const row = []; for(let s=0;s<16;s+=2){ const rest = rng() < (s%4 ? .45 : .2); row.push(rest ? null : {deg: Math.floor(rng()*5), len: rng()<.3 ? 4 : 2}); } m.push(row); }
    return m; },
  note(i, t, s16, th){
    const bar = Math.floor(i/16), s = i % 16, sec = Math.floor(bar/4) % 4; const ch = this.chord(th, bar); const st = th.style; const hype = this.hype;
    if(!this.motif) this.motif = this.makeMotif(th);
    // drums
    const full = sec > 0 || st==='drive';
    if(st==='chill'){ if(s===0 || s===10) this.drum('kick', t, .7); if(s===8) this.drum('snare', t, .5); if(s%2===0) this.drum('shaker', t, s%4 ? .7 : 1); }
    else if(st==='dream'){ if(s===0 || (s===10 && full)) this.drum('kick', t, .8); if(s===8 && full) this.drum('clap', t, .7); if(s%4===2) this.drum('hat', t, .8); if(s%2===0 && sec===2) this.drum('shaker', t); }
    else if(st==='drive'){ if(s%4===0) this.drum('kick', t); if(s===4 || s===12) this.drum('snare', t); if(s%2===0) this.drum('hat', t, s%4 ? 1 : .6); if(s%4===2 && full) this.drum('ohat', t, .8); if(hype && s%2===1) this.drum('hat', t, .5); }
    else if(st==='bounce'){ if(s===0 || s===6 || s===8 || (s===14 && full)) this.drum('kick', t); if(s===4 || s===12) this.drum('clap', t); if(s%2===0) this.drum('hat', t, s%4===2 ? 1 : .5); }
    else { if(s===0 || s===8 || (s===10 && full)) this.drum('kick', t); if(s===4 || s===12) this.drum('snare', t); if(s%2===0) this.drum('hat', t, s%4===2 ? 1 : .55); if(s===14 && sec===3) this.drum('ohat', t); }
    if(hype && s===0) this.drum('ohat', t, 1);
    if(s===15 && bar%4===3 && st!=='chill'){ this.drum('snare', t, .6); this.drum('snare', t + s16/2, .8); }
    // bass
    const r = ch[0] - 24; const bpat = {pop:[0,3,6,8,11,14], drive:[0,2,4,6,8,10,12,14], dream:[0,8], bounce:[0,3,6,10,12], chill:[0,6,10]}[st] || [0,8];
    if(bpat.includes(s)){ const oct = (st==='drive' && s%4===2) || (st==='pop' && s===6) ? 12 : 0; this.v(st==='dream' || st==='chill' ? 'triangle' : 'sawtooth', r + oct, t, st==='dream' ? s16*7 : s16*1.6, st==='dream' ? .16 : .11, {cut:st==='drive' ? 900 : 600, cut2:200, q:4}); }
    // pad on each bar
    if(s===0){ const len = s16*16; ch.forEach((m,k)=>{ this.v('sawtooth', m, t, len*.6, .022, {cut:1400, cut2:600, att:.25, hold:len*.35, det:k%2 ? 9 : -9}); this.v('sawtooth', m + 12, t, len*.6, .012, {cut:1800, cut2:700, att:.3, hold:len*.3, det:k%2 ? -7 : 7}); }); }
    // arp
    const arpOn = (st==='chill') || (st==='dream') || sec===2 || (sec===3 && st!=='pop') || hype;
    if(arpOn && s%(st==='chill' ? 2 : 1)===0){ const seq = [0,1,2,1,2,0,1,2]; const m = ch[seq[(s/(st==='chill'?2:1)|0) % 8]] + 12 + (s>=8 && st==='dream' ? 12 : 0); this.v('triangle', m, t, s16*1.2, st==='dream' ? .05 : .035, {echo:true}); }
    // lead melody (sections 1 and 3)
    if((sec===1 || sec===3) && s%2===0){ const n = this.motif[bar%4][s/2]; if(n){ const scale = ch.concat([ch[0]+12, ch[1]+12]); const m = scale[n.deg % scale.length] + 12 + (sec===3 && bar%4===3 ? 12 : 0);
      this.v(th.lead, m, t, s16*n.len*.9, th.lead==='sawtooth' ? .03 : .04, {cut:th.lead==='triangle' ? 0 : 2800, cut2:1400, echo:true}); this.v('sine', m + 12, t, s16*n.len*.6, .015); } }
  }
};

/* ---------------- room (phones) ---------------- */
// Inside claude.ai the game uses Claude's room. Anywhere else (the public link) phones talk through free public
// MQTT relays: no accounts, works on any Wi-Fi or mobile data. Every message is the sender's whole state, so a lost
// or doubled message does no harm, and we use two relays at once in case one is down.
let room = null, groom = null, roomCode = '';
const ON_CLAUDE = !!(window.claude && window.claude.use);
const QS = new URLSearchParams(location.search);
const BROKERS = QS.get('broker') ? QS.get('broker').split(',') : ['wss://broker.emqx.io:8084/mqtt', 'wss://broker.hivemq.com:8884/mqtt'];
const RELAY_OK = !ON_CLAUDE && 'WebSocket' in window && (location.protocol==='https:' || QS.has('broker'));
const roomReady = (async()=>{ try{ if(ON_CLAUDE){ room = await window.claude.use('room'); } }catch{ room = null; } if(!room && RELAY_OK) room = relayRoom(); return room; })();
// a tiny MQTT 3.1.1 client over WebSocket (QoS 0 only)
function mqttConn(url, cid, will, onMsg, onUp){
  const enc = new TextEncoder(), dec = new TextDecoder(); let ws = null, retry = 0, ping = 0, pid = 0, closed = false;
  const c = {up:false, subs:new Set()};
  const str = s => { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; };
  const pkt = (h, body) => { const l = []; let n = body.length; do{ let d = n % 128; n = Math.floor(n/128); if(n) d |= 128; l.push(d); } while(n); const o = new Uint8Array(1 + l.length + body.length); o[0] = h; o.set(l, 1); o.set(body, 1 + l.length); return o; };
  const send = b => { if(ws && ws.readyState===1) ws.send(b); };
  const subPkt = t => { pid = pid % 65000 + 1; return pkt(0x82, [pid >> 8, pid & 255, ...str(t), 0]); };
  c.sub = t => { c.subs.add(t); if(c.up) send(subPkt(t)); };
  c.pub = (t, m) => { if(c.up) send(pkt(0x30, [...str(t), ...enc.encode(m)])); };
  const later = () => { if(closed) return; retry = Math.min(retry + 1, 8); setTimeout(open, 400*retry); };
  function open(){
    if(closed) return; try{ ws = new WebSocket(url, 'mqtt'); }catch(e){ ws = null; later(); return; }
    ws.binaryType = 'arraybuffer'; let buf = new Uint8Array(0); const me = ws;
    ws.onopen = () => send(pkt(0x10, [...str('MQTT'), 4, 0x02 | (will ? 0x04 : 0), 0, 30, ...str(cid), ...(will ? [...str(will[0]), ...str(will[1])] : [])]));
    ws.onmessage = e => { const d = new Uint8Array(e.data), nb = new Uint8Array(buf.length + d.length); nb.set(buf); nb.set(d, buf.length); buf = nb;
      while(buf.length >= 2){ let m = 1, v = 0, i = 1, b; do{ if(i >= buf.length) return; b = buf[i++]; v += (b & 127)*m; m *= 128; } while(b & 128);
        if(buf.length < i + v) return; const hb = buf[0], h = hb >> 4, body = buf.slice(i, i + v); buf = buf.slice(i + v);
        if(h===2){ if(body[1]){ ws.close(); return; } c.up = true; retry = 0; c.subs.forEach(t=>send(subPkt(t))); onUp && onUp(c); }
        else if(h===3){ const tl = (body[0] << 8) | body[1]; let off = 2 + tl; if((hb >> 1) & 3) off += 2; onMsg(dec.decode(body.subarray(2, 2 + tl)), dec.decode(body.subarray(off))); } } };
    ws.onclose = () => { if(ws!==me) return; c.up = false; ws = null; later(); };
    ws.onerror = () => { try{ me.close(); }catch(e){} };
  }
  ping = setInterval(()=>send(new Uint8Array([0xC0, 0])), 20000);
  c.close = () => { closed = true; clearInterval(ping); if(ws){ send(new Uint8Array([0xE0, 0])); try{ ws.close(); }catch(e){} } c.up = false; };
  c.state = () => c.up;
  open(); return c;
}
function relayRoom(){
  const me = Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);
  return { relay:true, me,
    presence(){ return Promise.resolve(); }, peers(){ return []; }, onPeers(){},
    async join(name){
      const base = 'arcfall8/' + name + '/', peers = new Map(), cbs = []; let mine = null, mineStr = '', lastSent = 0, trail = 0;
      const list = () => { const l = [...peers.entries()].map(([peer, v])=>({peer, presence:v.p, sameTab:false})); if(mine) l.push({peer:me, presence:mine, sameTab:true}); return l; };
      const emit = () => { const l = list(); cbs.forEach(f=>{ try{ f({peers:l}); }catch(e){ console.error(e); } }); };
      const sendNow = () => { clearTimeout(trail); trail = 0; lastSent = performance.now(); if(mineStr) conns.forEach(c=>c.pub(base + 'p/' + me, mineStr)); };
      const onMsg = (t, m) => { if(!t.startsWith(base)) return; const k = t.slice(base.length);
        if(k==='hello'){ if(m!==me) sendNow(); return; }
        if(k==='bye'){ if(m!==me && peers.delete(m)) emit(); return; }
        if(k.startsWith('p/')){ const id = k.slice(2); if(id===me) return; const old = peers.get(id); if(old && old.s===m){ old.t = Date.now(); return; }
          let p; try{ p = JSON.parse(m); }catch(e){ return; } peers.set(id, {p, s:m, t:Date.now()}); emit(); } };
      const conns = BROKERS.map(u=>mqttConn(u, 'arc' + me + Math.random().toString(36).slice(2, 6), [base + 'bye', me], onMsg, c=>{ c.pub(base + 'hello', me); if(mineStr) c.pub(base + 'p/' + me, mineStr); }));
      conns.forEach(c=>c.sub(base + '#'));
      const beat = setInterval(()=>{ sendNow(); const now = Date.now(); let gone = false; peers.forEach((v, k)=>{ if(now - v.t > 7000){ peers.delete(k); gone = true; } }); if(gone) emit(); }, 2000);
      return {
        presence(obj){ mine = obj; mineStr = JSON.stringify(obj); const dt = performance.now() - lastSent; if(dt >= 50) sendNow(); else if(!trail) trail = setTimeout(sendNow, 50 - dt); return Promise.resolve(); },
        peers: list, onPeers(f){ cbs.push(f); },
        online(){ return conns.some(c=>c.state()); },
        async leave(){ clearInterval(beat); conns.forEach(c=>{ c.pub(base + 'bye', me); c.close(); }); peers.clear(); cbs.length = 0; }
      };
    }
  };
}

/* ================= RENDERER (2D canvas) ================= */
const cv = $('#cv'); const ctx = cv.getContext('2d');
let SW = 0, SH = 0, DPR = 1;
function resize(){ DPR = Math.min(devicePixelRatio||1, 2); SW = innerWidth; SH = innerHeight; cv.width = SW*DPR; cv.height = SH*DPR; }
const hudK = ()=> SH<=360 ? .5 : SH<=500 ? .55 : SW<=760 ? .6 : (SW<=1100||SH<=640) ? .78 : 1; // keep in step with the #hud --k media rules
addEventListener('resize', resize); resize();
const cam = {x:W/2, y:H*.45, z:1, tx:W/2, ty:H*.45, tvw:1100, vw:1100, shake:0, overview:false};
const sx = x => (x - cam.x)*cam.z + SW/2;
const sy = y => SH/2 - (y - cam.y)*cam.z;
const BOTTOM_UI = () => mode==='play' ? 130 : 0;
const VIEW_LO = 30, VIEW_HI = 960;
function wholeView(){ return mode==='play' && (settings.view==='full') !== !!cam.overview; }
function updateCam(dt){
  let vw = cam.tvw, tx = cam.tx, ty = cam.ty;
  if(wholeView()){ const top = 72, avail = Math.max(200, SH - BOTTOM_UI() - top); const z = Math.min(SW/(W*1.02), avail/(VIEW_HI - VIEW_LO));
    vw = SW/z; tx = W/2; ty = (VIEW_LO + VIEW_HI)/2 - (SH/2 - (top + avail/2))/z;
    cam.vw = lerp(cam.vw, vw, 1-Math.pow(.02, dt)); cam.z = SW/cam.vw; cam.x = lerp(cam.x, tx, 1-Math.pow(.01, dt)); cam.y = lerp(cam.y, ty, 1-Math.pow(.01, dt));
    cam.punch = Math.max(0, (cam.punch||0) - dt*.25); cam.z *= 1/(1 - cam.punch*.5);
    cam.sx = (Math.random()-.5)*cam.shake; cam.sy = (Math.random()-.5)*cam.shake; cam.shake = Math.max(0, cam.shake - dt*55); return; }
  vw = Math.max(vw, 520);
  cam.punch = Math.max(0, (cam.punch||0) - dt*.25);
  cam.vw = lerp(cam.vw, vw, 1-Math.pow(.04, dt)); cam.z = SW / (cam.vw * (1 - cam.punch));
  // keep the view inside the world vertically where possible
  const halfH = (SH/2)/cam.z;
  ty = clamp(ty, halfH - BOTTOM_UI()/cam.z*0.5 - 60, H + 120 - halfH);
  const halfW = (SW/2)/cam.z, edge = mode==='play' ? 300 : 120; tx = clamp(tx, Math.min(W/2, halfW - edge), Math.max(W/2, W - halfW + edge));
  cam.x = lerp(cam.x, tx, 1-Math.pow(.015, dt)); cam.y = lerp(cam.y, ty, 1-Math.pow(.015, dt));
  cam.sx = (Math.random()-.5)*cam.shake; cam.sy = (Math.random()-.5)*cam.shake; cam.shake = Math.max(0, cam.shake - dt*55);
}

/* ----- terrain ----- */
let terrain = null; // {mask, cv, ctx, theme, mapId}
function genMask(mapId, seed){
  const mask = new Uint8Array(W*H); const rng = mulberry(seed);
  const set = (x,y,v)=>{ if(x>=0&&x<W&&y>=0&&y<H) mask[(H-1-y)*W+x]=v; };
  const p = [rng()*9, rng()*9, rng()*9];
  const edge = x => { const e = Math.min(x, W-x); return clamp((e-50)/110, 0, 1); };
  function column(hf){ for(let x=0;x<W;x++){ const h = Math.floor(hf(x)*edge(x)); for(let y=120;y<h;y++) set(x,y,1); } }
  function blob(cx, cy, rx, ryTop, ryBot, v, wob=.12){ const ph = rng()*9;
    for(let y=Math.floor(cy-ryBot-10); y<cy+ryTop+10; y++) for(let x=Math.floor(cx-rx-12); x<cx+rx+12; x++){
      const dx=(x-cx)/rx, dy = y>cy ? (y-cy)/ryTop : (cy-y)/ryBot; const a = Math.atan2(dy,dx);
      const rr = 1 + wob*Math.sin(a*5+ph) + wob*.5*Math.sin(a*11+ph*2); if(dx*dx+dy*dy < rr*rr) set(x,y,v); } }
  column(x => H*.38 + 60*Math.sin(x*.0042+p[0]) + 30*Math.sin(x*.011+p[1]) + 10*Math.sin(x*.033+p[2]));
  blob(W*.32, H*.66, 120, 26, 70, 1); blob(W*.7, H*.7, 110, 24, 64, 1);
  return mask;
}
function paintProcedural(mask, th){
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d');
  const img = x.createImageData(W, H), d = img.data; const dTop = new Uint16Array(W);
  for(let col=0; col<W; col++){ let run = 0; for(let r=0;r<H;r++){ const i = r*W+col; run = mask[i] ? run+1 : 0; if(!mask[i]) continue; const k = clamp(run/160,0,1);
    const g = run < 8 ? th.grass : [lerp(th.soil1[0],th.soil2[0],k), lerp(th.soil1[1],th.soil2[1],k), lerp(th.soil1[2],th.soil2[2],k)];
    const n = .92 + Math.random()*.12; d[i*4]=g[0]*n; d[i*4+1]=g[1]*n; d[i*4+2]=g[2]*n; d[i*4+3]=255; } }
  x.putImageData(img,0,0); return c;
}
function buildTerrain(mapId, seed){
  const th = MAPS[mapId];
  const c = document.createElement('canvas'); c.width = W; c.height = H; const x = c.getContext('2d', {willReadFrequently:true});
  const mask = new Uint8Array(W*H);
  const gi = IMG['ground-'+mapId];
  if(gi){
    x.drawImage(gi, 0, 0, W, H);
    const data = x.getImageData(0,0,W,H); const d = data.data;
    for(let i=0;i<W*H;i++){ if(d[i*4+3] > 110){ mask[i] = 1; d[i*4+3] = 255; } else { d[i*4+3] = 0; } }
    x.putImageData(data, 0, 0);
  } else {
    const m = genMask(mapId, seed); mask.set(m); x.drawImage(paintProcedural(m, th), 0, 0);
  }
  const sh = document.createElement('canvas'); sh.width = W; sh.height = H; const shx = sh.getContext('2d'); shx.drawImage(c,0,0); shx.globalCompositeOperation='source-in'; shx.fillStyle='#0b0614'; shx.fillRect(0,0,W,H); shx.globalCompositeOperation='source-over';
  terrain = {mask, cv:c, ctx:x, theme:th, mapId, sh, shx};
  buildMiniBase();
}
function solid(x, y){ const xi=x|0, yi=y|0; if(xi<0||xi>=W||yi<0||yi>=H) return false; return terrain.mask[(H-1-yi)*W+xi]===1; }
function topAt(x, from=H-1){ for(let y=from;y>=0;y--) if(solid(x,y)) return y+1; return -1; }
function crater(x, y, r){
  const m = terrain.mask, r2 = r*r;
  for(let dy=-r; dy<=r; dy++){ const yy = (y+dy)|0; if(yy<0||yy>=H) continue; const row=(H-1-yy)*W; const w = Math.sqrt(r2-dy*dy);
    for(let xx=Math.max(0,(x-w)|0); xx<=Math.min(W-1,(x+w)|0); xx++) m[row+xx]=0; }
  const c = terrain.ctx; c.save();
  c.globalCompositeOperation='source-atop';
  const g = c.createRadialGradient(x, H-y, r*.7, x, H-y, r+16); g.addColorStop(0,'rgba(20,8,8,.85)'); g.addColorStop(.45,'rgba(40,16,10,.55)'); g.addColorStop(1,'rgba(40,16,10,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, H-y, r+16, 0, 7); c.fill();
  c.globalCompositeOperation='destination-out'; c.fillStyle = '#000'; c.beginPath(); c.arc(x, H-y, r, 0, 7); c.fill();
  const s2 = terrain.shx; s2.save(); s2.globalCompositeOperation='destination-out'; s2.beginPath(); s2.arc(x, H-y, r, 0, 7); s2.fill(); s2.restore();
  c.restore(); miniDirty = true;
}

/* ----- minimap ----- */
let miniBase = null, miniDirty = true;
function buildMiniBase(){ miniBase = document.createElement('canvas'); miniBase.width = 230; miniBase.height = 150; miniDirty = true; }
function drawMini(){
  const m = $('#mini'); if(!m || !terrain || !Gm) return; const c = m.getContext('2d');
  if(miniDirty){ const b = miniBase.getContext('2d'); b.clearRect(0,0,230,150); b.drawImage(terrain.cv, 0, 0, 230, 150); miniDirty = false; }
  c.clearRect(0,0,230,150); const g = c.createLinearGradient(0,0,0,150); g.addColorStop(0,'#1a2a5a'); g.addColorStop(1,'#3a2a6a'); c.fillStyle = g; c.fillRect(0,0,230,150);
  c.globalAlpha = .9; c.drawImage(miniBase, 0, 0); c.globalAlpha = 1;
  const k = 230/W, ky = 150/H;
  c.fillStyle = 'rgba(80,140,255,.5)'; c.fillRect(0, 150-Gm.waterY*ky, 230, Gm.waterY*ky);
  Gm.players.forEach(p=>{ if(!p.alive) return; c.fillStyle = p.look.c1; c.strokeStyle = '#000'; c.lineWidth = 2; c.beginPath(); c.arc(p.x*k, 150-(p.y+30)*ky, Gm.players[Gm.turn]===p ? 6 : 4.5, 0, 7); c.fill(); c.stroke(); });
  Gm.proj.forEach(q=>{ c.fillStyle = '#fff'; c.fillRect(q.x*k-1.5, 150-q.y*ky-1.5, 3, 3); });
  const vw = SW/cam.z, vh = SH/cam.z; c.strokeStyle = '#2a5aff'; c.lineWidth = 2.5; c.strokeRect((cam.x-vw/2)*k, 150-(cam.y+vh/2)*ky, vw*k, vh*ky);
}

/* ----- particles ----- */
let parts = [];
const glowCache = {};
function glowSprite(color){ if(glowCache[color]) return glowCache[color]; const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32,32,0,32,32,32); g.addColorStop(0,'#fff'); g.addColorStop(.25,color); g.addColorStop(1,'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0,0,64,64); return glowCache[color] = c; }
const smokeSpr = (()=>{ const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(28,26,2,32,32,32); g.addColorStop(0,'rgba(255,255,255,1)'); g.addColorStop(.6,'rgba(255,255,255,.55)'); g.addColorStop(1,'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0,0,64,64); return c; })();
function P(o){ parts.push(Object.assign({vx:0, vy:0, g:0, drag:1, grow:0, life:1, a:1, type:'glow', color:'#ffb04a', size:10, rot:0, vr:0}, o, {max:o.life||1})); }
function boomFX(x, y, r, color, style='', wl=0){
  const big = r/42;
  if(style==='confetti'){ const cs = ['#ff5d6c','#ffd447','#53c3ff','#7af0c8','#ff8fc7','#b48bff']; for(let i=0;i<34*big;i++){ const a = Math.random()*Math.PI, v = 160 + Math.random()*380; P({type:'chunk', x, y, vx:Math.cos(a)*v*(Math.random()<.5?-1:1), vy:Math.sin(a)*v, g:-260, drag:.965, size:5 + Math.random()*5, life:2 + Math.random(), color:cs[i % cs.length], vr:(Math.random()-.5)*16}); } }
  else if(style==='fireworks'){ const cs = ['#ff5d6c','#ffd447','#53c3ff','#b48bff','#7af0c8']; for(let k=0;k<3;k++){ const ox = x + (Math.random()-.5)*r*2, oy = y + r*.6 + Math.random()*r*1.6, col = cs[(Math.random()*cs.length)|0]; for(let i=0;i<16;i++){ const a = i/16*Math.PI*2, v = 160 + Math.random()*120; P({type:'spark', x:ox, y:oy, vx:Math.cos(a)*v, vy:Math.sin(a)*v, g:-120, drag:.95, size:4, life:.9 + Math.random()*.4, color:col}); } P({type:'glow', x:ox, y:oy, size:r*1.4, grow:r, life:.4, color:col}); } }
  else if(style==='inferno'){ P({type:'glow', x, y, size:r*4, grow:r*2, life:.7, color:'#ff4a1a'}); for(let i=0;i<22*big;i++) P({type:'glow', x:x + (Math.random()-.5)*r*1.6, y:y + Math.random()*r*.5, vx:(Math.random()-.5)*60, vy:120 + Math.random()*260, drag:.97, size:16 + Math.random()*18, grow:-10, life:.8 + Math.random()*.6, color:Math.random()<.5 ? '#ffb43a' : '#ff4a1a'}); }
  else if(style==='blackhole'){ P({type:'ring', x, y, size:r*2.6, grow:-r*4.5, life:.55, color:'#b48bff'}); P({type:'void', x, y, size:r*1.3, grow:-r*.9, life:1.1}); for(let i=0;i<22;i++){ const a = Math.random()*Math.PI*2, d = r*(1.6 + Math.random()); P({type:'star', x:x + Math.cos(a)*d, y:y + Math.sin(a)*d, vx:-Math.cos(a)*d*1.8, vy:-Math.sin(a)*d*1.8, size:5 + Math.random()*4, life:.55, color: i%2 ? '#d9c2ff' : '#ffffff', vr:10}); } }
  if(wl >= 4){ P({type:'ring', x, y, size:r*.8, grow:r*5.5, life:.45, color:'#ffd447'}); if(wl >= 5) for(let i=0;i<12;i++){ const a = i/12*Math.PI*2; P({type:'star', x, y, vx:Math.cos(a)*340, vy:Math.sin(a)*340, drag:.93, size:7, life:.7, color:'#ffe27a', vr:8}); } }
  P({type:'ring', x, y, size:r*.6, grow:r*4, life:.35, color:'#fff'});
  P({type:'glow', x, y, size:r*3.4, grow:r*1.5, life:.3, color:'#fff6c0'});
  P({type:'glow', x, y, size:r*2.6, grow:r*2, life:.55, color});
  for(let i=0;i<22*big;i++){ const a = Math.random()*Math.PI*2, v = 120+Math.random()*380*big; P({type:'glow', x, y, vx:Math.cos(a)*v, vy:Math.sin(a)*v+90, g:-520, drag:.985, size:10+Math.random()*16, life:.5+Math.random()*.5, color: i%3 ? '#ffb04a' : color}); }
  for(let i=0;i<9*big;i++){ const a = Math.random()*Math.PI*2, v = 30+Math.random()*80; P({type:'smoke', x:x+Math.cos(a)*r*.4, y:y+Math.sin(a)*r*.4, vx:Math.cos(a)*v, vy:Math.sin(a)*v+50, drag:.97, size:r*.9+Math.random()*r*.6, grow:r*.8, life:1.2+Math.random()*.8, color:'#5a4a5e', a:.6}); }
  const th = terrain.theme; const cc = `rgb(${th.soil1.join(',')})`;
  for(let i=0;i<12*big;i++){ const a = Math.random()*Math.PI, v = 160+Math.random()*300; P({type:'chunk', x, y, vx:Math.cos(a)*v*(Math.random()<.5?-1:1), vy:Math.sin(a)*v, g:-900, size:3+Math.random()*6, life:1.2+Math.random()*.6, color: i%2? cc : `rgb(${th.grass.join(',')})`, vr:(Math.random()-.5)*14}); }
  cam.shake = Math.min(26, cam.shake + r*.32);
}
function updateParts(dt){
  for(let i=parts.length-1;i>=0;i--){ const p = parts[i]; p.life -= dt; if(p.life<=0){ parts.splice(i,1); continue; }
    p.vx *= Math.pow(p.drag, dt*60); p.vy *= Math.pow(p.drag, dt*60); p.vy += p.g*dt; p.x += p.vx*dt; p.y += p.vy*dt; p.size += p.grow*dt; p.rot += p.vr*dt;
    if(p.type==='chunk' && terrain && solid(p.x, p.y) && p.vy<0){ p.vy *= -.3; p.vx *= .6; } }
}
function drawParts(layer){
  for(const p of parts){ const k = p.life/p.max; const s = Math.max(.5, p.size*cam.z); const X = sx(p.x)+cam.sx, Y = sy(p.y)+cam.sy;
    if(p.type==='glow' && layer==='add'){ ctx.globalAlpha = Math.min(1, k*1.5)*p.a; ctx.drawImage(glowSprite(p.color), X-s, Y-s, s*2, s*2); }
    else if(p.type==='ring' && layer==='add'){ ctx.globalAlpha = k; ctx.strokeStyle = p.color; ctx.lineWidth = 6*k*cam.z+1; ctx.beginPath(); ctx.arc(X, Y, s, 0, 7); ctx.stroke(); }
    else if(p.type==='smoke' && layer==='norm'){ ctx.globalAlpha = Math.min(1,k*1.4)*p.a; ctx.filter = 'none'; ctx.drawImage(smokeSpr, X-s, Y-s, s*2, s*2); }
    else if(p.type==='chunk' && layer==='norm'){ ctx.globalAlpha = Math.min(1,k*2); ctx.save(); ctx.translate(X,Y); ctx.rotate(p.rot); ctx.fillStyle = p.color; ctx.strokeStyle='rgba(0,0,0,.5)'; ctx.lineWidth=1; ctx.fillRect(-s/2,-s/2,s,s); ctx.strokeRect(-s/2,-s/2,s,s); ctx.restore(); }
    else if(p.type==='drop' && layer==='norm'){ ctx.globalAlpha = Math.min(1,k*2); ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(X, Y, s, 0, 7); ctx.fill(); }
    else if(p.type==='heart' && layer==='norm'){ ctx.globalAlpha = Math.min(1,k*2); ctx.fillStyle = p.color; heartPath(ctx, X, Y, s); }
    else if(p.type==='star' && layer==='add'){ ctx.globalAlpha = Math.min(1,k*2); ctx.fillStyle = p.color; ctx.save(); ctx.translate(X, Y); ctx.rotate(p.rot); star4(ctx, 0, 0, s); ctx.restore(); }
    else if(p.type==='spark' && layer==='add'){ ctx.globalAlpha = Math.min(1,k*1.6); ctx.strokeStyle = p.color; ctx.lineWidth = Math.max(1.5, s*.6); ctx.beginPath(); ctx.moveTo(X, Y); ctx.lineTo(X - p.vx*.05*cam.z, Y + p.vy*.05*cam.z); ctx.stroke(); }
    else if(p.type==='zap' && layer==='add'){ ctx.globalAlpha = Math.min(1,k*3); ctx.strokeStyle = p.color; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X, Y); let zx = X, zy = Y; for(let j=0;j<3;j++){ zx += (hash(p.seed + j)-.5)*s*2; zy += (hash(p.seed + j + 5)-.5)*s*2; ctx.lineTo(zx, zy); } ctx.stroke(); }
    else if(p.type==='void' && layer==='norm'){ ctx.globalAlpha = Math.min(1,k*2); const g = ctx.createRadialGradient(X, Y, 1, X, Y, s); g.addColorStop(0, '#000'); g.addColorStop(.6, '#1a0640'); g.addColorStop(1, 'rgba(90,40,200,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y, s, 0, 7); ctx.fill(); }
  }
  ctx.globalAlpha = 1;
}
const floaters = [];
function popText(x, y, text, cls=''){ floaters.push({x, y, text, cls, t:0}); }

/* ================= GAME ================= */
let mode = 'title';
let TOUCH = matchMedia('(pointer:coarse)').matches, kbdUsed = false; window.addEventListener('touchstart', ()=>{ TOUCH = true; }, {once:true, passive:true});
let Gm = null;
const keys = {};
const touch = {left:false,right:false,up:false,down:false,fire:false};

const botSeed = (Math.random()*1e6)|0;
function playerFromSlot(s, i, k=i){
  const c = CH[s.look.ch] || CHARS[0]; const maxhp = Math.round(c.hp*settings.hp); const name = (s.look.name||c.name).slice(0,14);
  let wpn = WEAPONS[s.look.wpn] ? s.look.wpn : 'thunder', cos;
  if(s.ctl==='local'){ const r = profFor(name); if(!wpnOpen(r, wpn)) wpn = 'thunder'; cos = cosFromProf(r, c.id, wpn); }
  else if(s.ctl==='phone') cos = cleanCos(s.cos, c.id);
  else cos = randomCos(c.id, wpn, mulberry(botSeed + i*7919 + c.id.length));
  return {slot:i, name, look:{...s.look}, ch:c, wpn, cos, items:(s.look.items||[]).filter(id=>ITEMS[id]).slice(0,3).map(id=>({id, left:ITEMS[id].uses})),
    team: settings.mode==='teams' ? (k%2) : i, ctl:s.ctl, bot:s.bot, peer:s.peer,
    x:0, y:0, vy:0, face:1, angle:45, hp:maxhp, maxhp, alive:true, delay:Math.random()*15, energy:20, stamina:100, shield:false, frozen:false, falling:false,
    lastPower:null, stats:{dmg:0, kills:0, shots:0, hits:0, best:0, taken:0, crits:0, arcs:0, doubles:0, longs:0}, flash:0, walkT:0, deadT:0, padSeen:null, seed:Math.random()*9};
}
function placePlayers(players, shuffle=false){
  const n = players.length; let order = players.slice();
  if(shuffle) for(let i=order.length-1;i>0;i--){ const j = Math.random()*(i+1)|0; [order[i], order[j]] = [order[j], order[i]]; }
  if(settings.mode==='teams'){ const a = order.filter(p=>p.team===0), b = order.filter(p=>p.team===1); order = (shuffle && Math.random()<.5) ? b.concat(a) : a.concat(b); }
  // flat spots on solid ground, kept apart from each other
  // open sky above, so nobody starts under a ledge and hits the roof with their first shot
  const openAbove = (x, y)=>{ for(let yy=y+HERO_H+14; yy<H-4; yy+=6) if(solid(x,yy)||solid(x-18,yy)||solid(x+18,yy)) return false; return true; };
  const cands = []; for(let x=40;x<W-40;x+=8){ const y = topAt(x, H-80); if(y>140 && Math.abs(topAt(x-16, H-80)-y)<10 && Math.abs(topAt(x+16, H-80)-y)<10) cands.push([x, y, openAbove(x, y) ? 0 : 500]); }
  const lo = n > 5 ? .07 : .12, span = 1 - lo*2; const taken = [];
  order.forEach((p,k)=>{
    const want = W*(lo + span*(n===1?.5:k/(n-1)));
    let best = null; for(const c of cands){ if(taken.some(x=>Math.abs(x - c[0]) < (n > 5 ? 95 : 120))) continue; const d = Math.abs(c[0]-want) - c[1]*.05 + c[2]; if(!best || d<best.d) best = {d, x:c[0], y:c[1]}; }
    p.x = best ? best.x : want; p.y = best ? best.y : topAt(want, H-80) > 0 ? topAt(want, H-80) : 300; taken.push(p.x); p.face = p.x < W/2 ? 1 : -1;
  });
}
function launchState(p, angle, power){
  const a = angle*Math.PI/180; const sp = SPD*clamp(power, 1, 100);
  return {x:p.x + p.face*Math.cos(a)*44, y:p.y + 52 + Math.sin(a)*36, vx:p.face*Math.cos(a)*sp, vy:Math.sin(a)*sp};
}
// exact step under gravity, wind and air drag, so a shot lands in the same spot whatever the frame rate
function stepShot(o, ax, ay, h){ const e = Math.exp(-DRAG*h), k = (1 - e)/DRAG, tx = ax/DRAG, ty = ay/DRAG;
  o.x += tx*h + (o.vx - tx)*k; o.y += ty*h + (o.vy - ty)*k; o.vx = tx + (o.vx - tx)*e; o.vy = ty + (o.vy - ty)*e; }
// where a shot comes down on flat ground (target's body at the shooter's height), measured from the shooter's feet
function landX(angle, power, wind=0){ const a = angle*Math.PI/180, sp = SPD*power; const o = {x:Math.cos(a)*44, y:52 + Math.sin(a)*36, vx:Math.cos(a)*sp, vy:Math.sin(a)*sp}; const h = 1/120;
  for(let i=0;i<1800;i++){ const px = o.x, py = o.y; stepShot(o, wind*WIND_A, -SHOT_G, h); if(o.vy < 0 && o.y <= BODY_Y) return px + (o.x - px)*(py - BODY_Y)/((py - o.y) || 1); } return o.x; }
/* DDTank-style ruler: a target's "distance" is the number that makes the sky shot exact (Force 95, angle = 90 - distance, no wind) */
const RULER = Array.from({length:601}, (_, i)=>landX(90 - i*.05, SKY_FORCE));
function rulerDist(dx){ dx = Math.abs(dx); for(let i=1;i<RULER.length;i++) if(RULER[i] >= dx) return (i - 1 + (dx - RULER[i-1])/((RULER[i] - RULER[i-1]) || 1))*.05; return 30; }
const rulerX = d => RULER[clamp(Math.round(d/.05), 0, RULER.length-1)];
// DDTank force charts: the Force that lands a shot at each distance for the four classic angles
let CHARTS = null;
function forceCharts(){ if(CHARTS) return CHARTS; CHARTS = {};
  for(const ang of [20, 30, 50, 65]) CHARTS[ang] = Array.from({length:20}, (_, k)=>{ const want = rulerX(k + 1); let lo = 1, hi = 100; if(landX(ang, hi) < want) return '-'; for(let i=0;i<22;i++){ const m = (lo + hi)/2; if(landX(ang, m) < want) lo = m; else hi = m; } return Math.round((lo + hi)/2); });
  return CHARTS; }
const windFix = p => Math.round(Gm.wind*2*p.face*10)/10; // degrees to add to the sky formula for this shooter

/* ----- drawing the world ----- */
function drawBackground(t){
  const mapId = terrain ? terrain.mapId : settings.map; let bg = IMG['bgf-'+mapId];
  if(!bg && IMG['bg-'+mapId]){ const o = IMG['bg-'+mapId]; const c = document.createElement('canvas'); c.width = o.width; c.height = o.height; const x = c.getContext('2d'); x.filter = 'blur(2px) saturate(.85) brightness(.78)'; x.drawImage(o, 0, 0); x.filter = 'none'; const g = x.createLinearGradient(0, 0, 0, c.height); g.addColorStop(0, 'rgba(10,6,30,0)'); g.addColorStop(1, 'rgba(10,6,30,.35)'); x.fillStyle = g; x.fillRect(0, 0, c.width, c.height); bg = IMG['bgf-'+mapId] = c; }
  if(mode==='title' && IMG['bg-'+mapId]) bg = IMG['bg-'+mapId];
  if(bg){ const s = Math.max(SW/bg.width, SH/bg.height)*1.12; const w = bg.width*s, h = bg.height*s;
    const px = (cam.x - W/2)/W, py = (cam.y - H/2)/H;
    ctx.drawImage(bg, (SW-w)/2 - px*w*.06, (SH-h)/2 + py*h*.04, w, h); }
  else { const th = MAPS[mapId]; const g = ctx.createLinearGradient(0,0,0,SH); g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]); ctx.fillStyle = g; ctx.fillRect(0,0,SW,SH); }
}
function drawWater(t, front){
  const th = terrain.theme; const wy = Gm ? Gm.waterY : 40; const top = sy(wy) + cam.sy;
  if(top > SH) return;
  ctx.save();
  if(!front){ const g = ctx.createLinearGradient(0, top, 0, SH); g.addColorStop(0, th.water[1]); g.addColorStop(1, th.water[2]); ctx.globalAlpha = .92; ctx.fillStyle = g; ctx.fillRect(0, top, SW, SH-top); }
  else {
    ctx.globalAlpha = .85; ctx.strokeStyle = th.foam; ctx.lineWidth = 3*cam.z+1; ctx.beginPath();
    for(let X=0; X<=SW+20; X+=16){ const wx = (X - SW/2)/cam.z + cam.x; const Y = top + Math.sin(wx*.03 + t*2.2)*4*cam.z + Math.sin(wx*.011 - t*1.3)*3*cam.z; X===0 ? ctx.moveTo(X,Y) : ctx.lineTo(X,Y); }
    ctx.stroke();
    ctx.globalAlpha = .35; ctx.fillStyle = th.water[0];
    for(let i=0;i<14;i++){ const wx = ((i*173 + t*30) % (W+400)) - 200; const X = sx(wx), Y = top + 18*cam.z + (i%4)*14*cam.z; ctx.fillRect(X, Y, 40*cam.z, 3*cam.z); }
  }
  ctx.restore();
}
function drawTerrain(){ const X = sx(0)+cam.sx, Y = sy(H)+cam.sy, w = W*cam.z, h = H*cam.z;
  ctx.globalAlpha = .55; ctx.drawImage(terrain.sh, X+4*cam.z, Y+10*cam.z, w, h); ctx.globalAlpha = .9; ctx.drawImage(terrain.sh, X-2*cam.z, Y-2*cam.z, w, h); ctx.drawImage(terrain.sh, X+2*cam.z, Y-2*cam.z, w, h); ctx.globalAlpha = 1;
  ctx.drawImage(terrain.cv, X, Y, w, h); }
function drawPlayer(p, t, active){
  const z = cam.z; const X = sx(p.x)+cam.sx, Y = sy(p.y)+cam.sy; const cos = p.cos || {sk:p.ch.id+':base'};
  ctx.save(); ctx.globalAlpha = .35; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(X, Y-2*z, 34*z, 8*z, 0, 0, 7); ctx.fill(); ctx.restore();
  if(active && p.alive){ ctx.save(); ctx.globalAlpha = .55 + Math.sin(t*5)*.2; ctx.strokeStyle = teamCol(p); ctx.lineWidth = 4*z; ctx.beginPath(); ctx.ellipse(X, Y-2*z, 42*z, 11*z, 0, 0, 7); ctx.stroke(); ctx.restore(); }
  if(!p.alive){ // tombstone
    ctx.save(); ctx.translate(X, Y); ctx.scale(z, z); ctx.fillStyle = '#8a86a0'; ctx.strokeStyle = '#2a2240'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(-18,0); ctx.lineTo(-18,-34); ctx.arc(0,-34,18,Math.PI,0); ctx.lineTo(18,0); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle='#2a2240'; ctx.fillRect(-3,-44,6,22); ctx.fillRect(-10,-37,20,6); ctx.restore();
    if(p.deadT < 1.2) drawHero(ctx, X, Y - p.deadT*60*z, z, p.face, {sk:cos.sk}, t, {grey:true, alpha:1 - p.deadT/1.2});
    return;
  }
  const breathe = Math.sin(t*3 + p.slot)*.018; const walk = p.moving ? Math.abs(Math.sin(p.walkT*12))*5 : 0;
  const hurt = p.hurt>0 ? p.hurt/.5 : 0; const rec = p.recoil>0 ? p.recoil/.25 : 0; const hop = p.win ? Math.abs(Math.sin(t*6 + p.slot))*22 : 0;
  const tilt = (p.moving ? Math.sin(p.walkT*12)*.05 : 0) - hurt*.25*p.face*Math.sin(hurt*9);
  const charge = p.charging ? Math.sin(t*40)*.012 + (Gm && Gm.power!=null ? Gm.power/100*.05 : 0) : 0;
  drawHero(ctx, X, Y, z, p.face, cos, t + p.seed, {dx:-p.face*rec*10*z, lift:(walk + hop)*z, rot:tilt, kx:1 - breathe*.5 + charge + rec*.08, ky:1 + breathe - charge - rec*.08, flash:p.flash, seed:p.seed});
  if(p.frozen){ ctx.save(); ctx.globalAlpha = .5; ctx.fillStyle = '#bfefff'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; const w = 92*z, h = 120*z; ctx.beginPath(); ctx.roundRect(X-w/2, Y-h, w, h, 10*z); ctx.fill(); ctx.stroke(); ctx.restore(); }
  if(p.shield){ ctx.save(); ctx.globalAlpha = .28 + Math.sin(t*4)*.06; const g = ctx.createRadialGradient(X, Y-55*z, 20*z, X, Y-55*z, 70*z); g.addColorStop(0,'rgba(160,230,255,0)'); g.addColorStop(.8,'rgba(160,230,255,.6)'); g.addColorStop(1,'rgba(255,255,255,.9)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(X, Y-55*z, 70*z, 0, 7); ctx.fill(); ctx.restore(); }
}
const TEAM_COL = ['#7fd0ff', '#ff8a8a'];
function teamCol(p){ return settings.mode==='teams' && mode==='play' ? TEAM_COL[p.team] : p.look.c1; }
function drawPlate(p, t, active){
  if(!p.alive) return;
  const z = cam.z, X = sx(p.x)+cam.sx, Yf = sy(p.y)+cam.sy, cos = p.cos || {};
  const fs = clamp(14*z, 11, 16); ctx.save(); ctx.lineJoin = 'round'; ctx.textBaseline = 'middle';
  // level and HP bar just under the feet
  const y1 = Yf + 6 + fs*.6, bw = clamp(62*z, 48, 70), bh = Math.max(6, 7*z), lv = String(cos.lv || 1);
  ctx.font = `400 ${fs*1.3}px 'Lilita One', Nunito`; const lw = ctx.measureText(lv).width; const x0 = X - (lw + 5 + bw)/2;
  ctx.textAlign = 'left'; ctx.lineWidth = 4; ctx.strokeStyle = '#3a1a00'; ctx.strokeText(lv, x0, y1);
  const lg = ctx.createLinearGradient(0, y1 - fs*.6, 0, y1 + fs*.6); lg.addColorStop(0, '#fff6b0'); lg.addColorStop(1, '#ff9a12'); ctx.fillStyle = lg; ctx.fillText(lv, x0, y1);
  const bx = x0 + lw + 5, by = y1 - bh/2; ctx.fillStyle = '#14203a'; ctx.beginPath(); ctx.roundRect(bx - 2, by - 2, bw + 4, bh + 4, 3); ctx.fill(); ctx.fillStyle = '#f4f6fa'; ctx.fillRect(bx, by, bw, bh);
  const f = p.hp/p.maxhp, hg = ctx.createLinearGradient(0, by, 0, by + bh); hg.addColorStop(0, '#ff9a8a'); hg.addColorStop(1, '#e0202a'); ctx.fillStyle = hg; ctx.fillRect(bx, by, bw*f, bh);
  // name in team colour, title in green underneath
  const y2 = y1 + fs*1.25; ctx.font = `900 ${fs}px Nunito, sans-serif`; ctx.textAlign = 'center';
  if(cos.fr){ const w = ctx.measureText(p.name).width + 22, h = fs + 8; ctx.fillStyle = 'rgba(16,8,36,.8)'; ctx.beginPath(); ctx.roundRect(X - w/2, y2 - h/2, w, h, 8); ctx.fill(); plateStyle(ctx, cos.fr, X - w/2, y2 - h/2, w, h, t); ctx.font = `900 ${fs}px Nunito, sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; }
  ctx.lineWidth = 3.5; ctx.strokeStyle = '#14203a'; ctx.strokeText(p.name, X, y2 + 1); ctx.fillStyle = teamCol(p); ctx.fillText(p.name, X, y2 + 1);
  { const tt = cos.ti ? (COS.title[cos.ti]||{}).name || '' : rankOf(cos.lv); ctx.font = `400 ${fs*.92}px 'Lilita One', Nunito`; const y3 = y2 + fs*1.15 + (cos.fr ? 3 : 0); ctx.lineWidth = 3.5; ctx.strokeStyle = '#0a3a14'; ctx.strokeText(tt, X, y3); ctx.fillStyle = '#86ff6a'; ctx.fillText(tt, X, y3); }
  // over the head: whose turn it is, and emotes
  const top = sy(p.y + HERO_H + 12)+cam.sy;
  if(active){ const ay = top - 4 + Math.sin(t*6)*4;
    ctx.fillStyle = '#ff3a3a'; ctx.strokeStyle = '#14203a'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(X - 10, ay - 13); ctx.lineTo(X + 10, ay - 13); ctx.lineTo(X, ay); ctx.closePath(); ctx.stroke(); ctx.fill();
    const ey = ay - 30, er = 14; const eg = ctx.createRadialGradient(X - 4, ey - 5, 2, X, ey, er); eg.addColorStop(0, '#ffffff'); eg.addColorStop(.6, '#9fc8ff'); eg.addColorStop(1, '#3a6ac8');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(X, ey, er, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#ffd447'; ctx.beginPath(); for(let k=0;k<10;k++){ const a = -Math.PI/2 + k*Math.PI/5, r = k%2 ? 4 : 9; ctx.lineTo(X + Math.cos(a)*r, ey + Math.sin(a)*r); } ctx.closePath(); ctx.fill(); ctx.lineWidth = 1.5; ctx.stroke(); }
  if(p.emote){ const e = p.emote; const k = clamp(Math.min(1, (2.6 - e.t)*6, e.t*4), 0, 1); emoteBubble(ctx, X, top - (active ? 52 : 8), e.text, .7 + .3*k, k); }
  ctx.restore();
}
function drawAim(p, t){
  const z = cam.z; const X = sx(p.x)+cam.sx, Y = sy(p.y+52)+cam.sy; const R = 86*z;
  ctx.save(); ctx.lineCap = 'round';
  // protractor arc
  const a0 = p.face>0 ? 0 : Math.PI, a1 = p.face>0 ? -Math.PI/2 : -Math.PI/2;
  ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 7*z; ctx.beginPath(); ctx.arc(X, Y, R, Math.min(a0==0?-Math.PI/2:Math.PI, a0==0?0:-Math.PI/2), Math.max(a0==0?-Math.PI/2:Math.PI, a0==0?0:-Math.PI/2)); ctx.stroke();
  const ang = p.angle*Math.PI/180; const dx = p.face*Math.cos(ang), dy = -Math.sin(ang);
  ctx.strokeStyle = '#fff'; ctx.lineWidth = 4*z; ctx.beginPath(); ctx.moveTo(X + dx*30*z, Y + dy*30*z); ctx.lineTo(X + dx*(R+16*z), Y + dy*(R+16*z)); ctx.stroke();
  ctx.fillStyle = '#ffd447'; ctx.strokeStyle = '#7a3a08'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(X + dx*R, Y + dy*R, 8*z, 0, 7); ctx.fill(); ctx.stroke();
  ctx.font = `900 ${clamp(15*z,11,17)}px Nunito`; ctx.fillStyle = '#fff'; ctx.textAlign = 'center'; ctx.strokeStyle = 'rgba(0,0,0,.7)'; ctx.lineWidth = 4;
  const tx = X + dx*(R+34*z), ty = Y + dy*(R+30*z); ctx.strokeText(Math.round(p.angle)+'°', tx, ty); ctx.fillText(Math.round(p.angle)+'°', tx, ty);
  const ab = arcBonus(p.angle); if(ab > 0){ const s = 'Sky shot +'+Math.round(ab*100)+'%'; ctx.font = `400 ${clamp(14*z,11,16)}px 'Lilita One', Nunito`; ctx.fillStyle = '#7fe6ff'; ctx.strokeText(s, tx, ty + clamp(18*z, 14, 20)); ctx.fillText(s, tx, ty + clamp(18*z, 14, 20)); }
  if(Gm.power!=null){ const pw = Math.round(Gm.power); const fs = clamp(34*z, 24, 40); ctx.font = `400 ${fs}px 'Lilita One', Nunito`; ctx.lineWidth = fs*.22; ctx.lineJoin = 'round'; ctx.strokeStyle = '#3a1a70'; const py = sy(p.y + HERO_H + 12) + cam.sy - 78;
    ctx.strokeText('Power '+pw, X, py); ctx.fillStyle = pw > 85 ? '#ff7a5a' : pw > 55 ? '#ffd447' : '#9dffae'; ctx.fillText('Power '+pw, X, py); }
  ctx.restore();
  // guide dots
  if(settings.guide==='off') return;
  const power = Gm.power!=null ? Gm.power : (p.lastPower ?? 60);
  const full = settings.guide==='full'; const w = activeWeapon(p); let {x, y, vx, vy} = launchState(p, Math.round(p.angle), power);
  const h = 1/60; let tt = 0; const tMax = full ? 6 : .2; let i = 0;
  ctx.save();
  const o = {x, y, vx, vy}, ax = full ? Gm.wind*WIND_A*w.wind : 0, ay = -SHOT_G*w.grav;
  while(tt < tMax){ for(let k=0;k<4;k++){ stepShot(o, ax, ay, h); tt += h; } x = o.x; y = o.y; if(solid(x,y) || y<0) break;
    const a = full ? .85 : (1 - tt/tMax); ctx.globalAlpha = a; ctx.fillStyle = i%2 ? '#fff' : '#ffd447'; ctx.beginPath(); ctx.arc(sx(x)+cam.sx, sy(y)+cam.sy, Math.max(2, (full?3:5-tt*4)*z), 0, 7); ctx.fill(); i++; }
  ctx.restore();
}
/* gold DDTank-style ruler along the bottom, plus each player's distance under their feet */
let rulerY = 0, rulerKey = '';
function drawRuler(p, t){
  const k = SW+'x'+SH; if(k!==rulerKey){ const b = $('#forceRow'); const r = b ? b.getBoundingClientRect() : null; rulerY = r && r.top > 100 ? r.top - 12 : SH - 56; rulerKey = k; }
  const z = cam.z, X0 = sx(p.x)+cam.sx, Y = rulerY;
  ctx.save(); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const bg = ctx.createLinearGradient(0, Y - 11, 0, Y + 11); bg.addColorStop(0, 'rgba(20,32,58,.82)'); bg.addColorStop(1, 'rgba(10,16,32,.9)'); ctx.fillStyle = bg; ctx.fillRect(0, Y - 11, SW, 22);
  ctx.fillStyle = '#ffd447'; ctx.fillRect(0, Y + 10, SW, 2); ctx.fillStyle = 'rgba(255,212,71,.45)'; ctx.fillRect(0, Y - 12, SW, 1);
  for(const dir of [-1, 1]) for(let h=1; h<=60; h++){ const d = h/2, x = X0 + dir*rulerX(d)*z; if(x < -20 || x > SW + 20) continue; const unit = h%2===0, five = d%5===0;
    ctx.fillStyle = five ? '#ffd447' : unit ? '#ffe9a0' : 'rgba(255,233,160,.55)'; ctx.fillRect(x - (five ? 1.5 : 1), Y + (unit ? 1 : 5), five ? 3 : 2, unit ? 9 : 5);
    if(unit){ ctx.font = `400 ${five ? 14 : 12}px 'Lilita One', Nunito`; ctx.lineWidth = 3; ctx.strokeStyle = '#0a1020'; ctx.strokeText(d, x, Y - 4); ctx.fillStyle = five ? '#ffd447' : '#ffffff'; ctx.fillText(d, x, Y - 4); } }
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#0a1020'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(X0, Y - 11); ctx.lineTo(X0 - 8, Y + 10); ctx.lineTo(X0 + 8, Y + 10); ctx.closePath(); ctx.fill(); ctx.stroke();
  const fs = clamp(15*z, 13, 18);
  Gm.players.forEach(q=>{ if(!q.alive || q===p) return; const d = rulerDist(q.x - p.x); const foe = q.team!==p.team; const s = d.toFixed(1);
    const qx = sx(q.x)+cam.sx; ctx.fillStyle = foe ? teamCol(q) : 'rgba(200,210,255,.6)'; ctx.beginPath(); ctx.moveTo(qx, Y - 12); ctx.lineTo(qx - 7, Y - 24); ctx.lineTo(qx + 7, Y - 24); ctx.closePath(); ctx.fill();
    ctx.font = `400 ${fs}px 'Lilita One', Nunito`; const w = ctx.measureText(s).width + 16, h = fs + 8; const px = qx, py = sy(q.y + HERO_H + 26)+cam.sy - h/2 - (q.emote ? 44 : 0);
    ctx.globalAlpha = foe ? 1 : .6; ctx.fillStyle = '#120a26'; ctx.strokeStyle = foe ? '#ffd447' : '#9a8ad8'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.roundRect(px - w/2, py - h/2, w, h, h/2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = foe ? '#ffe27a' : '#d8d0ff'; ctx.fillText(s, px, py + 1); ctx.globalAlpha = 1; });
  ctx.restore();
}
function drawProj(q, t){
  const X = sx(q.x)+cam.sx, Y = sy(q.y)+cam.sy, z = cam.z, r = (q.w.r>80 ? 13 : 10)*z;
  if(Y < 84){ const mx = clamp(X, 20, SW-20), my = Math.round(128*hudK()); ctx.save(); ctx.fillStyle = q.w.color; ctx.strokeStyle = '#1a0b30'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(mx, my-16); ctx.lineTo(mx-11, my+2); ctx.lineTo(mx+11, my+2); ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.font = "400 13px 'Lilita One', Nunito"; ctx.textAlign = 'center'; ctx.lineWidth = 3; const hgt = Math.round((q.y - VIEW_HI)/10)+'m'; ctx.strokeText(hgt, mx, my+18); ctx.fillStyle = '#fff'; ctx.fillText(hgt, mx, my+18); ctx.restore(); if(Y < -40) return; }
  ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.drawImage(glowSprite(q.w.color), X-r*3, Y-r*3, r*6, r*6); ctx.restore();
  drawShell(ctx, X, Y, r, q.w.color, q.owner.cos ? q.owner.cos.wl : 0, z, t);
  if(q.ang >= 60 && q.vy < 0){ ctx.save(); ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .5 + .3*Math.sin(t*20); ctx.drawImage(glowSprite('#7fe6ff'), X - r*4, Y - r*4, r*8, r*8); ctx.restore(); }
}
function drawFloaters(dt){
  for(let i=floaters.length-1;i>=0;i--){ const f = floaters[i]; f.t += dt; if(f.t > 1.3){ floaters.splice(i,1); continue; }
    const k = f.t/1.3; const X = sx(f.x), Y = sy(f.y) - k*70; const sc = f.t<.15 ? .6 + f.t/.15*.6 : 1.2 - Math.min(.2,(f.t-.15)*1.5);
    const c = f.cls; const dbl = c==='double', crit = c==='crit', sky = c==='sky' || c==='long', big = c==='big' || crit || sky, heal = c==='heal', txt = c==='txt', tag = c==='tag';
    const fs = (dbl ? 66 : crit ? 52 : sky ? 48 : big ? 40 : tag ? 17 : txt ? 22 : 30) * sc * clamp(cam.z, .8, 1.3);
    ctx.save(); ctx.globalAlpha = k>.7 ? (1-k)/.3 : 1; ctx.font = `400 ${fs}px 'Lilita One', Nunito`; ctx.textAlign='center'; ctx.lineJoin='round';
    ctx.lineWidth = fs*(tag ? .32 : .24); ctx.strokeStyle = heal ? '#0f6b3a' : txt ? '#1a4f94' : tag ? '#140a2a' : sky ? '#0c2a5a' : dbl ? '#6a2a00' : '#4a0c00'; ctx.strokeText(f.text, X, Y);
    let fill = heal ? '#c9ffe0' : txt ? '#e6f6ff' : tag ? '#fff2b0' : crit ? '#ff9a5a' : sky ? '#bff2ff' : big ? '#ffe066' : '#fff';
    if(dbl){ const gg = ctx.createLinearGradient(0, Y - fs*.8, 0, Y); gg.addColorStop(0, '#ffffff'); gg.addColorStop(.5, '#ffe27a'); gg.addColorStop(1, '#ff9a1a'); fill = gg; }
    else if(!heal && !txt && !tag && !sky){ const gg = ctx.createLinearGradient(0, Y - fs*.75, 0, Y + fs*.1); gg.addColorStop(0, '#fff6a0'); gg.addColorStop(.5, crit ? '#ff7a2a' : '#ffb01a'); gg.addColorStop(1, crit ? '#e01a2a' : '#ff4a12'); fill = gg; }
    ctx.fillStyle = fill; ctx.fillText(f.text, X, Y); ctx.restore(); }
}
function renderWorld(t, dt){
  ctx.setTransform(DPR,0,0,DPR,0,0); ctx.clearRect(0,0,SW,SH);
  drawBackground(t);
  if(!terrain) return;
  drawWater(t, false);
  drawTerrain();
  const players = mode==='play' && Gm ? Gm.players : lobbyPlayers;
  const active = Gm && Gm.phase==='aim' ? Gm.players[Gm.turn] : null;
  drawParts('norm');
  if(Gm && mode==='play') Gm.crates.forEach(c=>drawCrate(c, t));
  players.forEach(p=>drawPlayer(p, t, p===active));
  if(active && active.alive && mode==='play') drawAim(active, t);
  if(Gm) Gm.proj.forEach(q=>drawProj(q, t));
  ctx.save(); ctx.globalCompositeOperation='lighter'; drawParts('add'); ctx.restore();
  drawWater(t, true);
  if(mode==='play') players.forEach(p=>drawPlate(p, t, p===active));
  if(active && active.alive && mode==='play') drawRuler(active, t);
  drawBursts(dt); drawFloaters(dt);
}

/* ----- game flow ----- */
function newGame(){
  const used = slots.map((s,i)=>({s,i})).filter(o=>o.s.ctl!=='empty');
  if(used.length < 2){ toast('Add at least two players (bots count).'); return; }
  buildTerrain(settings.map, (Math.random()*1e9)|0);
  const players = used.map((o,k)=>playerFromSlot(o.s, o.i, k));
  placePlayers(players, true);
  players.forEach(p=>{ if(p.ctl==='phone'){ p.padSeen = seenFrom(padPresence(p.peer)); } });
  parts = []; floaters.length = 0; bursts.length = 0; flashA = 0; LOG.length = 0;
  Gm = {gid:Date.now().toString(36) + (Math.random()*1e4|0), crates:[], clock:0, kos:0, slow:0, players, turn:-1, phase:'intro', timer:settings.timer, wind:0, proj:[], volley:null, wait:1.4, turnNo:0, waterY:40, power:null, pdir:1, mods:{}, itemsUsed:[], delayAdd:0, moved:0, superArmed:false, botPlan:null, over:false};
  mode = 'play'; cam.overview = false; cam.tvw = W*1.05; cam.tx = W/2; cam.ty = H*.5; syncView();
  show('lobby', false); show('custom', false); show('hud', true); show('results', false); show('title', false);
  banner('Battle start!', MAPS[settings.map].name); blog(`Battle start · ${esc(MAPS[settings.map].name)}`); setChart(!!settings.chart); hudTeamKey = lastWind = lastFormula = lastDial = ''; HS.clear(); SFX.play('turn'); MUSIC.hype = 0; MUSIC.start(settings.map);
  players.forEach(p=>{ if(SKINS[p.cos.sk] && SKINS[p.cos.sk].rar==='l'){ const col = SKINS[p.cos.sk].glow; P({type:'ring', x:p.x, y:p.y + 50, size:20, grow:420, life:.9, color:col}); for(let i=0;i<24;i++) P({type:'glow', x:p.x + (Math.random()-.5)*40, y:p.y + Math.random()*30, vy:200 + Math.random()*400, drag:.97, size:16 + Math.random()*14, grow:-6, life:1 + Math.random()*.5, color:col}); } });
  pushState(true);
}
function aliveTeams(){ return [...new Set(Gm.players.filter(p=>p.alive).map(p=>p.team))]; }
function nextTurn(){
  const prev = Gm.players[Gm.turn];
  if(prev){ prev.delay += 100 + (Gm.superArmedUsed ? 20 : WEAPONS[prev.wpn].delay) + Gm.delayAdd + Gm.moved*.12; }
  if(aliveTeams().length <= 1){ endGame(); return; }
  const alive = Gm.players.filter(p=>p.alive).sort((a,b)=>a.delay-b.delay || a.slot-b.slot);
  const p = alive[0];
  Gm.turn = Gm.players.indexOf(p); Gm.turnNo++;
  Gm.superArmedUsed = false; Gm.mods = {}; Gm.itemsUsed = []; Gm.delayAdd = 0; Gm.moved = 0; Gm.superArmed = false; Gm.power = null; Gm.volley = null; Gm.botPlan = null;
  p.shield = false; p.stamina = 100; p.energy = Math.min(100, p.energy + 8);
  const ws = settings.wind==='off' ? 0 : settings.wind==='wild' ? 5 : 3;
  Gm.wind = Math.round((Math.random()*2-1)*ws*10)/10;
  const rounds = Gm.turnNo / Math.max(1, alive.length);
  if(rounds > 10){ Gm.waterY = Math.min(H*.85, Gm.waterY + (rounds > 16 ? 26 : 16)); if(!Gm.sd){ Gm.sd = true; banner('Sudden death', 'The sea rises every turn'); blog('Sudden death: the sea rises every turn'); MUSIC.hype = 1; } }
  if(p.frozen){ p.frozen = false; p.delay += 60; popText(p.x, p.y+150, 'Frozen!', 'txt'); blog(`${nm(p)} is frozen and misses a turn`); Gm.phase='settle'; Gm.wait = 1.2; return; }
  blog(`${nm(p)}'s turn${Gm.wind ? ` · wind ${Gm.wind > 0 ? '→' : '←'} ${Math.abs(Gm.wind).toFixed(1)}` : ' · no wind'}`);
  Gm.phase = 'aim'; Gm.timer = settings.timer;
  SFX.play('turn'); p._tiredTold = false;
  if(Gm.turnNo > 2 && Gm.crates.length < 2 && Math.random() < .4) dropCrate();
  if(p.ctl!=='bot') callout(p.ctl==='local' ? p.name+', your turn!' : p.name+"'s turn", p.look.c1);
  Gm.coachOn = p.ctl==='local' && (store.get('coached',0)||0) < 3; $('#coach').classList.toggle('hidden', !Gm.coachOn);
  renderHudStatic(); pushState(true);
}
function activeWeapon(p){ return Gm.superArmed ? SUPERS[p.ch.sup] : WEAPONS[p.wpn]; }
function fire(p, power){
  if(Gm.phase!=='aim') return;
  power = clamp(power, 0, 100); p.lastPower = power; p.charging = false; Gm.power = null; SFX.charge(null);
  Gm.superArmedUsed = Gm.superArmed; const w = activeWeapon(p); if(Gm.superArmed) p.energy = 0;
  p.angle = Math.round(p.angle); Gm.volley = {angle:p.angle, power, w, left: Gm.mods.encore ? 2 : 1}; Gm.phase = 'fire';
  launchVolley(p, Gm.volley); pushState(true);
}
function launchVolley(p, v){
  v.left--;
  const angles = Gm.mods.triple ? [v.angle-6, v.angle, v.angle+6] : [v.angle];
  const count = v.w.count || 1; const dmgMul = (Gm.mods.power?1.5:1) * (Gm.mods.triple?.6:1);
  angles.forEach((ang,ai)=>{ for(let c=0;c<count;c++){ const st = launchState(p, ang + (count>1 ? (c-1)*4 : 0), v.power); spawnProj(p, st, v.w, {dmgMul, warp: Gm.mods.warp && ai===0 && c===0 && v.left===0, ang: v.w.meteor || v.w.cluster ? 0 : v.angle}); } });
  p.stats.shots++; p._hitVolley = false; p.recoil = .25; SFX.play('shoot'); if(Gm.coachOn){ Gm.coachOn = false; store.set('coached', (store.get('coached',0)||0)+1); $('#coach').classList.add('hidden'); }
  const st = launchState(p, v.angle, v.power); P({type:'glow', x:st.x, y:st.y, size:40, grow:60, life:.25, color:'#ffd27a'});
  for(let i=0;i<6;i++) P({type:'smoke', x:st.x, y:st.y, vx:st.vx*.05+(Math.random()-.5)*40, vy:st.vy*.05+(Math.random()-.5)*40, drag:.95, size:14, grow:30, life:.7, color:'#ddd', a:.5});
}
function spawnProj(owner, st, w, extra={}){ const q = {owner, x:st.x, y:st.y, vx:st.vx, vy:st.vy, w, bounces:w.bounces||0, drill:w.drill||0, drilling:false, split:w.split||0, prevVy:st.vy, life:12, trailT:0, dmgMul:extra.dmgMul||1, warp:!!extra.warp, startX:extra.startX ?? st.x, age:0, ang:extra.ang||0}; Gm.proj.push(q); return q; }
function nearestEnemy(owner, x, y){ let best=null, bd=1e9; for(const p of Gm.players){ if(!p.alive || p.team===owner.team) continue; const d = Math.hypot(p.x-x, p.y-y); if(d<bd){ bd=d; best=p; } } return best; }
function updateProjectiles(dt){
  const steps = 4, h = dt/steps;
  for(let i=Gm.proj.length-1;i>=0;i--){
    const q = Gm.proj[i]; let dead = false;
    for(let s=0;s<steps && !dead;s++){
      q.prevVy = q.vy; q.age += h;
      if(q.w.homing && q.vy<0){ const tg = nearestEnemy(q.owner, q.x, q.y); if(tg){ const dx = tg.x-q.x, dy = (tg.y+BODY_Y)-q.y; const d = Math.hypot(dx,dy)||1; q.vx += dx/d*420*h; q.vy += dy/d*240*h; } }
      stepShot(q, Gm.wind*WIND_A*q.w.wind, -SHOT_G*q.w.grav, h); q.life -= h;
      if(q.split && q.prevVy>0 && q.vy<=0){ for(const off of [-110, 110]) spawnProj(q.owner, {x:q.x, y:q.y, vx:q.vx+off, vy:q.vy}, {...q.w, split:0}, {dmgMul:q.dmgMul, ang:q.ang, startX:q.startX}); q.split = 0; }
      for(const p of Gm.players){ if(!p.alive) continue; if(p===q.owner && q.age < .25) continue; if(Math.hypot(q.x-p.x, q.y-(p.y+BODY_Y)) < HIT_R){ explode(q, q.x, q.y); dead = true; break; } }
      if(dead) break;
      if(q.x < -300 || q.x > W+300 || q.life<=0){ dead = true; break; }
      if(q.y < Gm.waterY){ splash(q.x, Gm.waterY); dead = true; if(q.warp) warpTo(q.owner, q.x, Gm.waterY); break; }
      if(solid(q.x, q.y)){
        if(q.bounces>0){ q.bounces--; const nx = (solid(q.x+4,q.y)?-1:0) + (solid(q.x-4,q.y)?1:0); const ny = (solid(q.x,q.y+4)?-1:0) + (solid(q.x,q.y-4)?1:0);
          if(Math.abs(ny) >= Math.abs(nx)) q.vy = Math.abs(q.vy)*.62*(ny||1); else q.vx = -q.vx*.62; q.vx *= .85; q.x -= q.vx*h*2; q.y += Math.abs(q.vy)*h*2; SFX.play('bounce'); continue; }
        if(q.drill>0){ q.drill -= Math.hypot(q.vx,q.vy)*h; q.drilling = true; if(Math.random()<.3) crater(q.x, q.y, 10); if(q.drill>0) continue; }
        explode(q, q.x, q.y); dead = true; break;
      } else if(q.drilling && q.w.drill < 200){ explode(q, q.x, q.y); dead = true; break; }
    }
    if(dead){ Gm.proj.splice(i,1); continue; }
    q.trailT -= dt; if(q.trailT<=0){ q.trailT = .02; trailFX(q); }
  }
}
function trailFX(q){ const tr = q.owner.cos ? q.owner.cos.tr : ''; const c1 = q.owner.look ? q.owner.look.c1 : '#ffffff';
  if(tr==='rainbow') P({type:'glow', x:q.x, y:q.y, size:17, grow:-8, life:.6, color:`hsl(${Math.round(((Gm.clock*400) % 360)/30)*30},100%,62%)`, a:.9});
  else if(tr==='hearts'){ P({type:'glow', x:q.x, y:q.y, size:11, grow:-6, life:.3, color:'#ff7aa8', a:.7}); if(Math.random() < .35) P({type:'heart', x:q.x, y:q.y, vx:(Math.random()-.5)*40, vy:20 + Math.random()*30, size:6 + Math.random()*4, life:.9, color:Math.random()<.5 ? '#ff5d8a' : '#ff9ac0'}); }
  else if(tr==='fire'){ P({type:'glow', x:q.x, y:q.y, size:22, grow:-14, life:.45, color:Math.random()<.5 ? '#ffb43a' : '#ff4a1a'}); if(Math.random() < .3) P({type:'smoke', x:q.x, y:q.y, vy:30, size:10, grow:20, life:.8, color:'#3a2a2a', a:.35}); }
  else if(tr==='zap'){ P({type:'zap', x:q.x, y:q.y, size:12, life:.25, color:'#bff6ff', seed:Math.random()*99}); P({type:'glow', x:q.x, y:q.y, size:13, grow:-8, life:.3, color:'#3ad0ff'}); }
  else if(tr==='stardust'){ P({type:'star', x:q.x + (Math.random()-.5)*10, y:q.y + (Math.random()-.5)*10, vx:(Math.random()-.5)*30, vy:(Math.random()-.5)*30, size:5 + Math.random()*5, life:.9, color:Math.random()<.6 ? '#ffe58a' : '#ffffff', vr:6}); if(Math.random() < .5) P({type:'glow', x:q.x, y:q.y, size:15, grow:-8, life:.5, color:'#b48bff'}); }
  else P({type:'glow', x:q.x, y:q.y, size:14, grow:-8, life:.4, color:c1, a:.8});
  if(q.ang >= 60 && q.vy < 0 && Math.random() < .6) P({type:'glow', x:q.x, y:q.y, size:20, grow:-12, life:.35, color:'#7fe6ff', a:.7});
}
function splash(x, y){ const th = terrain.theme; for(let i=0;i<20;i++){ const a = Math.PI*(.2+Math.random()*.6); const v = 140+Math.random()*280; P({type:'drop', x, y, vx:Math.cos(a)*v*(Math.random()<.5?-1:1), vy:Math.sin(a)*v, g:-800, size:3+Math.random()*5, life:.9, color:th.foam}); } SFX.play('splash'); }
function warpTo(p, x, y){ if(!p.alive) return; P({type:'glow', x:p.x, y:p.y+50, size:80, grow:120, life:.5, color:'#b48bff'}); p.x = clamp(x, 10, W-10); p.y = Math.max(y, 0) + 2; p.falling = true; p.vy = 0; P({type:'glow', x:p.x, y:p.y+50, size:80, grow:120, life:.5, color:'#b48bff'}); }
function arcBonus(a){ return a >= 60 ? .1 + (Math.min(a, 85) - 60)/25*.3 : 0; }
const HIT_RANK = {pow:1, long:2, sky:3, crit:4, double:5};
function explode(q, x, y){
  const w = q.w, owner = q.owner; const oc = owner.cos || {};
  crater(x, y, w.r); boomFX(x, y, w.r, w.color, oc.bm, oc.wl|0); Gm.lastBoom = {x, y, t:Gm.clock}; SFX.play('boom', clamp(w.r/45, .6, 1.6));
  let hitAny = false, foes = 0, total = 0, best = null;
  for(const c of Gm.crates.slice()){ if(Math.hypot(c.x - x, c.y + 20 - y) < w.r + 30){ Gm.crates.splice(Gm.crates.indexOf(c), 1); openCrate(c, owner.isTrap ? null : owner); } }
  const dist = Math.abs(x - q.startX);
  for(const p of Gm.players){ if(!p.alive) continue;
    const d = Math.hypot(p.x - x, (p.y+BODY_Y) - y); const reach = w.r + HIT_R;
    if(d < reach){
      if(w.bloom && p.team===owner.team){ heal(p, w.bloom); continue; }
      let dmg = w.dmg * (1 - .55*(d/reach)) * owner.ch.atk * q.dmgMul / p.ch.def;
      const enemy = p!==owner && p.team!==owner.team && !owner.isTrap; let mult = 1, kind = 'pow'; const tags = [];
      if(enemy){
        if(d < HIT_R*.9){ mult *= 1.5; tags.push('CRIT x1.5'); owner.stats.crits++; kind = 'crit'; }
        const ab = arcBonus(q.ang||0); if(ab > 0){ mult *= 1 + ab; tags.push('SKY +'+Math.round(ab*100)+'%'); owner.stats.arcs++; if(kind==='pow') kind = 'sky'; }
        if(dist > 900){ mult *= 1.2; tags.push('LONG +20%'); owner.stats.longs++; if(kind==='pow') kind = 'long'; }
        if(mult >= 1.95){ mult = 2; owner.stats.doubles++; kind = 'double'; } else mult = Math.min(mult, 2);
      }
      dmg *= mult;
      if(p.shield) dmg *= .5; dmg = Math.round(dmg * (.95 + Math.random()*.1)); if(p===owner) dmg = Math.round(dmg*.6);
      const kdir = p.x >= x ? 1 : -1; const kb = mult > 1.4 ? 1.35 : 1; p.kx = kdir*clamp(dmg*.55*kb, 50, 280); p.vy = clamp(dmg*.55*kb, 90, 320); p.falling = true; p.y += 1;
      damage(p, dmg, owner, dist, enemy ? (kind==='pow' ? (dmg >= 250 ? 'big' : '') : kind) : '');
      if(tags.length) popText(p.x, p.y + HERO_H - 30, tags.join('  '), 'tag');
      if(enemy){ foes++; total += dmg; if(!best || HIT_RANK[kind] > HIT_RANK[best.kind] || (kind===best.kind && dmg > best.dmg)) best = {kind, p, dmg}; }
      if(w.freeze && p!==owner){ p.frozen = true; popText(p.x, p.y+150, 'Frozen', 'txt'); }
      if(p!==owner) hitAny = true;
    }
  }
  if(hitAny && !owner._hitVolley){ owner._hitVolley = true; owner.stats.hits++; }
  if(!owner.isTrap){
    if(best && (best.kind!=='pow' || best.dmg >= 120)) hitBurst(best.kind, best.p);
    if(foes>=3) callout('MULTI HIT x'+foes+'!', '#ffd447'); else if(foes===2) callout('MULTI HIT x2!', '#ffd447');
    else if(best && best.kind==='pow' && total >= 220) callout('NICE SHOT!', '#7af0c8');
  }
  if(w.meteor){ for(let i=0;i<w.meteor;i++){ const mx = x + (i-(w.meteor-1)/2)*60 + (Math.random()-.5)*20; spawnProj(owner, {x:mx, y:H+120+i*60, vx:(Math.random()-.5)*40, vy:-380}, {dmg:150, r:36, grav:1, wind:.2, color:'#ff9a4a'}, {dmgMul:q.dmgMul}); } }
  if(w.cluster){ for(let i=0;i<w.cluster;i++){ const a = Math.PI*(.15+.7*i/(w.cluster-1)); spawnProj(owner, {x, y:y+8, vx:Math.cos(a)*280, vy:Math.sin(a)*360+80}, {dmg:90, r:28, grav:1, wind:.5, color:'#3ee6a8'}, {dmgMul:q.dmgMul}); } }
  if(q.warp) warpTo(owner, x, y);
  Gm.players.forEach(p=>{ if(p.alive && !solid(p.x, p.y-1)) p.falling = true; });
}
function hitBurst(kind, p){
  const bx = p.x, by = p.y + 92;
  if(kind==='double'){ burst(bx, by, 'x2 DOUBLE!', 'double'); callout('DOUBLE DAMAGE!', '#ffd447'); Gm.slow = Math.max(Gm.slow||0, .9); cam.punch = .16; flash(.55, '#fff3c0'); SFX.play('double'); cam.shake = Math.min(34, cam.shake + 16);
    for(let i=0;i<30;i++){ const a = Math.random()*Math.PI*2, v = 200 + Math.random()*420; P({type:'star', x:bx, y:by, vx:Math.cos(a)*v, vy:Math.sin(a)*v, drag:.95, size:7 + Math.random()*7, life:1 + Math.random()*.6, color: i%2 ? '#ffe27a' : '#ffffff', vr:8}); } }
  else if(kind==='crit'){ burst(bx, by, 'CRITICAL!', 'crit'); Gm.slow = Math.max(Gm.slow||0, .4); cam.punch = .1; flash(.3); SFX.play('crit'); }
  else if(kind==='sky'){ burst(bx, by, 'SKY STRIKE!', 'sky'); Gm.slow = Math.max(Gm.slow||0, .25); cam.punch = .07; flash(.22, '#d8f6ff'); SFX.play('arc'); }
  else if(kind==='long'){ burst(bx, by, 'SNIPED!', 'long'); flash(.12, '#dfffee'); SFX.play('arc'); }
  else burst(bx, by, ['POW!','BAM!','WHAM!','BOOM!','KAPOW!'][Math.random()*5|0], 'pow');
}
const bursts = []; let flashA = 0, flashC = '#ffffff';
function burst(x, y, word, kind){ bursts.push({x, y, word, kind, t:0, life: kind==='double' ? 1.7 : kind==='pow' ? .85 : 1.25, rot:(Math.random()-.5)*.25, seed:Math.random()*99}); if(bursts.length > 6) bursts.shift(); }
function flash(a, c='#ffffff'){ if(a > flashA){ flashA = a; flashC = c; } }
const BURST = {pow:{R:54, c:['#fff7c2','#ffb23f','#8a2c06'], tc:['#ffffff','#ffe27a'], ts:'#6a1a06'},
  crit:{R:88, c:['#fff1a8','#ff5d6c','#6a0a1a'], tc:['#fff6c0','#ffd447'], ts:'#5a0612'},
  sky:{R:88, c:['#f2fdff','#4fc3ff','#0c2a6a'], tc:['#ffffff','#c9f4ff'], ts:'#0c2a5a'},
  long:{R:76, c:['#f0fff6','#3ee6a8','#0a4a2e'], tc:['#ffffff','#c9ffe8'], ts:'#0a3a24'},
  double:{R:126, c:['#fffbe0','#ffc400','#7a2a00'], tc:['#ffffff','#ffe27a'], ts:'#5a1a00'},
  ko:{R:104, c:['#ffffff','#b48bff','#2a0a60'], tc:['#ffffff','#e6d6ff'], ts:'#22094a'},
  splash:{R:80, c:['#f2fdff','#53c3ff','#0a3a6a'], tc:['#ffffff','#d8f6ff'], ts:'#0a2a5a'}};
function drawBursts(dt){
  for(let i=bursts.length-1;i>=0;i--){ const b = bursts[i]; b.t += dt; if(b.t > b.life){ bursts.splice(i,1); continue; }
    const S = BURST[b.kind] || BURST.pow; const k = b.t/b.life;
    const pop = b.t < .1 ? .3 + b.t/.1*.95 : b.t < .2 ? 1.25 - (b.t-.1)/.1*.25 : 1 + (b.t-.2)*.06;
    const fade = k > .72 ? 1 - (k-.72)/.28 : 1; const X = sx(b.x) + cam.sx, Y = sy(b.y) + cam.sy; const R = S.R * clamp(cam.z*1.15, .8, 1.5) * pop;
    ctx.save(); ctx.translate(X, Y); ctx.rotate(b.rot + Math.sin(b.t*30)*.03*(1-k));
    ctx.strokeStyle = S.c[1]; ctx.lineCap = 'round'; const nl = 20;
    for(let j=0;j<nl;j++){ const a = j/nl*Math.PI*2 + hash(j + b.seed)*.3; const r0 = R*(1.08 + .3*k), r1 = R*(1.25 + 1.1*Math.min(1, b.t*3.5))*(.75 + .5*hash(j*3 + b.seed)); ctx.globalAlpha = fade*.85; ctx.lineWidth = 2 + 3*hash(j + b.seed*2); ctx.beginPath(); ctx.moveTo(Math.cos(a)*r0*1.15, Math.sin(a)*r0*.82); ctx.lineTo(Math.cos(a)*r1*1.15, Math.sin(a)*r1*.82); ctx.stroke(); }
    ctx.globalAlpha = fade;
    const spikes = b.kind==='double' ? 18 : 13;
    const path = (rr, jit) => { ctx.beginPath(); for(let j=0;j<spikes*2;j++){ const a = j/(spikes*2)*Math.PI*2; const r = (j%2 ? rr*.64 : rr)*(1 + (hash(j*7 + b.seed)-.5)*jit); const px = Math.cos(a)*r*1.18, py = Math.sin(a)*r*.82; j ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.closePath(); };
    path(R*1.04, .32); ctx.fillStyle = S.c[2]; ctx.fill();
    ctx.save(); ctx.translate(-4, -5); path(R, .32); const g = ctx.createRadialGradient(0, 0, R*.08, 0, 0, R); g.addColorStop(0, S.c[0]); g.addColorStop(.5, S.c[1]); g.addColorStop(1, S.c[1]); ctx.fillStyle = g; ctx.fill(); ctx.lineJoin = 'round'; ctx.lineWidth = 4; ctx.strokeStyle = '#1a0b30'; ctx.stroke();
    if(b.kind==='double'){ for(let j=0;j<12;j++){ ctx.strokeStyle = `hsl(${j*30 + b.t*300},100%,65%)`; ctx.lineWidth = 6; ctx.beginPath(); ctx.ellipse(0, 0, R*1.32, R*.98, 0, j/12*Math.PI*2 + b.t*3, (j+1)/12*Math.PI*2 + b.t*3); ctx.stroke(); } }
    ctx.restore();
    const fs = R*(b.word.length > 9 ? .34 : b.word.length > 6 ? .42 : .52); ctx.font = `400 ${fs}px 'Lilita One', Nunito`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    ctx.rotate(-.07); ctx.lineWidth = fs*.3; ctx.strokeStyle = S.ts; ctx.strokeText(b.word, -2, 0); const tg = ctx.createLinearGradient(0, -fs/2, 0, fs/2); tg.addColorStop(0, S.tc[0]); tg.addColorStop(1, S.tc[1]); ctx.fillStyle = tg; ctx.fillText(b.word, -2, 0);
    ctx.restore(); }
  if(flashA > 0){ ctx.save(); ctx.globalAlpha = Math.min(1, flashA); ctx.fillStyle = flashC; ctx.fillRect(0,0,SW,SH); ctx.restore(); flashA = Math.max(0, flashA - dt*2.4); }
}
function damage(p, dmg, by, dist, cls=''){
  if(dmg<=0) return;
  p.hp = Math.max(0, p.hp - dmg); p.stats.taken += dmg; p.flash = .18; p.hurt = .5; p.energy = Math.min(100, p.energy + dmg/9); if(by) p.lastHitBy = by;
  if(by && by!==p){ by.stats.dmg += dmg; by.energy = Math.min(100, by.energy + dmg/6); by.stats.best = Math.max(by.stats.best, Math.round(dist)); }
  popText(p.x, p.y+HERO_H, '-'+dmg, cls || (dmg>=250 ? 'big' : ''));
  blog(by && by!==p ? `${nm(by)} hit ${nm(p)} <span class="d">−${dmg}</span>${LOGTAG[cls] ? ' '+LOGTAG[cls] : ''}` : `${nm(p)} ${by===p ? 'hit themselves' : 'took'} <span class="d">−${dmg}</span>`);
  if(p.hp<=0) kill(p, by);
}
function heal(p, amt){ const before = p.hp; p.hp = Math.min(p.maxhp, p.hp + amt); const got = Math.round(p.hp-before); if(got>0){ popText(p.x, p.y+HERO_H, '+'+got, 'heal'); SFX.play('heal'); for(let i=0;i<12;i++) P({type:'glow', x:p.x+(Math.random()-.5)*50, y:p.y+Math.random()*60, vy:60+Math.random()*60, size:12, life:.9, color:'#3ee6a8'}); } }
function kill(p, by){ if(!p.alive) return; p.alive = false; p.hp = 0; p.deadT = 0;
  const real = by && by!==p && by.team!==p.team && !by.isTrap;
  if(real){ by.stats.kills++; if(Gm.clock - (by.lastKoAt ?? -9) < 2.5) callout('DOUBLE KO!', '#ff5d6c'); else if(!Gm.kos) callout('FIRST BLOOD!', '#ff5d6c'); by.lastKoAt = Gm.clock; }
  Gm.kos = (Gm.kos||0) + 1; blog(`${nm(p)} is out${by && by!==p ? ' · KO by '+nm(by) : ''}`);
  banner(p.name+' is out!', by && by!==p ? 'by '+by.name : ''); boomFX(p.x, p.y+40, 30, '#ffffff'); burst(p.x, p.y + 70, 'K.O.!', 'ko'); flash(.25, '#e6d6ff'); SFX.play('ko'); Gm.slow = .7; cam.punch = .12; }
function updatePlayers(dt){
  for(const p of Gm.players){
    if(p.flash>0) p.flash -= dt; if(p.hurt>0) p.hurt -= dt; if(p.recoil>0) p.recoil -= dt;
    if(p.emote){ p.emote.t -= dt; if(p.emote.t<=0) p.emote = null; }
    if(p.ctl==='phone'){ const pr = padPresence(p.peer); const seen = p.padSeen || (p.padSeen = seenFrom(pr)); if(pr && pr.em && pr.em[0] > (seen.em||0)){ seen.em = pr.em[0]; emote(p, pr.em[1]); } }
    if(!p.alive){ p.deadT += dt; continue; }
    if(!p.falling && !solid(p.x, p.y-1)) p.falling = true;
    if(p.falling){
      p.vy -= 700*dt; let ny = p.y + p.vy*dt;
      if(p.kx){ const nx = clamp(p.x + p.kx*dt, 4, W-4); if(!solid(nx, p.y+40)) p.x = nx; else p.kx = 0; }
      if(p.vy<0){ for(let y=Math.ceil(p.y); y>=ny; y--){ if(solid(p.x, y-1)){ ny = y; p.falling=false; p.vy=0; p.kx=0; break; } } }
      p.y = ny;
      if(p.y < Gm.waterY - 6){ splash(p.x, Gm.waterY); const by = p.lastHitBy && p.lastHitBy!==p ? p.lastHitBy : Gm.players[Gm.turn]; kill(p, by); callout('SPLASHED!', '#7fd8ff'); }
    } else if(solid(p.x, p.y)) { let y = p.y; while(solid(p.x, y) && y < H) y++; p.y = y; }
    if(p.alive && !p.falling && p.y < Gm.waterY - 20){ splash(p.x, Gm.waterY); kill(p, null); popText(p.x, Gm.waterY+80, 'Washed away!', 'txt'); }
  }
}
function walk(p, dir, dt){
  p.face = dir; if(p.stamina<=0 || p.falling){ p.moving=false; if(p.stamina<=0 && !p._tiredTold){ p._tiredTold = true; popText(p.x, p.y+150, 'Out of steps', 'txt'); } return; }
  const sp = 135 * (0.75 + p.ch.sta*.25); const nx = clamp(p.x + dir*sp*dt, 6, W-6);
  let ny = null;
  for(let k=24;k>=-26;k--){ if(solid(nx, p.y+k)){ ny = p.y+k+1; break; } }
  if(ny===null) ny = p.y; // stepping off a ledge: fall next frame
  if(solid(nx, ny+34) && solid(nx, ny+64)){ p.moving=false; return; } // a real wall
  const moved = Math.abs(nx-p.x); p.x = nx; p.y = ny; p.moving = true; p.walkT += dt;
  p.stamina = Math.max(0, p.stamina - moved * .26 / p.ch.sta); Gm.moved += moved;
}

/* ----- input per controller ----- */
function seenFrom(pr){ return {f:pr?.f?.n||0, u:pr?.u?.[0]||0, s:pr?.s||0, k:pr?.k||0, em:pr?.em?.[0]||0}; }
function emote(p, i){ if(!p || !p.alive) return; const t = EMOTE_ALL[clamp(i|0, 0, EMOTE_ALL.length-1)]; p.emote = {text:t, t:2.6}; SFX.play('emote'); }
function padPresence(peer){ if(!groom || !peer) return null; const pe = groom.peers().find(x=>x.peer===peer); return pe ? pe.presence : null; }
function controlActive(p, dt){
  if(p.ctl==='bot'){ botThink(p, dt); return; }
  let mv = 0, charging = false;
  if(p.ctl==='local'){
    mv = (keys.ArrowLeft||keys.a||touch.left ? -1:0) + (keys.ArrowRight||keys.d||touch.right ? 1:0);
    const ad = (keys.ArrowUp||keys.w||touch.up ? 1:0) - (keys.ArrowDown||keys.s||touch.down ? 1:0);
    if(ad){ if(p.aimHeld==null){ p.aimHeld = 0; p.angle = clamp(Math.round(p.angle) + ad, 0, 90); SFX.play('tick'); } p.aimHeld += dt; if(p.aimHeld > .32) p.angle = clamp(p.angle + ad*30*dt, 0, 90); }
    else if(p.aimHeld!=null){ p.aimHeld = null; p.angle = Math.round(p.angle); }
    charging = keys[' '] || touch.fire;
  } else if(p.ctl==='phone'){
    const pr = padPresence(p.peer); if(!pr) return;
    if(typeof pr.a==='number') p.angle = clamp(pr.a, 0, 90);
    mv = clamp(pr.mv|0, -1, 1);
    const seen = p.padSeen || (p.padSeen = seenFrom(pr));
    if(pr.u && pr.u[0] > seen.u){ seen.u = pr.u[0]; useItem(p, pr.u[1]); }
    if((pr.s||0) > seen.s){ seen.s = pr.s; toggleSuper(p); }
    if((pr.k||0) > seen.k){ seen.k = pr.k; skipTurn(p); return; }
    if(pr.f && pr.f.n > seen.f){ seen.f = pr.f.n; if(typeof pr.f.a==='number') p.angle = clamp(pr.f.a,0,90); fire(p, +pr.f.pw||0); return; }
    if(pr.chg){ p.charging = true; Gm.power = clamp(+pr.pw||0, 0, 100); } else if(p.charging){ p.charging = false; Gm.power = null; }
    if(mv && !pr.chg) walk(p, mv, dt); else p.moving = false;
    return;
  }
  if(mv && !p.charging && !charging) walk(p, mv, dt); else p.moving = false;
  if(charging){
    if(!p.charging){ p.charging = true; Gm.power = 0; }
    Gm.power = Math.min(100, Gm.power + CHARGE_RATE*dt); SFX.charge(Gm.power);
    if(Gm.power >= 100) fire(p, 100);
  } else if(p.charging){ fire(p, Gm.power); }
}
function useItem(p, id){
  if(Gm.phase!=='aim' || Gm.players[Gm.turn]!==p) return;
  const it = p.items.find(i=>i.id===id); if(!it || it.left<=0) return;
  if(Gm.itemsUsed.length >= 2){ popText(p.x, p.y+160, 'Two items max', 'txt'); return; }
  if(Gm.itemsUsed.includes(id)) return;
  it.left--; Gm.itemsUsed.push(id); Gm.delayAdd += ITEMS[id].delay; SFX.play('item');
  if(id==='heal') heal(p, Math.round(p.maxhp*.3)); else if(id==='shield') p.shield = true; else Gm.mods[id] = true;
  popText(p.x, p.y+160, ITEMS[id].name, 'txt'); blog(`${nm(p)} used <b style="--c:#7dff7a">${ITEMS[id].name}</b>`); renderHudStatic(); pushState(true);
}
function toggleSuper(p){ if(Gm.phase!=='aim' || Gm.players[Gm.turn]!==p) return; if(p.energy < 100 && !Gm.superArmed) return; Gm.superArmed = !Gm.superArmed; if(Gm.superArmed){ popText(p.x, p.y+160, SUPERS[p.ch.sup].name, 'big'); SFX.play('item'); blog(`${nm(p)} powered up ${SUPERS[p.ch.sup].name}!`); } renderHudStatic(); pushState(true); }
function skipTurn(p){ if(Gm.phase!=='aim' || Gm.players[Gm.turn]!==p) return; p.charging=false; Gm.power=null; SFX.charge(null); Gm.phase='settle'; Gm.wait=.4; popText(p.x, p.y+160, 'Pass', 'txt'); blog(`${nm(p)} passed`); }

/* ----- bots ----- */
function simShot(p, angle, power, w){
  const o = launchState(p, angle, power); const h = 1/90, ax = Gm.wind*WIND_A*w.wind, ay = -SHOT_G*w.grav; let x, y;
  for(let i=0;i<900;i++){ stepShot(o, ax, ay, h); x = o.x; y = o.y;
    if(x<-200||x>W+200||y<Gm.waterY) return {x,y,miss:true};
    for(const q of Gm.players){ if(q.alive && q!==p && Math.hypot(x-q.x, y-(q.y+BODY_Y))<HIT_R) return {x,y,hit:q}; }
    if(i>8 && solid(x,y)) return {x,y}; }
  return {x,y,miss:true};
}
function botThink(p, dt){
  if(!Gm.botPlan){
    const foes = Gm.players.filter(q=>q.alive && q.team!==p.team); if(!foes.length){ skipTurn(p); return; }
    const tgt = foes.sort((a,b)=>(a.hp + Math.abs(a.x-p.x)*.6) - (b.hp + Math.abs(b.x-p.x)*.6))[0];
    p.face = tgt.x >= p.x ? 1 : -1;
    const w = WEAPONS[p.wpn]; let best = null;
    for(let a=10;a<=85;a+=5) for(let pw=25;pw<=100;pw+=2.5){ const r = simShot(p, a, pw, w); const d = r.hit ? (r.hit.team!==p.team ? -50 - arcBonus(a)*(p.bot==='hard' ? 150 : p.bot==='normal' ? 50 : 0) : 400) : Math.hypot(r.x-tgt.x, r.y-(tgt.y+20)) + (r.miss?300:0) + (Math.hypot(r.x-p.x, r.y-p.y)<w.r+40 ? 500 : 0); if(!best || d<best.d) best = {a, pw, d}; }
    const err = {easy:[14,14], normal:[6,7], hard:[2,2.4]}[p.bot] || [6,7];
    Gm.botPlan = {a: Math.round(clamp(best.a + (Math.random()-.5)*err[0], 0, 90)), pw: clamp(best.pw + (Math.random()-.5)*err[1], 5, 100), t:0, stage:0};
    if(p.energy>=100 && Math.random()<.85) toggleSuper(p);
    else { const pick = p.items.find(i=>i.left>0 && (i.id==='power' || (i.id==='heal' && p.hp < p.maxhp*.5) || (i.id==='encore' && p.bot==='hard'))); if(pick && Math.random()<(p.bot==='easy'?.25:.6)) useItem(p, pick.id); }
  }
  const b = Gm.botPlan; b.t += dt;
  if(b.stage===0){ p.angle = lerp(p.angle, b.a, Math.min(1, dt*4)); if(b.t > 1.1){ p.angle = b.a; b.stage = 1; p.charging = true; Gm.power = 0; } }
  else if(b.stage===1){ Gm.power = Math.min(b.pw, Gm.power + CHARGE_RATE*dt); SFX.charge(Gm.power); if(Gm.power >= b.pw) fire(p, b.pw); }
}

/* ----- supply crates ----- */
const CRATE_KINDS = [['heal',4],['super',3],['item',3],['trap',2]];
function dropCrate(){
  const xs = []; for(let x=90;x<W-90;x+=20){ const y = topAt(x, H-60); if(y > Gm.waterY + 60 && !Gm.players.some(p=>p.alive && Math.abs(p.x-x)<70)) xs.push(x); }
  if(!xs.length) return; const x = xs[Math.random()*xs.length|0];
  Gm.crates.push({x, y:H+60, vy:-170, para:true, landed:false, t:Math.random()*9});
  callout('Supply drop!', '#7af0c8'); SFX.play('drop');
}
function openCrate(c, p){
  let r = Math.random()*12, kind = 'heal'; for(const [k,w] of CRATE_KINDS){ if((r -= w) < 0){ kind = k; break; } }
  if(!p && kind!=='trap') kind = 'trap';
  P({type:'ring', x:c.x, y:c.y+20, size:20, grow:200, life:.4, color:'#ffe58a'});
  for(let i=0;i<14;i++){ const a = Math.random()*Math.PI; P({type:'chunk', x:c.x, y:c.y+20, vx:Math.cos(a)*(120+Math.random()*200), vy:Math.sin(a)*300, g:-900, size:5+Math.random()*5, life:1, color: i%2?'#c9873f':'#ffd447', vr:(Math.random()-.5)*14}); }
  if(kind==='trap'){ popText(c.x, c.y+90, 'TRAP!', 'big'); const dummy = {isTrap:true, team:-1, name:'a trap', ch:{atk:1}, stats:{dmg:0,kills:0,hits:0,best:0}, energy:0, look:{c1:'#ff5a3a'}};
    explode({w:{dmg:150, r:50, color:'#ff5a3a'}, owner:dummy, startX:c.x, dmgMul:1}, c.x, c.y+20); return; }
  SFX.play('heal');
  if(kind==='heal'){ heal(p, 300); popText(c.x, c.y+130, 'Health box!', 'txt'); }
  else if(kind==='super'){ p.energy = Math.min(100, p.energy + 60); popText(c.x, c.y+110, '+60% Super!', 'txt'); }
  else { const it = p.items[Math.random()*p.items.length|0]; if(it){ it.left++; popText(c.x, c.y+110, '+1 '+ITEMS[it.id].name, 'txt'); } else { heal(p, 200); } }
  renderHudStatic(); pushState(true);
}
function updateCrates(dt){
  for(let i=Gm.crates.length-1;i>=0;i--){ const c = Gm.crates[i]; c.t += dt;
    if(!c.landed){ const ny = c.y + c.vy*dt; let hit = false;
      if(c.vy<0) for(let y=Math.ceil(c.y); y>=ny; y--){ if(solid(c.x, y-1)){ c.y = y; hit = true; break; } }
      if(hit){ c.landed = true; c.para = false; c.vy = 0; P({type:'smoke', x:c.x, y:c.y, vx:0, vy:20, size:20, grow:40, life:.6, color:'#fff', a:.5}); }
      else { c.y = ny; if(!c.para) c.vy = Math.max(c.vy - 800*dt, -900); } }
    else if(!solid(c.x, c.y-1)){ c.landed = false; c.vy = 0; }
    if(c.y < Gm.waterY){ splash(c.x, Gm.waterY); Gm.crates.splice(i,1); continue; }
    if(!c.landed) continue;
    const p = Gm.players.find(q=>q.alive && Math.abs(q.x-c.x) < 36 && Math.abs(q.y-c.y) < 60);
    if(p){ Gm.crates.splice(i,1); openCrate(c, p); }
  }
}
function drawCrate(c, t){
  const z = cam.z, X = sx(c.x)+cam.sx, Y = sy(c.y)+cam.sy, s = 36*z;
  ctx.save();
  if(c.para){ const sw = Math.sin(t*2.4 + c.t)*.12; ctx.translate(X, Y - s); ctx.rotate(sw);
    ctx.strokeStyle = 'rgba(255,255,255,.8)'; ctx.lineWidth = 1.5*z; ctx.beginPath(); ctx.moveTo(-s/2, 0); ctx.lineTo(-44*z, -70*z); ctx.moveTo(s/2, 0); ctx.lineTo(44*z, -70*z); ctx.stroke();
    for(let k=0;k<4;k++){ ctx.fillStyle = k%2 ? '#fff4e6' : '#ff5d6c'; ctx.beginPath(); ctx.moveTo(0, -70*z); ctx.arc(0, -70*z, 48*z, Math.PI + k*Math.PI/4, Math.PI + (k+1)*Math.PI/4); ctx.closePath(); ctx.fill(); }
    ctx.strokeStyle = '#2a1640'; ctx.lineWidth = 2.5*z; ctx.beginPath(); ctx.arc(0, -70*z, 48*z, Math.PI, 0); ctx.stroke();
    ctx.rotate(-sw); ctx.translate(-X, -(Y - s)); }
  else { ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = .45 + Math.sin(t*4 + c.t)*.2; ctx.drawImage(glowSprite('#ffd447'), X - s*1.4, Y - s*1.9, s*2.8, s*2.8); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; }
  const bob = c.landed ? Math.sin(t*3 + c.t)*2*z : 0;
  const g = ctx.createLinearGradient(0, Y - s, 0, Y); g.addColorStop(0, '#e8a65a'); g.addColorStop(1, '#9a5a25');
  ctx.fillStyle = g; ctx.strokeStyle = '#3a1d0a'; ctx.lineWidth = 3*z; ctx.beginPath(); ctx.roundRect(X - s/2, Y - s - bob, s, s, 6*z); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ffd447'; ctx.fillRect(X - s/2 + 2*z, Y - s*.62 - bob, s - 4*z, 6*z); ctx.strokeRect(X - s/2 + 2*z, Y - s*.62 - bob, s - 4*z, 6*z);
  ctx.font = `400 ${22*z}px 'Lilita One', Nunito`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineWidth = 4*z; ctx.strokeStyle = '#3a1d0a'; ctx.strokeText('?', X, Y - s*.48 - bob); ctx.fillStyle = '#fff'; ctx.fillText('?', X, Y - s*.48 - bob);
  ctx.restore();
}
let calloutAt = -9, calloutPri = 0;
function callout(text, color='#ffd447'){
  const now = performance.now()/1000; const el = $('#callout'); if(!el) return;
  el.textContent = text; el.style.setProperty('--c', color); el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); calloutAt = now;
  SFX.play('callout');
}

/* ----- update ----- */
function updateGame(dt){
  const g = Gm; const p = g.players[g.turn]; g.clock = (g.clock||0) + dt;
  updatePlayers(dt); updateCrates(dt);
  if(g.phase==='intro'){ g.wait -= dt; if(g.wait<=0) nextTurn(); }
  else if(g.phase==='aim'){
    g.timer -= dt;
    if(!p.alive){ g.phase='settle'; g.wait=.6; }
    else { controlActive(p, dt); if(g.timer<=0 && g.phase==='aim'){ if(p.charging) fire(p, g.power||0); else skipTurn(p); } }
    if(g.timer<5 && Math.floor(g.timer)!==Math.floor(g.timer+dt)) SFX.play(p && p.ctl!=='bot' ? 'heart' : 'tick');
  }
  else if(g.phase==='fire'){
    updateProjectiles(dt);
    const q0 = g.proj[0]; SFX.whistle(q0 && q0.vy < -60 && q0.age > .25 ? 380 + clamp((q0.y - g.waterY)/H, 0, 1)*1300 : null);
    if(g.proj.length===0 && !g.players.some(q=>q.alive && q.falling)){
      if(g.volley && g.volley.left>0 && p.alive){ g.wait = (g.wait>0? g.wait : .6) - dt; if(g.wait<=0){ g.wait = 0; launchVolley(p, g.volley); } }
      else { g.phase='settle'; g.wait = 1.0; }
    }
  }
  else if(g.phase==='settle'){ SFX.whistle(null); if(!g.players.some(q=>q.alive && q.falling)){ g.wait -= dt; if(g.wait<=0) nextTurn(); } }
  // camera
  if(g.proj.length){ let a=0, b=0; g.proj.forEach(q=>{ a+=q.x; b+=q.y; }); cam.tx = a/g.proj.length; cam.ty = Math.min(b/g.proj.length, H+60); cam.tvw = 1350; }
  else if(g.phase==='intro'){ cam.tx = W/2; cam.ty = H*.5; cam.tvw = W*1.05; }
  else if(g.lastBoom && g.phase!=='aim' && g.clock - g.lastBoom.t < 1.4){ cam.tx = g.lastBoom.x; cam.ty = g.lastBoom.y + 40; cam.tvw = 1350; } // hold on the impact, like DDTank
  else if(p){ cam.tx = p.x; cam.ty = p.y + 120; cam.tvw = 1100; }
  updateHud(); pushState(false);
}

/* ----- HUD (laid out like DDTank's battle screen) ----- */
function dialSVG(angle, face){
  const C = 100, pt = (deg, r) => { const a = deg*Math.PI/180; return [(C + face*Math.cos(a)*r).toFixed(1), (C - Math.sin(a)*r).toFixed(1)]; };
  const sw = face > 0 ? 0 : 1;
  const wedge = (a0, a1, r, fill) => { const [x0, y0] = pt(a0, r), [x1, y1] = pt(a1, r); return `<path d="M${C} ${C}L${x0} ${y0}A${r} ${r} 0 0 ${sw} ${x1} ${y1}Z" fill="${fill}"/>`; };
  let ticks = ''; for(let d=0; d<360; d+=5){ const big = d%30===0, lit = d <= 90; const [x1, y1] = pt(d, 86), [x2, y2] = pt(d, big ? 72 : 79);
    ticks += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${lit ? '#ffffff' : '#9fb3cf'}" stroke-opacity="${lit ? .95 : .4}" stroke-width="${big ? 3 : 1.6}"/>`; }
  const [nx, ny] = pt(angle, 78);
  return `<defs><radialGradient id="gzb" cx=".4" cy=".3"><stop offset="0" stop-color="#ffffff"/><stop offset=".55" stop-color="#c9d6ea"/><stop offset="1" stop-color="#6a7fa4"/></radialGradient><radialGradient id="gzf" cx=".5" cy=".35"><stop offset="0" stop-color="#3c5078"/><stop offset="1" stop-color="#101a2e"/></radialGradient></defs>
  <circle cx="100" cy="100" r="97" fill="url(#gzb)" stroke="#14203a" stroke-width="3"/><circle cx="100" cy="100" r="88" fill="url(#gzf)" stroke="#14203a" stroke-width="2.5"/>
  ${wedge(0, 90, 86, 'rgba(120,255,140,.26)')}${wedge(60, 90, 86, 'rgba(120,210,255,.32)')}${ticks}
  <line x1="100" y1="100" x2="${nx}" y2="${ny}" stroke="#14203a" stroke-width="8" stroke-linecap="round"/><line x1="100" y1="100" x2="${nx}" y2="${ny}" stroke="#ff7a1a" stroke-width="4.5" stroke-linecap="round"/>
  <circle cx="100" cy="100" r="9" fill="url(#gzb)" stroke="#14203a" stroke-width="2.5"/>`;
}
const ICO_CLOSE = '<svg viewBox="0 0 24 24"><circle cx="10" cy="10" r="6" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M14.5 14.5 20 20M7.5 10h5M10 7.5v5" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>';
const ICO_WHOLE = '<svg viewBox="0 0 24 24"><path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const setT = (sel, v) => { const e = $(sel); v = String(v); if(e && e.textContent !== v) e.textContent = v; };
function renderHudStatic(){
  if(!Gm) return; const p = Gm.players[Gm.turn]; if(!p) return;
  const box = $('#hudItems'); box.innerHTML = '';
  p.items.forEach((it,i)=>{ const b = document.createElement('div'); b.className = 'item' + (Gm.itemsUsed.includes(it.id)?' on':'') + (it.left<=0?' off':'');
    b.innerHTML = ICON[it.id] + `<span>${ITEMS[it.id].short}</span><em>${it.left}</em><kbd>${i+1}</kbd>`; b.title = ITEMS[it.id].name+': '+ITEMS[it.id].desc;
    b.onclick = ()=>{ if(p.ctl==='local') useItem(p, it.id); }; box.appendChild(b); });
  $('#hudSuper').onclick = ()=>{ if(p.ctl==='local') toggleSuper(p); };
  $('#bPass').onclick = ()=>{ if(p.ctl==='local') skipTurn(p); }; $('#bPass').classList.toggle('hidden', p.ctl!=='local');
  const note = p.ctl==='bot' ? `${p.name} (bot) is aiming...` : p.ctl==='phone' ? `${p.name} is aiming on their phone` : '';
  $('#ctlNote').classList.toggle('hidden', !note); $('#ctlNote').textContent = note;
  $('#meFace').style.backgroundImage = skinFace(p.cos.sk);
  setT('#meName', p.name); setT('#meTitle', p.cos.ti ? (COS.title[p.cos.ti]||{}).name || '' : rankOf(p.cos.lv)); setT('#meLv', p.cos.lv || 1);
  const w = activeWeapon(p), wb = $('#meWpn'); wb.style.setProperty('--wc', w.color || '#ffd447'); wb.querySelector('span').textContent = w.name + (!Gm.superArmed && p.cos.wl ? ' +'+p.cos.wl : '');
}
let hudTeamKey = '', lastDial = '', lastFormula = '', lastWind = '', lastHl = '';
// the HUD updates every frame, so only touch the page when a value actually changes
const HS = new Map();
const sty = (sel, prop, v) => { const k = sel+'|'+prop; if(HS.get(k)===v) return; HS.set(k, v); const e = $(sel); if(!e) return; if(prop[0]==='-') e.style.setProperty(prop, v); else e.style[prop] = v; };
const tog = (sel, cls, on) => { on = !!on; const k = sel+'.'+cls; if(HS.get(k)===on) return; HS.set(k, on); const e = $(sel); if(e) e.classList.toggle(cls, on); };
function updateHud(){
  const g = Gm, p = g.players[g.turn], aim = g.phase==='aim';
  const wk = g.wind.toFixed(1); if(wk!==lastWind){ lastWind = wk; const wv = Math.abs(g.wind), wb = $('#windBadge');
    wb.className = 'windbadge ' + (wv < .05 ? 'z' : g.wind > 0 ? 'r' : 'l'); wb.style.setProperty('--wc', wv < 1.5 ? '#1a5fd0' : wv < 3.5 ? '#e0680a' : '#d81a2a'); setT('#windVal', wv.toFixed(1)); }
  let near = 1e9; if(p && aim && p.alive) g.players.forEach(q=>{ if(q.alive && q.team!==p.team) near = Math.min(near, rulerDist(q.x - p.x)); });
  const fk = p && aim && p.alive ? windFix(p) + '/' + (near < 1e9 ? near.toFixed(1) : '') + '/' + p.slot : ''; if(fk!==lastFormula){ lastFormula = fk; const f = $('#formula'); f.classList.toggle('hidden', !fk);
    if(fk){ const wf = windFix(p), wtxt = wf ? ` <em class="${wf > 0 ? 'tail' : 'head'}">${wf > 0 ? '+' : '−'} ${Math.abs(wf).toFixed(1)}</em>` : '';
      f.innerHTML = near < 30 ? `<b>SKY SHOT</b><span>Force <u>95</u></span><span>angle = 90 − <i class="dd">${near.toFixed(1)}</i>${wtxt} ≈ <u>${clamp(Math.round(90 - near + wf), 0, 90)}°</u></span>` : `<b>SKY SHOT</b><span>Force <u>95</u></span><span>angle = 90 − distance${wtxt}</span>`; } }
  tog('#timer', 'idle', !aim); setT('#timerVal', aim ? Math.max(0, Math.ceil(g.timer)) : ''); tog('#timer', 'hot', aim && g.timer < 5);
  if(p){
    // the gauge always reads left-to-right like DDTank's; the hero's facing is shown in the world
    const ang = Math.round(p.angle), dk = String(ang); if(dk!==lastDial){ lastDial = dk; $('#dialSvg').innerHTML = dialSVG(ang, 1); setT('#angVal', ang); }
    const pw = g.power!=null ? g.power : 0; sty('#pwFill', 'width', pw.toFixed(1)+'%'); setT('#pwVal', g.power!=null ? Math.round(pw) : p.lastPower!=null ? Math.round(p.lastPower) : '');
    sty('#pwLast', 'left', (p.lastPower ?? -5)+'%'); sty('#pwLast', 'display', p.lastPower==null ? 'none' : 'block');
    sty('#meHp', 'width', (100*p.hp/p.maxhp).toFixed(1)+'%'); tog('#meHpBar', 'low', p.hp/p.maxhp < .35); setT('#hpNum', Math.ceil(p.hp)+' / '+p.maxhp);
    const st = p.stamina.toFixed(1)+'%'; sty('#staBar', 'width', st); sty('#staBar2', 'width', st); setT('#staNum', Math.round(p.stamina)+' / 100');
    sty('#hudSuper', '--e', p.energy.toFixed(1)+'%'); tog('#hudSuper', 'ready', p.energy>=100 && !g.superArmed); tog('#hudSuper', 'armed', g.superArmed);
    setT('#hudSuper small', g.superArmed ? 'ARMED' : p.energy>=100 ? 'READY' : Math.floor(p.energy)+'%');
    tog('#touchpad', 'on', p.ctl==='local' && aim && (TOUCH || !kbdUsed));
    if(settings.chart){ const hk = near < 1e9 ? String(Math.round(near)) : ''; if(hk!==lastHl){ lastHl = hk; $('#chart').querySelectorAll('td').forEach(td=>td.classList.toggle('hl', td.dataset.d===hk)); } }
  }
  // team portraits either side of the wind; the badge is the turn order
  const ord = g.players.filter(q=>q.alive).sort((a,b)=>a.delay-b.delay||a.slot-b.slot);
  if(p && aim){ const i = ord.indexOf(p); if(i>0){ ord.splice(i,1); ord.unshift(p); } }
  const key = g.players.map(q=>q.slot+':'+(q.alive ? ord.indexOf(q)+1 : 0)+':'+Math.ceil(40*q.hp/q.maxhp)).join(',') + '|' + (aim && p ? p.slot : -1);
  if(key!==hudTeamKey){ hudTeamKey = key; let L, R;
    if(settings.mode==='teams'){ L = g.players.filter(q=>q.team===0); R = g.players.filter(q=>q.team===1); }
    else { const n = Math.ceil(g.players.length/2); L = g.players.slice(0, n); R = g.players.slice(n); }
    const fill = (el, list) => { el.innerHTML = ''; list.forEach(q=>{ const d = document.createElement('div'); d.className = 'tp' + (q===p && aim ? ' now' : '') + (q.alive ? '' : ' dead'); d.title = q.name; d.style.setProperty('--c', teamCol(q));
      d.innerHTML = `<div class="pf"></div>${q.alive ? `<span class="no">${ord.indexOf(q)+1}</span>` : ''}<div class="hp"><i style="width:${(100*q.hp/q.maxhp).toFixed(1)}%"></i></div>`; d.firstChild.style.backgroundImage = skinFace(q.cos.sk); el.appendChild(d); }); };
    fill($('#teamL'), L); fill($('#teamR'), R); }
  drawMini();
}
// battle log under the portrait, like DDTank's
const RANKS = [[50,'General'],[40,'Colonel'],[30,'Major'],[24,'Captain'],[18,'Lieutenant'],[13,'Sergeant'],[9,'Corporal'],[5,'Private'],[0,'Rookie']];
const rankOf = lv => RANKS.find(r=>(lv||1) >= r[0])[1];
const LOG = [], LOGTAG = {crit:'CRITICAL', sky:'SKY STRIKE', long:'SNIPED', double:'DOUBLE!'};
const nm = q => `<b style="--c:${(q && teamCol(q)) || '#fff'}">${esc(q ? q.name : '?')}</b>`;
function blog(html){ LOG.push(html); if(LOG.length > 4) LOG.shift(); const el = $('#blog'); if(el) el.innerHTML = LOG.map((l,i)=>`<div class="${i < LOG.length-1 ? 'old' : 'new'}">${l}</div>`).join(''); }
// DDTank force chart: pick an angle, read the Force for each distance
let chartAng = 50;
function renderChart(){ const el = $('#chart'), C = forceCharts()[chartAng];
  let h = `<h4>Force chart <small>no wind · same height</small></h4><div class="tabs">${[20,30,50,65].map(a=>`<button data-a="${a}"${a===chartAng ? ' class="on"' : ''}>${a}°</button>`).join('')}</div><table><tr><th>Dist</th><th>Force</th><th>Dist</th><th>Force</th></tr>`;
  for(let i=1;i<=10;i++) h += `<tr><td data-d="${i}">${i}</td><td class="f" data-d="${i}">${C[i-1]}</td><td data-d="${i+10}">${i+10}</td><td class="f" data-d="${i+10}">${C[i+9]}</td></tr>`;
  el.innerHTML = h + '</table><p>Or the sky shot: Force 95, angle = 90 − distance. Yellow = nearest enemy.</p>';
  el.querySelectorAll('button').forEach(b=>b.onclick = ()=>{ chartAng = +b.dataset.a; SFX.play('ui'); renderChart(); }); lastHl = ''; }
function setChart(on){ settings.chart = on; store.set('settings', settings); $('#chart').classList.toggle('hidden', !on); $('#bChart').classList.toggle('on', on); if(on) renderChart(); }
if(settings.chart==null) settings.chart = false; // opens with the Chart button or C
function banner(big, small=''){ const b = $('#banner'); b.innerHTML = ''; b.append(big); if(small){ const s=document.createElement('small'); s.textContent=small; b.append(s); } b.classList.remove('show'); void b.offsetWidth; b.classList.add('show'); }

/* ----- end & records ----- */
function endGame(){
  if(Gm.over) return; Gm.over = true; Gm.phase = 'over'; SFX.whistle(null); SFX.charge(null);
  const winTeam = aliveTeams()[0]; const winners = Gm.players.filter(p=>p.team===winTeam);
  winners.forEach(p=>{ p.win = true; for(let i=0;i<40;i++){ const a = Math.random()*Math.PI; P({type:'chunk', x:p.x, y:p.y+140, vx:Math.cos(a)*(80+Math.random()*260), vy:200+Math.random()*420, g:-500, size:5+Math.random()*5, life:2.2, color:['#ffd447','#ff5d6c','#7af0c8','#b48bff','#53c3ff'][i%5], vr:(Math.random()-.5)*16}); } });
  $('#coach').classList.add('hidden');
  MUSIC.stop(true); SFX.play('win'); banner(winners.length ? (winners.length>1 ? (settings.mode==='teams' ? (winTeam ? 'Red' : 'Blue')+' team wins!' : 'Team wins!') : winners[0].name+' wins!') : 'Draw');
  const mvp = Gm.players.slice().sort((a,b)=>b.stats.dmg-a.stats.dmg)[0];
  const all = allProfiles(); Gm.rewards = {}; Gm.rw = {g:Gm.gid, r:{}}; let lvUp = false;
  Gm.players.forEach(p=>{ if(p.ctl==='bot') return; const k = p.name.trim().slice(0,18) || 'Player';
    const r = fixProfile(all[k], k); all[k] = r;
    r.games++; if(p.team===winTeam) r.wins++; r.kills += p.stats.kills; r.dmg += p.stats.dmg; r.shots += p.stats.shots; r.hits += p.stats.hits; r.best = Math.max(r.best, p.stats.best); r.fav[p.ch.id] = (r.fav[p.ch.id]||0)+1;
    const rw = baseReward(p, p.team===winTeam, p===mvp);
    if(p.ctl==='local'){ const sum = applyReward(r, rw); Gm.rewards[p.slot] = sum; if(sum.to > sum.from) lvUp = true; }
    else if(p.ctl==='phone' && p.peer){ Gm.rw.r[p.peer] = rw; Gm.rewards[p.slot] = {phone:true, gold:rw.l.reduce((a,b)=>a+b[1],0), xp:rw.xp}; }
  });
  store.set('profiles', all);
  const hist = store.get('history', []);
  hist.unshift({at:Date.now(), map:settings.map, mode:settings.mode, winners:winners.map(p=>p.name), players:Gm.players.map(p=>({n:p.name, ch:p.ch.id, bot:p.ctl==='bot', dmg:p.stats.dmg, k:p.stats.kills, w:p.team===winTeam}))});
  store.set('history', hist.slice(0,30));
  pushState(true); const g0 = Gm; setTimeout(()=>{ if(Gm===g0 && mode==='play'){ showResults(winTeam); if(lvUp){ SFX.play('levelup'); } } }, 2000);
}
function showResults(winTeam){
  const ps = Gm.players; const mvp = ps.slice().sort((a,b)=>b.stats.dmg-a.stats.dmg)[0]; const winners = ps.filter(p=>p.team===winTeam);
  const c = $('#resCard'); c.innerHTML = '';
  const head = document.createElement('div'); head.className = 'res-head';
  head.innerHTML = `<h2 class="ribbon"></h2><div class="res-btns"><button class="btn red" id="rAgain">Rematch</button><button class="btn" id="rShop">Shop</button><button class="btn dark" id="rLobby">Lobby</button><button class="btn dark" id="rRec">Records</button></div>`;
  head.querySelector('h2').textContent = settings.mode==='teams' && winners.length ? (winTeam ? 'Red' : 'Blue')+' team wins!' : winners.length>1 ? winners.map(p=>p.name).join(' + ')+' win!' : (winners[0]?.name||'Nobody')+' wins!';
  c.appendChild(head);
  const grid = document.createElement('div'); grid.className='res-grid' + (ps.length > 4 ? ' many' : '');
  ps.slice().sort((a,b)=>(b.team===winTeam) - (a.team===winTeam) || b.stats.dmg - a.stats.dmg).forEach(p=>{ const d = document.createElement('div'); d.className='res-card'+(p.team===winTeam?' win':'') + (SKINS[p.cos.sk]?.rar==='l' ? ' legend' : '');
    const acc = p.stats.shots ? Math.min(100, Math.round(100*p.stats.hits/p.stats.shots)) : 0; const sk = p.stats.crits + p.stats.arcs + p.stats.doubles;
    d.innerHTML = `<img alt=""><div class="rc-top">${p===mvp ? '<i class="mvp">MVP</i>' : ''}<b></b><div class="muted"></div></div><div class="rstats"><span><b>${p.stats.dmg}</b><i>Damage</i></span><span><b>${p.stats.kills}</b><i>KOs</i></span><span><b>${acc}%</b><i>Accuracy</i></span><span><b>${sk}</b><i>${p.stats.doubles ? 'Skill · x2 '+p.stats.doubles : 'Skill hits'}</i></span></div>`;
    d.querySelector('img').src = skinURL(p.cos.sk); d.querySelector('.rc-top b').textContent = p.name; d.querySelector('.rc-top div').textContent = `Lv ${p.cos.lv} · ${p.ch.name} · ${p.ctl==='bot'?'Bot':p.ctl==='phone'?'Phone':'Here'}`;
    const rw = Gm.rewards && Gm.rewards[p.slot];
    if(rw && !rw.phone) d.insertAdjacentHTML('beforeend', rewardHTML(rw));
    else if(rw && rw.phone) d.insertAdjacentHTML('beforeend', `<div class="rw"><div class="rw-top"><b>+${rw.gold}</b><i class="coin"></i><span>+${rw.xp} XP</span></div><small class="muted">Saved on their phone</small></div>`);
    grid.appendChild(d); });
  c.appendChild(grid);
  show('hud', false); tog('#touchpad', 'on', false); show('results', true); MUSIC.start('title');
  $('#rAgain').onclick = ()=>{ show('results', false); newGame(); };
  $('#rLobby').onclick = ()=>{ show('results', false); openLobby(); };
  $('#rRec').onclick = ()=>{ show('results', false); openRecords(()=>show('results', true)); };
  $('#rShop').onclick = ()=>{ show('results', false); openHostShop(null, ()=>show('results', true)); };
}
function openRecords(onClose){
  const prof = Object.values(store.get('profiles', {})).filter(r=>r.games > 0).sort((a,b)=>b.wins-a.wins || b.dmg-a.dmg); const hist = store.get('history', []);
  const c = $('#recCard'); c.innerHTML = `<div style="display:flex;justify-content:space-between;align-items:center"><h2 class="ribbon" style="font-size:1.9rem">Hall of fame</h2><button class="btn dark small" id="recClose">Close</button></div>`;
  const t = document.createElement('table'); t.innerHTML = '<thead><tr><th>#</th><th>Player</th><th>Level</th><th>Wins</th><th>Games</th><th>Win %</th><th>KOs</th><th>Damage</th><th>Accuracy</th><th>Longest hit</th></tr></thead>';
  const tb = document.createElement('tbody');
  if(!prof.length) tb.innerHTML = '<tr><td colspan="10" class="muted">No games yet. Win one and your name lands here.</td></tr>';
  prof.forEach((r,i)=>{ const tr = document.createElement('tr'); [i+1, r.name, r.lvl || 1, r.wins, r.games, Math.round(100*r.wins/Math.max(1,r.games))+'%', r.kills, r.dmg, (r.shots?Math.min(100,Math.round(100*r.hits/r.shots)):0)+'%', r.best+'m'].forEach((v,j)=>{ const td = document.createElement('td'); td.textContent = v; if(j===0) td.className='n'; tr.appendChild(td); }); tb.appendChild(tr); });
  t.appendChild(tb); c.appendChild(t);
  const h = document.createElement('div'); h.innerHTML = '<div class="sec" style="margin-top:22px">Recent battles</div>'; if(!hist.length) h.innerHTML += '<div class="muted">Nothing yet.</div>';
  hist.slice(0,10).forEach(m=>{ const row = document.createElement('div'); row.style.cssText='display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-top:1px solid #ffffff16;font-size:.9rem';
    const l = document.createElement('span'); l.textContent = `${MAPS[m.map]?.name||m.map} · ${m.players.map(p=>p.n+(p.w?' ★':'')).join(', ')}`;
    const r = document.createElement('span'); r.className='muted'; r.textContent = new Date(m.at).toLocaleString([], {month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'}); row.append(l, r); h.appendChild(row); });
  c.appendChild(h); show('records', true);
  $('#recClose').onclick = ()=>{ show('records', false); onClose && onClose(); };
}

/* ================= LOBBY ================= */
let customIdx = -1, lobbyPlayers = [];
function segment(el, options, get, set){ el.innerHTML = ''; options.forEach(([v, label])=>{ const b = document.createElement('button'); b.textContent = label; b.classList.toggle('sel', get()===v); b.onclick = ()=>{ set(v); store.set('settings', settings); segment(el, options, get, set); if(mode==='lobby'){ buildLobbyScene(); renderSlots(); } }; el.appendChild(b); }); }
function openLobby(){
  mode = 'lobby'; Gm = null; parts = []; floaters.length = 0; bursts.length = 0;
  show('title', false); show('hud', false); show('lobby', true); tog('#touchpad', 'on', false);
  segment($('#setMap'), Object.entries(MAPS).map(([k,v])=>[k, v.short]), ()=>settings.map, v=>settings.map=v);
  segment($('#setMode'), [['ffa','Free for all'],['teams','Red vs Blue']], ()=>settings.mode, v=>settings.mode=v);
  segment($('#setTimer'), [[15,'15s'],[20,'20s'],[30,'30s']], ()=>settings.timer, v=>settings.timer=v);
  segment($('#setWind'), [['off','Off'],['normal','Normal'],['wild','Wild']], ()=>settings.wind, v=>settings.wind=v);
  segment($('#setGuide'), [['off','Off'],['short','Short'],['full','Full']], ()=>settings.guide, v=>settings.guide=v);
  segment($('#setHp'), [[0.7,'Quick'],[1,'Normal'],[1.5,'Long']], ()=>settings.hp, v=>settings.hp=v);
  segment($('#setView'), [['full','Whole map'],['follow','Close up']], ()=>settings.view, v=>settings.view=v);
  setupHostRoom(); buildLobbyScene(); renderSlots(); MUSIC.start('title');
}
function buildLobbyScene(){
  buildTerrain(settings.map, 1234);
  const used = slots.map((s,i)=>({s,i})).filter(o=>o.s.ctl!=='empty');
  lobbyPlayers = used.map((o,k)=>playerFromSlot(o.s, o.i, k)); placePlayers(lobbyPlayers);
}
function slotTeam(i){ let k = 0; for(let j=0;j<i;j++) if(slots[j].ctl!=='empty') k++; return k % 2; }
function renderSlots(){
  const box = $('#slots'); box.innerHTML = '';
  const used = slots.filter(s=>s.ctl!=='empty').length; $('#seatCount').textContent = `${used} / ${MAXP} players`;
  slots.forEach((s,i)=>{
    const d = document.createElement('div'); d.className = 'frame slot' + (s.ctl==='empty' ? ' empty' : ''); const c = CH[s.look.ch];
    const lp = lobbyPlayers.find(p=>p.slot===i);
    const face = document.createElement('div'); face.className = 'face'; if(s.ctl!=='empty'){ face.style.backgroundImage = skinFace(lp ? lp.cos.sk : c.id+':base'); face.style.setProperty('--c', s.look.c1); if(lp && SKINS[lp.cos.sk]?.rar==='l') face.classList.add('legend'); }
    if(s.ctl!=='empty' && lp){ const lv = document.createElement('em'); lv.textContent = lp.cos.lv; face.appendChild(lv); }
    const who = document.createElement('div'); who.className = 'who';
    const nm = document.createElement('b'); nm.textContent = s.ctl==='empty' ? 'Open seat' : (s.look.name || c.name);
    const sub = document.createElement('span'); sub.textContent = s.ctl==='empty' ? 'Phone joins here, or add a bot' : `${c.name} · ${WEAPONS[s.look.wpn]?.name||''}`;
    if(s.ctl!=='empty' && settings.mode==='teams'){ const tm = slotTeam(i); const tg = document.createElement('i'); tg.className = 'tm ' + (tm ? 'red' : 'blue'); tg.textContent = tm ? 'RED' : 'BLUE'; nm.prepend(tg); }
    const top = document.createElement('div'); top.className = 'stop'; const txt = document.createElement('div'); txt.className = 'stxt'; txt.append(nm, sub); top.appendChild(txt); who.appendChild(top);
    const seg = document.createElement('div'); seg.className='seg';
    const opts = s.ctl==='phone' ? [['phone','Phone']] : [['empty','Open'],['local','Here'],['bot','Bot']];
    opts.forEach(([v,l])=>{ const b = document.createElement('button'); b.textContent = l; b.classList.toggle('sel', s.ctl===v); b.onclick = ()=>{ if(s.ctl==='phone') return; s.ctl = v; saveSlots(); buildLobbyScene(); renderSlots(); SFX.play('ui'); }; seg.appendChild(b); });
    if(s.ctl==='phone'){ const pk = s.peer; const b = document.createElement('button'); b.textContent = 'Kick'; b.onclick = ()=>{ kicked.add(pk); s.ctl='empty'; s.peer=null; buildLobbyScene(); renderSlots(); }; seg.appendChild(b); }
    const row = document.createElement('div'); row.className = 'srow'; row.appendChild(seg);
    if(s.ctl==='bot'){ const sg = document.createElement('div'); sg.className = 'seg bdseg'; [['easy','Easy'],['normal','Med'],['hard','Hard']].forEach(([v,l])=>{ const b=document.createElement('button'); b.textContent=l; b.className = 'bd' + (s.bot===v ? ' sel' : ''); b.onclick=()=>{ s.bot=v; saveSlots(); renderSlots(); SFX.play('ui'); }; sg.appendChild(b); }); row.appendChild(sg); }
    if(s.ctl==='local' || s.ctl==='bot'){ const e = document.createElement('button'); e.className='btn small'; e.textContent = s.ctl==='local' ? 'Edit & shop' : 'Edit'; e.onclick = ()=>openCustom(i); top.appendChild(e); }
    who.appendChild(row);
    d.append(face, who);
    box.appendChild(d);
  });
}
function heroCards(container, sel, onPick, prof){
  const g = document.createElement('div'); g.className = 'grid g3';
  CHARS.forEach(c=>{ const sk = prof ? cosFromProf(prof, c.id, 'thunder').sk : c.id+':base'; const b = document.createElement('div'); b.className = 'hero-pick'+(sel===c.id?' sel':'') + (SKINS[sk].rar==='l' ? ' legend' : ''); b.innerHTML = `<img alt="" src="${skinURL(sk)}"><div class="nm"><b>${c.name}</b><span>${c.role}</span></div>`; b.onclick = ()=>onPick(c.id); g.appendChild(b); });
  container.appendChild(g);
}
function weaponCards(card, L, prof, rerender, cols='g3'){
  const wg = document.createElement('div'); wg.className='grid ' + cols;
  Object.entries(WEAPONS).forEach(([k,w])=>{ const open = !prof || wpnOpen(prof, k); const wl = prof ? (prof.wl[k]||0) : 0; const b = document.createElement('div'); b.className='pick'+(L.wpn===k?' sel':'') + (open ? '' : ' locked');
    b.innerHTML = `<b>${w.name}${wl ? ' <em class="up">+'+wl+'</em>' : ''}</b><span>${w.desc}</span><span class="stars">Damage ${stars(clamp(Math.round(w.dmg/62),1,5))}<br>Blast ${stars(clamp(Math.round(w.r/9),1,5))}</span>` + (open ? '' : `<span class="lock">Level ${WPN_UNLOCK[k][0]} or ${WPN_UNLOCK[k][1]} gold in the shop</span>`);
    b.onclick=()=>{ if(!open){ toast('Unlock it in the shop, or reach level '+WPN_UNLOCK[k][0]); return; } L.wpn=k; rerender(); }; wg.appendChild(b); });
  card.appendChild(wg);
}
function openCustom(i){
  customIdx = i; const s = slots[i]; const L = s.look; const card = $('#customCard'); card.innerHTML = '';
  const prof = s.ctl==='local' ? profFor(L.name || CH[L.ch].name) : null;
  const rerender = ()=>{ saveSlots(); buildLobbyScene(); renderSlots(); openCustom(i); };
  const top = document.createElement('div'); top.style.cssText = 'display:flex;justify-content:space-between;align-items:center;gap:10px';
  top.innerHTML = '<h2 class="ribbon" style="font-size:1.6rem">Choose your hero</h2>'; const done = document.createElement('button'); done.className='btn green small'; done.textContent='Done'; done.onclick=()=>{ show('custom', false); show('lobby', true); customIdx=-1; }; top.appendChild(done); card.appendChild(top);
  const nmw = document.createElement('div'); nmw.innerHTML = '<div class="sec">Name</div>'; const inp = document.createElement('input'); inp.className='txt'; inp.maxLength=14; inp.value = L.name||''; inp.oninput = ()=>{ L.name = inp.value; saveSlots(); renderSlots(); }; inp.onchange = ()=>rerender(); nmw.appendChild(inp); card.appendChild(nmw);
  if(prof){ const pr = document.createElement('div'); pr.className = 'profrow'; pr.innerHTML = `<div class="lvl"><b>Lv ${prof.lvl}</b><span>${levelTitle(prof.lvl)}</span><div class="xpbar"><i style="width:${Math.round(100*prof.xp/xpNeed(prof.lvl))}%"></i></div></div><div class="goldpill"><i class="coin"></i><b>${prof.gold.toLocaleString()}</b></div>`;
    const sb = document.createElement('button'); sb.className = 'btn small'; sb.textContent = 'Shop & Locker'; sb.onclick = ()=>{ show('custom', false); openHostShop(prof.name, ()=>{ openCustom(i); }, L.ch); }; pr.appendChild(sb); card.appendChild(pr); }
  card.insertAdjacentHTML('beforeend', '<div class="sec">Hero</div>'); heroCards(card, L.ch, id=>{ L.ch = id; rerender(); }, prof);
  const c = CH[L.ch]; const st = document.createElement('div'); st.style.cssText='margin-top:10px;display:grid;gap:4px'; st.innerHTML = `<div class="muted" style="font-size:.85rem;font-weight:700">${c.blurb}</div><div class="stat">HP<i style="--v:${c.hp/13}%"></i></div><div class="stat">ATK<i style="--v:${c.atk*70}%"></i></div><div class="stat">DEF<i style="--v:${c.def*70}%"></i></div><div class="stat">MOVE<i style="--v:${c.sta*60}%"></i></div>`; card.appendChild(st);
  card.insertAdjacentHTML('beforeend', '<div class="sec">Colour (name and shell trail)</div>');
  const g = document.createElement('div'); g.className='grid'; g.style.gridTemplateColumns='repeat(12,1fr)';
  PALETTE.forEach(col=>{ const b = document.createElement('div'); b.className='sw'+(L.c1===col?' sel':''); b.style.background = col; b.onclick=()=>{ L.c1=col; rerender(); }; g.appendChild(b); }); card.appendChild(g);
  card.insertAdjacentHTML('beforeend', '<div class="sec">Weapon</div>'); weaponCards(card, L, prof, rerender);
  card.insertAdjacentHTML('beforeend', '<div class="sec">Items (pick 3)</div>');
  const ig = document.createElement('div'); ig.className='grid g3';
  Object.entries(ITEMS).forEach(([k,it])=>{ const on = L.items.includes(k); const b = document.createElement('div'); b.className='pick'+(on?' sel':''); b.innerHTML = `<div class="ibdg">${ICON[k]}</div><b>${it.name}</b><span>${it.desc}</span>`; b.onclick=()=>{ if(on) L.items = L.items.filter(x=>x!==k); else { L.items.push(k); if(L.items.length>3) L.items.shift(); } rerender(); }; ig.appendChild(b); }); card.appendChild(ig);
  show('custom', true); show('lobby', false);
}
function localNames(){ const n = slots.filter(s=>s.ctl==='local').map(s=>(s.look.name || CH[s.look.ch].name).trim().slice(0,18)); Object.values(allProfiles()).forEach(r=>{ if(!n.includes(r.name) && (r.games > 0 || Object.keys(r.own).length)) n.push(r.name); }); return [...new Set(n.filter(Boolean))]; }
function openHostShop(name, onClose, hero){
  const names = localNames(); if(!names.length) names.push('Player'); const nm = name || names[0];
  const prof = profFor(nm); saveProf(prof);
  openShop({el:$('#shopCard'), prof, save:r=>{ saveProf(r); }, names: names.includes(nm) ? names : [nm].concat(names), modal:true, hero: hero || 'juno', onClose:()=>{ if(mode==='lobby'){ buildLobbyScene(); renderSlots(); } onClose && onClose(); }});
}
const kicked = new Set();

/* ----- host room ----- */
let lastStateStr = '', lastStateAt = 0, lobbyKey = '';
async function setupHostRoom(){
  await roomReady;
  if(!room){ $('#roomCode').textContent = 'LOCAL'; $('#qr').innerHTML = '<div style="font-size:.75rem;color:#333;padding:6px;text-align:center">Phones connect when the game is opened from its web link</div>'; $('#joinHint').textContent = 'Phone controllers need the web link. Keyboard, touch and bots work everywhere.'; return; }
  $('#joinHint').innerHTML = room.relay ? 'Scan with any phone camera to join as a controller. No app, no sign-in.<br><span id="netStat" class="netstat">Connecting...</span>' : 'Scan with a phone signed in to claude.ai, tap <b>Be a controller</b>, then pick this table.';
  if(!roomCode){ roomCode = Array.from({length:4}, ()=>'ABCDEFGHJKMNPQRSTUVWXYZ'[Math.random()*23|0]).join('');
    try{ groom = await room.join('arcfall-'+roomCode.toLowerCase()); room.presence({host:roomCode, at:Date.now()}).catch(()=>{}); groom.onPeers(ch=>onPadPeers(ch)); }catch(e){ groom = null; }
    if(groom && groom.online) setInterval(()=>{ const n = $('#netStat'); if(!n) return; const on = groom.online(); n.textContent = on ? 'Online · phones can join' : 'Connecting...'; n.classList.toggle('on', on); }, 1000); }
  $('#roomCode').textContent = roomCode; drawQR(); pushState(true);
}
const joinURL = () => room && room.relay ? location.origin + location.pathname + '#join=' + roomCode : SHARE_URL;
function drawQR(){ const el = $('#qr'); el.innerHTML = ''; if(!window.qrcode){ el.innerHTML = '<div style="color:#333;font-size:.8rem;text-align:center">Open this same page on your phone</div>'; return; } const q = window.qrcode(0, 'M'); q.addData(joinURL()); q.make(); el.innerHTML = q.createImgTag(5, 0); }
function onPadPeers(ch){
  const peers = ch.peers.filter(p=>!p.sameTab && p.presence && p.presence.p===1); const ids = new Set(peers.map(p=>p.peer));
  slots.forEach(s=>{ if(s.ctl==='phone' && !ids.has(s.peer)){ if(mode==='play' && Gm){ const pl = Gm.players.find(q=>q.peer===s.peer && q.ctl==='phone'); if(pl){ pl.ctl='bot'; pl.bot='normal'; toast(pl.name+"'s phone left. A bot takes over."); } } s.ctl='empty'; s.peer=null; } });
  peers.forEach(pe=>{
    if(kicked.has(pe.peer)) return;
    let s = slots.find(x=>x.peer===pe.peer);
    if(!s){ if(mode==='play') return; s = slots.find(x=>x.ctl==='empty') || slots.find(x=>x.ctl==='bot'); if(!s) return; s.ctl='phone'; s.peer=pe.peer; SFX.play('item'); toast((pe.presence.nm||'A phone')+' joined'); }
    const pr = pe.presence; const L = s.look;
    if(pr.nm) L.name = String(pr.nm).slice(0,14); if(CH[pr.ch]) L.ch = pr.ch; if(/^#[0-9a-f]{6}$/i.test(pr.c1||'')) L.c1 = pr.c1;
    if(WEAPONS[pr.wp]) L.wpn = pr.wp; if(Array.isArray(pr.it)) L.items = pr.it.filter(x=>ITEMS[x]).slice(0,3); s.cos = pr.cos && typeof pr.cos==='object' ? pr.cos : null;
  });
  if(mode==='lobby'){ const key = JSON.stringify(slots.map(s=>[s.ctl, s.peer, s.look, s.cos])); if(key!==lobbyKey){ lobbyKey = key; buildLobbyScene(); renderSlots(); } }
  pushState(true);
}
function pushState(force){
  if(!groom) return; const now = performance.now(); if(!force && now - lastStateAt < 120) return;
  const st = {h:1, code:roomCode, ph: mode==='play' ? (Gm?.over ? 'over' : 'play') : 'lobby'};
  if(mode==='play' && Gm){ const p = Gm.players[Gm.turn];
    st.tn = p ? p.slot : -1; st.aim = Gm.phase==='aim' ? 1 : 0; st.wd = Gm.wind; st.tm = Math.max(0, Math.ceil(Gm.timer)); st.sa = Gm.superArmed?1:0; st.iu = Gm.itemsUsed;
    st.pl = Gm.players.map(q=>({s:q.slot, pk:q.peer, n:q.name, c:q.look.c1, ch:q.ch.id, hp:Math.round(q.hp), mh:q.maxhp, al:q.alive?1:0, en:Math.floor(q.energy), stm:Math.round(q.stamina), it:q.items.map(i=>[i.id,i.left]), lp:q.lastPower==null?-1:Math.round(q.lastPower), fz:q.frozen?1:0, w:q.wpn, fc:q.face, x:Math.round(q.x), tm:q.team}));
    if(Gm.over){ const t = aliveTeams()[0]; st.win = settings.mode==='teams' ? (t ? 'Red team' : 'Blue team') : Gm.players.filter(q=>q.team===t).map(q=>q.name).join(' + '); if(Gm.rw) st.rw = Gm.rw; } }
  else st.sl = slots.map((s,i)=>({i, ctl:s.ctl, pk:s.peer, n:s.look.name}));
  const str = JSON.stringify(st); if(str===lastStateStr && (!force || now - lastStateAt < 1000)) return;
  lastStateStr = str; lastStateAt = now; groom.presence({st}).catch(()=>{});
}

/* ================= PHONE PAD ================= */
const buzz = p => { try{ if(navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(p); }catch(e){} };
const pad = {look: store.get('padLook', null), joined:null, a:45, mv:0, chg:false, pw:0, pdir:1, f:0, u:0, s:0, k:0, view:'find', lastTurnMine:false};
if(!pad.look) pad.look = {...defaultLook(Math.random()*4|0), name:''};
if(!CH[pad.look.ch]) pad.look.ch = 'juno';
function savePadLook(){ store.set('padLook', pad.look); }
function padProf(){ const r = myProf(); if(pad.look.name && r.name !== pad.look.name){ r.name = pad.look.name.slice(0,18); saveMyProf(r); } return r; }
function padRefreshCos(){ const r = padProf(); if(!wpnOpen(r, pad.look.wpn)) pad.look.wpn = 'thunder'; pad.cos = cosFromProf(r, pad.look.ch, pad.look.wpn); }
function padSend(extra={}){
  if(!pad.joined) return; const L = pad.look;
  pad.joined.presence({p:1, nm:L.name||CH[L.ch].name, ch:L.ch, c1:L.c1, c2:L.c2, hat:L.hat, ey:L.eyes, wp:L.wpn, it:L.items, a:Math.round(pad.a*10)/10, mv:pad.mv, chg:pad.chg?1:0, pw:Math.round(pad.pw), f:{n:pad.f, a:pad.fa??pad.a, pw:pad.fpw??0}, u:[pad.u, pad.uid||''], s:pad.s, k:pad.k, em:[pad.em||0, pad.emi||0], cos:pad.cos || null, ...extra}).catch(()=>{});
}
async function openPad(){
  mode = 'pad'; show('title', false); show('pad', true);
  renderPadFind();
  await roomReady;
  if(!room){ $('#padFindNote').textContent = 'Controllers work when this page is opened from the game\'s web link.'; return; }
  if(room.relay){ $('#padFindNote').innerHTML = 'Scan the QR code on the big screen with your camera, or type its 4-letter code below.'; return; }
  room.onPeers(()=>{ if(pad.view==='find') renderPadTables(); });
  renderPadTables();
}
function renderPadFind(){
  pad.view = 'find';
  const el = $('#pad'); el.classList.remove('play', 'idle'); el.innerHTML = `
  <div class="logo" style="font-size:3rem;margin:10px 0 4px">ARCFALL<small>CONTROLLER</small></div>
  <div class="frame panel-pad"><div class="sec" style="margin-top:0">${RELAY_OK ? 'Join a table' : 'Tables nearby'}</div><div class="findlist" id="padTables"><div class="muted" id="padFindNote">Looking for a game...</div></div></div>
  <div class="frame panel-pad"><div class="sec" style="margin-top:0">Or type the code</div><div class="codeinput"><input class="txt" id="padCode" maxlength="4" placeholder="ABCD" autocomplete="off"><button class="btn" id="padGo">Join</button></div></div>
  <button class="btn dark" id="padBack">Back</button>`;
  $('#padGo').onclick = ()=>joinTable($('#padCode').value.trim().toUpperCase());
  $('#padBack').onclick = ()=>{ show('pad', false); mode='title'; show('title', true); };
}
function renderPadTables(){
  const box = $('#padTables'); if(!box || !room) return;
  const hosts = room.peers().filter(p=>p.presence && typeof p.presence.host==='string' && /^[A-Z]{4}$/.test(p.presence.host));
  box.innerHTML = '';
  if(!hosts.length){ box.innerHTML = '<div class="muted">No table found yet. Tap <b>Host a game</b> on the laptop or tablet.</div>'; return; }
  hosts.forEach(h=>{ const b = document.createElement('button'); b.className='btn blue'; b.textContent = 'Join table '+h.presence.host; b.onclick=()=>joinTable(h.presence.host); box.appendChild(b); });
}
async function joinTable(code){
  if(!/^[A-Z]{4}$/.test(code)){ toast('Codes are four letters'); return; }
  if(!room){ toast('Open the game from its web link to use phones'); return; }
  try{ if(pad.joined){ await pad.joined.leave(); } pad.joined = await room.join('arcfall-'+code.toLowerCase()); }catch(e){ toast('Could not join. Try again.'); return; }
  pad.code = code; padRefreshCos(); padSend();
  pad.joined.onPeers(()=>renderPad());
  renderPadCustom();
}
function padHost(){ if(!pad.joined) return null; const h = pad.joined.peers().find(p=>p.presence && p.presence.st); return h ? h.presence.st : null; }
function padMe(){ if(!pad.joined) return null; const me = pad.joined.peers().find(p=>p.sameTab); return me ? me.peer : null; }
function renderPad(){
  const st = padHost();
  if(st && (st.ph==='play' || st.ph==='over') && pad.view!=='play' && !(st.ph==='over' && pad.view==='shop')){ shopCtx = null; renderPadPlay(); }
  else if(st && st.ph==='lobby' && pad.view==='play') renderPadCustom();
  if(pad.view==='play') updatePadPlay(st);
  if(pad.view==='custom') updatePadLobby(st);
}
function renderPadCustom(){
  pad.view = 'custom'; const L = pad.look; const el = $('#pad'); el.classList.remove('play', 'idle'); el.innerHTML = ''; padRefreshCos(); const prof = padProf();
  const head = document.createElement('div'); head.className='frame panel-pad'; head.style.textAlign='center';
  head.innerHTML = `<div class="disp" style="font-size:1.1rem">Table ${pad.code}</div><div class="muted" id="padLobbyNote" style="font-size:.85rem;margin-top:4px">Connecting...</div>`;
  el.appendChild(head);
  const card = document.createElement('div'); card.className='frame panel-pad'; el.appendChild(card);
  const re = ()=>{ savePadLook(); padRefreshCos(); padSend(); renderPadCustom(); updatePadLobby(padHost()); };
  const pr = document.createElement('div'); pr.className = 'profrow'; pr.innerHTML = `<div class="lvl"><b>Lv ${prof.lvl}</b><span>${levelTitle(prof.lvl)}</span><div class="xpbar"><i style="width:${Math.round(100*prof.xp/xpNeed(prof.lvl))}%"></i></div></div><div class="goldpill"><i class="coin"></i><b>${prof.gold.toLocaleString()}</b></div>`;
  const sb = document.createElement('button'); sb.className = 'btn small'; sb.textContent = 'Shop & Locker'; sb.onclick = ()=>{ pad.view = 'shop'; $('#pad').classList.remove('play', 'idle'); openShop({el:$('#pad'), prof:padProf(), save:r=>{ saveMyProf(r); padRefreshCos(); padSend(); }, phone:true, hero:L.ch, onClose:()=>renderPadCustom()}); }; pr.appendChild(sb); card.appendChild(pr);
  card.insertAdjacentHTML('beforeend', '<div class="sec">Your name</div>');
  const inp = document.createElement('input'); inp.className='txt'; inp.maxLength=14; inp.placeholder='Name'; inp.value=L.name||''; inp.onchange=()=>{ L.name=inp.value; savePadLook(); padProf(); padSend(); }; card.appendChild(inp);
  card.insertAdjacentHTML('beforeend','<div class="sec">Hero</div>');
  heroCards(card, L.ch, id=>{ L.ch=id; re(); }, prof);
  card.insertAdjacentHTML('beforeend','<div class="sec">Colour</div>');
  const cg = document.createElement('div'); cg.className='grid'; cg.style.gridTemplateColumns='repeat(8,1fr)';
  PALETTE.forEach(col=>{ const b=document.createElement('div'); b.className='sw'+(L.c1===col?' sel':''); b.style.background=col; b.onclick=()=>{ L.c1=col; re(); }; cg.appendChild(b); }); card.appendChild(cg);
  card.insertAdjacentHTML('beforeend','<div class="sec">Weapon</div>');
  weaponCards(card, L, prof, re, 'g2');
  card.insertAdjacentHTML('beforeend','<div class="sec">Items (pick 3)</div>');
  const ig = document.createElement('div'); ig.className='grid g3'; Object.entries(ITEMS).forEach(([k,it])=>{ const on=L.items.includes(k); const b=document.createElement('div'); b.className='pick'+(on?' sel':''); b.innerHTML=`<div class="ibdg">${ICON[k]}</div><b>${it.name}</b><span>${it.desc}</span>`; b.onclick=()=>{ if(on) L.items=L.items.filter(x=>x!==k); else { L.items.push(k); if(L.items.length>3) L.items.shift(); } re(); }; ig.appendChild(b); }); card.appendChild(ig);
  el.appendChild(Object.assign(document.createElement('div'), {className:'muted', style:'text-align:center;font-size:.8rem', textContent:'The big screen starts the battle.'}));
  updatePadLobby(padHost());
}
function updatePadLobby(st){
  const n = $('#padLobbyNote'); if(!n) return;
  if(!st){ n.textContent = 'Waiting for the table...'; return; }
  const me = padMe(); const seat = st.sl ? st.sl.find(s=>s.pk===me) : null;
  n.textContent = seat ? `You're in seat ${seat.i+1}. Get ready!` : 'Table is full. Ask the host to open a seat.';
}
function renderPadPlay(){
  pad.view = 'play'; const el = $('#pad'); el.classList.add('play');
  el.innerHTML = `
  <div class="pad-head"><div class="av" id="pAv"></div><div class="who"><b id="pName"></b><span id="pSub"></span></div><div class="chip" id="pWind">Wind 0</div></div>
  <div class="frame pad-status" id="pStatus">Waiting<small></small></div>
  <div class="dial2" id="pDial"><svg viewBox="0 0 200 135"><path d="M20 120 A80 80 0 0 1 180 120" fill="none" stroke="#ffffff18" stroke-width="22" stroke-linecap="round"/><path id="pArc" fill="none" stroke="url(#gr)" stroke-width="22" stroke-linecap="round"/><defs><linearGradient id="gr"><stop offset="0" stop-color="#3ee6a8"/><stop offset="1" stop-color="#ffb23f"/></linearGradient></defs><line id="pNeedle" x1="100" y1="120" x2="100" y2="40" stroke="#fff" stroke-width="5" stroke-linecap="round"/><circle cx="100" cy="120" r="9" fill="#fff"/><circle id="pKnob" r="13" fill="#ffd84a" stroke="#2a1606" stroke-width="3"/></svg><div class="val" id="pAng">45&deg;</div><button class="btn dark small fine l" id="pAm">-1&deg;</button><button class="btn dark small fine r" id="pAp">+1&deg;</button></div>
  <button class="pad-sky" id="pSky"></button>
  <div class="pad-force"><div class="pf-top"><span>FORCE</span><b id="pPwN"></b></div><div class="pad-power"><div class="fill" id="pPw"></div><div class="tk"></div><div class="n95"></div><div class="last" id="pLast"></div></div><div class="pf-nums">${[10,20,30,40,50,60,70,80,90,100].map(n=>`<span style="left:${n}%">${n}</span>`).join('')}</div></div>
  <div class="pad-row"><button class="btn dark" id="pL">&#9664;<small>walk</small></button><button class="btn red pad-fire" id="pFire"><span id="pFireT">FIRE</span><small>hold, let go</small></button><button class="btn dark" id="pR">&#9654;<small>walk</small></button></div>
  <div class="pad-items" id="pItems"></div>
  <div class="pad-foot"><div class="pad-emotes" id="pEm"></div><button class="btn dark small" id="pSkip">Pass</button></div>`;
  emoteList(padProf()).forEach(i=>{ const b=document.createElement('button'); b.className='btn dark small'; b.textContent=EMOTE_ALL[i]; b.onclick=()=>{ pad.em=(pad.em||0)+1; pad.emi=i; padSend(); buzz(10); }; $('#pEm').appendChild(b); });
  const dial = $('#pDial');
  const setFromPoint = (e)=>{ const r = dial.querySelector('svg').getBoundingClientRect(), sc = Math.min(r.width/200, r.height/135); const cx = r.left + r.width/2, cy = r.top + (r.height - 135*sc)/2 + 120*sc; let a = Math.atan2(cy - e.clientY, e.clientX - cx)*180/Math.PI; // 0 right, 180 left
    const facing = pad.face||1; let ang = facing>0 ? a : 180 - a; pad.a = clamp(Math.round(ang), 0, 90); drawDial(); padSend(); };
  dial.addEventListener('pointerdown', e=>{ dial.setPointerCapture(e.pointerId); setFromPoint(e); });
  dial.addEventListener('pointermove', e=>{ if(e.buttons) setFromPoint(e); });
  $('#pAm').onclick = ()=>{ pad.a = clamp(pad.a-1,0,90); drawDial(); padSend(); };
  $('#pAp').onclick = ()=>{ pad.a = clamp(pad.a+1,0,90); drawDial(); padSend(); };
  const hold = (id, on, off)=>{ const b = $(id); b.addEventListener('pointerdown', e=>{ e.preventDefault(); b.setPointerCapture(e.pointerId); b.classList.add('down'); on(); }); const end = ()=>{ if(!b.classList.contains('down')) return; b.classList.remove('down'); off(); }; b.addEventListener('pointerup', end); b.addEventListener('pointercancel', end); };
  hold('#pL', ()=>{ pad.mv=-1; pad.face=-1; drawDial(); padSend(); }, ()=>{ pad.mv=0; padSend(); });
  hold('#pR', ()=>{ pad.mv=1; pad.face=1; drawDial(); padSend(); }, ()=>{ pad.mv=0; padSend(); });
  hold('#pFire', ()=>{ if(!pad.mine) return; pad.chg=true; pad.pw=0; pad.lastT = performance.now(); padTick(); }, padRelease);
  $('#pSkip').onclick = ()=>{ if(!pad.mine) return; pad.k++; padSend(); };
  $('#pSky').onclick = ()=>{ if(pad.skyA==null) return; pad.a = pad.skyA; drawDial(); padSend(); SFX.play('tick'); buzz(12); };
  drawDial(); updatePadPlay(padHost()); keepAwake();
}
function padRelease(){ if(!pad.chg) return; pad.chg=false; pad.f++; pad.fa=pad.a; pad.fpw=Math.round(pad.pw*10)/10; padSend(); buzz(30); SFX.charge(null); setPadForce(pad.pw); const ft = $('#pFireT'); if(ft) ft.textContent = 'FIRE'; }
function setPadForce(v){ const f = $('#pPw'); if(f) f.style.width = (v||0)+'%'; const pn = $('#pPwN'); if(pn) pn.textContent = v==null ? '' : Math.round(v); }
// keep the phone's screen on while it's a controller (where the browser allows it)
let wakeLock = null;
async function keepAwake(){ try{ if(navigator.wakeLock && !wakeLock && document.visibilityState==='visible'){ wakeLock = await navigator.wakeLock.request('screen'); wakeLock.addEventListener('release', ()=>{ wakeLock = null; }); } }catch(e){} }
document.addEventListener('visibilitychange', ()=>{ if(mode==='pad' && pad.view==='play') keepAwake(); });
function padTick(){
  if(!pad.chg) return; const now = performance.now(); const dt = (now - (pad.lastT||now))/1000; pad.lastT = now;
  pad.pw = Math.min(100, pad.pw + CHARGE_RATE*Math.min(dt,.05)); if(pad.pw >= 100){ padRelease(); return; }
  setPadForce(pad.pw); const ft = $('#pFireT'); if(ft) ft.textContent = Math.round(pad.pw); SFX.charge(pad.pw);
  padSend(); requestAnimationFrame(padTick);
}
function drawDial(){
  const face = pad.face||1; const a = pad.a*Math.PI/180; const dir = face>0 ? a : Math.PI - a;
  const x = 100 + Math.cos(dir)*60, y = 120 - Math.sin(dir)*60;
  const n = $('#pNeedle'); if(!n) return; n.setAttribute('x2', x); n.setAttribute('y2', y);
  $('#pKnob').setAttribute('cx', 100 + Math.cos(dir)*80); $('#pKnob').setAttribute('cy', 120 - Math.sin(dir)*80);
  const sx = face>0 ? 180 : 20; const ex = 100 + Math.cos(dir)*80, ey = 120 - Math.sin(dir)*80;
  $('#pArc').setAttribute('d', pad.a<0.5 ? '' : `M${sx} 120 A80 80 0 0 ${face>0?0:1} ${ex.toFixed(2)} ${ey.toFixed(2)}`);
  $('#pAng').textContent = Math.round(pad.a)+'°';
}
function updatePadPlay(st){
  if(!st || pad.view!=='play') return;
  const me = padMe(); const mine = st.pl ? st.pl.find(q=>q.pk===me) : null;
  const turnP = st.pl ? st.pl.find(q=>q.s===st.tn) : null;
  const isMine = !!(mine && turnP && mine.s===turnP.s && st.aim && st.ph==='play');
  if(isMine && !pad.lastTurnMine){ buzz([60,40,60]); SFX.play('turn'); const el = $('#pad'); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); }
  if(!isMine && pad.chg){ pad.chg = false; SFX.charge(null); setPadForce(null); const ft = $('#pFireT'); if(ft) ft.textContent = 'FIRE'; }
  pad.lastTurnMine = isMine; pad.mine = isMine; $('#pad').classList.toggle('idle', !isMine);
  if(mine){ $('#pAv').style.backgroundImage = faceCSS(mine.ch); $('#pAv').style.setProperty('--c', mine.c); $('#pName').textContent = mine.n; $('#pSub').textContent = `${CH[mine.ch]?.name||''} · HP ${mine.hp}/${mine.mh} · Move ${mine.stm}%`;
    $('#pLast').style.left = (mine.lp<0?-5:mine.lp)+'%'; $('#pLast').style.display = mine.lp<0 ? 'none' : 'block';
    if(!pad.mv && mine.fc && mine.fc!==pad.face){ pad.face = mine.fc; drawDial(); }
    const sk = $('#pSky'); let d = 1e9; if(mine.al && mine.x!=null) st.pl.forEach(q=>{ if(q.al && q.tm!==mine.tm) d = Math.min(d, rulerDist(q.x - mine.x)); });
    if(sk){ if(d < 30){ const wf = Math.round((st.wd||0)*2*(mine.fc||1)*10)/10; pad.skyA = clamp(Math.round(90 - d + wf), 0, 90);
        sk.innerHTML = `Nearest enemy <b>${d.toFixed(1)}</b> · Sky shot <b>Force 95</b> at <b>${pad.skyA}°</b><i>tap to aim</i>`; } else { pad.skyA = null; sk.innerHTML = ''; } } }
  $('#pWind').textContent = 'Wind ' + (st.wd<0?'← ':'→ ') + Math.abs(st.wd||0).toFixed(1);
  const s = $('#pStatus');
  s.classList.toggle('mine', isMine);
  if(st.ph==='over'){
    if(st.rw && st.rw.r && st.rw.r[me]){ const seen = store.get('rwSeen', []); if(!seen.includes(st.rw.g)){ const r = padProf(); pad.lastRw = applyReward(r, st.rw.r[me]); pad.lastRwG = st.rw.g; saveMyProf(r); store.set('rwSeen', [st.rw.g].concat(seen).slice(0,12)); SFX.init(); SFX.play(pad.lastRw.to > pad.lastRw.from ? 'levelup' : 'buy'); buzz([40,30,40]); padRefreshCos(); } }
    s.innerHTML = ''; s.append(document.createTextNode((st.win||'Nobody')+' wins')); const sm=document.createElement('small'); sm.textContent='Rematch starts from the big screen'; s.append(sm);
    if(pad.lastRw && st.rw && pad.lastRwG===st.rw.g) s.insertAdjacentHTML('beforeend', rewardHTML(pad.lastRw)); }
  else if(!mine){ s.textContent = 'Watching'; }
  else if(!mine.al){ s.innerHTML = 'Knocked out<small>Cheer on the others</small>'; }
  else if(isMine){ s.innerHTML = ''; s.append('Your turn · '+st.tm+'s'); const sm=document.createElement('small'); sm.textContent = st.sa ? 'Super armed!' : 'Aim, then hold FIRE'; s.append(sm); }
  else { s.innerHTML=''; s.append((turnP?turnP.n:'Someone')+"'s turn"); const sm=document.createElement('small'); sm.textContent='Get your angle ready'; s.append(sm); }
  if(!pad.chg){ const f=$('#pPw'); if(f) f.style.width='0%'; const pn=$('#pPwN'); if(pn) pn.textContent = mine && mine.lp>=0 ? 'last '+mine.lp : ''; }
  // items
  const box = $('#pItems'); if(!box || !mine) return;
  const key = JSON.stringify([mine.it, st.iu, mine.en, st.sa, isMine]);
  if(key===pad.itemKey) return; pad.itemKey = key; box.innerHTML='';
  mine.it.forEach(([id,left])=>{ const b=document.createElement('div'); b.className='item'+((st.iu||[]).includes(id)&&isMine?' on':'')+(left<=0?' off':''); b.innerHTML = ICON[id]+`<span>${ITEMS[id]?.short||''}</span><em>${left}</em>`; b.onclick=()=>{ if(!isMine||left<=0) return; pad.u++; pad.uid=id; padSend(); buzz(15); }; box.appendChild(b); });
  const sp = document.createElement('div'); sp.className='super'+(mine.en>=100&&!st.sa?' ready':'')+(st.sa&&isMine?' armed':''); sp.style.setProperty('--e', mine.en+'%'); sp.innerHTML = `<span>${st.sa&&isMine?'ARMED':mine.en>=100?'SUPER':'SUPER<br>'+mine.en+'%'}</span>`;
  sp.onclick=()=>{ if(!isMine) return; pad.s++; padSend(); }; box.appendChild(sp);
}


/* ================= LOOP ================= */
let lastT = performance.now(), T = 0;
function loop(now){
  if(document.body.dataset.mode!==mode) document.body.dataset.mode = mode;
  requestAnimationFrame(loop);
  if(mode==='pad') return;
  const dt = Math.min((now - lastT)/1000, .05); lastT = now; T += dt;
  let gdt = dt; if(mode==='play' && Gm){ if(Gm.slow>0){ Gm.slow -= dt; gdt = dt*.3; } updateGame(gdt); }
  else {
    lobbyPlayers.forEach((p,i)=>{ p.angle = 40 + Math.sin(T*.8+i)*20; });
    if(mode==='lobby' && customIdx>=0){ const f = lobbyPlayers.find(p=>p.slot===customIdx); if(f){ cam.tx = f.x + 160; cam.ty = f.y + 90; cam.tvw = 620; } }
    else { cam.tx = W/2 + Math.sin(T*.12)*120; cam.ty = H*.5; cam.tvw = mode==='lobby' ? W*.95 : W*.9; }
  }
  updateParts(gdt); updateCam(dt); renderWorld(T, dt);
}
function titleScene(){ buildTerrain('sunset', 42); lobbyPlayers = [0,1,2,3,4,5].map(i=>{ const s = {look:{...defaultLook(i%4), ch:CHARS[i].id, c1:CHARS[i].col}, ctl:'bot'}; return playerFromSlot(s, i); }); const prev = settings.mode; settings.mode='ffa'; placePlayers(lobbyPlayers); settings.mode = prev; }

/* ----- input ----- */
addEventListener('keydown', e=>{
  if(e.target.tagName==='INPUT') return;
  keys[e.key.length===1 ? e.key.toLowerCase() : e.key] = true;
  if(e.key===' ' || e.key.startsWith('Arrow')){ e.preventDefault(); kbdUsed = true; }
  if(mode==='play' && Gm){ const p = Gm.players[Gm.turn]; if(p && p.ctl==='local'){
    if(['1','2','3'].includes(e.key)){ const it = p.items[+e.key-1]; if(it) useItem(p, it.id); }
    if(e.key==='e'||e.key==='E') toggleSuper(p); if(e.key==='p'||e.key==='P') skipTurn(p); }
    if(/^[4-9]$/.test(e.key)){ const l = localEmotes(); const ix = l[+e.key - 4]; if(ix!=null) emote(localPlayer(), ix); }
    if(e.key==='m'||e.key==='M') toggleView(); if(e.key==='c'||e.key==='C') setChart(!settings.chart); }
});
addEventListener('keyup', e=>{ keys[e.key.length===1 ? e.key.toLowerCase() : e.key] = false; });
addEventListener('blur', ()=>{ for(const k in keys) keys[k]=false; });
$$('#touchpad [data-k]').forEach(b=>{ const k = b.dataset.k;
  b.addEventListener('pointerdown', e=>{ e.preventDefault(); b.setPointerCapture(e.pointerId); touch[k]=true; b.classList.add('down'); });
  const up = ()=>{ touch[k]=false; b.classList.remove('down'); }; b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up); });
$('#tpPass').onclick = ()=>{ const p = Gm && Gm.players[Gm.turn]; if(p && p.ctl==='local') skipTurn(p); };
function localPlayer(){ if(!Gm) return null; const a = Gm.players[Gm.turn]; if(a && a.ctl==='local') return a; return Gm.players.find(q=>q.ctl==='local' && q.alive) || null; }
(()=>{ const d = $('#hud .gauge'); let drag = false;
  const set = e=>{ if(!Gm || Gm.phase!=='aim') return; const p = Gm.players[Gm.turn]; if(!p || p.ctl!=='local') return; const r = d.getBoundingClientRect();
    const px = (e.clientX - r.left)/r.width*200, py = (e.clientY - r.top)/r.height*200; const cx = 100, cy = 100;
    let a = Math.atan2(cy - py, px - cx)*180/Math.PI; if(a < -90) a = 90; else if(a < 0) a = 0; p.angle = clamp(Math.round(a), 0, 90); };
  d.addEventListener('pointerdown', e=>{ drag = true; d.setPointerCapture(e.pointerId); set(e); });
  d.addEventListener('pointermove', e=>{ if(drag) set(e); });
  d.addEventListener('pointerup', ()=>drag=false); d.addEventListener('pointercancel', ()=>drag=false); })();
const emoBar = $('#emoBar');
function localEmotes(){ const lp = localPlayer(); return lp ? emoteList(profFor(lp.name)) : EMOTES.map((t,i)=>i); }
$('#bEmote').onclick = ()=>{ emoBar.innerHTML = ''; localEmotes().forEach(i=>{ const b = document.createElement('button'); b.className = 'btn dark small'; b.textContent = EMOTE_ALL[i]; b.onclick = ()=>{ emote(localPlayer(), i); emoBar.classList.add('hidden'); }; emoBar.appendChild(b); }); emoBar.classList.toggle('hidden'); };
$('#bMusic').onclick = ()=>{ MUSIC.on = !MUSIC.on; store.set('music', MUSIC.on); if(MUSIC.on){ SFX.init(); MUSIC.start(mode==='play' ? settings.map : 'title'); } else MUSIC.stop(); $('#bMusic').classList.toggle('off', !MUSIC.on); toast(MUSIC.on?'Music on':'Music off', 1200); };
$('#bMusic').classList.toggle('off', !MUSIC.on);
$('#bHost').onclick = ()=>{ SFX.init(); openLobby(); };
$('#bPad').onclick = ()=>{ SFX.init(); openPad(); };
$('#bRec').onclick = ()=>openRecords();
$('#bShop').onclick = ()=>{ SFX.init(); MUSIC.start('title'); if(isPhone) openShop({el:$('#shopCard'), prof:padProf(), save:r=>saveMyProf(r), modal:true, hero:pad.look.ch}); else openHostShop(null); };
$('#bFill').onclick = ()=>{ slots.forEach(s=>{ if(s.ctl==='empty') s.ctl = 'bot'; }); saveSlots(); buildLobbyScene(); renderSlots(); SFX.play('ui'); };
$('#bClear').onclick = ()=>{ slots.forEach(s=>{ if(s.ctl==='bot') s.ctl = 'empty'; }); saveSlots(); buildLobbyScene(); renderSlots(); SFX.play('ui'); };
$('#bHelp').onclick = ()=>show('help', true);
$$('[data-close]').forEach(b=>b.onclick=()=>b.closest('.screen').classList.remove('on'));
$('#bBack').onclick = ()=>{ show('lobby', false); show('custom', false); mode='title'; titleScene(); show('title', true); };
$('#bStart').onclick = ()=>{ SFX.init(); goFull(); newGame(); };
// on phones and tablets, battle full screen and sideways where the browser allows it
function goFull(){ if(!TOUCH || document.fullscreenElement || !document.fullscreenEnabled) return; document.documentElement.requestFullscreen({navigationUI:'hide'}).then(()=>screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape')).catch(()=>{}); }
if(!ON_CLAUDE && location.protocol==='https:'){ for(const [rel, href] of [['manifest', 'manifest.webmanifest'], ['apple-touch-icon', 'apple-touch-icon.png'], ['icon', 'icon-192.png']]){ const l = document.createElement('link'); l.rel = rel; l.href = href; document.head.appendChild(l); } }
function syncView(){ const full = settings.view==='full', b = $('#bView'); b.innerHTML = full ? ICO_CLOSE : ICO_WHOLE; b.title = full ? 'Close up, like DDTank (M)' : 'Whole map (M)'; }
function toggleView(){ settings.view = settings.view==='full' ? 'follow' : 'full'; cam.overview = false; store.set('settings', settings); syncView(); }
$('#miniBtn').onclick = toggleView; $('#bView').onclick = toggleView; syncView(); $('#bChart').onclick = ()=>setChart(!settings.chart);
$('#bSound').onclick = ()=>{ if(!SFX.on){ SFX.on = true; } else { SFX.charge(null); SFX.whistle(null); MUSIC.stop(true); SFX.on = false; } store.set('sound', SFX.on); $('#bSound').classList.toggle('off', !SFX.on); toast(SFX.on?'Sound on':'Sound off', 1200); if(SFX.on) MUSIC.start(mode==='play' ? settings.map : 'title'); };
$('#bSound').classList.toggle('off', !SFX.on);
let quitArm = 0;
$('#bQuit').onclick = ()=>{ if(performance.now() - quitArm > 2500){ quitArm = performance.now(); toast('Tap Quit again to leave the battle', 2400); return; } Gm = null; MUSIC.stop(true); SFX.whistle(null); SFX.charge(null); $('#coach').classList.add('hidden'); openLobby(); };

const isPhone = matchMedia('(pointer:coarse)').matches && Math.min(screen.width, screen.height) < 600;
if(isPhone){ $('#bPad').parentNode.prepend($('#bPad')); }
assetsReady.then(()=>{ if(mode==='title') titleScene(); else if(mode==='lobby') buildLobbyScene(); });
requestAnimationFrame(loop);
// scanning the big screen's QR opens the game straight into the controller for that table
const JOIN = (location.hash.match(/join=([A-Za-z]{4})/) || [])[1];
if(JOIN){ addEventListener('pointerdown', ()=>SFX.init(), {once:true}); openPad().then(()=>joinTable(JOIN.toUpperCase())); }
window.__arc = {get G(){return Gm}, phys:{rulerDist, rulerX, landX, forceCharts, SKY_FORCE}, touch, keys, slots, settings, newGame, openLobby, openHostShop, openShop, openCustom, profFor, saveProf, myProf, SKINS, COS, burst, hitBurst, MUSIC, SFX, endGame, renderSlots, buildLobbyScene, get mode(){return mode}, pad:typeof pad!=='undefined'?pad:null, renderPadCustom, renderPadPlay, updatePadPlay, showResults, step(n, dt=1/60){ for(let i=0;i<n && Gm && !Gm.over;i++){ updateGame(dt); updateParts(dt); } }};
