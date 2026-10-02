import test from "node:test";
import {
  assert, card, createHumanGame, query, quote, request, setHand, setTurn, sql, state,
} from "./test-support.mjs";
import { createCausalEnvelope, createCausalFrame } from "../../app/api/causal-envelope.ts";

test("D1 causal envelope survives production room reload and stays public across viewers", { timeout: 30_000 }, async () => {
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
  sql(`UPDATE rooms SET causal_envelope_json=${quote(JSON.stringify({ version: 1, frames: [{ frameId: "forged" }] }))} WHERE code=${quote(game.code)}`);
  const view = (await state(game.code, game.members[0].token)).data;
  assert.equal(view.causalEnvelope, null, "malformed persisted identity is not projected as authority");
});
