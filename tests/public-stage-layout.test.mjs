import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { findBattlefieldChoiceSafeTopOffset, harvestChoicePlacementPanelRect, isBattlefieldChoiceTopOffsetSafe } from "../app/battlefield-choice-stage.tsx";
import { calculatePublicStageLayout, checkpointPublicStageVisibleHold, positionLabeledCardAboveBand, publicStationaryLanePreferredTop, publicStageCoordinateFromTableLocal, publicStageCoordinateToTableLocal, publicStageEffectFrameRevealTargetMatches, publicStageFailedRevealMatchesScene, publicStageJourneyPhaseReady, publicStageLengthToTableLocal, publicStageMeasuredBandClearanceSatisfied, publicStagePrimaryOriginFromVisualRect, publicStageRectFromTableLocal, publicStageRectToTableLocal, publicStageRevealCanRetire, publicStageRevealNeedsOwnedRemeasure, publicStageSceneIdentity, publicStageSceneMatchesCard, publicStageStaticAnnouncementMatchesReveal, publicStageVisibleHoldCanComplete } from "../game/public-stage-layout.ts";

const scene = {
  semantics: "PROVEN",
  roomId: "room-1",
  scopeId: "root-event-1",
  interactionId: null,
  eventId: "event-1",
  cardId: "card-1",
  viewerId: "viewer-1",
  phase: "REVEAL",
  generation: 1,
};

function input(overrides = {}) {
  const value = {
    scene,
    viewport: { left: 0, top: 0, right: 390, bottom: 844 },
    table: { left: 8, top: 100, right: 382, bottom: 780 },
    preferredCard: { left: 150, top: 350 },
    card: { width: 90, height: 135 },
    announcement: { width: 240, height: 52 },
    activity: { width: 220, height: 44 },
    obstacles: [],
    ...overrides,
  };
  if (value.scene.phase === "REVEAL" && !("fixedBands" in overrides) && !("upperH4" in overrides)) {
    value.fixedBands = {
      h4: h4Geometry(75, 120, 240, 52),
      pac: { left: 85, top: 690, right: 305, bottom: 734 },
    };
    if (!("activityBottom" in overrides)) value.activityBottom = 734;
  }
  return value;
}

function h4Geometry(left, top, width, reserveHeight, paintHeight = reserveHeight) {
  return {
    reserve: { left, top, right: left + width, bottom: top + reserveHeight },
    paint: { left, top, right: left + width, bottom: top + paintHeight },
    overlapPolicy: "PASSIVE_REVEAL_FOREGROUND",
  };
}

test("a static replacement H4 may retain the pending reveal anchor only for exact room, event, card and viewer identity", () => {
  const identity = { roomId: "room-1", rootEventId: "root-1", interactionId: "interaction-1",
    eventId: "replacement-1", cardId: "replacement-card-1", viewerId: "viewer-1" };
  assert.equal(publicStageStaticAnnouncementMatchesReveal({ phase: "static", expected: identity, actual: identity }), true);
  assert.equal(publicStageStaticAnnouncementMatchesReveal({ phase: "reveal", expected: identity, actual: identity }), false,
    "ordinary moving/revealing copy keeps its existing placement path");
  for (const key of Object.keys(identity)) {
    assert.equal(publicStageStaticAnnouncementMatchesReveal({ phase: "static", expected: identity,
      actual: { ...identity, [key]: `wrong-${key}` } }), false, `${key} mismatch fails closed`);
  }
});

test("visible-hold checkpoint accrues only the visible segment and resumes the remainder", () => {
  const pausedAt235 = checkpointPublicStageVisibleHold({ elapsedMs: 0, remainingMs: 4000, startedAtMs: 0, nowMs: 235 });
  assert.deepEqual(pausedAt235, { elapsedMs: 235, remainingMs: 3765, segmentMs: 235, startedAtMs: null });
  const recoveredAt4000 = checkpointPublicStageVisibleHold({ elapsedMs: pausedAt235.elapsedMs,
    remainingMs: pausedAt235.remainingMs, startedAtMs: null, nowMs: 4000 });
  assert.equal(recoveredAt4000.remainingMs, 3765, "hidden wall time is not charged");
  const completed = checkpointPublicStageVisibleHold({ elapsedMs: recoveredAt4000.elapsedMs,
    remainingMs: recoveredAt4000.remainingMs, startedAtMs: 4000, nowMs: 7765 });
  assert.equal(completed.elapsedMs, 4000);
  assert.equal(completed.remainingMs, 0);
  assert.equal(publicStageVisibleHoldCanComplete({ remainingMs: recoveredAt4000.remainingMs,
    startedAtMs: 4000, nowMs: 7764, safePainted: true }), false, "one millisecond before the remainder expires cannot complete");
  assert.equal(publicStageVisibleHoldCanComplete({ remainingMs: recoveredAt4000.remainingMs,
    startedAtMs: 4000, nowMs: 7765, safePainted: false }), false, "unsafe paint cannot complete at the deadline");
  assert.equal(publicStageVisibleHoldCanComplete({ remainingMs: recoveredAt4000.remainingMs,
    startedAtMs: 4000, nowMs: 7765, safePainted: true }), true, "the safe remaining visible budget completes once due");
});

test("table-local H4, PAC and CardFace coordinates stay fixed when the visible viewport changes", () => {
  const stationaryPublicElements = {
    h4: { left: 24, top: 40, right: 342, bottom: 96 },
    pac: { left: 38, top: 520, right: 352, bottom: 574 },
    cardFace: { left: 150, top: 278, right: 240, bottom: 413 },
  };
  const spaces = [
    { originLeft: 12, originTop: 28, borderLeft: 2, borderTop: 3, scaleX: 1, scaleY: 1 },
    { originLeft: -90, originTop: 140, borderLeft: 2, borderTop: 3, scaleX: 1.5, scaleY: 1.5 },
    { originLeft: 260, originTop: -35, borderLeft: 2, borderTop: 3, scaleX: 0.8, scaleY: 0.8 },
  ];
  for (const space of spaces) {
    for (const [owner, tableLocal] of Object.entries(stationaryPublicElements)) {
      const client = publicStageRectFromTableLocal(tableLocal, space);
      assert.ok(client, `${owner} projects into client coordinates`);
      const roundTrip = publicStageRectToTableLocal(client, space);
      assert.ok(roundTrip, `${owner} round-trips into table coordinates`);
      for (const edge of ["left", "top", "right", "bottom"]) {
        assert.ok(Math.abs(roundTrip[edge] - tableLocal[edge]) < 1e-8, `${owner} keeps ${edge} at its table anchor`);
      }
    }
    assert.ok(Math.abs(publicStageCoordinateToTableLocal(
      publicStageCoordinateFromTableLocal(stationaryPublicElements.h4.left, "x", space), "x", space,
    ) - stationaryPublicElements.h4.left) < 1e-8);
  }
  assert.equal(publicStageLengthToTableLocal(180, "y", spaces[1]), 120);
});

test("public stage identity is scoped to proven event, physical card, viewer, phase and generation", () => {
  const identity = publicStageSceneIdentity(scene);
  assert.ok(identity);
  for (const change of [
    { eventId: "event-2" },
    { cardId: "card-2" },
    { viewerId: "viewer-2" },
    { phase: "MOVE" },
    { generation: 2 },
  ]) assert.notEqual(publicStageSceneIdentity({ ...scene, ...change }), identity);
  assert.equal(publicStageSceneIdentity({ ...scene, semantics: "INFERRED" }), null);
  assert.equal(publicStageSceneIdentity({ ...scene, cardId: "" }), null);
  assert.notEqual(publicStageSceneIdentity({ ...scene, scopeId: "root-event-2" }), identity);
});

test("shared reveal readiness requires the exact room, root, interaction, event, card, viewer and phase", () => {
  const cardIdentity = {
    roomId: scene.roomId,
    scopeId: scene.scopeId,
    interactionId: scene.interactionId,
    eventId: scene.eventId,
    cardId: scene.cardId,
    viewerId: scene.viewerId,
    phase: "REVEAL",
  };
  assert.equal(publicStageSceneMatchesCard(scene, cardIdentity), true);
  for (const change of [
    { roomId: "room-2" },
    { scopeId: "root-event-2" },
    { interactionId: "interaction-2" },
    { eventId: "event-2" },
    { cardId: "card-2" },
    { viewerId: "viewer-2" },
    { phase: "MOVE" },
  ]) assert.equal(publicStageSceneMatchesCard(scene, { ...cardIdentity, ...change }), false);
  assert.equal(publicStageSceneMatchesCard({ ...scene, semantics: "INFERRED" }, cardIdentity), false);
});

test("unavailable reveal geometry can retry only for the same proven scene identity", () => {
  const failure = {
    phase: "REVEAL",
    roomId: scene.roomId,
    rootEventId: scene.scopeId,
    interactionId: scene.interactionId,
    eventId: scene.eventId,
    cardId: scene.cardId,
    viewerId: scene.viewerId,
  };
  const current = {
    roomId: scene.roomId,
    scopeId: scene.scopeId,
    interactionId: scene.interactionId,
    eventId: scene.eventId,
    cardId: scene.cardId,
    viewerId: scene.viewerId,
    phase: "REVEAL",
  };
  assert.equal(publicStageFailedRevealMatchesScene({ failure, scene: current }), true);
  for (const change of [
    { roomId: "room-2" },
    { scopeId: "root-event-2" },
    { interactionId: "interaction-2" },
    { eventId: "event-2" },
    { cardId: "card-2" },
    { viewerId: "viewer-2" },
    { phase: "MOVE" },
  ]) assert.equal(publicStageFailedRevealMatchesScene({ failure, scene: { ...current, ...change } }), false);
});

test("shared measured Effect Frame union maps back to the same primary CardFace origin", () => {
  const measuredFrame = { left: 111, top: 200, right: 279, bottom: 394 };
  const primaryOffset = { left: -39, top: -47 };
  assert.deepEqual(publicStagePrimaryOriginFromVisualRect(measuredFrame, primaryOffset), { left: 150, top: 247 });
  assert.equal(publicStagePrimaryOriginFromVisualRect({ ...measuredFrame, right: measuredFrame.left }, primaryOffset), null);
  assert.equal(publicStagePrimaryOriginFromVisualRect(measuredFrame, { ...primaryOffset, top: Number.NaN }), null);
});

test("Effect Frame target can bootstrap before paint readiness without relaxing scene or H4 ownership", () => {
  const effectScene = { ...scene, scopeId: "root-kirin", eventId: "kirin-effect", cardId: "mount-card", generation: 3 };
  const result = calculatePublicStageLayout(input({
    scene: effectScene,
    viewport: { left: 0, top: 0, right: 390, bottom: 844 },
    table: { left: 0, top: 0, right: 390, bottom: 700 },
    activityBottom: 500,
    preferredCard: { left: 111, top: 300 },
    card: { width: 168, height: 194 },
    fixedBands: {
      h4: h4Geometry(25, 100, 340, 100),
      pac: { left: 25, top: 405, right: 365, bottom: 500 },
    },
    stationarySurface: "effect-frame",
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  const valid = {
    layout: result.layout,
    roomId: effectScene.roomId,
    rootEventId: effectScene.scopeId,
    interactionId: effectScene.interactionId,
    eventId: effectScene.eventId,
    cardId: effectScene.cardId,
    viewerId: effectScene.viewerId,
    primaryEventId: effectScene.eventId,
    primaryCardId: effectScene.cardId,
    announcementEventId: effectScene.eventId,
    announcementAnchorEventId: null,
  };
  // This pure target is available before the DOM reaches it and can therefore
  // make the first placement that later satisfies revealReady.
  assert.equal(publicStageEffectFrameRevealTargetMatches(valid), true);
  for (const change of [
    { eventId: "other-event" },
    { rootEventId: "other-root" },
    { cardId: "other-card" },
    { viewerId: "other-viewer" },
    { primaryCardId: "other-card" },
    { announcementEventId: "other-event", announcementAnchorEventId: "other-anchor" },
  ]) assert.equal(publicStageEffectFrameRevealTargetMatches({ ...valid, ...change }), false);
});

test("a public reveal cannot retire before safe paint and a measured target for this viewer", () => {
  const ready = {
    phase: "REVEAL",
    layoutPending: false,
    safePainted: true,
    viewerId: "viewer-1",
    parkingTargetViewerId: "viewer-1",
    parkingTarget: { width: 32, height: 48 },
  };
  assert.equal(publicStageRevealCanRetire(ready), true);
  for (const change of [
    { layoutPending: true },
    { safePainted: false },
    { phase: "MOVE" },
    { parkingTargetViewerId: "viewer-2" },
    { parkingTarget: { width: 0, height: 48 } },
  ]) assert.equal(publicStageRevealCanRetire({ ...ready, ...change }), false);
});

test("a centre-only reveal can complete after safe visible hold without a parking target", () => {
  const reveal = {
    phase: "REVEAL",
    layoutPending: false,
    safePainted: true,
    viewerId: "viewer-1",
    parkingTargetViewerId: undefined,
    parkingTarget: null,
    requireParkingTarget: false,
  };
  assert.equal(publicStageRevealCanRetire(reveal), true);
  assert.equal(publicStageRevealCanRetire({ ...reveal, safePainted: false }), false);
  assert.equal(publicStageRevealCanRetire({ ...reveal, layoutPending: true }), false);
  assert.equal(publicStageRevealCanRetire({ ...reveal, requireParkingTarget: true }), false);
});

test("only the matching pending REVEAL schedules a remeasure after owned placement styles land", () => {
  const pendingCurrentReveal = { phase: "REVEAL", revealReady: false, identityMatches: true };
  assert.equal(publicStageRevealNeedsOwnedRemeasure(pendingCurrentReveal), true);
  for (const change of [
    { revealReady: true },
    { phase: "MOVE" },
    { phase: "PARKED" },
    { identityMatches: false },
    { revealReady: undefined },
  ]) assert.equal(publicStageRevealNeedsOwnedRemeasure({ ...pendingCurrentReveal, ...change }), false);
});

test("journey readiness uses REVEAL paint only until a viewer-owned move/park target exists", () => {
  const readyTarget = { left: 24, top: 48, right: 56, bottom: 96 };
  const common = { viewerId: "viewer-1", targetViewerId: "viewer-1", target: readyTarget };
  assert.equal(publicStageJourneyPhaseReady({
    ...common, phase: "REVEAL", revealCenterAvailable: true, revealPainted: true,
  }), true);
  assert.equal(publicStageJourneyPhaseReady({
    ...common, phase: "REVEAL", revealCenterAvailable: true, revealPainted: false,
  }), false);
  for (const phase of ["MOVE", "PARKED"]) {
    assert.equal(publicStageJourneyPhaseReady({
      ...common, phase, revealCenterAvailable: false, revealPainted: false,
    }), true, `${phase} does not depend on retired REVEAL geometry`);
    assert.equal(publicStageJourneyPhaseReady({
      ...common, phase, targetViewerId: "viewer-2", revealCenterAvailable: true, revealPainted: true,
    }), false, `${phase} still requires this viewer's target`);
    assert.equal(publicStageJourneyPhaseReady({
      ...common, phase, target: { left: 24, top: 48, right: 24, bottom: 96 }, revealCenterAvailable: true, revealPainted: true,
    }), false, `${phase} rejects an invalid target`);
  }
});

test("measured Effect Frame clearance enforces an exact five-pixel gap and preserves ordinary eight-pixel clearance", () => {
  const visual = { left: 100, top: 200, right: 268, bottom: 394 };
  const h4 = { left: 20, top: 100, right: 370, bottom: 195 };
  const pacReserve = { left: 20, top: 399, right: 370, bottom: 500 };
  const measured = (upper, lower, minimumGap = 5) => publicStageMeasuredBandClearanceSatisfied({
    visual,
    upperBands: [upper],
    lowerBands: [lower],
    minimumGap,
  });
  assert.equal(measured({ ...h4, bottom: 195.1 }, pacReserve), false, "4.9px above is not 5px");
  assert.equal(measured(h4, pacReserve), true, "exactly 5px on both sides passes");
  assert.equal(measured({ ...h4, bottom: 193.7 }, { ...pacReserve, top: 400.3 }), true, "6.3px on both sides passes");
  assert.equal(measured(h4, { ...pacReserve, top: 398.9 }), false, "4.9px below is not 5px");
  assert.equal(measured(h4, pacReserve, 8), false, "an Effect Frame does not weaken an ordinary eight-pixel requirement");
  assert.equal(measured({ ...h4, bottom: 192 }, { ...pacReserve, top: 402 }, 8), true, "ordinary 8px clearance remains measurable");
  assert.equal(publicStageMeasuredBandClearanceSatisfied({
    visual,
    upperBands: [h4],
    lowerBands: [pacReserve, { ...pacReserve, top: 398.9 }],
    minimumGap: 5,
  }), false, "a mounted PAC must fit too; the clear reserve cannot hide its collision");
});

test("Harvest pool uses the measured central band below H4 and above PAC", () => {
  const table = { left: 0, top: 0, right: 440, bottom: 470.5, width: 440, height: 470.5 };
  const panel = { left: 66.5, top: 171, right: 373.5, bottom: 299, width: 307, height: 128 };
  const h4 = { left: 12, top: 154, right: 428, bottom: 183.5, width: 416, height: 29.5 };
  const pac = { left: 50, top: 413, right: 390, bottom: 475.5, width: 340, height: 62.5 };
  const top = findBattlefieldChoiceSafeTopOffset({
    table,
    panel,
    obstacles: [h4, pac],
    viewportHeight: 766,
    minimumTop: h4.bottom + 6,
    margin: 6,
  });

  assert.notEqual(top, null);
  assert.equal(top, 263, "the measured pool settles centrally in the available H4-to-PAC band");
  assert.ok(top >= h4.bottom + 6, "the card pool stays below the fixed H4");
  assert.ok(top + panel.height <= pac.top - 6, "the card pool leaves the PAC clear");
  assert.ok(top + panel.height <= table.bottom, "the full card pool stays inside the battlefield");
});

test("Harvest reserves the real Confirm footer so read-only and actor pool tops stay fixed", () => {
  const table = { left: 0, top: 0, right: 440, bottom: 520, width: 440, height: 520 };
  const obstacles = [
    { left: 12, top: 90, right: 428, bottom: 128, width: 416, height: 38 },
    { left: 50, top: 450, right: 390, bottom: 510, width: 340, height: 60 },
  ];
  const readOnlyPanel = { left: 40, top: 0, right: 400, bottom: 160, width: 360, height: 160 };
  const actorPanel = { ...readOnlyPanel, height: 200 };
  const readOnlyPlacement = harvestChoicePlacementPanelRect(readOnlyPanel, false);
  const actorPlacement = harvestChoicePlacementPanelRect(actorPanel, true);
  const placementTop = (panel) => findBattlefieldChoiceSafeTopOffset({
    table, panel, obstacles, viewportHeight: 520, minimumTop: 134, margin: 6,
  });

  assert.equal(readOnlyPlacement.height, actorPlacement.height);
  assert.equal(placementTop(readOnlyPlacement), placementTop(actorPlacement));
  assert.equal(readOnlyPanel.height, 160, "read-only mode does not insert a fake footer or resize its visible panel");
  assert.equal(harvestChoicePlacementPanelRect(readOnlyPanel, false, false).height, readOnlyPanel.height);
});

test("a cached Harvest top is reused only while the full reserved panel clears measured obstacles", () => {
  const placement = {
    table: { left: 0, top: 100, right: 440, bottom: 620, width: 440, height: 520 },
    panel: { left: 40, top: 0, right: 400, bottom: 0, width: 360, height: 200 },
    obstacles: [
      { left: 10, top: 150, right: 430, bottom: 190, width: 420, height: 40 },
      { left: 50, top: 480, right: 390, bottom: 510, width: 340, height: 30 },
    ],
    viewportHeight: 700,
    minimumTop: 200,
    margin: 6,
  };
  const safe = findBattlefieldChoiceSafeTopOffset(placement);
  assert.ok(safe !== null);
  assert.equal(isBattlefieldChoiceTopOffsetSafe({ ...placement, offset: safe }), true);
  assert.equal(isBattlefieldChoiceTopOffsetSafe({ ...placement, offset: safe + 1 }), false,
    "a cached location is rejected if the measured full-height panel no longer clears the next obstacle");
  assert.equal(isBattlefieldChoiceTopOffsetSafe({ ...placement, panel: { ...placement.panel, height: 420 }, offset: safe }), false,
    "actor-select growth cannot reuse a cached read-only location without reserved height");
});

test("reveal layout keeps full-size card on its nominal anchor with independently placed H4 and PAC", () => {
  const result = calculatePublicStageLayout(input());
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  const { announcement, card, activity } = result.layout;
  assert.ok(announcement.bottom <= card.top);
  assert.ok(card.bottom <= activity.top);
  assert.ok(activity.top - card.bottom >= 8);
  assert.deepEqual([card.right - card.left, card.bottom - card.top], [90, 135]);
  for (const rect of [announcement, card, activity]) {
    assert.ok(rect.left >= result.layout.safeBounds.left);
    assert.ok(rect.right <= result.layout.safeBounds.right);
    assert.ok(rect.top >= result.layout.safeBounds.top);
    assert.ok(rect.bottom <= result.layout.safeBounds.bottom);
  }
});

test("REVEAL anchors the shared PAC to the measured Console top without rejecting overlay geometry", () => {
  const consoleTop = 482;
  const result = calculatePublicStageLayout(input({
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 470 },
    activityBottom: consoleTop,
    preferredCard: { left: 150, top: 250 },
    obstacles: [{ id: "console-guidance", rect: { left: 0, top: consoleTop, right: 390, bottom: 560 } }],
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  const { announcement, card, activity } = result.layout;
  assert.equal(activity.bottom, consoleTop);
  assert.equal((activity.left + activity.right) / 2, 195);
  assert.ok(activity.top - card.bottom >= 8);
  assert.ok(announcement.bottom <= card.top);
  assert.equal(activity.bottom > 470, true, "PAC uses the real gap below the battlefield border");
  assert.equal(activity.top < 560 && activity.bottom > consoleTop, false);
});

test("passive REVEAL keeps the exact nominal placement through Seat, choice and Console overlap", () => {
  const obstacle = { id: "countdown", rect: { left: 132, top: 310, right: 258, bottom: 374 } };
  const canonical = calculatePublicStageLayout(input());
  const result = calculatePublicStageLayout(input({
    obstacles: [obstacle, { id: "seat", rect: { left: 0, top: 0, right: 390, bottom: 120 } },
      { id: "choice", rect: { left: 40, top: 250, right: 350, bottom: 430 } }],
  }));
  assert.equal(result.status, "placed");
  assert.equal(canonical.status, "placed");
  if (result.status !== "placed" || canonical.status !== "placed") return;
  assert.deepEqual(result.layout, canonical.layout);
  assert.deepEqual(result.layout.protectedRects, []);
});

test("a browser viewport crop does not reject a proven reveal, while malformed bands still fail closed", () => {
  const cropped = calculatePublicStageLayout(input({
    viewport: { left: 0, top: 100, right: 390, bottom: 300 },
  }));
  assert.equal(cropped.status, "placed");
  if (cropped.status === "placed") assert.deepEqual(cropped.layout.card,
    { left: 150, top: 350, right: 240, bottom: 485 });

  const malformed = calculatePublicStageLayout(input({
    fixedBands: { h4: h4Geometry(75, 120, 240, 52), pac: { left: 85, top: 690, right: 305, bottom: Number.NaN } },
  }));
  assert.equal(malformed.status, "unavailable");
  if (malformed.status === "unavailable") assert.equal(malformed.reason, "INVALID_GEOMETRY");
});

test("MOVE preserves the validated reveal H4 band until the card leaves its 380ms route", () => {
  const card = { left: 150, top: 350, right: 180, bottom: 395 };
  const activity = { left: 85, top: 700, right: 305, bottom: 744 };
  const route = { left: 18, top: 182, right: 180, bottom: 395 };
  const announcement = { left: 75, top: 310, right: 315, bottom: 362 };
  const countdown = { left: 340, top: 370, right: 380, bottom: 410 };
  const result = calculatePublicStageLayout(input({
    scene: { ...scene, phase: "MOVE", generation: 2 },
    card: { width: 30, height: 45 },
    obstacles: [{ id: "primary-card-move-path", rect: route }, { id: "countdown", rect: countdown }],
    phaseRects: { card, activity, announcement },
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.equal(result.layout.scene.phase, "MOVE");
  assert.deepEqual(result.layout.card, card);
  assert.deepEqual(result.layout.activity, activity);
  assert.deepEqual(result.layout.announcement, announcement);
  assert.equal(result.layout.announcement.left < route.right && result.layout.announcement.right > route.left
    && result.layout.announcement.top < route.bottom && result.layout.announcement.bottom > route.top, true);
  assert.equal(result.layout.announcement.left < activity.right && result.layout.announcement.right > activity.left
    && result.layout.announcement.top < activity.bottom && result.layout.announcement.bottom > activity.top, false);
  assert.equal(result.layout.announcement.left < countdown.right && result.layout.announcement.right > countdown.left
    && result.layout.announcement.top < countdown.bottom && result.layout.announcement.bottom > countdown.top, false);
});

test("MOVE keeps PAC on the measured Console seam while the physical card follows its route", () => {
  const consoleTop = 482;
  const card = { left: 150, top: 350, right: 180, bottom: 395 };
  const activity = { left: 85, top: 700, right: 305, bottom: 744 };
  const route = { left: 18, top: 182, right: 180, bottom: 395 };
  const announcement = { left: 75, top: 310, right: 315, bottom: 362 };
  const result = calculatePublicStageLayout(input({
    scene: { ...scene, phase: "MOVE", generation: 2 },
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 470 },
    activityBottom: consoleTop,
    card: { width: 30, height: 45 },
    obstacles: [
      { id: "primary-card-move-path", rect: route },
      { id: "console-guidance", rect: { left: 0, top: consoleTop, right: 390, bottom: 560 } },
    ],
    phaseRects: { card, activity, announcement },
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.deepEqual(result.layout.card, card);
  assert.deepEqual(result.layout.announcement, announcement);
  assert.equal(result.layout.activity.bottom, consoleTop);
  assert.ok(result.layout.activity.top - result.layout.card.bottom >= 8);
});

test("PARKED returns H4 to the safe stage centre without moving the authentic card or PAC", () => {
  const card = { left: 14, top: 158, right: 44, bottom: 203 };
  const activity = { left: 85, top: 700, right: 305, bottom: 744 };
  const table = { left: 8, top: 100, right: 382, bottom: 780 };
  const result = calculatePublicStageLayout(input({
    scene: { ...scene, phase: "PARKED", generation: 3 },
    card: { width: 30, height: 45 },
    table,
    phaseRects: { card, activity },
    obstacles: [{ id: "seat", rect: { left: 8, top: 154, right: 192, bottom: 286 } }],
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.equal(result.layout.scene.phase, "PARKED");
  assert.deepEqual(result.layout.card, card);
  assert.deepEqual(result.layout.activity, activity);
  const h4CenterY = (result.layout.announcement.top + result.layout.announcement.bottom) / 2;
  assert.ok(Math.abs(h4CenterY - (table.top + table.bottom) / 2) <= 8);
  for (const obstacle of [...result.layout.protectedRects, { id: "parked-card", rect: card }, { id: "pac", rect: activity }]) {
    assert.equal(result.layout.announcement.left < obstacle.rect.right && result.layout.announcement.right > obstacle.rect.left
      && result.layout.announcement.top < obstacle.rect.bottom && result.layout.announcement.bottom > obstacle.rect.top, false);
  }
});

test("PARKED repositions an unplaced PAC away from Seats into the lower battlefield", () => {
  const card = { left: 35, top: 105, right: 75, bottom: 165 };
  const seats = { left: 8, top: 0, right: 382, bottom: 94 };
  const result = calculatePublicStageLayout(input({
    scene: { ...scene, phase: "PARKED", generation: 3 },
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 460 },
    card: { width: 40, height: 60 },
    activity: { width: 340, height: 44 },
    phaseRects: { card, activity: { left: 0, top: 0, right: 340, bottom: 44 } },
    obstacles: [{ id: "seats", rect: seats }],
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.deepEqual(result.layout.card, card);
  assert.ok(result.layout.activity.top >= seats.bottom);
  assert.ok(result.layout.activity.bottom <= result.layout.safeBounds.bottom);
  assert.ok(result.layout.activity.top > result.layout.announcement.bottom);
});

test("PARKED centres PAC even when it covers the real parked miniature", () => {
  const card = { left: 32, top: 384, right: 80, bottom: 456 };
  const result = calculatePublicStageLayout(input({
    scene: { ...scene, phase: "PARKED", generation: 4 },
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 460 },
    activityBottom: 480,
    card: { width: 48, height: 72 },
    activity: { width: 340, height: 44 },
    phaseRects: { card, activity: { left: 0, top: 0, right: 340, bottom: 44 } },
    obstacles: [{ id: "seats", rect: { left: 8, top: 0, right: 382, bottom: 94 } }],
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.equal((result.layout.activity.left + result.layout.activity.right) / 2, 195);
  assert.equal(result.layout.activity.bottom, 480);
  assert.ok(result.layout.activity.left < card.right && result.layout.activity.right > card.left);
  assert.ok(result.layout.activity.top < card.bottom && result.layout.activity.bottom > card.top);
  assert.deepEqual(result.layout.card, card);
});

test("short mobile stage keeps the canonical full-size reveal despite foreground overlap", () => {
  const result = calculatePublicStageLayout(input({
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 360 },
    activityBottom: 352,
    preferredCard: { left: 110, top: 100 },
    card: { width: 168, height: 190 },
    announcement: { width: 366, height: 48 },
    activity: { width: 340, height: 57 },
    obstacles: [{ id: "seats", rect: { left: 0, top: 0, right: 390, bottom: 94 } }],
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  const { card, announcement, activity, variant } = result.layout;
  assert.equal(variant, "fixed-bands");
  assert.equal(card.right - card.left, 168);
  assert.deepEqual(card, { left: 110, top: 100, right: 278, bottom: 290 });
  assert.ok(announcement.bottom > card.top || card.bottom > announcement.top,
    "a measured long H4 may be foreground over the passive card");
  assert.ok(activity.top < card.bottom + 8 || activity.bottom > card.top,
    "PAC overlap remains an independent foreground layer");
  assert.equal((activity.left + activity.right) / 2, 195);
  assert.equal(activity.bottom, 352, "the PAC remains anchored to the real table/Console seam");
});

test("measured upper H4 paint can grow across a passive reveal and PAC without moving the fixed card", () => {
  const geometry = { viewport: { left: 0, top: 0, right: 440, bottom: 766 }, table: { left: 0, top: 0, right: 440, bottom: 474 }, activityBottom: 479,
    preferredCard: { left: 175, top: 200 }, card: { width: 90, height: 135 },
    upperH4: { ...h4Geometry(50, 150.15625, 340, 70.5, 70.5), gap: 8 },
    activity: { width: 340, height: 67 }, obstacles: [] };
  const short = calculatePublicStageLayout(input({ ...geometry, announcement: { width: 340, height: 30 } }));
  const longPaint = { ...geometry.upperH4.paint, bottom: 245 };
  const long = calculatePublicStageLayout(input({ ...geometry,
    upperH4: { ...geometry.upperH4, paint: longPaint }, announcement: { width: 340, height: 95 } }));
  assert.equal(short.status, "placed"); assert.equal(long.status, "placed");
  assert.equal(short.layout.announcement.top, 150.15625);
  assert.deepEqual(short.layout.card, long.layout.card);
  assert.equal(long.layout.announcement.bottom, 245);
  assert.ok(long.layout.announcement.bottom > long.layout.card.top, "long H4 paint may cover the passive CardFace");
  assert.ok(long.layout.card.bottom + 8 <= long.layout.activity.top);
  const overlapsPac = calculatePublicStageLayout(input({ ...geometry,
    upperH4: { ...geometry.upperH4, paint: { ...longPaint, bottom: 420 } } }));
  assert.equal(overlapsPac.status, "placed", "H4/PAC overlap is paint order, not a passive reveal gate");
  if (overlapsPac.status === "placed") assert.deepEqual(overlapsPac.layout.card, long.layout.card);
});

test("fixed-band Effect Frame preserves its position across passive reserve and Seat overlap", () => {
  const geometry = {
    viewport: { left: 0, top: 0, right: 390, bottom: 844 },
    table: { left: 0, top: 0, right: 390, bottom: 700 },
    activityBottom: 500,
    preferredCard: { left: 111, top: 300 },
    card: { width: 168, height: 194 },
    announcement: { width: 340, height: 52 },
    activity: { width: 340, height: 50 },
    fixedBands: {
      h4: h4Geometry(25, 100, 340, 52),
      pac: { left: 25, top: 405, right: 365, bottom: 500 },
    },
    stationarySurface: "effect-frame",
    obstacles: [],
  };
  const short = calculatePublicStageLayout(input(geometry));
  const long = calculatePublicStageLayout(input({
    ...geometry,
    fixedBands: { ...geometry.fixedBands, h4: h4Geometry(25, 100, 340, 52, 220) },
    announcement: { width: 340, height: 120 },
  }));
  assert.equal(short.status, "placed");
  assert.equal(long.status, "placed");
  if (short.status !== "placed" || long.status !== "placed") return;
  assert.deepEqual(long.layout.card, short.layout.card);
  assert.equal(long.layout.card.top, geometry.preferredCard.top);
  assert.equal(long.layout.announcement.bottom, 320);
  assert.ok(long.layout.announcement.bottom > long.layout.card.top);
  assert.ok(long.layout.card.bottom > geometry.fixedBands.pac.top, "empty PAC reserve does not move or block the fixed frame");

  const overlapsSeat = calculatePublicStageLayout(input({
    ...geometry,
    obstacles: [{ id: "seat", rect: { left: 150, top: 320, right: 180, bottom: 340 } }],
  }));
  assert.equal(overlapsSeat.status, "placed", "the seat is resolved by foreground layers, never alternate placement");
  if (overlapsSeat.status === "placed") {
    assert.deepEqual(overlapsSeat.layout.card, short.layout.card);
    assert.deepEqual(overlapsSeat.layout.protectedRects, []);
  }
  const overlapsPac = calculatePublicStageLayout(input({
    ...geometry,
    fixedBands: { ...geometry.fixedBands, h4: h4Geometry(25, 100, 340, 52, 310) },
  }));
  assert.equal(overlapsPac.status, "placed", "H4/PAC overlap remains an independent foreground paint case");
  if (overlapsPac.status === "placed") assert.deepEqual(overlapsPac.layout.card, short.layout.card);
});

test("full effect frame preserves its canonical position when the browser crops the viewport", () => {
  const geometry = {
    viewport: { left: 0, top: 0, right: 390, bottom: 844 },
    table: { left: 0, top: 0, right: 390, bottom: 620 },
    activityBottom: 620,
    upperH4: { ...h4Geometry(25, 150, 340, 70), gap: 8 },
    stationarySurface: "effect-frame",
    preferredCard: { left: 111, top: 300 },
    card: { width: 168, height: 190 },
    announcement: { width: 340, height: 48 },
    activity: { width: 340, height: 60 },
    obstacles: [{ id: "upper-seats", rect: { left: 0, top: 0, right: 390, bottom: 100 } }],
  };
  const wrapped = calculatePublicStageLayout(input(geometry));
  const rewrapped = calculatePublicStageLayout(input({ ...geometry, announcement: { width: 340, height: 70 } }));
  assert.equal(wrapped.status, "placed");
  assert.equal(rewrapped.status, "placed");
  if (wrapped.status !== "placed" || rewrapped.status !== "placed") return;
  assert.equal(wrapped.layout.card.top, geometry.preferredCard.top);
  assert.deepEqual(wrapped.layout.card, rewrapped.layout.card);

  const cropped = calculatePublicStageLayout(input({
    ...geometry,
    viewport: { left: 0, top: 0, right: 390, bottom: 280 },
  }));
  assert.equal(cropped.status, "placed");
  if (cropped.status === "placed") assert.deepEqual(cropped.layout.card,
    { left: 111, top: 300, right: 279, bottom: 490 });
});

test("fixed H4 and PAC reserves pin the same stationary card while either message is absent or wraps", () => {
  const geometry = {
    viewport: { left: 0, top: 0, right: 440, bottom: 766 },
    table: { left: 0, top: 0, right: 440, bottom: 680 },
    activityBottom: 660,
    preferredCard: { left: 175, top: 350 },
    card: { width: 90, height: 135 },
    announcement: { width: 340, height: 64 },
    activity: { width: 340, height: 82 },
    fixedBands: {
      h4: h4Geometry(50, 120, 340, 70),
      pac: { left: 50, top: 560, right: 390, bottom: 660 },
    },
    obstacles: [],
  };
  const layouts = [
    calculatePublicStageLayout(input(geometry)), // H4 and PAC visible
    calculatePublicStageLayout(input({ ...geometry, announcement: { width: 340, height: 35 } })), // H4 wraps less
    calculatePublicStageLayout(input({ ...geometry, activity: { width: 340, height: 48 } })), // PAC wraps less
    calculatePublicStageLayout(input({ ...geometry, announcement: { width: 340, height: 35 }, activity: { width: 340, height: 48 } })), // both absent: reserve geometry only
  ];
  assert.ok(layouts.every((result) => result.status === "placed"));
  const cards = layouts.map((result) => result.status === "placed" ? result.layout.card : null);
  for (const card of cards.slice(1)) assert.deepEqual(card, cards[0]);
  const placed = layouts[0];
  assert.equal(placed.status, "placed");
  if (placed.status !== "placed") return;
  assert.equal(placed.layout.variant, "fixed-bands");
  assert.equal(placed.layout.card.left, geometry.preferredCard.left, "reserve gaps do not move the fixed card");
  assert.equal(placed.layout.card.top, geometry.preferredCard.top, "reserve gaps do not move the fixed card");
  assert.equal((placed.layout.card.left + placed.layout.card.right) / 2, 220);

  const blocked = calculatePublicStageLayout(input({
    ...geometry,
    obstacles: [{ id: "seat-projection", rect: { left: 150, top: 260, right: 290, bottom: 410 } }],
  }));
  assert.equal(blocked.status, "placed", "passive Seat overlap cannot alter or suppress the canonical reveal");
  if (blocked.status === "placed") {
    assert.deepEqual(blocked.layout.card, placed.layout.card);
    assert.deepEqual(blocked.layout.protectedRects, []);
  }

  const invalid = calculatePublicStageLayout(input({ ...geometry, card: { width: 0, height: 370 } }));
  assert.equal(invalid.status, "unavailable", "invalid card dimensions still fail closed");
  if (invalid.status === "unavailable") assert.equal(invalid.reason, "INVALID_GEOMETRY");
});

test("fixed reveal keeps its canonical position through actual H4 and PAC overlap", () => {
  const frameGeometry = {
    viewport: { left: 0, top: 0, right: 390, bottom: 844 },
    table: { left: 0, top: 0, right: 390, bottom: 700 },
    activityBottom: 500,
    preferredCard: { left: 111, top: 250 },
    card: { width: 168, height: 194 },
    announcement: { width: 340, height: 64 },
    activity: { width: 340, height: 50 },
    fixedBands: {
      h4: h4Geometry(25, 100, 340, 100),
      pac: { left: 25, top: 405, right: 365, bottom: 500 },
    },
    obstacles: [],
  };
  const frame = calculatePublicStageLayout(input({
    ...frameGeometry,
    stationarySurface: "effect-frame",
  }));
  assert.equal(frame.status, "placed", "the canonical full-size Effect Frame may occupy unused H4/PAC reserves");
  if (frame.status === "placed") assert.deepEqual(frame.layout.card,
    { left: 111, top: 250, right: 279, bottom: 444 }, "soft gap preferences do not move or shrink the frame");

  const ordinary = calculatePublicStageLayout(input(frameGeometry));
  assert.equal(ordinary.status, "placed", "ordinary CardFaces also keep their canonical reveal position");

  const actualPacCollision = calculatePublicStageLayout(input({
    ...frameGeometry,
    obstacles: [{ id: "pac-paint", rect: { left: 100, top: 300, right: 290, bottom: 410 } }],
  }));
  assert.equal(actualPacCollision.status, "placed", "visible PAC is an independent foreground layer");
  if (actualPacCollision.status === "placed") assert.deepEqual(actualPacCollision.layout.card, frame.layout.card);

  const partialH4Overlay = calculatePublicStageLayout(input({
    ...frameGeometry,
    fixedBands: { ...frameGeometry.fixedBands,
      h4: { ...frameGeometry.fixedBands.h4, paint: { left: 100, top: 220, right: 280, bottom: 310 } } },
  }));
  assert.equal(partialH4Overlay.status, "placed", "H4 may cover part of a passive frame while preserving visible card area");

  const fullH4Occlusion = calculatePublicStageLayout(input({
    ...frameGeometry,
    fixedBands: { ...frameGeometry.fixedBands,
      h4: { ...frameGeometry.fixedBands.h4, paint: { left: 100, top: 240, right: 290, bottom: 450 } } },
  }));
  assert.equal(fullH4Occlusion.status, "placed", "H4 remains an independent foreground layer even when it covers the frame");
  if (fullH4Occlusion.status === "placed") assert.deepEqual(fullH4Occlusion.layout.card, frame.layout.card);

  const observedPhoneGeometry = calculatePublicStageLayout(input({
    ...frameGeometry,
    viewport: { left: 0, top: 0, right: 440, bottom: 766 },
    table: { left: 0, top: 0, right: 440, bottom: 630 },
    activityBottom: 479,
    preferredCard: { left: 118, top: 136 },
    card: { width: 204, height: 202 },
    fixedBands: {
      h4: h4Geometry(50, 150, 340, 52),
      pac: { left: 50, top: 435, right: 390, bottom: 479 },
    },
  }));
  assert.equal(observedPhoneGeometry.status, "placed", "the observed 23px PAC target mismatch and 74px card gap do not veto reveal");
  if (observedPhoneGeometry.status === "placed") assert.deepEqual(observedPhoneGeometry.layout.card,
    { left: 118, top: 136, right: 322, bottom: 338 });

  const ordinaryCardBoundary = calculatePublicStageLayout(input({
    ...frameGeometry,
    card: { width: 90, height: 135 },
    fixedBands: {
      ...frameGeometry.fixedBands,
      pac: { ...frameGeometry.fixedBands.pac, top: 350 },
    },
  }));
  assert.equal(ordinaryCardBoundary.status, "placed", "an empty PAC reserve does not displace the committed CardFace");
});

test("full Effect Frame top centers in nominal H4-to-PAC lane without using live copy height", () => {
  const h4Reserve = { left: 50, top: 150, right: 390, bottom: 216 };
  const pacReserve = { left: 50, top: 412, right: 390, bottom: 456 };
  assert.equal(publicStationaryLanePreferredTop(h4Reserve, pacReserve, 202), 213,
    "the observed stationary card is centered between fixed band edges");
  assert.equal(publicStationaryLanePreferredTop(h4Reserve, pacReserve, 202, 8), 221,
    "an existing approved effect offset remains unchanged");
  assert.equal(publicStationaryLanePreferredTop(h4Reserve, pacReserve, 220), 204,
    "a different full frame footprint changes only its centered top");
  assert.equal(publicStationaryLanePreferredTop(h4Reserve, pacReserve, 0), null);
  assert.equal(publicStationaryLanePreferredTop({ ...h4Reserve, bottom: Number.NaN }, pacReserve, 202), null);
});

test("the complete stationary footprint stays on one nominal centre across face and Frame sizes", () => {
  const h4Reserve = { left: 25, top: 120, right: 365, bottom: 184 };
  const pacReserve = { left: 25, top: 424, right: 365, bottom: 476 };
  const laneCenter = (h4Reserve.bottom + pacReserve.top) / 2;
  for (const height of [135, 156, 202, 236]) {
    assert.equal(publicStationaryLanePreferredTop(h4Reserve, pacReserve, height) + height / 2, laneCenter,
      `complete ${height}px footprint keeps the same centre`);
  }
  assert.equal(publicStationaryLanePreferredTop(h4Reserve, pacReserve, 202, 8) + 202 / 2, laneCenter + 8,
    "the existing explicit Frame offset applies to the complete footprint only");
});

test("production stationary callers seed from nominal table-local geometry and retire duplicate centre paths", () => {
  const display = readFileSync(new URL("../app/public-card-display.tsx", import.meta.url), "utf8");
  const context = readFileSync(new URL("../app/public-stage-layout-context.tsx", import.meta.url), "utf8");
  const page = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  const resultLayout = readFileSync(new URL("../app/public-result-layout.ts", import.meta.url), "utf8");
  const resultCallers = page.slice(page.indexOf("function publicResultNominalCenter"), page.indexOf("function PublicHandRevealCardTransition"));
  const stageLayout = readFileSync(new URL("../game/public-stage-layout.ts", import.meta.url), "utf8");
  assert.match(display, /publicStationaryCardPlacement\(table, size, coordinates/);
  assert.doesNotMatch(display, /requireProtectedClearance|respectFixedUpperH4|fixedPublicBands|centerRevealCardInSafeBattlefield|singleTargetBattlefieldRevealCard/);
  assert.match(context, /publicStationaryCardPlacement\(table, cardSize, tableCoordinates/);
  assert.match(context, /nominalPlacement\.tableLocalRect\.top/);
  assert.match(context, /const protectedGeometryElements = phase === "REVEAL"\s*\?\s*\[\]\s*:\s*\[\.\.\.document\.querySelectorAll/);
  assert.match(context, /obstacles: phase === "REVEAL" \? \[\] : obstacles/);
  assert.doesNotMatch(context, /compactWidth|compactAnnouncement/);
  assert.doesNotMatch(context, /localVisualPrimary|\?\? visualPrimary\.left|\?\? visualPrimary\.top/);
  assert.match(page, /publicResultNominalCenter\(table\)/);
  assert.match(page, /preferredCenter/);
  assert.doesNotMatch(page, /PUBLIC_RESULT_PROTECTED_SELECTORS|publicResultObstacles|PublicResultObstacle/);
  assert.doesNotMatch(resultCallers, /MutationObserver|obstacle|intersects|PublicResultObstacle/);
  assert.doesNotMatch(page, /requestedCardTop|plannedH4Bottom|publicRevealH4Route|public-hand-reveal-width|public-hand-reveal-height/);
  assert.doesNotMatch(resultLayout, /PublicResultObstacle|intersects|candidateScore|candidatePositions|bounds\.height\s*\*\s*\.48/);
  assert.doesNotMatch(stageLayout, /cardObstacles|compact-split|NO_SAFE_STACK/);
});

test("the upper-H4 fallback keeps the canonical Effect Frame position despite reserve overlap", () => {
  const result = calculatePublicStageLayout(input({
    viewport: { left: 0, top: 0, right: 390, bottom: 700 },
    table: { left: 0, top: 0, right: 390, bottom: 600 },
    activityBottom: 454,
    preferredCard: { left: 111, top: 250 },
    card: { width: 168, height: 194 },
    announcement: { width: 340, height: 64 },
    activity: { width: 340, height: 50 },
    upperH4: { ...h4Geometry(25, 100, 340, 100, 240), gap: 8 },
    stationarySurface: "effect-frame",
  }));
  assert.equal(result.status, "placed");
  if (result.status !== "placed") return;
  assert.equal(result.layout.card.top, 250);
  assert.equal(result.layout.card.bottom, 444);
  assert.ok(result.layout.activity.top < result.layout.card.bottom, "the fixed reveal can overlap the empty PAC reserve");
  assert.ok(result.layout.announcement.bottom > result.layout.card.top, "long upper H4 is permitted to cover the passive frame");
});

test("a parked effect card label remains eight pixels above its reserved PAC band", () => {
  const placement = positionLabeledCardAboveBand({
    centerX: 220,
    bandTop: 500,
    card: { width: 40, height: 60 },
    label: { left: -8, top: 56, right: 48, bottom: 70 },
    gap: 8,
  });
  assert.ok(placement);
  if (!placement) return;
  assert.equal(placement.card.left, 200);
  assert.equal(placement.card.top, 422);
  assert.equal(placement.footprint.left, 192);
  assert.equal(placement.footprint.right, 248);
  assert.equal(placement.footprint.bottom, 492);
  assert.equal(500 - placement.footprint.bottom, 8);
});

test("measured upper H4 remains fixed during move and parked phases", () => {
  const upperH4 = { ...h4Geometry(50, 150, 340, 71, 48), gap: 8 };
  const viewport = { left: 0, top: 0, right: 440, bottom: 766 };
  const table = { left: 0, top: 0, right: 440, bottom: 474 };
  const activity = { left: 50, top: 412, right: 390, bottom: 479 };
  const card = { left: 60, top: 100, right: 94, bottom: 150 };
  for (const phase of ["MOVE", "PARKED"]) {
    const result = calculatePublicStageLayout(input({ scene: { ...scene, phase }, viewport, table, activityBottom: 479,
      upperH4, announcement: { width: 340, height: 48 }, activity: { width: 340, height: 67 },
      phaseRects: { card, activity, announcement: { left: 50, top: 150, right: 390, bottom: 198 } } }));
    assert.equal(result.status, "placed");
    assert.equal(result.layout.announcement.top, 150);
    assert.deepEqual(result.layout.card, card);
  }
});

test("all proven passive CardFaces use the same nominal placement over Seat, choice, H4 and PAC overlays", () => {
  const overlays = [
    { id: "seat", rect: { left: 0, top: 0, right: 440, bottom: 180 } },
    { id: "choice-pool", rect: { left: 66, top: 237, right: 374, bottom: 365 } },
    { id: "active-inspector", rect: { left: 80, top: 240, right: 360, bottom: 380 } },
  ];
  const cards = [
    { scene: { ...scene, interactionId: "interaction-1", eventId: "root-event-1", cardId: "root-card" }, card: { width: 90, height: 135 } },
    { scene: { ...scene, interactionId: "interaction-1", eventId: "negation-event", cardId: "negation-card" }, card: { width: 90, height: 135 } },
    { scene: { ...scene, interactionId: "interaction-1", eventId: "frame-event", cardId: "frame-card" }, card: { width: 168, height: 194 }, stationarySurface: "effect-frame" },
  ];
  for (const { scene: cardScene, card, stationarySurface } of cards) {
    const baseline = calculatePublicStageLayout(input({ scene: cardScene, card, stationarySurface }));
    const overlapped = calculatePublicStageLayout(input({ scene: cardScene, card, stationarySurface, obstacles: overlays }));
    assert.equal(baseline.status, "placed");
    assert.equal(overlapped.status, "placed");
    if (baseline.status !== "placed" || overlapped.status !== "placed") continue;
    assert.deepEqual(overlapped.layout.card, baseline.layout.card);
    assert.deepEqual(overlapped.layout.protectedRects, []);
  }
});
