import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const ROOT = '/opt/cursor/artifacts';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });
fs.mkdirSync(ROOT, { recursive: true });

const SKIPPY_SAVE = JSON.stringify({
  z: 'bow', v: 1, area: 'home', x: 128, y: 128, dir: 0,
  hp: 6, maxHp: 6, pieces: 0, coins: 4, arrows: 0,
  items: { bow: true, baton: true }, keys: {}, bigKeys: {},
  flags: { woke: true }, party: [], shards: 0, time: 3,
  visited: { home: true },
  melee: 'baton', pri: 'bow', sec: '',
});
const OLD_ROS = JSON.stringify({
  z: 'lasso', v: 1, area: 'ros_pour', x: 160, y: 120, dir: 1,
  hp: 8, maxHp: 8, pieces: 0, coins: 3, arrows: 0,
  items: { blasters: true, lasso: true, board: true, dust: true, brand: true },
  keys: {}, bigKeys: {},
  flags: {
    lasso_got: true, brand_got: true, woke: true, dust_got: true,
    ros_lasers_default: true,
  },
  party: [], shards: 0, time: 40,
  visited: { ros_pour: true }, wanted: 2,
  wep: 'lasers', tool: 'lasers', act: 'lasers', pri: 'lasers', sec: 'lasso',
  melee: 'strike', boardId: 'dust',
});
const RAM_SAVE = JSON.stringify({
  z: 'hatchet', v: 1, area: 'ram_dock', x: 96, y: 128, dir: 3,
  hp: 8, maxHp: 8, pieces: 0, coins: 7, arrows: 0,
  items: { hatchet: true }, keys: {}, bigKeys: {},
  flags: { axe_got: true }, party: [], shards: 0, time: 10,
  visited: { ram_dock: true },
  melee: 'hatchet',
});
const DS_SAVE = JSON.stringify({
  z: 'blast', v: 1, area: 'ds_camp', x: 128, y: 112, dir: 0,
  hp: 10, maxHp: 10, pieces: 0, coins: 1, arrows: 0,
  items: { blast: true }, keys: {}, bigKeys: {},
  flags: { ds_board: true }, party: [], shards: 0, time: 10,
  visited: { ds_camp: true },
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
  await page.locator('#game').focus();
  return errors;
}

function shot(page, name) {
  return page.locator('#game').screenshot({ path: `${ART}/${name}` }).then(() => {
    fs.copyFileSync(`${ART}/${name}`, `${ROOT}/${name}`);
  });
}

async function tap(page, name) {
  await page.evaluate((button) => {
    __SQ.press(button, true);
    __SQ.step(2);
    __SQ.press(button, false);
    __SQ.step(2);
  }, name);
  await page.waitForTimeout(280);
}

async function openRos(page) {
  await page.evaluate(() => __SQ.step(8));
  await tap(page, 'down');
  await tap(page, 'attack');
  await tap(page, 'attack');
}

function green(shots) {
  return shots.filter((s) => s.kind === 'stun' && s.laser && s.col === '#3dff6a');
}

test.use({ viewport: { width: 944, height: 661 } });

test('a new ROS game puts the green lasers on ATTACK', async ({ page }) => {
  const errors = await boot(page);
  const cache = await page.evaluate(() => document.querySelector('script').textContent);
  expect(cache).toContain('window.__SQ_BUILD="b41"');
  expect(cache).toContain('v=b41');
  await openRos(page);
  const born = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 12 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    return {
      state: S.G.state,
      story: S.story(),
      area: S.A.id,
      hero: S.PID(),
      item: S.hands().item,
      melee: S.melee(),
      wep: S.gear().wep,
      blasters: !!S.P.items.blasters,
      lasso: !!S.P.items.lasso,
      board: S.board().has,
      hud: S.hud().map((b) => b.text).join(' '),
      kit: S.kit(),
      build: S.build(),
    };
  });
  expect(born.build).toBe('b41');
  expect(born.state).toBe('play');
  expect(born.story).toBe('ros');
  expect(born.area).toBe('ros_yard');
  expect(born.hero).toBe('ros');
  expect(born.melee).toBe('');
  expect(born.item).not.toBe('lasers');
  expect(born.wep).toBe('lasers');
  expect(born.blasters).toBe(true);
  expect(born.lasso).toBe(false);
  expect(born.board).toBe(true);
  expect(born.kit).not.toContain('strike');
  expect(born.kit).not.toContain('lasers');
  expect(born.hud).toMatch(/X LASERS/);
  expect(born.hud).not.toMatch(/X STUN|STUN STRIKE/);
  expect(born.hud).not.toMatch(/Z LASERS/);

  await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_ros_yard');
    S.warp('ros_yard', 4, 8, 3);
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.ents.forEach((e, i) => { e.x = 48; e.y = 48 + i * 4; e.dead = false; });
    S.P.x = 128;
    S.P.y = 108;
    S.P.dir = 3;
    S.P.atk = 0;
    S.P.roll = 0;
    S.P.inv = 0;
    S.P.cds = {};
    S.shots.length = 0;
    S.G.paused = false;
    S.G.bannerT = 0;
    S.G.toastT = 0;
    S.G.saveT = 0;
    S.setManual(true);
    S.step(6);
  });
  const armed = await page.evaluate(() => ({
    hud: __SQ.hud().map((b) => b.text).join(' '),
    melee: __SQ.melee(),
    item: __SQ.hands().item,
  }));
  expect(armed.hud).toMatch(/X LASERS/);
  expect(armed.hud).not.toMatch(/X STUN/);
  expect(armed.melee).toBe('');
  await shot(page, 'b40-ros-yard-hud.png');

  await page.keyboard.down('KeyX');
  await page.evaluate(() => __SQ.step(4));
  const fired = await page.evaluate(() => ({
    shots: __SQ.shots.map((s) => ({ kind: s.kind, col: s.col, laser: !!s.laser })),
    swing: __SQ.P.swingKind,
    melee: __SQ.melee(),
    item: __SQ.hands().item,
  }));
  expect(green(fired.shots).length).toBe(2);
  expect(fired.swing).not.toBe('melee');
  expect(fired.melee).toBe('');
  expect(fired.item).not.toBe('lasers');
  await shot(page, 'b40-ros-laser-fire.png');
  await page.keyboard.up('KeyX');

  const item = await page.evaluate(() => {
    const S = __SQ;
    S.P.items.lasso = true;
    S.P.items.bomb = true;
    S.flag('lasso_got');
    S.flag('bomb_got');
    S.P.tool = 'lasso';
    S.P.pri = 'lasso';
    S.P.sec = 'bomb';
    S.P.act = 'lasso';
    S.P.cds = {};
    S.shots.length = 0;
    S.press('item', true); S.step(2); S.press('item', false); S.step(2);
    const rope = {
      shots: S.shots.map((s) => s.kind),
      item: S.hands().item,
      toast: S.G.toast || '',
    };
    S.press('swap', true); S.step(2); S.press('swap', false); S.step(2);
    const swapped = S.hands().item;
    S.shots.length = 0;
    S.P.cds = {};
    S.press('item', true); S.step(2); S.press('item', false); S.step(2);
    const after = {
      item: S.hands().item,
      shots: S.shots.map((s) => s.kind),
      toast: S.G.toast || '',
      board: S.board().has,
      melee: S.melee(),
    };
    S.P.cds = {};
    S.shots.length = 0;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
    after.attack = S.shots.filter((s) => s.kind === 'stun' && s.laser && s.col === '#3dff6a').length;
    return { rope, swapped, after };
  });
  expect(item.rope.item).toBe('lasso');
  expect(item.rope.shots.filter((k) => k === 'stun').length).toBe(0);
  expect(item.swapped).toBe('bomb');
  expect(item.after.item).toBe('bomb');
  expect(item.after.shots.filter((k) => k === 'stun').length).toBe(0);
  expect(item.after.shots).toContain('bomb');
  expect(item.after.board).toBe(true);
  expect(item.after.melee).toBe('');
  expect(item.after.attack).toBe(2);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('an older ROS save moves the lasers onto ATTACK and keeps the rope and board', async ({ page }) => {
  const errors = await boot(page, { skippy: SKIPPY_SAVE, ros: OLD_ROS, ram: RAM_SAVE, ds: DS_SAVE });
  await openRos(page);
  const back = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.G.paused = false;
    const area = S.A.id;
    const hands = S.hands();
    S.save();
    const savedRos = localStorage.getItem('sq_save_ros_v1');
    S.flag('oe_ros_yard');
    S.warp('ros_yard', 5, 8, 3);
    for (let i = 0; i < 24 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.ents.forEach((e) => { e.x = 24; e.y = 24; });
    S.P.x = 96;
    S.P.y = 112;
    S.P.dir = 3;
    S.P.atk = 0;
    S.P.roll = 0;
    S.P.cds = {};
    S.shots.length = 0;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.press('item', true); S.step(2); S.press('item', false); S.step(2);
    const itemShots = S.shots.filter((s) => s.kind === 'stun').length;
    S.shots.length = 0;
    S.P.cds = {};
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(3);
    const shots = S.shots.map((s) => ({ kind: s.kind, col: s.col, laser: !!s.laser }));
    const keys = {
      skippy: localStorage.getItem('sq_save_v1'),
      ros: localStorage.getItem('sq_save_ros_v1'),
      ram: localStorage.getItem('sq_save_ram_v1'),
      ds: localStorage.getItem('sq_save_ds_v1'),
    };
    return {
      area,
      hands,
      melee: S.melee(),
      lasso: !!S.P.items.lasso,
      blasters: !!S.P.items.blasters,
      kit: S.kit(),
      board: S.board().has,
      boardId: S.gear().board,
      wanted: S.wanted(),
      itemShots,
      shots,
      swing: S.P.swingKind,
      keys,
      savedRos,
    };
  });
  expect(back.area).toBe('ros_pour');
  expect(back.hands.item).toBe('lasso');
  expect(back.hands.melee).toBe('');
  expect(back.melee).toBe('');
  expect(back.lasso).toBe(true);
  expect(back.blasters).toBe(true);
  expect(back.kit).toEqual(expect.arrayContaining(['lasso', 'bomb']));
  expect(back.kit).not.toContain('strike');
  expect(back.kit).not.toContain('lasers');
  expect(back.kit).not.toContain('brand');
  expect(back.board).toBe(true);
  expect(back.boardId).toBe('dust');
  expect(back.wanted).toBe(2);
  expect(back.itemShots).toBe(0);
  expect(green(back.shots).length).toBeGreaterThanOrEqual(2);
  expect(back.swing).not.toBe('melee');
  expect(back.keys.skippy).toBe(SKIPPY_SAVE);
  expect(back.keys.ram).toBe(RAM_SAVE);
  expect(back.keys.ds).toBe(DS_SAVE);
  const saved = JSON.parse(back.savedRos);
  expect(saved.items.lasso).toBe(true);
  expect(saved.items.blasters).toBe(true);
  expect(saved.tool).toBe('lasso');
  expect(saved.melee).not.toBe('strike');
  expect(saved.boardId).toBe('dust');
  expect(saved.flags.ros_lasers_default).toBe(true);
  expect(saved.flags.ros_attack_lasers).toBe(true);
  expect(saved.flags.lasso_got).toBe(true);
  expect(saved.flags.dust_got).toBe(true);

  const skippy = await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'skippy';
    S.G.paused = false;
    S.P.items = { baton: true, bow: true };
    S.P.arrows = 3;
    S.P.melee = 'baton';
    S.P.wep = 'baton';
    S.P.pri = 'bow';
    S.P.sec = '';
    S.P.tool = 'bow';
    S.P.cds = {};
    S.flag('oe_home');
    S.warp('home', 8, 8, 3);
    for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.shots.length = 0;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
    return {
      melee: S.melee(),
      swing: S.P.swingKind,
      shots: S.shots.map((s) => s.kind),
      item: S.hands().item,
    };
  });
  expect(skippy.melee).toBe('baton');
  expect(skippy.swing).toBe('melee');
  expect(skippy.shots.join(',')).not.toMatch(/stun/);
  expect(skippy.item).not.toBe('baton');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the yard intro names the spare board', async ({ page }) => {
  const errors = await boot(page);
  await openRos(page);
  const line = await page.evaluate(() => {
    const S = __SQ;
    let raw = '';
    for (let i = 0; i < 8 && (S.script || S.dlg || !raw); i++) {
      if (S.dlg && /SPARE/.test(S.dlg.raw)) {
        raw = S.dlg.raw;
        break;
      }
      S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
      if (S.dlg) raw = S.dlg.raw;
    }
    if (S.dlg) S.skipText();
    S.G.bannerT = 0;
    S.G.toastT = 0;
    S.G.saveT = 0;
    S.step(1);
    return S.dlg ? S.dlg.raw : raw;
  });
  expect(line).toMatch(/IMPOUNDED/);
  expect(line).toMatch(/SPARE/);
  expect(line).not.toMatch(/STAR BRAND/);
  await shot(page, 'b40-ros-spare-board.png');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a thrown bomb arcs, and the canyon hint stays a single steady line', async ({ page }) => {
  const errors = await boot(page);
  const bomb = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ros';
    S.P.items = { blasters: true, bomb: true, lasso: true };
    S.flag('bomb_got');
    S.flag('lasso_got');
    S.flag('oe_ros_yard');
    S.P.tool = 'bomb';
    S.P.pri = 'bomb';
    S.P.sec = '';
    S.P.melee = '';
    S.P.cds = {};
    S.warp('ros_yard', 5, 7, 3);
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.ents.forEach((e) => { e.x = 40; e.y = 40; });
    S.P.x = 96;
    S.P.y = 100;
    S.P.dir = 3;
    S.P.inv = 0;
    S.P.atk = 0;
    S.shots.length = 0;
    S.G.bannerT = 0;
    S.G.toastT = 0;
    S.G.saveT = 0;
    S.setManual(true);
    S.press('item', true); S.step(2); S.press('item', false); S.step(6);
    const shot = S.shots.find((s) => s.kind === 'bomb');
    return {
      has: !!shot,
      vy: shot && shot.vy,
      item: S.hands().item,
      melee: S.melee(),
      hud: S.hud().map((b) => b.text).join(' '),
    };
  });
  expect(bomb.has).toBe(true);
  expect(bomb.vy).toBeLessThan(0);
  expect(bomb.item).toBe('bomb');
  expect(bomb.melee).toBe('');
  expect(bomb.hud).toMatch(/X LASERS/);
  expect(bomb.hud).toMatch(/Z BOMB/);
  expect(bomb.hud).not.toMatch(/STAR BRAND|X STUN/);
  await shot(page, 'b40-ros-bomb.png');

  const hint = await page.evaluate(() => {
    const S = __SQ;
    S.flag('yard_clear');
    S.flag('accused_done');
    S.flag('lasso_got');
    S.flag('dust_got', false);
    S.P.items.lasso = true;
    S.flag('oe_ros_station');
    S.warp('ros_station', 10, 8, 3);
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.G.paused = false;
    S.G.bannerT = 0;
    S.G.toastT = 0;
    S.G.saveT = 0;
    const frames = [];
    for (let i = 0; i < 12; i++) {
      S.step(2);
      const ink = S.worldInk().map((w) => w.t);
      frames.push({
        obj: S.objective(),
        ink,
        dupes: ink.filter((t, n) => ink.indexOf(t) !== n),
      });
    }
    S.P.x = 18 * 16;
    S.P.y = 4 * 16 + 20;
    S.P.dir = 1;
    S.press('talk', true); S.step(2); S.press('talk', false); S.step(2);
    if (S.dlg) S.skipText();
    S.step(1);
    return { frames, sign: S.dlg ? S.dlg.raw : '', obj: S.objective() };
  });
  const objs = new Set(hint.frames.map((f) => f.obj));
  expect(objs.size).toBe(1);
  expect(hint.obj).toMatch(/CANYON EAST/);
  expect(hint.obj).toMatch(/WANTED STARS UNDER FOUR/);
  expect(hint.obj).not.toMatch(/UNDER FOUR STARS$/);
  expect(hint.sign).toMatch(/RIDE THE CANYON TO THE EAST/);
  expect(hint.sign).toMatch(/DUST DEVIL/);
  expect(hint.frames.every((f) => f.dupes.length === 0)).toBe(true);
  expect(hint.frames.every((f) => f.ink.join(' ').indexOf('CANYON') < 0)).toBe(true);
  expect(hint.frames.every((f) => f.ink.join(' ').indexOf('SIGN') < 0)).toBe(true);
  await shot(page, 'b40-ros-canyon-hint.png');
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('the landscape ATTACK button fires the twin green lasers', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'ros';
      S.G.paused = false;
      S.P.items = { blasters: true, lasso: true };
      S.P.melee = 'strike';
      S.P.wep = 'lasers';
      S.P.tool = 'lasers';
      S.P.act = 'lasers';
      S.P.pri = 'lasers';
      S.P.sec = 'lasso';
      S.P.cds = {};
      S.flag('oe_ros_desert');
      S.flag('lasso_got');
      S.warp('ros_desert', 8, 8, 3);
      for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      S.ents.forEach((e) => { e.dead = true; e.x = 16; e.y = 16; });
      S.P.x = 128;
      S.P.y = 112;
      S.P.dir = 3;
      S.P.atk = 0;
      S.shots.length = 0;
      S.G.bannerT = 0;
      S.G.toastT = 0;
      S.G.saveT = 0;
      S.setManual(true);
      S.step(2);
    });
    const layout = await page.evaluate(() => {
      const box = (name) => {
        const el = document.querySelector('[data-b="' + name + '"]') || document.getElementById(name);
        const r = el.getBoundingClientRect();
        return {
          label: (el.textContent || '').trim(),
          x: r.x, y: r.y, w: r.width, h: r.height,
        };
      };
      return {
        land: document.documentElement.dataset.land,
        pause: box('map'),
        map: box('worldmap'),
        stick: box('stick'),
        swap: box('swap'),
        talk: box('talk'),
        attack: box('attack'),
        item: box('item'),
        board: box('board'),
        hud: __SQ.hud().map((b) => b.text).join(' '),
        melee: __SQ.melee(),
        itemId: __SQ.hands().item,
      };
    });
    expect(layout.land).toBe('1');
    expect(layout.pause.label).toBe('PAUSE');
    expect(layout.map.label).toBe('MAP');
    expect(layout.pause.x).toBeLessThan(120);
    expect(layout.map.x).toBeLessThan(220);
    expect(layout.pause.y).toBeLessThan(40);
    expect(layout.map.y).toBeLessThan(40);
    expect(layout.stick.x).toBeLessThan(200);
    expect(layout.attack.label).toBe('ATTACK');
    expect(layout.item.label).toBe('ITEM');
    expect(layout.swap.label).toBe('SWAP');
    expect(layout.talk.label).toBe('TALK');
    expect(layout.board.label).toBe('BOARD');
    expect(layout.attack.w).toBeGreaterThan(layout.item.w);
    expect(layout.attack.x).toBeGreaterThan(500);
    expect(layout.swap.x).toBeGreaterThan(500);
    expect(layout.hud).toMatch(/X LASERS/);
    expect(layout.hud).not.toMatch(/X STUN/);
    expect(layout.melee).toBe('');
    expect(layout.itemId).toBe('lasso');
    await page.locator('[data-b="attack"]').tap();
    await page.evaluate(() => __SQ.step(4));
    const hit = await page.evaluate(() => ({
      shots: __SQ.shots.map((s) => ({ kind: s.kind, col: s.col, laser: !!s.laser })),
      item: __SQ.hands().item,
      melee: __SQ.melee(),
      swing: __SQ.P.swingKind,
    }));
    expect(hit.item).toBe('lasso');
    expect(hit.melee).toBe('');
    expect(hit.swing).not.toBe('melee');
    expect(green(hit.shots).length).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: `${ART}/b40-ros-laser-phone.png` });
    fs.copyFileSync(`${ART}/b40-ros-laser-phone.png`, `${ROOT}/b40-ros-laser-phone.png`);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
