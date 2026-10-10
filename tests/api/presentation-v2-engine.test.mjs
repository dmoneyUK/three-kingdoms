import test from "node:test";
import { projectPresentationV2 } from "../../game/presentation-v2.ts";
import { composePresentationSnapshot } from "../../game/presentation-snapshot.ts";
import { buildPresentationClientView } from "../../game/presentation-client.ts";
import { oathRecipientIds } from "../../game/oath.ts";
import {
  assert, card, createHumanGame, openBorrowedSwordScenario, openGanglieGroup, passNegationWindows, prepareGuoJudgement, query, quote, request, requestAndSettle, setDeck, setEquipment, setHand, setTurn, sql, state, waitForState,
} from "./test-support.mjs";

function authoritativePending(code) {
  const raw = query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`);
  return raw ? JSON.parse(raw) : null;
}

function assertStableDyingPersistence(code) {
  const pending = authoritativePending(code);
  const rawEnvelope = query(`SELECT causal_envelope_json FROM rooms WHERE code=${quote(code)}`);
  const envelope = rawEnvelope ? JSON.parse(rawEnvelope) : null;
  assert.equal(pending?.kind, "dying");
  assert.ok(envelope);
  const active = envelope.frames.find((frame) => frame.frameId === envelope.activeFrameId);
  assert.equal(active?.stage, "DYING");
  assert.equal(envelope.checkpoint.frameId, active?.frameId);
  assert.equal(envelope.checkpoint.stage, "DYING");
  assert.equal(pending.causal?.interactionId, envelope.interactionId);
  assert.equal(pending.causal?.frameId, active?.frameId);
  assert.equal(active.current.resolvingPlayerId, pending.actorId);
}

function assertProjectionMatchesEngine(code, token) {
  return state(code, token).then(({ data: view }) => {
    const expected = projectPresentationV2({
      pending: authoritativePending(code),
      currentAction: view.currentAction,
      actionRevision: view.actionRevision,
      timeline: view.timeline,
      causalEnvelope: view.causalEnvelope,
      oathRecipientIds: oathRecipientIds(view.players.map((player) => ({ id: player.id, alive: player.alive, hp: player.hp, maxHp: player.maxHp }))),
    });
    assert.deepEqual(view.presentationV2, expected, "route presentationV2 is projected from the persisted engine state");
    const expectedSnapshot = composePresentationSnapshot({ presentationV2: view.presentationV2, currentAction: view.currentAction, actionRevision: view.actionRevision, viewerId: view.meId });
    assert.deepEqual(view.presentationSnapshot, expectedSnapshot, "route PresentationSnapshot is composed from the persisted engine projection");
    assert.deepEqual(view.presentationSnapshot.identity, expectedSnapshot.identity, "snapshot identity follows the atomic public authority gate");
    if (view.presentationV2.stableBoundary.kind === "CHOICE") {
      assert.ok(view.presentationSnapshot.identity, "a real CHOICE boundary exposes an active snapshot identity");
      assert.deepEqual(view.presentationSnapshot.stable, view.presentationV2.stableBoundary, "a real CHOICE boundary is preserved exactly");
    }
    assert.deepEqual(view.presentationSnapshot.settlement, view.presentationV2.negationSettlement, "typed Negation settlement is copied from the public engine projection");
    assert.deepEqual(view.presentationSnapshot.transitionEvents, [], "transition occurrences remain reserved");
    return view;
  });
}

function publicSnapshot(snapshot) {
  const publicPart = { ...snapshot };
  delete publicPart.localControl;
  return publicPart;
}

test("engine-backed Sowing Distrust exposes only its exact public Effect root across both target choices", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember, observerMember] = game.members;
  const hiddenCard = card("Peach", "fanjian-public-effect-hidden-card", "♦");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(source.id)}`);
  setHand(source.id, [hiddenCard], 3, 3);
  setHand(target.id, [], 4, 4);
  setTurn(game.code, source.seat);

  const started = await request("trigger", { code: game.code, token: sourceMember.token, providerId: "zhou_yu_fanjian", targetId: target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const suitView = await assertProjectionMatchesEngine(game.code, targetMember.token);
  const rootPending = authoritativePending(game.code);
  const effectAction = {
    semantics: "PROVEN", effectId: "zhou_yu_fanjian", rootEventId: rootPending.continuation.effectRoot.rootEventId,
    sourceId: source.id, targetId: target.id,
  };
  assert.deepEqual(suitView.presentationV2.skillEffectAction, effectAction);
  assert.deepEqual(suitView.presentationSnapshot.skillEffectAction, effectAction);
  assert.equal(suitView.currentAction.actorId, target.id);
  assert.equal(suitView.currentAction.triggerOptions[0].selection.choices.length, 4);
  assert.equal(suitView.timeline.find((event) => event.id === effectAction.rootEventId)?.publicSkillEffect?.effectId, "zhou_yu_fanjian");
  assert.equal(JSON.stringify(effectAction).includes(hiddenCard.id), false, "the public effect node carries no source Hand identity");

  const observerView = (await state(game.code, observerMember.token)).data;
  assert.deepEqual(observerView.presentationV2.skillEffectAction, effectAction);
  assert.deepEqual(publicSnapshot(observerView.presentationSnapshot), publicSnapshot(suitView.presentationSnapshot));
  assert.deepEqual(observerView.currentAction.triggerOptions, [], "private suit controls remain restricted to the decision viewer");
  const observerClient = buildPresentationClientView(observerView.presentationSnapshot, observerView.meId);
  assert.equal(observerClient.hasInteraction, false, "the skill proof does not fabricate a causal scene");
  assert.deepEqual(observerClient.skillEffectAction, effectAction, "the standalone public Effect proof survives the REST fallback");

  const input = { pending: rootPending, currentAction: suitView.currentAction, actionRevision: suitView.actionRevision, timeline: suitView.timeline, causalEnvelope: null };
  assert.equal(projectPresentationV2({ ...input, pending: { ...rootPending, continuation: { ...rootPending.continuation, effectRoot: { ...rootPending.continuation.effectRoot, rootEventId: "missing" } } } }).skillEffectAction, null);
  assert.equal(projectPresentationV2({ ...input, pending: { ...rootPending, continuation: { ...rootPending.continuation, targetId: source.id } } }).skillEffectAction, null);
  assert.equal(projectPresentationV2({ ...input, currentAction: { ...suitView.currentAction, actorId: source.id } }).skillEffectAction, null);
  assert.equal(projectPresentationV2({ ...input, timeline: [...suitView.timeline, suitView.timeline.find((event) => event.id === effectAction.rootEventId)] }).skillEffectAction, null);

  const choseSuit = await request("trigger", { code: game.code, token: targetMember.token, providerId: "zhou_yu_fanjian_choice", choice: "♥" });
  assert.equal(choseSuit.status, 200, JSON.stringify(choseSuit.data));
  const cardView = await assertProjectionMatchesEngine(game.code, targetMember.token);
  assert.deepEqual(cardView.presentationSnapshot.skillEffectAction, effectAction, "the root Effect persists while the hidden-card decision is active");
  assert.deepEqual(cardView.currentAction.triggerOptions[0].selection.eligibleKeys, ["hand:0"]);
  assert.equal(JSON.stringify(cardView.presentationSnapshot.skillEffectAction).includes(hiddenCard.id), false);

  const choseHiddenCard = await request("trigger", { code: game.code, token: targetMember.token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] });
  assert.equal(choseHiddenCard.status, 200, JSON.stringify(choseHiddenCard.data));
  const settledView = await assertProjectionMatchesEngine(game.code, targetMember.token);
  const settlement = settledView.presentationV2.skillEffectSettlements;
  assert.equal(settlement.length, 1);
  assert.deepEqual(settlement[0], {
    semantics: "PROVEN", effectId: "zhou_yu_fanjian", rootEventId: effectAction.rootEventId,
    sourceId: source.id, targetId: target.id, outcome: "SUITS_DIFFERED",
    eventId: settledView.timeline.find((event) => event.publicSkillEffectSettlement)?.id,
  });
  assert.deepEqual(settledView.presentationSnapshot.skillEffectSettlements, settlement);
  assert.equal(settledView.players.find((player) => player.id === target.id).hp, 3, "the public settlement proof follows the actual damage transition");
  const settlementEvent = settledView.timeline.find((event) => event.id === settlement[0].eventId);
  assert.equal(settlementEvent.importance, "essential");
  assert.equal(settlementEvent.finalResult, true);
  assert.equal(settlementEvent.publicSkillEffectSettlement.rootEventId, effectAction.rootEventId);
  assert.equal(settledView.timeline.some((event) => event.type === "card" && event.card.id === hiddenCard.id), true, "the card identity becomes public only through the game's reveal event");
  assert.equal(JSON.stringify(settlement).includes(hiddenCard.id), false, "the semantic settlement proof contains no physical-card identity");

  const settledObserver = (await state(game.code, observerMember.token)).data;
  assert.deepEqual(settledObserver.presentationSnapshot.skillEffectSettlements, settlement);
  assert.deepEqual(publicSnapshot(settledObserver.presentationSnapshot), publicSnapshot(settledView.presentationSnapshot));
  assert.deepEqual(buildPresentationClientView(settledView.presentationSnapshot, target.id).skillEffectSettlements, settlement);
  assert.deepEqual(buildPresentationClientView(null, observerMember.id).skillEffectSettlements, []);

  const settledInput = { pending: null, currentAction: settledView.currentAction, actionRevision: settledView.actionRevision, timeline: settledView.timeline, causalEnvelope: settledView.causalEnvelope };
  assert.deepEqual(projectPresentationV2({ ...settledInput, timeline: [...settledView.timeline, settlementEvent] }).skillEffectSettlements, [], "duplicate public settlement events fail closed");
  assert.deepEqual(projectPresentationV2({ ...settledInput, timeline: settledView.timeline.filter((event) => event.id !== effectAction.rootEventId) }).skillEffectSettlements, [], "a missing exact root event fails closed");
  assert.deepEqual(projectPresentationV2({ ...settledInput, pending: rootPending }).skillEffectSettlements, [], "settlement cannot be projected while the same Sowing Distrust choice is still active");
});

test("engine-backed Sowing Distrust publishes the matched-suit settlement without damage", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember] = game.members;
  const hiddenCard = card("Peach", "fanjian-matched-settlement-hidden-card", "♥");
  sql(`UPDATE players SET hero='zhou-yu' WHERE id=${quote(source.id)}`);
  setHand(source.id, [hiddenCard], 3, 3);
  setHand(target.id, [], 4, 4);
  setTurn(game.code, source.seat);

  const started = await request("trigger", { code: game.code, token: sourceMember.token, providerId: "zhou_yu_fanjian", targetId: target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const rootEventId = authoritativePending(game.code).continuation.effectRoot.rootEventId;
  const choseSuit = await request("trigger", { code: game.code, token: targetMember.token, providerId: "zhou_yu_fanjian_choice", choice: "♥" });
  assert.equal(choseSuit.status, 200, JSON.stringify(choseSuit.data));
  const choseHiddenCard = await request("trigger", { code: game.code, token: targetMember.token, providerId: "zhou_yu_fanjian_choice", cardKeys: ["hand:0"] });
  assert.equal(choseHiddenCard.status, 200, JSON.stringify(choseHiddenCard.data));

  const settledView = await assertProjectionMatchesEngine(game.code, targetMember.token);
  expectSettlement(settledView, source.id, target.id, hiddenCard.id, "SUITS_MATCHED");
  assert.equal(settledView.presentationV2.skillEffectSettlements[0].rootEventId, rootEventId);
  assert.deepEqual(settledView.presentationSnapshot.skillEffectSettlements, settledView.presentationV2.skillEffectSettlements);
  assert.equal(settledView.players.find((player) => player.id === target.id).hp, 4, "matching suits do not deal damage");
});

function expectSettlement(view, sourceId, targetId, hiddenCardId, outcome) {
  const settlements = view.presentationV2.skillEffectSettlements;
  assert.equal(settlements.length, 1);
  const settlement = settlements[0];
  assert.equal(settlement.outcome, outcome);
  assert.equal(settlement.sourceId, sourceId);
  assert.equal(settlement.targetId, targetId);
  assert.equal(JSON.stringify(settlement).includes(hiddenCardId), false);
  const event = view.timeline.find((candidate) => candidate.id === settlement.eventId);
  assert.equal(event?.publicSkillEffectSettlement?.outcome, outcome);
  assert.equal(event?.importance, "essential");
  assert.equal(event?.finalResult, true);
}

test("engine-backed Attack/Dodge exposes authoritative decision and legacy resolution reference", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember] = game.members;
  const attack = card("Attack", "engine-projector-attack");
  const dodge = card("Dodge", "engine-projector-dodge");
  setHand(source.id, [attack], 4, 4); setHand(target.id, [dodge], 4, 4); setTurn(game.code, source.seat);
  const log = JSON.parse(query(`SELECT log_json FROM rooms WHERE code=${quote(game.code)}`));
  log.push(`@card:${JSON.stringify({ id: "private-attack-draw", player: source.name, target: source.name, card: attack, action: "draw", presentation: false, privateToPlayerId: source.id, drawPlayerId: source.id })}`);
  sql(`UPDATE rooms SET log_json=${quote(JSON.stringify(log))} WHERE code=${quote(game.code)}`);
  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const targetView = await assertProjectionMatchesEngine(game.code, targetMember.token);
  const pending = authoritativePending(game.code);
  assert.equal(pending.kind, "response");
  assert.equal(pending.continuation.kind, "attack");
  assert.equal(targetView.currentAction.kind, "response");
  assert.equal(targetView.currentAction.actorId, target.id);
  assert.equal(targetView.currentAction.reason.length > 0, true);
  assert.equal(targetView.currentAction.presentation.readyAfterEventId !== undefined, true);
  assert.equal(targetView.currentAction.deadline, 0, "response timer is not armed before the existing client-ready action");
  assert.equal(targetView.presentationV2.decision.actionRevision, targetView.actionRevision);
  assert.equal(targetView.presentationV2.decision.resolutionId, targetView.currentAction.presentation.resolutionId);
  const attackScene = targetView.presentationV2.interactionScene;
  const attackEnvelope = targetView.causalEnvelope;
  assert.ok(attackEnvelope);
  assert.equal(attackScene?.semantics, "PROVEN");
  assert.equal(attackScene?.stage, "ATTACK_RESPONSE");
  assert.equal(attackScene?.interactionId, attackEnvelope.interactionId);
  assert.equal(attackScene?.rootFrameId, attackEnvelope.frames[0].frameId);
  assert.equal(attackScene?.activeFrameId, attackEnvelope.activeFrameId);
  assert.equal(attackScene?.continuity.relation, "ROOT_FRAME");
  assert.equal(attackScene?.parentFrameId, null);
  assert.equal(attackScene?.sourceId, source.id);
  assert.deepEqual(attackScene?.targetIds, [target.id]);
  assert.equal(attackScene?.currentParticipantId, target.id);
  assert.equal(attackScene?.activeResolverId, target.id);
  assert.equal(attackScene?.decisionActorId, target.id);
  assert.deepEqual(attackScene?.participantRoles, { sourceId: source.id, originalTargetIds: [target.id], activeTargetIds: [target.id], currentParticipantId: target.id, decisionActorId: target.id, activeResolverId: target.id, parentParticipantId: null, participantIds: [] });
  const attackRootAction = {
    semantics: "PROVEN",
    interactionId: attackEnvelope.interactionId,
    rootFrameId: attackScene.rootFrameId,
    activeFrameId: attackScene.activeFrameId,
    checkpointId: attackScene.checkpointId,
    presentationRevision: attackScene.presentationRevision,
    rootEventId: targetView.currentAction.presentation.readyAfterEventId,
    action: "ATTACK",
    sourceId: source.id,
    targetId: target.id,
    cardKind: "Attack",
    physicalCardKind: "Attack",
  };
  assert.deepEqual(targetView.presentationV2.rootAction, attackRootAction, "the public root card is bound to the active frame and exact played-card event");
  assert.deepEqual(targetView.presentationSnapshot.rootAction, attackRootAction, "the accepted public snapshot carries the typed root action");
  assert.equal(JSON.stringify(targetView.presentationSnapshot.rootAction).includes(attack.id), false, "physical card IDs are not copied into the public root-action contract");
  assert.deepEqual(targetView.presentationV2.attackDodgeResponses ?? [], [], "an open Dodge decision has no submitted-response node");
  assert.deepEqual(targetView.presentationSnapshot.attackDodgeResponses ?? [], [], "an open Dodge decision publishes no counter proof");
  const rootEvent = targetView.timeline.find((event) => event.id === attackRootAction.rootEventId);
  assert.ok(rootEvent && rootEvent.card?.id === attack.id, "the root event identity points to the exact played physical Attack");
  const rootActionInput = { pending, currentAction: targetView.currentAction, actionRevision: targetView.actionRevision, timeline: targetView.timeline, causalEnvelope: attackEnvelope };
  const missingCardProof = projectPresentationV2({
    ...rootActionInput,
    pending: { ...pending, continuation: { ...pending.continuation, sequenceStartCardId: "unlinked-card" } },
  });
  assert.equal(missingCardProof.rootAction, null, "an unlinked physical card position fails closed");
  const mismatchedTargetProof = projectPresentationV2({
    ...rootActionInput,
    pending: { ...pending, continuation: { ...pending.continuation, targetId: source.id } },
  });
  assert.equal(mismatchedTargetProof.rootAction, null, "pending and causal target disagreement fails closed");
  const missingEnvelopeProof = projectPresentationV2({ ...rootActionInput, causalEnvelope: null });
  assert.equal(missingEnvelopeProof.rootAction, null, "a missing public causal envelope fails closed");
  const mismatchedSnapshot = composePresentationSnapshot({
    presentationV2: { ...targetView.presentationV2, rootAction: { ...attackRootAction, targetId: source.id } },
    currentAction: targetView.currentAction,
    actionRevision: targetView.actionRevision,
    viewerId: target.id,
  });
  assert.equal(mismatchedSnapshot.rootAction, null, "snapshot composition rejects a root action whose target differs from its proven scene");
  assert.deepEqual(targetView.presentationV2.stableBoundary, { kind: "CHOICE", interactionId: attackScene?.interactionId, checkpointId: attackScene?.checkpointId, presentationRevision: attackScene?.presentationRevision, decisionActorId: target.id });
  const otherView = (await state(game.code, game.members[2].token)).data;
  assert.deepEqual(otherView.presentationV2.rootContext, targetView.presentationV2.rootContext);
  assert.deepEqual(otherView.presentationV2.activeContext, targetView.presentationV2.activeContext);
  assert.equal(otherView.currentAction.options, undefined, "private response options remain viewer-private");
  assert.deepEqual(otherView.presentationV2.interactionScene, attackScene);
  assert.deepEqual(otherView.presentationV2.stableBoundary, targetView.presentationV2.stableBoundary);
  assert.deepEqual(publicSnapshot(otherView.presentationSnapshot), publicSnapshot(targetView.presentationSnapshot), "Attack public snapshot is viewer-equal");
  assert.deepEqual(otherView.presentationSnapshot.rootAction, attackRootAction, "the public root action is identical for every room viewer");
  assert.equal(targetView.presentationSnapshot.localControl.entitled, true);
  assert.equal(otherView.presentationSnapshot.localControl.entitled, false);
  const targetRepeat = await state(game.code, targetMember.token);
  assert.deepEqual(targetRepeat.data.presentationV2.interactionScene, attackScene);
  assert.deepEqual(targetRepeat.data.presentationV2.interactionScene?.participantRoles, attackScene?.participantRoles);
  assert.deepEqual(targetRepeat.data.presentationV2.stableBoundary, targetView.presentationV2.stableBoundary);
  assert.equal(targetRepeat.data.causalEnvelope.checkpoint.checkpointId, attackEnvelope.checkpoint.checkpointId);
  assert.equal(targetRepeat.data.causalEnvelope.presentationRevision, attackEnvelope.presentationRevision);
  assert.equal(query(`SELECT phase FROM rooms WHERE code=${quote(game.code)}`), "response", "read-only viewer projections preserve the active response boundary");
  const responded = await request("respond", { code: game.code, token: targetMember.token, providerId: "card", cardId: dodge.id, uxTraceId: "test-attack-dodge-proof" });
  assert.equal(responded.status, 200, JSON.stringify(responded.data));
  assert.equal(responded.data.attackDodgeUxTrace?.proofBuilder?.result, "PROVEN", JSON.stringify(responded.data.attackDodgeUxTrace));
  assert.equal(responded.data.attackDodgeUxTrace?.proofBuilder?.checks?.matchingRootEventCount, 1, JSON.stringify(responded.data.attackDodgeUxTrace));
  const sourceSettled = await assertProjectionMatchesEngine(game.code, sourceMember.token);
  const targetSettled = await assertProjectionMatchesEngine(game.code, targetMember.token);
  const observerSettled = await assertProjectionMatchesEngine(game.code, game.members[2].token);
  const dodgeEvent = sourceSettled.timeline.find((event) => event.type === "card" && event.card?.id === dodge.id);
  assert.ok(dodgeEvent, "the production response route persists the submitted physical Dodge event");
  const dodgeProof = {
    semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
    interactionId: attackScene.interactionId,
    rootFrameId: attackScene.rootFrameId,
    rootEventId: rootEvent.id,
    rootResolutionId: rootEvent.resolutionId,
    rootSourceId: source.id,
    targetId: target.id,
    responseActorId: target.id,
    rootCardKind: "Attack",
    responseCardKind: "Dodge",
    responseEventId: dodgeEvent.id,
    responseResolutionId: dodgeEvent.resolutionId,
  };
  assert.equal(dodgeEvent.resolutionId, rootEvent.resolutionId, "the actual Dodge and root Attack belong to one exact resolution");
  assert.equal(sourceSettled.timeline.some((event) => event.id === "private-attack-draw"), true, "the source's private draw history remains in the source-only timeline");
  assert.equal(targetSettled.timeline.some((event) => event.id === "private-attack-draw"), false, "the private draw history remains hidden from other viewers");
  assert.deepEqual(sourceSettled.presentationV2.attackDodgeResponses, [dodgeProof]);
  assert.deepEqual(targetSettled.presentationV2.attackDodgeResponses, [dodgeProof], "private source draw history does not change public proof projection");
  assert.deepEqual(observerSettled.presentationV2.attackDodgeResponses, [dodgeProof], "observers receive the same public proof projection");
  assert.deepEqual(sourceSettled.presentationSnapshot.attackDodgeResponses, [dodgeProof]);
  assert.deepEqual(targetSettled.presentationSnapshot.attackDodgeResponses, [dodgeProof], "target receives identical public counter proof");
  assert.deepEqual(observerSettled.presentationSnapshot.attackDodgeResponses, [dodgeProof], "unrelated viewer receives identical public counter proof");
  assert.deepEqual(sourceSettled.presentationSnapshot.attackHitSettlements, [], "a blocked Attack never publishes a damage-hit settlement");
  assert.equal(JSON.stringify(dodgeProof).includes(attack.id), false, "typed proof does not copy the physical Attack ID");
  assert.equal(JSON.stringify(dodgeProof).includes(dodge.id), false, "typed proof does not copy the physical Dodge ID");
  const settled = sourceSettled;
  assert.deepEqual(settled.presentationV2.stableBoundary, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null });
});

test("engine-backed Longdan Dodge-as-Attack preserves semantic root and physical card proof", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember, observerMember] = game.members;
  sql(`UPDATE players SET hero='zhao-yun' WHERE id=${quote(source.id)}`);
  const longdanDodge = card("Dodge", "engine-longdan-root-dodge");
  const targetDodge = card("Dodge", "engine-longdan-response-dodge");
  setHand(source.id, [longdanDodge], 4, 4);
  setHand(target.id, [targetDodge], 4, 4);
  setTurn(game.code, source.seat);

  const sourceBefore = (await state(game.code, sourceMember.token)).data;
  assert.equal(sourceBefore.currentAction.actorId, source.id);
  assert.ok(sourceBefore.currentAction.playPhaseActions.some((action) => action.cardId === longdanDodge.id && action.canPlayAs === "attack"),
    "the server-owned play-phase projection offers this physical Dodge as an Attack");
  const submitted = await request("play_card", {
    code: game.code, token: sourceMember.token, cardId: longdanDodge.id, playAs: "attack", targetId: target.id,
  });
  assert.equal(submitted.status, 200, JSON.stringify(submitted.data));

  const targetView = await assertProjectionMatchesEngine(game.code, targetMember.token);
  const pending = authoritativePending(game.code);
  assert.equal(pending.kind, "response");
  assert.equal(targetView.currentAction.kind, "response");
  assert.equal(targetView.currentAction.actorId, target.id);
  assert.equal(targetView.currentAction.requirement, "dodge");
  assert.ok(targetView.currentAction.legalActions.includes("respond"), `the defender's actual Dodge option remains available: ${JSON.stringify(targetView.currentAction)}`);
  const rootEventId = targetView.currentAction.presentation.readyAfterEventId;
  const rootEvent = targetView.timeline.find((event) => event.id === rootEventId);
  assert.ok(rootEvent);
  assert.equal(rootEvent.action, "play");
  assert.equal(rootEvent.card.id, longdanDodge.id);
  assert.equal(rootEvent.card.kind, "Dodge");
  assert.equal(rootEvent.playedAs, "attack");
  const rootAction = {
    semantics: "PROVEN",
    interactionId: targetView.causalEnvelope.interactionId,
    rootFrameId: targetView.presentationV2.interactionScene.rootFrameId,
    activeFrameId: targetView.presentationV2.interactionScene.activeFrameId,
    checkpointId: targetView.presentationV2.interactionScene.checkpointId,
    presentationRevision: targetView.presentationV2.interactionScene.presentationRevision,
    rootEventId,
    action: "ATTACK",
    sourceId: source.id,
    targetId: target.id,
    cardKind: "Attack",
    physicalCardKind: "Dodge",
    playedAs: "attack",
  };
  assert.deepEqual(targetView.presentationV2.rootAction, rootAction,
    "the engine projection records semantic Attack separately from the physical Dodge");
  assert.deepEqual(targetView.presentationSnapshot.rootAction, rootAction,
    "the atomic snapshot preserves the exact converted-card pairing");
  assert.equal(JSON.stringify(rootAction).includes(longdanDodge.id), false,
    "the proof links through public event identity without copying a physical card ID");

  const input = {
    pending, currentAction: targetView.currentAction, actionRevision: targetView.actionRevision,
    timeline: targetView.timeline, causalEnvelope: targetView.causalEnvelope,
  };
  for (const playedAs of [undefined, "dodge"]) {
    const timeline = targetView.timeline.map((event) => event.id === rootEventId ? { ...event, playedAs } : event);
    assert.equal(projectPresentationV2({ ...input, timeline }).rootAction, null,
      `a Dodge root without the exact Attack conversion marker (${String(playedAs)}) fails closed`);
  }
  const malformedSnapshot = composePresentationSnapshot({
    presentationV2: { ...targetView.presentationV2, rootAction: { ...rootAction, playedAs: "dodge" } },
    currentAction: targetView.currentAction,
    actionRevision: targetView.actionRevision,
    viewerId: target.id,
  });
  assert.equal(malformedSnapshot.rootAction, null, "snapshot composition rejects a malformed physical/conversion pairing");
  const observerView = (await state(game.code, observerMember.token)).data;
  assert.deepEqual(publicSnapshot(observerView.presentationSnapshot), publicSnapshot(targetView.presentationSnapshot),
    "the converted public root proof is viewer-equal");
  assert.equal(observerView.currentAction.options, undefined, "the target's private response providers remain private");

  const responded = await request("respond", {
    code: game.code, token: targetMember.token, providerId: "card", cardId: targetDodge.id,
  });
  assert.equal(responded.status, 200, JSON.stringify(responded.data));
  const sourceSettled = await assertProjectionMatchesEngine(game.code, sourceMember.token);
  const targetSettled = await assertProjectionMatchesEngine(game.code, targetMember.token);
  const observerSettled = await assertProjectionMatchesEngine(game.code, observerMember.token);
  const responseEvent = sourceSettled.timeline.find((event) => event.type === "card" && event.card?.id === targetDodge.id);
  assert.ok(responseEvent, "the production response persists the defender's physical Dodge event");
  assert.deepEqual(responseEvent.attackDodgeResponse, {
    semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
    interactionId: rootAction.interactionId, rootFrameId: rootAction.rootFrameId,
    rootEventId: rootEvent.id, rootResolutionId: rootEvent.resolutionId,
    rootSourceId: source.id, targetId: target.id, responseActorId: target.id,
    rootCardKind: "Attack", responseCardKind: "Dodge",
  }, "server attaches a typed semantic Attack/Dodge link without physical card identities");
  assert.equal(responseEvent.resolutionId, rootEvent.resolutionId, "the converted root and Dodge share one resolution");
  const convertedDodgeResponseProof = sourceSettled.presentationV2.attackDodgeResponses[0];
  assert.equal(sourceSettled.presentationV2.attackDodgeResponses.length, 1);
  assert.deepEqual(sourceSettled.presentationSnapshot.attackDodgeResponses, [convertedDodgeResponseProof]);
  assert.deepEqual(targetSettled.presentationSnapshot.attackDodgeResponses, [convertedDodgeResponseProof]);
  assert.deepEqual(observerSettled.presentationSnapshot.attackDodgeResponses, [convertedDodgeResponseProof]);
  assert.equal(JSON.stringify(convertedDodgeResponseProof).includes(longdanDodge.id), false);
  assert.equal(JSON.stringify(convertedDodgeResponseProof).includes(targetDodge.id), false);
  const missingConversionMarker = sourceSettled.timeline.map((event) => event.id === rootEvent.id
    ? { ...event, playedAs: undefined }
    : event);
  assert.deepEqual(projectPresentationV2({ pending: null, currentAction: null, actionRevision: "settled", timeline: missingConversionMarker }).attackDodgeResponses ?? [], [],
    "a converted root without its exact Attack marker cannot prove the public Dodge relation");
});

test("engine-backed Guan Yu Peach-as-Attack preserves its physical root through a real Dodge", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember, observerMember] = game.members;
  sql(`UPDATE players SET hero='guan-yu' WHERE id=${quote(source.id)}`);
  const redPeach = { ...card("Peach", "engine-wusheng-root-peach"), suit: "♥", rank: "6" };
  const blackPeach = { ...card("Peach", "engine-wusheng-root-black-peach"), suit: "♠", rank: "7" };
  const targetDodge = card("Dodge", "engine-wusheng-root-response-dodge");
  setHand(source.id, [redPeach, blackPeach], 4, 4);
  setHand(target.id, [targetDodge], 4, 4);
  setTurn(game.code, source.seat);

  const sourceBefore = (await state(game.code, sourceMember.token)).data;
  assert.deepEqual(sourceBefore.currentAction.playPhaseActions, [{ cardId: redPeach.id, canPlayAs: "attack" }],
    "CurrentAction privately authorizes the red Peach, but not the black Peach, as Attack");
  assert.equal((await state(game.code, targetMember.token)).data.currentAction.playPhaseActions, undefined,
    "the target cannot inspect Guan Yu's private convertible-card list");
  assert.equal((await state(game.code, observerMember.token)).data.currentAction.playPhaseActions, undefined,
    "an observer cannot inspect Guan Yu's private convertible-card list");
  const rejectedBlack = await request("play_card", {
    code: game.code, token: sourceMember.token, cardId: blackPeach.id, playAs: "attack", targetId: target.id,
  });
  assert.equal(rejectedBlack.status, 409, "the server rejects a black card even if the client forges the Attack intent");
  const submitted = await request("play_card", {
    code: game.code, token: sourceMember.token, cardId: redPeach.id, playAs: "attack", targetId: target.id,
  });
  assert.equal(submitted.status, 200, JSON.stringify(submitted.data));

  const targetView = await assertProjectionMatchesEngine(game.code, targetMember.token);
  const pending = authoritativePending(game.code);
  assert.equal(pending.kind, "response");
  assert.equal(targetView.currentAction.kind, "response");
  assert.equal(targetView.currentAction.actorId, target.id);
  assert.equal(targetView.currentAction.requirement, "dodge");
  const rootEventId = targetView.currentAction.presentation.readyAfterEventId;
  const rootEvent = targetView.timeline.find((event) => event.id === rootEventId);
  assert.ok(rootEvent);
  assert.equal(rootEvent.action, "play");
  assert.deepEqual(rootEvent.card, redPeach, "the public event retains the actual physical card, suit, and rank");
  assert.equal(rootEvent.playedAs, "attack");
  const scene = targetView.presentationV2.interactionScene;
  const rootAction = {
    semantics: "PROVEN",
    interactionId: targetView.causalEnvelope.interactionId,
    rootFrameId: scene.rootFrameId,
    activeFrameId: scene.activeFrameId,
    checkpointId: scene.checkpointId,
    presentationRevision: scene.presentationRevision,
    rootEventId,
    action: "ATTACK",
    sourceId: source.id,
    targetId: target.id,
    cardKind: "Attack",
    physicalCardKind: "Peach",
    playedAs: "attack",
  };
  assert.deepEqual(targetView.presentationV2.rootAction, rootAction,
    "the engine projection preserves semantic Attack and physical Peach separately");
  assert.deepEqual(targetView.presentationSnapshot.rootAction, rootAction,
    "the atomic public snapshot preserves the converted-card proof");
  assert.equal(JSON.stringify(rootAction).includes(redPeach.id), false,
    "the root proof links through the exact public event without copying the physical card ID");

  const input = {
    pending, currentAction: targetView.currentAction, actionRevision: targetView.actionRevision,
    timeline: targetView.timeline, causalEnvelope: targetView.causalEnvelope,
  };
  for (const playedAs of [undefined, "dodge"]) {
    const timeline = targetView.timeline.map((event) => event.id === rootEventId ? { ...event, playedAs } : event);
    assert.equal(projectPresentationV2({ ...input, timeline }).rootAction, null,
      `a physical Peach without the exact Attack conversion marker (${String(playedAs)}) fails closed`);
  }
  for (const physicalProof of [
    { ...rootAction, playedAs: undefined },
    { ...rootAction, physicalCardKind: "Attack" },
    { ...rootAction, physicalCardKind: "unknown-card" },
  ]) {
    const malformedSnapshot = composePresentationSnapshot({
      presentationV2: { ...targetView.presentationV2, rootAction: physicalProof },
      currentAction: targetView.currentAction,
      actionRevision: targetView.actionRevision,
      viewerId: target.id,
    });
    assert.equal(malformedSnapshot.rootAction, null, "snapshot composition rejects an invalid converted physical-card proof");
  }
  const observerView = (await assertProjectionMatchesEngine(game.code, observerMember.token));
  assert.deepEqual(publicSnapshot(observerView.presentationSnapshot), publicSnapshot(targetView.presentationSnapshot),
    "the converted public Attack root is viewer-equal");
  assert.equal(observerView.currentAction.options, undefined, "the target's private Dodge providers remain private");

  const responded = await request("respond", {
    code: game.code, token: targetMember.token, providerId: "card", cardId: targetDodge.id,
  });
  assert.equal(responded.status, 200, JSON.stringify(responded.data));
  const sourceSettled = await assertProjectionMatchesEngine(game.code, sourceMember.token);
  const targetSettled = await assertProjectionMatchesEngine(game.code, targetMember.token);
  const observerSettled = await assertProjectionMatchesEngine(game.code, observerMember.token);
  const responseEvent = sourceSettled.timeline.find((event) => event.type === "card" && event.card?.id === targetDodge.id);
  assert.ok(responseEvent, "the production response persists the defender's physical Dodge event");
  assert.deepEqual(responseEvent.attackDodgeResponse, {
    semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
    interactionId: rootAction.interactionId, rootFrameId: rootAction.rootFrameId,
    rootEventId: rootEvent.id, rootResolutionId: rootEvent.resolutionId,
    rootSourceId: source.id, targetId: target.id, responseActorId: target.id,
    rootCardKind: "Attack", responseCardKind: "Dodge",
  }, "the server links the real Dodge to the converted Peach Attack without card identities");
  assert.equal(responseEvent.resolutionId, rootEvent.resolutionId);
  const peachDodgeProof = sourceSettled.presentationV2.attackDodgeResponses[0];
  assert.equal(sourceSettled.presentationV2.attackDodgeResponses.length, 1);
  assert.deepEqual(sourceSettled.presentationSnapshot.attackDodgeResponses, [peachDodgeProof]);
  assert.deepEqual(targetSettled.presentationSnapshot.attackDodgeResponses, [peachDodgeProof]);
  assert.deepEqual(observerSettled.presentationSnapshot.attackDodgeResponses, [peachDodgeProof]);
  assert.equal(JSON.stringify(peachDodgeProof).includes(redPeach.id), false);
  assert.equal(JSON.stringify(peachDodgeProof).includes(targetDodge.id), false);
  for (const view of [sourceSettled, targetSettled, observerSettled]) {
    assert.deepEqual(view.timeline.find((event) => event.id === rootEvent.id)?.card, redPeach,
      "all public views retain the physical Peach event as the semantic Attack root");
    assert.equal(view.timeline.find((event) => event.id === rootEvent.id)?.playedAs, "attack");
  }
});

test("engine-backed direct Attack decline publishes only the exact applied-damage settlement", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember, observerMember] = game.members;
  const attack = card("Attack", "engine-projector-hit-settlement");
  setHand(source.id, [attack], 4, 4);
  setHand(target.id, [], 4, 4);
  setTurn(game.code, source.seat);

  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const before = await assertProjectionMatchesEngine(game.code, targetMember.token);
  const root = before.presentationSnapshot.rootAction;
  assert.equal(root?.action, "ATTACK");
  assert.deepEqual(before.presentationSnapshot.attackHitSettlements, [], "an open response is not yet a damage result");

  const declined = await requestAndSettle("decline_response", { code: game.code, token: targetMember.token, preserveResponse: true });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const settled = await assertProjectionMatchesEngine(game.code, targetMember.token);
  const observer = await assertProjectionMatchesEngine(game.code, observerMember.token);
  assert.equal(settled.players.find((player) => player.id === target.id)?.hp, 3, "the server applied one point of Attack damage");
  const event = settled.timeline.find((candidate) => candidate.publicAttackHitSettlement);
  const proof = {
    semantics: "PROVEN",
    eventId: event?.id,
    rootEventId: root.rootEventId,
    rootResolutionId: settled.timeline.find((candidate) => candidate.id === root.rootEventId)?.resolutionId,
    sourceId: source.id,
    targetId: target.id,
    outcome: "ATTACK_DAMAGE_APPLIED",
  };
  assert.deepEqual(settled.presentationV2.attackHitSettlements, [proof]);
  assert.deepEqual(settled.presentationSnapshot.attackHitSettlements, [proof]);
  assert.deepEqual(observer.presentationSnapshot.attackHitSettlements, [proof], "all viewers receive the same public semantic proof");
  assert.deepEqual(buildPresentationClientView(settled.presentationSnapshot, target.id).attackHitSettlements, [proof]);
  assert.equal(event?.type, "message");
  assert.equal(event?.importance, "essential");
  assert.equal(event?.finalResult, true);
  assert.equal(event?.resolutionId, proof.rootResolutionId);
  assert.equal(event?.publicAttackHitSettlement?.rootEventId, root.rootEventId);
  assert.equal(JSON.stringify(proof).includes(attack.id), false, "public result proof excludes physical card identity");

  const projectionInput = {
    pending: null,
    currentAction: settled.currentAction,
    actionRevision: settled.actionRevision,
    timeline: settled.timeline,
    causalEnvelope: settled.causalEnvelope,
  };
  assert.deepEqual(projectPresentationV2(projectionInput).attackHitSettlements, [proof]);
  assert.deepEqual(projectPresentationV2({ ...projectionInput, timeline: settled.timeline.filter((candidate) => candidate.id !== root.rootEventId) }).attackHitSettlements, [], "missing exact Attack root fails closed");
  assert.deepEqual(projectPresentationV2({ ...projectionInput, timeline: [...settled.timeline, event] }).attackHitSettlements, [], "duplicate settlement event ID fails closed");
  assert.deepEqual(projectPresentationV2({ ...projectionInput, timeline: settled.timeline.map((candidate) => candidate.id === event.id ? { ...candidate, resolutionId: "wrong-resolution" } : candidate) }).attackHitSettlements, [], "mismatched root resolution fails closed");
});

test("engine-backed ordinary wounded-player Peach publishes an exact viewer-equal self-target proof", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source] = game.room.players;
  const [sourceMember, observerMember] = game.members;
  const peach = card("Peach", "self-target-public-proof");
  setHand(source.id, [peach], 3, 4);
  setTurn(game.code, source.seat);

  const played = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: peach.id });
  assert.equal(played.status, 200, JSON.stringify(played.data));
  const actorView = await assertProjectionMatchesEngine(game.code, sourceMember.token);
  const observerView = await assertProjectionMatchesEngine(game.code, observerMember.token);
  const peachEvent = actorView.timeline.find((event) => event.type === "card" && event.card?.id === peach.id);
  assert.ok(peachEvent, "the normal Play Phase route persists the exact played Peach event");
  const proof = {
    semantics: "PROVEN", rootEventId: peachEvent.id, resolutionId: peachEvent.resolutionId,
    sourceId: source.id, targetId: source.id, cardKind: "Peach",
  };
  assert.deepEqual(actorView.presentationV2.selfTargetActions, [proof]);
  assert.deepEqual(actorView.presentationSnapshot.selfTargetActions, [proof]);
  assert.deepEqual(observerView.presentationSnapshot.selfTargetActions, [proof], "the public proof is identical for a non-acting viewer");
  assert.equal(JSON.stringify(proof).includes(peach.id), false, "the public identity contract does not copy the physical card ID");
  assert.equal(actorView.players.find((player) => player.id === source.id)?.hp, 4, "the ordinary Peach effect resolves normally");
});

test("engine-backed Borrowed Sword preserves forced Attack continuation and timer barrier", { timeout: 30_000 }, async () => {
  const scenario = await openBorrowedSwordScenario({ choose: false });
  const chosen = await request("choose_borrowed_sword_target", { code: scenario.game.code, token: scenario.host.token, targetId: scenario.target.id });
  assert.equal(chosen.status, 200, JSON.stringify(chosen.data));
  const view = await assertProjectionMatchesEngine(scenario.game.code, scenario.alice.token);
  const pending = authoritativePending(scenario.game.code);
  assert.equal(pending.kind, "response");
  assert.equal(pending.continuation.kind, "borrowed_sword_attack");
  assert.equal(pending.continuation.origin, "borrowed_sword");
  assert.equal(view.currentAction.actorId, scenario.holder.id);
  assert.ok(view.currentAction.options?.some((option) => option.providerId === "card"), "the forced-Attack actor receives private response controls");
  assert.equal(view.currentAction.deadline, 0);
  assert.equal(view.currentAction.presentation.readyAfterEventId, null, "Borrowed Sword currently has no explicit readyAfterEventId at the forced-Attack response boundary");
  assert.equal(view.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(view.presentationV2.interactionScene?.continuity.relation, "CHILD_FRAME");
  assert.ok(view.presentationV2.interactionScene?.parentFrameId, "the forced Attack is a child frame of Borrowed Sword");
  const borrowedSwordRoot = view.causalEnvelope.frames.find((frame) => frame.frameId === view.presentationV2.interactionScene?.rootFrameId);
  assert.ok(borrowedSwordRoot, "the root origin is backed by an envelope-owned frame");
  assert.deepEqual(view.presentationV2.interactionScene?.rootOrigin, {
    frameId: borrowedSwordRoot.frameId,
    stage: borrowedSwordRoot.stage,
    sourceId: scenario.source.id,
    effect: "Borrowed Sword",
    targetIds: [scenario.holder.id],
  });
  assert.deepEqual(view.presentationSnapshot.interaction?.rootOrigin, view.presentationV2.interactionScene?.rootOrigin);
  assert.equal(view.presentationV2.interactionScene?.participantRoles.sourceId, scenario.holder.id);
  assert.deepEqual(view.presentationV2.interactionScene?.participantRoles.originalTargetIds, [scenario.target.id]);
  assert.deepEqual(view.presentationV2.interactionScene?.participantRoles.activeTargetIds, [scenario.target.id]);
  assert.equal(view.presentationV2.interactionScene?.participantRoles.currentParticipantId, scenario.target.id);
  assert.equal(view.presentationV2.interactionScene?.participantRoles.decisionActorId, scenario.holder.id);
  assert.equal(view.presentationV2.interactionScene?.participantRoles.activeResolverId, scenario.holder.id);
  assert.equal(view.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(view.presentationV2.stableBoundary.decisionActorId, scenario.holder.id);
  const armed = await requestAndSettle("start_response_timer", { code: scenario.game.code, token: scenario.alice.token });
  assert.equal(armed.status, 200);
  const armedView = (await state(scenario.game.code, scenario.alice.token)).data;
  assert.ok(armedView.currentAction.deadline > 0);
  assert.equal(armedView.actionRevision, view.actionRevision, "arming the response timer does not invalidate the same local response selection");
  const reconnect = (await state(scenario.game.code, scenario.host.token)).data;
  assert.equal(reconnect.currentAction.deadline, armedView.currentAction.deadline);
  assert.deepEqual(reconnect.presentationV2.rootContext, armedView.presentationV2.rootContext);
  assert.deepEqual(reconnect.presentationV2.interactionScene, view.presentationV2.interactionScene);
  assert.deepEqual(reconnect.presentationV2.stableBoundary, view.presentationV2.stableBoundary);
  assert.deepEqual(publicSnapshot(reconnect.presentationSnapshot), publicSnapshot(view.presentationSnapshot), "Borrowed Sword reconnect preserves public snapshot");
  assert.equal(reconnect.currentAction.options, undefined);
  const forcedAttackEnvelope = view.causalEnvelope;
  const declined = await requestAndSettle("decline_response", { code: scenario.game.code, token: scenario.alice.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.causalEnvelope.interactionId, forcedAttackEnvelope.interactionId);
  assert.notEqual(declined.data.room.causalEnvelope.checkpoint.checkpointId, forcedAttackEnvelope.checkpoint.checkpointId, "Borrowed Sword decline advances the real semantic checkpoint");
  assert.equal(declined.data.room.causalEnvelope.presentationRevision, forcedAttackEnvelope.presentationRevision + 1, "Borrowed Sword decline advances presentationRevision once");
});

test("engine-backed single-target card metadata is not projected as Group", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember] = game.members;
  const attack = card("Attack", "engine-projector-cardkind");
  setHand(source.id, [attack], 4, 4); setHand(target.id, [], 4, 4); setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: attack.id, targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const view = await assertProjectionMatchesEngine(game.code, game.members[1].token);
  assert.equal(view.presentationV2.groupResolution, null);
  assert.equal(view.presentationV2.activeContext?.kind, "attack");
});

test("engine-backed Dying/rescue proves the separate timer arm and reconnect behavior", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, , bob] = game.members;
  const [hostPlayer, dyingPlayer, bobPlayer] = game.room.players;
  setEquipment(hostPlayer.id, { armor: card("NioShield", "projector-dying-armor"), defensiveHorse: card("NioShield", "projector-dying-horse") });
  setHand(hostPlayer.id, [card("Attack", "projector-dying-attack")], 4, 4);
  setHand(dyingPlayer.id, [], 1, 4);
  setHand(bobPlayer.id, [card("Peach", "projector-dying-peach")], 4, 4);
  setTurn(game.code, hostPlayer.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-projector-dying-attack", targetId: dyingPlayer.id });
  assert.equal(opened.status, 200);
  await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_a" });
  const dying = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b" });
  assert.equal(dying.data.room.phase, "dying");
  const view = await assertProjectionMatchesEngine(game.code, bob.token);
  const pending = authoritativePending(game.code);
  assert.equal(pending.kind, "dying");
  assert.equal(view.currentAction.kind, "dying");
  assert.equal(view.currentAction.actorId, bobPlayer.id);
  assert.equal(view.currentAction.deadline, 0, "rescue is not armed when the real Dying decision is first projected");
  assert.equal(view.currentAction.presentation, undefined, "Dying currently has no readyAfterEventId presentation field");
  assert.equal(view.presentationV2.decision.resolutionId, null);
  assert.equal(view.presentationV2.decision.readyAfterEventId, null);
  assert.ok(view.presentationV2.rootContext);
  assert.equal(view.presentationV2.activeContext?.kind, "dying");
  assert.equal(view.presentationV2.dyingBarrier?.semantics, "PROVEN");
  assert.equal(view.presentationV2.dyingBarrier?.stage, "DYING");
  assert.equal(view.presentationV2.dyingBarrier?.dyingPlayerId, dyingPlayer.id);
  assert.equal(view.presentationV2.dyingBarrier?.rescuerId, bobPlayer.id);
  assert.equal(view.presentationV2.dyingBarrier?.decisionActorId, bobPlayer.id);
  assert.equal(view.presentationV2.dyingBarrier?.state, "RESCUE_CHOICE");
  assert.equal(view.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(view.presentationV2.stableBoundary.decisionActorId, bobPlayer.id);
  assert.equal(view.presentationV2.interactionScene?.participantRoles.sourceId, hostPlayer.id);
  assert.deepEqual(view.presentationV2.interactionScene?.participantRoles.originalTargetIds, [dyingPlayer.id]);
  assert.deepEqual(view.presentationV2.interactionScene?.participantRoles.activeTargetIds, [dyingPlayer.id]);
  assert.equal(view.presentationV2.interactionScene?.participantRoles.currentParticipantId, dyingPlayer.id);
  assert.equal(view.presentationV2.interactionScene?.participantRoles.decisionActorId, bobPlayer.id);
  assert.equal(view.presentationV2.interactionScene?.participantRoles.activeResolverId, bobPlayer.id);
  const beforeReconnect = (await state(game.code, game.members[2].token)).data;
  assert.deepEqual(beforeReconnect.presentationV2.rootContext, view.presentationV2.rootContext);
  assert.deepEqual(beforeReconnect.presentationV2.dyingBarrier, view.presentationV2.dyingBarrier);
  assert.equal(beforeReconnect.currentAction.options?.some((option) => option.providerId === "card"), true, "the acting rescuer keeps private Peach options after reconnect");
  const uninvolvedDyingViewer = (await state(game.code, game.members[0].token)).data;
  assert.deepEqual(uninvolvedDyingViewer.presentationV2.dyingBarrier, view.presentationV2.dyingBarrier);
  assert.deepEqual(uninvolvedDyingViewer.presentationV2.interactionScene, view.presentationV2.interactionScene);
  assert.deepEqual(uninvolvedDyingViewer.presentationV2.stableBoundary, view.presentationV2.stableBoundary);
  assert.deepEqual(publicSnapshot(uninvolvedDyingViewer.presentationSnapshot), publicSnapshot(view.presentationSnapshot), "Dying public snapshot is viewer-equal");
  assert.equal(view.presentationSnapshot.localControl.entitled, true);
  assert.equal(uninvolvedDyingViewer.presentationSnapshot.localControl.entitled, false);
  assert.equal(uninvolvedDyingViewer.currentAction.options, undefined, "rescue options remain private to the acting viewer");
  assert.equal(beforeReconnect.currentAction.deadline, 0);
  const armed = await requestAndSettle("start_rescue_timer", { code: game.code, token: bob.token });
  assert.equal(armed.status, 200);
  const armedView = (await state(game.code, bob.token)).data;
  assert.ok(armedView.currentAction.deadline > Date.now());
  const reconnected = (await state(game.code, game.members[2].token)).data;
  assert.equal(reconnected.currentAction.deadline, armedView.currentAction.deadline, "rescue deadline survives reconnect");
  sql(`UPDATE rooms SET pending_json=json_set(pending_json, '$.deadline', ${Date.now() - 1}) WHERE code=${quote(game.code)}`);
  const timedOut = await request("advance_timers", { code: game.code, token: bob.token });
  assert.equal(timedOut.status, 200, JSON.stringify(timedOut.data));
  const afterTimeout = (await state(game.code, bob.token)).data;
  assert.ok(afterTimeout.phase !== "resolving" || afterTimeout.currentAction.kind !== "dying", "expired rescue does not leave the same expired decision active");
});

test("C4-01 Dying skips non-rescuers and advances one causal checkpoint between real rescuers", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, targetMember, bobMember, carolMember] = game.members;
  const [source, target, bob, carol] = game.room.players;
  setHand(source.id, [card("Attack", "c4-dying-attack")], 4, 4);
  setHand(target.id, [], 1, 4);
  setHand(bob.id, [card("Peach", "c4-dying-bob-peach")], 4, 4);
  setHand(carol.id, [card("Peach", "c4-dying-carol-peach")], 4, 4);
  setTurn(game.code, source.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: "attack-c4-dying-attack", targetId: target.id, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const declinedAttack = await requestAndSettle("decline_response", { code: game.code, token: targetMember.token, preserveResponse: true });
  assert.equal(declinedAttack.status, 200, JSON.stringify(declinedAttack.data));
  await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_a", preserveResponse: true });
  const dying = await requestAndSettle("trigger", { code: game.code, token: host.token, providerId: "test_damage_about_to_apply_b", preserveResponse: true });
  assert.equal(dying.data.room.phase, "dying", JSON.stringify(dying.data.room));
  assertStableDyingPersistence(game.code);
  const bobView = await waitForState(game.code, bobMember.token, (room) => room.phase === "dying" && room.currentAction.actorId === bob.id);
  const bobBarrier = bobView.presentationV2.dyingBarrier;
  assert.equal(bobBarrier?.semantics, "PROVEN");
  assert.equal(bobBarrier?.dyingPlayerId, target.id);
  assert.equal(bobBarrier?.decisionActorId, bob.id);
  assert.equal(bobView.presentationV2.interactionScene?.participantRoles.decisionActorId, bob.id);
  assert.equal(bobView.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(bobView.presentationV2.stableBoundary.decisionActorId, bob.id);
  assert.equal(bobView.currentAction.options?.some((option) => option.providerId === "card"), true);
  const uninvolved = await state(game.code, source ? host.token : targetMember.token);
  assert.deepEqual(uninvolved.data.presentationV2.dyingBarrier, bobBarrier);
  assert.equal(uninvolved.data.currentAction.options, undefined);
  const bobSkipped = await request("skip_rescue", { code: game.code, token: bobMember.token });
  assert.equal(bobSkipped.status, 200, JSON.stringify(bobSkipped.data));
  assertStableDyingPersistence(game.code);
  const carolView = await waitForState(game.code, carolMember.token, (room) => room.phase === "dying" && room.currentAction.actorId === carol.id);
  assert.equal(carolView.presentationV2.dyingBarrier?.semantics, "PROVEN");
  assert.equal(carolView.presentationV2.dyingBarrier?.dyingPlayerId, target.id);
  assert.equal(carolView.presentationV2.dyingBarrier?.decisionActorId, carol.id);
  assert.equal(carolView.presentationV2.interactionScene?.participantRoles.decisionActorId, carol.id);
  assert.equal(carolView.presentationV2.interactionScene?.participantRoles.activeResolverId, carol.id);
  assert.equal(carolView.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(carolView.presentationV2.stableBoundary.decisionActorId, carol.id);
  assert.equal(carolView.presentationV2.dyingBarrier?.interactionId, bobBarrier?.interactionId);
  assert.equal(carolView.presentationV2.dyingBarrier?.rootFrameId, bobBarrier?.rootFrameId);
  assert.equal(carolView.presentationV2.dyingBarrier?.activeFrameId, bobBarrier?.activeFrameId);
  assert.notEqual(carolView.presentationV2.dyingBarrier?.checkpointId, bobBarrier?.checkpointId, JSON.stringify({ bob: bobBarrier, carol: carolView.presentationV2.dyingBarrier, pending: authoritativePending(game.code) }));
  assert.ok((carolView.presentationV2.dyingBarrier?.presentationRevision ?? 0) > (bobBarrier?.presentationRevision ?? 0));
  const carolOtherViewer = await state(game.code, targetMember.token);
  assert.deepEqual(carolOtherViewer.data.presentationV2.dyingBarrier, carolView.presentationV2.dyingBarrier);
  assert.equal(carolOtherViewer.data.currentAction.options, undefined);
});

test("engine-backed Group damage trigger resumes the Group parent and next participant", { timeout: 30_000 }, async () => {
  const opened = await openGanglieGroup({ kind: "RainingArrows", suffix: "projector-group", judge: { ...card("Dodge", "projector-group-judge"), suit: "♠", rank: "7" } });
  const nestedView = await assertProjectionMatchesEngine(opened.code, opened.targetMember.token);
  const nestedPending = authoritativePending(opened.code);
  assert.equal(nestedPending.kind, "trigger");
  assert.equal(nestedPending.continuation.kind, "damage_suffered_event");
  assert.equal(nestedPending.continuation.resumeGroup?.continuation?.kind, "group");
  assert.equal(nestedView.presentationV2.activeContext?.kind, "damage_suffered_event");
  assert.equal(nestedView.presentationV2.parentContext?.kind, "group");
  assert.deepEqual(nestedView.presentationV2.parentContext?.targetIds, []);
  const nestedGroupFrame = nestedView.causalEnvelope.frames.find((frame) => frame.frameId === nestedView.presentationV2.groupResolution?.groupFrameId);
  assert.equal(nestedView.presentationV2.groupResolution?.semantics, "PROVEN");
  assert.equal(nestedView.presentationV2.groupResolution?.interactionId, nestedView.causalEnvelope.interactionId);
  assert.equal(nestedView.presentationV2.groupResolution?.activeFrameId, nestedView.causalEnvelope.activeFrameId);
  assert.equal(nestedView.presentationV2.groupResolution?.parentFrameId, nestedGroupFrame?.frameId);
  assert.equal(nestedView.presentationV2.groupResolution?.stage, "DAMAGE");
  assert.deepEqual(nestedView.presentationV2.groupResolution?.participantProgress, [
    { playerId: opened.target.id, order: 1, status: "PAUSED" },
    { playerId: opened.bob.id, order: 2, status: "PENDING" },
    { playerId: opened.carol.id, order: 3, status: "PENDING" },
  ]);
  assert.ok(nestedView.presentationV2.groupResolution?.participantProgress?.every(({ outcome }) => outcome === undefined), "passing an unlinked Negation window does not invent a participant outcome");
  assert.deepEqual(nestedGroupFrame?.origin.originalTargetIds, [opened.target.id, opened.bob.id, opened.carol.id]);
  assert.deepEqual(nestedGroupFrame?.current.currentTargetIds, [opened.target.id]);
  assert.equal(nestedView.presentationV2.groupResolution?.currentParticipantId, nestedPending.continuation.resumeGroup.actorId);
  assert.equal(nestedView.presentationV2.groupResolution?.activeResolverId, nestedView.causalEnvelope.frames.find((frame) => frame.frameId === nestedView.causalEnvelope.activeFrameId)?.current.resolvingPlayerId);
  assert.equal(nestedView.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(nestedView.presentationV2.interactionScene?.interactionId, nestedView.causalEnvelope.interactionId);
  assert.equal(nestedView.presentationV2.interactionScene?.rootFrameId, nestedGroupFrame?.frameId);
  assert.equal(nestedView.presentationV2.interactionScene?.continuity.relation, "CHILD_FRAME");
  assert.equal(nestedView.presentationV2.interactionScene?.currentParticipantId, nestedView.presentationV2.groupResolution?.currentParticipantId);
  assert.equal(nestedView.presentationV2.interactionScene?.decisionActorId, nestedView.presentationV2.groupResolution?.decisionActorId);
  assert.deepEqual(nestedView.presentationV2.interactionScene?.participantRoles, {
    sourceId: opened.source.id,
    originalTargetIds: [opened.target.id, opened.bob.id, opened.carol.id],
    activeTargetIds: [opened.target.id],
    currentParticipantId: opened.target.id,
    decisionActorId: nestedView.presentationV2.groupResolution?.decisionActorId,
    activeResolverId: nestedView.presentationV2.groupResolution?.activeResolverId,
    parentParticipantId: opened.target.id,
    participantIds: nestedPending.continuation.resumeGroup.continuation.remainingIds
  });
  assert.equal(nestedView.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(nestedView.presentationV2.stableBoundary.decisionActorId, nestedView.presentationV2.interactionScene?.decisionActorId);
  assert.deepEqual(nestedView.presentationV2.groupResolution?.targetIds, [opened.target.id, opened.bob.id, opened.carol.id]);
  const repeated = await state(opened.code, opened.targetMember.token);
  assert.deepEqual(repeated.data.presentationV2.interactionScene, nestedView.presentationV2.interactionScene);
  const otherViewer = await state(opened.code, opened.bobMember.token);
  assert.deepEqual(otherViewer.data.presentationV2.groupResolution, nestedView.presentationV2.groupResolution);
  assert.deepEqual(otherViewer.data.presentationV2.interactionScene, nestedView.presentationV2.interactionScene);
  assert.equal(otherViewer.data.currentAction.options, undefined, "viewer-private response options stay outside Group public semantics");
  const resumed = await requestAndSettle("decline_trigger", { code: opened.code, token: opened.targetMember.token, preserveResponse: true });
  assert.equal(resumed.status, 200, JSON.stringify(resumed.data));
  const next = await state(opened.code, opened.bobMember.token);
  assert.equal(next.data.currentAction.kind, "response");
  const nextPending = authoritativePending(opened.code);
  assert.equal(nextPending?.continuation?.kind, "group");
  assert.equal(next.data.presentationV2.activeContext?.kind, "group");
  assert.equal(next.data.presentationV2.groupResolution?.semantics, "PROVEN");
  assert.equal(next.data.presentationV2.groupResolution?.interactionId, next.data.causalEnvelope.interactionId);
  assert.equal(next.data.presentationV2.groupResolution?.groupFrameId, next.data.causalEnvelope.activeFrameId);
  assert.equal(next.data.presentationV2.interactionScene?.participantRoles.decisionActorId, opened.bob.id, "the resumed Group checkpoint now carries matching current-participant and Pending actor proof");
  assert.deepEqual(next.data.presentationV2.stableBoundary, {
    kind: "CHOICE",
    interactionId: next.data.causalEnvelope.interactionId,
    checkpointId: next.data.causalEnvelope.checkpoint.checkpointId,
    presentationRevision: next.data.causalEnvelope.presentationRevision,
    decisionActorId: opened.bob.id
  });
  assert.equal(next.data.presentationV2.interactionScene?.participantRoles.currentParticipantId, opened.bob.id);
  assert.equal(next.data.presentationV2.groupResolution?.activeFrameId, next.data.causalEnvelope.activeFrameId);
  assert.equal(next.data.presentationV2.groupResolution?.stage, "GROUP_RESOLUTION");
  assert.equal(next.data.presentationV2.groupResolution?.currentParticipantId, opened.bob.id);
  assert.deepEqual(next.data.presentationV2.groupResolution?.participantProgress, [
    { playerId: opened.target.id, order: 1, status: "RESOLVED", outcome: "DAMAGED" },
    { playerId: opened.bob.id, order: 2, status: "CURRENT" },
    { playerId: opened.carol.id, order: 3, status: "PENDING" },
  ]);
  assert.deepEqual(next.data.causalEnvelope.frames[0].origin.originalTargetIds, [opened.target.id, opened.bob.id, opened.carol.id]);
  assert.deepEqual(next.data.causalEnvelope.frames[0].current.currentTargetIds, [opened.bob.id]);
  assert.deepEqual(next.data.presentationV2.groupResolution?.participantIds, nextPending.continuation.remainingIds);
  assert.equal(next.data.presentationV2.groupResolution?.groupFrameId, next.data.causalEnvelope.activeFrameId);
  assert.equal(next.data.presentationV2.interactionScene?.continuity.relation, "ROOT_FRAME");
  assert.equal(next.data.presentationV2.interactionScene?.rootFrameId, nestedGroupFrame?.frameId);
  assert.equal(next.data.presentationV2.interactionScene?.checkpointId, next.data.causalEnvelope.checkpoint.checkpointId);
  assert.deepEqual(next.data.presentationV2.groupResolution?.targetIds, [opened.target.id, opened.bob.id, opened.carol.id]);
  const final = await requestAndSettle("decline_response", { code: opened.code, token: opened.bobMember.token, preserveResponse: true });
  assert.equal(final.status, 200, JSON.stringify(final.data));
  const finalView = await state(opened.code, opened.carolMember.token);
  assert.equal(finalView.data.currentAction.actorId, opened.carol.id);
  assert.equal(finalView.data.presentationV2.groupResolution?.currentParticipantId, opened.carol.id);
  assert.deepEqual(finalView.data.presentationV2.groupResolution?.participantProgress, [
    { playerId: opened.target.id, order: 1, status: "RESOLVED", outcome: "DAMAGED" },
    { playerId: opened.bob.id, order: 2, status: "RESOLVED", outcome: "DAMAGED" },
    { playerId: opened.carol.id, order: 3, status: "CURRENT" },
  ]);
  assert.deepEqual(finalView.data.presentationV2.groupResolution?.targetIds, [opened.target.id, opened.bob.id, opened.carol.id]);
  assert.equal(finalView.data.presentationV2.groupResolution?.interactionId, next.data.presentationV2.groupResolution?.interactionId);
  assert.equal(finalView.data.presentationV2.groupResolution?.groupFrameId, next.data.presentationV2.groupResolution?.groupFrameId);
  assert.equal(finalView.data.presentationV2.interactionScene?.interactionId, next.data.presentationV2.interactionScene?.interactionId);
  assert.equal(finalView.data.presentationV2.interactionScene?.rootFrameId, next.data.presentationV2.interactionScene?.rootFrameId);
});

test("Group progress marks a no-longer-living ordered target without inferring from the remaining list", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, firstMember, , finalMember] = game.members;
  const [source, first, skipped, final] = game.room.players;
  const group = card("RainingArrows", "group-progress-skipped");
  const dodge = card("Dodge", "group-progress-first-dodge");
  setHand(source.id, [group], 4, 4);
  setHand(first.id, [dodge], 4, 4);
  setHand(skipped.id, [], 4, 4);
  setHand(final.id, [], 4, 4);
  setTurn(game.code, source.seat);

  const started = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: group.id, preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  await passNegationWindows(game.code, game.members);
  const firstResponse = await state(game.code, firstMember.token);
  assert.equal(firstResponse.data.currentAction.kind, "response", JSON.stringify(firstResponse.data));
  assert.equal(firstResponse.data.currentAction.actorId, first.id);

  sql(`UPDATE players SET alive=0 WHERE id=${quote(skipped.id)}`);
  const answered = await requestAndSettle("respond", { code: game.code, token: firstMember.token, cardId: dodge.id, preserveResponse: true });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  const finalView = (await state(game.code, finalMember.token)).data;
  assert.equal(finalView.currentAction.kind, "response", JSON.stringify(finalView));
  assert.equal(finalView.currentAction.actorId, final.id);
  assert.deepEqual(finalView.presentationV2.groupResolution?.targetIds, [first.id, skipped.id, final.id]);
  assert.deepEqual(finalView.presentationV2.groupResolution?.participantProgress, [
    { playerId: first.id, order: 1, status: "RESOLVED", outcome: "AVOIDED" },
    { playerId: skipped.id, order: 2, status: "NO_LONGER_APPLICABLE" },
    { playerId: final.id, order: 3, status: "CURRENT" },
  ]);
  const pending = authoritativePending(game.code);
  assert.deepEqual(pending.continuation.participantProgress.participants.map(({ playerId, status, outcome }) => ({ playerId, status, ...(outcome ? { outcome } : {}) })), [
    { playerId: first.id, status: "RESOLVED", outcome: "AVOIDED" },
    { playerId: skipped.id, status: "NO_LONGER_APPLICABLE" },
    { playerId: final.id, status: "CURRENT" },
  ]);
});

test("FIX14 Group failure Damage uses one child frame and resumes the next participant", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, targetMember, damageMember, finalMember] = game.members;
  const [source, target, damageTarget, finalTarget] = game.room.players;
  const group = card("RainingArrows", "fix14-group");
  const targetDodge = card("Dodge", "fix14-target-dodge");
  const finalDodge = card("Dodge", "fix14-final-dodge");
  sql(`UPDATE players SET hero=NULL WHERE id IN (${[target.id, finalTarget.id].map(quote).join(",")})`);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='xiahou-dun' WHERE id=${quote(damageTarget.id)}`);
  setHand(source.id, [group], 4, 4);
  setHand(target.id, [targetDodge], 4, 4);
  setHand(damageTarget.id, [], 4, 4);
  setHand(finalTarget.id, [finalDodge], 4, 4);
  setTurn(game.code, source.seat);
  setDeck(game.code, [{ ...card("Dodge", "fix14-stauchness-judge"), suit: "♠", rank: "7" }]);

  const started = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: group.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  await passNegationWindows(game.code, game.members);
  const beforeTarget = await state(game.code, targetMember.token);
  assert.equal(beforeTarget.data.currentAction.kind, "response", JSON.stringify(beforeTarget.data));
  assert.equal(beforeTarget.data.currentAction.actorId, target.id);
  const groupRoot = beforeTarget.data.causalEnvelope;
  assert.ok(groupRoot);
  assert.equal(groupRoot.frames.length, 1);
  const groupFrame = groupRoot.frames[0];
  assert.equal(groupRoot.activeFrameId, groupFrame.frameId);
  assert.equal(groupFrame.stage, "GROUP_RESOLUTION");

  const targetAnswered = await request("respond", { code: game.code, token: targetMember.token, providerId: "card", cardId: targetDodge.id });
  assert.equal(targetAnswered.status, 200, JSON.stringify(targetAnswered.data));
  assert.equal(targetAnswered.data.room.currentAction.actorId, damageTarget.id);
  assert.equal(targetAnswered.data.room.causalEnvelope.interactionId, groupRoot.interactionId);
  assert.equal(targetAnswered.data.room.causalEnvelope.activeFrameId, groupFrame.frameId, JSON.stringify(targetAnswered.data.room.causalEnvelope));

  const damageOpened = await requestAndSettle("decline_response", { code: game.code, token: damageMember.token });
  assert.equal(damageOpened.status, 200, JSON.stringify(damageOpened.data));
  assert.equal(damageOpened.data.room.currentAction.kind, "trigger", JSON.stringify(damageOpened.data));
  assert.equal(damageOpened.data.room.currentAction.triggerEvent, "damage_suffered");
  assert.equal(damageOpened.data.room.currentAction.actorId, damageTarget.id);
  assert.deepEqual(damageOpened.data.room.presentationV2.groupResolution?.participantProgress.find(({ playerId }) => playerId === damageTarget.id), {
    playerId: damageTarget.id, order: 2, status: "PAUSED",
  }, "damage stays outcome-free while the sourced post-damage continuation is open");
  const storedDamage = authoritativePending(game.code);
  assert.equal(storedDamage.continuation.resumeGroup.continuation.pendingDamageParticipantId, damageTarget.id);
  assert.equal(JSON.stringify(damageOpened.data.room.presentationV2).includes("pendingDamageParticipantId"), false, "private continuation proof is not projected to clients");
  assert.equal(damageOpened.data.room.actionRevision.includes("pendingDamageParticipantId"), false, "opaque revisions do not serialize private continuation fields");
  assert.equal(damageOpened.data.room.actionRevision.includes(group.id), false, "opaque revisions do not expose held physical card IDs");
  assert.equal(damageOpened.data.room.actionRevision.includes(targetDodge.id), false, "opaque revisions do not expose completed response-card IDs");
  const damageEnvelope = damageOpened.data.room.causalEnvelope;
  assert.ok(damageEnvelope);
  assert.equal(damageEnvelope.interactionId, groupRoot.interactionId);
  assert.equal(damageEnvelope.frames.length, 2);
  const damageFrame = damageEnvelope.frames.find((frame) => frame.frameId !== groupFrame.frameId);
  assert.ok(damageFrame);
  assert.equal(damageEnvelope.activeFrameId, damageFrame.frameId);
  assert.equal(damageFrame.stage, "DAMAGE");
  assert.equal(damageFrame.parentFrameId, groupFrame.frameId);
  assert.equal(damageFrame.origin.originSourceId, source.id);
  assert.deepEqual(damageFrame.origin.originalTargetIds, [damageTarget.id]);
  assert.equal(damageFrame.current.currentTargetIds[0], damageTarget.id);
  assert.equal(damageFrame.current.resolvingPlayerId, damageTarget.id);
  const persistedDamage = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(persistedDamage.causal.frameId, damageFrame.frameId);
  assert.equal(persistedDamage.continuation.causal.frameId, damageFrame.frameId);
  assert.equal(persistedDamage.continuation.resumeGroup.continuation.causal.frameId, groupFrame.frameId);
  assert.equal(persistedDamage.actorId, damageTarget.id);
  const repeatedDamage = await state(game.code, damageMember.token);
  const otherDamage = await state(game.code, finalMember.token);
  for (const view of [repeatedDamage.data, otherDamage.data]) {
    assert.equal(view.causalEnvelope.interactionId, damageEnvelope.interactionId);
    assert.equal(view.causalEnvelope.activeFrameId, damageFrame.frameId);
    assert.equal(view.causalEnvelope.checkpoint.frameId, damageFrame.frameId);
    assert.equal(view.causalEnvelope.presentationRevision, damageEnvelope.presentationRevision);
  }

  const pendingBeforeTrigger = query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`);
  const staleTrigger = await request("trigger", {
    code: game.code,
    token: damageMember.token,
    providerId: "xiahou_dun_ganglie",
    context: { actionRevision: "stale-fix14", meId: damageTarget.id, phase: "response", pendingKind: "trigger", actorId: damageTarget.id },
  });
  assert.equal(staleTrigger.status, 409, JSON.stringify(staleTrigger.data));
  assert.equal(staleTrigger.data.stale, true);
  assert.equal(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`), pendingBeforeTrigger);
  const triggerContext = { actionRevision: damageOpened.data.room.actionRevision, meId: damageTarget.id, phase: "response", pendingKind: "trigger", actorId: damageTarget.id };
  const triggerRace = await Promise.all([
    request("trigger", { code: game.code, token: damageMember.token, providerId: "xiahou_dun_ganglie", context: triggerContext }),
    request("trigger", { code: game.code, token: damageMember.token, providerId: "xiahou_dun_ganglie", context: triggerContext }),
  ]);
  assert.equal(triggerRace.filter((result) => result.status === 200).length, 1, JSON.stringify(triggerRace));
  assert.equal(triggerRace.filter((result) => result.status === 409 && result.data.stale).length, 1, JSON.stringify(triggerRace));
  const judgementOpened = (await state(game.code, sourceMember.token)).data;
  assert.equal(judgementOpened.currentAction.kind, "trigger", JSON.stringify(judgementOpened));
  assert.equal(judgementOpened.currentAction.actorId, source.id);
  assert.equal(judgementOpened.causalEnvelope.activeFrameId, damageFrame.frameId);
  const damageResolved = await requestAndSettle("trigger", { code: game.code, token: sourceMember.token, providerId: "xiahou_dun_ganglie", choice: "take_damage" });
  assert.equal(damageResolved.status, 200, JSON.stringify(damageResolved.data));
  assert.equal(damageResolved.data.room.currentAction.actorId, finalTarget.id);
  const resumedEnvelope = damageResolved.data.room.causalEnvelope;
  assert.ok(resumedEnvelope);
  assert.equal(resumedEnvelope.interactionId, groupRoot.interactionId);
  assert.equal(resumedEnvelope.activeFrameId, groupFrame.frameId);
  assert.equal(resumedEnvelope.frames.find((frame) => frame.frameId === groupFrame.frameId)?.stage, "GROUP_RESOLUTION");
  assert.equal(resumedEnvelope.presentationRevision, damageEnvelope.presentationRevision + 2);
  assert.equal(resumedEnvelope.checkpoint.frameId, groupFrame.frameId);
  assert.deepEqual(resumedEnvelope.frames.find((frame) => frame.frameId === groupFrame.frameId)?.current.currentTargetIds, [finalTarget.id]);
  assert.deepEqual(damageResolved.data.room.presentationV2.groupResolution?.participantProgress.find(({ playerId }) => playerId === damageTarget.id), {
    playerId: damageTarget.id, order: 2, status: "RESOLVED", outcome: "DAMAGED",
  }, "positive damage is published only after the post-damage continuation settles");
  assert.equal(damageResolved.data.room.players.find((player) => player.id === target.id).handCards.length, 0);
  assert.equal(damageResolved.data.room.players.find((player) => player.id === damageTarget.id).hp, 3);

  const finalResolved = await requestAndSettle("respond", { code: game.code, token: finalMember.token, cardId: finalDodge.id });
  assert.equal(finalResolved.status, 200, JSON.stringify(finalResolved.data));
  assert.equal(finalResolved.data.room.causalEnvelope, null);
  assert.equal(finalResolved.data.room.pendingGroup, null);
  assert.equal(finalResolved.data.room.log.filter((entry) => entry.includes("Bob does not play Dodge")).length, 1);
  assert.equal(finalResolved.data.room.log.filter((entry) => entry.includes("Carol plays Dodge against Raining Arrows")).length, 1);
  const bobDamageIndex = finalResolved.data.room.log.findIndex((entry) => entry.includes("Bob does not play Dodge"));
  const carolResponseIndex = finalResolved.data.room.log.findIndex((entry) => entry.includes("Carol plays Dodge against Raining Arrows"));
  assert.ok(bobDamageIndex >= 0 && bobDamageIndex < carolResponseIndex, "the resumed Group processes Bob once before Carol");
});

test("FIX15 lethal Group Damage survives Peach rescue with the parent frame available", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, targetMember, damageMember, finalMember] = game.members;
  const [source, target, damageTarget, finalTarget] = game.room.players;
  const group = card("RainingArrows", "fix15-dying-group");
  const peach = card("Peach", "fix15-dying-peach");
  sql(`UPDATE players SET hero=NULL WHERE id IN (${[target.id, damageTarget.id, finalTarget.id].map(quote).join(",")})`);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  setHand(source.id, [group, peach], 4, 4);
  setHand(target.id, [], 3, 3);
  setHand(damageTarget.id, [], 1, 4);
  setHand(finalTarget.id, [], 4, 4);
  setTurn(game.code, source.seat);
  setDeck(game.code, [{ ...card("Dodge", "fix15-dying-judge"), suit: "♠", rank: "7" }]);

  const started = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: group.id, preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  await passNegationWindows(game.code, game.members);
  const groupRoot = (await state(game.code, sourceMember.token)).data.causalEnvelope;
  assert.ok(groupRoot);

  const firstResponse = await requestAndSettle("decline_response", { code: game.code, token: targetMember.token, preserveResponse: true });
  assert.equal(firstResponse.status, 200, JSON.stringify(firstResponse.data));
  const damageResponse = (await state(game.code, damageMember.token)).data;
  assert.equal(damageResponse.currentAction.kind, "response", JSON.stringify(damageResponse));
  assert.equal(damageResponse.currentAction.actorId, damageTarget.id);

  const dying = await requestAndSettle("decline_response", { code: game.code, token: damageMember.token });
  assert.equal(dying.status, 200, JSON.stringify(dying.data));
  assert.equal(dying.data.room.phase, "dying", JSON.stringify(dying.data.room));
  const dyingSourceView = (await state(game.code, sourceMember.token)).data;
  assert.equal(dyingSourceView.currentAction.kind, "dying", JSON.stringify(dyingSourceView));
  assert.equal(dyingSourceView.currentAction.actorId, source.id);
  const dyingPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(dyingPending.resumePending.continuation.kind, "group");
  assert.equal(dyingPending.resumePending.continuation.pendingDamageParticipantId, damageTarget.id);
  assert.notEqual(dyingPending.causal.frameId, groupRoot.activeFrameId);
  assert.equal(dying.data.room.causalEnvelope.activeFrameId, dyingPending.causal.frameId);
  assert.equal(dyingSourceView.presentationV2.groupResolution?.semantics, "PROVEN");
  assert.equal(dyingSourceView.presentationV2.groupResolution?.interactionId, groupRoot.interactionId);
  assert.equal(dyingSourceView.presentationV2.groupResolution?.groupFrameId, groupRoot.activeFrameId);
  assert.equal(dyingSourceView.presentationV2.groupResolution?.activeFrameId, dyingPending.causal.frameId);
  assert.equal(dyingSourceView.presentationV2.groupResolution?.stage, "DYING");
  assert.equal(dyingSourceView.presentationV2.groupResolution?.currentParticipantId, damageTarget.id);
  assert.deepEqual(dyingSourceView.presentationV2.groupResolution?.participantProgress.find(({ playerId }) => playerId === damageTarget.id), {
    playerId: damageTarget.id, order: 2, status: "PAUSED",
  }, "lethal damage stays outcome-free during Dying rescue");
  assert.deepEqual(dyingSourceView.presentationV2.groupResolution?.participantProgress, [
    { playerId: target.id, order: 1, status: "RESOLVED", outcome: "DAMAGED" },
    { playerId: damageTarget.id, order: 2, status: "PAUSED" },
    { playerId: finalTarget.id, order: 3, status: "PENDING" },
  ]);
  assert.equal(dyingSourceView.presentationV2.groupResolution?.decisionActorId, source.id);
  assert.notEqual(dyingSourceView.presentationV2.groupResolution?.currentParticipantId, dyingSourceView.presentationV2.groupResolution?.decisionActorId);
  assert.equal(dyingSourceView.presentationV2.interactionScene?.continuity.relation, "CHILD_FRAME");
  assert.equal(dyingSourceView.presentationV2.interactionScene?.currentParticipantId, damageTarget.id);
  assert.equal(dyingSourceView.presentationV2.interactionScene?.decisionActorId, source.id);
  assert.equal(dyingSourceView.presentationV2.interactionScene?.participantRoles.sourceId, source.id);
  assert.deepEqual(dyingSourceView.presentationV2.interactionScene?.participantRoles.activeTargetIds, [damageTarget.id]);
  assert.equal(dyingSourceView.presentationV2.interactionScene?.participantRoles.currentParticipantId, damageTarget.id);
  assert.equal(dyingSourceView.presentationV2.interactionScene?.participantRoles.decisionActorId, source.id);
  assert.equal(dyingSourceView.presentationV2.interactionScene?.participantRoles.parentParticipantId, damageTarget.id);
  assert.equal(dyingSourceView.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(dyingSourceView.presentationV2.stableBoundary.decisionActorId, source.id);
  const dyingUninvolvedView = (await state(game.code, damageMember.token)).data;
  assert.deepEqual(dyingUninvolvedView.presentationV2.interactionScene, dyingSourceView.presentationV2.interactionScene);
  assert.deepEqual(dyingUninvolvedView.presentationV2.interactionScene?.participantRoles, dyingSourceView.presentationV2.interactionScene?.participantRoles);
  assert.deepEqual(dyingUninvolvedView.presentationV2.stableBoundary, dyingSourceView.presentationV2.stableBoundary);
  assert.ok(dyingSourceView.currentAction.options?.some((option) => option.providerId === "card"), "the Dying decision actor receives private Peach controls");
  assert.equal(dyingUninvolvedView.currentAction.options, undefined, "Dying controls remain private to the decision actor");
  const dyingRepeat = (await state(game.code, sourceMember.token)).data;
  assert.equal(dyingRepeat.causalEnvelope.checkpoint.checkpointId, dyingSourceView.causalEnvelope.checkpoint.checkpointId);
  assert.equal(dyingRepeat.causalEnvelope.presentationRevision, dyingSourceView.causalEnvelope.presentationRevision);
  assert.deepEqual(dyingRepeat.presentationV2.interactionScene, dyingSourceView.presentationV2.interactionScene);
  assert.deepEqual(dyingRepeat.presentationV2.stableBoundary, dyingSourceView.presentationV2.stableBoundary);

  const rescued = await requestAndSettle("give_peach", { code: game.code, token: sourceMember.token, cardId: peach.id, preserveResponse: true });
  assert.equal(rescued.status, 200, JSON.stringify(rescued.data));
  assert.equal(rescued.data.room.players.find((player) => player.id === damageTarget.id).hp, 1);
  assert.equal(rescued.data.room.currentAction.kind, "response", JSON.stringify(rescued.data.room));
  assert.equal(rescued.data.room.currentAction.actorId, finalTarget.id);
  assert.ok(rescued.data.room.causalEnvelope, query(`SELECT causal_envelope_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(rescued.data.room.causalEnvelope.interactionId, groupRoot.interactionId);
  assert.equal(rescued.data.room.causalEnvelope.activeFrameId, groupRoot.activeFrameId);
  assert.ok(rescued.data.room.causalEnvelope.presentationRevision > groupRoot.presentationRevision, "Dying settlement advances the causal presentation revision");
  assert.ok(rescued.data.room.causalEnvelope.frames.length >= 2);
  assert.ok(rescued.data.room.causalEnvelope.frames.some((frame) => frame.frameId === groupRoot.activeFrameId && frame.stage === "GROUP_RESOLUTION"));
  const resumedPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(resumedPending.continuation.kind, "group");
  assert.equal(resumedPending.continuation.pendingDamageParticipantId, undefined, "the private damage marker is consumed at the resolved boundary");
  assert.deepEqual(rescued.data.room.presentationV2.groupResolution?.participantProgress, [
    { playerId: target.id, order: 1, status: "RESOLVED", outcome: "DAMAGED" },
    { playerId: damageTarget.id, order: 2, status: "RESOLVED", outcome: "DAMAGED" },
    { playerId: finalTarget.id, order: 3, status: "CURRENT" },
  ]);

  const finished = await requestAndSettle("decline_response", { code: game.code, token: finalMember.token, preserveResponse: true });
  assert.equal(finished.status, 200, JSON.stringify(finished.data));
  assert.equal(finished.data.room.pendingGroup, null);
  assert.equal(finished.data.room.causalEnvelope, null);
  assert.ok(finished.data.room.log.some((entry) => entry.includes("Carol does not play Dodge")));
});

test("FIX15 Barbarian Invasion uses the same Group Damage child boundary", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, targetMember, damageMember] = game.members;
  const [source, target, damageTarget, finalTarget] = game.room.players;
  const invasion = card("BarbarianInvasion", "fix15-barbarian-group");
  const targetAttack = card("Attack", "fix15-barbarian-response");
  sql(`UPDATE players SET hero=NULL WHERE id IN (${[target.id, finalTarget.id].map(quote).join(",")})`);
  sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
  sql(`UPDATE players SET hero='xiahou-dun' WHERE id=${quote(damageTarget.id)}`);
  setHand(source.id, [invasion], 4, 4);
  setHand(target.id, [targetAttack], 3, 3);
  setHand(damageTarget.id, [], 4, 4);
  setHand(finalTarget.id, [], 4, 4);
  setTurn(game.code, source.seat);
  setDeck(game.code, [{ ...card("Dodge", "fix15-barbarian-judge"), suit: "♠", rank: "7" }]);

  const started = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: invasion.id, preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  await passNegationWindows(game.code, game.members);
  const first = (await state(game.code, targetMember.token)).data;
  assert.equal(first.currentAction.requirement, "attack", JSON.stringify(first));
  const answered = await requestAndSettle("respond", { code: game.code, token: targetMember.token, cardId: targetAttack.id, preserveResponse: true });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.deepEqual(answered.data.room.presentationV2.groupResolution?.participantProgress, [
    { playerId: target.id, order: 1, status: "RESOLVED" },
    { playerId: damageTarget.id, order: 2, status: "CURRENT" },
    { playerId: finalTarget.id, order: 3, status: "PENDING" },
  ], "a satisfied Attack resolves without a damage outcome");
  await passNegationWindows(game.code, game.members);

  const damage = await requestAndSettle("decline_response", { code: game.code, token: damageMember.token, preserveResponse: true });
  assert.equal(damage.status, 200, JSON.stringify(damage.data));
  assert.equal(damage.data.room.currentAction.kind, "trigger", JSON.stringify(damage.data.room));
  assert.deepEqual(damage.data.room.presentationV2.groupResolution?.participantProgress.find(({ playerId }) => playerId === damageTarget.id), {
    playerId: damageTarget.id, order: 2, status: "PAUSED",
  }, "effective damage remains outcome-free during the open Damage continuation");
  const damagePending = authoritativePending(game.code);
  assert.equal(damagePending.continuation.resumeGroup.continuation.pendingDamageParticipantId, damageTarget.id);
  assert.equal(JSON.stringify(damage.data.room.presentationV2).includes("pendingDamageParticipantId"), false);
  assert.equal(damage.data.room.actionRevision.includes("pendingDamageParticipantId"), false);
  assert.equal(damage.data.room.causalEnvelope.frames.length, 2);
  const child = damage.data.room.causalEnvelope.frames.find((frame) => frame.parentFrameId);
  assert.ok(child);
  assert.equal(child.stage, "DAMAGE");
  assert.equal(child.parentFrameId, damage.data.room.causalEnvelope.frames.find((frame) => frame.parentFrameId === null)?.frameId);
  assert.equal(damage.data.room.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(damage.data.room.presentationV2.interactionScene?.effect, "BarbarianInvasion");
  assert.equal(damage.data.room.presentationV2.interactionScene?.continuity.relation, "CHILD_FRAME");
  assert.equal(damage.data.room.presentationV2.interactionScene?.parentFrameId, child.parentFrameId);
  assert.equal(damage.data.room.presentationV2.interactionScene?.activeTargetIds[0], damageTarget.id);

  const resumed = await requestAndSettle("decline_trigger", { code: game.code, token: damageMember.token, preserveResponse: true });
  assert.equal(resumed.status, 200, JSON.stringify(resumed.data));
  assert.equal(resumed.data.room.currentAction.kind, "response", JSON.stringify(resumed.data.room));
  assert.equal(resumed.data.room.currentAction.actorId, finalTarget.id);
  assert.equal(resumed.data.room.causalEnvelope.activeFrameId, child.parentFrameId);
  assert.deepEqual(resumed.data.room.presentationV2.groupResolution?.participantProgress, [
    { playerId: target.id, order: 1, status: "RESOLVED" },
    { playerId: damageTarget.id, order: 2, status: "RESOLVED", outcome: "DAMAGED" },
    { playerId: finalTarget.id, order: 3, status: "CURRENT" },
  ], "Damaged appears only once the matching participant resumes as resolved");
});

test("UX2.7 Group Defeated outcome requires positive damage and an authoritative Dying failure", { timeout: 30_000 }, async () => {
  for (const kind of ["RainingArrows", "BarbarianInvasion"]) {
    const game = await createHumanGame();
    const [sourceMember, targetMember, bobMember] = game.members;
    const [source, target, bob, carol] = game.room.players;
    const suffix = `ux27-defeated-${kind.toLowerCase()}`;
    sql(`UPDATE players SET hero='cao-cao' WHERE id=${quote(source.id)}`);
    sql(`UPDATE players SET hero='xiahou-dun' WHERE id=${quote(target.id)}`);
    sql(`UPDATE players SET hero=NULL WHERE id IN (${[bob.id, carol.id].map(quote).join(",")})`);
    const peach = card("Peach", `${suffix}-peach`);
    setHand(source.id, [card(kind, `${suffix}-source`), peach], 4, 4);
    setHand(target.id, [], 1, 3);
    setHand(bob.id, [card(kind === "RainingArrows" ? "Dodge" : "Attack", `${suffix}-bob`)], 4, 4);
    setHand(carol.id, [card(kind === "RainingArrows" ? "Dodge" : "Attack", `${suffix}-carol`)], 4, 4);
    setTurn(game.code, source.seat);
    setDeck(game.code, [{ ...card("Dodge", `${suffix}-judge`), suit: "♠", rank: "7" }]);
    const started = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: `${kind.toLowerCase()}-${suffix}-source`, preserveResponse: true });
    assert.equal(started.status, 200, `${kind}: ${JSON.stringify(started.data)}`);
    await passNegationWindows(game.code, game.members);
    const opened = { ...game, sourceMember, targetMember, bobMember, source, target, bob, carol };

    const declinedResponse = await requestAndSettle("decline_response", { code: opened.code, token: opened.targetMember.token, preserveResponse: true });
    assert.equal(declinedResponse.status, 200, `${kind}: ${JSON.stringify(declinedResponse.data)}`);
    const pendingDamage = await assertProjectionMatchesEngine(opened.code, opened.targetMember.token);
    assert.deepEqual(pendingDamage.presentationV2.groupResolution?.participantProgress?.[0], {
      playerId: opened.target.id, order: 1, status: "PAUSED",
    }, `${kind}: lethal damage remains outcome-free while Dying has not settled`);

    const defeated = await requestAndSettle("skip_rescue", { code: opened.code, token: opened.sourceMember.token, preserveResponse: true });
    assert.equal(defeated.status, 200, `${kind}: ${JSON.stringify(defeated.data)}`);
    const resumed = await assertProjectionMatchesEngine(opened.code, opened.bobMember.token);
    assert.equal(resumed.players.find(({ id }) => id === opened.target.id)?.alive, false, `${kind}: the target is authoritatively defeated`);
    assert.deepEqual(resumed.presentationV2.groupResolution?.participantProgress?.[0], {
      playerId: opened.target.id, order: 1, status: "RESOLVED", outcome: "DEFEATED",
    }, `${kind}: Defeated is published only after the Dying failure resumes Group`);
    assert.equal(resumed.presentationSnapshot.groupParticipantProgress?.participants[0].outcome, "DEFEATED");

    const otherViewer = await assertProjectionMatchesEngine(opened.code, opened.sourceMember.token);
    assert.deepEqual(publicSnapshot(otherViewer.presentationSnapshot), publicSnapshot(resumed.presentationSnapshot), `${kind}: the public outcome is viewer-equal`);
    assert.deepEqual(otherViewer.presentationV2.groupResolution, resumed.presentationV2.groupResolution);
  }
});

test("FIX14 malformed Group-to-Damage storage never reconstructs a child authority", { timeout: 30_000 }, async () => {
  const setup = await openGanglieGroup({ kind: "RainingArrows", suffix: "fix14-malformed", judge: { ...card("Dodge", "fix14-malformed-judge"), suit: "♠", rank: "7" } });
  const before = await state(setup.code, setup.targetMember.token);
  assert.equal(before.data.currentAction.kind, "trigger", JSON.stringify(before.data));
  assert.equal(before.data.currentAction.triggerEvent, "damage_suffered");
  assert.equal(before.data.causalEnvelope.frames.length, 2);
  const groupFrameId = before.data.causalEnvelope.frames.find((frame) => frame.parentFrameId === null)?.frameId;
  const childFrameId = before.data.causalEnvelope.activeFrameId;
  assert.ok(groupFrameId);
  assert.notEqual(childFrameId, groupFrameId);
  sql(`UPDATE rooms SET causal_envelope_json = ${quote(JSON.stringify({ ...before.data.causalEnvelope, checkpoint: { checkpointId: "incoherent-checkpoint", frameId: groupFrameId, stage: "GROUP_RESOLUTION" } }))} WHERE code=${quote(setup.code)}`);
  const incoherent = await state(setup.code, setup.targetMember.token);
  assert.equal(incoherent.data.causalEnvelope.checkpoint.frameId, groupFrameId);
  assert.equal(incoherent.data.presentationV2.interactionScene?.semantics, "UNPROVEN");
  assert.equal(incoherent.data.presentationV2.interactionScene?.interactionId, null);
  sql(`UPDATE rooms SET causal_envelope_json = '{malformed-fix14' WHERE code=${quote(setup.code)}`);
  const declined = await requestAndSettle("decline_trigger", { code: setup.code, token: setup.targetMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.currentAction.kind, "response", JSON.stringify(declined.data));
  assert.equal(declined.data.room.currentAction.actorId, setup.bob.id);
  assert.equal(declined.data.room.causalEnvelope, null, "malformed storage stays non-authoritative and does not fabricate a child or parent envelope");
  assert.equal(declined.data.room.presentationV2.groupResolution?.semantics, "UNPROVEN");
  assert.equal(declined.data.room.presentationV2.groupResolution?.interactionId, null);
  assert.equal(declined.data.room.presentationV2.groupResolution?.groupFrameId, null);
  assert.equal(declined.data.room.presentationV2.interactionScene?.semantics, "UNPROVEN");
  assert.equal(declined.data.room.presentationV2.interactionScene?.interactionId, null);
  const pending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(setup.code)}`));
  assert.equal(pending.causal.interactionId, before.data.causalEnvelope.interactionId);
  assert.equal(pending.causal.frameId, groupFrameId, "the typed Group continuation survives without reconstructing public authority");
  assert.notEqual(pending.causal.frameId, childFrameId);
});

test("FIX9 persists the Group root and keeps nested Negation in the same Frame", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, , bobMember] = game.members;
  const [source, target, bob, carol] = game.room.players;
  const group = card("RainingArrows", "fix8-group-entry-source");
  const negation = card("Negation", "fix8-group-entry-negation");
  setHand(source.id, [group, negation], 4, 4); setHand(target.id, [], 3, 3); setHand(bob.id, [], 4, 4); setHand(carol.id, [], 4, 4);
  setTurn(game.code, source.seat);
  const started = await request("play_card", { code: game.code, token: sourceMember.token, cardId: group.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const initial = started.data.room;
  const root = initial.causalEnvelope;
  assert.ok(root, "the initial Group decision has a public causal envelope");
  assert.equal(root.frames.length, 1, "nested Group Negation stays in the Group frame");
  const frame = root.frames[0];
  assert.equal(root.activeFrameId, frame.frameId);
  assert.equal(frame.stage, "NEGATION");
  assert.equal(initial.presentationV2.groupResolution?.semantics, "PROVEN");
  assert.equal(initial.presentationV2.groupResolution?.resolutionSemantics, "GROUP");
  assert.equal(initial.presentationV2.groupResolution?.interactionId, root.interactionId);
  assert.equal(initial.presentationV2.groupResolution?.groupFrameId, root.activeFrameId);
  assert.equal(initial.presentationV2.groupResolution?.activeFrameId, root.activeFrameId);
  assert.equal(initial.presentationV2.groupResolution?.stage, "NEGATION");
  assert.equal(frame.origin.originSourceId, source.id);
  assert.equal(frame.origin.originEffect, "RainingArrows");
  assert.deepEqual(frame.origin.originalTargetIds, [target.id, bob.id, carol.id]);
  assert.deepEqual(frame.current.currentTargetIds, [target.id]);
  assert.deepEqual(initial.presentationV2.groupResolution?.targetIds, [target.id, bob.id, carol.id]);
  assert.equal(initial.presentationV2.groupResolution?.currentParticipantId, target.id);
  assert.deepEqual(initial.presentationV2.groupResolution?.participantProgress, [
    { playerId: target.id, order: 1, status: "CURRENT" },
    { playerId: bob.id, order: 2, status: "PENDING" },
    { playerId: carol.id, order: 3, status: "PENDING" },
  ]);
  assert.equal(initial.presentationSnapshot.groupParticipantProgress.resolutionSemantics, "GROUP");
  const pending = authoritativePending(game.code);
  const groupPending = pending.continuation.effect.pending;
  assert.equal(groupPending.causal.interactionId, root.interactionId);
  assert.equal(groupPending.causal.frameId, frame.frameId);
  assert.equal(groupPending.continuation.causal.frameId, frame.frameId);
  assert.equal(groupPending.continuation.participantProgress.groupFrameId, frame.frameId);
  assert.deepEqual(groupPending.continuation.participantProgress.participants.map(({ playerId, status }) => ({ playerId, status })), [
    { playerId: target.id, status: "CURRENT" },
    { playerId: bob.id, status: "PENDING" },
    { playerId: carol.id, status: "PENDING" },
  ]);
  const repeat = (await state(game.code, sourceMember.token)).data;
  assert.equal(repeat.causalEnvelope.interactionId, root.interactionId);
  assert.equal(repeat.causalEnvelope.checkpoint.checkpointId, root.checkpoint.checkpointId);
  const other = (await state(game.code, bobMember.token)).data;
  assert.equal(other.causalEnvelope.interactionId, root.interactionId);
  assert.equal(other.causalEnvelope.activeFrameId, frame.frameId);
  assert.equal(other.causalEnvelope.checkpoint.checkpointId, root.checkpoint.checkpointId);
  const settled = await requestAndSettle("decline_response", { code: game.code, token: sourceMember.token, preserveResponse: true });
  assert.equal(settled.status, 200, JSON.stringify(settled.data));
  assert.equal(settled.data.room.causalEnvelope.frames.length, 1);
  assert.equal(settled.data.room.causalEnvelope.activeFrameId, frame.frameId);
  assert.equal(settled.data.room.causalEnvelope.frames[0].stage, "GROUP_RESOLUTION");
  assert.notEqual(settled.data.room.causalEnvelope.checkpoint.checkpointId, root.checkpoint.checkpointId);
  assert.equal(settled.data.room.causalEnvelope.presentationRevision, root.presentationRevision + 1);
  assert.equal(settled.data.room.presentationV2.groupResolution?.groupFrameId, frame.frameId);
  assert.equal(settled.data.room.presentationV2.groupResolution?.activeFrameId, frame.frameId);
  assert.equal(settled.data.room.presentationV2.groupResolution?.stage, "GROUP_RESOLUTION");
  assert.deepEqual(settled.data.room.presentationV2.groupResolution?.participantProgress, [
    { playerId: target.id, order: 1, status: "CURRENT" },
    { playerId: bob.id, order: 2, status: "PENDING" },
    { playerId: carol.id, order: 3, status: "PENDING" },
  ]);
  let completedGroup = settled.data.room;
  for (let guard = 0; guard < 8 && completedGroup.causalEnvelope; guard++) {
    const pending = authoritativePending(game.code);
    if (pending?.kind !== "response" || !pending.actorId) break;
    const actor = game.room.players.find((player) => player.id === pending.actorId);
    const actorMember = game.members.find((member) => member.name === actor?.name);
    assert.ok(actorMember, JSON.stringify(pending));
    const actorView = (await state(game.code, actorMember.token)).data;
    if (!actorView.currentAction.legalActions?.includes("decline_response")) {
      const armed = await request("start_response_timer", { code: game.code, token: actorMember.token });
      assert.equal(armed.status, 200, JSON.stringify(armed.data));
    }
    const declined = await requestAndSettle("decline_response", { code: game.code, token: actorMember.token, preserveResponse: true });
    assert.equal(declined.status, 200, JSON.stringify(declined.data));
    completedGroup = declined.data.room;
  }
  assert.equal(completedGroup.causalEnvelope, null, "the completed Group clears the nested Negation causal identity");
  assert.deepEqual(completedGroup.presentationV2.stableBoundary, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null });
});

test("FIX10 nested Group Negation handoff skips an ineligible target in the same frame", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, , bobMember] = game.members;
  const [source, target, bob, carol] = game.room.players;
  const group = card("RainingArrows", "fix10-group-handoff-source");
  const sourceNegation = card("Negation", "fix10-group-handoff-source-negation");
  const bobNegation = card("Negation", "fix10-group-handoff-bob");
  setHand(source.id, [group, sourceNegation], 4, 4);
  setHand(target.id, [], 3, 3);
  setHand(bob.id, [bobNegation], 4, 4);
  setHand(carol.id, [], 4, 4);
  setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: group.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const root = opened.data.room.causalEnvelope;
  assert.equal(root.frames.length, 1);
  assert.deepEqual(root.frames[0].origin.originalTargetIds, [target.id, bob.id, carol.id]);
  assert.deepEqual(root.frames[0].current.currentTargetIds, [target.id]);
  const declined = await request("decline_response", { code: game.code, token: sourceMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const after = (await state(game.code, bobMember.token)).data;
  assert.equal(after.currentAction.actorId, bob.id);
  assert.equal(after.causalEnvelope.interactionId, root.interactionId);
  assert.equal(after.causalEnvelope.activeFrameId, root.activeFrameId);
  assert.equal(after.causalEnvelope.frames.length, 1);
  assert.equal(after.causalEnvelope.frames[0].stage, "NEGATION");
  assert.deepEqual(after.causalEnvelope.frames[0].origin.originalTargetIds, [target.id, bob.id, carol.id]);
  assert.deepEqual(after.causalEnvelope.frames[0].current.currentTargetIds, [target.id]);
  assert.equal(after.causalEnvelope.frames[0].current.resolvingPlayerId, bob.id);
  assert.deepEqual(after.presentationV2.groupResolution?.targetIds, [target.id, bob.id, carol.id]);
  assert.equal(after.presentationV2.groupResolution?.currentParticipantId, target.id);
  assert.notEqual(after.causalEnvelope.checkpoint.checkpointId, root.checkpoint.checkpointId);
  assert.equal(after.causalEnvelope.presentationRevision, root.presentationRevision + 1);
  const pending = authoritativePending(game.code);
  assert.equal(pending.actorId, bob.id);
  assert.equal(pending.causal.frameId, root.activeFrameId);
  assert.equal(pending.continuation.causal.frameId, root.activeFrameId);
});

test("engine-backed Duel alternates response actors without changing the root context", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const [source, target] = game.room.players;
  const duel = card("Duel", "projector-duel");
  const firstAttack = card("Attack", "projector-duel-first");
  const secondAttack = card("Attack", "projector-duel-second");
  setHand(source.id, [duel, secondAttack], 4, 4); setHand(target.id, [firstAttack], 4, 4); setTurn(game.code, source.seat);
  const started = await request("play_card", { code: game.code, token: host.token, cardId: duel.id, targetId: target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const first = await assertProjectionMatchesEngine(game.code, alice.token);
  const firstRoot = first.presentationV2.rootContext;
  const firstRevision = first.actionRevision;
  const rootDuelEvent = first.timeline.find((event) => event.card?.id === duel.id);
  assert.ok(rootDuelEvent, "the public root Duel card event is present");
  assert.deepEqual(first.presentationV2.duelExchange, {
    semantics: "PROVEN",
    interactionId: first.presentationV2.interactionScene.interactionId,
    rootFrameId: first.presentationV2.interactionScene.rootFrameId,
    checkpointId: first.presentationV2.interactionScene.checkpointId,
    presentationRevision: first.presentationV2.interactionScene.presentationRevision,
    root: { eventId: rootDuelEvent.id, resolutionId: rootDuelEvent.resolutionId, sourceId: source.id, targetId: target.id, cardKind: "Duel" },
    responseCount: 0,
    responses: [],
    currentParticipantId: target.id,
    decisionActorId: target.id,
  }, "an open Duel proves its persistent root without inventing a response node");
  assert.deepEqual(first.presentationSnapshot.duelExchange, first.presentationV2.duelExchange, "the route snapshot preserves the accepted public exchange");
  assert.equal(first.currentAction.actorId, target.id);
  assert.equal(authoritativePending(game.code).continuation.kind, "duel");
  assert.equal(first.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(first.presentationV2.interactionScene?.stage, "DUEL_EXCHANGE");
  assert.equal(first.presentationV2.interactionScene?.sourceId, source.id);
  assert.deepEqual(first.presentationV2.interactionScene?.targetIds, first.causalEnvelope.frames[0].origin.originalTargetIds);
  assert.equal(first.presentationV2.interactionScene?.currentParticipantId, target.id);
  assert.equal(first.presentationV2.interactionScene?.decisionActorId, target.id);
  assert.deepEqual(first.presentationV2.interactionScene?.participantRoles, { sourceId: source.id, originalTargetIds: [target.id, source.id], activeTargetIds: [target.id, source.id], currentParticipantId: target.id, decisionActorId: target.id, activeResolverId: target.id, parentParticipantId: null, participantIds: [] });
  assert.equal(first.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(first.presentationV2.stableBoundary.decisionActorId, target.id);
  const firstOtherViewer = await state(game.code, host.token);
  assert.deepEqual(firstOtherViewer.data.presentationV2.interactionScene, first.presentationV2.interactionScene, "Duel public scene is equal across the first response checkpoint");
  assert.deepEqual(firstOtherViewer.data.presentationV2.duelExchange, first.presentationV2.duelExchange, "Duel root authority is public and viewer-equal");
  assert.equal(firstOtherViewer.data.presentationV2.interactionScene?.decisionActorId, target.id);
  const firstRepeat = await state(game.code, alice.token);
  assert.deepEqual(firstRepeat.data.presentationV2.interactionScene, first.presentationV2.interactionScene, "repeated Duel reads do not create a new public scene");
  assert.deepEqual(firstRepeat.data.presentationV2.stableBoundary, first.presentationV2.stableBoundary);
  assert.equal(firstOtherViewer.data.currentAction.options, undefined, "Duel response options remain private to the acting viewer");
  const answered = await request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: firstAttack.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  const second = await assertProjectionMatchesEngine(game.code, host.token);
  assert.equal(second.currentAction.kind, "response");
  assert.equal(second.currentAction.actorId, source.id);
  assert.notEqual(second.actionRevision, firstRevision);
  assert.equal(second.presentationV2.rootContext?.sourceId, firstRoot?.sourceId, "actor alternation preserves the root source");
  assert.equal(second.presentationV2.rootContext?.kind, firstRoot?.kind, "actor alternation preserves the root kind");
  assert.equal(second.presentationV2.duelExchange?.root.resolutionId, rootDuelEvent.resolutionId, "typed Duel root retains the original resolution across response handoff");
  const firstDuelResponseEvent = second.timeline.find((event) => event.duelAttackResponse?.ordinal === 1);
  assert.ok(firstDuelResponseEvent, "the submitted Attack is linked to the exact Duel exchange");
  assert.deepEqual(second.presentationV2.duelExchange?.responses, [{
    semantics: "PROVEN",
    relation: "DUEL_EXCHANGE",
    interactionId: first.presentationV2.duelExchange.interactionId,
    rootFrameId: first.presentationV2.duelExchange.rootFrameId,
    rootEventId: rootDuelEvent.id,
    rootResolutionId: rootDuelEvent.resolutionId,
    rootSourceId: source.id,
    rootTargetId: target.id,
    ordinal: 1,
    sourceId: target.id,
    targetId: source.id,
    decisionActorId: target.id,
    responseActorId: target.id,
    responseCardKind: "Attack",
    responseEventId: firstDuelResponseEvent.id,
    responseResolutionId: rootDuelEvent.resolutionId,
  }]);
  assert.deepEqual(second.presentationV2.duelExchange?.root, first.presentationV2.duelExchange.root, "the public root identity remains stable across actor handoff");
  assert.equal(JSON.stringify(second.presentationV2.duelExchange).includes(duel.id), false, "public Duel proof omits physical card IDs");
  assert.equal(JSON.stringify(second.presentationV2.duelExchange).includes(firstAttack.id), false, "public response proof omits physical Attack card IDs");
  assert.deepEqual(second.presentationSnapshot.duelExchange, second.presentationV2.duelExchange, "the snapshot carries the same server-proven exchange");
  assert.equal(second.presentationV2.activeContext?.kind, "duel");
  assert.deepEqual(second.presentationV2.activeContext?.currentTargetIds, [target.id]);
  assert.equal(second.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(second.presentationV2.interactionScene?.interactionId, first.presentationV2.interactionScene?.interactionId);
  assert.equal(second.presentationV2.interactionScene?.rootFrameId, first.presentationV2.interactionScene?.rootFrameId);
  assert.equal(second.presentationV2.interactionScene?.stage, "DUEL_EXCHANGE");
  assert.equal(second.presentationV2.interactionScene?.currentParticipantId, source.id, "the public Duel participant follows the server-owned handoff");
  assert.equal(second.presentationV2.interactionScene?.decisionActorId, source.id, "the public Duel decision actor follows CurrentAction");
  assert.deepEqual(second.presentationV2.interactionScene?.participantRoles, { sourceId: source.id, originalTargetIds: [target.id, source.id], activeTargetIds: [source.id, target.id], currentParticipantId: source.id, decisionActorId: source.id, activeResolverId: source.id, parentParticipantId: null, participantIds: [] });
  assert.equal(second.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(second.presentationV2.stableBoundary.interactionId, first.presentationV2.interactionScene?.interactionId);
  assert.equal(second.presentationV2.stableBoundary.decisionActorId, source.id);
  assert.notEqual(second.presentationV2.stableBoundary.checkpointId, first.presentationV2.stableBoundary.checkpointId);
  assert.equal(second.presentationV2.stableBoundary.presentationRevision, (first.presentationV2.stableBoundary.presentationRevision ?? 0) + 1);
  const secondOtherViewer = await state(game.code, alice.token);
  assert.deepEqual(secondOtherViewer.data.presentationV2.interactionScene, second.presentationV2.interactionScene, "Duel public scene remains equal after response handoff");
  assert.deepEqual(secondOtherViewer.data.presentationV2.duelExchange, second.presentationV2.duelExchange, "Duel response proof remains viewer-equal");
  assert.deepEqual(secondOtherViewer.data.presentationSnapshot.duelExchange, second.presentationSnapshot.duelExchange, "both viewers receive identical public snapshot links");
  assert.equal(secondOtherViewer.data.presentationV2.interactionScene?.decisionActorId, source.id);
  assert.equal(secondOtherViewer.data.currentAction.options, undefined, "the second Duel response options remain private to the acting viewer");

  const returned = await request("respond", { code: game.code, token: host.token, providerId: "card", cardId: secondAttack.id });
  assert.equal(returned.status, 200, JSON.stringify(returned.data));
  const third = await assertProjectionMatchesEngine(game.code, alice.token);
  assert.equal(third.currentAction.actorId, target.id);
  assert.equal(third.presentationV2.duelExchange?.root.eventId, rootDuelEvent.id);
  assert.deepEqual(third.presentationV2.duelExchange?.responses.map(({ ordinal, sourceId, targetId, decisionActorId, responseCardKind }) => ({ ordinal, sourceId, targetId, decisionActorId, responseCardKind })), [
    { ordinal: 1, sourceId: target.id, targetId: source.id, decisionActorId: target.id, responseCardKind: "Attack" },
    { ordinal: 2, sourceId: source.id, targetId: target.id, decisionActorId: source.id, responseCardKind: "Attack" },
  ], "each response direction comes from the server-owned Duel continuation");
});

test("engine-backed Duel damage opens a child Dying frame and clears after rescue", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, targetMember] = game.members;
  const [source, target] = game.room.players;
  const duel = card("Duel", "projector-duel-dying");
  const peach = card("Peach", "projector-duel-dying-peach");
  setHand(source.id, [duel, peach], 4, 4);
  setHand(target.id, [], 1, 4);
  setTurn(game.code, source.seat);
  const opened = await requestAndSettle("play_card", { code: game.code, token: sourceMember.token, cardId: duel.id, targetId: target.id, preserveResponse: true });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const duelRoot = (await state(game.code, sourceMember.token)).data.causalEnvelope;
  assert.ok(duelRoot);
  assert.equal(duelRoot.frames.length, 1);
  assert.equal(duelRoot.frames[0].stage, "DUEL_EXCHANGE");

  const declined = await requestAndSettle("decline_response", { code: game.code, token: targetMember.token, preserveResponse: true });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.phase, "dying", JSON.stringify(declined.data.room));
  const dying = await assertProjectionMatchesEngine(game.code, sourceMember.token);
  const dyingPending = authoritativePending(game.code);
  assert.equal(dyingPending.kind, "dying");
  assert.equal(dying.currentAction.kind, "dying");
  assert.equal(dying.currentAction.actorId, source.id, "the existing Dying order gives the source the Peach decision");
  assert.equal(dying.presentationV2.interactionScene?.continuity.relation, "CHILD_FRAME");
  assert.equal(dying.presentationV2.interactionScene?.sourceId, source.id);
  assert.equal(dying.presentationV2.interactionScene?.currentParticipantId, target.id);
  assert.equal(dying.presentationV2.interactionScene?.decisionActorId, source.id);
  assert.equal(dying.presentationV2.interactionScene?.activeResolverId, source.id);
  assert.equal(dying.presentationV2.interactionScene?.participantRoles.parentParticipantId, null);
  assert.equal(dying.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(dying.presentationV2.stableBoundary.decisionActorId, source.id);
  const childFrame = dying.causalEnvelope.frames.find((frame) => frame.frameId === dying.causalEnvelope.activeFrameId);
  assert.equal(childFrame?.stage, "DYING");
  assert.equal(childFrame?.parentFrameId, duelRoot.activeFrameId);
  assert.equal(dying.causalEnvelope.interactionId, duelRoot.interactionId);
  assert.equal(dying.causalEnvelope.frames.find((frame) => frame.frameId === duelRoot.activeFrameId)?.stage, "DUEL_EXCHANGE");
  assert.ok(dying.currentAction.options?.some((option) => option.providerId === "card"), "the Dying actor receives private Peach controls");
  const other = (await state(game.code, targetMember.token)).data;
  assert.deepEqual(other.presentationV2.interactionScene, dying.presentationV2.interactionScene);
  assert.equal(other.currentAction.options, undefined);

  const rescued = await requestAndSettle("give_peach", { code: game.code, token: sourceMember.token, cardId: peach.id, preserveResponse: true });
  assert.equal(rescued.status, 200, JSON.stringify(rescued.data));
  assert.equal(rescued.data.room.players.find((player) => player.id === target.id).hp, 1);
  assert.equal(rescued.data.room.causalEnvelope, null, "Duel damage rescue returns to the normal phase and clears the child frame");
  assert.equal(rescued.data.room.pendingDuel, null);
});

test("FIX9 ordinary Duel Negation stays in one Frame and restores the Duel stage", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const [source, target] = game.room.players;
  const duel = card("Duel", "fix8-physical-duel");
  const negate = card("Negation", "fix8-physical-duel-negation");
  const attack = card("Attack", "fix8-physical-duel-attack");
  const sourceAttack = card("Attack", "fix8-physical-duel-source-attack");
  setHand(source.id, [duel, negate, sourceAttack], 4, 4); setHand(target.id, [attack], 4, 4); setTurn(game.code, source.seat);
  const started = await request("play_card", { code: game.code, token: host.token, cardId: duel.id, targetId: target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const root = started.data.room.causalEnvelope;
  assert.ok(root);
  assert.equal(root.frames.length, 1);
  const frame = root.frames[0];
  assert.equal(root.activeFrameId, frame.frameId);
  assert.equal(frame.stage, "NEGATION");
  assert.equal(authoritativePending(game.code).continuation.kind, "negation");
  assert.equal(authoritativePending(game.code).causal.frameId, frame.frameId);
  assert.equal(authoritativePending(game.code).continuation.causal.frameId, frame.frameId);

  const declined = await requestAndSettle("decline_response", { code: game.code, token: host.token, preserveResponse: true });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const resumed = declined;
  assert.equal(resumed.data.room.pendingDuel.targetId, target.id);
  assert.equal(resumed.data.room.causalEnvelope.activeFrameId, frame.frameId);
  assert.equal(resumed.data.room.causalEnvelope.frames.length, 1);
  assert.equal(resumed.data.room.causalEnvelope.frames[0].stage, "DUEL_EXCHANGE");
  assert.notEqual(resumed.data.room.causalEnvelope.checkpoint.checkpointId, root.checkpoint.checkpointId);
  assert.equal(resumed.data.room.causalEnvelope.presentationRevision, root.presentationRevision + 1);
  assert.equal(JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`)).causal.frameId, frame.frameId);

  const answered = await requestAndSettle("respond", { code: game.code, token: alice.token, providerId: "card", cardId: attack.id, preserveResponse: true });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.pendingDuel.actorId, source.id);
  assert.equal(answered.data.room.causalEnvelope.activeFrameId, frame.frameId);
  assert.equal(answered.data.room.causalEnvelope.frames.length, 1, "Duel response Attack does not create a child Frame");
  const finished = await requestAndSettle("decline_response", { code: game.code, token: host.token, preserveResponse: true });
  assert.equal(finished.status, 200, JSON.stringify(finished.data));
  const final = await state(game.code, host.token);
  assert.equal(final.data.causalEnvelope, null);
});

test("FIX10 nested Duel Negation handoff skips an ineligible target in the same frame", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, , bobMember] = game.members;
  const [source, target, bob, carol] = game.room.players;
  const duel = card("Duel", "fix10-duel-handoff-source");
  const sourceNegation = card("Negation", "fix10-duel-handoff-source-negation");
  const bobNegation = card("Negation", "fix10-duel-handoff-bob");
  const targetAttack = card("Attack", "fix10-duel-handoff-target-attack");
  setHand(source.id, [duel, sourceNegation], 4, 4);
  setHand(target.id, [targetAttack], 4, 4);
  setHand(bob.id, [bobNegation], 4, 4);
  setHand(carol.id, [], 4, 4);
  setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: duel.id, targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const root = opened.data.room.causalEnvelope;
  assert.equal(root.frames.length, 1);
  const declined = await request("decline_response", { code: game.code, token: sourceMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const after = (await state(game.code, bobMember.token)).data;
  assert.equal(after.currentAction.actorId, bob.id);
  assert.equal(after.causalEnvelope.interactionId, root.interactionId);
  assert.equal(after.causalEnvelope.activeFrameId, root.activeFrameId);
  assert.equal(after.causalEnvelope.frames.length, 1);
  assert.equal(after.causalEnvelope.frames[0].stage, "NEGATION");
  assert.equal(after.causalEnvelope.frames[0].current.resolvingPlayerId, bob.id);
  assert.equal(after.causalEnvelope.presentationRevision, root.presentationRevision + 1);
  const pending = authoritativePending(game.code);
  assert.equal(pending.actorId, bob.id);
  assert.equal(pending.causal.frameId, root.activeFrameId);
  assert.equal(pending.continuation.causal.frameId, root.activeFrameId);
});

test("FIX9 physical Duel counter-Negation stays in one frame and restores the Duel", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const [source, target] = game.room.players;
  const duel = card("Duel", "fix9-duel-counter-root");
  const firstNegation = card("Negation", "fix9-duel-counter-first");
  const counterNegation = card("Negation", "fix9-duel-counter-second");
  const attack = card("Attack", "fix9-duel-counter-attack");
  setHand(source.id, [duel, firstNegation], 4, 4); setHand(target.id, [counterNegation, attack], 4, 4); setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: duel.id, targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const root = opened.data.room.causalEnvelope;
  assert.equal(root.frames.length, 1);
  assert.equal(root.frames[0].stage, "NEGATION");
  const first = await requestAndSettle("respond", { code: game.code, token: host.token, cardId: firstNegation.id, preserveResponse: true });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  const counterPrompt = await state(game.code, alice.token);
  assert.equal(counterPrompt.data.currentAction.actorId, target.id);
  const counterPending = authoritativePending(game.code);
  assert.equal(counterPending.continuation.kind, "negation");
  assert.equal(counterPending.causal.interactionId, root.interactionId);
  assert.equal(counterPending.causal.frameId, root.activeFrameId);
  assert.equal(counterPending.continuation.causal.interactionId, root.interactionId);
  assert.equal(counterPending.continuation.causal.frameId, root.activeFrameId);
  assert.equal(counterPrompt.data.causalEnvelope.frames.length, 1);
  assert.equal(counterPrompt.data.causalEnvelope.frames[0].stage, "NEGATION");
  const restored = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: counterNegation.id, preserveResponse: true });
  assert.equal(restored.status, 200, JSON.stringify(restored.data));
  assert.equal(restored.data.room.pendingDuel.actorId, target.id);
  assert.equal(restored.data.room.causalEnvelope.interactionId, root.interactionId);
  assert.equal(restored.data.room.causalEnvelope.activeFrameId, root.activeFrameId);
  assert.equal(restored.data.room.causalEnvelope.frames.length, 1);
  assert.equal(restored.data.room.causalEnvelope.frames[0].stage, "DUEL_EXCHANGE");
});

test("FIX9 Group counter-Negation stays in one frame and restores Group resolution", { timeout: 30_000 }, async () => {
  const firstNegation = card("Negation", "fix9-group-counter-first");
  const counterNegation = card("Negation", "fix9-group-counter-second");
  const opened = await openGanglieGroup({ kind: "RainingArrows", suffix: "fix9-group-counter", judge: { ...card("Dodge", "fix9-group-counter-judge"), suit: "♥", rank: "2" }, sourceExtraCards: [firstNegation], skipNegationWindows: true });
  setHand(opened.target.id, [counterNegation], 3, 3);
  const initial = await state(opened.code, opened.sourceMember.token);
  assert.equal(initial.data.currentAction.actorId, opened.source.id);
  assert.equal(initial.data.presentationV2.reactionChain?.groupTargetEffectScope?.effectState, "ACTIVE");
  const root = initial.data.causalEnvelope;
  assert.equal(root.frames.length, 1);
  assert.equal(root.frames[0].stage, "NEGATION");
  const first = await requestAndSettle("respond", { code: opened.code, token: opened.sourceMember.token, cardId: firstNegation.id, preserveResponse: true });
  assert.equal(first.status, 200, JSON.stringify(first.data));
  const counter = await state(opened.code, opened.targetMember.token);
  assert.equal(counter.data.currentAction.actorId, opened.target.id);
  const firstEvent = counter.data.timeline.find((event) => event.type === "card" && event.card?.id === firstNegation.id);
  assert.ok(firstEvent, "the committed Negation has one public card event");
  assert.deepEqual(counter.data.presentationV2.reactionChain, {
    semantics: "PROVEN",
    interactionId: root.interactionId,
    frameId: root.activeFrameId,
    rootCard: null,
    nodes: [{
      nodeId: `${root.interactionId}:${root.activeFrameId}:negation:1`,
      interactionId: root.interactionId,
      frameId: root.activeFrameId,
      causedByNodeId: null,
      actorId: opened.source.id,
      kind: "CARD_PLAY",
      object: { type: "card", cardKind: "Negation" },
    }],
    groupTargetEffectScope: {
      semantics: "PROVEN",
      relation: "GROUP_TARGET_EFFECT",
      interactionId: root.interactionId,
      groupFrameId: root.activeFrameId,
      activeFrameId: root.activeFrameId,
      checkpointId: counter.data.causalEnvelope.checkpoint.checkpointId,
      presentationRevision: counter.data.causalEnvelope.presentationRevision,
      sourceId: opened.source.id,
      cardKind: "RainingArrows",
      targetId: opened.target.id,
      effectState: "BLOCKED",
    },
    publicNodeEventLinks: [{
      nodeId: `${root.interactionId}:${root.activeFrameId}:negation:1`,
      eventId: firstEvent.id,
      resolutionId: firstEvent.resolutionId,
    }],
  }, "a submitted Negation in the Group continuation is bound to its proven Group frame");
  const counterOtherViewer = await assertProjectionMatchesEngine(opened.code, opened.sourceMember.token);
  assert.deepEqual(publicSnapshot(counterOtherViewer.presentationSnapshot), publicSnapshot(counter.data.presentationSnapshot), "the nested Group Negation history is viewer-equal");
  assert.equal(counter.data.currentAction.options?.some((option) => option.providerId === "negation_card"), true);
  assert.equal(counterOtherViewer.currentAction.options, undefined, "the non-acting Group viewer receives no private Negation options");
  const pending = authoritativePending(opened.code);
  assert.equal(pending.continuation.kind, "negation");
  assert.equal(pending.causal.interactionId, root.interactionId);
  assert.equal(pending.causal.frameId, root.activeFrameId);
  assert.equal(pending.continuation.causal.frameId, root.activeFrameId);
  assert.equal(counter.data.causalEnvelope.frames.length, 1);
  assert.equal(counter.data.causalEnvelope.frames[0].stage, "NEGATION");
  assert.equal(counter.data.presentationV2.groupResolution?.groupFrameId, root.activeFrameId);
  assert.equal(counter.data.presentationV2.groupResolution?.stage, "NEGATION");
  assert.deepEqual(counter.data.presentationV2.groupResolution?.targetIds, [opened.target.id, opened.bob.id, opened.carol.id]);
  assert.equal(counter.data.presentationV2.groupResolution?.currentParticipantId, opened.target.id);
  assert.ok(counter.data.presentationV2.groupResolution?.participantProgress?.every(({ outcome }) => outcome === undefined), "an open Negation window has no resolved outcome yet");
  assert.deepEqual(counter.data.causalEnvelope.frames[0].current.currentTargetIds, [opened.target.id]);
  assert.equal(counter.data.presentationV2.interactionScene?.continuity.relation, "SAME_FRAME");
  assert.equal(counter.data.presentationV2.interactionScene?.activeFrameId, root.activeFrameId);
  assert.equal(counter.data.presentationV2.interactionScene?.participantRoles.decisionActorId, opened.target.id);
  assert.equal(counter.data.presentationV2.interactionScene?.participantRoles.activeResolverId, opened.target.id);
  assert.equal(counter.data.presentationV2.interactionScene?.participantRoles.parentParticipantId, null);
  assert.equal(counter.data.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(counter.data.presentationV2.stableBoundary.decisionActorId, opened.target.id);
  const restored = await requestAndSettle("respond", { code: opened.code, token: opened.targetMember.token, cardId: counterNegation.id, preserveResponse: true });
  assert.equal(restored.status, 200, JSON.stringify(restored.data));
  assert.equal(restored.data.room.presentationV2.reactionChain, null, "history remains scoped to the active Negation continuation");
  assert.equal(restored.data.room.presentationSnapshot.reactionChain, null);
  assert.equal(restored.data.room.causalEnvelope.interactionId, root.interactionId);
  assert.equal(restored.data.room.causalEnvelope.activeFrameId, root.activeFrameId);
  assert.equal(restored.data.room.causalEnvelope.frames.length, 1);
  assert.equal(restored.data.room.causalEnvelope.frames[0].stage, "GROUP_RESOLUTION");
  assert.equal(restored.data.room.presentationV2.groupResolution?.groupFrameId, root.activeFrameId);
  assert.equal(restored.data.room.presentationV2.groupResolution?.activeFrameId, root.activeFrameId);
  assert.equal(restored.data.room.presentationV2.groupResolution?.stage, "GROUP_RESOLUTION");
  assert.deepEqual(restored.data.room.presentationV2.groupResolution?.targetIds, [opened.target.id, opened.bob.id, opened.carol.id]);
  assert.equal(restored.data.room.presentationV2.groupResolution?.currentParticipantId, opened.target.id);
  assert.ok(restored.data.room.presentationV2.groupResolution?.participantProgress?.every(({ outcome }) => outcome === undefined), "counter-Negation restores the effect without claiming it was cancelled");
  assert.equal(restored.data.room.presentationV2.interactionScene?.continuity.relation, "ROOT_FRAME");
});

test("UX2.7 Group Negated outcome is scoped to an authoritative AOE cancellation", { timeout: 30_000 }, async () => {
  for (const kind of ["RainingArrows", "BarbarianInvasion"]) {
    const suffix = `ux27-negated-${kind.toLowerCase()}`;
    const firstNegation = card("Negation", `${suffix}-source-negation`);
    const targetNegation = card("Negation", `${suffix}-target-negation`);
    const opened = await openGanglieGroup({
      kind,
      suffix,
      judge: { ...card("Dodge", `${suffix}-judge`), suit: "♠", rank: "7" },
      sourceExtraCards: [firstNegation],
      skipNegationWindows: true,
    });
    setHand(opened.target.id, [targetNegation], 3, 3);

    const initial = await assertProjectionMatchesEngine(opened.code, opened.sourceMember.token);
    assert.equal(initial.currentAction.actorId, opened.source.id);
    assert.ok(initial.presentationV2.groupResolution?.participantProgress?.every(({ outcome }) => outcome === undefined));
    const negated = await requestAndSettle("respond", { code: opened.code, token: opened.sourceMember.token, cardId: firstNegation.id, preserveResponse: true });
    assert.equal(negated.status, 200, `${kind}: ${JSON.stringify(negated.data)}`);

    const openWindow = await assertProjectionMatchesEngine(opened.code, opened.targetMember.token);
    assert.equal(openWindow.currentAction.actorId, opened.target.id);
    assert.equal(authoritativePending(opened.code).continuation.negated, true);
    assert.deepEqual(openWindow.presentationV2.reactionChain?.groupTargetEffectScope, {
      semantics: "PROVEN",
      relation: "GROUP_TARGET_EFFECT",
      interactionId: openWindow.causalEnvelope.interactionId,
      groupFrameId: openWindow.presentationV2.groupResolution.groupFrameId,
      activeFrameId: openWindow.presentationV2.groupResolution.activeFrameId,
      checkpointId: openWindow.causalEnvelope.checkpoint.checkpointId,
      presentationRevision: openWindow.causalEnvelope.presentationRevision,
      sourceId: opened.source.id,
      cardKind: kind,
      targetId: opened.target.id,
      effectState: "BLOCKED",
    }, `${kind}: the public counter chain is scoped to the exact current target effect`);
    assert.deepEqual(openWindow.presentationV2.groupResolution?.participantProgress?.[0], { playerId: opened.target.id, order: 1, status: "CURRENT" }, "the pending Negation is not public as a completed outcome");
    const passed = await requestAndSettle("decline_response", { code: opened.code, token: opened.targetMember.token, preserveResponse: true });
    assert.equal(passed.status, 200, `${kind}: ${JSON.stringify(passed.data)}`);

    const resumed = await assertProjectionMatchesEngine(opened.code, opened.bobMember.token);
    const participant = resumed.presentationV2.groupResolution?.participantProgress?.[0];
    assert.deepEqual(participant, { playerId: opened.target.id, order: 1, status: "RESOLVED", outcome: "NEGATED" }, `${kind}: the exact cancelled participant is resolved with a public outcome`);
    assert.equal(resumed.presentationSnapshot.groupParticipantProgress?.participants[0].outcome, "NEGATED");
    assert.equal(resumed.players.find(({ id }) => id === opened.target.id)?.hp, 3, `${kind}: cancellation prevents the target effect`);

    const otherViewer = await assertProjectionMatchesEngine(opened.code, opened.sourceMember.token);
    assert.deepEqual(publicSnapshot(otherViewer.presentationSnapshot), publicSnapshot(resumed.presentationSnapshot), `${kind}: public outcome is viewer-equal`);
    assert.deepEqual(otherViewer.presentationV2.groupResolution, resumed.presentationV2.groupResolution);
    assert.equal(otherViewer.currentAction.options, undefined, `${kind}: local response options remain private`);
  }
});

test("UX2.7 mismatched Group Negation target remains outcome-free", { timeout: 30_000 }, async () => {
  const suffix = "ux27-negated-mismatch";
  const firstNegation = card("Negation", `${suffix}-source-negation`);
  const targetNegation = card("Negation", `${suffix}-target-negation`);
  const opened = await openGanglieGroup({
    kind: "RainingArrows",
    suffix,
    judge: { ...card("Dodge", `${suffix}-judge`), suit: "♠", rank: "7" },
    sourceExtraCards: [firstNegation],
    skipNegationWindows: true,
  });
  setHand(opened.target.id, [targetNegation], 3, 3);
  const started = await requestAndSettle("respond", { code: opened.code, token: opened.sourceMember.token, cardId: firstNegation.id, preserveResponse: true });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  const livePending = authoritativePending(opened.code);
  assert.equal(livePending.continuation.negated, true);
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify({
    ...livePending,
    continuation: { ...livePending.continuation, effectTargetId: opened.bob.id },
  }))} WHERE code=${quote(opened.code)}`);

  const malformedActiveWindow = await assertProjectionMatchesEngine(opened.code, opened.targetMember.token);
  assert.equal(malformedActiveWindow.presentationV2.reactionChain, null, "a mismatched effectTargetId withholds the public target-scoped counter chain");

  const passed = await requestAndSettle("decline_response", { code: opened.code, token: opened.targetMember.token, preserveResponse: true });
  assert.equal(passed.status, 200, JSON.stringify(passed.data));
  const resumed = await assertProjectionMatchesEngine(opened.code, opened.targetMember.token);
  assert.equal(resumed.presentationV2.groupResolution?.participantProgress?.[0]?.status, "RESOLVED");
  assert.equal(resumed.presentationV2.groupResolution?.participantProgress?.[0]?.outcome, undefined, "a mismatched target identity fails closed even when the Negation chain says cancelled");
});

test("FIX9 Group NULL and ordinary Duel malformed envelopes stay non-authoritative", { timeout: 30_000 }, async () => {
  const group = await openGanglieGroup({ kind: "RainingArrows", suffix: "fix8-group-missing", judge: { ...card("Dodge", "fix8-group-missing-judge"), suit: "♥", rank: "2" } });
  sql(`UPDATE rooms SET causal_envelope_json = NULL WHERE code=${quote(group.code)}`);
  const groupBefore = (await state(group.code, group.targetMember.token)).data;
  assert.equal(groupBefore.causalEnvelope, null);
  assert.equal(groupBefore.presentationV2.interactionScene?.semantics, "UNPROVEN");
  assert.equal(groupBefore.presentationV2.interactionScene?.interactionId, null);
  const groupAfter = await requestAndSettle("decline_trigger", { code: group.code, token: group.targetMember.token, preserveResponse: true });
  assert.equal(groupAfter.status, 200, JSON.stringify(groupAfter.data));
  assert.equal(groupAfter.data.room.causalEnvelope, null);
  assert.equal(groupAfter.data.room.currentAction.kind, "response");
  assert.ok(authoritativePending(group.code).continuation.causal, "Pending keeps only its legacy context and does not rebuild the envelope");

  const duel = await createHumanGame();
  const [host, alice] = duel.members;
  const [source, target] = duel.room.players;
  const duelCard = card("Duel", "fix8-duel-missing");
  const attack = card("Attack", "fix8-duel-missing-response");
  const sourceAttack = card("Attack", "fix8-duel-missing-source-response");
  setHand(source.id, [duelCard, sourceAttack], 4, 4); setHand(target.id, [attack], 4, 4); setTurn(duel.code, source.seat);
  const started = await request("play_card", { code: duel.code, token: host.token, cardId: duelCard.id, targetId: target.id });
  assert.equal(started.status, 200, JSON.stringify(started.data));
  sql(`UPDATE rooms SET causal_envelope_json = '{"version":1,"frames":[]}' WHERE code=${quote(duel.code)}`);
  assert.equal((await state(duel.code, alice.token)).data.causalEnvelope, null);
  const answered = await requestAndSettle("respond", { code: duel.code, token: alice.token, providerId: "card", cardId: attack.id, preserveResponse: true });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  assert.equal(answered.data.room.causalEnvelope, null);
  assert.equal(answered.data.room.pendingDuel.actorId, source.id);
});

test("engine-backed Negation/counter-Negation keeps the original effect recoverable", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const [source, target] = game.room.players;
  const observer = game.members[2];
  const sourceCounter = card("Negation", "projector-negation-counter");
  const sourceCounterAgain = card("Negation", "projector-negation-counter-again");
  const firstCard = card("Negation", "projector-negation-first");
  const secondCard = card("Negation", "projector-negation-second");
  const steal = card("Steal", "projector-negation-root");
  setHand(source.id, [steal, sourceCounter, sourceCounterAgain], 5, 5);
  setHand(target.id, [card("Attack", "projector-negation-target"), firstCard, secondCard], 4, 4);
  setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: steal.id, targetId: target.id, targetCardIndex: 0 });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const sourceWindow = await request("decline_response", { code: game.code, token: host.token });
  assert.equal(sourceWindow.status, 200, JSON.stringify(sourceWindow.data));
  const sourceRoot = opened.data.room.causalEnvelope;
  const sourceWindowTargetView = (await state(game.code, alice.token)).data;
  assert.equal(sourceWindowTargetView.currentAction.actorId, target.id);
  assert.equal(sourceWindowTargetView.pendingNegation.actorId, target.id);
  assert.equal(sourceWindowTargetView.causalEnvelope.interactionId, sourceRoot.interactionId);
  assert.equal(sourceWindowTargetView.causalEnvelope.activeFrameId, sourceRoot.activeFrameId);
  assert.equal(sourceWindowTargetView.causalEnvelope.frames[0].current.resolvingPlayerId, target.id);
  assert.notEqual(sourceWindowTargetView.causalEnvelope.checkpoint.checkpointId, sourceRoot.checkpoint.checkpointId);
  assert.equal(sourceWindowTargetView.causalEnvelope.presentationRevision, sourceRoot.presentationRevision + 1);
  const first = await assertProjectionMatchesEngine(game.code, alice.token);
  const root = first.presentationV2.rootContext;
  const rootEvent = first.timeline.find((event) => event.card?.id === steal.id && event.card?.kind === "Steal" && event.action === "play");
  assert.ok(rootEvent, "the real Steal play emitted a public card event");
  const rootCard = {
    interactionId: first.causalEnvelope.interactionId,
    frameId: first.causalEnvelope.activeFrameId,
    sourceId: source.id,
    targetId: target.id,
    cardKind: "Steal",
  };
  assert.deepEqual(first.presentationV2.reactionChain, {
    semantics: "PROVEN", interactionId: first.causalEnvelope.interactionId,
    frameId: first.causalEnvelope.activeFrameId, rootCard, nodes: [],
    publicEventLinks: { root: { eventId: rootEvent.id, resolutionId: rootEvent.resolutionId }, nodes: [] },
    rootEffectState: "ACTIVE",
  }, "a pass opens no public Reaction Chain card node");
  assert.equal(authoritativePending(game.code).continuation.cardName, "Steal");
  assert.equal(authoritativePending(game.code).continuation.rootCardKind, "Steal", "root identity is retained from the server-owned effective card, not reverse-mapped from its display name");
  assert.deepEqual(first.presentationSnapshot.reactionChain?.rootCard, rootCard);
  assert.deepEqual(first.presentationSnapshot.reactionChain?.publicEventLinks, first.presentationV2.reactionChain.publicEventLinks);
  assert.equal(JSON.stringify(first.presentationSnapshot).includes("projector-negation-root"), false, "the public snapshot contains card kind but not the physical card ID");
  assert.equal(authoritativePending(game.code).continuation.negationHistory, undefined, "decline/pass is not persisted as a public reaction");
  assert.equal(authoritativePending(game.code).continuation.kind, "negation");
  assert.equal(first.causalEnvelope.frames.length, 1, "independent top-level Negation has one root frame");
  assert.equal(first.causalEnvelope.frames[0].stage, "NEGATION");
  assert.equal(first.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(first.presentationV2.interactionScene?.stage, "NEGATION");
  assert.equal(first.presentationV2.interactionScene?.continuity.relation, "ROOT_FRAME");
  assert.equal(first.presentationV2.interactionScene?.sourceId, source.id);
  assert.deepEqual(first.presentationV2.interactionScene?.targetIds, [target.id]);
  assert.equal(first.presentationV2.interactionScene?.decisionActorId, target.id);
  assert.deepEqual(first.presentationV2.interactionScene?.participantRoles, { sourceId: source.id, originalTargetIds: [target.id], activeTargetIds: [target.id], currentParticipantId: target.id, decisionActorId: target.id, activeResolverId: target.id, parentParticipantId: null, participantIds: [] });
  assert.equal(first.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(first.presentationV2.stableBoundary.decisionActorId, target.id);
  const firstRepeat = await state(game.code, alice.token);
  const firstOtherViewer = await state(game.code, host.token);
  const firstObserver = await assertProjectionMatchesEngine(game.code, observer.token);
  assert.deepEqual(publicSnapshot(firstOtherViewer.data.presentationSnapshot), publicSnapshot(first.presentationSnapshot), "root card identity is viewer-equal while local control remains private");
  assert.deepEqual(publicSnapshot(firstObserver.presentationSnapshot), publicSnapshot(first.presentationSnapshot), "public event links are identical for a third-party observer");
  assert.deepEqual(firstOtherViewer.data.presentationSnapshot.reactionChain?.rootCard, rootCard);
  assert.deepEqual(firstRepeat.data.presentationV2.interactionScene, first.presentationV2.interactionScene);
  assert.deepEqual(firstRepeat.data.presentationV2.stableBoundary, first.presentationV2.stableBoundary);
  assert.deepEqual(firstRepeat.data.presentationV2.interactionScene?.participantRoles, first.presentationV2.interactionScene?.participantRoles);
  assert.equal(firstRepeat.data.causalEnvelope.checkpoint.checkpointId, first.causalEnvelope.checkpoint.checkpointId);
  assert.equal(firstRepeat.data.causalEnvelope.presentationRevision, first.causalEnvelope.presentationRevision);
  assert.deepEqual(firstOtherViewer.data.presentationV2.interactionScene, first.presentationV2.interactionScene, "Negation public scene is viewer-stable");
  assert.deepEqual(firstOtherViewer.data.presentationV2.interactionScene?.participantRoles, first.presentationV2.interactionScene?.participantRoles);
  assert.deepEqual(firstOtherViewer.data.presentationV2.stableBoundary, first.presentationV2.stableBoundary);
  assert.ok(first.currentAction.options?.some((option) => option.providerId === "negation_card"), JSON.stringify(first.currentAction));
  assert.equal(firstOtherViewer.data.currentAction.options, undefined, "Negation options remain private to the acting viewer");
  assert.equal(first.causalEnvelope.activeFrameId, authoritativePending(game.code).causal.frameId);
  assert.equal(first.causalEnvelope.frames.length, 1);
  assert.equal(first.causalEnvelope.frames[0].stage, "NEGATION");
  assert.equal(authoritativePending(game.code).causal.frameId, first.causalEnvelope.activeFrameId);
  assert.equal(authoritativePending(game.code).continuation.causal.frameId, first.causalEnvelope.activeFrameId);
  const firstNegation = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "negation-projector-negation-first", preserveResponse: true });
  assert.equal(firstNegation.status, 200, JSON.stringify(firstNegation.data));
  const counter = await assertProjectionMatchesEngine(game.code, host.token);
  assert.equal(counter.currentAction.actorId, source.id);
  assert.deepEqual(counter.presentationSnapshot.reactionChain.rootCard, rootCard, "root identity remains bound across public Negation responses");
  assert.equal(counter.presentationSnapshot.reactionChain.nodes.length, 1);
  assert.equal(counter.presentationSnapshot.reactionChain.nodes[0].actorId, target.id);
  assert.equal(counter.presentationSnapshot.reactionChain.nodes[0].causedByNodeId, null);
  assert.equal("physicalCardId" in counter.presentationSnapshot.reactionChain.nodes[0], false, "opaque physical card IDs stay server-side");
  const publicFirstNegation = counter.timeline.find((event) => event.card?.id === firstCard.id && event.card?.kind === "Negation" && event.action === "play");
  assert.ok(publicFirstNegation, "the submitted Negation has an exact public card event");
  assert.deepEqual(counter.presentationSnapshot.reactionChain.publicEventLinks, {
    root: { eventId: rootEvent.id, resolutionId: rootEvent.resolutionId },
    nodes: [{ nodeId: counter.presentationSnapshot.reactionChain.nodes[0].nodeId, eventId: publicFirstNegation.id, resolutionId: publicFirstNegation.resolutionId }],
  });
  assert.equal(counter.presentationSnapshot.reactionChain.rootEffectState, "BLOCKED", "the first successful Negation blocks the single-target root");
  assert.equal(JSON.stringify(counter.presentationSnapshot.reactionChain.publicEventLinks).includes(firstCard.id), false, "public event links never expose physical card IDs");
  const counterOtherViewer = await assertProjectionMatchesEngine(game.code, alice.token);
  assert.deepEqual(publicSnapshot(counterOtherViewer.presentationSnapshot), publicSnapshot(counter.presentationSnapshot), "submitted card history is viewer-equal");
  assert.equal(counterOtherViewer.currentAction.options, undefined, "observer receives no local response options");
  const counterObserver = await assertProjectionMatchesEngine(game.code, observer.token);
  assert.deepEqual(publicSnapshot(counterObserver.presentationSnapshot), publicSnapshot(counter.presentationSnapshot), "root and Negation event links are viewer-equal for an observer");
  assert.equal(counter.presentationV2.rootContext?.sourceId, root?.sourceId);
  assert.equal(counter.presentationV2.rootContext?.kind, root?.kind);
  assert.deepEqual(counter.presentationV2.rootContext?.originalTargetIds, root?.originalTargetIds);
  assert.equal(counter.presentationV2.rootContext?.resolutionId, root?.resolutionId);
  assert.notEqual(counter.presentationV2.rootContext?.eventId, root?.eventId, "Negation currently references a new public event in the counter window");
  assert.equal(authoritativePending(game.code).continuation.kind, "negation");
  assert.equal(counter.presentationV2.activeContext?.kind, "negation");
  assert.equal(counter.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(counter.presentationV2.interactionScene?.stage, "NEGATION");
  assert.equal(counter.presentationV2.interactionScene?.interactionId, first.presentationV2.interactionScene?.interactionId);
  assert.equal(counter.presentationV2.interactionScene?.rootFrameId, first.presentationV2.interactionScene?.rootFrameId);
  assert.equal(counter.presentationV2.interactionScene?.continuity.relation, "ROOT_FRAME");
  assert.equal(counter.presentationV2.interactionScene?.decisionActorId, source.id);
  assert.deepEqual(counter.presentationV2.interactionScene?.participantRoles, { sourceId: source.id, originalTargetIds: [target.id], activeTargetIds: [target.id], currentParticipantId: target.id, decisionActorId: source.id, activeResolverId: source.id, parentParticipantId: null, participantIds: [] });
  const counterPending = authoritativePending(game.code);
  assert.equal(counterPending.actorId, source.id);
  assert.equal(counterPending.causal.frameId, counter.causalEnvelope.activeFrameId);
  assert.equal(counterPending.continuation.causal.frameId, counter.causalEnvelope.activeFrameId);
  assert.equal(counter.causalEnvelope.frames[0].current.resolvingPlayerId, source.id);
  assert.equal(counter.causalEnvelope.frames.length, 1);
  assert.equal(counter.causalEnvelope.frames[0].stage, "NEGATION");
  assert.equal(counter.causalEnvelope.frames[0].frameId, first.causalEnvelope.frames[0].frameId, "counter-Negation has no independently proven child frame");
  assert.equal(authoritativePending(game.code).causal.frameId, counter.causalEnvelope.activeFrameId);
  assert.equal(authoritativePending(game.code).continuation.causal.frameId, counter.causalEnvelope.activeFrameId);
  assert.equal(counter.presentationV2.parentContext, null, "engine exposes the negation effect descriptor but not a typed pending parent");

  const secondNegation = await requestAndSettle("respond", { code: game.code, token: host.token, cardId: sourceCounter.id, preserveResponse: true });
  assert.equal(secondNegation.status, 200, JSON.stringify(secondNegation.data));
  const thirdCounter = await assertProjectionMatchesEngine(game.code, alice.token);
  assert.equal(thirdCounter.currentAction.actorId, target.id);
  assert.equal(thirdCounter.presentationSnapshot.reactionChain.nodes.length, 2);
  assert.equal(thirdCounter.presentationSnapshot.reactionChain.nodes[1].causedByNodeId, thirdCounter.presentationSnapshot.reactionChain.nodes[0].nodeId);
  assert.equal(thirdCounter.presentationSnapshot.reactionChain.rootEffectState, "ACTIVE", "counter-Negation restores the root from server-owned continuation state");
  assert.equal(thirdCounter.presentationSnapshot.reactionChain.publicEventLinks.nodes.length, 2);
  assert.deepEqual(thirdCounter.presentationSnapshot.reactionChain.publicEventLinks.nodes.map(({ nodeId }) => nodeId), thirdCounter.presentationSnapshot.reactionChain.nodes.map(({ nodeId }) => nodeId));
  const thirdNegation = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: secondCard.id, preserveResponse: true });
  assert.equal(thirdNegation.status, 200, JSON.stringify(thirdNegation.data));
  const fourthCounter = await assertProjectionMatchesEngine(game.code, host.token);
  const nodes = fourthCounter.presentationSnapshot.reactionChain.nodes;
  assert.equal(fourthCounter.currentAction.actorId, source.id);
  assert.equal(nodes.length, 3);
  assert.deepEqual(nodes.map(({ causedByNodeId }) => causedByNodeId), [null, nodes[0].nodeId, nodes[1].nodeId], "each counter links to the preceding submitted Negation");

  const mismatchedEnvelope = { ...fourthCounter.causalEnvelope, interactionId: "stale-negation-interaction" };
  sql(`UPDATE rooms SET causal_envelope_json=${quote(JSON.stringify(mismatchedEnvelope))} WHERE code=${quote(game.code)}`);
  const mismatch = (await state(game.code, host.token)).data;
  assert.equal(mismatch.presentationV2.reactionChain, null);
  assert.equal(mismatch.presentationSnapshot.reactionChain, null, "history fails closed when its proven interaction identity no longer matches");
  sql(`UPDATE rooms SET causal_envelope_json=${quote(JSON.stringify(fourthCounter.causalEnvelope))} WHERE code=${quote(game.code)}`);

  const pendingWithHistory = query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`);
  const wrongFramePending = JSON.parse(pendingWithHistory);
  wrongFramePending.continuation.negationHistory[1].frameId = "different-frame";
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(wrongFramePending))} WHERE code=${quote(game.code)}`);
  const frameMismatch = (await state(game.code, host.token)).data;
  assert.equal(frameMismatch.presentationV2.reactionChain, null);
  assert.equal(frameMismatch.presentationSnapshot.reactionChain, null, "a node from a different frame fails closed");
  sql(`UPDATE rooms SET pending_json=${quote(pendingWithHistory)} WHERE code=${quote(game.code)}`);

  const wrongEventPending = JSON.parse(pendingWithHistory);
  wrongEventPending.continuation.negationHistory[1].physicalCardId = "no-matching-public-negation-event";
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(wrongEventPending))} WHERE code=${quote(game.code)}`);
  const eventMismatch = (await state(game.code, host.token)).data;
  assert.ok(eventMismatch.presentationSnapshot.reactionChain?.rootCard, "the semantic root remains available to the safe fallback");
  assert.equal(eventMismatch.presentationV2.reactionChain.publicEventLinks, undefined, "an unmatched private Negation card cannot link to a guessed timeline event");
  assert.equal(eventMismatch.presentationSnapshot.reactionChain.publicEventLinks, undefined, "the public snapshot withholds the complete graph-link proof");
  assert.equal(eventMismatch.presentationSnapshot.reactionChain.rootEffectState, undefined, "root disposition is withheld with a missing response event link");
  sql(`UPDATE rooms SET pending_json=${quote(pendingWithHistory)} WHERE code=${quote(game.code)}`);

  const wrongRootEventPending = JSON.parse(pendingWithHistory);
  const heldRootCard = wrongRootEventPending.continuation.heldCards.find((heldCard) => heldCard.kind === "Steal");
  heldRootCard.id = "no-matching-public-steal-event";
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(wrongRootEventPending))} WHERE code=${quote(game.code)}`);
  const rootEventMismatch = (await state(game.code, host.token)).data;
  assert.ok(rootEventMismatch.presentationSnapshot.reactionChain?.rootCard, "typed root semantics remain available to the safe fallback");
  assert.equal(rootEventMismatch.presentationV2.reactionChain.publicEventLinks, undefined, "an unmatched private root card cannot link to a guessed timeline event");
  assert.equal(rootEventMismatch.presentationSnapshot.reactionChain.publicEventLinks, undefined, "missing root linkage withholds the complete graph proof");
  assert.equal(rootEventMismatch.presentationSnapshot.reactionChain.rootEffectState, undefined, "root disposition is withheld with a missing root event link");
  sql(`UPDATE rooms SET pending_json=${quote(pendingWithHistory)} WHERE code=${quote(game.code)}`);

  const pendingBeforeStaleReplay = query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`);
  const staleReplay = await request("respond", { code: game.code, token: alice.token, cardId: secondCard.id });
  assert.equal(staleReplay.status, 409, JSON.stringify(staleReplay.data));
  assert.equal(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`), pendingBeforeStaleReplay, "a stale replay cannot append another public node");

  const restored = await requestAndSettle("respond", { code: game.code, token: host.token, cardId: sourceCounterAgain.id, preserveResponse: true });
  assert.equal(restored.status, 200, JSON.stringify(restored.data));
  const restoredView = await assertProjectionMatchesEngine(game.code, host.token);
  assert.equal(restoredView.presentationSnapshot.settlement?.outcome, "ROOT_RESTORED");
  assert.equal(restoredView.presentationSnapshot.settlement?.rootCardKind, "Steal");
  assert.equal(restoredView.presentationSnapshot.settlement?.sourceId, source.id);
  assert.equal(restoredView.presentationSnapshot.settlement?.targetId, target.id);
  const restoredObserver = await assertProjectionMatchesEngine(game.code, alice.token);
  assert.deepEqual(publicSnapshot(restoredObserver.presentationSnapshot), publicSnapshot(restoredView.presentationSnapshot), "root restoration proof is public and viewer-equal");
  assert.equal(JSON.stringify(restoredView.presentationSnapshot.settlement).includes("projector-negation-counter"), false, "physical Negation card IDs remain private to the persisted continuation");
});

test("single-target Negation cancellation exposes an explicit public root disposition", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, targetMember] = game.members;
  const [source, target] = game.room.players;
  const dismantle = card("Dismantle", "settlement-negation-root");
  const targetCard = card("Attack", "settlement-negation-target-card");
  const negation = card("Negation", "settlement-negation-physical-card");
  setHand(source.id, [dismantle], 4, 4);
  setHand(target.id, [targetCard, negation], 4, 4);
  for (const player of game.room.players.slice(2)) setHand(player.id, [], 4, 4);
  setTurn(game.code, source.seat);

  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: dismantle.id, targetId: target.id, targetCardIndex: 0 });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const response = await assertProjectionMatchesEngine(game.code, targetMember.token);
  assert.equal(response.currentAction.actorId, target.id);
  assert.equal(response.presentationSnapshot.settlement, null, "an open Negation window has no terminal disposition");

  const cancelled = await requestAndSettle("respond", { code: game.code, token: targetMember.token, cardId: negation.id, preserveResponse: true });
  assert.equal(cancelled.status, 200, JSON.stringify(cancelled.data));
  const cancelledView = await assertProjectionMatchesEngine(game.code, sourceMember.token);
  const settlement = cancelledView.presentationSnapshot.settlement;
  assert.equal(settlement?.outcome, "ROOT_CANCELLED");
  assert.equal(settlement?.rootCardKind, "Dismantle");
  assert.equal(settlement?.sourceId, source.id);
  assert.equal(settlement?.targetId, target.id);
  assert.equal(settlement?.resolutionId, cancelledView.presentationV2.negationSettlement?.resolutionId);
  assert.equal(JSON.stringify(settlement).includes("settlement-negation-physical-card"), false, "proof carries no physical responder card identity");
  const observer = await assertProjectionMatchesEngine(game.code, targetMember.token);
  assert.deepEqual(publicSnapshot(observer.presentationSnapshot), publicSnapshot(cancelledView.presentationSnapshot), "root cancellation proof is public and viewer-equal");
});

test("engine-backed Bumper Harvest publishes ordered progress and keeps the Negation scan actor private", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice, bob] = game.members;
  const [source, first, second, third] = game.room.players;
  const harvest = card("BumperHarvest", "progress-root");
  const aliceNegation = card("Negation", "progress-alice-negation");
  const bobNegation = card("Negation", "progress-bob-negation");
  setHand(source.id, [harvest], 4, 4);
  setHand(first.id, [aliceNegation], 4, 4);
  setHand(second.id, [bobNegation], 4, 4);
  setHand(third.id, [], 4, 4);
  setDeck(game.code, [
    card("Attack", "progress-reveal-1"),
    card("Dodge", "progress-reveal-2"),
    card("Peach", "progress-reveal-3"),
    card("Strike", "progress-reveal-4"),
  ]);
  setTurn(game.code, source.seat);

  const opened = await requestAndSettle("play_card", { code: game.code, token: host.token, cardId: harvest.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const firstWindow = await assertProjectionMatchesEngine(game.code, alice.token);
  assert.equal(firstWindow.currentAction.actorId, first.id);
  const initialProgress = firstWindow.presentationSnapshot.bumperHarvestProgress;
  assert.ok(initialProgress, JSON.stringify({ envelope: { activeFrameId: firstWindow.causalEnvelope?.activeFrameId, checkpoint: firstWindow.causalEnvelope?.checkpoint, frames: firstWindow.causalEnvelope?.frames }, scene: firstWindow.presentationV2.interactionScene, stable: firstWindow.presentationV2.stableBoundary, progress: firstWindow.presentationV2.bumperHarvestProgress }));
  assert.equal(initialProgress?.rootCardId, harvest.id);
  assert.equal(firstWindow.timeline.filter((event) => event.id === initialProgress?.rootEventId).length, 1);
  const rootEvent = firstWindow.timeline.find((event) => event.id === initialProgress?.rootEventId);
  assert.equal(rootEvent?.resolutionId, initialProgress?.rootResolutionId);
  assert.deepEqual(rootEvent?.bumperHarvestRoot, {
    semantics: "PROVEN", sourceId: source.id, cardId: harvest.id,
    interactionId: initialProgress?.interactionId, rootFrameId: initialProgress?.rootFrameId,
  });
  assert.equal(initialProgress?.currentEffectState, "ACTIVE", "an open Bumper Harvest Negation branch is public but not yet blocked");
  assert.deepEqual(initialProgress?.targetIds, game.room.players.map(({ id }) => id), "the server's turn-order declaration defines the participant sequence");
  assert.deepEqual(initialProgress?.participants.map(({ status }) => status), ["CURRENT", "PENDING", "PENDING", "PENDING"]);
  assert.equal(initialProgress?.currentParticipantId, source.id);
  assert.equal(firstWindow.presentationV2.interactionScene?.stage, "NEGATION");
  assert.equal(firstWindow.presentationV2.interactionScene?.currentParticipantId, source.id);
  assert.equal(firstWindow.presentationV2.interactionScene?.decisionActorId, null);
  assert.equal(firstWindow.presentationV2.interactionScene?.activeResolverId, null);
  assert.equal(firstWindow.presentationV2.decision?.actorId, null, "the private scan actor is not copied into PresentationV2 decision metadata");
  assert.deepEqual(firstWindow.presentationSnapshot.reactionChain?.nodes, [], "a pass or open response is not a submitted public Negation node");
  assert.equal(firstWindow.presentationSnapshot.reactionChain?.rootCard, null, "Bumper Harvest keeps its dedicated participant-progress contract");

  const observer = await assertProjectionMatchesEngine(game.code, host.token);
  assert.equal(observer.pendingNegation.actorId, null, "the observer DTO does not identify the current scan actor");
  assert.deepEqual(publicSnapshot(observer.presentationSnapshot), publicSnapshot(firstWindow.presentationSnapshot), "public Bumper Harvest authority is viewer-equal");
  assert.equal(observer.currentAction.options, undefined, "private response providers remain on the acting viewer only");

  const submitted = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: aliceNegation.id, preserveResponse: true });
  assert.equal(submitted.status, 200, JSON.stringify(submitted.data));
  const counterWindow = await assertProjectionMatchesEngine(game.code, bob.token);
  assert.equal(counterWindow.currentAction.actorId, second.id);
  assert.equal(counterWindow.presentationSnapshot.bumperHarvestProgress?.currentParticipantId, source.id, "the affected chooser remains the participant through counter-Negation");
  assert.equal(counterWindow.presentationSnapshot.bumperHarvestProgress?.currentEffectState, "BLOCKED", "a committed public Negation blocks only the current Bumper participant branch");
  assert.deepEqual(counterWindow.presentationSnapshot.reactionChain?.nodes.map(({ actorId }) => actorId), [first.id], "only the submitted Negation appears in public history");
  assert.equal(counterWindow.presentationSnapshot.reactionChain?.publicNodeEventLinks?.length, 1, "the public Negation node links to its exact played card event");
  assert.equal(counterWindow.presentationSnapshot.reactionChain?.rootCard, null, "Bumper Harvest response history does not acquire a single-target root card");
  assert.equal("physicalCardId" in counterWindow.presentationSnapshot.reactionChain.nodes[0], false);
  assert.equal(counterWindow.presentationV2.interactionScene?.decisionActorId, null);
  assert.equal(counterWindow.presentationV2.interactionScene?.activeResolverId, null);
  const counterObserver = await assertProjectionMatchesEngine(game.code, host.token);
  assert.deepEqual(publicSnapshot(counterObserver.presentationSnapshot), publicSnapshot(counterWindow.presentationSnapshot));
  assert.equal(counterObserver.pendingNegation.actorId, null);

  sql(`UPDATE players SET alive=0,hp=0 WHERE id=${quote(third.id)}`);
  const counterPassed = await request("decline_response", { code: game.code, token: bob.token });
  assert.equal(counterPassed.status, 200, JSON.stringify(counterPassed.data));
  let nextWindow = await assertProjectionMatchesEngine(game.code, bob.token);
  let progress = nextWindow.presentationSnapshot.bumperHarvestProgress;
  assert.equal(progress?.currentParticipantId, first.id, "the following participant becomes current after the preceding choice is negated");
  assert.deepEqual(progress?.participants.map(({ status, outcome }) => ({ status, outcome: outcome ?? null })), [
    { status: "RESOLVED", outcome: "NEGATED" },
    { status: "CURRENT", outcome: null },
    { status: "PENDING", outcome: null },
    { status: "NO_LONGER_APPLICABLE", outcome: null },
  ]);
  assert.equal(nextWindow.presentationV2.interactionScene?.decisionActorId, null);
  assert.equal(nextWindow.presentationV2.interactionScene?.activeResolverId, null);
  assert.equal(nextWindow.presentationV2.stableBoundary.kind, "SPECIAL");

  const storedPending = query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`);
  const malformedRootPending = JSON.parse(storedPending);
  malformedRootPending.continuation.effect.pending.participantProgress.rootEventId = "unrelated-public-event";
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(malformedRootPending))} WHERE code=${quote(game.code)}`);
  const malformedRoot = (await state(game.code, host.token)).data;
  assert.equal(malformedRoot.presentationV2.bumperHarvestProgress, null, "an unbound root event identity fails closed");
  assert.equal(malformedRoot.presentationSnapshot.bumperHarvestProgress, null);
  sql(`UPDATE rooms SET pending_json=${quote(storedPending)} WHERE code=${quote(game.code)}`);
  const malformedPending = JSON.parse(storedPending);
  malformedPending.continuation.effect.pending.participantProgress.participants[0].playerId = "forged-participant";
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(malformedPending))} WHERE code=${quote(game.code)}`);
  const malformed = (await state(game.code, host.token)).data;
  assert.equal(malformed.presentationV2.bumperHarvestProgress, null, "progress whose order no longer matches the causal root fails closed");
  assert.equal(malformed.presentationSnapshot.bumperHarvestProgress, null);
  sql(`UPDATE rooms SET pending_json=${quote(storedPending)} WHERE code=${quote(game.code)}`);

  const currentWindowPassed = await request("decline_response", { code: game.code, token: bob.token });
  assert.equal(currentWindowPassed.status, 200, JSON.stringify(currentWindowPassed.data));
  const choice = await assertProjectionMatchesEngine(game.code, alice.token);
  assert.equal(choice.currentAction.actorId, first.id);
  assert.equal(choice.presentationV2.interactionScene?.stage, "SEQUENTIAL_CHOICE");
  assert.equal(choice.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(choice.presentationSnapshot.bumperHarvestProgress?.participants[0].outcome, "NEGATED");
  const activeChoicePending = authoritativePending(game.code);
  assert.equal(activeChoicePending.kind, "harvest");
  assert.ok(activeChoicePending.choiceDeadlineAt - Date.now() <= 60_000 && activeChoicePending.choiceDeadlineAt - Date.now() > 59_000, "the server starts a fresh 60-second deadline when the chooser becomes active");
  assert.equal(choice.pendingHarvest.countdownUntil, activeChoicePending.choiceDeadlineAt, "the viewer projection exposes the same server-owned chooser deadline");
  const publicChoice = (await state(game.code, host.token)).data;
  assert.equal(publicChoice.pendingHarvest.countdownUntil, activeChoicePending.choiceDeadlineAt, "the public countdown is consistent for a non-chooser viewer");

  const availableBeforeExpiry = [...activeChoicePending.availableIds];
  const expiredChoicePending = { ...activeChoicePending, choiceDeadlineAt: Date.now() - 1 };
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(expiredChoicePending))} WHERE code=${quote(game.code)}`);
  const expiredChoice = await request("advance_timers", { code: game.code, token: host.token });
  assert.equal(expiredChoice.status, 200, JSON.stringify(expiredChoice.data));
  assert.equal(expiredChoice.data.room.pendingHarvest.complete, false);
  assert.equal(expiredChoice.data.room.pendingHarvest.actorId, first.id, "expiry does not skip the active chooser");
  assert.equal(expiredChoice.data.room.currentAction.actorId, first.id, "the same server-owned chooser decision remains active at zero");
  assert.deepEqual(authoritativePending(game.code).availableIds, availableBeforeExpiry, "expiry does not silently take or discard a revealed card");

  const chosen = authoritativePending(game.code).availableIds[0];
  const chooserContext = {
    actionRevision: expiredChoice.data.room.actionRevision,
    meId: first.id,
    phase: "response",
    pendingKind: "harvest",
    actorId: first.id,
  };
  const preview = await requestAndSettle("preview_harvest", { code: game.code, token: alice.token, cardId: chosen, context: chooserContext });
  assert.equal(preview.status, 200, JSON.stringify(preview.data));
  assert.equal(preview.data.room.actionRevision, chooserContext.actionRevision, "changing the uncommitted Harvest preview does not stale the same chooser decision");
  const picked = await requestAndSettle("choose_harvest", { code: game.code, token: alice.token, cardId: chosen, context: chooserContext });
  assert.equal(picked.status, 200, JSON.stringify(picked.data));
  nextWindow = await assertProjectionMatchesEngine(game.code, bob.token);
  progress = nextWindow.presentationSnapshot.bumperHarvestProgress;
  assert.equal(progress?.participants[1].status, "RESOLVED");
  assert.equal(progress?.participants[1].outcome, "CHOSE_CARD");
  assert.equal(progress?.participants[2].status, "CURRENT");
  assert.equal(progress?.currentParticipantId, second.id);

  const finalNegationPassed = await request("decline_response", { code: game.code, token: bob.token });
  assert.equal(finalNegationPassed.status, 200, JSON.stringify(finalNegationPassed.data));
  const finalChoice = await assertProjectionMatchesEngine(game.code, bob.token);
  assert.equal(finalChoice.currentAction.actorId, second.id);
  const finalChoicePending = authoritativePending(game.code);
  assert.ok(finalChoicePending.choiceDeadlineAt - Date.now() <= 60_000 && finalChoicePending.choiceDeadlineAt - Date.now() > 59_000, "each next active chooser gets a new 60-second window");
  assert.equal(finalChoice.pendingHarvest.countdownUntil, finalChoicePending.choiceDeadlineAt);
  const finalCardId = authoritativePending(game.code).availableIds[0];
  const finalPicked = await requestAndSettle("choose_harvest", { code: game.code, token: bob.token, cardId: finalCardId });
  assert.equal(finalPicked.status, 200, JSON.stringify(finalPicked.data));
  const complete = await assertProjectionMatchesEngine(game.code, host.token);
  const terminalProgress = complete.presentationSnapshot.bumperHarvestProgress;
  assert.equal(terminalProgress?.currentParticipantId, null);
  assert.deepEqual(terminalProgress?.participants.map(({ status, outcome }) => ({ status, outcome: outcome ?? null })), [
    { status: "RESOLVED", outcome: "NEGATED" },
    { status: "RESOLVED", outcome: "CHOSE_CARD" },
    { status: "RESOLVED", outcome: "CHOSE_CARD" },
    { status: "NO_LONGER_APPLICABLE", outcome: null },
  ]);
  assert.equal(complete.presentationV2.stableBoundary.kind, "SPECIAL");
  const completedPending = authoritativePending(game.code);
  assert.equal(completedPending.completeAt > 0, true);
  assert.equal(completedPending.choiceDeadlineAt, undefined, "the active-choice deadline is cleared before the distinct closing hold");
  assert.deepEqual(completedPending.remainingIds, [], "the terminal public checkpoint has no unresolved remaining actors");
  const settlement = complete.presentationSnapshot.bumperHarvestSettlements?.[0];
  assert.ok(settlement, "the terminal chooser checkpoint publishes one root-bound settlement proof");
  assert.equal(settlement.rootEventId, terminalProgress.rootEventId);
  assert.equal(settlement.rootResolutionId, terminalProgress.rootResolutionId);
  assert.equal(settlement.interactionId, terminalProgress.interactionId);
  assert.equal(settlement.rootFrameId, terminalProgress.rootFrameId);
  assert.deepEqual(settlement.participants, terminalProgress.participants);
  assert.equal(JSON.stringify(settlement).includes(finalCardId), false, "settlement does not reveal the acquired physical card identity");
  const settlementRoot = complete.timeline.find((event) => event.id === settlement.rootEventId);
  assert.deepEqual(settlementRoot.bumperHarvestRoot, {
    semantics: "PROVEN", sourceId: source.id, cardId: harvest.id,
    interactionId: settlement.interactionId, rootFrameId: settlement.rootFrameId,
  }, "the root event carries the same server-proven interaction/frame identity");
  const settlementObserver = await assertProjectionMatchesEngine(game.code, alice.token);
  assert.deepEqual(publicSnapshot(settlementObserver.presentationSnapshot).bumperHarvestSettlements, [settlement], "settlement is viewer-equal");

  const duePending = { ...completedPending, completeAt: Date.now() - 1 };
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(duePending))} WHERE code=${quote(game.code)}`);
  const closed = await request("advance_timers", { code: game.code, token: host.token });
  assert.equal(closed.status, 200, JSON.stringify(closed.data));
  assert.equal(closed.data.room.pending, null);
  assert.equal(closed.data.room.causalEnvelope, null, "the completed Bumper Harvest causal identity is cleared atomically");
  const afterClose = await assertProjectionMatchesEngine(game.code, bob.token);
  assert.deepEqual(afterClose.presentationSnapshot.bumperHarvestSettlements, [settlement], "the exact public settlement survives causal cleanup");
});

test("FIX10 initial Negation skips ineligible seats without a fake blocker checkpoint", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember, , blockerMember] = game.members;
  const [source, skipped, blocker, final] = game.room.players;
  const drawTwo = card("DrawTwo", "fix10-initial-source");
  const negation = card("Negation", "fix10-initial-blocker");
  setHand(source.id, [drawTwo], 4, 4);
  setHand(skipped.id, [], 4, 4);
  setHand(blocker.id, [negation], 4, 4);
  setHand(final.id, [], 4, 4);
  setTurn(game.code, source.seat);

  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: drawTwo.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const view = (await state(game.code, blockerMember.token)).data;
  assert.equal(view.currentAction.actorId, blocker.id);
  assert.equal(view.pendingNegation.actorId, blocker.id);
  assert.equal(view.causalEnvelope.frames.length, 1);
  assert.equal(view.causalEnvelope.frames[0].current.resolvingPlayerId, blocker.id);
  assert.equal(view.causalEnvelope.presentationRevision, 0, "initial creation and skipped-seat scan expose one meaningful checkpoint");
  const pending = authoritativePending(game.code);
  assert.equal(pending.actorId, blocker.id);
  assert.equal(pending.causal.frameId, view.causalEnvelope.activeFrameId);
  assert.equal(pending.continuation.causal.frameId, view.causalEnvelope.activeFrameId);

  const armed = await request("start_response_timer", { code: game.code, token: blockerMember.token });
  assert.equal(armed.status, 200, JSON.stringify(armed.data));
  assert.equal(armed.data.room.causalEnvelope.presentationRevision, view.causalEnvelope.presentationRevision, "arming the same actor does not create a semantic checkpoint");
});

test("FIX10 Negation decline skips an ineligible seat and advances one causal checkpoint", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember] = game.members;
  const [source, skipped, blocker, final] = game.room.players;
  const drawTwo = card("DrawTwo", "fix10-decline-source");
  const sourceNegation = card("Negation", "fix10-decline-source-negation");
  const blockerNegation = card("Negation", "fix10-decline-blocker");
  setHand(source.id, [drawTwo, sourceNegation], 4, 4);
  setHand(skipped.id, [], 4, 4);
  setHand(blocker.id, [blockerNegation], 4, 4);
  setHand(final.id, [], 4, 4);
  setTurn(game.code, source.seat);

  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: drawTwo.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const before = opened.data.room;
  const beforeEnvelope = before.causalEnvelope;
  assert.equal(before.currentAction.actorId, source.id);
  const declined = await request("decline_response", { code: game.code, token: sourceMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  const after = (await state(game.code, game.members[2].token)).data;
  assert.equal(after.currentAction.actorId, blocker.id);
  assert.equal(after.pendingNegation.actorId, blocker.id);
  assert.equal(after.causalEnvelope.interactionId, beforeEnvelope.interactionId);
  assert.equal(after.causalEnvelope.activeFrameId, beforeEnvelope.activeFrameId);
  assert.equal(after.causalEnvelope.frames[0].current.resolvingPlayerId, blocker.id);
  assert.notEqual(after.causalEnvelope.checkpoint.checkpointId, beforeEnvelope.checkpoint.checkpointId);
  assert.equal(after.causalEnvelope.presentationRevision, beforeEnvelope.presentationRevision + 1);
  const pending = authoritativePending(game.code);
  assert.equal(pending.actorId, blocker.id);
  assert.equal(pending.causal.frameId, after.causalEnvelope.activeFrameId);
  assert.equal(pending.continuation.causal.frameId, after.causalEnvelope.activeFrameId);
  assert.notEqual(after.causalEnvelope.frames[0].current.resolvingPlayerId, skipped.id);
});

test("FIX10 Negation timeout skips an ineligible seat and advances one causal checkpoint", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [sourceMember] = game.members;
  const [source, skipped, blocker, final] = game.room.players;
  const drawTwo = card("DrawTwo", "fix10-timeout-source");
  const sourceNegation = card("Negation", "fix10-timeout-source-negation");
  const blockerNegation = card("Negation", "fix10-timeout-blocker");
  setHand(source.id, [drawTwo, sourceNegation], 4, 4);
  setHand(skipped.id, [], 4, 4);
  setHand(blocker.id, [blockerNegation], 4, 4);
  setHand(final.id, [], 4, 4);
  setTurn(game.code, source.seat);

  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: drawTwo.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const before = opened.data.room;
  sql(`UPDATE rooms SET pending_json=json_set(pending_json, '$.deadline', ${Date.now() - 1}) WHERE code=${quote(game.code)}`);
  const timedOut = await request("advance_timers", { code: game.code, token: sourceMember.token });
  assert.equal(timedOut.status, 200, JSON.stringify(timedOut.data));
  const after = (await state(game.code, game.members[2].token)).data;
  assert.equal(after.currentAction.actorId, blocker.id);
  assert.equal(after.pendingNegation.actorId, blocker.id);
  assert.equal(after.causalEnvelope.interactionId, before.causalEnvelope.interactionId);
  assert.equal(after.causalEnvelope.activeFrameId, before.causalEnvelope.activeFrameId);
  assert.equal(after.causalEnvelope.frames[0].current.resolvingPlayerId, blocker.id);
  assert.equal(after.causalEnvelope.presentationRevision, before.causalEnvelope.presentationRevision + 1);
  assert.equal(authoritativePending(game.code).continuation.causal.frameId, after.causalEnvelope.activeFrameId);
  assert.notEqual(after.causalEnvelope.frames[0].current.resolvingPlayerId, skipped.id);
});

test("engine-backed Judgement replacement exposes reveal and resume evidence", { timeout: 30_000 }, async () => {
  const original = { ...card("Dodge", "projector-judgement-original"), suit: "♠", rank: "7" };
  const replacement = { ...card("Peach", "projector-judgement-replacement"), suit: "♥", rank: "Q" };
  const setup = await prepareGuoJudgement({ original, replacement });
  const opened = await request("draw", { code: setup.game.code, token: setup.guoMember.token });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  await waitForState(setup.game.code, setup.simaMember.token, (view) => view.currentAction?.triggerEvent === "judgement_revealed");
  const revealView = await assertProjectionMatchesEngine(setup.game.code, setup.simaMember.token);
  const revealPending = authoritativePending(setup.game.code);
  const judgementRoot = revealView.causalEnvelope;
  assert.ok(judgementRoot, "delayed Judgement creates its causal root before Necromancy");
  assert.equal(judgementRoot.frames.length, 1);
  assert.equal(judgementRoot.frames[0].stage, "JUDGEMENT");
  assert.equal(judgementRoot.frames[0].current.resolvingPlayerId, setup.sima.id);
  assert.equal(revealPending.kind, "trigger");
  assert.equal(revealPending.continuation.kind, "judgement_revealed_event");
  assert.equal(revealPending.continuation.judgement.revealedEventId !== undefined, true);
  assert.equal(revealPending.actorId, setup.sima.id);
  assert.equal(revealPending.causal.interactionId, judgementRoot.interactionId);
  assert.equal(revealPending.continuation.judgement.causal.frameId, judgementRoot.activeFrameId);
  assert.equal(revealView.presentationV2.activeContext?.kind, "judgement_revealed_event");
  assert.equal(revealView.presentationV2.parentContext?.kind, "delayed");
  assert.equal(revealView.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(revealView.presentationV2.interactionScene?.stage, "JUDGEMENT");
  assert.equal(revealView.presentationV2.interactionScene?.interactionId, judgementRoot.interactionId);
  assert.equal(revealView.presentationV2.interactionScene?.rootFrameId, judgementRoot.activeFrameId);
  assert.equal(revealView.presentationV2.interactionScene?.activeResolverId, setup.sima.id);
  assert.equal(revealView.presentationV2.interactionScene?.decisionActorId, setup.sima.id);
  assert.deepEqual(revealView.presentationV2.interactionScene?.participantRoles, { sourceId: setup.guo.id, originalTargetIds: [setup.guo.id], activeTargetIds: [setup.guo.id], currentParticipantId: setup.guo.id, decisionActorId: setup.sima.id, activeResolverId: setup.sima.id, parentParticipantId: null, participantIds: [] });
  assert.equal(revealView.presentationV2.stableBoundary.kind, "CHOICE");
  assert.equal(revealView.presentationV2.stableBoundary.decisionActorId, setup.sima.id);
  const revealRepeat = await state(setup.game.code, setup.simaMember.token);
  const revealOtherViewer = await state(setup.game.code, setup.guoMember.token);
  assert.deepEqual(revealRepeat.data.presentationV2.interactionScene, revealView.presentationV2.interactionScene);
  assert.deepEqual(revealRepeat.data.presentationV2.stableBoundary, revealView.presentationV2.stableBoundary);
  assert.deepEqual(revealOtherViewer.data.presentationV2.interactionScene, revealView.presentationV2.interactionScene, "Judgement public scene is viewer-stable");
  assert.deepEqual(revealOtherViewer.data.presentationV2.stableBoundary, revealView.presentationV2.stableBoundary);
  assert.equal(revealOtherViewer.data.currentAction.options, undefined, "Judgement replacement options remain private to the acting viewer");
  const replaced = await requestAndSettle("trigger", { code: setup.game.code, token: setup.simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  const effective = await assertProjectionMatchesEngine(setup.game.code, setup.guoMember.token);
  assert.equal(effective.causalEnvelope.interactionId, judgementRoot.interactionId, "Necromancy stays in the Judgement Interaction");
  assert.notEqual(effective.causalEnvelope.checkpoint.checkpointId, revealView.causalEnvelope.checkpoint.checkpointId, "effective Judgement advances the semantic checkpoint");
  assert.equal(effective.causalEnvelope.presentationRevision, revealView.causalEnvelope.presentationRevision + 1, "effective Judgement advances presentationRevision once");
  assert.equal(effective.causalEnvelope.activeFrameId, judgementRoot.activeFrameId, "Necromancy stays in the Judgement Frame");
  assert.equal(effective.causalEnvelope.frames[0].stage, "JUDGEMENT");
  assert.equal(authoritativePending(setup.game.code).continuation.kind, "judgement_effective_event");
  assert.equal(effective.presentationV2.activeContext?.kind, "judgement_effective_event");
  assert.equal(effective.presentationV2.parentContext?.kind, "delayed");
  assert.equal(effective.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(effective.presentationV2.interactionScene?.interactionId, revealView.presentationV2.interactionScene?.interactionId);
  assert.equal(effective.presentationV2.interactionScene?.rootFrameId, revealView.presentationV2.interactionScene?.rootFrameId);
  assert.equal(effective.presentationV2.interactionScene?.stage, "JUDGEMENT");
  assert.equal(effective.presentationV2.interactionScene?.participantRoles.decisionActorId, authoritativePending(setup.game.code).actorId);
  assert.ok(effective.timeline.some((event) => event.id === revealPending.continuation.judgement.revealedEventId));
  const effectivePending = authoritativePending(setup.game.code);
  const effectiveActor = setup.game.room.players.find((player) => player.id === effectivePending.actorId);
  const effectiveActorMember = setup.game.members.find((member) => member.name === effectiveActor?.name);
  assert.ok(effectiveActorMember, JSON.stringify(effectivePending));
  const resumed = await requestAndSettle("decline_trigger", { code: setup.game.code, token: effectiveActorMember.token, preserveResponse: true });
  assert.equal(resumed.status, 200, JSON.stringify(resumed.data));
  assert.equal(resumed.data.room.causalEnvelope, null, "the completed delayed Judgement clears its causal identity");
  assert.deepEqual(resumed.data.room.presentationV2.stableBoundary, { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null });
});

test("engine-backed delayed Judgement families share the same initial public checkpoint", { timeout: 30_000 }, async () => {
  const families = [
    ["Lightning", "lightning", "lightning", "♠"],
    ["Overindulgence", "overindulgence", "overindulgence", "♠"],
    ["RationsDepleted", "rations", "rations_depleted", "♠"],
  ];
  for (const [kind, purposeKey, purpose, delayedSuit] of families) {
    const original = { ...card("Dodge", `family-${purposeKey}-original`), suit: "♥", rank: "Q" };
    const replacement = card("Peach", `family-${purposeKey}-replacement`, "♥");
    const setup = await prepareGuoJudgement({ original, replacement, purposeCard: card(kind, `family-${purposeKey}-delayed`, delayedSuit) });
    const opened = await request("draw", { code: setup.game.code, token: setup.guoMember.token });
    assert.equal(opened.status, 200, `${kind}: ${JSON.stringify(opened.data)}`);
    await waitForState(setup.game.code, setup.simaMember.token, (view) => view.currentAction?.triggerEvent === "judgement_revealed");
    const revealView = await assertProjectionMatchesEngine(setup.game.code, setup.simaMember.token);
    const otherView = (await state(setup.game.code, setup.guoMember.token)).data;
    const pending = authoritativePending(setup.game.code);
    const scene = revealView.presentationV2.interactionScene;
    assert.equal(pending?.continuation?.judgement?.purpose, purpose, `${kind}: continuation keeps the delayed purpose`);
    assert.equal(scene?.stage, "JUDGEMENT", `${kind}: stage`);
    assert.equal(scene?.sourceId, setup.guo.id, `${kind}: semantic source`);
    assert.equal(scene?.currentParticipantId, setup.guo.id, `${kind}: current participant`);
    assert.equal(scene?.decisionActorId, setup.sima.id, `${kind}: replacement actor`);
    assert.equal(scene?.activeResolverId, setup.sima.id, `${kind}: active resolver`);
    assert.equal(revealView.presentationV2.stableBoundary.kind, "CHOICE", `${kind}: choice boundary`);
    assert.ok(revealView.timeline.some((event) => event.type === "card" && event.action === "reveal" && event.card.id === original.id), `${kind}: public reveal identity`);
    assert.ok(otherView.timeline.some((event) => event.type === "card" && event.action === "reveal" && event.card.id === original.id), `${kind}: public reveal identity is viewer-equal`);
    assert.deepEqual(otherView.presentationV2.interactionScene, scene, `${kind}: public scene is viewer-equal`);
    assert.deepEqual(otherView.presentationV2.stableBoundary, revealView.presentationV2.stableBoundary, `${kind}: stable boundary is viewer-equal`);
    assert.deepEqual(revealView.currentAction.triggerOptions?.map((option) => option.effectId) ?? [], ["sima_yi_guicai"], `${kind}: eligible replacement is projected to Sima Yi`);
    assert.deepEqual(revealView.currentAction.triggerOptions?.[0]?.selection?.eligibleCardIds, [replacement.id], `${kind}: replacement card key stays exact for the acting viewer`);
    assert.deepEqual(otherView.currentAction.triggerOptions ?? [], [], `${kind}: other viewers receive no private trigger option`);
    assert.equal(otherView.timeline.some((event) => event.card?.id === replacement.id), false, `${kind}: replacement identity does not enter the public timeline`);
  }
});

test("malformed Judgement envelope stays non-authoritative through legacy resume", { timeout: 30_000 }, async () => {
  const setup = await prepareGuoJudgement({ original: { ...card("Dodge", "malformed-judgement-original"), suit: "♠", rank: "7" } });
  const opened = await request("draw", { code: setup.game.code, token: setup.guoMember.token });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const revealPending = authoritativePending(setup.game.code);
  assert.ok(["judgement_revealed_event", "judgement_effective_event"].includes(revealPending?.continuation?.kind));
  const actorMember = setup.game.members.find((member) => member.playerId === revealPending.actorId) ?? (revealPending.actorId === setup.sima.id ? setup.simaMember : setup.guoMember);
  sql(`UPDATE rooms SET causal_envelope_json = '{"version":1,"frames":[{"frameId":"forged"}]}' WHERE code=${quote(setup.game.code)}`);
  const declined = await requestAndSettle("decline_trigger", { code: setup.game.code, token: actorMember.token });
  assert.equal(declined.status, 200, JSON.stringify(declined.data));
  assert.equal(declined.data.room.causalEnvelope, null, "malformed authority is not reconstructed from Judgement continuation data");
  assert.notEqual(declined.data.room.phase, "response", "legacy delayed Judgement resumes without a stranded decision");
});

test("engine-backed Oath exposes a viewer-equal living wounded recipient scope and fails closed on mismatches", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, wounded, healthy, defeated] = game.room.players;
  const [sourceMember, woundedMember] = game.members;
  const oath = card("Oath", "oath-scope-source");
  const negation = card("Negation", "oath-scope-negation");
  setHand(source.id, [oath], 2, 4);
  setHand(wounded.id, [negation], 1, 4);
  setHand(healthy.id, [], 4, 4);
  setHand(defeated.id, [], 0, 4);
  sql(`UPDATE players SET alive=0,hp=0 WHERE id=${quote(defeated.id)}`);
  setTurn(game.code, source.seat);

  const opened = await request("play_card", { code: game.code, token: sourceMember.token, cardId: oath.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const pending = authoritativePending(game.code);
  assert.equal(pending?.kind, "response");
  assert.equal(pending?.continuation?.kind, "negation");
  assert.equal(pending?.continuation?.effect?.kind, "oath");

  const responderView = await assertProjectionMatchesEngine(game.code, woundedMember.token);
  const scope = responderView.presentationV2.oathRecipientScope;
  const oathRootMatches = responderView.timeline.filter((event) => event.type === "card"
    && event.action === "play" && event.card?.kind === "Oath"
    && event.resolutionId === pending.continuation.resolutionId);
  assert.equal(oathRootMatches.length, 1, "the live Oath continuation resolves to exactly one public root-card play");
  const oathRootEvent = oathRootMatches[0];
  assert.deepEqual(scope, {
    semantics: "PROVEN",
    cardKind: "Oath",
    interactionId: responderView.causalEnvelope.interactionId,
    rootFrameId: responderView.causalEnvelope.frames[0].frameId,
    activeFrameId: responderView.causalEnvelope.activeFrameId,
    checkpointId: responderView.causalEnvelope.checkpoint.checkpointId,
    presentationRevision: responderView.causalEnvelope.presentationRevision,
    rootEventId: oathRootEvent.id,
    rootResolutionId: pending.continuation.resolutionId,
    effectState: "ACTIVE",
    sourceId: source.id,
    recipientIds: [source.id, wounded.id],
  });
  const oathRootEvents = responderView.timeline.filter((event) => event.id === scope.rootEventId);
  assert.equal(oathRootEvents.length, 1);
  assert.equal(oathRootEvents[0].type, "card");
  assert.equal(oathRootEvents[0].action, "play");
  assert.equal(oathRootEvents[0].card.kind, "Oath");
  assert.equal(oathRootEvents[0].resolutionId, scope.rootResolutionId);
  assert.deepEqual(responderView.presentationSnapshot.oathRecipientScope, scope);
  assert.equal(responderView.presentationSnapshot.reactionChain?.rootCard, null, "Oath continues using its separate recipient-scope contract");
  assert.deepEqual(responderView.presentationSnapshot.reactionChain?.publicNodeEventLinks, [], "the Oath root remains distinct while an open window has no submitted Negation nodes");
  assert.deepEqual(responderView.presentationSnapshot.oathRecipientScope.recipientIds, [source.id, wounded.id], "the wounded source participates while full-health and defeated characters do not");
  assert.deepEqual(responderView.presentationV2.interactionScene.targetIds, [source.id], "the causal root's self-target does not replace Oath's separate all-wounded recipient scope");
  assert.equal("currentParticipantId" in scope, false, "simultaneous Oath recovery does not invent sequential progress");
  assert.equal("participantProgress" in scope, false);
  assert.equal(JSON.stringify(scope).includes("oath-scope-negation"), false, "private physical response-card identity is absent");

  const oathProjectionInput = {
    pending,
    currentAction: responderView.currentAction,
    actionRevision: responderView.actionRevision,
    timeline: responderView.timeline,
    causalEnvelope: responderView.causalEnvelope,
    oathRecipientIds: oathRecipientIds(responderView.players.map((player) => ({ id: player.id, alive: player.alive, hp: player.hp, maxHp: player.maxHp }))),
  };
  assert.equal(projectPresentationV2({ ...oathProjectionInput, timeline: responderView.timeline.filter((event) => event.id !== scope.rootEventId) }).oathRecipientScope, null, "the Oath scope fails closed when its exact public root event is absent");
  assert.equal(projectPresentationV2({ ...oathProjectionInput, pending: { ...pending, continuation: { ...pending.continuation, resolutionId: "unlinked-oath-resolution" } } }).oathRecipientScope, null, "the Oath scope cannot attach to an event by card kind alone");

  const sourceView = await assertProjectionMatchesEngine(game.code, sourceMember.token);
  assert.deepEqual(publicSnapshot(sourceView.presentationSnapshot), publicSnapshot(responderView.presentationSnapshot), "Oath scope is identical across viewers");
  assert.equal(sourceView.currentAction.options, undefined, "another viewer receives no private Negation options");

  const envelopeJson = query(`SELECT causal_envelope_json FROM rooms WHERE code=${quote(game.code)}`);
  const originalEnvelope = JSON.parse(envelopeJson);
  sql(`UPDATE rooms SET causal_envelope_json=${quote(JSON.stringify({ ...originalEnvelope, interactionId: "mismatched-oath-interaction" }))} WHERE code=${quote(game.code)}`);
  const mismatchedEnvelope = (await state(game.code, sourceMember.token)).data;
  assert.equal(mismatchedEnvelope.presentationV2.oathRecipientScope, null, "the persisted Oath continuation cannot attach to a different public Interaction ID");
  assert.equal(mismatchedEnvelope.presentationSnapshot.oathRecipientScope, null);
  sql(`UPDATE rooms SET causal_envelope_json=${quote(envelopeJson)} WHERE code=${quote(game.code)}`);

  const pendingJson = query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`);
  const wrongEffectPending = JSON.parse(pendingJson);
  wrongEffectPending.continuation.effect = { kind: "draw_two", cardId: oath.id };
  sql(`UPDATE rooms SET pending_json=${quote(JSON.stringify(wrongEffectPending))} WHERE code=${quote(game.code)}`);
  const wrongEffect = (await state(game.code, sourceMember.token)).data;
  assert.equal(wrongEffect.presentationV2.oathRecipientScope, null, "another Stratagem discriminator cannot claim the Oath scope");
  assert.equal(wrongEffect.presentationSnapshot.oathRecipientScope, null);
  sql(`UPDATE rooms SET pending_json=${quote(pendingJson)} WHERE code=${quote(game.code)}`);

  const resolved = await requestAndSettle("decline_response", { code: game.code, token: woundedMember.token });
  assert.equal(resolved.status, 200, JSON.stringify(resolved.data));
  assert.equal(resolved.data.room.players.find((player) => player.id === source.id)?.hp, 3, "the wounded source receives the same recovery selected for public scope");
  assert.equal(resolved.data.room.players.find((player) => player.id === wounded.id)?.hp, 2);
  assert.equal(resolved.data.room.players.find((player) => player.id === healthy.id)?.hp, 4);
  assert.equal(resolved.data.room.players.find((player) => player.id === defeated.id)?.hp, 0);
});
