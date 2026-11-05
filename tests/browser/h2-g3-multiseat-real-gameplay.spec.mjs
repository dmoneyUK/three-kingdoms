import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const MOBILE_CASES = [
  { playerCount: 4, viewport: { width: 390, height: 700 } },
  { playerCount: 6, viewport: { width: 390, height: 844 } },
  { playerCount: 8, viewport: { width: 480, height: 900 } },
];

async function post(request, action, code, token, values = {}) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, code, token, ...values } });
  const body = await response.json();
  expect(response.status(), `${action}: ${JSON.stringify(body)}`).toBeLessThan(300);
  return body.room;
}

async function createTestGame(request, playerCount) {
  const name = `H2 G3 ${playerCount}-PLAYER HOST`;
  const createdResponse = await request.post(`${API}/api/rooms`, { data: { action: "create", name } });
  const created = await createdResponse.json();
  expect(createdResponse.status(), JSON.stringify(created)).toBe(201);
  const { code, token } = { code: created.room.code, token: created.token };
  let room = await post(request, "add_test_players", code, token, { count: playerCount - 1 });
  room = await post(request, "enable_test_room", code, token);
  room = await post(request, "start", code, token);
  while (room.status === "heroes") {
    const candidate = room.myHeroOptions?.[0];
    expect(candidate, "the Worker supplies the current test seat's authoritative Hero choice").toBeTruthy();
    room = await post(request, "choose_hero", code, token, { heroId: candidate.id });
  }
  expect(room.status).toBe("playing");
  expect(room.players).toHaveLength(playerCount);
  return { code, token, name, room };
}

async function getViewer(request, session, viewerId) {
  const query = new URLSearchParams({ code: session.code, token: session.token, testViewerId: viewerId });
  const response = await request.get(`${API}/api/rooms?${query}`);
  const body = await response.json();
  expect(response.status(), `viewer ${viewerId}: ${JSON.stringify(body)}`).toBeLessThan(300);
  return body.room ?? body;
}

async function expectLocalIdentity(page, request, session, viewerId) {
  const projection = await getViewer(request, session, viewerId);
  expect(projection.meId).toBe(viewerId);
  expect(projection.myRole).toBeTruthy();
  expect(projection.players.find((player) => player.id === viewerId)?.role).toBe(projection.myRole);
  for (const opponent of projection.players.filter((player) => player.id !== viewerId)) {
    expect(opponent.role === null || opponent.role === "Lord", `${viewerId} does not receive hidden role for ${opponent.id}`).toBe(true);
  }

  const dock = page.locator(`.local-player-dock[data-player-anchor="${viewerId}"]`);
  const portrait = dock.locator(".local-hero-card");
  const footer = dock.locator(".local-hero-identity-footer");
  await expect(portrait).toBeVisible();
  await expect(portrait.locator(".local-hero-label, .local-hero-role, .local-hero-hp, .local-hero-hearts")).toHaveCount(0);
  await expect(footer.locator(".local-hero-role")).toHaveText(projection.myRole);
  const self = projection.players.find((player) => player.id === viewerId);
  await expect(footer.locator(".local-hero-hp")).toHaveText(`HP ${self.hp}/${self.maxHp}`);

  const opponentSeats = page.locator(".opponent-player-card[data-player-anchor]");
  await expect(opponentSeats).toHaveCount(projection.players.length - 1);
  const visibleSeats = await opponentSeats.evaluateAll((seats) => seats.map((seat) => {
    const bounds = (element) => {
      if (!element) return null;
      const rect = element.getBoundingClientRect();
      return { left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    };
    const playerName = seat.querySelector(".opponent-hero-overlay .opponent-player-name");
    const hp = seat.querySelector(".opponent-hp-chip");
    const style = playerName ? getComputedStyle(playerName) : null;
    const playerRect = bounds(playerName);
    const hpRect = bounds(hp);
    const visible = (node) => {
      if (!node) return false;
      const computed = getComputedStyle(node);
      const rect = node.getBoundingClientRect();
      return computed.display !== "none" && computed.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
    };
    return {
      id: seat.dataset.playerAnchor,
      playerName: playerName?.textContent?.trim() ?? "",
      playerNameVisible: visible(playerName),
      heroNameCount: [...seat.querySelectorAll(".opponent-hero-name")].filter(visible).length,
      hp: hp?.textContent?.trim() ?? "",
      hpCount: seat.querySelectorAll(".opponent-hp-chip").length,
      hpFirstBand: Boolean(hpRect && playerRect && hpRect.top >= playerRect.bottom - 2),
      roleFooterCount: seat.querySelectorAll(".local-hero-identity-footer, .local-hero-role").length,
      occupiedEquipment: seat.querySelectorAll(".opponent-equipment-slot.is-occupied").length,
      nameRect: playerRect,
      seatRect: bounds(seat),
      nameFontSize: style ? Number.parseFloat(style.fontSize) : 0,
    };
  }));
  const playersById = new Map(projection.players.map((player) => [player.id, player]));
  for (const seat of visibleSeats) {
    const player = playersById.get(seat.id);
    expect(player, `seat ${seat.id} belongs to the current projection`).toBeTruthy();
    expect(seat.playerNameVisible, `${seat.id} public player name remains visible`).toBe(true);
    expect(seat.playerName).toBe(player.name);
    expect(seat.heroNameCount, `${seat.id} does not show a duplicate Hero-name label`).toBe(0);
    expect(seat.hpCount, `${seat.id} shows one HP value`).toBe(1);
    expect(seat.hp).toBe(`HP ${player.hp}/${player.maxHp}`);
    expect(seat.hpFirstBand, `${seat.id} HP stays in the lower identity band`).toBe(true);
    expect(seat.roleFooterCount, `${seat.id} does not expose the local private role`).toBe(0);
    expect(seat.occupiedEquipment, `${seat.id} has no phantom Equipment in a freshly started game`).toBe(0);
    expect(seat.nameFontSize).toBeGreaterThanOrEqual(8);
  }

  const geometry = await page.evaluate(() => {
    const rect = (selector) => {
      const element = document.querySelector(selector);
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
    };
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const portrait = document.querySelector(`.local-player-dock[data-player-anchor="${CSS.escape(document.querySelector('.local-player-dock')?.dataset.playerAnchor ?? '')}"] .local-hero-card`);
    const footer = document.querySelector(".local-player-dock .local-hero-identity-footer");
    return {
      viewport: window.innerWidth,
      documentWidth: document.documentElement.scrollWidth,
      portrait: rect(".local-player-dock .local-hero-card"),
      footer: rect(".local-player-dock .local-hero-identity-footer"),
      identity: rect(".local-player-dock .local-dock-identity"),
      hand: rect(".local-player-dock .local-hand-section"),
      guidance: rect(".local-player-dock .console-guidance"),
      controls: rect(".local-player-dock .turn-controls"),
      roleInsidePortrait: Boolean(portrait?.contains(footer?.querySelector(".local-hero-role"))),
      hpInsidePortrait: Boolean(portrait?.contains(footer?.querySelector(".local-hero-hp"))),
      footerIntersectsHand: intersects(rect(".local-player-dock .local-hero-identity-footer"), rect(".local-player-dock .local-hand-section")),
      footerIntersectsGuidance: intersects(rect(".local-player-dock .local-hero-identity-footer"), rect(".local-player-dock .console-guidance")),
      footerIntersectsControls: intersects(rect(".local-player-dock .local-hero-identity-footer"), rect(".local-player-dock .turn-controls")),
    };
  });
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewport);
  expect(geometry.footer.top).toBeGreaterThanOrEqual(geometry.portrait.bottom);
  expect(geometry.footer.bottom).toBeLessThanOrEqual(geometry.identity.bottom);
  expect(geometry.roleInsidePortrait).toBe(false);
  expect(geometry.hpInsidePortrait).toBe(false);
  expect(geometry.footerIntersectsHand).toBe(false);
  expect(geometry.footerIntersectsGuidance).toBe(false);
  expect(geometry.footerIntersectsControls).toBe(false);
  return { projection, visibleSeats, geometry };
}

test("H2-G3 authentic 4/6/8-player phone views preserve local identity, role privacy and TEST SWITCH", async ({ browser, request }, testInfo) => {
  test.setTimeout(180_000);
  for (const { playerCount, viewport } of MOBILE_CASES) {
    const session = await createTestGame(request, playerCount);
    const host = session.room.players.find((player) => player.isHost) ?? session.room.players[0];
    const context = await browser.newContext({ viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    try {
      const page = await context.newPage();
      await page.addInitScript(({ code, token, name }) => {
        localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
      }, { code: session.code, token: session.token, name: session.name });
      await page.goto(`${API}/`);
      await expect(page.locator(".game-shell")).toBeVisible();
      await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"]`)).toBeVisible();

      const initial = await expectLocalIdentity(page, request, session, host.id);
      const firstOpponent = page.locator(".opponent-player-card[data-player-anchor]").first();
      const inspectedId = await firstOpponent.getAttribute("data-player-anchor");
      await firstOpponent.locator(".opponent-hero-target").tap();
      await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${inspectedId}"]`)).toBeVisible();
      await firstOpponent.locator(".opponent-hero-target").tap();
      await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);

      for (const viewer of session.room.players.filter((player) => player.id !== host.id)) {
        const switchButton = page.getByTestId(`test-view-switch-${viewer.id}`);
        await expect(switchButton, `${viewer.name} TEST SWITCH is present on ${playerCount}-player phone`).toBeVisible();
        await switchButton.tap();
        await expect(page.locator(`.local-player-dock[data-player-anchor="${viewer.id}"]`)).toBeVisible();
        const switched = await expectLocalIdentity(page, request, session, viewer.id);
        expect(switched.projection.meId).toBe(viewer.id);
        expect(switched.geometry.viewport).toBe(viewport.width);
      }

      const evidence = {
        playerCount,
        viewport,
        viewerCountChecked: session.room.players.length,
        finalViewerId: session.room.players.at(-1).id,
        localFooter: initial.geometry,
        opponentSeats: initial.visibleSeats,
      };
      await testInfo.attach(`h2-g3-${playerCount}-player-phone-geometry.json`, {
        body: Buffer.from(JSON.stringify(evidence, null, 2)),
        contentType: "application/json",
      });
      await testInfo.attach(`h2-g3-${playerCount}-player-phone.png`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    } finally {
      await context.close();
    }
  }
});
