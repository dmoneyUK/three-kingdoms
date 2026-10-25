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

async function openPlayer(page, seedData, index, viewport = { width: 390, height: 844 }) {
  const member = seedData.players[index];
  await page.setViewportSize(viewport);
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

test("W4: First Aid frames the genuine card as Peach for every mobile viewer", async ({ page, browser, request }) => {
  test.setTimeout(120_000);
  const attack = card("Attack", "w4-first-aid-dying-attack", "♠");
  const redCard = card("Attack", "w4-first-aid-red-material", "♥");
  const privateCard = card("Dodge", "w4-first-aid-private-dodge", "♠");
  const seedData = await seed(request, [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack] },
    { name: "DYING TARGET", role: "Loyalist", hero: "liu-bei", hp: 1, maxHp: 4, hand: [] },
    { name: "HUA TUO", role: "Rebel", hero: "hua-tuo", hp: 3, maxHp: 3, hand: [redCard, privateCard] },
    { name: "FOURTH VIEWER", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
  ]);
  const viewports = [
    { width: 390, height: 844 }, { width: 440, height: 894 },
    { width: 390, height: 844 }, { width: 440, height: 894 },
  ];
  const opened = [];
  try {
    const viewers = await Promise.all(seedData.players.map(async (player, index) => {
      const context = index === 2 ? null : await browser.newContext({ viewport: viewports[index] });
      if (context) opened.push(context);
      const viewerPage = context ? await context.newPage() : page;
      await openPlayer(viewerPage, seedData, index, viewports[index]);
      return { player, index, page: viewerPage };
    }));
    await Promise.all(viewers.map(({ player, page: viewerPage }) =>
      expect(viewerPage.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible()));

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

    const huaTuo = seedData.players[2];
    const ownerDock = page.locator(`.local-player-dock[data-player-anchor="${huaTuo.id}"]`);
    const skill = ownerDock.locator(".local-hero-skills").getByRole("button", { name: "First Aid", exact: true });
    await expect(skill).toBeEnabled({ timeout: 20_000 });
    await skill.click();
    const legalCard = ownerDock.locator(`[data-hand-card-id="${redCard.id}"] .game-card`);
    await expect(legalCard).toBeEnabled();
    await expect(ownerDock.locator(`[data-hand-card-id="${privateCard.id}"] .game-card`)).toBeDisabled();
    await legalCard.click();
    const confirm = ownerDock.locator('[data-action-slot="primary"] button.primary');
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeEnabled();
    const responsePromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "respond"
      && response.request().postDataJSON()?.providerId === "hua_tuo_first_aid");
    await confirm.click();
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();
    expect(response.request().postDataJSON()).toMatchObject({
      action: "respond", providerId: "hua_tuo_first_aid", cardId: redCard.id, token: huaTuo.token,
    });
    const result = await response.json();
    const conversionEvent = result.room.timeline.find((event) => event.type === "card" && event.card?.id === redCard.id);
    expect(conversionEvent).toBeTruthy();
    const rawEffect = conversionEvent.publicCardEffects.find((effect) => effect.effectId === "hua_tuo_first_aid");
    expect(rawEffect).toMatchObject({
      effectClass: "CONVERSION", activationOwnerId: huaTuo.id, targetId: seedData.players[1].id,
      resultingCardKind: "Peach", outcome: "AS_PEACH",
      materials: [{ cardId: redCard.id, ownerId: huaTuo.id, fromZone: "HAND", toZone: "PUBLIC_PLAY" }],
    });
    expect(conversionEvent).toMatchObject({ action: "play", playedAs: "peach", player: huaTuo.name, target: seedData.players[1].name });

    const frameEvidence = await Promise.all(viewers.map(async ({ player, page: viewerPage }) => {
      try {
        const handle = await viewerPage.waitForFunction(({ viewerId, eventId }) => {
          const journeyCard = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
            .find((element) => element.dataset.publicCardJourneyEventId === eventId);
          const display = journeyCard?.closest(".public-card-display");
          if (!journeyCard || !display || display.dataset.publicCardViewerId !== viewerId) return false;
          const frame = journeyCard.querySelector('[data-public-card-frame-effect-id="hua_tuo_first_aid"]');
          const announcement = display.querySelector('[data-public-card-announcement="true"]');
          const announcementStyle = announcement ? getComputedStyle(announcement) : null;
          const phase = journeyCard.dataset.publicCardJourneyPhase;
          const announcementVisible = Boolean(announcement && announcementStyle && announcementStyle.display !== "none"
            && announcementStyle.visibility === "visible" && Number(announcementStyle.opacity) > 0);
          if (!frame || display.dataset.publicCardLayoutPending !== "false"
            || !["reveal", "move"].includes(phase)
            || announcement?.dataset.publicCardAnnouncementPositioned !== "true" || !announcementVisible) return false;
          const frameRect = frame?.getBoundingClientRect();
          const announcementRect = announcement?.getBoundingClientRect();
          const materialFaces = [...(frame?.querySelectorAll("[data-public-card-effect-frame-card-id]") ?? [])]
            .map((element) => element.getAttribute("data-public-card-effect-frame-card-id"));
          return {
            eventId: journeyCard.dataset.publicCardJourneyEventId,
            phase,
            viewerId: display.dataset.publicCardViewerId,
            layoutPending: display.dataset.publicCardLayoutPending,
            actorId: journeyCard.dataset.publicCardJourneyActorId,
            journeyCardIds: journeyCard.dataset.publicCardJourneyCardIds,
            framePresent: Boolean(frame),
            effectId: frame?.dataset.publicCardFrameEffectId,
            effectClass: frame?.dataset.publicCardFrameClass,
            activationOwnerId: frame?.dataset.publicCardFrameActivationOwnerId,
            materialOwnerIds: frame?.dataset.publicCardFrameMaterialOwnerIds,
            materialCardIds: frame?.dataset.publicCardFrameMaterialCardIds,
            materialFaces,
            materialCount: Number(frame?.dataset.publicCardFrameMaterialCount ?? 0),
            title: frame?.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
            accessibleLabel: journeyCard.getAttribute("aria-label"),
            announcementCount: display.querySelectorAll('[data-public-card-announcement="true"]').length,
            announcement: {
              text: announcement?.textContent?.trim(),
              positioned: announcement?.dataset.publicCardAnnouncementPositioned === "true",
              visible: announcementVisible,
              overlapsFrame: Boolean(frameRect && announcementRect && announcementRect.left < frameRect.right
                && announcementRect.right > frameRect.left && announcementRect.top < frameRect.bottom
                && announcementRect.bottom > frameRect.top),
            },
            viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
          };
        }, { viewerId: player.id, eventId: conversionEvent.id }, { timeout: 12_000 });
        return await handle.jsonValue();
      } catch {
        return viewerPage.evaluate(({ eventId }) => {
          const journeyCard = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
            .find((element) => element.dataset.publicCardJourneyEventId === eventId);
          const display = journeyCard?.closest(".public-card-display");
          return {
            eventId: journeyCard?.dataset.publicCardJourneyEventId,
            phase: journeyCard?.dataset.publicCardJourneyPhase,
            viewerId: display?.dataset.publicCardViewerId,
            layoutPending: display?.dataset.publicCardLayoutPending,
            framePresent: Boolean(journeyCard?.querySelector('[data-public-card-frame-effect-id="hua_tuo_first_aid"]')),
            publicDisplays: [...document.querySelectorAll(".public-card-display")].map((element) => ({
              eventId: element.getAttribute("data-public-card-event-id"),
              viewerId: element.getAttribute("data-public-card-viewer-id"),
              layoutPending: element.getAttribute("data-public-card-layout-pending"),
              events: [...element.querySelectorAll("[data-public-card-journey-event-id]")]
                .map((card) => card.getAttribute("data-public-card-journey-event-id")),
            })),
          };
        }, { eventId: conversionEvent.id });
      }
    }));
    const projections = await Promise.all(viewers.map(({ index }) => view(request, seedData, index)));
    for (const [index, { player }] of viewers.entries()) {
      expect(frameEvidence[index]).toMatchObject({
        eventId: conversionEvent.id, viewerId: player.id, actorId: huaTuo.id,
        journeyCardIds: redCard.id, framePresent: true, effectId: "hua_tuo_first_aid", effectClass: "CONVERSION",
        activationOwnerId: huaTuo.id, materialOwnerIds: huaTuo.id, materialCardIds: redCard.id,
        materialFaces: [redCard.id], materialCount: 1, title: "FIRST AID · AS PEACH", announcementCount: 1,
        viewport: { width: viewports[index].width, height: viewports[index].height, scrollWidth: viewports[index].width },
      });
      expect(frameEvidence[index].accessibleLabel).toContain("AS PEACH");
      expect(frameEvidence[index].accessibleLabel).toContain(seedData.players[1].name);
      expect(frameEvidence[index].phase).toMatch(/^(reveal|move)$/);
      expect(frameEvidence[index].announcement.positioned).toBe(true);
      expect(frameEvidence[index].announcement.visible).toBe(true);
      expect(frameEvidence[index].announcement.text).toContain("AS PEACH");
      expect(frameEvidence[index].announcement.overlapsFrame).toBe(false);
    }

    for (const [index, projection] of projections.entries()) {
      expect(projection.timeline.some((event) => event.type === "card" && event.card?.id === redCard.id)).toBe(true);
      expect(JSON.stringify(projection).includes(privateCard.id)).toBe(index === 2);
      expect(projection.myHand.some((held) => held.id === privateCard.id)).toBe(index === 2);
      expect(projection.players.find((player) => player.id === seedData.players[1].id)).toMatchObject({ hp: 1, alive: true });
      expect(projection.pendingDying).toBeNull();
      await expect(viewers[index].page.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(index === 2 ? 1 : 0);
    }

    for (const { player, page: viewerPage } of viewers) {
      await viewerPage.waitForFunction(({ viewerId, actorId, journeyEventId }) => {
        const cardElement = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
          .find((element) => element.dataset.publicCardJourneyEventId === journeyEventId);
        const display = cardElement?.closest(".public-card-display");
        const anchor = viewerId === actorId
          ? document.querySelector(`.local-player-dock[data-player-anchor="${actorId}"]`)
          : document.querySelector(`.opponent-player-card[data-player-anchor="${actorId}"]`);
        if (!cardElement || !display || !anchor || display.dataset.publicCardLayoutPending !== "false"
          || cardElement.dataset.publicCardJourneyPhase !== "parked") return false;
        const cardRect = cardElement.getBoundingClientRect();
        const anchorRect = anchor.getBoundingClientRect();
        const target = {
          left: Number(cardElement.dataset.publicCardJourneyTargetLeft),
          top: Number(cardElement.dataset.publicCardJourneyTargetTop),
          width: Number(cardElement.dataset.publicCardJourneyTargetWidth),
          height: Number(cardElement.dataset.publicCardJourneyTargetHeight),
        };
        const expected = viewerId === actorId
          ? { left: anchorRect.left + 8, top: anchorRect.top - target.height - 6 }
          : { left: anchorRect.left + (anchorRect.width - target.width) / 2, top: anchorRect.bottom + 6 };
        return Math.abs(target.left - expected.left) < 1 && Math.abs(target.top - expected.top) < 1
          && Math.abs(cardRect.left - target.left) < 1 && Math.abs(cardRect.top - target.top) < 1;
      }, { viewerId: player.id, actorId: huaTuo.id, journeyEventId: conversionEvent.id }, { timeout: 12_000 });
    }
  } finally {
    await Promise.all(opened.map((context) => context.close()));
  }
});

test("W4: God of War frames the same real red card as Attack for mobile viewers", async ({ page, browser, request }) => {
  test.setTimeout(60_000);
  const redPeach = card("Peach", "w4-god-of-war-red-peach", "♥");
  const privateCard = card("Dodge", "w4-god-of-war-private-dodge", "♠");
  const targetDodge = card("Dodge", "w4-god-of-war-target-dodge", "♣");
  const seedData = await seed(request, [
    { name: "GUAN YU", role: "Lord", hero: "guan-yu", hp: 4, maxHp: 4, hand: [redPeach, privateCard] },
    { name: "TARGET", role: "Loyalist", hero: "cao-cao", hp: 4, maxHp: 4, hand: [targetDodge] },
    { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
  ]);
  const observerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  try {
    const guanYu = await openPlayer(page, seedData, 0);
    const observerPage = await observerContext.newPage();
    const observer = await openPlayer(observerPage, seedData, 2);
    const played = await request.post(`${API}/api/rooms`, {
      data: {
        action: "play_card", code: seedData.code, token: seedData.players[0].token,
        cardId: redPeach.id, playAs: "attack", targetId: seedData.players[1].id,
      },
    });
    expect(played.ok()).toBeTruthy();
    const result = await played.json();
    const conversionEvent = result.room.timeline.find((event) => event.type === "card" && event.card?.id === redPeach.id);
    expect(conversionEvent).toMatchObject({ action: "play", playedAs: "attack", player: seedData.players[0].name, target: seedData.players[1].name });
    expect(conversionEvent.publicCardEffects).toContainEqual(expect.objectContaining({
      effectId: "guan_yu_red_card_attack", effectClass: "CONVERSION", activationOwnerId: seedData.players[0].id,
      targetId: seedData.players[1].id, resultingCardKind: "Attack", outcome: "AS_ATTACK",
      materials: [{ cardId: redPeach.id, ownerId: seedData.players[0].id, fromZone: "HAND", toZone: "DISCARD" }],
    }));
    const targetProjection = await view(request, seedData, 1);
    expect(targetProjection.currentAction).toMatchObject({ kind: "response", actorId: seedData.players[1].id, requirement: "dodge" });
    expect(targetProjection.currentAction.options.find((option) => option.providerId === "card")?.selection.eligibleCardIds).toContain(targetDodge.id);
    const observerProjection = await view(request, seedData, 2);
    expect(JSON.stringify(observerProjection)).not.toContain(privateCard.id);
    for (const { viewerPage, viewerId } of [
      { viewerPage: page, viewerId: guanYu.id },
      { viewerPage: observerPage, viewerId: observer.id },
    ]) {
      const evidence = await viewerPage.waitForFunction(({ eventId, materialId, viewerId }) => {
        const journeyCard = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
          .find((element) => element.dataset.publicCardJourneyEventId === eventId);
        const display = journeyCard?.closest(".public-card-display");
        const frame = journeyCard?.querySelector('[data-public-card-frame-effect-id="guan_yu_red_card_attack"]');
        const announcement = display?.querySelector('[data-public-card-announcement="true"]');
        const style = announcement ? getComputedStyle(announcement) : null;
        if (!journeyCard || !display || !frame || !announcement || display.dataset.publicCardViewerId !== viewerId
          || !["reveal", "move"].includes(journeyCard.dataset.publicCardJourneyPhase)
          || display.dataset.publicCardLayoutPending !== "false"
          || frame.dataset.publicCardFrameMaterialCardIds !== materialId
          || announcement.dataset.publicCardAnnouncementPositioned !== "true"
          || style?.visibility !== "visible" || style.display === "none" || Number(style.opacity) <= 0) return false;
        const frameRect = frame.getBoundingClientRect();
        const noticeRect = announcement.getBoundingClientRect();
        return {
          viewerId: display.dataset.publicCardViewerId,
          eventId: journeyCard.dataset.publicCardJourneyEventId,
          phase: journeyCard.dataset.publicCardJourneyPhase,
          actorId: journeyCard.dataset.publicCardJourneyActorId,
          frameEventId: frame.dataset.publicCardFrameEventId,
          effectId: frame.dataset.publicCardFrameEffectId,
          activationOwnerId: frame.dataset.publicCardFrameActivationOwnerId,
          materialCardIds: frame.dataset.publicCardFrameMaterialCardIds,
          title: frame.querySelector(".public-card-effect-frame-title")?.textContent?.trim(),
          journeyLabel: journeyCard.getAttribute("aria-label"),
          notice: announcement.textContent?.trim(),
          noticePositioned: announcement.dataset.publicCardAnnouncementPositioned,
          overlap: noticeRect.left < frameRect.right && noticeRect.right > frameRect.left
            && noticeRect.top < frameRect.bottom && noticeRect.bottom > frameRect.top,
          viewport: { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth },
        };
      }, { eventId: conversionEvent.id, materialId: redPeach.id, viewerId }, { timeout: 15_000 });
      const details = await evidence.jsonValue();
      expect(details).toMatchObject({
        viewerId, eventId: conversionEvent.id, phase: expect.stringMatching(/^(reveal|move)$/),
        actorId: guanYu.id, frameEventId: conversionEvent.id, effectId: "guan_yu_red_card_attack",
        activationOwnerId: guanYu.id, materialCardIds: redPeach.id, title: "GOD OF WAR · AS ATTACK",
        viewport: { width: 390, height: 844, scrollWidth: 390 },
      });
      expect(details.journeyLabel).toContain("AS ATTACK");
      expect(details.notice).toContain("AS ATTACK");
      expect(details.notice).toContain(seedData.players[1].name);
      expect(details.noticePositioned).toBe("true");
      expect(details.overlap).toBe(false);
    }
    await expect(observerPage.locator(`[data-hand-card-id="${privateCard.id}"]`)).toHaveCount(0);
  } finally {
    await observerContext.close();
  }
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
