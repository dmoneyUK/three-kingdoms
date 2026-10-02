import type { CausalCheckpoint, CausalEnvelope, CausalFrame, CausalFrameCurrent, CausalFrameOrigin, CheckpointId, FrameId, InteractionId, PresentationRevision, PresentationStage } from "../../game/presentation-causality";

/** Server/orchestrator-only opaque constructors. Projection never calls these. */
export function createCausalId(): string { return crypto.randomUUID(); }
export function createInteractionId(): InteractionId { return createCausalId(); }
export function createFrameId(): FrameId { return createCausalId(); }
export function createCheckpointId(): CheckpointId { return createCausalId(); }

export function createCausalFrame(input: { frameId?: FrameId; parentFrameId?: FrameId | null; stage: CausalFrame["stage"]; origin: CausalFrameOrigin; current: CausalFrameCurrent }): CausalFrame {
  return { frameId: input.frameId ?? createFrameId(), parentFrameId: input.parentFrameId ?? null, stage: input.stage, origin: { ...input.origin, originalTargetIds: [...input.origin.originalTargetIds] }, current: { ...input.current, currentTargetIds: [...input.current.currentTargetIds] } };
}

export function createCausalEnvelope(input: { interactionId?: InteractionId; frames: CausalFrame[]; activeFrameId: FrameId; checkpoint?: Omit<CausalCheckpoint, "checkpointId"> & { checkpointId?: CheckpointId }; presentationRevision?: PresentationRevision }): CausalEnvelope {
  const activeFrame = input.frames.find((frame) => frame.frameId === input.activeFrameId);
  if (!activeFrame) throw new Error("A causal envelope must reference an active frame.");
  return {
    version: 1,
    interactionId: input.interactionId ?? createInteractionId(),
    frames: input.frames.map((frame) => createCausalFrame({ ...frame, origin: frame.origin, current: frame.current })),
    activeFrameId: input.activeFrameId,
    checkpoint: { checkpointId: input.checkpoint?.checkpointId ?? createCheckpointId(), frameId: input.checkpoint?.frameId ?? activeFrame.frameId, stage: input.checkpoint?.stage ?? activeFrame.stage },
    presentationRevision: input.presentationRevision ?? 0,
  };
}

function copyEnvelope(envelope: CausalEnvelope): CausalEnvelope {
  return JSON.parse(JSON.stringify(envelope)) as CausalEnvelope;
}

function frameOrThrow(envelope: CausalEnvelope, frameId: FrameId): CausalFrame {
  const frame = envelope.frames.find((candidate) => candidate.frameId === frameId);
  if (!frame) throw new Error(`Unknown causal frame: ${frameId}`);
  return frame;
}

function checkpointFor(envelope: CausalEnvelope, frameId: FrameId, stage: PresentationStage): CausalCheckpoint {
  return { checkpointId: createCheckpointId(), frameId, stage };
}

/** Explicit semantic boundary: preserves Interaction/Frame and advances public revision. */
export function advanceCausalCheckpoint(envelope: CausalEnvelope, frameId = envelope.activeFrameId, stage = frameOrThrow(envelope, frameId).stage): CausalEnvelope {
  const next = copyEnvelope(envelope);
  frameOrThrow(next, frameId);
  next.checkpoint = checkpointFor(next, frameId, stage);
  next.presentationRevision += 1;
  return next;
}

/** Public change without a new stable checkpoint. */
export function advanceCausalPresentationRevision(envelope: CausalEnvelope): CausalEnvelope {
  const next = copyEnvelope(envelope);
  next.presentationRevision += 1;
  return next;
}

export function createChildCausalFrame(envelope: CausalEnvelope, input: { stage: CausalFrame["stage"]; origin: CausalFrameOrigin; current: CausalFrameCurrent; causeNodeId?: CausalFrame["causeNodeId"] }): CausalEnvelope {
  const next = copyEnvelope(envelope);
  const child = createCausalFrame({ ...input, parentFrameId: next.activeFrameId });
  next.frames = [...next.frames, child];
  next.activeFrameId = child.frameId;
  next.checkpoint = checkpointFor(next, child.frameId, child.stage);
  next.presentationRevision += 1;
  return next;
}

export function switchActiveCausalFrame(envelope: CausalEnvelope, frameId: FrameId): CausalEnvelope {
  const next = copyEnvelope(envelope);
  const frame = frameOrThrow(next, frameId);
  next.activeFrameId = frameId;
  next.checkpoint = checkpointFor(next, frameId, frame.stage);
  next.presentationRevision += 1;
  return next;
}

export function updateCausalFrameStage(envelope: CausalEnvelope, frameId: FrameId, stage: CausalFrame["stage"]): CausalEnvelope {
  const next = copyEnvelope(envelope);
  frameOrThrow(next, frameId);
  next.frames = next.frames.map((frame) => frame.frameId === frameId ? { ...frame, stage } : frame);
  if (next.checkpoint.frameId === frameId) next.checkpoint = { ...next.checkpoint, stage };
  next.presentationRevision += 1;
  return next;
}

export function updateCausalFrameCurrent(envelope: CausalEnvelope, frameId: FrameId, current: Partial<CausalFrameCurrent>): CausalEnvelope {
  const next = copyEnvelope(envelope);
  const frame = frameOrThrow(next, frameId);
  next.frames = next.frames.map((candidate) => candidate.frameId === frameId ? { ...candidate, current: { ...frame.current, ...current, currentTargetIds: current.currentTargetIds ? [...current.currentTargetIds] : [...frame.current.currentTargetIds] } } : candidate);
  next.presentationRevision += 1;
  return next;
}

export function resumeCausalParentFrame(envelope: CausalEnvelope, childFrameId = envelope.activeFrameId): CausalEnvelope {
  const next = copyEnvelope(envelope);
  const child = frameOrThrow(next, childFrameId);
  if (!child.parentFrameId) throw new Error(`Causal frame ${childFrameId} has no parent.`);
  return switchActiveCausalFrame(next, child.parentFrameId);
}
