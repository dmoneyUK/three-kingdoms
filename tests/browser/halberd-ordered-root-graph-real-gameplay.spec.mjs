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

async function seedHalberdGame(request, { secondTargetHp = 4 } = {}) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const root = card("Attack", `halberd-ordered-root-${suffix}`);
  const halberd = card("SkyPiercingHalberd", `halberd-ordered-weapon-${suffix}`);
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      deck: [],
      players: [
        { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [root], equipment: { weapon: halberd } },
        { name: "FIRST", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [card("Peach", `halberd-ordered-peach-first-${suffix}`)] },
        { name: "SECOND", role: "Rebel", hero: "zhang-fei", hp: secondTargetHp, maxHp: 4, hand: [card("Peach", `halberd-ordered-peach-second-${suffix}`)] },
        { name: "THIRD", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [card("Peach", `halberd-ordered-peach-third-${suffix}`)] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`Halberd seed failed: ${await response.text()}`);
  return { ...(await response.json()), root, halberd };
}

async function openSource(page, seed, viewport) {
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: seed.players[0].token, name: seed.players[0].name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function roomView(request, seed, playerIndex = 0) {
  const member = seed.players[playerIndex];
  const response = await request.get(`${API}/api/rooms?${new URLSearchParams({ code: seed.code, token: member.token })}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function playHalberdAttack(request, seed) {
  const before = await roomView(request, seed);
  expect(before.isMyAction).toBe(true);
  expect(before.currentAction.legalActions).toContain("play_card");
  const response = await request.post(`${API}/api/rooms`, {
    data: { action: "play_card", code: seed.code, token: seed.players[0].token, cardId: seed.root.id, targetIds: seed.players.slice(1).map(({ id }) => id) },
  });
  if (!response.ok()) throw new Error(`real Halberd Attack failed: ${await response.text()}`);
  return response.json();
}

async function declineResponse(request, seed, playerIndex = 1) {
  const before = await roomView(request, seed, playerIndex);
  expect(before.isMyAction).toBe(true);
  expect(before.currentAction.kind).toBe("response");
  expect(before.currentAction.requirement).toBe("dodge");
  expect(before.currentAction.legalActions).toContain("decline_response");
  const response = await request.post(`${API}/api/rooms`, {
    data: { action: "decline_response", code: seed.code, token: seed.players[playerIndex].token },
  });
  if (!response.ok()) throw new Error(`Halberd response decline failed: ${await response.text()}`);
  return response.json();
}

async function waitForGraphStatuses(page, expectedStatuses) {
  await expect.poll(async () => page.locator('[data-root-action-edge="ordered-target"]').evaluateAll((paths) =>
    paths.map((path) => path.getAttribute("data-ordered-target-status"))), { timeout: 20_000 })
    .toEqual(expectedStatuses);
}

async function graphState(page, expectedStatuses) {
  const overlay = page.locator('[data-root-action-overlay="true"][data-root-action-ordered-target-graph="true"][data-root-action-card-kind="Attack"]');
  await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
  await expect(overlay).toHaveAttribute("data-root-action-display-mode", "graph");
  await expect(page.locator('[data-root-action-card="true"]')).toHaveAttribute("data-halberd-ordered-root-action", "SkyPiercingHalberdAttack");
  await expect(page.locator('[data-root-action-card="true"][data-root-action-card-face-kind="Attack"]')).toHaveCount(1);
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
  await expect(page.locator(".local-player-dock")).toBeVisible();
  const state = await page.evaluate(() => {
    const rect = (element) => {
      const value = element?.getBoundingClientRect();
      return value ? { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height } : null;
    };
    const overlayNode = document.querySelector('[data-root-action-overlay="true"]');
    const svg = overlayNode?.querySelector(".interaction-root-connectors");
    const root = overlayNode?.querySelector('[data-root-action-card="true"]');
    const anchors = [...document.querySelectorAll("[data-player-anchor]")];
    const branches = [...(overlayNode?.querySelectorAll('[data-root-action-edge="ordered-target"]') ?? [])].map((path) => {
      const playerId = path.getAttribute("data-ordered-target-branch-player-id");
      const target = anchors.find((anchor) => anchor.getAttribute("data-player-anchor") === playerId);
      const end = path.getPointAtLength(path.getTotalLength());
      const screenPoint = svg.createSVGPoint();
      screenPoint.x = end.x;
      screenPoint.y = end.y;
      const matrix = path.getScreenCTM();
      const endpoint = matrix ? screenPoint.matrixTransform(matrix) : null;
      const targetRect = target?.getBoundingClientRect();
      const distanceToTarget = endpoint && targetRect
        ? Math.hypot(Math.max(targetRect.left - endpoint.x, 0, endpoint.x - targetRect.right), Math.max(targetRect.top - endpoint.y, 0, endpoint.y - targetRect.bottom))
        : Number.POSITIVE_INFINITY;
      return {
        playerId,
        order: Number(path.getAttribute("data-ordered-target-order")),
        status: path.getAttribute("data-ordered-target-status"),
        active: path.getAttribute("data-ordered-target-active"),
        distanceToTarget,
      };
    });
    const source = anchors.find((anchor) => anchor.getAttribute("data-player-anchor") === overlayNode?.getAttribute("data-root-action-source-id"));
    const sourcePath = overlayNode?.querySelector('[data-root-action-edge="source"]');
    const sourceEndpoints = sourcePath && svg ? [0, sourcePath.getTotalLength()].map((length) => {
      const point = sourcePath.getPointAtLength(length);
      const svgPoint = svg.createSVGPoint();
      svgPoint.x = point.x;
      svgPoint.y = point.y;
      const matrix = sourcePath.getScreenCTM();
      const screen = matrix ? svgPoint.matrixTransform(matrix) : null;
      return screen ? { x: screen.x, y: screen.y } : null;
    }) : [];
    const sourceRect = source?.getBoundingClientRect();
    const sourceDistance = sourceRect ? Math.min(...sourceEndpoints.filter(Boolean).map((point) => Math.hypot(
      Math.max(sourceRect.left - point.x, 0, point.x - sourceRect.right),
      Math.max(sourceRect.top - point.y, 0, point.y - sourceRect.bottom),
    ))) : Number.POSITIVE_INFINITY;
    return {
      eventId: overlayNode?.getAttribute("data-root-action-event-id"),
      interactionId: overlayNode?.getAttribute("data-root-action-interaction-id"),
      rootFrameId: overlayNode?.getAttribute("data-root-action-root-frame-id"),
      root: rect(root),
      table: rect(document.querySelector(".play-table")),
      sourceDistance,
      branches,
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
  expect(state.branches.map(({ status }) => status)).toEqual(expectedStatuses);
  expect(state.branches.map(({ order }) => order)).toEqual([1, 2, 3]);
  expect(state.branches.filter(({ active }) => active === "true")).toHaveLength(1);
  expect(state.branches.every(({ distanceToTarget }) => distanceToTarget <= 3)).toBe(true);
  expect(state.sourceDistance).toBeLessThanOrEqual(3);
  expect(state.root.left).toBeGreaterThanOrEqual(state.table.left);
  expect(state.root.right).toBeLessThanOrEqual(state.table.right);
  expect(state.documentWidth).toBeLessThanOrEqual(state.viewportWidth);
  return state;
}

for (const viewport of viewports) {
  test(`real Halberd ordered Attack graph follows server targets through response and child Dying at ${viewport.width}×${viewport.height}`, async ({ page, request }, testInfo) => {
    test.setTimeout(90_000);

    const advancing = await seedHalberdGame(request, { secondTargetHp: 1 });
    await openSource(page, advancing, viewport);
    await playHalberdAttack(request, advancing);
    const firstView = await roomView(request, advancing);
    const rootProof = firstView.presentationSnapshot.groupParticipantProgress.orderedAttackRoot;
    expect(rootProof).toMatchObject({
      semantics: "PROVEN",
      relation: "ORDERED_ATTACK_ROOT",
      rootCardId: advancing.root.id,
      physicalCardKind: "Attack",
      sourceId: advancing.players[0].id,
      targetIds: advancing.players.slice(1).map(({ id }) => id),
    });
    expect(firstView.currentAction.actorId).toBe(advancing.players[1].id);
    const initial = await graphState(page, ["CURRENT", "PENDING", "PENDING"]);
    expect(initial.eventId).toBe(rootProof.rootEventId);
    expect(initial.interactionId).toBe(rootProof.interactionId);
    expect(initial.rootFrameId).toBe(rootProof.groupFrameId);
    await testInfo.attach(`halberd-${viewport.width}-initial.png`, { body: await page.screenshot(), contentType: "image/png" });

    await declineResponse(request, advancing);
    await expect.poll(async () => (await roomView(request, advancing)).presentationSnapshot.groupParticipantProgress?.participants.map(({ status }) => status), { timeout: 20_000 })
      .toEqual(["RESOLVED", "CURRENT", "PENDING"]);
    await waitForGraphStatuses(page, ["RESOLVED", "CURRENT", "PENDING"]);
    const advanced = await graphState(page, ["RESOLVED", "CURRENT", "PENDING"]);
    expect(advanced.eventId).toBe(initial.eventId);
    expect(advanced.rootFrameId).toBe(initial.rootFrameId);
    expect(Math.abs(advanced.root.left - initial.root.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(advanced.root.top - initial.root.top)).toBeLessThanOrEqual(1);
    await testInfo.attach(`halberd-${viewport.width}-advanced.png`, { body: await page.screenshot(), contentType: "image/png" });

    await declineResponse(request, advancing, 2);
    await expect.poll(async () => {
      const view = await roomView(request, advancing);
      return {
        phase: view.phase,
        action: view.currentAction?.kind,
        statuses: view.presentationSnapshot.groupParticipantProgress?.participants.map(({ status }) => status),
      };
    }, { timeout: 20_000 }).toEqual({
      phase: "dying",
      action: "dying",
      statuses: ["RESOLVED", "PAUSED", "PENDING"],
    });
    await waitForGraphStatuses(page, ["RESOLVED", "PAUSED", "PENDING"]);
    const held = await graphState(page, ["RESOLVED", "PAUSED", "PENDING"]);
    expect(held.eventId).toBe(initial.eventId);
    expect(held.rootFrameId).toBe(initial.rootFrameId);
    expect(Math.abs(held.root.left - advanced.root.left)).toBeLessThanOrEqual(1);
    expect(Math.abs(held.root.top - advanced.root.top)).toBeLessThanOrEqual(1);
    await testInfo.attach(`halberd-${viewport.width}-child-dying.png`, { body: await page.screenshot(), contentType: "image/png" });
  });
}
