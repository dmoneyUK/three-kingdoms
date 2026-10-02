/** Shared public causal metadata. Optional for legacy rooms and independent of CurrentAction. */
export type InteractionId = string;
export type FrameId = string;
export type CheckpointId = string;
export type PresentationRevision = number;
export type CauseNodeId = string;

export type PresentationStage =
  | "ATTACK_RESPONSE" | "DUEL_EXCHANGE" | "GROUP_RESOLUTION" | "DAMAGE"
  | "DYING" | "JUDGEMENT" | "NEGATION" | "FORCED_ACTION" | "SETTLEMENT";
export type ResolutionSemantics = "SEQUENTIAL" | "ORDERED" | "GROUP";

export type CausalOriginRef = { interactionId?: InteractionId; frameId?: FrameId; causeNodeId?: CauseNodeId };
export type CausalFrameOrigin = { originSourceId: string | null; originEffect: string; originalTargetIds: string[]; originRef?: CausalOriginRef };
export type CausalFrameCurrent = { currentSourceId: string | null; currentEffect: string; currentTargetIds: string[]; resolvingPlayerId: string | null };
export type CausalFrame = {
  frameId: FrameId;
  parentFrameId?: FrameId | null;
  causeNodeId?: CauseNodeId;
  stage: PresentationStage;
  origin: CausalFrameOrigin;
  current: CausalFrameCurrent;
};
export type CausalCheckpoint = { checkpointId: CheckpointId; frameId: FrameId; stage: PresentationStage };
export type CausalEnvelope = {
  version: 1;
  interactionId: InteractionId;
  frames: CausalFrame[];
  activeFrameId: FrameId;
  checkpoint: CausalCheckpoint;
  presentationRevision: PresentationRevision;
};

const STAGES = new Set<PresentationStage>([
  "ATTACK_RESPONSE", "DUEL_EXCHANGE", "GROUP_RESOLUTION", "DAMAGE", "DYING",
  "JUDGEMENT", "NEGATION", "FORCED_ACTION", "SETTLEMENT",
]);
const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const stringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => typeof item === "string");

function validFrame(value: unknown): value is CausalFrame {
  if (!isRecord(value) || typeof value.frameId !== "string" || !STAGES.has(value.stage as PresentationStage) || !isRecord(value.origin) || !isRecord(value.current)) return false;
  const origin = value.origin; const current = value.current;
  return (origin.originSourceId === null || typeof origin.originSourceId === "string") && typeof origin.originEffect === "string" && stringArray(origin.originalTargetIds)
    && (current.currentSourceId === null || typeof current.currentSourceId === "string") && typeof current.currentEffect === "string" && stringArray(current.currentTargetIds)
    && (current.resolvingPlayerId === null || typeof current.resolvingPlayerId === "string")
    && (value.parentFrameId === undefined || value.parentFrameId === null || typeof value.parentFrameId === "string")
    && (value.causeNodeId === undefined || typeof value.causeNodeId === "string");
}

/** Missing or invalid legacy JSON is intentionally treated as no envelope. */
export function parseCausalEnvelope(value: string | null | undefined): CausalEnvelope | null {
  if (!value) return null;
  try {
    const parsed: unknown = JSON.parse(value);
    if (!isRecord(parsed) || parsed.version !== 1 || typeof parsed.interactionId !== "string" || typeof parsed.activeFrameId !== "string" || !Number.isInteger(parsed.presentationRevision) || parsed.presentationRevision < 0 || !Array.isArray(parsed.frames) || !parsed.frames.every(validFrame) || !isRecord(parsed.checkpoint) || typeof parsed.checkpoint.checkpointId !== "string" || typeof parsed.checkpoint.frameId !== "string" || !STAGES.has(parsed.checkpoint.stage as PresentationStage)) return null;
    return parsed.frames.some((frame) => frame.frameId === parsed.activeFrameId) ? parsed as unknown as CausalEnvelope : null;
  } catch { return null; }
}

export function causalEnvelopePresentationRevision(envelope: CausalEnvelope | null): PresentationRevision | null {
  return envelope?.presentationRevision ?? null;
}

/** The authoritative owner advances this only after a public causal change. */
export function advanceCausalEnvelopePresentationRevision(envelope: CausalEnvelope): CausalEnvelope {
  return { ...envelope, presentationRevision: envelope.presentationRevision + 1 };
}
