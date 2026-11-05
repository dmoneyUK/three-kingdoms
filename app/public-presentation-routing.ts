import type { PresentationClientView } from "../game/presentation-client";
import type { PresentationSnapshot } from "../game/presentation-snapshot";
import type { PublicPresentationEvent, PublicZoneEndpoint } from "../game/presentation-semantics";

export type PublicPresentationCoverageId =
  | "E01" | "E02" | "E03" | "E04" | "E05" | "E06" | "E07"
  | "E08" | "E09" | "E10" | "E11" | "E12" | "E13" | "E14"
  | "E15" | "E16" | "E17" | "E18" | "E19" | "E20" | "E21";

type CoverageEntry = {
  id: PublicPresentationCoverageId;
  family: string;
  producer: string;
  currentOwner: string;
  route: "journey" | "zone-transition" | "fact-only" | "private-receipt" | "no-public-action";
  zone: string;
};

/** Auditable producer → route → owner → zone inventory for E01–E21. */
export const PUBLIC_PRESENTATION_EVENT_COVERAGE = [
  { id: "E01", family: "committed Attack root", producer: "public card play or validated Attack conversion", currentOwner: "PublicCardDisplay Attack journey", route: "journey", zone: "HAND → PUBLIC_PLAY → author history" },
  { id: "E02", family: "committed Dodge or Attack response", producer: "public response card event", currentOwner: "PublicCardDisplay response journey", route: "journey", zone: "HAND → PUBLIC_PLAY → response-author history" },
  { id: "E03", family: "Duel root and committed exchanges", producer: "public Duel root and response events", currentOwner: "PublicCardDisplay Duel journey", route: "journey", zone: "HAND → PUBLIC_PLAY → actor history" },
  { id: "E04", family: "Steal/Dismantle root and Negation chain", producer: "public root and committed response events", currentOwner: "PublicCardDisplay single-target journey", route: "journey", zone: "HAND → PUBLIC_PLAY → actor history" },
  { id: "E05", family: "Steal/Dismantle settlement result", producer: "server-proven settlement or private receipt", currentOwner: "root journey plus fact/private receipt; no result CardFace", route: "fact-only", zone: "no new public CardFace; recipient HAND remains private; true DISCARD uses E15" },
  { id: "E06", family: "Borrowed Sword root and actual B Attack", producer: "committed root and forced public Attack event", currentOwner: "PublicCardDisplay Borrowed Sword journey", route: "journey", zone: "HAND → PUBLIC_PLAY → each actual author's history" },
  { id: "E07", family: "committed Negation/counter/final disposition", producer: "committed public response-card events", currentOwner: "PublicCardDisplay journey and proven fact", route: "journey", zone: "HAND → PUBLIC_PLAY → response-author history" },
  { id: "E08", family: "Group/AOE root and proven recipient effects", producer: "public group root and committed responses", currentOwner: "PublicCardDisplay group journey", route: "journey", zone: "HAND → PUBLIC_PLAY → each response author's history" },
  { id: "E09", family: "Bumper Harvest root/pool/current pick", producer: "committed Harvest root, public pool and server-proven participant progress", currentOwner: "PublicCardDisplay Harvest journey and public pool", route: "journey", zone: "HAND → PUBLIC_PLAY; revealed pool cards are public until claimed" },
  { id: "E10", family: "Peach/Oath/Draw Two and other original roots", producer: "committed public card-play event", currentOwner: "specialized journey or generic proof-backed physical-card journey", route: "journey", zone: "HAND → PUBLIC_PLAY → actual author history" },
  { id: "E11", family: "Equipment play to actual slot", producer: "committed equip event plus public zone/slot proof", currentOwner: "PublicEquipmentCardTransition; Step B H4 is separate", route: "zone-transition", zone: "HAND → actual EQUIPMENT slot" },
  { id: "E12", family: "Equipment replacement/loss and private refusal transfer", producer: "committed equipment discard or recipient-only refusal receipt", currentOwner: "PublicEquipmentCardTransition; recipient-only R7", route: "zone-transition", zone: "EQUIPMENT → DISCARD; private refusal → recipient HAND" },
  { id: "E13", family: "delayed Stratagem attachment", producer: "committed play plus public Judgement-zone proof", currentOwner: "PublicJudgementCardTransition", route: "zone-transition", zone: "HAND → JUDGEMENT" },
  { id: "E14", family: "later Judgement reveal/outcome/removal", producer: "later public Judgement reveal and result event", currentOwner: "PublicJudgementCardTransition", route: "zone-transition", zone: "JUDGEMENT → public reveal / DISCARD only when proven" },
  { id: "E15", family: "committed public card to Discard", producer: "committed discard event with exact public source and destination", currentOwner: "PublicDiscardCardTransition", route: "zone-transition", zone: "proven HAND/EQUIPMENT/JUDGEMENT → DISCARD" },
  { id: "E16", family: "other publicly disclosed discard/reveal", producer: "committed public reveal event with exact source, card and recipient", currentOwner: "PublicHandRevealTransition for exact committed HAND-to-HAND reveal; no owner without matching proof", route: "zone-transition", zone: "HAND → recipient HAND; identity public only after commitment" },
  { id: "E17", family: "public Hero-skill COST material", producer: "committed public skill-effect frame and exact material proof", currentOwner: "PublicCardDisplay validated R4 frame", route: "journey", zone: "proven material-owner zone → public COST frame" },
  { id: "E18", family: "public CONVERSION/EFFECT material", producer: "committed public conversion/effect frame and exact physical-card proof", currentOwner: "PublicCardDisplay validated R4 frame", route: "journey", zone: "proven original material zone → public effect frame / actual destination" },
  { id: "E19", family: "public skill result without public material", producer: "committed public semantic fact", currentOwner: "PublicSkillEventAnnouncementLayer fact", route: "fact-only", zone: "no public physical-card zone" },
  { id: "E20", family: "private card receipt or draw", producer: "authenticated recipient-only receipt projection", currentOwner: "recipient-only R7 PrivateCardReceipt", route: "private-receipt", zone: "private receipt → recipient HAND" },
  { id: "E21", family: "draft, pending private Negation/Pass, or legality update", producer: "viewer-authorized CurrentAction only", currentOwner: "no public card route", route: "no-public-action", zone: "no committed public physical-card transition" },
] as const satisfies readonly CoverageEntry[];

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
  | { kind: "private-pending" };

export type PublicPresentationExistingOwner = {
  eventId: string;
  physicalCardId: string;
  owner: string;
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
  | "zone-proof-mismatch";

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

  return { kind: "no-public-card-action", reason: "private-or-uncommitted" };
}
