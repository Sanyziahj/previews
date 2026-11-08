import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

const SKIPPY_SAVE = JSON.stringify({
  z: 'bow',
  v: 1,
  area: 'home',
  x: 160,
  y: 160,
  dir: 0,
  hp: 6,
  maxHp: 6,
  pieces: 0,
  coins: 42,
  arrows: 3,
  items: { baton: true },
  keys: {},
  bigKeys: {},
  flags: { woke: true, santt_met: true },
  party: [],
  shards: 1,
  time: 88,
  visited: { home: true, desert: true },
});

function track(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push('console: ' + m.text());
  });
  return errors;
}

async function boot(page, { save } = {}) {
  await page.addInitScript((payload) => {
    window.__SQ_DEBUG = true;
    if (payload) localStorage.setItem('sq_save_v1', payload);
  }, save || null);
  const errors = track(page);
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ && document.getElementById('sr-live'));
  await page.evaluate(() => __SQ.setManual(true));
  await page.evaluate(() => __SQ.step(8));
  return errors;
}

async function live(page) {
  return page.locator('#sr-live').innerText();
}

async function tap(page, key) {
  await page.evaluate((k) => {
    __SQ.press(k, true);
    __SQ.step(2);
    __SQ.press(k, false);
    __SQ.step(2);
  }, key);
  await page.waitForTimeout(280);
}

async function mashIntro(page) {
  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 90; i++) {
      S.skipText();
      S.press('talk', true);
      S.step(2);
      S.press('talk', false);
      S.step(3);
      if (S.party.includes('nuke') && !S.script) break;
    }
  });
}

async function startRos(page) {
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'down');
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'attack');
  await mashIntro(page);
}

test('chapter select lists Skippy, ROS, and SOON riders', async ({ page }) => {
  const errors = await boot(page);
  const text = await live(page);
  expect(text).toContain("SKIPPY'S QUEST");
  expect(text).toContain('THE ROGUE OUTLAW SHERIFF');
  expect(text).toContain('SANTT');
  expect(text).toContain('SPIKE');
  expect(text).toContain('DRILL SERGEANT');
  expect(text).toContain('RONIN');
  expect(text).toContain('RAMSHACKLE');
  expect(text).toContain('SOON');
  expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex,nofollow');
  const state = await page.evaluate(() => __SQ.G.state);
  expect(state).toBe('stories');
  await page.screenshot({ path: `${ART}/ros-chapter-select.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('ROS chapter starts, Nuke follows, wanted meter and a dungeon work', async ({ page }) => {
  const errors = await boot(page);
  await startRos(page);
  const started = await page.evaluate(() => ({
    story: __SQ.story(),
    state: __SQ.G.state,
    hero: __SQ.PID(),
    area: __SQ.A.id,
    nuke: __SQ.party.includes('nuke'),
    comp: __SQ.comp.id,
    on: __SQ.comp.on,
    script: __SQ.script,
  }));
  expect(started.story).toBe('ros');
  expect(started.hero).toBe('ros');
  expect(started.state).toBe('play');
  expect(started.area).toBe('ros_square');
  expect(started.nuke).toBe(true);
  expect(started.comp).toBe('nuke');
  expect(started.on).toBe(true);
  expect(started.script).toBe(false);

  const follow = await page.evaluate(() => {
    const S = __SQ;
    const before = Math.abs(S.comp.x - S.P.x);
    S.press('right', true);
    S.step(50);
    S.press('right', false);
    S.step(40);
    return {
      before,
      after: Math.hypot(S.comp.x - S.P.x, S.comp.y - S.P.y),
      moved: Math.abs(S.P.x - 0) > 0,
    };
  });
  expect(follow.after).toBeLessThan(70);

  const sniff = await page.evaluate(() => {
    const S = __SQ;
    S.warp('ros_desert', 4, 14, 0);
    S.step(20);
    return { clue: !!S.flags.clue_hench, area: S.A.id };
  });
  expect(sniff.area).toBe('ros_desert');
  expect(sniff.clue).toBe(true);

  const wanted = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8; i++) {
      S.skipText();
      S.press('talk', true);
      S.step(2);
      S.press('talk', false);
      S.step(3);
      if (!S.script) break;
    }
    S.warp('ros_desert', 22, 8, 3);
    S.step(8);
    const start = S.wanted();
    S.step(200);
    const spotted = S.wanted();
    return {
      start,
      spotted,
      script: S.script,
      live: document.getElementById('sr-live').textContent,
    };
  });
  expect(wanted.script).toBe(false);
  expect(wanted.spotted).toBeGreaterThan(wanted.start);
  expect(wanted.spotted).toBeGreaterThan(0.8);
  expect(wanted.live).toContain('WANTED');
  expect(wanted.live).toMatch(/WANTED [1-9]/);
  await page.screenshot({ path: `${ART}/ros-desert-desktop.png` });
  const hidden = await page.evaluate(() => {
    const S = __SQ;
    S.warp('ros_desert', 9, 6, 0);
    S.step(220);
    return S.wanted();
  });
  expect(hidden).toBeLessThan(wanted.spotted);

  const dungeon = await page.evaluate(() => {
    const S = __SQ;
    S.warp('rs1', 10, 9, 1);
    S.step(8);
    return {
      id: S.A.id,
      dungeon: S.A.dungeon,
      name: S.A.name,
      foes: S.ents.filter((e) => !e.dead).length,
    };
  });
  expect(dungeon.id).toBe('rs1');
  expect(dungeon.dungeon).toBe('storm');
  expect(dungeon.name).toContain('SANDSTORM');
  expect(dungeon.foes).toBeGreaterThan(0);
  await page.screenshot({ path: `${ART}/ros-dungeon.png` });

  await page.evaluate(() => {
    __SQ.warp('ros_keys', 15, 8, 1);
    __SQ.step(8);
  });
  const keys = await live(page);
  expect(keys).toContain('LIME KEYS');
  await page.screenshot({ path: `${ART}/ros-lime-keys.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('saves stay separate and Skippy save is untouched', async ({ page }) => {
  const errors = await boot(page, { save: SKIPPY_SAVE });
  await startRos(page);
  await page.evaluate(() => {
    __SQ.warp('ros_desert', 12, 8, 0);
    __SQ.step(5);
    __SQ.save();
  });
  const keys = await page.evaluate((original) => {
    return {
      skippy: localStorage.getItem('sq_save_v1'),
      ros: localStorage.getItem('sq_save_ros_v1'),
      original,
    };
  }, SKIPPY_SAVE);
  expect(keys.skippy).toBe(SKIPPY_SAVE);
  expect(keys.ros).toBeTruthy();
  const rosSave = JSON.parse(keys.ros);
  expect(rosSave.area.startsWith('ros_') || rosSave.area.startsWith('r')).toBe(true);
  expect(rosSave.coins).toBe(0);

  await page.reload();
  await page.waitForFunction(() => window.__SQ);
  await page.evaluate(() => {
    __SQ.setManual(true);
    __SQ.step(25);
  });
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'attack');
  const skippy = await page.evaluate(() => ({
    story: __SQ.story(),
    state: __SQ.G.state,
    area: __SQ.A.id,
    hero: __SQ.PID(),
    coins: __SQ.P.coins,
    save: localStorage.getItem('sq_save_v1'),
  }));
  expect(skippy.story).toBe('skippy');
  expect(skippy.state).toBe('play');
  expect(skippy.area).toBe('home');
  expect(skippy.hero).toBe('skippy');
  expect(skippy.coins).toBe(42);
  expect(JSON.parse(skippy.save).coins).toBe(42);
  expect(JSON.parse(skippy.save).items.baton).toBe(true);
  expect(JSON.parse(skippy.save).area).toBe('home');

  await page.reload();
  await page.waitForFunction(() => window.__SQ);
  await page.evaluate(() => {
    __SQ.setManual(true);
    __SQ.step(25);
  });
  await tap(page, 'down');
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'attack');
  const again = await page.evaluate((original) => ({
    story: __SQ.story(),
    area: __SQ.A.id,
    hero: __SQ.PID(),
    skippy: localStorage.getItem('sq_save_v1'),
    original,
  }), SKIPPY_SAVE);
  expect(again.story).toBe('ros');
  expect(again.hero).toBe('ros');
  expect(again.area.startsWith('ros_') || again.area.startsWith('r')).toBe(true);
  const againSave = JSON.parse(again.skippy);
  expect(againSave.coins).toBe(42);
  expect(againSave.items.baton).toBe(true);
  expect(againSave.area).toBe('home');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('Skippy new game is unchanged', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'attack');
  const skippy = await page.evaluate(() => ({
    story: __SQ.story(),
    state: __SQ.G.state,
    area: __SQ.A.id,
    hero: __SQ.PID(),
    name: __SQ.A.name,
    script: __SQ.script,
  }));
  expect(skippy.story).toBe('skippy');
  expect(skippy.state).toBe('play');
  expect(skippy.area).toBe('dream');
  expect(skippy.hero).toBe('skippy');
  expect(skippy.script).toBe(true);
  expect(skippy.name).toContain('BOOT');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('frame time stays near a 60fps step', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => __SQ.setManual(false));
  await page.waitForTimeout(2500);
  const frames = await page.evaluate(() => __SQ.frames());
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length;
  const sorted = frames.slice().sort((a, b) => a - b);
  const p95 = sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.95))];
  fs.writeFileSync(
    `${ART}/frame-timings.json`,
    JSON.stringify({ samples: frames.length, avgMs: avg, p95Ms: p95, maxMs: sorted[sorted.length - 1] }, null, 2),
  );
  expect(frames.length).toBeGreaterThan(30);
  expect(avg).toBeLessThan(34);
});

async function phoneLayout(page, file) {
  const errors = track(page);
  await page.addInitScript(() => {
    window.__SQ_DEBUG = true;
  });
  await page.goto(GAME);
  await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
  await page.waitForTimeout(400);
  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('#game').getBoundingClientRect();
    const buttons = [...document.querySelectorAll('#srml-menu .srml-b, #srml-act .srml-b, #stick')].map((el) => {
      const r = el.getBoundingClientRect();
      return { label: (el.textContent || '').trim(), x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const overlap = buttons.filter((b) => {
      const ix = Math.min(b.x + b.w, canvas.right) - Math.max(b.x, canvas.left);
      const iy = Math.min(b.y + b.h, canvas.bottom) - Math.max(b.y, canvas.top);
      return ix > 8 && iy > 8;
    });
    return {
      canvas: { x: canvas.x, y: canvas.y, w: canvas.width, h: canvas.height },
      labels: buttons.map((b) => b.label),
      sizes: buttons.map((b) => Math.round(Math.min(b.w, b.h))),
      overlap: overlap.map((b) => b.label),
    };
  });
  expect(layout.labels.join(' ')).toContain('BACK');
  expect(layout.labels.join(' ')).toContain('ATTACK');
  expect(layout.labels.join(' ')).toContain('TALK');
  expect(Math.min(...layout.sizes.filter((n) => n > 0))).toBeGreaterThan(40);
  expect(layout.overlap).toEqual([]);
  const back = page.locator('#srml-menu .srml-bk');
  await back.dispatchEvent('pointerdown');
  const pressed = await back.evaluate((el) => ({
    on: el.classList.contains('on'),
    transform: getComputedStyle(el).transform,
  }));
  expect(pressed.on).toBe(true);
  expect(pressed.transform).not.toBe('none');
  await back.dispatchEvent('pointerup');
  const attack = await page.evaluate(() => !!(window.__SQ && __SQ.I && __SQ.I.attack));
  expect(attack).toBe(false);
  await page.evaluate(() => {
    const S = __SQ;
    S.setManual(true);
    S.G.state = 'play';
    S.G.story = 'ros';
    S.warp('ros_desert', 22, 8, 3);
    S.step(180);
  });
  await page.screenshot({ path: file, fullPage: true });
  expect(errors, errors.join('\n')).toEqual([]);
}

test.describe('phone 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('controls sit off the action and BACK does not attack', async ({ page }) => {
    await phoneLayout(page, `${ART}/ros-phone-390x844.png`);
  });
});

test.describe('phone 844x390', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('side gutters keep buttons off the screen', async ({ page }) => {
    await phoneLayout(page, `${ART}/ros-phone-844x390.png`);
  });
});
