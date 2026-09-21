import type { Card } from "./model";
import type { JudgementResolution } from "./decisions/judgement";
import { physicalAttackProvider, physicalDodgeProvider, physicalNegationProvider } from "./capabilities/cards";
import { eightTrigramsDodgeProvider } from "./capabilities/equipment/eight-trigrams";
import { serpentSpearAttackProvider } from "./capabilities/equipment/serpent-spear";
import { zhenJiBlackCardDodgeProvider } from "./capabilities/heroes/zhen-ji";
import { guanYuRedCardAttackProvider } from "./capabilities/heroes/guan-yu";
import { zhaoYunAttackAsDodgeProvider, zhaoYunDodgeAsAttackProvider } from "./capabilities/heroes/zhao-yun";
import { caoCaoHujiaProvider, liuBeiJijiangProvider } from "./capabilities/heroes/lord-skills";

export type ResponseDelegate = { id: string; hero?: string | null; hand: Card[]; equipment: Card[] };
export type ResponseContext = { hand: Card[]; equipment: Card[]; hero?: string | null; role?: string | null; playerId?: string; delegates?: ResponseDelegate[] };
export type SemanticAction = "attack" | "dodge" | "damage" | "recover" | "draw" | "discard" | "negate" | "judgement" | "gain_card" | "lose_card";
export type ActionRequirement =
  | { kind: "dodge"; sourceId?: string; targetId?: string; count?: number; attack?: { cardId?: string; suit?: string; ignoresArmor?: boolean } }
  | { kind: "attack"; sourceId?: string; actorId?: string; count?: number; context?: "duel" | "barbarian_invasion" | "green_dragon" }
  | { kind: "negate"; sourceId?: string; targetId?: string };
export type ResponseSelection = { type: "cards"; min: number; max: number; eligibleCardIds: string[] } | null;
export type CapabilityContext = ResponseContext & { requirement: ActionRequirement };
export type ResponseActivation = "implicit" | "explicit";
export type ResponseOption = { provider: string; providerId: string; satisfies: "attack" | "dodge" | "negate"; activation: ResponseActivation; label: string; cards: Card[]; selection: ResponseSelection; playedAs?: "attack" | "dodge" };
export type ResponseProviderOption = Omit<ResponseOption, "activation">;
export type PlayPhaseAction = { cardId: string; canPlayAs: "attack" };
export type ResponseSelectionInput = { cardId?: unknown; cardIds?: unknown };
export type { JudgementResolution } from "./decisions/judgement";
export type ResolutionEffect = JudgementResolution;
/** A provider reports the semantic result and costs, never an HTTP action. */
export type ResponseExecution =
  | { status: "satisfied"; providerId: string; satisfies: "attack" | "dodge" | "negate"; consumeCardIds?: string[]; resolution?: "cards"; playedAs?: "attack" | "dodge" }
  | { status: "delegated"; providerId: string; satisfies: "attack" | "dodge"; delegateIds: string[] }
  | { status: "requires_resolution"; providerId: string; satisfies: "attack" | "dodge" | "negate"; resolution: ResolutionEffect; playedAs?: "attack" | "dodge" };
export type ResponseExecutionContext = CapabilityContext & { pendingKind: "attack" | "group" | "duel" | "negation"; selection: { cardId?: string; cardIds?: string[] } };
export type ResponseProvider = { id: string; satisfies: "attack" | "dodge" | "negate"; activation: ResponseActivation; playPhaseUse?: "attack"; getOption: (context: CapabilityContext) => ResponseProviderOption | null; resolve: (context: ResponseExecutionContext) => ResponseExecution | null };

// Providers own their availability and resolver choice. The engine only asks
// the currently valid provider to satisfy an abstract requirement.
const providers: ResponseProvider[] = [
  physicalAttackProvider, physicalDodgeProvider, physicalNegationProvider,
  eightTrigramsDodgeProvider, serpentSpearAttackProvider, zhenJiBlackCardDodgeProvider, guanYuRedCardAttackProvider,
  zhaoYunDodgeAsAttackProvider, zhaoYunAttackAsDodgeProvider, caoCaoHujiaProvider, liuBeiJijiangProvider,
];

export function registerResponseProvider(provider: ResponseProvider) {
  providers.push(provider);
  return () => {
    const index = providers.indexOf(provider);
    if (index >= 0) providers.splice(index, 1);
  };
}

export function getResponseOptions(context: CapabilityContext, requirement: ActionRequirement) {
  const satisfies = requirement.kind;
  const options = providers.filter((provider) => provider.satisfies === satisfies).flatMap((provider) => {
    const option = provider.getOption({ ...context, requirement });
    const requiredCount = requirement.kind === "attack" || requirement.kind === "dodge" ? requirement.count ?? 1 : 1;
    if (option && requiredCount > 1 && option.selection && (option.selection.min !== requiredCount || option.selection.max !== requiredCount)) return [];
    return option ? [{ ...option, activation: provider.activation }] : [];
  });
  // The ordinary physical-card route is the sole immediate/default route.
  // Every alternative capability must ask the player to choose it explicitly.
  if (options.filter((option) => option.activation === "implicit").length > 1) {
    throw new Error(`Response requirement ${satisfies} has more than one implicit provider.`);
  }
  return options;
}

/** Finds a one-card provider explicitly allowed to initiate a Play Phase Attack. */
export function getAttackCardProvider(context: ResponseContext, cardId: string) {
  return providers.filter((provider) => provider.satisfies === "attack" && provider.playPhaseUse === "attack").flatMap((provider) => {
    const option = provider.getOption({ ...context, requirement: { kind: "attack" } });
    return option ? [{ ...option, activation: provider.activation }] : [];
  }).find((option) => option.activation === "explicit" && option.selection?.type === "cards" && option.selection.min === 1 && option.selection.max === 1 && option.selection.eligibleCardIds.includes(cardId));
}

/** Projects provider-owned Play Phase virtual actions without exposing cards from another view. */
export function getPlayPhaseActions(context: ResponseContext): PlayPhaseAction[] {
  const safeContext = { ...context, hand: context.hand ?? [], equipment: context.equipment ?? [] };
  const actions = providers.filter((provider) => provider.satisfies === "attack" && provider.playPhaseUse === "attack").flatMap((provider) => {
    const option = provider.getOption({ ...safeContext, requirement: { kind: "attack" } });
    return option?.selection?.type === "cards" ? option.selection.eligibleCardIds.map((cardId) => ({ cardId, canPlayAs: "attack" as const })) : [];
  });
  return actions.filter((action, index) => actions.findIndex((candidate) => candidate.cardId === action.cardId) === index);
}

export function resolveResponseProvider(providerId: unknown, context: ResponseExecutionContext) {
  if (typeof providerId !== "string") return null;
  const provider = providers.find((candidate) => candidate.id === providerId && candidate.satisfies === context.requirement.kind);
  if (!provider || !provider.getOption(context)) return null;
  return provider.resolve(context);
}

export function canRespondWithAttack(context: ResponseContext) { return getResponseOptions({ ...context, requirement: { kind: "attack" } }, { kind: "attack" }).length > 0; }
export function canRespondWithDodge(context: ResponseContext, count = 1) { return getResponseOptions({ ...context, requirement: { kind: "dodge", count } }, { kind: "dodge", count }).length > 0; }
/**
 * Negation eligibility is capability-based rather than card-name based. This
 * keeps the reaction scheduler open to hero skills, conversions, and other
 * providers that legally satisfy the same semantic requirement.
 */
export function canRespondWithNegation(context: ResponseContext, requirement: Extract<ActionRequirement, { kind: "negate" }> = { kind: "negate" }) {
  return getResponseOptions({ ...context, requirement }, requirement).length > 0;
}
