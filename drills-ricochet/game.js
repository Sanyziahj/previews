'use strict';
(function () {
  const TILE = 64;
  const KEY = 'drills-ricochet.v1';
  const TIERS = {
    1: { name: 'Tanks', kind: 'tank', speed: 168, accel: 1500, drag: 0.8, hover: false, bounces: 1, shot: 480, special: 'mine', label: 'MINE' },
    2: { name: 'Helicopters', kind: 'heli', speed: 196, accel: 560, drag: 0.965, hover: true, bounces: 1, shot: 480, special: 'mine', label: 'MINE' },
    3: { name: 'Jets', kind: 'jet', speed: 280, accel: 980, drag: 0.9, hover: true, bounces: 2, shot: 540, special: 'dash', label: 'DASH' },
    4: { name: 'Flying Saucers', kind: 'saucer', speed: 214, accel: 2400, drag: 0.68, hover: true, bounces: 1, shot: 500, special: 'pulse', label: 'PULSE', split: true },
    5: { name: 'Spacecraft', kind: 'ship', speed: 230, accel: 300, drag: 0.993, hover: true, bounces: 3, shot: 520, special: 'emp', label: 'EMP' },
  };
  const FLOOR = {
    1: ['#3e4c34', '#465536'],
    2: ['#274047', '#2f4c54'],
    3: ['#1b2438', '#232c46'],
    4: ['#2c2144', '#362854'],
    5: ['#12192a', '#1a2340'],
  };
  const WALLC = { 1: '#2c261c', 2: '#24343c', 3: '#1a2233', 4: '#2c2144', 5: '#314056' };
  const STAGES = [
    {
      tier: 1, name: 'Drill Yard',
      brief: 'Eyes up, rider. Make the wall do the work.',
      clear: 'Yard is quiet. Treads held.',
      map: [
        '###############',
        '#P............#',
        '#.............#',
        '#.............#',
        '#........#....#',
        '#........#..t.#',
        '#.............#',
        '#..c........p.#',
        '#.............#',
        '#.............#',
        '###############',
      ],
    },
    {
      tier: 1, name: 'Crate Alley',
      brief: 'Crates are cover until they are not.',
      clear: 'Alley cleared. Keep rolling.',
      map: [
        '###############',
        '#P..c.c.c.....#',
        '#.............#',
        '#..c.c.c....t.#',
        '#.............#',
        '#####.........#',
        '#......c.c.c..#',
        '#.............#',
        '#..f........t.#',
        '#.............#',
        '###############',
      ],
    },
    {
      tier: 1, name: 'Mine Garden',
      brief: 'Mines sleep light. So should you.',
      clear: 'Garden is clean. Lift off.',
      map: [
        '###############',
        '#P............#',
        '#..x......x...#',
        '#......t......#',
        '#..x......x...#',
        '#.............#',
        '#.....###.....#',
        '#..p.......p..#',
        '#......x......#',
        '#.............#',
        '###############',
      ],
    },
    {
      tier: 2, name: 'Low Skim',
      brief: 'Skim the low walls. Tall ones still bite.',
      clear: 'Nice drift. Stay above the sandbags.',
      map: [
        '###############',
        '#P............#',
        '#...=..=..=...#',
        '#.............#',
        '#..h.......h..#',
        '#.............#',
        '#..====..====.#',
        '#.............#',
        '#.....t.......#',
        '#.............#',
        '###############',
      ],
    },
    {
      tier: 2, name: 'Sweep Range',
      brief: 'They sweep the lane. You bank the reply.',
      clear: 'Range is clear. Strap in.',
      map: [
        '###############',
        '#P.....=......#',
        '#.............#',
        '#..####.......#',
        '#........h....#',
        '#...=..=..=...#',
        '#........h....#',
        '#..####.......#',
        '#.............#',
        '#......t......#',
        '###############',
      ],
    },
    {
      tier: 3, name: 'Strafe Lane',
      brief: 'Faster strafe. Tighter corners.',
      clear: 'Lane is empty. Bolts bank twice now.',
      map: [
        '###############',
        '#P..#.........#',
        '#...#..j......#',
        '#...#.........#',
        '#...######....#',
        '#.............#',
        '#....######...#',
        '#.............#',
        '#..j........t.#',
        '#.............#',
        '###############',
      ],
    },
    {
      tier: 3, name: 'Bolt Maze',
      brief: 'Two bounces. Plan both of them.',
      clear: 'Maze solved. Saucers are next.',
      map: [
        '###############',
        '#P..#.........#',
        '#...#..#...#..#',
        '#...#..#.#.#..#',
        '#......#.#.#..#',
        '####...#...#..#',
        '#......#...#.j#',
        '#..####.....#.#',
        '#........t....#',
        '#.............#',
        '###############',
      ],
    },
    {
      tier: 4, name: 'Tractor Ring',
      brief: 'Tractors pull. Bumpers send it back.',
      clear: 'Ring is quiet. Split the next one.',
      map: [
        '###############',
        '#P............#',
        '#.....v.......#',
        '#.............#',
        '#..o.......o..#',
        '#......u......#',
        '#..o.......o..#',
        '#.............#',
        '#.......v.....#',
        '#..u..........#',
        '###############',
      ],
    },
    {
      tier: 4, name: 'Split Court',
      brief: 'One bounce, then the shot splits.',
      clear: 'Court adjourned. Gravity is optional.',
      map: [
        '###############',
        '#P............#',
        '#....o...o....#',
        '#.............#',
        '#......s......#',
        '#.............#',
        '#..o.......o..#',
        '#.............#',
        '#..u.......u..#',
        '#.............#',
        '###############',
      ],
    },
    {
      tier: 5, name: 'Mirror Hall',
      brief: 'Mirror walls. Every bank is a gift.',
      clear: 'Hall secured. One vault left.',
      map: [
        '+++++++++++++++',
        '+P............+',
        '+.....+++.....+',
        '+.............+',
        '+..d.......d..+',
        '+.............+',
        '+.....+++.....+',
        '+.............+',
        '+..b..........+',
        '+.............+',
        '+++++++++++++++',
      ],
    },
    {
      tier: 5, name: 'Bank Vault',
      brief: 'Patience. The angle will show itself.',
      clear: 'Vault is open. Silver Force is waiting.',
      map: [
        '+++++++++++++++',
        '+P..+.........+',
        '+...+..d......+',
        '+...+.........+',
        '+...+++++.....+',
        '+.............+',
        '+.....+++++...+',
        '+..d..........+',
        '+........b....+',
        '+.............+',
        '+++++++++++++++',
      ],
    },
    {
      tier: 5, name: 'Overlord',
      brief: 'Silver Force on the scope. Break the core.',
      clear: 'Overlord is stardust. The range is ours.',
      map: [
        '+++++++++++++++',
        '+P............+',
        '+.............+',
        '+..+.......+..+',
        '+.............+',
        '+......O......+',
        '+.............+',
        '+..+.......+..+',
        '+.............+',
        '+.............+',
        '+++++++++++++++',
      ],
    },
  ];

  const view = document.getElementById('view');
  const ctx = view.getContext('2d', { alpha: false });
  const stageEl = document.getElementById('stage');
  const overlay = document.getElementById('overlay');
  const card = document.getElementById('card');
  const hud = document.getElementById('hud');
  const hudTier = document.getElementById('hudTier');
  const hudStage = document.getElementById('hudStage');
  const hudScore = document.getElementById('hudScore');
  const hudBest = document.getElementById('hudBest');
  const hudLives = document.getElementById('hudLives');
  const bossBar = document.getElementById('bossBar');
  const bossFill = bossBar.querySelector('i');
  const btnMute = document.getElementById('btnMute');
  const btnFire = document.getElementById('btnFire');
  const btnSpecial = document.getElementById('btnSpecial');
  const btnPause = document.getElementById('btnPause');
  const stickL = document.getElementById('stickL');
  const stickR = document.getElementById('stickR');
  const knobL = stickL.querySelector('i');
  const knobR = stickR.querySelector('i');

  const params = new URLSearchParams(location.search);
  let manual = false;
  let hoverOverride = null;
  let aimLock = null;
  let debugPad = undefined;

  let save = loadSave();
  let mode = 'title';
  let stageIndex = 0;
  let grid = [];
  let cols = 0;
  let rows = 0;
  let worldW = 960;
  let worldH = 704;
  let crates = [];
  let bumpers = [];
  let tractors = [];
  let mines = [];
  let enemies = [];
  let shots = [];
  let particles = [];
  let rings = [];
  let stars = [];
  let lowWalls = [];
  let player = { x: 120, y: 120, vx: 0, vy: 0, r: 18, aim: 0, body: 0, inv: 2, fireCd: 0, specialCd: 0 };
  let lives = 3;
  let score = 0;
  let clearHold = 0.45;
  let clearedFlag = false;
  let lastKillBounces = 0;
  let simTime = 0;
  let shake = 0;
  let queueFire = false;
  let queueSpecial = false;
  let menu = { kind: 'title', items: [], sel: 0, cols: 1 };
  let camX = 480, camY = 352, camScale = 1, viewW = 960, viewH = 640, dpr = 1;
  const keys = {};
  const touchMove = { x: 0, y: 0, active: false };
  const touchAim = { x: 1, y: 0, active: false, lx: 1, ly: 0 };
  const mouse = { on: false, wx: 200, wy: 200 };
  let padButtons = [];
  let frameDts = [];
  let actx = null, master = null, musicGain = null, musicSrc = null, musicTier = 0;
  const loops = {};

  function loadSave() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { best: 0, unlocked: 1, cleared: {}, mute: false };
      const s = JSON.parse(raw);
      return {
        best: s.best | 0,
        unlocked: Math.max(1, Math.min(STAGES.length, s.unlocked | 0) || 1),
        cleared: s.cleared && typeof s.cleared === 'object' ? s.cleared : {},
        mute: !!s.mute,
      };
    } catch (e) {
      return { best: 0, unlocked: 1, cleared: {}, mute: false };
    }
  }
  function writeSave() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) {}
  }

  function tierNum() { return STAGES[stageIndex].tier; }
  function tierCfg() { return TIERS[tierNum()]; }
  function hoverNow() { return hoverOverride == null ? tierCfg().hover : hoverOverride; }

  function ac() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!actx) {
        actx = new AC();
        master = actx.createGain();
        master.gain.value = save.mute ? 0 : 0.85;
        master.connect(actx.destination);
        musicGain = actx.createGain();
        musicGain.gain.value = 0.2;
        musicGain.connect(master);
      }
      return actx;
    } catch (e) { return null; }
  }
  function unlockAudio() {
    const a = ac();
    if (!a) return;
    if (a.state === 'suspended') a.resume().then(function () { startMusic(tierNum()); }).catch(function () {});
    else startMusic(tierNum());
  }
  function blip(freq, dur, type, gain) {
    const a = ac();
    if (!a || a.state !== 'running' || save.mute) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, a.currentTime);
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
    o.connect(g); g.connect(master);
    o.start();
    o.stop(a.currentTime + dur + 0.02);
  }
  function sfxShoot() { blip(540, 0.07, 'square', 0.06); blip(180, 0.09, 'sawtooth', 0.03); }
  function sfxBounce() { blip(920, 0.04, 'triangle', 0.045); }
  function sfxUi() { blip(660, 0.05, 'square', 0.05); }
  function sfxHurt() { blip(180, 0.16, 'sawtooth', 0.06); blip(90, 0.2, 'square', 0.04); }
  function sfxBoom() {
    const a = ac();
    if (!a || a.state !== 'running' || save.mute) return;
    const dur = 0.16;
    const buf = a.createBuffer(1, Math.floor(a.sampleRate * dur), a.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / d.length, 2);
    const src = a.createBufferSource();
    src.buffer = buf;
    const f = a.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = 900;
    const g = a.createGain();
    g.gain.value = 0.22;
    src.connect(f); f.connect(g); g.connect(master);
    src.start();
  }
  function buildLoop(tier) {
    const a = ac();
    const sr = a.sampleRate;
    const bpm = 100 + tier * 6;
    const step = (60 / bpm) / 4;
    const dur = step * 16;
    const len = Math.floor(sr * dur);
    const buf = a.createBuffer(1, len, sr);
    const data = buf.getChannelData(0);
    const roots = [55, 61.74, 73.42, 82.41, 98];
    const root = roots[tier - 1];
    const bass = [0, 0, 7, 0, 0, 5, 7, 3];
    const lead = [12, 15, 12, 19, 15, 12, 7, 12];
    for (let i = 0; i < len; i++) {
      const t = i / sr;
      const s = Math.floor(t / step) % 16;
      const lt = t - Math.floor(t / step) * step;
      let v = 0;
      if (s % 4 === 0) v += Math.sin(2 * Math.PI * (70 + (1 - lt / step) * 90) * t) * Math.exp(-lt * 22) * 0.45;
      if (s % 2 === 1) v += (Math.random() * 2 - 1) * Math.exp(-lt * 46) * 0.07;
      const bn = root * Math.pow(2, bass[s % 8] / 12);
      v += (Math.sin(2 * Math.PI * bn * t) > 0 ? 1 : -1) * Math.exp(-lt * 7) * 0.11;
      if (s % 2 === 0) {
        const ln = root * 2 * Math.pow(2, lead[(s / 2) % 8] / 12);
        v += Math.sin(2 * Math.PI * ln * t) * Math.exp(-lt * 9) * 0.07;
      }
      data[i] = Math.max(-1, Math.min(1, v));
    }
    return buf;
  }
  function startMusic(tier) {
    try {
      const a = ac();
      if (!a || a.state !== 'running' || save.mute) return;
      if (musicSrc && musicTier === tier) return;
      if (musicSrc) { try { musicSrc.stop(); } catch (e) {} musicSrc = null; }
      if (!loops[tier]) loops[tier] = buildLoop(tier);
      const src = a.createBufferSource();
      src.buffer = loops[tier];
      src.loop = true;
      src.connect(musicGain);
      src.start();
      musicSrc = src;
      musicTier = tier;
    } catch (e) {}
  }
  function setMute(m) {
    save.mute = !!m;
    writeSave();
    if (master) master.gain.value = save.mute ? 0 : 0.85;
    paintMute();
    if (!save.mute) unlockAudio();
  }
  function paintMute() {
    const label = save.mute ? 'SOUND OFF' : 'SOUND ON';
    btnMute.textContent = save.mute ? 'SOUND' : 'MUTE';
    const g = document.getElementById('btnMuteCard');
    if (g) g.textContent = label;
  }

  function tileAt(tx, ty) {
    if (ty < 0 || tx < 0 || ty >= rows || tx >= cols) return '#';
    return grid[ty][tx];
  }
  function circleRect(cx, cy, r, rx, ry, rw, rh) {
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }
  function shotHitsWall(x, y, r, flyer) {
    const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        const t = tileAt(tx, ty);
        if (t !== '#' && t !== '+' && !(t === '=' && !flyer)) continue;
        if (circleRect(x, y, r, tx * TILE, ty * TILE, TILE, TILE)) return true;
      }
    }
    return false;
  }
  function mirrorTouch(x, y, r) {
    const x0 = Math.floor((x - r) / TILE), x1 = Math.floor((x + r) / TILE);
    const y0 = Math.floor((y - r) / TILE), y1 = Math.floor((y + r) / TILE);
    for (let ty = y0; ty <= y1; ty++) {
      for (let tx = x0; tx <= x1; tx++) {
        if (tileAt(tx, ty) === '+' && circleRect(x, y, r, tx * TILE, ty * TILE, TILE, TILE)) return true;
      }
    }
    return false;
  }
  function crateSolid(tx, ty) {
    for (let i = 0; i < crates.length; i++) {
      const c = crates[i];
      if (c.alive && c.tx === tx && c.ty === ty) return true;
    }
    return false;
  }
  function bodyBlocks(tx, ty, flyer) {
    const t = tileAt(tx, ty);
    if (t === '#' || t === '+') return true;
    if (t === '=' && !flyer) return true;
    if (crateSolid(tx, ty)) return true;
    return false;
  }
  function resolveBody(ent, r, flyer) {
    for (let pass = 0; pass < 2; pass++) {
      const x0 = Math.floor((ent.x - r) / TILE), x1 = Math.floor((ent.x + r) / TILE);
      const y0 = Math.floor((ent.y - r) / TILE), y1 = Math.floor((ent.y + r) / TILE);
      for (let ty = y0; ty <= y1; ty++) {
        for (let tx = x0; tx <= x1; tx++) {
          if (!bodyBlocks(tx, ty, flyer)) continue;
          const rx = tx * TILE, ry = ty * TILE;
          let cx = Math.max(rx, Math.min(ent.x, rx + TILE));
          let cy = Math.max(ry, Math.min(ent.y, ry + TILE));
          let dx = ent.x - cx, dy = ent.y - cy;
          const d2 = dx * dx + dy * dy;
          if (d2 >= r * r) continue;
          if (d2 === 0) {
            const left = ent.x - rx, right = rx + TILE - ent.x, top = ent.y - ry, bot = ry + TILE - ent.y;
            const m = Math.min(left, right, top, bot);
            if (m === left) { ent.x = rx - r; ent.vx = Math.min(0, ent.vx); }
            else if (m === right) { ent.x = rx + TILE + r; ent.vx = Math.max(0, ent.vx); }
            else if (m === top) { ent.y = ry - r; ent.vy = Math.min(0, ent.vy); }
            else { ent.y = ry + TILE + r; ent.vy = Math.max(0, ent.vy); }
            continue;
          }
          const d = Math.sqrt(d2);
          const nx = dx / d, ny = dy / d;
          ent.x += nx * (r - d);
          ent.y += ny * (r - d);
          const vn = ent.vx * nx + ent.vy * ny;
          if (vn < 0) { ent.vx -= vn * nx; ent.vy -= vn * ny; }
        }
      }
    }
  }
  function resolveBumpers(ent) {
    for (let i = 0; i < bumpers.length; i++) {
      const b = bumpers[i];
      const dx = ent.x - b.x, dy = ent.y - b.y;
      const d = Math.hypot(dx, dy) || 0.0001;
      const min = b.r + ent.r;
      if (d < min) {
        const nx = dx / d, ny = dy / d;
        ent.x = b.x + nx * min;
        ent.y = b.y + ny * min;
        const vn = ent.vx * nx + ent.vy * ny;
        if (vn < 0) { ent.vx -= 1.35 * vn * nx; ent.vy -= 1.35 * vn * ny; }
      }
    }
  }
  function bumperAt(x, y, r) {
    for (let i = 0; i < bumpers.length; i++) {
      const b = bumpers[i];
      if (Math.hypot(x - b.x, y - b.y) < b.r + r) return b;
    }
    return null;
  }
  function crateAt(x, y, r) {
    for (let i = 0; i < crates.length; i++) {
      const c = crates[i];
      if (!c.alive) continue;
      if (circleRect(x, y, r, c.tx * TILE, c.ty * TILE, TILE, TILE)) return c;
    }
    return null;
  }
  function enemyAt(x, y, r) {
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      if (Math.hypot(e.x - x, e.y - y) < e.r + r) return e;
    }
    return null;
  }
  function mineAt(x, y, r) {
    for (let i = 0; i < mines.length; i++) {
      const m = mines[i];
      if (m.dead) continue;
      if (Math.hypot(m.x - x, m.y - y) < m.r + r) return m;
    }
    return null;
  }

  function burst(x, y, n, speed) {
    const colors = ['#ffd36a', '#7af0ff', '#ff7ad9', '#b8ff7a', '#fff6d0', '#ff9a4a', '#d7b0ff'];
    for (let i = 0; i < n; i++) {
      if (particles.length > 200) particles.shift();
      const a = Math.random() * Math.PI * 2;
      const s = speed * (0.35 + Math.random() * 0.75);
      particles.push({
        x: x, y: y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: 0.75 + Math.random() * 0.4, max: 1.15,
        color: colors[(i + (n % 3)) % colors.length], size: 3.4 + Math.random() * 3.2,
      });
    }
  }
  function addScore(n) {
    score += n;
    if (score > save.best) { save.best = score; writeSave(); }
  }
  function hitCrate(c) {
    if (!c || !c.alive) return;
    c.hp -= 1;
    const x = c.tx * TILE + TILE / 2, y = c.ty * TILE + TILE / 2;
    burst(x, y, 8, 90);
    if (c.hp <= 0) {
      c.alive = false;
      burst(x, y, 16, 140);
      addScore(20);
      sfxBoom();
    }
  }
  function shieldBlocks(e, x, y) {
    if (!e.shield) return false;
    const ang = Math.atan2(y - e.y, x - e.x);
    let d = Math.atan2(Math.sin(ang - e.shieldAngle), Math.cos(ang - e.shieldAngle));
    return Math.abs(d) < e.shieldArc;
  }
  function killEnemy(e, bounced) {
    if (e.dead) return;
    e.dead = true;
    const big = e.kind === 'boss';
    burst(e.x, e.y, big ? 72 : 30, big ? 240 : 150);
    shake = big ? 0.4 : 0.12;
    lastKillBounces = bounced || 0;
    addScore(big ? 2500 + lastKillBounces * 25 : 100 * tierNum() + lastKillBounces * 25);
    sfxBoom();
  }
  function damageEnemy(e, dmg, bounced) {
    if (!e || e.dead || e.ifr > 0) return;
    e.hp -= dmg;
    e.ifr = 0.07;
    e.flash = 0.1;
    burst(e.x, e.y, 6, 70);
    if (e.hp <= 0) killEnemy(e, bounced);
  }
  function hurtPlayer() {
    if (player.inv > 0 || mode !== 'play') return;
    player.inv = 1.35;
    lives -= 1;
    shake = 0.22;
    burst(player.x, player.y, 20, 130);
    sfxHurt();
    if (lives <= 0) {
      mode = 'over';
      showOverlay('over');
    }
  }
  function reflectCircle(s, cx, cy, rad) {
    let dx = s.x - cx, dy = s.y - cy;
    const d = Math.hypot(dx, dy) || 0.001;
    const nx = dx / d, ny = dy / d;
    const vn = s.vx * nx + s.vy * ny;
    if (vn < 0) { s.vx -= 2 * vn * nx; s.vy -= 2 * vn * ny; }
    const sp = Math.hypot(s.vx, s.vy) || 1;
    s.vx = s.vx / sp * s.speed;
    s.vy = s.vy / sp * s.speed;
    s.x = cx + nx * (rad + s.r + 1.5);
    s.y = cy + ny * (rad + s.r + 1.5);
  }
  function noteBounce(s, mirror, simulate) {
    s.bounced += 1;
    s.bounces -= 1;
    s.justBounced = true;
    s.speed *= mirror ? 1 : 0.96;
    const sp = Math.hypot(s.vx, s.vy) || 1;
    s.vx = s.vx / sp * s.speed;
    s.vy = s.vy / sp * s.speed;
    if (!simulate) {
      burst(s.x, s.y, 4, 60);
      sfxBounce();
    }
    if (s.bounces < 0) s.dead = true;
  }
  function stepShot(s, dt, simulate) {
    const sub = 2;
    const hdt = dt / sub;
    for (let n = 0; n < sub; n++) {
      if (s.dead) return;
      const ox = s.x, oy = s.y;
      const nx = s.x + s.vx * hdt;
      const ny = s.y + s.vy * hdt;
      const hitX = shotHitsWall(nx, oy, s.r, s.flyer);
      const hitY = shotHitsWall(ox, ny, s.r, s.flyer);
      if (hitX || hitY) {
        const mirror = mirrorTouch(hitX ? nx : ox, hitY ? ny : oy, s.r + 2);
        if (hitX) s.vx *= -1;
        if (hitY) s.vy *= -1;
        s.x = ox; s.y = oy;
        noteBounce(s, mirror, simulate);
        if (s.dead) return;
        const mag = Math.hypot(s.vx, s.vy) || 1;
        const dirx = s.vx / mag, diry = s.vy / mag;
        for (let k = 0; k < 10 && shotHitsWall(s.x, s.y, s.r, s.flyer); k++) {
          s.x += dirx * 3;
          s.y += diry * 3;
        }
      } else {
        s.x = nx; s.y = ny;
      }
      const bm = bumperAt(s.x, s.y, s.r);
      if (bm) {
        reflectCircle(s, bm.x, bm.y, bm.r);
        noteBounce(s, false, simulate);
        if (s.dead) return;
      }
      const cr = crateAt(s.x, s.y, s.r);
      if (cr) {
        if (!simulate) hitCrate(cr);
        s.dead = true;
        return;
      }
      if (s.owner === 'player') {
        const m = mineAt(s.x, s.y, s.r);
        if (m && m.team !== 'player') {
          if (!simulate) detonate(m, false);
          s.dead = true;
          return;
        }
        const e = enemyAt(s.x, s.y, s.r);
        if (e) {
          if (shieldBlocks(e, s.x, s.y)) {
            reflectCircle(s, e.x, e.y, e.r);
            noteBounce(s, false, simulate);
            if (s.dead) return;
          } else {
            s.hitEnemy = true;
            s.dead = true;
            if (!simulate) damageEnemy(e, 1, s.bounced);
            return;
          }
        }
      } else if (Math.hypot(s.x - player.x, s.y - player.y) < s.r + player.r) {
        if (!simulate) hurtPlayer();
        s.dead = true;
        return;
      }
    }
  }
  function spawnShot(x, y, ang, opt) {
    if (shots.length > 48) shots.shift();
    const speed = opt.speed;
    shots.push({
      x: x, y: y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed,
      speed: speed, r: 6, bounces: opt.bounces, bounced: 0, life: 3.1,
      owner: opt.owner, flyer: !!opt.flyer, color: opt.color, split: !!opt.split,
      dead: false, justBounced: false, hitEnemy: false,
    });
  }
  function splitShot(s) {
    const ang = Math.atan2(s.vy, s.vx);
    for (let k = 0; k < 2; k++) {
      spawnShot(s.x, s.y, ang + (k === 0 ? -0.42 : 0.42), {
        owner: s.owner, bounces: Math.max(0, s.bounces), speed: s.speed,
        flyer: s.flyer, color: s.color, split: false,
      });
    }
  }
  function detonate(m, hurtP) {
    if (!m || m.dead) return;
    m.dead = true;
    burst(m.x, m.y, 34, 190);
    shake = Math.max(shake, 0.16);
    sfxBoom();
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      if (Math.hypot(e.x - m.x, e.y - m.y) < m.blast + e.r) damageEnemy(e, e.kind === 'boss' ? 3 : 2, 0);
    }
    for (let i = 0; i < crates.length; i++) {
      const c = crates[i];
      if (!c.alive) continue;
      const cx = c.tx * TILE + TILE / 2, cy = c.ty * TILE + TILE / 2;
      if (Math.hypot(cx - m.x, cy - m.y) < m.blast) hitCrate(c);
    }
    if (hurtP && Math.hypot(player.x - m.x, player.y - m.y) < m.blast * 0.72) hurtPlayer();
  }
  function placeMine(team, x, y, life) {
    mines.push({ x: x, y: y, r: 12, team: team, arm: team === 'player' ? 0.35 : 0.15, life: life, blast: 72, dead: false });
  }

  function makeEnemy(kind, x, y) {
    const tier = tierNum();
    const e = {
      kind: kind, x: x, y: y, vx: 0, vy: 0, r: 22, hp: 1, maxHp: 1,
      aim: 0, aim0: 0, aim1: 0, heading: Math.random() * Math.PI * 2,
      state: 'idle', timer: stageIndex === 0 ? 4 : 1.35 + (kind.length % 5) * 0.12,
      tele: 0.55, cool: 2.15, flyer: tier >= 2 && kind !== 'turret',
      shotSpeed: 250 + tier * 18, shotBounces: tier >= 3 ? 1 : 0,
      color: '#8d99a6', shotColor: '#ff6d6d',
      shield: false, shieldArc: 1.05, shieldAngle: 0,
      side: (x / TILE | 0) % 2 === 0 ? 1 : -1,
      spin: 0, stun: 0, ifr: 0, flash: 0, dead: false,
      body: 'tank', speed: 90, accel: 420,
    };
    if (kind === 'turret') {
      e.body = 'turret'; e.hp = e.maxHp = 1; e.r = 32; e.flyer = false; e.cool = 2.3; e.color = '#9aa4b0';
      e.shotBounces = tier >= 5 ? 1 : 0;
    } else if (kind === 'patrol') {
      e.body = tier === 1 ? 'tank' : 'tank'; e.hp = e.maxHp = 2; e.speed = 78; e.color = '#c46a45'; e.flyer = false;
    } else if (kind === 'flanker') {
      e.body = 'tank'; e.hp = e.maxHp = 2; e.speed = 112; e.accel = 700; e.color = '#d07a3a'; e.flyer = false;
    } else if (kind === 'chopper') {
      e.body = 'heli'; e.hp = e.maxHp = 2; e.speed = 120; e.accel = 420; e.flyer = true; e.color = '#e0a04a'; e.cool = 1.9; e.tele = 0.7;
    } else if (kind === 'jet') {
      e.body = 'jet'; e.hp = e.maxHp = 2; e.speed = 210; e.flyer = true; e.color = '#e05a5a'; e.cool = 1.55; e.tele = 0.38; e.shotBounces = 0; e.shotSpeed = 420;
    } else if (kind === 'saucer') {
      e.body = 'saucer'; e.hp = e.maxHp = 2; e.speed = 150; e.accel = 1600; e.flyer = true; e.color = '#9a6bff'; e.shotColor = '#d7b0ff'; e.cool = 2.0;
    } else if (kind === 'shield') {
      e.body = 'saucer'; e.hp = e.maxHp = 3; e.r = 24; e.shield = true; e.flyer = true; e.color = '#6ec8ff'; e.cool = 2.6;
    } else if (kind === 'drone') {
      e.body = 'ship'; e.hp = e.maxHp = 2; e.speed = 90; e.accel = 260; e.flyer = true; e.color = '#c5d2e0'; e.shotBounces = 2; e.shotColor = '#b7fff2';
    } else if (kind === 'bank') {
      e.body = tier >= 5 ? 'ship' : 'tank'; e.hp = e.maxHp = 2; e.flyer = tier >= 2; e.shotBounces = Math.max(1, tier >= 5 ? 2 : 1);
      e.color = '#d5deea'; e.cool = 2.5; e.tele = 0.65;
    } else if (kind === 'boss') {
      e.body = 'boss'; e.hp = e.maxHp = 18; e.r = 46; e.speed = 62; e.accel = 180; e.flyer = true;
      e.color = '#e7eef6'; e.shotColor = '#d7c6ff'; e.cool = 1.55; e.tele = 0.7; e.shotBounces = 1; e.shotSpeed = 300;
      e.shield = true; e.shieldArc = 1.15;
    }
    return e;
  }

  function loadLevel(index) {
    stageIndex = Math.max(0, Math.min(STAGES.length - 1, index));
    const def = STAGES[stageIndex];
    rows = def.map.length;
    cols = def.map[0].length;
    worldW = cols * TILE;
    worldH = rows * TILE;
    grid = def.map.map(function (row) { return row.split(''); });
    crates = []; bumpers = []; tractors = []; mines = []; enemies = [];
    shots = []; particles = []; rings = []; stars = []; lowWalls = [];
    clearHold = 0.45;
    clearedFlag = false;
    const letters = { t: 'turret', p: 'patrol', f: 'flanker', b: 'bank', s: 'shield', h: 'chopper', j: 'jet', u: 'saucer', d: 'drone', O: 'boss' };
    let px = TILE * 2, py = TILE * 2;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const ch = grid[y][x];
        const cx = x * TILE + TILE / 2, cy = y * TILE + TILE / 2;
        if (ch === 'P') { px = cx; py = cy; grid[y][x] = '.'; }
        else if (ch === 'c') { crates.push({ tx: x, ty: y, hp: 2, alive: true }); grid[y][x] = '.'; }
        else if (ch === 'o') { bumpers.push({ x: cx, y: cy, r: 18 }); grid[y][x] = '.'; }
        else if (ch === 'v') { tractors.push({ x: cx, y: cy, r: 78 }); grid[y][x] = '.'; }
        else if (ch === 'x') { mines.push({ x: cx, y: cy, r: 12, team: 'enemy', arm: 0.4, life: 99, blast: 64, dead: false }); grid[y][x] = '.'; }
        else if (ch === '=') { lowWalls.push({ x: cx, y: cy }); }
        else if (letters[ch]) {
          enemies.push(makeEnemy(letters[ch], cx, cy));
          grid[y][x] = '.';
        }
      }
    }
    player.x = px; player.y = py; player.vx = 0; player.vy = 0; player.inv = 2;
    player.fireCd = 0; player.aim = 0; player.body = 0;
    let s = (stageIndex + 1) * 104729;
    stars = [];
    for (let i = 0; i < 70; i++) {
      s = (s * 48271) % 2147483647;
      const sx = 8 + (s % (worldW - 16));
      s = (s * 48271) % 2147483647;
      const sy = 8 + (s % (worldH - 16));
      stars.push({ x: sx, y: sy });
    }
    hoverOverride = null;
  }

  function livingEnemies() {
    let n = 0;
    for (let i = 0; i < enemies.length; i++) if (!enemies[i].dead) n++;
    return n;
  }

  function showOverlay(kind) {
    mode = kind;
    menu.kind = kind;
    menu.sel = 0;
    const def = STAGES[stageIndex];
    const tier = TIERS[def.tier];
    let html = '';
    const items = [];
    function btn(label, go, lock, extra) {
      const i = items.length;
      items.push({ go: go, lock: !!lock });
      return '<button type="button" class="menu-btn' + (lock ? ' lock' : '') + '" data-i="' + i + '"' + (extra || '') + '>' + label + '</button>';
    }
    if (kind === 'title') {
      html = '<canvas id="portrait" width="220" height="248"></canvas>'
        + '<h1><span>SPACE RIDERS</span>DRILL\'S RICOCHET</h1>'
        + '<p>Bank the shot. Clear the range.</p>'
        + btn("LET'S RIDE", function () { score = 0; lives = 3; openBrief(0); })
        + btn('STAGE SELECT', function () { showOverlay('stages'); })
        + btn('HOW TO PLAY', function () { showOverlay('how'); })
        + '<button class="ghost" id="btnMuteCard" type="button"></button>';
    } else if (kind === 'how') {
      html = '<h1><span>BRIEFING</span>HOW TO PLAY</h1>'
        + '<p>Move with the left stick, WASD, or the arrows. Aim with the right stick or the mouse. The dashed line shows the bounce. FIRE, Space, or letting go of the aim stick shoots. Your special starts as a MINE, then becomes DASH, PULSE, and EMP. A gamepad works the same way. Clear every rider on the range.</p>'
        + btn('BACK', function () { showOverlay('title'); });
    } else if (kind === 'stages') {
      menu.cols = document.body.classList.contains('land') ? 4 : 3;
      html = '<h1><span>PICK A RANGE</span>STAGE SELECT</h1><div class="stage-grid">';
      for (let i = 0; i < STAGES.length; i++) {
        const locked = i + 1 > save.unlocked;
        const s = STAGES[i];
        html += btn((i + 1) + '<small>' + s.name + '</small>', (function (n) {
          return function () { score = 0; lives = 3; openBrief(n); };
        })(i), locked, ' data-tier="' + s.tier + '"');
      }
      html += '</div>' + btn('BACK', function () { showOverlay(menu.returnTo || 'title'); });
    } else if (kind === 'brief') {
      html = '<h1><span>' + tier.name.toUpperCase() + '</span>' + def.name.toUpperCase() + '</h1>'
        + '<p>' + def.brief + '</p>'
        + btn('ROLL OUT', function () { beginPlay(); });
    } else if (kind === 'clear') {
      const last = stageIndex >= STAGES.length - 1;
      html = '<canvas id="portrait" width="220" height="248"></canvas>'
        + '<h1><span>RANGE CLEAR</span>' + def.name.toUpperCase() + '</h1>'
        + '<p>' + def.clear + '</p>'
        + (last ? '' : '<p>Next range: ' + STAGES[stageIndex + 1].name + '</p>');
      if (last) html += btn('MENU', function () { showOverlay('victory'); });
      else html += btn('NEXT STAGE', function () { openBrief(stageIndex + 1); });
      html += btn('MENU', function () { showOverlay('title'); });
    } else if (kind === 'victory') {
      html = '<canvas id="portrait" width="220" height="248"></canvas>'
        + '<h1><span>DISMISSED</span>RANGE IS OURS</h1>'
        + '<p>Drill Sergeant, standing down. Score ' + score + '.</p>'
        + btn('MENU', function () { showOverlay('title'); });
    } else if (kind === 'pause') {
      html = '<h1><span>HOLD FIRE</span>PAUSED</h1>'
        + '<p>' + def.name + ' · ' + tier.name + '</p>'
        + btn('RESUME', function () { beginPlay(); })
        + btn('RESTART', function () { lives = 3; loadLevel(stageIndex); beginPlay(); })
        + btn('STAGE SELECT', function () { menu.returnTo = 'pause'; showOverlay('stages'); })
        + btn('TITLE', function () { showOverlay('title'); });
    } else if (kind === 'over') {
      html = '<canvas id="portrait" width="220" height="248"></canvas>'
        + '<h1><span>DOWN</span>DUST OFF</h1>'
        + '<p>The range is still hot. Score ' + score + '.</p>'
        + btn('RETRY', function () { lives = 3; loadLevel(stageIndex); beginPlay(); })
        + btn('MENU', function () { showOverlay('title'); });
    }
    menu.items = items;
    card.innerHTML = html;
    overlay.classList.add('show');
    const portrait = document.getElementById('portrait');
    if (portrait) drawPortrait(portrait);
    bindMenu();
    paintSel();
    paintMute();
    syncChrome();
  }
  function hideOverlay() {
    overlay.classList.remove('show');
    card.innerHTML = '';
  }
  function bindMenu() {
    const buttons = card.querySelectorAll('.menu-btn');
    for (let i = 0; i < buttons.length; i++) {
      (function (b, idx) {
        b.addEventListener('pointerover', function () {
          if (b.classList.contains('lock')) return;
          menu.sel = idx;
          paintSel();
        });
        b.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          if (b.classList.contains('lock')) return;
          menu.sel = idx;
          paintSel();
          activate(idx);
        });
      })(buttons[i], i);
    }
    const mute = document.getElementById('btnMuteCard');
    if (mute) mute.addEventListener('pointerdown', function (e) { e.preventDefault(); unlockAudio(); setMute(!save.mute); });
  }
  function paintSel() {
    const buttons = card.querySelectorAll('.menu-btn');
    let seen = false;
    for (let i = 0; i < buttons.length; i++) {
      const on = i === menu.sel && !buttons[i].classList.contains('lock');
      buttons[i].classList.toggle('sel', on);
      if (on) seen = true;
    }
    if (!seen) {
      for (let i = 0; i < buttons.length; i++) {
        if (!buttons[i].classList.contains('lock')) { menu.sel = i; buttons[i].classList.add('sel'); break; }
      }
    }
  }
  function activate(i) {
    const item = menu.items[i];
    if (!item || item.lock) return;
    unlockAudio();
    sfxUi();
    item.go();
  }
  function menuMove(dx, dy) {
    const n = menu.items.length;
    if (!n) return;
    const colsN = menu.kind === 'stages' ? (document.body.classList.contains('land') ? 4 : 3) : 1;
    let i = menu.sel;
    if (colsN <= 1) {
      const step = dy !== 0 ? dy : dx;
      i = (i + step + n * 4) % n;
    } else {
      const back = n - 1;
      if (i === back && dy < 0) i = Math.min(back - 1, 0);
      else if (i === back && dy > 0) i = 0;
      else if (dy > 0 && i + colsN >= back) i = back;
      else {
        const x = i % colsN;
        const y = Math.floor(i / colsN);
        const rowsN = Math.ceil((n - 1) / colsN);
        let nx = (x + dx + colsN) % colsN;
        let ny = (y + dy + rowsN) % rowsN;
        i = ny * colsN + nx;
        if (i >= n - 1) i = n - 2;
      }
    }
    for (let k = 0; k < n; k++) {
      const idx = (i + k) % n;
      if (!menu.items[idx].lock) { menu.sel = idx; break; }
    }
    paintSel();
  }
  function menuConfirm() {
    if (mode === 'play') return;
    activate(menu.sel);
  }
  function menuBack() {
    if (mode === 'pause' || mode === 'how' || mode === 'stages' || mode === 'over' || mode === 'victory' || mode === 'clear') {
      if (mode === 'pause') beginPlay();
      else if (mode === 'how' || mode === 'stages') showOverlay(mode === 'stages' && menu.returnTo === 'pause' ? 'pause' : 'title');
      else if (mode === 'over' || mode === 'victory' || mode === 'clear') showOverlay('title');
    }
  }
  function openBrief(index) {
    loadLevel(index);
    showOverlay('brief');
  }
  function beginPlay() {
    mode = 'play';
    hideOverlay();
    syncChrome();
    startMusic(tierNum());
  }
  function togglePause() {
    if (mode === 'play') showOverlay('pause');
    else if (mode === 'pause') beginPlay();
  }
  function openClear() {
    if (clearedFlag) return;
    clearedFlag = true;
    save.cleared[String(stageIndex + 1)] = true;
    save.unlocked = Math.max(save.unlocked, Math.min(STAGES.length, stageIndex + 2));
    writeSave();
    if (stageIndex >= STAGES.length - 1) showOverlay('victory');
    else showOverlay('clear');
  }

  function tryFire() {
    if (mode !== 'play' || player.fireCd > 0) return;
    const cfg = tierCfg();
    player.fireCd = 0.26;
    const ang = player.aim;
    spawnShot(player.x + Math.cos(ang) * (player.r + 14), player.y + Math.sin(ang) * (player.r + 14), ang, {
      owner: 'player', bounces: cfg.bounces, speed: cfg.shot, flyer: hoverNow(), color: '#ffe08a', split: !!cfg.split,
    });
    burst(player.x + Math.cos(ang) * 20, player.y + Math.sin(ang) * 20, 3, 40);
    sfxShoot();
  }
  function trySpecial() {
    if (mode !== 'play' || player.specialCd > 0) return;
    const cfg = tierCfg();
    if (cfg.special === 'mine') {
      player.specialCd = 3.1;
      placeMine('player', player.x, player.y, 8);
      sfxUi();
    } else if (cfg.special === 'dash') {
      player.specialCd = 2.2;
      const ang = Math.hypot(player.vx, player.vy) > 20 ? Math.atan2(player.vy, player.vx) : player.aim;
      player.vx += Math.cos(ang) * 280;
      player.vy += Math.sin(ang) * 280;
      burst(player.x, player.y, 10, 160);
      sfxShoot();
    } else if (cfg.special === 'pulse') {
      player.specialCd = 3.1;
      rings.push({ x: player.x, y: player.y, r: 20, life: 0.28 });
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (e.dead) continue;
        const d = Math.hypot(e.x - player.x, e.y - player.y);
        if (d < 160 && d > 1) {
          e.vx += (e.x - player.x) / d * 220;
          e.vy += (e.y - player.y) / d * 220;
          e.stun = Math.max(e.stun, 0.25);
        }
      }
      for (let i = shots.length - 1; i >= 0; i--) {
        const s = shots[i];
        if (s.owner !== 'enemy') continue;
        if (Math.hypot(s.x - player.x, s.y - player.y) < 150) {
          reflectCircle(s, player.x, player.y, 10);
          s.owner = 'player';
          s.color = '#ffe08a';
        }
      }
      sfxBoom();
    } else if (cfg.special === 'emp') {
      player.specialCd = 5.4;
      for (let i = 0; i < enemies.length; i++) {
        const e = enemies[i];
        if (!e.dead) e.stun = Math.max(e.stun, e.kind === 'boss' ? 0.85 : 1.7);
      }
      shots = shots.filter(function (s) { return s.owner !== 'enemy'; });
      rings.push({ x: player.x, y: player.y, r: 16, life: 0.35 });
      burst(player.x, player.y, 18, 200);
      sfxBoom();
    }
  }

  function shootEnemy(e, ang) {
    spawnShot(e.x + Math.cos(ang) * (e.r + 8), e.y + Math.sin(ang) * (e.r + 8), ang, {
      owner: 'enemy', bounces: e.shotBounces, speed: e.shotSpeed, flyer: e.flyer,
      color: e.shotColor, split: e.kind === 'saucer',
    });
  }
  function hasLOS(x0, y0, x1, y1, flyer) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(dist / 16));
    for (let i = 1; i < steps; i++) {
      const x = x0 + (x1 - x0) * (i / steps);
      const y = y0 + (y1 - y0) * (i / steps);
      if (shotHitsWall(x, y, 4, flyer)) return false;
    }
    return true;
  }
  function simulateAngle(x, y, ang, bounces, flyer, speed, owner) {
    const s = {
      x: x, y: y, vx: Math.cos(ang) * speed, vy: Math.sin(ang) * speed, speed: speed,
      r: 6, bounces: bounces, bounced: 0, owner: owner, flyer: flyer, split: false,
      dead: false, justBounced: false, hitEnemy: false, color: '#fff',
    };
    let minAfter = 1e9;
    for (let i = 0; i < 240 && !s.dead; i++) {
      stepShot(s, 1 / 60, true);
      if (s.bounced > 0) {
        for (let k = 0; k < enemies.length; k++) {
          const e = enemies[k];
          if (e.dead) continue;
          minAfter = Math.min(minAfter, Math.hypot(e.x - s.x, e.y - s.y) - e.r);
        }
      }
      if (s.hitEnemy) break;
    }
    return { hit: !!s.hitEnemy, bounced: s.bounced, minAfter: minAfter };
  }
  function chooseBank(e) {
    let best = null, bestD = 28;
    const bounces = Math.max(1, e.shotBounces);
    for (let i = 0; i < 36; i++) {
      const ang = -Math.PI + (i / 36) * Math.PI * 2;
      const sim = simulateAngle(e.x, e.y, ang, bounces, e.flyer, e.shotSpeed, 'enemy');
      if (sim.bounced >= 1 && sim.minAfter < bestD) { bestD = sim.minAfter; best = ang; }
    }
    if (best != null && bestD < 22) return best;
    if (hasLOS(e.x, e.y, player.x, player.y, e.flyer)) return Math.atan2(player.y - e.y, player.x - e.x);
    return best;
  }
  function steer(e, tx, ty, dt) {
    const dx = tx - e.x, dy = ty - e.y;
    const d = Math.hypot(dx, dy) || 1;
    e.vx += (dx / d) * e.accel * dt;
    e.vy += (dy / d) * e.accel * dt;
    const drag = Math.pow(0.9, dt * 60);
    e.vx *= drag; e.vy *= drag;
    const sp = Math.hypot(e.vx, e.vy);
    if (sp > e.speed) { e.vx = e.vx / sp * e.speed; e.vy = e.vy / sp * e.speed; }
    e.x += e.vx * dt; e.y += e.vy * dt;
    resolveBody(e, e.r, e.flyer);
    resolveBumpers(e);
    if (sp > 8) e.heading = Math.atan2(e.vy, e.vx);
  }
  function beginTele(e, ang) {
    if (ang == null || !Number.isFinite(ang)) { e.timer = 0.4; return; }
    e.state = 'tele';
    e.timer = e.tele;
    e.aim = ang;
    e.aim0 = ang;
    e.aim1 = ang;
  }
  function updateEnemy(e, dt) {
    if (e.dead) return;
    e.spin += dt * 8;
    e.ifr = Math.max(0, e.ifr - dt);
    e.flash = Math.max(0, e.flash - dt);
    if (e.stun > 0) {
      e.stun -= dt;
      e.vx *= 0.9; e.vy *= 0.9;
      e.x += e.vx * dt; e.y += e.vy * dt;
      resolveBody(e, e.r, e.flyer);
      return;
    }
    if (e.kind === 'boss') {
      const phase = e.hp / e.maxHp > 0.66 ? 1 : e.hp / e.maxHp > 0.33 ? 2 : 3;
      e.shield = phase === 1;
      e.shieldAngle += dt * (phase === 1 ? 0.7 : 0);
      const tx = (cols * TILE) / 2 + Math.cos(simTime * 0.45) * 70;
      const ty = (rows * TILE) / 2 + Math.sin(simTime * 0.33) * 36;
      steer(e, tx, ty, dt);
      if (phase >= 2 && Math.floor(simTime * 2) !== Math.floor((simTime - dt) * 2) && (simTime % 4) < dt + 0.02 && mines.length < 5) {
        placeMine('enemy', e.x + 60, e.y, 6);
      }
    } else if (e.kind === 'turret' || e.kind === 'bank' || e.kind === 'shield') {
      e.heading = Math.atan2(player.y - e.y, player.x - e.x);
      if (e.kind === 'shield') {
        e.shield = e.state !== 'tele';
        e.shieldAngle = e.heading;
      }
    } else if (e.kind === 'patrol') {
      const ox = e.x, oy = e.y;
      e.vx = Math.cos(e.heading) * e.speed;
      e.vy = Math.sin(e.heading) * e.speed;
      e.x += e.vx * dt; e.y += e.vy * dt;
      resolveBody(e, e.r, e.flyer);
      if (Math.hypot(e.x - ox, e.y - oy) < e.speed * dt * 0.35) e.heading += Math.PI / 2;
    } else if (e.kind === 'flanker') {
      const dx = player.x - e.x, dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      steer(e, player.x + (-dy / d) * e.side * 110, player.y + (dx / d) * e.side * 110, dt);
    } else if (e.kind === 'chopper') {
      const ang = simTime * 0.7 + e.side;
      steer(e, player.x + Math.cos(ang) * 150, player.y + Math.sin(ang) * 110, dt);
    } else if (e.kind === 'jet') {
      const ox = e.x, oy = e.y;
      e.vx = Math.cos(e.heading) * e.speed;
      e.vy = Math.sin(e.heading) * e.speed;
      e.x += e.vx * dt; e.y += e.vy * dt;
      resolveBody(e, e.r, true);
      if (Math.hypot(e.x - ox, e.y - oy) < e.speed * dt * 0.4) e.heading += Math.PI * 0.85;
    } else if (e.kind === 'saucer' || e.kind === 'drone') {
      const dx = player.x - e.x, dy = player.y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const side = e.kind === 'saucer' ? e.side : 0.2;
      steer(e, player.x + (-dy / d) * side * 90, player.y + (dx / d) * side * 90, dt);
    }

    if (e.state === 'tele') {
      if (e.kind === 'chopper') {
        const k = 1 - Math.max(0, e.timer) / e.tele;
        e.aim = e.aim0 + (e.aim1 - e.aim0) * k;
      }
      e.timer -= dt;
      if (e.timer <= 0) {
        if (e.kind === 'boss') {
          const phase = e.hp / e.maxHp > 0.66 ? 1 : e.hp / e.maxHp > 0.33 ? 2 : 3;
          const n = phase === 1 ? 1 : phase === 2 ? 3 : 5;
          const spread = phase === 1 ? 0 : 0.28;
          for (let i = 0; i < n; i++) shootEnemy(e, e.aim + (i - (n - 1) / 2) * spread);
        } else shootEnemy(e, e.aim);
        e.state = 'idle';
        e.timer = e.cool;
      }
      return;
    }
    e.timer -= dt;
    if (e.timer > 0) return;
    let ang = null;
    if (e.kind === 'chopper') {
      const base = Math.atan2(player.y - e.y, player.x - e.x);
      e.aim0 = base - 0.65;
      e.aim1 = base + 0.45;
      e.aim = e.aim0;
      e.state = 'tele';
      e.timer = e.tele;
      return;
    } else if (e.kind === 'bank' || (e.kind === 'drone' && tierNum() >= 5)) {
      ang = chooseBank(e);
    } else if (e.kind === 'jet') {
      const dot = Math.cos(e.heading) * (player.x - e.x) + Math.sin(e.heading) * (player.y - e.y);
      if (dot > 0 && Math.hypot(player.x - e.x, player.y - e.y) < 420) ang = e.heading;
      else e.timer = 0.35;
    } else if (e.kind === 'patrol') {
      if (Math.hypot(player.x - e.x, player.y - e.y) < 380) ang = e.heading;
      else e.timer = 0.4;
    } else {
      ang = Math.atan2(player.y - e.y, player.x - e.x);
    }
    if (ang == null) return;
    beginTele(e, ang);
  }

  function currentMove() {
    if (touchMove.active) return norm(touchMove.x, touchMove.y);
    const pad = readPad();
    if (pad && Math.hypot(pad.lx, pad.ly) > 0.28) return norm(pad.lx, pad.ly);
    let x = 0, y = 0;
    if (keys.KeyA || keys.ArrowLeft) x -= 1;
    if (keys.KeyD || keys.ArrowRight) x += 1;
    if (keys.KeyW || keys.ArrowUp) y -= 1;
    if (keys.KeyS || keys.ArrowDown) y += 1;
    return norm(x, y);
  }
  function norm(x, y) {
    const d = Math.hypot(x, y);
    if (d < 0.001) return { x: 0, y: 0 };
    if (d > 1) return { x: x / d, y: y / d };
    return { x: x, y: y };
  }
  function readPad() {
    let pad = null;
    if (debugPad !== undefined) pad = debugPad;
    else if (navigator.getGamepads) {
      const list = navigator.getGamepads();
      if (list) for (let i = 0; i < list.length; i++) if (list[i]) { pad = list[i]; break; }
    }
    return pad ? {
      lx: pad.axes[0] || 0, ly: pad.axes[1] || 0, rx: pad.axes[2] || 0, ry: pad.axes[3] || 0,
      buttons: pad.buttons || [],
    } : null;
  }
  function applyAim() {
    if (aimLock != null) { player.aim = aimLock; return; }
    if (touchAim.active) { player.aim = Math.atan2(touchAim.y, touchAim.x); return; }
    const pad = readPad();
    if (pad && Math.hypot(pad.rx, pad.ry) > 0.35) { player.aim = Math.atan2(pad.ry, pad.rx); return; }
    if (!touchOn() && mouse.on) { player.aim = Math.atan2(mouse.wy - player.y, mouse.wx - player.x); return; }
    if (touchAim.lx || touchAim.ly) player.aim = Math.atan2(touchAim.ly, touchAim.lx);
  }
  function pollEdges() {
    const pad = readPad();
    const now = [];
    for (let i = 0; i < 16; i++) now[i] = !!(pad && pad.buttons[i] && pad.buttons[i].pressed);
    function rose(i) { return now[i] && !padButtons[i]; }
    if (rose(0) || rose(7)) {
      if (mode === 'play') queueFire = true;
      else menuConfirm();
    }
    if (rose(1) || rose(6)) {
      if (mode === 'play') queueSpecial = true;
      else menuBack();
    }
    if (rose(9)) togglePause();
    if (mode !== 'play') {
      if (rose(12)) menuMove(0, -1);
      if (rose(13)) menuMove(0, 1);
      if (rose(14)) menuMove(-1, 0);
      if (rose(15)) menuMove(1, 0);
    }
    padButtons = now;
  }

  function update(dt) {
    simTime += dt;
    pollEdges();
    if (mode !== 'play') {
      shake = Math.max(0, shake - dt);
      return;
    }
    const cfg = tierCfg();
    const mv = currentMove();
    player.vx += mv.x * cfg.accel * dt;
    player.vy += mv.y * cfg.accel * dt;
    const drag = Math.pow(cfg.drag, dt * 60);
    player.vx *= drag;
    player.vy *= drag;
    let sp = Math.hypot(player.vx, player.vy);
    const cap = cfg.special === 'dash' ? cfg.speed * 1.7 : cfg.speed;
    if (sp > cap) { player.vx = player.vx / sp * cap; player.vy = player.vy / sp * cap; }
    for (let i = 0; i < tractors.length; i++) {
      const tr = tractors[i];
      const dx = tr.x - player.x, dy = tr.y - player.y;
      const d = Math.hypot(dx, dy);
      if (d < tr.r && d > 6) {
        player.vx += (dx / d) * 140 * (1 - d / tr.r) * dt * 60;
        player.vy += (dy / d) * 140 * (1 - d / tr.r) * dt * 60;
      }
    }
    player.x += player.vx * dt;
    player.y += player.vy * dt;
    resolveBody(player, player.r, hoverNow());
    resolveBumpers(player);
    if (sp > 30) player.body += Math.atan2(Math.sin(Math.atan2(player.vy, player.vx) - player.body), Math.cos(Math.atan2(player.vy, player.vx) - player.body)) * Math.min(1, dt * 10);
    applyAim();
    player.inv = Math.max(0, player.inv - dt);
    player.fireCd = Math.max(0, player.fireCd - dt);
    player.specialCd = Math.max(0, player.specialCd - dt);
    if (queueFire || keys.Space) tryFire();
    queueFire = false;
    if (queueSpecial) { queueSpecial = false; trySpecial(); }
    if ((keys.ShiftLeft || keys.ShiftRight || keys.KeyE) && player.specialCd <= 0 && !queueSpecial) {
      /* edge comes from keydown */
    }

    for (let i = enemies.length - 1; i >= 0; i--) updateEnemy(enemies[i], dt);
    for (let i = 0; i < enemies.length; i++) {
      const e = enemies[i];
      if (e.dead) continue;
      if (Math.hypot(e.x - player.x, e.y - player.y) < e.r + player.r - 2) hurtPlayer();
    }

    for (let i = shots.length - 1; i >= 0; i--) {
      const s = shots[i];
      s.life -= dt;
      s.justBounced = false;
      if (s.life <= 0) { shots.splice(i, 1); continue; }
      stepShot(s, dt, false);
      if (s.justBounced && s.split) { s.split = false; splitShot(s); }
      if (s.dead) shots.splice(i, 1);
    }
    for (let i = mines.length - 1; i >= 0; i--) {
      const m = mines[i];
      if (m.dead) { mines.splice(i, 1); continue; }
      m.arm -= dt; m.life -= dt;
      if (m.life <= 0) { detonate(m, m.team !== 'player'); mines.splice(i, 1); continue; }
      if (m.arm <= 0) {
        let boom = false;
        if (m.team === 'player') {
          for (let k = 0; k < enemies.length; k++) {
            const e = enemies[k];
            if (!e.dead && Math.hypot(e.x - m.x, e.y - m.y) < e.r + 16) boom = true;
          }
        } else if (Math.hypot(player.x - m.x, player.y - m.y) < player.r + 14) boom = true;
        if (boom) { detonate(m, m.team !== 'player'); mines.splice(i, 1); }
      }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt; p.y += p.vy * dt;
      p.vx *= 0.98; p.vy *= 0.98;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = rings.length - 1; i >= 0; i--) {
      rings[i].life -= dt;
      rings[i].r += dt * 380;
      if (rings[i].life <= 0) rings.splice(i, 1);
    }
    shake = Math.max(0, shake - dt);
    if (!clearedFlag && enemies.length && livingEnemies() === 0) {
      clearHold -= dt;
      if (clearHold <= 0) openClear();
    } else clearHold = 0.45;
    syncChrome();
  }

  function syncChrome() {
    document.body.dataset.mode = mode;
    const playing = mode === 'play' || mode === 'pause';
    hud.hidden = !playing;
    const def = STAGES[stageIndex];
    const tier = TIERS[def.tier];
    hudTier.textContent = tier.name.toUpperCase();
    hudStage.textContent = (stageIndex + 1) + ' · ' + def.name;
    hudScore.textContent = String(score);
    hudBest.textContent = 'BEST ' + save.best;
    btnSpecial.textContent = tier.label;
    btnSpecial.style.opacity = player.specialCd > 0 ? '0.45' : '1';
    let pip = '';
    for (let i = 0; i < 3; i++) pip += '<i class="' + (i < lives ? '' : 'off') + '"></i>';
    hudLives.innerHTML = pip;
    let boss = null;
    for (let i = 0; i < enemies.length; i++) if (!enemies[i].dead && enemies[i].kind === 'boss') boss = enemies[i];
    bossBar.hidden = !boss || !playing;
    if (boss) bossFill.style.width = Math.max(0, boss.hp / boss.maxHp * 100) + '%';
  }

  function roundRect(c, x, y, w, h, r) {
    const rr = Math.max(0, Math.min(r, w / 2, h / 2));
    c.beginPath();
    c.moveTo(x + rr, y);
    c.arcTo(x + w, y, x + w, y + h, rr);
    c.arcTo(x + w, y + h, x, y + h, rr);
    c.arcTo(x, y + h, x, y, rr);
    c.arcTo(x, y, x + w, y, rr);
    c.closePath();
  }
  function drawDrillHead(c, x, y, s) {
    c.fillStyle = '#ff7a18';
    c.beginPath(); c.arc(x, y, s, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ff5fa2';
    c.beginPath(); c.ellipse(x - s * 0.46, y + s * 0.12, s * 0.24, s * 0.16, 0, 0, 7); c.fill();
    c.beginPath(); c.ellipse(x + s * 0.46, y + s * 0.12, s * 0.24, s * 0.16, 0, 0, 7); c.fill();
    c.fillStyle = '#1a1a1a';
    roundRect(c, x - s * 0.55, y - s * 0.32, s * 0.36, s * 0.26, s * 0.06); c.fill();
    roundRect(c, x + s * 0.18, y - s * 0.32, s * 0.36, s * 0.26, s * 0.06); c.fill();
    c.fillStyle = '#f4f7f8';
    roundRect(c, x - s * 0.34, y + s * 0.28, s * 0.68, s * 0.26, s * 0.06); c.fill();
    c.fillStyle = '#1a1a1a';
    c.fillRect(x - s * 0.08, y + s * 0.28, s * 0.06, s * 0.26);
    c.fillRect(x + s * 0.1, y + s * 0.28, s * 0.05, s * 0.26);
    c.fillStyle = '#5c3b22';
    c.beginPath(); c.ellipse(x, y - s * 0.78, s * 1.2, s * 0.28, 0, 0, 7); c.fill();
    c.fillStyle = '#6b4528';
    c.beginPath(); c.ellipse(x, y - s * 1.02, s * 0.62, s * 0.42, 0, 0, 7); c.fill();
    c.fillStyle = '#3a2818';
    c.beginPath(); c.arc(x - s * 0.28, y - s * 1.05, s * 0.12, 0, 7); c.fill();
    c.fillRect(x - s * 0.62, y - s * 0.86, s * 1.24, s * 0.16);
    c.fillStyle = '#e6ebf2';
    roundRect(c, x + s * 0.08, y - s * 1.04, s * 0.46, s * 0.34, s * 0.05); c.fill();
    if (s > 24) {
      c.fillStyle = '#1b1b1b';
      c.font = '700 ' + Math.max(8, Math.round(s * 0.26)) + 'px Trebuchet MS, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('SR', x + s * 0.31, y - s * 0.86);
    } else {
      c.fillStyle = '#222';
      c.beginPath();
      c.moveTo(x + s * 0.2, y - s * 0.98);
      c.lineTo(x + s * 0.2, y - s * 0.78);
      c.lineTo(x + s * 0.38, y - s * 0.88);
      c.fill();
    }
  }
  function drawPortrait(canvas) {
    const c = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    c.clearRect(0, 0, w, h);
    const x = w / 2, y = h * 0.4, s = w * 0.26;
    c.fillStyle = '#148f8a';
    roundRect(c, x - s * 1.25, y + s * 0.45, s * 2.5, s * 1.35, s * 0.28); c.fill();
    c.fillStyle = '#2a2e32';
    c.fillRect(x - s * 0.9, y + s * 0.62, s * 0.16, s * 0.85);
    c.fillRect(x + s * 0.74, y + s * 0.62, s * 0.16, s * 0.85);
    c.fillStyle = '#0f6e6a';
    roundRect(c, x - s * 0.72, y + s * 0.42, s * 1.44, s * 0.5, s * 0.18); c.fill();
    c.fillStyle = '#ff4fa8';
    c.beginPath(); c.arc(x, y + s * 1.45, s * 0.14, 0, 7); c.fill();
    c.fillStyle = '#ffd0ea';
    c.beginPath(); c.arc(x - s * 0.03, y + s * 1.4, s * 0.05, 0, 7); c.fill();
    c.fillStyle = '#1c1c1c';
    c.beginPath(); c.arc(x - s * 1.05, y + s * 1.15, s * 0.22, 0, 7); c.fill();
    c.beginPath(); c.arc(x + s * 1.05, y + s * 1.15, s * 0.22, 0, 7); c.fill();
    drawDrillHead(c, x, y, s);
  }
  function strokeW() { return 2.4 / Math.max(0.25, camScale) / 1.38; }
  function drawTank(c, e, friendly) {
    const hull = friendly ? '#12c8b0' : (e.color || '#c46a45');
    const trim = friendly ? '#ffe08a' : '#2c241c';
    c.save();
    c.rotate(e.heading || e.body || 0);
    c.fillStyle = '#14181c';
    roundRect(c, -26, -18, 52, 11, 3); c.fill();
    roundRect(c, -26, 7, 52, 11, 3); c.fill();
    c.fillStyle = friendly ? '#08332e' : '#3a2418';
    for (let i = -18; i <= 18; i += 8) {
      c.fillRect(i, -16, 3, 7);
      c.fillRect(i, 9, 3, 7);
    }
    c.fillStyle = hull;
    roundRect(c, -18, -13, 36, 26, 5); c.fill();
    c.strokeStyle = trim;
    c.lineWidth = strokeW();
    c.stroke();
    c.restore();
    c.save();
    c.rotate(e.aim || e.heading || 0);
    c.fillStyle = friendly ? '#0c7f72' : '#3d342c';
    c.beginPath(); c.arc(0, 0, 9, 0, Math.PI * 2); c.fill();
    c.strokeStyle = trim;
    c.lineWidth = strokeW();
    c.stroke();
    c.fillStyle = '#1a1e22';
    roundRect(c, 7, -2.8, 20, 5.6, 2); c.fill();
    c.fillStyle = trim;
    c.fillRect(25, -2.2, 4, 4.4);
    c.restore();
  }
  function drawTurret(c, e) {
    c.fillStyle = '#3a424a';
    c.beginPath(); c.arc(0, 0, 26, 0, 7); c.fill();
    c.fillStyle = e.color;
    c.beginPath(); c.arc(0, 0, 16, 0, 7); c.fill();
    c.save();
    c.rotate(e.aim || e.heading || 0);
    c.fillStyle = '#222';
    c.fillRect(4, -3, 18, 6);
    c.restore();
  }
  function drawHeli(c, e, friendly) {
    const body = friendly ? '#12c8b0' : e.color;
    const trim = friendly ? '#ffe08a' : '#2a241c';
    c.save();
    c.rotate(e.heading || 0);
    c.fillStyle = body;
    roundRect(c, -30, -3, 18, 6, 2); c.fill();
    c.beginPath();
    c.moveTo(-28, -3); c.lineTo(-36, -12); c.lineTo(-22, -3); c.fill();
    roundRect(c, -8, -10, 30, 20, 7); c.fill();
    c.strokeStyle = trim;
    c.lineWidth = strokeW();
    c.stroke();
    c.fillStyle = friendly ? '#e7fff6' : 'rgba(255,255,255,.4)';
    roundRect(c, 4, -5, 12, 10, 3); c.fill();
    c.strokeStyle = '#14181c';
    c.lineWidth = strokeW();
    c.beginPath();
    c.moveTo(-4, -13); c.lineTo(14, -13);
    c.moveTo(-4, 13); c.lineTo(14, 13);
    c.stroke();
    c.restore();
    c.save();
    c.rotate(e.spin || 0);
    c.strokeStyle = friendly ? '#ffe08a' : 'rgba(255,255,255,.85)';
    c.lineWidth = strokeW();
    c.beginPath();
    c.moveTo(-24, 0); c.lineTo(24, 0);
    c.moveTo(0, -24); c.lineTo(0, 24);
    c.stroke();
    c.restore();
    c.save();
    c.rotate(e.aim || e.heading || 0);
    c.fillStyle = '#1a1e22';
    c.fillRect(12, -2.2, 14, 4.4);
    c.fillStyle = trim;
    c.fillRect(24, -2, 4, 4);
    c.restore();
  }
  function drawJet(c, e, friendly) {
    const body = friendly ? '#12c8b0' : e.color;
    const trim = friendly ? '#ffe08a' : '#3a2020';
    c.save();
    c.rotate(e.heading || e.aim || 0);
    c.fillStyle = friendly ? '#0c8f82' : body;
    c.beginPath();
    c.moveTo(6, 0); c.lineTo(-6, -20); c.lineTo(0, -7); c.lineTo(-10, 0); c.lineTo(0, 7); c.lineTo(-6, 20); c.closePath();
    c.fill();
    c.fillStyle = body;
    c.beginPath();
    c.moveTo(24, 0); c.lineTo(-14, -7); c.lineTo(-10, 0); c.lineTo(-14, 7); c.closePath();
    c.fill();
    c.strokeStyle = trim;
    c.lineWidth = strokeW();
    c.stroke();
    c.fillStyle = friendly ? '#e7fff6' : 'rgba(255,255,255,.45)';
    c.beginPath(); c.ellipse(6, 0, 5.5, 3.2, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#ffb15a';
    c.fillRect(-18, -5.5, 8, 3.2);
    c.fillRect(-18, 2.3, 8, 3.2);
    c.fillStyle = '#fff6d0';
    c.fillRect(-20, -4.6, 3, 1.6);
    c.fillRect(-20, 3.1, 3, 1.6);
    c.fillStyle = '#1a1e22';
    c.fillRect(20, -1.6, 8, 3.2);
    c.restore();
  }
  function drawSaucer(c, e, friendly) {
    const disc = friendly ? '#12c8b0' : e.color;
    const trim = friendly ? '#ffe08a' : '#efe6ff';
    c.fillStyle = 'rgba(0,0,0,.28)';
    c.beginPath(); c.ellipse(0, 7, 20, 7, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = disc;
    c.beginPath(); c.ellipse(0, 0, 22, 12, 0, 0, Math.PI * 2); c.fill();
    c.strokeStyle = trim;
    c.lineWidth = strokeW();
    c.stroke();
    c.fillStyle = friendly ? '#bffff4' : '#efe6ff';
    c.beginPath(); c.ellipse(0, -1, 8, 5.5, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = 'rgba(255,255,255,.8)';
    c.beginPath(); c.ellipse(-2, -2, 2.6, 1.6, 0, 0, Math.PI * 2); c.fill();
    for (let i = 0; i < 6; i++) {
      const a = (e.spin || 0) + i * (Math.PI / 3);
      c.fillStyle = i % 2 ? trim : '#ffffff';
      c.beginPath(); c.arc(Math.cos(a) * 16, Math.sin(a) * 8, 2.1, 0, Math.PI * 2); c.fill();
    }
    c.save();
    c.rotate(e.aim || 0);
    c.fillStyle = '#1a1e22';
    c.fillRect(14, -2, 12, 4);
    c.fillStyle = trim;
    c.beginPath(); c.arc(26, 0, 2.5, 0, Math.PI * 2); c.fill();
    c.restore();
  }
  function drawShip(c, e, friendly) {
    const body = friendly ? '#7ee8ff' : (e.color || '#c5d2e0');
    const trim = friendly ? '#ffe08a' : '#5a6a78';
    c.save();
    c.rotate(e.heading || 0);
    c.fillStyle = friendly ? '#1490c4' : '#8aa0b4';
    c.beginPath();
    c.moveTo(2, 0); c.lineTo(-10, -18); c.lineTo(-2, -6); c.lineTo(-16, 0); c.lineTo(-2, 6); c.lineTo(-10, 18); c.closePath();
    c.fill();
    c.fillStyle = body;
    c.beginPath();
    c.moveTo(24, 0); c.lineTo(-6, -8); c.lineTo(-14, 0); c.lineTo(-6, 8); c.closePath();
    c.fill();
    c.strokeStyle = trim;
    c.lineWidth = strokeW();
    c.stroke();
    c.fillStyle = friendly ? '#e7fff6' : '#e4eef6';
    c.beginPath(); c.ellipse(6, 0, 5, 3, 0, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#7af0ff';
    c.fillRect(-20, -3.2, 8, 6.4);
    c.fillStyle = '#ffffff';
    c.fillRect(-22, -1.6, 4, 3.2);
    c.restore();
    c.save();
    c.rotate(e.aim || e.heading || 0);
    c.fillStyle = '#1a2228';
    c.fillRect(8, -6.2, 16, 3);
    c.fillRect(8, 3.2, 16, 3);
    c.fillStyle = trim;
    c.fillRect(22, -6.2, 4, 3);
    c.fillRect(22, 3.2, 4, 3);
    c.restore();
  }
  function drawBoss(c, e) {
    c.fillStyle = '#9aa8b8';
    roundRect(c, -40, -28, 80, 56, 10); c.fill();
    c.fillStyle = '#dfe7f0';
    roundRect(c, -24, -16, 48, 32, 8); c.fill();
    c.fillStyle = '#6d4dff';
    c.beginPath(); c.arc(6, 0, 8 + Math.sin(simTime * 6) * 1.5, 0, 7); c.fill();
    c.fillStyle = '#ff9af0';
    c.beginPath(); c.arc(6, 0, 3.5, 0, 7); c.fill();
    c.fillStyle = '#2a3340';
    c.fillRect(18, -4, 16, 8);
    c.fillRect(-46, -16, 10, 8);
    c.fillRect(-46, 8, 10, 8);
  }
  function drawActor(c, e, friendly) {
    c.save();
    c.translate(e.x, e.y);
    c.scale(1.38, 1.38);
    if (e.flash > 0) c.globalAlpha = 0.55;
    const body = friendly ? tierCfg().kind : e.body;
    if (body === 'turret') drawTurret(c, e);
    else if (body === 'heli' || body === 'chopper') drawHeli(c, e, friendly);
    else if (body === 'jet') drawJet(c, e, friendly);
    else if (body === 'saucer') drawSaucer(c, e, friendly);
    else if (body === 'ship' || body === 'drone') drawShip(c, e, friendly);
    else if (body === 'boss') drawBoss(c, e);
    else drawTank(c, e, friendly);
    c.restore();
    if (e.shield) {
      c.strokeStyle = 'rgba(130, 230, 255, .9)';
    c.lineWidth = 3 / camScale;
    c.beginPath();
    c.arc(e.x, e.y, e.r + 8, e.shieldAngle - e.shieldArc, e.shieldAngle + e.shieldArc);
    c.stroke();
  }
  if (e.state === 'tele') {
    c.save();
    c.strokeStyle = 'rgba(255, 96, 72, .95)';
    c.lineWidth = 2.6 / camScale;
    c.setLineDash([8 / camScale, 6 / camScale]);
      c.beginPath();
      c.moveTo(e.x, e.y);
      c.lineTo(e.x + Math.cos(e.aim) * 78, e.y + Math.sin(e.aim) * 78);
      c.stroke();
      c.setLineDash([]);
      c.fillStyle = 'rgba(255, 190, 80, .85)';
      c.beginPath();
      c.arc(e.x + Math.cos(e.aim) * (e.r + 4), e.y + Math.sin(e.aim) * (e.r + 4), 5, 0, 7);
      c.fill();
      c.restore();
    }
  }
  function drawMap(c) {
    const tier = tierNum();
    const pair = FLOOR[tier];
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const t = grid[y][x];
        const px = x * TILE, py = y * TILE;
        if (t === '#' || t === '+') {
          c.fillStyle = t === '+' ? '#b7c6d6' : WALLC[tier];
          c.fillRect(px, py, TILE, TILE);
          c.strokeStyle = t === '+' ? 'rgba(255,255,255,.85)' : 'rgba(0,0,0,.55)';
          c.lineWidth = 2.2 / camScale;
          c.strokeRect(px + c.lineWidth / 2, py + c.lineWidth / 2, TILE - c.lineWidth, TILE - c.lineWidth);
          c.fillStyle = t === '+' ? 'rgba(255,255,255,.55)' : 'rgba(255,255,255,.14)';
          c.fillRect(px, py, TILE, Math.max(5, 3 / camScale));
          if (t === '+') {
            c.strokeStyle = 'rgba(255,255,255,.85)';
            c.lineWidth = 2.2 / camScale;
            c.strokeRect(px + 8, py + 8, TILE - 16, TILE - 16);
          }
        } else {
          c.fillStyle = (x + y) % 2 === 0 ? pair[0] : pair[1];
          c.fillRect(px, py, TILE, TILE);
          if (t === '=') {
            c.fillStyle = '#6a4e2e';
            c.fillRect(px + 4, py + 16, TILE - 8, 32);
            c.fillStyle = '#e2c07a';
            c.fillRect(px + 4, py + 16, TILE - 8, Math.max(6, 3 / camScale));
          }
        }
      }
    }
    if (tier === 5) {
      c.fillStyle = 'rgba(255,255,255,.7)';
      for (let i = 0; i < stars.length; i++) c.fillRect(stars[i].x, stars[i].y, 2, 2);
    }
  }
  function previewPts() {
    const cfg = tierCfg();
    const ang = player.aim;
    let x = player.x + Math.cos(ang) * (player.r + 12);
    let y = player.y + Math.sin(ang) * (player.r + 12);
    let vx = Math.cos(ang), vy = Math.sin(ang);
    const pts = [{ x: x, y: y }];
    let remain = 240;
    let bouncesLeft = cfg.bounces;
    for (let i = 0; i < 90 && remain > 0; i++) {
      const step = 8;
      const nx = x + vx * step, ny = y + vy * step;
      const hitX = shotHitsWall(nx, y, 6, hoverNow());
      const hitY = shotHitsWall(x, ny, 6, hoverNow());
      const bm = bumperAt(nx, ny, 6);
      if (hitX || hitY || bm) {
        pts.push({ x: x, y: y });
        if (bm) {
          const dx = x - bm.x, dy = y - bm.y, d = Math.hypot(dx, dy) || 1;
          const nxn = dx / d, nyn = dy / d;
          const vn = vx * nxn + vy * nyn;
          vx -= 2 * vn * nxn; vy -= 2 * vn * nyn;
        } else {
          if (hitX) vx *= -1;
          if (hitY) vy *= -1;
        }
        const m = Math.hypot(vx, vy) || 1;
        vx /= m; vy /= m;
        bouncesLeft -= 1;
        remain = bouncesLeft >= 0 ? 100 : 0;
        if (bouncesLeft < 0) break;
        continue;
      }
      x = nx; y = ny;
      remain -= step;
    }
    pts.push({ x: x, y: y });
    return pts;
  }

  function render() {
    const r = stageEl.getBoundingClientRect();
    viewW = Math.max(2, r.width);
    viewH = Math.max(2, r.height);
    dpr = Math.min(1.25, window.devicePixelRatio || 1);
    const bw = Math.max(2, Math.round(viewW * dpr));
    const bh = Math.max(2, Math.round(viewH * dpr));
    if (view.width !== bw || view.height !== bh) { view.width = bw; view.height = bh; }
    const margin = Math.min(14, Math.max(4, Math.floor(Math.min(viewW, viewH) * 0.03)));
    const fit = Math.min((viewW - margin * 2) / worldW, (viewH - margin * 2) / worldH);
    camScale = fit;
    camX = worldW / 2;
    camY = worldH / 2;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = tierNum() === 5 ? '#070b14' : '#12181e';
    ctx.fillRect(0, 0, viewW, viewH);
    ctx.save();
    const sx = shake ? (Math.random() - 0.5) * shake * 10 : 0;
    const sy = shake ? (Math.random() - 0.5) * shake * 10 : 0;
    ctx.translate(viewW / 2 + sx, viewH / 2 + sy);
    ctx.scale(camScale, camScale);
    ctx.translate(-camX, -camY);
    drawMap(ctx);
    for (let i = 0; i < tractors.length; i++) {
      const tr = tractors[i];
      ctx.strokeStyle = 'rgba(196, 130, 255, .55)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(tr.x, tr.y, 26 + (tr.r - 26) * (0.55 + 0.45 * (0.5 + 0.5 * Math.sin(simTime * 3 + i))), 0, 7);
      ctx.stroke();
    }
    for (let i = 0; i < bumpers.length; i++) {
      const b = bumpers[i];
      ctx.fillStyle = '#f0c14a';
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r, 0, 7); ctx.fill();
      ctx.strokeStyle = '#fff4c8';
      ctx.lineWidth = 2.4 / camScale;
      ctx.stroke();
    }
    for (let i = 0; i < crates.length; i++) {
      const cr = crates[i];
      if (!cr.alive) continue;
      const x = cr.tx * TILE + 8, y = cr.ty * TILE + 8;
      ctx.fillStyle = '#c4843c';
      roundRect(ctx, x, y, TILE - 16, TILE - 16, 4); ctx.fill();
      ctx.strokeStyle = '#4a2c10';
      ctx.lineWidth = Math.max(3, 2.2 / camScale);
      ctx.beginPath();
      ctx.moveTo(x + 4, y + 4); ctx.lineTo(x + TILE - 20, y + TILE - 20);
      ctx.moveTo(x + TILE - 20, y + 4); ctx.lineTo(x + 4, y + TILE - 20);
      ctx.stroke();
    }
    for (let i = 0; i < mines.length; i++) {
      const m = mines[i];
      if (m.dead) continue;
      ctx.fillStyle = '#2a3138';
      ctx.beginPath(); ctx.arc(m.x, m.y, 11, 0, 7); ctx.fill();
      ctx.fillStyle = m.team === 'player' ? '#7af0ff' : (Math.sin(simTime * 10) > 0 ? '#ffb15a' : '#ff6a4a');
      ctx.beginPath(); ctx.arc(m.x, m.y, 4, 0, 7); ctx.fill();
    }
    for (let i = 0; i < shots.length; i++) {
      const s = shots[i];
      ctx.fillStyle = s.color;
      ctx.beginPath(); ctx.arc(s.x, s.y, Math.max(s.owner === 'player' ? 5 : 4, 4 / camScale), 0, 7); ctx.fill();
    }
    for (let i = 0; i < enemies.length; i++) if (!enemies[i].dead) drawActor(ctx, enemies[i], false);
    const aim = mode === 'title' ? (performance.now() / 1000) * 0.7 : player.aim;
    if (player.inv > 0) ctx.globalAlpha = 0.72 + 0.28 * Math.abs(Math.sin(simTime * 9));
    drawActor(ctx, { x: player.x, y: player.y, heading: player.body, aim: aim, body: tierCfg().kind, color: '#14b89a', r: player.r, spin: simTime * 8, shield: false, state: 'idle' }, true);
    ctx.globalAlpha = 1;
    if (player.inv > 0 && (mode === 'play' || mode === 'pause')) {
      ctx.strokeStyle = '#ffe7a0';
      ctx.lineWidth = 2.4 / camScale;
      ctx.beginPath();
      ctx.arc(player.x, player.y, player.r + 10, 0, Math.PI * 2);
      ctx.stroke();
    }
    if (mode === 'play' || mode === 'pause' || mode === 'brief' || mode === 'title') {
      const pts = previewPts();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2.4 / camScale;
      ctx.setLineDash([8 / camScale, 6 / camScale]);
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.setLineDash([]);
      if (pts.length > 2) {
        const b = pts[1];
        ctx.fillStyle = 'rgba(255, 224, 138, .9)';
        ctx.beginPath(); ctx.arc(b.x, b.y, Math.max(3.5, 3.2 / camScale), 0, 7); ctx.fill();
      }
    }
    for (let i = 0; i < rings.length; i++) {
      ctx.strokeStyle = 'rgba(140, 240, 255, ' + Math.max(0, rings[i].life * 2) + ')';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(rings[i].x, rings[i].y, rings[i].r, 0, 7); ctx.stroke();
    }
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color;
      const ps = Math.max(p.size, 3.4 / camScale);
      ctx.fillRect(p.x, p.y, ps, ps);
    }
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  function touchOn() { return document.body.classList.contains('touch'); }
  function layoutMode() {
    const forced = params.get('touch');
    let touch = false;
    if (forced === '1') touch = true;
    else if (forced === '0') touch = false;
    else {
      const small = Math.min(innerWidth, innerHeight) <= 520 || (innerWidth <= 900 && innerHeight <= 520);
      const coarse = matchMedia('(pointer: coarse)').matches;
      touch = coarse || small;
    }
    document.body.classList.toggle('touch', touch);
    document.body.classList.toggle('land', touch && innerWidth > innerHeight);
    if (menu.kind === 'stages' && overlay.classList.contains('show')) {
      /* keep current menu; columns read live */
    }
  }
  function stickVec(el, cx, cy) {
    const r = el.getBoundingClientRect();
    const ox = r.left + r.width / 2, oy = r.top + r.height / 2;
    let dx = cx - ox, dy = cy - oy;
    const max = r.width * 0.22;
    const len = Math.hypot(dx, dy);
    if (len > max && len > 0) { dx = dx / len * max; dy = dy / len * max; }
    return { x: dx / max, y: dy / max, px: dx, py: dy, len: len };
  }
  function placeKnob(knob, px, py) {
    knob.style.transform = 'translate(calc(-50% + ' + px + 'px), calc(-50% + ' + py + 'px))';
  }
  function bindStick(el, knob, kind) {
    let id = null;
    let moved = 0;
    function down(e) {
      if (id != null) return;
      id = e.pointerId;
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      moved = 0;
      move(e);
      e.preventDefault();
    }
    function move(e) {
      if (e.pointerId !== id) return;
      const v = stickVec(el, e.clientX, e.clientY);
      moved = Math.max(moved, v.len);
      placeKnob(knob, v.px, v.py);
      if (kind === 'move') {
        touchMove.x = v.x; touchMove.y = v.y; touchMove.active = true;
      } else if (Math.hypot(v.x, v.y) > 0.18) {
        touchAim.x = v.x; touchAim.y = v.y; touchAim.lx = v.x; touchAim.ly = v.y; touchAim.active = true;
      }
    }
    function up(e) {
      if (e.pointerId !== id) return;
      const v = stickVec(el, e.clientX, e.clientY);
      id = null;
      placeKnob(knob, 0, 0);
      if (kind === 'move') { touchMove.active = false; touchMove.x = 0; touchMove.y = 0; }
      else {
        touchAim.active = false;
        if (Math.hypot(v.x, v.y) > 0.2) { touchAim.lx = v.x; touchAim.ly = v.y; }
        queueFire = true;
      }
    }
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
  }

  function findKillAngle() {
    const cfg = tierCfg();
    let best = null, bestScore = 1e9;
    for (let i = 0; i < 180; i++) {
      const ang = -Math.PI + (i / 180) * Math.PI * 2;
      const x = player.x + Math.cos(ang) * (player.r + 14);
      const y = player.y + Math.sin(ang) * (player.r + 14);
      const sim = simulateAngle(x, y, ang, cfg.bounces, hoverNow(), cfg.shot, 'player');
      if (sim.hit && sim.bounced >= 1) return ang;
      if (sim.minAfter < bestScore) { bestScore = sim.minAfter; best = ang; }
    }
    if (best == null) return 0;
    for (let d = -6; d <= 6; d += 0.35) {
      const ang = best + d * Math.PI / 180;
      const x = player.x + Math.cos(ang) * (player.r + 14);
      const y = player.y + Math.sin(ang) * (player.r + 14);
      const sim = simulateAngle(x, y, ang, cfg.bounces, hoverNow(), cfg.shot, 'player');
      if (sim.hit && sim.bounced >= 1) return ang;
    }
    return best;
  }

  function boxOf(el) {
    if (!el) return { x: 0, y: 0, w: 0, h: 0, visible: false };
    const r = el.getBoundingClientRect();
    const s = getComputedStyle(el);
    const visible = s.display !== 'none' && s.visibility !== 'hidden' && r.width > 2 && r.height > 2;
    return { x: r.left, y: r.top, w: r.width, h: r.height, visible: visible };
  }

  window.addEventListener('keydown', function (e) {
    const menuish = mode !== 'play';
    if (e.code === 'Space' || e.code === 'Enter' || e.code === 'ArrowUp' || e.code === 'ArrowDown' || e.code === 'ArrowLeft' || e.code === 'ArrowRight') e.preventDefault();
    if (e.repeat) { keys[e.code] = true; return; }
    keys[e.code] = true;
    unlockAudio();
    if (menuish) {
      if (e.code === 'ArrowUp' || e.code === 'KeyW') menuMove(0, -1);
      else if (e.code === 'ArrowDown' || e.code === 'KeyS') menuMove(0, 1);
      else if (e.code === 'ArrowLeft' || e.code === 'KeyA') menuMove(-1, 0);
      else if (e.code === 'ArrowRight' || e.code === 'KeyD') menuMove(1, 0);
      else if (e.code === 'Enter' || e.code === 'Space') menuConfirm();
      else if (e.code === 'Escape' || e.code === 'KeyP') menuBack();
    } else {
      if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
      if (e.code === 'Space') queueFire = true;
      if (e.code === 'KeyE' || e.code === 'ShiftLeft' || e.code === 'ShiftRight') queueSpecial = true;
    }
  });
  window.addEventListener('keyup', function (e) { keys[e.code] = false; });
  window.addEventListener('contextmenu', function (e) { e.preventDefault(); });
  view.addEventListener('pointerdown', function (e) {
    if (touchOn() || mode !== 'play' || e.button !== 0) return;
    const rect = view.getBoundingClientRect();
    mouse.wx = (e.clientX - rect.left) / rect.width * viewW;
    mouse.wy = (e.clientY - rect.top) / rect.height * viewH;
    mouse.wx = (mouse.wx - viewW / 2) / camScale + camX;
    mouse.wy = (mouse.wy - viewH / 2) / camScale + camY;
    mouse.on = true;
    queueFire = true;
  });
  view.addEventListener('pointermove', function (e) {
    if (touchOn()) return;
    const rect = view.getBoundingClientRect();
    const sx = (e.clientX - rect.left) / rect.width * viewW;
    const sy = (e.clientY - rect.top) / rect.height * viewH;
    mouse.wx = (sx - viewW / 2) / camScale + camX;
    mouse.wy = (sy - viewH / 2) / camScale + camY;
    mouse.on = true;
  });
  btnFire.addEventListener('pointerdown', function (e) { e.preventDefault(); unlockAudio(); queueFire = true; });
  btnSpecial.addEventListener('pointerdown', function (e) { e.preventDefault(); unlockAudio(); queueSpecial = true; });
  btnPause.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    unlockAudio();
    if (mode === 'play') togglePause();
    else menuBack();
  });
  btnMute.addEventListener('pointerdown', function (e) { e.preventDefault(); unlockAudio(); setMute(!save.mute); });
  bindStick(stickL, knobL, 'move');
  bindStick(stickR, knobR, 'aim');
  window.addEventListener('resize', function () { layoutMode(); if (menu.kind === 'stages' && overlay.classList.contains('show')) showOverlay('stages'); });
  window.addEventListener('gamepadconnected', function () {});

  for (let i = 0; i < STAGES.length; i++) {
    const w = STAGES[i].map[0].length;
    for (let r = 0; r < STAGES[i].map.length; r++) {
      if (STAGES[i].map[r].length !== w) throw new Error('ragged map ' + STAGES[i].name);
    }
    if (STAGES[i].map.join('').indexOf('P') < 0) throw new Error('no spawn ' + STAGES[i].name);
  }

  layoutMode();
  loadLevel(0);
  showOverlay('title');
  paintMute();

  let lastFrame = 0;
  let acc = 0;
  function onFrame(t) {
    if (lastFrame) {
      frameDts.push(t - lastFrame);
      if (frameDts.length > 180) frameDts.shift();
    }
    const dt = lastFrame ? Math.min(0.05, (t - lastFrame) / 1000) : 0;
    lastFrame = t;
    if (!manual) {
      acc += dt;
      let guard = 0;
      while (acc >= 1 / 60 && guard++ < 3) { update(1 / 60); acc -= 1 / 60; }
    }
    render();
    requestAnimationFrame(onFrame);
  }
  requestAnimationFrame(onFrame);

  window.__RICOCHET__ = {
    KEY: KEY,
    ready: true,
    setManual: function (v) { manual = !!v; if (manual) acc = 0; },
    step: function (n) { for (let i = 0; i < (n | 0); i++) update(1 / 60); render(); },
    press: function (name, down) {
      const map = { up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', fire: 'Space', special: 'KeyE', pause: 'KeyP' };
      const code = map[name];
      if (!code) return;
      const was = !!keys[code];
      keys[code] = !!down;
      if (down && !was) {
        if (name === 'fire') queueFire = true;
        if (name === 'special') queueSpecial = true;
        if (name === 'pause') togglePause();
      }
    },
    setMove: function (x, y) { touchMove.x = x; touchMove.y = y; touchMove.active = Math.hypot(x, y) > 0.05; },
    setAimAngle: function (a) { aimLock = a; player.aim = a; },
    clearAim: function () { aimLock = null; },
    fire: function () { queueFire = true; },
    special: function () { queueSpecial = true; },
    confirm: function () { menuConfirm(); },
    startStage: function (n) {
      if (lives <= 0) lives = 3;
      loadLevel((n | 0) - 1);
      mode = 'play';
      hideOverlay();
      syncChrome();
    },
    teleport: function (x, y) { player.x = x; player.y = y; player.vx = 0; player.vy = 0; },
    setHover: function (v) { hoverOverride = v; },
    showResult: function (kind) {
      if (kind === 'clear') openClear();
      else showOverlay('over');
    },
    wipeEnemies: function () {
      for (let i = 0; i < enemies.length; i++) if (!enemies[i].dead) killEnemy(enemies[i], 1);
    },
    findKillAngle: findKillAngle,
    setPad: function (p) { debugPad = p; padButtons = []; },
    resetFrames: function () { frameDts = []; lastFrame = 0; },
    frameP95: function () {
      if (!frameDts.length) return 0;
      const s = frameDts.slice().sort(function (a, b) { return a - b; });
      return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
    },
    getSave: function () { return JSON.parse(JSON.stringify(save)); },
    highlight: function () {
      const sel = card.querySelector('.menu-btn.sel');
      const other = card.querySelector('.menu-btn:not(.sel)');
      function info(el) {
        if (!el) return null;
        const st = getComputedStyle(el);
        const m = new DOMMatrixReadOnly(st.transform);
        return { text: (el.innerText || '').trim(), opacity: parseFloat(st.opacity), scale: m.a };
      }
      const s = info(sel), o = info(other);
      return { sel: s && s.text, other: o && o.text, selOpacity: s && s.opacity, otherOpacity: o && o.opacity, selScale: s && s.scale, mode: mode };
    },
    visibility: function () {
      render();
      const canvas = view.getBoundingClientRect();
      function pt(x, y) {
        return {
          x: canvas.left + (x - camX) * camScale + viewW / 2,
          y: canvas.top + (y - camY) * camScale + viewH / 2,
        };
      }
      const foes = [];
      for (let i = 0; i < enemies.length; i++) {
        if (!enemies[i].dead) foes.push(pt(enemies[i].x, enemies[i].y));
      }
      return {
        canvas: { x: canvas.left, y: canvas.top, w: canvas.width, h: canvas.height },
        corners: [pt(0, 0), pt(worldW, 0), pt(0, worldH), pt(worldW, worldH)],
        walls: [
          pt(worldW / 2, TILE / 2),
          pt(worldW / 2, worldH - TILE / 2),
          pt(TILE / 2, worldH / 2),
          pt(worldW - TILE / 2, worldH / 2),
        ],
        player: pt(player.x, player.y),
        enemies: foes,
        scale: camScale,
      };
    },
    layout: function () {
      return {
        canvas: boxOf(view), stage: boxOf(stageEl), hud: boxOf(hud),
        overlay: boxOf(overlay.classList.contains('show') ? overlay : null),
        stickL: boxOf(stickL), stickR: boxOf(stickR),
        fire: boxOf(btnFire), special: boxOf(btnSpecial), pause: boxOf(btnPause),
        gutterL: boxOf(document.getElementById('gutterL')),
        gutterR: boxOf(document.getElementById('gutterR')),
        vw: innerWidth, vh: innerHeight, touch: touchOn(), land: document.body.classList.contains('land'),
        mode: mode,
      };
    },
    state: function () {
      const shotsLive = [];
      for (let i = 0; i < shots.length; i++) shotsLive.push({ x: shots[i].x, y: shots[i].y, bounced: shots[i].bounced, owner: shots[i].owner });
      const foe = [];
      for (let i = 0; i < enemies.length; i++) if (!enemies[i].dead) foe.push({ x: enemies[i].x, y: enemies[i].y, kind: enemies[i].kind, hp: enemies[i].hp });
      return {
        mode: mode, stage: stageIndex + 1, stageName: STAGES[stageIndex].name,
        tier: tierNum(), tierName: tierCfg().name, hover: hoverNow(), bounces: tierCfg().bounces,
        split: !!tierCfg().split, special: tierCfg().special,
        x: player.x, y: player.y, vx: player.vx, vy: player.vy, aim: player.aim,
        enemies: foe.length, enemyPos: foe, shots: shots.length, liveShots: shotsLive,
        particles: particles.length, score: score, best: save.best, lives: lives,
        lastKillBounces: lastKillBounces, lowWalls: lowWalls.slice(0, 12),
      };
    },
  };
})();
