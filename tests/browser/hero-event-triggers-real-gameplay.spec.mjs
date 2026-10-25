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

async function activateDirectSkill({ page, request, seedData, playerIndex, label, providerId }) {
  const member = seedData.players[playerIndex];
  const projection = await view(request, seedData, playerIndex);
  expect(projection.currentAction.actorId).toBe(member.id);
  expect((projection.currentAction.triggerOptions ?? []).map((option) => option.effectId)).toContain(providerId);
  const user = await openPlayer(page, seedData, playerIndex);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${user.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: label, exact: true });
  const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: new RegExp(label, "i") });
  await expect(skill).toBeEnabled({ timeout: 20_000 });
  await expect(duplicate).toHaveCount(0);
  const submission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === providerId);
  await skill.click();
  const result = await submission;
  expect(result.ok()).toBeTruthy();
  expect(result.request().postDataJSON()).toMatchObject({ action: "trigger", code: seedData.code, token: member.token, providerId });
  await expect(duplicate).toHaveCount(0);
  return { result: await result.json(), dock, duplicate, skill, member };
}

test("real Treachery reaches Skills after Cao Cao takes Attack damage and obtains the cause card", async ({ page, request }) => {
  const attack = card("Attack", "real-jianxiong-attack");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [attack] },
    { name: "CAO CAO", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    { name: "ALLY", role: "Loyalist", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
  ]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const hit = await request.post(`${API}/api/rooms`, { data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token } });
  expect(hit.ok()).toBeTruthy();
  expect((await view(request, seedData, 1)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("cao_cao_jianxiong");

  const { result, duplicate } = await activateDirectSkill({ page, request, seedData, playerIndex: 1, label: "Treachery", providerId: "cao_cao_jianxiong" });
  expect(result.room.myHand.map((held) => held.id)).toContain(attack.id);
  await expect(duplicate).toHaveCount(0);
});

test("real Cavalry activates from the attacking Ma Chao Skills band and resolves the target continuation", async ({ page, request }) => {
  const attack = card("Attack", "real-cavalry-attack");
  const seedData = await seed(request, [
    { name: "MA CHAO", role: "Lord", hero: "ma-chao", hp: 4, maxHp: 4, hand: [attack] },
    { name: "TARGET", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "THIRD", role: "Rebel", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ], [card("Peach", "real-cavalry-red-judgement", "♥")]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  expect((await view(request, seedData, 0)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("ma_chao_cavalry");

  const { result, duplicate } = await activateDirectSkill({ page, request, seedData, playerIndex: 0, label: "Cavalry", providerId: "ma_chao_cavalry" });
  expect(result.room.players.find((player) => player.id === seedData.players[1].id).hp).toBe(3);
  expect((await view(request, seedData, 1)).currentAction?.kind).not.toBe("trigger");
  await expect(duplicate).toHaveCount(0);
});

test("real Beauty Outshining the Moon appears only after Diao Chan ends her turn", async ({ page, request }) => {
  const seedData = await seed(request, [
    { name: "DIAO CHAN", role: "Lord", hero: "diao-chan", hp: 4, maxHp: 4, hand: [] },
    { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ], [card("Peach", "real-beauty-draw")]);
  await openPlayer(page, seedData, 0);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${seedData.players[0].id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Beauty Outshining the Moon", exact: true });
  await expect(skill).toBeDisabled();
  const ended = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "end_turn");
  await dock.locator('[data-action-slot="decline"] button').getByText("End", { exact: true }).click();
  expect((await ended).ok()).toBeTruthy();
  expect((await view(request, seedData, 0)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("diao_chan_beauty_outshining_moon");
  const activated = await activateDirectSkill({ page, request, seedData, playerIndex: 0, label: "Beauty Outshining the Moon", providerId: "diao_chan_beauty_outshining_moon" });
  expect(activated.result.room.myHand.map((held) => held.id)).toContain("real-beauty-draw");
  const notice = page.locator("[data-public-skill-event-announcement='true']");
  await expect(notice).toHaveCount(1);
  await expect(notice.locator(".played-card")).toHaveCount(0);
  await expect(notice).toContainText("BEAUTY");
  await expect(notice).toContainText("DIAO CHAN used Beauty and drew 1 card.");
  await expect(notice).not.toContainText("DIAO CHAN activated Beauty Outshining the Moon.");
  await expect(page.locator(".effect-notice")).toHaveCount(0);
  await expect(notice).toHaveAttribute("data-public-event-semantics", "PROVEN");
  await expect(notice).toHaveAttribute("data-public-event-phase", "DRAWN");
  const rootEventId = await notice.getAttribute("data-public-event-root-id");
  const drawEventId = await notice.getAttribute("data-public-event-proof-id");
  expect(rootEventId).toBeTruthy();
  expect(drawEventId).toBeTruthy();
  expect(drawEventId).not.toBe(rootEventId);
  await expect(notice).toHaveAttribute("data-public-event-source-id", seedData.players[0].id);
  await expect(notice).toHaveAttribute("data-public-event-id", rootEventId);
  await page.reload();
  await expect(page.locator("[data-public-skill-event-announcement='true']")).toHaveCount(0);
});

test("real Second Wind is reached after Lu Xun spends his last Attack and draws from Skills", async ({ page, request }) => {
  const attack = card("Attack", "real-second-wind-attack");
  const seedData = await seed(request, [
    { name: "LU XUN", role: "Lord", hero: "lu-xun", hp: 4, maxHp: 4, hand: [attack] },
    { name: "TARGET", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "REBEL", role: "Rebel", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ], [card("Peach", "real-second-wind-draw")]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  expect((await view(request, seedData, 0)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("lu_xun_second_wind");
  const { result } = await activateDirectSkill({ page, request, seedData, playerIndex: 0, label: "Second Wind", providerId: "lu_xun_second_wind" });
  expect(result.room.myHand.map((held) => held.id)).toContain("real-second-wind-draw");
});

test("real Necromancy replaces a revealed Delayed Stratagem Judgement from the Skills band", async ({ page, request }) => {
  const delayed = card("Overindulgence", "real-guicai-delayed");
  const replacement = card("Peach", "real-guicai-replacement", "♥");
  const seedData = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "draw", turnSeat: 0,
    players: [
      { name: "SIMA YI", role: "Lord", hero: "simayi", hp: 4, maxHp: 4, hand: [replacement], judgement: [delayed] },
      { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [card("Dodge", "real-guicai-original", "♠")],
  } });
  expect(seedData.ok()).toBeTruthy();
  const game = await seedData.json();
  const revealed = await request.post(`${API}/api/rooms`, { data: { action: "draw", code: game.code, token: game.players[0].token } });
  expect(revealed.ok()).toBeTruthy();
  const legal = await view(request, game, 0);
  expect(legal.currentAction).toMatchObject({ kind: "trigger", actorId: game.players[0].id, triggerEvent: "judgement_revealed" });
  expect(legal.currentAction.triggerOptions.find((option) => option.effectId === "sima_yi_guicai")?.selection.eligibleCardIds).toContain(replacement.id);

  const sima = await openPlayer(page, game, 0);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${sima.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Necromancy", exact: true });
  await expect(skill).toBeEnabled();
  await expect(dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Necromancy/ })).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  const cardButton = dock.locator(`[data-hand-card-id="${replacement.id}"] .game-card`);
  await expect(cardButton).toBeEnabled();
  await cardButton.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === "sima_yi_guicai");
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "sima_yi_guicai", cardIds: [replacement.id] });
  expect(submitted.request().postDataJSON()).not.toHaveProperty("cardId");
  expect((await submitted.json()).room.currentAction.actorId).toBe(sima.id);
});

test("W4-F8: Necromancy frames the genuine Judgement replacement for multiple phone viewers", async ({ page, browser, request }) => {
  test.setTimeout(90_000);
  const attack = card("Attack", "w4-f8-eight-trigrams-attack");
  const armor = card("EightTrigrams", "w4-f8-eight-trigrams-armor");
  const replacement = card("Peach", "w4-f8-replacement", "♥");
  const privateCard = card("Dodge", "w4-f8-private-card", "♠");
  const original = card("Dodge", "w4-f8-original-judgement", "♣");
  const seedResponse = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "play", turnSeat: 0,
    players: [
      { name: "ATTACKER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack] },
      { name: "TARGET", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [], equipment: { armor } },
      { name: "SIMA YI", role: "Rebel", hero: "simayi", hp: 4, maxHp: 4, hand: [replacement, privateCard] },
      { name: "OBSERVER", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [original],
  } });
  expect(seedResponse.ok()).toBeTruthy();
  const game = await seedResponse.json();
  const observerPage = await browser.newPage();
  try {
    const sima = await openPlayer(page, game, 2);
    const observer = await openPlayer(observerPage, game, 3);
    const openedAttack = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: game.code, token: game.players[0].token, cardId: attack.id, targetId: game.players[1].id },
    });
    expect(openedAttack.ok(), await openedAttack.text()).toBeTruthy();
    let projected = await view(request, game, 1);
    expect(projected.currentAction).toMatchObject({ kind: "response", actorId: game.players[1].id, requirement: "dodge" });
    expect(projected.currentAction.options.map((option) => option.providerId)).toContain("eight_trigrams_dodge");
    const openedJudgement = await request.post(`${API}/api/rooms`, {
      data: { action: "respond", code: game.code, token: game.players[1].token, providerId: "eight_trigrams_dodge" },
    });
    expect(openedJudgement.ok(), await openedJudgement.text()).toBeTruthy();
    projected = await view(request, game, 2);
    expect(projected.currentAction).toMatchObject({ kind: "trigger", actorId: sima.id, triggerEvent: "judgement_revealed" });

    const dock = page.locator(`.local-player-dock[data-player-anchor="${sima.id}"]`);
    const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Necromancy", exact: true });
    await expect(skill).toBeEnabled();
    await skill.click();
    const selectedCard = dock.locator(`[data-hand-card-id="${replacement.id}"] .game-card`);
    await expect(selectedCard).toBeEnabled();
    await selectedCard.click();
    const confirm = dock.locator('[data-action-slot="primary"] button.primary');
    await expect(confirm).toHaveText("Confirm");
    const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "sima_yi_guicai");
    await confirm.click();
    const submitted = await submittedPromise;
    expect(submitted.ok()).toBeTruthy();
    expect(submitted.request().postDataJSON()).toMatchObject({
      action: "trigger", code: game.code, token: sima.token,
      providerId: "sima_yi_guicai", cardIds: [replacement.id],
    });
    expect(submitted.request().postDataJSON()).not.toHaveProperty("cardId");
    const result = await submitted.json();
    const replacementEvent = result.room.timeline.find((event) => event.type === "card" && event.card?.id === replacement.id);
    const originalEvent = result.room.timeline.find((event) => event.type === "card" && event.card?.id === original.id);
    expect(originalEvent).toBeTruthy();
    expect(replacementEvent).toMatchObject({ action: "reveal", judgement: true, player: sima.name, target: game.players[1].name });
    expect(result.room.timeline.filter((event) => event.type === "card" && [original.id, replacement.id].includes(event.card?.id))).toHaveLength(2);
    expect(replacementEvent.publicCardEffects).toContainEqual(expect.objectContaining({
      effectId: "sima_yi_guicai", effectClass: "JUDGEMENT", activationOwnerId: sima.id,
      targetId: game.players[1].id, rootEventId: originalEvent.id, rootResolutionId: originalEvent.resolutionId,
      outcome: "REPLACED_JUDGEMENT",
      materials: [{ cardId: replacement.id, ownerId: sima.id, fromZone: "HAND", toZone: "JUDGEMENT" }],
    }));
    const projectedEffect = result.room.presentationSnapshot?.publicCardEffects?.find((effect) => effect.eventId === replacementEvent.id);
    expect(projectedEffect).toMatchObject({ eventId: replacementEvent.id, effectId: "sima_yi_guicai", effectClass: "JUDGEMENT" });
    const viewers = [{ player: sima, page }, { player: observer, page: observerPage }];
    const frameEvidence = await Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      const frameSnapshot = ({ viewerId, eventId, cardId }) => {
        const journey = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
          .find((element) => element.dataset.publicCardJourneyEventId === eventId);
        const display = journey?.closest(".public-card-display");
        const frame = journey?.querySelector('[data-public-card-frame-effect-id="sima_yi_guicai"]');
        const phase = journey?.dataset.publicCardJourneyPhase;
        if (!journey || display?.dataset.publicCardViewerId !== viewerId || !frame
          || !["reveal", "move"].includes(phase)
          || journey.dataset.publicCardJourneyCardIds !== cardId) return false;
        const faces = [...frame.querySelectorAll("[data-public-card-effect-frame-card-id]")]
          .map((face) => face.getAttribute("data-public-card-effect-frame-card-id"));
        return {
          viewerId: display.dataset.publicCardViewerId,
          eventId: journey.dataset.publicCardJourneyEventId,
          phase,
          frameCount: display.querySelectorAll('[data-public-card-frame-effect-id="sima_yi_guicai"]').length,
          frameClass: frame.getAttribute("data-public-card-frame-class"),
          frameOwnerId: frame.getAttribute("data-public-card-frame-activation-owner-id"),
          frameMaterialOwnerIds: frame.getAttribute("data-public-card-frame-material-owner-ids"),
          frameMaterialCardIds: frame.getAttribute("data-public-card-frame-material-card-ids"),
          frameFaces: faces,
          frameTitle: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
          announcementCount: display.querySelectorAll('[data-public-card-announcement="true"]').length,
          announcement: display.querySelector('[data-public-card-announcement="true"]')?.textContent?.trim(),
          viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
        };
      };
      let handle;
      try {
        handle = await viewerPage.waitForFunction(frameSnapshot, { viewerId: player.id, eventId: replacementEvent.id, cardId: replacement.id }, { timeout: 12_000 });
      } catch (error) {
        const snapshot = await viewerPage.evaluate(frameSnapshot, { viewerId: player.id, eventId: replacementEvent.id, cardId: replacement.id });
        const activeDisplays = await viewerPage.locator(".public-card-display").evaluateAll((elements) => elements.map((element) => ({
          key: element.getAttribute("data-public-card-action-key"),
          rootEventId: element.getAttribute("data-public-card-root-event-id"),
          eventId: element.getAttribute("data-public-card-event-id"),
          motion: element.getAttribute("data-public-card-motion"),
          cards: [...element.querySelectorAll("[data-public-card-journey-event-id]")].map((card) => ({
            eventId: card.getAttribute("data-public-card-journey-event-id"),
            cardId: card.getAttribute("data-public-card-id"),
            phase: card.getAttribute("data-public-card-journey-phase"),
            frame: card.querySelector("[data-public-card-frame-effect-id]")?.getAttribute("data-public-card-frame-effect-id") ?? null,
          })),
          announcement: element.querySelector('[data-public-card-announcement="true"]')?.textContent?.trim(),
        })));
        throw new Error(`${error instanceof Error ? error.message : String(error)}; frame=${JSON.stringify(snapshot)}; displays=${JSON.stringify(activeDisplays)}; replacement=${replacementEvent.id}; original=${originalEvent.id}`);
      }
      return handle.jsonValue();
    }));
    expect(frameEvidence[0]).toMatchObject({
      viewerId: sima.id, eventId: replacementEvent.id, frameCount: 1, frameClass: "JUDGEMENT",
      frameOwnerId: sima.id, frameMaterialOwnerIds: sima.id, frameMaterialCardIds: replacement.id,
      frameFaces: [replacement.id], frameTitle: "NECROMANCY · JUDGEMENT REPLACEMENT",
      announcementCount: 1, viewport: { width: 390, height: 844, scrollWidth: 390 },
    });
    expect(frameEvidence[1]).toMatchObject({
      viewerId: observer.id, eventId: replacementEvent.id, frameCount: 1, frameClass: "JUDGEMENT",
      frameOwnerId: sima.id, frameMaterialOwnerIds: sima.id, frameMaterialCardIds: replacement.id,
      frameFaces: [replacement.id], frameTitle: "NECROMANCY · JUDGEMENT REPLACEMENT",
      announcementCount: 1, viewport: { width: 390, height: 844, scrollWidth: 390 },
    });
    for (const evidence of frameEvidence) {
      expect(evidence.phase).toMatch(/^(reveal|move)$/);
      expect(evidence.announcement).toContain("replace");
      expect(evidence.announcement).toContain("Judgement");
    }
    expect(await view(request, game, 3).then((projection) => JSON.stringify(projection))).not.toContain(privateCard.id);
    await expect(observerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
    await expect(page.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(1);
  } finally {
    await observerPage.close();
  }
});

test("real Jealousy of God obtains the effective delayed-Judgement card through Skills", async ({ page, request }) => {
  const delayed = card("Overindulgence", "real-jealousy-delayed");
  const judged = card("Dodge", "real-jealousy-effective", "♠");
  const seedResponse = await request.post(`${API}/__test/seed-playing-game`, { data: {
    phase: "draw", turnSeat: 0,
    players: [
      { name: "GUO JIA", role: "Lord", hero: "guo-jia", hp: 4, maxHp: 4, hand: [], judgement: [delayed] },
      { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [judged],
  } });
  expect(seedResponse.ok()).toBeTruthy();
  const game = await seedResponse.json();
  const revealed = await request.post(`${API}/api/rooms`, { data: { action: "draw", code: game.code, token: game.players[0].token } });
  expect(revealed.ok()).toBeTruthy();
  expect((await view(request, game, 0)).currentAction).toMatchObject({ kind: "trigger", actorId: game.players[0].id, triggerEvent: "judgement_effective" });
  const { result } = await activateDirectSkill({ page, request, seedData: game, playerIndex: 0, label: "Jealousy of God", providerId: "guo_jia_jealousy_of_god" });
  expect(result.room.myHand.map((held) => held.id)).toContain(judged.id);
});

test("real Stauchness reaches its mandatory source-choice continuation after the Skills activation", async ({ page, browser, request }) => {
  const attack = card("Attack", "real-ganglie-attack");
  const sourceCards = [card("Peach", "real-ganglie-source-peach", "♥"), card("Dodge", "real-ganglie-source-dodge", "♣")];
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack, ...sourceCards] },
    { name: "XIAHOU DUN", role: "Loyalist", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
    { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "RENEGADE", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
  ], [card("Dodge", "real-ganglie-spade-judgement", "♠")]);
  const opened = await request.post(API + "/api/rooms", {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const hit = await request.post(API + "/api/rooms", { data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token } });
  expect(hit.ok()).toBeTruthy();
  expect((await view(request, seedData, 1)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("xiahou_dun_ganglie");
  const xiahou = await activateDirectSkill({ page, request, seedData, playerIndex: 1, label: "Stauchness", providerId: "xiahou_dun_ganglie" });
  expect((await view(request, seedData, 0)).currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[0].id, triggerEvent: "damage_suffered" });
  await expect(page.locator('[data-public-card-frame-effect-id="xiahou_dun_ganglie"]')).toHaveCount(0);

  const sourcePage = await browser.newPage();
  try {
    await openPlayer(sourcePage, seedData, 0);
    const sourceView = await view(request, seedData, 0);
    const choice = sourceView.currentAction.triggerOptions.find((option) => option.effectId === "xiahou_dun_ganglie");
    expect(choice.selection.choices.map((option) => option.id)).toEqual(["discard_two", "take_damage"]);
    const dialog = sourcePage.getByRole("dialog", { name: "Stauchness decision" });
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("aria-modal", "false");
    const overlayBehavior = await dialog.evaluate((panel) => {
      const overlay = panel.parentElement;
      const table = overlay?.parentElement;
      const panelBox = panel.getBoundingClientRect();
      const panelHit = document.elementFromPoint(panelBox.left + panelBox.width / 2, panelBox.top + panelBox.height / 2);
      return {
        rootPosition: overlay && getComputedStyle(overlay).position,
        rootInsets: overlay && ["top", "right", "bottom", "left"].map((property) => getComputedStyle(overlay)[property]),
        rootPointerEvents: overlay && getComputedStyle(overlay).pointerEvents,
        panelPointerEvents: getComputedStyle(panel).pointerEvents,
        panelWithinTable: Boolean(table && panelBox.left >= table.getBoundingClientRect().left - 1
          && panelBox.right <= table.getBoundingClientRect().right + 1
          && panelBox.top >= table.getBoundingClientRect().top - 1
          && panelBox.bottom <= table.getBoundingClientRect().bottom + 1),
        panelReceivesInput: Boolean(panelHit?.closest(".target-card-picker-panel")),
      };
    });
    expect(overlayBehavior).toEqual({ rootPosition: "absolute", rootInsets: ["0px", "0px", "0px", "0px"], rootPointerEvents: "none", panelPointerEvents: "auto", panelWithinTable: true, panelReceivesInput: true });
    const inspectedPlayerId = seedData.players[2].id;
    const inspectionOpener = sourcePage.locator(`[data-player-anchor="${inspectedPlayerId}"] .opponent-hero-target`);
    await inspectionOpener.click();
    const inspection = sourcePage.locator(`.opponent-inspection-panel[data-inspect-player-id="${inspectedPlayerId}"]`);
    await expect(inspection).toBeVisible();
    await expect(dialog).toBeVisible();
    await inspectionOpener.click();
    await expect(inspection).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Take 1 damage from Xiahou Dun", exact: true }).click();
    const confirm = dialog.getByRole("button", { name: "Confirm choice", exact: true });
    await expect(confirm).toBeEnabled();
    const submittedPromise = sourcePage.waitForResponse((response) => response.url() === API + "/api/rooms"
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "xiahou_dun_ganglie");
    await confirm.click();
    const submitted = await submittedPromise;
    expect(submitted.ok()).toBeTruthy();
    expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "xiahou_dun_ganglie", choice: "take_damage" });
    expect((await submitted.json()).room.players.find((player) => player.id === seedData.players[0].id).hp).toBe(3);
    await expect(page.locator('[data-public-card-frame-effect-id="xiahou_dun_ganglie"]')).toHaveCount(0);
    await expect(sourcePage.locator('[data-public-card-frame-effect-id="xiahou_dun_ganglie"]')).toHaveCount(0);
    await expect(xiahou.duplicate).toHaveCount(0);
  } finally {
    await sourcePage.close();
  }
});

test("real Stauchness frames the two committed source cards for actor, payer and observer on mobile", async ({ page, browser, request }) => {
  const attack = card("Attack", "real-ganglie-discard-attack");
  const paidCards = [card("Peach", "real-ganglie-paid-peach", "♥"), card("Dodge", "real-ganglie-paid-dodge", "♣")];
  const privateCard = card("Attack", "real-ganglie-private-hand");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack, ...paidCards, privateCard] },
    { name: "XIAHOU DUN", role: "Loyalist", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
    { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
  ], [card("Dodge", "real-ganglie-discard-judgement", "♠")]);
  const opened = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const hit = await request.post(`${API}/api/rooms`, { data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token } });
  expect(hit.ok()).toBeTruthy();
  const xiahou = await activateDirectSkill({ page, request, seedData, playerIndex: 1, label: "Stauchness", providerId: "xiahou_dun_ganglie" });
  expect((await view(request, seedData, 0)).currentAction).toMatchObject({ kind: "trigger", actorId: seedData.players[0].id, triggerEvent: "damage_suffered" });

  const sourcePage = await browser.newPage();
  const observerPage = await browser.newPage();
  try {
    await Promise.all([openPlayer(sourcePage, seedData, 0), openPlayer(observerPage, seedData, 2)]);
    const dialog = sourcePage.getByRole("dialog", { name: "Stauchness decision" });
    await expect(dialog).toBeVisible();
    await dialog.getByRole("button", { name: "Discard exactly 2 cards from your hand", exact: true }).click();
    await dialog.getByRole("button", { name: "Peach 7♥", exact: true }).click();
    await dialog.getByRole("button", { name: "Dodge 7♣", exact: true }).click();
    const readFrame = async (viewerPage, viewerId) => {
      try {
        const handle = await viewerPage.waitForFunction(({ expectedViewerId, cardIds }) => {
          const display = [...document.querySelectorAll(".public-card-display")]
            .find((element) => element.dataset.publicCardViewerId === expectedViewerId);
          const journey = [...(display?.querySelectorAll("[data-public-card-journey-event-id]") ?? [])]
            .find((element) => element.dataset.publicCardJourneyCardIds === cardIds.join(",")
              && ["reveal", "move"].includes(element.dataset.publicCardJourneyPhase));
          const frame = journey?.querySelector('[data-public-card-frame-effect-id="xiahou_dun_ganglie"]');
          if (!display || !journey || !frame) return false;
          return {
            viewerId: display.dataset.publicCardViewerId,
            eventId: journey.dataset.publicCardJourneyEventId,
            phase: journey.dataset.publicCardJourneyPhase,
            journeyActorId: journey.dataset.publicCardJourneyActorId,
            frameCount: display.querySelectorAll('[data-public-card-frame-effect-id="xiahou_dun_ganglie"]').length,
            frameClass: frame.dataset.publicCardFrameClass,
            frameOwnerId: frame.dataset.publicCardFrameActivationOwnerId,
            frameMaterialOwnerIds: frame.dataset.publicCardFrameMaterialOwnerIds,
            frameMaterialCardIds: frame.dataset.publicCardFrameMaterialCardIds,
            frameFaces: [...frame.querySelectorAll("[data-public-card-effect-frame-card-id]")]
              .map((face) => face.getAttribute("data-public-card-effect-frame-card-id")),
            title: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
            announcementCount: display.querySelectorAll('[data-public-card-announcement="true"]').length,
            announcement: display.querySelector('[data-public-card-announcement="true"]')?.textContent?.trim(),
            viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
          };
        }, { expectedViewerId: viewerId, cardIds: paidCards.map((paid) => paid.id) }, { timeout: 8_000 });
        return handle.jsonValue();
      } catch (error) {
        const state = await viewerPage.evaluate((expectedViewerId) => ({
          viewerId: expectedViewerId,
          displays: [...document.querySelectorAll(".public-card-display")].map((display) => ({
            viewerId: display.dataset.publicCardViewerId,
            rootEventId: display.dataset.publicCardRootEventId,
            activeEventId: display.dataset.publicCardEventId,
            journeys: [...display.querySelectorAll("[data-public-card-journey-event-id]")].map((journey) => ({
              eventId: journey.dataset.publicCardJourneyEventId,
              cards: journey.dataset.publicCardJourneyCardIds,
              phase: journey.dataset.publicCardJourneyPhase,
              actorId: journey.dataset.publicCardJourneyActorId,
              frame: journey.querySelector("[data-public-card-frame-effect-id]")?.getAttribute("data-public-card-frame-effect-id") ?? null,
            })),
          })),
        }), viewerId);
        throw new Error(`${error instanceof Error ? error.message : String(error)}; state=${JSON.stringify(state)}`);
      }
    };
    const frameEvidencePromise = Promise.all([
      readFrame(page, seedData.players[1].id),
      readFrame(sourcePage, seedData.players[0].id),
      readFrame(observerPage, seedData.players[2].id),
    ]);
    const submission = sourcePage.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "xiahou_dun_ganglie");
    await dialog.getByRole("button", { name: "Confirm choice", exact: true }).click();
    const submitted = await submission;
    expect(submitted.ok()).toBeTruthy();
    expect(submitted.request().postDataJSON()).toMatchObject({
      action: "trigger", providerId: "xiahou_dun_ganglie", choice: "discard_two", cardKeys: ["hand:0", "hand:1"],
    });

    const frameEvidence = await frameEvidencePromise;
    const projected = await view(request, seedData, 2);
    expect(JSON.stringify(projected)).not.toContain(privateCard.id);
    const costEvent = projected.timeline.find((event) => event.type === "cards" && event.action === "discard"
      && paidCards.every((paid) => event.cards.some((revealed) => revealed.id === paid.id)));
    expect(costEvent).toBeTruthy();
    expect(costEvent.publicCardEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        effectId: "xiahou_dun_ganglie", effectClass: "COST", activationOwnerId: seedData.players[1].id,
        targetId: seedData.players[0].id, outcome: "SOURCE_DISCARDED_TWO",
      }),
    ]));
    expect(projected.presentationSnapshot.publicCardEffects).toEqual(expect.arrayContaining([
      expect.objectContaining({
        eventId: costEvent.id, effectId: "xiahou_dun_ganglie", effectClass: "COST",
        activationOwnerId: seedData.players[1].id, targetId: seedData.players[0].id,
        outcome: "SOURCE_DISCARDED_TWO", cards: paidCards,
      }),
    ]));
    for (let index = 0; index < frameEvidence.length; index += 1) {
      expect(frameEvidence[index]).toMatchObject({
        viewerId: seedData.players[[1, 0, 2][index]].id,
        eventId: costEvent.id,
        phase: expect.stringMatching(/^(reveal|move)$/),
        journeyActorId: seedData.players[0].id,
        frameCount: 1,
        frameClass: "COST",
        frameOwnerId: seedData.players[1].id,
        frameMaterialOwnerIds: `${seedData.players[0].id},${seedData.players[0].id}`,
        frameMaterialCardIds: paidCards.map((paid) => paid.id).join(","),
        frameFaces: paidCards.map((paid) => paid.id),
        title: "STAUCHNESS",
        announcementCount: 1,
        viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(frameEvidence[index].announcement).toContain("XIAHOU DUN used Stauchness");
      expect(frameEvidence[index].announcement).toContain("SOURCE, the damage source, discarded exactly two Hand cards");
    }
    await expect(observerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
    await expect(sourcePage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(1);
    await expect(xiahou.duplicate).toHaveCount(0);
  } finally {
    await sourcePage.close();
    await observerPage.close();
  }
});

test("real Legacy activation reaches the private two-card distribution UI and submits exact recipients", async ({ page, request }) => {
  const attack = card("Attack", "real-legacy-attack");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [attack] },
    { name: "GUO JIA", role: "Loyalist", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
    { name: "RECIPIENT", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
  ], [card("Peach", "real-legacy-card-one", "♥"), card("Dodge", "real-legacy-card-two", "♣")]);
  const opened = await request.post(API + "/api/rooms", {
    data: { action: "play_card", code: seedData.code, token: seedData.players[0].token, cardId: attack.id, targetId: seedData.players[1].id },
  });
  expect(opened.ok()).toBeTruthy();
  const hit = await request.post(API + "/api/rooms", { data: { action: "decline_response", code: seedData.code, token: seedData.players[1].token } });
  expect(hit.ok()).toBeTruthy();
  expect((await view(request, seedData, 1)).currentAction.triggerOptions.map((option) => option.effectId)).toContain("guo_jia_legacy");
  const guo = await activateDirectSkill({ page, request, seedData, playerIndex: 1, label: "Legacy", providerId: "guo_jia_legacy" });
  expect(guo.result.room.currentAction.kind).toBe("card_distribution");
  const privateView = await view(request, seedData, 1);
  const distributedCards = privateView.currentAction.distribution.cards;
  expect(distributedCards).toHaveLength(2);
  const observer = await view(request, seedData, 0);
  expect(JSON.stringify(observer)).not.toContain(distributedCards[0].id);
  expect(JSON.stringify(observer)).not.toContain(distributedCards[1].id);

  const dialog = page.getByRole("dialog", { name: "Legacy card distribution" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "false");
  const overlayGeometry = await dialog.evaluate((panel) => {
    const overlay = panel.parentElement;
    const table = overlay?.parentElement;
    const tableBox = table?.getBoundingClientRect();
    const panelBox = panel.getBoundingClientRect();
    return {
      rootPosition: overlay && getComputedStyle(overlay).position,
      rootInsets: overlay && ["top", "right", "bottom", "left"].map((property) => getComputedStyle(overlay)[property]),
      rootPointerEvents: overlay && getComputedStyle(overlay).pointerEvents,
      panelPointerEvents: getComputedStyle(panel).pointerEvents,
      panelWithinTable: Boolean(tableBox && panelBox.left >= tableBox.left - 1
        && panelBox.right <= tableBox.right + 1
        && panelBox.top >= tableBox.top - 1
        && panelBox.bottom <= tableBox.bottom + 1),
    };
  });
  expect(overlayGeometry.rootPosition).toBe("absolute");
  expect(overlayGeometry.rootInsets).toEqual(["0px", "0px", "0px", "0px"]);
  expect(overlayGeometry.rootPointerEvents).toBe("none");
  expect(overlayGeometry.panelPointerEvents).toBe("auto");
  expect(overlayGeometry.panelWithinTable).toBe(true);
  const recipients = dialog.locator("select");
  await expect(recipients).toHaveCount(2);
  await recipients.nth(0).selectOption(seedData.players[1].id);
  const inspectionOpener = page.locator(`[data-player-anchor="${seedData.players[2].id}"] .opponent-hero-target`);
  await inspectionOpener.click();
  const inspection = page.locator(`.opponent-inspection-panel[data-inspect-player-id="${seedData.players[2].id}"]`);
  await expect(inspection).toBeVisible();
  await expect(recipients.nth(0)).toHaveValue(seedData.players[1].id);
  await inspectionOpener.click();
  await expect(inspection).toHaveCount(0);
  await expect(recipients.nth(0)).toHaveValue(seedData.players[1].id);
  await recipients.nth(1).selectOption(seedData.players[2].id);
  const distribute = dialog.getByRole("button", { name: "Distribute cards", exact: true });
  await expect(distribute).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === API + "/api/rooms"
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === "private_card_distribution");
  await distribute.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "private_card_distribution", assignments: [
    { cardId: distributedCards[0].id, recipientId: seedData.players[1].id },
    { cardId: distributedCards[1].id, recipientId: seedData.players[2].id },
  ] });
  expect((await view(request, seedData, 1)).myHand.map((held) => held.id)).toContain(distributedCards[0].id);
  expect((await view(request, seedData, 2)).players.find((player) => player.id === seedData.players[2].id).handCount).toBe(1);
});

test("real Dauntless activates from Skills and routes the ending player's Equipment choice back to that player", async ({ page, browser, request }) => {
  const equipment = card("ZhugeCrossbow", "real-dauntless-weapon");
  const basic = card("Peach", "real-dauntless-basic", "♥");
  const seedResponse = await request.post(API + "/__test/seed-playing-game", { data: {
    phase: "play", turnSeat: 0,
    players: [
      { name: "ENDING PLAYER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [], equipment: { weapon: equipment } },
      { name: "YUE JIN", role: "Loyalist", hero: "yue-jin", hp: 4, maxHp: 4, hand: [basic] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
    ],
  } });
  expect(seedResponse.ok()).toBeTruthy();
  const game = await seedResponse.json();
  const ended = await request.post(API + "/api/rooms", { data: { action: "end_turn", code: game.code, token: game.players[0].token } });
  expect(ended.ok()).toBeTruthy();
  expect((await view(request, game, 1)).currentAction).toMatchObject({ kind: "trigger", actorId: game.players[1].id, triggerEvent: "turn_end" });
  await openPlayer(page, game, 1);
  const yueDock = page.locator('.local-player-dock[data-player-anchor="' + game.players[1].id + '"]');
  const skill = yueDock.locator(".local-hero-skills").getByRole("button", { name: "Dauntless", exact: true });
  await expect(skill).toBeEnabled();
  await expect(yueDock.locator('[data-action-extras="true"]').getByRole("button", { name: /Dauntless/ })).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  await yueDock.locator('[data-hand-card-id="' + basic.id + '"] .game-card').click();
  const yueConfirm = yueDock.locator('[data-action-slot="primary"] button.primary');
  await expect(yueConfirm).toHaveText("Confirm");
  const activatedPromise = page.waitForResponse((response) => response.url() === API + "/api/rooms"
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger"
    && response.request().postDataJSON()?.providerId === "yue_jin_dauntless");
  await yueConfirm.click();
  const activated = await activatedPromise;
  expect(activated.ok()).toBeTruthy();
  expect(activated.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "yue_jin_dauntless", cardIds: [basic.id] });
  const endingView = await view(request, game, 0);
  expect(endingView.currentAction).toMatchObject({ kind: "trigger", actorId: game.players[0].id, triggerEvent: "turn_end" });
  expect(endingView.currentAction.triggerOptions.find((option) => option.effectId === "yue_jin_dauntless")?.selection).toMatchObject({
    type: "target_cards", targetId: game.players[0].id, eligibleKeys: [equipment.id],
  });

  const endingPage = await browser.newPage();
  try {
    await openPlayer(endingPage, game, 0);
    const endingDock = endingPage.locator('.local-player-dock[data-player-anchor="' + game.players[0].id + '"]');
    const equipmentChoice = endingDock.locator('[data-equipment-id="' + equipment.id + '"] .local-zone-card-button');
    await expect(equipmentChoice).toBeEnabled();
    await expect(endingDock.getByRole("button", { name: "Cancel", exact: true })).toHaveCount(0);
    await expect(endingDock.getByRole("button", { name: "Clear selection", exact: true })).toHaveCount(0);
    await expect(endingDock.getByText("LOCAL CANCEL", { exact: true })).toHaveCount(0);
    await equipmentChoice.click();
    await expect(equipmentChoice).toHaveAttribute("aria-pressed", "true");
    const clearSelection = endingDock.getByRole("button", { name: "Clear selection", exact: true });
    await expect(clearSelection).toBeVisible();
    await clearSelection.click();
    await expect(equipmentChoice).toHaveAttribute("aria-pressed", "false");
    await expect(endingDock.getByText("CLEAR SELECTION", { exact: true })).toHaveCount(0);
    await equipmentChoice.click();
    await expect(equipmentChoice).toHaveAttribute("aria-pressed", "true");
    const endingConfirm = endingDock.locator('[data-action-slot="primary"] button.primary');
    await expect(endingConfirm).toHaveText("Confirm");
    await expect(endingConfirm).toBeEnabled();
    const selectedPromise = endingPage.waitForResponse((response) => response.url() === API + "/api/rooms"
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "trigger"
      && response.request().postDataJSON()?.providerId === "yue_jin_dauntless");
    await endingConfirm.click();
    const selected = await selectedPromise;
    expect(selected.ok()).toBeTruthy();
    expect(selected.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "yue_jin_dauntless", cardKeys: [equipment.id] });
    expect((await view(request, game, 0)).players.find((player) => player.id === game.players[0].id).equipmentCards).toHaveLength(0);
  } finally {
    await endingPage.close();
  }
});

test("real Daredevil appears after Sun Shangxiang replaces her Weapon and draws two cards", async ({ page, request }) => {
  const oldWeapon = card("ZhugeCrossbow", "real-daredevil-old-weapon");
  const newWeapon = card("BlueSteelSword", "real-daredevil-new-weapon");
  const seedResponse = await request.post(API + "/__test/seed-playing-game", { data: {
    phase: "play", turnSeat: 0,
    players: [
      { name: "SUN SHANGXIANG", role: "Lord", hero: "sun-shangxiang", hp: 3, maxHp: 3, hand: [newWeapon], equipment: { weapon: oldWeapon } },
      { name: "LOYALIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "REBEL", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "RENEGADE", role: "Renegade", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    ],
    deck: [card("Attack", "real-daredevil-draw-one"), card("Peach", "real-daredevil-draw-two", "♥")],
  } });
  expect(seedResponse.ok()).toBeTruthy();
  const game = await seedResponse.json();
  const equipped = await request.post(API + "/api/rooms", { data: { action: "play_card", code: game.code, token: game.players[0].token, cardId: newWeapon.id } });
  expect(equipped.ok()).toBeTruthy();
  expect((await view(request, game, 0)).currentAction).toMatchObject({ kind: "trigger", actorId: game.players[0].id, triggerEvent: "equipment_lost" });
  const { result } = await activateDirectSkill({ page, request, seedData: game, playerIndex: 0, label: "Daredevil", providerId: "sun_shangxiang_daredevil" });
  expect(result.room.myHand.map((held) => held.id)).toEqual(["real-daredevil-draw-one", "real-daredevil-draw-two"]);
  expect(result.room.players.find((player) => player.id === game.players[0].id).equipmentCards.map((item) => item.id)).toContain(newWeapon.id);
});
