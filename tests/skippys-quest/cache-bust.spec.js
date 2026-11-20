import { test, expect } from '@playwright/test';
import fs from 'fs';

const HTML_PATH = '/agent/repos/previews/skippys-quest/index.html';
const ART = '/opt/cursor/artifacts';
const BARE = 'https://sanyziahj.github.io/previews/skippys-quest/';
const BUILD = 'b49';

fs.mkdirSync(ART, { recursive: true });

function cacheScript(html) {
  const match = html.match(/<script>([\s\S]*?)<\/script>/);
  expect(match, 'first head script').toBeTruthy();
  return match[1];
}

function buildIds(script) {
  const build = script.match(/window\.__SQ_BUILD="(b\d+)"/);
  const check = script.match(/\[\?&\]v=(b\d+)\(\?:&\|\$\)/);
  const set = script.match(/searchParams\.set\("v","(b\d+)"\)/);
  expect(build, script).toBeTruthy();
  expect(check, script).toBeTruthy();
  expect(set, script).toBeTruthy();
  return { build: build[1], check: check[1], set: set[1] };
}

async function installPages(page, html) {
  const docs = [];
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('request', (req) => {
    if (req.resourceType() === 'document') docs.push(req.url());
  });
  await page.addInitScript(() => {
    window.__SQ_DEBUG = true;
  });
  await page.route('**/*', async (route) => {
    const req = route.request();
    if (req.resourceType() === 'document') {
      await route.fulfill({
        status: 200,
        contentType: 'text/html; charset=utf-8',
        body: html,
      });
      return;
    }
    await route.abort();
  });
  return { docs, errors };
}

test('cache-bust build id, version check, and redirect write are the same', () => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const ids = buildIds(cacheScript(html));
  expect(ids.build).toBe(ids.check);
  expect(ids.set).toBe(ids.build);
  expect(ids.build).toBe(BUILD);
  expect(html.split('noindex').length - 1).toBe(1);
  expect(html).toContain('<meta name="robots" content="noindex,nofollow">');
});

test('a bare github.io open redirects once to v=b49 and shows the title screen', async ({ page }) => {
  test.setTimeout(60000);
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const ids = buildIds(cacheScript(html));
  expect(ids.build).toBe(ids.set);
  expect(ids.set).toBe(BUILD);

  const { docs, errors } = await installPages(page, html);

  const landed = page.waitForURL(
    (url) => /[?&]v=b49(?:&|$)/.test(url.search) && url.hostname.endsWith('github.io'),
    { timeout: 15000, waitUntil: 'domcontentloaded' },
  );
  await page.goto(BARE, { waitUntil: 'commit', timeout: 15000 });
  await landed;
  await page.waitForFunction(() => {
    const live = document.getElementById('sr-live');
    return !!(
      window.__SQ &&
      __SQ.G &&
      __SQ.G.state === 'stories' &&
      document.documentElement.dataset.touch === 'title' &&
      live &&
      /SKIPPY'S QUEST/.test(live.textContent || '')
    );
  });

  const finalUrl = new URL(page.url());
  expect(finalUrl.hostname).toBe('sanyziahj.github.io');
  expect(finalUrl.pathname).toBe('/previews/skippys-quest/');
  expect(finalUrl.searchParams.get('v')).toBe(BUILD);
  expect(docs).toEqual([BARE, `${BARE}?v=${BUILD}`]);

  await page.waitForTimeout(600);
  expect(docs, 'redirect must happen once').toEqual([BARE, `${BARE}?v=${BUILD}`]);

  const view = await page.evaluate(() => {
    const canvas = document.querySelector('#game');
    const ctx = canvas.getContext('2d');
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let lit = 0;
    for (let i = 0; i < pixels.length; i += 16) {
      if (pixels[i] + pixels[i + 1] + pixels[i + 2] > 48) lit += 1;
    }
    return {
      state: __SQ.G.state,
      touch: document.documentElement.dataset.touch,
      build: __SQ.build(),
      live: document.getElementById('sr-live').textContent,
      robots: document.querySelectorAll('meta[name="robots"]').length,
      robotsContent: document.querySelector('meta[name="robots"]').getAttribute('content'),
      lit,
    };
  });
  expect(view.state).toBe('stories');
  expect(view.touch).toBe('title');
  expect(view.build).toBe(BUILD);
  expect(view.live).toContain("SKIPPY'S QUEST");
  expect(view.live).toContain('RIDER CHAPTERS');
  expect(view.robots).toBe(1);
  expect(view.robotsContent).toBe('noindex,nofollow');
  expect(view.lit).toBeGreaterThan(200);
  expect(errors, errors.join('\n')).toEqual([]);

  await page.screenshot({ path: `${ART}/skippys-quest-title-screen.png` });
});

test('opening github.io with v=b49 already set does not redirect again', async ({ page }) => {
  test.setTimeout(60000);
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const { docs, errors } = await installPages(page, html);
  const ready = `${BARE}?v=${BUILD}`;
  await page.goto(ready, { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForFunction(() => window.__SQ && __SQ.G && __SQ.G.state === 'stories');
  await page.waitForTimeout(400);
  expect(page.url()).toBe(ready);
  expect(docs).toEqual([ready]);
  expect(errors, errors.join('\n')).toEqual([]);
});
