import { test, expect } from "@playwright/test";
import fs from "fs";

const ART = "/opt/cursor/artifacts/cosmic-academy";
const GAME = "/cosmic-academy/index.html";
fs.mkdirSync(ART, { recursive: true });

function track(page) {
  const errors = [];
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  page.on("console", (m) => {
    if (m.type() === "error") errors.push("console: " + m.text());
  });
  return errors;
}

async function boot(page) {
  await page.addInitScript(() => localStorage.clear());
  const errors = track(page);
  await page.goto(GAME);
  await page.waitForFunction(() => window.__AC && __AC.build === "b1");
  return errors;
}

async function shot(page, name) {
  await page.screenshot({ path: `${ART}/${name}.png` });
}

async function answerCorrect(page) {
  const correct = await page.evaluate(() => __AC.item.correct);
  await page.locator(`[data-answer=${JSON.stringify(correct)}]`).click();
  await expect(page.locator("#good")).toBeVisible();
  await expect(page.locator("#good")).toContainText(await page.evaluate(() => __AC.item.explain.slice(0, 24)));
  await page.locator('[data-act="next"]').click();
}

test("hub, one lesson in each class, and the art studio", async ({ page }) => {
  await page.setViewportSize({ width: 844, height: 390 });
  const errors = await boot(page);

  await expect(page.locator('meta[name="robots"]')).toHaveCount(1);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex,nofollow");
  await expect(page.locator("#build")).toHaveText("b1");
  await expect(page.locator("h1")).toContainText("Cosmic Academy");
  const html = await page.content();
  expect(html.toLowerCase()).not.toContain("zubic");
  expect(html.toLowerCase()).not.toContain("whiskey");
  expect(html.toLowerCase()).not.toContain("cigar");
  expect(html.toLowerCase()).not.toContain("cigarette");
  await shot(page, "hub-844x390");

  await page.setViewportSize({ width: 390, height: 844 });
  await page.reload();
  await page.waitForFunction(() => window.__AC && __AC.screen === "hub");
  await shot(page, "hub-390x844");

  await page.setViewportSize({ width: 844, height: 390 });
  await page.reload();
  await page.waitForFunction(() => window.__AC && __AC.screen === "hub");

  await page.getByRole("button", { name: "Math", exact: true }).click();
  await page.getByRole("button", { name: "Counting", exact: true }).click();
  await expect(page.locator(".dots i").first()).toBeVisible();
  await shot(page, "math-844x390");
  const wrong = page.locator('[data-act="answer"]').filter({ hasNot: page.locator("[data-answer]") });
  const correct = await page.evaluate(() => __AC.item.correct);
  await page.locator(`[data-act="answer"]:not([data-answer=${JSON.stringify(correct)}])`).first().click();
  await expect(page.locator("#explain")).toBeVisible();
  await expect(page.locator("#explain")).toContainText("Count each asteroid once");
  await page.locator('[data-act="similar"]').click();
  await expect(page.locator("#explain")).toHaveCount(0);
  await answerCorrect(page);
  await page.locator('[data-act="home"]').click();
  await expect(page.locator("h1")).toContainText("Cosmic Academy");

  await page.getByRole("button", { name: "Science", exact: true }).click();
  await page.getByRole("button", { name: "Day and night", exact: true }).click();
  await shot(page, "science-844x390");
  const scienceText = await page.locator("#screen").innerText();
  expect(scienceText.toLowerCase()).not.toContain("void");
  expect(scienceText.toLowerCase()).not.toContain("portal");
  expect(scienceText.toLowerCase()).not.toContain("maybe");
  await answerCorrect(page);
  await page.locator('[data-act="home"]').click();

  await page.getByRole("button", { name: "Tech", exact: true }).click();
  await page.getByRole("button", { name: "Input and output", exact: true }).click();
  await shot(page, "tech-844x390");
  await answerCorrect(page);
  await page.locator('[data-act="home"]').click();
  await page.getByRole("button", { name: "Tech", exact: true }).click();
  await page.getByRole("button", { name: "Belt tool", exact: true }).click();
  await page.locator('[data-op="forward"]').click();
  await page.locator('[data-op="forward"]').click();
  await page.locator('[data-op="forward"]').click();
  await page.locator('[data-act="run"]').click();
  await expect(page.locator("#belt-result")).toContainText("reached the star", { timeout: 10000 });
  await page.locator('[data-act="home"]').click();

  await page.getByRole("button", { name: "Language", exact: true }).click();
  await page.getByRole("button", { name: "Read a short story", exact: true }).click();
  await expect(page.locator(".story-flag")).toContainText("STORY");
  await expect(page.locator(".story-flag")).toContainText("not a science");
  await shot(page, "language-844x390");
  await answerCorrect(page);
  await page.locator('[data-act="home"]').click();

  await page.getByRole("button", { name: "Art", exact: true }).click();
  await page.getByRole("button", { name: /Color In/ }).click();
  await page.locator('[data-page="skippy-close"]').click();
  await page.waitForFunction(() => {
    const c = document.getElementById("art");
    return c && c.width > 10 && window.__AC.clientPoint;
  });
  await shot(page, "skippy-close-uncolored-844x390");
  await page.locator('[data-pot="blue"]').click();
  const pt = await page.evaluate(() => __AC.clientPoint("head"));
  await page.mouse.click(pt.x, pt.y);
  await page.waitForFunction(() => __AC.fills().head === "#2f6bff");
  const fills = await page.evaluate(() => __AC.fills());
  expect(fills.beanie).toBeUndefined();
  expect(fills.cuff).toBeUndefined();
  expect(fills.cheekL).toBeUndefined();
  expect(fills.cheekR).toBeUndefined();
  await shot(page, "skippy-head-filled-844x390");
  await shot(page, "art-844x390");
  await page.locator('[data-act="home"]').click();
  await page.locator('[data-act="leave"]').click();

  for (const who of ["spike", "santt", "ros"]) {
    await page.getByRole("button", { name: "Art", exact: true }).click();
    await page.getByRole("button", { name: /Color In/ }).click();
    await page.locator(`[data-page="${who}-close"]`).click();
    await page.waitForFunction(() => {
      const c = document.getElementById("art");
      return c && c.width > 10;
    });
    await shot(page, `${who}-close-844x390`);
    await page.locator('[data-act="home"]').click();
  }

  await page.getByRole("button", { name: "Art", exact: true }).click();
  await page.getByRole("button", { name: /Color Mix/ }).click();
  await page.locator('[data-pot="red"]').click();
  await page.locator('[data-pot="blue"]').click();
  await page.locator('[data-act="mix"]').click();
  await expect(page.locator("#mix-name")).toHaveText("Purple");
  const mixed = await page.evaluate(() => __AC.mix());
  expect(mixed.name).toBe("Purple");
  expect(mixed.hex.toLowerCase()).toBe("#7b3fd0");
  const planet = await page.evaluate(() => __AC.clientPoint("planet"));
  await page.mouse.click(planet.x, planet.y);
  await page.waitForFunction(() => __AC.fills().planet === "#7b3fd0");
  await page.locator('[data-act="home"]').click();
  await page.locator('[data-act="leave"]').click();

  await page.getByRole("button", { name: "Art", exact: true }).click();
  await page.getByRole("button", { name: /Learn to Draw/ }).click();
  await expect(page.locator("#step-title")).toHaveText("Circle head");
  const ink = page.locator("#ink");
  const box = await ink.boundingBox();
  await page.mouse.move(box.x + box.width * 0.55, box.y + box.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width * 0.75, box.y + box.height * 0.6);
  await page.mouse.up();
  expect(await page.evaluate(() => __AC.strokeCount())).toBeGreaterThan(0);
  for (let i = 0; i < 8; i++) {
    const title = await page.locator("#step-title").innerText();
    if (/Board/i.test(title)) break;
    await page.locator('[data-act="draw-next"]').click();
  }
  await expect(page.locator("#step-title")).toHaveText("Board");
  await page.locator('[data-act="draw-next"]').click();
  await expect(page.locator("#tip")).toContainText("finished");
  await page.locator('[data-act="home"]').click();
  await page.locator('[data-act="leave"]').click();

  await page.getByRole("button", { name: "Art", exact: true }).click();
  await page.getByRole("button", { name: /^Studio/ }).click();
  await page.locator('[data-tool="brush"]').click();
  const view = page.locator("#view");
  await expect(view).toBeVisible();
  const vb = await view.boundingBox();
  await page.mouse.move(vb.x + vb.width * 0.55, vb.y + vb.height * 0.45);
  await page.mouse.down();
  await page.mouse.move(vb.x + vb.width * 0.75, vb.y + vb.height * 0.62);
  await page.mouse.up();
  await page.locator('[data-stamp="board"]').click();
  await page.mouse.click(vb.x + vb.width * 0.62, vb.y + vb.height * 0.45);
  await page.locator('[data-act="save"]').click();
  await expect(page.locator("[data-gallery-thumb] img")).toBeVisible();
  const saved = await page.evaluate(() => __AC.gallery().length);
  expect(saved).toBeGreaterThan(0);
  expect(await page.evaluate(() => __AC.stars())).toBeGreaterThan(0);

  expect(errors, errors.join("\n")).toEqual([]);
});
