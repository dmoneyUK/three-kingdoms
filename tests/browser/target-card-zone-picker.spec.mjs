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

async function loadFrostSwordModal(page, { width, height = 844, handCount = 4, targetCardCase = "valid" }) {
  const stage = await loadFrostSwordSelection(page, { width, height, handCount, targetCardCase });
  const dialog = page.getByRole("dialog", { name: "Frost Sword target card selection" });
  await expect(dialog).toBeVisible();
  return { stage, dialog };
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

async function loadKirinBowModal(page, viewport) {
  const stage = await loadKirinBowSelectableDetail(page, viewport);
  const dialog = page.getByRole("dialog", { name: "Kirin Bow target card selection" });
  await expect(dialog).toBeVisible();
  return { stage, dialog };
}

async function loadPendingTargetCard(page, { width, height = 844, count = 4, handCount = 4, targetCardCase = "valid", cardKind = "Dismantle" }) {
  await page.setViewportSize({ width, height });
  const params = new URLSearchParams({ state: "pending-target-card", count: String(count), targetHandCount: String(handCount), targetCardCase, targetCardKind: cardKind, effect: cardKind });
  await page.goto(`/tests/browser/fixture.html?${params}`);
  return page.locator('[aria-label="Interaction Stage"]');
}

async function openRetaliationModal(page, { width, height = 844, targetCardCase = "valid", handCount = 4 } = {}) {
  await page.setViewportSize({ width, height });
  const params = new URLSearchParams({ state: "retaliation-modal", count: "4", targetHandCount: String(handCount), targetCardCase, hero: "simayi" });
  await page.goto(`/tests/browser/fixture.html?${params}`);
  const skill = page.getByRole("button", { name: "Retaliation", exact: true });
  await expect(skill).toBeEnabled();
  const before = await page.evaluate(() => {
    const box = (selector) => {
      const { x, y, width: boxWidth, height: boxHeight } = document.querySelector(selector).getBoundingClientRect();
      return { x, y, width: boxWidth, height: boxHeight };
    };
    return { stage: box(".play-table"), dock: box(".local-player-dock") };
  });
  await skill.click();
  const dialog = page.getByRole("dialog", { name: "Retaliation target card selection" });
  await expect(dialog).toBeVisible();
  return { dialog, before };
}

function expectSameBox(actual, expected) {
  for (const key of ["x", "y", "width", "height"]) expect(actual[key], `${key}: ${actual[key]} vs ${expected[key]}`).toBeCloseTo(expected[key], 1);
}

async function submittedTriggerActions(page) {
  return page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger" || entry.action === "decline_trigger"));
}

for (const viewport of [
  { width: 320, height: 568, count: 4 },
  { width: 390, height: 844, count: 4 },
  { width: 480, height: 900, count: 6 },
  { width: 1440, height: 900, count: 4 },
]) {
  test(`proven Dismantle uses the shared target-card modal at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const stage = await loadPendingTargetCard(page, viewport);
    const dialog = page.getByRole("dialog", { name: "Dismantle target card selection" });
    const positions = dialog.locator('[data-target-card-zone="hand-position"]');
    const equipment = dialog.locator('[data-target-card-zone="equipment"]');
    const judgement = dialog.locator('[data-target-card-zone="judgement"]');
    const dock = page.locator('[data-console-surface="local-operation"]');
    const before = await page.evaluate(() => {
      const box = (selector) => {
        const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
        return { x, y, width, height };
      };
      return { stage: box(".play-table"), dock: box(".local-player-dock") };
    });

    await expect(stage).toHaveAttribute("data-current-effect", "Dismantle");
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("header strong")).toHaveText("DISMANTLE");
    await expect(dialog.locator("header span")).toHaveText("Choose 1 card to discard");
    await expect(positions).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      await expect(positions.nth(index)).toHaveAccessibleName(`Hidden hand card ${index + 1}`);
      await expect(positions.nth(index)).not.toContainText(/Attack|Peach|Dodge|Negation/);
    }
    await expect(equipment).toHaveAccessibleName("Equipment: Nio Shield");
    await expect(judgement).toHaveAccessibleName("Judgement: Lightning");
    await expect(page.getByRole("dialog")).toHaveCount(1);
    await expect(stage.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
    await expect(dock.getByRole("button", { name: "Confirm" })).toHaveCount(0);
    await expect(dock.getByRole("button", { name: "Cancel" })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    const targetProjection = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p2"));
    expect(targetProjection.handCount).toBe(4);
    expect(targetProjection.handCards ?? []).toEqual([]);
    expect(await dialog.locator("button").allTextContents()).not.toContain("browser-target-equipment");

    const [stageBox, dockBox, dialogBox, handBox, cardBoxes, after] = await Promise.all([
      stage.boundingBox(), page.locator(".local-player-dock").boundingBox(), dialog.boundingBox(), positions.first().boundingBox(),
      dialog.locator(".target-card-picker-card").evaluateAll((elements) => elements.map((element) => {
        const { width, height } = element.getBoundingClientRect();
        return { width, height };
      })),
      page.evaluate(() => {
        const box = (selector) => {
          const { x, y, width, height } = document.querySelector(selector).getBoundingClientRect();
          return { x, y, width, height };
        };
        return { stage: box(".play-table"), dock: box(".local-player-dock"), overflow: document.documentElement.scrollWidth > window.innerWidth };
      }),
    ]);
    expect(stageBox && dockBox && dialogBox && handBox).toBeTruthy();
    expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(dockBox.y + 1);
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width);
    expect(dialogBox.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height);
    expect(handBox.width).toBeGreaterThanOrEqual(44);
    expect(handBox.height).toBeGreaterThanOrEqual(44);
    expect(cardBoxes.length).toBeGreaterThan(0);
    expect(cardBoxes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
    expect(after.overflow).toBe(false);
    expectSameBox(after.stage, before.stage);
    expectSameBox(after.dock, before.dock);
  });
}

test("Dismantle modal Cancel clears local selection and submits the existing anonymous Hand index", async ({ page }) => {
  await loadPendingTargetCard(page, { width: 390 });
  const dialog = page.getByRole("dialog", { name: "Dismantle target card selection" });
  const hiddenPosition = dialog.getByRole("button", { name: "Hidden hand card 2" });
  const dock = page.locator('[data-console-surface="local-operation"]');
  const confirm = dialog.getByRole("button", { name: "Use Dismantle" });

  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  await expect(confirm).toBeEnabled();
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "false");
  await expect(confirm).toBeDisabled();
  await expect(dock.getByRole("button", { name: "Cancel" })).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

  await hiddenPosition.click();
  await confirm.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
    { action: "choose_target_card", extra: { targetCardZone: "hand", targetCardIndex: 1 } },
  ]);
});

test("Steal modal preserves the existing public Judgment ID payload", async ({ page }) => {
  await loadPendingTargetCard(page, { width: 480, count: 6, cardKind: "Steal" });
  const dialog = page.getByRole("dialog", { name: "Steal target card selection" });
  const publicCard = dialog.getByRole("button", { name: "Judgement: Lightning" });

  await expect(dialog.locator("header span")).toHaveText("Choose 1 card to obtain");
  await publicCard.click();
  await expect(publicCard).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Use Steal" }).click();
  await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
    { action: "choose_target_card", extra: { targetCardZone: "judgement", targetCardId: "browser-target-judgement" } },
  ]);
});

for (const scenario of [
  { cardKind: "Dismantle", zone: "hand-position", name: "Hidden hand card 3", payload: { targetCardZone: "hand", targetCardIndex: 2 } },
  { cardKind: "Dismantle", zone: "equipment", name: "Equipment: Nio Shield", payload: { targetCardZone: "equipment", targetCardId: "browser-target-equipment" } },
  { cardKind: "Dismantle", zone: "judgement", name: "Judgement: Lightning", payload: { targetCardZone: "judgement", targetCardId: "browser-target-judgement" } },
  { cardKind: "Steal", zone: "hand-position", name: "Hidden hand card 3", payload: { targetCardZone: "hand", targetCardIndex: 2 } },
  { cardKind: "Steal", zone: "equipment", name: "Equipment: Nio Shield", payload: { targetCardZone: "equipment", targetCardId: "browser-target-equipment" } },
  { cardKind: "Steal", zone: "judgement", name: "Judgement: Lightning", payload: { targetCardZone: "judgement", targetCardId: "browser-target-judgement" } },
]) {
  test(`${scenario.cardKind} modal submits its exact CurrentAction ${scenario.zone} choice`, async ({ page }) => {
    await loadPendingTargetCard(page, { width: 390, cardKind: scenario.cardKind });
    const dialog = page.getByRole("dialog", { name: `${scenario.cardKind} target card selection` });
    const choice = dialog.getByRole("button", { name: scenario.name });

    await expect(choice).toHaveAttribute("data-target-card-zone", scenario.zone);
    await choice.click();
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: `Use ${scenario.cardKind}` }).click();
    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "choose_target_card", extra: scenario.payload },
    ]);
  });
}

for (const targetCardCase of ["missing-projection", "out-of-range", "unfocused", "zone-only"]) {
  test(`Pending target-card picker remains when Hero Focus proof is unavailable (${targetCardCase})`, async ({ page }) => {
    await loadPendingTargetCard(page, { width: 390, targetCardCase });
    await expect(page.getByRole("dialog", { name: "Choose one current card from Player 2" })).toBeVisible();
    await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
  });
}

test("Dismantle modal selection resets when CurrentAction revision changes", async ({ page }) => {
  await loadPendingTargetCard(page, { width: 390 });
  const dialog = page.getByRole("dialog", { name: "Dismantle target card selection" });
  const hiddenPosition = dialog.getByRole("button", { name: "Hidden hand card 1" });
  const confirm = dialog.getByRole("button", { name: "Use Dismantle" });

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
        const style = getComputedStyle(element);
        return { x, y, width, height, cssWidth: style.width, cssHeight: style.height };
      })),
    ]);
    const stageParts = await stage.evaluate((element) => Object.fromEntries(
      [".interaction-stage-body", ".interaction-stage-hero-region", ".interaction-stage-current-effect-flow", ".hero-focus", ".hero-focus-selectable-detail", ".hero-focus-selectable-detail-row"]
        .map((selector) => {
          const node = element.querySelector(selector);
          if (!node) return [selector, null];
          const { x, y, width, height } = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return [selector, { x, y, width, height, display: style.display, gridTemplateColumns: style.gridTemplateColumns, gridTemplateRows: style.gridTemplateRows }];
        }),
    ));
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
      expect(positionBox.width).toBeGreaterThanOrEqual(44);
      expect(positionBox.height).toBeGreaterThanOrEqual(44);
      expect(positionBox.y + positionBox.height, JSON.stringify({ positionBox, dockBox, stageParts })).toBeLessThanOrEqual(dockBox.y + 1);
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
  { width: 320, height: 568 },
  { width: 390, height: 640 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`proven Kirin Bow uses an Equipment-only shared modal at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const { stage, dialog } = await loadKirinBowModal(page, viewport);
    const overlay = page.locator(".target-card-picker-overlay");
    const mounts = dialog.locator('[data-target-card-zone="equipment"]');
    const stageBefore = await stage.boundingBox();
    const dock = page.locator(".local-player-dock");
    const dockBefore = await dock.boundingBox();
    const [overlayBox, panelBox, mountBoxes, actionHeights] = await Promise.all([
      overlay.boundingBox(), dialog.boundingBox(),
      mounts.evaluateAll((elements) => elements.map((element) => {
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      })),
      dialog.locator(".target-card-picker-actions button").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height)),
    ]);

    await expect(stage).toHaveAttribute("data-current-effect", "Attack");
    await expect(dialog.locator("header strong")).toHaveText("KIRIN BOW");
    await expect(dialog.locator("header span")).toHaveText("Choose 1 Mount to discard");
    await expect(dialog.locator(".target-card-picker-zone-equipment h3")).toHaveText("EQUIPMENT");
    await expect(dialog.locator(".target-card-picker-zone-hand")).toHaveCount(0);
    await expect(dialog.locator(".target-card-picker-zone-judgement")).toHaveCount(0);
    await expect(mounts).toHaveCount(2);
    await expect(mounts.nth(0)).toHaveAccessibleName("Equipment: Red Hare");
    await expect(mounts.nth(1)).toHaveAccessibleName("Equipment: Shadowrunner");
    await expect(dialog.getByRole("button", { name: "Equipment: Nio Shield" })).toHaveCount(0);
    await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
    await expect(page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm", exact: true })).toHaveCount(0);
    await expect(dialog.getByRole("button", { name: "Cancel" })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Use Kirin Bow" })).toBeDisabled();
    await expect(dialog.locator(".target-card-picker-count")).toHaveText("0 / 1 selected");
    const dockHitIsBlocked = await page.evaluate(() => {
      const dock = document.querySelector(".local-player-dock");
      if (!dock) return false;
      const box = dock.getBoundingClientRect();
      const hit = document.elementFromPoint(box.x + box.width / 2, box.y + box.height / 2);
      return Boolean(hit?.closest(".target-card-picker-overlay"));
    });
    expect(dockHitIsBlocked).toBe(true);

    const targetProjection = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p1"));
    expect(targetProjection.equipmentCards.map((card) => card.id)).toEqual([
      "browser-kirin-bow-offensive-mount",
      "browser-kirin-bow-defensive-mount",
      "browser-kirin-bow-ineligible-armour",
    ]);
    expect(stageBefore && dockBefore && overlayBox && panelBox).toBeTruthy();
    expect(overlayBox.x).toBeCloseTo(0, 1);
    expect(overlayBox.y).toBeCloseTo(0, 1);
    expect(overlayBox.width).toBeCloseTo(viewport.width, 1);
    expect(overlayBox.height).toBeCloseTo(viewport.height, 1);
    expect(panelBox.x).toBeGreaterThanOrEqual(0);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
    expect(panelBox.y).toBeGreaterThanOrEqual(0);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);
    expect(mountBoxes).toHaveLength(2);
    expect(actionHeights.length).toBeGreaterThanOrEqual(2);
    for (const height of actionHeights) expect(height).toBeGreaterThanOrEqual(44);
    for (const mountBox of mountBoxes) {
      expect(mountBox.width).toBeGreaterThanOrEqual(44);
      expect(mountBox.height).toBeGreaterThanOrEqual(44);
    }

    await mounts.nth(1).click();
    await expect(mounts.nth(1)).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator(".target-card-picker-count")).toHaveText("1 / 1 selected");
    await expect(dialog.getByRole("button", { name: "Use Kirin Bow" })).toBeEnabled();
    await expect(mounts.nth(0)).toBeDisabled();
    const [stageAfter, dockAfter] = await Promise.all([stage.boundingBox(), dock.boundingBox()]);
    expectSameBox(stageAfter, stageBefore);
    expectSameBox(dockAfter, dockBefore);
    const overflow = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);
  });
}

test("Kirin Bow modal submits exactly the selected authoritative Mount key", async ({ page }) => {
  const { dialog } = await loadKirinBowModal(page, { width: 390, height: 844 });
  const mount = dialog.getByRole("button", { name: "Equipment: Shadowrunner" });
  const use = dialog.getByRole("button", { name: "Use Kirin Bow" });

  await mount.click();
  await expect(mount).toHaveAttribute("aria-pressed", "true");
  await expect(use).toBeEnabled();
  expect(await page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([]);
  await use.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "kirin_bow_damage_about_to_apply", cardKeys: ["browser-kirin-bow-defensive-mount"] } },
  ]);
});

test("Kirin Bow Cancel clears only local selection and does not submit", async ({ page }) => {
  const { dialog } = await loadKirinBowModal(page, { width: 390, height: 844 });
  const mount = dialog.getByRole("button", { name: "Equipment: Red Hare" });
  const cancel = dialog.getByRole("button", { name: "Cancel" });
  const use = dialog.getByRole("button", { name: "Use Kirin Bow" });

  await mount.click();
  await expect(mount).toHaveAttribute("aria-pressed", "true");
  await cancel.click();
  await expect(dialog).toBeVisible();
  await expect(mount).toHaveAttribute("aria-pressed", "false");
  await expect(use).toBeDisabled();
  expect(await page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([]);
});

test("Kirin Bow modal selection clears on CurrentAction revision change", async ({ page }) => {
  const { dialog } = await loadKirinBowModal(page, { width: 390, height: 844 });
  const mount = dialog.getByRole("button", { name: "Equipment: Red Hare" });
  const use = dialog.getByRole("button", { name: "Use Kirin Bow" });

  await mount.click();
  await expect(mount).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.__setBrowserActionRevision("browser-kirin-bow-new-action"));
  await expect(dialog).toBeVisible();
  await expect(mount).toHaveAttribute("aria-pressed", "false");
  await expect(use).toBeDisabled();
  await expect(page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm", exact: true })).toHaveCount(0);
});

for (const targetCardCase of ["unfocused", "unprojected"]) {
  test(`Kirin Bow keeps the safe fallback when Mount proof is unavailable (${targetCardCase})`, async ({ page }) => {
    await loadKirinBowSelectableDetail(page, { width: 390, targetCardCase });

    const dialog = page.getByRole("dialog", { name: "Kirin Bow target card selection" });
    await expect(dialog).toBeVisible();
    await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
    await expect(dialog.locator("header span")).toHaveText("Choose 1 Mount to discard");
    if (targetCardCase === "unprojected") {
      await expect(dialog.locator(".target-card-picker-zone-equipment")).toHaveCount(0);
      await expect(dialog.getByRole("button", { name: "Use Kirin Bow" })).toBeDisabled();
    } else {
      await expect(dialog.locator('.target-card-picker-zone-equipment [data-target-card-zone="equipment"]')).toHaveCount(2);
    }
  });
}

for (const viewport of [
  { width: 390, height: 640 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`proven Frost Sword selection uses the unified modal at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const { stage, dialog } = await loadFrostSwordModal(page, viewport);
    const overlay = page.locator(".target-card-picker-overlay");
    const positions = dialog.locator('[data-target-card-zone="hand-position"]');
    const equipment = dialog.locator('[data-target-card-zone="equipment"]');
    const dock = page.locator(".local-player-dock");
    const [stageBefore, dockBefore] = await Promise.all([stage.boundingBox(), dock.boundingBox()]);

    await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
    await expect(dialog.locator("header strong")).toHaveText("FROST SWORD");
    await expect(dialog.locator("header span")).toHaveText("Choose 1–2 cards to discard");
    await expect(dialog.locator(".target-card-picker-zone-hand h3")).toHaveText("HAND · 4");
    await expect(dialog.locator(".target-card-picker-zone-equipment h3")).toHaveText("EQUIPMENT");
    await expect(positions).toHaveCount(4);
    for (let index = 0; index < 4; index += 1) {
      await expect(positions.nth(index)).toHaveAccessibleName(`Hidden hand card ${index + 1}`);
      await expect(positions.nth(index)).toHaveAttribute("aria-pressed", "false");
      await expect(positions.nth(index)).not.toContainText(/Attack|Peach|Dodge|Negation/);
    }
    await expect(equipment).toHaveAccessibleName("Equipment: Nio Shield");
    await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
    await expect(dock.getByRole("button", { name: "Confirm", exact: true })).toHaveCount(0);
    const targetProjection = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p1"));
    expect(targetProjection.handCount).toBe(4);
    expect(targetProjection.handCards ?? []).toEqual([]);

    const [overlayBox, panelBox, positionBox, equipmentBox, actionBoxes] = await Promise.all([
      overlay.boundingBox(), dialog.boundingBox(), positions.first().boundingBox(), equipment.boundingBox(),
      dialog.locator(".target-card-picker-actions button").evaluateAll((buttons) => buttons.map((button) => button.getBoundingClientRect().height)),
    ]);
    expect(stageBefore && dockBefore && overlayBox && panelBox && positionBox && equipmentBox).toBeTruthy();
    expect(overlayBox.x).toBeCloseTo(0, 1);
    expect(overlayBox.y).toBeCloseTo(0, 1);
    expect(overlayBox.width).toBeCloseTo(viewport.width, 1);
    expect(overlayBox.height).toBeCloseTo(viewport.height, 1);
    expect(panelBox.x).toBeGreaterThanOrEqual(0);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
    expect(panelBox.y).toBeGreaterThanOrEqual(0);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);
    expect(actionBoxes.length).toBe(3);
    for (const height of actionBoxes) expect(height).toBeGreaterThanOrEqual(44);
    expect(positionBox.width).toBeGreaterThanOrEqual(44);
    expect(positionBox.height).toBeGreaterThanOrEqual(44);
    expect(equipmentBox.width).toBeGreaterThanOrEqual(44);
    expect(equipmentBox.height).toBeGreaterThanOrEqual(44);

    await positions.first().click();
    const [stageAfter, dockAfter] = await Promise.all([stage.boundingBox(), dock.boundingBox()]);
    expectSameBox(stageAfter, stageBefore);
    expectSameBox(dockAfter, dockBefore);
    const overflow = await page.evaluate(() => ({ viewport: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(overflow.document).toBeLessThanOrEqual(overflow.viewport);
  });
}

test("Frost Sword keeps ten opaque Hand positions inside the modal's horizontally scrollable zone", async ({ page }) => {
  const { dialog } = await loadFrostSwordModal(page, { width: 390, height: 640, handCount: 10 });
  const positions = dialog.locator('[data-target-card-zone="hand-position"]');
  const row = dialog.locator(".target-card-picker-zone-hand .target-card-picker-card-row");

  await expect(dialog.locator("header span")).toHaveText("Choose 1–2 cards to discard");
  await expect(dialog.locator(".target-card-picker-zone-hand h3")).toHaveText("HAND · 10");
  await expect(positions).toHaveCount(10);
  for (let index = 0; index < 10; index += 1) {
    await expect(positions.nth(index)).toHaveAccessibleName(`Hidden hand card ${index + 1}`);
  }
  const geometry = await page.evaluate(() => ({
    viewportWidth: window.innerWidth,
    documentWidth: document.documentElement.scrollWidth,
    rowClientWidth: document.querySelector(".target-card-picker-zone-hand .target-card-picker-card-row")?.clientWidth ?? 0,
    rowScrollWidth: document.querySelector(".target-card-picker-zone-hand .target-card-picker-card-row")?.scrollWidth ?? 0,
  }));
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.rowScrollWidth).toBeGreaterThan(geometry.rowClientWidth);
  await expect(row).toHaveCSS("overflow-x", "auto");
});

test("Frost Sword modal submits a mixed Hand + Equipment selection and enforces its two-card maximum", async ({ page }) => {
  const { dialog } = await loadFrostSwordModal(page, { width: 390, height: 844 });
  const positions = dialog.locator('[data-target-card-zone="hand-position"]');
  const hiddenPosition = positions.nth(0);
  const anotherPosition = positions.nth(1);
  const equipment = dialog.locator('[data-target-card-zone="equipment"]');
  const use = dialog.getByRole("button", { name: "Use Frost Sword" });

  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  await equipment.click();
  await expect(equipment).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".target-card-picker-count")).toHaveText("2 / 2 selected");
  await expect(anotherPosition).toBeDisabled();
  await expect(use).toBeEnabled();
  await use.click();

  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "frost_sword_damage_about_to_apply", cardKeys: ["hand:0", "browser-public-equipment"] } },
  ]);
});

test("Frost Sword modal selection clears on CurrentAction revision without duplicating Dock controls", async ({ page }) => {
  const { dialog } = await loadFrostSwordModal(page, { width: 390, height: 844 });
  const hiddenPosition = dialog.getByRole("button", { name: "Hidden hand card 2" });
  const use = dialog.getByRole("button", { name: "Use Frost Sword" });

  await hiddenPosition.click();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.__setBrowserActionRevision("browser-frost-sword-new-action"));
  await expect(dialog).toBeVisible();
  await expect(hiddenPosition).toHaveAttribute("aria-pressed", "false");
  await expect(use).toBeDisabled();
  await expect(page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm", exact: true })).toHaveCount(0);
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

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`proven Sima Yi Retaliation opens a full-screen target-card modal at ${viewport.width}×${viewport.height}`, async ({ page }) => {
    const { dialog, before } = await openRetaliationModal(page, { ...viewport, targetCardCase: "positioned-hand" });
    const overlay = page.locator(".target-card-picker-overlay");
    const handPositions = dialog.locator('[data-target-card-zone="hand-position"]');
    const equipment = dialog.locator('[data-target-card-zone="equipment"]');

    await expect(dialog.locator("header strong")).toHaveText("RETALIATION");
    await expect(dialog.locator("header span")).toHaveText("Choose 1 card to obtain");
    await expect(dialog.locator(".target-card-picker-zone-hand h3")).toHaveText("HAND · 4");
    await expect(handPositions).toHaveCount(4);
    await expect(handPositions.nth(0)).toHaveAccessibleName("Hidden hand card 1");
    await expect(handPositions.nth(2)).not.toContainText(/Attack|Peach|Dodge|Negation|browser-retaliation/);
    await expect(dialog.locator(".target-card-picker-zone-equipment h3")).toHaveText("EQUIPMENT");
    await expect(dialog.locator(".target-card-picker-zone-judgement")).toHaveCount(0);
    await expect(equipment).toHaveAccessibleName("Equipment: Nio Shield");
    await expect(dialog.getByRole("button", { name: "Use Retaliation" })).toBeDisabled();
    await expect(dialog.getByRole("button", { name: "Cancel", exact: true })).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Skip", exact: true })).toBeVisible();
    await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
    await expect(page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm", exact: true })).toHaveCount(0);

    const [overlayBox, panelBox, stageBox, dockBox, controls] = await Promise.all([
      overlay.boundingBox(), dialog.boundingBox(), page.locator(".play-table").boundingBox(), page.locator(".local-player-dock").boundingBox(),
      dialog.locator(".target-card-picker-actions button").evaluateAll((buttons) => buttons.map((button) => {
        const { width, height } = button.getBoundingClientRect();
        return { width, height };
      })),
    ]);
    expect(overlayBox).toBeTruthy();
    expect(panelBox).toBeTruthy();
    expect(stageBox).toBeTruthy();
    expect(dockBox).toBeTruthy();
    expect(overlayBox.x).toBeCloseTo(0, 1);
    expect(overlayBox.y).toBeCloseTo(0, 1);
    expect(overlayBox.width).toBeCloseTo(viewport.width, 1);
    expect(overlayBox.height).toBeCloseTo(viewport.height, 1);
    expect(panelBox.x).toBeGreaterThanOrEqual(0);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
    expect(panelBox.y).toBeGreaterThanOrEqual(0);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);
    expectSameBox(stageBox, before.stage);
    expectSameBox(dockBox, before.dock);
    expect(controls.length).toBe(3);
    for (const control of controls) expect(control.height).toBeGreaterThanOrEqual(44);
    for (const selectable of [...await handPositions.all(), equipment]) {
      const box = await selectable.boundingBox();
      expect(box.width).toBeGreaterThanOrEqual(44);
      expect(box.height).toBeGreaterThanOrEqual(44);
    }

    const skill = page.getByRole("button", { name: "Retaliation", exact: true });
    const skillBox = await skill.boundingBox();
    expect(skillBox).toBeTruthy();
    const hit = await page.evaluate(({ x, y }) => Boolean(document.elementFromPoint(x, y)?.closest(".target-card-picker-overlay")), {
      x: skillBox.x + skillBox.width / 2,
      y: skillBox.y + skillBox.height / 2,
    });
    expect(hit).toBe(true);
    const overflow = await page.evaluate(() => ({ width: window.innerWidth, document: document.documentElement.scrollWidth }));
    expect(overflow.document).toBeLessThanOrEqual(overflow.width);
    const target = await page.evaluate(() => window.__browserRoom.players.find((player) => player.id === "p2"));
    expect(target.handCount).toBe(4);
    expect(target.handCards ?? []).toEqual([]);
    await expect(dialog).not.toContainText(/Attack|Peach|Dodge|Negation|browser-retaliation/);
  });
}

test("Retaliation grouped-Hand fallback submits the authoritative Hand-zone key", async ({ page }) => {
  const { dialog } = await openRetaliationModal(page, { width: 390 });
  const handZone = dialog.locator('[data-target-card-zone="hand"]');
  const use = dialog.getByRole("button", { name: "Use Retaliation" });

  await handZone.click();
  await expect(handZone).toHaveAttribute("aria-pressed", "true");
  await expect(dialog.locator(".target-card-picker-count")).toHaveText("1 / 1 selected");
  await expect(use).toBeEnabled();
  expect(await submittedTriggerActions(page)).toEqual([]);
  await use.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "sima_yi_fankui", cardKeys: ["hand"] } },
  ]);
});

test("Retaliation modal preserves server-projected anonymous Hand positions and public Equipment payloads", async ({ page }) => {
  const { dialog } = await openRetaliationModal(page, { width: 480, targetCardCase: "positioned-hand", handCount: 4 });
  const positions = dialog.locator('[data-target-card-zone="hand-position"]');
  const equipment = dialog.locator('[data-target-card-zone="equipment"]');

  await expect(positions).toHaveCount(4);
  await expect(positions.nth(2)).toHaveAccessibleName("Hidden hand card 3");
  await expect(positions.nth(2)).not.toContainText(/Attack|Peach|Dodge|Negation/);
  await expect(equipment).toHaveAccessibleName("Equipment: Nio Shield");
  await equipment.click();
  await expect(equipment).toHaveAttribute("aria-pressed", "true");
  await dialog.getByRole("button", { name: "Use Retaliation" }).click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "sima_yi_fankui", cardKeys: ["browser-retaliation-equipment"] } },
  ]);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`Retaliation submits only the selected opaque Hand position at ${viewport.width}px`, async ({ page }) => {
    const { dialog } = await openRetaliationModal(page, { ...viewport, targetCardCase: "positioned-hand", handCount: 4 });
    const position = dialog.getByRole("button", { name: "Hidden hand card 3" });
    await expect(page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Confirm", exact: true })).toHaveCount(0);
    await position.click();
    await expect(position).toHaveAttribute("aria-pressed", "true");
    await dialog.getByRole("button", { name: "Use Retaliation" }).click();
    await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
      { action: "trigger", extra: { providerId: "sima_yi_fankui", cardKeys: ["hand:2"] } },
    ]);
  });
}

test("shared modal keeps a public Judgment card face and its authoritative key when focus proof is absent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=picker-hand-zone&count=4&targetHandCount=4&source=none");
  const dialog = page.getByRole("dialog", { name: "Retaliation target card selection" });
  await expect(dialog).toBeVisible();
  await expect(dialog.locator(".target-card-picker-zone-hand h3")).toHaveText("HAND · 4");
  await expect(dialog.locator(".target-card-picker-zone-equipment h3")).toHaveText("EQUIPMENT");
  await expect(dialog.locator(".target-card-picker-zone-judgement h3")).toHaveText("JUDGMENT");
  const judgement = dialog.getByRole("button", { name: "Judgement: Lightning" });
  await expect(judgement.locator(".played-card")).toBeVisible();
  await judgement.click();
  await dialog.getByRole("button", { name: "Use Retaliation" }).click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "trigger"))).toEqual([
    { action: "trigger", extra: { providerId: "browser_retaliation_zone", cardKeys: ["browser-public-judgement"] } },
  ]);
});

test("Retaliation modal Cancel is local while Skip remains an authoritative trigger decline", async ({ page }) => {
  let { dialog } = await openRetaliationModal(page, { width: 390, targetCardCase: "positioned-hand" });
  const skill = page.getByRole("button", { name: "Retaliation", exact: true });
  await dialog.getByRole("button", { name: "Hidden hand card 1" }).click();
  await dialog.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(await submittedTriggerActions(page)).toEqual([]);

  await skill.click();
  dialog = page.getByRole("dialog", { name: "Retaliation target card selection" });
  await expect(dialog).toBeVisible();
  await expect(page.locator('[data-console-surface="local-operation"]').getByRole("button", { name: "Skip", exact: true })).toHaveCount(0);
  await dialog.getByRole("button", { name: "Skip", exact: true }).click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.filter((entry) => entry.action === "decline_trigger").map((entry) => entry.action))).toEqual(["decline_trigger"]);
});

test("Retaliation modal local selection clears when the CurrentAction revision changes", async ({ page }) => {
  const { dialog } = await openRetaliationModal(page, { width: 390, targetCardCase: "positioned-hand" });
  const position = dialog.getByRole("button", { name: "Hidden hand card 3" });
  await position.click();
  await expect(position).toHaveAttribute("aria-pressed", "true");
  await page.evaluate(() => window.__setBrowserActionRevision("browser-retaliation-modal-new-action"));
  await expect(page.getByRole("dialog", { name: "Retaliation target card selection" })).toHaveCount(0);
  expect(await submittedTriggerActions(page)).toEqual([]);
});
