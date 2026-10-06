import { expect, test } from "@playwright/test";

async function loadFixture(page, { count = 4, width, height = 900, state = "active-attack-observer", effect = null, source = null, duelObserver = false, duelParticipantMissing = false, dyingParticipant = null, judgementParticipant = null, groupParticipant = null, groupProgress = null, orderedProgress = null, negationHistory = null, targetShiftCase = null }) {
  await page.setViewportSize({ width, height });
  const effectQuery = effect ? `&effect=${encodeURIComponent(effect)}` : "";
  const sourceQuery = source ? `&source=${encodeURIComponent(source)}` : "";
  const duelObserverQuery = duelObserver ? "&duelObserver=1" : "";
  const missingDuelParticipantQuery = duelParticipantMissing ? "&duelParticipant=missing" : "";
  const dyingParticipantQuery = dyingParticipant ? `&dyingParticipant=${encodeURIComponent(dyingParticipant)}` : "";
  const judgementParticipantQuery = judgementParticipant ? `&judgementParticipant=${encodeURIComponent(judgementParticipant)}` : "";
  const groupParticipantQuery = groupParticipant ? `&groupParticipant=${encodeURIComponent(groupParticipant)}` : "";
  const groupProgressQuery = groupProgress ? `&groupProgress=${encodeURIComponent(groupProgress)}` : "";
  const orderedProgressQuery = orderedProgress ? `&orderedProgress=${encodeURIComponent(orderedProgress)}` : "";
  const negationHistoryQuery = negationHistory ? `&negationHistory=${encodeURIComponent(negationHistory)}` : "";
  const targetShiftCaseQuery = targetShiftCase ? `&targetShift=${encodeURIComponent(targetShiftCase)}` : "";
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}${effectQuery}${sourceQuery}${duelObserverQuery}${missingDuelParticipantQuery}${dyingParticipantQuery}${judgementParticipantQuery}${groupParticipantQuery}${groupProgressQuery}${orderedProgressQuery}${negationHistoryQuery}${targetShiftCaseQuery}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

test("AOE progress renders the explicit participant order without duplicating the local hero", async ({ page }) => {
  await loadFixture(page, { count: 4, width: 390, height: 844, state: "group-observer", groupProgress: "valid" });
  const stage = page.locator('[aria-label="Interaction Stage"][data-stage="GROUP_RESOLUTION"]');
  const scope = stage.locator('[data-group-target-scope="original"][data-group-progress="proven"]');
  const cards = scope.locator(".group-target-card");

  await expect(scope).toHaveAttribute("aria-label", "AOE Participant Progress");
  await expect(scope.locator(":scope > header")).toHaveText("AOE PARTICIPANTS");
  await expect(cards).toHaveCount(3);
  expect(await cards.evaluateAll((nodes) => nodes.map((node) => [node.dataset.groupTargetId, node.dataset.groupParticipantOrder, node.dataset.participantStatus]))).toEqual([
    ["p2", "1", "RESOLVED"],
    ["p1", "2", "CURRENT"],
    ["p3", "3", "PENDING"],
  ]);
  await expect(cards.nth(0)).toContainText("Resolved");
  await expect(cards.nth(1)).toContainText("Current");
  await expect(cards.nth(2)).toContainText("You");
  await expect(cards.nth(2).locator(".group-target-portrait")).toHaveCount(0);
  await expect(cards.nth(2)).toContainText("Pending");
  await expect(stage.locator('[data-hero-focus-player-id="p1"]')).toHaveAttribute("data-group-participant-status", "CURRENT");
  await expect(stage.locator('[data-hero-focus-player-id="p1"] .hero-focus-group-status')).toHaveText("Current");
  await expect(stage.locator('[data-hero-focus-player-id="p3"]')).toHaveCount(0);
  await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toBeVisible();
  await expect(stage.locator("button")).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

for (const viewport of [
  { width: 390, height: 844, count: 4, topology: "top-row" },
  { width: 480, height: 900, count: 6, topology: "side-column" },
]) {
  test(`proven Group Target Strip uses compact markers at ${viewport.width}px ${viewport.topology}`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "group-observer", groupProgress: "valid" });
    const stage = page.locator('[aria-label="Interaction Stage"][data-stage="GROUP_RESOLUTION"]');
    const scope = stage.locator('[data-group-target-scope="original"][data-group-progress="proven"]');
    const cards = scope.locator(".group-target-card");
    await expect(scope).toHaveAttribute("data-participant-density", viewport.count === 4 ? "medium" : "compact");
    await expect(cards.first()).toBeVisible();
    const geometry = await scope.evaluate((element) => {
      const cardsElement = element.querySelector(".group-target-cards");
      const firstCard = element.querySelector(".group-target-card");
      const portrait = element.querySelector(".group-target-portrait");
      const scopeRect = element.getBoundingClientRect();
      const cardRect = firstCard?.getBoundingClientRect();
      const portraitRect = portrait?.getBoundingClientRect();
      return {
        scrollWidth: cardsElement?.scrollWidth ?? 0,
        clientWidth: cardsElement?.clientWidth ?? 0,
        scopeRight: scopeRect.right,
        cardWidth: cardRect?.width ?? 0,
        portraitWidth: portraitRect?.width ?? 0,
      };
    });
    expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
    expect(geometry.scopeRight).toBeLessThanOrEqual(viewport.width);
    expect(geometry.cardWidth).toBeLessThanOrEqual(140);
    expect(geometry.portraitWidth).toBeLessThanOrEqual(30);
    await expect(scope.locator('.group-target-card[data-participant-status="CURRENT"]').first()).toContainText("Current");
    await expect(page.locator(".local-player-dock")).toBeVisible();
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  });
}

test("AOE participant progress stays visible and compact for a 10-player child-frame continuation", async ({ page }) => {
  await loadFixture(page, { count: 10, width: 390, height: 844, state: "group-observer", groupProgress: "paused" });
  const stage = page.locator('[aria-label="Interaction Stage"][data-stage="DAMAGE"]');
  const scope = stage.locator('[data-group-target-scope="original"][data-group-progress="proven"]');
  const cards = scope.locator(".group-target-card");

  await expect(scope).toBeVisible();
  await expect(scope).toHaveAttribute("data-participant-density", "compact");
  await expect(cards).toHaveCount(9);
  await expect(cards.nth(0)).toHaveAttribute("data-group-target-id", "p2");
  await expect(cards.nth(0)).toHaveAttribute("data-participant-status", "RESOLVED");
  await expect(cards.nth(1)).toHaveAttribute("data-group-target-id", "p1");
  await expect(cards.nth(1)).toHaveAttribute("data-participant-status", "PAUSED");
  await expect(cards.nth(2)).toHaveAttribute("data-group-target-id", "p3");
  await expect(cards.nth(2)).toHaveAttribute("data-participant-status", "PENDING");
  const geometry = await page.evaluate(() => {
    const scopeElement = document.querySelector('[data-group-target-scope="original"]');
    const cardsElement = scopeElement?.querySelector(".group-target-cards");
    const stageElement = document.querySelector(".interaction-stage");
    const dockElement = document.querySelector(".local-player-dock");
    const scopeRect = scopeElement?.getBoundingClientRect();
    const stageRect = stageElement?.getBoundingClientRect();
    const dockRect = dockElement?.getBoundingClientRect();
    return {
      scrollWidth: cardsElement?.scrollWidth ?? 0,
      clientWidth: cardsElement?.clientWidth ?? 0,
      scopeRight: scopeRect?.right ?? Infinity,
      viewportWidth: window.innerWidth,
      stageBottom: stageRect?.bottom ?? Infinity,
      dockTop: dockRect?.top ?? -Infinity,
    };
  });
  expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
  expect(geometry.scopeRight).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.stageBottom).toBeLessThanOrEqual(geometry.dockTop);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

test("AOE progress gives no-longer-applicable targets a distinct status", async ({ page }) => {
  await loadFixture(page, { count: 5, width: 480, height: 900, state: "group-observer", groupProgress: "no-longer" });
  const scope = page.locator('[data-group-target-scope="original"][data-group-progress="proven"]');
  const noLonger = scope.locator('.group-target-card[data-participant-status="NO_LONGER_APPLICABLE"]');
  await expect(noLonger).toHaveCount(1);
  await expect(noLonger).toContainText("Not applicable");
  await expect(noLonger.locator(".group-target-status")).toHaveAttribute("aria-label", "Status: Not applicable");
});

for (const outcome of [
  ["avoided", "AVOIDED", "✓", "Avoided"],
  ["damaged", "DAMAGED", "−♥", "Damaged"],
  ["negated", "NEGATED", "⊘", "Negated"],
  ["defeated", "DEFEATED", "✕", "Defeated"],
]) {
  test(`AOE ${outcome[1]} stays a compact accessible marker at 390px`, async ({ page }) => {
    await loadFixture(page, { count: 5, width: 390, height: 844, state: "group-observer", groupProgress: outcome[0] });
    const card = page.locator('[data-group-target-scope="original"][data-group-progress="proven"] .group-target-card').first();
    const marker = card.locator(".group-target-status");
    await expect(card).toHaveAttribute("data-participant-status", "RESOLVED");
    await expect(card).toHaveAttribute("data-participant-outcome", outcome[1]);
    await expect(marker).toHaveAttribute("data-group-outcome-marker", outcome[1]);
    await expect(marker).toHaveAttribute("aria-label", `Status: Resolved; Outcome: ${outcome[3]}`);
    await expect(marker).toHaveText(outcome[2]);
    await expect(marker.locator('[aria-hidden="true"]')).toHaveText(outcome[2]);
    await expect(card).not.toContainText(outcome[3]);
    await expect(page.locator(".local-player-dock")).toBeVisible();
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`AOE Negated return restores the root effect context at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "group-observer", groupProgress: "negated" });
    const stage = page.locator('.interaction-stage[data-stage="GROUP_RESOLUTION"]');
    const scope = stage.locator('[data-group-target-scope="original"][data-group-progress="proven"]');
    const resolved = scope.locator('[data-group-target-id="p2"]');
    const current = scope.locator('[data-group-target-id="p1"]');
    await expect(stage.locator('[data-current-effect-label="Raining Arrows"]')).toBeVisible();
    await expect(stage.locator('[data-reaction-node]')).toHaveCount(0);
    await expect(resolved).toHaveAttribute("data-participant-status", "RESOLVED");
    await expect(resolved).toHaveAttribute("data-participant-outcome", "NEGATED");
    await expect(resolved.locator(".group-target-status")).toHaveText("⊘");
    await expect(resolved.locator(".group-target-status")).toHaveAttribute("aria-label", "Status: Resolved; Outcome: Negated");
    await expect(current).toHaveAttribute("data-participant-status", "CURRENT");
    await expect(stage.locator('[data-hero-focus-player-id="p1"]')).toHaveAttribute("data-group-participant-status", "CURRENT");
    await expect(stage.locator("button")).toHaveCount(0);
    await expect(page.locator(".local-player-dock")).toBeVisible();
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`AOE Negated return advances to the projected next participant at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "group-observer", groupParticipant: "p3", groupProgress: "negated" });
    const stage = page.locator('.interaction-stage[data-stage="GROUP_RESOLUTION"]');
    const scope = stage.locator('[data-group-target-scope="original"][data-group-progress="proven"]');
    const settled = scope.locator('[data-group-target-id="p2"]');
    const current = scope.locator('[data-group-target-id="p3"]');
    await expect(stage.locator('[data-current-effect-label="Raining Arrows"]')).toBeVisible();
    await expect(settled).toHaveAttribute("data-group-participant-order", "1");
    await expect(settled).toHaveAttribute("data-participant-status", "RESOLVED");
    await expect(settled).toHaveAttribute("data-participant-outcome", "NEGATED");
    await expect(settled.locator(".group-target-status")).toHaveText("⊘");
    await expect(current).toHaveAttribute("data-group-participant-order", "3");
    await expect(current).toHaveAttribute("data-participant-status", "CURRENT");
    await expect(scope.locator('[data-participant-status="CURRENT"]')).toHaveCount(1);
    await expect(stage.locator('[data-reaction-node]')).toHaveCount(0);
    await expect(page.locator(".local-player-dock")).toBeVisible();
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  });
}

test("AOE progress fails closed when the snapshot root identity or scope does not match", async ({ page }) => {
  await loadFixture(page, { count: 4, width: 390, state: "group-observer", groupProgress: "mismatch" });
  const stage = page.locator('[aria-label="Interaction Stage"][data-stage="GROUP_RESOLUTION"]');
  const scope = stage.locator('[data-group-target-scope="original"]');
  await expect(scope).toBeVisible();
  await expect(scope).not.toHaveAttribute("data-group-progress", "proven");
  await expect(scope.locator(".group-target-card[data-participant-status]")).toHaveCount(0);
  await expect(stage.locator(".hero-focus-group-status")).toHaveCount(0);
});

test("Halberd progress shows the server-ordered targets with target numbering, not AOE labels", async ({ page }) => {
  await loadFixture(page, { count: 4, width: 390, height: 844, state: "group-observer", orderedProgress: "valid" });
  const stage = page.locator('[aria-label="Interaction Stage"][data-stage="ATTACK_RESPONSE"]');
  const scope = stage.locator('[data-target-progress-scope="ordered"][data-target-progress="proven"]');
  const targets = scope.locator(".group-target-card");

  await expect(scope).toHaveAttribute("aria-label", "Ordered Target Progress");
  await expect(scope.locator(":scope > header")).toHaveText("TARGET PROGRESS");
  await expect(targets).toHaveCount(3);
  expect(await targets.evaluateAll((nodes) => nodes.map((node) => [node.dataset.targetId, node.dataset.targetOrder, node.dataset.participantStatus]))).toEqual([
    ["p2", "1", "RESOLVED"],
    ["p1", "2", "CURRENT"],
    ["p3", "3", "PENDING"],
  ]);
  await expect(targets.nth(0)).toContainText("Target 1");
  await expect(targets.nth(1)).toContainText("Target 2");
  await expect(targets.nth(2)).toContainText("Target 3");
  await expect(stage).not.toContainText("AOE PARTICIPANTS");
  await expect(stage.locator('[data-hero-focus-player-id="p1"] .hero-focus-group-status')).toHaveText("Current");
  await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toBeVisible();
  await expect(stage.locator('[data-hero-focus-player-id="p3"]')).toHaveCount(0);
  await expect(stage.locator("button")).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

test("Halberd ordered progress marks the active target paused during a child Damage frame", async ({ page }) => {
  await loadFixture(page, { count: 10, width: 390, height: 844, state: "group-observer", orderedProgress: "paused" });
  const stage = page.locator('[aria-label="Interaction Stage"][data-stage="DAMAGE"]');
  const scope = stage.locator('[data-target-progress-scope="ordered"][data-target-progress="proven"]');
  const targets = scope.locator(".group-target-card");

  await expect(scope).toBeVisible();
  await expect(scope.locator(":scope > header")).toHaveText("TARGET PROGRESS");
  expect(await targets.evaluateAll((nodes) => nodes.map((node) => [node.dataset.targetId, node.dataset.targetOrder, node.dataset.participantStatus]))).toEqual([
    ["p2", "1", "RESOLVED"],
    ["p1", "2", "PAUSED"],
    ["p3", "3", "PENDING"],
  ]);
  await expect(stage.locator('[data-hero-focus-player-id="p1"] .hero-focus-group-status')).toHaveText("Paused");
  await expect(stage).toHaveAttribute("data-continuity", "CHILD_FRAME");
  await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toBeVisible();
  await expect(stage.locator("button")).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

test("Halberd ordered progress fails closed when typed scope proof is absent or mismatched", async ({ page }) => {
  for (const orderedProgress of ["missing", "mismatch"]) {
    await loadFixture(page, { count: 4, width: 390, height: 844, state: "group-observer", orderedProgress });
    const stage = page.locator('[aria-label="Interaction Stage"][data-stage="ATTACK_RESPONSE"]');
    await expect(stage.locator('[data-target-progress-scope="ordered"]')).toHaveCount(0);
    await expect(stage.locator('[data-target-progress="proven"]')).toHaveCount(0);
    await expect(stage.locator('[data-group-progress="proven"]')).toHaveCount(0);
    await expect(stage.locator(".hero-focus-group-status")).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  }
});

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
  { count: 6, width: 480, height: 900, topology: "side-column" },
  { count: 4, width: 1440, height: 900, topology: "top-row" },
]) {
  test(`redirected Attack follows its proven active target and preserves original scope at ${viewport.width}px`, async ({ page }, testInfo) => {
    await loadFixture(page, { ...viewport, state: "target-shift-attack" });
    const stage = page.locator('[aria-label="Interaction Stage"][data-stage="ATTACK_RESPONSE"]');
    const source = stage.locator('.medium-participant-card[data-medium-participant-player-id="p1"]');
    const effect = stage.locator('[aria-label="Current Effect"]');
    const target = stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p4"]');
    const originalScope = stage.locator(".interaction-stage-context");

    await expect(stage).toHaveAttribute("data-current-effect", "Attack");
    await expect(stage.locator('[data-stage-event-summary="proven"]')).toHaveText("Player 1 used Attack on Player 4.");
    await expect(source).toContainText("Player 1");
    await expect(effect.locator("strong")).toHaveText("Attack");
    await expect(target).toContainText("Player 4");
    await expect(target.locator(".hero-focus-heading strong")).toHaveText("Target");
    await expect(stage.locator('[data-hero-focus-player-id="p2"]')).toHaveCount(0);
    await expect(originalScope).toContainText("ORIGINAL SCOPE");
    await expect(originalScope).toContainText("Original targets: Player 2");
    await expect(stage.locator('[data-reaction-chain="proven"]')).toHaveCount(0);
    await expect(stage).not.toContainText("Deflection");
    await expect(page.locator(`.local-player-dock[data-player-anchor="${viewport.count === 6 ? "p5" : "p3"}"]`)).toBeVisible();
    await expect(stage.locator(`[data-hero-focus-player-id="${viewport.count === 6 ? "p5" : "p3"}"]`)).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

    const [sourceBox, effectBox, targetBox, stageBox, dockBox] = await Promise.all([
      source.boundingBox(), effect.boundingBox(), target.boundingBox(), stage.boundingBox(), page.locator(".local-player-dock").boundingBox(),
    ]);
    if (viewport.width === 390 && viewport.height <= 700) await page.screenshot({ path: testInfo.outputPath("redirected-attack-390x640.png"), animations: "disabled" });
    expect(sourceBox && effectBox && targetBox && stageBox && dockBox).toBeTruthy();
    if (viewport.topology === "side-column") {
      expect(sourceBox.y + sourceBox.height).toBeLessThanOrEqual(effectBox.y + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(targetBox.y + 2);
    } else if (viewport.width <= 650 && viewport.height <= 700) {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.x + effectBox.width).toBeLessThanOrEqual(targetBox.x + 2);
    } else if (viewport.width <= 650) {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.y + effectBox.height).toBeLessThanOrEqual(targetBox.y + 2);
    } else {
      expect(sourceBox.x + sourceBox.width).toBeLessThanOrEqual(effectBox.x + 2);
      expect(effectBox.x + effectBox.width).toBeLessThanOrEqual(targetBox.x + 2);
    }
    expect(Math.max(0, Math.min(stageBox.y + stageBox.height, dockBox.y + dockBox.height) - Math.max(stageBox.y, dockBox.y))).toBe(0);
  });
}

test("redirected Attack remains unlinked when active-target proof is missing or conflicts with the current participant", async ({ page }) => {
  for (const targetShiftCase of ["missing-active", "mismatched-current"]) {
    await loadFixture(page, { count: 4, width: 390, height: 844, state: "target-shift-attack", targetShiftCase });
    const stage = page.locator('[aria-label="Interaction Stage"][data-stage="ATTACK_RESPONSE"]');
    await expect(stage).not.toHaveAttribute("data-current-effect");
    await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);
    await expect(stage.locator('[data-stage-event-summary="proven"]')).toHaveCount(0);
    await expect(stage.locator(".current-effect-arrow, .medium-participant-arrow")).toHaveCount(0);
    await expect(stage.locator('[data-reaction-chain="proven"]')).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  }
});

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
    await expect(stage).not.toContainText(/parent frame|nested effect/i);
    await expect(stage.locator(".hero-focus-context")).toHaveCount(0);
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
  await expect(stage).not.toContainText(/parent frame|nested effect/i);
  await expect(stage.locator(".hero-focus-context")).toHaveCount(0);
  await expect(stage.locator('[data-hero-focus="true"][data-hero-focus-player-id="p2"] .hero-focus-heading strong')).toHaveText("Source");
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
    await expect(stage).not.toContainText(/parent frame|nested effect/i);
    await expect(stage.locator(".hero-focus-context")).toHaveCount(0);
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
  await expect(stage.locator(":scope > header strong")).toHaveText(/Duel.*Exchange/);
  await expect(stage).not.toContainText("INTERACTION STAGE");
  await expect(stage).not.toContainText("HERO FOCUS");

  await loadFixture(page, { width: 480, count: 6, state: "duel", duelObserver: true, duelParticipantMissing: true });
  stage = page.locator('[data-stage="DUEL_EXCHANGE"]');
  await expect(stage).not.toHaveAttribute("data-current-effect");
  await expect(stage.locator('[aria-label="Current Effect"]')).toHaveCount(0);
  await expect(stage.locator(".current-effect-arrow")).toHaveCount(0);
  await expect(stage.locator("[data-stage-event-summary]")).toHaveCount(0);
  await expect(stage.locator(":scope > header strong")).toHaveText(/Duel.*Exchange/);
  await expect(stage).not.toContainText("INTERACTION STAGE");
  await expect(stage).not.toContainText("HERO FOCUS");
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
    await loadFixture(page, { ...viewport, state: "active-negation-observer", negationHistory: "valid" });
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

test("Reaction Chain renders linked public Negation nodes in order without exposing the waiting responder", async ({ page }) => {
  await loadFixture(page, { count: 4, width: 390, height: 844, state: "active-negation-observer", negationHistory: "valid" });
  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  const chain = stage.locator('[data-reaction-chain="proven"]');
  const orderedNodes = chain.locator("ol > li");
  const negations = chain.locator('[data-reaction-node="negation"]');

  await expect(negations).toHaveCount(2);
  expect(await orderedNodes.evaluateAll((items) => items.map((item) => item.dataset.reactionNode))).toEqual(["root", "negation", "negation", "active"]);
  const verticalPositions = await orderedNodes.evaluateAll((items) => items.map((item) => item.getBoundingClientRect().top));
  expect(verticalPositions.every((top, index) => index === 0 || top >= verticalPositions[index - 1])).toBe(true);
  await expect(negations.nth(0)).toHaveAttribute("aria-label", "Player 1 played Negation");
  await expect(negations.nth(1)).toHaveAttribute("aria-label", "Player 2 played Negation");
  await expect(negations.nth(0)).toContainText("Player 1 played this card.");
  await expect(negations.nth(1)).toContainText("Player 2 played this card.");
  await expect(chain.locator('[data-reaction-node="root"]')).toContainText("Dismantle");
  await expect(chain.locator('[data-reaction-node="active"]')).toContainText("Waiting for response...");
  await expect(chain).not.toContainText("Player 3");
  await expect(stage).not.toContainText("Player 3");
  await expect(stage.locator("button")).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

for (const viewport of [
  { width: 390, height: 844, count: 4 },
  { width: 480, height: 900, count: 6 },
  { width: 1440, height: 900, count: 4 },
]) {
  test(`Group Negation uses a compact public branch at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "group-negation", negationHistory: "single" });
    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    const scope = stage.locator('[data-group-target-scope="original"][data-group-progress="proven"]');
    const chain = stage.locator('[data-reaction-chain="proven"]');
    await expect(stage).toHaveAttribute("data-group-negation", "true");
    await expect(scope.locator(".group-target-card")).toHaveCount(3);
    await expect(chain).toHaveAttribute("aria-label", "AOE Negation Response");
    await expect(chain.locator('[data-reaction-node="root"]')).toHaveCount(0);
    const publicHead = chain.locator('[data-reaction-node="negation"]');
    const waitingNode = chain.locator('[data-reaction-node="active"]');
    await expect(publicHead).toHaveCount(1);
    await expect(publicHead).toContainText("Player 1 played this card.");
    await expect(waitingNode).toContainText("Waiting for response...");
    const branchStyles = await chain.evaluate((element) => {
      const head = element.querySelector('[data-reaction-node="negation"]');
      const waiting = element.querySelector('[data-reaction-node="active"]');
      return {
        headBorder: head ? getComputedStyle(head).borderTopColor : "",
        waitingBorder: waiting ? getComputedStyle(waiting).borderTopColor : "",
      };
    });
    expect(branchStyles.headBorder).toBe("rgb(240, 195, 94)");
    expect(branchStyles.waitingBorder).toBe("rgb(101, 125, 114)");
    await expect(stage).not.toContainText("Player 3 played this card.");
    const geometry = await chain.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const nodes = [...element.querySelectorAll("li")].map((node) => node.getBoundingClientRect());
      return { width: rect.width, height: rect.height, nodeRows: new Set(nodes.map((node) => Math.round(node.top))).size };
    });
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.height).toBeLessThanOrEqual(viewport.width <= 480 ? 90 : 140);
    expect(geometry.nodeRows).toBe(1);
    await expect(page.locator(".local-player-dock")).toBeVisible();
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  });
}

for (const viewport of [
  { width: 390, height: 844, count: 4 },
  { width: 480, height: 900, count: 6 },
  { width: 1440, height: 900, count: 4 },
]) {
  test(`Group counter-Negation keeps only the newest public head active at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "group-negation", negationHistory: "double" });
    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    const chain = stage.locator('[data-reaction-chain="proven"]');
    const negations = chain.locator('[data-reaction-node="negation"]');
    await expect(chain.locator('[data-reaction-node="root"]')).toHaveCount(0);
    await expect(negations).toHaveCount(2);
    await expect(negations.nth(0)).toHaveAttribute("aria-label", "Player 1 played Negation");
    await expect(negations.nth(1)).toHaveAttribute("aria-label", "Player 2 played Negation");
    await expect(negations.nth(0)).toContainText("Player 1 played this card.");
    await expect(negations.nth(1)).toContainText("Player 2 played this card.");
    const branchStyles = await chain.evaluate((element) => [...element.querySelectorAll('[data-reaction-node="negation"], [data-reaction-node="active"]')].map((node) => getComputedStyle(node).borderTopColor));
    expect(branchStyles).toEqual(["rgb(101, 125, 114)", "rgb(240, 195, 94)", "rgb(101, 125, 114)"]);
    await expect(chain.locator('[data-reaction-node="active"]')).toContainText("Waiting for response...");
    const geometry = await chain.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const nodes = [...element.querySelectorAll("li")].map((node) => node.getBoundingClientRect());
      return { width: rect.width, height: rect.height, nodeRows: new Set(nodes.map((node) => Math.round(node.top))).size };
    });
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.height).toBeLessThanOrEqual(viewport.width <= 480 ? 90 : 140);
    expect(geometry.nodeRows).toBe(1);
    await expect(stage.locator('[data-group-target-scope="original"][data-group-progress="proven"] .group-target-card')).toHaveCount(3);
    await expect(page.locator(".local-player-dock")).toBeVisible();
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`open Group Negation stays neutral without a public branch at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "group-negation" });
    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    const scope = stage.locator('[data-group-target-scope="original"][data-group-progress="proven"]');
    await expect(stage.locator('[data-current-effect-label="Raining Arrows"]')).toBeVisible();
    await expect(stage.locator('[data-reaction-chain="proven"]')).toHaveCount(0);
    await expect(scope.locator(".group-target-card")).toHaveCount(3);
    await expect(scope.locator('[data-participant-status="CURRENT"]')).toHaveCount(1);
    await expect(stage).not.toContainText("played this card.");
    await expect(stage).not.toContainText("Waiting for Player 1");
    await expect(stage).not.toContainText("Decision · Player 1");
    await expect(stage.locator("button")).toHaveCount(0);
    await expect(page.locator(".local-player-dock")).toBeVisible();
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`authorized Group Negation responder gets private Dock guidance at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "group-negation-local" });
    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    const scope = stage.locator('[data-group-target-scope="original"][data-group-progress="proven"]');
    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const guidance = dock.locator(".console-guidance .decision-status");
    const action = await page.evaluate(() => window.__browserRoom.currentAction);
    const publicScene = await page.evaluate(() => window.__browserRoom.presentationSnapshot.interaction);

    expect(await page.evaluate(() => window.__browserRoom.meId)).toBe("p1");
    expect(action.actorId).toBe("p1");
    expect(action.requirement).toBe("negate");
    expect(action.legalActions).toEqual(["respond", "decline_response"]);
    expect(action.options.some((option) => option.satisfies === "negate")).toBe(true);
    expect(publicScene.decisionActorId).toBeNull();
    expect(publicScene.activeResolverId).toBeNull();
    expect(publicScene.currentParticipantId).toBe("p1");

    await expect(scope.locator(".group-target-card")).toHaveCount(3);
    await expect(dock).toBeVisible();
    await expect(guidance.locator("small")).toHaveText("YOUR RESPONSE");
    await expect(guidance.locator("strong")).toHaveText("Play Negation or Skip.");
    await expect(guidance.locator("em")).toHaveCount(0);
    await expect(stage).not.toContainText("YOUR RESPONSE");
    await expect(stage).not.toContainText("Play Negation or Skip.");
    await expect(stage).not.toContainText("played this card.");
    await expect(stage.locator("button")).toHaveCount(0);
    await expect(page.locator('[data-hand-card-id="browser-group-negation"] .game-card')).toBeVisible();
    expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action !== "start_response_timer"))).toEqual([]);
  });
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`Group Negation stage and local controls keep reachable geometry at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, state: "group-negation-local" });
    const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
    const scope = stage.locator('[data-group-target-scope="original"][data-group-progress="proven"]');
    const root = stage.locator('[data-current-effect-label="Raining Arrows"]');
    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const guidance = dock.locator(".console-guidance .decision-status");
    const handCard = page.locator('[data-hand-card-id="browser-group-negation"] .game-card');
    const confirm = dock.locator('[data-action-slot="primary"] button');
    const skip = dock.locator('[data-action-slot="decline"] button');

    await expect(stage).toBeVisible();
    await expect(root).toBeVisible();
    await expect(scope).toBeVisible();
    await expect(guidance.locator("strong")).toHaveText("Play Negation or Skip.");
    await expect(handCard).toBeVisible();
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeDisabled();
    await expect(skip).toHaveText("Skip");
    await expect(skip).toBeEnabled();

    const readGeometry = () => page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const ownsCenter = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return false;
        const bounds = element.getBoundingClientRect();
        const hit = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
        return Boolean(hit && (hit === element || element.contains(hit)));
      };
      const overlaps = (first, second) => Boolean(first && second
        && first.left < second.right && second.left < first.right
        && first.top < second.bottom && second.top < first.bottom);
      const stageSelector = '.interaction-stage[data-stage="NEGATION"]';
      const rootSelector = `${stageSelector} [data-current-effect-label="Raining Arrows"]`;
      const scopeSelector = `${stageSelector} [data-group-target-scope="original"][data-group-progress="proven"]`;
      const dockSelector = '.local-player-dock[data-player-anchor="p1"]';
      const guidanceSelector = `${dockSelector} .console-guidance`;
      const statusSelector = `${guidanceSelector} .decision-status`;
      const handSelector = '[data-hand-card-id="browser-group-negation"] .game-card';
      const confirmSelector = `${dockSelector} [data-action-slot="primary"] button`;
      const skipSelector = `${dockSelector} [data-action-slot="decline"] button`;
      const status = document.querySelector(statusSelector);
      const bounds = (selector) => rect(selector);
      const stageBounds = bounds(stageSelector);
      const rootBounds = bounds(rootSelector);
      const scopeBounds = bounds(scopeSelector);
      const dockBounds = bounds(dockSelector);
      const guidanceBounds = bounds(guidanceSelector);
      const handBounds = bounds(handSelector);
      const confirmBounds = bounds(confirmSelector);
      const skipBounds = bounds(skipSelector);
      return {
        viewport: {
          width: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          bodyWidth: document.body.scrollWidth,
        },
        stage: stageBounds,
        root: rootBounds,
        scope: scopeBounds,
        dock: dockBounds,
        guidance: guidanceBounds,
        hand: handBounds,
        confirm: confirmBounds,
        skip: skipBounds,
        keyRegionsFit: [stageBounds, rootBounds, scopeBounds, dockBounds, guidanceBounds, handBounds, confirmBounds, skipBounds]
          .every((item) => item && item.left >= -1 && item.right <= window.innerWidth + 1 && item.top >= -1 && item.bottom <= window.innerHeight + 1),
        overlaps: {
          stageDock: overlaps(stageBounds, dockBounds),
          guidanceHand: overlaps(guidanceBounds, handBounds),
          handConfirm: overlaps(handBounds, confirmBounds),
          handSkip: overlaps(handBounds, skipBounds),
          confirmSkip: overlaps(confirmBounds, skipBounds),
        },
        guidanceContentFits: Boolean(status && status.scrollWidth <= status.clientWidth && status.scrollHeight <= status.clientHeight + 1),
        hitTargets: {
          hand: ownsCenter(handSelector),
          confirm: ownsCenter(confirmSelector),
          skip: ownsCenter(skipSelector),
        },
      };
    });

    const before = await readGeometry();
    expect(before.viewport.documentWidth).toBeLessThanOrEqual(before.viewport.width);
    expect(before.viewport.bodyWidth).toBeLessThanOrEqual(before.viewport.width);
    expect(before.keyRegionsFit).toBe(true);
    expect(before.overlaps).toEqual({ stageDock: false, guidanceHand: false, handConfirm: false, handSkip: false, confirmSkip: false });
    expect(before.guidance.top).toBeGreaterThanOrEqual(before.stage.bottom - 1);
    expect(Math.abs(before.guidance.top - before.dock.top)).toBeLessThanOrEqual(1);
    expect(before.guidanceContentFits).toBe(true);
    expect(before.hitTargets).toEqual({ hand: true, confirm: true, skip: true });

    await handCard.click();
    await expect(handCard).toHaveClass(/selected/);
    await expect(confirm).toBeEnabled();

    const after = await readGeometry();
    expect(after.viewport.documentWidth).toBeLessThanOrEqual(after.viewport.width);
    expect(after.viewport.bodyWidth).toBeLessThanOrEqual(after.viewport.width);
    expect(after.keyRegionsFit).toBe(true);
    expect(after.overlaps).toEqual({ stageDock: false, guidanceHand: false, handConfirm: false, handSkip: false, confirmSkip: false });
    expect(after.guidanceContentFits).toBe(true);
    expect(after.hitTargets).toEqual({ hand: true, confirm: true, skip: true });

    for (const region of ["stage", "root", "scope"]) {
      for (const edge of ["left", "right", "top", "bottom", "width", "height"]) {
        expect(Math.abs(after[region][edge] - before[region][edge])).toBeLessThanOrEqual(1);
      }
    }
  });
}

test("Reaction Chain shows one proven Negation node and omits absent or malformed history", async ({ page }) => {
  await loadFixture(page, { count: 4, width: 480, height: 900, state: "active-negation-observer", negationHistory: "single" });
  let chain = page.locator('[data-reaction-chain="proven"]');
  await expect(chain.locator('[data-reaction-node="negation"]')).toHaveCount(1);
  await expect(chain.locator("ol > li")).toHaveCount(3);

  for (const negationHistory of [null, "invalid-link", "frame-mismatch"]) {
    await loadFixture(page, { count: 4, width: 480, height: 900, state: "active-negation-observer", negationHistory });
    chain = page.locator('[data-reaction-chain="proven"]');
    await expect(chain.locator('[data-reaction-node="root"]')).toBeVisible();
    await expect(chain.locator('[data-reaction-node="active"]')).toContainText("Waiting for response...");
    await expect(chain.locator('[data-reaction-node="negation"]')).toHaveCount(0);
    await expect(chain.locator("ol > li")).toHaveCount(2);
  }
});

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
  await expect(stage.locator(":scope > header strong")).toHaveText("Attack Response");
  await expect(stage).not.toContainText("INTERACTION STAGE");
  await expect(stage).not.toContainText("HERO FOCUS");

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
