import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit = "♠", rank = "7") => ({ id, kind, suit, rank });

async function seedGame(request, players) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players },
  });
  if (!response.ok()) throw new Error(`seed game failed: ${await response.text()}`);
  return response.json();
}

async function openGame(page, seed, playerIndex = 0, viewport = { width: 390, height: 844 }, query = "") {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  await page.goto(`${API}/${query ? `?${query}` : ""}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function roomView(request, seed, playerIndex) {
  const token = seed.players[playerIndex].token;
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function controlledRoomView(request, code, token, viewerId) {
  const query = new URLSearchParams({ code, token, ...(viewerId ? { testViewerId: viewerId } : {}) });
  const response = await request.get(`${API}/api/rooms?${query}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function tapMobile(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  const bounds = await locator.boundingBox();
  expect(bounds, "the intended mobile control has a visible touch target").toBeTruthy();
  await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
}

async function act(request, seed, playerIndex, action, extra = {}) {
  const before = await roomView(request, seed, playerIndex);
  expect(before.isMyAction, `${action} actor owns CurrentAction`).toBe(true);
  expect(before.currentAction.legalActions, `${action} is authorized by CurrentAction`).toContain(action);
  const context = before.currentAction.negationWindowId
    ? { context: { windowId: before.currentAction.negationWindowId } }
    : {};
  const response = await request.post(`${API}/api/rooms`, {
    data: { action, code: seed.code, token: seed.players[playerIndex].token, ...context, ...extra },
  });
  if (!response.ok()) throw new Error(`${action} failed: ${await response.text()}`);
  return response.json();
}

async function passEmptyResponses(request, seed) {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    let advanced = false;
    for (let playerIndex = 0; playerIndex < seed.players.length; playerIndex += 1) {
      const view = await roomView(request, seed, playerIndex);
      const current = view.currentAction;
      if (!view.isMyAction || !current) continue;
      if (current.kind === "response" && current.legalActions.includes("decline_response") && !(current.options?.length ?? 0)) {
        await act(request, seed, playerIndex, "decline_response");
        advanced = true;
        break;
      }
      if (current.kind === "trigger" && current.legalActions.includes("decline_trigger") && !(current.triggerOptions?.length ?? 0)) {
        await act(request, seed, playerIndex, "decline_trigger");
        advanced = true;
        break;
      }
    }
    if (!advanced) return;
  }
  throw new Error("The real room did not finish its empty response decisions.");
}

async function playCardThroughPage(page, cardId, targetName) {
  await page.locator(`[data-hand-card-id="${cardId}"] .game-card`).click();
  await page.getByRole("button", { name: `Select ${targetName}`, exact: true }).click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeVisible();
  await expect(confirm).toBeEnabled();
  const responsePromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "play_card"; }
    catch { return false; }
  });
  await confirm.click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`play_card failed: ${await response.text()}`);
}

async function expectModal(page, title, instruction, cta) {
  const dialog = page.getByRole("dialog", { name: `${title} target card selection` });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "false");
  await expect(dialog.locator("header strong")).toHaveText(title.toUpperCase());
  await expect(dialog.locator("header span")).toHaveText(instruction);
  await expect(dialog.getByRole("button", { name: cta })).toBeVisible();
  await expect(page.locator(".table-hidden-card-picker")).toHaveCount(0);
  await expect(page.locator('[data-hero-focus-mode="SELECTABLE DETAIL"]')).toHaveCount(0);
  const geometry = await dialog.evaluate((element) => {
    const overlay = element.parentElement;
    const table = overlay?.parentElement;
    const box = element.getBoundingClientRect();
    return {
      x: box.x, y: box.y, right: box.right, bottom: box.bottom,
      viewportWidth: innerWidth, viewportHeight: innerHeight,
      panelWidthCss: getComputedStyle(element).width,
      panelMaxWidthCss: getComputedStyle(element).maxWidth,
      rootPosition: overlay && getComputedStyle(overlay).position,
      rootInsets: overlay && ["top", "right", "bottom", "left"].map((property) => getComputedStyle(overlay)[property]),
      rootPointerEvents: overlay && getComputedStyle(overlay).pointerEvents,
      panelPointerEvents: getComputedStyle(element).pointerEvents,
      panelReceivesInput: document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2)?.closest(".target-card-picker-panel") === element,
      panelWithinTable: Boolean(table && box.left >= table.getBoundingClientRect().left - 1
        && box.right <= table.getBoundingClientRect().right + 1
        && box.top >= table.getBoundingClientRect().top - 1
        && box.bottom <= table.getBoundingClientRect().bottom + 1),
      cardTargets: [...element.querySelectorAll(".target-card-picker-card")].map((cardElement) => {
        const cardBox = cardElement.getBoundingClientRect();
        return { width: cardBox.width, height: cardBox.height };
      }),
    };
  });
  expect(geometry.x).toBeGreaterThanOrEqual(0);
  expect(geometry.y).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.rootPosition).toBe("absolute");
  expect(geometry.rootInsets).toEqual(["0px", "0px", "0px", "0px"]);
  expect(geometry.rootPointerEvents).toBe("none");
  expect(geometry.panelPointerEvents).toBe("auto");
  expect(geometry.panelReceivesInput).toBe(true);
  expect(geometry.panelWithinTable).toBe(true);
  expect(geometry.cardTargets.length).toBeGreaterThan(0);
  expect(geometry.cardTargets.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(geometry.viewportWidth);
  return dialog;
}

async function expectTargetPool(page, title, instruction, cta) {
  const pool = page.locator(".card-pool-panel--actor-target-select");
  const stage = page.locator(".card-pool-target-stage");
  const viewportWidth = await page.evaluate(() => innerWidth);
  const mergedPhoneSelection = viewportWidth <= 520 && await stage.getAttribute("data-target-card-pool-layout") === "central";
  if (viewportWidth <= 520) {
    const layout = await stage.getAttribute("data-target-card-pool-layout");
    expect(layout, `mobile forced choice must merge: ${await stage.getAttribute("data-target-card-pool-merge-miss")}`).toBe("central");
  }
  if (mergedPhoneSelection) await expect(stage).toHaveAttribute("data-target-card-pool-ready", "true", { timeout: 12_000 });
  await expect(pool).toBeVisible({ timeout: mergedPhoneSelection ? 12_000 : undefined });
  const titleNode = pool.locator(".card-pool-panel__title");
  const instructionNode = pool.locator(".card-pool-panel__instruction");
  if (mergedPhoneSelection) {
    const mergedTitle = (await titleNode.innerText()).replace(/\s+/g, " ").trim();
    expect(mergedTitle).toMatch(new RegExp(`^.+ played ${title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} on .+\\.$`));
    const action = title === "Steal" ? "obtain" : "discard";
    await expect(instructionNode).toHaveText(`You are choosing one card to ${action}`);
    await expect(pool).toHaveAccessibleName(`${mergedTitle} You are choosing one card to ${action}.`);
    await expect(page.locator(".public-card-display-journey-copy")).toHaveCount(0);
    await expect(page.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toHaveCount(0);
  } else {
    await expect(pool).toHaveAccessibleName(`${title} target card selection`);
    await expect(titleNode).toHaveText(title);
    await expect(instructionNode).toHaveText(instruction);
  }
  await expect(pool.getByRole("button", { name: cta, exact: true })).toBeVisible();
  await expect(page.locator(".target-card-picker-overlay")).toHaveCount(0);
  const geometry = await pool.evaluate((element) => {
    const stage = element.parentElement;
    const table = stage?.parentElement;
    const panel = element.getBoundingClientRect();
    const stageStyle = stage ? getComputedStyle(stage) : null;
    const panelStyle = getComputedStyle(element);
    return {
      left: panel.left, top: panel.top, right: panel.right, bottom: panel.bottom,
      width: panel.width,
      viewportWidth: innerWidth, viewportHeight: innerHeight,
      stageRect: stage && (() => { const rect = stage.getBoundingClientRect(); return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }; })(),
      tableRect: table && (() => { const rect = table.getBoundingClientRect(); return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height }; })(),
      stageLayout: stage?.getAttribute("data-target-card-pool-layout"),
      stageReady: stage?.getAttribute("data-target-card-pool-ready"),
      stageWidth: stage?.getBoundingClientRect().width,
      centerLane: table && (() => {
        const board = table.querySelector(".player-board");
        const sides = [...(board?.querySelectorAll(":scope > [data-side-column]") ?? [])].map((seat) => seat.getBoundingClientRect()).filter((rect) => rect.width > 0);
        const left = Math.max(table.getBoundingClientRect().left + 8, ...sides.filter((rect) => rect.right < table.getBoundingClientRect().left + table.getBoundingClientRect().width / 2).map((rect) => rect.right + 8));
        const right = Math.min(table.getBoundingClientRect().right - 8, ...sides.filter((rect) => rect.left > table.getBoundingClientRect().left + table.getBoundingClientRect().width / 2).map((rect) => rect.left - 8));
        return { left, right, width: right - left, midpoint: (left + right) / 2 };
      })(),
      stagePointerEvents: stageStyle?.pointerEvents,
      panelWidthCss: panelStyle.width,
      panelMaxWidthCss: panelStyle.maxWidth,
      stageMeasuredTop: stage?.getAttribute("data-target-card-pool-top"),
      stageInlineTop: stage?.style.top,
      children: [...element.children].map((child) => {
        const rect = child.getBoundingClientRect();
        const style = getComputedStyle(child);
        return { className: child.className, width: rect.width, cssWidth: style.width, maxWidth: style.maxWidth, flex: style.flex };
      }),
      panelPointerEvents: getComputedStyle(element).pointerEvents,
      withinTable: Boolean(table && panel.left >= table.getBoundingClientRect().left - 1
        && panel.right <= table.getBoundingClientRect().right + 1
        && panel.top >= table.getBoundingClientRect().top - 1
        && panel.bottom <= table.getBoundingClientRect().bottom + 1),
      touches: [...element.querySelectorAll(".card-pool-panel__target-select, .card-pool-panel__target-info, .card-pool-panel__tab, .card-pool-panel__confirm")].map((button) => {
        const rect = button.getBoundingClientRect();
        return { width: rect.width, height: rect.height };
      }),
      targetRow: (() => {
        const row = element.querySelector(".card-pool-panel__target-row");
        if (!row) return null;
        const rowRect = row.getBoundingClientRect();
        return {
          left: rowRect.left, right: rowRect.right, clientWidth: row.clientWidth, scrollWidth: row.scrollWidth,
          cards: [...row.querySelectorAll(".card-pool-panel__target-choice")].map((choice) => {
            const rect = choice.getBoundingClientRect();
            return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
          }),
        };
      })(),
      obstacles: [...document.querySelectorAll(".opponent-player-card, .public-card-display-journey-copy, .public-card-journey-card.is-current, .public-activity-chip, .visible-countdown, .stage-system-cluster, .opponent-inspection-floating-shell, .local-player-dock, .local-hand-section, .turn-controls")]
        .map((obstacle) => ({ element: obstacle, rect: obstacle.getBoundingClientRect(), style: getComputedStyle(obstacle) }))
        .filter(({ rect, style }) => style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0)
        .map(({ element: obstacle, rect }) => ({
          name: obstacle.className,
          rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
          separated: panel.right <= rect.left || rect.right <= panel.left || panel.bottom <= rect.top || rect.bottom <= panel.top,
        })),
    };
  });
  expect(geometry.left).toBeGreaterThanOrEqual(0);
  expect(geometry.top).toBeGreaterThanOrEqual(0);
  expect(geometry.right).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewportHeight);
  expect(geometry.right - geometry.left, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.viewportWidth - 16);
  expect(geometry.withinTable, JSON.stringify(geometry)).toBe(true);
  expect(geometry.stagePointerEvents).toBe("none");
  expect(geometry.panelPointerEvents).toBe("auto");
  expect(geometry.touches.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  const overlappingObstacles = geometry.obstacles.filter(({ separated }) => !separated);
  if (mergedPhoneSelection) {
    expect(overlappingObstacles.every(({ name }) => String(name).includes("public-card-journey-card")), JSON.stringify(geometry)).toBe(true);
  } else expect(overlappingObstacles, JSON.stringify(geometry)).toEqual([]);
  if (mergedPhoneSelection) {
    expect(geometry.stageReady).toBe("true");
    expect(geometry.stageWidth).toBeLessThanOrEqual(geometry.centerLane.width + 1);
    expect(Math.abs((geometry.left + geometry.right) / 2 - geometry.centerLane.midpoint), JSON.stringify(geometry)).toBeLessThanOrEqual(4);
    expect(geometry.targetRow.cards.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
    if (geometry.targetRow.cards.length === 3) {
      expect(geometry.targetRow.cards.every(({ left, right }) => left >= geometry.targetRow.left - 1 && right <= geometry.targetRow.right + 1)).toBe(true);
      expect(geometry.targetRow.scrollWidth).toBeLessThanOrEqual(geometry.targetRow.clientWidth + 1);
    }
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(geometry.viewportWidth);
  return pool;
}

function fourPlayers(source, target) {
  return [
    { name: "SOURCE", role: "Rebel", hero: source.hero ?? "zhao-yun", hp: 4, maxHp: 4, hand: source.hand, equipment: source.equipment },
    { name: "TARGET", role: "Loyalist", hero: target.hero ?? "sun-quan", hp: 4, maxHp: 4, hand: target.hand, equipment: target.equipment, judgement: target.judgement },
    { name: "THIRD", role: "Lord", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
  ];
}

const STANDARD_ROLES_BY_SEAT_COUNT = {
  4: ["Lord", "Loyalist", "Rebel", "Renegade"],
  5: ["Lord", "Loyalist", "Rebel", "Rebel", "Renegade"],
  6: ["Lord", "Loyalist", "Rebel", "Rebel", "Rebel", "Renegade"],
  8: ["Lord", "Loyalist", "Loyalist", "Rebel", "Rebel", "Rebel", "Rebel", "Renegade"],
};
const MOBILE_TEST_HEROES = ["cao-cao", "simayi", "zhao-yun", "xiahou-dun", "sun-quan", "guo-jia", "zhang-liao", "gongsun-zan"];

function responsivePlayers(seatCount, { sourceName = "SOURCE", targetName = "TARGET", sourceHand, targetHand = [], equipment, judgement = [] }) {
  const roles = STANDARD_ROLES_BY_SEAT_COUNT[seatCount];
  if (!roles) throw new Error(`Unsupported responsive seat count: ${seatCount}`);
  return roles.map((role, seat) => ({
    name: seat === 0 ? sourceName : seat === 1 ? targetName : `OBSERVER ${seat + 1}`,
    role,
    hero: MOBILE_TEST_HEROES[seat],
    hp: 4,
    maxHp: 4,
    hand: seat === 0 ? sourceHand : seat === 1 ? targetHand : [],
    ...(seat === 1 && equipment ? { equipment } : {}),
    ...(seat === 1 && judgement.length ? { judgement } : {}),
  }));
}

async function openRealTargetCardDecision({ page, request, kind, viewport, handCount = 4, equipment = true, judgement = true, seatCount = 4 }) {
  const prefix = `real-${kind.toLowerCase()}-${viewport.width}-${handCount}`;
  const material = card(kind, `${prefix}-material`);
  const hidden = Array.from({ length: handCount }, (_, index) => card("Peach", `${prefix}-hidden-${index}`));
  const weapon = equipment ? card("ZhugeCrossbow", `${prefix}-weapon`, "♦", "A") : null;
  const armor = equipment ? card("NioShield", `${prefix}-armor`) : null;
  const delayed = judgement ? card("Lightning", `${prefix}-judgement`) : null;
  const targetEquipment = equipment ? { weapon, armor } : undefined;
  const targetJudgement = judgement ? [delayed] : undefined;
  const seedPlayers = seatCount === 4
    ? fourPlayers({ hand: [material] }, { hand: hidden, equipment: targetEquipment, judgement: targetJudgement })
    : responsivePlayers(seatCount, {
      sourceHand: [material], targetHand: hidden, equipment: targetEquipment, judgement: targetJudgement,
    });
  const seed = await seedGame(request, seedPlayers);
  await openGame(page, seed, 0, viewport);
  await playCardThroughPage(page, material.id, "TARGET");
  await passEmptyResponses(request, seed);

  const actorView = await roomView(request, seed, 0);
  const expectedKeys = [
    ...hidden.map((_, index) => `hand:${index}`),
    ...(equipment ? [weapon.id, armor.id] : []),
    ...(judgement ? [delayed.id] : []),
  ];
  expect(actorView.currentAction).toMatchObject({ kind: "target_card", actorId: seed.players[0].id });
  expect(actorView.currentAction.legalActions).toContain("choose_target_card");
  expect(actorView.currentAction.targetCardSelection).toMatchObject({ targetId: seed.players[1].id, eligibleKeys: expectedKeys });
  for (const concealed of hidden) expect(JSON.stringify(actorView.currentAction)).not.toContain(concealed.id);

  const title = kind === "Dismantle" ? "Burning Bridge" : "Steal";
  const instruction = kind === "Dismantle" ? "Choose 1 card to discard" : "Choose 1 card to obtain";
  const dialog = await expectTargetPool(page, title, instruction, `Use ${title}`);
  return { seed, actorView, dialog, hidden, weapon, armor, delayed, title };
}

test("mandatory target-card picker keeps actor inspection and TEST SWITCH touchable", async ({ browser, request }, testInfo) => {
  test.setTimeout(90_000);
  const name = `BCP2 SWITCH ${Date.now().toString(36).toUpperCase()}`;
  const createResponse = await request.post(`${API}/api/rooms`, { data: { action: "create", name } });
  const created = await createResponse.json();
  expect(createResponse.status()).toBe(201);
  const { code, token } = { code: created.room.code, token: created.token };
  const post = async (action, values = {}) => {
    const response = await request.post(`${API}/api/rooms`, { data: { action, name, code, token, ...values } });
    const body = await response.json();
    expect(response.status(), `${action}: ${body.error ?? "unexpected response"}`).toBeLessThan(300);
    return body.room;
  };

  let room = await post("add_test_players");
  room = await post("enable_test_room");
  room = await post("configure_test_hands", {
    presetId: "custom",
    expectedRevision: 0,
    handsBySeat: { 0: ["Steal"], 1: ["Peach", "Dodge"], 2: ["Attack"], 3: ["Attack"] },
  });
  room = await post("start");
  for (let selections = 0; room.status === "heroes" && selections < 8; selections++) {
    const hero = room.myHeroOptions.find((candidate) => candidate.hp >= 4);
    expect(hero, "the active TEST seat has a four-HP Standard hero available").toBeTruthy();
    room = await post("choose_hero", { heroId: hero.id });
  }
  expect(room.status).toBe("playing");
  const source = room.players.find((player) => player.seat === 0);
  const target = room.players.find((player) => player.seat === 1);
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
  };

  let playedSteal = false;
  for (let attempt = 0; attempt < 24 && !playedSteal; attempt++) {
    const actorId = room.currentAction?.actorId ?? room.actionPlayerId;
    if (actorId === source.id && room.phase?.startsWith("draw")) await controlledAction("draw");
    else if (actorId === source.id && room.phase?.startsWith("play")) {
      const steal = room.myHand.find((held) => held.kind === "Steal");
      expect(steal, "the source holds the configured Steal card").toBeTruthy();
      await controlledAction("play_card", { cardId: steal.id, targetId: target.id });
      playedSteal = true;
    } else if (room.phase?.startsWith("draw")) await controlledAction("draw");
    else if (room.phase?.startsWith("play")) await controlledAction("end_turn");
    else if (room.phase === "discard") {
      const active = room.players.find((player) => player.id === room.meId);
      const required = Math.max(0, room.myHand.length - (active?.hp ?? 0));
      await controlledAction("discard_cards", { cardIds: room.myHand.slice(0, required).map((held) => held.id) });
    } else if (room.currentAction?.kind === "trigger" && room.currentAction.legalActions.includes("decline_trigger")) {
      await controlledAction("decline_trigger");
    } else throw new Error(`Unexpected ${room.phase} (actor ${actorId ?? "none"}, pending ${room.pending?.kind ?? "none"}, action ${room.currentAction?.kind ?? "none"}) while preparing Steal.`);
  }
  expect(playedSteal).toBe(true);

  let current = await controlledRoomView(request, code, token);
  const windowId = current.currentAction?.negationWindowId;
  if (windowId) {
    for (const player of current.players.filter((candidate) => candidate.alive)) {
      current = await controlledRoomView(request, code, token);
      if (current.phase !== "response" || current.currentAction?.negationWindowId !== windowId) break;
      const response = await request.post(`${API}/api/rooms`, {
        data: { action: "decline_response", name, code, token, context: {
          actionRevision: current.actionRevision, meId: player.id, phase: "response", pendingKind: "response", windowId,
        } },
      });
      expect(response.status(), `Negation pass for ${player.name}`).toBeLessThan(300);
    }
  }
  current = await controlledRoomView(request, code, token);
  expect(current.pendingTargetCard?.actorId).toBe(source.id);

  const context = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    const page = await context.newPage();
    await page.addInitScript(({ roomCode, sessionToken, playerName }) => {
      localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name: playerName }));
    }, { roomCode: code, sessionToken: token, playerName: name });
    await page.goto(`${API}/`);
    const dialog = await expectTargetPool(page, "Steal", "Choose 1 card to obtain", "Use Steal");
    const hidden = dialog.getByRole("button", { name: "Choose hidden Hand position 1" });
    await expect(hidden).toBeEnabled({ timeout: 15_000 });
    await tapMobile(page, hidden);
    await expect(hidden).toHaveAttribute("aria-pressed", "true");

    const actorAction = await controlledRoomView(request, code, token, source.id);
    const inspectorTrigger = page.locator(`.opponent-player-card[data-player-anchor="${target.id}"] .opponent-hero-target`);
    await tapMobile(page, inspectorTrigger);
    const inspection = page.locator(`.opponent-inspection-panel[data-inspect-player-id="${target.id}"]`);
    await expect(inspection).toBeVisible();
    await tapMobile(page, inspectorTrigger);
    await expect(hidden).toHaveAttribute("aria-pressed", "true");

    const spectator = room.players.find((player) => player.seat === 2);
    const targetView = await controlledRoomView(request, code, token, target.id);
    const privateTargetCardIds = targetView.myHand.map((held) => held.id);
    await tapMobile(page, page.getByTestId(`test-view-switch-${spectator.id}`));
    await expect(page.locator(`.local-player-dock[data-player-anchor="${spectator.id}"]`)).toBeVisible();
    await expect(dialog).toHaveCount(0);
    const spectatorView = await controlledRoomView(request, code, token, spectator.id);
    expect(spectatorView.isMyAction).toBe(false);
    expect(spectatorView.currentAction?.targetCardSelection).toBeUndefined();
    for (const cardId of privateTargetCardIds) {
      expect(JSON.stringify(spectatorView)).not.toContain(cardId);
    }

    await tapMobile(page, page.getByTestId(`test-view-switch-${source.id}`));
    await expect(page.locator(`.local-player-dock[data-player-anchor="${source.id}"]`)).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(hidden).toHaveAttribute("aria-pressed", "false");
    await expect(dialog.getByRole("button", { name: "Use Steal", exact: true })).toBeDisabled();
    const actorAfterReturn = await controlledRoomView(request, code, token, source.id);
    expect(actorAfterReturn.actionRevision).toBe(actorAction.actionRevision);
    await page.screenshot({ path: testInfo.outputPath("steal-picker-actor-return-390x700.png"), animations: "disabled" });
    await testInfo.attach("steal-picker-actor-return-390x700", { path: testInfo.outputPath("steal-picker-actor-return-390x700.png"), contentType: "image/png" });
  } finally {
    await context.close();
  }
});

async function attachScreenshot(testInfo, name, page) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

for (const kind of ["Steal", "Dismantle"]) {
  test(`real ${kind} gameplay reaches the shared pool from the server target-card decision`, async ({ page, request, browser }) => {
    const material = card(kind, `real-${kind.toLowerCase()}-material`);
    const hidden = [card("Peach", `real-${kind.toLowerCase()}-hidden-a`), card("Dodge", `real-${kind.toLowerCase()}-hidden-b`)];
    const shield = card("NioShield", `real-${kind.toLowerCase()}-shield`);
    const delayed = card("Lightning", `real-${kind.toLowerCase()}-judgement`);
    const seed = await seedGame(request, fourPlayers(
      { hand: [material] },
      { hand: hidden, equipment: { armor: shield }, judgement: [delayed] },
    ));
    await openGame(page, seed);
    await playCardThroughPage(page, material.id, "TARGET");
    await passEmptyResponses(request, seed);

    if (kind === "Dismantle") {
      const publicCardDisplay = page.locator('[data-public-card-display="true"]');
      await expect(publicCardDisplay).toHaveCount(1);
      const announcement = publicCardDisplay.locator('[data-public-card-announcement="true"]');
      if (await page.evaluate(() => innerWidth) > 520) {
        await expect(announcement).toHaveCount(1);
        await expect(announcement).toContainText("SOURCE played Burning Bridges on TARGET.");
        await expect(announcement.locator("small,span,strong")).toHaveCount(0);
      }
    }

    const actorView = await roomView(request, seed, 0);
    expect(actorView.currentAction).toMatchObject({ kind: "target_card", actorId: seed.players[0].id });
    expect(actorView.currentAction.legalActions).toContain("choose_target_card");
    expect(actorView.currentAction.targetCardSelection).toMatchObject({
      targetId: seed.players[1].id,
      eligibleKeys: [`hand:0`, `hand:1`, shield.id, delayed.id],
    });
    expect(JSON.stringify(actorView.currentAction)).not.toContain(hidden[0].id);
    expect(JSON.stringify(actorView.currentAction)).not.toContain(hidden[1].id);

    const action = kind === "Steal" ? "Steal" : "Burning Bridge";
    const instruction = kind === "Steal" ? "Choose 1 card to obtain" : "Choose 1 card to discard";
    const dialog = await expectTargetPool(page, action, instruction, `Use ${action}`);
    if (kind === "Dismantle" && await page.evaluate(() => innerWidth) <= 520) {
      await expect(page.locator('[data-public-card-display="true"] [data-public-card-announcement="true"]')).toHaveCount(0);
    }
    await expect(dialog.locator('.card-pool-panel__target-choice[data-choice-key-type="concealed-position"]')).toHaveCount(2);
    await dialog.getByRole("tab", { name: "EQUIPMENT 1" }).click();
    await expect(dialog.getByRole("button", { name: "Equipment: Nio Shield", exact: true })).toBeVisible();

    const sourceBeforeObserver = await roomView(request, seed, 0);
    const spectatorPage = await browser.newPage();
    try {
      await openGame(spectatorPage, seed, 2);
      await expect(spectatorPage.locator(".card-pool-panel--actor-target-select")).toHaveCount(0);
      if (kind === "Dismantle") {
        await expect(spectatorPage.locator('[data-public-card-display="true"] [data-public-card-announcement="true"]'))
          .toContainText("SOURCE played Burning Bridge on TARGET.");
      }
      const spectatorView = await roomView(request, seed, 2);
      expect(spectatorView.isMyAction).toBe(false);
      expect(spectatorView.currentAction?.targetCardSelection).toBeUndefined();
      const spectatorMarkup = await spectatorPage.locator("body").innerHTML();
      for (const concealed of hidden) {
        expect(JSON.stringify(spectatorView)).not.toContain(concealed.id);
        expect(spectatorMarkup).not.toContain(concealed.id);
      }
      const sourceAfterObserver = await roomView(request, seed, 0);
      expect(sourceAfterObserver.actionRevision).toBe(sourceBeforeObserver.actionRevision);
      expect(sourceAfterObserver.currentAction).toMatchObject({
        actorId: seed.players[0].id,
        kind: "target_card",
        targetCardSelection: sourceBeforeObserver.currentAction.targetCardSelection,
      });
    } finally {
      await spectatorPage.close();
    }

    await dialog.getByRole("tab", { name: "JUDGEMENT 1" }).click();
    const judgment = dialog.getByRole("button", { name: "Judgement: Lightning", exact: true });
    await judgment.click({ position: { x: 8, y: 8 } });
    await expect(judgment).toHaveAttribute("aria-pressed", "true");
    await expect(dialog.locator(".card-pool-panel__selection-count")).toHaveText("1 / 1 selected");

    const submitPromise = page.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
      catch { return false; }
    });
    await dialog.getByRole("button", { name: `Use ${action}` }).click();
    const submitted = await submitPromise;
    if (!submitted.ok()) throw new Error(`${kind} choice failed: ${await submitted.text()}`);
    const requestBody = JSON.parse(submitted.request().postData() ?? "{}");
    expect(requestBody).toMatchObject({ action: "choose_target_card", targetCardZone: "judgement", targetCardId: delayed.id });
    const settled = await submitted.json();
    expect(settled.room.players.find((player) => player.id === seed.players[1].id).judgementCards).toEqual([]);
  });
}

for (const kind of ["Steal", "Dismantle"]) {
  test(`real ${kind} target choice has identical private-safe progress on four independent mobile views`, async ({ browser, request }, testInfo) => {
    test.setTimeout(90_000);
    const material = card(kind, `four-view-${kind.toLowerCase()}-material`);
    const hidden = card("Peach", `four-view-${kind.toLowerCase()}-hidden`);
    const seed = await seedGame(request, fourPlayers({ hand: [material] }, { hand: [hidden] }));
    const contexts = await Promise.all(seed.players.map(() => browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    })));
    const pages = await Promise.all(contexts.map((context) => context.newPage()));

    try {
      await Promise.all(pages.map((viewerPage, index) => openGame(viewerPage, seed, index, { width: 390, height: 844 })));
      const actorPage = pages[0];
      await playCardThroughPage(actorPage, material.id, "TARGET");

      const preChoiceViews = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
      expect(preChoiceViews[0].pendingNegation).toBeTruthy();
      for (const view of preChoiceViews) expect(view.pendingTargetCard).toBeNull();
      for (const viewerPage of pages) {
        await expect(viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toHaveCount(0);
      }

      await passEmptyResponses(request, seed);
      const choiceViews = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
      const sharedPending = choiceViews[0].pendingTargetCard;
      expect(sharedPending).toMatchObject({
        kind: "target_card",
        sourceId: seed.players[0].id,
        actorId: seed.players[0].id,
        targetId: seed.players[1].id,
        cardKind: kind,
      });
      expect(Object.keys(sharedPending).sort()).toEqual(["actorId", "cardKind", "kind", "sourceId", "targetId"]);
      for (const view of choiceViews) expect(view.pendingTargetCard).toEqual(sharedPending);

      expect(choiceViews[0].currentAction).toMatchObject({ kind: "target_card", actorId: seed.players[0].id });
      expect(choiceViews[0].currentAction.targetCardSelection).toMatchObject({ targetId: seed.players[1].id, eligibleKeys: ["hand:0"] });
      expect(JSON.stringify(choiceViews[0].currentAction)).not.toContain(hidden.id);
      for (let index = 1; index < choiceViews.length; index++) {
        expect(choiceViews[index].currentAction?.targetCardSelection).toBeUndefined();
        expect(JSON.stringify(choiceViews[index].presentationSnapshot)).not.toContain(hidden.id);
        if (index !== 1) expect(JSON.stringify(choiceViews[index])).not.toContain(hidden.id);
      }

      // Each independent mobile context may have been backgrounded while the
      // API advanced the response window. Re-fetch the authoritative current
      // projection before checking its rendered presentation.
      await Promise.all(pages.map((viewerPage, index) => openGame(viewerPage, seed, index, { width: 390, height: 844 })));

      const effectName = kind === "Steal" ? "Steal" : "Burning Bridges";
      const modalTitle = kind === "Steal" ? "Steal" : "Burning Bridge";
      const sharedLabel = `SOURCE is choosing one card from TARGET · ${effectName}`;
      for (let index = 0; index < pages.length; index++) {
        const viewerPage = pages[index];
        const chip = viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]');
        const actorStage = viewerPage.locator('.card-pool-target-stage[data-target-card-pool-layout="central"]');
        const actorMergesCopy = index === 0 && await actorStage.count() > 0;
        if (actorMergesCopy) {
          await expect(actorStage).toHaveAttribute("data-target-card-pool-ready", "true", { timeout: 12_000 });
          await expect(chip).toHaveCount(0);
          await expect(viewerPage.locator(".public-card-display-journey-copy")).toHaveCount(0);
          await expect(viewerPage.locator(".card-pool-panel__title")).toContainText(new RegExp(`played ${modalTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} on TARGET\\.`));
          await expect(viewerPage.locator(".card-pool-panel__instruction")).toContainText("You are choosing one card");
        } else {
          await expect(chip).toHaveAttribute("data-public-activity-kind", "target-card-choice", { timeout: 15_000 });
          await expect(chip).toBeVisible();
          await expect(chip).toHaveAttribute("aria-label", sharedLabel);
          await expect(chip.locator("strong")).toHaveText("Choosing TARGET's card");
          await expect(viewerPage.locator(".public-card-display-journey-copy")).toContainText(`SOURCE played ${modalTitle} on TARGET.`);
        }
        const chipRect = actorMergesCopy ? null : await chip.boundingBox();
        const tableRect = await viewerPage.locator(".play-table").boundingBox();
        expect(tableRect).toBeTruthy();
        if (chipRect) {
          expect(chipRect.x).toBeGreaterThanOrEqual(tableRect.x);
          expect(chipRect.y).toBeGreaterThanOrEqual(tableRect.y);
          expect(chipRect.x + chipRect.width).toBeLessThanOrEqual(tableRect.x + tableRect.width);
          expect(chipRect.y + chipRect.height).toBeLessThanOrEqual(tableRect.y + tableRect.height);
        }
        if (chipRect && index !== 1) {
          const layout = await chip.getAttribute("data-public-activity-layout");
          expect(layout).toMatch(/^(target-seat-adjacent|bottom-center|lower-band-(center|left|right))$/);
        }
        const targetPicker = viewerPage.locator(".card-pool-panel--actor-target-select");
        if (await targetPicker.isVisible().catch(() => false) && chipRect) {
          const pickerRect = await targetPicker.boundingBox();
          expect(pickerRect && (chipRect.x + chipRect.width <= pickerRect.x
            || pickerRect.x + pickerRect.width <= chipRect.x
            || chipRect.y + chipRect.height <= pickerRect.y
            || pickerRect.y + pickerRect.height <= chipRect.y)).toBeTruthy();
        }
        if (chipRect) {
          for (const obstacle of await viewerPage.locator(".public-card-journey-card, .public-card-display-journey-copy").all()) {
            const obstacleRect = await obstacle.boundingBox();
            if (!obstacleRect) continue;
            expect(chipRect.x + chipRect.width <= obstacleRect.x
              || obstacleRect.x + obstacleRect.width <= chipRect.x
              || chipRect.y + chipRect.height <= obstacleRect.y
              || obstacleRect.y + obstacleRect.height <= chipRect.y).toBeTruthy();
          }
          const chipText = `${await chip.innerText()} ${await chip.innerHTML()}`;
          expect(chipText).not.toMatch(/Hand|Equipment|Judgement|hand:|index|eligible|candidate/i);
          expect(chipText).not.toContain(hidden.id);
        }
        if (index > 0) await expect(viewerPage.locator(".card-pool-panel--actor-target-select")).toHaveCount(0);
      }

      for (const [index, viewerPage] of pages.entries()) {
        const path = testInfo.outputPath(`${kind.toLowerCase()}-public-choice-view-${index + 1}-390x844.png`);
        await viewerPage.screenshot({ path, animations: "disabled" });
        await testInfo.attach(`${kind.toLowerCase()}-public-choice-view-${index + 1}-390x844`, { path, contentType: "image/png" });
      }

      const instruction = kind === "Steal" ? "Choose 1 card to obtain" : "Choose 1 card to discard";
      const dialog = await expectTargetPool(actorPage, modalTitle, instruction, `Use ${modalTitle}`);
      const hiddenCard = dialog.getByRole("button", { name: "Choose hidden Hand position 1", exact: true });
      await hiddenCard.click();
      await expect(hiddenCard).toHaveAttribute("aria-pressed", "true");
      const submitPromise = actorPage.waitForResponse((response) => {
        if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
        try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
        catch { return false; }
      });
      await dialog.getByRole("button", { name: `Use ${modalTitle}` }).click();
      const submitted = await submitPromise;
      expect(submitted.ok()).toBe(true);
      expect(JSON.parse(submitted.request().postData() ?? "{}")).toMatchObject({
        action: "choose_target_card",
        targetCardZone: "hand",
        targetCardIndex: 0,
      });
      expect((await submitted.json()).room.pendingTargetCard).toBeNull();
      for (let index = 0; index < seed.players.length; index++) {
        expect((await roomView(request, seed, index)).pendingTargetCard).toBeNull();
      }
      for (const viewerPage of pages) {
        await expect(viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toHaveCount(0, { timeout: 15_000 });
      }
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}

test("settled Steal and Burning Bridges share proven source-to-destination outcomes across six mobile paths", async ({ browser, request }, testInfo) => {
  test.setTimeout(240_000);
  const cases = [
    { effect: "Steal", kind: "Steal", zone: "hand", destination: "hand" },
    { effect: "Steal", kind: "Steal", zone: "equipment", destination: "hand" },
    { effect: "Steal", kind: "Steal", zone: "judgement", destination: "hand" },
    { effect: "Dismantle", kind: "Dismantle", zone: "hand", destination: "discard" },
    { effect: "Dismantle", kind: "Dismantle", zone: "equipment", destination: "discard" },
    { effect: "Dismantle", kind: "Dismantle", zone: "judgement", destination: "discard" },
  ];

  for (const { effect, kind, zone, destination } of cases) {
    const suffix = `settlement-${effect.toLowerCase()}-${zone}`;
    const material = card(kind, `${suffix}-root`);
    const hidden = card("Peach", `${suffix}-hidden-hand`, "♥", "7");
    const equipment = card("NioShield", `${suffix}-equipment`, "♦", "A");
    const judgement = card("Lightning", `${suffix}-judgement`, "♣", "K");
    const seed = await seedGame(request, fourPlayers(
      { hand: [material] },
      { hand: [hidden], equipment: { armor: equipment }, judgement: [judgement] },
    ));
    const contexts = await Promise.all(seed.players.map(() => browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    })));
    const pages = await Promise.all(contexts.map((context) => context.newPage()));

    try {
      await Promise.all(pages.map((viewerPage, index) => openGame(viewerPage, seed, index, { width: 390, height: 844 })));
      await playCardThroughPage(pages[0], material.id, "TARGET");
      await passEmptyResponses(request, seed);

      const kindTitle = kind === "Steal" ? "Steal" : "Burning Bridge";
      const instruction = kind === "Steal" ? "Choose 1 card to obtain" : "Choose 1 card to discard";
      const dialog = await expectTargetPool(pages[0], kindTitle, instruction, `Use ${kindTitle}`);
      if (zone === "equipment") await dialog.getByRole("tab", { name: "EQUIPMENT 1" }).click();
      if (zone === "judgement") await dialog.getByRole("tab", { name: "JUDGEMENT 1" }).click();
      const option = zone === "hand"
        ? dialog.getByRole("button", { name: "Choose hidden Hand position 1", exact: true })
        : zone === "equipment"
          ? dialog.getByRole("button", { name: "Equipment: Nio Shield", exact: true })
          : dialog.getByRole("button", { name: "Judgement: Lightning", exact: true });
      await expect(option).toBeVisible();
      await option.click();
      await expect(option).toHaveAttribute("aria-pressed", "true");

      const submitPromise = pages[0].waitForResponse((response) => {
        if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
        try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
        catch { return false; }
      });
      await dialog.getByRole("button", { name: `Use ${kindTitle}` }).click();
      const submitted = await submitPromise;
      expect(submitted.ok(), `${effect}/${zone} commits successfully`).toBe(true);
      const submission = JSON.parse(submitted.request().postData() ?? "{}");
      expect(submission).toMatchObject({ action: "choose_target_card", targetCardZone: zone });
      if (zone === "hand") expect(submission).toMatchObject({ targetCardIndex: 0 });
      else expect(submission).toMatchObject({ targetCardId: zone === "equipment" ? equipment.id : judgement.id });

      const views = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
      const publicField = effect === "Steal" ? "stealSettlements" : "dismantleSettlements";
      const proof = views[0].presentationV2[publicField][0];
      expect(proof).toMatchObject({
        semantics: "PROVEN",
        sourceId: seed.players[0].id,
        targetId: seed.players[1].id,
        sourceZone: zone,
        affectedCardOwnerId: zone === "judgement" ? null : seed.players[1].id,
        destinationZone: destination,
        destinationOwnerId: destination === "hand" ? seed.players[0].id : null,
      });
      const affected = zone === "hand" ? hidden : zone === "equipment" ? equipment : judgement;
      const publiclyIdentified = effect === "Dismantle" || zone !== "hand";
      expect(Object.hasOwn(proof, "affectedCardFace")).toBe(publiclyIdentified);
      if (publiclyIdentified) expect(proof.affectedCardFace).toEqual(affected);
      else expect(JSON.stringify(proof)).not.toContain(hidden.id);

      for (const view of views) {
        expect(view.pendingTargetCard).toBeNull();
        expect(view.currentAction?.targetCardSelection).toBeUndefined();
        expect(view.presentationV2[publicField]).toEqual(views[0].presentationV2[publicField]);
        expect(view.presentationSnapshot[publicField]).toEqual(views[0].presentationSnapshot[publicField]);
        const wire = JSON.stringify({ presentationV2: view.presentationV2, presentationSnapshot: view.presentationSnapshot, timeline: view.timeline, log: view.log });
        expect(wire.includes(hidden.id)).toBe(effect === "Dismantle" && zone === "hand");
      }

      const expectedOutcome = effect === "Steal" ? "STEAL_RESOLVED" : "DISMANTLE_RESOLVED";
      const expectedFaceId = publiclyIdentified ? affected.id : null;
      const expectedName = publiclyIdentified
        ? `${zone === "hand" ? "Peach" : zone === "equipment" ? "Nio Shield" : "Lightning"} (${affected.rank}${affected.suit})`
        : "one card";
      const expectedCopy = effect === "Steal"
        ? `SOURCE took ${expectedName} from TARGET's ${zone[0].toUpperCase()}${zone.slice(1)} into SOURCE's Hand.`
        : `SOURCE discarded ${expectedName} from TARGET's ${zone[0].toUpperCase()}${zone.slice(1)} to the discard pile.`;

      await Promise.all(pages.map(async (viewerPage, index) => {
        const journey = viewerPage.locator('[data-public-card-display="true"]');
        await expect(journey).toHaveCount(1);
        await expect(journey).toHaveAttribute("data-public-card-settlement-outcome", expectedOutcome, { timeout: 15_000 });
        await expect(journey).toHaveAttribute("data-public-card-settlement-source-zone", zone);
        await expect(journey).toHaveAttribute("data-public-card-settlement-destination-zone", destination);
        await expect(journey).toHaveAttribute("data-public-card-settlement-affected-card-owner-id", zone === "judgement" ? "none" : seed.players[1].id);
        await expect(journey).toHaveAttribute("data-public-card-settlement-destination-owner-id", destination === "hand" ? seed.players[0].id : "none");
        if (expectedFaceId) await expect(journey).toHaveAttribute("data-public-card-settlement-card-id", expectedFaceId);
        else await expect(journey).not.toHaveAttribute("data-public-card-settlement-card-id");
        const announcement = viewerPage.locator('[data-public-card-announcement="true"]');
        await expect(announcement).toHaveCount(1);
        await expect(announcement).toContainText(expectedCopy);
        const publicPresenterMarkup = await journey.innerHTML();
        if (effect === "Steal" && zone === "hand") expect(publicPresenterMarkup).not.toContain(hidden.id);
        if (index > 0 && effect === "Steal" && zone === "hand") {
          expect(await viewerPage.locator("body").innerHTML()).not.toContain(hidden.id);
        }
      }));

      const screenshotPaths = pages.map((_, index) => testInfo.outputPath(`${effect.toLowerCase()}-${zone}-settlement-view-${index + 1}-390x844.png`));
      const screenshots = await Promise.all(pages.map((viewerPage, index) => viewerPage.screenshot({ path: screenshotPaths[index], animations: "disabled" })));
      for (const [index, screenshot] of screenshots.entries()) {
        await testInfo.attach(`${effect.toLowerCase()}-${zone}-settlement-view-${index + 1}-390x844`, { body: screenshot, contentType: "image/png" });
      }

      await Promise.all(pages.map((viewerPage) => viewerPage.reload()));
      for (const [index, viewerPage] of pages.entries()) {
        await expect(viewerPage.locator(".game-shell")).toBeVisible();
        const replayed = await roomView(request, seed, index);
        expect(replayed.presentationV2[publicField]).toEqual(views[index].presentationV2[publicField]);
        expect(replayed.presentationSnapshot[publicField]).toEqual(views[index].presentationSnapshot[publicField]);
        expect(JSON.stringify(replayed.presentationSnapshot[publicField])).toBe(JSON.stringify(views[0].presentationSnapshot[publicField]));
        await expect(viewerPage.locator(".card-pool-panel--actor-target-select")).toHaveCount(0);
      }
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  }
});

test("T3 settlement stays shared across mobile sizes, 4/5/6/8 seats, reloads, and a fast next Stratagem", async ({ browser, request }, testInfo) => {
  test.setTimeout(360_000);
  const scenarios = [
    { seats: 4, viewport: { width: 390, height: 844 }, effect: "Steal", kind: "Steal", zone: "hand", extraRoot: true },
    { seats: 5, viewport: { width: 390, height: 700 }, effect: "Steal", kind: "Steal", zone: "hand" },
    { seats: 6, viewport: { width: 440, height: 894 }, effect: "Dismantle", kind: "Dismantle", zone: "equipment", equipmentOnly: true, longNames: true },
    { seats: 8, viewport: { width: 480, height: 900 }, effect: "Steal", kind: "Steal", zone: "judgement", reducedMotion: true },
    { seats: 4, viewport: { width: 390, height: 700 }, effect: "Dismantle", kind: "Dismantle", zone: "hand", oneCard: true },
  ];
  const selectedScenarios = process.env.T3_CASE
    ? scenarios.filter((scenario) => `${scenario.effect.toLowerCase()}-${scenario.zone}-${scenario.seats}p-${scenario.viewport.width}x${scenario.viewport.height}` === process.env.T3_CASE)
    : scenarios;

  for (const scenario of selectedScenarios) {
    const label = `${scenario.effect.toLowerCase()}-${scenario.zone}-${scenario.seats}p-${scenario.viewport.width}x${scenario.viewport.height}`;
    const rootCard = card(scenario.kind, `t3-${label}-root`);
    const nextRoot = scenario.extraRoot ? card("Dismantle", `t3-${label}-next-root`, "♦", "8") : null;
    const hiddenHand = scenario.equipmentOnly ? [] : scenario.oneCard
      ? [card("Peach", `t3-${label}-target-one-card`, "♥", "3")]
      : [card("Peach", `t3-${label}-target-hidden-one`, "♥", "7"), card("Dodge", `t3-${label}-target-hidden-two`, "♣", "4")];
    const equipment = scenario.equipmentOnly || scenario.extraRoot ? { armor: card("NioShield", `t3-${label}-armor`, "♦", "A") } : undefined;
    const judgement = scenario.zone === "judgement" ? [card("Lightning", `t3-${label}-judgement`, "♠", "K")] : [];
    const sourceName = scenario.longNames ? "SOURCE WITH A LONG MOBILE PLAYER NAME" : "SOURCE";
    const targetName = scenario.longNames ? "TARGET WITH A LONG MOBILE PLAYER NAME" : "TARGET";
    const seed = await seedGame(request, responsivePlayers(scenario.seats, {
      sourceName,
      targetName,
      sourceHand: [rootCard, ...(nextRoot ? [nextRoot] : [])],
      targetHand: hiddenHand,
      equipment,
      judgement,
    }));
    const viewerIndexes = scenario.seats === 4 ? [0, 1, 2, 3] : [0, 1, 2, scenario.seats - 1];
    const contexts = await Promise.all(viewerIndexes.map(() => browser.newContext({
      viewport: scenario.viewport,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    })));
    const pages = await Promise.all(contexts.map((context) => context.newPage()));
    const activityPlacementLogs = pages.map(() => []);
    for (const [index, viewerPage] of pages.entries()) {
      viewerPage.on("console", async (message) => {
        if (!message.text().includes("[U13-B-G activity-chip placement]")) return;
        const values = await Promise.all(message.args().map((argument) => argument.jsonValue().catch(() => null)));
        activityPlacementLogs[index].push(values);
      });
    }

    try {
      if (scenario.reducedMotion) await Promise.all(pages.map((viewerPage) => viewerPage.emulateMedia({ reducedMotion: "reduce" })));
      await Promise.all(pages.map(async (viewerPage, index) => {
        const query = scenario.longNames || process.env.T3_DIAGNOSTICS === "1" ? "publicActivityChipDiagnostics=1" : "";
        if (scenario.seats === 8 && index === 3) {
          const member = seed.players[viewerIndexes[index]];
          await viewerPage.setViewportSize(scenario.viewport);
          await viewerPage.goto(`${API}/api/health`);
          await viewerPage.evaluate((session) => localStorage.setItem("three-realms-session", JSON.stringify(session)), {
            code: seed.code,
            token: member.token,
            name: member.name,
          });
          await viewerPage.goto(`${API}/${query ? `?${query}` : ""}`);
          await expect(viewerPage.locator(".game-shell")).toBeVisible();
          return;
        }
        await openGame(viewerPage, seed, viewerIndexes[index], scenario.viewport, query);
      }));
      await playCardThroughPage(pages[0], rootCard.id, targetName);

      const rootState = await roomView(request, seed, 0);
      const rootEvent = rootState.timeline.find((event) => event?.type === "card" && event.action === "play" && event.card?.id === rootCard.id);
      expect(rootEvent, `${label} has one genuine public root event`).toBeTruthy();
      await passEmptyResponses(request, seed);

      const choosingViews = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
      const pending = choosingViews[0].pendingTargetCard;
      expect(pending).toMatchObject({ kind: "target_card", sourceId: seed.players[0].id, targetId: seed.players[1].id, actorId: seed.players[0].id, cardKind: scenario.kind });
      for (const [index, view] of choosingViews.entries()) {
        expect(view.pendingTargetCard, `${label} pending state is shared with seat ${index}`).toEqual(pending);
        if (index === 0) {
          expect(view.currentAction?.targetCardSelection?.targetId).toBe(seed.players[1].id);
          expect(view.currentAction?.legalActions).toContain("choose_target_card");
        } else {
          expect(view.currentAction?.targetCardSelection).toBeUndefined();
        }
      }

      for (const [index, viewerPage] of pages.entries()) {
        const actorPage = index === 0;
        const choiceCue = viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]');
        try {
          await expect(choiceCue).toBeVisible();
        } catch (error) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          const traces = activityPlacementLogs[index].map((args) => args[1]).filter(Boolean).map(({ measuredAt, chip, safeBounds, outcome, chosen, candidates }) => ({
            measuredAt,
            chip,
            safeBounds,
            outcome,
            chosen,
            rejectedCandidates: outcome?.startsWith("hidden") ? candidates?.map(({ verticalStep, horizontalOffset, rejectedBy }) => ({ verticalStep, horizontalOffset, rejectedBy })) : undefined,
          }));
          const geometry = await viewerPage.evaluate(() => {
            const chip = document.querySelector(".public-activity-chip");
            const table = document.querySelector(".play-table");
            const rect = (element) => {
              const box = element.getBoundingClientRect();
              return { left: box.left, top: box.top, right: box.right, bottom: box.bottom, width: box.width, height: box.height };
            };
            const chipStyle = chip ? getComputedStyle(chip) : null;
            const heading = chip?.querySelector("strong");
            const headingStyle = heading ? getComputedStyle(heading) : null;
            return { kind: chip?.dataset.publicActivityKind, layout: chip?.dataset.publicActivityLayout, matchesMobileRule: matchMedia("(max-width: 520px)").matches, chip: chip ? { rect: rect(chip), width: chip.offsetWidth, height: chip.offsetHeight, text: chip.innerText, textContent: chip.textContent, cssWidth: chipStyle?.width, cssMaxWidth: chipStyle?.maxWidth } : null, heading: heading ? { text: heading.textContent, width: heading.getBoundingClientRect().width, cssWidth: headingStyle?.width, cssFontSize: headingStyle?.fontSize, cssWhiteSpace: headingStyle?.whiteSpace } : null, table: table ? rect(table) : null };
          });
          console.log(`T3 target-choice placement failure ${label} viewer ${index}: ${JSON.stringify({ geometry, traces })}`);
          throw error;
        }
        await expect(choiceCue).toBeVisible();
        await expect(choiceCue).toHaveAttribute("aria-label", `${sourceName} is choosing one card from ${targetName} · ${scenario.effect === "Dismantle" ? "Burning Bridges" : scenario.effect}`);
        await expect(choiceCue.locator("strong")).toContainText(`Choosing ${targetName}'s card`);
        const cueGeometry = await choiceCue.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, viewportWidth: innerWidth, viewportHeight: innerHeight };
        });
        expect(cueGeometry.left).toBeGreaterThanOrEqual(0);
        expect(cueGeometry.top).toBeGreaterThanOrEqual(0);
        expect(cueGeometry.right).toBeLessThanOrEqual(cueGeometry.viewportWidth);
        expect(cueGeometry.bottom).toBeLessThanOrEqual(cueGeometry.viewportHeight);
        expect(cueGeometry.width).toBeLessThanOrEqual(156);
        const cueRect = await choiceCue.boundingBox();
        for (const obstacle of await viewerPage.locator(
          ".card-pool-panel--actor-target-select, .public-card-display-journey-copy, .public-card-journey-card, .player-square, .visible-countdown",
        ).all()) {
          if (!await obstacle.isVisible()) continue;
          const obstacleRect = await obstacle.boundingBox();
          if (!cueRect || !obstacleRect) continue;
          const separated = cueRect.x + cueRect.width <= obstacleRect.x || obstacleRect.x + obstacleRect.width <= cueRect.x
            || cueRect.y + cueRect.height <= obstacleRect.y || obstacleRect.y + obstacleRect.height <= cueRect.y;
          expect(separated,
            `${label} viewer ${index} cue avoids ${await obstacle.getAttribute("class")}: ${JSON.stringify({ cue: cueRect, obstacle: obstacleRect, placements: activityPlacementLogs[index].map((values) => values[1]) })}`).toBe(true);
        }
        const display = viewerPage.locator('[data-public-card-display="true"]');
        await expect(display).toHaveCount(1);
        await expect(display).toHaveAttribute("data-public-card-root-event-id", rootEvent.id);
        await expect(display).toHaveAttribute("data-public-card-id", rootCard.id);
        const rootCardRepresentations = viewerPage.locator(
          `[data-public-card-journey-event-id="${rootEvent.id}"][data-public-card-journey-role="root"], [data-public-card-static-event-id="${rootEvent.id}"][data-public-card-static-card-id="${rootCard.id}"]`,
        );
        await expect(rootCardRepresentations).toHaveCount(1);
        if (actorPage) {
          await expect(viewerPage.locator(".card-pool-panel--actor-target-select")).toBeVisible();
          const picker = viewerPage.locator(".card-pool-panel--actor-target-select");
          const [cueRect, pickerRect] = await Promise.all([choiceCue.boundingBox(), picker.boundingBox()]);
          expect(cueRect && pickerRect).toBeTruthy();
          expect(cueRect.x + cueRect.width <= pickerRect.x || pickerRect.x + pickerRect.width <= cueRect.x
            || cueRect.y + cueRect.height <= pickerRect.y || pickerRect.y + pickerRect.height <= cueRect.y).toBe(true);
        } else {
          await expect(viewerPage.locator(".card-pool-panel--actor-target-select")).toHaveCount(0);
        }
        expect(await viewerPage.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(scenario.viewport.width);
        if (scenario.reducedMotion) {
          expect(await viewerPage.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);
        }
      }

      const choosingScreenshots = await Promise.all(pages.map(async (viewerPage, index) => ({
        index,
        bytes: await viewerPage.screenshot({ animations: "disabled" }),
      })));
      for (const { index, bytes } of choosingScreenshots) {
        await testInfo.attach(`t3-${label}-choosing-view-${index + 1}`, { body: bytes, contentType: "image/png" });
      }

      // Let the actor leave the real picker open while every separate client polls.
      for (let sample = 0; sample < 4; sample += 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
        for (const viewerPage of pages) {
          await expect(viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toBeVisible();
        }
        const sampleViews = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
        for (const view of sampleViews) expect(view.pendingTargetCard).toEqual(pending);
      }

      if (scenario.seats === 8) {
        const reconnectingObserver = pages[1];
        await reconnectingObserver.reload();
        await expect(reconnectingObserver.locator(".game-shell")).toBeVisible();
        await expect(reconnectingObserver.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toBeVisible();
        await expect(reconnectingObserver.locator(".card-pool-panel--actor-target-select")).toHaveCount(0);
        const nextPoll = reconnectingObserver.waitForResponse((response) => response.request().method() === "GET"
          && response.url().startsWith(`${API}/api/rooms?`), { timeout: 8_000 });
        await nextPoll;
        await expect(reconnectingObserver.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toBeVisible();

        const switchingViewer = pages[3];
        const switchedIndex = 6;
        await switchingViewer.goto(`${API}/api/health`);
        await switchingViewer.evaluate(({ code, token, name }) => {
          localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
        }, { code: seed.code, token: seed.players[switchedIndex].token, name: seed.players[switchedIndex].name });
        await switchingViewer.goto(`${API}/`);
        await expect(switchingViewer.locator(`.local-player-dock[data-player-anchor="${seed.players[switchedIndex].id}"]`)).toBeVisible();
        await expect(switchingViewer.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toBeVisible();
        expect(await roomView(request, seed, switchedIndex).then((view) => view.pendingTargetCard)).toEqual(pending);
        viewerIndexes[3] = switchedIndex;
      }

      const modalTitle = scenario.kind === "Steal" ? "Steal" : "Burning Bridge";
      const instruction = scenario.kind === "Steal" ? "Choose 1 card to obtain" : "Choose 1 card to discard";
      const dialog = await expectTargetPool(pages[0], modalTitle, instruction, `Use ${modalTitle}`);
      const populatedZoneCount = [hiddenHand.length > 0, Boolean(equipment), judgement.length > 0].filter(Boolean).length;
      if (populatedZoneCount > 1) {
        if (scenario.zone === "equipment") await dialog.getByRole("tab", { name: "EQUIPMENT 1" }).click();
        if (scenario.zone === "judgement") await dialog.getByRole("tab", { name: "JUDGEMENT 1" }).click();
      } else {
        await expect(dialog.getByRole("tab")).toHaveCount(0);
      }
      const choice = scenario.zone === "hand"
        ? dialog.getByRole("button", { name: "Choose hidden Hand position 1", exact: true })
        : scenario.zone === "equipment"
          ? dialog.getByRole("button", { name: "Equipment: Nio Shield", exact: true })
          : dialog.getByRole("button", { name: "Judgement: Lightning", exact: true });
      await expect(choice).toBeVisible();
      await expect(choice).toBeEnabled();

      // The current real root must remain singular and attributable when the actor confirms promptly.
      const rootRenderer = await pages[0].locator('[data-public-card-display="true"]').getAttribute("data-public-card-renderer-kind");
      if (rootRenderer === "single-target-journey") {
        const rootPhase = await pages[0].locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`).getAttribute("data-public-card-journey-phase");
        expect(["reveal", "move", "parked"]).toContain(rootPhase);
      } else {
        expect(rootRenderer).toBe("static-fallback");
        await expect(pages[0].locator(`[data-public-card-static-event-id="${rootEvent.id}"][data-public-card-static-card-id="${rootCard.id}"]`)).toHaveCount(1);
      }
      await tapMobile(pages[0], choice);
      await expect(choice).toHaveAttribute("aria-pressed", "true");
      const use = dialog.getByRole("button", { name: `Use ${modalTitle}`, exact: true });
      await expect(use).toBeEnabled();
      const submitPromise = pages[0].waitForResponse((response) => {
        if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
        try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
        catch { return false; }
      });
      await tapMobile(pages[0], use);
      const submitted = await submitPromise;
      expect(submitted.ok(), `${label} touch confirmation succeeds`).toBe(true);
      expect(JSON.parse(submitted.request().postData() ?? "{}").targetCardZone).toBe(scenario.zone);

      const settledViewsPromise = Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
      const publicField = scenario.kind === "Steal" ? "stealSettlements" : "dismantleSettlements";
      const affected = scenario.zone === "hand" ? hiddenHand[0]
        : scenario.zone === "equipment" ? equipment.armor : judgement[0];
      const faceIsPublic = scenario.kind === "Dismantle" || scenario.zone !== "hand";
      const outcome = scenario.kind === "Steal" ? "STEAL_RESOLVED" : "DISMANTLE_RESOLVED";
      const cardLabel = faceIsPublic ? `${scenario.zone === "equipment" ? "Nio Shield" : scenario.zone === "judgement" ? "Lightning" : "Peach"} (${affected.rank}${affected.suit})` : "one card";
      const sourceZoneLabel = scenario.zone[0].toUpperCase() + scenario.zone.slice(1);
      const expectedCopy = scenario.kind === "Steal"
        ? `${sourceName} took ${cardLabel} from ${targetName}'s ${sourceZoneLabel} into ${sourceName}'s Hand.`
        : `${sourceName} discarded ${cardLabel} from ${targetName}'s ${sourceZoneLabel} to the discard pile.`;
      await Promise.all(pages.map(async (viewerPage, index) => {
        const display = viewerPage.locator('[data-public-card-display="true"]');
        await expect(display).toHaveCount(1);
        await expect(display).toHaveAttribute("data-public-card-root-event-id", rootEvent.id);
        await expect(display).toHaveAttribute("data-public-card-settlement-outcome", outcome, { timeout: 15_000 });
        await expect(display).toHaveAttribute("data-public-card-settlement-source-zone", scenario.zone, { timeout: 15_000 });
        await expect(display).toHaveAttribute("data-public-card-settlement-destination-zone", scenario.kind === "Steal" ? "hand" : "discard", { timeout: 15_000 });
        const announcement = viewerPage.locator('[data-public-card-announcement="true"]');
        if (scenario.longNames) {
          await expect(announcement).toContainText(`${cardLabel} from`);
          await expect(announcement).toContainText(`${sourceZoneLabel} to the discard pile.`);
          await expect(announcement).toContainText("discarded");
        } else if (scenario.seats === 8) {
          await expect(announcement).toContainText(`Cao Cao took ${cardLabel} from Simayi's ${sourceZoneLabel} into Cao Cao's Hand.`);
        } else {
          await expect(announcement).toContainText(expectedCopy);
        }
        const copyGeometry = await announcement.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height, clientWidth: element.clientWidth, scrollWidth: element.scrollWidth, clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, viewportWidth: innerWidth, viewportHeight: innerHeight };
        });
        expect(copyGeometry.left).toBeGreaterThanOrEqual(0);
        expect(copyGeometry.top).toBeGreaterThanOrEqual(0);
        expect(copyGeometry.right).toBeLessThanOrEqual(copyGeometry.viewportWidth);
        expect(copyGeometry.bottom).toBeLessThanOrEqual(copyGeometry.viewportHeight);
        expect(copyGeometry.scrollWidth).toBeLessThanOrEqual(copyGeometry.clientWidth + 1);
        expect(copyGeometry.scrollHeight).toBeLessThanOrEqual(copyGeometry.clientHeight + 1);
        const screenshot = await viewerPage.screenshot({ animations: "disabled" });
        await testInfo.attach(`t3-${label}-settled-view-${index + 1}`, { body: screenshot, contentType: "image/png" });
        if (scenario.reducedMotion) {
          await new Promise((resolve) => setTimeout(resolve, 750));
          await expect(display).toHaveAttribute("data-public-card-settlement-outcome", outcome);
        }
      }));

      const settledViews = await settledViewsPromise;
      const proofByViewer = settledViews.map((view) => view.presentationV2[publicField].find((entry) => entry.rootEventId === rootEvent.id));
      const proof = proofByViewer[0];
      expect(proof).toMatchObject({ semantics: "PROVEN", rootEventId: rootEvent.id, sourceId: seed.players[0].id, targetId: seed.players[1].id });
      expect(proofByViewer.every((entry) => JSON.stringify(entry) === JSON.stringify(proof))).toBe(true);
      expect(Object.hasOwn(proof, "affectedCardFace")).toBe(faceIsPublic);
      if (faceIsPublic) expect(proof.affectedCardFace).toEqual(affected);
      else expect(JSON.stringify(proof)).not.toContain(affected.id);
      for (const [index, view] of settledViews.entries()) {
        expect(view.pendingTargetCard).toBeNull();
        expect(view.currentAction?.targetCardSelection).toBeUndefined();
        expect(view.presentationSnapshot[publicField].find((entry) => entry.rootEventId === rootEvent.id)).toEqual(proof);
        expect(view.timeline.filter((event) => event?.id === rootEvent.id)).toHaveLength(1);
        const publicWire = JSON.stringify({ presentationV2: view.presentationV2, presentationSnapshot: view.presentationSnapshot, timeline: view.timeline, log: view.log });
        const hiddenId = hiddenHand[0]?.id;
        if (hiddenId) expect(publicWire.includes(hiddenId)).toBe(scenario.kind === "Dismantle" && scenario.zone === "hand");
        const browserViewerIndex = viewerIndexes.indexOf(index);
        if (hiddenId && scenario.kind === "Steal" && scenario.zone === "hand" && browserViewerIndex >= 0 && index !== 0) {
          expect(await pages[browserViewerIndex].locator("body").innerHTML()).not.toContain(hiddenId);
        }
      }
      await Promise.all(pages.map((viewerPage) => viewerPage.reload()));
      for (const [index, viewerPage] of pages.entries()) {
        await expect(viewerPage.locator(".game-shell")).toBeVisible();
        await expect(viewerPage.locator(".card-pool-panel--actor-target-select")).toHaveCount(0);
        const replayed = await roomView(request, seed, viewerIndexes[index]);
        expect(replayed.presentationV2[publicField].find((entry) => entry.rootEventId === rootEvent.id)).toEqual(proof);
      }

      if (scenario.extraRoot) {
        await playCardThroughPage(pages[0], nextRoot.id, targetName);
        const nextRootState = await roomView(request, seed, 0);
        const nextRootEvent = nextRootState.timeline.find((event) => event?.type === "card" && event.action === "play" && event.card?.id === nextRoot.id);
        expect(nextRootEvent).toBeTruthy();
        expect(nextRootEvent.id).not.toBe(rootEvent.id);
        await passEmptyResponses(request, seed);
        for (const viewerPage of pages) {
          await expect(viewerPage.locator('[data-public-card-display="true"]')).toHaveCount(1);
          await expect(viewerPage.locator('[data-public-card-display="true"]')).toHaveAttribute("data-public-card-root-event-id", nextRootEvent.id);
          await expect(viewerPage.locator(`[data-public-card-journey-event-id="${rootEvent.id}"]`)).toHaveCount(0);
        }
        const nextDialog = await expectTargetPool(pages[0], "Burning Bridge", "Choose 1 card to discard", "Use Burning Bridge");
        await nextDialog.getByRole("tab", { name: "EQUIPMENT 1" }).click();
        const armorChoice = nextDialog.getByRole("button", { name: "Equipment: Nio Shield", exact: true });
        await expect(armorChoice).toBeEnabled();
        await tapMobile(pages[0], armorChoice);
        const nextUse = nextDialog.getByRole("button", { name: "Use Burning Bridge", exact: true });
        const nextSubmissionPromise = pages[0].waitForResponse((response) => {
          if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
          try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
          catch { return false; }
        });
        await tapMobile(pages[0], nextUse);
        expect((await nextSubmissionPromise).ok()).toBe(true);
        const nextProofs = await Promise.all(seed.players.map(async (_, index) => {
          const view = await roomView(request, seed, index);
          const entry = view.presentationV2.dismantleSettlements.find((candidate) => candidate.rootEventId === nextRootEvent.id);
          expect(view.timeline.filter((event) => event?.id === nextRootEvent.id)).toHaveLength(1);
          return entry;
        }));
        expect(nextProofs.every((entry) => JSON.stringify(entry) === JSON.stringify(nextProofs[0]))).toBe(true);
        for (const viewerPage of pages) {
          const display = viewerPage.locator('[data-public-card-display="true"]');
          await expect(display).toHaveAttribute("data-public-card-root-event-id", nextRootEvent.id);
          await expect(display).toHaveAttribute("data-public-card-settlement-card-id", equipment.armor.id);
          await expect(viewerPage.locator(
            `[data-public-card-journey-event-id="${nextRootEvent.id}"][data-public-card-journey-role="root"], [data-public-card-static-event-id="${nextRootEvent.id}"][data-public-card-static-card-id="${nextRoot.id}"]`,
          )).toHaveCount(1);
        }
      }
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  }
});

test("T3 counter-Negation keeps Steal private until the restored root opens its shared picker", async ({ browser, request }, testInfo) => {
  test.setTimeout(150_000);
  const steal = card("Steal", "t3-counter-steal-root");
  const actorNegation = card("Negation", "t3-counter-steal-counter");
  const targetNegation = card("Negation", "t3-counter-steal-first-negation");
  const hidden = card("Peach", "t3-counter-steal-hidden", "♥", "4");
  const seed = await seedGame(request, fourPlayers(
    { hand: [steal, actorNegation] },
    { hand: [targetNegation, hidden] },
  ));
  const contexts = await Promise.all(seed.players.map(() => browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3,
  })));
  const pages = await Promise.all(contexts.map((context) => context.newPage()));

  async function commitNegationAndPassWindow(winnerIndex, negationCardId) {
    const opened = await roomView(request, seed, winnerIndex);
    const windowId = opened.currentAction?.negationWindowId;
    expect(windowId).toBeTruthy();
    const held = await request.post(`${API}/__test/negation-window-clock`, { data: { code: seed.code, windowId, mode: "hold" } });
    expect(await held.json()).toEqual({ adjusted: true });
    await act(request, seed, winnerIndex, "respond", { providerId: "negation_card", cardId: negationCardId });
    for (const [index, player] of seed.players.entries()) {
      if (index === winnerIndex) continue;
      const passed = await request.post(`${API}/api/rooms`, { data: { action: "decline_response", code: seed.code, token: player.token, context: { windowId } } });
      expect(passed.ok(), `${player.name} passes Negation window ${windowId}`).toBe(true);
    }
    return roomView(request, seed, winnerIndex);
  }

  try {
    await Promise.all(pages.map((viewerPage, index) => openGame(viewerPage, seed, index, { width: 390, height: 844 })));
    await playCardThroughPage(pages[0], steal.id, "TARGET");
    let states = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
    const rootEvent = states[0].timeline.find((event) => event?.type === "card" && event.action === "play" && event.card?.id === steal.id);
    expect(rootEvent).toBeTruthy();
    expect(states[0].pendingTargetCard).toBeNull();
    for (const state of states) expect(state.pendingTargetCard).toBeNull();
    for (const viewerPage of pages) {
      await expect(viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toHaveCount(0);
      await expect(viewerPage.locator(".card-pool-panel--actor-target-select")).toHaveCount(0);
    }

    await commitNegationAndPassWindow(1, targetNegation.id);
    states = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
    expect(states[0].pendingNegation).toBeTruthy();
    expect(states[0].pendingNegation.responseTarget).toContain("Negation");
    for (const state of states) expect(state.pendingTargetCard).toBeNull();
    for (const viewerPage of pages) {
      await expect(viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toHaveCount(0);
      await expect(viewerPage.locator(".card-pool-panel--actor-target-select")).toHaveCount(0);
    }

    await commitNegationAndPassWindow(0, actorNegation.id);
    await passEmptyResponses(request, seed);
    states = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
    const pending = states[0].pendingTargetCard;
    expect(pending).toMatchObject({ kind: "target_card", cardKind: "Steal", sourceId: seed.players[0].id, targetId: seed.players[1].id });
    expect(states[0].presentationSnapshot.rootAction?.rootEventId).toBe(rootEvent.id);
    for (const state of states) expect(state.pendingTargetCard).toEqual(pending);
    for (const [index, viewerPage] of pages.entries()) {
      await expect(viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toBeVisible();
      await expect(viewerPage.locator('[data-public-card-display="true"]')).toHaveAttribute("data-public-card-root-event-id", rootEvent.id);
      if (index === 0) await expect(viewerPage.locator(".card-pool-panel--actor-target-select")).toBeVisible();
      else await expect(viewerPage.locator(".card-pool-panel--actor-target-select")).toHaveCount(0);
      if (index !== 0) expect(JSON.stringify(states[index].presentationSnapshot)).not.toContain(hidden.id);
    }
    const dialog = await expectTargetPool(pages[0], "Steal", "Choose 1 card to obtain", "Use Steal");
    const hiddenChoice = dialog.getByRole("button", { name: "Choose hidden Hand position 1", exact: true });
    await expect(hiddenChoice, "the legal target-card choice stays touchable after counter-Negation restores Steal").toBeEnabled();
    await tapMobile(pages[0], hiddenChoice);
    const use = dialog.getByRole("button", { name: "Use Steal", exact: true });
    await expect(hiddenChoice).toHaveAttribute("aria-pressed", "true");
    await expect(use, "the actor can submit the selected legal target-card choice").toBeEnabled();
    const submissionPromise = pages[0].waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
      catch { return false; }
    });
    await tapMobile(pages[0], use);
    expect((await submissionPromise).ok()).toBe(true);
    states = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
    for (const state of states) {
      expect(state.pendingTargetCard).toBeNull();
      expect(JSON.stringify(state.presentationSnapshot.stealSettlements)).not.toContain(hidden.id);
      expect(state.presentationSnapshot.stealSettlements[0].rootEventId).toBe(rootEvent.id);
    }
    for (const [index, viewerPage] of pages.entries()) {
      await expect(viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toHaveCount(0);
      const display = viewerPage.locator('[data-public-card-display="true"]');
      await expect(display).toHaveAttribute("data-public-card-root-event-id", rootEvent.id);
      if (index > 0) expect(await viewerPage.locator("body").innerHTML()).not.toContain(hidden.id);
    }
    const screenshots = await Promise.all(pages.map((viewerPage) => viewerPage.screenshot({ animations: "disabled" })));
    for (const [index, screenshot] of screenshots.entries()) await testInfo.attach(`t3-counter-negation-view-${index + 1}-390x844`, { body: screenshot, contentType: "image/png" });
  } finally {
    await Promise.all(contexts.map((context) => context.close()));
  }
});

for (const kind of ["Steal", "Dismantle"]) {
  test(`Negated ${kind} never publishes the target-card choice cue to mobile viewers`, async ({ browser, request }, testInfo) => {
    test.setTimeout(90_000);
    const material = card(kind, `four-view-negated-${kind.toLowerCase()}-material`);
    const negation = card("Negation", `four-view-negated-${kind.toLowerCase()}-negation`);
    const seed = await seedGame(request, fourPlayers({ hand: [material] }, { hand: [negation] }));
    const contexts = await Promise.all(seed.players.map(() => browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    })));
    const pages = await Promise.all(contexts.map((context) => context.newPage()));

    try {
      await Promise.all(pages.map((viewerPage, index) => openGame(viewerPage, seed, index, { width: 390, height: 844 })));
      await playCardThroughPage(pages[0], material.id, "TARGET");
      const responseViews = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
      expect(responseViews[0].pendingNegation).toBeTruthy();
      for (const view of responseViews) expect(view.pendingTargetCard).toBeNull();
      for (const viewerPage of pages) {
        await expect(viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toHaveCount(0);
      }

      const targetView = await roomView(request, seed, 1);
      expect(targetView.currentAction.legalActions).toContain("respond");
      await act(request, seed, 1, "respond", { providerId: "negation_card", cardId: negation.id });
      await passEmptyResponses(request, seed);

      const negatedViews = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
      for (const view of negatedViews) {
        expect(view.pendingNegation).toBeNull();
        expect(view.pendingTargetCard).toBeNull();
      }
      for (const viewerPage of pages) {
        await expect(viewerPage.locator('.public-activity-chip[data-public-activity-kind="target-card-choice"]')).toHaveCount(0, { timeout: 15_000 });
      }

      for (const [index, viewerPage] of pages.entries()) {
        const path = testInfo.outputPath(`${kind.toLowerCase()}-negated-no-choice-view-${index + 1}-390x844.png`);
        await viewerPage.screenshot({ path, animations: "disabled" });
        await testInfo.attach(`${kind.toLowerCase()}-negated-no-choice-view-${index + 1}-390x844`, { path, contentType: "image/png" });
      }
    } finally {
      await Promise.all(contexts.map((context) => context.close()));
    }
  });
}

test("real Sima Yi Retaliation is compact, deselectable, private, and actor-only at 390x700", async ({ browser, request }, testInfo) => {
  test.setTimeout(90_000);
  const attack = card("Attack", "real-retaliation-attack");
  const hidden = [card("Peach", "real-retaliation-hidden-a"), card("Dodge", "real-retaliation-hidden-b")];
  const seed = await seedGame(request, fourPlayers(
    { hand: [attack, ...hidden] },
    { hero: "simayi", hand: [card("Peach", "real-retaliation-target-peach")] },
  ));
  const actorContext = await browser.newContext({ viewport: { width: 390, height: 700 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const observerContext = await browser.newContext({ viewport: { width: 440, height: 766 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    const actorPage = await actorContext.newPage();
    await openGame(actorPage, seed, 1, { width: 390, height: 700 });
    await act(request, seed, 0, "play_card", { cardId: attack.id, targetId: seed.players[1].id });
    await act(request, seed, 1, "decline_response");

    const reaction = await roomView(request, seed, 1);
    const option = reaction.currentAction.triggerOptions.find((entry) => entry.effectId === "sima_yi_fankui");
    expect(reaction.currentAction.kind).toBe("trigger");
    expect(reaction.currentAction.legalActions).toEqual(expect.arrayContaining(["trigger", "decline_trigger"]));
    expect(option?.selection).toMatchObject({ type: "target_cards", targetId: seed.players[0].id, min: 1, max: 1, eligibleKeys: ["hand:0", "hand:1"] });
    expect(JSON.stringify(reaction.currentAction)).not.toContain(hidden[0].id);
    expect(JSON.stringify(reaction.currentAction)).not.toContain(hidden[1].id);

    const observerPage = await observerContext.newPage();
    await openGame(observerPage, seed, 2, { width: 440, height: 766 });
    const observerView = await roomView(request, seed, 2);
    expect(observerView.isMyAction).toBe(false);
    expect(observerView.currentAction?.actorId).toBe(seed.players[1].id);
    expect(JSON.stringify(observerView)).not.toContain(hidden[0].id);
    expect(JSON.stringify(observerView)).not.toContain(hidden[1].id);
    await expect(observerPage.locator(".target-card-picker-panel")).toHaveCount(0);

    const skill = actorPage.getByRole("button", { name: "Retaliation", exact: true });
    const dock = actorPage.locator(`.local-player-dock[data-player-anchor="${seed.players[1].id}"]`);
    const duplicate = dock.locator('[data-action-extras="true"]').getByRole("button", { name: /Retaliation/ });
    await expect(skill).toBeEnabled({ timeout: 15_000 });
    await expect(duplicate).toHaveCount(0);
    await tapMobile(actorPage, skill);
    await expect(skill).toHaveAttribute("aria-pressed", "true");
    const dialog = await expectModal(actorPage, "Retaliation", "Choose 1 card to obtain", "Use Retaliation");
    await expect(dialog).toHaveClass(/target-card-picker-panel--compact/);
    await expect(dialog.getByRole("button", { name: "Cancel" })).toHaveCount(0);
    const skip = dialog.getByRole("button", { name: "Skip", exact: true });
    const use = dialog.getByRole("button", { name: "Use Retaliation", exact: true });
    await expect(skip).toBeEnabled();
    await expect(use).toBeDisabled();
    const actionRects = await Promise.all([skip, use].map((button) => button.evaluate((element) => {
      const { x, y, right, bottom } = element.getBoundingClientRect();
      return { x, y, right, bottom };
    })));
    expect(Math.abs(actionRects[0].y - actionRects[1].y)).toBeLessThan(2);
    expect(actionRects[0].right).toBeLessThan(actionRects[1].x + 2);
    expect(actionRects.every(({ bottom }) => bottom <= 700)).toBe(true);

    const hiddenPosition = dialog.getByRole("button", { name: "Hidden hand card 2" });
    await expect(hiddenPosition).not.toContainText(/Peach|Dodge|real-retaliation/);
    await tapMobile(actorPage, hiddenPosition);
    await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
    await expect(use).toBeEnabled();
    await tapMobile(actorPage, hiddenPosition);
    await expect(hiddenPosition).toHaveAttribute("aria-pressed", "false");
    await expect(use).toBeDisabled();
    await tapMobile(actorPage, hiddenPosition);
    await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
    await actorPage.screenshot({ path: testInfo.outputPath("bcp3-retaliation-390x700.png") });

    const actionPosts = [];
    actorPage.on("request", (requestEvent) => {
      if (requestEvent.url() !== `${API}/api/rooms` || requestEvent.method() !== "POST") return;
      try { actionPosts.push(JSON.parse(requestEvent.postData() ?? "{}")); } catch { /* Non-JSON form request. */ }
    });
    const beforeInspection = await roomView(request, seed, 1);
    const inspectionOpener = actorPage.locator(`[data-player-anchor="${seed.players[0].id}"] .opponent-hero-target`);
    await tapMobile(actorPage, inspectionOpener);
    const inspection = actorPage.locator(`.opponent-inspection-panel[data-inspect-player-id="${seed.players[0].id}"]`);
    await expect(inspection).toBeVisible();
    await tapMobile(actorPage, inspectionOpener);
    await expect(inspection).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
    expect((await roomView(request, seed, 1)).actionRevision).toBe(beforeInspection.actionRevision);

    await tapMobile(actorPage, actorPage.getByTestId("hand-card-inspection-action").first());
    const cardDetailsAction = actorPage.getByTestId("hand-card-details-action").first();
    await expect(cardDetailsAction).toBeVisible();
    await tapMobile(actorPage, cardDetailsAction);
    const privateCardDetails = actorPage.locator('.card-details-panel[data-card-details-context="private-hand"]');
    await expect(privateCardDetails).toBeVisible();
    await tapMobile(actorPage, actorPage.getByRole("button", { name: "Close card details" }));
    await expect(privateCardDetails).toHaveCount(0);
    await expect(dialog).toBeVisible();
    await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
    expect((await roomView(request, seed, 1)).actionRevision).toBe(beforeInspection.actionRevision);
    expect(actionPosts).toEqual([]);

    const submitPromise = actorPage.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try {
        const body = JSON.parse(response.request().postData() ?? "{}");
        return body.action === "trigger" && body.providerId === "sima_yi_fankui";
      } catch { return false; }
    });
    await tapMobile(actorPage, use);
    const submitted = await submitPromise;
    expect(submitted.ok()).toBe(true);
    expect(JSON.parse(submitted.request().postData() ?? "{}")).toMatchObject({
      action: "trigger", providerId: "sima_yi_fankui", cardKeys: ["hand:1"],
    });
    await expect(dialog).toHaveCount(0);
    expect(actionPosts).toHaveLength(1);
    expect(actionPosts[0]).toMatchObject({ action: "trigger", providerId: "sima_yi_fankui", cardKeys: ["hand:1"] });
    await expect(duplicate).toHaveCount(0);
    await expect.poll(async () => (await roomView(request, seed, 1)).myHand.map((held) => held.id)).toContain(hidden[1].id);
  } finally {
    await actorContext.close();
    await observerContext.close();
  }
});

test("Retaliation Skip is a distinct authorized server action at 440x766", async ({ browser, request }, testInfo) => {
  test.setTimeout(90_000);
  const attack = card("Attack", "retaliation-skip-attack");
  const hidden = card("Dodge", "retaliation-skip-hidden");
  const seed = await seedGame(request, fourPlayers(
    { hand: [attack, hidden] },
    { hero: "simayi", hand: [card("Peach", "retaliation-skip-target-peach")] },
  ));
  const context = await browser.newContext({ viewport: { width: 440, height: 766 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    const page = await context.newPage();
    await openGame(page, seed, 1, { width: 440, height: 766 });
    await act(request, seed, 0, "play_card", { cardId: attack.id, targetId: seed.players[1].id });
    await act(request, seed, 1, "decline_response");
    const actorView = await roomView(request, seed, 1);
    expect(actorView.currentAction.legalActions).toContain("decline_trigger");

    const skill = page.getByRole("button", { name: "Retaliation", exact: true });
    await expect(skill).toBeEnabled({ timeout: 15_000 });
    await tapMobile(page, skill);
    const dialog = await expectModal(page, "Retaliation", "Choose 1 card to obtain", "Use Retaliation");
    await expect(dialog.getByRole("button", { name: "Cancel" })).toHaveCount(0);
    const use = dialog.getByRole("button", { name: "Use Retaliation", exact: true });
    await expect(use).toBeDisabled();
    const skip = dialog.getByRole("button", { name: "Skip", exact: true });
    await expect(skip).toBeEnabled();
    const rects = await Promise.all([skip, use].map((button) => button.evaluate((element) => {
      const { x, y, right, bottom } = element.getBoundingClientRect();
      return { x, y, right, bottom };
    })));
    expect(Math.abs(rects[0].y - rects[1].y)).toBeLessThan(2);
    expect(rects.every(({ bottom }) => bottom <= 766)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("bcp3-retaliation-440x766-skip.png") });

    const actionPosts = [];
    page.on("request", (requestEvent) => {
      if (requestEvent.url() !== `${API}/api/rooms` || requestEvent.method() !== "POST") return;
      try { actionPosts.push(JSON.parse(requestEvent.postData() ?? "{}")); } catch { /* Non-JSON form request. */ }
    });
    const skipPromise = page.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "decline_trigger"; }
      catch { return false; }
    });
    await tapMobile(page, skip);
    const skipped = await skipPromise;
    expect(skipped.ok()).toBe(true);
    expect(JSON.parse(skipped.request().postData() ?? "{}").action).toBe("decline_trigger");
    await expect(dialog).toHaveCount(0);
    expect(actionPosts).toHaveLength(1);
    expect(actionPosts[0].action).toBe("decline_trigger");
    expect(actionPosts.some((body) => body.action === "trigger")).toBe(false);
    expect((await roomView(request, seed, 1)).myHand.map((held) => held.id)).not.toContain(hidden.id);
  } finally {
    await context.close();
  }
});

for (const weapon of ["FrostSword", "KirinBow"]) {
  test(`real ${weapon} Attack reaction reaches and submits through its unified modal`, async ({ page, request }) => {
    const attack = card("Attack", `real-${weapon.toLowerCase()}-attack`);
    const mounts = weapon === "KirinBow"
      ? { offensiveHorse: card("FerganaSteed", "real-kirin-offensive-mount"), defensiveHorse: card("Shadowrunner", "real-kirin-defensive-mount") }
      : { offensiveHorse: card("FerganaSteed", "real-frost-public-mount") };
    const targetHand = weapon === "FrostSword"
      ? [card("Peach", "real-frost-hidden-a"), card("Dodge", "real-frost-hidden-b")]
      : [card("Peach", "real-kirin-hidden")];
    const seed = await seedGame(request, fourPlayers(
      { hand: [attack], equipment: { weapon: card(weapon, `real-${weapon.toLowerCase()}-weapon`) } },
      { hand: targetHand, equipment: mounts },
    ));
    await openGame(page, seed);
    await playCardThroughPage(page, attack.id, "TARGET");
    await act(request, seed, 1, "decline_response");

    const current = await roomView(request, seed, 0);
    const expectedProvider = weapon === "FrostSword" ? "frost_sword_damage_about_to_apply" : "kirin_bow_damage_about_to_apply";
    const option = current.currentAction.triggerOptions.find((entry) => entry.effectId === expectedProvider);
    expect(current.currentAction.kind).toBe("trigger");
    expect(option?.selection?.type).toBe("target_cards");
    expect(option.selection.targetId).toBe(seed.players[1].id);
    expect(option.selection.eligibleKeys).toHaveLength(weapon === "FrostSword" ? 3 : 2);

    const actionTitle = weapon === "FrostSword" ? "Frost Sword" : "Kirin Bow";
    const instruction = weapon === "FrostSword" ? "Choose 2 cards to discard" : "Choose 1 Mount to discard";
    const dialog = await expectModal(page, actionTitle, instruction, `Use ${actionTitle}`);
    const skip = dialog.getByRole("button", { name: "Skip", exact: true });
    if (current.currentAction.legalActions.includes("decline_trigger")) await expect(skip).toBeVisible();
    else await expect(skip).toHaveCount(0);
    const selectableCards = dialog.locator(".target-card-picker-card");
    if (weapon === "FrostSword") {
      const positions = dialog.locator('[data-target-card-zone="hand-position"]');
      await expect(positions).toHaveCount(2);
      await positions.nth(0).click();
      await positions.nth(1).click();
      await expect(dialog.locator(".target-card-picker-count")).toHaveText("2 / 2 selected");
    } else {
      await expect(dialog.locator('[data-target-card-zone="hand-position"]')).toHaveCount(0);
      await expect(selectableCards).toHaveCount(2);
      await selectableCards.first().click();
      await expect(dialog.locator(".target-card-picker-count")).toHaveText("1 / 1 selected");
    }
    const use = dialog.getByRole("button", { name: `Use ${actionTitle}` });
    await expect(use).toBeEnabled();
    const submitPromise = page.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try {
        const body = JSON.parse(response.request().postData() ?? "{}");
        return body.action === "trigger" && body.providerId === expectedProvider;
      } catch { return false; }
    });
    await use.click();
    const submitted = await submitPromise;
    expect(submitted.ok()).toBe(true);
    const submission = JSON.parse(submitted.request().postData() ?? "{}");
    expect(submission.action).toBe("trigger");
    expect(submission.providerId).toBe(expectedProvider);
    expect(submission.cardKeys).toHaveLength(weapon === "FrostSword" ? 2 : 1);
    expect(submission.cardKeys.every((key) => option.selection.eligibleKeys.includes(key))).toBe(true);
    if (weapon === "FrostSword") expect(submission.cardKeys).toEqual(["hand:0", "hand:1"]);
    await expect.poll(async () => {
      const latest = await roomView(request, seed, 0);
      return latest.currentAction.kind !== "trigger";
    }).toBe(true);
  });
}

for (const kind of ["Dismantle", "Steal"]) {
  for (const viewport of [
    { width: 390, height: 700 },
    { width: 390, height: 844 },
    { width: 440, height: 766 },
    { width: 480, height: 900 },
  ]) {
    test(`real ${kind === "Dismantle" ? "Burning Bridge" : kind} shared pool remains compact and touchable at ${viewport.width}×${viewport.height}`, async ({ browser, request }, testInfo) => {
      const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
      const { seed, dialog: pool, hidden, title } = await openRealTargetCardDecision({ page, request, kind, viewport });
      const tabs = pool.getByRole("tab");
      const use = pool.getByRole("button", { name: `Use ${title}`, exact: true });
      const hiddenPositions = pool.locator('.card-pool-panel__target-choice[data-choice-key-type="concealed-position"]');
      const [panelBox, useBox, rowGeometry, positions] = await Promise.all([
        pool.boundingBox(), use.boundingBox(), pool.locator(".card-pool-panel__target-row").evaluate((row) => ({
          width: row.getBoundingClientRect().width,
          clientWidth: row.clientWidth,
          scrollWidth: row.scrollWidth,
          overflowX: getComputedStyle(row).overflowX,
        })), hiddenPositions.evaluateAll((elements) => elements.map((element) => {
          const box = element.getBoundingClientRect();
          return { x: box.x, y: box.y, width: box.width, height: box.height };
        })),
      ]);
      expect(panelBox && useBox).toBeTruthy();
      expect(rowGeometry.width).toBeLessThanOrEqual(panelBox.width);
      expect(rowGeometry.clientWidth).toBeGreaterThanOrEqual(68);
      expect(rowGeometry.scrollWidth).toBeGreaterThanOrEqual(rowGeometry.clientWidth);
      expect(rowGeometry.overflowX).toBe("auto");
      await expect(tabs).toHaveCount(3);
      await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
      await expect(tabs.nth(0)).toHaveText("HAND 4");
      await expect(tabs.nth(1)).toHaveText("EQUIPMENT 2");
      await expect(tabs.nth(2)).toHaveText("JUDGEMENT 1");
      await expect(hiddenPositions).toHaveCount(4);
      expect(positions.every((box) => box.width >= 44 && box.height >= 44)).toBe(true);
      expect(positions[0].x).toBeGreaterThanOrEqual(panelBox.x);
      expect(positions[0].x + positions[0].width).toBeLessThanOrEqual(panelBox.x + panelBox.width);
      for (const privateCard of hidden) expect(await page.locator("body").innerHTML()).not.toContain(privateCard.id);
      await expect(use).toBeDisabled();
      await expect(pool.locator(".card-pool-panel__tabpanel .card-pool-panel__target-choice")).toHaveCount(4);

      const firstHidden = pool.getByRole("button", { name: "Choose hidden Hand position 2", exact: true });
      await firstHidden.scrollIntoViewIfNeeded();
      await tapMobile(page, firstHidden);
      await expect(firstHidden).toHaveAttribute("aria-pressed", "true");
      await expect(use).toBeEnabled();
      await expect(pool.locator(".card-pool-panel__selection-count")).toHaveText("1 / 1 selected");

      await tapMobile(page, tabs.nth(1));
      await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
      await expect(pool.locator(".card-pool-panel__tabpanel .card-pool-panel__target-choice")).toHaveCount(2);
      await expect(pool.getByRole("status")).toContainText("Selection retained · HAND 4");
      const actionBeforeInfo = await roomView(request, seed, 0);
      const info = pool.getByRole("button", { name: "Card details: Equipment: Nio Shield", exact: true });
      await expect(info).toBeVisible();
      await tapMobile(page, info);
      const details = page.locator('.card-details-panel[data-card-details-context="public-zone"]');
      await expect(details).toBeVisible();
      await tapMobile(page, page.getByRole("button", { name: "Close card details" }));
      await expect(details).toHaveCount(0);
      await expect(pool.getByRole("status")).toContainText("Selection retained · HAND 4");
      await expect(pool.locator(".card-pool-panel__selection-count")).toHaveText("1 / 1 selected");
      await tapMobile(page, tabs.nth(0));
      await expect(pool.getByRole("button", { name: "Choose hidden Hand position 2", exact: true })).toHaveAttribute("aria-pressed", "true");
      await tapMobile(page, tabs.nth(1));
      const actionAfterInfo = await roomView(request, seed, 0);
      expect(actionAfterInfo.actionRevision).toBe(actionBeforeInfo.actionRevision);

      await tapMobile(page, tabs.nth(2));
      await expect(pool.locator(".card-pool-panel__tabpanel .card-pool-panel__target-choice")).toHaveCount(1);
      await expect(pool.getByRole("status")).toContainText("Selection retained · HAND 4");
      await expect(use).toBeEnabled();
      await expect(pool.locator(".target-card-picker-overlay")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await attachScreenshot(testInfo, `${title.toLowerCase().replaceAll(" ", "-")}-shared-pool-${viewport.width}x${viewport.height}`, page);
    });
  }
}

test("real Steal and Burning Bridge pools stay centred inside 5/6/8-seat phone lanes", async ({ browser, request }) => {
  test.setTimeout(150_000);
  const scenarios = [
    { seatCount: 5, kind: "Dismantle", viewport: { width: 390, height: 844 } },
    { seatCount: 6, kind: "Steal", viewport: { width: 390, height: 844 } },
    { seatCount: 8, kind: "Dismantle", viewport: { width: 390, height: 844 } },
    { seatCount: 8, kind: "Steal", viewport: { width: 440, height: 894 } },
  ];
  const page = await browser.newPage({ viewport: scenarios[0].viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  try {
    for (const scenario of scenarios) {
      await page.setViewportSize(scenario.viewport);
      const { title } = await openRealTargetCardDecision({ ...scenario, page, request });
      const instruction = scenario.kind === "Steal" ? "Choose 1 card to obtain" : "Choose 1 card to discard";
      const pool = await expectTargetPool(page, title, instruction, `Use ${title}`);
      const geometry = await pool.evaluate((element) => {
        const panel = element.getBoundingClientRect();
        const stage = element.parentElement;
        const table = stage?.parentElement;
        const board = table?.querySelector(".player-board");
        const seats = [...(board?.querySelectorAll(":scope > [data-side-column]") ?? [])].map((seat) => seat.getBoundingClientRect()).filter((rect) => rect.width > 0);
        const center = table ? (table.getBoundingClientRect().left + table.getBoundingClientRect().right) / 2 : 0;
        const left = Math.max(table?.getBoundingClientRect().left ?? 0, ...seats.filter((rect) => rect.right < center).map((rect) => rect.right + 8));
        const right = Math.min(table?.getBoundingClientRect().right ?? innerWidth, ...seats.filter((rect) => rect.left > center).map((rect) => rect.left - 8));
        return {
          panelLeft: panel.left,
          panelRight: panel.right,
          laneLeft: left,
          laneRight: right,
          laneMidpoint: (left + right) / 2,
          panelMidpoint: (panel.left + panel.right) / 2,
          seats,
        };
      });
      expect(geometry.panelLeft).toBeGreaterThanOrEqual(geometry.laneLeft - 1);
      expect(geometry.panelRight).toBeLessThanOrEqual(geometry.laneRight + 1);
      expect(Math.abs(geometry.panelMidpoint - geometry.laneMidpoint), JSON.stringify(geometry)).toBeLessThanOrEqual(4);
      expect(await page.locator(".local-player-dock").isVisible()).toBe(true);
    }
  } finally {
    await page.close();
  }
});

test("real Burning Bridge omits empty Judgement and keeps available zones in tabs", async ({ browser, request }, testInfo) => {
  const viewport = { width: 390, height: 844 };
  const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const { dialog: pool } = await openRealTargetCardDecision({ page, request, kind: "Dismantle", viewport, judgement: false });
  const tabs = pool.getByRole("tab");
  await expect(tabs).toHaveCount(2);
  await expect(tabs.nth(0)).toHaveText("HAND 4");
  await expect(tabs.nth(1)).toHaveText("EQUIPMENT 2");
  await expect(pool.getByRole("tab", { name: /JUDGEMENT/i })).toHaveCount(0);
  await expect(pool.locator(".card-pool-panel__target-row")).toHaveCount(1);
  await tapMobile(page, tabs.nth(1));
  await expect(pool.locator(".card-pool-panel__target-row .card-pool-panel__target-choice")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  await attachScreenshot(testInfo, "burning-bridge-hand-equipment-tabs-390", page);
});

test("real Burning Bridge one-card Hand-only choice submits the anonymous position", async ({ browser, request }, testInfo) => {
  const viewport = { width: 390, height: 700 };
  const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const { dialog: pool, actorView } = await openRealTargetCardDecision({ page, request, kind: "Dismantle", viewport, handCount: 1, equipment: false, judgement: false });
  const handCard = pool.getByRole("button", { name: "Choose hidden Hand position 1", exact: true });
  const use = pool.getByRole("button", { name: "Use Burning Bridge", exact: true });
  const targetStage = page.locator('.card-pool-target-stage[data-target-card-pool-layout="central"]');
  await expect(pool.getByRole("tab")).toHaveCount(0);
  expect(actorView.currentAction.targetCardSelection.eligibleKeys).toEqual(["hand:0"]);
  await expect(targetStage).toHaveAttribute("data-target-card-pool-root-overlap", "true");
  const overlapLayering = await targetStage.evaluate((stage) => {
    const rootEventId = stage.getAttribute("data-target-card-pool-root-event-id");
    const root = [...document.querySelectorAll(".public-card-journey-card[data-public-card-journey-role='root']")]
      .find((card) => card.getAttribute("data-public-card-journey-event-id") === rootEventId);
    const display = root?.closest(".public-card-display-journey");
    const panel = stage.querySelector(".card-pool-panel--actor-target-select");
    if (!root || !display || !panel) return null;
    const rootRect = root.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    const x = (Math.max(rootRect.left, panelRect.left) + Math.min(rootRect.right, panelRect.right)) / 2;
    const y = (Math.max(rootRect.top, panelRect.top) + Math.min(rootRect.bottom, panelRect.bottom)) / 2;
    const hit = document.elementFromPoint(x, y);
    return {
      rootEventId,
      rootRole: root.getAttribute("data-public-card-journey-role"),
      overlapWidth: Math.min(rootRect.right, panelRect.right) - Math.max(rootRect.left, panelRect.left),
      overlapHeight: Math.min(rootRect.bottom, panelRect.bottom) - Math.max(rootRect.top, panelRect.top),
      hitInsidePanel: Boolean(hit?.closest(".card-pool-panel--actor-target-select")),
      stageZIndex: Number.parseInt(getComputedStyle(stage).zIndex, 10),
      displayZIndex: Number.parseInt(getComputedStyle(display).zIndex, 10),
    };
  });
  expect(overlapLayering).toBeTruthy();
  expect(overlapLayering.rootRole).toBe("root");
  expect(overlapLayering.overlapWidth).toBeGreaterThan(0);
  expect(overlapLayering.overlapHeight).toBeGreaterThan(0);
  expect(overlapLayering.hitInsidePanel).toBe(true);
  expect(overlapLayering.stageZIndex).toBeGreaterThan(overlapLayering.displayZIndex);
  await expect(handCard).toBeVisible();
  await expect(use).toBeDisabled();
  await tapMobile(page, handCard);
  await expect(handCard).toHaveAttribute("aria-pressed", "true");
  await expect(use).toBeEnabled();
  const oneChoiceWidth = await pool.evaluate((element) => element.getBoundingClientRect().width);

  const submitPromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
    catch { return false; }
  });
  await tapMobile(page, use);
  const submitted = await submitPromise;
  expect(submitted.ok()).toBe(true);
  expect(JSON.parse(submitted.request().postData() ?? "{}")).toMatchObject({
    action: "choose_target_card", targetCardZone: "hand", targetCardIndex: 0,
  });
  await attachScreenshot(testInfo, "burning-bridge-one-card-hand-only-390x700", page);

  const threeChoice = await openRealTargetCardDecision({ page, request, kind: "Dismantle", viewport, handCount: 3, equipment: false, judgement: false });
  const threeRow = threeChoice.dialog.locator(".card-pool-panel__target-row");
  const threeGeometry = await threeRow.evaluate((element) => ({
    left: element.getBoundingClientRect().left,
    right: element.getBoundingClientRect().right,
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    cards: [...element.querySelectorAll(".card-pool-panel__target-choice")].map((choice) => {
      const rect = choice.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    }),
  }));
  const threeChoiceWidth = await threeChoice.dialog.evaluate((element) => element.getBoundingClientRect().width);
  expect(Math.abs(threeChoiceWidth - oneChoiceWidth)).toBeLessThanOrEqual(2);
  expect(threeGeometry.cards).toHaveLength(3);
  expect(threeGeometry.cards.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);
  expect(threeGeometry.cards.every(({ left, right }) => left >= threeGeometry.left - 1 && right <= threeGeometry.right + 1)).toBe(true);
  expect(threeGeometry.scrollWidth).toBeLessThanOrEqual(threeGeometry.clientWidth + 1);
  await attachScreenshot(testInfo, "burning-bridge-three-hand-choices-390x700", page);

  const fiveChoice = await openRealTargetCardDecision({ page, request, kind: "Dismantle", viewport, handCount: 5, equipment: false, judgement: false });
  const fiveRow = fiveChoice.dialog.locator(".card-pool-panel__target-row");
  const fiveGeometry = await fiveRow.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(Math.abs(await fiveChoice.dialog.evaluate((element) => element.getBoundingClientRect().width) - oneChoiceWidth)).toBeLessThanOrEqual(2);
  expect(fiveGeometry.scrollWidth).toBeGreaterThan(fiveGeometry.clientWidth);
});

test("real Burning Bridge equipment-only choice omits empty zones and submits the public card", async ({ browser, request }, testInfo) => {
  const viewport = { width: 390, height: 700 };
  const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const { seed, dialog: pool, armor } = await openRealTargetCardDecision({ page, request, kind: "Dismantle", viewport, handCount: 0, judgement: false });
  const equipmentCard = pool.getByRole("button", { name: "Equipment: Nio Shield", exact: true });
  const use = pool.getByRole("button", { name: "Use Burning Bridge", exact: true });
  await expect(pool.getByRole("tab")).toHaveCount(0);
  await expect(pool.locator(".card-pool-panel__target-row .card-pool-panel__target-choice")).toHaveCount(2);
  await expect(use).toBeDisabled();
  await equipmentCard.tap({ position: { x: 8, y: 8 } });
  await expect(equipmentCard).toHaveAttribute("aria-pressed", "true");
  await expect(use).toBeEnabled();

  const submitPromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
    catch { return false; }
  });
  await tapMobile(page, use);
  const submitted = await submitPromise;
  expect(submitted.ok()).toBe(true);
  expect(JSON.parse(submitted.request().postData() ?? "{}")).toMatchObject({
    action: "choose_target_card", targetCardZone: "equipment", targetCardId: armor.id,
  });
  await attachScreenshot(testInfo, "burning-bridge-equipment-only-390x700", page);
  expect((await roomView(request, seed, 0)).currentAction?.kind).not.toBe("target_card");
});

test("real Burning Bridge Hand-only pool scrolls horizontally without page overflow", async ({ browser, request }, testInfo) => {
  const viewport = { width: 390, height: 844 };
  const page = await browser.newPage({ viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 });
  const { dialog: pool, actorView } = await openRealTargetCardDecision({ page, request, kind: "Dismantle", viewport, handCount: 10, equipment: false, judgement: false });
  const row = pool.locator(".card-pool-panel__target-row");
  const positions = pool.locator('.card-pool-panel__target-choice[data-choice-key-type="concealed-position"]');
  const geometry = await row.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(actorView.currentAction.targetCardSelection.eligibleKeys).toEqual(Array.from({ length: 10 }, (_, index) => `hand:${index}`));
  await expect(positions).toHaveCount(10);
  expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  const lastPosition = positions.last();
  await lastPosition.scrollIntoViewIfNeeded();
  const [lastBox, rowBox] = await Promise.all([lastPosition.boundingBox(), row.boundingBox()]);
  expect(lastBox.x).toBeGreaterThanOrEqual(rowBox.x - 1);
  expect(lastBox.x + lastBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
  await expect(pool.getByRole("button", { name: "Use Burning Bridge", exact: true })).toBeDisabled();
  await attachScreenshot(testInfo, "burning-bridge-large-hand-contained-overflow-390", page);
});
