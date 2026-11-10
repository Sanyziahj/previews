import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

const MELEE = ['baton', 'sword', 'hatchet', 'axe', 'plasma'];

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.__SQ_DEBUG = true; });
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ && document.getElementById('sr-live'));
  return errors;
}

test.describe('world words and the attack split', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('no world words outside the nexus, and nexus labels stay put', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    const outside = await page.evaluate(() => {
      function quiet(S) {
        for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
      }
      const S = __SQ;
      const rooms = [
        ['skippy', 'home', 9, 8],
        ['skippy', 'desert', 12, 10],
        ['skippy', 'saloon', 9, 6],
        ['skippy', 'cosmos', 14, 8],
        ['skippy', 'seaport', 10, 10],
      ];
      const found = [];
      for (const [story, area, x, y] of rooms) {
        S.G.state = 'play';
        S.G.story = story;
        S.G.paused = false;
        S.flag('oe_' + area);
        S.warp(area, x, y, 1);
        quiet(S);
        S.step(2);
        const ink = S.worldInk();
        if (ink.length) found.push(area + ':' + ink.map((w) => w.t).join(','));
      }
      return found;
    });
    expect(outside, outside.join(' | ')).toEqual([]);

    await page.evaluate(() => {
      function quiet(S) {
        for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
      }
      const S = __SQ;
      S.G.story = 'skippy';
      S.G.paused = false;
      S.setManual(true);
      S.flag('oe_home');
      S.flag('woke');
      S.warp('home', 9, 7, 1);
      quiet(S);
      S.step(2);
    });
    await page.screenshot({ path: `${ART}/b33-room.png` });

    await page.evaluate(() => {
      function quiet(S) {
        for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
      }
      const S = __SQ;
      S.G.story = 'skippy';
      S.G.paused = false;
      S.setManual(true);
      S.flag('oe_cosmos');
      S.G.trans = null;
      S.warp('cosmos', 4, 5, 2);
      quiet(S);
      S.step(2);
    });
    await page.screenshot({ path: `${ART}/b33-holo.png` });

    const walk = await page.evaluate(() => {
      function quiet(S) {
        for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
      }
      const S = __SQ;
      S.setManual(false);
      S.G.story = 'skippy';
      S.G.paused = false;
      S.G.trans = null;
      S.flag('oe_nexus');
      S.warp('nexus', 9, 6, 3);
      quiet(S);
      S.step(2);
      const sig = (ink) => ink.slice().sort((a, b) => a.x - b.x || a.y - b.y || (a.t < b.t ? -1 : 1));
      const frames = [];
      let prev = null;
      const jumps = [];
      for (let i = 0; i < 30; i++) {
        S.press('right', true);
        S.step(1);
        const ink = sig(S.worldInk());
        const keys = ink.map((w) => w.t + '@' + w.x + ',' + w.y);
        frames.push({
          n: ink.length,
          dupes: keys.filter((k, idx) => keys.indexOf(k) !== idx),
          whole: ink.every((w) => w.x === Math.round(w.x) && w.y === Math.round(w.y)),
          desert: ink.filter((w) => w.t === 'DESERT').length,
          cosmos: ink.filter((w) => w.t === 'COSMOS').length,
        });
        if (prev && prev.length === ink.length) {
          const dx = ink.map((w, n) => w.x - prev[n].x);
          const dy = ink.map((w, n) => w.y - prev[n].y);
          const same = new Set(dx).size === 1 && new Set(dy).size === 1;
          const texts = ink.every((w, n) => w.t === prev[n].t);
          if (!same || !texts || Math.abs(dx[0]) > 6 || Math.abs(dy[0]) > 6) jumps.push({ i, dx: dx[0], dy: dy[0] });
        }
        prev = ink;
      }
      S.press('right', false);
      S.step(1);
      return { frames, jumps };
    });
    const bad = walk.frames.filter((f) => !(f.n === 1 && f.dupes.length === 0 && f.whole && f.desert === 0 && f.cosmos === 1));
    expect(bad, JSON.stringify(bad.slice(0, 2))).toEqual([]);
    expect(walk.jumps, JSON.stringify(walk.jumps)).toEqual([]);
    await page.screenshot({ path: `${ART}/b33-nexus.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('ATTACK is melee, ITEM and SWAP are not, and old slots migrate', async ({ page }) => {
    const errors = await boot(page);
    const live = await page.evaluate(() => {
      function quiet(S) {
        for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
      }
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'skippy';
      S.G.paused = false;
      S.P.items = { sword: true, baton: true, raygun: true, lasso: true, heavy: true, bow: true };
      S.P.arrows = 5;
      S.P.melee = 'sword';
      S.P.wep = 'sword';
      S.P.pri = 'lasso';
      S.P.sec = 'raygun';
      S.P.tool = 'raygun';
      S.P.cds = {};
      S.flag('oe_desert');
      S.flag('santt_met');
      S.warp('desert', 20, 16, 3);
      quiet(S);
      function edge(name) {
        S.press(name, true); S.step(2); S.press(name, false); S.step(1);
      }
      S.shots.length = 0;
      edge('attack');
      const attack = {
        shots: S.shots.map((s) => s.kind),
        melee: S.melee(),
        swung: S.P.swingKind === 'melee',
      };
      S.P.cds = {};
      S.shots.length = 0;
      edge('item');
      const item = { shots: S.shots.map((s) => s.kind), melee: S.melee() };
      const swapped = [];
      for (let i = 0; i < 4; i++) {
        edge('swap');
        swapped.push(S.hands().item);
      }
      S.cycleMelee();
      const cycled = S.melee();
      S.G.paused = true;
      S.G.skipPage = 1;
      S.G.gearSel = 0;
      S.step(2);
      const pageText = (S.pauseBoxes() || []).map((b) => b.t).join(' ');
      return { attack, item, swapped, cycled, pageText, hands: S.hands() };
    });
    expect(live.attack.melee).toBe('sword');
    expect(live.attack.swung).toBe(true);
    expect(live.attack.shots.join(',')).not.toMatch(/ray|arrow|heavy|lasso/);
    expect(live.item.melee).toBe('sword');
    expect(live.item.shots).toContain('ray');
    expect(live.swapped.every((id) => MELEE.indexOf(id) < 0)).toBe(true);
    expect(new Set(live.swapped).size).toBeGreaterThan(1);
    expect(MELEE).toContain(live.cycled);
    expect(live.cycled).not.toBe('sword');
    expect(live.pageText).toContain('MELEE');
    expect(live.pageText).toContain('ITEMS');
    await page.screenshot({ path: `${ART}/b33-items.png` });

    const gate = await page.evaluate(() => {
      function quiet(S) {
        for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
      }
      const S = __SQ;
      S.G.paused = false;
      S.P.items.axe = false;
      S.P.melee = 'baton';
      S.P.wep = 'baton';
      S.flag('axe_got', false);
      S.flag('vine_sea', false);
      S.flag('oe_seaport');
      S.warp('seaport', 8, 8, 0);
      quiet(S);
      S.press('talk', true); S.step(2); S.press('talk', false); S.step(2);
      const blocked = !S.flags.vine_sea;
      S.P.items.axe = true;
      S.flag('axe_got');
      S.P.melee = 'axe';
      S.P.wep = 'axe';
      S.press('talk', true); S.step(2); S.press('talk', false); S.step(2);
      const opened = !!S.flags.vine_sea;
      S.G.story = 'skippy';
      S.P.items.heavy = true;
      S.P.melee = 'baton';
      S.P.wep = 'baton';
      S.P.pri = 'raygun';
      S.P.sec = 'heavy';
      S.P.tool = 'heavy';
      S.P.cds = {};
      S.flag('court_box', false);
      S.flag('pour_box', false);
      S.flag('oe_saloon');
      S.warp('saloon', 8.5, 6.2, 1);
      quiet(S);
      S.shots.length = 0;
      S.press('attack', true); S.step(2); S.press('attack', false); S.step(8);
      const attackCase = !!S.flags.court_box;
      S.P.cds = {};
      S.press('item', true); S.step(2); S.press('item', false); S.step(20);
      return { blocked, opened, attackCase, itemCase: !!S.flags.court_box, shots: S.shots.map((s) => s.kind) };
    });
    expect(gate.blocked).toBe(true);
    expect(gate.opened).toBe(true);
    expect(gate.attackCase).toBe(false);
    expect(gate.itemCase, JSON.stringify(gate)).toBe(true);

    const old = JSON.stringify({
      z: 'lasso', v: 1, area: 'home', x: 160, y: 140, dir: 0,
      hp: 6, maxHp: 6, pieces: 0, coins: 3, arrows: 4,
      items: { sword: true, baton: true, raygun: true, lasso: true },
      keys: {}, bigKeys: {},
      flags: { woke: true, oe_home: true },
      party: [], shards: 0, time: 10, visited: { home: true },
      pri: 'sword', sec: 'baton', wep: 'sword', tool: 'baton',
    });
    await page.addInitScript((raw) => { localStorage.setItem('sq_save_v1', raw); }, old);
    await page.reload();
    await page.waitForFunction(() => window.__SQ);
    await page.evaluate(() => {
      const S = __SQ;
      S.setManual(true);
      S.step(25);
      S.press('attack', true); S.step(2); S.press('attack', false);
    });
    await page.waitForTimeout(400);
    const hands = await page.evaluate(() => {
      const S = __SQ;
      S.step(25);
      S.press('attack', true); S.step(2); S.press('attack', false); S.step(8);
      for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      return { state: S.G.state, hands: S.hands(), slots: S.slots(), melee: S.melee() };
    });
    expect(hands.melee, JSON.stringify(hands)).not.toBe('');
    expect(MELEE, JSON.stringify(hands)).toContain(hands.melee);
    expect(MELEE).not.toContain(hands.slots.pri);
    expect(MELEE).not.toContain(hands.slots.sec);
    expect([hands.slots.pri, hands.slots.sec].sort()).toEqual(['lasso', 'raygun']);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('boss arenas stay lit, including the centipede, without the lantern', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    const bright = await page.evaluate(() => {
      function luma(data) {
        let sum = 0;
        let n = 0;
        for (let i = 0; i < data.length; i += 16) {
          sum += 0.3 * data[i] + 0.5 * data[i + 1] + 0.2 * data[i + 2];
          n++;
        }
        return sum / Math.max(1, n);
      }
      function sample() {
        const c = document.getElementById('game');
        const g = c.getContext('2d');
        const full = g.getImageData(0, 24, 320, 176).data;
        const corner = g.getImageData(280, 40, 24, 24).data;
        return { full: luma(full), corner: luma(corner) };
      }
      function quiet(S) {
        for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
      }
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'skippy';
      S.G.paused = false;
      S.P.lantern = 0;
      S.P.magic = 0;
      const rooms = ['d4', 's4', 'v3', 'st4', 'dsand', 'dsea', 'forge'];
      const out = [];
      for (const area of rooms) {
        S.flag('oe_' + area);
        S.warp(area, 9, 7, 1);
        quiet(S);
        S.P.lantern = 0;
        S.step(2);
        const early = sample();
        S.step(100);
        const late = sample();
        out.push({ area, boss: S.B && S.B.kind, state: S.B && S.B.state, early: early.full, full: late.full, corner: late.corner });
      }
      S.flag('oe_pr_dark');
      S.warp('pr_dark', 9, 6, 1);
      quiet(S);
      S.P.lantern = 0;
      S.step(4);
      const cell = sample();
      return { out, cell };
    });
    for (const room of bright.out) {
      expect(room.early, JSON.stringify(room)).toBeGreaterThan(16);
      expect(room.full, JSON.stringify(room)).toBeGreaterThan(16);
      expect(room.corner, JSON.stringify(room)).toBeGreaterThan(12);
    }
    expect(bright.cell.full, JSON.stringify(bright.cell)).toBeGreaterThan(16);
    expect(bright.cell.corner, JSON.stringify(bright.cell)).toBeGreaterThan(12);
    await page.evaluate(() => {
      const S = __SQ;
      S.G.paused = false;
      S.P.lantern = 0;
      S.flag('oe_d4');
      S.warp('d4', 9, 7, 1);
      S.step(360);
    });
    await page.screenshot({ path: `${ART}/b33-centipede.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
