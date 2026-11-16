import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

test("a committed public draw is rendered as exactly one visible React H4", async ({ page, request }) => {
  const drawnCards = [
    { id: "h4-visible-private-card-a", kind: "Attack", suit: "♠", rank: "7" },
    { id: "h4-visible-private-card-b", kind: "Dodge", suit: "♥", rank: "8" },
  ];
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "draw",
      turnSeat: 0,
      deck: drawnCards,
      players: [
        { name: "H4 DRAWER", role: "Lord", hero: "guan-yu", hp: 4, maxHp: 4, hand: [] },
        { name: "H4 OBSERVER", role: "Loyalist", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
        { name: "H4 THIRD", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] },
        { name: "H4 FOURTH", role: "Renegade", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!seeded.ok()) throw new Error(`H4 room seed failed: ${await seeded.text()}`);
  const room = await seeded.json();
  const actor = room.players[0];
  const observer = room.players[1];

  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: observer.token, name: observer.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();

  const actorStateResponse = await request.get(`${API}/api/rooms?code=${room.code}&token=${actor.token}`);
  expect(actorStateResponse.ok()).toBeTruthy();
  const actorState = await actorStateResponse.json();
  expect(actorState.currentAction.legalActions).toContain("draw");
  const drawResponse = await request.post(`${API}/api/rooms`, {
    data: { action: "draw", code: room.code, token: actor.token },
  });
  if (!drawResponse.ok()) throw new Error(`Committed draw failed: ${await drawResponse.text()}`);
  const drawResult = await drawResponse.json();
  const committedEvent = drawResult.room.timeline.find((event) =>
    event.publicFact?.committedOutcome?.changes?.some((change) =>
      change.kind === "CARD_DRAWN" && change.playerId === actor.id));
  expect(committedEvent, "the server response contains the persisted public draw result").toBeTruthy();
  expect(committedEvent.publicFact.committedOutcome.changes).toEqual([
    { kind: "CARD_DRAWN", playerId: actor.id, amount: 2, fromZone: "DECK", toZone: "HAND" },
  ]);

  const eventId = committedEvent.id;
  const h4 = page.locator(`[data-public-card-announcement-event-id="${eventId}"]`);
  const owner = page.locator(`.public-interaction-event-announcement[data-public-interaction-event-id="${eventId}"]`);
  await expect(owner).toHaveCount(1, { timeout: 15_000 });
  await expect(owner).toBeVisible();
  await expect(h4).toHaveCount(1);
  await expect(h4).toBeVisible();
  await expect(h4).toHaveAttribute("role", "status");
  await expect(h4).toHaveAttribute("aria-live", "polite");
  await expect(h4).toContainText("H4 DRAWER");
  await expect(h4).toContainText("drew 2 cards");
  await expect(page.locator('[data-public-card-announcement="true"]:visible')).toHaveCount(1);

  for (const card of drawnCards) {
    await expect(page.locator(`[data-hand-card-id="${card.id}"]`)).toHaveCount(0);
  }
});
