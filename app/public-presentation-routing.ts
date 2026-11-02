import type { PresentationClientView } from "../game/presentation-client";
import type { PresentationSnapshot } from "../game/presentation-snapshot";
import type { PublicPresentationEvent, PublicZoneEndpoint } from "../game/presentation-semantics";

export type PublicPresentationCoverageId =
  | "E01" | "E02" | "E03" | "E04" | "E05" | "E06" | "E07"
  | "E08" | "E09" | "E10" | "E11" | "E12" | "E13" | "E14"
  | "E15" | "E16" | "E17" | "E18" | "E19" | "E20" | "E21";

export type PublicPresentationLegacyRouteId =
  | "TABLE_EQUIPMENT_ARRIVAL"
  | "TABLE_EQUIPMENT_REPLACEMENT_LOSS"
  | "TABLE_JUDGEMENT_ATTACHMENT"
  | "TABLE_JUDGEMENT_REVEAL"
  | "TABLE_DIRECT_DISCARD"
  | "TABLE_PUBLIC_PLAY_HISTORY"
  | "STATIC_ORDERED_HALBERD_ROOT"
  | "STATIC_SELF_TARGET_PEACH_ROOT"
  | "STATIC_BUMPER_HARVEST_SETTLEMENT";

type CoverageEntry = {
  id: PublicPresentationCoverageId;
  family: string;
  currentOwner: string;
  route: "journey" | "zone-transition" | "fact-only" | "private-receipt" | "no-public-action";
  legacyRoutes: readonly PublicPresentationLegacyRouteId[];
  nextMigration: "M2" | "M3" | "M4" | "M5" | "M6" | "none";
};

/** Source audit inventory for the E01–E21 families. This is descriptive only. */
export const PUBLIC_PRESENTATION_EVENT_COVERAGE = [
  { id: "E01", family: "committed Attack root", currentOwner: "PublicCardDisplay Attack journey", route: "journey", legacyRoutes: ["STATIC_ORDERED_HALBERD_ROOT", "TABLE_PUBLIC_PLAY_HISTORY"], nextMigration: "M5" },
  { id: "E02", family: "committed Dodge or Attack response", currentOwner: "PublicCardDisplay response journey", route: "journey", legacyRoutes: [], nextMigration: "none" },
  { id: "E03", family: "Duel root and committed exchanges", currentOwner: "PublicCardDisplay Duel journey", route: "journey", legacyRoutes: [], nextMigration: "none" },
  { id: "E04", family: "Steal/Dismantle root and Negation chain", currentOwner: "PublicCardDisplay single-target journey", route: "journey", legacyRoutes: [], nextMigration: "none" },
  { id: "E05", family: "Steal/Dismantle settlement result", currentOwner: "root journey plus fact/private receipt; no result CardFace", route: "fact-only", legacyRoutes: [], nextMigration: "none" },
  { id: "E06", family: "Borrowed Sword root and actual B Attack", currentOwner: "PublicCardDisplay Borrowed Sword journey", route: "journey", legacyRoutes: [], nextMigration: "none" },
  { id: "E07", family: "committed Negation/counter/final disposition", currentOwner: "PublicCardDisplay journey and proven fact", route: "journey", legacyRoutes: [], nextMigration: "none" },
  { id: "E08", family: "Group/AOE root and proven recipient effects", currentOwner: "PublicCardDisplay group journey", route: "journey", legacyRoutes: [], nextMigration: "none" },
  { id: "E09", family: "Bumper Harvest root/pool/current pick", currentOwner: "PublicCardDisplay Harvest journey and public pool", route: "journey", legacyRoutes: ["STATIC_BUMPER_HARVEST_SETTLEMENT"], nextMigration: "M5" },
  { id: "E10", family: "Peach/Oath/Draw Two and other original roots", currentOwner: "specialized journey or exact named compatibility owner", route: "journey", legacyRoutes: ["STATIC_SELF_TARGET_PEACH_ROOT", "TABLE_PUBLIC_PLAY_HISTORY"], nextMigration: "M5" },
  { id: "E11", family: "Equipment play to actual slot", currentOwner: "TableResolutionSequence physical arrival; Step B H4 is separate", route: "zone-transition", legacyRoutes: ["TABLE_EQUIPMENT_ARRIVAL"], nextMigration: "M2" },
  { id: "E12", family: "Equipment replacement/loss and private refusal transfer", currentOwner: "TableResolutionSequence zone exit; recipient-only R7", route: "zone-transition", legacyRoutes: ["TABLE_EQUIPMENT_REPLACEMENT_LOSS"], nextMigration: "M2" },
  { id: "E13", family: "delayed Stratagem attachment", currentOwner: "TableResolutionSequence Judgement arrival", route: "zone-transition", legacyRoutes: ["TABLE_JUDGEMENT_ATTACHMENT"], nextMigration: "M3" },
  { id: "E14", family: "later Judgement reveal/outcome/removal", currentOwner: "TableResolutionSequence Judgement reveal", route: "zone-transition", legacyRoutes: ["TABLE_JUDGEMENT_REVEAL"], nextMigration: "M3" },
  { id: "E15", family: "committed public card to Discard", currentOwner: "TableResolutionSequence direct Discard event", route: "zone-transition", legacyRoutes: ["TABLE_DIRECT_DISCARD"], nextMigration: "M4" },
  { id: "E16", family: "other publicly disclosed discard/reveal", currentOwner: "PublicHandRevealTransition for exact committed HAND-to-HAND reveal; no owner without matching proof", route: "zone-transition", legacyRoutes: [], nextMigration: "none" },
  { id: "E17", family: "public Hero-skill COST material", currentOwner: "PublicCardDisplay validated R4 frame", route: "journey", legacyRoutes: [], nextMigration: "none" },
  { id: "E18", family: "public CONVERSION/EFFECT material", currentOwner: "PublicCardDisplay validated R4 frame", route: "journey", legacyRoutes: [], nextMigration: "none" },
  { id: "E19", family: "public skill result without public material", currentOwner: "PublicSkillEventAnnouncementLayer fact", route: "fact-only", legacyRoutes: [], nextMigration: "none" },
  { id: "E20", family: "private card receipt or draw", currentOwner: "recipient-only R7 PrivateCardReceipt", route: "private-receipt", legacyRoutes: [], nextMigration: "none" },
  { id: "E21", family: "draft, pending private Negation/Pass, or legality update", currentOwner: "no public card route", route: "no-public-action", legacyRoutes: [], nextMigration: "none" },
] as const satisfies readonly CoverageEntry[];

type LegacyOwner = "TableResolutionSequence" | "PublicCardDisplay.static-fallback";
type LegacyAllowlistEntry = {
  id: PublicPresentationLegacyRouteId;
  owner: LegacyOwner;
  removalSlice: "M2" | "M3" | "M4" | "M5" | "M6";
  action: PublicTimelineCardProof["action"];
  destination?: PublicTimelineCardProof["destination"];
  requiredCardKind?: string;
  requiresPublicZoneProjection?: boolean;
};

/** Exact temporary owners only. There is deliberately no generic static-fallback entry. */
export const PUBLIC_PRESENTATION_LEGACY_ALLOWLIST: readonly LegacyAllowlistEntry[] = [
  { id: "TABLE_EQUIPMENT_ARRIVAL", owner: "TableResolutionSequence", removalSlice: "M2", action: "equip", destination: "EQUIPMENT", requiresPublicZoneProjection: true },
  { id: "TABLE_EQUIPMENT_REPLACEMENT_LOSS", owner: "TableResolutionSequence", removalSlice: "M2", action: "discard", destination: "DISCARD" },
  { id: "TABLE_JUDGEMENT_ATTACHMENT", owner: "TableResolutionSequence", removalSlice: "M3", action: "play", destination: "JUDGEMENT", requiresPublicZoneProjection: true },
  { id: "TABLE_JUDGEMENT_REVEAL", owner: "TableResolutionSequence", removalSlice: "M3", action: "reveal", destination: "DISCARD" },
  { id: "TABLE_DIRECT_DISCARD", owner: "TableResolutionSequence", removalSlice: "M4", action: "discard", destination: "DISCARD" },
  { id: "TABLE_PUBLIC_PLAY_HISTORY", owner: "TableResolutionSequence", removalSlice: "M6", action: "play", destination: "AUTHOR_HISTORY" },
  { id: "STATIC_ORDERED_HALBERD_ROOT", owner: "PublicCardDisplay.static-fallback", removalSlice: "M5", action: "play", requiredCardKind: "Attack" },
  { id: "STATIC_SELF_TARGET_PEACH_ROOT", owner: "PublicCardDisplay.static-fallback", removalSlice: "M5", action: "play", requiredCardKind: "Peach" },
  { id: "STATIC_BUMPER_HARVEST_SETTLEMENT", owner: "PublicCardDisplay.static-fallback", removalSlice: "M5", action: "play", requiredCardKind: "BumperHarvest" },
];

export type PublicTimelineEventReference = {
  semantics: "PROVEN";
  visibility: "PUBLIC";
  eventId: string;
  publicSequence: number;
  interactionId: string;
  rootFrameId: string;
  rootEventId?: string;
  actorId?: string;
  action?: "play" | "response" | "equip" | "discard" | "reveal" | "gain" | "activate" | "zone_transition";
  physicalCardIds?: readonly string[];
  physicalCardKinds?: Readonly<Record<string, string>>;
  destination?: "EQUIPMENT" | "JUDGEMENT" | "DISCARD" | "AUTHOR_HISTORY";
};

export type PublicTimelineCardProof = PublicTimelineEventReference & {
  rootEventId: string;
  actorId: string;
  action: NonNullable<PublicTimelineEventReference["action"]>;
  physicalCardIds: readonly string[];
};

export type PublicZoneProjection = {
  semantics: "PROVEN";
  visibility: "PUBLIC";
  eventId: string;
  physicalCardId: string;
  ownerId: string | null;
  zone: "EQUIPMENT" | "JUDGEMENT" | "DISCARD" | "PUBLIC_PLAY";
  slot?: "weapon" | "armor" | "offensiveHorse" | "defensiveHorse";
  from?: PublicZoneEndpoint | { zone: "PUBLIC_PLAY"; ownerId: string | null };
  sourceEventId?: string;
  rootEventId?: string;
};

type AuditSnapshot = Pick<PresentationSnapshot,
  "identity" | "stable" | "interaction" | "publicEventFacts" | "retainedPublicEvent" | "retainedPublicEventFacts">;
type AuditClientView = Pick<PresentationClientView,
  "hasInteraction" | "interactionId" | "checkpointId" | "presentationRevision" | "rootFrameId" | "stage" | "stableKind">;

type TransitionCardSet = { eventId: string; physicalCardIds: readonly string[] };
type CandidateBase = { interactionId: string; rootFrameId: string };
type CandidateMode = { mode: "active" | "parked" };

export type PublicPresentationCandidate =
  | (CandidateBase & {
    kind: "public-journey";
    rootEventId: string;
    sourceId: string;
    mode: "active" | "parked";
    transitions: readonly TransitionCardSet[];
    /** Geometry readiness never changes the parent claim. */
    layoutReady: boolean;
  })
  | (CandidateBase & {
    kind: "zone-transition";
    mode: CandidateMode["mode"];
    rootEventId: string;
    transitionId: string;
    eventId: string;
    physicalCardId: string;
    ownerId: string | null;
    destination: PublicZoneProjection["zone"];
    sourceEventId?: string;
    slot?: PublicZoneProjection["slot"];
    from?: PublicZoneProjection["from"];
  })
  | { kind: "fact-only"; eventId: string }
  | { kind: "private-receipt"; eventId: string; physicalCardId: string; recipientId: string }
  | { kind: "private-pending" }
  | {
    kind: "legacy";
    mode: CandidateMode["mode"];
    allowlistId: PublicPresentationLegacyRouteId;
    transitionId: string;
    eventId: string;
    rootEventId: string;
    physicalCardIds: readonly string[];
    interactionId: string;
    rootFrameId: string;
  };

export type PublicPresentationExistingOwner = {
  eventId: string;
  physicalCardId: string;
  owner: "PublicCardDisplay" | "TableResolutionSequence" | "PublicCardDisplay.static-fallback";
};

export type PublicPresentationRoute =
  | {
    kind: "public-journey";
    claimedBy: "PublicCardDisplay";
    claimId: string;
    scope: { roomCode: string; viewerId: string; generation: string };
    transitions: readonly { transitionId: string; eventId: string; physicalCardIds: readonly string[]; order: number }[];
    presentationState: "ready" | "layout-pending";
    shadowComparison: ShadowComparison;
  }
  | {
    kind: "zone-transition";
    claimedBy: "PublicPhysicalCardTransition";
    claimId: string;
    scope: { roomCode: string; viewerId: string; generation: string };
    eventId: string;
    physicalCardId: string;
    ownerId: string | null;
    destination: PublicZoneProjection["zone"];
    sourceEventId?: string;
    slot?: PublicZoneProjection["slot"];
    from?: PublicZoneProjection["from"];
    shadowComparison: ShadowComparison;
  }
  | {
    kind: "fact-only";
    claimedBy: "PublicInteractionAnnouncementLayer" | "PublicSkillEventAnnouncementLayer";
    claimId: string;
    scope: { roomCode: string; viewerId: string; generation: string };
    eventId: string;
    shadowComparison: ShadowComparison;
  }
  | {
    kind: "private-receipt";
    claimedBy: "PrivateCardReceipt";
    claimId: string;
    scope: { roomCode: string; viewerId: string; generation: string };
    eventId: string;
    physicalCardId: string;
    shadowComparison: ShadowComparison;
  }
  | {
    kind: "legacy-allowlisted";
    claimedBy: LegacyOwner;
    allowlistId: PublicPresentationLegacyRouteId;
    claimId: string;
    scope: { roomCode: string; viewerId: string; generation: string };
    eventId: string;
    physicalCardIds: readonly string[];
    removalSlice: LegacyAllowlistEntry["removalSlice"];
    shadowComparison: ShadowComparison;
  }
  | { kind: "no-public-card-action"; reason: "private-or-uncommitted" | "replayed-transition" }
  | { kind: "blocked-invalid-proof"; reason: RouteBlockReason };

type ShadowComparison = {
  status: "match" | "mismatch" | "multiple-owners" | "unobserved" | "no-card-claim";
  currentOwners: readonly string[];
};

type RouteBlockReason =
  | "missing-scope"
  | "scope-generation-mismatch"
  | "snapshot-view-mismatch"
  | "active-interaction-mismatch"
  | "missing-public-fact"
  | "conflicting-public-facts"
  | "missing-public-timeline-proof"
  | "timeline-proof-mismatch"
  | "root-actor-mismatch"
  | "duplicate-transition"
  | "missing-zone-proof"
  | "zone-proof-mismatch"
  | "legacy-route-not-allowlisted"
  | "legacy-route-proof-mismatch";

export type PublicPresentationRouterInput = {
  scope: { roomCode: string; viewerId: string; generation: string };
  snapshot: AuditSnapshot;
  clientView: AuditClientView;
  publicTimeline: readonly PublicTimelineEventReference[];
  publicZones: readonly PublicZoneProjection[];
  replay: { retiredTransitionIds?: readonly string[]; minimumPublicSequence?: number };
  candidate: PublicPresentationCandidate | null;
  existingOwners?: readonly PublicPresentationExistingOwner[];
  expectedScopeGeneration?: string;
};

function blocked(reason: RouteBlockReason): PublicPresentationRoute {
  return { kind: "blocked-invalid-proof", reason };
}

function isNonEmpty(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

function uniqueStrings(values: readonly string[]) {
  return new Set(values).size === values.length && values.every(isNonEmpty);
}

function allPublicFacts(snapshot: AuditSnapshot): readonly PublicPresentationEvent[] {
  return [...snapshot.publicEventFacts, ...(snapshot.retainedPublicEventFacts ?? []), ...(snapshot.retainedPublicEvent ? [snapshot.retainedPublicEvent] : [])];
}

export function publicFactsForEvent(snapshot: AuditSnapshot, eventId: string): PublicPresentationEvent[] {
  const rows = allPublicFacts(snapshot).filter((fact) => fact.eventId === eventId);
  const uniqueRows = rows.filter((fact, index) => rows.findIndex((other) => other.identity.interactionId === fact.identity.interactionId
    && other.identity.rootFrameId === fact.identity.rootFrameId && other.identity.checkpointId === fact.identity.checkpointId
    && other.identity.presentationRevision === fact.identity.presentationRevision && other.order === fact.order
    && other.rootEventId === fact.rootEventId && other.category === fact.category && other.actorId === fact.actorId) === index);
  return uniqueRows;
}

function currentScopeMatches(input: PublicPresentationRouterInput, candidate: CandidateBase, mode: "active" | "parked"): boolean {
  const { snapshot, clientView } = input;
  if (clientView.hasInteraction) {
    return Boolean(snapshot.identity && snapshot.interaction?.semantics === "PROVEN"
      && snapshot.identity.interactionId === clientView.interactionId
      && snapshot.identity.checkpointId === clientView.checkpointId
      && snapshot.identity.presentationRevision === clientView.presentationRevision
      && snapshot.stable.interactionId === clientView.interactionId
      && snapshot.stable.checkpointId === clientView.checkpointId
      && snapshot.stable.presentationRevision === clientView.presentationRevision
      && snapshot.interaction.interactionId === clientView.interactionId
      && snapshot.interaction.rootFrameId === clientView.rootFrameId
      && candidate.interactionId === clientView.interactionId
      && candidate.rootFrameId === clientView.rootFrameId);
  }
  if (mode !== "parked" || snapshot.identity || snapshot.interaction) return false;
  const retained = snapshot.retainedPublicEvent;
  return Boolean(retained && retained.visibility === "PUBLIC"
    && retained.identity.interactionId === candidate.interactionId
    && retained.identity.rootFrameId === candidate.rootFrameId);
}

type PublicEventProofResult =
  | { ok: true; fact: PublicPresentationEvent; event: PublicTimelineEventReference }
  | { ok: false; error: RouteBlockReason };

function publicFactFor(input: PublicPresentationRouterInput, candidate: CandidateBase & { eventId: string; rootEventId: string }, requireCardPlay = false): PublicEventProofResult {
  const facts = publicFactsForEvent(input.snapshot, candidate.eventId);
  if (facts.length === 0) return { ok: false, error: "missing-public-fact" };
  if (facts.length !== 1) return { ok: false, error: "conflicting-public-facts" };
  const fact = facts[0];
  if (fact.visibility !== "PUBLIC" || fact.semantics !== "PROVEN"
    || fact.identity.interactionId !== candidate.interactionId
    || fact.identity.rootFrameId !== candidate.rootFrameId
    || fact.rootEventId !== candidate.rootEventId
    || requireCardPlay && fact.category !== "CARD_PLAYED") return { ok: false, error: "timeline-proof-mismatch" };
  if (input.clientView.hasInteraction) {
    const current = input.snapshot.identity;
    if (!current || fact.identity.interactionId !== current.interactionId
      || fact.identity.presentationRevision > current.presentationRevision
      || fact.identity.presentationRevision === current.presentationRevision && fact.identity.checkpointId !== current.checkpointId) {
      return { ok: false, error: "timeline-proof-mismatch" };
    }
  } else {
    const retained = input.snapshot.retainedPublicEvent;
    if (!retained || retained.identity.interactionId !== fact.identity.interactionId
      || retained.identity.rootFrameId !== fact.identity.rootFrameId
      || fact.identity.presentationRevision > retained.identity.presentationRevision) return { ok: false, error: "timeline-proof-mismatch" };
  }
  const timeline = input.publicTimeline.filter((row) => row.eventId === candidate.eventId);
  if (timeline.length !== 1) return { ok: false, error: "missing-public-timeline-proof" };
  const event = timeline[0];
  if (event.semantics !== "PROVEN" || event.visibility !== "PUBLIC"
    || event.publicSequence !== fact.order
    || event.interactionId !== candidate.interactionId
    || event.rootFrameId !== candidate.rootFrameId
    || event.rootEventId !== candidate.rootEventId) return { ok: false, error: "timeline-proof-mismatch" };
  const minimum = input.replay.minimumPublicSequence;
  if (minimum !== undefined && event.publicSequence < minimum) return { ok: false, error: "missing-public-timeline-proof" };
  return { ok: true, fact, event };
}

function compareOwners(
  expected: string,
  transitions: readonly { eventId: string; physicalCardIds: readonly string[] }[],
  existing: readonly PublicPresentationExistingOwner[] = [],
): ShadowComparison {
  if (transitions.length === 0) return { status: "no-card-claim", currentOwners: [] };
  const owners = new Set<string>();
  let missing = false;
  let multiple = false;
  for (const transition of transitions) {
    for (const cardId of transition.physicalCardIds) {
      const matches = existing.filter((item) => item.eventId === transition.eventId && item.physicalCardId === cardId);
      const uniqueOwners = [...new Set(matches.map(({ owner }) => owner))];
      if (uniqueOwners.length === 0) missing = true;
      if (uniqueOwners.length > 1) multiple = true;
      uniqueOwners.forEach((owner) => owners.add(owner));
    }
  }
  const currentOwners = [...owners].sort();
  return {
    status: multiple ? "multiple-owners" : missing ? "unobserved" : currentOwners.length === 1 && currentOwners[0] === expected ? "match" : "mismatch",
    currentOwners,
  };
}

function scope(input: PublicPresentationRouterInput) {
  return { roomCode: input.scope.roomCode, viewerId: input.scope.viewerId, generation: input.scope.generation };
}

function transitionClaimId(roomCode: string, transitionId: string) {
  return [roomCode, "public-transition", transitionId].join("\u001f");
}

/**
 * Pure shadow router. It consumes only validated public projection, committed public timeline
 * references, explicit public zone state, and the current viewer scope. It is not wired to JSX.
 */
export function routePublicPresentation(input: PublicPresentationRouterInput): PublicPresentationRoute {
  const candidate = input.candidate;
  if (!candidate || candidate.kind === "private-pending") return { kind: "no-public-card-action", reason: "private-or-uncommitted" };
  if (candidate.kind === "private-receipt") {
    if (!isNonEmpty(input.scope.roomCode) || !isNonEmpty(input.scope.viewerId) || !isNonEmpty(input.scope.generation)) return blocked("missing-scope");
    if (input.expectedScopeGeneration && input.expectedScopeGeneration !== input.scope.generation) return blocked("scope-generation-mismatch");
    if (candidate.recipientId !== input.scope.viewerId) return { kind: "no-public-card-action", reason: "private-or-uncommitted" };
    const hasPublicLeak = input.publicTimeline.some((event) => event.eventId === candidate.eventId || event.physicalCardIds?.includes(candidate.physicalCardId));
    if (hasPublicLeak) return blocked("timeline-proof-mismatch");
    return {
      kind: "private-receipt", claimedBy: "PrivateCardReceipt",
      claimId: transitionClaimId(input.scope.roomCode, candidate.eventId), scope: scope(input),
      eventId: candidate.eventId, physicalCardId: candidate.physicalCardId,
      shadowComparison: { status: "no-card-claim", currentOwners: [] },
    };
  }

  if (!isNonEmpty(input.scope.roomCode) || !isNonEmpty(input.scope.viewerId) || !isNonEmpty(input.scope.generation)) return blocked("missing-scope");
  if (input.expectedScopeGeneration && input.expectedScopeGeneration !== input.scope.generation) return blocked("scope-generation-mismatch");

  if (candidate.kind === "fact-only") {
    const factRows = publicFactsForEvent(input.snapshot, candidate.eventId);
    if (factRows.length !== 1) return blocked(factRows.length ? "conflicting-public-facts" : "missing-public-fact");
    const fact = factRows[0];
    if (fact.semantics !== "PROVEN" || fact.visibility !== "PUBLIC") return blocked("timeline-proof-mismatch");
    const timelineRows = input.publicTimeline.filter((row) => row.eventId === candidate.eventId);
    if (timelineRows.length !== 1 || timelineRows[0].semantics !== "PROVEN" || timelineRows[0].visibility !== "PUBLIC"
      || timelineRows[0].publicSequence !== fact.order || timelineRows[0].interactionId !== fact.identity.interactionId
      || timelineRows[0].rootFrameId !== fact.identity.rootFrameId
      || fact.rootEventId && timelineRows[0].rootEventId !== fact.rootEventId) return blocked("missing-public-timeline-proof");
    if (input.clientView.hasInteraction) {
      const current = input.snapshot.identity;
      if (!current || fact.identity.interactionId !== current.interactionId
        || fact.identity.presentationRevision > current.presentationRevision
        || fact.identity.presentationRevision === current.presentationRevision && fact.identity.checkpointId !== current.checkpointId) return blocked("timeline-proof-mismatch");
    } else {
      const retained = input.snapshot.retainedPublicEvent;
      if (!retained || retained.identity.interactionId !== fact.identity.interactionId
        || retained.identity.rootFrameId !== fact.identity.rootFrameId
        || fact.identity.presentationRevision > retained.identity.presentationRevision) return blocked("timeline-proof-mismatch");
    }
    return {
      kind: "fact-only", claimedBy: fact.category === "SKILL_USED" ? "PublicSkillEventAnnouncementLayer" : "PublicInteractionAnnouncementLayer",
      claimId: transitionClaimId(input.scope.roomCode, candidate.eventId), scope: scope(input), eventId: candidate.eventId,
      shadowComparison: { status: "no-card-claim", currentOwners: [] },
    };
  }

  if (candidate.kind === "public-journey") {
    if (!currentScopeMatches(input, candidate, candidate.mode)) return blocked("active-interaction-mismatch");
    if (!isNonEmpty(candidate.rootEventId) || !isNonEmpty(candidate.sourceId) || !candidate.transitions.length
      || !uniqueStrings(candidate.transitions.map(({ eventId }) => eventId))
      || candidate.transitions.some(({ physicalCardIds }) => !physicalCardIds.length || !uniqueStrings(physicalCardIds))) return blocked("duplicate-transition");
    const root = publicFactFor(input, { ...candidate, eventId: candidate.rootEventId, rootEventId: candidate.rootEventId }, true);
    if (!root.ok) return blocked(root.error);
    if (!root.event.actorId || !root.event.physicalCardIds || root.fact.actorId !== candidate.sourceId || root.event.actorId !== candidate.sourceId) return blocked("root-actor-mismatch");
    const routeTransitions: { transitionId: string; eventId: string; physicalCardIds: readonly string[]; order: number }[] = [];
    for (const transition of candidate.transitions) {
      const proof = publicFactFor(input, { ...candidate, eventId: transition.eventId, rootEventId: candidate.rootEventId }, true);
      if (!proof.ok) return blocked(proof.error);
      if (proof.event.actorId !== proof.fact.actorId || !proof.event.physicalCardIds || proof.event.physicalCardIds.length !== transition.physicalCardIds.length
        || transition.physicalCardIds.some((cardId) => !proof.event.physicalCardIds?.includes(cardId))) return blocked("timeline-proof-mismatch");
      routeTransitions.push({ transitionId: transition.eventId, eventId: transition.eventId, physicalCardIds: [...transition.physicalCardIds], order: proof.event.publicSequence });
    }
    const rootTransition = routeTransitions.find((item) => item.eventId === candidate.rootEventId);
    if (!rootTransition) return blocked("missing-public-timeline-proof");
    const retired = new Set(input.replay.retiredTransitionIds ?? []);
    if (routeTransitions.some(({ transitionId }) => retired.has(transitionId))) return { kind: "no-public-card-action", reason: "replayed-transition" };
    routeTransitions.sort((left, right) => left.order - right.order || left.eventId.localeCompare(right.eventId));
    const shadowComparison = compareOwners("PublicCardDisplay", routeTransitions, input.existingOwners);
    return {
      kind: "public-journey", claimedBy: "PublicCardDisplay",
      claimId: transitionClaimId(input.scope.roomCode, candidate.rootEventId), scope: scope(input),
      transitions: routeTransitions,
      presentationState: candidate.layoutReady ? "ready" : "layout-pending",
      shadowComparison,
    };
  }

  if (candidate.kind === "zone-transition") {
    if (!currentScopeMatches(input, candidate, candidate.mode)) return blocked("active-interaction-mismatch");
    const proof = publicFactFor(input, candidate);
    if (!proof.ok) return blocked(proof.error);
    if (!proof.event.physicalCardIds?.includes(candidate.physicalCardId) || proof.event.actorId !== proof.fact.actorId) return blocked("timeline-proof-mismatch");
    if (candidate.destination === "PUBLIC_PLAY") return blocked("zone-proof-mismatch");
    if (candidate.destination === "EQUIPMENT" && (proof.event.action !== "equip" || proof.fact.category !== "CARD_EQUIPPED")
      || candidate.destination === "JUDGEMENT" && proof.event.action !== "play" && proof.event.action !== "zone_transition"
      || candidate.destination === "DISCARD" && proof.event.action !== "discard" && proof.event.action !== "reveal" && proof.event.action !== "zone_transition") return blocked("zone-proof-mismatch");
    if (proof.event.action === "zone_transition" && (proof.fact.category !== "STAGE_COMPLETED" || !candidate.sourceEventId)) return blocked("zone-proof-mismatch");
    const zoneRows = input.publicZones.filter((zone) => zone.eventId === candidate.eventId && zone.physicalCardId === candidate.physicalCardId);
    if (zoneRows.length !== 1) return blocked("missing-zone-proof");
    const zone = zoneRows[0];
    if (zone.semantics !== "PROVEN" || zone.visibility !== "PUBLIC" || zone.zone !== candidate.destination
      || zone.ownerId !== candidate.ownerId || zone.slot !== candidate.slot
      || zone.sourceEventId !== candidate.sourceEventId
      || zone.rootEventId !== undefined && zone.rootEventId !== candidate.rootEventId) return blocked("zone-proof-mismatch");
    if (candidate.from && (!zone.from || zone.from.zone !== candidate.from.zone
      || zone.from.ownerId !== candidate.from.ownerId || zone.from.slot !== candidate.from.slot)) return blocked("zone-proof-mismatch");
    const claimId = transitionClaimId(input.scope.roomCode, candidate.transitionId);
    if ((input.replay.retiredTransitionIds ?? []).includes(candidate.transitionId)) return { kind: "no-public-card-action", reason: "replayed-transition" };
    const shadowComparison = compareOwners("PublicPhysicalCardTransition", [{ eventId: candidate.eventId, physicalCardIds: [candidate.physicalCardId] }], input.existingOwners);
    return {
      kind: "zone-transition", claimedBy: "PublicPhysicalCardTransition", claimId, scope: scope(input),
      eventId: candidate.eventId, physicalCardId: candidate.physicalCardId, ownerId: candidate.ownerId,
      destination: candidate.destination, ...(candidate.sourceEventId ? { sourceEventId: candidate.sourceEventId } : {}), ...(candidate.slot ? { slot: candidate.slot } : {}),
      ...(candidate.from ? { from: candidate.from } : {}), shadowComparison,
    };
  }

  if (candidate.kind === "legacy") {
    if (!currentScopeMatches(input, candidate, candidate.mode)) return blocked("active-interaction-mismatch");
    const allowlist = PUBLIC_PRESENTATION_LEGACY_ALLOWLIST.find(({ id }) => id === candidate.allowlistId);
    if (!allowlist) return blocked("legacy-route-not-allowlisted");
    if (!isNonEmpty(candidate.transitionId) || !candidate.physicalCardIds.length || !uniqueStrings(candidate.physicalCardIds)) return blocked("legacy-route-proof-mismatch");
    const proof = publicFactFor(input, { ...candidate, eventId: candidate.eventId, rootEventId: candidate.rootEventId }, allowlist.action === "play");
    if (!proof.ok) return blocked(proof.error);
    if (proof.event.action !== allowlist.action || !proof.event.physicalCardIds || proof.event.physicalCardIds.length !== candidate.physicalCardIds.length
      || candidate.physicalCardIds.some((cardId) => !proof.event.physicalCardIds?.includes(cardId))
      || allowlist.destination && proof.event.destination !== allowlist.destination
      || allowlist.requiredCardKind && candidate.physicalCardIds.some((cardId) => proof.event.physicalCardKinds?.[cardId] !== allowlist.requiredCardKind)) return blocked("legacy-route-proof-mismatch");
    if (allowlist.requiresPublicZoneProjection) {
      const matched = candidate.physicalCardIds.every((physicalCardId) => input.publicZones.some((zone) => zone.semantics === "PROVEN"
        && zone.visibility === "PUBLIC" && zone.eventId === candidate.eventId && zone.physicalCardId === physicalCardId
        && zone.zone === allowlist.destination && zone.ownerId !== null));
      if (!matched) return blocked("missing-zone-proof");
    }
    if ((input.replay.retiredTransitionIds ?? []).includes(candidate.transitionId)) return { kind: "no-public-card-action", reason: "replayed-transition" };
    const transition = { eventId: candidate.eventId, physicalCardIds: candidate.physicalCardIds };
    return {
      kind: "legacy-allowlisted", claimedBy: allowlist.owner, allowlistId: allowlist.id,
      claimId: transitionClaimId(input.scope.roomCode, candidate.transitionId), scope: scope(input),
      eventId: candidate.eventId, physicalCardIds: [...candidate.physicalCardIds], removalSlice: allowlist.removalSlice,
      shadowComparison: compareOwners(allowlist.owner, [transition], input.existingOwners),
    };
  }

  return { kind: "no-public-card-action", reason: "private-or-uncommitted" };
}
