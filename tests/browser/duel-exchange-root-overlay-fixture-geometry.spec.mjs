import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const API = "http://127.0.0.1:3137";
const viewports = [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

function makeCards() {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const responseAttacks = [
    ["♣", "7"], ["♦", "8"], ["♥", "9"], ["♠", "10"], ["♣", "J"],
  ].map(([suit, rank], index) => ({
    id: `duel-graph-response-${index + 1}-${suffix}`, kind: "Attack", suit, rank,
  }));
  return {
    duel: { id: `duel-graph-root-${suffix}`, kind: "Duel", suit: "♠", rank: "A" },
    responseAttacks,
    hiddenSource: { id: `duel-graph-hidden-source-${suffix}`, kind: "Peach", suit: "♥", rank: "6" },
    hiddenTarget: { id: `duel-graph-hidden-target-${suffix}`, kind: "Dodge", suit: "♦", rank: "5" },
  };
}

function inspectOrthogonalPath(path) {
  const parsed = [...path.matchAll(/([MLQ])([^MLQ]*)/g)].map(([, command, tail]) => ({
    command,
    values: tail.trim().split(/\s+/).filter(Boolean).map(Number),
  }));
  let current = null;
  let moveCount = 0;
  let diagonalSegmentCount = 0;
  let invalidRoundedBendCount = 0;
  const straightAxes = [];
  const bendRadii = [];
  const roundedElbows = [];
  let startPoint = null;
  for (const { command, values } of parsed) {
    if (command === "M") {
      moveCount += 1;
      if (values.length !== 2 || current) invalidRoundedBendCount += 1;
      current = { x: values[0], y: values[1] };
      startPoint = current;
      continue;
    }
    if (!current) {
      invalidRoundedBendCount += 1;
      continue;
    }
    if (command === "L") {
      if (values.length !== 2) {
        invalidRoundedBendCount += 1;
        continue;
      }
      const next = { x: values[0], y: values[1] };
      const horizontal = Math.abs(current.y - next.y) <= .11;
      const vertical = Math.abs(current.x - next.x) <= .11;
      if (!horizontal && !vertical) diagonalSegmentCount += 1;
      else straightAxes.push(horizontal ? "horizontal" : "vertical");
      current = next;
      continue;
    }
    if (command === "Q") {
      if (values.length !== 4) {
        invalidRoundedBendCount += 1;
        continue;
      }
      const corner = { x: values[0], y: values[1] };
      roundedElbows.push(corner);
      const next = { x: values[2], y: values[3] };
      const incomingHorizontal = Math.abs(current.y - corner.y) <= .11;
      const incomingVertical = Math.abs(current.x - corner.x) <= .11;
      const outgoingHorizontal = Math.abs(next.y - corner.y) <= .11;
      const outgoingVertical = Math.abs(next.x - corner.x) <= .11;
      const isRightAngle = (incomingHorizontal && outgoingVertical) || (incomingVertical && outgoingHorizontal);
      const incomingRadius = Math.hypot(current.x - corner.x, current.y - corner.y);
      const outgoingRadius = Math.hypot(next.x - corner.x, next.y - corner.y);
      if (!isRightAngle || incomingRadius <= 0 || outgoingRadius <= 0
        || Math.abs(incomingRadius - outgoingRadius) > .11 || Math.max(incomingRadius, outgoingRadius) > 8.11) {
        invalidRoundedBendCount += 1;
      }
      bendRadii.push(Number(((incomingRadius + outgoingRadius) / 2).toFixed(1)));
      current = next;
    }
  }
  const commandLetters = parsed.map(({ command }) => command);
  return {
    path,
    commandLetters,
    moveCount,
    startPoint,
    endPoint: current,
    straightAxes,
    roundedElbows,
    diagonalSegmentCount,
    roundedBendCount: bendRadii.length,
    bendRadii,
    invalidRoundedBendCount,
    valid: parsed.length >= 2 && moveCount === 1 && diagonalSegmentCount === 0
      && invalidRoundedBendCount === 0 && commandLetters.every((command) => ["M", "L", "Q"].includes(command)),
  };
}

async function seedDuelGame(request, delegated = false) {
  const cards = makeCards();
  const players = delegated
    ? [
      { name: "CAO CAO", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [cards.duel] },
      { name: "GUAN YU", role: "Loyalist", hero: "guan-yu", hp: 4, maxHp: 4, hand: [cards.responseAttacks[0]] },
      { name: "LIU BEI", role: "Lord", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
      { name: "SUN QUAN", role: "Renegade", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
    ]
    : [
      { name: "SOURCE", role: "Rebel", hero: "zhao-yun", hp: 4, maxHp: 4, hand: [cards.duel, cards.responseAttacks[1], cards.responseAttacks[3], cards.hiddenSource] },
      { name: "TARGET", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [cards.responseAttacks[0], cards.responseAttacks[2], cards.responseAttacks[4], cards.hiddenTarget] },
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
    const responseNodes = [...document.querySelectorAll('[data-root-action-response-node="true"]')].map((element) => ({
      rect: rect(element),
      eventId: element.dataset.responseEventId ?? null,
      ordinal: Number(element.dataset.responseOrdinal),
      actorId: element.dataset.responseActorId ?? null,
      decisionActorId: element.dataset.responseDecisionActorId ?? null,
      targetId: element.dataset.responseTargetId ?? null,
      cardFaceKind: element.dataset.responseCardFaceKind ?? null,
      physicalCardId: element.dataset.responsePhysicalCardId ?? null,
      active: element.dataset.responseActive ?? null,
      currentRound: element.dataset.responseCurrentRound ?? null,
      latest: element.dataset.responseLatest ?? null,
      round: Number(element.dataset.responseRound ?? 0) || null,
      side: element.dataset.responseSide ?? null,
      counterTargetResponseEventId: element.dataset.counterTargetResponseEventId ?? null,
      relation: element.dataset.responseRelation ?? null,
      className: element.className,
    }));
    const responseEdges = (selector) => [...document.querySelectorAll(selector)].map((element) => ({
      eventId: element.dataset.responseEventId ?? null,
      actorId: element.dataset.responseActorId ?? null,
      semanticSourceId: element.dataset.responseSemanticSourceId ?? null,
      targetId: element.dataset.responseTargetId ?? null,
      targetResponseEventId: element.dataset.counterTargetResponseEventId ?? null,
      active: element.dataset.responseActive ?? null,
      currentRound: element.dataset.responseCurrentRound ?? null,
      latest: element.dataset.responseLatest ?? null,
      round: Number(element.dataset.responseRound ?? 0) || null,
      d: element.getAttribute("d"),
      markerEnd: element.getAttribute("marker-end"),
      className: element.getAttribute("class"),
      stroke: getComputedStyle(element).stroke,
      strokeWidth: getComputedStyle(element).strokeWidth,
      opacity: getComputedStyle(element).opacity,
    }));
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    const rootCard = document.querySelector('[data-root-action-card="true"]');
    const handCardRects = [...document.querySelectorAll('.local-player-dock [data-hand-card-id] .game-card')]
      .filter((element) => element.getClientRects().length > 0).map(rect);
    return {
      root: rect(rootCard),
      rootSourceId: overlay?.dataset.rootActionSourceId ?? null,
      rootTargetId: overlay?.dataset.rootActionTargetId ?? null,
      rootEventId: overlay?.dataset.rootActionEventId ?? null,
      rootPhysicalCardId: rootCard?.dataset.rootActionPhysicalCardId ?? null,
      rootCardFaceKind: rootCard?.dataset.rootActionCardFaceKind ?? null,
      response: rect(document.querySelector('[data-root-action-response-card="true"]')),
      responseNodes,
      responseSourceEdges: responseEdges('[data-root-action-edge="response-source"]'),
      duelResponseTargetEdges: responseEdges('[data-root-action-edge="duel-response-target"]'),
      table: rect(document.querySelector(".play-table")),
      dock: rect(document.querySelector(".local-player-dock")),
      handCardRects,
      anchors: Object.fromEntries(ids.map((id) => [id, anchor(id).map(rect)])),
      sourceTether: document.querySelector('[data-root-action-edge="response-source"]')?.dataset.responseActorId ?? null,
      targetArrow: document.querySelector('[data-root-action-edge="duel-response-target"]')?.dataset.responseTargetId ?? null,
      semanticSource: document.querySelector('[data-root-action-edge="duel-response-target"]')?.dataset.responseSemanticSourceId ?? null,
      arrowMarker: document.querySelector('[data-root-action-edge="duel-response-target"]')?.getAttribute("marker-end") ?? null,
      graphReady: overlay?.dataset.rootActionReady ?? null,
      responseCount: overlay?.dataset.rootActionResponseCount ?? null,
      visibleResponseCount: overlay?.dataset.rootActionVisibleResponseCount ?? null,
      collapsedResponseCount: overlay?.dataset.rootActionCollapsedResponseCount ?? null,
      legacyActiveRevealCount: document.querySelectorAll('.table-resolution-layer .active-table-reveal').length,
      legacySettledCardCount: document.querySelectorAll('.table-resolution-layer .table-played-card').length,
      legacyActiveRevealEventIds: [...document.querySelectorAll('.table-resolution-layer .active-table-reveal[data-settlement-event-id]')].map((element) => element.dataset.settlementEventId),
      legacySettledEventIds: [...document.querySelectorAll('.table-resolution-layer .table-played-card[data-settlement-event-id]')].map((element) => element.dataset.settlementEventId),
      historySummary: rect(document.querySelector('[data-root-action-response-history="true"]')),
      historySummaryText: document.querySelector('[data-root-action-response-history="true"]')?.textContent?.trim() ?? null,
      rootSourceContextual: document.querySelector('[data-root-action-edge="source"]')?.dataset.rootActionSourceContextual ?? null,
      orthogonalDuelRouting: overlay?.dataset.rootActionOrthogonalDuelRouting ?? null,
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

async function waitForStableRootGeometry(page) {
  const geometry = await page.evaluate(() => new Promise((resolve) => {
    let previous = null;
    let stableFrames = 0;
    let frames = 0;
    const sample = () => {
      const element = document.querySelector('[data-root-action-card="true"]');
      if (!element) return resolve(null);
      const { left, top, width, height } = element.getBoundingClientRect();
      const current = { left, top, width, height };
      if (previous && Object.keys(current).every((key) => Math.abs(current[key] - previous[key]) < .05)) stableFrames += 1;
      else stableFrames = 0;
      if (stableFrames >= 3 || frames++ >= 180) return resolve(current);
      previous = current;
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }));
  expect(geometry, "Duel root card is present while measuring stable geometry").not.toBeNull();
  return geometry;
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
  expect(geometry.legacyActiveRevealCount).toBe(0);
  expect(geometry.legacySettledCardCount).toBe(0);
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

async function measureDuelConnectionEndpoints(page, { sourceId, targetId }) {
  return page.evaluate(({ sourceId, targetId }) => {
    const bounds = (element) => {
      const rect = element.getBoundingClientRect();
      return { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
    };
    const distance = (point, rect) => Math.hypot(
      Math.max(rect.left - point.x, 0, point.x - rect.right),
      Math.max(rect.top - point.y, 0, point.y - rect.bottom),
    );
    const endpoints = (path) => {
      const svg = path.ownerSVGElement;
      const svgBounds = svg.getBoundingClientRect();
      const length = path.getTotalLength();
      return [path.getPointAtLength(0), path.getPointAtLength(length)].map(({ x, y }) => ({
        x: x + svgBounds.left,
        y: y + svgBounds.top,
      }));
    };
    const marker = (path) => {
      const match = path?.getAttribute("marker-end")?.match(/url\(#([^)]+)\)/);
      const element = match ? document.getElementById(match[1]) : null;
      return element ? {
        width: Number(element.getAttribute("markerWidth")),
        height: Number(element.getAttribute("markerHeight")),
      } : null;
    };
    const route = (path) => path ? {
      d: path.getAttribute("d"),
      endpoints: endpoints(path),
      markerEnd: path.getAttribute("marker-end"),
      marker: marker(path),
      stroke: getComputedStyle(path).stroke,
      strokeWidth: Number.parseFloat(getComputedStyle(path).strokeWidth),
      opacity: Number.parseFloat(getComputedStyle(path).opacity),
      className: path.getAttribute("class"),
    } : null;
    const oneAnchor = (playerId) => {
      const matches = [...document.querySelectorAll("[data-player-anchor]")].filter((element) => element.dataset.playerAnchor === playerId);
      return matches.length === 1 ? matches[0] : null;
    };
    const rootCard = document.querySelector('[data-root-action-card="true"]');
    const rootSource = document.querySelector('[data-root-action-edge="source"]');
    const rootTarget = document.querySelector('[data-root-action-edge="root-target-context"], [data-root-action-edge="target"]');
    const sourceAnchor = oneAnchor(sourceId);
    const targetAnchor = oneAnchor(targetId);
    const root = rootCard && rootSource && rootTarget && sourceAnchor && targetAnchor ? {
      complete: true,
      sourceId,
      targetId,
      sourceTouchesSeat: Math.min(...endpoints(rootSource).map((point) => distance(point, bounds(sourceAnchor)))),
      sourceTouchesCard: Math.min(...endpoints(rootSource).map((point) => distance(point, bounds(rootCard)))),
      targetTouchesCard: Math.min(...endpoints(rootTarget).map((point) => distance(point, bounds(rootCard)))),
      targetTouchesSeat: Math.min(...endpoints(rootTarget).map((point) => distance(point, bounds(targetAnchor)))),
      sourceRoute: route(rootSource),
      targetRoute: route(rootTarget),
    } : { complete: false };
    const responses = [...document.querySelectorAll('[data-root-action-response-node="true"]')].map((node) => {
      const eventId = node.dataset.responseEventId;
      const source = [...document.querySelectorAll('[data-root-action-edge="response-source"]')]
        .find((edge) => edge.dataset.responseEventId === eventId);
      const target = [...document.querySelectorAll('[data-root-action-edge="duel-response-target"]')]
        .find((edge) => edge.dataset.responseEventId === eventId);
      const actor = source ? oneAnchor(source.dataset.responseActorId) : null;
      const targetResponse = target?.dataset.counterTargetResponseEventId
        ? [...document.querySelectorAll('[data-root-action-response-node="true"]')]
          .find((candidate) => candidate.dataset.responseEventId === target.dataset.counterTargetResponseEventId)
        : null;
      const destination = targetResponse ?? (target ? oneAnchor(target.dataset.responseTargetId) : null);
      if (!source || !target || !actor || !destination) return { eventId, complete: false };
      const card = bounds(node);
      const [sourceStart, sourceEnd] = endpoints(source);
      const [targetStart, targetEnd] = endpoints(target);
      return {
        eventId,
        complete: true,
        actorId: source.dataset.responseActorId,
        semanticSourceId: target.dataset.responseSemanticSourceId,
        targetId: target.dataset.responseTargetId,
        targetResponseEventId: target.dataset.counterTargetResponseEventId ?? null,
        sourceActive: source.dataset.responseActive,
        targetActive: target.dataset.responseActive,
        sourceSide: node.dataset.responseSide ?? null,
        actorAnchor: bounds(actor),
        targetEndpointType: targetResponse ? "response-card" : "player-anchor",
        sourceTetherTouchesActor: Math.min(distance(sourceStart, bounds(actor)), distance(sourceEnd, bounds(actor))),
        sourceTetherTouchesCard: Math.min(distance(sourceStart, card), distance(sourceEnd, card)),
        targetArrowTouchesCard: Math.min(distance(targetStart, card), distance(targetEnd, card)),
        targetArrowTouchesEndpoint: Math.min(distance(targetStart, bounds(destination)), distance(targetEnd, bounds(destination))),
        targetArrowTouchesSeat: targetResponse ? null : Math.min(distance(targetStart, bounds(destination)), distance(targetEnd, bounds(destination))),
        targetArrowTouchesResponse: targetResponse ? Math.min(distance(targetStart, bounds(targetResponse)), distance(targetEnd, bounds(targetResponse))) : null,
        targetArrowMarker: target.getAttribute("marker-end"),
        sourceRoute: route(source),
        targetRoute: route(target),
      };
    });
    return { root, responses };
  }, { sourceId, targetId });
}

async function assertDuelGraphGeometry(page, geometry, { expectedResponseIds, expectedCardIds, hiddenCardIds = [] }) {
  expect(geometry.graphReady).toBe("true");
  expect(geometry.root).not.toBeNull();
  expect(geometry.rootCardFaceKind).toBe("Duel");
  expect(geometry.responseNodes.map(({ eventId }) => eventId)).toEqual(expectedResponseIds);
  expect(geometry.responseNodes.map(({ physicalCardId }) => physicalCardId)).toEqual(expectedCardIds);
  const duelGraphEventIds = [geometry.rootEventId, ...expectedResponseIds];
  expect(duelGraphEventIds.every((eventId) => eventId && !geometry.legacyActiveRevealEventIds.includes(eventId))).toBe(true);
  expect(duelGraphEventIds.every((eventId) => eventId && !geometry.legacySettledEventIds.includes(eventId))).toBe(true);
  expect(geometry.responseSourceEdges).toHaveLength(expectedResponseIds.length);
  expect(geometry.duelResponseTargetEdges).toHaveLength(expectedResponseIds.length);
  expect(geometry.rootContextEdgeCount).toBe(1);
  expect(geometry.rootSourceContextual).toBe("true");
  expect(geometry.orthogonalDuelRouting).toBe("true");
  expect(geometry.stageCount).toBe(0);
  expect(geometry.overflow).toBeLessThanOrEqual(1);
  expect(geometry.table.bottom).toBeLessThanOrEqual(geometry.dock.top + 1);
  expect(geometry.dock.bottom).toBeLessThanOrEqual(geometry.viewportHeight + 1);
  for (const anchors of Object.values(geometry.anchors)) expect(anchors).toHaveLength(1);
  const responseCount = Number(geometry.responseCount);
  const currentRoundStart = Math.floor(Math.max(0, responseCount - 1) / 2) * 2;
  const rootParticipantMidpoint = (geometry.anchors[geometry.rootSourceId][0].left + geometry.anchors[geometry.rootSourceId][0].right
    + geometry.anchors[geometry.rootTargetId][0].left + geometry.anchors[geometry.rootTargetId][0].right) / 4;
  const currentRoundCards = geometry.responseNodes.filter(({ currentRound }) => currentRound === "true");
  const priorRoundCards = geometry.responseNodes.filter(({ currentRound }) => currentRound === "false");
  const fullResponseCard = currentRoundCards[0]?.rect;
  expect(geometry.responseNodes.every((node) => node.currentRound === (node.ordinal - 1 >= currentRoundStart ? "true" : "false")), JSON.stringify({ responseCount, currentRoundStart, nodes: geometry.responseNodes.map(({ ordinal, currentRound, latest, active, relation, round }) => ({ ordinal, currentRound, latest, active, relation, round })) })).toBe(true);
  for (const node of geometry.responseNodes) {
    const actor = geometry.anchors[node.actorId]?.[0];
    expect(actor).toBeTruthy();
    const actorCenterX = (actor.left + actor.right) / 2;
    const expectedSide = actorCenterX < rootParticipantMidpoint ? "left" : "right";
    expect(node.side).toBe(expectedSide);
    const cardCenterX = (node.rect.left + node.rect.right) / 2;
    expect(expectedSide === "left" ? cardCenterX < rootParticipantMidpoint : cardCenterX > rootParticipantMidpoint).toBe(true);
    if (node.currentRound === "true") {
      expect(node.active).toBe("true");
      expect(node.rect.width).toBeLessThanOrEqual(Math.min(...geometry.handCardRects.map(({ width }) => width)) + 1);
      expect(node.rect.height).toBeLessThanOrEqual(Math.min(...geometry.handCardRects.map(({ height }) => height)) + 1);
    } else {
      expect(node.active).toBe("false");
      expect(node.className).toContain("is-prior-round");
      expect(fullResponseCard).toBeTruthy();
      expect(node.rect.width / fullResponseCard.width).toBeGreaterThanOrEqual(.84);
      expect(node.rect.width / fullResponseCard.width).toBeLessThanOrEqual(.86);
      expect(node.rect.height / fullResponseCard.height).toBeGreaterThanOrEqual(.84);
      expect(node.rect.height / fullResponseCard.height).toBeLessThanOrEqual(.86);
    }
  }
  if (currentRoundCards.length === 2) {
    expect(Math.abs(currentRoundCards[0].rect.top - currentRoundCards[1].rect.top)).toBeLessThanOrEqual(1);
  }
  if (priorRoundCards.length === 2) {
    expect(Math.abs(priorRoundCards[0].rect.top - priorRoundCards[1].rect.top)).toBeLessThanOrEqual(1);
  }
  if (currentRoundCards.length && priorRoundCards.length) {
    expect(Math.max(...currentRoundCards.map(({ rect }) => rect.bottom))).toBeLessThan(Math.min(...priorRoundCards.map(({ rect }) => rect.top)));
  }
  const cards = [geometry.root, ...geometry.responseNodes.map(({ rect }) => rect)];
  for (const [index, box] of cards.entries()) {
    expect(box.left).toBeGreaterThanOrEqual(geometry.table.left - 1);
    expect(box.top).toBeGreaterThanOrEqual(geometry.table.top - 1);
    expect(box.right).toBeLessThanOrEqual(geometry.table.right + 1);
    expect(box.bottom).toBeLessThanOrEqual((index === 0 ? Math.max(geometry.table.bottom, geometry.dock.top) : geometry.table.bottom) + 1);
    expect(box.width).toBeLessThanOrEqual(Math.min(...geometry.handCardRects.map(({ width }) => width)) + 1);
    expect(box.height).toBeLessThanOrEqual(Math.min(...geometry.handCardRects.map(({ height }) => height)) + 1);
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
  const connections = await measureDuelConnectionEndpoints(page, {
    sourceId: geometry.rootSourceId,
    targetId: geometry.rootTargetId,
  });
  expect(connections.root.complete).toBe(true);
  expect(connections.root.sourceTouchesSeat).toBeLessThan(3);
  expect(connections.root.sourceTouchesCard).toBeLessThan(3);
  expect(connections.root.targetTouchesCard).toBeLessThan(3);
  expect(connections.root.targetTouchesSeat).toBeLessThan(3);
  expect(connections.root.targetRoute.markerEnd).toBeNull();
  expect(connections.responses).toHaveLength(expectedResponseIds.length);
  for (const [index, connection] of connections.responses.entries()) {
    expect(connection.complete).toBe(true);
    expect(connection.sourceTetherTouchesActor).toBeLessThan(3);
    expect(connection.sourceTetherTouchesCard).toBeLessThan(3);
    expect(connection.targetArrowTouchesCard).toBeLessThan(3);
    expect(connection.targetArrowTouchesEndpoint).toBeLessThan(3);
    if (connection.targetResponseEventId) {
      expect(connection.targetArrowTouchesResponse).toBeLessThan(3);
      expect(connection.targetArrowTouchesSeat).toBeNull();
    } else {
      expect(connection.targetArrowTouchesSeat).toBeLessThan(3);
    }
    expect(connection.targetArrowMarker).toContain("url(#");
    expect(connection.sourceRoute.stroke).toBe("rgb(166, 224, 197)");
    expect(connection.targetRoute.stroke).toBe("rgb(255, 75, 75)");
    expect(connection.sourceRoute.opacity).toBeLessThanOrEqual(geometry.responseNodes[index].currentRound === "true" ? 1 : .4);
    expect(connection.targetRoute.opacity).toBeLessThanOrEqual(index === connections.responses.length - 1 ? 1 : .4);
  }
  const routes = [
    { edge: "root-source", route: connections.root.sourceRoute },
    { edge: "root-target", route: connections.root.targetRoute },
    ...connections.responses.flatMap(({ eventId, sourceRoute, targetRoute }) => [
      { edge: "response-source", eventId, route: sourceRoute },
      { edge: "response-target", eventId, route: targetRoute },
    ]),
  ];
  for (const item of routes) {
    expect(item.route).not.toBeNull();
    item.geometry = inspectOrthogonalPath(item.route.d);
    expect(item.geometry.valid, `${item.edge} ${item.eventId ?? ""}: ${item.route.d}`).toBe(true);
    expect(item.geometry.roundedBendCount).toBeLessThanOrEqual(item.edge.startsWith("response-") ? 3 : 2);
    expect(item.route.strokeWidth).toBeGreaterThan(0);
  }
  const latest = connections.responses.at(-1);
  expect(latest.sourceRoute.stroke).toBe("rgb(166, 224, 197)");
  expect(latest.sourceRoute.strokeWidth).toBeGreaterThanOrEqual(5.5);
  expect(latest.sourceRoute.strokeWidth).toBeLessThanOrEqual(6.5);
  expect(latest.sourceRoute.markerEnd).toBeNull();
  expect(latest.targetRoute.stroke).toBe("rgb(255, 75, 75)");
  expect(latest.targetRoute.strokeWidth).toBeGreaterThanOrEqual(6);
  expect(latest.targetRoute.strokeWidth).toBeLessThanOrEqual(8);
  expect(latest.targetRoute.marker).toEqual({ width: 30, height: 22 });
  if (connections.responses.length > 1) {
    for (const [index, response] of connections.responses.entries()) {
      if (geometry.responseNodes[index].currentRound === "false") {
        expect(response.sourceRoute.opacity).toBeLessThanOrEqual(.4);
        expect(response.sourceRoute.strokeWidth).toBeLessThan(latest.sourceRoute.strokeWidth);
      }
      if (index !== connections.responses.length - 1) {
        expect(response.targetRoute.opacity).toBeLessThanOrEqual(.4);
        expect(response.targetRoute.strokeWidth).toBeLessThan(latest.targetRoute.strokeWidth);
      }
    }
  }
  const overlayHtml = await page.locator('[data-root-action-overlay="true"]').innerHTML();
  for (const hiddenCardId of hiddenCardIds) expect(overlayHtml).not.toContain(hiddenCardId);
  return { ...connections, routes };
}

for (const viewport of viewports) {
  test(`seeded fixture lays out a five-response Duel as two compact rounds at ${viewport.width}×${viewport.height}`, async ({ page, browser, request }, testInfo) => {
    test.setTimeout(120_000);
    const seed = await seedDuelGame(request);
    const [sourceId, targetId] = seed.players.slice(0, 2).map((player) => player.id);
    const playerIds = seed.players.map((player) => player.id);
    const targetPage = await browser.newPage({ viewport });
    try {
      await openGame(page, seed, 0, viewport);
      await playDuel(page, seed.cards.duel.id, "TARGET");

      const opened = await roomView(request, seed, 0);
      expect(opened.presentationSnapshot.duelExchange).toMatchObject({
        semantics: "PROVEN", responseCount: 0,
        root: { sourceId, targetId, cardKind: "Duel" }, responses: [],
      });
      const rootEvent = opened.timeline.filter((event) => event.id === opened.presentationSnapshot.duelExchange.root.eventId);
      expect(rootEvent).toHaveLength(1);
      expect(rootEvent[0].card.id).toBe(seed.cards.duel.id);
      const overlay = page.locator('[data-root-action-overlay="true"]');
      await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
      await expect(page.locator('[data-root-action-card="true"]')).toHaveAttribute("data-root-action-card-kind", "Duel");
      await expect(page.locator('[data-root-action-card="true"]')).toHaveAttribute("data-root-action-card-face-kind", "Duel");
      await expect(page.locator('[data-root-action-card="true"]')).toHaveAttribute("data-root-action-physical-card-id", seed.cards.duel.id);
      await expect(page.locator('[data-root-action-card="true"]')).toHaveAttribute("aria-label", "SOURCE played Duel targeting TARGET");
      await expect(page.locator('[data-root-action-card="true"]')).toHaveCount(1);
      await expect(page.locator('[data-root-action-edge="source"]')).toHaveCount(1);
      await expect(page.locator('[data-root-action-edge="target"]')).toHaveCount(1);
      await expect(overlay).toHaveAttribute("data-root-action-orthogonal-duel-routing", "true");
      const initialConnections = await measureDuelConnectionEndpoints(page, { sourceId, targetId });
      expect(initialConnections.root.complete).toBe(true);
      expect(initialConnections.root.targetRoute.marker).toEqual({ width: 30, height: 22 });
      for (const route of [initialConnections.root.sourceRoute, initialConnections.root.targetRoute]) {
        expect(inspectOrthogonalPath(route.d).valid, route.d).toBe(true);
      }
      await expect(page.locator('[data-root-action-response-card="true"]')).toHaveCount(0);
      await expect(page.locator('[data-root-action-edge="duel-response-target"]')).toHaveCount(0);
      await expect(page.locator(".interaction-stage")).toHaveCount(0);
      const settledRoot = await waitForStableRootGeometry(page);
      const firstRootGeometry = await snapshotGeometry(page, playerIds);
      expect(firstRootGeometry.root).not.toBeNull();
      expect(Math.abs(firstRootGeometry.root.left - settledRoot.left)).toBeLessThanOrEqual(.05);
      expect(Math.abs(firstRootGeometry.root.top - settledRoot.top)).toBeLessThanOrEqual(.05);
      expect(firstRootGeometry.response).toBeNull();
      expect(firstRootGeometry.stageCount).toBe(0);
      expect(firstRootGeometry.legacySettledEventIds).not.toContain(opened.presentationSnapshot.duelExchange.root.eventId);
      expect(firstRootGeometry.legacyActiveRevealEventIds).not.toContain(opened.presentationSnapshot.duelExchange.root.eventId);
      const publicView = await roomView(request, seed, 0);
      expect(publicView.currentAction.actorId).toBe(targetId);
      expect(publicView.currentAction.options).toBeUndefined();

      await openGame(targetPage, seed, 1, viewport);
      const sourceFrames = [];
      let finalViews = null;
      for (let index = 0; index < seed.cards.responseAttacks.length; index += 1) {
        const ordinal = index + 1;
        const responderIndex = ordinal % 2 === 1 ? 1 : 0;
        const responderPage = responderIndex === 0 ? page : targetPage;
        const physicalAttack = seed.cards.responseAttacks[index];
        await submitAttackResponse(responderPage, physicalAttack.id);
        await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot.duelExchange?.responseCount ?? 0, { timeout: 20_000 }).toBe(ordinal);

        finalViews = await Promise.all(seed.players.map((_, playerIndex) => roomView(request, seed, playerIndex)));
        const proof = finalViews[0].presentationSnapshot.duelExchange;
        expect(proof).toMatchObject({ semantics: "PROVEN", responseCount: ordinal, root: { sourceId, targetId, cardKind: "Duel" } });
        for (const view of finalViews) expect(view.presentationSnapshot.duelExchange).toEqual(proof);
        expect(JSON.stringify(proof)).not.toContain(seed.cards.duel.id);
        expect(JSON.stringify(proof)).not.toContain(physicalAttack.id);

        const responseProof = proof.responses.at(-1);
        expect(responseProof).toMatchObject({ ordinal, responseCardKind: "Attack", responseActorId: seed.players[responderIndex].id });
        const responseEvents = finalViews[0].timeline.filter((event) => event.id === responseProof.responseEventId);
        expect(responseEvents).toHaveLength(1);
        const responseEvent = responseEvents[0];
        expect(responseEvent).toMatchObject({ type: "card", action: "play", resolutionId: proof.root.resolutionId, card: { id: physicalAttack.id, kind: "Attack" } });
        expect(responseEvent.duelAttackResponse).toMatchObject({
          interactionId: proof.interactionId,
          rootFrameId: proof.rootFrameId,
          rootEventId: proof.root.eventId,
          rootResolutionId: proof.root.resolutionId,
          ordinal,
          sourceId: responseProof.sourceId,
          targetId: responseProof.targetId,
          decisionActorId: responseProof.decisionActorId,
          responseActorId: responseProof.responseActorId,
        });

        await expect(overlay).toHaveAttribute("data-root-action-ready", "true");
        await expect(overlay).toHaveAttribute("data-root-action-response-count", String(ordinal));
        await expect(overlay.locator('[data-root-action-response-node="true"]').last()).toHaveAttribute("data-response-event-id", responseProof.responseEventId);
        await waitForStableRootGeometry(page);
        const geometry = await snapshotGeometry(page, playerIds);
        const currentRoundStart = Math.floor((ordinal - 1) / 2) * 2;
        const firstVisibleIndex = Math.max(0, currentRoundStart - 2);
        const visibleProofs = proof.responses.slice(firstVisibleIndex);
        const visibleCards = seed.cards.responseAttacks.slice(firstVisibleIndex, ordinal);
        const connections = await assertDuelGraphGeometry(page, geometry, {
          expectedResponseIds: visibleProofs.map(({ responseEventId }) => responseEventId),
          expectedCardIds: visibleCards.map(({ id }) => id),
          hiddenCardIds: [seed.cards.hiddenSource.id, seed.cards.hiddenTarget.id],
        });
        expect(geometry.responseCount).toBe(String(ordinal));
        expect(geometry.visibleResponseCount).toBe(String(visibleProofs.length));
        expect(Number(geometry.collapsedResponseCount ?? 0)).toBe(firstVisibleIndex);
        expect(geometry.historySummaryText).toBe(firstVisibleIndex > 0 ? `+${firstVisibleIndex}` : null);
        expect(geometry.responseNodes.map(({ ordinal: visibleOrdinal }) => visibleOrdinal)).toEqual(visibleProofs.map(({ ordinal: visibleOrdinal }) => visibleOrdinal));
        for (const node of geometry.responseNodes) {
          expect(node.currentRound).toBe(node.ordinal - 1 >= currentRoundStart ? "true" : "false");
          expect(node.active).toBe(node.currentRound);
          if (node.currentRound === "false") expect(node.className).toContain("is-prior-round");
        }
        expect(geometry.duelResponseTargetEdges.at(-1).active).toBe("true");
        for (const [edgeIndex, previous] of geometry.duelResponseTargetEdges.entries()) {
          expect(previous.active).toBe(edgeIndex === geometry.duelResponseTargetEdges.length - 1 ? "true" : "false");
          if (edgeIndex !== geometry.duelResponseTargetEdges.length - 1) expect(previous.className).toContain("is-subdued");
        }
        expect(Math.abs(geometry.root.left - firstRootGeometry.root.left)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.root.top - firstRootGeometry.root.top), JSON.stringify({ ordinal, first: { root: firstRootGeometry.root, table: firstRootGeometry.table, dock: firstRootGeometry.dock }, current: { root: geometry.root, table: geometry.table, dock: geometry.dock } })).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.root.width - firstRootGeometry.root.width)).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.root.height - firstRootGeometry.root.height)).toBeLessThanOrEqual(1);
        const physicalOpponentAnchors = (anchors) => Object.fromEntries(playerIds
          .filter((playerId) => playerId !== sourceId)
          .map((playerId) => [playerId, anchors[playerId]]));
        expect(physicalOpponentAnchors(geometry.anchors)).toEqual(physicalOpponentAnchors(firstRootGeometry.anchors));
        expect(geometry.rootPhysicalCardId).toBe(seed.cards.duel.id);
        expect(geometry.responseNodes.at(-1).cardFaceKind).toBe("Attack");
        expect(geometry.responseNodes.at(-1).physicalCardId).toBe(physicalAttack.id);
        const graphEventIds = [proof.root.eventId, ...proof.responses.map(({ responseEventId }) => responseEventId)];
        const legacyIdsOnSource = [...geometry.legacyActiveRevealEventIds, ...geometry.legacySettledEventIds];
        expect(graphEventIds.every((eventId) => !legacyIdsOnSource.includes(eventId))).toBe(true);
        sourceFrames.push({ ordinal, responseProof, geometry, connections });
      }

      const finalProof = finalViews[0].presentationSnapshot.duelExchange;
      expect(finalProof.responses).toHaveLength(5);
      expect(finalProof.responses.map(({ ordinal }) => ordinal)).toEqual([1, 2, 3, 4, 5]);
      expect(sourceFrames.at(-1).geometry.collapsedResponseCount).toBe("2");
      const nodeFor = (frame, ordinal) => frame.geometry.responseNodes.find((node) => node.ordinal === ordinal);
      const connectionFor = (frame, ordinal) => frame.connections.responses.find((connection) => connection.eventId === finalProof.responses[ordinal - 1].responseEventId);
      for (const ordinal of [1, 2]) {
        const roundOneFull = nodeFor(sourceFrames[1], ordinal);
        const roundOnePrior = nodeFor(sourceFrames[2], ordinal);
        const roundOneStillPrior = nodeFor(sourceFrames[3], ordinal);
        expect(Math.abs(roundOneFull.rect.left + roundOneFull.rect.width / 2 - (roundOnePrior.rect.left + roundOnePrior.rect.width / 2))).toBeLessThanOrEqual(1);
        expect(roundOnePrior.rect.top).toBeGreaterThan(roundOneFull.rect.top);
        expect(roundOnePrior.rect.width / roundOneFull.rect.width).toBeCloseTo(.85, 2);
        expect(roundOneStillPrior.rect).toEqual(roundOnePrior.rect);
        const oldSourceRoute = inspectOrthogonalPath(connectionFor(sourceFrames[2], ordinal).sourceRoute.d);
        const newSourceRoute = inspectOrthogonalPath(connectionFor(sourceFrames[3], ordinal).sourceRoute.d);
        expect(newSourceRoute.straightAxes).toEqual(oldSourceRoute.straightAxes);
        expect(newSourceRoute.roundedElbows).toEqual(oldSourceRoute.roundedElbows);
        expect(Math.hypot(newSourceRoute.endPoint.x - oldSourceRoute.endPoint.x, newSourceRoute.endPoint.y - oldSourceRoute.endPoint.y)).toBeLessThanOrEqual(1);
        const oldTargetRoute = inspectOrthogonalPath(connectionFor(sourceFrames[2], ordinal).targetRoute.d);
        const newTargetRoute = inspectOrthogonalPath(connectionFor(sourceFrames[3], ordinal).targetRoute.d);
        expect(newTargetRoute.straightAxes).toEqual(oldTargetRoute.straightAxes);
        expect(newTargetRoute.roundedBendCount).toBe(oldTargetRoute.roundedBendCount);
        expect(connectionFor(sourceFrames[3], ordinal).targetResponseEventId).toBe(connectionFor(sourceFrames[2], ordinal).targetResponseEventId);
      }
      expect(Math.abs(nodeFor(sourceFrames[0], 1).rect.left - nodeFor(sourceFrames[1], 1).rect.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(nodeFor(sourceFrames[0], 1).rect.top - nodeFor(sourceFrames[1], 1).rect.top)).toBeLessThanOrEqual(1);
      expect(Math.abs(nodeFor(sourceFrames[3], 3).rect.top - nodeFor(sourceFrames[3], 4).rect.top)).toBeLessThanOrEqual(1);
      const frameThreeConnections = sourceFrames[2].connections.responses;
      const frameThreeFirstSource = inspectOrthogonalPath(connectionFor(sourceFrames[2], 1).sourceRoute.d);
      const frameThreeThirdSource = inspectOrthogonalPath(connectionFor(sourceFrames[2], 3).sourceRoute.d);
      expect(frameThreeFirstSource.straightAxes[0]).toBe("vertical");
      expect(frameThreeThirdSource.straightAxes[0]).toBe("vertical");
      expect(frameThreeFirstSource.startPoint.x).toBe(frameThreeThirdSource.startPoint.x);
      expect(frameThreeFirstSource.startPoint.y).toBe(frameThreeThirdSource.startPoint.y);
      expect(frameThreeFirstSource.roundedElbows[0].x).toBe(frameThreeThirdSource.roundedElbows[0].x);
      expect(Math.abs(frameThreeFirstSource.roundedElbows[0].y - frameThreeFirstSource.startPoint.y)).toBeGreaterThan(60);
      const frameFourSecondSource = inspectOrthogonalPath(connectionFor(sourceFrames[3], 2).sourceRoute.d);
      const frameFourFourthSource = inspectOrthogonalPath(connectionFor(sourceFrames[3], 4).sourceRoute.d);
      expect(frameFourSecondSource.straightAxes[0]).toBe("vertical");
      expect(frameFourFourthSource.straightAxes[0]).toBe("vertical");
      expect(frameFourSecondSource.startPoint.x).toBe(frameFourFourthSource.startPoint.x);
      expect(frameFourSecondSource.startPoint.y).toBe(frameFourFourthSource.startPoint.y);
      expect(frameFourSecondSource.roundedElbows[0].x).toBe(frameFourFourthSource.roundedElbows[0].x);
      expect(Math.abs(frameFourSecondSource.roundedElbows[0].y - frameFourSecondSource.startPoint.y)).toBeGreaterThan(60);
      expect(connectionFor(sourceFrames[1], 2).targetResponseEventId).toBe(finalProof.responses[0].responseEventId);
      expect(connectionFor(sourceFrames[2], 3).targetResponseEventId).toBe(finalProof.responses[1].responseEventId);
      expect(connectionFor(sourceFrames[3], 4).targetResponseEventId).toBe(finalProof.responses[2].responseEventId);
      expect(frameThreeConnections).toHaveLength(3);
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true");
      await expect(targetPage.locator('[data-root-action-response-node="true"]').last()).toHaveAttribute("data-response-event-id", finalProof.responses.at(-1).responseEventId);
      const defenderGeometry = await snapshotGeometry(targetPage, playerIds);
      const visibleProofs = finalProof.responses.slice(2);
      const visibleCards = seed.cards.responseAttacks.slice(2);
      const defenderConnections = await assertDuelGraphGeometry(targetPage, defenderGeometry, {
        expectedResponseIds: visibleProofs.map(({ responseEventId }) => responseEventId),
        expectedCardIds: visibleCards.map(({ id }) => id),
        hiddenCardIds: [seed.cards.hiddenSource.id, seed.cards.hiddenTarget.id],
      });
      expect(defenderGeometry.rootPhysicalCardId).toBe(seed.cards.duel.id);
      expect(defenderGeometry.responseNodes.at(-1).active).toBe("true");
      expect(defenderGeometry.responseNodes[0].currentRound).toBe("false");
      const sourceConnections = await measureDuelConnectionEndpoints(page, { sourceId, targetId });

      const sourceScreenshot = join(testInfo.outputDir, "duel-b1-attacker.png");
      const defenderScreenshot = join(testInfo.outputDir, "duel-b1-defender.png");
      await mkdir(testInfo.outputDir, { recursive: true });
      await page.screenshot({ path: sourceScreenshot, fullPage: true });
      await targetPage.screenshot({ path: defenderScreenshot, fullPage: true });
      await writeFile(join(testInfo.outputDir, "duel-b1-evidence.json"), JSON.stringify({
        viewport,
        root: { eventId: finalProof.root.eventId, resolutionId: finalProof.root.resolutionId, sourceId, targetId, physicalCardId: seed.cards.duel.id },
        responses: finalProof.responses.map((response) => ({
          ...response,
          physicalCardId: finalViews[0].timeline.find((event) => event.id === response.responseEventId)?.card?.id ?? null,
        })),
        viewerProofsEqual: finalViews.every((view) => JSON.stringify(view.presentationSnapshot.duelExchange) === JSON.stringify(finalProof)),
        initialRootRoutes: [initialConnections.root.sourceRoute, initialConnections.root.targetRoute].map((route) => ({
          ...route,
          geometry: inspectOrthogonalPath(route.d),
        })),
        attackerGeometryFrames: sourceFrames,
        defenderGeometry: defenderGeometry,
        attackerConnections: sourceConnections,
        defenderConnections,
        screenshots: { attacker: sourceScreenshot, defender: defenderScreenshot },
        privateIdentityLeakCheck: true,
      }, null, 2));
    } finally {
      await targetPage.close();
    }
  });
}

for (const viewport of [viewports[0], viewports[2]]) {
  test(`seeded fixture distinguishes Duel decision actor from delegated Attack submitter at ${viewport.width}px`, async ({ page, browser, request }) => {
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
      expect(delegatedView.currentAction.options.some((option) => option.providerId === "card" && option.selection?.eligibleCardIds?.includes(seed.cards.responseAttacks[0].id))).toBe(true);

      await delegatePage.reload();
      await expect(delegatePage.locator(`[data-hand-card-id="${seed.cards.responseAttacks[0].id}"] .game-card`)).toBeEnabled({ timeout: 20_000 });
      await submitAttackResponse(delegatePage, seed.cards.responseAttacks[0].id);
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
