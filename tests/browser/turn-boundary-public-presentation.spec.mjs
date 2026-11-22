import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

test("authoritative turn handoff retires old H4, PAC and Attack journey without clearing real zones", async ({ browser, request }) => {
  test.setTimeout(60_000);
  const attack = { id: "turn-boundary-attack", kind: "Attack", suit: "♠", rank: "7" };
  const weapon = { id: "turn-boundary-weapon", kind: "BlueSteelSword", suit: "♦", rank: "6" };
  const lightning = { id: "turn-boundary-lightning", kind: "Lightning", suit: "♠", rank: "A" };
  const seed = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "play",
    turnSeat: 3,
    players: [
      { name: "NEXT PLAYER", role: "Lord", hero: "zhao-yun", hp: 4, maxHp: 4, equipment: { weapon }, hand: [] },
      { name: "SECOND PLAYER", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, judgement: [lightning], hand: [] },
      { name: "THIRD PLAYER", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] },
      { name: "ENDING PLAYER", role: "Renegade", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [attack] },
    ],
  } });
  expect(seed.ok(), await seed.text()).toBeTruthy();
  const room = await seed.json();
  const nextPlayer = room.players[0];
  const endingPlayer = room.players[3];
  const context = await browser.newContext({ viewport: { width: 440, height: 894 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  try {
    await page.addInitScript(({ code, token, name }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    }, { code: room.code, token: nextPlayer.token, name: nextPlayer.name });
    await page.goto(`${API}/`);
    await expect(page.locator(".game-shell")).toBeVisible();

    const played = await request.post(`${API}/api/rooms`, { data: {
      action: "play_card", code: room.code, token: endingPlayer.token, cardId: attack.id, targetId: nextPlayer.id,
    } });
    expect(played.ok(), await played.text()).toBeTruthy();
    const attackRoom = (await played.json()).room;
    const attackEvent = attackRoom.timeline.find((event) => event.type === "card" && event.action === "play" && event.card?.id === attack.id);
    expect(attackEvent).toBeTruthy();
    expect(attackRoom.currentAction.actorId).toBe(nextPlayer.id);
    expect(attackRoom.publicPresentationTurn.epoch).toBe(room.publicPresentationTurn?.epoch ?? 0);

    await expect(page.locator(`[data-public-card-announcement-event-id="${attackEvent.id}"]`)).toBeVisible({ timeout: 12_000 });
    await expect(page.locator("[data-public-activity-chip='true']")).toBeVisible();
    await expect(page.locator(`[data-public-card-journey-event-id="${attackEvent.id}"]`)).toBeVisible({ timeout: 12_000 });

    const passed = await request.post(`${API}/api/rooms`, { data: {
      action: "decline_response", code: room.code, token: nextPlayer.token,
    } });
    expect(passed.ok(), await passed.text()).toBeTruthy();
    const afterResponse = (await passed.json()).room;
    expect(afterResponse.publicPresentationTurn.epoch).toBe(attackRoom.publicPresentationTurn.epoch,
      "resolving an in-turn response does not retire the current public presentation");
    expect(afterResponse.currentAction.actorId).toBe(endingPlayer.id);

    const ended = await request.post(`${API}/api/rooms`, { data: {
      action: "end_turn", code: room.code, token: endingPlayer.token,
    } });
    expect(ended.ok(), await ended.text()).toBeTruthy();
    const nextTurnRoom = (await ended.json()).room;
    expect(nextTurnRoom.publicPresentationTurn.epoch).toBe(afterResponse.publicPresentationTurn.epoch + 1);
    expect(nextTurnRoom.timeline.some((event) => event.id === attackEvent.id)).toBe(true,
      "the authoritative event history remains intact");
    expect(nextTurnRoom.publicPresentationTimeline.some((event) => event.id === attackEvent.id)).toBe(false,
      "the prior-turn Attack is absent from the new transient presentation scope");
    expect(nextTurnRoom.currentAction.actorId).toBe(nextPlayer.id);
    expect(nextTurnRoom.currentAction.reason).toContain("draw two cards");
    const preservedNextPlayer = nextTurnRoom.players.find((player) => player.id === nextPlayer.id);
    expect(preservedNextPlayer.equipmentCards).toContainEqual(weapon);
    expect(nextTurnRoom.players.find((player) => player.id === room.players[1].id).judgementCards).toContainEqual(lightning);

    await expect(page.locator(`[data-public-card-announcement-event-id="${attackEvent.id}"]`)).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator(`[data-public-card-journey-event-id="${attackEvent.id}"]`)).toHaveCount(0);
    await expect(page.locator(`.public-card-display[data-public-card-root-event-id="${attackEvent.id}"]`)).toHaveCount(0);
    await expect(page.locator("[data-public-activity-chip='true']")).toContainText(nextPlayer.name, { timeout: 15_000 });
    await expect(page.locator(`.local-player-dock[data-player-anchor="${nextPlayer.id}"]`)).toBeVisible();
    await expect(page.locator(`.local-zone-card[data-equipment-id="${weapon.id}"]`)).toBeVisible();
    const localConsole = page.locator('[data-console-surface="local-operation"]');
    await expect(localConsole).toBeVisible();
    await expect(localConsole).toContainText("Play");
    await expect(localConsole).toContainText("End");
  } finally {
    await context.close();
  }
});
