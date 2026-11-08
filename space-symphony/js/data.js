/** Layout, terrain, and lines for the Pioneer Pour slice. Original couplets; canon lines are quoted as written. */
export const SAVE_KEY = 'space-symphony.v1';

export const TOWN = {
  player: { x: 0, z: 98, yaw: 0 },
  pour: { x: 0, z: -13 },
  ls: { x: -2.5, z: -4.3 },
  ros: { x: 2.7, z: -4.1 },
  nuke: { x: -4.8, z: -2.4 },
  crack: { x: 0.2, z: -24.2 },
  diner: { x: 28, z: 9 },
  tired: { x: 20.2, z: 9.2 },
  kid: { x: 28, z: 16.2 },
  rusty: { x: 11, z: 78 },
  hauler: { x: -14, z: 80 },
  drifts: { x: -28, z: 11 },
  ds: { x: -19.6, z: 11 },
  hush: { x: -40, z: 11 },
  slides: { x: 24, z: 38 },
  slide: { x: 24, z: 30.5 },
  pad: { x: 0, z: 84 },
  board: { x: 6.2, z: 90 },
  bike: { x: -6.4, z: 88 },
  sentinel: { x: -4, z: -114 },
  oasis: { x: 50, z: -10 },
  patron: { x: 5.2, z: -4.6 },
};

export const DRONE_SPOTS = [
  { id: 'd0', x: -15.5, z: -30 },
  { id: 'd1', x: -9, z: -52 },
  { id: 'd2', x: -4, z: -74 },
];

export const CROSS_SPOTS = [
  { id: 'c0', x: 50, z: -2 },
  { id: 'c1', x: -52, z: 20 },
  { id: 'c2', x: -4, z: -62 },
  { id: 'c3', x: 16, z: 68 },
];

export const MIRAGES = [
  { x: -72, z: 24 },
  { x: -118, z: 16 },
  { x: -86, z: -18 },
];

export const MESAS = [
  { x: -100, z: 8, r: 14, h: 11 },
  { x: 90, z: -38, r: 15, h: 13 },
  { x: -52, z: 86, r: 9, h: 7 },
  { x: 46, z: -138, r: 12, h: 10 },
  { x: 78, z: 70, r: 8, h: 6 },
];

/** Roads that flatten the desert so town and the landing road stay walkable. */
export const ROADS = [
  [[0, 110], [0, 20], [0, -2]],
  [[0, 18], [20, 10], [22, 9]],
  [[0, 16], [-18, 12], [-22, 11]],
  [[6, 22], [24, 30]],
  [[-8, 4], [-16, -6]],
];

/** Canyon trail is painted on the slope. It is not flattened. */
export const TRAILS = [
  [[-16, -6], [-16, -38], [-6, -52], [-4, -108]],
  [[-10, 6], [-40, 16], [-70, 12], [-86, -8]],
];

export const LAMPS = [];
for (let z = 70; z >= 8; z -= 14) LAMPS.push({ x: 4.2, z });
for (let z = 70; z >= 22; z -= 16) LAMPS.push({ x: -4.2, z });

export function smoothstep(a, b, x) {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a || 1)));
  return t * t * (3 - 2 * t);
}

export function distToSeg(px, pz, ax, az, bx, bz) {
  const abx = bx - ax;
  const abz = bz - az;
  const ab2 = abx * abx + abz * abz || 1;
  let t = ((px - ax) * abx + (pz - az) * abz) / ab2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (ax + abx * t), pz - (az + abz * t));
}

export function polyDist(px, pz, lines) {
  let best = 1e9;
  for (const line of lines) {
    for (let i = 0; i < line.length - 1; i++) {
      best = Math.min(best, distToSeg(px, pz, line[i][0], line[i][1], line[i + 1][0], line[i + 1][1]));
    }
  }
  return best;
}

export function roadDist(x, z) {
  return polyDist(x, z, ROADS);
}

export function heightAt(x, z) {
  let n = Math.sin(x * 0.048) * 0.62 + Math.cos(z * 0.041) * 0.42 + Math.sin((x + z) * 0.086) * 0.24;
  const town = Math.hypot(x * 0.85, z - 6);
  const townK = 1 - smoothstep(16, 48, town);
  const rd = roadDist(x, z);
  const flat = Math.max(1 - smoothstep(1.5, 8, rd), townK);
  n *= 1 - flat;

  const od = Math.hypot(x - TOWN.oasis.x, z - TOWN.oasis.z);
  if (od < 15) n -= (1 - od / 15) ** 2 * 1.85;

  const depth = smoothstep(40, 82, -z);
  const u = (x + 4) / 6.2;
  const across = Math.exp(-u * u);
  const carve = depth * across * 10.5;
  n = n * (1 - depth * across * 0.9) - carve;
  return n;
}

let _surfaces;
export function surfaces() {
  if (_surfaces) return _surfaces;
  const rimW = heightAt(-24, -102);
  const rimE = heightAt(18, -102);
  const deck = Math.max(rimW, rimE, 0.35);
  const bridge = { x0: -24, x1: 18, z: -102, halfW: 2.7, y: deck + 0.15 };
  const bowl = { x: -42, z: 40, r: 5.6, y: heightAt(-42, 40) + 2.8 };
  const steps = [];
  for (let i = 0; i < 6; i++) {
    const x = -18 - i * 4;
    const z = 24 + i * 2.6;
    steps.push({ x, z, r: 2.15, y: heightAt(x, z) + 0.45 * (i + 1) });
  }
  steps.push({ x: bowl.x + 6.2, z: bowl.z + 1.5, r: 2.5, y: bowl.y });
  _surfaces = { bridge, bowl, steps };
  return _surfaces;
}

function rampPad(x, z, p) {
  const d = Math.hypot(x - p.x, z - p.z);
  if (d > p.r) return -999;
  const g = heightAt(x, z);
  const inner = p.r * 0.62;
  if (d <= inner) return p.y;
  const t = (d - inner) / (p.r - inner);
  return p.y * (1 - t) + g * t;
}

/** Lucidity bridge across the canyon. -999 when off the span. */
export function bridgeDeck(x, z) {
  const b = surfaces().bridge;
  if (x < b.x0 || x > b.x1 || Math.abs(z - b.z) > b.halfW) return -999;
  const end = Math.min(smoothstep(b.x0, b.x0 + 5, x), smoothstep(b.x1, b.x1 - 5, x));
  const g = heightAt(x, z);
  return g * (1 - end) + b.y * end;
}

/** Dream bowls and stepping discs west of the diner. */
export function padDeck(x, z) {
  const s = surfaces();
  let y = -999;
  for (const p of s.steps.concat([s.bowl])) y = Math.max(y, rampPad(x, z, p));
  return y;
}

export const NEWS = [
  'DREAMS & HOPE DISAPPEAR INTO THE TIME WARP',
  'PIONEER POUR — DESERT FRONTIER',
  'WE CARRY MORE THAN CARGO. WE CARRY HOPE.',
  'A CRACK IN THE AIR BEHIND THE CROSSROADS',
  'SR NEWS: THE FRONTIER IS STILL RIDING',
];

export function card(id, name, title, couplet, body) {
  return { id, name, title, couplet, body };
}

export const LINES = {
  intro: card(
    'skippy',
    'Skippy',
    'Wake Call',
    'Close your eyes and the red eye looks back, but light finds the sleeper and the dawn finds the track',
    'You wake with the dream still in your hands. The atomic desert is bright, the landing lights are on, and the Pioneer Pour is the crossroads ahead. Let\'s Ride!'
  ),
  ls: card(
    'ls',
    'Liberty Slugger',
    'Rider of the People',
    'The deed is held and the porch light is kind; a shadowed sheriff won\'t say what\'s on his mind',
    'He bought the Pioneer Pour deed and he is keeping the door open. ROS is under the awning, hat low. He does not do warm reunions. Nuke is already pacing.'
  ),
  ros: card(
    'ros',
    'ROS',
    'On the Run',
    'Dust on my hat and a bounty on my name; I don\'t do reunions, but the dog found a flame',
    'There is a bounty on his name. He will not sell the story, and he will not shake hands. Nuke found a crack in the air behind the Pour. Go and see it. If the seam looks too thin, SHIFT.'
  ),
  crack: card(
    'nuke',
    'Nuke',
    'Secret of the Pour',
    'Pull up a stool where the desert winds pour; every world in the cosmos walks through this door',
    'Nuke\'s nose is chrome and his heart is a wire. The crack is the Pour itself: one saloon, every world, every galaxy, every realm. Awake, it is only a seam. In the dream, it is a door.'
  ),
  dronesDone: card(
    'skippy',
    'Skippy',
    'Lucid Ride',
    'A nightmare is loud but its shape is small; name what it is and it can\'t stand tall',
    'Those were hunter-eyes, wires on the wind, not riders. You named them and they came apart as dream fluff and light. North, in the canyon, a giant is dreaming someone else\'s dream.'
  ),
  sentinelIntro: card(
    'skippy',
    'Skippy',
    'Dark Secret',
    'The giant was set here to watch the frontier; something else is dreaming in its ear',
    'The Giant Sentinel is a sleeping guardian. Free the dark crystals on the waking side. Don\'t break the giant. When the crystals are light, SHIFT, and finish the work inside its dream.'
  ),
  anchorsDone: card(
    'skippy',
    'Skippy',
    'SHIFT',
    'Awake, the guardian staggered and stayed; the dream is the room where the hijack was made',
    'The waking fight is a hold, not a breaking. Press Q, or SHIFT, and enter the Sentinel\'s dream. Free the cores. The red eye is a wire. Pull it loose and let the guardian wake.'
  ),
  finale: card(
    'skippy',
    'Skippy',
    'Guardian Freed',
    'The giant was sleeping, its dream pulled off course; we rode through the nightmare and gave it back force',
    'The red eye lets go. The Sentinel kneels, a guardian of the frontier again, and a quiet line of light runs home to the Pioneer Pour.'
  ),
  canonEnd: card(
    'skippy',
    'Skippy',
    'Let\'s Ride',
    'Time is an echo of infinite thoughts. Go forth, Rider. The future, the past, and present await. Let\'s ride.',
    'The Pour is still the crossroads. The desert is open. Side trails remain, and the road does too. Let\'s Ride!'
  ),
  still: card(
    'skippy',
    'Skippy',
    'Still Riding',
    'Light finds the sleeper and the dawn finds the track',
    'The desert brings you back to the porch. Green crosses refill. Nothing out here is trying to end you. Get up and ride.'
  ),
  dueStart: card(
    'rider',
    'Tired Rider',
    'Past Due',
    'The poster keeps shining a borrower\'s tune; he needs a haul and a morning, and soon',
    'The Andromeda ad wants him back under the lights. He doesn\'t need it. Walk with him to Rusty. Honest haul, honest morning.'
  ),
  dueEnd: card(
    'rusty',
    'Rusty',
    'Hauler',
    'We carry more than cargo. We carry hope.',
    'Rusty takes the rider on. The poster stays on the diner wall. The rider does not go back to it.'
  ),
  comicStart: card(
    'ds',
    'Drill Sergeant',
    'The Comedian',
    'Embrace the void, cadets, but the mic is the test; if the room goes quiet, don\'t call it rest',
    'Push forward. Land the set: press USE when the sign says NOW. Three times. The fear he won\'t name is a room that forgets how to laugh.'
  ),
  comicSet: card(
    'ds',
    'Drill Sergeant',
    'Drift\'s',
    'He lands the joke and the neon agrees; one fear is left where the quiet room breathes',
    'The set lands. The rest of it is in the dream, west of Drift\'s, a hush with three little eyes. SHIFT, step in, and free it. Unbreakable means you can look at it.'
  ),
  comicEnd: card(
    'ds',
    'Drill Sergeant',
    'Push Forward',
    'Unbreakable, he said, and the nightmare agreed; a smile on the orange and the room is freed',
    'The silent room remembered it was a joke. The Drill Sergeant tips his hat, smile still the face, and the marquee stays lit.'
  ),
  stormStart: card(
    'ros',
    'ROS',
    'Nuke\'s Nose',
    'The mutt doesn\'t wander. The west mesa took the sound; follow the mirage where the sand turns around',
    'Nuke is in the sandstorm on the west mesa. Awake, it is only dust. SHIFT. A starlight mirage will point, and it will not stay to be held. Bring the dog home.'
  ),
  macho: card(
    'macho',
    'Macho',
    'Mirage',
    'A giant of starlight that will not stay to be held; he points through the storm and the dune is dispelled',
    'Macho is only a mirage. He does not stay, and he does not explain himself. Follow the next shimmer around the mesa.'
  ),
  stormEnd: card(
    'nuke',
    'Nuke',
    'Loyal Companion',
    'Chrome paws in the sand and a green little light; the sheriff\'s dog comes back through the night',
    'Nuke falls in at your heel. ROS does not make a speech about it. The green eye is enough.'
  ),
  crunchStart: card(
    'kid',
    'Young Rider',
    'Morning Light',
    'The crunchies were smiling when the dream went wrong; the mascot is scared and the bowl is too strong',
    'A young rider is stuck in a cereal nightmare. The scary mascot is a fear in a crown, not you. SHIFT, climb the dream bowls west of the diner, and stand inside the big one. Then free it. You have to be in the dream with them.'
  ),
  crunchEnd: card(
    'kid',
    'Young Rider',
    'Crunchies',
    'You stood in the bowl and the fright settled down; the morning came back and the kid kept the crown',
    'The nightmare crown came apart into fluff. The young rider sleeps facing the morning. Skippy was in it, and that was the missing piece.'
  ),
  patron: card(
    'patron',
    'Porch Regular',
    'Regular',
    'Every world in the cosmos walks through this door, and leaves with the dust it wore',
    'A regular of the Pioneer Pour. Sarsaparilla, shade, and no questions about other people\'s bounties.'
  ),
  slide: card(
    'slide',
    'Slide',
    'Let\'s Ride',
    'Boards for the sky and a bike if you\'re late; the canyon will open if you keep it straight',
    'Slide builds boards. The hover board and the rocket bike on the pad are fueled and free to ride. F mounts. F again steps off. No fare, no tab.'
  ),
  rosLate: card(
    'ros',
    'ROS',
    'Not for Sale',
    'I\'m not for sale.',
    'The bounty is still someone else\'s story. He rides with you anyway, a little off to the side, Nuke in the dust.'
  ),
  rosHint: card(
    'ros',
    'ROS',
    'Clear Eyes',
    'Don\'t break the eyes and don\'t brace for a war; name a bad dream and it won\'t be one anymore',
    'Free the corrupted drones on the north road. They are wires. USE sends a lucid pulse, a ring of light. Two pulses and they turn to fluff.'
  ),
  lsLate: card(
    'ls',
    'Liberty Slugger',
    'The Deed',
    'The porch stays open and the deed stays put; freedom is a door and a boot in the dust',
    'He plays it quiet. The Pour stays a crossroads, not a private vault. Join us to defend freedom, liberty and truth.'
  ),
};
