import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const viewports = [
  { width: 320, height: 740 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];
const harvest = { id: "real-harvest-timer-root", kind: "BumperHarvest", suit: "♥", rank: "3" };
const deck = [
  { id: "real-harvest-timer-attack", kind: "Attack", suit: "♠", rank: "7" },
  { id: "real-harvest-timer-dodge", kind: "Dodge", suit: "♣", rank: "8" },
  { id: "real-harvest-timer-peach", kind: "Peach", suit: "♥", rank: "9" },
  { id: "real-harvest-timer-duel", kind: "Duel", suit: "♦", rank: "10" },
];

async function seedGame(request, { firstNegation = null, secondNegation = null } = {}) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "HARVEST SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [harvest] },
        { name: "CHOOSER TWO", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: firstNegation ? [firstNegation] : [] },
        { name: "CHOOSER THREE", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: secondNegation ? [secondNegation] : [] },
        { name: "CHOOSER FOUR", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
      ],
      deck,
    },
  });
  if (!response.ok()) throw new Error(`Bumper Harvest seed failed: ${await response.text()}`);
  return response.json();
}

async function openPlayer(page, seed, playerIndex, viewport) {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return member;
}

async function roomView(request, seed, playerIndex) {
  const response = await request.get(`${API}/api/rooms?${new URLSearchParams({
    code: seed.code,
    token: seed.players[playerIndex].token,
  })}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function commitNegation(request, seed, winnerIndex, cardId) {
  const winner = seed.players[winnerIndex];
  let current = await roomView(request, seed, winnerIndex);
  for (let attempt = 0; attempt < seed.players.length + 1 && current.currentAction?.actorId !== winner.id; attempt += 1) {
    const actorIndex = seed.players.findIndex(({ id }) => id === current.currentAction?.actorId);
    expect(actorIndex, "the Negation window actor belongs to this authenticated room").toBeGreaterThanOrEqual(0);
    const actor = seed.players[actorIndex];
    const windowId = current.currentAction?.negationWindowId;
    expect(windowId).toBeTruthy();
    expect(current.currentAction?.legalActions).toContain("decline_response");
    const passed = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: seed.code, token: actor.token, context: { windowId } },
    });
    expect(passed.ok(), `${actor.name} passes before the Negation holder: ${await passed.text()}`).toBeTruthy();
    current = await roomView(request, seed, winnerIndex);
  }
  expect(current.currentAction?.actorId).toBe(winner.id);
  const windowId = current.currentAction?.negationWindowId;
  expect(windowId).toBeTruthy();
  const held = await request.post(`${API}/__test/negation-window-clock`, {
    data: { code: seed.code, windowId, mode: "hold" },
  });
  expect(held.ok(), await held.text()).toBeTruthy();
  const intent = await request.post(`${API}/api/rooms`, {
    data: { action: "respond", code: seed.code, token: winner.token, providerId: "negation_card", cardId, context: { windowId } },
  });
  expect(intent.ok(), `the authenticated Negation intent is accepted: ${await intent.text()}`).toBeTruthy();
  for (const player of seed.players) {
    if (player.id === winner.id) continue;
    const passed = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: seed.code, token: player.token, context: { windowId } },
    });
    expect(passed.ok(), `${player.name} passes the shared Negation window: ${await passed.text()}`).toBeTruthy();
  }
  const settled = await roomView(request, seed, 0);
  const event = settled.timeline.find((entry) => entry?.type === "card" && entry.action === "play" && entry.card?.id === cardId);
  expect(event, "the committed physical Negation becomes public after the shared window settles").toBeTruthy();
  expect(event.player).toBe(winner.name);
  return { event, room: settled };
}

async function reachAuthorizedHarvestChoice(request, seed) {
  let latest = null;
  for (let attempt = 0; attempt < seed.players.length * 5; attempt += 1) {
    latest = await roomView(request, seed, 0);
    if (latest.pendingHarvest
      && latest.currentAction?.kind === "harvest"
      && latest.currentAction.actorId === latest.pendingHarvest.actorId) {
      const chooserIndex = seed.players.findIndex(({ id }) => id === latest.currentAction.actorId);
      expect(chooserIndex, "the Harvest CurrentAction actor belongs to this room").toBeGreaterThanOrEqual(0);
      const chooserRoom = await roomView(request, seed, chooserIndex);
      if (chooserRoom.isMyAction && chooserRoom.currentAction?.legalActions?.includes("choose_harvest")) return chooserRoom;
      throw new Error(`Harvest CurrentAction actor projection does not authorize the chooser: ${JSON.stringify({
        observerMeId: latest.meId,
        actorMeId: chooserRoom.meId,
        pendingActorId: chooserRoom.pendingHarvest?.actorId,
        currentAction: chooserRoom.currentAction,
        actionRevision: chooserRoom.actionRevision,
      })}`);
    }
    if (latest.phase !== "response") break;
    const actorIndex = seed.players.findIndex(({ id }) => id === latest.currentAction?.actorId);
    expect(actorIndex, "the next server-owned response actor belongs to this room").toBeGreaterThanOrEqual(0);
    const actor = seed.players[actorIndex];
    const actorRoom = await roomView(request, seed, actorIndex);
    const windowId = actorRoom.currentAction?.negationWindowId;
    expect(windowId, JSON.stringify({ phase: actorRoom.phase, pendingKind: actorRoom.pending?.kind, pendingHarvest: actorRoom.pendingHarvest ? {
      actorId: actorRoom.pendingHarvest.actorId,
      complete: actorRoom.pendingHarvest.complete,
      availableIds: actorRoom.pendingHarvest.availableIds,
    } : null, currentAction: actorRoom.currentAction, actionRevision: actorRoom.actionRevision })).toBeTruthy();
    if (actorRoom.currentAction?.legalActions?.includes("decline_response")) {
      const passed = await request.post(`${API}/api/rooms`, {
        data: {
          action: "decline_response",
          code: seed.code,
          token: actor.token,
          context: {
            actionRevision: actorRoom.actionRevision,
            meId: actor.id,
            phase: "response",
            pendingKind: "response",
            windowId,
          },
        },
      });
      expect(passed.ok(), `${actor.name} passes the next public Negation window: ${await passed.text()}`).toBeTruthy();
    } else {
      const expired = await request.post(`${API}/__test/negation-window-clock`, {
        data: { code: seed.code, windowId, mode: "expire" },
      });
      expect(expired.ok(), await expired.text()).toBeTruthy();
      const advanced = await request.post(`${API}/api/rooms`, {
        data: { action: "advance_timers", code: seed.code, token: seed.players[0].token },
      });
      expect(advanced.ok(), await advanced.text()).toBeTruthy();
    }
  }
  throw new Error(`No server-authorized Harvest choice after the committed Negation: ${JSON.stringify({
    phase: latest?.phase,
    pendingHarvest: latest?.pendingHarvest ? { actorId: latest.pendingHarvest.actorId, availableIds: latest.pendingHarvest.availableIds } : null,
    currentAction: latest?.currentAction,
  })}`);
}

function postedAction(page, action) {
  return page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === action; }
    catch { return false; }
  });
}

async function publicCardInstances(page, identities) {
  return page.evaluate((expected) => {
    const selector = [
      "[data-public-card-journey-event-id]",
      "[data-public-card-static-event-id]",
      ".active-table-reveal [data-settlement-card-id]",
      ".table-played-card[data-settlement-card-id]",
    ].join(",");
    return [...document.querySelectorAll(selector)].flatMap((element) => {
      const journey = element.matches("[data-public-card-journey-event-id]");
      const active = element.closest(".active-table-reveal");
      const settled = element.closest(".table-played-card");
      const eventId = element.getAttribute("data-public-card-journey-event-id")
        ?? element.getAttribute("data-public-card-static-event-id")
        ?? active?.getAttribute("data-settlement-event-id")
        ?? settled?.getAttribute("data-settlement-event-id");
      const cardId = element.getAttribute("data-public-card-journey-card-id")
        ?? element.getAttribute("data-public-card-static-card-id")
        ?? element.getAttribute("data-settlement-card-id");
      if (!expected.some((identity) => identity.eventId === eventId || identity.cardId === cardId)) return [];
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      const owner = element.closest("[data-public-card-display]");
      return [{
        eventId,
        cardId,
        renderer: journey ? "public-journey" : active ? "active-table-reveal" : settled ? "settled-table-card" : "public-static",
        phase: element.getAttribute("data-public-card-journey-phase")
          ?? element.getAttribute("data-public-card-visual-phase")
          ?? active?.getAttribute("data-public-card-visual-phase")
          ?? null,
        visible: rect.width > 0 && rect.height > 0 && element.checkVisibility({ opacityProperty: true, visibilityProperty: true }),
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
        opacity: style.opacity,
        owner: owner?.getAttribute("data-public-card-renderer-kind") ?? null,
        journeyLayoutPending: owner?.getAttribute("data-public-card-layout-pending") ?? null,
      }];
    });
  }, identities);
}

async function playHarvest(page) {
  await page.locator(`[data-hand-card-id="${harvest.id}"] .game-card`).click();
  const play = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(play).toHaveText("Play");
  await expect(play).toBeEnabled();
  const submitted = postedAction(page, "play_card");
  await play.click();
  const response = await submitted;
  if (!response.ok()) throw new Error(`Bumper Harvest play failed: ${await response.text()}`);
}

async function measure(page) {
  return page.evaluate(() => {
    const bounds = (element) => {
      if (!element) return null;
      const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const cluster = document.querySelector(".stage-system-cluster");
    const timer = cluster?.querySelector(":scope > .visible-countdown-event");
    const menu = document.querySelector(".local-player-dock .console-guidance-row .stage-system-menu-trigger");
    const table = document.querySelector(".play-table");
    const dock = document.querySelector(".local-player-dock");
    const guidance = dock?.querySelector(".console-guidance");
    const choice = document.querySelector(".harvest-choice-panel");
    const harvestRow = choice?.querySelector(".harvest-card-row");
    const harvestChoices = [...(choice?.querySelectorAll(".harvest-card-choice") ?? [])];
    const piles = ["[data-draw-anchor='true']", "[data-discard-anchor='true']"]
      .map((selector) => bounds(document.querySelector(selector)));
    return {
      cluster: bounds(cluster), timer: bounds(timer), menu: bounds(menu), table: bounds(table),
      dock: bounds(dock), guidance: bounds(guidance), choice: bounds(choice),
      harvestRow: bounds(harvestRow), harvestRowClientWidth: harvestRow?.clientWidth ?? 0,
      harvestRowScrollWidth: harvestRow?.scrollWidth ?? 0,
      harvestRowClipLeft: harvestRow ? harvestRow.getBoundingClientRect().left + harvestRow.clientLeft : 0,
      harvestRowClipRight: harvestRow ? harvestRow.getBoundingClientRect().left + harvestRow.clientLeft + harvestRow.clientWidth : 0,
      harvestRowOverflowX: harvestRow ? getComputedStyle(harvestRow).overflowX : null,
      harvestChoiceCount: harvestChoices.length, harvestChoices: harvestChoices.map(bounds), piles,
      timerLabel: timer?.getAttribute("aria-label") ?? null,
      timerText: timer?.innerText.trim() ?? null,
      timerPointerEvents: timer ? getComputedStyle(timer).pointerEvents : null,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

function overlaps(a, b) {
  return Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
}

test("real Bumper Harvest gives each active chooser a server-owned 60-second Stage timer", async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  const seed = await seedGame(request);
  let suppressTimerProjection = false;
  await page.route(`${API}/api/rooms?**`, async (route) => {
    const response = await route.fetch();
    if (!suppressTimerProjection) return route.fulfill({ response });
    const body = await response.json();
    const room = body.room ?? body;
    if (room.pendingHarvest) room.pendingHarvest.countdownUntil = 0;
    if (room.currentAction?.deadline) room.currentAction.deadline = 0;
    if (room.pendingDying?.deadline) room.pendingDying.deadline = 0;
    if (room.pendingNegation?.deadline) room.pendingNegation.deadline = 0;
    if (room.pendingGreenDragon?.deadline) room.pendingGreenDragon.deadline = 0;
    if (room.pendingRockCleaving?.deadline) room.pendingRockCleaving.deadline = 0;
    if (room.pendingDuel?.deadline) room.pendingDuel.deadline = 0;
    if (room.pendingAttack?.deadline) room.pendingAttack.deadline = 0;
    return route.fulfill({ response, json: body });
  });
  const source = await openPlayer(page, seed, 0, viewports[0]);
  await expect(page.locator(".stage-system-cluster > .visible-countdown-event")).toHaveCount(0);

  await playHarvest(page);
  await expect.poll(async () => {
    const room = await roomView(request, seed, 0);
    return room.pendingHarvest?.actorId === source.id && room.pendingHarvest.countdownUntil > Date.now();
  }, { timeout: 20_000 }).toBe(true);

  const firstChoice = await roomView(request, seed, 0);
  const firstDeadline = firstChoice.pendingHarvest.countdownUntil;
  expect(firstChoice.currentAction.actorId).toBe(source.id);
  expect(firstDeadline - Date.now()).toBeGreaterThan(50_000);
  expect(firstDeadline - Date.now()).toBeLessThanOrEqual(60_000);
  const timer = page.locator(".stage-system-cluster > .visible-countdown-event");
  await expect(timer).toBeVisible();
  await expect(timer).toHaveAttribute("role", "timer");
  await expect(timer).toHaveAttribute("aria-label", /^Choosing (?:60|5[0-9]) seconds$/);
  await expect(timer).toHaveText(/^(?:60|5[0-9])s$/);
  await expect(page.locator(".harvest-choice-stage")).toBeVisible();

  const narrowViewport = { width: 320, height: 740 };
  await page.setViewportSize(narrowViewport);
  await expect(page.locator(".harvest-choice-panel")).toBeVisible();
  const localChoiceGeometry = await measure(page);
  const localChoiceContext = JSON.stringify({ viewport: narrowViewport, geometry: localChoiceGeometry });
  expect(localChoiceGeometry.choice.left, localChoiceContext).toBeGreaterThanOrEqual(8);
  expect(localChoiceGeometry.choice.right, localChoiceContext).toBeLessThanOrEqual(narrowViewport.width - 8);
  expect(localChoiceGeometry.harvestChoiceCount, localChoiceContext).toBe(4);
  for (const card of localChoiceGeometry.harvestChoices) {
    expect(card.left, localChoiceContext).toBeGreaterThanOrEqual(localChoiceGeometry.harvestRowClipLeft - 1);
    expect(card.right, localChoiceContext).toBeLessThanOrEqual(localChoiceGeometry.harvestRowClipRight + 1);
    expect(card.right - card.left, localChoiceContext).toBeGreaterThanOrEqual(44);
  }
  await expect(page.locator(".harvest-confirm-row button.primary")).toBeVisible();
  const localScreenshot = testInfo.outputPath("bumper-harvest-local-choice-320.png");
  await page.screenshot({ path: localScreenshot, animations: "disabled" });
  await testInfo.attach("bumper-harvest-local-choice-320", { path: localScreenshot, contentType: "image/png" });
  await testInfo.attach("bumper-harvest-local-choice-320-geometry", {
    body: JSON.stringify({ viewport: narrowViewport, geometry: localChoiceGeometry }, null, 2),
    contentType: "application/json",
  });

  const firstCard = page.locator(".harvest-choice-stage .harvest-card-select:not([disabled])").first();
  await expect(firstCard).toBeEnabled();
  await firstCard.click();
  const confirm = page.locator(".harvest-choice-stage .harvest-confirm-row button.primary");
  await expect(confirm).toBeEnabled();
  const chooseResponse = postedAction(page, "choose_harvest");
  await confirm.click();
  const chosen = await chooseResponse;
  if (!chosen.ok()) throw new Error(`Bumper Harvest choice failed: ${await chosen.text()}`);

  await expect.poll(async () => {
    const room = await roomView(request, seed, 0);
    return room.pendingHarvest?.actorId === seed.players[1].id
      && room.pendingHarvest.countdownUntil > firstDeadline;
  }, { timeout: 20_000 }).toBe(true);
  const nextChoice = await roomView(request, seed, 0);
  const nextDeadline = nextChoice.pendingHarvest.countdownUntil;
  expect(nextChoice.currentAction.actorId).toBe(seed.players[1].id);
  expect(nextDeadline).toBeGreaterThan(firstDeadline);
  expect(nextDeadline - firstDeadline).toBeLessThan(10_000);
  expect(nextDeadline - Date.now()).toBeGreaterThan(50_000);

  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    // Hold the server-backed active choice constant and hide only its timer
    // projection to measure the timer's own layout delta.
    suppressTimerProjection = true;
    await page.reload();
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.locator(".harvest-choice-panel")).toBeVisible();
    await expect(page.locator(".stage-system-cluster > .visible-countdown-event")).toHaveCount(0);
    const prior = await measure(page);

    suppressTimerProjection = false;
    await page.reload();
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.locator(".stage-system-cluster > .visible-countdown-event")).toBeVisible();
    await expect(timer).toBeVisible();
    const geometry = await measure(page);
    const context = JSON.stringify({ viewport, geometry, prior, firstDeadline, nextDeadline });
    expect(geometry.pageWidth, context).toBeLessThanOrEqual(viewport.width);
    expect(geometry.choice.left, context).toBeGreaterThanOrEqual(8);
    expect(geometry.choice.right, context).toBeLessThanOrEqual(viewport.width - 8);
    expect(geometry.harvestRow.left, context).toBeGreaterThanOrEqual(geometry.choice.left);
    expect(geometry.harvestRow.right, context).toBeLessThanOrEqual(geometry.choice.right);
    expect(geometry.harvestRowOverflowX, context).toMatch(/auto|scroll/);
    expect(geometry.harvestChoiceCount, context).toBe(4);
    expect(geometry.harvestRowScrollWidth, context).toBeGreaterThanOrEqual(geometry.harvestRowClientWidth);
    for (const card of geometry.harvestChoices) {
      expect(card.left, context).toBeGreaterThanOrEqual(geometry.harvestRowClipLeft - 1);
      expect(card.right, context).toBeLessThanOrEqual(geometry.harvestRowClipRight + 1);
      expect(card.left, context).toBeGreaterThanOrEqual(8);
      expect(card.right, context).toBeLessThanOrEqual(viewport.width - 8);
    }
    expect(geometry.timer.width, context).toBeGreaterThanOrEqual(52);
    expect(geometry.timer.width, context).toBeLessThanOrEqual(68);
    expect(geometry.timer.height, context).toBeGreaterThanOrEqual(36);
    expect(geometry.timer.height, context).toBeLessThanOrEqual(44);
    expect(Math.abs(geometry.menu.right - (geometry.guidance.right - 8)), context).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.menu.left - prior.menu.left), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.menu.top - prior.menu.top), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.guidance.top - prior.guidance.top), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.choice.left - prior.choice.left), context).toBeLessThanOrEqual(2);
    expect(Math.abs(geometry.choice.top - prior.choice.top), context).toBeLessThanOrEqual(2);
    expect(geometry.piles, context).toEqual(prior.piles);
    expect(geometry.guidance.top - geometry.cluster.bottom, context).toBeGreaterThanOrEqual(8);
    expect(geometry.guidance.top - geometry.cluster.bottom, context).toBeLessThanOrEqual(12);
    expect(geometry.timerPointerEvents, context).toBe("none");
    expect(geometry.table.bottom, context).toBeLessThanOrEqual(geometry.dock.top + 1);
    expect(overlaps(geometry.timer, viewport.width === 320 ? geometry.harvestRow : geometry.choice), context).toBe(false);
    expect(geometry.timerLabel, context).toMatch(/^Choosing \d+ seconds$/);
    expect(geometry.timerText, context).toMatch(/^\d+s$/);
    const lastChoice = await page.locator(".harvest-card-row").evaluate((row) => {
      row.scrollLeft = row.scrollWidth;
      const rowRect = row.getBoundingClientRect();
      const clipLeft = rowRect.left + row.clientLeft;
      const clipRight = clipLeft + row.clientWidth;
      const lastRect = row.querySelector(".harvest-card-choice:last-child").getBoundingClientRect();
      const result = { left: lastRect.left, right: lastRect.right, clipLeft, clipRight };
      row.scrollLeft = 0;
      return result;
    });
    expect(lastChoice.left, context).toBeGreaterThanOrEqual(lastChoice.clipLeft - 1);
    expect(lastChoice.right, context).toBeLessThanOrEqual(lastChoice.clipRight + 1);
    if (viewport.width === 320 || viewport.width === 390 || viewport.width === 1440) {
      const screenshotPath = testInfo.outputPath(`bumper-harvest-real-timer-${viewport.width}.png`);
      await page.screenshot({ path: screenshotPath, animations: "disabled" });
      await testInfo.attach(`bumper-harvest-real-timer-${viewport.width}`, { path: screenshotPath, contentType: "image/png" });
      await testInfo.attach(`bumper-harvest-real-timer-${viewport.width}-geometry`, {
        body: JSON.stringify({ viewport, geometry, firstDeadline, nextDeadline }, null, 2),
        contentType: "application/json",
      });
    }
  }
});

test("NEG-A1 restores Harvest choice and deduplicates public Negation cards on phones", async ({ browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const negation = { id: "neg-a1-harvest-negation", kind: "Negation", suit: "♠", rank: "A" };
  const counterNegation = { id: "neg-a1-harvest-counter-negation", kind: "Negation", suit: "♥", rank: "K" };
  const seed = await seedGame(request, { firstNegation: negation, secondNegation: counterNegation });
  const phones = [
    { width: 390, height: 700 },
    { width: 390, height: 844 },
    { width: 440, height: 766 },
    { width: 440, height: 894 },
  ];
  const contexts = [];
  try {
    const viewers = await Promise.all(seed.players.map(async (viewer, index) => {
      const context = await browser.newContext({ viewport: phones[index], isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
      contexts.push(context);
      const page = await context.newPage();
      await openPlayer(page, seed, index, phones[index]);
      return { viewer, page };
    }));

    const root = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: seed.code, token: seed.players[0].token, cardId: harvest.id },
    });
    expect(root.ok(), await root.text()).toBeTruthy();
    const opening = await roomView(request, seed, 0);
    expect(opening.publicHarvestPool?.semantics).toBe("PROVEN");
    expect(opening.currentAction?.negationWindowId).toBeTruthy();
    await testInfo.attach("neg-a1-public-harvest-before-negation-settles", {
      body: JSON.stringify({
        phase: opening.phase,
        pendingHarvest: opening.pendingHarvest ? {
          actorId: opening.pendingHarvest.actorId,
          revealedIds: opening.pendingHarvest.revealed.map(({ id }) => id),
          availableIds: opening.pendingHarvest.availableIds,
        } : null,
        currentAction: opening.currentAction,
        publicHarvestPool: opening.publicHarvestPool ? {
          semantics: opening.publicHarvestPool.semantics,
          rootEventId: opening.publicHarvestPool.rootEventId,
          revealedIds: opening.publicHarvestPool.revealed.map(({ id }) => id),
          availableIds: opening.publicHarvestPool.availableIds,
        } : null,
      }, null, 2),
      contentType: "application/json",
    });

    await Promise.all(viewers.map(async ({ page: viewerPage }) => {
      const stage = viewerPage.locator(".harvest-choice-stage");
      await expect(stage).toHaveAttribute("data-harvest-choice-authorized", "false");
      await expect(stage).toHaveAttribute("data-harvest-readonly", "true");
      await expect(viewerPage.locator(".harvest-card-select, .harvest-confirm-row")).toHaveCount(0);
    }));

    const committed = await commitNegation(request, seed, 1, negation.id);
    expect(committed.event.card.id).toBe(negation.id);
    expect(committed.event.player).toBe(seed.players[1].name);
    const committedCounter = await commitNegation(request, seed, 2, counterNegation.id);
    expect(committedCounter.event.card.id).toBe(counterNegation.id);
    expect(committedCounter.event.player).toBe(seed.players[2].name);
    const committedNegations = [committed, committedCounter];

    const chooserRoom = await reachAuthorizedHarvestChoice(request, seed);
    const actorIndex = seed.players.findIndex(({ id }) => id === chooserRoom.pendingHarvest.actorId);
    expect(actorIndex, "the server-selected Harvest actor is an authenticated player").toBeGreaterThanOrEqual(0);
    const actorRoom = await roomView(request, seed, actorIndex);
    expect(actorRoom.phase).toBe("response");
    expect(actorRoom.isMyAction).toBe(true);
    expect(actorRoom.pendingHarvest?.actorId).toBe(seed.players[actorIndex].id);
    expect(actorRoom.currentAction?.kind).toBe("harvest");
    expect(actorRoom.currentAction?.actorId).toBe(seed.players[actorIndex].id);
    expect(actorRoom.currentAction?.legalActions).toContain("choose_harvest");
    expect(actorRoom.actionRevision).toMatch(/\S/);
    expect(actorRoom.pendingHarvest.availableIds.some((id) => actorRoom.pendingHarvest.revealed.some((card) => card.id === id))).toBe(true);

    await Promise.all(viewers.map(async ({ viewer, page: viewerPage }) => {
      const stage = viewerPage.locator(".harvest-choice-stage");
      if (viewer.id === seed.players[actorIndex].id) {
        await expect(stage).toHaveAttribute("data-harvest-choice-authorized", "true");
        await expect(stage).toHaveAttribute("data-harvest-choice-action-revision", actorRoom.actionRevision);
        await expect(viewerPage.locator(".harvest-choice-panel--actor")).toBeVisible();
        await expect(viewerPage.locator(".harvest-card-select:not([disabled])").first()).toBeVisible();
        await expect(viewerPage.getByRole("button", { name: "Confirm choice" })).toBeDisabled();
      } else {
        await expect(stage).toHaveAttribute("data-harvest-choice-authorized", "false");
        await expect(stage).toHaveAttribute("data-harvest-readonly", "true");
        await expect(viewerPage.locator(".harvest-card-select, .harvest-confirm-row")).toHaveCount(0);
      }
    }));

    const committedIdentities = committedNegations.map(({ event }) => ({ eventId: event.id, cardId: event.card.id, actor: event.player }));
    const negationInstances = await Promise.all(viewers.map(async ({ viewer, page: viewerPage }) => ({
      viewer: viewer.name,
      ownership: await viewerPage.locator(".play-table").evaluate((table) => ({
        journeyReady: table.getAttribute("data-public-card-journey-ownership-ready"),
        responseHistoryOwnedCount: table.getAttribute("data-public-card-owned-history-count"),
      })),
      instances: await publicCardInstances(viewerPage, committedIdentities),
    })));
    console.info(`NEG-A1 F2 committed Negation ownership: ${JSON.stringify({
      committedNegations: committedIdentities,
      instances: negationInstances,
    })}`);
    for (const viewer of negationInstances) {
      for (const identity of committedIdentities) {
        const visibleInstances = viewer.instances.filter((instance) => instance.visible
          && instance.eventId === identity.eventId && instance.cardId === identity.cardId);
        expect(visibleInstances, `${viewer.viewer} renders ${identity.actor}'s committed Negation once`).toHaveLength(1);
      }
    }
    await testInfo.attach("neg-a1-f2-negation-card-ownership-after-fix", {
      body: JSON.stringify({
        publicEvents: committedIdentities,
        action: chooserRoom.currentAction,
        instances: negationInstances,
      }, null, 2),
      contentType: "application/json",
    });

    const lateSpectator = viewers[3].page;
    await lateSpectator.reload();
    await expect(lateSpectator.locator(".game-shell")).toBeVisible();
    await expect(lateSpectator.locator(`.local-player-dock[data-player-anchor="${viewers[3].viewer.id}"]`)).toBeVisible();
    await expect(lateSpectator.locator(".play-table")).toHaveAttribute("data-public-card-journey-ownership-ready", "true");
    for (const identity of committedIdentities) {
      const instances = (await publicCardInstances(lateSpectator, [identity])).filter((instance) => instance.visible
        && instance.eventId === identity.eventId && instance.cardId === identity.cardId);
      expect(instances, `late-refreshed spectator retains one authentic copy of ${identity.actor}'s Negation`).toHaveLength(1);
    }

    const chooserPage = viewers[actorIndex].page;
    const stage = chooserPage.locator(".harvest-choice-stage");
    const readiness = await chooserPage.evaluate(() => {
      const harvestStage = document.querySelector(".harvest-choice-stage");
      const decision = document.querySelector(".decision-status");
      let busyCauses = null;
      try { busyCauses = JSON.parse(decision?.dataset.consolePresentationBusyCauses ?? "null"); } catch { /* retain null */ }
      return {
        viewport: { width: innerWidth, height: innerHeight },
        choiceAuthorized: harvestStage?.dataset.harvestChoiceAuthorized ?? null,
        actionRevision: harvestStage?.dataset.harvestChoiceActionRevision ?? null,
        actorId: harvestStage?.dataset.harvestActor ?? null,
        readonly: harvestStage?.dataset.harvestReadonly === "true",
        actorPanel: Boolean(harvestStage?.querySelector(".harvest-choice-panel--actor")),
        selectableCardIds: [...(harvestStage?.querySelectorAll(".harvest-card-select:not([disabled])") ?? [])]
          .map((button) => button.parentElement?.getAttribute("data-harvest-card-id") ?? null),
        confirmPresent: Boolean(harvestStage?.querySelector(".harvest-confirm-row button")),
        presentationBusy: decision?.dataset.consolePresentationBusy === "true",
        presentationBusyCauses: busyCauses,
      };
    });
    console.info(`NEG-A1 P0 authorized choice: ${JSON.stringify(readiness)}`);
    await testInfo.attach("neg-a1-authorized-mobile-choice-readiness", {
      body: JSON.stringify({
        committedNegation: { eventId: committed.event.id, cardId: committed.event.card.id, actor: committed.event.player },
        server: {
          meId: actorRoom.meId,
          phase: actorRoom.phase,
          isMyAction: actorRoom.isMyAction,
          actorId: actorRoom.pendingHarvest.actorId,
          currentAction: actorRoom.currentAction,
          actionRevision: actorRoom.actionRevision,
          availableIds: actorRoom.pendingHarvest.availableIds,
          revealedIds: actorRoom.pendingHarvest.revealed.map(({ id }) => id),
        },
        dom: readiness,
      }, null, 2),
      contentType: "application/json",
    });
    await chooserPage.reload();
    await expect(chooserPage.locator(".game-shell")).toBeVisible();
    await expect(stage).toHaveAttribute("data-harvest-choice-authorized", "true");
    await expect(stage.locator(".harvest-card-select:not([disabled])").first()).toBeEnabled();
    await expect(chooserPage.getByRole("button", { name: "Confirm choice" })).toBeDisabled();
    const choiceViewports = [
      { width: 390, height: 700 },
      { width: 390, height: 844 },
      { width: 440, height: 766 },
    ];
    const firstCard = stage.locator(".harvest-card-select:not([disabled])").first();
    const chosenCardId = await firstCard.locator("xpath=..").getAttribute("data-harvest-card-id");
    expect(actorRoom.pendingHarvest.availableIds).toContain(chosenCardId);
    const confirm = chooserPage.getByRole("button", { name: "Confirm choice" });
    for (const viewport of choiceViewports) {
      await chooserPage.setViewportSize(viewport);
      await expect(stage).toHaveAttribute("data-harvest-choice-authorized", "true");
      await expect(firstCard).toBeEnabled();
      await expect(confirm).toBeInViewport();
      await firstCard.tap();
      await expect(stage.locator(`[data-harvest-card-id="${chosenCardId}"]`)).toHaveAttribute("data-harvest-card-state", "selected");
      await expect(confirm).toBeEnabled();
      await firstCard.tap();
      await expect(stage.locator(`[data-harvest-card-id="${chosenCardId}"]`)).toHaveAttribute("data-harvest-card-state", "available");
      await expect(confirm).toBeDisabled();
    }
    await chooserPage.setViewportSize({ width: 390, height: 844 });
    const screenshot = testInfo.outputPath(`neg-a1-harvest-choice-${readiness.viewport.width}x${readiness.viewport.height}.png`);
    await chooserPage.screenshot({ path: screenshot, animations: "disabled" });
    await testInfo.attach("neg-a1-authorized-harvest-choice-phone", { path: screenshot, contentType: "image/png" });

    const chooseRequests = [];
    chooserPage.on("request", (requestEvent) => {
      if (requestEvent.method() !== "POST" || requestEvent.url() !== `${API}/api/rooms`) return;
      try {
        const body = JSON.parse(requestEvent.postData() ?? "{}");
        if (body.action === "choose_harvest") chooseRequests.push(body);
      } catch { /* Ignore non-JSON requests. */ }
    });
    await firstCard.tap();
    await expect(stage.locator(`[data-harvest-card-id="${chosenCardId}"]`)).toHaveAttribute("data-harvest-card-state", "selected");
    await expect(confirm).toBeEnabled();
    const response = chooserPage.waitForResponse((entry) => {
      if (entry.request().method() !== "POST" || entry.url() !== `${API}/api/rooms`) return false;
      try { return JSON.parse(entry.request().postData() ?? "{}").action === "choose_harvest"; }
      catch { return false; }
    });
    await confirm.tap();
    const result = await response;
    expect(result.ok(), await result.text()).toBeTruthy();
    expect(chooseRequests).toHaveLength(1);
    expect(chooseRequests[0].cardId).toBe(chosenCardId);
    const settledActor = await roomView(request, seed, actorIndex);
    expect(settledActor.myHand.map(({ id }) => id)).toContain(chosenCardId);

    const nextChooserRoom = await reachAuthorizedHarvestChoice(request, seed);
    const nextActorIndex = seed.players.findIndex(({ id }) => id === nextChooserRoom.pendingHarvest.actorId);
    expect(nextActorIndex, "the next sequential choice is owned by a different authenticated viewer").toBeGreaterThanOrEqual(0);
    expect(nextActorIndex).not.toBe(actorIndex);
    await Promise.all(viewers.map(async ({ viewer, page: viewerPage }) => {
      const nextStage = viewerPage.locator(".harvest-choice-stage");
      if (viewer.id === seed.players[nextActorIndex].id) {
        await expect(nextStage).toHaveAttribute("data-harvest-choice-authorized", "true");
        await expect(viewerPage.locator(".harvest-card-select:not([disabled])").first()).toBeVisible();
      } else {
        await expect(nextStage).toHaveAttribute("data-harvest-choice-authorized", "false");
        await expect(nextStage).toHaveAttribute("data-harvest-readonly", "true");
        await expect(viewerPage.locator(".harvest-card-select, .harvest-confirm-row")).toHaveCount(0);
      }
    }));

    const switchTarget = seed.players.find((player, index) => index > 0 && index !== nextActorIndex);
    expect(switchTarget, "TEST SWITCH can use a non-chooser seat while the next player selects").toBeTruthy();
    const enabledController = await request.post(`${API}/__test/enable-seeded-controller`, {
      data: { code: seed.code, hostToken: seed.players[0].token, targetPlayerId: switchTarget.id },
    });
    expect(enabledController.ok(), await enabledController.text()).toBeTruthy();
    const switchedPage = viewers[0].page;
    await switchedPage.setViewportSize({ width: 390, height: 844 });
    await switchedPage.reload();
    await expect(switchedPage.locator(".game-shell")).toBeVisible();
    const switchButton = switchedPage.getByRole("button", { name: `Switch to ${switchTarget.name}` });
    await expect(switchButton).toBeVisible();
    await switchButton.tap();
    await expect(switchedPage.locator(`.local-player-dock[data-player-anchor="${switchTarget.id}"]`)).toBeVisible();
    await expect(switchedPage.locator(".play-table")).toHaveAttribute("data-public-card-journey-ownership-ready", "true");
    for (const identity of committedIdentities) {
      const instances = (await publicCardInstances(switchedPage, [identity])).filter((instance) => instance.visible
        && instance.eventId === identity.eventId && instance.cardId === identity.cardId);
      expect(instances, `TEST SWITCH view of ${switchTarget.name} retains one authentic copy of ${identity.actor}'s Negation`).toHaveLength(1);
    }
    const activeChooserStage = viewers[nextActorIndex].page.locator(".harvest-choice-stage");
    await expect(activeChooserStage).toHaveAttribute("data-harvest-choice-authorized", "true");
    await expect(viewers[nextActorIndex].page.locator(".harvest-card-select:not([disabled])").first()).toBeEnabled();
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
