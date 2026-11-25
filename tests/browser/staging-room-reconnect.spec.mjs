import { expect, test } from "@playwright/test";
import { botTriggerChoices } from "../../ai/trigger-selection.ts";
import { classifyBotCycle, classifyRejoinCheckpoint, extendProgressDeadline } from "./staging-room-reconnect-logic.mjs";
import { classifyRejoinFailure, createRejoinDiagnostics, sessionEvidence, waitForRejoinResponse } from "./staging-room-reconnect-diagnostics.mjs";

function isPostAction(response, action) {
  if (new URL(response.url()).pathname !== "/api/rooms" || response.request().method() !== "POST") return false;
  try { return JSON.parse(response.request().postData() ?? "{}").action === action; }
  catch { return false; }
}

function hasCompletedBotTurn(room, botName, afterLogIndex = 0) {
  return (room.log ?? []).slice(afterLogIndex).some((message) => message.includes(`${botName}'s turn-end effects finish;`));
}

function unsupportedBots(room) {
  return (room.players ?? []).filter((player) => player.isBot && ["unsupported", "error"].includes(player.botStatus));
}

function humanContinuation(room, hostId) {
  const decision = room.currentAction;
  if (decision?.actorId !== hostId || decision.sharedWindow?.locked) return null;
  const legal = decision.legalActions;
  const ownCards = new Set((room.myHand ?? []).map(({ id }) => id));
  if (legal.includes("choose_harvest") && room.pendingHarvest?.availableIds[0]) {
    return { action: "choose_harvest", cardId: room.pendingHarvest.availableIds[0] };
  }
  if (legal.includes("choose_borrowed_sword_target")) {
    return { action: "choose_borrowed_sword_target", targetId: room.pendingBorrowedSword?.eligibleTargetIds[0] };
  }
  if (legal.includes("choose_target_card")) {
    const target = room.players.find(({ id }) => id === decision.targetCardSelection?.targetId);
    const key = decision.targetCardSelection?.eligibleKeys[0];
    if (key?.startsWith("hand:")) return { action: "choose_target_card", targetCardZone: "hand", targetCardIndex: Number(key.slice(5)) };
    if (key && target?.equipmentCards.some(({ id }) => id === key)) return { action: "choose_target_card", targetCardZone: "equipment", targetCardId: key };
    if (key && target?.judgementCards.some(({ id }) => id === key)) return { action: "choose_target_card", targetCardZone: "judgement", targetCardId: key };
  }
  if (legal.includes("trigger") && !legal.includes("decline_trigger") && decision.kind !== "turn") {
    if (decision.distribution?.eligibleRecipientIds[0]) {
      return { action: "trigger", providerId: "private_card_distribution",
        assignments: decision.distribution.cards.map(({ id }) => ({ cardId: id, recipientId: decision.distribution.eligibleRecipientIds[0] })) };
    }
    if (decision.deckReorder) {
      const { cards, minTop } = decision.deckReorder;
      return { action: "trigger", providerId: "private_deck_reorder", topCardIds: cards.slice(0, minTop).map(({ id }) => id),
        bottomCardIds: cards.slice(minTop).map(({ id }) => id) };
    }
    const selection = (decision.triggerOptions ?? []).flatMap((option) => botTriggerChoices(option, ownCards))[0];
    if (selection) return { action: "trigger", ...selection };
  }
  return null;
}

async function waitForRoom(request, roomCode, token, predicate, {
  timeoutMs = 90_000,
  maxTimeoutMs,
  progressTimeoutMs,
  label = "room state",
  beforePoll,
  onState,
} = {}) {
  const startedAt = Date.now();
  let deadline = startedAt + timeoutMs;
  let latest = null;
  let lastRevision;
  let lastProgressAt = Date.now();
  while (Date.now() < deadline) {
    await beforePoll?.();
    const response = await request.get(`/api/rooms?${new URLSearchParams({ code: roomCode, token })}`);
    if (!response.ok()) {
      const body = (await response.text().catch(() => "")).replace(/\s+/g, " ").slice(0, 512);
      throw new Error(`GET /api/rooms failed while waiting for ${label}: HTTP ${response.status()}${body ? `; body=${body}` : ""}`);
    }
    const body = await response.json();
    latest = body.room ?? body;
    const unsupported = unsupportedBots(latest);
    if (unsupported.length) throw new Error(`Bot decision stopped safely as unsupported: ${unsupported.map((player) => player.name).join(", ")}`);
    if (progressTimeoutMs) {
      if (lastRevision === undefined) lastRevision = latest.actionRevision;
      else if (latest.actionRevision !== lastRevision) {
        lastRevision = latest.actionRevision;
        lastProgressAt = Date.now();
        if (maxTimeoutMs !== undefined) {
          deadline = extendProgressDeadline({
            startedAt,
            now: lastProgressAt,
            deadline,
            progressTimeoutMs: progressTimeoutMs ?? timeoutMs,
            maxTimeoutMs,
          });
        }
      }
    }
    if (predicate(latest)) return latest;
    const stateHandled = await onState?.(latest);
    if (progressTimeoutMs && !stateHandled && Date.now() - lastProgressAt >= progressTimeoutMs) {
      throw new Error(`No authoritative revision progress waiting for ${label}; latest state: ${JSON.stringify({ code: roomCode, status: latest?.status, phase: latest?.phase, turnSeat: latest?.turnSeat, actorSeat: latest?.players?.find(({ id }) => id === latest.actionPlayerId)?.seat })}`);
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for ${label}; latest state: ${JSON.stringify({ code: roomCode, status: latest?.status, phase: latest?.phase, turnSeat: latest?.turnSeat, actorSeat: latest?.players?.find(({ id }) => id === latest.actionPlayerId)?.seat })}`);
}

async function readRoom(request, roomCode, token) {
  const response = await request.get(`/api/rooms?${new URLSearchParams({ code: roomCode, token })}`);
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.room ?? body;
}

test("mobile browser creates a Staging room, runs genuine bots, and rejoins after refresh", async ({ page, request }, testInfo) => {
  const testStartedAt = Date.now();
  // Keep the existing 25-minute smoke bounded below the 30-minute job so the
  // always-run lifecycle containment step has time to execute after a stall.
  test.setTimeout(24 * 60_000);
  const expectedBuildSha = process.env.NEXT_PUBLIC_BUILD_SHA;
  if (process.env.CI === "true" && !/^[0-9a-f]{40}$/.test(expectedBuildSha ?? "")) {
    throw new Error("NEXT_PUBLIC_BUILD_SHA must identify the current CI commit");
  }
  if (expectedBuildSha && !/^[0-9a-f]{40}$/.test(expectedBuildSha)) {
    throw new Error("NEXT_PUBLIC_BUILD_SHA must be a full 40-character commit SHA");
  }

  const healthResponse = await request.get("/api/health");
  expect(healthResponse.status()).toBe(200);
  expect(await healthResponse.json()).toMatchObject({ ok: true, worker: "available" });

  const playerName = `STAGING REJOIN ${Date.now().toString(36).toUpperCase().slice(-4)}`;
  const landingPath = expectedBuildSha ? `/?aip_build=${encodeURIComponent(expectedBuildSha)}` : "/";
  await page.goto(landingPath, { waitUntil: "networkidle" });
  await expect(page.locator('[data-client-ready="true"]')).toBeVisible();
  await expect(page.getByPlaceholder("Enter your name")).toBeVisible();
  await page.getByPlaceholder("Enter your name").fill(playerName);
  await expect(page.getByRole("button", { name: "Host Game", exact: true })).toBeEnabled();

  const createResponsePromise = page.waitForResponse((response) => isPostAction(response, "create"));
  await page.getByRole("button", { name: "Host Game", exact: true }).click();
  const createResponse = await createResponsePromise;
  expect(createResponse.status()).toBe(201);
  const created = await createResponse.json();
  expect(typeof created?.room?.code).toBe("string");
  expect(created?.room?.status).toBe("lobby");
  expect(created?.room?.players).toHaveLength(1);
  expect(created?.token?.length > 0).toBe(true);

  const roomCode = created.room.code;
  const hostId = created.room.meId;
  const hostSeat = created.room.players.find((player) => player.id === hostId).seat;
  const botDemoEnabled = created.room.botDemoEnabled === true;
  let nextLocalRecoveryAt = 0;
  const triggerLocalRecovery = async () => {
    if (!process.env.AI_BOT_DEMO_LOCAL_URL || Date.now() < nextLocalRecoveryAt) return;
    const scheduledRecovery = await request.get("/cdn-cgi/local/scheduled");
    expect(scheduledRecovery.ok(), "Wrangler local mode needs an explicit scheduled event to model the Staging recovery Cron").toBe(true);
    nextLocalRecoveryAt = Date.now() + 1_000;
  };
  await expect(page.locator(".lobby-shell")).toBeVisible();
  await expect(page.locator(".room b")).toHaveText(roomCode);
  await expect(page.locator(".seat.filled b")).toContainText("STAGING REJOIN");

  const storedSession = await page.evaluate(() => {
    const session = JSON.parse(localStorage.getItem("three-realms-session") ?? "null");
    return { code: session?.code, name: session?.name, tokenPresent: typeof session?.token === "string" && session.token.length > 0 };
  });
  expect(storedSession).toEqual({ code: roomCode, name: playerName, tokenPresent: true });

  if (botDemoEnabled) {
    for (let index = 0; index < 3; index += 1) {
      const addResponsePromise = page.waitForResponse((response) => isPostAction(response, "add_bot"));
      await page.getByRole("button", { name: "+ Bot", exact: true }).click();
      expect((await addResponsePromise).status()).toBe(201);
    }
    await expect(page.locator(".seat.filled small").filter({ hasText: /^BOT$/ })).toHaveCount(3);
    await expect(page.getByRole("button", { name: /Add \d+ Test Player/ })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Enable Test Game" })).toHaveCount(0);

    const publicLobbyResponse = await request.get(`/api/rooms?${new URLSearchParams({ code: roomCode })}`);
    expect(publicLobbyResponse.ok()).toBe(true);
    const publicLobby = await publicLobbyResponse.json();
    expect(publicLobby.players.filter((player) => player.isBot)).toHaveLength(3);
    const publicLobbyJson = JSON.stringify(publicLobby);
    expect(publicLobbyJson).not.toContain(created.token);
    expect(publicLobbyJson).not.toContain("bot:no-login:");
    expect(publicLobbyJson).not.toContain("token_hash");
  } else {
    await page.getByRole("button", { name: /Add 3 Test Players/ }).click();
  }
  await expect(page.locator(".lobby-actions")).toContainText("4 / 6 players");
  await page.getByRole("button", { name: "Start game" }).click();

  let currentRoom;
  if (botDemoEnabled) {
    const heroDeadline = Date.now() + 90_000;
    while (Date.now() < heroDeadline) {
      await triggerLocalRecovery();
      currentRoom = await readRoom(request, roomCode, created.token);
      const unsupported = unsupportedBots(currentRoom);
      if (unsupported.length) throw new Error(`Bot Hero selection stopped safely as unsupported: ${unsupported.map((player) => player.name).join(", ")}`);
      if (currentRoom.status === "playing") break;
      if (currentRoom.status === "heroes" && currentRoom.actionPlayerId === hostId) {
        await expect(page.locator(".hero-shell")).toBeVisible();
        const candidate = page.getByRole("button", { name: /^Select / }).first();
        await expect(candidate).toBeEnabled({ timeout: 15_000 });
        await candidate.click();
        const confirm = page.getByRole("button", { name: /^Confirm / });
        await expect(confirm).toBeEnabled();
        const heroResponsePromise = page.waitForResponse((response) => isPostAction(response, "choose_hero"));
        await confirm.click();
        expect((await heroResponsePromise).status()).toBe(200);
      } else {
        await page.waitForTimeout(300);
      }
    }
    if (currentRoom?.status !== "playing") throw new Error("The normal bot room did not reach the playing phase within 90 seconds.");
    const bots = currentRoom.players.filter((player) => player.isBot);
    expect(bots).toHaveLength(3);
    expect(bots.every((player) => player.generalReady && player.hero)).toBe(true);
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.getByTestId(/^bot-status-/)).toHaveCount(3);
    for (const bot of bots) await expect(page.getByTestId(`bot-status-${bot.id}`)).toHaveAttribute("aria-label", /Bot/);

    const resolveHumanInterruption = async (room) => {
      const decision = room.currentAction;
      const negationChoice = room.presentationSnapshot?.viewerNegationChoice;
      if (decision?.actorId !== hostId || decision.sharedWindow?.locked
        || (negationChoice?.locked && negationChoice.windowId === decision.negationWindowId)) return false;
      const legal = decision.legalActions;
      const context = {
        actionRevision: room.actionRevision, meId: hostId, phase: room.phase, actorId: room.actionPlayerId,
        windowId: decision.negationWindowId ?? decision.sharedWindow?.windowId,
      };
      const ownCards = new Set(room.myHand.map(({ id }) => id));
      const dodge = (decision.options ?? []).find(({ providerId, satisfies, selection }) =>
        providerId === "card" && satisfies === "dodge" && selection?.min === 1
        && selection.eligibleCardIds.some((id) => ownCards.has(id)));
      if (legal.includes("respond") && dodge) {
        const cardId = dodge.selection.eligibleCardIds.find((id) => ownCards.has(id));
        const response = await request.post("/api/rooms", {
          data: { action: "respond", code: roomCode, token: created.token, context, providerId: dodge.providerId, cardId },
        });
        if (response.status() !== 409) expect(response.status()).toBe(200);
        return true;
      }
      const continuation = humanContinuation(room, hostId);
      if (continuation) {
        const result = await request.post("/api/rooms", { data: { code: roomCode, token: created.token, context, ...continuation } });
        if (result.status() !== 409) expect(result.status()).toBe(200);
        return true;
      }
      const action = legal.find((candidate) => ["decline_response", "decline_trigger", "skip_rescue"].includes(candidate));
      if (!action) return false;
      const response = await request.post("/api/rooms", { data: { action, code: roomCode, token: created.token, context } });
      if (response.status() === 409) return false;
      expect(response.status(), `human ${action} in ${room.phase}`).toBe(200);
      return true;
    };
    currentRoom = await waitForRoom(request, roomCode, created.token, (room) => room.status === "playing" && room.turnSeat === hostSeat && room.currentAction?.actorId === hostId
      && (room.currentAction.legalActions.includes("end_turn") || room.currentAction.legalActions.includes("discard_cards")), {
      // Three opening Bot turns can continue through multiple Cron wakes.
      // Keep the independent no-revision-progress deadline below. The total
      // budget can extend only on authoritative progress and is hard-capped
      // at 15 minutes; a stalled room still fails after 180 seconds.
      timeoutMs: 10 * 60_000,
      maxTimeoutMs: 15 * 60_000,
      progressTimeoutMs: 180_000,
      label: "human play or discard after opening Bot turns",
      beforePoll: triggerLocalRecovery,
      onState: resolveHumanInterruption,
    });
    expect(currentRoom.players.filter((player) => player.isBot).every((player) => player.botStatus === "waiting_for_human")).toBe(true);
    const humanRevision = currentRoom.actionRevision;
    await page.waitForTimeout(1_000);
    const heldHumanTurn = await readRoom(request, roomCode, created.token);
    expect(heldHumanTurn.turnSeat).toBe(hostSeat);
    expect(heldHumanTurn.actionRevision).toBe(humanRevision, "the scheduler does not advance a pending human turn");
    if (currentRoom.currentAction.legalActions.includes("end_turn")) {
      await expect(page.getByRole("button", { name: "End", exact: true })).toBeEnabled({ timeout: 30_000 });
    } else {
      await expect(page.getByRole("button", { name: /^Discard .* selected$/ })).toBeVisible({ timeout: 30_000 });
    }
    const humanTurnDeadline = Date.now() + 60_000;
    let botCycleLogStart = (currentRoom.log ?? []).length;
    let endTurnSubmitted = false;
    while (Date.now() < humanTurnDeadline) {
      currentRoom = await readRoom(request, roomCode, created.token);
      if (currentRoom.status !== "playing" || currentRoom.turnSeat !== hostSeat) break;
      if (await resolveHumanInterruption(currentRoom)) continue;
      if (currentRoom.phase === "discard" && currentRoom.currentAction?.legalActions.includes("discard_cards")) {
        const host = currentRoom.players.find((player) => player.id === hostId);
        const required = Math.max(0, currentRoom.myHand.length - (host?.hp ?? currentRoom.myHand.length));
        for (const card of currentRoom.myHand.slice(0, required)) await page.locator(`[data-hand-card-id="${card.id}"] button.game-card`).click();
        const discard = page.getByRole("button", { name: `Discard ${required} selected`, exact: true });
        const discardResponsePromise = page.waitForResponse((response) => isPostAction(response, "discard_cards"));
        await discard.click();
        expect((await discardResponsePromise).status()).toBe(200);
      } else if (!endTurnSubmitted && currentRoom.phase?.startsWith("play") && currentRoom.currentAction?.actorId === hostId && currentRoom.currentAction.legalActions.includes("end_turn")) {
        botCycleLogStart = (currentRoom.log ?? []).length;
        const endResponsePromise = page.waitForResponse((response) => isPostAction(response, "end_turn"));
        await page.getByRole("button", { name: "End", exact: true }).click();
        const endConfirmation = page.getByRole("dialog", { name: "End your Play Phase?" });
        await expect(endConfirmation).toBeVisible();
        const confirmEnd = endConfirmation.getByRole("button", { name: "Confirm End" });
        await expect(confirmEnd).toBeEnabled({ timeout: 15_000 });
        await confirmEnd.click();
        expect((await endResponsePromise).status()).toBe(200);
        endTurnSubmitted = true;
      } else {
        await page.waitForTimeout(300);
      }
    }
    const humanTurnCompleted = await waitForRoom(request, roomCode, created.token, (room) => room.status === "playing" && room.turnSeat !== hostSeat, { timeoutMs: 10_000, label: "human turn completion" });
    // Random legal hands can chain group, Negation and delegated responses.
    // Allow additional Cron recovery only while the authoritative revision advances.
    const hardCycleDeadline = Date.now() + 11 * 60_000;
    const noProgressTimeoutMs = 180_000;
    let botTurnDeadline = Math.min(hardCycleDeadline, Date.now() + noProgressTimeoutMs);
    let lastCycleRevision = humanTurnCompleted.actionRevision;
    let completedBotNames = [];
    let botCycleResult = { ok: false, outcome: "not_started" };
    currentRoom = humanTurnCompleted;
    while (Date.now() < botTurnDeadline) {
      await triggerLocalRecovery();
      currentRoom = await readRoom(request, roomCode, created.token);
      if (currentRoom.actionRevision !== lastCycleRevision) {
        lastCycleRevision = currentRoom.actionRevision;
        botTurnDeadline = Math.min(hardCycleDeadline, Date.now() + noProgressTimeoutMs);
      }
      const unsupported = unsupportedBots(currentRoom);
      if (unsupported.length) throw new Error(`Bot turn stopped safely as unsupported: ${unsupported.map((player) => player.name).join(", ")}`);
      if (await resolveHumanInterruption(currentRoom)) continue;
      completedBotNames = bots.filter((bot) => hasCompletedBotTurn(currentRoom, bot.name, botCycleLogStart)).map((bot) => bot.name);
      botCycleResult = classifyBotCycle({
        room: currentRoom,
        hostId,
        completedBotNames,
        expectedBotNames: bots.map((bot) => bot.name),
      });
      if (botCycleResult.ok) break;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    expect(botCycleResult.ok, JSON.stringify({
      code: roomCode,
      timeout: Date.now() >= hardCycleDeadline ? "cycle_budget" : "no_revision_progress",
      outcome: botCycleResult.outcome,
      completedBotNames,
      phase: currentRoom.phase,
      pendingKind: currentRoom.pending?.kind ?? null,
      actorSeat: currentRoom.players.find(({ id }) => id === currentRoom.actionPlayerId)?.seat,
      turnSeat: currentRoom.turnSeat,
      botStatuses: currentRoom.players.filter(({ isBot }) => isBot).map(({ seat, botStatus }) => ({ seat, botStatus })),
    })).toBe(true);
    let rejoinCheckpoint = { ok: false, outcome: "not_checked" };
    const classifyCurrentCheckpoint = (room) => {
      rejoinCheckpoint = classifyRejoinCheckpoint({ room, hostId });
      return rejoinCheckpoint.ok;
    };
    currentRoom = await waitForRoom(request, roomCode, created.token, classifyCurrentCheckpoint, {
      timeoutMs: 30_000,
      label: "testable human action or defeated observer after bot cycle",
      beforePoll: triggerLocalRecovery,
      // The predicate above must inspect the fresh state first. Only if it is
      // not already a valid checkpoint may the helper submit a real canonical
      // continuation; this prevents consuming the chosen response before the
      // rejoin assertion records it.
      onState: async (room) => {
        rejoinCheckpoint = classifyRejoinCheckpoint({ room, hostId });
        if (rejoinCheckpoint.ok) return true;
        return resolveHumanInterruption(room);
      },
    });
    rejoinCheckpoint = classifyRejoinCheckpoint({ room: currentRoom, hostId });
    expect(rejoinCheckpoint.ok, JSON.stringify(rejoinCheckpoint)).toBe(true);
    const hostAfterBotCycle = currentRoom.players.find((player) => player.id === hostId);
    if (currentRoom.status === "playing" && hostAfterBotCycle?.alive !== false) {
      if (["human_dying_response", "human_response"].includes(rejoinCheckpoint.outcome)) {
        expect(currentRoom.currentAction.actorId).toBe(hostId);
        expect(currentRoom.currentAction.legalActions.some((action) => ["give_peach", "skip_rescue", "respond", "decline_response"].includes(action))).toBe(true);
      } else if (currentRoom.currentAction.legalActions.includes("end_turn")) {
        await expect(page.getByRole("button", { name: "End", exact: true })).toBeEnabled({ timeout: 15_000 });
      } else if (currentRoom.currentAction.legalActions.includes("discard_cards")) {
        const required = Math.max(0, currentRoom.myHand.length - (hostAfterBotCycle?.hp ?? currentRoom.myHand.length));
        await expect(page.getByRole("button", { name: `Discard ${required} selected` })).toBeVisible({ timeout: 15_000 });
      } else {
        // Draw/trigger/selection checkpoints may be advanced by the existing
        // client lifecycle rather than exposing a single Skip button. The
        // pure classifier already proved this is the host's non-empty,
        // server-authorized action; assert that authority instead of guessing
        // a UI control from a stale cycle outcome.
        expect(currentRoom.currentAction.actorId).toBe(hostId);
        expect(currentRoom.currentAction.legalActions.length).toBeGreaterThan(0);
      }
      expect(currentRoom.players.filter((player) => player.isBot).every((player) => player.botStatus === "waiting_for_human")).toBe(true);
    } else if (currentRoom.status === "playing") {
      expect(hostAfterBotCycle?.alive).toBe(false);
    }
    expect(currentRoom.players.filter((player) => player.isBot)).toHaveLength(3);
    const humanTokenAfterBots = await page.evaluate(() => JSON.parse(localStorage.getItem("three-realms-session") ?? "null")?.token);
    expect(humanTokenAfterBots).toBe(created.token);
    await page.screenshot({ path: testInfo.outputPath("staging-bot-demo.png"), fullPage: true });
  } else {
    await expect(page.locator(".hero-shell")).toBeVisible();
    for (let selection = 0; selection < 4; selection += 1) {
      const candidate = page.getByRole("button", { name: /^Select / }).first();
      await expect(candidate).toBeEnabled();
      await candidate.click();
      const confirm = page.getByRole("button", { name: /^Confirm / });
      await expect(confirm).toBeEnabled();
      const heroResponsePromise = page.waitForResponse((response) => isPostAction(response, "choose_hero"));
      await confirm.click();
      const heroResponse = await heroResponsePromise;
      expect(heroResponse.status()).toBe(200);
      currentRoom = (await heroResponse.json()).room;
      expect(currentRoom.status).toBe(selection === 3 ? "playing" : "heroes");
    }
  }

  await expect(page.locator(".game-shell")).toBeVisible();
  if (expectedBuildSha) await expect(page.locator(".stage-system-build-sha")).toHaveAttribute("data-build-sha", expectedBuildSha);

  const stateBeforeRefresh = await waitForRoom(request, roomCode, created.token, (room) => room.status === "playing" || room.status === "finished");
  const diagnostics = createRejoinDiagnostics({ roomCode, expectedToken: created.token, startedAt: testStartedAt });
  const onRequest = (requestEvent) => diagnostics.requestStarted(requestEvent.url(), requestEvent.method(), requestEvent.resourceType());
  const onRequestFailed = (requestEvent) => {
    diagnostics.requestFailed(requestEvent.url(), requestEvent.method(), requestEvent.resourceType());
    diagnostics.failure(classifyRejoinFailure({ requestFailed: true }));
  };
  const onResponse = (responseEvent) => {
    const requestEvent = responseEvent.request();
    diagnostics.response(responseEvent.url(), requestEvent.method(), responseEvent.status(), requestEvent.resourceType());
    if (responseEvent.status() === 1102 || responseEvent.status() >= 500) {
      void responseEvent.text().then((body) => {
        diagnostics.failure(classifyRejoinFailure({ status: responseEvent.status(), body }));
      }).catch(() => {});
    }
  };
  const attachDiagnostics = async () => {
    await testInfo.attach("staging-rejoin-diagnostics", {
      body: JSON.stringify(diagnostics.snapshot(), null, 2),
      contentType: "application/json",
    });
  };
  page.on("request", onRequest);
  page.on("requestfailed", onRequestFailed);
  page.on("response", onResponse);
  try {
    diagnostics.phase("before_reload");
    const beforeSession = await page.evaluate(() => JSON.parse(localStorage.getItem("three-realms-session") ?? "null"));
    diagnostics.session("beforeReload", sessionEvidence({ session: beforeSession, roomCode, expectedToken: created.token }));
    const remainingBudgetMs = Math.max(8_000, testInfo.timeout - (Date.now() - testStartedAt) - 1_000);
    const rejoinTimeoutMs = Math.min(45_000, remainingBudgetMs);
    const rejoinResponsePromise = waitForRejoinResponse(page, {
      roomCode,
      expectedToken: created.token,
      diagnostics,
      timeoutMs: rejoinTimeoutMs,
    }).catch((error) => ({ error }));
    let reloadError = null;
    diagnostics.phase("reload_started");
    try {
      await page.reload({ waitUntil: "domcontentloaded", timeout: Math.min(30_000, rejoinTimeoutMs) });
      diagnostics.phase("reload_completed");
    } catch (error) {
      reloadError = error;
      diagnostics.failure(classifyRejoinFailure({ errorMessage: error?.message }));
    }
    const responseResult = await rejoinResponsePromise;
    if (reloadError) throw reloadError;
    if (responseResult?.error) throw responseResult.error;
    const rejoinResponse = responseResult;
    expect(rejoinResponse.status()).toBe(200);
    const rejoined = await rejoinResponse.json();
    const rejoinedRoom = rejoined.room ?? rejoined;
    expect(rejoinedRoom.code).toBe(roomCode);
    const hostBeforeRefresh = stateBeforeRefresh.players.find((player) => player.id === hostId);
    const hostAfterRefresh = rejoinedRoom.players.find((player) => player.id === hostId);
    expect(hostAfterRefresh?.id).toBe(hostId);
    if (hostBeforeRefresh?.alive === false) expect(hostAfterRefresh?.alive).toBe(false);
    if (stateBeforeRefresh.status === "playing" && hostBeforeRefresh?.alive !== false
      && stateBeforeRefresh.currentAction?.actorId === hostId) {
      expect(rejoinedRoom.status).toBe("playing");
      expect(rejoinedRoom.actionRevision).toBe(stateBeforeRefresh.actionRevision, "rejoining an active human decision does not advance the room");
    } else {
      // Revisions are opaque state fingerprints; background Bot decisions may
      // change them while a defeated viewer refreshes, so they have no ordering.
      expect(typeof rejoinedRoom.actionRevision).toBe("string");
      expect(rejoinedRoom.actionRevision.length).toBeGreaterThan(0);
      expect(stateBeforeRefresh.status === "finished" ? ["finished"] : ["playing", "finished"]).toContain(rejoinedRoom.status);
    }
    if (botDemoEnabled) expect(rejoinedRoom.players.filter((player) => player.isBot)).toHaveLength(3);

    try {
      await expect(page.locator('[data-client-ready="true"]')).toBeVisible({ timeout: Math.min(15_000, remainingBudgetMs) });
      diagnostics.markReady();
    } catch (error) {
      diagnostics.failure(classifyRejoinFailure({ errorMessage: error?.message }));
      throw error;
    }
    const afterSession = await page.evaluate(() => JSON.parse(localStorage.getItem("three-realms-session") ?? "null"));
    diagnostics.session("afterReload", sessionEvidence({ session: afterSession, roomCode, expectedToken: created.token }));
    expect(diagnostics.snapshot().session.afterReload.matches).toBe(true);
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.locator(".room b")).toHaveText(roomCode);
    if (expectedBuildSha) await expect(page.locator(".stage-system-build-sha")).toHaveAttribute("data-build-sha", expectedBuildSha);
    await attachDiagnostics();
  } catch (error) {
    await attachDiagnostics();
    throw error;
  } finally {
    page.off("request", onRequest);
    page.off("requestfailed", onRequestFailed);
    page.off("response", onResponse);
  }
});
