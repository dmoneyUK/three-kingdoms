import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠", rank = "7") => ({ id, kind, suit, rank });
const viewport = { width: 390, height: 844 };

async function openSeat(page, room, seatIndex) {
  const player = room.players[seatIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible();
  return player;
}

async function postAction(request, room, player, action, fields = {}) {
  const response = await request.post(`${API}/api/rooms`, {
    data: { action, code: room.code, token: player.token, ...fields },
  });
  expect(response.ok(), await response.text()).toBeTruthy();
  return response.json();
}

test("Green Dragon Blade shows its real follow-up Attack Frame to source and target while preserving Dodge", async ({ browser, request }) => {
  test.setTimeout(75_000);
  const weapon = card("GreenDragonBlade", "gdb-mobile-weapon");
  const firstAttack = card("Attack", "gdb-mobile-first-attack");
  const followUpAttack = card("Attack", "gdb-mobile-follow-up-attack", "♥", "Q");
  const firstDodge = card("Dodge", "gdb-mobile-first-dodge");
  const followUpDodge = card("Dodge", "gdb-mobile-follow-up-dodge", "♣", "8");
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "BLADE OWNER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [weapon, firstAttack, followUpAttack] },
        { name: "TARGET", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [firstDodge, followUpDodge] },
        { name: "OBSERVER", role: "Rebel", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  expect(seeded.ok(), await seeded.text()).toBeTruthy();
  const room = await seeded.json();
  const owner = room.players[0];
  const target = room.players[1];
  const equipped = await postAction(request, room, owner, "play_card", { cardId: weapon.id });
  expect(equipped.room.players.find((player) => player.id === owner.id).equipmentCards).toContainEqual(weapon);

  const ownerContext = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const targetContext = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const ownerPage = await ownerContext.newPage();
  const targetPage = await targetContext.newPage();
  try {
    await Promise.all([openSeat(ownerPage, room, 0), openSeat(targetPage, room, 1)]);

    await postAction(request, room, owner, "play_card", { cardId: firstAttack.id, targetId: target.id });
    await postAction(request, room, target, "respond", { providerId: "card", cardId: firstDodge.id });
    const triggerViewResponse = await request.get(`${API}/api/rooms?code=${room.code}&token=${owner.token}`);
    expect(triggerViewResponse.ok()).toBeTruthy();
    const triggerView = await triggerViewResponse.json();
    expect(triggerView.currentAction).toMatchObject({ kind: "trigger", actorId: owner.id });
    expect(triggerView.currentAction.triggerOptions.map((option) => option.effectId)).toContain("green_dragon_blade_attack_dodged");

    const followed = await postAction(request, room, owner, "trigger", {
      providerId: "green_dragon_blade_attack_dodged", cardId: followUpAttack.id,
    });
    const event = followed.room.timeline.find((entry) => entry.type === "card" && entry.card?.id === followUpAttack.id);
    expect(event).toMatchObject({ player: owner.name, target: target.name, action: "play", card: followUpAttack });
    expect(event.publicCardEffects).toContainEqual(expect.objectContaining({
      semantics: "PROVEN", effectId: "green_dragon_blade_attack_dodged", effectClass: "EFFECT",
      activationOwnerId: owner.id, targetId: target.id, outcome: "FOLLOW_UP_ATTACK_PLAYED",
      rootEventId: expect.any(String),
      materials: [{ cardId: followUpAttack.id, ownerId: owner.id, fromZone: "HAND", toZone: "DISCARD" }],
    }));

    for (const [viewerPage, viewer] of [[ownerPage, owner], [targetPage, target]]) {
      const journey = viewerPage.locator(`[data-public-card-journey-event-id="${event.id}"]`);
      const frame = viewerPage.locator(`[data-public-card-frame-effect-id="green_dragon_blade_attack_dodged"][data-public-card-frame-card-event-id="${event.id}"]`);
      await expect(frame).toBeVisible({ timeout: 15_000 });
      await expect(journey).toHaveAttribute("data-public-card-journey-card-id", followUpAttack.id);
      await expect(journey).toHaveAttribute("data-public-card-journey-actor-id", owner.id);
      await expect(frame).toHaveAttribute("data-public-card-frame-activation-owner-id", owner.id);
      await expect(frame).toHaveAttribute("data-public-card-frame-material-owner-ids", owner.id);
      await expect(frame).toHaveAttribute("data-public-card-frame-material-card-ids", followUpAttack.id);
      await expect(viewerPage.locator(`.local-player-dock[data-player-anchor="${viewer.id}"]`)).toBeVisible();
    }

    const targetStateResponse = await request.get(`${API}/api/rooms?code=${room.code}&token=${target.token}`);
    expect(targetStateResponse.ok()).toBeTruthy();
    const targetState = await targetStateResponse.json();
    expect(targetState.currentAction).toMatchObject({ kind: "response", actorId: target.id, requirement: "dodge" });
    const targetDock = targetPage.locator(`.local-player-dock[data-player-anchor="${target.id}"]`);
    const dodge = targetDock.locator(`[data-hand-card-id="${followUpDodge.id}"] .game-card`);
    await expect(dodge).toBeEnabled({ timeout: 10_000 });
    await dodge.click();
    const confirm = targetDock.locator('[data-action-slot="primary"] button.primary');
    await expect(confirm).toBeEnabled();
    const submitted = targetPage.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "respond"
      && response.request().postDataJSON()?.cardId === followUpDodge.id);
    await confirm.click();
    const response = await submitted;
    expect(response.ok()).toBeTruthy();
    expect(response.request().postDataJSON()).toMatchObject({ token: target.token, providerId: "card", cardId: followUpDodge.id });
  } finally {
    await Promise.all([ownerContext.close(), targetContext.close()]);
  }
});
