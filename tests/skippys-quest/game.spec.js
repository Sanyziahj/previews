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
    for (let i = 0; i < 40 && (S.script || S.dlg); i++) {
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
      rift: !!S.flags.ros_rift,
      portal: S.objective(),
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
  expect(out.end, JSON.stringify(out)).toBe('play');
  expect(out.rift, JSON.stringify(out)).toBe(true);
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
  expect(home.text.includes('EMPTY CHAIR') || home.text.includes('TALE IS TOLD') || home.text.includes('TALE OF THE OUTLAW SHERIFF')).toBe(true);
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
    S.P.pri = 'lasers';
    S.P.sec = 'brand';
    S.P.cds = {};
    S.warp('ros_yard', 4, 8, 3);
    S.step(2);
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.press('item', true); S.step(2); S.press('item', false); S.step(2);
    const first = (S.G.toast || '').indexOf('STAR BRAND') >= 0 || (S.G.brands || []).length > 0;
    const sleeping = S.P.brandCd > 3;
    S.shots.length = 0;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(2);
    const stun = S.shots.filter((s) => s.kind === 'stun').length;
    S.press('item', true); S.step(2); S.press('item', false); S.step(1);
    const refused = (S.G.toast || '').indexOf('SLEEPING') >= 0;
    S.G.paused = true;
    const held = S.P.brandCd;
    S.step(90);
    const paused = Math.abs(S.P.brandCd - held) < 0.02;
    S.G.paused = false;
    S.step(260);
    const ready = S.P.brandCd === 0 && (S.G.toast || '').indexOf('BRAND READY') >= 0;
    S.press('item', true); S.step(2); S.press('item', false); S.step(2);
    const again = (S.G.toast || '').indexOf('STAR BRAND') >= 0;
    return { first, sleeping, refused, paused, ready, again, cd: S.P.brandCd, lasersWhileSleeping: stun };
  });
  expect(out.first, JSON.stringify(out)).toBe(true);
  expect(out.sleeping, JSON.stringify(out)).toBe(true);
  expect(out.refused, JSON.stringify(out)).toBe(true);
  expect(out.paused, JSON.stringify(out)).toBe(true);
  expect(out.ready, JSON.stringify(out)).toBe(true);
  expect(out.again, JSON.stringify(out)).toBe(true);
  expect(out.lasersWhileSleeping, JSON.stringify(out)).toBeGreaterThan(0);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('swap cycles items and attack stays a weapon', async ({ page }) => {
  const errors = await boot(page);
  const out = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ros';
    S.warp('ros_desert', 6, 8, 3);
    S.step(3);
    S.ents.forEach((e) => { e.dead = true; });
    S.P.items = { blasters: true };
    S.P.wep = 'lasers';
    S.P.tool = '';
    S.P.pri = 'lasers';
    S.P.sec = '';
    S.P.cds = {};
    function edge(name) {
      S.press(name, true); S.step(2); S.press(name, false); S.step(1);
    }
    edge('swap');
    const one = S.slots();
    S.shots.length = 0;
    edge('item');
    const itemQuiet = S.shots.length === 0 && (S.G.toast || '').indexOf('NO ITEM') >= 0;
    S.shots.length = 0;
    edge('attack');
    const lasers = S.shots.filter((s) => s.kind === 'stun').length;
    S.P.items.lasso = true;
    S.P.items.brand = true;
    S.P.items.justice = true;
    S.flag('lasso_got');
    S.flag('brand_got');
    S.flag('justice_got');
    S.P.tool = 'lasso';
    S.P.sec = 'lasso';
    S.P.wep = 'lasers';
    S.P.pri = 'lasers';
    const order = ['lasso'];
    for (let i = 0; i < 2; i++) {
      edge('swap');
      order.push(S.slots().sec);
    }
    S.P.cds = {};
    S.shots.length = 0;
    edge('attack');
    const attackStill = S.shots.filter((s) => s.kind === 'stun').length;
    const weaponUntouched = S.slots().pri;
    S.P.tool = 'brand';
    S.P.sec = 'brand';
    S.P.brandCd = 0;
    S.P.cds = {};
    S.shots.length = 0;
    edge('item');
    const brand = (S.G.toast || '').indexOf('STAR BRAND') >= 0;
    const noLaserFromItem = S.shots.filter((s) => s.kind === 'stun').length === 0;
    S.P.wep = 'justice';
    S.P.pri = 'justice';
    S.P.charge = 0;
    S.shots.length = 0;
    S.press('attack', true); S.step(40); S.press('attack', false); S.step(2);
    const justice = S.shots.some((s) => s.kind === 'justice');
    const itemNotJustice = (S.G.toast || '').indexOf('JUSTICE') < 0;
    return { one, itemQuiet, lasers, order, attackStill, weaponUntouched, brand, noLaserFromItem, justice, itemNotJustice, same: S.slots().pri !== S.slots().sec };
  });
  expect(out.one).toEqual({ pri: 'lasers', sec: '' });
  expect(out.itemQuiet, JSON.stringify(out)).toBe(true);
  expect(out.lasers).toBeGreaterThan(0);
  expect(out.order).toEqual(['lasso', 'brand', 'lasso']);
  expect(out.attackStill).toBeGreaterThan(0);
  expect(out.weaponUntouched).toBe('lasers');
  expect(out.brand).toBe(true);
  expect(out.noLaserFromItem).toBe(true);
  expect(out.justice).toBe(true);
  expect(out.same).toBe(true);
  const skippy = await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('brand_got', false);
    S.flag('justice_got', false);
    S.flag('lasso_got', false);
    S.P.items = { bow: true, raygun: true, baton: true, lasso: true, missile: true };
    S.P.arrows = 5;
    S.P.wep = 'raygun';
    S.P.tool = 'lasso';
    S.P.pri = 'raygun';
    S.P.sec = 'lasso';
    S.P.cds = {};
    function edge(name) {
      S.press(name, true); S.step(2); S.press(name, false); S.step(1);
    }
    edge('swap');
    const after = S.slots();
    S.shots.length = 0;
    edge('attack');
    const ray = S.shots.some((s) => s.kind === 'ray');
    edge('swap');
    return { after, ray, back: S.slots(), kept: !!(S.P.items.bow && S.P.items.raygun && S.P.items.lasso && S.P.items.missile) };
  });
  expect(skippy.kept).toBe(true);
  expect(skippy.after).toEqual({ pri: 'raygun', sec: 'missile' });
  expect(skippy.back.sec).toBe('lasso');
  expect(skippy.back.pri).toBe('raygun');
  expect(skippy.ray).toBe(true);
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
    slots: __SQ.slots(),
  }));
  expect(migrated.kit).toEqual(expect.arrayContaining(['lasers', 'lasso', 'brand']));
  expect(migrated.cd).toBe(0);
  expect(migrated.slots.pri).toBe('lasers');
  expect(migrated.slots.sec).toBe('lasso');
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

test('an old Skippy item lands on the slot that fits', async ({ page }) => {
  const skippy = JSON.stringify({
    z: 'lasso', v: 1, area: 'home', x: 160, y: 160, dir: 0,
    hp: 6, maxHp: 6, pieces: 0, coins: 3, arrows: 4,
    items: { baton: true, bow: true, raygun: true, lasso: true },
    keys: {}, bigKeys: {},
    flags: { woke: true }, party: [], shards: 1, time: 20,
    visited: { home: true },
  });
  const errors = await boot(page, { save: { skippy } });
  await page.evaluate(() => __SQ.step(20));
  await tap(page, 'attack');
  await page.evaluate(() => __SQ.step(20));
  await tap(page, 'attack');
  await page.waitForFunction(() => __SQ.G.state === 'play');
  const got = await page.evaluate(() => ({
    slots: __SQ.slots(),
    bow: !!__SQ.P.items.bow,
    baton: !!__SQ.P.items.baton,
    ray: !!__SQ.P.items.raygun,
    lasso: !!__SQ.P.items.lasso,
    area: __SQ.A.id,
  }));
  expect(got.area).toBe('home');
  expect(got.bow && got.baton && got.ray && got.lasso).toBe(true);
  expect(got.slots.pri).toBe('raygun');
  expect(got.slots.sec).toBe('lasso');
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

test('the chair ends the tale and the road home stays open', async ({ page }) => {
  const errors = await boot(page, { save: { skippy: DONE_SKIPPY } });
  await page.evaluate(() => { __SQ.G.state = 'stories'; __SQ.G.menu = 1; __SQ.G.st = 1; __SQ.step(2); });
  await page.waitForTimeout(320);
  await page.evaluate(() => { __SQ.press('attack', true); __SQ.step(2); __SQ.press('attack', false); __SQ.step(2); });
  await page.waitForTimeout(320);
  await page.evaluate(() => { __SQ.G.menu = 0; __SQ.G.st = 1; __SQ.press('attack', true); __SQ.step(4); __SQ.press('attack', false); __SQ.step(4); });
  const setup = await page.evaluate(() => {
    const S = __SQ;
    S.P.items.blasters = true;
    ['yard_clear', 'accused_done', 'lasso_got', 'dust_got', 'proof1', 'cv_ping', 'truce', 'proof3', 'dream_win'].forEach((f) => S.flag(f));
    S.warp('ros_pour', 8, 8, 0);
    S.step(2);
    for (let i = 0; i < 12 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    const obj = S.objective();
    S.run('pk_shelter');
    for (let i = 0; i < 16 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    return { obj, state: S.G.state, sheltered: !!S.flags.ros_done, home: !!S.flags.ros_home_end };
  });
  expect(setup.obj).toContain('FINAL');
  expect(setup.obj).toContain('RUSTY');
  expect(setup.state).toBe('play');
  expect(setup.sheltered).toBe(true);
  expect(setup.home).toBe(false);

  await page.evaluate(() => {
    const S = __SQ;
    S.run('rusty_chair');
    for (let i = 0; i < 40 && (S.script || S.dlg); i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
      else S.step(2);
    }
    S.warp('ros_pour', 18.5, 3.8, 1);
    S.step(2);
  });
  const opened = await page.evaluate(() => ({
    state: __SQ.G.state,
    obj: __SQ.objective(),
    rift: !!__SQ.flags.ros_rift,
    home: !!__SQ.flags.ros_home_end,
    area: __SQ.A.id,
    portal: (__SQ.A.props || []).find((p) => p.need === 'ros_rift') || null,
  }));
  expect(opened.state).toBe('play');
  expect(opened.obj).toBe('STEP INTO THE PORTAL');
  expect(opened.rift).toBe(true);
  expect(opened.home).toBe(false);
  expect(opened.area).toBe('ros_pour');
  expect(opened.portal && opened.portal.k).toBe('portal');
  expect(opened.portal.to).toBe('ros_home');
  await page.screenshot({ path: '/agent/repos/previews/skippys-quest/docs/portal/ros-portal.png' });
  const stepped = await page.evaluate(() => {
    const S = __SQ;
    S.press('up', true);
    let saw = false;
    for (let i = 0; i < 40 && S.story() !== 'skippy'; i++) {
      S.step(1);
      if (S.G.trans && S.G.trans.home) saw = true;
    }
    S.press('up', false);
    for (let i = 0; i < 40 && S.G.trans; i++) S.step(1);
    return saw;
  });
  expect(stepped).toBe(true);
  await page.screenshot({ path: '/agent/repos/previews/skippys-quest/docs/portal/skippy-arrive.png' });
  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 40 && !S.dlg; i++) S.step(1);
    S.skipText();
    S.step(2);
  });
  await page.screenshot({ path: '/agent/repos/previews/skippys-quest/docs/portal/macho-outro.png' });
  const back = await page.evaluate(() => ({
    story: __SQ.story(),
    area: __SQ.A.id,
    x: __SQ.P.x,
    y: __SQ.P.y,
    text: __SQ.dlg ? __SQ.dlg.pages.map((p) => p.join(' ')).join(' ') : '',
    heard: !!__SQ.flags.tale_ros,
    coins: JSON.parse(localStorage.getItem('sq_save_v1')).coins,
    ros: JSON.parse(localStorage.getItem('sq_save_ros_v1')).flags.ros_home_end,
    rift: JSON.parse(localStorage.getItem('sq_save_ros_v1')).flags.ros_rift,
    portal: (__SQ.A.props || []).some((p) => p.k === 'portal' && p.x === 37 && p.need === 'tale_ros'),
  }));
  expect(back.story).toBe('skippy');
  expect(back.area).toBe('desert');
  expect(back.x).toBeGreaterThan(540);
  expect(back.y).toBeLessThan(160);
  expect(back.text).toContain('TALE OF THE OUTLAW SHERIFF');
  expect(back.heard).toBe(true);
  expect(back.coins).toBe(42);
  expect(back.ros).toBe(true);
  expect(back.rift).toBe(true);
  expect(back.portal).toBe(true);
  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.flag('boss_d1');
    S.warp('desert', 23.5, 8.2, 1);
    S.step(3);
  });
  await page.screenshot({ path: '/agent/repos/previews/skippys-quest/docs/portal/cash-portal.png' });

  await page.evaluate(() => {
    for (let i = 0; i < 8 && (__SQ.script || __SQ.dlg); i++) {
      __SQ.skipText(); __SQ.press('talk', true); __SQ.step(1); __SQ.press('talk', false); __SQ.step(1);
    }
    __SQ.G.state = 'stories';
    __SQ.G.st = 1;
    __SQ.step(2);
  });
  const listed = await page.evaluate(() => __SQ.chapters().find((c) => c.id === 'ros'));
  expect(listed.status).toBe('COMPLETE');
  expect(listed.sub).toBe('THE TALE IS TOLD');

  await page.evaluate(() => { __SQ.G.menu = 1; __SQ.G.st = 1; __SQ.step(1); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { __SQ.press('attack', true); __SQ.step(2); __SQ.press('attack', false); __SQ.step(2); });
  await page.waitForTimeout(300);
  await page.evaluate(() => { __SQ.G.menu = 1; __SQ.G.st = 1; __SQ.press('attack', true); __SQ.step(3); __SQ.press('attack', false); __SQ.step(4); });
  const riding = await page.evaluate(() => ({ story: __SQ.story(), home: !!__SQ.flags.ros_home_end, area: __SQ.A.id }));
  expect(riding.story).toBe('ros');
  expect(riding.home).toBe(true);
  expect(await page.evaluate(() => __SQ.objective())).toContain('PORTAL');
  await page.evaluate(() => {
    const S = __SQ;
    S.G.paused = true;
    S.G.rosPage = 0;
    S.G.rosLeave = 1;
    S.G.menu = 0;
    S.step(1);
  });
  await page.screenshot({ path: '/agent/repos/previews/skippys-quest/docs/layout/pause-return.png' });
  await page.waitForTimeout(320);
  await page.evaluate(() => { __SQ.press('attack', true); __SQ.step(3); __SQ.press('attack', false); __SQ.step(4); });
  const returned = await page.evaluate(() => ({
    story: __SQ.story(),
    coins: JSON.parse(localStorage.getItem('sq_save_v1')).coins,
    ros: JSON.parse(localStorage.getItem('sq_save_ros_v1')).flags.ros_home_end,
    toast: __SQ.G.toast || '',
  }));
  expect(returned.story).toBe('skippy');
  expect(returned.coins).toBe(42);
  expect(returned.ros).toBe(true);
  expect(returned.toast).toContain('TALE KEEPS');

  await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'skippy';
    S.flag('tale_ros');
    S.run('tale_ros_told');
    for (let i = 0; i < 10 && !S.G.choice; i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
  });
  expect(await page.evaluate(() => !!__SQ.G.choice)).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('a tale with no Skippy save returns to the chapter list', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => { __SQ.G.state = 'stories'; __SQ.G.menu = 1; __SQ.G.st = 1; __SQ.step(2); });
  await page.waitForTimeout(320);
  await page.evaluate(() => { __SQ.press('attack', true); __SQ.step(2); __SQ.press('attack', false); __SQ.step(2); });
  await page.waitForTimeout(320);
  await page.evaluate(() => { __SQ.G.menu = 0; __SQ.G.st = 1; __SQ.press('attack', true); __SQ.step(4); __SQ.press('attack', false); __SQ.step(4); });
  await page.evaluate(() => {
    const S = __SQ;
    S.flag('dream_win');
    S.warp('ros_pour', 10, 8, 1);
    S.step(2);
    for (let i = 0; i < 16 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.run('rusty_chair');
    for (let i = 0; i < 30 && (S.script || S.dlg); i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1); }
      else S.step(2);
    }
    S.warp('ros_pour', 18.5, 3.8, 1);
    S.press('up', true);
    for (let i = 0; i < 100 && S.G.state !== 'stories'; i++) S.step(1);
    S.press('up', false);
    S.step(2);
  });
  const landed = await page.evaluate(() => ({
    state: __SQ.G.state,
    note: __SQ.G.note || '',
    ros: !!(JSON.parse(localStorage.getItem('sq_save_ros_v1') || 'null') || {}).flags?.ros_home_end,
  }));
  expect(landed.state, JSON.stringify(landed)).toBe('stories');
  expect(landed.note).toContain('NO SKIPPY RIDE');
  expect(landed.ros).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

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
      for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
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


const LAYOUT = '/agent/repos/previews/skippys-quest/docs/layout';
const SIZES = [[390, 844], [844, 390], [360, 640], [640, 360], [768, 1024]];

function controlAudit(page) {
  return page.evaluate(() => {
    const canvas = (document.querySelector('#srml-scr') || document.querySelector('#game')).getBoundingClientRect();
    const els = [...document.querySelectorAll('.srml-b, #stick')].filter((el) => {
      const r = el.getBoundingClientRect();
      return getComputedStyle(el).display !== 'none' && r.width > 1 && r.height > 1;
    }).map((el) => {
      const r = el.getBoundingClientRect();
      const round = el.id === 'stick' || el.classList.contains('atk') || el.classList.contains('itm') || el.classList.contains('rol') || el.classList.contains('tlk') || el.dataset.b === 'swap' || el.dataset.b === 'map';
      return {
        label: (el.textContent || '').trim().slice(0, 28) || (el.id === 'stick' ? 'STICK' : ''),
        x: r.x, y: r.y, w: r.width, h: r.height,
        cx: r.x + r.width / 2, cy: r.y + r.height / 2, rad: Math.min(r.width, r.height) / 2,
        round, stick: el.id === 'stick',
      };
    });
    const hits = [];
    const gaps = [];
    for (let i = 0; i < els.length; i++) {
      for (let j = i + 1; j < els.length; j++) {
        const a = els[i], b = els[j];
        if (a.round && b.round) {
          const dist = Math.hypot(a.cx - b.cx, a.cy - b.cy);
          const gap = dist - a.rad - b.rad;
          if (gap < -0.5) hits.push(a.label + ' / ' + b.label);
          else gaps.push(gap);
        } else {
          const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          if (ix > 0.5 && iy > 0.5) hits.push(a.label + ' / ' + b.label);
          const horiz = a.y < b.y + b.h && b.y < a.y + a.h;
          const vert = a.x < b.x + b.w && b.x < a.x + a.w;
          if (horiz && ix <= 0) gaps.push(Math.max(a.x, b.x) - Math.min(a.x + a.w, b.x + b.w));
          if (vert && iy <= 0) gaps.push(Math.max(a.y, b.y) - Math.min(a.y + a.h, b.y + b.h));
        }
      }
    }
    const onCanvas = els.filter((b) => {
      const ix = Math.min(b.x + b.w, canvas.right) - Math.max(b.x, canvas.left);
      const iy = Math.min(b.y + b.h, canvas.bottom) - Math.max(b.y, canvas.top);
      return ix > 1 && iy > 1;
    }).map((b) => b.label);
    const small = els.filter((b) => Math.min(b.w, b.h) < 48).map((b) => b.label);
    return {
      mode: document.documentElement.dataset.touch,
      labels: els.map((e) => e.label),
      hits, onCanvas, small,
      tight: gaps.filter((g) => g < 8 && g >= 0),
    };
  });
}

test.describe('context touch layouts', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('each screen shows only its own controls', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    fs.mkdirSync(LAYOUT, { recursive: true });
    for (const [w, h] of SIZES) {
      await page.setViewportSize({ width: w, height: h });
      await page.evaluate(() => { __SQ.G.paused = false; __SQ.G.state = 'stories'; __SQ.step(2); });
      const title = await controlAudit(page);
      expect(title.mode, JSON.stringify(title)).toBe('title');
      expect(title.labels.join(' ')).not.toMatch(/ATTACK|ITEM|SWAP|ROLL|TALK|PAUSE|MAGIC/);
      expect(title.labels.join(' ')).toContain('SKIPPY');
      expect(title.hits, JSON.stringify(title)).toEqual([]);
      expect(title.onCanvas, JSON.stringify(title)).toEqual([]);
      expect(title.small, JSON.stringify(title)).toEqual([]);
      await page.screenshot({ path: `${LAYOUT}/title-${w}x${h}.png` });

      await page.evaluate(() => {
        const S = __SQ;
        S.G.state = 'play';
        S.G.story = 'ros';
        S.G.paused = false;
        S.flag('lasso_got', false);
        S.flag('brand_got', false);
        S.P.items = { blasters: true };
        S.P.wep = 'lasers';
        S.P.tool = '';
        S.P.pri = 'lasers';
        S.P.sec = '';
        S.warp('ros_desert', 18, 4, 1);
        S.step(2);
        for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
        S.step(1);
      });
      const play = await controlAudit(page);
      expect(play.mode, JSON.stringify(play)).toBe('play');
      expect(play.labels).toEqual(expect.arrayContaining(['ATTACK', 'ITEM', 'SWAP', 'BOARD', 'ACTION', 'MAGIC', 'PAUSE']));
      expect(play.labels.join(' ')).not.toMatch(/TALK|BACK|\bROLL\b/);
      expect(play.hits, JSON.stringify(play)).toEqual([]);
      expect(play.onCanvas, JSON.stringify(play)).toEqual([]);
      expect(play.small, JSON.stringify(play)).toEqual([]);
      expect(play.tight, JSON.stringify(play)).toEqual([]);
      await page.screenshot({ path: `${LAYOUT}/play-${w}x${h}.png` });
      await page.screenshot({ path: `${LAYOUT}/arcade-ros-${w}x${h}.png` });

      await page.evaluate(() => {
        const S = __SQ;
        S.G.state = 'play';
        S.G.story = 'skippy';
        S.G.paused = false;
        S.P.items = { raygun: true, lasso: true, missile: true };
        S.P.wep = 'raygun';
        S.P.tool = 'lasso';
        S.P.pri = 'raygun';
        S.P.sec = 'lasso';
        S.warp('desert', 18, 4, 1);
        S.step(2);
        for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
        S.step(1);
      });
      const skippy = await controlAudit(page);
      expect(skippy.mode, JSON.stringify(skippy)).toBe('play');
      expect(skippy.labels, JSON.stringify(skippy)).toEqual(expect.arrayContaining(['ATTACK', 'ITEM', 'SWAP', 'ROLL', 'ACTION', 'MAGIC', 'PAUSE']));
      expect(skippy.labels.join(' ')).not.toMatch(/TALK|BACK|BOARD/);
      expect(skippy.hits, JSON.stringify(skippy)).toEqual([]);
      expect(skippy.onCanvas, JSON.stringify(skippy)).toEqual([]);
      expect(skippy.small, JSON.stringify(skippy)).toEqual([]);
      expect(skippy.tight, JSON.stringify(skippy)).toEqual([]);
      await page.screenshot({ path: `${LAYOUT}/arcade-skippy-${w}x${h}.png` });

      await page.evaluate(() => {
        const S = __SQ;
        S.G.story = 'ros';
        S.P.items = { blasters: true, lasso: true, brand: true };
        S.P.wep = 'lasers';
        S.P.pri = 'lasers';
        S.flag('lasso_got');
        S.flag('brand_got');
        S.P.tool = 'lasso';
        S.P.sec = 'lasso';
        S.warp('ros_pour', 7, 6, 2);
        S.step(2);
        for (let i = 0; i < 10 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
        S.step(1);
      });
      const npc = await controlAudit(page);
      expect(npc.labels, JSON.stringify(npc)).toEqual(expect.arrayContaining(['ATTACK', 'ITEM', 'SWAP', 'BOARD', 'TALK', 'MAGIC', 'PAUSE']));
      expect(npc.labels.join(' ')).not.toContain('BACK');
      expect(npc.hits, JSON.stringify(npc)).toEqual([]);
      expect(npc.onCanvas, JSON.stringify(npc)).toEqual([]);
      expect(npc.small, JSON.stringify(npc)).toEqual([]);
      await page.screenshot({ path: `${LAYOUT}/npc-${w}x${h}.png` });

      await page.evaluate(() => { __SQ.say('al', 'THE ROPE LOCKER IS ON THE EAST WALL.'); __SQ.step(2); });
      const dialog = await controlAudit(page);
      expect(dialog.mode, JSON.stringify(dialog)).toBe('dialog');
      expect(dialog.labels.join(' '), JSON.stringify(dialog)).not.toMatch(/ATTACK|ITEM|SWAP|ROLL|TALK|PAUSE|BACK|MAGIC/);
      expect(dialog.hits).toEqual([]);
      await page.screenshot({ path: `${LAYOUT}/dialog-${w}x${h}.png` });

      await page.evaluate(() => {
        const S = __SQ;
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
        for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
        S.G.paused = true;
        S.G.rosPage = 0;
        S.step(2);
      });
      const pause = await controlAudit(page);
      expect(pause.mode, JSON.stringify(pause)).toBe('pause');
      expect(pause.labels).toContain('BACK');
      expect(pause.labels.join(' ')).not.toMatch(/ATTACK|ITEM|SWAP|ROLL|TALK|PAUSE|MAGIC/);
      expect(pause.hits, JSON.stringify(pause)).toEqual([]);
      expect(pause.onCanvas, JSON.stringify(pause)).toEqual([]);
      expect(pause.small, JSON.stringify(pause)).toEqual([]);
      await page.screenshot({ path: `${LAYOUT}/pause-${w}x${h}.png` });

      await page.evaluate(() => { __SQ.G.rosPage = 2; __SQ.step(1); });
      const gear = await controlAudit(page);
      expect(gear.labels.join(' '), JSON.stringify(gear)).toContain('TWIN LASERS');
      expect(gear.labels.join(' ')).not.toMatch(/ATTACK|SWAP|ROLL/);
      expect(gear.hits, JSON.stringify(gear)).toEqual([]);
      expect(gear.onCanvas, JSON.stringify(gear)).toEqual([]);
      expect(gear.small, JSON.stringify(gear)).toEqual([]);
      await page.screenshot({ path: `${LAYOUT}/gear-${w}x${h}.png` });
    }
    const before = await page.evaluate(() => ({ w: innerWidth, land: document.documentElement.dataset.land, mode: document.documentElement.dataset.touch }));
    await page.setViewportSize({ width: before.w > 500 ? 390 : 844, height: before.w > 500 ? 844 : 390 });
    await page.evaluate(() => {
      __SQ.G.paused = false;
      __SQ.G.story = 'ros';
      __SQ.warp('ros_desert', 18, 4, 1);
      __SQ.step(2);
    });
    const turned = await controlAudit(page);
    expect(turned.mode).toBe('play');
    expect(turned.labels).toContain('ATTACK');
    expect(turned.hits, JSON.stringify(turned)).toEqual([]);
    expect(turned.onCanvas, JSON.stringify(turned)).toEqual([]);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

const RAM = '/agent/repos/previews/skippys-quest/docs/ram';

test('Ramshackle chapter: relics, worlds, bosses, and the road home', async ({ page }) => {
  fs.mkdirSync(RAM, { recursive: true });
  const errors = await boot(page, { save: { skippy: DONE_SKIPPY } });
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'stories';
    S.G.menu = 5;
    S.G.st = 1;
    S.step(2);
  });
  await page.waitForTimeout(320);
  await page.evaluate(() => { __SQ.press('attack', true); __SQ.step(2); __SQ.press('attack', false); __SQ.step(2); });
  await page.waitForTimeout(320);
  await page.evaluate(() => { __SQ.G.menu = 0; __SQ.G.st = 1; __SQ.press('attack', true); __SQ.step(4); __SQ.press('attack', false); __SQ.step(8); });
  const started = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    return { story: S.story(), area: S.A.id, hatchet: !!S.P.items.hatchet, hero: document.getElementById('sr-live').textContent };
  });
  expect(started.story).toBe('ramshackle');
  expect(started.area).toBe('ram_dock');
  expect(started.hatchet).toBe(true);
  expect(started.hero).toContain('ramshackle');

  await page.evaluate(() => { __SQ.warp('ram_memory', 6, 6, 0); __SQ.step(4); });
  await page.screenshot({ path: `${RAM}/flashback.png` });
  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
  });
  expect(await page.evaluate(() => __SQ.objective())).toContain('MEMORY');

  for (const [id, file, prep] of [
    ['ram_dream', 'dream.png', 'early'],
    ['ram_fun', 'funhouse.png', 'early'],
    ['ram_mars', 'mars.png', 'axe'],
    ['ram_colony', 'colony.png', 'axe'],
    ['ram_jup', 'jupiter.png', 'shield'],
    ['ram_noodle', 'noodle.png', 'shield'],
    ['ram_snow', 'snow.png', 'amulet'],
    ['ram_city', 'city.png', 'amulet'],
  ]) {
    await page.evaluate(({ area, prep }) => {
      const S = __SQ;
      for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      if (prep === 'axe' || prep === 'shield' || prep === 'amulet') {
        S.P.items.axe = true; S.flag('axe_got'); S.P.wep = 'axe'; S.P.pri = 'axe';
      }
      if (prep === 'shield' || prep === 'amulet') {
        S.P.items.shield = true; S.flag('shield_got'); S.P.tool = 'shield'; S.P.sec = 'shield';
      }
      if (prep === 'amulet') {
        S.P.items.amulet = true; S.flag('amulet_got');
      }
      S.warp(area, 8, 6, 3);
      S.step(3);
    }, { area: id, prep });
    const seen = await page.evaluate(() => ({ id: __SQ.A.id, obj: __SQ.objective() }));
    expect(seen.id).toBe(id);
    if (id === 'ram_mars') expect(seen.obj).toContain('MARS');
    if (id === 'ram_city') expect(seen.obj).toContain('CITY');
    await page.screenshot({ path: `${RAM}/${file}` });
  }
  await page.evaluate(() => { __SQ.warp('ram_d1', 12, 5, 2); __SQ.step(2); });
  await page.screenshot({ path: `${RAM}/axe.png` });
  await page.evaluate(() => { __SQ.warp('ram_m1', 12, 5, 2); __SQ.step(2); });
  await page.screenshot({ path: `${RAM}/shield.png` });
  await page.evaluate(() => { __SQ.warp('ram_j1', 12, 5, 2); __SQ.step(2); });
  await page.screenshot({ path: `${RAM}/amulet.png` });

  const axe = await page.evaluate(() => {
    const S = __SQ;
    S.warp('ram_fear', 6, 6, 3);
    S.step(110);
    S.P.items.axe = true;
    S.flag('axe_got');
    S.P.wep = 'axe';
    S.P.pri = 'axe';
    const before = S.B.hp;
    S.press('attack', true); S.step(1); S.press('attack', false);
    let flipped = false;
    let kind = '';
    for (let i = 0; i < 36; i++) {
      S.step(1);
      const shot = (S.shots || []).find((o) => o.kind === 'axe');
      if (shot) {
        kind = 'axe';
        if (shot.back) flipped = true;
      }
    }
    return { fight: S.B.state, before, after: S.B.hp, kind, flipped };
  });
  expect(axe.fight === 'fight' || axe.fight === 'dying' || axe.after < axe.before).toBe(true);
  expect(axe.kind === 'axe' || axe.after < axe.before).toBe(true);
  expect(axe.flipped || axe.after < axe.before).toBe(true);

  const shield = await page.evaluate(() => {
    const S = __SQ;
    S.warp('ram_core', 6, 6, 3);
    S.step(50);
    S.P.items.shield = true;
    S.flag('shield_got');
    S.P.sec = 'shield';
    S.P.tool = 'shield';
    const hp = S.P.hp;
    S.press('item', true); S.step(1); S.press('item', false); S.step(1);
    const up = S.P.shield || 0;
    S.step(50);
    return { up, hp0: hp, hp1: S.P.hp, boss: S.B.hp };
  });
  expect(shield.up).toBeGreaterThan(0);

  const amulet = await page.evaluate(() => {
    const S = __SQ;
    S.warp('ram_eye', 8, 5, 1);
    S.step(110);
    S.P.items.axe = true;
    S.P.items.amulet = true;
    S.flag('axe_got');
    S.flag('amulet_got');
    S.P.wep = 'axe';
    S.P.pri = 'axe';
    S.P.sec = 'amulet';
    S.P.tool = 'amulet';
    const locked = S.B.hp;
    S.press('attack', true); S.step(1); S.press('attack', false); S.step(24);
    const still = S.B.hp;
    S.press('item', true); S.step(1); S.press('item', false); S.step(1);
    const rune = S.P.rune || 0;
    for (let n = 0; n < 6 && S.B.hp >= locked; n++) {
      S.P.rune = 1.8;
      S.press('attack', true); S.step(1); S.press('attack', false); S.step(18);
    }
    return { locked, still, rune, after: S.B.hp, fight: S.B.state };
  });
  expect(amulet.fight).toBe('fight');
  expect(amulet.still).toBe(amulet.locked);
  expect(amulet.rune).toBeGreaterThan(0);
  expect(amulet.after).toBeLessThan(amulet.locked);

  for (const [area, file] of [['ram_fear', 'boss-fear.png'], ['ram_core', 'boss-core.png'], ['ram_eye', 'boss-eye.png'], ['ram_throne', 'boss-hack.png']]) {
    await page.evaluate((id) => {
      const S = __SQ;
      for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      S.warp(id, 8, 6, 1);
      S.step(2);
      for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      for (let i = 0; i < 160 && S.B.state !== 'fight'; i++) S.step(1);
    }, area);
    await page.screenshot({ path: `${RAM}/${file}` });
  }
  const bosses = await page.evaluate(() => {
    const S = __SQ;
    const out = {};
    function down(area, flag) {
      for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      S.warp(area, 8, 6, 1);
      S.step(2);
      for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      for (let i = 0; i < 160 && S.B.state !== 'fight' && S.B.state !== 'dying'; i++) S.step(1);
      for (let i = 0; i < 8 && S.B.state === 'fight'; i++) S.bossHurt(4);
      for (let i = 0; i < 220 && !S.flags[flag]; i++) {
        if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
        S.step(1);
      }
      out[flag] = !!S.flags[flag];
      out[flag + 'State'] = S.B.state;
      S.step(3);
    }
    down('ram_fear', 'boss_memory');
    down('ram_core', 'boss_colony');
    down('ram_eye', 'boss_storm');
    down('ram_throne', 'boss_hack');
    out.home = !!S.flags.ram_home_end;
    return out;
  });
  expect(bosses.boss_memory, JSON.stringify(bosses)).toBe(true);
  expect(bosses.boss_colony, JSON.stringify(bosses)).toBe(true);
  expect(bosses.boss_storm, JSON.stringify(bosses)).toBe(true);
  expect(bosses.boss_hack, JSON.stringify(bosses)).toBe(true);
  expect(bosses.home, JSON.stringify(bosses)).toBe(true);

  const home = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 12 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.warp('ram_city', 18, 6.25, 1);
    S.step(2);
    for (let i = 0; i < 50 && S.story() === 'ramshackle'; i++) S.step(1);
    for (let i = 0; i < 30 && S.G.trans; i++) S.step(1);
    for (let i = 0; i < 20 && !S.dlg; i++) S.step(1);
    S.skipText();
    S.step(2);
    return {
      story: S.story(),
      area: S.A.id,
      text: S.dlg ? S.dlg.pages.map((p) => p.join(' ')).join(' ') : '',
      coins: JSON.parse(localStorage.getItem('sq_save_v1')).coins,
      ram: JSON.parse(localStorage.getItem('sq_save_ram_v1')).flags.ram_home_end,
      ros: localStorage.getItem('sq_save_ros_v1'),
    };
  });
  expect(home.story, JSON.stringify(home)).toBe('skippy');
  expect(home.area).toBe('seaport');
  expect(home.text).toContain('JOURNEY HOME');
  expect(home.coins).toBe(42);
  expect(home.ram).toBe(true);
  expect(home.ros).toBe(null);
  await page.screenshot({ path: `${RAM}/return.png` });

  await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'skippy';
    S.G.state = 'play';
    S.flag('tale_ram', false);
    S.flag('tale_ros');
    S.step(2);
  });
  expect(await page.evaluate(() => __SQ.objective())).toContain('SEAPORT');
  await page.evaluate(() => {
    const S = __SQ;
    S.warp('seaport', 16, 17, 1);
    S.step(2);
    S.run('ram_tale_offer');
    for (let i = 0; i < 8 && !S.G.choice; i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
  });
  expect(await page.evaluate(() => !!__SQ.G.choice)).toBe(true);

  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'stories';
    S.G.menu = 5;
    S.G.st = 1;
    S.step(2);
  });
  await page.waitForTimeout(320);
  await page.evaluate(() => { __SQ.press('attack', true); __SQ.step(2); __SQ.press('attack', false); __SQ.step(2); });
  await page.waitForTimeout(320);
  await page.evaluate(() => { __SQ.G.menu = 1; __SQ.G.st = 1; __SQ.press('attack', true); __SQ.step(4); __SQ.press('attack', false); __SQ.step(8); });
  const continued = await page.evaluate(() => ({ story: __SQ.story(), area: __SQ.A.id }));
  expect(continued.story).toBe('ramshackle');
  expect(continued.area).toBe('ram_city');

  await page.evaluate(() => {
    const S = __SQ;
    S.setManual(false);
    S.G.story = 'ramshackle';
    S.warp('ram_mars', 8, 6, 3);
  });
  await page.waitForTimeout(1600);
  const report = await page.evaluate(() => {
    const work = __SQ.work();
    const avg = (xs) => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);
    return { workN: work.length, workAvg: avg(work), workMax: Math.max(...work, 0) };
  });
  fs.writeFileSync(`${RAM}/frame.json`, JSON.stringify(report, null, 2));
  expect(report.workN).toBeGreaterThan(20);
  expect(report.workAvg).toBeLessThan(16);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('Ramshackle phone layout', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('gameplay buttons do not stack on the stick', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    fs.mkdirSync(RAM, { recursive: true });
    for (const [w, h] of [[390, 844], [844, 390]]) {
      await page.setViewportSize({ width: w, height: h });
      await page.evaluate(() => {
        const S = __SQ;
        S.G.state = 'play';
        S.G.story = 'ramshackle';
        S.G.paused = false;
        S.P.items = { hatchet: true, axe: true, shield: true, amulet: true };
        S.P.wep = 'axe';
        S.P.pri = 'axe';
        S.P.sec = 'shield';
        S.P.tool = 'shield';
        S.flag('axe_got');
        S.flag('shield_got');
        S.flag('amulet_got');
        S.warp('ram_mars', 24, 8, 1);
        S.step(3);
        for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
      });
      const play = await controlAudit(page);
      expect(play.mode, JSON.stringify(play)).toBe('play');
      expect(play.labels, JSON.stringify(play)).toEqual(expect.arrayContaining(['ATTACK', 'ITEM', 'SWAP', 'BOARD', 'MAGIC', 'PAUSE']));
      expect(play.hits, JSON.stringify(play)).toEqual([]);
      expect(play.onCanvas, JSON.stringify(play)).toEqual([]);
      expect(play.small, JSON.stringify(play)).toEqual([]);
      expect(play.tight, JSON.stringify(play)).toEqual([]);
      await page.screenshot({ path: `${RAM}/phone-${w}x${h}.png` });
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

async function shot(page, name) {
  await page.locator('#game').screenshot({ path: `${ART}/${name}.png` });
}

async function ride(page, area, x, y, dir = 0) {
  await page.evaluate(({ area, x, y, dir }) => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('oe_' + area);
    S.warp(area, x, y, dir);
    S.step(2);
    for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
  }, { area, x, y, dir });
}

test('cosmos magic, gear, shops, and old saves', async ({ page }) => {
  const errors = await boot(page, {
    save: { skippy: SKIPPY_SAVE, ros: '{"coins":3,"flags":{"lasso_got":true},"area":"ros_pour","x":160,"y":160,"dir":0,"hp":6,"maxHp":6,"pieces":0,"arrows":0,"items":{},"keys":{},"bigKeys":{},"party":[],"shards":0,"time":1,"visited":{}}' },
  });
  await page.evaluate(() => localStorage.setItem('sq_save_ram_v1', '{"coins":7,"flags":{"axe_got":true}}'));
  const kept = await page.evaluate(() => {
    const loaded = __SQ.load();
    return {
      loaded,
      coins: __SQ.P.coins,
      woke: !!__SQ.flags.woke,
      magic: __SQ.magic().n,
      spell: __SQ.magic().spell,
    };
  });
  expect(kept.loaded).toBe(true);
  expect(kept.coins).toBe(42);
  expect(kept.woke).toBe(true);
  expect(kept.magic).toBe(6);
  expect(kept.spell).toBe('lantern');
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('oe_desert');
    S.warp('desert', 10, 10, 0);
    S.step(3);
    S.P.hp = 6;
    S.P.maxHp = 6;
    S.P.magic = 8;
    S.P.magicMax = 8;
    S.P.spell = 'lantern';
    S.press('magic', true); S.step(2); S.press('magic', false); S.step(1);
  });
  const lantern = await page.evaluate(() => __SQ.magic());
  expect(lantern.n).toBe(6);
  expect(lantern.lantern).toBeGreaterThan(0);
  await page.evaluate(() => {
    const S = __SQ;
    S.P.magic = 8;
    S.P.spell = 'ward';
    S.P.hp = 6;
    S.cast();
    S.hurt(1);
  });
  const ward = await page.evaluate(() => ({ m: __SQ.magic(), hp: __SQ.P.hp }));
  expect(ward.m.ward).toBe(2);
  expect(ward.m.n).toBe(5);
  expect(ward.hp).toBe(6);
  await page.evaluate(() => {
    const S = __SQ;
    S.P.ward = 0;
    S.P.brew = 1;
    S.P.hp = 1;
    S.hurt(2);
  });
  const brew = await page.evaluate(() => ({ hp: __SQ.P.hp, brew: __SQ.P.brew }));
  expect(brew.brew).toBe(0);
  expect(brew.hp).toBeGreaterThan(1);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.paused = true;
    S.G.skipPage = 1;
    S.G.gearSel = 2;
    S.P.ownB = 4;
    S.P.gearB = 1;
    S.P.ownW = 3;
    S.P.gearW = 1;
    S.step(2);
  });
  await shot(page, 'gear-screen');
  await page.evaluate(() => { __SQ.gearAct(2); __SQ.gearAct(0); __SQ.step(1); });
  const gear = await page.evaluate(() => __SQ.cosmos());
  expect(gear.gearB).toBe(2);
  expect(gear.gearW).toBe(2);
  await page.evaluate(() => { __SQ.G.story = 'santt'; __SQ.P.visor = 1; __SQ.P.ownVisor = 1; });
  expect(await page.evaluate(() => __SQ.cosmos().visor)).toBe(false);
  await page.evaluate(() => { __SQ.G.story = 'skippy'; __SQ.P.visor = 1; });
  expect(await page.evaluate(() => __SQ.cosmos().visor)).toBe(true);

  await ride(page, 'teashop', 6, 6, 0);
  await shot(page, 'tea-house');
  await page.evaluate(() => {
    const S = __SQ;
    S.P.coins = 80;
    S.P.bottles = [];
    S.run('tea_shop');
    S.step(2);
    S.skipText();
    S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
  });
  const tea = await page.evaluate(() => {
    const S = __SQ;
    if (!S.shop) return { shop: null };
    S.press('attack', true); S.step(1); S.press('attack', false); S.step(2);
    return { shop: S.shop.id, bottles: S.cosmos().bottles.slice(), stars: S.P.coins };
  });
  expect(tea.shop).toBe('tea');
  expect(tea.bottles).toContain('tea');
  expect(tea.stars).toBe(68);
  await page.evaluate(() => { __SQ.P.hp = 1; __SQ.drink(0); });
  expect(await page.evaluate(() => __SQ.P.hp)).toBe(await page.evaluate(() => __SQ.P.maxHp));

  await ride(page, 'dragon', 6, 6, 0);
  await shot(page, 'green-dragon');
  await page.evaluate(() => {
    const S = __SQ;
    S.P.coins = 100;
    S.P.part = 1;
    S.P.ownW = 1;
    S.P.gearW = 1;
    S.run('drag_front');
    S.step(4);
    for (let i = 0; i < 4 && !S.shop; i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.press('attack', true); S.step(1); S.press('attack', false); S.step(2);
  });
  const noodle = await page.evaluate(() => __SQ.cosmos().buff);
  expect(noodle).toBe('fire');
  await page.evaluate(() => {
    const S = __SQ;
    S.press('back', true); S.step(1); S.press('back', false); S.step(2);
    S.run('drag_forge');
    S.step(3);
    for (let i = 0; i < 4 && !S.shop; i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.press('attack', true); S.step(1); S.press('attack', false); S.step(2);
  });
  const forged = await page.evaluate(() => __SQ.cosmos());
  expect(forged.ownW).toBeGreaterThanOrEqual(2);
  expect(forged.stars).toBeLessThan(100);

  await page.evaluate(() => __SQ.save());
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('sq_save_v1')));
  expect(saved.coins).toBe(forged.stars);
  expect(saved.flags.woke).toBe(true);
  expect(saved.cosmos.spell).toBe('ward');
  expect(saved.cosmos.ownW).toBeGreaterThanOrEqual(2);
  const ros = await page.evaluate(() => localStorage.getItem('sq_save_ros_v1'));
  const ram = await page.evaluate(() => localStorage.getItem('sq_save_ram_v1'));
  expect(JSON.parse(ros).flags.lasso_got).toBe(true);
  expect(JSON.parse(ros).coins).toBe(3);
  expect(JSON.parse(ram).flags.axe_got).toBe(true);
  expect(JSON.parse(ram).coins).toBe(7);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('cosmos map, surf lane, academy, and the new places', async ({ page }) => {
  const errors = await boot(page);
  const bad = await page.evaluate(() => __SQ.auditLandings());
  expect(bad, JSON.stringify(bad)).toEqual([]);
  await ride(page, 'cosmos', 14, 6, 0);
  await shot(page, 'cosmos-map');
  const seeker = await page.evaluate(() => __SQ.ents.some((e) => e.k === 'seeker' && e.def.rank === 'SEEKER'));
  expect(seeker).toBe(true);
  await page.evaluate(() => {
    const S = __SQ;
    const portal = S.A.props.find((p) => p.label === 'ACADEMY');
    S.P.x = (portal.x + 0.5) * 16;
    S.P.y = (portal.y + 0.5) * 16;
    S.step(40);
  });
  expect(await page.evaluate(() => __SQ.A.id)).toBe('ac_hub');
  await shot(page, 'academy-hub');
  await ride(page, 'ac_lib', 9, 6, 0);
  await shot(page, 'charter-library');
  expect(await page.evaluate(() => __SQ.A.chests.length)).toBe(3);
  await ride(page, 'ac_brief', 8, 6, 0);
  await shot(page, 'briefing');
  await page.evaluate(() => {
    const S = __SQ;
    S.run('ac_kal');
    for (let i = 0; i < 12; i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
      if (S.P.gmap) break;
    }
  });
  expect(await page.evaluate(() => __SQ.cosmos().gmap)).toBe(1);
  await ride(page, 'ac_camp', 9, 8, 1);
  await shot(page, 'training-camp');
  await ride(page, 'ac_lock', 7, 5, 0);
  await shot(page, 'restricted');
  expect(await page.evaluate(() => __SQ.A.name)).toBe('RESTRICTED');
  await ride(page, 'ac_range', 4, 7, 1);
  await shot(page, 'tin-league');
  await page.evaluate(() => {
    const S = __SQ;
    S.P.items.sword = true;
    for (const e of S.ents) {
      S.P.x = e.x - 16; S.P.y = e.y + 4; S.P.dir = 3;
      S.press('attack', true); S.step(2); S.press('attack', false); S.step(20);
    }
    S.step(4);
  });
  expect(await page.evaluate(() => __SQ.flags.tin_clear)).toBe(true);
  await ride(page, 'sky_city', 8, 7, 0);
  await shot(page, 'sky-city');
  expect(await page.evaluate(() => __SQ.npcs.some((n) => n.id === 'jazz'))).toBe(true);
  await ride(page, 'hi_life', 8, 7, 0);
  await shot(page, 'hi-life');
  await ride(page, 'pr_gate', 9, 7, 0);
  await shot(page, 'lower-prison');
  expect(await page.evaluate(() => __SQ.npcs.some((n) => n.id === 'recker' && n.look !== 'santt'))).toBe(true);
  await ride(page, 'pr_dark', 9, 8, 1);
  await shot(page, 'prison-dark');
  const trapped = await page.evaluate(() => {
    const S = __SQ;
    const spirit = S.ents.find((e) => e.k === 'spirit');
    S.P.magic = 4;
    S.P.ward = 0;
    S.P.hp = 6;
    S.P.x = spirit.x;
    S.P.y = spirit.y + 10;
    S.hurt(1);
    return { magic: S.magic().n, trait: spirit.def.trait, hp: S.P.hp };
  });
  expect(trapped.trait).toBe('SOUL TRAPPER');
  expect(trapped.magic).toBe(3);
  expect(trapped.hp).toBe(5);
  await ride(page, 'lane_sky', 5.5, 13, 1);
  await page.evaluate(() => __SQ.step(20));
  await shot(page, 'surf-run');
  await page.evaluate(() => __SQ.step(260));
  const lane = await page.evaluate(() => ({
    area: __SQ.A.id,
    flag: !!__SQ.flags.lane_sky,
    medal: !!__SQ.flags.medal_sky,
    part: __SQ.cosmos().part,
    stars: __SQ.P.coins,
  }));
  expect(lane.flag).toBe(true);
  expect(lane.medal).toBe(true);
  expect(lane.area).toBe('cosmos');
  expect(lane.part).toBeGreaterThanOrEqual(1);
  expect(lane.stars).toBeGreaterThanOrEqual(20);
  await page.evaluate(() => {
    const S = __SQ;
    const portal = S.A.props.find((p) => p.label === 'SKY CITY');
    S.P.x = (portal.x + 0.5) * 16;
    S.P.y = (portal.y + 0.5) * 16;
    S.step(40);
  });
  expect(await page.evaluate(() => __SQ.A.id)).toBe('sky_city');
  await page.evaluate(() => {
    const S = __SQ;
    S.warp('desert', 18, 14, 0);
    S.flag('oe_desert');
    S.P.lantern = 8;
    S.P.x = 18 * 16;
    S.P.y = 14 * 16;
    S.step(5);
  });
  expect(await page.evaluate(() => !!__SQ.flags.page_desert)).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('magic button on the phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('portrait and landscape keep MAGIC between item and roll', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'skippy';
      S.G.paused = false;
      S.P.items = { raygun: true, lasso: true };
      S.P.wep = 'raygun';
      S.P.tool = 'lasso';
      S.P.pri = 'raygun';
      S.P.sec = 'lasso';
      S.flag('oe_desert');
      S.warp('desert', 12, 10, 1);
      S.step(2);
    });
    const place = await page.evaluate(() => {
      const box = (name) => {
        const el = document.querySelector('[data-b="' + name + '"]');
        const r = el.getBoundingClientRect();
        return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, w: r.width, h: r.height, on: getComputedStyle(el).display !== 'none' };
      };
      const atk = box('attack'), item = box('item'), magic = box('magic'), roll = box('roll');
      const ang = (el) => Math.atan2(atk.cy - el.cy, atk.cx - el.cx);
      return { atk, item, magic, roll, ai: ang(item), am: ang(magic), ar: ang(roll) };
    });
    const talk = await page.evaluate(() => {
      const el = document.querySelector('[data-b="talk"]');
      const r = el.getBoundingClientRect();
      const pause = document.querySelector('[data-b="map"]').getBoundingClientRect();
      return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, w: r.width, pauseX: pause.x };
    });
    expect(place.magic.on).toBe(true);
    expect(place.roll.w).toBeGreaterThanOrEqual(56);
    expect(place.atk.w).toBeGreaterThanOrEqual(56);
    expect(place.item.w).toBeGreaterThanOrEqual(56);
    expect(talk.w).toBeGreaterThanOrEqual(56);
    expect(place.atk.cx).toBeGreaterThan(place.item.cx);
    expect(talk.cy).toBeGreaterThan(place.atk.cy);
    expect(place.roll.cy).toBeLessThan(place.atk.cy);
    expect(place.magic.cy).toBeLessThan(place.roll.cy);
    expect(talk.pauseX).toBeLessThan(200);
    const portraitClip = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('.srml-b, #stick')) {
        const r = el.getBoundingClientRect();
        if (getComputedStyle(el).display === 'none' || r.width < 2) continue;
        if (r.x < -0.5 || r.y < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5)
          bad.push((el.textContent || el.id).trim());
      }
      return bad;
    });
    expect(portraitClip, 'portrait buttons clipped').toEqual([]);
    await page.screenshot({ path: `${ART}/phone-skippy-portrait.png` });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.evaluate(() => __SQ.step(2));
    const land = await page.evaluate(() => {
      const box = (name) => {
        const el = document.querySelector('[data-b="' + name + '"]');
        const r = el.getBoundingClientRect();
        return { cx: r.x + r.width / 2, cy: r.y + r.height / 2, w: r.width };
      };
      const atk = box('attack'), item = box('item'), magic = box('magic'), roll = box('roll');
      return { atk, item, magic, roll };
    });
    expect(land.roll.w).toBeGreaterThanOrEqual(56);
    expect(land.atk.cx).toBeGreaterThan(land.item.cx);
    expect(land.magic.cy).toBeLessThan(land.roll.cy);
    expect(land.atk.cx).toBeGreaterThan(400);
    const landClip = await page.evaluate(() => {
      const bad = [];
      for (const el of document.querySelectorAll('.srml-b, #stick')) {
        const r = el.getBoundingClientRect();
        if (getComputedStyle(el).display === 'none' || r.width < 2) continue;
        if (r.x < -0.5 || r.y < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5)
          bad.push((el.textContent || el.id).trim());
      }
      return bad;
    });
    expect(landClip, 'landscape buttons clipped').toEqual([]);
    await page.screenshot({ path: `${ART}/phone-skippy-landscape.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('narrow phones keep MAGIC, ITEM, ROLL and TALK fully on screen', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    for (const [w, h] of [[360, 640], [390, 844], [430, 932], [640, 360], [844, 390], [932, 430]]) {
      await page.setViewportSize({ width: w, height: h });
      const fit = await page.evaluate(() => {
        const S = __SQ;
        S.G.state = 'play';
        S.G.story = 'skippy';
        S.G.paused = false;
        S.P.items = { raygun: true, lasso: true };
        S.P.wep = 'raygun';
        S.P.tool = 'lasso';
        S.P.pri = 'raygun';
        S.P.sec = 'lasso';
        S.flag('oe_teashop');
        S.warp('teashop', 6, 6, 0);
        S.step(2);
        const npc = S.npcs.find((n) => n.id === 'x_tea');
        if (npc) { S.P.x = npc.x; S.P.y = npc.y + 16; }
        for (let i = 0; i < 12 && (S.script || S.dlg); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
        S.step(2);
        const clipped = [];
        for (const el of document.querySelectorAll('.srml-b, #stick')) {
          const r = el.getBoundingClientRect();
          if (getComputedStyle(el).display === 'none' || r.width < 2) continue;
          const label = (el.textContent || el.id).trim();
          if (r.x < -0.5 || r.y < -0.5 || r.right > innerWidth + 0.5 || r.bottom > innerHeight + 0.5) clipped.push(label);
          if (Math.min(r.width, r.height) < 48) clipped.push(label + ' small');
        }
        const labels = [...document.querySelectorAll('.srml-b, #stick')]
          .filter((el) => getComputedStyle(el).display !== 'none')
          .map((el) => (el.textContent || '').trim());
        return { clipped, labels, talk: document.documentElement.dataset.talk };
      });
      const pause = await page.evaluate(() => document.querySelector('[data-b="map"]').getBoundingClientRect());
      expect(pause.x, `${w}x${h} pause`).toBeLessThan(w / 2);
      expect(fit.talk, `${w}x${h} ${fit.labels.join(',')}`).toBe('1');
      expect(fit.labels, `${w}x${h} ${fit.labels.join(',')}`).toEqual(expect.arrayContaining(['MAGIC', 'ITEM', 'SWAP', 'ROLL', 'TALK']));
      expect(fit.clipped, `${w}x${h} ${fit.clipped.join(',')}`).toEqual([]);
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });

  test('ROS and Ramshackle use the same diamond', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    for (const [story, area, file] of [
      ['ros', 'ros_desert', 'phone-ros'],
      ['ramshackle', 'ram_dock', 'phone-ram'],
    ]) {
      for (const [w, h, side] of [[390, 844, 'portrait'], [844, 390, 'landscape']]) {
        await page.setViewportSize({ width: w, height: h });
        const face = await page.evaluate(({ story, area }) => {
          const S = __SQ;
          S.G.state = 'play';
          S.G.story = story;
          S.G.paused = false;
          if (story === 'ramshackle') {
            S.P.items = { hatchet: true };
            S.P.pri = 'hatchet';
            S.P.wep = 'hatchet';
          } else {
            S.P.items = { blasters: true };
            S.P.pri = 'lasers';
            S.P.wep = 'lasers';
          }
          S.flag('oe_' + area);
          S.warp(area, 8, 8, 3);
          S.step(2);
          for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
            S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
          }
          S.step(1);
          const label = (b) => (document.querySelector('[data-b="' + b + '"]') || {}).textContent || '';
          const pause = document.querySelector('[data-b="map"]').getBoundingClientRect();
          return { top: label('roll') || label('board'), pause: pause.x, board: S.board().has };
        }, { story, area });
        expect(face.board, story).toBe(true);
        expect(face.top.trim(), story).toBe('BOARD');
        expect(face.pause, story).toBeLessThan(w / 2);
        await page.screenshot({ path: `${ART}/${file}-${side}.png` });
      }
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test('HUD labels stay apart and toasts clear', async ({ page }) => {
  const errors = await boot(page);
  const hud = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.P.items = { raygun: true, lasso: true };
    S.P.wep = 'raygun';
    S.P.tool = 'lasso';
    S.P.pri = 'raygun';
    S.P.sec = 'lasso';
    S.P.spell = 'lantern';
    S.flag('oe_desert');
    S.warp('desert', 12, 10, 1);
    S.step(2);
    const bits = S.hud().filter((b) => b.text);
    const hits = [];
    for (let i = 0; i < bits.length; i++) {
      for (let j = i + 1; j < bits.length; j++) {
        const a = bits[i], b = bits[j];
        const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
        const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
        if (ix > 0 && iy > 0) hits.push(a.text + ' / ' + b.text);
      }
    }
    return { hits, texts: bits.map((b) => b.text) };
  });
  expect(hud.texts.join(' ')).toContain('LANTERN');
  expect(hud.texts.join(' ')).toContain('X RAY');
  expect(hud.texts.join(' ')).toContain('Z ROPE');
  expect(hud.hits, hud.texts.join(' | ')).toEqual([]);

  const timed = await page.evaluate(() => {
    const S = __SQ;
    S.G.toast = 'HELLO RIDER';
    S.G.toastT = 1.8;
    S.step(30);
    const mid = S.toast().text;
    S.step(120);
    return { mid, later: S.toast().text };
  });
  expect(timed.mid).toBe('HELLO RIDER');
  expect(timed.later).toBe('');

  const cleared = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.P.items.sword = true;
    S.flag('oe_ac_range');
    S.warp('ac_range', 4, 7, 1);
    S.step(2);
    for (const e of S.ents) {
      S.P.x = e.x - 16; S.P.y = e.y + 4; S.P.dir = 3;
      S.press('attack', true); S.step(2); S.press('attack', false); S.step(20);
    }
    S.step(2);
    const tin = S.toast().text;
    S.flag('oe_sky_city');
    S.warp('sky_city', 8, 7, 0);
    S.step(2);
    return { tin, sky: S.toast().text, area: S.A.id };
  });
  expect(cleared.tin).toContain('VISOR');
  expect(cleared.area).toBe('sky_city');
  expect(cleared.sky).toBe('');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('Skippy earns a board and Slide upgrades every tier', async ({ page }) => {
  const errors = await boot(page);
  const earned = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('space_board', false);
    S.flag('oe_sky_city');
    S.warp('sky_city', 8, 8, 0);
    S.step(2);
    const before = S.board();
    S.flag('lane_sky');
    S.run('slide_grant');
    for (let i = 0; i < 8; i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
      if (S.board().has) break;
    }
    const after = S.board();
    S.P.coins = 200;
    S.P.part = 2;
    S.P.ownB = 1;
    S.P.gearB = 1;
    if (!S.shop) {
      S.run('slide_shop');
      for (let i = 0; i < 6 && !S.shop; i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
      }
    }
    S.step(2);
    const price = S.shop && S.shop.id;
    S.press('attack', true); S.step(1); S.press('attack', false); S.step(2);
    const speed = S.board();
    S.press('back', true); S.step(1); S.press('back', false); S.step(2);
    for (let i = 0; i < 6 && (S.script || S.dlg || S.shop); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      if (S.shop) { S.press('back', true); S.step(1); S.press('back', false); S.step(1); }
    }
    S.P.x = 160; S.P.y = 120; S.P.dir = 3;
    const x0 = S.P.x;
    S.press('board', true); S.step(2); S.press('board', false); S.step(8);
    const dashed = S.P.x - x0;
    S.P.gearB = 5; S.P.ownB = 5;
    S.P.roll = 0; S.P.rollCd = 0; S.P.boardDash = 0;
    S.P.x = 80; S.P.y = 120; S.P.dir = 3;
    const t0 = S.P.x;
    S.press('board', true); S.step(1); S.press('board', false); S.step(2);
    return { before, after, shop: price, speed, dashed, tele: S.P.x - t0, ancient: S.board().name };
  });
  expect(earned.before.has).toBe(false);
  expect(earned.after.has).toBe(true);
  expect(earned.after.name).toBe('RIDER');
  expect(earned.speed.own).toBe(2);
  expect(earned.speed.name).toBe('SPEED');
  expect(earned.dashed).toBeGreaterThan(20);
  expect(earned.ancient).toBe('ANCIENT');
  expect(earned.tele).toBeGreaterThan(40);
  const others = await page.evaluate(() => {
    const S = __SQ;
    S.flag('space_board', false);
    S.G.story = 'ros';
    const ros = S.board().has;
    S.G.story = 'ramshackle';
    const ram = S.board().has;
    S.G.story = 'skippy';
    const skip = S.board().has;
    return { ros, ram, skip };
  });
  expect(others.ros).toBe(true);
  expect(others.ram).toBe(true);
  expect(others.skip).toBe(false);
  const ramHit = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ramshackle';
    S.G.paused = false;
    S.P.items = { hatchet: true, axe: true, shield: true };
    S.P.pri = 'axe';
    S.P.wep = 'axe';
    S.P.sec = 'shield';
    S.P.tool = 'shield';
    S.flag('axe_got');
    S.flag('shield_got');
    S.flag('oe_ram_dock');
    S.warp('ram_dock', 6, 8, 3);
    S.step(2);
    for (let i = 0; i < 8 && (S.script || S.dlg || S.shop); i++) {
      S.skipText(); S.press('back', true); S.step(1); S.press('back', false); S.step(1);
    }
    S.P.x = 40; S.P.y = 40; S.P.dir = 3;
    S.shots.length = 0;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(6);
    const axe = S.shots.filter((s) => s.kind === 'axe').length;
    S.P.sec = 'shield';
    S.P.tool = 'shield';
    S.press('item', true); S.step(2); S.press('item', false); S.step(2);
    return { axe, shield: S.P.shield > 0 };
  });
  expect(ramHit.axe).toBeGreaterThan(0);
  expect(ramHit.shield).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('swap chip on the diamond', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('SWAP sits on ITEM for Skippy, ROS, and Ramshackle', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    const riders = [
      ['skippy', 'desert', { raygun: true, lasso: true, missile: true }, 'raygun', 'lasso', 'phone-swap-skippy'],
      ['ros', 'ros_desert', { blasters: true, lasso: true, brand: true }, 'lasers', 'lasso', 'phone-swap-ros'],
      ['ramshackle', 'ram_dock', { hatchet: true, shield: true, amulet: true }, 'hatchet', 'shield', 'phone-swap-ram'],
    ];
    for (const [story, area, items, pri, sec, file] of riders) {
      const face = await page.evaluate(({ story, area, items, pri, sec }) => {
        const S = __SQ;
        S.G.state = 'play';
        S.G.story = story;
        S.G.paused = false;
        S.P.items = items;
        S.P.pri = pri;
        S.P.sec = sec;
        S.P.wep = pri;
        S.P.tool = sec;
        S.P.cds = {};
        if (story === 'ros') { S.flag('lasso_got'); S.flag('brand_got'); }
        if (story === 'ramshackle') { S.flag('shield_got'); S.flag('amulet_got'); }
        S.flag('oe_' + area);
        S.warp(area, 20, 16, 3);
        S.step(2);
        for (let i = 0; i < 24 && (S.script || S.dlg || S.shop || document.documentElement.dataset.touch !== 'play'); i++) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
        }
        const box = (name) => {
          const el = document.querySelector('[data-b="' + name + '"]');
          const r = el.getBoundingClientRect();
          return { x: r.x, y: r.y, w: r.width, h: r.height, on: getComputedStyle(el).display !== 'none', text: el.textContent.trim() };
        };
        const before = S.slots().sec;
        S.press('swap', true); S.step(2); S.press('swap', false); S.step(2);
        const after = S.slots();
        S.press('swap', true); S.step(1); S.press('swap', false);
        const item = box('item'), swap = box('swap'), attack = box('attack');
        const mode = document.documentElement.dataset.touch;
        const cd = document.querySelector('[data-b="item"] .cd');
        const hud = S.hud().map((b) => b.text).filter(Boolean);
        return {
          before, after, item, swap, attack, hud, mode,
          cd: !!cd,
          pri: after.pri,
        };
      }, { story, area, items, pri, sec });
      expect(face.swap.on, story + ' ' + JSON.stringify(face)).toBe(true);
      expect(face.swap.text, story).toBe('SWAP');
      expect(face.swap.w, story).toBeGreaterThanOrEqual(48);
      expect(face.swap.y + face.swap.h, story).toBeLessThanOrEqual(face.item.y + 2);
      expect(face.after.pri, story).toBe(pri);
      expect(face.after.sec, story).not.toBe(face.before);
      expect(face.cd, story).toBe(true);
      expect(face.hud.join(' '), story).toMatch(/Z /);
      await page.screenshot({ path: `${ART}/${file}.png` });
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test('every key is a walk away from its door', async ({ page }) => {
  const errors = await boot(page);
  const rows = await page.evaluate(() => __SQ.keys());
  const bad = rows.filter((row) => !row.ok);
  expect(bad, JSON.stringify(rows)).toEqual([]);
  expect(rows.length).toBeGreaterThan(12);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('oe_neon');
    S.flag('club1_clear');
    S.warp('neon', 4, 10, 0);
    S.step(4);
  });
  await page.screenshot({ path: `${ART}/key-neon-alley.png` });
  const fun = await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'ramshackle';
    S.flag('oe_ram_fun');
    S.warp('ram_fun', 16, 8, 0);
    S.step(4);
    const chest = (S.A.chests || []).find((c) => c.id === 'ram_dkey');
    return chest && chest.x;
  });
  await page.screenshot({ path: `${ART}/key-funhouse.png` });
  expect(fun).toBe(16);
  expect(errors, errors.join('\n')).toEqual([]);
});

async function openEye(page) {
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ramshackle';
    S.G.paused = false;
    S.P.items = { hatchet: true, axe: true, amulet: true };
    S.flag('axe_got');
    S.flag('amulet_got');
    S.P.pri = 'axe';
    S.P.wep = 'axe';
    S.P.sec = 'amulet';
    S.P.tool = 'amulet';
    S.P.cds = {};
    S.P.rune = 0;
    S.P.thunder = 0;
    S.warp('ram_eye', 8, 6, 1);
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    for (let i = 0; i < 180 && S.B.state !== 'fight'; i++) S.step(1);
  });
}

test('the axe lands between lightning and thunder', async ({ page }) => {
  const errors = await boot(page);
  await openEye(page);
  const before = await page.evaluate(() => {
    const S = __SQ;
    const hp = S.B.hp;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(24);
    return { hp, locked: S.B.hp, state: S.B.state };
  });
  expect(before.state).toBe('fight');
  expect(before.locked).toBe(before.hp);
  await page.evaluate(() => {
    const S = __SQ;
    S.P.cds = {};
    S.press('item', true); S.step(2); S.press('item', false); S.step(3);
  });
  const strike = await page.evaluate(() => __SQ.lightning());
  expect(strike.bolts).toBeGreaterThan(0);
  expect(strike.rune).toBeGreaterThan(1.5);
  await page.locator('#game').screenshot({ path: `${ART}/lightning-eye-desktop.png` });
  await page.evaluate(() => __SQ.step(28));
  await page.locator('#game').screenshot({ path: `${ART}/lightning-eye-glow.png` });
  const during = await page.evaluate(() => {
    const S = __SQ;
    S.P.x = S.B.x;
    S.P.y = S.B.y + 28;
    S.P.dir = 1;
    const hp = S.B.hp;
    for (let n = 0; n < 4 && S.B.hp >= hp && (S.P.rune || 0) > 0.35; n++) {
      S.press('attack', true); S.step(2); S.press('attack', false); S.step(18);
    }
    return { hp, hit: S.B.hp, rune: S.P.rune || 0 };
  });
  expect(during.hit).toBeLessThan(during.hp);
  const after = await page.evaluate(() => {
    const S = __SQ;
    S.step(150);
    const closed = S.lightning();
    S.P.x = S.B.x;
    S.P.y = S.B.y + 28;
    S.P.dir = 1;
    const hp = S.B.hp;
    for (let n = 0; n < 3; n++) {
      S.press('attack', true); S.step(2); S.press('attack', false); S.step(18);
    }
    return { closed, hp, clink: S.B.hp, text: S.objective() };
  });
  expect(after.closed.rune).toBe(0);
  expect(after.closed.thunder).toBe(0);
  expect(after.clink).toBe(after.hp);
  expect(after.text).toContain('LIGHTNING');
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('lightning on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('the Storm Eye glow is visible on a phone', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await openEye(page);
    await page.evaluate(() => {
      const S = __SQ;
      S.P.cds = {};
      S.press('item', true); S.step(2); S.press('item', false); S.step(3);
    });
    await page.screenshot({ path: `${ART}/lightning-eye-phone.png` });
    const glow = await page.evaluate(() => __SQ.lightning());
    expect(glow.rune).toBeGreaterThan(1);
    expect(glow.bolts).toBeGreaterThan(0);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

function hudHits(bits) {
  const hits = [];
  for (let i = 0; i < bits.length; i++) {
    for (let j = i + 1; j < bits.length; j++) {
      const a = bits[i], b = bits[j];
      const ix = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
      const iy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
      if (ix > 0.5 && iy > 0.5) hits.push((a.text || a.id) + ' / ' + (b.text || b.id));
    }
  }
  return hits;
}

test('boss fights keep the HUD and the boss bar apart', async ({ page }) => {
  const errors = await boot(page);
  const fights = [
    ['skippy', 'd4', { sword: true }, 'sword', '', 'SWORD'],
    ['ros', 'rs3', { blasters: true, lasso: true }, 'lasers', 'lasso', 'LASERS'],
    ['ramshackle', 'ram_eye', { axe: true, amulet: true }, 'axe', 'amulet', 'AXE'],
  ];
  for (const [story, area, items, pri, sec, word] of fights) {
    const face = await page.evaluate(({ story, area, items, pri, sec }) => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = story;
      S.G.paused = false;
      S.P.items = items;
      S.P.pri = pri;
      S.P.sec = sec;
      S.P.wep = pri;
      S.P.tool = sec;
      if (story === 'ros') S.flag('lasso_got');
      if (story === 'ramshackle') {
        S.flag('axe_got');
        S.flag('amulet_got');
      }
      S.flag('oe_' + area);
      S.warp(area, 8, 8, 1);
      for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
        S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      for (let i = 0; i < 420 && S.B.state !== 'fight'; i++) {
        if (S.script || S.dlg) {
          S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false);
        }
        S.step(1);
      }
      const bits = S.fightHud();
      const names = bits.filter((b) => b.text).map((b) => b.text);
      return { state: S.B.state, bits, names };
    }, { story, area, items, pri, sec });
    expect(face.state, story).toBe('fight');
    const bar = face.bits.find((b) => b.id === 'bossbar');
    const title = face.bits.find((b) => b.id === 'bossname');
    expect(bar, story).toBeTruthy();
    expect(bar.y, story).toBeGreaterThanOrEqual(34);
    expect(title.y, story).toBeGreaterThanOrEqual(bar.y + bar.h);
    for (const bit of face.bits) {
      if (!bit.text || bit.id === 'bossname') continue;
      expect(bit.y + bit.h, story + ' ' + bit.text).toBeLessThanOrEqual(bar.y);
    }
    expect(hudHits(face.bits), story + ' ' + face.names.join(' | ')).toEqual([]);
    const mentions = face.names.filter((t) => t.split(' ').includes(word));
    expect(mentions, story + ' ' + face.names.join(' | ')).toHaveLength(1);
    if (story === 'ramshackle') {
      expect(face.names.filter((t) => t.includes('AMULET'))).toHaveLength(1);
      await page.locator('#game').screenshot({ path: `${ART}/storm-eye-hud-desktop.png` });
    }
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('Storm Eye HUD on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('the boss bar sits under the HUD', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await openEye(page);
    const face = await page.evaluate(() => {
      const bits = __SQ.fightHud();
      return { state: __SQ.B.state, bits, names: bits.filter((b) => b.text).map((b) => b.text) };
    });
    const bar = face.bits.find((b) => b.id === 'bossbar');
    expect(face.state).toBe('fight');
    expect(bar.y).toBeGreaterThanOrEqual(34);
    expect(hudHits(face.bits)).toEqual([]);
    expect(face.names.filter((t) => t.includes('AXE'))).toHaveLength(1);
    await page.screenshot({ path: `${ART}/storm-eye-hud-phone.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
