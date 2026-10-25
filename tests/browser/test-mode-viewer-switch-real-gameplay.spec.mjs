import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

async function postAction(request, action, code, token, values = {}) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, code, token, ...values } });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBeGreaterThanOrEqual(200);
  expect(response.status(), JSON.stringify(body)).toBeLessThan(300);
  return body;
}

async function opponentEquipmentSlotPositions(page, playerId) {
  return page.locator(`.opponent-player-card[data-player-anchor="${playerId}"] .opponent-status-equipment-strip`).evaluate((strip) => {
    const summary = strip.querySelector(".opponent-equipment-summary");
    const summaryLeft = summary.getBoundingClientRect().left;
    return [...summary.querySelectorAll(":scope > .opponent-equipment-slot")].map((slot) => {
      const rect = slot.getBoundingClientRect();
      return { slot: slot.dataset.slot, offset: rect.left - summaryLeft, width: rect.width };
    });
  });
}

async function readRootH4Announcement(page, rootEventId) {
  return page.evaluate((eventId) => {
    const display = document.querySelector(`.public-card-display[data-public-card-root-event-id="${eventId}"]`);
    const announcement = display?.querySelector('[data-public-card-announcement="true"]');
    if (!display || !announcement || announcement.dataset.publicCardAnnouncementPositioned !== "true"
      || getComputedStyle(announcement).visibility !== "visible") return null;
    const bounds = announcement.getBoundingClientRect();
    const table = document.querySelector(".play-table")?.getBoundingClientRect();
    const announcementEventId = announcement.dataset.publicCardAnnouncementEventId ?? "";
    const intersects = (first, second) => first.left < second.right && first.right > second.left
      && first.top < second.bottom && first.bottom > second.top;
    const protectedRects = [...document.querySelectorAll(
      ".opponent-player-card, .player-square, .player-board-status, .visible-countdown, .stage-system-cluster, .public-activity-chip, .local-player-dock, .local-hand-rail, .console-guidance, [data-public-card-copy-anchor-event-id]",
    )].filter((element) => element !== announcement
      && element.dataset.publicCardCopyAnchorEventId !== announcementEventId)
      .map((element) => ({
        label: typeof element.className === "string" ? element.className : element.tagName,
        rect: element.getBoundingClientRect(),
      }))
      .filter(({ rect }) => rect.width > 0 && rect.height > 0 && intersects(bounds, rect))
      .map(({ label }) => label);
    return {
      eventId: announcementEventId,
      interactionId: display.dataset.publicCardInteractionId ?? null,
      rootEventId: display.dataset.publicCardRootEventId ?? null,
      text: announcement.textContent?.trim() ?? "",
      centerOffset: table ? (bounds.left + bounds.right - table.left - table.right) / 2 : null,
      top: bounds.top,
      protectedRects,
    };
  }, rootEventId);
}

async function installQ3LayoutCapture(page, eventId, viewerId) {
  await page.evaluate(({ eventId: watchedEventId, viewerId: watchedViewerId }) => {
    window.__q3LayoutCapture?.stop?.();
    const capture = {
      eventId: watchedEventId,
      viewerId: watchedViewerId,
      samples: [],
      scheduled: false,
      pendingTriggers: new Set(),
      triggerFrames: new Map(),
    };
    const read = () => {
      const card = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
        .find((element) => element.getAttribute("data-public-card-journey-event-id") === watchedEventId);
      const display = card?.closest("[data-public-card-display='true']");
      if (!card || !display) return null;
      const rect = card.getBoundingClientRect();
      const actorId = card.getAttribute("data-public-card-journey-actor-id");
      const anchor = [...document.querySelectorAll("[data-player-anchor]")]
        .find((element) => element.getAttribute("data-player-anchor") === actorId);
      return {
        phase: card.getAttribute("data-public-card-journey-phase"),
        viewerId: display.getAttribute("data-public-card-viewer-id"),
        layoutViewerId: display.getAttribute("data-public-card-layout-viewer-id"),
        localViewerId: document.querySelector(".local-player-dock")?.getAttribute("data-player-anchor") ?? null,
        actorId,
        actorAnchorPresent: Boolean(anchor && anchor.getBoundingClientRect().width > 0 && anchor.getBoundingClientRect().height > 0),
        displayPending: display.getAttribute("data-public-card-layout-pending"),
        displayClass: display.className,
        cardPending: card.getAttribute("data-public-card-journey-layout-pending"),
        cardClass: card.className,
        visibility: getComputedStyle(card).visibility,
        actual: { left: rect.left, top: rect.top },
        target: {
          left: Number(card.getAttribute("data-public-card-journey-target-left")),
          top: Number(card.getAttribute("data-public-card-journey-target-top")),
        },
        transitionProperty: getComputedStyle(card).transitionProperty,
        activeTransitions: card.getAnimations().filter((animation) => animation.playState === "running").length,
        revealStartedAt: card.getAttribute("data-public-card-journey-reveal-started-at"),
      };
    };
    const sample = (label) => {
      const values = read();
      if (values) capture.samples.push({ label, ...values });
    };
    const requestFrames = (trigger) => {
      capture.pendingTriggers.add(trigger);
      if (capture.scheduled) return;
      capture.scheduled = true;
      const next = () => {
        for (const pendingTrigger of capture.pendingTriggers) {
          const frame = capture.triggerFrames.get(pendingTrigger) ?? 0;
          if (frame >= 3) continue;
          capture.triggerFrames.set(pendingTrigger, frame + 1);
          sample(`${pendingTrigger}-frame-${frame + 1}`);
        }
        const hasPendingFrames = [...capture.pendingTriggers].some((pendingTrigger) =>
          (capture.triggerFrames.get(pendingTrigger) ?? 0) < 3);
        if (hasPendingFrames) window.requestAnimationFrame(next);
        else capture.scheduled = false;
      };
      window.requestAnimationFrame(next);
    };
    const observer = new MutationObserver(() => {
      if (!read()) return;
      sample("viewer-commit");
      requestFrames("viewer");
    });
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: [
        "class", "style", "data-public-card-viewer-id", "data-public-card-layout-pending",
        "data-public-card-journey-event-id", "data-public-card-journey-phase",
        "data-public-card-journey-layout-pending", "data-public-card-journey-target-left",
        "data-public-card-journey-target-top",
      ],
    });
    const onResize = () => requestFrames("resize");
    window.addEventListener("resize", onResize);
    window.visualViewport?.addEventListener("resize", onResize);
    const resizeObserver = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(onResize);
    for (const element of document.querySelectorAll(".play-table, .player-board, [data-player-anchor]")) resizeObserver?.observe(element);
    capture.stop = () => {
      observer.disconnect();
      window.removeEventListener("resize", onResize);
      window.visualViewport?.removeEventListener("resize", onResize);
      resizeObserver?.disconnect();
    };
    capture.requestFrames = requestFrames;
    window.__q3LayoutCapture = capture;
  }, { eventId, viewerId });
}

async function resetQ3LayoutCapture(page) {
  await expect.poll(() => page.evaluate(() => !window.__q3LayoutCapture?.scheduled)).toBe(true);
  await page.evaluate(() => {
    window.__q3LayoutCapture.samples = [];
    window.__q3LayoutCapture.pendingTriggers = new Set();
    window.__q3LayoutCapture.triggerFrames = new Map();
  });
}

function expectQ3ParkedFrames(samples, viewerId, actorId, trigger = "viewer") {
  const frames = samples.filter((sample) => /(?:viewer|resize)-frame-\d+$/.test(sample.label));
  expect(frames.length, JSON.stringify(samples)).toBeGreaterThan(0);
  expect(frames.some((sample) => sample.label.startsWith(`${trigger}-frame-`)), JSON.stringify(samples)).toBe(true);
  for (const sample of frames) {
    expect(sample.actorId, JSON.stringify(sample)).toBe(actorId);
    expect(sample.phase, JSON.stringify(sample)).not.toBe("move");
    const currentViewerOwnsDock = sample.localViewerId === viewerId;
    const layoutBelongsToAnotherViewer = sample.viewerId !== viewerId || (sample.layoutViewerId && sample.layoutViewerId !== viewerId);
    if (currentViewerOwnsDock && layoutBelongsToAnotherViewer) {
      expect(sample.visibility, JSON.stringify(sample)).toBe("hidden");
      expect(sample.transitionProperty, JSON.stringify(sample)).toBe("none");
      continue;
    }
    if (layoutBelongsToAnotherViewer) continue;
    if (sample.phase !== "parked") continue;
    const awaitingMeasuredAnchor = sample.cardPending === "true"
      || sample.displayClass.includes("is-viewer-layout-pending");
    if (awaitingMeasuredAnchor) {
      expect(sample.visibility, JSON.stringify(sample)).toBe("hidden");
    } else {
      expect(sample.actorAnchorPresent, JSON.stringify(sample)).toBe(true);
      expect(sample.visibility, JSON.stringify(sample)).toBe("visible");
      expect(Math.abs(sample.actual.left - sample.target.left), JSON.stringify(sample)).toBeLessThanOrEqual(2);
      expect(Math.abs(sample.actual.top - sample.target.top), JSON.stringify(sample)).toBeLessThanOrEqual(2);
    }
  }
  const firstVisibleFrame = frames.find((sample) => sample.phase === "parked" && sample.visibility === "visible");
  if (firstVisibleFrame) {
    expect(firstVisibleFrame.activeTransitions, JSON.stringify(firstVisibleFrame)).toBe(0);
  }
  return frames;
}

async function waitForQ3CardAtCurrentAnchor(page, eventId, viewerId, actorId) {
  let latest = null;
  await expect.poll(async () => {
    latest = await page.evaluate(({ watchedEventId }) => {
      const card = [...document.querySelectorAll("[data-public-card-journey-event-id]")]
        .find((element) => element.getAttribute("data-public-card-journey-event-id") === watchedEventId);
      const display = card?.closest("[data-public-card-display='true']");
      const actualRect = card?.getBoundingClientRect();
      const actorId = card?.getAttribute("data-public-card-journey-actor-id");
      const anchor = [...document.querySelectorAll("[data-player-anchor]")]
        .find((element) => element.getAttribute("data-player-anchor") === actorId);
      const target = card ? {
        left: Number(card.getAttribute("data-public-card-journey-target-left")),
        top: Number(card.getAttribute("data-public-card-journey-target-top")),
      } : null;
      return {
        viewerId: display?.getAttribute("data-public-card-viewer-id"),
        layoutViewerId: display?.getAttribute("data-public-card-layout-viewer-id"),
        actorId,
        phase: card?.getAttribute("data-public-card-journey-phase"),
        displayPending: display?.getAttribute("data-public-card-layout-pending"),
        cardPending: card?.getAttribute("data-public-card-journey-layout-pending"),
        visibility: card ? getComputedStyle(card).visibility : null,
        actorAnchorPresent: Boolean(anchor && anchor.getBoundingClientRect().width > 0 && anchor.getBoundingClientRect().height > 0),
        actual: actualRect ? { left: actualRect.left, top: actualRect.top } : null,
        target,
      };
    }, { watchedEventId: eventId });
    return latest.viewerId === viewerId && latest.layoutViewerId === viewerId && latest.actorId === actorId
      && latest.phase === "parked" && latest.displayPending === "false" && latest.cardPending === "false"
      && latest.visibility === "visible" && latest.actorAnchorPresent
      && Math.abs(latest.actual.left - latest.target.left) <= 2
      && Math.abs(latest.actual.top - latest.target.top) <= 2;
  }, { timeout: 12_000 }).toBe(true);
  return latest;
}

test("test-game perspective switches manually and stays selected when the server advances the turn", async ({ page, request }) => {
  const created = await request.post(`${API}/api/rooms`, { data: { action: "create", name: "DUEL VIEW HOST" } });
  const createdBody = await created.json();
  expect(created.status(), JSON.stringify(createdBody)).toBe(201);
  const { code, token } = { code: createdBody.room.code, token: createdBody.token };
  let room = (await postAction(request, "add_test_players", code, token)).room;
  room = (await postAction(request, "enable_test_room", code, token)).room;
  room = (await postAction(request, "configure_test_hands", code, token, { presetId: "duel_chain", expectedRevision: 0 })).room;
  room = (await postAction(request, "start", code, token)).room;
  while (room.status === "heroes") {
    const candidate = room.myHeroOptions[0];
    expect(candidate, "the current test seat has a Standard hero candidate").toBeTruthy();
    room = (await postAction(request, "choose_hero", code, token, { heroId: candidate.id })).room;
  }
  expect(room.status).toBe("playing");
  expect(room.isTestController).toBe(true);
  const actingPlayerId = room.currentAction.actorId;
  const selectedViewer = room.players.find((player) => player.isTestPlayer && player.id !== actingPlayerId);
  expect(selectedViewer, "the room has a non-acting test player for a manual bot view").toBeTruthy();

  await page.addInitScript(({ roomCode, sessionToken }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name: "DUEL VIEW HOST" }));
  }, { roomCode: code, sessionToken: token });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();

  const switchButtons = page.getByTestId(/^test-view-switch-/);
  const initialViewerId = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
  const expectedSwitchIds = room.players.filter((player) => (player.isTestPlayer || player.isHost) && player.id !== initialViewerId).map(({ id }) => id).sort();
  await expect(switchButtons).toHaveCount(expectedSwitchIds.length);
  const switchGeometry = await switchButtons.evaluateAll((buttons) => buttons.map((button) => {
    const card = button.closest(".local-hero-anchor, .opponent-hero-card");
    const buttonRect = button.getBoundingClientRect();
    const cardRect = card?.getBoundingClientRect();
    return {
      id: button.getAttribute("data-test-viewer-id"),
      width: buttonRect.width,
      height: buttonRect.height,
      insideHero: Boolean(cardRect && buttonRect.left >= cardRect.left && buttonRect.top >= cardRect.top
        && buttonRect.right <= cardRect.right && buttonRect.bottom <= cardRect.bottom),
      opponentInfoMarker: Boolean(card?.classList.contains("opponent-hero-card") && card.querySelector(".hero-card-info-button")),
    };
  }));
  console.log("test-view-switch-geometry", JSON.stringify({ viewport: page.viewportSize(), buttons: switchGeometry }));
  expect(switchGeometry).toHaveLength(expectedSwitchIds.length);
  expect(switchGeometry.map(({ id }) => id).sort()).toEqual(expectedSwitchIds);
  if (initialViewerId === room.players.find((player) => player.isHost).id) {
    await expect(page.getByTestId(`test-view-switch-${initialViewerId}`)).toHaveCount(0);
  }
  for (const geometry of switchGeometry) {
    expect(geometry.width).toBeGreaterThan(0);
    expect(geometry.height).toBeGreaterThan(0);
    expect(geometry.insideHero).toBe(true);
    expect(geometry.opponentInfoMarker).toBe(false);
  }

  const selectedButton = page.getByTestId(`test-view-switch-${selectedViewer.id}`);
  await expect(selectedButton).toHaveText("SWITCH");
  const stableOpponent = room.players.find((player) => player.id !== initialViewerId
    && player.id !== selectedViewer.id && player.id !== actingPlayerId);
  expect(stableOpponent, "a public opponent remains present across both perspective switches").toBeTruthy();
  await page.locator(`.opponent-player-card[data-player-anchor="${stableOpponent.id}"] .opponent-hero-target`).click();
  await expect(page.getByRole("region", { name: `${stableOpponent.name} opponent inspection` })).toBeVisible();
  const initialSlotPositions = await opponentEquipmentSlotPositions(page, stableOpponent.id);
  expect(initialSlotPositions.map(({ slot }) => slot)).toEqual(["weapon", "armor", "defensiveHorse", "offensiveHorse"]);
  const selectedViewResponsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== "GET" || !response.url().startsWith(`${API}/api/rooms?`)) return false;
    return new URL(response.url()).searchParams.get("testViewerId") === selectedViewer.id;
  });
  await selectedButton.click();
  const selectedViewResponse = await selectedViewResponsePromise;
  expect(selectedViewResponse.status()).toBe(200);
  const selectedViewBody = await selectedViewResponse.json();
  expect((selectedViewBody.room ?? selectedViewBody).meId).toBe(selectedViewer.id);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${selectedViewer.id}"]`)).toBeVisible();
  const selectedViewSlotPositions = await opponentEquipmentSlotPositions(page, stableOpponent.id);
  expect(selectedViewSlotPositions.map(({ slot }) => slot)).toEqual(initialSlotPositions.map(({ slot }) => slot));
  for (const [index, position] of selectedViewSlotPositions.entries()) {
    expect(position.offset, `${position.slot} slot after switching to ${selectedViewer.id}`).toBeCloseTo(initialSlotPositions[index].offset, 1);
    expect(position.width, `${position.slot} width after switching to ${selectedViewer.id}`).toBeCloseTo(initialSlotPositions[index].width, 1);
  }
  const host = room.players.find((player) => player.isHost);
  await expect(page.getByTestId(`test-view-switch-${host.id}`)).toBeVisible();
  await expect(page.getByTestId(`test-view-switch-${host.id}`)).toHaveText("SWITCH");

  const actingViewerButton = page.getByTestId(`test-view-switch-${actingPlayerId}`);
  const actingViewResponsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== "GET" || !response.url().startsWith(`${API}/api/rooms?`)) return false;
    return new URL(response.url()).searchParams.get("testViewerId") === actingPlayerId;
  });
  await actingViewerButton.click();
  const actingViewResponse = await actingViewResponsePromise;
  expect(actingViewResponse.status()).toBe(200);
  const actingViewBody = await actingViewResponse.json();
  expect((actingViewBody.room ?? actingViewBody).meId).toBe(actingPlayerId);
  await expect(page.locator(`.local-player-dock[data-player-anchor="${actingPlayerId}"]`)).toBeVisible();
  const actingViewSlotPositions = await opponentEquipmentSlotPositions(page, stableOpponent.id);
  expect(actingViewSlotPositions.map(({ slot }) => slot)).toEqual(initialSlotPositions.map(({ slot }) => slot));
  for (const [index, position] of actingViewSlotPositions.entries()) {
    expect(position.offset, `${position.slot} slot after switching to actor ${actingPlayerId}`).toBeCloseTo(initialSlotPositions[index].offset, 1);
    expect(position.width, `${position.slot} width after switching to actor ${actingPlayerId}`).toBeCloseTo(initialSlotPositions[index].width, 1);
  }

  await expect.poll(async () => page.locator(".local-player-dock").getAttribute("data-player-anchor")).toBe(actingPlayerId);
  await expect(page.getByRole("button", { name: "End", exact: true })).toBeEnabled();
  const endTurnResponsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "end_turn"; }
    catch { return false; }
  });
  await page.getByRole("button", { name: "End", exact: true }).click();
  const endTurnResponse = await endTurnResponsePromise;
  expect(endTurnResponse.status()).toBe(200);
  let actionBody = await endTurnResponse.json();
  expect(actionBody.room.phase).toBe("discard");
  const requiredDiscards = Math.max(0, actionBody.room.myHand.length - actionBody.room.players.find((player) => player.id === actingPlayerId).hp);
  const handCardIds = await page.locator(".local-player-dock [data-hand-card-id]").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-hand-card-id")));
  expect(handCardIds.length).toBeGreaterThanOrEqual(requiredDiscards);
  for (const cardId of handCardIds.slice(0, requiredDiscards)) {
    await page.locator(`.local-player-dock [data-hand-card-id="${cardId}"] .game-card`).click();
  }
  const discardResponsePromise = page.waitForResponse((response) => {
    if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "discard_cards"; }
    catch { return false; }
  });
  await page.getByRole("button", { name: `Discard ${requiredDiscards} selected`, exact: true }).click();
  const discardResponse = await discardResponsePromise;
  expect(discardResponse.status()).toBe(200);
  actionBody = await discardResponse.json();
  const nextActingPlayerId = actionBody.room.actionPlayerId;
  expect(nextActingPlayerId).toBeTruthy();
  expect(nextActingPlayerId).not.toBe(actingPlayerId);
  await expect.poll(async () => {
    const localViewer = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
    const actingSeat = await page.locator(".turn-square").getAttribute("data-player-anchor");
    return { localViewer, actingSeat };
  }).toEqual({ localViewer: actingPlayerId, actingSeat: nextActingPlayerId });
});

test("opponent Inspect retains parked public Duel history through SWITCH and refresh", async ({ page, request }) => {
  const created = await request.post(`${API}/api/rooms`, { data: { action: "create", name: "DUEL INSPECT HISTORY HOST" } });
  const createdBody = await created.json();
  expect(created.status(), JSON.stringify(createdBody)).toBe(201);
  const { code, token } = { code: createdBody.room.code, token: createdBody.token };
  let room = (await postAction(request, "add_test_players", code, token)).room;
  room = (await postAction(request, "enable_test_room", code, token)).room;
  const host = room.players.find((player) => player.isHost);
  const source = room.players.find((player) => player.isTestPlayer && player.seat === 1);
  expect(host).toBeTruthy();
  expect(source).toBeTruthy();
  room = (await postAction(request, "configure_test_hands", code, token, {
    presetId: "custom",
    handsBySeat: Object.fromEntries(room.players.map((player) => [player.seat, player.id === source.id ? ["Duel"] : ["Attack"]])),
    expectedRevision: 0,
  })).room;
  room = (await postAction(request, "start", code, token)).room;
  const noAutomaticTurnPrompts = new Set([
    "cao-cao", "xiahou-dun", "liu-bei", "guan-yu", "zhang-fei", "zhao-yun",
    "sun-quan", "gan-ning", "huang-gai", "lu-xun", "huaxiong", "gongsun-zan",
    "pan-feng", "ma-chao", "lü-bu", "simayi", "guo-jia",
  ]);
  while (room.status === "heroes") {
    const hero = room.myHeroOptions.find((candidate) => noAutomaticTurnPrompts.has(candidate.id));
    expect(hero, "each controlled test seat has a Standard hero option").toBeTruthy();
    room = (await postAction(request, "choose_hero", code, token, { heroId: hero.id })).room;
  }

  const target = room.players.find((player) => player.seat === 2);
  const alternateViewer = room.players.find((player) => player.seat === 3);
  expect(host).toBeTruthy();
  expect(target).toBeTruthy();
  expect(alternateViewer).toBeTruthy();
  const context = () => ({
    actionRevision: room.actionRevision,
    meId: room.meId,
    phase: room.phase,
    pendingKind: room.pending?.kind ?? null,
    actorId: room.currentAction?.actorId ?? room.actionPlayerId,
  });
  for (let attempts = 0; attempts < room.players.length * 3; attempts += 1) {
    if ((room.currentAction?.actorId ?? room.actionPlayerId) === source.id && room.phase?.startsWith("play")) break;
    if (room.phase?.startsWith("draw")) {
      room = (await postAction(request, "draw", code, token, { context: context() })).room;
    } else if (room.phase?.startsWith("play")) {
      room = (await postAction(request, "end_turn", code, token, { context: context() })).room;
    } else if (room.phase === "discard") {
      const actor = room.players.find((player) => player.id === (room.currentAction?.actorId ?? room.actionPlayerId));
      const discardCount = Math.max(0, room.myHand.length - (actor?.hp ?? 0));
      room = (await postAction(request, "discard_cards", code, token, {
        cardIds: room.myHand.slice(0, discardCount).map((card) => card.id),
        context: context(),
      })).room;
    } else {
      throw new Error(`Unexpected phase while advancing to the test-player Duel turn: ${room.phase}`);
    }
  }
  expect(room.currentAction?.actorId ?? room.actionPlayerId).toBe(source.id);
  expect(room.phase?.startsWith("play")).toBe(true);
  const duel = room.myHand.find((card) => card.kind === "Duel");
  expect(duel, "the source has the configured physical Duel card").toBeTruthy();
  const declared = (await postAction(request, "play_card", code, token, {
    cardId: duel.id,
    targetId: target.id,
    context: context(),
  })).room;
  const negationWindowId = declared.currentAction?.negationWindowId;
  expect(negationWindowId).toBeTruthy();
  const heldClock = await request.post(`${API}/__test/negation-window-clock`, { data: { code, windowId: negationWindowId, mode: "hold" } });
  expect(heldClock.ok()).toBeTruthy();
  room = declared;
  const rootEvent = [...room.timeline].reverse().find((event) => event.type === "card" && event.action === "play"
    && event.card?.id === duel.id && event.presentation !== false);
  expect(rootEvent, "the physical root Duel remains a proven public timeline event").toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ roomCode, sessionToken, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name }));
  }, { roomCode: code, sessionToken: token, name: host.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  const display = page.locator(`.public-card-display[data-public-card-motion="duel"][data-public-card-root-event-id="${rootEvent.id}"]`);
  const root = display.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`);
  await expect(display).toBeVisible({ timeout: 12_000 });
  await expect(root).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 12_000 });
  const beforeInspect = await root.boundingBox();
  const revealStartedAt = await root.getAttribute("data-public-card-journey-reveal-started-at");
  expect(beforeInspect).toBeTruthy();

  const submittedPosts = [];
  page.on("request", (browserRequest) => {
    if (browserRequest.url() === `${API}/api/rooms` && browserRequest.method() === "POST") {
      submittedPosts.push(browserRequest.postDataJSON()?.action ?? "unknown");
    }
  });
  const inspectionOpener = page.locator(`[data-player-anchor="${target.id}"] .opponent-hero-target`);
  await inspectionOpener.click();
  const inspector = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-floating-shell');
  await expect(inspector).toBeVisible();
  await expect(page.locator(`.public-card-display[data-public-card-inspection-history="true"][data-public-card-root-event-id="${rootEvent.id}"]`)).toBeVisible();
  const retainedRoot = page.locator(`[data-public-card-inspection-history="true"] [data-public-card-journey-event-id="${rootEvent.id}"]`);
  await expect(retainedRoot).toHaveAttribute("data-public-card-journey-phase", "parked");
  await expect(retainedRoot).toHaveAttribute("data-public-card-inspectable", "false");
  await expect(retainedRoot).toBeDisabled();
  await expect(page.locator(".public-card-display-journey-copy")).toHaveCount(0);
  const duringInspect = await retainedRoot.boundingBox();
  expect(duringInspect).toBeTruthy();
  expect(Math.abs(duringInspect.x - beforeInspect.x)).toBeLessThanOrEqual(1);
  expect(Math.abs(duringInspect.y - beforeInspect.y)).toBeLessThanOrEqual(1);
  expect(submittedPosts).toEqual([]);
  const inspectorHit = await inspector.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return Boolean(target && element.contains(target));
  });
  expect(inspectorHit, "the modal remains topmost and usable over the passive public history").toBe(true);

  await page.keyboard.press("Escape");
  await expect(page.locator('.interaction-stage[data-local-ui-mode="INSPECT"]')).toHaveCount(0);
  await expect(display).toBeVisible();
  await expect(root).toHaveAttribute("data-public-card-journey-phase", "parked");
  expect(await root.getAttribute("data-public-card-journey-reveal-started-at")).toBe(revealStartedAt);
  await expect(root).toHaveAttribute("data-public-card-journey-event-id", rootEvent.id);
  expect(submittedPosts).toEqual([]);

  const switchButton = page.getByTestId(`test-view-switch-${alternateViewer.id}`);
  await expect(switchButton).toBeVisible();
  await installQ3LayoutCapture(page, rootEvent.id, alternateViewer.id);
  await resetQ3LayoutCapture(page);
  await switchButton.click();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${alternateViewer.id}"]`)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__q3LayoutCapture.samples.some((sample) => sample.label === "viewer-frame-1"))).toBe(true);
  const switchFrames = await page.evaluate(() => window.__q3LayoutCapture.samples);
  expectQ3ParkedFrames(switchFrames, alternateViewer.id, source.id);
  for (const sample of switchFrames.filter((item) => item.label.startsWith("viewer-frame-"))) {
    expect(sample.revealStartedAt).toBe(revealStartedAt);
  }
  const switchedDisplay = page.locator(`.public-card-display[data-public-card-motion="duel"][data-public-card-root-event-id="${rootEvent.id}"]`);
  const switchedRoot = switchedDisplay.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`);
  await expect(switchedRoot).toHaveAttribute("data-public-card-journey-phase", "parked");
  await expect(switchedRoot).toHaveAttribute("data-public-card-journey-event-id", rootEvent.id);
  expect(await switchedRoot.getAttribute("data-public-card-journey-reveal-started-at")).toBe(revealStartedAt);
  expect(submittedPosts).toEqual([]);

  const duelPhoneViewports = [
    { width: 390, height: 700 },
    { width: 390, height: 844 },
    { width: 440, height: 766 },
    { width: 440, height: 894 },
    { width: 480, height: 900 },
  ];
  for (const viewport of duelPhoneViewports) {
    await resetQ3LayoutCapture(page);
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => !window.__q3LayoutCapture.scheduled)).toBe(true);
    await page.evaluate(() => window.__q3LayoutCapture.requestFrames("resize"));
    await expect.poll(() => page.evaluate(() => window.__q3LayoutCapture.samples.some((sample) => sample.label === "resize-frame-1"))).toBe(true);
    const resizeSamples = await page.evaluate(() => window.__q3LayoutCapture.samples);
    const resizeFrames = expectQ3ParkedFrames(resizeSamples, alternateViewer.id, source.id, "resize");
    expect(resizeFrames[0].activeTransitions, JSON.stringify(resizeFrames[0])).toBe(0);
    for (const sample of resizeFrames) expect(sample.revealStartedAt).toBe(revealStartedAt);
    await waitForQ3CardAtCurrentAnchor(page, rootEvent.id, alternateViewer.id, source.id);
  }

  await page.reload();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"]`)).toBeVisible();
  const refreshedDisplay = page.locator(`.public-card-display[data-public-card-motion="duel"][data-public-card-root-event-id="${rootEvent.id}"]`);
  const refreshedRoot = refreshedDisplay.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`);
  await expect(refreshedRoot).toHaveAttribute("data-public-card-journey-phase", "parked");
  await expect(refreshedRoot).toHaveAttribute("data-public-card-journey-event-id", rootEvent.id);
});

test("Quick Test switching rebases a parked Barbarian Invasion card before the first new-view frame", async ({ page, request }, testInfo) => {
  test.setTimeout(90_000);
  const hostName = "GROUP ROOT VIEW REBASE";
  const created = await request.post(`${API}/api/rooms`, { data: { action: "create", name: hostName } });
  expect(created.status()).toBe(201);
  const createdBody = await created.json();
  const code = createdBody.room.code;
  const token = createdBody.token;
  const post = async (action, values = {}) => {
    const response = await request.post(`${API}/api/rooms`, { data: { action, code, token, ...values } });
    const body = await response.json();
    expect(response.status(), JSON.stringify(body)).toBeLessThan(300);
    return body.room;
  };

  let room = await post("add_test_players");
  room = await post("enable_test_room");
  const host = room.players.find((player) => player.isHost);
  expect(host).toBeTruthy();
  room = await post("configure_test_hands", {
    presetId: "custom",
    handsBySeat: Object.fromEntries(room.players.map((player) => [player.seat, player.id === host.id ? ["BarbarianInvasion"] : ["Attack"]])),
    expectedRevision: 0,
  });
  room = await post("start");
  const noAutomaticTurnPrompts = new Set([
    "cao-cao", "xiahou-dun", "liu-bei", "guan-yu", "zhang-fei", "zhao-yun",
    "sun-quan", "gan-ning", "huang-gai", "lu-xun", "huaxiong", "gongsun-zan",
    "pan-feng", "ma-chao", "lü-bu", "simayi", "guo-jia",
  ]);
  while (room.status === "heroes") {
    const candidate = room.myHeroOptions.find((hero) => hero.hp >= 4 && noAutomaticTurnPrompts.has(hero.id));
    expect(candidate, "the selected test seat has a Standard hero candidate").toBeTruthy();
    room = await post("choose_hero", { heroId: candidate.id });
  }
  const actAsCurrentPlayer = async (action, values = {}) => {
    const response = await request.post(`${API}/api/rooms`, {
      data: {
        action,
        code,
        token,
        ...values,
        context: {
          actionRevision: room.actionRevision,
          meId: room.meId,
          phase: room.phase,
          pendingKind: room.pending?.kind ?? null,
          actorId: room.currentAction?.actorId ?? room.actionPlayerId,
        },
      },
    });
    const body = await response.json();
    expect(response.status(), JSON.stringify(body)).toBeLessThan(300);
    room = body.room;
  };
  for (let endedTurns = 0; room.currentAction?.actorId !== host.id && endedTurns < room.players.length; ) {
    if (room.phase?.startsWith("draw")) {
      await actAsCurrentPlayer("draw");
    } else if (room.phase?.startsWith("play")) {
      await actAsCurrentPlayer("end_turn");
      endedTurns += 1;
    } else if (room.phase === "discard") {
      const activePlayer = room.players.find((player) => player.id === room.currentAction?.actorId);
      const required = Math.max(0, room.myHand.length - (activePlayer?.hp ?? 0));
      await actAsCurrentPlayer("discard_cards", { cardIds: room.myHand.slice(0, required).map((card) => card.id) });
    } else {
      throw new Error(`Unexpected phase while advancing to the host turn: ${room.phase}`);
    }
  }
  expect(room.currentAction?.actorId).toBe(host.id);
  if (room.phase?.startsWith("draw")) await actAsCurrentPlayer("draw");
  expect(room.phase?.startsWith("play")).toBe(true);
  const barbarian = room.myHand.find((card) => card.kind === "BarbarianInvasion");
  expect(barbarian).toBeTruthy();

  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ roomCode, sessionToken, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name }));
  }, { roomCode: code, sessionToken: token, name: hostName });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();

  const actionResponse = await request.post(`${API}/api/rooms`, {
    data: {
      action: "play_card",
      code,
      token,
      cardId: barbarian.id,
      context: {
        actionRevision: room.actionRevision,
        meId: room.meId,
        phase: room.phase,
        pendingKind: room.pending?.kind ?? null,
        actorId: room.actionPlayerId,
      },
    },
  });
  expect(actionResponse.ok(), await actionResponse.text()).toBeTruthy();

  const display = page.locator('[data-public-card-motion="group-root"][data-public-card-renderer-kind="single-target-journey"]');
  await expect(display).toBeVisible({ timeout: 20_000 });
  const rootCard = display.locator(`[data-public-card-journey-actor-id="${host.id}"]`);
  await expect(rootCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 12_000 });
  await expect(display).toHaveAttribute("data-public-card-layout-pending", "false");
  const rootEventId = await display.getAttribute("data-public-card-root-event-id");
  const h4BeforeSwitch = await readRootH4Announcement(page, rootEventId);
  expect(h4BeforeSwitch).toMatchObject({
    eventId: rootEventId,
    rootEventId,
  });
  expect(h4BeforeSwitch.text).toContain("Barbarian Invasion");
  expect(Math.abs(h4BeforeSwitch.centerOffset ?? Infinity)).toBeLessThanOrEqual(12);
  expect(h4BeforeSwitch.protectedRects).toEqual([]);
  const revealStartedAt = await rootCard.getAttribute("data-public-card-journey-reveal-started-at");

  const viewersToVisit = [
    ...room.players.filter((player) => player.isTestPlayer),
    host,
  ];
  expect(viewersToVisit).toHaveLength(4);

  const captureFirstPaint = async (viewerId) => page.evaluate(({ viewerId: targetViewerId, actorId, eventId }) => {
    window.__q3RebaseCapture?.observer?.disconnect();
    const capture = { viewerId: targetViewerId, actorId, eventId, samples: [] };
    window.__q3RebaseCapture = capture;
    const sample = (label) => {
      const root = document.querySelector('[data-public-card-motion="group-root"][data-public-card-renderer-kind="single-target-journey"]');
      if (!root || root.getAttribute("data-public-card-viewer-id") !== targetViewerId) return;
      const card = [...root.querySelectorAll("[data-public-card-journey-event-id]")]
        .find((element) => element.getAttribute("data-public-card-journey-actor-id") === actorId
          && element.getAttribute("data-public-card-journey-event-id") === eventId);
      const anchor = [...document.querySelectorAll("[data-player-anchor]")]
        .find((element) => element.getAttribute("data-player-anchor") === actorId);
      if (!card || !anchor) return;
      const rect = card.getBoundingClientRect();
      capture.samples.push({
        label,
        phase: card.getAttribute("data-public-card-journey-phase"),
        layoutPending: root.getAttribute("data-public-card-layout-pending"),
        cardLayoutPending: card.getAttribute("data-public-card-journey-layout-pending"),
        viewerId: root.getAttribute("data-public-card-viewer-id"),
        layoutViewerId: root.getAttribute("data-public-card-layout-viewer-id"),
        displayClass: root.className,
        cardClass: card.className,
        visibility: getComputedStyle(card).visibility,
        actual: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
        target: {
          left: Number(card.getAttribute("data-public-card-journey-target-left")),
          top: Number(card.getAttribute("data-public-card-journey-target-top")),
        },
        transitionProperty: getComputedStyle(card).transitionProperty,
        revealStartedAt: card.getAttribute("data-public-card-journey-reveal-started-at"),
      });
    };
    const observer = new MutationObserver(() => {
      const root = document.querySelector('[data-public-card-motion="group-root"][data-public-card-renderer-kind="single-target-journey"]');
      if (root?.getAttribute("data-public-card-viewer-id") !== targetViewerId) return;
      sample("commit");
      requestAnimationFrame(() => sample("frame-1"));
      requestAnimationFrame(() => requestAnimationFrame(() => sample("frame-2")));
    });
    observer.observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
      attributeFilter: ["data-public-card-viewer-id", "data-public-card-layout-pending", "data-public-card-journey-phase", "data-public-card-journey-target-left", "data-public-card-journey-target-top"],
    });
    capture.observer = observer;
  }, { viewerId, actorId: host.id, eventId: rootEventId });

  const switchResults = [];
  for (const viewer of viewersToVisit) {
    const beforeSwitchCard = await rootCard.evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top };
    });
    await captureFirstPaint(viewer.id);
    const switchButton = page.getByTestId(`test-view-switch-${viewer.id}`);
    await expect(switchButton).toBeVisible();
    const switchedResponse = page.waitForResponse((response) => response.request().method() === "GET"
      && response.url().startsWith(`${API}/api/rooms?`)
      && new URL(response.url()).searchParams.get("testViewerId") === viewer.id);
    await switchButton.click();
    const response = await switchedResponse;
    expect(response.ok()).toBeTruthy();
    await expect(page.locator(`.local-player-dock[data-player-anchor="${viewer.id}"]`)).toBeVisible();
    await expect.poll(() => page.evaluate(() => window.__q3RebaseCapture.samples.length)).toBeGreaterThan(0);
    await expect.poll(() => page.evaluate(() => window.__q3RebaseCapture.samples.some((sample) => sample.layoutPending === "false"))).toBe(true);
    await expect.poll(async () => {
      const announcement = await readRootH4Announcement(page, rootEventId);
      return Boolean(announcement && announcement.eventId === rootEventId
        && Math.abs(announcement.centerOffset ?? Infinity) <= 12 && announcement.protectedRects.length === 0);
    }).toBe(true);
    const h4AfterSwitch = await readRootH4Announcement(page, rootEventId);
    expect(h4AfterSwitch).toMatchObject({
      eventId: h4BeforeSwitch.eventId,
      interactionId: h4BeforeSwitch.interactionId,
      rootEventId: h4BeforeSwitch.rootEventId,
      text: h4BeforeSwitch.text,
    });
    expect(Math.abs(h4AfterSwitch.centerOffset ?? Infinity)).toBeLessThanOrEqual(12);
    expect(h4AfterSwitch.protectedRects).toEqual([]);
    const visibleAnnouncements = await page.locator('[data-public-card-announcement="true"]').evaluateAll((elements) => elements
      .filter((element) => element.dataset.publicCardAnnouncementPositioned === "true"
        && getComputedStyle(element).visibility === "visible"
        && element.getBoundingClientRect().width > 0
        && element.getBoundingClientRect().height > 0).length);
    expect(visibleAnnouncements).toBe(1);

    const samples = await page.evaluate(() => window.__q3RebaseCapture.samples);
    expect(samples, `first-paint samples are captured after switching to ${viewer.name}`).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: "commit" }),
      expect.objectContaining({ label: "frame-1" }),
    ]));
    for (const sample of samples) {
      expect(sample.phase).toBe("parked");
      expect(sample.viewerId).toBe(viewer.id);
      if (sample.cardLayoutPending === "true" || sample.displayClass.includes("is-viewer-layout-pending")) {
        expect(sample.visibility, JSON.stringify(sample)).toBe("hidden");
      } else {
        expect(sample.visibility).toBe("visible");
        expect(sample.layoutViewerId).toBe(viewer.id);
        expect(Math.abs(sample.actual.left - sample.target.left), JSON.stringify(sample)).toBeLessThanOrEqual(2);
        expect(Math.abs(sample.actual.top - sample.target.top), JSON.stringify(sample)).toBeLessThanOrEqual(2);
      }
      expect(sample.revealStartedAt).toBe(revealStartedAt);
    }
    const firstCommit = samples.find((sample) => sample.label === "commit");
    expect(firstCommit.transitionProperty).toBe("none");
    expect(Math.hypot(firstCommit.actual.left - beforeSwitchCard.left, firstCommit.actual.top - beforeSwitchCard.top)).toBeGreaterThan(2);
    switchResults.push({ viewerId: viewer.id, viewport: page.viewportSize(), h4: h4AfterSwitch, firstCommit });
    await page.evaluate(() => window.__q3RebaseCapture.observer.disconnect());
  }
  await installQ3LayoutCapture(page, rootEventId, host.id);
  const groupPhoneViewports = [
    { width: 390, height: 700 },
    { width: 390, height: 844 },
    { width: 440, height: 766 },
    { width: 440, height: 894 },
    { width: 480, height: 900 },
  ];
  const resizeEvidence = [];
  for (const viewport of groupPhoneViewports) {
    await resetQ3LayoutCapture(page);
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => !window.__q3LayoutCapture.scheduled)).toBe(true);
    await page.evaluate(() => window.__q3LayoutCapture.requestFrames("resize"));
    await expect.poll(() => page.evaluate(() => window.__q3LayoutCapture.samples.some((sample) => sample.label === "resize-frame-1"))).toBe(true);
    const samples = await page.evaluate(() => window.__q3LayoutCapture.samples);
    const frames = expectQ3ParkedFrames(samples, host.id, host.id, "resize");
    for (const sample of frames) expect(sample.revealStartedAt).toBe(revealStartedAt);
    const settled = await waitForQ3CardAtCurrentAnchor(page, rootEventId, host.id, host.id);
    resizeEvidence.push({ viewport, frames: frames.map(({ label, phase, visibility, actual, target, transitionProperty }) => ({
      label, phase, visibility, actual, target, transitionProperty,
    })), settled } );
    if (["390x700", "440x766", "480x900"].includes(`${viewport.width}x${viewport.height}`)) {
      await testInfo.attach(`q3-group-root-${viewport.width}x${viewport.height}.png`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    }
  }
  await testInfo.attach("q3-group-root-mobile-resize-geometry.json", {
    body: JSON.stringify(resizeEvidence, null, 2),
    contentType: "application/json",
  });
  console.log(`[Q3 GROUP ROOT mobile resize] ${JSON.stringify(resizeEvidence)}`);
  console.log(`[Q4 TEST SWITCH viewer cycle] ${JSON.stringify(switchResults.map(({ viewerId, h4, firstCommit }) => ({
    viewerId,
    eventId: h4.eventId,
    interactionId: h4.interactionId,
    copy: h4.text,
    centerOffset: h4.centerOffset,
    firstPaint: { phase: firstCommit.phase, layoutPending: firstCommit.layoutPending, transition: firstCommit.transitionProperty },
  })))} `);
});

test("Quick Test SWITCH hides an Attack journey until its current mobile author anchor is measured", async ({ page, request }, testInfo) => {
  test.setTimeout(120_000);
  const hostName = "ATTACK VIEW REBASE";
  const created = await request.post(`${API}/api/rooms`, { data: { action: "create", name: hostName } });
  expect(created.status()).toBe(201);
  const createdBody = await created.json();
  const code = createdBody.room.code;
  const token = createdBody.token;
  const post = async (action, values = {}) => {
    const response = await request.post(`${API}/api/rooms`, { data: { action, code, token, ...values } });
    const body = await response.json();
    expect(response.status(), JSON.stringify(body)).toBeLessThan(300);
    return body.room;
  };

  let room = await post("add_test_players");
  room = await post("enable_test_room");
  const host = room.players.find((player) => player.isHost);
  const target = room.players.find((player) => player.isTestPlayer && player.seat === host.seat + 1);
  expect(host).toBeTruthy();
  expect(target).toBeTruthy();
  room = await post("configure_test_hands", {
    presetId: "custom",
    handsBySeat: Object.fromEntries(room.players.map((player) => [player.seat, player.id === host.id ? ["Attack"] : ["Negation"]])),
    expectedRevision: 0,
  });
  room = await post("start");
  const noAutomaticTurnPrompts = new Set([
    "cao-cao", "xiahou-dun", "liu-bei", "guan-yu", "zhang-fei", "zhao-yun",
    "sun-quan", "gan-ning", "huang-gai", "lu-xun", "huaxiong", "gongsun-zan",
    "pan-feng", "ma-chao", "lü-bu", "simayi", "guo-jia",
  ]);
  while (room.status === "heroes") {
    const hero = room.myHeroOptions.find((candidate) => noAutomaticTurnPrompts.has(candidate.id));
    expect(hero, "each controlled test seat has a Standard hero candidate").toBeTruthy();
    room = await post("choose_hero", { heroId: hero.id });
  }
  const context = () => ({
    actionRevision: room.actionRevision,
    meId: room.meId,
    phase: room.phase,
    pendingKind: room.pending?.kind ?? null,
    actorId: room.currentAction?.actorId ?? room.actionPlayerId,
  });
  for (let turns = 0; (room.currentAction?.actorId ?? room.actionPlayerId) !== host.id && turns < room.players.length; ) {
    if (room.phase?.startsWith("draw")) {
      room = await post("draw", { context: context() });
    } else if (room.phase?.startsWith("play")) {
      room = await post("end_turn", { context: context() });
      turns += 1;
    } else if (room.phase === "discard") {
      const actor = room.players.find((player) => player.id === (room.currentAction?.actorId ?? room.actionPlayerId));
      const discardCount = Math.max(0, room.myHand.length - (actor?.hp ?? 0));
      room = await post("discard_cards", { cardIds: room.myHand.slice(0, discardCount).map((card) => card.id), context: context() });
    } else {
      throw new Error(`Unexpected phase while advancing to the host Attack turn: ${room.phase}`);
    }
  }
  expect(room.currentAction?.actorId ?? room.actionPlayerId).toBe(host.id);
  if (room.phase?.startsWith("draw")) room = await post("draw", { context: context() });
  expect(room.phase?.startsWith("play")).toBe(true);
  const attack = room.myHand.find((card) => card.kind === "Attack");
  expect(attack, "the host has a configured physical Attack").toBeTruthy();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ roomCode, sessionToken, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name }));
  }, { roomCode: code, sessionToken: token, name: hostName });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  room = await post("play_card", { cardId: attack.id, targetId: target.id, context: context() });
  expect(room.currentAction?.kind).toBe("response");
  expect(room.currentAction?.requirement).toBe("dodge");
  const rootEvent = [...room.timeline].reverse().find((event) => event.type === "card"
    && event.action === "play" && event.card?.id === attack.id && event.presentation !== false);
  expect(rootEvent, "the Attack has one proven public root event").toBeTruthy();
  const display = page.locator(`.public-card-display[data-public-card-motion="attack-dodge"][data-public-card-root-event-id="${rootEvent.id}"]`);
  const rootCard = display.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`);
  await expect(display).toBeVisible({ timeout: 20_000 });
  await expect(rootCard).toHaveAttribute("data-public-card-journey-actor-id", host.id);
  await expect(rootCard).toHaveAttribute("data-public-card-journey-phase", "parked", { timeout: 12_000 });
  const revealStartedAt = await rootCard.getAttribute("data-public-card-journey-reveal-started-at");
  expect(revealStartedAt).toBeTruthy();
  await testInfo.attach("q3-attack-root-before-switch-390x844.png", {
    body: await page.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });

  const firstViewer = room.players.find((player) => player.isTestPlayer && player.id !== host.id);
  expect(firstViewer).toBeTruthy();
  const hiddenAuthorAnchor = await page.addStyleTag({ content: `[data-player-anchor="${host.id}"]{display:none!important}` });
  await installQ3LayoutCapture(page, rootEvent.id, firstViewer.id);
  await resetQ3LayoutCapture(page);
  const switchButton = page.getByTestId(`test-view-switch-${firstViewer.id}`);
  await expect(switchButton).toBeVisible();
  await switchButton.click();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${firstViewer.id}"]`)).toBeVisible();
  await expect.poll(() => page.evaluate(() => window.__q3LayoutCapture.samples.some((sample) => sample.label === "viewer-frame-1"))).toBe(true);
  let switchSamples = await page.evaluate(() => window.__q3LayoutCapture.samples);
  const withheldFrames = expectQ3ParkedFrames(switchSamples, firstViewer.id, host.id);
  expect(withheldFrames.some((sample) => sample.actorAnchorPresent === false && sample.visibility === "hidden"), JSON.stringify(withheldFrames)).toBe(true);
  expect((await rootCard.getAttribute("data-public-card-journey-reveal-started-at"))).toBe(revealStartedAt);

  await hiddenAuthorAnchor.evaluate((style) => style.remove());
  await waitForQ3CardAtCurrentAnchor(page, rootEvent.id, firstViewer.id, host.id);
  switchSamples = await page.evaluate(() => window.__q3LayoutCapture.samples);
  expectQ3ParkedFrames(switchSamples, firstViewer.id, host.id);
  expect(await rootCard.getAttribute("data-public-card-journey-reveal-started-at")).toBe(revealStartedAt);

  const resizeViewports = [
    { width: 390, height: 700 },
    { width: 390, height: 844 },
    { width: 440, height: 766 },
    { width: 440, height: 894 },
    { width: 480, height: 900 },
  ];
  const resizeEvidence = [];
  for (const viewport of resizeViewports) {
    await resetQ3LayoutCapture(page);
    await page.setViewportSize(viewport);
    await expect.poll(() => page.evaluate(() => !window.__q3LayoutCapture.scheduled)).toBe(true);
    await page.evaluate(() => window.__q3LayoutCapture.requestFrames("resize"));
    await expect.poll(() => page.evaluate(() => window.__q3LayoutCapture.samples.some((sample) => sample.label === "resize-frame-1"))).toBe(true);
    const samples = await page.evaluate(() => window.__q3LayoutCapture.samples);
    const frames = expectQ3ParkedFrames(samples, firstViewer.id, host.id, "resize");
    for (const sample of frames) expect(sample.revealStartedAt).toBe(revealStartedAt);
    const settled = await waitForQ3CardAtCurrentAnchor(page, rootEvent.id, firstViewer.id, host.id);
    resizeEvidence.push({ viewport, frames: frames.map(({ label, phase, visibility, actual, target, transitionProperty }) => ({ label, phase, visibility, actual, target, transitionProperty })), settled });
    if (["390x700", "440x766", "480x900"].includes(`${viewport.width}x${viewport.height}`)) {
      await testInfo.attach(`q3-attack-root-${viewport.width}x${viewport.height}.png`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    }
  }
  await testInfo.attach("q3-attack-mobile-resize-geometry.json", {
    body: JSON.stringify(resizeEvidence, null, 2),
    contentType: "application/json",
  });
  console.log(`[Q3 ATTACK-DODGE mobile resize] ${JSON.stringify(resizeEvidence)}`);
});

for (const kind of ["Steal", "Dismantle"]) {
  const displayName = kind === "Dismantle" ? "Burning Bridges" : kind;
  test(`W3-F2-R1 ${displayName} public announcement stays stable across TEST SWITCH and target choice`, async ({ page, request }, testInfo) => {
    test.setTimeout(45_000);
    const name = `W3 F2 R1 ${kind.toUpperCase()} ${Date.now().toString(36).toUpperCase()}`;
    const createdResponse = await request.post(`${API}/api/rooms`, { data: { action: "create", name } });
    const created = await createdResponse.json();
    expect(createdResponse.status(), JSON.stringify(created)).toBe(201);
    const { code, token } = { code: created.room.code, token: created.token };
    const post = async (action, values = {}) => {
      const response = await request.post(`${API}/api/rooms`, { data: { action, name, code, token, ...values } });
      const body = await response.json();
      expect(response.status(), `${action}: ${body.error ?? "unexpected response"}`).toBeLessThan(300);
      return body.room;
    };
    const readView = async (viewerId) => {
      const query = new URLSearchParams({ code, token, ...(viewerId ? { testViewerId: viewerId } : {}) });
      const response = await request.get(`${API}/api/rooms?${query}`);
      expect(response.ok(), `viewer projection ${viewerId ?? "current"}`).toBe(true);
      return response.json();
    };

    let room = await post("add_test_players");
    room = await post("enable_test_room");
    const source = room.players.find((player) => player.isHost);
    const target = room.players.find((player) => player.seat === 1);
    const alternate = room.players.find((player) => player.seat === 2);
    const fourth = room.players.find((player) => player.seat === 3);
    expect(source && target && alternate && fourth).toBeTruthy();
    room = await post("configure_test_hands", {
      presetId: "custom",
      expectedRevision: 0,
      handsBySeat: Object.fromEntries(room.players.map((player) => [player.seat,
        player.id === source.id ? [kind, "Negation"]
          : player.id === target.id ? ["Negation", "Peach"]
            : ["Dodge"],
      ])),
    });
    room = await post("start");
    const noAutomaticTurnPrompts = new Set([
      "cao-cao", "xiahou-dun", "liu-bei", "guan-yu", "zhang-fei", "zhao-yun",
      "sun-quan", "gan-ning", "huang-gai", "lu-xun", "huaxiong", "gongsun-zan",
      "pan-feng", "ma-chao", "lü-bu", "simayi", "guo-jia",
    ]);
    while (room.status === "heroes") {
      const hero = room.myHeroOptions.find((candidate) => noAutomaticTurnPrompts.has(candidate.id));
      expect(hero, "the current controlled seat has a low-prompt Standard hero").toBeTruthy();
      room = await post("choose_hero", { heroId: hero.id });
    }
    expect(room.status).toBe("playing");
    await page.setViewportSize({ width: 390, height: 844 });
    await page.addInitScript(({ roomCode, sessionToken, playerName }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name: playerName }));
    }, { roomCode: code, sessionToken: token, playerName: name });
    const pageErrors = [];
    page.on("pageerror", (error) => pageErrors.push(error.message));
    await page.goto(`${API}/`);
    await expect(page.locator(".game-shell")).toBeVisible();

    const controlledAction = async (action, values = {}) => {
      const actorId = room.currentAction?.actorId ?? room.actionPlayerId;
      const context = {
        actionRevision: room.actionRevision,
        meId: room.meId,
        phase: room.phase,
        pendingKind: room.pending?.kind ?? null,
        actorId,
      };
      room = await post(action, { ...values, context });
      return room;
    };
    let played = false;
    for (let attempt = 0; attempt < room.players.length * 4 && !played; attempt++) {
      const actorId = room.currentAction?.actorId ?? room.actionPlayerId;
      if (actorId === source.id && room.phase?.startsWith("draw")) {
        await controlledAction("draw");
      } else if (actorId === source.id && room.phase?.startsWith("play")) {
        const material = room.myHand.find((held) => held.kind === kind);
        expect(material, `source holds the configured ${kind} card`).toBeTruthy();
        await controlledAction("play_card", { cardId: material.id, targetId: target.id });
        played = true;
      } else if (room.phase?.startsWith("draw")) {
        await controlledAction("draw");
      } else if (room.phase?.startsWith("play")) {
        await controlledAction("end_turn");
      } else if (room.phase === "discard") {
        const actor = room.players.find((player) => player.id === room.meId);
        const required = Math.max(0, room.myHand.length - (actor?.hp ?? 0));
        await controlledAction("discard_cards", { cardIds: room.myHand.slice(0, required).map((held) => held.id) });
      } else {
        throw new Error(`Unexpected ${room.phase} while preparing the ${kind} root.`);
      }
    }
    expect(played).toBe(true);
    const material = [...room.timeline].reverse().find((event) => event.type === "card"
      && event.action === "play" && event.card?.kind === kind);
    expect(material, `the real ${kind} root is present in the public timeline`).toBeTruthy();
    const rootEventId = material.id;
    const windowId = room.currentAction?.negationWindowId;
    expect(windowId, "the committed root opens the shared Negation window").toBeTruthy();
    const hold = await request.post(`${API}/__test/negation-window-clock`, { data: { code, windowId, mode: "hold" } });
    expect(hold.ok()).toBe(true);
    // The browser was opened before the API-driven turn setup so its seen-event
    // store is clean. Refresh now to load the committed root and active window;
    // the test Worker does not push external API mutations into an open page.
    await page.reload();
    await expect(page.locator(".game-shell")).toBeVisible();
    expect(pageErrors).toEqual([]);

    const rootDisplay = page.locator(`.public-card-display[data-public-card-root-event-id="${rootEventId}"]`);
    await expect(rootDisplay).toHaveCount(1, { timeout: 12_000 });
    await expect(rootDisplay.locator('[data-public-card-announcement="true"]')).toHaveCount(1);
    await expect(rootDisplay.locator('[data-public-card-announcement="true"]')).toBeVisible({ timeout: 12_000 });
    await page.evaluate((watchedRootEventId) => {
      const trace = { active: true, lastVisible: null, expectedEventId: watchedRootEventId, transitions: [], states: [] };
      const sample = () => {
        if (!trace.active) return;
        const display = document.querySelector(`.public-card-display[data-public-card-root-event-id="${watchedRootEventId}"]`);
        const copy = display?.querySelector('[data-public-card-announcement="true"]') ?? null;
        const style = copy ? getComputedStyle(copy) : null;
        const rect = copy?.getBoundingClientRect() ?? null;
        const localViewerId = document.querySelector(".local-player-dock")?.getAttribute("data-player-anchor") ?? null;
        const viewerId = display?.getAttribute("data-public-card-viewer-id") ?? null;
        const layoutViewerId = display?.getAttribute("data-public-card-layout-viewer-id") ?? null;
        const activeCopyInstances = document.querySelectorAll(`[data-public-card-announcement-event-id="${trace.expectedEventId}"]`).length;
        const visible = Boolean(copy && style && rect && copy.dataset.publicCardAnnouncementPositioned === "true"
          && style.display !== "none" && style.visibility === "visible" && Number(style.opacity) > 0
          && rect.width > 0 && rect.height > 0);
        const state = {
          at: performance.now(), visible, localViewerId, viewerId, layoutViewerId,
          pending: display?.getAttribute("data-public-card-layout-pending") ?? null,
          copyEventId: copy?.getAttribute("data-public-card-announcement-event-id") ?? null,
          copyKey: copy?.getAttribute("data-public-card-announcement-copy-key") ?? null,
          geometryKey: copy?.getAttribute("data-public-card-announcement-geometry-key") ?? null,
          activeCopyInstances,
          rect: rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null,
        };
        if (trace.lastVisible !== visible && trace.transitions.length < 120) trace.transitions.push(state);
        trace.lastVisible = visible;
        if (trace.states.length < 2400) trace.states.push(state);
        window.requestAnimationFrame(sample);
      };
      trace.stop = () => { trace.active = false; };
      trace.clearTransitions = () => { trace.transitions = []; };
      window.__w3F2R1AnnouncementTrace = trace;
      window.requestAnimationFrame(sample);
    }, rootEventId);
    await expect.poll(() => page.evaluate(() => window.__w3F2R1AnnouncementTrace.states.length > 10)).toBe(true);
    await page.evaluate(() => window.__w3F2R1AnnouncementTrace.clearTransitions());

    const switchTo = async (viewerId, phase = "negation", expectedEventId = rootEventId) => {
      await page.evaluate((eventId) => { window.__w3F2R1AnnouncementTrace.expectedEventId = eventId; }, expectedEventId);
      const currentViewerId = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
      if (currentViewerId === viewerId) return;
      const previousGeometryKey = await page.evaluate((watchedRootEventId) => {
        const display = document.querySelector(`.public-card-display[data-public-card-root-event-id="${watchedRootEventId}"]`);
        return display?.querySelector('[data-public-card-announcement="true"]')
          ?.getAttribute("data-public-card-announcement-geometry-key") ?? null;
      }, rootEventId);
      const transitionStart = await page.evaluate(() => window.__w3F2R1AnnouncementTrace.transitions.length);
      await page.getByTestId(`test-view-switch-${viewerId}`).click();
      await expect(page.locator(`.local-player-dock[data-player-anchor="${viewerId}"]`)).toBeVisible({ timeout: 8_000 });
      if (phase === "negation") {
        const readViewerLayout = () => page.evaluate(() => {
          const display = [...document.querySelectorAll(".public-card-display[data-public-card-root-event-id]")]
            .find((candidate) => candidate.getAttribute("data-public-card-root-event-id") === window.__w3F2R1RootEventId);
          const copy = display?.querySelector('[data-public-card-announcement="true"]');
          const style = copy ? getComputedStyle(copy) : null;
          const cards = [...(display?.querySelectorAll("[data-public-card-journey-event-id]") ?? [])].map((card) => {
            const rect = card.getBoundingClientRect();
            const cardStyle = getComputedStyle(card);
            return {
              eventId: card.getAttribute("data-public-card-journey-event-id"),
              actorId: card.getAttribute("data-public-card-journey-actor-id"),
              phase: card.getAttribute("data-public-card-journey-phase"),
              layoutPending: card.getAttribute("data-public-card-journey-layout-pending"),
              layoutChangeReason: card.getAttribute("data-public-card-journey-layout-reason"),
              visibility: cardStyle.visibility,
              rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
            };
          });
          return {
            viewerId: display?.getAttribute("data-public-card-viewer-id") ?? null,
            layoutViewerId: display?.getAttribute("data-public-card-layout-viewer-id") ?? null,
            pending: display?.getAttribute("data-public-card-layout-pending") ?? null,
            positioned: copy?.dataset.publicCardAnnouncementPositioned ?? null,
            visibility: style?.visibility ?? null,
            opacity: style?.opacity ?? null,
            copyEventId: copy?.getAttribute("data-public-card-announcement-event-id") ?? null,
            fallback: copy?.getAttribute("data-public-card-announcement-fallback") ?? null,
            stability: copy?.getAttribute("data-public-card-announcement-stability") ?? null,
            placement: copy?.getAttribute("data-public-card-announcement-placement") ?? null,
            width: copy?.getAttribute("data-public-card-announcement-width") ?? null,
            message: copy?.textContent?.trim() ?? null,
            copyRect: (() => {
              const rect = copy?.getBoundingClientRect();
              return rect ? { left: rect.left, top: rect.top, width: rect.width, height: rect.height } : null;
            })(),
            cards,
          };
        }, viewerId);
        try {
          await expect.poll(readViewerLayout, { timeout: 8_000 }).toMatchObject({
            viewerId,
            layoutViewerId: viewerId,
            pending: "false",
            positioned: "true",
            visibility: "visible",
          });
        } catch (error) {
          console.log("W3-F2-R1 viewer layout diagnostic", JSON.stringify(await readViewerLayout()));
          throw error;
        }
        const currentGeometryKey = await rootDisplay.locator('[data-public-card-announcement="true"]')
          .getAttribute("data-public-card-announcement-geometry-key");
        if (previousGeometryKey) expect(currentGeometryKey).not.toBe(previousGeometryKey);
        expect(JSON.parse(currentGeometryKey).viewerKey).toBe(JSON.stringify([code, viewerId]));
        await expect(page.locator(`[data-public-card-announcement-event-id="${expectedEventId}"]`)).toHaveCount(1);
        await expect(page.locator(`[role="status"][data-public-card-announcement-event-id="${expectedEventId}"]`)).toHaveCount(1);
        await page.waitForFunction(({ activeEventId }) => {
          const trace = window.__w3F2R1AnnouncementTrace;
          const tail = trace.states.slice(-10);
          return tail.length === 10 && tail.every((state) => state.visible
            && state.viewerId === state.localViewerId && state.layoutViewerId === state.localViewerId
            && state.pending === "false" && state.copyEventId === activeEventId && state.activeCopyInstances === 1);
        }, { activeEventId: expectedEventId }, { timeout: 3_000 });
        const transitionEnd = await page.evaluate(() => window.__w3F2R1AnnouncementTrace.transitions.length);
        const transitions = await page.evaluate(({ start, end }) => window.__w3F2R1AnnouncementTrace.transitions.slice(start, end), {
          start: transitionStart, end: transitionEnd,
        });
        expect(transitions.length, JSON.stringify({ viewerId, transitions })).toBeLessThanOrEqual(2);
        expect(transitions.filter((state) => state.visible).length, JSON.stringify({ viewerId, transitions })).toBeLessThanOrEqual(1);
      } else {
        await expect.poll(() => page.evaluate((expectedViewerId) => {
          const display = [...document.querySelectorAll(".public-card-display[data-public-card-root-event-id]")]
            .find((candidate) => candidate.getAttribute("data-public-card-root-event-id") === window.__w3F2R1RootEventId);
          return Boolean(display?.getAttribute("data-public-card-viewer-id") === expectedViewerId
            && display.getAttribute("data-public-card-layout-viewer-id") === expectedViewerId
            && display.getAttribute("data-public-card-layout-pending") === "false");
        }, viewerId), { timeout: 8_000 }).toBe(true);
      }
    };
    await page.evaluate((id) => { window.__w3F2R1RootEventId = id; }, rootEventId);
    const initialViewer = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
    await page.evaluate(() => window.__w3F2R1AnnouncementTrace.clearTransitions());
    const negationSwitches = [target.id, alternate.id, fourth.id, source.id, alternate.id, source.id]
      .filter((viewerId, index, ids) => viewerId !== (index === 0 ? initialViewer : ids[index - 1]));
    for (const viewerId of negationSwitches) await switchTo(viewerId);
    const negationTrace = await page.evaluate(() => ({ transitions: window.__w3F2R1AnnouncementTrace.transitions, states: window.__w3F2R1AnnouncementTrace.states }));
    expect(negationTrace.states.some((state) => state.visible), JSON.stringify(negationTrace.states.slice(-100))).toBe(true);

    const submitNegationAndSettle = async (actor, cardId, windowId) => {
      const actorView = await readView(actor.id);
      expect(actorView.currentAction).toMatchObject({ kind: "response", actorId: actor.id, negationWindowId: windowId });
      const privateIntent = await request.post(`${API}/api/rooms`, {
        data: {
          action: "respond", code, token, providerId: "negation_card", cardId,
          context: {
            actionRevision: actorView.actionRevision, meId: actor.id, phase: actorView.phase,
            pendingKind: actorView.pending?.kind ?? null, windowId,
          },
        },
      });
      const privateIntentText = await privateIntent.text();
      expect(privateIntent.ok(), `${actor.name} can submit the legal Negation: ${privateIntentText}`).toBe(true);
      for (const player of room.players) {
        if (player.id === actor.id) continue;
        const passView = await readView(player.id);
        const passed = await request.post(`${API}/api/rooms`, {
          data: {
            action: "decline_response", code, token,
            context: {
              actionRevision: passView.actionRevision, meId: player.id, phase: "response",
              pendingKind: "response", windowId,
            },
          },
        });
        const passedText = await passed.text();
        expect(passed.ok(), `${player.name} passes the Negation window: ${passedText}`).toBe(true);
      }
      const settled = await readView(source.id);
      const publicEvent = settled.timeline.find((event) => event.type === "card" && event.action === "play" && event.card?.id === cardId);
      expect(publicEvent, "the submitted Negation becomes public only after the shared window settles").toBeTruthy();
      expect(publicEvent).toMatchObject({ action: "play", player: actor.name, card: { id: cardId, kind: "Negation" } });
      const nextWindowId = settled.currentAction?.negationWindowId;
      expect(nextWindowId, "a committed Negation opens its server-owned counter window").toBeTruthy();
      await request.post(`${API}/__test/negation-window-clock`, { data: { code, windowId: nextWindowId, mode: "hold" } })
        .then(async (response) => {
          expect(response.ok()).toBe(true);
          expect(await response.json()).toEqual({ adjusted: true });
        });
      return { event: publicEvent, windowId: nextWindowId, settled };
    };

    const findLegalNegation = async (activeWindowId, usedCardIds = new Set(), preferredPlayers = []) => {
      const orderedPlayers = [
        ...preferredPlayers,
        ...room.players.filter((player) => !preferredPlayers.some((preferred) => preferred.id === player.id)),
      ];
      for (const player of orderedPlayers) {
        const view = await readView(player.id);
        if (view.currentAction?.kind !== "response" || view.currentAction.negationWindowId !== activeWindowId) continue;
        const provider = view.currentAction.options?.find((option) => option.providerId === "negation_card");
        if (!provider) continue;
        const eligibleIds = provider.selection?.eligibleCardIds;
        const held = view.myHand.find((candidate) => candidate.kind === "Negation"
          && !usedCardIds.has(candidate.id) && (!eligibleIds?.length || eligibleIds.includes(candidate.id)));
        if (held) return { player, cardId: held.id, view };
      }
      return null;
    };

    const firstNegation = await findLegalNegation(windowId, new Set(), [target, source]);
    expect(firstNegation, "a viewer with a server-projected Negation provider and card can answer the root").toBeTruthy();
    const firstNegationCycle = await submitNegationAndSettle(firstNegation.player, firstNegation.cardId, windowId);
    for (const viewerId of [alternate.id, fourth.id, source.id, target.id]) {
      await switchTo(viewerId, "negation", firstNegationCycle.event.id);
    }

    const counterNegation = await findLegalNegation(firstNegationCycle.windowId, new Set([firstNegation.cardId]), [source, target]);
    expect(counterNegation, "a different unused physical Negation is server-authorized in the counter window").toBeTruthy();
    const counterNegationCycle = await submitNegationAndSettle(counterNegation.player, counterNegation.cardId, firstNegationCycle.windowId);
    for (const viewerId of [target.id, fourth.id, alternate.id, source.id]) {
      await switchTo(viewerId, "negation", counterNegationCycle.event.id);
    }
    expect(counterNegationCycle.settled.timeline.some((event) => event.type === "card" && event.card?.id === firstNegation.cardId)).toBe(true);
    expect(counterNegationCycle.settled.timeline.some((event) => event.type === "card" && event.card?.id === counterNegation.cardId)).toBe(true);

    let current = await readView(source.id);
    for (const player of current.players.filter((candidate) => candidate.alive)) {
      current = await readView(player.id);
      if (current.currentAction?.negationWindowId !== windowId) break;
      const response = await request.post(`${API}/api/rooms`, {
        data: { action: "decline_response", name, code, token, context: {
          actionRevision: current.actionRevision, meId: player.id, phase: "response", pendingKind: "response", windowId,
        } },
      });
      const body = await response.json();
      expect(response.status(), `Negation pass for ${player.name}: ${body.error ?? "unexpected response"}`).toBeLessThan(300);
    }
    current = await readView(source.id);
    expect(current.currentAction).toMatchObject({ kind: "target_card", actorId: source.id });
    const activeNegationEvent = [...current.timeline].reverse().find((event) => event.type === "card" && event.card?.kind === "Negation");
    expect(activeNegationEvent).toBeTruthy();
    const targetPrivateIds = (await readView(target.id)).myHand.map((held) => held.id);
    await switchTo(source.id, "target-card", activeNegationEvent.id);
    const pool = page.locator(".card-pool-panel--actor-target-select");
    await expect(pool).toBeVisible({ timeout: 8_000 });
    const title = kind === "Steal" ? "Steal" : "Burning Bridge";
    for (const viewerId of [target.id, source.id, alternate.id, source.id, fourth.id, source.id]) {
      await switchTo(viewerId, "target-card", activeNegationEvent.id);
      if (viewerId === source.id) {
        await expect(pool).toBeVisible();
        await expect(page.locator(".public-card-display-journey-copy")).toHaveCount(0);
        const sourceProjection = await readView(source.id);
        const sourceMarkup = await page.locator("body").innerHTML();
        for (const cardId of targetPrivateIds) {
          expect(JSON.stringify(sourceProjection)).not.toContain(cardId);
          expect(sourceMarkup).not.toContain(cardId);
        }
      } else {
        await expect(pool).toHaveCount(0);
        await expect(rootDisplay.locator(`[data-public-card-announcement-event-id="${activeNegationEvent.id}"]`)).toHaveCount(1);
        await expect(rootDisplay.locator(`[data-public-card-announcement-event-id="${activeNegationEvent.id}"]`)).toBeVisible();
        await expect(page.locator(`[data-public-card-announcement-event-id="${activeNegationEvent.id}"]`)).toHaveCount(1);
        await expect(page.locator(`[role="status"][data-public-card-announcement-event-id="${activeNegationEvent.id}"]`)).toHaveCount(1);
        const viewerState = await readView(viewerId);
        expect(viewerState.isMyAction).toBe(false);
        expect(viewerState.currentAction?.targetCardSelection).toBeUndefined();
        if (viewerId !== target.id) {
          const serialized = JSON.stringify(viewerState);
          const markup = await page.locator("body").innerHTML();
          for (const cardId of targetPrivateIds) expect(serialized).not.toContain(cardId);
          for (const cardId of targetPrivateIds) expect(markup).not.toContain(cardId);
        }
      }
    }

    const hiddenPosition = pool.getByRole("button", { name: "Choose hidden Hand position 1" });
    await expect(hiddenPosition).toBeEnabled();
    await hiddenPosition.click();
    const submitPromise = page.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
      catch { return false; }
    });
    await pool.getByRole("button", { name: `Use ${title}` }).click();
    const submitted = await submitPromise;
    const responseText = await submitted.text();
    expect(submitted.ok(), responseText).toBe(true);
    expect(JSON.parse(submitted.request().postData() ?? "{}")).toMatchObject({
      action: "choose_target_card", targetCardZone: "hand", targetCardIndex: 0,
    });
    const settled = JSON.parse(responseText);
    expect(settled.room.currentAction?.kind).not.toBe("target_card");
    const postSettle = await page.evaluate(() => {
      window.__w3F2R1AnnouncementTrace.stop();
      return window.__w3F2R1AnnouncementTrace.transitions;
    });
    await testInfo.attach(`w3-f2-r1-${kind.toLowerCase()}-announcement-trace.json`, {
      body: JSON.stringify({ rootEventId, initialViewer, negationSwitches, transitions: postSettle }, null, 2),
      contentType: "application/json",
    });
  });
}
