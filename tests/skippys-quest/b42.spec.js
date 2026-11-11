import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts';
const GAME = '/skippys-quest/index.html';
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

test('build is b42', async ({ page }) => {
  const errors = await boot(page);
  const cache = await page.evaluate(() => document.querySelector('script').textContent);
  expect(cache).toContain('window.__SQ_BUILD="b42"');
  expect(cache).toContain('v=b42');
  expect(await page.evaluate(() => __SQ.build())).toBe('b42');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('before Chapter 5 the moon tale is absent and Drill still joins', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('woke');
    S.flag('oe_moon');
    S.warp('moon', 8.5, 9.2, 1);
    S.step(4);
  });
  const posted = await page.evaluate(() => {
    const S = __SQ;
    const vis = (id) => S.npcs.some((n) => n.id === id && n.vis !== false && n.alpha !== 0);
    return { teller: vis('drill_teller'), drill: vis('drill'), area: S.A.id };
  });
  expect(posted.area).toBe('moon');
  expect(posted.teller).toBe(false);
  expect(posted.drill).toBe(true);
  await talk(page);
  const meet = await page.evaluate(() => ({
    choice: !!__SQ.G.choice,
    text: __SQ.dlg ? __SQ.dlg.raw : '',
  }));
  expect(meet.choice).toBe(false);
  expect(meet.text).toContain('BOOT CAMP');
  expect(await advanceLines(page, 8)).toBe('clear');
  await page.evaluate(() => { __SQ.flag('moon_clear'); });
  await talk(page);
  expect(await advanceLines(page, 16)).toBe('clear');
  const joined = await page.evaluate(() => {
    const S = __SQ;
    S.warp('moon', 5, 8, 1);
    S.step(3);
    const vis = (id) => S.npcs.some((n) => n.id === id && n.vis !== false && n.alpha !== 0);
    return {
      joined: !!S.flags.drill_joined,
      armor: !!S.P.items.armor,
      missile: !!S.P.items.missile,
      party: S.party.includes('drill'),
      teller: vis('drill_teller'),
      drill: vis('drill'),
      choice: !!S.G.choice,
    };
  });
  expect(joined.joined, JSON.stringify(joined)).toBe(true);
  expect(joined.armor).toBe(true);
  expect(joined.missile).toBe(true);
  expect(joined.party).toBe(true);
  expect(joined.teller).toBe(false);
  expect(joined.drill).toBe(false);
  expect(joined.choice).toBe(false);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('after Chapter 5 Drill at the colony starts the tale and sends Skippy home with the blaster', async ({ page }) => {
  test.setTimeout(120000);
  const errors = await boot(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('woke');
    S.flag('oe_ac_camp');
    S.warp('ac_camp', 4.2, 8, 2);
    S.step(3);
  });
  await talk(page);
  expect(await advanceLines(page, 8)).toBe('choice');
  const academy = await page.evaluate(() => (document.getElementById('sr-live').textContent || ''));
  expect(academy).toContain('SIT FOR THE MEMORY');
  await page.evaluate(() => { __SQ.press('back', true); __SQ.step(2); __SQ.press('back', false); __SQ.step(4); });
  await advanceLines(page, 4);
  expect(await page.evaluate(() => !!__SQ.flags.tale_drill)).toBe(false);

  await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_moon');
    S.flag('drill_joined');
    S.flag('ch5_done');
    S.flag('tale_ros');
    S.flag('tale_ram');
    S.party.push('drill');
    S.warp('moon', 5, 8, 1);
    S.G.bannerT = 2.2;
    S.step(4);
  });
  const hook = await page.evaluate(() => {
    const S = __SQ;
    const teller = S.npcs.find((n) => n.id === 'drill_teller');
    const log = S.riderLog().find((row) => row.id === 'drill');
    return {
      area: S.A.name,
      teller: !!(teller && teller.vis !== false),
      objective: S.objective(),
      log: log ? log.text : '',
    };
  });
  expect(hook.area).toBe('MOON COLONY 7');
  expect(hook.teller).toBe(true);
  expect(hook.objective).toContain('MOON COLONY');
  expect(hook.objective).not.toContain('ACADEMY');
  expect(hook.log).toContain('MOON COLONY');
  expect(hook.log).not.toContain('ACADEMY');
  await shot(page, 'drill_moon_colony');
  await talk(page);
  expect(await advanceLines(page, 8)).toBe('choice');
  const choice = await page.evaluate(() => document.getElementById('sr-live').textContent || '');
  expect(choice).toContain('SIT FOR THE MEMORY');
  expect(choice).toContain('NOT YET');
  await shot(page, 'drill_moon_tale_choice');
  await talk(page);
  await advanceLines(page, 6);
  await page.evaluate(() => {
    const S = __SQ;
    if (S.G.state === 'flash') {
      S.step(40);
      S.press('talk', true);
      S.step(2);
      S.press('talk', false);
      S.step(10);
    }
    S.step(8);
  });
  const started = await page.evaluate(() => ({
    story: __SQ.story(),
    area: __SQ.A.id,
    name: __SQ.A.name,
    blast: !!__SQ.P.items.blast,
    text: __SQ.dlg ? __SQ.dlg.raw : '',
  }));
  expect(started.story).toBe('drill');
  expect(started.area).toBe('ds_camp');
  expect(started.name).toBe('BASIC TRAINING');
  expect(started.blast).toBe(true);
  expect(started.text).toContain('BASIC TRAINING');
  await shot(page, 'drill_tale_start');

  expect(await advanceLines(page, 8)).toBe('clear');
  await page.evaluate(() => {
    localStorage.setItem('sq_save_v1', JSON.stringify({
      z: 'bow', v: 1, area: 'moon', x: 88, y: 136, dir: 1,
      hp: 6, maxHp: 6, pieces: 0, coins: 42, arrows: 0,
      items: { raygun: true, armor: true, missile: true },
      keys: {}, bigKeys: {},
      flags: { woke: true, oe_moon: true, drill_joined: true, ch5_done: true, tale_ros: true, tale_ram: true },
      party: ['drill'], shards: 5, time: 400, visited: { moon: true },
      pri: 'raygun', sec: '',
    }));
    const S = __SQ;
    S.flag('oe_ds_elite');
    S.flag('ds_ready');
    S.warp('ds_elite', 9, 5.15, 1);
    for (let i = 0; i < 50 && S.story() === 'drill'; i++) S.step(1);
    for (let i = 0; i < 30 && S.G.trans; i++) S.step(1);
    for (let i = 0; i < 220 && S.getPop; i++) S.step(1);
  });
  let blasterLine = '';
  for (let i = 0; i < 8; i++) {
    blasterLine = await page.evaluate(() => (__SQ.dlg ? __SQ.dlg.raw : ''));
    if (blasterLine.includes('HEAVY LASER BLASTER')) break;
    await advanceLines(page, 1);
  }
  const home = await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('sq_save_v1'));
    return {
      story: __SQ.story(),
      area: __SQ.A.id,
      name: __SQ.A.name,
      heavy: !!__SQ.P.items.heavy,
      saved: !!(save.items && save.items.heavy),
      tale: !!(save.flags && save.flags.tale_drill),
      coins: save.coins,
      drill: JSON.parse(localStorage.getItem('sq_save_ds_v1')).flags.ds_home_end,
      basement: __SQ.basement(),
      x: __SQ.P.x,
      y: __SQ.P.y,
      text: __SQ.dlg ? __SQ.dlg.raw : '',
    };
  });
  expect(home.story).toBe('skippy');
  expect(home.area).toBe('moon');
  expect(home.name).toBe('MOON COLONY 7');
  expect(home.heavy).toBe(true);
  expect(home.saved).toBe(true);
  expect(home.tale).toBe(true);
  expect(home.coins).toBe(42);
  expect(home.drill).toBe(true);
  expect(home.basement).toBe(false);
  expect(home.x).toBeGreaterThan(70);
  expect(home.x).toBeLessThan(110);
  expect(home.text).toContain('HEAVY LASER BLASTER');
  await page.evaluate(() => { __SQ.skipText(); __SQ.step(2); });
  await shot(page, 'skippy_moon_blaster');

  await advanceLines(page, 6);
  const stairs = await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_saloon');
    S.warp('saloon', 8.5, 5.2, 1);
    S.step(2);
    S.P.items.raygun = true;
    S.P.items.heavy = true;
    S.P.pri = 'raygun';
    S.P.sec = 'raygun';
    S.P.cds = {};
    S.press('attack', true);
    S.step(8);
    S.press('attack', false);
    S.step(8);
    const ray = !!S.flags.pour_box;
    S.P.sec = 'heavy';
    S.P.cds = {};
    S.press('item', true);
    S.step(12);
    S.press('item', false);
    S.step(8);
    const opened = !!S.flags.pour_box;
    S.P.x = 8.5 * 16 + 8;
    S.P.y = 4.4 * 16;
    for (let i = 0; i < 20 && S.A.id === 'saloon'; i++) S.step(1);
    return { ray, opened, basement: S.basement(), area: S.A.id };
  });
  expect(stairs.ray).toBe(false);
  expect(stairs.opened).toBe(true);
  expect(stairs.basement).toBe(true);
  expect(stairs.area).toBe('nexus');

  expect(await advanceLines(page, 8)).toBe('clear');
  await page.evaluate(() => {
    const S = __SQ;
    S.flag('tale_drill');
    S.flag('oe_ac_camp');
    S.warp('ac_camp', 4.2, 8, 2);
    S.step(3);
  });
  await talk(page);
  const after = await page.evaluate(() => ({
    choice: !!__SQ.G.choice,
    text: __SQ.dlg ? __SQ.dlg.raw : '',
  }));
  expect(after.choice).toBe(false);
  expect(after.text).toContain('BLASTER');

  const road = await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_hub');
    S.warp('hub', 10, 5, 0);
    S.step(2);
    return (S.A.props || []).filter((p) => p.k === 'portal').map((p) => p.label + ':' + (p.need || ''));
  });
  expect(road.join(' ')).toContain('ORBIT:ch5_done');
  const listed = await page.evaluate(() => __SQ.chapters().find((c) => c.id === 'drill'));
  expect(listed.open).toBe(true);
  expect(listed.status).toBe('COMPLETE');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('rider chapters stay locked until the tale is done, then replay from the list', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => {
    localStorage.clear();
    localStorage.setItem('sq_save_v1', JSON.stringify({
      v: 1, area: 'home', x: 160, y: 160, dir: 0, hp: 6, maxHp: 6,
      items: {}, keys: {}, bigKeys: {}, party: [], visited: { home: true },
      flags: { woke: true, ch2_done: true, ch3_done: true, ch5_done: true },
    }));
    const S = __SQ;
    S.G.state = 'stories';
    S.G.menu = 1;
    S.G.st = 1;
    S.step(2);
  });
  await page.waitForTimeout(200);
  const locked = await page.evaluate(() => {
    const rows = Object.fromEntries(__SQ.chapters().map((r) => [r.id, r]));
    __SQ.press('attack', true);
    __SQ.step(3);
    __SQ.press('attack', false);
    __SQ.step(2);
    return { rows, state: __SQ.G.state, story: __SQ.story() };
  });
  for (const id of ['ros', 'ramshackle', 'drill']) {
    expect(locked.rows[id].open, id).toBe(false);
    expect(locked.rows[id].sub).toContain("SKIPPY'S RIDE");
  }
  for (const id of ['spike', 'ronin', 'santt']) expect(locked.rows[id].open, id).toBe(false);
  expect(locked.rows.skippy.open).toBe(true);
  expect(locked.state).toBe('stories');
  expect(locked.story).not.toBe('ros');
  await shot(page, 'chapter_list_locked');

  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('sq_save_v1'));
    save.flags.tale_ros = true;
    localStorage.setItem('sq_save_v1', JSON.stringify(save));
    localStorage.setItem('sq_save_ram_v1', JSON.stringify({
      v: 1, area: 'ram_dock', x: 96, y: 128, dir: 3, hp: 8, maxHp: 8,
      items: { hatchet: true }, keys: {}, bigKeys: {}, party: [], visited: {},
      flags: { ram_woke: true },
    }));
    save.flags.ds_home_end = true;
    localStorage.setItem('sq_save_v1', JSON.stringify(save));
    __SQ.G.state = 'stories';
    __SQ.G.menu = 3;
    __SQ.G.st = 1;
    __SQ.step(2);
  });
  await page.waitForTimeout(200);
  const open = await page.evaluate(() => Object.fromEntries(__SQ.chapters().map((r) => [r.id, r])));
  expect(open.ros.open).toBe(true);
  expect(open.ros.sub).toBe('THE TALE IS TOLD');
  expect(open.ramshackle.open).toBe(true);
  expect(open.ramshackle.status).toBe('RIDING');
  expect(open.drill.open).toBe(true);
  expect(open.spike.open).toBe(false);
  expect(open.ronin.open).toBe(false);
  expect(open.santt.open).toBe(false);
  await shot(page, 'chapter_list_unlocked');
  const started = await page.evaluate(() => {
    const S = __SQ;
    S.G.menu = 3;
    S.G.st = 1;
    S.press('attack', true);
    S.step(3);
    S.press('attack', false);
    S.step(3);
    return { state: S.G.state, story: S.story() };
  });
  expect(started.state).toBe('title');
  expect(started.story).toBe('drill');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('ROS and Ramshackle still start from their own tellers', async ({ page }) => {
  const errors = await boot(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('woke');
    S.flag('ch2_done');
    S.flag('oe_desert');
    S.warp('desert', 32, 8, 3);
    S.step(6);
  });
  expect(await advanceLines(page, 10)).toBe('choice');
  const rosChoice = await page.evaluate(() => document.getElementById('sr-live').textContent || '');
  expect(rosChoice).toContain('HEAR THE TALE');
  await talk(page);
  await advanceLines(page, 6);
  await page.evaluate(() => {
    const S = __SQ;
    if (S.G.state === 'flash') {
      S.step(40);
      S.press('talk', true);
      S.step(2);
      S.press('talk', false);
      S.step(10);
    }
    S.step(6);
  });
  const ros = await page.evaluate(() => ({ story: __SQ.story(), area: __SQ.A.id }));
  expect(ros.story).toBe('ros');
  expect(ros.area).toBe('ros_yard');
  expect(await advanceLines(page, 8)).toBe('clear');

  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.G.paused = false;
    S.flag('woke');
    S.flag('ch3_done');
    S.flag('oe_seaport');
    S.warp('seaport', 16, 17, 1);
    S.step(4);
  });
  await talk(page);
  expect(await advanceLines(page, 8)).toBe('choice');
  const ramChoice = await page.evaluate(() => document.getElementById('sr-live').textContent || '');
  expect(ramChoice).toContain('HEAR THE JOURNEY');
  await talk(page);
  await advanceLines(page, 6);
  await page.evaluate(() => {
    const S = __SQ;
    if (S.G.state === 'flash') {
      S.step(40);
      S.press('talk', true);
      S.step(2);
      S.press('talk', false);
      S.step(10);
    }
    S.step(6);
  });
  const ram = await page.evaluate(() => ({ story: __SQ.story(), area: __SQ.A.id, hatchet: !!__SQ.P.items.hatchet }));
  expect(ram.story).toBe('ramshackle');
  expect(ram.area).toBe('ram_dock');
  expect(ram.hatchet).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});
