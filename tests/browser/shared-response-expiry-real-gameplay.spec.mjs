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
