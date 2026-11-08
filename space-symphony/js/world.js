import * as THREE from 'three';
import { TOWN, MESAS, LAMPS, ROADS, TRAILS, heightAt, polyDist, roadDist, surfaces } from './data.js';

const geos = new Map();
function boxGeo(THREE, w, h, d) {
  const k = `b${w}x${h}x${d}`;
  let g = geos.get(k);
  if (!g) {
    g = new THREE.BoxGeometry(w, h, d);
    geos.set(k, g);
  }
  return g;
}

function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeNoise(THREE) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 256;
  const g = c.getContext('2d');
  const img = g.createImageData(256, 256);
  const rand = rng(20261108);
  for (let i = 0; i < 256 * 256; i++) {
    const n = 188 + Math.floor(rand() * 28);
    img.data[i * 4] = n;
    img.data[i * 4 + 1] = n - 10;
    img.data[i * 4 + 2] = n - 24;
    img.data[i * 4 + 3] = 255;
  }
  g.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(40, 40);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function signTex(text, sub, fg, bg) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = sub ? 220 : 160;
  const g = c.getContext('2d');
  g.fillStyle = bg;
  g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = fg;
  g.lineWidth = 10;
  g.strokeRect(12, 12, c.width - 24, c.height - 24);
  g.fillStyle = fg;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.font = `800 ${sub ? 64 : 72}px Impact, "Arial Black", sans-serif`;
  g.fillText(text, c.width / 2, sub ? 78 : c.height / 2 + 4);
  if (sub) {
    g.font = '700 32px Trebuchet MS, Arial, sans-serif';
    g.fillText(sub, c.width / 2, 150);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function std(THREE, color, rough, metal, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal, ...extra });
}

export function buildWorld(THREE, scene) {
  const mats = {
    chrome: std(THREE, 0xe7eef4, 0.16, 0.94),
    chromeDark: std(THREE, 0x8ea0b0, 0.28, 0.82),
    stucco: std(THREE, 0xe4b888, 0.84, 0.05),
    coral: std(THREE, 0xff6840, 0.42, 0.18),
    teal: std(THREE, 0x14b8b0, 0.38, 0.22),
    cream: std(THREE, 0xfff6e8, 0.7, 0.05),
    ink: std(THREE, 0x241a22, 0.55, 0.2),
    gold: std(THREE, 0xf0d48a, 0.32, 0.72),
    brown: std(THREE, 0x6b4423, 0.72, 0.08),
    mesa: std(THREE, 0xd08958, 0.94, 0.05),
    mesaDark: std(THREE, 0xa8643e, 0.96, 0.04),
    glass: std(THREE, 0xc6ecff, 0.06, 0.15, { transparent: true, opacity: 0.38, depthWrite: false }),
    rubber: std(THREE, 0x2a2e32, 0.9, 0.05),
    pinkNeon: new THREE.MeshStandardMaterial({ color: 0x1a0410, emissive: 0xff3d92, emissiveIntensity: 2.6, roughness: 0.35 }),
    cyanNeon: new THREE.MeshStandardMaterial({ color: 0x021418, emissive: 0x49f3ff, emissiveIntensity: 2.4, roughness: 0.32 }),
    amberNeon: new THREE.MeshStandardMaterial({ color: 0x1a1004, emissive: 0xffb03a, emissiveIntensity: 2.1, roughness: 0.38 }),
    goldNeon: new THREE.MeshStandardMaterial({ color: 0x1a1408, emissive: 0xffe08a, emissiveIntensity: 1.8, roughness: 0.4 }),
  };
  const neons = [mats.pinkNeon, mats.cyanNeon, mats.amberNeon, mats.goldNeon];

  const wakeRoot = new THREE.Group();
  const dreamRoot = new THREE.Group();
  scene.add(wakeRoot, dreamRoot);

  const colliders = [];
  const circles = [];

  const noise = makeNoise(THREE);
  const terrain = buildTerrain(THREE, noise);
  terrain.receiveShadow = true;
  scene.add(terrain);

  const { mesh: sky, mat: skyMat } = buildSky(THREE);
  scene.add(sky);

  buildMesas(THREE, scene, mats, circles);
  buildPour(THREE, scene, mats, colliders, neons);
  buildDiner(THREE, scene, mats, colliders, neons, wakeRoot);
  buildDrifts(THREE, scene, mats, colliders, neons);
  buildSlides(THREE, scene, mats, colliders, neons);
  buildHouses(THREE, scene, mats, colliders);
  buildPad(THREE, scene, mats, neons);
  buildOasis(THREE, scene, mats);
  buildCanyonDressing(THREE, scene, mats);
  buildLamps(THREE, scene, mats);
  buildScatter(THREE, scene, mats);
  buildDreamSet(THREE, scene, dreamRoot, mats, neons);
  buildWakeSet(THREE, wakeRoot, mats);

  const water = buildWater(THREE);
  scene.add(water);

  const dust = buildDust(THREE);
  scene.add(dust.points);

  scene.fog = new THREE.FogExp2(0xe0a36a, 0.012);
  mergeByMaterial(scene);

  return {
    terrain, sky, skyMat, water, dust, mats, neons, colliders, circles, wakeRoot, dreamRoot, noise,
  };
}

function buildTerrain(THREE, noise) {
  const seg = 96;
  const size = 420;
  const geo = new THREE.PlaneGeometry(size, size, seg, seg);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const sand = new THREE.Color('#e4c291');
  const stone = new THREE.Color('#d9c7a6');
  const asphalt = new THREE.Color('#3e444c');
  const asphaltEdge = new THREE.Color('#6a624f');
  const rock = new THREE.Color('#b07a52');
  const deep = new THREE.Color('#6a4a3a');
  const wet = new THREE.Color('#9c7a52');
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    const y = heightAt(x, z);
    pos.setY(i, y);
    const rd = Math.min(roadDist(x, z), polyDist(x, z, TRAILS));
    const town = Math.hypot(x, z - 6);
    c.copy(sand);
    if (town < 18) c.lerp(stone, 0.65);
    else if (town < 26) c.lerp(stone, 1 - (town - 18) / 8);
    if (rd < 5.2) {
      const edge = smoothMix(rd, 3.4, 5.2);
      c.lerp(asphaltEdge, 1 - edge);
      c.lerp(asphalt, 1 - smoothMix(rd, 0, 3.2));
    }
    if (y < -1.5) c.lerp(rock, Math.min(1, (-1.5 - y) / 4));
    if (y < -6) c.lerp(deep, Math.min(1, (-6 - y) / 4));
    const od = Math.hypot(x - TOWN.oasis.x, z - TOWN.oasis.z);
    if (od < 12) c.lerp(wet, (1 - od / 12) * 0.7);
    colors[i * 3] = c.r;
    colors[i * 3 + 1] = c.g;
    colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mat = new THREE.MeshStandardMaterial({
    map: noise,
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.02,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  mesh.name = 'terrain';
  return mesh;
}

function smoothMix(x, a, b) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1)));
  return t * t * (3 - 2 * t);
}

function buildSky(THREE) {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      top: { value: new THREE.Color('#3c86d6') },
      horizon: { value: new THREE.Color('#f4b56a') },
      bottom: { value: new THREE.Color('#e09a55') },
      sun: { value: new THREE.Color('#fff4d4') },
      sunDir: { value: new THREE.Vector3(0.35, 0.55, 0.25).normalize() },
      dream: { value: 0 },
      time: { value: 0 },
    },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = position;
        gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 top, horizon, bottom, sun, sunDir;
      uniform float dream, time;
      void main() {
        vec3 d = normalize(vDir);
        vec3 col = mix(bottom, horizon, smoothstep(-0.2, 0.08, d.y));
        col = mix(col, top, smoothstep(0.0, 0.62, d.y));
        vec3 sd = normalize(sunDir);
        float sunDisc = pow(max(dot(d, sd), 0.0), mix(90.0, 280.0, dream));
        col += sun * sunDisc * (1.15 - dream * 0.4);
        float halo = pow(max(dot(d, sd), 0.0), 8.0);
        col += sun * halo * 0.18 * (1.0 - dream * 0.5);
        float cell = fract(sin(dot(floor(d * vec3(170.0, 130.0, 90.0)), vec3(12.9898, 78.233, 37.719))) * 43758.5453);
        float star = step(0.993, cell) * smoothstep(0.05, 0.45, d.y) * dream;
        col += vec3(0.85, 0.9, 1.0) * star;
        vec3 moonDir = normalize(vec3(-0.45, 0.52, -0.35));
        float moon = pow(max(dot(d, moonDir), 0.0), 520.0) * dream;
        col += vec3(0.9, 0.82, 1.0) * moon * 1.4;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(520, 32, 18), mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, mat };
}

function addBox(THREE, parent, w, h, d, x, y, z, material, opt = {}) {
  const m = new THREE.Mesh(boxGeo(THREE, w, h, d), material);
  m.position.set(x, y, z);
  if (opt.rot) m.rotation.set(opt.rot[0], opt.rot[1], opt.rot[2]);
  m.castShadow = !!opt.cast;
  m.receiveShadow = opt.receive !== false;
  parent.add(m);
  return m;
}

function collider(list, minX, maxX, minZ, maxZ, minY = 0, maxY = 16, layer = 'any') {
  list.push({ minX, maxX, minZ, maxZ, minY, maxY, layer });
}

function buildMesas(THREE, scene, mats, circles) {
  for (const mesa of MESAS) {
    const geo = new THREE.CylinderGeometry(mesa.r * 0.72, mesa.r, mesa.h, 10, 1);
    const mesh = new THREE.Mesh(geo, mats.mesa);
    const y = heightAt(mesa.x, mesa.z);
    mesh.position.set(mesa.x, y + mesa.h * 0.42, mesa.z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    scene.add(mesh);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(mesa.r * 0.7, mesa.r * 0.74, 0.5, 10), mats.mesaDark);
    cap.position.set(mesa.x, y + mesa.h * 0.42 + mesa.h * 0.5, mesa.z);
    cap.castShadow = true;
    scene.add(cap);
    circles.push({ x: mesa.x, z: mesa.z, r: mesa.r * 0.78 });
  }
}

function buildPour(THREE, scene, mats, colliders, neons) {
  const g = new THREE.Group();
  const y0 = heightAt(TOWN.pour.x, TOWN.pour.z);
  g.position.set(TOWN.pour.x, y0, TOWN.pour.z);
  const W = 16, D = 12, H = 5.2;
  addBox(THREE, g, W, 0.35, D, 0, 0.2, 0, mats.cream, { cast: true });
  addBox(THREE, g, 0.45, H, D, -W / 2 + 0.2, H / 2, 0, mats.stucco, { cast: true });
  addBox(THREE, g, 0.45, H, D, W / 2 - 0.2, H / 2, 0, mats.stucco, { cast: true });
  addBox(THREE, g, W, H, 0.4, 0, H / 2, -D / 2 + 0.2, mats.stucco, { cast: true });
  addBox(THREE, g, 4.2, H, 0.4, -5.6, H / 2, D / 2 - 0.2, mats.stucco, { cast: true });
  addBox(THREE, g, 4.2, H, 0.4, 5.6, H / 2, D / 2 - 0.2, mats.stucco, { cast: true });
  addBox(THREE, g, 6.4, 1.3, 0.4, 0, H - 0.7, D / 2 - 0.2, mats.stucco, { cast: true });
  addBox(THREE, g, 7.2, 1.05, 1.5, 0, 1.05, 1.2, mats.chromeDark, { cast: true });
  for (const x of [-3.2, 3.2]) {
    const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.12, 10), mats.coral);
    stool.position.set(x, 0.85, 3.4);
    stool.castShadow = true;
    g.add(stool);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.7, 6), mats.chrome);
    leg.position.set(x, 0.45, 3.4);
    g.add(leg);
  }
  addBox(THREE, g, 18, 0.28, 8, 0, 5.5, 1.5, mats.coral, { cast: true });
  const finL = addBox(THREE, g, 7, 0.22, 2.2, -5.5, 6.3, 2.2, mats.chrome, { cast: true, rot: [0, 0, 0.45] });
  const finR = addBox(THREE, g, 7, 0.22, 2.2, 5.5, 6.3, 2.2, mats.chrome, { cast: true, rot: [0, 0, -0.45] });
  finL.material = mats.chrome;
  finR.material = mats.chrome;
  for (const x of [-6.4, 6.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 5.2, 8), mats.chrome);
    post.position.set(x, 2.6, 5.4);
    post.castShadow = true;
    g.add(post);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(3.1, 0.09, 8, 20, Math.PI), mats.chrome);
  arch.position.set(0, 3.2, 5.5);
  arch.rotation.y = Math.PI;
  g.add(arch);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0x14040c,
    emissive: 0xff4f9a,
    emissiveMap: signTex('PIONEER POUR', 'CROSSROADS', '#ffd0e6', '#14040c'),
    emissiveIntensity: 1.7,
    roughness: 0.4,
  });
  neons.push(signMat);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.2, 2.4), signMat);
  sign.position.set(0, 6.6, 5.7);
  g.add(sign);
  const sideMat = new THREE.MeshStandardMaterial({
    color: 0x041418,
    emissive: 0x7ff6ff,
    emissiveMap: signTex('SARSAPARILLA', '', '#d8fbff', '#041418'),
    emissiveIntensity: 1.5,
    roughness: 0.4,
  });
  neons.push(sideMat);
  const side = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.3), sideMat);
  side.position.set(-8.05, 2.6, 0);
  side.rotation.y = -Math.PI / 2;
  g.add(side);
  for (let i = 0; i < 8; i++) {
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 8), mats.amberNeon);
    bulb.position.set(-5.2 + i * 1.5, 5.15, 5.2);
    g.add(bulb);
  }
  scene.add(g);
  collider(colliders, -8.1, 8.1, TOWN.pour.z - 6.1, TOWN.pour.z + 5.7);
}

function buildDiner(THREE, scene, mats, colliders, neons, wakeRoot) {
  const g = new THREE.Group();
  const p = TOWN.diner;
  g.position.set(p.x, heightAt(p.x, p.z), p.z);
  addBox(THREE, g, 11, 0.3, 7, 0, 0.2, 0, mats.cream, { cast: true });
  addBox(THREE, g, 10.2, 3.2, 6.2, 0, 1.9, 0, mats.glass, { cast: false });
  addBox(THREE, g, 10.6, 0.35, 6.6, 0, 3.6, 0, mats.coral, { cast: true });
  const star = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.8, 4), mats.chrome);
  star.position.set(-4.2, 1.6, 3.3);
  star.rotation.y = Math.PI / 4;
  star.castShadow = true;
  g.add(star);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0x1a0c04,
    emissive: 0xffb03a,
    emissiveMap: signTex('DAWN DINER', 'OPEN LATE', '#ffe2b0', '#1a0c04'),
    emissiveIntensity: 1.6,
    roughness: 0.35,
  });
  neons.push(signMat);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(5.5, 1.8), signMat);
  sign.position.set(0, 4.5, 3.2);
  g.add(sign);
  scene.add(g);
  collider(colliders, p.x - 5.2, p.x + 5.2, p.z - 3.2, p.z + 3.2);

  const posterMat = new THREE.MeshStandardMaterial({
    color: 0x100818,
    emissive: 0xd24bff,
    emissiveMap: signTex('ANDROMEDA', 'WALK AWAY', '#ffd6ff', '#100818'),
    emissiveIntensity: 1.15,
    roughness: 0.45,
  });
  const poster = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.4), posterMat);
  poster.position.set(p.x - 5.15, heightAt(p.x, p.z) + 2.1, p.z + 0.2);
  poster.rotation.y = -Math.PI / 2;
  wakeRoot.add(poster);
}

function buildDrifts(THREE, scene, mats, colliders, neons) {
  const g = new THREE.Group();
  const p = TOWN.drifts;
  g.position.set(p.x, heightAt(p.x, p.z), p.z);
  addBox(THREE, g, 12, 4.4, 8, 0, 2.3, 0, mats.ink, { cast: true });
  addBox(THREE, g, 13, 0.4, 9, 0, 4.6, 0, mats.coral, { cast: true });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(3.2, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mats.chrome);
  dome.position.set(0, 4.5, 0);
  dome.castShadow = true;
  g.add(dome);
  const signMat = new THREE.MeshStandardMaterial({
    color: 0x140010,
    emissive: 0xff3d92,
    emissiveMap: signTex("DRIFT'S", 'COMEDY TONIGHT', '#ffd0ea', '#140010'),
    emissiveIntensity: 1.8,
    roughness: 0.35,
  });
  neons.push(signMat);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.2, 2.2), signMat);
  sign.position.set(0, 5.6, 4.2);
  g.add(sign);
  const mic = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.06, 1.3, 6), mats.chrome);
  mic.position.set(0.4, 0.9, 3.5);
  g.add(mic);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 8), mats.pinkNeon);
  head.position.set(0.4, 1.6, 3.5);
  g.add(head);
  scene.add(g);
  collider(colliders, p.x - 6.2, p.x + 6.2, p.z - 4.2, p.z + 4.2);
}

function buildSlides(THREE, scene, mats, colliders, neons) {
  const g = new THREE.Group();
  const p = TOWN.slides;
  g.position.set(p.x, heightAt(p.x, p.z), p.z);
  addBox(THREE, g, 8, 3.4, 6, 0, 1.8, 0, mats.stucco, { cast: true });
  addBox(THREE, g, 9.2, 0.28, 7.2, 0, 3.6, 0.4, mats.teal, { cast: true });
  const signMat = new THREE.MeshStandardMaterial({
    color: 0x021418,
    emissive: 0x49f3ff,
    emissiveMap: signTex("SLIDE'S", 'BOARDS', '#d9fbff', '#021418'),
    emissiveIntensity: 1.7,
    roughness: 0.35,
  });
  neons.push(signMat);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 1.6), signMat);
  sign.position.set(0, 4.4, 3.1);
  g.add(sign);
  for (let i = 0; i < 3; i++) {
    const deck = new THREE.Mesh(boxGeo(THREE, 0.9, 0.06, 0.28), mats.chrome);
    deck.position.set(-2.2 + i * 0.7, 1.2 + i * 0.15, 3.15);
    deck.rotation.z = -0.4;
    g.add(deck);
    const glow = new THREE.Mesh(boxGeo(THREE, 0.92, 0.03, 0.3), mats.cyanNeon);
    glow.position.copy(deck.position);
    glow.position.y -= 0.05;
    glow.rotation.z = -0.4;
    g.add(glow);
  }
  scene.add(g);
  collider(colliders, p.x - 4.2, p.x + 4.2, p.z - 3.2, p.z + 3.2);
}

function buildHouses(THREE, scene, mats, colliders) {
  const spots = [
    { x: -16, z: 32, color: 0xf2d2b0, dome: 0x49d0c8 },
    { x: 14, z: 52, color: 0xf7e7c8, dome: 0xff7a59 },
    { x: 42, z: 24, color: 0xf0ddc4, dome: 0xffd56a },
    { x: -46, z: 40, color: 0xf6e2cf, dome: 0xd07cff },
  ];
  spots.forEach((s) => {
    const g = new THREE.Group();
    const y = heightAt(s.x, s.z);
    g.position.set(s.x, y, s.z);
    const wall = std(THREE, s.color, 0.8, 0.04);
    addBox(THREE, g, 6.2, 2.8, 5, 0, 1.5, 0, wall, { cast: true });
    const domeMat = std(THREE, s.dome, 0.35, 0.25);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.3, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), domeMat);
    dome.position.y = 2.85;
    dome.castShadow = true;
    g.add(dome);
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.42, 16), mats.cyanNeon);
    win.position.set(0, 1.7, 2.52);
    g.add(win);
    scene.add(g);
    collider(colliders, s.x - 3.2, s.x + 3.2, s.z - 2.6, s.z + 2.6, 0, 6);
  });
}

function buildPad(THREE, scene, mats, neons) {
  const p = TOWN.pad;
  const y = heightAt(p.x, p.z) + 0.05;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(11, 28), std(THREE, 0xc9c3b6, 0.72, 0.12));
  disc.rotation.x = -Math.PI / 2;
  disc.position.set(p.x, y, p.z);
  disc.receiveShadow = true;
  scene.add(disc);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(10.2, 0.12, 8, 32), mats.amberNeon);
  ring.rotation.x = Math.PI / 2;
  ring.position.set(p.x, y + 0.08, p.z);
  scene.add(ring);
  neons.push(mats.amberNeon);
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.18, 0.7), mats.amberNeon);
    lamp.position.set(p.x + Math.cos(a) * 10.2, y + 0.15, p.z + Math.sin(a) * 10.2);
    scene.add(lamp);
  }
  const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.18, 6, 8), mats.chrome);
  beacon.position.set(p.x + 13, y + 3, p.z + 6);
  beacon.castShadow = true;
  scene.add(beacon);
  const blink = new THREE.Mesh(new THREE.SphereGeometry(0.28, 10, 10), mats.amberNeon);
  blink.position.set(p.x + 13, y + 6.2, p.z + 6);
  blink.name = 'beacon';
  scene.add(blink);
}

function buildOasis(THREE, scene, mats) {
  const p = TOWN.oasis;
  const y = heightAt(p.x, p.z);
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.55 + (i % 3) * 0.2), mats.mesaDark);
    rock.position.set(p.x + Math.cos(a) * 8.5, y + 0.4, p.z + Math.sin(a) * 8.5);
    rock.castShadow = true;
    scene.add(rock);
  }
}

function buildWater(THREE) {
  const p = TOWN.oasis;
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      time: { value: 0 },
      dream: { value: 0 },
      colorA: { value: new THREE.Color('#1f7f96') },
      colorB: { value: new THREE.Color('#d7fff8') },
    },
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec2 vUv;
      uniform float time, dream;
      uniform vec3 colorA, colorB;
      void main() {
        vec2 uv = vUv - 0.5;
        float r = length(uv) * 2.0;
        float w = 0.5 + 0.5 * sin(vUv.x * 46.0 + time * 1.8) * 0.5 + 0.5 * sin(vUv.y * 34.0 - time * 1.4);
        vec3 col = mix(colorA, colorB, w * 0.55 + dream * 0.2);
        float alpha = smoothstep(1.0, 0.62, r) * 0.72;
        gl_FragColor = vec4(col, alpha);
      }
    `,
  });
  const mesh = new THREE.Mesh(new THREE.CircleGeometry(7.2, 28), mat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(p.x, heightAt(p.x, p.z) + 0.22, p.z);
  mesh.renderOrder = 2;
  return mesh;
}

function buildCanyonDressing(THREE, scene, mats) {
  const ribs = [
    [-18, -78], [10, -86], [-20, -108], [12, -120], [-16, -132],
  ];
  for (const [x, z] of ribs) {
    const h = 3 + Math.abs(x) * 0.05;
    const y = heightAt(x, z);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.8, h, 3.2), mats.mesa);
    fin.position.set(x, y + h / 2, z);
    fin.rotation.y = 0.4;
    fin.castShadow = true;
    scene.add(fin);
  }
}

function buildLamps(THREE, scene, mats) {
  const poles = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.07, 0.1, 3.6, 6), mats.chrome, LAMPS.length);
  const bulbs = new THREE.InstancedMesh(new THREE.SphereGeometry(0.2, 8, 8), mats.amberNeon, LAMPS.length);
  const dummy = new THREE.Object3D();
  LAMPS.forEach((p, i) => {
    const y = heightAt(p.x, p.z);
    dummy.position.set(p.x, y + 1.8, p.z);
    dummy.scale.set(1, 1, 1);
    dummy.rotation.set(0, 0, 0);
    dummy.updateMatrix();
    poles.setMatrixAt(i, dummy.matrix);
    dummy.position.set(p.x, y + 3.7, p.z);
    dummy.updateMatrix();
    bulbs.setMatrixAt(i, dummy.matrix);
  });
  poles.castShadow = true;
  scene.add(poles, bulbs);
}

function buildScatter(THREE, scene, mats) {
  const rand = rng(1497);
  const rockGeo = new THREE.DodecahedronGeometry(0.7);
  const rocks = new THREE.InstancedMesh(rockGeo, mats.mesaDark, 48);
  const bloomGeo = new THREE.ConeGeometry(0.28, 1.5, 5);
  const blooms = new THREE.InstancedMesh(bloomGeo, mats.chrome, 36);
  const dummy = new THREE.Object3D();
  let ri = 0;
  let bi = 0;
  let guard = 0;
  while ((ri < 48 || bi < 36) && guard < 800) {
    guard++;
    const x = (rand() * 2 - 1) * 180;
    const z = (rand() * 2 - 1) * 180;
    if (polyDist(x, z, ROADS.concat(TRAILS)) < 7) continue;
    if (Math.hypot(x, z - 6) < 24) continue;
    if (Math.hypot(x - TOWN.oasis.x, z - TOWN.oasis.z) < 12) continue;
    const y = heightAt(x, z);
    if (y < -2) continue;
    dummy.position.set(x, y + 0.3, z);
    dummy.rotation.set(rand(), rand(), 0);
    const s = 0.5 + rand() * 1.1;
    dummy.scale.set(s, s * (0.6 + rand()), s);
    dummy.updateMatrix();
    if (ri < 48 && rand() > 0.45) {
      rocks.setMatrixAt(ri++, dummy.matrix);
    } else if (bi < 36) {
      dummy.scale.set(1, 0.8 + rand(), 1);
      dummy.position.y = y + 0.7;
      dummy.updateMatrix();
      blooms.setMatrixAt(bi++, dummy.matrix);
    }
  }
  rocks.count = ri;
  blooms.count = bi;
  scene.add(rocks, blooms);
}

function buildDreamSet(THREE, scene, dreamRoot, mats, neons) {
  const s = surfaces();
  const bridgeMat = new THREE.MeshStandardMaterial({
    color: 0xc9b6ff,
    emissive: 0xb388ff,
    emissiveIntensity: 0.7,
    roughness: 0.25,
    metalness: 0.45,
    transparent: true,
    opacity: 0.9,
  });
  const b = s.bridge;
  const deck = new THREE.Mesh(new THREE.BoxGeometry(b.x1 - b.x0, 0.22, b.halfW * 2), bridgeMat);
  deck.position.set((b.x0 + b.x1) / 2, b.y, b.z);
  dreamRoot.add(deck);
  for (const p of s.steps.concat([s.bowl])) {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(p.r * 0.7, p.r, 0.28, 16), bridgeMat);
    disc.position.set(p.x, p.y, p.z);
    dreamRoot.add(disc);
  }
  const bowl = s.bowl;
  const rim = new THREE.Mesh(new THREE.TorusGeometry(bowl.r * 0.85, 0.16, 8, 24), mats.pinkNeon);
  rim.position.set(bowl.x, bowl.y + 0.4, bowl.z);
  rim.rotation.x = Math.PI / 2;
  dreamRoot.add(rim);
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.2 + i * 0.7, 0.05, 6, 24), i % 2 ? mats.cyanNeon : mats.goldNeon);
    ring.position.set(TOWN.pour.x + 2, 7 + i * 1.4, TOWN.pour.z - 2);
    ring.rotation.x = Math.PI / 2.4;
    ring.name = 'dreamRing';
    ring.userData.keep = true;
    dreamRoot.add(ring);
  }
  const arch = new THREE.Mesh(new THREE.TorusGeometry(1.8, 0.08, 8, 20, Math.PI), mats.pinkNeon);
  const hushY = heightAt(TOWN.hush.x, TOWN.hush.z);
  arch.position.set(TOWN.hush.x + 4, hushY + 1.8, TOWN.hush.z);
  dreamRoot.add(arch);
  neons.push(bridgeMat);

  const storm = new THREE.Mesh(
    new THREE.CylinderGeometry(22, 26, 16, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xe6c49a, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false })
  );
  storm.position.set(-100, 8, 8);
  dreamRoot.add(storm);
}

function buildWakeSet(THREE, wakeRoot, mats) {
  const storm = new THREE.Mesh(
    new THREE.CylinderGeometry(20, 24, 14, 14, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xd8b07a, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false })
  );
  storm.position.set(-100, heightAt(-100, 8) + 6, 8);
  wakeRoot.add(storm);
  const y = heightAt(TOWN.crack.x, TOWN.crack.z);
  const seam = new THREE.Mesh(
    new THREE.PlaneGeometry(0.4, 3.2),
    new THREE.MeshBasicMaterial({ color: 0xfff2c9, transparent: true, opacity: 0.35, side: THREE.DoubleSide })
  );
  seam.position.set(TOWN.crack.x, y + 1.7, TOWN.crack.z);
  wakeRoot.add(seam);
}

function buildDust(THREE) {
  const n = 520;
  const pos = new Float32Array(n * 3);
  const seed = new Float32Array(n);
  const rand = rng(77);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = (rand() * 2 - 1) * 190;
    pos[i * 3 + 1] = 0.4 + rand() * 6;
    pos[i * 3 + 2] = (rand() * 2 - 1) * 190;
    seed[i] = rand();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    uniforms: {
      uTime: { value: 0 },
      uColor: { value: new THREE.Color('#f0d2a4') },
      uSize: { value: 14 },
    },
    vertexShader: `
      uniform float uTime, uSize;
      attribute float aSeed;
      varying float vA;
      void main() {
        vec3 p = position;
        p.y += sin(uTime * 0.7 + aSeed * 6.28) * 0.45;
        p.x += sin(uTime * 0.25 + aSeed * 4.0) * 0.35;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = uSize * clamp(8.0 / -mv.z, 0.4, 3.5);
        vA = 0.25 + 0.22 * sin(uTime + aSeed * 9.0);
      }
    `,
    fragmentShader: `
      precision mediump float;
      varying float vA;
      uniform vec3 uColor;
      void main() {
        float r = length(gl_PointCoord - 0.5);
        if (r > 0.5) discard;
        float a = smoothstep(0.5, 0.05, r) * vA;
        gl_FragColor = vec4(uColor, a);
      }
    `,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  return { points, mat };
}

function mergeByMaterial(root) {
  root.updateMatrixWorld(true);
  const buckets = new Map();
  root.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.userData.keep) return;
    const m = o.material;
    if (!m || m.type !== 'MeshStandardMaterial' || m.map || m.transparent || m.emissiveMap) return;
    if (!buckets.has(m)) buckets.set(m, []);
    buckets.get(m).push(o);
  });
  for (const [material, meshes] of buckets) {
    if (meshes.length < 3) continue;
    const positions = [];
    const normals = [];
    for (const o of meshes) {
      const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
      src.applyMatrix4(o.matrixWorld);
      const pos = src.attributes.position;
      const nrm = src.attributes.normal;
      for (let i = 0; i < pos.count; i++) {
        positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
        normals.push(nrm ? nrm.getX(i) : 0, nrm ? nrm.getY(i) : 1, nrm ? nrm.getZ(i) : 0);
      }
      src.dispose();
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    const mesh = new THREE.Mesh(geo, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);
    for (const o of meshes) o.parent.remove(o);
  }
}

export function equirectEnv(THREE, top, mid, bot, glow) {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createLinearGradient(0, 0, 0, 64);
  grd.addColorStop(0, top);
  grd.addColorStop(0.45, mid);
  grd.addColorStop(1, bot);
  g.fillStyle = grd;
  g.fillRect(0, 0, 128, 64);
  g.fillStyle = glow;
  g.beginPath();
  g.arc(96, 18, 10, 0, Math.PI * 2);
  g.fill();
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
