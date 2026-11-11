import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const ROOT = '/opt/cursor/artifacts';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });
fs.mkdirSync(ROOT, { recursive: true });

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

test('after the credits Skippy lands at Cash, and home still opens DreamLand', async ({ page }) => {
  test.setTimeout(90000);
  const errors = await boot(page, { ros: ROS_SAVE, ram: RAM_SAVE, ds: DS_SAVE });
  expect(await page.evaluate(() => __SQ.build())).toBe('b38');
  const cache = await page.evaluate(() => document.querySelector('script').textContent);
  expect(cache).toContain('window.__SQ_BUILD="b38"');
  expect(cache).toContain('v=b38');

  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'credits';
    S.G.story = 'skippy';
    S.G.st = 4;
    S.G.paused = false;
    S.flag('ch9_done');
    S.flag('hardened');
    S.flag('woke');
    S.P.coins = 77;
    S.P.shards = 7;
    S.P.items.baton = true;
    S.P.items.bow = true;
  });
  await page.keyboard.press('Space');
  await page.waitForFunction(() => __SQ.G.state === 'play' && __SQ.A.id === 'hub', null, { timeout: 8000 });
  const landing = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 30 && !(S.dlg && S.dlg.raw); i++) S.step(2);
    if (S.dlg) S.skipText();
    const spike = S.npcs.find((n) => n.id === 'spike');
    const rows = (window.__SQ_TOUCH && window.__SQ_TOUCH.rows) || [];
    return {
      area: S.A.id,
      name: S.A.name,
      state: S.G.state,
      who: S.dlg && S.dlg.who,
      line: S.dlg ? S.dlg.raw : '',
      spike: !!(spike && spike.vis !== false),
      poster: rows.map((r) => r.label).join('|'),
      home: S.A.id === 'home',
    };
  });
  expect(landing.area).toBe('hub');
  expect(landing.name).toBe('THE PORTAL NEXUS');
  expect(landing.state).toBe('play');
  expect(landing.who).toBe('wizard');
  expect(landing.line).toMatch(/RIDE ANYWHERE/);
  expect(landing.line).not.toMatch(/DREAMLAND|SPIKE/);
  expect(landing.spike).toBe(false);
  expect(landing.home).toBe(false);
  await page.evaluate(() => { __SQ.G.bannerT = 2; __SQ.G.saveT = 0; __SQ.step(0); });
  await shot(page, 'b38-nexus-landing.png');

  const nudge = await page.evaluate(() => {
    const S = __SQ;
    const lines = [];
    for (let i = 0; i < 6; i++) {
      for (let n = 0; n < 20 && !(S.dlg && S.dlg.raw); n++) S.step(2);
      if (!S.dlg) break;
      S.skipText();
      lines.push(S.dlg.raw);
      if (/GET SOME REST/.test(S.dlg.raw)) break;
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(3);
    }
    S.G.saveT = 0;
    S.G.bannerT = 0;
    S.step(0);
    return { lines, area: S.A.id };
  });
  expect(nudge.area).toBe('hub');
  expect(nudge.lines.join(' ')).toMatch(/PIONEER POUR/);
  expect(nudge.lines.join(' ')).toMatch(/GET SOME REST/);
  expect(nudge.lines.join(' ')).not.toMatch(/DREAMLAND|SPIKE|RONIN/);
  await shot(page, 'b38-cash-rest.png');

  const poster = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'poster';
    S.G.st = 1;
    S.step(1);
    const rows = (window.__SQ_TOUCH && window.__SQ_TOUCH.rows) || [];
    return rows.map((r) => r.label);
  });
  expect(poster.join(' ')).toBe('TITLE');
  expect(poster.join(' ')).not.toMatch(/HOME/);

  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(3);
    }
    S.G.state = 'play';
    S.G.paused = false;
    for (let i = 0; i < 12 && (S.script || S.dlg); i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(2);
    }
    S.G.story = 'skippy';
    S.flag('ch9_done');
    S.flag('hardened');
    S.flag('oe_home');
    S.flag('dl_called', false);
    S.flag('dl_left', false);
    S.warp('home', 8.2, 8.4, 3);
    for (let i = 0; i < 20 && !(S.dlg && /DREAMLAND/.test(S.dlg.raw || '')); i++) S.step(2);
    if (S.dlg) S.skipText();
  });
  const home = await page.evaluate(() => ({
    area: __SQ.A.id,
    line: __SQ.dlg ? __SQ.dlg.raw : '',
  }));
  expect(home.area).toBe('home');
  expect(home.line).toMatch(/HURRY, RETURN TO DREAMLAND/);

  const keys = await page.evaluate(() => ({
    ros: localStorage.getItem('sq_save_ros_v1'),
    ram: localStorage.getItem('sq_save_ram_v1'),
    ds: localStorage.getItem('sq_save_ds_v1'),
    skippy: localStorage.getItem('sq_save_v1'),
  }));
  expect(keys.ros).toBe(ROS_SAVE);
  expect(keys.ram).toBe(RAM_SAVE);
  expect(keys.ds).toBe(DS_SAVE);
  const saved = JSON.parse(keys.skippy);
  expect(saved.flags.ch9_done).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

async function placeRos(page) {
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ros';
    S.G.paused = false;
    S.P.items = { blasters: true, lasso: true };
    S.P.melee = '';
    S.P.wep = 'lasers';
    S.P.pri = 'lasers';
    S.P.sec = 'lasso';
    S.P.tool = 'lasso';
    S.P.act = 'lasers';
    S.P.cds = {};
    S.flag('oe_ros_yard');
    S.flag('lasso_got');
    S.warp('ros_yard', 6, 7, 1);
    for (let i = 0; i < 12 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.G.paused = false;
    const foe = S.ents.find((e) => e.k === 'dummy');
    foe.dead = false;
    foe.hp = 1;
    foe.x = 160;
    foe.y = 96;
    S.P.x = foe.x;
    S.P.y = foe.y + 16;
    S.P.dir = 1;
    S.P.atk = 0;
    S.P.roll = 0;
    S.shots.length = 0;
    S.step(2);
  });
}

test('keyboard ATTACK is ROS stun strike and ITEM still fires the blasters', async ({ page }) => {
  const errors = await boot(page);
  await placeRos(page);
  await page.locator('#game').focus();
  const before = await page.evaluate(() => ({
    melee: __SQ.melee(),
    hands: __SQ.hands(),
    attackon: document.documentElement.dataset.attackon,
  }));
  expect(before.melee).toBe('strike');
  expect(before.hands.item).not.toBe('strike');
  expect(before.hands.melee).toBe('strike');
  expect(['lasers', 'lasso']).toContain(before.hands.item);
  await page.keyboard.down('KeyX');
  await page.waitForTimeout(80);
  await page.keyboard.up('KeyX');
  await page.waitForTimeout(450);
  const struck = await page.evaluate(() => {
    const foe = __SQ.ents.find((e) => e.x === 160);
    return {
      dead: !!(foe && foe.dead),
      hp: foe && foe.hp,
      shots: __SQ.shots.map((s) => s.kind),
      swing: __SQ.P.swingKind,
      wep: __SQ.gear().wep,
    };
  });
  expect(struck.dead, JSON.stringify(struck)).toBe(true);
  expect(struck.shots.join(',')).not.toMatch(/stun|justice/);
  expect(struck.swing).toBe('melee');
  expect(struck.wep).toBe('lasers');

  await page.evaluate(() => {
    const S = __SQ;
    const foe = S.ents.find((e) => e.k === 'dummy' && e.x !== 160) || S.ents.find((e) => e.k === 'dummy');
    foe.dead = false;
    foe.hp = 1;
    foe.x = 160;
    foe.y = 96;
    S.P.x = 160;
    S.P.y = 112;
    S.P.dir = 1;
    S.P.atk = 0;
    S.P.roll = 0;
    S.shots.length = 0;
    S.setManual(true);
    S.step(1);
  });
  await page.keyboard.down('KeyX');
  await page.evaluate(() => __SQ.step(3));
  await shot(page, 'b38-ros-attack.png');
  await page.keyboard.up('KeyX');
  const arc = await page.evaluate(() => ({ atk: __SQ.P.atk, swing: __SQ.P.swingKind, shots: __SQ.shots.map((s) => s.kind) }));
  expect(arc.swing).toBe('melee');
  expect(arc.atk).toBeGreaterThan(0);
  expect(arc.shots.join(',')).not.toMatch(/stun/);

  await page.evaluate(() => {
    const S = __SQ;
    S.flag('yard_clear');
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(2);
    }
    S.ents.forEach((e) => { e.dead = true; });
    S.P.x = 48;
    S.P.y = 48;
    S.P.dir = 3;
    S.P.atk = 0;
    S.P.cds = {};
    S.P.sec = '';
    S.P.tool = 'lasers';
    S.P.pri = 'lasers';
    S.shots.length = 0;
    S.press('item', true);
    S.step(2);
    S.press('item', false);
    S.step(2);
  });
  const item = await page.evaluate(() => ({
    shots: __SQ.shots.map((s) => s.kind),
    melee: __SQ.melee(),
    item: __SQ.hands().item,
  }));
  expect(item.shots.filter((k) => k === 'stun').length).toBeGreaterThanOrEqual(2);
  expect(item.melee).toBe('strike');
  expect(item.item).toBe('lasers');
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone ATTACK', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('the ATTACK button strikes and stays off ITEM', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await placeRos(page);
    const armed = await page.evaluate(() => {
      const el = document.querySelector('[data-b=attack]');
      const item = document.querySelector('[data-b=item]');
      return {
        attackon: document.documentElement.dataset.attackon,
        dim: el.classList.contains('dim'),
        text: (el.textContent || '').trim(),
        item: (item.textContent || '').trim(),
      };
    });
    expect(armed.text).toBe('ATTACK');
    expect(armed.item).toBe('ITEM');
    expect(armed.attackon).toBe('1');
    expect(armed.dim).toBe(false);
    await page.evaluate(() => __SQ.setManual(true));
    await page.locator('[data-b="attack"]').tap();
    await page.evaluate(() => __SQ.step(4));
    const hit = await page.evaluate(() => {
      const foe = __SQ.ents.find((e) => e.x === 160);
      return {
        dead: !!(foe && (foe.dead || foe.hp <= 0)),
        swing: __SQ.P.swingKind,
        shots: __SQ.shots.map((s) => s.kind),
        melee: __SQ.melee(),
        item: __SQ.hands().item,
      };
    });
    expect(hit.melee).toBe('strike');
    expect(hit.item).not.toBe('strike');
    expect(hit.swing).toBe('melee');
    expect(hit.shots.join(',')).not.toMatch(/stun|justice|lasso/);
    expect(hit.dead, JSON.stringify(hit)).toBe(true);
    await page.screenshot({ path: `${ART}/b38-ros-attack-phone.png` });
    fs.copyFileSync(`${ART}/b38-ros-attack-phone.png`, `${ROOT}/b38-ros-attack-phone.png`);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
