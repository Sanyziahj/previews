import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

const SKIPPY_SAVE = JSON.stringify({
  z: 'bow', v: 1, area: 'home', x: 160, y: 160, dir: 0,
  hp: 6, maxHp: 6, pieces: 0, coins: 42, arrows: 3,
  items: { baton: true }, keys: {}, bigKeys: {},
  flags: { woke: true }, party: [], shards: 1, time: 88,
  visited: { home: true },
});

function track(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  return errors;
}

async function boot(page, { save, ros } = {}) {
  await page.addInitScript((payload) => {
    window.__SQ_DEBUG = true;
    if (payload && payload.skippy) localStorage.setItem('sq_save_v1', payload.skippy);
    if (payload && payload.ros) localStorage.setItem('sq_save_ros_v1', payload.ros);
  }, save || null);
  const errors = track(page);
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ && document.getElementById('sr-live'));
  await page.evaluate(() => { __SQ.setManual(true); __SQ.step(8); });
  return errors;
}

async function tap(page, key) {
  await page.evaluate((k) => {
    __SQ.press(k, true); __SQ.step(2); __SQ.press(k, false); __SQ.step(2);
  }, key);
  await page.waitForTimeout(280);
}

async function closeTalk(page) {
  await page.evaluate(() => {
    const S = __SQ;
    S.skipText();
    S.press('talk', true); S.step(2); S.press('talk', false); S.step(3);
  });
}

test('chapter select keeps Santt last and the page unlisted', async ({ page }) => {
  const errors = await boot(page);
  const text = await page.locator('#sr-live').innerText();
  const order = ['SKIPPY\'S QUEST', 'THE ROGUE OUTLAW SHERIFF', 'SPIKE', 'DRILL SERGEANT', 'RONIN', 'RAMSHACKLE', 'SANTT'];
  let at = -1;
  for (const name of order) {
    const i = text.indexOf(name);
    expect(i, name).toBeGreaterThan(at);
    at = i;
  }
  expect(text).toContain('SOON');
  expect(await page.locator('meta[name="robots"]').getAttribute('content')).toBe('noindex,nofollow');
  const html = await page.content();
  expect(html).not.toContain('NEXT: SANTT');
  await page.screenshot({ path: `${ART}/ros-chapter-select.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('main yard, lasers, and coming home to the order', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => __SQ.step(20));
  await tap(page, 'down');
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(20));
  await tap(page, 'attack');
  const yard = await page.evaluate(() => ({
    state: __SQ.G.state, area: __SQ.A.id, hero: __SQ.PID(), wep: __SQ.gear().wep,
  }));
  expect(yard.state).toBe('play');
  expect(yard.area).toBe('ros_yard');
  expect(yard.hero).toBe('ros');
  expect(yard.wep).toBe('lasers');
  const shots = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 6; i++) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(4);
    return S.shots.filter((s) => s.kind === 'stun').length;
  });
  expect(shots).toBeGreaterThanOrEqual(2);
  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8; i++) {
      if (!S.script && !S.dlg) break;
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    for (const e of S.ents.filter((en) => !en.dead)) {
      S.P.x = e.x - 18; S.P.y = e.y + 4; S.P.dir = 3; S.P.arrowCd = 0;
      S.press('attack', true); S.step(2); S.press('attack', false); S.step(12);
    }
    S.step(8);
  });
  const cleared = await page.evaluate(() => __SQ.flags.yard_clear);
  expect(cleared).toBe(true);
  await page.evaluate(() => { __SQ.warp('ros_pour', 8, 8, 0); __SQ.step(4); });
  for (let i = 0; i < 40; i++) {
    const done = await page.evaluate(() => __SQ.party.includes('nuke') && !__SQ.script && !__SQ.dlg);
    if (done) break;
    await page.evaluate(() => {
      const S = __SQ;
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
      else S.step(2);
    });
  }
  const home = await page.evaluate(() => ({
    nuke: __SQ.party.includes('nuke'),
    obj: __SQ.objective(),
    area: __SQ.A.id,
  }));
  expect(home.nuke).toBe(true);
  expect(home.area).toBe('ros_pour');
  expect(home.obj.length).toBeGreaterThan(8);
  await page.screenshot({ path: `${ART}/ros-pour-order.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('weapons and boards do different work', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play'; S.G.story = 'ros';
    S.warp('ros_desert', 8, 8, 3);
    S.P.items.blasters = true; S.P.items.justice = true; S.P.items.lasso = true; S.P.items.brand = true;
    S.P.wep = 'justice'; S.P.tool = 'lasso'; S.P.z = 'lasso';
    S.step(5);
  });
  const justice = await page.evaluate(() => {
    const S = __SQ;
    S.G.paused = false;
    S.ents.forEach((e) => { e.dead = true; });
    S.P.x = 200; S.P.y = 160; S.P.dir = 3;
    S.shots.length = 0;
    S.press('attack', true);
    S.step(40);
    S.press('attack', false);
    S.step(1);
    return S.shots.filter((s) => s.kind === 'justice').length;
  });
  expect(justice).toBe(1);
  await page.evaluate(() => { __SQ.P.arrowCd = 0; __SQ.G.paused = false; });
  const lasers = await page.evaluate(() => {
    const S = __SQ;
    S.P.wep = 'lasers';
    S.shots.length = 0;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(3);
    return S.shots.filter((s) => s.kind === 'stun').length;
  });
  expect(lasers).toBeGreaterThanOrEqual(2);
  await page.evaluate(() => { __SQ.G.paused = true; __SQ.G.rosPage = 2; __SQ.step(1); });
  await page.screenshot({ path: `${ART}/ros-gear.png` });
  await page.evaluate(() => { __SQ.G.paused = false; });
  const brand = await page.evaluate(() => {
    const S = __SQ;
    S.warp('ros_yard', 6, 5, 0);
    S.step(2);
    for (let i = 0; i < 8; i++) {
      if (!S.script) break;
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.P.tool = 'brand';
    S.P.items.brand = true;
    S.P.arrowCd = 0;
    const foe = S.ents.find((e) => !e.dead);
    if (foe) { S.P.x = foe.x; S.P.y = foe.y; }
    const before = S.ents.filter((e) => !e.dead).length;
    S.press('item', true); S.step(2); S.press('item', false); S.step(24);
    return { before, after: S.ents.filter((e) => !e.dead).length };
  });
  expect(brand.after).toBeLessThan(brand.before);
  const speed = await page.evaluate(() => {
    const S = __SQ;
    S.warp('ros_desert', 6, 4, 3);
    S.step(3);
    function run(board) {
      S.P.boardId = board;
      S.P.x = 120; S.P.y = 80;
      S.press('right', true); S.step(30); S.press('right', false); S.step(2);
      return S.P.x - 120;
    }
    return { dust: run('dust'), walk: run(''), skim: run('skimmer') };
  });
  expect(speed.dust).toBeGreaterThan(speed.walk + 8);
  expect(speed.walk).toBeGreaterThan(speed.skim);
  const hop = await page.evaluate(() => {
    const S = __SQ;
    S.warp('ros_mesa', 14, 6, 3);
    S.step(2);
    const x0 = S.P.x;
    S.P.boardId = '';
    S.press('roll', true); S.step(8); S.press('roll', false); S.step(4);
    const walked = S.P.x;
    S.warp('ros_mesa', 14, 6, 3);
    S.P.boardId = 'hopper';
    S.P.roll = 0; S.P.rollCd = 0;
    S.press('roll', true); S.step(4); S.press('roll', false); S.step(2);
    return { x0, walked, hopped: S.P.x };
  });
  expect(hop.hopped).toBeGreaterThan(hop.walked + 20);
  await page.screenshot({ path: `${ART}/ros-mesa-hop.png` });
  const wanted = await page.evaluate(() => {
    const S = __SQ;
    function watch(board) {
      S.warp('ros_storm', 16, 8, 1);
      S.step(2);
      const coat = S.ents.find((e) => e.k === 'redcoat');
      const cx = coat ? coat.x : 200, cy = coat ? coat.y : 160;
      S.G.wanted = 0; S.P.boardId = board; S.P.x = cx; S.P.y = cy + 36;
      for (let i = 0; i < 180; i++) {
        if (coat) { coat.dir = 0; coat.x = cx; coat.y = cy; coat.stun = 1; coat.dead = false; }
        S.P.x = cx; S.P.y = cy + 36;
        S.step(1);
      }
      return S.wanted();
    }
    return { skim: watch('skimmer'), dust: watch('dust') };
  });
  expect(wanted.skim).toBeLessThan(0.2);
  expect(wanted.dust).toBeGreaterThan(0.5);
  await page.screenshot({ path: `${ART}/ros-desert-desktop.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('side journeys: noodles, evidence, dream posters', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => { __SQ.G.state = 'play'; __SQ.G.story = 'ros'; });
  const noodle = await page.evaluate(() => {
    const S = __SQ;
    function close() {
      S.skipText(); S.press('talk', true); S.step(2); S.press('talk', false); S.step(3);
    }
    S.warp('ros_noodle', 4, 6, 0); S.step(2);
    S.run('noodle_p'); S.step(2); close();
    const wrong = S.flags.noodle_step || 0;
    S.run('noodle_f'); S.step(2); close();
    const one = S.flags.noodle_step;
    S.run('noodle_n'); S.step(2); close();
    S.run('noodle_p'); S.step(2);
    for (let i = 0; i < 12; i++) {
      close();
      if (S.flags.noodle_done && !S.script) break;
    }
    return { wrong, one, done: !!S.flags.noodle_done };
  });
  expect(noodle.wrong).toBe(0);
  expect(noodle.one).toBe(1);
  expect(noodle.done).toBe(true);
  await page.screenshot({ path: `${ART}/ros-noodle.png` });

  const truce = await page.evaluate(() => {
    const S = __SQ;
    S.flag('proof1'); S.flag('bots_done');
    S.warp('ros_club', 8, 8, 0); S.step(2);
    S.run('ev_open'); S.step(3);
    // toggle the three signature pages, not the ping
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
    S.press('down', true); S.step(2); S.press('down', false); S.step(2);
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
    S.press('down', true); S.step(2); S.press('down', false); S.step(2);
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
    S.press('talk', true); S.step(3); S.press('talk', false); S.step(3);
    for (let i = 0; i < 12; i++) {
      S.skipText(); S.press('talk', true); S.step(2); S.press('talk', false); S.step(2);
      if (S.flags.truce) break;
    }
    return { truce: !!S.flags.truce, obj: S.objective() };
  });
  expect(truce.truce).toBe(true);
  await page.screenshot({ path: `${ART}/ros-supernova.png` });

  const dream = await page.evaluate(() => {
    const S = __SQ;
    S.warp('ros_dream', 4, 5, 0);
    S.step(2);
    for (let i = 0; i < 8; i++) {
      if (!S.script) break;
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.P.tool = 'lasso'; S.P.items.lasso = true; S.P.z = 'lasso';
    function pull(tx, ty) {
      S.warp('ros_dream', tx, ty, 1);
      S.ents.forEach((e) => { e.stun = 9; e.x = 16; e.y = 16; });
      S.press('left', false); S.press('right', false); S.press('up', false); S.press('down', false);
      S.P.x = (tx + 0.5) * 16; S.P.y = (ty + 0.5) * 16; S.P.tool = 'lasso'; S.P.z = 'lasso';
      S.P.arrowCd = 0;
      S.press('item', true); S.step(2); S.press('item', false); S.step(2);
    }
    pull(4, 5);
    const one = !!S.flags.p1;
    pull(8, 6);
    pull(12, 5);
    pull(10, 9);
    for (let i = 0; i < 12; i++) {
      if (S.flags.dream_win && S.A.id === 'ros_pour' && !S.script) break;
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
      else S.step(2);
    }
    return { one, win: !!S.flags.dream_win, area: S.A.id, p2: !!S.flags.p2, p3: !!S.flags.p3, p4: !!S.flags.p4, toast: S.G.toast };
  });
  expect(dream.one).toBe(true);
  expect(dream.win, JSON.stringify(dream)).toBe(true);
  expect(dream.area).toBe('ros_pour');
  await page.screenshot({ path: `${ART}/ros-dream.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('campaign routes pay off', async ({ page }) => {
  const errors = await boot(page);
  const out = await page.evaluate(() => {
    const S = __SQ;
    function closeAll(n) {
      for (let i = 0; i < n; i++) {
        if (!S.dlg && !S.script && !S.getPop) break;
        if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
        else if (S.getPop) { S.step(40); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
        else S.step(1);
      }
    }
    function mash(flag, n) {
      for (let i = 0; i < n; i++) {
        if (S.flags[flag] && !S.script && !S.dlg && !S.getPop) return;
        if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
        else if (S.getPop) { S.step(40); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
        else S.step(2);
      }
    }
    S.G.state = 'play'; S.G.story = 'ros';
    S.P.god = true; S.P.hp = 12; S.P.maxHp = 12;
    S.P.items.blasters = true; S.P.wep = 'lasers';
    S.P.items.lasso = true; S.P.z = 'lasso'; S.flag('lasso_got');

    S.warp('ros_canyon', 8, 5, 3); S.step(2);
    S.G.wanted = 5;
    S.run('canyon_check'); S.step(3); closeAll(6);
    const hot = !S.flags.dust_got;
    S.G.wanted = 0;
    S.run('canyon_check'); S.step(3); mash('dust_got', 12);

    S.run('storm_try'); S.step(3); mash('storm_open', 8);

    S.warp('rs3', 10, 8, 1);
    for (let i = 0; i < 800 && S.B.state !== 'fight'; i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(1);
    }
    const sent = { state: S.B.state, kind: S.B.kind, hp: S.B.hp, log: [] };
    sent.log.push([S.B.state, S.B.hp]);
    S.bossHurt(4);
    sent.log.push([S.B.state, S.B.hp]);
    for (let i = 0; i < 20 && S.B.state === 'fight'; i++) S.bossHurt(4);
    sent.log.push([S.B.state, S.B.hp, !!S.flags.boss_sentinel]);
    for (let i = 0; i < 500 && !S.flags.proof1; i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(1);
    }
    mash('proof1', 16);
    sent.after = { state: S.B.state, hp: S.B.hp, dead: !!S.flags.boss_sentinel, proof: !!S.flags.proof1, script: S.script, dlg: !!S.dlg, play: S.G.state };

    closeAll(12);
    S.warp('ros_bots', 4, 8, 1); S.step(2);
    S.killAll();
    for (let i = 0; i < 80 && !S.flags.bots_done; i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(1);
    }
    mash('bots_done', 12);

    closeAll(12);
    S.warp('cv2', 8, 6, 1); S.step(2); closeAll(8);
    S.run('cv_west'); S.step(4); closeAll(6);
    S.run('cv_east'); S.step(4); mash('cv2_clear', 10);
    S.warp('cv3', 4, 8, 3); S.step(2);
    S.killAll();
    for (let i = 0; i < 80 && !S.flags.cv_ping; i++) S.step(1);
    mash('cv_ping', 12);

    S.flag('accused_done');
    S.warp('ros_pour', 8, 8, 0); S.step(2); closeAll(24);
    S.run('booth_enter');
    for (let i = 0; i < 80 && S.A.id !== 'ros_moon'; i++) S.step(1);
    const moon = S.A.id;
    const gate = S.tile(23, 7);
    S.P.x = 348; S.P.y = 120; S.P.dir = 3;
    const x0 = S.P.x;
    S.press('right', true); S.step(40); S.press('right', false); S.step(2);
    const crossed = S.A.id === 'rc1' || S.P.x > x0 + 12;

    S.warp('ros_track', 4, 8, 3);
    for (let i = 0; i < 500 && S.B.state !== 'fight'; i++) S.step(1);
    for (let i = 0; i < 20 && S.B.state === 'fight'; i++) S.bossHurt(5);
    for (let i = 0; i < 400 && !S.flags.shadow_under; i++) S.step(1);
    mash('shadow_under', 16);

    S.warp('rc3', 8, 8, 1);
    for (let i = 0; i < 600 && S.B.state !== 'fight'; i++) S.step(1);
    for (let i = 0; i < 24 && S.B.state === 'fight'; i++) S.bossHurt(4);
    for (let i = 0; i < 500 && !S.flags.proof3; i++) S.step(1);
    mash('proof3', 20);

    S.flag('dream_win');
    S.warp('ros_pour', 16, 6, 1); S.step(2); closeAll(8);
    S.run('rusty_chair');
    for (let i = 0; i < 40 && S.G.state !== 'endcard'; i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
      else S.step(2);
    }
    return {
      hot,
      dust: !!S.flags.dust_got && S.gear().board === 'dust',
      storm: !!S.flags.storm_open,
      hollow: !!S.flags.proof1 && !!S.P.items.justice,
      bots: !!S.flags.bots_done,
      order: !!S.flags.cv2_clear,
      ping: !!S.flags.cv_ping,
      moon, gate, crossed,
      shadow: !!S.flags.shadow_under,
      cell: !!S.flags.proof3,
      end: S.G.state,
      boss: S.B.state,
      sent,
    };
  });
  expect(out.hot, JSON.stringify(out)).toBe(true);
  expect(out.dust, JSON.stringify(out)).toBe(true);
  expect(out.storm, JSON.stringify(out)).toBe(true);
  expect(out.hollow, JSON.stringify(out)).toBe(true);
  expect(out.bots, JSON.stringify(out)).toBe(true);
  expect(out.order, JSON.stringify(out)).toBe(true);
  expect(out.ping, JSON.stringify(out)).toBe(true);
  expect(out.moon, JSON.stringify(out)).toBe('ros_moon');
  expect(out.gate, JSON.stringify(out)).toBe('j');
  expect(out.crossed, JSON.stringify(out)).toBe(true);
  expect(out.shadow, JSON.stringify(out)).toBe(true);
  expect(out.cell, JSON.stringify(out)).toBe(true);
  expect(out.end, JSON.stringify(out)).toBe('endcard');
  await page.screenshot({ path: `${ART}/ros-ending.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('saves migrate and Skippy is untouched', async ({ page }) => {
  const oldRos = JSON.stringify({
    z: 'bow', v: 1, area: 'ros_nowhere', x: 80, y: 80, dir: 1,
    hp: 8, maxHp: 8, pieces: 0, coins: 0, arrows: 0,
    items: { blasters: true, board: true, lasso: true },
    keys: {}, bigKeys: {},
    flags: { nuke_joined: true, proof1: true, woke: true },
    party: ['nuke'], shards: 0, time: 40, visited: {}, wanted: 2,
  });
  const errors = await boot(page, { save: { skippy: SKIPPY_SAVE, ros: oldRos } });
  expect(await page.evaluate(() => localStorage.getItem('sq_save_v1'))).toBe(SKIPPY_SAVE);
  await page.evaluate(() => __SQ.step(20));
  await tap(page, 'down');
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(20));
  await tap(page, 'attack');
  const back = await page.evaluate(() => ({
    area: __SQ.A.id,
    board: __SQ.gear().board,
    blasters: !!__SQ.P.items.blasters,
    nuke: __SQ.party.includes('nuke'),
    proof: !!__SQ.flags.proof1,
    wanted: __SQ.wanted(),
    skippy: localStorage.getItem('sq_save_v1'),
  }));
  expect(back.area).toBe('ros_pour');
  expect(back.board).toBe('dust');
  expect(back.blasters).toBe(true);
  expect(back.nuke).toBe(true);
  expect(back.proof).toBe(true);
  expect(back.wanted).toBe(2);
  expect(back.skippy).toBe(SKIPPY_SAVE);

  await page.reload();
  await page.waitForFunction(() => window.__SQ);
  await page.evaluate(() => { __SQ.setManual(true); __SQ.step(20); });
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(20));
  await tap(page, 'attack');
  const skippy = await page.evaluate(() => ({
    story: __SQ.story(), state: __SQ.G.state, area: __SQ.A.id, hero: __SQ.PID(),
  }));
  expect(skippy.story).toBe('skippy');
  expect(skippy.state).toBe('play');
  expect(skippy.area).toBe('home');
  expect(skippy.hero).toBe('skippy');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('Skippy new game still opens on the dream', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => __SQ.step(20));
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(20));
  await tap(page, 'attack');
  const skippy = await page.evaluate(() => ({
    story: __SQ.story(), state: __SQ.G.state, area: __SQ.A.id, hero: __SQ.PID(), script: __SQ.script,
  }));
  expect(skippy.story).toBe('skippy');
  expect(skippy.state).toBe('play');
  expect(skippy.area).toBe('dream');
  expect(skippy.hero).toBe('skippy');
  expect(skippy.script).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('BACK cancels and does not roll or attack', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => __SQ.step(20));
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(20));
  const left = await page.evaluate(() => {
    const S = __SQ;
    S.press('back', true); S.step(3); S.press('back', false); S.step(2);
    return { state: S.G.state, roll: !!S.I.roll, attack: !!S.I.attack, rollAmt: S.P.roll || 0 };
  });
  expect(left.state).toBe('stories');
  expect(left.roll).toBe(false);
  expect(left.attack).toBe(false);
  expect(left.rollAmt).toBe(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

const DONE_SKIPPY = JSON.stringify({
  z: 'bow', v: 1, area: 'desert', x: 200, y: 140, dir: 3,
  hp: 6, maxHp: 6, pieces: 0, coins: 42, arrows: 3,
  items: { baton: true }, keys: {}, bigKeys: {},
  flags: { woke: true, ch9_done: true, santt_met: true, macho_seen: true },
  party: [], shards: 7, time: 900,
  visited: { desert: true, home: true },
});

async function enterContinue(page) {
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'attack');
  await page.waitForFunction(() => __SQ.G.state === 'play');
}

async function advanceTalk(page) {
  await page.evaluate(() => {
    const S = __SQ;
    if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
    else if (S.getPop) { S.step(40); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
    else S.step(3);
  });
}

async function reachTaleChoice(page) {
  await page.evaluate(() => { __SQ.warp('desert', 32, 8, 3); __SQ.step(6); });
  for (let i = 0; i < 24; i++) {
    const st = await page.evaluate(() => {
      const d = __SQ.dlg;
      const text = d ? d.pages.map((p) => p.join(' ')).join(' ') : '';
      return { choice: !!__SQ.G.choice, text, obj: __SQ.objective(), area: __SQ.A.id };
    });
    if (st.choice) return st;
    if (st.text.includes('TALES OF THE OUTLAW')) {
      await page.evaluate(() => { __SQ.skipText(); __SQ.step(1); });
      await page.screenshot({ path: `${ART}/tale-mirage.png` });
    }
    await advanceTalk(page);
  }
  return page.evaluate(() => ({ choice: !!__SQ.G.choice, obj: __SQ.objective(), area: __SQ.A.id, text: '' }));
}

test('finished Skippy hears the tale and wakes as ROS', async ({ page }) => {
  const errors = await boot(page, { save: { skippy: DONE_SKIPPY } });
  await enterContinue(page);
  const obj = await page.evaluate(() => __SQ.objective());
  expect(obj).toContain('PIONEER POUR');
  const arrived = await reachTaleChoice(page);
  expect(arrived.choice, JSON.stringify(arrived)).toBe(true);
  await page.screenshot({ path: `${ART}/tale-choice.png` });
  await page.evaluate(() => { __SQ.press('talk', true); __SQ.step(2); __SQ.press('talk', false); __SQ.step(2); });
  for (let i = 0; i < 12 && await page.evaluate(() => __SQ.G.state === 'play'); i++) await advanceTalk(page);
  await page.waitForFunction(() => __SQ.G.state === 'flash' || __SQ.G.state === 'play' && __SQ.story() === 'ros');
  if (await page.evaluate(() => __SQ.G.state === 'flash')) {
    await page.screenshot({ path: `${ART}/tale-flash.png` });
    const card = await page.locator('#sr-live').innerText();
    expect(card).toContain('CHAPTER 2');
    expect(card).toContain('THE ROGUE OUTLAW SHERIFF');
    await page.evaluate(() => { __SQ.step(30); __SQ.press('talk', true); __SQ.step(2); __SQ.press('talk', false); __SQ.step(8); });
  }
  await page.waitForFunction(() => __SQ.G.state === 'play' && __SQ.story() === 'ros');
  const ride = await page.evaluate(() => ({
    area: __SQ.A.id,
    hero: __SQ.PID(),
    skippy: JSON.parse(localStorage.getItem('sq_save_v1')),
    ros: JSON.parse(localStorage.getItem('sq_save_ros_v1')),
  }));
  expect(ride.area).toBe('ros_yard');
  expect(ride.hero).toBe('ros');
  expect(ride.skippy.coins).toBe(42);
  expect(ride.skippy.flags.ch9_done).toBe(true);
  expect(ride.skippy.shards).toBe(7);
  expect(ride.ros.flags.tale_from).toBe('ros');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('declining the tale leaves both roads where they were', async ({ page }) => {
  const errors = await boot(page, { save: { skippy: DONE_SKIPPY } });
  await enterContinue(page);
  const arrived = await reachTaleChoice(page);
  expect(arrived.choice).toBe(true);
  await page.evaluate(() => { __SQ.press('back', true); __SQ.step(2); __SQ.press('back', false); __SQ.step(6); });
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => !__SQ.script && !__SQ.dlg && !__SQ.G.choice)) break;
    await advanceTalk(page);
  }
  const left = await page.evaluate(() => ({
    story: __SQ.story(),
    area: __SQ.A.id,
    heard: !!__SQ.flags.tale_ros,
    ros: localStorage.getItem('sq_save_ros_v1'),
    coins: JSON.parse(localStorage.getItem('sq_save_v1')).coins,
  }));
  expect(left.story).toBe('skippy');
  expect(left.area).toBe('desert');
  expect(left.heard).toBe(false);
  expect(left.ros).toBe(null);
  expect(left.coins).toBe(42);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('an existing ROS save can continue, and start-over asks first', async ({ page }) => {
  const oldRos = JSON.stringify({
    z: 'bow', v: 1, area: 'ros_pour', x: 160, y: 120, dir: 1,
    hp: 8, maxHp: 8, pieces: 0, coins: 0, arrows: 0,
    items: { blasters: true, lasso: true }, keys: {}, bigKeys: {},
    flags: { nuke_joined: true, proof1: true, yard_clear: true, woke: true },
    party: ['nuke'], shards: 0, time: 40, visited: { ros_pour: true }, wanted: 1,
    wep: 'lasers', tool: 'lasso', boardId: 'dust',
  });
  const errors = await boot(page, { save: { skippy: DONE_SKIPPY, ros: oldRos } });
  await enterContinue(page);
  await reachTaleChoice(page);
  await page.evaluate(() => { __SQ.press('talk', true); __SQ.step(2); __SQ.press('talk', false); __SQ.step(2); });
  for (let i = 0; i < 16 && await page.evaluate(() => __SQ.G.state !== 'talego'); i++) {
    if (await page.evaluate(() => __SQ.G.state === 'flash')) {
      await page.evaluate(() => { __SQ.press('talk', true); __SQ.step(2); __SQ.press('talk', false); __SQ.step(4); });
    } else await advanceTalk(page);
  }
  expect(await page.evaluate(() => __SQ.G.state)).toBe('talego');
  await page.waitForTimeout(300);
  await page.evaluate(() => { __SQ.press('down', true); __SQ.step(2); __SQ.press('down', false); __SQ.step(2); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { __SQ.press('talk', true); __SQ.step(2); __SQ.press('talk', false); __SQ.step(2); });
  const asked = await page.evaluate(() => ({
    phase: __SQ.G.talePhase,
    ros: localStorage.getItem('sq_save_ros_v1'),
  }));
  expect(asked.phase).toBe('confirm');
  expect(JSON.parse(asked.ros).flags.proof1).toBe(true);
  await page.evaluate(() => { __SQ.press('back', true); __SQ.step(2); __SQ.press('back', false); __SQ.step(2); });
  expect(await page.evaluate(() => __SQ.G.talePhase)).toBe('pick');
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('sq_save_ros_v1'))).flags.proof1).toBe(true);
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    __SQ.press('up', false); __SQ.press('down', false); __SQ.press('talk', false);
    __SQ.G.menu = 0;
    __SQ.step(2);
    __SQ.press('talk', true); __SQ.step(3); __SQ.press('talk', false); __SQ.step(8);
  });
  const kept = await page.evaluate(() => ({
    story: __SQ.story(),
    state: __SQ.G.state,
    phase: __SQ.G.talePhase,
    menu: __SQ.G.menu,
    taleId: __SQ.G.taleId,
    area: __SQ.A.id,
    proof: !!__SQ.flags.proof1,
    nuke: __SQ.party.includes('nuke'),
    skippy: JSON.parse(localStorage.getItem('sq_save_v1')),
  }));
  expect(kept.story, JSON.stringify(kept)).toBe('ros');
  expect(kept.area).toBe('ros_pour');
  expect(kept.proof).toBe(true);
  expect(kept.nuke).toBe(true);
  expect(kept.skippy.coins).toBe(42);
  expect(kept.skippy.flags.ch9_done).toBe(true);
  await page.evaluate(() => { __SQ.G.state = 'endcard'; __SQ.G.st = 3; __SQ.G.story = 'ros'; });
  await page.evaluate(() => { __SQ.press('attack', true); __SQ.step(3); __SQ.press('attack', false); __SQ.step(8); });
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => __SQ.story() === 'skippy' && __SQ.A.id === 'desert')) break;
    await advanceTalk(page);
  }
  const home = await page.evaluate(() => ({
    story: __SQ.story(),
    area: __SQ.A.id,
    heard: !!__SQ.flags.tale_ros,
    text: __SQ.dlg ? __SQ.dlg.pages.map((p) => p.join(' ')).join(' ') : '',
    skippy: JSON.parse(localStorage.getItem('sq_save_v1')),
    ros: JSON.parse(localStorage.getItem('sq_save_ros_v1')),
  }));
  expect(home.story).toBe('skippy');
  expect(home.area).toBe('desert');
  expect(home.heard).toBe(true);
  expect(home.text.includes('EMPTY CHAIR') || home.text.includes('TALE IS TOLD')).toBe(true);
  expect(home.ros.flags.proof1).toBe(true);
  expect(home.ros.flags.tale_from).toBe('ros');
  expect(home.skippy.coins).toBe(42);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('leaving SuperNova never sticks ROS', async ({ page }) => {
  const errors = await boot(page);
  const doors = await page.evaluate(() => {
    const S = __SQ;
    function rosBoot() {
      S.G.state = 'play';
      S.G.story = 'ros';
      S.P.items.blasters = true;
      S.P.items.lasso = true;
      S.P.z = 'lasso';
      S.P.tool = 'lasso';
      S.flag('accused_done');
    }
    function shift(key) {
      const x0 = S.P.x, y0 = S.P.y;
      S.press(key, true); S.step(24); S.press(key, false); S.step(1);
      const dist = Math.hypot(S.P.x - x0, S.P.y - y0);
      S.P.x = x0; S.P.y = y0;
      return dist;
    }
    function walkOut(board, truce) {
      rosBoot();
      if (truce) S.flag('truce');
      S.P.boardId = board;
      S.warp('ros_club', 10, 11, 0);
      S.step(4);
      S.press('down', true);
      for (let i = 0; i < 90 && S.A.id === 'ros_club'; i++) S.step(1);
      S.press('down', false);
      S.step(6);
      const tile = S.tile(Math.floor(S.P.x / 16), Math.floor((S.P.y - 4) / 16));
      return {
        board, truce: !!truce, area: S.A.id, tile,
        up: shift('up'), left: shift('left'), right: shift('right'),
      };
    }
    const rows = [];
    for (const board of ['', 'dust', 'hopper', 'skimmer']) rows.push(walkOut(board, false));
    rows.push(walkOut('dust', true));
    rosBoot(S);
    S.party.push('nuke');
    S.flag('nuke_joined');
    S.warp('ros_club', 10, 11, 0);
    S.step(4);
    S.press('down', true);
    for (let i = 0; i < 90 && S.A.id === 'ros_club'; i++) S.step(1);
    S.press('down', false);
    S.step(6);
    const withNuke = {
      area: S.A.id,
      nuke: !!(S.comp.on && S.comp.id === 'nuke'),
      up: shift('up'),
    };
    rosBoot(S);
    S.warp('ros_club', 8, 8, 0);
    S.step(2);
    S.run('truce_broke');
    for (let i = 0; i < 30; i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
      else S.step(4);
      if (S.A.id === 'ros_desert' && !S.G.trans) break;
    }
    const ejected = { area: S.A.id, tile: S.tile(Math.floor(S.P.x / 16), Math.floor((S.P.y - 4) / 16)), up: shift('up') };
    const yStick = S.P.y;
    S.stick(0, -1); S.step(20); S.stick(0, 0); S.step(1);
    const stick = yStick - S.P.y;
    return { rows, withNuke, ejected, stick, bad: S.auditLandings() };
  });
  for (const row of doors.rows) {
    expect(row.area, JSON.stringify(row)).toBe('ros_desert');
    expect(row.tile, JSON.stringify(row)).not.toBe('o');
    expect(row.up, JSON.stringify(row)).toBeGreaterThan(8);
    expect(row.left, JSON.stringify(row)).toBeGreaterThan(8);
  }
  expect(doors.withNuke.nuke, JSON.stringify(doors.withNuke)).toBe(true);
  expect(doors.withNuke.up, JSON.stringify(doors.withNuke)).toBeGreaterThan(8);
  expect(doors.ejected.area).toBe('ros_desert');
  expect(doors.ejected.tile).not.toBe('o');
  expect(doors.ejected.up).toBeGreaterThan(8);
  expect(doors.stick).toBeGreaterThan(4);
  expect(doors.bad).toEqual([]);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a save standing on the SuperNova rock can walk again', async ({ page }) => {
  const stuck = JSON.stringify({
    z: 'lasso', v: 1, area: 'ros_desert', x: 168, y: 136, dir: 1,
    hp: 8, maxHp: 8, pieces: 0, coins: 0, arrows: 0,
    items: { blasters: true, lasso: true }, keys: {}, bigKeys: {},
    flags: { woke: true, nuke_joined: true, accused_done: true },
    party: ['nuke'], shards: 0, time: 30,
    visited: { ros_desert: true }, wanted: 1,
    wep: 'lasers', tool: 'lasso', boardId: 'dust',
  });
  const errors = await boot(page, { save: { ros: stuck } });
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'down');
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'attack');
  await page.waitForFunction(() => __SQ.G.state === 'play');
  const freed = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 12; i++) {
      if (!S.script && !S.dlg) break;
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    const tile = S.tile(Math.floor(S.P.x / 16), Math.floor((S.P.y - 4) / 16));
    const wanted = S.wanted();
    const y0 = S.P.y;
    S.P.boardId = '';
    S.press('up', true); S.step(24); S.press('up', false); S.step(1);
    return { area: S.A.id, tile, dy: y0 - S.P.y, wanted, nuke: S.party.includes('nuke') };
  });
  expect(freed.area).toBe('ros_desert');
  expect(freed.tile).not.toBe('o');
  expect(freed.dy).toBeGreaterThan(8);
  expect(freed.wanted).toBe(1);
  expect(freed.nuke).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the Brand sleeps four seconds and then wakes', async ({ page }) => {
  const errors = await boot(page);
  const out = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ros';
    S.P.items.blasters = true;
    S.P.items.brand = true;
    S.P.act = 'brand';
    S.P.tool = 'brand';
    S.warp('ros_yard', 4, 8, 3);
    S.step(2);
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
    const first = (S.G.toast || '').indexOf('STAR BRAND') >= 0 || (S.G.brands || []).length > 0;
    const sleeping = S.P.brandCd > 3;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(1);
    const refused = (S.G.toast || '').indexOf('SLEEPING') >= 0;
    S.G.paused = true;
    const held = S.P.brandCd;
    S.step(90);
    const paused = Math.abs(S.P.brandCd - held) < 0.02;
    S.G.paused = false;
    S.step(260);
    const ready = S.P.brandCd === 0 && (S.G.toast || '').indexOf('BRAND READY') >= 0;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
    const again = (S.G.toast || '').indexOf('STAR BRAND') >= 0;
    return { first, sleeping, refused, paused, ready, again, cd: S.P.brandCd };
  });
  expect(out.first, JSON.stringify(out)).toBe(true);
  expect(out.sleeping, JSON.stringify(out)).toBe(true);
  expect(out.refused, JSON.stringify(out)).toBe(true);
  expect(out.paused, JSON.stringify(out)).toBe(true);
  expect(out.ready, JSON.stringify(out)).toBe(true);
  expect(out.again, JSON.stringify(out)).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('TOOL cycles every owned item and each one fires', async ({ page }) => {
  const errors = await boot(page);
  const out = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ros';
    S.warp('ros_desert', 6, 8, 3);
    S.step(3);
    S.P.items.blasters = true;
    S.P.act = 'lasers';
    S.P.wep = 'lasers';
    const one = S.kit().slice();
    S.press('tool', true); S.step(2); S.press('tool', false); S.step(1);
    const oneStay = S.gear().act;
    S.shots.length = 0;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(3);
    const lasers = S.shots.filter((s) => s.kind === 'stun').length;
    S.P.items.lasso = true;
    S.flag('lasso_got');
    S.P.arrowCd = 0;
    S.press('swap', true); S.step(2); S.press('swap', false); S.step(1);
    const toRope = S.gear().act;
    S.press('tool', true); S.step(2); S.press('tool', false); S.step(1);
    const wrap = S.gear().act;
    S.P.items.justice = true;
    S.P.items.brand = true;
    S.flag('justice_got');
    S.flag('brand_got');
    S.P.act = 'lasers';
    const order = ['lasers'];
    for (let i = 0; i < 4; i++) {
      S.press('tool', true); S.step(2); S.press('tool', false); S.step(1);
      order.push(S.gear().act);
    }
    function fire(id) {
      S.P.act = id;
      S.P.wep = id === 'justice' || id === 'lasers' ? id : S.P.wep;
      S.P.tool = id === 'lasso' || id === 'brand' ? id : S.P.tool;
      S.P.arrowCd = 0;
      S.P.brandCd = 0;
      S.P.charge = 0;
      S.shots.length = 0;
      if (id === 'justice') {
        S.press('attack', true); S.step(40); S.press('attack', false); S.step(2);
        return S.shots.some((s) => s.kind === 'justice');
      }
      S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
      if (id === 'lasers') return S.shots.some((s) => s.kind === 'stun');
      if (id === 'brand') return (S.G.toast || '').indexOf('STAR BRAND') >= 0;
      return (S.G.toast || '').indexOf('ROPE') >= 0 || (S.G.toast || '').indexOf('LASSO') >= 0;
    }
    return {
      one, oneStay, lasers,
      toRope, wrap, order,
      kit: S.kit(),
      fired: {
        lasers: fire('lasers'),
        justice: fire('justice'),
        lasso: fire('lasso'),
        brand: fire('brand'),
      },
    };
  });
  expect(out.one).toEqual(['lasers']);
  expect(out.oneStay).toBe('lasers');
  expect(out.lasers).toBeGreaterThan(0);
  expect(out.toRope).toBe('lasso');
  expect(out.wrap).toBe('lasers');
  expect(out.order).toEqual(['lasers', 'justice', 'lasso', 'brand', 'lasers']);
  expect(out.kit).toEqual(['lasers', 'justice', 'lasso', 'brand']);
  expect(out.fired.lasers).toBe(true);
  expect(out.fired.justice).toBe(true);
  expect(out.fired.lasso).toBe(true);
  expect(out.fired.brand).toBe(true);
  const skippy = await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'skippy';
    S.P.items = { bow: true, raygun: true, baton: true };
    S.P.z = 'bow';
    S.press('tool', true); S.step(2); S.press('tool', false); S.step(1);
    const a = S.P.z;
    S.press('swap', true); S.step(2); S.press('swap', false); S.step(1);
    const b = S.P.z;
    return { a, b, bow: !!S.P.items.bow, ray: !!S.P.items.raygun, baton: !!S.P.items.baton };
  });
  expect(skippy.bow && skippy.ray && skippy.baton).toBe(true);
  expect(skippy.a).toBe('raygun');
  expect(skippy.b).toBe('bow');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the rope locker is labeled and an old kit migrates', async ({ page }) => {
  const old = JSON.stringify({
    z: 'lasso', v: 1, area: 'ros_pour', x: 160, y: 120, dir: 1,
    hp: 8, maxHp: 8, pieces: 0, coins: 0, arrows: 0,
    items: { blasters: true, lasso: true }, keys: {}, bigKeys: {},
    flags: { woke: true, yard_clear: true, accused_done: true, lasso_got: true },
    brandCd: 9,
    party: [], shards: 0, time: 10, visited: { ros_pour: true },
    wanted: 0, wep: 'lasers', tool: 'lasso', boardId: '',
  });
  const errors = await boot(page, { save: { ros: old } });
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'down');
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(25));
  await tap(page, 'attack');
  await page.waitForFunction(() => __SQ.G.state === 'play');
  const migrated = await page.evaluate(() => ({
    kit: __SQ.kit(),
    cd: __SQ.P.brandCd || 0,
    act: __SQ.gear().act,
  }));
  expect(migrated.kit).toEqual(expect.arrayContaining(['lasers', 'lasso', 'brand']));
  expect(migrated.cd).toBe(0);
  await page.evaluate(() => {
    const S = __SQ;
    S.flag('lasso_got', false);
    S.P.items.lasso = false;
    S.P.items.brand = false;
    S.flag('brand_got', false);
    S.flag('yard_clear');
    S.flag('accused_done');
    S.warp('ros_pour', 17, 8, 3);
    S.step(2);
    for (let i = 0; i < 16 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
  });
  const obj = await page.evaluate(() => __SQ.objective());
  expect(obj).toContain('LOCKER');
  await page.screenshot({ path: `${ART}/ros-rope-locker.png` });
  await page.evaluate(() => { __SQ.press('talk', true); __SQ.step(3); __SQ.press('talk', false); __SQ.step(4); });
  const got = await page.evaluate(() => ({
    lasso: !!__SQ.P.items.lasso,
    lasers: !!__SQ.P.items.blasters,
    flag: !!__SQ.flags.lasso_got,
  }));
  expect(got.lasso).toBe(true);
  expect(got.lasers).toBe(true);
  expect(got.flag).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('active play frame work stays inside a 60fps budget', async ({ page }) => {
  await boot(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ros';
    S.warp('ros_desert', 10, 8, 3);
    S.setManual(false);
  });
  await page.waitForTimeout(2200);
  const report = await page.evaluate(() => {
    const work = __SQ.work();
    const raf = __SQ.frames();
    const avg = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    return { workN: work.length, workAvg: avg(work), workMax: Math.max(...work, 0), rafAvg: avg(raf) };
  });
  fs.writeFileSync(`${ART}/frame-timings.json`, JSON.stringify(report, null, 2));
  expect(report.workN).toBeGreaterThan(20);
  expect(report.workAvg).toBeLessThan(16);
});

async function phoneLayout(page, file) {
  const errors = track(page);
  await page.addInitScript(() => { window.__SQ_DEBUG = true; });
  await page.goto(GAME);
  await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
  await page.waitForTimeout(300);
  const layout = await page.evaluate(() => {
    const canvas = document.querySelector('#game').getBoundingClientRect();
    const buttons = [...document.querySelectorAll('#srml-menu .srml-b, #srml-act .srml-b')].map((el) => {
      const r = el.getBoundingClientRect();
      return { label: (el.textContent || '').trim(), x: r.x, y: r.y, w: r.width, h: r.height };
    });
    const overlap = buttons.filter((b) => {
      const ix = Math.min(b.x + b.w, canvas.right) - Math.max(b.x, canvas.left);
      const iy = Math.min(b.y + b.h, canvas.bottom) - Math.max(b.y, canvas.top);
      return ix > 8 && iy > 8;
    });
    return {
      labels: buttons.map((b) => b.label).join(' '),
      min: Math.min(...buttons.map((b) => Math.min(b.w, b.h))),
      overlap: overlap.map((b) => b.label),
    };
  });
  expect(layout.labels).toContain('BACK');
  expect(layout.labels).toContain('ATTACK');
  expect(layout.min).toBeGreaterThan(40);
  expect(layout.overlap).toEqual([]);
  const back = page.locator('#srml-menu .srml-bk');
  await back.dispatchEvent('pointerdown');
  const pressed = await back.evaluate((el) => ({ on: el.classList.contains('on'), transform: getComputedStyle(el).transform }));
  expect(pressed.on).toBe(true);
  expect(pressed.transform).not.toBe('none');
  await back.dispatchEvent('pointerup');
  const attack = await page.evaluate(() => !!(window.__SQ && __SQ.I && (__SQ.I.attack || __SQ.I.roll)));
  expect(attack).toBe(false);
  await page.evaluate(() => {
    const S = __SQ;
    S.setManual(true);
    S.G.state = 'play';
    S.G.story = 'ros';
    S.warp('ros_desert', 16, 8, 3);
    S.step(40);
  });
  await page.screenshot({ path: file, fullPage: true });
  expect(errors, errors.join('\n')).toEqual([]);
}

test.describe('phone stick leaves SuperNova', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('dragging the stick moves ROS after the door', async ({ page }) => {
    const errors = await boot(page);
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'ros';
      S.P.items.blasters = true;
      S.warp('ros_club', 10, 11, 0);
      S.step(4);
      S.press('down', true);
      for (let i = 0; i < 90 && S.A.id === 'ros_club'; i++) S.step(1);
      S.press('down', false);
      S.step(6);
    });
    const box = await page.locator('#stick').boundingBox();
    expect(box).toBeTruthy();
    const y0 = await page.evaluate(() => __SQ.P.y);
    await page.locator('#stick').dispatchEvent('pointerdown', {
      clientX: box.x + box.width / 2,
      clientY: box.y + 12,
      pointerId: 1,
      bubbles: true,
    });
    await page.evaluate(() => __SQ.step(24));
    const y1 = await page.evaluate(() => __SQ.P.y);
    expect(y0 - y1).toBeGreaterThan(6);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

function expectToolButton(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('#game').getBoundingClientRect();
    const el = [...document.querySelectorAll('[data-b="tool"], .srml-b')].find((n) => (n.textContent || '').trim() === 'TOOL');
    if (!el) return { found: false };
    const r = el.getBoundingClientRect();
    const ix = Math.min(r.right, canvas.right) - Math.max(r.left, canvas.left);
    const iy = Math.min(r.bottom, canvas.bottom) - Math.max(r.top, canvas.top);
    return {
      found: true,
      w: r.width,
      h: r.height,
      overlap: ix > 8 && iy > 8,
      back: (el.textContent || '').trim() === 'BACK',
    };
  });
}

test.describe('phone tool 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('TOOL is large and off the picture', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    const box = await expectToolButton(page);
    expect(box.found).toBe(true);
    expect(Math.min(box.w, box.h)).toBeGreaterThan(40);
    expect(box.overlap).toBe(false);
    expect(box.back).toBe(false);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('phone tool 844x390', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('TOOL stays off the picture in landscape', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    const box = await expectToolButton(page);
    expect(box.found).toBe(true);
    expect(Math.min(box.w, box.h)).toBeGreaterThan(40);
    expect(box.overlap).toBe(false);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('phone 390x844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('controls sit off the action', async ({ page }) => {
    await phoneLayout(page, `${ART}/ros-phone-390x844.png`);
  });
});

test.describe('phone 844x390', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('side gutters keep buttons off the screen', async ({ page }) => {
    await phoneLayout(page, `${ART}/ros-phone-844x390.png`);
  });
});
