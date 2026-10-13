import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

async function postAction(request, action, code, token, values = {}) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, code, token, ...values } });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBeGreaterThanOrEqual(200);
  expect(response.status(), JSON.stringify(body)).toBeLessThan(300);
  return body;
}

test("test-game perspective switches manually and stays selected when the server advances the turn", async ({ page, request }) => {
  const created = await request.post(`${API}/api/rooms`, { data: { action: "create", name: "DUEL VIEW HOST" } });
  const createdBody = await created.json();
  expect(created.status(), JSON.stringify(createdBody)).toBe(201);
  const { code, token } = { code: createdBody.room.code, token: createdBody.token };
  let room = (await postAction(request, "add_test_players", code, token)).room;
  room = (await postAction(request, "enable_test_room", code, token)).room;
  room = (await postAction(request, "configure_test_hands", code, token, { presetId: "duel_chain", expectedRevision: 0 })).room;
  room = (await postAction(request, "start", code, token)).room;
  while (room.status === "heroes") {
    const candidate = room.myHeroOptions[0];
    expect(candidate, "the current test seat has a Standard hero candidate").toBeTruthy();
    room = (await postAction(request, "choose_hero", code, token, { heroId: candidate.id })).room;
  }
  expect(room.status).toBe("playing");
  expect(room.isTestController).toBe(true);
  const actingPlayerId = room.currentAction.actorId;
  const selectedViewer = room.players.find((player) => player.isTestPlayer && player.id !== actingPlayerId);
  expect(selectedViewer, "the room has a non-acting test player for a manual bot view").toBeTruthy();

  await page.addInitScript(({ roomCode, sessionToken }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name: "DUEL VIEW HOST" }));
  }, { roomCode: code, sessionToken: token });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();

  const switchButtons = page.getByTestId(/^test-view-switch-/);
  const initialViewerId = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
  const expectedSwitchIds = room.players.filter((player) => player.isTestPlayer && player.id !== initialViewerId).map(({ id }) => id).sort();
  await expect(switchButtons).toHaveCount(expectedSwitchIds.length);
  const switchGeometry = await switchButtons.evaluateAll((buttons) => buttons.map((button) => {
    const card = button.closest(".local-hero-anchor, .opponent-hero-card");
    const buttonRect = button.getBoundingClientRect();
    const cardRect = card?.getBoundingClientRect();
    return {
      id: button.getAttribute("data-test-viewer-id"),
      width: buttonRect.width,
      height: buttonRect.height,
      insideHero: Boolean(cardRect && buttonRect.left >= cardRect.left && buttonRect.top >= cardRect.top
        && buttonRect.right <= cardRect.right && buttonRect.bottom <= cardRect.bottom),
      opponentInfoMarker: Boolean(card?.classList.contains("opponent-hero-card") && card.querySelector(".hero-card-info-button")),
    };
  }));
  console.log("test-view-switch-geometry", JSON.stringify({ viewport: page.viewportSize(), buttons: switchGeometry }));
  expect(switchGeometry).toHaveLength(expectedSwitchIds.length);
  expect(switchGeometry.map(({ id }) => id).sort()).toEqual(expectedSwitchIds);
  await expect(page.getByTestId(`test-view-switch-${room.players.find((player) => player.isHost).id}`)).toHaveCount(0);
  for (const geometry of switchGeometry) {
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.height).toBeGreaterThan(0);
    expect(geometry.insideHero).toBe(true);
    expect(geometry.opponentInfoMarker).toBe(false);
  }

  const selectedButton = page.getByTestId(`test-view-switch-${selectedViewer.id}`);
  await expect(selectedButton).toHaveText("SWITCH");
  const selectedViewResponsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== "GET" || !response.url().startsWith(`${API}/api/rooms?`)) return false;
    return new URL(response.url()).searchParams.get("testViewerId") === selectedViewer.id;
  });
  await selectedButton.click();
  const selectedViewResponse = await selectedViewResponsePromise;
  expect(selectedViewResponse.status()).toBe(200);
  const selectedViewBody = await selectedViewResponse.json();
  expect((selectedViewBody.room ?? selectedViewBody).meId).toBe(selectedViewer.id);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${selectedViewer.id}"]`)).toBeVisible();
  await expect(page.getByTestId("test-view-return-host")).toBeVisible();
  await expect(page.getByTestId("test-view-return-host")).toHaveText("HOST");

  const actingPlayer = room.players.find((player) => player.id === actingPlayerId);
  const actingViewerButton = actingPlayer.isHost
    ? page.getByTestId("test-view-return-host")
    : page.getByTestId(`test-view-switch-${actingPlayerId}`);
  const actingViewResponsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== "GET" || !response.url().startsWith(`${API}/api/rooms?`)) return false;
    return new URL(response.url()).searchParams.get("testViewerId") === actingPlayerId;
  });
  await actingViewerButton.click();
  const actingViewResponse = await actingViewResponsePromise;
  expect(actingViewResponse.status()).toBe(200);
  const actingViewBody = await actingViewResponse.json();
  expect((actingViewBody.room ?? actingViewBody).meId).toBe(actingPlayerId);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${actingPlayerId}"]`)).toBeVisible();

  await expect.poll(async () => page.locator(".local-player-dock").getAttribute("data-player-anchor")).toBe(actingPlayerId);
  await expect(page.getByRole("button", { name: "End", exact: true })).toBeEnabled();
  const endTurnResponsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "end_turn"; }
    catch { return false; }
  });
  await page.getByRole("button", { name: "End", exact: true }).click();
  const endTurnResponse = await endTurnResponsePromise;
  expect(endTurnResponse.status()).toBe(200);
  let actionBody = await endTurnResponse.json();
  expect(actionBody.room.phase).toBe("discard");
  const requiredDiscards = Math.max(0, actionBody.room.myHand.length - actionBody.room.players.find((player) => player.id === actingPlayerId).hp);
  const handCardIds = await page.locator(".local-player-dock [data-hand-card-id]").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-hand-card-id")));
  expect(handCardIds.length).toBeGreaterThanOrEqual(requiredDiscards);
  for (const cardId of handCardIds.slice(0, requiredDiscards)) {
    await page.locator(`.local-player-dock [data-hand-card-id="${cardId}"] .game-card`).click();
  }
  const discardResponsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "discard_cards"; }
    catch { return false; }
  });
  await page.getByRole("button", { name: `Discard ${requiredDiscards} selected`, exact: true }).click();
  const discardResponse = await discardResponsePromise;
  expect(discardResponse.status()).toBe(200);
  actionBody = await discardResponse.json();
  const nextActingPlayerId = actionBody.room.actionPlayerId;
  expect(nextActingPlayerId).toBeTruthy();
  expect(nextActingPlayerId).not.toBe(actingPlayerId);
  await expect.poll(async () => {
    const localViewer = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
    const actingSeat = await page.locator(".action-square").getAttribute("data-player-anchor");
    return { localViewer, actingSeat };
  }).toEqual({ localViewer: actingPlayerId, actingSeat: nextActingPlayerId });
});
