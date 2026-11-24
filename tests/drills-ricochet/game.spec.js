import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts';
const GAME = '/drills-ricochet/index.html';
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
  await page.waitForFunction(() => window.__RICOCHET__ && window.__RICOCHET__.ready);
  await page.waitForTimeout(200);
  return errors;
}

function overlaps(a, b) {
  if (!a || !b || !a.visible || !b.visible) return false;
  const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return ix > 0.5 && iy > 0.5;
}

test('desktop play: highlight, ricochet, keyboard, pause, tiers', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('star-punch-save', 'keep'));
  await page.setViewportSize({ width: 1280, height: 800 });
  const errors = await boot(page, 'touch=0');
  expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex,nofollow');
  const src = fs.readFileSync('/workspace/drills-ricochet/index.html', 'utf8')
    + fs.readFileSync('/workspace/drills-ricochet/game.js', 'utf8');
  expect(src.toLowerCase()).not.toMatch(/\d+\s+space riders games/);
  expect(src.toLowerCase()).not.toContain('space riders games');

  const hi = await page.evaluate(() => __RICOCHET__.highlight());
  expect(hi.sel).toMatch(/LET'S RIDE/);
  expect(hi.selOpacity).toBeGreaterThan(0.9);
  expect(hi.otherOpacity).toBeLessThan(0.6);
  expect(hi.selScale).toBeGreaterThan(1.03);
  await page.screenshot({ path: `${ART}/drills-ricochet-title.png` });

  await page.locator('.menu-btn', { hasText: 'STAGE SELECT' }).hover();
  await page.waitForTimeout(180);
  const hi2 = await page.evaluate(() => __RICOCHET__.highlight());
  expect(hi2.sel).toMatch(/STAGE SELECT/);
  expect(hi2.selScale).toBeGreaterThan(1.03);
  expect(hi2.otherOpacity).toBeLessThan(0.6);

  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(160);
  expect((await page.evaluate(() => __RICOCHET__.highlight())).sel).toMatch(/LET'S RIDE/);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => __RICOCHET__.state().mode === 'brief');
  await page.waitForTimeout(160);
  expect((await page.evaluate(() => __RICOCHET__.highlight())).selScale).toBeGreaterThan(1.03);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => __RICOCHET__.state().mode === 'play');

  const shot = await page.evaluate(() => {
    const G = __RICOCHET__;
    G.setManual(true);
    const ang = G.findKillAngle();
    G.setAimAngle(ang);
    const before = G.state();
    G.fire();
    let sawBounce = false;
    for (let i = 0; i < 220; i++) {
      G.step(1);
      const s = G.state();
      if (s.liveShots.some((sh) => sh.owner === 'player' && sh.bounced > 0)) sawBounce = true;
      if (s.enemies < before.enemies) {
        return { ang, before: before.enemies, after: s.enemies, sawBounce, last: s.lastKillBounces, particles: s.particles, mode: s.mode };
      }
    }
    return { ang, fail: true, before: before.enemies, after: G.state() };
  });
  expect(shot.fail, JSON.stringify(shot)).toBeFalsy();
  expect(shot.after).toBeLessThan(shot.before);
  expect(shot.sawBounce).toBe(true);
  expect(shot.last).toBeGreaterThanOrEqual(1);
  expect(shot.particles).toBeGreaterThan(8);

  const moved = await page.evaluate(() => {
    const G = __RICOCHET__;
    const x0 = G.state().x;
    const y0 = G.state().y;
    G.press('right', true);
    G.step(18);
    G.press('right', false);
    const x1 = G.state().x;
    G.press('down', true);
    G.step(14);
    G.press('down', false);
    const y1 = G.state().y;
    return { x0, x1, y0, y1 };
  });
  expect(moved.x1).toBeGreaterThan(moved.x0 + 8);
  expect(moved.y1).toBeGreaterThan(moved.y0 + 5);

  const box = await page.locator('#view').boundingBox();
  await page.mouse.move(box.x + box.width * 0.72, box.y + box.height * 0.35);
  await page.evaluate(() => __RICOCHET__.clearAim());
  await page.mouse.move(box.x + box.width * 0.8, box.y + box.height * 0.42);
  const aimed = await page.evaluate(() => { __RICOCHET__.step(1); return __RICOCHET__.state().aim; });
  expect(Math.abs(aimed)).toBeGreaterThan(0.01);
  const shotsBefore = await page.evaluate(() => __RICOCHET__.state().shots);
  await page.keyboard.press('Space');
  const shotsAfter = await page.evaluate(() => { __RICOCHET__.step(2); return __RICOCHET__.state().shots; });
  expect(shotsAfter).toBeGreaterThan(shotsBefore);

  await page.keyboard.press('KeyP');
  await page.waitForFunction(() => __RICOCHET__.state().mode === 'pause');
  await page.waitForTimeout(160);
  const hip = await page.evaluate(() => __RICOCHET__.highlight());
  expect(hip.sel).toMatch(/RESUME/);
  expect(hip.selScale).toBeGreaterThan(1.03);
  expect(hip.otherOpacity).toBeLessThan(0.6);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => __RICOCHET__.state().mode === 'play');

  const prog = await page.evaluate(() => {
    const G = __RICOCHET__;
    G.setManual(true);
    G.startStage(3);
    G.wipeEnemies();
    let mode = G.state().mode;
    for (let i = 0; i < 50 && mode === 'play'; i++) { G.step(1); mode = G.state().mode; }
    const cleared = G.state();
    G.confirm();
    const brief = G.state();
    G.confirm();
    const play = G.state();
    G.startStage(6);
    const jet = G.state();
    G.startStage(9);
    const saucer = G.state();
    G.setManual(true);
    const foe = saucer.enemyPos.find((e) => e.kind === 'saucer') || saucer.enemyPos[0];
    G.teleport(foe.x - 46, foe.y);
    G.setAimAngle(0);
    G.fire();
    G.step(8);
    G.fire();
    G.step(8);
    G.teleport(130, 320);
    G.setAimAngle(Math.PI);
    G.fire();
    G.step(12);
    const action = G.state();
    return {
      cleared: cleared.mode, brief: brief.mode, briefName: brief.stageName,
      play, jet: { tier: jet.tier, tierName: jet.tierName, bounces: jet.bounces },
      saucer: { tier: saucer.tier, tierName: saucer.tierName, split: saucer.split, particles: action.particles, shots: action.liveShots, mode: action.mode },
    };
  });
  expect(prog.cleared).toBe('clear');
  expect(prog.brief).toBe('brief');
  expect(prog.play.tier).toBe(2);
  expect(prog.play.tierName).toBe('Helicopters');
  expect(prog.play.mode).toBe('play');
  expect(prog.play.hover).toBe(true);
  expect(prog.jet.tierName).toBe('Jets');
  expect(prog.jet.bounces).toBe(2);
  expect(prog.saucer.tierName).toBe('Flying Saucers');
  expect(prog.saucer.split).toBe(true);
  expect(prog.saucer.mode).toBe('play');
  expect(prog.saucer.particles).toBeGreaterThan(8);
  expect(prog.saucer.shots.some((s) => s.bounced > 0)).toBe(true);
  await page.screenshot({ path: `${ART}/drills-ricochet-saucer.png` });

  const rest = await page.evaluate(() => {
    const G = __RICOCHET__;
    G.setManual(true);
    G.startStage(4);
    const wall = G.state().lowWalls[0];
    G.teleport(wall.x, wall.y);
    G.setMove(0, 0);
    G.step(8);
    const skim = G.state();
    G.setHover(false);
    G.teleport(wall.x, wall.y);
    G.step(8);
    const blocked = G.state();
    G.startStage(12);
    const boss = G.state();
    return {
      skim: Math.hypot(skim.x - wall.x, skim.y - wall.y),
      blocked: Math.hypot(blocked.x - wall.x, blocked.y - wall.y),
      boss: boss.enemyPos.map((e) => e.kind),
    };
  });
  expect(rest.skim).toBeLessThan(10);
  expect(rest.blocked).toBeGreaterThan(16);
  expect(rest.boss).toContain('boss');

  const gp = await page.evaluate(() => {
    const G = __RICOCHET__;
    G.startStage(1);
    G.setManual(true);
    G.setMove(0, 0);
    const x = G.state().x;
    G.setPad({ axes: [1, 0, 0, 0], buttons: Array.from({ length: 16 }, () => ({ pressed: false })) });
    G.step(20);
    const x2 = G.state().x;
    G.setPad(null);
    return { x, x2 };
  });
  expect(gp.x2).toBeGreaterThan(gp.x + 5);

  expect(await page.evaluate(() => localStorage.getItem('star-punch-save'))).toBe('keep');
  const save = await page.evaluate(() => __RICOCHET__.getSave());
  expect(save.unlocked).toBeGreaterThanOrEqual(4);
  expect(save.best).toBeGreaterThan(0);
  expect(await page.evaluate(() => __RICOCHET__.KEY)).toBe('drills-ricochet.v1');

  await page.reload();
  await page.waitForFunction(() => window.__RICOCHET__ && window.__RICOCHET__.ready);
  const kept = await page.evaluate(() => ({
    best: __RICOCHET__.getSave().best,
    other: localStorage.getItem('star-punch-save'),
  }));
  expect(kept.best).toBe(save.best);
  expect(kept.other).toBe('keep');
  expect(errors, errors.join('\n')).toEqual([]);
});

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

async function assertClear(page, land) {
  const lay = await page.evaluate(() => __RICOCHET__.layout());
  expect(lay.touch).toBe(true);
  expect(lay.land).toBe(land);
  expect(lay.canvas.visible).toBe(true);
  expect(lay.stickL.visible).toBe(true);
  expect(lay.stickR.visible).toBe(true);
  expect(lay.fire.visible).toBe(true);
  expect(lay.special.visible).toBe(true);
  expect(lay.pause.visible).toBe(true);
  const controls = [lay.stickL, lay.stickR, lay.fire, lay.special, lay.pause];
  for (const c of controls) {
    expect(overlaps(c, lay.canvas), 'control/canvas').toBe(false);
    expect(overlaps(c, lay.hud), 'control/hud').toBe(false);
    expect(c.x).toBeGreaterThanOrEqual(-1);
    expect(c.y).toBeGreaterThanOrEqual(-1);
    expect(c.x + c.w).toBeLessThanOrEqual(lay.vw + 1);
    expect(c.y + c.h).toBeLessThanOrEqual(lay.vh + 1);
  }
  if (land) {
    for (const c of [lay.stickL]) expect(c.x + c.w).toBeLessThanOrEqual(lay.canvas.x + 1);
    for (const c of [lay.stickR, lay.fire, lay.special, lay.pause]) expect(c.x).toBeGreaterThanOrEqual(lay.canvas.x + lay.canvas.w - 1);
    expect(lay.canvas.w * lay.canvas.h).toBeGreaterThan(lay.vw * lay.vh * 0.55);
  } else {
    for (const c of controls) expect(c.y).toBeGreaterThanOrEqual(lay.canvas.y + lay.canvas.h - 1);
    expect(lay.canvas.w).toBeGreaterThan(lay.vw - 2);
  }
  expect(lay.fire.w).toBeGreaterThanOrEqual(44);
  expect(lay.fire.h).toBeGreaterThanOrEqual(36);
  expect(lay.stickL.w).toBeGreaterThanOrEqual(96);
  return lay;
}

test.describe('portrait phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('controls sit under the screen and touch play works', async ({ page }) => {
    const errors = await boot(page, 'touch=1');
    await page.evaluate(() => __RICOCHET__.startStage(1));
    await page.waitForTimeout(100);
    await assertClear(page, false);
    const x0 = await page.evaluate(() => __RICOCHET__.state().x);
    await stick(page, '#stickL', 46, 0, false);
    await page.waitForTimeout(350);
    const x1 = await page.evaluate(() => __RICOCHET__.state().x);
    expect(x1).toBeGreaterThan(x0 + 8);
    await stick(page, '#stickL', 0, 0, true);
    const shots0 = await page.evaluate(() => __RICOCHET__.state().shots);
    await stick(page, '#stickR', 30, -20, true);
    await page.waitForTimeout(120);
    const shots1 = await page.evaluate(() => __RICOCHET__.state().shots);
    expect(shots1).toBeGreaterThan(shots0);
    await page.screenshot({ path: `${ART}/drills-ricochet-portrait.png` });

    await page.evaluate(() => __RICOCHET__.press('pause', true));
    await page.waitForTimeout(150);
    const paused = await page.evaluate(() => __RICOCHET__.layout());
    expect(paused.mode).toBe('pause');
    expect(paused.overlay.visible).toBe(true);
    for (const c of [paused.stickL, paused.stickR, paused.fire, paused.special, paused.pause]) {
      expect(overlaps(c, paused.canvas)).toBe(false);
      expect(overlaps(c, paused.overlay)).toBe(false);
    }
    const hi = await page.evaluate(() => __RICOCHET__.highlight());
    expect(hi.selScale).toBeGreaterThan(1.03);
    expect(hi.otherOpacity).toBeLessThan(0.6);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('landscape phone', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('side gutters stay off the canvas and the frame stays quick', async ({ page }) => {
    const errors = await boot(page, 'touch=1');
    await page.evaluate(() => __RICOCHET__.startStage(1));
    await page.waitForTimeout(100);
    await assertClear(page, true);
    const y0 = await page.evaluate(() => __RICOCHET__.state().y);
    await stick(page, '#stickL', 0, 40, false);
    await page.waitForTimeout(300);
    const y1 = await page.evaluate(() => __RICOCHET__.state().y);
    expect(y1).toBeGreaterThan(y0 + 6);
    await page.locator('#btnFire').dispatchEvent('pointerdown');
    await page.waitForTimeout(80);
    const shots = await page.evaluate(() => __RICOCHET__.state().shots);
    expect(shots).toBeGreaterThan(0);
    await page.screenshot({ path: `${ART}/drills-ricochet-landscape.png` });

    await page.evaluate(() => {
      __RICOCHET__.startStage(8);
      __RICOCHET__.fire();
    });
    const client = await page.context().newCDPSession(page);
    await client.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(() => __RICOCHET__.resetFrames());
    await page.waitForTimeout(1800);
    const p95 = await page.evaluate(() => __RICOCHET__.frameP95());
    await client.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    expect(p95, 'p95 frame ms ' + p95).toBeGreaterThan(0);
    expect(p95).toBeLessThan(22);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
