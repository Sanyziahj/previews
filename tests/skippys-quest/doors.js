// Connectivity audit for Skippy's Quest rooms.
// Player box matches ja(x, y, 5, 5, 2): 10px wide, 7px tall (5 up, 2 down).
// A warp trips when x is inside the rect and (y - 3) is inside it.

const SOLID = "#ToH=PvcbspXzLMQktnFmeOR";
const HOMES = new Set(["ros_home", "ram_home", "ds_home"]);

function chAt(rows, x, y) {
  if (!rows || y < 0 || x < 0 || y >= rows.length || x >= rows[0].length) return "#";
  return rows[y][x];
}

function blockedTile(area, x, y, open) {
  const ch = chAt(area.rows, x, y);
  if (ch === "#") return true;
  if (area.gates && area.gates[ch]) return !open;
  if (area.locks && area.locks[ch]) return !open;
  if (area.bridges && area.bridges[ch]) return false;
  if (ch === "Y" || ch === "u" || ch === "V") return !open;
  if (ch === "W" || ch === "q") return true;
  if (ch === "~") return false;
  if (ch === "<" || ch === ">" || ch === "^" || ch === "_") return false;
  return SOLID.indexOf(ch) >= 0;
}

function pitTile(area, x, y, open) {
  const ch = chAt(area.rows, x, y);
  if (ch === "~") return true;
  if (area.bridges && area.bridges[ch] && !open) return true;
  return false;
}

function poseBlocked(area, px, py, open, bodies) {
  const x0 = Math.floor((px - 5) / 16);
  const x1 = Math.floor((px + 5 - 0.01) / 16);
  const y0 = Math.floor((py - 5) / 16);
  const y1 = Math.floor((py + 2 - 0.01) / 16);
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (blockedTile(area, x, y, open)) return true;
    }
  }
  if (bodies) {
    for (const b of bodies) {
      if (px + 5 > b[0] && px - 5 < b[2] && py + 2 > b[1] && py - 5 < b[3]) return true;
    }
  }
  return false;
}

function feetPit(area, px, py, open) {
  return pitTile(area, Math.floor(px / 16), Math.floor((py - 1) / 16), open);
}

function inWarp(px, py, w) {
  return px > w.x * 16 && px < (w.x + w.w) * 16 && py - 3 > w.y * 16 && py - 3 < (w.y + w.h) * 16;
}

function bodiesOf(area) {
  const boxes = [];
  for (const n of area.npcs || []) {
    const x = (n.x + 0.5) * 16;
    const y = (n.y + 0.5) * 16;
    boxes.push([x - 6, y - 6, x + 6, y + 3, "npc", n.id, n.x, n.y]);
  }
  for (const c of area.chests || []) {
    const x = (c.x + 0.5) * 16;
    const y = (c.y + 0.5) * 16;
    const t = c.big ? 15 : 8;
    boxes.push([x - t, y - 6, x + t, y + 6, "chest", c.id, c.x, c.y]);
  }
  return boxes;
}

function byId(chart) {
  const map = new Map();
  for (const area of chart) map.set(area.id, area);
  return map;
}

function landing(warp) {
  return { x: (Number(warp.tx) + 0.5) * 16, y: (Number(warp.ty) + 0.5) * 16 };
}

// Every integer pose whose trigger point lies in the warp.
function warpPoses(area, warp, open, bodies) {
  const poses = [];
  const x0 = Math.floor(warp.x * 16) + 1;
  const x1 = Math.ceil((warp.x + warp.w) * 16) - 1;
  const y0 = Math.floor(warp.y * 16 + 3) + 1;
  const y1 = Math.ceil((warp.y + warp.h) * 16 + 3) - 1;
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (!inWarp(x, y, warp)) continue;
      if (poseBlocked(area, x, y, open, bodies)) continue;
      if (feetPit(area, x, y, open)) continue;
      poses.push([x, y]);
    }
  }
  return poses;
}

function flood(area, seeds, open, bodies) {
  const rows = area.rows;
  const w = rows[0].length * 16;
  const h = rows.length * 16;
  const seen = new Uint8Array(w * h);
  const q = [];
  let qi = 0;
  const add = (x, y) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 5 || y < 5 || x >= w - 5 || y >= h - 2) return;
    const k = y * w + x;
    if (seen[k]) return;
    if (poseBlocked(area, x, y, open, bodies)) return;
    if (feetPit(area, x, y, open)) return;
    seen[k] = 1;
    q.push(x, y);
  };
  for (const s of seeds) add(s[0], s[1]);
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  while (qi < q.length) {
    const x = q[qi++];
    const y = q[qi++];
    for (const d of dirs) add(x + d[0], y + d[1]);
  }
  return { seen, w, h };
}

function reachedPose(flooded, x, y) {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= flooded.w || y >= flooded.h) return false;
  return flooded.seen[y * flooded.w + x] === 1;
}

function dsGate(id, flags) {
  if (id.indexOf("ds_mars") === 0 && !flags.ds_moon) return false;
  if (id.indexOf("ds_candy") === 0 && !flags.ds_mars) return false;
  if (id.indexOf("ds_pluto") === 0 && !flags.ds_candy) return false;
  if (id === "ds_elite" && !flags.ds_pluto) return false;
  return true;
}

const DRILL_ROOMS = [
  "ds_camp",
  "ds_elite",
  "ds_breathe",
  "ds_moon1",
  "ds_moonkey",
  "ds_moondoor",
  "ds_moonboss",
  "ds_mars1",
  "ds_marskey",
  "ds_marsdoor",
  "ds_marsboss",
  "ds_candy1",
  "ds_candykey",
  "ds_candydoor",
  "ds_candyboss",
  "ds_pluto1",
  "ds_plutokey",
  "ds_plutodoor",
  "ds_plutoboss",
];

const BOSS_ROOM = {
  ds_moonboss: "ds_breathe",
  ds_marsboss: "ds_breathe",
  ds_candyboss: "ds_breathe",
  ds_plutoboss: "ds_breathe",
};

function drillReach(chart, flags) {
  const areas = byId(chart);
  const openDoors = !!flags.doors;
  const reached = {};
  const used = [];
  const problems = [];
  const work = [["ds_camp", (8 + 0.5) * 16, (7 + 0.5) * 16]];
  let guard = 0;
  while (work.length && guard++ < 80) {
    const [id, sx, sy] = work.shift();
    const area = areas.get(id);
    if (!area) {
      problems.push({ kind: "missing-room", id });
      continue;
    }
    if (!reached[id]) reached[id] = flood(area, [[sx, sy]], openDoors, null);
    else if (!reachedPose(reached[id], sx, sy)) {
      const more = flood(area, [[sx, sy]], openDoors, null);
      for (let i = 0; i < more.seen.length; i++) if (more.seen[i]) reached[id].seen[i] = 1;
    } else continue;
    for (const warp of area.warps || []) {
      if (warp.need && !flags[warp.need]) continue;
      if (!dsGate(warp.to, flags)) continue;
      let hit = null;
      const poses = warpPoses(area, warp, openDoors, null);
      for (const p of poses) {
        if (reachedPose(reached[id], p[0], p[1])) {
          hit = p;
          break;
        }
      }
      if (!hit) continue;
      used.push({ from: id, to: warp.to, via: hit });
      if (HOMES.has(warp.to)) continue;
      const dest = areas.get(warp.to);
      if (!dest) {
        problems.push({ kind: "missing-map", from: id, to: warp.to });
        continue;
      }
      const land = landing(warp);
      if (poseBlocked(dest, land.x, land.y, openDoors, null) || feetPit(dest, land.x, land.y, openDoors)) {
        problems.push({ kind: "landing-wall", from: id, to: warp.to, tx: warp.tx, ty: warp.ty });
        continue;
      }
      const back = (dest.warps || []).find((w) => inWarp(land.x, land.y, w));
      if (back) problems.push({ kind: "retrigger", from: id, to: warp.to, tx: warp.tx, ty: warp.ty });
      if (!reached[dest.id] || !reachedPose(reached[dest.id], land.x, land.y)) work.push([dest.id, land.x, land.y]);
    }
    if (BOSS_ROOM[id] && reached[id]) {
      const breathe = areas.get("ds_breathe");
      const bx = (8 + 0.5) * 16;
      const by = (6 + 0.5) * 16;
      if (breathe && (!reached.ds_breathe || !reachedPose(reached.ds_breathe, bx, by))) work.push(["ds_breathe", bx, by]);
    }
  }
  return {
    rooms: Object.keys(reached).sort(),
    missing: DRILL_ROOMS.filter((id) => !reached[id]),
    used,
    problems,
  };
}

function tileDist(a, b) {
  return Math.max(Math.abs(a.x - b.x), Math.abs(a.y - b.y));
}

function drillKeys(chart) {
  const areas = byId(chart);
  const issues = [];
  const locks = [];
  for (const area of chart) {
    if (!area.dungeon || !area.locks) continue;
    if (!String(area.id).startsWith("ds_")) continue;
    for (const ch of Object.keys(area.locks)) {
      const tiles = [];
      area.rows.forEach((row, y) => {
        for (let x = 0; x < row.length; x++) if (row[x] === ch) tiles.push({ x, y });
      });
      locks.push({ area: area.id, dungeon: area.dungeon, flag: area.locks[ch].flag, tiles });
    }
  }
  for (const lock of locks) {
    const keys = [];
    for (const area of chart) {
      if (area.dungeon !== lock.dungeon) continue;
      for (const chest of area.chests || []) {
        if (chest.item !== "key") continue;
        keys.push({ area: area.id, x: chest.x, y: chest.y, id: chest.id });
        if (area.id === lock.area) {
          for (const tile of lock.tiles) {
            if (tileDist({ x: chest.x, y: chest.y }, tile) <= 3) {
              issues.push({ kind: "key-near-door", key: chest.id, door: lock.area, dist: tileDist(chest, tile) });
            }
          }
        }
      }
    }
    if (!keys.length) issues.push({ kind: "no-key", door: lock.area, flag: lock.flag, dungeon: lock.dungeon });
    const closed = drillReach(chart, { ds_moon: true, ds_mars: true, ds_candy: true, ds_pluto: true, doors: false });
    for (const key of keys) {
      if (!closed.rooms.includes(key.area)) issues.push({ kind: "key-unreachable", key: key.id, room: key.area });
    }
  }
  return { locks, issues };
}

function borderHoles(area, open) {
  const rows = area.rows;
  const h = rows.length;
  const w = rows[0].length;
  const holes = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (x !== 0 && y !== 0 && x !== w - 1 && y !== h - 1) continue;
      if (blockedTile(area, x, y, open)) continue;
      const poses = [];
      for (let py = y * 16 - 2; py <= (y + 1) * 16 + 5; py++) {
        for (let px = x * 16 - 4; px <= (x + 1) * 16 + 5; px++) {
          if (poseBlocked(area, px, py, open, null)) continue;
          if (feetPit(area, px, py, open)) continue;
          const boxL = px - 5;
          const boxR = px + 5;
          const boxT = py - 5;
          const boxB = py + 2;
          if (boxR <= x * 16 || boxL >= (x + 1) * 16 || boxB <= y * 16 || boxT >= (y + 1) * 16) continue;
          poses.push([px, py]);
        }
      }
      if (!poses.length) {
        holes.push({ kind: "open-but-solid", area: area.id, x, y, ch: rows[y][x] });
        continue;
      }
      const covered = poses.some(([px, py]) => (area.warps || []).some((warp) => inWarp(px, py, warp)));
      if (!covered) holes.push({ kind: "opening-no-warp", area: area.id, x, y, ch: rows[y][x] });
    }
  }
  return holes;
}

function scanArea(area) {
  const issues = [];
  for (const warp of area.warps || []) {
    if (HOMES.has(warp.to)) continue;
    const poses = warpPoses(area, warp, true, null);
    if (!poses.length) {
      issues.push({
        kind: "warp-solid",
        area: area.id,
        to: warp.to,
        x: warp.x,
        y: warp.y,
        w: warp.w,
        h: warp.h,
      });
    } else {
      const boxed = warpPoses(area, warp, true, bodiesOf(area));
      if (!boxed.length) {
        issues.push({ kind: "warp-blocked", area: area.id, to: warp.to, x: warp.x, y: warp.y });
      }
    }
  }
  issues.push(...borderHoles(area, true));
  return issues;
}

function scanLandings(chart) {
  const areas = byId(chart);
  const issues = [];
  for (const area of chart) {
    for (const warp of area.warps || []) {
      if (HOMES.has(warp.to)) continue;
      const dest = areas.get(warp.to);
      if (!dest) {
        issues.push({ kind: "missing-map", from: area.id, to: warp.to });
        continue;
      }
      const land = landing(warp);
      if (poseBlocked(dest, land.x, land.y, true, null) || feetPit(dest, land.x, land.y, true)) {
        issues.push({ kind: "landing-wall", from: area.id, to: warp.to, tx: warp.tx, ty: warp.ty });
      }
      if ((dest.warps || []).some((w) => inWarp(land.x, land.y, w))) {
        issues.push({ kind: "retrigger", from: area.id, to: warp.to, tx: warp.tx, ty: warp.ty });
      }
    }
  }
  return issues;
}

function doorwayCrowd(area) {
  const issues = [];
  const spots = [];
  for (const warp of area.warps || []) {
    for (let y = warp.y; y < warp.y + warp.h; y++) {
      for (let x = warp.x; x < warp.x + warp.w; x++) spots.push({ x, y, to: warp.to });
    }
  }
  const near = (x, y) => spots.find((s) => Math.max(Math.abs(s.x - x), Math.abs(s.y - y)) <= 0);
  for (const n of area.npcs || []) {
    const hit = near(n.x, n.y);
    if (hit) issues.push({ kind: "npc-in-door", area: area.id, id: n.id, x: n.x, y: n.y, to: hit.to });
  }
  for (const s of area.signs || []) {
    const hit = near(s.x, s.y);
    if (hit) issues.push({ kind: "sign-in-door", area: area.id, x: s.x, y: s.y, to: hit.to });
  }
  for (const p of area.props || []) {
    const hit = near(p.x, p.y);
    if (hit) issues.push({ kind: "prop-in-door", area: area.id, k: p.k, x: p.x, y: p.y, to: hit.to });
  }
  return issues;
}

export {
  DRILL_ROOMS,
  HOMES,
  drillReach,
  drillKeys,
  scanArea,
  scanLandings,
  doorwayCrowd,
  warpPoses,
  poseBlocked,
  inWarp,
  landing,
};
