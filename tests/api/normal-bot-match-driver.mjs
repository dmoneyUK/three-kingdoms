import { baseUrl } from "./harness.mjs";

export const NORMAL_BOT_MATCH_STATUSES = Object.freeze([
  "FINISHED",
  "TIME_BUDGET",
  "ACTION_BUDGET",
  "UNSUPPORTED_HUMAN_FIXTURE_ACTION",
  "BOT_UNSUPPORTED",
  "BOT_FAILED",
  "NO_PROGRESS",
  "TRANSPORT_FAILURE",
]);

async function jsonResponse(response) {
  const text = await response.text();
  try { return { status: response.status, data: text ? JSON.parse(text) : null }; }
  catch { return { status: response.status, data: null }; }
}

// The normal driver deliberately avoids harness request retries and SQL
// helpers. Every action is one ordinary authenticated HTTP request.
async function postAction(action, values = {}) {
  try {
    const response = await fetch(`${baseUrl}/api/rooms`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action, ...values }),
    });
    return await jsonResponse(response);
  } catch {
    return { status: 0, data: null };
  }
}

async function readRoom(code, token) {
  try {
    const query = new URLSearchParams({ code, token });
    const response = await fetch(`${baseUrl}/api/rooms?${query.toString()}`);
    return await jsonResponse(response);
  } catch {
    return { status: 0, data: null };
  }
}

async function wakeBots(code) {
  try {
    const response = await fetch(`${baseUrl}/__test/run-bot-scheduler`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ roomCode: code, maxStepsPerWakeup: 4 }),
    });
    return await jsonResponse(response);
  } catch {
    return { status: 0, data: null };
  }
}

function safeStatusError(result) {
  if (!result || result.status === 0) return "TRANSPORT_FAILURE";
  if (result.status >= 500) return "TRANSPORT_FAILURE";
  return null;
}

function publicTransitionIntegrity(room) {
  const timeline = Array.isArray(room?.timeline) ? room.timeline : [];
  for (const event of timeline) {
    const transitions = Array.isArray(event?.publicZoneTransitions) ? event.publicZoneTransitions : [];
    const ids = transitions.map((transition) => transition?.physicalCardId).filter((id) => typeof id === "string");
    if (new Set(ids).size !== ids.length) return false;
  }
  return true;
}

function privateIsolation(view) {
  const players = Array.isArray(view?.players) ? view.players : [];
  return players.filter((player) => player?.isBot).every((player) =>
    !Object.hasOwn(player, "hand") && !Object.hasOwn(player, "handCards") && !Object.hasOwn(player, "roleCards"));
}

function genuineBots(view) {
  const bots = Array.isArray(view?.players) ? view.players.filter((player) => player?.isBot) : [];
  return bots.length === 3 && bots.every((player) => player.isTestPlayer !== true && player.isBot === true);
}

function winnerFromLog(view) {
  const messages = Array.isArray(view?.log) ? view.log.join("\n") : "";
  if (messages.includes("Lord and Loyalist victory! The match is over.")) return "Lord and Loyalist";
  if (messages.includes("Rebel victory! The match is over.")) return "Rebel";
  if (messages.includes("Traitor victory! The match is over.")) return "Traitor";
  return null;
}

function oneLegalHumanAction(view, humanId) {
  const current = view?.currentAction;
  if (!current || !Array.isArray(current.legalActions)) return { kind: "unsupported" };
  if (!view.isMyAction && current.actorId !== humanId) return null;
  const legal = new Set(current.legalActions);
  if (legal.has("advance_timers") && Number(current.deadline ?? 0) > 0 && Number(current.deadline) <= Date.now()) {
    return { action: "advance_timers" };
  }
  if (view.status === "heroes" || legal.has("choose_hero")) {
    const heroId = view.myHeroOptions?.[0]?.id;
    return heroId ? { action: "choose_hero", values: { heroId } } : { kind: "unsupported" };
  }
  if (legal.has("draw")) return { action: "draw" };
  if (legal.has("discard_cards")) {
    const me = view.players?.find((player) => player.id === humanId);
    const required = Math.max(0, (view.myHand?.length ?? 0) - Number(me?.hp ?? 0));
    return { action: "discard_cards", values: { cardIds: (view.myHand ?? []).slice(0, required).map((card) => card.id) } };
  }
  if (legal.has("decline_trigger")) return { action: "decline_trigger" };
  if (legal.has("skip_rescue")) {
    const windowId = current.sharedWindow?.windowId;
    return { action: "skip_rescue", values: windowId ? { windowId } : {} };
  }
  if (legal.has("decline_response")) {
    const windowId = current.negationWindowId ?? current.sharedWindow?.windowId;
    const values = windowId ? { windowId } : {};
    if (current.negationWindowId) {
      values.context = { actionRevision: view.actionRevision, meId: humanId, phase: view.phase, pendingKind: "response", actorId: view.actionPlayerId ?? null, windowId };
    }
    return { action: "decline_response", values };
  }
  if (legal.has("respond")) {
    const option = (current.options ?? []).find((candidate) => candidate?.selection?.eligibleCardIds?.length)
      ?? (current.options ?? [])[0];
    if (!option) return { kind: "unsupported" };
    const selection = option.selection;
    if (selection?.type !== "cards") return { kind: "unsupported" };
    const ids = selection.eligibleCardIds.slice(0, selection.min);
    if (ids.length < selection.min) return { kind: "unsupported" };
    const values = { providerId: option.providerId, ...(ids.length === 1 ? { cardId: ids[0] } : { cardIds: ids }) };
    if (current.negationWindowId) {
      values.context = { actionRevision: view.actionRevision, meId: humanId, phase: view.phase, pendingKind: "response", actorId: view.actionPlayerId ?? null, windowId: current.negationWindowId };
    }
    return { action: "respond", values };
  }
  if (legal.has("choose_borrowed_sword_target")) {
    const choice = current.borrowedSwordTargets?.find((candidate) => candidate.targetIds?.length);
    return choice ? { action: "choose_borrowed_sword_target", values: { cardId: choice.cardId, targetId: choice.targetIds[0] } } : { kind: "unsupported" };
  }
  if (legal.has("play_card")) {
    // Only play a card when the server has projected a concrete legal target;
    // otherwise ending the phase is the deterministic legal fallback.
    const target = current.playTargetEligibility?.find((candidate) => candidate.eligibleTargetIds?.length);
    if (target && target.mode === "card") {
      return { action: "play_card", values: { cardId: target.cardId, targetId: target.eligibleTargetIds[0] } };
    }
  }
  if (legal.has("end_turn")) return { action: "end_turn" };
  if (legal.has("start_response_timer")) return { action: "start_response_timer" };
  if (legal.has("start_rescue_timer")) return { action: "start_rescue_timer" };
  return { kind: "unsupported" };
}

function baseSummary() {
  return {
    status: "TRANSPORT_FAILURE",
    turns: 0,
    iterations: 0,
    scheduler: { consumed: 0, stale: 0, failed: 0, unsupported: 0, waitingForHuman: 0, steps: 0 },
    pending: null,
    actionKind: null,
    winner: null,
    invariants: {
      genuineBots: false,
      privateIsolation: false,
      independentReread: false,
      publicPhysicalTransitionIntegrity: true,
    },
  };
}

function addScheduler(summary, data) {
  for (const key of ["consumed", "stale", "failed", "unsupported", "waitingForHuman", "steps"]) {
    summary.scheduler[key] += Number(data?.[key] ?? 0);
  }
}

export async function runNormalBotMatch({ timeoutMs = 60_000, maxIterations = 100 } = {}) {
  const summary = baseSummary();
  const created = await postAction("create", { name: "Track G local driver" });
  const createError = safeStatusError(created);
  if (createError || created.status !== 201 || !created.data?.room?.code || !created.data?.token) return summary;
  const code = created.data.room.code;
  const token = created.data.token;
  const humanId = created.data.room.meId;
  const finish = (status, view = null) => {
    summary.status = status;
    summary.pending = view?.currentAction?.kind ?? null;
    summary.actionKind = view?.currentAction?.kind ?? null;
    summary.winner = winnerFromLog(view);
    return summary;
  };

  for (let index = 0; index < 3; index += 1) {
    const added = await postAction("add_bot", { code, token, requestId: crypto.randomUUID() });
    if (safeStatusError(added) || added.status !== 201) return finish("TRANSPORT_FAILURE");
  }
  const started = await postAction("start", { code, token });
  if (safeStatusError(started) || started.status !== 200) return finish("TRANSPORT_FAILURE");

  const startedAt = Date.now();
  let lastEpoch = null;
  let noProgress = 0;
  let view = null;
  while (summary.iterations < maxIterations && Date.now() - startedAt < timeoutMs) {
    summary.iterations += 1;
    const read = await readRoom(code, token);
    if (safeStatusError(read) || read.status !== 200 || !read.data) return finish("TRANSPORT_FAILURE", view);
    view = read.data;
    if (!summary.invariants.genuineBots) summary.invariants.genuineBots = genuineBots(view);
    summary.invariants.privateIsolation = privateIsolation(view);
    const reread = await readRoom(code, token);
    summary.invariants.independentReread = reread.status === 200 && reread.data?.actionRevision === view.actionRevision && reread.data?.status === view.status;
    const anonymous = await readRoom(code, "");
    summary.invariants.privateIsolation = summary.invariants.privateIsolation && privateIsolation(anonymous.data);
    summary.invariants.publicPhysicalTransitionIntegrity = summary.invariants.publicPhysicalTransitionIntegrity && publicTransitionIntegrity(view);
    if (Number.isInteger(view.turnEpoch) && view.turnEpoch !== lastEpoch) {
      lastEpoch = view.turnEpoch;
      summary.turns += view.status === "playing" ? 1 : 0;
    }
    summary.pending = view.currentAction?.kind ?? null;
    summary.actionKind = view.currentAction?.kind ?? null;
    if (view.status === "finished") return finish("FINISHED", view);

    const humanOwnsAction = view.isMyAction || view.actionPlayerId === humanId;
    if (humanOwnsAction) {
      const action = oneLegalHumanAction(view, humanId);
      if (!action) { noProgress += 1; continue; }
      if (action.kind === "unsupported") return finish("UNSUPPORTED_HUMAN_FIXTURE_ACTION", view);
      const result = await postAction(action.action, { code, token, ...(action.values ?? {}) });
      if (safeStatusError(result) || result.status >= 400) return finish("TRANSPORT_FAILURE", view);
      noProgress = 0;
      continue;
    }

    const wake = await wakeBots(code);
    if (safeStatusError(wake) || wake.status !== 200 || !wake.data) return finish("TRANSPORT_FAILURE", view);
    addScheduler(summary, wake.data);
    if (Number(wake.data.unsupported ?? 0) > 0) return finish("BOT_UNSUPPORTED", view);
    if (Number(wake.data.failed ?? 0) > 0) return finish("BOT_FAILED", view);
    if (Number(wake.data.steps ?? 0) === 0) noProgress += 1;
    else noProgress = 0;
    if (noProgress >= 8) return finish("NO_PROGRESS", view);
  }
  const finalRead = await readRoom(code, token);
  view = finalRead.status === 200 ? finalRead.data : view;
  return finish(summary.iterations >= maxIterations ? "ACTION_BUDGET" : "TIME_BUDGET", view);
}
