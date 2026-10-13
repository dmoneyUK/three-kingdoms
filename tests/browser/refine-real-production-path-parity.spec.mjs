import { devices, expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const API = "http://127.0.0.1:3137";
const inspectionEvidenceDirectory = process.env.WTK_INSPECT_EVIDENCE_DIR?.trim() ?? "";
const card = (kind, id, suit = "♠", rank = "7") => ({ id, kind, suit, rank });

async function seedGame(request, players) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 0, players },
  });
  if (!response.ok()) throw new Error(`seed game failed: ${await response.text()}`);
  return response.json();
}

async function openGame(page, seed, playerIndex, viewport = { width: 390, height: 844 }) {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function attachScreenshot(testInfo, name, page) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.screenshot({ path, animations: "disabled" });
  await testInfo.attach(name, { path, contentType: "image/png" });
}

function saveInspectionEvidence(name, content) {
  if (!inspectionEvidenceDirectory) return;
  mkdirSync(inspectionEvidenceDirectory, { recursive: true });
  writeFileSync(join(inspectionEvidenceDirectory, name), content);
}

async function saveInspectionScreenshot(page, name) {
  if (!inspectionEvidenceDirectory) return;
  mkdirSync(inspectionEvidenceDirectory, { recursive: true });
  await page.screenshot({ path: join(inspectionEvidenceDirectory, name), animations: "disabled" });
}

async function roomView(request, seed, playerIndex) {
  const member = seed.players[playerIndex];
  const query = new URLSearchParams({ code: seed.code, token: member.token });
  const response = await request.get(`${API}/api/rooms?${query}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

async function apiAction(request, seed, playerIndex, action, extra = {}) {
  const before = await roomView(request, seed, playerIndex);
  expect(before.isMyAction, `${action} is owned by this CurrentAction actor`).toBe(true);
  expect(before.currentAction.legalActions, `${action} is authorized by CurrentAction`).toContain(action);
  const response = await request.post(`${API}/api/rooms`, {
    data: { action, code: seed.code, token: seed.players[playerIndex].token, ...extra },
  });
  if (!response.ok()) throw new Error(`${action} failed: ${await response.text()}`);
  return response.json();
}

async function waitForActor(request, seed, playerIndex, requirement) {
  await expect.poll(async () => {
    const view = await roomView(request, seed, playerIndex);
    return view.isMyAction && view.currentAction?.requirement === requirement;
  }, { timeout: 15_000 }).toBe(true);
  return roomView(request, seed, playerIndex);
}

function actionResponse(page, action) {
  return page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === action; }
    catch { return false; }
  });
}

async function playDismantle(page, root, target) {
  await page.locator(`[data-hand-card-id="${root.id}"] .game-card`).click();
  await page.getByRole("button", { name: `Select ${target.name}`, exact: true }).click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = actionResponse(page, "play_card");
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(JSON.parse(submitted.request().postData() ?? "{}")).toMatchObject({
    action: "play_card", cardId: root.id, targetId: target.id,
  });
}

async function playRainingArrows(page, root) {
  await page.locator(`[data-hand-card-id="${root.id}"] .game-card`).click();
  const play = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(play).toHaveText("Play");
  const submittedPromise = actionResponse(page, "play_card");
  await play.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  expect(JSON.parse(submitted.request().postData() ?? "{}")).toMatchObject({ action: "play_card", cardId: root.id });
}

async function declineThroughPage(page, playerId) {
  const decline = page.locator(`.local-player-dock[data-player-anchor="${playerId}"] [data-action-slot="decline"] button`);
  await expect(decline).toHaveText("Skip");
  await expect(decline).toBeEnabled();
  const submittedPromise = actionResponse(page, "decline_response");
  await decline.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  return JSON.parse(submitted.request().postData() ?? "{}");
}

async function respondWithCard(page, playerId, cardId) {
  const dock = page.locator(`.local-player-dock[data-player-anchor="${playerId}"]`);
  const cardButton = dock.locator(`[data-hand-card-id="${cardId}"] .game-card`);
  await expect(cardButton).toBeEnabled();
  await cardButton.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toHaveText("Confirm");
  await expect(confirm).toBeEnabled();
  const submittedPromise = actionResponse(page, "respond");
  await confirm.click();
  const submitted = await submittedPromise;
  expect(submitted.ok()).toBeTruthy();
  return JSON.parse(submitted.request().postData() ?? "{}");
}

async function expectOpenSingleTargetNegation(page) {
  const overlay = page.locator('[data-root-action-overlay="true"]');
  await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 15_000 });
  await expect(overlay).toHaveAttribute("data-root-effect-state", "ACTIVE");
  await expect(overlay.locator('[data-root-action-card="true"][data-root-action-card-kind="Dismantle"]')).toHaveCount(1);
  await expect(overlay.locator('[data-root-action-edge="target"]')).toHaveCount(1);
  await expect(overlay.locator('[data-root-action-response-card="true"]')).toHaveCount(0);
  await expect(overlay.locator('[data-root-action-edge="response-source"]')).toHaveCount(0);
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
  return overlay;
}

async function measureNegationGraph(page, responderId = null) {
  return page.evaluate((expectedResponderId) => {
    const rect = (element) => {
      if (!element) return null;
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    const responseElements = [...document.querySelectorAll('[data-root-action-response-card="true"]')];
    const responseBoxes = responseElements.map(rect);
    const response = responseElements.at(-1) ?? null;
    const table = document.querySelector(".play-table");
    const dock = document.querySelector(".local-player-dock");
    const root = document.querySelector('[data-root-action-card="true"]');
    const responseActorId = response?.dataset.responseActorId;
    const anchor = (id) => [...document.querySelectorAll("[data-player-anchor]")].find((element) => element.dataset.playerAnchor === id) ?? null;
    const svg = document.querySelector(".interaction-root-connectors");
    const svgBounds = svg?.getBoundingClientRect();
    const connectorPoints = [...document.querySelectorAll(".interaction-root-connectors path")].map((path) => {
      const length = path.getTotalLength();
      const absolutePoint = (distance) => {
        const point = path.getPointAtLength(distance);
        return { x: point.x + (svgBounds?.left ?? 0), y: point.y + (svgBounds?.top ?? 0) };
      };
      const points = [];
      for (let distance = 0; distance <= length; distance += Math.max(4, length / 16)) {
        points.push(absolutePoint(distance));
      }
      return {
        edge: path.dataset.rootActionEdge ?? (path.hasAttribute("data-root-action-root-blocked") ? "root-block" : "block"),
        nodeIndex: path.dataset.responseNodeIndex === undefined ? null : Number(path.dataset.responseNodeIndex),
        targetIndex: path.dataset.counterTargetIndex === undefined ? null : Number(path.dataset.counterTargetIndex),
        points,
        start: absolutePoint(0),
        end: absolutePoint(length),
      };
    });
    const boxesOverlap = (a, b) => Boolean(a && b && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    return {
      source: rect(anchor(overlay?.dataset.rootActionSourceId)),
      target: rect(anchor(overlay?.dataset.rootActionTargetId)),
      responder: rect(anchor(responseActorId ?? expectedResponderId)),
      root: rect(root),
      response: rect(response),
      responses: responseBoxes,
      responseActors: responseElements.map((element) => element.dataset.responseActorId),
      responseActorBoxes: responseElements.map((element) => rect(anchor(element.dataset.responseActorId))),
      seatBoxes: [...document.querySelectorAll("[data-player-anchor]")].map(rect),
      table: rect(table),
      shell: rect(document.querySelector(".game-shell")),
      dock: rect(dock),
      rootDockOverlap: boxesOverlap(rect(root), rect(dock)),
      responseDockOverlap: responseBoxes.some((box) => boxesOverlap(box, rect(dock))),
      connectorPoints,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
      stageCount: document.querySelectorAll(".interaction-stage").length,
    };
  }, responderId);
}

function pointOnRectBorder(point, rect, tolerance = 2) {
  const withinHorizontal = point.x >= rect.left - tolerance && point.x <= rect.right + tolerance;
  const withinVertical = point.y >= rect.top - tolerance && point.y <= rect.bottom + tolerance;
  return withinHorizontal && withinVertical
    && (Math.abs(point.x - rect.left) <= tolerance || Math.abs(point.x - rect.right) <= tolerance
      || Math.abs(point.y - rect.top) <= tolerance || Math.abs(point.y - rect.bottom) <= tolerance);
}

function negationPlayers(sourceNegation, targetNegation, targetCounterNegation, thirdNegation) {
  return [
    {
      name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4,
      hand: [card("Dismantle", "real-negation-dismantle"), sourceNegation],
    },
    {
      name: "TARGET", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4,
      hand: [card("Attack", "real-negation-target-card"), targetNegation, targetCounterNegation],
    },
    { name: "THIRD", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [thirdNegation] },
    { name: "FOURTH", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
  ];
}

async function runNegationScenario({ page, request, testInfo, outcome, viewport, sourceCounters }) {
  const sourceNegation = card("Negation", `real-negation-source-${outcome}`);
  const targetNegation = card("Negation", `real-negation-target-${outcome}`);
  const targetCounterNegation = card("Negation", `real-negation-target-counter-${outcome}`);
  const thirdNegation = card("Negation", `real-negation-third-${outcome}`);
  const seed = await seedGame(request, negationPlayers(sourceNegation, targetNegation, targetCounterNegation, thirdNegation));
  const [source, target, third] = seed.players;
  await openGame(page, seed, 0, viewport);
  const targetPage = await page.context().newPage();
  await openGame(targetPage, seed, 1, { width: 480, height: 900 });

  await playDismantle(page, { id: "real-negation-dismantle" }, target);
  const sourceWindow = await waitForActor(request, seed, 0, "negate");
  expect(sourceWindow.currentAction).toMatchObject({ kind: "response", actorId: source.id, requirement: "negate" });
  expect(sourceWindow.currentAction.options.some((option) => option.providerId === "negation_card")).toBe(true);
  await expectOpenSingleTargetNegation(page);
  const guidance = page.locator(`.local-player-dock[data-player-anchor="${source.id}"] .console-guidance .decision-status strong`);
  await expect(guidance).toHaveText("Play Negation or Skip.");
  const openGeometry = await measureNegationGraph(page, third.id);
  expect(openGeometry.root).not.toBeNull();
  expect(openGeometry.root.left).toBeGreaterThanOrEqual(openGeometry.table.left);
  expect(openGeometry.root.right).toBeLessThanOrEqual(openGeometry.table.right);
  expect(openGeometry.rootDockOverlap).toBe(false);
  expect(openGeometry.documentWidth).toBe(openGeometry.viewportWidth);
  expect(openGeometry.stageCount).toBe(0);
  await attachScreenshot(testInfo, `negation-open-source-${viewport.width}`, page);

  await expectOpenSingleTargetNegation(targetPage);
  const targetOpenGeometry = await measureNegationGraph(targetPage, third.id);
  expect(targetOpenGeometry.root.left).toBeGreaterThanOrEqual(targetOpenGeometry.table.left);
  expect(targetOpenGeometry.root.right).toBeLessThanOrEqual(targetOpenGeometry.table.right);
  expect(targetOpenGeometry.rootDockOverlap).toBe(false);
  expect(targetOpenGeometry.documentWidth).toBe(targetOpenGeometry.viewportWidth);
  expect(targetOpenGeometry.stageCount).toBe(0);

  const observerView = await roomView(request, seed, 3);
  expect(observerView.currentAction.options).toBeUndefined();
  expect(JSON.stringify(observerView)).not.toContain(targetNegation.id);
  expect(JSON.stringify(observerView)).not.toContain(targetCounterNegation.id);
  expect(JSON.stringify(observerView)).not.toContain(thirdNegation.id);
  await declineThroughPage(page, source.id);

  const targetWindow = await waitForActor(request, seed, 1, "negate");
  expect(targetWindow.currentAction).toMatchObject({ kind: "response", actorId: target.id, requirement: "negate" });
  expect(targetWindow.currentAction.options.some((option) => option.providerId === "negation_card")).toBe(true);
  await expectOpenSingleTargetNegation(targetPage);
  await expect(targetPage.locator(`.local-player-dock[data-player-anchor="${target.id}"] .console-guidance .decision-status strong`)).toHaveText("Play Negation or Skip.");
  await attachScreenshot(testInfo, "negation-open-target-480", targetPage);
  const targetDeclinesFirst = await declineThroughPage(targetPage, target.id);
  expect(targetDeclinesFirst.action).toBe("decline_response");

  const thirdWindow = await waitForActor(request, seed, 2, "negate");
  expect(thirdWindow.currentAction).toMatchObject({ kind: "response", actorId: third.id, requirement: "negate" });
  expect(thirdWindow.currentAction.options.some((option) => option.providerId === "negation_card"
    && option.selection?.eligibleCardIds?.includes(thirdNegation.id))).toBe(true);
  const thirdPage = await page.context().newPage();
  await openGame(thirdPage, seed, 2, { width: 390, height: 844 });
  await expectOpenSingleTargetNegation(thirdPage);
  const thirdOpenGeometry = await measureNegationGraph(thirdPage, third.id);
  await expect(thirdPage.locator(`.local-player-dock[data-player-anchor="${third.id}"] .console-guidance .decision-status strong`)).toHaveText("Play Negation or Skip.");
  const firstPayload = await respondWithCard(thirdPage, third.id, thirdNegation.id);
  expect(firstPayload).toMatchObject({ action: "respond", cardId: thirdNegation.id });

  const sourceCounterWindow = await waitForActor(request, seed, 0, "negate");
  expect(sourceCounterWindow.currentAction.actorId).toBe(source.id);
  const sourceAfterFirst = await roomView(request, seed, 0);
  const targetAfterFirst = await roomView(request, seed, 1);
  const firstProof = sourceAfterFirst.presentationSnapshot.reactionChain;
  expect(firstProof).toMatchObject({ rootEffectState: "BLOCKED", publicEventLinks: { nodes: [{ eventId: expect.any(String) }] } });
  expect(targetAfterFirst.presentationSnapshot.reactionChain).toEqual(firstProof);
  expect(JSON.stringify(firstProof)).not.toContain(thirdNegation.id);
  for (const viewerPage of [page, targetPage, thirdPage]) {
    const overlay = viewerPage.locator('[data-root-action-overlay="true"]');
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 15_000 });
    await expect(overlay).toHaveAttribute("data-root-effect-state", "BLOCKED");
    await expect(overlay.locator('[data-root-action-card="true"][data-root-effect-state="BLOCKED"]'))
      .toHaveAttribute("data-root-action-card-face-kind", "Dismantle");
    const responseCard = overlay.locator('[data-root-action-response-card="true"]');
    await expect(responseCard).toHaveAttribute("data-response-event-id", firstProof.publicEventLinks.nodes[0].eventId);
    await expect(responseCard).toHaveAttribute("data-response-actor-id", third.id);
    await expect(responseCard).toHaveAttribute("data-response-relation", "COUNTERS_ROOT");
    await expect(responseCard).toContainText("THIRD");
    await expect(overlay.locator('[data-root-action-edge="response-source"]')).toHaveCount(1);
    await expect(overlay.locator('[data-root-action-edge="negation-counters-root"]')).toHaveCount(1);
    await expect(overlay.locator('[data-root-action-edge="root-target-blocked"]')).toHaveCount(1);
    await expect(overlay.locator('[data-root-action-root-blocked="true"]')).toHaveCount(1);
    await expect(overlay.locator('[data-root-action-edge="target"]')).toHaveCount(0);
    await expect(viewerPage.locator(".interaction-stage")).toHaveCount(0);
  }
  const blockedGeometry = await measureNegationGraph(page, third.id);
  for (const edge of ["left", "top", "width", "height"]) {
    expect(Math.abs(blockedGeometry.root[edge] - openGeometry.root[edge]), `root ${edge} stays fixed between open/blocked: ${JSON.stringify({ openGeometry, blockedGeometry })}`).toBeLessThanOrEqual(2);
  }
  for (const seat of ["source", "target", "responder"]) {
    for (const edge of ["left", "top", "right", "bottom", "width", "height"]) {
      expect(Math.abs(blockedGeometry[seat][edge] - openGeometry[seat][edge]), `${seat} ${edge} stays fixed`).toBeLessThanOrEqual(0.5);
    }
  }
  for (const cardBox of [blockedGeometry.root, blockedGeometry.response]) {
    expect(cardBox.left).toBeGreaterThanOrEqual(blockedGeometry.table.left);
    expect(cardBox.top).toBeGreaterThanOrEqual(blockedGeometry.table.top);
    expect(cardBox.right).toBeLessThanOrEqual(blockedGeometry.table.right);
    expect(cardBox.bottom).toBeLessThanOrEqual(blockedGeometry.table.bottom);
  }
  expect(blockedGeometry.rootDockOverlap).toBe(false);
  expect(blockedGeometry.responseDockOverlap).toBe(false);
  expect(blockedGeometry.documentWidth).toBe(blockedGeometry.viewportWidth);
  expect(blockedGeometry.connectorPoints.every(({ points }) => points.every((point) => point.x >= blockedGeometry.shell.left
    && point.x <= blockedGeometry.shell.right && point.y >= blockedGeometry.shell.top && point.y <= blockedGeometry.shell.bottom))).toBe(true);
  expect(blockedGeometry.stageCount).toBe(0);
  await attachScreenshot(testInfo, `negation-first-response-graph-${viewport.width}`, page);
  const targetGeometry = await measureNegationGraph(targetPage, third.id);
  for (const seat of ["source", "target", "responder"]) {
    for (const edge of ["left", "top", "right", "bottom", "width", "height"]) {
      expect(Math.abs(targetGeometry[seat][edge] - targetOpenGeometry[seat][edge]), `480px ${seat} ${edge} remains fixed`).toBeLessThanOrEqual(0.5);
    }
  }
  for (const cardBox of [targetGeometry.root, targetGeometry.response]) {
    expect(cardBox.left).toBeGreaterThanOrEqual(targetGeometry.table.left);
    expect(cardBox.top).toBeGreaterThanOrEqual(targetGeometry.table.top);
    expect(cardBox.right).toBeLessThanOrEqual(targetGeometry.table.right);
    expect(cardBox.bottom).toBeLessThanOrEqual(targetGeometry.table.bottom);
  }
  expect(targetGeometry.rootDockOverlap).toBe(false);
  expect(targetGeometry.responseDockOverlap).toBe(false);
  expect(targetGeometry.documentWidth).toBe(targetGeometry.viewportWidth);
  expect(targetGeometry.connectorPoints.every(({ points }) => points.every((point) => point.x >= targetGeometry.shell.left
    && point.x <= targetGeometry.shell.right && point.y >= targetGeometry.shell.top && point.y <= targetGeometry.shell.bottom))).toBe(true);
  const responseSourceTether = targetGeometry.connectorPoints.find(({ edge }) => edge === "response-source");
  expect(responseSourceTether).toBeDefined();
  expect(pointOnRectBorder(responseSourceTether.start, targetGeometry.responder)).toBe(true);
  expect(pointOnRectBorder(responseSourceTether.end, targetGeometry.response)).toBe(true);
  expect(targetGeometry.stageCount).toBe(0);
  await attachScreenshot(testInfo, "negation-first-response-graph-480", targetPage);
  const thirdBlockedGeometry = await measureNegationGraph(thirdPage, third.id);
  expect(thirdBlockedGeometry.responseDockOverlap).toBe(false);
  expect(thirdBlockedGeometry.documentWidth).toBe(thirdBlockedGeometry.viewportWidth);
  expect(thirdBlockedGeometry.stageCount).toBe(0);

  const hiddenResponderAnchor = await targetPage.addStyleTag({ content: `.play-table [data-player-anchor="${third.id}"] { display: none !important; }` });
  await targetPage.evaluate(() => window.dispatchEvent(new Event("resize")));
  await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "false");
  await expect(targetPage.locator('.interaction-stage[data-negation-first-branch-composition="proven"]')).toBeVisible();
  await hiddenResponderAnchor.evaluate((style) => style.remove());
  await targetPage.evaluate(() => window.dispatchEvent(new Event("resize")));
  await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true");
  await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);

  const afterFirst = await roomView(request, seed, 0);
  expect(JSON.stringify(afterFirst)).toContain(thirdNegation.id);
  expect(JSON.stringify(afterFirst)).not.toContain("real-negation-target-card");
  expect(JSON.stringify(afterFirst)).not.toContain(targetCounterNegation.id);

  if (sourceCounters) {
    const counterPayload = await respondWithCard(page, source.id, sourceNegation.id);
    expect(counterPayload).toMatchObject({ action: "respond", cardId: sourceNegation.id });
    const targetCounterWindow = await waitForActor(request, seed, 1, "negate");
    expect(targetCounterWindow.currentAction.actorId).toBe(target.id);
    expect(targetCounterWindow.currentAction.options.some((option) => option.providerId === "negation_card"
      && option.selection?.eligibleCardIds?.includes(targetCounterNegation.id))).toBe(true);
    const counterViews = await Promise.all([0, 1, 2, 3].map((index) => roomView(request, seed, index)));
    const counterProof = counterViews[0].presentationSnapshot.reactionChain;
    expect(counterProof).toMatchObject({
      rootEffectState: "ACTIVE",
      nodes: [
        { actorId: third.id, causedByNodeId: null },
        { actorId: source.id, causedByNodeId: expect.any(String) },
      ],
      publicEventLinks: { nodes: [{ eventId: expect.any(String) }, { eventId: expect.any(String) }] },
    });
    expect(counterProof.nodes[1].causedByNodeId).toBe(counterProof.nodes[0].nodeId);
    expect(counterProof.publicEventLinks.nodes.map(({ nodeId }) => nodeId)).toEqual(counterProof.nodes.map(({ nodeId }) => nodeId));
    expect(counterViews[1].presentationSnapshot.reactionChain).toEqual(counterProof);
    for (const view of counterViews) {
      expect(view.presentationSnapshot.reactionChain).toEqual(counterProof);
      expect(JSON.stringify(view.presentationSnapshot.reactionChain)).not.toContain(thirdNegation.id);
      expect(JSON.stringify(view.presentationSnapshot.reactionChain)).not.toContain(sourceNegation.id);
    }
    const negationGraphPages = [page, targetPage, thirdPage];
    for (const graphPage of negationGraphPages) {
      const overlay = graphPage.locator('[data-root-action-overlay="true"]');
      await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 15_000 });
      await expect(overlay).toHaveAttribute("data-root-effect-state", "ACTIVE");
      await expect(overlay.locator('[data-root-action-edge="target"][data-root-action-target-state="active"]')).toHaveCount(1);
      await expect(overlay.locator('[data-root-action-edge="root-target-blocked"]')).toHaveCount(0);
      const responses = overlay.locator('[data-root-action-response-card="true"]');
      await expect(responses).toHaveCount(2);
      await expect(responses.nth(0)).toHaveAttribute("data-response-event-id", counterProof.publicEventLinks.nodes[0].eventId);
      await expect(responses.nth(0)).toHaveAttribute("data-response-actor-id", third.id);
      await expect(responses.nth(0)).toHaveAttribute("data-response-active", "false");
      await expect(responses.nth(0)).toHaveAttribute("data-response-relation", "COUNTERS_ROOT");
      await expect(responses.nth(1)).toHaveAttribute("data-response-event-id", counterProof.publicEventLinks.nodes[1].eventId);
      await expect(responses.nth(1)).toHaveAttribute("data-response-actor-id", source.id);
      await expect(responses.nth(1)).toHaveAttribute("data-response-active", "true");
      await expect(responses.nth(1)).toHaveAttribute("data-response-relation", "COUNTERS_RESPONSE");
      await expect(responses.nth(1)).toHaveAttribute("data-counter-target-index", "0");
      await expect(overlay.locator('[data-root-action-edge="response-source"]')).toHaveCount(2);
      await expect(overlay.locator('[data-root-action-edge="negation-counters-root"]')).toHaveCount(1);
      await expect(overlay.locator('[data-root-action-edge="negation-counters-root"][data-response-active="false"]')).toHaveCount(1);
      await expect(overlay.locator('[data-root-action-edge="negation-counters-response"][data-counter-target-index="0"][data-response-active="true"]')).toHaveCount(1);
      await expect(graphPage.locator(".interaction-stage")).toHaveCount(0);

      const geometry = await measureNegationGraph(graphPage, source.id);
      const cards = [geometry.root, ...geometry.responses];
      for (const cardBox of cards) {
        expect(cardBox.left).toBeGreaterThanOrEqual(geometry.table.left);
        expect(cardBox.top).toBeGreaterThanOrEqual(geometry.table.top);
        expect(cardBox.right).toBeLessThanOrEqual(geometry.table.right);
        expect(cardBox.bottom).toBeLessThanOrEqual(geometry.table.bottom);
      }
      const overlaps = (a, b) => a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
      for (let left = 0; left < cards.length; left += 1) {
        for (let right = left + 1; right < cards.length; right += 1) expect(overlaps(cards[left], cards[right])).toBe(false);
      }
      for (const cardBox of cards) {
        for (const seatBox of geometry.seatBoxes) expect(overlaps(cardBox, seatBox)).toBe(false);
      }
      expect(geometry.rootDockOverlap).toBe(false);
      expect(geometry.responseDockOverlap).toBe(false);
      expect(geometry.documentWidth).toBe(geometry.viewportWidth);
      expect(geometry.connectorPoints.every(({ points }) => points.every((point) => point.x >= geometry.shell.left
        && point.x <= geometry.shell.right && point.y >= geometry.shell.top && point.y <= geometry.shell.bottom))).toBe(true);
      expect(geometry.responseActors).toEqual([third.id, source.id]);
      geometry.responseActorBoxes.forEach((actorBox, index) => {
        const tether = geometry.connectorPoints.find(({ edge, nodeIndex }) => edge === "response-source" && nodeIndex === index);
        expect(tether).toBeDefined();
        expect(pointOnRectBorder(tether.start, actorBox)).toBe(true);
        expect(pointOnRectBorder(tether.end, geometry.responses[index])).toBe(true);
        const counter = geometry.connectorPoints.find(({ edge, nodeIndex }) => edge.startsWith("negation-counters-") && nodeIndex === index);
        expect(counter).toBeDefined();
        expect(pointOnRectBorder(counter.start, geometry.responses[index])).toBe(true);
        const counterTarget = index === 0 ? geometry.root : geometry.responses[0];
        expect(pointOnRectBorder(counter.end, counterTarget)).toBe(true);
      });
      if (graphPage === page) {
        for (const edge of ["left", "top", "width", "height"]) {
          expect(Math.abs(geometry.root[edge] - openGeometry.root[edge]), `wide root ${edge} remains fixed: ${JSON.stringify({ before: { root: openGeometry.root, table: openGeometry.table, source: openGeometry.source, target: openGeometry.target, responder: openGeometry.responder }, after: { root: geometry.root, table: geometry.table, source: geometry.source, target: geometry.target, responder: geometry.responder } })}`).toBeLessThanOrEqual(2);
        }
      } else if (graphPage === targetPage) {
        for (const edge of ["left", "top", "width", "height"]) {
          expect(Math.abs(geometry.root[edge] - targetOpenGeometry.root[edge])).toBeLessThanOrEqual(2);
        }
      } else {
        for (const edge of ["left", "top", "width", "height"]) {
          expect(Math.abs(geometry.root[edge] - thirdOpenGeometry.root[edge])).toBeLessThanOrEqual(2);
        }
      }
      await attachScreenshot(testInfo, `negation-counter-graph-${geometry.viewportWidth}`, graphPage);
    }
    const targetDecline = await declineThroughPage(targetPage, target.id);
    expect(targetDecline.action).toBe("decline_response");
  } else {
    const sourceDecline = await declineThroughPage(page, source.id);
    expect(sourceDecline.action).toBe("decline_response");
    const targetRevisit = await waitForActor(request, seed, 1, "negate");
    expect(targetRevisit.currentAction.actorId).toBe(target.id);
    expect(targetRevisit.currentAction.options.some((option) => option.providerId === "negation_card"
      && option.selection?.eligibleCardIds?.includes(targetCounterNegation.id))).toBe(true);
    const activeOverlay = targetPage.locator('[data-root-action-overlay="true"]');
    await expect(activeOverlay).toHaveAttribute("data-root-action-ready", "true");
    await expect(activeOverlay).toHaveAttribute("data-root-effect-state", "BLOCKED");
    await expect(activeOverlay.locator('[data-response-actor-id="' + third.id + '"]')).toHaveCount(1);
    await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);
    const activeGeometry = await measureNegationGraph(targetPage, third.id);
    expect(activeGeometry.responseDockOverlap).toBe(false);
    expect(activeGeometry.documentWidth).toBe(activeGeometry.viewportWidth);
    const finalPass = await declineThroughPage(targetPage, target.id);
    expect(finalPass.action).toBe("decline_response");
  }

  await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.settlement?.outcome, { timeout: 15_000 }).toBe(outcome);
  const settledView = await roomView(request, seed, 0);
  expect(settledView.presentationSnapshot.settlement).toMatchObject({
    outcome,
    rootCardKind: "Dismantle",
    sourceId: source.id,
    targetId: target.id,
  });
  if (outcome === "ROOT_RESTORED") {
    expect(settledView.presentationSnapshot.rootAction).toMatchObject({
      semantics: "PROVEN",
      action: "STRATAGEM",
      cardKind: "Dismantle",
      sourceId: source.id,
      targetId: target.id,
    });
    const settledOverlay = page.locator('[data-root-action-overlay="true"]');
    await expect(settledOverlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 10_000 });
    await expect(settledOverlay).toHaveAttribute("aria-label", "SOURCE played Burning Bridge targeting TARGET.");
    await expect(settledOverlay.locator('[data-root-action-card="true"][data-root-action-card-kind="Dismantle"]')).toHaveCount(1);
    await expect(settledOverlay.locator('[data-root-action-edge="source"]')).toHaveCount(1);
    await expect(settledOverlay.locator('[data-root-action-edge="target"][data-root-action-target-state="active"]')).toHaveCount(1);
    await expect(settledOverlay.locator('[data-root-action-response-card="true"]')).toHaveCount(0);
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    const settledGeometry = await measureNegationGraph(page);
    expect(settledGeometry.root).not.toBeNull();
    expect(settledGeometry.root.left).toBeGreaterThanOrEqual(settledGeometry.table.left);
    expect(settledGeometry.root.top).toBeGreaterThanOrEqual(settledGeometry.table.top);
    expect(settledGeometry.root.right).toBeLessThanOrEqual(settledGeometry.table.right);
    expect(settledGeometry.root.bottom).toBeLessThanOrEqual(settledGeometry.table.bottom);
    expect(settledGeometry.rootDockOverlap).toBe(false);
    expect(settledGeometry.documentWidth).toBe(settledGeometry.viewportWidth);
    const targetCardModal = page.getByRole("dialog", { name: "Burning Bridge target card selection" });
    await expect(targetCardModal).toBeVisible();
    const [overlayBox, modalBox] = await Promise.all([settledOverlay.boundingBox(), targetCardModal.boundingBox()]);
    expect(overlayBox).not.toBeNull();
    expect(modalBox).not.toBeNull();
    expect(modalBox.x).toBeGreaterThanOrEqual(0);
    expect(modalBox.x + modalBox.width).toBeLessThanOrEqual(viewport.width);
    expect(modalBox.y).toBeGreaterThanOrEqual(0);
    expect(modalBox.y + modalBox.height).toBeLessThanOrEqual(viewport.height);
    expect(["target_card", "trigger", "response"]).toContain(settledView.currentAction.kind);
    await attachScreenshot(testInfo, "negation-root-restored-dismantle-continuation", page);
  } else {
    await expect(page.locator('[data-single-target-negation-root="true"]')).toHaveCount(0);
    await expect(page.locator(`.local-player-dock[data-player-anchor="${source.id}"] .console-guidance .decision-status strong`)).toContainText("turn");
    await attachScreenshot(testInfo, "negation-root-cancelled-mobile", page);
  }
}

test("real Dismantle Negation/counter-Negation restores the root card through its continuation", async ({ page, request }, testInfo) => {
  await runNegationScenario({ page, request, testInfo, outcome: "ROOT_RESTORED", viewport: { width: 1440, height: 900 }, sourceCounters: true });
});

test("real Dismantle Negation cancellation exits after authoritative root settlement", async ({ page, request }, testInfo) => {
  await runNegationScenario({ page, request, testInfo, outcome: "ROOT_CANCELLED", viewport: { width: 390, height: 844 }, sourceCounters: false });
});

async function reachRainingArrowsDodge(request, seed, targetId) {
  for (let attempt = 0; attempt < 32; attempt += 1) {
    const views = await Promise.all(seed.players.map((_, index) => roomView(request, seed, index)));
    const targetView = views.find((view) => view.isMyAction && view.currentAction?.actorId === targetId
      && view.currentAction.kind === "response" && view.currentAction.requirement === "dodge");
    if (targetView) return targetView;

    const pendingNegation = views.findIndex((view) => view.isMyAction
      && view.currentAction?.kind === "response" && view.currentAction.requirement === "negate");
    if (pendingNegation >= 0) {
      await apiAction(request, seed, pendingNegation, "decline_response");
      continue;
    }
    const otherDodgeResponse = views.findIndex((view) => view.isMyAction
      && view.currentAction?.kind === "response" && view.currentAction.requirement === "dodge");
    if (otherDodgeResponse >= 0) {
      await apiAction(request, seed, otherDodgeResponse, "decline_response");
      continue;
    }
    throw new Error("Real Raining Arrows left no CurrentAction transition toward the intended participant.");
  }
  throw new Error("The real Raining Arrows flow did not reach the intended Dodge participant.");
}

function rainingPlayers({ root, hero = "sun-quan", hand = [] }) {
  return [
    { name: "SOURCE", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [root] },
    { name: "TARGET", role: "Loyalist", hero, hp: 4, maxHp: 4, hand },
    { name: "THIRD", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
  ];
}

test("real Raining Arrows without Dodge offers only TAKE DAMAGE and advances server progress", async ({ page, request }, testInfo) => {
  const root = card("RainingArrows", "real-raining-no-dodge-root");
  const seed = await seedGame(request, rainingPlayers({ root }));
  const target = seed.players[1];
  await openGame(page, seed, 0);
  await playRainingArrows(page, root);
  const targetPage = await page.context().newPage();
  await openGame(targetPage, seed, 1, { width: 480, height: 900 });

  const view = await reachRainingArrowsDodge(request, seed, target.id);
  expect(view.currentAction).toMatchObject({ kind: "response", actorId: target.id, requirement: "dodge", legalActions: ["decline_response"], options: [] });
  expect(view.presentationV2.groupResolution).toMatchObject({ cardKind: "RainingArrows", resolutionSemantics: "GROUP", currentParticipantId: target.id });
  await expect.poll(async () => {
    const latest = await roomView(request, seed, 1);
    return latest.currentAction?.actorId === target.id && latest.currentAction?.requirement === "dodge";
  }).toBe(true);

  const targetGroupGraph = targetPage.locator('[data-root-action-overlay="true"][data-root-action-group-target-graph="true"]');
  await expect(targetGroupGraph).toHaveAttribute("data-root-action-ready", "true");
  await expect(targetGroupGraph.locator('[data-group-root-action="RainingArrows"]')).toBeVisible();
  await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);
  const dock = targetPage.locator(`.local-player-dock[data-player-anchor="${target.id}"]`);
  await expect(dock.locator('[data-action-slot="decline"] button')).toHaveText("TAKE DAMAGE");
  await expect(dock.locator('[data-action-slot="decline"] button')).toBeEnabled();
  await expect(dock.locator('[data-action-slot="primary"] button')).toHaveCount(0);
  await expect(dock.getByRole("button", { name: "Skip", exact: true })).toHaveCount(0);
  await expect(dock.getByRole("button", { name: "TAKE DAMAGE", exact: true })).toHaveCount(1);
  await expect(dock.locator(".console-guidance .decision-status strong")).toHaveText("Respond to Raining Arrows.");
  await expect(dock).not.toContainText("Group Resolution");
  await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);
  await attachScreenshot(testInfo, "raining-arrows-no-dodge-take-damage-480", targetPage);

  const progressBefore = view.presentationV2.groupResolution.participantProgress.find((entry) => entry.playerId === target.id);
  expect(progressBefore.status).toBe("CURRENT");
  const responsePromise = actionResponse(targetPage, "decline_response");
  await dock.getByRole("button", { name: "TAKE DAMAGE", exact: true }).click();
  const submitted = await responsePromise;
  expect(submitted.ok()).toBeTruthy();
  expect(JSON.parse(submitted.request().postData() ?? "{}").action).toBe("decline_response");
  const after = await roomView(request, seed, 1);
  const progressAfter = after.presentationV2.groupResolution.participantProgress.find((entry) => entry.playerId === target.id);
  expect(progressAfter.status).not.toBe("CURRENT");
  expect(after.currentAction.actorId).not.toBe(target.id);
  await expect(targetPage.getByRole("button", { name: "TAKE DAMAGE", exact: true })).toHaveCount(0);
});

test("real Raining Arrows exposes Zhen Ji's authoritative Dodge provider in Skills and submits it once", async ({ page, request }, testInfo) => {
  const root = card("RainingArrows", "real-raining-empress-root");
  const blackCard = card("Peach", "real-raining-empress-black", "♣");
  const unrelated = card("Attack", "real-raining-empress-unrelated", "♥");
  const seed = await seedGame(request, rainingPlayers({ root, hero: "zhen-ji", hand: [blackCard, unrelated] }));
  const target = seed.players[1];
  await openGame(page, seed, 0);
  await playRainingArrows(page, root);
  const targetPage = await page.context().newPage();
  await openGame(targetPage, seed, 1, { width: 480, height: 900 });

  const view = await reachRainingArrowsDodge(request, seed, target.id);
  expect(view.currentAction.options.find((option) => option.providerId === "zhen_ji_black_card_dodge")).toMatchObject({
    satisfies: "dodge",
    selection: { type: "cards", min: 1, max: 1, eligibleCardIds: [blackCard.id] },
  });
  const targetGroupGraph = targetPage.locator('[data-root-action-overlay="true"][data-root-action-group-target-graph="true"]');
  await expect(targetGroupGraph).toHaveAttribute("data-root-action-ready", "true");
  await expect(targetGroupGraph.locator('[data-group-root-action="RainingArrows"]')).toBeVisible();
  await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);

  const dock = targetPage.locator(`.local-player-dock[data-player-anchor="${target.id}"]`);
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Empress Dowager", exact: true });
  const extras = dock.locator('[data-action-extras="true"]');
  const takeDamage = dock.locator('[data-action-slot="decline"] button');
  await expect(skill).toBeEnabled();
  await expect(extras.getByRole("button", { name: /Empress Dowager/ })).toHaveCount(0);
  await expect(takeDamage).toHaveText("TAKE DAMAGE");
  await expect(dock.locator('[data-action-slot="primary"] button')).toHaveCount(0);

  await skill.click();
  await expect(skill).toHaveAttribute("aria-pressed", "true");
  await expect(dock.locator('[data-raining-arrows-dodge-providers="available"]')).toBeVisible();
  const eligible = dock.locator(`[data-hand-card-id="${blackCard.id}"] .game-card`);
  const ineligible = dock.locator(`[data-hand-card-id="${unrelated.id}"] .game-card`);
  await expect(eligible).toBeEnabled();
  await expect(ineligible).toBeDisabled();
  await expect(takeDamage).toHaveText("TAKE DAMAGE");
  await expect(dock.locator('[data-action-slot="primary"] button')).toBeDisabled();
  await eligible.click();
  const confirm = dock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toBeEnabled();
  await expect(takeDamage).toHaveText("TAKE DAMAGE");
  const responsePromise = actionResponse(targetPage, "respond");
  await attachScreenshot(testInfo, "raining-arrows-zhen-ji-dodge-selected-480", targetPage);
  await confirm.click();
  const submitted = await responsePromise;
  expect(submitted.ok()).toBeTruthy();
  const payload = JSON.parse(submitted.request().postData() ?? "{}");
  expect(payload).toMatchObject({ action: "respond", providerId: "zhen_ji_black_card_dodge", cardId: blackCard.id });
  expect((await roomView(request, seed, 1)).currentAction.actorId).not.toBe(target.id);
  await expect(extras.getByRole("button", { name: /Empress Dowager/ })).toHaveCount(0);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 440, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`server-projected unified target inspector stays compact and private at ${viewport.width}px`, async ({ page, request }, testInfo) => {
    const hidden = [card("Peach", `real-inspect-hidden-${viewport.width}`)];
    const attack = card("Attack", `real-inspect-attack-${viewport.width}`);
    const crossbow = card("ZhugeCrossbow", `real-inspect-crossbow-${viewport.width}`, "♦", "A");
    const shield = card("NioShield", `real-inspect-shield-${viewport.width}`);
    const seed = await seedGame(request, [
      { name: "VIEWER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [attack] },
      {
        name: "INSPECTED", role: "Loyalist", hero: "xiahou-dun", hp: 2, maxHp: 4, hand: hidden,
        equipment: { weapon: crossbow, armor: shield }, judgement: [],
      },
      { name: "THIRD", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
      { name: "FOURTH", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
    ]);
    const inspected = seed.players[1];
    const projected = await roomView(request, seed, 0);
    const target = projected.players.find((player) => player.id === inspected.id);
    expect(target).toMatchObject({ hero: "xiahou-dun", hp: 2, maxHp: 4, handCount: 1 });
    expect(target.equipmentCards.map((entry) => entry.id)).toEqual(expect.arrayContaining([crossbow.id, shield.id]));
    expect(target.judgementCards).toEqual([]);
    for (const hiddenCard of hidden) expect(JSON.stringify(projected)).not.toContain(hiddenCard.id);

    await openGame(page, seed, 0, viewport);
    const submissions = [];
    page.on("request", (requestEvent) => {
      if (requestEvent.url() === `${API}/api/rooms` && requestEvent.method() === "POST") {
        submissions.push(JSON.parse(requestEvent.postData() ?? "{}"));
      }
    });
    const inspectButton = page.locator(`[data-player-anchor="${inspected.id}"] .opponent-hero-target`);
    await expect(inspectButton).toHaveAttribute("aria-label", "Inspect INSPECTED");
    await expect(page.locator(`[data-player-anchor="${inspected.id}"] .hero-card-info-button, [data-player-anchor="${inspected.id}"] .opponent-hand-footer, [data-player-anchor="${inspected.id}"] .player-hand-count`)).toHaveCount(0);
    await inspectButton.click();
    const readOnlyPanel = page.getByRole("dialog", { name: "INSPECTED opponent inspection" });
    await expect(readOnlyPanel).toBeVisible();
    await expect(page.locator(`[data-player-anchor="${inspected.id}"].selected-target`)).toHaveCount(0);
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(1);
    expect(submissions).toEqual([]);
    await readOnlyPanel.getByRole("button", { name: "Close INSPECTED inspection" }).click();

    await page.locator(`[data-hand-card-id="${attack.id}"] .game-card`).click();
    await page.getByRole("button", { name: "Select INSPECTED", exact: true }).click();
    const stage = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"]');
    const panel = page.getByRole("dialog", { name: "INSPECTED opponent inspection" });
    await expect(panel).toBeVisible();
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(1);
    await expect(page.locator(`[data-player-anchor="${inspected.id}"].selected-target`)).toHaveCount(1);
    await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
    await expect(panel.locator(".hero-focus-heading strong")).toHaveText("INSPECT · INSPECTED");
    await expect(panel.locator(".hero-focus-identity")).toContainText("Xiahou Dun");
    await expect(panel.locator(".hero-focus-identity")).not.toContainText("INSPECTED");
    await expect(panel.locator(".hero-focus-identity")).toContainText("HP 2/4");
    await expect(panel.locator(".hero-focus-identity [data-public-hand-count]")).toHaveText("Hand · 1");
    await expect(panel.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill')).toHaveCount(1);
    await expect(panel.locator('[aria-label="Public Skills"]')).toContainText("Stauchness");
    await expect(panel.locator('[aria-label="Equipment"] .opponent-inspection-card')).toHaveCount(2);
    await expect(panel.getByRole("button", { name: "Explain Zhuge Crossbow" })).toBeVisible();
    await expect(panel.getByRole("button", { name: "Explain Nio Shield" })).toBeVisible();
    await expect(panel.locator('[aria-label="Judgement Zone"] .opponent-inspection-empty')).toHaveText("None");
    await expect(panel.locator('[aria-label="Concealed Hand"]')).toHaveCount(0);
    await expect(panel.locator(".hero-focus-inspect-hand-backs")).toHaveCount(0);
    await expect(panel).not.toContainText(/\b(Lord|Loyalist|Rebel|Renegade|Spy)\b/);
    const bodyText = await page.locator("body").innerText();
    for (const hiddenCard of hidden) expect(bodyText).not.toContain(hiddenCard.id);
    const third = seed.players[2];
    await page.locator(`[data-player-anchor="${third.id}"] .opponent-hero-inspect-name`).click();
    const thirdPanel = page.getByRole("dialog", { name: "THIRD opponent inspection" });
    await expect(thirdPanel).toBeVisible();
    await expect(thirdPanel).toHaveAttribute("data-inspect-player-id", third.id);
    await expect(page.locator(`[data-player-anchor="${inspected.id}"].selected-target`)).toHaveCount(1);
    await expect(page.locator(`[data-player-anchor="${third.id}"].selected-target`)).toHaveCount(0);
    await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(1);
    expect(submissions).toEqual([]);
    await thirdPanel.getByRole("button", { name: "Close THIRD inspection" }).click();
    await expect(page.locator(`[data-player-anchor="${inspected.id}"].selected-target`)).toHaveCount(1);
    await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
    await inspectButton.click();
    await expect(panel).toBeVisible();

    const [profileBox, identityStatsBox, skillsBox, publicZonesBox, equipmentBox, judgementBox] = await Promise.all([
      panel.locator(".hero-focus-inspect-profile").boundingBox(),
      panel.locator(".hero-focus-identity-stats").boundingBox(),
      panel.locator('[aria-label="Public Skills"]').boundingBox(),
      panel.locator(".hero-focus-inspect-public-zones").boundingBox(),
      panel.locator('[aria-label="Equipment"]').boundingBox(),
      panel.locator('[aria-label="Judgement Zone"]').boundingBox(),
    ]);
    for (const box of [profileBox, identityStatsBox, skillsBox, publicZonesBox, equipmentBox, judgementBox]) expect(box).not.toBeNull();
    expect(publicZonesBox.x).toBeGreaterThanOrEqual(profileBox.x + profileBox.width);
    expect(skillsBox.y).toBeGreaterThanOrEqual(identityStatsBox.y + identityStatsBox.height - 1);
    expect(Math.abs(publicZonesBox.y - profileBox.y)).toBeLessThanOrEqual(2);

    const details = panel.locator(".hero-focus-inspect-details");
    const skill = panel.getByRole("button", { name: "Show Stauchness description" });
    await skill.focus();
    await page.keyboard.press("Enter");
    const skillDescription = panel.getByRole("region", { name: "Stauchness description" });
    await expect(skillDescription).toHaveText("After you take damage, you may enter Judgement phase, if the Judgement card does not belong to [Heart], the source of damage must choose between: ①discard 2 hand cards; ②take 1 damage from you.");
    await expect(skill).toHaveAttribute("aria-expanded", "true");
    expect(submissions).toEqual([]);
    const detailsGeometry = await details.evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY }));
    const descriptionGeometry = await skillDescription.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const style = getComputedStyle(element);
      const lineHeight = Number.parseFloat(style.lineHeight);
      const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      return {
        naturalLines: range.getClientRects().length,
        visibleLines: Math.floor((Math.min(element.getBoundingClientRect().bottom, element.parentElement.getBoundingClientRect().bottom) - element.getBoundingClientRect().top - verticalPadding + 0.5) / lineHeight),
        maxHeight: Number.parseFloat(style.maxHeight),
        lineHeight,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
    });
    expect(descriptionGeometry.visibleLines).toBeGreaterThanOrEqual(Math.min(5, descriptionGeometry.naturalLines));
    expect(descriptionGeometry.maxHeight).toBeLessThanOrEqual(5 * descriptionGeometry.lineHeight + 1);
    await testInfo.attach(`inspect-expanded-details-geometry-${viewport.width}`, { body: JSON.stringify({ detailsGeometry, descriptionGeometry }), contentType: "application/json" });
    await attachScreenshot(testInfo, `server-unified-inspect-expanded-${viewport.width}`, page);
    await saveInspectionScreenshot(page, `server-unified-inspect-expanded-${viewport.width}.png`);
    await page.keyboard.press("Enter");
    await expect(skillDescription).toHaveCount(0);
    await expect(skill).toHaveAttribute("aria-expanded", "false");
    const dockAtSelectedTarget = await page.locator(".local-player-dock").boundingBox();
    await attachScreenshot(testInfo, `server-unified-inspect-${viewport.width}`, page);

    const surface = page.locator(".opponent-inspection-floating-shell");
    const detailsBox = await details.boundingBox();
    const equipmentCardBoxes = await panel.locator('[aria-label="Equipment"] .opponent-inspection-card').evaluateAll((cards) => cards.map((card) => {
      const box = card.getBoundingClientRect();
      return { x: box.x, y: box.y, width: box.width, height: box.height };
    }));
    const [stageBox, surfaceBox, panelBox, dockBefore, menuBox, guidanceBox, seatBoxes] = await Promise.all([
      stage.boundingBox(), surface.boundingBox(), panel.boundingBox(), dockAtSelectedTarget,
      page.locator(".stage-system-menu-trigger").boundingBox(), page.locator(".local-player-dock .console-guidance").boundingBox(),
      page.locator(".player-board [data-player-anchor]").evaluateAll((seats) => seats.map((seat) => { const box = seat.getBoundingClientRect(); return { x: box.x, y: box.y, width: box.width, height: box.height }; })),
    ]);
    expect(stageBox).not.toBeNull();
    expect(surfaceBox).not.toBeNull();
    expect(panelBox).not.toBeNull();
    expect(dockBefore).not.toBeNull();
    expect(menuBox).not.toBeNull();
    expect(guidanceBox).not.toBeNull();
    const layoutGeometry = { stageBox, surfaceBox, panelBox, profileBox, identityStatsBox, skillsBox, publicZonesBox, equipmentBox, judgementBox, detailsBox, equipmentCardBoxes, dockBefore, menuBox, guidanceBox, seatBoxes, detailsGeometry, descriptionGeometry };
    await testInfo.attach(`inspect-layout-geometry-${viewport.width}`, { body: JSON.stringify(layoutGeometry, null, 2), contentType: "application/json" });
    saveInspectionEvidence(`server-unified-inspect-layout-${viewport.width}.json`, JSON.stringify(layoutGeometry, null, 2));
    const overlaps = (a, b) => Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x)
      && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);
    expect(surfaceBox.width).toBeLessThan(stageBox.width);
    expect(surfaceBox.height).toBeLessThanOrEqual(stageBox.height * 0.53 + 1);
    expect(surfaceBox.y).toBeGreaterThanOrEqual(stageBox.y - 1);
    expect(surfaceBox.y + surfaceBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height + 1);
    expect(panelBox.x).toBeGreaterThanOrEqual(surfaceBox.x);
    expect(panelBox.y).toBeGreaterThanOrEqual(surfaceBox.y);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(surfaceBox.x + surfaceBox.width);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(surfaceBox.y + surfaceBox.height);
    expect(detailsBox.y).toBeGreaterThanOrEqual(panelBox.y);
    expect(detailsBox.y + detailsBox.height).toBeLessThanOrEqual(panelBox.y + panelBox.height + 1);
    expect(publicZonesBox.x).toBeGreaterThanOrEqual(profileBox.x + profileBox.width);
    expect(skillsBox.y).toBeGreaterThanOrEqual(identityStatsBox.y + identityStatsBox.height - 1);
    expect(overlaps(surfaceBox, menuBox)).toBe(false);
    expect(overlaps(surfaceBox, guidanceBox)).toBe(false);
    expect(overlaps(surfaceBox, dockBefore)).toBe(false);
    for (const seatBox of seatBoxes) expect(overlaps(surfaceBox, seatBox)).toBe(false);
    expect(detailsBox.x).toBeGreaterThanOrEqual(panelBox.x);
    expect(detailsBox.width).toBeLessThanOrEqual(panelBox.width);
    for (const cardBox of equipmentCardBoxes) {
      const equipmentBox = await panel.locator('[aria-label="Equipment"]').boundingBox();
      expect(cardBox.x).toBeGreaterThanOrEqual(equipmentBox.x);
      expect(cardBox.y).toBeGreaterThanOrEqual(equipmentBox.y);
      expect(cardBox.x + cardBox.width).toBeLessThanOrEqual(equipmentBox.x + equipmentBox.width);
      expect(cardBox.y + cardBox.height).toBeLessThanOrEqual(equipmentBox.y + equipmentBox.height + 1);
    }
    if (viewport.width <= 480) {
      expect(equipmentCardBoxes).toHaveLength(2);
      expect(Math.abs(equipmentCardBoxes[0].y - equipmentCardBoxes[1].y)).toBeLessThanOrEqual(1);
      for (const cardBox of equipmentCardBoxes) expect(cardBox.width).toBeGreaterThanOrEqual(27);
    }
    if (viewport.width <= 520) expect(surfaceBox.width / stageBox.width).toBeGreaterThanOrEqual(0.88);
    expect(surfaceBox.width / stageBox.width).toBeLessThanOrEqual(0.94);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await attachScreenshot(testInfo, `server-opponent-inspect-${viewport.width}`, page);
    await saveInspectionScreenshot(page, `server-opponent-inspect-${viewport.width}.png`);

    await panel.getByRole("button", { name: "Close INSPECTED inspection" }).click();
    await expect(page.locator('.interaction-stage[data-local-ui-mode="INSPECT"]')).toHaveCount(0);
    const dockAfter = await page.locator(".local-player-dock").boundingBox();
    expect(Math.abs(dockAfter.x - dockBefore.x)).toBeLessThanOrEqual(2);
    expect(Math.abs(dockAfter.y - dockBefore.y)).toBeLessThanOrEqual(2);
    await expect(page.locator(`[data-player-anchor="${inspected.id}"].selected-target`)).toHaveCount(1);
    await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
    const confirm = page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" });
    const submittedPromise = actionResponse(page, "play_card");
    await confirm.click();
    const submitted = await submittedPromise;
    expect(submitted.ok()).toBeTruthy();
    expect(JSON.parse(submitted.request().postData() ?? "{}")).toMatchObject({ action: "play_card", cardId: attack.id, targetId: inspected.id });
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
    expect(submissions).toHaveLength(1);
  });
}

test("server-backed compact inspector keeps public zones beside identity and shows five skill lines at 390px", async ({ page, request }, testInfo) => {
  const hidden = card("Peach", "real-inspect-five-line-hidden");
  const crossbow = card("ZhugeCrossbow", "real-inspect-five-line-crossbow", "♦", "A");
  const shield = card("NioShield", "real-inspect-five-line-shield");
  const lightning = card("Lightning", "real-inspect-five-line-lightning", "♠", "A");
  const seed = await seedGame(request, [
    { name: "VIEWER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
    { name: "INSPECTED", role: "Rebel", hero: "zhou-yu", hp: 3, maxHp: 4, hand: [hidden], equipment: { weapon: crossbow, armor: shield }, judgement: [lightning] },
    { name: "THIRD", role: "Loyalist", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
    { name: "FOURTH", role: "Renegade", hero: "gan-ning", hp: 4, maxHp: 4, hand: [] },
  ]);
  const viewport = { width: 390, height: 844 };
  await openGame(page, seed, 0, viewport);
  const submissions = [];
  page.on("request", (requestEvent) => {
    if (requestEvent.url() === `${API}/api/rooms` && requestEvent.method() === "POST") submissions.push(requestEvent.postData() ?? "");
  });
  await page.locator(`[data-player-anchor="${seed.players[1].id}"] .opponent-hero-target`).click();
  const panel = page.getByRole("dialog", { name: "INSPECTED opponent inspection" });
  await expect(panel).toBeVisible();
  const profile = panel.locator(".hero-focus-inspect-profile");
  const stats = panel.locator(".hero-focus-identity-stats");
  const skills = panel.locator('[aria-label="Public Skills"]');
  const zones = panel.locator(".hero-focus-inspect-public-zones");
  const equipment = panel.locator('[aria-label="Equipment"]');
  const judgement = panel.locator('[aria-label="Judgement Zone"]');
  await expect(skills).toContainText("Sowing Distrust");
  await expect(equipment.locator(".opponent-inspection-card")).toHaveCount(2);
  await expect(judgement.locator(".opponent-inspection-card")).toHaveCount(1);
  await expect(panel.locator('[aria-label="Concealed Hand"]')).toHaveCount(0);
  expect(await page.locator("body").innerText()).not.toContain(hidden.id);
  const [profileBox, statsBox, skillsBox, zonesBox, equipmentBox, judgementBox] = await Promise.all([
    profile.boundingBox(), stats.boundingBox(), skills.boundingBox(), zones.boundingBox(), equipment.boundingBox(), judgement.boundingBox(),
  ]);
  for (const box of [profileBox, statsBox, skillsBox, zonesBox, equipmentBox, judgementBox]) expect(box).not.toBeNull();
  expect(zonesBox.x).toBeGreaterThanOrEqual(profileBox.x + profileBox.width);
  expect(skillsBox.y).toBeGreaterThanOrEqual(statsBox.y + statsBox.height - 1);
  expect(Math.abs(zonesBox.y - profileBox.y)).toBeLessThanOrEqual(2);
  const equipmentCards = await equipment.locator(".opponent-inspection-card").evaluateAll((cards) => cards.map((cardElement) => {
    const box = cardElement.getBoundingClientRect();
    return { x: box.x, y: box.y, width: box.width, height: box.height };
  }));
  expect(Math.abs(equipmentCards[0].y - equipmentCards[1].y)).toBeLessThanOrEqual(1);
  for (const box of equipmentCards) expect(box.width).toBeGreaterThanOrEqual(27);

  const skill = panel.getByRole("button", { name: "Show Sowing Distrust description" });
  await skill.click();
  const description = panel.getByRole("region", { name: "Sowing Distrust description" });
  await expect(description).toBeVisible();
  const descriptionGeometry = await description.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const style = getComputedStyle(element);
    const lineHeight = Number.parseFloat(style.lineHeight);
    const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
    const elementBox = element.getBoundingClientRect();
    const scrollportBox = element.parentElement.getBoundingClientRect();
    const visibleHeight = Math.max(0, Math.min(elementBox.bottom, scrollportBox.bottom) - Math.max(elementBox.top, scrollportBox.top));
    return {
      naturalLines: range.getClientRects().length,
      visibleLines: Math.floor((visibleHeight - padding + 0.5) / lineHeight),
      maxHeight: Number.parseFloat(style.maxHeight),
      lineHeight,
      elementHeight: element.clientHeight,
      scrollportHeight: element.parentElement.clientHeight,
      scrollportScrollHeight: element.parentElement.scrollHeight,
    };
  });
  expect(descriptionGeometry.naturalLines).toBeGreaterThanOrEqual(5);
  expect(descriptionGeometry.visibleLines).toBeGreaterThanOrEqual(5);
  expect(descriptionGeometry.maxHeight).toBeLessThanOrEqual(5 * descriptionGeometry.lineHeight + 1);
  expect(submissions).toEqual([]);
  const layout = { profileBox, statsBox, skillsBox, zonesBox, equipmentBox, judgementBox, equipmentCards, descriptionGeometry };
  await testInfo.attach("server-five-line-skill-layout-390", { body: JSON.stringify(layout, null, 2), contentType: "application/json" });
  await attachScreenshot(testInfo, "server-five-line-skill-390", page);
  saveInspectionEvidence("server-five-line-skill-layout-390.json", JSON.stringify(layout, null, 2));
  await saveInspectionScreenshot(page, "server-five-line-skill-390.png");
});

test.describe("iPhone 17 Pro Max mobile browser emulation", () => {
  const iphoneDevice = Object.fromEntries(Object.entries(devices["iPhone 17 Pro Max"]).filter(([key]) => key !== "defaultBrowserType"));
  test.use(iphoneDevice);

  test("server-backed inspector supports touch and keyboard skill disclosure", async ({ page, request }, testInfo) => {
    const hidden = [card("Peach", "real-inspect-mobile-hidden")];
    const crossbow = card("ZhugeCrossbow", "real-inspect-mobile-crossbow", "♦", "A");
    const shield = card("NioShield", "real-inspect-mobile-shield");
    const seed = await seedGame(request, [
      { name: "VIEWER", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [] },
      { name: "INSPECTED", role: "Loyalist", hero: "xiahou-dun", hp: 2, maxHp: 4, hand: hidden, equipment: { weapon: crossbow, armor: shield }, judgement: [] },
      { name: "THIRD", role: "Rebel", hero: "guo-jia", hp: 4, maxHp: 4, hand: [] },
      { name: "FOURTH", role: "Renegade", hero: "zhou-yu", hp: 4, maxHp: 4, hand: [] },
    ]);
    const viewport = devices["iPhone 17 Pro Max"].viewport;
    await openGame(page, seed, 0, viewport);
    const tap = async (locator) => {
      const box = await locator.boundingBox();
      expect(box).not.toBeNull();
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    };
    const inspectButton = page.locator(`[data-player-anchor="${seed.players[1].id}"] .opponent-hero-target`);
    await tap(inspectButton);
    const panel = page.getByRole("dialog", { name: "INSPECTED opponent inspection" });
    await expect(panel).toBeVisible();
    await expect(panel.locator(".hero-focus-identity [data-public-hand-count]")).toHaveText("Hand · 1");
    const skill = panel.getByRole("button", { name: "Show Stauchness description" });
    await skill.focus();
    await page.keyboard.press("Enter");
    await expect(panel.getByRole("region", { name: "Stauchness description" })).toContainText("After you take damage, you may enter Judgement phase");
    await attachScreenshot(testInfo, "server-webkit-mobile-inspector-skill-expanded", page);
    await saveInspectionScreenshot(page, "server-touch-mobile-inspector-skill-expanded.png");
    await tap(skill);
    await expect(panel.getByRole("region", { name: "Stauchness description" })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await tap(panel.getByRole("button", { name: "Close INSPECTED inspection" }));
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  });
});
