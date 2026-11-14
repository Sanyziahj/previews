import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.__SQ_DEBUG = true; });
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ);
  await page.evaluate(() => {
    __SQ.setManual(true);
    __SQ.step(4);
    window.paintTeller = function (area, tileX, tileY, dir, flags) {
      const S = window.__SQ;
      localStorage.setItem('sq_save_v1', JSON.stringify({
        v: 1,
        z: 'bow',
        area,
        x: (tileX + 0.5) * 16,
        y: (tileY + 0.5) * 16,
        dir,
        hp: 6,
        maxHp: 6,
        pieces: 0,
        coins: 50,
        arrows: 10,
        items: { bow: true },
        keys: {},
        bigKeys: {},
        flags,
        party: [],
        shards: 0,
        visited: { [area]: true },
      }));
      S.G.story = 'skippy';
      S.G.paused = false;
      const ok = S.load();
      S.ents.forEach((e) => { e.stun = 99; e.vx = 0; e.vy = 0; e.x = 8; e.y = 8; });
      S.G.bannerT = 0;
      S.G.saveT = 0;
      S.G.toastT = 0;
      S.G.hail = '';
      S.G.hailT = 0;
      S.G.shake = 0;
      S.P.x = (tileX + 0.5) * 16;
      S.P.y = (tileY + 0.5) * 16;
      S.P.dir = dir;
      S.step(40);
      S.ents.forEach((e) => { e.stun = 99; e.vx = 0; e.vy = 0; e.x = 8; e.y = 8; });
      S.G.bannerT = 0;
      S.G.saveT = 0;
      S.G.toastT = 0;
      S.G.hail = '';
      S.G.hailT = 0;
      S.G.shake = 0;
      S.step(1);
      return ok;
    };
    window.spriteSample = function (id) {
      const S = window.__SQ;
      const npc = S.npcs.find((n) => n.id === id);
      if (!npc) return { found: false };
      const g = document.getElementById('game').getContext('2d');
      const ax = Math.round(S.cam.x);
      const ay = Math.round(S.cam.y);
      const sx = Math.round(npc.x - ax);
      const sy = Math.round(npc.y - ay + 24);
      const x = Math.max(0, Math.min(298, sx - 13));
      const y = Math.max(0, Math.min(188, sy - 32));
      const data = g.getImageData(x, y, 26, 36).data;
      let ink = 0;
      let teal = 0;
      let orange = 0;
      let purple = 0;
      let brown = 0;
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const gc = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 16) continue;
        const gray = Math.abs(r - gc) < 14 && Math.abs(gc - b) < 18 && r > 90 && r < 210;
        const sand = r > 200 && gc > 170 && b > 110 && b < 190;
        if (!gray && !sand) ink++;
        if (r > 10 && r < 70 && gc > 130 && gc < 200 && b > 120 && b < 200) teal++;
        if (r > 180 && gc > 80 && gc < 170 && b > 10 && b < 90) orange++;
        if (r > 80 && r < 180 && gc > 30 && gc < 120 && b > 150) purple++;
        if (r > 90 && r < 160 && gc > 40 && gc < 100 && b > 10 && b < 70) brown++;
      }
      return {
        found: true,
        vis: npc.vis !== false && npc.alpha !== 0,
        look: npc.look,
        id: npc.id,
        x: npc.x,
        y: npc.y,
        ink,
        teal,
        orange,
        purple,
        brown,
        area: S.A.id,
      };
    };
  });
  await page.locator('#game').focus();
  return errors;
}

function shot(page, name) {
  return page.locator('#game').screenshot({ path: `${ART}/${name}.png` });
}

test('build is b46 and the page stays unlisted once', async ({ page }) => {
  const errors = await boot(page);
  const cache = await page.evaluate(() => document.querySelector('script').textContent);
  expect(cache).toContain('window.__SQ_BUILD="b46"');
  expect(cache).toContain('v=b46');
  expect(await page.evaluate(() => __SQ.build())).toBe('b46');
  expect(await page.locator('meta[name="robots"]').count()).toBe(1);
  expect(await page.locator('meta[name="robots"]').first().getAttribute('content')).toBe('noindex,nofollow');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a post-chapter-5 moon save draws Drill, even without the exact flag', async ({ page }) => {
  const errors = await boot(page);
  const exact = await page.evaluate(() => {
    const ok = paintTeller('moon', 10.5, 9.5, 1, {
      woke: true,
      oe_moon: true,
      ch5_done: true,
      drill_joined: true,
      tale_ros: true,
      tale_ram: true,
    });
    const sample = spriteSample('drill_teller');
    const others = __SQ.npcs.filter((n) => n.vis !== false && n.alpha !== 0).map((n) => n.id);
    return { ok, sample, others, objective: __SQ.objective(), saves: Object.keys(localStorage).filter((k) => k.indexOf('sq_save_') === 0) };
  });
  expect(exact.ok).toBe(true);
  expect(exact.sample.found).toBe(true);
  expect(exact.sample.vis).toBe(true);
  expect(exact.sample.look).toBe('drill');
  expect(exact.sample.area).toBe('moon');
  expect(exact.sample.ink).toBeGreaterThan(40);
  expect(exact.sample.teal + exact.sample.orange + exact.sample.brown).toBeGreaterThan(8);
  expect(exact.others).toContain('drill_teller');
  expect(exact.others).not.toContain('drill');
  expect(exact.objective).toBe('MOON COLONY: DRILL HAS A TALE');
  expect(exact.saves).toEqual(expect.arrayContaining(['sq_save_v1']));
  await shot(page, 'moon_plaza_drill_desktop');

  const later = await page.evaluate(() => {
    const ok = paintTeller('moon', 10.5, 9.5, 1, {
      woke: true,
      oe_moon: true,
      ch8_done: true,
      drill_joined: true,
      tale_ros: true,
      tale_ram: true,
    });
    const sample = spriteSample('drill_teller');
    return { ok, sample, ch5: !!__SQ.flags.ch5_done, ch8: !!__SQ.flags.ch8_done };
  });
  expect(later.ok).toBe(true);
  expect(later.ch5).toBe(false);
  expect(later.ch8).toBe(true);
  expect(later.sample.vis).toBe(true);
  expect(later.sample.look).toBe('drill');
  expect(later.sample.ink).toBeGreaterThan(40);
  expect(later.sample.teal + later.sample.orange).toBeGreaterThan(6);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('Ram stands on the seaport dock after chapter 3, and a later chapter still shows him', async ({ page }) => {
  const errors = await boot(page);
  const exact = await page.evaluate(() => {
    const ok = paintTeller('seaport', 19.5, 15, 2, {
      woke: true,
      oe_seaport: true,
      ch3_done: true,
      tale_ros: true,
    });
    const sample = spriteSample('ram_teller');
    return { ok, sample, objective: __SQ.objective() };
  });
  expect(exact.ok).toBe(true);
  expect(exact.sample.found).toBe(true);
  expect(exact.sample.vis).toBe(true);
  expect(exact.sample.look).toBe('ramshackle');
  expect(exact.sample.area).toBe('seaport');
  expect(exact.sample.ink).toBeGreaterThan(40);
  expect(exact.sample.orange + exact.sample.purple).toBeGreaterThan(8);
  expect(exact.objective).toBe('THE SEAPORT: RAMSHACKLE HAS A TALE');
  await shot(page, 'seaport_ram_teller_desktop');

  const later = await page.evaluate(() => {
    const ok = paintTeller('seaport', 19.5, 15, 2, {
      woke: true,
      oe_seaport: true,
      ch6_done: true,
      tale_ros: true,
    });
    const sample = spriteSample('ram_teller');
    return { ok, sample, ch3: !!__SQ.flags.ch3_done, ch6: !!__SQ.flags.ch6_done };
  });
  expect(later.ok).toBe(true);
  expect(later.ch3).toBe(false);
  expect(later.ch6).toBe(true);
  expect(later.sample.vis).toBe(true);
  expect(later.sample.look).toBe('ramshackle');
  expect(later.sample.ink).toBeGreaterThan(40);
  expect(later.sample.orange + later.sample.purple).toBeGreaterThan(6);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone plaza', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('Drill and Ram are on screen on a phone', async ({ page }) => {
    const errors = await boot(page);
    await page.evaluate(() => {
      paintTeller('moon', 10.5, 9.5, 1, {
        woke: true,
        oe_moon: true,
        ch5_done: true,
        drill_joined: true,
        tale_ros: true,
        tale_ram: true,
      });
    });
    const drill = await page.evaluate(() => spriteSample('drill_teller'));
    expect(drill.vis).toBe(true);
    expect(drill.ink).toBeGreaterThan(40);
    expect(drill.teal + drill.orange + drill.brown).toBeGreaterThan(8);
    await shot(page, 'moon_plaza_drill_phone');

    await page.evaluate(() => {
      paintTeller('seaport', 19.5, 15, 2, {
        woke: true,
        oe_seaport: true,
        ch3_done: true,
        tale_ros: true,
      });
    });
    const ram = await page.evaluate(() => spriteSample('ram_teller'));
    expect(ram.vis).toBe(true);
    expect(ram.ink).toBeGreaterThan(40);
    expect(ram.orange + ram.purple).toBeGreaterThan(8);
    await shot(page, 'seaport_ram_teller_phone');
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
