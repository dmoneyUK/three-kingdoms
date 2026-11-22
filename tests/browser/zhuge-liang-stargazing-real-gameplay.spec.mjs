import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit, rank) => ({ kind, id, suit, rank });
const revealedCards = [
  card("Attack", "real-stargazing-attack", "♠", "A"),
  card("Dodge", "real-stargazing-dodge", "♣", "2"),
  card("Peach", "real-stargazing-peach", "♥", "Q"),
  card("Duel", "real-stargazing-duel", "♦", "K"),
];
let nextTouchIdentifier = 0;
test.use({ hasTouch: true });

async function seedStargazingRoom(request) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "TURN PLAYER", role: "Lord", hero: "guan-yu", hp: 4, maxHp: 4, hand: [] },
        { name: "ZHU GE LIANG", role: "Loyalist", hero: "zhuge-liang", hp: 3, maxHp: 3, hand: [card("Peach", "real-stargazing-private-peach", "♥", "7")] },
        { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH", role: "Renegade", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
      ],
      deck: [...revealedCards, card("Negation", "real-stargazing-next-a", "♠", "5"), card("Attack", "real-stargazing-next-b", "♥", "8")],
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

async function openRealStargazingDecision({ page, request, browser, viewport }) {
  const seed = await seedStargazingRoom(request);
  const turnContext = await browser.newContext({ viewport, hasTouch: true });
  const turnPage = await turnContext.newPage();
  const turnPlayer = await openPlayer(turnPage, seed, 0, viewport);
  const turnDock = turnPage.locator(`.local-player-dock[data-player-anchor="${turnPlayer.id}"]`);
  const turn = await roomView(request, seed, 0);
  expect(turn.isMyAction).toBe(true);
  expect(turn.currentAction.legalActions).toContain("end_turn");
  const endTurnResponse = postedAction(turnPage, "end_turn");
  await turnDock.getByRole("button", { name: "End", exact: true }).click();
  const endTurnConfirmation = turnPage.getByRole("dialog", { name: "End your Play Phase?" });
  await expect(endTurnConfirmation).toBeVisible();
  await endTurnConfirmation.getByRole("button", { name: "Confirm End", exact: true }).click();
  expect((await endTurnResponse).ok()).toBe(true);

  const actorPage = page;
  const actor = await openPlayer(actorPage, seed, 1, viewport);
  const offered = await roomView(request, seed, 1);
  expect(offered.isMyAction).toBe(true);
  expect(offered.currentAction).toMatchObject({ kind: "trigger", actorId: actor.id });
  expect(offered.currentAction.triggerOptions.map((option) => option.effectId)).toContain("zhuge_liang_stargazing");
  const actorDock = actorPage.locator(`.local-player-dock[data-player-anchor="${actor.id}"]`);
  const stargazing = actorDock.locator(".local-hero-skills").getByRole("button", { name: "Stargazing", exact: true });
  await expect(stargazing).toBeEnabled();
  const triggerResponse = postedAction(actorPage, "trigger");
  await stargazing.click();
  expect((await triggerResponse).ok()).toBe(true);

  const actorView = await roomView(request, seed, 1);
  expect(actorView.isMyAction).toBe(true);
  expect(actorView.currentAction).toMatchObject({ kind: "deck_reorder", actorId: actor.id });
  expect(actorView.currentAction.deckReorder.cards.map((item) => item.id)).toEqual(revealedCards.map((item) => item.id));
  const dialog = actorPage.getByRole("dialog", { name: "Stargazing deck reorder" });
  await expect(dialog).toBeVisible();
  await expect(dialog).toHaveAttribute("aria-modal", "false");
  return { seed, turnContext, turnPage, actorPage, actor, actorDock, actorView, dialog, cards: revealedCards };
}

const zone = (dialog, name) => dialog.locator(`[data-deck-zone="${name}"]`);
const cardNode = (dialog, id) => dialog.locator(`[data-deck-card-id="${id}"]`);
const cardControl = (dialog, id) => cardNode(dialog, id).locator("[data-deck-card-control]");

async function orderIn(dialog, zoneName) {
  return zone(dialog, zoneName).locator("[data-deck-card-id]").evaluateAll((items) => items.map((item) => item.dataset.deckCardId));
}

async function assertCardConservation(dialog, cards) {
  const ids = await dialog.locator("[data-deck-card-id]").evaluateAll((items) => items.map((item) => item.dataset.deckCardId));
  expect(ids).toHaveLength(cards.length);
  expect(new Set(ids).size).toBe(cards.length);
  expect([...ids].sort()).toEqual(cards.map((item) => item.id).sort());
}

async function insertionPoint(dialog, zoneName, index, movingId) {
  return zone(dialog, zoneName).locator("[data-deck-zone-items]").evaluate((row, { index, movingId }) => {
    const cards = [...row.querySelectorAll("[data-deck-card-id]")].filter((item) => item.dataset.deckCardId !== movingId);
    const rowBounds = row.getBoundingClientRect();
    const y = rowBounds.top + rowBounds.height / 2;
    if (!cards.length) return { x: rowBounds.left + rowBounds.width / 2, y };
    if (index >= cards.length) return { x: cards.at(-1).getBoundingClientRect().right - 2, y };
    return { x: cards[index].getBoundingClientRect().left + 2, y };
  }, { index, movingId });
}

async function touchDrag({ page, cdp, dialog, cardId, zoneName, index }) {
  const face = cardNode(dialog, cardId).locator(".deck-reorder-card-face");
  await face.scrollIntoViewIfNeeded();
  const bounds = await face.boundingBox();
  expect(bounds).toBeTruthy();
  const touchId = nextTouchIdentifier++;
  const start = { x: Math.round(bounds.x + bounds.width * 0.42), y: Math.round(bounds.y + bounds.height * 0.58) };
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ ...start, id: touchId }] });
  await expect(cardNode(dialog, cardId)).toHaveAttribute("data-dragging", "true");
  await expect(page.locator(`.deck-reorder-overlay [data-deck-drag-preview="${cardId}"]`)).toBeVisible();
  const target = await insertionPoint(dialog, zoneName, index, cardId);
  for (let step = 1; step <= 8; step += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: Math.round(start.x + ((target.x - start.x) * step) / 8), y: Math.round(start.y + ((target.y - start.y) * step) / 8), id: touchId }],
    });
  }
  await expect(zone(dialog, zoneName)).toHaveAttribute("data-drop-active", "true");
  await expect(dialog.locator('[data-deck-insertion-indicator="true"]')).toHaveAttribute("data-insertion-index", String(index));
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect(cardNode(dialog, cardId)).toHaveAttribute("data-deck-zone-name", zoneName);
}

async function assertCompactGeometry({ dialog, cards }) {
  const geometry = await dialog.evaluate((panel) => {
    const panelBox = panel.getBoundingClientRect();
    const table = panel.closest(".play-table");
    const tableBox = table.getBoundingClientRect();
    const sequences = panel.querySelector(".deck-reorder-sequences");
    const readZone = (name) => {
      const root = panel.querySelector(`[data-deck-zone="${name}"]`);
      const row = root.querySelector("[data-deck-zone-items]");
      const frame = root.getBoundingClientRect();
      const label = root.querySelector("[data-deck-zone-label]").getBoundingClientRect();
      return { top: frame.top, bottom: frame.bottom, height: frame.height, width: row.clientWidth, scrollWidth: row.scrollWidth, labelTop: label.top, labelBottom: label.bottom };
    };
    const cards = [...panel.querySelectorAll('[data-deck-zone="top"] [data-deck-card-id]')].map((item) => {
      const face = item.querySelector(".played-card");
      const bounds = face.getBoundingClientRect();
      const style = getComputedStyle(face);
      return {
        id: item.dataset.deckCardId, width: bounds.width, height: bounds.height,
        name: face.querySelector(".card-name-mark")?.textContent?.trim(),
        rankSuit: face.querySelector("i")?.textContent?.replaceAll("\\n", "").replaceAll(" ", ""),
        opacity: Number(style.opacity), animation: style.animationName,
      };
    });
    const confirm = panel.querySelector("[data-deck-reorder-submit]").getBoundingClientRect();
    return {
      panel: { left: panelBox.left, top: panelBox.top, right: panelBox.right, bottom: panelBox.bottom, height: panelBox.height, clientHeight: panel.clientHeight, scrollHeight: panel.scrollHeight },
      table: { left: tableBox.left, top: tableBox.top, right: tableBox.right, bottom: tableBox.bottom },
      top: readZone("top"), bottom: readZone("bottom"), cards,
      sequences: { clientHeight: sequences.clientHeight, scrollHeight: sequences.scrollHeight },
      confirm: { left: confirm.left, top: confirm.top, right: confirm.right, bottom: confirm.bottom, height: confirm.height },
      viewport: { width: innerWidth, height: innerHeight, pageWidth: document.documentElement.scrollWidth, scrollY },
    };
  });
  const viewport = geometry.viewport;
  expect(geometry.table.left).toBeLessThanOrEqual(geometry.panel.left);
  expect(geometry.table.right).toBeGreaterThanOrEqual(geometry.panel.right);
  expect(geometry.table.top).toBeLessThanOrEqual(geometry.panel.top);
  expect(geometry.table.bottom).toBeGreaterThanOrEqual(geometry.panel.bottom);
  expect(geometry.panel.left).toBeGreaterThanOrEqual(0);
  expect(geometry.panel.right).toBeLessThanOrEqual(viewport.width);
  expect(geometry.panel.bottom).toBeLessThanOrEqual(viewport.height);
  expect(geometry.panel.scrollHeight).toBeLessThanOrEqual(geometry.panel.clientHeight + 1);
  expect(geometry.sequences.scrollHeight).toBeLessThanOrEqual(geometry.sequences.clientHeight + 1);
  expect(geometry.top.scrollWidth).toBeLessThanOrEqual(geometry.top.width + 1);
  expect(geometry.top.height).toBeGreaterThanOrEqual(100);
  expect(geometry.bottom.height).toBeGreaterThanOrEqual(90);
  expect(geometry.top.labelTop).toBeGreaterThanOrEqual(geometry.top.bottom - 22);
  expect(geometry.bottom.labelTop).toBeGreaterThanOrEqual(geometry.bottom.bottom - 22);
  expect(geometry.top.labelBottom).toBeLessThanOrEqual(geometry.top.bottom + 1);
  expect(geometry.bottom.labelBottom).toBeLessThanOrEqual(geometry.bottom.bottom + 1);
  expect(geometry.cards.map((item) => item.id)).toEqual(cards.map((item) => item.id));
  expect(geometry.cards.every((item) => item.width >= 66 && item.width <= 76 && item.height >= 92 && item.height <= 107)).toBe(true);
  expect(geometry.cards.every((item) => item.opacity === 1 && item.animation === "none")).toBe(true);
  expect(geometry.cards.map((item) => [item.name, item.rankSuit])).toEqual(cards.map((item) => [item.kind, `${item.rank}${item.suit}`]));
  expect(geometry.confirm.height).toBeGreaterThanOrEqual(44);
  expect(geometry.confirm.bottom).toBeLessThanOrEqual(viewport.height);
  expect(geometry.viewport.pageWidth).toBeLessThanOrEqual(viewport.width);
  expect(geometry.viewport.scrollY).toBe(0);
  await expect(dialog.locator("[data-deck-zone]")).toHaveCount(2);
  await expect(dialog.locator("[data-deck-card-control]")).toHaveCount(cards.length);
  await expect(dialog.locator('[data-deck-reorder-submit]')).toHaveCount(1);
  await expect(dialog.getByRole("button", { name: "CONFIRM", exact: true })).toBeEnabled();
  await expect(dialog.locator(".deck-reorder-menu-toggle, .deck-reorder-card-actions, [data-deck-reorder-progress]")).toHaveCount(0);
  await assertCardConservation(dialog, cards);
}

test("Stargazing uses two compact private zones, supports touch and keyboard moves, and confirms once", async ({ page, request, browser }) => {
  const viewport = { width: 440, height: 894 };
  const opened = await openRealStargazingDecision({ page, request, browser, viewport });
  const { dialog, cards, actorPage, actorView } = opened;
  const [attack, dodge, peach, duel] = cards;
  await expect(dialog.locator("header strong")).toHaveText("STARGAZING");
  await expect(dialog.locator("header span")).toHaveText("Hold and drag cards to change position.");
  const accessibleInstructions = dialog.locator("#stargazing-deck-accessible-instructions");
  await expect(accessibleInstructions).toHaveClass(/deck-reorder-sr-only/);
  await expect(accessibleInstructions).toContainText("Left or Right");
  expect(await accessibleInstructions.evaluate((element) => getComputedStyle(element).clip)).toBe("rect(0px, 0px, 0px, 0px)");
  await expect(zone(dialog, "top")).toHaveAttribute("data-card-count", "4");
  await expect(zone(dialog, "bottom")).toHaveAttribute("data-card-count", "0");
  await expect(zone(dialog, "unassigned")).toHaveCount(0);
  await expect(await orderIn(dialog, "top")).toEqual(cards.map((item) => item.id));
  await assertCompactGeometry({ dialog, cards });

  const observer = await roomView(request, opened.seed, 2);
  expect(observer.currentAction.kind).toBe("deck_reorder");
  expect(observer.currentAction.deckReorder).toBeUndefined();
  const observerJson = JSON.stringify(observer);
  const observerContext = await browser.newContext({ viewport, hasTouch: true });
  const observerPage = await observerContext.newPage();
  await openPlayer(observerPage, opened.seed, 2, viewport);
  await expect(observerPage.getByRole("dialog", { name: "Stargazing deck reorder" })).toHaveCount(0);
  const observerMarkup = await observerPage.locator("body").innerHTML();
  for (const item of cards) {
    expect(observerJson).not.toContain(item.id);
    expect(observerMarkup).not.toContain(item.id);
  }
  await expect(opened.turnPage.getByRole("dialog", { name: "Stargazing deck reorder" })).toHaveCount(0);

  const actorActions = [];
  const recordActorAction = (requestEvent) => {
    if (requestEvent.url() !== `${API}/api/rooms` || requestEvent.method() !== "POST") return;
    try { actorActions.push(JSON.parse(requestEvent.postData() ?? "{}").action); }
    catch { actorActions.push("invalid-request"); }
  };
  actorPage.on("request", recordActorAction);
  await cardControl(dialog, dodge.id).focus();
  await expect(cardControl(dialog, dodge.id)).toBeFocused();
  await cardControl(dialog, dodge.id).press("ArrowRight");
  await expect(dialog.locator(".deck-reorder-live")).toHaveText("Dodge moved to Top of Deck, position 3.");
  await expect(cardControl(dialog, dodge.id)).toBeFocused();
  expect(await orderIn(dialog, "top")).toEqual([attack.id, peach.id, dodge.id, duel.id]);

  const cdp = await actorPage.context().newCDPSession(actorPage);
  await touchDrag({ page: actorPage, cdp, dialog, cardId: attack.id, zoneName: "bottom", index: 0 });
  expect(await orderIn(dialog, "top")).toEqual([peach.id, dodge.id, duel.id]);
  expect(await orderIn(dialog, "bottom")).toEqual([attack.id]);
  await cardControl(dialog, attack.id).press("ArrowUp");
  expect(await orderIn(dialog, "top")).toEqual([attack.id, peach.id, dodge.id, duel.id]);
  expect(await orderIn(dialog, "bottom")).toEqual([]);
  await cardControl(dialog, attack.id).press("ArrowDown");
  expect(await orderIn(dialog, "top")).toEqual([peach.id, dodge.id, duel.id]);
  expect(await orderIn(dialog, "bottom")).toEqual([attack.id]);
  await assertCardConservation(dialog, cards);
  expect(actorActions).toEqual([], "dragging and keyboard edits remain a private local draft");

  const constraints = actorView.currentAction.deckReorder;
  expect(constraints).toMatchObject({ minTop: 0, maxTop: cards.length });
  const revision = actorView.actionRevision;
  const completionResponse = postedAction(actorPage, "trigger");
  await dialog.getByRole("button", { name: "CONFIRM", exact: true }).click();
  const completed = await completionResponse;
  expect(completed.ok()).toBe(true);
  const payload = JSON.parse(completed.request().postData() ?? "{}");
  expect(payload).toMatchObject({
    action: "trigger",
    code: opened.seed.code,
    token: opened.actor.token,
    providerId: "private_deck_reorder",
    topCardIds: [peach.id, dodge.id, duel.id],
    bottomCardIds: [attack.id],
  });
  expect(payload.context?.actionRevision).toBe(revision);
  expect(actorActions.filter((action) => action === "trigger")).toHaveLength(1);
  const staleReplay = await request.post(`${API}/api/rooms`, { data: payload });
  expect(staleReplay.status()).toBe(409);
  expect((await staleReplay.json()).stale).toBe(true);
  await expect(dialog).toHaveCount(0);

  actorPage.off("request", recordActorAction);
  await cdp.detach();
  await observerPage.close();
  await observerContext.close();
  await actorPage.close();
  await opened.turnPage.close();
  await opened.turnContext.close();
});
