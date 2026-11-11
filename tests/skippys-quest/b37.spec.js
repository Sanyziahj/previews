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

function skippySave(area, extraFlags) {
  return JSON.stringify({
    z: 'bow', v: 1, area, x: 230, y: 124, dir: 3,
    hp: 10, maxHp: 10, pieces: 2, coins: 77, arrows: 5,
    items: { baton: true, bow: true, board: true }, keys: { small: 1 }, bigKeys: {},
    flags: Object.assign({
      woke: true, ch9_done: true, hardened: true, oe_home: true, oe_throne: true,
      santt_met: true, space_board: true, dl_called: true, dl_left: true,
      dl_arrive_said: true, oe_dl_yard: true, oe_dl_plans: true, dl_blocked: true,
    }, extraFlags || {}),
    party: [], shards: 7, time: 1300,
    visited: { throne: true, home: true, desert: true, dl_yard: true, dl_plans: true },
  });
}

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
  await page.waitForFunction(() => window.__SQ && document.documentElement.classList.contains('srml'));
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

function phone(page) {
  return page.evaluate(() => {
    const box = (name) => {
      const el = document.querySelector(`[data-b=${name}]`);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        text: (el.textContent || '').trim(),
        display: getComputedStyle(el).display,
        left: r.left,
        top: r.top,
      };
    };
    return {
      pause: box('map'),
      map: box('worldmap'),
      swap: box('swap'),
      action: box('talk'),
      attack: box('attack'),
      item: box('item'),
      board: box('board') || box('roll'),
      magic: box('magic'),
    };
  });
}

test.describe('DreamLand return home', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('the Ronin handoff fades Skippy home and Spike is gone', async ({ page }) => {
    test.setTimeout(90000);
    const errors = await boot(page, {
      skippy: skippySave('dl_plans'),
      ros: ROS_SAVE,
      ram: RAM_SAVE,
      ds: DS_SAVE,
    });
    expect(await page.evaluate(() => __SQ.build())).toBe('b39');
    const cache = await page.evaluate(() => {
      const tag = document.querySelector('script');
      return tag ? tag.textContent : '';
    });
    expect(cache).toContain('window.__SQ_BUILD="b39"');
    expect(cache).toContain('v=b39');
    await enterContinue(page);
    const opened = await page.evaluate(() => {
      const S = __SQ;
      const portals = (S.A.props || []).filter((p) => p.k === 'portal').length;
      const warps = (S.A.warps || []).map((w) => w.to);
      S.press('talk', true); S.step(2); S.press('talk', false); S.step(3);
      if (S.dlg) S.skipText();
      const first = S.dlg ? S.dlg.pages.map((p) => p.join(' ')).join(' ') : '';
      const who = S.dlg && S.dlg.who;
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
      if (S.dlg) S.skipText();
      const second = S.dlg ? S.dlg.pages.map((p) => p.join(' ')).join(' ') : '';
      return { area: S.A.id, portals, warps, first, who, second, flag: !!S.flags.dl_ronin };
    });
    expect(opened.area).toBe('dl_plans');
    expect(opened.portals).toBe(0);
    expect(opened.warps).toEqual(['dl_yard']);
    expect(opened.who).toBe('skippy');
    expect(opened.first).toMatch(/TAKE THE DOWNLOAD PLANS TO RONIN/);
    expect(opened.second).toMatch(/I WILL RIDE THEM TO RONIN/);
    expect(opened.flag).toBe(false);
    const mid = await page.evaluate(() => {
      const S = __SQ;
      S.press('talk', true); S.step(1); S.press('talk', false);
      for (let i = 0; i < 800; i++) {
        if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
        S.step(1);
        if (S.A.id === 'home' && S.G.fade > 0.28 && S.G.fade < 0.62 && S.G.fadeCol === '#ffffff') {
          S.G.saveT = 0;
          S.G.bannerT = 0;
          S.G.toastT = 0;
          S.P.inv = 0;
          S.step(0);
          const spike = S.npcs.find((n) => n.id === 'spike');
          return {
            area: S.A.id,
            name: S.A.name,
            fade: S.G.fade,
            col: S.G.fadeCol,
            spike: !!(spike && spike.vis !== false),
            sit: !!S.P.sit,
          };
        }
      }
      return { area: S.A.id, fade: S.G.fade, col: S.G.fadeCol, missed: true };
    });
    expect(mid.missed).toBeFalsy();
    expect(mid.area).toBe('home');
    expect(mid.name).toBe("SKIPPY'S PLACE");
    expect(mid.col).toBe('#ffffff');
    expect(mid.spike).toBe(false);
    expect(mid.sit).toBe(false);
    await page.screenshot({ path: `${ART}/b37-fade-home.png` });
    const home = await page.evaluate(() => {
      const S = __SQ;
      for (let i = 0; i < 240 && (S.G.fade > 0.02 || S.script); i++) S.step(1);
      S.G.saveT = 0;
      S.G.bannerT = 0;
      S.G.toastT = 0;
      S.P.inv = 0;
      S.step(0);
      const spike = S.npcs.find((n) => n.id === 'spike');
      const ink = S.worldInk().map((w) => w.t).join(' ');
      return {
        area: S.A.id,
        name: S.A.name,
        state: S.G.state,
        fade: S.G.fade,
        script: !!S.script,
        dlg: S.dlg ? S.dlg.raw : '',
        spike: !!(spike && spike.vis !== false && spike.alpha > 0.5),
        portals: (S.A.props || []).filter((p) => p.k === 'portal').length,
        warps: (S.A.warps || []).map((w) => w.to),
        coins: S.P.coins,
        shards: S.P.shards,
        sit: !!S.P.sit,
        ronin: !!S.flags.dl_ronin,
        left: !!S.flags.dl_left,
        ch9: !!S.flags.ch9_done,
        ink,
        boss: S.B && S.B.state,
      };
    });
    expect(home.area).toBe('home');
    expect(home.name).toBe("SKIPPY'S PLACE");
    expect(home.state).toBe('play');
    expect(home.fade).toBeLessThan(0.05);
    expect(home.script).toBe(false);
    expect(home.dlg).toBe('');
    expect(home.spike).toBe(false);
    expect(home.portals).toBe(0);
    expect(home.warps).toEqual(['desert']);
    expect(home.coins).toBe(77);
    expect(home.shards).toBe(7);
    expect(home.sit).toBe(false);
    expect(home.ronin).toBe(true);
    expect(home.left).toBe(true);
    expect(home.ch9).toBe(true);
    expect(home.ink).not.toMatch(/SIGN/);
    expect(home.boss === 'none' || home.boss === '' || home.boss == null).toBe(true);
    const keys = await page.evaluate(() => ({
      ros: localStorage.getItem('sq_save_ros_v1'),
      ram: localStorage.getItem('sq_save_ram_v1'),
      ds: localStorage.getItem('sq_save_ds_v1'),
      skippy: JSON.parse(localStorage.getItem('sq_save_v1')),
    }));
    expect(keys.ros).toBe(ROS_SAVE);
    expect(keys.ram).toBe(RAM_SAVE);
    expect(keys.ds).toBe(DS_SAVE);
    expect(keys.skippy.area).toBe('home');
    expect(keys.skippy.coins).toBe(77);
    expect(keys.skippy.shards).toBe(7);
    expect(keys.skippy.flags.dl_ronin).toBe(true);
    expect(keys.skippy.flags.ch9_done).toBe(true);
    await page.screenshot({ path: `${ART}/b37-home-clear.png` });
    await page.evaluate(() => {
      const S = __SQ;
      S.P.x = 136;
      S.P.y = 104;
      S.P.dir = 0;
      S.step(1);
    });
    const controls = await phone(page);
    expect(controls.magic.display).toBe('none');
    expect(controls.pause.text).toBe('PAUSE');
    expect(controls.map.text).toBe('MAP');
    expect(controls.pause.display).not.toBe('none');
    expect(controls.map.display).not.toBe('none');
    expect(controls.pause.left).toBeLessThan(controls.map.left);
    expect(controls.pause.top).toBeLessThan(120);
    expect(controls.swap.text).toBe('SWAP');
    expect(controls.action.text).toBe('ACTION');
    expect(controls.attack.text).toBe('ATTACK');
    expect(controls.item.text).toBe('ITEM');
    expect(controls.board.text).toBe('BOARD');
    expect(controls.swap.left).toBeGreaterThan(controls.map.left);
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a save that already has the handoff can leave DreamLand by talking to Spike', async ({ page }) => {
    test.setTimeout(90000);
    const errors = await boot(page, {
      skippy: skippySave('dl_plans', { dl_ronin: true }),
      ros: ROS_SAVE,
      ram: RAM_SAVE,
      ds: DS_SAVE,
    });
    await enterContinue(page);
    const stuck = await page.evaluate(() => {
      const S = __SQ;
      const spike = S.npcs.find((n) => n.id === 'spike');
      S.press('talk', true); S.step(2); S.press('talk', false); S.step(3);
      if (S.dlg) S.skipText();
      return {
        area: S.A.id,
        name: S.A.name,
        realm: S.A.realm,
        spike: !!(spike && spike.vis !== false),
        who: S.dlg && S.dlg.who,
        text: S.dlg ? S.dlg.pages.map((p) => p.join(' ')).join(' ') : '',
        portals: (S.A.props || []).filter((p) => p.k === 'portal').length,
        ronin: !!S.flags.dl_ronin,
      };
    });
    expect(stuck.area).toBe('dl_plans');
    expect(stuck.name).toBe('THE DOWNLOAD PLANS');
    expect(stuck.realm).toBe('dreamland');
    expect(stuck.spike).toBe(true);
    expect(stuck.who).toBe('spike');
    expect(stuck.text).toMatch(/RONIN GETS THE PLANS/);
    expect(stuck.portals).toBe(0);
    expect(stuck.ronin).toBe(true);
    await page.screenshot({ path: `${ART}/b37-stuck-talk.png` });
    const left = await page.evaluate(() => {
      const S = __SQ;
      S.press('talk', true); S.step(1); S.press('talk', false);
      for (let i = 0; i < 800 && (S.A.id !== 'home' || S.G.fade > 0.02 || S.script); i++) {
        if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
        S.step(1);
      }
      S.G.saveT = 0;
      S.G.bannerT = 0;
      S.G.toastT = 0;
      S.P.inv = 0;
      S.step(0);
      const spike = S.npcs.find((n) => n.id === 'spike');
      return {
        area: S.A.id,
        name: S.A.name,
        fade: S.G.fade,
        spike: !!(spike && spike.vis !== false && spike.alpha > 0.5),
        portals: (S.A.props || []).filter((p) => p.k === 'portal').length,
        warps: (S.A.warps || []).map((w) => w.to),
        coins: S.P.coins,
        shards: S.P.shards,
        dlg: S.dlg ? S.dlg.raw : '',
        state: S.G.state,
      };
    });
    expect(left.area).toBe('home');
    expect(left.name).toBe("SKIPPY'S PLACE");
    expect(left.fade).toBeLessThan(0.05);
    expect(left.spike).toBe(false);
    expect(left.portals).toBe(0);
    expect(left.warps).toEqual(['desert']);
    expect(left.coins).toBe(77);
    expect(left.shards).toBe(7);
    expect(left.dlg).toBe('');
    expect(left.state).toBe('play');
    const keys = await page.evaluate(() => ({
      ros: localStorage.getItem('sq_save_ros_v1'),
      ram: localStorage.getItem('sq_save_ram_v1'),
      ds: localStorage.getItem('sq_save_ds_v1'),
      skippy: JSON.parse(localStorage.getItem('sq_save_v1')),
    }));
    expect(keys.ros).toBe(ROS_SAVE);
    expect(keys.ram).toBe(RAM_SAVE);
    expect(keys.ds).toBe(DS_SAVE);
    expect(keys.skippy.area).toBe('home');
    expect(keys.skippy.flags.dl_ronin).toBe(true);
    const controls = await phone(page);
    expect(controls.magic.display).toBe('none');
    expect(controls.pause.text).toBe('PAUSE');
    expect(controls.map.text).toBe('MAP');
    expect(controls.board.text).toBe('BOARD');
    await page.screenshot({ path: `${ART}/b37-stuck-home.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('talking to Spike in the yard also fades a finished handoff home', async ({ page }) => {
    test.setTimeout(90000);
    const errors = await boot(page, {
      skippy: skippySave('dl_yard', { dl_ronin: true }),
    });
    await enterContinue(page);
    const yard = await page.evaluate(() => {
      const S = __SQ;
      const spike = S.npcs.find((n) => n.id === 'spike');
      S.P.x = spike.x - 18;
      S.P.y = spike.y + 4;
      S.P.dir = 3;
      S.press('talk', true); S.step(2); S.press('talk', false); S.step(3);
      if (S.dlg) S.skipText();
      const text = S.dlg ? S.dlg.pages.map((p) => p.join(' ')).join(' ') : '';
      S.press('talk', true); S.step(1); S.press('talk', false);
      for (let i = 0; i < 800 && (S.A.id !== 'home' || S.G.fade > 0.02 || S.script); i++) {
        if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
        S.step(1);
      }
      const homeSpike = S.npcs.find((n) => n.id === 'spike');
      return {
        from: 'dl_yard',
        text,
        area: S.A.id,
        spike: !!(homeSpike && homeSpike.vis !== false),
        portals: (S.A.props || []).filter((p) => p.k === 'portal').length,
      };
    });
    expect(yard.text).toMatch(/RONIN GETS THE PLANS/);
    expect(yard.area).toBe('home');
    expect(yard.spike).toBe(false);
    expect(yard.portals).toBe(0);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
