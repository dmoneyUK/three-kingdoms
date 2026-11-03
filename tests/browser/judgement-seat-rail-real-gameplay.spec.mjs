import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seed(request, judgementCard) {
  const delayed = card("Overindulgence", "t1-public-judgement-overindulgence", "♥");
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "T1 SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [delayed] },
        { name: "T1 OWNER", role: "Loyalist", hero: "simayi", hp: 4, maxHp: 4, hand: [], judgement: [judgementCard] },
        { name: "T1 VIEWER A", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] },
        { name: "T1 VIEWER B", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`T1 room seed failed: ${await response.text()}`);
  return { ...(await response.json()), delayed };
}

async function openPlayer(page, room, player, viewport = { width: 390, height: 844 }) {
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function judgementGeometry(page, ownerId, cardId) {
  return page.locator(`.opponent-player-card[data-player-anchor="${ownerId}"] [data-judgement-id="${cardId}"]`).evaluate((cardNode) => {
    const rectangle = (element) => {
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const seat = cardNode.closest(".opponent-player-card");
    const rail = cardNode.closest(".opponent-judgement-status");
    const strip = cardNode.closest(".opponent-status-equipment-strip");
    const hp = strip.querySelector(".opponent-hp-chip");
    const equipment = strip.querySelector(".opponent-equipment-summary");
    const cardRect = rectangle(cardNode);
    const seatRect = rectangle(seat);
    const railRect = rectangle(rail);
    return {
      ownerId: rail.dataset.judgementOwnerId,
      seat: seatRect,
      rail: railRect,
      card: cardRect,
      strip: rectangle(strip), hp: rectangle(hp), equipment: rectangle(equipment),
      equipmentCount: equipment.querySelectorAll(".opponent-equipment-slot").length,
    };
  });
}

test("T1: public Judgement markers stay inside their real Seat across viewers", async ({ browser, request }) => {
  test.setTimeout(90_000);
  const lightning = card("Lightning", "t1-public-lightning", "♥");
  const room = await seed(request, lightning);
  const firstViewer = room.players[2];
  const secondViewer = room.players[3];
  const owner = room.players[1];
  const firstPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const secondPage = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

  try {
    await Promise.all([
      openPlayer(firstPage, room, firstViewer),
      openPlayer(secondPage, room, secondViewer),
    ]);

    const ownerSeat = firstPage.locator(`.opponent-player-card[data-player-anchor="${owner.id}"]`);
    const rail = ownerSeat.locator(".opponent-judgement-status");
    const attachedCard = ownerSeat.locator(`[data-judgement-id="${lightning.id}"]`);
    await expect(rail).toBeVisible();
    await expect(attachedCard).toBeVisible();
    await expect(firstPage.locator(`.player-board [data-judgement-id="${lightning.id}"]`)).toHaveCount(1);
    await expect(firstPage.locator(`.player-board [data-judgement-owner-id]`)).toHaveCount(1);
    await expect(firstPage.locator(`.opponent-player-card[data-player-anchor="${room.players[2].id}"] [data-judgement-id]`)).toHaveCount(0);

    const initialGeometry = await judgementGeometry(firstPage, owner.id, lightning.id);
    expect(initialGeometry.ownerId).toBe(owner.id);
    expect(initialGeometry.card.width).toBeLessThanOrEqual(16);
    expect(initialGeometry.rail.top).toBeGreaterThanOrEqual(initialGeometry.seat.top);
    expect(initialGeometry.rail.bottom).toBeLessThanOrEqual(initialGeometry.seat.bottom);
    expect(initialGeometry.hp.right).toBeLessThanOrEqual(initialGeometry.rail.left);
    expect(initialGeometry.rail.right).toBeLessThanOrEqual(initialGeometry.equipment.left);
    expect(initialGeometry.equipmentCount).toBe(4);
    await expect(ownerSeat.locator(".opponent-judgement-zone, .judgement-mini")).toHaveCount(0);
    await expect(attachedCard).toHaveAttribute("aria-label", `Lightning in ${owner.name}'s Judgement zone`);
    await expect(attachedCard).toHaveText("⚡");

    const play = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: room.delayed.id, targetId: owner.id },
    });
    expect(play.ok(), await play.text()).toBeTruthy();

    const inFlight = firstPage.locator(`.active-table-reveal[data-public-zone-transition-card-id="${room.delayed.id}"]`);
    await expect(inFlight).toBeVisible({ timeout: 12_000 });
    const attachedDelayed = firstPage.locator(`.opponent-player-card[data-player-anchor="${owner.id}"] [data-judgement-id="${room.delayed.id}"]`);
    await expect(attachedDelayed).toHaveCount(0);
    await expect(inFlight.locator(`[data-settlement-card-id="${room.delayed.id}"]`)).toHaveCount(1);
    await expect(attachedDelayed).toBeVisible({ timeout: 12_000 });
    await expect(attachedDelayed.locator("svg")).toHaveCount(1);
    await expect(firstPage.locator(`.active-table-reveal[data-public-zone-transition-card-id="${room.delayed.id}"]`)).toHaveCount(0);

    const postArrival = await judgementGeometry(firstPage, owner.id, room.delayed.id);
    expect(postArrival.ownerId).toBe(owner.id);
    expect(postArrival.rail.right).toBeLessThanOrEqual(postArrival.equipment.left);
    await ownerSeat.getByRole("button", { name: `Inspect ${owner.name}`, exact: true }).click();
    await expect(firstPage.locator(`.opponent-inspection-panel[data-inspect-player-id="${owner.id}"]`)).toBeVisible();
    await expect(firstPage.locator(`.opponent-inspection-panel[data-inspect-player-id="${owner.id}"]`).getByRole("button", { name: "Explain Lightning" })).toBeVisible();
    await expect(firstPage.locator(`.opponent-inspection-panel[data-inspect-player-id="${owner.id}"]`).getByRole("button", { name: "Explain Overindulgence" })).toBeVisible();

    const otherOwnerSeat = secondPage.locator(`.opponent-player-card[data-player-anchor="${owner.id}"]`);
    await expect(otherOwnerSeat.locator(".opponent-judgement-status")).toBeVisible();
    await expect(otherOwnerSeat.locator(`[data-judgement-id="${room.delayed.id}"]`)).toBeVisible();
    await expect(secondPage.locator(`.player-board [data-judgement-id="${room.delayed.id}"]`)).toHaveCount(1);
    const secondGeometry = await judgementGeometry(secondPage, owner.id, room.delayed.id);
    expect(secondGeometry.ownerId).toBe(owner.id);
    expect(secondGeometry.rail.right).toBeLessThanOrEqual(secondGeometry.equipment.left);

  } finally {
    await firstPage.close();
    await secondPage.close();
  }
});

test("T1: narrow six-player Seat retains HP, equipment and Judgement summary", async ({ page, request }) => {
  const hidden = card("Peach", "t1-six-hidden-hand", "♥");
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players: [
      { name: "VIEWER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
      { name: "OWNER", role: "Loyalist", hero: "simayi", hp: 3, maxHp: 3, hand: [hidden], judgement: [card("Lightning", "t1-six-lightning"), card("Overindulgence", "t1-six-overindulgence", "♥")] },
      { name: "P3", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] },
      { name: "P4", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
      { name: "P5", role: "Renegade", hero: "gan-ning", hp: 4, maxHp: 4, hand: [] },
      { name: "P6", role: "Rebel", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
    ] },
  });
  expect(response.ok()).toBeTruthy();
  const room = await response.json();
  await openPlayer(page, room, room.players[0], { width: 390, height: 700 });
  const seat = page.locator(`.opponent-player-card[data-player-anchor="${room.players[1].id}"]`);
  const summary = seat.locator(".opponent-judgement-overflow");
  await expect(summary).toBeVisible();
  await expect(summary).toHaveText("2");
  await expect(seat.locator(".opponent-equipment-slot")).toHaveCount(4);
  await expect(seat.locator(`[data-hand-card-id="${hidden.id}"]`)).toHaveCount(0);
  const rects = await summary.evaluate((element) => {
    const strip = element.closest(".opponent-status-equipment-strip");
    const rect = (node) => { const r = node.getBoundingClientRect(); return { left: r.left, right: r.right, top: r.top, bottom: r.bottom }; };
    return { strip: rect(strip), hp: rect(strip.querySelector(".opponent-hp-chip")), summary: rect(element), equipment: rect(strip.querySelector(".opponent-equipment-summary")) };
  });
  expect(rects.hp.right).toBeLessThanOrEqual(rects.summary.left);
  expect(rects.summary.right).toBeLessThanOrEqual(rects.equipment.left);
  expect(rects.equipment.right).toBeLessThanOrEqual(rects.strip.right);
  expect(rects.summary.top).toBeGreaterThanOrEqual(rects.strip.top);
  expect(rects.summary.bottom).toBeLessThanOrEqual(rects.strip.bottom);
});
