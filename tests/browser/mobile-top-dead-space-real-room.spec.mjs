import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

async function postRoomAction(request, action, values) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, ...values } });
  if (!response.ok()) throw new Error(`${action} failed: ${await response.text()}`);
  return response.json();
}

async function createRealFourPlayerRoom(request) {
  const created = await postRoomAction(request, "create", { name: "P5 SEAT GEOMETRY" });
  const { code } = created.room;
  const { token } = created;
  await postRoomAction(request, "add_test_players", { code, token });
  let room = (await postRoomAction(request, "start", { code, token })).room;

  while (room.status === "heroes") {
    const selected = room.myHeroOptions[0];
    expect(selected, "the server projects a legal hero option for the current seat").toBeTruthy();
    room = (await postRoomAction(request, "choose_hero", { code, token, heroId: selected.id })).room;
  }

  expect(room.status).toBe("playing");
  expect(room.currentAction).toBeTruthy();
  return { code, token, room };
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
]) {
  test(`P5 real four-player Seats use the mobile table top at ${viewport.width}×${viewport.height}`, async ({ page, request }, testInfo) => {
    const { code, token } = await createRealFourPlayerRoom(request);
    await page.setViewportSize(viewport);
    await page.addInitScript(({ roomCode, sessionToken }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name: "P5 SEAT GEOMETRY" }));
    }, { roomCode: code, sessionToken: token });
    await page.goto(`${API}/`);
    await expect(page.locator(".game-shell")).toBeVisible();

    const board = page.locator('.player-board[data-seat-topology="top-row"][data-player-count="4"]');
    await expect(board).toBeVisible();
    await expect.poll(() => board.locator(".hero-art-image").evaluateAll((images) => images.length === 3 && images.every((image) => image.complete && image.naturalWidth > 0))).toBe(true);
    const geometry = await page.evaluate(() => {
      const bounds = (element) => {
        const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const table = document.querySelector(".play-table");
      const playerBoard = document.querySelector('.player-board[data-seat-topology="top-row"][data-player-count="4"]');
      const safeZone = document.querySelector(".interaction-safe-zone");
      const seats = [...playerBoard.querySelectorAll(":scope > .opponent-player-card")].map((seat) => {
        const target = seat.querySelector(".opponent-hero-target");
        const targetBox = bounds(target);
        const hit = document.elementFromPoint(targetBox.left + targetBox.width / 2, targetBox.top + targetBox.height / 2);
        return {
          ...bounds(seat),
          playerName: seat.querySelector(".opponent-player-name")?.textContent?.trim() ?? "",
          heroName: seat.querySelector(".opponent-hero-name")?.textContent?.trim() ?? "",
          hp: seat.querySelector(".player-hp")?.textContent?.trim() ?? "",
          imageLoaded: Boolean(seat.querySelector(".opponent-hero-portrait .hero-art-image")?.naturalWidth),
          targetHitSafe: Boolean(hit && target.contains(hit)),
        };
      });
      const menu = document.querySelector(".stage-system-cluster");
      return {
        table: bounds(table),
        board: bounds(playerBoard),
        safeZone: bounds(safeZone),
        seats,
        systemCluster: menu ? bounds(menu) : null,
        statusCount: document.querySelectorAll(".player-board-status").length,
        viewportWidth: innerWidth,
        documentWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry.statusCount, "there is no visible board-status row to justify a top reservation").toBe(0);
    expect(geometry.board.top - geometry.table.top, "the player board must not retain the former ~55px empty inset").toBeLessThanOrEqual(12);
    expect(geometry.seats).toHaveLength(3);
    expect(Math.max(...geometry.seats.map(({ top }) => top)) - Math.min(...geometry.seats.map(({ top }) => top))).toBeLessThanOrEqual(1);
    expect(geometry.seats.every(({ playerName, heroName, hp, imageLoaded, targetHitSafe }) => playerName && heroName && hp && imageLoaded && targetHitSafe), JSON.stringify(geometry.seats)).toBe(true);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    const seatToStageGap = geometry.safeZone.top - Math.max(...geometry.seats.map(({ bottom }) => bottom));
    expect(seatToStageGap, "moving Seats upward also moves the interaction corridor, without creating a new blank band").toBeGreaterThanOrEqual(6);
    expect(seatToStageGap, "the Stage remains close to the mobile opponent row").toBeLessThanOrEqual(24);

    const ordered = [...geometry.seats].sort((left, right) => left.left - right.left);
    const minimumSeatWidth = viewport.width === 480 ? 136 : 108;
    for (const seat of ordered) {
      expect(seat.top - geometry.table.top, "the first opponent row stays close to the table top").toBeLessThanOrEqual(24);
      expect(seat.width).toBeGreaterThanOrEqual(minimumSeatWidth);
      expect(seat.height).toBeGreaterThanOrEqual(76);
      expect(seat.left).toBeGreaterThanOrEqual(0);
      expect(seat.right).toBeLessThanOrEqual(viewport.width);
    }
    for (let index = 1; index < ordered.length; index += 1) {
      expect(ordered[index].left - ordered[index - 1].right, "opponent Seats remain separated").toBeGreaterThanOrEqual(0);
    }
    if (geometry.systemCluster) {
      expect(geometry.systemCluster.top).toBeGreaterThanOrEqual(Math.max(...ordered.map(({ bottom }) => bottom)));
    }

    await testInfo.attach(`p5-real-seats-${viewport.width}`, {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });
}
