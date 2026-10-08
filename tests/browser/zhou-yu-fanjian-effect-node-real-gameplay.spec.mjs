import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const viewports = [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];
const hiddenCard = { id: "fanjian-effect-hidden-peach", kind: "Peach", suit: "♦", rank: "7" };

async function seedGame(request) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "ZHOU YU", role: "Lord", hero: "zhou-yu", hp: 3, maxHp: 3, hand: [hiddenCard] },
        { name: "TARGET", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "REBEL THREE", role: "Rebel", hero: "liu-bei", hp: 4, maxHp: 4, hand: [] },
        { name: "REBEL FOUR", role: "Rebel", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
        { name: "REBEL FIVE", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
        { name: "RENEGADE", role: "Renegade", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
      ],
    },
  });
  if (!response.ok()) throw new Error(`seed game failed: ${await response.text()}`);
  return response.json();
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

async function activateFanjian(page, source, target) {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${source.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Sowing Distrust", exact: true });
  await expect(skill).toBeEnabled();
  await skill.click();
  const targetButton = page.locator(`[data-player-anchor="${target.id}"] .opponent-hero-target`);
  await expect(targetButton).toBeEnabled();
  await targetButton.click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submitted = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "trigger"; }
    catch { return false; }
  });
  await confirm.click();
  const result = await submitted;
  if (!result.ok()) throw new Error(`Sowing Distrust failed: ${await result.text()}`);
}

async function measureEffectGraph(page, sourceId, targetId) {
  return page.evaluate(({ sourceId, targetId }) => {
    const rect = (element) => {
      if (!element) return null;
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const point = (path, atEnd) => {
      if (!path) return null;
      const local = path.getPointAtLength(atEnd ? path.getTotalLength() : 0);
      const svgPoint = path.ownerSVGElement.createSVGPoint();
      svgPoint.x = local.x;
      svgPoint.y = local.y;
      const matrix = path.getScreenCTM();
      const screen = matrix ? svgPoint.matrixTransform(matrix) : null;
      return screen ? { x: screen.x, y: screen.y } : null;
    };
    const overlaps = (left, right) => Boolean(left && right && left.left < right.right && left.right > right.left
      && left.top < right.bottom && left.bottom > right.top);
    const inside = (child, parent) => Boolean(child && parent && child.left >= parent.left - .5
      && child.top >= parent.top - .5 && child.right <= parent.right + .5 && child.bottom <= parent.bottom + .5);
    const borderPoint = (pointValue, box) => Boolean(pointValue && box
      && pointValue.x >= box.left - 2 && pointValue.x <= box.right + 2
      && pointValue.y >= box.top - 2 && pointValue.y <= box.bottom + 2
      && (Math.abs(pointValue.x - box.left) <= 2 || Math.abs(pointValue.x - box.right) <= 2
        || Math.abs(pointValue.y - box.top) <= 2 || Math.abs(pointValue.y - box.bottom) <= 2));
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    const nodeElement = overlay?.querySelector('[data-root-action-card="true"]');
    const source = rect([...document.querySelectorAll("[data-player-anchor]")].find((element) => element.dataset.playerAnchor === sourceId));
    const target = rect([...document.querySelectorAll("[data-player-anchor]")].find((element) => element.dataset.playerAnchor === targetId));
    const targetDock = rect(document.querySelector(`.local-player-dock[data-player-anchor="${targetId}"]`));
    const table = rect(document.querySelector(".play-table"));
    const dock = rect(document.querySelector(".local-player-dock"));
    const node = rect(nodeElement);
    const sourceTether = overlay?.querySelector('.interaction-root-connectors [data-root-action-edge="source"]');
    const targetArrow = overlay?.querySelector('.interaction-root-connectors [data-root-action-edge="target"]');
    const sourceStart = point(sourceTether, false);
    const sourceEnd = point(sourceTether, true);
    const targetStart = point(targetArrow, false);
    const targetEnd = point(targetArrow, true);
    const anchors = [...document.querySelectorAll("[data-player-anchor]")].map(rect);
    return {
      ready: overlay?.dataset.rootActionReady,
      nodeType: nodeElement?.dataset.rootActionNodeType,
      effectId: nodeElement?.dataset.rootActionEffectId,
      rootLabel: nodeElement?.getAttribute("aria-label"),
      rootEventId: overlay?.dataset.rootActionEventId,
      hasPhysicalCardKind: nodeElement?.hasAttribute("data-root-action-card-kind"),
      sourceId: overlay?.dataset.rootActionSourceId,
      targetId: overlay?.dataset.rootActionTargetId,
      source, target, targetDock, table, dock, node,
      nodeInsideTable: inside(node, table),
      nodeAvoidsAnchors: anchors.every((anchor) => !overlaps(node, anchor)),
      nodeAvoidsDock: !overlaps(node, dock),
      sourceStartAtSeat: borderPoint(sourceStart, source),
      sourceEndAtNode: borderPoint(sourceEnd, node),
      targetStartAtNode: borderPoint(targetStart, node),
      targetEndAtDock: borderPoint(targetEnd, targetDock),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    };
  }, { sourceId, targetId });
}

for (const viewport of viewports) {
  test(`real Sowing Distrust projects one public Effect node through both private choices at ${viewport.width}×${viewport.height}`, async ({ browser, page, request }, testInfo) => {
    test.setTimeout(120_000);
    const seed = await seedGame(request);
    const source = seed.players[0];
    const target = seed.players[1];
    const sourcePage = await browser.newPage({ viewport });
    await openGame(sourcePage, seed, 0, viewport);
    await openGame(page, seed, 1, viewport);
    await activateFanjian(sourcePage, source, target);

    let projected = await roomView(request, seed, 1);
    await expect.poll(() => roomView(request, seed, 1).then((view) => view.presentationSnapshot?.skillEffectAction ?? null), { timeout: 20_000 }).not.toBeNull();
    projected = await roomView(request, seed, 1);
    const action = projected.presentationSnapshot.skillEffectAction;
    expect(action).toMatchObject({ semantics: "PROVEN", effectId: "zhou_yu_fanjian", sourceId: source.id, targetId: target.id });
    expect(projected.currentAction).toMatchObject({ kind: "trigger", actorId: target.id, triggerEvent: "hero_choice" });
    expect(projected.currentAction.triggerOptions[0].selection.choices).toHaveLength(4);
    expect(JSON.stringify(action)).not.toContain(hiddenCard.id);

    const overlay = page.locator('[data-root-action-overlay="true"]');
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    await expect(overlay).toHaveAttribute("role", "img");
    await expect(overlay).toHaveAttribute("aria-label", "ZHOU YU used Sowing Distrust targeting TARGET.");
    await expect(page.getByRole("img", { name: /ZHOU YU used Sowing Distrust targeting TARGET/ })).toHaveCount(1);
    await expect(overlay.getByRole("img")).toHaveCount(0);
    const accessibleGraph = await overlay.getAttribute("aria-label");
    expect(accessibleGraph).not.toContain(hiddenCard.id);
    expect(accessibleGraph).not.toContain(hiddenCard.kind);
    const node = overlay.locator('[data-root-action-card="true"]');
    await expect(node).toHaveAttribute("data-root-action-node-type", "EFFECT");
    await expect(node).toHaveAttribute("data-root-action-effect-id", "zhou_yu_fanjian");
    await expect(node.locator("strong")).toHaveText("SOWING DISTRUST");
    await expect(node).toHaveAttribute("aria-label", "ZHOU YU used Sowing Distrust targeting TARGET");
    expect(await node.getAttribute("data-root-action-card-kind")).toBeNull();
    expect(await overlay.locator('[data-root-action-edge="source"]').count()).toBe(1);
    expect(await overlay.locator('[data-root-action-edge="target"]').count()).toBe(1);
    const suitGeometry = await measureEffectGraph(page, source.id, target.id);
    expect(suitGeometry.ready).toBe("true");
    expect(suitGeometry.nodeType).toBe("EFFECT");
    expect(suitGeometry.sourceId).toBe(source.id);
    expect(suitGeometry.targetId).toBe(target.id);
    expect(suitGeometry.nodeInsideTable).toBe(true);
    expect(suitGeometry.nodeAvoidsAnchors).toBe(true);
    expect(suitGeometry.nodeAvoidsDock).toBe(true);
    expect(suitGeometry.sourceStartAtSeat).toBe(true);
    expect(suitGeometry.sourceEndAtNode).toBe(true);
    expect(suitGeometry.targetStartAtNode).toBe(true);
    expect(suitGeometry.targetEndAtDock).toBe(true);
    expect(suitGeometry.documentWidth).toBe(suitGeometry.viewportWidth);

    const choiceDialog = page.getByRole("dialog", { name: "Sowing Distrust — choose a suit decision" });
    await expect(choiceDialog).toBeVisible();
    await choiceDialog.getByRole("button", { name: "♥ Heart", exact: true }).click();
    const suitSubmission = page.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").providerId === "zhou_yu_fanjian_choice"; }
      catch { return false; }
    });
    await choiceDialog.getByRole("button", { name: "Confirm choice", exact: true }).click();
    const suitResult = await suitSubmission;
    if (!suitResult.ok()) throw new Error(`Fanjian suit choice failed: ${await suitResult.text()}`);

    const cardDecision = await roomView(request, seed, 1);
    expect(cardDecision.presentationSnapshot.skillEffectAction).toEqual(action);
    expect(cardDecision.currentAction.triggerOptions[0].selection.eligibleKeys).toEqual(["hand:0"]);
    expect(JSON.stringify(cardDecision)).not.toContain(hiddenCard.id);
    const cardChoiceDialog = page.getByRole("dialog", { name: "Sowing Distrust — choose a hidden card target card selection" });
    await expect(cardChoiceDialog).toBeVisible();
    await expect(cardChoiceDialog.locator("strong")).toHaveText("SOWING DISTRUST — CHOOSE A HIDDEN CARD");
    await expect(cardChoiceDialog.getByText("Choose 1 eligible card", { exact: true })).toBeVisible();
    await expect(cardChoiceDialog.getByRole("button", { name: "Hidden hand card 1", exact: true })).toBeVisible();
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true");
    const cardGeometry = await measureEffectGraph(page, source.id, target.id);
    expect(cardGeometry.node).not.toBeNull();
    for (const edge of ["left", "top", "right", "bottom"]) {
      expect(Math.abs(cardGeometry.node[edge] - suitGeometry.node[edge]), `Effect node ${edge} stays fixed across the target choice`).toBeLessThanOrEqual(1);
    }
    expect(cardGeometry.targetEndAtDock).toBe(true);
    expect(cardGeometry.documentWidth).toBe(cardGeometry.viewportWidth);

    const screenshot = await page.screenshot({ path: testInfo.outputPath(`fanjian-effect-${viewport.width}-card-choice.png`), animations: "disabled" });
    await testInfo.attach(`fanjian-effect-${viewport.width}-card-choice`, { body: screenshot, contentType: "image/png" });
    await sourcePage.close();
  });
}

test("real Sowing Distrust holds its exact settled Effect node for 600ms, then removes it", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(120_000);
  const viewport = { width: 390, height: 844 };
  const seed = await seedGame(request);
  const source = seed.players[0];
  const target = seed.players[1];
  const sourcePage = await browser.newPage({ viewport });
  await openGame(sourcePage, seed, 0, viewport);
  await openGame(page, seed, 1, viewport);
  await activateFanjian(sourcePage, source, target);

  const overlay = page.locator('[data-root-action-overlay="true"]');
  await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
  const decisionGeometry = await measureEffectGraph(page, source.id, target.id);
  const suitDialog = page.getByRole("dialog", { name: "Sowing Distrust — choose a suit decision" });
  await suitDialog.getByRole("button", { name: "♥ Heart", exact: true }).click();
  const suitSubmission = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").providerId === "zhou_yu_fanjian_choice"; }
    catch { return false; }
  });
  await suitDialog.getByRole("button", { name: "Confirm choice", exact: true }).click();
  const suitResult = await suitSubmission;
  if (!suitResult.ok()) throw new Error(`Fanjian suit choice failed: ${await suitResult.text()}`);

  const cardChoiceDialog = page.getByRole("dialog", { name: "Sowing Distrust — choose a hidden card target card selection" });
  await expect(cardChoiceDialog).toBeVisible();
  await cardChoiceDialog.getByRole("button", { name: "Hidden hand card 1", exact: true }).click();
  const useButton = cardChoiceDialog.getByRole("button", { name: /^Use / });
  await expect(useButton).toBeEnabled();

  await page.evaluate(() => {
    window.__fanjianSettlementTiming = { shownAt: null, exitingAt: null, removedAt: null };
    const capture = () => {
      const timing = window.__fanjianSettlementTiming;
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const node = overlay?.querySelector('[data-root-action-settled="true"]');
      if (node && overlay?.dataset.rootActionReady === "true" && timing.shownAt === null) timing.shownAt = performance.now();
      if (node?.classList.contains("is-settlement-exiting") && timing.exitingAt === null) timing.exitingAt = performance.now();
      if (!node && timing.shownAt !== null && timing.removedAt === null) timing.removedAt = performance.now();
    };
    new MutationObserver(capture).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-root-action-ready", "data-root-action-settlement-exiting"],
    });
    capture();
  });
  const cardSubmission = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").providerId === "zhou_yu_fanjian_choice" && JSON.parse(response.request().postData() ?? "{}").cardKeys?.[0] === "hand:0"; }
    catch { return false; }
  });
  await useButton.click();
  const cardResult = await cardSubmission;
  if (!cardResult.ok()) throw new Error(`Fanjian hidden-card choice failed: ${await cardResult.text()}`);
  const responseBody = await cardResult.json();
  const settlement = responseBody.room.presentationSnapshot.skillEffectSettlements;
  expect(settlement).toHaveLength(1);
  expect(settlement[0]).toMatchObject({
    semantics: "PROVEN",
    effectId: "zhou_yu_fanjian",
    rootEventId: decisionGeometry.rootEventId,
    sourceId: source.id,
    targetId: target.id,
    outcome: "SUITS_DIFFERED",
  });
  expect(responseBody.room.players.find((player) => player.id === target.id).hp).toBe(3);
  expect(JSON.stringify(settlement)).not.toContain(hiddenCard.id);
  const finalEvent = responseBody.room.timeline.find((event) => event.id === settlement[0].eventId);
  expect(finalEvent).toMatchObject({
    type: "message",
    importance: "essential",
    finalResult: true,
    publicSkillEffectSettlement: { rootEventId: decisionGeometry.rootEventId, sourceId: source.id, targetId: target.id, outcome: "SUITS_DIFFERED" },
  });

  await expect(page.locator(".active-table-reveal")).toBeVisible();
  await expect(overlay).toHaveAttribute("data-root-action-ready", "false");
  await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
  const settledNode = overlay.locator('[data-root-action-card="true"]');
  await expect(settledNode).toHaveAttribute("data-root-action-settled", "true");
  await expect(settledNode).toHaveAttribute("data-root-action-settlement-event-id", settlement[0].eventId);
  await expect(settledNode).toHaveAttribute("data-root-action-settlement-outcome", "SUITS_DIFFERED");
  await expect(settledNode.locator("small")).toHaveText("RESOLVED");
  await expect(settledNode).toHaveAttribute("aria-label", /Resolved: suits differed/);
  await expect(overlay).toHaveAttribute("aria-label", "ZHOU YU used Sowing Distrust targeting TARGET. Resolved: suits differed.");
  await expect(page.getByRole("img", { name: /ZHOU YU used Sowing Distrust targeting TARGET.*Resolved: suits differed/ })).toHaveCount(1);
  const settledGeometry = await measureEffectGraph(page, source.id, target.id);
  expect(settledGeometry.ready).toBe("true");
  expect(settledGeometry.nodeInsideTable).toBe(true);
  expect(settledGeometry.nodeAvoidsAnchors).toBe(true);
  expect(settledGeometry.nodeAvoidsDock).toBe(true);
  expect(settledGeometry.sourceStartAtSeat).toBe(true);
  expect(settledGeometry.sourceEndAtNode).toBe(true);
  expect(settledGeometry.targetStartAtNode).toBe(true);
  expect(settledGeometry.targetEndAtDock).toBe(true);
  expect(settledGeometry.documentWidth).toBe(viewport.width);
  expect(decisionGeometry.rootEventId).toBe(settledGeometry.rootEventId);
  expect(Math.abs(settledGeometry.node.left - settledGeometry.table.left - (decisionGeometry.node.left - decisionGeometry.table.left))).toBeLessThanOrEqual(1);
  expect(Math.abs(settledGeometry.node.right - settledGeometry.table.left - (decisionGeometry.node.right - decisionGeometry.table.left))).toBeLessThanOrEqual(1);
  expect(Math.abs(settledGeometry.node.width - decisionGeometry.node.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(settledGeometry.node.height - decisionGeometry.node.height)).toBeLessThanOrEqual(1);
  const tableRelativeVerticalAdjustment = (settledGeometry.node.top - settledGeometry.table.top) - (decisionGeometry.node.top - decisionGeometry.table.top);
  expect(Math.abs(tableRelativeVerticalAdjustment)).toBeLessThanOrEqual(24);

  const screenshot = await page.screenshot({ path: testInfo.outputPath("fanjian-effect-settled-390.png"), animations: "disabled" });
  await testInfo.attach("fanjian-effect-settled-390", { body: screenshot, contentType: "image/png" });
  await expect(settledNode).toHaveClass(/is-settlement-exiting/);
  await expect(overlay).toHaveAttribute("data-root-action-settlement-exiting", "true");
  await expect(overlay).toHaveCount(0);
  const timing = await page.evaluate(() => window.__fanjianSettlementTiming);
  expect(timing.shownAt).not.toBeNull();
  expect(timing.exitingAt).not.toBeNull();
  expect(timing.removedAt).not.toBeNull();
  expect(timing.exitingAt - timing.shownAt).toBeGreaterThanOrEqual(400);
  expect(timing.exitingAt - timing.shownAt).toBeLessThanOrEqual(550);
  expect(timing.removedAt - timing.exitingAt).toBeGreaterThanOrEqual(120);
  expect(timing.removedAt - timing.exitingAt).toBeLessThanOrEqual(300);
  expect(timing.removedAt - timing.shownAt).toBeGreaterThanOrEqual(550);
  expect(timing.removedAt - timing.shownAt).toBeLessThanOrEqual(800);

  await page.reload();
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator('[data-root-action-overlay="true"]')).toHaveCount(0);
  await sourcePage.close();
});

test("real Sowing Distrust shortens the settled Effect hold for reduced motion", async ({ browser, page, request }) => {
  test.setTimeout(120_000);
  const viewport = { width: 390, height: 844 };
  const seed = await seedGame(request);
  const source = seed.players[0];
  const target = seed.players[1];
  const sourcePage = await browser.newPage({ viewport });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openGame(sourcePage, seed, 0, viewport);
  await openGame(page, seed, 1, viewport);
  await activateFanjian(sourcePage, source, target);

  const overlay = page.locator('[data-root-action-overlay="true"]');
  await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
  const suitDialog = page.getByRole("dialog", { name: "Sowing Distrust — choose a suit decision" });
  await expect(suitDialog).toBeVisible();
  await suitDialog.getByRole("button", { name: "♥ Heart", exact: true }).click();
  const suitSubmission = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").providerId === "zhou_yu_fanjian_choice"; }
    catch { return false; }
  });
  await suitDialog.getByRole("button", { name: "Confirm choice", exact: true }).click();
  const suitResult = await suitSubmission;
  if (!suitResult.ok()) throw new Error(`Fanjian suit choice failed: ${await suitResult.text()}`);

  const cardDialog = page.getByRole("dialog", { name: "Sowing Distrust — choose a hidden card target card selection" });
  await expect(cardDialog).toBeVisible();
  await cardDialog.getByRole("button", { name: "Hidden hand card 1", exact: true }).click();
  await page.evaluate(() => {
    window.__fanjianSettlementTiming = { shownAt: null, resolvedLabel: null, exitingAt: null, removedAt: null };
    const capture = () => {
      const timing = window.__fanjianSettlementTiming;
      const overlayElement = document.querySelector('[data-root-action-overlay="true"]');
      const node = overlayElement?.querySelector('[data-root-action-settled="true"]');
      if (node && overlayElement?.dataset.rootActionReady === "true" && timing.shownAt === null) {
        timing.shownAt = performance.now();
        timing.resolvedLabel = node.querySelector("small")?.textContent ?? null;
      }
      if (node?.classList.contains("is-settlement-exiting") && timing.exitingAt === null) timing.exitingAt = performance.now();
      if (!node && timing.shownAt !== null && timing.removedAt === null) timing.removedAt = performance.now();
    };
    new MutationObserver(capture).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-root-action-ready", "data-root-action-settlement-exiting"],
    });
    capture();
  });
  const useButton = cardDialog.getByRole("button", { name: /^Use / });
  const cardSubmission = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").cardKeys?.[0] === "hand:0"; }
    catch { return false; }
  });
  await useButton.click();
  const cardResult = await cardSubmission;
  if (!cardResult.ok()) throw new Error(`Fanjian hidden-card choice failed: ${await cardResult.text()}`);
  const resultRoom = (await cardResult.json()).room;
  expect(resultRoom.presentationSnapshot.skillEffectSettlements).toHaveLength(1);
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);

  await expect.poll(() => page.evaluate(() => window.__fanjianSettlementTiming?.shownAt ?? null)).not.toBeNull();
  await expect.poll(() => page.evaluate(() => window.__fanjianSettlementTiming?.removedAt ?? null)).not.toBeNull();
  const timing = await page.evaluate(() => window.__fanjianSettlementTiming);
  expect(timing.resolvedLabel).toBe("RESOLVED");
  expect(timing.exitingAt).toBeNull();
  expect(timing.removedAt - timing.shownAt).toBeGreaterThanOrEqual(80);
  expect(timing.removedAt - timing.shownAt).toBeLessThanOrEqual(300);
  await sourcePage.close();
});
