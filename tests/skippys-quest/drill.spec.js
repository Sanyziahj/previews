import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

async function bootLive(page) {
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
  await page.waitForTimeout(70);
  await page.keyboard.up(key);
}

async function hold(page, key, ms) {
  await page.keyboard.down(key);
  await page.waitForTimeout(ms);
  await page.keyboard.up(key);
}

async function advance(page, n = 6) {
  for (let i = 0; i < n; i++) {
    const open = await page.evaluate(() => !!(__SQ.script || __SQ.dlg || __SQ.G.choice));
    if (!open) return;
    await press(page, 'Space');
    await page.waitForTimeout(140);
  }
}

test('version, home, and Cash leave the lanes clear', async ({ page }) => {
  const errors = await bootLive(page);
  const build = await page.evaluate(() => __SQ.build());
  expect(build).toBe('b28');
  const sub = await page.evaluate(() => __SQ.chapters().find((c) => c.id === 'skippy').sub);
  expect(sub).toContain('MAIN');
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('woke');
    S.flag('oe_home');
    S.warp('home', 8, 6, 0);
  });
  await page.waitForTimeout(250);
  const home = await page.evaluate(() => {
    const rows = [];
    for (let y = 0; y < 12; y++) {
      let row = '';
      for (let x = 0; x < 20; x++) row += __SQ.tile(x, y);
      rows.push(row);
    }
    return { pots: rows.join('').split('p').length - 1, chests: __SQ.A.chests.length, name: __SQ.A.name };
  });
  expect(home.name).toBe("SKIPPY'S PLACE");
  expect(home.chests).toBe(1);
  expect(home.pots).toBe(4);
  await page.locator('#game').screenshot({ path: `${ART}/ds-home-desktop.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

function overlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

async function roomSpacing(page, area) {
  await page.evaluate((area) => {
    const S = __SQ;
    for (let i = 1; i <= 8; i++) S.flag('ch' + i + '_done');
    S.flag('lane_sky');
    S.flag('boss_d1');
    S.flag('oe_' + area);
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.warp(area, area === 'home' ? 10 : 8, 6, 0);
    S.G.bannerT = 0;
  }, area);
  await page.waitForTimeout(300);
  return page.evaluate(() => {
    const S = __SQ;
    const p = (n) => n * 16 + 8;
    const portals = (S.A.props || []).filter((prop) => prop.k === 'portal').map((prop) => ({
      name: prop.label || 'PORTAL', x: p(prop.x), y: p(prop.y), r: 18,
    }));
    const npcs = S.npcs.filter((n) => n.vis !== false && n.alpha !== 0).map((n) => ({
      name: n.id, x: n.x, y: n.y - 8, r: 14,
    }));
    const hits = [];
    for (let i = 0; i < portals.length; i++) {
      for (let j = i + 1; j < portals.length; j++) {
        const d = Math.hypot(portals[i].x - portals[j].x, portals[i].y - portals[j].y);
        if (d < portals[i].r + portals[j].r) hits.push(portals[i].name + ' / ' + portals[j].name);
      }
      for (const n of npcs) {
        const d = Math.hypot(portals[i].x - n.x, portals[i].y - n.y);
        if (d < portals[i].r + n.r) hits.push(portals[i].name + ' / ' + n.name);
      }
    }
    for (let i = 0; i < npcs.length; i++)
      for (let j = i + 1; j < npcs.length; j++) {
        const d = Math.hypot(npcs[i].x - npcs[j].x, npcs[i].y - npcs[j].y);
        if (d < npcs[i].r + npcs[j].r) hits.push(npcs[i].name + ' / ' + npcs[j].name);
      }
    const labels = window.__SQ_LABELS || [];
    const hud = [{ x: 0, y: 0, w: 320, h: 34, text: 'HUD' }, { x: 0, y: 198, w: 320, h: 26, text: 'FOOT' }];
    const labelHits = [];
    for (let i = 0; i < labels.length; i++) {
      for (const band of hud)
        if (labels[i].x < band.x + band.w && labels[i].x + labels[i].w > band.x && labels[i].y < band.y + band.h && labels[i].y + labels[i].h > band.y)
          labelHits.push(labels[i].text + ' / ' + band.text);
      for (let j = i + 1; j < labels.length; j++)
        if (labels[i].x < labels[j].x + labels[j].w && labels[i].x + labels[i].w > labels[j].x && labels[i].y < labels[j].y + labels[j].h && labels[i].y + labels[i].h > labels[j].y)
          labelHits.push(labels[i].text + ' / ' + labels[j].text);
    }
    const cash = npcs.find((n) => n.name === 'wizard');
    return { hits, labelHits, labels: labels.map((l) => l.text), cash: !!cash, portals: portals.length };
  });
}

test('Cash and the portals keep their own space', async ({ page }) => {
  const errors = await bootLive(page);
  for (const area of ['home', 'nexus', 'cosmos']) {
    const desk = await roomSpacing(page, area);
    expect(desk.hits, area + ' ' + JSON.stringify(desk.hits)).toEqual([]);
    expect(desk.labelHits, area + ' ' + JSON.stringify(desk.labelHits)).toEqual([]);
    expect(desk.cash, area).toBe(true);
    expect(desk.labels.join(' ')).toContain('CASH');
    if (area !== 'home') expect(desk.portals).toBeGreaterThan(3);
    await page.locator('#game').screenshot({ path: `${ART}/space-${area}-desktop.png` });
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const area of ['home', 'nexus']) {
    await roomSpacing(page, area);
    await page.screenshot({ path: `${ART}/space-${area}-phone.png` });
  }
  await page.setViewportSize({ width: 844, height: 390 });
  for (const area of ['home', 'nexus']) {
    await roomSpacing(page, area);
    await page.screenshot({ path: `${ART}/space-${area}-land.png` });
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone shops', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('a shop can be bought, sold, and left from the phone', async ({ page }) => {
  const errors = await bootLive(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.P.coins = 40;
    S.P.arrows = 10;
    S.flag('oe_ac_hub');
    S.warp('ac_hub', 5, 10, 2);
  });
  await page.waitForTimeout(200);
  await press(page, 'KeyE');
  for (let i = 0; i < 8; i++) {
    const open = await page.evaluate(() => __SQ.shop && __SQ.shop.id);
    if (open === 'cadet') break;
    await press(page, 'Space');
    await page.waitForTimeout(160);
  }
  await page.waitForFunction(() => document.documentElement.dataset.touch === 'shop');
  const labels = await page.locator('#srml-rows button').allTextContents();
  expect(labels.join(' ')).toContain('BUY');
  expect(labels.join(' ')).toContain('SELL');
  expect(labels.join(' ')).toContain('EXIT');
  await page.screenshot({ path: `${ART}/ds-shop-phone.png` });
  const before = await page.evaluate(() => __SQ.P.coins);
  await page.locator('#srml-rows button', { hasText: 'BUY' }).first().tap();
  await page.waitForTimeout(200);
  const bought = await page.evaluate(() => __SQ.P.coins);
  expect(bought).toBeLessThan(before);
  await page.locator('#srml-rows button', { hasText: 'SELL' }).tap();
  await page.waitForTimeout(200);
  const sold = await page.evaluate(() => ({ coins: __SQ.P.coins, arrows: __SQ.P.arrows }));
  expect(sold.arrows).toBe(0);
  expect(sold.coins).toBeGreaterThan(bought);
  await page.locator('#srml-rows button', { hasText: 'EXIT' }).tap();
  await page.waitForTimeout(250);
  const left = await page.evaluate(() => __SQ.shop);
  expect(left).toBeFalsy();
  await page.setViewportSize({ width: 844, height: 390 });
  await page.evaluate(() => {
    const S = __SQ;
    S.P.coins = 30;
    S.run('ac_cash');
  });
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => __SQ.shop && __SQ.shop.id === 'cadet')) break;
    await press(page, 'Space');
    await page.waitForTimeout(120);
  }
  await page.screenshot({ path: `${ART}/ds-shop-land.png` });
  const shops = ['pour', 'hauler', 'tea', 'cadet', 'dragon', 'forge', 'sars', 'boards', 'travel', 'slide'];
  for (const id of shops) {
    await page.evaluate((id) => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.paused = false;
      S.P.coins = 80;
      S.openShop(id);
    }, id);
    await page.waitForTimeout(150);
    const row = (await page.locator('#srml-rows button').allTextContents()).join(' ');
    expect(row, id).toContain('BUY');
    expect(row, id).toContain('SELL');
    expect(row, id).toContain('EXIT');
    await page.locator('#srml-rows button', { hasText: 'EXIT' }).tap();
    await page.waitForTimeout(150);
  }
  expect(errors, errors.join('\n')).toEqual([]);
});
});

test('dialogue freezes a fight until the box closes', async ({ page }) => {
  const errors = await bootLive(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.P.hp = 6;
    S.P.maxHp = 6;
    S.flag('oe_desert');
    S.warp('desert', 15, 14, 0);
  });
  await page.waitForTimeout(200);
  const before = await page.evaluate(() => {
    const foe = __SQ.ents.find((e) => !e.dead);
    __SQ.P.x = foe.x;
    __SQ.P.y = foe.y;
    __SQ.say('skippy', 'HOLD STILL. I AM READING.');
    return { x: foe.x, y: foe.y, hp: __SQ.P.hp, shots: __SQ.shots.length };
  });
  await page.waitForTimeout(700);
  await page.locator('#game').screenshot({ path: `${ART}/ds-dialogue-freeze.png` });
  const during = await page.evaluate(() => {
    const foe = __SQ.ents.find((e) => !e.dead);
    return { x: foe.x, y: foe.y, hp: __SQ.P.hp, open: !!__SQ.dlg };
  });
  expect(during.open).toBe(true);
  expect(during.hp).toBe(before.hp);
  expect(Math.abs(during.x - before.x) + Math.abs(during.y - before.y)).toBeLessThan(2);
  await press(page, 'Space');
  await page.waitForTimeout(200);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('Shadow gives Ramshackle a board and an old save keeps it', async ({ page }) => {
  const errors = await bootLive(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'ramshackle';
    S.G.paused = false;
    S.P.items = { hatchet: true };
    S.P.pri = 'hatchet';
    S.P.wep = 'hatchet';
    S.flag('oe_ram_dock');
    S.flag('ram_board', false);
    S.flag('space_board', false);
    S.flag('axe_got', false);
    S.warp('ram_dock', 16, 9, 0);
  });
  await page.waitForTimeout(200);
  const fresh = await page.evaluate(() => __SQ.board());
  expect(fresh.has).toBe(false);
  await press(page, 'KeyE');
  await page.waitForTimeout(400);
  await page.locator('#game').screenshot({ path: `${ART}/ds-shadow-board.png` });
  for (let i = 0; i < 8; i++) {
    if (await page.evaluate(() => __SQ.board().has)) break;
    await press(page, 'Space');
    await page.waitForTimeout(150);
  }
  const gifted = await page.evaluate(() => __SQ.board());
  expect(gifted.has).toBe(true);
  expect(gifted.name).toBe('RIDER');
  await page.evaluate(() => {
    localStorage.setItem('sq_save_ram_v1', JSON.stringify({
      z: 'bow', v: 1, area: 'ram_mars', x: 160, y: 160, dir: 1,
      hp: 8, maxHp: 8, pieces: 0, coins: 7, arrows: 0,
      items: { hatchet: true, axe: true }, keys: {}, bigKeys: {},
      flags: { axe_got: true }, party: [], shards: 0, time: 4, visited: { ram_mars: true },
      pri: 'axe', sec: '',
    }));
  });
  const old = await page.evaluate(() => {
    const ok = __SQ.loadChapter('ramshackle');
    return { ok, has: __SQ.board().has, coins: __SQ.P.coins, axe: !!__SQ.P.items.axe };
  });
  expect(old.ok).toBe(true);
  expect(old.has).toBe(true);
  expect(old.coins).toBe(7);
  expect(old.axe).toBe(true);
  await page.evaluate(() => localStorage.setItem('sq_save_v1', '{"coins":42,"flags":{"woke":true},"area":"home","x":160,"y":120,"dir":0,"hp":6,"maxHp":6,"pieces":0,"arrows":0,"items":{"raygun":true},"keys":{},"bigKeys":{},"party":[],"shards":0,"time":1,"visited":{"home":true},"pri":"raygun","sec":""}'));
  const kept = await page.evaluate(() => {
    const before = localStorage.getItem('sq_save_v1');
    return { before: JSON.parse(before).coins, ram: JSON.parse(localStorage.getItem('sq_save_ram_v1')).coins };
  });
  expect(kept.before).toBe(42);
  expect(kept.ram).toBe(7);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('Cavendish board race is playable and pays a token', async ({ page }) => {
  const errors = await bootLive(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.P.coins = 3;
    S.P.part = 0;
    S.flag('oe_carnival');
    S.warp('carnival', 21, 6, 1);
  });
  await page.waitForTimeout(200);
  await press(page, 'KeyE');
  for (let i = 0; i < 6 && !(await page.evaluate(() => !!__SQ.G.choice)); i++) {
    await press(page, 'Space');
    await page.waitForTimeout(140);
  }
  await page.evaluate(() => { __SQ.G.choice.sel = 1; });
  await press(page, 'KeyX');
  for (let i = 0; i < 6 && !(await page.evaluate(() => !!__SQ.G.race)); i++) {
    await press(page, 'Space');
    await page.waitForTimeout(140);
  }
  await page.waitForFunction(() => __SQ.G.race && __SQ.G.race.phase === 'run', null, { timeout: 8000 });
  await page.waitForTimeout(700);
  await page.locator('#game').screenshot({ path: `${ART}/ds-race-desktop.png` });
  await press(page, 'KeyX');
  await page.waitForFunction(() => __SQ.G.race && __SQ.G.race.phase === 'done', null, { timeout: 20000 });
  const done = await page.evaluate(() => ({
    win: __SQ.G.race.win,
    coins: __SQ.P.coins,
    part: __SQ.P.part,
    flag: !!__SQ.flags.race_won,
  }));
  expect(done.win).toBe(true);
  expect(done.coins).toBeGreaterThanOrEqual(18);
  expect(done.part).toBeGreaterThanOrEqual(1);
  expect(done.flag).toBe(true);
  await press(page, 'Backspace');
  await page.waitForTimeout(200);
  expect(await page.evaluate(() => __SQ.G.race)).toBeFalsy();
  expect(errors, errors.join('\n')).toEqual([]);
});

test('holding into the asteroids loses the Cavendish race', async ({ page }) => {
  const errors = await bootLive(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.P.coins = 9;
    S.P.part = 0;
    S.flag('oe_carnival');
    S.warp('carnival', 21, 6, 1);
  });
  await page.waitForTimeout(200);
  await press(page, 'KeyE');
  for (let i = 0; i < 6 && !(await page.evaluate(() => !!__SQ.G.choice)); i++) {
    await press(page, 'Space');
    await page.waitForTimeout(120);
  }
  await page.evaluate(() => { __SQ.G.choice.sel = 1; });
  await press(page, 'KeyX');
  for (let i = 0; i < 6 && !(await page.evaluate(() => !!__SQ.G.race)); i++) {
    await press(page, 'Space');
    await page.waitForTimeout(140);
  }
  await page.waitForFunction(() => __SQ.G.race && __SQ.G.race.phase === 'run', null, { timeout: 8000 });
  await page.keyboard.down('ArrowRight');
  await page.waitForFunction(() => __SQ.G.race && __SQ.G.race.phase === 'done', null, { timeout: 20000 });
  await page.keyboard.up('ArrowRight');
  const lost = await page.evaluate(() => ({
    win: __SQ.G.race.win,
    place: __SQ.G.race.place,
    coins: __SQ.P.coins,
    reward: __SQ.G.race.reward,
  }));
  expect(lost.win).toBe(false);
  expect(lost.place).toBe(2);
  expect(lost.coins).toBe(9);
  expect(lost.reward).toContain('NO PRIZE');
  await page.locator('#game').screenshot({ path: `${ART}/ds-race-lose.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone race', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('BOOST and EXIT are on the phone', async ({ page }) => {
    const errors = await bootLive(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'skippy';
      S.P.coins = 1;
      S.flag('race_won');
      S.run('cav_race_yes');
    });
    for (let i = 0; i < 6 && !(await page.evaluate(() => !!__SQ.G.race)); i++) {
      await press(page, 'Space');
      await page.waitForTimeout(120);
    }
    await page.waitForFunction(() => document.documentElement.dataset.touch === 'race');
    await page.waitForFunction(() => __SQ.G.race && __SQ.G.race.phase === 'run', null, { timeout: 8000 });
    await page.waitForTimeout(500);
    const labels = await page.locator('.srml-b').allTextContents();
    expect(labels.join(' ')).toContain('LEFT');
    expect(labels.join(' ')).toContain('RIGHT');
    expect(labels.join(' ')).toContain('BOOST');
    expect(labels.join(' ')).toContain('EXIT');
    await page.screenshot({ path: `${ART}/ds-race-phone.png` });
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${ART}/ds-race-land.png` });
    await page.locator('.srml-b', { hasText: 'BOOST' }).tap();
    await page.waitForFunction(() => __SQ.G.race && __SQ.G.race.phase === 'done', null, { timeout: 20000 });
    await page.locator('.srml-b', { hasText: 'EXIT' }).tap();
    await page.waitForTimeout(300);
    expect(await page.evaluate(() => __SQ.G.race)).toBeFalsy();
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

async function fightBoss(page, area, file) {
  await page.evaluate((area) => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'drill';
    S.G.paused = false;
    S.P.items = { blast: true };
    S.P.pri = 'blast';
    S.P.wep = 'blast';
    S.P.sec = '';
    S.P.hp = 10;
    S.P.maxHp = 10;
    S.P.cds = {};
    S.flag('ds_board');
    S.flag('space_board');
    S.flag('ds_nocont');
    S.flag('oe_' + area);
    S.warp(area, 9, 8, 1);
  }, area);
  await page.waitForFunction(() => __SQ.B && __SQ.B.state === 'fight', null, { timeout: 8000 });
  await page.locator('#game').screenshot({ path: `${ART}/${file}.png` });
  let hurt = false;
  for (let i = 0; i < 10; i++) {
    await press(page, 'KeyX');
    await page.waitForTimeout(180);
    const snap = await page.evaluate(() => ({ hp: __SQ.B.hp, state: __SQ.B.state, max: __SQ.B.max }));
    if (snap.hp < snap.max) hurt = true;
    if (snap.hp <= 0 || snap.state === 'dying' || snap.state === 'dead') break;
  }
  return hurt;
}

test('Drill Sergeant walks the memories and gifts the heavy blaster', async ({ page }) => {
  test.setTimeout(180000);
  const errors = await bootLive(page);
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i++) await press(page, 'ArrowDown');
  await press(page, 'KeyX');
  await page.waitForTimeout(500);
  await press(page, 'KeyX');
  await page.waitForTimeout(500);
  await advance(page, 8);
  const started = await page.evaluate(() => ({ story: __SQ.story(), area: __SQ.A.id, blast: !!__SQ.P.items.blast, board: __SQ.board().has }));
  expect(started.story).toBe('drill');
  expect(started.area).toBe('ds_camp');
  expect(started.blast).toBe(true);
  expect(started.board).toBe(true);
  await page.locator('#game').screenshot({ path: `${ART}/ds-camp.png` });

  const memories = [
    ['ds_moonkey', 'ds_moondoor', 'ds_moonboss', 'door_dsm', 'dsm', 'ds-moon', 'ds-boss-revolt'],
    ['ds_marskey', 'ds_marsdoor', 'ds_marsboss', 'door_dsa', 'dsa', 'ds-mars', 'ds-boss-mars'],
    ['ds_candykey', 'ds_candydoor', 'ds_candyboss', 'door_dsc', 'dsc', 'ds-candy', 'ds-boss-candy'],
    ['ds_plutokey', 'ds_plutodoor', 'ds_plutoboss', 'door_dsp', 'dsp', 'ds-pluto', 'ds-boss-pluto'],
  ];
  for (const [keyRoom, doorRoom, bossRoom, doorFlag, dung, shot, bossShot] of memories) {
    await page.evaluate(({ keyRoom }) => {
      const S = __SQ;
      S.flag('oe_' + keyRoom);
      const south = keyRoom === 'ds_plutokey';
      S.warp(keyRoom, 4, south ? 7 : 4, south ? 0 : 1);
    }, { keyRoom });
    await page.waitForTimeout(200);
    await page.locator('#game').screenshot({ path: `${ART}/${shot}.png` });
    if (keyRoom === 'ds_moonkey') await page.locator('#game').screenshot({ path: `${ART}/ds-flash-desktop.png` });
    await press(page, 'KeyE');
    await page.waitForTimeout(800);
    await press(page, 'Space');
    await page.waitForTimeout(150);
    const key = await page.evaluate((dung) => (__SQ.P.keys || {})[dung] || 0, dung);
    expect(key, keyRoom).toBeGreaterThan(0);
    await page.evaluate(({ doorRoom }) => {
      __SQ.flag('oe_' + doorRoom);
      __SQ.warp(doorRoom, 9, 2, 1);
    }, { doorRoom });
    await page.waitForTimeout(150);
    await hold(page, 'ArrowUp', 500);
    const unlocked = await page.evaluate((doorFlag) => !!__SQ.flags[doorFlag], doorFlag);
    expect(unlocked, doorRoom).toBe(true);
    const hurt = await fightBoss(page, bossRoom, bossShot);
    expect(hurt, bossRoom).toBe(true);
    await page.waitForFunction(() => __SQ.B.state === 'dead' || __SQ.B.state === 'dying' || __SQ.script, null, { timeout: 12000 });
    await page.waitForTimeout(2800);
    await advance(page, 8);
  }
  await page.locator('#game').screenshot({ path: `${ART}/ds-breathe.png` });
  await page.evaluate(() => {
    localStorage.setItem('sq_save_v1', JSON.stringify({
      z: 'bow', v: 1, area: 'home', x: 160, y: 120, dir: 0,
      hp: 6, maxHp: 6, pieces: 0, coins: 42, arrows: 0,
      items: { raygun: true, lasso: true }, keys: {}, bigKeys: {},
      flags: { woke: true }, party: [], shards: 0, time: 3, visited: { home: true },
      pri: 'raygun', sec: 'lasso',
    }));
    const S = __SQ;
    S.flag('oe_ds_elite');
    S.flag('ds_ready');
    S.warp('ds_elite', 9, 5.15, 1);
  });
  await page.waitForTimeout(400);
  for (let i = 0; i < 20 && (await page.evaluate(() => __SQ.story())) === 'drill'; i++) {
    await page.waitForTimeout(150);
  }
  await advance(page, 8);
  await page.locator('#game').screenshot({ path: `${ART}/ds-gift.png` });
  const gift = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('sq_save_v1'));
    return {
      story: __SQ.story(),
      heavy: !!__SQ.P.items.heavy,
      saved: !!(save.items && save.items.heavy),
      tale: !!(save.flags && save.flags.tale_drill),
      coins: save.coins,
      drill: JSON.parse(localStorage.getItem('sq_save_ds_v1')).flags.ds_home_end,
    };
  });
  expect(gift.story).toBe('skippy');
  expect(gift.heavy).toBe(true);
  expect(gift.saved).toBe(true);
  expect(gift.tale).toBe(true);
  expect(gift.coins).toBe(42);
  expect(gift.drill).toBe(true);
  for (let i = 0; i < 10; i++) {
    const open = await page.evaluate(() => !!(__SQ.script || __SQ.dlg || __SQ.getPop));
    if (!open) break;
    await press(page, 'Space');
    await page.waitForTimeout(200);
  }
  await page.evaluate(() => {
    const S = __SQ;
    S.P.pri = 'heavy';
    S.P.wep = 'heavy';
    S.P.sec = 'lasso';
    S.P.tool = 'lasso';
    S.P.cds = {};
    S.warp('moon', 10, 8, 3);
  });
  await page.waitForTimeout(200);
  await page.locator('#game').screenshot({ path: `${ART}/ds-skippy-blaster.png` });
  await press(page, 'KeyX');
  await page.waitForTimeout(200);
  const shotX = await page.evaluate(() => __SQ.shots.some((s) => s.kind === 'heavy'));
  expect(shotX).toBe(true);
  await page.evaluate(() => { __SQ.P.pri = 'raygun'; __SQ.P.wep = 'raygun'; __SQ.P.sec = 'heavy'; __SQ.P.tool = 'heavy'; __SQ.P.cds = {}; });
  await press(page, 'KeyZ');
  await page.waitForTimeout(200);
  const shotZ = await page.evaluate(() => __SQ.shots.filter((s) => s.kind === 'heavy').length);
  expect(shotZ).toBeGreaterThan(0);
  await press(page, 'KeyQ');
  await page.waitForTimeout(120);
  const swapped = await page.evaluate(() => __SQ.slots());
  expect(swapped.sec).not.toBe('heavy');
  await press(page, 'KeyQ');
  await page.waitForTimeout(120);
  const back = await page.evaluate(() => __SQ.slots());
  expect(back.sec).toBe('heavy');
  const landings = await page.evaluate(() => __SQ.auditLandings().filter((b) => String(b.from).indexOf('ds_') === 0 || String(b.to).indexOf('ds_') === 0));
  expect(landings, JSON.stringify(landings)).toEqual([]);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('every Drill boss takes a real hit, including a sword save and the phone', async ({ page }) => {
  const errors = await bootLive(page);
  for (const area of ['ds_moonboss', 'ds_marsboss', 'ds_candyboss', 'ds_plutoboss']) {
    const hurt = await fightBoss(page, area, 'ds-hit-' + area);
    expect(hurt, area).toBe(true);
  }
  await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'drill';
    S.P.items = { blast: true, sword: true };
    S.P.pri = 'sword';
    S.P.wep = 'sword';
    S.P.sec = '';
    S.P.cds = {};
    S.P.hp = 10;
    S.flag('oe_ds_moonboss');
    S.warp('ds_moonboss', 9, 4, 1);
  });
  await page.waitForFunction(() => __SQ.B.state === 'fight', null, { timeout: 8000 });
  const max = await page.evaluate(() => __SQ.B.max);
  for (let i = 0; i < 6; i++) {
    await press(page, 'KeyX');
    await page.waitForTimeout(200);
  }
  const sword = await page.evaluate(() => __SQ.B.hp);
  expect(sword).toBeLessThan(max);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone blaster and flashback', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('ATTACK on the phone drops a Drill boss and fires the heavy blaster', async ({ page }) => {
    const errors = await bootLive(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'drill';
      S.G.paused = false;
      S.P.items = { blast: true };
      S.P.pri = 'blast';
      S.P.wep = 'blast';
      S.P.hp = 10;
      S.P.maxHp = 10;
      S.P.cds = {};
      S.flag('ds_board');
      S.flag('space_board');
      S.flag('oe_ds_moonboss');
      S.warp('ds_moonboss', 9, 8, 1);
    });
    await page.waitForFunction(() => __SQ.B.state === 'fight', null, { timeout: 8000 });
    await page.screenshot({ path: `${ART}/ds-flash-phone.png` });
    const attack = page.locator('[data-b="attack"]');
    let hurt = false;
    for (let i = 0; i < 8; i++) {
      await attack.tap();
      await page.waitForTimeout(220);
      const snap = await page.evaluate(() => ({ hp: __SQ.B.hp, max: __SQ.B.max }));
      if (snap.hp < snap.max) hurt = true;
      if (snap.hp <= 0) break;
    }
    expect(hurt).toBe(true);
    const board = await page.locator('[data-b="board"], [data-b="roll"]').first().textContent();
    expect((board || '').trim()).toBe('BOARD');
    await page.evaluate(() => {
      const S = __SQ;
      S.G.story = 'skippy';
      S.P.items = { heavy: true, raygun: true };
      S.P.pri = 'heavy';
      S.P.wep = 'heavy';
      S.P.sec = '';
      S.P.cds = {};
      S.flag('heavy_got');
      S.flag('oe_moon');
      S.warp('moon', 10, 8, 3);
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${ART}/ds-blaster-phone.png` });
    await attack.tap();
    await page.waitForTimeout(250);
    const shot = await page.evaluate(() => __SQ.shots.some((s) => s.kind === 'heavy'));
    expect(shot).toBe(true);
    await page.evaluate(() => {
      const S = __SQ;
      S.P.pri = 'raygun';
      S.P.wep = 'raygun';
      S.P.sec = 'heavy';
      S.P.tool = 'heavy';
      S.P.items.raygun = true;
      S.P.items.lasso = true;
      S.flag('lasso_got');
      S.P.cds = {};
    });
    await page.locator('[data-b="item"]').tap();
    await page.waitForTimeout(250);
    const itemShot = await page.evaluate(() => __SQ.shots.filter((s) => s.kind === 'heavy').length);
    expect(itemShot).toBeGreaterThan(0);
    await page.locator('[data-b="swap"]').tap();
    await page.waitForTimeout(150);
    const swapped = await page.evaluate(() => __SQ.slots());
    expect(swapped.sec).not.toBe('heavy');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${ART}/ds-flash-land.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
