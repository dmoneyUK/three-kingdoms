import test from "node:test";
import assert from "node:assert/strict";
import { projectPresentationV2 } from "../../game/presentation-v2.ts";
import { derivePublicInteractionNarration } from "../../game/public-activity.ts";
import { oathRecipientIds } from "../../game/oath.ts";
import { advanceNegationWindow, query, quote, requestAndSettle, setTurn, state } from "./test-support.mjs";

function authoritativePending(code) {
  const raw = query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`);
  return raw ? JSON.parse(raw) : null;
}

function pendingForPresentation(storedPending) {
  return storedPending?.kind === "negation_window" ? {
    kind: "response",
    actorId: null,
    sharedNegationWindow: true,
    negationWindowId: storedPending.windowId,
    requirement: "negate",
    reason: "Negation response window",
    deadline: storedPending.deadline,
    ...(storedPending.readyAfterEventId ? { readyAfterEventId: storedPending.readyAfterEventId } : {}),
    ...(storedPending.causal ? { causal: storedPending.causal } : {}),
    continuation: { ...storedPending.continuation, remainingIds: [] },
  } : storedPending;
}

test("Group root proof ignores Test Room private draws but rejects duplicate public plays", { timeout: 30_000 }, async () => {
  for (const kind of ["BarbarianInvasion", "RainingArrows"]) {
    const required = kind === "BarbarianInvasion" ? "Attack" : "Dodge";
    const created = await requestAndSettle("create", { name: `Group proof ${kind}` });
    assert.equal(created.status, 201, JSON.stringify(created.data));
    const { code } = created.data.room;
    const token = created.data.token;
    let lobby = (await requestAndSettle("add_test_players", { code, token, name: `Group proof ${kind}` })).data.room;
    lobby = (await requestAndSettle("enable_test_room", { code, token })).data.room;
    lobby = (await requestAndSettle("configure_test_hands", {
      code, token, presetId: "custom",
      handsBySeat: { 0: [kind], 1: ["Negation", required], 2: ["Negation", required], 3: [required] },
      expectedRevision: lobby.testHandPreset.revision,
    })).data.room;
    lobby = (await requestAndSettle("start", { code, token })).data.room;
    const chosenHeroes = new Set();
    while (lobby.status === "heroes") {
      const actor = lobby.players.find((player) => player.id === lobby.currentAction?.actorId);
      const preferred = ["guanyu", "zhaoyun", "cao-cao", "liu-bei"];
      const hero = lobby.myHeroOptions.find((option) => option.id === preferred[actor?.seat] && !chosenHeroes.has(option.id))
        ?? lobby.myHeroOptions.find((option) => !chosenHeroes.has(option.id));
      assert.ok(actor && hero, `${kind}: Test Room exposes a legal Hero for the controlled seat`);
      chosenHeroes.add(hero.id);
      const chosen = await requestAndSettle("choose_hero", { code, token, heroId: hero.id });
      assert.equal(chosen.status, 200, `${kind}: ${JSON.stringify(chosen.data)}`);
      lobby = chosen.data.room;
    }

    const source = lobby.players[0];
    setTurn(code, source.seat, "play");
    const before = (await state(code, token, false, source.id)).data;
    const rootCard = before.myHand.find((candidate) => candidate.kind === kind);
    assert.ok(rootCard, `${kind}: the configured physical root card is in the source Hand`);
    const played = await requestAndSettle("play_card", { code, token, cardId: rootCard.id, preserveResponse: true });
    assert.equal(played.status, 200, `${kind}: ${JSON.stringify(played.data)}`);

    const current = (await state(code, token, false, source.id)).data;
    const stored = authoritativePending(code);
    const continuation = stored?.kind === "negation_window" ? stored.continuation : stored?.continuation;
    const group = continuation?.kind === "negation"
      ? continuation.effect?.pending?.continuation
      : continuation?.kind === "group" ? continuation : null;
    const rootEvent = current.timeline.find((event) => event.id === group?.rootEventId);
    assert.ok(rootEvent, `${kind}: the committed root resolves to its exact public play event`);
    assert.ok(current.timeline.some((event) => event.type === "card" && event.action === "draw"
      && event.presentation === false && event.card?.id === rootCard.id),
    `${kind}: Test Room retains a non-presented draw record for the same physical card`);
    assert.deepEqual(current.presentationV2.groupResolution?.rootCardProof, {
      semantics: "PROVEN",
      relation: "GROUP_ROOT_CARD",
      interactionId: current.presentationV2.groupResolution.interactionId,
      groupFrameId: current.presentationV2.groupResolution.groupFrameId,
      rootEventId: rootEvent.id,
      rootEventResolutionId: rootEvent.resolutionId,
      rootCardId: rootCard.id,
      sourceId: source.id,
      cardKind: kind,
      targetIds: current.presentationV2.groupResolution.targetIds,
    }, `${kind}: a private draw does not shadow the public physical root proof`);
    assert.deepEqual(current.presentationSnapshot.groupParticipantProgress?.rootCardProof,
      current.presentationV2.groupResolution.rootCardProof,
    `${kind}: the proof survives the public snapshot boundary`);

    const duplicatePublicPlay = {
      ...rootEvent,
      id: `${rootEvent.id}-duplicate-public-play`,
      resolutionId: `${rootEvent.resolutionId}-duplicate-public-play`,
    };
    const duplicateProjection = projectPresentationV2({
      pending: pendingForPresentation(stored),
      currentAction: current.currentAction,
      actionRevision: current.actionRevision,
      timeline: [...current.timeline, duplicatePublicPlay],
      causalEnvelope: current.causalEnvelope,
      oathRecipientIds: oathRecipientIds(current.players.map((player) => ({ id: player.id, alive: player.alive, hp: player.hp, maxHp: player.maxHp }))),
    });
    assert.equal(duplicateProjection.groupResolution?.rootCardProof, undefined,
      `${kind}: a second visible public play of the same physical card still fails closed`);
  }
});

test("Raining Arrows damage publishes its linked card source and actual recipient in H4", { timeout: 30_000 }, async () => {
  const created = await requestAndSettle("create", { name: "Raining Arrows damage source" });
  assert.equal(created.status, 201, JSON.stringify(created.data));
  const { code } = created.data.room;
  const token = created.data.token;
  let lobby = (await requestAndSettle("add_test_players", { code, token, name: "Raining Arrows damage source" })).data.room;
  lobby = (await requestAndSettle("enable_test_room", { code, token })).data.room;
  lobby = (await requestAndSettle("configure_test_hands", {
    code, token, presetId: "custom", handsBySeat: { 0: ["RainingArrows"], 1: [], 2: [], 3: [] },
    expectedRevision: lobby.testHandPreset.revision,
  })).data.room;
  lobby = (await requestAndSettle("start", { code, token })).data.room;
  const chosenHeroes = new Set();
  while (lobby.status === "heroes") {
    const actor = lobby.players.find((player) => player.id === lobby.currentAction?.actorId);
    const preferred = ["guanyu", "zhaoyun", "cao-cao", "liu-bei"];
    const hero = lobby.myHeroOptions.find((option) => option.id === preferred[actor?.seat] && !chosenHeroes.has(option.id))
      ?? lobby.myHeroOptions.find((option) => !chosenHeroes.has(option.id));
    assert.ok(actor && hero);
    chosenHeroes.add(hero.id);
    const chosen = await requestAndSettle("choose_hero", { code, token, heroId: hero.id });
    assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
    lobby = chosen.data.room;
  }

  const source = lobby.players[0];
  const firstTarget = lobby.players[1];
  setTurn(code, source.seat, "play");
  const before = (await state(code, token, false, source.id)).data;
  const card = before.myHand.find((candidate) => candidate.kind === "RainingArrows");
  assert.ok(card);
  const played = await requestAndSettle("play_card", { code, token, cardId: card.id, preserveResponse: true });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  const negationState = (await state(code, token)).data;
  const negationWindowId = negationState.currentAction.negationWindowId;
  assert.ok(negationWindowId, "the first group target gets the normal Negation window");
  await advanceNegationWindow(code, token, negationWindowId);
  const targetState = (await state(code, token)).data;
  assert.equal(targetState.currentAction.actorId, firstTarget.id);
  assert.ok(targetState.currentAction.legalActions.includes("decline_response"));

  const damaged = await requestAndSettle("decline_response", {
    code, token, preserveResponse: true,
  });
  assert.equal(damaged.status, 200, JSON.stringify(damaged.data));
  const damageEvent = damaged.data.room.timeline.find((event) => event.publicFact?.category === "DAMAGE_APPLIED"
    && event.publicFact?.committedOutcome?.changes?.some((change) => change.kind === "DAMAGE_APPLIED" && change.playerId === firstTarget.id));
  assert.ok(damageEvent, "the committed target loss remains linked to a public damage event");
  assert.equal(damageEvent.publicFact.actorId, source.id);
  assert.equal(damageEvent.publicFact.committedOutcome.source.label, "Raining Arrows", JSON.stringify(damageEvent.publicFact));
  assert.deepEqual(damageEvent.publicFact.committedOutcome.changes, [
    { kind: "DAMAGE_APPLIED", playerId: firstTarget.id, amount: 1 },
  ]);

  const snapshot = damaged.data.room.presentationSnapshot;
  const narration = derivePublicInteractionNarration({
    snapshot,
    players: damaged.data.room.players,
    rootEventId: damageEvent.publicFact.rootEventId,
    interactionId: snapshot.identity.interactionId,
    rootFrameId: snapshot.interaction.rootFrameId,
    eventId: damageEvent.id,
  });
  assert.ok(narration, JSON.stringify({
    snapshotIdentity: snapshot.identity, snapshotInteraction: snapshot.interaction,
    publicFacts: snapshot.publicEventFacts?.map(({ eventId, rootEventId, frameId, category, order }) => ({ eventId, rootEventId, frameId, category, order })),
    retainedFacts: snapshot.retainedPublicEventFacts?.map(({ eventId, rootEventId, frameId, category, order }) => ({ eventId, rootEventId, frameId, category, order })),
    selectedFact: { eventId: damageEvent.id, rootEventId: damageEvent.publicFact.rootEventId },
  }));
  assert.equal(narration?.headline, `${source.name} dealt 1 damage to ${firstTarget.name} with [Raining Arrows].`);
});
