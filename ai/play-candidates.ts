import { isAttackCard } from "../game/cards";
import type { Card } from "../game/model";
import type { CurrentAction } from "../game/protocol";

export type PlayCandidateAuthority = Readonly<{
  decisionId: string;
  actorId: string;
  actionRevision: string;
  decisionConsumed: boolean;
}>;

type PlayCandidateInput = PlayCandidateAuthority & {
  phase: string | null;
  currentAction: CurrentAction;
  selfHand: readonly Pick<Card, "id" | "kind">[];
  publicSeatContext: readonly { id: string; seat: number }[];
  basicPlays?: readonly { cardId: string; kind: "heal" | "draw" | "equip" | "stratagem" }[];
  attackTargetLimit?: 1 | 3;
};

type Action = { action: "play_card"; cardId: string; targetId?: string; targetIds?: readonly string[]; playAs?: "attack" }
  | { action: "serpent_spear_attack"; cardIds: readonly string[]; targetId: string }
  | { action: "end_turn" };
type Payload = Readonly<Action & { actionRevision: string }>;
const labels = { heal: "Play Peach", draw: "Draw cards", equip: "Equip card", stratagem: "Play stratagem", attack: "Play Attack", end_turn: "End Turn" } as const;
type Kind = keyof typeof labels;
type Choice = Readonly<{ id: string; kind: Kind; label: string }>;

export const MAX_PLAY_CANDIDATES = 256;

export function buildPlayCandidates(input: PlayCandidateInput) {
  const { decisionId, actorId, actionRevision, currentAction } = input;
  if (!decisionId || !actorId || !actionRevision || input.decisionConsumed !== false
    || currentAction.version !== 3 || currentAction.kind !== "turn" || currentAction.actorId !== actorId
    || !input.phase?.startsWith("play")) return { status: "unsupported", reason: "invalid_authority" } as const;

  const actions: { kind: Kind; action: Action }[] = [];
  const canPlay = currentAction.legalActions.includes("play_card");
  const canPlayAttack = canPlay && currentAction.canDeclareAttack === true;
  if (canPlayAttack && !currentAction.playTargetEligibility) {
    return { status: "unsupported", reason: "missing_target_eligibility" } as const;
  }

  if (canPlay) {
    const ownCardIds = new Set(input.selfHand.map(({ id }) => id));
    const seen = new Set<string>();
    const priority = { heal: 0, draw: 1, equip: 2, stratagem: 3 };
    const basics = [...(input.basicPlays ?? [])].sort((left, right) =>
      priority[left.kind] - priority[right.kind] || (left.cardId < right.cardId ? -1 : left.cardId > right.cardId ? 1 : 0));
    for (const { cardId, kind } of basics) {
      if (!ownCardIds.has(cardId) || seen.has(cardId)) return { status: "unsupported", reason: "invalid_authority" } as const;
      if (actions.length === MAX_PLAY_CANDIDATES) return { status: "unsupported", reason: "candidate_overflow" } as const;
      seen.add(cardId);
      actions.push({ kind, action: { action: "play_card", cardId } });
    }
  }

  if (canPlay) {
    const convertedCards = new Set(currentAction.playPhaseActions?.filter((action) => action.canPlayAs === "attack").map((action) => action.cardId));
    const targets = [...input.publicSeatContext].sort((left, right) => left.seat - right.seat);
    const hand = [...input.selfHand].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    const seenCards = new Set<string>();
    for (const card of hand) {
      if (!card.id || seenCards.has(card.id)) return { status: "unsupported", reason: "invalid_authority" } as const;
      seenCards.add(card.id);
      const physicalAttack = isAttackCard(card);
      const attack = canPlayAttack && (physicalAttack || convertedCards.has(card.id));
      const modes = (currentAction.playTargetEligibility ?? []).filter((entry) => entry.mode === "card" && entry.cardId === card.id);
      if (attack && modes.filter((entry) => entry.effectiveKind === "Attack").length !== 1) {
        return { status: "unsupported", reason: "missing_target_eligibility" } as const;
      }
      for (const mode of modes) {
        const attackMode = mode.effectiveKind === "Attack";
        if (attackMode ? !attack : mode.effectiveKind !== card.kind || mode.effectiveKind === "RationsDepleted") continue;
        const eligibleIds = new Set(mode.eligibleTargetIds);
        const eligible = [...new Set(targets.filter(({ id }) => id !== actorId && eligibleIds.has(id)).map(({ id }) => id))];
        const targetLimit = attackMode ? input.attackTargetLimit ?? 1 : 1;
        const base = { action: "play_card" as const, cardId: card.id,
          ...(attackMode && !physicalAttack ? { playAs: "attack" as const } : {}) };
        const kind = attackMode ? "attack" : "stratagem";
        // Prefer larger legal target sets, then seat order. Every combination
        // contains only eligible targets from this exact card mode.
        function addTargets(start: number, count: number, selected: string[]): boolean {
          if (count === 0) {
            if (actions.length === MAX_PLAY_CANDIDATES) return false;
            const targetFields = selected.length === 1 ? { targetId: selected[0] } : { targetIds: Object.freeze(selected) };
            actions.push({ kind, action: { ...base, ...targetFields } });
            return true;
          }
          for (let index = start; index <= eligible.length - count; index++) {
            if (!addTargets(index + 1, count - 1, [...selected, eligible[index]])) return false;
          }
          return true;
        }
        for (let count = Math.min(targetLimit, eligible.length); count >= 1; count--) {
          if (!addTargets(0, count, [])) return { status: "unsupported", reason: "candidate_overflow" } as const;
        }
      }
    }
  }

  if (currentAction.canDeclareAttack === true && currentAction.legalActions.includes("serpent_spear_attack")) {
    const mode = currentAction.playTargetEligibility?.find((entry) => entry.mode === "serpent_spear_attack");
    const ids = [...new Set(input.selfHand.map(({ id }) => id))].sort();
    const targets = input.publicSeatContext.filter(({ id }) => id !== actorId && mode?.eligibleTargetIds.includes(id))
      .sort((left, right) => left.seat - right.seat);
    for (let a = 0; a < ids.length - 1; a++) {
      for (let b = a + 1; b < ids.length; b++) {
        const cardIds = Object.freeze([ids[a], ids[b]]);
        for (const { id: targetId } of targets) {
          if (actions.length === MAX_PLAY_CANDIDATES) return { status: "unsupported", reason: "candidate_overflow" } as const;
          actions.push({ kind: "attack", action: { action: "serpent_spear_attack", cardIds, targetId } });
        }
      }
    }
  }

  if (currentAction.legalActions.includes("end_turn")) {
    if (actions.length === MAX_PLAY_CANDIDATES) return { status: "unsupported", reason: "candidate_overflow" } as const;
    actions.push({ kind: "end_turn", action: { action: "end_turn" } });
  }
  if (!actions.length) return { status: "unsupported", reason: "no_supported_play" } as const;

  const payloads = new Map<string, Payload>();
  const publicChoices = Object.freeze(actions.map(({ kind, action }): Choice => {
    const id = crypto.randomUUID();
    payloads.set(id, Object.freeze({ ...action, actionRevision }));
    return Object.freeze({ id, kind, label: labels[kind] });
  }));
  let resolved = false;
  return Object.freeze({
    status: "ready" as const,
    publicChoices,
    serverPlans() {
      return publicChoices.flatMap(({ id, kind }) => {
        const payload = payloads.get(id);
        return payload ? [{ kind, payload }] : [];
      });
    },
    resolve(choiceId: string, latest: PlayCandidateAuthority): Payload | null {
      if (resolved || latest.decisionConsumed !== false || latest.decisionId !== decisionId
        || latest.actorId !== actorId || latest.actionRevision !== actionRevision) return null;
      const payload = payloads.get(choiceId);
      if (!payload) return null;
      resolved = true;
      return payload;
    },
  });
}
