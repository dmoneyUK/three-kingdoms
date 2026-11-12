import { expect, test } from "@playwright/test";

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
  await expect(page.locator(".public-card-display-journey-copy")).toContainText("Player 1 played Attack on Player 2.");

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
