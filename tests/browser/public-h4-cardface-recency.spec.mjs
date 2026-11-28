import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

async function publishFanjianActivation(page) {
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
}

async function publishFanjianSettlement(page) {
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
}

async function playPublicAttack(page) {
  await page.evaluate(() => {
    const room = window.__browserRoom;
    const snapshot = room.presentationSnapshot;
    const eventId = "browser-post-fanjian-attack";
    const interactionId = "browser-post-fanjian-attack-interaction";
    const frameId = "browser-post-fanjian-attack-frame";
    const checkpointId = "browser-post-fanjian-attack-checkpoint";
    const card = { id: "browser-post-fanjian-attack-card", kind: "Attack", suit: "♠", rank: "7" };
    const players = ["p1", "p2"];
    const identity = { interactionId, checkpointId, presentationRevision: 2 };
    const roles = {
      sourceId: "p1", originalTargetIds: ["p2"], activeTargetIds: ["p2"],
      currentParticipantId: "p2", decisionActorId: "p2", activeResolverId: "p2",
      parentParticipantId: null, participantIds: players,
    };
    const rootEvent = {
      id: eventId, type: "card", action: "play", player: "Player 1", target: "Player 2",
      card, resolutionId: "browser-post-fanjian-attack-resolution", presentation: true,
    };
    room.timeline = [...room.timeline, rootEvent];
    room.presentationSnapshot = {
      ...snapshot,
      identity,
      stable: { kind: "CHOICE", ...identity, decisionActorId: "p2" },
      interaction: {
        semantics: "PROVEN", interactionId, rootFrameId: frameId, activeFrameId: frameId,
        parentFrameId: null, checkpointId, presentationRevision: 2, stage: "ATTACK_RESPONSE",
        sourceId: "p1", effect: "Attack", targetIds: ["p2"], activeTargetIds: ["p2"],
        currentParticipantId: "p2", decisionActorId: "p2", activeResolverId: "p2", activeSourceId: "p1",
        participantIds: players, participantRoles: roles,
        continuity: { relation: "ROOT_FRAME", parentFrameId: null },
      },
      localControl: { source: "CurrentAction", actionRevision: "browser-post-fanjian-attack", kind: "response", actorId: "p2", entitled: room.meId === "p2" },
      rootAction: {
        semantics: "PROVEN", interactionId, rootFrameId: frameId, activeFrameId: frameId,
        checkpointId, presentationRevision: 2, rootEventId: eventId, action: "ATTACK",
        cardKind: "Attack", physicalCardKind: "Attack", sourceId: "p1", targetId: "p2",
      },
      skillEffectAction: null,
      reactionChain: null,
    };
    room.phase = "response";
    room.pending = { kind: "response" };
    room.pendingAttack = { sourceId: "p1", targetId: "p2" };
    room.actionPlayerId = "p1";
    room.isMyTurn = false;
    room.isMyAction = room.meId === "p2";
    room.currentAction = {
      version: 3, kind: "response", actorId: "p2", deadline: Date.now() + 30_000,
      reason: "Respond to Attack", legalActions: ["respond", "decline_response"], requirement: "dodge", options: [],
    };
    window.__updateBrowserRoom(room);
  });
}

async function openStealNegation(page) {
  await page.evaluate(() => {
    const room = window.__browserRoom;
    const snapshot = room.presentationSnapshot;
    const eventId = "browser-post-fanjian-steal";
    const interactionId = "browser-post-fanjian-steal-interaction";
    const frameId = "browser-post-fanjian-steal-frame";
    const checkpointId = "browser-post-fanjian-steal-checkpoint";
    const card = { id: "browser-post-fanjian-steal-card", kind: "Steal", suit: "♦", rank: "J" };
    const players = ["p1", "p2"];
    const identity = { interactionId, checkpointId, presentationRevision: 3 };
    const rootEvent = {
      id: eventId, type: "card", action: "play", player: "Player 1", target: "Player 2",
      card, resolutionId: "browser-post-fanjian-steal-resolution", presentation: true,
    };
    room.timeline = [...room.timeline, rootEvent];
    room.presentationSnapshot = {
      ...snapshot,
      identity,
      stable: { kind: "SPECIAL", ...identity, decisionActorId: null },
      interaction: {
        semantics: "PROVEN", interactionId, rootFrameId: frameId, activeFrameId: frameId,
        parentFrameId: null, checkpointId, presentationRevision: 3, stage: "NEGATION",
        sourceId: "p1", effect: "Steal", targetIds: ["p2"], activeTargetIds: ["p2"],
        currentParticipantId: null, decisionActorId: null, activeResolverId: null, activeSourceId: "p1",
        participantIds: players,
        participantRoles: {
          sourceId: "p1", originalTargetIds: ["p2"], activeTargetIds: ["p2"],
          currentParticipantId: null, decisionActorId: null, activeResolverId: null,
          parentParticipantId: null, participantIds: players,
        },
        continuity: { relation: "ROOT_FRAME", parentFrameId: null },
      },
      localControl: { source: "CurrentAction", actionRevision: "browser-post-fanjian-steal", kind: "response", actorId: null, entitled: false },
      rootAction: null,
      skillEffectAction: null,
      reactionChain: {
        semantics: "PROVEN", interactionId, frameId,
        rootCard: { interactionId, frameId, sourceId: "p1", targetId: "p2", cardKind: "Steal" },
        nodes: [],
        publicEventLinks: { root: { eventId, resolutionId: rootEvent.resolutionId }, nodes: [] },
        rootEffectState: "ACTIVE",
      },
    };
    room.phase = "response";
    room.pending = { kind: "negation" };
    room.pendingNegation = { kind: "negation", sourceId: "p1", actorId: null, effectTargetId: "p2", cardName: "Steal", negated: false, deadline: Date.now() + 30_000 };
    room.actionPlayerId = null;
    room.isMyTurn = false;
    room.isMyAction = false;
    room.currentAction = { version: 3, kind: "none", actorId: null, deadline: 0, reason: "Waiting for Negation responses", legalActions: [] };
    window.__updateBrowserRoom(room);
  });
}

test("new public Attack and Steal replace settled Fanjian H4/CardFace ownership on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 766 });
  await page.goto("/tests/browser/fixture.html?state=fanjian-combined&count=4&targetHandCount=7&hero=zhou-yu");
  await publishFanjianActivation(page);
  await publishFanjianSettlement(page);

  const oldH4 = page.locator('.public-interaction-event-announcement[data-public-interaction-event-id="browser-fanjian-settlement"]');
  await expect(oldH4).toContainText("Player 2 guessed ♦; revealed 2♣ Nio Shield.");

  await playPublicAttack(page);
  const attackDisplay = page.locator('[data-public-card-display="true"][data-public-card-root-event-id="browser-post-fanjian-attack"]');
  await expect(attackDisplay).toBeVisible();
  await expect(attackDisplay).toHaveAttribute("data-public-card-id", "browser-post-fanjian-attack-card");
  await expect(page.locator('.public-interaction-event-announcement[data-public-interaction-event-id="browser-fanjian-settlement"]')).toHaveCount(0);
  await expect(page.locator(".public-card-display-journey-copy")).toContainText("Player 1 played [Attack] on Player 2.");

  await openStealNegation(page);
  const stealDisplay = page.locator('[data-public-card-display="true"][data-public-card-root-event-id="browser-post-fanjian-steal"]');
  await expect(stealDisplay).toBeVisible();
  await expect(stealDisplay).toHaveAttribute("data-public-card-id", "browser-post-fanjian-steal-card");
  await expect(page.locator(".public-card-display-journey-copy")).toContainText("Player 1 played Steal on Player 2.");

  await page.evaluate(() => window.__updateBrowserRoom((room) => ({
    ...room,
    meId: "p4",
    myHand: [],
    myRole: "Rebel",
    isMyAction: false,
    currentAction: { version: 3, kind: "none", actorId: null, deadline: 0, reason: "No action needed", legalActions: [] },
    presentationSnapshot: {
      ...room.presentationSnapshot,
      localControl: { ...room.presentationSnapshot.localControl, actionRevision: "browser-post-fanjian-observer", actorId: null, entitled: false },
    },
  })));
  const observerSteal = page.locator('[data-public-card-display="true"][data-public-card-root-event-id="browser-post-fanjian-steal"]');
  await expect(observerSteal).toBeVisible();
  await expect(observerSteal).toHaveAttribute("data-public-card-id", "browser-post-fanjian-steal-card");
  await expect(page.locator(".public-card-display-journey-copy")).toContainText("Player 1 played Steal on Player 2.");
  await expect(page.locator('.public-interaction-event-announcement[data-public-interaction-event-id="browser-fanjian-settlement"]')).toHaveCount(0);
});

test("one committed Fanjian result stays visible for three seconds without hiding its reveal", async ({ page }) => {
  await page.setViewportSize({ width: 440, height: 766 });
  await page.goto("/tests/browser/fixture.html?state=fanjian-combined&count=4&targetHandCount=7&hero=zhou-yu");
  await page.addStyleTag({ content: ".play-table { height: 474px !important; min-height: 474px !important; max-height: 474px !important; }" });
  await publishFanjianActivation(page);
  await publishFanjianSettlement(page);

  const result = page.locator('.public-interaction-event-announcement[data-public-interaction-event-id="browser-fanjian-settlement"]');
  await expect(result).toContainText("Player 2 guessed ♦; revealed 2♣ Nio Shield.");
  const samples = await page.evaluate(async () => {
    const startedAt = performance.now();
    const rows = [];
    while (performance.now() - startedAt < 3_500) {
      const section = document.querySelector('[data-public-interaction-event-id="browser-fanjian-settlement"]');
      const copy = section?.querySelector('[data-public-card-announcement="true"]');
      const rect = (element) => {
        if (!element) return null;
        const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
        return { left, top, right, bottom, width, height };
      };
      const overlapsRects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
      const style = copy ? getComputedStyle(copy) : null;
      const topSeats = [...(document.querySelectorAll(".play-table .player-board > [data-player-anchor]") ?? [])]
        .map((seat) => ({ element: seat, rect: seat.getBoundingClientRect() }))
        .filter(({ rect }) => rect.width > 0 && rect.height > 0)
        .sort((first, second) => first.rect.top - second.rect.top);
      const upperSeats = topSeats.filter(({ rect }) => rect.top <= topSeats[0]?.rect.top + 24);
      const upperSlotBottom = Math.max(0, ...upperSeats.map(({ rect }) => rect.bottom + 6 + 72));
      const parkedMiniatures = [...document.querySelectorAll('.play-table .public-card-journey-card[data-public-card-journey-phase="parked"]')]
        .map((card) => ({ element: card, rect: card.getBoundingClientRect(), actorId: card.dataset.publicCardJourneyActorId ?? "" }))
        .filter(({ rect, actorId }) => rect.width > 0 && rect.height > 0 && upperSeats.some(({ element }) => element.dataset.playerAnchor === actorId))
        .sort((first, second) => Number(first.element.dataset.publicCardJourneyOrdinal ?? 0) - Number(second.element.dataset.publicCardJourneyOrdinal ?? 0));
      const actualFirstMiniBottom = parkedMiniatures.length
        ? Math.max(...upperSeats.map(({ element }) => {
          const actorMini = parkedMiniatures.find((mini) => mini.actorId === element.dataset.playerAnchor);
          return actorMini?.rect.bottom ?? element.getBoundingClientRect().bottom + 6 + 72;
        }))
        : upperSlotBottom;
      const firstMiniRects = upperSeats.map(({ element }) => {
        const actorMini = parkedMiniatures.find((mini) => mini.actorId === element.dataset.playerAnchor);
        if (actorMini) return actorMini.rect;
        const seatRect = element.getBoundingClientRect();
        const left = seatRect.left + seatRect.width / 2 - 24;
        const top = seatRect.bottom + 6;
        return { left, top, right: left + 48, bottom: top + 72 };
      });
      const card = document.querySelector('.public-zone-transition-layer .active-table-reveal[data-public-zone-transition-event-id="browser-fanjian-public-reveal"]');
      const cardRect = rect(card);
      const h4Rect = rect(copy);
      rows.push({
        elapsed: performance.now() - startedAt,
        visible: Boolean(copy && style?.visibility === "visible" && style.display !== "none" && h4Rect?.width > 0 && h4Rect?.height > 0),
        key: copy?.dataset.publicCardAnnouncementCopyKey ?? null,
        h4Rect,
        firstMiniBottom: actualFirstMiniBottom,
        firstMiniSource: parkedMiniatures.length ? "parked-dom" : "reserved-slot",
        cardRect,
        cardOpacity: card ? Number(getComputedStyle(card).opacity) : null,
        stationaryPlacement: card?.dataset.publicRevealStationaryPlacement ?? "ready",
        cardOverlapsH4: overlapsRects(h4Rect, cardRect),
        cardOverlapsMini: firstMiniRects.some((mini) => overlapsRects(mini, cardRect)),
        h4Delivery: copy?.dataset.publicCardAnnouncementDelivery ?? null,
        h4Placement: copy?.dataset.publicCardAnnouncementPlacement ?? null,
        h4Stability: copy?.dataset.publicCardAnnouncementStability ?? null,
        h4FailureReason: copy?.dataset.publicCardAnnouncementFailureReason ?? null,
        h4FailureObstacles: copy?.dataset.publicCardAnnouncementFailureObstacles ?? null,
        pacRect: rect(document.querySelector("[data-public-activity-chip='true']")),
      });
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    return rows;
  });
  const visibleRows = samples.filter((sample) => sample.visible);
  const firstVisible = visibleRows[0];
  const sustained = firstVisible
    ? samples.filter((sample) => sample.elapsed >= firstVisible.elapsed && sample.elapsed <= firstVisible.elapsed + 3_000)
    : [];
  const keys = [...new Set(visibleRows.map((sample) => sample.key))];
  const finalVisible = samples.at(-1)?.visible ?? false;
  const h4MiniGap = firstVisible?.h4Rect ? firstVisible.h4Rect.top - firstVisible.firstMiniBottom : null;
  const stableRevealSamples = samples.filter((sample) => sample.visible && sample.elapsed > 700 && sample.cardOpacity !== null && sample.cardOpacity > 0.95);
  const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
  const revealH4Overlap = stableRevealSamples.some((sample) => overlaps(sample.h4Rect, sample.cardRect));

  expect(sustained.length, JSON.stringify({ firstVisible, tail: samples.slice(-6) })).toBeGreaterThan(100);
  expect(sustained.every((sample) => sample.visible), JSON.stringify(sustained.filter((sample) => !sample.visible).slice(0, 8))).toBe(true);
  expect(keys, JSON.stringify(keys)).toHaveLength(1);
  expect(finalVisible, JSON.stringify(samples.slice(-6))).toBe(true);
  expect(h4MiniGap, JSON.stringify({ firstVisible, h4MiniGap })).toBeGreaterThanOrEqual(4);
  expect(h4MiniGap, JSON.stringify({ firstVisible, h4MiniGap })).toBeLessThanOrEqual(8);
  expect(revealH4Overlap, JSON.stringify(stableRevealSamples.filter((sample) => overlaps(sample.h4Rect, sample.cardRect)).slice(0, 4))).toBe(false);
  const visibleRevealSamples = samples.filter((sample) => sample.cardOpacity !== null && sample.cardOpacity > 0.05);
  expect(visibleRevealSamples.every((sample) => !sample.cardOverlapsH4), JSON.stringify(visibleRevealSamples.filter((sample) => sample.cardOverlapsH4).slice(0, 8))).toBe(true);
  expect(visibleRevealSamples.every((sample) => !sample.cardOverlapsMini), JSON.stringify(visibleRevealSamples.filter((sample) => sample.cardOverlapsMini).slice(0, 8))).toBe(true);
  expect(visibleRevealSamples.every((sample) => sample.cardRoute === "left" || sample.cardRoute === "right"), JSON.stringify(visibleRevealSamples.slice(0, 8).map((sample) => sample.cardRoute))).toBe(true);

  const originalViewerId = await page.evaluate(() => window.__browserRoom.meId);
  await page.evaluate(() => window.__updateBrowserRoom((room) => ({
    ...room,
    meId: room.players.find((player) => player.id !== room.meId)?.id ?? room.meId,
    myHand: [],
    isMyAction: false,
  })));
  const switchedH4 = page.locator('.public-interaction-event-announcement[data-public-interaction-event-id="browser-fanjian-settlement"] [data-public-card-announcement="true"]');
  await expect(switchedH4).toBeVisible();
  await expect(switchedH4).toHaveAttribute("data-public-card-announcement-copy-key", keys[0]);
  await page.evaluate((viewerId) => window.__updateBrowserRoom((room) => ({ ...room, meId: viewerId })), originalViewerId);
});

test("a real Attack reveals its authentic CardFace with the matching H4 from the same first readable frame", async ({ page, request }) => {
  const runtimeErrors = [];
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  const attack = { id: "h4-attack-cardface-sync", kind: "Attack", suit: "♣", rank: "10" };
  const dodge = { id: "h4-attack-hidden-dodge", kind: "Dodge", suit: "♥", rank: "2" };
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "SYNC ATTACKER", role: "Lord", hero: "sun-quan", hp: 4, maxHp: 4, hand: [attack] },
        { name: "SYNC TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [dodge] },
        { name: "SYNC OBSERVER", role: "Rebel", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
        { name: "SYNC FOURTH", role: "Renegade", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!seeded.ok()) throw new Error(`Card/H4 sync room seed failed: ${await seeded.text()}`);
  const room = await seeded.json();
  const [attacker, target, observer] = room.players;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(() => {
    window.__publicRevealSync = { expected: null, rows: [] };
    const capture = (now) => {
      const trace = window.__publicRevealSync;
      const expected = trace?.expected;
      if (expected) {
        const cards = [...document.querySelectorAll('.public-card-journey-card[data-public-card-primary-card="true"]')]
          .filter((card) => card.dataset.publicCardJourneyEventId === expected.eventId
            && card.dataset.publicCardJourneyCardId === expected.cardId
            && card.dataset.publicCardJourneyPhase === "reveal");
        const card = cards[0];
        if (card) {
          const face = card.querySelector(".played-card");
          const cardRect = card.getBoundingClientRect();
          const faceRect = face?.getBoundingClientRect();
          const cardStyle = getComputedStyle(card);
          const display = card.closest("[data-public-card-display='true']");
          const announcements = [...document.querySelectorAll('[data-public-card-announcement="true"]')]
            .filter((copy) => copy.dataset.publicCardAnnouncementEventId === expected.eventId
              || copy.dataset.publicCardAnnouncementAnchorEventId === expected.eventId
              || copy.dataset.publicCardAnnouncementStagePrimaryEventId === expected.eventId)
            .map((copy) => {
              const rect = copy.getBoundingClientRect();
              const style = getComputedStyle(copy);
              return {
                eventId: copy.dataset.publicCardAnnouncementEventId ?? null,
                anchorEventId: copy.dataset.publicCardAnnouncementAnchorEventId ?? null,
                stagePrimaryEventId: copy.dataset.publicCardAnnouncementStagePrimaryEventId ?? null,
                copyKey: copy.dataset.publicCardAnnouncementCopyKey ?? null,
                delivery: copy.dataset.publicCardAnnouncementDelivery ?? null,
                placement: copy.dataset.publicCardAnnouncementPlacement ?? null,
                layoutIdentity: copy.dataset.publicStageLayoutIdentity ?? null,
                visibility: style.visibility,
                display: style.display,
                opacity: Number(style.opacity),
                text: copy.textContent?.trim() ?? "",
                rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
              };
            });
          const table = card.closest(".play-table");
          trace.rows.push({
            at: now,
            elapsed: now - expected.startedAt,
            eventId: card.dataset.publicCardJourneyEventId,
            cardId: card.dataset.publicCardJourneyCardId,
            phase: card.dataset.publicCardJourneyPhase,
            cardVisibility: cardStyle.visibility,
            cardOpacity: Number(cardStyle.opacity),
            faceVisible: Boolean(face && faceRect?.width > 0 && faceRect?.height > 0),
            cardRect: { left: cardRect.left, top: cardRect.top, right: cardRect.right, bottom: cardRect.bottom, width: cardRect.width, height: cardRect.height },
            displayRootEventId: display?.dataset.publicCardRootEventId ?? null,
            displayInteractionId: display?.dataset.publicCardInteractionId ?? null,
            displayViewerId: display?.dataset.publicCardViewerId ?? null,
            layoutViewerId: display?.dataset.publicCardLayoutViewerId ?? null,
            layoutPending: display?.dataset.publicCardLayoutPending ?? null,
            revealReadiness: card.dataset.publicCardRevealReadiness ?? null,
            tableLayoutFailure: table?.dataset.publicStageLayoutFailure ?? null,
            tableLayoutScope: table?.dataset.publicStageLayoutScope ?? null,
            sharedLayoutStatus: table?.dataset.publicStageLayoutStatus ?? null,
            sharedLayoutPhase: table?.dataset.publicStageLayoutPhase ?? null,
            sharedLayoutIdentity: table?.dataset.publicStageLayoutIdentity ?? null,
            cardLayoutIdentity: card.dataset.publicStageLayoutIdentity ?? null,
            announcements,
          });
          if (trace.rows.length > 600) trace.rows.splice(0, trace.rows.length - 600);
        }
      }
      requestAnimationFrame(capture);
    };
    requestAnimationFrame(capture);
  });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: observer.token, name: observer.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();

  const beforePlay = await request.get(`${API}/api/rooms?code=${room.code}&token=${attacker.token}`);
  expect(beforePlay.ok()).toBeTruthy();
  expect((await beforePlay.json()).currentAction.legalActions).toContain("play_card");
  const commitMarkedAt = await page.evaluate(() => performance.now());
  const played = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: room.code, token: attacker.token, cardId: attack.id, targetId: target.id },
  });
  if (!played.ok()) throw new Error(`Real Attack failed: ${await played.text()}`);
  const playResult = await played.json();
  const attackEvent = playResult.room.timeline.find((event) => event.type === "card" && event.card?.id === attack.id);
  expect(attackEvent, "the real Attack commit must retain its public event identity").toBeTruthy();
  await page.evaluate(({ eventId, cardId, startedAt }) => {
    window.__publicRevealSync.expected = { eventId, cardId, startedAt };
  }, { eventId: attackEvent.id, cardId: attack.id, startedAt: commitMarkedAt });

  const revealed = page.locator(`.public-card-journey-card[data-public-card-journey-event-id="${attackEvent.id}"][data-public-card-journey-card-id="${attack.id}"][data-public-card-journey-phase="reveal"]`);
  await expect(revealed).toBeVisible({ timeout: 5_000 });
  expect(runtimeErrors).toEqual([]);
  await expect.poll(() => page.evaluate(() => window.__publicRevealSync.rows.filter((row) =>
    row.faceVisible && row.cardVisibility === "visible" && row.cardOpacity > 0.95).length), { timeout: 5_000 })
    .toBeGreaterThan(30);
  expect(runtimeErrors).toEqual([]);
  const rows = await page.evaluate(() => window.__publicRevealSync.rows);
  const readable = rows.filter((row) => row.faceVisible && row.cardVisibility === "visible" && row.cardOpacity > 0.95);
  const firstReadable = readable[0];
  const matchingVisibleH4 = (row) => row.announcements.filter((copy) => copy.visibility === "visible"
    && copy.display !== "none" && copy.opacity > 0
    && copy.rect.width > 0 && copy.rect.height > 0
    && (copy.eventId === attackEvent.id || copy.anchorEventId === attackEvent.id || copy.stagePrimaryEventId === attackEvent.id));
  const overlap = (left, right) => left.left < right.right && left.right > right.left
    && left.top < right.bottom && left.bottom > right.top;
  expect(firstReadable, JSON.stringify(rows.slice(0, 6))).toBeTruthy();
  expect(matchingVisibleH4(firstReadable), JSON.stringify(firstReadable)).toHaveLength(1);
  expect(readable.every((row) => matchingVisibleH4(row).length === 1), JSON.stringify(readable.filter((row) => matchingVisibleH4(row).length !== 1).slice(0, 8))).toBe(true);
  expect(readable.every((row) => !overlap(row.cardRect, matchingVisibleH4(row)[0].rect)), JSON.stringify(readable.filter((row) => overlap(row.cardRect, matchingVisibleH4(row)[0]?.rect)).slice(0, 8))).toBe(true);
  expect(new Set(readable.map((row) => row.eventId)).size).toBe(1);
  expect(new Set(readable.map((row) => row.cardId)).size).toBe(1);
  expect(firstReadable.displayViewerId).toBe(observer.id);
  expect(firstReadable.layoutViewerId).toBe(observer.id);
  expect(firstReadable.revealReadiness).toBe("ready");
  expect(firstReadable.sharedLayoutStatus).toBe("shared-reveal");
  expect(firstReadable.sharedLayoutPhase).toBe("reveal");
  expect(firstReadable.cardLayoutIdentity).toBe(firstReadable.sharedLayoutIdentity);
  expect(matchingVisibleH4(firstReadable)[0].layoutIdentity).toBe(firstReadable.sharedLayoutIdentity);
  expect(matchingVisibleH4(firstReadable)[0].delivery).toBe("VISIBLE");
});
