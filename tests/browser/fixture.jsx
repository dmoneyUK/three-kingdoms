import React from "react";
import { createRoot } from "react-dom/client";
import { GameRoom } from "../../app/page.tsx";
import { normalizeRoomData } from "../../game/room-safety.js";
import "../../app/globals.css";
import "../../app/sequence-overrides.css";

const HERO_IDS = [
  "cao-cao", "liu-bei", "sun-quan", "simayi", "xiahou-dun",
  "zhang-liao", "zhang-fei", "zhen-ji", "xu-chu", "guo-jia",
];

const card = (id, kind, suit = "♠", rank = "A") => ({ id, kind, suit, rank });

const SEAT_EQUIPMENT_CASES = {
  empty: [],
  weapon: [["ZhugeCrossbow", "♦", "A"]],
  armor: [["NioShield", "♣", "2"]],
  plusHorse: [["Shadowrunner", "♠", "5"]],
  minusHorse: [["FerganaSteed", "♠", "K"]],
  weaponArmor: [["ZhugeCrossbow", "♦", "A"], ["NioShield", "♣", "2"]],
  multiple: [["ZhugeCrossbow", "♦", "A"], ["NioShield", "♣", "2"], ["Shadowrunner", "♠", "5"], ["FerganaSteed", "♠", "K"]],
};
const SEAT_EQUIPMENT_MATRIX = ["weapon", "armor", "plusHorse", "minusHorse", "weaponArmor", "multiple"];

function fixtureSeatEquipment(playerId, equipmentCase) {
  const playerIndex = Number(playerId.slice(1)) - 2;
  const scenario = equipmentCase === "matrix" ? SEAT_EQUIPMENT_MATRIX[playerIndex] : playerId === "p2" ? equipmentCase : null;
  return (SEAT_EQUIPMENT_CASES[scenario] ?? []).map(([kind, suit, rank], index) => card(`browser-${playerId}-seat-equipment-${index}`, kind, suit, rank));
}

function semanticSnapshot({ state, playerIds, stage, sourceId, targetIds, originalTargetIds = targetIds, activeTargetIds = targetIds, decisionActorId, currentParticipantId = decisionActorId, activeResolverId = decisionActorId, viewerId = decisionActorId, localControlActorId = decisionActorId, effectOverride = null, childFrame = false, rootOrigin = null, groupProgressCase = null, orderedProgressCase = null, bumperHarvestProgressCase = null, bumperHarvestTargetIds = null, stableKindOverride = null, negationHistoryCase = null, rootCardMissing = false, negationSettlementOutcome = null }) {
  const interactionId = `browser-${state}-interaction`;
  const rootFrameId = `browser-${state}-root`;
  const progressCase = orderedProgressCase ?? groupProgressCase;
  const hasRootProgress = Boolean(progressCase || bumperHarvestProgressCase);
  const activeFrameId = state.startsWith("oath-negation") || state === "active-negation-open" ? rootFrameId : childFrame || !hasRootProgress ? `browser-${state}-active` : rootFrameId;
  const checkpointId = `browser-${state}-checkpoint`;
  const negationNodeCount = negationHistoryCase === "single" || negationHistoryCase === "single-unknown-actor" ? 1 : negationHistoryCase === "long" ? 5 : negationHistoryCase ? 2 : 0;
  const negationNodes = Array.from({ length: negationNodeCount }, (_, index) => ({
    nodeId: `browser-${state}-negation-${index + 1}`,
    interactionId,
    frameId: activeFrameId,
    causedByNodeId: index === 0 ? null : negationHistoryCase === "invalid-link" ? "missing-predecessor" : `browser-${state}-negation-${index}`,
    actorId: negationHistoryCase === "single-unknown-actor" && index === 0 ? "missing-player" : index % 2 === 0 ? "p1" : "p2",
    kind: "CARD_PLAY",
    object: { type: "card", cardKind: "Negation" },
  }));
  const participantIds = [...new Set([sourceId, ...originalTargetIds, ...activeTargetIds, currentParticipantId, decisionActorId, activeResolverId].filter(Boolean))];
  const scene = {
    semantics: "PROVEN",
    interactionId,
    rootFrameId,
    activeFrameId,
    parentFrameId: childFrame ? rootFrameId : null,
    checkpointId,
    presentationRevision: 1,
    stage,
    sourceId,
    effect: effectOverride === "none" ? null : effectOverride ?? (stage === "NEGATION" ? "Dismantle" : stage === "DUEL_EXCHANGE" ? "Duel" : stage === "JUDGEMENT" ? "Overindulgence" : stage === "DYING" ? "Attack" : stage === "GROUP_RESOLUTION" ? "Raining Arrows" : "Attack"),
    targetIds: originalTargetIds,
    activeTargetIds,
    currentParticipantId,
    decisionActorId,
    activeResolverId,
    activeSourceId: sourceId,
    activeTargetIds: targetIds,
    participantIds,
    participantRoles: {
      sourceId,
      originalTargetIds,
      activeTargetIds,
      currentParticipantId,
      decisionActorId,
      activeResolverId,
      parentParticipantId: null,
      participantIds,
    },
    ...(rootOrigin ? { rootOrigin } : {}),
    continuity: { relation: childFrame ? "CHILD_FRAME" : "ROOT_FRAME", parentFrameId: childFrame ? rootFrameId : null },
  };
  return {
    identity: { interactionId, checkpointId, presentationRevision: 1 },
    stable: { kind: stableKindOverride ?? "CHOICE", interactionId, checkpointId, presentationRevision: 1, decisionActorId },
    interaction: scene,
    decision: { actorId: decisionActorId, stage },
    localControl: { source: "CurrentAction", actionRevision: `browser-${state}-action`, kind: state === "dying" ? "dying" : state === "confirm-cancel" ? "borrowed_sword" : state === "pending-target-card" ? "target_card" : state === "picker" || state === "picker-hand-zone" || state === "frost-sword-selectable" || state.startsWith("local-equipment-target-card") || state === "confirm-cancel-skip" || state === "long-guidance" || state === "sun-shangxiang-daredevil" || state === "judgement" || state === "judgement-local" ? "trigger" : state === "duel" || state === "duel-response" || state === "dodge" || state === "dodge-mismatch" || state === "active-attack-observer" || state === "negation" || state === "confirm-skip" || state.startsWith("active-negation-") || state.startsWith("oath-negation") || state.startsWith("bumper-harvest") || state === "provider-extra" || state === "group-observer" || state === "group-unfocused" || state === "group-negation-local" || state === "raining-arrows-response" || state === "raining-arrows-no-dodge" || state === "preview-ack" ? "response" : "turn", actorId: localControlActorId, entitled: viewerId === localControlActorId },
    groupParticipantProgress: progressCase && orderedProgressCase !== "missing" ? {
      cardKind: orderedProgressCase ? "SkyPiercingHalberdAttack" : "RainingArrows",
      resolutionSemantics: orderedProgressCase ? "ORDERED" : "GROUP",
      interactionId: progressCase === "mismatch" ? "other-interaction" : interactionId,
      groupFrameId: progressCase === "mismatch" ? "other-root" : rootFrameId,
      activeFrameId,
      checkpointId,
      presentationRevision: 1,
      targetIds: progressCase === "mismatch" ? [...targetIds].reverse() : [...targetIds],
      currentParticipantId,
      participants: targetIds.map((playerId, index) => ({
        playerId,
        order: index + 1,
        status: playerId === currentParticipantId ? childFrame ? "PAUSED" : "CURRENT" : progressCase === "no-longer" && index === targetIds.length - 1 ? "NO_LONGER_APPLICABLE" : index < targetIds.indexOf(currentParticipantId) ? "RESOLVED" : "PENDING",
        ...((index === 0 && progressCase === "avoided") ? { outcome: "AVOIDED" } : {}),
        ...((index === 0 && progressCase === "damaged") ? { outcome: "DAMAGED" } : {}),
        ...((index === 0 && progressCase === "negated") ? { outcome: "NEGATED" } : {}),
        ...((index === 0 && progressCase === "defeated") ? { outcome: "DEFEATED" } : {}),
      })),
    } : null,
    bumperHarvestProgress: bumperHarvestProgressCase ? {
      semantics: "PROVEN",
      interactionId,
      rootFrameId,
      activeFrameId,
      checkpointId,
      presentationRevision: 1,
      sourceId,
      targetIds: [...(bumperHarvestTargetIds ?? originalTargetIds)],
      currentParticipantId,
      participants: (bumperHarvestTargetIds ?? originalTargetIds).map((playerId, index, participantIds) => {
        const currentIndex = participantIds.indexOf(currentParticipantId);
        const complete = bumperHarvestProgressCase === "complete";
        const noLonger = complete && playerId === participantIds[2];
        const resolved = complete || index < currentIndex;
        const outcome = complete
          ? index === 1 ? "NEGATED" : noLonger ? undefined : "CHOSE_CARD"
          : bumperHarvestProgressCase === "returned" && index === 1 ? "NEGATED" : resolved ? "CHOSE_CARD" : undefined;
        const status = noLonger ? "NO_LONGER_APPLICABLE" : playerId === currentParticipantId ? "CURRENT" : resolved ? "RESOLVED" : "PENDING";
        return { playerId, order: index + 1, status, ...(status === "RESOLVED" && outcome ? { outcome } : {}) };
      }),
    } : null,
    reactionChain: negationNodeCount > 0 || state === "active-negation-open" ? {
      semantics: "PROVEN",
      interactionId,
      frameId: negationHistoryCase === "frame-mismatch" ? `${activeFrameId}-other` : activeFrameId,
      nodes: negationNodes,
      ...(state === "active-negation-open" && !rootCardMissing ? { rootCard: { interactionId, frameId: activeFrameId, sourceId, targetId: targetIds[0], cardKind: sourceId === targetIds[0] ? "DrawTwo" : "Dismantle" } } : {}),
    } : null,
    settlement: negationSettlementOutcome ? {
      semantics: "PROVEN",
      outcome: negationSettlementOutcome,
      eventId: `browser-${state}-negation-settlement`,
      interactionId,
      rootFrameId,
      checkpointId,
      presentationRevision: 1,
      resolutionId: `browser-${state}-negation-resolution`,
      rootCardKind: sourceId === originalTargetIds[0] ? "DrawTwo" : "Dismantle",
      sourceId,
      targetId: originalTargetIds[0],
    } : null,
    transitionEvents: [],
  };
}

function currentActionFor(state, actorId, handCardId, { targetHandCount = 4, targetCardCase = "valid", targetCardKind = "Dismantle" } = {}) {
  if (state === "stargazing-offer") return {
    version: 3, kind: "trigger", actorId, deadline: 0, reason: "You may use Stargazing", legalActions: ["trigger", "decline_trigger"], declineAction: "decline_trigger",
    triggerOptions: [{ effectId: "zhuge_liang_stargazing", label: "Stargazing", description: "Privately reorder the top cards of the deck." }],
  };
  if (state === "judgement" || state === "judgement-local") return {
    version: 3, kind: "trigger", actorId, deadline: 0, reason: "Resolve the current Judgement", legalActions: [],
  };
  if (state === "active-attack-observer" || state === "target-shift-attack") return {
    version: 3, kind: "response", actorId, deadline: 0, reason: "Waiting for the current Attack response", legalActions: [],
  };
  if (state.startsWith("active-negation-")) return {
    version: 3, kind: "response", actorId, deadline: 0, reason: "Waiting for the current Negation response", legalActions: [],
  };
  if (state === "borrowed-sword-play" || state === "borrowed-sword-no-target") return {
    version: 3, kind: "turn", actorId, deadline: 0, reason: "Choose a Borrowed Sword target", legalActions: ["play_card", "end_turn"], canDeclareAttack: true,
    borrowedSwordTargets: [{ cardId: handCardId, targetIds: state === "borrowed-sword-play" ? ["p2"] : [] }],
  };
  if (state === "self-target-trigger") return {
    version: 3, kind: "trigger", actorId, deadline: 0, reason: "Choose one target for the projected trigger", legalActions: ["trigger", "decline_trigger"], declineAction: "decline_trigger",
    triggerOptions: [{ effectId: "browser_projected_target", label: "Projected Target", selection: { type: "target", targetIds: ["p1", "p2", "p3"], min: 1, max: 1 } }],
  };
  if (state === "multi-target-trigger") return {
    version: 3, kind: "trigger", actorId, deadline: 0, reason: "Choose up to three projected targets", legalActions: ["trigger", "decline_trigger"], declineAction: "decline_trigger",
    triggerOptions: [{ effectId: "browser_multi_target", label: "Multi Target", selection: { type: "target", targetIds: ["p2", "p3", "p4"], min: 1, max: 3 } }],
  };
  if (state === "self-target-skill" || state === "self-target-skill-no-self") return {
    version: 3, kind: "turn", actorId, deadline: 0, reason: "Choose one legal target for Prodigal Healer", legalActions: ["trigger", "end_turn"],
    triggerOptions: [{ effectId: "hua_tuo_prodigal_healer", label: "Prodigal Healer", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId], targetIds: state === "self-target-skill" ? ["p1", "p2"] : ["p2"], targetMin: 1, targetMax: 1 } }],
  };
  if (state === "sun-shangxiang-daredevil") return {
    version: 3, kind: "trigger", actorId, deadline: 0, reason: "Draw two cards after losing equipment, or skip", legalActions: ["trigger", "decline_trigger"], declineAction: "decline_trigger",
    triggerOptions: [{ effectId: "sun_shangxiang_daredevil", label: "Daredevil", allowDecline: true }],
  };
  if (state === "ma-chao-cavalry") return {
    version: 3, kind: "trigger", actorId, deadline: 0, reason: "Ma Chao may use Cavalry, or skip", legalActions: ["trigger", "decline_trigger"], declineAction: "decline_trigger",
    triggerOptions: [{ effectId: "ma_chao_cavalry", label: "Cavalry — enter Judgement", allowDecline: true }],
  };
  if (state === "sun-shangxiang-inactive") return currentActionFor("normal", actorId, handCardId);
  if (state === "confirm-cancel") return { version: 3, kind: "borrowed_sword", actorId, deadline: 0, reason: "Choose a target for the forced Attack", legalActions: ["choose_borrowed_sword_target"] };
  if (state === "confirm-cancel-skip" || state === "long-guidance") return {
    version: 3, kind: "trigger", actorId, deadline: 0, reason: "Choose one living opponent for Assault", legalActions: ["trigger", "decline_trigger"], declineAction: "decline_trigger",
    triggerOptions: [{ effectId: "zhang_liao_assault", label: "Assault", description: state === "long-guidance" ? "Choose one living opponent within the projected legal target set, review the selected target and any selected cost cards, then confirm the Assault effect; cancel the local selection to choose a different opponent before submitting." : "Choose one living opponent", selection: { type: "target", targetIds: ["p2", "p3"], min: 1, max: 1 } }],
  };
  if (state === "provider-extra") return { version: 3, kind: "response", actorId, deadline: 0, reason: "Choose an Attack response provider", legalActions: ["respond", "decline_response"], requirement: "attack", options: [{ providerId: "browser_explicit_attack", label: "Alternate Attack", satisfies: "attack", activation: "explicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId] } }] };
  if (state === "raining-arrows-response" || state === "raining-arrows-no-dodge") {
    const hasDodgeProvider = state === "raining-arrows-response";
    return {
      version: 3,
      kind: "response",
      actorId,
      deadline: 0,
      reason: "Respond to Raining Arrows",
      legalActions: hasDodgeProvider ? ["respond", "decline_response"] : ["decline_response"],
      requirement: "dodge",
      options: hasDodgeProvider ? [{ providerId: "dodge_card", label: "Dodge", satisfies: "dodge", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId] } }] : [],
    };
  }
  if (state === "group-observer" || state === "group-unfocused") {
    return {
      version: 3,
      kind: "response",
      actorId,
      deadline: 0,
      reason: "Waiting for the current Raining Arrows participant",
      legalActions: [],
    };
  }
  if (state === "normal" || state === "interaction" || state === "group" || state === "turn-play-end") {
    return {
      version: 3,
      kind: "turn",
      actorId,
      deadline: 0,
      reason: "Play cards",
      legalActions: ["play_card", "end_turn"],
      canDeclareAttack: true,
    };
  }
  if (state === "duel" || state === "duel-response") {
    return {
      version: 3,
      kind: "response",
      actorId,
      deadline: 0,
      reason: "Respond to Duel",
      legalActions: ["respond", "decline_response"],
      requirement: "attack",
      options: [{ providerId: "attack_card", label: "Attack", satisfies: "attack", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId] } }],
    };
  }
  if (state === "dodge" || state === "dodge-mismatch") {
    return {
      version: 3,
      kind: "response",
      actorId,
      deadline: 0,
      reason: "Dodge the Attack",
      legalActions: ["respond", "decline_response"],
      requirement: "dodge",
      options: [{ providerId: "dodge_card", label: "Dodge", satisfies: state === "dodge-mismatch" ? "attack" : "dodge", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId] } }],
    };
  }
  if (state === "negation" || state === "confirm-skip") {
    return {
      version: 3,
      kind: "response",
      actorId,
      deadline: 0,
      reason: "Play Negation to cancel Dismantle, or pass",
      legalActions: ["respond", "decline_response"],
      requirement: "negate",
      options: [{ providerId: "negation_card", label: "Negation", satisfies: "negate", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId] } }],
    };
  }
  if (state === "pending-target-card") {
    const handKeys = targetCardCase === "out-of-range"
      ? ["hand:99"]
      : Array.from({ length: targetHandCount }, (_, index) => `hand:${index}`);
    const eligibleKeys = [...handKeys, "browser-target-equipment", "browser-target-judgement"];
    return {
      version: 3,
      kind: "target_card",
      actorId,
      deadline: 0,
      reason: "Choose one card from the target's current zones",
      legalActions: ["choose_target_card"],
      ...(targetCardCase === "missing-projection" ? {} : { targetCardSelection: { targetId: "p2", eligibleKeys } }),
    };
  }
  if (state === "picker") {
    return {
      version: 3,
      kind: "trigger",
      actorId,
      deadline: 0,
      reason: "Choose a target card",
      legalActions: ["trigger", "decline_trigger"],
      triggerOptions: [{ effectId: "browser-target-card", label: "Retaliation", selection: { type: "target_cards", targetId: "p1", min: 1, max: 1, eligibleKeys: ["hand:0", "hand:1"] } }],
      declineAction: "decline_trigger",
    };
  }
  if (state === "fanjian-selectable") {
    return {
      version: 3,
      kind: "trigger",
      actorId,
      deadline: 0,
      reason: "Choose one hidden card from Zhou Yu's hand",
      legalActions: ["trigger", "decline_trigger"],
      triggerOptions: [{
        effectId: "zhou_yu_fanjian_choice",
        label: "Sowing Distrust — choose a hidden card",
        description: "Choose one anonymous card from Zhou Yu's hand.",
        selection: {
          type: "target_cards",
          targetId: "p1",
          min: 1,
          max: 1,
          eligibleKeys: Array.from({ length: targetHandCount }, (_, index) => `hand:${index}`),
        },
      }],
      declineAction: "decline_trigger",
    };
  }
  if (state === "kirin-bow-selectable") {
    const eligibleKeys = targetCardCase === "unprojected"
      ? ["browser-unprojected-mount"]
      : ["browser-kirin-bow-offensive-mount", "browser-kirin-bow-defensive-mount"];
    return {
      version: 3,
      kind: "trigger",
      actorId,
      deadline: 0,
      reason: "Choose an eligible Mount to discard with Kirin Bow",
      legalActions: ["trigger", "decline_trigger"],
      triggerEvent: "damage_about_to_apply",
      triggerOptions: [{
        effectId: "kirin_bow_damage_about_to_apply",
        label: "Use Kirin Bow",
        selection: { type: "target_cards", targetId: "p1", min: 1, max: 1, eligibleKeys },
      }],
      declineAction: "decline_trigger",
    };
  }
  if (state === "picker-hand-zone") {
    return {
      version: 3,
      kind: "trigger",
      actorId,
      deadline: 0,
      reason: "Choose where to obtain a card",
      legalActions: ["trigger", "decline_trigger"],
      triggerOptions: [{ effectId: "browser_retaliation_zone", label: "Retaliation", selection: { type: "target_cards", targetId: "p1", min: 1, max: 1, eligibleKeys: ["hand", "browser-public-equipment", "browser-public-judgement"] } }],
      declineAction: "decline_trigger",
    };
  }
  if (state.startsWith("local-equipment-target-card")) {
    const eligibleKeys = targetCardCase === "mixed"
      ? ["browser-local-equipment-eligible", "hand"]
      : targetCardCase === "unprojected"
        ? ["browser-unprojected-equipment"]
        : ["browser-local-equipment-eligible"];
    return {
      version: 3,
      kind: "trigger",
      actorId,
      deadline: 0,
      reason: "Choose one currently equipped card",
      legalActions: ["trigger", "decline_trigger"],
      triggerOptions: [{ effectId: "yue_jin_dauntless", label: "Dauntless", selection: { type: "target_cards", targetId: "p1", min: 1, max: 1, eligibleKeys } }],
      declineAction: "decline_trigger",
    };
  }
  if (state === "frost-sword-selectable") {
    const handKeys = targetCardCase === "out-of-range"
      ? ["hand:99"]
      : Array.from({ length: targetHandCount }, (_, index) => `hand:${index}`);
    const eligibleKeys = targetCardCase === "duplicate-position"
      ? ["hand:0", "hand:0", "browser-public-equipment"]
      : [...handKeys, "browser-public-equipment"];
    return {
      version: 3,
      kind: "trigger",
      actorId,
      deadline: 0,
      reason: "Choose target cards for Frost Sword",
      legalActions: ["trigger", "decline_trigger"],
      triggerOptions: [{ effectId: "frost_sword_damage_about_to_apply", label: "Use Frost Sword", selection: { type: "target_cards", targetId: "p1", min: 1, max: 2, eligibleKeys } }],
      declineAction: "decline_trigger",
    };
  }
  return {
    version: 3,
    kind: "dying",
    actorId,
    deadline: 0,
    reason: "Decide whether to give Peach",
    legalActions: ["give_peach", "skip_rescue"],
    requirement: "peach",
    options: [{ providerId: "peach_card", label: "Peach", satisfies: "peach", activation: "implicit", selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [handCardId] } }],
  };
}

function browserRoom({ state, count, handSize, targetHandCount, targetCardCase, targetCardKind, equipmentCase, heroOverride, sourceOverride, effectOverride, groupParticipantOverride, groupProgressCase, groupRootOriginCase, orderedProgressCase, negationHistoryCase, rootCardMissing, targetShiftCase, timedResponse, timedObserver, duelObserver, duelParticipantMissing, dyingParticipantCase, judgementParticipantCase, privateNegationResponder, negationAuthority, negationSettlementOutcome }) {
  const judgementStage = state === "judgement" || state === "judgement-local";
  const ordinaryTurn = state === "ordinary-turn";
  const borrowedSwordFixture = state === "borrowed-sword-play" || state === "borrowed-sword-no-target";
  const borrowedSwordActiveFixture = state.startsWith("borrowed-sword-active");
  const borrowedSwordRootOrigin = state === "borrowed-sword-active" || state === "borrowed-sword-active-two-player"
    ? { frameId: `browser-${state}-root`, stage: "NEGATION", sourceId: "p1", effect: "Borrowed Sword", targetIds: ["p2"] }
    : state === "borrowed-sword-active-mismatch-root"
      ? { frameId: `browser-${state}-root`, stage: "NEGATION", sourceId: "p1", effect: "Borrowed Sword", targetIds: ["p4"] }
      : null;
  const selfTargetFixture = state === "self-target-skill" || state === "self-target-skill-no-self" || state === "self-target-trigger" || state === "multi-target-trigger";
  const timedNegationObserver = timedObserver && state === "negation";
  const duelObserverView = duelObserver && state === "duel";
  const selfTargetTriggerFixture = state === "self-target-trigger" || state === "multi-target-trigger";
  if (ordinaryTurn) state = "normal";
  const hasLocalJudgementFixture = ["local-judgement-empty", "local-judgement-one", "local-judgement-two"].includes(state);
  const localJudgementCount = state === "local-judgement-one" ? 1 : state === "local-judgement-two" ? 2 : 0;
  if (hasLocalJudgementFixture) state = "normal";
  const denseGroup = state === "group-density";
  const unfocusedGroup = state === "group-unfocused";
  const groupNegationLocalFixture = state === "group-negation-local";
  const groupNegationFixture = state === "group-negation" || groupNegationLocalFixture;
  const rainingArrowsResponseFixture = state === "raining-arrows-response" || state === "raining-arrows-no-dodge";
  const oathNegationFixture = state.startsWith("oath-negation");
  const oathNegationLocalFixture = state === "oath-negation-local";
  const oathNegationSourceViewer = state === "oath-negation-source-viewer";
  const denseOathScope = state === "oath-negation-dense";
  const bumperHarvestFixture = state.startsWith("bumper-harvest");
  const bumperHarvestLocalFixture = state === "bumper-harvest-open-local";
  const bumperHarvestSourceViewer = state === "bumper-harvest-source-viewer";
  const bumperHarvestChild = state === "bumper-harvest-open" || bumperHarvestLocalFixture || state === "bumper-harvest-branch" || state === "bumper-harvest-dense";
  const bumperHarvestComplete = state === "bumper-harvest-complete";
  const bumperHarvestUnproven = state === "bumper-harvest-unproven";
  if (denseGroup) state = "group-observer";
  const activeNegationObserver = state.startsWith("active-negation-");
  const targetShiftFixture = state === "target-shift-attack";
  const frostSwordSelectionFixture = state === "frost-sword-selectable";
  const kirinBowSelectionFixture = state === "kirin-bow-selectable";
  const playerIds = Array.from({ length: count }, (_, index) => `p${index + 1}`);
  const bumperCurrentId = bumperHarvestComplete ? null : state === "bumper-harvest-returned" ? playerIds[2] ?? playerIds[1] : state === "bumper-harvest-dense" ? playerIds[playerIds.length - 2] : playerIds[1];
  const meId = bumperHarvestSourceViewer || oathNegationSourceViewer ? "p1" : bumperHarvestLocalFixture || oathNegationLocalFixture ? "p3" : groupNegationLocalFixture ? "p1" : bumperHarvestFixture ? "p4" : activeNegationObserver || timedNegationObserver ? "p4" : duelObserverView ? "p3" : judgementStage ? state === "judgement-local" ? "p1" : "p4" : borrowedSwordActiveFixture ? count === 2 ? "p1" : "p4" : targetShiftFixture ? count >= 5 ? "p5" : "p3" : frostSwordSelectionFixture || kirinBowSelectionFixture ? "p2" : state === "active-attack-observer" || state === "group-observer" || unfocusedGroup || groupNegationFixture || oathNegationFixture ? "p3" : state === "duel" || state === "duel-response" || state === "dodge" || state === "dodge-mismatch" || state === "negation" || state === "confirm-skip" || state === "picker" || state === "picker-hand-zone" || state === "fanjian-selectable" ? "p2" : state === "dying" ? "p3" : "p1";
  const actorId = bumperHarvestFixture ? bumperHarvestChild ? "p3" : bumperCurrentId : oathNegationFixture ? oathNegationLocalFixture ? "p3" : "p2" : timedNegationObserver || duelObserverView ? "p2" : judgementStage ? state === "judgement" ? "p3" : "p2" : borrowedSwordActiveFixture ? "p2" : targetShiftFixture ? "p4" : state === "active-attack-observer" ? "p2" : activeNegationObserver ? "p3" : state === "group-observer" || unfocusedGroup || groupNegationFixture ? "p1" : state === "dying" ? "p3" : meId;
  // Geometry-only large-hand fixture; IDs are synthetic, not a dealt deck.
  const hand = timedNegationObserver
    ? []
    : ordinaryTurn
    ? ["Shadowrunner", "Overindulgence", "Negation", "Dodge", "Attack", "Attack"].map((kind, index) => card(`browser-ordinary-${index + 1}`, kind))
    : borrowedSwordFixture
      ? [card("browser-borrowed-sword", "BorrowedSword", "♣", "Q")]
    : state === "normal" && handSize !== null
    ? Array.from({ length: handSize }, (_, index) => card(`browser-hand-${index + 1}`, "Attack"))
    : bumperHarvestFixture
    ? bumperHarvestLocalFixture ? [card("browser-bumper-harvest-private-negation", "Negation", "♣")] : []
    : oathNegationFixture
    ? oathNegationLocalFixture ? [card("browser-oath-private-negation", "Negation", "♣")] : []
    : state === "group-observer" || unfocusedGroup || groupNegationFixture && !groupNegationLocalFixture
    ? []
    : groupNegationLocalFixture
      ? [card("browser-group-negation", "Negation", "♣")]
    : state === "raining-arrows-response"
      ? [card("browser-raining-arrows-dodge", "Dodge", "♣"), card("browser-raining-arrows-unrelated-attack", "Attack", "♠")]
    : state === "raining-arrows-no-dodge"
      ? [card("browser-raining-arrows-unrelated-attack", "Attack", "♠")]
    : state === "duel" || state === "duel-response"
    ? [card("browser-attack", "Attack", "♠")]
    : state === "dodge" || state === "dodge-mismatch"
      ? [card("browser-dodge", "Dodge", "♣")]
    : state === "negation" || state === "confirm-skip"
      ? [card("browser-negation", "Negation", "♣")]
      : state === "dying"
        ? [card("browser-peach", "Peach", "♥")]
        : state === "group"
          ? [card("browser-raining-arrows", "RainingArrows", "♥")]
          : [card("browser-attack", "Attack", "♠"), card("browser-peach", "Peach", "♥")];
  const resolvedGroupProgressCase = groupNegationFixture ? "valid" : groupProgressCase;
  const orderedGroupTargets = orderedProgressCase && state === "group-observer"
    ? ["p2", "p1", "p3"].filter((id) => playerIds.includes(id))
    : groupProgressCase && state === "group-observer"
      ? ["p2", "p1", ...playerIds.filter((id) => id !== "p1" && id !== "p2" && id !== "p4")]
      : null;
  const targets = bumperHarvestFixture ? bumperHarvestChild ? bumperCurrentId ? [bumperCurrentId] : [] : playerIds : denseGroup ? playerIds.filter((id) => id !== "p4") : unfocusedGroup ? ["p1", "p2"] : groupNegationFixture ? ["p1", "p2", "p3"] : rainingArrowsResponseFixture ? playerIds.filter((id) => id !== "p4") : oathNegationFixture ? ["p1"] : state === "active-negation-multi-observer" ? ["p2", "p5"] : activeNegationObserver ? ["p2"] : duelObserverView ? ["p2", "p1"] : judgementStage ? state === "judgement" ? ["p2"] : ["p1"] : state === "group-observer" ? orderedGroupTargets ?? ["p1", "p2", "p3"] : borrowedSwordActiveFixture ? count === 2 ? ["p1"] : ["p3"] : targetShiftFixture ? ["p2"] : frostSwordSelectionFixture ? targetCardCase === "unfocused" ? ["p3"] : ["p1"] : kirinBowSelectionFixture ? targetCardCase === "unfocused" ? ["p3"] : ["p1"] : state === "fanjian-selectable" ? targetCardCase === "unfocused" ? ["p3"] : ["p2"] : state === "dying" ? ["p2"] : state === "group" ? playerIds.filter((id) => id !== "p1") : [state === "duel" || state === "negation" || state === "confirm-skip" ? "p1" : "p2"];
  const standardStage = bumperHarvestFixture ? bumperHarvestChild ? "NEGATION" : "SEQUENTIAL_CHOICE" : state === "duel" || state === "duel-response" ? "DUEL_EXCHANGE" : state === "negation" || state === "confirm-skip" || activeNegationObserver || groupNegationFixture || oathNegationFixture ? "NEGATION" : judgementStage ? "JUDGEMENT" : state === "dying" ? "DYING" : state === "group" || state === "group-observer" || unfocusedGroup || rainingArrowsResponseFixture ? "GROUP_RESOLUTION" : "ATTACK_RESPONSE";
  const stage = orderedProgressCase ? orderedProgressCase === "paused" ? "DAMAGE" : "ATTACK_RESPONSE" : resolvedGroupProgressCase === "paused" ? "DAMAGE" : standardStage;
  const projectedStageTargets = state === "dying" && dyingParticipantCase === "mismatch" ? ["p4"] : targets;
  const projectedCurrentParticipantId = bumperHarvestFixture ? bumperCurrentId : oathNegationFixture ? null
    : kirinBowSelectionFixture ? targetCardCase === "unfocused" ? "p3" : "p1"
    : state === "fanjian-selectable" && targetCardCase === "unfocused" ? "p3"
    : state === "dying" && dyingParticipantCase === "missing"
    ? null
    : judgementStage && judgementParticipantCase === "missing" ? null
      : judgementStage && judgementParticipantCase === "mismatch" ? "p4"
    : targetShiftFixture && targetShiftCase === "missing-current" ? null
    : targetShiftFixture && targetShiftCase === "mismatched-current" ? "p2"
    : targetShiftFixture ? "p4"
    : frostSwordSelectionFixture ? targetCardCase === "unfocused" ? "p3" : "p1"
    : state === "pending-target-card" ? targetCardCase === "unfocused" ? "p1" : "p2"
    : state === "group-observer" && groupParticipantOverride === "none" ? null
      : state === "group-observer" && groupParticipantOverride ? groupParticipantOverride
    : borrowedSwordActiveFixture ? count === 2 ? "p1" : "p3"
    : privateNegationResponder ? "p1"
      : (duelObserverView && duelParticipantMissing) || timedNegationObserver || unfocusedGroup || state === "active-negation-multi-observer" ? null
        : state === "active-negation-observer" ? "p2"
          : state === "active-negation-unfocused-observer" ? meId
          : state === "dying" ? "p2" : judgementStage ? state === "judgement" ? "p2" : "p1" : actorId;
  const currentActionBase = state === "rest" || bumperHarvestComplete || negationSettlementOutcome ? null : currentActionFor(bumperHarvestLocalFixture || oathNegationLocalFixture || groupNegationLocalFixture ? "negation" : bumperHarvestFixture && bumperHarvestChild || oathNegationFixture || groupNegationFixture ? "active-negation-observer" : bumperHarvestFixture ? "group-observer" : state, actorId, hand[0]?.id ?? "", { targetHandCount, targetCardCase, targetCardKind });
  const responseDeadline = timedResponse && state === "negation" ? Date.parse("2026-01-01T00:00:25.000Z") : 0;
  const resolvedCurrentAction = currentActionBase && duelObserverView
    ? { version: 3, kind: "response", actorId, deadline: 0, reason: "Waiting for the current Duel participant", legalActions: [] }
    : currentActionBase && bumperHarvestChild && !bumperHarvestLocalFixture
      ? { version: 3, kind: "response", actorId: null, deadline: 0, reason: "Waiting for Negation...", legalActions: [] }
    : currentActionBase && timedNegationObserver
      ? { version: 3, kind: "response", actorId: null, deadline: responseDeadline, reason: "Waiting for Negation...", legalActions: [] }
      : currentActionBase && responseDeadline > 0 ? { ...currentActionBase, deadline: responseDeadline } : currentActionBase;
  const currentAction = resolvedCurrentAction && privateNegationResponder && state === "negation"
    ? {
      ...resolvedCurrentAction,
      ...(negationAuthority === "missing-response" ? { legalActions: ["decline_response"] } : {}),
      ...(negationAuthority === "missing-decline" ? { legalActions: ["respond"] } : {}),
      ...(negationAuthority === "missing-provider" ? { options: [] } : {}),
    }
    : resolvedCurrentAction;
  const projectedActiveTargets = targetShiftFixture && targetShiftCase === "missing-active" || state === "pending-target-card" && targetCardCase === "unfocused"
    ? []
    : targetShiftFixture ? ["p4"] : projectedStageTargets;
  const bumperHarvestStageTargets = bumperCurrentId ? [bumperCurrentId] : [];
  const bumperHarvestRootOrigin = bumperHarvestChild ? { frameId: `browser-${state}-root`, stage: "SEQUENTIAL_CHOICE", sourceId: "p1", effect: "BumperHarvest", targetIds: playerIds } : null;
  const groupChildRootOrigin = state === "group-observer" && groupProgressCase === "paused" && !orderedProgressCase && groupRootOriginCase !== "missing"
    ? {
      frameId: groupRootOriginCase === "frame-mismatch" ? `browser-${state}-other-root` : `browser-${state}-root`,
      stage: "GROUP_RESOLUTION",
      sourceId: groupRootOriginCase === "source-mismatch" ? "p3" : "p4",
      effect: groupRootOriginCase === "effect-mismatch" ? "BarbarianInvasion" : "RainingArrows",
      targetIds: groupRootOriginCase === "targets-mismatch" ? targets.slice(1) : targets,
    }
    : null;
  const presentationSnapshot = ordinaryTurn || selfTargetFixture || borrowedSwordFixture ? {
    identity: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    interaction: null,
    decision: null,
    localControl: { source: "CurrentAction", actionRevision: `browser-${state}-action`, kind: selfTargetTriggerFixture ? "trigger" : "turn", actorId, entitled: true },
    settlement: null,
    transitionEvents: [],
  } : state === "rest" && negationSettlementOutcome === "ROOT_CANCELLED" ? {
    identity: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    interaction: null,
    decision: null,
    localControl: { source: "CurrentAction", actionRevision: `browser-${state}-action`, kind: "turn", actorId, entitled: true },
    settlement: {
      semantics: "PROVEN", outcome: "ROOT_CANCELLED", eventId: "browser-rest-negation-settlement",
      interactionId: "browser-rest-negation-interaction", rootFrameId: "browser-rest-negation-root",
      checkpointId: "browser-rest-negation-checkpoint", presentationRevision: 1,
      resolutionId: "browser-rest-negation-resolution", rootCardKind: "Dismantle", sourceId: "p2", targetId: "p3",
    },
    transitionEvents: [],
  } : state === "rest" ? null : semanticSnapshot({
    state,
    playerIds,
    stage,
    sourceId: sourceOverride === "none" ? null : sourceOverride ?? (bumperHarvestFixture ? "p1" : borrowedSwordActiveFixture || frostSwordSelectionFixture || kirinBowSelectionFixture ? "p2" : state === "group-observer" || unfocusedGroup || groupNegationFixture || rainingArrowsResponseFixture ? "p4" : "p1"),
    targetIds: bumperHarvestFixture ? bumperHarvestStageTargets : projectedStageTargets,
    originalTargetIds: bumperHarvestFixture && !bumperHarvestChild ? playerIds : bumperHarvestFixture ? bumperHarvestStageTargets : projectedStageTargets,
    activeTargetIds: bumperHarvestFixture ? bumperHarvestStageTargets : projectedActiveTargets,
    currentParticipantId: projectedCurrentParticipantId,
    decisionActorId: negationSettlementOutcome || bumperHarvestFixture && (bumperHarvestChild || bumperHarvestComplete) || timedNegationObserver || privateNegationResponder || oathNegationFixture ? null : actorId,
    activeResolverId: negationSettlementOutcome || bumperHarvestFixture && (bumperHarvestChild || bumperHarvestComplete) || timedNegationObserver || privateNegationResponder || oathNegationFixture ? null : actorId,
    viewerId: meId,
    localControlActorId: bumperHarvestLocalFixture || oathNegationLocalFixture || privateNegationResponder ? actorId : undefined,
    effectOverride: bumperHarvestFixture ? "BumperHarvest" : borrowedSwordActiveFixture ? "borrowed_sword_attack" : orderedProgressCase ? "Attack" : groupNegationFixture ? "Raining Arrows" : oathNegationFixture ? "Oath of the Peach Garden" : effectOverride,
    childFrame: bumperHarvestChild || borrowedSwordActiveFixture || resolvedGroupProgressCase === "paused" || orderedProgressCase === "paused",
    rootOrigin: bumperHarvestRootOrigin ?? borrowedSwordRootOrigin ?? groupChildRootOrigin,
    groupProgressCase: resolvedGroupProgressCase,
    orderedProgressCase,
    bumperHarvestProgressCase: bumperHarvestFixture && !bumperHarvestUnproven ? bumperHarvestComplete ? "complete" : state === "bumper-harvest-returned" ? "returned" : "valid" : null,
    bumperHarvestTargetIds: playerIds,
    stableKindOverride: negationSettlementOutcome || bumperHarvestChild || bumperHarvestComplete ? "SPECIAL" : null,
    negationHistoryCase,
    rootCardMissing,
    negationSettlementOutcome,
  });
  if (oathNegationFixture && state !== "oath-negation-unproven" && presentationSnapshot?.interaction && presentationSnapshot.identity) {
    presentationSnapshot.oathRecipientScope = {
      semantics: "PROVEN",
      cardKind: "Oath",
      interactionId: presentationSnapshot.identity.interactionId,
      rootFrameId: presentationSnapshot.interaction.rootFrameId,
      activeFrameId: presentationSnapshot.interaction.activeFrameId,
      checkpointId: presentationSnapshot.identity.checkpointId,
      presentationRevision: presentationSnapshot.identity.presentationRevision,
      sourceId: "p1",
      recipientIds: playerIds.filter((id) => id === "p1" || id === "p2" || denseOathScope && Number(id.slice(1)) >= 5),
    };
  }
  if (groupNegationLocalFixture && presentationSnapshot) {
    presentationSnapshot.stable.decisionActorId = null;
    presentationSnapshot.interaction.decisionActorId = null;
    presentationSnapshot.interaction.activeResolverId = null;
    presentationSnapshot.interaction.participantRoles.decisionActorId = null;
    presentationSnapshot.interaction.participantRoles.activeResolverId = null;
    presentationSnapshot.decision.actorId = null;
  }
  const players = playerIds.map((id, index) => ({
    id,
    name: `Player ${index + 1}`,
    seat: index,
    hero: index === 0 && heroOverride ? heroOverride : index === 0 && state.startsWith("sun-shangxiang-") ? "sun-shangxiang" : index === 0 && (state === "confirm-cancel-skip" || state === "long-guidance") ? "zhang-liao" : HERO_IDS[index],
    generalReady: true,
    ready: true,
    hp: oathNegationFixture ? id === "p1" ? 3 : id === "p2" ? 2 : id === "p4" ? 0 : denseOathScope && Number(id.slice(1)) >= 5 ? 3 : 4 : 4,
    maxHp: 4,
    alive: oathNegationFixture ? id !== "p4" : true,
    connected: true,
    handCount: (state === "picker-hand-zone" || frostSwordSelectionFixture || state === "fanjian-selectable") && id === "p1" || state === "pending-target-card" && id === "p2" ? targetHandCount : id === meId ? hand.length : 2,
    judgementCards: state === "picker-hand-zone" && id === "p1"
      ? [card("browser-public-judgement", "Lightning", "♥", "Q")]
      : state === "pending-target-card" && id === "p2"
        ? [card("browser-target-judgement", "Lightning", "♥", "Q")]
      : hasLocalJudgementFixture && id === meId
      ? [card("browser-local-lightning", "Lightning", "♥", "Q"), card("browser-local-overindulgence", "Overindulgence", "♠", "7")].slice(0, localJudgementCount)
      : state === "rest" && id === "p3" ? [card("browser-lightning", "Lightning", "♥", "Q")] : [],
    equipmentCards: kirinBowSelectionFixture && id === "p1"
      ? [card("browser-kirin-bow-offensive-mount", "RedHare", "♥", "5"), card("browser-kirin-bow-defensive-mount", "Shadowrunner", "♠", "5"), card("browser-kirin-bow-ineligible-armour", "NioShield", "♣", "2")]
      : kirinBowSelectionFixture && id === "p2"
      ? [card("browser-kirin-bow-source", "KirinBow", "♥", "Q")]
      : state.startsWith("local-equipment-target-card") && id === "p1"
      ? [card("browser-local-equipment-eligible", "NioShield", "♣", "2"), card("browser-local-equipment-ineligible", "ZhugeCrossbow", "♦", "A")]
      : state === "pending-target-card" && id === "p2"
      ? [card("browser-target-equipment", "NioShield", "♣", "2")]
      : (state === "picker-hand-zone" || frostSwordSelectionFixture) && id === "p1"
      ? [card("browser-public-equipment", "NioShield", "♣", "2")]
      : frostSwordSelectionFixture && id === "p2"
        ? [card("browser-source-frost-sword", "FrostSword", "♠", "2")]
      : equipmentCase ? fixtureSeatEquipment(id, equipmentCase) : (state === "rest" || borrowedSwordFixture) && id === "p2" ? [card("browser-zhuge-crossbow", "ZhugeCrossbow", "♦", "A")] : [],
    attackRange: 1,
    distance: id === meId ? null : 1,
    isHost: index === 0,
    role: index === 0 ? "Lord" : "Rebel",
  }));
  const pendingDying = state === "dying" ? { kind: "dying", sourceId: "p1", targetId: "p2", origin: "Attack", recoveryNeeded: 1, deadline: Date.now() + 60_000 } : null;
  return normalizeRoomData({
    code: `UI19${String(count).padStart(2, "0")}`,
    status: "playing",
    maxPlayers: count,
    isHost: true,
    isTestController: true,
    meId,
    myRole: "Lord",
    myHeroOptions: [],
    players,
    myHand: hand,
    turnSeat: state === "group-observer" ? 3 : state === "dying" ? 1 : 0,
    phase: state === "dying" ? "dying" : state === "rest" || state === "group" || state === "normal" || state === "interaction" || state === "turn-play-end" || state === "sun-shangxiang-inactive" || state === "self-target-skill" || state === "self-target-skill-no-self" || state === "stargazing-offer" || borrowedSwordFixture ? "play" : "response",
    deckCount: 20,
    discardTop: null,
    log: [],
    timeline: [],
    isMyTurn: state === "normal" || state === "interaction" || state === "group" || state === "turn-play-end" || state === "sun-shangxiang-inactive" || state === "self-target-skill" || state === "self-target-skill-no-self" || state === "stargazing-offer" || borrowedSwordFixture,
    actionPlayerId: currentAction?.actorId ?? null,
    actionReason: currentAction?.reason ?? "Waiting for the next legal action",
    isMyAction: Boolean(currentAction?.actorId === meId),
    actionRevision: `browser-${state}-action`,
    presentationSnapshot: state === "ma-chao-cavalry" ? null : presentationSnapshot,
    currentAction,
    pending: ordinaryTurn ? null : currentAction ? { kind: currentAction.kind } : null,
    pendingAttack: null,
    pendingGreenDragon: null,
    pendingRockCleaving: null,
    pendingFrostSword: null,
    pendingDuel: state === "duel" || state === "duel-response" ? { kind: "duel", sourceId: "p1", targetId: "p2", actorId: "p2", opponentId: "p1", deadline: 0 } : null,
    pendingGroup: state === "group-observer" || groupNegationFixture || rainingArrowsResponseFixture ? { kind: "group", cardKind: "RainingArrows", sourceId: "p4", requiredKind: "Dodge" } : state === "group" ? { kind: "group", cardKind: "RainingArrows", sourceId: "p1", requiredKind: "Dodge" } : null,
    pendingNegation: !negationSettlementOutcome && (state === "negation" || state === "confirm-skip" || activeNegationObserver || groupNegationFixture || oathNegationFixture || bumperHarvestChild) ? { kind: "negation", sourceId: oathNegationFixture || bumperHarvestFixture ? "p1" : "p4", actorId: groupNegationFixture || oathNegationFixture || bumperHarvestFixture || timedNegationObserver || privateNegationResponder ? null : "p2", effectTargetId: bumperHarvestFixture ? bumperCurrentId : "p1", cardName: groupNegationFixture ? "RainingArrows" : oathNegationFixture ? "Oath of the Peach Garden" : bumperHarvestFixture ? "BumperHarvest" : "Dismantle", negated: false, deadline: responseDeadline } : null,
    pendingHarvest: null,
    pendingTargetCard: state === "pending-target-card" ? { kind: "target_card", sourceId: "p1", actorId: "p1", targetId: "p2", cardKind: targetCardKind } : null,
    pendingBorrowedSword: state === "confirm-cancel" ? { kind: "borrowed_sword", sourceId: "p1", targetId: "p2", actorId: "p1", holderId: "p2", stage: "choose_target", weaponId: "browser-weapon", eligibleTargetIds: ["p3"] } : null,
    pendingDying,
  });
}

function readFixture() {
  const params = new URLSearchParams(window.location.search);
  const state = params.get("state") || "normal";
  const count = Math.min(10, Math.max(2, Number(params.get("count") || 4)));
  const handSize = params.has("handSize") ? Math.min(30, Math.max(1, Number(params.get("handSize")))) : null;
  const targetHandCount = Math.min(30, Math.max(1, Number(params.get("targetHandCount") || 4)));
  const equipmentCase = params.get("equipmentCase") || null;
  const heroOverride = params.get("hero") || null;
  const sourceOverride = params.get("source") || null;
  const effectOverride = params.get("effect");
  const groupParticipantOverride = params.get("groupParticipant");
  const groupProgressCase = params.get("groupProgress") || null;
  const groupRootOriginCase = params.get("groupRootOrigin") || "valid";
  const orderedProgressCase = params.get("orderedProgress") || null;
  const negationHistoryCase = params.get("negationHistory") || null;
  const negationSettlementOutcome = params.get("settlement") === "ROOT_CANCELLED" || params.get("settlement") === "ROOT_RESTORED" ? params.get("settlement") : null;
  const rootCardMissing = params.get("rootCard") === "missing";
  const timedResponse = params.get("timedResponse") === "1";
  const timedObserver = params.get("timedObserver") === "1";
  const privateNegationResponder = params.get("privateNegationResponder") === "1";
  const negationAuthority = params.get("negationAuthority") || "";
  const duelObserver = params.get("duelObserver") === "1";
  const duelParticipantMissing = params.get("duelParticipant") === "missing";
  const dyingParticipantCase = params.get("dyingParticipant") || "";
  const judgementParticipantCase = params.get("judgementParticipant") || "";
  const targetShiftCase = params.get("targetShift") || "valid";
  const targetCardCase = params.get("targetCardCase") || "valid";
  const targetCardKind = params.get("targetCardKind") === "Steal" ? "Steal" : "Dismantle";
  return { state, count, handSize, targetHandCount, targetCardCase, targetCardKind, equipmentCase, heroOverride, sourceOverride, effectOverride, groupParticipantOverride, groupProgressCase, groupRootOriginCase, orderedProgressCase, negationHistoryCase, negationSettlementOutcome, rootCardMissing, targetShiftCase, timedResponse, timedObserver, duelObserver, duelParticipantMissing, dyingParticipantCase, judgementParticipantCase, privateNegationResponder, negationAuthority };
}

const { state, count, handSize, targetHandCount, targetCardCase, targetCardKind, equipmentCase, heroOverride, sourceOverride, effectOverride, groupParticipantOverride, groupProgressCase, groupRootOriginCase, orderedProgressCase, negationHistoryCase, negationSettlementOutcome, rootCardMissing, targetShiftCase, timedResponse, timedObserver, duelObserver, duelParticipantMissing, dyingParticipantCase, judgementParticipantCase, privateNegationResponder, negationAuthority } = readFixture();
const acknowledgeLocalPreview = new URLSearchParams(window.location.search).get("ackPreview") === "1";
const root = createRoot(document.getElementById("root"));
let fixtureRoom = browserRoom({ state, count, handSize, targetHandCount, targetCardCase, targetCardKind, equipmentCase, heroOverride, sourceOverride, effectOverride, groupParticipantOverride, groupProgressCase, groupRootOriginCase, orderedProgressCase, negationHistoryCase, negationSettlementOutcome, rootCardMissing, targetShiftCase, timedResponse, timedObserver, duelObserver, duelParticipantMissing, dyingParticipantCase, judgementParticipantCase, privateNegationResponder, negationAuthority });
window.__browserActions = [];
window.__browserLeaves = 0;
window.__browserRoom = fixtureRoom;
const renderFixture = () => root.render(<GameRoom room={fixtureRoom} busy={false} error="" onAction={async (action, extra) => {
  window.__browserActions.push({ action, extra });
  const targetId = typeof extra?.targetId === "string" ? extra.targetId : null;
  if (acknowledgeLocalPreview && action === "play_card" && targetId) {
    fixtureRoom = {
      ...fixtureRoom,
      phase: "response",
      isMyTurn: false,
      actionPlayerId: targetId,
      actionReason: "Respond to Attack",
      isMyAction: false,
      actionRevision: `${fixtureRoom.actionRevision}-acknowledged`,
      currentAction: { version: 3, kind: "response", actorId: targetId, deadline: 0, reason: "Respond to Attack", legalActions: ["respond", "decline_response"], requirement: "dodge", options: [] },
      pending: { kind: "response" },
      pendingAttack: { sourceId: fixtureRoom.meId, targetId },
      presentationSnapshot: semanticSnapshot({ state: "preview-ack", playerIds: fixtureRoom.players.map((player) => player.id), stage: "ATTACK_RESPONSE", sourceId: fixtureRoom.meId, targetIds: [targetId], currentParticipantId: targetId, decisionActorId: targetId, activeResolverId: targetId, viewerId: fixtureRoom.meId }),
    };
    window.__browserRoom = fixtureRoom;
    renderFixture();
  }
  return true;
}} onLeave={() => { window.__browserLeaves += 1; }} />);
window.__switchQuickTestViewer = (viewerId) => {
  const actorId = fixtureRoom.currentAction?.actorId ?? null;
  if (!fixtureRoom.isTestController
    || !actorId
    || !["p2", "p3"].includes(viewerId)
    || fixtureRoom.presentationSnapshot?.interaction?.stage !== "ATTACK_RESPONSE"
    || fixtureRoom.presentationSnapshot?.stable?.decisionActorId !== actorId) {
    throw new Error("Quick Test viewer switch requires the projected Attack-response fixture.");
  }
  const isActingViewer = viewerId === actorId;
  const currentAction = currentActionFor(isActingViewer ? "dodge" : "active-attack-observer", actorId, "browser-dodge");
  const localControl = fixtureRoom.presentationSnapshot.localControl;
  fixtureRoom = {
    ...fixtureRoom,
    meId: viewerId,
    myRole: fixtureRoom.players.find((player) => player.id === viewerId)?.role ?? null,
    myHand: isActingViewer ? [card("browser-dodge", "Dodge")] : [],
    actionPlayerId: actorId,
    isMyAction: isActingViewer,
    currentAction,
    pending: { kind: "response" },
    presentationSnapshot: {
      ...fixtureRoom.presentationSnapshot,
      localControl: { ...localControl, actorId, entitled: isActingViewer },
    },
  };
  window.__browserRoom = fixtureRoom;
  renderFixture();
};
window.__setBrowserHandIds = (ids) => {
  const myHand = ids.map((id) => card(id, "Attack"));
  fixtureRoom = {
    ...fixtureRoom,
    myHand,
    players: fixtureRoom.players.map((player) => player.id === fixtureRoom.meId ? { ...player, handCount: myHand.length } : player),
  };
  window.__browserRoom = fixtureRoom;
  renderFixture();
};
window.__setBrowserActionRevision = (actionRevision) => {
  fixtureRoom = { ...fixtureRoom, actionRevision };
  window.__browserRoom = fixtureRoom;
  renderFixture();
};
window.__setNegationSettlementState = (state) => {
  const outcome = state === "ROOT_CANCELLED" || state === "ROOT_RESTORED" ? state : state === "mismatched-root" ? "ROOT_CANCELLED" : null;
  const currentScene = fixtureRoom.presentationSnapshot?.interaction;
  const sourceId = currentScene?.sourceId ?? "p1";
  const targetId = currentScene?.targetIds?.[0] ?? "p2";
  const activeSnapshot = semanticSnapshot({
    state: "active-negation-open",
    playerIds: fixtureRoom.players.map((player) => player.id),
    stage: "NEGATION",
    sourceId,
    targetIds: [targetId],
    effectOverride: currentScene?.effect ?? null,
    decisionActorId: null,
    currentParticipantId: null,
    activeResolverId: null,
    viewerId: fixtureRoom.meId,
    stableKindOverride: "SPECIAL",
    negationSettlementOutcome: outcome,
  });
  if (state === "mismatched-root") activeSnapshot.settlement.rootFrameId = "different-root-frame";
  const restSnapshot = state === "REST_CANCELLED" ? {
    identity: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    interaction: null,
    decision: null,
    localControl: { source: "CurrentAction", actionRevision: "browser-settlement-rest", kind: "turn", actorId: null, entitled: false },
    settlement: activeSnapshot.settlement ?? {
      semantics: "PROVEN", outcome: "ROOT_CANCELLED", eventId: "browser-rest-cancelled",
      interactionId: `browser-active-negation-open-interaction`, rootFrameId: `browser-active-negation-open-root`,
      checkpointId: "browser-active-negation-open-checkpoint", presentationRevision: 1,
      resolutionId: "browser-active-negation-open-resolution", rootCardKind: sourceId === targetId ? "DrawTwo" : "Dismantle", sourceId, targetId,
    },
    transitionEvents: [],
  } : state === "REST_EMPTY" ? {
    identity: null,
    stable: { kind: "REST", interactionId: null, checkpointId: null, presentationRevision: null, decisionActorId: null },
    interaction: null,
    decision: null,
    localControl: { source: "CurrentAction", actionRevision: "browser-settlement-rest-empty", kind: "turn", actorId: null, entitled: false },
    settlement: null,
    transitionEvents: [],
  } : null;
  fixtureRoom = {
    ...fixtureRoom,
    currentAction: state === "ROOT_CANCELLED" || state === "ROOT_RESTORED" || state === "mismatched-root" ? null : fixtureRoom.currentAction,
    pending: state === "ROOT_CANCELLED" || state === "ROOT_RESTORED" || state === "mismatched-root" || state.startsWith("REST_") ? null : fixtureRoom.pending,
    pendingNegation: state === "ROOT_CANCELLED" || state === "ROOT_RESTORED" || state === "mismatched-root" || state.startsWith("REST_") ? null : fixtureRoom.pendingNegation,
    presentationSnapshot: restSnapshot ?? (state === "REST_PLAIN" ? null : activeSnapshot),
  };
  window.__browserRoom = fixtureRoom;
  renderFixture();
};
renderFixture();
