import * as THREE from 'three';
import { EffectComposer } from '../vendor/three/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from '../vendor/three/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from '../vendor/three/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from '../vendor/three/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from '../vendor/three/jsm/postprocessing/ShaderPass.js';
import {
  SAVE_KEY, TOWN, LINES, NEWS, DRONE_SPOTS, MIRAGES, MESAS, ROADS, TRAILS,
  heightAt, bridgeDeck, padDeck, surfaces,
} from './data.js';
import { buildWorld, equirectEnv } from './world.js';
import { buildCast, animateRider, makeFluff } from './actors.js';

const params = new URLSearchParams(location.search);
const $ = (id) => document.getElementById(id);
const portrait = $('portrait');
const pctx = portrait.getContext('2d');
const mini = $('mini');
const mctx = mini.getContext('2d');
const mapcv = $('mapcv');
const mapctx = mapcv.getContext('2d');

const G = {
  ready: false,
  manual: false,
  mode: 'title',
  time: 0,
  day: 0.36,
  api: 'webgl2',
  settings: { quality: 'med', volume: 0.65, sens: 0.0022, invert: false, api: 'webgl' },
  keys: {},
  edge: {},
  padPrev: {},
  fakePad: undefined,
  joy: { x: 0, y: 0 },
  lookDx: 0,
  lookDy: 0,
  touch: false,
  frames: [],
  realFrames: 0,
  pulseCount: 0,
  backCount: 0,
  frees: 0,
  pulseCd: 0,
  inv: 0,
  vx: 0,
  vz: 0,
  hx: 0,
  hz: 0,
  vy: 0,
  lift: 0,
  displayY: 0,
  face: 0,
  lookYaw: 0,
  lookPitch: 0.46,
  realm: 0,
  realmTarget: 0,
  mount: null,
  lucidity: 62,
  crosses: 5,
  x: TOWN.player.x,
  z: TOWN.player.z,
  mq: 0,
  sq: { due: 'locked', comic: 'locked', storm: 'locked', crunch: 'locked' },
  droneHits: [0, 0, 0],
  anchorHits: [0, 0, 0],
  coreHits: [0, 0, 0],
  taken: [],
  mirage: 0,
  comicFreed: false,
  crunchFreed: false,
  sentinelPhase: 'sleep',
  flags: {},
  qte: { t: 0, hits: 0, window: false, arm: true },
  seenIntro: false,
  board: { x: TOWN.board.x, z: TOWN.board.z },
  bike: { x: TOWN.bike.x, z: TOWN.bike.z },
  who: {},
  queue: [],
  onDone: null,
  pausedFrom: 'play',
  saveTimer: 0,
  features: { post: true, bloom: true, shadow: true },
  pixelScale: 1,
  pixelTarget: 1,
  adapted: false,
  shot: null,
  ringT: 0,
  speed: 0,
};

const COL = {
  wakeTop: new THREE.Color('#3c86d6'),
  wakeHor: new THREE.Color('#f4b56a'),
  wakeBot: new THREE.Color('#e09a55'),
  wakeSun: new THREE.Color('#fff4d4'),
  dreamTop: new THREE.Color('#140820'),
  dreamHor: new THREE.Color('#c45cff'),
  dreamBot: new THREE.Color('#2a0a28'),
  dreamSun: new THREE.Color('#e7d4ff'),
  fogW: new THREE.Color('#e7b07a'),
  fogD: new THREE.Color('#2a103c'),
  dustW: new THREE.Color('#f0d2a4'),
  dustD: new THREE.Color('#e7b0ff'),
  tmp: new THREE.Color(),
};

let renderer, scene, camera, composer, bloomPass, gradePass, world, cast, fluff, sun, hemi, sunTarget, audio;
let last = performance.now();

function realmOn() { return G.realm >= 0.5; }

function freshWho() {
  const w = {};
  for (const id of ['ls', 'ros', 'nuke', 'tired', 'kid', 'rusty', 'ds', 'slide', 'patron']) {
    const p = TOWN[id];
    w[id] = { x: p.x, z: p.z, yaw: id === 'ds' ? Math.PI / 2 : Math.PI };
  }
  return w;
}

function resetProgress() {
  G.seenIntro = false;
  G.mq = 0;
  G.sq = { due: 'locked', comic: 'locked', storm: 'locked', crunch: 'locked' };
  G.droneHits = [0, 0, 0];
  G.anchorHits = [0, 0, 0];
  G.coreHits = [0, 0, 0];
  G.crosses = 5;
  G.lucidity = 62;
  G.x = TOWN.player.x;
  G.z = TOWN.player.z;
  G.face = 0;
  G.lookYaw = 0;
  G.lookPitch = 0.46;
  G.realm = 0;
  G.realmTarget = 0;
  G.mount = null;
  G.board = { x: TOWN.board.x, z: TOWN.board.z };
  G.bike = { x: TOWN.bike.x, z: TOWN.bike.z };
  G.taken = [];
  G.mirage = 0;
  G.comicFreed = false;
  G.crunchFreed = false;
  G.sentinelPhase = 'sleep';
  G.flags = {};
  G.qte = { t: 0, hits: 0, window: false, arm: true };
  G.who = freshWho();
  G.vx = G.vz = G.hx = G.hz = G.vy = G.lift = 0;
  G.displayY = heightAt(G.x, G.z);
  G.inv = 0;
  G.ringT = 0;
}

function bootSettings() {
  const mem = navigator.deviceMemory || 8;
  const cores = navigator.hardwareConcurrency || 8;
  let q = mem <= 4 || cores <= 4 ? 'low' : 'med';
  if (G.touch) q = 'low';
  G.settings.quality = q;
  const saved = readSave();
  if (saved?.settings) Object.assign(G.settings, saved.settings);
  if (params.get('quality')) G.settings.quality = params.get('quality');
  if (params.get('api') === 'webgl' || params.get('api') === 'webgpu') G.settings.api = params.get('api');
  G.touch = params.get('touch') === '1' || (params.get('touch') !== '0' && matchMedia('(pointer: coarse)').matches);
  document.body.classList.toggle('touch', G.touch);
}

async function boot() {
  bootSettings();
  resetProgress();
  const saved = readSave();
  if (saved?.seenIntro) $('continueBtn').hidden = false;

  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(60, 1, 0.12, 800);
  scene.add(camera);
  renderer = await makeRenderer($('c'));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.78;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.setClearColor(0x140c10, 1);

  world = buildWorld(THREE, scene);
  cast = buildCast(THREE, scene);
  cast.sentinel.group.scale.setScalar(1.35);
  fluff = makeFluff(THREE, scene);
  world.colliders.push({ minX: -16.4, maxX: -11.2, minZ: 76.2, maxZ: 83.6, minY: 0, maxY: 5, layer: 'any' });

  hemi = new THREE.HemisphereLight(0xd7ecff, 0xc4844a, 0.42);
  scene.add(hemi);
  sun = new THREE.DirectionalLight(0xfff0d4, 1.7);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.near = 1;
  sun.shadow.camera.far = 110;
  sun.shadow.camera.left = -40;
  sun.shadow.camera.right = 40;
  sun.shadow.camera.top = 40;
  sun.shadow.camera.bottom = -40;
  sun.shadow.bias = -0.00035;
  sun.shadow.normalBias = 0.045;
  sunTarget = new THREE.Object3D();
  scene.add(sun, sunTarget);
  sun.target = sunTarget;
  const fill = new THREE.PointLight(0xfff4e4, 0.22, 16, 2);
  fill.position.set(0.4, 1.6, 1.4);
  camera.add(fill);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const wakeEq = equirectEnv(THREE, '#8ec6ff', '#f0b56e', '#c4844a', 'rgba(255,244,210,0.95)');
  const dreamEq = equirectEnv(THREE, '#241038', '#a05cff', '#3a1038', 'rgba(230,210,255,0.8)');
  G.envWake = pmrem.fromEquirectangular(wakeEq).texture;
  G.envDream = pmrem.fromEquirectangular(dreamEq).texture;
  wakeEq.dispose();
  dreamEq.dispose();
  pmrem.dispose();
  scene.environment = G.envWake;
  if (world.noise) world.noise.anisotropy = Math.min(8, renderer.capabilities?.getMaxAnisotropy?.() || 1);

  setupPost();
  applyQuality();
  bind();
  buildCrosses();
  resize();
  G.ready = true;
  window.__SYMPHONY__ = api;
  requestAnimationFrame(loop);
}

async function makeRenderer(canvas) {
  if (G.settings.api === 'webgpu' && navigator.gpu) {
    try {
      const mod = await import('../vendor/three/three.webgpu.js');
      const gpu = new mod.WebGPURenderer({ canvas, antialias: true });
      await gpu.init();
      G.api = 'webgpu';
      G.features.post = false;
      return gpu;
    } catch (err) {
      console.warn('WebGPU unavailable, using WebGL2');
      G.settings.api = 'webgl';
    }
  }
  G.api = 'webgl2';
  return new THREE.WebGLRenderer({
    canvas,
    antialias: false,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: true,
    stencil: false,
    alpha: false,
    failIfMajorPerformanceCaveat: false,
  });
}

function setupPost() {
  if (G.api !== 'webgl2') return;
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  bloomPass = new UnrealBloomPass(new THREE.Vector2(512, 512), 0.42, 0.35, 0.86);
  composer.addPass(bloomPass);
  gradePass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      time: { value: 0 },
      dream: { value: 0 },
      heat: { value: 1 },
    },
    vertexShader: `varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
    fragmentShader: `
      varying vec2 vUv;
      uniform sampler2D tDiffuse;
      uniform float time, dream, heat;
      void main(){
        float heatBand = (1.0 - dream) * heat * smoothstep(0.55, 0.0, vUv.y);
        vec2 uv = vUv;
        uv.x += heatBand * 0.0035 * sin(vUv.y * 70.0 + time * 7.0 + vUv.x * 18.0);
        uv.y += dream * 0.002 * sin(vUv.x * 30.0 + time * 1.5);
        vec4 col = texture2D(tDiffuse, uv);
        vec3 warm = vec3(1.05, 0.96, 0.88);
        vec3 cool = vec3(0.82, 0.78, 1.18);
        col.rgb *= mix(warm, cool, dream);
        float vig = smoothstep(0.95, 0.35, length(vUv - 0.5));
        col.rgb *= mix(0.78, 1.0, vig);
        gl_FragColor = col;
      }
    `,
  });
  composer.addPass(gradePass);
  composer.addPass(new OutputPass());
}

function applyQuality() {
  const q = G.settings.quality;
    const caps = { low: 0.42, med: 1.1, high: 1.45 };
  G.pixelTarget = caps[q] || 1.2;
  G.pixelScale = G.pixelTarget;
  const shadow = q !== 'low' && G.api === 'webgl2';
  G.features.shadow = shadow;
  G.features.bloom = q !== 'low' && G.api === 'webgl2';
  G.features.post = (G.features.bloom || q === 'high' || q === 'med') && G.api === 'webgl2';
  if (renderer) renderer.shadowMap.enabled = shadow;
  if (sun) {
    const sz = q === 'high' ? 2048 : 1024;
    sun.shadow.mapSize.set(sz, sz);
    sun.castShadow = shadow;
    if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
  }
  if (bloomPass) {
    bloomPass.enabled = G.features.bloom;
    bloomPass.strength = q === 'high' ? 0.28 : 0.18;
  }
  if (gradePass) gradePass.enabled = q !== 'low';
  if (world?.dust) {
    world.dust.mat.uniforms.uSize.value = q === 'low' ? 8 : 14;
    world.dust.points.visible = q !== 'low';
  }
  if (scene) useSimpleMaterials(q === 'low');
  resize();
}

function useSimpleMaterials(simple) {
  scene.traverse((o) => {
    if (!o.isMesh || !o.material || Array.isArray(o.material)) return;
    if (simple) {
      if (o.userData.stdMat || !o.material.isMeshStandardMaterial) return;
      const m = o.material;
      o.userData.stdMat = m;
      o.material = new THREE.MeshLambertMaterial({
        color: m.color, map: m.map, emissive: m.emissive, emissiveMap: m.emissiveMap,
        emissiveIntensity: m.emissiveIntensity, vertexColors: m.vertexColors,
        transparent: m.transparent, opacity: m.opacity, side: m.side,
        depthWrite: m.depthWrite, blending: m.blending,
      });
    } else if (o.userData.stdMat) {
      o.material.dispose?.();
      o.material = o.userData.stdMat;
      o.userData.stdMat = null;
    }
  });
}

function resize() {
  const view = $('view');
  const w = view.clientWidth || innerWidth;
  const h = view.clientHeight || innerHeight;
  if (!renderer || w < 2 || h < 2) return;
  renderer.setPixelRatio(G.pixelScale);
  renderer.setSize(w, h, false);
  if (composer) {
    composer.setPixelRatio(G.pixelScale);
    composer.setSize(w, h);
  }
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}

function loop(now) {
  const ms = now - last;
  last = now;
  if (G.manual) return;
  G.frames.push(ms);
  if (G.frames.length > 240) G.frames.shift();
  G.realFrames++;
  const t0 = performance.now();
  update(Math.min(0.05, ms / 1000));
  renderFrame();
  const work = performance.now() - t0;
  if (work > 0 && work < 500) {
    G.work = G.work || [];
    G.work.push(work);
    if (G.work.length > 240) G.work.shift();
  }
  adapt();
  requestAnimationFrame(loop);
}

function adapt() {
  if (G.realFrames % 45 !== 0 || G.frames.length < 40) return;
  const p95 = pct(0.95);
  if (p95 > 21 && G.pixelScale > 0.55) {
    G.pixelScale = Math.max(0.55, G.pixelScale * 0.86);
    G.adapted = true;
    resize();
  } else if (p95 > 30 && G.features.bloom) {
    G.features.bloom = false;
    if (bloomPass) bloomPass.enabled = false;
    G.adapted = true;
  } else if (p95 > 36 && G.features.shadow) {
    G.features.shadow = false;
    renderer.shadowMap.enabled = false;
    sun.castShadow = false;
    G.adapted = true;
  } else if (p95 < 13 && G.pixelScale < G.pixelTarget - 0.02) {
    G.pixelScale = Math.min(G.pixelTarget, G.pixelScale * 1.06);
    resize();
  }
}

function pct(q) {
  if (!G.frames.length) return 0;
  const a = G.frames.slice().sort((x, y) => x - y);
  return a[Math.min(a.length - 1, Math.floor(q * (a.length - 1)))];
}

function update(dt) {
  G.time += dt;
  if (G.mode === 'play') G.day = (G.day + dt * 0.004) % 1;
  pollPad();
  handleEdges();
  const live = G.mode === 'play' || G.mode === 'qte' || G.mode === 'cine';
  if (G.mode === 'play') {
    movePlayer(dt);
    pickups();
    proximity();
    shock(dt);
    followers(dt);
    lucidity(dt);
    G.saveTimer += dt;
    if (G.saveTimer > 8) { G.saveTimer = 0; save(); }
  } else {
    G.vx *= 0.8;
    G.vz *= 0.8;
  }
  if (G.mode === 'qte') tickQte(dt);
  if (G.mode === 'cine') tickCine(dt);
  G.pulseCd = Math.max(0, G.pulseCd - dt);
  G.inv = Math.max(0, G.inv - dt);
  const blend = 1 - Math.exp(-4.2 * dt);
  G.realm += (G.realmTarget - G.realm) * (live || G.mode === 'card' || G.mode === 'title' ? blend : 1);
  if (G.mode !== 'pause') tickActors(dt);
  refreshLocks();
  updateAudio();
  syncHud();
}

function handleEdges() {
  if (G.edge.back) doBack();
  if (G.edge.map && (G.mode === 'play' || G.mode === 'map')) toggleMap();
  if (G.edge.quest && (G.mode === 'play' || G.mode === 'log')) toggleLog();
  if (G.mode === 'card' && (G.edge.use || G.edge.jump)) dismiss();
  else if (G.edge.use) onUse();
  if (G.mode === 'play' && G.edge.jump && G.lift <= 0.02) {
    G.vy = 8.1;
    G.lift = 0.06;
  }
  if (G.mode === 'play' && G.edge.realm) doShift();
  if (G.mode === 'play' && G.edge.ride) doRide();
  if (G.mode === 'cine' && G.edge.use) G.cineT = 99;
  G.edge = {};
}

function doBack() {
  G.backCount++;
  if (G.mode === 'card' || G.mode === 'title') return;
  if (G.mode === 'pause') {
    G.mode = G.pausedFrom || 'play';
    return;
  }
  if (G.mode === 'map' || G.mode === 'log') { G.mode = 'play'; return; }
  if (G.mode === 'play' || G.mode === 'qte' || G.mode === 'cine') {
    G.pausedFrom = G.mode === 'cine' ? 'play' : G.mode;
    G.mode = 'pause';
    syncPauseForm();
  }
}

function doShift() {
  G.realmTarget = G.realmTarget > 0.5 ? 0 : 1;
  G.flags.shifted = true;
  if (!G.flags.shiftSaved) { G.flags.shiftSaved = true; save(); }
}

function doRide() {
  if (G.mount) {
    if (G.mount === 'board') { G.board.x = G.x; G.board.z = G.z; }
    else { G.bike.x = G.x; G.bike.z = G.z; }
    G.mount = null;
    save();
    return;
  }
  const v = nearest((h) => h.kind === 'vehicle');
  if (!v) return;
  G.mount = v.id;
  save();
}

function onUse() {
  if (G.mode === 'qte') { qtePress(); return; }
  if (G.mode !== 'play') return;
  const hit = nearest();
  if (!hit) return;
  if (hit.kind === 'npc') talk(hit.id);
  else if (hit.kind === 'foe') pulseAt(hit);
  else if (hit.kind === 'crack') listen();
  else if (hit.kind === 'mirage') touchMirage(hit);
  else if (hit.kind === 'vehicle') doRide();
}

function firePulse(x, y, z) {
  if (G.lucidity < 6 || G.pulseCd > 0) return false;
  G.lucidity = Math.max(0, G.lucidity - 6);
  G.pulseCd = 0.42;
  G.pulseCount++;
  cast.pulse.visible = true;
  cast.pulse.userData.life = 0.38;
  cast.pulse.position.set(x, y + 0.8, z);
  return true;
}

function pulseAt(hit) {
  if (hit.id === 'crunch' && !insideBowl()) return;
  const y = heightAt(G.x, G.z);
  if (!firePulse(G.x, y, G.z)) return;
  if (hit.id.startsWith('drone')) {
    const i = Number(hit.id.slice(5));
    G.droneHits[i] = Math.min(2, G.droneHits[i] + 1);
    if (G.droneHits[i] >= 2) {
      G.frees++;
      G.lucidity = Math.min(100, G.lucidity + 14);
      fluff.burst(hit.x, y + 1.5, hit.z, 0xfff6d4);
    }
    checkDrones();
  } else if (hit.id.startsWith('anchor')) {
    const i = Number(hit.id.slice(6));
    if (G.anchorHits[i] < 2) G.anchorHits[i]++;
    if (G.anchorHits[i] >= 2) {
      G.frees++;
      G.lucidity = Math.min(100, G.lucidity + 14);
      fluff.burst(hit.x, y + 1.2, hit.z, 0xffe08a);
    }
    checkAnchors();
  } else if (hit.id.startsWith('core')) {
    const i = Number(hit.id.slice(4));
    if (G.coreHits[i] < 2) G.coreHits[i]++;
    if (G.coreHits[i] >= 2) {
      G.frees++;
      G.lucidity = Math.min(100, G.lucidity + 14);
      fluff.burst(hit.x, y + 2, hit.z, 0xffd0ff);
    }
    checkCores();
  } else if (hit.id === 'hush') {
    cast.puffs.hush.hits++;
    if (cast.puffs.hush.hits >= 2) {
      G.comicFreed = true;
      G.frees++;
      fluff.burst(hit.x, y + 1.4, hit.z, 0xffe6ff);
      G.sq.comic = 'hush';
    }
  } else if (hit.id === 'crunch') {
    cast.puffs.crunch.hits++;
    if (cast.puffs.crunch.hits >= 2) {
      G.crunchFreed = true;
      G.frees++;
      fluff.burst(hit.x, y + 2, hit.z, 0xfff6c8);
      G.sq.crunch = 'done';
      show([LINES.crunchEnd], () => save());
    }
  }
  save();
}

function checkDrones() {
  if (G.mq === 3 && G.droneHits.every((h) => h >= 2) && !G.flags.droneCard) {
    G.flags.droneCard = true;
    G.mq = 4;
    G.sentinelPhase = 'sleep';
    show([LINES.dronesDone], () => save());
  }
}

function checkAnchors() {
  if (G.mq >= 4 && G.mq < 5 && G.anchorHits.every((h) => h >= 2) && !G.flags.anchorCard) {
    G.flags.anchorCard = true;
    G.flags.sentinelCard = true;
    G.sentinelPhase = 'ready';
    G.mq = 5;
    show([LINES.anchorsDone], () => save());
  }
}

function checkCores() {
  if (G.mq >= 5 && G.coreHits.every((h) => h >= 2) && G.sentinelPhase !== 'freed') {
    G.sentinelPhase = 'freed';
    G.mq = 6;
    G.frees++;
    const s = TOWN.sentinel;
    const y = heightAt(s.x, s.z);
    fluff.burst(s.x, y + 4, s.z, 0xfff4d0);
    fluff.burst(s.x, y + 6, s.z, 0xfff4d0);
    G.cineT = 0;
    G.mode = 'cine';
    save();
  }
}

function tickCine(dt) {
  G.cineT += dt;
  if (G.cineT > 3.1) {
    G.mode = 'play';
    show([LINES.finale, LINES.canonEnd], () => save());
  }
}

function listen() {
  if (!realmOn()) return;
  if (G.mq === 2) {
    show([LINES.crack], () => {
      G.mq = 3;
      G.lucidity = Math.min(100, G.lucidity + 18);
      checkDrones();
      save();
    });
  }
}

function touchMirage(hit) {
  if (!realmOn() || G.sq.storm !== 'search') return;
  if (hit.index !== G.mirage) return;
  G.mirage++;
  if (G.mirage === 1) show([LINES.macho], () => save());
  else save();
  if (G.mirage >= 3) save();
}

function talk(id) {
  if (id === 'ls') {
    if (G.mq === 0) show([LINES.ls], () => { G.mq = 1; save(); });
    else show([LINES.lsLate]);
    return;
  }
  if (id === 'ros') {
    if (G.mq === 1) { show([LINES.ros], () => { G.mq = 2; save(); }); return; }
    if (G.sq.storm === 'open' && G.mq >= 2) { show([LINES.stormStart], () => { G.sq.storm = 'search'; save(); }); return; }
    if (G.mq >= 6) { show([LINES.rosLate]); return; }
    show([LINES.rosHint]);
    return;
  }
  if (id === 'nuke') {
    if (G.sq.storm === 'search' && G.mirage >= 3) {
      G.sq.storm = 'done';
      show([LINES.stormEnd], () => save());
    }
    return;
  }
  if (id === 'tired') {
    if (G.sq.due === 'open') show([LINES.dueStart], () => { G.sq.due = 'follow'; save(); });
    return;
  }
  if (id === 'rusty') {
    const near = Math.hypot(G.who.tired.x - TOWN.rusty.x, G.who.tired.z - TOWN.rusty.z) < 6;
    if (G.sq.due === 'follow' && near) show([LINES.dueEnd], () => { G.sq.due = 'done'; save(); });
    else show([{ id: 'rusty', name: 'Rusty', title: 'Hauler', couplet: 'We carry more than cargo. We carry hope.', body: 'The pad is clear. If someone is done with a poster, walk them here and the haul is theirs.' }]);
    return;
  }
  if (id === 'ds') {
    if (G.sq.comic === 'open') {
      show([LINES.comicStart], () => {
        G.sq.comic = 'qte';
        G.qte = { t: 0, hits: 0, window: false, arm: true };
        G.flags.qteDone = false;
        G.mode = 'qte';
      });
      return;
    }
    if (G.sq.comic === 'hush' && G.comicFreed) show([LINES.comicEnd], () => { G.sq.comic = 'done'; save(); });
    else if (G.sq.comic === 'hush') show([{ id: 'ds', name: 'Drill Sergeant', title: 'Quiet Room', couplet: 'The joke has landed and the hush remains; SHIFT west of the lights and give the room a name', body: 'Push forward. The silent nightmare is in the dream, just west of Drift\'s.' }]);
    else show([{ id: 'ds', name: 'Drill Sergeant', title: 'Push Forward', couplet: 'Embrace the void, cadets. Unbreakable.', body: 'He is off duty and still standing like the room might be called to attention.' }]);
    return;
  }
  if (id === 'kid') {
    if (G.sq.crunch === 'open') show([LINES.crunchStart], () => { G.sq.crunch = 'bowl'; save(); });
    else if (G.sq.crunch === 'done') show([LINES.crunchEnd]);
    return;
  }
  if (id === 'slide') { show([LINES.slide]); return; }
  if (id === 'patron') { show([LINES.patron]); return; }
}

function show(cards, done) {
  G.queue = cards.slice();
  G.onDone = done || null;
  G.mode = 'card';
  renderCard();
  syncHud();
}

function dismiss() {
  if (G.mode !== 'card') return;
  G.queue.shift();
  if (G.queue.length) renderCard();
  else {
    const fn = G.onDone;
    G.onDone = null;
    G.mode = 'play';
    if (fn) fn();
    syncHud();
  }
}

function renderCard() {
  const c = G.queue[0];
  if (!c) return;
  $('cardName').textContent = c.name;
  $('cardCouplet').textContent = c.couplet;
  $('cardMark').textContent = `🫡 ${c.title} ✨`;
  $('cardBody').textContent = c.body;
  drawPortrait(c.id);
}

function tickQte(dt) {
  G.qte.t += dt;
  const cyc = G.qte.t % 1.25;
  G.qte.window = cyc > 0.8;
  if (!G.qte.window) G.qte.arm = true;
  const word = $('qteWord');
  word.textContent = G.qte.window ? 'NOW' : 'WAIT';
  word.classList.toggle('on', G.qte.window);
}

function qtePress() {
  if (!G.qte.window || !G.qte.arm || G.flags.qteDone) return;
  G.qte.arm = false;
  G.qte.hits++;
  if (G.qte.hits >= 3) {
    G.flags.qteDone = true;
    G.sq.comic = 'hush';
    show([LINES.comicSet], () => save());
  }
}

function refreshLocks() {
  let changed = false;
  if (G.mq >= 1) {
    for (const k of ['due', 'comic', 'crunch']) {
      if (G.sq[k] === 'locked') { G.sq[k] = 'open'; changed = true; }
    }
  }
  if (G.mq >= 2 && G.sq.storm === 'locked') { G.sq.storm = 'open'; changed = true; }
  if (changed) save();
}

function nearest(filter) {
  if (G.mode !== 'play' && G.mode !== 'qte') return null;
  const list = [];
  const add = (item) => { if (!filter || filter(item)) list.push(item); };
  const dream = realmOn();
  const npcs = [
    ['ls', 'Liberty Slugger', 3.1],
    ['ros', 'ROS', 3.1],
    ['nuke', 'Nuke', 2.6],
    ['tired', 'Tired Rider', 3.1],
    ['kid', 'Young Rider', 3.1],
    ['rusty', 'Rusty', 3.2],
    ['ds', 'Drill Sergeant', 3.2],
    ['slide', 'Slide', 3.2],
    ['patron', 'Regular', 2.8],
  ];
  for (const [id, name, rad] of npcs) {
    if (id === 'nuke' && !(G.sq.storm === 'search' && G.mirage >= 3)) continue;
    if (id === 'tired' && G.sq.due !== 'open') continue;
    const trailing = (id === 'ros' && G.mq >= 2) || (id === 'nuke' && G.sq.storm === 'search');
    const p = G.who[id];
    const d = Math.hypot(G.x - p.x, G.z - p.z);
    if (d <= (trailing ? 1.45 : rad)) add({ kind: 'npc', id, name, d, x: p.x, z: p.z, prio: 0 });
  }
  const cd = Math.hypot(G.x - TOWN.crack.x, G.z - TOWN.crack.z);
  if (cd < 4.2 && (G.mq === 2 || G.mq > 2)) add({ kind: 'crack', id: 'crack', name: 'Crack', d: cd, x: TOWN.crack.x, z: TOWN.crack.z, prio: 1 });
  if (!G.mount) {
    for (const [id, name, pos] of [['board', 'BOARD', G.board], ['bike', 'ROCKET BIKE', G.bike]]) {
      const d = Math.hypot(G.x - pos.x, G.z - pos.z);
      if (d < 3.6) add({ kind: 'vehicle', id, name, d, x: pos.x, z: pos.z, prio: 3 });
    }
  }
  if (!dream && G.mq >= 3) {
    DRONE_SPOTS.forEach((s, i) => {
      if (G.droneHits[i] >= 2) return;
      const bobX = s.x + Math.sin(G.time + i) * 1.4;
      const bobZ = s.z + Math.cos(G.time * 0.8 + i) * 1.4;
      const d = Math.hypot(G.x - bobX, G.z - bobZ);
      if (d < 6.2) add({ kind: 'foe', id: 'drone' + i, d, x: bobX, z: bobZ, prio: 2 });
    });
    if (G.mq >= 4 && G.sentinelPhase !== 'freed') {
      cast.anchors.forEach((a, i) => {
        if (G.anchorHits[i] >= 2) return;
        const d = Math.hypot(G.x - a.x, G.z - a.z);
        if (d < 7) add({ kind: 'foe', id: 'anchor' + i, d, x: a.x, z: a.z, prio: 2 });
      });
    }
  } else if (dream) {
    if (G.mq >= 5 && G.sentinelPhase !== 'freed') {
      cast.cores.forEach((a, i) => {
        if (G.coreHits[i] >= 2) return;
        const d = Math.hypot(G.x - a.x, G.z - a.z);
        if (d < 7) add({ kind: 'foe', id: 'core' + i, d, x: a.x, z: a.z, prio: 2 });
      });
    }
    if (G.sq.comic === 'hush' && !G.comicFreed) {
      const p = TOWN.hush;
      const d = Math.hypot(G.x - p.x, G.z - p.z);
      if (d < 6) add({ kind: 'foe', id: 'hush', d, x: p.x, z: p.z, prio: 2 });
    }
    if (G.sq.crunch === 'bowl' && !G.crunchFreed) {
      const b = surfaces().bowl;
      const d = Math.hypot(G.x - b.x, G.z - b.z);
      if (d < b.r + 1) add({ kind: 'foe', id: 'crunch', d, x: b.x, z: b.z, prio: 2 });
    }
    if (G.sq.storm === 'search') {
      MIRAGES.forEach((p, i) => {
        if (i !== G.mirage) return;
        const d = Math.hypot(G.x - p.x, G.z - p.z);
        if (d < 3.6) add({ kind: 'mirage', id: 'mirage', index: i, d, x: p.x, z: p.z, prio: 1 });
      });
    }
  }
  list.sort((a, b) => a.prio - b.prio || a.d - b.d);
  return list[0] || null;
}

function insideBowl() {
  const b = surfaces().bowl;
  return Math.hypot(G.x - b.x, G.z - b.z) < b.r * 0.75;
}

function movePlayer(dt) {
  let ix = (G.keys.right ? 1 : 0) - (G.keys.left ? 1 : 0) + G.joy.x;
  let iz = (G.keys.back ? 1 : 0) - (G.keys.forward ? 1 : 0) + G.joy.y;
  const pad = readMoveAxes();
  ix += pad.x;
  iz += pad.z;
  const mag = Math.hypot(ix, iz);
  if (mag > 1) { ix /= mag; iz /= mag; }
  const yaw = G.lookYaw;
  const fx = Math.sin(yaw);
  const fz = -Math.cos(yaw);
  const rx = Math.cos(yaw);
  const rz = Math.sin(yaw);
  const wishX = fx * -iz + rx * ix;
  const wishZ = fz * -iz + rz * ix;
  const sprint = !!(G.keys.sprint || G.padPrev.sprint);
  let speed = sprint ? 10.2 : 6.3;
  if (G.mount === 'board') speed = sprint ? 20 : 15.5;
  if (G.mount === 'bike') speed = sprint ? 30 : 23;
  const rate = G.mount === 'bike' ? 1.7 : G.mount === 'board' ? 2.5 : 7.5;
  const k = 1 - Math.exp(-rate * dt);
  G.vx += (wishX * speed - G.vx) * k;
  G.vz += (wishZ * speed - G.vz) * k;
  G.hx *= Math.exp(-3.2 * dt);
  G.hz *= Math.exp(-3.2 * dt);
  G.speed = Math.hypot(G.vx, G.vz);
  const dx = (G.vx + G.hx) * dt;
  const dz = (G.vz + G.hz) * dt;
  tryMove(dx, dz);
  if (G.speed > 0.8 && mag > 0.1) {
    const target = Math.atan2(wishX, -wishZ);
    G.face += angDiff(target, G.face) * Math.min(1, dt * 8);
  } else if (G.mount && G.speed > 1) {
    const target = Math.atan2(G.vx, -G.vz);
    G.face += angDiff(target, G.face) * Math.min(1, dt * 6);
  }
  vertical(dt);
  G.x = Math.max(-188, Math.min(188, G.x));
  G.z = Math.max(-188, Math.min(188, G.z));
}

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function surfaceY(x, z) {
  let y = heightAt(x, z);
  if (realmOn()) {
    const pad = padDeck(x, z);
    if (pad > y) y = pad;
    if (G.lucidity >= 40) {
      const b = bridgeDeck(x, z);
      if (b > y) y = b;
    }
  }
  return y;
}

function tryMove(dx, dz) {
  const nx = G.x + dx;
  const nz = G.z + dz;
  if (canStep(G.x, G.z, nx, nz)) { G.x = nx; G.z = nz; resolve(G); return; }
  if (canStep(G.x, G.z, nx, G.z)) { G.x = nx; resolve(G); return; }
  if (canStep(G.x, G.z, G.x, nz)) { G.z = nz; resolve(G); }
}

function canStep(x0, z0, x1, z1) {
  const h0 = surfaceY(x0, z0);
  const h1 = surfaceY(x1, z1);
  const horiz = Math.hypot(x1 - x0, z1 - z0) || 0.0001;
  if (h1 > h0 && (h1 - h0) / horiz > 0.95) return false;
  return true;
}

function radius() {
  return G.mount === 'bike' ? 1.05 : G.mount === 'board' ? 0.62 : 0.46;
}

function resolve() {
  const r = radius();
  for (let n = 0; n < 2; n++) {
    for (const c of world.colliders) {
      if (c.layer === 'dream' && !realmOn()) continue;
      if (c.layer === 'wake' && realmOn()) continue;
      const cx = Math.max(c.minX, Math.min(G.x, c.maxX));
      const cz = Math.max(c.minZ, Math.min(G.z, c.maxZ));
      let dx = G.x - cx;
      let dz = G.z - cz;
      const d2 = dx * dx + dz * dz;
      if (d2 >= r * r) continue;
      const d = Math.sqrt(d2) || 0.0001;
      if (d2 < 1e-8) { dx = 1; dz = 0; }
      const push = r - d + 0.001;
      G.x += (dx / d) * push;
      G.z += (dz / d) * push;
    }
    for (const m of world.circles) {
      let dx = G.x - m.x;
      let dz = G.z - m.z;
      const rr = m.r + r;
      const d = Math.hypot(dx, dz) || 0.0001;
      if (d < rr) {
        G.x = m.x + (dx / d) * rr;
        G.z = m.z + (dz / d) * rr;
      }
    }
  }
}

function vertical(dt) {
  const ground = surfaceY(G.x, G.z);
  const hover = G.mount === 'bike' ? 0.2 : G.mount === 'board' ? 0.42 : 0;
  const bob = Math.sin(G.time * (G.mount ? 8 : 2.2)) * (G.mount ? 0.045 : 0);
  if (G.lift > 0 || G.vy > 0) {
    G.vy -= 28 * dt;
    G.lift += G.vy * dt;
    if (G.lift <= 0 && G.vy <= 0) { G.lift = 0; G.vy = 0; }
  } else if (ground < G.displayY - hover - 0.4) {
    G.lift = Math.max(0, G.displayY - hover - ground);
    G.vy = Math.min(G.vy, 0);
  }
  G.displayY = ground + G.lift + hover + bob;
}

function followers(dt) {
  const follow = (id, dist, side) => {
    const backX = -Math.sin(G.face);
    const backZ = Math.cos(G.face);
    const rightX = Math.cos(G.face);
    const rightZ = Math.sin(G.face);
    const tx = G.x + backX * dist + rightX * side;
    const tz = G.z + backZ * dist + rightZ * side;
    steer(G.who[id], tx, tz, G.mount ? 16 : 7.2, dt);
  };
  if (G.mq >= 2) follow('ros', 2.5, 0.95);
  if (G.mq >= 2 && G.sq.storm !== 'search') follow('nuke', 1.8, -0.85);
  if (G.sq.storm === 'search') {
    const goal = MIRAGES[Math.min(2, G.mirage)];
    steer(G.who.nuke, goal.x, goal.z, 8, dt);
  }
  if (G.sq.due === 'follow') follow('tired', 2.2, -1.3);
}

function steer(body, tx, tz, speed, dt) {
  const dx = tx - body.x;
  const dz = tz - body.z;
  const d = Math.hypot(dx, dz);
  if (d > 22) { body.x = tx; body.z = tz; }
  else if (d > 0.85) {
    const step = Math.min(d - 0.8, speed * dt);
    body.x += (dx / d) * step;
    body.z += (dz / d) * step;
    body.yaw = Math.atan2(dx, -dz);
  }
}

function pickups() {
  for (const c of cast.crosses) {
    if (G.taken.includes(c.id)) continue;
    if (Math.hypot(G.x - c.x, G.z - c.z) < 1.5) {
      G.taken.push(c.id);
      G.crosses = Math.min(5, G.crosses + 1);
      fluff.burst(c.x, heightAt(c.x, c.z) + 0.8, c.z, 0x88ffb0);
      save();
    }
  }
}

function proximity() {
  if (G.mq === 4 && !G.flags.sentinelCard) {
    const d = Math.hypot(G.x - TOWN.sentinel.x, G.z - TOWN.sentinel.z);
    if (d < 22) {
      G.flags.sentinelCard = true;
      G.sentinelPhase = 'wake';
      show([LINES.sentinelIntro], () => save());
    }
  }
}

function shock(dt) {
  const phase = G.sentinelPhase;
  const hot = phase === 'wake' || phase === 'dream';
  const mesh = cast.shock;
  if (!hot) { mesh.material.opacity = 0; return; }
  if (phase === 'dream' && !realmOn()) { mesh.material.opacity = 0; return; }
  if (phase === 'wake' && realmOn()) { mesh.material.opacity = 0; return; }
  G.ringT += dt;
  const period = phase === 'dream' ? 5.4 : 4.3;
  const t = G.ringT % period;
  const growT = period - 0.35;
  const r = 4 + 14 * Math.min(1, t / growT);
  mesh.position.set(TOWN.sentinel.x, heightAt(TOWN.sentinel.x, TOWN.sentinel.z) + 0.25, TOWN.sentinel.z);
  mesh.scale.setScalar(r);
  const danger = t >= growT;
  mesh.material.color.set(danger ? 0xfff2ea : 0xffb03a);
  mesh.material.opacity = danger ? 0.85 : 0.38;
  if (danger) {
    const d = Math.hypot(G.x - TOWN.sentinel.x, G.z - TOWN.sentinel.z);
    if (Math.abs(d - r) < 1.35) {
      const len = d || 1;
      hurt((G.x - TOWN.sentinel.x) / len, (G.z - TOWN.sentinel.z) / len);
    }
  }
}

function hurt(dx, dz) {
  if (G.inv > 0 || G.mode !== 'play') return;
  G.crosses -= 1;
  G.inv = 1.5;
  G.hx = dx * 9;
  G.hz = dz * 9;
  G.vy = 5;
  G.lift = Math.max(G.lift, 0.2);
  if (G.crosses <= 0) {
    G.crosses = 5;
    G.lucidity = Math.max(G.lucidity, 40);
    G.x = TOWN.ls.x;
    G.z = TOWN.ls.z + 3;
    G.lift = 0;
    G.vy = 0;
    G.displayY = heightAt(G.x, G.z);
    show([LINES.still], () => save());
  }
}

function lucidity(dt) {
  let near = false;
  if (!realmOn()) {
    DRONE_SPOTS.forEach((s, i) => {
      if (G.droneHits[i] < 2 && Math.hypot(G.x - s.x, G.z - s.z) < 8) near = true;
    });
  } else if (G.sentinelPhase === 'dream' && Math.hypot(G.x - TOWN.sentinel.x, G.z - TOWN.sentinel.z) < 18) near = true;
  if (realmOn() && near) G.lucidity = Math.max(0, G.lucidity - 7 * dt);
  else G.lucidity = Math.min(100, G.lucidity + (realmOn() ? 3.2 : 1.3) * dt);
}

function tickActors(dt) {
  const dream = realmOn();
  const rideY = G.displayY + (G.mount === 'bike' ? 0.48 : 0);
  const bob = Math.abs(Math.sin(G.time * 9)) * Math.min(0.07, (G.speed || 0) * 0.012);
  placeRider(cast.skippy, G.x, rideY + bob, G.face);
  cast.skippy.group.visible = G.inv <= 0 || Math.sin(G.time * 28) > 0;
  cast.skippy.label.visible = false;
  animateRider(cast.skippy, G.time, G.mode === 'play' ? G.speed : 0, !!G.mount);

  const roster = [
    ['ls', cast.ls], ['ros', cast.ros], ['tired', cast.tired], ['kid', cast.kid],
    ['rusty', cast.rusty], ['ds', cast.ds], ['slide', cast.slide], ['patron', cast.patron],
  ];
  for (const [id, actor] of roster) {
    const p = G.who[id];
    const y = heightAt(p.x, p.z);
    actor.group.position.set(p.x, y, p.z);
    actor.group.rotation.y = p.yaw;
    actor.group.visible = true;
    const moving = id === 'ros' || id === 'tired' ? 3 : 0;
    animateRider(actor, G.time, moving, false);
    actor.label.visible = Math.hypot(G.x - p.x, G.z - p.z) < 20 && G.mode === 'play';
  }
  const nk = G.who.nuke;
  const nukeY = heightAt(nk.x, nk.z);
  cast.nuke.group.position.set(nk.x, nukeY, nk.z);
  cast.nuke.group.rotation.y = nk.yaw || 0;
  cast.nuke.label.visible = Math.hypot(G.x - nk.x, G.z - nk.z) < 20 && G.mode === 'play';
  cast.nuke.legs.forEach((leg, i) => { leg.rotation.x = Math.sin(G.time * 10 + i) * 0.4; });

  placeVehicle(cast.board, G.mount === 'board' ? { x: G.x, z: G.z, y: G.displayY - 0.05 } : null, G.board, 0.15);
  placeVehicle(cast.bike, G.mount === 'bike' ? { x: G.x, z: G.z, y: G.displayY - 0.15 } : null, G.bike, 0.35);
  cast.hauler.position.set(TOWN.hauler.x, heightAt(TOWN.hauler.x, TOWN.hauler.z), TOWN.hauler.z);

  DRONE_SPOTS.forEach((s, i) => {
    const mesh = cast.drones[i].mesh;
    const freed = G.droneHits[i] >= 2;
    mesh.visible = !dream && !freed;
    const x = s.x + Math.sin(G.time * 0.8 + i) * 1.4;
    const z = s.z + Math.cos(G.time * 0.7 + i) * 1.4;
    mesh.position.set(x, heightAt(x, z) + 2.3 + Math.sin(G.time * 2 + i) * 0.25, z);
    mesh.rotation.y = G.time * 0.8;
  });

  cast.anchors.forEach((a, i) => {
    const done = G.anchorHits[i] >= 2;
    a.mesh.visible = !dream && G.mq >= 4 && G.sentinelPhase !== 'freed';
    a.mesh.position.y = heightAt(a.x, a.z) + 1.15 + Math.sin(G.time * 2 + i) * 0.15;
    a.mesh.rotation.y = G.time;
    a.mesh.material.emissive.set(done ? 0xffe08a : 0xd23ca8);
    a.mesh.material.emissiveIntensity = done ? 1.7 : 0.65;
  });
  cast.cores.forEach((a, i) => {
    const done = G.coreHits[i] >= 2;
    a.mesh.visible = dream && G.mq >= 5 && G.sentinelPhase !== 'freed';
    a.mesh.position.set(a.x, heightAt(a.x, a.z) + 2.1 + Math.sin(G.time * 1.6 + i) * 0.2, a.z);
    a.mesh.scale.setScalar(done ? 0.35 : 1 + Math.sin(G.time * 2 + i) * 0.06);
  });
  const hush = cast.puffs.hush;
  hush.mesh.visible = dream && G.sq.comic === 'hush' && !G.comicFreed;
  hush.mesh.position.y = heightAt(TOWN.hush.x, TOWN.hush.z) + 1.35;
  hush.mesh.rotation.y = G.time * 0.6;
  const crunch = cast.puffs.crunch;
  const bowl = surfaces().bowl;
  crunch.mesh.visible = dream && G.sq.crunch === 'bowl' && !G.crunchFreed;
  crunch.mesh.position.set(bowl.x, bowl.y + 1.3, bowl.z);
  crunch.mesh.rotation.y = -G.time * 0.5;

  cast.crack.visible = dream;
  cast.crack.material.opacity = 0.55 + Math.sin(G.time * 3) * 0.2;
  cast.mirages.forEach((m, i) => {
    const showM = dream && G.sq.storm === 'search' && i === G.mirage;
    m.actor.group.visible = showM;
    m.actor.group.position.y = heightAt(m.x, m.z) + Math.sin(G.time * 2 + i) * 0.15;
  });
  cast.macho.group.visible = false;

  cast.crosses.forEach((c) => {
    c.mesh.visible = !G.taken.includes(c.id);
    c.mesh.position.y = heightAt(c.x, c.z) + 0.85 + Math.sin(G.time * 3) * 0.08;
    c.mesh.rotation.y = G.time;
  });

  styleSentinel();
  const beams = objectives();
  cast.beams.forEach((b, i) => {
    const o = beams[i];
    b.visible = !!o && (G.mode === 'play' || G.mode === 'qte');
    if (!o) return;
    b.position.set(o.x, heightAt(o.x, o.z) + 14, o.z);
    b.material.color.set(o.main ? 0xffe08a : 0x7ef6ff);
    b.material.opacity = 0.16 + Math.sin(G.time * 3 + i) * 0.05;
  });

  if (cast.pulse.userData.life > 0) {
    cast.pulse.userData.life -= dt;
    const u = 1 - cast.pulse.userData.life / 0.38;
    cast.pulse.scale.setScalar(0.4 + u * 5.5);
    cast.pulse.material.opacity = 0.8 * (1 - u);
    cast.pulse.visible = cast.pulse.userData.life > 0;
  }

  fluff.tick(dt);
  world.dreamRoot.visible = dream;
  world.wakeRoot.visible = !dream;
  const flash = Math.max(0, 1 - Math.abs(G.realm - 0.5) * 7);
  $('flash').style.opacity = String(flash * 0.72);
}

function placeRider(actor, x, y, yaw) {
  actor.group.position.set(x, y, G.z);
  actor.group.rotation.y = yaw;
}

function placeVehicle(mesh, mounted, park, sink) {
  const p = mounted || park;
  const y = mounted ? mounted.y : heightAt(p.x, p.z) + sink;
  mesh.position.set(p.x, y, p.z);
  mesh.rotation.y = G.mount && mounted ? G.face : 0;
}

function styleSentinel() {
  const s = cast.sentinel;
  const freed = G.sentinelPhase === 'freed';
  const dreamFight = realmOn() && G.mq >= 5 && !freed;
  s.eye.visible = dreamFight;
  s.hood.visible = dreamFight;
  s.stone.emissive.set(freed ? 0xffc56a : 0x000000);
  s.stone.emissiveIntensity = freed ? 0.62 : 0;
  s.slit.material.emissiveIntensity = freed ? 1.8 : 0.35;
  const lean = G.sentinelPhase === 'sleep' ? 0.42 : freed ? 0.62 : 0;
  s.group.rotation.x = lean;
  const base = heightAt(TOWN.sentinel.x, TOWN.sentinel.z);
  s.group.position.y = base - (freed ? 1.2 : 0);
  if (dreamFight && G.sentinelPhase === 'ready') G.sentinelPhase = 'dream';
  if (!realmOn() && G.sentinelPhase === 'dream') G.sentinelPhase = 'ready';
}

function objectives() {
  const o = [];
  if (G.mq === 0) o.push({ x: TOWN.ls.x, z: TOWN.ls.z, main: true });
  else if (G.mq === 1) o.push({ x: TOWN.ros.x, z: TOWN.ros.z, main: true });
  else if (G.mq === 2) o.push({ x: TOWN.crack.x, z: TOWN.crack.z, main: true });
  else if (G.mq === 3) {
    DRONE_SPOTS.forEach((s, i) => { if (G.droneHits[i] < 2) o.push({ x: s.x, z: s.z, main: true }); });
  } else if (G.mq === 4 || G.mq === 5) o.push({ x: TOWN.sentinel.x, z: TOWN.sentinel.z, main: true });
  if (G.sq.due === 'open') o.push({ x: TOWN.tired.x, z: TOWN.tired.z });
  if (G.sq.due === 'follow') o.push({ x: TOWN.rusty.x, z: TOWN.rusty.z });
  if (G.sq.comic === 'open' || (G.sq.comic === 'hush' && G.comicFreed)) o.push({ x: TOWN.ds.x, z: TOWN.ds.z });
  if (G.sq.comic === 'hush' && !G.comicFreed) o.push({ x: TOWN.hush.x, z: TOWN.hush.z });
  if (G.sq.storm === 'open') o.push({ x: TOWN.ros.x, z: G.who.ros.z });
  if (G.sq.storm === 'search') {
    const m = MIRAGES[Math.min(2, G.mirage)] || MIRAGES[2];
    o.push({ x: m.x, z: m.z });
  }
  if (G.sq.crunch === 'open') o.push({ x: TOWN.kid.x, z: TOWN.kid.z });
  if (G.sq.crunch === 'bowl') o.push({ x: surfaces().bowl.x, z: surfaces().bowl.z });
  return o.slice(0, cast.beams.length);
}

function questTitle() {
  return ['Pull Up a Stool', 'Hat Low', 'Crack in the Air', 'Eyes off the Trail', 'The Sleeping Guardian', 'Inside the Dream', 'The Pour Is Open'][G.mq] || 'The Pour Is Open';
}

function questDetail() {
  const side = [];
  if (G.sq.due === 'open' || G.sq.due === 'follow') side.push('Past Due');
  if (G.sq.comic === 'open' || G.sq.comic === 'qte' || G.sq.comic === 'hush') side.push("Comedian at Drift's");
  if (G.sq.storm === 'open' || G.sq.storm === 'search') side.push('Nuke in the Sandstorm');
  if (G.sq.crunch === 'open' || G.sq.crunch === 'bowl') side.push('Cosmic Crunchies Morning');
  const main = [
    'Find the Liberty Slugger at the Pioneer Pour.',
    'Talk to ROS under the awning. He will not do a warm reunion.',
    'Nuke found a crack behind the Pour. SHIFT if the seam is too thin, then listen.',
    `Free the hunter-eyes on the north road. ${G.droneHits.filter((h) => h >= 2).length}/3`,
    'Wake the Giant Sentinel. Free the dark crystals. Do not break the guardian.',
    'SHIFT into the Sentinel\'s dream and free the cores.',
    'The guardian is awake. The desert is yours to ride.',
  ][G.mq] || '';
  return side.length ? `${main}  ·  ${side.join(', ')}` : main;
}

function promptText() {
  if (G.mode !== 'play') return '';
  if (G.mount) {
    const hit = nearest();
    if (hit && hit.kind !== 'vehicle') return `E  ${hit.kind === 'foe' ? 'FREE' : 'TALK'} · F  STEP OFF`;
    return 'F  STEP OFF';
  }
  const hit = nearest();
  if (!hit) return '';
  if (hit.kind === 'npc') return `E  TALK · ${hit.name}`;
  if (hit.kind === 'foe') {
    if (hit.id === 'crunch' && !insideBowl()) return 'STEP INTO THE BOWL';
    return 'E  FREE';
  }
  if (hit.kind === 'crack') return realmOn() ? 'E  LISTEN' : 'Q  SHIFT · THE SEAM IS THIN';
  if (hit.kind === 'mirage') return 'E  FOLLOW';
  if (hit.kind === 'vehicle') return `F  RIDE ${hit.name}`;
  return '';
}

function syncHud() {
  const mode = G.mode;
  document.body.classList.toggle('live', mode !== 'title');
  document.body.classList.toggle('playing', mode === 'play');
  document.body.classList.toggle('card', mode === 'card');
  document.body.classList.toggle('qte', mode === 'qte');
  document.body.classList.toggle('paused', mode === 'pause');
  document.body.classList.toggle('log', mode === 'log');
  document.body.classList.toggle('map', mode === 'map');
  document.body.classList.toggle('touch', G.touch);
  setText($('qtitle'), questTitle());
  setText($('qdetail'), questDetail());
  setText($('realmBadge'), realmOn() ? 'DREAM' : 'WAKING');
  setText($('prompt'), promptText());
  const news = realmOn() ? 'THE DREAM IS LISTENING' : NEWS[Math.floor(G.time / 5.5) % NEWS.length];
  setText($('news'), news);
  $('lucfill').style.width = `${Math.round(G.lucidity)}%`;
  document.querySelectorAll('#crosses .cross').forEach((el, i) => el.classList.toggle('on', i < G.crosses));
  if (mode === 'log') renderLog();
  if (mode === 'map') drawMap();
  if (mode === 'play' || mode === 'qte') drawMini();
}

function setText(el, t) { if (el && el.textContent !== t) el.textContent = t; }

function buildCrosses() {
  const box = $('crosses');
  box.replaceChildren();
  for (let i = 0; i < 5; i++) {
    const s = document.createElement('div');
    s.className = 'cross on';
    box.append(s);
  }
}

function renderLog() {
  const body = $('logBody');
  body.replaceChildren();
  const items = [
    { kind: 'MAIN', title: questTitle(), detail: questDetail() },
    { kind: 'SIDE', title: 'Past Due', detail: sideText(G.sq.due, 'A tired rider and a poster at the Dawn Diner.') },
    { kind: 'SIDE', title: "The Comedian at Drift's", detail: sideText(G.sq.comic, 'Help the Drill Sergeant land the set, then the quiet dream.') },
    { kind: 'SIDE', title: 'Nuke in the Sandstorm', detail: sideText(G.sq.storm, 'A mirage on the west mesa. Dream only.') },
    { kind: 'SIDE', title: 'Cosmic Crunchies Morning', detail: sideText(G.sq.crunch, 'Stand in the dream bowl with the young rider\'s fright.') },
  ];
  for (const item of items) {
    const div = document.createElement('div');
    div.className = 'qitem';
    const em = document.createElement('em');
    em.textContent = item.kind;
    const b = document.createElement('div');
    b.textContent = item.title;
    const s = document.createElement('div');
    s.textContent = item.detail;
    div.append(em, b, s);
    body.append(div);
  }
}

function sideText(state, blurb) {
  if (state === 'locked') return 'Not open yet. ' + blurb;
  if (state === 'done') return 'Finished. ' + blurb;
  return state.toUpperCase() + ' — ' + blurb;
}

function drawMini() {
  const w = mini.width;
  const ctx = mctx;
  ctx.clearRect(0, 0, w, w);
  ctx.save();
  ctx.beginPath();
  ctx.arc(w / 2, w / 2, w / 2 - 2, 0, Math.PI * 2);
  ctx.clip();
  ctx.fillStyle = realmOn() ? '#2a1438' : '#d7b384';
  ctx.fillRect(0, 0, w, w);
  const scale = w / 120;
  const yaw = -G.lookYaw;
  const co = Math.cos(yaw);
  const si = Math.sin(yaw);
  const dot = (x, z, color, r) => {
    const dx = (x - G.x) * scale;
    const dz = (z - G.z) * scale;
    const rx = dx * co - dz * si;
    const ry = dx * si + dz * co;
    if (rx * rx + ry * ry > (w / 2 - 6) ** 2) return;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(w / 2 + rx, w / 2 + ry, r, 0, Math.PI * 2);
    ctx.fill();
  };
  ctx.strokeStyle = realmOn() ? '#6a5080' : '#6d6248';
  ctx.lineWidth = 3;
  for (const line of ROADS.concat(TRAILS)) {
    ctx.beginPath();
    line.forEach((p, i) => {
      const dx = (p[0] - G.x) * scale;
      const dz = (p[1] - G.z) * scale;
      const rx = w / 2 + dx * co - dz * si;
      const ry = w / 2 + dx * si + dz * co;
      if (i === 0) ctx.moveTo(rx, ry);
      else ctx.lineTo(rx, ry);
    });
    ctx.stroke();
  }
  dot(TOWN.pour.x, TOWN.pour.z, '#ff6840', 4);
  for (const o of objectives()) dot(o.x, o.z, o.main ? '#ffd56a' : '#7ef6ff', o.main ? 4.5 : 3.2);
  if (G.mq >= 2) dot(G.who.ros.x, G.who.ros.z, '#c4232a', 3);
  ctx.restore();
  ctx.fillStyle = '#fff6df';
  ctx.beginPath();
  ctx.moveTo(w / 2, w / 2 - 7);
  ctx.lineTo(w / 2 + 5, w / 2 + 6);
  ctx.lineTo(w / 2 - 5, w / 2 + 6);
  ctx.closePath();
  ctx.fill();
}

function drawMap() {
  const W = mapcv.width;
  const ctx = mapctx;
  ctx.fillStyle = realmOn() ? '#241028' : '#e6c89a';
  ctx.fillRect(0, 0, W, W);
  const pt = (x, z) => [(x + 200) * (W / 400), (z + 200) * (W / 400)];
  ctx.strokeStyle = '#4a463c';
  ctx.lineWidth = 4;
  for (const line of ROADS.concat(TRAILS)) {
    ctx.beginPath();
    line.forEach((p, i) => {
      const [sx, sy] = pt(p[0], p[1]);
      if (i === 0) ctx.moveTo(sx, sy); else ctx.lineTo(sx, sy);
    });
    ctx.stroke();
  }
  ctx.fillStyle = '#c47a48';
  for (const m of MESAS) {
    const [sx, sy] = pt(m.x, m.z);
    ctx.beginPath();
    ctx.arc(sx, sy, m.r * (W / 400), 0, Math.PI * 2);
    ctx.fill();
  }
  const mark = (x, z, color, label) => {
    const [sx, sy] = pt(x, z);
    ctx.fillStyle = color;
    ctx.fillRect(sx - 4, sy - 4, 8, 8);
    ctx.fillStyle = '#1a100c';
    ctx.font = '14px Trebuchet MS, Arial';
    ctx.fillText(label, sx + 8, sy + 4);
  };
  mark(TOWN.pour.x, TOWN.pour.z, '#ff6840', 'Pioneer Pour');
  mark(TOWN.pad.x, TOWN.pad.z, '#ffb03a', 'Pad');
  mark(TOWN.diner.x, TOWN.diner.z, '#14b8b0', 'Dawn Diner');
  mark(TOWN.drifts.x, TOWN.drifts.z, '#ff4f9a', "Drift's");
  mark(TOWN.sentinel.x, TOWN.sentinel.z, '#7a4ea3', 'Sentinel');
  for (const o of objectives()) {
    const [sx, sy] = pt(o.x, o.z);
    ctx.strokeStyle = o.main ? '#ffd56a' : '#7ef6ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, 10, 0, Math.PI * 2);
    ctx.stroke();
  }
  const [px, py] = pt(G.x, G.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(G.face);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(0, -8);
  ctx.lineTo(6, 7);
  ctx.lineTo(-6, 7);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function renderFrame() {
  styleLights();
  updateCamera();
  world.sky.position.copy(camera.position);
  if (world.water) {
    world.water.material.uniforms.time.value = G.time;
    world.water.material.uniforms.dream.value = G.realm;
  }
  if (world.dust) {
    world.dust.mat.uniforms.uTime.value = G.time;
    world.dust.mat.uniforms.uColor.value.copy(COL.dustW).lerp(COL.dustD, G.realm);
  }
  world.neons.forEach((m, i) => {
    if (!m.userData.base) m.userData.base = m.emissiveIntensity || 1.5;
    m.emissiveIntensity = m.userData.base * (0.82 + 0.18 * Math.sin(G.time * 6 + i));
  });
  if (G.api === 'webgl2' && G.features.post && composer) {
    if (gradePass) {
      gradePass.uniforms.time.value = G.time;
      gradePass.uniforms.dream.value = G.realm;
      gradePass.uniforms.heat.value = G.settings.quality === 'low' ? 0 : 1;
    }
    composer.render();
  } else renderer.render(scene, camera);
  G.drawCalls = renderer.info?.render?.calls || 0;
}

function styleLights() {
  const dream = G.realm;
  const elev = 0.15 + Math.sin(G.day * Math.PI) * 0.75;
  const az = G.day * Math.PI * 2;
  const dir = sun.position;
  dir.set(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev)).normalize().multiplyScalar(60);
  dir.x += G.x;
  dir.z += G.z;
  sun.position.copy(dir);
  sunTarget.position.set(G.x, 0, G.z);
  sun.color.copy(COL.wakeSun).lerp(COL.dreamSun, dream);
  sun.intensity = 1.65 * (0.55 + 0.45 * Math.max(0.2, elev)) * (1 - dream * 0.28);
  hemi.color.copy(COL.wakeTop).lerp(COL.dreamTop, dream);
  hemi.groundColor.copy(COL.fogW).lerp(new THREE.Color('#1a0824'), dream);
  hemi.intensity = 0.48;
  scene.fog.color.copy(COL.fogW).lerp(COL.fogD, dream);
  let density = 0.008 + dream * 0.012;
  if (dream && G.lucidity < 20) density += 0.008;
  const mesaD = Math.hypot(G.x + 100, G.z - 8);
  if (!dream && mesaD < 28) density += (1 - mesaD / 28) * 0.02;
  scene.fog.density = density;
  world.skyMat.uniforms.dream.value = dream;
  world.skyMat.uniforms.time.value = G.time;
  world.skyMat.uniforms.top.value.copy(COL.wakeTop).lerp(COL.dreamTop, dream);
  world.skyMat.uniforms.horizon.value.copy(COL.wakeHor).lerp(COL.dreamHor, dream);
  world.skyMat.uniforms.bottom.value.copy(COL.wakeBot).lerp(COL.dreamBot, dream);
  world.skyMat.uniforms.sun.value.copy(COL.wakeSun).lerp(COL.dreamSun, dream);
  const sunDir = world.skyMat.uniforms.sunDir.value;
  sunDir.set(Math.cos(az) * Math.cos(elev), Math.sin(elev), Math.sin(az) * Math.cos(elev)).normalize();
  scene.environment = dream > 0.5 ? G.envDream : G.envWake;
  scene.environmentIntensity = 1;
}

function updateCamera() {
  G.lookYaw -= G.lookDx * G.settings.sens;
  G.lookPitch += G.lookDy * G.settings.sens * (G.settings.invert ? -1 : 1);
  G.lookDx = 0;
  G.lookDy = 0;
  G.lookPitch = Math.max(0.12, Math.min(1.15, G.lookPitch));
  if (G.mode === 'title' || (G.mode === 'cine' && !G.shot)) {
    const target = G.mode === 'cine' ? TOWN.sentinel : TOWN.pour;
    const a = G.time * (G.mode === 'cine' ? 0.4 : 0.1);
    const r = G.mode === 'cine' ? 18 : 28;
    const y = heightAt(target.x, target.z);
    camera.position.set(target.x + Math.sin(a) * r, y + (G.mode === 'cine' ? 7 : 9), target.z + Math.cos(a) * r);
    camera.lookAt(target.x, y + 3.2, target.z);
    return;
  }
  if (G.shot?.cam) {
    camera.position.set(G.shot.cam[0], G.shot.cam[1], G.shot.cam[2]);
    camera.lookAt(G.shot.look[0], G.shot.look[1], G.shot.look[2]);
    return;
  }
  const dist = G.mount === 'bike' ? 8.4 : G.mount === 'board' ? 6.8 : 5.4;
  const cy = G.lookYaw;
  const cp = G.lookPitch;
  const fx = Math.sin(cy);
  const fz = -Math.cos(cy);
  const horiz = Math.cos(cp);
  let cx = G.x - fx * dist * horiz;
  let cz = G.z - fz * dist * horiz;
  let cyh = G.displayY + 1.45 + Math.sin(cp) * dist;
  const lookY = G.displayY + 1.25;
  const clip = camClip(G.x, lookY, G.z, cx, cyh, cz);
  cx = G.x + (cx - G.x) * clip;
  cyh = lookY + (cyh - lookY) * clip;
  cz = G.z + (cz - G.z) * clip;
  camera.position.set(cx, cyh, cz);
  camera.lookAt(G.x, lookY, G.z);
}

function camClip(tx, ty, tz, cx, cy, cz) {
  let best = 1;
  const dx = cx - tx;
  const dy = cy - ty;
  const dz = cz - tz;
  for (const b of world.colliders) {
    const t = rayAabb(tx, ty, tz, dx, dy, dz, b);
    if (t != null && t < best && t > 0.05) best = t * 0.92;
  }
  return Math.max(0.18, best);
}

function rayAabb(ox, oy, oz, dx, dy, dz, b) {
  let tmin = 0;
  let tmax = 1;
  const slabs = [[b.minX, b.maxX, dx, ox], [b.minY ?? 0, b.maxY ?? 20, dy, oy], [b.minZ, b.maxZ, dz, oz]];
  for (const [mn, mx, d, o] of slabs) {
    if (Math.abs(d) < 1e-8) {
      if (o < mn || o > mx) return null;
    } else {
      let t1 = (mn - o) / d;
      let t2 = (mx - o) / d;
      if (t1 > t2) { const s = t1; t1 = t2; t2 = s; }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmax < tmin) return null;
    }
  }
  return tmin;
}

function drawPortrait(id) {
  const g = pctx;
  const w = portrait.width;
  const h = portrait.height;
  const looks = {
    skippy: { head: '#f7f7fb', suit: '#f4f6f8', hat: '#d7a441', eye: 'slit', grin: true, beanie: true },
    ros: { head: '#7a4ea3', suit: '#c4232a', hat: '#6a4124', eye: 'green', poncho: true, sheriff: true },
    nuke: { robot: true },
    ls: { head: '#f6f4ef', suit: '#d7263d', hat: '#1d4e89', eye: 'oval', tophat: true, smile: true },
    ds: { head: '#f08a2a', suit: '#1aa7a1', hat: '#6a4124', eye: 'oval', sheriff: true, teeth: true },
    rusty: { head: '#1d3d8f', suit: '#e07020', hat: '#f2f4f6', eye: 'lidded', grin: true, trucker: true },
    slide: { head: '#8a4fd0', suit: '#f7f4fb', eye: 'lidded', smile: true, shades: true },
    rider: { head: '#c4a574', suit: '#6a7c92', hat: '#3d4a5c', eye: 'lidded' },
    kid: { head: '#f0c84a', suit: '#fff3d4', hat: '#d7a441', eye: 'slit', grin: true, beanie: true },
    patron: { head: '#3faf6a', suit: '#f2efe6', eye: 'oval', smile: true },
    macho: { head: '#f6e7b0', suit: '#f0d48a', eye: 'closed', ghost: true },
  };
  const L = looks[id] || looks.skippy;
  g.clearRect(0, 0, w, h);
  const bg = g.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#3a2048');
  bg.addColorStop(0.5, '#f0a050');
  bg.addColorStop(1, '#7a2030');
  g.fillStyle = bg;
  g.fillRect(0, 0, w, h);
  g.strokeStyle = 'rgba(255,240,200,0.35)';
  g.lineWidth = 2;
  for (let i = 0; i < 16; i++) {
    g.beginPath();
    g.moveTo(w / 2, 40);
    g.lineTo(Math.cos((i / 16) * Math.PI * 2) * w, Math.sin((i / 16) * Math.PI * 2) * h);
    g.stroke();
  }
  g.fillStyle = 'rgba(10,6,12,0.25)';
  for (let y = 0; y < h; y += 6) g.fillRect(0, y, w, 2);
  if (L.robot) {
    g.fillStyle = '#d5dde4';
    g.fillRect(130, 250, 160, 80);
    g.fillRect(150, 180, 120, 80);
    g.fillStyle = '#39ff7a';
    g.fillRect(168, 210, 84, 16);
    g.fillStyle = '#ff4f93';
    g.beginPath();
    g.arc(150, 250, 18, 0, 7);
    g.arc(270, 250, 18, 0, 7);
    g.fill();
    return;
  }
  g.fillStyle = L.suit;
  g.fillRect(120, 340, 180, 200);
  g.fillStyle = '#222';
  g.fillRect(175, 360, 70, 54);
  if (L.poncho) {
    g.fillStyle = '#8d2430';
    g.beginPath();
    g.moveTo(210, 330);
    g.lineTo(90, 520);
    g.lineTo(330, 520);
    g.fill();
  }
  g.fillStyle = L.head;
  g.beginPath();
  g.arc(210, 230, 92, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = '#111';
  if (L.eye === 'green') g.fillStyle = '#39ff7a';
  if (L.eye !== 'closed') {
    for (const s of [-1, 1]) {
      g.beginPath();
      g.ellipse(210 + s * 32, 214, 18, L.eye === 'lidded' ? 8 : 14, 0, 0, 7);
      g.fill();
      if (L.eye === 'slit') {
        g.fillStyle = '#fff';
        g.fillRect(206 + s * 32, 200, 4, 28);
        g.fillStyle = '#111';
      }
    }
  } else {
    g.strokeStyle = '#222';
    g.lineWidth = 4;
    for (const s of [-1, 1]) {
      g.beginPath();
      g.arc(210 + s * 32, 214, 16, Math.PI * 0.1, Math.PI * 0.9);
      g.stroke();
    }
  }
  g.fillStyle = '#ff4f93';
  for (const s of [-1, 1]) {
    g.beginPath();
    g.arc(210 + s * 48, 262, 14, 0, 7);
    g.fill();
  }
  g.fillStyle = '#161616';
  if (L.grin || L.teeth || L.smile) {
    g.beginPath();
    g.arc(210, 268, 28, 0.15 * Math.PI, 0.85 * Math.PI);
    g.lineWidth = 6;
    g.strokeStyle = '#161616';
    g.stroke();
  } else {
    g.fillRect(190, 270, 40, 6);
  }
  if (L.grin || L.teeth) {
    g.fillStyle = '#fff';
    g.fillRect(196, 274, 12, 10);
    g.fillRect(212, 274, 12, 10);
  }
  if (L.beanie || L.sheriff || L.tophat || L.trucker) {
    g.fillStyle = L.hat;
    if (L.beanie) {
      g.beginPath();
      g.arc(210, 168, 78, Math.PI, 0);
      g.fill();
      g.fillRect(140, 160, 140, 22);
    } else if (L.sheriff) {
      g.fillRect(150, 130, 120, 36);
      g.fillRect(120, 158, 180, 12);
      g.fillStyle = '#e8eef2';
      g.fillRect(188, 150, 44, 22);
    } else if (L.tophat) {
      g.fillRect(168, 70, 84, 100);
      g.fillRect(140, 160, 140, 14);
      g.fillStyle = '#f4f4f4';
      for (let i = 0; i < 4; i++) g.fillRect(168, 80 + i * 18, 84, 8);
    } else if (L.trucker) {
      g.fillRect(160, 140, 100, 40);
      g.fillStyle = '#c0392b';
      g.fillRect(175, 168, 70, 16);
    }
  }
  if (L.shades) {
    g.fillStyle = '#ff4fa8';
    g.fillRect(160, 200, 40, 18);
    g.fillRect(220, 200, 40, 18);
  }
  if (L.ghost) {
    g.fillStyle = 'rgba(255,244,200,0.25)';
    g.fillRect(0, 0, w, h);
  }
}

function readSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function snapshot() {
  return {
    v: 1,
    settings: G.settings,
    seenIntro: G.seenIntro,
    mq: G.mq,
    sq: G.sq,
    droneHits: G.droneHits,
    anchorHits: G.anchorHits,
    coreHits: G.coreHits,
    crosses: G.crosses,
    lucidity: G.lucidity,
    x: G.x,
    z: G.z,
    face: G.face,
    lookYaw: G.lookYaw,
    lookPitch: G.lookPitch,
    realmTarget: G.realmTarget,
    mount: G.mount,
    board: G.board,
    bike: G.bike,
    taken: G.taken,
    mirage: G.mirage,
    comicFreed: G.comicFreed,
    crunchFreed: G.crunchFreed,
    sentinelPhase: G.sentinelPhase,
    flags: G.flags,
    qteHits: G.qte.hits,
    who: G.who,
  };
}

function save() {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(snapshot())); } catch { /* private mode */ }
}

function applySave(data) {
  if (!data || data.v !== 1) return;
  if (data.settings) Object.assign(G.settings, data.settings);
  G.seenIntro = !!data.seenIntro;
  G.mq = data.mq || 0;
  G.sq = Object.assign({ due: 'locked', comic: 'locked', storm: 'locked', crunch: 'locked' }, data.sq || {});
  G.droneHits = data.droneHits || [0, 0, 0];
  G.anchorHits = data.anchorHits || [0, 0, 0];
  G.coreHits = data.coreHits || [0, 0, 0];
  G.crosses = data.crosses ?? 5;
  G.lucidity = data.lucidity ?? 62;
  G.x = data.x ?? TOWN.player.x;
  G.z = data.z ?? TOWN.player.z;
  G.face = data.face || 0;
  G.lookYaw = data.lookYaw || 0;
  G.lookPitch = data.lookPitch ?? 0.46;
  G.realmTarget = data.realmTarget || 0;
  G.realm = G.realmTarget;
  G.mount = data.mount || null;
  G.board = data.board || { x: TOWN.board.x, z: TOWN.board.z };
  G.bike = data.bike || { x: TOWN.bike.x, z: TOWN.bike.z };
  G.taken = data.taken || [];
  G.mirage = data.mirage || 0;
  G.comicFreed = !!data.comicFreed;
  G.crunchFreed = !!data.crunchFreed;
  G.sentinelPhase = data.sentinelPhase || 'sleep';
  G.flags = data.flags || {};
  G.qte.hits = data.qteHits || 0;
  G.who = data.who || freshWho();
  G.displayY = heightAt(G.x, G.z);
  G.lift = 0;
  G.vy = 0;
}

function startNew() {
  const keep = { ...G.settings };
  resetProgress();
  G.settings = keep;
  G.seenIntro = true;
  ensureAudio();
  show([LINES.intro], () => save());
}

function continueGame() {
  const data = readSave();
  if (!data) { startNew(); return; }
  applySave(data);
  G.mode = 'play';
  ensureAudio();
  save();
}

function bind() {
  $('playBtn').addEventListener('click', () => { ensureAudio(); startNew(); });
  $('continueBtn').addEventListener('click', () => { ensureAudio(); continueGame(); });
  $('cardNext').addEventListener('click', () => dismiss());
  $('resumeBtn').addEventListener('click', () => { G.mode = G.pausedFrom || 'play'; });
  $('titleBtn').addEventListener('click', () => { save(); G.mode = 'title'; $('continueBtn').hidden = !readSave()?.seenIntro; });
  $('logClose').addEventListener('click', () => { if (G.mode === 'log') G.mode = 'play'; });
  $('mapClose').addEventListener('click', () => { if (G.mode === 'map') G.mode = 'play'; });
  $('quality').addEventListener('change', () => { G.settings.quality = $('quality').value; applyQuality(); save(); });
  $('apiSel').addEventListener('change', () => { G.settings.api = $('apiSel').value; save(); location.reload(); });
  $('volume').addEventListener('input', () => { G.settings.volume = Number($('volume').value); if (audio) audio.master.gain.value = G.settings.volume; save(); });
  $('sens').addEventListener('input', () => { G.settings.sens = Number($('sens').value); save(); });
  $('invert').addEventListener('change', () => { G.settings.invert = $('invert').checked; save(); });

  const mapKey = {
    KeyW: 'forward', KeyA: 'left', KeyS: 'back', KeyD: 'right',
    ArrowUp: 'forward', ArrowLeft: 'left', ArrowDown: 'back', ArrowRight: 'right',
    Space: 'jump', ShiftLeft: 'sprint', ShiftRight: 'sprint',
    KeyE: 'use', KeyQ: 'realm', KeyF: 'ride', KeyM: 'map', KeyJ: 'quest', Escape: 'back',
  };
  addEventListener('keydown', (e) => {
    const name = mapKey[e.code];
    if (!name) return;
    e.preventDefault();
    press(name, true);
  });
  addEventListener('keyup', (e) => {
    const name = mapKey[e.code];
    if (!name) return;
    press(name, false);
  });
  const canvas = $('c');
  canvas.addEventListener('click', () => {
    if (G.touch || G.mode !== 'play') return;
    canvas.requestPointerLock?.();
  });
  addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas || e.buttons === 2) look(e.movementX, e.movementY);
  });
  addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('resize', resize);
  new ResizeObserver(resize).observe($('view'));

  const act = { jump: 'jump', shift: 'realm', use: 'use', ride: 'ride', back: 'back', map: 'map', quest: 'quest' };
  document.querySelectorAll('.ctl').forEach((btn) => {
    const name = act[btn.dataset.act];
    const down = (e) => {
      e.preventDefault();
      btn.classList.add('hot');
      press(name, true);
      try { btn.setPointerCapture?.(e.pointerId); } catch { /* synthetic touch in tests */ }
    };
    const up = () => { btn.classList.remove('hot'); press(name, false); };
    btn.addEventListener('pointerdown', down);
    btn.addEventListener('pointerup', up);
    btn.addEventListener('pointercancel', up);
    btn.addEventListener('lostpointercapture', up);
  });
  const stick = $('stick');
  const knob = $('knob');
  let joyId = null;
  stick.addEventListener('pointerdown', (e) => {
    joyId = e.pointerId;
    stick.classList.add('hot');
    joyMove(e);
    try { stick.setPointerCapture(e.pointerId); } catch { /* synthetic touch in tests */ }
  });
  stick.addEventListener('pointermove', (e) => { if (e.pointerId === joyId) joyMove(e); });
  const joyEnd = (e) => {
    if (e.pointerId !== joyId && joyId != null) return;
    joyId = null;
    stick.classList.remove('hot');
    G.joy.x = 0; G.joy.y = 0;
    knob.style.setProperty('--kx', '0px');
    knob.style.setProperty('--ky', '0px');
  };
  stick.addEventListener('pointerup', joyEnd);
  stick.addEventListener('pointercancel', joyEnd);
  function joyMove(e) {
    const r = stick.getBoundingClientRect();
    let x = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.38);
    let y = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.38);
    const m = Math.hypot(x, y) || 1;
    if (m > 1) { x /= m; y /= m; }
    G.joy.x = x;
    G.joy.y = y;
    knob.style.setProperty('--kx', `${x * 34}px`);
    knob.style.setProperty('--ky', `${y * 34}px`);
  }
  const lookEl = $('lookcatch');
  const looks = new Map();
  lookEl.addEventListener('pointerdown', (e) => { looks.set(e.pointerId, { x: e.clientX, y: e.clientY }); lookEl.setPointerCapture(e.pointerId); });
  lookEl.addEventListener('pointermove', (e) => {
    const prev = looks.get(e.pointerId);
    if (!prev) return;
    look(e.clientX - prev.x, e.clientY - prev.y);
    prev.x = e.clientX; prev.y = e.clientY;
  });
  const lookEnd = (e) => looks.delete(e.pointerId);
  lookEl.addEventListener('pointerup', lookEnd);
  lookEl.addEventListener('pointercancel', lookEnd);
}


function press(name, down) {
  if (down && !G.keys[name]) G.edge[name] = true;
  G.keys[name] = !!down;
}

function look(dx, dy) {
  G.lookDx += dx;
  G.lookDy += dy;
}

function pollPad() {
  const pad = currentPad();
  if (!pad) return;
  const b = (i) => !!(pad.buttons?.[i]?.pressed);
  const dead = (v) => Math.abs(v) < 0.18 ? 0 : v;
  G.padAxes = { x: dead(pad.axes?.[0] || 0), z: dead(pad.axes?.[1] || 0), lx: dead(pad.axes?.[2] || 0), ly: dead(pad.axes?.[3] || 0) };
  if (G.padAxes.lx || G.padAxes.ly) look(G.padAxes.lx * 18, G.padAxes.ly * 14);
  edgePad('jump', b(0));
  edgePad('back', b(1) || b(9));
  edgePad('use', b(2));
  edgePad('realm', b(3));
  edgePad('ride', b(4));
  edgePad('sprint', b(5) || b(7));
  edgePad('map', b(8));
}

function edgePad(name, down) {
  if (down && !G.padPrev[name]) G.edge[name] = true;
  G.padPrev[name] = down;
}

function currentPad() {
  if (G.fakePad !== undefined) return G.fakePad;
  const pads = navigator.getGamepads?.() || [];
  for (const p of pads) if (p) return p;
  return null;
}

function readMoveAxes() {
  return { x: G.padAxes?.x || 0, z: G.padAxes?.z || 0 };
}

function ensureAudio() {
  if (audio) { audio.ctx.resume(); return; }
  try {
    const ctx = new AudioContext();
    const master = ctx.createGain();
    master.gain.value = G.settings.volume;
    master.connect(ctx.destination);
    const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    noise.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 480;
    const wind = ctx.createGain();
    wind.gain.value = 0.045;
    noise.connect(filter); filter.connect(wind); wind.connect(master); noise.start();
    const dream = ctx.createOscillator();
    dream.type = 'sine';
    dream.frequency.value = 196;
    const dreamG = ctx.createGain();
    dreamG.gain.value = 0;
    dream.connect(dreamG); dreamG.connect(master); dream.start();
    const engine = ctx.createOscillator();
    engine.type = 'sawtooth';
    engine.frequency.value = 70;
    const eg = ctx.createGain();
    eg.gain.value = 0;
    const ef = ctx.createBiquadFilter();
    ef.type = 'lowpass';
    ef.frequency.value = 280;
    engine.connect(ef); ef.connect(eg); eg.connect(master); engine.start();
    audio = { ctx, master, wind, dreamG, engine, eg };
  } catch (err) {
    console.warn('audio unavailable');
  }
}

function updateAudio() {
  if (!audio) return;
  audio.master.gain.value = G.settings.volume;
  audio.wind.gain.value = 0.05 * (1 - G.realm);
  audio.dreamG.gain.value = 0.028 * G.realm;
  audio.eg.gain.value = G.mount && G.mode === 'play' ? Math.min(0.035, G.speed * 0.0016) : 0;
  audio.engine.frequency.value = 48 + G.speed * 3.5;
}

function syncPauseForm() {
  $('quality').value = G.settings.quality;
  $('apiSel').value = G.settings.api === 'webgpu' ? 'webgpu' : 'webgl';
  $('volume').value = String(G.settings.volume);
  $('sens').value = String(G.settings.sens);
  $('invert').checked = !!G.settings.invert;
  $('pauseStats').textContent = `API ${G.api} · quality ${G.settings.quality} · scale ${G.pixelScale.toFixed(2)} · p95 ${pct(0.95).toFixed(1)} ms${G.adapted ? ' · adapted' : ''}. Q is SHIFT. Shift sprints. BACK never strikes.`;
}

function toggleMap() {
  G.mode = G.mode === 'map' ? 'play' : 'map';
  if (G.mode === 'map') drawMap();
}

function toggleLog() {
  G.mode = G.mode === 'log' ? 'play' : 'log';
}

const api = {
  KEY: SAVE_KEY,
  get ready() { return G.ready; },
  startNew,
  continueGame,
  dismissCard: dismiss,
  save,
  getSave: readSave,
  setManual(v) { G.manual = !!v; if (!v) { last = performance.now(); requestAnimationFrame(loop); } },
  step(n) {
    for (let i = 0; i < n; i++) update(1 / 60);
    renderFrame();
  },
  press,
  look,
  setPad(pad) { G.fakePad = pad; },
  teleport(x, z) {
    G.x = x; G.z = z; G.lift = 0; G.vy = 0; G.vx = 0; G.vz = 0;
    G.displayY = surfaceY(x, z);
  },
  setLucidity(n) { G.lucidity = n; },
  setDay(n) { G.day = n; },
  setLook(yaw, pitch) {
    if (yaw != null) G.lookYaw = yaw;
    if (pitch != null) G.lookPitch = pitch;
  },
  setQuality(q) { G.settings.quality = q; applyQuality(); },
  spots() {
    return {
      drones: DRONE_SPOTS.map((d) => ({ x: d.x, z: d.z })),
      anchors: cast.anchors.map((a) => ({ x: a.x, z: a.z })),
      cores: cast.cores.map((a) => ({ x: a.x, z: a.z })),
      hush: { x: TOWN.hush.x, z: TOWN.hush.z },
      bowl: { x: surfaces().bowl.x, z: surfaces().bowl.z, r: surfaces().bowl.r },
      crack: { x: TOWN.crack.x, z: TOWN.crack.z },
      mirages: MIRAGES.map((m) => ({ x: m.x, z: m.z })),
      sentinel: { x: TOWN.sentinel.x, z: TOWN.sentinel.z },
    };
  },
  setRealm(name) {
    G.realmTarget = name === 'dream' ? 1 : 0;
    G.realm = G.realmTarget;
  },
  frameStats() {
    const workPct = (q) => {
      const a = (G.work || []).slice().sort((x, y) => x - y);
      if (!a.length) return 0;
      return a[Math.min(a.length - 1, Math.floor(q * (a.length - 1)))];
    };
    return { n: G.frames.length, p50: pct(0.5), p95: pct(0.95), min: G.frames.length ? Math.min(...G.frames) : 0, max: G.frames.length ? Math.max(...G.frames) : 0, quality: G.settings.quality, scale: G.pixelScale, api: G.api, adapted: G.adapted, draws: G.drawCalls || 0, workP50: workPct(0.5), workP95: workPct(0.95) };
  },
  resetStats() { G.frames = []; G.realFrames = 0; },
  state() {
    const hit = G.mode === 'play' ? nearest() : null;
    return {
      ready: G.ready,
      mode: G.mode,
      api: G.api,
      quality: G.settings.quality,
      pixelScale: G.pixelScale,
      x: G.x, z: G.z, y: G.displayY,
      yaw: G.lookYaw, face: G.face,
      realm: realmOn() ? 'dream' : 'wake',
      realmBlend: G.realm,
      lucidity: G.lucidity,
      crosses: G.crosses,
      mq: G.mq,
      mqTitle: questTitle(),
      sq: { ...G.sq },
      drones: G.droneHits.slice(),
      anchors: G.anchorHits.slice(),
      cores: G.coreHits.slice(),
      sentinel: G.sentinelPhase,
      mounted: G.mount,
      card: G.mode === 'card' && G.queue[0] ? { name: G.queue[0].name, title: G.queue[0].title, couplet: G.queue[0].couplet } : null,
      prompt: promptText(),
      qte: { on: G.mode === 'qte', hits: G.qte.hits, window: !!G.qte.window },
      pulseCount: G.pulseCount,
      pulseCd: G.pulseCd,
      crunchHits: cast?.puffs?.crunch?.hits || 0,
      backCount: G.backCount,
      frees: G.frees,
      touch: G.touch,
      seenIntro: G.seenIntro,
      bridgeSolid: realmOn() && G.lucidity >= 40,
      crackVisible: !!cast?.crack?.visible,
      dronesVisible: !!cast?.drones?.[0]?.mesh?.visible,
      bowlVisible: !!world?.dreamRoot?.visible,
      interact: hit ? hit.id : null,
      objective: questDetail(),
      who: JSON.parse(JSON.stringify(G.who)),
    };
  },
};

boot().catch((err) => {
  const el = $('booterr');
  el.style.display = 'block';
  el.textContent = 'The Pour could not open. ' + (err?.message || err);
  console.warn(err);
});

