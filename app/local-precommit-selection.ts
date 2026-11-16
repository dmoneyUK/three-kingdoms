/**
 * Pure local-draft policy. Availability and selection limits must be supplied
 * from the current server-projected action; this module never grants actions.
 */

export type PrecommitSurface = "turn" | "response" | "trigger";
export type PrecommitOwnerKind = "skill" | "weapon" | "provider";
export type PrecommitSelectionType = "cards" | "target" | "target_cards" | "choice" | "choice_and_target_cards";

export type PrecommitScopeIdentity = Readonly<{
  roomCode: string;
  viewerId: string;
  actionRevision: string;
  surface: PrecommitSurface;
  kind: PrecommitOwnerKind;
  ownerId: string;
}>;

export type PrecommitSelectionDraft = {
  scope: PrecommitScopeIdentity;
  cardIds: string[];
  targetIds: string[];
};

export type PrecommitOwnerClassification =
  | { kind: "NONE" }
  | { kind: "REVERSIBLE_DRAFT"; scope: PrecommitScopeIdentity }
  | { kind: "STANDALONE_PICKER"; scope?: PrecommitScopeIdentity }
  | { kind: "IMMEDIATE_ACTION"; scope?: PrecommitScopeIdentity }
  | { kind: "LOCKED" };

export type PrecommitOwnerCandidate = {
  scope: PrecommitScopeIdentity | null;
  available: boolean;
  selected: boolean;
  selectionType: PrecommitSelectionType | null;
  retapSupported: boolean;
};

export function createPrecommitScopeIdentity(input: {
  roomCode: string;
  viewerId: string;
  actionRevision: string;
  surface: PrecommitSurface;
  kind: PrecommitOwnerKind;
  ownerId: string;
}): PrecommitScopeIdentity | null {
  const roomCode = input.roomCode.trim();
  const viewerId = input.viewerId.trim();
  const actionRevision = input.actionRevision.trim();
  const ownerId = input.ownerId.trim();
  if (!roomCode || !viewerId || !actionRevision || !ownerId) return null;
  return { roomCode, viewerId, actionRevision, surface: input.surface, kind: input.kind, ownerId };
}

export function createPrecommitScopeForAction(input: {
  roomCode: string;
  viewerId: string;
  actionRevision: string;
  actionKind: string | null | undefined;
  kind: PrecommitOwnerKind;
  ownerId: string;
}): PrecommitScopeIdentity | null {
  const surface = input.actionKind === "turn" || input.actionKind === "response" || input.actionKind === "trigger"
    ? input.actionKind
    : null;
  return surface ? createPrecommitScopeIdentity({ ...input, surface }) : null;
}

export function samePrecommitScopeIdentity(left: PrecommitScopeIdentity | null | undefined, right: PrecommitScopeIdentity | null | undefined): boolean {
  return Boolean(left && right
    && left.roomCode === right.roomCode
    && left.viewerId === right.viewerId
    && left.actionRevision === right.actionRevision
    && left.surface === right.surface
    && left.kind === right.kind
    && left.ownerId === right.ownerId);
}

export function classifyPrecommitOwner(input: {
  owner: PrecommitOwnerCandidate | null;
  standalonePickerActive?: boolean;
  busy?: boolean;
  submitted?: boolean;
  committed?: boolean;
}): PrecommitOwnerClassification {
  const owner = input.owner;
  if (owner?.selected && (input.busy || input.submitted || input.committed || !owner.available || !owner.scope)) return { kind: "LOCKED" };
  if (owner?.selected && owner.selectionType === null) return { kind: "IMMEDIATE_ACTION", scope: owner.scope ?? undefined };
  if (owner?.selected && owner.selectionType && owner.retapSupported) {
    return { kind: "REVERSIBLE_DRAFT", scope: owner.scope! };
  }
  if (input.standalonePickerActive || owner?.selected && owner.selectionType) {
    return { kind: "STANDALONE_PICKER", ...(owner?.scope ? { scope: owner.scope } : {}) };
  }
  if (owner?.available && owner.selectionType === null) return { kind: "IMMEDIATE_ACTION", scope: owner.scope ?? undefined };
  return { kind: "NONE" };
}

function matchingDraft(draft: PrecommitSelectionDraft, expectedScope: PrecommitScopeIdentity | null): boolean {
  return samePrecommitScopeIdentity(draft.scope, expectedScope);
}

/** Return a draft only when every room/viewer/action/owner scope still matches. */
export function precommitDraftForScope(current: PrecommitSelectionDraft | null, expectedScope: PrecommitScopeIdentity | null): PrecommitSelectionDraft | null {
  return current && matchingDraft(current, expectedScope) ? current : null;
}

export function togglePrecommitOwnerDraft(current: PrecommitSelectionDraft | null, nextScope: PrecommitScopeIdentity | null): PrecommitSelectionDraft | null {
  if (!nextScope) return null;
  if (current && samePrecommitScopeIdentity(current.scope, nextScope)) return null;
  return { scope: nextScope, cardIds: [], targetIds: [] };
}

export function resetPrecommitOwnerDraft(current: PrecommitSelectionDraft | null, expectedScope: PrecommitScopeIdentity | null): PrecommitSelectionDraft | null {
  if (!current || matchingDraft(current, expectedScope)) return null;
  return current;
}

export function togglePrecommitDraftCard(
  current: PrecommitSelectionDraft,
  expectedScope: PrecommitScopeIdentity | null,
  cardId: string,
  eligibleCardIds: readonly string[],
  max: number,
): PrecommitSelectionDraft {
  if (!matchingDraft(current, expectedScope) || !eligibleCardIds.includes(cardId)) return current;
  const selected = current.cardIds.filter((id, index, ids) => eligibleCardIds.includes(id) && ids.indexOf(id) === index);
  const next = selected.includes(cardId)
    ? selected.filter((id) => id !== cardId)
    : selected.length < Math.max(0, Math.floor(max)) ? [...selected, cardId] : selected;
  return { ...current, cardIds: next };
}

export function togglePrecommitDraftTarget(
  current: PrecommitSelectionDraft,
  expectedScope: PrecommitScopeIdentity | null,
  targetId: string,
  eligibleTargetIds: readonly string[],
  max: number,
): PrecommitSelectionDraft {
  if (!matchingDraft(current, expectedScope) || !eligibleTargetIds.includes(targetId)) return current;
  const selected = current.targetIds.filter((id, index, ids) => eligibleTargetIds.includes(id) && ids.indexOf(id) === index);
  const limit = Math.max(0, Math.floor(max));
  if (limit === 0) return { ...current, targetIds: selected };
  let next: string[];
  if (selected.includes(targetId)) next = selected.filter((id) => id !== targetId);
  else if (limit === 1) next = [targetId];
  else if (selected.length < limit) next = [...selected, targetId];
  else next = selected;
  return { ...current, targetIds: next };
}

export type PrecommitControls = {
  ownerCanRetapToExit: boolean;
  showLocalCancel: boolean;
  localCancelEnabled: boolean;
  primaryLabel: string | null;
  primaryEnabled: boolean;
};

export function derivePrecommitControls(
  classification: PrecommitOwnerClassification,
  facts: {
    confirmEnabled: boolean;
    localCancelAvailable: boolean;
    existingPrimaryLabel?: string | null;
    existingPrimaryEnabled?: boolean;
    busy?: boolean;
  },
): PrecommitControls {
  const locked = facts.busy === true || classification.kind === "LOCKED";
  if (classification.kind === "REVERSIBLE_DRAFT") {
    return {
      ownerCanRetapToExit: true,
      showLocalCancel: false,
      localCancelEnabled: false,
      primaryLabel: "Confirm",
      primaryEnabled: facts.confirmEnabled && !locked,
    };
  }
  const showLocalCancel = classification.kind === "STANDALONE_PICKER" && facts.localCancelAvailable;
  return {
    ownerCanRetapToExit: false,
    showLocalCancel,
    localCancelEnabled: showLocalCancel && !locked,
    primaryLabel: facts.existingPrimaryLabel ?? null,
    primaryEnabled: facts.existingPrimaryEnabled === true && !locked,
  };
}

export function derivePrecommitOwnerControls(input: {
  ownerPresent: boolean;
  scope: PrecommitScopeIdentity | null;
  available: boolean;
  selected: boolean;
  selectionType: PrecommitSelectionType | null;
  retapSupported: boolean;
  standalonePickerActive?: boolean;
  busy?: boolean;
  submitted?: boolean;
  committed?: boolean;
  confirmEnabled: boolean;
  localCancelAvailable: boolean;
  existingPrimaryLabel?: string | null;
  existingPrimaryEnabled?: boolean;
}): PrecommitControls {
  const classification = classifyPrecommitOwner({
    owner: input.ownerPresent ? {
      scope: input.scope,
      available: input.available,
      selected: input.selected,
      selectionType: input.selectionType,
      retapSupported: input.retapSupported,
    } : null,
    standalonePickerActive: input.standalonePickerActive,
    busy: input.busy,
    submitted: input.submitted,
    committed: input.committed,
  });
  return derivePrecommitControls(classification, {
    confirmEnabled: input.confirmEnabled,
    localCancelAvailable: input.localCancelAvailable,
    existingPrimaryLabel: input.existingPrimaryLabel,
    existingPrimaryEnabled: input.existingPrimaryEnabled,
    busy: input.busy,
  });
}
