import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const SAFE_HEROES = new Set([
  "cao-cao", "xiahou-dun", "liu-bei", "guan-yu", "zhang-fei", "zhao-yun",
  "sun-quan", "gan-ning", "huang-gai", "lu-xun", "huaxiong", "gongsun-zan",
  "pan-feng", "ma-chao", "lü-bu", "simayi", "guo-jia",
]);

async function postAction(request, name, code, token, action, values = {}) {
  const response = await request.post(`${API}/api/rooms`, { data: { action, name, code, token, ...values } });
  const body = await response.json();
  expect(response.status(), `${action}: ${body.error ?? "unexpected response"}`).toBeLessThan(300);
  return body.room;
}

async function readRoom(request, code, token, viewerId) {
  const query = new URLSearchParams({ code, token, ...(viewerId ? { testViewerId: viewerId } : {}) });
  const response = await request.get(`${API}/api/rooms?${query}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function tap(page, locator) {
  const bounds = await locator.boundingBox();
  expect(bounds, "the intended mobile control has a visible hit box").toBeTruthy();
  await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

async function harvestGeometry(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const intersects = (first, second) => Boolean(first && second
      && first.left < second.right - 0.5 && first.right > second.left + 0.5
      && first.top < second.bottom - 0.5 && first.bottom > second.top + 0.5);
    const stage = document.querySelector(".harvest-choice-stage");
    const panel = stage?.querySelector(".harvest-choice-panel");
    const row = panel?.querySelector(".harvest-card-row");
    const root = document.querySelector("[data-public-card-harvest-active='true'] .public-card-display-static-card");
    const announcement = document.querySelector("[data-public-card-announcement='true']");
    const footer = panel?.querySelector(".harvest-confirm-row");
    const timer = document.querySelector(".stage-system-cluster .visible-countdown-event");
    const activity = document.querySelector("[data-public-activity-chip]");
    const seats = [...document.querySelectorAll(".player-board > .opponent-player-card")];
    const switches = [...document.querySelectorAll("[data-testid^='test-view-switch-']")];
    const hit = (element) => {
      const bounds = element.getBoundingClientRect();
      const target = document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2);
      const style = getComputedStyle(element);
      return {
        id: element.getAttribute("data-testid") ?? element.getAttribute("aria-label") ?? element.className,
        target: target?.getAttribute("data-testid") ?? target?.className ?? target?.tagName,
        hitMatches: Boolean(target && (target === element || element.contains(target))),
        pointerEvents: style.pointerEvents,
        zIndex: style.zIndex,
        inertAncestor: Boolean(element.closest("[inert]")),
        bounds: rect(element),
      };
    };
    const visibleControls = (selector) => [...document.querySelectorAll(selector)].filter((element) => {
      const bounds = element.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && getComputedStyle(element).visibility !== "hidden";
    });
    const stageRect = rect(stage);
    const panelRect = rect(panel);
    const rootRect = rect(root);
    const announcementRect = announcement && getComputedStyle(announcement).visibility !== "hidden" ? rect(announcement) : null;
    const footerRect = rect(footer);
    const rowRect = rect(row);
    const rowClip = row ? { left: row.getBoundingClientRect().left + row.clientLeft, right: row.getBoundingClientRect().left + row.clientLeft + row.clientWidth } : null;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      document: {
        scrollX: window.scrollX,
        scrollY: window.scrollY,
        documentWidth: document.documentElement.scrollWidth,
        bodyOverflow: getComputedStyle(document.body).overflow,
        documentOverflow: getComputedStyle(document.documentElement).overflow,
        activeElement: document.activeElement ? {
          tag: document.activeElement.tagName,
          testId: document.activeElement.getAttribute("data-testid"),
          className: document.activeElement.className,
        } : null,
      },
      table: rect(document.querySelector(".play-table")),
      stage: stageRect,
      panel: panelRect,
      panelPointerEvents: panel ? getComputedStyle(panel).pointerEvents : null,
      stagePointerEvents: stage ? getComputedStyle(stage).pointerEvents : null,
      panelZIndex: panel ? getComputedStyle(panel).zIndex : null,
      stageZIndex: stage ? getComputedStyle(stage).zIndex : null,
      root: rootRect,
      announcement: announcementRect,
      row: rowRect,
      rowClip,
      cards: [...(row?.querySelectorAll(".harvest-card-choice") ?? [])].map(rect),
      footer: footerRect,
      timer: rect(timer),
      activity: rect(activity),
      seats: seats.map(rect),
      controlHits: {
        switches: switches.map(hit),
        heroInspector: visibleControls(".opponent-hero-target").slice(0, 4).map(hit),
        handInspection: visibleControls('[data-testid="hand-card-inspection-action"]').slice(0, 4).map(hit),
        publicEquipmentDetails: visibleControls(".opponent-inspection-card").slice(0, 4).map(hit),
        harvestChoices: visibleControls(".harvest-card-select:not([disabled])").slice(0, 4).map(hit),
        harvestInfo: visibleControls(".harvest-card-info").slice(0, 4).map(hit),
        harvestConfirm: visibleControls(".harvest-confirm-row .primary").map(hit),
      },
      overlaps: {
        rootPanel: intersects(rootRect, panelRect),
        rootRow: intersects(rootRect, rowRect),
        panelAnnouncement: intersects(panelRect, announcementRect),
        panelTimer: intersects(panelRect, rect(timer)),
        panelActivity: intersects(panelRect, rect(activity)),
        panelSeat: seats.some((seat) => intersects(panelRect, rect(seat))),
      },
      switches: switches.map(hit),
    };
  });
}

test("Bumper Harvest spectators can switch views while another player chooses", async ({ browser, request }, testInfo) => {
  test.setTimeout(90_000);
  const name = `HARVEST SWITCH ${Date.now().toString(36).toUpperCase()}`;
  const created = await request.post(`${API}/api/rooms`, { data: { action: "create", name } });
  const createdBody = await created.json();
  expect(created.status(), JSON.stringify({ error: createdBody.error })).toBe(201);
  const { code, token } = { code: createdBody.room.code, token: createdBody.token };

  let room = await postAction(request, name, code, token, "add_test_players");
  room = await postAction(request, name, code, token, "enable_test_room");
  room = await postAction(request, name, code, token, "configure_test_hands", {
    presetId: "custom",
    expectedRevision: 0,
    handsBySeat: { 0: ["Attack"], 1: ["BumperHarvest"], 2: ["Attack"], 3: ["Attack"] },
  });
  room = await postAction(request, name, code, token, "start");
  for (let selections = 0; room.status === "heroes" && selections < 8; selections++) {
    const hero = room.myHeroOptions.find((candidate) => candidate.hp >= 4 && SAFE_HEROES.has(candidate.id))
      ?? room.myHeroOptions.find((candidate) => SAFE_HEROES.has(candidate.id));
    expect(hero, "the current TEST seat has a safe Standard hero choice").toBeTruthy();
    room = await postAction(request, name, code, token, "choose_hero", { heroId: hero.id });
  }
  expect(room.status).toBe("playing");

  const source = room.players.find((player) => player.seat === 1);
  const host = room.players.find((player) => player.isHost);
  const controlledAction = async (action, values = {}) => {
    const actorId = room.currentAction?.actorId ?? room.actionPlayerId;
    const context = {
      actionRevision: room.actionRevision,
      meId: room.meId,
      phase: room.phase,
      pendingKind: room.pending?.kind ?? null,
      actorId,
    };
    room = await postAction(request, name, code, token, action, { ...values, context });
  };

  for (let attempts = 0; attempts < 20; attempts++) {
    const actorId = room.currentAction?.actorId ?? room.actionPlayerId;
    if (actorId === source.id && room.phase?.startsWith("draw")) {
      await controlledAction("draw");
    } else if (actorId === source.id && room.phase?.startsWith("play")) {
      const card = room.myHand.find((item) => item.kind === "BumperHarvest");
      expect(card, "Test Player 2 holds Bumper Harvest").toBeTruthy();
      await controlledAction("play_card", { cardId: card.id });
      break;
    } else if (room.phase?.startsWith("draw")) {
      await controlledAction("draw");
    } else if (room.phase?.startsWith("play")) {
      await controlledAction("end_turn");
    } else if (room.phase === "discard") {
      const active = room.players.find((player) => player.id === room.meId);
      const required = Math.max(0, room.myHand.length - (active?.hp ?? 0));
      await controlledAction("discard_cards", { cardIds: room.myHand.slice(0, required).map((card) => card.id) });
    } else {
      throw new Error(`Unexpected ${room.phase} while preparing Test Player 2's turn.`);
    }
  }

  const passCurrentNegationWindow = async () => {
    let current = await readRoom(request, code, token);
    const windowId = current.currentAction?.negationWindowId;
    if (!windowId) return current;
    for (const player of current.players.filter((candidate) => candidate.alive)) {
      current = await readRoom(request, code, token);
      if (current.phase !== "response" || current.currentAction?.negationWindowId !== windowId) break;
      current = await postAction(request, name, code, token, "decline_response", {
        context: {
          actionRevision: current.actionRevision,
          meId: player.id,
          phase: "response",
          pendingKind: "response",
          windowId,
        },
      });
    }
    return readRoom(request, code, token);
  };
  room = await passCurrentNegationWindow();
  expect(room.pendingHarvest, "Negation responses advance to a live Harvest choice").toBeTruthy();
  expect(room.pendingHarvest.actorId).toBe(source.id);
  expect(room.pendingHarvest.choices).toHaveLength(0);

  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    const page = await context.newPage();
    await page.addInitScript(({ roomCode, sessionToken, playerName }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name: playerName }));
    }, { roomCode: code, sessionToken: token, playerName: name });
    await page.goto(`${API}/`);
    await expect(page.locator(".game-shell")).toBeVisible();
    await expect(page.locator(".harvest-choice-stage")).toBeVisible();
    await expect(page.locator(".harvest-choice-panel")).toBeVisible();
    await expect(page.locator(`.local-player-dock[data-player-anchor="${host.id}"]`)).toBeVisible();

    const auditHarvestView = async (viewerLabel, actor, viewerId) => {
      for (const viewport of [
        { width: 390, height: 700 },
        { width: 390, height: 844 },
        { width: 440, height: 766 },
        { width: 480, height: 900 },
      ]) {
        await page.setViewportSize(viewport);
        await expect.poll(async () => {
          const geometry = await harvestGeometry(page);
          return Boolean(geometry.panel && geometry.root && geometry.announcement && geometry.table
            && geometry.stagePointerEvents === "none"
            && Object.values(geometry.overlaps).every((overlap) => !overlap)
            && geometry.panel.top >= Math.max(...geometry.seats.map((seat) => seat.bottom)) - 1
            && geometry.panel.bottom <= geometry.table.bottom + 1
            && (!actor || geometry.footer && geometry.footer.bottom <= viewport.height + 1));
        }, { timeout: 10_000 }).toBe(true);
        const geometry = await harvestGeometry(page);
        expect(geometry.viewport).toEqual(viewport);
        expect(geometry.overlaps, JSON.stringify({ viewerLabel, geometry })).toEqual({
          rootPanel: false,
          rootRow: false,
          panelAnnouncement: false,
          panelTimer: false,
          panelActivity: false,
          panelSeat: false,
        });
        expect(geometry.switches.map((item) => item.target), JSON.stringify({ viewerLabel, geometry }))
          .toEqual(geometry.switches.map((item) => item.id));
        expect(geometry.controlHits.switches.length, JSON.stringify({ viewerLabel, geometry })).toBeGreaterThan(0);
        expect(geometry.controlHits.switches.every((item) => item.hitMatches), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        expect(geometry.controlHits.heroInspector.length, JSON.stringify({ viewerLabel, geometry })).toBeGreaterThan(0);
        expect(geometry.controlHits.heroInspector.every((item) => item.hitMatches), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        expect(geometry.controlHits.handInspection.length, JSON.stringify({ viewerLabel, geometry })).toBeGreaterThan(0);
        expect(geometry.controlHits.handInspection.every((item) => item.hitMatches), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        if (viewport.width === 390 && viewport.height === 700) {
          const currentView = await readRoom(request, code, token, viewerId);
          console.log("[EM-01 live hit-test audit]", JSON.stringify({
            viewerLabel,
            viewerId: currentView.meId,
            actorId: currentView.pendingHarvest?.actorId ?? currentView.currentAction?.actorId ?? null,
            currentAction: currentView.currentAction?.kind ?? null,
            isMyAction: currentView.isMyAction,
            tableStage: {
              stagePointerEvents: geometry.stagePointerEvents,
              stageZIndex: geometry.stageZIndex,
              panelPointerEvents: geometry.panelPointerEvents,
              panelZIndex: geometry.panelZIndex,
              document: geometry.document,
            },
            controls: geometry.controlHits,
          }));
        }
        if (actor) {
          expect(geometry.footer, JSON.stringify({ viewerLabel, geometry })).toBeTruthy();
          expect(geometry.panelPointerEvents).toBe("auto");
          expect(geometry.footer.bottom).toBeLessThanOrEqual(viewport.height + 1);
          expect(geometry.controlHits.harvestChoices.length, JSON.stringify({ viewerLabel, geometry })).toBeGreaterThan(0);
          expect(geometry.controlHits.harvestChoices.every((item) => item.hitMatches), JSON.stringify({ viewerLabel, geometry })).toBe(true);
          expect(geometry.controlHits.harvestInfo.length, JSON.stringify({ viewerLabel, geometry })).toBeGreaterThan(0);
          expect(geometry.controlHits.harvestInfo.every((item) => item.hitMatches), JSON.stringify({ viewerLabel, geometry })).toBe(true);
        } else {
          expect(geometry.footer).toBeNull();
          expect(geometry.panelPointerEvents).toBe("none");
        }
        const screenshot = testInfo.outputPath(`bumper-harvest-${viewerLabel}-${viewport.width}x${viewport.height}.png`);
        await page.screenshot({ path: screenshot, animations: "disabled" });
        await testInfo.attach(`bumper-harvest-${viewerLabel}-${viewport.width}x${viewport.height}`, { path: screenshot, contentType: "image/png" });
        await testInfo.attach(`bumper-harvest-${viewerLabel}-${viewport.width}x${viewport.height}-geometry`, {
          body: JSON.stringify(geometry, null, 2),
          contentType: "application/json",
        });
      }
    };

    const initialHarvest = await readRoom(request, code, token, host.id);
    expect(initialHarvest.isMyAction).toBe(false);
    expect(initialHarvest.pendingHarvest).not.toHaveProperty("previewCardId");
    const initialActorId = initialHarvest.pendingHarvest.actorId;
    const initialChoices = initialHarvest.pendingHarvest.choices.map((choice) => choice.cardId);
    const initialDeadline = initialHarvest.pendingHarvest.countdownUntil;
    await auditHarvestView("spectator", false, host.id);
    await page.setViewportSize({ width: 390, height: 700 });
    const hitMapHandle = await page.waitForFunction(() => {
      const stage = document.querySelector(".harvest-choice-stage");
      const panel = document.querySelector(".harvest-choice-panel");
      if (!stage || !panel) return null;
      const switches = [...document.querySelectorAll("[data-testid^='test-view-switch-']")];
      if (!switches.length) return null;
      const hit = (element) => {
        const rect = element.getBoundingClientRect();
        const target = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return { id: element.getAttribute("data-test-viewer-id"), target: target?.getAttribute("data-testid") ?? target?.className ?? target?.tagName };
      };
      return {
        stagePointerEvents: getComputedStyle(stage).pointerEvents,
        panelPointerEvents: getComputedStyle(panel).pointerEvents,
        switches: switches.map(hit),
      };
    }, null, { timeout: 15_000 });
    const spectatorHitMap = await hitMapHandle.jsonValue();
    await hitMapHandle.dispose();
    expect(spectatorHitMap.stagePointerEvents).toBe("none");
    expect(spectatorHitMap.panelPointerEvents).toBe("none");
    expect(spectatorHitMap.switches.map((item) => item.target)).toEqual(spectatorHitMap.switches.map((item) => `test-view-switch-${item.id}`));
    const beforePath = testInfo.outputPath("bumper-harvest-spectator-before-switch.png");
    await page.screenshot({ path: beforePath, animations: "disabled" });
    await testInfo.attach("bumper-harvest-spectator-hit-map", {
      body: JSON.stringify({ viewport: page.viewportSize(), actorId: initialActorId, viewerId: host.id, ...spectatorHitMap }, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach("bumper-harvest-spectator-before-switch", { path: beforePath, contentType: "image/png" });

    const spectator = room.players.find((player) => player.isTestPlayer && player.id !== source.id);
    await tap(page, page.getByTestId(`test-view-switch-${spectator.id}`));
    const spectatorDock = page.locator(`.local-player-dock[data-player-anchor="${spectator.id}"]`);
    await expect(spectatorDock).toBeVisible();
    await expect(spectatorDock).toBeFocused();
    let afterSwitch = await readRoom(request, code, token, spectator.id);
    expect(afterSwitch.pendingHarvest.actorId).toBe(initialActorId);
    expect(afterSwitch.pendingHarvest.choices.map((choice) => choice.cardId)).toEqual(initialChoices);
    expect(afterSwitch.pendingHarvest).not.toHaveProperty("previewCardId");
    expect(afterSwitch.pendingHarvest.countdownUntil).toBe(initialDeadline);

    const inspectedHero = page.locator(`.opponent-player-card[data-player-anchor="${source.id}"] .opponent-hero-target`);
    await tap(page, inspectedHero);
    await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${source.id}"]`)).toBeVisible();
    await tap(page, page.getByRole("button", { name: `Close ${source.name} inspection` }));
    const handInspection = page.getByTestId("hand-card-inspection-action").first();
    await tap(page, handInspection);
    const cardDetailsAction = page.getByTestId("hand-card-details-action");
    await expect(cardDetailsAction).toBeVisible();
    await tap(page, cardDetailsAction);
    await expect(page.locator('.card-details-panel[data-card-details-context="private-hand"]')).toBeVisible();
    await tap(page, page.getByRole("button", { name: "Close card details" }));

    await tap(page, page.getByTestId(`test-view-switch-${source.id}`));
    const sourceDock = page.locator(`.local-player-dock[data-player-anchor="${source.id}"]`);
    await expect(sourceDock).toBeVisible();
    await expect(sourceDock).toBeFocused();
    await expect(page.locator(".harvest-choice-panel--actor")).toHaveCSS("pointer-events", "auto");
    await auditHarvestView("actor", true, source.id);
    await page.setViewportSize({ width: 390, height: 700 });
    const firstCard = page.locator(".harvest-card-select:not([disabled])").first();
    await expect(firstCard).toBeVisible();
    await tap(page, firstCard);
    await expect(firstCard).toHaveAttribute("aria-pressed", "true");
    const firstCardInfo = page.locator(".harvest-card-choice").first().locator(".harvest-card-info");
    await tap(page, firstCardInfo);
    await expect(page.locator('.card-details-panel[data-card-details-context="public-zone"]')).toBeVisible();
    await expect(firstCard).toHaveAttribute("aria-pressed", "true");
    await tap(page, page.getByRole("button", { name: "Close card details" }));
    await tap(page, firstCard);
    await expect(firstCard).toHaveAttribute("aria-pressed", "false");
    const firstConfirm = page.getByRole("button", { name: "Confirm choice" });
    await expect(firstConfirm).toBeDisabled();
    await tap(page, firstCard);
    await expect(firstCard).toHaveAttribute("aria-pressed", "true");
    await expect(firstConfirm).toBeEnabled();
    await expect(page.getByRole("button", { name: "Confirm choice" })).toHaveCount(1);
    const beforeDraftSwitch = await readRoom(request, code, token, source.id);
    expect(beforeDraftSwitch.pendingHarvest.actorId).toBe(initialActorId);
    expect(beforeDraftSwitch.pendingHarvest.choices.map((choice) => choice.cardId)).toEqual(initialChoices);
    expect(beforeDraftSwitch.pendingHarvest).not.toHaveProperty("previewCardId");
    const activeSwitchTarget = room.players.find((player) => player.isTestPlayer && player.id !== source.id);
    await tap(page, page.getByTestId(`test-view-switch-${activeSwitchTarget.id}`));
    const activeSpectatorDock = page.locator(`.local-player-dock[data-player-anchor="${activeSwitchTarget.id}"]`);
    await expect(activeSpectatorDock).toBeVisible();
    await expect(activeSpectatorDock).toBeFocused();
    await expect(page.locator(".harvest-choice-panel--actor")).toHaveCount(0);
    await expect(page.locator(".harvest-card-select[aria-pressed='true']")).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Confirm choice" })).toHaveCount(0);
    const afterDraftSwitch = await readRoom(request, code, token, activeSwitchTarget.id);
    expect(afterDraftSwitch.pendingHarvest.actorId).toBe(initialActorId);
    expect(afterDraftSwitch.pendingHarvest.choices.map((choice) => choice.cardId)).toEqual(initialChoices);
    expect(afterDraftSwitch.pendingHarvest).not.toHaveProperty("previewCardId");
    await tap(page, page.getByTestId(`test-view-switch-${source.id}`));
    await expect(sourceDock).toBeVisible();
    await expect(sourceDock).toBeFocused();
    await expect(page.locator(".harvest-card-select[aria-pressed='true']")).toHaveCount(0);
    const inspectedActorHero = page.locator(`.opponent-player-card[data-player-anchor="${activeSwitchTarget.id}"] .opponent-hero-target`);
    await tap(page, inspectedActorHero);
    await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${activeSwitchTarget.id}"]`)).toBeVisible();
    await tap(page, page.getByRole("button", { name: `Close ${activeSwitchTarget.name} inspection` }));
    const finalHarvestCard = page.locator(".harvest-card-select:not([disabled])").first();
    await tap(page, finalHarvestCard);
    await expect(finalHarvestCard).toHaveAttribute("aria-pressed", "true");
    await tap(page, finalHarvestCard);
    await expect(finalHarvestCard).toHaveAttribute("aria-pressed", "false");
    await expect(firstConfirm).toBeDisabled();
    await tap(page, finalHarvestCard);
    await expect(finalHarvestCard).toHaveAttribute("aria-pressed", "true");
    await expect(firstConfirm).toBeEnabled();
    const firstChoiceResponse = page.waitForResponse((response) => {
      if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_harvest"; }
      catch { return false; }
    });
    await tap(page, firstConfirm);
    expect((await firstChoiceResponse).ok()).toBeTruthy();
    const secondActorId = room.players.find((player) => player.seat === 2).id;
    room = await passCurrentNegationWindow();
    await expect.poll(async () => {
      const current = await readRoom(request, code, token);
      return { actorId: current.pendingHarvest?.actorId, choices: current.pendingHarvest?.choices.length };
    }).toEqual({ actorId: secondActorId, choices: 1 });
    await expect(page.locator(".harvest-choice-stage")).toBeVisible();
    await expect(page.locator(`.harvest-choice-panel:not(.harvest-choice-panel--actor)`)).toHaveCSS("pointer-events", "none");
    await expect(page.locator(".harvest-card-choice[data-harvest-card-state='taken']")).toHaveCount(1);
    await expect(page.getByText(`Taken by ${source.name}`)).toBeVisible();

    const secondSpectator = room.players.find((player) => player.isTestPlayer && player.id !== source.id && player.id !== secondActorId);
    await tap(page, page.getByTestId(`test-view-switch-${secondSpectator.id}`));
    const secondSpectatorDock = page.locator(`.local-player-dock[data-player-anchor="${secondSpectator.id}"]`);
    await expect(secondSpectatorDock).toBeVisible();
    await expect(secondSpectatorDock).toBeFocused();
    afterSwitch = await readRoom(request, code, token, secondSpectator.id);
    expect(afterSwitch.pendingHarvest.actorId).toBe(secondActorId);
    expect(afterSwitch.pendingHarvest.choices).toHaveLength(1);
    await tap(page, page.getByTestId(`test-view-switch-${secondActorId}`));
    const secondActorDock = page.locator(`.local-player-dock[data-player-anchor="${secondActorId}"]`);
    await expect(secondActorDock).toBeVisible();
    await expect(secondActorDock).toBeFocused();
    await tap(page, page.locator(".harvest-card-select:not([disabled])").first());
    const secondConfirm = page.getByRole("button", { name: "Confirm choice" });
    await expect(secondConfirm).toBeEnabled();
    const secondChoiceResponse = page.waitForResponse((response) => {
      if (response.request().method() !== "POST" || response.url() !== `${API}/api/rooms`) return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_harvest"; }
      catch { return false; }
    });
    await tap(page, secondConfirm);
    expect((await secondChoiceResponse).ok()).toBeTruthy();
    const afterSecondChoice = await readRoom(request, code, token, secondActorId);
    // Each accepted Harvest choice immediately opens that participant's Negation
    // window, so pendingHarvest is intentionally parked until those responses end.
    expect(afterSecondChoice.log.some((entry) => entry.includes(`${room.players.find((player) => player.id === secondActorId).name} chooses`))).toBe(true);
  } finally {
    await context.close();
  }
});
