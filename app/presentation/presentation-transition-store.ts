import { attackDodgeResponseProofKey } from "../../game/attack-dodge-response-selection";
import { buildPresentationTransition, type PresentationTransition } from "../../game/presentation-transition";
import type { PresentationClientView } from "../../game/presentation-client";
import type {
  PresentationSnapshotAttackDodgeResponse,
  PresentationSnapshotAttackHitSettlement,
  PresentationSnapshotRootAction,
} from "../../game/presentation-snapshot";

export type PresentationTransitionScope = {
  roomCode: string;
  viewerId: string;
};

type AttackCommittedTransition = {
  kind: "ATTACK_COMMITTED";
  eventId: string;
  rootEventId: string;
  fresh: true;
  proof: PresentationSnapshotRootAction;
};

type AttackProofUpdatedTransition = {
  kind: "ATTACK_PROOF_UPDATED";
  eventId: string;
  rootEventId: string;
  fresh: false;
  proof: PresentationSnapshotRootAction;
};

type DodgeCommittedTransition = {
  /** The accepted Dodge proof also proves that the target's Attack was blocked. */
  kind: "DODGE_COMMITTED";
  eventId: string;
  rootEventId: string;
  fresh: true;
  proofKey: string;
  outcome: "ATTACK_BLOCKED_BY_DODGE";
  proof: PresentationSnapshotAttackDodgeResponse;
};

type DodgeProofUpdatedTransition = {
  kind: "DODGE_PROOF_UPDATED";
  eventId: string;
  rootEventId: string;
  fresh: false;
  proofKey: string;
  outcome: "ATTACK_BLOCKED_BY_DODGE";
  proof: PresentationSnapshotAttackDodgeResponse;
};

type AttackHitTransition = {
  kind: "ATTACK_HIT";
  eventId: string;
  rootEventId: string;
  fresh: true;
  outcome: "ATTACK_DAMAGE_APPLIED";
  proof: PresentationSnapshotAttackHitSettlement;
};

type AttackHitProofUpdatedTransition = {
  kind: "ATTACK_HIT_PROOF_UPDATED";
  eventId: string;
  rootEventId: string;
  fresh: false;
  outcome: "ATTACK_DAMAGE_APPLIED";
  proof: PresentationSnapshotAttackHitSettlement;
};

export type AttackDodgeTransition = AttackCommittedTransition | AttackProofUpdatedTransition
  | DodgeCommittedTransition | DodgeProofUpdatedTransition | AttackHitTransition | AttackHitProofUpdatedTransition;

export type PendingAttackDodgeTransition = AttackCommittedTransition | DodgeCommittedTransition;

export type PresentationTransitionStoreSnapshot = {
  presentation: PresentationTransition;
  attackDodgeTransitions: readonly AttackDodgeTransition[];
  pendingAttackDodgeTransitions: readonly PendingAttackDodgeTransition[];
};

const emptySnapshot: PresentationTransitionStoreSnapshot = {
  presentation: buildPresentationTransition(null, null),
  attackDodgeTransitions: [],
  pendingAttackDodgeTransitions: [],
};

function sameScope(left: PresentationTransitionScope, right: PresentationTransitionScope): boolean {
  return left.roomCode === right.roomCode && left.viewerId === right.viewerId;
}

function validScope(scope: PresentationTransitionScope): boolean {
  return typeof scope.roomCode === "string" && scope.roomCode.length > 0
    && typeof scope.viewerId === "string" && scope.viewerId.length > 0;
}

function publicViewIdentity(view: PresentationClientView): string {
  const publicView: Record<string, unknown> = { ...view };
  delete publicView.hasLocalControl;
  delete publicView.isLocalDecisionActor;
  delete publicView.localActionRevision;
  return JSON.stringify(publicView);
}

function rootAttack(view: PresentationClientView): PresentationSnapshotRootAction | null {
  const action = view.rootAction;
  return action?.semantics === "PROVEN" && action.action === "ATTACK" && action.cardKind === "Attack"
    && action.rootEventId && action.interactionId && action.rootFrameId && action.sourceId && action.targetId
    ? action
    : null;
}

function validDodgeProof(value: PresentationSnapshotAttackDodgeResponse): boolean {
  return value.semantics === "PROVEN" && value.counterRelation === "BLOCKS_TARGET_EFFECT"
    && value.rootCardKind === "Attack" && value.responseCardKind === "Dodge"
    && Boolean(value.responseEventId && value.responseResolutionId && value.rootEventId && value.rootResolutionId
      && value.interactionId && value.rootFrameId && value.rootSourceId && value.targetId && value.responseActorId)
    && value.responseResolutionId === value.rootResolutionId;
}

function validHitProof(value: PresentationSnapshotAttackHitSettlement): boolean {
  return value.semantics === "PROVEN" && value.outcome === "ATTACK_DAMAGE_APPLIED"
    && Boolean(value.eventId && value.rootEventId && value.rootResolutionId && value.sourceId && value.targetId)
    && value.eventId !== value.rootEventId && value.sourceId !== value.targetId;
}

/** Classify only committed public Attack, Dodge-block, and applied-hit proofs. */
export function buildAttackDodgePresentationTransitions(
  previous: PresentationClientView,
  next: PresentationClientView,
): AttackDodgeTransition[] {
  const transitions: AttackDodgeTransition[] = [];
  const previousRoot = rootAttack(previous);
  const nextRoot = rootAttack(next);
  if (nextRoot) {
    const sameRoot = previousRoot?.rootEventId === nextRoot.rootEventId;
    if (!sameRoot) {
      transitions.push({ kind: "ATTACK_COMMITTED", eventId: nextRoot.rootEventId, rootEventId: nextRoot.rootEventId, fresh: true, proof: nextRoot });
    } else if (JSON.stringify(previousRoot) !== JSON.stringify(nextRoot)) {
      transitions.push({ kind: "ATTACK_PROOF_UPDATED", eventId: nextRoot.rootEventId, rootEventId: nextRoot.rootEventId, fresh: false, proof: nextRoot });
    }
  }

  const previousResponses = new Map((previous.attackDodgeResponses ?? []).map((proof) => [proof.responseEventId, proof]));
  for (const proof of next.attackDodgeResponses ?? []) {
    if (!validDodgeProof(proof)) continue;
    const prior = previousResponses.get(proof.responseEventId);
    const proofKey = attackDodgeResponseProofKey(proof);
    if (!proofKey) continue;
    if (!prior) {
      transitions.push({ kind: "DODGE_COMMITTED", eventId: proof.responseEventId, rootEventId: proof.rootEventId, fresh: true,
        proofKey, outcome: "ATTACK_BLOCKED_BY_DODGE", proof });
    } else if (JSON.stringify(prior) !== JSON.stringify(proof)) {
      transitions.push({ kind: "DODGE_PROOF_UPDATED", eventId: proof.responseEventId, rootEventId: proof.rootEventId, fresh: false,
        proofKey, outcome: "ATTACK_BLOCKED_BY_DODGE", proof });
    }
  }

  const previousHits = new Map(previous.attackHitSettlements.map((proof) => [proof.eventId, proof]));
  for (const proof of next.attackHitSettlements) {
    if (!validHitProof(proof)) continue;
    const prior = previousHits.get(proof.eventId);
    if (!prior) {
      transitions.push({ kind: "ATTACK_HIT", eventId: proof.eventId, rootEventId: proof.rootEventId, fresh: true,
        outcome: "ATTACK_DAMAGE_APPLIED", proof });
    } else if (JSON.stringify(prior) !== JSON.stringify(proof)) {
      transitions.push({ kind: "ATTACK_HIT_PROOF_UPDATED", eventId: proof.eventId, rootEventId: proof.rootEventId, fresh: false,
        outcome: "ATTACK_DAMAGE_APPLIED", proof });
    }
  }
  return transitions;
}

function eventIdsIn(view: PresentationClientView): string[] {
  return [
    rootAttack(view)?.rootEventId,
    ...(view.attackDodgeResponses ?? []).filter(validDodgeProof).map((proof) => proof.responseEventId),
    ...view.attackHitSettlements.filter(validHitProof).map((proof) => proof.eventId),
  ].filter((eventId): eventId is string => Boolean(eventId));
}

function responseProofsById(view: PresentationClientView): Map<string, PresentationSnapshotAttackDodgeResponse> {
  return new Map((view.attackDodgeResponses ?? []).filter(validDodgeProof).map((proof) => [proof.responseEventId, proof]));
}

/**
 * Owns the single accepted-view cursor and the pending Attack/Dodge transition
 * path for one mounted GameRoom. Hydration and identity changes seed a baseline
 * without replay; local response controls remain outside this public store.
 */
export function createPresentationTransitionStore(initialScope: PresentationTransitionScope, initialView: PresentationClientView) {
  let scope = initialScope;
  let acceptedView = initialView;
  let acceptedIdentity = publicViewIdentity(initialView);
  let observedEventIds = new Set(eventIdsIn(initialView));
  let snapshot: PresentationTransitionStoreSnapshot = {
    presentation: buildPresentationTransition(initialView, initialView),
    attackDodgeTransitions: [],
    pendingAttackDodgeTransitions: [],
  };
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  };
  const notify = () => listeners.forEach((listener) => listener());

  return {
    subscribe,
    getSnapshotFor(requestedScope: PresentationTransitionScope) {
      return sameScope(scope, requestedScope) ? snapshot : emptySnapshot;
    },
    getServerSnapshotFor(requestedScope: PresentationTransitionScope) {
      return sameScope(scope, requestedScope) ? snapshot : emptySnapshot;
    },
    accept(nextScope: PresentationTransitionScope, nextView: PresentationClientView) {
      if (!validScope(nextScope)) return false;
      if (!sameScope(scope, nextScope)) {
        scope = nextScope;
        acceptedView = nextView;
        acceptedIdentity = publicViewIdentity(nextView);
        observedEventIds = new Set(eventIdsIn(nextView));
        snapshot = {
          presentation: buildPresentationTransition(nextView, nextView),
          attackDodgeTransitions: [],
          pendingAttackDodgeTransitions: [],
        };
        notify();
        return true;
      }

      const nextIdentity = publicViewIdentity(nextView);
      if (nextIdentity === acceptedIdentity) {
        const presentation = buildPresentationTransition(acceptedView, nextView);
        acceptedView = nextView;
        if (snapshot.presentation.kind !== "NONE" && presentation.kind === "NONE") {
          snapshot = { ...snapshot, presentation };
          notify();
        }
        return false;
      }
      const presentation = buildPresentationTransition(acceptedView, nextView);
      const transitions = buildAttackDodgePresentationTransitions(acceptedView, nextView);
      const unseenTransitions = transitions.filter((transition) => !transition.fresh || !observedEventIds.has(transition.eventId));
      for (const transition of unseenTransitions) {
        if (transition.fresh) observedEventIds.add(transition.eventId);
      }
      const currentProofs = responseProofsById(nextView);
      const pendingByEventId = new Map<string, PendingAttackDodgeTransition>();
      for (const pending of snapshot.pendingAttackDodgeTransitions) {
        if (pending.kind === "DODGE_COMMITTED") {
          const latestProof = currentProofs.get(pending.eventId);
          if (latestProof) {
            const proofKey = attackDodgeResponseProofKey(latestProof);
            if (proofKey) pendingByEventId.set(pending.eventId, { ...pending, proof: latestProof, proofKey });
          } else {
            pendingByEventId.set(pending.eventId, pending);
          }
        } else if (rootAttack(nextView)?.rootEventId === pending.eventId) {
          const latestRoot = rootAttack(nextView);
          if (latestRoot) pendingByEventId.set(pending.eventId, { ...pending, proof: latestRoot });
        } else {
          pendingByEventId.set(pending.eventId, pending);
        }
      }
      for (const transition of unseenTransitions) {
        if (transition.kind === "ATTACK_COMMITTED" || transition.kind === "DODGE_COMMITTED") {
          pendingByEventId.set(transition.eventId, transition);
        }
      }

      acceptedView = nextView;
      acceptedIdentity = nextIdentity;
      snapshot = {
        presentation,
        attackDodgeTransitions: unseenTransitions,
        pendingAttackDodgeTransitions: [...pendingByEventId.values()],
      };
      notify();
      return true;
    },
    acknowledgeAttackDodgeEvent(requestedScope: PresentationTransitionScope, eventId: string) {
      if (!sameScope(scope, requestedScope)) return false;
      if (!snapshot.pendingAttackDodgeTransitions.some((transition) => transition.eventId === eventId)) return false;
      snapshot = {
        ...snapshot,
        pendingAttackDodgeTransitions: snapshot.pendingAttackDodgeTransitions.filter((transition) => transition.eventId !== eventId),
      };
      notify();
      return true;
    },
  };
}
