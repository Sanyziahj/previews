import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

const LONGEST = [
  "THE LAND DEAL IS IN A MACHINE UNDER THE STORM. YOUR BOARD WAS SEIZED AT GOLDEN STONE. YOUR ROPE IS IN THE LABELED LOCKER ON THE EAST WALL. SOMEONE MOVED IT.",
  "THREE WHITE FACES. NOT THE BOY. A LOG: OBSERVER NODE. OVERLORD LINK. SPONSOR INK, ANDROMEDA. SOMEONE IS WATCHING THE LIGHT IN HIM. THAT IS ALL I READ.",
  "RADIO: YOU ARE AT THE ACADEMY. THIS ALREADY HAPPENED.",
];

function inside(line, box) {
  return line.x >= box.x + 2
    && line.y >= box.y + 2
    && line.x + line.w <= box.x + box.w - 2
    && line.y + line.h <= box.y + box.h - 2;
}

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.__SQ_DEBUG = true; });
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ);
  await page.evaluate(() => document.fonts && document.fonts.ready);
  await page.locator('#game').focus();
  return errors;
}

async function readPages(page, who, text) {
  const count = await page.evaluate(({ who, text }) => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.paused = false;
    S.say(who, text);
    S.step(2);
    return S.speechInk().pages;
  }, { who, text });
  const pages = [];
  for (let i = 0; i < count; i++) {
    pages.push(await page.evaluate((i) => {
      __SQ.dlg.page = i;
      __SQ.dlg.n = 999;
      __SQ.step(1);
      return __SQ.speechInk();
    }, i));
  }
  return pages;
}

function expectInside(ink, label) {
  expect(ink && ink.lines && ink.lines.length, label).toBeGreaterThan(0);
  for (const line of ink.lines) {
    expect(inside(line, ink.box), `${label} ${line.text}`).toBe(true);
  }
}

async function checkSurface(page, shot) {
  for (const text of LONGEST) {
    for (const who of ['skippy', 'sys']) {
      const pages = await readPages(page, who, text);
      expect(pages.length).toBeGreaterThan(0);
      for (const ink of pages) expectInside(ink, who);
    }
  }
  if (shot) {
    await readPages(page, 'skippy', LONGEST[0]);
    await page.screenshot({ path: shot.talk });
  }
  const shop = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.paused = false;
    S.say('sys', ' ');
    S.dlg && (S.dlg.n = 0);
    S.G.toastT = 0;
    S.openShop('cadet');
    S.step(2);
    return S.shopInk();
  });
  expectInside(shop, 'cadet');
  const choice = await page.evaluate(() => {
    const S = __SQ;
    S.G.choice = { id: 'tale_drill_choice', sel: 0 };
    S.step(1);
    return S.choiceInk();
  });
  expectInside(choice, 'choice');
  const banner = await page.evaluate(() => {
    const S = __SQ;
    S.G.choice = null;
    S.skipText();
    S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    S.G.banner = 'MOON COLONY REVOLT';
    S.G.bannerT = 3;
    S.step(1);
    return S.bannerInk();
  });
  expectInside(banner, 'banner');
  const toast = await page.evaluate((text) => {
    const S = __SQ;
    S.G.toast = text;
    S.G.toastT = 3;
    S.step(1);
    return S.toastInk();
  }, LONGEST[2]);
  expectInside(toast, 'toast');
  const radio = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'drill';
    S.G.paused = false;
    S.G.toastT = 0;
    S.G.dsCalm = 0;
    S.flag('oe_ds_moon1');
    S.warp('ds_moon1', 4, 4, 0);
    for (let i = 0; i < 6; i++) { S.skipText(); S.step(1); }
    S.G.dsCalm = 0;
    S.step(2);
    return S.radioInk();
  });
  expectInside(radio, 'radio');
  if (shot) await page.screenshot({ path: shot.radio });
}

test.describe('speech stays in the box on a phone', () => {
  test.use({ viewport: { width: 844, height: 390 }, deviceScaleFactor: 3, hasTouch: true, isMobile: true });
  test('long lines page inside the box at every landscape size', async ({ page }) => {
    const errors = await boot(page);
    const shots = {
      '844x390': { talk: `${ART}/b31b-talk-844.png`, radio: `${ART}/b31b-radio-844.png` },
      '740x360': { talk: `${ART}/b31b-talk-740.png`, radio: `${ART}/b31b-radio-740.png` },
    };
    for (const [w, h] of [[844, 390], [932, 430], [667, 375], [740, 360], [390, 844]]) {
      await page.setViewportSize({ width: w, height: h });
      await checkSurface(page, shots[`${w}x${h}`]);
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test('speech stays in the box on the desktop', async ({ page }) => {
  const errors = await boot(page);
  await page.setViewportSize({ width: 1280, height: 800 });
  await checkSurface(page);
  expect(errors, errors.join('\n')).toEqual([]);
});
