import { test, expect } from '@playwright/test';
import fs from 'fs';

const ART = '/opt/cursor/artifacts/skippys-quest';
const ROOT = '/opt/cursor/artifacts';
const GAME = '/skippys-quest/index.html';
fs.mkdirSync(ART, { recursive: true });
fs.mkdirSync(ROOT, { recursive: true });

function track(page) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  return errors;
}

async function boot(page) {
  await page.addInitScript(() => {
    window.__SQ_DEBUG = true;
  });
  const errors = track(page);
  await page.goto(GAME);
  await page.waitForFunction(() => window.__SQ);
  await page.locator('#game').focus();
  return errors;
}

function shot(page, name, full) {
  const target = full ? page : page.locator('#game');
  return target.screenshot({ path: `${ART}/${name}` }).then(() => {
    fs.copyFileSync(`${ART}/${name}`, `${ROOT}/${name}`);
  });
}

test('dream posters are drawn and the rope pulls them down', async ({ page }) => {
  const errors = await boot(page);
  const robots = await page.locator('meta[name="robots"]').count();
  expect(robots).toBe(1);
  expect(await page.locator('meta[name="robots"]').first().getAttribute('content')).toBe('noindex,nofollow');
  const cache = await page.evaluate(() => document.querySelector('script').textContent);
  expect(cache).toContain('window.__SQ_BUILD="b44"');
  expect(cache).toContain('v=b44');

  const drawn = await page.evaluate(() => {
    const S = __SQ;
    function quiet() {
      for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
        S.skipText();
        S.press('talk', true);
        S.step(1);
        S.press('talk', false);
        S.step(1);
      }
    }
    function pin() {
      S.ents.forEach((e, i) => {
        e.dead = false;
        e.hp = 1;
        e.stun = 99;
        e.vx = 0;
        e.vy = 0;
        e.x = i ? 248 : 36;
        e.y = 184;
      });
    }
    function sample() {
      const g = document.getElementById('game').getContext('2d');
      const ax = Math.round(S.cam.x);
      const ay = Math.round(S.cam.y);
      function count(tx, ty, ox, oy) {
        const sx = Math.round((tx + 0.5) * 16 - ax);
        const sy = Math.round((ty + 0.5) * 16 - ay + 24);
        const data = g.getImageData(sx + ox, sy + oy, 2, 2).data;
        let cream = 0;
        let hat = 0;
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const gc = data[i + 1];
          const b = data[i + 2];
          if (r > 240 && gc > 220 && b > 180 && b < 230) cream++;
          if (r > 100 && r < 145 && gc > 55 && gc < 95 && b > 20 && b < 60) hat++;
        }
        return { cream, hat, x: sx + ox, y: sy + oy };
      }
      return (S.A.props || [])
        .filter((p) => p.k === 'poster')
        .map((p) => ({
          id: p.id,
          hat: !!p.hat,
          down: !!S.flags[p.id],
          paper: count(p.x, p.y, -8, -22),
          crown: count(p.x, p.y, -4, -42),
        }));
    }
    S.setManual(true);
    S.G.state = 'play';
    S.G.story = 'ros';
    S.G.paused = false;
    S.P.items = { blasters: true, lasso: true, bomb: true };
    S.P.melee = '';
    S.P.wep = 'lasers';
    S.P.tool = 'lasso';
    S.P.act = 'lasso';
    S.P.pri = 'lasso';
    S.P.sec = 'bomb';
    S.P.z = 'lasso';
    S.P.cds = {};
    S.P.arrowCd = 0;
    S.flag('lasso_got');
    S.flag('bomb_got');
    S.flag('oe_ros_dream');
    ['yard_clear', 'accused_done', 'dust_got', 'proof1', 'cv_ping', 'truce', 'proof3', 'noodle_done', 'bots_done'].forEach((f) => S.flag(f));
    ['p1', 'p2', 'p3', 'p4', 'dream_win', 'fear_rope'].forEach((f) => S.flag(f, false));
    S.warp('ros_dream', 6, 11, 1);
    quiet();
    S.P.tool = 'lasso';
    S.P.pri = 'lasso';
    S.P.sec = 'bomb';
    S.P.act = 'lasso';
    S.P.melee = '';
    S.P.wep = 'lasers';
    pin();
    S.P.x = (6 + 0.5) * 16;
    S.P.y = (11 + 0.5) * 16;
    S.P.dir = 1;
    S.G.bannerT = 0;
    S.G.toastT = 0;
    S.G.saveT = 0;
    S.G.shake = 0;
    S.step(40);
    pin();
    S.P.x = (6 + 0.5) * 16;
    S.P.y = (11 + 0.5) * 16;
    S.P.dir = 1;
    S.G.bannerT = 0;
    S.G.toastT = 0;
    S.G.saveT = 0;
    S.step(1);
    const first = sample();
    S.step(0);
    const second = sample();
    const labels = (window.__SQ_LABELS || []).map((l) => l.text);
    const ink = (S.worldInk() || []).map((w) => w.t);
    return {
      build: S.build(),
      area: S.A.id,
      name: S.A.name,
      hud: S.hud().map((b) => b.text).join(' '),
      hands: S.hands(),
      melee: S.melee(),
      labels,
      ink,
      first,
      second,
      fears: S.ents.filter((e) => e.k === 'fear').length,
    };
  });

  expect(drawn.build).toBe('b44');
  expect(drawn.area).toBe('ros_dream');
  expect(drawn.name).toBe('THE DREAM');
  expect(drawn.hud).toContain('Z ROPE');
  expect(drawn.hud).toContain('X LASERS');
  expect(drawn.hands.item).toBe('lasso');
  expect(drawn.melee).toBe('');
  expect(drawn.fears).toBe(2);
  expect(drawn.labels.join(' ')).not.toMatch(/SIGN/);
  expect(drawn.ink.join(' ')).not.toMatch(/SIGN/);
  expect(drawn.first.map((p) => p.id)).toEqual(['p1', 'p2', 'p3', 'p4']);
  for (const poster of drawn.first) {
    expect(poster.paper.cream, JSON.stringify(poster)).toBeGreaterThanOrEqual(3);
    expect(poster.down).toBe(false);
  }
  const hat = drawn.first.find((p) => p.hat);
  const bare = drawn.first.filter((p) => !p.hat);
  expect(hat.id).toBe('p1');
  expect(hat.crown.hat, JSON.stringify(hat)).toBeGreaterThanOrEqual(3);
  for (const poster of bare) expect(poster.crown.hat, JSON.stringify(poster)).toBe(0);
  for (let i = 0; i < 4; i++) {
    expect(drawn.second[i].paper.cream).toBeGreaterThanOrEqual(3);
    expect(drawn.second[i].crown.hat).toBe(drawn.first[i].crown.hat);
  }
  await shot(page, 'b41-dream-posters.png');

  await page.keyboard.press('z');
  const missed = await page.evaluate(() => {
    const S = __SQ;
    S.P.x = (4 + 0.5) * 16;
    S.P.y = (10 + 0.5) * 16;
    S.P.dir = 1;
    S.P.cds = {};
    S.P.arrowCd = 0;
    S.ents.forEach((e, i) => {
      e.stun = 99;
      e.x = i ? 248 : 36;
      e.y = 184;
    });
    S.step(2);
    return { p1: !!S.flags.p1, toast: S.toast().text };
  });
  expect(missed.p1, JSON.stringify(missed)).toBe(false);

  await page.keyboard.press('z');
  const pulled = await page.evaluate(() => {
    const S = __SQ;
    function sample(tx, ty) {
      const g = document.getElementById('game').getContext('2d');
      const ax = Math.round(S.cam.x);
      const ay = Math.round(S.cam.y);
      const sx = Math.round((tx + 0.5) * 16 - ax);
      const sy = Math.round((ty + 0.5) * 16 - ay + 24);
      const data = g.getImageData(sx - 8, sy - 22, 2, 2).data;
      let cream = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 240 && data[i + 1] > 220 && data[i + 2] > 180 && data[i + 2] < 230) cream++;
      }
      return cream;
    }
    S.P.x = (4 + 0.5) * 16;
    S.P.y = (7 + 0.5) * 16;
    S.P.dir = 1;
    S.P.tool = 'lasso';
    S.P.pri = 'lasso';
    S.P.cds = {};
    S.P.arrowCd = 0;
    S.G.bannerT = 0;
    S.G.saveT = 0;
    S.ents.forEach((e, i) => {
      e.stun = 99;
      e.dead = false;
      e.x = i ? 248 : 36;
      e.y = 184;
    });
    S.press('up', false);
    S.press('down', false);
    S.press('left', false);
    S.press('right', false);
    S.step(3);
    const live = {
      p1: !!S.flags.p1,
      p2: !!S.flags.p2,
      p3: !!S.flags.p3,
      p4: !!S.flags.p4,
      toast: S.toast().text,
      rope: S.G.ropeT > 0,
      hud: S.hud().map((b) => b.text).join(' '),
      cream: { p1: sample(4, 5), p2: sample(8, 6), p3: sample(12, 5) },
    };
    return live;
  });
  expect(pulled.p1, JSON.stringify(pulled)).toBe(true);
  expect(pulled.p2).toBe(false);
  expect(pulled.p3).toBe(false);
  expect(pulled.p4).toBe(false);
  expect(pulled.toast).toBe('POSTER DOWN.');
  expect(pulled.rope).toBe(true);
  expect(pulled.hud).toContain('Z ROPE');
  expect(pulled.cream.p1, JSON.stringify(pulled.cream)).toBe(0);
  expect(pulled.cream.p2).toBeGreaterThanOrEqual(3);
  expect(pulled.cream.p3).toBeGreaterThanOrEqual(3);
  await shot(page, 'b41-rope-pull.png');

  const rest = await page.evaluate(() => {
    const S = __SQ;
    function sample(tx, ty) {
      const g = document.getElementById('game').getContext('2d');
      const ax = Math.round(S.cam.x);
      const ay = Math.round(S.cam.y);
      const sx = Math.round((tx + 0.5) * 16 - ax);
      const sy = Math.round((ty + 0.5) * 16 - ay + 24);
      const data = g.getImageData(sx - 8, sy - 22, 2, 2).data;
      let cream = 0;
      for (let i = 0; i < data.length; i += 4) {
        if (data[i] > 240 && data[i + 1] > 220 && data[i + 2] > 180 && data[i + 2] < 230) cream++;
      }
      return cream;
    }
    function pull(tx, ty) {
      S.P.x = (tx + 0.5) * 16;
      S.P.y = ((ty + 2) + 0.5) * 16;
      S.P.dir = 1;
      S.P.tool = 'lasso';
      S.P.pri = 'lasso';
      S.P.cds = {};
      S.P.arrowCd = 0;
      S.ents.forEach((e, i) => {
        e.stun = 99;
        e.x = 16;
        e.y = 16 + i * 8;
      });
      S.press('item', true);
      S.step(2);
      S.press('item', false);
      S.step(1);
    }
    S.G.toastT = 0;
    S.G.ropeT = 0;
    S.P.x = (4 + 0.5) * 16;
    S.P.y = (5 + 0.5) * 16;
    S.P.dir = 1;
    S.P.cds = {};
    S.press('item', true);
    S.step(2);
    S.press('item', false);
    S.step(1);
    const again = { p1: !!S.flags.p1, p2: !!S.flags.p2, p3: !!S.flags.p3, p4: !!S.flags.p4 };
    const fear = S.ents.find((e) => e.k === 'fear');
    fear.dead = false;
    fear.hp = 1;
    fear.stun = 0;
    fear.x = S.P.x + 24;
    fear.y = S.P.y;
    const other = S.ents.filter((e) => e !== fear);
    other.forEach((e) => {
      e.x = 16;
      e.y = 16;
      e.stun = 99;
    });
    S.P.dir = 3;
    S.P.cds = {};
    S.shots.length = 0;
    const hpBefore = S.P.hp;
    S.press('attack', true);
    S.step(10);
    S.press('attack', false);
    S.step(4);
    S.P.x = (6 + 0.5) * 16;
    S.P.y = (11 + 0.5) * 16;
    S.G.toastT = 0;
    S.G.bannerT = 0;
    S.step(1);
    const fed = {
      dead: !!fear.dead,
      win: !!S.flags.dream_win,
      p1: !!S.flags.p1,
      cream: sample(4, 5),
      hp: S.P.hp,
      hpBefore,
      shots: S.shots.filter((s) => s.laser).length,
    };
    pull(4, 5);
    pull(8, 6);
    pull(12, 5);
    pull(10, 9);
    for (let i = 0; i < 16; i++) {
      if (S.flags.dream_win && S.A.id === 'ros_pour' && !S.script) break;
      if (S.dlg) {
        S.skipText();
        S.press('talk', true);
        S.step(1);
        S.press('talk', false);
        S.step(2);
      } else S.step(2);
    }
    return {
      again,
      fed,
      win: !!S.flags.dream_win,
      steady: !!S.flags.steady,
      area: S.A.id,
      script: !!S.script,
    };
  });
  expect(rest.again, JSON.stringify(rest.again)).toEqual({ p1: true, p2: false, p3: false, p4: false });
  expect(rest.fed.dead, JSON.stringify(rest.fed)).toBe(true);
  expect(rest.fed.win).toBe(false);
  expect(rest.fed.p1).toBe(false);
  expect(rest.fed.cream).toBeGreaterThanOrEqual(3);
  expect(rest.fed.hp).toBe(rest.fed.hpBefore);
  expect(rest.win, JSON.stringify(rest)).toBe(true);
  expect(rest.steady).toBe(true);
  expect(rest.area).toBe('ros_pour');
  expect(rest.script).toBe(false);
  expect(errors, errors.join('\n')).toEqual([]);
});

test.describe('phone landscape', () => {
  test.use({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true });
  test('landscape ITEM with Z ROPE pulls a dream poster', async ({ page }) => {
    const errors = await boot(page);
    await page.waitForFunction(() => document.documentElement.classList.contains('srml'));
    await page.evaluate(() => {
      const S = __SQ;
      S.setManual(true);
      S.G.state = 'play';
      S.G.story = 'ros';
      S.G.paused = false;
      S.P.items = { blasters: true, lasso: true, bomb: true };
      S.P.melee = '';
      S.P.wep = 'lasers';
      S.P.tool = 'lasso';
      S.P.act = 'lasso';
      S.P.pri = 'lasso';
      S.P.sec = 'bomb';
      S.P.z = 'lasso';
      S.P.cds = {};
      S.flag('lasso_got');
      S.flag('bomb_got');
      S.flag('oe_ros_dream');
      ['yard_clear', 'accused_done', 'dust_got', 'proof1', 'cv_ping', 'truce', 'proof3', 'noodle_done', 'bots_done'].forEach((f) => S.flag(f));
      ['p1', 'p2', 'p3', 'p4', 'dream_win'].forEach((f) => S.flag(f, false));
      S.warp('ros_dream', 12, 7, 1);
      for (let i = 0; i < 8 && (S.script || S.dlg); i++) {
        S.skipText();
        S.press('talk', true);
        S.step(1);
        S.press('talk', false);
        S.step(1);
      }
      S.P.tool = 'lasso';
      S.P.pri = 'lasso';
      S.P.sec = 'bomb';
      S.P.melee = '';
      S.P.wep = 'lasers';
      S.P.x = (12 + 0.5) * 16;
      S.P.y = (7 + 0.5) * 16;
      S.P.dir = 1;
      S.ents.forEach((e, i) => {
        e.stun = 99;
        e.x = i ? 40 : 280;
        e.y = 184;
      });
      S.G.bannerT = 0;
      S.G.toastT = 0;
      S.G.saveT = 0;
      S.step(20);
      S.P.x = (12 + 0.5) * 16;
      S.P.y = (7 + 0.5) * 16;
      S.P.dir = 1;
      S.P.cds = {};
      S.step(1);
    });
    const before = await page.evaluate(() => {
      const item = document.querySelector('[data-b="item"]');
      const r = item.getBoundingClientRect();
      return {
        land: document.documentElement.dataset.land,
        label: (item.textContent || '').trim(),
        w: r.width,
        h: r.height,
        hud: __SQ.hud().map((b) => b.text).join(' '),
        p3: !!__SQ.flags.p3,
      };
    });
    expect(before.land).toBe('1');
    expect(before.label).toBe('ITEM');
    expect(before.w).toBeGreaterThan(40);
    expect(before.hud).toContain('Z ROPE');
    expect(before.p3).toBe(false);
    await page.locator('[data-b="item"]').tap();
    const after = await page.evaluate(() => {
      const S = __SQ;
      S.step(3);
      return {
        p1: !!S.flags.p1,
        p2: !!S.flags.p2,
        p3: !!S.flags.p3,
        p4: !!S.flags.p4,
        toast: S.toast().text,
        hud: S.hud().map((b) => b.text).join(' '),
        rope: S.G.ropeT > 0,
        item: S.hands().item,
      };
    });
    expect(after.p3, JSON.stringify(after)).toBe(true);
    expect(after.p1).toBe(false);
    expect(after.p2).toBe(false);
    expect(after.p4).toBe(false);
    expect(after.toast).toBe('POSTER DOWN.');
    expect(after.rope).toBe(true);
    expect(after.hud).toContain('Z ROPE');
    expect(after.item).toBe('lasso');
    await shot(page, 'b41-phone-item-rope.png', true);
    expect(errors, errors.join('\n')).toEqual([]);
  });
});
