import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seed(request, { players, phase = "draw", deck }) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase, turnSeat: 0, players, ...(deck ? { deck } : {}) },
  });
  if (!response.ok()) throw new Error(`skill room seed failed: ${await response.text()}`);
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

async function view(request, seedData, index) {
  const response = await request.get(`${API}/api/rooms?code=${seedData.code}&token=${seedData.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function activateOptionalSkill({ page, request, seedData, playerIndex, skillName, providerId }) {
  const member = seedData.players[playerIndex];
  const projection = await view(request, seedData, playerIndex);
  expect(projection.currentAction.actorId).toBe(member.id);
  expect((projection.currentAction.triggerOptions ?? []).map((option) => option.effectId)).toContain(providerId);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${member.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: skillName, exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: new RegExp(skillName.split(" —")[0], "i") });
  await expect(skill).toBeEnabled({ timeout: 20_000 });
  await expect(duplicate).toHaveCount(0);
  const submission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === providerId);
  await skill.click();
  const response = await submission;
  expect(response.ok()).toBeTruthy();
  expect(response.request().postDataJSON()).toMatchObject({ action: "trigger", code: seedData.code, token: member.token, providerId });
  await expect(duplicate).toHaveCount(0);
  return response;
}

for (const scenario of [
  { hero: "xu-chu", skill: "Bared Bodied", provider: "xu_chu_bared_bodied", expectedHand: 1 },
  { hero: "zhou-yu", skill: "Heroic", provider: "zhou_yu_yingzi", expectedHand: 3 },
]) {
  test(`real ${scenario.skill} is offered and activated from the Skills band`, async ({ page, request }) => {
    const seedData = await seed(request, {
      players: [
        { name: "SKILL USER", role: "Lord", hero: scenario.hero, hp: 4, maxHp: 4, hand: [] },
        { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
        { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
      ],
      deck: [card("Attack", `${scenario.provider}-draw-1`), card("Dodge", `${scenario.provider}-draw-2`), card("Peach", `${scenario.provider}-draw-3`)],
    });
    const draw = await request.post(`${API}/api/rooms`, {
      data: { action: "draw", code: seedData.code, token: seedData.players[0].token },
    });
    expect(draw.ok()).toBeTruthy();
    await openPlayer(page, seedData, 0);
    const activated = await activateOptionalSkill({ page, request, seedData, playerIndex: 0, skillName: scenario.skill, providerId: scenario.provider });
    const result = await activated.json();
    expect(result.room.myHand).toHaveLength(scenario.expectedHand);
    expect(result.room.players.find((player) => player.id === seedData.players[0].id).handCount).toBe(scenario.expectedHand);
  });
}

test("real Huang Gai Self Sacrifice uses its direct CurrentAction activation", async ({ page, request }) => {
  const seedData = await seed(request, {
    phase: "play",
    players: [
      { name: "HUANG GAI", role: "Lord", hero: "huang-gai", hp: 4, maxHp: 4, hand: [] },
      { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [card("Attack", "real-kurou-draw-1"), card("Dodge", "real-kurou-draw-2")],
  });
  await openPlayer(page, seedData, 0);
  const before = await view(request, seedData, 0);
  expect(before.currentAction).toMatchObject({ kind: "turn", actorId: seedData.players[0].id });
  expect(before.currentAction.triggerOptions.map((option) => option.effectId)).toContain("huang_gai_kurou");
  const dock = page.locator(`.local-player-dock[data-player-anchor="${seedData.players[0].id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Self Sacrifice", exact: true });
  await expect(skill).toBeEnabled();
  await expect(dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Self Sacrifice/ })).toHaveCount(0);
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === "huang_gai_kurou");
  await skill.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "huang_gai_kurou" });
  const result = await submitted.json();
  expect(result.room.players.find((player) => player.id === seedData.players[0].id).hp).toBe(3);
  expect(result.room.myHand).toHaveLength(2);
});

test("real Godess of Luo River enters the authoritative Judgment continuation from Skills", async ({ page, request }) => {
  const seedData = await seed(request, {
    phase: "play",
    players: [
      { name: "PREVIOUS", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
      { name: "ZHEN JI", role: "Loyalist", hero: "zhen-ji", hp: 4, maxHp: 4, hand: [] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [card("Peach", "real-luoshen-red", "♥"), card("Dodge", "real-luoshen-next")],
  });
  const previous = seedData.players[0];
  const ended = await request.post(`${API}/api/rooms`, { data: { action: "end_turn", code: seedData.code, token: previous.token } });
  expect(ended.ok()).toBeTruthy();
  const zhenJiView = await view(request, seedData, 1);
  expect(zhenJiView.currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[1].id, triggerEvent: "turn_start" });
  expect(zhenJiView.currentAction.triggerOptions.map((option) => option.effectId)).toContain("zhen_ji_luoshen");
  await openPlayer(page, seedData, 1);
  const activated = await activateOptionalSkill({ page, request, seedData, playerIndex: 1, skillName: "Godess of Luo River", providerId: "zhen_ji_luoshen" });
  const result = await activated.json();
  expect(result.room.players.find((player) => player.id === seedData.players[1].id).judgementCards).toHaveLength(0);
  expect(result.room.currentAction.actorId).toBe(seedData.players[1].id);
});

test("real Cultivation follows a played Stratagem through Skills and preserves its draw continuation", async ({ page, request }) => {
  const stratagem = card("DrawTwo", "real-cultivation-stratagem");
  const seedData = await seed(request, {
    phase: "play",
    players: [
      { name: "HUANG YUEYING", role: "Lord", hero: "huang-yueying", hp: 4, maxHp: 4, hand: [stratagem] },
      { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [card("Attack", "real-cultivation-bonus"), card("Dodge", "real-cultivation-draw-one"), card("Peach", "real-cultivation-draw-two")],
  });
  const user = await openPlayer(page, seedData, 0);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
  const playedCard = dock.locator(`[data-hand-card-id="${stratagem.id}"] .game-card`);
  await expect(playedCard).toBeEnabled();
  await playedCard.click();
  const play = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(play).toHaveText("Play");
  const playResponse = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "play_card");
  await play.click();
  const played = await playResponse;
  expect(played.ok()).toBeTruthy();
  const offered = await view(request, seedData, 0);
  expect(offered.currentAction).toMatchObject({ kind: "trigger", actorId: user.id, triggerEvent: "stratagem_used" });
  expect(offered.currentAction.triggerOptions.map((option) => option.effectId)).toContain("huang_yueying_cultivation");
  await activateOptionalSkill({ page, request, seedData, playerIndex: 0, skillName: "Cultivation", providerId: "huang_yueying_cultivation" });
  const result = await view(request, seedData, 0);
  expect(result.myHand).toHaveLength(3);
  expect(result.myHand.map((item) => item.id)).toContain("real-cultivation-bonus");
});

test("real Divine Wisdom opens Prudence as the next authoritative Skills-band choice", async ({ page, request }) => {
  const hand = [card("Attack", "real-divine-one"), card("Dodge", "real-divine-two"), card("Peach", "real-divine-three")];
  const seedData = await seed(request, {
    phase: "play",
    players: [
      { name: "PREVIOUS", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
      { name: "LADY GAN", role: "Loyalist", hero: "lady-gan", hp: 2, maxHp: 3, hand },
      { name: "TARGET", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [card("Dodge", "real-prudence-target-held")] },
      { name: "RENEGADE", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [card("Attack", "real-prudence-draw"), card("Dodge", "real-prudence-next")],
  });
  const ended = await request.post(`${API}/api/rooms`, {
    data: { action: "end_turn", code: seedData.code, token: seedData.players[0].token },
  });
  expect(ended.ok()).toBeTruthy();
  const ladyGan = seedData.players[1];
  const start = await view(request, seedData, 1);
  expect(start.currentAction).toMatchObject({ kind: "trigger", actorId: ladyGan.id, triggerEvent: "turn_start" });
  expect(start.currentAction.triggerOptions.map((option) => option.effectId)).toContain("lady_gan_divine_wisdom");
  await openPlayer(page, seedData, 1);

  await activateOptionalSkill({ page, request, seedData, playerIndex: 1, skillName: "Divine Wisdom", providerId: "lady_gan_divine_wisdom" });
  const recovered = await view(request, seedData, 1);
  expect(recovered.currentAction).toMatchObject({ kind: "trigger", actorId: ladyGan.id, triggerEvent: "hp_recovered" });
  expect(recovered.currentAction.triggerOptions.map((option) => option.effectId)).toContain("lady_gan_prudence");
  const targetHandBefore = recovered.players.find((player) => player.id === seedData.players[2].id).handCount;

  const dock = page.locator(`.local-player-dock[data-player-anchor="${ladyGan.id}"]`);
  const prudence = dock.locator(".local-hero-skills").getByRole("button", { name: "Prudence", exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Prudence/ });
  await expect(prudence).toBeEnabled({ timeout: 20_000 });
  await expect(duplicate).toHaveCount(0);
  await prudence.click();
  await expect(prudence).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Select TARGET", exact: true }).click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === "lady_gan_prudence");
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "lady_gan_prudence", targetId: seedData.players[2].id });
  expect((await view(request, seedData, 2)).players.find((player) => player.id === seedData.players[2].id).handCount).toBe(targetHandBefore + 1);
  await expect(duplicate).toHaveCount(0);
});
