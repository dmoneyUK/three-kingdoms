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
    const rail = cardNode.closest(".opponent-judgement-zone");
    const table = cardNode.closest(".play-table");
    const info = cardNode.querySelector(".zone-info-button");
    const infoRect = info.getBoundingClientRect();
    const infoHit = document.elementFromPoint(infoRect.left + infoRect.width / 2, infoRect.top + infoRect.height / 2);
    const cardRect = rectangle(cardNode);
    const seatRect = rectangle(seat);
    const railRect = rectangle(rail);
    const tableRect = rectangle(table);
    const protectedElements = [...table.querySelectorAll([
      ".opponent-player-card", ".public-card-journey-card", ".active-table-reveal .played-card",
      ".public-card-announcement", ".public-activity-chip", ".visible-countdown", ".stage-system-cluster",
      ".local-player-dock", ".local-hand-rail", ".console-guidance", ".opponent-inspection-floating-shell",
    ].join(","))].filter((element) => element !== seat && !seat.contains(element));
    const intersects = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    const collisions = protectedElements.flatMap((element) => {
      const style = getComputedStyle(element);
      const obstacleRect = rectangle(element);
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0
        || obstacleRect.width <= 0 || obstacleRect.height <= 0 || !intersects(railRect, obstacleRect)) return [];
      return [element.className?.baseVal ?? element.className ?? element.tagName];
    });
    return {
      ownerId: rail.dataset.judgementOwnerId,
      seat: seatRect,
      rail: railRect,
      card: cardRect,
      table: tableRect,
      infoHit: infoHit === info || info.contains(infoHit),
      collisions,
    };
  });
}

test("T1: a committed public Judgement rail stays with its real Seat across viewers", async ({ browser, request }) => {
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
    const rail = ownerSeat.locator(".opponent-judgement-zone");
    const attachedCard = ownerSeat.locator(`[data-judgement-id="${lightning.id}"]`);
    await expect(rail).toBeVisible();
    await expect(attachedCard).toBeVisible();
    await expect(firstPage.locator(`.player-board [data-judgement-id="${lightning.id}"]`)).toHaveCount(1);
    await expect(firstPage.locator(`.player-board [data-judgement-owner-id]`)).toHaveCount(1);
    await expect(firstPage.locator(`.opponent-player-card[data-player-anchor="${room.players[2].id}"] [data-judgement-id]`)).toHaveCount(0);

    const initialGeometry = await judgementGeometry(firstPage, owner.id, lightning.id);
    expect(initialGeometry.ownerId).toBe(owner.id);
    expect(initialGeometry.card.width).toBeGreaterThanOrEqual(44);
    expect(initialGeometry.card.height).toBeGreaterThanOrEqual(66);
    expect(initialGeometry.rail.top).toBeGreaterThanOrEqual(initialGeometry.seat.bottom);
    expect(initialGeometry.rail.left).toBeGreaterThanOrEqual(initialGeometry.table.left);
    expect(initialGeometry.rail.right).toBeLessThanOrEqual(initialGeometry.table.right);
    expect(initialGeometry.rail.bottom).toBeLessThanOrEqual(initialGeometry.table.bottom);
    expect(initialGeometry.collisions).toEqual([]);
    expect(initialGeometry.infoHit).toBe(true);

    const play = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: room.delayed.id, targetId: owner.id },
    });
    expect(play.ok(), await play.text()).toBeTruthy();

    const inFlight = firstPage.locator(`.active-table-reveal[data-public-zone-transition-card-id="${room.delayed.id}"]`);
    await expect(inFlight).toBeVisible({ timeout: 12_000 });
    const attachedDelayed = firstPage.locator(`.opponent-player-card[data-player-anchor="${owner.id}"] [data-judgement-id="${room.delayed.id}"]`);
    await expect(attachedDelayed).toHaveCount(1);
    await expect(attachedDelayed).toHaveCSS("visibility", "hidden");
    await expect(inFlight.locator(`[data-settlement-card-id="${room.delayed.id}"]`)).toHaveCount(1);
    await expect(attachedDelayed).toHaveCSS("visibility", "hidden");
    await expect(attachedDelayed).toBeVisible({ timeout: 12_000 });
    await expect(firstPage.locator(`.active-table-reveal[data-public-zone-transition-card-id="${room.delayed.id}"]`)).toHaveCount(0);

    const postArrival = await judgementGeometry(firstPage, owner.id, room.delayed.id);
    expect(postArrival.ownerId).toBe(owner.id);
    expect(postArrival.collisions).toEqual([]);
    const infoButton = attachedDelayed.getByRole("button", { name: `Inspect ${owner.name} to explain Overindulgence`, exact: true });
    await infoButton.click();
    await expect(firstPage.locator(`.opponent-inspection-panel[data-inspect-player-id="${owner.id}"]`)).toBeVisible();
    const inspectorGeometry = await judgementGeometry(firstPage, owner.id, room.delayed.id);
    expect(inspectorGeometry.collisions).toEqual([]);

    const otherOwnerSeat = secondPage.locator(`.opponent-player-card[data-player-anchor="${owner.id}"]`);
    await expect(otherOwnerSeat.locator(".opponent-judgement-zone")).toBeVisible();
    await expect(otherOwnerSeat.locator(`[data-judgement-id="${room.delayed.id}"]`)).toBeVisible();
    await expect(secondPage.locator(`.player-board [data-judgement-id="${room.delayed.id}"]`)).toHaveCount(1);
    const secondGeometry = await judgementGeometry(secondPage, owner.id, room.delayed.id);
    expect(secondGeometry.ownerId).toBe(owner.id);
    expect(secondGeometry.collisions).toEqual([]);

    await secondPage.setViewportSize({ width: 440, height: 844 });
    await expect(otherOwnerSeat.locator(`[data-judgement-id="${room.delayed.id}"]`)).toBeVisible();
    const resizedGeometry = await judgementGeometry(secondPage, owner.id, room.delayed.id);
    expect(resizedGeometry.ownerId).toBe(owner.id);
    expect(resizedGeometry.rail.left).toBeGreaterThanOrEqual(resizedGeometry.table.left);
    expect(resizedGeometry.rail.right).toBeLessThanOrEqual(resizedGeometry.table.right);
    expect(resizedGeometry.collisions).toEqual([]);
  } finally {
    await firstPage.close();
    await secondPage.close();
  }
});
