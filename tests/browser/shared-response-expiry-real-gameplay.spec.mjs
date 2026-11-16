import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

test("shared response expiry advances once without sending an automatic Pass", async ({ page, request }) => {
  const attack = card("Attack", "expiry-xiahou-attack");
  const dodge = card("Dodge", "expiry-zhang-dodge", "♣");
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 2, deck: [card("Peach", "expiry-deck-peach")], players: [
      { name: "SIMAYI SILENT", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
      { name: "CAO CAO", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
      { name: "XIAHOU DUN", role: "Rebel", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [attack] },
      { name: "ZHANG LIAO", role: "Loyalist", hero: "zhang-liao", hp: 4, maxHp: 4, hand: [dodge] },
    ] },
  });
  expect(seeded.ok()).toBeTruthy();
  const game = await seeded.json();
  const [silent, cao, source, winner] = game.players;

  const attacked = await request.post(`${API}/api/rooms`, { data: {
    action: "play_card", code: game.code, token: source.token, cardId: attack.id, targetId: cao.id,
  } });
  expect(attacked.ok()).toBeTruthy();
  const invoked = await request.post(`${API}/api/rooms`, { data: {
    action: "respond", code: game.code, token: cao.token, providerId: "cao_cao_hujia",
  } });
  expect(invoked.ok()).toBeTruthy();
  const opened = (await invoked.json()).room;
  const windowId = opened.currentAction.sharedWindow?.windowId;
  expect(windowId).toBeTruthy();
  const submitted = await request.post(`${API}/api/rooms`, { data: {
    action: "respond", code: game.code, token: winner.token, windowId, providerId: "card", cardId: dodge.id,
  } });
  expect(submitted.ok()).toBeTruthy();

  const actions = [];
  let expiryPostSeen;
  const expiryPost = new Promise((resolve) => { expiryPostSeen = resolve; });
  await page.route(`${API}/api/rooms`, async (route) => {
    const requestBody = route.request().method() === "POST" ? route.request().postDataJSON() : null;
    if (requestBody?.action === "advance_timers") {
      actions.push(requestBody.action);
      expiryPostSeen();
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    } else if (requestBody?.action) actions.push(requestBody.action);
    await route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: game.code, token: silent.token, name: silent.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  const skip = page.locator('[data-action-slot="decline"] button');
  await expect(skip).toBeEnabled();

  await expect(expiryPost).resolves.toBeUndefined();
  await expect(page.locator(".console-guidance .decision-status")).toContainText("Waiting for window resolution.");
  await expect(skip).toBeDisabled();

  await expect.poll(async () => {
    const response = await request.get(`${API}/api/rooms?code=${game.code}&token=${silent.token}`);
    if (!response.ok()) return null;
    return (await response.json()).presentationSnapshot?.sharedResponseContributions?.at(-1)?.actorId ?? null;
  }, { timeout: 8_000 }).toBe(winner.id);
  expect(actions.filter((action) => action === "advance_timers")).toHaveLength(1);
  expect(actions).not.toContain("decline_response");
  expect(actions).not.toContain("skip_rescue");
  expect(actions).not.toContain("start_response_timer");
  expect(actions).not.toContain("start_rescue_timer");
  const winnerView = await request.get(`${API}/api/rooms?code=${game.code}&token=${winner.token}`);
  expect(winnerView.ok()).toBeTruthy();
  expect((await winnerView.json()).myHand.some((held) => held.id === dodge.id)).toBe(false);
});

test("a shared Dying Peach uses the legal private respond Confirm without an optimistic public card", async ({ page, request }) => {
  const peach = card("Peach", "shared-dying-peach-ui", "♥");
  const otherPeach = card("Peach", "shared-dying-peach-other", "♦");
  const attack = card("Attack", "shared-dying-attack");
  const seeded = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "play", turnSeat: 3, deck: [card("Dodge", "shared-dying-deck-dodge")], players: [
      { name: "HUANG GAI", role: "Lord", hero: "huang-gai", hp: 1, maxHp: 4, hand: [] },
      { name: "SIMA YI", role: "Loyalist", hero: "simayi", hp: 3, maxHp: 3, hand: [peach] },
      { name: "CAO CAO", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [otherPeach] },
      { name: "SOURCE", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [attack] },
    ],
  } });
  expect(seeded.ok()).toBeTruthy();
  const game = await seeded.json();
  const [dying, rescuer, silent, source] = game.players;
  const attacked = await request.post(`${API}/api/rooms`, { data: {
    action: "play_card", code: game.code, token: source.token, cardId: attack.id, targetId: dying.id,
  } });
  expect(attacked.ok()).toBeTruthy();
  const declined = await request.post(`${API}/api/rooms`, { data: { action: "decline_response", code: game.code, token: dying.token } });
  expect(declined.ok()).toBeTruthy();
  const before = await request.get(`${API}/api/rooms?code=${game.code}&token=${rescuer.token}`);
  expect(before.ok()).toBeTruthy();
  const beforeView = await before.json();
  expect(beforeView.currentAction.kind).toBe("dying");
  expect(beforeView.currentAction.legalActions).toContain("respond");
  const peachOption = beforeView.currentAction.options.find((option) => option.activation === "implicit"
    && option.satisfies === "peach" && option.selection?.type === "cards"
    && option.selection.min === 1 && option.selection.max === 1
    && option.selection.eligibleCardIds.includes(peach.id));
  expect(peachOption).toBeTruthy();
  const windowId = beforeView.currentAction.sharedWindow.windowId;

  const submittedActions = [];
  await page.route(`${API}/api/rooms`, async (route) => {
    if (route.request().method() === "POST") {
      const body = route.request().postDataJSON();
      if (body?.action === "respond") submittedActions.push(body);
    }
    await route.continue();
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: game.code, token: rescuer.token, name: rescuer.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  const peachButton = page.locator(`[data-hand-card-id="${peach.id}"] button.game-card`);
  const confirm = page.locator('[data-shared-dying-peach-confirm="true"]');
  await expect(peachButton).toBeEnabled();
  await expect(confirm).toBeVisible();
  await expect(confirm).toBeDisabled();
  await peachButton.click();
  await expect(peachButton).toHaveAttribute("aria-pressed", "true");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  await expect.poll(() => submittedActions.length).toBe(1);
  expect(submittedActions[0]).toMatchObject({ action: "respond", context: { windowId }, providerId: peachOption.providerId, cardId: peach.id });
  await expect(page.getByText("Response submitted. Waiting for the window to resolve.", { exact: true })).toBeVisible();

  const lockedResponse = await request.get(`${API}/api/rooms?code=${game.code}&token=${rescuer.token}`);
  expect(lockedResponse.ok()).toBeTruthy();
  const locked = await lockedResponse.json();
  expect(locked.currentAction.sharedWindow).toMatchObject({ windowId, locked: true, choice: "intent" });
  expect(locked.myHand.some((held) => held.id === peach.id)).toBe(true);
  const publicCardIds = await page.locator("[data-public-card-journey-card-ids]").evaluateAll((nodes) => nodes.flatMap((node) => (node.getAttribute("data-public-card-journey-card-ids") ?? "").split(",")));
  expect(publicCardIds).not.toContain(peach.id);
  const silentResponse = await request.get(`${API}/api/rooms?code=${game.code}&token=${silent.token}`);
  expect(silentResponse.ok()).toBeTruthy();
  const spectator = await silentResponse.json();
  expect(spectator.presentationSnapshot.sharedResponseWindow).toEqual(locked.presentationSnapshot.sharedResponseWindow);
  expect(spectator.currentAction.sharedWindow).toMatchObject({ locked: false, choice: null });
  expect(JSON.stringify(spectator)).not.toContain(peach.id);
});
