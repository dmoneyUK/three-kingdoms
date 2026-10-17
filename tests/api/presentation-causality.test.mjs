import test from "node:test";
import {
  assert, card, createHumanGame, discardIds, query, quote, request, setHand, setTurn, sql, state,
} from "./test-support.mjs";
import { createCausalEnvelope, createCausalFrame } from "../../app/api/causal-envelope.ts";

test("real Attack causal envelope is stable across room reads and viewers", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const attack = card("Attack", "causal-persist-attack");
  const dodge = card("Dodge", "causal-persist-dodge");
  setHand(source.id, [attack], 4, 4);
  setHand(target.id, [dodge], 4, 4);
  setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: game.members[0].token, cardId: attack.id, targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const openedEnvelope = opened.data.room.causalEnvelope;
  assert.ok(openedEnvelope, "normal Attack response persists its root causal envelope");
  assert.equal(openedEnvelope.frames.length, 1);
  const persistedPending = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(persistedPending.continuation.causal.interactionId, openedEnvelope.interactionId);
  assert.equal(persistedPending.continuation.causal.frameId, openedEnvelope.activeFrameId);
  assert.equal(query(`SELECT causal_envelope_json FROM rooms WHERE code=${quote(game.code)}`), JSON.stringify(openedEnvelope));

  const reloadedActingView = (await state(game.code, game.members[1].token)).data;
  const reloadedSecondViewer = (await state(game.code, game.members[2].token)).data;
  for (const view of [reloadedActingView, reloadedSecondViewer]) {
    assert.equal(view.causalEnvelope.interactionId, openedEnvelope.interactionId);
    assert.equal(view.causalEnvelope.activeFrameId, openedEnvelope.activeFrameId);
    assert.equal(view.causalEnvelope.checkpoint.checkpointId, openedEnvelope.checkpoint.checkpointId);
    assert.equal(view.causalEnvelope.presentationRevision, openedEnvelope.presentationRevision);
  }
  const activeFrame = openedEnvelope.frames.find((frame) => frame.frameId === openedEnvelope.activeFrameId);
  assert.equal(reloadedActingView.presentationV2.interactionScene?.semantics, "PROVEN");
  assert.equal(reloadedActingView.presentationV2.interactionScene?.interactionId, openedEnvelope.interactionId);
  assert.equal(reloadedActingView.presentationV2.interactionScene?.rootFrameId, activeFrame.frameId);
  assert.equal(reloadedActingView.presentationV2.interactionScene?.stage, "ATTACK_RESPONSE");
  assert.equal(reloadedActingView.presentationV2.interactionScene?.sourceId, source.id);
  assert.deepEqual(reloadedActingView.presentationV2.interactionScene?.targetIds, [target.id]);
  assert.equal(reloadedActingView.presentationV2.interactionScene?.currentParticipantId, target.id);
  assert.equal(reloadedActingView.presentationV2.interactionScene?.activeResolverId, target.id);
  assert.equal(reloadedActingView.presentationV2.interactionScene?.decisionActorId, target.id);
  assert.deepEqual(reloadedSecondViewer.presentationV2.interactionScene, reloadedActingView.presentationV2.interactionScene);

});

test("manually persisted valid causal envelope projects identically across viewers", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const attack = card("Attack", "manual-projection-attack");
  const dodge = card("Dodge", "manual-projection-dodge");
  setHand(source.id, [attack], 4, 4); setHand(target.id, [dodge], 4, 4); setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: game.members[0].token, cardId: attack.id, targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const frame = createCausalFrame({
    frameId: "persisted-frame",
    stage: "ATTACK_RESPONSE",
    origin: { originSourceId: source.id, originEffect: "Attack", originalTargetIds: [target.id] },
    current: { currentSourceId: source.id, currentEffect: "Attack", currentTargetIds: [target.id], resolvingPlayerId: target.id },
  });
  const envelope = createCausalEnvelope({ interactionId: "persisted-interaction", frames: [frame], activeFrameId: frame.frameId, checkpoint: { frameId: frame.frameId, stage: frame.stage }, presentationRevision: 12 });
  sql(`UPDATE rooms SET causal_envelope_json=${quote(JSON.stringify(envelope))} WHERE code=${quote(game.code)}`);

  const actingView = (await state(game.code, game.members[1].token)).data;
  const waitingView = (await state(game.code, game.members[2].token)).data;
  assert.deepEqual(actingView.causalEnvelope, envelope);
  assert.deepEqual(waitingView.causalEnvelope, envelope);
  assert.equal(actingView.causalEnvelope.interactionId, "persisted-interaction");
  assert.equal(actingView.causalEnvelope.activeFrameId, "persisted-frame");
  assert.equal(actingView.causalEnvelope.checkpoint.checkpointId, envelope.checkpoint.checkpointId);
  assert.equal(actingView.causalEnvelope.presentationRevision, 12);
  assert.ok(actingView.currentAction.options?.length, "acting viewer receives private response options");
  assert.equal(waitingView.currentAction.options, undefined, "waiting viewer does not receive private response options");
  assert.deepEqual(waitingView.causalEnvelope, actingView.causalEnvelope, "private projection does not alter public envelope");
  assert.equal(query(`SELECT causal_envelope_json FROM rooms WHERE code=${quote(game.code)}`), JSON.stringify(envelope));
});

test("legacy room without causal envelope remains null through production room state", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  sql(`UPDATE rooms SET causal_envelope_json=NULL WHERE code=${quote(game.code)}`);
  const view = (await state(game.code, game.members[0].token)).data;
  assert.equal(view.causalEnvelope, null);
});

test("malformed room envelope remains non-authoritative", { timeout: 30_000 }, async () => {
  const game = await createHumanGame();
  const [source, target] = game.room.players;
  const attack = card("Attack", "malformed-mid-continuation-attack");
  const dodge = card("Dodge", "malformed-mid-continuation-dodge");
  setHand(source.id, [attack], 4, 4); setHand(target.id, [dodge], 4, 4); setTurn(game.code, source.seat);
  const opened = await request("play_card", { code: game.code, token: game.members[0].token, cardId: attack.id, targetId: target.id });
  assert.equal(opened.status, 200, JSON.stringify(opened.data));
  const root = opened.data.room.causalEnvelope;
  assert.ok(root);
  const pendingBeforeCorruption = JSON.parse(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`));
  assert.equal(pendingBeforeCorruption.continuation.causal.interactionId, root.interactionId);
  sql(`UPDATE rooms SET causal_envelope_json=${quote(JSON.stringify({ version: 1, frames: [{ frameId: "forged" }] }))} WHERE code=${quote(game.code)}`);
  assert.equal((await state(game.code, game.members[1].token)).data.causalEnvelope, null);
  assert.equal((await state(game.code, game.members[1].token)).data.presentationV2.interactionScene, null);
  const continued = await request("respond", { code: game.code, token: game.members[1].token, providerId: "card", cardId: dodge.id });
  assert.equal(continued.status, 200, JSON.stringify(continued.data));
  assert.equal(continued.data.room.causalEnvelope, null, "the continuation does not reconstruct authority from Pending context");
  assert.equal(query(`SELECT pending_json FROM rooms WHERE code=${quote(game.code)}`), "", "the corrupted continuation still settles normally");
  assert.equal(discardIds(game.code).filter((id) => id === dodge.id).length, 1, "the real Dodge is consumed exactly once");
});
