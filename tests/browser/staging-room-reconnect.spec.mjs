import { expect, test } from "@playwright/test";

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

async function waitForRoom(request, roomCode, token, predicate, { timeoutMs = 90_000, label = "room state", beforePoll } = {}) {
  const deadline = Date.now() + timeoutMs;
  let latest = null;
  while (Date.now() < deadline) {
    await beforePoll?.();
    const response = await request.get(`/api/rooms?${new URLSearchParams({ code: roomCode, token })}`);
    expect(response.ok()).toBe(true);
    const body = await response.json();
    latest = body.room ?? body;
    const unsupported = unsupportedBots(latest);
    if (unsupported.length) throw new Error(`Bot decision stopped safely as unsupported: ${unsupported.map((player) => player.name).join(", ")}`);
    if (predicate(latest)) return latest;
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  throw new Error(`Timed out waiting for ${label}; latest state: ${JSON.stringify({ status: latest?.status, phase: latest?.phase, turnSeat: latest?.turnSeat, actionPlayerId: latest?.actionPlayerId })}`);
}

async function readRoom(request, roomCode, token) {
  const response = await request.get(`/api/rooms?${new URLSearchParams({ code: roomCode, token })}`);
  expect(response.ok()).toBe(true);
  const body = await response.json();
  return body.room ?? body;
}

test("mobile browser creates a Staging room, runs genuine bots, and rejoins after refresh", async ({ page, request }, testInfo) => {
  test.setTimeout(8 * 60_000);
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
  await page.goto("/", { waitUntil: "networkidle" });
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
  await expect(page.locator(".lobby-actions")).toContainText("4 / 8 players");
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

    currentRoom = await waitForRoom(request, roomCode, created.token, (room) => room.status === "playing" && room.turnSeat === hostSeat && room.phase?.startsWith("play") && room.currentAction?.actorId === hostId && room.currentAction.legalActions.includes("end_turn"), { timeoutMs: 150_000, label: "human Play Phase", beforePoll: triggerLocalRecovery });
    expect(currentRoom.players.filter((player) => player.isBot).every((player) => player.botStatus === "waiting_for_human")).toBe(true);
    const humanRevision = currentRoom.actionRevision;
    await page.waitForTimeout(1_000);
    const heldHumanTurn = await readRoom(request, roomCode, created.token);
    expect(heldHumanTurn.turnSeat).toBe(hostSeat);
    expect(heldHumanTurn.actionRevision).toBe(humanRevision, "the scheduler does not advance a pending human turn");
    await expect(page.getByRole("button", { name: "End", exact: true })).toBeEnabled({ timeout: 30_000 });
    const humanTurnDeadline = Date.now() + 60_000;
    let botCycleLogStart = 0;
    let endTurnSubmitted = false;
    while (Date.now() < humanTurnDeadline) {
      currentRoom = await readRoom(request, roomCode, created.token);
      if (currentRoom.status !== "playing" || currentRoom.turnSeat !== hostSeat) break;
      if (currentRoom.currentAction?.actorId === hostId && currentRoom.currentAction.legalActions.includes("decline_trigger")) {
        const skipResponsePromise = page.waitForResponse((response) => isPostAction(response, "decline_trigger"));
        await page.getByRole("button", { name: "Skip", exact: true }).click();
        expect((await skipResponsePromise).status()).toBe(200);
      } else if (currentRoom.phase === "discard" && currentRoom.currentAction?.legalActions.includes("discard_cards")) {
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
        expect((await endResponsePromise).status()).toBe(200);
        endTurnSubmitted = true;
      } else {
        await page.waitForTimeout(300);
      }
    }
    const humanTurnCompleted = await waitForRoom(request, roomCode, created.token, (room) => room.status === "playing" && room.turnSeat !== hostSeat, { timeoutMs: 10_000, label: "human turn completion" });
    const botTurnDeadline = Date.now() + 180_000;
    let completedBotNames = [];
    currentRoom = humanTurnCompleted;
    while (Date.now() < botTurnDeadline) {
      await triggerLocalRecovery();
      currentRoom = await readRoom(request, roomCode, created.token);
      const unsupported = unsupportedBots(currentRoom);
      if (unsupported.length) throw new Error(`Bot turn stopped safely as unsupported: ${unsupported.map((player) => player.name).join(", ")}`);
      completedBotNames = bots.filter((bot) => hasCompletedBotTurn(currentRoom, bot.name, botCycleLogStart)).map((bot) => bot.name);
      if (completedBotNames.length === bots.length) break;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
    expect(completedBotNames).toEqual(bots.map((bot) => bot.name));
    currentRoom = await waitForRoom(request, roomCode, created.token, (room) => room.status === "playing" && room.turnSeat === hostSeat && room.actionPlayerId === hostId && room.currentAction?.actorId === hostId && room.phase !== "draw", { timeoutMs: 30_000, label: "human turn after bot cycle" });
    if (currentRoom.currentAction.legalActions.includes("end_turn")) {
      await expect(page.getByRole("button", { name: "End", exact: true })).toBeEnabled({ timeout: 15_000 });
    } else if (currentRoom.currentAction.legalActions.includes("discard_cards")) {
      const host = currentRoom.players.find((player) => player.id === hostId);
      const required = Math.max(0, currentRoom.myHand.length - (host?.hp ?? currentRoom.myHand.length));
      await expect(page.getByRole("button", { name: `Discard ${required} selected` })).toBeVisible({ timeout: 15_000 });
    } else if (currentRoom.currentAction.legalActions.includes("decline_trigger")) {
      await expect(page.getByRole("button", { name: "Skip", exact: true })).toBeEnabled({ timeout: 15_000 });
    } else {
      throw new Error(`Unsupported human UI action at return from bot cycle: ${currentRoom.currentAction.kind}`);
    }
    expect(currentRoom.players.filter((player) => player.isBot)).toHaveLength(3);
    expect(currentRoom.players.filter((player) => player.isBot).every((player) => player.botStatus === "waiting_for_human")).toBe(true);
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

  const stateBeforeRefresh = await waitForRoom(request, roomCode, created.token, (room) => room.status === "playing");
  const rejoinResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return url.pathname === "/api/rooms"
      && response.request().method() === "GET"
      && url.searchParams.has("code")
      && url.searchParams.has("token");
  });
  await page.reload();
  const rejoinResponse = await rejoinResponsePromise;
  expect(rejoinResponse.status()).toBe(200);
  const rejoined = await rejoinResponse.json();
  const rejoinedRoom = rejoined.room ?? rejoined;
  expect(rejoinedRoom.code).toBe(roomCode);
  expect(rejoinedRoom.status).toBe("playing");
  expect(rejoinedRoom.actionRevision).toBe(stateBeforeRefresh.actionRevision);
  if (botDemoEnabled) expect(rejoinedRoom.players.filter((player) => player.isBot)).toHaveLength(3);

  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator(".room b")).toHaveText(roomCode);
  if (expectedBuildSha) await expect(page.locator(".stage-system-build-sha")).toHaveAttribute("data-build-sha", expectedBuildSha);
});
