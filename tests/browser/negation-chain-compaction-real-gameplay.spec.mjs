import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const viewports = [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];
const card = (kind, id) => ({ id, kind, suit: "♠", rank: "7" });

async function seedSingleTargetGame(request) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const root = card("Dismantle", `long-negation-root-${suffix}`);
  const negations = Array.from({ length: 6 }, (_, index) => card("Negation", `long-negation-${index}-${suffix}`));
  const players = [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [root, negations[0]] },
    { name: "TARGET", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [negations[1]] },
    { name: "THIRD", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [negations[2]] },
    { name: "FOURTH", role: "Rebel", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [negations[3]] },
    { name: "FIFTH", role: "Rebel", hero: "huang-gai", hp: 4, maxHp: 4, hand: [negations[4]] },
    { name: "SIXTH", role: "Renegade", hero: "lü-meng", hp: 4, maxHp: 4, hand: [negations[5]] },
  ];
  const response = await request.post(`${API}/__test/seed-playing-game`, { data: { phase: "play", turnSeat: 0, players } });
  if (!response.ok()) throw new Error(`single-target seed failed: ${await response.text()}`);
  return { ...(await response.json()), root, negations };
}

async function seedGroupGame(request, cardKind) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const root = card(cardKind, `long-group-root-${suffix}`);
  const negations = Array.from({ length: 6 }, (_, index) => card("Negation", `long-group-negation-${index}-${suffix}`));
  const players = [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [root, negations[0], negations[3]] },
    { name: "FIRST", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [card("Peach", `long-group-hidden-a-${suffix}`), negations[1], negations[4]] },
    { name: "SECOND", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [card("Peach", `long-group-hidden-b-${suffix}`), negations[2], negations[5]] },
    { name: "THIRD", role: "Rebel", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Rebel", hero: "huang-gai", hp: 4, maxHp: 4, hand: [] },
    { name: "FIFTH", role: "Renegade", hero: "lü-meng", hp: 4, maxHp: 4, hand: [] },
  ];
  const response = await request.post(`${API}/__test/seed-playing-game`, { data: { phase: "play", turnSeat: 0, players } });
  if (!response.ok()) throw new Error(`Group seed failed: ${await response.text()}`);
  return { ...(await response.json()), root, negations };
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
  const member = seed.players[playerIndex];
  const response = await request.get(`${API}/api/rooms?${new URLSearchParams({ code: seed.code, token: member.token })}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function activeNegationActor(request, seed) {
  const views = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
  const playerIndex = views.findIndex((view) => view.isMyAction && view.currentAction?.kind === "response"
    && view.currentAction.requirement === "negate");
  return playerIndex < 0 ? null : { playerIndex, view: views[playerIndex] };
}

async function waitForNegationActor(request, seed, playerIndex, expectedDepth) {
  await expect.poll(async () => {
    const active = await activeNegationActor(request, seed);
    const observer = await roomView(request, seed, seed.players.length - 1);
    return active?.playerIndex === playerIndex
      && observer.presentationV2?.reactionChain?.nodes?.length === expectedDepth;
  }, { timeout: 20_000 }).toBe(true);
  const active = await activeNegationActor(request, seed);
  expect(active?.playerIndex).toBe(playerIndex);
  return active.view;
}

async function playDismantle(page, root, target) {
  await page.locator(`[data-hand-card-id="${root.id}"] .game-card`).click();
  await page.getByRole("button", { name: `Select ${target.name}`, exact: true }).click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && JSON.parse(response.request().postData() ?? "{}").action === "play_card");
  await confirm.click();
  expect((await submitted).ok()).toBeTruthy();
}

async function playGroupCard(page, root) {
  await page.locator(`[data-hand-card-id="${root.id}"] .game-card`).click();
  const play = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(play).toHaveText("Play");
  await expect(play).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && JSON.parse(response.request().postData() ?? "{}").action === "play_card");
  await play.click();
  expect((await submitted).ok()).toBeTruthy();
}

async function respondWithNegation(page, request, seed, playerIndex, cardId) {
  const playerId = seed.players[playerIndex].id;
  const dock = page.locator(`.local-player-dock[data-player-anchor="${playerId}"]`);
  const guidance = dock.locator(".console-guidance .decision-status");
  const selectable = dock.locator(`[data-hand-card-id="${cardId}"] .game-card`);
  await expect(guidance.locator("strong")).toHaveText("Play Negation or Skip.");
  await expect(guidance).toHaveAttribute("data-console-selection-count", "0");
  const currentView = await roomView(request, seed, playerIndex);
  expect(currentView.isMyAction).toBe(true);
  expect(currentView.currentAction.legalActions).toContain("respond");
  expect(currentView.currentAction.options.some((option) => option.providerId === "negation_card"
    && option.selection?.eligibleCardIds?.includes(cardId))).toBe(true);
  await expect(selectable).toBeEnabled();
  await selectable.click();
  await expect(selectable).toHaveClass(/selected/);
  await expect(guidance).toHaveAttribute("data-console-selection-count", "1");
  await expect(guidance).toHaveAttribute("data-console-primary-enabled", "true", { timeout: 15_000 });
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled({ timeout: 15_000 });
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && JSON.parse(response.request().postData() ?? "{}").action === "respond");
  await confirm.click();
  const response = await submitted;
  if (!response.ok()) throw new Error(`Negation response failed: ${await response.text()}`);
  return JSON.parse(response.request().postData() ?? "{}");
}

async function measureCompactedGraph(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const point = (path, atEnd) => {
      if (!path) return null;
      const length = path.getTotalLength();
      const local = path.getPointAtLength(atEnd ? length : 0);
      const svgPoint = path.ownerSVGElement.createSVGPoint();
      svgPoint.x = local.x;
      svgPoint.y = local.y;
      const matrix = path.getScreenCTM();
      const screen = matrix ? svgPoint.matrixTransform(matrix) : null;
      return screen ? { x: screen.x, y: screen.y } : null;
    };
    const inside = (child, parent) => Boolean(child && parent && child.left >= parent.left - .5
      && child.top >= parent.top - .5 && child.right <= parent.right + .5 && child.bottom <= parent.bottom + .5);
    const overlaps = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const borderPoint = (p, box) => Boolean(p && box && p.x >= box.left - 2 && p.x <= box.right + 2
      && p.y >= box.top - 2 && p.y <= box.bottom + 2
      && (Math.abs(p.x - box.left) <= 2 || Math.abs(p.x - box.right) <= 2
        || Math.abs(p.y - box.top) <= 2 || Math.abs(p.y - box.bottom) <= 2));
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    const table = rect(document.querySelector(".play-table"));
    const dock = rect(document.querySelector(".local-player-dock"));
    const rootNode = document.querySelector('[data-root-action-card="true"]');
    const historyNode = document.querySelector('[data-root-action-response-history="true"]');
    const responseNode = document.querySelector('[data-root-action-response-node="true"]');
    const root = rect(rootNode);
    const history = rect(historyNode);
    const response = rect(responseNode);
    const actorId = responseNode?.getAttribute("data-response-actor-id");
    const actorNode = [...document.querySelectorAll("[data-player-anchor]")].find((node) => node.getAttribute("data-player-anchor") === actorId);
    const actor = rect(actorNode);
    const anchors = [...document.querySelectorAll("[data-player-anchor]")].map(rect);
    const sourceTether = document.querySelector('.interaction-root-connectors [data-root-action-edge="response-source"]');
    const counterEdge = document.querySelector('.interaction-root-connectors [data-root-action-edge="negation-counters-history"]');
    const rootToHistoryGapX = Math.max(0, root.left - history.right, history.left - root.right);
    const rootToHistoryGapY = Math.max(0, root.top - history.bottom, history.top - root.bottom);
    return {
      ready: overlay?.getAttribute("data-root-action-ready"),
      rawResponseCount: overlay?.getAttribute("data-root-action-response-count"),
      visibleResponseCount: overlay?.getAttribute("data-root-action-visible-response-count"),
      collapsedResponseCount: overlay?.getAttribute("data-root-action-collapsed-response-count"),
      rootEffectState: overlay?.getAttribute("data-root-effect-state"),
      groupEffectState: overlay?.getAttribute("data-group-target-effect-state"),
      groupEffectTargetId: overlay?.getAttribute("data-group-target-effect-player-id"),
      root, history, response, actor, table, dock, anchors,
      responseActorId: actorId,
      responseOriginalIndex: responseNode?.getAttribute("data-response-original-index"),
      responseRelation: responseNode?.getAttribute("data-response-relation"),
      historyCount: historyNode?.getAttribute("data-collapsed-response-count"),
      historyLabel: historyNode?.getAttribute("aria-label"),
      sourceStart: point(sourceTether, false),
      sourceEnd: point(sourceTether, true),
      counterStart: point(counterEdge, false),
      counterEnd: point(counterEdge, true),
      sourceTetherCount: document.querySelectorAll('.interaction-root-connectors [data-root-action-edge="response-source"]').length,
      historyCounterCount: document.querySelectorAll('.interaction-root-connectors [data-root-action-edge="negation-counters-history"]').length,
      blockedRootMarks: document.querySelectorAll('[data-root-action-root-blocked="true"]').length,
      blockedGroupMarks: document.querySelectorAll('[data-root-action-group-effect-blocked="true"]').length,
      summaryTouchesRoot: rootToHistoryGapX === 0 && rootToHistoryGapY === 0,
      summaryRootGap: Math.hypot(rootToHistoryGapX, rootToHistoryGapY),
      allGraphCardsInsideTable: [root, history, response].every((box) => inside(box, table)),
      allGraphCardsAvoidDock: [root, history, response].every((box) => !overlaps(box, dock)),
      allGraphCardsAvoidSeats: [root, history, response].every((box) => anchors.every((anchor) => !overlaps(box, anchor))),
      rootHistoryOverlap: overlaps(root, history),
      responseHistoryOverlap: overlaps(response, history),
      noStage: document.querySelectorAll(".interaction-stage").length === 0,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      borders: {
        sourceStart: borderPoint(point(sourceTether, false), actor),
        sourceEnd: borderPoint(point(sourceTether, true), response),
        counterStart: borderPoint(point(counterEdge, false), response),
        counterEnd: borderPoint(point(counterEdge, true), history),
      },
    };
  });
}

async function expectCompactedGraphGeometry(page, expected, testInfo, screenshotName) {
  const overlay = page.locator('[data-root-action-overlay="true"]');
  await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
  await expect(overlay).toHaveAttribute("data-root-action-response-count", "5");
  await expect(overlay).toHaveAttribute("data-root-action-visible-response-count", "1");
  await expect(overlay).toHaveAttribute("data-root-action-collapsed-response-count", "4");
  await expect(overlay.locator('[data-root-action-response-history="true"]')).toHaveText("+4");
  await expect(overlay.locator('[data-root-action-response-history="true"]')).toHaveAttribute("aria-label", "4 earlier committed Negation responses");
  await expect(overlay.locator('[data-root-action-response-node="true"]')).toHaveCount(1);
  await expect(overlay.locator('[data-root-action-response-node="true"]')).toHaveAttribute("data-response-original-index", "4");
  await expect(overlay.locator('[data-root-action-response-node="true"]')).toHaveAttribute("data-response-active", "true");
  await expect(overlay.locator('[data-root-action-response-node="true"]')).toHaveAttribute("data-response-relation", "COUNTERS_HISTORY");
  await expect(overlay.locator('[data-root-action-edge="negation-counters-history"]')).toHaveCount(1);
  await expect(overlay.locator('[data-root-action-edge="response-source"]')).toHaveCount(1);
  const geometry = await measureCompactedGraph(page);
  expect(geometry.ready).toBe("true");
  expect(geometry.historyCount).toBe("4");
  expect(geometry.historyLabel).toBe("4 earlier committed Negation responses");
  expect(geometry.responseActorId).toBe(expected.latestActorId);
  expect(geometry.rootEffectState).toBe(expected.rootEffectState);
  expect(geometry.groupEffectState).toBe(expected.groupEffectState ?? null);
  expect(geometry.groupEffectTargetId).toBe(expected.groupEffectTargetId ?? null);
  expect(geometry.blockedRootMarks).toBe(expected.blockedRootMarks);
  expect(geometry.blockedGroupMarks).toBe(expected.blockedGroupMarks);
  expect(geometry.sourceTetherCount).toBe(1);
  expect(geometry.historyCounterCount).toBe(1);
  expect(geometry.borders).toEqual({ sourceStart: true, sourceEnd: true, counterStart: true, counterEnd: true });
  expect(geometry.allGraphCardsInsideTable).toBe(true);
  expect(geometry.allGraphCardsAvoidDock).toBe(true);
  expect(geometry.allGraphCardsAvoidSeats).toBe(true);
  expect(geometry.rootHistoryOverlap).toBe(false);
  expect(geometry.responseHistoryOverlap).toBe(false);
  expect(geometry.summaryRootGap).toBeLessThanOrEqual(12);
  expect(geometry.noStage).toBe(true);
  expect(geometry.documentWidth).toBe(geometry.viewportWidth);
  const screenshot = await page.screenshot({ path: testInfo.outputPath(`${screenshotName}.png`), animations: "disabled" });
  await testInfo.attach(screenshotName, { body: screenshot, contentType: "image/png" });
  return geometry;
}

for (const viewport of viewports) {
  test(`real single-target Negation chain compacts five committed responses at ${viewport.width}×${viewport.height}`, async ({ browser, page, request }, testInfo) => {
    test.setTimeout(120_000);
    const seed = await seedSingleTargetGame(request);
    const target = seed.players[1];
    await openGame(page, seed, 3, viewport);
    const sourcePage = await browser.newPage({ viewport });
    await openGame(sourcePage, seed, 0, viewport);
    await playDismantle(sourcePage, seed.root, target);

    const rootOverlay = page.locator('[data-root-action-overlay="true"]');
    await expect(rootOverlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    await expect(rootOverlay).toHaveAttribute("data-root-effect-state", "ACTIVE");
    const rootBefore = await page.locator('[data-root-action-card="true"]').boundingBox();
    expect(rootBefore).not.toBeNull();

    const actorPages = new Map([[0, sourcePage]]);
    for (let depth = 0; depth < 5; depth += 1) {
      const playerIndex = depth;
      const actorView = await waitForNegationActor(request, seed, playerIndex, depth);
      const negationId = seed.negations[depth].id;
      expect(actorView.currentAction.options.some((option) => option.providerId === "negation_card"
        && option.selection?.eligibleCardIds?.includes(negationId))).toBe(true);
      let actorPage = actorPages.get(playerIndex);
      if (!actorPage) {
        actorPage = await browser.newPage({ viewport });
        actorPages.set(playerIndex, actorPage);
        await openGame(actorPage, seed, playerIndex, viewport);
      }
      const payload = await respondWithNegation(actorPage, request, seed, playerIndex, negationId);
      expect(payload).toMatchObject({ action: "respond", cardId: negationId });
    }

    const nextActor = await waitForNegationActor(request, seed, 5, 5);
    expect(nextActor.currentAction.options.some((option) => option.providerId === "negation_card"
      && option.selection?.eligibleCardIds?.includes(seed.negations[5].id))).toBe(true);
    const publicView = await roomView(request, seed, 3);
    const chain = publicView.presentationV2.reactionChain;
    expect(chain).toMatchObject({ semantics: "PROVEN", rootEffectState: "BLOCKED" });
    expect(chain.nodes).toHaveLength(5);
    expect(chain.publicEventLinks.nodes).toHaveLength(5);
    expect(new Set(chain.publicEventLinks.nodes.map(({ eventId }) => eventId)).size).toBe(5);
    expect(publicView.currentAction.options).toBeUndefined();
    expect(JSON.stringify(publicView)).not.toContain(seed.negations[5].id);
    await page.reload();
    await expect(rootOverlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    const geometry = await expectCompactedGraphGeometry(page, {
      latestActorId: seed.players[4].id,
      rootEffectState: "BLOCKED",
      blockedRootMarks: 1,
      blockedGroupMarks: 0,
    }, testInfo, `single-target-negation-five-compact-${viewport.width}`);
    const rootBeforeEdges = {
      left: rootBefore.x,
      top: rootBefore.y,
      right: rootBefore.x + rootBefore.width,
      bottom: rootBefore.y + rootBefore.height,
    };
    for (const edge of ["left", "top", "right", "bottom"]) {
      expect(Math.abs(geometry.root[edge] - rootBeforeEdges[edge]), `root ${edge} remains fixed as history compacts`).toBeLessThanOrEqual(1);
    }
    await Promise.all([...actorPages.values()].map((actorPage) => actorPage.close()));
  });
}

for (const viewport of viewports) {
  test(`real Group Negation chain preserves its target-effect branch while compacting at ${viewport.width}×${viewport.height}`, async ({ browser, page, request }, testInfo) => {
    test.setTimeout(120_000);
    const seed = await seedGroupGame(request, "RainingArrows");
    const first = seed.players[1];
    await openGame(page, seed, 3, viewport);
    const sourcePage = await browser.newPage({ viewport });
    await openGame(sourcePage, seed, 0, viewport);
    await playGroupCard(sourcePage, seed.root);
    const overlay = page.locator('[data-root-action-overlay="true"][data-root-action-group-target-graph="true"]');
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    const rootBefore = await page.locator('[data-root-action-card="true"][data-group-root-action]').boundingBox();
    expect(rootBefore).not.toBeNull();
    const actorPages = new Map([[0, sourcePage]]);
    const sequence = [0, 1, 2, 0, 1];
    const cardSequence = [0, 1, 2, 3, 4];
    for (let depth = 0; depth < sequence.length; depth += 1) {
      const playerIndex = sequence[depth];
      const actorView = await waitForNegationActor(request, seed, playerIndex, depth);
      const negationId = seed.negations[cardSequence[depth]].id;
      expect(actorView.currentAction.options.some((option) => option.providerId === "negation_card"
        && option.selection?.eligibleCardIds?.includes(negationId))).toBe(true);
      let actorPage = actorPages.get(playerIndex);
      if (!actorPage) {
        actorPage = await browser.newPage({ viewport });
        actorPages.set(playerIndex, actorPage);
        await openGame(actorPage, seed, playerIndex, viewport);
      }
      const payload = await respondWithNegation(actorPage, request, seed, playerIndex, negationId);
      expect(payload).toMatchObject({ action: "respond", cardId: negationId });
    }
    const nextActor = await waitForNegationActor(request, seed, 2, 5);
    expect(nextActor.currentAction.options.some((option) => option.providerId === "negation_card"
      && option.selection?.eligibleCardIds?.includes(seed.negations[5].id))).toBe(true);
    const publicView = await roomView(request, seed, 3);
    const chain = publicView.presentationV2.reactionChain;
    expect(chain).toMatchObject({ semantics: "PROVEN", groupTargetEffectScope: { targetId: first.id, effectState: "BLOCKED" } });
    expect(chain.nodes).toHaveLength(5);
    expect(chain.publicNodeEventLinks).toHaveLength(5);
    const sourceView = await roomView(request, seed, 0);
    expect(sourceView.presentationSnapshot.reactionChain).toEqual(publicView.presentationSnapshot.reactionChain);
    expect(publicView.currentAction.options).toBeUndefined();
    expect(JSON.stringify(publicView)).not.toContain(seed.negations[5].id);

    await page.reload();
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    const geometry = await expectCompactedGraphGeometry(page, {
      latestActorId: first.id,
      rootEffectState: null,
      groupEffectState: "BLOCKED",
      groupEffectTargetId: first.id,
      blockedRootMarks: 0,
      blockedGroupMarks: 1,
    }, testInfo, `group-negation-five-compact-${viewport.width}`);
    const rootBeforeEdges = {
      left: rootBefore.x,
      top: rootBefore.y,
      right: rootBefore.x + rootBefore.width,
      bottom: rootBefore.y + rootBefore.height,
    };
    for (const edge of ["left", "top", "right", "bottom"]) {
      expect(Math.abs(geometry.root[edge] - rootBeforeEdges[edge]), `Group root ${edge} remains fixed as history compacts`).toBeLessThanOrEqual(1);
    }
    await Promise.all([...actorPages.values()].map((actorPage) => actorPage.close()));
  });
}
