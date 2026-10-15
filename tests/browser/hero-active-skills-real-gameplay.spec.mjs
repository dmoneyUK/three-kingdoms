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
  return await submitted.json();
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
  const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
  const activation = started.room.presentationSnapshot.diaoChanSkillNotices.find((notice) => notice.notice === "ACTIVATION");
  expect(activation).toMatchObject({
    effectId: "diao_chan_lust", sourceId: seed.players[0].id,
    firstParticipantId: seed.players[1].id, secondParticipantId: seed.players[2].id, firstActorId: seed.players[1].id,
  });
  await expect(page.locator(`[data-effect-notice-event-id="${activation.eventId}"]`)).toContainText("FIRST MAN plays Attack first.");
  await page.reload();
  await expect(page.locator(".effect-notice")).toHaveCount(0);

  const failed = await request.post(`${API}/api/rooms`, { data: { action: "decline_response", code: seed.code, token: seed.players[1].token } });
  expect(failed.ok()).toBeTruthy();
  await expect(page.locator(".effect-notice")).toContainText("LUST · RESULT");
  await expect(page.locator(".effect-notice")).toContainText("FIRST MAN failed to play Attack; 1 Duel damage from SECOND MAN applies.");
});

test("real Lust guidance keeps its ordered selection local and the active skill tap cancels without committing", async ({ page, request }) => {
  const cost = card("Dodge", "real-lust-toggle-cost");
  const seed = await seedSkillRoom(request, {
    hero: "diao-chan", hand: [cost],
    targets: [
      { name: "FIRST MAN", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "SECOND MAN", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
  });
  const user = await openSkillUser(page, seed);
  await page.setViewportSize({ width: 440, height: 894 });

  const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Lust", exact: true });
  const guidance = dock.locator(".decision-status");
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  const costButton = dock.locator(`[data-hand-card-id="${cost.id}"] .game-card`);
  const firstTarget = page.getByRole("button", { name: "Select FIRST MAN", exact: true });
  const secondTarget = page.getByRole("button", { name: "Select SECOND MAN", exact: true });
  const actionPosts = [];
  page.on("request", (browserRequest) => {
    if (browserRequest.url() === `${API}/api/rooms` && browserRequest.method() === "POST") actionPosts.push(browserRequest.postDataJSON());
  });

  const before = await projectedRoom(request, seed, user);
  expect(before.currentAction.triggerOptions.map((option) => option.effectId)).toContain("diao_chan_lust");
  await expect(page.locator("[data-public-activity-chip]")).toContainText("SKILL USER's turn");

  await skill.focus();
  await skill.press("Enter");
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  await expect(guidance).toContainText("Select 1 card and 2 Duel participants.");
  await skill.press("Enter");
  await expect(skill).toHaveAttribute("aria-pressed", "false");
  expect(actionPosts).toEqual([]);

  await skill.click();
  await expect(guidance).toHaveAttribute("data-lust-local-selection", "true");
  await expect(guidance).toContainText("Select 1 card and 2 Duel participants.");
  await expect(guidance).not.toContainText("YOUR DECISION");
  await expect(guidance).not.toContainText("LOCAL CANCEL");
  await expect(guidance).toHaveAttribute("data-console-local-cancel", "false");
  await expect(dock.locator('[data-action-slot="cancel"] button')).toHaveCount(0);
  await expect(confirm).toBeDisabled();

  await costButton.click();
  await firstTarget.click();
  await expect(confirm).toBeDisabled();
  await secondTarget.click();
  const order = guidance.getByTestId("lust-order-guidance");
  await expect(order).toHaveText("Lust order: FIRST MAN plays Attack first, then SECOND MAN.");
  await expect(page.locator(".console-guidance > small[role='status']")).toHaveCount(0);
  await expect(confirm).toBeEnabled();

  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "false");
  await expect(guidance).not.toHaveAttribute("data-lust-local-selection", "true");
  await expect(costButton).not.toHaveClass(/selected/);
  await expect(page.locator(`article.opponent-player-card[data-player-anchor="${seed.players[1].id}"]`)).not.toHaveClass(/selected-target/);
  await expect(page.locator(`article.opponent-player-card[data-player-anchor="${seed.players[2].id}"]`)).not.toHaveClass(/selected-target/);
  expect(actionPosts).toEqual([]);

  const afterCancel = await projectedRoom(request, seed, user);
  expect(afterCancel.myHand.map((item) => item.id)).toContain(cost.id);
  expect(afterCancel.currentAction).toMatchObject({ kind: "turn", actorId: user.id });
  expect(afterCancel.presentationSnapshot.diaoChanSkillNotices ?? []).toEqual([]);

  const started = await completeSkillSelection({ page, request, seed, skillName: "Lust", providerId: "diao_chan_lust", cardIds: [cost.id], targetIndexes: [1, 2] });
  expect(started.room.presentationSnapshot.diaoChanSkillNotices.some((notice) => notice.notice === "ACTIVATION")).toBe(true);
  expect(actionPosts).toHaveLength(1);
  expect(actionPosts[0]).toMatchObject({ action: "trigger", providerId: "diao_chan_lust", cardIds: [cost.id], targetIds: [seed.players[1].id, seed.players[2].id] });
});
