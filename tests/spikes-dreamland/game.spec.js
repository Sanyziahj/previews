import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const ART = '/opt/cursor/artifacts/spikes-dreamland';
const GAME = '/spikes-dreamland/index.html';
const BANNED = ['mario', 'luigi', 'yoshi', 'nintendo', 'koopa', 'goomba', 'mushroom'];

function track(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return errors;
}
async function boot(page, query = 'touch=0') {
  const errors = track(page);
  await page.goto(`${GAME}?${query}`);
  await page.waitForFunction(() => window.__DREAM__);
  await page.evaluate(() => __DREAM__.setManual(true));
  return errors;
}
function pad(i) {
  const buttons = Array.from({ length: 16 }, () => ({ pressed: false }));
  if (i != null) buttons[i].pressed = true;
  return { axes: [0, 0, 0, 0], buttons };
}

test('load has no console errors and keeps foreign saves', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('star-punch-save', 'keep'));
  const errors = track(page);
  await page.goto(`${GAME}?touch=0`);
  await page.waitForTimeout(600);
  expect(errors, errors.join('\n')).toEqual([]);
  expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex,nofollow');
  const html = await page.content();
  expect(html).toContain("Let's Ride!");
  const src = fs.readFileSync('/workspace/spikes-dreamland/index.html', 'utf8').toLowerCase();
  for (const w of BANNED) expect(src, w).not.toContain(w);
  expect(await page.evaluate(() => localStorage.getItem('star-punch-save'))).toBe('keep');
  expect(await page.evaluate(() => window.__DREAM__.KEY)).toBe('spikes-dreamland.v1');
});

test('aura, blaster, size, buddy, and back', async ({ page }) => {
  const errors = await boot(page);
  const report = await page.evaluate(() => {
    const D = __DREAM__;
    D.warp('w1-1');
    const base = D.state();
    D.give('cross');
    const aura = D.state();
    D.give('blast');
    const armed = D.state();
    D.mount();
    const riding = D.state();
    D.dismount();
    const off = D.state();
    D.mount();
    D.hurt();
    const knocked = D.state();
    D.step(120);
    D.hurt();
    const down = D.state();
    D.warp('w1-1');
    D.give('blast');
    const foes = D.foes();
    D.parkFoes();
    const foe = foes[0];
    D.putPlayer(foe.x - 70, foe.y + foe.h - base.h);
    const shots0 = D.state().shots;
    D.press('blast', true);
    D.step(1);
    const shots1 = D.state().shots;
    D.press('blast', false);
    D.step(30);
    const after = D.state();
    D.warp('w1-1');
    const shotsB = D.state().shots;
    D.press('back', true);
    D.step(1);
    const paused = D.state();
    D.press('back', false);
    D.step(1);
    D.setPad(null);
    D.press('back', false);
    D.warp('w1-1');
    D.setPad({ axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 1 })) });
    D.step(2);
    const bButton = D.state();
    D.setPad({ axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 9 })) });
    D.step(1);
    const startBtn = D.state();
    D.setPad({ axes: [0, 0, 0, 0], buttons: Array.from({ length: 16 }, (_, i) => ({ pressed: i === 8 })) });
    D.step(1);
    const selectBtn = D.state();
    return {
      base: { w: base.w, h: base.h, lives: base.lives, hero: base.hero },
      aura: aura.aura, armed: { aura: armed.aura, blaster: armed.blaster },
      riding: riding.mounted, off: { mounted: off.mounted, buddyOut: off.buddyOut },
      knocked: { mounted: knocked.mounted, aura: knocked.aura, blaster: knocked.blaster, lives: knocked.lives, inv: knocked.inv, w: knocked.w, h: knocked.h },
      down: { lives: down.lives, glitch: down.glitch, w: down.w, h: down.h, scale: down.scale },
      shots0, shots1, foes: foes.length, foesLeft: after.foes, fluff: after.fluff,
      paused: { mode: paused.mode, shots: paused.shots, shotsB },
      bButton: { mode: bButton.mode, shots: bButton.shots },
      startBtn: { mode: startBtn.mode, shots: startBtn.shots },
      selectBtn: { mode: selectBtn.mode, shots: selectBtn.shots },
    };
  });
  expect(report.base.hero).toBe('santt');
  expect(report.aura).toBe(true);
  expect(report.armed.aura).toBe(true);
  expect(report.armed.blaster).toBe(true);
  expect(report.riding).toBe(true);
  expect(report.off.mounted).toBe(false);
  expect(report.off.buddyOut).toBe(true);
  expect(report.knocked.mounted).toBe(false);
  expect(report.knocked.aura).toBe(false);
  expect(report.knocked.blaster).toBe(false);
  expect(report.knocked.lives).toBe(report.base.lives);
  expect(report.knocked.inv).toBeGreaterThan(0);
  expect(report.down.lives).toBe(report.base.lives - 1);
  expect(report.down.glitch).toBeGreaterThan(0);
  expect(report.down.w).toBe(report.base.w);
  expect(report.down.h).toBe(report.base.h);
  expect(report.knocked.w).toBe(report.base.w);
  expect(report.knocked.h).toBe(report.base.h);
  expect(report.down.scale).toBe(1);
  expect(report.shots1).toBeGreaterThan(shotsSafe(report.shots0));
  expect(report.foesLeft).toBeLessThan(report.foes);
  expect(report.paused.mode).toBe('pause');
  expect(report.paused.shots).toBe(report.paused.shotsB);
  expect(report.bButton.mode).toBe('play');
  expect(report.bButton.shots).toBe(0);
  expect(report.startBtn.mode).toBe('pause');
  expect(report.startBtn.shots).toBe(0);
  expect(report.selectBtn.shots).toBe(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

function shotsSafe(n) { return n; }

test('secret exit, space board, save, and scripted opening', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('star-punch-save', 'keep'));
  const errors = await boot(page);
  const bot = await page.evaluate(() => {
    __DREAM__.warp('w1-1');
    return __DREAM__.botRun(4500);
  });
  const story = await page.evaluate(() => {
    const D = __DREAM__;
    D.warp('w1-3');
    const secret = D.reachGoal(true);
    const save1 = D.getSave();
    D.warp('w1-s');
    const hidden = D.reachGoal(false);
    D.warp('w2-3');
    const found = D.findBoard();
    const mid = D.state();
    return {
      secret, hidden, found,
      secrets: save1.secrets,
      unlocked: D.unlocked('w1-s'),
      boardFound: mid.boardFound,
      boardReplay: mid.boardReplay,
      boardMode: mid.boardMode,
    };
  });
  expect(bot.mode, JSON.stringify(bot)).toBe('clear');
  expect(story.secret).toBe(true);
  expect(story.secrets['w1-3']).toBe(true);
  expect(story.unlocked).toBe(true);
  expect(story.hidden).toBe(true);
  expect(story.found).toBe(true);
  expect(story.boardFound).toBe(true);
  expect(story.boardReplay).toBe(false);
  expect(story.boardMode).toBe(false);
  await page.reload();
  await page.waitForFunction(() => window.__DREAM__);
  const kept = await page.evaluate(() => ({
    save: __DREAM__.getSave(),
    other: localStorage.getItem('star-punch-save'),
    keys: Object.keys(localStorage),
  }));
  expect(kept.save.cleared['w1-1']).toBe(true);
  expect(kept.save.secrets['w1-3']).toBe(true);
  expect(kept.save.boardFound).toBe(true);
  expect(kept.save.boardReplay).toBe(false);
  expect(kept.other).toBe('keep');
  for (const k of kept.keys) {
    if (k !== 'star-punch-save') expect(k.startsWith('spikes-dreamland')).toBe(true);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('headset comes off, Skippy takes over, mirrors and Spike unlock the board', async ({ page }) => {
  const errors = await boot(page);
  const result = await page.evaluate(() => {
    const D = __DREAM__;
    D.warp('w1-1');
    const dream = D.state();
    D.warp('w4-c');
    const beatFright = D.reachGoal(false);
    const unmask = D.state();
    const mapped = D.advance();
    const open = D.unlocked('w5-1');
    D.warp('w5-1');
    const hall = D.state();
    D.give('cross');
    const lit = D.state();
    D.hurt();
    const spent = D.state();
    D.focusMirror('copy');
    const x0 = D.state().bossX;
    D.press('right', true);
    D.step(6);
    const x1 = D.state().bossX;
    D.step(24);
    const x2 = D.state().bossX;
    D.press('right', false);
    D.warp('w5-c');
    const p1 = D.state();
    let guard = 0;
    let s = p1;
    while (s.phase === 1 && guard++ < 8) s = D.hitBoss();
    const p2 = s.phase;
    while (s.phase === 2 && guard++ < 16) s = D.hitBoss();
    const p3 = s.phase;
    while (s.bossHp > 0 && !s.bossDone && guard++ < 24) s = D.hitBoss();
    const smiled = D.state();
    D.advance();
    D.advance();
    const end = D.state();
    const normal = D.tuning();
    D.warp('w1-1', { board: false });
    const slow = D.tuning().max;
    D.warp('w2-1', { board: true });
    const fast = D.state();
    const fastMax = D.tuning().max;
    return {
      dreamHero: dream.hero, dreamH: dream.h, dreamW: dream.w,
      beatFright, unmaskMode: unmask.mode, awake: unmask.awake, unmaskHero: unmask.hero,
      replayAfterFright: unmask.boardReplay, mapped, open,
      hallHero: hall.hero, hallWorld: hall.world, hallH: hall.h, hallW: hall.w,
      lit: lit.aura, spentLives: spent.lives, hallLives: hall.lives, spentAura: spent.aura,
      copy: { x0, x1, x2, twist: 'copy' },
      p1: p1.phase, p2, p3, smile: smiled.smile, quote: end.quote, endMode: end.mode,
      boardReplay: end.boardReplay, hero: end.hero,
      slow, fastMax, fastBoard: fast.boardMode, fastHero: fast.hero,
    };
  });
  expect(result.dreamHero).toBe('santt');
  expect(result.beatFright).toBe(true);
  expect(result.unmaskMode).toBe('unmask');
  expect(result.awake).toBe(true);
  expect(result.unmaskHero).toBe('skippy');
  expect(result.replayAfterFright).toBe(false);
  expect(result.mapped).toBe('map');
  expect(result.open).toBe(true);
  expect(result.hallHero).toBe('skippy');
  expect(result.hallWorld).toBe(5);
  expect(result.hallW).toBe(result.dreamW);
  expect(result.hallH).toBe(result.dreamH);
  expect(result.lit).toBe(true);
  expect(result.spentAura).toBe(false);
  expect(result.spentLives).toBe(result.hallLives);
  expect(Math.abs(result.copy.x1 - result.copy.x0)).toBeLessThan(12);
  expect(result.copy.x2).toBeGreaterThan(result.copy.x1 + 4);
  expect(result.p1).toBe(1);
  expect(result.p2).toBe(2);
  expect(result.p3).toBe(3);
  expect(result.smile).toBe(true);
  expect(result.endMode).toBe('ending');
  expect(result.quote).toBe("You saw through every illusion. Let's Ride!");
  expect(result.boardReplay).toBe(true);
  expect(result.fastBoard).toBe(true);
  expect(result.fastMax).toBeGreaterThan(result.slow);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('every level completes by scripted run or goal warp', async ({ page }) => {
  const errors = await boot(page);
  const ids = await page.evaluate(() => __DREAM__.levelIds());
  expect(ids).toEqual(expect.arrayContaining(['w1-1','w1-2','w1-3','w1-s','w1-c','w2-1','w2-2','w2-3','w2-c','w3-1','w3-2','w3-3','w3-c','w4-1','w4-2','w4-c','w5-1','w5-2','w5-3','w5-c']));
  const rows = [];
  for (const id of ids) {
    const row = await page.evaluate((id) => {
      const D = __DREAM__;
      D.warp(id);
      let how = 'warp';
      if (id === 'w1-2' || id === 'w2-1' || id === 'w3-2' || id === 'w5-1') {
        const bot = D.botRun(5000);
        if (bot.mode === 'clear' || bot.mode === 'unmask' || bot.mode === 'ending') {
          return { id, how: 'bot', mode: bot.mode, cleared: !!D.getSave().cleared[id], x: bot.x, lives: bot.lives };
        }
      }
      const ok = D.reachGoal(false);
      const st = D.state();
      return { id, how, ok, mode: st.mode, cleared: !!D.getSave().cleared[id] || st.mode === 'unmask' || st.mode === 'ending' };
    }, id);
    rows.push(row);
    expect(row.cleared, JSON.stringify(row)).toBe(true);
  }
  console.log('LEVELS ' + JSON.stringify(rows));
  expect(errors, errors.join('\n')).toEqual([]);
});

test('frame pacing', async ({ page }) => {
  const errors = track(page);
  await page.goto(`${GAME}?touch=0`);
  await page.waitForFunction(() => window.__DREAM__);
  await page.evaluate(() => { __DREAM__.warp('w3-2'); __DREAM__.resetStats(); });
  await page.waitForTimeout(2500);
  const stats = await page.evaluate(() => __DREAM__.frameStats());
  console.log('FRAME_P95 ' + JSON.stringify(stats));
  fs.mkdirSync(ART, { recursive: true });
  fs.writeFileSync(path.join(ART, 'frame-stats.json'), JSON.stringify(stats, null, 2));
  expect(stats.n).toBeGreaterThan(40);
  expect(stats.p95).toBeLessThan(50);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('phone portrait controls', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = track(page);
  await page.goto(`http://127.0.0.1:4173${GAME}?touch=1`);
  await page.waitForFunction(() => window.__DREAM__);
  await page.evaluate(() => { __DREAM__.setManual(true); __DREAM__.warp('w1-1'); });
  const before = await page.evaluate(() => __DREAM__.layout());
  expect(before.touch).toBe(true);
  expect(before.centerCovered).toBe(false);
  expect(before.onScreen).toBe(true);
  expect(before.ctrls.map((c) => c.label).sort()).toEqual(['BACK', 'BLAST', 'DOWN', 'JUMP', 'LEFT', 'RIGHT']);
  for (const c of before.ctrls) {
    expect(c.w, c.id).toBeGreaterThanOrEqual(64);
    expect(c.h, c.id).toBeGreaterThanOrEqual(56);
  }
  const backBefore = before.ctrls.find((c) => c.id === 'back');
  await page.locator('[data-act=jump]').focus();
  const focused = await page.evaluate(() => __DREAM__.layout());
  expect(focused.ctrls.find((c) => c.id === 'jump').hot).toBe(true);
  expect(focused.centerCovered).toBe(false);
  await page.locator('[data-act=back]').dispatchEvent('pointerdown', { bubbles: true, pointerId: 1, pointerType: 'touch', isPrimary: true });
  const grown = await page.evaluate(() => __DREAM__.layout());
  const back = grown.ctrls.find((c) => c.id === 'back');
  expect(back.hot).toBe(true);
  expect(back.w).toBeGreaterThan(backBefore.w * 1.02);
  expect(back.h).toBeGreaterThan(backBefore.h * 1.02);
  expect(back.x).toBeGreaterThanOrEqual(-2);
  expect(back.y).toBeGreaterThanOrEqual(-2);
  expect(back.x + back.w).toBeLessThanOrEqual(grown.vw + 2);
  expect(back.y + back.h).toBeLessThanOrEqual(grown.vh + 2);
  expect(grown.centerCovered).toBe(false);
  const shots = await page.evaluate(() => __DREAM__.state().shots);
  await page.evaluate(() => __DREAM__.step(1));
  const st = await page.evaluate(() => __DREAM__.state());
  expect(st.mode).toBe('pause');
  expect(st.shots).toBe(shots);
  fs.mkdirSync(ART, { recursive: true });
  await page.screenshot({ path: path.join(ART, 'phone-portrait.png') });
  expect(errors, errors.join('\n')).toEqual([]);
  await context.close();
});

test('phone landscape controls', async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    hasTouch: true,
    isMobile: true,
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const errors = track(page);
  await page.goto(`http://127.0.0.1:4173${GAME}?touch=1`);
  await page.waitForFunction(() => window.__DREAM__);
  await page.evaluate(() => { __DREAM__.setManual(true); __DREAM__.warp('w2-1'); });
  const info = await page.evaluate(() => __DREAM__.layout());
  expect(info.touch).toBe(true);
  expect(info.centerCovered).toBe(false);
  expect(info.onScreen).toBe(true);
  expect(info.ctrls).toHaveLength(6);
  for (const c of info.ctrls) {
    expect(c.w, c.id).toBeGreaterThanOrEqual(64);
    expect(c.h, c.id).toBeGreaterThanOrEqual(56);
    const cx = info.canvas.x + info.canvas.w / 2;
    const cy = info.canvas.y + info.canvas.h / 2;
    const covers = cx >= c.x && cx <= c.x + c.w && cy >= c.y && cy <= c.y + c.h;
    expect(covers, c.id).toBe(false);
  }
  fs.mkdirSync(ART, { recursive: true });
  await page.screenshot({ path: path.join(ART, 'phone-landscape.png') });
  expect(errors, errors.join('\n')).toEqual([]);
  await context.close();
});

test('screenshots and posters', async ({ page }) => {
  const errors = await boot(page);
  fs.mkdirSync(ART, { recursive: true });
  async function shot(name) {
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    await page.locator('canvas').screenshot({ path: path.join(ART, name + '.png') });
  }
  await page.evaluate(() => __DREAM__.pose('title'));
  await shot('title');
  await page.evaluate(() => __DREAM__.pose('tent'));
  await shot('tent-intro');
  await page.evaluate(() => __DREAM__.pose('headset'));
  await shot('headset-on');
  await page.evaluate(() => __DREAM__.pose('map'));
  await shot('map');
  for (const [id, name] of [['w1-1', 'world-1'], ['w2-1', 'world-2'], ['w3-1', 'world-3'], ['w4-1', 'world-4']]) {
    await page.evaluate((levelId) => __DREAM__.pose('world', levelId), id);
    await shot(name);
  }
  await page.evaluate(() => __DREAM__.pose('aura'));
  await shot('aura');
  await page.evaluate(() => __DREAM__.pose('buddy'));
  await shot('buddy');
  await page.evaluate(() => __DREAM__.pose('blaster'));
  await shot('blaster');
  await page.evaluate(() => __DREAM__.pose('board'));
  await shot('board');
  await page.evaluate(() => __DREAM__.pose('fright'));
  await shot('boss-fright');
  await page.evaluate(() => { __DREAM__.warp('w4-c'); __DREAM__.reachGoal(false); __DREAM__.pose('headsetOff'); });
  await shot('headset-off');
  await page.evaluate(() => __DREAM__.pose('hall'));
  await shot('hall-of-mirrors');
  for (const twist of ['speedy', 'heavy', 'copy', 'star', 'hop']) {
    await page.evaluate((t) => __DREAM__.focusMirror(t), twist);
    await shot('mirror-' + twist);
  }
  for (const phase of [1, 2, 3]) {
    await page.evaluate((p) => __DREAM__.focusSpike(p), phase);
    await shot('spike-phase-' + phase);
  }
  await page.evaluate(() => { __DREAM__.warp('w5-c'); __DREAM__.reachGoal(false); });
  await shot('ending');
  await page.evaluate(() => __DREAM__.pose('board'));
  await shot('board-replay');

  await page.setViewportSize({ width: 1280, height: 700 });
  await page.goto(`${GAME}?poster=og&touch=0`);
  await page.waitForTimeout(200);
  await page.locator('canvas').screenshot({ path: '/tmp/sdl-og.png' });
  await page.setViewportSize({ width: 700, height: 900 });
  await page.goto(`${GAME}?poster=card&touch=0`);
  await page.waitForTimeout(200);
  await page.locator('canvas').screenshot({ path: '/tmp/sdl-card.png' });
  execFileSync('ffmpeg', ['-y', '-i', '/tmp/sdl-og.png', '-frames:v', '1', '-q:v', '3', '/workspace/spikes-dreamland/og.jpg'], { stdio: 'pipe' });
  execFileSync('ffmpeg', ['-y', '-i', '/tmp/sdl-card.png', '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82', '/workspace/spikes-dreamland/card.webp'], { stdio: 'pipe' });
  const og = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', '/workspace/spikes-dreamland/og.jpg'], { encoding: 'utf8' }).trim();
  const card = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', '/workspace/spikes-dreamland/card.webp'], { encoding: 'utf8' }).trim();
  expect(og).toBe('1200,630');
  expect(card).toBe('600,800');
  fs.copyFileSync('/workspace/spikes-dreamland/og.jpg', path.join(ART, 'og.jpg'));
  fs.copyFileSync('/workspace/spikes-dreamland/card.webp', path.join(ART, 'card.webp'));
  expect(errors, errors.join('\n')).toEqual([]);
});
