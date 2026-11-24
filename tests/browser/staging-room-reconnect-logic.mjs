const HUMAN_RESPONSE_ACTIONS = new Set([
  "decline_response",
  "respond",
  "give_peach",
  "skip_rescue",
]);

function meaningfulBotProgress(completedBotNames, expectedBotNames) {
  const completed = new Set(Array.isArray(completedBotNames) ? completedBotNames : []);
  const expected = Array.isArray(expectedBotNames) ? expectedBotNames : [];
  return {
    completed,
    allCompleted: expected.length > 0 && expected.every((name) => completed.has(name)),
    anyCompleted: completed.size > 0,
  };
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
