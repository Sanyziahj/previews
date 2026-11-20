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
  await page.evaluate(() => __SQ.setManual(true));
  return errors;
}

async function shot(page, name) {
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
  await page.locator('#game').screenshot({ path: `${ART}/${name}` });
}

test('cache-bust ids, badge, and noindex stay on b49', async ({ page }) => {
  const errors = await boot(page);
  const html = fs.readFileSync(HTML, 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)[1];
  const build = script.match(/window\.__SQ_BUILD="(b\d+)"/)[1];
  const check = script.match(/\[\?&\]v=(b\d+)\(\?:&\|\$\)/)[1];
  const set = script.match(/searchParams\.set\("v","(b\d+)"\)/)[1];
  expect(build).toBe('b49');
  expect(check).toBe(build);
  expect(set).toBe(build);
  expect(html.split('noindex').length - 1).toBe(1);
  const live = await page.evaluate(() => __SQ.build());
  expect(live).toBe('b49');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('Ronin stays locked until Spike is done, then the tale can start', async ({ page }) => {
  const errors = await boot(page);
  const locked = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.flag('woke');
    S.flag('ch9_done');
    S.flag('dl_done');
    S.step(2);
    const row = S.chapters().find((c) => c.id === 'ronin');
    const santt = S.chapters().find((c) => c.id === 'santt');
    return { row, santt, obj: S.objective() };
  });
  expect(locked.row.open).toBe(false);
  expect(locked.row.status).toBe('');
  expect(locked.row.sub).toMatch(/HEAR IT|RIDE/);
  expect(locked.santt.open).toBe(false);
  expect(locked.santt.sub).toMatch(/SOON/);
  expect(locked.obj).not.toMatch(/PIONEER POUR/);

  const nudge = await page.evaluate(() => {
    const S = __SQ;
    S.flag('dl_ronin');
    S.flag('heavy_got');
    S.flag('tale_drill');
    S.P.items = { sword: true, raygun: true, heavy: true };
    S.P.melee = 'sword';
    S.P.wep = 'sword';
    S.P.pri = 'raygun';
    S.P.sec = 'heavy';
    S.P.tool = 'heavy';
    S.P.act = 'heavy';
    S.flag('oe_saloon');
    S.warp('saloon', 9, 7, 1);
    S.G.bannerT = 0;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.save();
    const ros = S.npcs.find((n) => n.id === 'ros_seat');
    return {
      obj: S.objective(),
      open: S.chapters().find((c) => c.id === 'ronin').open,
      ros: !!(ros && ros.vis !== false),
      x: ros && ros.x,
      y: ros && ros.y,
    };
  });
  expect(nudge.obj).toMatch(/PIONEER POUR/);
  expect(nudge.open).toBe(false);
  expect(nudge.ros).toBe(true);

  await page.evaluate(() => {
    const S = __SQ;
    S.run('ros_ronin_offer');
    S.step(2);
  });
  const choice = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8 && !S.G.choice; i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    return {
      id: S.G.choice && S.G.choice.id,
      opts: S.choiceInk() && S.choiceInk().lines.map((l) => l.text).join(' | '),
    };
  });
  expect(choice.id).toBe('tale_ronin_choice');
  expect(choice.opts).toMatch(/HEAR RONIN/);
  expect(choice.opts).toMatch(/NOT YET/);

  await page.evaluate(() => {
    const S = __SQ;
    S.G.choice.sel = 1;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(4);
  });
  const declined = await page.evaluate(() => ({
    story: __SQ.story(),
    choice: __SQ.G.choice && __SQ.G.choice.id,
    area: __SQ.A.id,
  }));
  expect(declined.story).toBe('skippy');
  expect(declined.area).toBe('saloon');
  expect(declined.choice).toBeFalsy();

  await page.evaluate(() => {
    const S = __SQ;
    S.run('ros_ronin_offer');
    for (let i = 0; i < 16 && !S.G.choice; i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.G.choice.sel = 0;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(4);
    for (let i = 0; i < 20 && S.story() === 'skippy' && S.G.state === 'play'; i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(3);
    }
    for (let i = 0; i < 40 && S.story() !== 'ronin'; i++) {
      S.press('attack', true); S.step(2); S.press('attack', false); S.step(3);
      if (S.dlg) S.skipText();
    }
  });
  const started = await page.evaluate(() => ({
    story: __SQ.story(),
    area: __SQ.A.id,
    melee: __SQ.melee(),
    board: __SQ.board().has,
    open: __SQ.chapters().find((c) => c.id === 'ronin').open,
    lines: (__SQ.dlg && __SQ.dlg.raw) || '',
  }));
  expect(started.story).toBe('ronin');
  expect(started.area).toBe('rn_pour');
  expect(started.melee).toBe('sword');
  expect(started.board).toBe(true);
  expect(started.open).toBe(false);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('each Ronin beat, the far key, and the Fireball return', async ({ page }) => {
  test.setTimeout(120000);
  const errors = await boot(page);
  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.flag('woke');
    S.flag('ch9_done');
    S.flag('dl_ronin');
    S.flag('heavy_got');
    S.flag('tale_drill');
    S.P.items = { sword: true, raygun: true, heavy: true };
    S.P.melee = 'sword';
    S.P.wep = 'sword';
    S.P.pri = 'raygun';
    S.P.sec = 'heavy';
    S.P.tool = 'heavy';
    S.flag('oe_saloon');
    S.warp('saloon', 9, 7, 0);
    S.save();
    S.G.story = 'ronin';
    S.G.state = 'play';
    S.P.items = { sword: true };
    S.P.melee = 'sword';
    S.P.wep = 'sword';
    S.P.pri = '';
    S.P.sec = '';
    S.flag('rn_nocont');
    S.flag('space_board');
    S.warp('rn_club', 8, 6, 3);
    S.G.bannerT = 0;
    for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
  });
  const club = await page.evaluate(() => {
    const dj = __SQ.npcs.find((n) => n.id === 'deejay');
    return {
      area: __SQ.A.id,
      name: __SQ.A.name,
      dj: !!(dj && dj.vis !== false),
      peace: __SQ.A.peace || __SQ.A.id === 'rn_club',
    };
  });
  expect(club.area).toBe('rn_club');
  expect(club.name).toMatch(/SUPERNOVA/);
  expect(club.dj).toBe(true);
  await shot(page, 'ronin-deejay-supernova.png');

  await page.evaluate(() => {
    const S = __SQ;
    S.run('rn_deejay');
    const lines = [];
    for (let i = 0; i < 80 && !(S.A.id === 'rn_torch' && S.flags.rn_torch && !S.script && !S.dlg); i++) {
      if (S.dlg) {
        S.skipText();
        lines.push(S.dlg.raw);
      }
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(3);
    }
    S.G.bannerT = 0;
    S.G.fade = 0;
    S.G.fadeTo = 0;
    S.G.pixelT = 0;
    S._lines = lines;
  });
  const torch = await page.evaluate(() => ({
    area: __SQ.A.id,
    torch: (__SQ.A.props || []).some((p) => p.k === 'gtorch'),
    flag: !!__SQ.flags.rn_deejay,
    realm: __SQ.A.realm,
    lines: __SQ._lines || [],
  }));
  expect(torch.area).toBe('rn_torch');
  expect(torch.torch).toBe(true);
  expect(torch.realm).toBe('void');
  expect(torch.flag).toBe(true);
  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.G.bannerT = 0;
    S.step(2);
  });
  const fireLine = await page.evaluate(() => __SQ.flags.rn_torch);
  expect(fireLine).toBe(true);
  await shot(page, 'ronin-torch-space.png');

  await page.evaluate(() => {
    const S = __SQ;
    S.flag('oe_rn_shadow');
    S.warp('rn_shadow', 4, 6, 3);
    S.G.bannerT = 0;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
    }
    for (let i = 0; i < 80 && S.B.state !== 'fight'; i++) S.step(4);
  });
  const shadow = await page.evaluate(() => ({
    area: __SQ.A.id,
    state: __SQ.B.state,
    kind: __SQ.B.kind,
    name: __SQ.A.name,
  }));
  expect(shadow.area).toBe('rn_shadow');
  expect(shadow.kind).toBe('rnshadow');
  expect(shadow.state).toBe('fight');
  await shot(page, 'ronin-shadow-boss.png');

  await page.evaluate(() => {
    const S = __SQ;
    S.bossHurt(20);
    for (let i = 0; i < 50 && S.A.id !== 'rn_ac'; i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(6);
    }
  });
  const smoked = await page.evaluate(() => ({
    smoke: !!__SQ.flags.smoke_got,
    area: __SQ.A.id,
    boss: !!__SQ.flags.boss_shadow,
  }));
  expect(smoked.smoke).toBe(true);
  expect(smoked.boss).toBe(true);
  expect(smoked.area).toBe('rn_ac');

  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.flag('oe_rn_kboss');
    S.warp('rn_kboss', 4, 6, 3);
    S.G.bannerT = 0;
    for (let i = 0; i < 80 && S.B.state !== 'fight'; i++) S.step(4);
  });
  const kal = await page.evaluate(() => ({
    area: __SQ.A.id,
    state: __SQ.B.state,
    kind: __SQ.B.kind,
    sub: 'ROBOT ARMOR',
  }));
  expect(kal.area).toBe('rn_kboss');
  expect(kal.kind).toBe('rnkal');
  expect(kal.state).toBe('fight');
  await shot(page, 'ronin-kal-armor.png');

  await page.evaluate(() => {
    const S = __SQ;
    S.bossHurt(30);
    for (let i = 0; i < 40 && !S.flags.rn_key_got; i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(6);
    }
  });
  const key = await page.evaluate(() => {
    const door = __SQ.chart().find((a) => a.id === 'rn_sealdoor');
    const boss = __SQ.chart().find((a) => a.id === 'rn_kboss');
    return {
      got: !!__SQ.flags.rn_key_got,
      area: __SQ.A.id,
      keys: __SQ.P.keys.rnk || 0,
      doorChests: (door.chests || []).map((c) => c.item),
      doorId: door.id,
      bossId: boss.id,
      lock: door.locks && door.locks.D,
    };
  });
  expect(key.got).toBe(true);
  expect(key.area).toBe('rn_kboss');
  expect(key.keys).toBeGreaterThan(0);
  expect(key.doorId).not.toBe(key.bossId);
  expect(key.doorChests).not.toContain('key');
  expect(key.lock.flag).toBe('door_rnscroll');
  expect(key.lock.key).toBe('small');

  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.warp('rn_sealdoor', 8, 2, 1);
    S.press('up', true);
    for (let i = 0; i < 90 && !S.flags.door_rnscroll; i++) S.step(2);
    S.press('up', false);
    if (S.flags.door_rnscroll) S.warp('rn_scroll', 8, 7, 1);
    S.G.bannerT = 0;
    S.step(4);
  });
  const scroll = await page.evaluate(() => {
    const S = __SQ;
    const lines = [];
    for (let i = 0; i < 8 && (S.script || S.dlg || !S.flags.rn_scroll); i++) {
      if (S.dlg) {
        S.skipText();
        lines.push(S.dlg.raw);
      }
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    return {
      area: S.A.id,
      open: !!S.flags.door_rnscroll,
      read: !!S.flags.rn_scroll,
      lines: lines.join(' | '),
      prop: (S.A.props || []).some((p) => p.k === 'scroll'),
    };
  });
  expect(scroll.area).toBe('rn_scroll');
  expect(scroll.open).toBe(true);
  expect(scroll.read).toBe(true);
  expect(scroll.prop).toBe(true);
  expect(scroll.lines).toMatch(/FIRE IS WITHIN/);
  await page.evaluate(() => {
    const S = __SQ;
    S.run('rn_scroll_read');
    S.step(2);
    if (S.dlg) S.skipText();
    S.step(1);
  });
  await shot(page, 'ronin-scroll.png');

  await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.warp('rn_seal', 8, 8, 1);
    for (let i = 0; i < 16 && S.A.id !== 'rn_back'; i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(4);
    }
    for (let i = 0; i < 16 && S.story() !== 'skippy'; i++) {
      if (S.dlg) S.skipText();
      if (S.getPop) {
        S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
      }
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(3);
    }
    S.G.bannerT = 0;
    S.G.saveT = 0;
    if (S.dlg) S.skipText();
    S.step(1);
  });
  const back = await page.evaluate(() => ({
    story: __SQ.story(),
    area: __SQ.A.id,
    name: __SQ.A.name,
    tale: !!__SQ.flags.tale_ronin,
    seal: !!__SQ.flags.rn_seal,
    item: __SQ.hands().item,
    melee: __SQ.hands().melee,
    kit: __SQ.kit(),
    slots: __SQ.slots(),
    ronin: __SQ.npcs.some((n) => (n.look || n.id) === 'ronin' && n.vis !== false),
    hold: __SQ.P.hold,
    line: (__SQ.dlg && __SQ.dlg.raw) || '',
    chapter: __SQ.chapters().find((c) => c.id === 'ronin'),
  }));
  expect(back.story).toBe('skippy');
  expect(back.area).toBe('saloon');
  expect(back.name).toMatch(/PIONEER POUR/);
  expect(back.tale).toBe(true);
  expect(back.seal).toBe(true);
  expect(back.melee).toBe('sword');
  expect(back.kit).toEqual(expect.arrayContaining(['sword', 'heavy', 'fireball']));
  expect(back.chapter.open).toBe(true);
  expect(back.chapter.status).toBe('COMPLETE');
  expect(back.chapter.sub).toBe('COMPLETE');
  expect(back.ronin).toBe(true);
  await shot(page, 'ronin-fireball-pour.png');

  const attack = await page.evaluate(() => {
    const S = __SQ;
    for (let i = 0; i < 24 && (S.script || S.dlg || S.getPop || S.G.choice); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    S.P.cds = {};
    S.shots.length = 0;
    S.press('attack', true); S.step(2); S.press('attack', false); S.step(1);
    const melee = {
      swing: S.P.swingKind,
      shots: S.shots.map((s) => s.kind),
      hand: S.melee(),
    };
    let guard = 0;
    while (S.hands().item !== 'fireball' && guard < 6) {
      S.press('swap', true); S.step(2); S.press('swap', false); S.step(1);
      guard += 1;
    }
    S.P.cds = {};
    S.shots.length = 0;
    S.press('item', true); S.step(2); S.press('item', false); S.step(2);
    return {
      melee,
      item: S.hands().item,
      meleeNow: S.melee(),
      shots: S.shots.map((s) => s.kind),
      heavy: !!S.P.items.heavy,
      fire: !!S.P.items.fireball,
    };
  });
  expect(attack.melee.hand).toBe('sword');
  expect(attack.melee.swing).toBe('melee');
  expect(attack.melee.shots).not.toContain('fireball');
  expect(attack.melee.shots).not.toContain('heavy');
  expect(attack.item).toBe('fireball');
  expect(attack.meleeNow).toBe('sword');
  expect(attack.shots).toContain('fireball');
  expect(attack.heavy).toBe(true);
  expect(attack.fire).toBe(true);
  expect(errors, errors.join('\n')).toEqual([]);
});

test('ronin replay opens from the chapter list and other saves stay', async ({ page }) => {
  const errors = await boot(page);
  const before = await page.evaluate(() => {
    const skippy = {
      v: 1, area: 'saloon', x: 160, y: 128, dir: 1, hp: 10, maxHp: 10,
      items: { sword: true, raygun: true, heavy: true }, keys: {}, bigKeys: {},
      flags: { woke: true, ch9_done: true, dl_ronin: true, heavy_got: true, tale_drill: true },
      party: [], visited: {}, pri: 'raygun', sec: 'heavy', melee: 'sword', z: 'bow', time: 3,
    };
    const ros = { v: 1, area: 'ros_pour', x: 80, y: 80, dir: 0, flags: { ros_home_end: true, yard_clear: true }, items: { blasters: true } };
    const ram = { v: 1, area: 'ram_dock', x: 90, y: 90, dir: 1, flags: { ram_home_end: true }, items: { hatchet: true } };
    const drill = { v: 1, area: 'ds_camp', x: 100, y: 100, dir: 0, flags: { ds_home_end: true, heavy_got: true }, items: { blast: true, heavy: true } };
    localStorage.setItem('sq_save_v1', JSON.stringify(skippy));
    localStorage.setItem('sq_save_ros_v1', JSON.stringify(ros));
    localStorage.setItem('sq_save_ram_v1', JSON.stringify(ram));
    localStorage.setItem('sq_save_ds_v1', JSON.stringify(drill));
    return {
      ros: localStorage.getItem('sq_save_ros_v1'),
      ram: localStorage.getItem('sq_save_ram_v1'),
      drill: localStorage.getItem('sq_save_ds_v1'),
      skippy: JSON.parse(localStorage.getItem('sq_save_v1')),
    };
  });

  await page.evaluate(() => {
    const S = __SQ;
    S.load();
    S.G.story = 'ronin';
    S.G.state = 'play';
    S.P.items = { sword: true };
    S.P.melee = 'sword';
    S.flag('rn_nocont');
    S.flag('rn_seal');
    S.flag('space_board');
    S.warp('rn_back', 8, 7, 3);
    for (let i = 0; i < 20 && S.story() !== 'skippy'; i++) {
      if (S.dlg) S.skipText();
      if (S.getPop) { S.press('talk', true); S.step(1); S.press('talk', false); S.step(2); }
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(4);
    }
    for (let i = 0; i < 8 && (S.script || S.dlg || S.getPop); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
  });
  const kept = await page.evaluate((snap) => {
    const skippy = JSON.parse(localStorage.getItem('sq_save_v1'));
    const row = __SQ.chapters().find((c) => c.id === 'ronin');
    return {
      ros: localStorage.getItem('sq_save_ros_v1') === snap.ros,
      ram: localStorage.getItem('sq_save_ram_v1') === snap.ram,
      drill: localStorage.getItem('sq_save_ds_v1') === snap.drill,
      ch9: !!(skippy.flags && skippy.flags.ch9_done),
      heavy: !!(skippy.flags && skippy.flags.heavy_got),
      tale: !!(skippy.flags && skippy.flags.tale_ronin),
      fire: !!(skippy.items && skippy.items.fireball),
      row,
    };
  }, before);
  expect(kept.ros).toBe(true);
  expect(kept.ram).toBe(true);
  expect(kept.drill).toBe(true);
  expect(kept.ch9).toBe(true);
  expect(kept.heavy).toBe(true);
  expect(kept.tale).toBe(true);
  expect(kept.fire).toBe(true);
  expect(kept.row.open).toBe(true);
  expect(kept.row.status).toBe('COMPLETE');

  await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'stories';
    S.G.menu = S.chapters().findIndex((c) => c.id === 'ronin');
    S.G.st = 2;
    S.step(1);
  });
  await page.waitForTimeout(350);
  const title = await page.evaluate(() => {
    const S = __SQ;
    S.G.st = 2;
    S.press('attack', true);
    S.step(2);
    S.press('attack', false);
    S.step(2);
    return { state: S.G.state, story: S.story(), save: S.hasSave };
  });
  await page.waitForTimeout(350);
  const replayRest = await page.evaluate(() => {
    const S = __SQ;
    S.G.menu = 0;
    S.G.st = 2;
    S.press('attack', true); S.step(3); S.press('attack', false); S.step(8);
    for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
      if (S.dlg) S.skipText();
      S.press('talk', true); S.step(1); S.press('talk', false); S.step(2);
    }
    return { area: S.A.id, story: S.story(), melee: S.melee() };
  });
  const replay = { title, ...replayRest };
  expect(replay.title.state, JSON.stringify(replay.title)).toBe('title');
  expect(replay.title.story).toBe('ronin');
  expect(replay.area).toBe('rn_pour');
  expect(replay.story).toBe('ronin');
  expect(replay.melee).toBe('sword');
  expect(errors, errors.join('\n')).toEqual([]);
});

test('downstairs cosmos portals wear plaques and a near label', async ({ page }) => {
  const errors = await boot(page);
  const far = await page.evaluate(() => {
    const S = __SQ;
    S.G.state = 'play';
    S.G.story = 'skippy';
    S.flag('woke');
    S.flag('oe_cosmos');
    S.flag('lane_sky');
    S.flag('ch1_done');
    S.flag('ch2_done');
    S.warp('cosmos', 14, 8, 0);
    S.G.bannerT = 0;
    S.step(3);
    const labels = (S.A.props || []).filter((p) => p.k === 'portal').map((p) => p.label);
    return {
      area: S.A.id,
      labels,
      ink: S.worldInk().map((w) => w.t).join(' '),
      hint: S.portalHint(),
    };
  });
  expect(far.area).toBe('cosmos');
  expect(far.labels).toEqual(expect.arrayContaining([
    'ACADEMY', 'NEXUS', 'SKY CITY', 'HI LIFE', 'PRISON', 'DRAGON', 'DESERT', 'SEAPORT', 'SAKURA',
  ]));
  expect(far.ink).not.toMatch(/ACADEMY|PRISON|DRAGON|SEAPORT|SAKURA|HI LIFE|SKY CITY/);
  await shot(page, 'ronin-portal-labels.png');

  const near = await page.evaluate(() => {
    const S = __SQ;
    S.warp('cosmos', 6, 4, 0);
    S.P.x = 6.2 * 16;
    S.P.y = 4.6 * 16;
    S.step(2);
    const c = document.getElementById('game');
    const g = c.getContext('2d', { willReadFrequently: true });
    const prop = S.A.props.find((p) => p.label === 'ACADEMY');
    const sx = Math.round(prop.x * 16 + 8 - S.cam.x);
    const sy = Math.round(prop.y * 16 + 8 - S.cam.y + 24 + 16);
    const box = g.getImageData(Math.max(0, sx - 18), Math.max(24, sy - 8), 36, 20).data;
    let tan = 0;
    for (let i = 0; i < box.length; i += 4) {
      const r = box[i], gg = box[i + 1], b = box[i + 2];
      if (r > 160 && gg > 120 && b < 140 && r > b + 40) tan += 1;
    }
    return { hint: S.portalHint(), tan, ink: S.worldInk().map((w) => w.t).join(' ') };
  });
  expect(near.hint).toBe('ACADEMY');
  expect(near.tan).toBeGreaterThan(8);
  expect(near.ink).not.toMatch(/ACADEMY/);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('sideways phone', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('a boss fight keeps the buttons in the gutters', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'ronin';
      S.P.items = { sword: true };
      S.P.melee = 'sword';
      S.P.wep = 'sword';
      S.flag('rn_nocont');
      S.flag('space_board');
      S.flag('oe_rn_shadow');
      S.warp('rn_shadow', 4, 6, 3);
      S.G.bannerT = 0;
      for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
        if (S.dlg) S.skipText();
        S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      for (let i = 0; i < 80 && S.B.state !== 'fight'; i++) S.step(4);
      S.step(2);
    });
    await page.evaluate(() => {
      if (window.__SRML_LAYOUT) window.__SRML_LAYOUT();
    });
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
        vw: innerWidth,
        vh: innerHeight,
        state: __SQ.B.state,
      };
    });
    expect(boxes.state).toBe('fight');
    expect(boxes.vw).toBeGreaterThan(boxes.vh);
    const names = ['attack', 'item', 'swap', 'talk', 'board'];
    for (const name of names) {
      const b = boxes[name];
      expect(b && b.on, name).toBeTruthy();
      expect(b.w, name).toBeGreaterThanOrEqual(48);
      expect(b.h, name).toBeGreaterThanOrEqual(48);
      const ix = Math.min(b.x + b.w, boxes.game.x + boxes.game.w) - Math.max(b.x, boxes.game.x);
      const iy = Math.min(b.y + b.h, boxes.game.y + boxes.game.h) - Math.max(b.y, boxes.game.y);
      expect(ix > 1 && iy > 1, name + ' overlaps the screen').toBe(false);
    }
    await page.screenshot({ path: `${ART}/ronin-boss-phone-land.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});

test.describe('portrait phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  test('portrait controls stay at least 48px and off the torch', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await page.evaluate(() => {
      const S = __SQ;
      S.G.state = 'play';
      S.G.story = 'ronin';
      S.P.items = { sword: true };
      S.P.melee = 'sword';
      S.flag('space_board');
      S.flag('oe_rn_torch');
      S.flag('rn_torch');
      S.warp('rn_torch', 6, 8, 3);
      S.G.bannerT = 0;
      for (let i = 0; i < 6 && (S.script || S.dlg); i++) {
        if (S.dlg) S.skipText();
        S.press('talk', true); S.step(1); S.press('talk', false); S.step(1);
      }
      S.step(2);
    });
    await page.evaluate(() => window.__SRML_LAYOUT && window.__SRML_LAYOUT());
    const attack = await page.evaluate(() => {
      const el = document.querySelector('[data-b="attack"]');
      const r = el.getBoundingClientRect();
      const game = document.querySelector('#game').getBoundingClientRect();
      const ix = Math.min(r.right, game.right) - Math.max(r.left, game.left);
      const iy = Math.min(r.bottom, game.bottom) - Math.max(r.top, game.top);
      return { w: r.width, h: r.height, overlap: ix > 1 && iy > 1, land: innerWidth > innerHeight };
    });
    expect(attack.land).toBe(false);
    expect(attack.w).toBeGreaterThanOrEqual(48);
    expect(attack.h).toBeGreaterThanOrEqual(48);
    expect(attack.overlap).toBe(false);
    await page.screenshot({ path: `${ART}/ronin-torch-phone-portrait.png` });
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
