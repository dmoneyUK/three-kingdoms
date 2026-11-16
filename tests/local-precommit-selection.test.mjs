import assert from "node:assert/strict";
import test from "node:test";
import {
  classifyPrecommitOwner,
  createPrecommitScopeForAction,
  createPrecommitScopeIdentity,
  derivePrecommitOwnerControls,
  derivePrecommitControls,
  precommitDraftForScope,
  resetPrecommitOwnerDraft,
  samePrecommitScopeIdentity,
  togglePrecommitDraftCard,
  togglePrecommitDraftTarget,
  togglePrecommitOwnerDraft,
} from "../app/local-precommit-selection.ts";

const scope = (overrides = {}) => createPrecommitScopeIdentity({
  roomCode: "ROOM-A",
  viewerId: "PLAYER-1",
  actionRevision: "REV-1",
  surface: "turn",
  kind: "skill",
  ownerId: "skill-a",
  ...overrides,
});

const owner = (overrides = {}) => ({
  scope: scope(),
  available: true,
  selected: true,
  selectionType: "cards",
  retapSupported: true,
  ...overrides,
});

test("scope identity is complete and changes across room, viewer, revision, surface, owner and kind", () => {
  const base = scope();
  assert.ok(base);
  for (const overrides of [
    { roomCode: "ROOM-B" },
    { viewerId: "PLAYER-2" },
    { actionRevision: "REV-2" },
    { surface: "trigger" },
    { ownerId: "skill-b" },
    { kind: "provider" },
  ]) assert.equal(samePrecommitScopeIdentity(base, scope(overrides)), false);
  assert.equal(createPrecommitScopeIdentity({ roomCode: "ROOM-A", viewerId: "PLAYER-1", actionRevision: "", surface: "turn", kind: "skill", ownerId: "skill-a" }), null);
  assert.equal(createPrecommitScopeForAction({ roomCode: "ROOM-A", viewerId: "PLAYER-1", actionRevision: "REV-1", actionKind: "none", kind: "provider", ownerId: "provider-a" }), null);
  assert.equal(createPrecommitScopeForAction({ roomCode: "ROOM-A", viewerId: "PLAYER-1", actionRevision: "REV-1", actionKind: "trigger", kind: "provider", ownerId: "provider-a" })?.surface, "trigger");
});

test("same owner retap clears only its own draft; switching owner starts empty", () => {
  const firstScope = scope();
  const secondScope = scope({ ownerId: "skill-b" });
  const initial = togglePrecommitOwnerDraft(null, firstScope);
  assert.ok(initial);
  const populated = { ...initial, cardIds: ["c1"], targetIds: ["p2", "p3"] };
  assert.equal(togglePrecommitOwnerDraft(populated, firstScope), null);
  assert.deepEqual(togglePrecommitOwnerDraft(populated, secondScope), { scope: secondScope, cardIds: [], targetIds: [] });
  assert.equal(resetPrecommitOwnerDraft(populated, secondScope), populated, "a different owner's data is not erased");
  assert.equal(resetPrecommitOwnerDraft(populated, firstScope), null);
});

test("a viewer or CurrentAction revision change immediately makes the old draft unavailable", () => {
  const originalScope = scope();
  const draft = togglePrecommitOwnerDraft(null, originalScope);
  assert.ok(draft);
  assert.equal(precommitDraftForScope(draft, scope({ viewerId: "PLAYER-2" })), null);
  assert.equal(precommitDraftForScope(draft, scope({ actionRevision: "REV-2" })), null);
  assert.equal(precommitDraftForScope(draft, scope()), draft);
});

test("card selection toggles one legal item and respects max and scope", () => {
  const activeScope = scope();
  const draft = { scope: activeScope, cardIds: ["c1"], targetIds: [] };
  assert.deepEqual(togglePrecommitDraftCard(draft, activeScope, "c1", ["c1", "c2"], 2).cardIds, []);
  assert.deepEqual(togglePrecommitDraftCard(draft, activeScope, "c2", ["c1", "c2"], 2).cardIds, ["c1", "c2"]);
  assert.deepEqual(togglePrecommitDraftCard({ ...draft, cardIds: ["c1", "c2"] }, activeScope, "c3", ["c1", "c2", "c3"], 2).cardIds, ["c1", "c2"]);
  assert.deepEqual(togglePrecommitDraftCard(draft, scope({ viewerId: "PLAYER-2" }), "c2", ["c1", "c2"], 2), draft);
  assert.deepEqual(togglePrecommitDraftCard(draft, activeScope, "private-ineligible", ["c1", "c2"], 2), draft);
});

test("single target retap clears, replacement is exclusive, and multi-target removal preserves order", () => {
  const activeScope = scope();
  const single = { scope: activeScope, cardIds: [], targetIds: ["p2"] };
  assert.deepEqual(togglePrecommitDraftTarget(single, activeScope, "p2", ["p2", "p3"], 1).targetIds, []);
  assert.deepEqual(togglePrecommitDraftTarget(single, activeScope, "p3", ["p2", "p3"], 1).targetIds, ["p3"]);
  const ordered = { ...single, targetIds: ["p2", "p3", "p4"] };
  assert.deepEqual(togglePrecommitDraftTarget(ordered, activeScope, "p3", ["p2", "p3", "p4"], 3).targetIds, ["p2", "p4"]);
  assert.deepEqual(togglePrecommitDraftTarget(ordered, activeScope, "p5", ["p2", "p3", "p4", "p5"], 3).targetIds, ["p2", "p3", "p4"]);
  assert.deepEqual(togglePrecommitDraftTarget(single, activeScope, "p9", ["p2", "p3"], 1), single);
});

test("unavailable, submitted, busy or committed providers cannot become reversible owners", () => {
  for (const candidate of [
    owner({ available: false }),
    owner({ selected: false }),
  ]) {
    const classification = classifyPrecommitOwner({ owner: candidate });
    assert.notEqual(classification.kind, "REVERSIBLE_DRAFT");
  }
  for (const status of [{ busy: true }, { submitted: true }, { committed: true }]) {
    assert.deepEqual(classifyPrecommitOwner({ owner: owner(), ...status }), { kind: "LOCKED" });
  }
  assert.deepEqual(classifyPrecommitOwner({ owner: null }), { kind: "NONE" });
});

test("standalone picker keeps its real Cancel and existing primary; immediate action keeps its original label", () => {
  const standalone = classifyPrecommitOwner({ owner: owner({ retapSupported: false }) });
  assert.equal(standalone.kind, "STANDALONE_PICKER");
  assert.deepEqual(derivePrecommitControls(standalone, {
    confirmEnabled: true,
    localCancelAvailable: true,
    existingPrimaryLabel: "Choose",
    existingPrimaryEnabled: true,
  }), {
    ownerCanRetapToExit: false,
    showLocalCancel: true,
    localCancelEnabled: true,
    primaryLabel: "Choose",
    primaryEnabled: true,
  });
  const immediate = derivePrecommitControls(classifyPrecommitOwner({ owner: owner({ selected: false, selectionType: null }) }), {
    confirmEnabled: true,
    localCancelAvailable: false,
    existingPrimaryLabel: "Play",
    existingPrimaryEnabled: true,
  });
  assert.equal(immediate.primaryLabel, "Play");
  assert.equal(immediate.showLocalCancel, false);
});

test("reversible draft has one Confirm, no duplicate Cancel, and server legality gates it", () => {
  const classification = classifyPrecommitOwner({ owner: owner() });
  assert.equal(classification.kind, "REVERSIBLE_DRAFT");
  const blocked = derivePrecommitControls(classification, { confirmEnabled: false, localCancelAvailable: true });
  assert.equal(blocked.primaryLabel, "Confirm");
  assert.equal(blocked.primaryEnabled, false);
  assert.equal(blocked.showLocalCancel, false);
  assert.equal(blocked.ownerCanRetapToExit, true);
  assert.equal(derivePrecommitControls(classification, { confirmEnabled: true, localCancelAvailable: true, busy: true }).primaryEnabled, false);
  const ready = derivePrecommitControls(classification, { confirmEnabled: true, localCancelAvailable: true });
  assert.equal(ready.primaryEnabled, true);
  assert.equal(ready.showLocalCancel, false);
  const integrated = derivePrecommitOwnerControls({
    ownerPresent: true,
    scope: scope(),
    available: true,
    selected: true,
    selectionType: "cards",
    retapSupported: true,
    confirmEnabled: false,
    localCancelAvailable: true,
    existingPrimaryLabel: "Confirm",
    existingPrimaryEnabled: false,
  });
  assert.equal(integrated.ownerCanRetapToExit, true);
  assert.equal(integrated.showLocalCancel, false);
  assert.equal(integrated.primaryLabel, "Confirm");
  assert.equal(integrated.primaryEnabled, false);
});
