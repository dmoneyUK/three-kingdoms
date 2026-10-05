import { expect, test } from "@playwright/test";

async function loadFixture(page, { count = 4, width, height = 900, state = "active-attack-observer", effect = null, source = null, duelObserver = false, duelParticipantMissing = false }) {
  await page.setViewportSize({ width, height });
  const effectQuery = effect ? `&effect=${encodeURIComponent(effect)}` : "";
  const sourceQuery = source ? `&source=${encodeURIComponent(source)}` : "";
  const duelObserverQuery = duelObserver ? "&duelObserver=1" : "";
  const missingDuelParticipantQuery = duelParticipantMissing ? "&duelParticipant=missing" : "";
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}${effectQuery}${sourceQuery}${duelObserverQuery}${missingDuelParticipantQuery}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

for (const viewport of [
  { count: 4, width: 390, height: 844, topology: "top-row" },
  { count: 6, width: 480, height: 900, topology: "side-column" },
  { count: 4, width: 1440, height: 900, topology: "top-row" },
]) {
  test(`proven Attack Response Current Effect fits ${viewport.topology} at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, viewport);
    const stage = page.locator('[aria-label="Interaction Stage"]');
    const source = stage.locator('.medium-participant-card[data-medium-participant-player-id="p1"]');
    const effect = stage.locator('[aria-label="Current Effect"]');
    const target = stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"]');
    await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
    await expect(stage).toHaveAttribute("data-current-effect", "Attack");
    await expect(stage.locator(":scope > header strong")).toHaveText("Attack Response");
    const summary = stage.locator('[data-stage-event-summary="proven"]');
    await expect(summary).toHaveText("Player 1 used Attack on Player 2.");
    await expect(effect).toContainText("CURRENT EFFECT");
    await expect(effect.locator("strong")).toHaveText("Attack");
    await expect(stage).toHaveAttribute("data-interaction-id", "browser-active-attack-observer-interaction");
    await expect(source).toContainText("Player 1");
    await expect(target).toContainText("Player 2");
    await expect(stage).not.toContainText("INTERACTION STAGE");
    await expect(stage).not.toContainText("HERO FOCUS");
    await expect(target.locator(".hero-focus-heading strong")).toHaveText("Target");
    const publicInteraction = await page.evaluate(() => window.__browserRoom.presentationSnapshot.interaction);
    expect(publicInteraction.decisionActorId).toBe("p2");
    await expect(stage.locator('[data-stage-meta-role="decision"]')).toHaveCount(0);
    await expect(stage).not.toContainText("Player 3");
    await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toBeVisible();
    await expect(page.locator(".local-player-dock")).toContainText("Sun Quan");
    await expect(stage).not.toContainText("Sun Quan");
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

    const sourceBox = await source.boundingBox();
    const effectBox = await effect.boundingBox();
    const targetBox = await target.boundingBox();
    const stageBox = await stage.boundingBox();
    const dockBox = await page.locator(".local-player-dock").boundingBox();
    expect(sourceBox && effectBox && targetBox && stageBox && dockBox).toBeTruthy();
    if (viewport.topology === "side-column") {
      expect(sourceBox.y + sourceBox.height).toBeLessThanOrEqual(effectBox.y + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(targetBox.y + 2);
    } else if (viewport.width <= 650) {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(targetBox.y + 2);
    } else {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.x + effectBox.width).toBeLessThanOrEqual(targetBox.x + 2);
    }
    expect(stageBox.x).toBeGreaterThanOrEqual(0);
    expect(stageBox.x + stageBox.width).toBeLessThanOrEqual(viewport.width);
    expect(Math.max(0, Math.min(stageBox.y + stageBox.height, dockBox.y + dockBox.height) - Math.max(stageBox.y, dockBox.y))).toBe(0);
    const titleBox = await stage.locator(":scope > header").boundingBox();
    const summaryBox = await summary.boundingBox();
    expect(titleBox && summaryBox).toBeTruthy();
    expect(summaryBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);
  });
}

for (const viewport of [
  { count: 4, width: 390, height: 844, topology: "top-row" },
  { count: 6, width: 480, height: 900, topology: "side-column" },
  { count: 4, width: 1440, height: 900, topology: "top-row" },
]) {
  test(`proven Duel Current Effect fits ${viewport.topology} at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "duel", duelObserver: true });
    const stage = page.locator('[aria-label="Interaction Stage"][data-stage="DUEL_EXCHANGE"]');
    const source = stage.locator('.medium-participant-card[data-medium-participant-player-id="p1"]');
    const effect = stage.locator('[aria-label="Current Effect"]');
    const currentParticipant = stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"]');
    await expect(stage).toHaveAttribute("data-current-effect", "Duel");
    await expect(stage.locator(":scope > header strong")).toHaveText("Duel Exchange");
    const summary = stage.locator('[data-stage-event-summary="proven"]');
    await expect(summary).toHaveText("Duel between Player 1 and Player 2 is in progress.");
    await expect(effect.locator("strong")).toHaveText("Duel");
    await expect(source).toContainText("Player 1");
    await expect(currentParticipant).toContainText("Player 2");
    await expect(stage).not.toContainText("INTERACTION STAGE");
    await expect(stage).not.toContainText("HERO FOCUS");
    await expect(currentParticipant.locator(".hero-focus-heading strong")).toHaveText("Target");
    await expect(stage.locator('[data-stage-meta-role="decision"]')).toHaveCount(0);
    await expect(stage.locator(".medium-participant-arrow, .current-effect-arrow")).toHaveCount(2);
    await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toBeVisible();
    await expect(stage.locator('[data-hero-focus-player-id="p3"]')).toHaveCount(0);
    await expect(stage).not.toContainText("Player 3");
    await expect(page.locator('[data-action-slot="primary"] button')).toHaveCount(0);
    await expect(page.locator('[data-action-slot="decline"] button')).toHaveCount(0);

    const projection = await page.evaluate(() => window.__browserRoom.presentationSnapshot.interaction);
    expect(projection.stage).toBe("DUEL_EXCHANGE");
    expect(projection.effect.toLowerCase()).toBe("duel");
    expect(projection.currentParticipantId).toBe("p2");
    expect(projection.decisionActorId).toBe("p2");
    expect(projection.targetIds).toEqual(["p2", "p1"]);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.legalActions)).toEqual([]);
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

    const sourceBox = await source.boundingBox();
    const effectBox = await effect.boundingBox();
    const participantBox = await currentParticipant.boundingBox();
    const stageBox = await stage.boundingBox();
    const dockBox = await page.locator(".local-player-dock").boundingBox();
    expect(sourceBox && effectBox && participantBox && stageBox && dockBox).toBeTruthy();
    if (viewport.topology === "side-column") {
      expect(sourceBox.y + sourceBox.height).toBeLessThanOrEqual(effectBox.y + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(participantBox.y + 2);
    } else if (viewport.width <= 650) {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(participantBox.y + 2);
    } else {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.x + effectBox.width).toBeLessThanOrEqual(participantBox.x + 2);
    }
    expect(Math.max(0, Math.min(stageBox.y + stageBox.height, dockBox.y + dockBox.height) - Math.max(stageBox.y, dockBox.y))).toBe(0);
    const titleBox = await stage.locator(":scope > header").boundingBox();
    const summaryBox = await summary.boundingBox();
    expect(titleBox && summaryBox).toBeTruthy();
    expect(summaryBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);
  });
}

test("Duel Current Effect fails closed without effect or current-participant proof", async ({ page }) => {
  await loadFixture(page, { width: 480, count: 6, state: "duel", duelObserver: true, effect: "none" });
  let stage = page.locator('[data-stage="DUEL_EXCHANGE"]');
  await expect(stage).not.toHaveAttribute("data-current-effect");
  await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);
  await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
  await expect(stage).toContainText("INTERACTION STAGE");

  await loadFixture(page, { width: 480, count: 6, state: "duel", duelObserver: true, duelParticipantMissing: true });
  stage = page.locator('[data-stage="DUEL_EXCHANGE"]');
  await expect(stage).not.toHaveAttribute("data-current-effect");
  await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);
  await expect(stage.locator(".current-effect-arrow")).toHaveCount(0);
  await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
  await expect(stage).toContainText("INTERACTION STAGE");
});

test("Inspect preserves ACTIVE Current Effect without linking it to the inspected opponent", async ({ page }) => {
  await loadFixture(page, { width: 1440, height: 900 });
  const stage = page.locator('[aria-label="Interaction Stage"]');
  const identity = await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage", "data-current-effect"].map((name) => [name, element.getAttribute(name)]),
  ));
  await page.locator('[data-player-anchor="p4"] .opponent-hero-target').click();
  const inspect = stage.locator('.hero-focus-inspect[data-inspect-player-id="p4"]');
  await expect(inspect).toBeVisible();
  await expect(stage.locator('[aria-label="Current Effect"] strong')).toHaveText("Attack");
  await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
  await expect(stage.locator(".medium-participant-card, .medium-participant-arrow, .current-effect-arrow")).toHaveCount(0);
  await page.getByRole("button", { name: "Close Player 4 inspection", exact: true }).click();
  await expect(stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"]')).toBeVisible();
  await expect(stage.locator(".medium-participant-card")).toBeVisible();
  expect(await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage", "data-current-effect"].map((name) => [name, element.getAttribute(name)]),
  ))).toEqual(identity);
});

for (const viewport of [
  { count: 4, width: 390, height: 844, topology: "top-row" },
  { count: 4, width: 1440, height: 900, topology: "top-row" },
  { count: 6, width: 480, height: 900, topology: "side-column" },
]) {
  test(`proven NEGATION Current Effect fits ${viewport.topology} at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "active-negation-observer" });
    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    const source = stage.locator('.medium-participant-card[data-medium-participant-player-id="p1"]');
    const effect = stage.locator('[aria-label="Current Effect"]');
    const target = stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"]');
    const chain = stage.locator('[data-reaction-chain="proven"]');
    await expect(page.locator(".play-table")).toHaveAttribute("data-seat-topology", viewport.topology);
    await expect(stage).toHaveAttribute("data-stage", "NEGATION");
    await expect(stage).toHaveAttribute("data-current-effect", "Dismantle");
    await expect(stage).toHaveAttribute("data-interaction-id", "browser-active-negation-observer-interaction");
    const summary = stage.locator('[data-stage-event-summary="proven"]');
    await expect(summary).toHaveText("Player 1 used Dismantle on Player 2.");
    await expect(source).toContainText("Player 1");
    await expect(effect.locator("strong")).toHaveText("Dismantle");
    await expect(target).toContainText("Player 2");
    await expect(chain).toContainText("ORIGINAL EFFECT");
    await expect(chain.locator('[data-reaction-node="root"]')).toContainText("Dismantle");
    await expect(chain.locator('[data-reaction-node="active"]')).toContainText("NEGATION WINDOW");
    await expect(chain.locator('[data-reaction-node="active"]')).toContainText("Waiting for response...");
    await expect(chain).not.toContainText("Player 3");
    await expect(stage).not.toContainText("Player 3");
    await expect(stage).not.toContainText("INTERACTION STAGE");
    await expect(stage).not.toContainText("HERO FOCUS");
    await expect(stage.locator(".hero-focus-heading strong")).toHaveText("Target");
    await expect(stage.locator('[data-negation-window-state="open"]')).toContainText("A Negation may be played now.");
    await expect(stage.locator(".medium-participant-arrow")).toHaveCount(1);
    await expect(stage.locator(".current-effect-arrow")).toHaveCount(1);
    await expect(page.locator('.local-player-dock[data-player-anchor="p4"]')).toBeVisible();
    await expect(stage.locator('[data-hero-focus-player-id="p4"]')).toHaveCount(0);
    const hiddenResponderSeat = page.locator('.player-board [data-player-anchor="p3"]');
    await expect(hiddenResponderSeat).not.toHaveClass(/action-square|interaction-seat-decision-actor|interaction-seat-active-resolver/);
    await expect(hiddenResponderSeat).not.toHaveAttribute("data-interaction-decision-actor");
    await expect(hiddenResponderSeat).not.toHaveAttribute("data-interaction-active-resolver");

    const sourceBox = await source.boundingBox();
    const effectBox = await effect.boundingBox();
    const targetBox = await target.boundingBox();
    const stageBox = await stage.boundingBox();
    const dockBox = await page.locator(".local-player-dock").boundingBox();
    expect(sourceBox && effectBox && targetBox && stageBox && dockBox).toBeTruthy();
    if (viewport.topology === "side-column") {
      expect(sourceBox.y + sourceBox.height).toBeLessThanOrEqual(effectBox.y + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(targetBox.y + 2);
    } else if (viewport.width <= 650) {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(targetBox.y + 2);
    } else {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.x + effectBox.width).toBeLessThanOrEqual(targetBox.x + 2);
    }
    expect(Math.max(0, Math.min(stageBox.y + stageBox.height, dockBox.y + dockBox.height) - Math.max(stageBox.y, dockBox.y))).toBe(0);
    const titleBox = await stage.locator(":scope > header").boundingBox();
    const summaryBox = await summary.boundingBox();
    expect(titleBox && summaryBox).toBeTruthy();
    expect(summaryBox.y).toBeGreaterThanOrEqual(titleBox.y + titleBox.height - 1);
  });
}

test("NEGATION effect stays unlinked without matching focus and fails closed for absent or ambiguous proof", async ({ page }) => {
  await loadFixture(page, { width: 1440, state: "active-negation-unfocused-observer" });
  let stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  await expect(stage).toHaveAttribute("data-current-effect", "Dismantle");
  await expect(stage.locator('[aria-label="Current Effect"]')).toBeVisible();
  await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
  await expect(stage.locator(".current-effect-arrow, .medium-participant-arrow")).toHaveCount(0);
  await expect(stage.locator('[data-hero-focus="true"]')).toHaveCount(0);
  await expect(stage).not.toContainText("Player 3");

  await loadFixture(page, { width: 480, count: 6, state: "active-negation-observer", effect: "none" });
  stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  await expect(stage).toHaveAttribute("data-stage", "NEGATION");
  await expect(stage).not.toHaveAttribute("data-current-effect");
  await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);
  await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
  await expect(stage.locator('[data-reaction-chain="proven"]')).toHaveCount(0);

  await loadFixture(page, { width: 480, count: 6, state: "active-negation-multi-observer" });
  stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  await expect(stage).toHaveAttribute("data-stage", "NEGATION");
  await expect(stage).not.toHaveAttribute("data-current-effect");
  await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);
  await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
  await expect(stage.locator(".current-effect-arrow")).toHaveCount(0);
  await expect(stage.locator('[data-hero-focus="true"]')).toHaveCount(0);
});

test("missing public source/effect fails closed and local REST/Preview do not invent a summary", async ({ page }) => {
  await loadFixture(page, { width: 480, effect: "none" });
  let stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  await expect(stage).not.toHaveAttribute("data-current-effect");
  await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);
  await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
  await expect(stage).toContainText("INTERACTION STAGE");
  await expect(stage).toContainText("HERO FOCUS");

  await loadFixture(page, { width: 480, source: "none" });
  stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage).toHaveAttribute("data-current-effect", "Attack");
  await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);

  await loadFixture(page, { state: "rest", width: 390 });
  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  await expect(page.locator('[aria-label="Interaction Stage"] .interaction-stage-current-effect')).toHaveCount(0);
  await expect(page.locator('[aria-label="Interaction Stage"] [data-stage-event-summary]')).toHaveCount(0);

  await loadFixture(page, { state: "ordinary-turn", width: 480 });
  await page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card').click();
  await page.getByRole("button", { name: "Select Player 2", exact: true }).click();
  stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage).toHaveAttribute("data-local-ui-mode", "PREVIEW");
  await expect(stage.locator(".interaction-stage-current-effect")).toHaveCount(0);
  await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
});
