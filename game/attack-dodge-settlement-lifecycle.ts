type RecordValue = Record<string, unknown>;

export const ATTACK_DODGE_PUBLIC_READ_MS = 20_000;

export type AttackDodgePublicActionEvent = {
  eventId: string;
  /** Canonical server timeline position, used only to detect later retirement actions. */
  timelineIndex: number;
  rootEventId?: string;
  interactionId?: string;
  rootFrameId?: string;
};

export type AttackDodgeSettlementHoldIdentity = {
  roomCode: string;
  phase: string | null;
  turnSeat: number | null;
  rootEventId: string;
  responseEventId: string;
  displayExpiresAtMs?: number;
  interactionId: string;
  rootFrameId: string;
  sourceId: string;
  targetId: string;
  publicActionEventIds: readonly string[];
};

export type AttackDodgeSettlementRoomProgress = {
  roomCode: string;
  status: string;
  phase: string | null;
  turnSeat: number | null;
  nowMs?: number;
  currentAction: { kind?: string | null; triggerEvent?: string | null } | null;
  interaction: { semantics?: string | null; interactionId?: string | null; rootFrameId?: string | null } | null;
  liveRoots: readonly {
    semantics?: string | null;
    rootEventId?: string | null;
    interactionId?: string | null;
    rootFrameId?: string | null;
    sourceId?: string | null;
  }[];
  publicActionEvents: readonly AttackDodgePublicActionEvent[];
};

export type AttackDodgeSettlementSupersessionReason =
  | "room-changed"
  | "game-ended"
  | "turn-advanced"
  | "discard-phase"
  | "turn-ending-trigger"
  | "turn-ending-resolution"
  | "new-public-action"
  | "different-live-root"
  | "public-read-window-expired";

export type RetiredAttackDodgeCompositionRecord = {
  roomCode: string;
  eventIds: readonly string[];
  cardIds: readonly string[];
};

type RetiredAttackDodgeStorage = Pick<Storage, "getItem" | "setItem">;

const RETIRED_ATTACK_DODGE_STORAGE_PREFIX = "wtk.attack-dodge-retired.v1:";
const MAX_RETIRED_COMPOSITION_IDS = 128;
const retiredCompositionListeners = new Map<string, Set<() => void>>();
const retiredCompositionSnapshots = new Map<string, string | null>();

function record(value: unknown): RecordValue | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as RecordValue : null;
}

function stringField(value: unknown, key: string): string | undefined {
  const candidate = record(value)?.[key];
  return typeof candidate === "string" && candidate.length > 0 ? candidate : undefined;
}

function distinctIds(values: readonly string[]): string[] {
  return [...new Set(values.filter((value) => typeof value === "string" && value.length > 0))]
    .slice(-MAX_RETIRED_COMPOSITION_IDS);
}

function retiredAttackDodgeStorageKey(roomCode: string) {
  return `${RETIRED_ATTACK_DODGE_STORAGE_PREFIX}${encodeURIComponent(roomCode)}`;
}

function notifyRetiredAttackDodgeCompositionChanged(roomCode: string) {
  retiredCompositionListeners.get(roomCode)?.forEach((listener) => listener());
}

/** Subscribe React to same-tab retirement writes and cross-tab localStorage updates. */
export function subscribeRetiredAttackDodgeComposition(roomCode: string, listener: () => void) {
  const listeners = retiredCompositionListeners.get(roomCode) ?? new Set<() => void>();
  listeners.add(listener);
  retiredCompositionListeners.set(roomCode, listeners);
  const key = retiredAttackDodgeStorageKey(roomCode);
  const onStorage = (event: StorageEvent) => {
    if (event.key !== key && event.key !== null) return;
    if (event.key === key) retiredCompositionSnapshots.set(roomCode, event.newValue);
    else {
      let raw: string | null = null;
      try { raw = window.localStorage.getItem(key); } catch { /* Keep the in-memory snapshot. */ }
      retiredCompositionSnapshots.set(roomCode, raw);
    }
    listener();
  };
  if (typeof window !== "undefined") window.addEventListener("storage", onStorage);
  return () => {
    if (typeof window !== "undefined") window.removeEventListener("storage", onStorage);
    listeners.delete(listener);
    if (listeners.size === 0) retiredCompositionListeners.delete(roomCode);
  };
}

/** useSyncExternalStore snapshot: a primitive keeps reads referentially stable. */
export function retiredAttackDodgeCompositionStorageSnapshot(roomCode: string): string | null {
  if (retiredCompositionSnapshots.has(roomCode)) return retiredCompositionSnapshots.get(roomCode) ?? null;
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(retiredAttackDodgeStorageKey(roomCode));
    retiredCompositionSnapshots.set(roomCode, raw);
    return raw;
  } catch {
    retiredCompositionSnapshots.set(roomCode, null);
    return null;
  }
}

/** Hydration always begins from the same empty snapshot used by the server. */
export function retiredAttackDodgeCompositionServerSnapshot(): null {
  return null;
}

export function parseRetiredAttackDodgeCompositionSnapshot(raw: string | null, roomCode: string): RetiredAttackDodgeCompositionRecord {
  const empty = { roomCode, eventIds: [], cardIds: [] };
  if (!raw) return empty;
  try {
    const parsed = record(JSON.parse(raw));
    if (parsed?.version !== 1 || parsed.roomCode !== roomCode
      || !Array.isArray(parsed.eventIds) || !Array.isArray(parsed.cardIds)) return empty;
    return {
      roomCode,
      eventIds: distinctIds(parsed.eventIds.filter((value): value is string => typeof value === "string")),
      cardIds: distinctIds(parsed.cardIds.filter((value): value is string => typeof value === "string")),
    };
  } catch {
    return empty;
  }
}

/** Store only public event/card identities so a retired graph cannot reappear after reload. */
export function readRetiredAttackDodgeComposition(
  storage: Pick<Storage, "getItem"> | null,
  roomCode: string,
): RetiredAttackDodgeCompositionRecord {
  let raw: string | null = null;
  try { raw = storage?.getItem(retiredAttackDodgeStorageKey(roomCode)) ?? null; } catch { /* Treat blocked storage as empty. */ }
  return parseRetiredAttackDodgeCompositionSnapshot(raw, roomCode);
}

/** Persist a retired public graph in its room-scoped local reload tombstone. */
export function persistRetiredAttackDodgeComposition(
  storage: RetiredAttackDodgeStorage | null,
  roomCode: string,
  eventIds: readonly string[],
  cardIds: readonly string[],
): RetiredAttackDodgeCompositionRecord {
  const previous = storage
    ? readRetiredAttackDodgeComposition(storage, roomCode)
    : parseRetiredAttackDodgeCompositionSnapshot(retiredCompositionSnapshots.get(roomCode) ?? null, roomCode);
  const next = {
    roomCode,
    eventIds: distinctIds([...previous.eventIds, ...eventIds]),
    cardIds: distinctIds([...previous.cardIds, ...cardIds]),
  };
  const serialized = JSON.stringify({ version: 1, ...next });
  retiredCompositionSnapshots.set(roomCode, serialized);
  try {
    storage?.setItem(retiredAttackDodgeStorageKey(roomCode), serialized);
  } catch {
    // In-memory retirement still applies if browser storage is unavailable.
  }
  notifyRetiredAttackDodgeCompositionChanged(roomCode);
  return next;
}

const PUBLIC_ACTION_PROOFS = [
  "attackDodgeResponse",
  "duelAttackResponse",
  "negationSettlement",
  "selfTargetAction",
  "publicSkillEffect",
  "publicSkillEffectSettlement",
  "publicDismantleSettlement",
  "publicStealSettlement",
  "publicAttackHitSettlement",
  "publicGroupSettlement",
  "publicBumperHarvestSettlement",
  "bumperHarvestRoot",
] as const;

function publicActionProof(event: RecordValue): RecordValue | null {
  for (const key of PUBLIC_ACTION_PROOFS) {
    const proof = record(event[key]);
    if (proof) return proof;
  }
  return null;
}

/** Extract only server-public action identities; informational messages and hidden events do not qualify. */
export function attackDodgePublicActionEvents(timeline: readonly unknown[]): AttackDodgePublicActionEvent[] {
  return timeline.flatMap((value, timelineIndex) => {
    const event = record(value);
    const eventId = stringField(event, "id");
    if (!event || !eventId || event.presentation === false) return [];

    const action = stringField(event, "action");
    const type = stringField(event, "type");
    const publicCardAction = type === "card" && (action === "play" || action === "equip" || action === "activate" || action === "discard")
      || type === "cards" && (action === "play" || action === "discard");
    const proof = publicActionProof(event);
    if (!publicCardAction && !proof) return [];

    return [{
      eventId,
      timelineIndex,
      ...(stringField(proof, "rootEventId") ? { rootEventId: stringField(proof, "rootEventId") } : {}),
      ...(stringField(proof, "interactionId") ? { interactionId: stringField(proof, "interactionId") } : {}),
      ...(stringField(proof, "rootFrameId") ? { rootFrameId: stringField(proof, "rootFrameId") } : {}),
    }];
  });
}

function sameHeldRoot(hold: AttackDodgeSettlementHoldIdentity, root: AttackDodgeSettlementRoomProgress["liveRoots"][number]) {
  return root.semantics === "PROVEN"
    && root.rootEventId === hold.rootEventId
    && root.interactionId === hold.interactionId
    && root.rootFrameId === hold.rootFrameId
    && root.sourceId === hold.sourceId
    && root.targetId === hold.targetId;
}

function actionEventContinuesHeldRoot(hold: AttackDodgeSettlementHoldIdentity, event: AttackDodgePublicActionEvent) {
  const hasConflictingFrame = event.rootFrameId !== undefined && event.rootFrameId !== hold.rootFrameId;
  const hasConflictingInteraction = event.interactionId !== undefined && event.interactionId !== hold.interactionId;
  if (hasConflictingFrame || hasConflictingInteraction) return false;
  return event.rootEventId === hold.rootEventId
    || event.interactionId === hold.interactionId && event.rootFrameId === hold.rootFrameId;
}

/**
 * A completed Attack/Dodge read graph is a quiet-period hold, not a new source
 * of gameplay state. Retire it only on authoritative room/turn/action progress.
 */
export function attackDodgeSettlementSupersessionReason(
  hold: AttackDodgeSettlementHoldIdentity,
  current: AttackDodgeSettlementRoomProgress,
): AttackDodgeSettlementSupersessionReason | null {
  if (current.roomCode !== hold.roomCode) return "room-changed";
  if (current.status !== "playing") return "game-ended";
  if (hold.displayExpiresAtMs !== undefined && current.nowMs !== undefined && current.nowMs >= hold.displayExpiresAtMs) {
    return "public-read-window-expired";
  }
  if (hold.turnSeat !== null && current.turnSeat !== hold.turnSeat) return "turn-advanced";
  if (current.phase === "discard" && hold.phase !== "discard") return "discard-phase";
  if (current.currentAction?.triggerEvent === "discard_phase" || current.currentAction?.triggerEvent === "turn_end") {
    return "turn-ending-trigger";
  }

  // A still-live identical interaction owns its continuation. Timeline position below
  // is used only to retire a completed graph on a later independent public action;
  // it never supplies source, target, participant, or causal identity.
  const sameInteractionIsLive = current.interaction?.semantics === "PROVEN"
    && current.interaction.interactionId === hold.interactionId
    && current.interaction.rootFrameId === hold.rootFrameId;
  if (sameInteractionIsLive) return null;

  if (current.phase === "resolving" && current.currentAction?.kind === "none"
    && current.phase !== hold.phase) return "turn-ending-resolution";

  const capturedActionIds = new Set(hold.publicActionEventIds);
  for (const event of current.publicActionEvents) {
    if (capturedActionIds.has(event.eventId) || event.eventId === hold.rootEventId || event.eventId === hold.responseEventId) continue;
    if (actionEventContinuesHeldRoot(hold, event)) continue;
    return "new-public-action";
  }

  if (current.liveRoots.some((root) => !sameHeldRoot(hold, root))) return "different-live-root";
  return null;
}
