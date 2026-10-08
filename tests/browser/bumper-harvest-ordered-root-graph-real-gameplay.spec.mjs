import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const viewports = [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

function card(kind, id) {
  return { id, kind, suit: "♣", rank: "7" };
}

async function seedGame(request) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const root = card("BumperHarvest", `bumper-root-${suffix}`);
  const negations = [1, 2, 3].map((index) => card("Negation", `bumper-negation-${index}-${suffix}`));
  const deck = ["Attack", "Dodge", "Peach", "Duel", "Steal"].map((kind, index) => card(kind, `bumper-reveal-${index + 1}-${suffix}`));
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [root] },
        { name: "FIRST", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [negations[0]] },
        { name: "SECOND", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [negations[1]] },
        { name: "THIRD", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [negations[2]] },
        { name: "OBSERVER", role: "Rebel", hero: "hua-tuo", hp: 4, maxHp: 4, hand: [] },
      ],
      deck,
    },
  });
  if (!response.ok()) throw new Error(`Bumper Harvest seed failed: ${await response.text()}`);
  return { ...(await response.json()), root, negations, deck };
}

async function openPlayer(page, seed, playerIndex, viewport = viewports[0]) {
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
  const response = await request.get(`${API}/api/rooms?${new URLSearchParams({
    code: seed.code,
    token: seed.players[playerIndex].token,
  })}`);
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

async function playRoot(page, root) {
  await page.locator(`[data-hand-card-id="${root.id}"] .game-card`).click();
  const play = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(play).toHaveText("Play");
  await expect(play).toBeEnabled();
  const submitted = postedAction(page, "play_card");
  await play.click();
  const response = await submitted;
  if (!response.ok()) throw new Error(`Bumper Harvest play failed: ${await response.text()}`);
}

async function waitForNegation(request, seed, playerIndex, cardId) {
  await expect.poll(async () => {
    const view = await roomView(request, seed, playerIndex);
    return view.isMyAction && view.currentAction?.kind === "response"
      && view.currentAction.actorId === seed.players[playerIndex].id
      && view.currentAction.requirement === "negate"
      && view.currentAction.options?.some((option) => option.providerId === "negation_card"
        && option.selection?.eligibleCardIds?.includes(cardId));
  }, { timeout: 20_000 }).toBe(true);
  return roomView(request, seed, playerIndex);
}

async function respondWithNegation(page, playerId, cardId) {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${playerId}"]`);
  const negation = dock.locator(`[data-hand-card-id="${cardId}"] .game-card`);
  await expect(negation).toBeEnabled();
  await negation.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submitted = postedAction(page, "respond");
  await confirm.click();
  const response = await submitted;
  if (!response.ok()) throw new Error(`Negation response failed: ${await response.text()}`);
  return JSON.parse(response.request().postData() ?? "{}");
}

async function graphGeometry(page, seed, viewport, testInfo, label) {
  const overlay = page.locator('[data-root-action-overlay="true"][data-root-action-ordered-target-graph="true"]');
  try {
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => {
      const bounds = (element) => {
        const rect = element?.getBoundingClientRect();
        return rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
      };
      const overlayNode = document.querySelector('[data-root-action-overlay="true"][data-root-action-ordered-target-graph="true"]');
      const shell = document.querySelector(".game-shell");
      const table = document.querySelector(".play-table");
      const overlayRootNode = overlayNode?.querySelector('[data-bumper-harvest-root-action="BumperHarvest"]');
      const sourceId = overlayNode?.dataset.rootActionSourceId;
      const allAnchors = [...document.querySelectorAll("[data-player-anchor]")];
      const targetIds = allAnchors.map((anchor) => anchor.dataset.playerAnchor);
      const anchorFor = (id) => allAnchors.find((anchor) => anchor.dataset.playerAnchor === id);
      const shellRect = bounds(shell);
      const tableRect = bounds(table);
      const cardRect = bounds(overlayRootNode);
      const sourceRect = bounds(anchorFor(sourceId));
      const targetRects = targetIds.map((id) => bounds(anchorFor(id)));
      const obstacles = [
        ...[...document.querySelectorAll("[data-player-anchor]")].map(bounds),
        ...[".play-center", ".stage-system-cluster", ".game-messages", ".game-exit"].map((selector) => bounds(shell?.querySelector(selector))),
      ].filter(Boolean).map((rect) => ({ left: rect.left - shellRect.left, top: rect.top - shellRect.top, right: rect.right - shellRect.left, bottom: rect.bottom - shellRect.top }));
      const tableLocal = tableRect && { left: tableRect.left - shellRect.left, top: tableRect.top - shellRect.top, right: tableRect.right - shellRect.left, bottom: tableRect.bottom - shellRect.top, width: tableRect.width, height: tableRect.height };
      const center = (rect) => ({ x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 });
      const candidateChecks = tableLocal && sourceRect && targetRects.length && targetRects.every(Boolean) && cardRect ? (() => {
        const sourceLocal = { left: sourceRect.left - shellRect.left, top: sourceRect.top - shellRect.top, right: sourceRect.right - shellRect.left, bottom: sourceRect.bottom - shellRect.top };
        const targetsLocal = targetRects.map((rect) => ({ left: rect.left - shellRect.left, top: rect.top - shellRect.top, right: rect.right - shellRect.left, bottom: rect.bottom - shellRect.top }));
        const sourceCenter = center(sourceLocal);
        const targetCentroid = targetsLocal.reduce((sum, rect) => ({ x: sum.x + center(rect).x / targetsLocal.length, y: sum.y + center(rect).y / targetsLocal.length }), { x: 0, y: 0 });
        const line = { x: targetCentroid.x - sourceCenter.x, y: targetCentroid.y - sourceCenter.y };
        const length = Math.hypot(line.x, line.y) || 1;
        const normal = { x: -line.y / length, y: line.x / length };
        const lateral = Math.min(112, Math.max(44, Math.min(tableLocal.width, tableLocal.height) * .16));
        const size = { width: cardRect.width, height: cardRect.height };
        const checks = [.32, .4, .48, .56].flatMap((fraction) => [0, -lateral, lateral, -lateral * 1.6, lateral * 1.6, -lateral * 2.4, lateral * 2.4].map((offset) => {
          const raw = { x: sourceCenter.x + line.x * fraction + normal.x * offset, y: sourceCenter.y + line.y * fraction + normal.y * offset };
          const left = Math.max(tableLocal.left + 12, Math.min(raw.x - size.width / 2, tableLocal.right - 12 - size.width));
          const top = Math.max(tableLocal.top + 12, Math.min(raw.y - size.height / 2, tableLocal.bottom - 12 - size.height));
          const rect = { left, top, right: left + size.width, bottom: top + size.height };
          const blockers = obstacles.filter((other) => rect.left < other.right + 8 && rect.right > other.left - 8 && rect.top < other.bottom + 8 && rect.bottom > other.top - 8).length;
          return { fraction, offset, rect, blockers };
        }));
        return { sourceCenter, targetCentroid, size, checks };
      })() : null;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        shell: bounds(document.querySelector(".game-shell")),
        table: bounds(document.querySelector(".play-table")),
        dock: bounds(document.querySelector(".local-player-dock")),
        stage: bounds(document.querySelector(".interaction-stage")),
        overlay: overlayNode ? {
          ready: overlayNode.dataset.rootActionReady,
          enabled: overlayNode.dataset.rootActionEnabled,
          targetCount: overlayNode.dataset.rootActionOrderedTargetCount,
          activeTarget: overlayNode.dataset.orderedTargetEffectPlayerId,
          effectState: overlayNode.dataset.orderedTargetEffectState,
          ariaLabel: overlayNode.getAttribute("aria-label"),
          bounds: bounds(overlayNode),
          rootStyle: overlayRootNode?.getAttribute("style"),
          overlayRoot: bounds(overlayRootNode),
        } : null,
        root: bounds(document.querySelector('[data-bumper-harvest-root-action="BumperHarvest"]')),
        obstacles: [".play-center", ".stage-system-cluster", ".game-messages", ".game-exit"].map((selector) => ({ selector, bounds: bounds(document.querySelector(selector)) })),
        candidateChecks,
        anchors: [...document.querySelectorAll("[data-player-anchor]")].map((anchor) => ({
          id: anchor.dataset.playerAnchor,
          bounds: bounds(anchor),
          clientRectCount: anchor.getClientRects().length,
          display: getComputedStyle(anchor).display,
          visibility: getComputedStyle(anchor).visibility,
        })),
        responseNodes: [...document.querySelectorAll("[data-root-action-response-node]")].map(bounds),
      };
    });
    await testInfo.attach(`${label}-${viewport.width}x${viewport.height}-layout-not-ready.json`, {
      body: JSON.stringify(diagnostics, null, 2),
      contentType: "application/json",
    });
    throw new Error(`${error.message}\nBumper graph diagnostics: ${JSON.stringify(diagnostics)}`);
  }
  await expect(page.locator('[data-bumper-harvest-root-action="BumperHarvest"]')).toHaveCount(1);
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
  await expect(page.locator(".local-player-dock")).toBeVisible();

  const geometry = await page.evaluate(({ expectedIds }) => {
    const bounds = (element) => {
      const rect = element?.getBoundingClientRect();
      return rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
    };
    const pointAt = (path, end) => {
      if (!path) return null;
      const point = path.getPointAtLength(end ? path.getTotalLength() : 0);
      const matrix = path.getScreenCTM();
      return matrix ? new DOMPoint(point.x, point.y).matrixTransform(matrix) : null;
    };
    const distanceToRect = (point, rect) => point && rect
      ? Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom))
      : Number.POSITIVE_INFINITY;
    const distanceToPath = (point, path) => {
      if (!point || !path) return Number.POSITIVE_INFINITY;
      let closest = Number.POSITIVE_INFINITY;
      const length = path.getTotalLength();
      for (let sample = 0; sample <= 160; sample += 1) {
        const local = path.getPointAtLength(length * sample / 160);
        const matrix = path.getScreenCTM();
        const screen = matrix ? new DOMPoint(local.x, local.y).matrixTransform(matrix) : null;
        if (screen) closest = Math.min(closest, Math.hypot(screen.x - point.x, screen.y - point.y));
      }
      return closest;
    };
    const overlayNode = document.querySelector('[data-root-action-overlay="true"][data-root-action-ordered-target-graph="true"]');
    const svg = overlayNode?.querySelector(".interaction-root-connectors");
    const root = overlayNode?.querySelector('[data-bumper-harvest-root-action="BumperHarvest"]');
    const table = document.querySelector(".play-table");
    const dock = document.querySelector(".local-player-dock");
    const sourceId = overlayNode?.getAttribute("data-root-action-source-id");
    const anchors = [...document.querySelectorAll("[data-player-anchor]")];
    const branches = [...(svg?.querySelectorAll('path[data-root-action-edge="ordered-target"]') ?? [])].map((path) => {
      const id = path.getAttribute("data-ordered-target-branch-player-id");
      const anchor = anchors.find((candidate) => candidate.getAttribute("data-player-anchor") === id);
      return {
        playerId: id,
        order: Number(path.getAttribute("data-ordered-target-order")),
        status: path.getAttribute("data-ordered-target-status"),
        outcome: path.getAttribute("data-ordered-target-outcome"),
        active: path.getAttribute("data-ordered-target-active"),
        effectState: path.getAttribute("data-ordered-target-effect-state"),
        endpointDistance: distanceToRect(pointAt(path, true), bounds(anchor)),
      };
    });
    const sourcePath = svg?.querySelector('[data-root-action-edge="source"]');
    const sourceAnchor = anchors.find((anchor) => anchor.getAttribute("data-player-anchor") === sourceId);
    const responseNodes = [...(overlayNode?.querySelectorAll('[data-root-action-response-node="true"]') ?? [])];
    const responseTethers = [...(svg?.querySelectorAll('[data-root-action-edge="response-source"][data-response-node-index]') ?? [])].map((path) => {
      const index = Number(path.getAttribute("data-response-node-index"));
      const node = responseNodes.find((candidate) => Number(candidate.getAttribute("data-response-node-index")) === index);
      const actor = anchors.find((candidate) => candidate.getAttribute("data-player-anchor") === node?.getAttribute("data-response-actor-id"));
      return { index, actorId: node?.getAttribute("data-response-actor-id"), distanceToActor: distanceToRect(pointAt(path, false), bounds(actor)) };
    });
    const counterPaths = [...(svg?.querySelectorAll('[data-root-action-edge^="negation-counters-"]') ?? [])].map((path) => {
      const playerId = path.getAttribute("data-counter-target-ordered-player-id");
      const branch = branches.length ? [...svg.querySelectorAll('path[data-root-action-edge="ordered-target"]')]
        .find((candidate) => candidate.getAttribute("data-ordered-target-branch-player-id") === playerId) : null;
      const end = pointAt(path, true);
      return {
        index: Number(path.getAttribute("data-response-node-index")),
        edge: path.getAttribute("data-root-action-edge"),
        playerId,
        targetDistance: branch ? distanceToPath(end, branch) : null,
      };
    });
    const cardRect = bounds(root);
    const tableRect = bounds(table);
    const dockRect = bounds(dock);
    const intersects = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    const rootPlacementBlockers = [
      ...anchors.map((anchor) => [anchor.getAttribute("data-player-anchor") ?? "player", bounds(anchor)]),
      ...[".play-center", ".stage-system-cluster", ".game-messages", ".game-exit"].map((selector) => [selector, bounds(document.querySelector(selector))]),
    ].filter(([, rect]) => rect && cardRect
      && cardRect.left < rect.right + 8 && cardRect.right > rect.left - 8
      && cardRect.top < rect.bottom + 8 && cardRect.bottom > rect.top - 8)
      .map(([label]) => label);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      ready: overlayNode?.getAttribute("data-root-action-ready"),
      rootEventId: overlayNode?.getAttribute("data-root-action-event-id"),
      sourceId,
      root: cardRect,
      table: tableRect,
      dock: dockRect,
      rootOverlapsDock: intersects(cardRect, dockRect),
      rootPlacementBlockers,
      branchIds: branches.map(({ playerId }) => playerId),
      branches,
      sourceTetherDistance: distanceToRect(pointAt(sourcePath, false), bounds(sourceAnchor)),
      responseNodes: responseNodes.map((node) => ({
        index: Number(node.getAttribute("data-response-node-index")),
        actorId: node.getAttribute("data-response-actor-id"),
        eventId: node.getAttribute("data-response-event-id"),
        relation: node.getAttribute("data-response-relation"),
        active: node.getAttribute("data-response-active"),
        targetPlayerId: node.getAttribute("data-counter-target-ordered-player-id"),
        targetIndex: node.getAttribute("data-counter-target-index"),
        rect: bounds(node),
      })),
      responseTethers,
      counterPaths,
      responseCardsInsideTable: responseNodes.every((node) => {
        const rect = bounds(node);
        return rect && rect.left >= tableRect.left && rect.top >= tableRect.top && rect.right <= tableRect.right && rect.bottom <= tableRect.bottom;
      }),
      responseCardsOverlapDock: responseNodes.some((node) => intersects(bounds(node), dockRect)),
      stageCount: document.querySelectorAll(".interaction-stage").length,
      pageWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      expectedIds,
    };
  }, { expectedIds: seed.players.map(({ id }) => id) });

  await testInfo.attach(`${label}-${viewport.width}x${viewport.height}.png`, {
    body: await page.screenshot({ animations: "disabled" }),
    contentType: "image/png",
  });
  await testInfo.attach(`${label}-${viewport.width}x${viewport.height}-geometry.json`, {
    body: JSON.stringify(geometry, null, 2),
    contentType: "application/json",
  });

  expect(geometry.ready).toBe("true");
  expect(geometry.rootEventId).toBeTruthy();
  expect(geometry.branchIds).toEqual(geometry.expectedIds);
  expect(geometry.branches.map(({ order }) => order)).toEqual(seed.players.map((_, index) => index + 1));
  expect(geometry.branches.filter(({ status }) => status === "CURRENT")).toHaveLength(1);
  expect(geometry.sourceTetherDistance).toBeLessThanOrEqual(1.5);
  expect(geometry.branches.every(({ endpointDistance }) => endpointDistance <= 1.5)).toBe(true);
  expect(geometry.root.left).toBeGreaterThanOrEqual(geometry.table.left);
  expect(geometry.root.top).toBeGreaterThanOrEqual(geometry.table.top);
  expect(geometry.root.right).toBeLessThanOrEqual(geometry.table.right);
  expect(geometry.root.bottom).toBeLessThanOrEqual(geometry.table.bottom);
  expect(geometry.rootOverlapsDock).toBe(false);
  expect(geometry.rootPlacementBlockers).toEqual([]);
  expect(geometry.dock.top).toBeGreaterThanOrEqual(geometry.table.bottom - 1);
  expect(geometry.pageWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(geometry.stageCount).toBe(0);
  expect(geometry.responseCardsInsideTable).toBe(true);
  expect(geometry.responseCardsOverlapDock).toBe(false);
  expect(geometry.responseTethers.every(({ distanceToActor }) => distanceToActor <= 1.5)).toBe(true);
  return geometry;
}

async function waitForProgress(request, seed, expectedStatuses) {
  await expect.poll(async () => {
    const view = await roomView(request, seed, 4);
    return view.presentationSnapshot.bumperHarvestProgress?.participants?.map(({ status }) => status) ?? [];
  }, { timeout: 20_000 }).toEqual(expectedStatuses);
  return roomView(request, seed, 4);
}

test("real Bumper Harvest keeps one stable ordered root graph through Negation and chooser advancement", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(120_000);
  const seed = await seedGame(request);
  const [source, first, second, third, observer] = seed.players;
  const [firstNegation, secondNegation, thirdNegation] = seed.negations;

  await openPlayer(page, seed, 4);
  const sourcePage = await browser.newPage({ viewport: viewports[0] });
  await openPlayer(sourcePage, seed, 0);
  await playRoot(sourcePage, seed.root);

  const firstOpen = await waitForNegation(request, seed, 1, firstNegation.id);
  expect(firstOpen.presentationSnapshot.bumperHarvestProgress).toMatchObject({
    semantics: "PROVEN",
    sourceId: source.id,
    rootCardId: seed.root.id,
    targetIds: seed.players.map(({ id }) => id),
    currentParticipantId: source.id,
    currentEffectState: "ACTIVE",
    participants: seed.players.map((player, index) => ({ playerId: player.id, order: index + 1, status: index ? "PENDING" : "CURRENT" })),
  });
  expect(firstOpen.timeline.filter((event) => event.id === firstOpen.presentationSnapshot.bumperHarvestProgress.rootEventId)).toHaveLength(1);
  expect(firstOpen.presentationSnapshot.reactionChain.publicNodeEventLinks).toEqual([]);
  const firstPublicObserver = await roomView(request, seed, 4);
  expect(firstPublicObserver.currentAction.options).toBeUndefined();
  expect(JSON.stringify(firstPublicObserver)).not.toContain(firstNegation.id);
  expect(JSON.stringify(firstPublicObserver)).not.toContain(secondNegation.id);
  expect(JSON.stringify(firstPublicObserver)).not.toContain(thirdNegation.id);

  const openGeometry = await graphGeometry(page, seed, viewports[0], testInfo, "bumper-harvest-open");
  expect(openGeometry.rootEventId).toBe(firstPublicObserver.presentationSnapshot.bumperHarvestProgress.rootEventId);
  expect(openGeometry.sourceId).toBe(source.id);
  expect(openGeometry.branches.map(({ status, effectState }) => ({ status, effectState }))).toEqual([
    { status: "CURRENT", effectState: "ACTIVE" },
    { status: "PENDING", effectState: null },
    { status: "PENDING", effectState: null },
    { status: "PENDING", effectState: null },
    { status: "PENDING", effectState: null },
  ]);
  expect(openGeometry.responseNodes).toHaveLength(0);

  const firstPage = await browser.newPage({ viewport: viewports[0] });
  await openPlayer(firstPage, seed, 1);
  await expect.poll(async () => (await roomView(request, seed, 1)).currentAction.actorId).toBe(first.id);
  await respondWithNegation(firstPage, first.id, firstNegation.id);
  const counterWindow = await waitForNegation(request, seed, 2, secondNegation.id);
  expect(counterWindow.presentationSnapshot.bumperHarvestProgress.currentParticipantId).toBe(source.id);
  expect(counterWindow.presentationSnapshot.bumperHarvestProgress.currentEffectState).toBe("BLOCKED");
  expect(counterWindow.presentationSnapshot.reactionChain.publicNodeEventLinks).toHaveLength(1);
  await expect.poll(() => page.locator('[data-ordered-target-effect-state="BLOCKED"]').count(), { timeout: 20_000 }).toBe(1);
  const blockedGeometry = await graphGeometry(page, seed, viewports[0], testInfo, "bumper-harvest-negated");
  expect(blockedGeometry.rootEventId).toBe(openGeometry.rootEventId);
  expect(blockedGeometry.branches[0].effectState).toBe("BLOCKED");
  expect(blockedGeometry.responseNodes).toMatchObject([{ index: 0, actorId: first.id, relation: "COUNTERS_ORDERED_TARGET_EFFECT", active: "true", targetPlayerId: source.id }]);
  expect(blockedGeometry.counterPaths).toMatchObject([{ index: 0, edge: "negation-counters-ordered-target-effect", playerId: source.id }]);
  expect(blockedGeometry.counterPaths[0].targetDistance).toBeLessThanOrEqual(1.5);
  expect(blockedGeometry.responseNodes[0].eventId).toBe(counterWindow.presentationSnapshot.reactionChain.publicNodeEventLinks[0].eventId);
  expect(Math.abs(blockedGeometry.root.left - openGeometry.root.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(blockedGeometry.root.top - openGeometry.root.top)).toBeLessThanOrEqual(1);

  const secondPage = await browser.newPage({ viewport: viewports[0] });
  await openPlayer(secondPage, seed, 2);
  await respondWithNegation(secondPage, second.id, secondNegation.id);
  const restoredWindow = await waitForNegation(request, seed, 3, thirdNegation.id);
  expect(restoredWindow.presentationSnapshot.bumperHarvestProgress.currentParticipantId).toBe(source.id);
  expect(restoredWindow.presentationSnapshot.bumperHarvestProgress.currentEffectState).toBe("ACTIVE");
  expect(restoredWindow.presentationSnapshot.reactionChain.publicNodeEventLinks).toHaveLength(2);
  await expect.poll(() => page.locator('[data-ordered-target-effect-state="ACTIVE"]').count(), { timeout: 20_000 }).toBe(1);
  const restoredGeometry = await graphGeometry(page, seed, viewports[0], testInfo, "bumper-harvest-counter-restored");
  expect(restoredGeometry.rootEventId).toBe(openGeometry.rootEventId);
  expect(restoredGeometry.branches[0].effectState).toBe("ACTIVE");
  expect(restoredGeometry.responseNodes.map(({ relation, active, targetPlayerId, targetIndex }) => ({ relation, active, targetPlayerId, targetIndex }))).toEqual([
    { relation: "COUNTERS_ORDERED_TARGET_EFFECT", active: "false", targetPlayerId: source.id, targetIndex: null },
    { relation: "COUNTERS_RESPONSE", active: "true", targetPlayerId: null, targetIndex: "0" },
  ]);
  expect(restoredGeometry.counterPaths.map(({ edge, playerId, index }) => ({ edge, playerId, index }))).toEqual([
    { edge: "negation-counters-ordered-target-effect", playerId: source.id, index: 0 },
    { edge: "negation-counters-response", playerId: null, index: 1 },
  ]);
  expect(restoredGeometry.responseNodes[0].eventId).toBe(restoredWindow.presentationSnapshot.reactionChain.publicNodeEventLinks[0].eventId);
  expect(restoredGeometry.responseNodes[1].eventId).toBe(restoredWindow.presentationSnapshot.reactionChain.publicNodeEventLinks[1].eventId);
  expect(Math.abs(restoredGeometry.root.left - openGeometry.root.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(restoredGeometry.root.top - openGeometry.root.top)).toBeLessThanOrEqual(1);

  const thirdPageAction = await waitForNegation(request, seed, 3, thirdNegation.id);
  expect(thirdPageAction.currentAction.actorId).toBe(third.id);
  const thirdPage = await browser.newPage({ viewport: viewports[0] });
  await openPlayer(thirdPage, seed, 3);
  await respondWithNegation(thirdPage, third.id, thirdNegation.id);
  const firstChoiceView = await waitForProgress(request, seed, ["RESOLVED", "CURRENT", "PENDING", "PENDING", "PENDING"]);
  expect(firstChoiceView.presentationSnapshot.bumperHarvestProgress.participants[0].outcome).toBe("NEGATED");
  expect(firstChoiceView.currentAction.actorId).toBe(first.id);
  expect(firstChoiceView.pendingHarvest.countdownUntil).toBeGreaterThan(Date.now());

  const firstChoicePage = firstPage;
  await expect(firstChoicePage.locator(".harvest-choice-stage")).toBeVisible({ timeout: 20_000 });
  const firstDeadline = firstChoiceView.pendingHarvest.countdownUntil;
  expect(firstDeadline - Date.now()).toBeGreaterThan(50_000);
  expect(firstDeadline - Date.now()).toBeLessThanOrEqual(60_000);
  const timer = firstChoicePage.locator(".stage-system-cluster > .visible-countdown-event");
  await expect(timer).toBeVisible();
  await expect(timer).toHaveAttribute("role", "timer");
  await expect(timer).toHaveAttribute("aria-label", /^Choosing (?:60|5[0-9]) seconds$/);

  await expect.poll(() => page.locator('[data-ordered-target-branch-player-id]').nth(1).getAttribute("data-ordered-target-status"), { timeout: 20_000 }).toBe("CURRENT");
  const nextChooserGeometry = await graphGeometry(page, seed, viewports[0], testInfo, "bumper-harvest-first-chooser");
  expect(nextChooserGeometry.rootEventId).toBe(openGeometry.rootEventId);
  expect(nextChooserGeometry.branches.map(({ status, outcome }) => ({ status, outcome }))).toEqual([
    { status: "RESOLVED", outcome: "NEGATED" },
    { status: "CURRENT", outcome: null },
    { status: "PENDING", outcome: null },
    { status: "PENDING", outcome: null },
    { status: "PENDING", outcome: null },
  ]);
  expect(Math.abs(nextChooserGeometry.root.left - openGeometry.root.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(nextChooserGeometry.root.top - openGeometry.root.top)).toBeLessThanOrEqual(1);

  const choiceCard = firstChoicePage.locator(".harvest-choice-stage .harvest-card-choice:not([disabled])").first();
  await expect(choiceCard).toBeEnabled();
  await choiceCard.click();
  const confirm = firstChoicePage.locator(".harvest-choice-stage .harvest-confirm-row button.primary");
  await expect(confirm).toBeEnabled();
  const chooseResponse = postedAction(firstChoicePage, "choose_harvest");
  await confirm.click();
  const chosenResponse = await chooseResponse;
  if (!chosenResponse.ok()) throw new Error(`Bumper Harvest choice failed: ${await chosenResponse.text()}`);

  const nextChoice = await waitForProgress(request, seed, ["RESOLVED", "RESOLVED", "CURRENT", "PENDING", "PENDING"]);
  expect(nextChoice.presentationSnapshot.bumperHarvestProgress.participants[0].outcome).toBe("NEGATED");
  expect(nextChoice.presentationSnapshot.bumperHarvestProgress.participants[1].outcome).toBe("CHOSE_CARD");
  expect(nextChoice.currentAction.actorId).toBe(second.id);
  await expect.poll(() => page.locator('[data-ordered-target-branch-player-id]').nth(2).getAttribute("data-ordered-target-status"), { timeout: 20_000 }).toBe("CURRENT");

  let responsiveGeometry = null;
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const geometry = await graphGeometry(page, seed, viewport, testInfo, `bumper-harvest-advanced-${viewport.width}`);
    expect(geometry.rootEventId).toBe(openGeometry.rootEventId);
    expect(geometry.branches.map(({ status }) => status)).toEqual(["RESOLVED", "RESOLVED", "CURRENT", "PENDING", "PENDING"]);
    if (viewport.width === 390) responsiveGeometry = geometry;
  }
  expect(Math.abs(responsiveGeometry.root.left - openGeometry.root.left)).toBeLessThanOrEqual(1);
  expect(Math.abs(responsiveGeometry.root.top - openGeometry.root.top)).toBeLessThanOrEqual(1);

  await sourcePage.close();
  await secondPage.close();
  await thirdPage.close();
  expect(observer.id).toBeTruthy();
});
