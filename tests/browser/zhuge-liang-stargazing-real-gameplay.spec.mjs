import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit, rank) => ({ kind, id, suit, rank });
const revealedCards = [
  card("Attack", "real-stargazing-attack", "♠", "A"),
  card("Dodge", "real-stargazing-dodge", "♣", "2"),
  card("Peach", "real-stargazing-peach", "♥", "Q"),
  card("Duel", "real-stargazing-duel", "♦", "K"),
];
const fifthRevealedCard = card("Dismantle", "real-stargazing-dismantle", "♣", "9");
const allRevealedCards = [...revealedCards, fifthRevealedCard];
const displayName = (kind) => kind === "Dismantle" ? "Burning Bridges" : kind;
let nextTouchIdentifier = 0;

test.use({ hasTouch: true });

async function seedStargazingRoom(request, playerCount = 4) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "TURN PLAYER", role: "Lord", hero: "guan-yu", hp: 4, maxHp: 4, hand: [] },
        { name: "ZHU GE LIANG", role: "Loyalist", hero: "zhuge-liang", hp: 3, maxHp: 3, hand: [card("Peach", "real-stargazing-private-peach", "♥", "7")] },
        { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH", role: playerCount === 4 ? "Renegade" : "Rebel", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
        ...(playerCount > 4 ? [{ name: "FIFTH", role: "Renegade", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [] }] : []),
      ].slice(0, playerCount),
      deck: [
        ...allRevealedCards.slice(0, playerCount),
        card("Negation", "real-stargazing-next-a", "♠", "5"),
        card("Attack", "real-stargazing-next-b", "♥", "8"),
      ],
    },
  });
  if (!response.ok()) throw new Error(`Stargazing room seed failed: ${await response.text()}`);
  return response.json();
}

async function openPlayer(page, seed, playerIndex, viewport) {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return member;
}

async function roomView(request, seed, playerIndex) {
  const member = seed.players[playerIndex];
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${member.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function postedAction(page, action) {
  return page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === action; }
    catch { return false; }
  });
}

async function openRealStargazingDecision({ page, request, browser, viewport, playerCount = 4 }) {
  const seed = await seedStargazingRoom(request, playerCount);
  const turnContext = await browser.newContext({ viewport, hasTouch: true });
  const turnPage = await turnContext.newPage();
  const turnPlayer = await openPlayer(turnPage, seed, 0, viewport);
  const turnDock = turnPage.locator(`.local-player-dock[data-player-anchor="${turnPlayer.id}"]`);
  const turn = await roomView(request, seed, 0);
  expect(turn.isMyAction).toBe(true);
  expect(turn.currentAction.legalActions).toContain("end_turn");

  const endTurnResponse = postedAction(turnPage, "end_turn");
  await turnDock.getByRole("button", { name: "End", exact: true }).click();
  const ended = await endTurnResponse;
  expect(ended.ok()).toBeTruthy();

  const actorPage = page;
  const actor = await openPlayer(actorPage, seed, 1, viewport);
  const offered = await roomView(request, seed, 1);
  expect(offered.isMyAction).toBe(true);
  expect(offered.currentAction).toMatchObject({ kind: "trigger", actorId: actor.id });
  expect(offered.currentAction.triggerOptions.map((option) => option.effectId)).toContain("zhuge_liang_stargazing");

  const actorDock = actorPage.locator(`.local-player-dock[data-player-anchor="${actor.id}"]`);
  const stargazing = actorDock.locator(".local-hero-skills").getByRole("button", { name: "Stargazing", exact: true });
  await expect(stargazing).toBeEnabled();
  await expect(actorDock.locator('[data-action-extras="true"]').getByRole("button", { name: /Stargazing/i })).toHaveCount(0);
  const triggerResponse = postedAction(actorPage, "trigger");
  await stargazing.click();
  const triggered = await triggerResponse;
  expect(triggered.ok()).toBeTruthy();
  expect(JSON.parse(triggered.request().postData() ?? "{}")).toMatchObject({
    action: "trigger", code: seed.code, token: actor.token, providerId: "zhuge_liang_stargazing",
  });

  const actorView = await roomView(request, seed, 1);
  const cards = allRevealedCards.slice(0, playerCount);
  expect(actorView.isMyAction).toBe(true);
  expect(actorView.currentAction).toMatchObject({ kind: "deck_reorder", actorId: actor.id });
  expect(actorView.currentAction.deckReorder.cards.map((item) => item.id)).toEqual(cards.map((item) => item.id));
  const dialog = actorPage.getByRole("dialog", { name: "Stargazing deck reorder" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "false");
  const lastPanelControl = dialog.locator("button:not(:disabled)").last();
  await lastPanelControl.focus();
  await actorPage.keyboard.press("Tab");
  await expect.poll(() => dialog.evaluate((element) => element.contains(document.activeElement))).toBe(false);
  return { seed, turnContext, turnPage, actorPage, actor, actorDock, actorView, dialog, cards };
}

const zone = (dialog, name) => dialog.locator(`[data-deck-zone="${name}"]`);
const cardNode = (dialog, id) => dialog.locator(`[data-deck-card-id="${id}"]`);

async function orderIn(dialog, zoneName) {
  return zone(dialog, zoneName).locator("[data-deck-card-id]").evaluateAll((items) => items.map((item) => item.dataset.deckCardId));
}

async function moveCardViaMenu(dialog, cardId, cardName, destination) {
  await cardNode(dialog, cardId).getByRole("button", { name: `Move ${cardName}`, exact: true }).click();
  const label = destination === "unassigned"
    ? `Return ${cardName} to revealed cards`
    : `Move ${cardName} to ${destination === "top" ? "top" : "bottom"} of deck`;
  await dialog.getByRole("button", { name: label, exact: true }).click();
}

async function assertCardConservation(dialog, cards) {
  const ids = await dialog.locator("[data-deck-card-id]").evaluateAll((items) => items.map((item) => item.dataset.deckCardId));
  expect(ids).toHaveLength(cards.length);
  expect(new Set(ids).size).toBe(cards.length);
  expect([...ids].sort()).toEqual(cards.map((item) => item.id).sort());
}

async function waitBeyondGenericCardAnimation(page) {
  const durationMs = await page.evaluate(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--played-card-display").trim();
    const amount = Number.parseFloat(value);
    return amount * (value.endsWith("ms") ? 1 : 1000);
  });
  expect(durationMs).toBeGreaterThan(0);
  // This is tied to the production card-display duration: §4.10 requires
  // confirming that revealed faces persist after the generic animation.
  await page.waitForTimeout(durationMs + 120);
}

async function assertResponsiveInitialState({ page, dialog, viewport, cards, testInfo }) {
  await waitBeyondGenericCardAnimation(page);
  await expect(zone(dialog, "top")).toHaveAttribute("data-card-count", "0");
  await expect(zone(dialog, "bottom")).toHaveAttribute("data-card-count", "0");
  await expect(zone(dialog, "unassigned")).toHaveAttribute("data-card-count", String(cards.length));
  await expect(dialog.locator('[data-deck-reorder-progress="true"]')).toHaveText(`0 / ${cards.length} arranged`);
  await expect(dialog.locator("[data-deck-reorder-submit]")).toBeDisabled();
  await expect(dialog.locator(".deck-reorder-card-actions")).toHaveCount(0);
  await expect(dialog.locator(".deck-reorder-menu-toggle")).toHaveCount(cards.length);
  await assertCardConservation(dialog, cards);

  const composition = await dialog.evaluate((element) => {
    const panel = element.getBoundingClientRect();
    const readZone = (name) => {
      const root = element.querySelector(`[data-deck-zone="${name}"]`);
      const row = root.querySelector("[data-deck-zone-items]");
      const box = root.getBoundingClientRect();
      return {
        x: box.x, y: box.y, right: box.right, bottom: box.bottom, height: box.height,
        width: row.clientWidth, scrollWidth: row.scrollWidth,
      };
    };
    const faces = [...element.querySelectorAll('[data-deck-zone="unassigned"] [data-deck-card-id]')].map((item) => {
      const face = item.querySelector(".played-card");
      const box = face.getBoundingClientRect();
      const style = getComputedStyle(face);
      return {
        id: item.dataset.deckCardId,
        width: box.width,
        height: box.height,
        opacity: Number(style.opacity),
        animation: style.animationName,
        transformIdentity: new DOMMatrixReadOnly(style.transform).isIdentity,
        name: face.querySelector(".card-name-mark")?.textContent?.trim(),
        rankAndSuit: face.querySelector("i")?.textContent?.replaceAll("\n", "").replaceAll(" ", ""),
      };
    });
    const completion = element.querySelector("[data-deck-reorder-submit]").getBoundingClientRect();
    return {
      panel: { x: panel.x, y: panel.y, right: panel.right, bottom: panel.bottom },
      top: readZone("top"),
      revealed: readZone("unassigned"),
      bottom: readZone("bottom"),
      faces,
      completion: { x: completion.x, y: completion.y, right: completion.right, bottom: completion.bottom, height: completion.height },
      viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth },
    };
  });

  expect(composition.panel.x).toBeGreaterThanOrEqual(0);
  expect(composition.panel.y).toBeGreaterThanOrEqual(0);
  expect(composition.panel.right).toBeLessThanOrEqual(viewport.width);
  expect(composition.panel.bottom).toBeLessThanOrEqual(viewport.height);
  expect(composition.top.height).toBeGreaterThanOrEqual(70);
  expect(composition.top.height).toBeLessThan(130);
  expect(composition.bottom.height).toBeGreaterThanOrEqual(70);
  expect(composition.bottom.height).toBeLessThan(130);
  expect(composition.faces.map((face) => face.id)).toEqual(cards.map((item) => item.id));
  expect(composition.faces.every((face) => face.width >= 60 && face.height >= 84)).toBe(true);
  expect(composition.faces.every((face) => face.opacity === 1 && face.animation === "none" && face.transformIdentity)).toBe(true);
  expect(composition.faces.map((face) => [face.name, face.rankAndSuit])).toEqual(cards.map((item) => [displayName(item.kind), `${item.rank}${item.suit}`]));
  expect(composition.viewport.documentWidth).toBeLessThanOrEqual(viewport.width);
  expect(composition.completion.x).toBeGreaterThanOrEqual(0);
  expect(composition.completion.y).toBeGreaterThanOrEqual(0);
  expect(composition.completion.right).toBeLessThanOrEqual(viewport.width);
  expect(composition.completion.bottom).toBeLessThanOrEqual(viewport.height);
  expect(composition.completion.height).toBeGreaterThanOrEqual(44);

  if (composition.revealed.scrollWidth > composition.revealed.width + 1) {
    expect(composition.revealed.scrollWidth).toBeGreaterThan(composition.revealed.width);
    await expect(zone(dialog, "unassigned").locator("header span")).toContainText("Swipe");
    const beforePageScroll = await page.evaluate(() => scrollY);
    for (const id of [cards[0].id, cards.at(-1).id]) {
      const item = cardNode(dialog, id);
      await item.scrollIntoViewIfNeeded();
      const bounds = await item.locator(".deck-reorder-card-face").boundingBox();
      const row = await zone(dialog, "unassigned").locator("[data-deck-zone-items]").boundingBox();
      expect(bounds && row).toBeTruthy();
      expect(bounds.x).toBeGreaterThanOrEqual(row.x - 1);
      expect(bounds.x + bounds.width).toBeLessThanOrEqual(row.x + row.width + 1);
    }
    expect(await page.evaluate(() => scrollY)).toBe(beforePageScroll);
    const row = zone(dialog, "unassigned").locator("[data-deck-zone-items]");
    const firstFace = cardNode(dialog, cards[0].id).locator(".deck-reorder-card-face");
    await firstFace.scrollIntoViewIfNeeded();
    await row.evaluate((element) => { element.scrollLeft = 0; });
    const faceBounds = await firstFace.boundingBox();
    const rowBounds = await row.boundingBox();
    expect(faceBounds && rowBounds).toBeTruthy();
    const touchStart = { x: Math.round(rowBounds.x + rowBounds.width - 20), y: Math.round(faceBounds.y + faceBounds.height * 0.6) };
    const beforeHorizontalScroll = await row.evaluate((element) => element.scrollLeft);
    const cdp = await page.context().newCDPSession(page);
    const touchId = nextTouchIdentifier++;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...touchStart, id: touchId }] });
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: touchStart.x - 96, y: touchStart.y, id: touchId }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => row.evaluate((element) => element.scrollLeft)).toBeGreaterThan(beforeHorizontalScroll);
    expect(await page.evaluate(() => scrollY)).toBe(beforePageScroll);
    await cdp.detach();
    await row.evaluate((element) => { element.scrollLeft = 0; });
  } else {
    expect(composition.revealed.scrollWidth).toBeLessThanOrEqual(composition.revealed.width + 1);
  }

  const name = `stargazing-real-${viewport.width}x${viewport.height}`;
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
  return composition;
}

async function insertionPoint(dialog, zoneName, index, movingId) {
  return zone(dialog, zoneName).locator("[data-deck-zone-items]").evaluate((row, { index, movingId }) => {
    const cards = [...row.querySelectorAll("[data-deck-card-id]")].filter((item) => item.dataset.deckCardId !== movingId);
    const rowBounds = row.getBoundingClientRect();
    const y = rowBounds.top + rowBounds.height / 2;
    if (cards.length === 0) return { x: rowBounds.left + rowBounds.width / 2, y };
    if (index >= cards.length) {
      const last = cards.at(-1).getBoundingClientRect();
      return { x: last.right - 2, y };
    }
    const next = cards[index].getBoundingClientRect();
    return { x: next.left + 2, y };
  }, { index, movingId });
}

async function touchDrag({ page, cdp, dialog, cards, cardId, zoneName, index, screenshotName, testInfo, origin = "grip" }) {
  const grip = cardNode(dialog, cardId).locator("[data-deck-touch-handle]");
  const face = cardNode(dialog, cardId).locator(".deck-reorder-card-face");
  const touchOrigin = origin === "card-body" ? face : grip;
  await zone(dialog, zoneName).scrollIntoViewIfNeeded();
  await touchOrigin.scrollIntoViewIfNeeded();
  const originBounds = await touchOrigin.boundingBox();
  expect(originBounds).toBeTruthy();
  const touchId = nextTouchIdentifier++;
  const start = { x: Math.round(originBounds.x + (origin === "card-body" ? originBounds.width * 0.42 : originBounds.width / 2)), y: Math.round(originBounds.y + (origin === "card-body" ? originBounds.height * 0.58 : originBounds.height / 2)) };
  const originHit = await page.evaluate(({ x, y, cardId, origin }) => {
    const hit = document.elementFromPoint(x, y);
    const selector = origin === "card-body" ? ".deck-reorder-card-face" : "[data-deck-touch-handle]";
    const target = document.querySelector(`[data-deck-card-id="${cardId}"] ${selector}`);
    return Boolean(target && (hit === target || target.contains(hit)));
  }, { ...start, cardId, origin });
  expect(originHit).toBe(true);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: touchId }] });
  await expect(cardNode(dialog, cardId)).toHaveAttribute("data-dragging", "true");
  const preview = page.locator(`.deck-reorder-overlay [data-deck-drag-preview="${cardId}"]`);
  await expect(preview).toBeVisible();
  await assertCardConservation(dialog, cards);

  const target = await insertionPoint(dialog, zoneName, index, cardId);
  expect(Number.isFinite(target.x) && Number.isFinite(target.y)).toBe(true);
  const destinationRow = zone(dialog, zoneName).locator("[data-deck-zone-items]");
  const rowMetrics = await destinationRow.evaluate((row, movingId) => {
    const items = [...row.querySelectorAll("[data-deck-card-id]")].filter((item) => item.dataset.deckCardId !== movingId);
    const bounds = row.getBoundingClientRect();
    return {
      count: items.length,
      left: bounds.left,
      right: bounds.right,
      top: bounds.top,
      height: bounds.height,
      scrollLeft: row.scrollLeft,
      maxScroll: row.scrollWidth - row.clientWidth,
    };
  }, cardId);
  const needsLeftEdgeScroll = index === 0 && rowMetrics.maxScroll > 1
    && rowMetrics.scrollLeft > 1 && target.x < rowMetrics.left + 24;
  const needsRightEdgeScroll = index >= rowMetrics.count && rowMetrics.maxScroll > 1
    && target.x > rowMetrics.right - 24;
  // Keep the finger inside the phone viewport and let the real row edge-scroll
  // reveal an off-screen first/last insertion gap before releasing.
  const moveTarget = needsLeftEdgeScroll || needsRightEdgeScroll
    ? { x: needsLeftEdgeScroll ? rowMetrics.left + 8 : rowMetrics.right - 8, y: rowMetrics.top + rowMetrics.height / 2 }
    : target;
  for (let step = 1; step <= 8; step += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{
        x: Math.round(start.x + ((moveTarget.x - start.x) * step) / 8),
        y: Math.round(start.y + ((moveTarget.y - start.y) * step) / 8),
        id: touchId,
      }],
    });
  }
  await expect(zone(dialog, zoneName)).toHaveAttribute("data-drop-active", "true");
  await expect(zone(dialog, zoneName)).toHaveAttribute("data-drop-eligible", "true");
  await expect(dialog.locator('[data-drop-eligible="true"]')).toHaveCount(3);
  const eligibleBorders = await dialog.locator('[data-drop-eligible="true"]').evaluateAll((zones) => zones.map((item) => getComputedStyle(item).borderTopColor));
  expect(eligibleBorders.every((color) => color !== "rgba(0, 0, 0, 0)" && color !== "transparent")).toBe(true);
  const indicator = dialog.locator('[data-deck-insertion-indicator="true"]');
  if (needsLeftEdgeScroll || needsRightEdgeScroll) {
    await expect.poll(() => indicator.getAttribute("data-insertion-index")).toBe(String(index));
  }
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveAttribute("data-insertion-index", String(index));
  const previewBounds = await preview.boundingBox();
  const viewport = page.viewportSize();
  expect(previewBounds).toBeTruthy();
  expect(viewport).toBeTruthy();
  expect(previewBounds.x).toBeGreaterThanOrEqual(0);
  expect(previewBounds.y).toBeGreaterThanOrEqual(0);
  expect(previewBounds.x + previewBounds.width).toBeLessThanOrEqual(viewport.width);
  expect(previewBounds.y + previewBounds.height).toBeLessThanOrEqual(viewport.height);
  if (screenshotName) {
    const path = testInfo.outputPath(`${screenshotName}.png`);
    await page.screenshot({ path, animations: "disabled" });
    await testInfo.attach(screenshotName, { path, contentType: "image/png" });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(cardNode(dialog, cardId)).toHaveAttribute("data-deck-zone-name", zoneName);
  return target;
}

test("Stargazing whole-card touch hold works at a short phone viewport without taking quick swipes", async ({ page, request, browser }, testInfo) => {
  const viewport = { width: 390, height: 700 };
  const opened = await openRealStargazingDecision({ page, request, browser, viewport, playerCount: 5 });
  const cdp = await opened.actorPage.context().newCDPSession(opened.actorPage);
  const [attack, dodge] = opened.cards;
  const unassignedRow = zone(opened.dialog, "unassigned").locator("[data-deck-zone-items]");
  const attackFace = cardNode(opened.dialog, attack.id).locator(".deck-reorder-card-face");
  const faceBounds = await attackFace.boundingBox();
  expect(faceBounds).toBeTruthy();
  const tapStart = { x: Math.round(faceBounds.x + faceBounds.width * 0.42), y: Math.round(faceBounds.y + faceBounds.height * 0.58) };
  const tapId = nextTouchIdentifier++;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...tapStart, id: tapId }] });
  await opened.actorPage.waitForTimeout(80);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(cardNode(opened.dialog, attack.id)).toHaveAttribute("data-dragging", "false");
  expect(await orderIn(opened.dialog, "unassigned")).toEqual(opened.cards.map((item) => item.id));

  const rowMetrics = await unassignedRow.evaluate((row) => ({
    left: row.scrollLeft,
    max: row.scrollWidth - row.clientWidth,
  }));
  expect(rowMetrics.max).toBeGreaterThan(0);
  await unassignedRow.evaluate((row) => { row.scrollLeft = 0; });
  const swipeCard = opened.cards[3];
  const swipeFace = cardNode(opened.dialog, swipeCard.id).locator(".deck-reorder-card-face");
  await swipeFace.scrollIntoViewIfNeeded();
  const swipeBounds = await swipeFace.boundingBox();
  expect(swipeBounds).toBeTruthy();
  const swipeStart = { x: Math.round(swipeBounds.x + swipeBounds.width * 0.42), y: Math.round(swipeBounds.y + swipeBounds.height * 0.58) };
  const swipeId = nextTouchIdentifier++;
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...swipeStart, id: swipeId }] });
  await opened.actorPage.waitForTimeout(60);
  await cdp.send("Input.dispatchTouchEvent", {
    type: "touchMove",
    touchPoints: [{ x: swipeStart.x - 80, y: swipeStart.y, id: swipeId }],
  });
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => unassignedRow.evaluate((row) => row.scrollLeft)).toBeGreaterThan(0);
  await expect(cardNode(opened.dialog, swipeCard.id)).toHaveAttribute("data-dragging", "false");
  expect(await orderIn(opened.dialog, "unassigned")).toEqual(opened.cards.map((item) => item.id));

  const sequenceScroller = opened.dialog.locator(".deck-reorder-sequences");
  const verticalMetrics = await sequenceScroller.evaluate((element) => ({
    top: element.scrollTop,
    max: element.scrollHeight - element.clientHeight,
  }));
  if (verticalMetrics.max > 1) {
    await unassignedRow.evaluate((row) => { row.scrollLeft = 0; });
    await attackFace.scrollIntoViewIfNeeded();
    const verticalFaceBounds = await attackFace.boundingBox();
    expect(verticalFaceBounds).toBeTruthy();
    const verticalStart = { x: Math.round(verticalFaceBounds.x + verticalFaceBounds.width * 0.42), y: Math.round(verticalFaceBounds.y + verticalFaceBounds.height * 0.58) };
    const verticalTouchId = nextTouchIdentifier++;
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...verticalStart, id: verticalTouchId }] });
    await opened.actorPage.waitForTimeout(60);
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: verticalStart.x, y: verticalStart.y - 80, id: verticalTouchId }],
    });
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect.poll(() => sequenceScroller.evaluate((element) => element.scrollTop)).toBeGreaterThan(verticalMetrics.top);
    await expect(cardNode(opened.dialog, attack.id)).toHaveAttribute("data-dragging", "false");
    expect(await orderIn(opened.dialog, "unassigned")).toEqual(opened.cards.map((item) => item.id));
  }

  const actorActions = [];
  const recordActorAction = (requestEvent) => {
    if (requestEvent.url() !== `${API}/api/rooms` || requestEvent.method() !== "POST") return;
    try { actorActions.push(JSON.parse(requestEvent.postData() ?? "{}").action); }
    catch { actorActions.push("invalid-request"); }
  };
  opened.actorPage.on("request", recordActorAction);
  await unassignedRow.evaluate((row) => { row.scrollLeft = 0; });
  await touchDrag({
    page: opened.actorPage,
    cdp,
    dialog: opened.dialog,
    cards: opened.cards,
    cardId: attack.id,
    zoneName: "top",
    index: 0,
    screenshotName: "stargazing-whole-card-touch-390x700",
    testInfo,
    origin: "card-body",
  });
  await assertCardConservation(opened.dialog, opened.cards);
  await moveCardViaMenu(opened.dialog, dodge.id, "Dodge", "bottom");
  expect(await orderIn(opened.dialog, "top")).toEqual([attack.id]);
  expect(await orderIn(opened.dialog, "bottom")).toEqual([dodge.id]);
  expect(actorActions).toEqual([], "touch drag and Move menu changes remain local until explicit completion");
  opened.actorPage.off("request", recordActorAction);
  await cdp.detach();
  await opened.actorPage.close();
  await opened.turnPage.close();
  await opened.turnContext.close();
});

async function assertDockStaysPut(page, dialog, actorId) {
  const geometry = await page.evaluate(async ({ actorId }) => {
    const overlay = document.querySelector(".deck-reorder-overlay");
    const table = overlay?.parentElement;
    const panel = overlay?.querySelector(".deck-reorder-panel");
    const dock = document.querySelector(`.local-player-dock[data-player-anchor="${actorId}"]`);
    const center = document.querySelector(".play-center");
    const board = document.querySelector(".player-board");
    const seats = [...document.querySelectorAll(".opponent-player-card")];
    if (!overlay || !table || !panel || !dock || !center || !board || !seats.length) return null;
    const originalDisplay = overlay.style.display;
    const readRect = (element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    const measure = () => ({ center: readRect(center), board: readRect(board), dock: readRect(dock), seats: seats.map(readRect) });
    const visible = measure();
    const overlayStyle = getComputedStyle(overlay);
    const panelBox = panel.getBoundingClientRect();
    const panelHit = document.elementFromPoint(panelBox.left + panelBox.width / 2, panelBox.top + panelBox.height / 2);
    const tableBox = table.getBoundingClientRect();
    const switchHitTargets = [...table.querySelectorAll("button.test-view-switch-button")].map((button) => {
      const box = button.getBoundingClientRect();
      const hit = document.elementFromPoint(box.left + box.width / 2, box.top + box.height / 2);
      return hit?.closest("button") === button;
    });
    const overlayContract = {
      position: overlayStyle.position,
      insets: ["top", "right", "bottom", "left"].map((property) => overlayStyle[property]),
      pointerEvents: overlayStyle.pointerEvents,
      panelPointerEvents: getComputedStyle(panel).pointerEvents,
      ariaModal: panel.getAttribute("aria-modal"),
      panelWithinTable: panelBox.left >= tableBox.left - 1 && panelBox.right <= tableBox.right + 1
        && panelBox.top >= tableBox.top - 1 && panelBox.bottom <= tableBox.bottom + 1,
      panelReceivesInput: panelHit?.closest(".deck-reorder-panel") === panel,
      switchHitTargets,
    };
    overlay.style.display = "none";
    await new Promise(requestAnimationFrame);
    const hidden = measure();
    overlay.style.display = originalDisplay;
    await new Promise(requestAnimationFrame);
    return { visible, hidden, restored: measure(), overlayContract };
  }, { actorId });
  expect(geometry).toBeTruthy();
  expect(geometry.overlayContract).toEqual({
    position: "absolute",
    insets: ["0px", "0px", "0px", "0px"],
    pointerEvents: "none",
    panelPointerEvents: "auto",
    ariaModal: "false",
    panelWithinTable: true,
    panelReceivesInput: true,
    switchHitTargets: geometry.overlayContract.switchHitTargets.map(() => true),
  });
  for (const part of ["center", "board", "dock", ...geometry.visible.seats.map((_, index) => `seat-${index}`)]) {
    const index = part.startsWith("seat-") ? Number(part.slice(5)) : null;
    const visible = index === null ? geometry.visible[part] : geometry.visible.seats[index];
    const hidden = index === null ? geometry.hidden[part] : geometry.hidden.seats[index];
    const restored = index === null ? geometry.restored[part] : geometry.restored.seats[index];
    for (const key of ["x", "y", "width", "height"]) {
      expect(Math.abs(visible[key] - hidden[key])).toBeLessThanOrEqual(0.5);
      expect(Math.abs(visible[key] - restored[key])).toBeLessThanOrEqual(0.5);
    }
  }
  await expect(dialog).toBeVisible();
}

for (const entry of [
  { viewport: { width: 390, height: 844 }, playerCount: 5 },
  { viewport: { width: 440, height: 894 }, playerCount: 4 },
  { viewport: { width: 480, height: 900 }, playerCount: 4 },
  { viewport: { width: 320, height: 640 }, playerCount: 5 },
]) {
  const { viewport, playerCount } = entry;
  test(`real ${playerCount}-card Stargazing layout at ${viewport.width}×${viewport.height}`, async ({ page, request, browser }, testInfo) => {
    const opened = await openRealStargazingDecision({ page, request, browser, viewport, playerCount });
    const composition = await assertResponsiveInitialState({
      page: opened.actorPage,
      dialog: opened.dialog,
      viewport,
      cards: opened.cards,
      testInfo,
    });
    expect(composition.viewport.documentWidth).toBeLessThanOrEqual(viewport.width);
    await assertDockStaysPut(opened.actorPage, opened.dialog, opened.actor.id);

    if (viewport.width !== 390) {
      if (viewport.width === 320) {
        for (const item of opened.cards) {
          const name = displayName(item.kind);
          await cardNode(opened.dialog, item.id).getByRole("button", { name: `Move ${name}` }).click();
          await opened.dialog.getByRole("button", { name: `Move ${name} to top of deck` }).click();
        }
        expect(await orderIn(opened.dialog, "top")).toEqual(opened.cards.map((item) => item.id));
        const topRow = zone(opened.dialog, "top").locator("[data-deck-zone-items]");
        const firstFace = cardNode(opened.dialog, opened.cards[0].id).locator(".deck-reorder-card-face");
        await firstFace.scrollIntoViewIfNeeded();
        await topRow.evaluate((row) => { row.scrollLeft = 0; });
        const firstBounds = await firstFace.boundingBox();
        const rowBounds = await topRow.boundingBox();
        expect(firstBounds && rowBounds).toBeTruthy();
        const start = { x: firstBounds.x + firstBounds.width / 2, y: firstBounds.y + firstBounds.height / 2 };
        const cdp = await opened.actorPage.context().newCDPSession(opened.actorPage);
        const touchId = nextTouchIdentifier++;
        await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: touchId }] });
        await expect(cardNode(opened.dialog, opened.cards[0].id)).toHaveAttribute("data-dragging", "true");
        const edgePoint = { x: rowBounds.x + rowBounds.width - 8, y: rowBounds.y + rowBounds.height / 2 };
        for (let step = 1; step <= 6; step += 1) {
          await cdp.send("Input.dispatchTouchEvent", {
            type: "touchMove",
            touchPoints: [{
              x: Math.round(start.x + ((edgePoint.x - start.x) * step) / 6),
              y: Math.round(start.y + ((edgePoint.y - start.y) * step) / 6),
              id: touchId,
            }],
          });
        }
        const maxScroll = await topRow.evaluate((row) => row.scrollWidth - row.clientWidth);
        expect(maxScroll).toBeGreaterThan(0);
        await expect.poll(() => topRow.evaluate((row) => row.scrollLeft)).toBeGreaterThan(0);
        await expect.poll(() => topRow.evaluate((row) => row.scrollLeft >= row.scrollWidth - row.clientWidth - 1)).toBe(true);
        await expect(opened.dialog.locator('[data-deck-insertion-indicator="true"]')).toHaveAttribute("data-insertion-index", String(opened.cards.length - 1));
        await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
        expect(await orderIn(opened.dialog, "top")).toEqual([...opened.cards.slice(1).map((item) => item.id), opened.cards[0].id]);
        await assertCardConservation(opened.dialog, opened.cards);
        await cdp.detach();
      }
      await opened.actorPage.close();
      await opened.turnPage.close();
      await opened.turnContext.close();
      return;
    }

    // The ordinary top-level player and a real observer do not receive the
    // actor's private decision or revealed card identities.
    const observer = await roomView(request, opened.seed, 2);
    expect(observer.currentAction.kind).toBe("deck_reorder");
    expect(observer.currentAction.deckReorder).toBeUndefined();
    const observerJson = JSON.stringify(observer);
    const observerContext = await browser.newContext({ viewport, hasTouch: true });
    const observerPage = await observerContext.newPage();
    await openPlayer(observerPage, opened.seed, 2, viewport);
    await expect(observerPage.getByRole("dialog", { name: "Stargazing deck reorder" })).toHaveCount(0);
    const observerMarkup = await observerPage.locator("body").innerHTML();
    for (const item of opened.cards) {
      expect(observerMarkup).not.toContain(item.id);
      expect(observerJson).not.toContain(item.id);
    }
    await expect(opened.turnPage.getByRole("dialog", { name: "Stargazing deck reorder" })).toHaveCount(0);
    await expect(opened.turnPage.locator(".deck-reorder-card")).toHaveCount(0);

    const actorActions = [];
    const recordActorAction = (request) => {
      if (request.url() !== `${API}/api/rooms` || request.method() !== "POST") return;
      try { actorActions.push(JSON.parse(request.postData() ?? "{}").action); }
      catch { actorActions.push("invalid-request"); }
    };
    opened.actorPage.on("request", recordActorAction);

    const cdp = await opened.actorPage.context().newCDPSession(opened.actorPage);
    const [attack, dodge, peach, duel, dismantle] = opened.cards;
    const constraints = opened.actorView.currentAction.deckReorder;
    expect(constraints).toMatchObject({ minTop: 0, maxTop: opened.cards.length });
    await touchDrag({
      page: opened.actorPage,
      cdp,
      dialog: opened.dialog,
      cards: opened.cards,
      cardId: attack.id,
      zoneName: "top",
      index: 0,
      screenshotName: "stargazing-real-touch-drag-active",
      testInfo,
      origin: "card-body",
    });
    await assertCardConservation(opened.dialog, opened.cards);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: dodge.id, zoneName: "bottom", index: 0 });

    // Native touch cancellation must preserve the arrangement.
    await opened.actorPage.evaluate(() => {
      window.__stargazingPointerCancelled = false;
      document.addEventListener("pointercancel", () => { window.__stargazingPointerCancelled = true; }, { once: true });
    });
    const attackCancelFace = cardNode(opened.dialog, attack.id).locator(".deck-reorder-card-face");
    await attackCancelFace.scrollIntoViewIfNeeded();
    const attackCancelFaceBox = await attackCancelFace.boundingBox();
    expect(attackCancelFaceBox).toBeTruthy();
    const cancelTouchStart = {
      x: Math.round(attackCancelFaceBox.x + attackCancelFaceBox.width * 0.42),
      y: Math.round(attackCancelFaceBox.y + attackCancelFaceBox.height * 0.58),
    };
    const cancelFaceHit = await opened.actorPage.evaluate(({ x, y, cardId }) => {
      const hit = document.elementFromPoint(x, y);
      const face = document.querySelector(`[data-deck-card-id="${cardId}"] .deck-reorder-card-face`);
      const grip = document.querySelector(`[data-deck-card-id="${cardId}"] [data-deck-touch-handle]`);
      return Boolean(face && (hit === face || face.contains(hit)) && !(grip && (hit === grip || grip.contains(hit))));
    }, { ...cancelTouchStart, cardId: attack.id });
    expect(cancelFaceHit).toBe(true);
    const cancelTouchId = nextTouchIdentifier++;
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchStart",
      touchPoints: [{ ...cancelTouchStart, id: cancelTouchId }],
    });
    await expect(cardNode(opened.dialog, attack.id)).toHaveAttribute("data-dragging", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchCancel", touchPoints: [] });
    await expect.poll(() => opened.actorPage.evaluate(() => window.__stargazingPointerCancelled)).toBe(true);
    expect(await orderIn(opened.dialog, "top")).toEqual([attack.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([dodge.id]);

    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: peach.id, zoneName: "top", index: 1 });
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: duel.id, zoneName: "bottom", index: 1 });
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: dismantle.id, zoneName: "top", index: 2 });
    expect(await orderIn(opened.dialog, "top")).toEqual([attack.id, peach.id, dismantle.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([dodge.id, duel.id]);
    await assertCardConservation(opened.dialog, opened.cards);

    // Whole-card touch reorders exercise before, middle and after insertion in
    // the three-card Top row, then repeat the same boundaries in Bottom.
    await opened.actorPage.evaluate((cardId) => {
      window.__stargazingAttackNode = document.querySelector(`[data-deck-card-id="${cardId}"]`);
    }, attack.id);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: attack.id, zoneName: "top", index: 1 });
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, attack.id, dismantle.id]);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: attack.id, zoneName: "top", index: 0 });
    expect(await orderIn(opened.dialog, "top")).toEqual([attack.id, peach.id, dismantle.id]);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: attack.id, zoneName: "top", index: 2 });
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, dismantle.id, attack.id]);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: dodge.id, zoneName: "bottom", index: 1 });
    expect(await orderIn(opened.dialog, "bottom")).toEqual([duel.id, dodge.id]);
    expect(await opened.actorPage.evaluate((cardId) => window.__stargazingAttackNode === document.querySelector(`[data-deck-card-id="${cardId}"]`), attack.id)).toBe(true);

    // Exercise Top→Bottom, Bottom→Top and the before/middle/after positions
    // in a three-card Bottom row using real touch drags.
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: attack.id, zoneName: "bottom", index: 1 });
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, dismantle.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([duel.id, attack.id, dodge.id]);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: attack.id, zoneName: "bottom", index: 0 });
    expect(await orderIn(opened.dialog, "bottom")).toEqual([attack.id, duel.id, dodge.id]);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: dodge.id, zoneName: "bottom", index: 1 });
    expect(await orderIn(opened.dialog, "bottom")).toEqual([attack.id, dodge.id, duel.id]);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: attack.id, zoneName: "bottom", index: 2 });
    expect(await orderIn(opened.dialog, "bottom")).toEqual([dodge.id, duel.id, attack.id]);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: duel.id, zoneName: "top", index: 1 });
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, duel.id, dismantle.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([dodge.id, attack.id]);
    await assertCardConservation(opened.dialog, opened.cards);
    // Invalid touch drop outside every legal row leaves the old arrangement.
    const beforeInvalidBottom = await orderIn(opened.dialog, "bottom");
    const attackFace = cardNode(opened.dialog, attack.id).locator(".deck-reorder-card-face");
    await attackFace.scrollIntoViewIfNeeded();
    const attackFaceBounds = await attackFace.boundingBox();
    expect(attackFaceBounds).toBeTruthy();
    const invalidTouchId = nextTouchIdentifier++;
    const invalidStart = { x: attackFaceBounds.x + attackFaceBounds.width / 2, y: attackFaceBounds.y + attackFaceBounds.height / 2 };
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...invalidStart, id: invalidTouchId }] });
    await expect(cardNode(opened.dialog, attack.id)).toHaveAttribute("data-dragging", "true");
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: 2, y: 2, id: invalidTouchId }] });
    await expect(opened.dialog.locator('[data-drop-active="true"]')).toHaveCount(0);
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await expect(cardNode(opened.dialog, attack.id)).toHaveAttribute("data-deck-zone-name", "bottom");
    expect(await orderIn(opened.dialog, "bottom")).toEqual(beforeInvalidBottom);
    await assertCardConservation(opened.dialog, opened.cards);

    // The compact per-card Move menu is the keyboard/screen-reader fallback,
    // including cross-zone reassignment, undo to center, and within-zone order.
    const dodgeMoveButton = cardNode(opened.dialog, dodge.id).getByRole("button", { name: "Move Dodge" });
    await dodgeMoveButton.press("Enter");
    await expect(opened.dialog.locator(`[data-deck-reorder-menu-for="${dodge.id}"]`)).toBeVisible();
    await opened.dialog.getByRole("button", { name: "Move Dodge to top of deck" }).press("Enter");
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, duel.id, dismantle.id, dodge.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([attack.id]);
    await expect(opened.dialog.locator(".deck-reorder-live")).toHaveText("Dodge moved to Top of Deck, position 4.");
    await expect(dodgeMoveButton).toBeFocused();
    await cardNode(opened.dialog, dodge.id).getByRole("button", { name: "Move Dodge" }).click();
    await opened.dialog.getByRole("button", { name: "Return Dodge to revealed cards" }).click();
    expect(await orderIn(opened.dialog, "unassigned")).toEqual([dodge.id]);
    await cardNode(opened.dialog, peach.id).getByRole("button", { name: "Move Peach" }).click();
    await opened.dialog.getByRole("button", { name: "Move Peach later" }).click();
    expect(await orderIn(opened.dialog, "top")).toEqual([duel.id, peach.id, dismantle.id]);
    await cardNode(opened.dialog, peach.id).getByRole("button", { name: "Move Peach" }).click();
    await opened.dialog.getByRole("button", { name: "Move Peach earlier" }).click();
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, duel.id, dismantle.id]);
    await cardNode(opened.dialog, dodge.id).getByRole("button", { name: "Move Dodge" }).click();
    await opened.dialog.getByRole("button", { name: "Move Dodge to bottom of deck" }).click();
    expect(await orderIn(opened.dialog, "bottom")).toEqual([attack.id, dodge.id]);
    await assertCardConservation(opened.dialog, opened.cards);
    const emptyRevealedBounds = await zone(opened.dialog, "unassigned").boundingBox();
    expect(emptyRevealedBounds).toBeTruthy();
    expect(emptyRevealedBounds.height).toBeLessThan(60);

    // Rapid repeated menu moves stay local and preserve one physical identity
    // per card; both empty destination rows are then exercised explicitly.
    for (let cycle = 0; cycle < 3; cycle += 1) {
      await moveCardViaMenu(opened.dialog, peach.id, "Peach", "bottom");
      await moveCardViaMenu(opened.dialog, peach.id, "Peach", "top");
      await assertCardConservation(opened.dialog, opened.cards);
    }
    for (const [item, name] of [[peach, "Peach"], [duel, "Duel"], [dismantle, displayName(dismantle.kind)], [attack, "Attack"], [dodge, "Dodge"]]) {
      const currentZone = await cardNode(opened.dialog, item.id).getAttribute("data-deck-zone-name");
      if (currentZone !== "unassigned") await moveCardViaMenu(opened.dialog, item.id, name, "unassigned");
    }
    expect(await orderIn(opened.dialog, "top")).toEqual([]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([]);
    expect(new Set(await orderIn(opened.dialog, "unassigned"))).toEqual(new Set(opened.cards.map((item) => item.id)));
    await expect(opened.dialog.locator("[data-deck-reorder-submit]")).toBeDisabled();
    await assertCardConservation(opened.dialog, opened.cards);

    // Place a mixed final order through the accessible menu; actual touch
    // gestures above already cover every zone and insertion boundary.
    await moveCardViaMenu(opened.dialog, peach.id, "Peach", "top");
    await moveCardViaMenu(opened.dialog, attack.id, "Attack", "top");
    await moveCardViaMenu(opened.dialog, duel.id, "Duel", "bottom");
    await moveCardViaMenu(opened.dialog, dodge.id, "Dodge", "bottom");
    await moveCardViaMenu(opened.dialog, dismantle.id, displayName(dismantle.kind), "bottom");
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, attack.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([duel.id, dodge.id, dismantle.id]);
    await assertCardConservation(opened.dialog, opened.cards);

    // Re-fetch through a separate token after all local rearrangement and
    // reload that client; neither public JSON nor its visible DOM may disclose
    // the actor's private card identities or local arrangement.
    const observerAfterMoves = await roomView(request, opened.seed, 2);
    expect(observerAfterMoves.currentAction.kind).toBe("deck_reorder");
    expect(observerAfterMoves.currentAction.deckReorder).toBeUndefined();
    const observerAfterMovesJson = JSON.stringify(observerAfterMoves);
    await observerPage.reload();
    await expect(observerPage.locator(".game-shell")).toBeVisible();
    const observerAfterMovesMarkup = await observerPage.locator("body").innerHTML();
    for (const item of opened.cards) {
      expect(observerAfterMovesJson).not.toContain(item.id);
      expect(observerAfterMovesMarkup).not.toContain(item.id);
    }

    const originalTopOrder = await orderIn(opened.dialog, "top");
    const actionRevisionBeforeInspection = (await roomView(request, opened.seed, 1)).actionRevision;
    expect(actionRevisionBeforeInspection).toBe(opened.actorView.actionRevision);
    const inspectedId = opened.seed.players[2].id;
    const inspectionOpener = opened.actorPage.locator(`[data-player-anchor="${inspectedId}"] .opponent-hero-target`);
    await inspectionOpener.click();
    const inspection = opened.actorPage.locator(`.opponent-inspection-panel[data-inspect-player-id="${inspectedId}"]`);
    await expect(inspection).toBeVisible();
    await inspectionOpener.click();
    await expect(inspection).toHaveCount(0);
    await expect(opened.dialog).toBeVisible();
    expect(await orderIn(opened.dialog, "top")).toEqual(originalTopOrder);

    await opened.actorPage.getByTestId("hand-card-inspection-action").first().click();
    const cardDetailsAction = opened.actorPage.getByTestId("hand-card-details-action").first();
    await expect(cardDetailsAction).toBeVisible();
    await cardDetailsAction.click();
    const cardDetails = opened.actorPage.locator('.card-details-panel[data-card-details-context="private-hand"]');
    await expect(cardDetails).toBeVisible();
    await opened.actorPage.getByRole("button", { name: "Close card details" }).click();
    await expect(cardDetails).toHaveCount(0);
    await expect(opened.dialog).toBeVisible();
    expect(await orderIn(opened.dialog, "top")).toEqual(originalTopOrder);
    expect((await roomView(request, opened.seed, 1)).actionRevision).toBe(actionRevisionBeforeInspection);
    expect(actorActions).toEqual([]);

    const arrangementScreenshot = testInfo.outputPath("stargazing-real-mixed-arrangement.png");
    await opened.actorPage.screenshot({ path: arrangementScreenshot, animations: "disabled" });
    await testInfo.attach("stargazing-real-mixed-arrangement", { path: arrangementScreenshot, contentType: "image/png" });
    await expect(opened.dialog.locator("[data-deck-reorder-progress]")).toHaveText("5 / 5 arranged");
    const submit = opened.dialog.locator("[data-deck-reorder-submit]");
    await expect(submit).toBeEnabled();
    const finalTopOrder = await orderIn(opened.dialog, "top");
    expect(finalTopOrder.length).toBeGreaterThanOrEqual(constraints.minTop);
    expect(finalTopOrder.length).toBeLessThanOrEqual(constraints.maxTop);
    const submitBounds = await submit.boundingBox();
    expect(submitBounds).toBeTruthy();
    expect(submitBounds.y + submitBounds.height).toBeLessThanOrEqual(viewport.height);
    expect(actorActions).toEqual([], "dragging, reordering, and menu actions stay local until explicit completion");
    const revisionBeforeSubmit = opened.actorView.actionRevision;
    const completionResponse = postedAction(opened.actorPage, "trigger");
    const drawResponse = postedAction(opened.actorPage, "draw");
    await submit.click();
    const completed = await completionResponse;
    expect(completed.ok()).toBeTruthy();
    expect(JSON.parse(completed.request().postData() ?? "{}")).toMatchObject({
      action: "trigger",
      providerId: "private_deck_reorder",
      topCardIds: [peach.id, attack.id],
      bottomCardIds: [duel.id, dodge.id, dismantle.id],
    });
    const drawn = await drawResponse;
    expect(drawn.ok()).toBeTruthy();
    const drawnBody = await drawn.json();
    expect(drawnBody.drawnCards.map((item) => item.id)).toEqual([peach.id, attack.id]);
    expect(drawnBody.room.myHand.map((item) => item.id)).toEqual(["real-stargazing-private-peach", peach.id, attack.id]);
    const completedPayload = JSON.parse(completed.request().postData() ?? "{}");
    expect(completedPayload.context?.actionRevision).toBe(revisionBeforeSubmit);
    const staleReplay = await request.post(`${API}/api/rooms`, { data: completedPayload });
    expect(staleReplay.status()).toBe(409);
    const staleReplayBody = await staleReplay.json();
    expect(staleReplayBody.stale).toBe(true);
    expect(actorActions).toEqual(["trigger", "draw"], "only Complete submits the exact arrangement before the normal Draw action");
    await expect(opened.dialog).toHaveCount(0);
    const resumed = await roomView(request, opened.seed, 1);
    expect(resumed.actionRevision).not.toBe(revisionBeforeSubmit);
    expect(resumed.currentAction.kind).not.toBe("deck_reorder");
    expect(resumed.myHand.map((item) => item.id)).toEqual(["real-stargazing-private-peach", peach.id, attack.id]);
    expect((await roomView(request, opened.seed, 1)).myHand.map((item) => item.id)).toEqual(["real-stargazing-private-peach", peach.id, attack.id]);
    opened.actorPage.off("request", recordActorAction);
    await cdp.detach();
    await observerPage.close();
    await observerContext.close();
    await opened.actorPage.close();
    await opened.turnPage.close();
    await opened.turnContext.close();
  });
}
