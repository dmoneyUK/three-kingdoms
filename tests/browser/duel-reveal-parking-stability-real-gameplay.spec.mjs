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
      viewerId: element.closest("[data-public-card-motion='duel']")?.getAttribute("data-public-card-viewer-id"),
      revealStartedAt: element.getAttribute("data-public-card-journey-reveal-started-at"),
      revealStartedAtMs: Number(element.getAttribute("data-public-card-journey-reveal-started-ms")),
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
    const startedAt = Number(cardElement?.getAttribute("data-public-card-journey-reveal-started-ms"));
    return Number.isFinite(startedAt) && performance.now() - startedAt >= elapsed;
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

test("server-backed Duel cards reveal for three seconds, park by real owner anchors, and survive phase/view changes", async ({ page, browser, request }, testInfo) => {
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
    await expect(root).toHaveAttribute("data-public-card-journey-reveal-started-ms", /\d+/);
    const revealStart = Number(await root.getAttribute("data-public-card-journey-reveal-started-ms"));

    await waitForElapsed(page, rootEvent.id, 500);
    let rootGeometry = await geometry(page, rootEvent.id);
    expect(rootGeometry.phase).toBe("reveal");
    expect(rootGeometry.actualRect.width).toBeCloseTo(60, 0);
    expect(rootGeometry.actualRect.height).toBeCloseTo(90, 0);
    checkpoints.push({ checkpoint: "duel-0.5s", elapsedMs: Math.round(await page.evaluate((start) => performance.now() - start, revealStart)), ...rootGeometry });
    await screenshot(page, testInfo, "duel-reveal-0.5s-440x894");

    await waitForElapsed(page, rootEvent.id, 2_500);
    rootGeometry = await geometry(page, rootEvent.id);
    expect(rootGeometry.phase).toBe("reveal");
    expect(rootGeometry.actualRect.width).toBeCloseTo(60, 0);
    expect(rootGeometry.actualRect.height).toBeCloseTo(90, 0);
    checkpoints.push({ checkpoint: "duel-2.5s", elapsedMs: Math.round(await page.evaluate((start) => performance.now() - start, revealStart)), ...rootGeometry });
    await captureDuelMove(page, rootEvent.id);
    await screenshot(page, testInfo, "duel-reveal-2.5s-440x894");

    const waitingCopy = page.locator(".public-card-display-journey-copy[data-public-card-phase-notice]");
    await expect(waitingCopy).toContainText("NEGATION MAY BE PLAYED");
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
    const moveElapsedMs = await page.evaluate((start) => performance.now() - start, revealStart);
    expect(moveElapsedMs).toBeGreaterThanOrEqual(3_000);
    expect(moveGeometry.phase).toBe("move");
    expect(moveGeometry.actualRect.width).toBeGreaterThan(48);
    expect(moveGeometry.actualRect.height).toBeGreaterThan(72);
    await page.waitForFunction(() => window.__wtkDuelMoveCapture?.done === true, null, { timeout: 2_000 });
    const completedMove = await page.evaluate(() => window.__wtkDuelMoveCapture);
    const middleSample = completedMove.samples.find((sample) => sample.at - completedMove.startedAt >= 120 && sample.at - completedMove.startedAt <= 300);
    expect(middleSample).toBeTruthy();
    expect(middleSample.width).toBeGreaterThan(48);
    expect(middleSample.width).toBeLessThan(60);
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
    expect(attackGeometry.actualRect.width).toBeCloseTo(60, 0);
    expect(attackGeometry.actualRect.height).toBeCloseTo(90, 0);
    checkpoints.push({ checkpoint: "attack-1-0.5s", ...attackGeometry });
    await screenshot(page, testInfo, "duel-attack-1-reveal-0.5s-440x894");

    await waitForElapsed(page, firstAttackEvent.id, 2_500);
    attackGeometry = await geometry(page, firstAttackEvent.id);
    expect(attackGeometry.phase).toBe("reveal");
    expect(attackGeometry.actualRect.width).toBeCloseTo(60, 0);
    expect(attackGeometry.actualRect.height).toBeCloseTo(90, 0);
    const rootAfterFirstAttack = await geometry(page, rootEvent.id);
    expect(rootAfterFirstAttack.actualRect).toEqual(parkedRootRect);
    checkpoints.push({ checkpoint: "attack-1-2.5s", ...attackGeometry, rootAfterPolling: rootAfterFirstAttack.actualRect });
    await screenshot(page, testInfo, "duel-attack-1-reveal-2.5s-440x894");

    await expect(firstAttack).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 5_000 });
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
