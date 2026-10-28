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

async function seedDuelNegationHistory(request, playerCount, extraHandsBySeat = {}) {
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
  const players = Array.from({ length: playerCount }, (_, index) => {
    const baseHand = index === 0
      ? [card("Duel", `${prefix}-root`)]
      : index === 1
        ? targetNegationIds.map((id) => card("Negation", id, "♥"))
        : index === playerCount - 1
          ? [card("Negation", sideNegationId, "♣")]
          : index === 2 ? [card("Negation", losingNegationId, "♠")] : [];
    return {
      name: `N2 PLAYER ${index + 1}`,
      role: roles[index],
      hero: heroes[index],
      hp: 4,
      maxHp: 4,
      hand: [...baseHand, ...(extraHandsBySeat[index] ?? [])],
    };
  });
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

async function openPlayer(page, room, index, { trace = false, viewport = { width: 440, height: 894 } } = {}) {
  const player = room.players[index];
  await page.setViewportSize(viewport);
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

async function submitEarlyNegationWinner(request, room, winnerIndex, cardId, onPrivateIntent) {
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
  await onPrivateIntent?.({ windowId, privateIntentView });

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

async function duelAnnouncementSnapshot(page, rootEventId, expectedLatestEventId) {
  const announcement = page.locator(`.public-card-display[data-public-card-root-event-id="${rootEventId}"] [data-public-card-announcement="true"]`);
  await expect(announcement).toBeVisible({ timeout: 12_000 });
  if (expectedLatestEventId) {
    await expect(announcement).toHaveAttribute("data-public-negation-latest-event-id", expectedLatestEventId, { timeout: 12_000 });
  }
  return announcement.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const copy = element.querySelector("b");
    const support = element.querySelector(".public-negation-narration-support");
    const table = document.querySelector(".play-table")?.getBoundingClientRect();
      const visual = window.visualViewport;
      const visibleLeft = table ? Math.max(table.left, visual?.offsetLeft ?? 0) : 0;
      const visibleRight = table ? Math.min(table.right, (visual?.offsetLeft ?? 0) + (visual?.width ?? innerWidth)) : innerWidth;
    const button = document.querySelector(".opponent-hero-target");
    const buttonRect = button?.getBoundingClientRect();
    const hit = buttonRect && buttonRect.width > 0 && buttonRect.height > 0
      ? document.elementFromPoint(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2)
      : null;
    const protectedSelectors = [".opponent-player-card", ".player-square", ".player-board-status", ".visible-countdown", ".stage-system-cluster", ".public-activity-chip", ".harvest-choice-panel", ".local-player-dock", ".local-hand-rail", ".console-guidance", "[data-public-card-journey-phase='reveal']"];
    const overlaps = protectedSelectors.flatMap((selector) => [...document.querySelectorAll(selector)]
      .filter((obstacle) => !obstacle.contains(element) && obstacle !== element)
      .filter((obstacle) => {
        const box = obstacle.getBoundingClientRect();
        const style = getComputedStyle(obstacle);
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0
          && rect.left < box.right && rect.right > box.left && rect.top < box.bottom && rect.bottom > box.top;
      }).map(() => selector));
    return {
      eventId: element.getAttribute("data-public-card-announcement-event-id"),
      latestCommittedEventId: element.getAttribute("data-public-negation-latest-event-id"),
      phase: element.getAttribute("data-public-negation-phase"),
      effectState: element.getAttribute("data-public-negation-effect-state"),
      headline: copy?.textContent?.trim() ?? "",
      supporting: support?.textContent?.trim() ?? "",
      accessibleLabel: copy?.getAttribute("aria-label") ?? "",
      supportingHeight: support?.getBoundingClientRect().height ?? 0,
      text: element.textContent?.trim() ?? "",
      visible: getComputedStyle(element).visibility === "visible",
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      centerOffset: table ? (rect.left + rect.right - visibleLeft - visibleRight) / 2 : null,
      visibleBandCenterX: table ? (visibleLeft + visibleRight) / 2 : null,
      tableRect: table ? { left: table.left, right: table.right } : null,
      lines: Number(element.getAttribute("data-public-card-announcement-lines")),
      hitTarget: button ? Boolean(hit && (hit === button || button.contains(hit))) : null,
      overlaps,
      announcementCount: document.querySelectorAll(".public-card-display-copy[data-public-negation-phase]").length,
      viewport: { width: innerWidth, height: innerHeight },
    };
  });
}

async function explicitlyPassNegationWindow(request, room) {
  const before = await view(request, room, 0);
  const windowId = before.currentAction?.negationWindowId;
  expect(windowId).toBeTruthy();
  await adjustNegationClock(request, room, windowId, "hold");
  for (const player of room.players) {
    const passed = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: room.code, token: player.token, context: { windowId } },
    });
    if (!passed.ok()) throw new Error(`Explicit Negation pass failed for ${player.name}: ${passed.status()} ${await passed.text()}`);
  }
  return view(request, room, 0);
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

async function publicPhysicalCardInstances(page, identities) {
  return page.evaluate((expected) => {
    const expectedKeys = new Set(expected.map(({ eventId, cardId }) => `${eventId}\u001f${cardId}`));
    const elements = [...document.querySelectorAll([
      "[data-public-card-journey-event-id]",
      "[data-public-card-static-event-id]",
      ".active-table-reveal [data-settlement-card-id]",
      ".table-played-card[data-settlement-card-id]",
    ].join(","))];
    return elements.flatMap((element) => {
      const eventId = element.getAttribute("data-public-card-journey-event-id")
        ?? element.getAttribute("data-public-card-static-event-id")
        ?? element.getAttribute("data-settlement-event-id")
        ?? element.closest(".active-table-reveal")?.getAttribute("data-settlement-event-id")
        ?? null;
      const cardId = element.getAttribute("data-public-card-journey-card-id")
        ?? element.getAttribute("data-public-card-static-card-id")
        ?? element.getAttribute("data-settlement-card-id")
        ?? null;
      if (!eventId || !cardId || !expectedKeys.has(`${eventId}\u001f${cardId}`)) return [];
      const face = element.matches(".played-card") ? element : element.querySelector(".played-card") ?? element;
      const rect = face.getBoundingClientRect();
      const style = getComputedStyle(face);
      const display = element.closest("[data-public-card-display]");
      const settled = element.closest(".table-played-card");
      const active = element.closest(".active-table-reveal");
      const settlementOwner = element.closest("[data-player-settlement-id]");
      return [{
        eventId,
        cardId,
        actorId: element.getAttribute("data-public-card-journey-actor-id")
          ?? display?.getAttribute("data-public-card-source-id")
          ?? settlementOwner?.getAttribute("data-player-settlement-id")
          ?? null,
        rendererKind: display?.getAttribute("data-public-card-renderer-kind")
          ?? (settled ? "table-resolution-settled" : active ? "table-resolution-active" : "static"),
        visible: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
          && rect.width > 0 && rect.height > 0,
        rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      }];
    });
  }, identities);
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

    const waitingCopy = page.locator('.public-card-display-journey-copy[data-public-negation-phase="WINDOW_OPEN"]');
    await expect(waitingCopy).toBeVisible();
    await expect(waitingCopy).toContainText("Negation can cancel the Duel.");
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

test("server-proven Duel Negation counters retain their ordered author-seat history and shared stepwise narration at 4, 6, and 8 seats", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(180_000);
  const pageErrors = [];
  const viewports = [
    { width: 390, height: 700 },
    { width: 390, height: 844 },
    { width: 440, height: 766 },
    { width: 440, height: 894 },
    { width: 480, height: 900 },
  ];
  let viewportIndex = 0;
  const viewerContext = await browser.newContext({ viewport: viewports[0] });
  const viewerPage = await viewerContext.newPage();
  page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) pageErrors.push(message.text());
  });
  viewerPage.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
  viewerPage.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) pageErrors.push(message.text());
  });

  try {
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

    const viewport = viewports[viewportIndex++ % viewports.length];
    await openPlayer(page, room, 0, { viewport });
    await openPlayer(viewerPage, room, 2, { viewport });
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
    const rootAnnouncement = await duelAnnouncementSnapshot(page, rootEvent.id, rootEvent.id);
    expect(rootAnnouncement.eventId).toBe(rootEvent.id);
    expect(rootAnnouncement.latestCommittedEventId).toBe(rootEvent.id);
    expect(rootAnnouncement.phase).toBe("WINDOW_OPEN");
    expect(rootAnnouncement.effectState).toBe("ACTIVE");
    expect(rootAnnouncement.headline).toContain(source.name);
    expect(rootAnnouncement.headline).toContain(target.name);
    expect(rootAnnouncement.headline).toContain("Duel");
    expect(rootAnnouncement.supporting).toContain("Duel");
    expect(rootAnnouncement.supporting).toBe("Negation can cancel the Duel.");
    expect(rootAnnouncement.accessibleLabel).toContain("Negation can cancel the Duel.");
    expect(rootAnnouncement.supportingHeight).toBeGreaterThan(0);
    expect(rootAnnouncement.lines).toBeGreaterThanOrEqual(2);
    expect(rootAnnouncement.lines).toBeLessThanOrEqual(3);
    expect(rootAnnouncement.centerOffset).toBeLessThanOrEqual(12);
    expect(rootAnnouncement.centerOffset).toBeGreaterThanOrEqual(-12);
    expect(rootAnnouncement.rect.left).toBeGreaterThanOrEqual(0);
    expect(rootAnnouncement.rect.left + rootAnnouncement.rect.width).toBeLessThanOrEqual(rootAnnouncement.viewport.width);
    expect(rootAnnouncement.rect.top).toBeGreaterThanOrEqual(0);
    expect(rootAnnouncement.rect.top + rootAnnouncement.rect.height).toBeLessThanOrEqual(rootAnnouncement.viewport.height);
    expect(rootAnnouncement.overlaps).toEqual([]);
    expect(rootAnnouncement.announcementCount).toBe(1);
    expect(rootAnnouncement.hitTarget).toBe(true);
    const otherViewerRoot = await duelAnnouncementSnapshot(viewerPage, rootEvent.id, rootEvent.id);
    expect(otherViewerRoot.text).toBe(rootAnnouncement.text);
    expect(otherViewerRoot.latestCommittedEventId).toBe(rootAnnouncement.latestCommittedEventId);
    const sourceCurrentAction = (await view(request, room, 0)).currentAction;
    const otherCurrentAction = (await view(request, room, 2)).currentAction;
    expect(JSON.stringify(otherCurrentAction)).not.toBe(JSON.stringify(sourceCurrentAction));
    expect(JSON.stringify(publicAfterDeclaration)).not.toContain(room.losingNegationId);
    await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);

    const committedHistory = [{ event: rootEvent, actor: source, cardId: duelId }];
    for (let index = 0; index < winnerPlans.length; index += 1) {
      const winnerPlan = winnerPlans[index];
      const winner = room.players[winnerPlan.playerIndex];
      const nextViewport = viewports[viewportIndex++ % viewports.length];
      await page.setViewportSize(nextViewport);
      await viewerPage.setViewportSize(nextViewport);
      const previousEventId = committedHistory.at(-1).event.id;
      const result = await submitEarlyNegationWinner(request, room, winnerPlan.playerIndex, winnerPlan.cardId, async () => {
        const sourcePending = await duelAnnouncementSnapshot(page, rootEvent.id, previousEventId);
        const otherPending = await duelAnnouncementSnapshot(viewerPage, rootEvent.id, previousEventId);
        expect(sourcePending.eventId).toBe(previousEventId);
        expect(sourcePending.latestCommittedEventId).toBe(previousEventId);
        expect(otherPending.eventId).toBe(previousEventId);
        expect(otherPending.latestCommittedEventId).toBe(previousEventId);
        expect(otherPending.phase).toBe(sourcePending.phase);
        expect(otherPending.effectState).toBe(sourcePending.effectState);
      });
      committedHistory.push({ event: result.event, actor: winner, cardId: winnerPlan.cardId });

      const currentCard = page.locator(`[data-public-card-journey-event-id="${result.event.id}"]`);
      await expect(currentCard).toBeVisible({ timeout: 20_000 });
      await expect(currentCard).toHaveAttribute("data-public-card-journey-actor-id", winner.id);
      await expect(currentCard).toHaveAttribute("data-public-card-journey-card-id", winnerPlan.cardId);
      await expect(currentCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
      await expect(page.locator(`[data-public-card-journey-card-id="${room.losingNegationId}"]`)).toHaveCount(0);
      const narration = await duelAnnouncementSnapshot(page, rootEvent.id, result.event.id);
      const counteredActor = index === 0 ? source : room.players[winnerPlans[index - 1].playerIndex];
      expect(narration.eventId).toBe(result.event.id);
      expect(narration.latestCommittedEventId).toBe(result.event.id);
      expect(narration.phase).toBe("WINDOW_OPEN");
      expect(narration.effectState).toBe(index % 2 === 0 ? "BLOCKED" : "ACTIVE");
      expect(narration.headline).toContain(winner.name);
      expect(narration.headline).toContain(counteredActor.name);
      expect(narration.headline.toLowerCase()).toContain(index === 0 ? "cancels" : "counter");
      expect(narration.headline).toContain(index === 0 ? "Duel" : "Negation");
      const expectedEffectState = index % 2 === 0 ? "BLOCKED" : "ACTIVE";
      expect(narration.supporting).toBe(`Another Negation can ${expectedEffectState === "BLOCKED" ? "restore" : "cancel"} the Duel.`);
      expect(narration.accessibleLabel).toContain(narration.supporting);
      expect(narration.supportingHeight).toBeGreaterThan(0);
      expect(narration.lines).toBeGreaterThanOrEqual(2);
      expect(narration.lines).toBeLessThanOrEqual(3);
      expect(narration.rect.left).toBeGreaterThanOrEqual(0);
      expect(narration.rect.left + narration.rect.width).toBeLessThanOrEqual(narration.viewport.width);
      expect(narration.rect.top).toBeGreaterThanOrEqual(0);
      expect(narration.rect.top + narration.rect.height).toBeLessThanOrEqual(narration.viewport.height);
      expect(narration.overlaps).toEqual([]);
      expect(narration.announcementCount).toBe(1);
      expect(narration.hitTarget).toBe(true);
      const otherViewerNarration = await duelAnnouncementSnapshot(viewerPage, rootEvent.id, result.event.id);
      expect(otherViewerNarration.latestCommittedEventId).toBe(result.event.id);
      expect(otherViewerNarration.phase).toBe(narration.phase);
      expect(otherViewerNarration.effectState).toBe(narration.effectState);
      expect(otherViewerNarration.headline).toContain(winner.name);
      expect(otherViewerNarration.headline).toContain(counteredActor.name);
      expect(otherViewerNarration.headline).toContain(index === 0 ? "Duel" : "Negation");
      expect(otherViewerNarration.supporting).toBe(narration.supporting);
      const visibleHistory = page.locator('[data-public-card-motion="duel"] .public-card-journey-card');
      await expect(visibleHistory).toHaveCount(committedHistory.length);
      const earlyCheckpoint = index === 0;
      const lateCheckpoint = index === winnerPlans.length - 1;
      if (earlyCheckpoint) {
        await waitForElapsed(page, result.event.id, 500);
        await screenshot(page, testInfo, `duel-negation-${playerCount}-seats-first-counter-0.5s`);
      }
      if (lateCheckpoint) {
        const revealStartedAt = Date.parse(await currentCard.getAttribute("data-public-card-journey-reveal-started-at") ?? "");
        if (Number.isFinite(revealStartedAt) && Date.now() - revealStartedAt < 3_500) {
          await waitForElapsed(page, result.event.id, 3_500);
          if (Date.now() - revealStartedAt < 4_000) {
            await expect(currentCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
            await screenshot(page, testInfo, `duel-negation-${playerCount}-seats-counter-counter-3.5s`);
          }
        }
        await waitForElapsed(page, result.event.id, 4_000);
        await expect(currentCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 3_000 });
      }

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
      if (lateCheckpoint) expect(rendered.every(({ phase }) => phase === "parked")).toBe(true);
      const accessibleHistory = await page.locator('[data-public-card-motion="duel"] .duel-public-card-history-accessible li').allTextContents();
      expect(accessibleHistory).toHaveLength(committedHistory.length);
      expect(accessibleHistory[accessibleHistory.length - 1]).toContain(winner.name);

      if (playerCount >= 5 && winnerPlan.playerIndex !== 0) {
        const seat = page.locator(`.opponent-player-card[data-player-anchor="${winner.id}"]`);
        const seatSide = await seat.getAttribute("data-side-column");
        const responseGeometry = await geometry(page, result.event.id);
        const seatRect = await seat.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
        });
        const horizontalGap = Math.max(0, responseGeometry.targetRect.left - seatRect.right, seatRect.left - (responseGeometry.targetRect.left + responseGeometry.targetRect.width));
        const verticalGap = Math.max(0, responseGeometry.targetRect.top - seatRect.bottom, seatRect.top - (responseGeometry.targetRect.top + responseGeometry.targetRect.height));
        expect(seatSide).toBeTruthy();
        expect(Math.hypot(horizontalGap, verticalGap)).toBeLessThanOrEqual(64);
      }

    }

    await restoreViewer(page, room, 0);
    const restored = await page.locator('[data-public-card-motion="duel"] .public-card-journey-card').evaluateAll((elements) => elements.map((element) => ({
      eventId: element.getAttribute("data-public-card-journey-event-id"),
      actorId: element.getAttribute("data-public-card-journey-actor-id"),
      phase: element.getAttribute("data-public-card-journey-phase"),
    })));
    expect(restored.map(({ eventId }) => eventId)).toEqual(committedHistory.map(({ event }) => event.id));
    expect(restored.map(({ actorId }) => actorId)).toEqual(committedHistory.map(({ actor }) => actor.id));
    expect(restored.every(({ phase }) => phase === "parked")).toBe(true);
    for (const [ordinalIndex, item] of committedHistory.entries()) {
      await expect(page.locator(`[data-public-card-journey-event-id="${item.event.id}"]`))
        .toHaveAttribute("aria-label", new RegExp(`Duel event ${ordinalIndex + 1}`));
    }
    await screenshot(page, testInfo, `duel-negation-${playerCount}-seats-refresh-restores-history`);

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

    const retired = await explicitlyPassNegationWindow(request, room);
    expect(retired.pendingNegation).toBeNull();
    expect(retired.pendingDuel).toBeNull();
    expect(retired.timeline.some((event) => event.type === "card" && event.card?.id === room.losingNegationId)).toBe(false);
    const finalSettlementMessages = retired.timeline.filter((event) => event.type === "message"
      && event.presentation !== false
      && event.message === `Duel's effect on ${target.name} is cancelled by Negation.`
      && event.resolutionId === rootEvent.resolutionId
      && retired.timeline.indexOf(event) > retired.timeline.indexOf(committedHistory.at(-1).event));
    expect(finalSettlementMessages).toHaveLength(1);
    expect(retired.presentationSnapshot?.settlement).toMatchObject({
      eventId: finalSettlementMessages[0].id,
      outcome: "ROOT_CANCELLED",
    });
    await expect(page.locator(`[data-public-card-root-event-id="${rootEvent.id}"] [data-public-negation-phase="FINAL"]`))
      .toBeVisible({ timeout: 20_000 });
    const finalNarration = await duelAnnouncementSnapshot(page, rootEvent.id, committedHistory.at(-1).event.id);
    await screenshot(page, testInfo, `duel-negation-${playerCount}-seats-final-after-window`);
    expect(finalNarration.eventId).toBe(finalSettlementMessages[0].id);
    expect(finalNarration.latestCommittedEventId).toBe(committedHistory.at(-1).event.id);
    expect(finalNarration.phase).toBe("FINAL");
    expect(finalNarration.effectState).toBe("BLOCKED");
    expect(finalNarration.headline).toBe("The Duel is cancelled.");
    expect(finalNarration.supporting).toBe("");
    expect(finalNarration.announcementCount).toBe(1);
    expect(finalNarration.accessibleLabel).toBe("The Duel is cancelled.");
    expect(finalNarration.overlaps).toEqual([]);
    await expect(viewerPage.locator(`[data-public-card-root-event-id="${rootEvent.id}"] [data-public-negation-phase="FINAL"]`))
      .toBeVisible({ timeout: 20_000 });
    const otherViewerFinal = await duelAnnouncementSnapshot(viewerPage, rootEvent.id, committedHistory.at(-1).event.id);
    expect(otherViewerFinal.text).toBe(finalNarration.text);
    expect(otherViewerFinal.phase).toBe("FINAL");
    await expect(page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
    await expect(viewerPage.getByText("GAME SCREEN ERROR")).toHaveCount(0);
    expect(pageErrors).toEqual([]);
    }
  } finally {
    await viewerContext.close();
  }
});

test("Duel counter narration retires at exchange while preserving physical history for both viewers", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(90_000);
  const room = await seedDuelNegationHistory(request, 4);
  const viewerContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const viewerPage = await viewerContext.newPage();
  try {
    await openPlayer(page, room, 0, { viewport: { width: 390, height: 844 } });
    await openPlayer(viewerPage, room, 2, { viewport: { width: 390, height: 844 } });

    const rootCardId = `${room.prefix}-root`;
    const started = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: rootCardId, targetId: room.players[1].id },
    });
    expect(started.ok()).toBeTruthy();
    const rootOpened = await view(request, room, 0);
    const rootEvent = rootOpened.timeline.find((event) => event.type === "card" && event.card?.id === rootCardId);
    expect(rootEvent).toBeTruthy();
    await adjustNegationClock(request, room, rootOpened.currentAction.negationWindowId, "hold");

    const first = await submitEarlyNegationWinner(request, room, 1, room.targetNegationIds[0]);
    const firstCard = page.locator(`[data-public-card-journey-event-id="${first.event.id}"]`);
    await expect(firstCard).toBeVisible({ timeout: 10_000 });
    await expect(firstCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
    const firstRevealStartedAt = Date.parse(await firstCard.getAttribute("data-public-card-journey-reveal-started-at") ?? "");
    expect(Number.isFinite(firstRevealStartedAt)).toBe(true);
    expect(Date.now() - firstRevealStartedAt).toBeLessThan(4_000);
    await expect(page.locator(`[data-public-card-root-event-id="${rootEvent.id}"] [data-public-negation-latest-event-id="${first.event.id}"]`)).toBeVisible();

    const second = await submitEarlyNegationWinner(request, room, 3, room.sideNegationId);
    const secondCard = page.locator(`[data-public-card-journey-event-id="${second.event.id}"]`);
    await expect(secondCard).toBeVisible({ timeout: 10_000 });
    const firstRevealAgeAfterCounter = Date.now() - firstRevealStartedAt;
    expect(firstRevealAgeAfterCounter).toBeLessThan(4_000);
    const secondNarration = await duelAnnouncementSnapshot(page, rootEvent.id, second.event.id);
    expect(secondNarration.headline).toContain(room.players[3].name);
    expect(secondNarration.headline).toContain(room.players[1].name);
    expect(secondNarration.headline.toLowerCase()).toContain("counter");
    expect(secondNarration.effectState).toBe("ACTIVE");
    expect(secondNarration.phase).toBe("WINDOW_OPEN");
    const observerNarration = await duelAnnouncementSnapshot(viewerPage, rootEvent.id, second.event.id);
    expect(observerNarration.text).toBe(secondNarration.text);

    await restoreViewer(page, room, 0);
    const refreshedChain = await duelAnnouncementSnapshot(page, rootEvent.id, second.event.id);
    expect(refreshedChain.text).toBe(secondNarration.text);
    await expect(page.locator('[data-public-card-motion="duel"] .public-card-journey-card')).toHaveCount(3);

    const retired = await explicitlyPassNegationWindow(request, room);
    expect(retired.presentationSnapshot?.settlement).toMatchObject({
      eventId: expect.any(String),
      outcome: "ROOT_RESTORED",
      rootCardKind: "Duel",
      sourceId: room.players[0].id,
      targetId: room.players[1].id,
    });
    const finalEvent = retired.timeline.find((event) => event.id === retired.presentationSnapshot.settlement.eventId);
    expect(finalEvent?.finalResult).toBe(true);
    expect(retired.presentationSnapshot.interaction).toMatchObject({ semantics: "PROVEN", stage: "DUEL_EXCHANGE" });
    expect(retired.presentationSnapshot.duelExchange).toMatchObject({
      semantics: "PROVEN",
      root: { eventId: rootEvent.id },
    });
    const duelRoot = page.locator('[data-public-card-root-event-id="' + rootEvent.id + '"]');
    await expect(duelRoot.locator("[data-public-negation-phase]")).toHaveCount(0, { timeout: 15_000 });
    await expect(page.getByText("The Duel takes effect.")).toHaveCount(0);
    await expect(page.locator('[data-public-card-motion="duel"] .public-card-journey-card')).toHaveCount(3);
    const finalHistory = await page.locator('[data-public-card-motion="duel"] .public-card-journey-card').evaluateAll((elements) => elements.map((element) => ({
      eventId: element.getAttribute("data-public-card-journey-event-id"),
      actorId: element.getAttribute("data-public-card-journey-actor-id"),
      cardId: element.getAttribute("data-public-card-journey-card-id"),
      ordinal: Number(element.getAttribute("data-public-card-journey-ordinal")),
    })));
    expect(finalHistory.map(({ eventId }) => eventId)).toEqual([rootEvent.id, first.event.id, second.event.id]);
    expect(finalHistory.map(({ actorId }) => actorId)).toEqual([room.players[0].id, room.players[1].id, room.players[3].id]);
    expect(finalHistory.map(({ cardId }) => cardId)).toEqual([rootCardId, room.targetNegationIds[0], room.sideNegationId]);
    expect(finalHistory.map(({ ordinal }) => ordinal)).toEqual([1, 2, 3]);
    await expect(viewerPage.locator('[data-public-card-root-event-id="' + rootEvent.id + '"] [data-public-negation-phase]')).toHaveCount(0, { timeout: 15_000 });
    await expect(viewerPage.locator('[data-public-card-motion="duel"] .public-card-journey-card')).toHaveCount(3);
    await screenshot(page, testInfo, "duel-negation-even-chain-exchange-retires-h4-at-390x844");
  } finally {
    await viewerContext.close();
  }
});

test("Duel physical cards keep one public owner through Cao Cao's Treachery skip", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const viewport = { width: 440, height: 766 };
  const attackId = "duel-negation-treachery-target-attack";
  const room = await seedDuelNegationHistory(request, 4, { 1: [card("Attack", attackId, "♦")] });
  const context = await browser.newContext({ viewport });
  const targetPage = await context.newPage();
  try {
    await openPlayer(page, room, 0, { viewport });
    await openPlayer(targetPage, room, 1, { viewport });

    const rootCardId = `${room.prefix}-root`;
    const started = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: rootCardId, targetId: room.players[1].id },
    });
    expect(started.ok()).toBeTruthy();
    const rootOpened = await view(request, room, 0);
    const rootEvent = rootOpened.timeline.find((event) => event.type === "card" && event.card?.id === rootCardId);
    expect(rootEvent).toBeTruthy();
    await adjustNegationClock(request, room, rootOpened.currentAction.negationWindowId, "hold");

    const first = await submitEarlyNegationWinner(request, room, 1, room.targetNegationIds[0]);
    const second = await submitEarlyNegationWinner(request, room, 3, room.sideNegationId);
    const exchange = await explicitlyPassNegationWindow(request, room);
    expect(exchange.presentationSnapshot?.interaction).toMatchObject({ semantics: "PROVEN", stage: "DUEL_EXCHANGE" });
    expect(exchange.presentationSnapshot?.duelExchange).toMatchObject({ semantics: "PROVEN", root: { eventId: rootEvent.id } });
    expect(exchange.presentationSnapshot?.duelExchange?.negationResponses?.map(({ responseEventId, responseCardId, responseActorId }) => ({
      responseEventId, responseCardId, responseActorId,
    }))).toEqual([
      { responseEventId: first.event.id, responseCardId: room.targetNegationIds[0], responseActorId: room.players[1].id },
      { responseEventId: second.event.id, responseCardId: room.sideNegationId, responseActorId: room.players[3].id },
    ]);
    expect(exchange.currentAction?.actorId).toBe(room.players[1].id);
    await restoreViewer(page, room, 0);
    const exchangeIdentities = [
      { eventId: rootEvent.id, cardId: rootCardId, actorId: room.players[0].id },
      { eventId: first.event.id, cardId: room.targetNegationIds[0], actorId: room.players[1].id },
      { eventId: second.event.id, cardId: room.sideNegationId, actorId: room.players[3].id },
    ];
    await expect.poll(async () => (await publicPhysicalCardInstances(page, exchangeIdentities)).filter((instance) => instance.visible).length,
      { timeout: 10_000 }).toBe(exchangeIdentities.length);
    const exchangeEvidence = await publicPhysicalCardInstances(page, exchangeIdentities);
    await testInfo.attach("f1-r4-exchange-ownership.json", {
      body: JSON.stringify({
        proof: {
          identity: exchange.presentationSnapshot?.identity,
          stable: exchange.presentationSnapshot?.stable,
          interaction: exchange.presentationSnapshot?.interaction,
          reactionChain: exchange.presentationSnapshot?.reactionChain,
          duelExchange: exchange.presentationSnapshot?.duelExchange,
          actorId: exchange.currentAction?.actorId,
          actionRevision: exchange.actionRevision,
        },
        expected: exchangeIdentities,
        instances: exchangeEvidence,
      }, null, 2),
      contentType: "application/json",
    });
    expect(exchangeEvidence.filter((instance) => instance.visible)).toHaveLength(exchangeIdentities.length);
    for (const identity of exchangeIdentities) {
      expect(exchangeEvidence.filter((instance) => instance.visible
        && instance.eventId === identity.eventId && instance.cardId === identity.cardId)).toHaveLength(1);
    }
    expect(exchangeEvidence.filter((instance) => instance.rendererKind === "duel-journey" && instance.visible)).toHaveLength(3);
    await expect(page.locator("[data-public-card-announcement='true']:visible")).toHaveCount(0);

    await restoreViewer(targetPage, room, 1);
    await playHandAttack(targetPage, room, room.players[1], attackId);
    const attackProjection = await view(request, room, 1);
    expect(attackProjection.currentAction?.actorId).toBe(room.players[0].id);
    expect(attackProjection.presentationSnapshot?.interaction).toMatchObject({ semantics: "PROVEN", stage: "DUEL_EXCHANGE" });
    const attackEvent = attackProjection.timeline.find((event) => event.type === "card" && event.card?.id === attackId);
    expect(attackEvent).toBeTruthy();
    await restoreViewer(page, room, 0);
    const expectedExchangeCopy = `${room.players[1].name} answered the Duel with Attack. ${room.players[0].name} must answer with Attack.`;
    await expect.poll(async () => Promise.all([page, targetPage].map(async (viewer) =>
      viewer.locator("[data-public-card-announcement='true']:visible b").allTextContents())), { timeout: 8_000 })
      .toEqual([[expectedExchangeCopy], [expectedExchangeCopy]]);
    const sourceDecline = page.locator(`.local-player-dock[data-player-anchor="${room.players[0].id}"] [data-action-slot="decline"] button`);
    await expect(sourceDecline).toBeEnabled({ timeout: 15_000 });
    const damageSubmission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "decline_response");
    await sourceDecline.click();
    expect((await damageSubmission).ok()).toBeTruthy();
    await expect.poll(async () => Promise.all([page, targetPage].map(async (viewer) =>
      viewer.locator("[data-public-card-announcement='true']:visible b").allTextContents())), { timeout: 5_000 })
      .toEqual([[], []]);

    await expect.poll(async () => {
      const projection = await view(request, room, 0);
      return projection.currentAction?.triggerOptions?.some((option) => option.effectId === "cao_cao_jianxiong") === true
        && projection.currentAction?.legalActions?.includes("decline_trigger") === true;
    }, { timeout: 12_000 }).toBe(true);
    const treachery = await view(request, room, 0);
    await restoreViewer(page, room, 0);
    expect(treachery.players.find((player) => player.id === room.players[0].id)?.hp).toBe(3);
    expect(treachery.currentAction?.actorId).toBe(room.players[0].id);
    expect(treachery.currentAction?.deadline).toBeGreaterThan(Date.now());
    const skip = page.locator(`.local-player-dock[data-player-anchor="${room.players[0].id}"] [data-action-slot="decline"] button`);
    await expect(skip).toHaveText("Skip", { timeout: 12_000 });
    await expect(skip).toBeEnabled();

    const publicIdentities = [...exchangeIdentities, { eventId: attackEvent.id, cardId: attackId, actorId: room.players[1].id }];
    await restoreViewer(targetPage, room, 2);
    await page.waitForTimeout(2_100);
    const treacheryEvidence = await publicPhysicalCardInstances(page, publicIdentities);
    const switchedViewerEvidence = await publicPhysicalCardInstances(targetPage, publicIdentities);
    await expect(page.locator("[data-public-card-announcement='true']:visible")).toHaveCount(0);
    await expect(targetPage.locator("[data-public-card-announcement='true']:visible")).toHaveCount(0);
    await testInfo.attach("f1-r4-treachery-ownership.json", {
      body: JSON.stringify({
        proof: {
          identity: treachery.presentationSnapshot?.identity,
          stable: treachery.presentationSnapshot?.stable,
          interaction: treachery.presentationSnapshot?.interaction,
          duelExchange: treachery.presentationSnapshot?.duelExchange,
          actorId: treachery.currentAction?.actorId,
          actionRevision: treachery.actionRevision,
          deadline: treachery.currentAction?.deadline,
        },
        expected: publicIdentities,
        treacheryInstances: treacheryEvidence,
        switchedViewerInstances: switchedViewerEvidence,
      }, null, 2),
      contentType: "application/json",
    });
    for (const identity of publicIdentities) {
      expect(treacheryEvidence.filter((instance) => instance.eventId === identity.eventId && instance.cardId === identity.cardId)).toHaveLength(0);
      expect(switchedViewerEvidence.filter((instance) => instance.eventId === identity.eventId && instance.cardId === identity.cardId)).toHaveLength(0);
    }
    expect(treacheryEvidence.filter((instance) => instance.visible && instance.rendererKind === "table-resolution-settled")).toEqual([]);
    await expect(skip).toBeEnabled();
    const skipSubmission = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
      && response.request().method() === "POST"
      && response.request().postDataJSON()?.action === "decline_trigger");
    await skip.click();
    expect((await skipSubmission).ok()).toBeTruthy();
  } finally {
    await context.close();
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

test("server-proven single-target Negation and counter history rebases across viewers and refresh without exposing losing cards", async ({ page, request }, testInfo) => {
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
    expect(await display.locator('[aria-label="Chronological Negation chain history"] li').allTextContents()).toHaveLength(committedHistory.length);
  }

  const publicState = await view(request, room, 0);
  const provenChain = publicState.presentationSnapshot?.reactionChain;
  expect(provenChain?.semantics).toBe("PROVEN");
  expect(provenChain?.publicEventLinks?.nodes?.map(({ eventId }) => eventId)).toEqual(committedHistory.slice(1).map(({ event }) => event.id));
  expect(provenChain?.nodes?.map(({ actorId }) => actorId)).toEqual([third.id, source.id, target.id]);
  expect(publicState.timeline.some((event) => event.card?.id === room.losingNegationId)).toBe(false);
  expect(JSON.stringify(publicState.presentationSnapshot)).not.toContain(room.losingNegationId);
  const nextWindowId = publicState.currentAction?.negationWindowId;
  expect(nextWindowId).toBeTruthy();
  await adjustNegationClock(request, room, nextWindowId, "hold");
  await page.reload();
  await expect(page.locator('[data-public-card-motion="single-target"] .public-card-journey-card')).toHaveCount(4);
  await expect(page.locator('[data-public-card-motion="single-target"] .public-card-journey-card[data-public-card-journey-phase="parked"]')).toHaveCount(4);
  await expect(page.locator(`[data-public-card-journey-card-id="${room.losingNegationId}"]`)).toHaveCount(0);
  await screenshot(page, testInfo, "single-target-negation-history-refresh-restores-all-committed-cards");

  const expectedCards = await page.locator('[data-public-card-motion="single-target"] [data-public-card-journey-event-id]').evaluateAll((elements) => elements.map((element) => ({
    eventId: element.getAttribute("data-public-card-journey-event-id"),
    actorId: element.getAttribute("data-public-card-journey-actor-id"),
    revealStartedAt: element.getAttribute("data-public-card-journey-reveal-started-at"),
  })));
  expect(expectedCards.map(({ eventId }) => eventId)).toEqual(committedHistory.map(({ event }) => event.id));
  await page.setViewportSize({ width: 390, height: 700 });
  await expect.poll(() => page.locator('[data-public-card-motion="single-target"]').getAttribute("data-public-card-layout-pending")).toBe("false");
  const mobileHistory = await page.locator('[data-public-card-motion="single-target"]').evaluate((display) => ({
    viewerId: display.getAttribute("data-public-card-viewer-id"),
    layoutViewerId: display.getAttribute("data-public-card-layout-viewer-id"),
    cards: [...display.querySelectorAll("[data-public-card-journey-event-id]")].map((card) => {
      const rect = card.getBoundingClientRect();
      const actorId = card.getAttribute("data-public-card-journey-actor-id");
      const anchor = [...document.querySelectorAll("[data-player-anchor]")]
        .find((element) => element.getAttribute("data-player-anchor") === actorId);
      return {
        eventId: card.getAttribute("data-public-card-journey-event-id"),
        actorId,
        phase: card.getAttribute("data-public-card-journey-phase"),
        revealStartedAt: card.getAttribute("data-public-card-journey-reveal-started-at"),
        visibility: getComputedStyle(card).visibility,
        actual: { left: rect.left, top: rect.top },
        target: {
          left: Number(card.getAttribute("data-public-card-journey-target-left")),
          top: Number(card.getAttribute("data-public-card-journey-target-top")),
        },
        actorAnchorPresent: Boolean(anchor && anchor.getBoundingClientRect().width > 0 && anchor.getBoundingClientRect().height > 0),
      };
    }),
  }));
  expect(mobileHistory.viewerId).toBe(source.id);
  expect(mobileHistory.layoutViewerId).toBe(source.id);
  expect(mobileHistory.cards.map(({ eventId }) => eventId)).toEqual(expectedCards.map(({ eventId }) => eventId));
  for (const card of mobileHistory.cards) {
    const expected = expectedCards.find((candidate) => candidate.eventId === card.eventId);
    expect(card.actorId).toBe(expected.actorId);
    expect(card.revealStartedAt).toBe(expected.revealStartedAt);
    expect(card.phase).toBe("parked");
    expect(card.visibility).toBe("visible");
    expect(card.actorAnchorPresent).toBe(true);
    expect(Math.abs(card.actual.left - card.target.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(card.actual.top - card.target.top)).toBeLessThanOrEqual(2);
  }
  await testInfo.attach("q3-single-target-negation-390x700-mobile-history.json", {
    body: JSON.stringify(mobileHistory, null, 2),
    contentType: "application/json",
  });
  await screenshot(page, testInfo, "q3-single-target-negation-history-390x700");
  console.log(`[Q3 SINGLE-TARGET NEGATION mobile history] ${JSON.stringify(mobileHistory)}`);

  const rebaseViewer = room.players[3];
  await page.addInitScript(({ viewerId, cards }) => {
    const capture = { samples: [], frame: 0, complete: false };
    const inspectFrame = () => {
      capture.frame += 1;
      const localViewerId = document.querySelector(".local-player-dock")?.getAttribute("data-player-anchor") ?? null;
      for (const expected of cards) {
        const card = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
          .find((element) => element.getAttribute("data-public-card-journey-event-id") === expected.eventId);
        const display = card?.closest("[data-public-card-display='true']");
        if (!card || !display) continue;
        const rect = card.getBoundingClientRect();
        const anchor = [...document.querySelectorAll("[data-player-anchor]")]
          .find((element) => element.getAttribute("data-player-anchor") === expected.actorId);
        capture.samples.push({
          frame: capture.frame,
          eventId: expected.eventId,
          expectedActorId: expected.actorId,
          cardId: card.getAttribute("data-public-card-journey-card-id"),
          actorId: card.getAttribute("data-public-card-journey-actor-id"),
          phase: card.getAttribute("data-public-card-journey-phase"),
          viewerId: display.getAttribute("data-public-card-viewer-id"),
          layoutViewerId: display.getAttribute("data-public-card-layout-viewer-id"),
          localViewerId,
          displayPending: display.getAttribute("data-public-card-layout-pending"),
          cardPending: card.getAttribute("data-public-card-journey-layout-pending"),
          visibility: getComputedStyle(card).visibility,
          actual: { left: rect.left, top: rect.top },
          target: {
            left: Number(card.getAttribute("data-public-card-journey-target-left")),
            top: Number(card.getAttribute("data-public-card-journey-target-top")),
          },
          anchorPresent: Boolean(anchor && anchor.getBoundingClientRect().width > 0 && anchor.getBoundingClientRect().height > 0),
          revealStartedAt: card.getAttribute("data-public-card-journey-reveal-started-at"),
          activeTransitions: card.getAnimations().filter((animation) => animation.playState === "running").length,
        });
      }
      const visibleForNewViewer = (eventId) => capture.samples.some((sample) =>
        sample.eventId === eventId && sample.viewerId === viewerId && sample.visibility === "visible");
      capture.complete = cards.every(({ eventId }) => visibleForNewViewer(eventId));
      if (!capture.complete && capture.frame < 600) window.requestAnimationFrame(inspectFrame);
    };
    window.__q3SingleTargetRebase = capture;
    window.requestAnimationFrame(inspectFrame);
  }, {
    viewerId: rebaseViewer.id,
    cards: expectedCards.map(({ eventId, actorId }) => ({ eventId, actorId })),
  });
  await page.evaluate(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: rebaseViewer.token, name: rebaseViewer.name });
  await page.reload();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${rebaseViewer.id}"]`)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__q3SingleTargetRebase.complete), { timeout: 15_000 }).toBe(true);
  const singleTargetRebaseSamples = await page.evaluate(() => window.__q3SingleTargetRebase.samples);
  for (const expected of expectedCards) {
    const firstVisible = singleTargetRebaseSamples.find((sample) =>
      sample.eventId === expected.eventId && sample.viewerId === rebaseViewer.id && sample.visibility === "visible");
    expect(firstVisible, JSON.stringify(singleTargetRebaseSamples)).toBeTruthy();
    expect(firstVisible.localViewerId).toBe(rebaseViewer.id);
    expect(firstVisible.layoutViewerId).toBe(rebaseViewer.id);
    expect(firstVisible.displayPending).toBe("false");
    expect(firstVisible.cardPending).toBe("false");
    expect(firstVisible.actorId).toBe(expected.actorId);
    expect(firstVisible.phase).toBe("parked");
    expect(firstVisible.anchorPresent).toBe(true);
    expect(Math.abs(firstVisible.actual.left - firstVisible.target.left)).toBeLessThanOrEqual(2);
    expect(Math.abs(firstVisible.actual.top - firstVisible.target.top)).toBeLessThanOrEqual(2);
    expect(firstVisible.revealStartedAt).toBe(expected.revealStartedAt);
    expect(firstVisible.activeTransitions).toBe(0);
  }
  expect(singleTargetRebaseSamples.every((sample) => sample.cardId !== room.losingNegationId)).toBe(true);
  const rebaseProjection = await view(request, room, 3);
  expect(JSON.stringify(rebaseProjection.presentationSnapshot)).not.toContain(room.losingNegationId);
  expect(rebaseProjection.timeline.some((event) => event.card?.id === room.losingNegationId)).toBe(false);
  await testInfo.attach("q3-single-target-negation-first-new-view-frames.json", {
    body: JSON.stringify(singleTargetRebaseSamples, null, 2),
    contentType: "application/json",
  });
  await screenshot(page, testInfo, "q3-single-target-negation-history-rebased-390x700");

  await page.setViewportSize({ width: 440, height: 894 });

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
