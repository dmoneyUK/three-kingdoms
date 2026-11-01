import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠", rank = "7") => ({ id, kind, suit, rank });

async function seedGame(request, players) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players },
  });
  if (!response.ok()) throw new Error(`seed game failed: ${await response.text()}`);
  return response.json();
}

async function openGame(page, seed, playerIndex) {
  const member = seed.players[playerIndex];
  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    sessionStorage.setItem("wtk.game-ux-trace.active.v2", "true");
  }, { code: seed.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function roomView(request, seed, playerIndex) {
  const member = seed.players[playerIndex];
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${member.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function apiAction(request, seed, playerIndex, action, extra = {}) {
  const before = await roomView(request, seed, playerIndex);
  expect(before.isMyAction, `${action} must be owned by this CurrentAction actor`).toBe(true);
  expect(before.currentAction.legalActions).toContain(action);
  const response = await request.post(`${API}/api/rooms`, {
    data: {
      action,
      code: seed.code,
      token: seed.players[playerIndex].token,
      ...(before.currentAction.negationWindowId ? { context: { windowId: before.currentAction.negationWindowId } } : {}),
      ...extra,
    },
  });
  if (!response.ok()) throw new Error(`${action} failed: ${await response.text()}`);
  return response.json();
}

async function passNegationUntilTargetChoice(request, seed) {
  for (let attempt = 0; attempt < seed.players.length + 2; attempt += 1) {
    const views = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
    const chooser = views.find((view) => view.pendingBorrowedSword?.stage === "choose_target");
    if (chooser) return chooser;
    const actorIndex = views.findIndex((view) => view.isMyAction
      && view.currentAction?.kind === "response" && view.currentAction.requirement === "negate");
    if (actorIndex < 0) throw new Error(`Borrowed Sword did not reach target choice: ${JSON.stringify(views.map((view) => ({ phase: view.phase, pending: view.pendingBorrowedSword, currentAction: view.currentAction })))}`);
    await apiAction(request, seed, actorIndex, "decline_response");
  }
  throw new Error("Borrowed Sword Negation window did not settle into target choice.");
}

function rootDisplay(page, eventId) {
  return page.locator(`[data-public-card-display="true"][data-public-card-root-event-id="${eventId}"]`);
}

async function expectSingleBorrowedJourney(page, eventId, rootCardId, authorId) {
  const display = rootDisplay(page, eventId);
  await expect(display).toHaveCount(1);
  await expect(display).toHaveAttribute("data-public-card-motion", "single-target");
  await expect(display).toHaveAttribute("data-public-card-renderer-kind", "single-target-journey");
  await expect(display).toHaveAttribute("data-public-card-actor-id", authorId);
  await expect(display.locator(`[data-public-card-journey-event-id="${eventId}"]`)).toHaveAttribute("data-public-card-journey-card-id", rootCardId);
  await expect(page.locator(`[data-public-card-journey-card-id="${rootCardId}"]`)).toHaveCount(1);
  await expect(page.locator(`.table-played-card[data-settlement-event-id="${eventId}"]`)).toHaveCount(0);
  await expect(page.locator(`[data-public-card-renderer-kind="static-fallback"][data-public-card-root-event-id="${eventId}"]`)).toHaveCount(0);
}

test("real Borrowed Sword keeps one public root Journey through Negation, target choice, and forced Attack handoff", async ({ page, request }) => {
  const root = card("BorrowedSword", "bs-root-public-journey");
  const weapon = card("GreenDragonBlade", "bs-holder-weapon", "♦", "5");
  const attack = card("Attack", "bs-holder-attack", "♥", "8");
  const dodge = card("Dodge", "bs-victim-dodge", "♠", "9");
  const seed = await seedGame(request, [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [root] },
    { name: "HOLDER", role: "Loyalist", hero: "xu-chu", hp: 4, maxHp: 4, hand: [attack], equipment: { weapon } },
    { name: "VICTIM", role: "Rebel", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [dodge] },
    { name: "FOURTH", role: "Renegade", hero: "zhen-ji", hp: 4, maxHp: 4, hand: [] },
  ]);
  await openGame(page, seed, 0);

  await page.locator(`[data-hand-card-id="${root.id}"] .game-card`).click();
  await page.getByRole("button", { name: "Select HOLDER", exact: true }).click();
  const rootPlay = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(rootPlay).toHaveText("Confirm");
  const rootSubmission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && JSON.parse(response.request().postData() ?? "{}").action === "play_card");
  await rootPlay.click();
  expect((await rootSubmission).ok()).toBeTruthy();

  const initial = await roomView(request, seed, 0);
  const rootEvent = initial.timeline.find((event) => event.type === "card" && event.action === "play" && event.card?.id === root.id);
  expect(rootEvent).toBeTruthy();
  await expectSingleBorrowedJourney(page, rootEvent.id, root.id, seed.players[0].id);
  await expect(rootDisplay(page, rootEvent.id).locator('[data-public-card-announcement="true"]')).toContainText("SOURCE played Borrowed Sword targeting HOLDER.");

  const chooser = await passNegationUntilTargetChoice(request, seed);
  expect(chooser.presentationSnapshot.interaction?.stage).toBe("SEQUENTIAL_CHOICE");
  await expect.poll(() => page.locator('.game-shell').getAttribute("data-presentation-has-interaction")).toBe("true");
  await expectSingleBorrowedJourney(page, rootEvent.id, root.id, seed.players[0].id);
  await expect(page.locator(".borrowed-sword-notice")).toHaveCount(0);
  const chooserInstruction = page.locator(".console-guidance .decision-status strong");
  await expect(chooserInstruction).toHaveText("Choose who HOLDER must Attack.");

  await page.getByRole("button", { name: "Select VICTIM", exact: true }).click();
  const confirmTarget = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirmTarget).toHaveText("Confirm");
  await expect(confirmTarget).toBeEnabled();
  await expect(page.locator('.console-guidance .decision-status')).toHaveAttribute("data-console-selection-count", "1");
  const targetSubmission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && JSON.parse(response.request().postData() ?? "{}").action === "choose_borrowed_sword_target");
  await confirmTarget.click();
  expect((await targetSubmission).ok()).toBeTruthy();

  const forcedViews = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
  const forced = forcedViews[0];
  expect(forced.pendingBorrowedSword?.stage).toBe("force_attack");
  expect(forced.presentationSnapshot.publicNextDecision?.actorIds).toEqual([seed.players[1].id]);
  const forcedIdentity = forced.presentationSnapshot.identity;
  const forcedRootFrameId = forced.presentationSnapshot.interaction.rootFrameId;
  expect(forced.presentationSnapshot.interaction?.stage).toBe("FORCED_ACTION");
  expect(forced.presentationSnapshot.reactionChain).toMatchObject({
    semantics: "PROVEN",
    frameId: forcedRootFrameId,
    rootCard: {
      interactionId: forcedIdentity.interactionId,
      frameId: forcedRootFrameId,
      sourceId: seed.players[0].id,
      targetId: seed.players[1].id,
      cardKind: "BorrowedSword",
    },
    publicEventLinks: {
      root: { eventId: rootEvent.id, resolutionId: rootEvent.resolutionId },
      nodes: [],
    },
    rootEffectState: "ACTIVE",
  });
  expect(forcedViews.every((view) => view.presentationSnapshot.reactionChain?.rootCard?.interactionId
    === forcedIdentity.interactionId)).toBe(true);
  expect(forcedViews.every((view) => view.presentationSnapshot.publicEventFacts.map((fact) => fact.eventId).join("|")
    === forced.presentationSnapshot.publicEventFacts.map((fact) => fact.eventId).join("|"))).toBe(true);
  await expectSingleBorrowedJourney(page, rootEvent.id, root.id, seed.players[0].id);
  await expect(rootDisplay(page, rootEvent.id).locator('[data-public-card-announcement="true"]')).toContainText("SOURCE chose VICTIM as HOLDER's Attack target.");
  await expect(page.locator(".borrowed-sword-notice")).toHaveCount(0);

  const forcedActor = await roomView(request, seed, 1);
  expect(forcedActor.currentAction?.actorId).toBe(seed.players[1].id);
  const playedAttack = await apiAction(request, seed, 1, "respond", { providerId: "card", cardId: attack.id });
  const actualAttack = playedAttack.room.timeline.find((event) => event.type === "card" && event.action === "play" && event.card?.id === attack.id);
  expect(actualAttack?.actorId).toBe(seed.players[1].id);
  await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot.rootAction?.rootEventId).toBe(actualAttack.id);
  const attackDisplay = page.locator(`[data-public-card-display="true"][data-public-card-root-event-id="${actualAttack.id}"]`);
  await expect(attackDisplay).toHaveAttribute("data-public-card-motion", "attack-dodge");
  await expect(attackDisplay).toHaveAttribute("data-public-card-actor-id", seed.players[1].id);
  await expect(attackDisplay.locator('[data-public-card-announcement="true"]')).toContainText("HOLDER played Attack on VICTIM.");

  const victim = await roomView(request, seed, 2);
  expect(victim.currentAction?.requirement).toBe("dodge");
  const dodged = await apiAction(request, seed, 2, "respond", { providerId: "card", cardId: dodge.id });
  expect(dodged.room.players.find((player) => player.id === seed.players[2].id).hp).toBe(4);
});
