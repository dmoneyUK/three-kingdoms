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

async function seedOathGame(request) {
  const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const root = card("Oath", `oath-root-${suffix}`);
  const negations = new Map([
    [0, card("Negation", `oath-negation-source-${suffix}`)],
    [1, card("Negation", `oath-negation-first-${suffix}`)],
    [2, card("Negation", `oath-negation-counter-${suffix}`)],
  ]);
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 3, maxHp: 4, hand: [root, negations.get(0)] },
        { name: "WOUNDED ONE", role: "Loyalist", hero: "sun-quan", hp: 2, maxHp: 4, hand: [negations.get(1)] },
        { name: "WOUNDED TWO", role: "Rebel", hero: "guo-jia", hp: 1, maxHp: 4, hand: [negations.get(2)] },
        { name: "HEALTHY", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`Oath seed failed: ${await response.text()}`);
  const seed = await response.json();
  return { ...seed, root, negations: new Map([...negations].map(([index, value]) => [seed.players[index].id, value])) };
}

async function roomView(request, seed, playerIndex) {
  const member = seed.players[playerIndex];
  const response = await request.get(`${API}/api/rooms?${new URLSearchParams({ code: seed.code, token: member.token })}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function currentNegationView(request, seed) {
  const views = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
  return views.find((view) => view.isMyAction
    && view.currentAction?.kind === "response"
    && view.currentAction.requirement === "negate") ?? null;
}

async function playNextAvailableNegation(request, seed, availableCards) {
  for (let attempt = 0; attempt < seed.players.length * 3; attempt += 1) {
    const view = await currentNegationView(request, seed);
    if (!view) throw new Error("The authoritative Oath Negation response window was not found.");
    const actorIndex = seed.players.findIndex((player) => player.id === view.meId);
    const member = seed.players[actorIndex];
    const negation = availableCards.get(view.meId);
    const option = negation && view.currentAction.options?.find((candidate) => candidate.providerId === "negation_card"
      && candidate.selection?.eligibleCardIds?.includes(negation.id));
    const action = negation && option && view.currentAction.legalActions.includes("respond") ? "respond" : "decline_response";
    const response = await request.post(`${API}/api/rooms`, {
      data: {
        action,
        code: seed.code,
        token: member.token,
        ...(action === "respond" ? { providerId: option.providerId, cardId: negation.id } : {}),
      },
    });
    if (!response.ok()) throw new Error(`${action} for ${member.name} failed: ${await response.text()}`);
    if (action === "respond") {
      availableCards.delete(view.meId);
      return { actorId: view.meId, card: negation };
    }
  }
  throw new Error("No unused authoritative Negation provider was reached.");
}

async function openSourceRoom(page, seed) {
  await page.setViewportSize(viewports[0]);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: seed.players[0].token, name: seed.players[0].name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function playOathFromDock(page, oathCard) {
  await page.locator(`[data-hand-card-id="${oathCard.id}"] .game-card`).click();
  const play = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(play).toContainText("Play");
  await expect(play).toBeEnabled();
  const submitted = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && JSON.parse(response.request().postData() ?? "{}").action === "play_card");
  await play.click();
  expect((await submitted).ok()).toBeTruthy();
}

async function graphGeometry(page, sourceId, expectedState, expectedResponses) {
  const overlay = page.locator('[data-root-action-overlay="true"][data-root-action-oath-simultaneous-graph="true"]');
  await expect.poll(() => overlay.getAttribute("data-root-action-ready"), { timeout: 20_000 }).toBe("true").catch(async (error) => {
    const diagnostic = await page.evaluate((sourcePlayerId) => {
      const rect = (element) => {
        const value = element?.getBoundingClientRect();
        return value ? { x: value.x, y: value.y, width: value.width, height: value.height } : null;
      };
      return {
        shell: rect(document.querySelector(".game-shell")),
        table: rect(document.querySelector(".play-table")),
        rootCard: rect(document.querySelector("[data-root-action-card-kind='Oath']")),
        responses: [...document.querySelectorAll("[data-root-action-response-node]")].map(rect),
        anchors: [...document.querySelectorAll("[data-player-anchor]")].map((element) => ({ id: element.dataset.playerAnchor, rect: rect(element) })),
        overlay: document.querySelector("[data-root-action-oath-simultaneous-graph='true']")?.outerHTML.slice(0, 800),
        rootCardStyle: document.querySelector("[data-oath-root-action='Oath']")?.getAttribute("style"),
        connectorCount: document.querySelectorAll("[data-root-action-oath-simultaneous-graph='true'] .interaction-root-connectors").length,
        responseStyle: document.querySelector("[data-root-action-response-node]")?.getAttribute("style"),
        sourcePlayerId,
      };
    }, sourceId);
    throw new Error(`${error.message}\n${JSON.stringify(diagnostic, null, 2)}`);
  });
  await expect(overlay).toHaveAttribute("data-root-effect-state", expectedState);
  await expect(overlay).toHaveAttribute("data-oath-recipient-count", "3");
  await expect(overlay.locator("[data-root-action-response-node]")).toHaveCount(expectedResponses);
  const readGeometry = () => page.evaluate((sourcePlayerId) => {
    const box = (element) => {
      const rect = element?.getBoundingClientRect();
      return rect ? { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height } : null;
    };
    const pointAt = (path, end) => {
      if (!path) return null;
      const length = path.getTotalLength();
      const point = path.getPointAtLength(end ? length : 0);
      const screen = path.getScreenCTM() ? (() => {
        const svgPoint = path.ownerSVGElement.createSVGPoint();
        svgPoint.x = point.x;
        svgPoint.y = point.y;
        const transformed = svgPoint.matrixTransform(path.getScreenCTM());
        return { x: transformed.x, y: transformed.y };
      })() : null;
      return screen;
    };
    const distanceToRect = (point, rect) => point && rect
      ? Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom))
      : Infinity;
    const overlay = document.querySelector('[data-root-action-overlay="true"][data-root-action-oath-simultaneous-graph="true"]');
    const table = box(document.querySelector(".play-table"));
    const dock = box(document.querySelector(".local-player-dock"));
    const sourceAnchor = document.querySelector(`[data-player-anchor="${sourcePlayerId}"]`);
    const root = document.querySelector('[data-oath-root-action="Oath"]');
    const sourcePath = overlay?.querySelector('[data-root-action-edge="source"]');
    const halo = overlay?.querySelector(`[data-root-action-oath-self-recipient-id='${sourcePlayerId}']`);
    const hero = document.querySelector(`.local-player-dock[data-player-anchor="${sourcePlayerId}"] .local-hero-card`);
    const branches = [...(overlay?.querySelectorAll('[data-root-action-edge="simultaneous-target"]') ?? [])].map((path) => {
      const id = path.getAttribute("data-oath-recipient-id");
      const target = document.querySelector(`[data-player-anchor="${id}"]`);
      return {
        id,
        effectState: path.getAttribute("data-oath-effect-state"),
        markerEnd: path.getAttribute("marker-end"),
        rootEndpointDistance: distanceToRect(pointAt(path, false), box(root)),
        targetEndpointDistance: distanceToRect(pointAt(path, true), box(target)),
        blockMark: overlay.querySelector(`[data-root-action-oath-recipient-blocked="true"][data-oath-recipient-id="${id}"]`) !== null,
      };
    });
    const responses = [...(overlay?.querySelectorAll("[data-root-action-response-node]") ?? [])].map((node) => box(node));
    const responseRelations = [...(overlay?.querySelectorAll("[data-root-action-response-node]") ?? [])].map((node) => ({
      relation: node.getAttribute("data-response-relation"),
      counterIndex: node.getAttribute("data-counter-target-index"),
    }));
    const rootBox = box(root);
    const sourceBox = box(sourceAnchor);
    const rootSourceEndpointDistances = [
      distanceToRect(pointAt(sourcePath, false), sourceBox),
      distanceToRect(pointAt(sourcePath, true), rootBox),
    ];
    const haloBox = box(halo);
    const heroBox = box(hero);
    return {
      viewport: { width: innerWidth, height: innerHeight },
      ready: overlay?.getAttribute("data-root-action-ready"),
      mode: overlay?.getAttribute("data-root-action-mode"),
      root: rootBox,
      table,
      dock,
      sourceCount: document.querySelectorAll(`[data-player-anchor="${sourcePlayerId}"]`).length,
      stageCount: document.querySelectorAll('.interaction-stage[data-stage="NEGATION"]').length,
      groupOverlay: overlay?.getAttribute("data-root-action-group-target-graph"),
      singleTargetId: overlay?.getAttribute("data-root-action-target-id"),
      recipientCount: overlay?.getAttribute("data-oath-recipient-count"),
      rootStyle: root?.getAttribute("style"),
      rootClass: root?.getAttribute("class"),
      overlayHidden: overlay?.getAttribute("aria-hidden"),
      branchIds: branches.map(({ id }) => id),
      branches,
      haloBox,
      heroBox,
      haloContainsHero: Boolean(haloBox && heroBox && haloBox.left <= heroBox.left && haloBox.top <= heroBox.top
        && haloBox.right >= heroBox.right && haloBox.bottom >= heroBox.bottom),
      rootSourceEndpointDistances,
      responses,
      responseRelations,
      horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
      noSequentialMarkers: overlay?.querySelector('[data-group-target-marker-for], [data-group-target-status], [data-group-target-active]') === null,
    };
  }, sourceId);
  let geometry;
  try {
    await expect.poll(async () => {
      geometry = await readGeometry();
      return geometry.ready === "true"
        && geometry.branches.length > 0
        && geometry.branches.every((branch) => branch.rootEndpointDistance <= 2 && branch.targetEndpointDistance <= 2);
    }, { timeout: 5_000, intervals: [16, 32, 64, 100] }).toBe(true);
  } catch (error) {
    throw new Error(`${error.message}\nLast Oath geometry sample: ${JSON.stringify(geometry, null, 2)}`);
  }
  return geometry;
}

async function waitForSelfHaloToFollowHero(page, sourceId) {
  await expect.poll(() => page.evaluate((playerId) => {
    const halo = document.querySelector(`[data-root-action-oath-self-recipient-id='${playerId}']`)?.getBoundingClientRect();
    const hero = document.querySelector(`.local-player-dock[data-player-anchor='${playerId}'] .local-hero-card`)?.getBoundingClientRect();
    return Boolean(halo && hero && halo.left <= hero.left && halo.top <= hero.top
      && halo.right >= hero.right && halo.bottom >= hero.bottom);
  }, sourceId), { timeout: 20_000 }).toBe(true);
}

test("real Oath Negation uses the physical-seat simultaneous root graph and exact counter links", { timeout: 120_000 }, async ({ page, request }, testInfo) => {
  const seed = await seedOathGame(request);
  const availableNegations = new Map(seed.negations);
  await openSourceRoom(page, seed);
  await playOathFromDock(page, seed.root);

  const opened = await roomView(request, seed, 0);
  expect(opened.presentationSnapshot.oathRecipientScope).toMatchObject({
    semantics: "PROVEN",
    cardKind: "Oath",
    sourceId: seed.players[0].id,
    recipientIds: seed.players.slice(0, 3).map((player) => player.id),
    effectState: "ACTIVE",
  });
  expect(opened.presentationSnapshot.oathRecipientScope.rootEventId).toBeTruthy();
  expect(opened.presentationSnapshot.oathRecipientScope.rootResolutionId).toBeTruthy();
  expect(opened.presentationSnapshot.reactionChain.rootCard).toBeNull();
  expect(opened.presentationSnapshot.interaction.targetIds).toEqual([seed.players[0].id]);

  const firstNegation = await playNextAvailableNegation(request, seed, availableNegations);
  expect(firstNegation.card.kind).toBe("Negation");
  const blocked = await roomView(request, seed, 0);
  expect(blocked.presentationSnapshot.oathRecipientScope.effectState).toBe("BLOCKED");
  expect(blocked.presentationSnapshot.reactionChain.publicNodeEventLinks).toHaveLength(1);
  await page.reload();

  let blockedGeometry = null;
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await waitForSelfHaloToFollowHero(page, seed.players[0].id);
    const geometry = await graphGeometry(page, seed.players[0].id, "BLOCKED", 1);
    expect(geometry.ready, JSON.stringify(geometry, null, 2)).toBe("true");
    expect(geometry.mode).toBe("simultaneous");
    expect(geometry.sourceCount).toBe(1);
    expect(geometry.stageCount).toBe(0);
    expect(geometry.groupOverlay).toBeNull();
    expect(geometry.singleTargetId).toBeNull();
    expect(geometry.recipientCount).toBe("3");
    expect(geometry.branchIds.sort()).toEqual(seed.players.slice(1, 3).map((player) => player.id).sort());
    expect(geometry.noSequentialMarkers).toBe(true);
    expect(geometry.haloContainsHero).toBe(true);
    expect(geometry.rootSourceEndpointDistances.every((distance) => distance <= 2)).toBe(true);
    expect(geometry.branches.every((branch) => branch.effectState === "BLOCKED" && branch.markerEnd === null && branch.blockMark)).toBe(true);
    expect(geometry.branches.every((branch) => branch.rootEndpointDistance <= 2 && branch.targetEndpointDistance <= 2)).toBe(true);
    expect(geometry.root.left).toBeGreaterThanOrEqual(geometry.table.left - 1);
    expect(geometry.root.right).toBeLessThanOrEqual(geometry.table.right + 1);
    expect(geometry.root.top).toBeGreaterThanOrEqual(geometry.table.top - 1);
    expect(geometry.root.bottom).toBeLessThanOrEqual(geometry.table.bottom + 1);
    expect(geometry.dock.top).toBeGreaterThanOrEqual(geometry.table.bottom - 1);
    expect(geometry.horizontalOverflow).toBe(false);
    expect(await page.locator(`.local-player-dock[data-player-anchor="${seed.players[0].id}"]`).count()).toBe(1);
    await expect(page.locator("[data-root-action-response-node]")).toHaveAttribute("data-response-relation", "COUNTERS_ROOT");
    if (viewport.width === viewports[0].width) blockedGeometry = geometry;
    if (viewport.width === 390 || viewport.width === 480 || viewport.width === 1440) {
      const path = testInfo.outputPath(`oath-simultaneous-blocked-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path, animations: "disabled" });
      await testInfo.attach(`oath-simultaneous-blocked-${viewport.width}x${viewport.height}`, { path });
      await testInfo.attach(`oath-simultaneous-blocked-${viewport.width}x${viewport.height}-geometry`, {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
    }
  }

  const secondNegation = await playNextAvailableNegation(request, seed, availableNegations);
  expect(secondNegation.card.kind).toBe("Negation");
  const restored = await roomView(request, seed, 0);
  expect(restored.presentationSnapshot.oathRecipientScope.effectState).toBe("ACTIVE");
  expect(restored.presentationSnapshot.reactionChain.publicNodeEventLinks).toHaveLength(2);
  await page.reload();
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    const restoredGeometry = await graphGeometry(page, seed.players[0].id, "ACTIVE", 2);
    expect(restoredGeometry.ready).toBe("true");
    expect(restoredGeometry.root.left).toBeGreaterThanOrEqual(restoredGeometry.table.left - 1);
    expect(restoredGeometry.root.right).toBeLessThanOrEqual(restoredGeometry.table.right + 1);
    expect(restoredGeometry.root.top).toBeGreaterThanOrEqual(restoredGeometry.table.top - 1);
    expect(restoredGeometry.root.bottom).toBeLessThanOrEqual(restoredGeometry.table.bottom + 1);
    expect(restoredGeometry.horizontalOverflow).toBe(false);
    expect(restoredGeometry.branches.every((branch) => branch.effectState === "ACTIVE" && branch.markerEnd !== null && !branch.blockMark)).toBe(true);
    expect(
      restoredGeometry.branches.every((branch) => branch.rootEndpointDistance <= 2 && branch.targetEndpointDistance <= 2),
      JSON.stringify({ viewport, branches: restoredGeometry.branches }, null, 2),
    ).toBe(true);
    expect(restoredGeometry.responseRelations).toEqual([
      { relation: "COUNTERS_ROOT", counterIndex: null },
      { relation: "COUNTERS_RESPONSE", counterIndex: "0" },
    ]);
    if (viewport.width === viewports[0].width) {
      expect(Math.abs(restoredGeometry.root.left - blockedGeometry.root.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(restoredGeometry.root.top - blockedGeometry.root.top)).toBeLessThanOrEqual(1);
    }
    if (viewport.width === 390 || viewport.width === 480 || viewport.width === 1440) {
      const path = testInfo.outputPath(`oath-simultaneous-active-${viewport.width}x${viewport.height}.png`);
      await page.screenshot({ path, animations: "disabled" });
      await testInfo.attach(`oath-simultaneous-active-${viewport.width}x${viewport.height}`, { path });
      await testInfo.attach(`oath-simultaneous-active-${viewport.width}x${viewport.height}-geometry`, {
        body: JSON.stringify(restoredGeometry, null, 2),
        contentType: "application/json",
      });
    }
  }
});
