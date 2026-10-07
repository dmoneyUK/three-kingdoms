import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

test("real Composure CurrentAction activates from the Skills band exactly once", async ({ page, request }) => {
  const seedResponse = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "LV MENG", role: "Lord", hero: "lü-meng", hp: 2, maxHp: 4, hand: [card("Peach", "real-composure-peach"), card("Dodge", "real-composure-dodge"), card("Peach", "real-composure-extra")] },
        { name: "TARGET ONE", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
        { name: "TARGET TWO", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "TARGET THREE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  expect(seedResponse.ok()).toBeTruthy();
  const seed = await seedResponse.json();
  const member = seed.players[0];

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  const requests = [];
  page.on("request", (outgoing) => {
    if (outgoing.method() !== "POST" || outgoing.url() !== `${API}/api/rooms`) return;
    try { requests.push(JSON.parse(outgoing.postData() ?? "{}")); } catch { /* non-JSON request */ }
  });
  await page.goto(`${API}/`);

  const dock = page.locator(`.local-player-dock[data-player-anchor="${member.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Composure", exact: true });
  const extras = dock.locator('[data-action-extras="true"]');

  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(skill).toBeDisabled();
  await expect(extras.getByRole("button", { name: /Composure/ })).toHaveCount(0);

  const endTurnResponse = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "end_turn"; }
    catch { return false; }
  });
  await dock.locator('[data-action-slot="decline"] button').getByText("End", { exact: true }).click();
  const opened = await endTurnResponse;
  expect(opened.ok()).toBeTruthy();
  const offered = await opened.json();
  expect(offered.room.currentAction).toMatchObject({ kind: "trigger", actorId: member.id });
  expect(offered.room.currentAction.triggerOptions.map((option) => option.effectId)).toContain("lu_meng_keji");

  await expect(skill).toBeEnabled();
  await expect(skill).toHaveAttribute("aria-pressed", "false");
  await expect(extras.getByRole("button", { name: /Composure/ })).toHaveCount(0);

  const triggerResponse = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "trigger"; }
    catch { return false; }
  });
  await skill.click();
  const submitted = await triggerResponse;
  expect(submitted.ok()).toBeTruthy();
  const body = JSON.parse(submitted.request().postData() ?? "{}");
  const { context, ...actionPayload } = body;
  expect(actionPayload).toEqual({
    action: "trigger", code: seed.code, name: member.name, providerId: "lu_meng_keji", token: member.token,
  });
  expect(context).toMatchObject({ actorId: member.id, meId: member.id, pendingKind: "trigger", phase: "response" });
  expect(context.actionRevision).toBeTruthy();
  expect(requests.filter((entry) => entry.action === "trigger")).toHaveLength(1);

  const resolved = await submitted.json();
  expect(resolved.room.phase).not.toBe("discard");
  expect(resolved.room.currentAction?.triggerOptions?.some((option) => option.effectId === "lu_meng_keji") ?? false).toBe(false);
  await expect(skill).toBeDisabled();
  await expect(extras.getByRole("button", { name: /Composure/ })).toHaveCount(0);
});

test("real Empress Dowager response reaches the Skills band from CurrentAction options", async ({ page, request }) => {
  const attack = card("Attack", "real-empress-dowager-attack");
  const blackCard = card("Peach", "real-empress-dowager-black", "♣");
  const seedResponse = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "ATTACKER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack] },
        { name: "ZHEN JI", role: "Loyalist", hero: "zhen-ji", hp: 4, maxHp: 4, hand: [blackCard] },
        { name: "THIRD", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  expect(seedResponse.ok()).toBeTruthy();
  const seed = await seedResponse.json();
  const attacker = seed.players[0];
  const zhenJi = seed.players[1];

  const attackResponse = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seed.code, token: attacker.token, cardId: attack.id, targetId: zhenJi.id },
  });
  expect(attackResponse.ok()).toBeTruthy();
  const projectionResponse = await request.get(`${API}/api/rooms?code=${seed.code}&token=${zhenJi.token}`);
  expect(projectionResponse.ok()).toBeTruthy();
  const projected = await projectionResponse.json();
  expect(projected.currentAction).toMatchObject({ kind: "response", actorId: zhenJi.id, requirement: "dodge" });
  expect(projected.currentAction.options.find((option) => option.providerId === "zhen_ji_black_card_dodge")?.selection.eligibleCardIds).toContain(blackCard.id);

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: zhenJi.token, name: zhenJi.name });
  const requests = [];
  page.on("request", (outgoing) => {
    if (outgoing.method() !== "POST" || outgoing.url() !== `${API}/api/rooms`) return;
    try { requests.push(JSON.parse(outgoing.postData() ?? "{}")); } catch { /* non-JSON request */ }
  });
  await page.goto(`${API}/`);

  const dock = page.locator(`.local-player-dock[data-player-anchor="${zhenJi.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Empress Dowager", exact: true });
  const extras = dock.locator('[data-action-extras="true"]');
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(skill).toBeEnabled();
  await expect(extras.getByRole("button", { name: /Empress Dowager/ })).toHaveCount(0);

  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const eligible = dock.locator(`[data-hand-card-id="${blackCard.id}"] .game-card`);
  await expect(eligible).toBeEnabled();
  await eligible.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();

  const submitResponse = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "respond"; }
    catch { return false; }
  });
  await confirm.click();
  const submitted = await submitResponse;
  expect(submitted.ok()).toBeTruthy();
  const body = JSON.parse(submitted.request().postData() ?? "{}");
  expect(body).toMatchObject({ action: "respond", providerId: "zhen_ji_black_card_dodge", cardId: blackCard.id });
  expect(requests.filter((entry) => entry.action === "respond")).toHaveLength(1);
  expect(extras.getByRole("button", { name: /Empress Dowager/ })).toHaveCount(0);
});
