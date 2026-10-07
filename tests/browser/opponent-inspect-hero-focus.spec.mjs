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

test("opponent Hero info opens without replacing the authoritative Stage with Inspect", async ({ page }) => {
  await loadFixture(page, { state: "interaction", width: 480, height: 900 });
  const stage = page.locator('.play-table[data-seat-topology="top-row"] .interaction-stage');
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  const stageIdentity = await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage"].map((name) => [name, element.getAttribute(name)]),
  ));

  await page.locator('[data-player-anchor="p2"] .hero-card-info-button').click();
  await expect(page.getByRole("dialog", { name: "Liu Bei" })).toBeVisible();
  await expect(stage).not.toHaveAttribute("data-local-ui-mode");
  expect(await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage"].map((name) => [name, element.getAttribute(name)]),
  ))).toEqual(stageIdentity);

  await page.getByRole("button", { name: "Close hero information" }).click();
  await expect(stage).toBeVisible();
});

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`opponent Inspect floats compactly inside Stage at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, viewport);
    const before = await seatGeometry(page);
    const dockBefore = await page.locator(".local-player-dock").boundingBox();
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
    await expect(inspect.locator(".hero-focus-identity")).toContainText("Player 2");
    await expect(inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill').first()).toBeVisible();
    const skills = inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill');
    await expect(skills).toHaveCount(2);
    for (const skill of await skills.all()) {
      expect(Number.parseFloat(await skill.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(10);
    }
    await expect(inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]')).toHaveCount(1);
    await expect(inspect.locator('[aria-label="Concealed Hand"]')).toHaveAttribute("data-concealed-hand-count", "2");
    await expect(inspect.locator(".hero-focus-inspect-hand-backs i")).toHaveCount(2);
    await expect(inspect.locator('[aria-label="Concealed Hand"] .played-card')).toHaveCount(0);
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
        player: Number.parseFloat(getComputedStyle(element.querySelector("b")).fontSize),
        hero: Number.parseFloat(getComputedStyle(element.querySelector("span")).fontSize),
        hp: Number.parseFloat(getComputedStyle(element.querySelector("small")).fontSize),
        explain: Number.parseFloat(getComputedStyle(element.querySelector(".hero-focus-inspect-explain")).fontSize),
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
    expect(Math.abs((shellBox.y + shellBox.height / 2) - (stageBox.y + stageBox.height / 2))).toBeLessThanOrEqual(1);
    expect(shellBox.height / stageBox.height).toBeLessThanOrEqual(0.72);
    expect(shellBox.height).toBeLessThan(stageBox.height);
    expect(identityType.player).toBeGreaterThanOrEqual(15);
    expect(identityType.hero).toBeGreaterThanOrEqual(12);
    expect(identityType.hp).toBeGreaterThanOrEqual(10);
    expect(identityType.explain).toBeGreaterThanOrEqual(9);
    if (viewport.width <= 520) {
      expect(portraitBox.width / inspectBox.width).toBeGreaterThanOrEqual(0.38);
      expect(portraitBox.width / inspectBox.width).toBeLessThanOrEqual(0.44);
      expect(identityBox.width / inspectBox.width).toBeGreaterThanOrEqual(0.56);
      expect(identityBox.width / inspectBox.width).toBeLessThanOrEqual(0.62);
      expect(identityBox.x).toBeGreaterThanOrEqual(portraitBox.x + portraitBox.width);
      expect(identityBox.x + identityBox.width).toBeLessThanOrEqual(shellBox.x + shellBox.width);
      expect(shellBox.width / stageBox.width).toBeGreaterThanOrEqual(0.88);
      expect(shellBox.width / stageBox.width).toBeLessThanOrEqual(0.94);
      expect(shellBox.x - stageBox.x).toBeGreaterThanOrEqual(12);
      expect(shellBox.x - stageBox.x).toBeLessThanOrEqual(16);
      expect(stageBox.x + stageBox.width - shellBox.x - shellBox.width).toBeGreaterThanOrEqual(12);
      expect(stageBox.x + stageBox.width - shellBox.x - shellBox.width).toBeLessThanOrEqual(16);
    } else {
      expect(portraitBox.width).toBeLessThanOrEqual(100);
      expect(portraitBox.height).toBeLessThanOrEqual(125);
    }
    expect(Math.abs((titleBox.y + titleBox.height / 2) - (closeBox.y + closeBox.height / 2))).toBeLessThanOrEqual(2);
    expect(overlaps(shellBox, menuBox)).toBe(false);
    expect(overlaps(shellBox, guidanceBox)).toBe(false);
    expect(overlaps(shellBox, dockOpen)).toBe(false);
    expectStableBox(dockBefore, dockOpen);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

    await inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]').click();
    await expect(page.getByRole("dialog", { name: "Zhuge Crossbow" })).toBeVisible();
    await page.getByRole("button", { name: "Close card explanation" }).click();
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
    expect(skillZoneBox.height).toBeLessThanOrEqual(48);
    expect(skillType).toBeGreaterThanOrEqual(10);
    const equipment = inspect.locator('[aria-label="Equipment"]');
    const equipmentCard = equipment.locator('.opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]');
    await expect(equipmentCard).toHaveCount(1);
    const [equipmentZoneBox, equipmentCardBox] = await Promise.all([equipment.boundingBox(), equipmentCard.boundingBox()]);
    expect(equipmentZoneBox).not.toBeNull();
    expect(equipmentCardBox).not.toBeNull();
    expect(equipmentCardBox.width).toBeGreaterThanOrEqual(70);
    expect(equipmentCardBox.height / equipmentCardBox.width).toBeGreaterThanOrEqual(1.45);
    expect(equipmentCardBox.height / equipmentCardBox.width).toBeLessThanOrEqual(1.55);
    expect(equipmentCardBox.x).toBeGreaterThanOrEqual(equipmentZoneBox.x);
    expect(equipmentCardBox.x + equipmentCardBox.width).toBeLessThanOrEqual(equipmentZoneBox.x + equipmentZoneBox.width);

    await skills.getByRole("button", { name: "Explain Stauchness" }).click();
    await expect(page.getByRole("dialog", { name: "Xiahou Dun" })).toBeVisible();
    await page.getByRole("button", { name: "Close hero information" }).click();
    await expect(inspect).toBeVisible();
    await equipmentCard.click();
    await expect(page.getByRole("dialog", { name: "Zhuge Crossbow" })).toBeVisible();
    await page.getByRole("button", { name: "Close card explanation" }).click();
    await expect(inspect).toBeVisible();
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

test("Inspect stays independent from target selection and restores the selected Preview", async ({ page }) => {
  await loadFixture(page, { state: "ordinary-turn", width: 480, height: 900, equipmentCase: "empty" });
  await page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card').click();
  await page.getByRole("button", { name: "Select Player 2", exact: true }).click();
  const preview = page.locator('.interaction-stage[data-local-ui-mode="PREVIEW"]');
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
  await expect(preview.locator('[data-hero-focus-mode="PREVIEW"]')).not.toContainText("HERO FOCUS");

  await page.getByRole("button", { name: "Inspect Player 2", exact: true }).click();
  const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
  await expect(inspect).toBeVisible();
  await expect(inspect).not.toContainText("HERO FOCUS");
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
  await expect(page.locator('[data-console-surface="local-operation"] button.local-target-cancel')).toBeVisible();
  expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);

  await page.getByRole("button", { name: "Explain Liu Bei", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Liu Bei" })).toBeVisible();
  await page.getByRole("button", { name: "Close hero information" }).click();
  await expect(inspect).toBeVisible();
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);

  await page.getByRole("button", { name: "Close Player 2 inspection", exact: true }).click();
  await expect(preview).toHaveAttribute("data-local-preview-player-id", "p2");
  await expect(preview.locator('[data-hero-focus-mode="PREVIEW"]')).not.toContainText("HERO FOCUS");
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
  await page.getByRole("button", { name: "Close card explanation" }).click();
  await expect(inspect).toBeVisible();
  await page.getByRole("button", { name: "Close Player 3 inspection", exact: true }).click();
  expect(await seatGeometry(page)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(480);
});
