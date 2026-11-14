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
  items: { bow: true }, keys: {}, bigKeys: {},
  flags: { woke: true }, party: [], shards: 0, time: 3,
  visited: { home: true },
});
const OLD_ROS = JSON.stringify({
  z: 'lasso', v: 1, area: 'ros_pour', x: 160, y: 120, dir: 1,
  hp: 8, maxHp: 8, pieces: 0, coins: 3, arrows: 0,
  items: { blasters: true, lasso: true, board: true }, keys: {}, bigKeys: {},
  flags: { lasso_got: true, woke: true, dust_got: true }, party: [], shards: 0, time: 40,
  visited: { ros_pour: true }, wanted: 1,
  wep: 'lasers', tool: 'lasso', act: '', pri: 'lasers', sec: 'lasso',
});
const RAM_SAVE = JSON.stringify({
  z: 'hatchet', v: 1, area: 'ram_dock', x: 96, y: 128, dir: 3,
  hp: 8, maxHp: 8, pieces: 0, coins: 7, arrows: 0,
  items: { hatchet: true }, keys: {}, bigKeys: {},
  flags: { axe_got: true }, party: [], shards: 0, time: 10,
  visited: { ram_dock: true },
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
  await page.waitForTimeout(380);
}

async function openRos(page) {
  await page.evaluate(() => {
    if (localStorage.getItem('sq_save_ros_v1')) return;
    const raw = localStorage.getItem('sq_save_v1');
    const save = raw ? JSON.parse(raw) : {
      v: 1, area: 'home', x: 160, y: 160, dir: 0, hp: 6, maxHp: 6,
      items: {}, keys: {}, bigKeys: {}, party: [], visited: {}, flags: {},
    };
    save.flags = Object.assign({}, save.flags, { ros_home_end: true });
    localStorage.setItem('sq_save_v1', JSON.stringify(save));
  });
  await page.evaluate(() => __SQ.step(8));
  await tap(page, 'down');
  await tap(page, 'attack');
  await tap(page, 'attack');
}

test('ROS starts with lasers on ATTACK, and ITEM does not fire them', async ({ page }) => {
  const errors = await boot(page);
  const cache = await page.evaluate(() => document.querySelector('script').textContent);
  expect(cache).toContain('window.__SQ_BUILD="b43"');
  expect(cache).toContain('v=b43');

  await openRos(page);
  const born = await page.evaluate(() => {
    const S = __SQ;
    return {
      state: S.G.state,
      story: S.story(),
      area: S.A.id,
      hero: S.PID(),
      item: S.hands().item,
      melee: S.melee(),
      pri: S.slots().pri,
      sec: S.slots().sec,
      tool: S.P.tool,
      wep: S.gear().wep,
      blasters: !!S.P.items.blasters,
      board: S.board().has,
      roll: document.documentElement.dataset.rolllabel,
      hud: S.hud().map((b) => b.text).join(' '),
      build: S.build(),
    };
  });
  expect(born.build).toBe('b43');
  expect(born.state).toBe('play');
  expect(born.area).toBe('ros_yard');
  expect(born.hero).toBe('ros');
  expect(born.item).toBe('');
  expect(born.melee).toBe('');
  expect(born.tool).toBe('');
  expect(born.wep).toBe('lasers');
  expect(born.pri).toBe('');
  expect(born.sec).not.toBe('lasso');
  expect(born.blasters).toBe(true);
  expect(born.board).toBe(true);
  expect(born.roll).toBe('BOARD');
  expect(born.hud).toMatch(/X LASERS/);
  expect(born.hud).not.toMatch(/X STUN/);
  expect(born.hud).not.toMatch(/Z LASERS/);

  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 12 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.G.paused = true;
    S.G.rosPage = 2;
    S.step(1);
  });
  const gear = await page.evaluate(() => (window.__SQ_TOUCH.rows || []).map((r) => r.label).join(' '));
  expect(gear).toContain('GREEN LASERS');
  expect(gear).not.toMatch(/STUN/);
  expect(gear).toMatch(/GREEN LASERS\s+X/);
  expect(gear).not.toMatch(/GREEN LASERS\s+Z/);

  await page.evaluate(() => {
    const S = __SQ;
    S.G.paused = false;
    S.flag('oe_ros_desert');
    S.warp('ros_desert', 8, 8, 3);
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.ents.forEach((e) => { e.dead = true; });
    S.P.x = 128;
    S.P.y = 112;
    S.P.dir = 3;
    S.P.atk = 0;
    S.P.roll = 0;
    S.P.cds = {};
    S.shots.length = 0;
    S.G.bannerT = 0;
    S.G.toastT = 0;
    S.G.saveT = 0;
    S.G.paused = false;
    S.setManual(true);
    S.step(2);
  });
  const armed = await page.evaluate(() => ({
    item: __SQ.hands().item,
    melee: __SQ.melee(),
    board: __SQ.board().has,
    hud: __SQ.hud().map((b) => b.text).join(' '),
  }));
  expect(armed.item).toBe('');
  expect(armed.melee).toBe('');
  expect(armed.board).toBe(true);
  expect(armed.hud).toMatch(/X LASERS/);
  expect(armed.hud).not.toMatch(/X STUN/);
  await shot(page, 'b39-ros-green-lasers.png');

  const fired = await page.evaluate(() => {
    const S = __SQ;
    const before = S.shots.length;
    S.press('attack', true);
    S.step(2);
    S.press('attack', false);
    S.step(6);
    const shots = S.shots.map((s) => ({ kind: s.kind, col: s.col, laser: !!s.laser }));
    return {
      before,
      shots,
      swing: S.P.swingKind,
      item: S.hands().item,
      melee: S.melee(),
    };
  });
  expect(fired.before).toBe(0);
  expect(fired.item).toBe('');
  expect(fired.melee).toBe('');
  expect(fired.swing).not.toBe('melee');
  expect(fired.shots.filter((s) => s.kind === 'stun' && s.laser && s.col === '#3dff6a').length).toBe(2);
  await shot(page, 'b39-ros-laser-fire.png');

  const struck = await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_ros_yard');
    S.warp('ros_yard', 6, 7, 1);
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    const foe = S.ents.find((e) => e.k === 'dummy');
    foe.dead = false;
    foe.hp = 1;
    foe.x = 160;
    foe.y = 96;
    S.P.x = 160;
    S.P.y = 112;
    S.P.dir = 1;
    S.P.atk = 0;
    S.P.roll = 0;
    S.P.cds = {};
    S.shots.length = 0;
    S.press('attack', true);
    S.step(3);
    S.press('attack', false);
    S.step(8);
    return {
      dead: !!(foe && (foe.dead || foe.hp <= 0)),
      swing: S.P.swingKind,
      shots: S.shots.map((s) => s.kind),
      melee: S.melee(),
      item: S.hands().item,
      board: S.board().has,
    };
  });
  expect(struck.melee).toBe('');
  expect(struck.item).toBe('');
  expect(struck.board).toBe(true);
  expect(struck.swing).not.toBe('melee');
  expect(struck.dead, JSON.stringify(struck)).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('an existing ROS save equips the green lasers and keeps the rope and board', async ({ page }) => {
  const errors = await boot(page, { skippy: SKIPPY_SAVE, ros: OLD_ROS, ram: RAM_SAVE, ds: DS_SAVE });
  await openRos(page);
  const back = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.G.paused = false;
    const area = S.A.id;
    const hands = S.hands().item;
    const melee = S.melee();
    S.save();
    const savedRos = localStorage.getItem('sq_save_ros_v1');
    S.flag('oe_ros_desert');
    S.warp('ros_desert', 8, 8, 3);
    for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.ents.forEach((e) => { e.dead = true; });
    S.P.x = 128;
    S.P.y = 112;
    S.P.dir = 3;
    S.P.cds = {};
    S.shots.length = 0;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
    const shots = S.shots.map((s) => ({ kind: s.kind, col: s.col, laser: !!s.laser }));
    S.press('swap', true); S.step(2); S.press('swap', false); S.step(2);
    const swapped = S.hands().item;
    const keys = {
      skippy: localStorage.getItem('sq_save_v1'),
      ros: localStorage.getItem('sq_save_ros_v1'),
      ram: localStorage.getItem('sq_save_ram_v1'),
      ds: localStorage.getItem('sq_save_ds_v1'),
    };
    return {
      area,
      item: hands,
      hands,
      melee,
      lasso: !!S.P.items.lasso,
      blasters: !!S.P.items.blasters,
      kit: S.kit(),
      board: S.board().has,
      boardId: S.gear().board,
      wanted: S.wanted(),
      shots,
      swapped,
      keys,
      savedRos,
    };
  });
  expect(back.area).toBe('ros_pour');
  expect(back.hands).toBe('lasso');
  expect(back.melee).toBe('');
  expect(back.lasso).toBe(true);
  expect(back.blasters).toBe(true);
  expect(back.kit).toEqual(expect.arrayContaining(['lasso']));
  expect(back.kit).not.toContain('strike');
  expect(back.kit).not.toContain('lasers');
  expect(back.board).toBe(true);
  expect(back.boardId).toBe('dust');
  expect(back.wanted).toBe(1);
  expect(back.shots.filter((s) => s.kind === 'stun' && s.laser && s.col === '#3dff6a').length).toBeGreaterThanOrEqual(2);
  expect(back.swapped).not.toBe('strike');
  expect(['lasso', 'bomb', 'justice']).toContain(back.swapped);
  expect(back.swapped).not.toBe('lasers');
  expect(back.keys.skippy).toBe(SKIPPY_SAVE);
  expect(back.keys.ram).toBe(RAM_SAVE);
  expect(back.keys.ds).toBe(DS_SAVE);
  const saved = JSON.parse(back.savedRos);
  expect(saved.items.blasters).toBe(true);
  expect(saved.items.lasso).toBe(true);
  expect(saved.tool).toBe('lasso');
  expect(saved.melee).not.toBe('strike');
  expect(saved.flags.ros_lasers_default).toBe(true);
  expect(saved.flags.ros_attack_lasers).toBe(true);
  expect(saved.flags.lasso_got).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('the landscape ATTACK button fires the green lasers', async ({ page }) => {
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
      S.P.sec = '';
      S.P.cds = {};
      S.flag('oe_ros_desert');
      S.flag('lasso_got');
      S.warp('ros_desert', 8, 8, 3);
      for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      S.ents.forEach((e) => { e.dead = true; });
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
    const layout = await page.evaluate(() => ({
      land: document.documentElement.dataset.land,
      item: (document.querySelector('[data-b=item]').textContent || '').trim(),
      attack: (document.querySelector('[data-b=attack]').textContent || '').trim(),
      roll: document.documentElement.dataset.rolllabel,
    }));
    expect(layout.land).toBe('1');
    expect(layout.item).toBe('ITEM');
    expect(layout.attack).toBe('ATTACK');
    expect(layout.roll).toBe('BOARD');
    await page.locator('[data-b="attack"]').tap();
    await page.evaluate(() => __SQ.step(6));
    const hit = await page.evaluate(() => ({
      shots: __SQ.shots.map((s) => ({ kind: s.kind, col: s.col, laser: !!s.laser })),
      item: __SQ.hands().item,
      melee: __SQ.melee(),
      swing: __SQ.P.swingKind,
    }));
    expect(hit.item).toBe('lasso');
    expect(hit.melee).toBe('');
    expect(hit.swing).not.toBe('melee');
    expect(hit.shots.filter((s) => s.kind === 'stun' && s.laser && s.col === '#3dff6a').length).toBeGreaterThanOrEqual(2);
    await page.screenshot({ path: `${ART}/b39-ros-laser-phone.png` });
    fs.copyFileSync(`${ART}/b39-ros-laser-phone.png`, `${ROOT}/b39-ros-laser-phone.png`);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
