import { test, expect } from '@playwright/test';
import fs from 'fs';
import {
  DRILL_ROOMS,
  drillReach,
  drillKeys,
  scanArea,
  scanLandings,
  doorwayCrowd,
} from './doors.js';

const ART = '/opt/cursor/artifacts/skippys-quest';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

const FULL = {
  ds_moon: true,
  ds_mars: true,
  ds_candy: true,
  ds_pluto: true,
  ds_ready: true,
  doors: true,
};

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => {
    window.__SQ_DEBUG = true;
  });
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ && window.__SQ.chart);
  await page.evaluate(() => {
    const S = __SQ;
    S.setManual(true);
    S.step(2);
    window.quiet = function () {
      for (let i = 0; i < 10 && (S.script || S.dlg); i++) {
        S.skipText();
        S.press('talk', true);
        S.step(1);
        S.press('talk', false);
        S.step(1);
      }
      S.G.paused = false;
      S.G.bannerT = 0;
      S.G.toastT = 0;
      S.G.saveT = 0;
      S.G.hailT = 0;
    };
  });
  await page.locator('#game').focus();
  return errors;
}

async function chartOf(page) {
  return page.evaluate(() => __SQ.chart());
}

test('build is b46 and drill rooms stay connected', async ({ page }) => {
  const errors = await boot(page);
  const cache = await page.evaluate(() => document.querySelector('script').textContent);
  expect(cache).toContain('window.__SQ_BUILD="b46"');
  expect(cache).toContain('v=b46');
  expect(await page.evaluate(() => __SQ.build())).toBe('b46');
  expect(await page.locator('meta[name="robots"]').count()).toBe(1);

  const chart = await chartOf(page);
  const drill = chart.filter((a) => String(a.id).startsWith('ds_'));
  expect(drill.map((a) => a.id).sort()).toEqual([...DRILL_ROOMS].sort());

  const early = drillReach(chart, { doors: false });
  expect(early.problems, JSON.stringify(early.problems)).toEqual([]);
  expect(early.rooms).toEqual(expect.arrayContaining(['ds_camp', 'ds_moon1', 'ds_moonkey', 'ds_moondoor']));
  expect(early.rooms).not.toContain('ds_moonboss');
  expect(early.rooms).not.toContain('ds_mars1');
  expect(early.rooms).not.toContain('ds_candy1');
  expect(early.rooms).not.toContain('ds_pluto1');
  expect(early.rooms).not.toContain('ds_elite');

  const moon = drillReach(chart, { ds_moon: true, doors: false });
  expect(moon.rooms).toEqual(expect.arrayContaining(['ds_mars1', 'ds_marskey', 'ds_marsdoor']));
  expect(moon.rooms).not.toContain('ds_marsboss');
  expect(moon.rooms).not.toContain('ds_candy1');

  const open = drillReach(chart, FULL);
  expect(open.problems, JSON.stringify(open.problems)).toEqual([]);
  expect(open.missing, JSON.stringify(open.missing)).toEqual([]);

  for (const area of drill) {
    for (const warp of area.warps) {
      if (warp.to === 'ds_home') continue;
      const back = (chart.find((a) => a.id === warp.to).warps || []).some((w) => w.to === area.id);
      const scripted = area.id === 'ds_breathe';
      if (!scripted) expect(back, `${area.id} -> ${warp.to} has no return`).toBe(true);
      const trip = open.used.some((u) => u.from === area.id && u.to === warp.to);
      expect(trip, `${area.id} -> ${warp.to} never trips`).toBe(true);
    }
  }
  expect(open.used.some((u) => u.from === 'ds_breathe' && u.to === 'ds_camp')).toBe(true);

  const keys = drillKeys(chart);
  expect(keys.issues, JSON.stringify(keys.issues)).toEqual([]);
  expect(keys.locks.map((l) => l.flag).sort()).toEqual(['door_dsa', 'door_dsc', 'door_dsm', 'door_dsp']);

  const crowd = drill.flatMap(doorwayCrowd);
  expect(crowd, JSON.stringify(crowd)).toEqual([]);

  const holes = drill.flatMap((a) => scanArea(a));
  expect(holes, JSON.stringify(holes)).toEqual([]);

  expect(errors, errors.join('\n')).toEqual([]);
});

test('keyboard and joystick clear every drill doorway', async ({ page }) => {
  const errors = await boot(page);
  const passes = [
    { name: 'camp-west-high', area: 'ds_camp', x: 30, y: 104, sx: -1, sy: -0.45, to: 'ds_moon1' },
    { name: 'camp-west-low', area: 'ds_camp', x: 30, y: 124, sx: -1, sy: 0.5, to: 'ds_moon1' },
    { name: 'camp-east-diagonal', area: 'ds_camp', x: 250, y: 106, sx: 1, sy: -0.4, to: 'ds_mars1' },
    { name: 'camp-north', area: 'ds_camp', x: 140, y: 40, sx: 0.35, sy: -1, to: 'ds_candy1' },
    { name: 'camp-south', area: 'ds_camp', x: 146, y: 156, sx: -0.3, sy: 1, to: 'ds_pluto1' },
    { name: 'camp-elite', area: 'ds_camp', x: 252, y: 32, sx: 0.15, sy: -1, to: 'ds_elite' },
    { name: 'moon-east-high', area: 'ds_moon1', x: 248, y: 103, sx: 1, sy: -0.55, to: 'ds_moondoor' },
    { name: 'moon-east-low', area: 'ds_moon1', x: 248, y: 124, sx: 1, sy: 0.55, to: 'ds_moondoor' },
    { name: 'moon-east-key', area: 'ds_moon1', x: 248, y: 112, key: 'right', to: 'ds_moondoor' },
    { name: 'moon-north-key', area: 'ds_moon1', x: 136, y: 36, key: 'up', to: 'ds_moonkey' },
    { name: 'moondoor-west', area: 'ds_moondoor', x: 36, y: 118, sx: -1, sy: 0.45, to: 'ds_moon1' },
    { name: 'moondoor-boss', area: 'ds_moondoor', x: 142, y: 36, sx: -0.2, sy: -1, to: 'ds_moonboss' },
    { name: 'mars-east', area: 'ds_mars1', x: 246, y: 108, sx: 1, sy: -0.35, to: 'ds_marsdoor' },
    { name: 'marsdoor-west', area: 'ds_marsdoor', x: 34, y: 122, key: 'left', to: 'ds_mars1' },
    { name: 'candy-east', area: 'ds_candy1', x: 246, y: 120, sx: 1, sy: 0.5, to: 'ds_candydoor' },
    { name: 'candydoor-west', area: 'ds_candydoor', x: 36, y: 104, sx: -1, sy: -0.4, to: 'ds_candy1' },
    { name: 'pluto-east', area: 'ds_pluto1', x: 246, y: 106, sx: 1, sy: -0.5, to: 'ds_plutodoor' },
    { name: 'plutodoor-west', area: 'ds_plutodoor', x: 34, y: 124, sx: -1, sy: 0.4, to: 'ds_pluto1' },
    { name: 'pluto-south-key', area: 'ds_pluto1', x: 140, y: 150, key: 'down', to: 'ds_plutokey' },
  ];
  const stuck = [];
  for (const spec of passes) {
    const arrived = await page.evaluate((spec) => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'drill';
      S.G.paused = false;
      S.G.choice = null;
      S.G.dsCalm = 99;
      for (const f of ['ds_moon', 'ds_mars', 'ds_candy', 'ds_pluto', 'ds_ready', 'door_dsm', 'door_dsa', 'door_dsc', 'door_dsp']) S.flag(f);
      S.flag('oe_' + spec.area);
      S.warp(spec.area, 8, 6, 0);
      quiet();
      S.G.dsCalm = 99;
      S.G.paused = false;
      S.ents.forEach((e) => {
        e.stun = 99;
        e.dead = true;
        e.x = 8;
        e.y = 8;
      });
      S.P.x = spec.x;
      S.P.y = spec.y;
      S.P.inv = 9;
      S.stick(0, 0);
      for (const k of ['left', 'right', 'up', 'down']) S.press(k, false);
      if (spec.key) S.press(spec.key, true);
      else S.stick(spec.sx, spec.sy);
      let id = S.A.id;
      let i = 0;
      for (; i < 240 && id !== spec.to; i++) {
        S.step(1);
        id = S.A.id;
      }
      if (spec.key) S.press(spec.key, false);
      S.stick(0, 0);
      return { id, x: Math.round(S.P.x), y: Math.round(S.P.y), frames: i };
    }, spec);
    if (arrived.id !== spec.to) stuck.push({ ...spec, arrived });
  }
  expect(stuck, JSON.stringify(stuck)).toEqual([]);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('previously blocked drill doorways are walkable on desktop and phone', async ({ page }) => {
  const errors = await boot(page);
  async function place(area, x, y, dir) {
    await page.evaluate(
      ({ area, x, y, dir }) => {
        const S = __SQ;
        S.G.state = 'play';
        S.G.story = 'drill';
        S.G.paused = false;
        S.G.dsCalm = 99;
        S.flag('oe_' + area);
        S.warp(area, 8, 6, dir);
        quiet();
        const saved = S.A.warps.slice();
        S.A.warps = [];
        S.G.dsCalm = 99;
        S.G.bannerT = 0;
        S.G.toastT = 0;
        S.G.paused = false;
        S.ents.forEach((e) => {
          e.dead = true;
          e.x = 8;
          e.y = 8;
        });
        S.P.x = x;
        S.P.y = y;
        S.P.dir = dir;
        S.stick(0, 0);
        S.step(2);
        S.A.warps = saved;
        S.G.dsCalm = 99;
        S.G.bannerT = 0;
      },
      { area, x, y, dir },
    );
  }
  await page.setViewportSize({ width: 1280, height: 800 });
  await place('ds_moon1', 278, 112, 3);
  await page.screenshot({ path: `${ART}/b46-moon-door-desktop.png` });
  await place('ds_moondoor', 28, 112, 2);
  await page.screenshot({ path: `${ART}/b46-moon-gate-desktop.png` });

  await page.setViewportSize({ width: 844, height: 390 });
  await place('ds_mars1', 278, 120, 3);
  await page.screenshot({ path: `${ART}/b46-mars-door-phone.png` });

  await page.setViewportSize({ width: 390, height: 844 });
  await place('ds_pluto1', 278, 108, 3);
  await page.screenshot({ path: `${ART}/b46-pluto-door-portrait.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('other tales have no solid warps or walled landings', async ({ page }) => {
  const errors = await boot(page);
  const chart = await chartOf(page);
  const groups = {
    ros: (a) => a.realm === 'outlaw' || /^(ros_|rs|rc|rb|cv)/.test(a.id),
    ram: (a) => a.realm === 'ram' || a.id.startsWith('ram_'),
    skippy: (a) => a.realm !== 'drill' && a.realm !== 'ram' && a.realm !== 'outlaw' && !a.id.startsWith('ds_') && !a.id.startsWith('ram_') && !/^(ros_|rs|rc|rb|cv)/.test(a.id),
  };
  const report = {};
  for (const [name, pred] of Object.entries(groups)) {
    const areas = chart.filter(pred);
    const solid = [];
    const crowd = [];
    for (const area of areas) {
      for (const issue of scanArea(area)) {
        if (issue.kind === 'warp-solid' || issue.kind === 'warp-blocked' || issue.kind === 'open-but-solid') solid.push(issue);
      }
      crowd.push(...doorwayCrowd(area));
    }
    const lands = scanLandings(areas);
    report[name] = {
      rooms: areas.length,
      solid,
      landings: lands.filter((i) => i.kind === 'landing-wall' || i.kind === 'missing-map'),
      retrigger: lands.filter((i) => i.kind === 'retrigger'),
      crowd,
    };
  }
  fs.writeFileSync('/tmp/door-audit.json', JSON.stringify(report, null, 2));
  const hard = [];
  for (const [name, row] of Object.entries(report)) {
    for (const issue of row.solid) hard.push({ tale: name, ...issue });
    for (const issue of row.landings) hard.push({ tale: name, ...issue });
  }
  expect(hard, JSON.stringify(hard, null, 2)).toEqual([]);
  expect(errors, errors.join('\n')).toEqual([]);
});
