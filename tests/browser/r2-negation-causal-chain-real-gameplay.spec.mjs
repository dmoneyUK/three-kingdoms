import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seedR2Room(request, playerCount) {
  const prefix = `r2-negation-${playerCount}`;
  const heroes = ["simayi", "xu-chu", "cao-cao", "xiahou-dun", "liu-bei", "sun-quan", "guo-jia", "zhang-liao"];
  const rolesByCount = {
    4: ["Lord", "Loyalist", "Rebel", "Renegade"],
    6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"],
    8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"],
  };
  const roles = rolesByCount[playerCount];
  const cards = {
    firstNegation: `${prefix}-steal-negation`,
    secondNegation: `${prefix}-dismantle-negation`,
    counterNegation: `${prefix}-counter-negation`,
    hiddenNegation: `${prefix}-unsubmitted-negation`,
    steal: `${prefix}-steal-root`,
    dismantle: `${prefix}-dismantle-root`,
    targetAttack: `${prefix}-target-attack`,
    targetDodge: `${prefix}-target-dodge`,
  };
  const players = Array.from({ length: playerCount }, (_, seat) => ({
    name: [`R2 SIMA YI ${playerCount}`, `R2 XU CHU ${playerCount}`, `R2 CAO CAO ${playerCount}`, `R2 TARGET ${playerCount}`][seat]
      ?? `R2 EXTRA ${seat + 1} ${playerCount}`,
    role: roles[seat],
    hero: heroes[seat],
    hp: 4,
    maxHp: 4,
    hand: seat === 0
      ? [card("Negation", cards.firstNegation, "♦"), card("Negation", cards.secondNegation, "♥")]
      : seat === 1
        ? [card("Negation", cards.counterNegation, "♣"), card("Negation", cards.hiddenNegation, "♠")]
        : seat === 2
          ? [card("Steal", cards.steal), card("Dismantle", cards.dismantle, "♦")]
          : seat === 3
            ? [card("Attack", cards.targetAttack), card("Dodge", cards.targetDodge, "♥")]
            : [],
  }));
  const deck = Array.from({ length: 40 }, (_, index) => card(index % 2 ? "Dodge" : "Attack", `${prefix}-deck-${index}`));
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 2, deck, players },
  });
  if (!response.ok()) throw new Error(`R2 ${playerCount}-seat room seed failed: ${await response.text()}`);
  const room = await response.json();
  room.players.sort((left, right) => left.seat - right.seat);
  return { ...room, prefix, cards };
}

async function openPlayer(page, room, index, viewport, trace = false) {
  const player = room.players[index];
  await page.setViewportSize(viewport);
  await page.goto(`${API}/api/health`);
  await page.evaluate(({ code, token, name, traceEnabled }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
    if (traceEnabled) sessionStorage.setItem("wtk.game-ux-trace.active.v2", "true");
  }, { code: room.code, token: player.token, name: player.name, traceEnabled: trace });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible();
  return player;
}

async function view(request, room, index) {
  const response = await request.get(`${API}/api/rooms?code=${room.code}&token=${room.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function adjustWindowClock(request, room, windowId, mode) {
  const response = await request.post(`${API}/__test/negation-window-clock`, { data: { code: room.code, windowId, mode } });
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toEqual({ adjusted: true });
}

function cardEvent(roomView, cardId) {
  return roomView.timeline.find((event) => event?.type === "card" && event.action === "play" && event.card?.id === cardId) ?? null;
}

async function playRoot(request, room, cardId, targetId) {
  const response = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: room.code, token: room.players[2].token, cardId, targetId },
  });
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function submitWinningNegation(request, room, winnerIndex, negationCardId) {
  const winner = room.players[winnerIndex];
  const opened = await view(request, room, winnerIndex);
  const windowId = opened.currentAction?.negationWindowId;
  expect(windowId).toBeTruthy();
  await adjustWindowClock(request, room, windowId, "hold");
  const intent = await request.post(`${API}/api/rooms`, {
    data: {
      action: "respond",
      code: room.code,
      token: winner.token,
      providerId: "negation_card",
      cardId: negationCardId,
      context: { windowId },
    },
  });
  expect(intent.ok()).toBeTruthy();

  for (let viewerIndex = 0; viewerIndex < 4; viewerIndex += 1) {
    const privateIntentView = await view(request, room, viewerIndex);
    expect(privateIntentView.timeline.some((event) => event?.card?.id === negationCardId)).toBe(false);
    expect(JSON.stringify(privateIntentView.presentationSnapshot ?? {})).not.toContain(negationCardId);
  }

  for (const [index, player] of room.players.entries()) {
    if (index === winnerIndex) continue;
    const passed = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: room.code, token: player.token, context: { windowId } },
    });
    expect(passed.ok(), `${player.name} must explicitly Pass the shared Negation window`).toBeTruthy();
  }

  const settled = await view(request, room, 3);
  const event = cardEvent(settled, negationCardId);
  expect(event, "the winning intent is public only after the shared window settles").toBeTruthy();
  expect(event.player).toBe(winner.name);
  return { windowId, event, settled };
}

async function passEverySeat(request, room) {
  const opened = await view(request, room, 0);
  const windowId = opened.currentAction?.negationWindowId;
  expect(windowId).toBeTruthy();
  await adjustWindowClock(request, room, windowId, "hold");
  for (const player of room.players) {
    const passed = await request.post(`${API}/api/rooms`, {
      data: { action: "decline_response", code: room.code, token: player.token, context: { windowId } },
    });
    expect(passed.ok()).toBeTruthy();
  }
}

async function readGeometry(page, eventId, actorId, actorIndex = 0) {
  return page.locator(`[data-public-card-journey-event-id="${eventId}"]`).evaluate((element, { actorId: expectedActorId, actorIndex: cardIndex }) => {
    const rect = element.getBoundingClientRect();
    const anchor = [...document.querySelectorAll("[data-player-anchor]")]
      .find((candidate) => candidate.getAttribute("data-player-anchor") === expectedActorId);
    const table = document.querySelector(".play-table");
    const seat = anchor?.getBoundingClientRect();
    const tableRect = table?.getBoundingClientRect();
    const target = {
      left: Number(element.getAttribute("data-public-card-journey-target-left")),
      top: Number(element.getAttribute("data-public-card-journey-target-top")),
      width: Number(element.getAttribute("data-public-card-journey-target-width")),
      height: Number(element.getAttribute("data-public-card-journey-target-height")),
    };
    const anchorKind = anchor?.classList.contains("local-player-dock") ? "local" : "opponent";
    const centerDistance = seat ? Math.hypot(rect.left + rect.width / 2 - (seat.left + seat.width / 2), rect.top + rect.height / 2 - (seat.top + seat.height / 2)) : null;
    const otherAnchorDistances = [...document.querySelectorAll("[data-player-anchor]")]
      .filter((candidate) => candidate !== anchor)
      .map((candidate) => {
        const other = candidate.getBoundingClientRect();
        return Math.hypot(rect.left + rect.width / 2 - (other.left + other.width / 2), rect.top + rect.height / 2 - (other.top + other.height / 2));
      });
    let expected = null;
    if (seat && tableRect && anchorKind === "local") {
      const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];
      expected = {
        side: "local",
        candidates: offsets.map((offset) => ({ left: seat.left + 8 + cardIndex * 54, top: seat.top - 72 - 6 + offset * 78 })),
      };
    }
    else if (seat && tableRect) {
      const centerX = seat.left + seat.width / 2;
      const centerY = seat.top + seat.height / 2;
      const edges = [
        { side: "top", distance: Math.abs(centerY - tableRect.top) },
        { side: "left", distance: Math.abs(centerX - tableRect.left) },
        { side: "right", distance: Math.abs(tableRect.right - centerX) },
      ].sort((left, right) => left.distance - right.distance);
      const side = edges[0].side;
      const base = side === "top"
        ? { left: centerX - 24, top: seat.bottom + 6 }
        : side === "left"
          ? { left: seat.right + 6, top: centerY - 36 }
          : { left: seat.left - 48 - 6, top: centerY - 36 };
      const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];
      const horizontalProgression = side !== "top";
      const preferred = {
        left: base.left + (horizontalProgression ? (side === "right" ? -1 : 1) * cardIndex * 54 : 0),
        top: base.top + (horizontalProgression ? 0 : cardIndex * 54),
      };
      expected = {
        side,
        candidates: offsets.map((offset) => side === "top"
          ? { left: preferred.left + offset * 54, top: preferred.top }
          : { left: preferred.left, top: preferred.top + offset * 78 }),
      };
    }
    return {
      eventId: element.getAttribute("data-public-card-journey-event-id"),
      actorId: element.getAttribute("data-public-card-journey-actor-id"),
      cardId: element.getAttribute("data-public-card-journey-card-id"),
      role: element.getAttribute("data-public-card-journey-role"),
      phase: element.getAttribute("data-public-card-journey-phase"),
      parkingSide: element.getAttribute("data-public-card-journey-parking-side"),
      viewerId: element.closest("[data-public-card-motion='single-target']")?.getAttribute("data-public-card-viewer-id"),
      revealStartedAt: element.getAttribute("data-public-card-journey-reveal-started-at"),
      actualRect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      targetRect: target,
      actorAnchorRect: seat ? { left: seat.left, top: seat.top, width: seat.width, height: seat.height } : null,
      actorAnchorKind: anchorKind,
      viewport: { width: window.innerWidth, height: window.innerHeight },
      tableRect: tableRect ? { left: tableRect.left, top: tableRect.top, width: tableRect.width, height: tableRect.height } : null,
      centerDistance,
      nearestOtherAnchorDistance: otherAnchorDistances.length ? Math.min(...otherAnchorDistances) : null,
      expected,
      layoutChangeReason: element.getAttribute("data-public-card-journey-layout-reason"),
    };
  }, { actorId, actorIndex });
}

function assertActorParking(geometry, requireRevealTimestamp = true) {
  expect(geometry.actualRect.width).toBeCloseTo(48, 0);
  expect(geometry.actualRect.height).toBeCloseTo(72, 0);
  expect(Math.abs(geometry.actualRect.left - geometry.targetRect.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.actualRect.top - geometry.targetRect.top)).toBeLessThanOrEqual(1);
  expect(geometry.actorAnchorRect).toBeTruthy();
  if (requireRevealTimestamp) expect(geometry.revealStartedAt).toBeTruthy();
  expect(geometry.expected).toBeTruthy();
  const nearestAllowedParking = Math.min(...geometry.expected.candidates.map((candidate) =>
    Math.abs(geometry.targetRect.left - candidate.left) + Math.abs(geometry.targetRect.top - candidate.top)));
  expect(nearestAllowedParking, JSON.stringify(geometry, null, 2)).toBeLessThanOrEqual(2);
}

async function waitForParkedTarget(page, eventId, actorId, actorIndex = 0) {
  await page.waitForFunction(({ id, expectedActorId, cardIndex }) => {
    const element = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((candidate) => candidate.getAttribute("data-public-card-journey-event-id") === id);
    if (!element || element.getAttribute("data-public-card-journey-phase") !== "parked") return false;
    const rect = element.getBoundingClientRect();
    const left = Number(element.getAttribute("data-public-card-journey-target-left"));
    const top = Number(element.getAttribute("data-public-card-journey-target-top"));
    const anchor = [...document.querySelectorAll("[data-player-anchor]")]
      .find((candidate) => candidate.getAttribute("data-player-anchor") === expectedActorId);
    const table = document.querySelector(".play-table");
    if (!anchor || !table) return false;
    const seat = anchor.getBoundingClientRect();
    const tableRect = table.getBoundingClientRect();
    const local = anchor.classList.contains("local-player-dock");
    const centerX = seat.left + seat.width / 2;
    const centerY = seat.top + seat.height / 2;
    const side = local ? "local" : [
      { side: "top", distance: Math.abs(centerY - tableRect.top) },
      { side: "left", distance: Math.abs(centerX - tableRect.left) },
      { side: "right", distance: Math.abs(tableRect.right - centerX) },
    ].sort((a, b) => a.distance - b.distance)[0].side;
    const base = local
      ? { left: seat.left + 8, top: seat.top - 78 }
      : side === "top"
        ? { left: centerX - 24, top: seat.bottom + 6 }
        : side === "left"
          ? { left: seat.right + 6, top: centerY - 36 }
          : { left: seat.left - 54, top: centerY - 36 };
    const horizontalProgression = side !== "top";
    const preferred = {
      left: base.left + (horizontalProgression ? (side === "right" ? -1 : 1) * cardIndex * 54 : 0),
      top: base.top + (horizontalProgression ? 0 : cardIndex * 54),
    };
    const offsets = [0, 1, -1, 2, -2, 3, -3, 4, -4, 5, -5, 6, -6];
    const expectedTargets = offsets.map((offset) => ({
      left: preferred.left + (horizontalProgression ? 0 : offset * 54),
      top: preferred.top + (horizontalProgression ? offset * 78 : 0),
    }));
    const targetMatchesSeat = expectedTargets.some((candidate) => Math.abs(candidate.left - left) <= 2 && Math.abs(candidate.top - top) <= 2);
    return targetMatchesSeat && Math.abs(rect.left - left) <= 1 && Math.abs(rect.top - top) <= 1;
  }, { id: eventId, expectedActorId: actorId, cardIndex: actorIndex }, { timeout: 5_000 });
}

async function assertHistory(viewer, viewerIndex, room, rootEvent, history, testInfo, screenshotLabel, requireRevealTimestamp = true) {
  const display = viewer.page.locator(`[data-public-card-motion="single-target"][data-public-card-root-event-id="${rootEvent.id}"]`);
  await expect(display).toHaveCount(1, `viewer ${viewer.name} should have one owner for the proven Dismantle root`);
  await expect(display).toHaveAttribute("data-public-card-viewer-id", room.players[viewerIndex].id);
  const rows = [];
  for (const item of history) {
    const cardElement = display.locator(`[data-public-card-journey-event-id="${item.event.id}"]`);
    await expect(cardElement).toBeVisible();
    await expect(cardElement).toHaveAttribute("data-public-card-journey-actor-id", item.actor.id);
    await expect(cardElement).toHaveAttribute("data-public-card-journey-card-id", item.cardId);
    await expect(cardElement).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 20_000 });
    const geometry = await readGeometry(viewer.page, item.event.id, item.actor.id);
    assertActorParking(geometry, requireRevealTimestamp);
    rows.push(geometry);
  }
  await expect(display.locator(".public-card-journey-card")).toHaveCount(history.length);
  await expect(viewer.page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
  const geometryPath = testInfo.outputPath(`${screenshotLabel}-${viewer.name}-geometry.json`);
  writeFileSync(geometryPath, JSON.stringify({ viewport: viewer.page.viewportSize(), viewerId: room.players[viewerIndex].id, rootEventId: rootEvent.id, cards: rows }, null, 2));
  await testInfo.attach(`${screenshotLabel}-${viewer.name}-geometry.json`, { path: geometryPath, contentType: "application/json" });
  const screenshotPath = testInfo.outputPath(`${screenshotLabel}-${viewer.name}.png`);
  await viewer.page.screenshot({ path: screenshotPath, fullPage: true });
  await testInfo.attach(`${screenshotLabel}-${viewer.name}.png`, { path: screenshotPath, contentType: "image/png" });
  return rows;
}

test("R2 Negation causal history survives a cancelled root and parks on true actors at 4/6/8 seats", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(360_000);
  const viewers = [
    { index: 2, name: "cao-cao", viewport: { width: 390, height: 844 }, page, errors: [] },
    { index: 0, name: "sima-yi", viewport: { width: 440, height: 894 }, page: null, errors: [] },
    { index: 1, name: "xu-chu", viewport: { width: 480, height: 900 }, page: null, errors: [] },
    { index: 3, name: "target", viewport: { width: 1280, height: 900 }, page: null, errors: [] },
  ];
  const contexts = [];
  try {
    for (const viewer of viewers) {
      if (!viewer.page) {
        const context = await browser.newContext({ viewport: viewer.viewport });
        contexts.push(context);
        viewer.page = await context.newPage();
      }
      viewer.page.on("pageerror", (error) => viewer.errors.push(`${error.name}: ${error.message}`));
      viewer.page.on("console", (message) => {
        if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) viewer.errors.push(message.text());
      });
    }

    for (const playerCount of [4, 6, 8]) {
      const room = await seedR2Room(request, playerCount);
      for (const viewer of viewers) await openPlayer(viewer.page, room, viewer.index, viewer.viewport, viewer.index === 2);

      const source = room.players[2];
      const target = room.players[3];
      const firstRootId = room.cards.steal;
      const firstRootOpened = await playRoot(request, room, firstRootId, target.id);
      expect(firstRootOpened.room.currentAction?.negationWindowId).toBeTruthy();
      const firstRootState = await view(request, room, 2);
      const firstRootEvent = cardEvent(firstRootState, firstRootId);
      expect(firstRootEvent?.player).toBe(source.name);
      const firstChainId = firstRootState.presentationV2?.interactionScene?.interactionId;
      expect(firstChainId).toBeTruthy();
      const firstCancellation = await submitWinningNegation(request, room, 0, room.cards.firstNegation);
      expect(firstCancellation.settled.pendingNegation).toBeTruthy();
      await passEverySeat(request, room);
      const cancelledSteal = await view(request, room, 3);
      expect(cancelledSteal.pendingNegation).toBeNull();
      expect(cancelledSteal.timeline.filter((event) => event?.type === "card" && event.card?.id === firstRootId)).toHaveLength(1);
      expect(cancelledSteal.presentationSnapshot?.reactionChain?.rootCard?.eventId ?? firstRootEvent.id).toBe(firstRootEvent.id);

      const staleIntentView = await view(request, room, 3);
      expect(JSON.stringify(staleIntentView.timeline)).not.toContain(room.cards.hiddenNegation);
      expect(JSON.stringify(staleIntentView.presentationSnapshot ?? {})).not.toContain(room.cards.hiddenNegation);
      expect(staleIntentView.myHand.map((held) => held.id)).not.toContain(room.cards.hiddenNegation);
      const xuPrivateView = await view(request, room, 1);
      expect(xuPrivateView.myHand.map((held) => held.id)).toContain(room.cards.hiddenNegation);

      const dismantleOpened = await playRoot(request, room, room.cards.dismantle, target.id);
      expect(dismantleOpened.room.currentAction?.negationWindowId).toBeTruthy();
      const openedState = await view(request, room, 3);
      const rootEvent = cardEvent(openedState, room.cards.dismantle);
      expect(rootEvent?.player).toBe(source.name);
      const rootCausalId = openedState.presentationV2?.interactionScene?.interactionId;
      const rootFrameId = openedState.presentationV2?.interactionScene?.rootFrameId;
      expect(rootCausalId).toBeTruthy();
      expect(rootCausalId).not.toBe(firstChainId);
      const rootHistory = [{ event: rootEvent, actor: source, cardId: room.cards.dismantle }];

      const firstRootCausalProof = openedState.presentationV2?.interactionScene;
      expect(firstRootCausalProof?.semantics).toBe("PROVEN");
      expect(firstRootCausalProof?.interactionId).toBe(rootCausalId);
      expect(firstRootCausalProof?.rootFrameId).toBe(rootFrameId);
      expect(openedState.presentationSnapshot?.reactionChain?.semantics).toBe("PROVEN");
      expect(openedState.presentationSnapshot?.reactionChain?.publicEventLinks?.root?.eventId).toBe(rootEvent.id);
      await Promise.all(viewers.map((viewer) => assertHistory(viewer, viewer.index, room, rootEvent, rootHistory, testInfo, `r2-${playerCount}-root`)));

      const firstDismantleNegation = await submitWinningNegation(request, room, 0, room.cards.secondNegation);
      rootHistory.push({ event: firstDismantleNegation.event, actor: room.players[0], cardId: room.cards.secondNegation });
      const firstCounterState = await view(request, room, 3);
      const firstCounterChain = firstCounterState.presentationSnapshot?.reactionChain;
      expect(firstCounterChain?.semantics).toBe("PROVEN");
      expect(firstCounterChain?.interactionId).toBe(rootCausalId);
      expect(firstCounterState.presentationV2?.interactionScene?.rootFrameId).toBe(rootFrameId);
      expect(firstCounterChain?.publicEventLinks?.root?.eventId).toBe(rootEvent.id);
      expect(firstCounterChain?.publicEventLinks?.nodes?.map(({ eventId }) => eventId)).toEqual([firstDismantleNegation.event.id]);
      expect(firstCounterChain?.nodes?.map(({ actorId }) => actorId)).toEqual([room.players[0].id]);
      await Promise.all(viewers.map((viewer) => assertHistory(viewer, viewer.index, room, rootEvent, rootHistory, testInfo, `r2-${playerCount}-first-counter`)));

      const secondDismantleNegation = await submitWinningNegation(request, room, 1, room.cards.counterNegation);
      rootHistory.push({ event: secondDismantleNegation.event, actor: room.players[1], cardId: room.cards.counterNegation });
      const liveChainState = await view(request, room, 3);
      const liveChain = liveChainState.presentationSnapshot?.reactionChain;
      expect(liveChain?.semantics).toBe("PROVEN");
      expect(liveChain?.interactionId).toBe(rootCausalId);
      expect(liveChain?.publicEventLinks?.root?.eventId).toBe(rootEvent.id);
      expect(liveChain?.publicEventLinks?.nodes?.map(({ eventId }) => eventId)).toEqual(rootHistory.slice(1).map(({ event }) => event.id));
      expect(liveChain?.nodes?.map(({ actorId }) => actorId)).toEqual([room.players[0].id, room.players[1].id]);
      expect(liveChainState.currentAction?.negationWindowId).toBeTruthy();
      for (const viewerIndex of [0, 1, 2, 3]) {
        const viewerState = await view(request, room, viewerIndex);
        expect(viewerState.currentAction?.negationWindowId).toBe(liveChainState.currentAction.negationWindowId);
        expect(viewerState.presentationSnapshot?.reactionChain?.publicEventLinks).toEqual(liveChain?.publicEventLinks);
        expect(viewerState.presentationSnapshot?.reactionChain?.nodes?.map(({ actorId }) => actorId)).toEqual([room.players[0].id, room.players[1].id]);
      }
      await Promise.all(viewers.map((viewer) => assertHistory(viewer, viewer.index, room, rootEvent, rootHistory, testInfo, `r2-${playerCount}-counter-counter`)));

      for (const viewer of viewers) {
        await viewer.page.reload();
        await expect(viewer.page.locator(".game-shell")).toBeVisible();
        await expect(viewer.page.locator(`[data-public-card-motion="single-target"][data-public-card-root-event-id="${rootEvent.id}"] .public-card-journey-card`)).toHaveCount(3);
        await expect(viewer.page.locator(`[data-public-card-motion="single-target"][data-public-card-root-event-id="${rootEvent.id}"] .public-card-journey-card[data-public-card-journey-phase="parked"]`)).toHaveCount(3);
        await expect(viewer.page.locator(`[data-public-card-motion="single-target"] [data-public-card-journey-card-id="${room.cards.hiddenNegation}"]`)).toHaveCount(0);
      }

      const resizeViewer = viewers[1];
      const resizeRootCard = resizeViewer.page.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`);
      const captureResizeGeometry = async (label) => {
        const resizeCards = [];
        const actorIndexes = new Map();
        for (const item of rootHistory) {
          const actorIndex = actorIndexes.get(item.actor.id) ?? 0;
          actorIndexes.set(item.actor.id, actorIndex + 1);
          await waitForParkedTarget(resizeViewer.page, item.event.id, item.actor.id, actorIndex);
          const geometry = await readGeometry(resizeViewer.page, item.event.id, item.actor.id, actorIndex);
          assertActorParking(geometry, false);
          resizeCards.push(geometry);
        }
        const geometryPath = testInfo.outputPath(`r2-${playerCount}-${label}-${resizeViewer.name}-geometry.json`);
        writeFileSync(geometryPath, JSON.stringify({ viewport: resizeViewer.page.viewportSize(), viewerId: room.players[resizeViewer.index].id, rootEventId: rootEvent.id, cards: resizeCards }, null, 2));
        await testInfo.attach(`r2-${playerCount}-${label}-${resizeViewer.name}-geometry.json`, { path: geometryPath, contentType: "application/json" });
        const screenshotPath = testInfo.outputPath(`r2-${playerCount}-${label}-${resizeViewer.name}.png`);
        await resizeViewer.page.screenshot({ path: screenshotPath, fullPage: true });
        await testInfo.attach(`r2-${playerCount}-${label}-${resizeViewer.name}.png`, { path: screenshotPath, contentType: "image/png" });
      };
      await resizeViewer.page.setViewportSize({ width: 390, height: 844 });
      await expect(resizeRootCard).toHaveAttribute("data-public-card-journey-phase", "parked");
      await captureResizeGeometry("resize-390");
      await resizeViewer.page.setViewportSize(resizeViewer.viewport);
      await expect(resizeRootCard).toHaveAttribute("data-public-card-journey-phase", "parked");
      await captureResizeGeometry("resize-return");

      if (playerCount === 4) {
        // Re-authenticate the same browser through two genuine seat tokens.
        // The public history is already present in its timeline, so neither
        // perspective change may replay the centre reveal.
        const switchPage = viewers[0].page;
        await switchPage.goto(`${API}/api/health`);
        await switchPage.evaluate(({ code, token, name }) => {
          localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
        }, { code: room.code, token: room.players[0].token, name: room.players[0].name });
        await switchPage.goto(`${API}/`);
        await expect(switchPage.locator(`.local-player-dock[data-player-anchor="${room.players[0].id}"]`)).toBeVisible();
        const simaSwitchViewer = { page: switchPage, name: "sima-yi-switched-view", errors: viewers[0].errors };
        await assertHistory(simaSwitchViewer, 0, room, rootEvent, rootHistory, testInfo, "r2-four-seat-viewer-switch-sima", false);
        await switchPage.goto(`${API}/api/health`);
        await switchPage.evaluate(({ code, token, name }) => {
          localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
        }, { code: room.code, token: room.players[2].token, name: room.players[2].name });
        await switchPage.goto(`${API}/`);
        await expect(switchPage.locator(`.local-player-dock[data-player-anchor="${room.players[2].id}"]`)).toBeVisible();
        const caoReturnViewer = { page: switchPage, name: "cao-cao-returned-view", errors: viewers[0].errors };
        await assertHistory(caoReturnViewer, 2, room, rootEvent, rootHistory, testInfo, "r2-four-seat-viewer-switch-cao-return", false);
      }

      await passEverySeat(request, room);
      const targetChoice = await view(request, room, 2);
      expect(targetChoice.currentAction?.legalActions).toContain("choose_target_card");
      const discardResponse = await request.post(`${API}/api/rooms`, {
        data: { action: "choose_target_card", code: room.code, token: source.token, targetCardZone: "hand", targetCardIndex: 0 },
      });
      expect(discardResponse.ok()).toBeTruthy();
      const settled = await view(request, room, 3);
      expect(settled.pendingNegation).toBeNull();
      expect(settled.timeline.filter((event) => event?.type === "card" && event.card?.id === room.cards.dismantle)).toHaveLength(1);
      expect(settled.timeline.filter((event) => event?.type === "card" && event.card?.id === room.cards.targetAttack)).toHaveLength(1);
      expect(settled.timeline.some((event) => event?.card?.id === room.cards.hiddenNegation)).toBe(false);
      expect(JSON.stringify(settled.presentationSnapshot ?? {})).not.toContain(room.cards.hiddenNegation);
      for (const viewer of viewers) {
        await expect(viewer.page.locator(`[data-public-card-motion="single-target"][data-public-card-root-event-id="${rootEvent.id}"]`)).toHaveCount(0, { timeout: 20_000 });
      }

      for (const viewer of viewers) {
        const traceDocument = await viewer.page.evaluate(() => sessionStorage.getItem("wtk.game-ux-trace.document.v2"));
        if (viewer.index === 2) {
          expect(traceDocument).toBeTruthy();
          const entries = JSON.parse(traceDocument).entries.filter((entry) => entry.stage === "public-card-journey");
          const requiredEventIds = rootHistory.map(({ event }) => event.id);
          expect(entries.some((entry) => requiredEventIds.includes(entry.data.eventId) && entry.data.visualPhase === "PARKED")).toBe(true);
          expect(JSON.stringify(entries)).not.toContain(room.cards.hiddenNegation);
        }
        await expect(viewer.page.getByText("GAME SCREEN ERROR")).toHaveCount(0);
        expect(viewer.errors).toEqual([]);
      }
    }
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});
