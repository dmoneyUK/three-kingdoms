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
    thirdNegation: `${prefix}-repeat-author-negation`,
    fourthNegation: `${prefix}-fourth-negation`,
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
      ? [card("Negation", cards.firstNegation, "♦"), card("Negation", cards.secondNegation, "♥"), card("Negation", cards.thirdNegation, "♠")]
      : seat === 1
        ? [card("Negation", cards.counterNegation, "♣"), card("Negation", cards.fourthNegation, "♣"), card("Negation", cards.hiddenNegation, "♠")]
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
  const nextWindowId = settled.currentAction?.negationWindowId;
  if (nextWindowId) await adjustWindowClock(request, room, nextWindowId, "hold");
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
    const anchorRects = [...document.querySelectorAll("[data-player-anchor]")].map((candidate) => {
      const bounds = candidate.getBoundingClientRect();
      return {
        playerId: candidate.getAttribute("data-player-anchor"),
        rect: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
      };
    });
    const otherCardRects = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .filter((candidate) => candidate !== element)
      .map((candidate) => {
        const bounds = candidate.getBoundingClientRect();
        return {
          eventId: candidate.getAttribute("data-public-card-journey-event-id"),
          actorId: candidate.getAttribute("data-public-card-journey-actor-id"),
          rect: { left: bounds.left, top: bounds.top, width: bounds.width, height: bounds.height },
        };
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
        top: base.top + (horizontalProgression ? 0 : cardIndex * 78),
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
      anchorRects,
      otherCardRects,
      expected,
      layoutChangeReason: element.getAttribute("data-public-card-journey-layout-reason"),
    };
  }, { actorId, actorIndex });
}

function assertActorParking(geometry, requireRevealTimestamp = true) {
  expect(Math.abs(geometry.actualRect.width - 48), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.actualRect.height - 72), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.actualRect.left - geometry.targetRect.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.actualRect.top - geometry.targetRect.top)).toBeLessThanOrEqual(1);
  expect(geometry.actorAnchorRect).toBeTruthy();
  if (requireRevealTimestamp) expect(geometry.revealStartedAt).toBeTruthy();
  expect(geometry.expected).toBeTruthy();
  const nearestAllowedParking = Math.min(...geometry.expected.candidates.map((candidate) =>
    Math.abs(geometry.targetRect.left - candidate.left) + Math.abs(geometry.targetRect.top - candidate.top)));
  const topSeatPocket = geometry.expected.side === "top" && geometry.actorAnchorKind === "opponent"
    && geometry.targetRect.left >= geometry.actorAnchorRect.left - 2
    && geometry.targetRect.left + geometry.targetRect.width <= geometry.actorAnchorRect.left + geometry.actorAnchorRect.width + 2
    && Math.abs(geometry.targetRect.top - geometry.expected.candidates[0].top) <= 2;
  const verticalGapToSeat = Math.max(
    geometry.targetRect.top - (geometry.actorAnchorRect.top + geometry.actorAnchorRect.height),
    geometry.actorAnchorRect.top - (geometry.targetRect.top + geometry.targetRect.height),
    0,
  );
  const sideSeatFrontPocket = geometry.actorAnchorKind === "opponent"
    && ((geometry.expected.side === "left"
      && geometry.targetRect.left >= geometry.actorAnchorRect.left + geometry.actorAnchorRect.width - 2
      && geometry.targetRect.left - (geometry.actorAnchorRect.left + geometry.actorAnchorRect.width) <= geometry.targetRect.width + 12
      && verticalGapToSeat <= geometry.targetRect.height + 16)
    || (geometry.expected.side === "right"
      && geometry.targetRect.left + geometry.targetRect.width <= geometry.actorAnchorRect.left + 2
      && geometry.actorAnchorRect.left - (geometry.targetRect.left + geometry.targetRect.width) <= geometry.targetRect.width + 12
      && verticalGapToSeat <= geometry.targetRect.height + 16));
  expect(nearestAllowedParking <= 2 || topSeatPocket || sideSeatFrontPocket, JSON.stringify(geometry, null, 2)).toBe(true);
}

async function assertHistory(viewer, viewerIndex, room, rootEvent, history, testInfo, screenshotLabel, requireRevealTimestamp = true) {
  const display = viewer.page.locator(`[data-public-card-motion="single-target"][data-public-card-root-event-id="${rootEvent.id}"]`);
  await expect(display).toHaveCount(1, `viewer ${viewer.name} should have one owner for the proven Dismantle root`);
  await expect(display).toHaveAttribute("data-public-card-viewer-id", room.players[viewerIndex].id);
  await expect(display).toHaveAttribute("data-public-card-ordinal-context", "negation-chain");
  const accessibleHistory = display.locator('ol[aria-label="Chronological Negation chain history"] li');
  await expect(accessibleHistory).toHaveCount(history.length);
  const rows = [];
  const ordinalBadges = [];
  for (const [ordinalIndex, item] of history.entries()) {
    await expect(accessibleHistory.nth(ordinalIndex)).toContainText(`Negation chain step ${ordinalIndex + 1}`);
    const cardElement = display.locator(`[data-public-card-journey-event-id="${item.event.id}"]`);
    await expect(cardElement).toBeVisible();
    await expect(cardElement).toHaveAttribute("data-public-card-journey-actor-id", item.actor.id);
    await expect(cardElement).toHaveAttribute("data-public-card-journey-card-id", item.cardId);
    await expect(cardElement).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 20_000 });
    await expect(cardElement).toHaveAttribute("data-public-card-journey-layout-pending", "false");
    await expect.poll(() => cardElement.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      const targetWidth = Number(element.getAttribute("data-public-card-journey-target-width"));
      const targetHeight = Number(element.getAttribute("data-public-card-journey-target-height"));
      const targetLeft = Number(element.getAttribute("data-public-card-journey-target-left"));
      const targetTop = Number(element.getAttribute("data-public-card-journey-target-top"));
      return Math.max(
        Math.abs(rect.width - targetWidth),
        Math.abs(rect.height - targetHeight),
        Math.abs(rect.left - targetLeft),
        Math.abs(rect.top - targetTop),
      );
    }), { timeout: 5_000 }).toBeLessThanOrEqual(1);
    const ordinalState = await cardElement.evaluate((element) => ({
      ordinal: element.getAttribute("data-public-card-journey-ordinal"),
      badgeText: element.querySelector(".public-card-journey-ordinal")?.textContent ?? null,
      ariaLabel: element.getAttribute("aria-label"),
    }));
    expect(ordinalState.ordinal, JSON.stringify(ordinalState)).toBe(String(ordinalIndex + 1));
    expect(ordinalState.badgeText, JSON.stringify(ordinalState)).toBe(`#${ordinalIndex + 1}`);
    expect(ordinalState.ariaLabel, JSON.stringify(ordinalState)).toMatch(new RegExp(`Negation chain step ${ordinalIndex + 1}`));
    const badgeBox = await cardElement.locator(".public-card-journey-ordinal").boundingBox();
    expect(badgeBox?.width).toBeGreaterThanOrEqual(18);
    expect(badgeBox?.height).toBeGreaterThanOrEqual(18);
    expect(await cardElement.locator(".public-card-journey-ordinal").evaluate((element) => getComputedStyle(element).fontSize)).toBe("12px");
    const actorCardIndex = history.slice(0, ordinalIndex).filter(({ actor }) => actor.id === item.actor.id).length;
    const geometry = await readGeometry(viewer.page, item.event.id, item.actor.id, actorCardIndex);
    assertActorParking(geometry, requireRevealTimestamp);
    ordinalBadges.push({ box: badgeBox, eventId: item.event.id, cardRect: geometry.actualRect });
    rows.push(geometry);
  }
  for (let first = 0; first < ordinalBadges.length; first += 1) {
    for (let second = first + 1; second < ordinalBadges.length; second += 1) {
      const a = ordinalBadges[first].box;
      const b = ordinalBadges[second].box;
      const overlaps = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
      expect(overlaps, `ordinal badges ${first + 1} and ${second + 1} must remain distinct for ${viewer.name} at ${JSON.stringify(viewer.page.viewportSize())}: ${JSON.stringify([ordinalBadges[first], ordinalBadges[second]])}`).toBe(false);
    }
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

async function assertCurrentOrdinal(viewer, room, rootEvent, event, ordinal) {
  const display = viewer.page.locator(`[data-public-card-motion="single-target"][data-public-card-root-event-id="${rootEvent.id}"]`);
  const cardElement = display.locator(`[data-public-card-journey-event-id="${event.id}"]`);
  await expect(cardElement).toBeVisible();
  await expect(cardElement).toHaveAttribute("data-public-card-journey-ordinal", String(ordinal));
  await expect(cardElement.locator(".public-card-journey-ordinal")).toHaveText(`#${ordinal}`);
  const advancingCards = display.locator('[data-public-card-journey-phase="reveal"], [data-public-card-journey-phase="move"]');
  const advancingCount = await advancingCards.count();
  expect(advancingCount, `${viewer.name} has at most one card in the centre reveal/move path`).toBeLessThanOrEqual(1);
  if (advancingCount === 1) {
    await expect(advancingCards).toHaveAttribute("data-public-card-journey-event-id", event.id);
  }
  const badgeStyle = await cardElement.locator(".public-card-journey-ordinal").evaluate((badge) => ({
    fontSize: getComputedStyle(badge).fontSize,
    rect: (() => { const rect = badge.getBoundingClientRect(); return { width: rect.width, height: rect.height }; })(),
  }));
  expect(badgeStyle.fontSize).toBe("12px");
  expect(badgeStyle.rect.width).toBeGreaterThanOrEqual(18);
  expect(badgeStyle.rect.height).toBeGreaterThanOrEqual(18);
}

test("R2 Negation causal history survives a cancelled root and parks on true actors at 4/6/8 seats", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(360_000);
  const viewers = [
    { index: 2, name: "cao-cao", viewport: { width: 390, height: 844 }, page, errors: [] },
    { index: 0, name: "sima-yi", viewport: { width: 440, height: 894 }, page: null, errors: [] },
    { index: 1, name: "xu-chu", viewport: { width: 480, height: 900 }, page: null, errors: [] },
    { index: 3, name: "target", viewport: { width: 390, height: 700 }, page: null, errors: [] },
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

    const requestedCounts = process.env.R2_PLAYER_COUNTS
      ? process.env.R2_PLAYER_COUNTS.split(",").map((count) => Number(count.trim()))
      : [4, 6, 8];
    for (const playerCount of requestedCounts) {
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
      const dismantleWindowId = dismantleOpened.room.currentAction?.negationWindowId;
      expect(dismantleWindowId).toBeTruthy();
      await adjustWindowClock(request, room, dismantleWindowId, "hold");
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
      await Promise.all(viewers.map((viewer) => assertCurrentOrdinal(viewer, room, rootEvent, firstDismantleNegation.event, 2)));
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
      await Promise.all(viewers.map((viewer) => assertCurrentOrdinal(viewer, room, rootEvent, secondDismantleNegation.event, 3)));
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

      const thirdDismantleNegation = await submitWinningNegation(request, room, 0, room.cards.thirdNegation);
      rootHistory.push({ event: thirdDismantleNegation.event, actor: room.players[0], cardId: room.cards.thirdNegation });
      await Promise.all(viewers.map((viewer) => assertCurrentOrdinal(viewer, room, rootEvent, thirdDismantleNegation.event, 4)));
      const thirdCounterState = await view(request, room, 3);
      const thirdCounterChain = thirdCounterState.presentationSnapshot?.reactionChain;
      expect(thirdCounterChain?.semantics).toBe("PROVEN");
      expect(thirdCounterChain?.interactionId).toBe(rootCausalId);
      expect(thirdCounterChain?.publicEventLinks?.nodes?.map(({ eventId }) => eventId)).toEqual(rootHistory.slice(1).map(({ event }) => event.id));
      expect(thirdCounterChain?.nodes?.map(({ actorId }) => actorId)).toEqual([room.players[0].id, room.players[1].id, room.players[0].id]);
      await Promise.all(viewers.map((viewer) => assertHistory(viewer, viewer.index, room, rootEvent, rootHistory, testInfo, `r2-${playerCount}-third-counter`)));

      const fourthDismantleNegation = await submitWinningNegation(request, room, 1, room.cards.fourthNegation);
      rootHistory.push({ event: fourthDismantleNegation.event, actor: room.players[1], cardId: room.cards.fourthNegation });
      await Promise.all(viewers.map((viewer) => assertCurrentOrdinal(viewer, room, rootEvent, fourthDismantleNegation.event, 5)));
      const finalChainState = await view(request, room, 3);
      const finalChain = finalChainState.presentationSnapshot?.reactionChain;
      expect(finalChain?.semantics).toBe("PROVEN");
      expect(finalChain?.interactionId).toBe(rootCausalId);
      expect(finalChain?.publicEventLinks?.root?.eventId).toBe(rootEvent.id);
      expect(finalChain?.publicEventLinks?.nodes?.map(({ eventId }) => eventId)).toEqual(rootHistory.slice(1).map(({ event }) => event.id));
      expect(finalChain?.nodes?.map(({ actorId }) => actorId)).toEqual([room.players[0].id, room.players[1].id, room.players[0].id, room.players[1].id]);
      const finalWindowId = finalChainState.currentAction?.negationWindowId;
      expect(finalWindowId).toBeTruthy();
      await adjustWindowClock(request, room, finalWindowId, "hold");
      for (const viewerIndex of [0, 1, 2, 3]) {
        const viewerState = await view(request, room, viewerIndex);
        expect(viewerState.currentAction?.negationWindowId).toBe(finalChainState.currentAction.negationWindowId);
        expect(viewerState.presentationSnapshot?.reactionChain?.publicEventLinks).toEqual(finalChain?.publicEventLinks);
        expect(viewerState.presentationSnapshot?.reactionChain?.nodes?.map(({ actorId }) => actorId)).toEqual([room.players[0].id, room.players[1].id, room.players[0].id, room.players[1].id]);
      }

      if (playerCount === 4) {
        // Re-authenticate the same browser through two genuine seat tokens while
        // the completed public chain is still in its read window.
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

      await Promise.all(viewers.map((viewer) => assertHistory(
        viewer,
        viewer.index,
        room,
        rootEvent,
        rootHistory,
        testInfo,
        `r2-${playerCount}-fourth-counter`,
        !(playerCount === 4 && viewer.index === 2),
      )));

      for (const viewer of viewers) {
        await viewer.page.reload();
        await expect(viewer.page.locator(".game-shell")).toBeVisible();
        await expect(viewer.page.locator(`[data-public-card-motion="single-target"][data-public-card-root-event-id="${rootEvent.id}"] .public-card-journey-card`)).toHaveCount(5);
        await expect(viewer.page.locator(`[data-public-card-motion="single-target"][data-public-card-root-event-id="${rootEvent.id}"] .public-card-journey-card[data-public-card-journey-phase="parked"]`)).toHaveCount(5);
        await expect(viewer.page.locator(`[data-public-card-motion="single-target"] [data-public-card-journey-card-id="${room.cards.hiddenNegation}"]`)).toHaveCount(0);
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
