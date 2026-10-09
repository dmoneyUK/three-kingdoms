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
        { name: "ZHU GE LIANG", role: "Loyalist", hero: "zhuge-liang", hp: 3, maxHp: 3, hand: [] },
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
  await expect.poll(() => dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  return { seed, turnContext, turnPage, actorPage, actor, actorDock, actorView, dialog, cards };
}

const zone = (dialog, name) => dialog.locator(`[data-deck-zone="${name}"]`);
const cardNode = (dialog, id) => dialog.locator(`[data-deck-card-id="${id}"]`);

async function orderIn(dialog, zoneName) {
  return zone(dialog, zoneName).locator("[data-deck-card-id]").evaluateAll((items) => items.map((item) => item.dataset.deckCardId));
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

  if (viewport.width === 320) {
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
    for (let step = 1; step <= 6; step += 1) {
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchMove",
        touchPoints: [{ x: touchStart.x - step * 16, y: touchStart.y, id: touchId }],
      });
    }
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

async function touchDrag({ page, cdp, dialog, cards, cardId, zoneName, index, screenshotName, testInfo }) {
  const grip = cardNode(dialog, cardId).locator("[data-deck-touch-handle]");
  await grip.scrollIntoViewIfNeeded();
  const gripBounds = await grip.boundingBox();
  expect(gripBounds).toBeTruthy();
  const touchId = nextTouchIdentifier++;
  const start = { x: Math.round(gripBounds.x + gripBounds.width / 2), y: Math.round(gripBounds.y + gripBounds.height / 2) };
  const gripHit = await page.evaluate(({ x, y, cardId }) => {
    const hit = document.elementFromPoint(x, y);
    const grip = document.querySelector(`[data-deck-card-id="${cardId}"] [data-deck-touch-handle]`);
    return Boolean(grip && (hit === grip || grip.contains(hit)));
  }, { ...start, cardId });
  expect(gripHit).toBe(true);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: touchId }] });
  await expect(cardNode(dialog, cardId)).toHaveAttribute("data-dragging", "true");
  const preview = page.locator(`.deck-reorder-overlay [data-deck-drag-preview="${cardId}"]`);
  await expect(preview).toBeVisible();
  await assertCardConservation(dialog, cards);

  const target = await insertionPoint(dialog, zoneName, index, cardId);
  for (let step = 1; step <= 8; step += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{
        x: Math.round(start.x + ((target.x - start.x) * step) / 8),
        y: Math.round(start.y + ((target.y - start.y) * step) / 8),
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
  await expect(indicator).toBeVisible();
  await expect(indicator).toHaveAttribute("data-insertion-index", String(index));
  const previewBounds = await preview.boundingBox();
  expect(previewBounds).toBeTruthy();
  expect(previewBounds.x).toBeGreaterThanOrEqual(0);
  expect(previewBounds.y).toBeGreaterThanOrEqual(0);
  expect(previewBounds.x + previewBounds.width).toBeLessThanOrEqual(390);
  expect(previewBounds.y + previewBounds.height).toBeLessThanOrEqual(844);
  if (screenshotName) {
    const path = testInfo.outputPath(`${screenshotName}.png`);
    await page.screenshot({ path, animations: "disabled" });
    await testInfo.attach(screenshotName, { path, contentType: "image/png" });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(cardNode(dialog, cardId)).toHaveAttribute("data-deck-zone-name", zoneName);
  return target;
}

async function mouseDrag({ page, dialog, cardId, zoneName, index }) {
  const face = cardNode(dialog, cardId).locator(".deck-reorder-card-face");
  const faceBounds = await face.boundingBox();
  expect(faceBounds).toBeTruthy();
  const start = { x: faceBounds.x + faceBounds.width / 2, y: faceBounds.y + faceBounds.height / 2 };
  const faceHit = await page.evaluate(({ x, y, cardId }) => {
    const hit = document.elementFromPoint(x, y);
    const face = document.querySelector(`[data-deck-card-id="${cardId}"] .deck-reorder-card-face`);
    return Boolean(face && (hit === face || face.contains(hit)));
  }, { ...start, cardId });
  expect(faceHit).toBe(true);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  await page.mouse.move(start.x + 8, start.y + 2);
  await expect(cardNode(dialog, cardId)).toHaveAttribute("data-dragging", "true");
  const target = await insertionPoint(dialog, zoneName, index, cardId);
  await page.mouse.move(target.x, target.y, { steps: 8 });
  await expect(zone(dialog, zoneName)).toHaveAttribute("data-drop-active", "true");
  await expect(dialog.locator('[data-deck-insertion-indicator="true"]')).toHaveAttribute("data-insertion-index", String(index));
  await page.mouse.up();
  await expect(cardNode(dialog, cardId)).toHaveAttribute("data-deck-zone-name", zoneName);
}

async function assertDockStaysPut(page, dialog, actorId) {
  const geometry = await page.evaluate(async ({ actorId }) => {
    const overlay = document.querySelector(".deck-reorder-overlay");
    const dock = document.querySelector(`.local-player-dock[data-player-anchor="${actorId}"]`);
    const center = document.querySelector(".play-center");
    const board = document.querySelector(".player-board");
    const seats = [...document.querySelectorAll(".opponent-player-card")];
    if (!overlay || !dock || !center || !board || !seats.length) return null;
    const originalDisplay = overlay.style.display;
    const readRect = (element) => {
      const { x, y, width, height } = element.getBoundingClientRect();
      return { x, y, width, height };
    };
    const measure = () => ({ center: readRect(center), board: readRect(board), dock: readRect(dock), seats: seats.map(readRect) });
    const visible = measure();
    const position = getComputedStyle(overlay).position;
    overlay.style.display = "none";
    await new Promise(requestAnimationFrame);
    const hidden = measure();
    overlay.style.display = originalDisplay;
    await new Promise(requestAnimationFrame);
    return { visible, hidden, restored: measure(), position };
  }, { actorId });
  expect(geometry).toBeTruthy();
  expect(geometry.position).toBe("fixed");
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
  { viewport: { width: 390, height: 844 }, playerCount: 4 },
  { viewport: { width: 480, height: 900 }, playerCount: 4 },
  { viewport: { width: 320, height: 640 }, playerCount: 5 },
  { viewport: { width: 1440, height: 900 }, playerCount: 5 },
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
        await opened.actorPage.mouse.move(start.x, start.y);
        await opened.actorPage.mouse.down();
        await opened.actorPage.mouse.move(start.x + 8, start.y + 2);
        await expect(cardNode(opened.dialog, opened.cards[0].id)).toHaveAttribute("data-dragging", "true");
        const edgePoint = { x: rowBounds.x + rowBounds.width - 8, y: rowBounds.y + rowBounds.height / 2 };
        await opened.actorPage.mouse.move(edgePoint.x, edgePoint.y, { steps: 6 });
        const maxScroll = await topRow.evaluate((row) => row.scrollWidth - row.clientWidth);
        expect(maxScroll).toBeGreaterThan(0);
        await expect.poll(() => topRow.evaluate((row) => row.scrollLeft)).toBeGreaterThan(0);
        await expect.poll(() => topRow.evaluate((row) => row.scrollLeft >= row.scrollWidth - row.clientWidth - 1)).toBe(true);
        await expect(opened.dialog.locator('[data-deck-insertion-indicator="true"]')).toHaveAttribute("data-insertion-index", String(opened.cards.length - 1));
        await opened.actorPage.mouse.up();
        expect(await orderIn(opened.dialog, "top")).toEqual([...opened.cards.slice(1).map((item) => item.id), opened.cards[0].id]);
        await assertCardConservation(opened.dialog, opened.cards);
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
    const [attack, dodge, peach, duel] = opened.cards;
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
    });
    await assertCardConservation(opened.dialog, opened.cards);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: dodge.id, zoneName: "bottom", index: 0 });

    // Keep native touch-cancel coverage with the native touch interactions,
    // before the later mouse-driven pointer sequences.
    await opened.actorPage.evaluate(() => {
      window.__stargazingPointerCancelled = false;
      document.addEventListener("pointercancel", () => { window.__stargazingPointerCancelled = true; }, { once: true });
    });
    const attackGrip = cardNode(opened.dialog, attack.id).locator("[data-deck-touch-handle]");
    const attackGripBox = await attackGrip.boundingBox();
    expect(attackGripBox).toBeTruthy();
    const cancelTouchStart = {
      x: Math.round(attackGripBox.x + attackGripBox.width / 2),
      y: Math.round(attackGripBox.y + attackGripBox.height / 2),
    };
    const cancelGripHit = await opened.actorPage.evaluate(({ x, y, cardId }) => {
      const hit = document.elementFromPoint(x, y);
      const grip = document.querySelector(`[data-deck-card-id="${cardId}"] [data-deck-touch-handle]`);
      return Boolean(grip && (hit === grip || grip.contains(hit)));
    }, { ...cancelTouchStart, cardId: attack.id });
    expect(cancelGripHit).toBe(true);
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

    await mouseDrag({ page: opened.actorPage, dialog: opened.dialog, cardId: peach.id, zoneName: "top", index: 1 });
    await mouseDrag({ page: opened.actorPage, dialog: opened.dialog, cardId: duel.id, zoneName: "bottom", index: 1 });
    expect(await orderIn(opened.dialog, "top")).toEqual([attack.id, peach.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([dodge.id, duel.id]);

    // Drag reorder within both assigned lists uses visible insertion points.
    await opened.actorPage.evaluate((cardId) => {
      window.__stargazingAttackNode = document.querySelector(`[data-deck-card-id="${cardId}"]`);
    }, attack.id);
    await mouseDrag({ page: opened.actorPage, dialog: opened.dialog, cardId: attack.id, zoneName: "top", index: 1 });
    await mouseDrag({ page: opened.actorPage, dialog: opened.dialog, cardId: dodge.id, zoneName: "bottom", index: 1 });
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, attack.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([duel.id, dodge.id]);
    expect(await opened.actorPage.evaluate((cardId) => window.__stargazingAttackNode === document.querySelector(`[data-deck-card-id="${cardId}"]`), attack.id)).toBe(true);

    // Assigned cards can be touch-dragged across zones and back to the center;
    // all moves remain local, conserve one card per ID, and keep exact order.
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: attack.id, zoneName: "bottom", index: 1 });
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([duel.id, attack.id, dodge.id]);
    await assertCardConservation(opened.dialog, opened.cards);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: attack.id, zoneName: "unassigned", index: 0 });
    expect(await orderIn(opened.dialog, "unassigned")).toEqual([attack.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([duel.id, dodge.id]);
    await assertCardConservation(opened.dialog, opened.cards);
    await touchDrag({ page: opened.actorPage, cdp, dialog: opened.dialog, cards: opened.cards, cardId: attack.id, zoneName: "top", index: 1 });
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, attack.id]);
    await assertCardConservation(opened.dialog, opened.cards);

    // An invalid outside drop must preserve the old lists.
    const attackFace = cardNode(opened.dialog, attack.id).locator(".deck-reorder-card-face");
    // Let Playwright move onto a stable, hit-testable face before sampling its
    // coordinates; earlier pointer sequences can leave a transient row hit-test.
    await attackFace.hover();
    const attackFaceBox = await attackFace.boundingBox();
    expect(attackFaceBox).toBeTruthy();
    const attackFaceHit = await opened.actorPage.evaluate(({ x, y, cardId }) => {
      const hit = document.elementFromPoint(x, y);
      const face = document.querySelector(`[data-deck-card-id="${cardId}"] .deck-reorder-card-face`);
      return Boolean(face && (hit === face || face.contains(hit)));
    }, {
      x: attackFaceBox.x + attackFaceBox.width / 2,
      y: attackFaceBox.y + attackFaceBox.height / 2,
      cardId: attack.id,
    });
    expect(attackFaceHit).toBe(true);
    const oldTop = await orderIn(opened.dialog, "top");
    const attackFaceCenter = {
      x: attackFaceBox.x + attackFaceBox.width / 2,
      y: attackFaceBox.y + attackFaceBox.height / 2,
    };
    await opened.actorPage.evaluate((cardId) => {
      const trace = [];
      const record = (phase) => (event) => {
        const target = event.target instanceof Element ? event.target : null;
        const card = document.querySelector(`[data-deck-card-id="${cardId}"]`);
        trace.push({
          phase,
          type: event.type,
          pointerId: event.pointerId,
          pointerType: event.pointerType,
          isPrimary: event.isPrimary,
          button: event.button,
          buttons: event.buttons,
          x: event.clientX,
          y: event.clientY,
          targetCardId: target?.closest("[data-deck-card-id]")?.getAttribute("data-deck-card-id") ?? null,
          targetClass: typeof target?.className === "string" ? target.className : target?.tagName ?? null,
          dragging: card?.getAttribute("data-dragging") ?? null,
        });
      };
      for (const type of ["pointerdown", "pointermove", "pointerup", "pointercancel", "lostpointercapture"]) {
        document.addEventListener(type, record("capture"), true);
        document.addEventListener(type, record("bubble"));
      }
      window.__stargazingInvalidDropPointerTrace = trace;
    }, attack.id);
    // hover() has already positioned the real mouse at this stable face center.
    await opened.actorPage.mouse.down();
    // Sample movement beyond the 5px drag-activation threshold.
    await opened.actorPage.mouse.move(attackFaceCenter.x + 14, attackFaceCenter.y + 3, { steps: 3 });
    const dragStateBeforeAssertion = await cardNode(opened.dialog, attack.id).getAttribute("data-dragging");
    if (dragStateBeforeAssertion !== "true") {
      const pointerTrace = await opened.actorPage.evaluate((cardId) => {
        const card = document.querySelector(`[data-deck-card-id="${cardId}"]`);
        const trace = window.__stargazingInvalidDropPointerTrace ?? [];
        const pointerId = trace.findLast((event) => event.type === "pointerdown")?.pointerId;
        let hasPointerCapture = null;
        if (typeof pointerId === "number") {
          const face = card?.querySelector(".deck-reorder-card-face");
          hasPointerCapture = face?.hasPointerCapture(pointerId) ?? false;
        }
        return { trace, dragging: card?.getAttribute("data-dragging") ?? null, hasPointerCapture };
      }, attack.id);
      console.log("[Stargazing invalid-drop pointer diagnostic]", JSON.stringify(pointerTrace));
    }
    await expect(cardNode(opened.dialog, attack.id)).toHaveAttribute("data-dragging", "true");
    await opened.actorPage.mouse.move(2, 2, { steps: 6 });
    await opened.actorPage.mouse.up();
    expect(await orderIn(opened.dialog, "top")).toEqual(oldTop);
    await assertCardConservation(opened.dialog, opened.cards);

    // Explicitly losing pointer capture is also a cancellation, never a move.
    await attackFace.hover();
    const beforeLostCapture = await orderIn(opened.dialog, "top");
    const lostCaptureFaceBounds = await attackFace.boundingBox();
    expect(lostCaptureFaceBounds).toBeTruthy();
    const lostCaptureStart = {
      x: lostCaptureFaceBounds.x + lostCaptureFaceBounds.width / 2,
      y: lostCaptureFaceBounds.y + lostCaptureFaceBounds.height / 2,
    };
    await opened.actorPage.mouse.down();
    await opened.actorPage.mouse.move(lostCaptureStart.x + 9, lostCaptureStart.y + 2, { steps: 2 });
    await expect(cardNode(opened.dialog, attack.id)).toHaveAttribute("data-dragging", "true");
    const capturedPointerId = await opened.actorPage.evaluate(() => {
      const trace = window.__stargazingInvalidDropPointerTrace ?? [];
      return trace.findLast((event) => event.type === "pointerdown")?.pointerId;
    });
    expect(typeof capturedPointerId).toBe("number");
    const captureWasHeld = await opened.actorPage.evaluate(({ cardId, pointerId }) => {
      const face = document.querySelector(`[data-deck-card-id="${cardId}"] .deck-reorder-card-face`);
      return face?.hasPointerCapture(pointerId) ?? false;
    }, { cardId: attack.id, pointerId: capturedPointerId });
    expect(captureWasHeld).toBe(true);
    const lostCaptureCountBeforeRelease = await opened.actorPage.evaluate(({ pointerId }) =>
      (window.__stargazingInvalidDropPointerTrace ?? []).filter((event) => event.type === "lostpointercapture" && event.pointerId === pointerId).length,
    { pointerId: capturedPointerId });
    await opened.actorPage.evaluate(({ cardId, pointerId }) => {
      document.querySelector(`[data-deck-card-id="${cardId}"] .deck-reorder-card-face`).releasePointerCapture(pointerId);
    }, { cardId: attack.id, pointerId: capturedPointerId });
    await expect.poll(() => opened.actorPage.evaluate(({ pointerId, previousCount }) =>
      (window.__stargazingInvalidDropPointerTrace ?? []).filter((event) => event.type === "lostpointercapture" && event.pointerId === pointerId).length > previousCount,
    { pointerId: capturedPointerId, previousCount: lostCaptureCountBeforeRelease })).toBe(true);
    await expect(cardNode(opened.dialog, attack.id)).toHaveAttribute("data-dragging", "false");
    await opened.actorPage.mouse.up();
    expect(await orderIn(opened.dialog, "top")).toEqual(beforeLostCapture);
    await assertCardConservation(opened.dialog, opened.cards);

    // The compact per-card Move menu is the keyboard/screen-reader fallback,
    // including cross-zone reassignment, undo to center, and within-zone order.
    const dodgeMoveButton = cardNode(opened.dialog, dodge.id).getByRole("button", { name: "Move Dodge" });
    await dodgeMoveButton.press("Enter");
    await expect(opened.dialog.locator(`[data-deck-reorder-menu-for="${dodge.id}"]`)).toBeVisible();
    await opened.dialog.getByRole("button", { name: "Move Dodge to top of deck" }).press("Enter");
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, attack.id, dodge.id]);
    expect(await orderIn(opened.dialog, "bottom")).toEqual([duel.id]);
    await expect(opened.dialog.locator(".deck-reorder-live")).toHaveText("Dodge moved to Top of Deck, position 3.");
    await expect(dodgeMoveButton).toBeFocused();
    await cardNode(opened.dialog, dodge.id).getByRole("button", { name: "Move Dodge" }).click();
    await opened.dialog.getByRole("button", { name: "Return Dodge to revealed cards" }).click();
    expect(await orderIn(opened.dialog, "unassigned")).toEqual([dodge.id]);
    await cardNode(opened.dialog, peach.id).getByRole("button", { name: "Move Peach" }).click();
    await opened.dialog.getByRole("button", { name: "Move Peach later" }).click();
    expect(await orderIn(opened.dialog, "top")).toEqual([attack.id, peach.id]);
    await cardNode(opened.dialog, peach.id).getByRole("button", { name: "Move Peach" }).click();
    await opened.dialog.getByRole("button", { name: "Move Peach earlier" }).click();
    expect(await orderIn(opened.dialog, "top")).toEqual([peach.id, attack.id]);
    await cardNode(opened.dialog, dodge.id).getByRole("button", { name: "Move Dodge" }).click();
    await opened.dialog.getByRole("button", { name: "Move Dodge to bottom of deck" }).click();
    expect(await orderIn(opened.dialog, "bottom")).toEqual([duel.id, dodge.id]);
    await assertCardConservation(opened.dialog, opened.cards);
    const emptyRevealedBounds = await zone(opened.dialog, "unassigned").boundingBox();
    expect(emptyRevealedBounds).toBeTruthy();
    expect(emptyRevealedBounds.height).toBeLessThan(60);

    const arrangementScreenshot = testInfo.outputPath("stargazing-real-mixed-arrangement.png");
    await opened.actorPage.screenshot({ path: arrangementScreenshot, animations: "disabled" });
    await testInfo.attach("stargazing-real-mixed-arrangement", { path: arrangementScreenshot, contentType: "image/png" });
    await expect(opened.dialog.locator("[data-deck-reorder-progress]")).toHaveText("4 / 4 arranged");
    const submit = opened.dialog.locator("[data-deck-reorder-submit]");
    await expect(submit).toBeEnabled();
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
      bottomCardIds: [duel.id, dodge.id],
    });
    const drawn = await drawResponse;
    expect(drawn.ok()).toBeTruthy();
    const drawnBody = await drawn.json();
    expect(drawnBody.drawnCards.map((item) => item.id)).toEqual([peach.id, attack.id]);
    expect(drawnBody.room.myHand.map((item) => item.id)).toEqual([peach.id, attack.id]);
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
    expect(resumed.myHand.map((item) => item.id)).toEqual([peach.id, attack.id]);
    expect((await roomView(request, opened.seed, 1)).myHand.map((item) => item.id)).toEqual([peach.id, attack.id]);
    opened.actorPage.off("request", recordActorAction);
    await cdp.detach();
    await observerPage.close();
    await observerContext.close();
    await opened.actorPage.close();
    await opened.turnPage.close();
    await opened.turnContext.close();
  });
}
