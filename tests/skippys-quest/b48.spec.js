import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts';
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
const CREDITS_SAVE = JSON.stringify({
  z: 'bow', v: 1, area: 'throne', x: 160, y: 140, dir: 1,
  hp: 10, maxHp: 10, pieces: 2, coins: 77, arrows: 5,
  items: { baton: true, bow: true, board: true }, keys: {}, bigKeys: {},
  flags: { woke: true, ch9_done: true, hardened: true, oe_home: true, oe_throne: true, santt_met: true, space_board: true },
  party: [], shards: 7, time: 1200,
  visited: { throne: true, home: true, desert: true },
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
  await page.evaluate(() => { __SQ.setManual(true); __SQ.step(4); });
  return errors;
}

function shot(page, name) {
  return page.screenshot({ path: `${ART}/${name}` });
}

test('bed rest opens DreamLand, NOT YET waits, and an old credits save stays awake', async ({ page }) => {
  test.setTimeout(120000);
  const errors = await boot(page, {
    skippy: CREDITS_SAVE,
    ros: ROS_SAVE,
    ram: RAM_SAVE,
    ds: DS_SAVE,
  });
  expect(await page.evaluate(() => __SQ.build())).toBe('b50');
  const cache = await page.evaluate(() => document.querySelector('script').textContent);
  expect(cache).toContain('window.__SQ_BUILD="b50"');
  expect(cache).toContain('v=b50');
  expect(await page.locator('meta[name="robots"]').count()).toBe(1);
  expect(await page.locator('meta[name="robots"]').first().getAttribute('content')).toBe('noindex,nofollow');

  await page.evaluate(() => {
    const ok = __SQ.loadChapter('skippy');
    if (!ok) throw new Error('continue failed');
    for (let i = 0; i < 30; i++) __SQ.step(2);
  });
  const landed = await page.evaluate(() => {
    const S = __SQ;
    const lines = [];
    for (let i = 0; i < 8; i++) {
      for (let n = 0; n < 16 && !(S.dlg && S.dlg.raw); n++) S.step(2);
      if (!S.dlg) break;
      S.skipText();
      lines.push(S.dlg.raw);
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    const spike = S.npcs.find((n) => n.id === 'spike');
    return {
      area: S.A.id,
      lines: lines.join(' | '),
      spike: !!(spike && spike.vis !== false),
      called: !!S.flags.dl_called,
    };
  });
  expect(landed.area).toBe('hub');
  expect(landed.lines).toMatch(/GET SOME REST/);
  expect(landed.lines).not.toMatch(/DREAMLAND|HURRY/);
  expect(landed.spike).toBe(false);
  expect(landed.called).toBe(false);

  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(2);
    }
    S.G.paused = false;
    S.flag('oe_home');
    S.warp('home', 8.2, 8.4, 3);
    S.step(6);
  });
  const quiet = await page.evaluate(() => ({
    area: __SQ.A.id,
    choice: __SQ.G.choice && __SQ.G.choice.id,
    spike: __SQ.npcs.some((n) => n.id === 'spike'),
    ink: __SQ.worldInk().map((w) => w.t).join(' '),
  }));
  expect(quiet.area).toBe('home');
  expect(quiet.choice).toBeFalsy();
  expect(quiet.spike).toBe(false);
  expect(quiet.ink).not.toMatch(/REST|SPIKE|DREAM/);

  await page.evaluate(() => {
    const S = __SQ;
    S.P.x = 15.5 * 16;
    S.P.y = 3.7 * 16;
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.G.toastT = 0;
    for (let i = 0; i < 20 && !(S.G.choice && S.G.choice.id === 'home_rest'); i++) S.step(2);
    S.step(1);
  });
  const prompt = await page.evaluate(() => {
    const ink = __SQ.choiceInk();
    return {
      id: __SQ.G.choice && __SQ.G.choice.id,
      sel: __SQ.G.choice && __SQ.G.choice.sel,
      text: ink ? ink.lines.map((l) => l.text).join(' | ') : '',
      y: ink ? ink.box.y : -1,
      h: ink ? ink.box.h : 0,
      world: __SQ.worldInk().map((w) => w.t).join(' '),
    };
  });
  expect(prompt.id).toBe('home_rest');
  expect(prompt.text).toMatch(/GET SOME REST\?/);
  expect(prompt.text).toMatch(/> REST/);
  expect(prompt.text).toMatch(/NOT YET/);
  expect(prompt.y).toBeGreaterThan(140);
  expect(prompt.y + prompt.h).toBeLessThanOrEqual(224);
  expect(prompt.world).not.toMatch(/GET SOME REST|NOT YET/);
  await shot(page, 'house_rest_prompt.png');

  await page.evaluate(() => {
    const S = __SQ;
    S.G.choice.sel = 1;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(4);
  });
  const declined = await page.evaluate(() => ({
    area: __SQ.A.id,
    choice: __SQ.G.choice && __SQ.G.choice.id,
    dlg: __SQ.dlg ? __SQ.dlg.raw : '',
    called: !!__SQ.flags.dl_called,
    spike: __SQ.npcs.some((n) => n.id === 'spike'),
  }));
  expect(declined.area).toBe('home');
  expect(declined.choice).toBeFalsy();
  expect(declined.dlg).toBe('');
  expect(declined.called).toBe(false);
  expect(declined.spike).toBe(false);

  await page.evaluate(() => {
    const S = __SQ;
    S.P.x = 8 * 16;
    S.P.y = 8 * 16;
    S.step(4);
    S.P.x = 15.5 * 16;
    S.P.y = 3.7 * 16;
    for (let i = 0; i < 20 && !(S.G.choice && S.G.choice.id === 'home_rest'); i++) S.step(2);
    S.G.choice.sel = 0;
    S.press('attack', true); S.step(1); S.press('attack', false);
    for (let i = 0; i < 90 && !(S.A.id === 'dl_yard' && S.dlg && /HURRY/.test(S.dlg.raw || '')); i++) {
      if (S.dlg && !/HURRY/.test(S.dlg.raw || '')) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false);
      }
      S.step(4);
    }
    if (S.dlg) S.skipText();
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.G.toastT = 0;
    S.step(1);
  });
  const dream = await page.evaluate(() => {
    const S = __SQ;
    const spike = S.npcs.find((n) => n.id === 'spike');
    return {
      area: S.A.id,
      name: S.A.name,
      realm: S.A.realm,
      line: S.dlg ? S.dlg.raw : '',
      who: S.dlg && S.dlg.who,
      spike: !!(spike && spike.vis !== false && spike.alpha > 0.5),
      portals: (S.A.props || []).filter((p) => p.k === 'portal').length,
    };
  });
  expect(dream.area).toBe('dl_yard');
  expect(dream.name).toBe('DREAMLAND');
  expect(dream.realm).toBe('dreamland');
  expect(dream.who).toBe('spike');
  expect(dream.line).toMatch(/HURRY, RETURN TO DREAMLAND/);
  expect(dream.spike).toBe(true);
  expect(dream.portals).toBe(0);
  await shot(page, 'spike_appears_dream.png');

  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 12; i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(2);
    }
    S.ents.forEach((e, i) => { e.x = (3 + i) * 16; e.y = 11 * 16; e.stun = 9; });
    S.P.x = 14.5 * 16;
    S.P.y = 8.5 * 16;
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.step(2);
  });
  await shot(page, 'dreamland_room.png');

  await page.evaluate(() => {
    const S = __SQ;
    S.P.x = 26.5 * 16;
    S.P.y = 12.5 * 16;
    for (let i = 0; i < 30 && S.A.id !== 'dl_plans'; i++) S.step(4);
    for (let i = 0; i < 8 && (S.script || S.dlg || S.G.trans); i++) S.step(3);
    S.P.x = 72;
    S.P.y = 90;
    S.P.dir = 1;
    S.press('talk', true); S.step(2); S.press('talk', false); S.step(3);
    if (S.dlg) S.skipText();
  });
  const hand = await page.evaluate(() => ({
    area: __SQ.A.id,
    who: __SQ.dlg && __SQ.dlg.who,
    text: __SQ.dlg ? __SQ.dlg.pages.map((p) => p.join(' ')).join(' ') : '',
  }));
  expect(hand.area).toBe('dl_plans');
  expect(hand.who).toBe('skippy');
  expect(hand.text).toMatch(/TAKE THE DOWNLOAD PLANS TO RONIN/);
  expect(hand.text).toMatch(/FIRE SEAL/);

  const mid = await page.evaluate(() => {
    const S = __SQ;
    S.press('talk', true); S.step(1); S.press('talk', false);
    for (let i = 0; i < 800; i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(1);
      if (S.A.id === 'home' && S.G.fade > 0.28 && S.G.fade < 0.7 && S.G.fadeCol === '#ffffff') {
        S.G.saveT = 0;
        S.G.bannerT = 0;
        S.step(0);
        return { area: S.A.id, fade: S.G.fade, col: S.G.fadeCol, spike: S.npcs.some((n) => n.id === 'spike' && n.vis !== false) };
      }
    }
    return { area: S.A.id, missed: true, fade: S.G.fade };
  });
  expect(mid.missed).toBeFalsy();
  expect(mid.area).toBe('home');
  expect(mid.col).toBe('#ffffff');
  expect(mid.spike).toBe(false);
  await shot(page, 'fade_home.png');

  const home = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 240 && (S.G.fade > 0.02 || S.script); i++) S.step(1);
    S.save();
    return {
      area: S.A.id,
      ronin: !!S.flags.dl_ronin,
      done: !!S.flags.dl_done,
      spike: S.npcs.some((n) => n.id === 'spike' && n.vis !== false),
    };
  });
  expect(home.area).toBe('home');
  expect(home.ronin).toBe(true);
  expect(home.done).toBe(true);
  expect(home.spike).toBe(false);

  const listed = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'stories';
    S.G.menu = 2;
    S.G.st = 1;
    S.step(2);
    const row = S.chapters().find((c) => c.id === 'spike');
    return row;
  });
  expect(listed.open).toBe(true);
  expect(listed.status).toBe('COMPLETE');
  expect(listed.sub).toBe('COMPLETE');

  await page.waitForTimeout(400);
  const replay = await page.evaluate(() => {
    const S = __SQ;
    S.G.menu = 2;
    S.G.st = 1;
    S.press('attack', true); S.step(3); S.press('attack', false);
    for (let i = 0; i < 40 && !(S.A.id === 'dl_yard' && S.dlg); i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(3);
    }
    if (S.dlg) S.skipText();
    return {
      area: S.A.id,
      story: S.story(),
      who: S.dlg && S.dlg.who,
      line: S.dlg ? S.dlg.raw : '',
      spike: S.npcs.some((n) => n.id === 'spike' && n.vis !== false),
    };
  });
  expect(replay.area).toBe('dl_yard');
  expect(replay.story).toBe('skippy');
  expect(replay.who).toBe('spike');
  expect(replay.line).toMatch(/HURRY, RETURN TO DREAMLAND/);
  expect(replay.spike).toBe(true);

  const keys = await page.evaluate(() => ({
    ros: localStorage.getItem('sq_save_ros_v1'),
    ram: localStorage.getItem('sq_save_ram_v1'),
    ds: localStorage.getItem('sq_save_ds_v1'),
    skippy: JSON.parse(localStorage.getItem('sq_save_v1')),
  }));
  expect(keys.ros).toBe(ROS_SAVE);
  expect(keys.ram).toBe(RAM_SAVE);
  expect(keys.ds).toBe(DS_SAVE);
  expect(keys.skippy.flags.ch9_done).toBe(true);
  expect(keys.skippy.coins).toBe(77);
  expect(keys.skippy.shards).toBe(7);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone rest prompt keeps sideways buttons in the gutters', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('844x390 and 390x844', async ({ page }) => {
    test.setTimeout(90000);
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    for (const [w, h, land] of [[844, 390, true], [390, 844, false]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.evaluate(() => {
        const S = __SQ;
        S.G.state = 'play';
        S.G.story = 'skippy';
        S.G.paused = false;
        S.G.choice = null;
        S.flag('woke');
        S.flag('oe_home');
        S.flag('ch9_done');
        S.flag('dl_called', false);
        S.flag('dl_ronin', false);
        S.flag('dl_left', false);
        S.warp('home', 8.2, 8.4, 3);
        for (let i = 0; i < 6 && (S.script || S.dlg || S.G.choice); i++) S.step(2);
        S.P.x = 8 * 16;
        S.P.y = 8 * 16;
        S.step(3);
        S.P.x = 15.5 * 16;
        S.P.y = 3.7 * 16;
        S.G.bannerT = 0;
        S.G.saveT = 0;
        S.G.toastT = 0;
        for (let i = 0; i < 24 && !(S.G.choice && S.G.choice.id === 'home_rest'); i++) S.step(2);
        S.step(2);
      });
      await page.waitForTimeout(200);
      const play = await page.evaluate(() => {
        const S = __SQ;
        if (S.G.choice && S.G.choice.id === 'home_rest') {
          S.G.choice.sel = 1;
          S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
        }
        S.P.x = 8 * 16;
        S.P.y = 8 * 16;
        S.step(3);
        const game = document.querySelector('#game').getBoundingClientRect();
        const box = (sel) => {
          const el = document.querySelector(sel);
          if (!el) return null;
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, r: r.right, b: r.bottom, on: getComputedStyle(el).display !== 'none' && r.width > 2 };
        };
        return {
          game: { x: game.x, y: game.y, r: game.right, b: game.bottom },
          attack: box('[data-b="attack"]'),
          item: box('[data-b="item"]'),
          stick: box('#stick'),
        };
      });
      for (const key of ['attack', 'item', 'stick']) {
        const b = play[key];
        expect(b && b.on, `${w}x${h} ${key}`).toBe(true);
        const over = b.x < play.game.r - 1 && b.r > play.game.x + 1 && b.y < play.game.b - 1 && b.b > play.game.y + 1;
        expect(over, `${w}x${h} ${key} covers the picture`).toBe(false);
      }
      if (land) {
        expect(play.attack.x, 'attack gutter').toBeGreaterThanOrEqual(play.game.r - 1);
        expect(play.item.x, 'item gutter').toBeGreaterThanOrEqual(play.game.r - 1);
        expect(play.stick.r, 'stick gutter').toBeLessThanOrEqual(play.game.x + 1);
      }
      await page.evaluate(() => {
        const S = __SQ;
        S.P.x = 15.5 * 16;
        S.P.y = 3.7 * 16;
        S.G.bannerT = 0;
        S.G.saveT = 0;
        S.G.toastT = 0;
        for (let i = 0; i < 24 && !(S.G.choice && S.G.choice.id === 'home_rest'); i++) S.step(2);
        S.step(2);
      });
      await page.waitForTimeout(200);
      const lay = await page.evaluate(() => {
        const game = document.querySelector('#game').getBoundingClientRect();
        const ink = __SQ.choiceInk();
        const rows = [...document.querySelectorAll('#srml-rows button')].map((el) => {
          const r = el.getBoundingClientRect();
          return { t: (el.textContent || '').trim(), x: r.x, y: r.y, r: r.right, b: r.bottom, on: r.width > 2 };
        });
        const backEl = document.querySelector('[data-b="back"]');
        const br = backEl ? backEl.getBoundingClientRect() : null;
        return {
          game: { x: game.x, y: game.y, r: game.right, b: game.bottom, w: game.width, h: game.height },
          rows,
          back: br && { x: br.x, y: br.y, r: br.right, b: br.bottom, on: getComputedStyle(backEl).display !== 'none' },
          id: __SQ.G.choice && __SQ.G.choice.id,
          text: ink ? ink.lines.map((l) => l.text).join(' ') : '',
          box: ink && ink.box,
          vw: innerWidth,
          vh: innerHeight,
        };
      });
      expect(lay.id, `${w}x${h}`).toBe('home_rest');
      expect(lay.text, `${w}x${h}`).toMatch(/GET SOME REST/);
      expect(lay.text, `${w}x${h}`).toMatch(/NOT YET/);
      expect(lay.box.y, `${w}x${h} strip`).toBeGreaterThanOrEqual(0);
      expect(lay.box.y + lay.box.h, `${w}x${h} strip`).toBeLessThanOrEqual(224);
      const labels = lay.rows.map((r) => r.t);
      expect(labels.join(' '), `${w}x${h} rows`).toMatch(/REST/);
      expect(labels.join(' '), `${w}x${h} rows`).toMatch(/NOT YET/);
      for (const b of lay.rows) {
        const over = b.x < lay.game.r - 1 && b.r > lay.game.x + 1 && b.y < lay.game.b - 1 && b.b > lay.game.y + 1;
        expect(over, `${w}x${h} ${b.t} covers the picture`).toBe(false);
        expect(b.x, `${b.t} on screen`).toBeGreaterThanOrEqual(-1);
        expect(b.b, `${b.t} on screen`).toBeLessThanOrEqual(h + 1);
        if (land) expect(b.x, `${b.t} gutter`).toBeGreaterThanOrEqual(lay.game.r - 1);
      }
      if (lay.back && lay.back.on && land) expect(lay.back.x, 'back gutter').toBeGreaterThanOrEqual(lay.game.r - 1);
      if (land) await shot(page, 'phone_landscape_prompt.png');
      else await shot(page, 'phone_portrait_prompt.png');
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
