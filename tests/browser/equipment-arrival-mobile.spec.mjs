import { expect, test } from "@playwright/test";

const testCard = { id: "browser-e1f-kirin-bow", kind: "KirinBow", suit: "♥", rank: "Q" };
const eventId = "browser-e1f-kirin-bow-equip-event";
const workerApi = "http://127.0.0.1:3137";

async function loadMobile(page, viewport, reducedMotion = false) {
  await page.setViewportSize(viewport);
  if (reducedMotion) await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/tests/browser/fixture.html?state=normal&count=4");
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function commitPublicEquip(page, ownerId, card = testCard, currentEventId = eventId) {
  await page.evaluate(({ ownerId, card, eventId }) => {
    const room = window.__browserRoom;
    const owner = room.players.find((player) => player.id === ownerId);
    if (!owner) throw new Error(`Missing equipment owner ${ownerId}`);
    const event = {
      id: eventId,
      type: "card",
      action: "equip",
      actorId: ownerId,
      player: owner.name,
      target: owner.name,
      card,
      resolutionId: "browser-e1f-kirin-bow-resolution",
      importance: "essential",
      presentation: true,
    };
    window.__updateBrowserRoom({
      ...room,
      timeline: [...room.timeline, event],
      players: room.players.map((player) => player.id === ownerId
        ? { ...player, equipmentCards: [...player.equipmentCards.filter((item) => item.id !== card.id), card] }
        : player),
    });
  }, { ownerId, card, eventId: currentEventId });
}

async function assertArrivalAnimationTargetsPhysicalSlot(page, ownerId, targetSlot = "weapon", targetEventId = eventId) {
  const animation = page.locator(`.active-table-reveal[data-settlement-event-id="${targetEventId}"]`);
  const slot = page.locator(`[data-player-equipment-slot-owner="${ownerId}"][data-slot="${targetSlot}"]`).first();
  await expect(animation).toBeVisible();
  await expect(slot).toBeVisible();
  await expect(animation).toHaveClass(/equipment-flight/);
  const measured = await page.evaluate(({ ownerId, eventId, targetSlot }) => {
    const table = document.querySelector(".play-table");
    const reveal = document.querySelector(`.active-table-reveal[data-settlement-event-id="${eventId}"]`);
    const slot = [...document.querySelectorAll("[data-player-equipment-slot-owner][data-slot]")]
      .find((element) => element.dataset.playerEquipmentSlotOwner === ownerId && element.dataset.slot === targetSlot);
    if (!table || !reveal || !slot) return null;
    const tableRect = table.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    return {
      x: Number.parseFloat(reveal.style.getPropertyValue("--equipment-x")),
      y: Number.parseFloat(reveal.style.getPropertyValue("--equipment-y")),
      expectedX: slotRect.left + slotRect.width / 2 - tableRect.left,
      expectedY: slotRect.top + slotRect.height / 2 - tableRect.top,
      slot: { x: slotRect.x, y: slotRect.y, width: slotRect.width, height: slotRect.height },
      viewport: { width: window.innerWidth, height: window.innerHeight },
    };
  }, { ownerId, eventId: targetEventId, targetSlot });
  expect(measured).not.toBeNull();
  expect(Math.abs(measured.x - measured.expectedX)).toBeLessThan(1);
  expect(Math.abs(measured.y - measured.expectedY)).toBeLessThan(1);
  return { animation, measured };
}

test("local Kirin Bow miniature stays hidden until its genuine CardFace reaches the mobile Weapon slot", async ({ browser }, testInfo) => {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  try {
    await loadMobile(page, viewport);
    await commitPublicEquip(page, "p1");
    const { animation, measured } = await assertArrivalAnimationTargetsPhysicalSlot(page, "p1");
    const miniature = page.locator(`.local-zone-card[data-equipment-id="${testCard.id}"]`);
    await expect(miniature).toHaveAttribute("data-equipment-arrival-pending", "true");
    expect(await miniature.locator(".played-card").evaluate((element) => getComputedStyle(element).visibility)).toBe("hidden");
    await expect(animation.locator(`[data-settlement-card-id="${testCard.id}"]`)).toHaveCount(1);
    await expect(page.locator('.decision-status[data-console-presentation-busy]')).toHaveAttribute("data-console-presentation-busy", "false");
    const endTurn = page.getByRole("button", { name: "End", exact: true });
    await expect(endTurn).toBeEnabled();
    await endTurn.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions.some(({ action }) => action === "end_turn"))).toBe(true);

    const info = miniature.getByRole("button", { name: "View Kirin Bow details" });
    await expect(info).toBeEnabled();
    await info.click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await expect(animation).toHaveCount(0, { timeout: 6000 });
    await expect(miniature).not.toHaveAttribute("data-equipment-arrival-pending", "true");
    expect(await miniature.locator(".played-card").evaluate((element) => getComputedStyle(element).visibility)).toBe("visible");
    await expect(page.locator(`.active-table-reveal [data-settlement-card-id="${testCard.id}"]`)).toHaveCount(0);
    await expect(miniature.locator(".played-card")).toHaveCount(1);
    await testInfo.attach("E1-F local owner Kirin Bow arrived at mobile Weapon slot", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
    testInfo.annotations.push({ type: "measured-target", description: JSON.stringify(measured) });
  } finally {
    await context.close();
  }
});

test("opponent Kirin Bow targets the real Seat slot while Inspector remains usable", async ({ browser }, testInfo) => {
  const viewport = { width: 440, height: 766 };
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  try {
    await loadMobile(page, viewport);
    await commitPublicEquip(page, "p2");
    const { animation } = await assertArrivalAnimationTargetsPhysicalSlot(page, "p2");
    await page.locator('.opponent-player-card[data-player-anchor="p2"] .opponent-hero-target').tap();
    const inspector = page.locator('.opponent-inspection-panel[data-inspect-player-id="p2"]');
    await expect(inspector).toBeVisible();
    const inspectedCard = inspector.locator(`.opponent-inspection-equipment-card[data-inspector-slot="weapon"]`);
    await expect(inspectedCard).toHaveAttribute("data-equipment-arrival-pending", "true");
    expect(await inspectedCard.locator(".played-card").evaluate((element) => getComputedStyle(element).visibility)).toBe("hidden");
    await expect(animation).toBeVisible();

    const inspectedTarget = await page.evaluate(({ ownerId, eventId }) => {
      const table = document.querySelector(".play-table");
      const reveal = document.querySelector(`.active-table-reveal[data-settlement-event-id="${eventId}"]`);
      const slot = [...document.querySelectorAll("[data-player-equipment-slot-owner][data-slot]")]
        .find((element) => element.dataset.playerEquipmentSlotOwner === ownerId && element.dataset.slot === "weapon");
      if (!table || !reveal || !slot) return null;
      const tableRect = table.getBoundingClientRect();
      const slotRect = slot.getBoundingClientRect();
      return {
        x: Number.parseFloat(reveal.style.getPropertyValue("--equipment-x")),
        y: Number.parseFloat(reveal.style.getPropertyValue("--equipment-y")),
        expectedX: slotRect.left + slotRect.width / 2 - tableRect.left,
        expectedY: slotRect.top + slotRect.height / 2 - tableRect.top,
      };
    }, { ownerId: "p2", eventId });
    expect(inspectedTarget).not.toBeNull();
    expect(Math.abs(inspectedTarget.x - inspectedTarget.expectedX)).toBeLessThan(1);
    expect(Math.abs(inspectedTarget.y - inspectedTarget.expectedY)).toBeLessThan(1);
    await expect(animation.locator(`[data-settlement-card-id="${testCard.id}"]`)).toHaveCount(1);

    await expect(animation).toHaveCount(0, { timeout: 6000 });
    await expect(inspectedCard).not.toHaveAttribute("data-equipment-arrival-pending", "true");
    expect(await inspectedCard.locator(".played-card").evaluate((element) => getComputedStyle(element).visibility)).toBe("visible");
    await expect(page.locator(`.active-table-reveal [data-settlement-card-id="${testCard.id}"]`)).toHaveCount(0);
    await testInfo.attach("E1-F independent viewer Inspector after opponent Kirin Bow arrival", {
      body: await page.screenshot(),
      contentType: "image/png",
    });
  } finally {
    await context.close();
  }
});

test("reduced motion deterministically releases the miniature on the arrival animation event", async ({ browser }) => {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3, reducedMotion: "reduce" });
  const page = await context.newPage();
  try {
    await loadMobile(page, viewport, true);
    await commitPublicEquip(page, "p1");
    const miniature = page.locator(`.local-zone-card[data-equipment-id="${testCard.id}"]`);
    await expect(page.locator(`.active-table-reveal[data-settlement-event-id="${eventId}"]`)).toBeVisible();
    await expect(miniature).toHaveAttribute("data-equipment-arrival-pending", "true");
    await expect(miniature).not.toHaveAttribute("data-equipment-arrival-pending", "true", { timeout: 3000 });
    await expect(miniature.locator(".played-card")).toBeVisible();
    await expect(page.locator(`.active-table-reveal[data-settlement-event-id="${eventId}"]`)).toHaveCount(0);
  } finally {
    await context.close();
  }
});

test("Armor and both Horse miniatures wait for their own mobile Equipment slots", async ({ browser }) => {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  const cards = [
    { id: "browser-e1f-nio-shield", kind: "NioShield", suit: "♣", rank: "2", slot: "armor" },
    { id: "browser-e1f-shadowrunner", kind: "Shadowrunner", suit: "♠", rank: "5", slot: "defensiveHorse" },
    { id: "browser-e1f-red-hare", kind: "RedHare", suit: "♥", rank: "5", slot: "offensiveHorse" },
  ];
  try {
    await loadMobile(page, viewport);
    await page.evaluate(({ cards }) => {
      const room = window.__browserRoom;
      const owner = room.players.find((player) => player.id === "p1");
      const events = cards.map(({ card, eventId }) => ({
        id: eventId,
        type: "card",
        action: "equip",
        actorId: owner.id,
        player: owner.name,
        target: owner.name,
        card,
        resolutionId: `resolution-${eventId}`,
        importance: "essential",
        presentation: true,
      }));
      window.__updateBrowserRoom({
        ...room,
        timeline: [...room.timeline, ...events],
        players: room.players.map((player) => player.id === owner.id
          ? { ...player, equipmentCards: [...player.equipmentCards, ...cards.map(({ card }) => card)] }
          : player),
      });
    }, { cards: cards.map(({ id, kind, suit, rank }, index) => ({ card: { id, kind, suit, rank }, eventId: `browser-e1f-slot-event-${index}` })) });

    for (const [index, item] of cards.entries()) {
      const currentEventId = `browser-e1f-slot-event-${index}`;
      const { animation } = await assertArrivalAnimationTargetsPhysicalSlot(page, "p1", item.slot, currentEventId);
      const miniature = page.locator(`.local-zone-card[data-equipment-id="${item.id}"]`);
      await expect(miniature).toHaveAttribute("data-equipment-arrival-pending", "true");
      expect(await miniature.locator(".played-card").evaluate((element) => getComputedStyle(element).visibility)).toBe("hidden");
      await expect(animation).toHaveCount(0, { timeout: 6000 });
      await expect(miniature).not.toHaveAttribute("data-equipment-arrival-pending", "true");
      expect(await miniature.locator(".played-card").evaluate((element) => getComputedStyle(element).visibility)).toBe("visible");
    }
  } finally {
    await context.close();
  }
});

test("rapid same-slot replacement releases only the current physical card", async ({ browser }) => {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  const oldCard = { id: "browser-e1f-replaced-bow", kind: "KirinBow", suit: "♥", rank: "Q" };
  const currentCard = { id: "browser-e1f-current-crossbow", kind: "ZhugeCrossbow", suit: "♦", rank: "A" };
  const ids = ["browser-e1f-replaced-event", "browser-e1f-current-event"];
  try {
    await loadMobile(page, viewport);
    await page.evaluate(({ cards, eventIds }) => {
      const room = window.__browserRoom;
      const owner = room.players.find((player) => player.id === "p1");
      const events = cards.map((card, index) => ({
        id: eventIds[index],
        type: "card",
        action: "equip",
        actorId: owner.id,
        player: owner.name,
        target: owner.name,
        card,
        resolutionId: `resolution-${eventIds[index]}`,
        importance: "essential",
        presentation: true,
      }));
      window.__updateBrowserRoom({
        ...room,
        timeline: [...room.timeline, ...events],
        players: room.players.map((player) => player.id === owner.id ? { ...player, equipmentCards: [cards[1]] } : player),
      });
    }, { cards: [oldCard, currentCard], eventIds: ids });

    const { animation: replacedArrival } = await assertArrivalAnimationTargetsPhysicalSlot(page, "p1", "weapon", ids[0]);
    const oldMiniature = page.locator(`.local-zone-card[data-equipment-id="${oldCard.id}"]`);
    const currentMiniature = page.locator(`.local-zone-card[data-equipment-id="${currentCard.id}"]`);
    await expect(oldMiniature).toHaveCount(0);
    await expect(currentMiniature).toHaveAttribute("data-equipment-arrival-pending", "true");
    expect(await currentMiniature.locator(".played-card").evaluate((element) => getComputedStyle(element).visibility)).toBe("hidden");
    await expect(replacedArrival).toHaveCount(0, { timeout: 6000 });
    await expect(oldMiniature).toHaveCount(0);

    const { animation: currentArrival } = await assertArrivalAnimationTargetsPhysicalSlot(page, "p1", "weapon", ids[1]);
    await expect(currentMiniature).toHaveAttribute("data-equipment-arrival-pending", "true");
    expect(await currentMiniature.locator(".played-card").evaluate((element) => getComputedStyle(element).visibility)).toBe("hidden");
    await expect(currentArrival).toHaveCount(0, { timeout: 6000 });
    await expect(currentMiniature).not.toHaveAttribute("data-equipment-arrival-pending", "true");
    await expect(currentMiniature.locator(".played-card")).toHaveCount(1);
  } finally {
    await context.close();
  }
});

test("mobile equipment arrival anchors remain correct across 4, 6, 8 and 10 seats", async ({ browser }) => {
  const viewport = { width: 390, height: 844 };
  for (const count of [4, 6, 8, 10]) {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
    const page = await context.newPage();
    try {
      await page.setViewportSize(viewport);
      await page.goto(`/tests/browser/fixture.html?state=normal&count=${count}`);
      await expect(page.locator(".game-shell")).toBeVisible();
      const thisEventId = `browser-e1f-topology-${count}`;
      await commitPublicEquip(page, "p2", { ...testCard, id: `browser-e1f-bow-${count}` }, thisEventId);
      const { measured } = await assertArrivalAnimationTargetsPhysicalSlot(page, "p2", "weapon", thisEventId);
      expect(measured.slot.width).toBeGreaterThan(0);
      expect(measured.slot.height).toBeGreaterThan(0);
      await page.locator('.opponent-player-card[data-player-anchor="p2"] .opponent-hero-target').tap();
      const inspectorMiniature = page.locator(`.opponent-inspection-panel[data-inspect-player-id="p2"] .opponent-inspection-equipment-card[data-inspector-slot="weapon"]`);
      await expect(inspectorMiniature).toHaveAttribute("data-equipment-arrival-pending", "true");
      expect(await inspectorMiniature.locator(".played-card").evaluate((element) => getComputedStyle(element).visibility)).toBe("hidden");
    } finally {
      await context.close();
    }
  }
});

test("real Worker/D1 equip publishes one actor-bound arrival to the owner and an independent mobile observer", async ({ browser, request }, testInfo) => {
  test.setTimeout(60_000);
  const viewport = { width: 390, height: 844 };
  const bow = { id: "worker-e1f-kirin-bow", kind: "KirinBow", suit: "♥", rank: "Q" };
  const seededResponse = await request.post(`${workerApi}/__test/seed-playing-game`, { data: {
    phase: "play",
    turnSeat: 0,
    players: [
      { name: "E1F OWNER", role: "Lord", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [bow] },
      { name: "E1F OBSERVER", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "E1F THIRD", role: "Rebel", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "E1F FOURTH", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
    ],
  } });
  expect(seededResponse.ok()).toBeTruthy();
  const room = await seededResponse.json();
  const ownerContext = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const observerContext = await browser.newContext({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const ownerPage = await ownerContext.newPage();
  const observerPage = await observerContext.newPage();
  const openSeat = async (page, seat) => {
    const player = room.players[seat];
    await page.setViewportSize(viewport);
    await page.addInitScript(({ code, token, name }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    }, { code: room.code, token: player.token, name: player.name });
    await page.goto(`${workerApi}/`);
    await expect(page.locator(".game-shell")).toBeVisible();
    return player;
  };
  try {
    const owner = await openSeat(ownerPage, 0);
    const observer = await openSeat(observerPage, 1);
    const ownerDock = ownerPage.locator(`.local-player-dock[data-player-anchor="${owner.id}"]`);
    await ownerDock.locator(`[data-hand-card-id="${bow.id}"] .game-card`).click();
    const play = ownerPage.locator('[data-action-slot="primary"] button.primary');
    await expect(play).toHaveText("Play");
    const equipSubmitted = ownerPage.waitForResponse((response) => response.url() === `${workerApi}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "play_card"
      && response.request().postDataJSON()?.cardId === bow.id);
    await play.click();
    const submission = await equipSubmitted;
    expect(submission.ok()).toBeTruthy();
    const committed = await submission.json();
    const event = committed.room.timeline.find((entry) => entry.type === "card" && entry.action === "equip" && entry.card?.id === bow.id);
    expect(event).toMatchObject({ actorId: owner.id, action: "equip", card: bow });
    expect(committed.room.players.find((player) => player.id === owner.id).equipmentCards).toContainEqual(bow);

    const publicViewResponse = await request.get(`${workerApi}/api/rooms?code=${room.code}&token=${observer.token}`);
    expect(publicViewResponse.ok()).toBeTruthy();
    const observerView = await publicViewResponse.json();
    expect(observerView.timeline.filter((entry) => entry.id === event.id && entry.card?.id === bow.id)).toHaveLength(1);
    expect(observerView.players.find((player) => player.id === owner.id).equipmentCards).toContainEqual(bow);

    const revealSelector = `.active-table-reveal[data-settlement-event-id="${event.id}"]`;
    const ownerReveal = ownerPage.locator(revealSelector);
    const observerReveal = observerPage.locator(revealSelector);
    await expect(ownerReveal).toBeVisible({ timeout: 12_000 });
    await expect(observerReveal).toBeVisible({ timeout: 12_000 });
    const ownerMini = ownerPage.locator(`.local-zone-card[data-equipment-id="${bow.id}"]`);
    const ownerCardFace = ownerReveal.locator(`[data-settlement-card-id="${bow.id}"]`);
    await expect(ownerMini).toHaveAttribute("data-equipment-arrival-pending", "true");
    await expect(ownerMini.locator(".played-card")).toHaveCSS("visibility", "hidden");
    await expect(ownerCardFace).toHaveCount(1);

    await observerPage.locator(`.opponent-player-card[data-player-anchor="${owner.id}"] .opponent-hero-target`).tap();
    const inspector = observerPage.locator(`.opponent-inspection-panel[data-inspect-player-id="${owner.id}"]`);
    const observerMini = inspector.locator('.opponent-inspection-equipment-card[data-inspector-slot="weapon"]');
    await expect(inspector).toBeVisible();
    await expect(observerMini).toHaveAttribute("data-equipment-arrival-pending", "true");
    await expect(observerMini.locator(".played-card")).toHaveCSS("visibility", "hidden");
    await expect(observerReveal.locator(`[data-settlement-card-id="${bow.id}"]`)).toHaveCount(1);

    const endTurn = ownerPage.getByRole("button", { name: "End", exact: true });
    await expect(endTurn).toBeEnabled();
    await testInfo.attach("E1-F real Worker/D1 actor-bound public equip in flight", { body: await observerPage.screenshot(), contentType: "image/png" });
    await expect(ownerReveal).toHaveCount(0, { timeout: 8_000 });
    await expect(ownerMini).not.toHaveAttribute("data-equipment-arrival-pending", "true");
    await expect(observerMini).not.toHaveAttribute("data-equipment-arrival-pending", "true");
    await expect(ownerMini.locator(".played-card")).toBeVisible();
    await expect(observerMini.locator(".played-card")).toBeVisible();
    await expect(ownerPage.locator(`.active-table-reveal [data-settlement-card-id="${bow.id}"]`)).toHaveCount(0);

    await observerPage.reload();
    await expect(observerPage.locator(".game-shell")).toBeVisible();
    await expect(observerPage.locator(revealSelector)).toHaveCount(0);
    await observerPage.locator(`.opponent-player-card[data-player-anchor="${owner.id}"] .opponent-hero-target`).tap();
    const refreshedMini = observerPage.locator(`.opponent-inspection-panel[data-inspect-player-id="${owner.id}"] .opponent-inspection-equipment-card[data-inspector-slot="weapon"]`);
    await expect(refreshedMini).not.toHaveAttribute("data-equipment-arrival-pending", "true");
    await expect(refreshedMini.locator(".played-card")).toBeVisible();
  } finally {
    await ownerContext.close();
    await observerContext.close();
  }
});
