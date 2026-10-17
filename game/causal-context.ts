import type { CausalEnvelope, CausalFrame, CausalFrameCurrent, CausalFrameOrigin } from "./presentation-causality";
import { createCausalEnvelope, createCausalFrame, createChildCausalFrame, switchActiveCausalFrame } from "../app/api/causal-envelope.ts";

/**
 * The small causal handle persisted beside a Pending/Continuation.  It is a
 * reference, not a copy of the public envelope and never contains private
 * cards, legal choices, or viewer-specific data.
 */
export type CausalContext = {
  readonly interactionId: string;
  readonly frameId: string;
  readonly parentFrameId?: string | null;
  readonly causeNodeId?: string;
};

export type CausalRootInput = {
  stage: CausalFrame["stage"];
  origin: CausalFrameOrigin;
  current: CausalFrameCurrent;
};

export function createCausalRoot(input: CausalRootInput): { envelope: CausalEnvelope; context: CausalContext } {
  const frame = createCausalFrame(input);
  const envelope = createCausalEnvelope({ frames: [frame], activeFrameId: frame.frameId });
  return { envelope, context: contextFor(envelope, frame.frameId) };
}

export function contextFor(envelope: CausalEnvelope, frameId = envelope.activeFrameId, causeNodeId?: string): CausalContext {
  const frame = envelope.frames.find((candidate) => candidate.frameId === frameId);
  if (!frame) throw new Error(`Unknown causal frame: ${frameId}`);
  return { interactionId: envelope.interactionId, frameId, ...(frame.parentFrameId ? { parentFrameId: frame.parentFrameId } : {}), ...(causeNodeId ? { causeNodeId } : {}) };
}

export function childCausalFrame(envelope: CausalEnvelope, input: CausalRootInput & { causeNodeId?: string }): { envelope: CausalEnvelope; context: CausalContext } {
  const next = createChildCausalFrame(envelope, input);
  return { envelope: next, context: contextFor(next, next.activeFrameId, input.causeNodeId) };
}

export function resumeCausalFrame(envelope: CausalEnvelope, context: CausalContext): { envelope: CausalEnvelope; context: CausalContext } {
  if (!context.parentFrameId) return { envelope, context };
  const next = switchActiveCausalFrame(envelope, context.parentFrameId);
  return { envelope: next, context: contextFor(next) };
}

export function causalEnvelopeForContext(envelope: CausalEnvelope | null, context: CausalContext | undefined): CausalEnvelope | null {
  if (!context) return envelope;
  if (envelope?.interactionId === context.interactionId && envelope.frames.some((frame) => frame.frameId === context.frameId)) return envelope;
  return null;
}

/** Best-effort recovery for a persisted pending record whose room envelope is missing. */
export function recoverCausalEnvelope(context: CausalContext | undefined, input: CausalRootInput): CausalEnvelope | null {
  if (!context) return null;
  const frame = createCausalFrame({ ...input, frameId: context.frameId, parentFrameId: context.parentFrameId });
  return createCausalEnvelope({ interactionId: context.interactionId, frames: [frame], activeFrameId: frame.frameId });
}
