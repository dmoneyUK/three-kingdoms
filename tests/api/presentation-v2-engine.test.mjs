import test from "node:test";
import { projectPresentationV2 } from "../../game/presentation-v2.ts";
import {
  assert, card, createHumanGame, openBorrowedSwordScenario, query, quote, request, requestAndSettle, setHand, setTurn, state,
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
