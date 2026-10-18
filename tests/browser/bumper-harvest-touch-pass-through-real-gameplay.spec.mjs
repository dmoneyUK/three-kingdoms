import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const SAFE_HEROES = new Set([
  "cao-cao", "xiahou-dun", "liu-bei", "guan-yu", "zhang-fei", "zhao-yun",
  "sun-quan", "gan-ning", "huang-gai", "lu-xun", "huaxiong", "gongsun-zan",
  "pan-feng", "ma-chao", "lü-bu", "simayi", "guo-jia",
]);

async function postAction(request, name, code, token, action, values = {}) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, name, code, token, ...values } });
  const body = await response.json();
  expect(response.status(), `${action}: ${body.error ?? "unexpected response"}`).toBeLessThan(300);
  return body.room;
}

async function readRoom(request, code, token, viewerId) {
  const query = new URLSearchParams({ code, token, ...(viewerId ? { testViewerId: viewerId } : {}) });
  const response = await request.get(`${API}/api/rooms?${query}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function tap(page, locator) {
  const bounds = await locator.boundingBox();
  expect(bounds, "the intended mobile control has a visible hit box").toBeTruthy();
  await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

test("Bumper Harvest spectators can switch views while another player chooses", async ({ browser, request }, testInfo) => {
  test.setTimeout(90_000);
  const name = `HARVEST SWITCH ${Date.now().toString(36).toUpperCase()}`;
  const created = await request.post(`${API}/api/rooms`, { data: { action: "create", name } });
  const createdBody = await created.json();
  expect(created.status(), JSON.stringify({ error: createdBody.error })).toBe(201);
  const { code, token } = { code: createdBody.room.code, token: createdBody.token };

  let room = await postAction(request, name, code, token, "add_test_players");
  room = await postAction(request, name, code, token, "enable_test_room");
  room = await postAction(request, name, code, token, "configure_test_hands", {
    presetId: "custom",
    expectedRevision: 0,
    handsBySeat: { 0: ["Attack"], 1: ["BumperHarvest"], 2: ["Attack"], 3: ["Attack"] },
  });
  room = await postAction(request, name, code, token, "start");
  for (let selections = 0; room.status === "heroes" && selections < 8; selections++) {
    const hero = room.myHeroOptions.find((candidate) => candidate.hp >= 4 && SAFE_HEROES.has(candidate.id))
      ?? room.myHeroOptions.find((candidate) => SAFE_HEROES.has(candidate.id));
    expect(hero, "the current TEST seat has a safe Standard hero choice").toBeTruthy();
    room = await postAction(request, name, code, token, "choose_hero", { heroId: hero.id });
  }
  expect(room.status).toBe("playing");

  const source = room.players.find((player) => player.seat === 1);
  const host = room.players.find((player) => player.isHost);
  const controlledAction = async (action, values = {}) => {
    const actorId = room.currentAction?.actorId ?? room.actionPlayerId;
    const context = {
      actionRevision: room.actionRevision,
      meId: room.meId,
      phase: room.phase,
      pendingKind: room.pending?.kind ?? null,
      actorId,
    };
    room = await postAction(request, name, code, token, action, { ...values, context });
  };

  for (let attempts = 0; attempts < 20; attempts++) {
    const actorId = room.currentAction?.actorId ?? room.actionPlayerId;
    if (actorId === source.id && room.phase?.startsWith("draw")) {
      await controlledAction("draw");
    } else if (actorId === source.id && room.phase?.startsWith("play")) {
      const card = room.myHand.find((item) => item.kind === "BumperHarvest");
      expect(card, "Test Player 2 holds Bumper Harvest").toBeTruthy();
      await controlledAction("play_card", { cardId: card.id });
      break;
    } else if (room.phase?.startsWith("draw")) {
      await controlledAction("draw");
    } else if (room.phase?.startsWith("play")) {
      await controlledAction("end_turn");
    } else if (room.phase === "discard") {
      const active = room.players.find((player) => player.id === room.meId);
      const required = Math.max(0, room.myHand.length - (active?.hp ?? 0));
      await controlledAction("discard_cards", { cardIds: room.myHand.slice(0, required).map((card) => card.id) });
    } else {
      throw new Error(`Unexpected ${room.phase} while preparing Test Player 2's turn.`);
    }
  }

  const passCurrentNegationWindow = async () => {
    let current = await readRoom(request, code, token);
    const windowId = current.currentAction?.negationWindowId;
    if (!windowId) return current;
    for (const player of current.players.filter((candidate) => candidate.alive)) {
      current = await readRoom(request, code, token);
      if (current.phase !== "response" || current.currentAction?.negationWindowId !== windowId) break;
      current = await postAction(request, name, code, token, "decline_response", {
        context: {
          actionRevision: current.actionRevision,
          meId: player.id,
          phase: "response",
          pendingKind: "response",
          windowId,
        },
      });
    }
    return readRoom(request, code, token);
  };
  room = await passCurrentNegationWindow();
  expect(room.pendingHarvest, "Negation responses advance to a live Harvest choice").toBeTruthy();
  expect(room.pendingHarvest.actorId).toBe(source.id);
  expect(room.pendingHarvest.choices).toHaveLength(0);

  const context = await browser.newContext({ viewport: { width: 440, height: 766 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    const page = await context.newPage();
    await page.addInitScript(({ roomCode, sessionToken, playerName }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name: playerName }));
    }, { roomCode: code, sessionToken: token, playerName: name });
    await page.goto(`${API}/`);
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.locator(".harvest-choice-stage")).toBeVisible();
    await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"]`)).toBeVisible();

    const initialHarvest = await readRoom(request, code, token, host.id);
    expect(initialHarvest.isMyAction).toBe(false);
    const initialActorId = initialHarvest.pendingHarvest.actorId;
    const initialChoices = initialHarvest.pendingHarvest.choices.map((choice) => choice.cardId);
    const initialPreview = initialHarvest.pendingHarvest.previewCardId;
    const initialDeadline = initialHarvest.pendingHarvest.countdownUntil;
    const hitMapHandle = await page.waitForFunction(() => {
      const stage = document.querySelector(".harvest-choice-stage");
      const panel = document.querySelector(".harvest-choice-panel");
      if (!stage || !panel) return null;
      const switches = [...document.querySelectorAll("[data-testid^='test-view-switch-']")];
      if (!switches.length) return null;
      const hit = (element) => {
        const rect = element.getBoundingClientRect();
        const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { id: element.getAttribute("data-test-viewer-id"), target: target?.getAttribute("data-testid") ?? target?.className ?? target?.tagName };
      };
      return {
        stagePointerEvents: getComputedStyle(stage).pointerEvents,
        panelPointerEvents: getComputedStyle(panel).pointerEvents,
        switches: switches.map(hit),
      };
    }, null, { timeout: 15_000 });
    const spectatorHitMap = await hitMapHandle.jsonValue();
    await hitMapHandle.dispose();
    expect(spectatorHitMap.stagePointerEvents).toBe("none");
    expect(spectatorHitMap.panelPointerEvents).toBe("none");
    expect(spectatorHitMap.switches.map((item) => item.target)).toEqual(spectatorHitMap.switches.map((item) => `test-view-switch-${item.id}`));
    const beforePath = testInfo.outputPath("bumper-harvest-spectator-before-switch.png");
    await page.screenshot({ path: beforePath, animations: "disabled" });
    await testInfo.attach("bumper-harvest-spectator-hit-map", {
      body: JSON.stringify({ viewport: page.viewportSize(), actorId: initialActorId, viewerId: host.id, ...spectatorHitMap }, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach("bumper-harvest-spectator-before-switch", { path: beforePath, contentType: "image/png" });

    const spectator = room.players.find((player) => player.isTestPlayer && player.id !== source.id);
    await tap(page, page.getByTestId(`test-view-switch-${spectator.id}`));
    const spectatorDock = page.locator(`.local-player-dock[data-player-anchor="${spectator.id}"]`);
    await expect(spectatorDock).toBeVisible();
    await expect(spectatorDock).toBeFocused();
    let afterSwitch = await readRoom(request, code, token, spectator.id);
    expect(afterSwitch.pendingHarvest.actorId).toBe(initialActorId);
    expect(afterSwitch.pendingHarvest.choices.map((choice) => choice.cardId)).toEqual(initialChoices);
    expect(afterSwitch.pendingHarvest.previewCardId).toBe(initialPreview);
    expect(afterSwitch.pendingHarvest.countdownUntil).toBe(initialDeadline);

    const inspectedHero = page.locator(`.opponent-player-card[data-player-anchor="${source.id}"] .opponent-hero-target`);
    await tap(page, inspectedHero);
    await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${source.id}"]`)).toBeVisible();
    await tap(page, page.getByRole("button", { name: `Close ${source.name} inspection` }));
    const handInspection = page.getByTestId("hand-card-inspection-action").first();
    await tap(page, handInspection);
    const cardDetailsAction = page.getByTestId("hand-card-details-action");
    await expect(cardDetailsAction).toBeVisible();
    await tap(page, cardDetailsAction);
    await expect(page.locator('.card-details-panel[data-card-details-context="private-hand"]')).toBeVisible();
    await tap(page, page.getByRole("button", { name: "Close card details" }));

    await tap(page, page.getByTestId(`test-view-switch-${source.id}`));
    const sourceDock = page.locator(`.local-player-dock[data-player-anchor="${source.id}"]`);
    await expect(sourceDock).toBeVisible();
    await expect(sourceDock).toBeFocused();
    await expect(page.locator(".harvest-choice-panel--actor")).toHaveCSS("pointer-events", "auto");
    await expect(page.locator(".harvest-card-choice:not([disabled])").first()).toBeVisible();
    await tap(page, page.locator(".harvest-card-choice:not([disabled])").first());
    const firstConfirm = page.getByRole("button", { name: "Confirm choice" });
    await expect(firstConfirm).toBeEnabled();
    const firstChoiceResponse = page.waitForResponse((response) => {
      if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_harvest"; }
      catch { return false; }
    });
    await tap(page, firstConfirm);
    expect((await firstChoiceResponse).ok()).toBeTruthy();
    const secondActorId = room.players.find((player) => player.seat === 2).id;
    room = await passCurrentNegationWindow();
    await expect.poll(async () => {
      const current = await readRoom(request, code, token);
      return { actorId: current.pendingHarvest?.actorId, choices: current.pendingHarvest?.choices.length };
    }).toEqual({ actorId: secondActorId, choices: 1 });
    await expect(page.locator(".harvest-choice-stage")).toBeVisible();
    await expect(page.locator(`.harvest-choice-panel:not(.harvest-choice-panel--actor)`)).toHaveCSS("pointer-events", "none");

    const secondSpectator = room.players.find((player) => player.isTestPlayer && player.id !== source.id && player.id !== secondActorId);
    await tap(page, page.getByTestId(`test-view-switch-${secondSpectator.id}`));
    const secondSpectatorDock = page.locator(`.local-player-dock[data-player-anchor="${secondSpectator.id}"]`);
    await expect(secondSpectatorDock).toBeVisible();
    await expect(secondSpectatorDock).toBeFocused();
    afterSwitch = await readRoom(request, code, token, secondSpectator.id);
    expect(afterSwitch.pendingHarvest.actorId).toBe(secondActorId);
    expect(afterSwitch.pendingHarvest.choices).toHaveLength(1);
    await tap(page, page.getByTestId(`test-view-switch-${secondActorId}`));
    const secondActorDock = page.locator(`.local-player-dock[data-player-anchor="${secondActorId}"]`);
    await expect(secondActorDock).toBeVisible();
    await expect(secondActorDock).toBeFocused();
    await tap(page, page.locator(".harvest-card-choice:not([disabled])").first());
    const secondConfirm = page.getByRole("button", { name: "Confirm choice" });
    await expect(secondConfirm).toBeEnabled();
    const secondChoiceResponse = page.waitForResponse((response) => {
      if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_harvest"; }
      catch { return false; }
    });
    await tap(page, secondConfirm);
    expect((await secondChoiceResponse).ok()).toBeTruthy();
    const afterSecondChoice = await readRoom(request, code, token, secondActorId);
    // Each accepted Harvest choice immediately opens that participant's Negation
    // window, so pendingHarvest is intentionally parked until those responses end.
    expect(afterSecondChoice.log.some((entry) => entry.includes(`${room.players.find((player) => player.id === secondActorId).name} chooses`))).toBe(true);
  } finally {
    await context.close();
  }
});
