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
  basicPlays?: readonly { cardId: string; kind: "heal" | "draw" | "equip" }[];
};

type Action = { action: "play_card"; cardId: string; targetId?: string; playAs?: "attack" } | { action: "end_turn" };
type Payload = Readonly<Action & { actionRevision: string }>;
const labels = { heal: "Play Peach", draw: "Draw cards", equip: "Equip card", attack: "Play Attack", end_turn: "End Turn" } as const;
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
    const priority = { heal: 0, draw: 1, equip: 2 };
    const basics = [...(input.basicPlays ?? [])].sort((left, right) =>
      priority[left.kind] - priority[right.kind] || (left.cardId < right.cardId ? -1 : left.cardId > right.cardId ? 1 : 0));
    for (const { cardId, kind } of basics) {
      if (!ownCardIds.has(cardId) || seen.has(cardId)) return { status: "unsupported", reason: "invalid_authority" } as const;
      if (actions.length === MAX_PLAY_CANDIDATES) return { status: "unsupported", reason: "candidate_overflow" } as const;
      seen.add(cardId);
      actions.push({ kind, action: { action: "play_card", cardId } });
    }
  }

  if (canPlayAttack) {
    const convertedCards = new Set(currentAction.playPhaseActions?.filter((action) => action.canPlayAs === "attack").map((action) => action.cardId));
    const targets = [...input.publicSeatContext].sort((left, right) => left.seat - right.seat);
    const hand = [...input.selfHand].sort((left, right) => left.id < right.id ? -1 : left.id > right.id ? 1 : 0);
    const seenCards = new Set<string>();
    for (const card of hand) {
      if (!card.id || seenCards.has(card.id)) return { status: "unsupported", reason: "invalid_authority" } as const;
      seenCards.add(card.id);
      const physicalAttack = isAttackCard(card);
      if (!physicalAttack && !convertedCards.has(card.id)) continue;
      const eligibility = currentAction.playTargetEligibility?.filter((entry) =>
        entry.mode === "card" && entry.cardId === card.id && entry.effectiveKind === "Attack");
      if (eligibility?.length !== 1) return { status: "unsupported", reason: "missing_target_eligibility" } as const;
      const eligibleIds = new Set(eligibility[0].eligibleTargetIds);
      const seenTargets = new Set<string>();
      for (const target of targets) {
        if (target.id === actorId || !eligibleIds.has(target.id) || seenTargets.has(target.id)) continue;
        if (actions.length === MAX_PLAY_CANDIDATES) return { status: "unsupported", reason: "candidate_overflow" } as const;
        seenTargets.add(target.id);
        actions.push({ kind: "attack", action: { action: "play_card", cardId: card.id, targetId: target.id,
          ...(physicalAttack ? {} : { playAs: "attack" as const }) } });
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
