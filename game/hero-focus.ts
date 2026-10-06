import type { InteractionStageView, PresentationDisplayIdentity } from "./presentation-client";
import type { PresentationSnapshotGroupParticipantProgress } from "./presentation-snapshot";

export type HeroFocusPlayerDisplay = {
  name?: string | null;
  heroId?: string | null;
  heroName?: string | null;
  hp?: number | null;
  maxHp?: number | null;
};

export type HeroFocusPlayerDisplayResolver = (playerId: string) => HeroFocusPlayerDisplay | null | undefined;

export type HeroFocusPlayerView = {
  id: string;
  name: string;
  known: boolean;
  heroId: string | null;
  heroName: string | null;
  hp: number | null;
  maxHp: number | null;
};

export type HeroFocusRoleLabel = "CURRENT PARTICIPANT" | "CURRENT TARGET" | "DYING PLAYER" | "SOURCE";

export type HeroFocusView = {
  visible: boolean;
  primary: HeroFocusPlayerView | null;
  roleLabel: HeroFocusRoleLabel | null;
  source: PresentationDisplayIdentity;
  nestedContext: string | null;
};

export type MediumParticipantView = {
  player: HeroFocusPlayerView;
  roleLabel: "SOURCE";
};

export type GroupTargetScopeView = {
  density: "medium" | "compact";
  hasProgress: boolean;
  resolutionSemantics: "GROUP" | "ORDERED" | null;
  players: readonly (HeroFocusPlayerView & {
    order: number | null;
    status: PresentationSnapshotGroupParticipantProgress["status"] | null;
    isViewer: boolean;
  })[];
};

/** Consume only accepted public Stage IDs and explicitly projected Group progress.
 * Without progress this remains a neutral historical scope; it never infers
 * status, eligibility, or order from Room/Pending/private selection. */
export function projectGroupTargetScopeForViewer(
  stage: InteractionStageView,
  projectedFocus: HeroFocusView,
  mediumSource: MediumParticipantView | null,
  viewerId: string | null,
  resolvePlayerDisplay: HeroFocusPlayerDisplayResolver = () => null,
): GroupTargetScopeView | null {
  const groupProgress = stage.groupParticipantProgress ?? [];
  const orderedProgress = stage.orderedTargetProgress ?? [];
  if (groupProgress.length > 0 && orderedProgress.length > 0) return null;
  const progress = groupProgress.length > 0 ? groupProgress : orderedProgress;
  const resolutionSemantics = groupProgress.length > 0 ? "GROUP" : orderedProgress.length > 0 ? "ORDERED" : null;
  const hasProgress = progress.length > 0;
  if (!stage.visible || (stage.stage !== "GROUP_RESOLUTION" && !hasProgress)) return null;

  if (hasProgress) {
    const byId = new Map(stage.originalTargets.filter((target) => target.id).map((target) => [target.id as string, target]));
    const players = progress.map((participantProgress) => {
      const target = byId.get(participantProgress.playerId);
      const player = target ? decoratePlayer(target, resolvePlayerDisplay) : null;
      return player ? { ...player, order: participantProgress.order, status: participantProgress.status, isViewer: participantProgress.playerId === viewerId } : null;
    });
    if (players.some((player) => player === null)) return null;
    const participants = players as NonNullable<(typeof players)[number]>[];
    return {
      density: participants.length >= 4 ? "compact" : "medium",
      hasProgress: true,
      resolutionSemantics,
      players: participants,
    };
  }

  const targets = new Map<string, PresentationDisplayIdentity>();
  for (const target of stage.originalTargets) {
    if (target.id && target.id !== viewerId) targets.set(target.id, target);
  }
  const players = [...targets.values()]
    .filter((target) => target.id !== projectedFocus.primary?.id && target.id !== mediumSource?.player.id)
    .map((target) => decoratePlayer(target, resolvePlayerDisplay))
    .filter((player): player is HeroFocusPlayerView => player !== null);
  const density = players.length >= 4 ? "compact" : "medium";
  return players.length ? { density, hasProgress: false, resolutionSemantics: null, players: players.map((player) => ({ ...player, order: null, status: null, isViewer: false })) } : null;
}

const HIDDEN_FOCUS: HeroFocusView = {
  visible: false,
  primary: null,
  roleLabel: null,
  source: { id: null, name: "No source", known: false },
  nestedContext: null,
};

function publicNumber(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function publicText(value: string | null | undefined) {
  const text = value?.trim();
  return text || null;
}

function decoratePlayer(
  selected: PresentationDisplayIdentity,
  resolvePlayerDisplay: HeroFocusPlayerDisplayResolver,
): HeroFocusPlayerView | null {
  if (!selected.id) return null;
  const display = resolvePlayerDisplay(selected.id) ?? {};
  const name = publicText(display.name) ?? selected.name;
  return {
    id: selected.id,
    name,
    known: Boolean(publicText(display.name)) || selected.known,
    heroId: publicText(display.heroId),
    heroName: publicText(display.heroName),
    hp: publicNumber(display.hp),
    maxHp: publicNumber(display.maxHp),
  };
}

/**
 * Select the primary Hero Focus from accepted semantic IDs before resolving
 * any public player or hero decoration. This helper never consumes legacy
 * room fields, decision ownership, or private controls.
 */
export function buildHeroFocusView(
  stage: InteractionStageView,
  resolvePlayerDisplay: HeroFocusPlayerDisplayResolver = () => null,
): HeroFocusView {
  if (!stage.visible) return HIDDEN_FOCUS;

  const currentParticipant = stage.currentParticipant.id ? stage.currentParticipant : null;
  const soleActiveTarget = stage.stage !== "DYING"
    && !currentParticipant && stage.activeTargets.length === 1 && stage.activeTargets[0]?.id
    ? stage.activeTargets[0]
    : null;
  const selected = currentParticipant ?? soleActiveTarget;
  if (!selected?.id) {
    return {
      visible: true,
      primary: null,
      roleLabel: null,
      source: stage.source,
      nestedContext: stage.continuity.relation === "CHILD_FRAME"
        ? `Nested effect${stage.parentFrameId ? ` · parent frame ${stage.parentFrameId}` : ""}`
        : null,
    };
  }

  return {
    visible: true,
    primary: decoratePlayer(selected, resolvePlayerDisplay),
    roleLabel: stage.stage === "DYING" ? "DYING PLAYER" : currentParticipant ? "CURRENT PARTICIPANT" : "CURRENT TARGET",
    source: stage.source,
    nestedContext: stage.continuity.relation === "CHILD_FRAME"
      ? `Nested effect${stage.parentFrameId ? ` · parent frame ${stage.parentFrameId}` : ""}`
      : null,
  };
}

/**
 * Apply viewer-specific spatial presentation without changing the public,
 * viewer-equal Hero Focus selection above. Only proven source/active-target
 * identities can replace a local primary, and ambiguity fails closed.
 */
export function projectHeroFocusForViewer(
  stage: InteractionStageView,
  publicFocus: HeroFocusView,
  viewerId: string | null,
  resolvePlayerDisplay: HeroFocusPlayerDisplayResolver = () => null,
): HeroFocusView {
  if (!publicFocus.primary || publicFocus.primary.id !== viewerId) return publicFocus;

  const candidates = new Map<string, PresentationDisplayIdentity>();
  if (stage.source.id && stage.source.id !== viewerId) candidates.set(stage.source.id, stage.source);
  for (const target of stage.activeTargets) {
    if (target.id && target.id !== viewerId && !candidates.has(target.id)) candidates.set(target.id, target);
  }
  if (candidates.size !== 1) return { ...publicFocus, primary: null, roleLabel: null };

  const candidate = candidates.values().next().value;
  if (!candidate) return { ...publicFocus, primary: null, roleLabel: null };
  const isActiveTarget = stage.activeTargets.some((target) => target.id === candidate.id);
  return {
    ...publicFocus,
    primary: decoratePlayer(candidate, resolvePlayerDisplay),
    roleLabel: isActiveTarget ? "CURRENT TARGET" : "SOURCE",
  };
}

/**
 * Project one read-only Medium Source beside a viewer's active-target focus.
 * The source and active target must come from the proven public Interaction
 * Stage; viewer-owned sources and self-effects never render a central copy.
 */
export function projectMediumSourceForViewer(
  stage: InteractionStageView,
  projectedFocus: HeroFocusView,
  viewerId: string | null,
  resolvePlayerDisplay: HeroFocusPlayerDisplayResolver = () => null,
): MediumParticipantView | null {
  const primary = projectedFocus.primary;
  const source = stage.source;
  if (!stage.visible
    || !primary
    || !stage.activeTargets.some((target) => target.id === primary.id)
    || !source.id
    || source.id === primary.id
    || source.id === viewerId) return null;

  const player = decoratePlayer(source, resolvePlayerDisplay);
  return player ? { player, roleLabel: "SOURCE" } : null;
}
