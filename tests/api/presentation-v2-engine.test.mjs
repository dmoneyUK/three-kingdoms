import test from "node:test";
import { projectPresentationV2 } from "../../game/presentation-v2.ts";
import {
  assert, card, createHumanGame, openBorrowedSwordScenario, openGanglieGroup, prepareGuoJudgement, query, quote, request, requestAndSettle, setEquipment, setHand, setTurn, sql, state, waitForState,
} from "./test-support.mjs";

function authoritativePending(code) {
  const raw = query(`SELECT pending_json FROM rooms WHERE code=${quote(code)}`);
  return raw ? JSON.parse(raw) : null;
}

function assertProjectionMatchesEngine(code, token) {
  return state(code, token).then(({ data: view }) => {
    const expected = projectPresentationV2({ pending: authoritativePending(code), currentAction: view.currentAction, actionRevision: view.actionRevision, timeline: view.timeline });
    assert.deepEqual(view.presentationV2, expected, "route presentationV2 is projected from the persisted engine state");
    return view;
  });
}

test("engine-backed Attack/Dodge exposes authoritative decision and legacy resolution reference", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const [sourceMember, targetMember] = game.members;
  const attack = card("Attack", "engine-projector-attack");
  const dodge = card("Dodge", "engine-projector-dodge");
  setHand(source.id, [attack], 4, 4); setHand(target.id, [dodge], 4, 4); setTurn(game.code, source.seat);
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
  const otherView = (await state(game.code, game.members[2].token)).data;
  assert.deepEqual(otherView.presentationV2.rootContext, targetView.presentationV2.rootContext);
  assert.deepEqual(otherView.presentationV2.activeContext, targetView.presentationV2.activeContext);
  assert.equal(otherView.currentAction.options, undefined, "private response options remain viewer-private");
  const responded = await requestAndSettle("respond", { code: game.code, token: targetMember.token, providerId: "card", cardId: dodge.id });
  assert.equal(responded.status, 200, JSON.stringify(responded.data));
  await assertProjectionMatchesEngine(game.code, sourceMember.token);
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
  assert.equal(view.currentAction.deadline, 0);
  assert.equal(view.currentAction.presentation.readyAfterEventId, null, "Borrowed Sword currently has no explicit readyAfterEventId at the forced-Attack response boundary");
  const armed = await requestAndSettle("start_response_timer", { code: scenario.game.code, token: scenario.alice.token });
  assert.equal(armed.status, 200);
  const armedView = (await state(scenario.game.code, scenario.alice.token)).data;
  assert.ok(armedView.currentAction.deadline > 0);
  const reconnect = (await state(scenario.game.code, scenario.host.token)).data;
  assert.equal(reconnect.currentAction.deadline, armedView.currentAction.deadline);
  assert.deepEqual(reconnect.presentationV2.rootContext, armedView.presentationV2.rootContext);
  assert.equal(reconnect.currentAction.options, undefined);
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
  const beforeReconnect = (await state(game.code, game.members[2].token)).data;
  assert.deepEqual(beforeReconnect.presentationV2.rootContext, view.presentationV2.rootContext);
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
  const resumed = await requestAndSettle("decline_trigger", { code: opened.code, token: opened.targetMember.token, preserveResponse: true });
  assert.equal(resumed.status, 200, JSON.stringify(resumed.data));
  const next = await state(opened.code, opened.bobMember.token);
  assert.equal(next.data.currentAction.kind, "response");
  const nextPending = authoritativePending(opened.code);
  assert.equal(nextPending?.continuation?.kind, "group");
  assert.equal(next.data.presentationV2.activeContext?.kind, "group");
  assert.equal(next.data.presentationV2.groupResolution?.semantics, "UNPROVEN");
  assert.deepEqual(next.data.presentationV2.groupResolution?.participantIds, nextPending.continuation.remainingIds);
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
  assert.equal(first.currentAction.actorId, target.id);
  assert.equal(authoritativePending(game.code).continuation.kind, "duel");
  const answered = await request("respond", { code: game.code, token: alice.token, providerId: "card", cardId: firstAttack.id });
  assert.equal(answered.status, 200, JSON.stringify(answered.data));
  const second = await assertProjectionMatchesEngine(game.code, host.token);
  assert.equal(second.currentAction.kind, "response");
  assert.equal(second.currentAction.actorId, source.id);
  assert.notEqual(second.actionRevision, firstRevision);
  assert.equal(second.presentationV2.rootContext?.sourceId, firstRoot?.sourceId, "actor alternation preserves the root source");
  assert.equal(second.presentationV2.rootContext?.kind, firstRoot?.kind, "actor alternation preserves the root kind");
  assert.notEqual(second.presentationV2.rootContext?.resolutionId, firstRoot?.resolutionId, "Duel response transitions currently allocate a new legacy resolution reference");
  assert.equal(second.presentationV2.activeContext?.kind, "duel");
  assert.deepEqual(second.presentationV2.activeContext?.currentTargetIds, [target.id]);
});

test("engine-backed Negation/counter-Negation keeps the original effect recoverable", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [host, alice] = game.members;
  const [source, target] = game.room.players;
  setHand(source.id, [card("Dismantle", "projector-negation-root"), card("Negation", "projector-negation-counter")], 5, 5);
  setHand(target.id, [card("Attack", "projector-negation-target"), card("Negation", "projector-negation-first")], 4, 4);
  setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: host.token, cardId: "dismantle-projector-negation-root", targetId: target.id, targetCardIndex: 0 });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const sourceWindow = await request("decline_response", { code: game.code, token: host.token });
  assert.equal(sourceWindow.status, 200, JSON.stringify(sourceWindow.data));
  const first = await assertProjectionMatchesEngine(game.code, alice.token);
  const root = first.presentationV2.rootContext;
  assert.equal(authoritativePending(game.code).continuation.kind, "negation");
  const firstNegation = await requestAndSettle("respond", { code: game.code, token: alice.token, cardId: "negation-projector-negation-first", preserveResponse: true });
  assert.equal(firstNegation.status, 200, JSON.stringify(firstNegation.data));
  const counter = await assertProjectionMatchesEngine(game.code, host.token);
  assert.equal(counter.currentAction.actorId, source.id);
  assert.equal(counter.presentationV2.rootContext?.sourceId, root?.sourceId);
  assert.equal(counter.presentationV2.rootContext?.kind, root?.kind);
  assert.deepEqual(counter.presentationV2.rootContext?.originalTargetIds, root?.originalTargetIds);
  assert.equal(counter.presentationV2.rootContext?.resolutionId, root?.resolutionId);
  assert.notEqual(counter.presentationV2.rootContext?.eventId, root?.eventId, "Negation currently references a new public event in the counter window");
  assert.equal(authoritativePending(game.code).continuation.kind, "negation");
  assert.equal(counter.presentationV2.activeContext?.kind, "negation");
  assert.equal(counter.presentationV2.parentContext, null, "engine exposes the negation effect descriptor but not a typed pending parent");
  const restored = await requestAndSettle("respond", { code: game.code, token: host.token, cardId: "negation-projector-negation-counter", preserveResponse: true });
  assert.equal(restored.status, 200, JSON.stringify(restored.data));
});

test("engine-backed Judgement replacement exposes reveal and resume evidence", { timeout: 30_000 }, async () => {
  const original = { ...card("Dodge", "projector-judgement-original"), suit: "♠", rank: "7" };
  const replacement = { ...card("Peach", "projector-judgement-replacement"), suit: "♥", rank: "Q" };
  const setup = await prepareGuoJudgement({ original, replacement });
  const opened = await request("draw", { code: setup.game.code, token: setup.guoMember.token });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  await waitForState(setup.game.code, setup.guoMember.token, (view) => view.currentAction?.triggerEvent === "judgement_revealed");
  const revealView = await assertProjectionMatchesEngine(setup.game.code, setup.simaMember.token);
  const revealPending = authoritativePending(setup.game.code);
  assert.equal(revealPending.kind, "trigger");
  assert.equal(revealPending.continuation.kind, "judgement_revealed_event");
  assert.equal(revealPending.continuation.judgement.revealedEventId !== undefined, true);
  assert.equal(revealView.presentationV2.activeContext?.kind, "judgement_revealed_event");
  assert.equal(revealView.presentationV2.parentContext?.kind, "delayed");
  const replaced = await requestAndSettle("trigger", { code: setup.game.code, token: setup.simaMember.token, providerId: "sima_yi_guicai", cardId: replacement.id });
  assert.equal(replaced.status, 200, JSON.stringify(replaced.data));
  const effective = await assertProjectionMatchesEngine(setup.game.code, setup.guoMember.token);
  assert.equal(authoritativePending(setup.game.code).continuation.kind, "judgement_effective_event");
  assert.equal(effective.presentationV2.activeContext?.kind, "judgement_effective_event");
  assert.equal(effective.presentationV2.parentContext?.kind, "delayed");
  assert.ok(effective.timeline.some((event) => event.id === revealPending.continuation.judgement.revealedEventId));
});
