import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const attack = { id: "root-overlay-real-attack", kind: "Attack", suit: "♠", rank: "7" };
const dismantle = { id: "root-overlay-real-dismantle", kind: "Dismantle", suit: "♠", rank: "7" };
const steal = { id: "root-overlay-real-steal", kind: "Steal", suit: "♠", rank: "7" };
const dodge = { id: "root-overlay-real-dodge", kind: "Dodge", suit: "♥", rank: "3" };
const peach = { id: "root-overlay-real-peach", kind: "Peach", suit: "♥", rank: "3" };

function expectedAttackCardFaceSize(viewport, cardKind, fitStep) {
  const large = viewport.width >= 900;
  const medium = viewport.width >= 430 && !large;
  const sizes = {
    target: large
      ? { Attack: { width: 150, height: 225 }, Dodge: { width: 132, height: 198 } }
      : medium
        ? { Attack: { width: 132, height: 198 }, Dodge: { width: 116, height: 174 } }
        : { Attack: { width: 120, height: 180 }, Dodge: { width: 108, height: 162 } },
    compact: large
      ? { Attack: { width: 135, height: 203 }, Dodge: { width: 119, height: 179 } }
      : medium
        ? { Attack: { width: 120, height: 180 }, Dodge: { width: 104, height: 156 } }
        : { Attack: { width: 108, height: 162 }, Dodge: { width: 98, height: 147 } },
    minimum: large
      ? { Attack: { width: 120, height: 180 }, Dodge: { width: 106, height: 159 } }
      : medium
        ? { Attack: { width: 106, height: 159 }, Dodge: { width: 94, height: 141 } }
        : { Attack: { width: 96, height: 144 }, Dodge: { width: 88, height: 132 } },
  };
  return sizes[viewport.height <= 700 ? "minimum" : fitStep][cardKind];
}

async function expectAttackCardFaceGeometry(overlay, card, viewport, cardKind) {
  const fitStep = await overlay.getAttribute("data-root-action-card-fit-step");
  expect(["target", "compact", "minimum"]).toContain(fitStep);
  const bounds = await card.boundingBox();
  const expected = expectedAttackCardFaceSize(viewport, cardKind, fitStep);
  expect(bounds.width).toBeCloseTo(expected.width, 1);
  expect(bounds.height).toBeCloseTo(expected.height, 1);
  return { fitStep, bounds };
}

async function expectAttackConnectorAppearance(overlay) {
  const appearance = await overlay.evaluate((element) => {
    const source = element.querySelector('[data-root-action-edge="source"]');
    const target = element.querySelector('[data-root-action-edge="target"]');
    const marker = element.querySelector('.interaction-root-connectors marker[id^="root-target-arrow-"]');
    return {
      source: source ? { d: source.getAttribute("d"), markerEnd: source.getAttribute("marker-end"), stroke: getComputedStyle(source).stroke, strokeWidth: getComputedStyle(source).strokeWidth } : null,
      target: target ? { d: target.getAttribute("d"), markerEnd: target.getAttribute("marker-end"), stroke: getComputedStyle(target).stroke, strokeWidth: getComputedStyle(target).strokeWidth } : null,
      marker: marker ? { width: marker.getAttribute("markerWidth"), height: marker.getAttribute("markerHeight") } : null,
    };
  });
  expect(appearance.source).toMatchObject({
    markerEnd: null, stroke: "rgb(134, 185, 162)", strokeWidth: "4px",
  });
  expect(appearance.source.d).toMatch(/\bL\b/);
  expect(appearance.source.d).not.toMatch(/\bQ\b/);
  expect(appearance.target).toMatchObject({
    stroke: "rgb(224, 107, 93)", strokeWidth: "7px",
  });
  expect(appearance.target.d).toMatch(/\bL\b/);
  expect(appearance.target.d).not.toMatch(/\bQ\b/);
  expect(appearance.target.markerEnd).toMatch(/^url\(#root-target-arrow-/);
  expect(appearance.marker).toEqual({ width: "30", height: "22" });
  return appearance;
}

async function captureAttackOverlayDiagnostics(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
      return { x, y, right, bottom, width, height };
    };
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    return {
      viewport: { width: innerWidth, height: innerHeight },
      overlay: overlay ? {
        ready: overlay.dataset.rootActionReady,
        mode: overlay.dataset.rootActionDisplayMode,
        layout: overlay.dataset.rootActionLayoutState,
        fitStep: overlay.dataset.rootActionCardFitStep,
        fallbackReason: overlay.dataset.rootActionFallbackReason,
        sourceId: overlay.dataset.rootActionSourceId,
        targetId: overlay.dataset.rootActionTargetId,
      } : null,
      table: rect(document.querySelector(".play-table")),
      shell: rect(document.querySelector(".game-shell")),
      rootCard: rect(document.querySelector('[data-root-action-card="true"]')),
      responseCard: rect(document.querySelector('[data-root-action-response-card="true"]')),
      anchors: [...document.querySelectorAll("[data-player-anchor]")].map((element) => ({ id: element.dataset.playerAnchor, label: element.innerText.trim().slice(0, 100), ...rect(element) })),
      obstacles: [...document.querySelectorAll(".play-center, .stage-system-cluster, .game-messages, .game-exit")]
        .map((element) => ({ className: String(element.className), ...rect(element) })),
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    };
  });
}

async function captureAttackDodgeInterceptionGeometry(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
      return { x, y, right, bottom, width, height };
    };
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    const root = document.querySelector('[data-root-action-card="true"]');
    const response = document.querySelector('[data-root-action-response-card="true"]');
    const target = [...document.querySelectorAll("[data-player-anchor]")]
      .find((element) => element.dataset.playerAnchor === overlay?.dataset.rootActionTargetId);
    const attackPath = document.querySelector('[data-root-action-edge="attack-dodge-interception"]');
    const mark = document.querySelector('[data-root-action-dodge-interception-mark="true"]');
    const connector = document.querySelector(".interaction-root-connectors");
    if (!overlay || !root || !response || !target || !connector || !attackPath || !mark) return null;
    const rootRect = rect(root);
    const targetRect = rect(target);
    const responseRect = rect(response);
    const rootCenter = { x: rootRect.x + rootRect.width / 2, y: rootRect.y + rootRect.height / 2 };
    const targetCenter = { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height / 2 };
    const responseCenter = { x: responseRect.x + responseRect.width / 2, y: responseRect.y + responseRect.height / 2 };
    const edge = (bounds, toward) => {
      const origin = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 };
      const dx = toward.x - origin.x;
      const dy = toward.y - origin.y;
      const scale = Math.min(dx === 0 ? Infinity : bounds.width / 2 / Math.abs(dx), dy === 0 ? Infinity : bounds.height / 2 / Math.abs(dy));
      return { x: origin.x + dx * scale, y: origin.y + dy * scale };
    };
    const start = edge(rootRect, targetCenter);
    const end = edge(targetRect, rootCenter);
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy || 1;
    const fraction = Math.max(0, Math.min(1, ((responseCenter.x - start.x) * dx + (responseCenter.y - start.y) * dy) / lengthSquared));
    let low = 0;
    let high = 1;
    for (const [p, q] of [[-dx, start.x - responseRect.x], [dx, responseRect.right - start.x], [-dy, start.y - responseRect.y], [dy, responseRect.bottom - start.y]]) {
      if (p === 0) { if (q < 0) { low = 1; high = 0; break; } continue; }
      const t = q / p;
      if (p < 0) low = Math.max(low, t); else high = Math.min(high, t);
      if (low > high) break;
    }
    const connectorRect = connector.getBoundingClientRect();
    const attackPathEnd = attackPath.getPointAtLength(attackPath.getTotalLength());
    const markPoint = mark.getPointAtLength(mark.getTotalLength() / 2);
    const attackEnd = { x: attackPathEnd.x + connectorRect.x, y: attackPathEnd.y + connectorRect.y };
    const markCenter = { x: markPoint.x + connectorRect.x, y: markPoint.y + connectorRect.y };
    const closest = { x: start.x + dx * fraction, y: start.y + dy * fraction };
    const edgeGap = Math.hypot(Math.max(responseRect.x - closest.x, 0, closest.x - responseRect.right), Math.max(responseRect.y - closest.y, 0, closest.y - responseRect.bottom));
    return {
      mode: response.dataset.rootActionDodgeInterception,
      fraction,
      lineIntersectsCard: low <= high,
      edgeGap,
      pathEndpointToMark: Math.hypot(attackEnd.x - markCenter.x, attackEnd.y - markCenter.y),
      markerEnd: attackPath.getAttribute("marker-end"),
      falseCounterArrows: overlay.querySelectorAll('[data-root-action-edge="negation-counters-root"]').length,
    };
  });
}

async function assertAttackGraphOrSafeFallback(page, viewport, label) {
  const overlay = page.locator('[data-root-action-overlay="true"]');
  await expect.poll(() => overlay.getAttribute("data-root-action-layout-state"), { message: `${label}: layout reaches a measured terminal state` })
    .toMatch(/^(ready|unavailable)$/);
  const diagnostics = await captureAttackOverlayDiagnostics(page);
  expect(diagnostics.documentWidth, `${label}: no horizontal overflow`).toBeLessThanOrEqual(diagnostics.viewportWidth);
  if (diagnostics.overlay?.layout === "ready" && diagnostics.overlay.mode === "graph") {
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true");
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    await expectAttackConnectorAppearance(overlay);
    const card = page.locator('[data-root-action-card="true"]');
    await expect(card).toHaveAttribute("data-root-action-card-face-kind", "Attack");
    await expect(card.locator(".played-card.attack")).toBeVisible();
    const { fitStep, bounds } = await expectAttackCardFaceGeometry(overlay, card, viewport, "Attack");
    for (const obstacle of [...diagnostics.anchors, ...diagnostics.obstacles]) {
      expect(bounds.x + bounds.width <= obstacle.x - 8 || bounds.x >= obstacle.right + 8
        || bounds.y + bounds.height <= obstacle.y - 8 || bounds.y >= obstacle.bottom + 8,
      `${label}: Attack card clears ${obstacle.label ?? obstacle.className ?? obstacle.id}`).toBe(true);
    }
    return { mode: "graph", fitStep, root: bounds, diagnostics };
  }

  expect(diagnostics.overlay?.layout, `${label}: unsupported dense geometry fails closed`).toBe("unavailable");
  expect(diagnostics.overlay?.mode).toBe("fallback");
  expect(diagnostics.overlay?.fallbackReason).toBe("geometry-unavailable");
  await expect(overlay).toHaveAttribute("data-root-action-ready", "false");
  await expect(page.locator(".interaction-stage")).toHaveCount(1);
  const rootCard = page.locator('[data-root-action-card="true"]');
  await expect(rootCard).toHaveCount(1);
  expect(await rootCard.evaluate((element) => getComputedStyle(element).visibility)).toBe("hidden");
  await expect(overlay.locator("[data-root-action-edge]")).toHaveCount(0);
  return { mode: "fallback", fitStep: diagnostics.overlay.fitStep, diagnostics };
}

async function seedGame(request, playerCount = 4, { sourceCard = attack, sourceCards = null, sourceHp = 4, targetCard = null, targetCards = null } = {}) {
  const rolesByPlayerCount = {
    4: ["Rebel", "Loyalist", "Lord", "Renegade"],
    6: ["Rebel", "Loyalist", "Lord", "Renegade", "Rebel", "Rebel"],
    8: ["Rebel", "Loyalist", "Lord", "Renegade", "Rebel", "Rebel", "Loyalist", "Rebel"],
  };
  const players = [
    { name: "SOURCE", hero: "zhao-yun" },
    { name: "TARGET", hero: "sun-quan" },
    { name: "THIRD", hero: "guo-jia" },
    { name: "FOURTH", hero: "zhou-yu" },
    { name: "FIFTH", hero: "huang-gai" },
    { name: "SIXTH", hero: "cao-cao" },
    { name: "SEVENTH", hero: "simayi" },
    { name: "EIGHTH", hero: "liu-bei" },
  ].slice(0, playerCount).map((player, index) => ({
    ...player,
    role: rolesByPlayerCount[playerCount]?.[index],
    hp: index === 0 ? sourceHp : 4,
    maxHp: 4,
    hand: index === 0 ? sourceCards ?? [sourceCard] : index === 1 ? targetCards ?? (targetCard ? [targetCard] : []) : [],
  }));
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players,
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
  await page.addInitScript(() => {
    const original = HTMLElement.prototype.getBoundingClientRect;
    window.__wtkRootOverlayPreGraphAnchors = null;
    window.__wtkAttackVisibleFrames = [];
    window.__wtkAttackFrameSamplingComplete = false;
    window.__wtkStartAttackVisibleFrameSampling = () => {
      window.__wtkAttackVisibleFrames = [];
      window.__wtkAttackFrameSamplingComplete = false;
      const startedAt = performance.now();
      let frameNumber = 0;
      const isVisible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
          && bounds.width > 0 && bounds.height > 0;
      };
      const sample = () => {
        const overlay = document.querySelector('[data-root-action-overlay="true"]');
        const stage = document.querySelector(".interaction-stage");
        const attackStage = document.querySelector('.interaction-stage[data-stage="ATTACK_RESPONSE"]');
        const rootCard = overlay?.querySelector('[data-root-action-card="true"]');
        const activeRevealCards = [...document.querySelectorAll(".active-table-reveal .game-card, .table-resolution-layer .table-played-card")]
          .filter(isVisible);
        const interactionStageVisible = isVisible(stage);
        const attackResponseStageVisible = isVisible(attackStage);
        const rootEventId = overlay?.dataset.rootActionEventId ?? null;
        const connectorSvg = overlay?.querySelector(".interaction-root-connectors");
        const connectorBounds = connectorSvg?.getBoundingClientRect() ?? null;
        const rootBounds = rootCard?.getBoundingClientRect() ?? null;
        const anchorBounds = (playerId) => [...document.querySelectorAll("[data-player-anchor]")]
          .find((anchor) => anchor.dataset.playerAnchor === playerId)?.getBoundingClientRect() ?? null;
        const pointToRectDistance = (point, bounds) => point && bounds
          ? Math.hypot(Math.max(bounds.left - point.x, 0, point.x - bounds.right), Math.max(bounds.top - point.y, 0, point.y - bounds.bottom))
          : Infinity;
        const edgeEndpoints = (edge) => {
          const path = overlay?.querySelector(`[data-root-action-edge="${edge}"]`);
          if (!path || !connectorBounds) return [null, null];
          return [0, path.getTotalLength()].map((offset) => {
            const point = path.getPointAtLength(offset);
            return { x: point.x + connectorBounds.x, y: point.y + connectorBounds.y };
          });
        };
        const pairedAnchorResidual = (points, first, second) => Math.min(
          pointToRectDistance(points[0], first) + pointToRectDistance(points[1], second),
          pointToRectDistance(points[0], second) + pointToRectDistance(points[1], first),
        );
        const sourceAnchorResidual = pairedAnchorResidual(edgeEndpoints("source"), anchorBounds(overlay?.dataset.rootActionSourceId), rootBounds);
        const targetAnchorResidual = pairedAnchorResidual(edgeEndpoints("target"), rootBounds, anchorBounds(overlay?.dataset.rootActionTargetId));
        window.__wtkAttackVisibleFrames.push({
          frameNumber: frameNumber++,
          elapsedMs: Math.round(performance.now() - startedAt),
          sampleTimeMs: performance.now(),
          innerWidth,
          innerHeight,
          visualViewportHeight: window.visualViewport?.height ?? null,
          mode: overlay?.dataset.rootActionDisplayMode ?? (interactionStageVisible ? "fallback" : "inactive"),
          fallbackGate: overlay?.dataset.rootActionFallbackReason ?? (rootEventId ? null : "no-proven-root"),
          layoutState: overlay?.dataset.rootActionLayoutState ?? null,
          rootEventId,
          sourceId: overlay?.dataset.rootActionSourceId ?? null,
          targetId: overlay?.dataset.rootActionTargetId ?? null,
          interactionId: overlay?.dataset.rootActionInteractionId ?? null,
          rootFrameId: overlay?.dataset.rootActionRootFrameId ?? null,
          checkpointId: overlay?.dataset.rootActionCheckpointId ?? null,
          presentationRevision: overlay?.dataset.rootActionPresentationRevision ?? null,
          rootCardKind: overlay?.dataset.rootActionCardKind ?? null,
          rootCardVisible: isVisible(rootCard),
          interactionStageVisible,
          attackResponseStageVisible,
          localUiMode: stage?.dataset.localUiMode ?? null,
          stagePresentationTransition: stage?.dataset.presentationTransition ?? null,
          activeTableRevealCardCount: activeRevealCards.length,
          sourceEdgeVisible: isVisible(overlay?.querySelector('[data-root-action-edge="source"]')),
          targetEdgeVisible: isVisible(overlay?.querySelector('[data-root-action-edge="target"]')),
          targetMarkerPresent: Boolean(overlay?.querySelector('.interaction-root-connectors marker[id^="root-target-arrow-"]')),
          svgVisible: isVisible(overlay?.querySelector(".interaction-root-connectors")),
          sourceAnchorResidual,
          targetAnchorResidual,
          classification: stage?.dataset.localUiMode ? "explicit-local-presentation"
            : overlay?.dataset.rootActionFallbackReason === "local-presentation-precedence" ? "local-presentation-precedence"
              : overlay?.dataset.rootActionFallbackReason === "awaiting-public-reveal" || !rootEventId && activeRevealCards.length ? "event-reveal-handoff"
                : overlay?.dataset.rootActionFallbackReason === "geometry-unavailable" ? "geometry-unavailable"
                  : overlay?.dataset.rootActionLayoutState === "measuring" ? "measurement-pending"
                    : !rootEventId ? "proof-or-action-absent"
                      : overlay?.dataset.rootActionDisplayMode === "graph" && activeRevealCards.length ? "graph-present-with-active-reveal"
                      : overlay?.dataset.rootActionDisplayMode === "graph" && (!isVisible(overlay?.querySelector('[data-root-action-edge="source"]'))
                        || !isVisible(overlay?.querySelector('[data-root-action-edge="target"]')) || !isVisible(overlay?.querySelector(".interaction-root-connectors")))
                        ? "graph-present-but-connectors-hidden"
                        : overlay?.dataset.rootActionDisplayMode === "graph" ? "graph-visible"
                          : overlay?.dataset.rootActionFallbackReason ?? "fallback-unclassified",
        });
        window.__wtkAttackFrameSamplingRequest = requestAnimationFrame(sample);
      };
      window.__wtkAttackFrameSamplingRequest = requestAnimationFrame(sample);
    };
    window.__wtkStopAttackVisibleFrameSampling = () => {
      cancelAnimationFrame(window.__wtkAttackFrameSamplingRequest);
      window.__wtkAttackFrameSamplingComplete = true;
    };
    HTMLElement.prototype.getBoundingClientRect = function (...args) {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      if (this.hasAttribute("data-player-anchor") && !window.__wtkRootOverlayPreGraphAnchors && overlay?.dataset.rootActionReady === "false") {
        window.__wtkRootOverlayPreGraphAnchors = Object.fromEntries(
          [...document.querySelectorAll("[data-player-anchor]")].map((anchor) => {
            const bounds = original.call(anchor);
            return [anchor.dataset.playerAnchor, { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height }];
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
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${seed.players[playerIndex].token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function observePublicAttackProofPolls(page) {
  const samples = [];
  page.on("response", async (response) => {
    if (response.request().method() !== "GET" || !response.url().includes("/api/rooms?")) return;
    try {
      const view = await response.json();
      const identity = view.presentationSnapshot?.identity;
      const root = view.presentationSnapshot?.rootAction;
      samples.push({
        observedAt: Date.now(),
        phase: view.phase ?? null,
        currentActionKind: view.currentAction?.kind ?? null,
        identity: identity ? {
          interactionId: identity.interactionId,
          checkpointId: identity.checkpointId,
          presentationRevision: identity.presentationRevision,
        } : null,
        rootAction: root ? {
          interactionId: root.interactionId,
          rootFrameId: root.rootFrameId,
          checkpointId: root.checkpointId,
          presentationRevision: root.presentationRevision,
          rootEventId: root.rootEventId,
          sourceId: root.sourceId,
          targetId: root.targetId,
          action: root.action,
          cardKind: root.cardKind,
        } : null,
      });
    } catch { /* Ignore non-JSON or expired room responses in this test-only observer. */ }
  });
  return samples;
}

async function playAttackThroughPage(page, targetName, card = attack) {
  await page.locator(`[data-hand-card-id="${card.id}"] .game-card`).click();
  await page.getByRole("button", { name: `Select ${targetName}`, exact: true }).click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const responsePromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "play_card"; }
    catch { return false; }
  });
  await confirm.click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`Attack submission failed: ${await response.text()}`);
}

async function playTargetedStratagemThroughPage(page, targetName, card, actionName) {
  await page.locator(`[data-hand-card-id="${card.id}"] .game-card`).click();
  await page.getByRole("button", { name: `Select ${targetName}`, exact: true }).click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const responsePromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "play_card"; }
    catch { return false; }
  });
  await confirm.click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`${actionName} submission failed: ${await response.text()}`);
}

async function playDodgeThroughPage(page, card = dodge) {
  const dodgeButton = page.locator(`[data-hand-card-id="${card.id}"] .game-card`);
  await expect(dodgeButton).toBeEnabled();
  await dodgeButton.click();
  await expect(dodgeButton).toHaveClass(/selected/);
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const requestPromise = page.waitForRequest((request) => {
    if (request.url() !== `${API}/api/rooms` || request.method() !== "POST") return false;
    try { return JSON.parse(request.postData() ?? "{}").action === "respond"; }
    catch { return false; }
  });
  await confirm.click();
  await requestPromise;
}

async function observeAttackDodgeSettlement(page, sourceId = null, targetId = null) {
  await page.evaluate(({ sourceId, targetId }) => {
    const timing = window.__wtkAttackDodgeSettlementTiming = { shownAt: null, exitingAt: null, removedAt: null, outcome: null };
    const capture = () => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const node = overlay?.querySelector('[data-root-action-settled="true"]');
      if (node && overlay?.dataset.rootActionReady === "true" && timing.shownAt === null) {
        timing.shownAt = performance.now();
        timing.outcome = node.dataset.rootActionSettlementOutcome ?? null;
        if (sourceId && targetId) {
          const rect = (element) => {
            if (!element) return null;
            const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
            return { x, y, right, bottom, width, height };
          };
          const style = (element, properties) => {
            if (!element) return null;
            const computed = getComputedStyle(element);
            return Object.fromEntries(properties.map((property) => [property, computed[property]]));
          };
          const root = overlay.querySelector('[data-root-action-card="true"]');
          const response = overlay.querySelector('[data-root-action-response-card="true"]');
          const connector = overlay.querySelector(".interaction-root-connectors");
          const connectorRect = connector?.getBoundingClientRect() ?? null;
          const anchor = (playerId) => [...document.querySelectorAll("[data-player-anchor]")]
            .find((element) => element.dataset.playerAnchor === playerId);
          const pathSnapshot = (path) => {
            if (!path || !connectorRect) return null;
            const length = path.getTotalLength();
            const points = [];
            for (let distance = 4; distance < length - 4; distance += 4) {
              const point = path.getPointAtLength(distance);
              points.push({ x: point.x + connectorRect.x, y: point.y + connectorRect.y });
            }
            const at = (distance) => {
              const point = path.getPointAtLength(distance);
              return { x: point.x + connectorRect.x, y: point.y + connectorRect.y };
            };
            return {
              edge: path.dataset.rootActionEdge ?? "interception-mark",
              dataset: { ...path.dataset },
              d: path.getAttribute("d"),
              markerEnd: path.getAttribute("marker-end"),
              stroke: getComputedStyle(path).stroke,
              strokeWidth: getComputedStyle(path).strokeWidth,
              strokeDasharray: getComputedStyle(path).strokeDasharray,
              opacity: getComputedStyle(path).opacity,
              start: at(0), end: at(length), middle: at(length / 2), points,
            };
          };
          const paths = [...overlay.querySelectorAll('[data-root-action-edge], [data-root-action-dodge-interception-mark="true"]')]
            .map(pathSnapshot).filter(Boolean);
          const bounds = {
            source: rect(anchor(sourceId)), target: rect(anchor(targetId)), root: rect(root), response: rect(response),
            table: rect(document.querySelector(".play-table")), shell: rect(document.querySelector(".game-shell")),
            anchors: [...document.querySelectorAll("[data-player-anchor]")].map((element) => ({ id: element.dataset.playerAnchor, ...rect(element) })),
            obstacles: [...document.querySelectorAll("[data-player-anchor], .play-center, .stage-system-cluster, .game-messages, .game-exit")].map(rect).filter(Boolean),
          };
          const project = (point, start, end) => {
            const dx = end.x - start.x;
            const dy = end.y - start.y;
            return ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1);
          };
          const center = (box) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 });
          const edge = (box, toward) => {
            const boxCenter = center(box);
            const dx = toward.x - boxCenter.x;
            const dy = toward.y - boxCenter.y;
            const scale = Math.min(dx === 0 ? Infinity : box.width / 2 / Math.abs(dx), dy === 0 ? Infinity : box.height / 2 / Math.abs(dy));
            return { x: boxCenter.x + dx * scale, y: boxCenter.y + dy * scale };
          };
          const distanceToRect = (point, box) => Math.hypot(Math.max(box.x - point.x, 0, point.x - box.right), Math.max(box.y - point.y, 0, point.y - box.bottom));
          const segmentIntersectsRect = (start, end, box) => {
            const vx = end.x - start.x;
            const vy = end.y - start.y;
            let low = 0;
            let high = 1;
            for (const [p, q] of [[-vx, start.x - box.x], [vx, box.right - start.x], [-vy, start.y - box.y], [vy, box.bottom - start.y]]) {
              if (p === 0) { if (q < 0) return false; continue; }
              const t = q / p;
              if (p < 0) low = Math.max(low, t); else high = Math.min(high, t);
              if (low > high) return false;
            }
            return true;
          };
          const sourceCenter = center(bounds.source);
          const targetCenter = center(bounds.target);
          const rootCenter = center(bounds.root);
          const responseCenter = center(bounds.response);
          const attackStart = edge(bounds.root, targetCenter);
          const attackEnd = edge(bounds.target, rootCenter);
          const dx = attackEnd.x - attackStart.x;
          const dy = attackEnd.y - attackStart.y;
          const fraction = Math.max(0, Math.min(1, ((responseCenter.x - attackStart.x) * dx + (responseCenter.y - attackStart.y) * dy) / (dx * dx + dy * dy || 1)));
          const closest = { x: attackStart.x + dx * fraction, y: attackStart.y + dy * fraction };
          const mark = overlay.querySelector('[data-root-action-dodge-interception-mark="true"]');
          const markPoints = pathSnapshot(mark);
          const marker = overlay.querySelector('.interaction-root-connectors marker[id^="root-target-arrow-"]');
          const face = (element) => element?.querySelector(".played-card") ?? null;
          const faceStyle = (element) => style(face(element), ["backgroundImage", "visibility"]);
          const edgeState = (name) => paths.find((path) => path.edge === name) ?? null;
          const attackSegment = edgeState("attack-dodge-interception");
          const markerPoint = markPoints?.middle;
          window.__wtkAttackDodgeSettlementVisual = {
            overlay: {
              ready: overlay.dataset.rootActionReady,
              enabled: overlay.dataset.rootActionEnabled,
              mode: overlay.dataset.rootActionDisplayMode,
              layout: overlay.dataset.rootActionLayoutState,
              fallbackReason: overlay.dataset.rootActionFallbackReason ?? null,
              cardFitStep: overlay.dataset.rootActionCardFitStep,
              ariaLabel: overlay.getAttribute("aria-label"),
              role: overlay.getAttribute("role"),
              pointerEvents: getComputedStyle(overlay).pointerEvents,
            },
            root: {
              dataset: { ...root.dataset }, rect: bounds.root,
              faceVisible: Boolean(face(root) && rect(face(root))?.width > 0), faceStyle: faceStyle(root),
              directSmallCount: [...root.children].filter((child) => child.tagName === "SMALL").length,
              ariaLabel: root.getAttribute("aria-label"),
            },
            response: {
              dataset: { ...response.dataset }, rect: bounds.response,
              faceVisible: Boolean(face(response) && rect(face(response))?.width > 0), faceStyle: faceStyle(response),
              ariaLabel: response.getAttribute("aria-label"),
            },
            bounds,
            geometry: {
              projection: { root: project(rootCenter, sourceCenter, targetCenter), response: project(responseCenter, sourceCenter, targetCenter) },
              interception: {
                mode: response.dataset.rootActionDodgeInterception,
                centerFraction: fraction,
                centerDistanceToPath: Math.hypot(responseCenter.x - closest.x, responseCenter.y - closest.y),
                lineIntersectsCard: segmentIntersectsRect(attackStart, attackEnd, bounds.response),
                nearestPathToCardEdge: distanceToRect(closest, bounds.response),
                pathEndpointToMarkCenter: attackSegment && markerPoint ? Math.hypot(attackSegment.end.x - markerPoint.x, attackSegment.end.y - markerPoint.y) : null,
                markCenterToCardEdge: markerPoint ? distanceToRect(markerPoint, bounds.response) : null,
              },
              edges: paths,
              marker: marker ? { width: marker.getAttribute("markerWidth"), height: marker.getAttribute("markerHeight") } : null,
              targetHighlight: style(overlay.querySelector('[data-root-action-target-highlight="true"]'), ["strokeWidth"]),
              blockedCount: document.querySelectorAll('[data-root-action-blocked="true"]').length,
              stageCount: document.querySelectorAll(".interaction-stage").length,
              tablePlayedCardCount: document.querySelectorAll(".table-resolution-layer .table-played-card").length,
              documentWidth: document.documentElement.scrollWidth,
              viewportWidth: innerWidth,
            },
          };
        }
      }
      if (node && timing.shownAt !== null && sourceId && targetId && !timing.highlightSampling) {
        timing.highlightSampling = true;
        const sampleHighlight = () => {
          const liveOverlay = document.querySelector('[data-root-action-overlay="true"]');
          const liveNode = liveOverlay?.querySelector('[data-root-action-settled="true"]');
          if (!liveNode) return;
          const highlight = liveOverlay.querySelector('[data-root-action-target-highlight="true"]');
          if (highlight) {
            timing.lastTargetHighlightWidth = Number.parseFloat(getComputedStyle(highlight).strokeWidth);
            if (timing.lastTargetHighlightWidth <= 2.01) timing.targetHighlightReachedNeutral = true;
          }
          requestAnimationFrame(sampleHighlight);
        };
        requestAnimationFrame(sampleHighlight);
      }
      if (node?.classList.contains("is-settlement-exiting") && timing.exitingAt === null) timing.exitingAt = performance.now();
      if (!node && timing.shownAt !== null && timing.removedAt === null) timing.removedAt = performance.now();
    };
    new MutationObserver(capture).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-root-action-ready", "data-root-action-settled", "data-root-action-settlement-outcome", "data-root-action-settlement-exiting"],
    });
    capture();
  }, { sourceId, targetId });
}

async function observeAttackHitSettlement(page) {
  await page.evaluate(() => {
    const timing = window.__wtkAttackHitSettlementTiming = { shownAt: null, exitingAt: null, removedAt: null, outcome: null, overlayLabel: null };
    const capture = () => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const node = overlay?.querySelector('[data-root-action-settled="true"]');
      if (node && overlay?.dataset.rootActionReady === "true" && timing.shownAt === null) {
        timing.shownAt = performance.now();
        timing.outcome = node.dataset.rootActionSettlementOutcome ?? null;
        timing.overlayLabel = overlay.getAttribute("aria-label");
      }
      if (node?.classList.contains("is-settlement-exiting") && timing.exitingAt === null) timing.exitingAt = performance.now();
      if (!node && timing.shownAt !== null && timing.removedAt === null) timing.removedAt = performance.now();
    };
    new MutationObserver(capture).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-root-action-ready", "data-root-action-settled", "data-root-action-settlement-outcome", "data-root-action-settlement-exiting"],
    });
    capture();
  });
}

async function observeDismantleSettlement(page) {
  await page.evaluate(() => {
    const timing = window.__wtkDismantleSettlementTiming = { shownAt: null, exitingAt: null, removedAt: null, outcome: null };
    const capture = () => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const node = overlay?.querySelector('[data-root-action-settled="true"]');
      if (node && overlay?.dataset.rootActionReady === "true" && timing.shownAt === null) {
        timing.shownAt = performance.now();
        timing.outcome = node.dataset.rootActionSettlementOutcome ?? null;
        timing.resultLabel = node.querySelector("small")?.textContent?.trim() ?? null;
        timing.overlayLabel = overlay.getAttribute("aria-label");
      }
      if (node?.classList.contains("is-settlement-exiting") && timing.exitingAt === null) timing.exitingAt = performance.now();
      if (!node && timing.shownAt !== null && timing.removedAt === null) timing.removedAt = performance.now();
    };
    new MutationObserver(capture).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-root-action-ready", "data-root-action-settled", "data-root-action-settlement-outcome", "data-root-action-settlement-exiting"],
    });
    capture();
  });
}

async function observeStealSettlement(page) {
  await page.evaluate(() => {
    const timing = window.__wtkStealSettlementTiming = { shownAt: null, exitingAt: null, removedAt: null, outcome: null };
    const capture = () => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const node = overlay?.querySelector('[data-root-action-settled="true"]');
      if (node && overlay?.dataset.rootActionReady === "true" && timing.shownAt === null) {
        timing.shownAt = performance.now();
        timing.outcome = node.dataset.rootActionSettlementOutcome ?? null;
        timing.resultLabel = node.querySelector("small")?.textContent?.trim() ?? null;
        timing.overlayLabel = overlay.getAttribute("aria-label");
      }
      if (node?.classList.contains("is-settlement-exiting") && timing.exitingAt === null) timing.exitingAt = performance.now();
      if (!node && timing.shownAt !== null && timing.removedAt === null) timing.removedAt = performance.now();
    };
    new MutationObserver(capture).observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "data-root-action-ready", "data-root-action-settled", "data-root-action-settlement-outcome", "data-root-action-settlement-exiting"],
    });
    capture();
  });
}

async function playPeachThroughPage(page) {
  await page.locator(`[data-hand-card-id="${peach.id}"] .game-card`).click();
  const play = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(play).toBeEnabled();
  const responsePromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "play_card"; }
    catch { return false; }
  });
  await play.click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`Peach submission failed: ${await response.text()}`);
}

async function measure(page, sourceId, targetId) {
  return page.evaluate(({ sourceId: source, targetId: target }) => {
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      return { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
    };
    const anchor = (id) => [...document.querySelectorAll("[data-player-anchor]")]
      .filter((element) => element.dataset.playerAnchor === id);
    const card = document.querySelector('[data-root-action-card="true"]');
    const anchors = [...document.querySelectorAll("[data-player-anchor]")];
    const connectorSvg = document.querySelector(".interaction-root-connectors");
    const connectorSvgBounds = connectorSvg?.getBoundingClientRect();
    return {
      source: rect(anchor(source)[0]),
      target: rect(anchor(target)[0]),
      card: rect(card),
      table: rect(document.querySelector(".play-table")),
      shell: rect(document.querySelector(".game-shell")),
      playCenter: rect(document.querySelector(".play-center")),
      systemCluster: rect(document.querySelector(".stage-system-cluster")),
      gameMessages: rect(document.querySelector(".game-messages")),
      gameExit: rect(document.querySelector(".game-exit")),
      overlayPosition: getComputedStyle(document.querySelector('[data-root-action-overlay="true"]')).position,
      overlayPointerEvents: getComputedStyle(document.querySelector('[data-root-action-overlay="true"]')).pointerEvents,
      playerAnchors: anchors.map((element) => ({ id: element.dataset.playerAnchor, ...rect(element) })),
      connectorPoints: [...document.querySelectorAll("[data-root-action-edge]")].map((path) => {
        const length = path.getTotalLength();
        const points = [];
        for (let distance = 5; distance < length - 5; distance += 4) {
          const point = path.getPointAtLength(distance);
          points.push({ x: point.x + (connectorSvgBounds?.x ?? 0), y: point.y + (connectorSvgBounds?.y ?? 0) });
        }
        return { edge: path.dataset.rootActionEdge, points };
      }),
      sourceEdge: document.querySelector('[data-root-action-edge="source"]')?.getAttribute("d") ?? null,
      targetEdge: document.querySelector('[data-root-action-edge="target"]')?.getAttribute("marker-end") ?? null,
      sourcePath: document.querySelector('[data-root-action-edge="source"]')?.getAttribute("d") ?? null,
      targetPath: document.querySelector('[data-root-action-edge="target"]')?.getAttribute("d") ?? null,
      sourceStrokeWidth: Number.parseFloat(getComputedStyle(document.querySelector('[data-root-action-edge="source"]') ?? document.documentElement).strokeWidth),
      targetStrokeWidth: Number.parseFloat(getComputedStyle(document.querySelector('[data-root-action-edge="target"]') ?? document.documentElement).strokeWidth),
      sourceStrokeColor: getComputedStyle(document.querySelector('[data-root-action-edge="source"]') ?? document.documentElement).stroke,
      targetStrokeColor: getComputedStyle(document.querySelector('[data-root-action-edge="target"]') ?? document.documentElement).stroke,
      targetOpacity: getComputedStyle(document.querySelector('[data-root-action-edge="target"]') ?? document.documentElement).opacity,
      targetMarkerWidth: document.querySelector('.interaction-root-connectors marker[id^="root-target-arrow-"]')?.getAttribute("markerWidth") ?? null,
      targetMarkerHeight: document.querySelector('.interaction-root-connectors marker[id^="root-target-arrow-"]')?.getAttribute("markerHeight") ?? null,
      targetHighlight: rect(document.querySelector('[data-root-action-target-highlight="true"]')),
      targetHighlightGeometry: (() => {
        const highlight = document.querySelector('[data-root-action-target-highlight="true"]');
        if (!highlight) return null;
        return Object.fromEntries(["x", "y", "width", "height"].map((key) => [key, Number.parseFloat(highlight.getAttribute(key) ?? "NaN")]));
      })(),
      targetHighlightState: document.querySelector('[data-root-action-target-highlight="true"]')?.dataset.rootActionTargetHighlightState ?? null,
      targetHighlightStrokeWidth: Number.parseFloat(getComputedStyle(document.querySelector('[data-root-action-target-highlight="true"]') ?? document.documentElement).strokeWidth),
      targetHighlightPlayerId: document.querySelector('[data-root-action-target-highlight="true"]')?.dataset.rootActionTargetHighlightPlayerId ?? null,
      targetHighlightStrokeColor: getComputedStyle(document.querySelector('[data-root-action-target-highlight="true"]') ?? document.documentElement).stroke,
      targetHighlightFill: getComputedStyle(document.querySelector('[data-root-action-target-highlight="true"]') ?? document.documentElement).fill,
      targetHighlightFilter: getComputedStyle(document.querySelector('[data-root-action-target-highlight="true"]') ?? document.documentElement).filter,
      targetHighlightOpacity: getComputedStyle(document.querySelector('[data-root-action-target-highlight="true"]') ?? document.documentElement).opacity,
      targetHighlightPointerEvents: getComputedStyle(document.querySelector('[data-root-action-target-highlight="true"]') ?? document.documentElement).pointerEvents,
      overlayCardKind: document.querySelector('[data-root-action-overlay="true"]')?.dataset.rootActionCardKind ?? null,
      responseCount: document.querySelector('[data-root-action-overlay="true"]')?.dataset.rootActionResponseCount ?? null,
      overlayReady: document.querySelector('[data-root-action-overlay="true"]')?.dataset.rootActionReady === "true",
      stageCount: document.querySelectorAll(".interaction-stage").length,
      settledCardCount: document.querySelectorAll(".table-resolution-layer .table-played-card").length,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    };
  }, { sourceId, targetId });
}

function expectAttackTargetHighlightCoversAnchor(measurement, targetId, state) {
  const { target, shell, targetHighlightGeometry: highlight } = measurement;
  expect(highlight, "the proven Attack target has a measured SVG highlight").not.toBeNull();
  for (const [dimension, expected] of Object.entries({
    x: target.x - shell.x,
    y: target.y - shell.y,
    width: target.width,
    height: target.height,
  })) {
    expect(Math.abs(highlight[dimension] - expected), `highlight ${dimension} matches the complete player anchor: ${JSON.stringify({ actual: highlight[dimension], expected, target, shell })}`).toBeLessThanOrEqual(0.5);
  }
  expect(measurement.targetHighlightPlayerId).toBe(targetId);
  expect(measurement.targetHighlightState).toBe(state);
  expect(measurement.targetHighlightFill).toBe("rgba(0, 0, 0, 0)");
  expect(measurement.targetHighlightPointerEvents).toBe("none");
  if (state === "active") {
    expect(measurement.targetHighlightStrokeWidth).toBe(3.5);
    expect(measurement.targetHighlightStrokeColor).toBe("rgb(255, 151, 133)");
    expect(measurement.targetHighlightOpacity).toBe("0.98");
    expect(measurement.targetHighlightFilter).toContain("18px");
  } else {
    expect(Math.abs(measurement.targetHighlightStrokeWidth - 2)).toBeLessThanOrEqual(0.01);
    expect(measurement.targetHighlightStrokeColor).toBe("rgb(167, 170, 165)");
    expect(Math.abs(Number.parseFloat(measurement.targetHighlightOpacity) - 0.4)).toBeLessThanOrEqual(0.005);
    expect(measurement.targetHighlightFilter).toContain("8px");
  }
}

for (const scenario of [
  { playerCount: 4, viewport: { width: 390, height: 844 } },
  { playerCount: 4, viewport: { width: 480, height: 900 } },
  { playerCount: 4, viewport: { width: 1440, height: 900 } },
  { playerCount: 6, viewport: { width: 390, height: 844 } },
  { playerCount: 8, viewport: { width: 390, height: 844 } },
  { playerCount: 8, viewport: { width: 480, height: 900 } },
  { playerCount: 8, viewport: { width: 1440, height: 900 } },
]) {
  const { playerCount, viewport } = scenario;
  test(`real ${playerCount}-player Attack root overlay uses physical anchors at ${viewport.width}×${viewport.height}`, async ({ page, browser, request }, testInfo) => {
    test.setTimeout(60_000);
    const seed = await seedGame(request, playerCount);
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    await openGame(page, seed, 0, viewport);
    await page.evaluate(() => window.__wtkStartAttackVisibleFrameSampling());
    await playAttackThroughPage(page, "TARGET");

    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, { timeout: 20_000 }).not.toBeNull();
    const targetServerView = await roomView(request, seed, 1);
    const rootAction = targetServerView.presentationSnapshot.rootAction;
    expect(targetServerView.currentAction.kind).toBe("response");
    expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", sourceId, targetId });
    expect(targetServerView.timeline.some((event) => event.id === rootAction.rootEventId && event.action === "play" && event.card?.kind === "Attack")).toBe(true);
    expect(JSON.stringify(rootAction)).not.toContain(attack.id);

    const supportedLayout = await assertAttackGraphOrSafeFallback(page, viewport, `${playerCount}p ${viewport.width}px physical-anchor matrix`);
    if (supportedLayout.mode === "fallback") {
      expect(playerCount, "only dense scenes may fail closed when no collision-free card fit exists").toBeGreaterThan(4);
      await testInfo.attach("attack-safe-fallback.json", {
        body: JSON.stringify(supportedLayout.diagnostics, null, 2),
        contentType: "application/json",
      });
      await testInfo.attach("attack-safe-fallback.png", { body: await page.screenshot(), contentType: "image/png" });
      return;
    }
    expect(supportedLayout.mode).toBe("graph");

    const rootCard = page.locator('[data-root-action-card="true"]');
    await expect(rootCard).toBeVisible({ timeout: 20_000 });
    await expect(rootCard).toHaveAttribute("aria-label", "SOURCE played Attack targeting TARGET");
    const overlay = page.locator('[data-root-action-overlay="true"]');
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true");
    await expect(overlay).toHaveAttribute("data-root-action-display-mode", "graph");
    await expect(overlay).toHaveAttribute("data-root-action-layout-state", "ready");
    expect(await overlay.getAttribute("data-root-action-fallback-reason")).toBeNull();
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    await expect(page.locator(".active-table-reveal .game-card")).toHaveCount(0);
    await expect(page.locator(".stage-system-cluster")).toBeVisible();
    try {
      await expect.poll(() => page.evaluate(() => window.__wtkAttackVisibleFrames.some((frame) => frame.mode === "graph" && frame.rootCardVisible)), {
        message: "RAF sampler observes the graph after the rendered proof state",
      }).toBe(true);
    } catch (error) {
      const diagnostic = await page.evaluate(() => ({
        samplingComplete: window.__wtkAttackFrameSamplingComplete,
        frameCount: window.__wtkAttackVisibleFrames.length,
        recentFrames: window.__wtkAttackVisibleFrames.slice(-8),
        liveOverlay: (() => {
          const overlay = document.querySelector('[data-root-action-overlay="true"]');
          const card = overlay?.querySelector('[data-root-action-card="true"]');
          const style = card ? getComputedStyle(card) : null;
          const bounds = card?.getBoundingClientRect();
          return overlay ? {
            mode: overlay.dataset.rootActionDisplayMode,
            ready: overlay.dataset.rootActionReady,
            eventId: overlay.dataset.rootActionEventId,
            rootCardVisible: Boolean(card && style?.display !== "none" && style?.visibility !== "hidden"
              && Number(style?.opacity) > 0 && bounds && bounds.width > 0 && bounds.height > 0),
          } : null;
        })(),
      }));
      await testInfo.attach("attack-frame-sampler-failure.json", { body: JSON.stringify(diagnostic, null, 2), contentType: "application/json" });
      throw new Error(`${error.message}\nRAF diagnostic: ${JSON.stringify(diagnostic)}`);
    }
    const after = await measure(page, sourceId, targetId);
    expect(after.sourcePath, JSON.stringify({ cardKind: after.overlayCardKind, responseCount: after.responseCount, path: after.sourcePath })).toMatch(/^M \S+ \S+ L \S+ \S+$/);
    expect(after.targetPath).toMatch(/^M \S+ \S+ L \S+ \S+$/);
    expect(after.sourceStrokeWidth).toBe(4);
    expect(after.targetStrokeWidth).toBeGreaterThanOrEqual(6);
    expect(after.sourceStrokeColor).toBe("rgb(134, 185, 162)");
    expect(after.targetStrokeColor).toBe("rgb(224, 107, 93)");
    expect(after.targetOpacity).toBe("1");
    expect(after.targetMarkerWidth).toBe("30");
    expect(after.targetMarkerHeight).toBe("22");
    expect(after.targetHighlight).not.toBeNull();
    expectAttackTargetHighlightCoversAnchor(after, targetId, "active");
    expect(after.overlayCardKind).toBe("Attack");
    const before = await page.evaluate(() => window.__wtkRootOverlayPreGraphAnchors);
    expect(before, "capture the stable response scene before the graph suppresses Stage").toBeTruthy();
    await testInfo.attach("root-overlay-geometry.json", {
      body: JSON.stringify({ playerCount, viewport, before, after }, null, 2),
      contentType: "application/json",
    });
    expect(Object.keys(before)).toHaveLength(playerCount);
    expect(after.playerAnchors).toHaveLength(playerCount);
    expect(after.overlayPosition).toBe("absolute");
    expect(after.overlayPointerEvents).toBe("none");
    expect(after.documentWidth).toBeLessThanOrEqual(after.viewportWidth);
    expect(after.card.x).toBeGreaterThanOrEqual(after.table.x);
    expect(after.card.y).toBeGreaterThanOrEqual(after.table.y);
    const fitStep = await overlay.getAttribute("data-root-action-card-fit-step");
    const expectedCardSize = expectedAttackCardFaceSize(viewport, "Attack", fitStep);
    expect(after.card.width, "root action card follows the approved responsive CardFace fit step").toBeCloseTo(expectedCardSize.width, 1);
    expect(after.card.height, "root action card preserves the approved 2:3 CardFace fit").toBeCloseTo(expectedCardSize.height, 1);
    expect(after.card.right).toBeLessThanOrEqual(after.table.right);
    expect(after.card.bottom).toBeLessThanOrEqual(after.table.bottom);
    expect(after.playerAnchors.every((anchor) => {
      return after.card.right <= anchor.x || after.card.x >= anchor.right || after.card.bottom <= anchor.y || after.card.y >= anchor.bottom;
    })).toBe(true);
    expect(after.playCenter && (after.card.right <= after.playCenter.x || after.card.x >= after.playCenter.right || after.card.bottom <= after.playCenter.y || after.card.y >= after.playCenter.bottom)).toBe(true);
    for (const obstacle of [after.systemCluster, after.gameMessages, after.gameExit].filter(Boolean)) {
      expect(after.card.right <= obstacle.x || after.card.x >= obstacle.right || after.card.bottom <= obstacle.y || after.card.y >= obstacle.bottom).toBe(true);
    }
    expect(after.sourceEdge).toMatch(/^M /);
    expect(after.targetEdge).toContain("root-target-arrow-");
    for (const connector of after.connectorPoints) {
      expect(connector.points.every((point) => point.x >= after.shell.x && point.x <= after.shell.right
        && point.y >= after.shell.y && point.y <= after.shell.bottom), `${connector.edge} remains inside the game shell`).toBe(true);
    }
    for (const anchor of after.playerAnchors) {
      const baseline = before[anchor.id];
      expect(baseline, `baseline anchor exists for ${anchor.id}`).toBeTruthy();
      for (const dimension of ["x", "y", "right", "bottom", "width", "height"]) {
        expect(Math.abs(anchor[dimension] - baseline[dimension]), `${anchor.id} ${dimension} remains fixed when graph appears`).toBeLessThanOrEqual(0.5);
      }
    }
    for (const connector of after.connectorPoints) {
      const clearOfOtherSeats = connector.points.every((point) => after.playerAnchors
        .filter((anchor) => anchor.id !== sourceId && anchor.id !== targetId)
        .every((anchor) => point.x < anchor.x - 2 || point.x > anchor.right + 2 || point.y < anchor.y - 2 || point.y > anchor.bottom + 2));
      expect(clearOfOtherSeats, `${connector.edge} avoids unrelated physical player anchors`).toBe(true);
    }
    expect(after.settledCardCount).toBe(0);
    const opponentSeatScreenshot = await page.screenshot({ path: testInfo.outputPath("attack-opponent-seat-active-highlight.png") });
    await testInfo.attach("attack-opponent-seat-active-highlight", { body: opponentSeatScreenshot, contentType: "image/png" });

    const inspectTarget = page.locator(`[data-player-anchor="${targetId}"] .opponent-hero-target`);
    await expect(inspectTarget).toHaveAttribute("aria-label", "Inspect TARGET");
    await inspectTarget.click();
    const inspectOverlay = page.locator('[data-root-action-overlay="true"]');
    await expect(inspectOverlay).toHaveAttribute("data-root-action-display-mode", "fallback");
    await expect(inspectOverlay).toHaveAttribute("data-root-action-fallback-reason", "local-presentation-precedence");
    await expect(inspectOverlay).toHaveAttribute("aria-hidden", "true");
    await expect(page.locator('.interaction-stage[data-local-ui-mode="INSPECT"]')).toBeVisible();
    await testInfo.attach("attack-inspect-fallback", { body: await page.screenshot(), contentType: "image/png" });
    await expect.poll(() => page.evaluate((rootEventId) => window.__wtkAttackVisibleFrames.some((frame) => frame.rootEventId === rootEventId
      && frame.mode === "fallback" && frame.fallbackGate === "local-presentation-precedence"
      && !frame.rootCardVisible && frame.interactionStageVisible), rootAction.rootEventId), {
      message: "RAF trace records Inspect as the explicit safe fallback",
    }).toBe(true);
    const inspectFallbackFrame = await page.evaluate((rootEventId) => window.__wtkAttackVisibleFrames.find((frame) => frame.rootEventId === rootEventId
      && frame.mode === "fallback" && frame.fallbackGate === "local-presentation-precedence"
      && !frame.rootCardVisible && frame.interactionStageVisible), rootAction.rootEventId);
    await page.getByRole("button", { name: "Close TARGET inspection", exact: true }).click();
    await expect(inspectOverlay).toHaveAttribute("data-root-action-ready", "true");
    await expect(inspectOverlay).toHaveAttribute("data-root-action-display-mode", "graph");
    await expect(inspectOverlay).toHaveAttribute("data-root-action-layout-state", "ready");
    expect(await inspectOverlay.getAttribute("data-root-action-fallback-reason")).toBeNull();
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    await expect.poll(() => page.evaluate(({ rootEventId, afterFrame }) => window.__wtkAttackVisibleFrames.some((frame) => frame.rootEventId === rootEventId
      && frame.frameNumber > afterFrame && frame.mode === "graph" && frame.rootCardVisible), { rootEventId: rootAction.rootEventId, afterFrame: inspectFallbackFrame.frameNumber }), {
      message: "RAF trace records return to the graph after Inspect closes",
    }).toBe(true);
    await page.evaluate(() => window.__wtkStopAttackVisibleFrameSampling());
    const visibleFrames = await page.evaluate(() => window.__wtkAttackVisibleFrames);
    const rootFrames = visibleFrames.filter((frame) => frame.rootEventId === rootAction.rootEventId);
    const firstProvenFrame = rootFrames[0];
    const firstGraphFrame = rootFrames.find((frame) => frame.mode === "graph" && frame.rootCardVisible);
    await testInfo.attach("attack-visible-frames.json", { body: JSON.stringify(visibleFrames, null, 2), contentType: "application/json" });
    expect(firstProvenFrame, "RAF trace observes the server-proven root event").toBeTruthy();
    expect(firstProvenFrame).toMatchObject({ sourceId, targetId, rootCardKind: "Attack" });
    expect(firstGraphFrame, "RAF trace observes the graph as a visible composition").toBeTruthy();
    expect(firstGraphFrame.elapsedMs - firstProvenFrame.elapsedMs, "graph handoff is bounded from the first rendered proof frame").toBeLessThanOrEqual(250);
    expect(inspectFallbackFrame).toMatchObject({ rootEventId: rootAction.rootEventId, sourceId, targetId, rootCardKind: "Attack", mode: "fallback", fallbackGate: "local-presentation-precedence", rootCardVisible: false, interactionStageVisible: true });
    expect(rootFrames.every((frame) => !(frame.rootCardVisible
      && (frame.interactionStageVisible || frame.activeTableRevealCardCount > 0))), "no sampled frame mixes the graph with legacy Stage/reveal cards").toBe(true);
    expect(rootFrames.filter((frame) => frame.mode === "graph").every((frame) => frame.rootCardVisible
      && !frame.interactionStageVisible && !frame.attackResponseStageVisible && frame.activeTableRevealCardCount === 0), "every graph frame contains only the root-card composition").toBe(true);

    const targetPage = await browser.newPage({ viewport });
    try {
      await openGame(targetPage, seed, 1, viewport);
      const targetOverlay = targetPage.locator('[data-root-action-overlay="true"]');
      await expect(targetOverlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
      await targetPage.evaluate(() => window.__wtkStartAttackVisibleFrameSampling());
      const dock = targetPage.locator(`.local-player-dock[data-player-anchor="${targetId}"]`);
      const hiddenAnchorStyle = await targetPage.addStyleTag({ content: `.local-player-dock[data-player-anchor="${targetId}"] { display: none !important; }` });
      await expect(dock).toBeHidden();
      await targetPage.evaluate(() => window.dispatchEvent(new Event("resize")));
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "false");
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-display-mode", "fallback");
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-layout-state", "unavailable");
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-fallback-reason", "geometry-unavailable");
      await expect(targetPage.locator('[data-root-action-card="true"]')).toBeHidden();
      await expect(targetPage.locator(".interaction-stage")).toHaveCount(1);
      await expect.poll(() => targetPage.evaluate((rootEventId) => window.__wtkAttackVisibleFrames.some((frame) => frame.rootEventId === rootEventId
        && frame.mode === "fallback" && frame.fallbackGate === "geometry-unavailable"
        && !frame.rootCardVisible && frame.interactionStageVisible), rootAction.rootEventId), {
        message: "RAF trace records geometry failure and its safe Stage fallback",
      }).toBe(true);
      const geometryFallbackFrame = await targetPage.evaluate((rootEventId) => window.__wtkAttackVisibleFrames.find((frame) => frame.rootEventId === rootEventId
        && frame.mode === "fallback" && frame.fallbackGate === "geometry-unavailable"
        && !frame.rootCardVisible && frame.interactionStageVisible), rootAction.rootEventId);
      await hiddenAnchorStyle.evaluate((style) => style.remove());
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true");
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-display-mode", "graph");
      await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);
      await expect.poll(() => targetPage.evaluate(({ rootEventId, afterFrame }) => window.__wtkAttackVisibleFrames.some((frame) => frame.rootEventId === rootEventId
        && frame.frameNumber > afterFrame && frame.mode === "graph" && frame.rootCardVisible), { rootEventId: rootAction.rootEventId, afterFrame: geometryFallbackFrame.frameNumber }), {
        message: "RAF trace records return to graph after geometry recovers",
      }).toBe(true);
      const skip = dock.locator('[data-action-slot="decline"] button');
      await expect(skip).toHaveText("Skip");
      await expect(skip).toBeEnabled();
      const skipResponse = targetPage.waitForResponse((response) => {
        if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
        try { return JSON.parse(response.request().postData() ?? "{}").action === "decline_response"; }
        catch { return false; }
      });
      await skip.click();
      expect((await skipResponse).ok()).toBe(true);
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveCount(0, { timeout: 10_000 });
      await targetPage.evaluate(() => window.__wtkStopAttackVisibleFrameSampling());
      const targetFrames = await targetPage.evaluate(() => window.__wtkAttackVisibleFrames);
      await testInfo.attach("attack-geometry-fallback-visible-frames.json", { body: JSON.stringify(targetFrames, null, 2), contentType: "application/json" });
      expect(geometryFallbackFrame).toMatchObject({ rootEventId: rootAction.rootEventId, sourceId, targetId, rootCardKind: "Attack", mode: "fallback", fallbackGate: "geometry-unavailable", rootCardVisible: false, interactionStageVisible: true });
      expect(targetFrames.some((frame) => frame.rootEventId === rootAction.rootEventId && frame.mode === "graph" && frame.rootCardVisible)).toBe(true);
    } finally {
      await targetPage.close();
    }
  });
}

test("real Steal settlement keeps its semantic result under reduced motion without revealing the acquired card", async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const hiddenCard = { id: "root-overlay-real-steal-reduced-hidden", kind: "Peach", suit: "♥", rank: "3" };
  const seed = await seedGame(request, 4, { sourceCard: steal, targetCard: hiddenCard });
  const sourceId = seed.players[0].id;
  const targetId = seed.players[1].id;
  await openGame(page, seed, 0, { width: 390, height: 844 });
  await playTargetedStratagemThroughPage(page, "TARGET", steal, "Steal");
  await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.rootAction?.cardKind ?? null, { timeout: 20_000 }).toBe("Steal");
  const dialog = page.getByRole("dialog", { name: "Steal target card selection" });
  await expect(dialog).toBeVisible();
  await observeStealSettlement(page);
  await dialog.getByRole("button", { name: "Hidden hand card 1" }).click();
  const use = dialog.getByRole("button", { name: "Use Steal" });
  await expect(use).toBeEnabled();
  const choosePromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
    catch { return false; }
  });
  await use.click();
  expect((await choosePromise).ok()).toBe(true);
  await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.stealSettlements?.length ?? 0, { timeout: 20_000 }).toBe(1);
  await expect.poll(() => page.evaluate(() => window.__wtkStealSettlementTiming.removedAt), { timeout: 10_000 }).not.toBeNull();
  const timing = await page.evaluate(() => window.__wtkStealSettlementTiming);
  expect(timing.outcome).toBe("STEAL_RESOLVED");
  expect(timing.resultLabel).toBe("RESOLVED");
  expect(timing.overlayLabel).toBe("SOURCE played Steal targeting TARGET. Steal resolved.");
  expect(timing.exitingAt).toBeNull();
  expect(timing.removedAt - timing.shownAt).toBeGreaterThanOrEqual(80);
  expect(timing.removedAt - timing.shownAt).toBeLessThanOrEqual(400);
  const settledView = await roomView(request, seed, 0);
  const observerView = await roomView(request, seed, 2);
  expect(settledView.myHand.some((held) => held.id === hiddenCard.id)).toBe(true);
  expect(JSON.stringify(settledView.presentationSnapshot.stealSettlements)).not.toContain(hiddenCard.id);
  expect(observerView.presentationSnapshot.stealSettlements).toEqual(settledView.presentationSnapshot.stealSettlements);
  expect(JSON.stringify(observerView.timeline)).not.toContain(hiddenCard.id);
  expect(sourceId).not.toBe(targetId);
  await testInfo.attach("steal-reduced-motion-settlement.json", { body: JSON.stringify({ timing, settlement: settledView.presentationSnapshot.stealSettlements[0] }, null, 2), contentType: "application/json" });
});

for (const scenario of [
  { playerCount: 4, viewport: { width: 390, height: 844 } },
  { playerCount: 4, viewport: { width: 480, height: 900 } },
  { playerCount: 4, viewport: { width: 1440, height: 900 } },
]) {
  const { playerCount, viewport } = scenario;
  test(`real ${playerCount}-player Attack→Dodge graph uses card faces at ${viewport.width}×${viewport.height}`, async ({ page, browser, request }, testInfo) => {
    test.setTimeout(60_000);
    const seed = await seedGame(request, playerCount, { targetCard: dodge });
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    await openGame(page, seed, 0, viewport);
    await playAttackThroughPage(page, "TARGET");
    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, { timeout: 20_000 }).not.toBeNull();
    const rootAction = (await roomView(request, seed, 1)).presentationSnapshot.rootAction;
    const attackerOverlay = page.locator('[data-root-action-overlay="true"]');
    const attackerRootCard = page.locator('[data-root-action-card="true"]');
    try {
      await expect(attackerOverlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    } catch (error) {
      await testInfo.attach(`attack-card-fit-failure-${playerCount}p-${viewport.width}px-attacker.json`, {
        body: JSON.stringify(await captureAttackOverlayDiagnostics(page), null, 2),
        contentType: "application/json",
      });
      throw error;
    }
    await expect(attackerRootCard).toHaveAttribute("data-root-action-card-face-kind", "Attack");
    await expect(attackerRootCard.locator(".played-card.attack")).toBeVisible();
    await expectAttackCardFaceGeometry(attackerOverlay, attackerRootCard, viewport, "Attack");

    const targetPage = await browser.newPage({ viewport });
    try {
      await openGame(targetPage, seed, 1, viewport);
      const openOverlay = targetPage.locator('[data-root-action-overlay="true"]');
      await expect(openOverlay).toHaveAttribute("data-root-action-enabled", "true");
      await expect(openOverlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
      await expect(openOverlay).toHaveAttribute("data-root-action-display-mode", "graph");
      await expect(openOverlay).toHaveAttribute("data-root-action-layout-state", "ready");
      expect(await openOverlay.getAttribute("data-root-action-fallback-reason")).toBeNull();
      await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);
      await expect(openOverlay).toHaveAttribute("role", "img");
      await expect(openOverlay).toHaveAttribute("aria-label", "SOURCE played Attack targeting TARGET.");
      const openRootCard = targetPage.locator('[data-root-action-card="true"]');
      await expect(openRootCard).toHaveAttribute("data-root-action-card-face-kind", "Attack");
      await expect(openRootCard.locator(".played-card.attack")).toBeVisible();
      const { fitStep: openFitStep, bounds: openRootBounds } = await expectAttackCardFaceGeometry(openOverlay, openRootCard, viewport, "Attack");
      const attackArtworkBackground = await openRootCard.locator(".played-card").evaluate((element) => getComputedStyle(element).backgroundImage);
      expect(attackArtworkBackground).toContain("/attack-card.jpg");
      await expectAttackConnectorAppearance(openOverlay);
      await testInfo.attach(`attack-card-face-open-${playerCount}p-${viewport.width}.png`, { body: await targetPage.screenshot(), contentType: "image/png" });
      await expect(targetPage.getByRole("img", { name: /SOURCE played Attack targeting TARGET/ })).toHaveCount(1);
      await expect(openOverlay.getByRole("img")).toHaveCount(0);
      await expect(targetPage.locator('[data-root-action-response-card="true"]')).toHaveCount(0);
      await expect.poll(async () => {
        const view = await roomView(request, seed, 1);
        return view.currentAction?.kind === "response" && view.currentAction.deadline > Date.now();
      }, { timeout: 20_000 }).toBe(true);
      const openView = await roomView(request, seed, 1);
      expect(openView.currentAction.kind).toBe("response");
      expect(openView.currentAction.actorId).toBe(targetId);
      expect(openView.currentAction.deadline).toBeGreaterThan(Date.now());
      expect(openView.currentAction.legalActions).toContain("respond");
      expect(openView.currentAction.options).toEqual(expect.arrayContaining([
        expect.objectContaining({ providerId: "card", activation: "implicit", satisfies: "dodge", selection: expect.objectContaining({ eligibleCardIds: [dodge.id] }) }),
      ]));
      expect(openView.presentationSnapshot.attackDodgeResponses ?? []).toEqual([]);
      const before = await targetPage.evaluate(() => window.__wtkRootOverlayPreGraphAnchors);
      expect(before, "capture physical anchors before Dodge submission").toBeTruthy();
      const openDockHighlight = await measure(targetPage, sourceId, targetId);
      expectAttackTargetHighlightCoversAnchor(openDockHighlight, targetId, "active");
      const activeDockScreenshot = await targetPage.screenshot({ path: testInfo.outputPath(`attack-local-dock-active-highlight-${viewport.width}.png`) });
      await testInfo.attach(`attack-local-dock-active-highlight-${viewport.width}`, { body: activeDockScreenshot, contentType: "image/png" });
      await targetPage.emulateMedia({ reducedMotion: "no-preference" });
      await observeAttackDodgeSettlement(targetPage, sourceId, targetId);

      await playDodgeThroughPage(targetPage);
      await expect.poll(() => targetPage.evaluate(() => Boolean(window.__wtkAttackDodgeSettlementVisual)), {
        timeout: 5_000, message: "capture the actual Attack→Dodge settlement graph at its first rendered frame",
      }).toBe(true);
      const visual = await targetPage.evaluate(() => window.__wtkAttackDodgeSettlementVisual);
      const geometry = {
        ...visual.bounds,
        ...visual.geometry,
        pointerEvents: visual.overlay.pointerEvents,
      };
      await testInfo.attach("attack-dodge-block-geometry.json", { body: JSON.stringify({ viewport, before, visual, geometry }, null, 2), contentType: "application/json" });
      const blockedDockScreenshot = await targetPage.screenshot({ path: testInfo.outputPath(`attack-local-dock-blocked-highlight-${viewport.width}.png`) });
      await testInfo.attach("attack-local-dock-blocked-highlight", { body: blockedDockScreenshot, contentType: "image/png" });

      await expect.poll(async () => (await roomView(request, seed, 2)).presentationSnapshot?.attackDodgeResponses?.length ?? 0, { timeout: 20_000 }).toBe(1);
      const observerView = await roomView(request, seed, 2);
      const proof = observerView.presentationSnapshot.attackDodgeResponses[0];
      expect(proof).toMatchObject({
        semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
        rootEventId: rootAction.rootEventId, rootSourceId: sourceId,
        targetId, responseActorId: targetId,
        rootCardKind: "Attack", responseCardKind: "Dodge",
      });
      expect(JSON.stringify(proof)).not.toContain(attack.id);
      expect(JSON.stringify(proof)).not.toContain(dodge.id);
      const targetViewAfterDodge = await roomView(request, seed, 1);
      expect(targetViewAfterDodge.presentationSnapshot.attackDodgeResponses).toEqual([proof]);

      expect(visual.overlay).toMatchObject({
        ready: "true", enabled: "true", mode: "graph", layout: "ready", fallbackReason: null,
        role: "img",
        ariaLabel: "SOURCE played Attack targeting TARGET. TARGET played Dodge to block SOURCE's Attack against TARGET. Attack resolution complete.",
        pointerEvents: "none",
      });
      expect(visual.root.dataset).toMatchObject({
        rootActionCardFaceKind: "Attack", rootActionSettled: "true",
        rootActionSettlementEventId: proof.responseEventId,
        rootActionSettlementOutcome: "ATTACK_BLOCKED_BY_DODGE",
      });
      expect(visual.root.faceVisible).toBe(true);
      expect(visual.root.faceStyle.backgroundImage).toContain("/attack-card.jpg");
      expect(visual.root.directSmallCount).toBe(0);
      expect(visual.root.ariaLabel).toBe("SOURCE played Attack targeting TARGET");
      expect(visual.response.dataset).toMatchObject({
        responseCardFaceKind: "Dodge", responseRelation: "COUNTERS_ROOT",
        responseActorId: targetId, responseEventId: proof.responseEventId,
      });
      expect(visual.response.faceVisible).toBe(true);
      expect(visual.response.faceStyle.backgroundImage).toContain("/dodge-card.jpg");
      expect(visual.response.ariaLabel).toBe("TARGET played Dodge to block SOURCE's Attack against TARGET");
      expect(visual.response.dataset.rootActionDodgeInterception).toMatch(/^(direct|adjacent)$/);
      expect(geometry.stageCount).toBe(0);
      expect(geometry.tablePlayedCardCount).toBe(0);
      expect(geometry.edges.some((edge) => edge.edge === "target")).toBe(false);
      expect(geometry.edges.some((edge) => edge.edge === "negation-counters-root")).toBe(false);
      const attackInterception = geometry.edges.find((edge) => edge.edge === "attack-dodge-interception");
      expect(attackInterception).toMatchObject({
        markerEnd: null, stroke: "rgb(224, 107, 93)", strokeWidth: "7px", strokeDasharray: "none", opacity: "1",
      });
      const interceptionMark = geometry.edges.find((edge) => edge.edge === "interception-mark");
      expect(interceptionMark.dataset.rootActionBlocked).toBe("true");
      expect(interceptionMark).toMatchObject({ stroke: "rgb(237, 201, 117)", strokeWidth: "3px" });
      const dodgeSourceAppearance = geometry.edges.find((edge) => edge.edge === "response-source");
      expect(dodgeSourceAppearance.dataset).toMatchObject({ responseCardFaceKind: "Dodge", responseActorId: targetId });
      expect(dodgeSourceAppearance.d).toMatch(/\bL\b/);
      expect(dodgeSourceAppearance.d).not.toMatch(/\bQ\b/);
      expect(dodgeSourceAppearance).toMatchObject({
        markerEnd: null, stroke: "rgb(134, 185, 162)", strokeWidth: "3.5px",
      });
      expect(geometry.edges.filter((edge) => edge.edge === "interception-mark")).toHaveLength(1);
      expect(geometry.edges.filter((edge) => edge.edge === "attack-dodge-interception")).toHaveLength(1);
      expect(geometry.edges.filter((edge) => edge.edge === "response-source")).toHaveLength(1);
      expect(geometry.edges.filter((edge) => edge.dataset.rootActionBlocked === "true")).toHaveLength(1);
      expect(geometry.edges.filter((edge) => edge.edge === "target")).toHaveLength(0);
      expect(geometry.edges.filter((edge) => edge.edge === "negation-counters-root")).toHaveLength(0);
      expect(geometry.blockedCount).toBe(1);

      await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.targetHighlightReachedNeutral ?? false), {
        timeout: 3_000,
        message: "the viewer target ring reaches its neutral blocked style during the measured settlement",
      }).toBe(true);
      const blockedDockHighlight = await measure(targetPage, sourceId, targetId);
      expectAttackTargetHighlightCoversAnchor(blockedDockHighlight, targetId, "blocked");
      expect(geometry.pointerEvents).toBe("none");
      expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
      const blockedFitStep = visual.overlay.cardFitStep;
      expect(["target", "compact", "minimum"]).toContain(blockedFitStep);
      const blockedFitStepIndex = ["target", "compact", "minimum"].indexOf(blockedFitStep);
      expect(blockedFitStepIndex).toBeGreaterThanOrEqual(["target", "compact", "minimum"].indexOf(openFitStep));
      const expectedDodgeSize = expectedAttackCardFaceSize(viewport, "Dodge", blockedFitStep);
      expect(geometry.root.width).toBeCloseTo(expectedAttackCardFaceSize(viewport, "Attack", blockedFitStep).width, 1);
      expect(geometry.root.height).toBeCloseTo(expectedAttackCardFaceSize(viewport, "Attack", blockedFitStep).height, 1);
      expect(geometry.response.width).toBeCloseTo(expectedDodgeSize.width, 1);
      expect(geometry.response.height).toBeCloseTo(expectedDodgeSize.height, 1);
      expect(geometry.interception.centerFraction, "Dodge centre is positioned along the authoritative Attack-to-target segment").toBeGreaterThanOrEqual(.35);
      expect(geometry.interception.centerFraction).toBeLessThanOrEqual(.70);
      expect(geometry.interception.pathEndpointToMarkCenter).toBeLessThanOrEqual(2.1);
      if (geometry.interception.mode === "direct") {
        expect(geometry.interception.lineIntersectsCard, "the real Dodge card physically covers the incoming Attack path").toBe(true);
        expect(geometry.interception.markCenterToCardEdge).toBeLessThanOrEqual(5);
      } else {
        expect(geometry.interception.lineIntersectsCard).toBe(false);
        expect(geometry.interception.nearestPathToCardEdge).toBeGreaterThanOrEqual(12);
        expect(geometry.interception.nearestPathToCardEdge).toBeLessThanOrEqual(20);
      }
      expect(Math.abs(geometry.root.x - openRootBounds.x), "Attack root x remains stable when Dodge appears").toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.root.y - openRootBounds.y), "Attack root y remains stable when Dodge appears").toBeLessThanOrEqual(1);
      expect(geometry.root.x).toBeGreaterThanOrEqual(geometry.table.x);
      expect(geometry.root.y).toBeGreaterThanOrEqual(geometry.table.y);
      expect(geometry.response.x).toBeGreaterThanOrEqual(geometry.table.x);
      expect(geometry.response.y).toBeGreaterThanOrEqual(geometry.table.y);
      expect(geometry.root.right).toBeLessThanOrEqual(geometry.table.right);
      expect(geometry.root.bottom).toBeLessThanOrEqual(geometry.table.bottom);
      expect(geometry.response.right).toBeLessThanOrEqual(geometry.table.right);
      expect(geometry.response.bottom).toBeLessThanOrEqual(geometry.table.bottom);
      expect(geometry.root.right <= geometry.response.x || geometry.response.right <= geometry.root.x
        || geometry.root.bottom <= geometry.response.y || geometry.response.bottom <= geometry.root.y).toBe(true);
      expect(geometry.projection.response).toBeGreaterThan(geometry.projection.root);
      expect(geometry.projection.response).toBeLessThan(1);
      expect(geometry.obstacles.every((obstacle) => {
        return (geometry.root.right <= obstacle.x || geometry.root.x >= obstacle.right || geometry.root.bottom <= obstacle.y || geometry.root.y >= obstacle.bottom)
          && (geometry.response.right <= obstacle.x || geometry.response.x >= obstacle.right || geometry.response.bottom <= obstacle.y || geometry.response.y >= obstacle.bottom);
      })).toBe(true);
      expect(geometry.edges.every((edge) => edge.markerEnd === null), "intercepted Attack and Dodge authorship tether have no false arrowhead").toBe(true);
      expect(geometry.edges.flatMap((edge) => edge.points).every((point) => point.x >= geometry.shell.x && point.x <= geometry.shell.right
        && point.y >= geometry.shell.y && point.y <= geometry.shell.bottom)).toBe(true);
      expect(geometry.anchors).toHaveLength(playerCount);
      for (const anchor of geometry.anchors.filter((candidate) => candidate.id !== targetId)) {
        const baseline = before[anchor.id];
        expect(baseline, `baseline anchor exists for ${anchor.id}`).toBeTruthy();
        for (const dimension of ["x", "y", "right", "bottom", "width", "height"]) {
          expect(Math.abs(anchor[dimension] - baseline[dimension]), `${anchor.id} ${dimension} remains stable`).toBeLessThanOrEqual(.5);
        }
      }
      const dockBefore = before[targetId];
      expect(dockBefore, "the viewer Dock baseline is present before Dodge").toBeTruthy();
      expect(Math.abs(geometry.target.x - dockBefore.x), "viewer Dock keeps its horizontal anchor").toBeLessThanOrEqual(.5);
      expect(Math.abs(geometry.target.right - dockBefore.right), "viewer Dock keeps its horizontal extent").toBeLessThanOrEqual(.5);
      expect(Math.abs(geometry.target.bottom - dockBefore.bottom), "viewer Dock remains bottom-anchored as its hand changes").toBeLessThanOrEqual(.5);
      await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.exitingAt ?? null), { timeout: 3_000 }).not.toBeNull();
      await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.removedAt ?? null), { timeout: 3_000 }).not.toBeNull();
      const settlementTiming = await targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming);
      expect(settlementTiming.outcome).toBe("ATTACK_BLOCKED_BY_DODGE");
      expect(settlementTiming.exitingAt - settlementTiming.shownAt).toBeGreaterThanOrEqual(350);
      expect(settlementTiming.exitingAt - settlementTiming.shownAt).toBeLessThanOrEqual(750);
      expect(settlementTiming.removedAt - settlementTiming.exitingAt).toBeGreaterThanOrEqual(100);
      expect(settlementTiming.removedAt - settlementTiming.exitingAt).toBeLessThanOrEqual(350);
      expect(settlementTiming.targetHighlightReachedNeutral).toBe(true);
      expect(Math.abs(settlementTiming.lastTargetHighlightWidth - 2)).toBeLessThanOrEqual(0.01);
      await expect(targetPage.locator('.table-resolution-layer .table-played-card')).toHaveCount(0);
    } finally {
      await targetPage.close();
    }
  });
}

for (const scenario of [
  { playerCount: 6, viewport: { width: 390, height: 844 } },
  { playerCount: 6, viewport: { width: 480, height: 900 } },
  { playerCount: 8, viewport: { width: 390, height: 844 } },
  { playerCount: 8, viewport: { width: 480, height: 900 } },
]) {
  const { playerCount, viewport } = scenario;
  test(`dense ${playerCount}-player Attack card placement is measurable or fails closed at ${viewport.width}×${viewport.height}`, async ({ page, browser, request }, testInfo) => {
    test.setTimeout(90_000);
    const seed = await seedGame(request, playerCount, { targetCard: dodge });
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    await openGame(page, seed, 0, viewport);
    await playAttackThroughPage(page, "TARGET");
    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, { timeout: 20_000 }).not.toBeNull();
    const rootAction = (await roomView(request, seed, 1)).presentationSnapshot.rootAction;
    expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", sourceId, targetId });

    const targetPage = await browser.newPage({ viewport });
    try {
      await openGame(targetPage, seed, 1, viewport);
      const actorLayout = await assertAttackGraphOrSafeFallback(page, viewport, `${playerCount}p ${viewport.width}px attacker`);
      const targetLayout = await assertAttackGraphOrSafeFallback(targetPage, viewport, `${playerCount}p ${viewport.width}px defender`);
      await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px.json`, {
        body: JSON.stringify({ actorLayout, targetLayout }, null, 2), contentType: "application/json",
      });
      await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px-attacker.png`, { body: await page.screenshot(), contentType: "image/png" });
      await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px-defender.png`, { body: await targetPage.screenshot(), contentType: "image/png" });

      const defenderOverlay = targetPage.locator('[data-root-action-overlay="true"]');
      await playDodgeThroughPage(targetPage);
      await expect.poll(async () => (await roomView(request, seed, 2)).presentationSnapshot?.attackDodgeResponses?.length ?? 0, { timeout: 20_000 }).toBe(1);
      const responseProof = (await roomView(request, seed, 2)).presentationSnapshot.attackDodgeResponses[0];
      expect(responseProof).toMatchObject({
        semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
        rootEventId: rootAction.rootEventId, rootSourceId: rootAction.sourceId,
        targetId, responseActorId: targetId,
        rootCardKind: "Attack", responseCardKind: "Dodge",
      });
      await expect.poll(() => defenderOverlay.getAttribute("data-root-action-layout-state"), {
        message: `${playerCount}p ${viewport.width}px Dodge response reaches measured layout`,
      }).toMatch(/^(ready|unavailable)$/);
      const responseLayout = await captureAttackOverlayDiagnostics(targetPage);
      await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px-after-dodge.json`, {
        body: JSON.stringify(responseLayout, null, 2),
        contentType: "application/json",
      });
      if (responseLayout.overlay?.layout === "ready" && responseLayout.overlay.mode === "graph") {
        expect(targetLayout.mode, "Dodge cannot promote a previously unsupported root to a shifted graph").toBe("graph");
        await expect(defenderOverlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
        const rootCard = targetPage.locator('[data-root-action-card="true"]');
        const responseCard = targetPage.locator('[data-root-action-response-card="true"]');
        await expect(rootCard).toHaveAttribute("data-root-action-card-face-kind", "Attack");
        await expect(responseCard).toHaveAttribute("data-response-card-face-kind", "Dodge");
        const interception = await captureAttackDodgeInterceptionGeometry(targetPage);
        expect(interception).not.toBeNull();
        expect(interception.mode).toMatch(/^(direct|adjacent)$/);
        expect(interception.fraction).toBeGreaterThanOrEqual(.35);
        expect(interception.fraction).toBeLessThanOrEqual(.70);
        expect(interception.pathEndpointToMark).toBeLessThanOrEqual(2.1);
        expect(interception.markerEnd).toBeNull();
        expect(interception.falseCounterArrows).toBe(0);
        if (interception.mode === "direct") expect(interception.lineIntersectsCard).toBe(true);
        else {
          expect(interception.lineIntersectsCard).toBe(false);
          expect(interception.edgeGap).toBeGreaterThanOrEqual(12);
          expect(interception.edgeGap).toBeLessThanOrEqual(20);
        }
        const root = await rootCard.boundingBox();
        expect(Math.abs(root.x - targetLayout.root.x), "dense Attack root keeps its x when Dodge appears").toBeLessThanOrEqual(1);
        expect(Math.abs(root.y - targetLayout.root.y), "dense Attack root keeps its y when Dodge appears").toBeLessThanOrEqual(1);
      } else {
        expect(responseLayout.overlay?.layout).toBe("unavailable");
        expect(responseLayout.overlay?.mode).toBe("fallback");
        await expect(defenderOverlay).toHaveAttribute("data-root-action-ready", "false");
        expect(await targetPage.locator(".interaction-stage").count(), "safe fallback never duplicates the public stage").toBeLessThanOrEqual(1);
        expect(await targetPage.locator('[data-root-action-card="true"]').evaluate((element) => getComputedStyle(element).visibility)).toBe("hidden");
        await expect(defenderOverlay.locator("[data-root-action-edge]")).toHaveCount(0);
      }
    } finally {
      await targetPage.close();
    }
  });
}

test("real Attack→Dodge settlement shortens without an exit animation under reduced motion", async ({ page, browser, request }) => {
  test.setTimeout(60_000);
  const viewport = { width: 390, height: 844 };
  const seed = await seedGame(request, 4, { targetCard: dodge });
  await openGame(page, seed, 0, viewport);
  await playAttackThroughPage(page, "TARGET");
  await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, { timeout: 20_000 }).not.toBeNull();

  const targetPage = await browser.newPage({ viewport });
  try {
    await openGame(targetPage, seed, 1, viewport);
    const overlay = targetPage.locator('[data-root-action-overlay="true"]');
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    await expect(overlay).toHaveAttribute("data-root-action-display-mode", "graph");
    await expect(overlay).toHaveAttribute("data-root-action-layout-state", "ready");
    expect(await overlay.getAttribute("data-root-action-fallback-reason")).toBeNull();
    await expect.poll(async () => (await roomView(request, seed, 1)).currentAction?.kind ?? null, { timeout: 20_000 }).toBe("response");
    await targetPage.emulateMedia({ reducedMotion: "reduce" });
    await observeAttackDodgeSettlement(targetPage);

    await playDodgeThroughPage(targetPage);
    await expect.poll(async () => (await roomView(request, seed, 2)).presentationSnapshot?.attackDodgeResponses?.length ?? 0, { timeout: 20_000 }).toBe(1);
    const proof = (await roomView(request, seed, 2)).presentationSnapshot.attackDodgeResponses[0];
    await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.outcome ?? null), { timeout: 3_000 }).toBe("ATTACK_BLOCKED_BY_DODGE");
    await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.removedAt ?? null), { timeout: 3_000 }).not.toBeNull();
    const timing = await targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming);
    expect(timing.outcome).toBe("ATTACK_BLOCKED_BY_DODGE");
    expect(timing.exitingAt).toBeNull();
    expect(timing.removedAt - timing.shownAt).toBeGreaterThanOrEqual(70);
    expect(timing.removedAt - timing.shownAt).toBeLessThanOrEqual(350);
    await expect(overlay.locator('[data-root-action-card="true"]')).toHaveCount(0);
    await expect(targetPage.locator('.table-resolution-layer .table-played-card')).toHaveCount(0);
    expect(proof.counterRelation).toBe("BLOCKS_TARGET_EFFECT");
  } finally {
    await targetPage.close();
  }
});

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`real declined direct Attack shows the exact damage settlement without moving seats at ${viewport.width}×${viewport.height}`, async ({ page, browser, request }, testInfo) => {
    test.setTimeout(60_000);
    const seed = await seedGame(request, 4);
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    await openGame(page, seed, 0, viewport);
    await playAttackThroughPage(page, "TARGET");
    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, { timeout: 20_000 }).not.toBeNull();

    const targetPage = await browser.newPage({ viewport });
    try {
      await openGame(targetPage, seed, 1, viewport);
      const overlay = targetPage.locator('[data-root-action-overlay="true"]');
      await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
      await expect.poll(async () => {
        const view = await roomView(request, seed, 1);
        return view.currentAction?.kind === "response" && view.currentAction.actorId === targetId && view.currentAction.deadline > Date.now();
      }, { timeout: 20_000 }).toBe(true);
      const rootView = await roomView(request, seed, 1);
      const rootAction = rootView.presentationSnapshot.rootAction;
      expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "ATTACK", sourceId, targetId, cardKind: "Attack" });
      expect(rootView.presentationSnapshot.attackHitSettlements).toEqual([]);
      const before = await targetPage.evaluate(() => window.__wtkRootOverlayPreGraphAnchors);
      expect(before, "capture fixed seat anchors while the Dodge decision is open").toBeTruthy();
      const beforeDockLayout = await targetPage.evaluate((id) => {
        const dock = document.querySelector(`[data-player-anchor="${id}"].local-player-dock`);
        const rect = (element) => {
          if (!element) return null;
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, display: style.display, gridArea: style.gridArea, gridTemplateRows: style.gridTemplateRows };
        };
        return Object.fromEntries([".console-guidance", ".local-dock-identity", ".local-dock-zones", ".local-hand-section", ".local-operation-console"]
          .map((selector) => [selector, rect(dock?.querySelector(selector) ?? null)]).concat([[".local-player-dock", rect(dock)]]));
      }, targetId);
      await targetPage.emulateMedia({ reducedMotion: "no-preference" });
      await observeAttackHitSettlement(targetPage);

      const skip = targetPage.locator('[data-action-slot="decline"] button');
      await expect(skip).toHaveText("Skip");
      await expect(skip).toBeEnabled();
      const skipResponse = targetPage.waitForResponse((response) => {
        if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
        try { return JSON.parse(response.request().postData() ?? "{}").action === "decline_response"; }
        catch { return false; }
      });
      await skip.click();
      expect((await skipResponse).ok()).toBe(true);
      await expect.poll(async () => (await roomView(request, seed, 2)).presentationSnapshot?.attackHitSettlements?.length ?? 0, { timeout: 20_000 }).toBe(1);
      const publicView = await roomView(request, seed, 2);
      const proof = publicView.presentationSnapshot.attackHitSettlements[0];
      expect(proof).toMatchObject({
        semantics: "PROVEN", outcome: "ATTACK_DAMAGE_APPLIED",
        rootEventId: rootAction.rootEventId, sourceId, targetId,
      });
      expect(JSON.stringify(proof)).not.toContain(attack.id);
      expect((await roomView(request, seed, 1)).players.find((player) => player.id === targetId)?.hp).toBe(3);
      await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
      await expect(overlay).toHaveAttribute("data-root-action-display-mode", "graph");
      await expect(overlay).toHaveAttribute("data-root-action-layout-state", "ready");
      expect(await overlay.getAttribute("data-root-action-fallback-reason")).toBeNull();
      await expect(overlay).toHaveAttribute("aria-label", "SOURCE played Attack targeting TARGET. Attack damage applied.");
      const rootCard = targetPage.locator('[data-root-action-card="true"]');
      await expect(rootCard).toHaveAttribute("data-root-action-settled", "true");
      await expect(targetPage.locator(`[data-player-anchor="${targetId}"].local-player-dock`)).toHaveAttribute("data-guidance-height-preserved", "true");
      await expect(rootCard).toHaveAttribute("data-root-action-settlement-event-id", proof.eventId);
      await expect(rootCard).toHaveAttribute("data-root-action-settlement-outcome", "ATTACK_DAMAGE_APPLIED");
      await expect(rootCard.locator("small")).toHaveText("RESOLVED");
      await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);
      await expect(targetPage.locator(".table-resolution-layer .table-played-card")).toHaveCount(0);

      const geometry = await measure(targetPage, sourceId, targetId);
      const afterDockLayout = await targetPage.evaluate((id) => {
        const dock = document.querySelector(`[data-player-anchor="${id}"].local-player-dock`);
        const rect = (element) => {
          if (!element) return null;
          const bounds = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height, display: style.display, gridArea: style.gridArea, gridTemplateRows: style.gridTemplateRows };
        };
        return Object.fromEntries([".console-guidance", ".local-dock-identity", ".local-dock-zones", ".local-hand-section", ".local-operation-console"]
          .map((selector) => [selector, rect(dock?.querySelector(selector) ?? null)]).concat([[".local-player-dock", rect(dock)]]));
      }, targetId);
      expect(Math.abs(afterDockLayout[".console-guidance"].height - beforeDockLayout[".console-guidance"].height), "Local Dock Guidance keeps its measured row height for the hit-settlement frame").toBeLessThanOrEqual(.5);
      expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
      expect(geometry.overlayReady).toBe(true);
      expect(geometry.card).toBeTruthy();
      expect(geometry.sourceEdge).toMatch(/^M /);
      expect(geometry.targetEdge).toContain("root-target-arrow-");
      expect(geometry.playerAnchors).toHaveLength(4);
      for (const anchor of geometry.playerAnchors) {
        const baseline = before[anchor.id];
        expect(baseline, `baseline anchor exists for ${anchor.id}`).toBeTruthy();
        for (const dimension of ["x", "y", "right", "bottom", "width", "height"]) {
          const playerName = seed.players.find((player) => player.id === anchor.id)?.name ?? "unknown player";
          expect(Math.abs(anchor[dimension] - baseline[dimension]), `${playerName} (${anchor.id}) ${dimension} stays fixed through settlement at ${viewport.width}×${viewport.height}`).toBeLessThanOrEqual(.5);
        }
      }
      expect(geometry.card.x).toBeGreaterThanOrEqual(geometry.table.x);
      expect(geometry.card.y).toBeGreaterThanOrEqual(geometry.table.y);
      expect(geometry.card.right).toBeLessThanOrEqual(geometry.table.right);
      expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.table.bottom);
      expect(geometry.connectorPoints.flatMap((connector) => connector.points).every((point) => point.x >= geometry.shell.x && point.x <= geometry.shell.right
        && point.y >= geometry.shell.y && point.y <= geometry.shell.bottom)).toBe(true);
      const settlementScreenshot = await targetPage.screenshot();
      await testInfo.attach("attack-hit-settlement.png", { body: settlementScreenshot, contentType: "image/png" });
      await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackHitSettlementTiming?.removedAt ?? null), { timeout: 3_000 }).not.toBeNull();
      const timing = await targetPage.evaluate(() => window.__wtkAttackHitSettlementTiming);
      expect(timing.outcome).toBe("ATTACK_DAMAGE_APPLIED");
      expect(timing.exitingAt - timing.shownAt).toBeGreaterThanOrEqual(350);
      expect(timing.exitingAt - timing.shownAt).toBeLessThanOrEqual(750);
      expect(timing.removedAt - timing.exitingAt).toBeGreaterThanOrEqual(100);
      expect(timing.removedAt - timing.exitingAt).toBeLessThanOrEqual(350);
      await testInfo.attach("attack-hit-settlement.json", { body: JSON.stringify({ viewport, proof, geometry, timing }, null, 2), contentType: "application/json" });
    } finally {
      await targetPage.close();
    }
  });
}

test("real direct Attack hit settlement shortens under reduced motion", async ({ page, browser, request }) => {
  test.setTimeout(60_000);
  const viewport = { width: 390, height: 844 };
  const seed = await seedGame(request, 4);
  await openGame(page, seed, 0, viewport);
  await playAttackThroughPage(page, "TARGET");
  await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, { timeout: 20_000 }).not.toBeNull();

  const targetPage = await browser.newPage({ viewport });
  try {
    await targetPage.emulateMedia({ reducedMotion: "reduce" });
    await openGame(targetPage, seed, 1, viewport);
    const overlay = targetPage.locator('[data-root-action-overlay="true"]');
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
    await observeAttackHitSettlement(targetPage);
    const skip = targetPage.locator('[data-action-slot="decline"] button');
    await expect(skip).toHaveText("Skip");
    await expect(skip).toBeEnabled();
    const skipResponse = targetPage.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "decline_response"; }
      catch { return false; }
    });
    await skip.click();
    expect((await skipResponse).ok()).toBe(true);
    await expect.poll(async () => (await roomView(request, seed, 2)).presentationSnapshot?.attackHitSettlements?.length ?? 0, { timeout: 20_000 }).toBe(1);
    await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackHitSettlementTiming?.removedAt ?? null), { timeout: 3_000 }).not.toBeNull();
    const timing = await targetPage.evaluate(() => window.__wtkAttackHitSettlementTiming);
    expect(timing.outcome).toBe("ATTACK_DAMAGE_APPLIED");
    expect(timing.exitingAt).toBeNull();
    expect(timing.removedAt - timing.shownAt).toBeGreaterThanOrEqual(70);
    expect(timing.removedAt - timing.shownAt).toBeLessThanOrEqual(350);
    await expect(overlay.locator('[data-root-action-card="true"]')).toHaveCount(0);
  } finally {
    await targetPage.close();
  }
});

test("real Attack response timeout automatically declines, publishes its exact hit, and clears the graph", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(90_000);
  const viewport = { width: 390, height: 844 };
  const seed = await seedGame(request, 4);
  const sourceId = seed.players[0].id;
  const targetId = seed.players[1].id;
  await openGame(page, seed, 0, viewport);
  const targetPage = await browser.newPage({ viewport });
  try {
    const automaticDeclineResponse = targetPage.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "decline_response"; }
      catch { return false; }
    }, { timeout: 75_000 });
    await openGame(targetPage, seed, 1, viewport);
    await playAttackThroughPage(page, "TARGET");
    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, {
      timeout: 20_000, message: "server creates the real public Attack root before the timeout starts",
    }).not.toBeNull();

    const openView = await roomView(request, seed, 1);
    const rootAction = openView.presentationSnapshot.rootAction;
    expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", sourceId, targetId });
    await Promise.all([expectAttackGraphIdentity(page, rootAction), expectAttackGraphIdentity(targetPage, rootAction)]);
    await expect.poll(async () => {
      const view = await roomView(request, seed, 1);
      return view.currentAction?.kind === "response" && view.currentAction.actorId === targetId
        && view.currentAction.deadline > Date.now() ? view.currentAction.deadline : 0;
    }, { timeout: 20_000, message: "the server arms the existing human response deadline only after the public decision is ready" }).toBeGreaterThan(0);
    const armedView = await roomView(request, seed, 1);
    const deadline = armedView.currentAction.deadline;
    expect(deadline - Date.now(), "the response uses its current server-owned 30-second timeout").toBeLessThanOrEqual(30_000);
    expect(deadline).toBeGreaterThan(Date.now());
    await expect(targetPage.locator('[data-action-slot="decline"] button')).toHaveText("Skip");
    await observeAttackHitSettlement(targetPage);

    const automaticDecline = await automaticDeclineResponse;
    expect(automaticDecline.status(), await automaticDecline.text()).toBe(200);
    expect(JSON.parse(automaticDecline.request().postData() ?? "{}")).toMatchObject({ action: "decline_response", code: seed.code, token: seed.players[1].token });
    await expect.poll(async () => (await roomView(request, seed, 2)).presentationSnapshot?.attackHitSettlements?.length ?? 0, {
      timeout: 20_000, message: "the server records the automatic timeout as one authoritative Attack-hit settlement",
    }).toBe(1);
    const settledView = await roomView(request, seed, 2);
    const proof = settledView.presentationSnapshot.attackHitSettlements[0];
    expect(proof).toMatchObject({
      semantics: "PROVEN", outcome: "ATTACK_DAMAGE_APPLIED",
      rootEventId: rootAction.rootEventId, sourceId, targetId,
    });
    expect(JSON.stringify(proof)).not.toContain(attack.id);
    expect(settledView.players.find((player) => player.id === targetId)?.hp).toBe(3);

    const overlay = targetPage.locator('[data-root-action-overlay="true"]');
    await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackHitSettlementTiming?.outcome ?? null), {
      timeout: 10_000, message: "the target graph shows the exact timeout settlement before removal",
    }).toBe("ATTACK_DAMAGE_APPLIED");
    const settledCard = overlay.locator('[data-root-action-settled="true"]');
    await expect(settledCard).toHaveAttribute("data-root-action-settlement-event-id", proof.eventId);
    await expect(settledCard).toHaveAttribute("data-root-action-settlement-outcome", "ATTACK_DAMAGE_APPLIED");
    await expect(overlay).toHaveAttribute("data-root-action-event-id", rootAction.rootEventId);
    await expect(overlay).toHaveAttribute("aria-label", "SOURCE played Attack targeting TARGET. Attack damage applied.");
    await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);
    await testInfo.attach("attack-timeout-settlement-390x844.png", { body: await targetPage.screenshot(), contentType: "image/png" });
    await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackHitSettlementTiming?.removedAt ?? null), {
      timeout: 5_000, message: "the public root graph does not remain stuck after timeout settlement",
    }).not.toBeNull();
    await expect(overlay.locator('[data-root-action-card="true"]')).toHaveCount(0);
    await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);
    await expect(targetPage.locator(".table-resolution-layer .table-played-card")).toHaveCount(0);
    await testInfo.attach("attack-timeout-settlement.json", {
      body: JSON.stringify({ viewport, rootAction, deadline, timeoutSubmission: JSON.parse(automaticDecline.request().postData() ?? "{}"), proof, hp: settledView.players.find((player) => player.id === targetId)?.hp, timing: await targetPage.evaluate(() => window.__wtkAttackHitSettlementTiming) }, null, 2),
      contentType: "application/json",
    });
  } finally {
    await targetPage.close();
  }
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`real Dismantle target decision carries one public physical-seat root graph at ${viewport.width}×${viewport.height}`, async ({ page, request }, testInfo) => {
    test.setTimeout(60_000);
    const hiddenCard = { id: `root-overlay-real-dismantle-hidden-${viewport.width}`, kind: "Peach", suit: "♥", rank: "3" };
    const seed = await seedGame(request, 4, { sourceCard: dismantle, targetCard: hiddenCard });
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    await openGame(page, seed, 0, viewport);
    await playTargetedStratagemThroughPage(page, "TARGET", dismantle, "Dismantle");

    await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.rootAction?.cardKind ?? null, { timeout: 20_000 }).toBe("Dismantle");
    const actorView = await roomView(request, seed, 0);
    const rootAction = actorView.presentationSnapshot.rootAction;
    expect(actorView.currentAction).toMatchObject({ kind: "target_card", actorId: sourceId });
    expect(actorView.currentAction.legalActions).toContain("choose_target_card");
    expect(actorView.currentAction.targetCardSelection).toMatchObject({ targetId, eligibleKeys: ["hand:0"] });
    expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "STRATAGEM", sourceId, targetId, cardKind: "Dismantle" });
    const rootEvent = actorView.timeline.find((event) => event.id === rootAction.rootEventId);
    expect(rootEvent).toMatchObject({ type: "card", action: "play", card: { kind: "Dismantle", id: dismantle.id } });
    expect(JSON.stringify(rootAction)).not.toContain(dismantle.id);
    expect(JSON.stringify(actorView.presentationSnapshot)).not.toContain(hiddenCard.id);

    const observerView = await roomView(request, seed, 2);
    expect(observerView.presentationSnapshot.rootAction).toEqual(rootAction);
    expect(observerView.currentAction.targetCardSelection).toBeUndefined();
    expect(JSON.stringify(observerView.presentationSnapshot)).not.toContain(hiddenCard.id);

    const dialog = page.getByRole("dialog", { name: "Burning Bridge target card selection" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("header strong")).toHaveText("BURNING BRIDGE");
    await expect(dialog.locator("header span")).toHaveText("Choose 1 card to discard");
    const overlay = page.locator('[data-root-action-overlay="true"]');
    await expect(overlay).toHaveAttribute("data-root-action-enabled", "true");
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true");
    await expect(overlay).toHaveAttribute("aria-label", "SOURCE played Burning Bridge targeting TARGET.");
    const rootCard = page.locator('[data-root-action-card="true"]');
    await expect(rootCard.locator("strong")).toHaveText("BURNING BRIDGE");
    await expect(page.locator('[data-root-action-edge="source"]')).toHaveCount(1);
    await expect(page.locator('[data-root-action-edge="target"]')).toHaveCount(1);

    const geometry = await measure(page, sourceId, targetId);
    const [stageBox, dockBox, dialogBox] = await Promise.all([
      page.locator(".play-table").boundingBox(), page.locator(".local-player-dock").boundingBox(), dialog.boundingBox(),
    ]);
    expect(stageBox && dockBox && dialogBox).toBeTruthy();
    expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(dockBox.y + 1);
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width);
    expect(dialogBox.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height);
    expect(geometry.overlayPosition).toBe("absolute");
    expect(geometry.overlayPointerEvents).toBe("none");
    expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry.card.x).toBeGreaterThanOrEqual(geometry.table.x);
    expect(geometry.card.y).toBeGreaterThanOrEqual(geometry.table.y);
    expect(geometry.card.right).toBeLessThanOrEqual(geometry.table.right);
    expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.table.bottom);
    expect(geometry.sourceEdge).toMatch(/^M /);
    expect(geometry.targetEdge).toContain("root-target-arrow-");
    expect(geometry.connectorPoints.flatMap((edge) => edge.points).every((point) => point.x >= geometry.shell.x
      && point.x <= geometry.shell.right && point.y >= geometry.shell.y && point.y <= geometry.shell.bottom)).toBe(true);
    await testInfo.attach(`dismantle-root-${viewport.width}x${viewport.height}.json`, {
      body: JSON.stringify({ viewport, geometry, dialog: dialogBox }, null, 2), contentType: "application/json",
    });
    await testInfo.attach(`dismantle-root-${viewport.width}x${viewport.height}.png`, { body: await page.screenshot(), contentType: "image/png" });

    await observeDismantleSettlement(page);
    const hiddenPosition = dialog.getByRole("button", { name: "Hidden hand card 1" });
    await hiddenPosition.click();
    await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
    const use = dialog.getByRole("button", { name: "Use Burning Bridge" });
    await expect(use).toBeEnabled();
    const choosePromise = page.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
      catch { return false; }
    });
    await use.click();
    const chooseResponse = await choosePromise;
    expect(chooseResponse.ok()).toBe(true);
    await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.rootAction ?? null, { timeout: 20_000 }).toBeNull();
    const settledView = await roomView(request, seed, 0);
    expect(settledView.discardTop.id).toBe(hiddenCard.id);
    expect(settledView.presentationSnapshot.dismantleSettlements).toHaveLength(1);
    const settlement = settledView.presentationSnapshot.dismantleSettlements[0];
    expect(settlement).toMatchObject({
      semantics: "PROVEN", rootEventId: rootAction.rootEventId,
      rootResolutionId: rootEvent.resolutionId, sourceId, targetId, outcome: "DISMANTLE_RESOLVED",
    });
    expect(JSON.stringify(settlement)).not.toContain(hiddenCard.id);
    const settlementEvent = settledView.timeline.find((event) => event.id === settlement.eventId);
    expect(settlementEvent).toMatchObject({
      type: "card", action: "discard", importance: "essential", finalResult: true,
      resolutionId: settlement.rootResolutionId,
      publicDismantleSettlement: {
        semantics: "PROVEN", rootEventId: settlement.rootEventId,
        rootResolutionId: settlement.rootResolutionId, sourceId, targetId, outcome: "DISMANTLE_RESOLVED",
      },
    });
    const observerSettledView = await roomView(request, seed, 2);
    expect(observerSettledView.presentationSnapshot.dismantleSettlements).toEqual(settledView.presentationSnapshot.dismantleSettlements);
    expect(JSON.stringify(observerSettledView.presentationSnapshot.dismantleSettlements)).not.toContain(hiddenCard.id);

    const settledNode = page.locator('[data-root-action-card="true"][data-root-action-settled="true"]');
    await expect(settledNode).toBeVisible({ timeout: 10_000 });
    await expect(settledNode).toHaveAttribute("data-root-action-settlement-outcome", "DISMANTLE_RESOLVED");
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("aria-label", "SOURCE played Burning Bridge targeting TARGET. Dismantle resolved.");
    const settledGeometry = await measure(page, sourceId, targetId);
    const [settledStageBox, settledDockBox] = await Promise.all([
      page.locator(".play-table").boundingBox(), page.locator(".local-player-dock").boundingBox(),
    ]);
    expect(settledStageBox && settledDockBox).toBeTruthy();
    for (const [before, after] of [[stageBox, settledStageBox], [dockBox, settledDockBox]]) {
      expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
    }
    expect(Math.abs(settledGeometry.card.x - geometry.card.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(settledGeometry.card.y - geometry.card.y)).toBeLessThanOrEqual(1);
    for (const anchorName of ["source", "target"]) {
      expect(Math.abs(settledGeometry[anchorName].x - geometry[anchorName].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(settledGeometry[anchorName].y - geometry[anchorName].y)).toBeLessThanOrEqual(1);
      expect(Math.abs(settledGeometry[anchorName].width - geometry[anchorName].width)).toBeLessThanOrEqual(1);
      expect(Math.abs(settledGeometry[anchorName].height - geometry[anchorName].height)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('[data-root-action-edge="source"]')).toHaveCount(1);
    await expect(page.locator('[data-root-action-edge="target"]')).toHaveCount(1);
    await expect(page.locator(".active-table-reveal .game-card")).toHaveCount(0);
    expect(settledGeometry.documentWidth).toBeLessThanOrEqual(viewport.width);
    await expect.poll(() => page.evaluate(() => window.__wtkDismantleSettlementTiming.removedAt), { timeout: 5_000 }).not.toBeNull();
    const settlementTiming = await page.evaluate(() => window.__wtkDismantleSettlementTiming);
    expect(settlementTiming.outcome).toBe("DISMANTLE_RESOLVED");
    expect(settlementTiming.shownAt).not.toBeNull();
    expect(settlementTiming.exitingAt).not.toBeNull();
    expect(settlementTiming.removedAt).not.toBeNull();
    expect(settlementTiming.exitingAt - settlementTiming.shownAt).toBeGreaterThanOrEqual(400);
    expect(settlementTiming.exitingAt - settlementTiming.shownAt).toBeLessThanOrEqual(800);
    expect(settlementTiming.removedAt - settlementTiming.shownAt).toBeGreaterThanOrEqual(550);
    await testInfo.attach(`dismantle-settlement-${viewport.width}x${viewport.height}.json`, {
      body: JSON.stringify({ viewport, settlement, settlementTiming, geometry: settledGeometry }, null, 2), contentType: "application/json",
    });
  });
}

test("real Dismantle settlement preserves its semantic result with reduced motion", async ({ page, request }, testInfo) => {
  test.setTimeout(60_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  const hiddenCard = { id: "root-overlay-real-dismantle-reduced-hidden", kind: "Peach", suit: "♥", rank: "3" };
  const seed = await seedGame(request, 4, { sourceCard: dismantle, targetCard: hiddenCard });
  const sourceId = seed.players[0].id;
  const targetId = seed.players[1].id;
  await openGame(page, seed, 0, { width: 390, height: 844 });
  await playTargetedStratagemThroughPage(page, "TARGET", dismantle, "Dismantle");
  await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.rootAction?.cardKind ?? null, { timeout: 20_000 }).toBe("Dismantle");
  const dialog = page.getByRole("dialog", { name: "Burning Bridge target card selection" });
  await expect(dialog).toBeVisible();
  await observeDismantleSettlement(page);
  await dialog.getByRole("button", { name: "Hidden hand card 1" }).click();
  const use = dialog.getByRole("button", { name: "Use Burning Bridge" });
  await expect(use).toBeEnabled();
  const choosePromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
    catch { return false; }
  });
  await use.click();
  expect((await choosePromise).ok()).toBe(true);
  await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.dismantleSettlements?.length ?? 0, { timeout: 20_000 }).toBe(1);
  try {
    await expect.poll(() => page.evaluate(() => window.__wtkDismantleSettlementTiming.shownAt !== null), { timeout: 10_000 }).toBe(true);
  } catch (error) {
    const diagnostic = await page.evaluate(() => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const card = overlay?.querySelector('[data-root-action-card="true"]');
      return {
        timing: window.__wtkDismantleSettlementTiming,
        overlay: overlay ? {
          enabled: overlay.dataset.rootActionEnabled,
          ready: overlay.dataset.rootActionReady,
          mode: overlay.dataset.rootActionDisplayMode,
          layout: overlay.dataset.rootActionLayoutState,
          fallback: overlay.dataset.rootActionFallbackReason,
          sourceId: overlay.dataset.rootActionSourceId,
          targetId: overlay.dataset.rootActionTargetId,
          ariaHidden: overlay.getAttribute("aria-hidden"),
        } : null,
        card: card ? { ariaHidden: card.getAttribute("aria-hidden"), bounds: card.getBoundingClientRect().toJSON() } : null,
      };
    });
    await testInfo.attach("dismantle-reduced-motion-visibility.json", { body: JSON.stringify(diagnostic, null, 2), contentType: "application/json" });
    throw new Error(`${error.message}\nDismantle reduced-motion diagnostic: ${JSON.stringify(diagnostic)}`);
  }
  await expect.poll(() => page.evaluate(() => window.__wtkDismantleSettlementTiming.removedAt), { timeout: 5_000 }).not.toBeNull();
  const timing = await page.evaluate(() => window.__wtkDismantleSettlementTiming);
  expect(timing.outcome).toBe("DISMANTLE_RESOLVED");
  expect(timing.resultLabel).toBe("RESOLVED");
  expect(timing.overlayLabel).toBe("SOURCE played Burning Bridge targeting TARGET. Dismantle resolved.");
  expect(timing.exitingAt).toBeNull();
  expect(timing.removedAt - timing.shownAt).toBeGreaterThanOrEqual(80);
  expect(timing.removedAt - timing.shownAt).toBeLessThanOrEqual(400);
  const settledView = await roomView(request, seed, 0);
  expect(JSON.stringify(settledView.presentationSnapshot.dismantleSettlements)).not.toContain(hiddenCard.id);
  expect((await roomView(request, seed, 2)).presentationSnapshot.dismantleSettlements).toEqual(settledView.presentationSnapshot.dismantleSettlements);
  expect(sourceId).not.toBe(targetId);
});

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`real Steal target decision carries one public physical-seat root graph at ${viewport.width}×${viewport.height}`, async ({ page, request }, testInfo) => {
    test.setTimeout(60_000);
    const hiddenCard = { id: `root-overlay-real-steal-hidden-${viewport.width}`, kind: "Peach", suit: "♥", rank: "3" };
    const seed = await seedGame(request, 4, { sourceCard: steal, targetCard: hiddenCard });
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    await openGame(page, seed, 0, viewport);
    await playTargetedStratagemThroughPage(page, "TARGET", steal, "Steal");

    await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.rootAction?.cardKind ?? null, { timeout: 20_000 }).toBe("Steal");
    const actorView = await roomView(request, seed, 0);
    const rootAction = actorView.presentationSnapshot.rootAction;
    expect(actorView.currentAction).toMatchObject({ kind: "target_card", actorId: sourceId });
    expect(actorView.currentAction.legalActions).toContain("choose_target_card");
    expect(actorView.currentAction.targetCardSelection).toMatchObject({ targetId, eligibleKeys: ["hand:0"] });
    expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "STRATAGEM", sourceId, targetId, cardKind: "Steal" });
    const rootEvent = actorView.timeline.find((event) => event.id === rootAction.rootEventId);
    expect(rootEvent).toMatchObject({ type: "card", action: "play", card: { kind: "Steal", id: steal.id } });
    expect(JSON.stringify(rootAction)).not.toContain(steal.id);
    expect(JSON.stringify(actorView.presentationSnapshot)).not.toContain(hiddenCard.id);

    const observerView = await roomView(request, seed, 2);
    expect(observerView.presentationSnapshot.rootAction).toEqual(rootAction);
    expect(observerView.currentAction.targetCardSelection).toBeUndefined();
    expect(JSON.stringify(observerView.presentationSnapshot)).not.toContain(hiddenCard.id);

    const dialog = page.getByRole("dialog", { name: "Steal target card selection" });
    await expect(dialog).toBeVisible();
    await expect(dialog.locator("header strong")).toHaveText("STEAL");
    await expect(dialog.locator("header span")).toHaveText("Choose 1 card to obtain");
    const overlay = page.locator('[data-root-action-overlay="true"]');
    await expect(overlay).toHaveAttribute("data-root-action-enabled", "true");
    await expect(overlay).toHaveAttribute("data-root-action-ready", "true");
    await expect(overlay).toHaveAttribute("aria-label", "SOURCE played Steal targeting TARGET.");
    const rootCard = page.locator('[data-root-action-card="true"]');
    await expect(rootCard.locator("strong")).toHaveText("STEAL");
    await expect(page.locator('[data-root-action-edge="source"]')).toHaveCount(1);
    await expect(page.locator('[data-root-action-edge="target"]')).toHaveCount(1);

    const geometry = await measure(page, sourceId, targetId);
    const [stageBox, dockBox, dialogBox] = await Promise.all([
      page.locator(".play-table").boundingBox(), page.locator(".local-player-dock").boundingBox(), dialog.boundingBox(),
    ]);
    expect(stageBox && dockBox && dialogBox).toBeTruthy();
    expect(stageBox.y + stageBox.height).toBeLessThanOrEqual(dockBox.y + 1);
    expect(dialogBox.x).toBeGreaterThanOrEqual(0);
    expect(dialogBox.x + dialogBox.width).toBeLessThanOrEqual(viewport.width);
    expect(dialogBox.y).toBeGreaterThanOrEqual(0);
    expect(dialogBox.y + dialogBox.height).toBeLessThanOrEqual(viewport.height);
    expect(geometry.overlayPosition).toBe("absolute");
    expect(geometry.overlayPointerEvents).toBe("none");
    expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
    expect(geometry.card.x).toBeGreaterThanOrEqual(geometry.table.x);
    expect(geometry.card.y).toBeGreaterThanOrEqual(geometry.table.y);
    expect(geometry.card.right).toBeLessThanOrEqual(geometry.table.right);
    expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.table.bottom);
    expect(geometry.sourceEdge).toMatch(/^M /);
    expect(geometry.targetEdge).toContain("root-target-arrow-");
    expect(geometry.connectorPoints.flatMap((edge) => edge.points).every((point) => point.x >= geometry.shell.x
      && point.x <= geometry.shell.right && point.y >= geometry.shell.y && point.y <= geometry.shell.bottom)).toBe(true);
    await testInfo.attach(`steal-root-${viewport.width}x${viewport.height}.json`, {
      body: JSON.stringify({ viewport, geometry, dialog: dialogBox }, null, 2), contentType: "application/json",
    });
    await testInfo.attach(`steal-root-${viewport.width}x${viewport.height}.png`, { body: await page.screenshot(), contentType: "image/png" });

    await observeStealSettlement(page);
    const hiddenPosition = dialog.getByRole("button", { name: "Hidden hand card 1" });
    await hiddenPosition.click();
    await expect(hiddenPosition).toHaveAttribute("aria-pressed", "true");
    const use = dialog.getByRole("button", { name: "Use Steal" });
    await expect(use).toBeEnabled();
    const choosePromise = page.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "choose_target_card"; }
      catch { return false; }
    });
    await use.click();
    const chooseResponse = await choosePromise;
    expect(chooseResponse.ok()).toBe(true);
    await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.rootAction ?? null, { timeout: 20_000 }).toBeNull();
    await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.stealSettlements?.length ?? 0, { timeout: 20_000 }).toBe(1);
    const settledView = await roomView(request, seed, 0);
    expect(settledView.myHand.some((held) => held.id === hiddenCard.id)).toBe(true);
    const settlement = settledView.presentationSnapshot.stealSettlements[0];
    expect(settlement).toMatchObject({
      semantics: "PROVEN", rootEventId: rootAction.rootEventId,
      rootResolutionId: rootEvent.resolutionId, sourceId, targetId, outcome: "STEAL_RESOLVED",
    });
    expect(JSON.stringify(settlement)).not.toContain(hiddenCard.id);
    const settlementEvent = settledView.timeline.find((event) => event.id === settlement.eventId);
    expect(settlementEvent).toMatchObject({
      type: "message", importance: "essential", finalResult: true,
      resolutionId: settlement.rootResolutionId,
      publicStealSettlement: {
        semantics: "PROVEN", rootEventId: settlement.rootEventId,
        rootResolutionId: settlement.rootResolutionId, sourceId, targetId, outcome: "STEAL_RESOLVED",
      },
    });
    expect(settlementEvent.message).not.toContain(hiddenCard.id);
    const observerSettledView = await roomView(request, seed, 2);
    expect(observerSettledView.presentationSnapshot.stealSettlements).toEqual(settledView.presentationSnapshot.stealSettlements);
    expect(JSON.stringify(observerSettledView.timeline)).not.toContain(hiddenCard.id);

    const settledNode = page.locator('[data-root-action-card="true"][data-root-action-settled="true"]');
    await expect(settledNode).toBeVisible({ timeout: 10_000 });
    await expect(settledNode).toHaveAttribute("data-root-action-settlement-outcome", "STEAL_RESOLVED");
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("aria-label", "SOURCE played Steal targeting TARGET. Steal resolved.");
    const settledGeometry = await measure(page, sourceId, targetId);
    const [settledStageBox, settledDockBox] = await Promise.all([
      page.locator(".play-table").boundingBox(), page.locator(".local-player-dock").boundingBox(),
    ]);
    expect(settledStageBox && settledDockBox).toBeTruthy();
    for (const [before, after] of [[stageBox, settledStageBox], [dockBox, settledDockBox]]) {
      expect(Math.abs(after.x - before.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.y - before.y)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.width - before.width)).toBeLessThanOrEqual(1);
      expect(Math.abs(after.height - before.height)).toBeLessThanOrEqual(1);
    }
    expect(Math.abs(settledGeometry.card.x - geometry.card.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(settledGeometry.card.y - geometry.card.y)).toBeLessThanOrEqual(1);
    for (const anchorName of ["source", "target"]) {
      expect(Math.abs(settledGeometry[anchorName].x - geometry[anchorName].x)).toBeLessThanOrEqual(1);
      expect(Math.abs(settledGeometry[anchorName].y - geometry[anchorName].y)).toBeLessThanOrEqual(1);
      expect(Math.abs(settledGeometry[anchorName].width - geometry[anchorName].width)).toBeLessThanOrEqual(1);
      expect(Math.abs(settledGeometry[anchorName].height - geometry[anchorName].height)).toBeLessThanOrEqual(1);
    }
    await expect(page.locator('[data-root-action-edge="source"]')).toHaveCount(1);
    await expect(page.locator('[data-root-action-edge="target"]')).toHaveCount(1);
    await expect(page.locator(".active-table-reveal .game-card")).toHaveCount(0);
    expect(settledGeometry.documentWidth).toBeLessThanOrEqual(viewport.width);
    await expect.poll(() => page.evaluate(() => window.__wtkStealSettlementTiming.removedAt), { timeout: 5_000 }).not.toBeNull();
    const timing = await page.evaluate(() => window.__wtkStealSettlementTiming);
    expect(timing.outcome).toBe("STEAL_RESOLVED");
    expect(timing.resultLabel).toBe("RESOLVED");
    expect(timing.shownAt).not.toBeNull();
    expect(timing.exitingAt).not.toBeNull();
    expect(timing.removedAt).not.toBeNull();
    expect(timing.exitingAt - timing.shownAt).toBeGreaterThanOrEqual(400);
    expect(timing.exitingAt - timing.shownAt).toBeLessThanOrEqual(800);
    expect(timing.removedAt - timing.shownAt).toBeGreaterThanOrEqual(550);
    await testInfo.attach(`steal-settlement-${viewport.width}x${viewport.height}.json`, {
      body: JSON.stringify({ viewport, settlement, timing, geometry: settledGeometry }, null, 2), contentType: "application/json",
    });
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`real wounded-player Peach uses a self-target root card at ${viewport.width}×${viewport.height}`, async ({ page, request }, testInfo) => {
    test.setTimeout(60_000);
    const seed = await seedGame(request, 4, { sourceCard: peach, sourceHp: 3 });
    const sourceId = seed.players[0].id;
    await openGame(page, seed, 0, viewport);
    const before = await page.evaluate((playerId) => {
      const rect = document.querySelector(`.local-player-dock[data-player-anchor="${playerId}"]`).getBoundingClientRect();
      return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
    }, sourceId);
    await playPeachThroughPage(page);

    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.selfTargetActions?.length ?? 0, { timeout: 20_000 }).toBe(1);
    const observerView = await roomView(request, seed, 1);
    const proof = observerView.presentationSnapshot.selfTargetActions[0];
    expect(proof).toMatchObject({ semantics: "PROVEN", sourceId, targetId: sourceId, cardKind: "Peach" });
    expect(observerView.timeline.some((event) => event.id === proof.rootEventId && event.card?.kind === "Peach" && event.action === "play")).toBe(true);

    const rootCard = page.locator('[data-root-action-card="true"]');
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-mode", "self-target");
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true");
    await expect(rootCard).toBeVisible({ timeout: 20_000 });
    await expect(rootCard).toHaveAttribute("aria-label", "SOURCE used Peach on self");
    await expect(page.locator('[data-root-action-self-target-halo="true"]')).toHaveCount(1);
    await expect(page.locator('[data-root-action-edge="source"]')).toHaveCount(1);
    await expect(page.locator('[data-root-action-edge="target"]')).toHaveCount(0);
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("aria-hidden", "false");

    const geometry = await page.evaluate((playerId) => {
      const bounds = (element) => {
        if (!element) return null;
        const rect = element.getBoundingClientRect();
        return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
      };
      const card = document.querySelector('[data-root-action-card="true"]');
      const anchor = document.querySelector(`.local-player-dock[data-player-anchor="${playerId}"]`);
      const hero = anchor?.querySelector(".local-hero-card");
      const table = document.querySelector(".play-table");
      const shell = document.querySelector(".game-shell");
      const shellBounds = shell.getBoundingClientRect();
      const connector = document.querySelector(".interaction-root-connectors");
      const connectorBounds = connector?.getBoundingClientRect();
      return {
        card: bounds(card), anchor: bounds(anchor), hero: bounds(hero), table: bounds(table),
        shell: bounds(shell), center: bounds(document.querySelector(".play-center")), system: bounds(document.querySelector(".stage-system-cluster")),
        messages: bounds(document.querySelector(".game-messages")), exit: bounds(document.querySelector(".game-exit")),
        anchors: [...document.querySelectorAll("[data-player-anchor]")].map((element) => ({ id: element.dataset.playerAnchor, ...bounds(element) })),
        halo: bounds(document.querySelector('[data-root-action-self-target-halo="true"]')),
        pointerEvents: getComputedStyle(document.querySelector('[data-root-action-overlay="true"]')).pointerEvents,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: innerWidth,
        sourceCardDuplicates: document.querySelectorAll(".active-table-reveal .game-card, .table-resolution-layer .table-played-card .game-card").length,
        sourceTetherPoints: [...document.querySelectorAll('[data-root-action-edge="source"]')].flatMap((path) => {
          const length = path.getTotalLength();
          const points = [];
          for (let distance = 5; distance < length - 5; distance += 4) {
            const point = path.getPointAtLength(distance);
            points.push({ x: point.x + (connectorBounds?.x ?? 0), y: point.y + (connectorBounds?.y ?? 0) });
          }
          return points;
        }),
        shellBounds: { x: shellBounds.x, y: shellBounds.y, right: shellBounds.right, bottom: shellBounds.bottom },
        settledCardCount: document.querySelectorAll(".table-resolution-layer .table-played-card").length,
      };
    }, sourceId);
    await testInfo.attach("self-target-root-overlay-geometry.json", { body: JSON.stringify({ viewport, before, ...geometry }, null, 2), contentType: "application/json" });
    expect(geometry.pointerEvents).toBe("none");
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    expect(geometry.card.x).toBeGreaterThanOrEqual(geometry.table.x);
    expect(geometry.card.y).toBeGreaterThanOrEqual(geometry.table.y);
    expect(geometry.card.width).toBeGreaterThanOrEqual(112);
    expect(geometry.card.height).toBeGreaterThanOrEqual(78);
    expect(geometry.card.right).toBeLessThanOrEqual(geometry.table.right);
    expect(geometry.card.bottom).toBeLessThanOrEqual(geometry.table.bottom);
    expect(geometry.halo.x).toBeLessThan(geometry.hero.x);
    expect(geometry.halo.right).toBeGreaterThan(geometry.hero.right);
    expect(geometry.anchors.filter((anchor) => anchor.id === sourceId)).toHaveLength(1);
    expect(geometry.anchors.every((anchor) => geometry.card.right <= anchor.x || geometry.card.x >= anchor.right || geometry.card.bottom <= anchor.y || geometry.card.y >= anchor.bottom)).toBe(true);
    for (const obstacle of [geometry.center, geometry.system, geometry.messages, geometry.exit].filter(Boolean)) {
      expect(geometry.card.right <= obstacle.x || geometry.card.x >= obstacle.right || geometry.card.bottom <= obstacle.y || geometry.card.y >= obstacle.bottom).toBe(true);
    }
    expect(geometry.sourceTetherPoints.every((point) => point.x >= geometry.shellBounds.x && point.x <= geometry.shellBounds.right
      && point.y >= geometry.shellBounds.y && point.y <= geometry.shellBounds.bottom)).toBe(true);
    expect(geometry.sourceTetherPoints.every((point) => point.x < geometry.center.x - 2 || point.x > geometry.center.right + 2 || point.y < geometry.center.y - 2 || point.y > geometry.center.bottom + 2)).toBe(true);
    expect(geometry.sourceCardDuplicates).toBe(0);
    expect(geometry.settledCardCount).toBe(0);
    for (const dimension of ["x", "y", "right", "bottom", "width", "height"]) {
      expect(Math.abs(geometry.anchor[dimension] - before[dimension]), `Local Dock ${dimension} remains stable`).toBeLessThanOrEqual(0.5);
    }
    await testInfo.attach("self-target-root-overlay", { body: await page.screenshot(), contentType: "image/png" });
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveCount(0, { timeout: 15_000 });
  });
}

async function expectAttackGraphIdentity(page, rootAction) {
  const overlay = page.locator('[data-root-action-overlay="true"]');
  await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
  await expect(overlay).toHaveAttribute("data-root-action-display-mode", "graph");
  await expect(overlay).toHaveAttribute("data-root-action-layout-state", "ready");
  await expect(overlay).toHaveAttribute("data-root-action-event-id", rootAction.rootEventId);
  await expect(overlay).toHaveAttribute("data-root-action-interaction-id", rootAction.interactionId);
  await expect(overlay).toHaveAttribute("data-root-action-root-frame-id", rootAction.rootFrameId);
  await expect(overlay).toHaveAttribute("data-root-action-checkpoint-id", rootAction.checkpointId);
  await expect(overlay).toHaveAttribute("data-root-action-presentation-revision", String(rootAction.presentationRevision));
  await expect(overlay).toHaveAttribute("data-root-action-source-id", rootAction.sourceId);
  await expect(overlay).toHaveAttribute("data-root-action-target-id", rootAction.targetId);
  await expect(overlay).toHaveAttribute("data-root-action-card-kind", "Attack");
  expect(await overlay.getAttribute("data-root-action-fallback-reason")).toBeNull();
  await expect(overlay.locator('[data-root-action-card="true"]')).toBeVisible();
  await expect(overlay.locator('[data-root-action-edge="source"]')).toBeVisible();
  await expect(overlay.locator('[data-root-action-edge="target"]')).toBeVisible();
}

function attackPollMatches(sample, rootAction) {
  return sample.phase === "response" && sample.rootAction?.interactionId === rootAction.interactionId
    && sample.rootAction?.rootFrameId === rootAction.rootFrameId
    && sample.rootAction?.checkpointId === rootAction.checkpointId
    && sample.rootAction?.presentationRevision === rootAction.presentationRevision
    && sample.rootAction?.rootEventId === rootAction.rootEventId
    && sample.rootAction?.sourceId === rootAction.sourceId
    && sample.rootAction?.targetId === rootAction.targetId
    && sample.rootAction?.action === "ATTACK" && sample.rootAction?.cardKind === "Attack";
}

async function waitForAttackProofPolls(samples, fromIndex, rootAction, count, timeout = 10_000) {
  await expect.poll(() => samples.slice(fromIndex).filter((sample) => attackPollMatches(sample, rootAction)).length, {
    timeout,
    message: `server room polling continues to project the same proven Attack root ${rootAction.rootEventId}`,
  }).toBeGreaterThanOrEqual(count);
}

async function assertContinuousAttackGraphFrames(page, rootAction, startTimeMs, endTimeMs, label) {
  const frames = await page.evaluate(({ start, end }) => window.__wtkAttackVisibleFrames
    .filter((frame) => frame.sampleTimeMs >= start && frame.sampleTimeMs <= end), { start: startTimeMs, end: endTimeMs });
  expect(frames.length, `${label}: rAF trace covers the observation interval`).toBeGreaterThan(10);
  expect(frames.at(-1).sampleTimeMs - frames[0].sampleTimeMs, `${label}: measured frame coverage`).toBeGreaterThanOrEqual(endTimeMs - startTimeMs - 50);
  const unexpected = frames.filter((frame) => frame.rootEventId !== rootAction.rootEventId
    || frame.interactionId !== rootAction.interactionId
    || frame.rootFrameId !== rootAction.rootFrameId
    || frame.checkpointId !== rootAction.checkpointId
    || frame.presentationRevision !== String(rootAction.presentationRevision)
    || frame.sourceId !== rootAction.sourceId || frame.targetId !== rootAction.targetId
    || frame.rootCardKind !== "Attack" || frame.mode !== "graph" || frame.layoutState !== "ready"
    || frame.fallbackGate !== null || !frame.rootCardVisible || frame.interactionStageVisible
    || frame.attackResponseStageVisible || frame.localUiMode !== null
    || frame.activeTableRevealCardCount !== 0 || !frame.sourceEdgeVisible || !frame.targetEdgeVisible
    || !frame.targetMarkerPresent || !frame.svgVisible || frame.classification !== "graph-visible"
    || frame.sourceAnchorResidual > 2.1 || frame.targetAnchorResidual > 2.1);
  expect(unexpected, `${label}: every sampled frame must retain the same proven, visibly connected graph; first unexpected frames: ${JSON.stringify(unexpected.slice(0, 5))}`).toEqual([]);
  expect(frames.slice(1).every((frame, index) => frame.frameNumber === frames[index].frameNumber + 1), `${label}: no unobserved rAF sample gap`).toBe(true);
  return frames;
}

async function captureAttackGraphGeometry(page, sourceId, targetId, playerCount, viewport, label) {
  const before = await page.evaluate(() => window.__wtkRootOverlayPreGraphAnchors);
  const after = await measure(page, sourceId, targetId);
  expect(before, `${label}: capture physical Seats/Dock before graph ownership`).toBeTruthy();
  expect(Object.keys(before)).toHaveLength(playerCount);
  expect(after.playerAnchors).toHaveLength(playerCount);
  expect(after.overlayReady).toBe(true);
  expect(after.stageCount).toBe(0);
  expect(after.documentWidth).toBeLessThanOrEqual(after.viewportWidth);
  expect(after.sourcePath).toMatch(/^M \S+ \S+ L \S+ \S+$/);
  expect(after.targetPath).toMatch(/^M \S+ \S+ L \S+ \S+$/);
  expect(after.targetEdge).toContain("root-target-arrow-");
  for (const anchor of after.playerAnchors) {
    const baseline = before[anchor.id];
    expect(baseline, `${label}: baseline exists for physical player ${anchor.id}`).toBeTruthy();
    for (const dimension of ["x", "y", "right", "bottom", "width", "height"]) {
      expect(Math.abs(anchor[dimension] - baseline[dimension]), `${label}: ${anchor.id} ${dimension} does not shift when graph appears`).toBeLessThanOrEqual(0.5);
    }
  }
  return { playerCount, viewport, before, after };
}

test("ten real Attack windows retain one proven visible graph through room polling for both participants", async ({ browser, request }, testInfo) => {
  test.setTimeout(240_000);
  const scenarios = [
    { playerCount: 4, viewport: { width: 390, height: 844 } },
    { playerCount: 4, viewport: { width: 480, height: 900 } },
    { playerCount: 4, viewport: { width: 1440, height: 900 } },
    { playerCount: 4, viewport: { width: 390, height: 844 } },
    { playerCount: 4, viewport: { width: 480, height: 900 } },
    { playerCount: 4, viewport: { width: 1440, height: 900 } },
    { playerCount: 4, viewport: { width: 390, height: 844 } },
    { playerCount: 4, viewport: { width: 480, height: 900 } },
    { playerCount: 4, viewport: { width: 1440, height: 900 } },
    { playerCount: 4, viewport: { width: 390, height: 844 } },
  ];
  const rootEventIds = new Set();
  const frameTraces = [];
  const projectionPollTraces = [];
  const geometryEvidence = [];

  for (const [index, scenario] of scenarios.entries()) {
    const { playerCount, viewport } = scenario;
    const sourceCard = { ...attack, id: `attack-continuity-${index}` };
    const targetCard = { ...dodge, id: `dodge-continuity-${index}` };
    const seed = await seedGame(request, playerCount, { sourceCard, targetCard });
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    const attackerPage = await browser.newPage({ viewport });
    const defenderPage = await browser.newPage({ viewport });
    const attackerPolls = observePublicAttackProofPolls(attackerPage);
    const defenderPolls = observePublicAttackProofPolls(defenderPage);
    const label = `${playerCount} players / ${viewport.width}×${viewport.height}`;
    try {
      await Promise.all([openGame(attackerPage, seed, 0, viewport), openGame(defenderPage, seed, 1, viewport)]);
      await Promise.all([
        attackerPage.evaluate(() => window.__wtkStartAttackVisibleFrameSampling()),
        defenderPage.evaluate(() => window.__wtkStartAttackVisibleFrameSampling()),
      ]);
      await playAttackThroughPage(attackerPage, "TARGET", sourceCard);
      await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, {
        timeout: 20_000,
        message: `${label}: server creates a public ordinary Attack root`,
      }).not.toBeNull();
      const targetView = await roomView(request, seed, 1);
      const rootAction = targetView.presentationSnapshot.rootAction;
      expect(targetView.currentAction.kind).toBe("response");
      expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", sourceId, targetId });
      expect(targetView.timeline.some((event) => event.id === rootAction.rootEventId && event.action === "play" && event.card?.kind === "Attack")).toBe(true);
      expect(JSON.stringify(rootAction)).not.toContain(sourceCard.id);
      expect(rootEventIds.has(rootAction.rootEventId), "each independently seeded window has a distinct authoritative root event").toBe(false);
      rootEventIds.add(rootAction.rootEventId);
      await Promise.all([expectAttackGraphIdentity(attackerPage, rootAction), expectAttackGraphIdentity(defenderPage, rootAction)]);

      const attackerPollStart = attackerPolls.length;
      const defenderPollStart = defenderPolls.length;
      const nodeStart = Date.now();
      const attackerStart = await attackerPage.evaluate(() => performance.now());
      const defenderStart = await defenderPage.evaluate(() => performance.now());
      const minimumPolls = index === 0 ? 8 : 1;
      if (index === 0) {
        await Promise.all([attackerPage, defenderPage].map((page) => expect.poll(() => page.evaluate(({ start, rootEventId }) =>
          window.__wtkAttackVisibleFrames.some((frame) => frame.sampleTimeMs >= start + 12_000 && frame.rootEventId === rootEventId),
        { start: page === attackerPage ? attackerStart : defenderStart, rootEventId: rootAction.rootEventId }), {
          timeout: 20_000,
          message: `${label}: sample real root graph continuously for at least 12 seconds`,
        }).toBe(true)));
      }
      await Promise.all([
        waitForAttackProofPolls(attackerPolls, attackerPollStart, rootAction, minimumPolls, index === 0 ? 20_000 : 12_000),
        waitForAttackProofPolls(defenderPolls, defenderPollStart, rootAction, minimumPolls, index === 0 ? 20_000 : 12_000),
      ]);
      const attackerEnd = await attackerPage.evaluate(() => performance.now());
      const defenderEnd = await defenderPage.evaluate(() => performance.now());
      const nodeEnd = Date.now();
      const attackerFrames = await assertContinuousAttackGraphFrames(attackerPage, rootAction, attackerStart, attackerEnd, `${label} local attacker`);
      const defenderFrames = await assertContinuousAttackGraphFrames(defenderPage, rootAction, defenderStart, defenderEnd, `${label} local defender`);
      if (index === 0) {
        expect(attackerEnd - attackerStart).toBeGreaterThanOrEqual(12_000);
        expect(defenderEnd - defenderStart).toBeGreaterThanOrEqual(12_000);
      }
      for (const [role, samples, fromIndex] of [["attacker", attackerPolls, attackerPollStart], ["defender", defenderPolls, defenderPollStart]]) {
        const intervalPolls = samples.slice(fromIndex).filter((sample) => sample.observedAt >= nodeStart && sample.observedAt <= nodeEnd && sample.phase === "response");
        expect(intervalPolls.length, `${label} ${role}: enough actual room GET polls were observed`).toBeGreaterThanOrEqual(minimumPolls);
        expect(intervalPolls.every((sample) => attackPollMatches(sample, rootAction)), `${label} ${role}: every response poll retained the same public root identity`).toBe(true);
        projectionPollTraces.push({ label, role, polls: intervalPolls });
      }

      const actorGeometry = await captureAttackGraphGeometry(attackerPage, sourceId, targetId, playerCount, viewport, `${label} local attacker`);
      const defenderGeometry = await captureAttackGraphGeometry(defenderPage, sourceId, targetId, playerCount, viewport, `${label} local defender`);
      geometryEvidence.push({ label, actorGeometry, defenderGeometry });
      frameTraces.push({ label, rootAction, attackerFrames, defenderFrames });
      if (playerCount === 4) {
        await testInfo.attach(`attack-continuity-${index + 1}-attacker.png`, { body: await attackerPage.screenshot(), contentType: "image/png" });
      }
      await testInfo.attach(`attack-continuity-${index + 1}-defender.png`, { body: await defenderPage.screenshot(), contentType: "image/png" });
      await expect(attackerPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-display-mode", "graph");
      await expect(defenderPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-display-mode", "graph");
    } finally {
      await Promise.all([attackerPage.close(), defenderPage.close()]);
    }
  }

  expect(rootEventIds.size).toBeGreaterThanOrEqual(10);
  await testInfo.attach("attack-continuity-rAF-traces.json", { body: JSON.stringify(frameTraces, null, 2), contentType: "application/json" });
  await testInfo.attach("attack-continuity-public-projection-polls.json", { body: JSON.stringify(projectionPollTraces, null, 2), contentType: "application/json" });
  await testInfo.attach("attack-continuity-geometry.json", { body: JSON.stringify(geometryEvidence, null, 2), contentType: "application/json" });
});

test("real mobile Attack graph remeasures after visual viewport height changes and preserves page-scroll safety", async ({ browser, request }, testInfo) => {
  test.setTimeout(150_000);
  for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }]) {
    const sourceCard = { ...attack, id: `attack-mobile-geometry-${viewport.width}` };
    const targetCard = { ...dodge, id: `dodge-mobile-geometry-${viewport.width}` };
    const seed = await seedGame(request, 4, { sourceCard, targetCard });
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    const attackerContext = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    const defenderContext = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    const attackerPage = await attackerContext.newPage();
    const defenderPage = await defenderContext.newPage();
    try {
      await Promise.all([
        openGame(attackerPage, seed, 0, viewport),
        openGame(defenderPage, seed, 1, viewport),
      ]);
      await Promise.all([
        attackerPage.evaluate(() => window.__wtkStartAttackVisibleFrameSampling()),
        defenderPage.evaluate(() => window.__wtkStartAttackVisibleFrameSampling()),
      ]);
      await playAttackThroughPage(attackerPage, "TARGET", sourceCard);
      await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction ?? null, {
        timeout: 20_000,
        message: `${viewport.width}px mobile: server creates a proven Attack root`,
      }).not.toBeNull();
      const rootAction = (await roomView(request, seed, 1)).presentationSnapshot.rootAction;
      expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", sourceId, targetId });
      await Promise.all([expectAttackGraphIdentity(attackerPage, rootAction), expectAttackGraphIdentity(defenderPage, rootAction)]);

      const geometryAtCurrentViewport = async (page, phase) => {
        await expect.poll(() => page.evaluate(({ source, target, rootEventId, interactionId }) => {
          const overlay = document.querySelector('[data-root-action-overlay="true"]');
          if (!overlay || overlay.dataset.rootActionEventId !== rootEventId
            || overlay.dataset.rootActionInteractionId !== interactionId) return "wrong-root";
          if (overlay.dataset.rootActionLayoutState === "unavailable"
            && overlay.dataset.rootActionFallbackReason === "geometry-unavailable") return "unavailable";
          if (overlay.dataset.rootActionLayoutState !== "ready" || overlay.dataset.rootActionReady !== "true") return "pending";
          const svg = overlay.querySelector(".interaction-root-connectors");
          const root = overlay.querySelector('[data-root-action-card="true"]');
          const anchors = [...document.querySelectorAll("[data-player-anchor]")];
          const anchor = (id) => anchors.find((element) => element.dataset.playerAnchor === id)?.getBoundingClientRect() ?? null;
          const sourceBounds = anchor(source);
          const targetBounds = anchor(target);
          const rootBounds = root?.getBoundingClientRect() ?? null;
          const svgBounds = svg?.getBoundingClientRect() ?? null;
          const distance = (point, rect) => point && rect
            ? Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom))
            : Infinity;
          const endpoints = (edge) => {
            const path = overlay.querySelector(`[data-root-action-edge="${edge}"]`);
            if (!path || !svgBounds) return [null, null];
            return [0, path.getTotalLength()].map((offset) => {
              const point = path.getPointAtLength(offset);
              return { x: point.x + svgBounds.x, y: point.y + svgBounds.y };
            });
          };
          const pairedDistance = (points, first, second) => Math.min(
            distance(points[0], first) + distance(points[1], second),
            distance(points[0], second) + distance(points[1], first),
          );
          return sourceBounds && targetBounds && rootBounds
            && pairedDistance(endpoints("source"), sourceBounds, rootBounds) <= 2.1
            && pairedDistance(endpoints("target"), rootBounds, targetBounds) <= 2.1
            ? "ready" : "pending";
        }, { source: sourceId, target: targetId, rootEventId: rootAction.rootEventId, interactionId: rootAction.interactionId }), {
          message: `${phase}: only accept ready after both SVG endpoints match current real anchors, or an explicit geometry fallback`,
        }).toMatch(/^(ready|unavailable)$/);
        const measurement = await page.evaluate(({ source, target }) => {
          const overlay = document.querySelector('[data-root-action-overlay="true"]');
          const svg = overlay?.querySelector(".interaction-root-connectors");
          const root = overlay?.querySelector('[data-root-action-card="true"]');
          const anchors = [...document.querySelectorAll("[data-player-anchor]")];
          const anchor = (id) => anchors.find((element) => element.dataset.playerAnchor === id)?.getBoundingClientRect() ?? null;
          const sourceBounds = anchor(source);
          const targetBounds = anchor(target);
          const rootBounds = root?.getBoundingClientRect() ?? null;
          const svgBounds = svg?.getBoundingClientRect() ?? null;
          const endpoint = (edge, atEnd) => {
            const path = overlay?.querySelector(`[data-root-action-edge="${edge}"]`);
            if (!path || !svgBounds) return null;
            const point = path.getPointAtLength(atEnd ? path.getTotalLength() : 0);
            return { x: point.x + svgBounds.x, y: point.y + svgBounds.y };
          };
          const distance = (point, rect) => point && rect
            ? Math.hypot(Math.max(rect.left - point.x, 0, point.x - rect.right), Math.max(rect.top - point.y, 0, point.y - rect.bottom))
            : Infinity;
          const sourceEndpoints = [endpoint("source", false), endpoint("source", true)];
          const targetEndpoints = [endpoint("target", false), endpoint("target", true)];
          const pairedDistance = (points, first, second) => Math.min(
            distance(points[0], first) + distance(points[1], second),
            distance(points[0], second) + distance(points[1], first),
          );
          const targetPath = overlay?.querySelector('[data-root-action-edge="target"]');
          const sourcePath = overlay?.querySelector('[data-root-action-edge="source"]');
          const marker = overlay?.querySelector('.interaction-root-connectors marker[id^="root-target-arrow-"]');
          const visible = (element) => {
            if (!element) return false;
            const style = getComputedStyle(element);
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0;
          };
          const visualViewport = window.visualViewport;
          return {
            rootEventId: overlay?.dataset.rootActionEventId ?? null,
            interactionId: overlay?.dataset.rootActionInteractionId ?? null,
            mode: overlay?.dataset.rootActionDisplayMode ?? null,
            layout: overlay?.dataset.rootActionLayoutState ?? null,
            fallback: overlay?.dataset.rootActionFallbackReason ?? null,
            ready: overlay?.dataset.rootActionReady ?? null,
            rootCardVisible: visible(root),
            sourceVisible: visible(sourcePath),
            targetVisible: visible(targetPath),
            svgVisible: visible(svg),
            markerPresent: Boolean(marker),
            sourceToAnchors: pairedDistance(sourceEndpoints, sourceBounds, rootBounds),
            targetToAnchors: pairedDistance(targetEndpoints, rootBounds, targetBounds),
            sourceEndpoints,
            targetEndpoints,
            connectorBounds: svgBounds ? { x: svgBounds.x, y: svgBounds.y, width: svgBounds.width, height: svgBounds.height } : null,
            targetPathData: targetPath?.getAttribute("d") ?? null,
            root: rootBounds ? { x: rootBounds.x, y: rootBounds.y, width: rootBounds.width, height: rootBounds.height } : null,
            source: sourceBounds ? { x: sourceBounds.x, y: sourceBounds.y, width: sourceBounds.width, height: sourceBounds.height } : null,
            target: targetBounds ? { x: targetBounds.x, y: targetBounds.y, width: targetBounds.width, height: targetBounds.height } : null,
            inner: { width: innerWidth, height: innerHeight, scrollY },
            visualViewport: visualViewport ? { width: visualViewport.width, height: visualViewport.height, offsetTop: visualViewport.offsetTop, pageTop: visualViewport.pageTop } : null,
            document: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
            stageCount: document.querySelectorAll(".interaction-stage").length,
            visibleLegacyHeroNodes: [...document.querySelectorAll(".medium-participant-card, .hero-focus")]
              .filter(visible).map((element) => ({ className: element.className, role: element.getAttribute("aria-label") })),
          };
        }, { source: sourceId, target: targetId });
        expect(measurement.rootEventId).toBe(rootAction.rootEventId);
        expect(measurement.interactionId).toBe(rootAction.interactionId);
        if (measurement.layout === "ready") {
          expect(measurement.mode).toBe("graph");
          expect(measurement.ready).toBe("true");
          expect(measurement.fallback).toBeNull();
          expect(measurement.rootCardVisible && measurement.sourceVisible && measurement.targetVisible && measurement.svgVisible).toBe(true);
          expect(measurement.markerPresent).toBe(true);
          expect(measurement.sourceToAnchors, `${phase}: source tether ends on the real source and same root; measured ${JSON.stringify(measurement)}`).toBeLessThanOrEqual(2.1);
          expect(measurement.targetToAnchors, `${phase}: Attack arrow ends on the same root and target; measured ${JSON.stringify(measurement)}`).toBeLessThanOrEqual(2.1);
          expect(measurement.stageCount, `${phase}: no duplicate legacy Stage accompanies the graph`).toBe(0);
          expect(measurement.visibleLegacyHeroNodes, `${phase}: graph ownership leaves no visible central Hero/source duplicate`).toEqual([]);
        } else {
          expect(measurement.mode).toBe("fallback");
          expect(measurement.ready).toBe("false");
          expect(measurement.fallback, `${phase}: an unavailable graph has a classified reason`).toBe("geometry-unavailable");
          expect(measurement.rootCardVisible || measurement.sourceVisible || measurement.targetVisible || measurement.svgVisible).toBe(false);
          expect(measurement.stageCount, `${phase}: fail-closed fallback does not duplicate the legacy Stage`).toBeLessThanOrEqual(1);
        }
        expect(measurement.document.width).toBeLessThanOrEqual(measurement.inner.width);
        await testInfo.attach(`attack-mobile-geometry-${viewport.width}-${phase.replace(/[^a-z0-9]+/giu, "-").toLowerCase()}.json`, {
          body: JSON.stringify(measurement, null, 2), contentType: "application/json",
        });
        return measurement;
      };

      const pages = [attackerPage, defenderPage];
      const stableSamplingStarts = await Promise.all(pages.map((page) => page.evaluate(() => performance.now())));
      const initial = await Promise.all(pages.map((page) => geometryAtCurrentViewport(page, "initial")));
      expect(initial.every(({ layout }) => layout === "ready"), `${viewport.width}px opening graph is valid before geometry changes`).toBe(true);
      for (const page of pages) {
        const before = await page.evaluate(() => ({ width: window.visualViewport?.width ?? null, height: window.visualViewport?.height ?? null }));
        const resizedViewport = { width: viewport.width, height: viewport.height - 120 };
        await page.setViewportSize(resizedViewport);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const after = await page.evaluate(() => ({ width: window.visualViewport?.width ?? null, height: window.visualViewport?.height ?? null }));
        expect(after.width).toBe(before.width);
        expect(after.height).toBeLessThan(before.height);
      }
      const resized = await Promise.all(pages.map((page) => geometryAtCurrentViewport(page, "viewport shrink")));
      expect(resized.every(({ rootEventId, interactionId }) => rootEventId === rootAction.rootEventId && interactionId === rootAction.interactionId)).toBe(true);
      for (const [index, page] of pages.entries()) {
        const scrollState = await page.evaluate(() => {
          const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
          const targetScroll = Math.min(72, maxScroll);
          if (targetScroll > 0) window.scrollTo({ top: targetScroll, behavior: "auto" });
          return { maxScroll, targetScroll };
        });
        if (scrollState.targetScroll > 0) {
          await expect.poll(() => page.evaluate(() => scrollY), { message: `${viewport.width}px viewer can complete a real page scroll` })
            .toBe(scrollState.targetScroll);
        } else {
          expect(await page.evaluate(() => scrollY), `${viewport.width}px has no forced document scroll when the game fits the visual viewport`).toBe(0);
        }
        const afterScroll = await geometryAtCurrentViewport(page, `scroll (${scrollState.targetScroll}px)`);
        await testInfo.attach(`attack-mobile-geometry-${viewport.width}-${index === 0 ? "attacker" : "defender"}.json`, {
          body: JSON.stringify({ initial: initial[index], resized: resized[index], scrollState, afterScroll }, null, 2),
          contentType: "application/json",
        });
        if (index === 1) {
          const screenshotPath = testInfo.outputPath(`attack-mobile-geometry-${viewport.width}-resized.png`);
          await page.screenshot({ path: screenshotPath });
          await testInfo.attach(`attack-mobile-geometry-${viewport.width}-resized.png`, {
            path: screenshotPath, contentType: "image/png",
          });
        }
        await page.setViewportSize(viewport);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        await expect.poll(() => page.locator('[data-root-action-overlay="true"]').getAttribute("data-root-action-layout-state"), {
          message: `${viewport.width}px restoring the original visual viewport remeasures the still-proven Attack root`,
        }).toBe("ready");
        await expect.poll(() => page.evaluate(({ rootEventId, interactionId }) => {
          const frame = window.__wtkAttackVisibleFrames.at(-1);
          return frame?.rootEventId === rootEventId && frame?.interactionId === interactionId
            && frame.classification === "graph-visible"
            && frame.sourceAnchorResidual <= 2.1 && frame.targetAnchorResidual <= 2.1;
        }, { rootEventId: rootAction.rootEventId, interactionId: rootAction.interactionId }), {
          message: `${viewport.width}px one animation frame uses the restored Seat/Dock positions rather than stale connector geometry`,
        }).toBe(true);
        const restored = await geometryAtCurrentViewport(page, "viewport restored");
        expect(restored.layout, `${viewport.width}px returns to the same usable Attack graph after restoring the viewport`).toBe("ready");
        await expect.poll(() => page.evaluate(() => window.__wtkAttackVisibleFrames.slice(-3).every((frame) => frame.classification === "graph-visible")), {
          message: `${viewport.width}px restored viewport keeps the same graph visible across consecutive animation frames`,
        }).toBe(true);
        const traceEnd = await page.evaluate(() => performance.now());
        const frames = await page.evaluate(({ start, end }) => window.__wtkAttackVisibleFrames
          .filter((frame) => frame.sampleTimeMs >= start && frame.sampleTimeMs <= end), { start: stableSamplingStarts[index], end: traceEnd });
        const invalidFrames = frames.filter((frame) => frame.rootEventId !== rootAction.rootEventId
          || frame.interactionId !== rootAction.interactionId
          || !["graph-visible", "measurement-pending", "geometry-unavailable"].includes(frame.classification)
          || frame.classification === "graph-visible" && (!frame.sourceEdgeVisible || !frame.targetEdgeVisible || !frame.svgVisible || !frame.targetMarkerPresent || frame.interactionStageVisible || frame.activeTableRevealCardCount !== 0 || frame.sourceAnchorResidual > 2.1 || frame.targetAnchorResidual > 2.1)
          || frame.classification === "geometry-unavailable" && (frame.fallbackGate !== "geometry-unavailable" || frame.layoutState !== "unavailable"));
        const viewportSignature = (frame) => `${frame.innerWidth}:${frame.innerHeight}:${frame.visualViewportHeight}`;
        const inFlightViewportFrames = [];
        const unexpected = invalidFrames.filter((frame) => {
          const frameIndex = frames.indexOf(frame);
          const previous = frames[frameIndex - 1];
          const next = frames[frameIndex + 1];
          const viewportChangedAtFrame = previous && viewportSignature(previous) !== viewportSignature(frame);
          const recoveredBeforeNextPaint = next && viewportSignature(next) === viewportSignature(frame)
            && next.rootEventId === rootAction.rootEventId && next.interactionId === rootAction.interactionId
            && next.classification === "graph-visible" && next.sourceEdgeVisible && next.targetEdgeVisible
            && next.svgVisible && next.targetMarkerPresent && !next.interactionStageVisible
            && next.activeTableRevealCardCount === 0
            && next.sourceAnchorResidual <= 2.1 && next.targetAnchorResidual <= 2.1;
          if (frame.rootEventId === rootAction.rootEventId && frame.interactionId === rootAction.interactionId
            && frame.classification === "graph-visible" && (frame.sourceAnchorResidual > 2.1 || frame.targetAnchorResidual > 2.1)
            && viewportChangedAtFrame && recoveredBeforeNextPaint) {
            inFlightViewportFrames.push({ frame, immediatelyRecovered: next });
            return false;
          }
          return true;
        });
        expect(unexpected, `${viewport.width}px ${index === 0 ? "attacker" : "defender"}: viewport transitions stay on this root and only use classified measurement/fallback states`).toEqual([]);
        await testInfo.attach(`attack-mobile-geometry-${viewport.width}-${index === 0 ? "attacker" : "defender"}-in-flight-rAF.json`, {
          body: JSON.stringify(inFlightViewportFrames, null, 2), contentType: "application/json",
        });
        expect(frames.length).toBeGreaterThanOrEqual(3);
        expect(frames.slice(1).every((frame, frameIndex) => frame.frameNumber === frames[frameIndex].frameNumber + 1)).toBe(true);
      }
    } finally {
      await Promise.all([attackerContext.close(), defenderContext.close()]);
    }
  }
});
