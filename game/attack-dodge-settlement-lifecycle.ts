type RecordValue = Record<string, unknown>;

export type AttackDodgePublicActionEvent = {
  eventId: string;
  /** Canonical server timeline position, used only to detect later retirement actions. */
  timelineIndex: number;
  resolutionId?: string;
  rootEventId?: string;
  interactionId?: string;
  rootFrameId?: string;
};

export type AttackHitSettlementHoldIdentity = {
  roomCode: string;
  phase: string | null;
  turnSeat: number | null;
  eventId: string;
  rootEventId: string;
  rootResolutionId: string;
  rootCardId: string;
  targetId: string;
  publicActionEventIds: readonly string[];
};

export type AttackHitSettlementRoomProgress = {
  roomCode: string;
  status: string;
  phase: string | null;
  turnSeat: number | null;
  currentAction: { kind?: string | null; triggerEvent?: string | null } | null;
  liveRootEventId: string | null;
  publicActionEvents: readonly AttackDodgePublicActionEvent[];
};

export type AttackHitSettlementSupersessionReason =
  | "room-changed"
  | "game-ended"
  | "turn-advanced"
  | "discard-phase"
  | "turn-ending-trigger"
  | "turn-ending-resolution"
  | "new-public-action"
  | "different-live-root";

export type AttackDodgeSettlementHoldIdentity = {
  roomCode: string;
  phase: string | null;
  turnSeat: number | null;
  rootEventId: string;
  responseEventId: string;
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
  | "different-live-root";

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
      ...(stringField(event, "resolutionId") ? { resolutionId: stringField(event, "resolutionId") } : {}),
      ...(stringField(proof, "rootEventId") ? { rootEventId: stringField(proof, "rootEventId") } : {}),
      ...(stringField(proof, "interactionId") ? { interactionId: stringField(proof, "interactionId") } : {}),
      ...(stringField(proof, "rootFrameId") ? { rootFrameId: stringField(proof, "rootFrameId") } : {}),
    }];
  });
}

/**
 * An authoritative Attack-hit result remains visible for its local four-second
 * readable hold. Game progress continues normally; only leaving the room may
 * discard the local composition before that hold completes.
 */
export function attackHitSettlementSupersessionReason(
  hold: AttackHitSettlementHoldIdentity,
  current: AttackHitSettlementRoomProgress,
): AttackHitSettlementSupersessionReason | null {
  if (current.roomCode !== hold.roomCode) return "room-changed";
  return null;
}

/**
 * Once an exact public Dodge proof completes the Attack relationship, each
 * viewer keeps that completed composition through its four-second visible
 * read hold. New turns/actions do not obscure the result; changing rooms does.
 */
export function attackDodgeSettlementSupersessionReason(
  hold: AttackDodgeSettlementHoldIdentity,
  current: AttackDodgeSettlementRoomProgress,
): AttackDodgeSettlementSupersessionReason | null {
  if (current.roomCode !== hold.roomCode) return "room-changed";
  return null;
}
