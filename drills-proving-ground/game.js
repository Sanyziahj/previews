/* Drill Sergeant: Proving Ground — self-contained third-person range. */
(function () {
  'use strict';

  const DEG = Math.PI / 180;
  const KEY = 'drills-proving-ground.v1';
  const FOV = { hip: 52 * DEG, rifle: 16 * DEG, stealth: 20 * DEG, laser: 18 * DEG, heavy: 30 * DEG };
  const COOL = { rifle: 0.34, stealth: 0.14, laser: 0.08, heavy: 0.8 };
  const SPEED = { rifle: 220, stealth: 200, heavy: 78 };
  const DROP = { rifle: 1, stealth: 0.32, laser: 0, heavy: 0.22 };
  const WIND = { rifle: 1, stealth: 0.35, laser: 0, heavy: 0.15 };

  const COL = {
    head: [1.0, 0.45, 0.08],
    cheek: [1.0, 0.48, 0.64],
    eye: [0.06, 0.05, 0.05],
    white: [0.96, 0.97, 0.95],
    mouth: [0.15, 0.05, 0.06],
    hat: [0.38, 0.22, 0.12],
    band: [0.16, 0.1, 0.07],
    badge: [0.9, 0.93, 0.96],
    suit: [0.06, 0.66, 0.62],
    suitD: [0.04, 0.4, 0.42],
    strap: [0.12, 0.13, 0.14],
    glove: [0.08, 0.08, 0.09],
    boot: [0.09, 0.09, 0.11],
    bootT: [0.08, 0.48, 0.5],
    glow: [1.0, 0.28, 0.72],
    tank: [0.22, 0.28, 0.3],
    gun: [0.14, 0.15, 0.17],
    wood: [0.45, 0.28, 0.14],
    steel: [0.62, 0.66, 0.7],
    cyan: [0.35, 0.95, 1.0],
    orange: [1.0, 0.5, 0.12],
  };

  const ZONES = {
    classic: {
      name: 'CLASSIC TARGET RANGE',
      skyTop: [0.36, 0.62, 0.86], skyHor: [0.9, 0.78, 0.58],
      fog: [0.78, 0.74, 0.66], fogNear: 26, fogFar: 78,
      groundA: [0.46, 0.4, 0.33], groundB: [0.4, 0.35, 0.29],
      berm: [0.34, 0.3, 0.26], wood: [0.5, 0.34, 0.2], metal: [0.55, 0.58, 0.62],
      lane: [0.72, 0.66, 0.5],
    },
    stealth: {
      name: 'STEALTH DRONE YARD',
      skyTop: [0.03, 0.05, 0.1], skyHor: [0.1, 0.14, 0.24],
      fog: [0.07, 0.09, 0.14], fogNear: 16, fogFar: 48,
      groundA: [0.13, 0.15, 0.18], groundB: [0.1, 0.12, 0.15],
      berm: [0.09, 0.11, 0.13], wood: [0.24, 0.18, 0.14], metal: [0.28, 0.36, 0.4],
      lane: [0.16, 0.22, 0.26],
    },
    heavy: {
      name: 'HEAVY ARMORED PROVING GROUND',
      skyTop: [0.4, 0.24, 0.28], skyHor: [0.74, 0.46, 0.3],
      fog: [0.52, 0.38, 0.3], fogNear: 20, fogFar: 64,
      groundA: [0.36, 0.28, 0.24], groundB: [0.3, 0.24, 0.2],
      berm: [0.26, 0.22, 0.2], wood: [0.38, 0.26, 0.18], metal: [0.5, 0.4, 0.34],
      lane: [0.62, 0.4, 0.18],
    },
  };

  const COURSES = [
    { id: 'lane', zone: 'classic', name: 'Bullseye Lane', info: 'Drop every dummy. Head rings score more.', time: 80, par: 42, wind: [0.35, 0.05], spawn: [0, 3], yaw: 0, bounds: { minX: -7, maxX: 7, minZ: 0, maxZ: 40 },
      targets: [
        { k: 'dummy', x: -3.1, z: 13 }, { k: 'dummy', x: 2.2, z: 16 }, { k: 'dummy', x: -0.4, z: 20 },
        { k: 'dummy', x: 3.0, z: 24 }, { k: 'dummy', x: -2.2, z: 28 }, { k: 'dummy', x: 0.5, z: 33 },
      ] },
    { id: 'spin', zone: 'classic', name: 'Spinner Row', info: 'Plates spin and sleds slide. Time the shot.', time: 80, par: 48, wind: [-0.8, 0.6], spawn: [0, 3], yaw: 0, bounds: { minX: -8, maxX: 8, minZ: 0, maxZ: 38 },
      targets: [
        { k: 'spinner', x: -2.8, z: 14, spin: 1.3 }, { k: 'spinner', x: 2.4, z: 18, spin: -1.7 },
        { k: 'slider', x: 0, z: 22, amp: 3.1, slide: 0.85 }, { k: 'dummy', x: -1.2, z: 16, pop: 1.3, phase: 0.4 },
        { k: 'spinner', x: 0.2, z: 27, spin: 1.1 }, { k: 'slider', x: 0.4, z: 32, amp: 2.4, slide: 1.15 },
      ] },
    { id: 'wind', zone: 'classic', name: 'Crosswind Reach', info: 'Long plates in a hard crosswind. Trust the scope.', time: 90, par: 55, wind: [6.2, 0.3], spawn: [0, 2], yaw: 0, bounds: { minX: -8, maxX: 8, minZ: -1, maxZ: 70 },
      targets: [
        { k: 'dummy', x: -1.6, z: 30 }, { k: 'dummy', x: 2.8, z: 38 }, { k: 'dummy', x: -2.4, z: 46 },
        { k: 'spinner', x: 1.2, z: 54, spin: 0.7 }, { k: 'dummy', x: 0, z: 62 },
      ] },
    { id: 'yard', zone: 'stealth', name: 'Lamp Yard', info: 'Four drones. Stay out of the cones.', time: 100, par: 62, wind: [0.2, -0.3], spawn: [0, 3], yaw: 0, stealth: true, maxAlerts: 3, bounds: { minX: -12, maxX: 12, minZ: -1, maxZ: 36 },
      cover: [[-3.2, 15, 1.1, 0.8], [3.4, 20, 1.2, 0.8], [0, 26, 1.6, 0.7]],
      targets: [
        { k: 'drone', x: -4, z: 12, path: [[-4, 12], [-4, 20], [2, 20], [2, 12]] },
        { k: 'drone', x: 5, z: 16, path: [[5, 16], [5, 8], [-1, 8], [-1, 16]] },
        { k: 'drone', x: -6, z: 26, path: [[-6, 26], [6, 26]] },
        { k: 'drone', x: 0, z: 31, path: [[-5, 31], [5, 31]] },
      ] },
    { id: 'crates', zone: 'stealth', name: 'Crate Shadows', info: 'Drones watch the dummies. A decoy pulls eyes.', time: 110, par: 70, wind: [0.6, 0.4], spawn: [-5, 4], yaw: 0.35, stealth: true, maxAlerts: 3, bounds: { minX: -13, maxX: 13, minZ: -1, maxZ: 40 },
      cover: [[-2, 12, 1.3, 0.8], [4, 18, 1.1, 1], [-5, 24, 1.4, 0.8], [2, 30, 1.6, 0.7]],
      targets: [
        { k: 'dummy', x: -1, z: 16 }, { k: 'dummy', x: 3.2, z: 22 }, { k: 'dummy', x: -3.5, z: 29 },
        { k: 'drone', x: 2, z: 14, path: [[2, 12], [6, 18], [2, 24], [-1, 18]] },
        { k: 'drone', x: -6, z: 22, path: [[-8, 20], [-2, 20], [-2, 30], [-8, 30]] },
        { k: 'drone', x: 6, z: 32, path: [[4, 30], [8, 34]] },
      ] },
    { id: 'split', zone: 'stealth', name: 'Split Patrol', info: 'Overlapping cones. Cross when they turn.', time: 120, par: 75, wind: [-0.7, 0.5], spawn: [0, 2], yaw: 0, stealth: true, maxAlerts: 3, bounds: { minX: -13, maxX: 13, minZ: 0, maxZ: 42 },
      cover: [[0, 14, 1.5, 0.7], [-4, 22, 1, 1], [4, 28, 1.2, 0.8]],
      targets: [
        { k: 'drone', x: -7, z: 12, path: [[-8, 10], [-8, 28]] },
        { k: 'drone', x: 7, z: 18, path: [[8, 14], [8, 32]] },
        { k: 'drone', x: 0, z: 34, path: [[-6, 34], [6, 34]] },
        { k: 'slider', x: 0, z: 22, amp: 3.6, slide: 0.6 },
        { k: 'dummy', x: -2.5, z: 17 }, { k: 'dummy', x: 2.6, z: 27 },
      ] },
    { id: 'breach', zone: 'heavy', name: 'Breach Wall', info: 'Armor ignores body shots. Crack the glow or breach the wall.', time: 100, par: 58, wind: [1.4, -0.4], spawn: [0, 3], yaw: 0, bounds: { minX: -10, maxX: 10, minZ: 0, maxZ: 40 },
      barricades: [
        { x: -2.6, z: 14, sx: 2.2, sy: 1.15, sz: 0.28 },
        { x: 3, z: 20, sx: 2.4, sy: 1.15, sz: 0.28 },
        { x: 0, z: 27, sx: 3, sy: 1.1, sz: 0.3 },
      ],
      targets: [
        { k: 'robot', x: -2.6, z: 18 }, { k: 'robot', x: 3.1, z: 24 },
        { k: 'robot', x: -1.4, z: 31 }, { k: 'robot', x: 2.2, z: 35 },
      ] },
    { id: 'bell', zone: 'heavy', name: 'Last Bell', info: 'Dummies, drones, and armor. Finish the ground.', time: 140, par: 90, wind: [2.1, 0.8], spawn: [0, 2], yaw: 0, bounds: { minX: -13, maxX: 13, minZ: -1, maxZ: 48 },
      cover: [[-4, 12, 1, 0.8], [4, 20, 1.1, 0.8]],
      barricades: [
        { x: -1.5, z: 30, sx: 2.2, sy: 1.12, sz: 0.28 },
        { x: 2.6, z: 36, sx: 2.3, sy: 1.15, sz: 0.28 },
      ],
      targets: [
        { k: 'dummy', x: -3.5, z: 12 }, { k: 'spinner', x: 2.6, z: 16, spin: 1.4 },
        { k: 'drone', x: -6, z: 22, path: [[-8, 18], [-2, 26]] },
        { k: 'drone', x: 6, z: 24, path: [[8, 20], [3, 30]] },
        { k: 'dummy', x: 0.4, z: 26 },
        { k: 'robot', x: -1.6, z: 34 }, { k: 'robot', x: 2.8, z: 40 },
      ] },
  ];

  const $ = (id) => document.getElementById(id);
  const canvas = $('view');
  const stage = $('stage');
  const overlay = $('overlay');
  const hud = $('hud');
  const reticle = $('reticle');
  const scopeEl = $('scope');

  const MAT = {
    root: new Float32Array(16), local: new Float32Array(16), out: new Float32Array(16),
    gun: new Float32Array(16), nrm: new Float32Array(9),
    view: new Float32Array(16), proj: new Float32Array(16), vp: new Float32Array(16),
  };
  const LIGHT = new Float32Array([0.25, 0.86, -0.42]);
  const FILL = new Float32Array([-0.15, 0.35, 0.85]);
  (function norm(a) { const l = Math.hypot(a[0], a[1], a[2]); a[0] /= l; a[1] /= l; a[2] /= l; })(LIGHT);
  (function norm(a) { const l = Math.hypot(a[0], a[1], a[2]); a[0] /= l; a[1] /= l; a[2] /= l; })(FILL);

  let gl, lit, skyProg, flatProg, ptProg;
  let worldGL = null, dynGL = null, skyBuf, coneBuf, ptBuf;
  let batch;
  const PRIM = {};
  let baked = {};

  const player = { x: 0, z: 4, yaw: 0, pitch: -0.07, crouch: false, crouchBlend: 0, speed: 0 };
  const keys = { forward: false, back: false, left: false, right: false, fire: false, scopeHold: false, breath: false };
  const stickL = { x: 0, y: 0 }, stickR = { x: 0, y: 0 };
  let padX = 0, padZ = 0, padYaw = 0, padPitch = 0, padFire = false, padScope = false, padBreath = false, fakePad = null;
  const padEdge = {};

  let loadout = 'rifle';
  let suppressed = false;
  let charged = false;
  let scopeLatch = false;
  let heat = 0, overheat = 0, breath = 1, exhale = 0;
  let decoy = { x: 0, z: 0, life: 0 }, decoyCD = 0;
  let course = COURSES[0], courseIndex = 0, inRun = false, mode = 'title', ended = false;
  let timeLeft = 0, simT = 0, slowT = 0, zoomKick = 0, shake = 0, timeScale = 1;
  let shots = 0, hits = 0, bullseyes = 0, destroyed = 0, alerts = 0, lastBurst = 0, shotContact = false;
  let lastFireT = -10, muzzleT = 0, beam = null, lastShot = null, manual = false;
  let targets = [], walls = [], blockers = [];
  let result = null;
  let screen = 'title';
  const stack = ['title'];
  let touchMode = false;
  let headWorld = { x: 0, y: 1.6, z: 0 }, chestWorld = { x: 0, y: 1.2, z: 0 }, muzzleWorld = { x: 0, y: 1, z: 0 };
  let projHead = null, projChest = null;
  const frameMs = [];
  let save = loadSave();

  const PMAX = 420;
  const P = {
    x: new Float32Array(PMAX), y: new Float32Array(PMAX), z: new Float32Array(PMAX),
    vx: new Float32Array(PMAX), vy: new Float32Array(PMAX), vz: new Float32Array(PMAX),
    life: new Float32Array(PMAX), max: new Float32Array(PMAX),
    r: new Float32Array(PMAX), g: new Float32Array(PMAX), b: new Float32Array(PMAX),
    cursor: 0,
  };
  const bullets = [];
  for (let i = 0; i < 16; i++) bullets.push({ alive: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, kind: 'rifle', wf: 1, drop: 1, pierce: false, splash: 0 });

  function loadSave() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return { v: 1, loadout: 'rifle', mute: false, best: {} };
      const s = JSON.parse(raw);
      if (!s || typeof s !== 'object') throw new Error('bad');
      s.best = s.best || {};
      s.loadout = s.loadout || 'rifle';
      return s;
    } catch (e) {
      return { v: 1, loadout: 'rifle', mute: false, best: {} };
    }
  }
  function writeSave() {
    try { localStorage.setItem(KEY, JSON.stringify(save)); } catch (e) { /* private mode */ }
  }

  function ident(o) {
    o[0] = 1; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = 1; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = 1; o[11] = 0;
    o[12] = 0; o[13] = 0; o[14] = 0; o[15] = 1;
  }
  function setTRS(o, x, y, z, rx, ry, rz, sx, sy, sz) {
    const cx = Math.cos(rx), sxr = Math.sin(rx);
    const cy = Math.cos(ry), syr = Math.sin(ry);
    const cz = Math.cos(rz), szr = Math.sin(rz);
    const r00 = cy * cz + syr * sxr * szr;
    const r01 = -cy * szr + syr * sxr * cz;
    const r02 = syr * cx;
    const r10 = cx * szr;
    const r11 = cx * cz;
    const r12 = -sxr;
    const r20 = -syr * cz + cy * sxr * szr;
    const r21 = syr * szr + cy * sxr * cz;
    const r22 = cy * cx;
    o[0] = r00 * sx; o[1] = r10 * sx; o[2] = r20 * sx; o[3] = 0;
    o[4] = r01 * sy; o[5] = r11 * sy; o[6] = r21 * sy; o[7] = 0;
    o[8] = r02 * sz; o[9] = r12 * sz; o[10] = r22 * sz; o[11] = 0;
    o[12] = x; o[13] = y; o[14] = z; o[15] = 1;
  }
  function mul(o, a, b) {
    for (let c = 0; c < 4; c++) {
      const b0 = b[c * 4], b1 = b[c * 4 + 1], b2 = b[c * 4 + 2], b3 = b[c * 4 + 3];
      o[c * 4] = a[0] * b0 + a[4] * b1 + a[8] * b2 + a[12] * b3;
      o[c * 4 + 1] = a[1] * b0 + a[5] * b1 + a[9] * b2 + a[13] * b3;
      o[c * 4 + 2] = a[2] * b0 + a[6] * b1 + a[10] * b2 + a[14] * b3;
      o[c * 4 + 3] = a[3] * b0 + a[7] * b1 + a[11] * b2 + a[15] * b3;
    }
  }
  function normalFrom(m, o) {
    const a00 = m[0], a01 = m[1], a02 = m[2];
    const a10 = m[4], a11 = m[5], a12 = m[6];
    const a20 = m[8], a21 = m[9], a22 = m[10];
    const c00 = a11 * a22 - a12 * a21;
    const c01 = a12 * a20 - a10 * a22;
    const c02 = a10 * a21 - a11 * a20;
    const c10 = a02 * a21 - a01 * a22;
    const c11 = a00 * a22 - a02 * a20;
    const c12 = a01 * a20 - a00 * a21;
    const c20 = a01 * a12 - a02 * a11;
    const c21 = a02 * a10 - a00 * a12;
    const c22 = a00 * a11 - a01 * a10;
    const det = a00 * c00 + a10 * c10 + a20 * c20;
    const inv = Math.abs(det) < 1e-8 ? 0 : 1 / det;
    o[0] = c00 * inv; o[1] = c10 * inv; o[2] = c20 * inv;
    o[3] = c01 * inv; o[4] = c11 * inv; o[5] = c21 * inv;
    o[6] = c02 * inv; o[7] = c12 * inv; o[8] = c22 * inv;
  }
  function lookAt(o, ex, ey, ez, cx, cy, cz) {
    let fx = cx - ex, fy = cy - ey, fz = cz - ez;
    let fl = Math.hypot(fx, fy, fz) || 1;
    fx /= fl; fy /= fl; fz /= fl;
    let sx = fy * 0 - fz * 1, sy = fz * 0 - fx * 0, sz = fx * 1 - fy * 0;
    let sl = Math.hypot(sx, sy, sz) || 1;
    sx /= sl; sy /= sl; sz /= sl;
    const ux = sy * fz - sz * fy, uy = sz * fx - sx * fz, uz = sx * fy - sy * fx;
    o[0] = sx; o[1] = ux; o[2] = -fx; o[3] = 0;
    o[4] = sy; o[5] = uy; o[6] = -fy; o[7] = 0;
    o[8] = sz; o[9] = uz; o[10] = -fz; o[11] = 0;
    o[12] = -(sx * ex + sy * ey + sz * ez);
    o[13] = -(ux * ex + uy * ey + uz * ez);
    o[14] = fx * ex + fy * ey + fz * ez;
    o[15] = 1;
  }
  function perspective(o, fovy, aspect, near, far) {
    const f = 1 / Math.tan(fovy / 2);
    o[0] = f / aspect; o[1] = 0; o[2] = 0; o[3] = 0;
    o[4] = 0; o[5] = f; o[6] = 0; o[7] = 0;
    o[8] = 0; o[9] = 0; o[10] = (far + near) / (near - far); o[11] = -1;
    o[12] = 0; o[13] = 0; o[14] = (2 * far * near) / (near - far); o[15] = 0;
  }
  function xform(m, x, y, z) {
    return {
      x: m[0] * x + m[4] * y + m[8] * z + m[12],
      y: m[1] * x + m[5] * y + m[9] * z + m[13],
      z: m[2] * x + m[6] * y + m[10] * z + m[14],
    };
  }
  function project(x, y, z) {
    const m = MAT.vp;
    const cx = m[0] * x + m[4] * y + m[8] * z + m[12];
    const cy = m[1] * x + m[5] * y + m[9] * z + m[13];
    const cw = m[3] * x + m[7] * y + m[11] * z + m[15];
    if (cw <= 0.05) return null;
    const nx = cx / cw, ny = cy / cw;
    return {
      ndcX: nx, ndcY: ny,
      cssX: (nx * 0.5 + 0.5) * canvas.clientWidth,
      cssY: (1 - (ny * 0.5 + 0.5)) * canvas.clientHeight,
      inFrame: nx > -1.05 && nx < 1.05 && ny > -1.05 && ny < 1.05,
    };
  }
  function wrapAng(a) {
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    return a;
  }
  function clampPitch(p) { return Math.max(-0.55, Math.min(0.62, p)); }

  function pack(pos, nrm, idx) {
    return { pos: new Float32Array(pos), nrm: new Float32Array(nrm), count: pos.length / 3, idx: new Uint16Array(idx), icount: idx.length };
  }
  function makeBox() {
    const pos = [], nrm = [], idx = [];
    const faces = [
      [[-0.5, -0.5, 0.5], [0.5, -0.5, 0.5], [0.5, 0.5, 0.5], [-0.5, 0.5, 0.5], [0, 0, 1]],
      [[0.5, -0.5, -0.5], [-0.5, -0.5, -0.5], [-0.5, 0.5, -0.5], [0.5, 0.5, -0.5], [0, 0, -1]],
      [[0.5, -0.5, 0.5], [0.5, -0.5, -0.5], [0.5, 0.5, -0.5], [0.5, 0.5, 0.5], [1, 0, 0]],
      [[-0.5, -0.5, -0.5], [-0.5, -0.5, 0.5], [-0.5, 0.5, 0.5], [-0.5, 0.5, -0.5], [-1, 0, 0]],
      [[-0.5, 0.5, 0.5], [0.5, 0.5, 0.5], [0.5, 0.5, -0.5], [-0.5, 0.5, -0.5], [0, 1, 0]],
      [[-0.5, -0.5, -0.5], [0.5, -0.5, -0.5], [0.5, -0.5, 0.5], [-0.5, -0.5, 0.5], [0, -1, 0]],
    ];
    for (let f = 0; f < faces.length; f++) {
      const face = faces[f];
      const n = face[4];
      const b = pos.length / 3;
      for (let i = 0; i < 4; i++) {
        pos.push(face[i][0], face[i][1], face[i][2]);
        nrm.push(n[0], n[1], n[2]);
      }
      idx.push(b, b + 1, b + 2, b, b + 2, b + 3);
    }
    return pack(pos, nrm, idx);
  }
  function makeSphere(stacks, slices) {
    const pos = [], nrm = [], idx = [];
    for (let y = 0; y <= stacks; y++) {
      const phi = (y / stacks) * Math.PI;
      const sp = Math.sin(phi), cp = Math.cos(phi);
      for (let x = 0; x <= slices; x++) {
        const th = (x / slices) * Math.PI * 2;
        const px = sp * Math.cos(th), py = cp, pz = sp * Math.sin(th);
        pos.push(px, py, pz);
        nrm.push(px, py, pz);
      }
    }
    const stride = slices + 1;
    for (let y = 0; y < stacks; y++) {
      for (let x = 0; x < slices; x++) {
        const i = y * stride + x;
        idx.push(i, i + stride, i + 1, i + 1, i + stride, i + stride + 1);
      }
    }
    return pack(pos, nrm, idx);
  }
  function makeCylinder(segs) {
    const pos = [], nrm = [], idx = [];
    function v(x, y, z, nx, ny, nz) {
      pos.push(x, y, z); nrm.push(nx, ny, nz);
      return pos.length / 3 - 1;
    }
    for (let i = 0; i <= segs; i++) {
      const th = (i / segs) * Math.PI * 2;
      const cx = Math.cos(th), sz = Math.sin(th);
      v(cx, -0.5, sz, cx, 0, sz);
      v(cx, 0.5, sz, cx, 0, sz);
    }
    for (let i = 0; i < segs; i++) {
      const a = i * 2;
      idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
    }
    const botC = v(0, -0.5, 0, 0, -1, 0);
    const topC = v(0, 0.5, 0, 0, 1, 0);
    for (let i = 0; i < segs; i++) {
      const th0 = (i / segs) * Math.PI * 2;
      const th1 = ((i + 1) / segs) * Math.PI * 2;
      const b0 = v(Math.cos(th0), -0.5, Math.sin(th0), 0, -1, 0);
      const b1 = v(Math.cos(th1), -0.5, Math.sin(th1), 0, -1, 0);
      idx.push(botC, b1, b0);
      const t0 = v(Math.cos(th0), 0.5, Math.sin(th0), 0, 1, 0);
      const t1 = v(Math.cos(th1), 0.5, Math.sin(th1), 0, 1, 0);
      idx.push(topC, t0, t1);
    }
    return pack(pos, nrm, idx);
  }

  function Batch(maxV, maxI) {
    this.maxV = maxV;
    this.pos = new Float32Array(maxV * 3);
    this.nrm = new Float32Array(maxV * 3);
    this.col = new Float32Array(maxV * 3);
    this.emi = new Float32Array(maxV);
    this.idx = new Uint16Array(maxI);
    this.nv = 0;
    this.ni = 0;
  }
  Batch.prototype.clear = function () { this.nv = 0; this.ni = 0; };
  function appendMesh(batch, mesh, m, nmat, cr, cg, cb, emiAdd, keep) {
    const base = batch.nv;
    const cnt = mesh.count;
    if (base + cnt >= batch.maxV || batch.ni + mesh.icount >= batch.idx.length) return;
    const mp = mesh.pos, mn = mesh.nrm;
    for (let i = 0; i < cnt; i++) {
      const x = mp[i * 3], y = mp[i * 3 + 1], z = mp[i * 3 + 2];
      const o = (base + i) * 3;
      batch.pos[o] = m[0] * x + m[4] * y + m[8] * z + m[12];
      batch.pos[o + 1] = m[1] * x + m[5] * y + m[9] * z + m[13];
      batch.pos[o + 2] = m[2] * x + m[6] * y + m[10] * z + m[14];
      const nx = mn[i * 3], ny = mn[i * 3 + 1], nz = mn[i * 3 + 2];
      let nnx = nmat[0] * nx + nmat[3] * ny + nmat[6] * nz;
      let nny = nmat[1] * nx + nmat[4] * ny + nmat[7] * nz;
      let nnz = nmat[2] * nx + nmat[5] * ny + nmat[8] * nz;
      const nl = Math.hypot(nnx, nny, nnz) || 1;
      batch.nrm[o] = nnx / nl; batch.nrm[o + 1] = nny / nl; batch.nrm[o + 2] = nnz / nl;
      if (keep && mesh.col) {
        batch.col[o] = mesh.col[i * 3] * cr;
        batch.col[o + 1] = mesh.col[i * 3 + 1] * cg;
        batch.col[o + 2] = mesh.col[i * 3 + 2] * cb;
        batch.emi[base + i] = (mesh.emi ? mesh.emi[i] : 0) + emiAdd;
      } else {
        batch.col[o] = cr; batch.col[o + 1] = cg; batch.col[o + 2] = cb;
        batch.emi[base + i] = emiAdd;
      }
    }
    const ii = mesh.idx;
    for (let i = 0; i < mesh.icount; i++) batch.idx[batch.ni + i] = ii[i] + base;
    batch.ni += mesh.icount;
    batch.nv = base + cnt;
  }
  function addPrim(batch, prim, parent, x, y, z, rx, ry, rz, sx, sy, sz, color, emi) {
    setTRS(MAT.local, x, y, z, rx, ry, rz, sx, sy, sz);
    if (parent) mul(MAT.out, parent, MAT.local);
    else MAT.out.set(MAT.local);
    normalFrom(MAT.out, MAT.nrm);
    appendMesh(batch, prim, MAT.out, MAT.nrm, color[0], color[1], color[2], emi || 0, false);
  }
  function addBaked(batch, mesh, x, y, z, rx, ry, rz, tint, emiAdd) {
    setTRS(MAT.local, x, y, z, rx, ry, rz, 1, 1, 1);
    MAT.out.set(MAT.local);
    normalFrom(MAT.out, MAT.nrm);
    const t = tint || [1, 1, 1];
    appendMesh(batch, mesh, MAT.out, MAT.nrm, t[0], t[1], t[2], emiAdd || 0, true);
  }
  function freeze(b) {
    const mesh = {
      pos: b.pos.slice(0, b.nv * 3),
      nrm: b.nrm.slice(0, b.nv * 3),
      col: b.col.slice(0, b.nv * 3),
      emi: b.emi.slice(0, b.nv),
      idx: b.idx.slice(0, b.ni),
      count: b.nv,
      icount: b.ni,
    };
    b.clear();
    return mesh;
  }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      $('glstatus').textContent = gl.getShaderInfoLog(s) || 'shader';
      gl.deleteShader(s);
      return null;
    }
    return s;
  }
  function program(vs, fs, attribs) {
    const v = compile(gl.VERTEX_SHADER, vs);
    const f = compile(gl.FRAGMENT_SHADER, fs);
    if (!v || !f) return null;
    const p = gl.createProgram();
    gl.attachShader(p, v); gl.attachShader(p, f);
    for (let i = 0; i < attribs.length; i++) if (attribs[i]) gl.bindAttribLocation(p, i, attribs[i]);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      $('glstatus').textContent = gl.getProgramInfoLog(p) || 'link';
      return null;
    }
    return p;
  }

  const LIT_VS = `
attribute vec3 aPos; attribute vec3 aNrm; attribute vec3 aCol; attribute float aEmi;
uniform mat4 uVP;
varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying float vEmi;
void main() {
  vW = aPos; vN = aNrm; vCol = aCol; vEmi = aEmi;
  gl_Position = uVP * vec4(aPos, 1.0);
}`;
  const LIT_FS = `
precision mediump float;
varying vec3 vN; varying vec3 vW; varying vec3 vCol; varying float vEmi;
uniform vec3 uLight; uniform vec3 uFill; uniform vec3 uEye; uniform vec3 uFog;
uniform float uFogNear; uniform float uFogFar;
void main() {
  vec3 n = normalize(vN);
  float ndl = max(dot(n, uLight), 0.0);
  float fill = max(dot(n, uFill), 0.0);
  vec3 col = vCol * (0.46 + 0.42 * ndl + 0.18 * fill) + vCol * vEmi;
  vec3 vd = normalize(uEye - vW);
  float rim = pow(1.0 - max(dot(n, vd), 0.0), 2.2);
  col += rim * vec3(0.45, 0.55, 0.6) * 0.28;
  float spec = pow(max(dot(n, normalize(uLight + vd)), 0.0), 28.0);
  col += spec * 0.18;
  float dist = length(uEye - vW);
  float fog = clamp((dist - uFogNear) / max(0.001, uFogFar - uFogNear), 0.0, 1.0);
  col = mix(col, uFog, fog);
  gl_FragColor = vec4(col, 1.0);
}`;
  const SKY_VS = `attribute vec2 aPos; varying vec2 v; void main(){ v=aPos; gl_Position=vec4(aPos,0.999,1.0);} `;
  const SKY_FS = `precision mediump float; varying vec2 v; uniform vec3 uTop; uniform vec3 uHor;
void main(){ float t=clamp(v.y*0.5+0.5,0.0,1.0); t=t*t; gl_FragColor=vec4(mix(uHor,uTop,t),1.0);} `;
  const FLAT_VS = `attribute vec3 aPos; attribute vec4 aCol; uniform mat4 uVP; varying vec4 vCol;
void main(){ vCol=aCol; gl_Position=uVP*vec4(aPos,1.0);} `;
  const FLAT_FS = `precision mediump float; varying vec4 vCol; void main(){ gl_FragColor=vCol; }`;
  const PT_VS = `attribute vec3 aPos; attribute vec4 aCol; uniform mat4 uVP; varying vec4 vCol;
void main(){ vCol=aCol; gl_Position=uVP*vec4(aPos,1.0); gl_PointSize=aCol.a*28.0; }`;
  const PT_FS = `precision mediump float; varying vec4 vCol;
void main(){ vec2 p=gl_PointCoord*2.0-1.0; float d=dot(p,p); if(d>1.0) discard;
gl_FragColor=vec4(vCol.rgb, (1.0-d)*min(1.0,vCol.a)); }`;

  function initGL() {
    gl = canvas.getContext('webgl', {
      alpha: false, antialias: false, depth: true, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false,
    });
    if (!gl) { $('glstatus').textContent = 'WebGL unavailable'; return false; }
    lit = program(LIT_VS, LIT_FS, ['aPos', 'aNrm', 'aCol', 'aEmi']);
    skyProg = program(SKY_VS, SKY_FS, ['aPos']);
    flatProg = program(FLAT_VS, FLAT_FS, ['aPos', 'aCol']);
    ptProg = program(PT_VS, PT_FS, ['aPos', 'aCol']);
    if (!lit || !skyProg || !flatProg || !ptProg) return false;
    lit = {
      p: lit,
      uVP: gl.getUniformLocation(lit, 'uVP'),
      uLight: gl.getUniformLocation(lit, 'uLight'),
      uFill: gl.getUniformLocation(lit, 'uFill'),
      uEye: gl.getUniformLocation(lit, 'uEye'),
      uFog: gl.getUniformLocation(lit, 'uFog'),
      uFogNear: gl.getUniformLocation(lit, 'uFogNear'),
      uFogFar: gl.getUniformLocation(lit, 'uFogFar'),
    };
    skyProg = { p: skyProg, uTop: gl.getUniformLocation(skyProg, 'uTop'), uHor: gl.getUniformLocation(skyProg, 'uHor') };
    flatProg = { p: flatProg, uVP: gl.getUniformLocation(flatProg, 'uVP') };
    ptProg = { p: ptProg, uVP: gl.getUniformLocation(ptProg, 'uVP') };
    skyBuf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    coneBuf = { pos: gl.createBuffer(), col: gl.createBuffer(), dataP: new Float32Array(900), dataC: new Float32Array(1200), n: 0 };
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuf.pos);
    gl.bufferData(gl.ARRAY_BUFFER, coneBuf.dataP.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuf.col);
    gl.bufferData(gl.ARRAY_BUFFER, coneBuf.dataC.byteLength, gl.DYNAMIC_DRAW);
    ptBuf = { pos: gl.createBuffer(), col: gl.createBuffer(), dataP: new Float32Array(PMAX * 3), dataC: new Float32Array(PMAX * 4), n: 0 };
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf.pos);
    gl.bufferData(gl.ARRAY_BUFFER, ptBuf.dataP.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf.col);
    gl.bufferData(gl.ARRAY_BUFFER, ptBuf.dataC.byteLength, gl.DYNAMIC_DRAW);
    dynGL = {
      pos: gl.createBuffer(), nrm: gl.createBuffer(), col: gl.createBuffer(),
      emi: gl.createBuffer(), idx: gl.createBuffer(),
    };
    gl.bindBuffer(gl.ARRAY_BUFFER, dynGL.pos);
    gl.bufferData(gl.ARRAY_BUFFER, batch.pos.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, dynGL.nrm);
    gl.bufferData(gl.ARRAY_BUFFER, batch.nrm.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, dynGL.col);
    gl.bufferData(gl.ARRAY_BUFFER, batch.col.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ARRAY_BUFFER, dynGL.emi);
    gl.bufferData(gl.ARRAY_BUFFER, batch.emi.byteLength, gl.DYNAMIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, dynGL.idx);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, batch.idx.byteLength, gl.DYNAMIC_DRAW);
    gl.enable(gl.DEPTH_TEST);
    gl.depthFunc(gl.LEQUAL);
    gl.disable(gl.CULL_FACE);
    return true;
  }

  function uploadWorld() {
    if (worldGL) {
      gl.deleteBuffer(worldGL.pos); gl.deleteBuffer(worldGL.nrm); gl.deleteBuffer(worldGL.col);
      gl.deleteBuffer(worldGL.emi); gl.deleteBuffer(worldGL.idx);
    }
    worldGL = {
      pos: gl.createBuffer(), nrm: gl.createBuffer(), col: gl.createBuffer(),
      emi: gl.createBuffer(), idx: gl.createBuffer(), count: batch.ni,
    };
    function up(buf, data, target) {
      gl.bindBuffer(target, buf);
      gl.bufferData(target, data, gl.STATIC_DRAW);
    }
    up(worldGL.pos, batch.pos.subarray(0, batch.nv * 3), gl.ARRAY_BUFFER);
    up(worldGL.nrm, batch.nrm.subarray(0, batch.nv * 3), gl.ARRAY_BUFFER);
    up(worldGL.col, batch.col.subarray(0, batch.nv * 3), gl.ARRAY_BUFFER);
    up(worldGL.emi, batch.emi.subarray(0, batch.nv), gl.ARRAY_BUFFER);
    up(worldGL.idx, batch.idx.subarray(0, batch.ni), gl.ELEMENT_ARRAY_BUFFER);
    batch.clear();
  }

  function buildBaked() {
    const b = batch;
    const wood = [0.62, 0.44, 0.24], white = [0.92, 0.93, 0.9], red = [0.85, 0.16, 0.14], gold = [1, 0.82, 0.25];
    addPrim(b, PRIM.box, null, 0, 0.55, 0, 0, 0, 0, 0.1, 1.1, 0.1, [0.32, 0.24, 0.16], 0);
    addPrim(b, PRIM.sphere, null, 0, 1.02, 0, 0, 0, 0, 0.34, 0.42, 0.28, wood, 0);
    addPrim(b, PRIM.sphere, null, 0, 1.7, 0, 0, 0, 0, 0.28, 0.28, 0.28, white, 0.05);
    addPrim(b, PRIM.cyl, null, 0, 1.7, 0.3, Math.PI / 2, 0, 0, 0.2, 0.03, 0.2, white, 0.1);
    addPrim(b, PRIM.cyl, null, 0, 1.7, 0.32, Math.PI / 2, 0, 0, 0.13, 0.03, 0.13, red, 0.15);
    addPrim(b, PRIM.cyl, null, 0, 1.7, 0.34, Math.PI / 2, 0, 0, 0.06, 0.025, 0.06, gold, 0.45);
    baked.dummy = freeze(b);

    addPrim(b, PRIM.cyl, null, 0, 0, 0, Math.PI / 2, 0, 0, 0.62, 0.06, 0.62, white, 0.05);
    addPrim(b, PRIM.cyl, null, 0, 0, 0.04, Math.PI / 2, 0, 0, 0.4, 0.04, 0.4, red, 0.1);
    addPrim(b, PRIM.cyl, null, 0, 0, 0.07, Math.PI / 2, 0, 0, 0.16, 0.035, 0.16, gold, 0.4);
    baked.spin = freeze(b);

    addPrim(b, PRIM.sphere, null, 0, 0, 0, 0, 0, 0, 0.42, 0.28, 0.42, [0.12, 0.14, 0.16], 0);
    addPrim(b, PRIM.cyl, null, 0, 0, 0, Math.PI / 2, 0, 0, 0.62, 0.08, 0.62, [0.25, 0.7, 0.78], 0.35);
    addPrim(b, PRIM.box, null, 0.32, 0, 0.1, 0, 0, 0.4, 0.22, 0.05, 0.16, [0.2, 0.55, 0.62], 0.2);
    addPrim(b, PRIM.box, null, -0.32, 0, 0.1, 0, 0, -0.4, 0.22, 0.05, 0.16, [0.2, 0.55, 0.62], 0.2);
    addPrim(b, PRIM.sphere, null, 0, 0.05, 0.3, 0, 0, 0, 0.1, 0.1, 0.1, [1, 0.35, 0.7], 0.9);
    baked.drone = freeze(b);

    addPrim(b, PRIM.box, null, -0.18, 0.4, 0, 0, 0, 0, 0.14, 0.7, 0.14, [0.18, 0.2, 0.22], 0);
    addPrim(b, PRIM.box, null, 0.18, 0.4, 0, 0, 0, 0, 0.14, 0.7, 0.14, [0.18, 0.2, 0.22], 0);
    addPrim(b, PRIM.box, null, 0, 1.15, 0, 0, 0, 0, 0.7, 0.7, 0.42, [0.22, 0.26, 0.3], 0);
    addPrim(b, PRIM.box, null, 0, 1.15, 0.16, 0, 0, 0, 0.5, 0.42, 0.12, [0.3, 0.34, 0.38], 0);
    addPrim(b, PRIM.box, null, 0, 1.62, 0, 0, 0, 0, 0.28, 0.26, 0.26, [0.16, 0.18, 0.2], 0);
    addPrim(b, PRIM.box, null, -0.42, 1.28, 0, 0, 0, 0, 0.16, 0.16, 0.28, [0.35, 0.22, 0.14], 0);
    addPrim(b, PRIM.box, null, 0.42, 1.28, 0, 0, 0, 0, 0.16, 0.16, 0.28, [0.35, 0.22, 0.14], 0);
    baked.robot = freeze(b);
  }

  function buildWorld(c) {
    batch.clear();
    const z = ZONES[c.zone];
    const bnds = c.bounds;
    const minX = bnds.minX - 8, maxX = bnds.maxX + 8, minZ = bnds.minZ - 10, maxZ = bnds.maxZ + 6;
    for (let x = minX; x < maxX; x += 3) {
      for (let zz = minZ; zz < maxZ; zz += 3) {
        const alt = (((x + zz) / 3) | 0) & 1;
        const col = alt ? z.groundA : z.groundB;
        const lane = Math.abs(x + 1.5) < 2.2;
        addPrim(batch, PRIM.box, null, x + 1.5, -0.12, zz + 1.5, 0, 0, 0, 3, 0.24, 3, lane ? z.lane : col, 0);
      }
    }
    const midZ = (bnds.minZ + bnds.maxZ) * 0.5;
    const len = (bnds.maxZ - bnds.minZ) + 14;
    addPrim(batch, PRIM.box, null, bnds.minX - 1.4, 0.8, midZ, 0, 0, 0, 1.3, 1.6, len, z.berm, 0);
    addPrim(batch, PRIM.box, null, bnds.maxX + 1.4, 0.8, midZ, 0, 0, 0, 1.3, 1.6, len, z.berm, 0);
    addPrim(batch, PRIM.box, null, 0, 1.5, bnds.maxZ + 1.2, 0, 0, 0, (bnds.maxX - bnds.minX) + 6, 3, 0.7, z.wood, 0);
    addPrim(batch, PRIM.box, null, 0, 2.5, bnds.maxZ + 1.15, 0, 0, 0, 1.2, 0.7, 0.2, [0.75, 0.18, 0.16], 0.2);
    for (let i = 0; i < 5; i++) {
      const zz = bnds.minZ + 6 + i * ((bnds.maxZ - bnds.minZ) / 6);
      addPrim(batch, PRIM.box, null, bnds.minX + 0.2, 1.1, zz, 0, 0, 0, 0.12, 2.2, 0.12, z.metal, 0);
      addPrim(batch, PRIM.box, null, bnds.maxX - 0.2, 1.1, zz, 0, 0, 0, 0.12, 2.2, 0.12, z.metal, 0);
      if (z === ZONES.stealth) {
        addPrim(batch, PRIM.sphere, null, bnds.minX + 0.2, 2.3, zz, 0, 0, 0, 0.12, 0.12, 0.12, [1, 0.86, 0.45], 0.8);
      }
    }
    const covers = c.cover || [];
    for (let i = 0; i < covers.length; i++) {
      const k = covers[i];
      addPrim(batch, PRIM.box, null, k[0], 0.45, k[1], 0, 0, 0, k[2], 0.9, k[3], z.wood, 0);
      addPrim(batch, PRIM.box, null, k[0], 0.95, k[1], 0, 0.2, 0, k[2] * 0.92, 0.16, k[3] * 0.92, z.metal, 0);
    }
    for (let i = 0; i < (c.targets || []).length; i++) {
      const t = c.targets[i];
      if (t.k === 'drone' || t.k === 'robot') continue;
      addPrim(batch, PRIM.box, null, t.x, 0.06, t.z, 0, 0, 0, 0.7, 0.1, 0.7, z.metal, 0);
      if (t.k === 'spinner') addPrim(batch, PRIM.box, null, t.x, 0.7, t.z, 0, 0, 0, 0.08, 1.3, 0.08, z.metal, 0);
      if (t.k === 'slider') addPrim(batch, PRIM.box, null, t.x, 0.12, t.z, 0, 0, 0, (t.amp || 2) * 2 + 0.4, 0.08, 0.12, [0.7, 0.55, 0.3], 0);
    }
    uploadWorld();
  }

  let rng = 1;
  function rnd() { rng = (rng * 16807) % 2147483647; return (rng & 2147483647) / 2147483647; }

  function spawnEntities(c) {
    rng = 900 + courseIndex * 37;
    targets = [];
    walls = [];
    blockers = [];
    const covers = c.cover || [];
    for (let i = 0; i < covers.length; i++) {
      blockers.push({ x: covers[i][0], z: covers[i][1], hx: covers[i][2] * 0.5, hz: covers[i][3] * 0.5, on: true });
    }
    const bars = c.barricades || [];
    for (let i = 0; i < bars.length; i++) {
      const b = bars[i];
      const w = {
        x: b.x, z: b.z, sx: b.sx, sy: b.sy, sz: b.sz, hp: 3, alive: true,
        minX: b.x - b.sx / 2, maxX: b.x + b.sx / 2, minY: 0, maxY: b.sy,
        minZ: b.z - b.sz / 2, maxZ: b.z + b.sz / 2,
      };
      walls.push(w);
      const blk = { x: b.x, z: b.z, hx: b.sx * 0.5, hz: b.sz * 0.5, on: true, wall: w };
      blockers.push(blk);
      w.blocker = blk;
    }
    const defs = c.targets || [];
    for (let i = 0; i < defs.length; i++) {
      const d = defs[i];
      targets.push({
        k: d.k, x: d.x, z: d.z, x0: d.x, y: d.k === 'drone' ? 2.05 : 0,
        alive: true, counts: true, flash: 0, alert: 0, pinged: false, wi: 0,
        phase: d.phase != null ? d.phase : rnd() * 5,
        spin: d.spin || 1, slide: d.slide || 0.8, amp: d.amp || 0, pop: d.pop || 0,
        path: d.path || null, ang: 0, up: true, spd: 2.05 + rnd() * 0.4,
      });
    }
    for (let i = 0; i < bullets.length; i++) bullets[i].alive = false;
    for (let i = 0; i < PMAX; i++) P.life[i] = 0;
    beam = null;
    decoy.life = 0;
  }

  function facePoint(t, lx, ly, lz) {
    const yaw = Math.PI;
    const c = Math.cos(yaw), s = Math.sin(yaw);
    return { x: t.x + c * lx + s * lz, y: t.y + ly, z: t.z - s * lx + c * lz };
  }

  function segSphere(p0, p1, c, r) {
    const dx = p1.x - p0.x, dy = p1.y - p0.y, dz = p1.z - p0.z;
    const fx = p0.x - c.x, fy = p0.y - c.y, fz = p0.z - c.z;
    const a = dx * dx + dy * dy + dz * dz || 1e-8;
    let t = -(fx * dx + fy * dy + fz * dz) / a;
    if (t < 0) t = 0; else if (t > 1) t = 1;
    const x = p0.x + dx * t, y = p0.y + dy * t, z = p0.z + dz * t;
    const dist = Math.hypot(x - c.x, y - c.y, z - c.z);
    if (dist > r) return null;
    return { t, x, y, z, dist };
  }
  function segAABB(p0, p1, box) {
    let t0 = 0, t1 = 1;
    const d = [p1.x - p0.x, p1.y - p0.y, p1.z - p0.z];
    const p = [p0.x, p0.y, p0.z];
    const mn = [box.minX, box.minY, box.minZ];
    const mx = [box.maxX, box.maxY, box.maxZ];
    for (let i = 0; i < 3; i++) {
      if (Math.abs(d[i]) < 1e-8) {
        if (p[i] < mn[i] || p[i] > mx[i]) return null;
      } else {
        let tA = (mn[i] - p[i]) / d[i];
        let tB = (mx[i] - p[i]) / d[i];
        if (tA > tB) { const s = tA; tA = tB; tB = s; }
        if (tA > t0) t0 = tA;
        if (tB < t1) t1 = tB;
        if (t0 > t1) return null;
      }
    }
    return { t: t0, x: p0.x + d[0] * t0, y: p0.y + d[1] * t0, z: p0.z + d[2] * t0 };
  }
  function targetHit(t, p0, p1) {
    if (!t.alive) return null;
    if ((t.k === 'dummy' || t.k === 'slider') && t.pop && t.y < -1) return null;
    const hits = [];
    if (t.k === 'dummy' || t.k === 'slider') {
      const h = segSphere(p0, p1, { x: t.x, y: t.y + 1.7, z: t.z }, 0.3);
      if (h) hits.push(Object.assign(h, { head: true }));
      const b = segSphere(p0, p1, { x: t.x, y: t.y + 1.02, z: t.z }, 0.42);
      if (b) hits.push(Object.assign(b, { head: false }));
      const l = segSphere(p0, p1, { x: t.x, y: t.y + 0.48, z: t.z }, 0.28);
      if (l) hits.push(Object.assign(l, { head: false }));
    } else if (t.k === 'spinner') {
      const h = segSphere(p0, p1, { x: t.x, y: 1.35, z: t.z }, 0.62);
      if (h) hits.push(Object.assign(h, { head: h.dist < 0.2 }));
    } else if (t.k === 'drone') {
      const h = segSphere(p0, p1, { x: t.x, y: t.y, z: t.z }, 0.5);
      if (h) hits.push(Object.assign(h, { head: h.dist < 0.22, weak: h.dist < 0.22 }));
    } else if (t.k === 'robot') {
      const wC = facePoint(t, 0, 1.62, 0.46);
      const w = segSphere(p0, p1, wC, 0.26);
      if (w) hits.push(Object.assign(w, { weak: true, head: true }));
      const b = segSphere(p0, p1, { x: t.x, y: t.y + 1.15, z: t.z }, 0.48);
      if (b) hits.push(Object.assign(b, { weak: false, head: false, armor: true }));
    }
    if (!hits.length) return null;
    hits.sort((a, c) => a.t - c.t);
    return hits[0];
  }

  function losBlocked(x0, z0, x1, z1) {
    const dx = x1 - x0, dz = z1 - z0;
    for (let i = 0; i < blockers.length; i++) {
      const b = blockers[i];
      if (!b.on) continue;
      let t0 = 0, t1 = 1;
      const dims = [[dx, x0, b.x - b.hx, b.x + b.hx], [dz, z0, b.z - b.hz, b.z + b.hz]];
      let miss = false;
      for (let k = 0; k < 2; k++) {
        const d = dims[k][0], p = dims[k][1], mn = dims[k][2], mx = dims[k][3];
        if (Math.abs(d) < 1e-8) { if (p < mn || p > mx) { miss = true; break; } continue; }
        let a = (mn - p) / d, c = (mx - p) / d;
        if (a > c) { const s = a; a = c; c = s; }
        if (a > t0) t0 = a;
        if (c < t1) t1 = c;
        if (t0 > t1) { miss = true; break; }
      }
      if (!miss && t1 >= 0 && t0 <= 1) return true;
    }
    return false;
  }
  function blocked(x, z) {
    const bnds = course.bounds;
    if (x < bnds.minX || x > bnds.maxX || z < bnds.minZ || z > bnds.maxZ) return true;
    for (let i = 0; i < blockers.length; i++) {
      const b = blockers[i];
      if (!b.on) continue;
      if (Math.abs(x - b.x) < b.hx + 0.34 && Math.abs(z - b.z) < b.hz + 0.34) return true;
    }
    return false;
  }

  function burst(x, y, z, col, count, speed, shatter) {
    if (shatter) lastBurst = count;
    for (let n = 0; n < count; n++) {
      let slot = -1;
      for (let k = 0; k < PMAX; k++) {
        const i = (P.cursor + k) % PMAX;
        if (P.life[i] <= 0) { slot = i; P.cursor = (i + 1) % PMAX; break; }
      }
      if (slot < 0) return;
      const th = rnd() * Math.PI * 2;
      const ph = Math.acos(2 * rnd() - 1);
      const sp = speed * (0.35 + rnd());
      P.x[slot] = x; P.y[slot] = y; P.z[slot] = z;
      P.vx[slot] = Math.sin(ph) * Math.cos(th) * sp;
      P.vy[slot] = Math.cos(ph) * sp + 1.2;
      P.vz[slot] = Math.sin(ph) * Math.sin(th) * sp;
      P.life[slot] = 0.45 + rnd() * 0.5;
      P.max[slot] = P.life[slot];
      P.r[slot] = col[0]; P.g[slot] = col[1]; P.b[slot] = col[2];
    }
  }
  function spark(x, y, z, col) { burst(x, y, z, col, 8, 3.2, false); }

  let audio = null, master = null, bgmOn = false, beatAt = 0, beat = 0;
  const MELODY = [196, 233, 174, 220, 146, 196, 164, 220];
  function ac() {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      if (!audio) audio = new AC();
      if (audio.state === 'suspended') audio.resume().catch(function () {});
      if (!master) {
        master = audio.createGain();
        master.gain.value = save.mute ? 0 : 1;
        master.connect(audio.destination);
      }
      return audio;
    } catch (e) { return null; }
  }
  function tone(type, f, dur, gain, slide) {
    try {
    const a = ac(); if (!a || save.mute) return;
    const o = a.createOscillator();
    const g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(40, f), a.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), a.currentTime + dur);
    g.gain.setValueAtTime(gain, a.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, a.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(a.currentTime + dur + 0.02);
    } catch (e) { /* audio */ }
  }
  function noise(dur, gain, freq) {
    try {
    const a = ac(); if (!a || save.mute) return;
    const n = Math.floor(a.sampleRate * dur);
    const buf = a.createBuffer(1, n, a.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = a.createBufferSource();
    src.buffer = buf;
    const filter = a.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = a.createGain();
    g.gain.value = gain;
    src.connect(filter); filter.connect(g); g.connect(master);
    src.start();
    } catch (e) { /* audio */ }
  }
  function sfx(kind) {
    if (kind === 'rifle') { noise(0.12, 0.35, 900); tone('sawtooth', 180, 0.09, 0.08, 70); }
    else if (kind === 'thwip') { noise(0.05, 0.18, 1800); tone('sine', 520, 0.04, 0.04, 220); }
    else if (kind === 'laser') { tone('square', 880, 0.09, 0.05, 2100); }
    else if (kind === 'boom') { noise(0.32, 0.45, 180); tone('sine', 70, 0.34, 0.12, 40); }
    else if (kind === 'ding') { tone('sine', 1320, 0.09, 0.06, 880); }
    else if (kind === 'chime') { tone('sine', 880, 0.12, 0.06); tone('triangle', 1320, 0.18, 0.05); }
    else if (kind === 'beep') { tone('square', 740, 0.1, 0.04); }
    else if (kind === 'ui') { tone('sine', 660, 0.05, 0.03, 990); }
  }
  function sfxFire(kind, quiet) {
    if (quiet) sfx('thwip');
    else if (kind === 'laser') sfx('laser');
    else if (kind === 'heavy') sfx('boom');
    else sfx('rifle');
  }
  function tickBgm() {
    const a = ac(); if (!a) return;
    if (!bgmOn) {
      bgmOn = true;
      const o = a.createOscillator();
      o.type = 'sine'; o.frequency.value = 82;
      const g = a.createGain(); g.gain.value = 0.03;
      o.connect(g); g.connect(master); o.start();
      const o2 = a.createOscillator();
      o2.type = 'triangle'; o2.frequency.value = 123.5;
      const g2 = a.createGain(); g2.gain.value = 0.012;
      o2.connect(g2); g2.connect(master); o2.start();
      beatAt = a.currentTime + 0.2;
    }
    if (save.mute) return;
    if (a.currentTime + 0.05 >= beatAt) {
      if (beatAt < a.currentTime - 1) beatAt = a.currentTime;
      tone('triangle', MELODY[beat % MELODY.length] * (beat % 8 < 4 ? 1 : 0.5), 0.22, 0.018);
      beat++;
      beatAt += 0.34;
    }
  }
  function toggleMute() {
    save.mute = !save.mute;
    writeSave();
    if (master) master.gain.value = save.mute ? 0 : 1;
    $('btnMute').textContent = save.mute ? 'MUTED' : 'SOUND';
  }

  function living() {
    let n = 0;
    for (let i = 0; i < targets.length; i++) if (targets[i].alive && targets[i].counts) n++;
    return n;
  }
  function starStr(n) {
    n = n | 0;
    return '★★★☆☆☆'.slice(n, n + 3);
  }

  function endRun(win, why) {
    if (ended || mode !== 'play') return;
    ended = true;
    mode = 'debrief';
    const acc = shots ? hits / shots : 0;
    const timeUsed = Math.max(0, course.time - timeLeft);
    const bmul = loadout === 'rifle' ? 1.5 : 1;
    let score = Math.round(destroyed * 120 + bullseyes * 80 * bmul + acc * 220 - timeUsed * 1.2 - alerts * 40);
    if (score < 0) score = 0;
    let stars = 0;
    if (win) {
      stars = 1;
      if (acc >= 0.5 && alerts === 0) stars = 2;
      if (acc >= 0.62 && bullseyes >= 1 && timeUsed <= course.par && alerts === 0) stars = 3;
    }
    result = { win, why: why || (win ? 'clear' : 'time'), score, stars, acc, timeUsed };
    const prev = save.best[course.id];
    if (win && (!prev || score >= prev.score)) {
      save.best[course.id] = { score, stars, acc: Math.round(acc * 100), bullseyes };
      writeSave();
    }
    const quotes = {
      clear: 'Clean work. That is how we drill.',
      time: 'The clock won. Run it back, eyes up.',
      alert: 'They lit you up. Quieter feet next pass.',
    };
    $('debriefTitle').textContent = win ? 'COURSE CLEAR' : 'RUN FAILED';
    $('debriefStars').textContent = starStr(stars);
    $('debriefQuote').textContent = quotes[result.why] || quotes.time;
    $('debriefStats').innerHTML =
      '<li><span>SCORE</span>' + score + '</li>' +
      '<li><span>ACCURACY</span>' + Math.round(acc * 100) + '%</li>' +
      '<li><span>BULLSEYES</span>' + bullseyes + '</li>' +
      '<li><span>TIME</span>' + timeUsed.toFixed(1) + 's</li>' +
      '<li><span>ALERTS</span>' + alerts + '</li>' +
      '<li><span>KIT</span>' + kitName() + '</li>';
    $('btnNext').hidden = !(win && courseIndex < COURSES.length - 1);
    openScreen('debrief');
    sfx(win ? 'chime' : 'ding');
  }

  function kitName() {
    return { rifle: 'PRECISION RIFLE', stealth: 'STEALTH CARBINE', laser: 'LASER MARKSMAN', heavy: 'HEAVY LAUNCHER' }[loadout];
  }

  function damageTarget(t, hit, spec) {
    if (!t.alive) return false;
    shotContact = true;
    const splashing = !!(spec && spec.fromSplash);
    if (t.k === 'robot' && !hit.weak && !splashing) {
      spark(hit.x, hit.y, hit.z, [0.9, 0.75, 0.4]);
      sfx('ding');
      t.flash = 0.08;
      return false;
    }
    t.alive = false;
    destroyed++;
    const head = !!(hit.head || hit.weak);
    if (head) bullseyes++;
    const col = t.k === 'drone' ? [0.45, 0.95, 1] : t.k === 'robot' ? [1, 0.45, 0.85] : [1, 0.84, 0.42];
    burst(t.x, (hit.y || 1.2), t.z, col, 30, 6.5, true);
    burst(t.x, (hit.y || 1.2) + 0.2, t.z, [1, 1, 1], 10, 4.2, false);
    sfx(head ? 'chime' : 'ding');
    const dist = Math.hypot(t.x - player.x, t.z - player.z);
    if (head && dist > 8) { slowT = 0.5; zoomKick = 1; }
    if (living() === 0) endRun(true);
    return true;
  }

  function splashAt(x, y, z, radius) {
    burst(x, y, z, [1, 0.72, 0.35], 26, 7, true);
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.alive) continue;
      const cy = t.k === 'drone' ? t.y : 1.1;
      const d = Math.hypot(t.x - x, cy - y, t.z - z);
      if (d <= radius) damageTarget(t, { x: t.x, y: cy, z: t.z, head: false, weak: false }, { fromSplash: true, splash: radius });
    }
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (!w.alive) continue;
      if (Math.hypot(w.x - x, w.z - z) <= radius + 0.4) {
        w.hp -= 4;
        if (w.hp <= 0) {
          w.alive = false;
          if (w.blocker) w.blocker.on = false;
          burst(w.x, w.sy * 0.5, w.z, [0.8, 0.85, 0.9], 16, 4, false);
        }
      }
    }
  }

  function travel(p0, p1, spec) {
    const events = [];
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (!w.alive) continue;
      const h = segAABB(p0, p1, w);
      if (h) events.push({ t: h.t, wall: w, x: h.x, y: h.y, z: h.z });
    }
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      const h = targetHit(t, p0, p1);
      if (h) events.push({ t: h.t, target: t, hit: h, x: h.x, y: h.y, z: h.z });
    }
    events.sort((a, b) => a.t - b.t);
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (e.wall) {
        spark(e.x, e.y, e.z, [1, 0.8, 0.45]);
        if (spec.pierce) {
          e.wall.hp -= 3;
          if (e.wall.hp <= 0) {
            e.wall.alive = false;
            if (e.wall.blocker) e.wall.blocker.on = false;
            burst(e.x, e.y, e.z, [0.85, 0.88, 0.92], 18, 4.5, true);
          }
          continue;
        }
        return { stop: true, x: e.x, y: e.y, z: e.z };
      }
      if (e.target) {
        damageTarget(e.target, e.hit, spec);
        if (spec.splash > 0) splashAt(e.x, e.y, e.z, spec.splash);
        return { stop: true, x: e.x, y: e.y, z: e.z };
      }
    }
    return null;
  }

  function aimSway() {
    if (manual) return { y: 0, p: 0 };
    const scopedNow = mode === 'play' && (scopeLatch || keys.scopeHold || padScope);
    let amp = 0.0007;
    if (scopedNow) amp = (keys.breath || padBreath) && breath > 0.02 && exhale <= 0 ? 0.00012 : 0.0036;
    else if (player.speed > 0.45) amp = 0.0015;
    if (exhale > 0) amp = 0.0055;
    return { y: Math.sin(simT * 1.7) * amp, p: Math.cos(simT * 1.3) * amp * 0.65 };
  }

  function poseFrom(yaw, pitch, scopedNow) {
    const fx = Math.sin(yaw), fz = Math.cos(yaw);
    const rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const sh = shake * Math.sin(simT * 42);
    let ex, ey, ez, fov;
    if (!inRun) {
      ex = 2.35; ey = 1.38; ez = 4.7;
      const lx = 2.15, ly = 1.12, lz = 8.15;
      return { ex, ey, ez, lx, ly, lz, fov: 36 * DEG, yaw, pitch, scoped: false };
    }
    if (scopedNow) {
      ey = player.crouch ? 1.2 : 1.58;
      ex = player.x + fx * 0.35 + sh;
      ez = player.z + fz * 0.35;
      fov = FOV[loadout];
    } else {
      const back = 3.85, side = 0.42;
      ex = player.x - fx * back - rx * side + sh;
      ey = (player.crouch ? 1.28 : 1.72) - player.crouchBlend * 0.22;
      ez = player.z - fz * back - rz * side;
      fov = FOV.hip;
    }
    fov *= (1 - 0.3 * Math.max(0, zoomKick));
    const cosP = Math.cos(pitch), sinP = Math.sin(pitch);
    return {
      ex, ey, ez,
      lx: ex + Math.sin(yaw) * cosP,
      ly: ey + sinP,
      lz: ez + Math.cos(yaw) * cosP,
      fov, yaw, pitch, scoped: !!scopedNow,
    };
  }
  function currentPose() {
    const sw = aimSway();
    const scopedNow = mode === 'play' && (scopeLatch || keys.scopeHold || padScope);
    return poseFrom(player.yaw + sw.y, clampPitch(player.pitch + sw.p), scopedNow);
  }

  function fire(force) {
    if (mode !== 'play') return false;
    const kind = loadout;
    if (!force && simT - lastFireT < COOL[kind]) return false;
    if (kind === 'laser' && overheat > 0) return false;
    lastFireT = simT;
    shots++;
    shotContact = false;
    const quiet = kind === 'stealth' || (kind === 'rifle' && suppressed);
    const pose = currentPose();
    let dx = pose.lx - pose.ex, dy = pose.ly - pose.ey, dz = pose.lz - pose.ez;
    let len = Math.hypot(dx, dy, dz) || 1;
    dx /= len; dy /= len; dz /= len;
    if (!pose.scoped && !manual) {
      dx += (Math.random() - 0.5) * 0.018;
      dy += (Math.random() - 0.5) * 0.012;
      dz += (Math.random() - 0.5) * 0.018;
      len = Math.hypot(dx, dy, dz) || 1;
      dx /= len; dy /= len; dz /= len;
    }
    const origin = { x: pose.ex + dx * 0.2, y: pose.ey + dy * 0.2, z: pose.ez + dz * 0.2 };
    const splash = kind === 'heavy' ? (charged ? 4.3 : 2.7) : 0;
    lastShot = {
      kind, hitscan: kind === 'laser', quiet, pierce: kind === 'heavy',
      splash, drop: DROP[kind], scoped: !!pose.scoped,
    };
    const far = { x: origin.x + dx * 90, y: origin.y + dy * 90, z: origin.z + dz * 90 };
    if (kind === 'laser') {
      heat = Math.min(1.05, heat + 0.22);
      if (heat >= 1) { heat = 1; overheat = 1.25; }
      const hit = travel(origin, far, lastShot);
      const end = hit || far;
      beam = { x0: muzzleWorld.x, y0: muzzleWorld.y, z0: muzzleWorld.z, x1: end.x, y1: end.y, z1: end.z, life: 0.08 };
    } else {
      let slot = null;
      for (let i = 0; i < bullets.length; i++) if (!bullets[i].alive) { slot = bullets[i]; break; }
      if (slot) {
        const sp = SPEED[kind];
        slot.alive = true;
        slot.x = origin.x; slot.y = origin.y; slot.z = origin.z;
        slot.vx = dx * sp; slot.vy = dy * sp; slot.vz = dz * sp;
        slot.life = 1.6; slot.kind = kind; slot.wf = WIND[kind]; slot.drop = DROP[kind];
        slot.pierce = kind === 'heavy'; slot.splash = splash;
      }
      if (charged && kind === 'heavy') charged = false;
    }
    if (shotContact) hits++;
    shotContact = false;
    sfxFire(kind, quiet);
    if (!quiet) alertShots();
    muzzleT = 0.06;
    shake = kind === 'heavy' ? 0.16 : 0.045;
    return true;
  }

  function alertShots() {
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.alive || t.k !== 'drone') continue;
      const d = Math.hypot(t.x - player.x, t.z - player.z);
      if (d < 22) {
        t.yawLock = simT + 1.4;
        t.alert = Math.min(1, t.alert + 0.45);
        t.faceX = player.x; t.faceZ = player.z;
        if (t.alert >= 1 && !t.pinged) {
          t.pinged = true;
          alerts++;
          sfx('beep');
          if (course.stealth && alerts >= (course.maxAlerts || 3)) endRun(false, 'alert');
        }
      }
    }
  }

  function useGadget() {
    if (mode !== 'play') return false;
    if (loadout === 'rifle') { suppressed = !suppressed; sfx('ui'); return true; }
    if (loadout === 'stealth') {
      if (simT < decoyCD) return false;
      const yaw = player.yaw;
      decoy.x = player.x + Math.sin(yaw) * 12;
      decoy.z = player.z + Math.cos(yaw) * 12;
      decoy.life = 5.5;
      decoyCD = simT + 7.5;
      sfx('beep');
      return true;
    }
    if (loadout === 'laser') { heat = Math.max(0, heat - 0.6); overheat = 0; sfx('ui'); return true; }
    if (loadout === 'heavy') { charged = true; sfx('ui'); return true; }
    return false;
  }

  function tickDrone(t, dt) {
    const locked = decoy.life > 0 && (decoy.x - t.x) ** 2 + (decoy.z - t.z) ** 2 < 26 * 26;
    if (locked) {
      t.yaw = Math.atan2(decoy.x - t.x, decoy.z - t.z);
    } else if (t.yawLock && simT < t.yawLock) {
      t.yaw = Math.atan2((t.faceX || player.x) - t.x, (t.faceZ || player.z) - t.z);
    } else if (t.path && t.path.length) {
      const wp = t.path[t.wi % t.path.length];
      const dx = wp[0] - t.x, dz = wp[1] - t.z;
      const d = Math.hypot(dx, dz) || 1e-4;
      const step = Math.min(d, t.spd * dt);
      t.x += dx / d * step;
      t.z += dz / d * step;
      t.yaw = Math.atan2(dx, dz);
      if (d < 0.25) t.wi = (t.wi + 1) % t.path.length;
    } else t.yaw = t.yaw || 0;
    t.y = 2.05 + Math.sin(simT * 1.5 + t.phase) * 0.12;
    if (mode !== 'play') return;
    const veiled = loadout === 'stealth' && player.crouch && player.speed < 0.45;
    if (veiled) { t.alert = Math.max(0, t.alert - dt * 0.4); return; }
    let range = 13.5;
    if (player.crouch) range *= 0.55;
    const dx = player.x - t.x, dz = player.z - t.z;
    const dist = Math.hypot(dx, dz);
    if (dist > range || Math.abs(wrapAng(Math.atan2(dx, dz) - (t.yaw || 0))) > 0.52 || losBlocked(t.x, t.z, player.x, player.z)) {
      t.alert = Math.max(0, t.alert - dt * 0.3);
      if (t.alert <= 0) t.pinged = false;
      return;
    }
    t.alert = Math.min(1, t.alert + dt * 0.6);
    if (t.alert >= 1 && !t.pinged) {
      t.pinged = true;
      alerts++;
      sfx('beep');
      if (course.stealth && alerts >= (course.maxAlerts || 3)) endRun(false, 'alert');
    }
  }

  function simulate(raw) {
    let dt = raw;
    if (dt > 0.05) dt = 0.05;
    if (dt < 0) dt = 0;
    simT += dt;
    const scale = slowT > 0 ? 0.22 : ((mode === 'play' && (scopeLatch || keys.scopeHold || padScope) && (keys.breath || padBreath) && breath > 0.02 && exhale <= 0) ? 0.62 : 1);
    if (slowT > 0) slowT -= dt;
    timeScale = scale;
    const sdt = dt * scale;
    zoomKick *= Math.max(0, 1 - dt * 2.6);
    shake *= Math.max(0, 1 - dt * 7);
    if (muzzleT > 0) muzzleT -= dt;
    if (beam && beam.life > 0) beam.life -= dt;
    if (decoy.life > 0) decoy.life -= sdt;
    player.crouchBlend += ((player.crouch ? 1 : 0) - player.crouchBlend) * Math.min(1, sdt * 8);

    if (mode === 'play') {
      pollPad();
      const breathing = (scopeLatch || keys.scopeHold || padScope) && (keys.breath || padBreath) && exhale <= 0;
      if (breathing && breath > 0) {
        breath -= dt * 0.28;
        if (breath <= 0) { breath = 0; exhale = 0.85; }
      } else {
        breath = Math.min(1, breath + dt * 0.2);
        if (exhale > 0) exhale -= dt;
      }
      if (overheat > 0) overheat -= dt;
      else heat = Math.max(0, heat - dt * 0.28);

      let ix = (keys.right ? 1 : 0) - (keys.left ? 1 : 0) + stickL.x + padX;
      let iz = (keys.forward ? 1 : 0) - (keys.back ? 1 : 0) - stickL.y - padZ;
      const mag = Math.hypot(ix, iz);
      if (mag > 1) { ix /= mag; iz /= mag; }
      const yaw = player.yaw;
      const mx = (Math.sin(yaw) * iz + Math.cos(yaw) * ix);
      const mz = (Math.cos(yaw) * iz - Math.sin(yaw) * ix);
      const spd = (player.crouch ? 2.35 : 4.7);
      player.speed = Math.hypot(mx, mz) * spd;
      const nx = player.x + mx * spd * sdt;
      if (!blocked(nx, player.z)) player.x = nx;
      const nz = player.z + mz * spd * sdt;
      if (!blocked(player.x, nz)) player.z = nz;
      player.yaw += (stickR.x + padYaw) * dt * 1.65;
      player.pitch = clampPitch(player.pitch - (stickR.y + padPitch) * dt * 1.25);

      if (keys.fire || padFire) fire(false);
      timeLeft -= sdt;
      if (timeLeft <= 0) { timeLeft = 0; endRun(false, 'time'); }
    }

    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.alive) continue;
      if (t.k === 'drone') tickDrone(t, mode === 'play' ? sdt : dt * 0.5);
      else if (mode === 'play' || !inRun) {
        if (t.k === 'slider') t.x = t.x0 + Math.sin(simT * t.slide + t.phase) * t.amp;
        if (t.k === 'spinner') t.ang = simT * t.spin;
        if (t.pop) { t.up = Math.sin(simT * t.pop + t.phase) > -0.1; t.y = t.up ? 0 : -2.6; }
      }
      if (t.flash > 0) t.flash -= dt;
    }

    const wind = course.wind || [0, 0];
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      if (!b.alive) continue;
      const p0 = { x: b.x, y: b.y, z: b.z };
      b.vy -= 9.8 * b.drop * sdt;
      b.x += (b.vx + wind[0] * b.wf) * sdt;
      b.y += b.vy * sdt;
      b.z += (b.vz + wind[1] * b.wf) * sdt;
      b.life -= sdt;
      shotContact = false;
      const stop = travel(p0, { x: b.x, y: b.y, z: b.z }, b);
      if (shotContact) hits++;
      shotContact = false;
      if (stop || b.y < 0 || b.life <= 0) {
        if (!stop && b.y < 0 && b.splash > 0) splashAt(b.x, 0.2, b.z, b.splash);
        b.alive = false;
      }
    }
    for (let i = 0; i < PMAX; i++) {
      if (P.life[i] <= 0) continue;
      P.life[i] -= sdt;
      P.vy[i] -= 6 * sdt;
      P.x[i] += P.vx[i] * sdt;
      P.y[i] += P.vy[i] * sdt;
      P.z[i] += P.vz[i] * sdt;
    }
    if (!save.mute) tickBgm();
  }

  function drawGun(parent) {
    const k = loadout;
    if (k === 'rifle') {
      addPrim(batch, PRIM.box, parent, 0, 0, -0.28, 0, 0, 0, 0.09, 0.12, 0.32, COL.wood, 0);
      addPrim(batch, PRIM.box, parent, 0, 0.03, 0.12, 0, 0, 0, 0.08, 0.1, 0.5, COL.gun, 0);
      addPrim(batch, PRIM.box, parent, 0, 0.045, 0.62, 0, 0, 0, 0.04, 0.04, 0.62, COL.steel, 0.08);
      addPrim(batch, PRIM.cyl, parent, 0, 0.12, 0.08, Math.PI / 2, 0, 0, 0.055, 0.26, 0.055, [0.08, 0.1, 0.12], 0.1);
    } else if (k === 'stealth') {
      addPrim(batch, PRIM.box, parent, 0, 0, -0.08, 0, 0, 0, 0.07, 0.1, 0.28, [0.08, 0.09, 0.1], 0);
      addPrim(batch, PRIM.box, parent, 0, 0.02, 0.18, 0, 0, 0, 0.045, 0.045, 0.28, COL.gun, 0);
      addPrim(batch, PRIM.cyl, parent, 0, 0.02, 0.4, Math.PI / 2, 0, 0, 0.055, 0.2, 0.055, [0.07, 0.08, 0.09], 0);
    } else if (k === 'laser') {
      addPrim(batch, PRIM.box, parent, 0, 0, 0.02, 0, 0, 0, 0.08, 0.08, 0.36, [0.82, 0.88, 0.92], 0.1);
      addPrim(batch, PRIM.box, parent, 0, 0.02, 0.36, 0, 0, 0, 0.03, 0.03, 0.36, COL.cyan, 1.1);
      addPrim(batch, PRIM.box, parent, 0.06, 0, 0.05, 0, 0, 0, 0.02, 0.1, 0.18, [0.7, 0.78, 0.84], 0.2);
    } else {
      addPrim(batch, PRIM.box, parent, 0, 0, -0.05, 0, 0, 0, 0.14, 0.14, 0.34, [0.16, 0.14, 0.13], 0);
      addPrim(batch, PRIM.cyl, parent, 0, 0.02, 0.28, Math.PI / 2, 0, 0, 0.09, 0.36, 0.09, [0.2, 0.18, 0.16], 0);
      addPrim(batch, PRIM.cyl, parent, 0, 0.02, 0.18, Math.PI / 2, 0, 0, 0.12, 0.05, 0.12, COL.orange, 0.7);
      addPrim(batch, PRIM.cyl, parent, 0, 0.02, 0.36, Math.PI / 2, 0, 0, 0.12, 0.05, 0.12, COL.orange, 0.7);
    }
  }

  function drawCharacter() {
    const scopedNow = mode === 'play' && (scopeLatch || keys.scopeHold || padScope);
    if (scopedNow) {
      const yaw = player.yaw;
      muzzleWorld = { x: player.x + Math.sin(yaw) * 0.45, y: player.crouch ? 1.2 : 1.55, z: player.z + Math.cos(yaw) * 0.45 };
      headWorld = { x: player.x, y: 1.66, z: player.z };
      chestWorld = { x: player.x, y: 1.2, z: player.z };
      return;
    }
    if (!inRun) {
      player.x = 1.45; player.z = 8.2; player.yaw = -2.55; player.pitch = 0; player.crouchBlend = 0;
    }
    const k = player.crouchBlend;
    const drop = 0.4 * k;
    const bob = Math.sin(simT * 2.3) * (player.speed > 0.35 ? 0.035 : 0.01);
    const swing = Math.sin(simT * 7.5) * Math.min(1, player.speed / 3.4) * 0.45;
    setTRS(MAT.root, player.x, bob, player.z, 0, player.yaw, 0, 1, 1, 1);
    const R = MAT.root;
    function part(prim, x, y, z, rx, ry, rz, sx, sy, sz, color, emi) {
      addPrim(batch, prim, R, x, y, z, rx, ry, rz, sx, sy, sz, color, emi || 0);
    }
    part(PRIM.box, 0, 1.22 - drop, 0, 0, 0, 0, 0.42, 0.48, 0.24, COL.suit, 0.04);
    part(PRIM.box, 0, 0.96 - drop * 0.55, 0, 0, 0, 0, 0.36, 0.18, 0.22, COL.suitD, 0);
    part(PRIM.box, 0, 0.98 - drop * 0.4, 0.02, 0, 0, 0, 0.4, 0.08, 0.16, COL.strap, 0);
    part(PRIM.sphere, 0, 1.24 - drop, 0.13, 0, 0, 0, 0.05, 0.05, 0.05, COL.glow, 1.15);
    part(PRIM.box, -0.08, 1.34 - drop, 0.08, 0.45, 0, 0.15, 0.045, 0.42, 0.05, COL.strap, 0);
    part(PRIM.box, 0.08, 1.34 - drop, 0.08, -0.45, 0, -0.15, 0.045, 0.42, 0.05, COL.strap, 0);
    part(PRIM.cyl, -0.11, 1.22 - drop, -0.18, 0, 0, 0, 0.075, 0.4, 0.075, COL.tank, 0.08);
    part(PRIM.cyl, 0.11, 1.22 - drop, -0.18, 0, 0, 0, 0.075, 0.4, 0.075, COL.tank, 0.08);
    part(PRIM.box, 0, 1.38 - drop, -0.16, 0, 0, 0, 0.28, 0.06, 0.06, COL.strap, 0);
    const hy = 1.66 - drop * 0.85;
    part(PRIM.sphere, 0, hy, 0, 0, 0, 0, 0.23, 0.23, 0.23, COL.head, 0.34);
    part(PRIM.sphere, -0.08, hy + 0.03, 0.18, 0, 0, 0, 0.045, 0.04, 0.04, COL.eye, 0);
    part(PRIM.sphere, 0.08, hy + 0.03, 0.18, 0, 0, 0, 0.045, 0.04, 0.04, COL.eye, 0);
    part(PRIM.sphere, -0.07, hy + 0.045, 0.2, 0, 0, 0, 0.016, 0.016, 0.016, COL.white, 0.4);
    part(PRIM.sphere, 0.09, hy + 0.045, 0.2, 0, 0, 0, 0.016, 0.016, 0.016, COL.white, 0.4);
    part(PRIM.sphere, -0.15, hy - 0.05, 0.12, 0, 0, 0, 0.055, 0.045, 0.04, COL.cheek, 0.2);
    part(PRIM.sphere, 0.15, hy - 0.05, 0.12, 0, 0, 0, 0.055, 0.045, 0.04, COL.cheek, 0.2);
    part(PRIM.box, 0, hy - 0.09, 0.2, 0, 0, 0, 0.11, 0.035, 0.03, COL.white, 0.15);
    part(PRIM.box, 0, hy - 0.09, 0.185, 0, 0, 0, 0.09, 0.028, 0.02, COL.mouth, 0);
    part(PRIM.cyl, 0, hy + 0.2, 0, 0, 0, 0, 0.36, 0.035, 0.36, COL.hat, 0);
    part(PRIM.cyl, 0, hy + 0.3, 0, 0, 0, 0, 0.16, 0.16, 0.16, COL.hat, 0);
    part(PRIM.cyl, 0, hy + 0.22, 0, 0, 0, 0, 0.17, 0.045, 0.17, COL.band, 0);
    part(PRIM.box, -0.2, hy + 0.2, 0.02, 0, 0, 0, 0.012, 0.055, 0.07, COL.badge, 0.45);
    const thighH = 0.34 - 0.08 * k;
    const shinH = 0.28;
    part(PRIM.box, -0.12, 0.16 + shinH + thighH * 0.5, 0.06 * k, swing * 0.3 + 0.4 * k, 0, 0, 0.13, thighH, 0.13, COL.suit, 0);
    part(PRIM.box, 0.12, 0.16 + shinH + thighH * 0.5, -0.02 * k, -swing * 0.3 + 0.15 * k, 0, 0, 0.13, thighH, 0.13, COL.suit, 0);
    part(PRIM.box, -0.12, 0.16 + shinH * 0.5, 0.05 * k, 0, 0, 0, 0.12, shinH, 0.12, COL.suit, 0);
    part(PRIM.box, 0.12, 0.16 + shinH * 0.5, 0.02 * k, 0, 0, 0, 0.12, shinH, 0.12, COL.suit, 0);
    part(PRIM.box, -0.12, 0.46, 0.08, 0, 0, 0, 0.14, 0.1, 0.12, COL.strap, 0);
    part(PRIM.box, 0.12, 0.46, 0.06, 0, 0, 0, 0.14, 0.1, 0.12, COL.strap, 0);
    part(PRIM.box, -0.12, 0.1, 0.03, 0, 0, 0, 0.13, 0.18, 0.22, COL.boot, 0);
    part(PRIM.box, 0.12, 0.1, 0.03, 0, 0, 0, 0.13, 0.18, 0.22, COL.boot, 0);
    part(PRIM.box, -0.12, 0.16, 0.04, 0, 0, 0, 0.14, 0.06, 0.16, COL.bootT, 0.05);
    part(PRIM.box, 0.12, 0.16, 0.04, 0, 0, 0, 0.14, 0.06, 0.16, COL.bootT, 0.05);
    part(PRIM.box, -0.26, 1.28 - drop, 0.02, 0.7, 0, 0.2, 0.1, 0.28, 0.1, COL.suit, 0);
    part(PRIM.box, 0.26, 1.28 - drop, 0.02, 0.9, 0, -0.2, 0.1, 0.28, 0.1, COL.suit, 0);
    setTRS(MAT.local, -0.4, 1.22 - drop, 0.18, player.pitch * 0.55, -0.55, 0, 1, 1, 1);
    mul(MAT.gun, MAT.root, MAT.local);
    drawGun(MAT.gun);
    addPrim(batch, PRIM.sphere, MAT.gun, 0.07, -0.03, 0.02, 0, 0, 0, 0.07, 0.06, 0.07, COL.glove, 0);
    addPrim(batch, PRIM.sphere, MAT.gun, -0.02, -0.03, 0.2, 0, 0, 0, 0.065, 0.055, 0.065, COL.glove, 0);
    const muzzleLocal = { rifle: [0, 0.045, 0.94], stealth: [0, 0.02, 0.52], laser: [0, 0.02, 0.54], heavy: [0, 0.02, 0.48] }[loadout];
    muzzleWorld = xform(MAT.gun, muzzleLocal[0], muzzleLocal[1], muzzleLocal[2]);
    headWorld = xform(MAT.root, 0, hy, 0);
    chestWorld = xform(MAT.root, 0, 1.2 - drop, 0.1);
    if (muzzleT > 0) {
      const flash = loadout === 'laser' ? COL.cyan : loadout === 'heavy' ? COL.orange : [1, 0.9, 0.6];
      addPrim(batch, PRIM.sphere, null, muzzleWorld.x, muzzleWorld.y, muzzleWorld.z, 0, 0, 0, 0.08, 0.08, 0.08, flash, 1.2);
    }
    addPrim(batch, PRIM.cyl, null, player.x, 0.025, player.z, 0, 0, 0, 0.34, 0.015, 0.28, [0.18, 0.14, 0.1], 0);
  }

  function drawTargets() {
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.alive) continue;
      if ((t.k === 'dummy' || t.k === 'slider') && t.y < -1) continue;
      const tint = t.flash > 0 ? [1.7, 1.7, 1.6] : [1, 1, 1];
      if (t.k === 'dummy' || t.k === 'slider') addBaked(batch, baked.dummy, t.x, t.y, t.z, 0, Math.PI, 0, tint, 0);
      else if (t.k === 'spinner') addBaked(batch, baked.spin, t.x, 1.35, t.z, 0, t.ang || 0, 0, tint, 0);
      else if (t.k === 'drone') {
        addBaked(batch, baked.drone, t.x, t.y, t.z, 0, t.yaw || 0, 0, tint, 0.15 + Math.sin(simT * 6 + t.phase) * 0.1);
        addPrim(batch, PRIM.cyl, null, t.x, 0.04, t.z, 0, 0, 0, 0.4, 0.02, 0.4, [0.02, 0.03, 0.05], 0);
      } else if (t.k === 'robot') {
        addBaked(batch, baked.robot, t.x, t.y, t.z, 0, Math.PI, 0, tint, 0);
        const w = facePoint(t, 0, 1.62, 0.48);
        const pulse = 0.08 + Math.sin(simT * 5 + t.phase) * 0.015;
        addPrim(batch, PRIM.sphere, null, w.x, w.y, w.z, 0, 0, 0, pulse, pulse, pulse, COL.glow, 1.3);
        addPrim(batch, PRIM.cyl, null, t.x, 0.03, t.z, 0, 0, 0, 0.5, 0.02, 0.5, [0.02, 0.02, 0.03], 0);
      }
    }
    for (let i = 0; i < walls.length; i++) {
      const w = walls[i];
      if (!w.alive) continue;
      addPrim(batch, PRIM.box, null, w.x, w.sy * 0.5, w.z, 0, 0, 0, w.sx, w.sy, w.sz, [0.45, 0.48, 0.52], 0);
      addPrim(batch, PRIM.box, null, w.x, w.sy * 0.72, w.z, 0, 0, 0, w.sx * 0.96, w.sy * 0.12, w.sz + 0.02, COL.orange, 0.15);
    }
    for (let i = 0; i < bullets.length; i++) {
      const b = bullets[i];
      if (!b.alive) continue;
      const cam = currentPose();
      if (Math.hypot(b.x - cam.ex, b.y - cam.ey, b.z - cam.ez) < 0.9) continue;
      const col = b.kind === 'heavy' ? COL.orange : [1, 0.92, 0.7];
      const r = b.kind === 'heavy' ? 0.12 : 0.05;
      addPrim(batch, PRIM.sphere, null, b.x, b.y, b.z, 0, 0, 0, r, r, r, col, 1);
    }
    if (decoy.life > 0) {
      const p = 0.12 + Math.sin(simT * 10) * 0.03;
      addPrim(batch, PRIM.sphere, null, decoy.x, 0.8, decoy.z, 0, 0, 0, p, p, p, [0.6, 1, 0.85], 1);
      addPrim(batch, PRIM.cyl, null, decoy.x, 0.05, decoy.z, 0, 0, 0, 0.55, 0.03, 0.55, [0.3, 0.9, 0.7], 0.4);
    }
    if (beam && beam.life > 0) {
      const dx = beam.x1 - beam.x0, dy = beam.y1 - beam.y0, dz = beam.z1 - beam.z0;
      const len = Math.hypot(dx, dy, dz) || 0.001;
      const lx = dx / len, ly = dy / len, lz = dz / len;
      let ux = 0, uy = 1, uz = 0;
      if (Math.abs(ly) > 0.85) { ux = 1; uy = 0; uz = 0; }
      let rx = uy * lz - uz * ly, ry = uz * lx - ux * lz, rz = ux * ly - uy * lx;
      const rl = Math.hypot(rx, ry, rz) || 1;
      rx /= rl; ry /= rl; rz /= rl;
      ux = ly * rz - lz * ry; uy = lz * rx - lx * rz; uz = lx * ry - ly * rx;
      const m = MAT.out;
      const th = 0.035;
      m[0] = rx * th; m[1] = ry * th; m[2] = rz * th; m[3] = 0;
      m[4] = ux * th; m[5] = uy * th; m[6] = uz * th; m[7] = 0;
      m[8] = lx * len; m[9] = ly * len; m[10] = lz * len; m[11] = 0;
      m[12] = (beam.x0 + beam.x1) * 0.5; m[13] = (beam.y0 + beam.y1) * 0.5; m[14] = (beam.z0 + beam.z1) * 0.5; m[15] = 1;
      normalFrom(m, MAT.nrm);
      appendMesh(batch, PRIM.box, m, MAT.nrm, COL.cyan[0], COL.cyan[1], COL.cyan[2], 1.2, false);
    }
  }

  function uploadDyn() {
    gl.bindBuffer(gl.ARRAY_BUFFER, dynGL.pos);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, batch.pos.subarray(0, batch.nv * 3));
    gl.bindBuffer(gl.ARRAY_BUFFER, dynGL.nrm);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, batch.nrm.subarray(0, batch.nv * 3));
    gl.bindBuffer(gl.ARRAY_BUFFER, dynGL.col);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, batch.col.subarray(0, batch.nv * 3));
    gl.bindBuffer(gl.ARRAY_BUFFER, dynGL.emi);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, batch.emi.subarray(0, batch.nv));
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, dynGL.idx);
    gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, batch.idx.subarray(0, batch.ni));
  }

  function bindLit(mesh) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.pos);
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.nrm);
    gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.col);
    gl.vertexAttribPointer(2, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.emi);
    gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, mesh.idx);
  }
  function attribMask(mask) {
    for (let i = 0; i < 4; i++) {
      if (mask & (1 << i)) gl.enableVertexAttribArray(i);
      else gl.disableVertexAttribArray(i);
    }
  }

  function drawCones(pose) {
    const dataP = coneBuf.dataP, dataC = coneBuf.dataC;
    let n = 0;
    const col = course.zone === 'stealth' ? [1, 0.35, 0.75, 0.22] : [0.95, 0.3, 0.55, 0.16];
    for (let i = 0; i < targets.length; i++) {
      const t = targets[i];
      if (!t.alive || t.k !== 'drone') continue;
      const yaw = t.yaw || 0;
      const half = 0.52, range = 13.2, steps = 7;
      if ((n + 1 + steps) * 3 > dataP.length) break;
      const base = n;
      dataP[n * 3] = t.x; dataP[n * 3 + 1] = 0.08; dataP[n * 3 + 2] = t.z;
      dataC[n * 4] = col[0]; dataC[n * 4 + 1] = col[1]; dataC[n * 4 + 2] = col[2]; dataC[n * 4 + 3] = col[3];
      n++;
      for (let s = 0; s <= steps; s++) {
        const a = yaw - half + (half * 2 * s) / steps;
        dataP[n * 3] = t.x + Math.sin(a) * range;
        dataP[n * 3 + 1] = 0.08;
        dataP[n * 3 + 2] = t.z + Math.cos(a) * range;
        dataC[n * 4] = col[0]; dataC[n * 4 + 1] = col[1]; dataC[n * 4 + 2] = col[2]; dataC[n * 4 + 3] = 0.02;
        n++;
      }
      void base;
    }
    coneBuf.n = n;
    if (!n) return;
    gl.useProgram(flatProg.p);
    gl.uniformMatrix4fv(flatProg.uVP, false, MAT.vp);
    attribMask(1 | 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuf.pos);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dataP.subarray(0, n * 3));
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, coneBuf.col);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dataC.subarray(0, n * 4));
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    gl.depthMask(false);
    let cursor = 0;
    for (let i = 0; i < targets.length && cursor < n; i++) {
      const t = targets[i];
      if (!t.alive || t.k !== 'drone') continue;
      gl.drawArrays(gl.TRIANGLE_FAN, cursor, 9);
      cursor += 9;
    }
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function drawParticles() {
    const dp = ptBuf.dataP, dc = ptBuf.dataC;
    let n = 0;
    for (let i = 0; i < PMAX; i++) {
      if (P.life[i] <= 0) continue;
      dp[n * 3] = P.x[i]; dp[n * 3 + 1] = P.y[i]; dp[n * 3 + 2] = P.z[i];
      const a = Math.max(0, P.life[i] / P.max[i]);
      dc[n * 4] = P.r[i]; dc[n * 4 + 1] = P.g[i]; dc[n * 4 + 2] = P.b[i]; dc[n * 4 + 3] = 0.35 + a * 0.9;
      n++;
    }
    ptBuf.n = n;
    if (!n) return;
    gl.useProgram(ptProg.p);
    gl.uniformMatrix4fv(ptProg.uVP, false, MAT.vp);
    attribMask(1 | 2);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf.pos);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dp.subarray(0, n * 3));
    gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);
    gl.bindBuffer(gl.ARRAY_BUFFER, ptBuf.col);
    gl.bufferSubData(gl.ARRAY_BUFFER, 0, dc.subarray(0, n * 4));
    gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 0, 0);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
    gl.depthMask(false);
    gl.drawArrays(gl.POINTS, 0, n);
    gl.depthMask(true);
    gl.disable(gl.BLEND);
  }

  function resize() {
    const w = Math.max(2, stage.clientWidth || 2);
    const h = Math.max(2, stage.clientHeight || 2);
    const dpr = Math.min(window.devicePixelRatio || 1, 1.25);
    const pw = Math.max(2, Math.round(w * dpr));
    const ph = Math.max(2, Math.round(h * dpr));
    if (canvas.width !== pw || canvas.height !== ph) {
      canvas.width = pw; canvas.height = ph;
    }
  }

  function render() {
    resize();
    if (!gl) return;
    const pose = currentPose();
    const aspect = canvas.width / Math.max(1, canvas.height);
    perspective(MAT.proj, pose.fov, aspect, 0.08, 220);
    lookAt(MAT.view, pose.ex, pose.ey, pose.ez, pose.lx, pose.ly, pose.lz);
    mul(MAT.vp, MAT.proj, MAT.view);
    const zone = ZONES[course.zone];
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.clearColor(zone.fog[0], zone.fog[1], zone.fog[2], 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.useProgram(skyProg.p);
    gl.uniform3fv(skyProg.uTop, zone.skyTop);
    gl.uniform3fv(skyProg.uHor, zone.skyHor);
    attribMask(1);
    gl.bindBuffer(gl.ARRAY_BUFFER, skyBuf);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    gl.depthMask(false);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    gl.depthMask(true);

    gl.useProgram(lit.p);
    gl.uniformMatrix4fv(lit.uVP, false, MAT.vp);
    gl.uniform3fv(lit.uLight, LIGHT);
    gl.uniform3fv(lit.uFill, FILL);
    gl.uniform3f(lit.uEye, pose.ex, pose.ey, pose.ez);
    gl.uniform3fv(lit.uFog, zone.fog);
    gl.uniform1f(lit.uFogNear, zone.fogNear);
    gl.uniform1f(lit.uFogFar, zone.fogFar);
    attribMask(15);
    if (worldGL && worldGL.count) {
      bindLit(worldGL);
      gl.drawElements(gl.TRIANGLES, worldGL.count, gl.UNSIGNED_SHORT, 0);
    }
    batch.clear();
    drawCharacter();
    drawTargets();
    if (batch.ni > 0) {
      uploadDyn();
      bindLit(dynGL);
      gl.drawElements(gl.TRIANGLES, batch.ni, gl.UNSIGNED_SHORT, 0);
    }
    drawCones(pose);
    drawParticles();
    projHead = project(headWorld.x, headWorld.y, headWorld.z);
    projChest = project(chestWorld.x, chestWorld.y, chestWorld.z);
    updateHUD(pose);
  }

  function aimQuery() {
    const pose = currentPose();
    const dx = pose.lx - pose.ex, dy = pose.ly - pose.ey, dz = pose.lz - pose.ez;
    const len = Math.hypot(dx, dy, dz) || 1;
    const dir = { x: dx / len, y: dy / len, z: dz / len };
    const p0 = { x: pose.ex, y: pose.ey, z: pose.ez };
    const p1 = { x: p0.x + dir.x * 120, y: p0.y + dir.y * 120, z: p0.z + dir.z * 120 };
    let best = null;
    for (let i = 0; i < targets.length; i++) {
      const h = targetHit(targets[i], p0, p1);
      if (h && (!best || h.t < best.t)) best = h;
    }
    if (!best) return null;
    return Math.hypot(best.x - p0.x, best.y - p0.y, best.z - p0.z);
  }

  function updateHUD(pose) {
    const playing = mode === 'play' || mode === 'pause' || mode === 'debrief';
    hud.hidden = !(mode === 'play' || mode === 'pause');
    const showScope = mode === 'play' && pose.scoped;
    scopeEl.hidden = !showScope;
    reticle.hidden = mode !== 'play' || pose.scoped;
    if (mode === 'play' || mode === 'pause') {
      const z = ZONES[course.zone];
      $('hudName').textContent = course.name.toUpperCase();
      $('hudObj').textContent = course.info;
      const sec = Math.max(0, Math.ceil(timeLeft));
      const mm = Math.floor(sec / 60), ss = sec % 60;
      $('hudTime').textContent = mm + ':' + (ss < 10 ? '0' : '') + ss;
      $('hudTime').classList.toggle('low', timeLeft < 10 && mode === 'play');
      const left = living();
      let leftTxt = left + ' LEFT';
      if (course.stealth) leftTxt += '  ALERT ' + alerts + '/' + (course.maxAlerts || 3);
      const acc = shots ? Math.round((hits / shots) * 100) : 100;
      $('hudLeft').textContent = leftTxt + '  ACC ' + acc + '%';
      let right = kitName();
      if (loadout === 'heavy' && charged) right += ' CHARGED';
      if (decoy.life > 0) right += ' DECOY';
      $('hudRight').textContent = right;
      const heatEl = $('heat');
      if (loadout === 'laser') {
        heatEl.hidden = false;
        heatEl.classList.toggle('hot', overheat > 0);
        heatEl.firstElementChild.style.width = Math.round(heat * 100) + '%';
      } else heatEl.hidden = true;
      const quiet = loadout === 'stealth' || (loadout === 'rifle' && suppressed) || (loadout === 'stealth' && player.crouch && player.speed < 0.45);
      $('quietChip').classList.toggle('on', !!(loadout === 'stealth' || (loadout === 'rifle' && suppressed)));
      $('quietChip').textContent = (loadout === 'stealth' && player.crouch && player.speed < 0.45) ? 'VEILED' : 'QUIET';
      void quiet;
    }
    if (showScope) {
      const dist = aimQuery();
      $('distText').textContent = dist ? Math.round(dist) + ' m' : '— m';
      const wind = course.wind || [0, 0];
      const mag = Math.hypot(wind[0], wind[1]);
      $('windText').textContent = 'WIND ' + mag.toFixed(1);
      const fx = Math.sin(pose.yaw), fz = Math.cos(pose.yaw);
      const rx = Math.cos(pose.yaw), rz = -Math.sin(pose.yaw);
      const right = wind[0] * rx + wind[1] * rz;
      const fwd = wind[0] * fx + wind[1] * fz;
      $('windArrow').style.transform = 'rotate(' + (Math.atan2(right, fwd) * 180 / Math.PI) + 'deg)';
      $('scopeTag').textContent = kitName();
      $('ticks').style.display = (loadout === 'rifle' || loadout === 'stealth') ? 'block' : 'none';
      const bf = $('breathFill');
      bf.style.width = Math.round(breath * 100) + '%';
      $('breathWrap').classList.toggle('hot', exhale > 0 || breath < 0.2);
    }
    $('btnScope').classList.toggle('on', scopeLatch && mode === 'play');
    $('btnCrouch').classList.toggle('on', player.crouch);
    $('btnBreath').textContent = (mode === 'play' && (scopeLatch || keys.scopeHold)) ? 'BREATH' : 'GADGET';
  }

  function menuButtons() {
    const root = document.querySelector('.screen:not([hidden])');
    if (!root) return [];
    return Array.prototype.filter.call(root.querySelectorAll('.menu-btn'), function (b) {
      return !b.hidden && b.offsetParent !== null;
    });
  }
  function setSel(i) {
    const btns = menuButtons();
    if (!btns.length) return;
    i = ((i % btns.length) + btns.length) % btns.length;
    for (let n = 0; n < btns.length; n++) btns[n].classList.toggle('sel', n === i);
  }
  function selIndex() {
    const btns = menuButtons();
    for (let i = 0; i < btns.length; i++) if (btns[i].classList.contains('sel')) return i;
    return 0;
  }
  function hook(btn) {
    btn.addEventListener('pointerenter', function () {
      const btns = menuButtons();
      for (let i = 0; i < btns.length; i++) btns[i].classList.toggle('sel', btns[i] === btn);
    });
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      activate(btn);
    });
  }
  function fillCourses() {
    const host = $('courseList');
    host.innerHTML = '';
    let last = '';
    for (let i = 0; i < COURSES.length; i++) {
      const c = COURSES[i];
      if (c.zone !== last) {
        last = c.zone;
        const z = document.createElement('div');
        z.className = 'zone';
        z.textContent = ZONES[c.zone].name;
        host.appendChild(z);
      }
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'menu-btn';
      b.dataset.act = 'course';
      b.dataset.id = String(i);
      const best = save.best[c.id];
      b.innerHTML = '<b>' + c.name + '</b><small>' + c.info + ' · ' + (best ? starStr(best.stars) : '☆☆☆') + ' · ' + (best ? best.score : '—') + '</small>';
      hook(b);
      host.appendChild(b);
    }
  }
  function openScreen(name) {
    screen = name;
    const sections = document.querySelectorAll('.screen');
    for (let i = 0; i < sections.length; i++) sections[i].hidden = sections[i].id !== 'screen-' + name;
    overlay.classList.add('show');
    if (name === 'courses') fillCourses();
    if (name === 'loadout') {
      const btns = menuButtons();
      let idx = 0;
      for (let i = 0; i < btns.length; i++) if (btns[i].dataset.id === loadout) idx = i;
      setSel(idx);
    } else setSel(0);
    if (name !== 'pause' && name !== 'debrief') hud.hidden = true;
  }
  function hideMenu() {
    overlay.classList.remove('show');
    const sections = document.querySelectorAll('.screen');
    for (let i = 0; i < sections.length; i++) sections[i].hidden = true;
  }
  function activate(btn) {
    const act = btn.dataset.act;
    sfx('ui');
    if (act === 'pick') { setLoadout(btn.dataset.id); return; }
    if (act === 'ride' || act === 'loadout') { openScreen('loadout'); return; }
    if (act === 'courses') { openScreen('courses'); return; }
    if (act === 'manual') { openScreen('manual'); return; }
    if (act === 'course') { startCourse(Number(btn.dataset.id)); return; }
    if (act === 'resume') { resume(); return; }
    if (act === 'restart') { startCourse(courseIndex); return; }
    if (act === 'next') { startCourse(Math.min(COURSES.length - 1, courseIndex + 1)); return; }
    if (act === 'back') {
      if (inRun && (screen === 'loadout' || screen === 'courses')) openScreen('pause');
      else { inRun = false; openScreen('title'); }
      return;
    }
    if (act === 'title') {
      inRun = false;
      mode = 'title';
      course = COURSES[0];
      courseIndex = 0;
      buildWorld(course);
      spawnEntities(course);
      openScreen('title');
    }
  }
  function setLoadout(id) {
    if (!FOV[id] && id !== 'rifle') return;
    if (id !== 'rifle' && id !== 'stealth' && id !== 'laser' && id !== 'heavy') return;
    loadout = id;
    save.loadout = id;
    writeSave();
    if (id !== 'rifle') suppressed = false;
    if (id !== 'heavy') charged = false;
  }
  function startCourse(index) {
    courseIndex = Math.max(0, Math.min(COURSES.length - 1, index | 0));
    course = COURSES[courseIndex];
    buildWorld(course);
    spawnEntities(course);
    player.x = course.spawn[0];
    player.z = course.spawn[1];
    player.yaw = course.yaw || 0;
    player.pitch = -0.07;
    player.crouch = false;
    player.crouchBlend = 0;
    player.speed = 0;
    inRun = true;
    mode = 'play';
    ended = false;
    result = null;
    timeLeft = course.time;
    shots = 0; hits = 0; bullseyes = 0; destroyed = 0; alerts = 0; lastBurst = 0;
    scopeLatch = false;
    heat = 0; overheat = 0; breath = 1; exhale = 0;
    keys.fire = false; keys.breath = false; keys.scopeHold = false;
    hideMenu();
    hud.hidden = false;
    if (document.activeElement && document.activeElement.blur) document.activeElement.blur();
  }
  function resume() {
    if (!inRun) { openScreen('courses'); return; }
    mode = 'play';
    ended = false;
    hideMenu();
    hud.hidden = false;
  }
  function openPause() {
    if (mode !== 'play') return;
    mode = 'pause';
    keys.fire = false; keys.breath = false; keys.scopeHold = false;
    $('pauseLede').textContent = course.name + ' is frozen.';
    openScreen('pause');
  }

  function pollPad() {
    let p = fakePad;
    if (!p && navigator.getGamepads) {
      const list = navigator.getGamepads();
      if (list) for (let i = 0; i < list.length; i++) if (list[i]) { p = list[i]; break; }
    }
    padX = padZ = padYaw = padPitch = 0;
    padFire = padScope = padBreath = false;
    if (!p) return;
    const ax = p.axes || [];
    const dead = function (v) { return Math.abs(v) < 0.18 ? 0 : v; };
    padX = dead(ax[0] || 0);
    padZ = dead(ax[1] || 0);
    padYaw = dead(ax[2] || 0);
    padPitch = dead(ax[3] || 0);
    const b = p.buttons || [];
    const pressed = function (i) { return !!(b[i] && b[i].pressed); };
    padFire = pressed(7);
    padScope = pressed(6);
    padBreath = pressed(5);
    edge('A', pressed(0), function () { player.crouch = !player.crouch; });
    edge('B', pressed(1), function () { useGadget(); });
    edge('Start', pressed(9), function () { if (mode === 'play') openPause(); else if (mode === 'pause') resume(); });
    edge('LB', pressed(4), function () { /* spare */ });
  }
  function edge(name, down, fn) {
    if (down && !padEdge[name]) fn();
    padEdge[name] = down;
  }

  function placeKnob(el, x, y) {
    const i = el.querySelector('i');
    const reach = el.clientWidth * 0.28;
    i.style.transform = 'translate(calc(-50% + ' + (x * reach) + 'px), calc(-50% + ' + (y * reach) + 'px))';
  }
  function bindStick(el, target) {
    let pid = null;
    function setFrom(e) {
      const r = el.getBoundingClientRect();
      let x = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.38);
      let y = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.38);
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      target.x = x; target.y = y;
      placeKnob(el, x, y);
    }
    el.addEventListener('pointerdown', function (e) {
      pid = e.pointerId;
      try { el.setPointerCapture(pid); } catch (err) {}
      setFrom(e);
      e.preventDefault();
      e.stopPropagation();
    });
    el.addEventListener('pointermove', function (e) { if (e.pointerId === pid) setFrom(e); });
    function end(e) {
      if (e.pointerId !== pid) return;
      pid = null; target.x = 0; target.y = 0; placeKnob(el, 0, 0);
    }
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
  }

  function applyShell() {
    const q = new URLSearchParams(location.search);
    const ft = q.get('touch');
    if (ft === '1') touchMode = true;
    else if (ft === '0') touchMode = false;
    else touchMode = matchMedia('(pointer: coarse)').matches;
    document.body.classList.toggle('touch', touchMode);
    document.body.classList.toggle('land', touchMode && window.innerWidth > window.innerHeight);
  }

  function boxOf(el) {
    if (!el) return { visible: false, x: 0, y: 0, w: 0, h: 0 };
    const r = el.getBoundingClientRect();
    const cs = getComputedStyle(el);
    const visible = r.width > 1 && r.height > 1 && cs.display !== 'none' && cs.visibility !== 'hidden';
    return { visible: visible, x: r.left, y: r.top, w: r.width, h: r.height };
  }
  function scaleOf(el) {
    const t = getComputedStyle(el).transform;
    if (!t || t === 'none') return 1;
    const m = t.match(/matrix\(([^)]+)\)/);
    if (!m) return 1;
    const p = m[1].split(',');
    return Math.hypot(parseFloat(p[0]), parseFloat(p[1]));
  }
  function readRegion(px, py, size) {
    const w = canvas.width, h = canvas.height;
    const sx = Math.max(0, Math.min(w - size, (px | 0)));
    const sy = Math.max(0, Math.min(h - size, (py | 0)));
    const buf = new Uint8Array(size * size * 4);
    gl.readPixels(sx, sy, size, size, gl.RGBA, gl.UNSIGNED_BYTE, buf);
    let orange = 0, teal = 0, pink = 0;
    for (let i = 0; i < buf.length; i += 4) {
      const r = buf[i], g = buf[i + 1], b = buf[i + 2];
      if (r > 170 && g > 30 && g < 230 && b < 150 && r > g && r > b + 30) orange++;
      if (g > 80 && b > 70 && r < 130 && g + b > r * 2.2) teal++;
      if (r > 170 && b > 90 && g > 60 && g < 190 && r > b) pink++;
    }
    return { orange, teal, pink, sx, sy };
  }

  function bootInput() {
    applyShell();
    window.addEventListener('resize', function () { applyShell(); resize(); });
    const buttons = document.querySelectorAll('#panel .menu-btn');
    for (let i = 0; i < buttons.length; i++) hook(buttons[i]);
    bindStick($('stickL'), stickL);
    bindStick($('stickR'), stickR);
    $('btnFire').addEventListener('pointerdown', function (e) {
      if (mode === 'play') { keys.fire = true; fire(false); }
      e.preventDefault();
    });
    $('btnScope').addEventListener('click', function () {
      if (mode !== 'play') return;
      scopeLatch = !scopeLatch;
    });
    $('btnCrouch').addEventListener('click', function () {
      if (mode === 'play' || mode === 'pause') player.crouch = !player.crouch;
    });
    $('btnBreath').addEventListener('pointerdown', function (e) {
      if (mode !== 'play') return;
      if (scopeLatch || keys.scopeHold || padScope) keys.breath = true;
      else useGadget();
      e.preventDefault();
    });
    $('btnBreath').addEventListener('pointerup', function () { keys.breath = false; });
    $('btnBreath').addEventListener('pointercancel', function () { keys.breath = false; });
    $('btnPause').addEventListener('click', function () {
      if (mode === 'play') openPause();
      else if (mode === 'pause') resume();
    });
    window.addEventListener('pointerup', function () { keys.fire = false; });
    $('btnMute').addEventListener('click', function (e) { e.stopPropagation(); toggleMute(); });
    canvas.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    let lookId = null, have = false, lx = 0, ly = 0;
    canvas.addEventListener('pointerdown', function (e) {
      if (mode !== 'play') return;
      try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
      lookId = e.pointerId;
      have = false;
      lx = e.clientX; ly = e.clientY;
      if (e.button === 2) keys.scopeHold = true;
      else if (e.button === 0 && !touchMode) keys.fire = true;
    });
    canvas.addEventListener('pointermove', function (e) {
      if (mode !== 'play') return;
      if (touchMode && e.pointerId !== lookId) return;
      if (!touchMode && e.pointerType === 'touch') return;
      if (touchMode && lookId == null) return;
      if (!have) { have = true; lx = e.clientX; ly = e.clientY; return; }
      const dx = e.clientX - lx, dy = e.clientY - ly;
      lx = e.clientX; ly = e.clientY;
      player.yaw += dx * (touchMode ? 0.0045 : 0.0031);
      player.pitch = clampPitch(player.pitch - dy * (touchMode ? 0.0034 : 0.0024));
    });
    canvas.addEventListener('pointerup', function (e) {
      if (e.pointerId === lookId) lookId = null;
      if (e.button === 2) keys.scopeHold = false;
      keys.fire = false;
    });
    const gutter = $('gutterR');
    let aimPid = null, ax = 0, ay = 0;
    gutter.addEventListener('pointerdown', function (e) {
      if (e.target.closest('button') || e.target.closest('.stick')) return;
      aimPid = e.pointerId; ax = e.clientX; ay = e.clientY;
      try { gutter.setPointerCapture(e.pointerId); } catch (err) {}
    });
    gutter.addEventListener('pointermove', function (e) {
      if (e.pointerId !== aimPid || mode !== 'play') return;
      player.yaw += (e.clientX - ax) * 0.005;
      player.pitch = clampPitch(player.pitch - (e.clientY - ay) * 0.004);
      ax = e.clientX; ay = e.clientY;
    });
    gutter.addEventListener('pointerup', function (e) { if (e.pointerId === aimPid) aimPid = null; });

    window.addEventListener('keydown', function (e) {
      const menu = overlay.classList.contains('show');
      if (menu) {
        if (e.code === 'ArrowDown' || e.code === 'ArrowRight' || e.code === 'KeyS') { setSel(selIndex() + 1); e.preventDefault(); }
        else if (e.code === 'ArrowUp' || e.code === 'ArrowLeft' || e.code === 'KeyW') { setSel(selIndex() - 1); e.preventDefault(); }
        else if (e.code === 'Enter' || e.code === 'Space') {
          const btns = menuButtons();
          const b = btns[selIndex()];
          if (b) activate(b);
          e.preventDefault();
        } else if (e.code === 'Escape') {
          if (mode === 'pause' && screen === 'pause') resume();
          else activate({ dataset: { act: 'back' } });
          e.preventDefault();
        }
        return;
      }
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.forward = true;
      else if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.back = true;
      else if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = true;
      else if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = true;
      else if (e.code === 'KeyC' && !e.repeat) player.crouch = !player.crouch;
      else if (e.code === 'KeyQ' && !e.repeat) useGadget();
      else if (e.code === 'Digit1') setLoadout('rifle');
      else if (e.code === 'Digit2') setLoadout('stealth');
      else if (e.code === 'Digit3') setLoadout('laser');
      else if (e.code === 'Digit4') setLoadout('heavy');
      else if ((e.code === 'Escape' || e.code === 'KeyP') && !e.repeat) openPause();
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.scopeHold = true;
      else if (e.code === 'Space') { keys.breath = true; e.preventDefault(); }
      else if (e.code === 'KeyM' && !e.repeat) toggleMute();
      else if (e.code === 'KeyF' || e.code === 'Enter') keys.fire = true;
    });
    window.addEventListener('keyup', function (e) {
      if (e.code === 'KeyW' || e.code === 'ArrowUp') keys.forward = false;
      else if (e.code === 'KeyS' || e.code === 'ArrowDown') keys.back = false;
      else if (e.code === 'KeyA' || e.code === 'ArrowLeft') keys.left = false;
      else if (e.code === 'KeyD' || e.code === 'ArrowRight') keys.right = false;
      else if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') keys.scopeHold = false;
      else if (e.code === 'Space') keys.breath = false;
      else if (e.code === 'KeyF' || e.code === 'Enter') keys.fire = false;
    });
    const ticks = $('ticks');
    for (let i = 0; i < 3; i++) {
      const b = document.createElement('b');
      b.style.top = (16 + i * 16) + 'px';
      ticks.appendChild(b);
    }
    if (save.loadout) setLoadout(save.loadout);
    $('btnMute').textContent = save.mute ? 'MUTED' : 'SOUND';
    window.addEventListener('pointerdown', function () { ac(); }, { once: false });
  }

  function particleCount() {
    let n = 0;
    for (let i = 0; i < PMAX; i++) if (P.life[i] > 0) n++;
    return n;
  }

  const api = {
    ready: false,
    KEY: KEY,
    state: function () {
      const pose = currentPose();
      return {
        mode, loadout, course: courseIndex, courseName: course.name, zone: course.zone,
        scoped: !!(mode === 'play' && (scopeLatch || keys.scopeHold || padScope)),
        fov: pose.fov, crouch: player.crouch, breath, cloak: loadout === 'stealth' && player.crouch && player.speed < 0.45,
        x: player.x, z: player.z, yaw: player.yaw, pitch: player.pitch,
        targetsLeft: living(), destroyed, shots, hits, bullseyes,
        accuracy: shots ? hits / shots : 0, alerts, particles: particleCount(), lastBurst,
        heat, wind: (course.wind || [0, 0]).slice(), timeLeft, timeScale,
        inFrame: !!(projHead && projHead.inFrame),
        headX: projHead ? projHead.cssX : 0, headY: projHead ? projHead.cssY : 0,
        cam: { x: pose.ex, y: pose.ey, z: pose.ez, lx: pose.lx, ly: pose.ly, lz: pose.lz },
        lastShot: lastShot ? Object.assign({}, lastShot) : null,
        lastShotScoped: !!(lastShot && lastShot.scoped),
        result, muted: !!save.mute, inRun,
      };
    },
    highlight: function () {
      const btns = menuButtons();
      if (!btns.length) return { sel: '', selOpacity: 1, otherOpacity: 1, selScale: 1 };
      let sel = btns[0], other = null;
      for (let i = 0; i < btns.length; i++) {
        if (btns[i].classList.contains('sel')) sel = btns[i];
        else if (!other) other = btns[i];
      }
      const cs = getComputedStyle(sel);
      const os = getComputedStyle(other || sel);
      return {
        sel: (sel.textContent || '').replace(/\s+/g, ' ').trim(),
        selOpacity: parseFloat(cs.opacity),
        otherOpacity: other ? parseFloat(os.opacity) : parseFloat(cs.opacity),
        selScale: scaleOf(sel),
      };
    },
    layout: function () {
      const land = document.body.classList.contains('land');
      return {
        touch: document.body.classList.contains('touch'),
        land: land,
        vw: window.innerWidth, vh: window.innerHeight, mode,
        canvas: boxOf(canvas),
        hud: boxOf(hud),
        overlay: boxOf(overlay.classList.contains('show') ? overlay : null),
        stickL: boxOf($('stickL')),
        stickR: boxOf($('stickR')),
        fire: boxOf($('btnFire')),
        scope: boxOf($('btnScope')),
        breath: boxOf($('btnBreath')),
        crouch: boxOf($('btnCrouch')),
        pause: boxOf($('btnPause')),
      };
    },
    setManual: function (v) { manual = !!v; },
    step: function (n) {
      const count = n || 1;
      for (let i = 0; i < count; i++) simulate(1 / 60);
      render();
    },
    press: function (name, down) {
      const d = !!down;
      if (name === 'up' || name === 'forward') keys.forward = d;
      else if (name === 'down' || name === 'back') keys.back = d;
      else if (name === 'left') keys.left = d;
      else if (name === 'right') keys.right = d;
      else if (name === 'fire') keys.fire = d;
      else if (name === 'scope') { if (d) scopeLatch = !scopeLatch; }
      else if (name === 'breath') keys.breath = d;
      else if (name === 'crouch') { if (d) player.crouch = !player.crouch; }
      else if (name === 'gadget') { if (d) useGadget(); }
      else if (name === 'pause') { if (d) { if (mode === 'play') openPause(); else if (mode === 'pause') resume(); } }
    },
    setAim: function (yaw, pitch) { player.yaw = yaw; player.pitch = clampPitch(pitch); },
    aimAtNearest: function (part) {
      let best = null, bd = 1e18;
      for (let i = 0; i < targets.length; i++) {
        const t = targets[i];
        if (!t.alive || !t.counts) continue;
        if ((t.k === 'dummy' || t.k === 'slider') && t.pop && t.y < -1) continue;
        let p;
        if (t.k === 'robot') p = facePoint(t, 0, 1.62, 0.46);
        else if (t.k === 'drone') p = { x: t.x, y: t.y, z: t.z };
        else if (t.k === 'spinner') p = { x: t.x, y: 1.35, z: t.z };
        else if (part === 'head') p = { x: t.x, y: t.y + 1.7, z: t.z };
        else p = { x: t.x, y: t.y + 1.05, z: t.z };
        const ddx = p.x - player.x, ddz = p.z - player.z;
        const d = ddx * ddx + ddz * ddz;
        if (d < bd) { bd = d; best = p; }
      }
      if (!best) return false;
      let yaw = Math.atan2(best.x - player.x, best.z - player.z);
      let pitch = -0.05;
      const scopedNow = scopeLatch || keys.scopeHold || padScope;
      for (let i = 0; i < 8; i++) {
        const pose = poseFrom(yaw, pitch, scopedNow && mode === 'play');
        const dx = best.x - pose.ex, dy = best.y - pose.ey, dz = best.z - pose.ez;
        const h = Math.hypot(dx, dz) || 1;
        yaw = Math.atan2(dx, dz);
        pitch = Math.atan2(dy, h);
      }
      player.yaw = yaw;
      player.pitch = clampPitch(pitch);
      return true;
    },
    fire: function () { return fire(!!manual || true); },
    setScope: function (on) { scopeLatch = !!on; keys.scopeHold = false; },
    setLoadout: function (id) { setLoadout(id); },
    startCourse: function (id) { startCourse(id); },
    teleport: function (x, z) { player.x = x; player.z = z; },
    setMove: function (x, z) { stickL.x = x; stickL.y = -z; },
    setPad: function (pad) { fakePad = pad; },
    confirm: function () {
      const btns = menuButtons();
      const b = btns[selIndex()];
      if (b) activate(b);
    },
    getSave: function () { return JSON.parse(JSON.stringify(save)); },
    resetFrames: function () { frameMs.length = 0; },
    frameP95: function () {
      if (!frameMs.length) return 0;
      const s = frameMs.slice().sort(function (a, b) { return a - b; });
      return s[Math.min(s.length - 1, Math.floor(s.length * 0.95))];
    },
    sample: function () {
      render();
      const size = 80;
      let orange = 0, teal = 0, pink = 0, center = [0, 0, 0];
      function take(proj) {
        if (!proj) return;
        const fbX = (proj.ndcX * 0.5 + 0.5) * canvas.width - size / 2;
        const fbY = (proj.ndcY * 0.5 + 0.5) * canvas.height - size / 2;
        const r = readRegion(fbX, fbY, size);
        orange += r.orange; teal += r.teal; pink += r.pink;
      }
      take(projHead);
      take(projChest);
      if (projHead) {
        const cx = Math.max(0, Math.min(canvas.width - 1, ((projHead.ndcX * 0.5 + 0.5) * canvas.width) | 0));
        const cy = Math.max(0, Math.min(canvas.height - 1, ((projHead.ndcY * 0.5 + 0.5) * canvas.height) | 0));
        const px = new Uint8Array(4);
        gl.readPixels(cx, cy, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px);
        center = [px[0], px[1], px[2]];
      }
      return {
        orange, teal, pink, center,
        inFrame: !!(projHead && projHead.inFrame) && !((mode === 'play') && (scopeLatch || keys.scopeHold)),
        scoped: !!(mode === 'play' && (scopeLatch || keys.scopeHold || padScope)),
        fov: currentPose().fov,
        sx: projHead ? projHead.cssX : 0,
        sy: projHead ? projHead.cssY : 0,
        sw: canvas.clientWidth, sh: canvas.clientHeight,
      };
    },
  };

  function loop(now) {
    if (!loop.last) loop.last = now;
    const ms = Math.min(80, now - loop.last || 16);
    loop.last = now;
    frameMs.push(ms);
    if (frameMs.length > 300) frameMs.shift();
    if (!manual) simulate(ms / 1000);
    render();
    if (!api.ready) api.ready = true;
    requestAnimationFrame(loop);
  }

  batch = new Batch(20000, 120000);
  PRIM.box = makeBox();
  PRIM.sphere = makeSphere(8, 12);
  PRIM.cyl = makeCylinder(12);
  buildBaked();
  if (!initGL()) {
    window.__DRILL__ = api;
    return;
  }
  loadout = save.loadout || 'rifle';
  course = COURSES[0];
  courseIndex = 0;
  buildWorld(course);
  spawnEntities(course);
  bootInput();
  openScreen('title');
  window.__DRILL__ = api;
  requestAnimationFrame(loop);
})();
