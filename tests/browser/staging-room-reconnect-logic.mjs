const HUMAN_RESPONSE_ACTIONS = new Set([
  "decline_response",
  "respond",
  "give_peach",
  "skip_rescue",
]);

// These are the only server-published actions that make a room a useful
// rejoin checkpoint for the human host. Timer helpers and unknown values do
// not prove that the host can act, and a Bot-owned decision must never be
// mistaken for a human checkpoint.
const HUMAN_CHECKPOINT_ACTIONS = new Set([
  "draw",
  "play_card",
  "serpent_spear_attack",
  "end_turn",
  "discard_cards",
  "respond",
  "decline_response",
  "trigger",
  "decline_trigger",
  "preview_harvest",
  "choose_harvest",
  "choose_target_card",
  "choose_borrowed_sword_target",
  "give_peach",
  "skip_rescue",
]);

/**
 * Extend a bounded browser wait only after an authoritative room revision
 * advances. The no-progress deadline remains independent, and the hard cap
 * keeps a slow fixture from becoming an unbounded CI process.
 */
export function extendProgressDeadline({ startedAt, now, deadline, progressTimeoutMs, maxTimeoutMs }) {
  if (![startedAt, now, deadline, progressTimeoutMs, maxTimeoutMs].every((value) => Number.isFinite(value))) return deadline;
  const maxDeadline = startedAt + Math.max(0, maxTimeoutMs);
  if (deadline >= maxDeadline) return deadline;
  return Math.min(maxDeadline, Math.max(deadline, now + Math.max(1, progressTimeoutMs)));
}

function meaningfulBotProgress(completedBotNames, expectedBotNames) {
  const completed = new Set(Array.isArray(completedBotNames) ? completedBotNames : []);
  const expected = Array.isArray(expectedBotNames) ? expectedBotNames : [];
  return {
    completed,
    allCompleted: expected.length > 0 && expected.every((name) => completed.has(name)),
    anyCompleted: completed.size > 0,
  };
}

function hasUnsupportedBotState(room) {
  return (room?.players ?? []).some((player) => player?.isBot
    && ["unsupported", "error"].includes(player.botStatus));
}

/**
 * Classify the *current* state used by the post-cycle rejoin checkpoint.
 * `classifyBotCycle` records that meaningful Bot work happened; this helper
 * then re-reads the latest authoritative projection so a later Bot draw/turn
 * cannot be accepted using a stale cycle outcome.
 */
export function classifyRejoinCheckpoint({ room, hostId }) {
  if (!room || typeof hostId !== "string" || !hostId) return { ok: false, outcome: "invalid_checkpoint" };
  if (hasUnsupportedBotState(room)) return { ok: false, outcome: "unsupported_bot_state" };
  if (room.status === "finished") return { ok: true, outcome: "finished" };

  const host = (room.players ?? []).find((player) => player?.id === hostId);
  if (!host) return { ok: false, outcome: "host_missing" };
  if (host.alive === false) return { ok: true, outcome: "host_defeated" };

  const decision = room.currentAction;
  const legalActions = Array.isArray(decision?.legalActions) ? decision.legalActions : [];
  const viewerNegationChoice = room.presentationSnapshot?.viewerNegationChoice;
  if (decision?.sharedWindow?.locked === true
    || decision?.negationWindowId
    || viewerNegationChoice?.locked === true) {
    return { ok: false, outcome: "locked_shared_or_negation" };
  }
  if (decision?.actorId !== hostId) return { ok: false, outcome: "not_host_action" };

  const actionable = legalActions.filter((action) => HUMAN_CHECKPOINT_ACTIONS.has(action));
  if (!actionable.length) return { ok: false, outcome: "empty_or_unsupported_host_action" };
  if (decision.kind === "dying" || room.phase === "dying") return { ok: true, outcome: "human_dying_response" };
  if (decision.kind === "response" || room.phase === "response") return { ok: true, outcome: "human_response" };
  if (room.phase === "discard" || actionable.includes("discard_cards")) return { ok: true, outcome: "human_discard" };
  return { ok: true, outcome: "human_actionable_turn" };
}

/**
 * Classify the end of the browser smoke's Bot cycle without weakening the
 * progress assertion. A missing public turn-end line is acceptable only when
 * the authoritative room already proves a terminal/dead-host result or an
 * unlocked human-only response. An unresolved Bot turn, locked shared window,
 * or bare Dying/Draw state remains a failure.
 */
export function classifyBotCycle({ room, hostId, completedBotNames, expectedBotNames }) {
  const progress = meaningfulBotProgress(completedBotNames, expectedBotNames);
  if (progress.allCompleted) return { ok: true, outcome: "all_bot_turns_completed" };
  if (!progress.anyCompleted) return { ok: false, outcome: "no_meaningful_bot_progress" };

  const host = room?.players?.find((player) => player.id === hostId);
  if (room?.status === "finished") return { ok: true, outcome: "finished_after_bot_progress" };
  if (host?.alive === false) return { ok: true, outcome: "host_defeated_after_bot_progress" };

  const decision = room?.currentAction;
  const legalActions = Array.isArray(decision?.legalActions) ? decision.legalActions : [];
  const unlocked = decision?.sharedWindow?.locked !== true;
  const humanOnlyDecision = decision?.actorId === hostId
    && unlocked
    && legalActions.some((action) => HUMAN_RESPONSE_ACTIONS.has(action))
    && ((room?.phase === "dying" && decision?.kind === "dying")
      || (room?.phase === "response" && decision?.kind === "response"));
  if (humanOnlyDecision) {
    return {
      ok: true,
      outcome: room.phase === "dying" ? "human_dying_response" : "human_response",
    };
  }

  return { ok: false, outcome: "bot_cycle_incomplete" };
}
