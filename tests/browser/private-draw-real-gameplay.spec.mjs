import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const viewports = [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];
const deck = [
  { id: "real-private-draw-attack", kind: "Attack", suit: "♠", rank: "A" },
  { id: "real-private-draw-dodge", kind: "Dodge", suit: "♥", rank: "2" },
  { id: "real-private-draw-peach", kind: "Peach", suit: "♦", rank: "3" },
  { id: "real-private-draw-negation", kind: "Negation", suit: "♣", rank: "4" },
];

async function measure(page, includeEvent) {
  return page.evaluate((withEvent) => {
    const bounds = (element) => {
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const cluster = document.querySelector(".stage-system-cluster");
    const menu = cluster.querySelector(".stage-system-menu-trigger");
    const timer = cluster.querySelector(":scope > .visible-countdown-event");
    const table = document.querySelector(".play-table");
    const dock = document.querySelector(".local-player-dock");
    const guidance = dock.querySelector(".console-guidance");
    const event = document.querySelector(".private-draw-stage");
    const title = event?.querySelector(".card-action-title");
    const row = event?.querySelector(".private-draw-row");
    return {
      menu: bounds(menu),
      guidance: bounds(guidance),
      dock: bounds(dock),
      table: bounds(table),
      cluster: bounds(cluster),
      timer: timer ? bounds(timer) : null,
      title: withEvent && title ? bounds(title) : null,
      row: withEvent && row ? bounds(row) : null,
      seats: [...document.querySelectorAll(".player-board .opponent-player-card")].map(bounds),
      cards: withEvent && row ? [...row.querySelectorAll(".played-card")].map((card) => ({
        ...bounds(card),
        opacity: Number.parseFloat(getComputedStyle(card).opacity),
      })) : [],
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
      timerPointerEvents: timer ? getComputedStyle(timer).pointerEvents : null,
    };
  }, includeEvent);
}

async function roomView(request, seed, playerIndex) {
  const member = seed.players[playerIndex];
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${member.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function openPlayer(page, seed, playerIndex, viewport, readinessTimeout = 15_000) {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  const projectedRoom = page.waitForResponse((response) => response.url().startsWith(`${API}/api/rooms?`)
    && response.request().method() === "GET", { timeout: readinessTimeout });
  await page.goto(`${API}/`);
  const roomResponse = await projectedRoom;
  expect(roomResponse.ok(), `room projection returned HTTP ${roomResponse.status()}`).toBeTruthy();
  await expect(page.locator(".game-shell")).toBeVisible({ timeout: readinessTimeout });
  return member;
}

async function clickCardAtExposedPoint(cardButton) {
  await cardButton.scrollIntoViewIfNeeded();
  const position = await cardButton.evaluate((button) => {
    const bounds = button.getBoundingClientRect();
    const slot = button.closest("[data-hand-card-id]");
    for (const yRatio of [0.2, 0.4, 0.6, 0.8]) {
      for (const xRatio of [0.08, 0.16, 0.24, 0.32, 0.4, 0.5, 0.65, 0.8, 0.92]) {
        const x = bounds.left + bounds.width * xRatio;
        const y = bounds.top + bounds.height * yRatio;
        const hit = document.elementFromPoint(x, y);
        if (hit?.closest("[data-hand-card-id]") === slot && hit?.closest(".game-card") === button) {
          return { x: bounds.width * xRatio, y: bounds.height * yRatio };
        }
      }
    }
    return null;
  });
  expect(position, "the selected card must have a real, unoccluded pointer target").not.toBeNull();
  await cardButton.click({ position });
}

test("real draw-phase gameplay shows private cards and the compact timer without moving the System Menu", async ({ page, request, browser }) => {
  // Keep the real browser-room projection bounded while allowing headroom under CI shard load.
  test.setTimeout(60_000);
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "draw",
      turnSeat: 0,
      players: [
        { name: "DRAWER", role: "Lord", hero: "guan-yu", hp: 4, maxHp: 4, hand: [] },
        { name: "OBSERVER", role: "Loyalist", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
        { name: "THIRD", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH", role: "Renegade", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
      ],
      deck,
    },
  });
  expect(seeded.ok()).toBeTruthy();
  const seed = await seeded.json();
  const authorized = await roomView(request, seed, 0);
  expect(authorized).toMatchObject({ phase: "draw", isMyAction: true });
  expect(authorized.currentAction.legalActions).toContain("draw");

  let releaseDraw;
  let resolveInterceptedDraw;
  const drawRequestPaused = new Promise((resolve) => { releaseDraw = resolve; });
  const drawRequestIntercepted = new Promise((resolve) => { resolveInterceptedDraw = resolve; });
  await page.route(`${API}/api/rooms`, async (route) => {
    const outgoing = route.request();
    if (outgoing.method() === "POST") {
      let body;
      try { body = outgoing.postDataJSON(); } catch { body = null; }
      if (body?.action === "draw") {
        resolveInterceptedDraw(outgoing);
        await drawRequestPaused;
      }
    }
    await route.continue();
  });

  const drawer = await openPlayer(page, seed, 0, viewports[0], 30_000);
  const drawRequest = await drawRequestIntercepted;
  expect(drawRequest.postDataJSON()).toMatchObject({ action: "draw", code: seed.code, token: drawer.token });

  const baseline = new Map();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    baseline.set(`${viewport.width}x${viewport.height}`, await measure(page, false));
  }

  const pauseAt = await page.evaluate(() => new Date(Date.now() + 10_000));
  await page.clock.pauseAt(pauseAt);
  const drawResponsePromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "draw");
  releaseDraw();
  const drawResponse = await drawResponsePromise;
  expect(drawResponse.ok()).toBeTruthy();

  const eventStage = page.locator(".private-draw-stage");
  const cluster = page.locator(".stage-system-cluster");
  const timer = cluster.locator(":scope > .visible-countdown-event");
  await expect(eventStage).toBeVisible();
  await expect(eventStage.locator(".card-action-title")).toContainText("PRIVATE DRAW");
  await expect(eventStage.locator(".card-action-title")).toContainText("Only you can see these cards");
  await expect(eventStage.locator(".private-draw-row > .played-card")).toHaveCount(2);
  await expect(timer).toHaveAttribute("role", "timer");
  await expect(timer).toHaveAttribute("aria-label", "Cards close in 3 seconds");
  await expect(timer).toHaveText("3s");
  await expect.poll(() => eventStage.locator(".private-draw-row > .played-card").evaluateAll((cards) => cards.length === 2
    && cards.every((card) => Number.parseFloat(getComputedStyle(card).opacity) > 0.99))).toBe(true);

  const drawerView = await roomView(request, seed, 0);
  expect(drawerView.myHand).toHaveLength(2);
  const drawnIds = drawerView.myHand.map((card) => card.id);
  expect(drawnIds).toEqual(deck.slice(0, 2).map((card) => card.id));
  expect(drawerView.timeline.some((event) => event.type === "message"
    && event.drawPlayerId === drawer.id
    && event.message === "DRAWER draws 2 cards.")).toBe(true);
  expect(drawerView.timeline.some((event) => event.type === "card" && drawnIds.includes(event.card.id))).toBe(false);
  await expect(eventStage.locator(".card-name-mark")).toHaveText(["Attack", "Dodge"]);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const geometry = await measure(page, true);
    const prior = baseline.get(`${viewport.width}x${viewport.height}`);
    const context = JSON.stringify({ viewport, geometry, prior });
    expect(geometry.pageWidth, context).toBeLessThanOrEqual(viewport.width);
    expect(geometry.timer.width, context).toBeGreaterThanOrEqual(44);
    expect(geometry.timer.width, context).toBeLessThanOrEqual(64);
    expect(geometry.timer.height, context).toBeGreaterThanOrEqual(36);
    expect(geometry.timer.height, context).toBeLessThanOrEqual(44);
    expect(Math.abs(geometry.timer.right - geometry.menu.left + 8), context).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.menu.left - prior.menu.left), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.menu.top - prior.menu.top), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.guidance.top - prior.guidance.top), context).toBeLessThanOrEqual(2);
    expect(geometry.timerPointerEvents, context).toBe("none");
    expect(geometry.timer.left, context).toBeGreaterThanOrEqual(geometry.table.left - 1);
    expect(geometry.menu.right, context).toBeLessThanOrEqual(geometry.table.right + 1);
    expect(geometry.table.bottom, context).toBeLessThanOrEqual(geometry.dock.top + 1);
    expect(geometry.cluster.bottom, context).toBeLessThanOrEqual(geometry.guidance.top);
    expect(geometry.guidance.top - geometry.cluster.bottom, context).toBeGreaterThanOrEqual(8);
    expect(geometry.guidance.top - geometry.cluster.bottom, context).toBeLessThanOrEqual(12);
    expect(geometry.title.left, context).toBeGreaterThanOrEqual(geometry.table.left - 1);
    expect(geometry.title.right, context).toBeLessThanOrEqual(geometry.table.right + 1);
    expect(geometry.row.bottom, context).toBeLessThanOrEqual(geometry.table.bottom + 1);
    expect(geometry.row.bottom, context).toBeLessThanOrEqual(geometry.cluster.top - 16);
    expect(geometry.cards, context).toHaveLength(2);
    for (const card of geometry.cards) {
      expect(card.opacity, context).toBeGreaterThan(0.99);
      expect(card.left, context).toBeGreaterThanOrEqual(geometry.table.left - 1);
      expect(card.right, context).toBeLessThanOrEqual(geometry.table.right + 1);
      expect(card.bottom, context).toBeLessThanOrEqual(geometry.cluster.top - 16);
    }
  }

  const observerView = await roomView(request, seed, 1);
  const observerProjection = JSON.stringify(observerView);
  for (const drawnId of drawnIds) expect(observerProjection).not.toContain(drawnId);
  expect(observerView.myHand).toEqual([]);
  expect(observerView.timeline.some((event) => event.type === "card" && event.action === "draw")).toBe(false);

  // Keep the observer's privacy projection independent from the drawer's frozen clock and request routing.
  const observerContext = await browser.newContext();
  try {
    const observerPage = await observerContext.newPage();
    await openPlayer(observerPage, seed, 1, viewports[0]);
    await expect(observerPage.locator(".private-draw-stage")).toHaveCount(0);
    await expect(observerPage.locator(".stage-system-cluster > .visible-countdown-event")).toHaveCount(0);
    for (const drawn of drawerView.myHand) await expect(observerPage.locator("body")).not.toContainText(drawn.kind);
  } finally {
    await observerContext.close();
  }
});

test("real multi-card Equilibrium draw keeps every private card reachable in the compact event", async ({ page, request }) => {
  const equilibriumHand = [
    { id: "real-equilibrium-cost-1", kind: "Attack", suit: "♠", rank: "A" },
    { id: "real-equilibrium-cost-2", kind: "Dodge", suit: "♥", rank: "2" },
    { id: "real-equilibrium-cost-3", kind: "Peach", suit: "♦", rank: "3" },
    { id: "real-equilibrium-cost-4", kind: "Negation", suit: "♣", rank: "4" },
    { id: "real-equilibrium-cost-5", kind: "Duel", suit: "♠", rank: "5" },
    { id: "real-equilibrium-cost-6", kind: "Dismantle", suit: "♥", rank: "6" },
    { id: "real-equilibrium-cost-7", kind: "Steal", suit: "♦", rank: "7" },
    { id: "real-equilibrium-cost-8", kind: "BarbarianInvasion", suit: "♣", rank: "8" },
  ];
  const replacementDeck = equilibriumHand.map((card, index) => ({
    ...card,
    id: `real-equilibrium-draw-${index + 1}`,
    kind: ["Attack", "Dodge", "Peach", "Negation", "Duel", "Dismantle", "Steal", "BarbarianInvasion"][index],
  }));
  const seeded = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "SUN QUAN", role: "Lord", hero: "sun-quan", hp: 4, maxHp: 4, hand: equilibriumHand },
        { name: "OBSERVER", role: "Loyalist", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
        { name: "THIRD", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH", role: "Renegade", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
      ],
      deck: replacementDeck,
    },
  });
  expect(seeded.ok()).toBeTruthy();
  const seed = await seeded.json();
  const sunQuan = await roomView(request, seed, 0);
  expect(sunQuan.currentAction.triggerOptions.map((option) => option.effectId)).toContain("sun_quan_zhiheng");

  const viewport = { width: 390, height: 844 };
  const drawer = await openPlayer(page, seed, 0, viewport);
  const dock = page.locator(`.local-player-dock[data-player-anchor="${drawer.id}"]`);
  const equilibrium = dock.locator(".local-hero-skills").getByRole("button", { name: "Equilibrium", exact: true });
  await expect(equilibrium).toBeEnabled();
  await expect(dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Equilibrium/i })).toHaveCount(0);
  await equilibrium.click();
  await expect(equilibrium).toHaveAttribute("aria-pressed", "true");
  for (const card of equilibriumHand) {
    const selectable = dock.locator(`[data-hand-card-id="${card.id}"] .game-card`);
    await expect(selectable).toBeEnabled();
    await clickCardAtExposedPoint(selectable);
  }
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "trigger");
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(submitted.request().postDataJSON()).toMatchObject({ action: "trigger", providerId: "sun_quan_zhiheng" });
  expect(submitted.request().postDataJSON().cardIds).toEqual(equilibriumHand.map((card) => card.id));

  const eventStage = page.locator(".private-draw-stage");
  await expect(eventStage).toBeVisible({ timeout: 20_000 });
  await expect(eventStage.locator(".private-draw-row > .played-card")).toHaveCount(8);
  await expect(eventStage.locator(".card-action-title")).toContainText("Only you can see these cards");
  const row = eventStage.locator(".private-draw-row");
  const rowGeometry = await row.evaluate((element) => {
    const box = element.getBoundingClientRect();
    return { left: box.left, right: box.right, width: box.width, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth };
  });
  expect(rowGeometry.scrollWidth).toBeGreaterThan(rowGeometry.clientWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

  const lastCard = row.locator(":scope > .played-card").last();
  await row.evaluate((element) => {
    for (const card of element.querySelectorAll(".played-card")) {
      const animation = card.getAnimations().find((candidate) => candidate.animationName === "privateDrawCardFlight");
      if (!animation) continue;
      animation.pause();
      animation.currentTime = Number(animation.effect.getComputedTiming().duration) / 2;
    }
  });
  await row.focus();
  const rowBox = await row.boundingBox();
  expect(rowBox).not.toBeNull();
  await page.mouse.move(rowBox.x + rowBox.width / 2, rowBox.y + rowBox.height / 2);
  await page.mouse.wheel(2000, 0);
  await page.mouse.wheel(2000, 0);
  await expect.poll(() => row.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  const lastCardBounds = await lastCard.evaluate((element) => {
    const cardBox = element.getBoundingClientRect();
    const rowBox = element.parentElement.getBoundingClientRect();
    return {
      reachable: cardBox.left >= rowBox.left - 1 && cardBox.right <= rowBox.right + 1,
      card: { left: cardBox.left, right: cardBox.right },
      row: { left: rowBox.left, right: rowBox.right },
      scrollLeft: element.parentElement.scrollLeft,
      scrollWidth: element.parentElement.scrollWidth,
      clientWidth: element.parentElement.clientWidth,
    };
  });
  expect(lastCardBounds.reachable, JSON.stringify(lastCardBounds)).toBe(true);
  await expect(row).toHaveAttribute("tabindex", "0");

  const resolved = await roomView(request, seed, 0);
  expect(resolved.myHand.map((card) => card.id)).toEqual(replacementDeck.map((card) => card.id));
  const observer = await roomView(request, seed, 1);
  const observerProjection = JSON.stringify(observer);
  for (const card of replacementDeck) expect(observerProjection).not.toContain(card.id);
  expect(observer.myHand).toEqual([]);
});
