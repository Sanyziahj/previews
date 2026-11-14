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
  expect(build).toBe('b43');
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
    if (area === 'home') {
      expect(desk.cash, area).toBe(false);
      expect(desk.portals).toBe(0);
    } else {
      expect(desk.cash, area).toBe(true);
      if (area === 'nexus') {
        expect(desk.labels.join(' '), area).toContain('COSMOS');
        expect(desk.labels.join(' '), area).not.toContain('CASH');
        expect(desk.labels.join(' '), area).not.toContain('DESERT');
        expect(desk.portals).toBeGreaterThanOrEqual(1);
      } else {
        expect(desk.labels, area).toEqual([]);
        expect(desk.portals).toBeGreaterThan(3);
      }
    }
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
    S.flag('axe_got', false);
    S.warp('ram_dock', 16, 9, 0);
  });
  await page.waitForTimeout(200);
  const fresh = await page.evaluate(() => __SQ.board());
  expect(fresh.has).toBe(true);
  expect(fresh.name).toBe('RIDER');
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
    S.P.melee = '';
    S.P.pri = 'blast';
    S.P.sec = 'blast';
    S.P.tool = 'blast';
    S.P.wep = '';
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
  for (let i = 0; i < 18; i++) {
    await press(page, 'KeyZ');
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
  await page.evaluate(() => {
    localStorage.setItem('sq_save_v1', JSON.stringify({
      v: 1, area: 'home', x: 160, y: 160, dir: 0, hp: 6, maxHp: 6,
      items: {}, keys: {}, bigKeys: {}, party: [], visited: {},
      flags: { woke: true, ds_home_end: true },
    }));
  });
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
    S.P.melee = '';
    S.P.wep = '';
    S.P.pri = 'lasso';
    S.P.sec = 'heavy';
    S.P.tool = 'heavy';
    S.P.cds = {};
    S.flag('oe_moon');
    S.warp('moon', 10, 8, 3);
  });
  await page.waitForTimeout(200);
  for (let i = 0; i < 8; i++) {
    const open = await page.evaluate(() => !!(__SQ.script || __SQ.dlg || __SQ.getPop));
    if (!open) break;
    await press(page, 'Space');
    await page.waitForTimeout(150);
  }
  await page.locator('#game').screenshot({ path: `${ART}/ds-skippy-blaster.png` });
  await press(page, 'KeyX');
  await page.waitForTimeout(200);
  const attackMiss = await page.evaluate(() => __SQ.shots.some((s) => s.kind === 'heavy'));
  expect(attackMiss).toBe(false);
  await press(page, 'KeyZ');
  await page.waitForTimeout(200);
  const shotX = await page.evaluate(() => __SQ.shots.some((s) => s.kind === 'heavy'));
  expect(shotX).toBe(true);
  await page.evaluate(() => {
    const S = __SQ;
    S.P.items = { lasso: true, raygun: true, heavy: true };
    S.P.pri = 'lasso';
    S.P.sec = 'heavy';
    S.P.tool = 'heavy';
    S.P.cds = {};
  });
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
      S.P.melee = '';
      S.P.pri = 'blast';
      S.P.sec = 'blast';
      S.P.tool = 'blast';
      S.P.wep = '';
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
    const item = page.locator('[data-b="item"]');
    await attack.tap();
    await page.waitForTimeout(200);
    const attackShot = await page.evaluate(() => __SQ.shots.some((s) => s.kind === 'blast' || s.kind === 'heavy'));
    expect(attackShot).toBe(false);
    let hurt = false;
    for (let i = 0; i < 8; i++) {
      await item.tap();
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
      S.P.melee = '';
      S.P.wep = '';
      S.P.pri = 'raygun';
      S.P.sec = 'heavy';
      S.P.tool = 'heavy';
      S.P.cds = {};
      S.flag('heavy_got');
      S.flag('oe_moon');
      S.warp('moon', 10, 8, 3);
    });
    await page.waitForTimeout(250);
    await page.screenshot({ path: `${ART}/ds-blaster-phone.png` });
    await attack.tap();
    await page.waitForTimeout(250);
    const swungHeavy = await page.evaluate(() => __SQ.shots.some((s) => s.kind === 'heavy'));
    expect(swungHeavy).toBe(false);
    await item.tap();
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

test('Skippy rolls before a board, then the board is the only dash', async ({ page }) => {
  const errors = await bootLive(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('space_board', false);
    S.flag('board_got', false);
    S.P.items = { baton: true };
    S.flag('oe_desert');
    S.flag('santt_met');
    S.flag('ros_eh');
    S.flag('macho_seen');
    S.flag('tale_ros_met');
    S.warp('desert', 40, 20, 3);
    for (let i = 0; i < 8; i++) { S.skipText(); S.step(1); }
  });
  await page.waitForTimeout(200);
  for (let i = 0; i < 14 && (await page.evaluate(() => !!(__SQ.script || __SQ.dlg))); i++) {
    await press(page, 'Space');
    await page.waitForTimeout(80);
  }
  const early = await page.evaluate(() => ({
    has: __SQ.board().has,
    label: document.documentElement.dataset.rolllabel,
    open: !!(__SQ.script || __SQ.dlg),
  }));
  expect(early.open).toBe(false);
  expect(early.has).toBe(false);
  expect(early.label).toBe('ROLL');
  await page.locator('#game').click();
  await page.keyboard.down('KeyC');
  await page.waitForTimeout(90);
  const rolled = await page.evaluate(() => ({ roll: __SQ.P.roll > 0.05, dash: __SQ.P.boardDash || 0 }));
  await page.keyboard.up('KeyC');
  expect(rolled.roll).toBe(true);
  expect(rolled.dash).toBe(0);

  await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_ac_camp');
    S.warp('ac_camp', 9, 3, 0);
    S.P.hp = 8;
    S.P.maxHp = 8;
    S.P.roll = 0;
    S.P.rollCd = 0;
    S.P.boardDash = 0;
    S.P.inv = 0;
    S.P.dir = 0;
    for (let i = 0; i < 6; i++) { S.skipText(); S.step(1); }
  });
  await page.waitForTimeout(150);
  await page.keyboard.down('ArrowDown');
  await page.waitForTimeout(450);
  await page.keyboard.up('ArrowDown');
  const blocked = await page.evaluate(() => Math.floor((__SQ.P.y - 1) / 16));
  expect(blocked).toBeLessThan(5);

  await page.evaluate(() => {
    const S = __SQ;
    S.warp('ac_camp', 9, 3, 0);
    S.P.roll = 0;
    S.P.rollCd = 0;
    S.P.boardDash = 0;
    S.P.inv = 0;
    S.P.dir = 0;
    for (let i = 0; i < 4; i++) { S.skipText(); S.step(1); }
  });
  await page.waitForTimeout(150);
  await page.keyboard.down('KeyC');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyC');
  const crossed = await page.evaluate(() => Math.floor((__SQ.P.y - 1) / 16));
  expect(crossed).toBeGreaterThan(5);

  await page.evaluate(() => {
    const S = __SQ;
    S.flag('space_board');
    S.flag('oe_home');
    S.flag('woke');
    S.P.ownB = 1;
    S.P.gearB = 1;
    S.P.items.board = true;
    S.warp('home', 8, 6, 3);
    for (let i = 0; i < 8; i++) { S.skipText(); S.step(1); }
  });
  await page.waitForTimeout(200);
  for (let i = 0; i < 8 && (await page.evaluate(() => !!(__SQ.script || __SQ.dlg))); i++) await press(page, 'Space');
  await page.locator('#game').click();
  const late = await page.evaluate(() => ({
    has: __SQ.board().has,
    label: document.documentElement.dataset.rolllabel,
  }));
  expect(late.has).toBe(true);
  expect(late.label).toBe('BOARD');
  await page.keyboard.down('KeyC');
  await page.waitForTimeout(90);
  const dashed = await page.evaluate(() => ({ dash: __SQ.P.boardDash || 0, label: document.documentElement.dataset.rolllabel }));
  await page.keyboard.up('KeyC');
  expect(dashed.label).toBe('BOARD');
  expect(dashed.dash).toBeGreaterThan(0);

  await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_v2b');
    S.warp('v2b', 8, 1, 3);
    for (const e of S.ents) e.dead = true;
    S.P.hp = 8;
    S.P.x = 8 * 16 + 12;
    S.P.y = 1 * 16 + 8;
    S.P.dir = 3;
    S.P.roll = 0;
    S.P.rollCd = 0;
    S.P.boardDash = 0;
    S.P.fall = 0;
    S.P.inv = 0;
    S.P.safeX = S.P.x;
    S.P.safeY = S.P.y;
    for (let i = 0; i < 6; i++) { S.skipText(); S.step(1); }
  });
  await page.waitForTimeout(120);
  await page.keyboard.down('KeyC');
  await page.waitForTimeout(450);
  await page.keyboard.up('KeyC');
  await page.waitForTimeout(800);
  const pit = await page.evaluate(() => ({ hp: __SQ.P.hp, x: __SQ.P.x, fall: __SQ.P.fall || 0 }));
  expect(pit.fall).toBe(0);
  expect(pit.hp).toBe(8);
  expect(pit.x).toBeGreaterThan(12 * 16);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('other riders have a board from the first moment, and old saves keep it', async ({ page }) => {
  const errors = await bootLive(page);
  const fresh = await page.evaluate(() => {
    const S = __SQ;
    function open(story, area) {
      S.G.state = 'play';
      S.G.story = story;
      S.G.paused = false;
      S.flag('space_board', false);
      S.flag('ram_board', false);
      S.flag('ds_board', false);
      S.flag('board_got', false);
      S.P.items = story === 'ramshackle' ? { hatchet: true } : story === 'drill' ? { blast: true } : { blasters: true };
      S.warp(area, 6, 6, 3);
      for (let i = 0; i < 8; i++) { S.skipText(); S.step(1); }
      return { has: S.board().has, label: document.documentElement.dataset.rolllabel, name: S.board().name };
    }
    return {
      ros: open('ros', 'ros_yard'),
      ram: open('ramshackle', 'ram_dock'),
      drill: open('drill', 'ds_camp'),
    };
  });
  expect(fresh.ros).toEqual({ has: true, label: 'BOARD', name: 'RIDER' });
  expect(fresh.ram).toEqual({ has: true, label: 'BOARD', name: 'RIDER' });
  expect(fresh.drill).toEqual({ has: true, label: 'BOARD', name: 'RIDER' });

  await page.evaluate(() => {
    localStorage.setItem('sq_save_v1', JSON.stringify({
      z: 'bow', v: 1, area: 'home', x: 160, y: 140, dir: 3,
      hp: 6, maxHp: 6, pieces: 0, coins: 11, arrows: 0,
      items: { board: true, raygun: true }, keys: {}, bigKeys: {},
      flags: { board_got: true, woke: true }, party: [], shards: 6, time: 3,
      visited: { home: true },
    }));
    localStorage.setItem('sq_save_ros_v1', JSON.stringify({
      z: 'lasso', v: 1, area: 'ros_yard', x: 80, y: 96, dir: 3,
      hp: 6, maxHp: 6, pieces: 0, coins: 4, arrows: 0,
      items: { blasters: true }, keys: {}, bigKeys: {},
      flags: { yard_clear: true }, party: [], shards: 0, time: 2,
      visited: { ros_yard: true }, wep: 'lasers', tool: '', act: '',
    }));
    localStorage.setItem('sq_save_ram_v1', JSON.stringify({
      z: 'bow', v: 1, area: 'ram_dock', x: 96, y: 128, dir: 3,
      hp: 6, maxHp: 6, pieces: 0, coins: 2, arrows: 0,
      items: { hatchet: true }, keys: {}, bigKeys: {},
      flags: { ram_woke: true }, party: [], shards: 0, time: 1,
      visited: { ram_dock: true }, pri: 'hatchet', sec: '',
    }));
  });
  const loaded = await page.evaluate(() => {
    const S = __SQ;
    const skip = S.loadChapter('skippy');
    const skippy = { ok: skip, has: S.board().has, coins: S.P.coins };
    const ros = S.loadChapter('ros');
    const sheriff = { ok: ros, has: S.board().has, label: document.documentElement.dataset.rolllabel };
    const ram = S.loadChapter('ramshackle');
    const shack = { ok: ram, has: S.board().has, coins: S.P.coins, flag: !!S.flags.ram_board };
    return { skippy, sheriff, shack };
  });
  expect(loaded.skippy).toEqual({ ok: true, has: true, coins: 11 });
  expect(loaded.sheriff.ok).toBe(true);
  expect(loaded.sheriff.has).toBe(true);
  expect(loaded.sheriff.label).toBe('BOARD');
  expect(loaded.shack).toEqual({ ok: true, has: true, coins: 2, flag: true });

  await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'ros';
    S.G.state = 'play';
    S.G.paused = false;
    S.P.items.hopper = true;
    S.flag('hopper_got');
    S.flag('oe_ros_mesa');
    S.warp('ros_mesa', 14, 6, 3);
    S.P.boardId = 'hopper';
    S.P.x = 14 * 16 + 8;
    S.P.y = 6 * 16 + 8;
    S.P.dir = 3;
    S.P.roll = 0;
    S.P.rollCd = 0;
    S.P.hp = 6;
    for (let i = 0; i < 6; i++) { S.skipText(); S.step(1); }
  });
  await page.waitForTimeout(150);
  const before = await page.evaluate(() => __SQ.P.x);
  await press(page, 'KeyC');
  await page.waitForTimeout(200);
  const hopped = await page.evaluate(() => ({ x: __SQ.P.x, hp: __SQ.P.hp }));
  expect(hopped.x).toBeGreaterThan(before + 40);
  expect(hopped.hp).toBe(6);

  await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'ros';
    S.warp('cv1', 8, 4, 0);
    S.P.hp = 6;
    S.P.dir = 0;
    S.P.roll = 0;
    S.P.rollCd = 0;
    S.P.boardDash = 0;
    S.P.inv = 0;
    for (let i = 0; i < 4; i++) { S.skipText(); S.step(1); }
  });
  await page.waitForTimeout(150);
  await page.keyboard.down('KeyC');
  await page.waitForTimeout(500);
  await page.keyboard.up('KeyC');
  const floor = await page.evaluate(() => ({ y: Math.floor((__SQ.P.y - 1) / 16), hp: __SQ.P.hp }));
  expect(floor.y).toBeGreaterThan(6);
  expect(floor.hp).toBe(6);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone board buttons', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('each chapter shows ROLL only for early Skippy', async ({ page }) => {
    const errors = await bootLive(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    const shots = [
      ['skippy', 'desert', false, 'ROLL', 'phone-chapter-skippy.png'],
      ['skippy', 'home', true, 'BOARD', 'phone-chapter-skippy-board.png'],
      ['ros', 'ros_yard', true, 'BOARD', 'phone-chapter-ros.png'],
      ['ramshackle', 'ram_dock', true, 'BOARD', 'phone-chapter-ram.png'],
      ['drill', 'ds_camp', true, 'BOARD', 'phone-chapter-drill.png'],
    ];
    for (const [story, area, board, label, file] of shots) {
      await page.evaluate(({ story, area, board }) => {
        const S = __SQ;
        S.G.state = 'play';
        S.G.story = story;
        S.G.paused = false;
        S.flag('space_board', board && story === 'skippy');
        S.flag('board_got', board && story === 'skippy');
        S.P.items = board && story === 'skippy' ? { board: true, raygun: true } : { raygun: true };
        if (story === 'ros') S.P.items = { blasters: true };
        if (story === 'ramshackle') S.P.items = { hatchet: true };
        if (story === 'drill') S.P.items = { blast: true };
        S.flag('oe_' + area);
        S.flag('santt_met');
        S.flag('woke');
        S.warp(area, story === 'skippy' && area === 'desert' ? 16 : 6, story === 'skippy' && area === 'desert' ? 16 : 6, 3);
        for (let i = 0; i < 8; i++) { S.skipText(); S.step(1); }
        S.step(2);
      }, { story, area, board });
      for (let i = 0; i < 8; i++) {
        const mode = await page.evaluate(() => document.documentElement.dataset.touch);
        if (mode === 'play') break;
        await press(page, 'Space');
        await page.waitForTimeout(120);
      }
      await page.waitForTimeout(200);
      const face = await page.evaluate(() => {
        const shown = [...document.querySelectorAll('.srml-b')]
          .filter((el) => getComputedStyle(el).display !== 'none')
          .map((el) => (el.textContent || '').trim());
        return { shown, has: __SQ.board().has };
      });
      expect(face.has, story).toBe(board);
      expect(face.shown, story + ' ' + face.shown.join(',')).toContain(label);
      if (label === 'BOARD') expect(face.shown.join(' '), story).not.toMatch(/\bROLL\b/);
      await page.screenshot({ path: `${ART}/${file}` });
    }
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test('Cash court sits downstairs of the Pour, and the heavy case opens', async ({ page }) => {
  const errors = await bootLive(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('woke');
    S.flag('oe_home');
    S.warp('home', 9, 9, 0);
    for (let i = 0; i < 6; i++) { S.skipText(); S.step(1); }
  });
  await page.waitForTimeout(200);
  const house = await page.evaluate(() => ({
    name: __SQ.A.name,
    cash: __SQ.npcs.some((n) => n.id === 'wizard'),
    to: (__SQ.A.warps || []).map((w) => w.to),
    sign: (__SQ.A.signs || []).some((s) => /POUR/i.test(s.text)),
  }));
  expect(house.name).toBe("SKIPPY'S PLACE");
  expect(house.cash).toBe(false);
  expect(house.to).toContain('desert');
  expect(house.sign).toBe(true);
  await page.locator('#game').screenshot({ path: `${ART}/b29-house-exit.png` });

  await page.evaluate(() => {
    localStorage.setItem('sq_save_v1', JSON.stringify({
      z: 'bow', v: 1, area: 'nexus', x: 160, y: 96, dir: 0,
      hp: 6, maxHp: 6, pieces: 0, coins: 9, arrows: 0,
      items: { raygun: true }, keys: {}, bigKeys: {},
      flags: { woke: true, ch1_done: true }, party: [], shards: 1, time: 2,
      visited: { nexus: true }, pri: 'raygun', sec: '',
    }));
    __SQ.loadChapter('skippy');
    for (let i = 0; i < 6; i++) { __SQ.skipText(); __SQ.step(1); }
  });
  await page.waitForTimeout(250);
  const court = await page.evaluate(() => ({
    id: __SQ.A.id,
    name: __SQ.A.name,
    cash: __SQ.npcs.some((n) => n.id === 'wizard'),
    portals: (__SQ.A.props || []).filter((p) => p.k === 'portal').length,
    labels: (window.__SQ_LABELS || []).map((l) => l.text),
  }));
  expect(court.id).toBe('nexus');
  expect(court.name).toBe("CASH'S BASEMENT");
  expect(court.cash).toBe(true);
  expect(court.portals).toBeGreaterThanOrEqual(1);
  expect(court.labels.join(' ')).toContain('COSMOS');
  expect(court.labels.join(' ')).not.toContain('DESERT');
  expect(court.labels.join(' ')).not.toContain('CASH');
  await page.locator('#game').screenshot({ path: `${ART}/b29-cash-court.png` });

  await page.evaluate(() => {
    const S = __SQ;
    S.warp('saloon', 8, 6, 1);
    for (let i = 0; i < 4; i++) { S.skipText(); S.step(1); }
    S.P.items.raygun = true;
    S.P.melee = 'baton';
    S.P.pri = 'raygun';
    S.P.sec = 'raygun';
    S.P.tool = 'raygun';
    S.P.wep = 'baton';
    S.P.x = 8.5 * 16 + 8;
    S.P.y = 5.6 * 16;
    S.P.dir = 1;
    S.flag('court_box', false);
    S.flag('pour_box', false);
  });
  await page.waitForTimeout(100);
  await press(page, 'KeyZ');
  await page.waitForTimeout(400);
  const tough = await page.evaluate(() => ({
    open: !!__SQ.flags.court_box,
    toast: __SQ.toast().text,
  }));
  expect(tough.open).toBe(false);
  expect(tough.toast).toContain('HEAVY');
  await page.locator('#game').screenshot({ path: `${ART}/b29-case-before.png` });

  await page.evaluate(() => {
    const S = __SQ;
    S.P.items.heavy = true;
    S.flag('heavy_got');
    S.P.melee = 'baton';
    S.P.pri = 'raygun';
    S.P.sec = 'heavy';
    S.P.tool = 'heavy';
    S.P.wep = 'baton';
    S.P.x = 8.5 * 16 + 8;
    S.P.y = 5.6 * 16;
    S.P.dir = 1;
    S.P.cds = {};
  });
  await page.waitForTimeout(100);
  await press(page, 'KeyZ');
  await page.waitForTimeout(500);
  const broke = await page.evaluate(() => ({
    open: !!__SQ.flags.court_box,
    toast: __SQ.toast().text,
  }));
  expect(broke.open).toBe(true);
  await page.locator('#game').screenshot({ path: `${ART}/b29-case-after.png` });
  await page.evaluate(() => {
    const S = __SQ;
    S.P.x = 8.5 * 16;
    S.P.y = 5.4 * 16;
    S.P.dir = 1;
  });
  await page.waitForTimeout(200);
  await page.locator('#game').screenshot({ path: `${ART}/b30-stairs.png` });
  await page.evaluate(() => {
    const S = __SQ;
    S.P.x = 8.5 * 16;
    S.P.y = 4.4 * 16;
    S.P.dir = 1;
  });
  await page.waitForTimeout(900);
  const vault = await page.evaluate(() => __SQ.A.id);
  expect(vault).toBe('nexus');
  await page.locator('#game').screenshot({ path: `${ART}/b30-basement.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('rider chapters are offered inside Skippy and the desert stays spread out', async ({ page }) => {
  const errors = await bootLive(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('ch9_done');
    S.flag('oe_hi_life');
    S.warp('hi_life', 6, 6, 1);
    for (let i = 0; i < 6; i++) { S.skipText(); S.step(1); }
    const ros = S.npcs.find((n) => n.id === 'ros');
    if (ros) { S.P.x = ros.x; S.P.y = ros.y + 14; S.P.dir = 1; }
  });
  await page.waitForTimeout(200);
  await page.locator('#game').click();
  await press(page, 'KeyE');
  for (let i = 0; i < 8 && !(await page.evaluate(() => !!__SQ.G.choice)); i++) {
    await page.waitForTimeout(280);
    await press(page, 'Space');
  }
  await page.waitForFunction(() => !!__SQ.G.choice, null, { timeout: 5000 });
  await page.locator('#game').screenshot({ path: `${ART}/b29-ros-handoff.png` });
  await press(page, 'KeyX');
  for (let i = 0; i < 4 && (await page.evaluate(() => __SQ.G.state !== 'flash')); i++) {
    await page.waitForTimeout(250);
    await press(page, 'Space');
  }
  await page.waitForFunction(() => __SQ.G.state === 'flash', null, { timeout: 5000 });
  const handed = await page.evaluate(() => ({
    state: __SQ.G.state,
    choice: __SQ.G.choice && __SQ.G.choice.id,
    script: !!__SQ.script,
    dlg: !!__SQ.dlg,
    x: Math.round(__SQ.P.x),
    y: Math.round(__SQ.P.y),
  }));
  expect(handed.state, JSON.stringify(handed)).toBe('flash');

  const log = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.flag('ch5_done');
    S.flag('tale_ros');
    return S.riderLog().map((r) => r.text);
  });
  expect(log.join(' ')).toContain('ROS');
  expect(log.join(' ')).toContain('RAM');
  expect(log.join(' ')).toContain('DRILL');
  expect(log[0].startsWith('OK')).toBe(true);

  const spaced = await page.evaluate(() => {
    const S = __SQ;
    S.flag('santt_here');
    S.flag('macho_here');
    S.flag('tale_macho');
    S.flag('boss_d1');
    S.flag('oe_desert');
    S.warp('desert', 16, 16, 0);
    for (let i = 0; i < 4; i++) { S.skipText(); S.step(1); }
    const bodies = S.npcs.filter((n) => n.vis !== false).map((n) => ({ id: n.id, x: n.x, y: n.y }));
    const hits = [];
    for (let i = 0; i < bodies.length; i++) {
      for (let j = i + 1; j < bodies.length; j++) {
        const d = Math.hypot(bodies[i].x - bodies[j].x, bodies[i].y - bodies[j].y);
        if (d < 36) hits.push(bodies[i].id + ' / ' + bodies[j].id + ' ' + Math.round(d));
      }
      for (const w of S.A.warps || []) {
        const d = Math.hypot(bodies[i].x - (w.x + w.w / 2) * 16, bodies[i].y - (w.y + 0.5) * 16);
        if (d < 28) hits.push(bodies[i].id + ' / door ' + w.to);
      }
      for (const s of S.A.signs || []) {
        const d = Math.hypot(bodies[i].x - s.x * 16, bodies[i].y - s.y * 16);
        if (d < 24) hits.push(bodies[i].id + ' / sign');
      }
    }
    return { hits, n: bodies.length };
  });
  expect(spaced.n).toBeGreaterThan(3);
  expect(spaced.hits, spaced.hits.join(', ')).toEqual([]);
  await page.locator('#game').screenshot({ path: `${ART}/b29-desert-space.png` });

  for (const [area, file] of [
    ['ds_moonboss', 'b29-boss-revolt.png'],
    ['ds_marsboss', 'b29-boss-mars.png'],
    ['ds_candyboss', 'b29-boss-candy.png'],
    ['ds_plutoboss', 'b29-boss-pluto.png'],
    ['ram_eye', 'b29-boss-eye.png'],
  ]) {
    await page.evaluate((area) => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = area.startsWith('ds_') ? 'drill' : 'ramshackle';
      S.G.paused = false;
      S.P.hp = 10;
      S.P.maxHp = 10;
      if (S.G.story === 'drill') {
        S.P.items = { blast: true };
        S.P.pri = 'blast';
        S.P.wep = 'blast';
      } else {
        S.P.items = { axe: true, hatchet: true };
        S.P.pri = 'axe';
        S.P.wep = 'axe';
      }
      S.flag('oe_' + area);
      S.warp(area, 9, 8, 1);
      for (let i = 0; i < 4; i++) { S.skipText(); S.step(1); }
    }, area);
    await page.waitForFunction(() => __SQ.B && __SQ.B.state === 'fight', null, { timeout: 8000 });
    await page.waitForTimeout(200);
    await page.locator('#game').screenshot({ path: `${ART}/${file}` });
    if (area === 'ds_moonboss') {
      await page.evaluate(() => {
        const S = __SQ;
        S.P.x = S.B.x;
        S.P.y = S.B.y + 36;
        S.P.dir = 1;
        S.P.cds = {};
      });
      await page.locator('#game').click();
      await press(page, 'KeyX');
      await page.waitForTimeout(500);
      const hurt = await page.evaluate(() => __SQ.B.hp < __SQ.B.max);
      expect(hurt, area).toBe(true);
    }
  }
  expect(errors, errors.join('\n')).toEqual([]);
});

test('BOARD draws a space deck under the rider', async ({ page }) => {
  const errors = await bootLive(page);
  async function paint(story, area, tier, file, npc) {
    await page.evaluate(({ story, area, tier, npc }) => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = story;
      S.G.paused = false;
      S.flag('space_board');
      S.flag('oe_' + area);
      S.flag('woke');
      S.flag('santt_met');
      S.P.ownB = tier;
      S.P.gearB = tier;
      S.P.items = Object.assign({}, S.P.items, { board: true });
      S.P.boardDash = 0;
      S.P.roll = 0;
      S.warp(area, 12, 5, 3);
      for (let i = 0; i < 6; i++) { S.skipText(); S.step(1); }
      if (npc) {
        const who = S.npcs.find((n) => n.id === npc);
        if (who) { S.P.x = who.x - 28; S.P.y = who.y; }
      }
      S.step(2);
    }, { story, area, tier, npc });
    for (let i = 0; i < 6; i++) {
      if (!(await page.evaluate(() => !!(__SQ.script || __SQ.dlg)))) break;
      await press(page, 'Space');
    }
    await page.waitForTimeout(200);
    await page.locator('#game').screenshot({ path: `${ART}/${file}` });
  }
  await paint('skippy', 'desert', 1, 'b29-board-skippy.png');
  await page.locator('#game').click();
  await page.keyboard.down('KeyC');
  await page.waitForTimeout(80);
  const deck = await page.evaluate(() => {
    const S = __SQ;
    const cam = S.cam;
    const sx = Math.round(S.P.x - cam.x);
    const sy = Math.round(S.P.y - cam.y + 24);
    const ctx = document.getElementById('game').getContext('2d');
    const img = ctx.getImageData(Math.max(0, sx - 16), Math.max(0, sy - 8), 32, 16).data;
    let bright = 0;
    for (let i = 0; i < img.length; i += 4) {
      if (img[i] > 180 && img[i + 2] > 140) bright++;
    }
    return { bright, dash: S.P.boardDash || 0, sx, sy };
  });
  await page.keyboard.up('KeyC');
  expect(deck.dash, JSON.stringify(deck)).toBeGreaterThan(0);
  expect(deck.bright, JSON.stringify(deck)).toBeGreaterThan(8);
  await page.waitForTimeout(1600);
  for (const [dir, name] of [[0, 'down'], [1, 'up'], [2, 'left'], [3, 'right']]) {
    await page.evaluate((dir) => { __SQ.P.dir = dir; __SQ.P.boardDash = 1; }, dir);
    await page.waitForTimeout(80);
    await page.locator('#game').screenshot({ path: `${ART}/b29-board-${name}.png` });
  }
  await paint('ros', 'ros_yard', 1, 'b29-board-ros.png');
  await paint('ramshackle', 'ram_dock', 1, 'b29-board-ram.png');
  await paint('drill', 'ds_camp', 1, 'b29-board-drill.png');
  for (let tier = 1; tier <= 5; tier++) await paint('skippy', 'sky_city', tier, `b29-board-tier-${tier}.png`);
  await paint('skippy', 'sky_city', 2, 'b29-board-slide.png', 'slide');
  await paint('skippy', 'carnival', 1, 'b29-board-cavendish.png', 'cavendish');
  await paint('skippy', 'lane_sky', 3, 'b29-board-lane.png');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('the main road skips the tales, and gear, bosses, and labels stay honest', async ({ page }) => {
  const errors = await bootLive(page);
  const table = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = true;
    S.G.skipPage = 4;
    S.step(2);
    const rows = S.gearTable();
    const tales = rows.filter((r) => r.from === 'TALE').map((r) => r.id);
    return { n: rows.length, tales, heavy: rows.find((r) => r.id === 'heavy') };
  });
  expect(table.n).toBeGreaterThan(10);
  expect(table.tales).toEqual(expect.arrayContaining(['lasso', 'axe', 'heavy']));
  expect(table.heavy.opens).toContain('CASE');
  await page.locator('#game').screenshot({ path: `${ART}/b30-gear-table.png` });
  await page.evaluate(() => { __SQ.G.gearSel = 15; __SQ.step(1); });
  await page.locator('#game').screenshot({ path: `${ART}/b30-gear-rest.png` });

  const road = await page.evaluate(() => {
    const S = __SQ;
    S.G.paused = false;
    S.flag('tale_ros', false);
    S.flag('tale_ram', false);
    S.flag('tale_drill', false);
    S.flag('heavy_got', false);
    S.flag('pour_box', false);
    const areas = [];
    for (let chap = 1; chap <= 8; chap++) {
      S.G.chap = chap;
      S.nextRoad();
      areas.push(S.A.id);
    }
    S.warp('saloon', 8, 6, 1);
    const sealed = !(S.A.warps || []).some((w) => w.to === 'nexus' && !w.need);
    return { areas, sealed, basement: S.basement() };
  });
  expect(road.areas[0]).toBe('desert');
  expect(road.areas.slice(1)).toEqual(['hub', 'hub', 'hub', 'hub', 'hub', 'hub', 'hub']);
  expect(road.areas).not.toContain('village');
  expect(road.areas).not.toContain('nexus');
  expect(road.basement).toBe(false);
  expect(road.sealed).toBe(true);

  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'drill';
    S.P.items = { blast: true };
    S.P.melee = '';
    S.P.pri = 'blast';
    S.P.sec = 'blast';
    S.P.tool = 'blast';
    S.P.wep = '';
    S.P.hp = 12;
    S.P.maxHp = 12;
    S.flag('oe_ds_moonboss');
    S.warp('ds_moonboss', 9, 8, 1);
    for (let i = 0; i < 16; i++) {
      S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
      if (S.B && (S.B.state === 'fight' || S.B.state === 'intro')) break;
    }
    S.step(30);
  });
  await page.waitForFunction(() => __SQ.B && __SQ.B.state === 'fight', null, { timeout: 8000 });
  await page.locator('#game').click();
  for (let i = 0; i < 4; i++) {
    await press(page, 'KeyZ');
    await page.waitForTimeout(220);
    if (await page.evaluate(() => __SQ.B.hp < __SQ.B.max)) break;
  }
  const mid = await page.evaluate(() => ({ hp: __SQ.B.hp, max: __SQ.B.max }));
  expect(mid.hp).toBeLessThan(mid.max);
  expect(mid.hp).toBeGreaterThan(0);
  await page.locator('#game').screenshot({ path: `${ART}/b30-boss-bar.png` });

  await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'skippy';
    S.flag('oe_d1');
    S.warp('d1', 10, 8, 1);
    for (let i = 0; i < 4; i++) { S.skipText(); S.step(1); }
  });
  await page.waitForTimeout(300);
  await page.locator('#game').screenshot({ path: `${ART}/b30-no-labels.png` });

  await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'skippy';
    S.G.state = 'play';
    S.G.paused = false;
    S.flag('oe_desert');
    S.warp('desert', 16, 16, 3);
    for (let i = 0; i < 6; i++) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1); }
    S.P.items.disc = true;
    S.P.items.raygun = true;
    S.P.pri = 'raygun';
    S.P.wep = 'raygun';
    S.P.sec = 'disc';
    S.P.tool = 'disc';
    S.P.arrowCd = 0;
    S.P.dir = 3;
    S.shots.length = 0;
  });
  await page.locator('#game').click();
  await press(page, 'KeyZ');
  await page.waitForTimeout(60);
  const disc = await page.evaluate(() => ({
    shot: __SQ.shots.some((s) => s.kind === 'disc'),
    slots: __SQ.slots(),
    n: __SQ.shots.length,
  }));
  expect(disc.shot, JSON.stringify(disc)).toBe(true);
  await page.locator('#game').screenshot({ path: `${ART}/b30-disc.png` });
  expect(errors, errors.join('\n')).toEqual([]);
});

test('each new piece does the job the table names', async ({ page }) => {
  const errors = await bootLive(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.flag('oe_d1');
    S.flag('santt_met');
    S.warp('d1', 4, 6, 3);
    for (let i = 0; i < 8; i++) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1); }
    S.step(8);
  });
  const sword = await page.evaluate(() => {
    const S = __SQ;
    const foe = S.ents.find((e) => e.k === 'vov' && !e.dead);
    if (!foe) return { missing: true };
    S.P.x = foe.x - 18;
    S.P.y = foe.y;
    S.P.dir = 3;
    S.P.items.sword = true;
    S.P.pri = 'sword';
    S.P.wep = 'sword';
    S.P.arrowCd = 0;
    S.P.atk = 0;
    return { hp: foe.hp, x: foe.x, y: foe.y };
  });
  expect(sword.missing).toBeFalsy();
  await page.locator('#game').click();
  await press(page, 'KeyX');
  await page.waitForTimeout(220);
  const afterSword = await page.evaluate(() => {
    const foe = __SQ.ents.find((e) => e.k === 'vov');
    return { hp: foe.hp, dead: !!foe.dead };
  });
  expect(afterSword.hp).toBe(sword.hp - 2);

  const plasma = await page.evaluate(() => {
    const S = __SQ;
    const foe = S.ents.find((e) => e.k === 'vov');
    if (!foe) return { missing: true };
    foe.dead = false;
    foe.hp = 6;
    S.P.x = foe.x - 18;
    S.P.y = foe.y;
    S.P.dir = 3;
    S.P.items.plasma = true;
    S.P.pri = 'plasma';
    S.P.wep = 'plasma';
    S.P.arrowCd = 0;
    S.P.atk = 0;
    S.P.cds = {};
    return { hp: foe.hp };
  });
  expect(plasma.missing).toBeFalsy();
  await press(page, 'KeyX');
  await page.waitForTimeout(220);
  await page.locator('#game').screenshot({ path: `${ART}/b30-plasma.png` });
  const afterPlasma = await page.evaluate(() => {
    const foe = __SQ.ents.find((e) => e.k === 'vov');
    return { hp: foe ? foe.hp : -1, dead: !!(foe && foe.dead) };
  });
  expect(afterPlasma.hp).toBe(3);

  await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_desert');
    S.flag('santt_met');
    S.warp('desert', 20, 20, 3);
    for (let i = 0; i < 6; i++) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1); }
    S.P.items.disc = true;
    S.P.sec = 'disc';
    S.P.tool = 'disc';
    S.P.arrowCd = 0;
    S.shots.length = 0;
    S.P.dir = 3;
  });
  await press(page, 'KeyZ');
  await page.waitForTimeout(500);
  const back = await page.evaluate(() => {
    const shot = __SQ.shots.find((s) => s.kind === 'disc');
    return { gone: !shot, back: !!(shot && shot.back), t: shot ? shot.t : 0 };
  });
  expect(back.gone || back.back).toBe(true);

  const suit = await page.evaluate(() => {
    const S = __SQ;
    S.warp('desert', 40, 20, 3);
    for (let i = 0; i < 60 && (S.script || S.dlg); i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(2);
    }
    S.G.paused = false;
    S.P.hp = 8;
    S.P.maxHp = 8;
    S.P.inv = 0;
    S.P.god = false;
    S.P.ward = 0;
    S.P.ember = 0;
    S.P.shield = 0;
    S.P.gearA = 1;
    S.P.items.suit = false;
    S.hurt(2);
    const bare = S.P.hp;
    S.P.hp = 8;
    S.P.inv = 0;
    S.P.items.suit = true;
    S.hurt(2);
    return { bare, suited: S.P.hp, state: S.G.state, dlg: !!S.dlg, script: !!S.script, paused: !!S.G.paused, shop: !!S.shop, pop: !!S.getPop };
  });
  expect(suit.bare, JSON.stringify(suit)).toBe(6);
  expect(suit.suited).toBe(7);

  await page.evaluate(() => {
    const S = __SQ;
    S.P.items.shield = true;
    S.P.items.plate = true;
    S.P.sec = 'shield';
    S.P.tool = 'shield';
    S.P.cds = {};
    S.P.shield = 0;
  });
  await press(page, 'KeyZ');
  await page.waitForTimeout(80);
  const plate = await page.evaluate(() => __SQ.P.shield || 0);
  expect(plate).toBeGreaterThan(2);

  const latch = await page.evaluate(() => {
    const S = __SQ;
    S.warp('desert', 6, 16, 1);
    for (let i = 0; i < 4; i++) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); S.step(1); }
    S.P.x = 6 * 16 + 8;
    S.P.y = 16 * 16 + 8;
    S.P.items.lasso = false;
    S.P.items.gloves = false;
    S.flag('tale_ros', false);
    S.flag('latch_desert', false);
    return true;
  });
  expect(latch).toBe(true);
  await press(page, 'Space');
  await page.waitForTimeout(80);
  const shut = await page.evaluate(() => !!__SQ.flags.latch_desert);
  expect(shut).toBe(false);
  await page.evaluate(() => { __SQ.P.items.lasso = true; });
  await press(page, 'Space');
  await page.waitForTimeout(80);
  const opened = await page.evaluate(() => ({
    latch: !!__SQ.flags.latch_desert,
    boots: !!__SQ.P.items.boots,
  }));
  expect(opened.latch).toBe(true);
  expect(opened.boots).toBe(true);

  const stride = await page.evaluate(() => {
    const S = __SQ;
    S.warp('desert', 40, 20, 3);
    for (let i = 0; i < 4; i++) { S.skipText(); S.step(1); }
    S.P.items.board = false;
    S.P.items.boots = false;
    S.flag('space_board', false);
    S.flag('board_got', false);
    S.P.x = 40 * 16;
    S.P.y = 20 * 16;
    return S.P.x;
  });
  await hold(page, 'ArrowRight', 700);
  const slow = await page.evaluate(() => __SQ.P.x);
  await page.evaluate((x) => { __SQ.P.items.boots = true; __SQ.P.x = x; }, stride);
  await hold(page, 'ArrowRight', 700);
  const fast = await page.evaluate(() => __SQ.P.x);
  expect(fast - stride).toBeGreaterThan(slow - stride + 6);

  await page.evaluate(() => {
    const S = __SQ;
    S.G.trans = null;
    S.flag('oe_seaport');
    S.warp('seaport', 8, 8, 1);
    for (let i = 0; i < 20 && (S.script || S.dlg || S.G.trans); i++) {
      if (S.dlg) { S.skipText(); S.press('talk', true); S.step(1); S.press('talk', false); }
      S.step(2);
    }
    S.P.x = 8 * 16 + 8;
    S.P.y = 8 * 16 + 8;
    S.P.items.axe = true;
    S.flag('vine_sea', false);
    S.P.items.gloves = false;
  });
  await press(page, 'Space');
  await page.waitForTimeout(80);
  const vine = await page.evaluate(() => ({
    cut: !!__SQ.flags.vine_sea,
    gloves: !!__SQ.P.items.gloves,
    area: __SQ.A.id,
    x: __SQ.P.x,
    y: __SQ.P.y,
    script: !!__SQ.script,
    dlg: !!__SQ.dlg,
  }));
  expect(vine.cut, JSON.stringify(vine)).toBe(true);
  expect(vine.gloves).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});
