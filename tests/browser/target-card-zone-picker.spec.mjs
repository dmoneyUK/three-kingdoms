import { expect, test } from "@playwright/test";

async function loadPicker(page, { width, height = 844, handCount = 4 }) {
  await page.setViewportSize({ width, height });
  await page.goto(`/tests/browser/fixture.html?state=picker-hand-zone&count=4&targetHandCount=${handCount}`);
  const focus = page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]');
  await expect(focus).toBeVisible();
  return focus;
}

async function loadFrostSwordSelection(page, { width, height = 844, handCount = 4, targetCardCase = "valid" }) {
  await page.setViewportSize({ width, height });
  await page.goto(`/tests/browser/fixture.html?state=frost-sword-selectable&count=4&targetHandCount=${handCount}&targetCardCase=${targetCardCase}`);
  return page.locator('[aria-label="Interaction Stage"]');
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`Hero Focus selectable detail and concealed Hand remain readable at ${viewport.width}px`, async ({ page }) => {
    const focus = await loadPicker(page, viewport);
    const detail = focus.getByRole("group", { name: "Retaliation selection" });
    const handZone = detail.locator('[data-target-card-zone="hand"]');
    const row = detail.locator(".target-card-picker-card-row");

    await expect(detail.locator("header span")).toHaveText("Retaliation");
    await expect(detail.locator("header small")).toHaveText("Choose where to obtain 1 card");
    await expect(detail).not.toContainText("SELECTABLE DETAIL");
    await expect(handZone).toHaveCount(1);
    await expect(handZone).toHaveAccessibleName("Hand ×4 · Random card");
    await expect(handZone).toContainText("Hand ×4");
    await expect(handZone).toContainText("Random card");
    await expect(handZone.locator(".target-card-picker-hand-back")).toHaveCount(4);
    await expect(handZone).toHaveAttribute("aria-pressed", "false");
    const targetProjection = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p1"));
    expect(targetProjection.handCount).toBe(4);
    expect(targetProjection.handCards ?? []).toEqual([]);

    const publicEquipment = detail.locator('[data-target-card-zone="equipment"]');
    const publicJudgement = detail.locator('[data-target-card-zone="judgement"]');
    await expect(publicEquipment).toHaveCount(1);
    await expect(publicEquipment).toHaveAttribute("aria-label", /^Equipment: /);
    await expect(publicJudgement).toHaveCount(1);
    await expect(publicJudgement).toHaveAttribute("aria-label", /^Judgement: /);

    const bounds = await focus.evaluate((element) => {
      const box = element.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
    });
    const handBounds = await handZone.boundingBox();
    const rowBounds = await row.boundingBox();
    expect(bounds.left).toBeGreaterThanOrEqual(0);
    expect(bounds.right).toBeLessThanOrEqual(viewport.width);
    expect(bounds.top).toBeGreaterThanOrEqual(0);
    expect(bounds.bottom).toBeLessThanOrEqual(viewport.height);
    expect(handBounds && rowBounds).toBeTruthy();
    expect(handBounds.x).toBeGreaterThanOrEqual(rowBounds.x);
    expect(handBounds.x + handBounds.width).toBeLessThanOrEqual(rowBounds.x + rowBounds.width + 1);
  });
}

test("large concealed Hands keep the exact public count without expanding into many selectable cards", async ({ page }) => {
  const focus = await loadPicker(page, { width: 390, handCount: 10 });
  const detail = focus.getByRole("group", { name: "Retaliation selection" });
  const handZone = detail.locator('[data-target-card-zone="hand"]');

  await expect(handZone).toHaveAccessibleName("Hand ×10 · Random card");
  await expect(handZone).toContainText("Hand ×10");
  await expect(handZone.locator(".target-card-picker-hand-back")).toHaveCount(6);
  await expect(handZone.locator(".target-card-picker-hand-overflow")).toHaveText("+4");
  await expect(detail.locator('[data-target-card-zone="hand"]')).toHaveCount(1);
});

test("Local Dock Confirm submits the concealed Hand's existing semantic key exactly once", async ({ page }) => {
  const focus = await loadPicker(page, { width: 390 });
  const detail = focus.getByRole("group", { name: "Retaliation selection" });
  const handZone = detail.locator('[data-target-card-zone="hand"]');

  await handZone.click();
  await expect(handZone).toHaveAttribute("aria-pressed", "true");
  await expect(detail.locator(".target-card-picker-count")).toHaveText("1 / 1 selected");
  const confirm = page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" });
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "browser_retaliation_zone", cardKeys: ["hand"] } },
  ]);
});

test("Local Dock Cancel clears only local detail while Skip remains authoritative", async ({ page }) => {
  const focus = await loadPicker(page, { width: 390 });
  const handZone = focus.locator('[data-target-card-zone="hand"]');
  const dock = page.locator('[data-console-surface="local-operation"]');
  const stage = page.locator(".interaction-stage");
  const publicStageBefore = await stage.evaluate((element) => ({
    revision: element.getAttribute("data-presentation-revision"),
    interaction: element.getAttribute("data-interaction-id"),
    stage: element.getAttribute("data-stage"),
  }));

  await expect(dock.getByRole("button", { name: "Cancel" })).toBeVisible();
  await expect(dock.getByRole("button", { name: "Skip" })).toBeVisible();
  await handZone.click();
  expect(await stage.evaluate((element) => ({
    revision: element.getAttribute("data-presentation-revision"),
    interaction: element.getAttribute("data-interaction-id"),
    stage: element.getAttribute("data-stage"),
  }))).toEqual(publicStageBefore);
  await dock.getByRole("button", { name: "Cancel" }).click();
  await expect(handZone).toHaveAttribute("aria-pressed", "false");
  expect(await page.evaluate(() => window.__browserActions.filter((entry) => ["trigger", "decline_trigger"].includes(entry.action)))).toEqual([]);

  await dock.getByRole("button", { name: "Skip" }).click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "decline_trigger").map((entry) => entry.action))).toEqual(["decline_trigger"]);
});

for (const { zone, key } of [
  { zone: "equipment", key: "browser-public-equipment" },
  { zone: "judgement", key: "browser-public-judgement" },
]) {
  test(`public ${zone} remains an individually selectable physical card`, async ({ page }) => {
    const focus = await loadPicker(page, { width: 390 });
    const detail = focus.getByRole("group", { name: "Retaliation selection" });
    const publicCard = detail.locator(`[data-target-card-zone="${zone}"]`);
    const handZone = detail.locator('[data-target-card-zone="hand"]');

    await publicCard.click();
    await expect(publicCard).toHaveAttribute("aria-pressed", "true");
    await expect(handZone).toHaveAttribute("aria-pressed", "false");
    await page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" }).click();

    await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
      { action: "trigger", extra: { providerId: "browser_retaliation_zone", cardKeys: [key] } },
    ]);
  });
}

test("a new action revision clears local selectable-detail input", async ({ page }) => {
  const focus = await loadPicker(page, { width: 390 });
  const handZone = focus.locator('[data-target-card-zone="hand"]');
  const confirm = page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" });

  await handZone.click();
  await expect(handZone).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.__setBrowserActionRevision("browser-picker-hand-zone-new-action"));
  await expect(handZone).toHaveAttribute("aria-pressed", "false");
  await expect(confirm).toBeDisabled();
});

test("supported opaque per-hand keys use anonymous Hero Focus selection", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=picker&count=4");

  const focus = page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"][data-hero-focus-player-id="p1"]');
  const detail = focus.getByRole("group", { name: "Retaliation selection" });
  const positions = detail.locator('[data-target-card-zone="hand-position"]');

  await expect(focus).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Retaliation target card selection" })).toHaveCount(0);
  await expect(positions).toHaveCount(2);
  await expect(positions.nth(0)).toHaveAccessibleName("Hidden hand card 1");
  await expect(positions.nth(1)).toHaveAccessibleName("Hidden hand card 2");
  const targetProjection = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p1"));
  expect(targetProjection.handCount).toBe(2);
  expect(targetProjection.handCards ?? []).toEqual([]);

  await positions.nth(1).click();
  await page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" }).click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "browser-target-card", cardKeys: ["hand:1"] } },
  ]);
});

for (const viewport of [
  { width: 390, height: 640 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`Frost Sword uses anonymous projected Hand positions in external Hero Focus at ${viewport.width}px`, async ({ page }) => {
    const stage = await loadFrostSwordSelection(page, viewport);
    const focus = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"][data-hero-focus-player-id="p1"]');
    const detail = focus.getByRole("group", { name: "Frost Sword selection" });
    const positions = detail.locator('[data-target-card-zone="hand-position"]');

    await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
    await expect(focus).toBeVisible();
    await expect(focus.locator('[data-hero-focus-player-id="p2"]')).toHaveCount(0);
    await expect(focus.locator(".hero-focus-source")).toHaveCount(0);
    await expect(detail.locator("header span")).toHaveText("Frost Sword");
    await expect(detail.locator("header small")).toHaveText("Choose 1–2 cards · Hand ×4");
    await expect(positions).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      await expect(positions.nth(index)).toHaveAccessibleName(`Hidden hand card ${index + 1}`);
      await expect(positions.nth(index)).toHaveAttribute("aria-pressed", "false");
      await expect(positions.nth(index)).not.toContainText(/Attack|Peach|Dodge|Negation/);
    }
    await expect(detail.locator('[data-target-card-zone="equipment"]')).toHaveCount(1);
    await expect(detail.locator('[data-target-card-zone="equipment"]')).toHaveAttribute("aria-label", /^Equipment: /);
    await expect(detail.locator('[data-target-card-zone="equipment"] .hero-focus-selectable-public-card-label strong')).toHaveText("Nio Shield");
    const targetProjection = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p1"));
    expect(targetProjection.handCount).toBe(4);
    expect(targetProjection.handCards ?? []).toEqual([]);

    const [stageBox, dockBox, focusBox, positionBox] = await Promise.all([
      stage.boundingBox(), page.locator(".local-player-dock").boundingBox(), focus.boundingBox(), positions.first().boundingBox(),
    ]);
    expect(stageBox && dockBox && focusBox && positionBox).toBeTruthy();
    expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(dockBox.y);
    expect(focusBox.x).toBeGreaterThanOrEqual(0);
    expect(focusBox.x + focusBox.width).toBeLessThanOrEqual(viewport.width);
    expect(positionBox.width).toBeGreaterThanOrEqual(44);
    expect(positionBox.height).toBeGreaterThanOrEqual(44);
  });
}

test("Frost Sword keeps ten opaque Hand positions inside the horizontally scrollable Hero Focus row", async ({ page }) => {
  const stage = await loadFrostSwordSelection(page, { width: 390, height: 640, handCount: 10 });
  const focus = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"][data-hero-focus-player-id="p1"]');
  const detail = focus.getByRole("group", { name: "Frost Sword selection" });
  const positions = detail.locator('[data-target-card-zone="hand-position"]');
  const row = detail.locator(".hero-focus-selectable-detail-row");

  await expect(detail.locator("header small")).toHaveText("Choose 1–2 cards · Hand ×10");
  await expect(positions).toHaveCount(10);
  for (let index = 0; index < 10; index += 1) {
    await expect(positions.nth(index)).toHaveAccessibleName(`Hidden hand card ${index + 1}`);
  }
  const geometry = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    rowClientWidth: document.querySelector(".hero-focus-selectable-detail-row")?.clientWidth ?? 0,
    rowScrollWidth: document.querySelector(".hero-focus-selectable-detail-row")?.scrollWidth ?? 0,
  }));
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.rowScrollWidth).toBeGreaterThan(geometry.rowClientWidth);
  await expect(row).toHaveCSS("overflow-x", "auto");
});

test("Frost Sword Confirm submits only the selected opaque keys and public card exactly once", async ({ page }) => {
  const stage = await loadFrostSwordSelection(page, { width: 390, height: 844 });
  const detail = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]').getByRole("group", { name: "Frost Sword selection" });
  const hiddenPosition = detail.getByRole("button", { name: "Hidden hand card 1" });
  const equipment = detail.locator('[data-target-card-zone="equipment"]');
  const confirm = page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" });

  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  await equipment.click();
  await expect(equipment).toHaveAttribute("aria-pressed", "true");
  await expect(confirm).toBeEnabled();
  await confirm.click();

  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "frost_sword_damage_about_to_apply", cardKeys: ["hand:0", "browser-public-equipment"] } },
  ]);
});

test("Frost Sword opaque position choices reset on action revision", async ({ page }) => {
  const stage = await loadFrostSwordSelection(page, { width: 390, height: 844 });
  const detail = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]').getByRole("group", { name: "Frost Sword selection" });
  const hiddenPosition = detail.getByRole("button", { name: "Hidden hand card 2" });
  const confirm = page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" });

  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.__setBrowserActionRevision("browser-frost-sword-new-action"));
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "false");
  await expect(confirm).toBeDisabled();
});

for (const targetCardCase of ["unfocused", "out-of-range"]) {
  test(`Frost Sword keeps the retained picker when opaque Hand proof is unsupported (${targetCardCase})`, async ({ page }) => {
    await loadFrostSwordSelection(page, { width: 390, height: 844, targetCardCase });

    await expect(page.getByRole("dialog", { name: "Frost Sword target card selection" })).toBeVisible();
    await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
  });
}

test("picker fixture changes preserve baseline public Equipment for Inspect", async ({ page }) => {
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/tests/browser/fixture.html?state=rest&count=6");

  const seat = page.locator('[data-player-anchor="p2"]');
  await expect(seat.locator('.opponent-equipment-summary [data-slot="weapon"][data-card-kind="ZhugeCrossbow"]')).toHaveCount(1);
  await seat.locator(".opponent-hero-target").click();

  const inspection = page.getByRole("dialog", { name: "Player 2 opponent inspection" });
  await expect(inspection.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]')).toHaveCount(1);
});
