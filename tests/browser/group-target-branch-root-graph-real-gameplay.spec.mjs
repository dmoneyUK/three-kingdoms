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

async function seedGroupGame(request, cardKind, { includeNegationChain = false } = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const root = card(cardKind, `group-branch-root-${suffix}`);
  const hidden = [card("Peach", `group-branch-hidden-a-${suffix}`), card("Peach", `group-branch-hidden-b-${suffix}`)];
  const negations = includeNegationChain ? {
    source: card("Negation", `group-branch-negation-source-${suffix}`),
    first: card("Negation", `group-branch-negation-first-${suffix}`),
    second: card("Negation", `group-branch-negation-second-${suffix}`),
  } : null;
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [root, ...(negations ? [negations.source] : [])] },
        { name: "FIRST", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [hidden[0], ...(negations ? [negations.first] : [])] },
        { name: "SECOND", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [hidden[1], ...(negations ? [negations.second] : [])] },
        { name: "THIRD", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`seed ${cardKind} game failed: ${await response.text()}`);
  return { ...(await response.json()), root, hidden, negations };
}

async function openGame(page, seed, playerIndex, viewport) {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  await page.addInitScript(() => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    window.__wtkGroupGraphInitialAnchors = null;
    HTMLElement.prototype.getBoundingClientRect = function (...args) {
      const overlay = document.querySelector('[data-root-action-group-target-graph="true"]');
      if (this.hasAttribute("data-player-anchor") && !window.__wtkGroupGraphInitialAnchors && overlay?.dataset.rootActionReady === "false") {
        window.__wtkGroupGraphInitialAnchors = Object.fromEntries(
          [...document.querySelectorAll("[data-player-anchor]")].map((anchor) => {
            const bounds = original.call(anchor);
            return [anchor.dataset.playerAnchor, { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height }];
          }),
        );
      }
      return original.apply(this, args);
    };
  });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function roomView(request, seed, playerIndex) {
  const member = seed.players[playerIndex];
  const response = await request.get(`${API}/api/rooms?${new URLSearchParams({ code: seed.code, token: member.token })}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function apiAction(request, seed, playerIndex, action) {
  const before = await roomView(request, seed, playerIndex);
  expect(before.isMyAction).toBe(true);
  expect(before.currentAction.legalActions).toContain(action);
  const response = await request.post(`${API}/api/rooms`, {
    data: { action, code: seed.code, token: seed.players[playerIndex].token },
  });
  if (!response.ok()) throw new Error(`${action} failed: ${await response.text()}`);
  return response.json();
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

async function reachFirstParticipant(request, seed, targetId, requirement) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const views = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
    const target = views.find((view) => view.isMyAction
      && view.currentAction?.actorId === targetId
      && view.currentAction.kind === "response"
      && view.currentAction.requirement === requirement);
    if (target) return target;
    const negationActor = views.findIndex((view) => view.isMyAction
      && view.currentAction?.kind === "response"
      && view.currentAction.requirement === "negate");
    if (negationActor >= 0) {
      await apiAction(request, seed, negationActor, "decline_response");
      continue;
    }
    throw new Error(`No authoritative transition toward ${requirement} for the first Group participant.`);
  }
  throw new Error(`The real ${requirement} response did not reach the first Group participant.`);
}

async function finishGroupWithDamageResponses(request, seed) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const views = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
    if (views.some((view) => view.presentationSnapshot.groupSettlements?.length === 1)) return;
    const actorIndex = views.findIndex((view) => view.isMyAction);
    const actor = views[actorIndex];
    if (!actor || !actor.currentAction) throw new Error("The real Raining Arrows sequence has no authoritative current action.");
    if (actor.currentAction.kind === "response" && (actor.currentAction.requirement === "dodge" || actor.currentAction.requirement === "attack")) {
      await apiAction(request, seed, actorIndex, "decline_response");
      continue;
    }
    if (actor.currentAction.kind === "response" && actor.currentAction.requirement === "negate") {
      await apiAction(request, seed, actorIndex, "decline_response");
      continue;
    }
    if (actor.currentAction.kind === "trigger" && actor.currentAction.legalActions.includes("decline_trigger")) {
      await apiAction(request, seed, actorIndex, "decline_trigger");
      continue;
    }
    const diagnostics = views.map((view) => ({
      isMyAction: view.isMyAction,
      phase: view.phase,
      action: view.currentAction && {
        kind: view.currentAction.kind,
        actorId: view.currentAction.actorId,
        requirement: view.currentAction.requirement,
        legalActions: view.currentAction.legalActions,
      },
      groupProgress: view.presentationSnapshot.groupParticipantProgress?.participants?.map(({ playerId, status, outcome }) => ({ playerId, status, outcome })) ?? null,
      settlementCount: view.presentationSnapshot.groupSettlements?.length ?? 0,
      latestEvents: view.timeline.slice(-4).map(({ id, type, action, player, resolutionId, finalResult, publicGroupSettlement }) => ({ id, type, action, player, resolutionId, finalResult, publicGroupSettlement })),
    }));
    throw new Error(`Unexpected authoritative action ${actor.currentAction.kind} while finishing ${seed.root.kind}: ${JSON.stringify(diagnostics)}`);
  }
  throw new Error(`The real ${seed.root.kind} sequence did not reach its final settlement proof.`);
}

async function graphGeometry(page, seed, viewport, testInfo, label = "group-root-graph", expectedCurrentBranchCount = 1) {
  const overlay = page.locator('[data-root-action-overlay="true"][data-root-action-group-target-graph="true"]');
  try {
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
  } catch (error) {
    const diagnostics = await page.evaluate(() => {
      const bounds = (element) => {
        const rect = element?.getBoundingClientRect();
        return rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
      };
      const overlayNode = document.querySelector('[data-root-action-overlay="true"]');
      const shell = document.querySelector(".game-shell");
      const shellBounds = bounds(shell);
      const anchors = [...document.querySelectorAll("[data-player-anchor]")];
      const response = document.querySelector('[data-root-action-response-node="true"]');
      const actorId = response?.getAttribute("data-response-actor-id");
      const actor = anchors.find((node) => node.getAttribute("data-player-anchor") === actorId);
      const targetId = overlayNode?.getAttribute("data-group-target-effect-player-id");
      const branch = [...document.querySelectorAll('path[data-root-action-edge="group-target"]')].find((node) => node.getAttribute("data-group-target-branch-player-id") === targetId);
      const svg = document.querySelector(".interaction-root-connectors");
      const effectPoint = branch && svg ? (() => {
        const point = branch.getPointAtLength(branch.getTotalLength() * .55);
        const svgPoint = svg.createSVGPoint();
        svgPoint.x = point.x;
        svgPoint.y = point.y;
        const matrix = branch.getScreenCTM();
        const screen = matrix ? svgPoint.matrixTransform(matrix) : null;
        return screen && shellBounds ? { x: screen.x - shellBounds.left, y: screen.y - shellBounds.top } : null;
      })() : null;
      const actorBounds = bounds(actor);
      const responseBounds = bounds(response);
      const tableBounds = bounds(document.querySelector(".play-table"));
      const asLocal = (rect) => rect && shellBounds ? { left: rect.left - shellBounds.left, top: rect.top - shellBounds.top, right: rect.right - shellBounds.left, bottom: rect.bottom - shellBounds.top, width: rect.width, height: rect.height } : null;
      const tableLocal = asLocal(tableBounds);
      const actorLocal = asLocal(actorBounds);
      const actorCenter = actorLocal && { x: (actorLocal.left + actorLocal.right) / 2, y: (actorLocal.top + actorLocal.bottom) / 2 };
      const vector = actorCenter && effectPoint ? { x: effectPoint.x - actorCenter.x, y: effectPoint.y - actorCenter.y } : null;
      const vectorLength = vector ? Math.hypot(vector.x, vector.y) || 1 : 1;
      const normal = vector ? { x: -vector.y / vectorLength, y: vector.x / vectorLength } : null;
      const lateralDistance = tableLocal ? Math.min(112, Math.max(44, Math.min(tableLocal.width, tableLocal.height) * .16)) : 0;
      const rootBounds = asLocal(bounds(document.querySelector('[data-root-action-card="true"][data-group-root-action]')));
      const obstacleNodes = [
        ...anchors.map((node, index) => [`anchor-${node.getAttribute("data-player-anchor") ?? index}`, node]),
        ...[".play-center", ".stage-system-cluster", ".game-messages", ".game-exit"].map((selector) => [selector, document.querySelector(selector)]),
      ].filter(([, node]) => node?.getClientRects().length > 0).map(([name, node]) => ({ name, rect: asLocal(bounds(node)) }));
      const candidateDiagnostics = vector && normal && actorCenter && effectPoint && tableLocal && responseBounds
        ? [.42, .54, .66, .78].flatMap((fraction) => [0, -lateralDistance, lateralDistance, -lateralDistance * 1.6, lateralDistance * 1.6].map((offset) => {
          const center = { x: actorCenter.x + vector.x * fraction + normal.x * offset, y: actorCenter.y + vector.y * fraction + normal.y * offset };
          const width = responseBounds.width; const height = responseBounds.height;
          const left = Math.max(tableLocal.left + 12, Math.min(center.x - width / 2, tableLocal.right - 12 - width));
          const top = Math.max(tableLocal.top + 12, Math.min(center.y - height / 2, tableLocal.bottom - 12 - height));
          const rect = { left, top, right: left + width, bottom: top + height };
          const blockers = [...obstacleNodes, ...(rootBounds ? [{ name: "root-card", rect: rootBounds }] : [])].filter(({ rect: obstacle }) => rect.left < obstacle.right + 8 && rect.right > obstacle.left - 8 && rect.top < obstacle.bottom + 8 && rect.bottom > obstacle.top - 8).map(({ name }) => name);
          return { fraction, offset, rect, blockers };
        })) : [];
      return {
        overlay: overlayNode ? { ready: overlayNode.getAttribute("data-root-action-ready"), enabled: overlayNode.getAttribute("data-root-action-enabled"), target: overlayNode.getAttribute("data-group-target-effect-player-id"), state: overlayNode.getAttribute("data-group-target-effect-state") } : null,
        table: bounds(document.querySelector(".play-table")),
        center: bounds(document.querySelector(".play-center")),
        systemCluster: bounds(document.querySelector(".stage-system-cluster")),
        messages: bounds(document.querySelector(".game-messages")),
        exit: bounds(document.querySelector(".game-exit")),
        root: bounds(document.querySelector('[data-root-action-card="true"][data-group-root-action]')),
        responses: [...document.querySelectorAll('[data-root-action-response-node="true"]')].map((node) => ({ actorId: node.getAttribute("data-response-actor-id"), ...bounds(node) })),
        anchors: anchors.map((node) => ({ id: node.getAttribute("data-player-anchor"), ...bounds(node) })),
        effectPoint,
        candidateDiagnostics,
      };
    });
    await testInfo.attach(`${label}-${viewport.width}x${viewport.height}-not-ready.json`, { body: JSON.stringify(diagnostics, null, 2), contentType: "application/json" });
    throw new Error(`${error.message}\nGroup graph layout diagnostics: ${JSON.stringify(diagnostics)}`);
  }
  await expect(page.locator('[data-root-action-card="true"][data-group-root-action]')).toHaveCount(1);
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
  await expect(page.locator(".local-player-dock")).toBeVisible();
  const geometry = await page.evaluate(({ expectedIds }) => {
    const bounds = (element) => {
      const rect = element?.getBoundingClientRect();
      return rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
    };
    const svg = document.querySelector(".interaction-root-connectors");
    const cardElement = document.querySelector('[data-root-action-card="true"][data-group-root-action]');
    const table = document.querySelector(".play-table");
    const dock = document.querySelector(".local-player-dock");
    const sourceId = document.querySelector('[data-root-action-overlay="true"]')?.getAttribute("data-root-action-source-id");
    const anchors = [...document.querySelectorAll("[data-player-anchor]")];
    const branches = [...document.querySelectorAll('path[data-root-action-edge="group-target"][data-group-target-branch-player-id]')];
    const branchGeometry = branches.map((path) => {
      const playerId = path.getAttribute("data-group-target-branch-player-id");
      const target = anchors.find((anchor) => anchor.getAttribute("data-player-anchor") === playerId);
      const end = path.getPointAtLength(path.getTotalLength());
      const matrix = path.getScreenCTM();
      const screenEnd = svg.createSVGPoint();
      screenEnd.x = end.x;
      screenEnd.y = end.y;
      const endpoint = matrix ? screenEnd.matrixTransform(matrix) : null;
      const targetBounds = bounds(target);
      const distanceToTarget = endpoint && targetBounds
        ? Math.hypot(Math.max(targetBounds.left - endpoint.x, 0, endpoint.x - targetBounds.right), Math.max(targetBounds.top - endpoint.y, 0, endpoint.y - targetBounds.bottom))
        : Number.POSITIVE_INFINITY;
      return {
        playerId,
        status: path.getAttribute("data-group-target-status"),
        outcome: path.getAttribute("data-group-target-outcome"),
        effectState: path.getAttribute("data-group-target-effect-state"),
        path: path.getAttribute("d"),
        endpoint,
        distanceToTarget,
      };
    });
    const sourcePath = document.querySelector('[data-root-action-edge="source"]');
    const sourceAnchor = anchors.find((anchor) => anchor.getAttribute("data-player-anchor") === sourceId);
    const sourcePoint = sourcePath?.getPointAtLength(0);
    const sourceMatrix = sourcePath?.getScreenCTM();
    const sourceSvgPoint = sourcePoint && svg?.createSVGPoint();
    if (sourceSvgPoint && sourcePoint) {
      sourceSvgPoint.x = sourcePoint.x;
      sourceSvgPoint.y = sourcePoint.y;
    }
    const sourceEndpoint = sourceSvgPoint && sourceMatrix ? sourceSvgPoint.matrixTransform(sourceMatrix) : null;
    const sourceBounds = bounds(sourceAnchor);
    const sourceDistanceToAnchor = sourceEndpoint && sourceBounds
      ? Math.hypot(Math.max(sourceBounds.left - sourceEndpoint.x, 0, sourceEndpoint.x - sourceBounds.right), Math.max(sourceBounds.top - sourceEndpoint.y, 0, sourceEndpoint.y - sourceBounds.bottom))
      : Number.POSITIVE_INFINITY;
    const stageBounds = bounds(document.querySelector(".interaction-stage"));
    const cardBounds = bounds(cardElement);
    const tableBounds = bounds(table);
    const dockBounds = bounds(dock);
    const intersects = (left, right) => Boolean(left && right
      && left.left < right.right && left.right > right.left
      && left.top < right.bottom && left.bottom > right.top);
    const screenPointAt = (path, atEnd) => {
      if (!path || !svg) return null;
      const point = path.getPointAtLength(atEnd ? path.getTotalLength() : 0);
      const screenPoint = svg.createSVGPoint();
      screenPoint.x = point.x;
      screenPoint.y = point.y;
      const matrix = path.getScreenCTM();
      return matrix ? screenPoint.matrixTransform(matrix) : null;
    };
    const distanceToRect = (point, rect) => point && rect
      ? Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom))
      : Number.POSITIVE_INFINITY;
    const distanceToPath = (point, path) => {
      if (!point || !path) return Number.POSITIVE_INFINITY;
      let closest = Number.POSITIVE_INFINITY;
      const length = path.getTotalLength();
      for (let sample = 0; sample <= 160; sample += 1) {
        const candidate = path.getPointAtLength(length * sample / 160);
        closest = Math.min(closest, Math.hypot(candidate.x - point.x, candidate.y - point.y));
      }
      return closest;
    };
    const responseNodes = [...document.querySelectorAll('[data-root-action-response-node="true"]')];
    const responseTethers = [...document.querySelectorAll('[data-root-action-edge="response-source"][data-response-node-index]')].map((path) => {
      const index = Number(path.getAttribute("data-response-node-index"));
      const node = responseNodes.find((candidate) => Number(candidate.getAttribute("data-response-node-index")) === index);
      const actorId = node?.getAttribute("data-response-actor-id") ?? null;
      const actor = anchors.find((candidate) => candidate.getAttribute("data-player-anchor") === actorId);
      return { index, actorId, distanceToActor: distanceToRect(screenPointAt(path, false), bounds(actor)) };
    });
    const responseCounters = [...document.querySelectorAll('.interaction-root-connectors [data-response-node-index][data-root-action-edge^="negation-counters-"]')].map((path) => {
      const index = Number(path.getAttribute("data-response-node-index"));
      const targetPlayerId = path.getAttribute("data-counter-target-group-player-id");
      const targetBranch = branches.find((candidate) => candidate.getAttribute("data-group-target-branch-player-id") === targetPlayerId);
      const previousNode = responseNodes.find((candidate) => Number(candidate.getAttribute("data-response-node-index")) === Number(path.getAttribute("data-counter-target-index")));
      const endpoint = screenPointAt(path, true);
      return {
        index,
        edge: path.getAttribute("data-root-action-edge"),
        targetPlayerId,
        targetIndex: path.getAttribute("data-counter-target-index"),
        active: path.getAttribute("data-response-active"),
        distanceToBranch: targetPlayerId ? distanceToPath(path.getPointAtLength(path.getTotalLength()), targetBranch) : null,
        distanceToPreviousResponse: previousNode ? distanceToRect(endpoint, bounds(previousNode)) : null,
      };
    });
    const responseCardBounds = responseNodes.map((node) => ({
      index: Number(node.getAttribute("data-response-node-index")),
      actorId: node.getAttribute("data-response-actor-id"),
      eventId: node.getAttribute("data-response-event-id"),
      relation: node.getAttribute("data-response-relation"),
      targetIndex: node.getAttribute("data-counter-target-index"),
      active: node.getAttribute("data-response-active"),
      ...bounds(node),
    }));
    const rootOverlay = document.querySelector('[data-root-action-overlay="true"]');
    const groupEffectState = rootOverlay?.getAttribute("data-group-target-effect-state") ?? null;
    const groupEffectTargetId = rootOverlay?.getAttribute("data-group-target-effect-player-id") ?? null;
    return {
      rootKind: cardElement?.getAttribute("data-group-root-action") ?? null,
      rootEventId: rootOverlay?.getAttribute("data-root-action-event-id") ?? null,
      rootEffectState: rootOverlay?.getAttribute("data-root-effect-state") ?? null,
      groupEffectState,
      groupEffectTargetId,
      sourceId,
      card: cardBounds,
      table: tableBounds,
      dock: dockBounds,
      stage: stageBounds,
      anchors: anchors.map((anchor) => ({ id: anchor.getAttribute("data-player-anchor"), ...bounds(anchor) })),
      branches: branchGeometry,
      responseNodes: responseCardBounds,
      responseTethers,
      responseCounters,
      blockedBranchMarks: document.querySelectorAll('[data-root-action-group-effect-blocked="true"]').length,
      sourceDistanceToAnchor,
      overlayPointerEvents: getComputedStyle(rootOverlay).pointerEvents,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      cardOverlapsDock: intersects(cardBounds, dockBounds),
      cardOverlapsAnchor: anchors.some((anchor) => intersects(cardBounds, bounds(anchor))),
      responseCardsInsideTable: responseCardBounds.every((response) => response.left >= tableBounds.left
        && response.top >= tableBounds.top && response.right <= tableBounds.right && response.bottom <= tableBounds.bottom),
      responseCardsOverlapDock: responseCardBounds.some((response) => intersects(response, dockBounds)),
      responseCardsOverlapAnchors: responseCardBounds.some((response) => anchors.some((anchor) => intersects(response, bounds(anchor)))),
      currentBranchCount: branches.filter((path) => path.getAttribute("data-group-target-active") === "true").length,
      uniqueBranchIds: new Set(branches.map((path) => path.getAttribute("data-group-target-branch-player-id"))).size,
      expectedIds,
    };
  }, { expectedIds: seed.players.slice(1).map(({ id }) => id) });
  const initialAnchors = await page.evaluate(() => window.__wtkGroupGraphInitialAnchors);
  await testInfo.attach(`${label}-${viewport.width}x${viewport.height}.png`, { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
  await testInfo.attach(`${label}-${viewport.width}x${viewport.height}.json`, { body: JSON.stringify({ geometry, initialAnchors }, null, 2), contentType: "application/json" });

  expect(geometry.card).not.toBeNull();
  expect(geometry.table).not.toBeNull();
  expect(geometry.rootEventId).toBeTruthy();
  expect(geometry.overlayPointerEvents).toBe("none");
  expect(geometry.anchors).toHaveLength(seed.players.length);
  expect(geometry.branches.map(({ playerId }) => playerId)).toEqual(geometry.expectedIds);
  expect(geometry.uniqueBranchIds).toBe(geometry.expectedIds.length);
  expect(geometry.currentBranchCount).toBe(expectedCurrentBranchCount);
  expect(geometry.sourceDistanceToAnchor, "the root source tether starts at the proven source's physical seat").toBeLessThanOrEqual(1.5);
  expect(geometry.branches.every(({ distanceToTarget }) => distanceToTarget <= 1.5), "each semantic branch ends at its matching fixed physical seat").toBe(true);
  expect(geometry.card.left).toBeGreaterThanOrEqual(geometry.table.left);
  expect(geometry.card.top).toBeGreaterThanOrEqual(geometry.table.top);
  expect(geometry.card.right).toBeLessThanOrEqual(geometry.table.right);
  expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.table.bottom);
  expect(geometry.cardOverlapsDock).toBe(false);
  expect(geometry.cardOverlapsAnchor).toBe(false);
  expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
  expect(initialAnchors, "seat geometry is captured before the graph replaces the Stage").toBeTruthy();
  for (const anchor of geometry.anchors) {
    const initial = initialAnchors[anchor.id];
    expect(initial).toBeTruthy();
    for (const key of ["left", "top", "right", "bottom"]) {
      expect(Math.abs(anchor[key] - initial[key]), `${anchor.id}.${key} shifted from ${initial[key]} to ${anchor[key]}`).toBeLessThanOrEqual(1);
    }
  }
  return geometry;
}

async function waitForNegationActor(request, seed, playerIndex, cardId) {
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

async function respondWithCard(page, playerId, cardId) {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${playerId}"]`);
  const selectable = dock.locator(`[data-hand-card-id="${cardId}"] .game-card`);
  await expect(selectable).toBeEnabled();
  await selectable.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && JSON.parse(response.request().postData() ?? "{}").action === "respond");
  await confirm.click();
  const response = await submitted;
  if (!response.ok()) throw new Error(`Negation response failed: ${await response.text()}`);
  return JSON.parse(response.request().postData() ?? "{}");
}

for (const { cardKind, viewport } of [
  ...viewports.map((viewport) => ({ cardKind: "RainingArrows", viewport })),
  ...viewports.map((viewport) => ({ cardKind: "BarbarianInvasion", viewport })),
]) {
  test(`${cardKind} production path renders and advances the GROUP root branch graph at ${viewport.width}×${viewport.height}`, async ({ page, request }, testInfo) => {
    test.setTimeout(60_000);
    const seed = await seedGroupGame(request, cardKind);
    const first = seed.players[1];
    const sourcePage = page;
    await openGame(sourcePage, seed, 0, viewports[0]);
    await playGroupCard(sourcePage, seed.root);
    const requirement = cardKind === "RainingArrows" ? "dodge" : "attack";
    const firstView = await reachFirstParticipant(request, seed, first.id, requirement);

    expect(firstView.presentationSnapshot.groupParticipantProgress).toMatchObject({
      cardKind,
      resolutionSemantics: "GROUP",
      interactionId: firstView.presentationSnapshot.interaction.interactionId,
      groupFrameId: firstView.presentationSnapshot.interaction.rootFrameId,
      targetIds: [first.id, seed.players[2].id, seed.players[3].id],
      currentParticipantId: first.id,
      participants: [
        { playerId: first.id, order: 1, status: "CURRENT" },
        { playerId: seed.players[2].id, order: 2, status: "PENDING" },
        { playerId: seed.players[3].id, order: 3, status: "PENDING" },
      ],
    });
    const sourceView = await roomView(request, seed, 0);
    const rootEventId = sourceView.presentationV2.rootContext?.eventId;
    expect(rootEventId).toBeTruthy();
    const rootEvents = sourceView.timeline.filter((event) => event.id === rootEventId);
    expect(rootEvents).toHaveLength(1);
    expect(rootEvents[0]).toMatchObject({ type: "card", action: "play", card: { kind: cardKind, id: seed.root.id } });
    expect(rootEvents[0].presentation).not.toBe(false);
    expect(JSON.stringify(sourceView)).not.toContain(seed.hidden[0].id);
    expect(JSON.stringify(sourceView)).not.toContain(seed.hidden[1].id);

    const rootGraph = page.locator('[data-root-action-overlay="true"][data-root-action-group-target-graph="true"]');
    await expect(rootGraph).toHaveAttribute("data-root-action-event-id", rootEventId, { timeout: 20_000 });
    await expect(page.locator(`[data-root-action-card="true"][data-group-root-action="${cardKind}"]`)).toBeVisible();
    await expect(page.locator(`[data-root-action-card="true"][data-group-root-action="${cardKind}"]`)).toHaveAttribute("aria-label", new RegExp(`SOURCE played ${cardKind === "RainingArrows" ? "Raining Arrows" : "Barbarian Invasion"}`));
    const before = await graphGeometry(page, seed, viewport, testInfo);
    expect(before.branches.map(({ status }) => status)).toEqual(["CURRENT", "PENDING", "PENDING"]);

    await apiAction(request, seed, 1, "decline_response");
    await expect.poll(async () => {
      const view = await roomView(request, seed, 0);
      return view.presentationSnapshot.groupParticipantProgress?.participants?.map(({ status }) => status) ?? [];
    }, { timeout: 20_000 }).toEqual(["RESOLVED", "CURRENT", "PENDING"]);
    await expect.poll(async () => page.locator('[data-group-target-branch-player-id]').nth(0).getAttribute("data-group-target-status"), { timeout: 20_000 }).toBe("RESOLVED");
    await expect.poll(async () => page.locator('[data-group-target-branch-player-id]').nth(1).getAttribute("data-group-target-status"), { timeout: 20_000 }).toBe("CURRENT");
    const after = await graphGeometry(page, seed, viewport, testInfo);
    expect(after.rootEventId).toBe(before.rootEventId);
    for (const key of ["left", "top", "right", "bottom"]) expect(Math.abs(after.card[key] - before.card[key])).toBeLessThanOrEqual(1);
    expect(after.branches.map(({ status }) => status)).toEqual(["RESOLVED", "CURRENT", "PENDING"]);
    expect(after.branches[0].outcome).toBe("DAMAGED");
    const advancedView = await roomView(request, seed, 0);
    expect(JSON.stringify(advancedView)).not.toContain(seed.hidden[0].id);
    expect(JSON.stringify(advancedView)).not.toContain(seed.hidden[1].id);

    if (cardKind === "RainingArrows" && viewport.width === 390) {
      const secondAnchor = page.locator(`[data-player-anchor="${seed.players[2].id}"]`);
      await secondAnchor.evaluate((element) => { element.style.display = "none"; });
      await expect(rootGraph).toHaveAttribute("data-root-action-ready", "false");
      await expect(page.locator('.interaction-stage[data-stage="GROUP_RESOLUTION"]')).toBeVisible();
      await secondAnchor.evaluate((element) => { element.style.display = ""; });
      await expect(rootGraph).toHaveAttribute("data-root-action-ready", "true");
      await expect(page.locator(".interaction-stage")).toHaveCount(0);
    }
  });
}

for (const { cardKind, viewport, reducedMotion } of [
  ...["RainingArrows", "BarbarianInvasion"].flatMap((cardKind) => [
    { cardKind, viewport: { width: 390, height: 844 }, reducedMotion: false },
    { cardKind, viewport: { width: 1440, height: 900 }, reducedMotion: true },
  ]),
]) {
  test(`${cardKind} real settlement keeps the final target graph for the designed hold at ${viewport.width}×${viewport.height}${reducedMotion ? " with reduced motion" : ""}`, async ({ page, request }, testInfo) => {
    test.setTimeout(90_000);
    await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
    await page.addInitScript(() => {
      window.__wtkGroupSettlementTrace = { eventId: null, readyAt: null, hiddenAt: null, geometry: null };
      const inspect = () => {
        const trace = window.__wtkGroupSettlementTrace;
        const overlay = document.querySelector('[data-root-action-overlay="true"][data-root-action-group-target-graph="true"]');
        const eventId = overlay?.getAttribute("data-root-action-settlement-event-id");
        if (eventId && overlay?.getAttribute("data-root-action-ready") === "true") {
          if (trace.eventId !== eventId) {
            trace.eventId = eventId;
            trace.readyAt = performance.now();
            trace.hiddenAt = null;
            trace.geometry = null;
          }
          if (trace.geometry === null) {
            const bounds = (element) => {
              const rect = element?.getBoundingClientRect();
              return rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
            };
            const svg = document.querySelector(".interaction-root-connectors");
            const screenPoint = (path, atEnd) => {
              if (!path || !svg) return null;
              const point = path.getPointAtLength(atEnd ? path.getTotalLength() : 0);
              const svgPoint = svg.createSVGPoint();
              svgPoint.x = point.x;
              svgPoint.y = point.y;
              const matrix = path.getScreenCTM();
              return matrix ? svgPoint.matrixTransform(matrix) : null;
            };
            const distanceToRect = (point, rect) => point && rect
              ? Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom))
              : Number.POSITIVE_INFINITY;
            const anchors = [...document.querySelectorAll("[data-player-anchor]")];
            const sourceId = overlay.getAttribute("data-root-action-source-id");
            const source = anchors.find((anchor) => anchor.getAttribute("data-player-anchor") === sourceId);
            const branches = [...document.querySelectorAll('[data-root-action-edge="group-target"][data-group-target-branch-player-id]')];
            const card = document.querySelector('[data-root-action-card="true"][data-group-root-action]');
            const dock = document.querySelector(".local-player-dock");
            const root = bounds(card);
            const dockBounds = bounds(dock);
            trace.geometry = {
              ready: overlay.getAttribute("data-root-action-ready"),
              settlementEventId: eventId,
              rootEventId: overlay.getAttribute("data-root-action-event-id"),
              root,
              sourceDistance: distanceToRect(screenPoint(document.querySelector('[data-root-action-edge="source"]'), false), bounds(source)),
              branches: branches.map((path) => ({
                playerId: path.getAttribute("data-group-target-branch-player-id"),
                status: path.getAttribute("data-group-target-status"),
                outcome: path.getAttribute("data-group-target-outcome"),
                distanceToSeat: distanceToRect(screenPoint(path, true), bounds(anchors.find((anchor) => anchor.getAttribute("data-player-anchor") === path.getAttribute("data-group-target-branch-player-id")))),
              })),
              anchors: anchors.map((anchor) => ({ id: anchor.getAttribute("data-player-anchor"), ...bounds(anchor) })),
              dock: dockBounds,
              cardOverlapsDock: Boolean(root && dockBounds && root.left < dockBounds.right && root.right > dockBounds.left && root.top < dockBounds.bottom && root.bottom > dockBounds.top),
              documentWidth: document.documentElement.scrollWidth,
              viewportWidth: innerWidth,
            };
          }
        } else if (trace.eventId && trace.hiddenAt === null) trace.hiddenAt = performance.now();
      };
      new MutationObserver(inspect).observe(document, { subtree: true, childList: true, attributes: true, attributeFilter: ["data-root-action-ready", "data-root-action-settlement-event-id"] });
      document.addEventListener("DOMContentLoaded", inspect);
    });
    const seed = await seedGroupGame(request, cardKind);
    await openGame(page, seed, 0, viewport);
    await playGroupCard(page, seed.root);
    const requirement = cardKind === "RainingArrows" ? "dodge" : "attack";
    const firstView = await reachFirstParticipant(request, seed, seed.players[1].id, requirement);
    expect(firstView.presentationSnapshot.groupParticipantProgress?.participants.map(({ status }) => status)).toEqual(["CURRENT", "PENDING", "PENDING"]);
    const activeOverlay = page.locator('[data-root-action-overlay="true"][data-root-action-group-target-graph="true"]');
    await expect(activeOverlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    await expect(page.locator('[data-root-action-card="true"][data-group-root-action]')).toHaveAttribute("data-group-root-action", cardKind);
    const activeGeometry = await graphGeometry(page, seed, viewport, testInfo, `${cardKind}-before-final-settlement`);

    await finishGroupWithDamageResponses(request, seed);
    const sourceView = await roomView(request, seed, 0);
    await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot.groupSettlements?.length ?? 0, { timeout: 20_000 }).toBe(1);
    const publicProof = (await roomView(request, seed, 0)).presentationSnapshot.groupSettlements[0];
    expect(publicProof).toMatchObject({
      semantics: "PROVEN",
      rootEventId: activeGeometry.rootEventId,
      rootResolutionId: sourceView.timeline.find((event) => event.id === activeGeometry.rootEventId)?.resolutionId,
      interactionId: firstView.presentationSnapshot.groupParticipantProgress.interactionId,
      groupFrameId: firstView.presentationSnapshot.groupParticipantProgress.groupFrameId,
      sourceId: seed.players[0].id,
      cardKind,
      participants: seed.players.slice(1).map((player, index) => ({ playerId: player.id, order: index + 1, status: "RESOLVED", outcome: "DAMAGED" })),
    });
    for (let viewer = 1; viewer < seed.players.length; viewer += 1) {
      const view = await roomView(request, seed, viewer);
      expect(view.presentationSnapshot.groupSettlements).toEqual([publicProof], `viewer ${viewer} receives the same public result`);
      const { myHand, ...publicView } = view;
      for (const [hiddenIndex, hiddenCard] of seed.hidden.entries()) {
        expect(myHand.some(({ id }) => id === hiddenCard.id)).toBe(viewer === hiddenIndex + 1);
        expect(JSON.stringify(publicView)).not.toContain(hiddenCard.id);
      }
    }

    await expect.poll(() => page.evaluate((eventId) => {
      const trace = window.__wtkGroupSettlementTrace;
      return trace.eventId === eventId && trace.geometry !== null;
    }, publicProof.eventId), { timeout: 20_000 }).toBe(true);
    const settledGeometry = await page.evaluate(() => window.__wtkGroupSettlementTrace.geometry);
    await testInfo.attach(`${cardKind}-settlement-${viewport.width}x${viewport.height}.json`, { body: JSON.stringify(settledGeometry, null, 2), contentType: "application/json" });
    expect(settledGeometry.ready).toBe("true");
    expect(settledGeometry.settlementEventId).toBe(publicProof.eventId);
    expect(settledGeometry.rootEventId).toBe(activeGeometry.rootEventId);
    expect(settledGeometry.branches.map(({ playerId }) => playerId)).toEqual(publicProof.participants.map(({ playerId }) => playerId));
    expect(settledGeometry.branches.map(({ status, outcome }) => ({ status, outcome }))).toEqual(publicProof.participants.map(({ status, outcome }) => ({ status, outcome })));
    expect(settledGeometry.sourceDistance).toBeLessThanOrEqual(1.5);
    expect(settledGeometry.branches.every(({ distanceToSeat }) => distanceToSeat <= 1.5)).toBe(true);
    expect(settledGeometry.cardOverlapsDock).toBe(false);
    expect(settledGeometry.documentWidth).toBeLessThanOrEqual(settledGeometry.viewportWidth);
    expect(settledGeometry.root.left).toBeCloseTo(activeGeometry.card.left, 0);
    expect(settledGeometry.root.top).toBeCloseTo(activeGeometry.card.top, 0);
    for (const anchor of settledGeometry.anchors.filter(({ id }) => id !== seed.players[0].id)) {
      const initial = activeGeometry.anchors.find(({ id }) => id === anchor.id);
      expect(initial).toBeTruthy();
      for (const key of ["left", "top", "right", "bottom"]) expect(Math.abs(anchor[key] - initial[key])).toBeLessThanOrEqual(1);
    }
    expect(settledGeometry.dock.left).toBeCloseTo(activeGeometry.dock.left, 0);
    expect(settledGeometry.dock.bottom).toBeCloseTo(activeGeometry.dock.bottom, 0);
    if (!reducedMotion) await testInfo.attach(`${cardKind}-settlement-${viewport.width}x${viewport.height}.png`, { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });

    if (reducedMotion) {
      await page.waitForFunction((eventId) => {
        const trace = window.__wtkGroupSettlementTrace;
        return trace.eventId === eventId && trace.readyAt !== null && trace.hiddenAt !== null;
      }, publicProof.eventId, { timeout: 2_000 });
      const elapsed = await page.evaluate(() => window.__wtkGroupSettlementTrace.hiddenAt - window.__wtkGroupSettlementTrace.readyAt);
      expect(elapsed).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(400);
    } else {
      const trace = await page.evaluate(() => window.__wtkGroupSettlementTrace);
      expect(trace.eventId).toBe(publicProof.eventId);
      await page.waitForFunction((eventId) => {
        const current = document.querySelector('[data-root-action-overlay="true"][data-root-action-group-target-graph="true"]');
        const trace = window.__wtkGroupSettlementTrace;
        return trace.eventId === eventId && trace.readyAt !== null && performance.now() - trace.readyAt >= 300
          && current?.getAttribute("data-root-action-ready") === "true";
      }, publicProof.eventId, { timeout: 1_000, polling: 20 });
      await page.waitForFunction((eventId) => {
        const trace = window.__wtkGroupSettlementTrace;
        return trace.eventId === eventId && trace.hiddenAt !== null;
      }, publicProof.eventId, { timeout: 1_500 });
      const elapsed = await page.evaluate(() => window.__wtkGroupSettlementTrace.hiddenAt - window.__wtkGroupSettlementTrace.readyAt);
      expect(elapsed).toBeGreaterThanOrEqual(400);
      expect(elapsed).toBeLessThanOrEqual(800);
    }
  });
}

for (const { cardKind, viewport } of [
  ...viewports.map((viewport) => ({ cardKind: "RainingArrows", viewport })),
  ...viewports.map((viewport) => ({ cardKind: "BarbarianInvasion", viewport })),
]) {
  test(`${cardKind} real Negation/counter-Negation keeps the target-effect branch attached at ${viewport.width}×${viewport.height}`, async ({ browser, page, request }, testInfo) => {
    test.setTimeout(90_000);
    const seed = await seedGroupGame(request, cardKind, { includeNegationChain: true });
    const [source, first, second, observer] = seed.players;
    const { source: firstNegation, first: counterNegation, second: laterNegation } = seed.negations;
    await openGame(page, seed, 3, viewport);
    const sourcePage = await browser.newPage({ viewport });
    await openGame(sourcePage, seed, 0, viewport);
    await playGroupCard(sourcePage, seed.root);
    await page.reload();

    const openView = await waitForNegationActor(request, seed, 0, firstNegation.id);
    expect(openView.presentationV2.groupResolution).toMatchObject({
      cardKind,
      resolutionSemantics: "GROUP",
      targetIds: [first.id, second.id, observer.id],
      currentParticipantId: first.id,
    });
    const openChain = openView.presentationV2.reactionChain;
    expect(openChain).toMatchObject({
      semantics: "PROVEN",
      nodes: [],
      groupTargetEffectScope: { cardKind, targetId: first.id, effectState: "ACTIVE" },
    });
    const openObserver = await roomView(request, seed, 3);
    expect(openObserver.currentAction.options).toBeUndefined();
    expect(JSON.stringify(openObserver)).not.toContain(counterNegation.id);
    expect(JSON.stringify(openObserver)).not.toContain(laterNegation.id);

    const overlay = page.locator('[data-root-action-overlay="true"][data-root-action-group-target-graph="true"]');
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    await expect(overlay).not.toContainText("Waiting for");
    await expect(overlay.locator('[data-root-action-response-node="true"]')).toHaveCount(0);
    await expect(sourcePage.locator(`.local-player-dock[data-player-anchor="${source.id}"] .console-guidance .decision-status strong`)).toHaveText("Play Negation or Skip.");
    const openGeometry = await graphGeometry(page, seed, viewport, testInfo, `${cardKind}-group-negation-open`);
    expect(openGeometry.rootKind).toBe(cardKind);
    expect(openGeometry.rootEffectState).toBeNull();
    expect(openGeometry.groupEffectTargetId).toBe(first.id);
    expect(openGeometry.groupEffectState).toBe("ACTIVE");
    expect(openGeometry.responseNodes).toHaveLength(0);
    expect(openGeometry.responseTethers).toHaveLength(0);
    expect(openGeometry.responseCounters).toHaveLength(0);
    expect(openGeometry.blockedBranchMarks).toBe(0);
    expect(openGeometry.branches.map(({ effectState }) => effectState)).toEqual(["ACTIVE", null, null]);

    const firstPayload = await respondWithCard(sourcePage, source.id, firstNegation.id);
    expect(firstPayload).toMatchObject({ action: "respond", cardId: firstNegation.id });
    const firstWindow = await waitForNegationActor(request, seed, 1, counterNegation.id);
    expect(firstWindow.presentationV2.reactionChain.groupTargetEffectScope).toMatchObject({
      interactionId: openChain.interactionId,
      targetId: first.id,
      effectState: "BLOCKED",
    });
    const firstProof = firstWindow.presentationV2.reactionChain;
    const firstObserver = await roomView(request, seed, 3);
    expect(firstObserver.presentationSnapshot.reactionChain).toEqual(firstWindow.presentationSnapshot.reactionChain);
    expect(firstObserver.currentAction.options).toBeUndefined();
    expect(JSON.stringify(firstObserver)).not.toContain(counterNegation.id);
    expect(JSON.stringify(firstObserver)).not.toContain(laterNegation.id);
    await page.reload();
    await expect(overlay).toHaveAttribute("data-group-target-effect-state", "BLOCKED", { timeout: 20_000 });
    await expect(overlay.locator('[data-root-action-response-node="true"]')).toHaveCount(1);

    const blockedGeometry = await graphGeometry(page, seed, viewport, testInfo, `${cardKind}-group-negation-first`);
    expect(blockedGeometry.rootEventId).toBe(openGeometry.rootEventId);
    expect(blockedGeometry.rootEffectState).toBeNull();
    expect(blockedGeometry.groupEffectTargetId).toBe(first.id);
    expect(blockedGeometry.groupEffectState).toBe("BLOCKED");
    expect(blockedGeometry.branches.map(({ effectState }) => effectState)).toEqual(["BLOCKED", null, null]);
    expect(blockedGeometry.blockedBranchMarks).toBe(1);
    expect(blockedGeometry.responseNodes).toHaveLength(1);
    expect(blockedGeometry.responseNodes[0]).toMatchObject({ index: 0, actorId: source.id, relation: "COUNTERS_GROUP_TARGET_EFFECT", active: "true" });
    expect(blockedGeometry.responseNodes[0].eventId).toBe(firstProof.publicNodeEventLinks[0].eventId);
    expect(blockedGeometry.responseTethers).toHaveLength(1);
    expect(blockedGeometry.responseTethers[0]).toMatchObject({ index: 0, actorId: source.id });
    expect(blockedGeometry.responseTethers[0].distanceToActor).toBeLessThanOrEqual(1.5);
    expect(blockedGeometry.responseCounters).toHaveLength(1);
    expect(blockedGeometry.responseCounters[0]).toMatchObject({
      index: 0,
      edge: "negation-counters-group-target-effect",
      targetPlayerId: first.id,
      active: "true",
    });
    expect(blockedGeometry.responseCounters[0].distanceToBranch).toBeLessThanOrEqual(1.5);
    expect(blockedGeometry.responseCardsInsideTable).toBe(true);
    expect(blockedGeometry.responseCardsOverlapDock).toBe(false);
    expect(blockedGeometry.responseCardsOverlapAnchors).toBe(false);

    const firstPage = await browser.newPage({ viewport });
    await openGame(firstPage, seed, 1, viewport);
    const counterPayload = await respondWithCard(firstPage, first.id, counterNegation.id);
    expect(counterPayload).toMatchObject({ action: "respond", cardId: counterNegation.id });
    const laterWindow = await waitForNegationActor(request, seed, 2, laterNegation.id);
    expect(laterWindow.presentationV2.reactionChain.groupTargetEffectScope).toMatchObject({
      interactionId: openChain.interactionId,
      targetId: first.id,
      effectState: "ACTIVE",
    });
    const finalProof = laterWindow.presentationV2.reactionChain;
    expect(finalProof.nodes).toHaveLength(2);
    expect(finalProof.publicNodeEventLinks).toHaveLength(2);
    expect(finalProof.publicNodeEventLinks.slice(0, firstProof.publicNodeEventLinks.length)).toEqual(firstProof.publicNodeEventLinks);
    const finalObserver = await roomView(request, seed, 3);
    expect(finalObserver.presentationSnapshot.reactionChain).toEqual(laterWindow.presentationSnapshot.reactionChain);
    expect(finalObserver.currentAction.options).toBeUndefined();
    expect(JSON.stringify(finalObserver)).not.toContain(laterNegation.id);
    await page.reload();
    await expect(overlay).toHaveAttribute("data-group-target-effect-state", "ACTIVE", { timeout: 20_000 });
    await expect(overlay.locator('[data-root-action-response-node="true"]')).toHaveCount(2);

    const counterGeometry = await graphGeometry(page, seed, viewport, testInfo, `${cardKind}-group-negation-counter`);
    expect(counterGeometry.rootEventId).toBe(openGeometry.rootEventId);
    expect(counterGeometry.rootEffectState).toBeNull();
    expect(counterGeometry.groupEffectTargetId).toBe(first.id);
    expect(counterGeometry.groupEffectState).toBe("ACTIVE");
    expect(counterGeometry.branches.map(({ effectState }) => effectState)).toEqual(["ACTIVE", null, null]);
    expect(counterGeometry.blockedBranchMarks).toBe(0);
    expect(counterGeometry.responseNodes).toHaveLength(2);
    expect(counterGeometry.responseNodes[0]).toMatchObject({
      index: 0,
      actorId: source.id,
      relation: "COUNTERS_GROUP_TARGET_EFFECT",
      active: "false",
    });
    expect(counterGeometry.responseNodes[1]).toMatchObject({
      index: 1,
      actorId: first.id,
      relation: "COUNTERS_RESPONSE",
      targetIndex: "0",
      active: "true",
    });
    expect(counterGeometry.responseNodes.map(({ eventId }) => eventId)).toEqual(finalProof.publicNodeEventLinks.map(({ eventId }) => eventId));
    expect(counterGeometry.responseTethers).toHaveLength(2);
    expect(counterGeometry.responseTethers.map(({ actorId }) => actorId)).toEqual([source.id, first.id]);
    expect(counterGeometry.responseTethers.every(({ distanceToActor }) => distanceToActor <= 1.5)).toBe(true);
    expect(counterGeometry.responseCounters).toHaveLength(2);
    expect(counterGeometry.responseCounters[0]).toMatchObject({
      edge: "negation-counters-group-target-effect",
      targetPlayerId: first.id,
      active: "false",
    });
    expect(counterGeometry.responseCounters[0].distanceToBranch).toBeLessThanOrEqual(1.5);
    expect(counterGeometry.responseCounters[1]).toMatchObject({
      edge: "negation-counters-response",
      targetIndex: "0",
      active: "true",
    });
    expect(counterGeometry.responseCounters[1].distanceToPreviousResponse).toBeLessThanOrEqual(1.5);
    expect(counterGeometry.responseCardsInsideTable).toBe(true);
    expect(counterGeometry.responseCardsOverlapDock).toBe(false);
    expect(counterGeometry.responseCardsOverlapAnchors).toBe(false);

    for (const next of [blockedGeometry, counterGeometry]) {
      for (const edge of ["left", "top", "right", "bottom"]) {
        expect(Math.abs(next.card[edge] - openGeometry.card[edge]), `${cardKind} ${viewport.width}px root ${edge} remains stable`).toBeLessThanOrEqual(1);
      }
      expect(next.branches.map(({ path }) => path)).toEqual(openGeometry.branches.map(({ path }) => path));
      expect(next.anchors).toEqual(openGeometry.anchors);
      expect(next.documentWidth).toBeLessThanOrEqual(next.viewportWidth);
    }
    await sourcePage.close();
    await firstPage.close();
  });
}
