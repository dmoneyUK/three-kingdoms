import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildActiveSkillSubmission, buildDecisionPresentation, calculateHandCardStep, GameRoom, HERO_ART_BY_ID, HERO_SKILL_EFFECT_IDS, HERO_SKILL_RESPONSE_IDS, hpDisplay, HeroInfoDialog, HeroPortrait, HeroSelection, InteractionStage, MandatoryChoiceDialog, normalizeActiveCardSkillSelection, WaitingRoom } from "../app/page.tsx";
import { buildConsoleDecisionDisplay } from "../game/console-decision.ts";
import { IMPLEMENTED_STANDARD_HERO_IDS, STANDARD_HEROES } from "../game/heroes.ts";
import { buildPresentationClientView } from "../game/presentation-client.ts";
import { normalizeRoomData } from "../game/room-safety.js";

const card = (id, kind = "Attack") => ({ id, kind, suit: "♠", rank: "A" });
const gameRoomSource = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
const globalStyleSource = readFileSync(new URL("../app/globals.css", import.meta.url), "utf8");
const sequenceStyleSource = readFileSync(new URL("../app/sequence-overrides.css", import.meta.url), "utf8");

test("game messages start minimized while retaining the fold control", () => {
  assert.match(gameRoomSource, /const \[messagesCollapsed, setMessagesCollapsed\] = useState\(true\)/);
  assert.match(gameRoomSource, /aria-label=\{messagesCollapsed \? "Expand game messages" : "Collapse game messages"\}/);
});

const presentationPlayers = [
  { id: "p1", name: "Lü Bu", seat: 0 },
  { id: "p2", name: "Zhao Yun", seat: 1 },
];
const presentationRoom = (overrides = {}) => ({
  players: presentationPlayers, meId: "p1", turnSeat: 0, phase: "play", status: "playing",
  actionPlayerId: "p1", actionReason: "Play cards", isMyAction: true,
  currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards", legalActions: ["play_card"] },
  ...overrides,
});

const responsiveTopologyRoom = ({ playerCount = 4, handSize = 4 } = {}) => normalizeRoomData({
  code: `UI11-${playerCount}-${handSize}`,
  status: "playing",
  maxPlayers: playerCount,
  isHost: true,
  isTestController: true,
  meId: "p1",
  myRole: "Lord",
  myHeroOptions: [],
  players: ["cao-cao", "liu-bei", "zhang-fei", "sun-quan", "zhao-yun", "gan-ning", "huang-yueying", "xiahou-dun", "guo-jia", "zhuge-liang"].slice(0, playerCount).map((hero, index) => ({
    id: `p${index + 1}`,
    name: `Player ${index + 1} with a long name`,
    seat: index,
    hero,
    hp: 4,
    maxHp: 4,
    alive: true,
    connected: true,
    handCount: index === 0 ? handSize : 2,
    equipmentCards: [],
    judgementCards: [],
    attackRange: 1,
    distance: index === 0 ? null : 1,
    isHost: index === 0,
    role: index === 0 ? "Lord" : "Rebel",
  })),
  myHand: Array.from({ length: handSize }, (_, index) => card(`ui11-hand-${index + 1}`, "Attack")),
  turnSeat: 0,
  phase: "play",
  deckCount: 40,
  discardTop: null,
  log: [],
  timeline: [],
  isMyTurn: true,
  actionPlayerId: "p1",
  actionReason: "Play cards",
  isMyAction: true,
  currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards", legalActions: ["play_card"] },
});

test("shared decision presentation keeps turn ownership, action ownership, privacy, and revisions distinct", () => {
  const normal = buildDecisionPresentation(presentationRoom());
  assert.equal(normal.primaryStatus, "Lü Bu's turn");
  assert.equal(normal.supportingInstruction, "Play Phase");
  assert.equal(normal.isDecision, false);

  const otherTurn = buildDecisionPresentation(presentationRoom({ meId: "p2", isMyAction: false, actionPlayerId: "p1" }));
  assert.equal(otherTurn.primaryStatus, "Lü Bu's turn");
  assert.equal(otherTurn.isWaiting, false);

  const response = (actorId, isMyAction, revision = "r1") => buildDecisionPresentation(presentationRoom({ actionPlayerId: actorId, actionReason: "Respond to Attack: play Dodge or use an eligible Dodge alternative, or skip and take 1 damage", isMyAction, actionRevision: revision, currentAction: { version: 3, kind: "response", actorId, deadline: 0, reason: "Respond to Attack", legalActions: ["respond", "decline_response"], requirement: "dodge" } }));
  const ownResponse = response("p1", true);
  assert.deepEqual({ primary: ownResponse.primaryStatus, action: ownResponse.actionOwner, active: ownResponse.isViewerRequiredActor }, { primary: "Dodge the Attack", action: "Lü Bu", active: true });
  const waitingResponse = response("p2", false);
  assert.match(waitingResponse.primaryStatus, /^WAITING FOR ZHAO YUN$/);
  assert.equal(waitingResponse.isViewerRequiredActor, false);
  assert.notEqual(response("p1", true, "r2").supportingInstruction, undefined, "a new action revision still has one presentation model");

  const trigger = buildDecisionPresentation(presentationRoom({ phase: "response", actionReason: "Zhao Yun may use Cultivation, or skip", actionPlayerId: "p2", isMyAction: false, currentAction: { version: 3, kind: "trigger", actorId: "p2", deadline: 0, reason: "Zhao Yun may use Cultivation, or skip", legalActions: ["trigger", "decline_trigger"], triggerOptions: [{ effectId: "cultivation", label: "Cultivation" }] } }));
  assert.equal(trigger.primaryStatus, "WAITING FOR ZHAO YUN");
  assert.equal(trigger.actionOwner, "Zhao Yun");
  const rescue = buildDecisionPresentation(presentationRoom({ phase: "dying", actionReason: "Decide whether to give Peach to Lü Bu", currentAction: { version: 3, kind: "dying", actorId: "p1", deadline: 0, reason: "Decide whether to give Peach to Lü Bu", legalActions: ["give_peach", "skip_rescue"], requirement: "peach" } }));
  assert.equal(rescue.primaryStatus, "Play Peach");
  const negate = buildDecisionPresentation(presentationRoom({ phase: "response", actionReason: "Play Negation to cancel Harvest's effect, or pass", currentAction: { version: 3, kind: "response", actorId: "p1", deadline: 0, reason: "Play Negation to cancel Harvest's effect, or pass", legalActions: ["respond", "decline_response"], requirement: "negate" } }));
  assert.equal(negate.primaryStatus, "Play Negation");
  const target = buildDecisionPresentation(presentationRoom({ phase: "response", currentAction: { version: 3, kind: "target_card", actorId: "p1", deadline: 0, reason: "Choose 1 current card", legalActions: ["choose_target_card"] } }));
  assert.equal(target.primaryStatus, "Choose a target card");
  const resolving = buildDecisionPresentation(presentationRoom({ phase: "resolving", currentAction: { version: 3, kind: "none", actorId: null, deadline: 0, reason: "Applying the result", legalActions: [] } }));
  assert.equal(resolving.primaryStatus, "Resolving");
  assert.equal(resolving.isResolving, true);

  const uxRoom = normalizeRoomData({
    code: "UX1", status: "playing", maxPlayers: 2, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: presentationPlayers.map((player, index) => ({ ...player, hero: index ? "zhao-yun" : "lü-bu", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: index ? 1 : null, isHost: index === 0, role: index ? "Rebel" : "Lord" })),
    myHand: [], turnSeat: 0, phase: "play", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards", isMyAction: true,
    currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards", legalActions: ["play_card"] },
    presentationSnapshot: {
      identity: { interactionId: "interaction-ui", checkpointId: "checkpoint-ui", presentationRevision: 1 },
      stable: { kind: "CHOICE", interactionId: "interaction-ui", checkpointId: "checkpoint-ui", presentationRevision: 1, decisionActorId: "p1" },
      interaction: { semantics: "PROVEN", interactionId: "interaction-ui", rootFrameId: "root-ui", activeFrameId: "frame-ui", parentFrameId: null, checkpointId: "checkpoint-ui", presentationRevision: 1, stage: "ATTACK_RESPONSE", sourceId: "p2", effect: "Attack", targetIds: ["p1"], currentParticipantId: "p1", decisionActorId: "p1", activeResolverId: "p1", activeSourceId: "p2", activeTargetIds: ["p1"], participantIds: ["p1", "p2"], participantRoles: { sourceId: "p2", originalTargetIds: ["p1"], activeTargetIds: ["p1"], currentParticipantId: "p1", decisionActorId: "p1", activeResolverId: "p1", parentParticipantId: null, participantIds: ["p1", "p2"] }, continuity: { relation: "ROOT_FRAME", parentFrameId: null } },
      decision: { actorId: "p1", stage: "ATTACK_RESPONSE" },
      localControl: { source: "CurrentAction", actionRevision: "ui-action", kind: "turn", actorId: "p1", entitled: true },
      settlement: null,
      transitionEvents: [],
    },
  });
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room: uxRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((html.match(/class="decision-status/g) ?? []).length, 1, "one primary status area is rendered");
  assert.equal((html.match(/class="interaction-stage"/g) ?? []).length, 1, "one read-only Interaction Stage is rendered");
  assert.equal((html.match(/data-player-anchor="/g) ?? []).length, 2, "Interaction Stage insertion preserves both player anchors");
  assert.equal((html.match(/class="local-player-dock/g) ?? []).length, 1, "Interaction Stage insertion keeps one local dock");
  assert.equal((html.match(/data-console-surface="local-operation"/g) ?? []).length, 1, "Interaction Stage insertion keeps one footer console");
  assert.match(html, /INTERACTION STAGE/);
  assert.match(html, /Attack · Attack Response/);
  assert.match(html, /data-continuity="ROOT_FRAME"/);
  assert.match(html, /<small>DECISION<\/small><b>Lü Bu<\/b>/);
  assert.doesNotMatch(html, /<small>PROGRESS<\/small>|Target \d+ of \d+/, "Interaction Stage does not infer ordinal target progress");
  assert.doesNotMatch(html, />interaction-ui</, "causal IDs remain diagnostics in data attributes");
  assert.match(html, /data-presentation-kind="CHOICE"/);
  assert.match(html, /data-presentation-has-interaction="true"/);
  assert.match(html, /data-presentation-local-control="true"/);
  assert.match(html, /<section class="local-player-dock[^"]*interaction-seat-original-target[^"]*interaction-seat-active-target[^"]*interaction-seat-current-participant[^"]*interaction-seat-decision-actor[^"]*interaction-seat-active-resolver[^"]*interaction-seat-viewer-decision[^"]*"[^>]*data-player-anchor="p1"/, "local target-owned decision roles project onto the existing local dock");
  assert.match(html, /data-interaction-original-target="true"[^>]*data-interaction-active-target="true"[^>]*data-interaction-current-participant="true"[^>]*data-interaction-decision-actor="true"[^>]*data-interaction-active-resolver="true"[^>]*data-interaction-viewer-decision="true"/, "local dock exposes the same semantic role data");
  assert.doesNotMatch(html, /<section class="local-player-dock[^"]*selected-target/, "public active-target semantics do not mutate local gameplay selection");
  assert.match(html, /class="local-hand"[^>]*data-card-origin-anchor="p1"/);
  assert.match(html, /class="local-status-panel"[\s\S]*class="hero-skill-button/);
  assert.match(html, /class="local-equipment-panel"[\s\S]*class="local-equipment-slot/);
  const semanticSeatSnapshot = {
    ...uxRoom.presentationSnapshot,
    stable: { ...uxRoom.presentationSnapshot.stable, decisionActorId: "p2" },
    interaction: { ...uxRoom.presentationSnapshot.interaction, sourceId: "p2", targetIds: ["p2"], currentParticipantId: "p2", decisionActorId: "p2", activeResolverId: "p2", activeTargetIds: ["p2"], participantRoles: { ...uxRoom.presentationSnapshot.interaction.participantRoles, sourceId: "p2", originalTargetIds: ["p2"], activeTargetIds: ["p2"], currentParticipantId: "p2", decisionActorId: "p2", activeResolverId: "p2" } },
    decision: { actorId: "p2", stage: "ATTACK_RESPONSE" },
    localControl: { ...uxRoom.presentationSnapshot.localControl, actorId: "p2", entitled: false },
  };
  const semanticSeatHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: { ...uxRoom, presentationSnapshot: semanticSeatSnapshot }, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(semanticSeatHtml, /class="[^"]*player-square[^"]*interaction-seat-source[^"]*"[^>]*data-player-anchor="p2"/);
  assert.match(semanticSeatHtml, /class="[^"]*player-square[^"]*interaction-seat-original-target[^"]*"[^>]*data-player-anchor="p2"/);
  assert.match(semanticSeatHtml, /class="[^"]*player-square[^"]*interaction-seat-active-target[^"]*"[^>]*data-player-anchor="p2"/);
  assert.match(semanticSeatHtml, /class="[^"]*player-square[^"]*interaction-seat-current-participant[^"]*"[^>]*data-player-anchor="p2"/);
  assert.match(semanticSeatHtml, /class="[^"]*player-square[^"]*interaction-seat-decision-actor[^"]*"[^>]*data-player-anchor="p2"/);
  assert.match(semanticSeatHtml, /class="[^"]*player-square[^"]*interaction-seat-active-resolver[^"]*"[^>]*data-player-anchor="p2"/);
  assert.doesNotMatch(semanticSeatHtml, /class="[^"]*player-square[^"]*selected-target[^"]*"[^>]*data-player-anchor="p2"/, "semantic active-target highlighting does not select a gameplay target");
  assert.match(gameRoomSource, /isSelectedTarget \? "selected-target" : ""/);
  assert.match(gameRoomSource, /interactionRoles\.isActiveTarget \? "interaction-seat-active-target" : ""/);
  const localSourceOwnedSnapshot = {
    ...uxRoom.presentationSnapshot,
    stable: { ...uxRoom.presentationSnapshot.stable, decisionActorId: "p1" },
    interaction: { ...uxRoom.presentationSnapshot.interaction, sourceId: "p1", targetIds: ["p2"], currentParticipantId: "p2", decisionActorId: "p1", activeResolverId: "p2", activeTargetIds: ["p2"], participantRoles: { ...uxRoom.presentationSnapshot.interaction.participantRoles, sourceId: "p1", originalTargetIds: ["p2"], activeTargetIds: ["p2"], currentParticipantId: "p2", decisionActorId: "p1", activeResolverId: "p2" } },
    decision: { actorId: "p1", stage: "ATTACK_RESPONSE" },
    localControl: { ...uxRoom.presentationSnapshot.localControl, actorId: "p1", entitled: true },
  };
  const localSourceOwnedHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: { ...uxRoom, presentationSnapshot: localSourceOwnedSnapshot }, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(localSourceOwnedHtml, /<section class="local-player-dock[^"]*interaction-seat-source[^"]*interaction-seat-decision-actor[^"]*interaction-seat-viewer-decision[^"]*"[^>]*data-player-anchor="p1"/, "local source-owned decision preserves source, decision, and viewer roles");
  assert.match(localSourceOwnedHtml, /class="[^"]*player-square[^"]*interaction-seat-original-target[^"]*interaction-seat-active-target[^"]*interaction-seat-current-participant[^"]*interaction-seat-active-resolver[^"]*"[^>]*data-player-anchor="p2"/, "remote target keeps active target, participant, and resolver roles");
  const localSpecialSnapshot = {
    ...uxRoom.presentationSnapshot,
    stable: { ...uxRoom.presentationSnapshot.stable, kind: "SPECIAL", decisionActorId: null },
    interaction: { ...uxRoom.presentationSnapshot.interaction, currentParticipantId: "p1", decisionActorId: null, activeResolverId: "p2", activeTargetIds: ["p1"], participantRoles: { ...uxRoom.presentationSnapshot.interaction.participantRoles, currentParticipantId: "p1", decisionActorId: null, activeResolverId: "p2", activeTargetIds: ["p1"] } },
    decision: null,
    localControl: { ...uxRoom.presentationSnapshot.localControl, actorId: null, entitled: false },
  };
  const localSpecialHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: { ...uxRoom, presentationSnapshot: localSpecialSnapshot }, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(localSpecialHtml, /<section class="local-player-dock[^"]*interaction-seat-active-target[^"]*interaction-seat-current-participant[^"]*"[^>]*data-player-anchor="p1"/, "local active target/current roles remain public without a decision actor");
  assert.doesNotMatch(localSpecialHtml, /<section class="local-player-dock[^"]*interaction-seat-decision-actor/, "SPECIAL does not invent a local decision role");
  const localOverlapSnapshot = {
    ...uxRoom.presentationSnapshot,
    stable: { ...uxRoom.presentationSnapshot.stable, decisionActorId: "p1" },
    interaction: { ...uxRoom.presentationSnapshot.interaction, sourceId: "p1", targetIds: ["p1"], currentParticipantId: "p1", decisionActorId: "p1", activeResolverId: "p1", activeTargetIds: ["p1"], participantRoles: { ...uxRoom.presentationSnapshot.interaction.participantRoles, sourceId: "p1", originalTargetIds: ["p1"], activeTargetIds: ["p1"], currentParticipantId: "p1", decisionActorId: "p1", activeResolverId: "p1" } },
    decision: { actorId: "p1", stage: "ATTACK_RESPONSE" },
    localControl: { ...uxRoom.presentationSnapshot.localControl, actorId: "p1", entitled: true },
  };
  const localOverlapHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: { ...uxRoom, presentationSnapshot: localOverlapSnapshot }, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(localOverlapHtml, /<section class="local-player-dock[^"]*interaction-seat-source[^"]*interaction-seat-original-target[^"]*interaction-seat-active-target[^"]*interaction-seat-current-participant[^"]*interaction-seat-decision-actor[^"]*interaction-seat-active-resolver[^"]*interaction-seat-viewer-decision[^"]*"[^>]*data-player-anchor="p1"/, "local overlapping roles remain simultaneous");
  const legacyMismatchHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: { ...uxRoom, actionPlayerId: "p2", actionReason: "legacy owner", isMyAction: false, currentAction: { ...uxRoom.currentAction, actorId: "p2", reason: "legacy action" } }, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(legacyMismatchHtml, /<small>DECISION OWNER<\/small><b>Lü Bu · YOU<\/b>/, "active status ownership comes from PresentationClientView");
  assert.doesNotMatch(legacyMismatchHtml, /<small>DECISION OWNER<\/small><b>Zhao Yun/, "legacy action owner cannot replace the public decision actor");
  assert.match(html, /YOUR DECISION/);
  assert.match(html, /Lü Bu/);
  const sourceOwnedSnapshot = {
    ...uxRoom.presentationSnapshot,
    stable: { ...uxRoom.presentationSnapshot.stable, decisionActorId: "p2" },
    interaction: { ...uxRoom.presentationSnapshot.interaction, decisionActorId: "p2", activeResolverId: "p1", participantRoles: { ...uxRoom.presentationSnapshot.interaction.participantRoles, decisionActorId: "p2", activeResolverId: "p1" } },
    decision: { actorId: "p2", stage: "ATTACK_RESPONSE" },
    localControl: { ...uxRoom.presentationSnapshot.localControl, actorId: "p2", entitled: false },
  };
  const sourceOwnedStageHtml = renderToStaticMarkup(React.createElement(InteractionStage, { view: buildPresentationClientView(sourceOwnedSnapshot, "p1"), resolvePlayerName: (playerId) => presentationPlayers.find((player) => player.id === playerId)?.name ?? null }));
  assert.match(sourceOwnedStageHtml, /<small>DECISION<\/small><b>Zhao Yun<\/b>/, "source-owned decision stays on the source");
  assert.match(sourceOwnedStageHtml, /<small>RESOLVER<\/small><b>Lü Bu<\/b>/, "resolver remains distinct from decision owner");
  const childSnapshot = {
    ...uxRoom.presentationSnapshot,
    stable: { ...uxRoom.presentationSnapshot.stable, decisionActorId: "p1" },
    interaction: { ...uxRoom.presentationSnapshot.interaction, stage: "DAMAGE", parentFrameId: "parent-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "parent-frame" }, decisionActorId: "p1", activeResolverId: "p1", participantRoles: { ...uxRoom.presentationSnapshot.interaction.participantRoles, decisionActorId: "p1", activeResolverId: "p1" } },
    decision: { actorId: "p1", stage: "DAMAGE" },
  };
  const childStageHtml = renderToStaticMarkup(React.createElement(InteractionStage, { view: buildPresentationClientView(childSnapshot, "p1"), resolvePlayerName: (playerId) => presentationPlayers.find((player) => player.id === playerId)?.name ?? null }));
  assert.match(childStageHtml, /data-continuity="CHILD_FRAME"/);
  assert.match(childStageHtml, /parent frame parent-frame/);
  const restHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: { ...uxRoom, presentationSnapshot: null }, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((restHtml.match(/class="interaction-stage"/g) ?? []).length, 0, "REST renders no Interaction Stage");
  assert.equal((restHtml.match(/data-player-anchor="/g) ?? []).length, 2, "REST hides semantic focus without collapsing topology");
  assert.equal((restHtml.match(/class="local-player-dock/g) ?? []).length, 1, "REST retains one local dock");
  assert.match(restHtml, /<section class="local-player-dock\s*"[^>]*data-player-anchor="p1"/, "REST retains the local player surface");
  assert.doesNotMatch(restHtml, /<section class="local-player-dock[^"]*interaction-seat-/, "REST local surface has no semantic role classes");
  assert.doesNotMatch(restHtml, /data-interaction-(?:roles|source|original-target|active-target|current-participant|decision-actor|active-resolver|viewer-decision)=/, "REST local surface has no semantic role data");
  const localDock = (markup) => markup.match(/<section class="local-player-dock[^>]*data-player-anchor="p1"[^>]*>/)?.[0] ?? "";
  assert.equal(localDock(legacyMismatchHtml), localDock(html), "legacy room fields cannot change local semantic roles");
});

test("local operation console composes one authority-first decision display", () => {
  const display = (facts) => buildConsoleDecisionDisplay({ instruction: "Make the current choice", viewerIsDecisionActor: true, authoritativeDecision: true, busy: false, ...facts });
  assert.equal(display({ kind: "turn", primaryCandidates: [{ id: "play", label: "Play", enabled: true, priority: 40 }] }).primary.label, "Play");
  assert.equal(display({ kind: "response", primaryCandidates: [{ id: "confirm", label: "Confirm", enabled: true, priority: 60 }], authoritativeDecline: { label: "Skip", enabled: true } }).authoritativeDecline.label, "Skip");
  assert.equal(display({ kind: "rescue", primaryCandidates: [{ id: "peach", label: "Peach", enabled: false, priority: 60 }], authoritativeDecline: { label: "Skip", enabled: true } }).primary.enabled, false);
  assert.equal(display({ kind: "trigger", primaryCandidates: [{ id: "provider-confirm", label: "Confirm", enabled: true, priority: 70 }], localCancel: { visible: true, enabled: true }, authoritativeDecline: { label: "Skip", enabled: true } }).localCancel.visible, true);
  assert.equal(display({ kind: "active-skill", primaryCandidates: [{ id: "skill-confirm", label: "Confirm", enabled: true, priority: 70 }] }).primary.id, "skill-confirm");
  assert.equal(display({ kind: "target", selection: { active: true, hasInput: true, count: 1, min: 1, max: 1, summary: "1 target selected" }, primaryCandidates: [{ id: "target-confirm", label: "Confirm", enabled: true, priority: 70 }] }).selectionCount, 1);
  assert.equal(display({ kind: "borrowed-sword", primaryCandidates: [{ id: "borrowed-confirm", label: "Confirm", enabled: true, priority: 80 }] }).primary.label, "Confirm");
  assert.equal(display({ kind: "target-card", primaryCandidates: [{ id: "card-confirm", label: "Discard selected", enabled: true, priority: 80 }] }).primary.label, "Discard selected");
  assert.equal(display({ kind: "discard", primaryCandidates: [{ id: "discard", label: "Discard 2 selected", enabled: true, priority: 60 }] }).primary.label, "Discard 2 selected");
  assert.equal(display({ kind: "duel", primaryCandidates: [{ id: "duel-response", label: "Confirm", enabled: true, priority: 60 }] }).primary.label, "Confirm");
  assert.equal(display({ kind: "judgement", primaryCandidates: [{ id: "negate", label: "Confirm", enabled: true, priority: 60 }] }).primary.label, "Confirm");

  const waiting = buildConsoleDecisionDisplay({ kind: "response", instruction: "Waiting for the other seat", viewerIsDecisionActor: false, authoritativeDecision: true, busy: false, primaryCandidates: [{ id: "stale", label: "Confirm", enabled: true, priority: 100 }], authoritativeDecline: { label: "Skip", enabled: true } });
  assert.equal(waiting.primary, null, "a public or stale role cannot grant a local primary");
  assert.equal(waiting.authoritativeDecline, null, "a public or stale role cannot grant Skip");

  const contradiction = display({ kind: "special", primaryCandidates: [{ id: "play", label: "Play", enabled: true, priority: 50 }, { id: "confirm", label: "Confirm", enabled: true, priority: 50 }] });
  assert.equal(contradiction.coherent, false, "unresolved equal-priority legacy primaries fail closed");
  assert.equal(contradiction.primary, null);
  assert.equal(display({ kind: "trigger", busy: true, primaryCandidates: [{ id: "confirm", label: "Confirm", enabled: true, priority: 70 }] }).primary.enabled, false);
  const sourceOwned = display({ kind: "special", primaryCandidates: [{ id: "source-trigger", label: "Confirm", enabled: true, priority: 70 }], secondaryControls: ["Provider"] });
  assert.deepEqual(sourceOwned.secondaryControls, ["Provider"], "decision actor and active resolver remain composition facts, not legality inputs");
  const localSelection = display({ kind: "target", selection: { active: true, hasInput: false, count: 0, min: 1, max: 1, summary: "Select 1 target" }, primaryCandidates: [{ id: "confirm", label: "Confirm", enabled: false, priority: 70 }] });
  assert.equal(localSelection.selectionSummary, "Select 1 target");
  assert.equal(localSelection.localCancel.visible, false, "unsubmitted local selection has no Cancel");
  const rest = buildConsoleDecisionDisplay({ kind: "rest", instruction: "No interaction", viewerIsDecisionActor: false, authoritativeDecision: false, busy: false });
  assert.equal(rest.controlsVisible, false);
  assert.equal(rest.primary, null);
});

test("Legacy distribution keeps private cards static and labels recipients by hero", () => {
  assert.match(gameRoomSource, /function PrivateCardDistributionDialog[\s\S]*Choose a hero[\s\S]*players\.map\(\(player\) => <option value=\{player\.id\} key=\{player\.id\}>\{heroName\(player\.hero\)\}<\/option>/);
  assert.match(gameRoomSource, /<div className="legacy-distribution-card"[\s\S]*<CardFace card=\{card\} \/>/, "Legacy uses the real CardFace artwork");
  assert.match(globalStyleSource, /\.legacy-distribution-card \.played-card\{animation:none;opacity:1;transform:none\}/, "Legacy cards do not use the temporary fade/flight animation");
  assert.doesNotMatch(gameRoomSource, /<option value=\{player\.id\} key=\{player\.id\}>\{player\.name\}<\/option>/, "Legacy does not expose player names in recipient choices");
});

test("Hero Focus renders the accepted public participant without becoming a control surface", () => {
  const createSnapshot = (sceneOverrides = {}, stableOverrides = {}, decisionActorId = "B") => {
    const interaction = {
      semantics: "PROVEN", interactionId: "focus-interaction", rootFrameId: "focus-root", activeFrameId: "focus-frame", parentFrameId: null,
      checkpointId: "focus-checkpoint", presentationRevision: 2, stage: "ATTACK_RESPONSE", effect: "Attack", sourceId: "A", targetIds: ["B"],
      currentParticipantId: "B", decisionActorId, activeResolverId: "A", activeSourceId: "A", activeTargetIds: ["B"], participantIds: ["A", "B"],
      participantRoles: { sourceId: "A", originalTargetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "B", decisionActorId, activeResolverId: "A", parentParticipantId: null, participantIds: ["A", "B"] },
      continuity: { relation: "ROOT_FRAME", parentFrameId: null }, ...sceneOverrides,
    };
    return {
      identity: { interactionId: "focus-interaction", checkpointId: "focus-checkpoint", presentationRevision: 2 },
      stable: { kind: "CHOICE", interactionId: "focus-interaction", checkpointId: "focus-checkpoint", presentationRevision: 2, decisionActorId, ...stableOverrides },
      interaction,
      decision: decisionActorId ? { actorId: decisionActorId, stage: interaction.stage } : null,
      localControl: { source: "CurrentAction", actionRevision: "focus-action", kind: "response", actorId: decisionActorId, entitled: true },
      settlement: null, transitionEvents: [],
    };
  };
  const players = {
    A: { name: "Ma Chao", heroId: "ma-chao", heroName: "Ma Chao", hp: 4, maxHp: 4 },
    B: { name: "Zhao Yun", heroId: "zhao-yun", heroName: "Zhao Yun", hp: 3, maxHp: 4 },
    C: { name: "Cao Cao", heroId: "cao-cao", heroName: "Cao Cao", hp: 4, maxHp: 4 },
  };
  const resolveName = (id) => players[id]?.name ?? null;
  const resolveDisplay = (id) => players[id] ?? null;
  const renderStage = (snapshot, viewerId = "B", displayResolver = resolveDisplay) => renderToStaticMarkup(React.createElement(InteractionStage, {
    view: buildPresentationClientView(snapshot, viewerId),
    resolvePlayerName: resolveName,
    resolvePlayerDisplay: displayResolver,
  }));

  const ordinaryHtml = renderStage(createSnapshot());
  assert.match(ordinaryHtml, /class="hero-focus"[^>]*data-hero-focus-player-id="B"[^>]*data-hero-focus-role="CURRENT PARTICIPANT"/);
  assert.match(ordinaryHtml, /class="hero-focus-identity"[^>]*><b>Zhao Yun<\/b><span>Zhao Yun<\/span><small>HP 3\/4<\/small>/);
  assert.match(ordinaryHtml, /class="hero-focus-portrait"[^>]*data-hero-id="zhao-yun"/);
  assert.doesNotMatch(ordinaryHtml, /button|data-hand|data-card|legalActions|providers/i, "Hero Focus renders no controls or private card data");

  const sourceOwnedHtml = renderStage(createSnapshot({ currentParticipantId: "B", decisionActorId: "A", activeResolverId: "B", participantRoles: { sourceId: "A", originalTargetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "B", decisionActorId: "A", activeResolverId: "B", parentParticipantId: null, participantIds: ["A", "B"] } }, { decisionActorId: "A" }, "A"), "A");
  assert.match(sourceOwnedHtml, /data-hero-focus-player-id="B"/);
  assert.match(sourceOwnedHtml, /data-hero-focus-source-id="A"/);
  assert.match(sourceOwnedHtml, /<small>DECISION<\/small><b>Ma Chao<\/b>/);
  assert.doesNotMatch(sourceOwnedHtml, /class="hero-focus"[^>]*data-hero-focus-player-id="A"/, "source-owned decision does not move Hero Focus to the decision source");

  const groupHtml = renderStage(createSnapshot({ stage: "GROUP_RESOLUTION", targetIds: ["B", "C"], activeTargetIds: ["B", "C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", participantIds: ["A", "B", "C"], participantRoles: { sourceId: "A", originalTargetIds: ["B", "C"], activeTargetIds: ["B", "C"], currentParticipantId: "C", decisionActorId: "C", activeResolverId: "C", parentParticipantId: null, participantIds: ["A", "B", "C"] } }, { decisionActorId: "C" }, "C"));
  assert.match(groupHtml, /data-hero-focus-player-id="C"[^>]*data-hero-focus-role="CURRENT PARTICIPANT"/);

  const ambiguousHtml = renderStage(createSnapshot({ targetIds: ["B", "C"], activeTargetIds: ["B", "C"], currentParticipantId: null, decisionActorId: "A", activeResolverId: "A", participantIds: ["A", "B", "C"], participantRoles: { sourceId: "A", originalTargetIds: ["B", "C"], activeTargetIds: ["B", "C"], currentParticipantId: null, decisionActorId: "A", activeResolverId: "A", parentParticipantId: null, participantIds: ["A", "B", "C"] } }, { decisionActorId: "A" }, "A"));
  assert.doesNotMatch(ambiguousHtml, /data-hero-focus="true"/, "ambiguous multi-target state has no guessed Hero Focus");

  const soleTargetHtml = renderStage(createSnapshot({ targetIds: ["C"], activeTargetIds: ["C"], currentParticipantId: null, decisionActorId: "A", activeResolverId: "A", participantIds: ["A", "C"], participantRoles: { sourceId: "A", originalTargetIds: ["C"], activeTargetIds: ["C"], currentParticipantId: null, decisionActorId: "A", activeResolverId: "A", parentParticipantId: null, participantIds: ["A", "C"] } }, { decisionActorId: "A" }, "A"));
  assert.match(soleTargetHtml, /data-hero-focus-player-id="C"[^>]*data-hero-focus-role="CURRENT TARGET"/);

  const childHtml = renderStage(createSnapshot({ stage: "DAMAGE", parentFrameId: "group-frame", continuity: { relation: "CHILD_FRAME", parentFrameId: "group-frame" }, decisionActorId: "B", activeResolverId: "B", participantRoles: { sourceId: "A", originalTargetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B", parentParticipantId: null, participantIds: ["A", "B"] } }, {}, "B"));
  assert.match(childHtml, /data-hero-focus-player-id="B"/);
  assert.match(childHtml, /class="hero-focus-context">Nested effect · parent frame group-frame<\/small>/);

  const dyingHtml = renderStage(createSnapshot({ stage: "DYING", currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B", participantRoles: { sourceId: "A", originalTargetIds: ["B"], activeTargetIds: ["B"], currentParticipantId: "B", decisionActorId: "B", activeResolverId: "B", parentParticipantId: null, participantIds: ["A", "B"] } }, {}, "B"));
  assert.match(dyingHtml, /data-hero-focus-player-id="B"[^>]*data-hero-focus-role="DYING PLAYER"/);
  assert.match(dyingHtml, /data-dying-handoff="proven"[^>]*data-dying-player-id="B"[^>]*data-dying-decision-actor-id="B"/);
  assert.match(dyingHtml, /DYING \/ RESCUE/);
  assert.match(dyingHtml, /Dying · Rescue/);

  const uninvolvedHtml = renderStage(createSnapshot(), "C");
  assert.match(uninvolvedHtml, /data-hero-focus-player-id="B"[^>]*data-hero-focus-role="CURRENT PARTICIPANT"/);
  assert.match(ordinaryHtml, /YOUR DECISION/);
  assert.doesNotMatch(uninvolvedHtml, /YOUR DECISION/);

  const missingHtml = renderStage(createSnapshot({ currentParticipantId: "missing", targetIds: ["missing"], activeTargetIds: ["missing"], decisionActorId: "missing", participantRoles: { sourceId: "A", originalTargetIds: ["missing"], activeTargetIds: ["missing"], currentParticipantId: "missing", decisionActorId: "missing", activeResolverId: "A", parentParticipantId: null, participantIds: ["A", "missing"] } }, { decisionActorId: "missing" }, "missing"), "missing", () => null);
  assert.match(missingHtml, /data-hero-focus-player-id="missing"/);
  assert.match(missingHtml, /<div class="hero-focus-identity"><b>Unknown participant<\/b>/);
  assert.doesNotMatch(missingHtml, /data-hero-id="undefined"/);
  const longNameHtml = renderStage(createSnapshot(), "B", (id) => id === "B" ? { ...players.B, name: "A deliberately long public player name for containment" } : resolveDisplay(id));
  assert.match(longNameHtml, /A deliberately long public player name for containment/);

  const restHtml = renderStage({ identity: null, interaction: null, decision: null, stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null }, localControl: null, settlement: null, transitionEvents: [] });
  assert.equal(restHtml, "", "REST hides Interaction Stage and Hero Focus");
  assert.match(globalStyleSource, /\.hero-focus\{/);
  assert.match(globalStyleSource, /@media\(max-width:650px\)[^\n]*\.hero-focus/);
  assert.match(globalStyleSource, /@media\(max-width:480px\)[^\n]*\.hero-focus/);
  assert.match(globalStyleSource, /\.dying-handoff\{/);
  assert.doesNotMatch(globalStyleSource, /(?:^|})\.hero-focus\{[^}]*animation/, "Hero Focus animation remains scoped to an accepted transition marker");
});

test("UI-18 consumes semantic transition kinds without changing topology or authority", () => {
  const snapshot = {
    identity: { interactionId: "visual-interaction", checkpointId: "visual-checkpoint", presentationRevision: 4 },
    stable: { kind: "CHOICE", interactionId: "visual-interaction", checkpointId: "visual-checkpoint", presentationRevision: 4, decisionActorId: "p1" },
    interaction: {
      semantics: "PROVEN", interactionId: "visual-interaction", rootFrameId: "visual-root", activeFrameId: "visual-frame", parentFrameId: null,
      checkpointId: "visual-checkpoint", presentationRevision: 4, stage: "ATTACK_RESPONSE", sourceId: "p2", effect: "Attack", targetIds: ["p1"],
      currentParticipantId: "p1", decisionActorId: "p1", activeResolverId: "p1", activeSourceId: "p2", activeTargetIds: ["p1"], participantIds: ["p1", "p2"],
      participantRoles: { sourceId: "p2", originalTargetIds: ["p1"], activeTargetIds: ["p1"], currentParticipantId: "p1", decisionActorId: "p1", activeResolverId: "p1", parentParticipantId: null, participantIds: ["p1", "p2"] },
      continuity: { relation: "ROOT_FRAME", parentFrameId: null },
    },
    decision: { actorId: "p1", stage: "ATTACK_RESPONSE" },
    localControl: { source: "CurrentAction", actionRevision: "visual-action", kind: "response", actorId: "p1", entitled: true },
    settlement: null,
    transitionEvents: [],
  };
  const players = { p1: "Lü Bu", p2: "Zhao Yun" };
  const renderStage = (transitionKind, viewerId = "p1") => renderToStaticMarkup(React.createElement(InteractionStage, {
    view: buildPresentationClientView(snapshot, viewerId),
    transitionKind,
    resolvePlayerName: (playerId) => players[playerId] ?? null,
    resolvePlayerDisplay: (playerId) => ({ name: players[playerId] ?? "Unknown participant", heroId: playerId === "p1" ? "lü-bu" : "zhao-yun", heroName: players[playerId], hp: 4, maxHp: 4 }),
  }));

  const transitionKinds = ["NONE", "CONTENT_UPDATE", "FOCUS_UPDATE", "FRAME_TRANSITION", "INTERACTION_TRANSITION"];
  for (const transitionKind of transitionKinds) {
    const html = renderStage(transitionKind);
    assert.match(html, new RegExp(`data-presentation-transition="${transitionKind}"`), `${transitionKind} keeps the accepted semantic marker`);
    assert.doesNotMatch(html, /<button|aria-disabled|pointer-events/i, `${transitionKind} does not add a control surface`);
  }

  const noneHtml = renderStage("NONE");
  assert.doesNotMatch(noneHtml, /presentation-(?:content|focus|frame|interaction)|animation/i, "NONE has no visual replay marker or animation state");
  assert.equal(renderStage("NONE"), noneHtml, "repeated NONE remains stable and does not replay");
  assert.equal(
    renderStage("INTERACTION_TRANSITION").match(/data-presentation-transition="[^"]+"/)?.[0],
    renderStage("INTERACTION_TRANSITION", "p2").match(/data-presentation-transition="[^"]+"/)?.[0],
    "the public semantic marker is viewer-equal",
  );

  assert.match(globalStyleSource, /\.interaction-stage\[data-presentation-transition="CONTENT_UPDATE"\]\{animation:presentationContentRefresh 180ms/);
  assert.match(globalStyleSource, /\.interaction-stage\[data-presentation-transition="FOCUS_UPDATE"\]\{animation:presentationFocusEmphasis 240ms/);
  assert.match(globalStyleSource, /\.interaction-stage\[data-presentation-transition="FOCUS_UPDATE"\] \.hero-focus\{animation:presentationFocusPanelEmphasis 240ms/);
  assert.match(globalStyleSource, /\.interaction-stage\[data-presentation-transition="FRAME_TRANSITION"\]\{animation:presentationFrameEmphasis 280ms/);
  assert.match(globalStyleSource, /\.interaction-stage\[data-presentation-transition="INTERACTION_TRANSITION"\]\{animation:presentationInteractionEmphasis 320ms/);
  assert.match(globalStyleSource, /@media\(prefers-reduced-motion:reduce\)[\s\S]*animation:none!important/);
  const ui18Styles = globalStyleSource.match(/\/\* UI-18:[\s\S]*?\/\* UI-05:/)?.[0] ?? "";
  assert.doesNotMatch(ui18Styles, /player-square|local-player-dock|transform|opacity|pointer-events|position|translate/);
  assert.match(ui18Styles, /@keyframes presentation(?:ContentRefresh|FocusEmphasis|FocusPanelEmphasis|FrameEmphasis|InteractionEmphasis)/);
});

test("waiting room starts without lobby readiness controls", () => {
  const room = normalizeRoomData({
    code: "WAIT1", status: "lobby", maxPlayers: 4, isHost: true, meId: "p1", players: [
      { id: "p1", name: "HOST", seat: 0, isHost: true, ready: false },
      { id: "p2", name: "ALICE", seat: 1, isHost: false, ready: false },
      { id: "p3", name: "BOB", seat: 2, isHost: false, ready: false },
      { id: "p4", name: "CAROL", seat: 3, isHost: false, ready: false },
    ],
  });
  const html = renderToStaticMarkup(React.createElement(WaitingRoom, { room, busy: false, error: "", onStart: () => {}, onAddTestPlayers: () => {}, onLeave: () => {} }));
  assert.match(html, />Start game<\/button>/);
  assert.doesNotMatch(html, />Ready<\/button>/);
  assert.doesNotMatch(html, /NOT READY|ready<\/span>|everybody is ready/i);
  assert.doesNotMatch(gameRoomSource, /set_ready/);
});

test("hero selection shows the effective viewer's private role", () => {
  const room = {
    code: "ROLE1", isTestController: true, meId: "p2", myRole: "Rebel", myHeroOptions: STANDARD_HEROES.slice(0, 3),
    players: [{ id: "p1", name: "PLAYER 1", hero: null, generalReady: false }, { id: "p2", name: "PLAYER 2", hero: null, generalReady: false }],
    isMyAction: true, actionPlayerId: "p2",
  };
  const html = renderToStaticMarkup(React.createElement(HeroSelection, { room, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
  assert.match(html, /YOUR SECRET ROLE/);
  assert.match(html, />Rebel<\/strong>/);
  assert.match(html, /aria-label="Your secret role is Rebel"/);
  assert.equal((html.match(/class="hero-choice-wrap/g) ?? []).length, 3, "each private candidate has a card wrapper");
  assert.equal((html.match(/class="hero-info-button"/g) ?? []).length, 3, "each private candidate has an information control");
  assert.match(html, /aria-label="View Cao Cao information"/);
  assert.match(html, /data-hero-art-id="cao-cao"/);
  assert.match(html, /data-hero-art-id="simayi"/);
  assert.match(html, /data-hero-art-id="xiahou-dun"/);
  for (const asset of ["hero-cao-cao.jpg", "hero-liu-bei.jpg", "hero-sun-quan.jpg", "hero-sima-yi.jpg", "hero-xiahou-dun.jpg", "hero-zhang-liao.avif", "hero-zhang-liao.jpg", "hero-zhang-fei.jpg", "hero-zhen-ji.jpg", "hero-xu-chu.jpg", "hero-guo-jia.jpg", "hero-yue-jin.jpg", "hero-ma-chao.jpg", "hero-daqiao.jpg", "hero-zhuge-liang.jpg", "hero-zhao-yun.jpg", "hero-guan-yu.jpg", "hero-gan-ning.jpg", "hero-huang-gai.jpg", "hero-lv-meng.jpg", "hero-lady-gan.jpg", "hero-huang-yueying.jpg", "hero-zhou-yu.jpg", "hero-diao-chan.jpg", "hero-lv-bu.jpg", "hero-hua-tuo.jpg", "hero-sun-shangxiang.jpg", "hero-lu-xun.jpg", "hero-pan-feng.jpg", "hero-hua-xiong.jpg"]) {
    assert.ok(existsSync(new URL(`../public/${asset}`, import.meta.url)), `${asset} is checked in`);
  }
  assert.match(gameRoomSource, /const \[infoHero, setInfoHero\] = useState<Hero \| null>\(null\)/);
  assert.match(gameRoomSource, /className=\{`hero-choice-wrap \$\{effectiveSelected === hero\.id \? "selected" : ""\}`\}/);
  assert.match(gameRoomSource, /onClick=\{\(\) => setInfoHero\(hero\)\}/);
  assert.match(gameRoomSource, /\{infoHero && <HeroInfoDialog hero=\{infoHero\}/);
  const artHeroes = ["cao-cao", "liu-bei", "sun-quan", "simayi", "xiahou-dun"].map((id) => STANDARD_HEROES.find((hero) => hero.id === id));
  assert.ok(artHeroes.every(Boolean));
  const zhangLiao = STANDARD_HEROES.find((hero) => hero.id === "zhang-liao");
  const zhouYu = STANDARD_HEROES.find((hero) => hero.id === "zhou-yu");
  assert.ok(zhangLiao && zhouYu);
  const zhangLiaoHtml = renderToStaticMarkup(React.createElement(HeroSelection, { room: { ...room, myHeroOptions: [zhangLiao] }, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
  const zhouYuHtml = renderToStaticMarkup(React.createElement(HeroSelection, { room: { ...room, myHeroOptions: [zhouYu] }, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
  assert.match(gameRoomSource, /"zhang-liao": "\/hero-zhang-liao\.jpg"/);
  assert.match(zhangLiaoHtml, /data-hero-art-id="zhang-liao"/);
  const zhangFei = STANDARD_HEROES.find((hero) => hero.id === "zhang-fei");
  const zhenJi = STANDARD_HEROES.find((hero) => hero.id === "zhen-ji");
  assert.ok(zhangFei && zhenJi);
  const zhangFeiHtml = renderToStaticMarkup(React.createElement(HeroSelection, { room: { ...room, myHeroOptions: [zhangFei] }, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
  const zhenJiHtml = renderToStaticMarkup(React.createElement(HeroSelection, { room: { ...room, myHeroOptions: [zhenJi] }, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
  assert.match(zhangFeiHtml, /data-hero-art-id="zhang-fei"/);
  assert.match(zhenJiHtml, /data-hero-art-id="zhen-ji"/);
  assert.match(zhouYuHtml, /class="hero-art-image" data-hero-art-id="zhou-yu" src="\/hero-zhou-yu\.jpg"/, "Zhou Yu uses the supplied portrait");
  const lordHtml = renderToStaticMarkup(React.createElement(HeroSelection, { room: { ...room, myRole: "Lord", myHeroOptions: artHeroes }, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
  assert.match(lordHtml, /class="hero-choice-grid hero-choice-grid-5"/);
  assert.equal((lordHtml.match(/class="hero-choice-wrap/g) ?? []).length, 5, "Lord receives five portrait candidate cards");
  for (const id of ["cao-cao", "liu-bei", "sun-quan", "simayi", "xiahou-dun"]) assert.match(lordHtml, new RegExp(`data-hero-art-id="${id}"`));
  assert.match(globalStyleSource, /\.hero-monogram > \.hero-art-image\s*\{[^}]*position: absolute;[^}]*inset: 0;/, "selection artwork fills the portrait container");
  assert.match(globalStyleSource, /@media \(max-width: 520px\)[\s\S]*?\.hero-choice-grid,[\s\S]*?grid-template-columns: repeat\(6, minmax\(0, 1fr\)\)/, "mobile hero selection keeps three card tracks");
  assert.match(globalStyleSource, /\.hero-choice-grid-5 > \.hero-choice-wrap:nth-child\(4\)\s*\{\s*grid-column: 2 \/ span 2;/, "Lord's fourth card starts the centred second row");
  assert.match(globalStyleSource, /\.hero-choice-grid-5 > \.hero-choice-wrap:nth-child\(5\)\s*\{\s*grid-column: 4 \/ span 2;/, "Lord's fifth card completes the centred second row");
  assert.match(globalStyleSource, /@media \(max-width: 900px\)[\s\S]*?\.hero-choice-wrap\s*\{\s*grid-column: span 2;\s*aspect-ratio: 2 \/ 3;\s*min-height: clamp\(184px, 48\.5vw, 210px\)/, "tablet hero cards use a compact portrait proportion with content-safe height");
  assert.match(globalStyleSource, /@media \(max-width: 900px\)[\s\S]*?\.hero-choice\s*\{\s*display: grid;\s*grid-template-rows: minmax\(clamp\(108px, 29vw, 124px\), 1fr\) auto auto auto;\s*align-content: start;\s*align-items: stretch;/, "hero card layout gives the portrait a growing track before compact metadata");
  assert.match(globalStyleSource, /\.hero-choice-grid,[\s\S]*?width: min\(100%, 392px\)/, "mobile hero grid uses the available viewport width");
  assert.match(globalStyleSource, /@media \(max-width: 520px\)[\s\S]*?\.hero-choice-wrap\s*\{\s*aspect-ratio: 2 \/ 3;/, "mobile hero cards use the normal portrait proportion");
  assert.match(globalStyleSource, /@media \(max-width: 520px\)[\s\S]*?\.hero-monogram\s*\{\s*flex: none;\s*height: auto;\s*margin: 14px 0 3px;/, "mobile hero artwork participates in the content-first card layout");
  assert.match(globalStyleSource, /@media \(max-width: 520px\)[\s\S]*?\.hero-confirm\s*\{\s*width: min\(100%, 392px\);\s*max-width: none;/, "mobile confirmation aligns with the hero grid");
  assert.match(globalStyleSource, /@media \(max-width: 900px\)[\s\S]*?\.hero-confirm\s*\{\s*width: min\(100%, 440px\);\s*max-width: none;/, "tablet confirmation aligns with the tablet hero grid");
  assert.doesNotMatch(globalStyleSource, /@media \(max-width: 520px\)[\s\S]*?\.hero-monogram\s*\{[^}]*height: 54px;/, "mobile hero artwork has no 54px bottleneck");
  assert.match(globalStyleSource, /\.hero-choice \.hero-monogram > \.hero-art-image\s*\{[^}]*object-fit: cover;[^}]*object-position: center top;/, "selection artwork uses selection-scoped cover framing");
  assert.doesNotMatch(globalStyleSource, /\.hero-choice \.hero-monogram > \.hero-art-image\s*\{[^}]*object-fit: contain;/, "selection artwork does not retain the side-bar framing");
  assert.doesNotMatch(globalStyleSource, /\.hero-choice i\s*\{[^}]*margin-top: auto;/, "selection state follows skills without an empty flex tail");
  assert.match(globalStyleSource, /\.hero-shell\s*\{\s*min-height: 100dvh;/, "selection page uses the dynamic mobile viewport height");
  assert.match(lordHtml, /class="hero-choice [^"]*"[\s\S]*?<\/button><button type="button" class="hero-info-button"/, "information controls remain sibling buttons rather than nested controls");
  assert.doesNotMatch(globalStyleSource, /\.hero-choice-grid\s*\{\s*grid-template-columns: repeat\(2/, "mobile hero selection does not regress to two flexible columns");
});

test("every implemented Standard hero is audited through the shared portrait renderer", () => {
  const implementedIds = [...IMPLEMENTED_STANDARD_HERO_IDS];
  const mappedIds = Object.keys(HERO_ART_BY_ID);
  const standardIds = new Set(STANDARD_HEROES.map((hero) => hero.id));
  const expectedNewArtwork = {
    "zhuge-liang": "/hero-zhuge-liang.jpg",
    "zhang-liao": "/hero-zhang-liao.jpg",
    "xiahou-dun": "/hero-xiahou-dun.jpg",
    "xu-chu": "/hero-xu-chu.jpg",
    "guo-jia": "/hero-guo-jia.jpg",
    "zhen-ji": "/hero-zhen-ji.jpg",
    "yue-jin": "/hero-yue-jin.jpg",
    daqiao: "/hero-daqiao.jpg",
    "zhao-yun": "/hero-zhao-yun.jpg",
    "guan-yu": "/hero-guan-yu.jpg",
    "zhang-fei": "/hero-zhang-fei.jpg",
    "gan-ning": "/hero-gan-ning.jpg",
    "huang-gai": "/hero-huang-gai.jpg",
    "lü-meng": "/hero-lv-meng.jpg",
    "lady-gan": "/hero-lady-gan.jpg",
    "huang-yueying": "/hero-huang-yueying.jpg",
    "zhou-yu": "/hero-zhou-yu.jpg",
    simayi: "/hero-sima-yi.jpg",
    "diao-chan": "/hero-diao-chan.jpg",
    "lü-bu": "/hero-lv-bu.jpg",
    "hua-tuo": "/hero-hua-tuo.jpg",
    huaxiong: "/hero-hua-xiong.jpg",
    "sun-shangxiang": "/hero-sun-shangxiang.jpg",
    "lu-xun": "/hero-lu-xun.jpg",
    "pan-feng": "/hero-pan-feng.jpg",
  };
  for (const [id, asset] of Object.entries(expectedNewArtwork)) {
    assert.equal(HERO_ART_BY_ID[id], asset, `${id} uses the supplied hero artwork`);
    const hero = STANDARD_HEROES.find((candidate) => candidate.id === id);
    assert.ok(hero);
    const html = renderToStaticMarkup(React.createElement(HeroSelection, { room: { code: `ART-${id}`, myHeroOptions: [hero], players: [{ id: "p1", name: "TEST", hero: null, generalReady: false }], isTestController: true, meId: "p1", myRole: "Rebel", isMyAction: true, actionPlayerId: "p1" }, busy: false, error: "", onChoose: () => {}, onLeave: () => {} }));
    assert.match(html, new RegExp(`data-hero-art-id="${id}"`), `${id} renders in hero selection`);
  }
  assert.ok(mappedIds.every((id) => standardIds.has(id)), "art mapping must not point at non-Standard heroes");
  for (const id of mappedIds) {
    assert.ok(existsSync(new URL(`../public/${HERO_ART_BY_ID[id].replace(/^\//, "")}`, import.meta.url)), `${id} artwork is checked in`);
  }

  const unmappedIds = implementedIds.filter((id) => !HERO_ART_BY_ID[id]);
  for (const id of implementedIds) {
    const hero = STANDARD_HEROES.find((candidate) => candidate.id === id);
    assert.ok(hero, `${id} is in the Standard roster`);
    const html = renderToStaticMarkup(React.createElement(HeroPortrait, { hero }));
    assert.match(html, new RegExp(`data-hero-art-id="${id}"`));
    if (HERO_ART_BY_ID[id]) {
      assert.match(html, /class="hero-art-image"/);
    } else {
      assert.match(html, /class="hero-art-fallback"/, `${id} keeps the intentional initials fallback until approved artwork exists`);
    }
  }
  assert.deepEqual(unmappedIds, []);
});

test("hand cards stay naturally packed and compress only when the rail is tight", () => {
  assert.equal(calculateHandCardStep(320, 1), 68, "one card keeps its physical width");
  assert.equal(calculateHandCardStep(320, 2), 68, "two cards never spread beyond adjacent physical cards");
  assert.equal(calculateHandCardStep(320, 3), 68, "three cards never spread beyond adjacent physical cards");
  assert.equal(calculateHandCardStep(320, 10), 30, "large hands use controlled compression");
  assert.equal(calculateHandCardStep(90, 2), 30, "tight rails use the minimum controlled overlap step");
  assert.equal(calculateHandCardStep(90, 3), 30, "three tight cards remain a controlled stack");
  assert.match(gameRoomSource, /const handCardKey = room\.myHand\.map\(\(item\) => item\.id\)\.join\("\\|"\)/, "hand layout keys the actual card IDs and order");
  assert.match(gameRoomSource, /\[handRailWidth, handCardKey\]/, "hand layout recomputes after card identity, order, or count changes");
  assert.match(gameRoomSource, /calculateHandCardStep\(handRailWidth, handCardKey \? handCardKey\.split\("\\|"\) : \[\]\)/);
});

test("UI-11 keeps one local dock and stable opponent anchors across supported player counts", () => {
  for (const playerCount of [2, 3, 4, 5, 6, 8, 10]) {
    const room = responsiveTopologyRoom({ playerCount });
    assert.ok(room, `${playerCount}-player fixture normalizes`);
    const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
    const boardStart = html.indexOf('<div class="player-board"');
    const dockStart = html.indexOf('<section class="local-player-dock');
    assert.ok(boardStart >= 0 && dockStart > boardStart, `${playerCount}-player markup has a board before the dock`);
    const boardHtml = html.slice(boardStart, dockStart);
    assert.equal((boardHtml.match(/data-player-anchor="p\d+"/g) ?? []).length, playerCount - 1, `${playerCount}-player board has exactly N-1 opponent anchors`);
    assert.doesNotMatch(boardHtml, /data-player-anchor="p1"/, `${playerCount}-player board never duplicates the local anchor`);
    assert.equal((html.match(/data-player-anchor="/g) ?? []).length, playerCount, `${playerCount}-player room has exactly N visible player anchors`);
    assert.equal((html.match(/data-player-anchor="p1"/g) ?? []).length, 1, `${playerCount}-player room has one local anchor`);
    assert.equal((html.match(/class="local-player-dock/g) ?? []).length, 1, `${playerCount}-player room has one local dock`);
    assert.equal((html.match(/data-console-surface="local-operation"/g) ?? []).length, 1, `${playerCount}-player room has one local console`);
    assert.equal((html.match(/class="player-square opponent-player-card/g) ?? []).length, playerCount - 1, `${playerCount}-player room renders all opponents once`);
    assert.match(html, new RegExp(`data-player-count="${playerCount}"`));
    assert.match(html, new RegExp(`data-seat-topology="${playerCount >= 5 ? "side-column" : "top-row"}"`));
    assert.doesNotMatch(html, /class="player-square player-square-0/);
  }

  assert.match(sequenceStyleSource, /player-board\[data-seat-topology="side-column"\]/, "5-10-player topology is an explicit presentation contract");
  for (const [playerCount, rows] of [[5, 2], [6, 3], [8, 4], [10, 5]]) {
    assert.match(sequenceStyleSource, new RegExp(`data-player-count="${playerCount}"[\\s\\S]*--seat-row-count: ${rows}`), `${playerCount}-player topology declares its side-column row budget`);
  }
  assert.match(sequenceStyleSource, /\.game-shell \.player-board\[data-seat-topology="side-column"\] > \.opponent-player-card\s*\{[^}]*width: clamp\(44px, 8vw, 86px\);[^}]*height: min\(128px, 100%\);[^}]*min-height: 0;/);
});

test("UI-11 preserves hand rail and one footer console for one, five, and ten cards", () => {
  for (const handSize of [1, 5, 10]) {
    const room = responsiveTopologyRoom({ playerCount: 4, handSize });
    const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
    assert.equal((html.match(/data-hand-card-id="/g) ?? []).length, handSize, `${handSize}-card hand preserves each physical card`);
    assert.equal((html.match(/class="local-hand-section"/g) ?? []).length, 1);
    assert.equal((html.match(/class="local-hand-rail"/g) ?? []).length, 1);
    assert.equal((html.match(/data-console-surface="local-operation"/g) ?? []).length, 1, `${handSize}-card hand keeps one footer console`);
    assert.ok(html.indexOf('class="local-hand-section"') < html.indexOf('data-console-surface="local-operation"'), `${handSize}-card hand remains before the console in the dock`);
  }
  assert.match(sequenceStyleSource, /local-hand-section[\s\S]*height: var\(--hand-panel-height\)[\s\S]*overflow: visible/);
  assert.match(sequenceStyleSource, /\.local-player-dock \.console-guidance\s*\{[^}]*grid-area: guidance;/);
  assert.match(sequenceStyleSource, /\.local-player-dock \.turn-controls > \[data-action-extras="true"\]\s*\{[^}]*display: flex;[^}]*flex-wrap: wrap;/);
  assert.match(sequenceStyleSource, /@media \(max-width: 480px\)[\s\S]*turn-controls[\s\S]*min-height: 48px/);
});

test("the local player dock replaces the self battlefield square and follows Quick Test perspective", () => {
  const players = [
    { id: "p1", name: "HOST", seat: 0, hero: "cao-cao", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 2, equipmentCards: [card("weapon", "BlueSteelSword"), card("armor", "NioShield"), card("offensive-horse", "RedHare"), card("defensive-horse", "Shadowrunner")], judgementCards: [card("lightning", "Lightning"), card("overindulgence", "Overindulgence")], attackRange: 2, distance: null, isHost: true, role: "Lord" },
    { id: "p2", name: "ALICE", seat: 1, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 4, equipmentCards: [card("opponent-weapon", "BlueSteelSword")], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    { id: "p3", name: "BOB", seat: 2, hero: "zhang-fei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 4, equipmentCards: [], judgementCards: [card("opponent-judgement", "Lightning")], attackRange: 1, distance: 1, isHost: false, role: "Loyalist" },
    { id: "p4", name: "CAROL", seat: 3, hero: "xiahou-dun", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 4, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Spy" },
  ];
  const payload = {
    code: "DOCK1", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [], players,
    myHand: [card("private-hand", "Peach"), card("private-attack", "Attack"), card("private-dodge", "Dodge"), card("private-dismantle", "Dismantle")], turnSeat: 0, phase: "play", deckCount: 40, discardTop: card("visible-discard", "Dismantle"), log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards", isMyAction: true,
    currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards", legalActions: ["play_card"], canDeclareAttack: true, playPhaseActions: [] },
  };
  const room = normalizeRoomData(payload);
  assert.ok(room);
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((html.match(/class="player-square opponent-player-card/g) ?? []).length, 3, "a four-player board renders only the three opponents");
  assert.equal((html.match(/data-player-anchor="/g) ?? []).length, 4, "every visible player has one authoritative DOM anchor");
  assert.match(html, /class="local-player-dock\s*"[^>]*data-player-anchor="p1"/);
  assert.match(html, /class="player-square[^>]*data-player-anchor="p2"/);
  assert.match(html, /class="player-square[^>]*data-player-anchor="p3"/);
  assert.match(html, /class="opponent-equipment-indicator" data-slot="weapon" data-equipment-id="opponent-weapon" data-card-kind="BlueSteelSword" role="img" aria-label="Weapon equipped: Blue Steel Sword"/);
  assert.match(html, /class="opponent-hero-overlay"[\s\S]*class="opponent-hero-name">Liu Bei<\/strong>[\s\S]*class="player-hp">HP 3\/4<\/span>[\s\S]*class="player-hearts">♥♥♥<\/span>/);
  assert.match(html, /class="opponent-hand-footer"[\s\S]*class="player-hand-label">Hand cards<\/span>[\s\S]*class="player-hand-count">4<\/strong>/);
  assert.match(html, /class="opponent-equipment-indicator"[^>]*title="Weapon: Blue Steel Sword"/);
  assert.match(html, /class="mini-zone-card judgement-mini"[^>]*data-judgement-id="opponent-judgement"/);
  assert.match(html, /class="local-hand"[^>]*data-card-origin-anchor="p1"/);
  assert.match(html, /class="draw-stack"[^>]*data-draw-anchor="true"/);
  assert.match(html, /class="discard-stack"[^>]*data-discard-anchor="true"/);
  assert.doesNotMatch(html, /class="player-square player-square-0/);
  assert.match(html, /class="local-player-dock\s*"/);
  assert.match(html, /data-hero-id="cao-cao"/);
  assert.match(html, /class="player-square-portrait opponent-hero-portrait" data-hero-id="liu-bei"[\s\S]*data-hero-art-id="liu-bei"/);
  assert.match(html, /data-hero-art-id="xiahou-dun"/);
  assert.match(html, /aria-label="Inspect ALICE"/, "opponent heroes are inspectable when no target is active");
  assert.match(sequenceStyleSource, /\.opponent-hero-card \{[\s\S]*aspect-ratio: 2 \/ 3;/, "opponent hero portraits remain 2:3");
  assert.match(sequenceStyleSource, /\.opponent-hero-portrait \{[\s\S]*height: 100% !important;/, "opponent artwork fills the hero region");
  assert.match(sequenceStyleSource, /\.opponent-hero-portrait \.hero-art-image \{[^}]*object-fit: cover; object-position: center top;/, "opponent artwork uses cover framing");
  assert.doesNotMatch(globalStyleSource, /\.player-square-target \.player-square-portrait \{[^}]*height: clamp\(44px, 8vw, 92px\)/, "opponent portraits do not regress to the shallow mobile rule");
  assert.match(gameRoomSource, /<HeroPortrait hero=\{playerHero\} \/>/, "opponents use the shared HeroPortrait renderer");
  assert.match(html, /class="local-hero-card"[\s\S]*class="local-hero-label">Cao Cao<\/span>[\s\S]*class="local-hero-role">Lord<\/strong>[\s\S]*class="local-hero-hp">HP 4\/4<\/span>[\s\S]*class="local-hero-hearts">♥♥♥♥<\/span>/, "local hero card orders name, role, HP, and hearts");
  assert.equal(hpDisplay(5), "♥♥♥♥♥");
  assert.equal(hpDisplay(4), "♥♥♥♥");
  assert.equal(hpDisplay(1), "♥");
  assert.equal(hpDisplay(0), "0 HP");
  for (const [current, max] of [[5, 5], [4, 5], [1, 5], [4, 4], [3, 4]]) {
    const hpRoom = normalizeRoomData({ ...payload, code: `DOCK-HP-${current}-${max}`, players: players.map((player) => player.id === "p1" ? { ...player, hp: current, maxHp: max } : player) });
    assert.ok(hpRoom);
    const hpHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: hpRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
    assert.match(hpHtml, new RegExp(`class="local-hero-hp">HP ${current}/${max}<\\/span>[\\s\\S]*class="local-hero-hearts">${"♥".repeat(current)}<\\/span>`), `${current}/${max} renders one heart per current HP`);
  }
  assert.match(html, /class="local-status-panel"[\s\S]*class="hero-skills local-hero-skills"[\s\S]*>Treachery<\/button>[\s\S]*>Entourage<\/button>/, "local skills move into the flexible top panel");
  assert.doesNotMatch(html, /class="local-status-panel"[\s\S]*local-status-hp|class="local-status-panel"[\s\S]*local-status-hearts|class="local-status-panel"[\s\S]*local-status-role/);
  assert.equal((html.match(/class="hero-skill-button/g) ?? []).length, 2, "Cao Cao exposes one button per metadata skill");
  assert.match(html, />Treachery<\/button>[\s\S]*>Entourage<\/button>/);
  assert.doesNotMatch(html, />Skill<\/button>/, "known hero skills never fall back to a generic label");
  assert.doesNotMatch(html, /local-dock-meta/);
  assert.equal((html.match(/class="local-equipment-slot"/g) ?? []).length, 4);
  assert.match(html, /data-slot="defensiveHorse"[^>]*aria-label="\+1 Horse slot"/);
  assert.match(html, /data-slot="offensiveHorse"[^>]*aria-label="-1 Horse slot"/);
  assert.equal((html.match(/class="local-dock-zones"/g) ?? []).length, 1);
  assert.equal((html.match(/class="local-equipment-panel"/g) ?? []).length, 1);
  assert.equal((html.match(/class="local-judgement-panel"/g) ?? []).length, 0, "persistent Judgement has no independent Dock panel");
  assert.equal((html.match(/class="local-judgement-cards local-judgement-overlay"/g) ?? []).length, 1, "local Judgement is overlaid on the Hero");
  assert.match(html, /class="local-hero-anchor"[\s\S]*?class="local-hero-card"[\s\S]*?<\/button><div[^>]*class="local-judgement-cards local-judgement-overlay"/, "overlay controls are siblings of the Hero button");
  assert.equal((html.match(/data-judgement-id="lightning"/g) ?? []).length, 1, "the local physical Judgement card renders once");
  assert.equal((html.match(/data-judgement-id="overindulgence"/g) ?? []).length, 1, "the second local physical Judgement card renders once");
  assert.equal((html.match(/class="local-judgement-cards local-judgement-overlay[\s\S]*?class="local-judgement-card-slot"/g) ?? []).length, 1, "the overlay contains its existing physical-card slots");
  assert.doesNotMatch(html, /class="local-zone-panel"/);
  const emptyRoom = normalizeRoomData({ ...payload, code: "DOCK-EMPTY", players: players.map((player) => player.id === "p1" ? { ...player, equipmentCards: [], judgementCards: [] } : player) });
  assert.ok(emptyRoom);
  const emptyHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: emptyRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((emptyHtml.match(/class="local-zone-empty-label"/g) ?? []).length, 4, "empty equipment slots retain all four labels");
  assert.doesNotMatch(emptyHtml, />\+<\/span>/, "empty equipment slots do not render a plus placeholder");
  assert.equal((emptyHtml.match(/class="local-judgement-cards local-judgement-overlay"/g) ?? []).length, 0, "an empty local Judgement zone consumes no overlay");
  const equipmentOrder = ["weapon", "armor", "defensiveHorse", "offensiveHorse"].map((slot) => html.indexOf(`data-slot="${slot}"`));
  assert.deepEqual(equipmentOrder, [...equipmentOrder].sort((a, b) => a - b), "equipment uses Weapon, Armour, +1 Horse, -1 Horse order");
  assert.match(sequenceStyleSource, /\.local-dock-zones\s*\{[\s\S]*align-items: stretch/);
  assert.equal((html.match(/class="local-status-panel"/g) ?? []).length, 1);
  assert.match(html, /data-slot="weapon"[^>]*aria-label="Weapon slot"/);
  assert.match(html, /data-slot="armor"[^>]*aria-label="Armour slot"/);
  assert.match(html, /class="local-judgement-cards local-judgement-overlay"[^>]*data-judgement-layout="pending"/);
  assert.equal((html.match(/class="local-judgement-card-slot"/g) ?? []).length, 2, "Judgement renders only its two actual cards");
  assert.match(gameRoomSource, /const judgementCardLayout = useMemo[\s\S]*Math\.max\(12, naturalStep\)/, "Judgement spacing overlaps dynamically");
  assert.doesNotMatch(sequenceStyleSource, /local-judgement-stack \.local-zone-card:nth-child/);
  assert.match(html, /aria-label="Explain Blue Steel Sword"/); assert.match(html, /aria-label="Explain Lightning"/);
  assert.match(html, /data-equipment-id="weapon"[\s\S]*class="played-card bluesteelsword black-suit/);
  assert.match(html, /data-judgement-id="lightning"[\s\S]*class="played-card lightning black-suit/);
  assert.match(html, /class="opponent-public-zones"[\s\S]*class="player-hero-card opponent-hero-card"[\s\S]*class="opponent-equipment-summary" role="group" aria-label="Public Equipment"[\s\S]*class="opponent-equipment-indicator" data-slot="weapon" data-equipment-id="opponent-weapon"/, "public opponent Equipment is summarized in the seat without adding a separate row");
  assert.equal((html.match(/class="opponent-equipment-indicator"/g) ?? []).length, 1, "only the occupied public opponent equipment slot renders an indicator");
  assert.equal((html.match(/class="opponent-equipment-summary"/g) ?? []).length, 1, "empty opponent equipment does not reserve a summary row");
  assert.match(html, /class="opponent-judgement-zone"[\s\S]*data-judgement-id="opponent-judgement"/, "Judgement is a separate side zone with its card anchor");
  assert.doesNotMatch(html, /class="opponent-card-zones"/, "the old portrait-overlay zone wrapper is removed");
  assert.match(gameRoomSource, /const renderZoneCard[\s\S]*<CardFace card=\{card\}/, "local zones reuse the shared card artwork renderer");
  assert.match(html, /class="local-hand"/); assert.match(html, /class="local-hand-rail"/);
  assert.equal((html.match(/class="local-hand-section"/g) ?? []).length, 1, "the hand is a distinct dock layout region");
  assert.equal((html.match(/class="turn-controls"/g) ?? []).length, 1, "the action row is a distinct dock layout region");
  assert.doesNotMatch(html, /local-dock-content|local-dock-actions/, "hand and actions are not hidden inside a generic content wrapper");
  const railStart = html.indexOf('class="local-hand-rail"');
  assert.ok(railStart >= 0, "the local hand has a bounded rail presentation");
  assert.equal((html.match(/class="card-slot/g) ?? []).length, 4, "the rail has one slot per physical hand card");
  assert.equal((html.match(/data-hand-card-id="/g) ?? []).length, 4, "the compact rail keeps exactly four physical hand cards");
  assert.equal((html.match(/class="hand-card-visual"/g) ?? []).length, 4, "each physical hand card owns one shared visual wrapper");
  assert.equal((html.match(/class="card-info-button"/g) ?? []).length, 4, "each physical hand card owns one information control");
  assert.doesNotMatch(html, /class="play-hand"/, "the legacy private play-hand renderer is removed");
  assert.match(html, /class="local-hand"[\s\S]*class="local-hand-rail"/);
  assert.ok(html.indexOf('class="local-hand"') < html.indexOf('class="turn-controls"'), "the hand precedes contextual controls in the DOM");
  assert.match(gameRoomSource, /const multiSelectMode = room\.phase === "discard"/);
  assert.match(gameRoomSource, /const singleSelected = !multiSelectMode && isSelected/);
  assert.match(gameRoomSource, /singleSelected \? "single-selected"/);
  assert.match(gameRoomSource, /data-hand-card-id=\{item\.id\}[\s\S]*className="card-info-button"/);
  assert.doesNotMatch(gameRoomSource, /local-selected-card-preview|selectedPreviewCard/);
  assert.match(gameRoomSource, /key={`rail-\$\{item\.id\}`}/);
  assert.match(html, /class="discard-stack"[^>]*data-discard-kind="Dismantle"/);
  assert.match(html, /title="After you take damage, you may obtain the card that caused damage on you\."/);
  assert.doesNotMatch(html, /private-opponent-card/);
  const sequenceSource = gameRoomSource.slice(gameRoomSource.indexOf("function TableResolutionSequence"), gameRoomSource.indexOf("function CardFace"));
  assert.doesNotMatch(sequenceSource, /Math\.(sin|cos)|activeAngle|activeRadians|--seat-[xy]/, "resolution placement is not circular seat geometry");
  assert.match(sequenceSource, /centerRelativeToTable/);
  const sharedPanelChrome = sequenceStyleSource.match(/\.local-dock-identity,\s*\.local-dock-zones,\s*\.local-status-panel,\s*\.local-equipment-panel,\s*\.local-hand-section,\s*\.local-player-dock \.console-guidance,\s*\.local-player-dock \.turn-controls\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(sharedPanelChrome, /border: 1px solid #765f3c99;/);
  assert.match(sharedPanelChrome, /background: #0e120dcc;/);
  assert.match(sequenceStyleSource, /--hand-panel-height: 108px[\s\S]*--hand-peek-height: 102px[\s\S]*--hand-card-height: 102px[\s\S]*--hand-top-inset: 4px[\s\S]*--selected-rise: 48px[\s\S]*--hand-bottom-gutter: 10px/);
  assert.match(sequenceStyleSource, /hand-top-inset - selected-rise \+ hand-card-height[\s\S]*hand-panel-height - hand-bottom-gutter/);
  assert.match(sequenceStyleSource, /@media \(max-width: 480px\) \{\s*\.game-shell \.play-command \{[^}]*\}\s*\.local-player-dock \{[^}]*--top-panel-height: 58px;[^}]*grid-template-columns: 70px minmax\(0, 1fr\);[^}]*grid-template-rows: auto var\(--top-panel-height\) var\(--hand-panel-height\) minmax\(48px, auto\);/);
  assert.match(sequenceStyleSource, /--top-panel-height: 124px[\s\S]*--zone-card-width: clamp\(28px, 7\.6vw, 34px\)/);
  const dockZonesRule = sequenceStyleSource.match(/\.local-dock-zones\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(dockZonesRule, /grid-template-columns: minmax\(0, 1fr\) max-content;/, "Skills and Equipment keep the two-track top row");
  assert.match(dockZonesRule, /height: var\(--top-panel-height\)/);
  assert.doesNotMatch(sequenceStyleSource, /--judgement-panel-width|\.local-judgement-panel/, "the independent Judgement track is removed");
  assert.match(sequenceStyleSource, /\.local-hero-anchor\s*\{[^}]*position: relative;[^}]*overflow: visible;/);
  assert.match(sequenceStyleSource, /\.local-judgement-overlay\s*\{[^}]*position: absolute;[^}]*pointer-events: none;/);
  assert.match(sequenceStyleSource, /\.local-judgement-card-slot \.local-zone-card\s*\{\s*pointer-events: auto;/, "only the card controls receive pointer input over the portrait");
  assert.match(gameRoomSource, /judgementCardLayout\.step - judgementCardWidth/);
  assert.match(gameRoomSource, /hiddenCardIds\.has\(card\.id\)/, "in-flight Judgement cards retain their existing hidden-card behavior");
  assert.doesNotMatch(gameRoomSource, /judgementCardLayout\.step - 34/);
  assert.match(sequenceStyleSource, /\.local-hand-section\s*\{[\s\S]*height: var\(--hand-panel-height\)[\s\S]*padding: var\(--hand-top-inset\) 4px var\(--hand-bottom-gutter\)/);
  const handViewportRule = sequenceStyleSource.match(/\.local-hand-rail\s*\{([^}]*)\}/)?.[1] ?? "";
  assert.match(handViewportRule, /top: calc\(-1 \* var\(--hand-lift-clearance\)\)/);
  assert.match(handViewportRule, /height: calc\(var\(--hand-peek-height\) \+ var\(--hand-lift-clearance\)\)/);
  assert.match(handViewportRule, /padding: var\(--hand-lift-clearance\) 0 0/);
  assert.match(handViewportRule, /overflow-x: auto; overflow-y: hidden/);
  assert.match(handViewportRule, /pointer-events: none/, "empty lift space preserves underlying Skills/Equipment hits");
  assert.match(gameRoomSource, /ResizeObserver[\s\S]*handRailWidth[\s\S]*calculateHandCardStep/);
  assert.doesNotMatch(sequenceStyleSource, /margin-left: -38px|margin-left: -34px/);
  assert.match(html, /class="hand-card-visual"[\s\S]*class="game-card[\s\S]*class="card-info-button"/);
  assert.match(sequenceStyleSource, /\.local-hand-rail \.card-slot\.single-selected \.hand-card-visual\s*\{[\s\S]*transform: translateY\(calc\(-1 \* var\(--selected-rise\)\)\)/);
  const heroSkillEligibleRule = globalStyleSource.match(/\.game-card\.hero-skill-eligible\{([^}]*)\}/)?.[1] ?? "";
  assert.match(heroSkillEligibleRule, /border-color:/, "hero-skill-eligible keeps its eligibility styling");
  assert.doesNotMatch(heroSkillEligibleRule, /transform\s*:/, "eligibility must not move every hand card");
  assert.match(sequenceStyleSource, /\.local-hand-rail \.card-slot:not\(\.single-selected\) \.game-card\.selected\s*\{\s*transform: translateY\(-5px\)/, "multi-select cards rise from the normal baseline");
  assert.match(sequenceStyleSource, /\.local-hand-rail \.card-info-button\s*\{[\s\S]*left: 50%[\s\S]*top: calc\(var\(--hand-card-height\) \* \.67\)/);
  assert.match(sequenceStyleSource, /\.local-hand-rail \.card-slot\.single-selected \.card-info-button\s*\{[\s\S]*opacity: 1[\s\S]*pointer-events: auto[\s\S]*translate: -50% -50%/);
  assert.match(sequenceStyleSource, /\.local-hand-rail \.game-card \.corner\s*\{[\s\S]*width: 17px[\s\S]*min-height: 23px/);
  assert.match(sequenceStyleSource, /\.local-hand-section\s*\{[\s\S]*z-index: 50/);
  assert.match(sequenceStyleSource, /\.local-player-dock \.turn-controls\s*\{[\s\S]*z-index: 100/);
  assert.match(globalStyleSource, /\.player-square\{[\s\S]*aspect-ratio:2 \/ 3[\s\S]*width:100%[\s\S]*@media\(max-width:700px\)[\s\S]*\.player-square\{width:clamp\(92px,26vw,112px\)/);
  assert.doesNotMatch(globalStyleSource, /Final mobile player panels/);
  assert.doesNotMatch(sequenceStyleSource, /margin-left: -38px|margin-left: -34px/);
  assert.match(sequenceStyleSource, /\.local-player-dock \.turn-controls\s*\{[\s\S]*min-height: 65px[\s\S]*padding: 7px 8px/);
  assert.match(sequenceStyleSource, /\.local-player-dock \.turn-controls button\s*\{[\s\S]*min-width: 78px/);
  assert.match(globalStyleSource, /\.player-hp[\s\S]*\.player-hearts[\s\S]*\.player-hand-count/);
  assert.match(globalStyleSource, /\.mini-equipment-card \.mini-equipment-button > \.played-card[\s\S]*width: 100%[\s\S]*height: 100%/);
  assert.match(sequenceStyleSource, /@media \(max-width: 360px\)[\s\S]*grid-template-columns: 64px minmax\(0, 1fr\)/);
  assert.match(sequenceStyleSource, /\.local-hero-anchor\s*\{[^}]*width: min\(100%, 72px\)[^}]*max-width: 72px/);
  assert.match(sequenceStyleSource, /\.local-hero-card\s*\{[\s\S]*width: 100%[\s\S]*height: auto[\s\S]*aspect-ratio: 2 \/ 3/);
  assert.match(sequenceStyleSource, /\.local-hero-overlay\s*\{[\s\S]*background: linear-gradient/);
  assert.match(sequenceStyleSource, /\.local-hero-vitals\s*\{[\s\S]*flex-direction: column/);
  assert.match(sequenceStyleSource, /\.local-status-panel\s*\{[\s\S]*align-items: stretch[\s\S]*overflow: visible/);
  assert.match(sequenceStyleSource, /\.local-hero-skills\s*\{[\s\S]*flex-direction: column/);
  assert.match(sequenceStyleSource, /\.player-board \{ grid-template-rows: minmax\(100px, 1fr\) auto minmax\(70px, \.35fr\); \}/, "mobile board gives less unused space below the side opponents");
  assert.match(sequenceStyleSource, /\.player-hero-card \.player-square-target \{ padding-inline: 0; padding-right: 0; \}/, "mobile opponent names can use the width reserved from the desktop info button");
  assert.match(sequenceStyleSource, /\.player-square-target strong \{ display: block; width: calc\(100% \+ 4px\); max-width: calc\(100% \+ 4px\); font-size: clamp\(9px, 2\.75vw, 11px\);/, "mobile opponent names get responsive width and sizing before ellipsis");
  assert.match(sequenceStyleSource, /--top-seat-y: clamp\([\s\S]*--side-seat-y: clamp\([\s\S]*--opponent-seat-x: clamp\(/, "opponent seats use shared responsive position variables");
  assert.match(sequenceStyleSource, /player-square-1 \{[\s\S]*left: var\(--opponent-seat-x\);[\s\S]*top: var\(--side-seat-y\)/, "left opponent uses the shared side seat");
  assert.match(sequenceStyleSource, /player-square-2 \{[\s\S]*left: 50%;[\s\S]*top: var\(--top-seat-y\)/, "top opponent remains centred");
  assert.match(sequenceStyleSource, /player-square-3 \{[\s\S]*right: var\(--opponent-seat-x\);[\s\S]*top: var\(--side-seat-y\)/, "right opponent mirrors the left seat");
  assert.match(sequenceStyleSource, /\.game-shell \.play-center \{[\s\S]*top: clamp\(290px, 66%, 520px\)/, "piles use the lower-middle board anchor");
  assert.match(gameRoomSource, /className="opponent-equipment-summary"[\s\S]*\{equipmentSummary\}/, "opponent equipment is summarized by its public slots");
  assert.match(gameRoomSource, /className="opponent-equipment-indicator" data-slot=\{key\} data-equipment-id=\{equipment\.id\} data-card-kind=\{equipment\.kind\} role="img"/, "equipment indicators retain the projected physical card identity and slot");
  assert.match(gameRoomSource, /function OpponentEquipmentGlyph/, "each equipment slot has its own compact visual glyph");
  assert.match(sequenceStyleSource, /\.opponent-equipment-summary\s*\{[\s\S]*pointer-events: none[\s\S]*data-seat-topology="side-column"[\s\S]*opponent-equipment-summary[\s\S]*flex-direction: column/, "public equipment indicators preserve the target hit area and adapt to narrow side seats");
  assert.match(sequenceStyleSource, /\.opponent-judgement-zone \{[\s\S]*left: calc\(100% \+ 4px\)/, "Judgement is visually distinct and offset to the side");
  assert.match(sequenceStyleSource, /\.opponent-judgement-cards \.mini-zone-card \+ \.mini-zone-card \{[\s\S]*margin-left: -45%/i, "multiple Judgement cards use controlled overlap");
  assert.match(gameRoomSource, /const \[expandedOpponentId, setExpandedOpponentId\] = useState<string \| null>\(null\)/, "inspection is presentation-local state");
  assert.match(gameRoomSource, /targetSelectionActive \? onTarget : onInspect/, "target selection takes priority over inspection");
  assert.match(gameRoomSource, /expandedOpponentId && \(\(\) => \{[\s\S]*OpponentInspectionOverlay/, "expanded inspection reuses projected opponent data");
  assert.match(gameRoomSource, /onClick=\{\(event\) => \{ event\.stopPropagation\(\); onHeroInfo\(playerHero\); \}\}/, "inspection info buttons do not toggle inspection");
  assert.match(sequenceStyleSource, /\.opponent-inspection-card \{[\s\S]*aspect-ratio: 2 \/ 3;/, "expanded public cards preserve aspect ratio");
  assert.match(sequenceStyleSource, /\.opponent-inspection-card-row \{[\s\S]*flex-wrap: wrap;/, "expanded public cards wrap instead of overlapping");

  const switched = normalizeRoomData({ ...payload, code: "DOCK2", meId: "p3", myRole: "Loyalist", myHand: [card("switched-hand", "Dodge")], actionPlayerId: "p3", currentAction: { ...payload.currentAction, actorId: "p3" } });
  assert.ok(switched);
  const switchedHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: switched, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((switchedHtml.match(/class="player-square opponent-player-card/g) ?? []).length, 3, "switching the controlled seat keeps three opponents on the board");
  assert.match(switchedHtml, /data-hero-id="zhang-fei"/);
  assert.match(switchedHtml, /class="local-hero-card"[\s\S]*class="local-hero-role">Loyalist<\/strong>/);
  assert.match(switchedHtml, /Dodge/);
});

test("Zhou Yu renders Sowing Distrust from its projected semantic capability", () => {
  assert.deepEqual(HERO_SKILL_EFFECT_IDS["zhou-yu"], {
    Heroic: ["zhou_yu_yingzi"],
    "Sowing Distrust": ["zhou_yu_fanjian"],
  });

  const fanjianOption = {
    effectId: "zhou_yu_fanjian",
    label: "Sowing Distrust",
    selection: { type: "target", targetIds: ["p2"], min: 1, max: 1 },
  };
  const payload = {
    code: "FANJIAN-UI", status: "playing", maxPlayers: 4, isHost: true, isTestController: true,
    meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "ZHOU YU", seat: 0, hero: "zhou-yu", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "OPPONENT", seat: 1, hero: "sun-quan", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 2, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [card("zhou-yu-hand", "Attack")], turnSeat: 0, phase: "play", deckCount: 20, discardTop: null,
    log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards", isMyAction: true,
    currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards", legalActions: ["play_card"], triggerOptions: [fanjianOption] },
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null,
    pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingBorrowedSword: null, pendingDying: null,
  };
  const room = normalizeRoomData(payload);
  assert.ok(room);
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(html, />Heroic<\/button>/, "metadata-backed Heroic remains rendered");
  const fanjianButton = html.match(/<button[^>]*aria-label="Sowing Distrust"[^>]*>Sowing Distrust<\/button>/)?.[0];
  assert.ok(fanjianButton, "metadata-backed Sowing Distrust is rendered");
  assert.doesNotMatch(fanjianButton, /disabled=""/, "Sowing Distrust is enabled when zhou_yu_fanjian is projected");
  assert.match(html, /data-player-anchor="p2"/, "the projected eligible opponent is rendered");
  assert.match(gameRoomSource, /activeSkillTargetMode && activeSkillTargetIds\.includes\(player\.id\)/, "activated semantic target skills make projected opponents selectable across phases");
  assert.match(gameRoomSource, /setActiveSkillSelectionState\(\(state\) => \{[\s\S]*targetIds: next/, "target selection stores the chosen opponent in the active skill state");
  assert.match(gameRoomSource, /onAction\("trigger", activeSkillSubmission\)/, "active skills use the generic trigger action");
  assert.match(gameRoomSource, /activeSkillSubmission =[\s\S]*?providerId: activeSkillOption\.effectId[\s\S]*(?:targetIds: activeSkillSelectedTargetIds|targetId: activeSkillTargetId)/, "the generic trigger payload carries providerId and the selected target field");

  const unavailableRoom = normalizeRoomData({ ...payload, code: "FANJIAN-UI-OFF", currentAction: { ...payload.currentAction, triggerOptions: [] } });
  assert.ok(unavailableRoom);
  const unavailableHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: unavailableRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  const unavailableButton = unavailableHtml.match(/<button[^>]*aria-label="Sowing Distrust"[^>]*>Sowing Distrust<\/button>/)?.[0];
  assert.ok(unavailableButton, "Sowing Distrust remains visible when unavailable");
  assert.match(unavailableButton, /disabled=""/, "Sowing Distrust is disabled without its projected capability");
});

test("normalized malformed and unknown response states render safely", () => {
  const room = normalizeRoomData({
    code: "SAFE1", status: "playing", maxPlayers: 4, isHost: true, isTestController: false, meId: "p1", myRole: "Lord", myHeroOptions: null,
    players: [{ id: "p1", name: "ME", seat: 0, hero: "simayi", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: null, judgementCards: [null, { ...card("played-heart", "Dodge"), suit: "♥", rank: "2" }, { ...card("played-diamond", "Peach"), suit: "♦", rank: "3" }, { ...card("played-spade", "Dodge"), suit: "♠", rank: "4" }, { ...card("played-club", "Peach"), suit: "♣", rank: "5" }], attackRange: 1, distance: null, isHost: true, role: "Lord" }, null],
    myHand: [card("hand"), { ...card("red-hand"), suit: "♥" }], turnSeat: 0, phase: "play", deckCount: 40, discardTop: null, log: null,
    timeline: [null, { type: "card", card: null }, { type: "message", message: "Safe" }],
    pendingAttack: null, pendingGreenDragon: { kind: "green_dragon", sourceId: "p1" }, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null,
    pendingGroup: null, pendingNegation: null, pendingHarvest: { kind: "harvest", revealed: [null, card("revealed")], choices: null }, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(room);
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(html, /game-exit/);
  assert.match(html, /class="local-player-dock\s*"/);
  assert.match(html, /aria-label="Explain Sima Yi"/);
  assert.doesNotMatch(html, />Necromancy<\/em>/);
  const heroInfoHtml = renderToStaticMarkup(React.createElement(HeroInfoDialog, { hero: { id: "simayi", name: "Sima Yi", faction: "Wei", hp: 3, skills: [{ name: "Retaliation", description: "After you take damage, you may obtain 1 card from the character that inflicted the damage." }, { name: "Necromancy", description: "After a Judgement card is flipped, you may discard 1 card from your hand. The discarded card then becomes the new Judgement card." }], ability: "After you take damage, you may obtain 1 card from the character that inflicted the damage." }, onClose: () => {} }));
  assert.match(heroInfoHtml, />Retaliation<\/strong>/);
  assert.match(heroInfoHtml, />Necromancy<\/strong>/);
  assert.match(heroInfoHtml, /After a Judgement card is flipped/);
  const ganglieInfoHtml = renderToStaticMarkup(React.createElement(HeroInfoDialog, { hero: { id: "xiahou-dun", name: "Xiahou Dun", faction: "Wei", hp: 4, skill: "Stauchness", ability: "After you take damage, you may enter Judgement phase, if the Judgement card does not belong to [Heart], the source of damage must choose between: ①discard 2 hand cards; ②take 1 damage from you." }, onClose: () => {} }));
  assert.match(ganglieInfoHtml, />Stauchness<\/strong>/);
  assert.match(ganglieInfoHtml, /source of damage must choose between/);
  assert.match(ganglieInfoHtml, /①discard 2 hand cards/);
  const choiceSelection = { type: "choice", choices: [{ id: "discard_two", label: "Discard exactly 2 cards from your hand" }, { id: "take_damage", label: "Take 1 damage from Xiahou Dun" }], eligibleHandKeys: ["hand:0", "hand:1"], cardCountByChoice: { discard_two: 2 } };
  const ganglieHand = [{ ...card("ganglie-dodge", "Dodge"), suit: "♠", rank: "7" }, { ...card("ganglie-peach", "Peach"), suit: "♥", rank: "Q" }];
  const ganglieChoiceHtml = renderToStaticMarkup(React.createElement(MandatoryChoiceDialog, { option: { effectId: "xiahou_dun_ganglie", label: "Stauchness", description: "The Judgement is not a Heart. Choose one: discard exactly 2 cards from your hand, or take 1 damage from Xiahou Dun. Equipment and Judgement Zone cards cannot be discarded for this choice.", allowDecline: false, selection: choiceSelection }, selection: choiceSelection, hand: ganglieHand, selectedChoice: "", selectedKeys: [], disabled: false, error: "", onChoice: () => {}, onToggle: () => {}, onConfirm: () => {} }));
  assert.match(ganglieChoiceHtml, /The Judgement is not a Heart/);
  assert.match(ganglieChoiceHtml, /Discard exactly 2 cards from your hand/);
  assert.match(ganglieChoiceHtml, /Take 1 damage from Xiahou Dun/);
  const ganglieDiscardChoiceHtml = renderToStaticMarkup(React.createElement(MandatoryChoiceDialog, {
    option: { effectId: "xiahou_dun_ganglie", label: "Stauchness", description: "The Judgement is not a Heart. Choose one: discard exactly 2 cards from your hand, or take 1 damage from Xiahou Dun. Equipment and Judgement Zone cards cannot be discarded for this choice.", allowDecline: false, selection: choiceSelection }, selection: choiceSelection, hand: ganglieHand, selectedChoice: "discard_two", selectedKeys: ["hand:0", "hand:1"], disabled: false, error: "",
    onChoice: () => {}, onToggle: () => {}, onConfirm: () => {},
  }));
  assert.match(ganglieDiscardChoiceHtml, /class="played-card dodge black-suit/);
  assert.match(ganglieDiscardChoiceHtml, /class="played-card peach red-suit/);
  assert.match(ganglieDiscardChoiceHtml, />Dodge<\//);
  assert.match(ganglieDiscardChoiceHtml, />Peach<\//);
  assert.match(ganglieDiscardChoiceHtml, /7<small>♠<\/small>/);
  assert.match(ganglieDiscardChoiceHtml, /Q<small>♥<\/small>/);
  assert.match(ganglieDiscardChoiceHtml, /♠/);
  assert.match(ganglieDiscardChoiceHtml, /♥/);
  assert.equal((ganglieDiscardChoiceHtml.match(/class="target-card-picker-card selected/g) ?? []).length, 2, "Stauchness allows exactly the two eligible hand cards to be selected");
  assert.doesNotMatch(ganglieDiscardChoiceHtml, /Hidden hand card|concealed-card|>\?<\/span>/);
  assert.match(html, /Attack/);
  assert.match(html, /class="game-card attack black-suit/);
  assert.match(html, /class="game-card attack red-suit/);
  assert.equal((html.match(/class="local-zone-card red-suit/g) ?? []).length, 2);
  assert.equal((html.match(/class="local-zone-card black-suit/g) ?? []).length, 2);
  assert.doesNotMatch(html, /Cannot read properties of null/);
  const waitingRoom = normalizeRoomData({
    code: "SAFE2", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [], turnSeat: 0, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Waiting", isMyAction: true,
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(waitingRoom);
  const waitingHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: waitingRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(waitingHtml, /class="discard-empty"/, "an empty discard pile renders safely");
  assert.doesNotMatch(waitingHtml, /Skip · take 1 damage/);
  assert.match(waitingHtml, /Waiting for the latest response state/);

  const longdanPlayRoom = normalizeRoomData({
    code: "SAFE-LONGDAN-PLAY", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhao-yun", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 2, equipmentCards: [card("weapon", "BlueSteelSword")], judgementCards: [], attackRange: 2, distance: null, isHost: true, role: "Lord" }],
    myHand: [card("longdan-dodge", "Dodge"), card("longdan-attack", "Attack")], turnSeat: 0, phase: "play", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards", isMyAction: true,
    currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards", legalActions: ["play_card"], canDeclareAttack: true, playPhaseActions: [{ cardId: "longdan-dodge", canPlayAs: "attack" }] },
  });
  const longdanPlayHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: longdanPlayRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(longdanPlayHtml, />Braveheart<\/button>/);
  assert.match(longdanPlayHtml, /class="game-card dodge black-suit/);

  const longdanResponseRoom = normalizeRoomData({
    code: "SAFE-LONGDAN-RESPONSE", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhao-yun", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 2, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [card("longdan-response-attack", "Attack"), card("longdan-response-dodge", "Dodge")], turnSeat: null, phase: "response", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Dodge or take damage", isMyAction: true,
    pending: { kind: "response" }, currentAction: { version: 3, kind: "response", actorId: "p1", deadline: 0, reason: "Dodge or take damage", legalActions: ["respond", "decline_response"], requirement: "dodge", options: [{ providerId: "card", satisfies: "dodge", activation: "implicit", label: "Play Dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["longdan-response-dodge"] } }, { providerId: "zhao_yun_attack_as_dodge", satisfies: "dodge", activation: "explicit", label: "Use Braveheart as Dodge", playedAs: "dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["longdan-response-attack"] } }] },
  });
  const longdanResponseHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: longdanResponseRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(longdanResponseHtml, />Braveheart<\/button>/);
  assert.doesNotMatch(longdanResponseHtml, /Use Braveheart as Dodge/);
  assert.match(longdanResponseHtml, />Confirm<\/button>/, "response providers use one generic confirmation control");
  assert.match(longdanResponseHtml, />Skip<\/button>/, "response decline remains available");
  assert.doesNotMatch(longdanResponseHtml, />Play Dodge<\/button>/, "the physical response is selected from the hand");

  const zhenResponseRoom = normalizeRoomData({
    code: "SAFE-ZHEN-RESPONSE", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhen-ji", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 2, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [{ ...card("zhen-black", "Dodge"), suit: "♠" }, { ...card("zhen-red", "Dodge"), suit: "♥" }], turnSeat: null, phase: "response", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Dodge or take damage", isMyAction: true,
    pending: { kind: "response" }, currentAction: { version: 3, kind: "response", actorId: "p1", deadline: 0, reason: "Dodge or take damage", legalActions: ["respond", "decline_response"], requirement: "dodge", options: [{ providerId: "card", satisfies: "dodge", activation: "implicit", label: "Play Dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["zhen-black", "zhen-red"] } }, { providerId: "zhen_ji_black_card_dodge", satisfies: "dodge", activation: "explicit", label: "Use Empress Dowager as Dodge", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["zhen-black"] } }] },
  });
  const zhenResponseHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: zhenResponseRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  const empressButton = zhenResponseHtml.match(/<button[^>]*aria-label="Empress Dowager"[^>]*>Empress Dowager<\/button>/)?.[0];
  assert.ok(empressButton, "Empress Dowager remains visible in the Skills panel");
  assert.doesNotMatch(empressButton, /disabled=""/, "Empress Dowager is enabled from its projected response option");
  assert.match(zhenResponseHtml, />Confirm<\/button>/, "Zhen Ji's response waits for a card selection before confirming");
  assert.match(zhenResponseHtml, />Skip<\/button>/, "Zhen Ji can decline the Dodge response");
  assert.doesNotMatch(zhenResponseHtml, /Use Empress Dowager as Dodge|>Play Dodge<\/button>/, "provider activation is not duplicated in the response footer");
  assert.deepEqual(HERO_SKILL_RESPONSE_IDS["cao-cao"].Entourage, ["cao_cao_hujia"]);
  assert.deepEqual(HERO_SKILL_RESPONSE_IDS["liu-bei"].Influencing, ["liu_bei_jijiang"]);
  assert.deepEqual(HERO_SKILL_RESPONSE_IDS["guan-yu"]["God of War"], ["guan_yu_red_card_attack"]);
  assert.deepEqual(HERO_SKILL_RESPONSE_IDS["zhao-yun"].Braveheart, ["zhao_yun_dodge_as_attack", "zhao_yun_attack_as_dodge"]);
  assert.deepEqual(HERO_SKILL_RESPONSE_IDS["zhen-ji"]["Empress Dowager"], ["zhen_ji_black_card_dodge"]);
  assert.match(gameRoomSource, /setResponseProviderId\(selecting \? responseOption\?\.providerId/);

  const luoshenPayload = {
    code: "SAFE-LUOSHEN-BUSY", status: "playing", maxPlayers: 4, isHost: false, isTestController: true, meId: "p1", myRole: "Rebel", myHeroOptions: [],
    players: [{ id: "p1", name: "Zhen Ji", seat: 0, hero: "zhen-ji", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: false, role: "Rebel" }],
    myHand: [], turnSeat: 0, phase: "response", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Choose whether to use Godess of Luo River", isMyAction: true,
    pending: { kind: "trigger" }, currentAction: { version: 3, kind: "trigger", actorId: "p1", deadline: 0, reason: "Choose whether to use Godess of Luo River", legalActions: ["trigger", "decline_trigger"], triggerEvent: "turn_start", triggerOptions: [{ effectId: "zhen_ji_luoshen", label: "Godess of Luo River", selection: null }], declineAction: "decline_trigger" },
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingBorrowedSword: null, pendingDying: null,
  };
  const luoshenRoom = normalizeRoomData(luoshenPayload);
  const luoshenReadyHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: luoshenRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  const luoshenButton = luoshenReadyHtml.match(/<button[^>]*aria-label="Godess of Luo River"[^>]*>Godess of Luo River<\/button>/)?.[0];
  assert.ok(luoshenButton, "Godess of Luo River remains in the Skills panel");
  assert.doesNotMatch(luoshenButton, /disabled=""/, "a legal turn trigger enables its Skills panel button");
  assert.doesNotMatch(luoshenReadyHtml, />Use Godess of Luo River<\/button>/);
  assert.match(luoshenReadyHtml, />Skip<\/button>/);
  const luoshenBusyHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: luoshenRoom, busy: true, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(luoshenBusyHtml, /<button[^>]*disabled=""[^>]*>Godess of Luo River<\/button>/);
  assert.match(luoshenBusyHtml, /<button[^>]*disabled=""[^>]*>Skip<\/button>/);
  assert.doesNotMatch(luoshenBusyHtml, /Resolving…|Skipping…/);

  const pickerRoom = normalizeRoomData({
    code: "SAFE-PICKER", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "TARGET", seat: 1, hero: "guan-yu", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 0, equipmentCards: [card("armor", "NioShield")], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [], turnSeat: null, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p1", actionReason: "Use Frost Sword", isMyAction: true,
    pending: { kind: "trigger" }, currentAction: { version: 3, kind: "trigger", actorId: "p1", deadline: 0, reason: "Use Frost Sword", legalActions: ["trigger", "decline_trigger"], triggerEvent: "damage_about_to_apply", triggerOptions: [{ effectId: "frost_sword_damage_about_to_apply", label: "Use Frost Sword", selection: { type: "target_cards", targetId: "p2", min: 1, max: 2, eligibleKeys: ["hand:3", "hand:0", "hand:1", "hand:2", "not-eligible", "armor"] } }], declineAction: "decline_trigger" },
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingBorrowedSword: null, pendingDying: null,
  });
  const pickerHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: pickerRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.equal((pickerHtml.match(/aria-label="Hidden hand card \d+"/g) ?? []).length, 4, "target_cards renders every eligible hidden hand key without using handCount");
  assert.equal((pickerHtml.match(/class="target-card-picker-card concealed-card/g) ?? []).length, 4, "hidden hand buttons use the picker-specific concealed-card class");
  assert.doesNotMatch(pickerHtml, /class="target-card-picker-card hidden(?:\s|[^"]*")/, "hidden hand buttons do not use Tailwind's standalone hidden class");
  assert.match(pickerHtml, /aria-label="Nio Shield/);
  assert.doesNotMatch(pickerHtml, /aria-label="not-eligible"/);
  const pickerBusyHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: pickerRoom, busy: true, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(pickerBusyHtml, /<button[^>]*disabled=""[^>]*>Skip<\/button>/);
  assert.match(pickerBusyHtml, /<button[^>]*disabled=""[^>]*>Use Frost Sword<\/button>/);
  assert.doesNotMatch(pickerBusyHtml, /Resolving…|Skipping…/);

  const choicePayload = {
    code: "SAFE-CHOICE", status: "playing", maxPlayers: 4, isHost: false, isTestController: true, meId: "p2", myRole: "Rebel", myHeroOptions: [],
    players: [
      { id: "p1", name: "ATTACKER", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "TARGET", seat: 1, hero: "zhen-ji", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 2, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [card("target-hand-0"), card("target-hand-1")], turnSeat: 0, phase: "response", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: false, actionPlayerId: "p2", actionReason: "Choose how to resolve Yin-Yang Swords", isMyAction: true,
    pending: { kind: "trigger" }, currentAction: { version: 3, kind: "trigger", actorId: "p2", deadline: 0, reason: "Choose how to resolve Yin-Yang Swords", legalActions: ["trigger"], triggerEvent: "attack_targeted", triggerOptions: [{ effectId: "yin_yang_swords_attack_targeted", label: "Yin-Yang Swords", allowDecline: false, timeoutChoiceId: "draw", selection: { type: "choice", choices: [{ id: "discard", label: "Discard 1 hand card" }, { id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: ["hand:0", "hand:1"] } }] },
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null, pendingNegation: null, pendingHarvest: null, pendingTargetCard: null, pendingBorrowedSword: null, pendingDying: null,
  };
  const choiceRoom = normalizeRoomData(choicePayload);
  const choiceHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: choiceRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(choiceHtml, /class="target-card-picker-panel choice-trigger-panel/);
  assert.match(choiceHtml, /YIN-YANG SWORDS/);
  assert.match(choiceHtml, /Discard 1 hand card/);
  assert.match(choiceHtml, /Allow attacker to draw 1 card/);
  assert.doesNotMatch(choiceHtml, /aria-label="Hidden hand card \d+"/, "hand cards stay hidden until discard is chosen");
  assert.doesNotMatch(choiceHtml, />Yin-Yang Swords<\/button>/, "mandatory choices open without a trigger activation button");
  assert.doesNotMatch(choiceHtml, /Skip/, "mandatory Yin-Yang choice has no Skip action");
  const choiceBusyHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: choiceRoom, busy: true, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(choiceBusyHtml, /<button[^>]*disabled=""[^>]*>Confirm choice<\/button>/);
  assert.doesNotMatch(choiceBusyHtml, /Resolving…|Skipping…/);

  const triumphantPayload = normalizeRoomData({ ...choicePayload, meId: "p1", myRole: "Lord", actionPlayerId: "p1", actionReason: "Triumphant", isMyAction: true, currentAction: { ...choicePayload.currentAction, actorId: "p1", reason: "Triumphant", legalActions: ["trigger", "decline_trigger"], triggerOptions: [{ effectId: "hua_xiong_triumphant", label: "Triumphant", allowDecline: true, selection: { type: "choice", choices: [{ id: "recover", label: "Recover 1 HP" }, { id: "draw", label: "Draw 1 card" }], eligibleHandKeys: [] } }], declineAction: "decline_trigger" } });
  const triumphantHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: triumphantPayload, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(triumphantHtml, /Recover 1 HP/);
  assert.match(triumphantHtml, /Draw 1 card/);
  assert.match(triumphantHtml, />Skip<\/button>/);
  assert.doesNotMatch(triumphantHtml, /Keep hand — attacker draws 1 card/);

  const discardChoiceHtml = renderToStaticMarkup(React.createElement(MandatoryChoiceDialog, {
    option: choicePayload.currentAction.triggerOptions[0], selection: choicePayload.currentAction.triggerOptions[0].selection, selectedChoice: "discard", selectedKeys: [], disabled: false, error: "",
    hand: choicePayload.myHand,
    onChoice: () => {}, onToggle: () => {}, onConfirm: () => {},
  }));
  assert.equal((discardChoiceHtml.match(/aria-label="Attack [A-Z0-9]+[♠♥♦♣]"/g) ?? []).length, 2, "mandatory discard choice exposes the actor's private hand cards");
  assert.doesNotMatch(discardChoiceHtml, /Hidden hand card|concealed-card|>\?<\/span>/, "mandatory own-hand choices do not use concealed card backs");

  const noHandRoom = normalizeRoomData({
    ...choicePayload,
    code: "SAFE-CHOICE-NO-HAND",
    players: choicePayload.players.map((player) => player.id === "p2" ? { ...player, handCount: 0 } : player),
    myHand: [],
    currentAction: { ...choicePayload.currentAction, triggerOptions: [{ ...choicePayload.currentAction.triggerOptions[0], selection: { type: "choice", choices: [{ id: "draw", label: "Allow attacker to draw 1 card" }], eligibleHandKeys: [] } }] },
  });
  const noHandHtml = renderToStaticMarkup(React.createElement(GameRoom, { room: noHandRoom, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(noHandHtml, /Allow attacker to draw 1 card/);
  assert.doesNotMatch(noHandHtml, /Discard 1 hand card/);
  assert.doesNotMatch(noHandHtml, /Hidden hand card/);
});

test("the implemented Standard hero cards expose their printed English skill metadata", () => {
  const expected = {
    "cao-cao": ["Treachery", "Entourage"],
    simayi: ["Retaliation", "Necromancy"],
    "xiahou-dun": ["Stauchness"],
    "zhang-liao": ["Assault"],
    "xu-chu": ["Bared Bodied"],
    "guo-jia": ["Jealousy of God", "Legacy"],
    "zhen-ji": ["Empress Dowager", "Godess of Luo River"],
    "yue-jin": ["Dauntless"],
    "liu-bei": ["Benevolence", "Influencing"],
    "guan-yu": ["God of War"],
    "zhang-fei": ["Battle Cry"],
    "zhuge-liang": ["Stargazing", "Empty Fortress Strategem"],
    "zhao-yun": ["Braveheart"],
    "ma-chao": ["Horse Riding", "Cavalry"],
    "huang-yueying": ["Cultivation", "Wizardry"],
    "lady-gan": ["Divine Wisdom", "Prudence"],
    "sun-quan": ["Equilibrium", "Deliverance"],
    "gan-ning": ["Ambushment"],
    "lü-meng": ["Composure"],
    "huang-gai": ["Self Sacrifice"],
    "zhou-yu": ["Heroic", "Sowing Distrust"],
    daqiao: ["Captivating", "Deflection"],
    "lu-xun": ["Modesty", "Second Wind"],
    "sun-shangxiang": ["Betrothment", "Daredevil"],
    "hua-tuo": ["First Aid", "Prodigal Healer"],
    "lü-bu": ["Unrivaled"],
    "diao-chan": ["Lust", "Beauty Outshining the Moon"],
    huaxiong: ["Triumphant"],
    "gongsun-zan": ["Militia"],
    "pan-feng": ["Axe of Insanity"],
  };
  for (const [id, names] of Object.entries(expected)) {
    const hero = STANDARD_HEROES.find((candidate) => candidate.id === id);
    assert.ok(hero, `${id} is in the Standard roster`);
    assert.deepEqual(hero.skills.map((skill) => skill.name), names);
    assert.ok(hero.skills.every((skill) => skill.description && !skill.description.includes("metadata pending")), `${id} has printed skill descriptions`);
  }
  const luXun = STANDARD_HEROES.find((hero) => hero.id === "lu-xun");
  assert.deepEqual(luXun?.skills, [
    { name: "Modesty", description: "Passive: You cannot be targeted by [Steal] and [Overindulgence]." },
    { name: "Second Wind", description: "You may draw 1 card when you lose your last hand card." },
  ]);
});

test("a normalized Negation response retains its legal controls", () => {
  const room = normalizeRoomData({
    code: "SAFE3", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [{ id: "p1", name: "ME", seat: 0, hero: "zhang-fei", hp: 3, maxHp: 3, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }],
    myHand: [card("negation", "Negation")], turnSeat: 0, phase: "response", deckCount: 0, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play Negation or pass", isMyAction: true,
    pendingAttack: null, pendingGreenDragon: null, pendingRockCleaving: null, pendingFrostSword: null, pendingDuel: null, pendingGroup: null,
    pending: { kind: "negation" }, currentAction: { version: 1, kind: "negation", actorId: "p1", deadline: 0, reason: "Play Negation or pass", legalActions: ["respond", "decline_response"] },
    pendingNegation: { kind: "negation", sourceId: "p1", actorId: "p1", effectTargetId: "p1", cardName: "Something Out of Nothing", responseTarget: "Something Out of Nothing's effect on ME", negated: false, deadline: 0 },
    pendingHarvest: null, pendingTargetCard: null, pendingDying: null,
  });
  assert.ok(room?.pendingNegation, "the normalizer must keep a valid public Negation DTO");
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(html, /Play Negation/);
  assert.match(html, />Skip<\/button>/);
  assert.doesNotMatch(html, /Waiting for the latest response state/);
});

test("Qixi active-skill activation has a safe empty-selection render contract", () => {
  const selection = normalizeActiveCardSkillSelection({ type: "cards", min: 1, max: 1, eligibleCardIds: ["qixi-black"], targetIds: ["p2"] });
  assert.deepEqual(selection, { min: 1, max: 1, eligibleCardIds: ["qixi-black"], targetIds: ["p2"], targetMin: 1, targetMax: 1 });
  assert.ok(selection);
  assert.deepEqual(buildActiveSkillSubmission("gan_ning_qixi", selection, { revision: "qixi-revision", effectId: "gan_ning_qixi", cardIds: [], targetIds: [] }), { providerId: "gan_ning_qixi", cardIds: [] }, "the zero-selection intermediate state is safe");
  assert.deepEqual(buildActiveSkillSubmission("gan_ning_qixi", selection, { revision: "qixi-revision", effectId: "gan_ning_qixi", cardIds: ["qixi-black"], targetIds: ["p2"] }), { providerId: "gan_ning_qixi", cardIds: ["qixi-black"], targetId: "p2" });

  const room = normalizeRoomData({
    code: "QIXUI", status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
    players: [
      { id: "p1", name: "GAN NING", seat: 0, hero: "gan-ning", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
      { id: "p2", name: "TARGET", seat: 1, hero: "liu-bei", hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [{ id: "target-weapon", kind: "BlueSteelSword", suit: "♠", rank: "Q" }], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
    ],
    myHand: [{ id: "qixi-black", kind: "BorrowedSword", suit: "♣", rank: "K" }], turnSeat: 0, phase: "play", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards or finish the Play Phase", isMyAction: true,
    currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards or finish the Play Phase", legalActions: ["trigger"], triggerOptions: [{ effectId: "gan_ning_qixi", label: "Ambushment", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: ["qixi-black"], targetIds: ["p2"] } }] },
  });
  assert.ok(room);
  const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
  assert.match(html, /aria-label="Ambushment"[^>]*>/, "Ambushment is rendered from the semantic option");
  assert.match(html, /data-hand-card-id="qixi-black"[\s\S]*class="game-card borrowedsword black-suit/, "the legal black hand card is rendered");
  assert.match(html, /data-player-anchor="p2"[\s\S]*aria-label="Inspect TARGET"/, "the legal opponent is rendered for targeting after activation");
  assert.doesNotMatch(html, /Use Ambushment/, "the inactive skill does not render its submit control before activation");
});

test("every card-and-target active hero skill has a valid empty-selection UI contract", () => {
  const activeSkills = [
    { hero: "liu-bei", skill: "Benevolence", effectId: "liu_bei_rende", label: "Benevolence", cardIds: ["rende-card"], targetIds: ["p2"], min: 1, max: 2, targetMin: 1, targetMax: 1 },
    { hero: "gan-ning", skill: "Ambushment", effectId: "gan_ning_qixi", label: "Ambushment", cardIds: ["qixi-card"], targetIds: ["p2"], min: 1, max: 1, targetMin: 1, targetMax: 1 },
    { hero: "diao-chan", skill: "Lust", effectId: "diao_chan_lust", label: "Lust", cardIds: ["lust-card"], targetIds: ["p2", "p3"], min: 1, max: 1, targetMin: 2, targetMax: 2 },
    { hero: "hua-tuo", skill: "Prodigal Healer", effectId: "hua_tuo_prodigal_healer", label: "Prodigal Healer", cardIds: ["hua-card"], targetIds: ["p2"], min: 1, max: 1, targetMin: 1, targetMax: 1 },
    { hero: "sun-shangxiang", skill: "Betrothment", effectId: "sun_shangxiang_betrothment", label: "Betrothment", cardIds: ["sun-card-a", "sun-card-b"], targetIds: ["p2"], min: 2, max: 2, targetMin: 1, targetMax: 1 },
  ];

  for (const activeSkill of activeSkills) {
    const selection = normalizeActiveCardSkillSelection({
      type: "cards", min: activeSkill.min, max: activeSkill.max,
      eligibleCardIds: activeSkill.cardIds, targetIds: activeSkill.targetIds,
      targetMin: activeSkill.targetMin, targetMax: activeSkill.targetMax,
    });
    assert.ok(selection, `${activeSkill.effectId} has a normalized selection`);
    assert.deepEqual(buildActiveSkillSubmission(activeSkill.effectId, selection, { revision: "empty", effectId: activeSkill.effectId, cardIds: [], targetIds: [] }), { providerId: activeSkill.effectId, cardIds: [] }, `${activeSkill.effectId} does not require a card or target during activation`);

    const room = normalizeRoomData({
      code: `ACTIVE-${activeSkill.effectId}`, status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
      players: [
        { id: "p1", name: "ACTIVE HERO", seat: 0, hero: activeSkill.hero, hp: 4, maxHp: 4, alive: true, connected: true, handCount: activeSkill.cardIds.length, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" },
        { id: "p2", name: "TARGET ONE", seat: 1, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" },
        { id: "p3", name: "TARGET TWO", seat: 2, hero: "sun-quan", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Spy" },
      ],
      myHand: activeSkill.cardIds.map((id, index) => card(id, index % 2 ? "Dodge" : "Attack")), turnSeat: 0, phase: "play", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards or use a hero skill", isMyAction: true,
      currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards or use a hero skill", legalActions: ["trigger"], triggerOptions: [{ effectId: activeSkill.effectId, label: activeSkill.label, selection: { type: "cards", min: activeSkill.min, max: activeSkill.max, eligibleCardIds: activeSkill.cardIds, targetIds: activeSkill.targetIds, targetMin: activeSkill.targetMin, targetMax: activeSkill.targetMax } }] },
    });
    assert.ok(room, `${activeSkill.effectId} room normalizes`);
    const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
    assert.match(html, new RegExp(`aria-label="${activeSkill.skill}"`), `${activeSkill.effectId} skill button renders`);
    assert.match(html, new RegExp(`data-hand-card-id="${activeSkill.cardIds[0]}"`), `${activeSkill.effectId} eligible card renders`);
    assert.match(html, /data-player-anchor="p2"/, `${activeSkill.effectId} target board renders`);
    assert.doesNotMatch(html, /GAME SCREEN ERROR|Previous game data is no longer compatible/, `${activeSkill.effectId} does not render recovery UI`);
  }

  assert.match(gameRoomSource, /const presentationBusy = Boolean\(optimisticPlay \|\| activeEvent \|\| eventQueue\.length/);
  assert.match(gameRoomSource, /const activeSkillTargetIds = activeSkillSelection\?\.targetIds \?\? activeSkillTargetSelection\?\.targetIds \?\? \[\]/);
  assert.match(gameRoomSource, /const activeSkillSelectedTargetIds = activeSkillStateIsCurrent \? \(activeSkillSelectionState\?\.targetIds \?\? \[\]\)/);

  for (const conversion of [
    { hero: "guan-yu", skill: "God of War", cardId: "wusheng-card", canPlayAs: "attack" },
    { hero: "zhao-yun", skill: "Braveheart", cardId: "longdan-card", canPlayAs: "attack" },
  ]) {
    const room = normalizeRoomData({
      code: `CONVERSION-${conversion.hero}`, status: "playing", maxPlayers: 4, isHost: true, isTestController: true, meId: "p1", myRole: "Lord", myHeroOptions: [],
      players: [{ id: "p1", name: "CONVERSION HERO", seat: 0, hero: conversion.hero, hp: 4, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: null, isHost: true, role: "Lord" }, { id: "p2", name: "TARGET", seat: 1, hero: "liu-bei", hp: 3, maxHp: 4, alive: true, connected: true, handCount: 1, equipmentCards: [], judgementCards: [], attackRange: 1, distance: 1, isHost: false, role: "Rebel" }],
      myHand: [card(conversion.cardId, "Dodge")], turnSeat: 0, phase: "play", deckCount: 20, discardTop: null, log: [], timeline: [], isMyTurn: true, actionPlayerId: "p1", actionReason: "Play cards", isMyAction: true,
      currentAction: { version: 3, kind: "turn", actorId: "p1", deadline: 0, reason: "Play cards", legalActions: ["play_card"], canDeclareAttack: true, playPhaseActions: [{ cardId: conversion.cardId, canPlayAs: conversion.canPlayAs }] },
    });
    const html = renderToStaticMarkup(React.createElement(GameRoom, { room, busy: false, error: "", onAction: async () => true, onLeave: () => {} }));
    assert.match(html, new RegExp(`aria-label="${conversion.skill}"`), `${conversion.hero} conversion skill renders`);
    assert.match(html, new RegExp(`data-hand-card-id="${conversion.cardId}"`), `${conversion.hero} conversion card renders`);
    assert.doesNotMatch(html, /GAME SCREEN ERROR|Previous game data is no longer compatible/);
  }
});
