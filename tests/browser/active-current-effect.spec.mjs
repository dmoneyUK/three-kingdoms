import { expect, test } from "@playwright/test";

async function loadFixture(page, { count = 4, width, height = 900, state = "active-attack-observer", effect = null, source = null, duelObserver = false, duelParticipantMissing = false, dyingParticipant = null, judgementParticipant = null, groupParticipant = null }) {
  await page.setViewportSize({ width, height });
  const effectQuery = effect ? `&effect=${encodeURIComponent(effect)}` : "";
  const sourceQuery = source ? `&source=${encodeURIComponent(source)}` : "";
  const duelObserverQuery = duelObserver ? "&duelObserver=1" : "";
  const missingDuelParticipantQuery = duelParticipantMissing ? "&duelParticipant=missing" : "";
  const dyingParticipantQuery = dyingParticipant ? `&dyingParticipant=${encodeURIComponent(dyingParticipant)}` : "";
  const judgementParticipantQuery = judgementParticipant ? `&judgementParticipant=${encodeURIComponent(judgementParticipant)}` : "";
  const groupParticipantQuery = groupParticipant ? `&groupParticipant=${encodeURIComponent(groupParticipant)}` : "";
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}${effectQuery}${sourceQuery}${duelObserverQuery}${missingDuelParticipantQuery}${dyingParticipantQuery}${judgementParticipantQuery}${groupParticipantQuery}`);
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
  { count: 4, width: 390, height: 640, topology: "top-row" },
  { count: 4, width: 390, height: 844, topology: "top-row" },
  { count: 6, width: 480, height: 900, topology: "side-column" },
  { count: 4, width: 1440, height: 900, topology: "top-row" },
]) {
  test(`proven Group Current Effect fits ${viewport.topology} at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "group-observer", effect: "RainingArrows" });
    const stage = page.locator('[aria-label="Interaction Stage"][data-stage="GROUP_RESOLUTION"]');
    const source = stage.locator('.medium-participant-card[data-medium-participant-player-id="p4"]');
    const effect = stage.locator('[aria-label="Current Effect"]');
    const participant = stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p1"]');
    const scope = stage.locator('[data-group-target-scope="original"]');

    await expect(stage).toHaveAttribute("data-current-effect", "Raining Arrows");
    await expect(stage.locator(":scope > header strong")).toHaveText("Group Resolution");
    await expect(stage.locator('[data-stage-event-summary="proven"]')).toHaveText("Player 4 used Raining Arrows. It is now resolving for Player 1.");
    await expect(source).toContainText("Player 4");
    await expect(effect.locator("strong")).toHaveText("Raining Arrows");
    await expect(participant).toContainText("Player 1");
    await expect(participant.locator(".hero-focus-heading strong")).toHaveText("Target");
    await expect(stage.locator(".current-effect-arrow")).toBeVisible();
    await expect(scope.locator(":scope > header")).toHaveText("ORIGINAL TARGET SCOPE");
    await expect(scope.locator(".group-target-card[data-group-target-id=\"p2\"]")).toBeVisible();
    await expect(scope).not.toContainText(/resolved|pending|waiting|✓|▶|○/i);
    await expect(stage.locator('[data-stage-meta-role="active-scope"]')).toHaveCount(0);
    await expect(stage.locator("button")).toHaveCount(0);
    await expect(page.locator(`.local-player-dock[data-player-anchor="p3"]`)).toBeVisible();
    await expect(stage.locator('[data-hero-focus-player-id="p3"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

    const [sourceBox, effectBox, participantBox, stageBox, dockBox] = await Promise.all([
      source.boundingBox(), effect.boundingBox(), participant.boundingBox(), stage.boundingBox(), page.locator(".local-player-dock").boundingBox(),
    ]);
    expect(sourceBox && effectBox && participantBox && stageBox && dockBox).toBeTruthy();
    if (viewport.height <= 640) {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.x + effectBox.width).toBeLessThanOrEqual(participantBox.x + 2);
      const sourceArrowBox = await stage.locator(".medium-participant-arrow").boundingBox();
      expect(sourceArrowBox).toBeTruthy();
      expect(Math.abs((sourceArrowBox.y + sourceArrowBox.height / 2) - (effectBox.y + effectBox.height / 2))).toBeLessThanOrEqual(8);
    } else if (viewport.topology === "side-column") {
      expect(sourceBox.y + sourceBox.height).toBeLessThanOrEqual(effectBox.y + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(participantBox.y + 2);
    } else if (viewport.width <= 650) {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(participantBox.y + 2);
    } else {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.x + effectBox.width).toBeLessThanOrEqual(participantBox.x + 2);
    }
    expect(stageBox.x).toBeGreaterThanOrEqual(0);
    expect(stageBox.x + stageBox.width).toBeLessThanOrEqual(viewport.width);
    expect(Math.max(0, Math.min(stageBox.y + stageBox.height, dockBox.y + dockBox.height) - Math.max(stageBox.y, dockBox.y))).toBe(0);
  });
}

test("Group Current Effect fails closed without a known source, effect, or active current participant", async ({ page }) => {
  for (const missingAuthority of [
    { source: "none" },
    { effect: "none" },
    { effect: "unknown-group-effect" },
    { groupParticipant: "none" },
    { groupParticipant: "p4" },
  ]) {
    await loadFixture(page, { count: 6, width: 480, state: "group-observer", ...missingAuthority });
    const stage = page.locator('[data-stage="GROUP_RESOLUTION"]');
    await expect(stage).not.toHaveAttribute("data-current-effect");
    await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);
    await expect(stage.locator(".current-effect-arrow")).toHaveCount(0);
    await expect(stage.locator('[data-stage-event-summary="proven"]')).toHaveCount(0);
  }
});

for (const viewport of [
  { count: 4, width: 390, height: 844, topology: "top-row" },
  { count: 6, width: 480, height: 900, topology: "side-column" },
  { count: 4, width: 1440, height: 900, topology: "top-row" },
]) {
  test(`Borrowed Sword forced Attack names its proven root source, holder, and target at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "borrowed-sword-active" });
    const stage = page.locator('[aria-label="Interaction Stage"][data-stage="ATTACK_RESPONSE"]');
    const source = stage.locator('.medium-participant-card[data-medium-participant-player-id="p2"]');
    const effect = stage.locator('[aria-label="Current Effect"]');
    const target = stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p3"]');
    const summary = stage.locator('[data-stage-event-summary="proven"]');

    await expect(stage).toHaveAttribute("data-current-effect", "Attack");
    await expect(stage.locator(":scope > header strong")).toHaveText("Attack Response");
    await expect(summary).toHaveText("Player 1's Borrowed Sword forces Player 2 to Attack Player 3.");
    await expect(source).toContainText("Player 2");
    await expect(effect.locator("strong")).toHaveText("Attack");
    await expect(target).toContainText("Player 3");
    await expect(stage.locator('[data-medium-participant-player-id="p1"]')).toHaveCount(0);
    await expect(stage.locator('[data-hero-focus-player-id="p1"]')).toHaveCount(0);
    await expect(page.locator('.local-player-dock[data-player-anchor="p4"]')).toBeVisible();
    await expect(stage.locator('[data-hero-focus-player-id="p4"]')).toHaveCount(0);
    await expect(stage.locator('[data-stage-meta-role="decision"]')).toHaveCount(0);

    const projection = await page.evaluate(() => window.__browserRoom.presentationSnapshot.interaction);
    expect(projection.rootOrigin).toEqual({
      frameId: projection.rootFrameId,
      stage: "NEGATION",
      sourceId: "p1",
      effect: "Borrowed Sword",
      targetIds: ["p2"],
    });
    expect(projection.sourceId).toBe("p2");
    expect(projection.activeTargetIds).toEqual(["p3"]);
    expect(projection.currentParticipantId).toBe("p3");
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

    const sourceBox = await source.boundingBox();
    const effectBox = await effect.boundingBox();
    const targetBox = await target.boundingBox();
    expect(sourceBox && effectBox && targetBox).toBeTruthy();
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
  });
}

test("two-player Borrowed Sword keeps the viewer target in the Dock without duplicating it in the Stage", async ({ page }) => {
  await loadFixture(page, { count: 2, width: 390, height: 844, state: "borrowed-sword-active-two-player" });
  const stage = page.locator('[aria-label="Interaction Stage"][data-stage="ATTACK_RESPONSE"]');
  await expect(stage).toHaveAttribute("data-current-effect", "Attack");
  await expect(stage.locator('[data-stage-event-summary="proven"]')).toHaveText("Player 1's Borrowed Sword forces Player 2 to Attack Player 1.");
  await expect(stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"] .hero-focus-heading strong')).toHaveText("SOURCE");
  await expect(stage.locator('[data-hero-focus-player-id="p1"]')).toHaveCount(0);
  await expect(page.locator('.local-player-dock[data-player-anchor="p1"]')).toBeVisible();
  await expect(stage.locator('[data-stage-meta-role="decision"]')).toHaveCount(0);
});

for (const state of ["borrowed-sword-active-no-root", "borrowed-sword-active-mismatch-root"]) {
  test(`Borrowed Sword forced Attack omits root-source copy when root proof is ${state.endsWith("no-root") ? "missing" : "inconsistent"}`, async ({ page }) => {
    await loadFixture(page, { count: 4, width: 390, height: 844, state });
    const stage = page.locator('[aria-label="Interaction Stage"][data-stage="ATTACK_RESPONSE"]');
    await expect(stage).toHaveAttribute("data-current-effect", "Attack");
    await expect(stage.locator('[data-stage-event-summary="proven"]')).toHaveText("Player 2 used Attack on Player 3.");
    await expect(stage).not.toContainText("Borrowed Sword");
    await expect(page.locator('[data-hero-focus-player-id="p1"]')).toHaveCount(0);
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
  { count: 10, width: 480, height: 900, topology: "side-column" },
]) {
  test(`proven NEGATION Current Effect fits ${viewport.count}-player ${viewport.topology} at ${viewport.width}px`, async ({ page }) => {
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
    if (viewport.width <= 650) {
      const heroRegionBox = await stage.locator(".interaction-stage-hero-region").boundingBox();
      const chainBox = await chain.boundingBox();
      const rootBox = await chain.locator('[data-reaction-node="root"]').boundingBox();
      const activeBox = await chain.locator('[data-reaction-node="active"]').boundingBox();
      expect(heroRegionBox && chainBox && rootBox && activeBox).toBeTruthy();
      expect(chainBox.y).toBeGreaterThanOrEqual(heroRegionBox.y + heroRegionBox.height - 1);
      expect(rootBox.y + rootBox.height).toBeLessThanOrEqual(activeBox.y + 2);
    }

    const sourceBox = await source.boundingBox();
    const effectBox = await effect.boundingBox();
    const targetBox = await target.boundingBox();
    const chainBox = await chain.boundingBox();
    const stageBox = await stage.boundingBox();
    const dockBox = await page.locator(".local-player-dock").boundingBox();
    expect(sourceBox && effectBox && targetBox && chainBox && stageBox && dockBox).toBeTruthy();
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
    if (viewport.count === 10) {
      const safeZoneBox = await page.locator(".interaction-safe-zone").boundingBox();
      expect(safeZoneBox).toBeTruthy();
      for (const [label, box] of [["Stage", stageBox], ["Source", sourceBox], ["Effect", effectBox], ["Target", targetBox], ["Reaction Chain", chainBox]]) {
        expect(box.x, `${label} left edge stays inside the central safe zone`).toBeGreaterThanOrEqual(safeZoneBox.x - 0.5);
        expect(box.x + box.width, `${label} right edge stays inside the central safe zone`).toBeLessThanOrEqual(safeZoneBox.x + safeZoneBox.width + 0.5);
        expect(box.y, `${label} top edge stays inside the central safe zone`).toBeGreaterThanOrEqual(safeZoneBox.y - 0.5);
        expect(box.y + box.height, `${label} bottom edge stays inside the central safe zone`).toBeLessThanOrEqual(safeZoneBox.y + safeZoneBox.height + 0.5);
      }
    }
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

for (const viewport of [
  { count: 4, width: 390, height: 844, topology: "top-row" },
  { count: 6, width: 480, height: 900, topology: "side-column" },
  { count: 4, width: 1440, height: 900, topology: "top-row" },
]) {
  test(`proven Dying Current Effect fits ${viewport.topology} at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "dying" });

    const stage = page.locator('.interaction-stage[data-stage="DYING"]');
    const source = stage.locator('.medium-participant-card[data-medium-participant-player-id="p1"]');
    const effect = stage.locator('[aria-label="Current Effect"]');
    const dyingPlayer = stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"]');
    const handoff = stage.locator('[data-dying-handoff="proven"]');
    await expect(stage).toHaveAttribute("data-current-effect", "Attack");
    await expect(stage.locator(":scope > header strong")).toHaveText("Dying · Rescue");
    await expect(stage.locator('[data-stage-event-summary="proven"]')).toHaveText("Player 1 used Attack on Player 2.");
    await expect(source).toContainText("Player 1");
    await expect(effect.locator("strong")).toHaveText("Attack");
    await expect(dyingPlayer).toContainText("Player 2");
    await expect(dyingPlayer.locator(".hero-focus-heading strong")).toHaveText("DYING PLAYER");
    await expect(handoff).toHaveAttribute("data-dying-player-id", "p2");
    await expect(handoff).toHaveAttribute("data-dying-decision-actor-id", "p3");
    await expect(handoff).toContainText("Rescue controls stay in the local console.");
    await expect(stage.locator("button")).toHaveCount(0);
    await expect(stage).not.toContainText("Peach");
    await expect(stage.locator(":scope > header strong")).toHaveText("Dying · Rescue");
    await expect(stage.locator(".interaction-stage-visually-hidden")).toHaveCSS("clip", "rect(0px, 0px, 0px, 0px)");
    await expect(stage).not.toContainText("HERO FOCUS");
    await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toBeVisible();
    await expect(stage.locator('[data-hero-focus-player-id="p3"]')).toHaveCount(0);
    await expect(page.locator('[data-hand-card-id="browser-peach"] button.game-card')).toBeEnabled();
    await expect(page.locator('[data-console-surface="local-operation"] button')).toHaveText(["Peach", "Skip"]);
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

    const sourceBox = await source.boundingBox();
    const effectBox = await effect.boundingBox();
    const targetBox = await dyingPlayer.boundingBox();
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
  });
}

for (const viewport of [
  { width: 320, height: 640 },
  { width: 360, height: 640 },
  { width: 390, height: 640 },
  { width: 480, height: 640 },
  { width: 650, height: 700 },
  { width: 650, height: 900, safeTop: "319px" },
]) {
  test(`Dying Current Effect and rescue handoff stay inside the ${viewport.width}x${viewport.height} safe zone`, async ({ page }) => {
    await loadFixture(page, { count: 4, state: "dying", ...viewport });
    const playTable = page.locator(".play-table");
    if (viewport.safeTop) await playTable.evaluate((element, safeTop) => element.style.setProperty("--interaction-safe-top", safeTop), viewport.safeTop);

    const stage = page.locator('.play-table[data-seat-topology="top-row"] .interaction-stage[data-stage="DYING"]');
    const safeZone = page.locator(".interaction-safe-zone");
    const source = stage.locator('.medium-participant-card[data-medium-participant-player-id="p1"]');
    const effect = stage.locator('[aria-label="Current Effect"]');
    const dyingPlayer = stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"]');
    const handoff = stage.locator('[data-dying-handoff="proven"]');
    await expect(stage).toHaveAttribute("data-current-effect", "Attack");
    await expect(source).toBeVisible();
    await expect(effect).toBeVisible();
    await expect(dyingPlayer).toBeVisible();
    await expect(dyingPlayer.locator(".hero-focus-heading strong")).toHaveText("DYING PLAYER");
    await expect(handoff).toBeVisible();

    const [safeBox, stageBox, sourceBox, effectBox, dyingBox, handoffBox, dockBox] = await Promise.all([
      safeZone.boundingBox(),
      stage.boundingBox(),
      source.boundingBox(),
      effect.boundingBox(),
      dyingPlayer.boundingBox(),
      handoff.boundingBox(),
      page.locator(".local-player-dock").boundingBox(),
    ]);
    expect(safeBox && stageBox && sourceBox && effectBox && dyingBox && handoffBox && dockBox).toBeTruthy();
    expect(stageBox.y).toBeGreaterThanOrEqual(safeBox.y - 1);
    expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(safeBox.y + safeBox.height + 1);
    expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(dockBox.y + 1);
    for (const box of [sourceBox, effectBox, dyingBox, handoffBox]) {
      expect(box.y).toBeGreaterThanOrEqual(stageBox.y - 1);
      expect(box.y + box.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1);
    }
    if (safeBox.height <= 330) {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.x + effectBox.width).toBeLessThanOrEqual(dyingBox.x + 2);
    }
  });
}

test("Dying Current Effect fails closed without source/effect/participant agreement", async ({ page }) => {
  for (const missingAuthority of [
    { source: "none" },
    { effect: "none" },
    { dyingParticipant: "missing" },
    { dyingParticipant: "mismatch" },
  ]) {
    await loadFixture(page, { count: 4, width: 480, state: "dying", ...missingAuthority });
    const stage = page.locator('.interaction-stage[data-stage="DYING"]');
    await expect(stage).not.toHaveAttribute("data-current-effect");
    await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);
    await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
    await expect(stage.locator(".current-effect-arrow")).toHaveCount(0);
    await expect(stage.locator(".medium-participant-arrow")).toHaveCount(missingAuthority.effect === "none" ? 1 : 0);
    if (missingAuthority.dyingParticipant === "missing") {
      await expect(stage.locator('[data-dying-handoff="proven"]')).toHaveCount(0);
    } else {
      await expect(stage.locator('[data-dying-handoff="proven"]')).toBeVisible();
    }
    await expect(page.locator('[data-console-surface="local-operation"] button')).toHaveText(["Peach", "Skip"]);
  }
});

for (const viewport of [
  { count: 4, width: 390, height: 844, topology: "top-row" },
  { count: 6, width: 480, height: 900, topology: "side-column" },
  { count: 4, width: 1440, height: 900, topology: "top-row" },
]) {
  test(`proven Judgement Current Effect fits ${viewport.topology} at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "judgement" });
    const stage = page.locator('.interaction-stage[data-stage="JUDGEMENT"]');
    const source = stage.locator('.medium-participant-card[data-medium-participant-player-id="p1"]');
    const effect = stage.locator('[aria-label="Current Effect"]');
    const target = stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"]');
    const summary = stage.locator('[data-stage-event-summary="proven"]');
    await expect(page.locator(".play-table")).toHaveAttribute("data-seat-topology", viewport.topology);
    await expect(stage).toHaveAttribute("data-current-effect", "Overindulgence");
    await expect(stage.locator(":scope > header strong")).toHaveText("Judgement");
    await expect(summary).toHaveText("Judgement for Player 2 is resolving.");
    await expect(effect.locator("strong")).toHaveText("Overindulgence");
    await expect(source).toContainText("Player 1");
    await expect(target).toBeVisible();
    await expect(target.locator(".hero-focus-heading strong")).toHaveText("Target");
    await expect(stage.locator(".medium-participant-card")).toHaveCount(1);
    await expect(stage.locator('[data-stage-meta-role="source"]')).toHaveCount(0);
    await expect(stage.locator(".medium-participant-arrow")).toHaveCount(1);
    await expect(stage.locator(".current-effect-arrow")).toHaveCount(1);
    await expect(stage).not.toContainText("INTERACTION STAGE");
    await expect(stage).not.toContainText("HERO FOCUS");
    await expect(stage).not.toContainText("Player 4");
    await expect(page.locator('.local-player-dock[data-player-anchor="p4"]')).toBeVisible();
    await expect(stage.locator('[data-hero-focus-player-id="p4"]')).toHaveCount(0);
    await expect(stage.locator("button")).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserRoom.currentAction.options)).toBeUndefined();
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

    const [stageBox, sourceBox, effectBox, targetBox, dockBox] = await Promise.all([
      stage.boundingBox(), source.boundingBox(), effect.boundingBox(), target.boundingBox(), page.locator(".local-player-dock").boundingBox(),
    ]);
    expect(stageBox && effectBox && targetBox && dockBox).toBeTruthy();
    expect(stageBox.x).toBeGreaterThanOrEqual(0);
    expect(stageBox.x + stageBox.width).toBeLessThanOrEqual(viewport.width);
    expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(dockBox.y + 1);
    expect(Math.max(0, Math.min(stageBox.y + stageBox.height, dockBox.y + dockBox.height) - Math.max(stageBox.y, dockBox.y))).toBe(0);
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
  });
}

test("Judgement Current Effect keeps the local participant in the Dock", async ({ page }) => {
  await loadFixture(page, { count: 4, width: 390, height: 844, state: "judgement-local" });
  const stage = page.locator('.interaction-stage[data-stage="JUDGEMENT"]');
  const localDock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  await expect(stage).toHaveAttribute("data-current-effect", "Overindulgence");
  await expect(stage.locator('[aria-label="Current Effect"] strong')).toHaveText("Overindulgence");
  await expect(stage.locator('[data-stage-event-summary="proven"]')).toHaveText("Judgement for Player 1 is resolving.");
  await expect(localDock).toHaveAttribute("data-interaction-active-target", "true");
  await expect(localDock).toHaveAttribute("data-interaction-current-participant", "true");
  await expect(stage.locator('[data-hero-focus-player-id="p1"]')).toHaveCount(0);
  await expect(stage.locator(".medium-participant-card")).toHaveCount(0);
  await expect(stage.locator('[data-stage-meta-role="source"], [data-stage-meta-role="focus"]')).toHaveCount(0);
  await expect(stage.locator(".current-effect-arrow")).toHaveCount(0);
  await expect(stage).not.toContainText("INTERACTION STAGE");
  await expect(stage).not.toContainText("HERO FOCUS");
  await expect(page.locator('.player-board [data-player-anchor="p1"]')).toHaveCount(0);
});

test("Judgement Current Effect fails closed without source/effect/current-participant agreement", async ({ page }) => {
  for (const missingAuthority of [
    { source: "none" },
    { effect: "none" },
    { judgementParticipant: "missing" },
    { judgementParticipant: "mismatch" },
  ]) {
    await loadFixture(page, { count: 4, width: 480, state: "judgement", ...missingAuthority });
    const stage = page.locator('.interaction-stage[data-stage="JUDGEMENT"]');
    await expect(stage).not.toHaveAttribute("data-current-effect");
    await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);
    await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
    await expect(stage.locator(".current-effect-arrow")).toHaveCount(0);
  }
});
