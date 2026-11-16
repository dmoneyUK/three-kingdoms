import test from "node:test";
import assert from "node:assert/strict";
import { provenEntourageDecision, isEntourageDodgeFor, entourageInvocationMatchesTimeline } from "../game/entourage-presentation.ts";
import { provenAttackDodgeResponses } from "../game/presentation-snapshot.ts";

function fixture() {
  const identity = { interactionId: "attack-i", rootFrameId: "attack-f", checkpointId: "checkpoint", presentationRevision: 1 };
  const invocation = { semantics: "PROVEN", providerId: "cao_cao_hujia", invocationEventId: "invocation", requesterId: "cao", requesterHeroId: "cao-cao", requesterRole: "Lord", rootEventId: "attack", rootCardId: "physical-attack", rootResolutionId: "resolution", sourceId: "source", interactionId: "attack-i", rootFrameId: "attack-f", committedIdentity: identity };
  const helper = { ...invocation, helperActorId: "helper", helperHeroId: "simayi" };
  const causal = { interactionId: identity.interactionId, frameId: identity.rootFrameId };
  const pending = { kind: "response", actorId: "helper", causal, requirement: { kind: "dodge", targetId: "cao" }, delegation: { kind: "dodge", providerId: "cao_cao_hujia", requesterId: "cao", publicEntourage: helper, remainingActorIds: ["secret-future-helper"] }, continuation: { kind: "attack", causal, targetId: "cao", sourceId: "source", rootEventId: "attack", sequenceStartCardId: "physical-attack" } };
  const envelope = { version: 1, interactionId: "attack-i", activeFrameId: "attack-f", checkpoint: { checkpointId: "checkpoint", frameId: "attack-f", stage: "ATTACK_RESPONSE" }, presentationRevision: 1, frames: [{ frameId: "attack-f", stage: "ATTACK_RESPONSE", origin: { originSourceId: "source", originEffect: "Attack", originalTargetIds: ["cao"] }, current: { currentSourceId: "source", currentEffect: "Attack", currentTargetIds: ["cao"], resolvingPlayerId: "cao" } }] };
  const timeline = [{ type: "card", id: "attack", card: { id: "physical-attack", kind: "Attack" }, action: "play", resolutionId: "resolution" }, { type: "message", id: "invocation", entourageInvocation: invocation, resolutionId: "resolution", publicFact: { semantics: "PROVEN", visibility: "PUBLIC", category: "SKILL_USED", actorId: "cao", rootEventId: "attack", interactionId: "attack-i", frameId: "attack-f", committedIdentity: identity } }];
  const proof = { semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT", interactionId: "attack-i", rootFrameId: "attack-f", rootEventId: "attack", rootResolutionId: "resolution", rootSourceId: "source", targetId: "cao", responseActorId: "helper", rootCardKind: "Attack", responseCardKind: "Dodge", responseEventId: "dodge-event", responseResolutionId: "resolution", entourage: { ...helper, responseEventId: "dodge-event", responseCardId: "physical-dodge" } };
  return { pending, envelope, timeline, helper, proof };
}
test("Entourage proves only its current helper and preserves the original resolver", () => {
  const f = fixture(); const decision = provenEntourageDecision(f.pending, f.envelope, f.timeline);
  assert.equal(decision.helperActorId, "helper"); assert.equal(decision.requesterId, "cao");
  assert.equal(f.envelope.frames[0].current.resolvingPlayerId, "cao");
  assert.equal(JSON.stringify(decision).includes("secret-future-helper"), false);
});
test("Entourage fails closed for wrong root, helper, faction, checkpoint, duplicate invocation or missing public commitment", () => {
  for (const mutate of [
    (f) => { f.pending.continuation.rootEventId = "wrong"; },
    (f) => { f.pending.actorId = "wrong"; },
    (f) => { f.pending.delegation.publicEntourage.helperHeroId = "liu-bei"; },
    (f) => { f.envelope.checkpoint.frameId = "wrong"; },
    (f) => { f.envelope.frames[0].current.resolvingPlayerId = "helper"; },
    (f) => { f.timeline.push({ ...f.timeline[1], id: "second" }); },
    (f) => { f.timeline[1].publicFact.visibility = "PRIVATE"; },
  ]) { const f = fixture(); mutate(f); assert.equal(provenEntourageDecision(f.pending, f.envelope, f.timeline), null); }
});
test("delegated Dodge cannot weaken the ordinary target/author invariant", () => {
  const { proof, timeline } = fixture();
  assert.equal(isEntourageDodgeFor(proof), true);
  assert.equal(entourageInvocationMatchesTimeline(proof.entourage, timeline), true);
  assert.equal(provenAttackDodgeResponses([proof]).length, 1);
  for (const altered of [
    { ...proof, entourage: undefined },
    { ...proof, responseActorId: "other" },
    { ...proof, targetId: "other" },
    { ...proof, rootEventId: "other" },
    { ...proof, entourage: { ...proof.entourage, helperHeroId: "liu-bei" } },
    { ...proof, entourage: { ...proof.entourage, responseEventId: "other" } },
  ]) assert.equal(provenAttackDodgeResponses([altered]).length, 0);
  assert.equal(provenAttackDodgeResponses([proof, proof]).length, 0);
  assert.equal(provenAttackDodgeResponses([{ ...proof, responseActorId: "cao", entourage: undefined }]).length, 1);
});
