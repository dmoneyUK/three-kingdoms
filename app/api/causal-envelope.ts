import type { CausalCheckpoint, CausalEnvelope, CausalFrame, CausalFrameCurrent, CausalFrameOrigin, CheckpointId, FrameId, InteractionId, PresentationRevision } from "../../game/presentation-causality";

/** Server/orchestrator-only opaque constructors. Projection never calls these. */
export function createCausalId(): string { return crypto.randomUUID(); }
export function createInteractionId(): InteractionId { return createCausalId(); }
export function createFrameId(): FrameId { return createCausalId(); }
export function createCheckpointId(): CheckpointId { return createCausalId(); }

export function createCausalFrame(input: { frameId?: FrameId; parentFrameId?: FrameId | null; stage: CausalFrame["stage"]; origin: CausalFrameOrigin; current: CausalFrameCurrent }): CausalFrame {
  return { frameId: input.frameId ?? createFrameId(), parentFrameId: input.parentFrameId ?? null, stage: input.stage, origin: input.origin, current: input.current };
}

export function createCausalEnvelope(input: { interactionId?: InteractionId; frames: CausalFrame[]; activeFrameId: FrameId; checkpoint?: Omit<CausalCheckpoint, "checkpointId"> & { checkpointId?: CheckpointId }; presentationRevision?: PresentationRevision }): CausalEnvelope {
  const activeFrame = input.frames.find((frame) => frame.frameId === input.activeFrameId);
  if (!activeFrame) throw new Error("A causal envelope must reference an active frame.");
  return {
    version: 1,
    interactionId: input.interactionId ?? createInteractionId(),
    frames: input.frames,
    activeFrameId: input.activeFrameId,
    checkpoint: { checkpointId: input.checkpoint?.checkpointId ?? createCheckpointId(), frameId: input.checkpoint?.frameId ?? activeFrame.frameId, stage: input.checkpoint?.stage ?? activeFrame.stage },
    presentationRevision: input.presentationRevision ?? 0,
  };
}
