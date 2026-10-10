import { HEROES } from "../game/heroes";
import { BUILD_SHA } from "./build-info";

const ACTIVE_KEY = "wtk.game-ux-trace.active.v2";
const DOCUMENT_KEY = "wtk.game-ux-trace.document.v2";
const LEGACY_DOCUMENT_KEY = "wtk.attack-dodge-ux-trace.document.v1";
const MAX_TRACE_ENTRIES = 3_200;
const MAX_TRACE_JSON_CHARS = 1_700_000;
const FLUSH_INTERVAL_MS = 1_500;

export type AttackDodgeUxTraceEntry = {
  elapsedMs: number;
  sessionId?: string;
  stage: string;
  data: Record<string, unknown>;
};

type TraceSession = { id: string; traceId: string; startedAt: string };
type TraceEnvironment = {
  buildSha: string;
  userAgent: string;
  viewport: { width: number; height: number; devicePixelRatio: number };
  visualViewport: { width: number; height: number; scale: number } | null;
  reducedMotion: boolean;
};
type AttackDodgeUxTraceDocument = {
  schema: "wtk-game-ux-trace";
  version: 2;
  startedAt: string;
  traceId: string;
  environment: TraceEnvironment;
  activeSession: TraceSession | null;
  droppedEntryCount: number;
  entries: AttackDodgeUxTraceEntry[];
};

type PlayerRecord = Record<string, unknown> & { id?: unknown; name?: unknown; seat?: unknown; hero?: unknown };
type PublicTraceRoom = Record<string, unknown> & {
  players?: unknown;
  timeline?: unknown;
  presentationSnapshot?: unknown;
  currentAction?: unknown;
};

let memoryDocument: AttackDodgeUxTraceDocument | null = null;
let memoryActive = false;
let storageUnavailable = false;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let lifecycleListenersInstalled = false;
let lastRoomStateFingerprint = "";
let lastTimelineLength = 0;
let lastTimelineTailId: string | null = null;
const seenPublicEventIds = new Set<string>();
const activeListeners = new Set<() => void>();
let estimatedDocumentChars = 0;

export function subscribeToAttackDodgeUxTraceActive(listener: () => void) {
  activeListeners.add(listener);
  return () => { activeListeners.delete(listener); };
}

export function getAttackDodgeUxTraceServerSnapshot() {
  return false;
}

function notifyActiveListeners() {
  activeListeners.forEach((listener) => listener());
}

function sessionStorageOrNull(): Storage | null {
  if (typeof window === "undefined" || storageUnavailable) return null;
  try {
    return window.sessionStorage;
  } catch {
    storageUnavailable = true;
    return null;
  }
}

function makeId() {
  return typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

function newTraceDocument(): AttackDodgeUxTraceDocument {
  const viewport = typeof window === "undefined" ? null : window.visualViewport;
  return {
    schema: "wtk-game-ux-trace",
    version: 2,
    startedAt: new Date().toISOString(),
    traceId: makeId(),
    environment: {
      buildSha: BUILD_SHA,
      userAgent: typeof navigator === "undefined" ? "unknown" : navigator.userAgent,
      viewport: {
        width: typeof window === "undefined" ? 0 : Math.round(window.innerWidth),
        height: typeof window === "undefined" ? 0 : Math.round(window.innerHeight),
        devicePixelRatio: typeof window === "undefined" ? 1 : window.devicePixelRatio || 1,
      },
      visualViewport: viewport ? {
        width: Math.round(viewport.width),
        height: Math.round(viewport.height),
        scale: Math.round(viewport.scale * 100) / 100,
      } : null,
      reducedMotion: typeof window !== "undefined"
        && typeof window.matchMedia === "function"
        ? window.matchMedia("(prefers-reduced-motion: reduce)").matches
        : false,
    },
    activeSession: null,
    droppedEntryCount: 0,
    entries: [],
  };
}

function migrateDocument(value: unknown): AttackDodgeUxTraceDocument | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as Record<string, unknown>;
  if (candidate.schema === "wtk-game-ux-trace" && candidate.version === 2 && Array.isArray(candidate.entries)) {
    return candidate as AttackDodgeUxTraceDocument;
  }
  if (candidate.schema === "wtk-attack-dodge-ux-trace" && candidate.version === 1 && Array.isArray(candidate.entries)) {
    const legacy = candidate as Record<string, unknown> & { entries: AttackDodgeUxTraceEntry[]; environment?: Record<string, unknown>; traceId?: string; startedAt?: string };
    return {
      schema: "wtk-game-ux-trace",
      version: 2,
      startedAt: typeof legacy.startedAt === "string" ? legacy.startedAt : new Date().toISOString(),
      traceId: typeof legacy.traceId === "string" ? legacy.traceId : makeId(),
      environment: {
        buildSha: BUILD_SHA,
        userAgent: typeof legacy.environment?.userAgent === "string" ? legacy.environment.userAgent : "unknown",
        viewport: legacy.environment?.viewport && typeof legacy.environment.viewport === "object"
          ? legacy.environment.viewport as TraceEnvironment["viewport"]
          : { width: 0, height: 0, devicePixelRatio: 1 },
        visualViewport: legacy.environment?.visualViewport && typeof legacy.environment.visualViewport === "object"
          ? legacy.environment.visualViewport as TraceEnvironment["visualViewport"]
          : null,
        reducedMotion: legacy.environment?.reducedMotion === true,
      },
      activeSession: null,
      droppedEntryCount: 0,
      entries: legacy.entries,
    };
  }
  return null;
}

function readDocument(): AttackDodgeUxTraceDocument | null {
  if (memoryDocument) return memoryDocument;
  const storage = sessionStorageOrNull();
  if (storage) {
    try {
      const raw = storage.getItem(DOCUMENT_KEY) ?? storage.getItem(LEGACY_DOCUMENT_KEY);
      if (raw) {
        memoryDocument = migrateDocument(JSON.parse(raw));
        if (memoryDocument) {
          estimatedDocumentChars = JSON.stringify(memoryDocument).length;
          for (const entry of memoryDocument.entries) {
            if (entry.stage !== "public-timeline-events" || !Array.isArray(entry.data.events)) continue;
            for (const event of entry.data.events) {
              if (event && typeof event === "object" && typeof (event as Record<string, unknown>).eventId === "string") {
                seenPublicEventIds.add((event as Record<string, unknown>).eventId as string);
              }
            }
          }
          return memoryDocument;
        }
      }
    } catch {
      // A damaged or unavailable browser storage entry must never affect gameplay.
    }
  }
  return null;
}

function flushDocument() {
  if (flushTimer) {
    clearTimeout(flushTimer);
    flushTimer = null;
  }
  if (!memoryDocument) return;
  const storage = sessionStorageOrNull();
  if (!storage) return;
  try {
    storage.setItem(DOCUMENT_KEY, JSON.stringify(memoryDocument));
    storage.setItem(ACTIVE_KEY, memoryActive ? "true" : "false");
    storage.removeItem(LEGACY_DOCUMENT_KEY);
  } catch {
    // Keep a bounded in-memory trace if browser storage is restricted or full.
    storageUnavailable = true;
  }
}

function scheduleFlush() {
  if (typeof window === "undefined" || flushTimer) return;
  flushTimer = setTimeout(flushDocument, FLUSH_INTERVAL_MS);
}

function installLifecycleListeners() {
  if (typeof window === "undefined" || lifecycleListenersInstalled) return;
  lifecycleListenersInstalled = true;
  window.addEventListener("pagehide", flushDocument);
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") flushDocument();
  });
}

export function isAttackDodgeUxTraceActive(): boolean {
  if (typeof window === "undefined") return memoryActive;
  const storage = sessionStorageOrNull();
  if (!storage) return memoryActive;
  try {
    memoryActive = storage.getItem(ACTIVE_KEY) === "true";
  } catch {
    // Fall back to the in-memory state.
  }
  return memoryActive;
}

export function getAttackDodgeUxTraceId(): string | null {
  if (!isAttackDodgeUxTraceActive()) return null;
  const trace = readDocument();
  return trace?.activeSession?.traceId ?? trace?.traceId ?? null;
}

export function recordAttackDodgeUxTrace(stage: string, data: Record<string, unknown>) {
  if (!isAttackDodgeUxTraceActive()) return;
  const trace = readDocument();
  if (!trace) return;
  let safeData: Record<string, unknown>;
  try {
    safeData = JSON.parse(JSON.stringify(data)) as Record<string, unknown>;
  } catch {
    safeData = { serializationFailed: true };
  }
  const previous = trace.entries.at(-1);
  if (previous?.stage === stage && JSON.stringify(previous.data) === JSON.stringify(safeData)) return;

  const entry: AttackDodgeUxTraceEntry = {
    elapsedMs: Math.max(0, Date.now() - Date.parse(trace.startedAt)),
    ...(trace.activeSession ? { sessionId: trace.activeSession.id } : {}),
    stage,
    data: safeData,
  };
  trace.entries.push(entry);
  estimatedDocumentChars += JSON.stringify(entry).length + 1;
  while (trace.entries.length > MAX_TRACE_ENTRIES || estimatedDocumentChars > MAX_TRACE_JSON_CHARS) {
    if (trace.entries.length === 0) break;
    const removed = trace.entries.shift();
    if (removed) estimatedDocumentChars -= JSON.stringify(removed).length + 1;
    trace.droppedEntryCount += 1;
  }
  scheduleFlush();
}

export function startAttackDodgeUxTrace() {
  if (typeof window === "undefined") return;
  if (!memoryDocument) {
    memoryDocument = readDocument() ?? newTraceDocument();
    estimatedDocumentChars = JSON.stringify(memoryDocument).length;
  }
  memoryActive = true;
  const storage = sessionStorageOrNull();
  if (storage) {
    try { storage.setItem(ACTIVE_KEY, "true"); }
    catch { storageUnavailable = true; }
  }
  installLifecycleListeners();
  recordAttackDodgeUxTrace("trace-recording-started", {
    buildSha: BUILD_SHA,
    scope: "automatic-game-session",
  });
  scheduleFlush();
  notifyActiveListeners();
}

export function beginAttackDodgeUxTraceSession() {
  startAttackDodgeUxTrace();
  const trace = readDocument();
  if (!trace) return null;
  if (trace.activeSession) {
    recordAttackDodgeUxTrace("game-session-ended", { reason: "replaced-by-new-session" });
  }
  trace.activeSession = { id: makeId(), traceId: makeId(), startedAt: new Date().toISOString() };
  lastRoomStateFingerprint = "";
  lastTimelineLength = 0;
  lastTimelineTailId = null;
  seenPublicEventIds.clear();
  recordAttackDodgeUxTrace("game-session-started", { buildSha: BUILD_SHA, traceId: trace.activeSession.traceId });
  scheduleFlush();
  return trace.activeSession.id;
}

export function resumeAttackDodgeUxTraceSession() {
  startAttackDodgeUxTrace();
  const trace = readDocument();
  if (!trace) return;
  if (!trace.activeSession) {
    trace.activeSession = { id: makeId(), traceId: makeId(), startedAt: new Date().toISOString() };
    recordAttackDodgeUxTrace("game-session-resumed", { buildSha: BUILD_SHA, traceId: trace.activeSession.traceId });
  } else {
    recordAttackDodgeUxTrace("game-session-resumed", { sessionId: trace.activeSession.id, traceId: trace.activeSession.traceId, buildSha: BUILD_SHA });
  }
  scheduleFlush();
}

export function stopAttackDodgeUxTrace(reason = "game-finished") {
  if (!isAttackDodgeUxTraceActive()) return;
  recordAttackDodgeUxTrace("game-session-ended", { reason });
  const trace = readDocument();
  if (trace) trace.activeSession = null;
  recordAttackDodgeUxTrace("trace-recording-stopped", { reason });
  memoryActive = false;
  flushDocument();
  notifyActiveListeners();
}

export function summarizePublicGameRoom(roomValue: unknown, timelineStartIndex = 0) {
  const room = roomValue && typeof roomValue === "object" ? roomValue as PublicTraceRoom : {};
  const players = Array.isArray(room.players) ? room.players as PlayerRecord[] : [];
  const byId = new Map<string, PlayerRecord>();
  const nameToSeats = new Map<string, number[]>();
  for (const player of players) {
    if (typeof player.id === "string") byId.set(player.id, player);
    if (typeof player.name === "string" && typeof player.seat === "number") {
      const key = player.name.trim().toLocaleLowerCase();
      nameToSeats.set(key, [...(nameToSeats.get(key) ?? []), player.seat]);
    }
  }
  const seatForId = (value: unknown): number | null => {
    if (typeof value !== "string") return null;
    const seat = byId.get(value)?.seat;
    return typeof seat === "number" ? seat : null;
  };
  const seatForName = (value: unknown): number | null => {
    if (typeof value !== "string") return null;
    const seats = nameToSeats.get(value.trim().toLocaleLowerCase()) ?? [];
    return seats.length === 1 ? seats[0] : null;
  };
  const heroRoster = players.map((player) => {
    const heroId = typeof player.hero === "string" ? player.hero : null;
    const hero = heroId ? HEROES.find((candidate) => candidate.id === heroId) : null;
    return {
      seat: typeof player.seat === "number" ? player.seat : null,
      heroId,
      heroName: hero?.name ?? null,
      skills: hero?.skills.map((skill) => skill.name) ?? [],
      hp: typeof player.hp === "number" ? player.hp : null,
      maxHp: typeof player.maxHp === "number" ? player.maxHp : null,
      alive: typeof player.alive === "boolean" ? player.alive : null,
      handCount: typeof player.handCount === "number" ? player.handCount : null,
      equipmentCount: Array.isArray(player.equipmentCards) ? player.equipmentCards.length : null,
      judgementCount: Array.isArray(player.judgementCards) ? player.judgementCards.length : null,
    };
  });
  const action = room.currentAction && typeof room.currentAction === "object"
    ? room.currentAction as Record<string, unknown>
    : {};
  const snapshot = room.presentationSnapshot && typeof room.presentationSnapshot === "object"
    ? room.presentationSnapshot as Record<string, unknown>
    : {};
  const interaction = snapshot.interaction && typeof snapshot.interaction === "object"
    ? snapshot.interaction as Record<string, unknown>
    : null;
  const rootAction = snapshot.rootAction && typeof snapshot.rootAction === "object"
    ? snapshot.rootAction as Record<string, unknown>
    : null;
  const proofList = Array.isArray(snapshot.attackDodgeResponses) ? snapshot.attackDodgeResponses : [];
  const publicProofs = proofList.map((value) => {
    const proof = value && typeof value === "object" ? value as Record<string, unknown> : {};
    return {
      semantics: proof.semantics ?? null,
      rootEventId: proof.rootEventId ?? null,
      responseEventId: proof.responseEventId ?? null,
      rootResolutionId: proof.rootResolutionId ?? null,
      responseResolutionId: proof.responseResolutionId ?? null,
      interactionId: proof.interactionId ?? null,
      rootFrameId: proof.rootFrameId ?? null,
      sourceSeat: seatForId(proof.rootSourceId),
      targetSeat: seatForId(proof.targetId),
      responseActorSeat: seatForId(proof.responseActorId),
      counterRelation: proof.counterRelation ?? null,
    };
  });
  const publicRootAction = rootAction ? {
    action: rootAction.action ?? null,
    semantics: rootAction.semantics ?? null,
    rootEventId: rootAction.rootEventId ?? null,
    interactionId: rootAction.interactionId ?? null,
    rootFrameId: rootAction.rootFrameId ?? null,
    checkpointId: rootAction.checkpointId ?? null,
    presentationRevision: rootAction.presentationRevision ?? null,
    sourceSeat: seatForId(rootAction.sourceId),
    targetSeat: seatForId(rootAction.targetId),
    cardKind: rootAction.cardKind ?? null,
    physicalCardKind: rootAction.physicalCardKind ?? null,
    playedAs: rootAction.playedAs ?? null,
  } : null;
  const publicInteraction = interaction ? {
    semantics: interaction.semantics ?? null,
    stage: interaction.stage ?? null,
    interactionId: interaction.interactionId ?? null,
    rootFrameId: interaction.rootFrameId ?? null,
    activeFrameId: interaction.activeFrameId ?? null,
    checkpointId: interaction.checkpointId ?? null,
    presentationRevision: interaction.presentationRevision ?? null,
    sourceSeat: seatForId(interaction.sourceId),
    currentParticipantSeat: seatForId(interaction.currentParticipantId),
    decisionActorSeat: seatForId(interaction.decisionActorId),
    targetSeats: Array.isArray(interaction.targetIds) ? interaction.targetIds.map(seatForId) : [],
  } : null;
  const currentAction = {
    kind: action.kind ?? null,
    requirement: action.requirement ?? null,
    triggerEvent: action.triggerEvent ?? null,
    actorSeat: seatForId(action.actorId),
  };
  const timeline = Array.isArray(room.timeline) ? room.timeline : [];
  const recentPublicEvents = timeline.slice(Math.max(0, timelineStartIndex)).flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const event = value as Record<string, unknown>;
    if (event.presentation === false) return [];
    const publicCardAction = ["play", "equip", "discard", "reveal"].includes(String(event.action));
    const card = event.card && typeof event.card === "object" ? event.card as Record<string, unknown> : null;
    const cards = Array.isArray(event.cards) ? event.cards : [];
    return [{
      eventId: typeof event.id === "string" ? event.id : null,
      type: event.type ?? null,
      action: event.action ?? null,
      actorSeat: seatForName(event.player),
      targetSeat: seatForName(event.target),
      cardKind: publicCardAction && typeof card?.kind === "string" ? card.kind : null,
      cardKinds: publicCardAction ? cards.flatMap((item) => item && typeof item === "object" && typeof (item as Record<string, unknown>).kind === "string" ? [(item as Record<string, unknown>).kind] : []) : [],
      playedAs: event.action === "play" ? event.playedAs ?? null : null,
      resolutionId: event.resolutionId ?? null,
      importance: event.importance ?? null,
      finalResult: event.finalResult ?? null,
      publicMessage: typeof event.message === "string" ? redactPlayerNames(event.message, players, typeof room.code === "string" ? room.code : "") : null,
    }];
  });
  return {
    state: {
      status: room.status ?? null,
      phase: room.phase ?? null,
      turnSeat: typeof room.turnSeat === "number" ? room.turnSeat : null,
      viewerSeat: seatForId(room.meId),
      playerCount: players.length,
      roster: heroRoster,
      pendingKind: room.pending && typeof room.pending === "object"
        ? (room.pending as Record<string, unknown>).kind ?? null
        : null,
      currentAction,
      pendingAttack: room.pendingAttack && typeof room.pendingAttack === "object" ? {
        sourceSeat: seatForId((room.pendingAttack as Record<string, unknown>).sourceId),
        targetSeat: seatForId((room.pendingAttack as Record<string, unknown>).targetId),
      } : null,
      interaction: publicInteraction,
      rootAction: publicRootAction,
      attackDodgeProofs: publicProofs,
    },
    publicEvents: recentPublicEvents,
  };
}

function redactPlayerNames(message: string, players: PlayerRecord[], roomCode = "") {
  let safe = message;
  const ordered = [...players]
    .filter((player) => typeof player.name === "string" && player.name.trim())
    .sort((left, right) => String(right.name).length - String(left.name).length);
  for (const player of ordered) {
    const name = player.name as string;
    const seat = typeof player.seat === "number" ? player.seat : "?";
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    safe = safe.replace(new RegExp(escaped, "giu"), `Seat ${seat}`);
  }
  if (roomCode) safe = safe.replace(new RegExp(roomCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), "[room]");
  return safe.slice(0, 280);
}

export function sanitizeAttackDodgeUxTraceData(value: unknown, playerNames: readonly string[] = [], roomCode?: string, privateValues: readonly string[] = []): unknown {
  const privateKeys = /^(?:name|playerName|sourceName|targetName|actorName|responderName|resolverName|accountName|roomCode|roomId|token|hand|handCards|eligibleKeys|eligibleCardIds|triggerOptions|legalActions|legalOptions|options|providerId|providerIds|playerId|sourceId|targetId|actorId|responderId|resolverId|participantId|role|myRole|players|room|timeline)$/iu;
  const privateCardIdKey = /cardIds?$/iu;
  const redactString = (text: string) => {
    let safe = text;
    for (const name of [...playerNames].filter(Boolean).sort((a, b) => b.length - a.length)) {
      safe = safe.replace(new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), "[player]");
    }
    if (roomCode) safe = safe.replace(new RegExp(roomCode.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), "[room]");
    for (const privateValue of [...privateValues].filter(Boolean).sort((a, b) => b.length - a.length)) {
      safe = safe.replace(new RegExp(privateValue.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "giu"), "[private]");
    }
    return safe;
  };
  const visit = (item: unknown): unknown => {
    if (typeof item === "string") return redactString(item);
    if (Array.isArray(item)) return item.map(visit);
    if (!item || typeof item !== "object") return item;
    return Object.fromEntries(Object.entries(item as Record<string, unknown>)
      .filter(([key]) => !privateKeys.test(key) && !privateCardIdKey.test(key))
      .map(([key, nested]) => [key, visit(nested)]));
  };
  return visit(value);
}

export function recordPublicGameRoomSnapshot(room: unknown, source: "poll" | "action" | "restore" = "poll") {
  if (!isAttackDodgeUxTraceActive()) return;
  const rawTimeline = room && typeof room === "object" && Array.isArray((room as PublicTraceRoom).timeline)
    ? (room as PublicTraceRoom).timeline as unknown[]
    : [];
  const samePrefix = lastTimelineLength <= rawTimeline.length
    && (lastTimelineLength === 0 || (rawTimeline[lastTimelineLength - 1] as Record<string, unknown> | undefined)?.id === lastTimelineTailId);
  const timelineStartIndex = samePrefix ? lastTimelineLength : 0;
  const summary = summarizePublicGameRoom(room, timelineStartIndex);
  const fingerprint = JSON.stringify(summary.state);
  if (fingerprint !== lastRoomStateFingerprint) {
    recordAttackDodgeUxTrace("game-room-state", { source, ...summary.state });
    lastRoomStateFingerprint = fingerprint;
  }
  const freshEvents = summary.publicEvents.filter((event) => {
    const eventId = event.eventId;
    if (typeof eventId !== "string" || seenPublicEventIds.has(eventId)) return false;
    seenPublicEventIds.add(eventId);
    return true;
  });
  if (freshEvents.length) recordAttackDodgeUxTrace("public-timeline-events", { source, events: freshEvents });
  lastTimelineLength = rawTimeline.length;
  const tail = rawTimeline.at(-1) as Record<string, unknown> | undefined;
  lastTimelineTailId = typeof tail?.id === "string" ? tail.id : null;
}

export function exportAttackDodgeUxTrace(): string {
  flushDocument();
  const trace = readDocument();
  return JSON.stringify(trace ?? {
    schema: "wtk-game-ux-trace",
    version: 2,
    entries: [],
    note: "No game trace has been recorded in this browser tab yet.",
  }, null, 2);
}
