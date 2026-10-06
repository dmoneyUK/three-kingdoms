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

async function loadLocalEquipmentTargetCard(page, { width, height = 844, targetCardCase = "valid" }) {
  await page.setViewportSize({ width, height });
  await page.goto(`/tests/browser/fixture.html?state=local-equipment-target-card&count=4&targetCardCase=${targetCardCase}`);
  return page.locator(".local-player-dock");
}

async function loadFanjianSelectableDetail(page, { width, height = 844, targetCardCase = "valid" }) {
  await page.setViewportSize({ width, height });
  await page.goto(`/tests/browser/fixture.html?state=fanjian-selectable&count=4&targetHandCount=2&targetCardCase=${targetCardCase}&hero=zhou-yu`);
  return page.locator('[aria-label="Interaction Stage"]');
}

async function loadKirinBowSelectableDetail(page, { width, height = 844, targetCardCase = "valid" }) {
  await page.setViewportSize({ width, height });
  await page.goto(`/tests/browser/fixture.html?state=kirin-bow-selectable&count=4&targetCardCase=${targetCardCase}`);
  return page.locator('[aria-label="Interaction Stage"]');
}

async function loadPendingTargetCard(page, { width, height = 844, count = 4, handCount = 4, targetCardCase = "valid", cardKind = "Dismantle" }) {
  await page.setViewportSize({ width, height });
  const params = new URLSearchParams({ state: "pending-target-card", count: String(count), targetHandCount: String(handCount), targetCardCase, targetCardKind: cardKind, effect: cardKind });
  await page.goto(`/tests/browser/fixture.html?${params}`);
  return page.locator('[aria-label="Interaction Stage"]');
}

for (const viewport of [
  { width: 390, height: 844, count: 4 },
  { width: 480, height: 900, count: 6 },
  { width: 1440, height: 900, count: 4 },
]) {
  test(`Steal/Dismantle Pending uses the proven external Hero Focus at ${viewport.width}px`, async ({ page }) => {
    const stage = await loadPendingTargetCard(page, viewport);
    const focus = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"][data-hero-focus-player-id="p2"]');
    const detail = focus.getByRole("group", { name: "Burning Bridges selection" });
    const positions = detail.locator('[data-target-card-zone="hand-position"]');
    const equipment = detail.locator('[data-target-card-zone="equipment"]');
    const judgement = detail.locator('[data-target-card-zone="judgement"]');
    const dock = page.locator('[data-console-surface="local-operation"]');

    await expect(stage).toHaveAttribute("data-current-effect", "Dismantle");
    await expect(focus).toBeVisible();
    await expect(detail.locator("header span")).toHaveText("Burning Bridges");
    await expect(detail.locator("header small")).toHaveText("Choose 1 card · Hand ×4");
    await expect(positions).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      await expect(positions.nth(index)).toHaveAccessibleName(`Hidden hand card ${index + 1}`);
      await expect(positions.nth(index)).not.toContainText(/Attack|Peach|Dodge|Negation/);
    }
    await expect(equipment).toHaveAccessibleName("Equipment: Nio Shield");
    await expect(judgement).toHaveAccessibleName("Judgement: Lightning");
    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(dock.getByRole("button", { name: "Confirm" })).toBeDisabled();
    const targetProjection = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p2"));
    expect(targetProjection.handCount).toBe(4);
    expect(targetProjection.handCards ?? []).toEqual([]);
    expect(await detail.locator("button").allTextContents()).not.toContain("browser-target-equipment");

    const [stageBox, dockBox, focusBox, handBox] = await Promise.all([
      stage.boundingBox(), page.locator(".local-player-dock").boundingBox(), focus.boundingBox(), positions.first().boundingBox(),
    ]);
    expect(stageBox && dockBox && focusBox && handBox).toBeTruthy();
    expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(dockBox.y + 1);
    expect(focusBox.left ?? focusBox.x).toBeGreaterThanOrEqual(0);
    expect(focusBox.x + focusBox.width).toBeLessThanOrEqual(viewport.width);
    expect(handBox.width).toBeGreaterThanOrEqual(44);
    expect(handBox.height).toBeGreaterThanOrEqual(44);
  });
}

test("Pending SELECTABLE DETAIL keeps selection local and submits the existing anonymous Hand index", async ({ page }) => {
  const stage = await loadPendingTargetCard(page, { width: 390 });
  const detail = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]').getByRole("group", { name: "Burning Bridges selection" });
  const hiddenPosition = detail.getByRole("button", { name: "Hidden hand card 2" });
  const dock = page.locator('[data-console-surface="local-operation"]');
  const confirm = dock.getByRole("button", { name: "Confirm" });

  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  await expect(confirm).toBeEnabled();
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  await dock.getByRole("button", { name: "Cancel" }).click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "false");
  await expect(confirm).toBeDisabled();
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

  await hiddenPosition.click();
  await confirm.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
    { action: "choose_target_card", extra: { targetCardZone: "hand", targetCardIndex: 1 } },
  ]);
});

test("Pending SELECTABLE DETAIL preserves public-card IDs in the existing payload", async ({ page }) => {
  const stage = await loadPendingTargetCard(page, { width: 480, count: 6, cardKind: "Steal" });
  const detail = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]').getByRole("group", { name: "Steal selection" });
  const publicCard = detail.getByRole("button", { name: "Judgement: Lightning" });
  const confirm = page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" });

  await publicCard.click();
  await expect(publicCard).toHaveAttribute("aria-pressed", "true");
  await confirm.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
    { action: "choose_target_card", extra: { targetCardZone: "judgement", targetCardId: "browser-target-judgement" } },
  ]);
});

for (const targetCardCase of ["missing-projection", "out-of-range", "unfocused"]) {
  test(`Pending target-card picker remains when Hero Focus proof is unavailable (${targetCardCase})`, async ({ page }) => {
    await loadPendingTargetCard(page, { width: 390, targetCardCase });
    await expect(page.getByRole("dialog", { name: "Choose one current card from Player 2" })).toBeVisible();
    await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
  });
}

test("Pending Hero Focus selection resets when CurrentAction revision changes", async ({ page }) => {
  const stage = await loadPendingTargetCard(page, { width: 390 });
  const detail = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]').getByRole("group", { name: "Burning Bridges selection" });
  const hiddenPosition = detail.getByRole("button", { name: "Hidden hand card 1" });
  const confirm = page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" });

  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.__setBrowserActionRevision("browser-target-card-new-action"));
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "false");
  await expect(confirm).toBeDisabled();
});

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
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`Fanjian source-owned hidden-Hand selection uses proven Hero Focus at ${viewport.width}px`, async ({ page }) => {
    const stage = await loadFanjianSelectableDetail(page, viewport);
    const focus = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"][data-hero-focus-player-id="p1"]');
    const detail = focus.getByRole("group", { name: "Sowing Distrust — choose a hidden card selection" });
    const positions = detail.locator('[data-target-card-zone="hand-position"]');
    const [dockBox, positionBoxes] = await Promise.all([
      page.locator(".local-player-dock").boundingBox(),
      positions.evaluateAll((elements) => elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      })),
    ]);
    await expect(focus).toBeVisible();
    await expect(focus).toHaveAttribute("data-hero-focus-role", "Source");
    await expect(detail.locator("header span")).toHaveText("Sowing Distrust — choose a hidden card");
    await expect(positions).toHaveCount(2);
    await expect(positions.nth(0)).toHaveAccessibleName("Hidden hand card 1");
    await expect(positions.nth(1)).toHaveAccessibleName("Hidden hand card 2");
    await expect(detail).not.toContainText(/Attack|Peach|Dodge|Negation|♥|♠/);
    await expect(page.getByRole("dialog")).toHaveCount(0);
    const sourceProjection = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p1"));
    expect(sourceProjection.handCount).toBe(2);
    expect(sourceProjection.handCards ?? []).toEqual([]);
    expect(dockBox && positionBoxes).toBeTruthy();
    for (const positionBox of positionBoxes) {
      expect(positionBox.y + positionBox.height).toBeLessThanOrEqual(dockBox.y + 1);
      expect(positionBox.x).toBeGreaterThanOrEqual(0);
      expect(positionBox.x + positionBox.width).toBeLessThanOrEqual(viewport.width);
    }
  });
}

test("Fanjian SELECTABLE DETAIL keeps anonymous selection local and submits the existing key once", async ({ page }) => {
  const stage = await loadFanjianSelectableDetail(page, { width: 390 });
  const detail = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]').getByRole("group", { name: "Sowing Distrust — choose a hidden card selection" });
  const hiddenPosition = detail.getByRole("button", { name: "Hidden hand card 2" });
  const confirm = page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" });

  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  await expect(confirm).toBeEnabled();
  expect(await page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([]);
  await confirm.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:1"] } },
  ]);
});

test("Fanjian source selection clears when the CurrentAction revision changes", async ({ page }) => {
  const stage = await loadFanjianSelectableDetail(page, { width: 390 });
  const detail = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]').getByRole("group", { name: "Sowing Distrust — choose a hidden card selection" });
  const hiddenPosition = detail.getByRole("button", { name: "Hidden hand card 1" });
  const confirm = page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" });

  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.__setBrowserActionRevision("browser-fanjian-new-action"));
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "false");
  await expect(confirm).toBeDisabled();
});

test("Fanjian retains the generic picker when the external source focus is not proven", async ({ page }) => {
  await loadFanjianSelectableDetail(page, { width: 390, targetCardCase: "unfocused" });

  await expect(page.getByRole("dialog", { name: "Sowing Distrust — choose a hidden card target card selection" })).toBeVisible();
  await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`Kirin Bow presents only authoritative public Mounts in external Selectable Detail at ${viewport.width}px`, async ({ page }) => {
    const stage = await loadKirinBowSelectableDetail(page, viewport);
    const focus = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"][data-hero-focus-player-id="p1"]');
    const detail = focus.getByRole("group", { name: "Kirin Bow selection" });
    const mounts = detail.locator('[data-target-card-zone="equipment"]');
    const [dockBox, mountBoxes] = await Promise.all([
      page.locator(".local-player-dock").boundingBox(),
      mounts.evaluateAll((elements) => elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      })),
    ]);

    await expect(stage).toHaveAttribute("data-current-effect", "Attack");
    await expect(focus).toBeVisible();
    await expect(stage.locator('[data-hero-focus-player-id="p2"]')).toHaveCount(0);
    await expect(detail.locator("header span")).toHaveText("Kirin Bow");
    await expect(detail.locator("header small")).toHaveText("Choose 1 card");
    await expect(mounts).toHaveCount(2);
    await expect(mounts.nth(0)).toHaveAccessibleName("Equipment: Red Hare");
    await expect(mounts.nth(1)).toHaveAccessibleName("Equipment: Shadowrunner");
    await expect(detail.getByRole("button", { name: "Equipment: Nio Shield" })).toHaveCount(0);
    await expect(detail.locator('[data-target-card-zone="hand-position"]')).toHaveCount(0);
    await expect(page.getByRole("dialog")).toHaveCount(0);

    const targetProjection = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p1"));
    expect(targetProjection.equipmentCards.map((card) => card.id)).toEqual([
      "browser-kirin-bow-offensive-mount",
      "browser-kirin-bow-defensive-mount",
      "browser-kirin-bow-ineligible-armour",
    ]);
    expect(mountBoxes).toHaveLength(2);
    expect(dockBox).toBeTruthy();
    for (const mountBox of mountBoxes) {
      expect(mountBox.width).toBeGreaterThanOrEqual(44);
      expect(mountBox.height).toBeGreaterThanOrEqual(44);
      expect(mountBox.x).toBeGreaterThanOrEqual(0);
      expect(mountBox.x + mountBox.width).toBeLessThanOrEqual(viewport.width);
      expect(mountBox.y + mountBox.height).toBeLessThanOrEqual(dockBox.y + 1);
    }
  });
}

test("Kirin Bow selection stays local until Confirm and submits the existing mount key once", async ({ page }) => {
  const stage = await loadKirinBowSelectableDetail(page, { width: 390 });
  const detail = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]').getByRole("group", { name: "Kirin Bow selection" });
  const mount = detail.getByRole("button", { name: "Equipment: Shadowrunner" });
  const confirm = page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" });

  await mount.click();
  await expect(mount).toHaveAttribute("aria-pressed", "true");
  await expect(confirm).toBeEnabled();
  expect(await page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([]);
  await confirm.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "kirin_bow_damage_about_to_apply", cardKeys: ["browser-kirin-bow-defensive-mount"] } },
  ]);
});

test("Kirin Bow public Mount selection clears on CurrentAction revision change", async ({ page }) => {
  const stage = await loadKirinBowSelectableDetail(page, { width: 390 });
  const mount = stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]').getByRole("button", { name: "Equipment: Red Hare" });
  const confirm = page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm" });

  await mount.click();
  await expect(mount).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.__setBrowserActionRevision("browser-kirin-bow-new-action"));
  await expect(mount).toHaveAttribute("aria-pressed", "false");
  await expect(confirm).toBeDisabled();
});

for (const targetCardCase of ["unfocused", "unprojected"]) {
  test(`Kirin Bow keeps the generic picker when Mount focus is not proven (${targetCardCase})`, async ({ page }) => {
    await loadKirinBowSelectableDetail(page, { width: 390, targetCardCase });

    await expect(page.getByRole("dialog", { name: "Kirin Bow target card selection" })).toBeVisible();
    await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
  });
}

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

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`self-targeted public Equipment selection stays in the Local Dock at ${viewport.width}px`, async ({ page }) => {
    const dock = await loadLocalEquipmentTargetCard(page, viewport);
    const equipment = dock.locator(".local-equipment-panel");
    const eligible = equipment.getByRole("button", { name: "Select Nio Shield" });
    const ineligible = equipment.getByRole("button", { name: "Select Zhuge Crossbow" });
    const actionRow = dock.locator(".turn-controls");
    const confirm = actionRow.getByRole("button", { name: "Confirm" });

    await expect(page.getByRole("dialog")).toHaveCount(0);
    await expect(equipment.getByRole("button", { name: /^Select / })).toHaveCount(2);
    await expect(eligible).toBeEnabled();
    await expect(ineligible).toBeDisabled();
    await expect(confirm).toBeDisabled();
    const cancel = actionRow.getByRole("button", { name: "Cancel" });
    const skip = actionRow.getByRole("button", { name: "Skip" });
    await expect(cancel).toBeVisible();
    await expect(skip).toBeVisible();
    expect(await page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([]);

    await eligible.click();
    await expect(eligible).toHaveAttribute("aria-pressed", "true");
    await expect(confirm).toBeEnabled();
    await cancel.click();
    await expect(eligible).toHaveAttribute("aria-pressed", "false");
    await expect(confirm).toBeDisabled();
    expect(await page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([]);
    await eligible.click();
    await expect(eligible).toHaveAttribute("aria-pressed", "true");
    await expect(confirm).toBeEnabled();

    const [dockBox, equipmentBox, actionRowBox, eligibleBox] = await Promise.all([
      dock.boundingBox(), equipment.boundingBox(), actionRow.boundingBox(), eligible.boundingBox(),
    ]);
    expect(dockBox && equipmentBox && actionRowBox && eligibleBox).toBeTruthy();
    expect(eligibleBox.x).toBeGreaterThanOrEqual(equipmentBox.x - 1);
    expect(eligibleBox.x + eligibleBox.width).toBeLessThanOrEqual(equipmentBox.x + equipmentBox.width + 1);
    expect(actionRowBox.y).toBeGreaterThan(eligibleBox.y);
    expect(actionRowBox.y + actionRowBox.height).toBeLessThanOrEqual(dockBox.y + dockBox.height + 1);

    await confirm.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
      { action: "trigger", extra: { providerId: "yue_jin_dauntless", cardKeys: ["browser-local-equipment-eligible"] } },
    ]);
  });
}

test("Local Dock Equipment selection clears when its CurrentAction revision changes", async ({ page }) => {
  const dock = await loadLocalEquipmentTargetCard(page, { width: 390 });
  const eligible = dock.getByRole("button", { name: "Select Nio Shield" });
  const confirm = dock.locator(".turn-controls").getByRole("button", { name: "Confirm" });

  await eligible.click();
  await expect(eligible).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.__setBrowserActionRevision("browser-equipment-target-new-action"));
  await expect(eligible).toHaveAttribute("aria-pressed", "false");
  await expect(confirm).toBeDisabled();
});

for (const targetCardCase of ["mixed", "unprojected"]) {
  test(`self-targeted Equipment keeps the modal fallback when CurrentAction keys are ${targetCardCase}`, async ({ page }) => {
    const dock = await loadLocalEquipmentTargetCard(page, { width: 390, targetCardCase });
    await expect(page.getByRole("dialog", { name: "Dauntless target card selection" })).toBeVisible();
    await expect(dock.locator(".local-equipment-panel").getByRole("button", { name: /^Select / })).toHaveCount(0);
    if (targetCardCase === "unprojected") {
      await expect(page.getByRole("dialog").getByRole("button", { name: "Use Dauntless" })).toBeDisabled();
      await expect(page.getByRole("dialog").locator("[aria-label='Eligible cards'] button")).toHaveCount(0);
    } else {
      await expect(page.getByRole("dialog").getByRole("button", { name: "Hand ×2 · Random card" })).toBeVisible();
    }
    expect(await page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([]);
  });
}

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
