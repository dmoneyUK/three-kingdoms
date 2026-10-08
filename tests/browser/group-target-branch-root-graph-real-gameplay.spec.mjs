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

async function seedGroupGame(request, cardKind) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const root = card(cardKind, `group-branch-root-${suffix}`);
  const hidden = [card("Peach", `group-branch-hidden-a-${suffix}`), card("Peach", `group-branch-hidden-b-${suffix}`)];
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [root] },
        { name: "FIRST", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [hidden[0]] },
        { name: "SECOND", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [hidden[1]] },
        { name: "THIRD", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`seed ${cardKind} game failed: ${await response.text()}`);
  return { ...(await response.json()), root, hidden };
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

async function graphGeometry(page, seed, viewport, testInfo) {
  const overlay = page.locator('[data-root-action-overlay="true"][data-root-action-group-target-graph="true"]');
  await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
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
    const branches = [...document.querySelectorAll("[data-group-target-branch-player-id]")];
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
    return {
      rootKind: cardElement?.getAttribute("data-group-root-action") ?? null,
      rootEventId: document.querySelector('[data-root-action-overlay="true"]')?.getAttribute("data-root-action-event-id") ?? null,
      sourceId,
      card: cardBounds,
      table: tableBounds,
      dock: dockBounds,
      stage: stageBounds,
      anchors: anchors.map((anchor) => ({ id: anchor.getAttribute("data-player-anchor"), ...bounds(anchor) })),
      branches: branchGeometry,
      sourceDistanceToAnchor,
      overlayPointerEvents: getComputedStyle(document.querySelector('[data-root-action-overlay="true"]')).pointerEvents,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      cardOverlapsDock: intersects(cardBounds, dockBounds),
      cardOverlapsAnchor: anchors.some((anchor) => intersects(cardBounds, bounds(anchor))),
      currentBranchCount: branches.filter((path) => path.getAttribute("data-group-target-active") === "true").length,
      uniqueBranchIds: new Set(branches.map((path) => path.getAttribute("data-group-target-branch-player-id"))).size,
      expectedIds,
    };
  }, { expectedIds: seed.players.slice(1).map(({ id }) => id) });
  const initialAnchors = await page.evaluate(() => window.__wtkGroupGraphInitialAnchors);
  await testInfo.attach(`group-root-graph-${viewport.width}x${viewport.height}.png`, { body: await page.screenshot(), contentType: "image/png" });
  await testInfo.attach(`group-root-graph-${viewport.width}x${viewport.height}.json`, { body: JSON.stringify({ geometry, initialAnchors }, null, 2), contentType: "application/json" });

  expect(geometry.card).not.toBeNull();
  expect(geometry.table).not.toBeNull();
  expect(geometry.rootEventId).toBeTruthy();
  expect(geometry.overlayPointerEvents).toBe("none");
  expect(geometry.anchors).toHaveLength(seed.players.length);
  expect(geometry.branches.map(({ playerId }) => playerId)).toEqual(geometry.expectedIds);
  expect(geometry.uniqueBranchIds).toBe(geometry.expectedIds.length);
  expect(geometry.currentBranchCount).toBe(1);
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
    for (const key of ["left", "top", "right", "bottom"]) expect(Math.abs(anchor[key] - initial[key])).toBeLessThanOrEqual(1);
  }
  return geometry;
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
