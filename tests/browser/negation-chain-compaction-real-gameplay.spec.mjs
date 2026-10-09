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

async function skipNegationFromDock(page, seed, playerIndex) {
  const playerId = seed.players[playerIndex].id;
  const dock = page.locator(`.local-player-dock[data-player-anchor="${playerId}"]`);
  const skip = dock.locator('[data-action-slot="decline"] button');
  await expect(skip).toHaveText("Skip");
  await expect(skip).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && JSON.parse(response.request().postData() ?? "{}").action === "decline_response");
  await skip.click();
  const response = await submitted;
  if (!response.ok()) throw new Error(`Negation Skip failed: ${await response.text()}`);
}

async function startNegationReadWindowSampling(page, expected) {
  return page.evaluate(({ firstEventId, secondEventId, latestEventId, rootEventId }) => {
    const timing = window.__wtkNegationReadWindow = {
      startedAt: null,
      done: false,
      frames: [],
    };
    const offsets = [0, 1000, 2900, 3050, 3300];
    const hasCompleteGraph = () => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const responseIds = [...(overlay?.querySelectorAll('[data-root-action-response-node="true"]') ?? [])]
        .map((node) => node.getAttribute("data-response-event-id"));
      return overlay?.dataset.rootActionReady === "true"
        && overlay.dataset.rootActionCardKind === "Dismantle"
        && overlay.dataset.publicCounterReadEventId === latestEventId
        && responseIds.includes(firstEventId) && responseIds.includes(secondEventId)
        && overlay.querySelector('[data-root-action-edge="source"]')
        && overlay.querySelector('[data-root-action-edge="response-source"][data-response-node-index="0"]')
        && overlay.querySelector('[data-root-action-edge="response-source"][data-response-node-index="1"]')
        && overlay.querySelector('[data-root-action-edge="negation-counters-root"][data-response-node-index="0"]')
        && overlay.querySelector('[data-root-action-edge="negation-counters-response"][data-response-node-index="1"][data-counter-target-index="0"]');
    };
    const capture = (scheduledOffsetMs) => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const stage = document.querySelector('.interaction-stage');
      const effectiveOpacity = (element) => {
        let opacity = 1;
        for (let current = element; current instanceof HTMLElement || current instanceof SVGElement; current = current.parentElement) {
          opacity *= Number(getComputedStyle(current).opacity || 1);
        }
        return opacity;
      };
      const rect = (element) => {
        if (!element) return null;
        const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
        return { left, top, right, bottom, width, height };
      };
      const root = overlay?.querySelector('[data-root-action-card="true"]') ?? null;
      const nodes = [...(overlay?.querySelectorAll('[data-root-action-response-node="true"]') ?? [])];
      const paths = [...(overlay?.querySelectorAll('.interaction-root-connectors [data-root-action-edge]') ?? [])];
      const response = (eventId) => {
        const node = nodes.find((candidate) => candidate.getAttribute("data-response-event-id") === eventId);
        const opacity = node ? effectiveOpacity(node) : 0;
        const style = node ? getComputedStyle(node) : null;
        return {
          visible: Boolean(node && style?.visibility !== "hidden" && opacity > 0.3),
          opacity,
          rect: rect(node),
          actorId: node?.getAttribute("data-response-actor-id") ?? null,
          relation: node?.getAttribute("data-response-relation") ?? null,
        };
      };
      const edges = paths.map((path) => {
        return {
          edge: path.getAttribute("data-root-action-edge"),
          responseIndex: path.getAttribute("data-response-node-index"),
          counterTargetIndex: path.getAttribute("data-counter-target-index"),
          visible: effectiveOpacity(path) > 0.3 && path.getAttribute("d") !== "",
          opacity: effectiveOpacity(path),
        };
      });
      timing.frames.push({
        scheduledOffsetMs,
        elapsedMs: performance.now() - timing.startedAt,
        overlayReady: overlay?.dataset.rootActionReady === "true",
        rootEventId: overlay?.dataset.rootActionEventId ?? null,
        overlayInteractionId: overlay?.dataset.rootActionInteractionId ?? null,
        overlayRootFrameId: overlay?.dataset.rootActionRootFrameId ?? null,
        stage: stage?.dataset.stage ?? null,
        stageInteractionId: stage?.dataset.interactionId ?? null,
        rootCardKind: overlay?.dataset.rootActionCardKind ?? null,
        counterReadEventId: overlay?.dataset.publicCounterReadEventId ?? null,
        counterReadExiting: overlay?.dataset.publicCounterReadExiting === "true",
        counterReadLive: overlay?.dataset.publicCounterReadLive === "true",
        counterReadSettled: overlay?.dataset.publicCounterReadSettled === "true",
        rootCard: {
          visible: Boolean(root && getComputedStyle(root).visibility !== "hidden" && effectiveOpacity(root) > 0.3),
          opacity: root ? effectiveOpacity(root) : 0,
          kind: root?.getAttribute("data-root-action-card-face-kind") ?? null,
          rect: rect(root),
        },
        firstResponse: response(firstEventId),
        latestResponse: response(secondEventId),
        edges,
      });
    };
    let nextOffset = 0;
    const frame = () => {
      if (timing.startedAt === null) {
        if (hasCompleteGraph()) {
          timing.startedAt = performance.now();
          capture(offsets[nextOffset]);
          nextOffset += 1;
        }
        if (nextOffset < offsets.length) requestAnimationFrame(frame);
        return;
      }
      const elapsed = performance.now() - timing.startedAt;
      while (nextOffset < offsets.length && elapsed >= offsets[nextOffset]) {
        capture(offsets[nextOffset]);
        nextOffset += 1;
      }
      if (nextOffset === offsets.length) timing.done = true;
      else requestAnimationFrame(frame);
    };
    requestAnimationFrame(frame);
    return { latestEventId, rootEventId };
  }, expected);
}

test("real server-backed Negation and counter-Negation retain the complete graph for three seconds without delaying Skip", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(90_000);
  // Wide geometry isolates the timing contract from the separate mobile
  // multi-node placement limit; mobile counter-chain fit remains covered by
  // the dedicated Negation composition tests.
  const viewport = { width: 1440, height: 900 };
  const seed = await seedSingleTargetGame(request);
  const observerIndex = 3;
  const observerPage = page;
  const sourcePage = await browser.newPage({ viewport });
  const counterPage = await browser.newPage({ viewport });
  const nextResponderPage = await browser.newPage({ viewport });
  try {
    await openGame(observerPage, seed, observerIndex, viewport);
    await openGame(sourcePage, seed, 0, viewport);
    await playDismantle(sourcePage, seed.root, seed.players[1]);

    const firstResponder = await waitForNegationActor(request, seed, 0, 0);
    expect(firstResponder.currentAction.legalActions).toContain("respond");
    await respondWithNegation(sourcePage, request, seed, 0, seed.negations[0].id);

    const counterResponder = await waitForNegationActor(request, seed, 1, 1);
    expect(counterResponder.currentAction.legalActions).toContain("respond");
    await openGame(counterPage, seed, 1, viewport);
    await respondWithNegation(counterPage, request, seed, 1, seed.negations[1].id);

    const nextResponder = await waitForNegationActor(request, seed, 2, 2);
    expect(nextResponder.currentAction.legalActions).toContain("decline_response");
    await openGame(nextResponderPage, seed, 2, viewport);
    const negationGuidance = nextResponderPage.locator(`.local-player-dock[data-player-anchor="${seed.players[2].id}"] .console-guidance .decision-status`);
    await expect(negationGuidance.locator("strong")).toHaveText("Play Negation or Skip.");
    const skip = nextResponderPage.locator(`.local-player-dock[data-player-anchor="${seed.players[2].id}"] [data-action-slot="decline"] button`);
    await expect(skip).toHaveText("Skip");
    await expect(skip).toBeEnabled();

    const observerView = await roomView(request, seed, observerIndex);
    const chain = observerView.presentationV2.reactionChain;
    expect(chain).toMatchObject({ semantics: "PROVEN" });
    expect(chain.nodes).toHaveLength(2);
    expect(chain.publicEventLinks.nodes).toHaveLength(2);
    const responseEventIds = chain.publicEventLinks.nodes.map(({ eventId }) => eventId);
    expect(new Set(responseEventIds).size).toBe(2);
    for (const eventId of responseEventIds) {
      expect(observerView.timeline.filter((event) => event.id === eventId && event.type === "card" && event.card.kind === "Negation")).toHaveLength(1);
    }
    expect(observerView.currentAction?.options).toBeUndefined();
    expect(JSON.stringify(observerView)).not.toContain(seed.negations[2].id);
    await testInfo.attach("negation-counter-server-proof-routing.json", {
      body: JSON.stringify({
        clientFields: {
          interaction: observerView.presentationSnapshot?.interaction,
          rootAction: observerView.presentationSnapshot?.rootAction,
          reactionChain: observerView.presentationSnapshot?.reactionChain,
          v2Chain: observerView.presentationV2?.reactionChain,
        },
        responseEvents: responseEventIds.map((eventId) => observerView.timeline.find((event) => event.id === eventId)),
      }, null, 2),
      contentType: "application/json",
    });

    // This viewer joins after both public responses have committed. The local
    // three-second clock therefore starts from its own first complete graph,
    // not the server event's earlier timestamp.
    await observerPage.reload();
    await expect(observerPage.locator(".game-shell")).toBeVisible();
    const renderedBeforeSampling = await observerPage.evaluate(() => ({
      stage: Object.fromEntries(Array.from(document.querySelector('.interaction-stage')?.attributes ?? []).map(({ name, value }) => [name, value])),
      overlay: document.querySelector('[data-root-action-overlay="true"]')?.outerHTML.slice(0, 2000) ?? null,
    }));
    await testInfo.attach("negation-counter-rendered-routing.json", {
      body: JSON.stringify(renderedBeforeSampling, null, 2),
      contentType: "application/json",
    });
    const latestEventId = responseEventIds.at(-1);
    const firstEventId = responseEventIds[0];
    const latestActorId = seed.players[1].id;
    const sampling = await startNegationReadWindowSampling(observerPage, {
      firstEventId,
      secondEventId: latestEventId,
      latestEventId,
      rootEventId: chain.publicEventLinks.root.eventId,
    });
    await expect.poll(() => observerPage.evaluate(() => window.__wtkNegationReadWindow?.frames.length ?? 0), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
    const screenshotAtZero = await observerPage.screenshot({ animations: "disabled" });
    await testInfo.attach("negation-counter-public-read-0ms.png", { body: screenshotAtZero, contentType: "image/png" });

    // The next authoritative responder can submit Skip immediately; the public
    // read window is not a server-side response delay.
    await skipNegationFromDock(nextResponderPage, seed, 2);
    await expect.poll(async () => (await activeNegationActor(request, seed))?.playerIndex ?? null, { timeout: 10_000 }).toBe(3);
    const afterSkipProjection = await roomView(request, seed, observerIndex);
    expect(afterSkipProjection.presentationSnapshot?.interaction).toMatchObject({
      semantics: "PROVEN",
      interactionId: chain.interactionId,
      rootFrameId: chain.frameId,
      stage: "NEGATION",
    });
    expect(afterSkipProjection.presentationSnapshot?.reactionChain?.publicEventLinks).toEqual(chain.publicEventLinks);
    await testInfo.attach("negation-counter-after-skip-projection.json", {
      body: JSON.stringify({
        interaction: afterSkipProjection.presentationSnapshot?.interaction,
        chain: afterSkipProjection.presentationSnapshot?.reactionChain,
        settlement: afterSkipProjection.presentationSnapshot?.settlement,
      }, null, 2),
      contentType: "application/json",
    });

    await expect.poll(() => observerPage.evaluate(() => window.__wtkNegationReadWindow?.frames.length ?? 0), { timeout: 2_000 }).toBeGreaterThanOrEqual(2);
    const screenshotAtOneSecond = await observerPage.screenshot({ animations: "disabled" });
    await testInfo.attach("negation-counter-public-read-1000ms.png", { body: screenshotAtOneSecond, contentType: "image/png" });
    await expect.poll(() => observerPage.evaluate(() => window.__wtkNegationReadWindow?.frames.length ?? 0), { timeout: 3_000 }).toBeGreaterThanOrEqual(3);
    const screenshotAt2900 = await observerPage.screenshot({ animations: "disabled" });
    await testInfo.attach("negation-counter-public-read-2900ms.png", { body: screenshotAt2900, contentType: "image/png" });
    await expect.poll(() => observerPage.evaluate(() => window.__wtkNegationReadWindow?.done ?? false), { timeout: 2_000 }).toBe(true);

    const timing = await observerPage.evaluate(() => window.__wtkNegationReadWindow);
    await testInfo.attach("negation-counter-public-read-timing.json", {
      body: JSON.stringify({ sampling, responseEventIds, frames: timing.frames }, null, 2),
      contentType: "application/json",
    });
    expect(timing.frames.map(({ scheduledOffsetMs }) => scheduledOffsetMs)).toEqual([0, 1000, 2900, 3050, 3300]);
    for (const frame of timing.frames.slice(0, 3)) {
      expect(frame.elapsedMs).toBeGreaterThanOrEqual(frame.scheduledOffsetMs - 50);
      expect(frame.elapsedMs).toBeLessThanOrEqual(frame.scheduledOffsetMs + 200);
      expect(frame).toMatchObject({
        overlayReady: true,
        rootEventId: chain.publicEventLinks.root.eventId,
        rootCardKind: "Dismantle",
        counterReadEventId: latestEventId,
        rootCard: { visible: true, kind: "Dismantle" },
        firstResponse: { visible: true, actorId: seed.players[0].id, relation: "COUNTERS_ROOT" },
        latestResponse: { visible: true, actorId: latestActorId, relation: "COUNTERS_RESPONSE" },
      });
      expect(frame.rootCard.rect.width).toBeGreaterThan(0);
      expect(frame.firstResponse.rect.width).toBeGreaterThan(0);
      expect(frame.latestResponse.rect.width).toBeGreaterThan(0);
      expect(frame.edges).toEqual(expect.arrayContaining([
        expect.objectContaining({ edge: "source", visible: true }),
        expect.objectContaining({ edge: "response-source", responseIndex: "0", visible: true }),
        expect.objectContaining({ edge: "response-source", responseIndex: "1", visible: true }),
        expect.objectContaining({ edge: "negation-counters-root", responseIndex: "0", visible: true }),
        expect.objectContaining({ edge: "negation-counters-response", responseIndex: "1", counterTargetIndex: "0", visible: true }),
      ]));
    }
    expect(timing.frames[2].counterReadExiting).toBe(false);
    for (const frame of timing.frames.slice(3)) {
      expect(frame.counterReadExiting, "an unresolved Negation window keeps its readable public graph instead of fading on a timer").toBe(false);
      expect(frame.counterReadSettled).toBe(false);
      expect(frame).toMatchObject({
        overlayReady: true,
        rootEventId: chain.publicEventLinks.root.eventId,
        counterReadEventId: latestEventId,
        rootCard: { visible: true },
        firstResponse: { visible: true },
        latestResponse: { visible: true },
      });
      expect(frame.edges.every(({ visible }) => visible)).toBe(true);
    }
    const afterSkipView = await roomView(request, seed, 3);
    expect(afterSkipView.currentAction).toMatchObject({ kind: "response", requirement: "negate" });
    await expect(observerPage.locator(`[data-root-action-overlay="true"][data-public-counter-read-event-id="${latestEventId}"]`)).toHaveCount(1);
  } finally {
    await Promise.all([sourcePage.close(), counterPage.close(), nextResponderPage.close()]);
  }
});

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
  if (expected.accessibleDescription) {
    await expect(overlay).toHaveAttribute("aria-label", expected.accessibleDescription);
    await expect(page.getByRole("img", { name: /SOURCE played Burning Bridges targeting TARGET.*4 earlier committed Negation responses collapsed.*FIFTH played Negation to counter Negation 4/ })).toHaveCount(1);
    await expect(overlay.getByRole("img")).toHaveCount(0);
  }
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
      accessibleDescription: "SOURCE played Burning Bridges targeting TARGET. 4 earlier committed Negation responses collapsed. FIFTH played Negation to counter Negation 4.",
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
