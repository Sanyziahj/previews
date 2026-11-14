import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

async function bootLive(page) {
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
  await page.waitForTimeout(70);
  await page.keyboard.up(key);
}

async function readyEye(page, gear) {
  await page.evaluate((gear) => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ramshackle';
    S.G.paused = false;
    S.P.items = gear.items;
    S.P.hp = 20;
    S.P.maxHp = 20;
    S.P.pri = gear.pri;
    S.P.wep = gear.pri;
    S.P.sec = gear.sec || '';
    S.P.tool = gear.sec || '';
    S.P.cds = {};
    S.P.rune = 0;
    S.P.lit = 0;
    Object.keys(gear.flags || {}).forEach((f) => S.flag(f));
    S.warp('ram_eye', 8, 8, 1);
  }, gear);
  await page.waitForFunction(() => __SQ.B.state === 'fight', null, { timeout: 10000 });
  await page.locator('#game').focus();
}

async function light(page) {
  await press(page, 'KeyZ');
  await page.waitForTimeout(150);
  const open = await page.evaluate(() => __SQ.lightning().rune);
  expect(open).toBeGreaterThan(1.5);
}

async function strike(page, dx, dy, dir) {
  await page.evaluate(({ dx, dy, dir }) => {
    const S = __SQ;
    S.P.x = S.B.x + dx;
    S.P.y = S.B.y + dy;
    S.P.dir = dir;
    S.P.cds = {};
  }, { dx, dy, dir });
  if ((await page.evaluate(() => __SQ.P.rune || 0)) < 0.5) {
    await press(page, 'KeyZ');
    await page.waitForTimeout(140);
  }
  const before = await page.evaluate(() => ({ hp: __SQ.B.hp, rune: __SQ.P.rune || 0 }));
  expect(before.rune).toBeGreaterThan(0);
  await press(page, 'KeyX');
  await page.waitForTimeout(300);
  const after = await page.evaluate(() => __SQ.B.hp);
  expect(after, 'dir ' + dir + ' from ' + dx + ',' + dy).toBeLessThan(before.hp);
  return after;
}

test('a hatchet in X still drops the Eye during lightning', async ({ page }) => {
  const errors = await bootLive(page);
  await page.locator('#game').screenshot({ path: `${ART}/build-tag.png` });
  const build = await page.evaluate(() => __SQ.build());
  expect(build).toBe('b44');
  await readyEye(page, {
    items: { hatchet: true, amulet: true },
    pri: 'hatchet',
    sec: 'amulet',
    flags: { amulet_got: true },
  });
  expect(await page.evaluate(() => __SQ.slots().pri)).toBe('hatchet');
  await light(page);
  await page.waitForTimeout(700);
  expect(await page.evaluate(() => __SQ.P.rune || 0)).toBeGreaterThan(1);
  const mid = await strike(page, 0, 42, 1);
  await page.locator('#game').screenshot({ path: `${ART}/eye-hp-drop.png` });
  await strike(page, -34, 0, 3);
  await strike(page, 34, 0, 2);
  expect(mid).toBeGreaterThan(0);
  expect(mid).toBeLessThan(12);
  for (let i = 0; i < 24; i++) {
    const snap = await page.evaluate(() => ({ hp: __SQ.B.hp, state: __SQ.B.state, rune: __SQ.P.rune || 0 }));
    if (snap.hp <= 0 || snap.state === 'dying' || snap.state === 'dead') break;
    if (snap.rune < 0.4) {
      await press(page, 'KeyZ');
      await page.waitForTimeout(140);
    }
    await press(page, 'KeyX');
    await page.waitForTimeout(220);
  }
  const end = await page.evaluate(() => ({ hp: __SQ.B.hp, state: __SQ.B.state }));
  expect(end.hp <= 0 || end.state === 'dying' || end.state === 'dead', JSON.stringify(end)).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('an old ram save still hurts the Eye', async ({ page }) => {
  const errors = await bootLive(page);
  const old = {
    v: 1,
    z: 'hatchet',
    area: 'ram_eye',
    x: 136,
    y: 120,
    dir: 1,
    hp: 10,
    maxHp: 10,
    pieces: 0,
    coins: 4,
    arrows: 0,
    items: { hatchet: true, axe: true, amulet: true },
    keys: {},
    bigKeys: {},
    flags: { axe_got: true, amulet_got: true, woke: true, oe_ram_eye: true },
    party: [],
    shards: 0,
    time: 80,
    visited: { ram_eye: true },
  };
  await page.evaluate((raw) => localStorage.setItem('sq_save_ram_v1', JSON.stringify(raw)), old);
  await page.evaluate(() => __SQ.loadChapter('ramshackle'));
  await page.waitForFunction(() => __SQ.A.id === 'ram_eye' && __SQ.B.state === 'fight', null, { timeout: 10000 });
  expect(await page.evaluate(() => __SQ.melee())).toBe('axe');
  await page.locator('#game').focus();
  await press(page, 'KeyZ');
  await page.waitForTimeout(160);
  const before = await page.evaluate(() => __SQ.B.hp);
  await press(page, 'KeyX');
  await page.waitForTimeout(320);
  const after = await page.evaluate(() => __SQ.B.hp);
  expect(after).toBeLessThan(before);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone hatchet tap', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('ATTACK taps drop the Eye after ITEM calls lightning', async ({ page }) => {
    const errors = await bootLive(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await readyEye(page, {
      items: { hatchet: true, amulet: true },
      pri: 'hatchet',
      sec: 'amulet',
      flags: { amulet_got: true },
    });
    await page.evaluate(() => {
      const S = __SQ;
      S.P.x = S.B.x;
      S.P.y = S.B.y + 40;
      S.P.dir = 1;
      S.P.cds = {};
    });
    const item = page.locator('[data-b="item"]');
    const attack = page.locator('[data-b="attack"]');
    await item.tap();
    await page.waitForTimeout(160);
    const before = await page.evaluate(() => __SQ.B.hp);
    expect(await page.evaluate(() => __SQ.P.rune || 0)).toBeGreaterThan(1);
    await attack.tap();
    await page.waitForTimeout(300);
    const mid = await page.evaluate(() => __SQ.B.hp);
    expect(mid).toBeLessThan(before);
    for (let i = 0; i < 20; i++) {
      const snap = await page.evaluate(() => ({ hp: __SQ.B.hp, state: __SQ.B.state, rune: __SQ.P.rune || 0 }));
      if (snap.hp <= 0 || snap.state === 'dying' || snap.state === 'dead') break;
      if (snap.rune < 0.4) {
        await item.tap();
        await page.waitForTimeout(160);
      }
      await page.evaluate(() => { __SQ.P.cds = {}; __SQ.P.x = __SQ.B.x; __SQ.P.y = __SQ.B.y + 36; __SQ.P.dir = 1; });
      await attack.tap();
      await page.waitForTimeout(240);
    }
    const end = await page.evaluate(() => ({ hp: __SQ.B.hp, state: __SQ.B.state }));
    expect(end.hp <= 0 || end.state === 'dying' || end.state === 'dead', JSON.stringify(end)).toBe(true);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
