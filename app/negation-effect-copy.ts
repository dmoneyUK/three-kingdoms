/** Formats only already-validated public reaction facts; it does not infer legality. */
export function negationEffectCopy(input: {
  kind: "Duel" | "BumperHarvest";
  sourceName: string;
  targetName: string;
  effectState: "ACTIVE" | "BLOCKED";
  responseCount: number;
  actorName?: string;
  counteredActorName?: string;
}): { headline: string; supporting: string } | null {
  const source = input.sourceName.trim();
  const target = input.targetName.trim();
  const actor = input.actorName?.trim();
  const countered = input.counteredActorName?.trim();
  if (!source || !target || !Number.isInteger(input.responseCount) || input.responseCount < 0) return null;
  if (input.responseCount === 0) {
    if (input.effectState !== "ACTIVE") return null;
    return input.kind === "Duel"
      ? { headline: `${source} played Duel against ${target}.`, supporting: "Negation can cancel the Duel." }
      : { headline: `${target}'s turn to pick a card.`, supporting: `Negation can prevent ${target} from picking.` };
  }
  if (!actor || (input.responseCount === 1 && input.effectState !== "BLOCKED") || (input.responseCount > 1 && !countered)) return null;
  const blocked = input.effectState === "BLOCKED";
  if (input.kind === "Duel") {
    return {
      headline: input.responseCount === 1
        ? `${actor}'s Negation cancels ${source}'s Duel.`
        : `${actor} counters ${countered}'s Negation. The Duel is ${blocked ? "cancelled" : "restored"}.`,
      supporting: `Another Negation can ${blocked ? "restore" : "cancel"} the Duel.`,
    };
  }
  return {
    headline: input.responseCount === 1
      ? `${actor}'s Negation blocks ${target}'s pick.`
      : `${actor} counters ${countered}'s Negation. ${target}'s pick is ${blocked ? "blocked" : "restored"}.`,
    supporting: `Another Negation can ${blocked ? "restore" : "block"} ${target}'s pick.`,
  };
}

/** Call only after a server-proven final Negation settlement. */
export function duelNegationFinalCopy(outcome: "ROOT_CANCELLED" | "ROOT_RESTORED") {
  return outcome === "ROOT_CANCELLED" ? "The Duel is cancelled." : "The Duel takes effect.";
}
