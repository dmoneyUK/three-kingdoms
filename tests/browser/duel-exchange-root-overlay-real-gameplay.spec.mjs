import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const viewports = [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

function makeCards() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return {
    duel: { id: `duel-graph-root-${suffix}`, kind: "Duel", suit: "♠", rank: "A" },
    firstAttack: { id: `duel-graph-first-${suffix}`, kind: "Attack", suit: "♣", rank: "7" },
    secondAttack: { id: `duel-graph-second-${suffix}`, kind: "Attack", suit: "♦", rank: "8" },
  };
}

async function seedDuelGame(request, delegated = false) {
  const cards = makeCards();
  const players = delegated
    ? [
      { name: "CAO CAO", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [cards.duel] },
      { name: "GUAN YU", role: "Loyalist", hero: "guan-yu", hp: 4, maxHp: 4, hand: [cards.firstAttack] },
      { name: "LIU BEI", role: "Lord", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "SUN QUAN", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    ]
    : [
      { name: "SOURCE", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [cards.duel, cards.secondAttack] },
      { name: "TARGET", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [cards.firstAttack] },
      { name: "THIRD", role: "Lord", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
      { name: "FOURTH", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
    ];
  const response = await request.post(`${API}/__test/seed-playing-game`, { data: { phase: "play", turnSeat: 0, players } });
  if (!response.ok()) throw new Error(`seed Duel game failed: ${await response.text()}`);
  return { ...(await response.json()), cards };
}

async function openGame(page, seed, playerIndex, viewport) {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function roomView(request, seed, playerIndex) {
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${seed.players[playerIndex].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function isRoomAction(response, action) {
  if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
  try { return JSON.parse(response.request().postData() ?? "{}").action === action; }
  catch { return false; }
}

async function playDuel(page, cardId, targetName) {
  await page.locator(`[data-hand-card-id="${cardId}"] .game-card`).click();
  await page.getByRole("button", { name: `Select ${targetName}`, exact: true }).click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse((response) => isRoomAction(response, "play_card"));
  await confirm.click();
  const response = await submitted;
  if (!response.ok()) throw new Error(`Duel submission failed: ${await response.text()}`);
}

async function submitAttackResponse(page, cardId) {
  const card = page.locator(`[data-hand-card-id="${cardId}"] .game-card`);
  await expect(card).toBeEnabled({ timeout: 20_000 });
  await card.click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse((response) => isRoomAction(response, "respond"));
  await confirm.click();
  const response = await submitted;
  if (!response.ok()) throw new Error(`Attack response failed: ${await response.text()}`);
}

async function activateInfluencing(page) {
  const skill = page.locator('.local-player-dock[data-player-anchor] .local-hero-skills').getByRole("button", { name: "Influencing", exact: true });
  const duplicate = page.locator('.local-player-dock[data-player-anchor] [data-action-extras="true"]').getByRole("button", { name: /Influencing/ });
  await expect(skill).toBeVisible();
  await expect(skill).toBeEnabled({ timeout: 20_000 });
  await expect(duplicate).toHaveCount(0);
  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  await expect(duplicate).toHaveCount(0);
  const confirm = page.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse(async (response) => {
    if (!isRoomAction(response, "respond")) return false;
    try { return JSON.parse(response.request().postData() ?? "{}").providerId === "liu_bei_jijiang"; }
    catch { return false; }
  });
  await confirm.click();
  const response = await submitted;
  if (!response.ok()) throw new Error(`Influencing activation failed: ${await response.text()}`);
  await expect(duplicate).toHaveCount(0);
}

async function snapshotGeometry(page, playerIds) {
  return page.evaluate(({ ids }) => {
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
    };
    const anchor = (id) => [...document.querySelectorAll("[data-player-anchor]")].filter((element) => element.dataset.playerAnchor === id);
    return {
      root: rect(document.querySelector('[data-root-action-card="true"]')),
      response: rect(document.querySelector('[data-root-action-response-card="true"]')),
      table: rect(document.querySelector(".play-table")),
      dock: rect(document.querySelector(".local-player-dock")),
      anchors: Object.fromEntries(ids.map((id) => [id, anchor(id).map(rect)])),
      sourceTether: document.querySelector('[data-root-action-edge="response-source"]')?.dataset.responseActorId ?? null,
      targetArrow: document.querySelector('[data-root-action-edge="duel-response-target"]')?.dataset.responseTargetId ?? null,
      semanticSource: document.querySelector('[data-root-action-edge="duel-response-target"]')?.dataset.responseSemanticSourceId ?? null,
      arrowMarker: document.querySelector('[data-root-action-edge="duel-response-target"]')?.getAttribute("marker-end") ?? null,
      graphReady: document.querySelector('[data-root-action-overlay="true"]')?.dataset.rootActionReady ?? null,
      stageCount: document.querySelectorAll(".interaction-stage").length,
      viewportHeight: window.innerHeight,
      overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      rootContextEdgeCount: document.querySelectorAll('[data-root-action-edge="root-target-context"]').length,
      responseEventId: document.querySelector('[data-root-action-response-card="true"]')?.dataset.responseEventId ?? null,
      responseActorId: document.querySelector('[data-root-action-response-card="true"]')?.dataset.responseActorId ?? null,
      responseDecisionActorId: document.querySelector('[data-root-action-response-card="true"]')?.dataset.responseDecisionActorId ?? null,
      responseTargetId: document.querySelector('[data-root-action-response-card="true"]')?.dataset.responseTargetId ?? null,
    };
  }, { ids: playerIds });
}

async function assertResponseGeometry(page, { sourceId, targetId, decisionActorId, responseActorId, stableSeatIds = [] }) {
  const geometry = await snapshotGeometry(page, [sourceId, targetId, decisionActorId, responseActorId, ...stableSeatIds]);
  expect(geometry.graphReady).toBe("true");
  expect(geometry.response).not.toBeNull();
  expect(geometry.rootContextEdgeCount).toBe(1);
  expect(geometry.sourceTether).toBe(responseActorId);
  expect(geometry.targetArrow).toBe(targetId);
  expect(geometry.semanticSource).toBe(decisionActorId);
  expect(geometry.responseActorId).toBe(responseActorId);
  expect(geometry.responseDecisionActorId).toBe(decisionActorId);
  expect(geometry.responseTargetId).toBe(targetId);
  expect(geometry.arrowMarker).toContain("url(#");
  expect(geometry.stageCount).toBe(0);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.table.bottom).toBeLessThanOrEqual(geometry.dock.top + 1);
  expect(geometry.dock.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
  for (const anchors of Object.values(geometry.anchors)) expect(anchors).toHaveLength(1);
  for (const [index, box] of [geometry.root, geometry.response].entries()) {
    expect(box.left).toBeGreaterThanOrEqual(geometry.table.left - 1);
    expect(box.top).toBeGreaterThanOrEqual(geometry.table.top - 1);
    expect(box.right).toBeLessThanOrEqual(geometry.table.right + 1);
    expect(box.bottom).toBeLessThanOrEqual((index === 0 ? Math.max(geometry.table.bottom, geometry.dock.top) : geometry.table.bottom) + 1);
    const overlapsDock = box.left < geometry.dock.right && box.right > geometry.dock.left
      && box.top < geometry.dock.bottom && box.bottom > geometry.dock.top;
    expect(overlapsDock).toBe(false);
    for (const playerAnchors of Object.values(geometry.anchors)) {
      const anchor = playerAnchors[0];
      const overlapsPlayer = box.left < anchor.right && box.right > anchor.left
        && box.top < anchor.bottom && box.bottom > anchor.top;
      expect(overlapsPlayer).toBe(false);
    }
  }
  const responsePathGeometry = await page.evaluate(() => {
    const svg = document.querySelector(".interaction-root-connectors");
    const svgBounds = svg.getBoundingClientRect();
    const endpoints = (selector) => {
      const path = document.querySelector(selector);
      const length = path.getTotalLength();
      const first = path.getPointAtLength(0);
      const last = path.getPointAtLength(length);
      return [first, last].map(({ x, y }) => ({ x: x + svgBounds.left, y: y + svgBounds.top }));
    };
    const bounds = (selector) => {
      const rect = document.querySelector(selector).getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    };
    const distance = (point, rect) => Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom));
    const tether = endpoints('[data-root-action-edge="response-source"]');
    const arrow = endpoints('[data-root-action-edge="duel-response-target"]');
    const actor = bounds(`[data-player-anchor="${document.querySelector('[data-root-action-edge="response-source"]').dataset.responseActorId}"]`);
    const target = bounds(`[data-player-anchor="${document.querySelector('[data-root-action-edge="duel-response-target"]').dataset.responseTargetId}"]`);
    const card = bounds('[data-root-action-response-card="true"]');
    return {
      tetherTouchesActor: Math.min(...tether.map((point) => distance(point, actor))),
      tetherTouchesCard: Math.min(...tether.map((point) => distance(point, card))),
      arrowTouchesTarget: Math.min(...arrow.map((point) => distance(point, target))),
      arrowTouchesCard: Math.min(...arrow.map((point) => distance(point, card))),
    };
  });
  expect(responsePathGeometry.tetherTouchesActor).toBeLessThan(3);
  expect(responsePathGeometry.tetherTouchesCard).toBeLessThan(3);
  expect(responsePathGeometry.arrowTouchesTarget).toBeLessThan(3);
  expect(responsePathGeometry.arrowTouchesCard).toBeLessThan(3);
  return geometry;
}

for (const viewport of viewports) {
  test(`real physical Duel graph keeps one stable root and only its latest Attack at ${viewport.width}×${viewport.height}`, async ({ page, browser, request }) => {
    test.setTimeout(90_000);
    const seed = await seedDuelGame(request);
    const [sourceId, targetId] = seed.players.slice(0, 2).map((player) => player.id);
    const targetPage = await browser.newPage({ viewport });
    try {
      await openGame(page, seed, 0, viewport);
      await playDuel(page, seed.cards.duel.id, "TARGET");

      const opened = await roomView(request, seed, 0);
      expect(opened.presentationSnapshot.duelExchange).toMatchObject({
        semantics: "PROVEN", responseCount: 0,
        root: { sourceId, targetId, cardKind: "Duel" }, responses: [],
      });
      const overlay = page.locator('[data-root-action-overlay="true"]');
      await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
      await expect(page.locator('[data-root-action-card="true"]')).toHaveAttribute("data-root-action-card-kind", "Duel");
      await expect(page.locator('[data-root-action-card="true"]')).toHaveAttribute("aria-label", "SOURCE played Duel targeting TARGET");
      await expect(page.locator('[data-root-action-card="true"]')).toHaveCount(1);
      await expect(page.locator('[data-root-action-edge="source"]')).toHaveCount(1);
      await expect(page.locator('[data-root-action-edge="target"]')).toHaveCount(1);
      await expect(page.locator('[data-root-action-response-card="true"]')).toHaveCount(0);
      await expect(page.locator('[data-root-action-edge="duel-response-target"]')).toHaveCount(0);
      await expect(page.locator('.table-resolution-layer .table-played-card')).toHaveCount(0);
      await expect(page.locator(".interaction-stage")).toHaveCount(0);
      const stableSeatIds = seed.players.slice(1).map((player) => player.id);
      const firstRootGeometry = await snapshotGeometry(page, [sourceId, ...stableSeatIds]);
      expect(firstRootGeometry.root).not.toBeNull();
      expect(firstRootGeometry.response).toBeNull();
      expect(firstRootGeometry.stageCount).toBe(0);
      const publicView = await roomView(request, seed, 0);
      expect(publicView.currentAction.actorId).toBe(targetId);
      expect(publicView.currentAction.options).toBeUndefined();

      await openGame(targetPage, seed, 1, viewport);
      await submitAttackResponse(targetPage, seed.cards.firstAttack.id);
      await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot.duelExchange?.responseCount ?? 0, { timeout: 20_000 }).toBe(1);
      const firstProof = (await roomView(request, seed, 0)).presentationSnapshot.duelExchange;
      const firstResponse = firstProof.responses[0];
      const firstCard = page.locator('[data-root-action-response-card="true"]');
      await expect(firstCard).toHaveCount(1);
      await expect(firstCard).toHaveAttribute("data-response-event-id", firstResponse.responseEventId);
      await expect(firstCard).toHaveAttribute("aria-label", "TARGET played Attack targeting SOURCE in SOURCE's Duel against TARGET");
      const firstGeometry = await assertResponseGeometry(page, {
        sourceId, targetId: sourceId, decisionActorId: targetId, responseActorId: targetId, stableSeatIds,
      });
      expect(Math.abs(firstGeometry.root.left - firstRootGeometry.root.left)).toBeLessThan(1);
      expect(Math.abs(firstGeometry.root.top - firstRootGeometry.root.top)).toBeLessThan(8);
      for (const seatId of stableSeatIds) expect(firstGeometry.anchors[seatId]).toEqual(firstRootGeometry.anchors[seatId]);
      expect(firstGeometry.dock.bottom).toBeLessThanOrEqual(viewport.height + 1);
      await expect(page.locator('.table-resolution-layer .table-played-card')).toHaveCount(0);

      await submitAttackResponse(page, seed.cards.secondAttack.id);
      await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot.duelExchange?.responseCount ?? 0, { timeout: 20_000 }).toBe(2);
      const secondProof = (await roomView(request, seed, 0)).presentationSnapshot.duelExchange;
      const secondResponse = secondProof.responses[1];
      await expect(page.locator('[data-root-action-response-card="true"]')).toHaveCount(1);
      await expect(page.locator('[data-root-action-response-card="true"]')).toHaveAttribute("data-response-event-id", secondResponse.responseEventId);
      await expect(page.locator('[data-root-action-response-card="true"]')).toHaveAttribute("aria-label", "SOURCE played Attack targeting TARGET in SOURCE's Duel against TARGET");
      const secondGeometry = await assertResponseGeometry(page, {
        sourceId, targetId, decisionActorId: sourceId, responseActorId: sourceId, stableSeatIds,
      });
      expect(Math.abs(secondGeometry.root.left - firstRootGeometry.root.left)).toBeLessThan(1);
      expect(Math.abs(secondGeometry.root.top - firstRootGeometry.root.top)).toBeLessThan(8);
      expect(secondGeometry.responseEventId).toBe(secondResponse.responseEventId);
      for (const seatId of stableSeatIds) expect(secondGeometry.anchors[seatId]).toEqual(firstRootGeometry.anchors[seatId]);
      expect(secondGeometry.dock.bottom).toBeLessThanOrEqual(viewport.height + 1);
      expect(secondGeometry.overflow).toBeLessThanOrEqual(1);
      await expect(page.locator('.table-resolution-layer .table-played-card')).toHaveCount(0);
    } finally {
      await targetPage.close();
    }
  });
}

for (const viewport of [viewports[0], viewports[2]]) {
  test(`real delegated Liu Bei Duel response distinguishes decision actor and card submitter at ${viewport.width}px`, async ({ page, browser, request }) => {
    test.setTimeout(90_000);
    const seed = await seedDuelGame(request, true);
    const sourceId = seed.players[0].id;
    const responseActorId = seed.players[1].id;
    const decisionActorId = seed.players[2].id;
    const sourcePage = page;
    const delegatePage = await browser.newPage({ viewport });
    const decisionPage = await browser.newPage({ viewport });
    try {
      await openGame(sourcePage, seed, 0, viewport);
      await playDuel(sourcePage, seed.cards.duel.id, "LIU BEI");
      await expect(sourcePage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
      const stableSeatIds = seed.players.slice(1).map((player) => player.id);
      const before = await snapshotGeometry(sourcePage, [sourceId, ...stableSeatIds]);
      expect(before.response).toBeNull();

      await openGame(decisionPage, seed, 2, viewport);
      await openGame(delegatePage, seed, 1, viewport);
      const liuView = await roomView(request, seed, 2);
      expect(liuView.currentAction.actorId).toBe(decisionActorId);
      expect(liuView.currentAction.options.some((option) => option.providerId === "liu_bei_jijiang")).toBe(true);
      const observerView = await roomView(request, seed, 0);
      expect(observerView.currentAction.options).toBeUndefined();
      await activateInfluencing(decisionPage);
      await expect.poll(async () => (await roomView(request, seed, 1)).currentAction?.actorId ?? null, { timeout: 20_000 }).toBe(responseActorId);
      const delegatedView = await roomView(request, seed, 1);
      expect(delegatedView.currentAction.options.some((option) => option.providerId === "card" && option.selection?.eligibleCardIds?.includes(seed.cards.firstAttack.id))).toBe(true);

      await delegatePage.reload();
      await expect(delegatePage.locator(`[data-hand-card-id="${seed.cards.firstAttack.id}"] .game-card`)).toBeEnabled({ timeout: 20_000 });
      await submitAttackResponse(delegatePage, seed.cards.firstAttack.id);
      await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot.duelExchange?.responseCount ?? 0, { timeout: 20_000 }).toBe(1);
      const proof = (await roomView(request, seed, 0)).presentationSnapshot.duelExchange;
      const response = proof.responses[0];
      expect(response).toMatchObject({
        sourceId: decisionActorId, decisionActorId, targetId: sourceId, responseActorId,
        responseCardKind: "Attack", ordinal: 1,
      });
      const responseCard = sourcePage.locator('[data-root-action-response-card="true"]');
      await expect(responseCard).toHaveCount(1);
      await expect(responseCard).toHaveAttribute("data-response-event-id", response.responseEventId);
      await expect(responseCard).toHaveAttribute("aria-label", "GUAN YU provided Attack for LIU BEI, targeting CAO CAO, in CAO CAO's Duel against LIU BEI");
      const after = await assertResponseGeometry(sourcePage, { sourceId, targetId: sourceId, decisionActorId, responseActorId, stableSeatIds });
      expect(after.sourceTether).toBe(responseActorId);
      expect(after.semanticSource).toBe(decisionActorId);
      expect(Math.abs(after.root.left - before.root.left)).toBeLessThan(1);
      expect(Math.abs(after.root.top - before.root.top)).toBeLessThan(8);
      for (const seatId of stableSeatIds) expect(after.anchors[seatId]).toEqual(before.anchors[seatId]);
      expect(after.dock.bottom).toBeLessThanOrEqual(viewport.height + 1);
      expect(after.overflow).toBeLessThanOrEqual(1);
      await expect(sourcePage.locator('.table-resolution-layer .table-played-card')).toHaveCount(0);
    } finally {
      await delegatePage.close();
      await decisionPage.close();
    }
  });
}
