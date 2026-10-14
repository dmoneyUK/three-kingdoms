import { expect, test } from "@playwright/test";

async function loadFixture(page, { count = 4, width, height = 900, state = "rest", equipmentCase = "matrix", targetHero = null }) {
  await page.setViewportSize({ width, height });
  const params = new URLSearchParams({ state, count: String(count), equipmentCase });
  if (targetHero) params.set("targetHero", targetHero);
  await page.goto(`/tests/browser/fixture.html?${params}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function seatGeometry(page) {
  return page.locator(".player-board [data-player-anchor]").evaluateAll((seats) => seats.map((seat) => {
    const { x, y, width, height } = seat.getBoundingClientRect();
    return { id: seat.dataset.playerAnchor, x, y, width, height };
  }));
}

function overlaps(a, b) {
  return Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x)
    && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);
}

function expectStableBox(before, after) {
  for (const dimension of ["x", "y", "width", "height"]) {
    expect(Math.abs(after[dimension] - before[dimension]), `Dock ${dimension} changed`).toBeLessThanOrEqual(2);
  }
}

test("clicking an opponent Hero opens the unified inspector without changing Stage identity", async ({ page }) => {
  await loadFixture(page, { state: "interaction", width: 480, height: 900 });
  const stage = page.locator('.play-table[data-seat-topology="top-row"] .interaction-stage');
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  const stageIdentity = await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage"].map((name) => [name, element.getAttribute(name)]),
  ));

  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  await expect(page.getByRole("dialog", { name: "Player 2 opponent inspection" })).toBeVisible();
  await expect(stage).toHaveAttribute("data-local-ui-mode", "INSPECT");
  expect(await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage"].map((name) => [name, element.getAttribute(name)]),
  ))).toEqual(stageIdentity);

  await page.getByRole("button", { name: "Close Player 2 inspection" }).click();
  await expect(stage).toBeVisible();
  await expect(stage).not.toHaveAttribute("data-local-ui-mode");
});

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`opponent Inspect uses the measured Stage safe zone at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, viewport);
    const before = await seatGeometry(page);
    const dockBefore = await page.locator(".local-player-dock").boundingBox();
    const opponentSeat = page.locator('[data-player-anchor="p2"]');
    await expect(opponentSeat.locator(".hero-card-info-button")).toHaveCount(0);
    await expect(opponentSeat.locator(".opponent-hand-footer, .player-hand-count")).toHaveCount(0);
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();

    const stage = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"]');
    const layer = stage.locator(":scope > .opponent-inspection-layer");
    const shell = layer.locator(":scope > .opponent-inspection-floating-shell");
    const inspect = shell.locator(".hero-focus-inspect");
    await expect(inspect).toHaveAttribute("data-hero-focus-mode", "INSPECT");
    await expect(inspect.locator(".hero-focus-heading strong")).toHaveText("INSPECT · Player 2");
    await expect(inspect).not.toContainText("HERO FOCUS");
    await expect(page.getByRole("dialog", { name: "Player 2 opponent inspection" })).toBeVisible();
    await expect(stage.locator(":scope > header")).toHaveCount(0);
    await expect(stage.getByText("INSPECT · Player 2", { exact: true })).toHaveCount(1);
    await expect(inspect.locator(".hero-focus-identity")).not.toContainText("Player 2");
    await expect(inspect.locator(".hero-focus-identity-hero")).toBeVisible();
    await expect(inspect.locator(".hero-focus-inspect-profile b")).toHaveCount(0);
    await expect(inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill').first()).toBeVisible();
    const skills = inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill');
    await expect(skills).toHaveCount(2);
    for (const skill of await skills.all()) {
      expect(Number.parseFloat(await skill.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(10);
    }
    await expect(inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]')).toHaveCount(1);
    await expect(inspect.locator(".hero-focus-identity [data-public-hand-count]")).toHaveText("Hand · 2");
    await expect(inspect.locator('[aria-label="Concealed Hand"]')).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-inspect-hand-backs")).toHaveCount(0);
    await expect(inspect).not.toHaveAttribute("aria-modal", "true");
    await expect(layer).toBeVisible();
    await expect(layer.locator(".opponent-inspection-backdrop")).toBeVisible();
    expect(await inspect.evaluate((element) => /\b(Lord|Loyalist|Rebel|Renegade|Spy)\b/.test(element.textContent ?? ""))).toBe(false);

    const [stageBox, safeBox, shellBox, inspectBox, backdropBox, titleBox, closeBox, portraitBox, identityBox, identityType, menuBox, guidanceBox, dockOpen] = await Promise.all([
      stage.boundingBox(),
      page.locator(".interaction-safe-zone").boundingBox(),
      shell.boundingBox(),
      inspect.boundingBox(),
      layer.locator(".opponent-inspection-backdrop").boundingBox(),
      inspect.locator(".hero-focus-heading strong").boundingBox(),
      inspect.getByRole("button", { name: "Close Player 2 inspection" }).boundingBox(),
      inspect.locator(".hero-focus-portrait").boundingBox(),
      inspect.locator(".hero-focus-identity").boundingBox(),
      inspect.locator(".hero-focus-identity").evaluate((element) => ({
        hero: Number.parseFloat(getComputedStyle(element.querySelector(".hero-focus-identity-hero")).fontSize),
        hp: Number.parseFloat(getComputedStyle(element.querySelector(".hero-focus-identity-stats small")).fontSize),
        hand: Number.parseFloat(getComputedStyle(element.querySelector("[data-public-hand-count]")).fontSize),
      })),
      page.locator(".stage-system-menu-trigger").boundingBox(),
      page.locator(".local-player-dock .console-guidance").boundingBox(),
      page.locator(".local-player-dock").boundingBox(),
    ]);
    for (const box of [stageBox, safeBox, shellBox, inspectBox, backdropBox, titleBox, closeBox, portraitBox, identityBox, menuBox, guidanceBox, dockBefore, dockOpen]) expect(box).not.toBeNull();
    expect(Math.abs(stageBox.x - safeBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(stageBox.y - safeBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(stageBox.width - safeBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(stageBox.height - safeBox.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.x - stageBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.y - stageBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.width - stageBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.height - stageBox.height)).toBeLessThanOrEqual(1);
    expect(Math.abs((shellBox.x + shellBox.width / 2) - (stageBox.x + stageBox.width / 2))).toBeLessThanOrEqual(1);
    expect(shellBox.y).toBeGreaterThanOrEqual(stageBox.y + 10);
    expect(shellBox.y).toBeLessThanOrEqual(stageBox.y + 14);
    expect(shellBox.y + shellBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height - 10);
    expect(shellBox.height).toBeLessThan(stageBox.height);
    expect(identityType.hero).toBeGreaterThanOrEqual(12);
    expect(identityType.hp).toBeGreaterThanOrEqual(10);
    expect(identityType.hand).toBeGreaterThanOrEqual(10);
    expect(portraitBox.width).toBeLessThanOrEqual(82);
    if (viewport.width <= 520) {
      expect(portraitBox.width).toBeGreaterThanOrEqual(58);
      expect(identityBox.width).toBeGreaterThan(portraitBox.width);
      expect(identityBox.x).toBeGreaterThanOrEqual(portraitBox.x + portraitBox.width);
      expect(identityBox.x + identityBox.width).toBeLessThanOrEqual(shellBox.x + shellBox.width);
      expect(shellBox.width / stageBox.width).toBeGreaterThanOrEqual(0.88);
      expect(shellBox.width / stageBox.width).toBeLessThanOrEqual(0.94);
      const leftInset = shellBox.x - stageBox.x;
      const rightInset = stageBox.x + stageBox.width - shellBox.x - shellBox.width;
      expect(Math.abs(leftInset - rightInset)).toBeLessThanOrEqual(1);
    } else {
      expect(portraitBox.height).toBeLessThanOrEqual(125);
    }
    expect(Math.abs((titleBox.y + titleBox.height / 2) - (closeBox.y + closeBox.height / 2))).toBeLessThanOrEqual(2);
    expect(overlaps(shellBox, menuBox)).toBe(false);
    expect(overlaps(shellBox, guidanceBox)).toBe(false);
    expect(overlaps(shellBox, dockOpen)).toBe(false);
    for (const seatBox of before) expect(overlaps(shellBox, seatBox)).toBe(false);
    expectStableBox(dockBefore, dockOpen);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

    await inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]').click();
    await expect(page.getByRole("dialog", { name: "Zhuge Crossbow" })).toBeVisible();
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
    await page.getByRole("button", { name: "Close card explanation" }).click();
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
    await expect(inspect).toBeVisible();

    await page.getByRole("button", { name: "Close Player 2 inspection", exact: true }).click();
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    expectStableBox(dockBefore, await page.locator(".local-player-dock").boundingBox());
    expect(await seatGeometry(page)).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`Inspect keeps one public skill compact beside one equipment card at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, targetHero: "xiahou-dun", equipmentCase: "weapon" });
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const skills = inspect.locator('[aria-label="Public Skills"]');
    await expect(skills.locator("h3")).toHaveText("Public Skills");
    await expect(skills.locator(".hero-focus-inspect-skill")).toHaveCount(1);
    await expect(skills.locator(".hero-focus-inspect-skill")).toHaveText("Stauchness");
    const [skillZoneBox, skillType] = await Promise.all([
      skills.boundingBox(),
      skills.locator(".hero-focus-inspect-skill").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    ]);
    expect(skillZoneBox).not.toBeNull();
    expect(skillZoneBox.height).toBeLessThanOrEqual(60);
    expect(skillType).toBeGreaterThanOrEqual(10);
    const equipment = inspect.locator('[aria-label="Equipment"]');
    const equipmentCard = equipment.locator('.opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]');
    await expect(equipmentCard).toHaveCount(1);
    const [equipmentZoneBox, equipmentCardBox] = await Promise.all([equipment.boundingBox(), equipmentCard.boundingBox()]);
    expect(equipmentZoneBox).not.toBeNull();
    expect(equipmentCardBox).not.toBeNull();
    expect(equipmentCardBox.width).toBeGreaterThanOrEqual(36);
    expect(equipmentCardBox.height / equipmentCardBox.width).toBeGreaterThanOrEqual(1.45);
    expect(equipmentCardBox.height / equipmentCardBox.width).toBeLessThanOrEqual(1.55);
    expect(equipmentCardBox.x).toBeGreaterThanOrEqual(equipmentZoneBox.x);
    expect(equipmentCardBox.x + equipmentCardBox.width).toBeLessThanOrEqual(equipmentZoneBox.x + equipmentZoneBox.width);

    const stauchness = skills.getByRole("button", { name: "Show Stauchness description" });
    await stauchness.click();
    const description = inspect.getByRole("region", { name: "Stauchness description" });
    await expect(description).toContainText("After you take damage, you may enter Judgement phase");
    await expect(stauchness).toHaveAttribute("aria-expanded", "true");
    const descriptionGeometry = await description.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const style = getComputedStyle(element);
      const lineHeight = Number.parseFloat(style.lineHeight);
      const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      const elementBox = element.getBoundingClientRect();
      const scrollportBox = element.parentElement.getBoundingClientRect();
      return {
        naturalLines: range.getClientRects().length,
        visibleLines: Math.floor((Math.min(elementBox.bottom, scrollportBox.bottom) - Math.max(elementBox.top, scrollportBox.top) - verticalPadding + 0.5) / lineHeight),
        maxHeight: Number.parseFloat(style.maxHeight),
        lineHeight,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
    });
    expect(descriptionGeometry.visibleLines).toBeGreaterThanOrEqual(Math.min(5, descriptionGeometry.naturalLines));
    expect(descriptionGeometry.maxHeight).toBeLessThanOrEqual(5 * descriptionGeometry.lineHeight + 1);
    await stauchness.click();
    await expect(description).toHaveCount(0);
    await expect(stauchness).toHaveAttribute("aria-expanded", "false");
    await equipmentCard.click();
    await expect(page.getByRole("dialog", { name: "Zhuge Crossbow" })).toBeVisible();
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
    await page.getByRole("button", { name: "Close card explanation" }).click();
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`Inspect keeps multiple public Equipment cards compact at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, targetHero: "xiahou-dun", equipmentCase: "multiple" });
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const equipment = inspect.locator('[aria-label="Equipment"]');
    const cards = equipment.locator(".opponent-inspection-card");
    await expect(cards).toHaveCount(4);
    const [zoneBox, cardBoxes] = await Promise.all([
      equipment.boundingBox(),
      Promise.all((await cards.all()).map((card) => card.boundingBox())),
    ]);
    expect(zoneBox).not.toBeNull();
    for (const box of cardBoxes) {
      expect(box).not.toBeNull();
      expect(box.width).toBeLessThanOrEqual(60);
      expect(box.x).toBeGreaterThanOrEqual(zoneBox.x);
      expect(box.x + box.width).toBeLessThanOrEqual(zoneBox.x + zoneBox.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

for (const count of [6, 8]) {
  test(`Inspect keeps public Hand count private and Judgment compact with ${count} seats`, async ({ page }) => {
    const viewport = { width: 390, height: 844 };
    await loadFixture(page, { ...viewport, count, equipmentCase: "empty" });
    await page.locator('[data-player-anchor="p3"] .opponent-hero-target').click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const judgment = inspect.locator('[aria-label="Judgement Zone"]');
    const judgmentCard = judgment.locator('.opponent-inspection-card[aria-label="Explain Lightning"]');
    const publicZones = inspect.locator(".hero-focus-inspect-public-zones");
    await expect(judgmentCard).toHaveCount(1);
    const [inspectBox, publicZonesBox, judgmentBox, profileBox] = await Promise.all([
      inspect.boundingBox(),
      publicZones.boundingBox(),
      judgment.boundingBox(),
      inspect.locator(".hero-focus-inspect-profile").boundingBox(),
    ]);
    expect(inspectBox).not.toBeNull();
    expect(publicZonesBox).not.toBeNull();
    expect(profileBox).not.toBeNull();
    expect(publicZonesBox.x).toBeGreaterThanOrEqual(profileBox.x + profileBox.width);
    expect(publicZonesBox.width).toBeGreaterThan(inspectBox.width * 0.3);
    expect(judgmentBox).not.toBeNull();
    await expect(inspect.locator(".hero-focus-identity [data-public-hand-count]")).toBeVisible();
    await expect(inspect.locator('[aria-label="Concealed Hand"]')).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-inspect-hand-backs")).toHaveCount(0);
    const seatBoxes = await seatGeometry(page);
    const panelBox = await page.locator(".opponent-inspection-floating-shell").boundingBox();
    expect(panelBox).not.toBeNull();
    for (const seatBox of seatBoxes) expect(overlaps(panelBox, seatBox)).toBe(false);
    expect(await page.locator(".local-player-dock").boundingBox()).not.toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`Inspect keeps an empty Judgment Zone compact at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, equipmentCase: "empty" });
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const judgment = inspect.locator('[aria-label="Judgement Zone"]');
    await expect(judgment.locator(".opponent-inspection-empty")).toHaveText("None");
    await expect(judgment.locator(".opponent-inspection-card")).toHaveCount(0);
    const [zoneBox, detailsBox] = await Promise.all([judgment.boundingBox(), inspect.locator(".hero-focus-inspect-details").boundingBox()]);
    expect(zoneBox).not.toBeNull();
    expect(detailsBox).not.toBeNull();
    expect(zoneBox.height).toBeLessThanOrEqual(38);
    const [profileBox, publicZonesBox] = await Promise.all([
      inspect.locator(".hero-focus-inspect-profile").boundingBox(),
      inspect.locator(".hero-focus-inspect-public-zones").boundingBox(),
    ]);
    expect(profileBox).not.toBeNull();
    expect(publicZonesBox).not.toBeNull();
    expect(publicZonesBox.x).toBeGreaterThanOrEqual(profileBox.x + profileBox.width);
    expect(zoneBox.x).toBeGreaterThanOrEqual(publicZonesBox.x);
    expect(zoneBox.x + zoneBox.width).toBeLessThanOrEqual(publicZonesBox.x + publicZonesBox.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

test("Inspect shows a compact None state when public Hero skills are unavailable", async ({ page }) => {
  await loadFixture(page, { width: 390, height: 844, targetHero: "unknown-fixture-hero", equipmentCase: "empty" });
  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
  const skills = inspect.locator('[aria-label="Public Skills"]');
  await expect(inspect.locator(".hero-focus-identity")).toContainText("Unknown Hero");
  await expect(skills.locator(".opponent-inspection-empty")).toHaveText("None");
  expect((await skills.boundingBox()).height).toBeLessThanOrEqual(42);
  await expect(inspect.locator(".hero-focus-identity .hero-focus-inspect-explain")).toHaveCount(0);
});

test("unified Inspector changes its subject without changing the legal target", async ({ page }) => {
  await loadFixture(page, { state: "ordinary-turn", width: 480, height: 900, equipmentCase: "empty" });
  await page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card').click();
  await page.getByRole("button", { name: "Select Player 2", exact: true }).click();
  const panel = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-panel');
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p2");
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(1);

  await page.getByRole("button", { name: "Inspect Player 2", exact: true }).click();
  await expect(panel).toBeVisible();
  await expect(panel).not.toContainText("HERO FOCUS");
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
  await expect(page.locator('[data-console-surface="local-operation"] button.local-target-cancel')).toBeVisible();
  expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);

  await page.getByRole("button", { name: "Inspect Player 3", exact: true }).click();
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('.opponent-player-card[data-player-anchor="p3"]')).not.toHaveClass(/selected-target/);
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(1);

  await page.getByRole("button", { name: "Close Player 3 inspection", exact: true }).click();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
  expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);
});

test("Inspect restores authoritative Hero Focus without changing Stage identity or sending actions", async ({ page }) => {
  await loadFixture(page, { state: "interaction", width: 480, height: 900 });
  const stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  const identity = await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage", "data-continuity"].map((name) => [name, element.getAttribute(name)]),
  ));
  const actionsBefore = await page.evaluate(() => window.__browserActions.length);

  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  await expect(stage).toHaveAttribute("data-local-ui-mode", "INSPECT");
  await expect(stage.locator('.hero-focus-inspect[data-inspect-player-id="p2"]')).toBeVisible();
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  await page.getByRole("button", { name: "Close Player 2 inspection", exact: true }).click();

  await expect(stage.locator('[data-hero-focus="true"]')).toBeVisible();
  expect(await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage", "data-continuity"].map((name) => [name, element.getAttribute(name)]),
  ))).toEqual(identity);
  expect(await page.evaluate(() => window.__browserActions.length)).toBe(actionsBefore);
});

test("Side Column Inspect keeps public Judgement details inside the centre Stage", async ({ page }) => {
  await loadFixture(page, { count: 6, width: 480, height: 900 });
  const before = await seatGeometry(page);
  await page.locator('[data-player-anchor="p3"] .opponent-hero-target').click();
  const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
  await expect(inspect).toBeVisible();
  await expect(inspect.locator('[aria-label="Judgement Zone"] .opponent-inspection-card[aria-label="Explain Lightning"]')).toHaveCount(1);
  await inspect.locator('[aria-label="Judgement Zone"] .opponent-inspection-card[aria-label="Explain Lightning"]').click();
  await expect(page.getByRole("dialog", { name: "Lightning" })).toBeVisible();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await page.getByRole("button", { name: "Close card explanation" }).click();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  expect(await seatGeometry(page)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(480);
});
