import * as THREE from 'three';
import { TOWN, DRONE_SPOTS, CROSS_SPOTS, MIRAGES, heightAt } from './data.js';

const cache = new Map();
function geo(THREE, key, make) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key);
}

function mat(THREE, key, params) {
  if (!cache.has('m:' + key)) cache.set('m:' + key, new THREE.MeshStandardMaterial(params));
  return cache.get('m:' + key);
}

const CHEEK = { color: 0xff4f93, emissive: 0xff4f93, emissiveIntensity: 0.85, roughness: 0.35, metalness: 0.05 };
const BLACK = { color: 0x111111, roughness: 0.45, metalness: 0.1 };
const WHITE = { color: 0xf4f7fb, roughness: 0.4, metalness: 0.05 };

function makeLabel(THREE, text) {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 64;
  const g = c.getContext('2d');
  g.fillStyle = 'rgba(10, 8, 18, 0.62)';
  g.fillRect(8, 8, 240, 48);
  g.strokeStyle = '#ffe08a';
  g.lineWidth = 3;
  g.strokeRect(8, 8, 240, 48);
  g.fillStyle = '#ffe9b0';
  g.font = '700 28px Trebuchet MS, Arial, sans-serif';
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  g.fillText(text, 128, 34);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sprite.scale.set(1.8, 0.45, 1);
  sprite.position.y = 2.45;
  sprite.visible = false;
  return sprite;
}

function limb(THREE, parent, color, x, y, z, glove, boot) {
  const pivot = new THREE.Group();
  pivot.position.set(x, y, z);
  const mesh = new THREE.Mesh(geo(THREE, 'limb', () => new THREE.CapsuleGeometry(0.07, 0.36, 3, 6)), mat(THREE, 'suit:' + color, { color, roughness: 0.48, metalness: 0.18 }));
  mesh.position.y = -0.26;
  mesh.castShadow = true;
  pivot.add(mesh);
  if (glove) {
    const h = new THREE.Mesh(geo(THREE, 'hand', () => new THREE.SphereGeometry(0.08, 8, 8)), mat(THREE, 'glove:' + glove, { color: glove, roughness: 0.35, metalness: 0.45 }));
    h.position.y = -0.5;
    pivot.add(h);
  }
  if (boot) {
    const b = new THREE.Mesh(geo(THREE, 'boot', () => new THREE.BoxGeometry(0.16, 0.1, 0.28)), mat(THREE, 'boot:' + boot, { color: boot, roughness: 0.4, metalness: 0.35 }));
    b.position.set(0, -0.52, 0.04);
    pivot.add(b);
  }
  parent.add(pivot);
  return pivot;
}

/** Sphere-headed rider. Pink circles are cheeks, never eyes. No nose, no ears, no skin. */
export function makeRider(THREE, spec) {
  const g = new THREE.Group();
  g.scale.setScalar(spec.scale || 1);
  const suit = spec.suit;
  const suitMat = mat(THREE, 'body:' + suit + (spec.suitMap || ''), {
    color: suit,
    roughness: 0.45,
    metalness: 0.2,
    map: spec.suitMap || null,
  });
  const torso = new THREE.Mesh(geo(THREE, 'torso', () => new THREE.CapsuleGeometry(0.28, 0.42, 4, 8)), suitMat);
  torso.position.y = 1.05;
  torso.castShadow = true;
  g.add(torso);
  const plate = new THREE.Mesh(
    geo(THREE, 'plate', () => new THREE.BoxGeometry(0.36, 0.28, 0.08)),
    mat(THREE, 'plate:' + (spec.plate || 0x22262c), { color: spec.plate || 0x22262c, roughness: 0.35, metalness: 0.6, emissive: spec.plateGlow || 0x000000, emissiveIntensity: spec.plateGlow ? 0.6 : 0 })
  );
  plate.position.set(0, 1.12, 0.24);
  g.add(plate);

  const headMat = mat(THREE, 'head:' + spec.head, { color: spec.head, roughness: 0.22, metalness: 0.48 });
  const head = new THREE.Mesh(geo(THREE, 'head', () => new THREE.SphereGeometry(0.34, 24, 16)), headMat);
  head.position.y = 1.64;
  head.castShadow = true;
  g.add(head);

  const cheekMat = mat(THREE, 'cheek', CHEEK);
  for (const s of [-1, 1]) {
    const cheek = new THREE.Mesh(geo(THREE, 'cheek', () => new THREE.CircleGeometry(0.075, 14)), cheekMat);
    cheek.position.set(s * 0.15, 1.5, 0.31);
    g.add(cheek);
  }
  addEyes(THREE, g, spec.eyes || 'oval');
  addMouth(THREE, g, spec.mouth || 'line');
  if (spec.hat) addHat(THREE, g, spec);

  const armL = limb(THREE, g, suit, -0.36, 1.28, 0, spec.glove, null);
  const armR = limb(THREE, g, suit, 0.36, 1.28, 0, spec.glove, null);
  const legL = limb(THREE, g, suit, -0.12, 0.72, 0, null, spec.boot);
  const legR = limb(THREE, g, suit, 0.12, 0.72, 0, null, spec.boot);

  const jet = mat(THREE, 'jet', { color: 0x9aa7b4, roughness: 0.3, metalness: 0.7 });
  for (const s of [-1, 1]) {
    const pack = new THREE.Mesh(geo(THREE, 'jetcan', () => new THREE.CylinderGeometry(0.07, 0.08, 0.32, 8)), jet);
    pack.position.set(s * 0.12, 1.15, -0.28);
    g.add(pack);
  }
  if (spec.backpack) {
    const pack = new THREE.Mesh(geo(THREE, 'pack', () => new THREE.BoxGeometry(0.32, 0.36, 0.16)), mat(THREE, 'pack', { color: 0xf4f1ea, roughness: 0.55, metalness: 0.15 }));
    pack.position.set(0, 1.18, -0.38);
    g.add(pack);
  }
  if (spec.poncho) {
    const poncho = new THREE.Mesh(
      geo(THREE, 'poncho', () => new THREE.ConeGeometry(0.62, 0.7, 8, 1, true)),
      mat(THREE, 'poncho', { color: 0x8d2430, roughness: 0.72, metalness: 0.05, side: THREE.DoubleSide })
    );
    poncho.position.y = 1.15;
    g.add(poncho);
  }
  if (spec.belt) {
    const belt = new THREE.Mesh(geo(THREE, 'belt', () => new THREE.TorusGeometry(0.3, 0.035, 6, 12)), mat(THREE, 'beltmat', { color: 0x2c241c, roughness: 0.6, metalness: 0.3 }));
    belt.rotation.x = Math.PI / 2;
    belt.position.y = 0.86;
    g.add(belt);
  }
  if (spec.shades) {
    for (const s of [-1, 1]) {
      const shade = new THREE.Mesh(geo(THREE, 'shade', () => new THREE.BoxGeometry(0.16, 0.08, 0.04)), mat(THREE, 'shadeMat', { color: 0xff4fa8, roughness: 0.2, metalness: 0.4, emissive: 0xff4fa8, emissiveIntensity: 0.4 }));
      shade.position.set(s * 0.1, 1.66, 0.32);
      shade.rotation.z = s * -0.3;
      g.add(shade);
    }
  }
  const baked = bakeColored(THREE, g);
  const holder = new THREE.Group();
  holder.add(baked);
  const label = makeLabel(THREE, spec.label || spec.name || '');
  holder.add(label);
  return { group: holder, label, spec };
}

function bakeColored(THREE, root) {
  root.updateMatrixWorld(true);
  const positions = [];
  const normals = [];
  const colors = [];
  root.traverse((o) => {
    if (!o.isMesh || !o.geometry) return;
    const src = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    src.applyMatrix4(o.matrixWorld);
    const pos = src.attributes.position;
    const nrm = src.attributes.normal;
    const c = o.material?.color || new THREE.Color(1, 1, 1);
    for (let i = 0; i < pos.count; i++) {
      positions.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      normals.push(nrm ? nrm.getX(i) : 0, nrm ? nrm.getY(i) : 1, nrm ? nrm.getZ(i) : 0);
      colors.push(c.r, c.g, c.b);
    }
    src.dispose();
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.4, metalness: 0.38,
  }));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function addEyes(THREE, g, kind) {
  const black = mat(THREE, 'eyeBlack', BLACK);
  const white = mat(THREE, 'eyeWhite', WHITE);
  const green = mat(THREE, 'eyeGreen', { color: 0x39ff7a, emissive: 0x39ff7a, emissiveIntensity: 1.4, roughness: 0.3 });
  const place = (mesh, x, y, z, sx, sy, sz) => {
    mesh.position.set(x, y, z);
    mesh.scale.set(sx, sy, sz);
    g.add(mesh);
  };
  if (kind === 'green') {
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(geo(THREE, 'eyeS', () => new THREE.SphereGeometry(0.07, 10, 8)), green);
      place(e, s * 0.11, 1.68, 0.3, 1, 1, 0.85);
    }
    return;
  }
  if (kind === 'closed') {
    for (const s of [-1, 1]) {
      const e = new THREE.Mesh(geo(THREE, 'lid', () => new THREE.TorusGeometry(0.05, 0.012, 4, 8, Math.PI)), black);
      e.position.set(s * 0.11, 1.67, 0.3);
      e.rotation.z = Math.PI;
      g.add(e);
    }
    return;
  }
  const tall = kind === 'lidded' ? 0.45 : 0.72;
  for (const s of [-1, 1]) {
    const e = new THREE.Mesh(geo(THREE, 'eyeO', () => new THREE.SphereGeometry(0.085, 10, 8)), black);
    place(e, s * 0.1, 1.68, 0.3, 1.35, tall, 0.7);
    if (kind === 'slit') {
      const slit = new THREE.Mesh(geo(THREE, 'slit', () => new THREE.BoxGeometry(0.018, 0.07, 0.02)), white);
      slit.position.set(s * 0.1, 1.68, 0.32);
      g.add(slit);
    }
  }
}

function addMouth(THREE, g, kind) {
  const black = mat(THREE, 'mouth', BLACK);
  const white = mat(THREE, 'tooth', WHITE);
  if (kind === 'line') {
    const m = new THREE.Mesh(geo(THREE, 'mouthLine', () => new THREE.BoxGeometry(0.12, 0.02, 0.02)), black);
    m.position.set(0, 1.46, 0.31);
    g.add(m);
    return;
  }
  if (kind === 'grin' || kind === 'teeth' || kind === 'smile') {
    const m = new THREE.Mesh(geo(THREE, 'grin', () => new THREE.TorusGeometry(0.09, 0.02, 4, 8, Math.PI)), black);
    m.position.set(0, 1.46, 0.3);
    m.rotation.x = Math.PI;
    g.add(m);
  }
  if (kind === 'grin' || kind === 'teeth') {
    for (const s of [-1, 1]) {
      const t = new THREE.Mesh(geo(THREE, 'toothbar', () => new THREE.BoxGeometry(0.045, 0.035, 0.02)), white);
      t.position.set(s * 0.03, 1.45, 0.33);
      g.add(t);
    }
  }
}

function addHat(THREE, g, spec) {
  const brown = mat(THREE, 'hatBrown', { color: 0x6a4124, roughness: 0.75, metalness: 0.08 });
  const silver = mat(THREE, 'silver', { color: 0xd5dde6, roughness: 0.25, metalness: 0.85 });
  const mustard = mat(THREE, 'mustard', { color: 0xd7a441, roughness: 0.7, metalness: 0.05 });
  if (spec.hat === 'beanie' || spec.hat === 'beanieBig') {
    const scale = spec.hat === 'beanieBig' ? 1.18 : 1;
    const cap = new THREE.Mesh(geo(THREE, 'beanie', () => new THREE.SphereGeometry(0.3, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2)), mustard);
    cap.position.y = 1.86;
    cap.scale.setScalar(scale);
    g.add(cap);
    const cuff = new THREE.Mesh(geo(THREE, 'cuff', () => new THREE.TorusGeometry(0.3, 0.05, 6, 12)), mustard);
    cuff.position.y = 1.78;
    cuff.rotation.x = Math.PI / 2;
    cuff.scale.setScalar(scale);
    g.add(cuff);
    const plate = new THREE.Mesh(geo(THREE, 'sr', () => new THREE.BoxGeometry(0.12, 0.08, 0.02)), silver);
    plate.position.set(0, 1.78, 0.32 * scale);
    g.add(plate);
    return;
  }
  if (spec.hat === 'sheriff') {
    const brim = new THREE.Mesh(geo(THREE, 'brim', () => new THREE.CylinderGeometry(0.46, 0.46, 0.04, 16)), brown);
    brim.position.y = 1.9;
    g.add(brim);
    const crown = new THREE.Mesh(geo(THREE, 'crown', () => new THREE.CylinderGeometry(0.24, 0.26, 0.28, 12)), brown);
    crown.position.y = 2.05;
    g.add(crown);
    const plate = new THREE.Mesh(geo(THREE, 'srplate', () => new THREE.BoxGeometry(0.16, 0.1, 0.02)), silver);
    plate.position.set(0, 1.96, 0.25);
    g.add(plate);
    return;
  }
  if (spec.hat === 'tophat') {
    const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.05, 16), mat(THREE, 'flagBrim', { color: 0x163a86, roughness: 0.5, metalness: 0.2 }));
    brim.position.y = 1.92;
    g.add(brim);
    const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.55, 12), flagMat(THREE));
    crown.position.y = 2.2;
    g.add(crown);
    return;
  }
  if (spec.hat === 'trucker') {
    const crown = new THREE.Mesh(geo(THREE, 'truck', () => new THREE.BoxGeometry(0.46, 0.22, 0.42)), mat(THREE, 'cap', { color: 0xf2f4f6, roughness: 0.6, metalness: 0.1 }));
    crown.position.set(0, 1.92, 0.02);
    g.add(crown);
    const bill = new THREE.Mesh(geo(THREE, 'bill', () => new THREE.BoxGeometry(0.36, 0.04, 0.22)), mat(THREE, 'billc', { color: 0xc0392b, roughness: 0.5, metalness: 0.15 }));
    bill.position.set(0, 1.84, 0.28);
    g.add(bill);
    const diamond = new THREE.Mesh(geo(THREE, 'dia', () => new THREE.BoxGeometry(0.1, 0.1, 0.02)), mat(THREE, 'diaM', { color: 0x3d7dff, roughness: 0.3, metalness: 0.4 }));
    diamond.position.set(0, 1.94, 0.24);
    diamond.rotation.z = Math.PI / 4;
    g.add(diamond);
    return;
  }
  if (spec.hat === 'cap') {
    const crown = new THREE.Mesh(geo(THREE, 'softcap', () => new THREE.SphereGeometry(0.28, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat(THREE, 'softcapm', { color: 0x3d4a5c, roughness: 0.7, metalness: 0.1 }));
    crown.position.y = 1.86;
    g.add(crown);
  }
}

function flagMat(THREE) {
  const key = 'flagTex';
  if (!cache.has(key)) {
    const c = document.createElement('canvas');
    c.width = 64;
    c.height = 64;
    const g = c.getContext('2d');
    g.fillStyle = '#d7263d';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = '#f4f4f4';
    for (let i = 0; i < 7; i++) if (i % 2 === 0) g.fillRect(0, i * 9, 64, 9);
    g.fillStyle = '#1d4e89';
    g.fillRect(0, 0, 28, 36);
    g.fillStyle = '#fff';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 3; x++) {
      g.fillRect(4 + x * 8, 4 + y * 8, 3, 3);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    cache.set(key, tex);
  }
  return mat(THREE, 'flagMat', { map: cache.get(key), roughness: 0.55, metalness: 0.12 });
}

export function makeNuke(THREE) {
  const g = new THREE.Group();
  const chrome = mat(THREE, 'nukeChrome', { color: 0xd5dde4, roughness: 0.22, metalness: 0.86 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.4, 4, 8), chrome);
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.42;
  body.castShadow = true;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.22, 0.32), chrome);
  head.position.set(0.34, 0.5, 0);
  g.add(head);
  const eye = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.06, 0.04), mat(THREE, 'nukeEye', { color: 0x39ff7a, emissive: 0x39ff7a, emissiveIntensity: 1.6, roughness: 0.3 }));
  eye.position.set(0.48, 0.52, 0);
  g.add(eye);
  const legs = [];
  for (const [x, z] of [[-0.16, 0.12], [-0.16, -0.12], [0.16, 0.12], [0.16, -0.12]]) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0.32, z);
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.26, 0.08), chrome);
    leg.position.y = -0.12;
    pivot.add(leg);
    g.add(pivot);
    legs.push(pivot);
  }
  const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.28, 6), chrome);
  ant.position.set(-0.2, 0.7, 0);
  ant.rotation.z = 0.5;
  g.add(ant);
  const bob = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), mat(THREE, 'nukeBob', { color: 0xff4f93, emissive: 0xff4f93, emissiveIntensity: 0.8 }));
  bob.position.set(-0.32, 0.78, 0);
  g.add(bob);
  const baked = bakeColored(THREE, g);
  const holder = new THREE.Group();
  holder.add(baked);
  const label = makeLabel(THREE, 'NUKE');
  holder.add(label);
  return { group: holder, legs: [], label };
}

export function makeBoard(THREE) {
  const g = new THREE.Group();
  const deck = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.07, 1.15), mat(THREE, 'boardDeck', { color: 0xe9eef3, roughness: 0.18, metalness: 0.9 }));
  deck.castShadow = true;
  g.add(deck);
  const glow = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 1.2), mat(THREE, 'boardGlow', { color: 0x140818, emissive: 0xff3d92, emissiveIntensity: 2.2, roughness: 0.3 }));
  glow.position.y = -0.05;
  g.add(glow);
  for (const z of [-0.42, 0.42]) {
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.16), mat(THREE, 'thruster', { color: 0x22262c, emissive: 0x49f3ff, emissiveIntensity: 0.8, roughness: 0.4, metalness: 0.5 }));
    t.position.set(0, -0.02, z);
    g.add(t);
  }
  return g;
}

export function makeBike(THREE) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.35, 4, 8), mat(THREE, 'bikeBody', { color: 0xf2f5f8, roughness: 0.16, metalness: 0.92 }));
  body.rotation.z = Math.PI / 2;
  body.position.y = 0.55;
  body.castShadow = true;
  g.add(body);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.55, 0.7), mat(THREE, 'bikeFin', { color: 0xff6840, roughness: 0.4, metalness: 0.3 }));
  fin.position.set(0, 0.95, -0.7);
  g.add(fin);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.5, 10), mat(THREE, 'bikeNose', { color: 0xd7dee6, roughness: 0.2, metalness: 0.85 }));
  nose.rotation.x = -Math.PI / 2;
  nose.position.set(0, 0.55, 0.95);
  g.add(nose);
  for (const x of [-0.38, 0.38]) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.28, 0.04, 8, 16), mat(THREE, 'hover', { color: 0x042026, emissive: 0x49f3ff, emissiveIntensity: 2, roughness: 0.3 }));
    ring.position.set(x, 0.22, 0.15);
    g.add(ring);
  }
  const bar = new THREE.Mesh(new THREE.TorusGeometry(0.22, 0.03, 6, 10, Math.PI), mat(THREE, 'bars', { color: 0xc5ced6, roughness: 0.3, metalness: 0.7 }));
  bar.position.set(0, 0.85, 0.45);
  g.add(bar);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.08, 0.4), mat(THREE, 'seat', { color: 0x2a241c, roughness: 0.7, metalness: 0.1 }));
  seat.position.set(0, 0.86, -0.15);
  g.add(seat);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat(THREE, 'flame', { color: 0xffb03a, emissive: 0xff7a2a, emissiveIntensity: 1.8 }));
  flame.position.set(0, 0.55, -1.05);
  flame.name = 'flame';
  g.add(flame);
  return g;
}

export function makeHauler(THREE) {
  const g = new THREE.Group();
  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.5, 1.6), mat(THREE, 'haulCab', { color: 0xe07020, roughness: 0.45, metalness: 0.25 }));
  cab.position.set(0, 1.3, 1.5);
  cab.castShadow = true;
  g.add(cab);
  const box = new THREE.Mesh(new THREE.BoxGeometry(2.3, 1.8, 3.4), mat(THREE, 'haulBox', { color: 0xd4651c, roughness: 0.55, metalness: 0.2 }));
  box.position.set(0, 1.5, -1.1);
  box.castShadow = true;
  g.add(box);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(2, 0.6, 0.1), mat(THREE, 'haulGlass', { color: 0xbfe9ff, roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 }));
  glass.position.set(0, 1.55, 2.28);
  g.add(glass);
  for (const [x, z] of [[-0.8, 1.6], [0.8, 1.6], [-0.8, -1.8], [0.8, -1.8]]) {
    const pad = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.12, 8), mat(THREE, 'haulPad', { color: 0x22262c, emissive: 0x49f3ff, emissiveIntensity: 0.5, metalness: 0.6, roughness: 0.4 }));
    pad.position.set(x, 0.25, z);
    g.add(pad);
  }
  return g;
}

export function makeDrone(THREE) {
  const g = new THREE.Group();
  const saucer = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.85, 0.22, 12), mat(THREE, 'droneBody', { color: 0x2a2430, roughness: 0.4, metalness: 0.55 }));
  saucer.castShadow = true;
  g.add(saucer);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), mat(THREE, 'droneDome', { color: 0x111114, roughness: 0.25, metalness: 0.4 }));
  dome.position.y = 0.12;
  g.add(dome);
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 8), mat(THREE, 'droneEye', { color: 0xff4fa8, emissive: 0xff2f8a, emissiveIntensity: 1.8 }));
  eye.position.set(0, 0.18, 0.22);
  g.add(eye);
  return g;
}

export function makePuff(THREE) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.85, 1),
    mat(THREE, 'puff' + Math.random(), { color: 0x6a2a86, emissive: 0xc14bff, emissiveIntensity: 0.55, roughness: 0.35, metalness: 0.2 })
  );
  body.castShadow = true;
  g.add(body);
  const eyeMat = mat(THREE, 'puffEye', { color: 0xff4ad8, emissive: 0xff4ad8, emissiveIntensity: 1.3 });
  const eyes = [[0, 0.35, 0.7], [-0.28, 0.05, 0.72], [0.28, 0.05, 0.72]];
  for (const [x, y, z] of eyes) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 8), eyeMat);
    e.position.set(x, y, z);
    g.add(e);
  }
  return g;
}

export function makeSentinel(THREE) {
  const g = new THREE.Group();
  const stone = mat(THREE, 'sentStone', { color: 0xc98962, roughness: 0.82, metalness: 0.12 });
  const chrome = mat(THREE, 'sentChrome', { color: 0xd5dde6, roughness: 0.22, metalness: 0.8 });
  const legL = new THREE.Mesh(new THREE.BoxGeometry(0.8, 3.2, 0.8), stone);
  legL.position.set(-0.7, 1.6, 0);
  const legR = legL.clone();
  legR.position.x = 0.7;
  g.add(legL, legR);
  const torso = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.8, 1.4), stone);
  torso.position.y = 4.2;
  torso.castShadow = true;
  g.add(torso);
  const chest = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 0.2), chrome);
  chest.position.set(0, 4.3, 0.75);
  g.add(chest);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.95, 20, 14), stone);
  head.position.y = 6.3;
  head.castShadow = true;
  g.add(head);
  const slit = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.08), mat(THREE, 'sentSlit', { color: 0x39ffd2, emissive: 0x39ffd2, emissiveIntensity: 0.4 }));
  slit.position.set(0, 6.35, 0.9);
  slit.name = 'slit';
  g.add(slit);
  for (const x of [-1.7, 1.7]) {
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.55, 2.4, 0.55), stone);
    arm.position.set(x, 4.1, 0);
    arm.castShadow = true;
    g.add(arm);
  }
  const eye = new THREE.Mesh(new THREE.SphereGeometry(0.28, 12, 10), mat(THREE, 'redEye', { color: 0xff2244, emissive: 0xff1230, emissiveIntensity: 2.4 }));
  eye.position.set(0, 4.35, 0.95);
  eye.name = 'redEye';
  eye.visible = false;
  g.add(eye);
  const hood = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.06, 6, 12), mat(THREE, 'hood', { color: 0x3a0a12, roughness: 0.5, metalness: 0.3 }));
  hood.position.set(0, 4.35, 0.9);
  hood.name = 'hood';
  hood.visible = false;
  g.add(hood);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, stone, slit, eye, hood };
}

export function makeCrystal(THREE, bad) {
  const color = bad ? 0x7a1c6a : 0xffe08a;
  const m = new THREE.Mesh(
    new THREE.OctahedronGeometry(0.55),
    new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: bad ? 0.7 : 1.4, roughness: 0.25, metalness: 0.35 })
  );
  m.castShadow = true;
  return m;
}

export function makeCross(THREE) {
  const g = new THREE.Group();
  const matG = mat(THREE, 'crossMat', { color: 0x39ff8a, emissive: 0x39ff8a, emissiveIntensity: 1.5, roughness: 0.3 });
  const a = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.12), matG);
  const b = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.42, 0.12), matG);
  g.add(a, b);
  return g;
}

export function makeMacho(THREE) {
  const rider = makeRider(THREE, {
    name: 'Macho',
    label: 'MIRAGE',
    head: 0xf6e7b0,
    suit: 0xf0d48a,
    glove: 0xfff6d2,
    boot: 0xf0d48a,
    eyes: 'closed',
    mouth: 'smile',
    scale: 1.15,
  });
  rider.group.traverse((o) => {
    if (o.isMesh && o.material) {
      o.material = o.material.clone();
      o.material.transparent = true;
      o.material.opacity = 0.38;
      o.material.emissive = o.material.emissive || new THREE.Color(0xf0d48a);
      o.material.emissiveIntensity = Math.max(o.material.emissiveIntensity || 0, 0.35);
      o.material.depthWrite = false;
    }
  });
  const halo = new THREE.Mesh(new THREE.TorusGeometry(0.55, 0.03, 6, 20), mat(THREE, 'halo', { color: 0xfff6d0, emissive: 0xfff1b0, emissiveIntensity: 1.5, transparent: true, opacity: 0.7 }));
  halo.position.y = 2.35;
  halo.rotation.x = Math.PI / 2;
  rider.group.add(halo);
  return rider;
}

export function makeFluff(THREE, scene) {
  const n = 200;
  const pos = new Float32Array(n * 3);
  pos.fill(-999);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const matP = new THREE.PointsMaterial({
    color: 0xfff4cf,
    size: 0.38,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    sizeAttenuation: true,
  });
  const points = new THREE.Points(geo, matP);
  points.frustumCulled = false;
  scene.add(points);
  const bits = Array.from({ length: n }, (_, i) => ({ i, life: 0, vx: 0, vy: 0, vz: 0 }));
  return {
    points,
    burst(x, y, z, color) {
      if (color) matP.color.set(color);
      let spawned = 0;
      for (const b of bits) {
        if (b.life > 0) continue;
        b.life = 0.8 + Math.random() * 0.5;
        b.vx = (Math.random() - 0.5) * 2.4;
        b.vy = 1.2 + Math.random() * 2.2;
        b.vz = (Math.random() - 0.5) * 2.4;
        pos[b.i * 3] = x;
        pos[b.i * 3 + 1] = y;
        pos[b.i * 3 + 2] = z;
        spawned++;
        if (spawned > 28) break;
      }
      geo.attributes.position.needsUpdate = true;
    },
    tick(dt) {
      let alive = false;
      for (const b of bits) {
        if (b.life <= 0) continue;
        b.life -= dt;
        alive = true;
        pos[b.i * 3] += b.vx * dt;
        pos[b.i * 3 + 1] += b.vy * dt;
        pos[b.i * 3 + 2] += b.vz * dt;
        if (b.life <= 0) pos[b.i * 3 + 1] = -999;
      }
      if (alive) geo.attributes.position.needsUpdate = true;
    },
  };
}

export function makePulseRing(THREE) {
  const mesh = new THREE.Mesh(
    new THREE.TorusGeometry(1, 0.06, 6, 24),
    new THREE.MeshBasicMaterial({ color: 0xf3fbff, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  mesh.visible = false;
  mesh.rotation.x = Math.PI / 2;
  return mesh;
}

export function buildCast(THREE, scene) {
  const specs = {
    skippy: { name: 'Skippy', label: 'SKIPPY', head: 0xf7f7fb, suit: 0xf4f6f8, glove: 0xf7f7fb, boot: 0xe8e8ee, plate: 0x1c1e22, eyes: 'slit', mouth: 'grin', hat: 'beanie', backpack: true, scale: 0.9 },
    ros: { name: 'ROS', label: 'ROS', head: 0x7a4ea3, suit: 0xc4232a, glove: 0xe0b34e, boot: 0xe0b34e, plate: 0xf0d48a, eyes: 'green', mouth: 'line', hat: 'sheriff', poncho: true, scale: 1 },
    ls: { name: 'Liberty Slugger', label: 'SLUGGER', head: 0xf6f4ef, suit: 0xf4f4f4, glove: 0xf4f4f4, boot: 0x1d4e89, plate: 0xd7263d, eyes: 'oval', mouth: 'smile', hat: 'tophat', suitMap: null, scale: 1 },
    ds: { name: 'Drill Sergeant', label: 'SERGEANT', head: 0xf08a2a, suit: 0x1aa7a1, glove: 0x243038, boot: 0xc46a32, plate: 0xff4f93, plateGlow: 0xff4f93, eyes: 'oval', mouth: 'teeth', hat: 'sheriff', belt: true, scale: 1 },
    rusty: { name: 'Rusty', label: 'RUSTY', head: 0x1d3d8f, suit: 0xe07020, glove: 0xf0d0a0, boot: 0x6a4124, eyes: 'lidded', mouth: 'grin', hat: 'trucker', scale: 1 },
    slide: { name: 'Slide', label: 'SLIDE', head: 0x8a4fd0, suit: 0xf7f4fb, glove: 0xff4fa8, boot: 0x2a2438, eyes: 'lidded', mouth: 'smile', shades: true, scale: 1 },
    tired: { name: 'Tired Rider', label: 'RIDER', head: 0xc4a574, suit: 0x6a7c92, glove: 0xd8d2c8, boot: 0x4a4038, eyes: 'lidded', mouth: 'line', hat: 'cap', scale: 1 },
    kid: { name: 'Young Rider', label: 'RIDER', head: 0xf0c84a, suit: 0xfff3d4, glove: 0xfff6ea, boot: 0xe07020, plate: 0xff8a3d, eyes: 'slit', mouth: 'grin', hat: 'beanieBig', scale: 0.68 },
    patron: { name: 'Regular', label: 'REGULAR', head: 0x3faf6a, suit: 0xf2efe6, glove: 0xf2efe6, boot: 0x6a4124, eyes: 'oval', mouth: 'smile', hat: 'cap', scale: 1 },
  };
  // Liberty Slugger's suit uses the flag texture.
  specs.ls.suitMap = flagTexture(THREE);

  const cast = {};
  for (const [id, spec] of Object.entries(specs)) {
    cast[id] = makeRider(THREE, spec);
    scene.add(cast[id].group);
  }
  cast.macho = makeMacho(THREE);
  scene.add(cast.macho.group);

  cast.nuke = makeNuke(THREE);
  scene.add(cast.nuke.group);

  cast.board = makeBoard(THREE);
  cast.bike = makeBike(THREE);
  cast.hauler = makeHauler(THREE);
  scene.add(cast.board, cast.bike, cast.hauler);
  cast.hauler.position.set(TOWN.hauler.x, heightAt(TOWN.hauler.x, TOWN.hauler.z), TOWN.hauler.z);

  cast.drones = DRONE_SPOTS.map((s) => {
    const d = makeDrone(THREE);
    scene.add(d);
    return { mesh: d, ...s, hits: 0, freed: false, phase: Math.random() * 6 };
  });
  cast.puffs = {
    hush: spawnPuff(THREE, scene, TOWN.hush.x, TOWN.hush.z),
    crunch: spawnPuff(THREE, scene, -42, 40),
  };
  cast.sentinel = makeSentinel(THREE);
  cast.sentinel.group.position.set(TOWN.sentinel.x, heightAt(TOWN.sentinel.x, TOWN.sentinel.z), TOWN.sentinel.z);
  scene.add(cast.sentinel.group);
  const s = TOWN.sentinel;
  const anchorPos = [
    { x: s.x + 6.5, z: s.z + 3.5 },
    { x: s.x - 7, z: s.z + 1.5 },
    { x: s.x + 1.2, z: s.z - 7 },
  ];
  cast.anchors = anchorPos.map((p) => {
    const m = makeCrystal(THREE, true);
    m.position.set(p.x, heightAt(p.x, p.z) + 1.1, p.z);
    scene.add(m);
    return { mesh: m, ...p, hits: 0 };
  });
  cast.cores = [
    { x: s.x + 5, z: s.z - 2 },
    { x: s.x - 5.5, z: s.z - 1 },
    { x: s.x + 0.5, z: s.z + 6 },
  ].map((p) => {
    const m = makePuff(THREE);
    m.position.set(p.x, heightAt(p.x, p.z) + 2.2, p.z);
    m.visible = false;
    scene.add(m);
    return { mesh: m, ...p, hits: 0 };
  });
  cast.crosses = CROSS_SPOTS.map((p) => {
    const m = makeCross(THREE);
    m.position.set(p.x, heightAt(p.x, p.z) + 0.8, p.z);
    scene.add(m);
    return { mesh: m, ...p, taken: false };
  });
  cast.mirages = MIRAGES.map((p, i) => {
    const m = makeMacho(THREE);
    m.group.position.set(p.x, heightAt(p.x, p.z), p.z);
    m.group.visible = false;
    scene.add(m.group);
    return { actor: m, ...p, i };
  });
  const crack = new THREE.Mesh(
    new THREE.PlaneGeometry(1.6, 4.2),
    new THREE.MeshBasicMaterial({ color: 0xfff6d4, transparent: true, opacity: 0.85, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })
  );
  crack.position.set(TOWN.crack.x, heightAt(TOWN.crack.x, TOWN.crack.z) + 2.1, TOWN.crack.z);
  crack.visible = false;
  scene.add(crack);
  cast.crack = crack;

  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.96, 1.06, 40),
    new THREE.MeshBasicMaterial({ color: 0xffb03a, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false })
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.set(s.x, heightAt(s.x, s.z) + 0.2, s.z);
  scene.add(ring);
  cast.shock = ring;

  cast.pulse = makePulseRing(THREE);
  scene.add(cast.pulse);

  const beams = [];
  for (let i = 0; i < 6; i++) {
    const b = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.28, 28, 8, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffe08a, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending })
    );
    b.visible = false;
    scene.add(b);
    beams.push(b);
  }
  cast.beams = beams;
  return cast;
}

function flagTexture(THREE) {
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const g = c.getContext('2d');
  for (let i = 0; i < 8; i++) {
    g.fillStyle = i % 2 ? '#f4f4f4' : '#d7263d';
    g.fillRect(0, i * 8, 64, 8);
  }
  g.fillStyle = '#1d4e89';
  g.fillRect(0, 0, 28, 32);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function spawnPuff(THREE, scene, x, z) {
  const m = makePuff(THREE);
  m.position.set(x, heightAt(x, z) + 1.3, z);
  m.visible = false;
  scene.add(m);
  return { mesh: m, x, z, hits: 0, freed: false };
}

export function animateRider(actor, time, speed, mounted) {
  if (!actor || !actor.legL) return;
  const swing = mounted ? 0.15 : Math.sin(time * 8 + (actor.spec?.name?.length || 1)) * Math.min(0.7, speed * 0.09);
  actor.legL.rotation.x = swing;
  actor.legR.rotation.x = -swing;
  actor.armL.rotation.x = -swing * 0.7;
  actor.armR.rotation.x = swing * 0.7;
}

export function faceToward(group, yaw) {
  group.rotation.y = yaw;
}

export function place(actor, x, z, y) {
  actor.group.position.set(x, y, z);
}
