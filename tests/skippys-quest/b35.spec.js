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
  await page.locator('#game').focus();
  return errors;
}

async function press(page, key) {
  await page.keyboard.down(key);
  await page.waitForTimeout(50);
  await page.keyboard.up(key);
  await page.waitForTimeout(40);
}

async function quiet(page) {
  for (let i = 0; i < 8; i++) {
    const open = await page.evaluate(() => !!(__SQ.script || __SQ.dlg) || __SQ.G.state === 'endcard');
    if (!open) return;
    await press(page, 'Space');
    await page.waitForTimeout(80);
  }
}

async function finishCard(page, chap, flags) {
  await page.evaluate(({ chap, flags }) => {
    const S = __SQ;
    S.G.story = 'skippy';
    S.G.paused = false;
    S.G.trans = null;
    S.G.state = 'play';
    S.flag('oe_hub');
    S.flag('woke');
    for (const f of flags) S.flag(f);
    S.warp('hub', 9.5, 7.2, 1);
    S.G.chap = chap;
    S.G.st = 3;
    S.G.state = 'endcard';
  }, { chap, flags });
  await page.locator('#game').focus();
  await page.waitForTimeout(400);
  await press(page, 'KeyX');
  await page.waitForFunction(() => __SQ.G.state === 'play' && __SQ.A.id === 'hub', null, { timeout: 8000 });
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => __SQ.G.state === 'play' && !__SQ.script && !__SQ.dlg)) break;
    await quiet(page);
  }
  await page.waitForTimeout(1500);
}

async function stepToward(page, x, y, close) {
  const here = await page.evaluate(({ x, y }) => ({
    dx: x - __SQ.P.x,
    dy: y - __SQ.P.y,
    dist: Math.hypot(x - __SQ.P.x, y - __SQ.P.y),
    area: __SQ.A.id,
    talk: !!(__SQ.script || __SQ.dlg),
  }), { x, y });
  if (here.talk || here.area !== 'hub' || here.dist <= close) return here;
  const key = Math.abs(here.dx) > Math.abs(here.dy)
    ? (here.dx > 0 ? 'ArrowRight' : 'ArrowLeft')
    : (here.dy > 0 ? 'ArrowDown' : 'ArrowUp');
  await press(page, key);
  return here;
}

test.describe('chapter clears return to the portal nexus', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('the seaport clear lands with Cash, and Sakura starts only from its portal', async ({ page }) => {
    test.setTimeout(90000);
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await finishCard(page, 2, ['ch1_done', 'ch2_done', 'oe_seaport']);
    await page.screenshot({ path: `${ART}/b35-nexus-after-seaport.png` });
    const room = await page.evaluate(() => {
      const ink = __SQ.worldInk();
      const keys = ink.map((w) => w.t + '@' + w.x + ',' + w.y);
      const props = (__SQ.A.props || []).filter((p) => p.k === 'portal');
      return {
        name: __SQ.A.name,
        area: __SQ.A.id,
        cash: __SQ.npcs.some((n) => n.id === 'wizard'),
        texts: ink.map((w) => w.t),
        dupes: keys.filter((k, i) => keys.indexOf(k) !== i),
        whole: ink.every((w) => w.x === Math.round(w.x) && w.y === Math.round(w.y)),
        doors: props.map((p) => ({
          label: p.label,
          open: !p.need || !!__SQ.flags[p.need],
          x: p.x,
          y: p.y,
        })),
      };
    });
    expect(room.area).toBe('hub');
    expect(room.name).toBe('THE PORTAL NEXUS');
    expect(room.cash).toBe(true);
    expect(room.dupes, JSON.stringify(room.dupes)).toEqual([]);
    expect(room.whole).toBe(true);
    expect(room.texts).toEqual(expect.arrayContaining(['DESERT', 'SEAPORT', 'SAKURA', 'LOCKED']));
    expect(room.texts.filter((t) => t === 'LOCKED').length).toBe(6);
    const locked = room.doors.find((d) => d.label === 'CASINO');
    const sakura = room.doors.find((d) => d.label === 'SAKURA');
    expect(locked.open).toBe(false);
    expect(sakura.open).toBe(true);
    const lockedAt = { x: locked.x * 16 + 8, y: locked.y * 16 + 8 };
    let lockedHere = null;
    for (let i = 0; i < 30; i++) {
      lockedHere = await stepToward(page, lockedAt.x, lockedAt.y, 16);
      if (lockedHere.dist <= 16) break;
    }
    expect(lockedHere.dist, JSON.stringify(lockedHere)).toBeLessThan(22);
    const face = await page.evaluate(() => __SQ.faces());
    expect(face.kind || '').not.toBe('portal');
    await press(page, 'KeyE');
    await page.waitForTimeout(400);
    expect(await page.evaluate(() => __SQ.A.id)).toBe('hub');
    const sakuraAt = { x: sakura.x * 16 + 8, y: sakura.y * 16 + 8 };
    for (let i = 0; i < 36; i++) {
      const here = await stepToward(page, sakuraAt.x, sakuraAt.y, 16);
      if (here.area !== 'hub' || here.dist <= 16) break;
    }
    expect(await page.evaluate(() => __SQ.A.id)).toBe('hub');
    await press(page, 'KeyE');
    await page.waitForFunction(() => __SQ.A.id === 'village', null, { timeout: 8000 });
    await quiet(page);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${ART}/b35-sakura-from-portal.png` });
    const arrived = await page.evaluate(() => ({ area: __SQ.A.id, name: __SQ.A.name }));
    expect(arrived.area).toBe('village');
    expect(arrived.name).toBe('SAKURA VILLAGE');
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('a later chapter clear also returns to the nexus instead of the next realm', async ({ page }) => {
    const errors = await boot(page);
    await page.setViewportSize({ width: 844, height: 390 });
    await finishCard(page, 5, ['ch1_done', 'ch2_done', 'ch3_done', 'ch4_done', 'ch5_done', 'oe_moon']);
    const back = await page.evaluate(() => {
      const ink = __SQ.worldInk().map((w) => w.t);
      return { area: __SQ.A.id, name: __SQ.A.name, ink, cash: __SQ.npcs.some((n) => n.id === 'wizard') };
    });
    expect(back.area).toBe('hub');
    expect(back.name).toBe('THE PORTAL NEXUS');
    expect(back.cash).toBe(true);
    expect(back.ink).toContain('ORBIT');
    expect(back.ink).toContain('LOCKED');
    expect(back.ink).not.toContain('CROSSROAD');
    await page.waitForTimeout(600);
    expect(await page.evaluate(() => __SQ.A.id)).toBe('hub');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
