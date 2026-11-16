import type { CausalEnvelope } from "./presentation-causality";
import type { PresentationSemanticIdentity } from "./presentation-semantics";
import { STANDARD_HEROES } from "./heroes";

export type EntourageInvocation = {
  semantics: "PROVEN";
  providerId: "cao_cao_hujia";
  invocationEventId: string;
  requesterId: string;
  requesterHeroId: "cao-cao";
  requesterRole: "Lord";
  rootEventId: string;
  rootCardId: string;
  rootResolutionId: string;
  sourceId: string;
  interactionId: string;
  rootFrameId: string;
  committedIdentity: PresentationSemanticIdentity;
};
export type EntourageHelper = EntourageInvocation & { helperActorId: string; helperHeroId: string };
export type EntourageDecision = EntourageHelper & { stage: "ATTACK_RESPONSE"; identity: PresentationSemanticIdentity };
export type EntourageDodge = EntourageHelper & { responseEventId: string; responseCardId: string };
type RecordValue = Record<string, unknown>;
const rec = (v: unknown): RecordValue | null => v && typeof v === "object" && !Array.isArray(v) ? v as RecordValue : null;
const id = (v: unknown): v is string => typeof v === "string" && v.length > 0;
export function isEntourageInvocation(v: unknown): v is EntourageInvocation {
  const p = rec(v); const identity = rec(p?.committedIdentity);
  return Boolean(p && identity && p.semantics === "PROVEN" && p.providerId === "cao_cao_hujia"
    && p.requesterHeroId === "cao-cao" && p.requesterRole === "Lord"
    && [p.invocationEventId, p.requesterId, p.rootEventId, p.rootCardId, p.rootResolutionId, p.sourceId, p.interactionId, p.rootFrameId].every(id)
    && p.sourceId !== p.requesterId && identity?.interactionId === p.interactionId
    && identity.rootFrameId === p.rootFrameId && id(identity.checkpointId)
    && Number.isSafeInteger(identity.presentationRevision) && (identity.presentationRevision as number) >= 0);
}
export function isEntourageHelper(v: unknown): v is EntourageHelper {
  const p = rec(v);
  return isEntourageInvocation(v) && id(p?.helperActorId) && p.helperActorId !== p.requesterId
    && STANDARD_HEROES.some((hero) => hero.id === p.helperHeroId && hero.faction === "Wei");
}
export function entourageInvocationMatchesTimeline(p: EntourageInvocation, timeline: readonly unknown[]): boolean {
  if (!isEntourageInvocation(p)) return false;
  const events = timeline.map(rec).filter((event): event is RecordValue => event !== null);
  const roots = events.filter((event) => event.id === p.rootEventId);
  const invocations = events.filter((event) => event.id === p.invocationEventId);
  const sameRootInvocations = events.filter((event) => rec(event.entourageInvocation)?.rootEventId === p.rootEventId);
  const [root] = roots; const [event] = invocations; const fact = rec(event?.publicFact);
  const invocation = rec(event?.entourageInvocation);
  const rootCards = root?.card ? [rec(root.card)] : Array.isArray(root?.cards) ? root.cards.map(rec) : [];
  return roots.length === 1 && invocations.length === 1 && sameRootInvocations.length === 1 && root?.action === "play"
    && root.presentation !== false && !root.privateToPlayerId && root.resolutionId === p.rootResolutionId
    && rootCards.some((card) => card?.id === p.rootCardId)
    && event?.type === "message" && event.presentation !== false && !event.privateToPlayerId
    && event.resolutionId === p.rootResolutionId && isEntourageInvocation(invocation)
    && Object.keys(invocation).every((key) => JSON.stringify((invocation as unknown as RecordValue)[key]) === JSON.stringify((p as unknown as RecordValue)[key]))
    && fact?.semantics === "PROVEN" && fact.visibility === "PUBLIC" && fact.category === "SKILL_USED"
    && fact.actorId === p.requesterId && fact.rootEventId === p.rootEventId
    && fact.interactionId === p.interactionId && fact.frameId === p.rootFrameId
    && rec(fact.committedIdentity)?.checkpointId === p.committedIdentity.checkpointId;
}
export function provenEntourageDecision(pending: unknown, envelope: CausalEnvelope | null, timeline: readonly unknown[]): EntourageDecision | null {
  const pendingRecord = rec(pending); const d = rec(pendingRecord?.delegation); const p = d?.publicEntourage;
  if (!isEntourageHelper(p) || !envelope || !entourageInvocationMatchesTimeline(p, timeline)) return null;
  const c = rec(pendingRecord?.continuation); const requirement = rec(pendingRecord?.requirement);
  const causal = rec(pendingRecord?.causal); const continuationCausal = rec(c?.causal);
  const frame = envelope.frames.find((item) => item.frameId === p.rootFrameId);
  if (pendingRecord?.kind !== "response" || d?.providerId !== p.providerId || d.requesterId !== p.requesterId
    || d.kind !== "dodge" || pendingRecord.actorId !== p.helperActorId
    || c?.kind !== "attack" || c.targetId !== p.requesterId || c.sourceId !== p.sourceId
    || c.rootEventId !== p.rootEventId || c.sequenceStartCardId !== p.rootCardId
    || requirement?.kind !== "dodge" || requirement.targetId !== p.requesterId
    || causal?.interactionId !== p.interactionId || causal?.frameId !== p.rootFrameId
    || continuationCausal?.interactionId !== p.interactionId || continuationCausal?.frameId !== p.rootFrameId
    || envelope.interactionId !== p.interactionId || envelope.activeFrameId !== p.rootFrameId
    || envelope.checkpoint.frameId !== p.rootFrameId || envelope.checkpoint.stage !== "ATTACK_RESPONSE"
    || frame?.parentFrameId != null || frame?.stage !== "ATTACK_RESPONSE"
    || frame.origin.originSourceId !== p.sourceId || frame.origin.originalTargetIds.length !== 1
    || frame.origin.originalTargetIds[0] !== p.requesterId || frame.current.resolvingPlayerId !== p.requesterId
    || frame.current.currentSourceId !== p.sourceId || frame.current.currentTargetIds.length !== 1
    || frame.current.currentTargetIds[0] !== p.requesterId
    || envelope.presentationRevision < p.committedIdentity.presentationRevision) return null;
  return { ...p, stage: "ATTACK_RESPONSE", identity: { interactionId: p.interactionId, rootFrameId: p.rootFrameId,
    checkpointId: envelope.checkpoint.checkpointId, presentationRevision: envelope.presentationRevision } };
}
export function isEntourageDodgeFor(proof: unknown): boolean {
  const outer = rec(proof); const p = outer?.entourage;
  if (!isEntourageHelper(p)) return false;
  const response = rec(p);
  return Boolean(id(response?.responseEventId) && id(response?.responseCardId)
    && outer?.interactionId === p.interactionId && outer.rootFrameId === p.rootFrameId
    && outer.rootEventId === p.rootEventId && outer.rootResolutionId === p.rootResolutionId
    && outer.rootSourceId === p.sourceId && outer.targetId === p.requesterId && outer.responseActorId === p.helperActorId
    && (outer.responseEventId === undefined || outer.responseEventId === response?.responseEventId));
}

/** Snapshot consumers must bind the public helper to the current server checkpoint. */
export function entourageDecisionMatchesSnapshot(value: unknown, identityValue: unknown, sceneValue: unknown): value is EntourageDecision {
  if (!isEntourageHelper(value)) return false;
  const decision = rec(value); const identity = rec(identityValue); const scene = rec(sceneValue);
  const current = rec(decision?.identity);
  return Boolean(decision?.stage === "ATTACK_RESPONSE" && scene?.semantics === "PROVEN"
    && scene.stage === "ATTACK_RESPONSE" && scene.interactionId === value.interactionId && scene.rootFrameId === value.rootFrameId
    && scene.decisionActorId === value.helperActorId && Array.isArray(scene.targetIds)
    && scene.targetIds.length === 1 && scene.targetIds[0] === value.requesterId
    && identity?.interactionId === value.interactionId && identity.checkpointId === current?.checkpointId
    && identity.presentationRevision === current?.presentationRevision && current?.interactionId === value.interactionId
    && current.rootFrameId === value.rootFrameId && scene.checkpointId === current.checkpointId
    && scene.presentationRevision === current.presentationRevision);
}
