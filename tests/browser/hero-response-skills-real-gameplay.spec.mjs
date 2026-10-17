import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seed(request, players, deck = []) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players, ...(deck.length ? { deck } : {}) },
  });
  if (!response.ok()) throw new Error(`skill room seed failed: ${await response.text()}`);
  return response.json();
}

async function view(request, seedData, index) {
  const response = await request.get(`${API}/api/rooms?code=${seedData.code}&token=${seedData.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openPlayer(page, seedData, index) {
  const member = seedData.players[index];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seedData.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return member;
}

async function activateConvertedResponse({ page, seedData, playerIndex, skillName, providerId, cardId }) {
  const member = seedData.players[playerIndex];
  const dock = page.locator(`.local-player-dock[data-player-anchor="${member.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: skillName, exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: new RegExp(skillName, "i") });
  await expect(skill).toBeEnabled({ timeout: 20_000 });
  await expect(duplicate).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const selectedCard = dock.locator(`[data-hand-card-id="${cardId}"] .game-card`);
  await expect(selectedCard).toBeEnabled();
  await selectedCard.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond"
    && response.request().postDataJSON()?.providerId === providerId);
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "respond", providerId, cardId, token: member.token });
  await expect(duplicate).toHaveCount(0);
  return submitted.json();
}

test("real Cao Cao Entourage is the sole Skills-band response entry and delegates Dodge", async ({ page, request }) => {
  const attack = card("Attack", "real-hujia-attack");
  const dodge = card("Dodge", "real-hujia-delegate-dodge", "♣");
  const seedData = await seed(request, [
    { name: "ATTACKER", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [attack] },
    { name: "CAO CAO", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    { name: "WEI ALLY", role: "Loyalist", hero: "simayi", hp: 4, maxHp: 4, hand: [dodge] },
    { name: "FOURTH", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
  ]);
  const openedAttack = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(openedAttack.ok()).toBeTruthy();
  const caoView = await view(request, seedData, 1);
  expect(caoView.currentAction).toMatchObject({ kind: "response", actorId: seedData.players[1].id, requirement: "dodge" });
  expect(caoView.currentAction.options.map((option) => option.providerId)).toContain("cao_cao_hujia");

  const cao = await openPlayer(page, seedData, 1);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${cao.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Entourage", exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Entourage/ });
  await expect(skill).toBeEnabled({ timeout: 20_000 });
  await expect(duplicate).toHaveCount(0);
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond"
    && response.request().postDataJSON()?.providerId === "cao_cao_hujia");
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "respond", providerId: "cao_cao_hujia", token: cao.token });
  const delegated = await view(request, seedData, 2);
  expect(delegated.currentAction).toMatchObject({ kind: "response", actorId: seedData.players[2].id, requirement: "dodge" });
  expect(delegated.currentAction.options.find((option) => option.providerId === "card")?.selection.eligibleCardIds).toContain(dodge.id);
  await expect(duplicate).toHaveCount(0);
});

test("real Hua Tuo First Aid is selected from Skills during Dying and uses only its legal red card", async ({ page, request }) => {
  const attack = card("Attack", "real-first-aid-attack");
  const redAttack = card("Attack", "real-first-aid-red", "♥");
  const blackDodge = card("Dodge", "real-first-aid-black", "♠");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack] },
    { name: "VICTIM", role: "Loyalist", hero: "liu-bei", hp: 1, maxHp: 3, hand: [] },
    { name: "HUA TUO", role: "Rebel", hero: "hua-tuo", hp: 3, maxHp: 3, hand: [redAttack, blackDodge] },
    { name: "FOURTH", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
  ]);
  const openedAttack = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(openedAttack.ok()).toBeTruthy();
  const declinedDodge = await request.post(`${API}/api/rooms`, {
    data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token },
  });
  expect(declinedDodge.ok()).toBeTruthy();
  for (const index of [0, 1]) {
    const skipped = await request.post(`${API}/api/rooms`, {
      data: { action: "skip_rescue", code: seedData.code, token: seedData.players[index].token },
    });
    expect(skipped.ok()).toBeTruthy();
  }

  const huaView = await view(request, seedData, 2);
  expect(huaView).toMatchObject({ phase: "dying", isMyAction: true, currentAction: { kind: "dying", actorId: seedData.players[2].id, requirement: "peach" } });
  const firstAidOption = huaView.currentAction.options.find((option) => option.providerId === "hua_tuo_first_aid");
  expect(firstAidOption.selection.eligibleCardIds).toEqual([redAttack.id]);
  expect(firstAidOption.selection.eligibleCardIds).not.toContain(blackDodge.id);
  expect(JSON.stringify(await view(request, seedData, 0))).not.toContain(redAttack.id);

  const hua = await openPlayer(page, seedData, 2);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${hua.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "First Aid", exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /First Aid/ });
  await expect(skill).toBeEnabled({ timeout: 20_000 });
  await expect(duplicate).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const legalCard = dock.locator(`[data-hand-card-id="${redAttack.id}"] .game-card`);
  await expect(legalCard).toBeEnabled();
  await expect(dock.locator(`[data-hand-card-id="${blackDodge.id}"] .game-card`)).toBeDisabled();
  await legalCard.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond");
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "respond", providerId: "hua_tuo_first_aid", cardId: redAttack.id });
  expect((await view(request, seedData, 1)).players.find((player) => player.id === seedData.players[1].id).hp).toBe(1);
  await expect(duplicate).toHaveCount(0);
});

test("real God of War is offered for a Duel Attack response and accepts only the red card", async ({ page, request }) => {
  const duel = card("Duel", "real-wusheng-duel");
  const redPeach = card("Peach", "real-wusheng-red-peach", "♥");
  const blackAttack = card("Attack", "real-wusheng-black-attack", "♠");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [duel] },
    { name: "GUAN YU", role: "Loyalist", hero: "guan-yu", hp: 4, maxHp: 4, hand: [redPeach, blackAttack] },
    { name: "THIRD", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
  ]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: duel.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const legal = await view(request, seedData, 1);
  expect(legal.currentAction).toMatchObject({ kind: "response", actorId: seedData.players[1].id, requirement: "attack" });
  expect(legal.currentAction.options.find((option) => option.providerId === "guan_yu_red_card_attack")?.selection.eligibleCardIds).toEqual([redPeach.id]);
  const guanYu = await openPlayer(page, seedData, 1);
  await activateConvertedResponse({ page, seedData, playerIndex: 1, skillName: "God of War", providerId: "guan_yu_red_card_attack", cardId: redPeach.id });
  expect((await view(request, seedData, 0)).currentAction).toMatchObject({ kind: "response", actorId: seedData.players[0].id, requirement: "attack" });
  await expect(page.locator(`.local-player-dock[data-player-anchor="${guanYu.id}"] .local-hero-skills`).getByRole("button", { name: "God of War", exact: true })).toBeDisabled();
});

test("real Zhao Yun Braveheart converts a Dodge into the next Duel Attack", async ({ page, request }) => {
  const duel = card("Duel", "real-longdan-attack-duel");
  const dodge = card("Dodge", "real-longdan-attack-dodge", "♣");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [duel] },
    { name: "ZHAO YUN", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [dodge] },
    { name: "THIRD", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
  ]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: duel.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  expect((await view(request, seedData, 1)).currentAction.options.map((option) => option.providerId)).toContain("zhao_yun_dodge_as_attack");
  await openPlayer(page, seedData, 1);
  await activateConvertedResponse({ page, seedData, playerIndex: 1, skillName: "Braveheart", providerId: "zhao_yun_dodge_as_attack", cardId: dodge.id });
  expect((await view(request, seedData, 0)).currentAction).toMatchObject({ kind: "response", actorId: seedData.players[0].id, requirement: "attack" });
});

test("real Zhao Yun Braveheart converts an Attack into Dodge and prevents Attack damage", async ({ page, request }) => {
  const attack = card("Attack", "real-longdan-dodge-attack");
  const targetAttack = card("Attack", "real-longdan-dodge-red-attack", "♥");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack] },
    { name: "ZHAO YUN", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [targetAttack] },
    { name: "THIRD", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
  ]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const legal = await view(request, seedData, 1);
  expect(legal.currentAction.options.map((option) => option.providerId)).toContain("zhao_yun_attack_as_dodge");
  await openPlayer(page, seedData, 1);
  const resolved = await activateConvertedResponse({ page, seedData, playerIndex: 1, skillName: "Braveheart", providerId: "zhao_yun_attack_as_dodge", cardId: targetAttack.id });
  expect(resolved.room.players.find((player) => player.id === seedData.players[1].id).hp).toBe(4);
});
