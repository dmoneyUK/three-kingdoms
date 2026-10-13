"use client";

import type { Card, CardKind } from "../game/model";
import type { PresentationSnapshotRootAction } from "../game/presentation-snapshot";
import { cardDefinition } from "../game/cards";
import { CardFace } from "./card-face";

type PublicCardDisplayResponseNode = {
  eventId: string;
  actorId: string;
  actorName: string;
  cardFace?: Card;
  ariaLabel: string;
};

/**
 * Read-only, proof-backed public action facts used by the temporary static
 * card presenter. Legal actions remain owned by CurrentAction.
 */
export type PublicCardDisplayAction = {
  key: string;
  rootEventId: string;
  cardFace?: Card;
  interactionId?: string;
  rootFrameId?: string;
  sourceId: string;
  targetId: string | null;
  cardKind?: CardKind;
  cardLabel: string;
  ariaLabel: string;
  settlement?: {
    eventId: string;
    outcome: "SUITS_MATCHED" | "SUITS_DIFFERED" | "ATTACK_BLOCKED_BY_DODGE" | "ATTACK_DAMAGE_APPLIED" | "DISMANTLE_RESOLVED" | "STEAL_RESOLVED" | "GROUP_RESOLVED" | "BUMPER_HARVEST_RESOLVED";
    exiting: boolean;
  };
  publicCounterRead?: { eventId: string; exiting: boolean };
  phaseNotice?: string;
  response?: {
    eventId: string;
    actorId: string;
    actorName: string;
    cardFace?: Card;
    ariaLabel: string;
    semanticAction?: "DODGE";
    semanticLabel?: string;
  };
  responses?: readonly PublicCardDisplayResponseNode[];
};

export function publicCardActionKey(action: PresentationSnapshotRootAction): string {
  return [action.interactionId, action.rootFrameId, action.checkpointId, action.presentationRevision, action.rootEventId, action.sourceId, action.targetId].join(":");
}

function settlementLabel(action: PublicCardDisplayAction, targetName: string | null) {
  switch (action.settlement?.outcome) {
    case "ATTACK_DAMAGE_APPLIED": return `TAKE DAMAGE · ${targetName ?? "target"}`;
    case "ATTACK_BLOCKED_BY_DODGE": return "ATTACK BLOCKED BY DODGE";
    case "SUITS_MATCHED": return "SUITS MATCHED";
    case "SUITS_DIFFERED": return "SUITS DIFFERED";
    case "DISMANTLE_RESOLVED": return "BURNING BRIDGE RESOLVED";
    case "STEAL_RESOLVED": return "STEAL RESOLVED";
    case "GROUP_RESOLVED": return "GROUP EFFECT RESOLVED";
    case "BUMPER_HARVEST_RESOLVED": return "BUMPER HARVEST RESOLVED";
    default: return null;
  }
}

export function PublicCardDisplay({
  action,
  enabled,
  sourceName,
  targetName,
  resultReadRemainingMs = null,
}: {
  action: PublicCardDisplayAction | null;
  enabled: boolean;
  sourceName: string | null;
  targetName: string | null;
  resultReadRemainingMs?: number | null;
}) {
  if (!enabled || !action || !sourceName) return null;
  const latestResponse = action.response ?? action.responses?.at(-1) ?? null;
  const card = latestResponse?.cardFace ?? action.cardFace ?? null;
  const eventId = latestResponse?.eventId ?? action.rootEventId;
  const actorId = latestResponse?.actorId ?? action.sourceId;
  const label = latestResponse?.semanticAction === "DODGE"
    ? latestResponse.semanticLabel ?? "DODGE"
    : card ? cardDefinition(card.kind).name.toUpperCase() : action.cardLabel;
  const result = settlementLabel(action, targetName);
  return <section
    className={`public-card-display${action.settlement?.exiting || action.publicCounterRead?.exiting ? " is-exiting" : ""}`}
    role="status"
    aria-live="polite"
    aria-atomic="true"
    aria-label={latestResponse?.ariaLabel ?? action.ariaLabel}
    data-public-card-display="true"
    data-public-card-ready="true"
    data-public-card-event-id={eventId}
    data-public-card-root-event-id={action.rootEventId}
    data-public-card-id={card?.id}
    data-public-card-actor-id={actorId}
    data-public-card-source-id={action.sourceId}
    data-public-card-target-id={action.targetId ?? undefined}
    data-public-card-settlement-event-id={action.settlement?.eventId}
    data-public-card-settlement-outcome={action.settlement?.outcome}
    data-public-card-result-remaining-ms={resultReadRemainingMs ?? undefined}
  >
    {card && <CardFace card={card} />}
    <div className="public-card-display-copy">
      <small>{label}</small>
      <b>{latestResponse ? latestResponse.ariaLabel : action.ariaLabel}</b>
      {action.phaseNotice && <span>{action.phaseNotice}</span>}
      {result && <strong data-public-card-result={action.settlement?.outcome}>{result}</strong>}
    </div>
  </section>;
}
