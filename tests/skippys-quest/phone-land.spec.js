import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

async function boot(page, phone = true) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.__SQ_DEBUG = true; });
  await page.goto(GAME);
  await page.waitForFunction((wantPhone) => window.__SQ && (!wantPhone || document.documentElement.classList.contains('srml')), phone);
  await page.locator('#game').focus();
  return errors;
}

async function playDesert(page) {
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.P.items = { raygun: true, lasso: true, sword: true };
    S.P.pri = 'raygun';
    S.P.wep = 'raygun';
    S.P.sec = 'lasso';
    S.P.tool = 'lasso';
    S.P.magic = 6;
    S.P.magicMax = 8;
    S.flag('oe_desert');
    S.flag('santt_met');
    S.warp('desert', 20, 16, 3);
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.step(2);
  });
}

function boxes(page) {
  return page.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const on = getComputedStyle(el).display !== 'none' && r.width > 2;
      return { x: r.x, y: r.y, w: r.width, h: r.height, cx: r.x + r.width / 2, cy: r.y + r.height / 2, on, label: (el.textContent || '').trim() };
    };
    const stage = document.querySelector('#srml-scr').getBoundingClientRect();
    const game = document.querySelector('#game').getBoundingClientRect();
    const maxW = Math.min(innerWidth, innerHeight * (320 / 224));
    const maxH = maxW * (224 / 320);
    return {
      attack: box('[data-b="attack"]'),
      item: box('[data-b="item"]'),
      swap: box('[data-b="swap"]'),
      talk: box('[data-b="talk"]'),
      board: box('[data-b="board"], [data-b="roll"]'),
      magic: box('[data-b="magic"]'),
      pause: box('[data-b="map"]'),
      map: box('[data-b="worldmap"]'),
      stick: box('#stick'),
      stage: { w: stage.width, h: stage.height },
      game: { x: game.x, y: game.y, w: game.width, h: game.height },
      vw: innerWidth,
      vh: innerHeight,
      fit: (game.width * game.height) / (maxW * maxH),
      fill: (stage.width * stage.height) / (innerWidth * innerHeight),
    };
  });
}

function overlaps(a, b) {
  const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ix > 0.5 && iy > 0.5;
}

test('pause pages keep their text in separate boxes', async ({ page }) => {
  const errors = await boot(page, false);
  for (const [w, h] of [[1280, 800], [844, 390], [932, 430], [390, 844]]) {
    await page.setViewportSize({ width: w, height: h });
    await playDesert(page);
    for (const n of [0, 1, 2, 3, 4]) {
      const boxes = await page.evaluate((n) => {
        const S = __SQ;
        S.G.paused = true;
        S.G.skipPage = n;
        S.G.gearSel = 0;
        S.step(2);
        return S.pauseBoxes();
      }, n);
      if (n > 2) continue;
      expect(boxes.length, `${w}x${h} page ${n}`).toBeGreaterThan(2);
      for (const b of boxes) {
        expect(b.x, `${b.t} left`).toBeGreaterThanOrEqual(2);
        expect(b.y, `${b.t} top`).toBeGreaterThanOrEqual(2);
        expect(b.x + b.w, `${b.t} right`).toBeLessThanOrEqual(318);
        expect(b.y + b.h, `${b.t} bottom`).toBeLessThanOrEqual(222);
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          expect(overlaps(boxes[i], boxes[j]), `${w}x${h} ${boxes[i].t} / ${boxes[j].t}`).toBe(false);
        }
      }
    }
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone landscape handheld', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('the picture fills the phone and the cluster matches the sketch', async ({ page }) => {
    const errors = await boot(page);
    for (const [w, h] of [[844, 390], [932, 430]]) {
      await page.setViewportSize({ width: w, height: h });
      await playDesert(page);
      const b = await boxes(page);
      expect(b.fill, `${w}x${h} stage`).toBeGreaterThanOrEqual(0.9);
      expect(b.fit, `${w}x${h} picture`).toBeGreaterThanOrEqual(0.9);
      for (const key of ['attack', 'item', 'swap', 'talk', 'board', 'pause', 'map', 'stick']) {
        expect(b[key] && b[key].on, key).toBe(true);
        expect(b[key].x, key).toBeGreaterThanOrEqual(-1);
        expect(b[key].y, key).toBeGreaterThanOrEqual(-1);
        expect(b[key].x + b[key].w, key).toBeLessThanOrEqual(w + 1);
        expect(b[key].y + b[key].h, key).toBeLessThanOrEqual(h + 1);
      }
      expect(b.attack.w).toBeGreaterThanOrEqual(64);
      expect(b.attack.h).toBeGreaterThan(b.item.h);
      for (const key of ['item', 'swap', 'talk', 'board']) expect(Math.min(b[key].w, b[key].h)).toBeGreaterThanOrEqual(56);
      expect(b.swap.cy).toBeLessThan(b.attack.cy);
      expect(b.talk.cy).toBeLessThan(b.item.cy);
      expect(b.swap.cx).toBeLessThan(b.talk.cx);
      expect(b.attack.cx).toBeLessThan(b.item.cx);
      expect(b.board.cy).toBeGreaterThan(b.attack.cy);
      expect(b.pause.cx).toBeLessThan(w * 0.25);
      expect(b.pause.cy).toBeLessThan(h * 0.25);
      expect(b.stick.cx).toBeLessThan(w * 0.4);
      expect(b.magic.on).toBe(false);
      expect(b.map.w).toBe(b.pause.w);
      expect(b.map.y).toBe(b.pause.y);
      expect(b.map.x).toBeGreaterThan(b.pause.x + b.pause.w - 1);
      const names = [b.attack, b.item, b.swap, b.talk, b.board, b.pause, b.map, b.stick];
      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const a = names[i], c = names[j];
          const dist = Math.hypot(a.cx - c.cx, a.cy - c.cy);
          const gap = dist - Math.min(a.w, a.h) / 2 - Math.min(c.w, c.h) / 2;
          expect(gap, `${a.label}/${c.label}`).toBeGreaterThan(-1);
        }
      }
    }
    for (const [w, h] of [[844, 390], [932, 430], [740, 360], [667, 375], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h });
      await playDesert(page);
      const covered = await page.evaluate(() => {
        const game = document.querySelector('#game').getBoundingClientRect();
        const sc = game.width / 320;
        const heart = { l: game.left, t: game.top, r: game.left + 108 * sc, b: game.top + 32 * sc };
        const hud = { l: game.left, t: game.top, r: game.left + game.width, b: game.top + 32 * sc };
        const bad = [];
        for (const sel of ['[data-b="map"]', '[data-b="worldmap"]']) {
          const el = document.querySelector(sel);
          const r = el.getBoundingClientRect();
          const hit = (box) => r.left < box.r - 1 && r.right > box.l + 1 && r.top < box.b - 1 && r.bottom > box.t + 1;
          if (hit(heart) || hit(hud)) bad.push((el.textContent || '').trim());
        }
        return bad;
      });
      expect(covered, `${w}x${h} hearts`).toEqual([]);
    }
    await page.setViewportSize({ width: 844, height: 390 });
    await playDesert(page);
    await page.screenshot({ path: `${ART}/b32-land.png` });
    await page.setViewportSize({ width: 390, height: 844 });
    await playDesert(page);
    await page.screenshot({ path: `${ART}/b32-portrait.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('every button fires, the map opens, and a second finger can attack', async ({ page }) => {
    const errors = await boot(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await playDesert(page);
    await page.screenshot({ path: `${ART}/b32-land-play.png` });

    const attack = page.locator('[data-b="attack"]');
    await attack.tap();
    await page.waitForTimeout(80);
    const swung = await page.evaluate(() => (__SQ.P.atk || 0) > 0 || __SQ.shots.length > 0);
    expect(swung).toBe(true);

    await page.evaluate(() => {
      __SQ.P.items.disc = true;
      __SQ.P.sec = 'disc';
      __SQ.P.tool = 'disc';
      __SQ.P.arrowCd = 0;
      __SQ.shots.length = 0;
      __SQ.step(1);
    });
    await page.locator('[data-b="item"]').tap();
    await page.waitForTimeout(80);
    const threw = await page.evaluate(() => __SQ.shots.some((s) => s.kind === 'disc'));
    expect(threw).toBe(true);

    const before = await page.evaluate(() => __SQ.slots().sec);
    await page.locator('[data-b="swap"]').tap();
    await page.waitForTimeout(80);
    const after = await page.evaluate(() => __SQ.slots().sec);
    expect(after).not.toBe(before);

    const beforeMagic = await page.evaluate(() => __SQ.magic().n);
    await page.keyboard.press('KeyF');
    await page.waitForTimeout(80);
    const afterMagic = await page.evaluate(() => __SQ.magic().n);
    expect(afterMagic).toBeLessThan(beforeMagic);

    await page.evaluate(() => { __SQ.P.items.board = false; __SQ.flag('space_board', false); __SQ.flag('board_got', false); __SQ.step(1); });
    await page.locator('[data-b="roll"], [data-b="board"]').first().tap();
    await page.waitForTimeout(80);
    const rolled = await page.evaluate(() => (__SQ.P.roll || 0) > 0);
    expect(rolled).toBe(true);

    const stick = await page.locator('#stick').boundingBox();
    const atk = await attack.boundingBox();
    const y0 = await page.evaluate(() => __SQ.P.y);
    await page.locator('#stick').dispatchEvent('pointerdown', {
      clientX: stick.x + stick.width / 2,
      clientY: stick.y + 16,
      pointerId: 3,
      bubbles: true,
    });
    await attack.dispatchEvent('pointerdown', {
      clientX: atk.x + atk.width / 2,
      clientY: atk.y + atk.height / 2,
      pointerId: 4,
      bubbles: true,
    });
    await page.evaluate(() => __SQ.step(20));
    const both = await page.evaluate((y0) => ({ moved: __SQ.P.y < y0 - 4, atk: (__SQ.P.atk || 0) > 0 || __SQ.I.attack }), y0);
    expect(both.moved).toBe(true);
    expect(both.atk).toBe(true);
    await page.locator('#stick').dispatchEvent('pointerup', { pointerId: 3, bubbles: true });
    await attack.dispatchEvent('pointerup', { pointerId: 4, bubbles: true });

    await page.locator('[data-b="worldmap"]').tap();
    await page.waitForTimeout(150);
    const mapped = await page.evaluate(() => ({ paused: !!__SQ.G.paused, page: __SQ.G.skipPage || 0, ros: __SQ.G.rosPage || 0 }));
    expect(mapped.paused).toBe(true);
    expect(mapped.page).toBe(0);
    await page.locator('[data-b="worldmap"]').tap();
    await page.waitForTimeout(150);
    expect(await page.evaluate(() => !!__SQ.G.paused)).toBe(false);

    await page.locator('[data-b="map"]').tap();
    await page.waitForTimeout(150);
    const paused = await page.evaluate(() => ({ paused: !!__SQ.G.paused, page: __SQ.G.skipPage || 0 }));
    expect(paused.paused).toBe(true);
    expect(paused.page).toBe(0);
    await page.screenshot({ path: `${ART}/b32-map.png` });
    await page.evaluate(() => { __SQ.G.skipPage = 1; __SQ.step(2); });
    await page.screenshot({ path: `${ART}/b32-pause.png` });
    await page.evaluate(() => { __SQ.G.skipPage = 2; __SQ.step(2); });
    await page.screenshot({ path: `${ART}/b32-journal.png` });

    await page.evaluate(() => { __SQ.G.paused = false; __SQ.step(2); });
    await page.keyboard.press('KeyM');
    await page.waitForTimeout(100);
    expect(await page.evaluate(() => !!__SQ.G.paused)).toBe(true);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    await page.evaluate(() => {
      const S = __SQ;
      S.G.paused = false;
      S.P.x = 10 * 16 + 8;
      S.P.y = 8 * 16 + 22;
      S.P.dir = 1;
      S.step(2);
    });
    await page.locator('[data-b="talk"]').tap();
    await page.waitForTimeout(200);
    const dlg = await page.evaluate(() => !!__SQ.dlg || !!__SQ.script);
    expect(dlg).toBe(true);
    await page.screenshot({ path: `${ART}/b32-dialog.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('portrait keeps the same cluster off the hearts', async ({ page }) => {
    const errors = await boot(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await playDesert(page);
    const b = await boxes(page);
    expect(b.attack.on).toBe(true);
    expect(b.stick.cx).toBeLessThan(b.attack.cx);
    expect(b.pause.cy).toBeLessThan(b.game.y + 2);
    await page.screenshot({ path: `${ART}/b32-portrait.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
