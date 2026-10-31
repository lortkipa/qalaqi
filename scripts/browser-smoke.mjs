import assert from "node:assert/strict";
import { chromium } from "playwright";

// Start Vite separately; set BROWSER_URL to test a deployed build instead.
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  headless: true,
  args: ["--no-sandbox", "--enable-unsafe-swiftshader"],
});
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto(process.env.BROWSER_URL || "http://localhost:5173");
  await page.waitForFunction(
    () => document.querySelector("#scene canvas")?.width > 0,
  );
  const bounds = await page.locator("#scene").boundingBox();
  assert.equal(bounds.width, 1440);
  assert.equal(bounds.height, 900);
  assert.equal(await page.locator(".mirror-glass").count(), 3);
  const rearBounds = await page.locator("#mirror-rear").boundingBox();
  const before = await page.screenshot({ clip: rearBounds });
  await page.click("#start");
  await page.keyboard.press("b");
  await page.keyboard.down("w");
  await page.waitForFunction(
    () => Number(document.querySelector("#speed").textContent) >= 3,
    {},
    { timeout: 60000 },
  );
  await page.keyboard.up("w");
  assert.match(await page.locator("#belt-status").textContent(), /secured/);
  assert.equal(
    await page.locator("#session-state").textContent(),
    "Practice in progress",
  );
  const after = await page.screenshot({ clip: rearBounds });
  assert.notDeepEqual(
    before,
    after,
    "Rear mirror must update as the vehicle moves",
  );
  await page.keyboard.press("p");
  assert.equal(await page.locator("#pause-overlay").isVisible(), true);
  const time = await page.locator("#timer").textContent();
  await page.waitForTimeout(1100);
  assert.equal(await page.locator("#timer").textContent(), time);
  await page.click("#route-drawer");
  await page.click('[data-route="7"]');
  assert.equal(await page.locator("#route-title").textContent(), "Route 08");
  assert.equal(await page.locator("#speed").textContent(), "0");
  await page.click("#route-drawer");
  await page.keyboard.press("r");
  await page.waitForFunction(
    () => document.querySelector("#gear").textContent === "R",
  );
  await page.click("#drive-help");
  assert.equal(await page.locator("#help-dialog").isVisible(), true);
  await page.click("#close-help");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  assert.equal(
    await page.evaluate(() => document.documentElement.scrollWidth),
    390,
  );
  assert.equal(await page.locator(".mobile-controls").isVisible(), true);
  assert.equal(await page.locator("#touch-reverse").isVisible(), true);
  await page.click("#route-drawer");
  assert.equal(await page.locator('[data-route="0"]').isVisible(), true);
  assert.deepEqual(errors, []);
  console.log(
    "Browser smoke passed: full viewport, live mirror updates, driving, seat belt, pause, route switching, reverse, help, mobile controls; no JavaScript errors.",
  );
} finally {
  await browser.close();
}
