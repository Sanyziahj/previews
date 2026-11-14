import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts';
const GAME = '/skippys-quest/index.html';
const CALL = 'RIDER! OVER HERE. I GOT A STORY FOR YOU.';
const OBJECTIVE = 'MOON COLONY: DRILL HAS A TALE';
fs.mkdirSync(ART, { recursive: true });

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.addInitScript(() => { window.__SQ_DEBUG = true; });
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ);
  await page.evaluate(() => { __SQ.setManual(true); __SQ.step(4); });
  await page.locator('#game').focus();
  return errors;
}

function shot(page, name) {
  return page.locator('#game').screenshot({ path: `${ART}/${name}.png` });
}

async function advanceLines(page, n = 8) {
  for (let i = 0; i < n; i++) {
    const open = await page.evaluate(() => {
      const S = __SQ;
      if (S.G.choice) return 'choice';
      if (S.getPop) {
        S.step(40);
        S.press('talk', true);
        S.step(2);
        S.press('talk', false);
        S.step(2);
        return S.G.choice ? 'choice' : 'open';
      }
      if (S.script && !S.dlg) {
        S.step(45);
        return S.G.choice ? 'choice' : (S.script || S.dlg ? 'open' : 'clear');
      }
      if (!(S.script || S.dlg)) return 'clear';
      S.skipText();
      S.press('talk', true);
      S.step(1);
      S.press('talk', false);
      S.step(2);
      return S.G.choice ? 'choice' : (S.script || S.dlg || S.getPop ? 'open' : 'clear');
    });
    if (open !== 'open') return open;
  }
  return 'stuck';
}

async function talk(page) {
  await page.evaluate(() => {
    const S = __SQ;
    S.press('talk', true);
    S.step(2);
    S.press('talk', false);
    S.step(2);
  });
}

test('build is b45', async ({ page }) => {
  const errors = await boot(page);
  const cache = await page.evaluate(() => document.querySelector('script').textContent);
  expect(cache).toContain('window.__SQ_BUILD="b45"');
  expect(cache).toContain('v=b45');
  expect(await page.evaluate(() => __SQ.build())).toBe('b45');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('Drill follows during chapter 5 and leaves when the colony is free', async ({ page }) => {
  const errors = await boot(page);
  const during = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('woke');
    S.flag('drill_joined');
    S.flag('oe_st1');
    S.P.items.armor = true;
    S.P.items.missile = true;
    S.P.coins = 15;
    S.party.push('drill');
    S.warp('st1', 9.5, 6, 0);
    S.step(2);
    const drills = S.npcs.filter((n) => n.id === 'drill_teller' && n.vis !== false);
    return {
      party: S.party.slice(),
      follow: !!(S.comp.on && S.comp.id === 'drill'),
      hail: S.G.hail,
      teller: drills.length,
      area: S.A.id,
    };
  });
  expect(during.area).toBe('st1');
  expect(during.party).toContain('drill');
  expect(during.follow).toBe(true);
  expect(during.hail).toBe('');
  expect(during.teller).toBe(0);

  const left = await page.evaluate(() => {
    const S = __SQ;
    S.flag('ch5_done');
    S.step(2);
    S.save();
    const save = JSON.parse(localStorage.getItem('sq_save_v1'));
    return {
      party: S.party.slice(),
      saved: (save.party || []).slice(),
      follow: !!S.comp.on,
      area: S.A.id,
      coins: save.coins,
      armor: !!save.items.armor,
      missile: !!save.items.missile,
      x: S.P.x,
      y: S.P.y,
    };
  });
  expect(left.party).not.toContain('drill');
  expect(left.saved).not.toContain('drill');
  expect(left.follow).toBe(false);
  expect(left.area).toBe('st1');
  expect(left.coins).toBe(15);
  expect(left.armor).toBe(true);
  expect(left.missile).toBe(true);
  expect(left.x).toBeGreaterThan(140);
  expect(left.y).toBeGreaterThan(80);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('Drill calls once on arrival and the tale is still a choice', async ({ page }) => {
  test.setTimeout(120000);
  const errors = await boot(page);
  const arrived = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('woke');
    S.flag('oe_moon');
    S.flag('drill_joined');
    S.flag('ch5_done');
    S.flag('tale_ros');
    S.flag('tale_ram');
    S.flag('moon_clear');
    S.party.push('blaze', 'drill');
    S.P.coins = 21;
    S.warp('moon', 8, 7, 2);
    S.ents.forEach((e) => { e.stun = 99; e.vx = 0; e.vy = 0; });
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.G.toastT = 0;
    S.step(2);
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.G.toastT = 0;
    S.step(1);
    return {
      area: S.A.id,
      name: S.A.name,
      x: S.P.x,
      y: S.P.y,
      hail: S.G.hail,
      hailT: S.G.hailT,
      live: document.getElementById('sr-live').textContent || '',
      objective: S.objective(),
      choice: !!S.G.choice,
      script: !!S.script,
      dlg: !!S.dlg,
      party: S.party.slice(),
      follow: !!S.comp.on,
      drills: S.npcs.filter((n) => (n.id === 'drill' || n.id === 'drill_teller' || n.look === 'drill') && n.vis !== false && n.alpha !== 0).map((n) => n.id),
      coins: S.P.coins,
    };
  });
  expect(arrived.area).toBe('moon');
  expect(arrived.name).toBe('MOON COLONY 7');
  expect(arrived.x).toBeGreaterThan(120);
  expect(arrived.x).toBeLessThan(160);
  expect(arrived.y).toBeGreaterThan(100);
  expect(arrived.y).toBeLessThan(140);
  expect(arrived.hail).toBe(CALL);
  expect(arrived.hailT).toBeGreaterThan(5);
  expect(arrived.live).toContain(CALL);
  expect(arrived.objective).toBe(OBJECTIVE);
  expect(arrived.live).toContain(OBJECTIVE);
  expect(arrived.choice).toBe(false);
  expect(arrived.script).toBe(false);
  expect(arrived.dlg).toBe(false);
  expect(arrived.party).toEqual(['blaze']);
  expect(arrived.follow).toBe(false);
  expect(arrived.drills).toEqual(['drill_teller']);
  expect(arrived.coins).toBe(21);
  await shot(page, 'b43-drill-nudge');

  const quiet = await page.evaluate(() => {
    const S = __SQ;
    S.step(420);
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.G.toastT = 0;
    S.ents.forEach((e) => { e.stun = 99; e.vx = 0; e.vy = 0; });
    S.step(1);
    return {
      hailT: S.G.hailT,
      objective: S.objective(),
      drills: S.npcs.filter((n) => (n.id === 'drill' || n.id === 'drill_teller' || n.look === 'drill') && n.vis !== false && n.alpha !== 0).map((n) => n.id),
      follow: !!S.comp.on,
      area: S.A.id,
      choice: !!S.G.choice,
    };
  });
  expect(quiet.hailT).toBeLessThanOrEqual(0);
  expect(quiet.objective).toBe(OBJECTIVE);
  expect(quiet.drills).toEqual(['drill_teller']);
  expect(quiet.follow).toBe(false);
  expect(quiet.area).toBe('moon');
  expect(quiet.choice).toBe(false);
  await shot(page, 'b43-drill-lone');

  await page.evaluate(() => {
    const S = __SQ;
    S.P.x = (5 + 0.5) * 16;
    S.P.y = (8 + 0.5) * 16;
    S.P.dir = 1;
    S.step(1);
  });
  await talk(page);
  expect(await advanceLines(page, 8)).toBe('choice');
  const choice = await page.evaluate(() => document.getElementById('sr-live').textContent || '');
  expect(choice).toContain('SIT FOR THE MEMORY');
  expect(choice).toContain('NOT YET');
  expect(await page.evaluate(() => __SQ.story())).toBe('skippy');
  await shot(page, 'b43-drill-tale-choice');

  await page.evaluate(() => {
    const S = __SQ;
    S.press('back', true);
    S.step(2);
    S.press('back', false);
    S.step(4);
  });
  expect(await advanceLines(page, 6)).toBe('clear');
  expect(await page.evaluate(() => !!__SQ.flags.tale_drill)).toBe(false);

  const again = await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_hub');
    S.warp('hub', 10, 5, 0);
    S.step(2);
    const away = S.G.hail;
    S.flag('oe_moon');
    S.warp('moon', 8, 7, 2);
    S.G.bannerT = 0;
    S.G.toastT = 0;
    S.step(2);
    const back = {
      away,
      hail: S.G.hail,
      hailed: !!S.flags.drill_hail,
      objective: S.objective(),
      choice: !!S.G.choice,
      script: !!S.script,
      area: S.A.id,
      x: S.P.x,
    };
    S.flag('drill_hail', false);
    S.flag('tale_drill');
    S.warp('moon', 8, 6, 1);
    S.step(2);
    back.after = S.G.hail;
    back.obj = S.objective();
    back.joined = S.party.slice();
    return back;
  });
  expect(again.away).toBe('');
  expect(again.hail).toBe('');
  expect(again.hailed).toBe(true);
  expect(again.objective).toBe(OBJECTIVE);
  expect(again.choice).toBe(false);
  expect(again.script).toBe(false);
  expect(again.area).toBe('moon');
  expect(again.x).toBeGreaterThan(120);
  expect(again.after).toBe('');
  expect(again.obj).toBe('');
  expect(again.joined).not.toContain('drill');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('stuck saves drop Drill and keep the rest of the ride', async ({ page }) => {
  const errors = await boot(page);
  const repaired = await page.evaluate(() => {
    localStorage.setItem('sq_save_v1', JSON.stringify({
      z: 'bow', v: 1, area: 'moon', x: (28.5 + 0.5) * 16, y: (8.6 + 0.5) * 16, dir: 2,
      hp: 4, maxHp: 6, pieces: 1, coins: 77, arrows: 3,
      items: { raygun: true, armor: true, missile: true },
      keys: { station: 1 }, bigKeys: { station: true },
      flags: {
        woke: true, oe_moon: true, drill_joined: true, ch5_done: true,
        tale_ros: true, tale_ram: true, moon_clear: true,
      },
      party: ['blaze', 'drill'],
      shards: 5, time: 900, visited: { moon: true, hub: true },
      pri: 'raygun', sec: 'missile',
    }));
    const S = __SQ;
    S.G.story = 'skippy';
    S.G.state = 'play';
    const ok = S.load();
    S.G.bannerT = 0;
    S.G.toastT = 0;
    S.step(2);
    const written = JSON.parse(localStorage.getItem('sq_save_v1'));
    return {
      ok,
      area: S.A.id,
      x: S.P.x,
      y: S.P.y,
      coins: S.P.coins,
      arrows: S.P.arrows,
      pieces: S.P.pieces,
      maxHp: S.P.maxHp,
      armor: !!S.P.items.armor,
      missile: !!S.P.items.missile,
      raygun: !!S.P.items.raygun,
      party: S.party.slice(),
      follow: !!S.comp.on,
      hail: S.G.hail,
      objective: S.objective(),
      choice: !!S.G.choice,
      script: !!S.script,
      savedParty: written.party,
      savedCoins: written.coins,
      keys: written.keys,
      big: !!written.bigKeys.station,
      shards: written.shards,
      drills: S.npcs.filter((n) => (n.id === 'drill' || n.id === 'drill_teller') && n.vis !== false && n.alpha !== 0).map((n) => n.id),
    };
  });
  expect(repaired.ok).toBe(true);
  expect(repaired.area).toBe('moon');
  expect(repaired.x).toBeGreaterThan(400);
  expect(repaired.y).toBeGreaterThan(120);
  expect(repaired.y).toBeLessThan(180);
  expect(repaired.party).toEqual(['blaze']);
  expect(repaired.savedParty).toEqual(['blaze']);
  expect(repaired.follow).toBe(false);
  expect(repaired.hail).toBe(CALL);
  expect(repaired.objective).toBe(OBJECTIVE);
  expect(repaired.choice).toBe(false);
  expect(repaired.script).toBe(false);
  expect(repaired.coins).toBe(77);
  expect(repaired.savedCoins).toBe(77);
  expect(repaired.arrows).toBe(3);
  expect(repaired.pieces).toBe(1);
  expect(repaired.maxHp).toBe(6);
  expect(repaired.armor).toBe(true);
  expect(repaired.missile).toBe(true);
  expect(repaired.raygun).toBe(true);
  expect(repaired.keys.station).toBe(1);
  expect(repaired.big).toBe(true);
  expect(repaired.shards).toBe(5);
  expect(repaired.drills).toEqual(['drill_teller']);

  const bare = await page.evaluate(() => {
    localStorage.setItem('sq_save_v1', JSON.stringify({
      v: 1, area: 'home', x: 160, y: 160, dir: 0,
      hp: 6, maxHp: 6, coins: 3,
      items: { bow: true }, keys: {}, bigKeys: {},
      flags: { woke: true, ch5_done: true, oe_home: true },
      visited: { home: true },
    }));
    const S = __SQ;
    S.G.story = 'skippy';
    let threw = '';
    let ok = false;
    try { ok = !!S.load(); } catch (e) { threw = String(e && e.message ? e.message : e); }
    S.step(2);
    return {
      ok, threw, area: S.A.id, party: S.party.slice(), coins: S.P.coins,
      bow: !!S.P.items.bow, hail: S.G.hail, follow: !!S.comp.on,
    };
  });
  expect(bare.threw).toBe('');
  expect(bare.ok).toBe(true);
  expect(bare.area).toBe('home');
  expect(bare.party).toEqual([]);
  expect(bare.coins).toBe(3);
  expect(bare.bow).toBe(true);
  expect(bare.hail).toBe('');
  expect(bare.follow).toBe(false);

  const unstuck = await page.evaluate(() => {
    localStorage.setItem('sq_save_v1', JSON.stringify({
      v: 1, area: 'st4', x: (9.5 + 0.5) * 16, y: (10.2 + 0.5) * 16, dir: 1,
      hp: 6, maxHp: 6, coins: 9,
      items: { armor: true, missile: true }, keys: {}, bigKeys: {},
      flags: { woke: true, ch5_done: true, drill_joined: false, oe_st4: true, tale_ros: true, tale_ram: true },
      party: ['drill'],
      visited: { st4: true },
    }));
    const S = __SQ;
    S.G.story = 'skippy';
    S.load();
    S.step(2);
    const station = { area: S.A.id, party: S.party.slice(), hail: S.G.hail, coins: S.P.coins };
    localStorage.setItem('sq_save_v1', JSON.stringify({
      v: 1, area: 'moon', x: (5 + 0.5) * 16, y: (7 + 0.5) * 16, dir: 0,
      hp: 6, maxHp: 6, coins: 9,
      items: { armor: true }, keys: {}, bigKeys: {},
      flags: { woke: true, ch5_done: true, oe_moon: true, tale_ros: true, tale_ram: true },
      party: ['drill'],
      visited: { moon: true },
    }));
    S.G.story = 'skippy';
    S.load();
    S.step(3);
    const tile = S.tile(Math.floor(S.P.x / 16), Math.floor((S.P.y - 2) / 16));
    return {
      station,
      area: S.A.id,
      tile,
      party: S.party.slice(),
      coins: S.P.coins,
      drills: S.npcs.filter((n) => (n.id === 'drill' || n.id === 'drill_teller') && n.vis !== false && n.alpha !== 0).map((n) => n.id),
      follow: !!S.comp.on,
    };
  });
  expect(unstuck.station.area).toBe('st4');
  expect(unstuck.station.party).toEqual([]);
  expect(unstuck.station.hail).toBe('');
  expect(unstuck.station.coins).toBe(9);
  expect(unstuck.area).toBe('moon');
  expect(unstuck.party).toEqual([]);
  expect(unstuck.follow).toBe(false);
  expect(unstuck.coins).toBe(9);
  expect(unstuck.drills).toEqual(['drill_teller']);
  expect('#Tov'.includes(unstuck.tile)).toBe(false);
  expect(errors, errors.join('\n')).toEqual([]);
});
