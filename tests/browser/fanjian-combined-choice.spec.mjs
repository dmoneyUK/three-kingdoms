import { expect, test } from "@playwright/test";

test("Fanjian cancels on skill retap and submits one compact combined choice on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=zhou-yu-sowing-distrust&count=4&hero=zhou-yu");

  const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Sowing Distrust", exact: true });
  await expect(skill).toBeEnabled();
  await page.evaluate(() => { window.__browserActions = []; });

  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const target = page.locator('[data-player-anchor="p2"] .opponent-hero-target');
  await expect(target).toBeEnabled();
  await target.click();
  await expect(page.locator('[data-console-surface="local-operation"] button.primary')).toHaveText("Confirm");

  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('[data-player-anchor="p2"][data-target-selectable="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

  await skill.click();
  await target.click();
  await page.locator('[data-console-surface="local-operation"] button.primary').click();
  await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
    { action: "trigger", extra: { providerId: "zhou_yu_fanjian", targetId: "p2" } },
  ]);

  await page.goto("/tests/browser/fixture.html?state=fanjian-combined&count=4&targetHandCount=7&hero=zhou-yu");
  await page.evaluate(() => {
    const room = window.__browserRoom;
    const snapshot = room.presentationSnapshot;
    const scene = snapshot.interaction;
    const rootEventId = "browser-fanjian-committed-activation";
    const identity = {
      interactionId: scene.interactionId,
      rootFrameId: scene.rootFrameId,
      checkpointId: scene.checkpointId,
      presentationRevision: scene.presentationRevision,
    };
    const publicEventFact = {
      semantics: "PROVEN", visibility: "PUBLIC", identity, eventId: rootEventId,
      order: 1, frameId: scene.rootFrameId, rootEventId,
      category: "SKILL_USED", actorId: "p1", affectedPlayerIds: ["p2"],
      label: "Sowing Distrust", effect: { kind: "targeted_skill" },
    };
    snapshot.publicEventFacts = [publicEventFact];
    snapshot.skillEffectAction = {
      semantics: "PROVEN", effectId: "zhou_yu_fanjian", rootEventId,
      sourceId: "p1", targetId: "p2", interactionId: scene.interactionId, rootFrameId: scene.rootFrameId,
    };
    room.timeline = [{
      id: rootEventId, type: "message", player: "Player 1", target: "Player 2",
      message: "Player 1 used Sowing Distrust on Player 2.", presentation: true,
      publicSkillEffect: { effectId: "zhou_yu_fanjian", sourceId: "p1", targetId: "p2" },
      publicFact: {
        ...publicEventFact,
        interactionId: scene.interactionId,
        committedIdentity: { interactionId: scene.interactionId, rootFrameId: scene.rootFrameId },
      },
    }];
    window.__updateBrowserRoom(room);
  });
  const stage = page.locator('[data-fanjian-combined-choice="true"]');
  await expect(stage).toBeVisible();
  const activationH4 = page.locator('.public-interaction-event-announcement[data-public-interaction-event-id="browser-fanjian-committed-activation"]');
  await expect(activationH4).toContainText("Player 1 used Sowing Distrust on Player 2.");
  await expect(stage).toHaveAttribute("data-choice-mode", "actor-target-select");
  await expect(stage.getByText("SOWING DISTRUST", { exact: true })).toBeVisible();
  await expect(stage.getByText("Choose a suit and one hidden card.", { exact: true })).toBeVisible();
  const activationGeometry = await page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return Object.fromEntries(Object.entries({ left, top, right, bottom, width, height }).map(([key, value]) => [key, Math.round(value * 2) / 2]));
    };
    const table = document.querySelector(".play-table");
    return {
      viewport: { width: innerWidth, height: innerHeight },
      table: rect(table),
      seats: [...(table?.querySelectorAll(".player-board > [data-player-anchor]") ?? [])].map((seat, index) => ({ index, side: seat.dataset.sideColumn ?? "top", rect: rect(seat) })),
      firstHistoryCards: [...(table?.querySelectorAll(".public-card-journey-card[data-public-card-journey-phase]") ?? [])].map((card) => ({
        phase: card.dataset.publicCardJourneyPhase,
        ordinal: card.dataset.publicCardJourneyOrdinal,
        rect: rect(card),
        target: { top: card.dataset.publicCardJourneyTargetTop ?? null, height: card.dataset.publicCardJourneyTargetHeight ?? null },
      })),
      h4: [...(table?.querySelectorAll("[data-public-card-announcement='true']") ?? [])].map((copy) => ({ rect: rect(copy), visibility: getComputedStyle(copy).visibility, position: copy.dataset.publicCardAnnouncementPlacement ?? null })),
      picker: rect(table?.querySelector("[data-fanjian-combined-choice='true']")),
      pickerParts: (() => {
        const stage = table?.querySelector("[data-fanjian-combined-choice='true']");
        const box = (element) => rect(element);
        return stage ? {
          controls: box(stage.querySelector(".fanjian-combined-controls")),
          suitsFieldset: box(stage.querySelector(".fanjian-combined-suits")),
          suits: rect(stage.querySelector(".fanjian-combined-suit-options")),
          zones: box(stage.querySelector(".card-pool-panel__target-public-zones")),
          hand: box(stage.querySelector(".card-pool-panel__target-public-hand")),
          handCount: rect(stage.querySelector(".card-pool-panel__target-public-zone-title")),
          backs: rect(stage.querySelector(".card-pool-panel__target-public-backs")),
          confirm: rect(stage.querySelector(".card-pool-panel__confirm")),
        } : null;
      })(),
      pac: rect(table?.querySelector("[data-public-activity-chip='true']")),
      dock: rect(document.querySelector(".local-player-dock")),
    };
  });
  const h4Copy = page.locator('.public-interaction-event-announcement[data-public-interaction-event-id="browser-fanjian-committed-activation"] .public-card-display-journey-copy');
  const noHistoryH4Top = await h4Copy.evaluate((copy) => copy.getBoundingClientRect().top);
  expect(noHistoryH4Top).toBeCloseTo(activationGeometry.seats.reduce((bottom, seat) => Math.max(bottom, seat.rect.bottom), 0) + 6 + 72 + 8, 0);
  expect(activationGeometry.pickerParts.suits.bottom).toBeLessThanOrEqual(activationGeometry.pickerParts.handCount.top);
  expect(activationGeometry.pickerParts.handCount.top - activationGeometry.pickerParts.suits.bottom).toBeGreaterThanOrEqual(4);
  expect(activationGeometry.pickerParts.handCount.top - activationGeometry.pickerParts.suits.bottom).toBeLessThanOrEqual(8);
  const fixedBandGeometry = await page.evaluate(() => {
    const table = document.querySelector(".play-table");
    const h4 = table?.querySelector("[data-public-card-announcement-fixed-upper='true'][data-public-card-announcement-positioned='true']");
    const stage = table?.querySelector("[data-fanjian-combined-choice='true']");
    const pac = table?.querySelector("[data-public-activity-chip='true']");
    const h4Rect = h4?.getBoundingClientRect();
    const panelRect = stage?.getBoundingClientRect();
    const pacRect = pac?.getBoundingClientRect();
    return h4Rect && panelRect && pacRect ? {
      h4PanelGap: panelRect.top - h4Rect.bottom,
      panelPacGap: pacRect.top - panelRect.bottom,
      h4: { top: h4Rect.top, bottom: h4Rect.bottom },
      panel: { top: panelRect.top, bottom: panelRect.bottom },
      pac: { top: pacRect.top, bottom: pacRect.bottom },
    } : null;
  });
  expect(fixedBandGeometry, JSON.stringify(fixedBandGeometry)).not.toBeNull();
  expect(fixedBandGeometry.h4PanelGap).toBeGreaterThanOrEqual(6);
  expect(fixedBandGeometry.panelPacGap).toBeGreaterThanOrEqual(4);

  await page.evaluate(() => {
    const table = document.querySelector(".play-table");
    const topSeats = [...(table?.querySelectorAll(".player-board > [data-player-anchor]") ?? [])]
      .sort((left, right) => left.getBoundingClientRect().top - right.getBoundingClientRect().top)
      .filter((seat, _, all) => seat.getBoundingClientRect().top <= all[0].getBoundingClientRect().top + 24);
    const seat = topSeats[0];
    if (!table || !seat) throw new Error("Expected a visible top-row player seat");
    const seatRect = seat.getBoundingClientRect();
    const addHistory = (ordinal, phase, top) => {
      const card = document.createElement("div");
      card.className = "public-card-journey-card";
      card.dataset.publicCardJourneyEventId = `geometry-history-${ordinal}`;
      card.dataset.publicCardJourneyActorId = seat.dataset.playerAnchor;
      card.dataset.publicCardJourneyOrdinal = `${ordinal}`;
      card.dataset.publicCardJourneyPhase = phase;
      card.style.cssText = `position:fixed;left:${seatRect.left + seatRect.width / 2 - 24}px;top:${top}px;width:48px;height:72px;opacity:0;pointer-events:none`;
      if (phase === "queued") {
        card.dataset.publicCardJourneyAuthorReservationLeft = `${seatRect.left + seatRect.width / 2 - 24}`;
        card.dataset.publicCardJourneyAuthorReservationTop = `${seatRect.bottom + 6}`;
        card.dataset.publicCardJourneyAuthorReservationWidth = "48";
        card.dataset.publicCardJourneyAuthorReservationHeight = "72";
      }
      table.append(card);
    };
    addHistory(1, "queued", seatRect.bottom + 6);
    addHistory(2, "parked", 250);
  });
  await expect.poll(() => h4Copy.evaluate((copy) => copy.getBoundingClientRect().top)).toBeCloseTo(noHistoryH4Top, 0);
  const twoHistoryH4Top = await h4Copy.evaluate((copy) => copy.getBoundingClientRect().top);
  expect(Math.abs(twoHistoryH4Top - noHistoryH4Top)).toBeLessThanOrEqual(8);

  const suitGroup = stage.getByRole("group", { name: "Choose a suit" });
  const suitButtons = suitGroup.getByRole("button");
  await expect(suitButtons).toHaveCount(4);
  const visualLegend = suitGroup.locator("legend");
  await expect(visualLegend).toHaveClass(/card-details-sr-only/);
  expect(await visualLegend.evaluate((legend) => {
    const rect = legend.getBoundingClientRect();
    const style = getComputedStyle(legend);
    return rect.width <= 1 && rect.height <= 1 && style.overflow === "hidden" && style.clip !== "auto";
  })).toBe(true);
  expect(await suitButtons.evaluateAll((buttons) => buttons.map((button) => ({
    text: button.innerText.trim(), label: button.getAttribute("aria-label"),
  })))).toEqual([
    { text: "♥", label: "Heart" }, { text: "♦", label: "Diamond" },
    { text: "♣", label: "Club" }, { text: "♠", label: "Spade" },
  ]);
  const suitGeometry = await suitButtons.evaluateAll((buttons) => buttons.map((button) => {
    const rect = button.getBoundingClientRect();
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  }));
  for (const rect of suitGeometry) {
    expect(rect.width).toBeGreaterThanOrEqual(44);
    expect(rect.height).toBeGreaterThanOrEqual(44);
  }
  expect(suitGeometry[0].y).toBeCloseTo(suitGeometry[1].y, 0);

  await expect(stage.getByText("Hand (7)", { exact: true })).toHaveCount(1);
  await expect(stage.getByRole("heading", { name: "Choose one hidden card", exact: true })).toHaveCount(0);
  await expect(stage.getByText("Swipe for more", { exact: true })).toHaveCount(0);
  const handRail = stage.locator(".card-pool-panel__target-public-backs");
  await expect(stage.locator(".card-pool-panel__target-public-hand")).toHaveAttribute("aria-description", "Swipe horizontally to reach all hidden Hand positions.");
  const positions = handRail.locator(".card-pool-panel__target-public-position");
  const hiddenChoices = handRail.getByRole("button", { name: /^Choose hidden Hand position / });
  await expect(positions).toHaveCount(7);
  await expect(hiddenChoices).toHaveCount(7);
  const railGeometry = await handRail.evaluate((rail) => {
    const railRect = rail.getBoundingClientRect();
    const boxes = [...rail.querySelectorAll(".card-pool-panel__target-public-position")].map((position) => {
      const rect = position.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width };
    });
    return { left: railRect.left, right: railRect.right, clientWidth: rail.clientWidth, scrollWidth: rail.scrollWidth, boxes };
  });
  expect(railGeometry.scrollWidth).toBeGreaterThan(railGeometry.clientWidth);
  for (const box of railGeometry.boxes.slice(0, 4)) {
    expect(box.width).toBe(44);
    expect(box.left).toBeGreaterThanOrEqual(railGeometry.left);
    expect(box.right).toBeLessThanOrEqual(railGeometry.right + 0.5);
  }
  expect(railGeometry.boxes[4].left).toBeGreaterThanOrEqual(railGeometry.right - 0.5);
  const countAndRail = await stage.evaluate((panel) => {
    const count = panel.querySelector(".card-pool-panel__target-public-zone-title").getBoundingClientRect();
    const rail = panel.querySelector(".card-pool-panel__target-public-backs").getBoundingClientRect();
    return { countBottom: count.bottom, railTop: rail.top };
  });
  expect(countAndRail.railTop - countAndRail.countBottom).toBeGreaterThanOrEqual(0);
  expect(countAndRail.railTop - countAndRail.countBottom).toBeLessThanOrEqual(4);
  const pageText = await stage.evaluate((panel) => {
    const visibleCopy = panel.cloneNode(true);
    visibleCopy.querySelectorAll(".card-details-sr-only").forEach((node) => node.remove());
    return visibleCopy.innerText;
  });
  expect(pageText.match(/Choose a suit/g) ?? []).toHaveLength(1);
  expect(pageText).not.toMatch(/browser-|Attack|Dodge|Peach|Negation|Choose one hidden card|Swipe for more/);

  const confirm = stage.getByRole("button", { name: "Confirm", exact: true });
  await expect(stage.getByRole("button", { name: "Confirm", exact: true })).toHaveCount(1);
  await expect(confirm).toBeDisabled();
  const confirmGeometry = await confirm.boundingBox();
  expect(confirmGeometry.width).toBeGreaterThanOrEqual(80);
  expect(confirmGeometry.width).toBeLessThanOrEqual(110);
  expect(confirmGeometry.height).toBeGreaterThanOrEqual(44);
  await suitGroup.getByRole("button", { name: "Heart", exact: true }).click();
  await expect(confirm).toBeDisabled();
  await handRail.evaluate((rail) => { rail.scrollLeft = rail.scrollWidth; });
  const finalPosition = handRail.getByRole("button", { name: "Choose hidden Hand position 7" });
  await finalPosition.click();
  await expect(finalPosition).toHaveAttribute("aria-pressed", "true");
  await expect(confirm).toBeEnabled();
  await page.evaluate(() => { window.__browserActions = []; });
  await confirm.dblclick();
  await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
    { action: "trigger", extra: { providerId: "zhou_yu_fanjian_choice", choice: "♥", cardKeys: ["hand:6"] } },
  ]);
  await page.evaluate(() => {
    const room = window.__browserRoom;
    const snapshot = room.presentationSnapshot;
    const rootEvent = room.timeline[0];
    const rootFact = snapshot.publicEventFacts[0];
    const scene = snapshot.interaction;
    const revealEventId = "browser-fanjian-public-reveal";
    const settlementEventId = "browser-fanjian-settlement";
    const damageEventId = "browser-fanjian-damage";
    const physicalCardId = "browser-fanjian-revealed-nio-shield";
    const proof = {
      semantics: "PROVEN", effectId: "zhou_yu_fanjian", eventId: settlementEventId,
      rootEventId: rootEvent.id, sourceId: "p1", targetId: "p2", outcome: "SUITS_DIFFERED",
      interactionId: scene.interactionId, rootFrameId: scene.rootFrameId, guess: "♦",
      revealEventId, physicalCardId,
      damage: { outcome: "DAMAGE_APPLIED", amount: 1, eventId: damageEventId },
    };
    const revealedCard = { id: physicalCardId, kind: "NioShield", suit: "♣", rank: "2" };
    const revealEvent = {
      id: revealEventId, type: "card", player: "Player 1", target: "Player 2", actorId: "p1",
      card: revealedCard, action: "reveal", presentation: true, publicSequence: 2,
      resolutionId: "browser-fanjian-resolution",
      publicZoneTransition: {
        semantics: "PROVEN", visibility: "PUBLIC", eventId: revealEventId, sourceEventId: revealEventId,
        rootEventId: rootEvent.id, physicalCardId,
        from: { zone: "HAND", ownerId: "p1" }, to: { zone: "HAND", ownerId: "p2" },
      },
    };
    const damageFact = {
      ...rootFact, eventId: damageEventId, order: 4, frameId: scene.rootFrameId,
      category: "DAMAGE_APPLIED", actorId: "p1", affectedPlayerIds: ["p2"], amount: 1,
    };
    const settlementEvent = {
      id: settlementEventId, type: "message", player: "Player 2",
      message: "Player 2 guessed ♦ and revealed 2♣ Nio Shield. Suits differ; Player 2 takes 1 damage.",
      importance: "essential", finalResult: true, publicSkillEffectSettlement: proof,
    };
    const damageEvent = {
      id: damageEventId, type: "message", player: "Player 1", target: "Player 2",
      message: "Player 2 takes 1 damage from Sowing Distrust.", publicFact: {
        ...damageFact, interactionId: scene.interactionId, committedIdentity: {
          interactionId: scene.interactionId, rootFrameId: scene.rootFrameId,
        },
      },
    };
    room.presentationSnapshot = {
      ...snapshot,
      skillEffectSettlements: [proof],
      publicEventFacts: [rootFact, damageFact],
    };
    room.timeline = [rootEvent, revealEvent, settlementEvent, damageEvent];
    window.__updateBrowserRoom(room);
  });
  const revealFace = page.locator('.public-hand-transfer .played-card');
  await expect(revealFace).toBeVisible();
  // Inspect the real E16 CardFace while its existing reveal→move→park
  // animation is at the central reveal keyframe. At the end of this same
  // animation it intentionally shrinks beside the recipient's Seat.
  const revealFrame = await revealFace.evaluate((face) => {
    const transfer = face.closest(".public-hand-transfer");
    const animation = transfer?.getAnimations().find((candidate) => candidate.animationName === "revealedCardToHand");
    if (!animation) return null;
    const duration = Number(animation.effect?.getTiming().duration);
    animation.pause();
    animation.currentTime = duration * 0.5;
    window.dispatchEvent(new Event("resize"));
    return { duration, playState: animation.playState };
  });
  expect(revealFrame).not.toBeNull();
  expect(revealFrame.duration).toBeGreaterThan(0);
  expect(revealFrame.playState).toBe("paused");
  const settledH4 = page.locator('.public-interaction-event-announcement[data-public-interaction-event-id="browser-fanjian-settlement"]');
  await expect(settledH4).toContainText("Player 2 guessed ♦; revealed 2♣ Nio Shield.");
  await expect(settledH4).toContainText("Suits differ; Player 2 takes 1 damage.");
  const h4AndRevealRects = await page.evaluate(() => {
    const table = document.querySelector(".play-table");
    const h4 = document.querySelector('.public-interaction-event-announcement[data-public-interaction-event-id="browser-fanjian-settlement"] .public-card-display-journey-copy');
    const card = document.querySelector('.public-hand-transfer .played-card');
    const tableRect = table?.getBoundingClientRect();
    const h4Rect = h4?.getBoundingClientRect();
    const cardRect = card?.getBoundingClientRect();
    return h4Rect && cardRect && tableRect ? {
      gap: cardRect.top - h4Rect.bottom,
      centerOffset: Math.abs(cardRect.left + cardRect.width / 2 - (tableRect.left + tableRect.width / 2)),
      h4: { left: h4Rect.left, top: h4Rect.top, right: h4Rect.right, bottom: h4Rect.bottom, width: h4Rect.width, height: h4Rect.height },
      card: { left: cardRect.left, top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom, width: cardRect.width, height: cardRect.height },
    } : null;
  });
  expect(h4AndRevealRects, JSON.stringify(h4AndRevealRects)).not.toBeNull();
  expect(h4AndRevealRects.card.width, JSON.stringify(h4AndRevealRects)).toBeGreaterThanOrEqual(90);
  expect(h4AndRevealRects.card.height, JSON.stringify(h4AndRevealRects)).toBeGreaterThanOrEqual(130);
  expect(h4AndRevealRects.centerOffset, JSON.stringify(h4AndRevealRects)).toBeLessThanOrEqual(12);
  expect(h4AndRevealRects.gap, JSON.stringify(h4AndRevealRects)).toBeGreaterThanOrEqual(0);
  expect(h4AndRevealRects.gap, JSON.stringify(h4AndRevealRects)).toBeLessThanOrEqual(32);
});
