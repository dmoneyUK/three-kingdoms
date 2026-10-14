import { expect, test } from "@playwright/test";
import { writeFile } from "node:fs/promises";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠") => ({ id, kind, suit, rank: "7" });

async function seed(request, prefix) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      deck: [card("Attack", `${prefix}-deck-attack`), card("Dodge", `${prefix}-deck-dodge`)],
      players: [
        { name: `${prefix} SOURCE`, role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [card("DrawTwo", `${prefix}-root`)] },
        { name: `${prefix} PRIORITY NEGATOR`, role: "Loyalist", hero: "liu-bei", hp: 4, maxHp: 4, hand: [card("Negation", `${prefix}-priority-negation`, "♦")] },
        { name: `${prefix} LATER NEGATOR`, role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [card("Negation", `${prefix}-later-negation`, "♥")] },
        { name: `${prefix} OBSERVER`, role: "Renegade", hero: "simayi", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`N3 Negation room seed failed: ${await response.text()}`);
  return { ...(await response.json()), prefix };
}

async function openPlayer(page, room, index, width, height = 894) {
  const player = room.players[index];
  await page.setViewportSize({ width, height });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return player;
}

async function installRevealTimingCapture(page, roomCode) {
  await page.evaluate((code) => {
    const capture = {
      pollResponses: [],
      actionResponses: [],
      firstFullSizePaints: [],
    };
    (window).__n3RevealTiming = capture;
    const roomDetails = (payload) => {
      const room = payload?.room ?? payload;
      return {
        events: Array.isArray(room?.timeline)
          ? room.timeline.filter((event) => event?.type === "card" && event.action === "play" && event.card?.kind === "Negation")
            .map((event) => ({ eventId: event.id, cardId: event.card.id, actorName: event.player }))
          : [],
        phase: room?.phase ?? null,
        negationWindowId: room?.currentAction?.negationWindowId ?? null,
        negationDeadline: room?.pendingNegation?.deadline ?? null,
      };
    };
    const nativeFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const rawUrl = typeof input === "string" ? input : input instanceof Request ? input.url : String(input);
      const url = new URL(rawUrl, location.href);
      const method = String(init?.method ?? (input instanceof Request ? input.method : "GET")).toUpperCase();
      let requestBody = null;
      try {
        if (init?.body) requestBody = JSON.parse(String(init.body));
        else if (input instanceof Request) requestBody = await input.clone().json();
      } catch {
        requestBody = null;
      }
      const requestStartedAtEpochMs = performance.timeOrigin + performance.now();
      const response = await nativeFetch(input, init);
      const requestRoomCode = url.searchParams.get("code") ?? requestBody?.code;
      if (url.pathname === "/api/rooms" && requestRoomCode === code) {
        const details = roomDetails(await response.clone().json().catch(() => null));
        if (method === "GET") {
          capture.pollResponses.push({
            requestStartedAtEpochMs,
            atEpochMs: performance.timeOrigin + performance.now(),
            ...details,
          });
        }
        if (details.events.length) {
          const entry = { requestStartedAtEpochMs, atEpochMs: performance.timeOrigin + performance.now(), events: details.events };
          if (method !== "GET") capture.actionResponses.push({ ...entry, action: requestBody?.action ?? null });
        }
      }
      return response;
    };

    const seen = new Set();
    const pending = new Set();
    const inspect = () => {
      for (const element of document.querySelectorAll("[data-public-card-journey-event-id]")) {
        const eventId = element.getAttribute("data-public-card-journey-event-id");
        const cardId = element.getAttribute("data-public-card-journey-card-id");
        if (!eventId || !cardId || seen.has(eventId) || pending.has(eventId)
          || element.getAttribute("data-public-card-journey-phase") !== "reveal") continue;
        const rect = element.getBoundingClientRect();
        if (rect.width < 80 || rect.height < 120) continue;
        pending.add(eventId);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          const current = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
            .find((candidate) => candidate.getAttribute("data-public-card-journey-event-id") === eventId);
          const currentRect = current?.getBoundingClientRect();
          pending.delete(eventId);
          if (!current || !currentRect || current.getAttribute("data-public-card-journey-phase") !== "reveal"
            || currentRect.width < 80 || currentRect.height < 120) return;
          seen.add(eventId);
          capture.firstFullSizePaints.push({
            eventId,
            cardId,
            actorId: current.getAttribute("data-public-card-journey-actor-id"),
            atEpochMs: performance.timeOrigin + performance.now(),
            rect: { left: currentRect.left, top: currentRect.top, width: currentRect.width, height: currentRect.height },
          });
        }));
      }
    };
    new MutationObserver(inspect).observe(document.documentElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-public-card-journey-phase", "style"],
    });
    inspect();
  }, roomCode);
}

async function view(request, room, index) {
  const response = await request.get(`${API}/api/rooms?code=${room.code}&token=${room.players[index].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function adjustWindowClock(request, room, windowId, mode) {
  const response = await request.post(`${API}/__test/negation-window-clock`, { data: { code: room.code, windowId, mode } });
  expect(response.ok()).toBeTruthy();
  expect(await response.json()).toMatchObject({ adjusted: true });
}

async function submit(request, room, index, action, windowId) {
  const player = room.players[index];
  const response = await request.post(`${API}/api/rooms`, {
    data: {
      action,
      code: room.code,
      token: player.token,
      context: { windowId },
      ...(action === "respond" ? { providerId: "negation_card", cardId: `${room.prefix}-${index === 1 ? "priority" : "later"}-negation` } : {}),
    },
  });
  if (!response.ok()) throw new Error(`N3 ${action} from ${player.name} failed: ${await response.text()}`);
  return response.json();
}

async function capturePublicReveal(page, cardId, testInfo, label, timeout = 5_000) {
  await page.waitForFunction((id) => (window).__n3RevealTiming?.firstFullSizePaints.some((entry) => entry.cardId === id), cardId, { timeout });
  const evidence = await page.evaluate((id) => {
    const timing = (window).__n3RevealTiming;
    const paint = timing.firstFullSizePaints.find((entry) => entry.cardId === id);
    const receipts = [
      ...timing.pollResponses.map((entry) => ({ ...entry, channel: "poll" })),
      ...timing.actionResponses.map((entry) => ({ ...entry, channel: "action" })),
    ].filter((entry) => entry.events.some((event) => event.cardId === id)).sort((left, right) => left.atEpochMs - right.atEpochMs);
    return { paint, receipt: receipts[0] ?? null, receipts };
  }, cardId);
  expect(evidence.paint).toBeTruthy();
  expect(evidence.receipt).toBeTruthy();
  expect(evidence.paint.rect.width).toBeCloseTo(90, 0);
  expect(evidence.paint.rect.height).toBeCloseTo(135, 0);
  const receivedToPaintMs = evidence.paint.atEpochMs - evidence.receipt.atEpochMs;
  expect(receivedToPaintMs).toBeGreaterThanOrEqual(0);
  expect(receivedToPaintMs).toBeLessThan(300);
  await testInfo.attach(`${label}-timing.json`, {
    body: JSON.stringify({ ...evidence, receivedToPaintMs }, null, 2),
    contentType: "application/json",
  });
  await testInfo.attach(`${label}-first-full-size.png`, {
    body: await page.screenshot({ fullPage: true }),
    contentType: "image/png",
  });
  return { ...evidence, receivedToPaintMs };
}

async function waitForRevealElapsed(page, cardId, paintEpochMs, elapsedMs) {
  await page.waitForFunction(({ id, startedAt, elapsed }) => {
    const cardElement = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((element) => element.getAttribute("data-public-card-journey-card-id") === id);
    return cardElement?.getAttribute("data-public-card-journey-phase") === "reveal"
      && performance.timeOrigin + performance.now() - startedAt >= elapsed;
  }, { id: cardId, startedAt: paintEpochMs, elapsed: elapsedMs }, { timeout: elapsedMs + 2_000 });
}

async function waitForHeldWindowOnClient(page, windowId) {
  await page.waitForFunction((id) => (window).__n3RevealTiming?.pollResponses.some((entry) => entry.negationWindowId === id), windowId);
  await page.waitForFunction((id) => (window).__n3RevealTiming?.pollResponses.some((entry) => entry.negationWindowId === id
    && Number.isFinite(entry.negationDeadline) && entry.negationDeadline - Date.now() > 45_000), windowId);
}

async function clickLocalPass(page) {
  const pass = page.getByRole("button", { name: "Pass", exact: true });
  await expect(pass).toBeEnabled();
  await pass.click();
}

test("early competing Negations reveal in commit order, interrupt the prior reveal, and restore without replay at 390px", async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  const room = await seed(request, "N3 EARLY");
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) pageErrors.push(message.text());
  });
  await openPlayer(page, room, 3, 390, 844);
  await installRevealTimingCapture(page, room.code);

  const rootResponse = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: `${room.prefix}-root` },
  });
  expect(rootResponse.ok()).toBeTruthy();
  const opened = (await rootResponse.json()).room;
  const rootEvent = opened.timeline.find((event) => event.type === "card" && event.card?.id === `${room.prefix}-root`);
  const windowId = opened.currentAction?.negationWindowId;
  expect(rootEvent).toBeTruthy();
  expect(windowId).toBeTruthy();
  expect(opened.currentAction.deadline - opened.responseCountdownVisibleAt).toBe(8_000);
  await adjustWindowClock(request, room, windowId, "hold");
  await waitForHeldWindowOnClient(page, windowId);

  const rootJourney = page.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`);
  await expect(rootJourney).toHaveAttribute("data-public-card-journey-phase", "reveal", { timeout: 5_000 });
  const rootStart = await page.evaluate((id) => {
    const element = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
      .find((candidate) => candidate.getAttribute("data-public-card-journey-event-id") === id);
    return element?.getBoundingClientRect().toJSON() ?? null;
  }, rootEvent.id);
  expect(rootStart?.width).toBeCloseTo(90, 0);
  expect(rootStart?.height).toBeCloseTo(135, 0);

  // Two private intents compete. Neither physical Negation may appear publicly
  // until every living seat has submitted and the server commits its priority winner.
  await submit(request, room, 2, "respond", windowId);
  let publicRoom = await view(request, room, 0);
  expect(publicRoom.timeline.some((event) => event.card?.kind === "Negation")).toBe(false);
  expect(JSON.stringify(publicRoom)).not.toContain(`${room.prefix}-later-negation`);

  await submit(request, room, 1, "respond", windowId);
  publicRoom = await view(request, room, 0);
  expect(publicRoom.timeline.some((event) => event.card?.kind === "Negation")).toBe(false);
  await submit(request, room, 0, "decline_response", windowId);

  await clickLocalPass(page);
  const committedRoom = await view(request, room, 3);
  const winners = committedRoom.timeline.filter((event) => event.type === "card" && event.action === "play" && event.card?.kind === "Negation");
  expect(winners).toHaveLength(1);
  expect(winners[0]).toMatchObject({ player: room.players[1].name, card: { id: `${room.prefix}-priority-negation` } });
  expect(JSON.stringify(committedRoom.timeline)).not.toContain(`${room.prefix}-later-negation`);
  const result = await capturePublicReveal(page, `${room.prefix}-priority-negation`, testInfo, "n3-early-390");
  expect(result.receivedToPaintMs).toBeLessThan(300);

  const winnerCard = page.locator(`[data-public-card-journey-card-id="${room.prefix}-priority-negation"]`);
  await expect(winnerCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
  await expect(rootJourney).not.toHaveAttribute("data-public-card-journey-phase", "reveal");

  const priorityView = await view(request, room, 1);
  const losingView = await view(request, room, 2);
  expect(priorityView.myHand.some((held) => held.id === `${room.prefix}-priority-negation`)).toBe(false);
  expect(losingView.myHand.some((held) => held.id === `${room.prefix}-later-negation`)).toBe(true);
  expect(JSON.stringify(losingView.timeline)).not.toContain(`${room.prefix}-later-negation`);

  const counterWindowId = committedRoom.currentAction?.negationWindowId;
  expect(counterWindowId).toBeTruthy();
  await adjustWindowClock(request, room, counterWindowId, "hold");
  await waitForHeldWindowOnClient(page, counterWindowId);
  await submit(request, room, 2, "respond", counterWindowId);
  await submit(request, room, 0, "decline_response", counterWindowId);
  await submit(request, room, 1, "decline_response", counterWindowId);
  await clickLocalPass(page);
  const counterRoom = await view(request, room, 3);
  const counterEvents = counterRoom.timeline.filter((event) => event.type === "card"
    && event.action === "play" && event.card?.kind === "Negation");
  expect(counterEvents).toHaveLength(2);
  expect(counterEvents[1]).toMatchObject({ player: room.players[2].name, card: { id: `${room.prefix}-later-negation` } });
  const counterReveal = await capturePublicReveal(page, `${room.prefix}-later-negation`, testInfo, "n3-counter-390");
  expect(counterReveal.receivedToPaintMs).toBeLessThan(300);
  const firstWinningCard = page.locator(`[data-public-card-journey-card-id="${room.prefix}-priority-negation"]`);
  await expect(firstWinningCard).not.toHaveAttribute("data-public-card-journey-phase", "reveal");
  const latestCounterCard = page.locator(`[data-public-card-journey-card-id="${room.prefix}-later-negation"]`);
  await expect(latestCounterCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
  await waitForRevealElapsed(page, `${room.prefix}-later-negation`, counterReveal.paint.atEpochMs, 3_500);
  const counterGeometry = await latestCounterCard.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { phase: element.getAttribute("data-public-card-journey-phase"), width: rect.width, height: rect.height };
  });
  expect(counterGeometry).toEqual({ phase: "reveal", width: 90, height: 135 });
  await testInfo.attach("n3-counter-390-at-3.5s.png", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });

  await page.reload();
  await expect(page.locator(".game-shell")).toBeVisible();
  const restored = await page.locator(".public-card-journey-card").evaluateAll((elements) => elements.map((element) => ({
    eventId: element.getAttribute("data-public-card-journey-event-id"),
    cardId: element.getAttribute("data-public-card-journey-card-id"),
    phase: element.getAttribute("data-public-card-journey-phase"),
  })));
  expect(restored).toHaveLength(3);
  expect(restored.map((entry) => entry.eventId)).toEqual([rootEvent.id, winners[0].id, counterEvents[1].id]);
  expect(restored.every((entry) => entry.phase === "parked")).toBe(true);
  expect(restored.map((entry) => entry.cardId)).toEqual([`${room.prefix}-root`, `${room.prefix}-priority-negation`, `${room.prefix}-later-negation`]);
  expect(pageErrors).toEqual([]);

  const metricsPath = testInfo.outputPath("n3-early-commit-timing.json");
  await writeFile(metricsPath, JSON.stringify({
    viewport: { width: 390, height: 844 },
    windowDurationMs: opened.currentAction.deadline - opened.responseCountdownVisibleAt,
    firstNegationReceiptChannel: result.receipt.channel,
    firstNegationReceiptToFirstFullSizePaintMs: result.receivedToPaintMs,
    counterNegationReceiptChannel: counterReveal.receipt.channel,
    counterNegationReceiptToFirstFullSizePaintMs: counterReveal.receivedToPaintMs,
    firstFullSizeRect: result.paint.rect,
  }, null, 2));
  await testInfo.attach("n3-early-commit-timing.json", { path: metricsPath, contentType: "application/json" });
});

test("deadline settlement with one silent seat promptly reveals its committed Negation at 440px and 480px", async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  const results = [];
  for (const width of [440, 480]) {
    const room = await seed(request, `N3 EXPIRY ${width}`);
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
    page.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) pageErrors.push(message.text());
    });
    await openPlayer(page, room, 3, width, width === 440 ? 894 : 900);
    await installRevealTimingCapture(page, room.code);
    const rootResponse = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: `${room.prefix}-root` },
    });
    expect(rootResponse.ok()).toBeTruthy();
    const opened = (await rootResponse.json()).room;
    const windowId = opened.currentAction?.negationWindowId;
    expect(windowId).toBeTruthy();
    expect(opened.currentAction.deadline - opened.responseCountdownVisibleAt).toBe(8_000);
    await page.waitForFunction((id) => (window).__n3RevealTiming?.pollResponses.some((entry) => entry.negationWindowId === id), windowId);

    // Two seats explicitly respond; seat 4 remains silent. Before expiry the
    // stored intent is private and must not appear in any public card proof.
    await submit(request, room, 0, "decline_response", windowId);
    await submit(request, room, 1, "respond", windowId);
    await submit(request, room, 2, "decline_response", windowId);
    const beforeExpiry = await view(request, room, 3);
    expect(beforeExpiry.pendingNegation?.submitted).toBe(false);
    expect(beforeExpiry.timeline.some((event) => event.card?.kind === "Negation")).toBe(false);
    expect(JSON.stringify(beforeExpiry)).not.toContain(`${room.prefix}-priority-negation`);

    // Keep the original server deadline. Let this foreground client reach its
    // normal response-timeout action and observe the resulting public commit.
    const reveal = await capturePublicReveal(page, `${room.prefix}-priority-negation`, testInfo, `n3-expiry-${width}`, 16_000);
    const committedRoom = await view(request, room, 3);
    const winners = committedRoom.timeline.filter((event) => event.type === "card"
      && event.action === "play" && event.card?.kind === "Negation");
    expect(winners).toHaveLength(1);
    expect(winners[0]).toMatchObject({ player: room.players[1].name, card: { id: `${room.prefix}-priority-negation` } });
    const cardId = `${room.prefix}-priority-negation`;
    await page.waitForFunction((id) => (window).__n3RevealTiming?.actionResponses.some((entry) =>
      entry.events.some((event) => event.cardId === id) && ["advance_timers", "decline_response"].includes(entry.action)), cardId, { timeout: 3_000 });
    const deadlineAction = await page.evaluate((id) => (window).__n3RevealTiming.actionResponses.find((entry) =>
      entry.events.some((event) => event.cardId === id) && ["advance_timers", "decline_response"].includes(entry.action)), cardId);
    expect(deadlineAction).toBeTruthy();
    const timing = { width, openedDurationMs: opened.currentAction.deadline - opened.responseCountdownVisibleAt,
      deadlineAction: deadlineAction.action,
      deadlineToTimerRequestMs: deadlineAction.requestStartedAtEpochMs - opened.currentAction.deadline,
      timerRequestToResponseMs: deadlineAction.atEpochMs - deadlineAction.requestStartedAtEpochMs,
      deadlineActionResponseToFirstFullSizePaintMs: reveal.paint.atEpochMs - deadlineAction.atEpochMs,
      publicEventReceiptChannel: reveal.receipt.channel,
      publicEventReceiptToFirstPaintMs: reveal.receivedToPaintMs,
      firstFullSizePaintEpochMs: reveal.paint.atEpochMs,
      firstFullSizeRect: reveal.paint.rect };
    results.push(timing);
    await testInfo.attach(`n3-expiry-${width}-commit-to-paint.json`, {
      body: JSON.stringify(timing, null, 2),
      contentType: "application/json",
    });
    // The silent seat stays unanswered until its original eight-second limit.
    // The timeout action reaches the server at that deadline, and its returned
    // public event paints directly rather than waiting for another poll.
    expect(deadlineAction.requestStartedAtEpochMs - opened.currentAction.deadline).toBeGreaterThanOrEqual(-100);
    expect(deadlineAction.requestStartedAtEpochMs - opened.currentAction.deadline).toBeLessThan(1_500);
    expect(deadlineAction.atEpochMs - deadlineAction.requestStartedAtEpochMs).toBeLessThan(1_500);
    expect(reveal.receivedToPaintMs).toBeLessThan(300);
    const windowCard = page.locator(`[data-public-card-journey-card-id="${room.prefix}-priority-negation"]`);
    await expect(windowCard).toHaveAttribute("data-public-card-journey-phase", "reveal");
    if (width === 440) {
      await waitForRevealElapsed(page, `${room.prefix}-priority-negation`, reveal.paint.atEpochMs, 3_500);
      const geometry = await windowCard.evaluate((element) => {
        const rect = element.getBoundingClientRect();
        return { phase: element.getAttribute("data-public-card-journey-phase"), width: rect.width, height: rect.height };
      });
      expect(geometry).toEqual({ phase: "reveal", width: 90, height: 135 });
      await testInfo.attach("n3-expiry-440-at-3.5s.png", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
    }
    expect(pageErrors).toEqual([]);
  }
  const path = testInfo.outputPath("n3-expiry-390-440-480-timing.json");
  await writeFile(path, JSON.stringify(results, null, 2));
  await testInfo.attach("n3-expiry-440-480-timing.json", { path, contentType: "application/json" });
});

test("early all-Pass closes without publishing a stored private Negation intent", async ({ page, request }, testInfo) => {
  test.setTimeout(45_000);
  const room = await seed(request, "N3 ALL PASS");
  const pageErrors = [];
  page.on("pageerror", (error) => pageErrors.push(`${error.name}: ${error.message}`));
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("[GameRoom render failure]")) pageErrors.push(message.text());
  });
  await openPlayer(page, room, 3, 480, 900);
  await installRevealTimingCapture(page, room.code);
  const rootResponse = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: room.code, token: room.players[0].token, cardId: `${room.prefix}-root` },
  });
  expect(rootResponse.ok()).toBeTruthy();
  const opened = (await rootResponse.json()).room;
  const windowId = opened.currentAction?.negationWindowId;
  expect(windowId).toBeTruthy();
  const durationMs = opened.currentAction.deadline - opened.responseCountdownVisibleAt;
  expect(durationMs).toBe(8_000);
  await adjustWindowClock(request, room, windowId, "hold");
  await waitForHeldWindowOnClient(page, windowId);
  await submit(request, room, 0, "decline_response", windowId);
  await submit(request, room, 1, "decline_response", windowId);
  await submit(request, room, 2, "decline_response", windowId);
  const passStartedAt = Date.now();
  await clickLocalPass(page);
  const passCompletedAt = Date.now();
  const finalRoom = await view(request, room, 3);
  expect(passCompletedAt - passStartedAt).toBeLessThan(1_500);
  expect(finalRoom.currentAction?.negationWindowId).toBeFalsy();
  expect(finalRoom.timeline.some((event) => event.type === "card" && event.action === "play" && event.card?.kind === "Negation")).toBe(false);
  expect(JSON.stringify(finalRoom.timeline)).not.toContain(`${room.prefix}-priority-negation`);
  expect(JSON.stringify(finalRoom.timeline)).not.toContain(`${room.prefix}-later-negation`);
  const priorityView = await view(request, room, 1);
  const laterView = await view(request, room, 2);
  const observerView = await view(request, room, 3);
  expect(priorityView.myHand.some((held) => held.id === `${room.prefix}-priority-negation`)).toBe(true);
  expect(laterView.myHand.some((held) => held.id === `${room.prefix}-later-negation`)).toBe(true);
  expect(JSON.stringify(observerView)).not.toContain(`${room.prefix}-priority-negation`);
  expect(JSON.stringify(observerView)).not.toContain(`${room.prefix}-later-negation`);
  await expect(page.locator(`[data-public-card-journey-card-id="${room.prefix}-priority-negation"]`)).toHaveCount(0);
  await expect(page.locator(`[data-public-card-journey-card-id="${room.prefix}-later-negation"]`)).toHaveCount(0);
  expect(pageErrors).toEqual([]);
  await testInfo.attach("n3-all-pass-480x900.png", { body: await page.screenshot({ fullPage: true }), contentType: "image/png" });
});
