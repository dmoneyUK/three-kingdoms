import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seed(request) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "DUEL INITIATOR", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [card("Duel", "duel-parking-root"), card("Attack", "duel-parking-source-attack", "♥")] },
        { name: "OTHER DUELIST", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [card("Attack", "duel-parking-target-attack", "♣"), card("Attack", "duel-parking-target-attack-2", "♦")] },
        { name: "NEGATION HOLDER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [card("Negation", "duel-parking-private-negation", "♦")] },
        { name: "OBSERVER", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`Duel parking room seed failed: ${await response.text()}`);
  return response.json();
}

async function seedDuelNegationHistory(request, playerCount) {
  const prefix = `duel-negation-history-${playerCount}`;
  const heroes = ["cao-cao", "liu-bei", "sun-quan", "simayi", "xiahou-dun", "zhang-liao", "guo-jia", "huang-gai"];
  const rolesByCount = {
    4: ["Lord", "Loyalist", "Rebel", "Renegade"],
    6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"],
    8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"],
  };
  const roles = rolesByCount[playerCount];
  if (!roles) throw new Error(`Unsupported N2 Duel seat count: ${playerCount}`);
  const targetNegationIds = [`${prefix}-target-negation-1`, `${prefix}-target-negation-3`];
  const sideNegationId = `${prefix}-side-negation-2`;
  const losingNegationId = `${prefix}-private-losing-negation`;
  const players = Array.from({ length: playerCount }, (_, index) => ({
    name: `N2 PLAYER ${index + 1}`,
    role: roles[index],
    hero: heroes[index],
    hp: 4,
    maxHp: 4,
    hand: index === 0
      ? [card("Duel", `${prefix}-root`)]
      : index === 1
        ? targetNegationIds.map((id) => card("Negation", id, "♥"))
        : index === playerCount - 1
          ? [card("Negation", sideNegationId, "♣")]
          : index === 2 ? [card("Negation", losingNegationId, "♠")] : [],
  }));
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players },
  });
  if (!response.ok()) throw new Error(`Duel Negation history room seed failed: ${await response.text()}`);
  return {
    ...(await response.json()),
    prefix,
    targetNegationIds,
    sideNegationId,
    losingNegationId,
  };
}

async function seedGroupTargetNegationHistory(request, cardKind = "RainingArrows", responseKind = "Dodge") {
  const prefix = `group-negation-seat-history-${cardKind.toLowerCase()}`;
  const rootCardId = `${prefix}-root`;
  const sourceNegationId = `${prefix}-source-negation`;
  const targetNegationId = `${prefix}-target-negation`;
  const losingNegationId = `${prefix}-private-losing-negation`;
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "GROUP SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [card(cardKind, rootCardId), card("Negation", sourceNegationId, "♥")] },
        { name: "GROUP TARGET", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [card("Negation", targetNegationId, "♦"), card(responseKind, `${prefix}-${responseKind.toLowerCase()}`)] },
        { name: "GROUP PRIVATE LOSER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [card("Negation", losingNegationId, "♣")] },
        { name: "GROUP FOURTH SEAT", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [card("Dodge", `${prefix}-fourth-dodge`)] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`Group Negation history room seed failed: ${await response.text()}`);
  return { ...(await response.json()), prefix, rootCardId, sourceNegationId, targetNegationId, losingNegationId };
}

async function seedSingleTargetNegationHistory(request) {
  const prefix = "single-target-negation-seat-history";
  const rootCardId = `${prefix}-dismantle-root`;
  const sourceNegationId = `${prefix}-source-negation`;
  const targetNegationIds = [`${prefix}-target-negation-1`, `${prefix}-target-negation-2`];
  const thirdNegationId = `${prefix}-third-negation`;
  const losingNegationId = `${prefix}-private-losing-negation`;
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "SINGLE TARGET SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [card("Dismantle", rootCardId), card("Negation", sourceNegationId, "♥")] },
        { name: "SINGLE TARGET", role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: targetNegationIds.map((id) => card("Negation", id, "♦")) },
        { name: "SINGLE TARGET COUNTER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [card("Negation", thirdNegationId, "♣")] },
        { name: "SINGLE TARGET PRIVATE LOSER", role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [card("Negation", losingNegationId, "♠")] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`Single-target Negation history room seed failed: ${await response.text()}`);
  return { ...(await response.json()), prefix, rootCardId, sourceNegationId, targetNegationIds, thirdNegationId, losingNegationId };
}

async function openPlayer(page, room, index, { trace = false } = {}) {
  const player = room.players[index];
  await page.setViewportSize({ width: 440, height: 894 });
  await page.goto(`${API}/`);
  await page.evaluate(({ code, token, name, traceActive }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    if (traceActive) sessionStorage.setItem("wtk.game-ux-trace.active.v2", "true");
  }, { code: room.code, token: player.token, name: player.name, traceActive: trace });
  await page.reload();
  await expect(page.locator(".game-shell")).toBeVisible();
  return player;
}

async function restoreViewer(page, room, index) {
  const player = room.players[index];
  await page.evaluate(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.reload();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible();
  return player;
}

async function view(request, room, index) {
  const response = await request.get(`${API}/api/rooms?code=${room.code}&token=${room.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function adjustNegationClock(request, room, windowId, mode) {
  const response = await request.post(`${API}/__test/negation-window-clock`, {
    data: { code: room.code, windowId, mode },
  });
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ adjusted: true });
}

async function advanceTimers(request, room, index = 0) {
  const response = await request.post(`${API}/api/rooms`, {
    data: { action: "advance_timers", code: room.code, token: room.players[index].token },
  });
  expect(response.ok()).toBeTruthy();
}

async function submitEarlyNegationWinner(request, room, winnerIndex, cardId) {
  const winner = room.players[winnerIndex];
  const opened = await view(request, room, winnerIndex);
  const windowId = opened.currentAction?.negationWindowId;
  expect(windowId).toBeTruthy();
  await adjustNegationClock(request, room, windowId, "hold");

  const intent = await request.post(`${API}/api/rooms`, {
    data: { action: "respond", code: room.code, token: winner.token, providerId: "negation_card", cardId, context: { windowId } },
  });
  if (!intent.ok()) throw new Error(`Negation intent failed for ${winner.name}: ${intent.status()} ${await intent.text()}`);
  const privateIntentView = await view(request, room, 0);
  expect(privateIntentView.timeline.some((event) => event.card?.id === cardId)).toBe(false);
  expect(JSON.stringify(privateIntentView.timeline)).not.toContain(cardId);

  for (let index = 0; index < room.players.length; index += 1) {
    if (index === winnerIndex) continue;
    const passed = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: room.code, token: room.players[index].token, context: { windowId } },
    });
    expect(passed.ok()).toBeTruthy();
  }

  const settled = await view(request, room, 0);
  const committed = settled.timeline.filter((event) => event.type === "card" && event.card?.id === cardId);
  expect(committed).toHaveLength(1);
  expect(committed[0].player).toBe(winner.name);
  return { windowId, event: committed[0], room: settled };
}

async function screenshot(page, testInfo, name) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, fullPage: true });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

async function geometry(page, eventId) {
  return page.locator(`[data-public-card-journey-event-id="${eventId}"]`).evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      eventId: element.getAttribute("data-public-card-journey-event-id"),
      actorId: element.getAttribute("data-public-card-journey-actor-id"),
      phase: element.getAttribute("data-public-card-journey-phase"),
      side: element.getAttribute("data-public-card-journey-parking-side"),
      viewerId: element.closest("[data-public-card-motion='duel']")?.getAttribute("data-public-card-viewer-id"),
      revealStartedAt: element.getAttribute("data-public-card-journey-reveal-started-at"),
      revealStartedAtMs: Date.parse(element.getAttribute("data-public-card-journey-reveal-started-at") ?? ""),
      actualRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      targetRect: {
        left: Number(element.getAttribute("data-public-card-journey-target-left")),
        top: Number(element.getAttribute("data-public-card-journey-target-top")),
        width: Number(element.getAttribute("data-public-card-journey-target-width")),
        height: Number(element.getAttribute("data-public-card-journey-target-height")),
      },
      layoutChangeReason: element.getAttribute("data-public-card-journey-layout-reason"),
    };
  });
}

async function waitForElapsed(page, eventId, elapsedMs) {
  await page.waitForFunction(({ id, elapsed }) => {
    const cardElement = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((element) => element.getAttribute("data-public-card-journey-event-id") === id);
    const startedAt = Date.parse(cardElement?.getAttribute("data-public-card-journey-reveal-started-at") ?? "");
    return Number.isFinite(startedAt) && Date.now() - startedAt >= elapsed;
  }, { id: eventId, elapsed: elapsedMs });
}

async function captureDuelMove(page, eventId) {
  await page.evaluate((id) => {
    const card = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((element) => element.getAttribute("data-public-card-journey-event-id") === id);
    if (!card) throw new Error(`Missing Duel card before move capture: ${id}`);
    const capture = { startedAt: null, done: false, samples: [] };
    window.__wtkDuelMoveCapture = capture;
    const sample = () => {
      const rect = card.getBoundingClientRect();
      capture.samples.push({
        at: performance.now(),
        phase: card.getAttribute("data-public-card-journey-phase"),
        left: rect.left,
        top: rect.top,
        width: rect.width,
        height: rect.height,
      });
      if (capture.startedAt !== null && performance.now() - capture.startedAt >= 420) {
        capture.done = true;
        observer.disconnect();
        return;
      }
      requestAnimationFrame(sample);
    };
    const observer = new MutationObserver(() => {
      if (capture.startedAt !== null || card.getAttribute("data-public-card-journey-phase") !== "move") return;
      capture.startedAt = performance.now();
      sample();
    });
    observer.observe(card, { attributes: true, attributeFilter: ["data-public-card-journey-phase"] });
  }, eventId);
}

async function playHandAttack(page, room, player, cardId) {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${player.id}"]`);
  const attack = dock.locator(`[data-hand-card-id="${cardId}"] .game-card`);
  await expect(attack).toBeEnabled({ timeout: 15_000 });
  await attack.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm", { timeout: 10_000 });
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && response.request().postDataJSON()?.action === "respond"
    && response.request().postDataJSON()?.providerId === "card");
  await confirm.click();
  const result = await submitted;
  expect(result.ok()).toBeTruthy();
  expect(result.request().postDataJSON()).toMatchObject({ action: "respond", code: room.code, token: player.token, providerId: "card", cardId });
}

test("server-backed Duel cards reveal at full size for four seconds, then park by seat orientation", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const room = await seed(request);
  const target = room.players[1];
  const initiator = room.players[0];
  const rootCardId = "duel-parking-root";
  const targetAttackId = "duel-parking-target-attack";
  const sourceAttackId = "duel-parking-source-attack";
  const context = await browser.newContext({ viewport: { width: 440, height: 894 } });
  const targetPage = await context.newPage();
  const checkpoints = [];
  const pageErrors = [];
  for (const currentPage of [page, targetPage]) {
    currentPage.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
    currentPage.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) pageErrors.push(message.text());
    });
  }

  try {
    await openPlayer(page, room, 3, { trace: true });
    await openPlayer(targetPage, room, 1);
    await page.bringToFront();
    const declaration = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: room.code, token: initiator.token, cardId: rootCardId, targetId: target.id },
    });
    expect(declaration.ok()).toBeTruthy();
    const declaredRoom = (await declaration.json()).room;
    const negationWindowId = declaredRoom.currentAction.negationWindowId;
    expect(negationWindowId).toBeTruthy();
    await adjustNegationClock(request, room, negationWindowId, "hold");

    const opened = await view(request, room, 3);
    const rootEvent = opened.timeline.find((event) => event.card?.id === rootCardId);
    expect(rootEvent).toBeTruthy();
    expect(opened.presentationSnapshot.duelExchange).toBeNull();
    expect(JSON.stringify(opened)).not.toContain("duel-parking-private-negation");
    const root = page.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`);
    await expect(page.locator('[data-public-card-motion="duel"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
    await expect(root).toHaveAttribute("data-public-card-journey-phase", "reveal");
    await expect(root).toHaveAttribute("data-public-card-journey-reveal-started-at", /.+/);
    const revealStart = Date.parse(await root.getAttribute("data-public-card-journey-reveal-started-at"));

    await waitForElapsed(page, rootEvent.id, 500);
    let rootGeometry = await geometry(page, rootEvent.id);
    expect(rootGeometry.phase).toBe("reveal");
    expect(rootGeometry.actualRect.width).toBeCloseTo(90, 0);
    expect(rootGeometry.actualRect.height).toBeCloseTo(135, 0);
    const rootAnnouncement = page.locator(`[data-public-card-announcement="true"][data-public-card-announcement-event-id="${rootEvent.id}"]`);
    await expect(rootAnnouncement).toBeVisible();
    const announcementRect = await rootAnnouncement.boundingBox();
    expect(announcementRect).toBeTruthy();
    expect(announcementRect.y + announcementRect.height).toBeLessThanOrEqual(rootGeometry.actualRect.top - 5);
    checkpoints.push({ checkpoint: "duel-0.5s", elapsedMs: Date.now() - revealStart, ...rootGeometry });
    await screenshot(page, testInfo, "duel-reveal-0.5s-440x894");

    await waitForElapsed(page, rootEvent.id, 2_500);
    rootGeometry = await geometry(page, rootEvent.id);
    expect(rootGeometry.phase).toBe("reveal");
    expect(rootGeometry.actualRect.width).toBeCloseTo(90, 0);
    expect(rootGeometry.actualRect.height).toBeCloseTo(135, 0);
    checkpoints.push({ checkpoint: "duel-2.5s", elapsedMs: Date.now() - revealStart, ...rootGeometry });
    await captureDuelMove(page, rootEvent.id);
    await screenshot(page, testInfo, "duel-reveal-2.5s-440x894");

    await waitForElapsed(page, rootEvent.id, 3_500);
    rootGeometry = await geometry(page, rootEvent.id);
    expect(rootGeometry.phase).toBe("reveal");
    expect(rootGeometry.actualRect.width).toBeCloseTo(90, 0);
    expect(rootGeometry.actualRect.height).toBeCloseTo(135, 0);
    checkpoints.push({ checkpoint: "duel-3.5s-full-size", elapsedMs: Date.now() - revealStart, ...rootGeometry });
    await screenshot(page, testInfo, "duel-reveal-3.5s-440x894");

    const waitingCopy = page.locator(".public-card-display-journey-copy[data-public-card-phase-notice]");
    await expect(waitingCopy).toHaveAttribute("data-public-card-phase-notice", "NEGATION MAY BE PLAYED");
    await expect(waitingCopy).toContainText("Negation can be played");
    const pass = page.getByRole("button", { name: /^(?:Skip|Pass)$/ });
    await expect(pass).toBeEnabled();
    await screenshot(page, testInfo, "duel-negation-waiting-controls-live-440x894");

    await page.waitForFunction(() => window.__wtkDuelMoveCapture?.samples.length >= 3, null, { timeout: 4_000 });
    const moveCapture = await page.evaluate(() => window.__wtkDuelMoveCapture);
    const moveGeometry = { phase: moveCapture.samples[0].phase, actualRect: {
      left: moveCapture.samples[0].left,
      top: moveCapture.samples[0].top,
      width: moveCapture.samples[0].width,
      height: moveCapture.samples[0].height,
    } };
    const moveElapsedMs = Date.now() - revealStart;
    expect(moveElapsedMs).toBeGreaterThanOrEqual(4_000);
    expect(moveGeometry.phase).toBe("move");
    expect(moveGeometry.actualRect.width).toBeGreaterThan(48);
    expect(moveGeometry.actualRect.height).toBeGreaterThan(72);
    await page.waitForFunction(() => window.__wtkDuelMoveCapture?.done === true, null, { timeout: 2_000 });
    const completedMove = await page.evaluate(() => window.__wtkDuelMoveCapture);
    const middleSample = completedMove.samples.find((sample) => sample.at - completedMove.startedAt >= 120 && sample.at - completedMove.startedAt <= 300);
    expect(middleSample).toBeTruthy();
    expect(middleSample.width).toBeGreaterThan(48);
    expect(middleSample.width).toBeLessThan(90);
    await expect(root).toHaveAttribute("data-public-card-journey-phase", "parked");
    checkpoints.push({ checkpoint: "duel-direct-move-start", elapsedMs: Math.round(moveElapsedMs), ...moveGeometry, middleSample, completedMove: completedMove.samples.at(-1) });
    rootGeometry = await geometry(page, rootEvent.id);
    expect(rootGeometry.actualRect.width).toBeCloseTo(48, 0);
    expect(rootGeometry.actualRect.height).toBeCloseTo(72, 0);
    const sourceSeat = page.locator(`.opponent-player-card[data-player-anchor="${initiator.id}"]`);
    const sourceSeatRect = await sourceSeat.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    });
    expect(Math.abs(rootGeometry.actualRect.top - (sourceSeatRect.bottom + 6))).toBeLessThanOrEqual(1);
    const pageState = await page.evaluate(() => ({ scrollY: window.scrollY, scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }));
    expect(pageState.scrollY).toBe(0);
    expect(pageState.scrollWidth).toBeLessThanOrEqual(pageState.viewportWidth);
    const parkedRootRect = rootGeometry.actualRect;
    checkpoints.push({ checkpoint: "duel-parked", ...rootGeometry, sourceSeatRect, pageState });
    await screenshot(page, testInfo, "duel-root-parked-440x894");

    const passResponse = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "decline_response");
    await pass.click();
    expect((await passResponse).ok()).toBeTruthy();
    expect((await view(request, room, 3)).pendingNegation.submitted).toBe(true);
    expect(await page.locator(`[data-public-card-journey-card-id="${rootCardId}"]`).count()).toBe(1);
    expect(await page.locator(`[data-settlement-event-id="${rootEvent.id}"] .played-card`).count()).toBe(0);
    expect(await geometry(page, rootEvent.id)).toMatchObject({ actualRect: parkedRootRect });

    await adjustNegationClock(request, room, negationWindowId, "expire");
    await advanceTimers(request, room);
    await expect.poll(async () => (await view(request, room, 1)).currentAction?.actorId, { timeout: 15_000 }).toBe(target.id);
    await targetPage.bringToFront();
    await targetPage.reload();
    await expect(targetPage.locator(`.local-player-dock[data-player-anchor="${target.id}"]`)).toBeVisible();
    await playHandAttack(targetPage, room, target, targetAttackId);
    const afterTargetAttack = await view(request, room, 3);
    const firstAttackEvent = afterTargetAttack.timeline.find((event) => event.card?.id === targetAttackId);
    expect(firstAttackEvent?.duelAttackResponse).toMatchObject({ semantics: "PROVEN", ordinal: 1, sourceId: target.id });
    await page.bringToFront();
    await expect(page.locator(`[data-public-card-journey-event-id="${firstAttackEvent.id}"]`)).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 10_000 });
    const firstAttack = page.locator(`[data-public-card-journey-event-id="${firstAttackEvent.id}"]`);
    await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
    await waitForElapsed(page, firstAttackEvent.id, 500);
    let attackGeometry = await geometry(page, firstAttackEvent.id);
    expect(attackGeometry.phase).toBe("reveal");
    expect(attackGeometry.actualRect.width).toBeCloseTo(90, 0);
    expect(attackGeometry.actualRect.height).toBeCloseTo(135, 0);
    checkpoints.push({ checkpoint: "attack-1-0.5s", ...attackGeometry });
    await screenshot(page, testInfo, "duel-attack-1-reveal-0.5s-440x894");

    await waitForElapsed(page, firstAttackEvent.id, 2_500);
    attackGeometry = await geometry(page, firstAttackEvent.id);
    expect(attackGeometry.phase).toBe("reveal");
    expect(attackGeometry.actualRect.width).toBeCloseTo(90, 0);
    expect(attackGeometry.actualRect.height).toBeCloseTo(135, 0);
    const rootAfterFirstAttack = await geometry(page, rootEvent.id);
    expect(rootAfterFirstAttack.actualRect).toEqual(parkedRootRect);
    checkpoints.push({ checkpoint: "attack-1-2.5s", ...attackGeometry, rootAfterPolling: rootAfterFirstAttack.actualRect });
    await screenshot(page, testInfo, "duel-attack-1-reveal-2.5s-440x894");

    await waitForElapsed(page, firstAttackEvent.id, 3_500);
    attackGeometry = await geometry(page, firstAttackEvent.id);
    expect(attackGeometry.phase).toBe("reveal");
    expect(attackGeometry.actualRect.width).toBeCloseTo(90, 0);
    expect(attackGeometry.actualRect.height).toBeCloseTo(135, 0);
    checkpoints.push({ checkpoint: "attack-1-3.5s-full-size", ...attackGeometry });
    await screenshot(page, testInfo, "duel-attack-1-reveal-3.5s-440x894");

    await expect(firstAttack).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 6_000 });
    attackGeometry = await geometry(page, firstAttackEvent.id);
    const targetSeat = page.locator(`.opponent-player-card[data-player-anchor="${target.id}"]`);
    const targetSeatRect = await targetSeat.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, bottom: rect.bottom, width: rect.width, height: rect.height };
    });
    expect(Math.abs(attackGeometry.actualRect.top - (targetSeatRect.bottom + 6))).toBeLessThanOrEqual(1);
    expect(await page.locator(".public-card-journey-card").count()).toBe(2);
    checkpoints.push({ checkpoint: "attack-1-parked", ...attackGeometry, targetSeatRect, rootAfterPolling: rootAfterFirstAttack.actualRect });
    await screenshot(page, testInfo, "duel-attack-1-parked-440x894");

    const switchToInitiator = await restoreViewer(page, room, 0);
    const restoredCards = await page.locator(".public-card-journey-card").evaluateAll((elements) => elements.map((element) => ({
      eventId: element.getAttribute("data-public-card-journey-event-id"),
      phase: element.getAttribute("data-public-card-journey-phase"),
    })));
    expect(restoredCards.every((cardEntry) => cardEntry.phase === "parked")).toBe(true);
    const localDock = page.locator(`.local-player-dock[data-player-anchor="${switchToInitiator.id}"]`);
    const localDockRect = await localDock.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
    });
    const rootOnInitiator = await geometry(page, rootEvent.id);
    expect(Math.abs(rootOnInitiator.actualRect.left - (localDockRect.left + 8))).toBeLessThanOrEqual(8);
    expect(Math.abs(rootOnInitiator.actualRect.top - (localDockRect.top - 72 - 6))).toBeLessThanOrEqual(6);
    checkpoints.push({ checkpoint: "switch-to-initiator", viewerId: switchToInitiator.id, localDockRect, root: rootOnInitiator, restoredCards });
    await screenshot(page, testInfo, "duel-switch-to-initiator-440x894");

    const sourceCurrentAction = await view(request, room, 0);
    expect(sourceCurrentAction.currentAction).toMatchObject({ actorId: initiator.id, requirement: "attack" });
    await playHandAttack(page, room, initiator, sourceAttackId);
    const afterSourceAttack = await view(request, room, 1);
    const secondAttackEvent = afterSourceAttack.timeline.find((event) => event.card?.id === sourceAttackId);
    expect(secondAttackEvent?.duelAttackResponse).toMatchObject({ semantics: "PROVEN", ordinal: 2, sourceId: initiator.id });
    const rootBeforeSecondResponse = await geometry(page, rootEvent.id);
    await expect(page.locator(`[data-public-card-journey-event-id="${secondAttackEvent.id}"]`)).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 10_000 });
    await expect(page.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`)).toHaveAttribute("data-public-card-journey-phase", "parked");
    const rootAfterSecondResponse = await geometry(page, rootEvent.id);
    expect(rootAfterSecondResponse.actualRect).toEqual(rootBeforeSecondResponse.actualRect);
    const secondResponse = page.locator(`[data-public-card-journey-event-id="${secondAttackEvent.id}"]`);
    await expect(secondResponse).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 5_000 });
    const secondAttackGeometry = await geometry(page, secondAttackEvent.id);
    expect(secondAttackGeometry.actualRect.left).toBeGreaterThan(rootAfterSecondResponse.actualRect.left);
    expect(Math.abs(secondAttackGeometry.actualRect.top - rootAfterSecondResponse.actualRect.top)).toBeLessThanOrEqual(2);
    checkpoints.push({ checkpoint: "second-attack-committed", viewerId: initiator.id, root: rootAfterSecondResponse, response: secondAttackGeometry });
    await screenshot(page, testInfo, "duel-second-attack-owner-parking-440x894");

    const switchToOtherDuelist = await restoreViewer(page, room, 1);
    const otherViewCards = await page.locator(".public-card-journey-card").evaluateAll((elements) => elements.map((element) => ({
      eventId: element.getAttribute("data-public-card-journey-event-id"),
      phase: element.getAttribute("data-public-card-journey-phase"),
    })));
    expect(otherViewCards).toHaveLength(3);
    expect(otherViewCards.every((cardEntry) => cardEntry.phase === "parked")).toBe(true);
    const rootOnOtherDuelist = await geometry(page, rootEvent.id);
    const sourceSeatOnOther = page.locator(`.opponent-player-card[data-player-anchor="${initiator.id}"]`);
    const sourceSeatOnOtherRect = await sourceSeatOnOther.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, bottom: rect.bottom };
    });
    expect(Math.abs(rootOnOtherDuelist.actualRect.top - (sourceSeatOnOtherRect.bottom + 6))).toBeLessThanOrEqual(1);
    const otherDockRect = await page.locator(`.local-player-dock[data-player-anchor="${switchToOtherDuelist.id}"]`).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    });
    const firstAttackOnOther = await geometry(page, firstAttackEvent.id);
    expect(Math.abs(firstAttackOnOther.actualRect.left - (otherDockRect.left + 8))).toBeLessThanOrEqual(8);
    expect(Math.abs(firstAttackOnOther.actualRect.top - (otherDockRect.top - 78))).toBeLessThanOrEqual(6);
    expect((await view(request, room, 1)).currentAction).toMatchObject({ actorId: target.id, requirement: "attack" });
    const finalPageState = await page.evaluate(() => ({ scrollY: window.scrollY, scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }));
    expect(finalPageState.scrollY).toBe(0);
    expect(finalPageState.scrollWidth).toBeLessThanOrEqual(finalPageState.viewportWidth);
    checkpoints.push({ checkpoint: "switch-to-other-duelist", viewerId: switchToOtherDuelist.id, root: rootOnOtherDuelist, firstAttack: firstAttackOnOther, cards: otherViewCards, page: finalPageState });
    await screenshot(page, testInfo, "duel-switch-to-other-duelist-440x894");

    const targetSecondCardId = "duel-parking-target-attack-2";
    await playHandAttack(page, room, target, targetSecondCardId);
    const afterTargetSecondAttack = await view(request, room, 3);
    const thirdAttackEvent = afterTargetSecondAttack.timeline.find((event) => event.card?.id === targetSecondCardId);
    expect(thirdAttackEvent?.duelAttackResponse).toMatchObject({ semantics: "PROVEN", ordinal: 3, sourceId: target.id });
    const thirdAttack = page.locator(`[data-public-card-journey-event-id="${thirdAttackEvent.id}"]`);
    await expect(thirdAttack).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 10_000 });
    const secondTargetOnDock = await geometry(page, thirdAttackEvent.id);
    expect(secondTargetOnDock.actualRect.left).toBeGreaterThan(firstAttackOnOther.actualRect.left);
    expect(Math.abs(secondTargetOnDock.actualRect.top - firstAttackOnOther.actualRect.top)).toBeLessThanOrEqual(2);
    checkpoints.push({ checkpoint: "second-target-card-on-local-dock", first: firstAttackOnOther, second: secondTargetOnDock });

    await restoreViewer(page, room, 3);
    const firstTargetOnTopSeat = await geometry(page, firstAttackEvent.id);
    const secondTargetOnTopSeat = await geometry(page, thirdAttackEvent.id);
    expect(firstTargetOnTopSeat.side).toBe("top");
    expect(secondTargetOnTopSeat.side).toBe("top");
    expect(Math.abs(secondTargetOnTopSeat.actualRect.left - firstTargetOnTopSeat.actualRect.left)).toBeLessThanOrEqual(1);
    expect(secondTargetOnTopSeat.actualRect.top - firstTargetOnTopSeat.actualRect.top).toBeGreaterThanOrEqual(78);
    const targetSeatOnObserver = page.locator(`.opponent-player-card[data-player-anchor="${target.id}"]`);
    const targetSeatOnObserverRect = await targetSeatOnObserver.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, bottom: rect.bottom, width: rect.width };
    });
    expect(Math.abs(firstTargetOnTopSeat.actualRect.left - (targetSeatOnObserverRect.left + (targetSeatOnObserverRect.width - 48) / 2))).toBeLessThanOrEqual(1);
    expect(Math.abs(firstTargetOnTopSeat.actualRect.top - (targetSeatOnObserverRect.bottom + 6))).toBeLessThanOrEqual(1);
    checkpoints.push({ checkpoint: "top-seat-vertical-history-after-view-switch", first: firstTargetOnTopSeat, second: secondTargetOnTopSeat, targetSeat: targetSeatOnObserverRect });
    await screenshot(page, testInfo, "duel-top-seat-vertical-history-440x894");

    expect(pageErrors).toEqual([]);
    const traceDocument = await page.evaluate(() => sessionStorage.getItem("wtk.game-ux-trace.document.v2"));
    expect(traceDocument).toBeTruthy();
    const duelTrace = JSON.parse(traceDocument).entries.filter((entry) => entry.stage === "public-card-journey");
    expect(duelTrace.some((entry) => entry.data.eventId === rootEvent.id && entry.data.visualPhase === "REVEAL")).toBe(true);
    expect(duelTrace.some((entry) => entry.data.eventId === rootEvent.id && entry.data.visualPhase === "PARKED")).toBe(true);
    expect(duelTrace.some((entry) => entry.data.eventId === rootEvent.id && entry.data.publicActorId === initiator.id)).toBe(true);
    expect(JSON.stringify(duelTrace)).not.toContain("duel-parking-private-negation");
    const geometryPath = testInfo.outputPath("duel-card-geometry-checkpoints.json");
    await writeFile(geometryPath, JSON.stringify(checkpoints, null, 2));
    await testInfo.attach("duel-card-geometry-checkpoints.json", {
      path: geometryPath,
      contentType: "application/json",
    });
  } finally {
    await context.close();
  }
});

test("server-proven Duel Negation counters retain their ordered author-seat history at 4, 6, and 8 seats", async ({ page, request }, testInfo) => {
  test.setTimeout(180_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) pageErrors.push(message.text());
  });

  for (const playerCount of [4, 6, 8]) {
    const room = await seedDuelNegationHistory(request, playerCount);
    const source = room.players[0];
    const target = room.players[1];
    const duelId = `${room.prefix}-root`;
    const winnerPlans = [
      { playerIndex: 1, cardId: room.targetNegationIds[0] },
      { playerIndex: playerCount - 1, cardId: room.sideNegationId },
      { playerIndex: 1, cardId: room.targetNegationIds[1] },
    ];

    await openPlayer(page, room, 0);
    const declaration = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: room.code, token: source.token, cardId: duelId, targetId: target.id },
    });
    expect(declaration.ok()).toBeTruthy();
    const declared = (await declaration.json()).room;
    expect(declared.currentAction.negationWindowId).toBeTruthy();
    await adjustNegationClock(request, room, declared.currentAction.negationWindowId, "hold");

    const publicAfterDeclaration = await view(request, room, 0);
    const rootEvent = publicAfterDeclaration.timeline.find((event) => event.type === "card" && event.card?.id === duelId);
    expect(rootEvent).toBeTruthy();
    const rootCard = page.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`);
    await expect(page.locator('[data-public-card-motion="duel"]')).toBeVisible({ timeout: 20_000 });
    await expect(rootCard).toBeVisible();
    await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);

    const committedHistory = [{ event: rootEvent, actor: source, cardId: duelId }];
    for (let index = 0; index < winnerPlans.length; index += 1) {
      const winnerPlan = winnerPlans[index];
      const winner = room.players[winnerPlan.playerIndex];
      const result = await submitEarlyNegationWinner(request, room, winnerPlan.playerIndex, winnerPlan.cardId);
      committedHistory.push({ event: result.event, actor: winner, cardId: winnerPlan.cardId });

      const currentCard = page.locator(`[data-public-card-journey-event-id="${result.event.id}"]`);
      await expect(currentCard).toBeVisible({ timeout: 20_000 });
      await expect(currentCard).toHaveAttribute("data-public-card-journey-actor-id", winner.id);
      await expect(currentCard).toHaveAttribute("data-public-card-journey-card-id", winnerPlan.cardId);
      await expect(currentCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
      await expect(page.locator(`[data-public-card-journey-card-id="${room.losingNegationId}"]`)).toHaveCount(0);

      const visibleHistory = page.locator('[data-public-card-motion="duel"] .public-card-journey-card');
      await expect(visibleHistory).toHaveCount(committedHistory.length);
      const earlyCheckpoint = index === 0;
      const lateCheckpoint = index === winnerPlans.length - 1;
      if (earlyCheckpoint) {
        await waitForElapsed(page, result.event.id, 500);
        await screenshot(page, testInfo, `duel-negation-${playerCount}-seats-first-counter-0.5s`);
      }
      if (lateCheckpoint) {
        await waitForElapsed(page, result.event.id, 3_500);
        await expect(currentCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
        await screenshot(page, testInfo, `duel-negation-${playerCount}-seats-counter-counter-3.5s`);
      }
      await waitForElapsed(page, result.event.id, 4_000);
      await expect(currentCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 3_000 });

      const rendered = await visibleHistory.evaluateAll((elements) => elements.map((element) => ({
        eventId: element.getAttribute("data-public-card-journey-event-id"),
        actorId: element.getAttribute("data-public-card-journey-actor-id"),
        cardId: element.getAttribute("data-public-card-journey-card-id"),
        ordinal: Number(element.getAttribute("data-public-card-journey-ordinal")),
        phase: element.getAttribute("data-public-card-journey-phase"),
        side: element.getAttribute("data-public-card-journey-parking-side"),
      })));
      expect(rendered.map(({ eventId }) => eventId)).toEqual(committedHistory.map(({ event }) => event.id));
      expect(rendered.map(({ actorId }) => actorId)).toEqual(committedHistory.map(({ actor }) => actor.id));
      expect(rendered.map(({ cardId }) => cardId)).toEqual(committedHistory.map(({ cardId }) => cardId));
      expect(rendered.map(({ ordinal }) => ordinal)).toEqual(committedHistory.map((_, eventIndex) => eventIndex + 1));
      expect(rendered.every(({ phase }) => phase === "parked")).toBe(true);
      const accessibleHistory = await page.locator('[data-public-card-motion="duel"] .duel-public-card-history-accessible li').allTextContents();
      expect(accessibleHistory).toHaveLength(committedHistory.length);
      expect(accessibleHistory[accessibleHistory.length - 1]).toContain(winner.name);

      if (playerCount >= 5 && winnerPlan.playerIndex !== 0) {
        const seat = page.locator(`.opponent-player-card[data-player-anchor="${winner.id}"]`);
        const seatSide = await seat.getAttribute("data-side-column");
        const responseHistory = rendered.at(-1);
        expect(seatSide).toBeTruthy();
        expect(responseHistory.side).toBe(seatSide);
      }

      if (index === 1) {
        await restoreViewer(page, room, 0);
        const restored = await page.locator('[data-public-card-motion="duel"] .public-card-journey-card').evaluateAll((elements) => elements.map((element) => ({
          eventId: element.getAttribute("data-public-card-journey-event-id"),
          actorId: element.getAttribute("data-public-card-journey-actor-id"),
          phase: element.getAttribute("data-public-card-journey-phase"),
        })));
        expect(restored.map(({ eventId }) => eventId)).toEqual(committedHistory.map(({ event }) => event.id));
        expect(restored.map(({ actorId }) => actorId)).toEqual(committedHistory.map(({ actor }) => actor.id));
        expect(restored.every(({ phase }) => phase === "parked")).toBe(true);
        await screenshot(page, testInfo, `duel-negation-${playerCount}-seats-refresh-restores-history`);
      }
    }

    const localDock = page.locator(`.local-player-dock[data-player-anchor="${source.id}"]`);
    const localDockRect = await localDock.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    });
    const rootGeometry = await geometry(page, rootEvent.id);
    const firstTargetCounter = await geometry(page, committedHistory[1].event.id);
    const finalTargetCounter = await geometry(page, committedHistory.at(-1).event.id);
    expect(rootGeometry.side).toBe("local");
    expect(Math.abs(rootGeometry.targetRect.left - (localDockRect.left + 8))).toBeLessThanOrEqual(1);
    expect(Math.abs(rootGeometry.targetRect.top - (localDockRect.top - 78))).toBeLessThanOrEqual(1);
    expect(finalTargetCounter.side).toBe(firstTargetCounter.side);
    if (firstTargetCounter.side === "top") {
      expect(finalTargetCounter.targetRect.left).toBe(firstTargetCounter.targetRect.left);
      expect(finalTargetCounter.targetRect.top).toBe(firstTargetCounter.targetRect.top + 78);
    } else {
      const horizontalDirection = firstTargetCounter.side === "left" ? 1 : -1;
      expect(finalTargetCounter.targetRect.left).toBe(firstTargetCounter.targetRect.left + horizontalDirection * 54);
      expect(finalTargetCounter.targetRect.top).toBe(firstTargetCounter.targetRect.top);
    }
    const pageGeometry = await page.evaluate(() => ({ scrollX: window.scrollX, scrollWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth }));
    expect(pageGeometry.scrollX).toBe(0);
    expect(pageGeometry.scrollWidth).toBeLessThanOrEqual(pageGeometry.viewportWidth);

    const finalWindow = (await view(request, room, 0)).currentAction.negationWindowId;
    expect(finalWindow).toBeTruthy();
    await adjustNegationClock(request, room, finalWindow, "hold");
    for (const player of room.players) {
      const passed = await request.post(`${API}/api/rooms`, {
        data: { action: "decline_response", code: room.code, token: player.token, context: { windowId: finalWindow } },
      });
      expect(passed.ok()).toBeTruthy();
    }
    const retired = await view(request, room, 0);
    expect(retired.pendingNegation).toBeNull();
    expect(retired.pendingDuel).toBeNull();
    expect(retired.timeline.some((event) => event.type === "card" && event.card?.id === room.losingNegationId)).toBe(false);
    await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  }
});

for (const { cardKind, responseKind } of [
  { cardKind: "BarbarianInvasion", responseKind: "Attack" },
  { cardKind: "RainingArrows", responseKind: "Dodge" },
]) {
  test(`server-proven ${cardKind} Negation counters retain physical cards at their authors' seats`, async ({ page, request }, testInfo) => {
    test.setTimeout(120_000);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) pageErrors.push(message.text());
    });

    const room = await seedGroupTargetNegationHistory(request, cardKind, responseKind);
    await openPlayer(page, room, 0, { trace: true });
    const started = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: room.rootCardId },
    });
    expect(started.ok()).toBeTruthy();
    const firstState = (await view(request, room, 0));
    const firstWindowId = firstState.currentAction?.negationWindowId;
    expect(firstWindowId).toBeTruthy();
    expect(firstState.presentationSnapshot?.reactionChain?.groupTargetEffectScope?.targetId).toBeTruthy();

    await submitEarlyNegationWinner(request, room, 0, room.sourceNegationId);
    await submitEarlyNegationWinner(request, room, 1, room.targetNegationId);

    const publicState = await view(request, room, 0);
    expect(publicState.currentAction?.negationWindowId).toBeTruthy();
    await adjustNegationClock(request, room, publicState.currentAction.negationWindowId, "hold");
    const rootEvent = publicState.timeline.find((event) => event.type === "card" && event.card?.id === room.rootCardId);
    const sourceCounter = publicState.timeline.find((event) => event.type === "card" && event.card?.id === room.sourceNegationId);
    const targetCounter = publicState.timeline.find((event) => event.type === "card" && event.card?.id === room.targetNegationId);
    expect(rootEvent).toBeTruthy();
    expect(sourceCounter).toBeTruthy();
    expect(targetCounter).toBeTruthy();
    expect(publicState.presentationSnapshot?.groupParticipantProgress?.rootCardProof).toMatchObject({
      semantics: "PROVEN",
      relation: "GROUP_ROOT_CARD",
      rootEventId: rootEvent.id,
      rootEventResolutionId: rootEvent.resolutionId,
      rootCardId: room.rootCardId,
      sourceId: room.players[0].id,
      cardKind,
      targetIds: room.players.slice(1).map(({ id }) => id),
    });
    expect(publicState.presentationSnapshot?.reactionChain?.nodes.map((node) => node.actorId)).toEqual([room.players[0].id, room.players[1].id]);
    expect(publicState.presentationSnapshot?.reactionChain?.publicNodeEventLinks?.map((link) => link.eventId)).toEqual([sourceCounter.id, targetCounter.id]);
    expect(publicState.timeline.some((event) => event.card?.id === room.losingNegationId)).toBe(false);

    await page.reload();
    await expect(page.locator(`.local-player-dock[data-player-anchor="${room.players[0].id}"]`)).toBeVisible();
    await page.waitForTimeout(1_700);
    const diagnosticTrace = await page.evaluate(({ rootEventId, rootCardId, authorId }) => {
      const raw = sessionStorage.getItem("wtk.game-ux-trace.document.v2");
      if (!raw) return null;
      const trace = JSON.parse(raw);
      const sample = [...trace.entries].reverse().find((entry) => entry.stage === "presentation-dom"
        && entry.data.publicRootIdentity?.serverProof?.rootEventId === rootEventId
        && entry.data.publicRootIdentity?.serverProof?.rootCardId === rootCardId
        && entry.data.publicRootIdentity?.serverProof?.sourceId === authorId);
      if (!sample) return null;
      const identity = sample.data.publicRootIdentity;
      return {
        buildSha: trace.environment.buildSha,
        sessionId: sample.sessionId ?? null,
        elapsedMs: sample.elapsedMs,
        semanticStage: identity.serverInteraction?.stage ?? null,
        serverProof: identity.serverProof,
        clientProjection: identity.clientProjection,
        selectedPresenter: identity.selectedPresenter,
        comparison: identity.comparison,
        sameRootCounts: sample.data.sameRootCounts,
        sameRootInstances: (sample.data.sameRootInstances ?? []).map((instance) => ({
          eventId: instance.eventId,
          publicCardId: instance.publicCardId,
          publicActorId: instance.publicActorId,
          rendererKind: instance.rendererKind,
          motionType: instance.motionType,
          visualPhase: instance.visualPhase,
          sizeClass: instance.sizeClass,
          actualCardRect: instance.actualCardRect,
          targetParkingRect: instance.targetParkingRect,
        })),
      };
    }, { rootEventId: rootEvent.id, rootCardId: room.rootCardId, authorId: room.players[0].id });
    expect(diagnosticTrace).toBeTruthy();
    expect(diagnosticTrace.semanticStage).toBe("NEGATION");
    expect(diagnosticTrace.serverProof).toMatchObject({
      interactionId: publicState.presentationSnapshot.identity.interactionId,
      rootFrameId: publicState.presentationSnapshot.interaction.rootFrameId,
      rootEventId: rootEvent.id,
      rootCardId: room.rootCardId,
      sourceId: room.players[0].id,
      semantics: "PROVEN",
    });
    expect(diagnosticTrace.clientProjection).toMatchObject({
      interactionId: diagnosticTrace.serverProof.interactionId,
      rootFrameId: diagnosticTrace.serverProof.rootFrameId,
      rootEventId: rootEvent.id,
      rootCardId: room.rootCardId,
      sourceId: room.players[0].id,
      semantics: "PROVEN",
    });
    expect(diagnosticTrace.selectedPresenter).toMatchObject({
      interactionId: diagnosticTrace.serverProof.interactionId,
      rootFrameId: diagnosticTrace.serverProof.rootFrameId,
      rootEventId: rootEvent.id,
      physicalCardId: room.rootCardId,
      actualAuthorId: room.players[0].id,
      rendererKind: "single-target-journey",
      motionType: "group-root",
    });
    expect(diagnosticTrace.comparison.presenterMatchesServer).toMatchObject({
      interactionId: true,
      rootFrameId: true,
      checkpointId: true,
      presentationRevision: true,
      rootEventId: true,
      physicalCardId: true,
      actualAuthorId: true,
    });
    expect(diagnosticTrace.sameRootCounts).toMatchObject({ total: 1, fullSizeCount: 0, parkedThumbnailCount: 1 });
    expect(diagnosticTrace.sameRootInstances).toEqual([expect.objectContaining({
      eventId: rootEvent.id,
      publicCardId: room.rootCardId,
      publicActorId: room.players[0].id,
      rendererKind: "single-target-journey",
      motionType: "group-root",
      visualPhase: "parked",
      sizeClass: "PARKED",
    })]);
    await testInfo.attach("group-root-presentation-diagnostic.json", {
      body: JSON.stringify(diagnosticTrace, null, 2),
      contentType: "application/json",
    });

    const display = page.locator('[data-public-card-motion="group-root"]');
    await expect(display).toBeVisible({ timeout: 20_000 });
    await expect(display).toHaveAttribute("data-public-card-renderer-kind", "single-target-journey");
    const announcement = display.locator('[data-public-card-announcement="true"]');
    await expect(announcement).toHaveCount(1);
    await expect(announcement.locator("small,span,strong")).toHaveCount(0);
    await expect(display.locator('[data-public-card-journey-event-id]')).toHaveCount(3);
    for (const [event, player, cardId, ordinal] of [
      [rootEvent, room.players[0], room.rootCardId, "1"],
      [sourceCounter, room.players[0], room.sourceNegationId, "2"],
      [targetCounter, room.players[1], room.targetNegationId, "3"],
    ]) {
      const cardElement = display.locator(`[data-public-card-journey-event-id="${event.id}"]`);
      await expect(cardElement).toHaveAttribute("data-public-card-journey-actor-id", player.id);
      await expect(cardElement).toHaveAttribute("data-public-card-journey-card-id", cardId);
      await expect(cardElement).toHaveAttribute("data-public-card-journey-ordinal", ordinal);
      await expect(cardElement).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 });
    }
    await expect(display.locator('[data-public-card-journey-card-id="' + room.losingNegationId + '"]')).toHaveCount(0);
    await expect(display.locator('[aria-label="Chronological public card history"] li')).toHaveCount(3);
    const seatGeometry = await page.evaluate(({ actorIds, eventIds }) => eventIds.map((eventId, index) => {
      const card = document.querySelector(`[data-public-card-journey-event-id="${eventId}"]`);
      const seat = [...document.querySelectorAll("[data-player-anchor]")].find((element) => element.dataset.playerAnchor === actorIds[index]);
      const cardRect = card?.getBoundingClientRect();
      const seatRect = seat?.getBoundingClientRect();
      return { actorId: actorIds[index], card: cardRect && { x: cardRect.x, y: cardRect.y, width: cardRect.width, height: cardRect.height }, seat: seatRect && { x: seatRect.x, y: seatRect.y, width: seatRect.width, height: seatRect.height } };
    }), { actorIds: [room.players[0].id, room.players[0].id, room.players[1].id], eventIds: [rootEvent.id, sourceCounter.id, targetCounter.id] });
    expect(seatGeometry.every(({ card, seat }) => card && seat)).toBe(true);
    expect(seatGeometry[0].card.x).toBeGreaterThanOrEqual(seatGeometry[0].seat.x);
    expect(seatGeometry[1].card.x).toBeGreaterThanOrEqual(seatGeometry[1].seat.x);
    expect(seatGeometry[2].card.y).toBeGreaterThanOrEqual(seatGeometry[2].seat.y + seatGeometry[2].seat.height);
    expect(seatGeometry[2].card.y).toBeLessThanOrEqual(seatGeometry[2].seat.y + seatGeometry[2].seat.height + 8);
    expect(seatGeometry[2].card.x).toBeGreaterThanOrEqual(seatGeometry[2].seat.x);
    expect(seatGeometry[2].card.x + seatGeometry[2].card.width).toBeLessThanOrEqual(seatGeometry[2].seat.x + seatGeometry[2].seat.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(440);
    await screenshot(page, testInfo, "group-target-negation-history-at-current-counter-window");

    const restoredDisplay = page.locator('[data-public-card-motion="group-root"]');
    await expect(restoredDisplay.locator('[data-public-card-journey-event-id]')).toHaveCount(3);
    await expect(restoredDisplay.locator(`[data-public-card-journey-event-id="${targetCounter.id}"]`)).toHaveAttribute("data-public-card-journey-phase", "parked");
    await expect(restoredDisplay).not.toContainText(room.losingNegationId);
    await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);

    // These physical Negations are admitted by the proof assertions above. The
    // root Journey must keep them when the current target leaves NEGATION and
    // the Group interaction advances to its ordinary response.
    for (const player of room.players) {
      const passed = await request.post(`${API}/api/rooms`, {
        data: { action: "decline_response", code: room.code, token: player.token, context: { windowId: publicState.currentAction.negationWindowId } },
      });
      expect(passed.ok()).toBeTruthy();
    }
    await expect.poll(async () => (await view(request, room, 1)).currentAction?.requirement ?? null, { timeout: 15_000 }).toBe(responseKind.toLowerCase());
    const groupResponse = await view(request, room, 1);
    expect(groupResponse.presentationSnapshot?.groupParticipantProgress?.currentParticipantId).toBe(room.players[1].id);
    const groupResponseResult = await request.post(`${API}/api/rooms`, {
      data: { action: "respond", code: room.code, token: room.players[1].token, providerId: "card", cardId: `${room.prefix}-${responseKind.toLowerCase()}` },
    });
    expect(groupResponseResult.ok()).toBeTruthy();
    await expect.poll(async () => (await view(request, room, 0)).presentationSnapshot?.groupParticipantProgress?.currentParticipantId ?? null,
      { timeout: 15_000 }).toBe(room.players[2].id);
    await expect(restoredDisplay).toBeVisible();
    await expect(restoredDisplay).toHaveAttribute("data-public-card-motion", "group-root");
    for (const event of [rootEvent, sourceCounter, targetCounter]) {
      await expect(restoredDisplay.locator(`[data-public-card-journey-event-id="${event.id}"]`)).toHaveAttribute("data-public-card-journey-phase", "parked");
    }
    await expect(page.locator(`[data-public-card-renderer-kind="static-fallback"][data-public-card-root-event-id="${rootEvent.id}"]`)).toHaveCount(0);
    expect(pageErrors).toEqual([]);
  });
}

test("server-proven single-target Negation and counter history survives refresh without exposing losing cards", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) pageErrors.push(message.text());
  });

  const room = await seedSingleTargetNegationHistory(request);
  const source = room.players[0];
  const target = room.players[1];
  const third = room.players[2];
  await openPlayer(page, room, 0);
  const started = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: room.code, token: source.token, cardId: room.rootCardId, targetId: target.id },
  });
  expect(started.ok()).toBeTruthy();
  const declared = await view(request, room, 0);
  expect(declared.currentAction?.negationWindowId).toBeTruthy();
  const rootEvent = declared.timeline.find((event) => event.type === "card" && event.card?.id === room.rootCardId);
  expect(rootEvent).toBeTruthy();
  const display = page.locator('[data-public-card-motion="single-target"]');
  await expect(display).toBeVisible({ timeout: 20_000 });
  await expect(display.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`)).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 });

  const committedHistory = [{ event: rootEvent, actor: source, cardId: room.rootCardId }];
  const winnerPlans = [
    { playerIndex: 2, cardId: room.thirdNegationId },
    { playerIndex: 0, cardId: room.sourceNegationId },
    { playerIndex: 1, cardId: room.targetNegationIds[0] },
  ];
  for (let index = 0; index < winnerPlans.length; index += 1) {
    const plan = winnerPlans[index];
    const actor = room.players[plan.playerIndex];
    const result = await submitEarlyNegationWinner(request, room, plan.playerIndex, plan.cardId);
    committedHistory.push({ event: result.event, actor, cardId: plan.cardId });
    const currentCard = display.locator(`[data-public-card-journey-event-id="${result.event.id}"]`);
    await expect(currentCard).toBeVisible({ timeout: 20_000 });
    await expect(currentCard).toHaveAttribute("data-public-card-journey-actor-id", actor.id);
    await expect(currentCard).toHaveAttribute("data-public-card-journey-card-id", plan.cardId);
    await expect(currentCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
    await expect(display.locator(".public-card-journey-card")).toHaveCount(committedHistory.length);
    if (index === 0) {
      await waitForElapsed(page, result.event.id, 500);
      await screenshot(page, testInfo, "single-target-negation-history-first-counter-0.5s");
    }
    if (index === winnerPlans.length - 1) {
      await waitForElapsed(page, result.event.id, 3_500);
      await expect(currentCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
      await screenshot(page, testInfo, "single-target-negation-history-counter-counter-3.5s");
    }
    await expect(currentCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 15_000 });
    const rendered = await display.locator(".public-card-journey-card").evaluateAll((elements) => elements.map((element) => ({
      eventId: element.getAttribute("data-public-card-journey-event-id"),
      actorId: element.getAttribute("data-public-card-journey-actor-id"),
      cardId: element.getAttribute("data-public-card-journey-card-id"),
      ordinal: Number(element.getAttribute("data-public-card-journey-ordinal")),
      phase: element.getAttribute("data-public-card-journey-phase"),
    })));
    expect(rendered.map(({ eventId }) => eventId)).toEqual(committedHistory.map(({ event }) => event.id));
    expect(rendered.map(({ actorId }) => actorId)).toEqual(committedHistory.map(({ actor }) => actor.id));
    expect(rendered.map(({ cardId }) => cardId)).toEqual(committedHistory.map(({ cardId }) => cardId));
    expect(rendered.map(({ ordinal }) => ordinal)).toEqual(committedHistory.map((_, eventIndex) => eventIndex + 1));
    expect(rendered.every(({ phase }) => phase === "parked")).toBe(true);
    expect(await display.locator('[aria-label="Chronological public card history"] li').allTextContents()).toHaveLength(committedHistory.length);
  }

  const publicState = await view(request, room, 0);
  const provenChain = publicState.presentationSnapshot?.reactionChain;
  expect(provenChain?.semantics).toBe("PROVEN");
  expect(provenChain?.publicEventLinks?.nodes?.map(({ eventId }) => eventId)).toEqual(committedHistory.slice(1).map(({ event }) => event.id));
  expect(provenChain?.nodes?.map(({ actorId }) => actorId)).toEqual([third.id, source.id, target.id]);
  expect(publicState.timeline.some((event) => event.card?.id === room.losingNegationId)).toBe(false);
  expect(JSON.stringify(publicState.presentationSnapshot)).not.toContain(room.losingNegationId);
  await page.reload();
  await expect(page.locator('[data-public-card-motion="single-target"] .public-card-journey-card')).toHaveCount(4);
  await expect(page.locator('[data-public-card-motion="single-target"] .public-card-journey-card[data-public-card-journey-phase="parked"]')).toHaveCount(4);
  await expect(page.locator(`[data-public-card-journey-card-id="${room.losingNegationId}"]`)).toHaveCount(0);
  await screenshot(page, testInfo, "single-target-negation-history-refresh-restores-all-committed-cards");

  const nextWindowId = (await view(request, room, 0)).currentAction?.negationWindowId;
  expect(nextWindowId).toBeTruthy();
  await adjustNegationClock(request, room, nextWindowId, "hold");
  for (const player of room.players) {
    const passed = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: room.code, token: player.token, context: { windowId: nextWindowId } },
    });
    expect(passed.ok()).toBeTruthy();
  }
  const retired = await view(request, room, 0);
  expect(retired.pendingNegation).toBeNull();
  expect(retired.timeline.filter((event) => event.type === "card" && event.card?.id === room.rootCardId)).toHaveLength(1);
  await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  expect(pageErrors).toEqual([]);
});
