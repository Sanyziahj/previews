import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.__SQ_DEBUG = true; });
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ);
  await page.locator('#game').focus();
  return errors;
}

async function press(page, key) {
  await page.keyboard.down(key);
  await page.waitForTimeout(50);
  await page.keyboard.up(key);
  await page.waitForTimeout(30);
}

async function quiet(page) {
  for (let i = 0; i < 8; i++) {
    const open = await page.evaluate(() => ({
      script: !!__SQ.script,
      dlg: !!__SQ.dlg,
      end: __SQ.G.state === 'endcard',
      play: __SQ.G.state === 'play',
    }));
    if (open.end) return open;
    if (!open.script && !open.dlg) return open;
    await press(page, 'Space');
    await page.waitForTimeout(80);
  }
  return page.evaluate(() => ({ script: !!__SQ.script, dlg: !!__SQ.dlg, end: __SQ.G.state === 'endcard' }));
}

async function stepToward(page, x, y, close) {
  const here = await page.evaluate(({ x, y }) => ({
    dx: x - __SQ.P.x,
    dy: y - __SQ.P.y,
    dist: Math.hypot(x - __SQ.P.x, y - __SQ.P.y),
    dir: __SQ.P.dir,
    hp: __SQ.P.hp,
    state: __SQ.G.state,
    area: __SQ.A.id,
    talk: !!(__SQ.script || __SQ.dlg),
  }), { x, y });
  if (here.talk || here.state !== 'play' || here.dist <= close) return here;
  const key = Math.abs(here.dx) > Math.abs(here.dy)
    ? (here.dx > 0 ? 'ArrowRight' : 'ArrowLeft')
    : (here.dy > 0 ? 'ArrowDown' : 'ArrowUp');
  await press(page, key);
  return here;
}

test.describe('the desert nexus after the centipede', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('a phone can walk from the centipede into the desert portal and on to the seaport', async ({ page }) => {
    test.setTimeout(180000);
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    const save = {
      z: 'bow', v: 1, area: 'd4', x: 160, y: 136, dir: 1,
      hp: 20, maxHp: 20, pieces: 0, coins: 12, arrows: 40,
      items: { baton: true, bow: true },
      keys: {}, bigKeys: {},
      flags: { woke: true, oe_d4: true, santt_met: true, eye_desert: true, ros_joined: true },
      party: ['ros'], shards: 0, time: 80,
      visited: { d4: true, desert: true, d1: true, d3: true },
      pri: 'bow', sec: '', melee: 'baton', wep: 'baton',
    };
    await page.evaluate((raw) => localStorage.setItem('sq_save_v1', JSON.stringify(raw)), save);
    await page.evaluate(() => __SQ.loadChapter('skippy'));
    await page.waitForFunction(() => __SQ.A.id === 'd4', null, { timeout: 8000 });
    const before = await page.evaluate(() => ({
      tales: !!(__SQ.flags.tale_ros || __SQ.flags.tale_ram || __SQ.flags.tale_drill || __SQ.flags.heavy_got || __SQ.flags.pour_box),
      done: !!__SQ.flags.boss_d1,
      hands: __SQ.hands(),
    }));
    expect(before.tales).toBe(false);
    expect(before.done).toBe(false);
    expect(before.hands.melee).toBe('baton');
    expect(before.hands.item).toBe('bow');
    await page.waitForFunction(() => __SQ.B && __SQ.B.state === 'fight', null, { timeout: 20000 });
    const started = Date.now();
    let swings = 0;
    let shots = 0;
    while (Date.now() - started < 110000) {
      const boss = await page.evaluate(() => {
        const B = __SQ.B, P = __SQ.P;
        const segs = [];
        for (let i = 1; i <= (B.nseg || 0); i++) {
          const s = __SQ.seg(i);
          if (s) segs.push(s);
        }
        const dx = B.x - P.x, dy = B.y - P.y;
        const dist = Math.hypot(dx, dy) || 1;
        let near = 99;
        for (const s of segs) near = Math.min(near, Math.hypot(s[0] - P.x, s[1] - (P.y - 5)));
        let blocked = false;
        const ang = Math.atan2(dy, dx);
        for (const s of segs) {
          const sd = Math.hypot(s[0] - P.x, s[1] - P.y);
          if (sd + 6 >= dist) continue;
          let da = Math.atan2(s[1] - P.y, s[0] - P.x) - ang;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          if (Math.abs(da) < 0.35) blocked = true;
        }
        const face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 0 : 1);
        const keys = ['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'];
        const side = Math.abs(dx) > Math.abs(dy) ? (dy > 0 ? 'ArrowDown' : 'ArrowUp') : (dx > 0 ? 'ArrowRight' : 'ArrowLeft');
        let kind = 'hold';
        let key = dist > 100 ? keys[face] : dist < 48 ? keys[[1, 0, 3, 2][face]] : '';
        if (dist < 26 || near < 14) {
          kind = 'back';
          key = keys[[1, 0, 3, 2][face]];
        } else if (blocked && (B.eye === 1 || B.eye === 2)) {
          kind = 'strafe';
          key = side;
        } else if (B.eye === 2 && dist < 180 && !blocked && near > 16) {
          if (dist > 34) {
            kind = 'aim';
            key = keys[face];
          } else if (P.dir !== face) {
            kind = 'aim';
            key = keys[face];
          } else {
            kind = 'swing';
            key = 'KeyX';
          }
        } else if ((B.eye === 1 || B.eye === 2) && dist < 180 && !blocked) {
          kind = P.dir === face ? 'shoot' : 'aim';
          key = kind === 'aim' ? keys[face] : 'KeyZ';
        }
        return {
          hp: B.hp, state: B.state, eye: B.eye, php: P.hp,
          area: __SQ.A.id, play: __SQ.G.state, kind, key, dist: Math.round(dist), near: Math.round(near),
        };
      });
      if (boss.area !== 'd4' || boss.play !== 'play') break;
      if (boss.state === 'dying' || boss.state === 'dead' || boss.hp <= 0) break;
      if (boss.php <= 0) break;
      if (boss.kind === 'shoot') {
        await press(page, 'KeyZ');
        shots++;
        await page.waitForTimeout(140);
      } else if (boss.kind === 'swing') {
        await press(page, 'KeyX');
        swings++;
        await page.waitForTimeout(200);
      } else if (boss.key) {
        await press(page, boss.key);
      } else {
        await page.waitForTimeout(40);
      }
    }
    const fought = await page.evaluate(() => ({
      hp: __SQ.B && __SQ.B.hp,
      state: __SQ.B && __SQ.B.state,
      flag: !!__SQ.flags.boss_d1,
      php: __SQ.P.hp,
      area: __SQ.A.id,
      play: __SQ.G.state,
    }));
    expect(fought.play, JSON.stringify({ fought, swings, shots })).toBe('play');
    expect(fought.php, JSON.stringify({ fought, swings, shots })).toBeGreaterThan(0);
    expect(swings, JSON.stringify({ fought, swings, shots })).toBeGreaterThan(0);
    await page.waitForFunction(() => __SQ.B.state === 'dead' || __SQ.flags.boss_d1 || __SQ.script, null, { timeout: 15000 });
    const shard = { x: 9.5 * 16 + 8, y: 5.5 * 16 + 8 };
    for (let i = 0; i < 40; i++) {
      const st = await page.evaluate(() => __SQ.G.state);
      if (st === 'endcard' || st === 'play' && await page.evaluate(() => __SQ.A.id === 'desert')) break;
      await quiet(page);
      const got = await page.evaluate(() => !!__SQ.flags.ch1_done || __SQ.G.state === 'endcard');
      if (!got) await stepToward(page, shard.x, shard.y, 8);
      await page.waitForTimeout(120);
    }
    await page.waitForFunction(() => __SQ.G.state === 'endcard' || (__SQ.A.id === 'desert' && __SQ.flags.boss_d1), null, { timeout: 20000 });
    if (await page.evaluate(() => __SQ.G.state === 'endcard')) {
      await page.waitForTimeout(2700);
      await press(page, 'KeyX');
      await page.waitForTimeout(400);
    }
    for (let i = 0; i < 12; i++) {
      const done = await page.evaluate(() => __SQ.A.id === 'desert' && __SQ.G.state === 'play' && !__SQ.script && !__SQ.dlg);
      if (done) break;
      await quiet(page);
      if (await page.evaluate(() => __SQ.G.state === 'endcard')) {
        await page.waitForTimeout(2600);
        await press(page, 'KeyX');
      }
      await page.waitForTimeout(150);
    }
    await page.waitForFunction(() => __SQ.A.id === 'desert' && __SQ.G.state === 'play' && !__SQ.script && !__SQ.dlg, null, { timeout: 15000 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${ART}/b34-desert-nexus.png` });
    const door = await page.evaluate(() => {
      const ink = __SQ.worldInk().filter((w) => w.t === 'NEXUS');
      const prop = (__SQ.A.props || []).find((p) => p.label === 'NEXUS');
      return {
        n: ink.length,
        to: prop && prop.to,
        cash: __SQ.npcs.some((n) => n.id === 'wizard' && n.vis !== false),
        x: prop && prop.x,
        y: prop && prop.y,
      };
    });
    expect(door.cash).toBe(true);
    expect(door.to).toBe('desert_hub');
    expect(door.n).toBe(1);
    const target = { x: door.x * 16 + 8, y: door.y * 16 + 8 };
    for (let i = 0; i < 24; i++) {
      const here = await stepToward(page, target.x, target.y, 18);
      if (here.area !== 'desert' || here.dist <= 18) break;
    }
    await press(page, 'KeyE');
    await page.waitForTimeout(400);
    for (let i = 0; i < 16; i++) {
      if (await page.evaluate(() => __SQ.A.id === 'hub' && !__SQ.script && !__SQ.dlg)) break;
      await quiet(page);
      await page.waitForTimeout(100);
    }
    await page.waitForFunction(() => __SQ.A.id === 'hub', null, { timeout: 8000 });
    expect(await page.evaluate(() => __SQ.A.name)).toBe('THE PORTAL NEXUS');
    const sea = await page.evaluate(() => {
      const p = __SQ.A.props.find((x) => x.label === 'SEAPORT');
      return { x: p.x * 16 + 8, y: p.y * 16 + 8, need: p.need, open: !p.need || !!__SQ.flags[p.need] };
    });
    expect(sea.open).toBe(true);
    for (let i = 0; i < 36; i++) {
      const here = await stepToward(page, sea.x, sea.y, 18);
      if (here.dist <= 18) break;
      if (here.talk) await quiet(page);
    }
    await press(page, 'KeyE');
    await page.waitForTimeout(500);
    for (let i = 0; i < 10; i++) {
      if (await page.evaluate(() => __SQ.A.id === 'seaport' && !__SQ.script && !__SQ.dlg)) break;
      await quiet(page);
    }
    const arrived = await page.evaluate(() => ({
      area: __SQ.A.id,
      tales: !!(__SQ.flags.tale_ros || __SQ.flags.tale_ram || __SQ.flags.tale_drill || __SQ.flags.heavy_got || __SQ.flags.pour_box),
    }));
    expect(arrived.area).toBe('seaport');
    expect(arrived.tales).toBe(false);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('the basement still shows its cosmos portal and one solid label', async ({ page }) => {
    const errors = await boot(page);
    await page.setViewportSize({ width: 844, height: 390 });
    const seen = await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'skippy';
      S.G.paused = false;
      S.flag('pour_box');
      S.flag('oe_nexus');
      S.warp('nexus', 9.5, 6, 1);
      S.step(3);
      const c = document.getElementById('game');
      const g = c.getContext('2d', { willReadFrequently: true });
      const prop = S.A.props.find((p) => p.label === 'COSMOS');
      const sx = Math.round(prop.x * 16 + 8);
      const sy = Math.round(prop.y * 16 + 8 + 24);
      const box = g.getImageData(Math.max(0, sx - 16), Math.max(24, sy - 12), 32, 24).data;
      let hot = 0;
      for (let i = 0; i < box.length; i += 4) {
        const r = box[i], gg = box[i + 1], b = box[i + 2];
        const hi = Math.max(r, gg, b), lo = Math.min(r, gg, b);
        if (hi - lo > 50 && hi > 80) hot++;
      }
      const labels = S.worldInk().filter((w) => w.t === 'COSMOS');
      const doors = S.A.props.filter((p) => p.k === 'portal').map((p) => p.label);
      return { name: S.A.name, hot, labels: labels.length, doors, table: S.nexuses() };
    });
    expect(seen.name).toBe("CASH'S BASEMENT");
    expect(seen.hot, JSON.stringify(seen)).toBeGreaterThan(6);
    expect(seen.labels).toBe(1);
    expect(seen.doors).toEqual(['COSMOS']);
    expect(seen.table.map((d) => d.id)).toEqual(['hub', 'nexus']);
    await page.screenshot({ path: `${ART}/b34-basement.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
