import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

test.use({ hasTouch: true });

const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 390, height: 700 },
  { width: 440, height: 894 },
  { width: 480, height: 900 },
];

async function saveEvidence(name, bytes) {
  const directory = process.env.R4_F_EVIDENCE_DIR;
  if (!directory) return;
  await mkdir(directory, { recursive: true });
  await writeFile(path.join(directory, name), bytes);
}

async function openSelectedCard(page, { width, height, handSize }) {
  await page.setViewportSize({ width, height });
  await page.goto(`/tests/browser/fixture.html?state=normal&count=4&handSize=${handSize}`);
  await expect(page.locator(".local-hand-rail")).toHaveAttribute("data-hand-layout", "measured");
  const slot = page.locator('[data-hand-card-id="browser-hand-1"]');
  const face = slot.locator(".game-card");
  await face.click({ position: { x: 8, y: 50 } });
  await expect(face).toHaveClass(/selected/);
  const detailsAction = slot.getByTestId("hand-card-details-action");
  await expect(detailsAction).toBeVisible();
  let latestGeometry;
  try {
    await expect.poll(async () => {
      latestGeometry = await measureCardAndDetails(face, detailsAction);
      return Math.abs(latestGeometry.action.y + latestGeometry.action.height - (latestGeometry.face.y + latestGeometry.face.height));
    }).toBeLessThanOrEqual(1);
  } catch (error) {
    throw new Error(`${error.message}\nLatest card geometry: ${JSON.stringify(latestGeometry)}`);
  }
  return { slot, face, detailsAction };
}

async function measureCardAndDetails(face, detailsAction) {
  const faceRect = await face.boundingBox();
  const actionRect = await detailsAction.boundingBox();
  const layout = await face.evaluate((element) => {
    const rect = (node) => {
      const { x, y, width, height, top, bottom } = node.getBoundingClientRect();
      return { x, y, width, height, top, bottom };
    };
    return {
      slot: rect(element.closest(".card-slot")),
      visual: rect(element.closest(".hand-card-visual")),
      face: rect(element),
      slotClass: element.closest(".card-slot").className,
      faceClass: element.className,
      visualTransform: getComputedStyle(element.closest(".hand-card-visual")).transform,
      faceTransform: getComputedStyle(element).transform,
    };
  });
  const actionLayout = await detailsAction.evaluate((element) => ({
    transform: getComputedStyle(element).transform,
    transitionDuration: getComputedStyle(element).transitionDuration,
    parentTransform: getComputedStyle(element.parentElement).transform,
  }));
  return {
    face: faceRect,
    action: actionRect,
    layout,
    actionLayout,
    actionInsideFace: actionRect.x >= faceRect.x - 1
      && actionRect.y >= faceRect.y - 1
      && actionRect.x + actionRect.width <= faceRect.x + faceRect.width + 1
      && actionRect.y + actionRect.height <= faceRect.y + faceRect.height + 1,
  };
}

test("R4-F reference: DETAILS stays inside the selected four-card Attack at 390×844", async ({ page }, testInfo) => {
  const { face, detailsAction } = await openSelectedCard(page, { width: 390, height: 844, handSize: 4 });
  const before = await measureCardAndDetails(face, detailsAction);
  const beforeScreenshot = await page.screenshot();
  const beforeGeometry = Buffer.from(JSON.stringify(before, null, 2));
  await testInfo.attach("r4-f-after-fix-selected-attack.png", { body: beforeScreenshot, contentType: "image/png" });
  await testInfo.attach("r4-f-after-fix-card-button-geometry.json", { body: beforeGeometry, contentType: "application/json" });
  await saveEvidence("r4-f-after-selected-attack-390x844.png", beforeScreenshot);
  await saveEvidence("r4-f-after-card-button-geometry.json", beforeGeometry);
  expect(before.actionInsideFace, `DETAILS must fit in the CardFace: ${JSON.stringify(before)}`).toBe(true);
  expect(before.action.width).toBeGreaterThanOrEqual(44);
  expect(before.action.height).toBeGreaterThanOrEqual(44);
  expect(Math.abs(before.action.y + before.action.height - (before.face.y + before.face.height))).toBeLessThanOrEqual(1);

  await detailsAction.tap();
  const details = page.getByRole("dialog");
  await expect(details).toBeVisible();
  await expect(details.getByRole("heading", { name: /Attack/ })).toHaveCount(1);
  await expect(details.getByRole("textbox", { name: "Canonical rules for Attack" })).toHaveValue(/.+/);
  await expect(face).toHaveClass(/selected/);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  const panel = await details.boundingBox();
  const afterGeometry = Buffer.from(JSON.stringify({ ...before, panel }, null, 2));
  const afterScreenshot = await page.screenshot();
  await testInfo.attach("r4-f-after-compact-details.png", { body: afterScreenshot, contentType: "image/png" });
  await saveEvidence("r4-f-after-compact-details-390x844.png", afterScreenshot);
  await saveEvidence("r4-f-after-compact-geometry.json", afterGeometry);
});

test("R4-I Hand Details toggles the same preview without changing the selected card", async ({ page }) => {
  const { face, detailsAction } = await openSelectedCard(page, { width: 390, height: 844, handSize: 4 });
  await detailsAction.tap();
  const details = page.getByRole("dialog");
  await expect(details).toHaveAttribute("data-card-details-card-id", "browser-hand-1");
  await expect(face).toHaveClass(/selected/);
  await detailsAction.tap();
  await expect(details).toHaveCount(0);
  await expect(detailsAction).toBeFocused();
  await expect(face).toHaveClass(/selected/);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

test("R4-F details grow for long canonical rules and scroll only the rules area", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=normal&count=4&handSize=3&handKind=Attack");
  const openDetails = async () => {
    const face = page.locator('[data-hand-card-id="browser-hand-1"] .game-card');
    await face.click({ position: { x: 8, y: 50 } });
    await page.getByTestId("hand-card-details-action").tap();
    const panel = page.getByRole("dialog");
    await expect(panel).toBeVisible();
    return panel;
  };

  let panel = await openDetails();
  const shortRules = panel.getByRole("textbox", { name: "Canonical rules for Attack" });
  const shortRulesHeight = (await shortRules.boundingBox()).height;
  const shortPanelHeight = (await panel.boundingBox()).height;
  await page.keyboard.press("Escape");

  await page.goto("/tests/browser/fixture.html?state=normal&count=4&handSize=3&handKind=BumperHarvest");
  panel = await openDetails();
  const longRules = panel.getByRole("textbox", { name: "Canonical rules for Bumper Harvest" });
  await expect(longRules).toHaveValue(/any card left over is discarded when the sequence ends\./);
  const longRulesGeometry = await longRules.evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight,
    rows: element.rows,
  }));
  const longPanelHeight = (await panel.boundingBox()).height;
  const longEvidence = Buffer.from(JSON.stringify({
    panel: await panel.boundingBox(),
    rules: longRulesGeometry,
  }, null, 2));
  expect(longRulesGeometry.rows).toBeGreaterThan(4);
  expect(longRulesGeometry.scrollHeight).toBeGreaterThan(longRulesGeometry.clientHeight);
  expect(longPanelHeight).toBeGreaterThan(shortPanelHeight);
  expect(longPanelHeight).toBeLessThan(210);
  expect(longRulesGeometry.clientHeight).toBeGreaterThan(shortRulesHeight);
  const longScreenshot = await page.screenshot();
  await testInfo.attach("r4-f-after-long-rules-details.png", { body: longScreenshot, contentType: "image/png" });
  await testInfo.attach("r4-f-after-long-rules-geometry.json", { body: longEvidence, contentType: "application/json" });
  await saveEvidence("r4-f-after-long-rules-details-390x844.png", longScreenshot);
  await saveEvidence("r4-f-after-long-rules-geometry.json", longEvidence);
  await longRules.evaluate((element) => { element.scrollTop = element.scrollHeight; });
  expect(await longRules.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  expect(await panel.isVisible()).toBe(true);
});

for (const viewport of VIEWPORTS) {
  for (const handSize of [3, 5, 8]) {
    test(`R4-F ${handSize}-card hand details fit ${viewport.width}×${viewport.height}`, async ({ page }, testInfo) => {
      const { slot, face, detailsAction } = await openSelectedCard(page, { ...viewport, handSize });
      const geometry = await measureCardAndDetails(face, detailsAction);
      expect(geometry.actionInsideFace, `DETAILS is contained by CardFace: ${JSON.stringify(geometry)}`).toBe(true);
      expect(geometry.action.width).toBeGreaterThanOrEqual(44);
      expect(geometry.action.height).toBeGreaterThanOrEqual(44);
      expect(Math.abs(geometry.action.y + geometry.action.height - (geometry.face.y + geometry.face.height))).toBeLessThanOrEqual(1);
      expect(await detailsAction.evaluate((button) => {
        const rect = button.getBoundingClientRect();
        return document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2) === button;
      })).toBe(true);
      await detailsAction.tap();

      const details = page.getByRole("dialog");
      await expect(details).toBeVisible();
      await expect(details).toHaveAttribute("data-card-details-context", "private-hand");
      await expect(details.getByRole("heading", { name: /Attack/ })).toHaveCount(1);
      await expect(details.getByRole("textbox", { name: "Canonical rules for Attack" })).toHaveValue(/.+/);
      await expect(details.locator(".card-details-heading, .card-details-rules-label")).toHaveCount(0);
      await expect(details.getByText("PRIVATE TO YOU", { exact: true })).toBeHidden();
      const panel = await details.boundingBox();
      expect(panel.height, "the preview adapts to its contents without the old fixed empty panel").toBeLessThan(210);
      expect(panel.width).toBeLessThanOrEqual(viewport.width);
      const stage = await details.evaluate((element) => {
        const { left, right, top, bottom } = element.parentElement.getBoundingClientRect();
        return { left, right, top, bottom };
      });
      expect(panel.x).toBeGreaterThanOrEqual(stage.left - 1);
      expect(panel.x + panel.width).toBeLessThanOrEqual(stage.right + 1);
      expect(panel.y).toBeGreaterThanOrEqual(stage.top - 1);
      expect(panel.y + panel.height).toBeLessThanOrEqual(stage.bottom + 1);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await expect(face).toHaveClass(/selected/);
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

      if (viewport.width === 390 && viewport.height === 844 && handSize === 3) {
        await testInfo.attach("r4-f-after-390x844-three-card-details.png", { body: await page.screenshot(), contentType: "image/png" });
        await testInfo.attach("r4-f-after-geometry.json", { body: Buffer.from(JSON.stringify({ ...geometry, panel }, null, 2)), contentType: "application/json" });
      }

      await page.keyboard.press("Escape");
      await expect(details).toHaveCount(0);
      await expect(detailsAction).toBeFocused();
      await expect(face).toHaveClass(/selected/);
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
      await face.click({ position: { x: 8, y: 12 } });
      await expect(face).not.toHaveClass(/selected/);
      await expect(slot.getByTestId("hand-card-details-action")).toHaveCount(0);
    });
  }
}

test("R4-F dismisses outside and leaves the underlying game control usable", async ({ page }) => {
  const { detailsAction } = await openSelectedCard(page, { width: 390, height: 844, handSize: 5 });
  await detailsAction.tap();
  const details = page.getByRole("dialog");
  await expect(details).toBeVisible();
  const systemMenu = page.getByRole("button", { name: "System menu" });
  await expect(systemMenu).toBeEnabled();
  await systemMenu.click();
  await expect(details).toHaveCount(0);
  await expect(systemMenu).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

test("R4-F Details preserves a selected Attack through the normal target-and-Play flow", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=ordinary-turn&count=4");
  const attack = page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card');
  await attack.click({ position: { x: 8, y: 50 } });
  await expect(attack).toHaveClass(/selected/);
  const detailsAction = page.getByTestId("hand-card-details-action");
  await detailsAction.tap();
  const details = page.getByRole("dialog");
  await expect(details).toBeVisible();
  expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card"))).toEqual([]);
  await page.keyboard.press("Escape");
  await expect(details).toHaveCount(0);
  await expect(attack).toHaveClass(/selected/);
  await page.getByRole("button", { name: "Select Player 2", exact: true }).click();
  const play = page.locator('.local-player-dock [data-action-slot="primary"] button.primary');
  await expect(play).toHaveText("Confirm");
  await expect(play).toBeEnabled();
  await play.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.at(-1))).toMatchObject({
    action: "play_card",
    extra: { cardId: "browser-ordinary-5", targetId: "p2" },
  });
});
