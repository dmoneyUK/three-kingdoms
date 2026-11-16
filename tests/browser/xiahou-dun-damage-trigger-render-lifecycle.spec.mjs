import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function roomView(request, room, token) {
  const response = await request.get(`${API}/api/rooms?${new URLSearchParams({ code: room.code, token })}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function postAction(request, action, room, token, extra = {}) {
  return request.post(`${API}/api/rooms`, { data: { action, code: room.code, token, ...extra } });
}

async function settleNegationIfOpen(request, room, token) {
  const view = await roomView(request, room, token);
  const windowId = view.currentAction?.negationWindowId;
  if (!windowId) return view;
  const deadline = view.pendingNegation?.deadline ?? view.currentAction?.deadline ?? (Date.now() + 8_000);
  await new Promise((resolve) => setTimeout(resolve, Math.max(0, deadline - Date.now()) + 60));
  const advanced = await postAction(request, "advance_timers", room, token);
  expect(advanced.status()).toBe(200);
  return roomView(request, room, token);
}

test("§10.51 Barbarian damage keeps the mounted Xiahou Dun GameRoom alive through Stauchness", async ({ page, request }) => {
  test.setTimeout(90_000);
  const seeded = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "play",
    turnSeat: 0,
    players: [
      { name: "Sima Yi", hero: "simayi", role: "Lord", hp: 3, maxHp: 3, hand: [card("BarbarianInvasion", "sima-invasion")] },
      { name: "Cao Cao", hero: "cao-cao", role: "Loyalist", hp: 4, maxHp: 4, hand: [card("Attack", "cao-attack")] },
      { name: "Xiahou Dun", hero: "xiahou-dun", role: "Rebel", hp: 4, maxHp: 4, hand: [] },
      { name: "Zhang Liao", hero: "zhang-liao", role: "Renegade", hp: 4, maxHp: 4, hand: [] },
    ],
  } });
  expect(seeded.ok(), await seeded.text()).toBeTruthy();
  const room = await seeded.json();
  const [sima, caoCao, xiahou] = room.players;

  const diagnostics = [];
  const caughtExceptions = [];
  page.on("pageerror", (error) => diagnostics.push(`pageerror: ${error.stack ?? error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error") diagnostics.push(`console: ${message.text()}`);
  });
  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: xiahou.token, name: xiahou.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  const debuggerSession = await page.context().newCDPSession(page);
  await debuggerSession.send("Debugger.enable");
  await debuggerSession.send("Debugger.setPauseOnExceptions", { state: "all" });
  debuggerSession.on("Debugger.paused", (event) => {
    if (event.reason === "exception") {
      const description = event.data?.description ?? event.data?.value ?? event.data?.type ?? null;
      if (typeof description === "string" && /NotFoundError|Cannot destructure property 'eventId'/.test(description)
        && !caughtExceptions.some((entry) => entry.exception === description)) {
        caughtExceptions.push({
          exception: description,
          frames: (event.callFrames ?? []).slice(0, 8).map(({ functionName, url, location }) => ({ functionName, url, line: location.lineNumber + 1, column: location.columnNumber + 1 })),
        });
      }
    }
    void debuggerSession.send("Debugger.resume");
  });

  const invasion = await postAction(request, "play_card", room, sima.token, { cardId: "sima-invasion" });
  expect(invasion.status(), await invasion.text()).toBe(200);
  await settleNegationIfOpen(request, room, sima.token);
  await expect.poll(async () => (await roomView(request, room, caoCao.token)).currentAction?.actorId).toBe(caoCao.id);

  const caoView = await roomView(request, room, caoCao.token);
  expect(caoView.currentAction).toMatchObject({ kind: "response", actorId: caoCao.id, requirement: "attack" });
  const attackOption = caoView.currentAction.options.find((option) => option.selection?.eligibleCardIds?.includes("cao-attack"));
  expect(attackOption, JSON.stringify(caoView.currentAction)).toBeTruthy();
  const caoAttack = await postAction(request, "respond", room, caoCao.token, { providerId: attackOption.providerId, cardId: "cao-attack" });
  expect(caoAttack.status(), await caoAttack.text()).toBe(200);
  await settleNegationIfOpen(request, room, caoCao.token);
  await expect.poll(async () => (await roomView(request, room, xiahou.token)).currentAction?.actorId).toBe(xiahou.id);

  const xiahouView = await roomView(request, room, xiahou.token);
  expect(xiahouView.currentAction).toMatchObject({ kind: "response", actorId: xiahou.id, requirement: "attack" });
  const declinedPromise = page.waitForResponse((response) => response.url().endsWith("/api/rooms")
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "decline_response");
  await page.getByRole("button", { name: /TAKE DAMAGE/i }).click();
  const declined = await declinedPromise;
  expect(declined.status(), await declined.text()).toBe(200);
  const damaged = await roomView(request, room, xiahou.token);
  expect(damaged.players.find((player) => player.id === xiahou.id).hp).toBe(3);
  expect(damaged.currentAction).toMatchObject({ kind: "trigger", actorId: xiahou.id, triggerEvent: "damage_suffered" });
  expect(damaged.currentAction.triggerOptions.some((option) => option.effectId === "xiahou_dun_ganglie")).toBe(true);

  const gameShell = page.locator(".game-shell");
  const recoveryTitle = page.getByText("GAME SCREEN ERROR", { exact: true });
  await expect.poll(async () => (await gameShell.count()) + (await recoveryTitle.count()), { timeout: 10_000 }).toBeGreaterThan(0);
  if (await recoveryTitle.count()) {
    throw new Error(`Reproduced GameRoom render failure after HP4→3 / damage_suffered: ${JSON.stringify({ caughtExceptions, diagnostics })}`);
  }
  expect(caughtExceptions.filter((entry) => entry.exception.includes("NotFoundError")), JSON.stringify(caughtExceptions)).toEqual([]);
  await expect(gameShell).toBeVisible({ timeout: 10_000 });
  await expect.poll(async () => page.locator('.local-player-dock[data-player-anchor="' + xiahou.id + '"]').innerText(), { timeout: 15_000 }).toMatch(/HP 3\/4/);
  await expect(page.getByText("GAME SCREEN ERROR", { exact: true })).toHaveCount(0);
  await expect(page.locator(".public-card-display [data-public-card-announcement='true']")).toBeVisible();
  await expect(page.locator(".local-player-dock .console-guidance")).toContainText(/Stauchness|Discard exactly 2|Take 1 damage/i);

  const skipButton = page.locator('.local-player-dock[data-player-anchor="' + xiahou.id + '"]').getByRole("button", { name: "Skip", exact: true });
  await expect(skipButton).toBeEnabled();
  const skippedTriggerPromise = page.waitForResponse((response) => response.url().endsWith("/api/rooms")
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "decline_trigger");
  await skipButton.click();
  const skippedTrigger = await skippedTriggerPromise;
  expect(skippedTrigger.status(), await skippedTrigger.text()).toBe(200);
  await expect(gameShell).toBeVisible();
  await expect(recoveryTitle).toHaveCount(0);

  expect(diagnostics.filter((entry) => entry.includes("[GameRoom render failure]") || entry.startsWith("pageerror:")), diagnostics.join("\n")).toEqual([]);
});
