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
  await page.evaluate(() => {
    const S = __SQ;
    S.setManual(true);
    S.step(2);
    window.quiet = function () {
      for (let i = 0; i < 10 && (S.script || S.dlg); i++) {
        S.skipText();
        S.press('talk', true);
        S.step(1);
        S.press('talk', false);
        S.step(1);
      }
      S.G.paused = false;
      S.G.bannerT = 0;
      S.G.toastT = 0;
      S.G.saveT = 0;
      S.G.hailT = 0;
    };
  });
  await page.locator('#game').focus();
  return errors;
}

async function parkBoard(page) {
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'drill';
    S.G.paused = false;
    S.G.choice = null;
    S.flag('oe_ds_camp');
    S.P.ownB = 1;
    S.P.gearB = 1;
    S.P.roll = 0;
    S.P.rollCd = 0;
    S.P.atk = 0;
    S.P.boardDash = 0;
    S.warp('ds_camp', 8, 6, 3);
    quiet();
    S.P.x = 128;
    S.P.y = 96;
    S.P.dir = 3;
    S.G.toast = '';
    S.G.toastT = 0;
    S.G.toastKey = '';
    S.G.toastSeq = 0;
    S.G.bannerT = 0;
    S.step(2);
  });
}

function traceOf(frames) {
  const shown = frames.filter((f) => f.text);
  const ys = [...new Set(shown.map((f) => f.y))];
  let reset = 0;
  for (let i = 1; i < frames.length; i++) {
    if (frames[i].t > frames[i - 1].t + 0.001) reset++;
  }
  const after = frames.findIndex((f) => !f.text);
  const cameBack = after >= 0 && frames.slice(after).some((f) => f.text);
  return {
    n: frames[0] && frames[frames.length - 1].n,
    text: shown[0] && shown[0].text,
    ys,
    reset,
    cameBack,
    boxes: Math.max(0, ...frames.map((f) => f.boxes)),
    tall: shown.some((f) => f.h > 26),
    wide: shown.every((f) => f.w === 320),
  };
}

test('build is b45 and notices stay a bottom runner', async ({ page }) => {
  const errors = await boot(page);
  const cache = await page.evaluate(() => document.querySelector('script').textContent);
  expect(cache).toContain('window.__SQ_BUILD="b45"');
  expect(cache).toContain('v=b45');
  expect(await page.evaluate(() => __SQ.build())).toBe('b45');
  expect(await page.locator('meta[name="robots"]').count()).toBe(1);

  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'drill';
    S.G.paused = false;
    S.G.dsCalm = 0;
    S.G.dsShift = -3;
    S.flag('oe_ds_moon1');
    S.warp('ds_moon1', 6, 6, 0);
    quiet();
    S.G.dsCalm = 0;
    S.G.dsShift = -3;
    S.G.bannerT = 0;
    S.G.toastT = 0;
    S.ents.forEach((e) => { e.stun = 99; e.x = 8; e.y = 8; });
    S.step(2);
  });
  const desk = await page.evaluate(() => {
    const S = __SQ;
    const ink = S.radioInk();
    const c = document.getElementById('game').getBoundingClientRect();
    const screenH = ink.box.h * (c.height / 224);
    return {
      text: ink.lines.map((l) => l.text).join(' '),
      w: ink.box.w,
      h: ink.box.h,
      y: ink.box.y,
      ratio: screenH / window.innerHeight,
    };
  });
  expect(desk.text).toContain('RADIO:');
  expect(desk.text).toContain('ACADEMY');
  expect(desk.text).toContain('KEY IS NOT BY THE GATE');
  expect(desk.w).toBe(320);
  expect(desk.h).toBeLessThanOrEqual(28);
  expect(desk.y).toBeGreaterThan(140);
  expect(desk.ratio).toBeLessThan(0.13);
  await page.screenshot({ path: `${ART}/b45-academy-desktop.png` });

  const arrivals = await page.evaluate(() => {
    const S = __SQ;
    const rows = [
      ['ros', 'ros_yard'],
      ['ramshackle', 'ram_dock'],
      ['drill', 'ds_camp'],
      ['skippy', 'home'],
    ];
    return rows.map(([story, area]) => {
      S.G.state = 'play';
      S.G.story = story;
      S.G.paused = false;
      S.flag('oe_' + area);
      S.flag('woke');
      S.warp(area, 8, 6, 1);
      quiet();
      S.G.banner = story.toUpperCase() + ' ARRIVES';
      S.G.bannerT = 2;
      S.G.toastT = 0;
      S.step(1);
      const ink = S.bannerInk();
      const tall = (S.frameInk() || []).filter((f) => f.box && f.box.h > 40);
      return {
        story,
        objective: S.objective(),
        h: ink && ink.box.h,
        w: ink && ink.box.w,
        y: ink && ink.box.y,
        text: ink ? ink.lines.map((l) => l.text).join(' ') : '',
        tall: tall.map((f) => f.kind),
      };
    });
  });
  for (const row of arrivals) {
    expect(row.text, row.story).toContain('ARRIVES');
    expect(row.w, row.story).toBe(320);
    expect(row.h, row.story).toBeLessThanOrEqual(18);
    expect(row.y, row.story).toBeGreaterThan(150);
    if (row.story !== 'skippy') expect(row.objective, row.story).toBeTruthy();
    expect(row.tall, row.story).toEqual([]);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('one keyboard BOARD press shows one steady runner', async ({ page }) => {
  const errors = await boot(page);
  await parkBoard(page);
  await page.locator('#game').focus();
  await page.keyboard.down('KeyC');
  await page.keyboard.up('KeyC');
  const frames = await page.evaluate(() => {
    const S = __SQ;
    const out = [];
    for (let i = 0; i < 130; i++) {
      S.step(1);
      const ink = S.toastInk();
      const boxes = (S.frameInk() || []).filter((f) => f.kind === 'toast').length;
      out.push({
        text: S.toast().text,
        t: S.toast().t,
        n: S.toast().n,
        y: ink ? ink.box.y : -1,
        h: ink ? ink.box.h : 0,
        w: ink ? ink.box.w : 0,
        boxes,
      });
    }
    return out;
  });
  const seen = traceOf(frames);
  expect(seen.n).toBe(1);
  expect(seen.text).toBe('RIDER BOARD.');
  expect(seen.ys).toEqual([seen.ys[0]]);
  expect(seen.reset).toBe(0);
  expect(seen.cameBack).toBe(false);
  expect(seen.boxes).toBe(1);
    expect(seen.tall).toBe(false);
  expect(seen.wide).toBe(true);
  expect(frames.filter((f) => f.text).length).toBeGreaterThan(90);
  expect(frames[frames.length - 1].text).toBe('');
  await page.evaluate(() => {
    const S = __SQ;
    S.G.toastT = 1.2;
    S.G.toast = 'RIDER BOARD.';
    S.step(1);
  });
  await page.screenshot({ path: `${ART}/b45-board-desktop.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('the Academy runner sits above the controls', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'drill';
      S.G.paused = false;
      S.G.dsCalm = 0;
      S.G.dsShift = -3;
      S.flag('oe_ds_moon1');
      S.warp('ds_moon1', 6, 6, 0);
      quiet();
      S.G.dsCalm = 0;
      S.G.dsShift = -3;
      S.G.bannerT = 0;
      S.G.toastT = 0;
      S.ents.forEach((e) => { e.stun = 99; e.x = 8; e.y = 8; });
      S.step(2);
    });
    const phone = await page.evaluate(() => {
      const S = __SQ;
      const ink = S.radioInk();
      const c = document.getElementById('game').getBoundingClientRect();
      const sx = c.width / 320;
      const sy = c.height / 224;
      const screen = {
        left: c.left + ink.box.x * sx,
        top: c.top + ink.box.y * sy,
        right: c.left + (ink.box.x + ink.box.w) * sx,
        bottom: c.top + (ink.box.y + ink.box.h) * sy,
        h: ink.box.h * sy,
      };
      const hits = [];
      document.querySelectorAll('.srml-b, #stick').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || getComputedStyle(el).display === 'none') return;
        const ix = Math.min(screen.right, r.right) - Math.max(screen.left, r.left);
        const iy = Math.min(screen.bottom, r.bottom) - Math.max(screen.top, r.top);
        if (ix > 1 && iy > 1) hits.push((el.dataset && el.dataset.b) || el.id);
      });
      return {
        text: ink.lines.map((l) => l.text).join(' '),
        h: ink.box.h,
        ratio: screen.h / window.innerHeight,
        hits,
      };
    });
    expect(phone.text).toContain('YOU ARE AT THE ACADEMY');
    expect(phone.h).toBeLessThanOrEqual(28);
    expect(phone.ratio).toBeLessThan(0.13);
    expect(phone.hits).toEqual([]);
    await page.screenshot({ path: `${ART}/b45-academy-phone.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('one touch of BOARD, plus the extra mouse event, is one message', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await parkBoard(page);
    const label = await page.locator('[data-b="board"]').innerText();
    expect(label.trim()).toBe('BOARD');
    const btn = page.locator('[data-b="board"]');
    await btn.dispatchEvent('pointerdown', { pointerType: 'touch', pointerId: 1, isPrimary: true, bubbles: true });
    await btn.dispatchEvent('pointerup', { pointerType: 'touch', pointerId: 1, isPrimary: true, bubbles: true });
    const mid = await page.evaluate(() => {
      const S = __SQ;
      S.step(40);
      return { n: S.toast().n, t: S.toast().t, text: S.toast().text };
    });
    expect(mid.n).toBe(1);
    expect(mid.text).toBe('RIDER BOARD.');
    await btn.dispatchEvent('pointerdown', { pointerType: 'mouse', pointerId: 2, isPrimary: true, bubbles: true });
    await btn.dispatchEvent('pointerup', { pointerType: 'mouse', pointerId: 2, isPrimary: true, bubbles: true });
    const frames = await page.evaluate(() => {
      const S = __SQ;
      const out = [];
      for (let i = 0; i < 90; i++) {
        S.step(1);
        const ink = S.toastInk();
        out.push({
          text: S.toast().text,
          t: S.toast().t,
          n: S.toast().n,
          y: ink ? ink.box.y : -1,
          h: ink ? ink.box.h : 0,
          w: ink ? ink.box.w : 0,
          boxes: (S.frameInk() || []).filter((f) => f.kind === 'toast').length,
        });
      }
      return out;
    });
    const seen = traceOf(frames);
    expect(seen.n).toBe(1);
    expect(seen.reset).toBe(0);
    expect(seen.cameBack).toBe(false);
    expect(seen.boxes).toBeLessThanOrEqual(1);
    expect(seen.ys.length).toBeLessThanOrEqual(1);
    const hit = await page.evaluate(() => {
      const S = __SQ;
      S.G.toast = 'RIDER BOARD.';
      S.G.toastT = 1.4;
      S.step(1);
      const ink = S.toastInk();
      const c = document.getElementById('game').getBoundingClientRect();
      const sx = c.width / 320;
      const sy = c.height / 224;
      const screen = {
        left: c.left + ink.box.x * sx,
        top: c.top + ink.box.y * sy,
        right: c.left + (ink.box.x + ink.box.w) * sx,
        bottom: c.top + (ink.box.y + ink.box.h) * sy,
        h: ink.box.h * sy,
      };
      const hits = [];
      document.querySelectorAll('.srml-b, #stick').forEach((el) => {
        const r = el.getBoundingClientRect();
        if (r.width < 2 || r.height < 2 || getComputedStyle(el).display === 'none') return;
        const ix = Math.min(screen.right, r.right) - Math.max(screen.left, r.left);
        const iy = Math.min(screen.bottom, r.bottom) - Math.max(screen.top, r.top);
        if (ix > 1 && iy > 1) hits.push((el.dataset && el.dataset.b) || el.id);
      });
      return { hits, ratio: screen.h / window.innerHeight };
    });
    expect(hit.hits).toEqual([]);
    expect(hit.ratio).toBeLessThan(0.12);
    await page.screenshot({ path: `${ART}/b45-board-phone.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
