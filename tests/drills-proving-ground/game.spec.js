import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts';
const GAME = '/drills-proving-ground/index.html';
fs.mkdirSync(ART, { recursive: true });

function track(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return errors;
}

async function boot(page, query) {
  const errors = track(page);
  await page.goto(`${GAME}?${query}`);
  await page.waitForFunction(() => window.__DRILL__ && window.__DRILL__.ready);
  await page.waitForTimeout(250);
  return errors;
}

function overlaps(a, b) {
  if (!a || !b || !a.visible || !b.visible) return false;
  const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ix > 0.5 && iy > 0.5;
}

async function stick(page, sel, dx, dy, release) {
  await page.evaluate(({ sel, dx, dy, release }) => {
    const el = document.querySelector(sel);
    const r = el.getBoundingClientRect();
    const x = r.left + r.width / 2;
    const y = r.top + r.height / 2;
    const opt = (type, px, py) => new PointerEvent(type, {
      bubbles: true, cancelable: true, pointerId: 7, pointerType: 'touch', clientX: px, clientY: py, isPrimary: true,
    });
    el.dispatchEvent(opt('pointerdown', x, y));
    el.dispatchEvent(opt('pointermove', x + dx, y + dy));
    if (release) el.dispatchEvent(opt('pointerup', x + dx, y + dy));
  }, { sel, dx, dy, release });
}

test('desktop: menus, loadouts, third person, scope, shatter, pause', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('star-punch-save', 'keep'));
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = await boot(page, 'touch=0');
  expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex,nofollow');
  const src = fs.readFileSync('/workspace/drills-proving-ground/index.html', 'utf8')
    + fs.readFileSync('/workspace/drills-proving-ground/game.js', 'utf8');
  expect(src.toLowerCase()).not.toMatch(/\d+\s+space riders games/);
  expect(src.toLowerCase()).not.toContain('space riders games');
  expect(src.toLowerCase()).not.toContain('hoverboard');

  const hi = await page.evaluate(() => __DRILL__.highlight());
  expect(hi.sel).toMatch(/LET'S RIDE/);
  expect(hi.selOpacity).toBeGreaterThan(0.9);
  expect(hi.otherOpacity).toBeLessThan(0.6);
  expect(hi.selScale).toBeGreaterThan(1.03);

  await page.locator('#screen-title .menu-btn', { hasText: 'LOADOUT' }).hover();
  await page.waitForTimeout(180);
  const hi2 = await page.evaluate(() => __DRILL__.highlight());
  expect(hi2.sel).toMatch(/LOADOUT/);
  expect(hi2.selScale).toBeGreaterThan(1.03);
  expect(hi2.otherOpacity).toBeLessThan(0.6);

  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(160);
  expect((await page.evaluate(() => __DRILL__.highlight())).sel).toMatch(/LET'S RIDE/);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(180);
  expect(await page.locator('#screen-loadout').isVisible()).toBe(true);

  const kits = [
    ['Precision Rifle', 'rifle'],
    ['Stealth Carbine', 'stealth'],
    ['Laser Marksman', 'laser'],
    ['Heavy Launcher', 'heavy'],
  ];
  for (const [label, id] of kits) {
    await page.locator('#screen-loadout .menu-btn', { hasText: label }).click();
    await page.waitForTimeout(140);
    const st = await page.evaluate(() => __DRILL__.state());
    expect(st.loadout).toBe(id);
    const h = await page.evaluate(() => __DRILL__.highlight());
    expect(h.sel.toLowerCase()).toContain(id === 'rifle' ? 'rifle' : id);
    expect(h.selScale).toBeGreaterThan(1.03);
    expect(h.otherOpacity).toBeLessThan(0.6);
  }
  await page.locator('#screen-loadout .menu-btn', { hasText: 'Precision Rifle' }).click();
  await page.waitForTimeout(160);
  await page.screenshot({ path: `${ART}/proving-ground-loadout.png` });

  await page.locator('#screen-loadout .menu-btn', { hasText: 'CONTINUE' }).click();
  await page.waitForTimeout(150);
  await page.locator('#screen-courses .menu-btn', { hasText: 'Bullseye Lane' }).click();
  await page.waitForFunction(() => __DRILL__.state().mode === 'play');
  await page.waitForTimeout(200);

  const look = await page.evaluate(() => __DRILL__.sample());
  expect(look.scoped).toBe(false);
  expect(look.inFrame).toBe(true);
  expect(look.orange, JSON.stringify(look)).toBeGreaterThan(20);
  expect(look.teal, JSON.stringify(look)).toBeGreaterThan(15);
  await page.screenshot({ path: `${ART}/proving-ground-thirdperson.png` });

  const scoped = await page.evaluate(() => {
    const G = __DRILL__;
    G.setManual(true);
    G.setLoadout('rifle');
    G.setScope(true);
    G.aimAtNearest('head');
    G.step(2);
    return G.state();
  });
  expect(scoped.scoped).toBe(true);
  expect(scoped.fov).toBeLessThan(0.45);
  await page.screenshot({ path: `${ART}/proving-ground-scope.png` });
  const scopedShot = await page.evaluate(() => {
    const G = __DRILL__;
    G.fire();
    return G.state();
  });
  expect(scopedShot.lastShotScoped).toBe(true);
  expect(scopedShot.lastShot.kind).toBe('rifle');

  const traits = await page.evaluate(() => {
    const G = __DRILL__;
    G.setManual(true);
    G.startCourse(0);
    const out = {};
    for (const id of ['rifle', 'stealth', 'laser', 'heavy']) {
      G.setLoadout(id);
      G.setScope(false);
      G.aimAtNearest('body');
      G.fire();
      out[id] = G.state().lastShot;
    }
    return out;
  });
  expect(traits.rifle.kind).toBe('rifle');
  expect(traits.rifle.hitscan).toBe(false);
  expect(traits.rifle.drop).toBeGreaterThan(0);
  expect(traits.stealth.quiet).toBe(true);
  expect(traits.laser.hitscan).toBe(true);
  expect(traits.heavy.pierce).toBe(true);
  expect(traits.heavy.splash).toBeGreaterThan(1);

  const killed = await page.evaluate(() => {
    const G = __DRILL__;
    G.setScope(false);
    G.setLoadout('rifle');
    const before = G.state().targetsLeft;
    let burst = 0;
    let left = before;
    for (let n = 0; n < 6 && left >= before; n++) {
      G.aimAtNearest('body');
      G.fire();
      for (let i = 0; i < 24; i++) {
        G.step(1);
        const s = G.state();
        if (s.lastBurst > burst) burst = s.lastBurst;
        if (s.targetsLeft < before) {
          left = s.targetsLeft;
          return { before, left, burst, particles: s.particles, mode: s.mode };
        }
      }
      left = G.state().targetsLeft;
    }
    return { before, left, burst, fail: true, state: G.state() };
  });
  expect(killed.fail, JSON.stringify(killed)).toBeFalsy();
  expect(killed.left).toBeLessThan(killed.before);
  expect(killed.burst).toBeGreaterThan(8);

  await page.keyboard.press('Escape');
  await page.waitForFunction(() => __DRILL__.state().mode === 'pause');
  await page.waitForTimeout(160);
  const hip = await page.evaluate(() => __DRILL__.highlight());
  expect(hip.sel).toMatch(/RESUME/);
  expect(hip.selScale).toBeGreaterThan(1.03);
  expect(hip.otherOpacity).toBeLessThan(0.6);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => __DRILL__.state().mode === 'play');

  const gp = await page.evaluate(() => {
    const G = __DRILL__;
    G.setManual(true);
    const x0 = G.state().x;
    G.setPad({ axes: [1, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) });
    G.step(18);
    const x1 = G.state().x;
    G.setPad(null);
    return { x0, x1 };
  });
  expect(gp.x1).toBeGreaterThan(gp.x0 + 0.4);

  const cleared = await page.evaluate(() => {
    const G = __DRILL__;
    G.setManual(true);
    G.setLoadout('laser');
    let guard = 0;
    while (G.state().mode === 'play' && G.state().targetsLeft > 0 && guard++ < 40) {
      G.aimAtNearest('body');
      G.fire();
      G.step(3);
    }
    return G.state();
  });
  expect(cleared.mode).toBe('debrief');
  expect(cleared.result && cleared.result.win).toBe(true);
  const save = await page.evaluate(() => __DRILL__.getSave());
  expect(save.best.lane.score).toBeGreaterThan(0);
  expect(save.best.lane.stars).toBeGreaterThan(0);
  expect(await page.evaluate(() => localStorage.getItem('star-punch-save'))).toBe('keep');

  await page.reload();
  await page.waitForFunction(() => window.__DRILL__ && window.__DRILL__.ready);
  const kept = await page.evaluate(() => ({
    best: __DRILL__.getSave().best.lane.score,
    other: localStorage.getItem('star-punch-save'),
    key: __DRILL__.KEY,
  }));
  expect(kept.best).toBe(save.best.lane.score);
  expect(kept.other).toBe('keep');
  expect(kept.key).toBe('drills-proving-ground.v1');
  expect(errors, errors.join('\n')).toEqual([]);
});

async function assertClear(page, land) {
  const lay = await page.evaluate(() => __DRILL__.layout());
  expect(lay.touch).toBe(true);
  expect(lay.land).toBe(land);
  expect(lay.canvas.visible).toBe(true);
  const controls = [lay.stickL, lay.stickR, lay.fire, lay.scope, lay.breath, lay.crouch, lay.pause];
  for (const c of controls) {
    expect(c.visible).toBe(true);
    expect(overlaps(c, lay.canvas), 'control/canvas ' + JSON.stringify(c)).toBe(false);
    expect(overlaps(c, lay.overlay), 'control/overlay').toBe(false);
    expect(c.x).toBeGreaterThanOrEqual(-1);
    expect(c.y).toBeGreaterThanOrEqual(-1);
    expect(c.x + c.w).toBeLessThanOrEqual(lay.vw + 1);
    expect(c.y + c.h).toBeLessThanOrEqual(lay.vh + 1);
  }
  if (land) {
    for (const c of [lay.stickL, lay.crouch]) expect(c.x + c.w).toBeLessThanOrEqual(lay.canvas.x + 1);
    for (const c of [lay.stickR, lay.fire, lay.scope, lay.breath, lay.pause]) {
      expect(c.x).toBeGreaterThanOrEqual(lay.canvas.x + lay.canvas.w - 1);
    }
    expect(lay.canvas.w * lay.canvas.h).toBeGreaterThan(lay.vw * lay.vh * 0.45);
  } else {
    for (const c of controls) expect(c.y).toBeGreaterThanOrEqual(lay.canvas.y + lay.canvas.h - 1);
    expect(lay.canvas.w).toBeGreaterThan(lay.vw - 2);
  }
  expect(lay.fire.w).toBeGreaterThanOrEqual(44);
  expect(lay.fire.h).toBeGreaterThanOrEqual(36);
  return lay;
}

test.describe('portrait phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('controls sit under the screen and touch play works', async ({ page }) => {
    const errors = await boot(page, 'touch=1');
    await page.evaluate(() => __DRILL__.startCourse(0));
    await page.waitForTimeout(200);
    await assertClear(page, false);
    await page.screenshot({ path: `${ART}/proving-ground-portrait.png` });

    const x0 = await page.evaluate(() => __DRILL__.state().x);
    await stick(page, '#stickL', 50, 0, false);
    await page.waitForTimeout(400);
    const x1 = await page.evaluate(() => __DRILL__.state().x);
    expect(x1).toBeGreaterThan(x0 + 0.3);
    await stick(page, '#stickL', 0, 0, true);

    const yaw0 = await page.evaluate(() => __DRILL__.state().yaw);
    await stick(page, '#stickR', 40, -16, false);
    await page.waitForTimeout(350);
    const yaw1 = await page.evaluate(() => __DRILL__.state().yaw);
    expect(Math.abs(yaw1 - yaw0)).toBeGreaterThan(0.05);
    await stick(page, '#stickR', 0, 0, true);

    await page.locator('#btnScope').click();
    await page.waitForTimeout(80);
    expect((await page.evaluate(() => __DRILL__.state().scoped))).toBe(true);
    const shots0 = await page.evaluate(() => __DRILL__.state().shots);
    await page.locator('#btnFire').dispatchEvent('pointerdown');
    await page.waitForTimeout(80);
    const shots1 = await page.evaluate(() => __DRILL__.state().shots);
    expect(shots1).toBeGreaterThan(shots0);

    await page.evaluate(() => __DRILL__.press('pause', true));
    await page.waitForTimeout(160);
    const paused = await page.evaluate(() => __DRILL__.layout());
    expect(paused.mode).toBe('pause');
    expect(paused.overlay.visible).toBe(true);
    for (const c of [paused.stickL, paused.stickR, paused.fire, paused.scope, paused.breath, paused.crouch, paused.pause]) {
      expect(overlaps(c, paused.canvas)).toBe(false);
      expect(overlaps(c, paused.overlay)).toBe(false);
    }
    const hi = await page.evaluate(() => __DRILL__.highlight());
    expect(hi.selScale).toBeGreaterThan(1.03);
    expect(hi.otherOpacity).toBeLessThan(0.6);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('landscape phone', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('side gutters stay off the canvas and the frame stays quick', async ({ page }) => {
    const errors = await boot(page, 'touch=1');
    await page.evaluate(() => __DRILL__.startCourse(7));
    await page.waitForTimeout(250);
    await assertClear(page, true);
    await page.screenshot({ path: `${ART}/proving-ground-landscape.png` });

    const y0 = await page.evaluate(() => __DRILL__.state().z);
    await stick(page, '#stickL', 0, -40, false);
    await page.waitForTimeout(350);
    const y1 = await page.evaluate(() => __DRILL__.state().z);
    expect(y1).toBeGreaterThan(y0 + 0.25);
    await stick(page, '#stickL', 0, 0, true);

    await page.locator('#btnScope').click();
    expect((await page.evaluate(() => __DRILL__.state().scoped))).toBe(true);
    const shots0 = await page.evaluate(() => __DRILL__.state().shots);
    await page.locator('#btnFire').dispatchEvent('pointerdown');
    await page.waitForTimeout(60);
    expect(await page.evaluate(() => __DRILL__.state().shots)).toBeGreaterThan(shots0);

    await page.evaluate(() => { __DRILL__.setScope(false); __DRILL__.fire(); });
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => __DRILL__.resetFrames());
    await page.waitForTimeout(1800);
    const p95 = await page.evaluate(() => __DRILL__.frameP95());
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    expect(p95, 'p95 frame ms ' + p95).toBeGreaterThan(0);
    expect(p95).toBeLessThan(22);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
