import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts';
const GAME = '/skippys-quest/index.html';
const HTML = '/agent/repos/previews/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });

async function boot(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e.message || e)));
  await page.addInitScript(() => {
    window.__SQ_DEBUG = true;
  });
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ);
  await page.locator('#game').focus();
  await page.evaluate(() => {
    __SQ.setManual(true);
    window.spawnFoe = (x, y, hp) => ({
      k: 'crawler',
      def: { hp: hp || 2, speed: 0, dmg: 0, ai: 'still', w: 14, h: 10, drops: true },
      x, y, vx: 0, vy: 0, hp: hp || 2, inv: 0, t: 9, hop: 0, dir: 0,
      kb: 0, kbx: 0, kby: 0, stun: 9, dead: false, v: 0, flash: 0,
    });
  });
  return errors;
}

async function quiet(page) {
  await page.evaluate(() => {
    const S = __SQ;
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.G.toastT = 0;
    S.G.pixelT = 0;
    S.G.fade = 0;
    S.G.fadeTo = 0;
    S.step(1);
  });
}

test('build ids are b50 and the page stays unlisted once', async ({ page }) => {
  const errors = await boot(page);
  const html = fs.readFileSync(HTML, 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const build = script.match(/window\.__SQ_BUILD="(b\d+)"/)[1];
  const check = script.match(/\[\?&\]v=(b\d+)\(\?:&\|\$\)/)[1];
  const set = script.match(/searchParams\.set\("v","(b\d+)"\)/)[1];
  expect(build).toBe('b50');
  expect(check).toBe(build);
  expect(set).toBe(build);
  expect(html.split('noindex').length - 1).toBe(1);
  const live = await page.evaluate(() => __SQ.build());
  expect(live).toBe('b50');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('only one ROS is in the Pour or desert, and Santt stands in', async ({ page }) => {
  const errors = await boot(page);
  const stages = await page.evaluate(() => {
    const S = __SQ;
    const count = () => {
      const npcs = S.npcs.filter((n) => n.vis !== false && (n.alpha == null || n.alpha > 0.5));
      const looks = npcs.map((n) => n.look || n.id);
      const ally = S.comp.on ? S.comp.id : '';
      return {
        ros: looks.filter((id) => id === 'ros').length + (ally === 'ros' ? 1 : 0),
        santt: looks.includes('santt'),
        ally,
        looks,
        area: S.A.id,
      };
    };
    const snap = (name) => Object.assign({ name }, count());
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.flag('woke');
    S.flag('oe_saloon');
    S.flag('oe_desert');
    S.flag('ros_joined', false);
    S.flag('dl_ronin', false);
    S.flag('tale_ronin', false);
    S.party.length = 0;
    S.warp('saloon', 9, 8, 1);
    const earlyPour = snap('early-pour');
    S.warp('desert', 16, 14, 3);
    const earlyDesert = snap('early-desert');
    S.flag('ros_joined');
    S.party.push('ros');
    S.warp('desert', 30, 10, 2);
    const joinedDesert = snap('joined-desert');
    S.flag('ch2_done');
    S.flag('tale_macho');
    S.warp('desert', 32, 10, 3);
    const eastDesert = snap('east-desert');
    S.warp('saloon', 9, 8, 1);
    const joinedPour = snap('joined-pour');
    S.flag('dl_ronin');
    S.flag('tale_ronin', false);
    S.warp('saloon', 9, 9, 1);
    const guardPour = snap('guard-pour');
    S.warp('desert', 32, 12, 1);
    const guardDesert = snap('guard-desert');
    S.flag('tale_ronin');
    S.flag('fireball_got');
    S.warp('saloon', 9, 8, 1);
    const afterPour = snap('after-pour');
    S.G.story = 'ronin';
    S.flag('oe_rn_pour');
    S.flag('space_board');
    S.warp('rn_pour', 8, 6, 3);
    for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    const roninPour = snap('ronin-pour');
    return { earlyPour, earlyDesert, joinedDesert, eastDesert, joinedPour, guardPour, guardDesert, afterPour, roninPour };
  });
  for (const stage of Object.values(stages)) {
    expect(stage.ros, JSON.stringify(stage)).toBeLessThanOrEqual(1);
  }
  expect(stages.earlyPour.ros).toBe(1);
  expect(stages.earlyPour.santt).toBe(false);
  expect(stages.joinedDesert.ros).toBe(1);
  expect(stages.eastDesert.ros).toBe(1);
  expect(stages.eastDesert.santt).toBe(false);
  expect(stages.joinedPour.ros).toBe(1);
  expect(stages.joinedPour.santt).toBe(false);
  expect(stages.guardPour.ros).toBe(1);
  expect(stages.guardPour.santt).toBe(true);
  expect(stages.guardPour.ally).not.toBe('ros');
  expect(stages.guardDesert.ros).toBe(1);
  expect(stages.afterPour.ros).toBe(1);
  expect(stages.afterPour.santt).toBe(false);
  expect(stages.roninPour.ros).toBe(1);
  expect(errors, errors.join('\n')).toEqual([]);

  await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'skippy';
    S.G.state = 'play';
    S.flag('dl_ronin');
    S.flag('tale_ronin', false);
    S.flag('ros_joined');
    if (S.party.indexOf('ros') < 0) S.party.push('ros');
    S.flag('oe_saloon');
    S.warp('saloon', 9, 9, 1);
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.G.toastT = 0;
    S.step(1);
  });
  await quiet(page);
  await page.locator('#game').screenshot({ path: `${ART}/pour-one-ros-santt.png` });

  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.choice = null;
    S.flag('oe_desert');
    S.flag('ros_joined');
    if (S.party.indexOf('ros') < 0) S.party.push('ros');
    S.warp('desert', 22, 16, 3);
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.G.toastT = 0;
    S.step(2);
  });
  await quiet(page);
  await page.locator('#game').screenshot({ path: `${ART}/desert-one-ros.png` });

  const talk = await page.evaluate(() => {
    const S = __SQ;
    const tile = (n) => (n + 0.5) * 16;
    S.G.state = 'play';
    S.G.choice = null;
    S.flag('dl_ronin');
    S.flag('tale_ronin', false);
    S.flag('oe_saloon');
    S.warp('saloon', 9, 9, 1);
    S.P.x = tile(6) - 18;
    S.P.y = tile(5);
    S.P.dir = 3;
    S.press('talk', true); S.step(2); S.press('talk', false); S.step(2);
    for (let i = 0; i < 6 && !(S.dlg && /POINTING/.test(S.dlg.raw || '')); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    const santt = (S.dlg && S.dlg.raw) || '';
    for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.P.x = tile(11) - 18;
    S.P.y = tile(5);
    S.P.dir = 3;
    S.press('talk', true); S.step(2); S.press('talk', false); S.step(2);
    const ros = (S.dlg && S.dlg.raw) || '';
    return { santt, ros, choice: S.G.choice && S.G.choice.id };
  });
  expect(talk.santt).toMatch(/POINTING/);
  expect(talk.santt).not.toMatch(/HEAR RONIN|PLANS/);
  expect(talk.ros).toMatch(/RONIN|PLANS|SAFE/);
});

test('the fire arc waits for the gift, then rides the sword', async ({ page }) => {
  const errors = await boot(page);
  const before = await page.evaluate(() => {
    const spawn = window.spawnFoe;
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.flag('woke');
    S.flag('oe_saloon');
    S.flag('tale_ronin', false);
    S.flag('fireball_got', false);
    S.P.items = { sword: true, raygun: true, heavy: true };
    S.P.melee = 'sword';
    S.P.wep = 'sword';
    S.P.pri = 'raygun';
    S.P.sec = 'heavy';
    S.P.tool = 'heavy';
    S.P.hp = S.P.maxHp = 10;
    S.warp('saloon', 3, 8, 3);
    S.P.x = 56;
    S.P.y = 136;
    S.P.dir = 3;
    S.ents.push(spawn(72, 136, 3));
    S.ents.push(spawn(190, 136, 2));
    S.P.cds = {};
    S.shots.length = 0;
    S.press('attack', true); S.step(4); S.press('attack', false); S.step(2);
    return {
      kinds: S.shots.map((s) => s.kind),
      item: S.hands().item,
      slots: S.slots(),
      kit: S.kit(),
    };
  });
  expect(before.kinds).not.toContain('firearc');
  expect(before.kinds).not.toContain('fireball');
  expect(before.item).not.toBe('fireball');
  expect(before.kit).not.toContain('fireball');
  expect(before.slots.pri).not.toBe('fireball');
  expect(before.slots.sec).not.toBe('fireball');

  const flight = await page.evaluate(() => {
    const spawn = window.spawnFoe;
    const S = __SQ;
    S.flag('tale_ronin');
    S.flag('fireball_got');
    S.P.hp = 4;
    S.P.maxHp = 10;
    S.P.atk = 0;
    S.P.cds = {};
    S.P.arcCd = 0;
    S.shots.length = 0;
    S.G.toast = '';
    S.press('attack', true); S.step(4); S.press('attack', false); S.step(2);
    const low = { kinds: S.shots.map((s) => s.kind), toast: S.G.toast || '', swing: S.P.swingKind };
    S.P.hp = 10;
    S.P.atk = 0;
    S.P.cds = {};
    S.P.arcCd = 0;
    S.shots.length = 0;
    S.ents.length = 0;
    const near = spawn(70, 148, 3);
    const far = spawn(190, 126, 2);
    S.ents.push(near, far);
    S.P.x = 56;
    S.P.y = 136;
    S.P.dir = 3;
    S.press('attack', true); S.step(6); S.press('attack', false);
    const mid = {
      swing: S.P.swingKind,
      kinds: S.shots.map((s) => s.kind),
      x: (S.shots.find((s) => s.kind === 'firearc') || {}).x || 0,
      near: near.hp,
      far: far.hp,
    };
    const x0 = mid.x;
    S.step(8);
    const moved = (S.shots.find((s) => s.kind === 'firearc') || {}).x || x0;
    for (let i = 0; i < 40 && !far.dead; i++) S.step(1);
    return { low, mid, moved, x0, farDead: far.dead, farHp: far.hp, nearHp: near.hp, item: S.hands().item };
  });
  expect(flight.low.kinds).not.toContain('firearc');
  expect(flight.low.toast).toMatch(/FULL LIFE/);
  expect(flight.low.swing).toBe('melee');
  expect(flight.mid.swing).toBe('melee');
  expect(flight.mid.kinds).toContain('firearc');
  expect(flight.mid.kinds).not.toContain('fireball');
  expect(flight.mid.near).toBeLessThan(3);
  expect(flight.mid.far).toBe(2);
  expect(flight.moved).toBeGreaterThan(flight.x0);
  expect(flight.farDead).toBe(true);
  expect(flight.item).toBe('heavy');
  expect(errors, errors.join('\n')).toEqual([]);

  await page.evaluate(() => {
    const S = __SQ;
    S.G.toastT = 0;
    S.G.bannerT = 0;
    S.P.hp = 10;
    S.P.cds = {};
    S.P.arcCd = 0;
    S.shots.length = 0;
    S.ents.length = 0;
    S.P.x = 56;
    S.P.y = 136;
    S.P.dir = 3;
    S.press('attack', true); S.step(8); S.press('attack', false); S.step(1);
    S.G.toastT = 0;
    S.G.saveT = 0;
    S.G.bannerT = 0;
    S.step(1);
  });
  await page.locator('#game').screenshot({ path: `${ART}/fire-arc-desktop.png` });

  await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_rn_thanks');
    S.warp('rn_thanks', 9, 6, 2);
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.P.hold = 'firearc';
    S.P.holdT = 8;
    S.run('tale_ronin_close');
    for (let i = 0; i < 16 && !(S.dlg && /FIRE ARC/.test(S.dlg.raw || '')); i++) {
      if (S.dlg && !/FIRE ARC/.test(S.dlg.raw || '')) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    if (S.dlg) S.skipText();
    S.P.hold = 'firearc';
    S.P.holdT = 8;
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.step(2);
  });
  const banner = await page.evaluate(() => (__SQ.dlg && __SQ.dlg.raw) || '');
  expect(banner).toMatch(/FIRE ARC/);
  expect(banner).not.toMatch(/Z OR SWAP|SWAP/);
  await page.locator('#game').screenshot({ path: `${ART}/fire-arc-gift-banner.png` });
});

test('a b49 fireball save becomes the sword arc and a replay does not grant it early', async ({ page }) => {
  const errors = await boot(page);
  const moved = await page.evaluate(() => {
    const old = {
      v: 1, area: 'saloon', x: 160, y: 140, dir: 1, hp: 6, maxHp: 10,
      items: { sword: true, raygun: true, heavy: true, fireball: true },
      flags: { woke: true, heavy_got: true, ch9_done: true, ros_joined: true },
      pri: 'fireball', sec: 'heavy', tool: 'fireball', act: 'fireball', z: 'fireball',
      melee: 'sword', party: ['ros'], keys: {}, bigKeys: {}, visited: { saloon: true },
    };
    localStorage.setItem('sq_save_v1', JSON.stringify(old));
    localStorage.setItem('sq_save_ronin_v1', JSON.stringify({
      v: 1, area: 'rn_pour', x: 80, y: 80, dir: 1, flags: { rn_heard: true }, items: { katana: true, fireball: true },
    }));
    localStorage.setItem('sq_save_ros_v1', JSON.stringify({ v: 1, area: 'ros_pour', flags: { ros_home_end: true }, items: { blasters: true } }));
    __SQ.load();
    __SQ.G.story = 'skippy';
    __SQ.G.state = 'play';
    __SQ.P.atk = 0;
    const saved = JSON.parse(localStorage.getItem('sq_save_v1'));
    const ronin = JSON.parse(localStorage.getItem('sq_save_ronin_v1'));
    const ros = JSON.parse(localStorage.getItem('sq_save_ros_v1'));
    __SQ.P.hp = __SQ.P.maxHp;
    __SQ.P.cds = {};
    __SQ.shots.length = 0;
    __SQ.press('attack', true); __SQ.step(3); __SQ.press('attack', false); __SQ.step(1);
    return {
      item: saved.items.fireball,
      tale: !!saved.flags.tale_ronin,
      got: !!saved.flags.fireball_got,
      pri: saved.pri,
      sec: saved.sec,
      tool: saved.tool,
      hand: __SQ.hands().item,
      kit: __SQ.kit(),
      shot: __SQ.shots.map((s) => s.kind),
      roninFire: !!(ronin.items && ronin.items.fireball),
      roninTale: !!(ronin.flags && ronin.flags.tale_ronin),
      rosKept: !!ros.flags.ros_home_end,
    };
  });
  expect(moved.item).toBeUndefined();
  expect(moved.tale).toBe(true);
  expect(moved.got).toBe(true);
  expect(moved.pri).not.toBe('fireball');
  expect(moved.sec).toBe('heavy');
  expect(moved.tool).not.toBe('fireball');
  expect(moved.hand).toBe('heavy');
  expect(moved.kit).not.toContain('fireball');
  expect(moved.kit).toEqual(expect.arrayContaining(['sword', 'heavy']));
  expect(moved.shot).toContain('firearc');
  expect(moved.roninFire).toBeFalsy();
  expect(moved.roninTale).toBeFalsy();
  expect(moved.rosKept).toBe(true);

  const replay = await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'skippy';
    S.G.state = 'play';
    S.flag('tale_ronin', false);
    S.flag('fireball_got', false);
    S.P.items = { sword: true, heavy: true };
    S.P.melee = 'sword';
    S.P.sec = 'heavy';
    S.P.pri = '';
    S.flag('oe_saloon');
    S.warp('saloon', 8, 8, 1);
    const bare = localStorage.getItem('sq_save_v1');
    S.G.story = 'ronin';
    S.P.items = { katana: true };
    S.P.melee = 'katana';
    S.P.hp = S.P.maxHp;
    S.flag('oe_rn_s1');
    S.flag('space_board');
    S.warp('rn_s1', 6, 6, 3);
    S.P.cds = {};
    S.shots.length = 0;
    S.press('swap', true); S.step(2); S.press('swap', false); S.step(1);
    S.press('item', true); S.step(2); S.press('item', false); S.step(1);
    S.press('attack', true); S.step(4); S.press('attack', false); S.step(1);
    const during = {
      story: S.story(),
      item: S.hands().item,
      hud: S.hud().map((b) => b.text).join(' '),
      kinds: S.shots.map((s) => s.kind),
      buttons: document.documentElement.dataset.item + document.documentElement.dataset.swap,
    };
    const kept = JSON.parse(localStorage.getItem('sq_save_v1'));
    S.G.story = 'skippy';
    S.flag('tale_ronin');
    S.flag('fireball_got');
    S.P.items = { sword: true, heavy: true };
    S.P.melee = 'sword';
    S.P.sec = 'heavy';
    S.warp('saloon', 8, 8, 1);
    const gifted = localStorage.getItem('sq_save_v1');
    S.G.story = 'ronin';
    S.P.items = { katana: true };
    S.warp('rn_pour', 8, 6, 3);
    S.shots.length = 0;
    S.P.hp = S.P.maxHp;
    S.press('attack', true); S.step(3); S.press('attack', false); S.step(1);
    const again = JSON.parse(localStorage.getItem('sq_save_v1'));
    return {
      during,
      bareHad: !JSON.parse(bare).flags.tale_ronin,
      keptBare: !(kept.flags && kept.flags.tale_ronin),
      gifted: !!(JSON.parse(gifted).flags.tale_ronin && JSON.parse(gifted).flags.fireball_got),
      still: !!(again.flags && again.flags.tale_ronin && again.flags.fireball_got),
      noArc: !S.shots.some((s) => s.kind === 'firearc'),
    };
  });
  expect(replay.during.story).toBe('ronin');
  expect(replay.during.item).toBe('');
  expect(replay.during.hud).toMatch(/KATANA/);
  expect(replay.during.hud).toMatch(/SMOKE/);
  expect(replay.during.hud).not.toMatch(/\bZ\b/);
  expect(replay.during.kinds).not.toContain('firearc');
  expect(replay.during.kinds).not.toContain('smoke');
  expect(replay.during.buttons).toBe('00');
  expect(replay.bareHad).toBe(true);
  expect(replay.keptBare).toBe(true);
  expect(replay.gifted).toBe(true);
  expect(replay.still).toBe(true);
  expect(replay.noArc).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);

  await page.evaluate(() => {
    const S = __SQ;
    S.G.story = 'ronin';
    S.G.state = 'play';
    S.P.items = { katana: true };
    S.flag('space_board');
    S.flag('oe_rn_pour');
    S.warp('rn_pour', 8, 6, 3);
    for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.G.toastT = 0;
    S.step(1);
  });
  await quiet(page);
  await page.locator('#game').screenshot({ path: `${ART}/ronin-hud-katana-desktop.png` });
});

test.describe('sideways phone', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });

  test('Ronin has no ITEM or SWAP buttons and the fire arc still flies', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'ronin';
      S.P.items = { katana: true };
      S.P.melee = 'katana';
      S.flag('space_board');
      S.flag('oe_rn_pour');
      S.flag('rn_nocont');
      S.warp('rn_pour', 8, 6, 3);
      for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
        if (S.dlg) S.skipText();
        S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      S.G.bannerT = 0;
      S.G.saveT = 0;
      S.step(2);
    });
    await page.evaluate(() => window.__SRML_LAYOUT && window.__SRML_LAYOUT());
    const boxes = await page.evaluate(() => {
      const box = (sel) => {
        const el = document.querySelector(sel);
        if (!el) return null;
        const r = el.getBoundingClientRect();
        const on = getComputedStyle(el).display !== 'none' && r.width > 2;
        return { x: r.x, y: r.y, w: r.width, h: r.height, on, label: (el.textContent || '').trim() };
      };
      const game = document.querySelector('#game').getBoundingClientRect();
      return {
        attack: box('[data-b="attack"]'),
        item: box('[data-b="item"]'),
        swap: box('[data-b="swap"]'),
        talk: box('[data-b="talk"]'),
        board: box('[data-b="board"], [data-b="roll"]'),
        game: { x: game.x, y: game.y, w: game.width, h: game.height },
        hud: __SQ.hud().map((b) => b.text).join(' '),
      };
    });
    expect(boxes.item.on).toBe(false);
    expect(boxes.swap.on).toBe(false);
    expect(boxes.hud).toMatch(/KATANA/);
    expect(boxes.hud).not.toMatch(/\bZ\b/);
    for (const name of ['attack', 'talk', 'board']) {
      const b = boxes[name];
      expect(b && b.on, name).toBeTruthy();
      expect(b.w, name).toBeGreaterThanOrEqual(48);
      expect(b.h, name).toBeGreaterThanOrEqual(48);
      const ix = Math.min(b.x + b.w, boxes.game.x + boxes.game.w) - Math.max(b.x, boxes.game.x);
      const iy = Math.min(b.y + b.h, boxes.game.y + boxes.game.h) - Math.max(b.y, boxes.game.y);
      expect(ix > 1 && iy > 1, name + ' overlaps the screen').toBe(false);
    }
    await page.screenshot({ path: `${ART}/ronin-hud-katana-phone.png` });

    await page.evaluate(() => {
      const spawn = window.spawnFoe;
      const S = __SQ;
      S.G.story = 'skippy';
      S.flag('tale_ronin');
      S.flag('fireball_got');
      S.flag('oe_saloon');
      S.P.items = { sword: true, heavy: true };
      S.P.melee = 'sword';
      S.P.wep = 'sword';
      S.P.sec = 'heavy';
      S.P.hp = S.P.maxHp = 10;
      S.warp('saloon', 3, 8, 3);
      S.P.x = 56;
      S.P.y = 136;
      S.P.dir = 3;
      S.ents.length = 0;
      S.ents.push(spawn(200, 136, 2));
      S.P.cds = {};
      S.P.arcCd = 0;
      S.shots.length = 0;
      S.G.bannerT = 0;
      S.G.toastT = 0;
      S.press('attack', true); S.step(8); S.press('attack', false); S.step(1);
    });
    const arc = await page.evaluate(() => __SQ.shots.some((s) => s.kind === 'firearc'));
    expect(arc).toBe(true);
    await page.locator('#game').screenshot({ path: `${ART}/fire-arc-phone.png` });
    await page.screenshot({ path: `${ART}/fire-arc-phone-land.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
