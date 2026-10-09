import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seedSkillRoom(request, { hero, hand, hp = 4, maxHp = 4, targets = [] }) {
  const rolePool = [
    { name: "OTHER ONE", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "OTHER TWO", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    { name: "OTHER THREE", role: "Renegade", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] },
  ];
  const remaining = rolePool.filter(({ role }) => !targets.some((target) => target.role === role));
  const players = [
    { name: "SKILL USER", role: "Lord", hero, hp, maxHp, hand },
    ...targets,
    ...remaining.slice(0, 3 - targets.length),
  ];
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players },
  });
  if (!response.ok()) throw new Error(`skill room seed failed: ${await response.text()}`);
  return response.json();
}

async function openSkillUser(page, seed) {
  const user = seed.players[0];
  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: user.token, name: user.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return user;
}

async function projectedRoom(request, seed, user) {
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${user.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function completeSkillSelection({ page, request, seed, skillName, providerId, cardIds, targetIndexes }) {
  const user = seed.players[0];
  const projection = await projectedRoom(request, seed, user);
  expect(projection.currentAction).toMatchObject({ kind: "turn", actorId: user.id });
  expect(projection.currentAction.triggerOptions.map((option) => option.effectId)).toContain(providerId);

  const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: skillName, exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: new RegExp(skillName, "i") });
  await expect(skill).toBeEnabled();
  await expect(duplicate).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");

  for (const id of cardIds) {
    const cardButton = dock.locator(`[data-hand-card-id="${id}"] .game-card`);
    await expect(cardButton).toBeEnabled();
    await cardButton.click();
  }
  for (const index of targetIndexes) {
    const target = seed.players[index];
    await page.getByRole("button", { name: `Select ${target.name}`, exact: true }).click();
  }

  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === providerId);
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId, cardIds });
  expect(submitted.request().postDataJSON()).not.toHaveProperty("cardId");
  if (targetIndexes.length === 1) expect(submitted.request().postDataJSON().targetId).toBe(seed.players[targetIndexes[0]].id);
  if (targetIndexes.length > 1) expect(submitted.request().postDataJSON().targetIds).toEqual(targetIndexes.map((index) => seed.players[index].id));
  await expect(duplicate).toHaveCount(0);
}

test("real Benevolence uses its server-selected Hand card and target", async ({ page, request }) => {
  const gift = card("Peach", "real-rende-gift", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "liu-bei", hand: [gift],
    targets: [{ name: "RECIPIENT", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Benevolence", providerId: "liu_bei_rende", cardIds: [gift.id], targetIndexes: [1] });
});

test("real Ambushment uses only an eligible black Hand card and a legal target", async ({ page, request }) => {
  const black = card("Dodge", "real-qixi-black", "♣");
  const targetCard = card("Peach", "real-qixi-target", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "gan-ning", hand: [black],
    targets: [{ name: "TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [targetCard] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Ambushment", providerId: "gan_ning_qixi", cardIds: [black.id], targetIndexes: [1] });
});

test("real Captivating submits the Diamond card and authoritative Overindulgence target", async ({ page, request }) => {
  const diamond = card("Peach", "real-captivating-diamond", "♦");
  const seed = await seedSkillRoom(request, {
    hero: "daqiao", hand: [diamond],
    targets: [{ name: "TARGET", role: "Loyalist", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Captivating", providerId: "daqiao_captivating", cardIds: [diamond.id], targetIndexes: [1] });
});

test("real Betrothment requires two cards and an injured male target", async ({ page, request }) => {
  const first = card("Dodge", "real-betrothment-first", "♣");
  const second = card("Peach", "real-betrothment-second", "♥");
  const seed = await seedSkillRoom(request, {
    hero: "sun-shangxiang", hp: 3, maxHp: 4, hand: [first, second],
    targets: [{ name: "INJURED MAN", role: "Loyalist", hero: "zhao-yun", hp: 3, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Betrothment", providerId: "sun_shangxiang_betrothment", cardIds: [first.id, second.id], targetIndexes: [1] });
});

test("real Prodigal Healer submits the eligible card and injured character", async ({ page, request }) => {
  const cost = card("Attack", "real-prodigal-cost");
  const seed = await seedSkillRoom(request, {
    hero: "hua-tuo", hand: [cost],
    targets: [{ name: "INJURED", role: "Loyalist", hero: "liu-bei", hp: 3, maxHp: 4, hand: [] }],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Prodigal Healer", providerId: "hua_tuo_prodigal_healer", cardIds: [cost.id], targetIndexes: [1] });
});

test("real Lust submits its ordered two-target selection", async ({ page, request }) => {
  const cost = card("Dodge", "real-lust-cost");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost],
    targets: [
      { name: "FIRST MAN", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "SECOND MAN", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
  });
  await openSkillUser(page, seed);
  await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
});
