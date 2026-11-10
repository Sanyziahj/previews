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

async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function press(page, key) {
  await page.keyboard.down(key);
  await page.waitForTimeout(60);
  await page.keyboard.up(key);
}

test('keyboard: pick up the amulet, call lightning, and fell the Eye with the axe', async ({ page }) => {
  const errors = await bootLive(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ramshackle';
    S.G.paused = false;
    S.P.items = { hatchet: true, axe: true };
    S.P.hp = 20;
    S.P.maxHp = 20;
    S.flag('axe_got');
    S.flag('door_jup');
    S.P.pri = 'axe';
    S.P.wep = 'axe';
    S.P.sec = '';
    S.P.tool = '';
    S.P.cds = {};
    S.warp('ram_j1', 14.2, 4.9, 1);
  });
  await page.waitForTimeout(200);
  await page.locator('#game').screenshot({ path: `${ART}/axe-in-hand.png` });
  await press(page, 'KeyE');
  for (let i = 0; i < 14; i++) {
    const back = await page.evaluate(() => __SQ.A.id === 'ram_j1' && !!__SQ.P.items.amulet && !__SQ.script && !__SQ.dlg);
    if (back) break;
    await press(page, 'Space');
    await page.waitForTimeout(180);
  }
  const got = await page.evaluate(() => ({ area: __SQ.A.id, amulet: !!__SQ.P.items.amulet, sec: __SQ.slots().sec }));
  expect(got.amulet, JSON.stringify(got)).toBe(true);
  await hold(page, 'ArrowLeft', 700);
  await hold(page, 'ArrowUp', 1600);
  await page.waitForFunction(() => __SQ.A.id === 'ram_eye' && __SQ.B.state === 'fight', null, { timeout: 12000 });
  await hold(page, 'ArrowUp', 500);
  await press(page, 'KeyZ');
  await page.waitForTimeout(120);
  let hurt = false;
  for (let i = 0; i < 22; i++) {
    await press(page, 'KeyX');
    await page.waitForTimeout(90);
    const snap = await page.evaluate(() => ({ hp: __SQ.B.hp, state: __SQ.B.state, rune: __SQ.P.rune || 0 }));
    if (!hurt && snap.hp < 8) {
      hurt = true;
      await page.locator('#game').screenshot({ path: `${ART}/axe-hit-flash.png` });
    }
    if (i === 0) await page.locator('#game').screenshot({ path: `${ART}/axe-swing.png` });
    if (snap.hp <= 0 || snap.state === 'dying' || snap.state === 'dead') break;
    if (snap.rune < 0.25) {
      await press(page, 'KeyZ');
      await page.waitForTimeout(140);
    }
    await hold(page, 'ArrowUp', 120);
  }
  const end = await page.evaluate(() => ({ hp: __SQ.B.hp, state: __SQ.B.state, flag: !!__SQ.flags.boss_storm }));
  expect(hurt, JSON.stringify(end)).toBe(true);
  expect(end.hp <= 0 || end.state === 'dying' || end.state === 'dead' || end.flag, JSON.stringify(end)).toBe(true);
  await page.locator('#game').screenshot({ path: `${ART}/axe-bar-drop.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('Skippy and ROS still attack from the keyboard', async ({ page }) => {
  const errors = await bootLive(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.P.items = { raygun: true, baton: true };
    S.P.melee = 'baton';
    S.P.wep = 'baton';
    S.P.pri = 'raygun';
    S.P.sec = 'raygun';
    S.P.tool = 'raygun';
    S.P.cds = {};
    S.warp('desert', 12, 10, 3);
  });
  await page.waitForTimeout(300);
  await page.locator('#game').focus();
  await press(page, 'KeyZ');
  await page.waitForTimeout(250);
  const skippy = await page.evaluate(() => __SQ.shots.some((s) => s.kind === 'ray'));
  expect(skippy).toBe(true);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'ros';
    S.P.items = { blasters: true };
    S.P.melee = '';
    S.P.wep = '';
    S.P.pri = 'lasers';
    S.P.sec = 'lasers';
    S.P.tool = 'lasers';
    S.P.cds = {};
    S.flag('oe_ros_desert');
    S.warp('ros_desert', 10, 8, 3);
  });
  await page.waitForTimeout(400);
  await press(page, 'KeyZ');
  await page.waitForTimeout(250);
  const ros = await page.evaluate(() => __SQ.shots.some((s) => s.kind === 'stun'));
  expect(ros).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone attack button', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('a tap on ATTACK fells the Eye after lightning', async ({ page }) => {
    const errors = await bootLive(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'ramshackle';
      S.G.paused = false;
      S.P.items = { hatchet: true, axe: true, amulet: true };
      S.P.hp = 20;
      S.P.maxHp = 20;
      S.flag('axe_got');
      S.flag('amulet_got');
      S.P.pri = 'axe';
      S.P.wep = 'axe';
      S.P.sec = 'amulet';
      S.P.tool = 'amulet';
      S.P.cds = {};
      S.warp('ram_eye', 8, 8, 1);
    });
    await page.waitForFunction(() => __SQ.B.state === 'fight', null, { timeout: 10000 });
    await page.locator('#game').screenshot({ path: `${ART}/axe-hand-phone.png` });
    const attack = page.locator('[data-b="attack"]');
    const item = page.locator('[data-b="item"]');
    await item.tap();
    await page.waitForTimeout(180);
    let hurt = false;
    for (let i = 0; i < 22; i++) {
      await attack.tap();
      await page.waitForTimeout(220);
      const snap = await page.evaluate(() => ({ hp: __SQ.B.hp, state: __SQ.B.state, rune: __SQ.P.rune || 0 }));
      if (!hurt && snap.hp < 8) hurt = true;
      if (snap.hp <= 0 || snap.state === 'dying' || snap.state === 'dead') break;
      if (snap.rune < 0.25) {
        await item.tap();
        await page.waitForTimeout(160);
      }
    }
    const end = await page.evaluate(() => ({ hp: __SQ.B.hp, state: __SQ.B.state }));
    expect(hurt, JSON.stringify(end)).toBe(true);
    expect(end.hp <= 0 || end.state === 'dying' || end.state === 'dead', JSON.stringify(end)).toBe(true);
    await page.screenshot({ path: `${ART}/axe-eye-phone.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
