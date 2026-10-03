import type { InteractionStageView, PresentationDisplayIdentity } from "./presentation-client";

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

export type HeroFocusView = {
  visible: boolean;
  primary: HeroFocusPlayerView | null;
  roleLabel: "CURRENT PARTICIPANT" | "CURRENT TARGET" | null;
  source: PresentationDisplayIdentity;
  nestedContext: string | null;
};

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
  const soleActiveTarget = !currentParticipant && stage.activeTargets.length === 1 && stage.activeTargets[0]?.id
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

  const display = resolvePlayerDisplay(selected.id) ?? {};
  const name = publicText(display.name) ?? selected.name;
  return {
    visible: true,
    primary: {
      id: selected.id,
      name,
      known: Boolean(publicText(display.name)) || selected.known,
      heroId: publicText(display.heroId),
      heroName: publicText(display.heroName),
      hp: publicNumber(display.hp),
      maxHp: publicNumber(display.maxHp),
    },
    roleLabel: currentParticipant ? "CURRENT PARTICIPANT" : "CURRENT TARGET",
    source: stage.source,
    nestedContext: stage.continuity.relation === "CHILD_FRAME"
      ? `Nested effect${stage.parentFrameId ? ` · parent frame ${stage.parentFrameId}` : ""}`
      : null,
  };
}
