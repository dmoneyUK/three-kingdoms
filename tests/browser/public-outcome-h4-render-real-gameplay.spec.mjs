import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

test("a committed public draw is rendered as exactly one visible React H4 for every player", async ({ page, request }) => {
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
  const viewers = room.players;

  await page.setViewportSize({ width: 440, height: 894 });
  const viewerPages = [];
  for (const viewer of viewers) {
    const viewerPage = viewerPages.length === 0 ? page : await page.context().newPage();
    if (viewerPages.length > 0) await viewerPage.setViewportSize({ width: 440, height: 894 });
    await viewerPage.addInitScript(({ code, token, name }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    }, { code: room.code, token: viewer.token, name: viewer.name });
    await viewerPage.goto(`${API}/`);
    await expect(viewerPage.locator(".game-shell")).toBeVisible();
    viewerPages.push({ player: viewer, page: viewerPage });
  }

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
  const viewerCopies = await Promise.all(viewerPages.map(async ({ player: viewer, page: viewerPage }, index) => {
    const h4 = viewerPage.locator(`[data-public-card-announcement-event-id="${eventId}"]`);
    const renderedH4 = viewerPage.locator(`[data-public-h4-event-id="${eventId}"]`);
    const owner = viewerPage.locator(`.public-interaction-event-announcement[data-public-interaction-event-id="${eventId}"]`);
    await expect(owner).toHaveCount(1, { timeout: 15_000 });
    await expect(owner).toBeVisible();
    await expect(h4).toHaveCount(1);
    await expect(h4).toBeVisible();
    await expect(renderedH4).toHaveCount(1);
    await expect(renderedH4).toBeVisible();
    await expect(renderedH4).toHaveAttribute("data-public-h4-owner", "PublicInteractionAnnouncementLayer");
    await expect(renderedH4).toHaveAttribute("data-public-h4-public-sequence", String(committedEvent.publicSequence));
    await expect(h4).toHaveAttribute("role", "status");
    await expect(h4).toHaveAttribute("aria-live", "polite");
    await expect(h4).toContainText(actor.name);
    await expect(h4).toContainText("drew 2 cards");
    await expect(viewerPage.locator('[data-public-card-announcement="true"]:visible')).toHaveCount(1);
    let visibleCopy = await h4.innerText();

    for (const card of drawnCards) {
      await expect(h4).not.toContainText(card.id);
      if (viewer.id !== actor.id) {
        await expect(viewerPage.locator(`[data-hand-card-id="${card.id}"]`)).toHaveCount(0);
        await expect(viewerPage.locator(".game-shell")).not.toContainText(card.id);
      }
    }

    if (index === 1) {
      await viewerPage.reload();
      const retainedH4 = viewerPage.locator(`[data-public-card-announcement-event-id="${eventId}"]`);
      const retainedOwner = viewerPage.locator(`[data-public-h4-event-id="${eventId}"]`);
      await expect(retainedH4).toBeVisible();
      await expect(retainedOwner).toHaveCount(1);
      await expect(retainedOwner).toHaveAttribute("data-public-h4-public-sequence", String(committedEvent.publicSequence));
      await expect(retainedH4).toContainText("drew 2 cards");
      await expect(viewerPage.locator('[data-public-card-announcement="true"]:visible')).toHaveCount(1);
      visibleCopy = await retainedH4.innerText();
    }
    return visibleCopy;
  }));
  expect(new Set(viewerCopies).size, "actor and three observers receive identical public H4 copy").toBe(1);
});

test("a committed non-damage Hero HP loss is rendered as exactly one visible React H4", async ({ page, request }) => {
  const attack = { id: "h4-pan-feng-attack", kind: "Attack", suit: "♠", rank: "7" };
  const targetSecret = { id: "h4-pan-feng-target-secret", kind: "Peach", suit: "♥", rank: "8" };
  const otherSecret = { id: "h4-pan-feng-other-secret", kind: "Dodge", suit: "♣", rank: "9" };
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "H4 PAN FENG", role: "Lord", hero: "pan-feng", hp: 3, maxHp: 4, hand: [attack] },
        { name: "H4 TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [targetSecret] },
        { name: "H4 OBSERVER", role: "Rebel", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
        { name: "H4 FOURTH", role: "Renegade", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [otherSecret] },
      ],
    },
  });
  if (!seeded.ok()) throw new Error(`H4 room seed failed: ${await seeded.text()}`);
  const room = await seeded.json();
  const actor = room.players[0];
  const target = room.players[1];
  const observer = room.players[2];

  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: observer.token, name: observer.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();

  const attackResponse = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: room.code, token: actor.token, cardId: attack.id, targetId: target.id },
  });
  if (!attackResponse.ok()) throw new Error(`Pan Feng Attack failed: ${await attackResponse.text()}`);
  const dodgeResponse = await request.post(`${API}/api/rooms`, {
    data: { action: "decline_response", code: room.code, token: target.token },
  });
  if (!dodgeResponse.ok()) throw new Error(`Attack response failed: ${await dodgeResponse.text()}`);
  const committedStateResponse = await request.get(`${API}/api/rooms?code=${room.code}&token=${observer.token}`);
  expect(committedStateResponse.ok()).toBeTruthy();
  const committedState = await committedStateResponse.json();
  const lossEvent = committedState.timeline.find((event) => event.publicFact?.committedOutcome?.changes?.some((change) =>
    change.kind === "HP_LOST_TO_EFFECT" && change.playerId === actor.id));
  expect(lossEvent, "the server committed Pan Feng's actual HP loss to the public timeline").toBeTruthy();
  expect(lossEvent.publicFact.committedOutcome.changes).toEqual([
    { kind: "HP_LOST_TO_EFFECT", playerId: actor.id, amount: 1 },
  ]);

  const eventId = lossEvent.id;
  const h4 = page.locator(`[data-public-card-announcement-event-id="${eventId}"]`);
  const renderedH4 = page.locator(`[data-public-h4-event-id="${eventId}"]`);
  await expect(h4).toHaveCount(1, { timeout: 15_000 });
  await expect(h4).toBeVisible();
  await expect(renderedH4).toHaveCount(1);
  await expect(renderedH4).toBeVisible();
  await expect(renderedH4).toHaveAttribute("data-public-h4-owner", /^(PublicCardDisplay|PublicInteractionAnnouncementLayer)$/);
  await expect(renderedH4).toHaveAttribute("data-public-h4-public-sequence", String(lossEvent.publicSequence));
  await expect(h4).toHaveAttribute("role", "status");
  await expect(h4).toHaveAttribute("aria-live", "polite");
  await expect(h4).toContainText(actor.name);
  await expect(h4).toContainText("Axe of Insanity");
  await expect(h4).toContainText("lost 1 HP to an effect");
  await expect(page.locator('[data-public-card-announcement="true"]:visible')).toHaveCount(1);
  for (const secretCard of [targetSecret, otherSecret]) {
    await expect(page.locator(".game-shell")).not.toContainText(secretCard.id);
  }
});
