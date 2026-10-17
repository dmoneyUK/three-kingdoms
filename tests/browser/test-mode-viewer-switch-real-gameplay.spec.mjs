import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

async function postAction(request, action, code, token, values = {}) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, code, token, ...values } });
  const body = await response.json();
  expect(response.status(), JSON.stringify(body)).toBeGreaterThanOrEqual(200);
  expect(response.status(), JSON.stringify(body)).toBeLessThan(300);
  return body;
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

test("Quick Test switching rebases a parked Barbarian Invasion card before the first new-view frame", async ({ page, request }) => {
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
  const before = await rootCard.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return { left: rect.left, top: rect.top };
  });

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
      if (sample.layoutPending === "true") {
        expect(sample.visibility).toBe("hidden");
      } else {
        expect(sample.visibility).toBe("visible");
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
  console.log(`[Q4 TEST SWITCH viewer cycle] ${JSON.stringify(switchResults.map(({ viewerId, h4, firstCommit }) => ({
    viewerId,
    eventId: h4.eventId,
    interactionId: h4.interactionId,
    copy: h4.text,
    centerOffset: h4.centerOffset,
    firstPaint: { phase: firstCommit.phase, layoutPending: firstCommit.layoutPending, transition: firstCommit.transitionProperty },
  })))} `);
});
