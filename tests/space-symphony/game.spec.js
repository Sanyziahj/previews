import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';

const ART = '/opt/cursor/artifacts/space-symphony';
const GAME = '/space-symphony/index.html';
const BANNED = ['whiskey', 'cigar', 'cigarette', 'blood', 'raygun', 'pistol', 'rifle', 'casino', 'gambling', 'mario', 'nintendo'];

function track(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return errors;
}

async function boot(page, query = 'touch=0&api=webgl&quality=low') {
  const errors = track(page);
  await page.goto(`${GAME}?${query}`);
  await page.waitForFunction(() => window.__SYMPHONY__ && window.__SYMPHONY__.ready);
  await page.evaluate(() => __SYMPHONY__.setManual(true));
  return errors;
}

async function begin(page) {
  await page.evaluate(() => {
    const S = __SYMPHONY__;
    S.startNew();
    S.dismissCard();
  });
}

test('load has no console errors and stays unlisted', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('star-punch-save', 'keep'));
  const errors = track(page);
  await page.goto(`${GAME}?touch=0&api=webgl&quality=low`);
  await page.waitForFunction(() => window.__SYMPHONY__ && window.__SYMPHONY__.ready);
  await page.waitForTimeout(400);
  expect(errors, errors.join('\n')).toEqual([]);
  expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex,nofollow');
  const html = await page.content();
  expect(html).toContain("Let's Ride!");
  expect(await page.evaluate(() => __SYMPHONY__.KEY)).toBe('space-symphony.v1');
  expect(await page.evaluate(() => localStorage.getItem('star-punch-save'))).toBe('keep');
  const root = '/workspace/space-symphony';
  const files = ['index.html', 'js/main.js', 'js/data.js', 'js/world.js', 'js/actors.js'];
  const blob = files.map((f) => fs.readFileSync(path.join(root, f), 'utf8')).join('\n').toLowerCase();
  for (const w of BANNED) expect(blob, w).not.toContain(w);
  expect(blob).not.toContain('gun');
  expect(await page.locator('#playBtn').textContent()).toMatch(/LET'S RIDE/i);
});

test('movement, ride, and SHIFT', async ({ page }) => {
  const errors = await boot(page);
  const report = await page.evaluate(() => {
    const S = __SYMPHONY__;
    S.startNew();
    S.dismissCard();
    const a = S.state();
    S.press('forward', true);
    S.step(40);
    S.press('forward', false);
    const b = S.state();
    S.press('realm', true);
    S.step(1);
    S.press('realm', false);
    S.step(50);
    const dream = S.state();
    S.press('realm', true);
    S.step(1);
    S.press('realm', false);
    S.step(50);
    const wake = S.state();
    const spots = S.spots();
    S.teleport(spots.crack.x + 8, spots.crack.z);
    S.step(2);
    const bike = S.state();
    S.teleport(6.2, 90);
    S.step(2);
    const nearBoard = S.state();
    S.press('ride', true);
    S.step(1);
    S.press('ride', false);
    const mounted = S.state();
    S.press('forward', true);
    S.step(20);
    S.press('forward', false);
    const rode = S.state();
    S.press('ride', true);
    S.step(1);
    S.press('ride', false);
    const off = S.state();
    return {
      z0: a.z, z1: b.z, x0: a.x, x1: b.x,
      dream: dream.realm, crack: dream.crackVisible, wake: wake.realm,
      bikePrompt: bike.prompt, boardPrompt: nearBoard.prompt,
      mounted: mounted.mounted, rodeZ: rode.z, off: off.mounted,
      mq: a.mq,
    };
  });
  expect(report.mq).toBe(0);
  expect(report.z1).toBeLessThan(report.z0 - 1);
  expect(report.dream).toBe('dream');
  expect(report.crack).toBe(true);
  expect(report.wake).toBe('wake');
  expect(report.boardPrompt).toMatch(/RIDE/);
  expect(report.mounted).toBe('board');
  expect(report.rodeZ).toBeLessThan(90);
  expect(report.off).toBe(null);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('main chain frees the Sentinel and saves', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('star-punch-save', 'keep'));
  const errors = await boot(page);
  const report = await page.evaluate(() => {
    const S = __SYMPHONY__;
    const cards = [];
    function talk() {
      S.press('use', true); S.step(1); S.press('use', false); S.step(1);
      const c = S.state().card;
      if (c) cards.push(c.title);
      while (S.state().mode === 'card') { S.dismissCard(); S.step(1); }
    }
    function burst(x, z, n = 2) {
      for (let i = 0; i < n; i++) {
        S.teleport(x, z);
        S.press('use', true); S.step(1); S.press('use', false);
        S.teleport(x, z + 28);
        S.step(28);
      }
    }
    S.startNew();
    const intro = S.state().card;
    S.dismissCard();
    const who = S.state().who;
    S.teleport(who.ls.x, who.ls.z + 1.2);
    S.step(2);
    talk();
    const afterLs = S.state();
    S.teleport(afterLs.who.ros.x, afterLs.who.ros.z + 1.2);
    S.step(2);
    talk();
    S.setRealm('dream');
    const crack = S.spots().crack;
    S.teleport(crack.x, crack.z + 1);
    S.step(2);
    talk();
    S.setRealm('wake');
    const drones = S.spots().drones;
    for (const d of drones) burst(d.x, d.z, 2);
    while (S.state().mode === 'card') S.dismissCard();
    const afterDrones = S.state();
    const sent = S.spots().sentinel;
    S.teleport(sent.x, sent.z + 12);
    S.step(3);
    while (S.state().mode === 'card') S.dismissCard();
    for (const a of S.spots().anchors) burst(a.x, a.z, 2);
    while (S.state().mode === 'card') S.dismissCard();
    const afterAnchors = S.state();
    S.setRealm('dream');
    S.step(2);
    for (const c of S.spots().cores) burst(c.x, c.z, 2);
    S.step(200);
    while (S.state().mode === 'card') S.dismissCard();
    const done = S.state();
    const save = S.getSave();
    return {
      intro: intro && intro.title,
      mqLs: afterLs.mq,
      mqDrones: afterDrones.mq,
      sentinelMid: afterAnchors.sentinel,
      mq: done.mq,
      sentinel: done.sentinel,
      frees: done.frees,
      realm: done.realm,
      cards,
      saveMq: save.mq,
      savePhase: save.sentinelPhase,
    };
  });
  expect(report.intro).toBe('Wake Call');
  expect(report.mqLs).toBe(1);
  expect(report.mqDrones).toBe(4);
  expect(report.sentinelMid === 'ready' || report.sentinelMid === 'dream').toBe(true);
  expect(report.mq).toBe(6);
  expect(report.sentinel).toBe('freed');
  expect(report.frees).toBeGreaterThan(5);
  expect(report.saveMq).toBe(6);
  expect(report.savePhase).toBe('freed');
  await page.reload();
  await page.waitForFunction(() => window.__SYMPHONY__ && window.__SYMPHONY__.ready);
  const kept = await page.evaluate(() => {
    const save = __SYMPHONY__.getSave();
    __SYMPHONY__.continueGame();
    const live = __SYMPHONY__.state();
    return {
      saveMq: save.mq,
      liveMq: live.mq,
      phase: live.sentinel,
      other: localStorage.getItem('star-punch-save'),
      keys: Object.keys(localStorage),
    };
  });
  expect(kept.saveMq).toBe(6);
  expect(kept.liveMq).toBe(6);
  expect(kept.phase).toBe('freed');
  expect(kept.other).toBe('keep');
  for (const k of kept.keys) {
    if (k !== 'star-punch-save') expect(k.startsWith('space-symphony')).toBe(true);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('side quests, gamepad back, and lucidity bridge', async ({ page }) => {
  const errors = await boot(page);
  const report = await page.evaluate(() => {
    const S = __SYMPHONY__;
    function closeCards() { while (S.state().mode === 'card') { S.dismissCard(); S.step(1); } }
    function use() { S.press('use', true); S.step(1); S.press('use', false); S.step(1); }
    S.startNew();
    closeCards();
    const who = () => S.state().who;
    S.teleport(who().ls.x, who().ls.z + 1.2);
    S.step(2); use(); closeCards();
    S.teleport(who().tired.x, who().tired.z + 1);
    S.step(2); use(); closeCards();
    const following = S.state().sq.due;
    S.teleport(who().rusty.x, who().rusty.z + 1.5);
    S.step(8);
    use(); closeCards();
    const due = S.state().sq.due;
    S.teleport(who().ds.x + 1.2, who().ds.z);
    S.step(2); use(); closeCards();
    let hits = 0;
    for (let n = 0; n < 8 && hits < 3; n++) {
      for (let i = 0; i < 90 && !S.state().qte.window; i++) S.step(1);
      if (!S.state().qte.window) break;
      use();
      hits = S.state().qte.hits || hits + 1;
      for (let i = 0; i < 90 && S.state().qte.window; i++) S.step(1);
    }
    closeCards();
    const afterSet = S.state().sq.comic;
    S.setRealm('dream');
    const hush = S.spots().hush;
    S.teleport(hush.x, hush.z);
    S.step(2);
    use(); S.teleport(hush.x, hush.z + 20); S.step(30);
    S.teleport(hush.x, hush.z); S.step(2); use();
    S.step(2);
    S.setRealm('wake');
    S.teleport(who().ds.x + 1.2, who().ds.z);
    S.step(2); use(); closeCards();
    const comic = S.state().sq.comic;
    S.setRealm('dream');
    const bowl = S.spots().bowl;
    S.teleport(who().kid.x, who().kid.z + 1);
    S.setRealm('wake');
    S.step(2); use(); closeCards();
    S.setRealm('dream');
    S.teleport(bowl.x, bowl.z);
    S.step(40);
    use();
    S.step(40);
    use();
    closeCards();
    const crunch = S.state().sq.crunch;
    S.setRealm('wake');
    S.teleport(who().ros.x, who().ros.z + 1.2);
    S.step(2); use(); closeCards();
    S.teleport(S.state().who.ros.x, S.state().who.ros.z + 1.2);
    S.step(2); use(); closeCards();
    const storm = S.state().sq.storm;
    S.setRealm('dream');
    const mirages = S.spots().mirages;
    for (const m of mirages) {
      S.teleport(m.x, m.z + 0.8);
      S.step(2); use(); closeCards();
    }
    S.teleport(mirages[2].x, mirages[2].z);
    S.step(6); use(); closeCards();
    const stormDone = S.state().sq.storm;
    const bridgeLow = (() => {
      S.setLucidity(10);
      S.setRealm('dream');
      const b = S.spots();
      return { solid: S.state().bridgeSolid, lucidity: S.state().lucidity, bowl: b.bowl };
    })();
    S.setLucidity(80);
    const bridgeHigh = S.state().bridgeSolid;
    const pulses = S.state().pulseCount;
    S.setPad({ axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 1 })) });
    S.step(2);
    const paused = S.state();
    S.setPad(null);
    S.press('back', false);
    return { following, due, afterSet, comic, crunch, storm, stormDone, bridgeLow, bridgeHigh, pulses, paused: { mode: paused.mode, pulseCount: paused.pulseCount } };
  });
  expect(report.following).toBe('follow');
  expect(report.due).toBe('done');
  expect(report.afterSet).toBe('hush');
  expect(report.comic).toBe('done');
  expect(report.crunch).toBe('done');
  expect(report.storm).toBe('search');
  expect(report.stormDone).toBe('done');
  expect(report.bridgeLow.solid).toBe(false);
  expect(report.bridgeHigh).toBe(true);
  expect(report.paused.mode).toBe('pause');
  expect(report.paused.pulseCount).toBe(report.pulses);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('phone portrait controls do not attack on BACK', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = track(page);
  await page.goto(`http://127.0.0.1:4173${GAME}?touch=1&api=webgl&quality=low`);
  await page.waitForFunction(() => window.__SYMPHONY__ && window.__SYMPHONY__.ready);
  await page.evaluate(() => { __SYMPHONY__.setManual(true); __SYMPHONY__.startNew(); __SYMPHONY__.dismissCard(); });
  await expect(page.locator('#stick')).toBeVisible();
  await expect(page.locator('[data-act=back]')).toBeVisible();
  await expect(page.locator('[data-act=shift]')).toBeVisible();
  const before = await page.evaluate(() => __SYMPHONY__.state());
  const stick = page.locator('#stick');
  const box = await stick.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await stick.dispatchEvent('pointerdown', { bubbles: true, clientX: cx, clientY: cy - 36, pointerId: 4, pointerType: 'touch', isPrimary: true });
  await stick.dispatchEvent('pointermove', { bubbles: true, clientX: cx, clientY: cy - 40, pointerId: 4, pointerType: 'touch' });
  const moved = await page.evaluate(() => { __SYMPHONY__.step(25); return __SYMPHONY__.state(); });
  await stick.dispatchEvent('pointerup', { bubbles: true, clientX: cx, clientY: cy, pointerId: 4, pointerType: 'touch' });
  expect(moved.z).toBeLessThan(before.z - 0.4);
  const shift = page.locator('[data-act=shift]');
  const sb = await shift.boundingBox();
  expect(sb.width).toBeGreaterThan(60);
  expect(sb.height).toBeGreaterThan(48);
  const hot = await shift.evaluate((el) => {
    el.classList.add('hot');
    const s = getComputedStyle(el);
    return { transform: s.transform, shadow: s.boxShadow };
  });
  expect(hot.transform).not.toBe('none');
  const back = page.locator('[data-act=back]');
  const bb = await back.boundingBox();
  await back.dispatchEvent('pointerdown', { bubbles: true, clientX: bb.x + 8, clientY: bb.y + 8, pointerId: 5, pointerType: 'touch', isPrimary: true });
  const paused = await page.evaluate(() => { __SYMPHONY__.step(2); return __SYMPHONY__.state(); });
  expect(paused.mode).toBe('pause');
  expect(paused.pulseCount).toBe(before.pulseCount);
  await back.dispatchEvent('pointerup', { bubbles: true, pointerId: 5, pointerType: 'touch' });
  await page.evaluate(() => {
    const S = __SYMPHONY__;
    S.press('back', true);
    S.step(1);
    S.press('back', false);
    S.setQuality('med');
    S.setRealm('wake');
    S.teleport(2, 10);
    S.setLook(0.35, 0.48);
    S.setDay(0.28);
    S.step(2);
  });
  fs.mkdirSync(ART, { recursive: true });
  await page.screenshot({ path: path.join(ART, 'phone_waking.png') });
  await page.evaluate(() => { __SYMPHONY__.setRealm('dream'); __SYMPHONY__.step(2); });
  await page.screenshot({ path: path.join(ART, 'phone_dream.png') });
  expect(errors, errors.join('\n')).toEqual([]);
  await context.close();
});

test('frame pacing at low quality', async ({ page }) => {
  const errors = track(page);
  await page.goto(`${GAME}?touch=0&api=webgl&quality=low`);
  await page.waitForFunction(() => window.__SYMPHONY__ && window.__SYMPHONY__.ready);
  await page.evaluate(() => { __SYMPHONY__.startNew(); __SYMPHONY__.dismissCard(); __SYMPHONY__.resetStats(); });
  await page.waitForTimeout(2800);
  const stats = await page.evaluate(() => {
    const s = __SYMPHONY__.frameStats();
    const gl = document.querySelector('canvas').getContext('webgl2');
    const ext = gl && gl.getExtension('WEBGL_debug_renderer_info');
    s.renderer = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown';
    return s;
  });
  console.log('FRAME_P95 ' + JSON.stringify(stats));
  fs.mkdirSync(ART, { recursive: true });
  fs.writeFileSync(path.join(ART, 'frame-stats.json'), JSON.stringify(stats, null, 2));
  expect(stats.n).toBeGreaterThan(40);
  expect(stats.api).toBe('webgl2');
  // SwiftShader vsync buckets land on 16.7ms steps. Work time is the CPU/GPU
  // cost inside the frame; the rAF gap is what the screen actually waits.
  expect(stats.workP95).toBeLessThan(16);
  expect(stats.p95).toBeLessThan(67);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('desktop screenshots of both realms', async ({ page }) => {
  const errors = await boot(page, 'touch=0&api=webgl&quality=high');
  await page.evaluate(() => {
    const S = __SYMPHONY__;
    S.setQuality('high');
    S.startNew();
    S.dismissCard();
    S.teleport(2, 10);
    S.setLook(0.35, 0.48);
    S.setDay(0.28);
    S.setRealm('wake');
    S.step(3);
  });
  fs.mkdirSync(ART, { recursive: true });
  await page.screenshot({ path: path.join(ART, 'desktop_waking.png') });
  await page.evaluate(() => { __SYMPHONY__.setRealm('dream'); __SYMPHONY__.step(3); });
  await page.screenshot({ path: path.join(ART, 'desktop_dream.png') });
  const pose = await page.evaluate(() => __SYMPHONY__.state());
  expect(pose.realm).toBe('dream');
  expect(pose.mode).toBe('play');
  expect(errors, errors.join('\n')).toEqual([]);
});
