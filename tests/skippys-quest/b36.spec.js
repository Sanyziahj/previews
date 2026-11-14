import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

const ROS_SAVE = JSON.stringify({
  z: 'lasso', v: 1, area: 'ros_pour', x: 160, y: 120, dir: 1,
  hp: 8, maxHp: 8, pieces: 0, coins: 3, arrows: 0,
  items: { blasters: true, lasso: true }, keys: {}, bigKeys: {},
  flags: { lasso_got: true, woke: true }, party: [], shards: 0, time: 10,
  visited: { ros_pour: true },
});
const RAM_SAVE = JSON.stringify({
  z: 'hatchet', v: 1, area: 'ram_dock', x: 96, y: 128, dir: 3,
  hp: 8, maxHp: 8, pieces: 0, coins: 7, arrows: 0,
  items: { hatchet: true }, keys: {}, bigKeys: {},
  flags: { axe_got: true, ram_woke: true }, party: [], shards: 0, time: 10,
  visited: { ram_dock: true },
});
const DS_SAVE = JSON.stringify({
  z: 'blast', v: 1, area: 'ds_camp', x: 128, y: 112, dir: 0,
  hp: 10, maxHp: 10, pieces: 0, coins: 1, arrows: 0,
  items: { blast: true }, keys: {}, bigKeys: {},
  flags: { ds_board: true }, party: [], shards: 0, time: 10,
  visited: { ds_camp: true },
});
const THRONE_SAVE = JSON.stringify({
  z: 'bow', v: 1, area: 'throne', x: 160, y: 140, dir: 1,
  hp: 10, maxHp: 10, pieces: 2, coins: 77, arrows: 5,
  items: { baton: true, bow: true }, keys: { small: 1 }, bigKeys: {},
  flags: { woke: true, ch9_done: true, hardened: true, oe_home: true, oe_throne: true, santt_met: true, space_board: true },
  party: [], shards: 7, time: 1200,
  visited: { throne: true, home: true, desert: true },
});
const DESERT_SAVE = JSON.stringify({
  z: 'bow', v: 1, area: 'desert', x: 200, y: 200, dir: 3,
  hp: 6, maxHp: 6, pieces: 0, coins: 42, arrows: 3,
  items: { baton: true }, keys: {}, bigKeys: {},
  flags: { woke: true, ch9_done: true, santt_met: true, macho_seen: true, oe_desert: true },
  party: [], shards: 7, time: 900,
  visited: { desert: true, home: true },
});

function track(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function boot(page, saves) {
  await page.addInitScript((payload) => {
    window.__SQ_DEBUG = true;
    if (!payload) return;
    if (payload.skippy) localStorage.setItem('sq_save_v1', payload.skippy);
    if (payload.ros) localStorage.setItem('sq_save_ros_v1', payload.ros);
    if (payload.ram) localStorage.setItem('sq_save_ram_v1', payload.ram);
    if (payload.ds) localStorage.setItem('sq_save_ds_v1', payload.ds);
  }, saves || null);
  const errors = track(page);
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ);
  await page.evaluate(() => { __SQ.setManual(true); __SQ.step(8); });
  return errors;
}

async function enterContinue(page) {
  await page.evaluate(() => {
    const ok = __SQ.loadChapter('skippy');
    if (!ok) throw new Error('continue failed');
    for (let i = 0; i < 40; i++) __SQ.step(2);
  });
}

test.describe('Spike DreamLand chapter', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('a finished throne save starts at the nexus, and other saves stay put', async ({ page }) => {
    test.setTimeout(90000);
    const errors = await boot(page, {
      skippy: THRONE_SAVE,
      ros: ROS_SAVE,
      ram: RAM_SAVE,
      ds: DS_SAVE,
    });
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    expect(await page.evaluate(() => __SQ.build())).toBe('b43');
    await enterContinue(page);
    const heard = await page.evaluate(() => {
      const S = __SQ;
      const lines = [];
      for (let i = 0; i < 8; i++) {
        for (let n = 0; n < 20 && !(S.dlg && S.dlg.raw); n++) S.step(2);
        if (!S.dlg) break;
        S.skipText();
        lines.push(S.dlg.pages.map((p) => p.join(' ')).join(' '));
        S.press('talk', true); S.step(1); S.press('talk', false); S.step(3);
      }
      return lines.join(' | ');
    });
    const home = await page.evaluate(() => {
      const S = __SQ;
      const text = S.dlg ? S.dlg.pages.map((p) => p.join(' ')).join(' ') : '';
      const spike = S.npcs.find((n) => n.id === 'spike');
      return {
        area: S.A.id,
        name: S.A.name,
        text: text,
        spike: !!spike && spike.vis !== false,
        coins: S.P.coins,
        shards: S.P.shards,
        baton: !!S.P.items.baton,
        bow: !!S.P.items.bow,
        ch9: !!S.flags.ch9_done,
        hardened: !!S.flags.hardened,
        magic: getComputedStyle(document.querySelector('[data-b=magic]')).display,
        pause: getComputedStyle(document.querySelector('[data-b=map]')).display,
        map: getComputedStyle(document.querySelector('[data-b=worldmap]')).display,
      };
    });
    expect(home.area).toBe('hub');
    expect(home.name).toBe('THE PORTAL NEXUS');
    expect(heard).toMatch(/PIONEER POUR/);
    expect(heard).toMatch(/GET SOME REST/);
    expect(heard).not.toMatch(/DREAMLAND|SPIKE/);
    expect(home.spike).toBe(false);
    expect(home.coins).toBe(77);
    expect(home.shards).toBe(7);
    expect(home.baton).toBe(true);
    expect(home.bow).toBe(true);
    expect(home.ch9).toBe(true);
    expect(home.hardened).toBe(true);
    expect(home.magic).toBe('none');
    expect(home.pause).not.toBe('none');
    expect(home.map).not.toBe('none');
    const keys = await page.evaluate(() => ({
      ros: localStorage.getItem('sq_save_ros_v1'),
      ram: localStorage.getItem('sq_save_ram_v1'),
      ds: localStorage.getItem('sq_save_ds_v1'),
      skippy: JSON.parse(localStorage.getItem('sq_save_v1')),
    }));
    expect(keys.ros).toBe(ROS_SAVE);
    expect(keys.ram).toBe(RAM_SAVE);
    expect(keys.ds).toBe(DS_SAVE);
    expect(keys.skippy.coins).toBe(77);
    expect(keys.skippy.flags.ch9_done).toBe(true);
    expect(keys.skippy.shards).toBe(7);
    await page.evaluate(() => { __SQ.G.saveT = 0; __SQ.step(1); });
    await page.screenshot({ path: `${ART}/b38-nexus-continue.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a finished desert save still continues in the desert', async ({ page }) => {
    const errors = await boot(page, { skippy: DESERT_SAVE });
    await enterContinue(page);
    const back = await page.evaluate(() => ({ area: __SQ.A.id, coins: __SQ.P.coins, ch9: !!__SQ.flags.ch9_done }));
    expect(back.area).toBe('desert');
    expect(back.coins).toBe(42);
    expect(back.ch9).toBe(true);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('DreamLand is a realm transition with belts, a sealed throne, and the Ronin handoff', async ({ page }) => {
    test.setTimeout(120000);
    const errors = await boot(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'skippy';
      S.G.paused = false;
      S.flag('woke');
      S.flag('oe_home');
      S.flag('ch9_done');
      S.flag('hardened');
      S.flag('space_board');
      S.P.items.board = true;
      S.P.coins = 77;
      S.P.shards = 7;
      S.P.items.baton = true;
      S.warp('home', 8.2, 8.4, 3);
      for (let i = 0; i < 12 && !(S.dlg && /DREAMLAND/.test(S.dlg.raw || '')); i++) S.step(2);
      if (S.dlg) S.skipText();
      S.step(1);
    });
    const called = await page.evaluate(() => {
      const portals = (__SQ.A.props || []).filter((p) => p.k === 'portal');
      return {
        area: __SQ.A.id,
        line: __SQ.dlg ? __SQ.dlg.raw : '',
        portals: portals.length,
      };
    });
    expect(called.area).toBe('home');
    expect(called.line).toMatch(/HURRY, RETURN TO DREAMLAND/);
    expect(called.portals).toBe(0);
    await page.evaluate(() => {
      const S = __SQ;
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      for (let i = 0; i < 40 && S.A.id !== 'dl_yard'; i++) S.step(8);
      for (let i = 0; i < 20 && (S.G.fade > 0.05 || S.script || S.dlg); i++) {
        if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
        S.step(4);
      }
    });
    const yard = await page.evaluate(() => {
      const S = __SQ;
      let belts = 0;
      const rows = [];
      for (let y = 0; y < 16; y++) {
        let row = '';
        for (let x = 0; x < 28; x++) {
          const t = S.tile(x, y);
          row += t;
          if (t === 'R') belts++;
        }
        rows.push(row);
      }
      const ink = S.worldInk().map((w) => w.t);
      return {
        area: S.A.id,
        name: S.A.name,
        realm: S.A.realm,
        belts,
        enemies: S.ents.filter((e) => e.k === 'vov' && !e.dead).length,
        kinds: S.ents.map((e) => e.k),
        fright: S.npcs.some((n) => n.id === 'fright'),
        overlord: S.npcs.some((n) => n.id === 'overlord'),
        beam: (S.A.props || []).some((p) => p.k === 'beam'),
        portals: (S.A.props || []).filter((p) => p.k === 'portal').length,
        ink,
        wall: rows[4],
      };
    });
    expect(yard.area).toBe('dl_yard');
    expect(yard.name).toBe('DREAMLAND');
    expect(yard.realm).toBe('dreamland');
    expect(yard.belts).toBeGreaterThan(30);
    expect(yard.wall.startsWith('#R') || yard.wall.includes('RRRR')).toBe(true);
    expect(yard.enemies).toBeGreaterThanOrEqual(4);
    expect(yard.kinds.every((k) => k === 'vov')).toBe(true);
    expect(yard.fright).toBe(true);
    expect(yard.overlord).toBe(true);
    expect(yard.beam).toBe(true);
    expect(yard.portals).toBe(0);
    expect(yard.ink.join(' ')).not.toMatch(/SIGN|PORTAL|DOWNLOAD/);
    await page.evaluate(() => {
      const S = __SQ;
      S.P.x = 14.5 * 16;
      S.P.y = 8.5 * 16;
      S.G.bannerT = 0;
      S.G.saveT = 0;
      S.step(3);
    });
    await page.screenshot({ path: `${ART}/b36-dreamland-belts.png` });
    await page.evaluate(() => {
      const S = __SQ;
      S.flag('dl_blocked', false);
      S.P.x = 14.5 * 16;
      S.P.y = 6.4 * 16;
      S.P.dir = 1;
      S.stick(0, -1);
      for (let i = 0; i < 40 && !S.dlg && !S.script; i++) S.step(2);
      S.stick(0, 0);
      if (S.dlg) S.skipText();
      S.step(1);
    });
    const sealed = await page.evaluate(() => {
      const S = __SQ;
      const first = S.dlg ? S.dlg.pages.map((p) => p.join(' ')).join(' ') : '';
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(4); }
      if (S.dlg) S.skipText();
      const second = S.dlg ? S.dlg.pages.map((p) => p.join(' ')).join(' ') : '';
      return { first, second, area: S.A.id };
    });
    expect(sealed.area).toBe('dl_yard');
    expect(sealed.first).toMatch(/BELTS SEAL THE THRONE/);
    expect(sealed.second).toMatch(/NEITHER CAN I/);
    expect(sealed.second).toMatch(/BRING FRIGHT BACK/);
    expect(sealed.first + sealed.second).not.toMatch(/KILL|DEATH|DYING/);
    await page.evaluate(() => {
      const S = __SQ;
      for (let i = 0; i < 8; i++) {
        if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
        S.step(2);
      }
      S.P.x = 14.5 * 16;
      S.P.y = 5.7 * 16;
      S.stick(0, -1);
      S.step(90);
      S.stick(0, 0);
      S.step(2);
    });
    const blocked = await page.evaluate(() => {
      const S = __SQ;
      const py = Math.floor(S.P.y / 16);
      const spike = S.npcs.find((n) => n.id === 'spike');
      const over = S.npcs.find((n) => n.id === 'overlord');
      const fright = S.npcs.find((n) => n.id === 'fright');
      return {
        area: S.A.id,
        py,
        tile: S.tile(14, 4),
        spikeY: Math.floor(spike.y / 16),
        overY: Math.floor(over.y / 16),
        frightY: Math.floor(fright.y / 16),
      };
    });
    expect(blocked.area).toBe('dl_yard');
    expect(blocked.tile).toBe('R');
    expect(blocked.py).toBeGreaterThan(4);
    expect(blocked.spikeY).toBeGreaterThan(4);
    expect(blocked.overY).toBeLessThan(4);
    expect(blocked.frightY).toBeLessThan(4);
    await page.evaluate(() => {
      const S = __SQ;
      S.ents.forEach((e, i) => { e.x = (3 + i * 4) * 16; e.y = 11 * 16; });
      S.P.x = 14.5 * 16;
      S.P.y = 6.2 * 16;
      S.P.dir = 1;
      S.G.bannerT = 0;
      S.G.saveT = 0;
      S.step(2);
    });
    await page.screenshot({ path: `${ART}/b36-throne-blocked.png` });
    await page.evaluate(() => {
      const S = __SQ;
      S.P.x = 26.5 * 16;
      S.P.y = 12.5 * 16;
      for (let i = 0; i < 30 && S.A.id !== 'dl_plans'; i++) S.step(4);
      for (let i = 0; i < 8 && (S.script || S.dlg || S.G.trans); i++) S.step(4);
    });
    const plansRoom = await page.evaluate(() => ({
      area: __SQ.A.id,
      name: __SQ.A.name,
      plans: (__SQ.A.props || []).some((p) => p.k === 'plans'),
      spike: __SQ.npcs.some((n) => n.id === 'spike'),
      sign: (__SQ.A.signs || []).some((s) => /DOWNLOAD PLANS/.test(s.text)),
    }));
    expect(plansRoom.area).toBe('dl_plans');
    expect(plansRoom.name).toBe('THE DOWNLOAD PLANS');
    expect(plansRoom.plans).toBe(true);
    expect(plansRoom.spike).toBe(true);
    expect(plansRoom.sign).toBe(true);
    await page.evaluate(() => {
      const S = __SQ;
      S.P.x = 9.5 * 16;
      S.P.y = 7.2 * 16;
      S.P.dir = 1;
      S.G.bannerT = 0;
      S.G.saveT = 0;
      S.step(2);
    });
    await page.screenshot({ path: `${ART}/b36-plans-room.png` });
    await page.evaluate(() => {
      const S = __SQ;
      S.P.x = 72;
      S.P.y = 90;
      S.P.dir = 1;
      S.G.saveT = 0;
      S.press('talk', true); S.step(2); S.press('talk', false); S.step(3);
      if (S.dlg) S.skipText();
      S.step(1);
    });
    const handoff = await page.evaluate(() => {
      const text = __SQ.dlg ? __SQ.dlg.pages.map((p) => p.join(' ')).join(' | ') : '';
      return { text, who: __SQ.dlg && __SQ.dlg.who, ronin: !!__SQ.flags.dl_ronin };
    });
    expect(handoff.who).toBe('skippy');
    expect(handoff.text).toMatch(/DOWNLOAD PLANS/);
    expect(handoff.text).toMatch(/FIRE SEAL/);
    expect(handoff.text).toMatch(/PORTAL/);
    expect(handoff.text).toMatch(/TAKE THE DOWNLOAD PLANS TO RONIN/);
    await page.screenshot({ path: `${ART}/b36-ronin-handoff.png` });
    await page.evaluate(() => {
      const S = __SQ;
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(4); }
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(4); }
      if (S.dlg) S.skipText();
      S.step(2);
    });
    const done = await page.evaluate(() => ({
      flag: !!__SQ.flags.dl_ronin,
      coins: __SQ.P.coins,
      shards: __SQ.P.shards,
      area: __SQ.A.id,
      text: __SQ.dlg ? __SQ.dlg.raw : '',
    }));
    expect(done.flag).toBe(true);
    expect(done.coins).toBe(77);
    expect(done.shards).toBe(7);
    expect(done.area).toBe('dl_plans');
    expect(done.text === '' || /RONIN/.test(done.text)).toBe(true);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
