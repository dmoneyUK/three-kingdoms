import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const attack = { id: "root-overlay-real-attack", kind: "Attack", suit: "♠", rank: "7" };
const longdanDodge = { id: "root-overlay-real-longdan-dodge", kind: "Dodge", suit: "♣", rank: "6" };
const dismantle = { id: "root-overlay-real-dismantle", kind: "Dismantle", suit: "♠", rank: "7" };
const steal = { id: "root-overlay-real-steal", kind: "Steal", suit: "♠", rank: "7" };
const dodge = { id: "root-overlay-real-dodge", kind: "Dodge", suit: "♥", rank: "3" };
const peach = { id: "root-overlay-real-peach", kind: "Peach", suit: "♥", rank: "3" };

function makeFourCardDodgeHand(selectedDodge, suffix) {
  return [
    { ...selectedDodge },
    { ...attack, id: `four-player-target-attack-${suffix}`, suit: "♦", rank: "10" },
    { ...peach, id: `four-player-target-peach-${suffix}`, suit: "♣", rank: "9" },
    { ...dodge, id: `four-player-target-second-dodge-${suffix}`, suit: "♦", rank: "2" },
  ];
}

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

async function captureAttackGraphFrameDiagnostic(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
      return { x, y, right, bottom, width, height };
    };
    const visible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const bounds = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
        && bounds.width > 0 && bounds.height > 0;
    };
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    const edge = (name) => {
      const path = overlay?.querySelector(`[data-root-action-edge="${name}"]`);
      if (!path) return null;
      const style = getComputedStyle(path);
      return {
        d: path.getAttribute("d"),
        markerEnd: path.getAttribute("marker-end"),
        stroke: style.stroke,
        strokeWidth: style.strokeWidth,
        opacity: style.opacity,
        display: style.display,
        visibility: style.visibility,
      };
    };
    const root = overlay?.querySelector('[data-root-action-card="true"]');
    const targetHighlight = overlay?.querySelector('[data-root-action-target-highlight="true"]');
    const targetHighlightStyle = targetHighlight ? getComputedStyle(targetHighlight) : null;
    const target = [...document.querySelectorAll("[data-player-anchor]")]
      .find((anchor) => anchor.dataset.playerAnchor === overlay?.dataset.rootActionTargetId);
    const svg = overlay?.querySelector(".interaction-root-connectors");
    const svgStyle = svg ? getComputedStyle(svg) : null;
    const overlayStyle = overlay ? getComputedStyle(overlay) : null;
    return {
      at: Date.now(),
      overlay: overlay ? {
        eventId: overlay.dataset.rootActionEventId ?? null,
        interactionId: overlay.dataset.rootActionInteractionId ?? null,
        rootFrameId: overlay.dataset.rootActionRootFrameId ?? null,
        presentationRevision: overlay.dataset.rootActionPresentationRevision ?? null,
        sourceId: overlay.dataset.rootActionSourceId ?? null,
        targetId: overlay.dataset.rootActionTargetId ?? null,
        enabled: overlay.dataset.rootActionEnabled,
        ready: overlay.dataset.rootActionReady,
        mode: overlay.dataset.rootActionDisplayMode,
        layout: overlay.dataset.rootActionLayoutState ?? null,
        fallbackReason: overlay.dataset.rootActionFallbackReason ?? null,
        fitStep: overlay.dataset.rootActionCardFitStep,
        style: overlayStyle ? {
          display: overlayStyle.display,
          visibility: overlayStyle.visibility,
          opacity: overlayStyle.opacity,
          zIndex: overlayStyle.zIndex,
          clipPath: overlayStyle.clipPath,
        } : null,
        rootCardVisible: visible(root),
        root: rect(root),
        targetHighlight: targetHighlight ? {
          visible: visible(targetHighlight),
          playerId: targetHighlight.dataset.rootActionTargetHighlightPlayerId ?? null,
          state: targetHighlight.dataset.rootActionTargetHighlightState ?? null,
          rect: rect(targetHighlight),
          stroke: targetHighlightStyle?.stroke,
          strokeWidth: targetHighlightStyle?.strokeWidth,
          opacity: targetHighlightStyle?.opacity,
          filter: targetHighlightStyle?.filter,
        } : null,
        sourceEdge: edge("source"),
        targetEdge: edge("target"),
        svg: svg ? {
          visible: visible(svg),
          rect: rect(svg),
          display: svgStyle?.display,
          visibility: svgStyle?.visibility,
          opacity: svgStyle?.opacity,
          zIndex: svgStyle?.zIndex,
          clipPath: svgStyle?.clipPath,
          targetMarkerCount: overlay.querySelectorAll('marker[id^="root-target-arrow-"]').length,
        } : null,
      } : null,
      targetAnchor: rect(target),
      localDock: rect(document.querySelector(".local-player-dock")),
      stageCount: document.querySelectorAll(".interaction-stage").length,
      visibleLegacyAttackCards: [...document.querySelectorAll(".table-resolution-layer .table-played-card .played-card.attack, .active-table-reveal .game-card.attack")]
        .filter(visible).length,
      selectedHandCardCount: document.querySelectorAll(".game-card.selected").length,
      visibleResponseNodeCount: [...document.querySelectorAll('[data-root-action-response-card="true"]')].filter(visible).length,
    };
  });
}

function expectWholeDockAttackHighlight(state, targetId, label) {
  const highlight = state.overlay?.targetHighlight;
  expect(highlight, label + " exposes the public target highlight").toMatchObject({
    visible: true,
    playerId: targetId,
    state: "active",
    strokeWidth: "3.5px",
    opacity: "0.98",
    filter: expect.stringContaining("18px"),
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
    const overlayRect = rect(overlay);
    const shellRect = rect(document.querySelector(".game-shell"));
    const responseStyle = getComputedStyle(response);
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
    const attackPathStart = attackPath.getPointAtLength(0);
    const attackPathEnd = attackPath.getPointAtLength(attackPath.getTotalLength());
    const actualAttackSegment = {
      start: { x: attackPathStart.x + connectorRect.x, y: attackPathStart.y + connectorRect.y },
      end: { x: attackPathEnd.x + connectorRect.x, y: attackPathEnd.y + connectorRect.y },
    };
    const markPoint = mark.getPointAtLength(mark.getTotalLength() / 2);
    const attackEnd = { x: attackPathEnd.x + connectorRect.x, y: attackPathEnd.y + connectorRect.y };
    const markCenter = { x: markPoint.x + connectorRect.x, y: markPoint.y + connectorRect.y };
    const pointRectGap = (point) => Math.hypot(
      Math.max(responseRect.x - point.x, 0, point.x - responseRect.right),
      Math.max(responseRect.y - point.y, 0, point.y - responseRect.bottom),
    );
    const pointSegmentGap = (point) => {
      const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared));
      return Math.hypot(point.x - (start.x + dx * t), point.y - (start.y + dy * t));
    };
    const corners = [
      { x: responseRect.x, y: responseRect.y }, { x: responseRect.right, y: responseRect.y },
      { x: responseRect.right, y: responseRect.bottom }, { x: responseRect.x, y: responseRect.bottom },
    ];
    const lineIntersectsCard = low <= high;
    const edgeGap = lineIntersectsCard ? 0 : Math.min(pointRectGap(start), pointRectGap(end), ...corners.map(pointSegmentGap));
    return {
      mode: response.dataset.rootActionDodgeInterception,
      fraction,
      lineIntersectsCard,
      edgeGap,
      rootRect,
      targetRect,
      responseRect,
      overlayRect,
      shellRect,
      responsePosition: { left: responseStyle.left, top: responseStyle.top },
      attackSegment: { start, end },
      renderedAttackPath: { d: attackPath.getAttribute("d"), ...actualAttackSegment },
      targetAnchorClassName: String(target.className),
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

async function seedGame(request, playerCount = 4, { sourceCard = attack, sourceCards = null, sourceHp = 4, sourceHero = "zhao-yun", targetHero = "sun-quan", targetCard = null, targetCards = null } = {}) {
  const rolesByPlayerCount = {
    4: ["Rebel", "Loyalist", "Lord", "Renegade"],
    6: ["Rebel", "Loyalist", "Lord", "Renegade", "Rebel", "Rebel"],
    8: ["Rebel", "Loyalist", "Lord", "Renegade", "Rebel", "Rebel", "Loyalist", "Rebel"],
  };
  const players = [
    { name: "SOURCE", hero: sourceHero },
    { name: "TARGET", hero: targetHero },
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
    window.__wtkAttackFitDiagnostics = [];
    window.__wtkCaptureAttackFitDiagnostic = (diagnostic) => {
      window.__wtkAttackFitDiagnostics.push({ ...diagnostic, capturedAt: performance.now() });
      if (window.__wtkAttackFitDiagnostics.length > 400) window.__wtkAttackFitDiagnostics.shift();
    };
    window.__wtkStartAttackVisibleFrameSampling = () => {
      window.__wtkAttackVisibleFrames = [];
      window.__wtkAttackFrameSamplingComplete = false;
      const startedAt = performance.now();
      let frameNumber = 0;
      const isVisible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const bounds = element.getBoundingClientRect();
        const hasBoxArea = bounds.width > 0 && bounds.height > 0;
        const isPaintedSvgPath = element.namespaceURI === "http://www.w3.org/2000/svg"
          && typeof element.getTotalLength === "function"
          && element.getTotalLength() > 0
          && style.stroke !== "none"
          && Number.parseFloat(style.strokeWidth) > 0;
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
          && (hasBoxArea || isPaintedSvgPath);
      };
      const sample = () => {
        const overlay = document.querySelector('[data-root-action-overlay="true"]');
        const stage = document.querySelector(".interaction-stage");
        const attackStage = document.querySelector('.interaction-stage[data-stage="ATTACK_RESPONSE"]');
        const rootCard = overlay?.querySelector('[data-root-action-card="true"]');
        const responseCard = overlay?.querySelector('[data-root-action-response-card="true"]');
        const targetHighlight = overlay?.querySelector('[data-root-action-target-highlight="true"]');
        const attackDodgePath = overlay?.querySelector('[data-root-action-edge="attack-dodge-interception"]');
        const dodgeSourcePath = overlay?.querySelector('[data-root-action-edge="response-source"]');
        const activeRevealCards = [...document.querySelectorAll(".active-table-reveal .game-card, .table-resolution-layer .table-played-card")]
          .filter(isVisible);
        const interactionStageVisible = isVisible(stage);
        const attackResponseStageVisible = isVisible(attackStage);
        const rootEventId = overlay?.dataset.rootActionEventId ?? null;
        const connectorSvg = overlay?.querySelector(".interaction-root-connectors");
        const connectorBounds = connectorSvg?.getBoundingClientRect() ?? null;
        const rootBounds = rootCard?.getBoundingClientRect() ?? null;
        const sampledRect = (element) => {
          if (!element) return null;
          const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
          return { x, y, right, bottom, width, height };
        };
        const responseGeometry = isVisible(responseCard) ? {
          shell: sampledRect(document.querySelector(".game-shell")),
          table: sampledRect(document.querySelector(".play-table")),
          root: sampledRect(rootCard),
          response: sampledRect(responseCard),
          anchors: [...document.querySelectorAll("[data-player-anchor]")].map((element) => ({
            id: element.dataset.playerAnchor,
            rect: sampledRect(element),
          })),
          obstacles: [...document.querySelectorAll(".play-center, .stage-system-cluster, .game-messages, .game-exit")]
            .map((element) => ({ label: String(element.className), rect: sampledRect(element) })),
        } : null;
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
          sampleWallClockMs: Date.now(),
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
          cardFitStep: overlay?.dataset.rootActionCardFitStep ?? null,
          rootCardVisible: isVisible(rootCard),
          rootCardX: rootCard?.getBoundingClientRect().x ?? null,
          rootCardY: rootCard?.getBoundingClientRect().y ?? null,
          responseCardVisible: isVisible(responseCard),
          responseEventId: responseCard?.dataset.responseEventId ?? null,
          responseActorId: responseCard?.dataset.responseActorId ?? null,
          responseCardKind: responseCard?.dataset.responseCardFaceKind ?? null,
          responseGeometry,
          targetHighlightVisible: isVisible(targetHighlight),
          targetHighlightPlayerId: targetHighlight?.dataset.rootActionTargetHighlightPlayerId ?? null,
          targetHighlightState: targetHighlight?.dataset.rootActionTargetHighlightState ?? null,
          selectedHandCardCount: document.querySelectorAll(".game-card.selected").length,
          responseInterceptionMode: responseCard?.dataset.rootActionDodgeInterception ?? null,
          attackDodgePathVisible: isVisible(attackDodgePath),
          dodgeSourcePathVisible: isVisible(dodgeSourcePath),
          settled: Boolean(overlay?.querySelector('[data-root-action-settled="true"]')),
          interactionStageVisible,
          interactionStageCount: document.querySelectorAll(".interaction-stage").length,
          attackResponseStageVisible,
          legacyAttackCardCount: [...document.querySelectorAll(".table-resolution-layer .table-played-card .played-card.attack, .active-table-reveal .game-card.attack")]
            .filter(isVisible).length,
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
  const roomGetStartedAt = new WeakMap();
  page.on("request", (request) => {
    if (request.method() === "GET" && request.url().includes("/api/rooms?")) {
      roomGetStartedAt.set(request, Date.now());
    }
  });
  page.on("response", async (response) => {
    if (response.request().method() !== "GET" || !response.url().includes("/api/rooms?")) return;
    try {
      const view = await response.json();
      const identity = view.presentationSnapshot?.identity;
      const root = view.presentationSnapshot?.rootAction;
      samples.push({
        requestedAt: roomGetStartedAt.get(response.request()) ?? null,
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
          physicalCardKind: root.physicalCardKind,
          playedAs: root.playedAs,
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
    const timing = window.__wtkAttackDodgeSettlementTiming = {
      shownAt: null, exitingAt: null, removedAt: null, outcome: null, readWindowFrames: [],
    };
    const captureReadWindowFrame = (scheduledOffsetMs) => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const root = overlay?.querySelector('[data-root-action-card="true"]');
      const response = overlay?.querySelector('[data-root-action-response-card="true"]');
      const visible = (element) => {
        if (!element) return false;
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
          && rect.width > 0 && rect.height > 0;
      };
      const edge = (name) => {
        const path = overlay?.querySelector(`[data-root-action-edge="${name}"]`);
        return path ? {
          visible: visible(path),
          opacity: Number(getComputedStyle(path).opacity),
          eventId: path.dataset.responseEventId ?? null,
          actorId: path.dataset.responseActorId ?? null,
        } : null;
      };
      const highlight = overlay?.querySelector('[data-root-action-target-highlight="true"]');
      const mark = overlay?.querySelector('[data-root-action-dodge-interception-mark="true"]');
      const rootFace = root?.querySelector(".played-card");
      const responseFace = response?.querySelector(".played-card");
      timing.readWindowFrames.push({
        scheduledOffsetMs,
        elapsedMs: timing.shownAt === null ? null : Math.round(performance.now() - timing.shownAt),
        overlayReady: overlay?.dataset.rootActionReady === "true",
        rootEventId: overlay?.dataset.rootActionEventId ?? null,
        rootInteractionId: overlay?.dataset.rootActionInteractionId ?? null,
        rootFrameId: overlay?.dataset.rootActionRootFrameId ?? null,
        rootCard: {
          visible: visible(root),
          opacity: root ? Number(getComputedStyle(root).opacity) : null,
          faceVisible: visible(rootFace),
          settlementEventId: root?.dataset.rootActionSettlementEventId ?? null,
          settlementOutcome: root?.dataset.rootActionSettlementOutcome ?? null,
        },
        responseCard: {
          visible: visible(response),
          opacity: response ? Number(getComputedStyle(response).opacity) : null,
          faceVisible: visible(responseFace),
          eventId: response?.dataset.responseEventId ?? null,
          actorId: response?.dataset.responseActorId ?? null,
          cardKind: response?.dataset.responseCardFaceKind ?? null,
        },
        sourceEdge: edge("source"),
        responseSourceEdge: edge("response-source"),
        interceptionEdge: edge("attack-dodge-interception"),
        interceptionMarkVisible: visible(mark),
        targetHighlight: {
          visible: visible(highlight),
          playerId: highlight?.dataset.rootActionTargetHighlightPlayerId ?? null,
          state: highlight?.dataset.rootActionTargetHighlightState ?? null,
        },
        legacyAttackCount: [...document.querySelectorAll(".table-resolution-layer .table-played-card .played-card.attack, .active-table-reveal .game-card.attack")]
          .filter(visible).length,
      });
    };
    const capture = () => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const node = overlay?.querySelector('[data-root-action-settled="true"]');
      if (node && overlay?.dataset.rootActionReady === "true" && timing.shownAt === null) {
        timing.shownAt = performance.now();
        timing.outcome = node.dataset.rootActionSettlementOutcome ?? null;
        for (const offsetMs of [0, 1000, 19900]) {
          window.setTimeout(() => captureReadWindowFrame(offsetMs), offsetMs);
        }
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
          const sourcePathAnchor = (playerId) => {
            const element = anchor(playerId);
            return element?.classList.contains("local-player-dock")
              ? element.querySelector(".local-hero-card") ?? element
              : element;
          };
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
            source: rect(anchor(sourceId)), sourcePath: rect(sourcePathAnchor(sourceId)),
            target: rect(anchor(targetId)), targetPath: rect(anchor(targetId)),
            root: rect(root), response: rect(response),
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
          const sourceCenter = center(bounds.sourcePath ?? bounds.source);
          const targetPathBounds = bounds.targetPath ?? bounds.target;
          const targetCenter = center(targetPathBounds);
          const rootCenter = center(bounds.root);
          const responseCenter = center(bounds.response);
          const attackStart = edge(bounds.root, targetCenter);
          const attackEnd = edge(targetPathBounds, rootCenter);
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
            rootIdentity: {
              rootEventId: overlay.dataset.rootActionEventId ?? null,
              interactionId: overlay.dataset.rootActionInteractionId ?? null,
              rootFrameId: overlay.dataset.rootActionRootFrameId ?? null,
            },
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

async function assertAttackDodgeSettlementCleanup(page, { rootAction, responseProof, baselineRoot, rootCardFaceKind = "Attack", label }) {
  await expect.poll(() => page.evaluate((responseEventId) =>
    window.__wtkAttackDodgeSettlementVisual?.response?.dataset.responseEventId === responseEventId,
  responseProof.responseEventId), {
    timeout: 5_000,
    message: `${label}: the same public Dodge graph enters settlement`,
  }).toBe(true);
  const visual = await page.evaluate(() => window.__wtkAttackDodgeSettlementVisual);
  expect(visual.rootIdentity).toMatchObject({ rootEventId: rootAction.rootEventId });
  expect(visual.root.dataset).toMatchObject({
    rootActionCardFaceKind: rootCardFaceKind,
    rootActionSettlementEventId: responseProof.responseEventId,
    rootActionSettlementOutcome: "ATTACK_BLOCKED_BY_DODGE",
  });
  expect(visual.response.dataset).toMatchObject({
    responseEventId: responseProof.responseEventId,
    responseActorId: responseProof.responseActorId,
    responseCardFaceKind: "Dodge",
  });
  expect(Math.abs(visual.root.rect.x - baselineRoot.x), `${label}: Attack root x remains stable during settlement`).toBeLessThanOrEqual(1);
  expect(Math.abs(visual.root.rect.y - baselineRoot.y), `${label}: Attack root y remains stable during settlement`).toBeLessThanOrEqual(1);
  await expect.poll(() => page.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.readWindowFrames?.length ?? 0), {
    timeout: 21_000,
    message: `${label}: record the complete public graph at 0ms, 1,000ms and 19,900ms`,
  }).toBe(3);
  const readWindowFrames = await page.evaluate(() => window.__wtkAttackDodgeSettlementTiming.readWindowFrames);
  await test.info().attach(`${label.replaceAll(/[^a-z0-9]+/gi, "-").toLowerCase()}-settlement-read-window.json`, {
    body: JSON.stringify({
      timing: await page.evaluate(() => window.__wtkAttackDodgeSettlementTiming),
      readWindowFrames,
      currentOverlay: await page.evaluate(() => {
        const overlay = document.querySelector('[data-root-action-overlay="true"]');
        const root = overlay?.querySelector('[data-root-action-card="true"]');
        return {
          ready: overlay?.dataset.rootActionReady ?? null,
          eventId: overlay?.dataset.rootActionEventId ?? null,
          settlementEventId: root?.dataset.rootActionSettlementEventId ?? null,
          exiting: overlay?.dataset.rootActionSettlementExiting ?? null,
        };
      }),
    }, null, 2),
    contentType: "application/json",
  });
  expect(readWindowFrames.map((frame) => frame.scheduledOffsetMs)).toEqual([0, 1000, 19900]);
  for (const frame of readWindowFrames) {
    expect(frame.elapsedMs, `${label}: sample is within the documented scheduling tolerance`).toBeGreaterThanOrEqual(frame.scheduledOffsetMs - 100);
    expect(frame.elapsedMs, `${label}: sample is within the documented scheduling tolerance`).toBeLessThanOrEqual(frame.scheduledOffsetMs + 200);
    expect(frame, `${label}: the full committed Attack/Dodge composition remains readable at ${frame.scheduledOffsetMs}ms`).toMatchObject({
      overlayReady: true,
      rootEventId: rootAction.rootEventId,
      rootInteractionId: rootAction.interactionId,
      rootFrameId: rootAction.rootFrameId,
      rootCard: {
        visible: true,
        opacity: 1,
        faceVisible: true,
        settlementEventId: responseProof.responseEventId,
        settlementOutcome: "ATTACK_BLOCKED_BY_DODGE",
      },
      responseCard: {
        visible: true,
        opacity: 1,
        faceVisible: true,
        eventId: responseProof.responseEventId,
        actorId: responseProof.responseActorId,
        cardKind: "Dodge",
      },
      sourceEdge: expect.objectContaining({ visible: true, opacity: 1 }),
      responseSourceEdge: expect.objectContaining({ visible: true, opacity: 1 }),
      interceptionEdge: expect.objectContaining({ visible: true, opacity: 1 }),
      interceptionMarkVisible: true,
      targetHighlight: expect.objectContaining({ visible: true, playerId: responseProof.targetId, state: "blocked" }),
      legacyAttackCount: 0,
    });
  }
  await expect.poll(() => page.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.removedAt ?? null), {
    timeout: 22_000,
    message: `${label}: completed Dodge settlement node is removed`,
  }).not.toBeNull();
  const timing = await page.evaluate(() => window.__wtkAttackDodgeSettlementTiming);
  expect(timing.outcome).toBe("ATTACK_BLOCKED_BY_DODGE");
  expect(timing.exitingAt - timing.shownAt).toBeGreaterThanOrEqual(19_800);
  expect(timing.exitingAt - timing.shownAt).toBeLessThanOrEqual(20_200);
  expect(timing.removedAt - timing.exitingAt).toBeGreaterThanOrEqual(100);
  expect(timing.removedAt - timing.exitingAt).toBeLessThanOrEqual(250);
  const cleanup = await page.evaluate(() => {
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    const visible = (element) => {
      if (!element) return false;
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) > 0
        && rect.width > 0 && rect.height > 0;
    };
    return {
      rootCardVisible: visible(overlay?.querySelector('[data-root-action-card="true"]')),
      responseCardVisible: visible(overlay?.querySelector('[data-root-action-response-card="true"]')),
      visibleEdgeCount: [...(overlay?.querySelectorAll("[data-root-action-edge]") ?? [])].filter(visible).length,
      settlementNodeCount: overlay?.querySelectorAll('[data-root-action-settled="true"]').length ?? 0,
      tablePlayedCardCount: document.querySelectorAll(".table-resolution-layer .table-played-card").length,
    };
  });
  expect(cleanup, `${label}: the completed Attack/Dodge graph does not linger`).toEqual({
    rootCardVisible: false,
    responseCardVisible: false,
    visibleEdgeCount: 0,
    settlementNodeCount: 0,
    tablePlayedCardCount: 0,
  });
  return { visual, timing, cleanup };
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

async function captureAttackTargetDockEndpoint(page, targetId) {
  return page.evaluate((expectedTargetId) => {
    const overlay = document.querySelector('[data-root-action-overlay="true"]');
    const target = [...document.querySelectorAll("[data-player-anchor]")]
      .find((element) => element.dataset.playerAnchor === expectedTargetId);
    const path = overlay?.querySelector('[data-root-action-edge="target"]');
    const svg = overlay?.querySelector(".interaction-root-connectors");
    if (!overlay || !target?.classList.contains("local-player-dock") || !path || !svg) return null;
    const dock = target.getBoundingClientRect();
    const svgBounds = svg.getBoundingClientRect();
    const point = path.getPointAtLength(path.getTotalLength());
    const endpoint = { x: point.x + svgBounds.x, y: point.y + svgBounds.y };
    return {
      targetId: target.dataset.playerAnchor,
      dock: { left: dock.left, top: dock.top, right: dock.right, bottom: dock.bottom, width: dock.width, height: dock.height },
      endpoint,
      gapAboveDock: dock.top - endpoint.y,
      dockWidthPosition: (endpoint.x - dock.left) / dock.width,
    };
  }, targetId);
}

function expectAttackTargetDockEndpoint(measurement, targetId, label) {
  expect(measurement, `${label}: the rendered target path and Local Dock are measurable`).not.toBeNull();
  expect(measurement.targetId).toBe(targetId);
  expect(measurement.gapAboveDock, `${label}: arrow tip ends at or up to 5px above the Dock border`).toBeGreaterThanOrEqual(-0.5);
  expect(measurement.gapAboveDock, `${label}: arrow tip ends at or up to 5px above the Dock border`).toBeLessThanOrEqual(5);
  expect(measurement.dockWidthPosition, `${label}: arrow tip lands in the central half of the Dock`).toBeGreaterThanOrEqual(.25);
  expect(measurement.dockWidthPosition, `${label}: arrow tip lands in the central half of the Dock`).toBeLessThanOrEqual(.75);
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
    const blockedGlowRadius = Number.parseFloat(measurement.targetHighlightFilter.match(/0px 0px ([\d.]+)px/)?.[1] ?? "NaN");
    expect(blockedGlowRadius).toBeCloseTo(8, 0);
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
    expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", physicalCardKind: "Attack", sourceId, targetId });
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
    expect(firstGraphFrame.elapsedMs - firstProvenFrame.elapsedMs,
      `graph handoff is bounded from the first rendered proof frame: ${JSON.stringify({ firstProvenFrame, firstGraphFrame,
        fitDiagnostics: await page.evaluate((rootEventId) => window.__wtkAttackFitDiagnostics
          .filter((diagnostic) => diagnostic.rootEventId === rootEventId).slice(-8), rootAction.rootEventId) })}`)
      .toBeLessThanOrEqual(250);
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

test("real 4-player Attack graph stays intact while Lu Xun selects and unselects an unsubmitted Dodge", async ({ browser, request }, testInfo) => {
  test.setTimeout(75_000);
  const viewport = { width: 390, height: 844 };
  const suffix = Date.now();
  const sourceCard = { ...attack, id: "four-player-unsubmitted-attack-" + suffix };
  const targetCard = { ...dodge, id: "four-player-unsubmitted-dodge-" + suffix };
  const targetCards = makeFourCardDodgeHand(targetCard, suffix);
  const seed = await seedGame(request, 4, { sourceCard, targetCards, targetHero: "lu-xun" });
  const sourceId = seed.players[0].id;
  const targetId = seed.players[1].id;
  const attackerPage = await browser.newPage({ viewport });
  const defenderPage = await browser.newPage({ viewport });
  const viewers = [attackerPage, defenderPage];
  const attackerPolls = observePublicAttackProofPolls(attackerPage);
  const defenderPolls = observePublicAttackProofPolls(defenderPage);
  try {
    await Promise.all([
      openGame(attackerPage, seed, 0, viewport),
      openGame(defenderPage, seed, 1, viewport),
    ]);
    await playAttackThroughPage(attackerPage, "TARGET", sourceCard);
    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, {
      timeout: 20_000,
      message: "the server creates the ordinary four-player Attack root before any Dodge is selected",
    }).not.toBeNull();
    const beforeView = await roomView(request, seed, 1);
    const rootAction = beforeView.presentationSnapshot.rootAction;
    expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", sourceId, targetId });
    expect(rootAction.physicalCardKind).toBe("Attack");
    expect(beforeView.currentAction).toMatchObject({ kind: "response", actorId: targetId, requirement: "dodge" });
    expect(beforeView.presentationSnapshot.attackDodgeResponses ?? []).toEqual([]);
    await Promise.all(viewers.map((viewer) => expectAttackGraphIdentity(viewer, rootAction)));
    const beforeDom = await Promise.all(viewers.map((viewer) => captureAttackGraphFrameDiagnostic(viewer)));
    const beforeHighlightMeasurements = await Promise.all(viewers.map((viewer) => measure(viewer, sourceId, targetId)));
    const initialDockEndpoint = await captureAttackTargetDockEndpoint(defenderPage, targetId);
    expectAttackTargetDockEndpoint(initialDockEndpoint, targetId, "four-player Attack before private Dodge selection");
    for (const [index, state] of beforeDom.entries()) {
      expectWholeDockAttackHighlight(state, targetId, "viewer " + index + " before selection");
      expectAttackTargetHighlightCoversAnchor(beforeHighlightMeasurements[index], targetId, "active");
      expect(state.overlay, "viewer " + index + " initially renders the proven graph").toMatchObject({
        eventId: rootAction.rootEventId,
        interactionId: rootAction.interactionId,
        rootFrameId: rootAction.rootFrameId,
        sourceId,
        targetId,
        enabled: "true",
        ready: "true",
        mode: "graph",
        layout: "ready",
        fallbackReason: null,
        rootCardVisible: true,
        sourceEdge: expect.objectContaining({ d: expect.any(String), opacity: "1", visibility: "visible" }),
        targetEdge: expect.objectContaining({ d: expect.any(String), opacity: "1", visibility: "visible" }),
        svg: expect.objectContaining({ visible: true, targetMarkerCount: 1 }),
      });
      expect(state.stageCount, "viewer " + index + " has no duplicate legacy Interaction Stage").toBe(0);
      expect(state.visibleLegacyAttackCards, "viewer " + index + " has no numbered miniature Attack").toBe(0);
      expect(state.visibleResponseNodeCount).toBe(0);
    }
    await Promise.all(viewers.map((viewer) => viewer.evaluate(() => window.__wtkStartAttackVisibleFrameSampling())));
    await testInfo.attach("four-player-390-lu-xun-attack-before-dodge-selection.json", {
      body: JSON.stringify({ publicRoot: rootAction, beforeDom, targetDockEndpoint: initialDockEndpoint }, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach("four-player-390-lu-xun-attack-before-dodge-selection.png", {
      body: await defenderPage.screenshot(), contentType: "image/png",
    });

    const pollStarts = [attackerPolls.length, defenderPolls.length];
    const dodgeCard = defenderPage.locator("[data-hand-card-id=\"" + targetCard.id + "\"] .game-card");
    await expect(dodgeCard).toBeEnabled();
    await dodgeCard.click();
    await expect(dodgeCard).toHaveClass(/selected/);
    const selectedFrom = Date.now();
    const selectedFrameStarts = await Promise.all(viewers.map((viewer) => viewer.evaluate(() => window.__wtkAttackVisibleFrames.length)));
    const confirm = defenderPage.locator('[data-console-surface="local-operation"] button.primary');
    await expect(confirm).toBeEnabled();
    const confirmLabelWhileSelected = (await confirm.innerText()).trim();
    await Promise.all(viewers.map((viewer, index) => expect.poll(() => viewer.evaluate(({ start, expectedSelectionCount }) =>
      window.__wtkAttackVisibleFrames.slice(start).filter((frame) => frame.selectedHandCardCount === expectedSelectionCount).length,
    { start: selectedFrameStarts[index], expectedSelectionCount: index === 1 ? 1 : 0 }), {
      timeout: 5_000,
      message: "viewer " + index + " rAF samples the selected-but-unsubmitted interval",
    }).toBeGreaterThan(30)));
    await Promise.all([
      waitForAttackProofPolls(attackerPolls, pollStarts[0], rootAction, 2, 7_000, selectedFrom),
      waitForAttackProofPolls(defenderPolls, pollStarts[1], rootAction, 2, 7_000, selectedFrom),
    ]);

    await expect.poll(async () => {
      const view = await roomView(request, seed, 1);
      return view.currentAction?.kind === "response" && view.currentAction.actorId === targetId
        && view.currentAction.deadline > Date.now() ? view.currentAction.deadline : 0;
    }, { timeout: 10_000, message: "the selected Dodge remains inside the authoritative response deadline" }).toBeGreaterThan(0);
    const armedView = await roomView(request, seed, 1);
    const deadline = armedView.currentAction.deadline;
    expect(deadline - Date.now()).toBeLessThanOrEqual(30_000);
    await expect.poll(() => deadline - Date.now(), {
      timeout: 8_000,
      message: "capture the selected-Dodge state with approximately 24 seconds remaining",
    }).toBeLessThanOrEqual(24_000);
    const nearScreenshotDeadlineRemainingMs = deadline - Date.now();
    expect(nearScreenshotDeadlineRemainingMs).toBeGreaterThan(22_000);
    await testInfo.attach("four-player-390-lu-xun-selected-dodge-about-24-seconds-remain.png", {
      body: await defenderPage.screenshot(), contentType: "image/png",
    });
    await expect.poll(() => deadline - Date.now(), {
      timeout: 22_000,
      message: "the same public graph survives almost the entire still-open response period",
    }).toBeLessThanOrEqual(6_000);
    expect(deadline - Date.now()).toBeGreaterThan(0);
    const selectedThrough = Date.now();
    const selectedFrameEnds = await Promise.all(viewers.map((viewer) => viewer.evaluate(() => window.__wtkAttackVisibleFrames.length)));
    const selectedStates = await Promise.all(viewers.map((viewer) => captureAttackGraphFrameDiagnostic(viewer)));
    const selectedHighlightMeasurements = await Promise.all(viewers.map((viewer) => measure(viewer, sourceId, targetId)));
    const selectedDockEndpoint = await captureAttackTargetDockEndpoint(defenderPage, targetId);
    expectAttackTargetDockEndpoint(selectedDockEndpoint, targetId, "four-player Attack while private Dodge is selected");
    expect(Math.hypot(
      selectedDockEndpoint.endpoint.x - initialDockEndpoint.endpoint.x,
      selectedDockEndpoint.endpoint.y - initialDockEndpoint.endpoint.y,
    ), "private card selection does not move the public Attack-to-Dock endpoint").toBeLessThanOrEqual(1);
    for (const measurement of selectedHighlightMeasurements) {
      expectAttackTargetHighlightCoversAnchor(measurement, targetId, "active");
    }
    const unselectStart = Date.now();
    await dodgeCard.click();
    await expect(dodgeCard).not.toHaveClass(/selected/);
    const unselectedDockEndpoint = await captureAttackTargetDockEndpoint(defenderPage, targetId);
    expectAttackTargetDockEndpoint(unselectedDockEndpoint, targetId, "four-player Attack after private Dodge is unselected");
    expect(Math.hypot(
      unselectedDockEndpoint.endpoint.x - initialDockEndpoint.endpoint.x,
      unselectedDockEndpoint.endpoint.y - initialDockEndpoint.endpoint.y,
    ), "Dodge unselection preserves the same public Attack-to-Dock endpoint").toBeLessThanOrEqual(1);
    await expect.poll(() => defenderPage.evaluate((start) => window.__wtkAttackVisibleFrames
      .filter((frame) => frame.sampleWallClockMs >= start && frame.selectedHandCardCount === 0).length, unselectStart), {
      message: "the final local unselection occurs before the server-owned response deadline",
    }).toBeGreaterThan(10);
    const afterView = await roomView(request, seed, 1);
    expect(afterView.currentAction).toMatchObject({ kind: "response", actorId: targetId, requirement: "dodge" });
    expect(afterView.presentationSnapshot.rootAction).toMatchObject({
      interactionId: rootAction.interactionId,
      rootFrameId: rootAction.rootFrameId,
      checkpointId: rootAction.checkpointId,
      presentationRevision: rootAction.presentationRevision,
      rootEventId: rootAction.rootEventId,
      sourceId,
      targetId,
      action: "ATTACK",
      cardKind: "Attack",
      physicalCardKind: "Attack",
    });
    expect(afterView.presentationSnapshot.attackDodgeResponses ?? []).toEqual([]);
    expect(afterView.timeline.some((event) => event.type === "card" && event.card.kind === "Dodge" && event.action === "play")).toBe(false);

    const selectedFrames = await Promise.all(viewers.map((viewer, index) => viewer.evaluate(({ from, to }) =>
      window.__wtkAttackVisibleFrames.slice(from, to),
    { from: selectedFrameStarts[index], to: selectedFrameEnds[index] })));
    await testInfo.attach("four-player-390-lu-xun-attack-dodge-selection-trace.json", {
      body: JSON.stringify({
        publicRootIdentity: {
          interactionId: rootAction.interactionId,
          rootFrameId: rootAction.rootFrameId,
          checkpointId: rootAction.checkpointId,
          presentationRevision: rootAction.presentationRevision,
          rootEventId: rootAction.rootEventId,
          sourceId,
          targetId,
        },
        currentAction: {
          kind: afterView.currentAction.kind,
          actorId: afterView.currentAction.actorId,
          requirement: afterView.currentAction.requirement,
          deadline: afterView.currentAction.deadline,
        },
        attackDodgeResponseCount: afterView.presentationSnapshot.attackDodgeResponses?.length ?? 0,
        targetDockEndpoints: { beforeSelection: initialDockEndpoint, selected: selectedDockEndpoint, unselected: unselectedDockEndpoint },
        confirmLabelWhileSelected,
        selectionObservation: {
          selectedFrom,
          selectedThrough,
          selectedDurationMs: selectedThrough - selectedFrom,
          responseDeadline: deadline,
          nearScreenshotDeadlineRemainingMs,
          remainingAtUnselectMs: deadline - unselectStart,
          selectedFrameStarts,
          selectedFrameEnds,
        },
        selectedStates,
        selectedFrames,
      }, null, 2),
      contentType: "application/json",
    });
    await testInfo.attach("four-player-390-lu-xun-attack-dodge-selected-unsubmitted.png", {
      body: await defenderPage.screenshot(), contentType: "image/png",
    });

    for (const [index, state] of selectedStates.entries()) {
      const expectedSelectedCardCount = index === 1 ? 1 : 0;
      expectWholeDockAttackHighlight(state, targetId, "viewer " + index + " with private Dodge selected");
      expect(state.selectedHandCardCount, "viewer " + index + " records only the responder's local selection").toBe(expectedSelectedCardCount);
      expect(state.overlay).toMatchObject({
        eventId: rootAction.rootEventId,
        interactionId: rootAction.interactionId,
        rootFrameId: rootAction.rootFrameId,
        presentationRevision: String(rootAction.presentationRevision),
        sourceId,
        targetId,
        enabled: "true",
        ready: "true",
        mode: "graph",
        layout: "ready",
        fallbackReason: null,
        rootCardVisible: true,
        sourceEdge: expect.objectContaining({ d: expect.any(String), opacity: "1", visibility: "visible" }),
        targetEdge: expect.objectContaining({ d: expect.any(String), opacity: "1", visibility: "visible" }),
        svg: expect.objectContaining({ visible: true, targetMarkerCount: 1 }),
      });
      expect(state.stageCount).toBe(0);
      expect(state.visibleLegacyAttackCards).toBe(0);
      expect(state.visibleResponseNodeCount, "an unsubmitted Dodge is not a public graph node").toBe(0);
      expect(Math.abs(state.overlay.root.x - beforeDom[index].overlay.root.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(state.overlay.root.y - beforeDom[index].overlay.root.y)).toBeLessThanOrEqual(1);
      const frames = selectedFrames[index];
      expect(frames.length, "viewer " + index + " is sampled throughout the selected-but-unsubmitted interval").toBeGreaterThan(20);
      expect(selectedThrough - selectedFrom, "private selection remains unsubmitted for nearly the full response window").toBeGreaterThan(20_000);
      expect(frames[0].sampleWallClockMs).toBeLessThanOrEqual(selectedFrom + 250);
      expect(frames.at(-1).sampleWallClockMs).toBeGreaterThanOrEqual(selectedThrough - 1_000);
      const sampleGaps = frames.slice(1).map((frame, frameIndex) => frame.sampleTimeMs - frames[frameIndex].sampleTimeMs);
      expect(Math.max(...sampleGaps), "the long selected interval contains no unexplained frame-sampling gap").toBeLessThanOrEqual(1_500);
      expect(frames.every((frame) => frame.rootEventId === rootAction.rootEventId
        && frame.mode === "graph" && frame.layoutState === "ready" && frame.fallbackGate === null
        && frame.rootCardVisible && frame.sourceEdgeVisible && frame.targetEdgeVisible && frame.svgVisible
        && frame.targetHighlightVisible && frame.targetHighlightPlayerId === targetId && frame.targetHighlightState === "active"
        && frame.interactionStageCount === 0 && frame.activeTableRevealCardCount === 0
        && frame.legacyAttackCardCount === 0
        && frame.selectedHandCardCount === expectedSelectedCardCount
        && frame.classification === "graph-visible"),
      "viewer " + index + " retains the same visible causal graph across sampled selection frames").toBe(true);
    }

    const afterUnselect = await Promise.all(viewers.map((viewer) => captureAttackGraphFrameDiagnostic(viewer)));
    const afterUnselectHighlightMeasurements = await Promise.all(viewers.map((viewer) => measure(viewer, sourceId, targetId)));
    for (const [index, state] of afterUnselect.entries()) {
      expectWholeDockAttackHighlight(state, targetId, "viewer " + index + " after unselection");
      expectAttackTargetHighlightCoversAnchor(afterUnselectHighlightMeasurements[index], targetId, "active");
      expect(state.overlay.mode).toBe("graph");
      expect(state.overlay.ready).toBe("true");
      expect(state.overlay.eventId).toBe(rootAction.rootEventId);
      expect(state.overlay.sourceEdge).not.toBeNull();
      expect(state.overlay.targetEdge).not.toBeNull();
      expect(state.stageCount).toBe(0);
      expect(state.visibleLegacyAttackCards).toBe(0);
      expect(state.visibleResponseNodeCount).toBe(0);
      expect(Math.abs(state.overlay.root.x - beforeDom[index].overlay.root.x)).toBeLessThanOrEqual(1);
      expect(Math.abs(state.overlay.root.y - beforeDom[index].overlay.root.y)).toBeLessThanOrEqual(1);
    }
    expect((await roomView(request, seed, 1)).presentationSnapshot.attackDodgeResponses ?? []).toEqual([]);
  } finally {
    await Promise.all(viewers.map((viewer) => viewer.close()));
  }
});

test("ten independent 4-player Attack windows retain the proven graph through private Dodge selection", async ({ browser, request }, testInfo) => {
  test.setTimeout(240_000);
  const scenarios = [
    { width: 390, height: 844, converted: false, mobile: true },
    { width: 480, height: 900, converted: false, remeasure: true },
    { width: 390, height: 844, converted: true, mobile: true },
    { width: 480, height: 900, converted: true },
    { width: 390, height: 844, converted: false },
    { width: 480, height: 900, converted: false, mobile: true },
    { width: 390, height: 844, converted: true },
    { width: 480, height: 900, converted: false },
    { width: 390, height: 844, converted: true, mobile: true },
    { width: 480, height: 900, converted: false, skip: true },
  ];
  const rootEventIds = new Set();
  const windows = [];
  for (const [index, scenario] of scenarios.entries()) {
    const viewport = { width: scenario.width, height: scenario.height };
    const suffix = index + "-" + Date.now();
    const sourceCard = scenario.converted
      ? { ...longdanDodge, id: "four-player-continuity-longdan-" + suffix }
      : { ...attack, id: "four-player-continuity-attack-" + suffix };
    const targetCard = { ...dodge, id: "four-player-continuity-dodge-" + suffix };
    const targetCards = makeFourCardDodgeHand(targetCard, suffix);
    const seed = await seedGame(request, 4, { sourceCard, targetCards, targetHero: "lu-xun" });
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    const contextOptions = scenario.mobile
      ? { viewport, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }
      : { viewport };
    const attackerContext = await browser.newContext(contextOptions);
    const defenderContext = await browser.newContext(contextOptions);
    const attackerPage = await attackerContext.newPage();
    const defenderPage = await defenderContext.newPage();
    const viewers = [attackerPage, defenderPage];
    const attackerPolls = observePublicAttackProofPolls(attackerPage);
    const defenderPolls = observePublicAttackProofPolls(defenderPage);
    let rootAction = null;
    let selectedFrames = [];
    let selectedStates = [];
    let phase = "open-viewers";
    try {
      await Promise.all([
        openGame(attackerPage, seed, 0, viewport),
        openGame(defenderPage, seed, 1, viewport),
      ]);
      if (scenario.converted) {
        const conversionSkill = attackerPage.getByRole("button", { name: "Braveheart", exact: true });
        await expect(conversionSkill).toBeEnabled();
        await conversionSkill.click();
        await expect(conversionSkill).toHaveClass(/active/);
      }
      phase = "play-attack";
      await playAttackThroughPage(attackerPage, "TARGET", sourceCard);
      phase = "await-public-root";
      await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, {
        timeout: 20_000,
        message: "independent window " + index + " receives a server-proven Attack root",
      }).not.toBeNull();
      const beforeView = await roomView(request, seed, 1);
      rootAction = beforeView.presentationSnapshot.rootAction;
      expect(rootAction).toMatchObject({
        semantics: "PROVEN",
        action: "ATTACK",
        cardKind: "Attack",
        physicalCardKind: scenario.converted ? "Dodge" : "Attack",
        sourceId,
        targetId,
      });
      expect(rootAction.playedAs).toBe(scenario.converted ? "attack" : undefined);
      expect(beforeView.currentAction).toMatchObject({ kind: "response", actorId: targetId, requirement: "dodge" });
      expect(beforeView.presentationSnapshot.attackDodgeResponses ?? []).toEqual([]);
      expect(rootEventIds.has(rootAction.rootEventId), "each independently seeded window has a unique public root").toBe(false);
      rootEventIds.add(rootAction.rootEventId);
      const rootTimelineEvent = beforeView.timeline.find((event) => event.id === rootAction.rootEventId);
      expect(rootTimelineEvent).toMatchObject({
        type: "card",
        action: "play",
        card: { kind: scenario.converted ? "Dodge" : "Attack" },
      });
      if (scenario.converted) expect(rootTimelineEvent).toHaveProperty("playedAs", "attack");
      else expect(rootTimelineEvent).not.toHaveProperty("playedAs");
      phase = "verify-initial-graph";
      await Promise.all(viewers.map((viewer) => expectAttackGraphIdentity(viewer, rootAction)));
      const beforeDom = await Promise.all(viewers.map((viewer) => captureAttackGraphFrameDiagnostic(viewer)));
      for (const state of beforeDom) {
        expectWholeDockAttackHighlight(state, targetId, "window " + index + " before selection");
        expect(state.overlay).toMatchObject({
          eventId: rootAction.rootEventId,
          interactionId: rootAction.interactionId,
          rootFrameId: rootAction.rootFrameId,
          sourceId,
          targetId,
          enabled: "true",
          ready: "true",
          mode: "graph",
          layout: "ready",
          fallbackReason: null,
          rootCardVisible: true,
          sourceEdge: expect.objectContaining({ d: expect.any(String), opacity: "1", visibility: "visible" }),
          targetEdge: expect.objectContaining({ d: expect.any(String), opacity: "1", visibility: "visible" }),
          svg: expect.objectContaining({ visible: true, targetMarkerCount: 1 }),
        });
        expect(state.stageCount).toBe(0);
        expect(state.visibleLegacyAttackCards).toBe(0);
      }
      await Promise.all(viewers.map((viewer) => viewer.evaluate(() => window.__wtkStartAttackVisibleFrameSampling())));

      const pollStarts = [attackerPolls.length, defenderPolls.length];
      const dodgeCard = defenderPage.locator("[data-hand-card-id=\"" + targetCard.id + "\"] .game-card");
      await expect(dodgeCard).toBeEnabled();
      phase = "select-private-dodge";
      await dodgeCard.click();
      await expect(dodgeCard).toHaveClass(/selected/);
      const selectedRequestedAfter = Date.now();
      const selectedFrameStarts = await Promise.all(viewers.map((viewer) => viewer.evaluate(() => window.__wtkAttackVisibleFrames.length)));
      const confirm = defenderPage.locator('[data-console-surface="local-operation"] button.primary');
      await expect(confirm).toBeEnabled();
      const confirmLabel = (await confirm.innerText()).trim();
      expect(confirmLabel, "the ordinary local response action remains the approved CONFIRM control").toBe("CONFIRM");
      await Promise.all(viewers.map((viewer, viewerIndex) => expect.poll(() => viewer.evaluate(({ start, expectedSelectionCount }) =>
        window.__wtkAttackVisibleFrames.slice(start).filter((frame) => frame.selectedHandCardCount === expectedSelectionCount).length,
      { start: selectedFrameStarts[viewerIndex], expectedSelectionCount: viewerIndex === 1 ? 1 : 0 }), {
        timeout: 5_000,
        message: "window " + index + " viewer " + viewerIndex + " samples the selected Dodge state",
      }).toBeGreaterThan(30)));
      await Promise.all([
        waitForAttackProofPolls(attackerPolls, pollStarts[0], rootAction, 2, 7_000, selectedRequestedAfter),
        waitForAttackProofPolls(defenderPolls, pollStarts[1], rootAction, 2, 7_000, selectedRequestedAfter),
      ]);

      phase = "verify-authoritative-selected-state";
      const afterView = await roomView(request, seed, 1);
      expect(afterView.currentAction).toMatchObject({ kind: "response", actorId: targetId, requirement: "dodge" });
      expect(afterView.presentationSnapshot.rootAction).toMatchObject({
        interactionId: rootAction.interactionId,
        rootFrameId: rootAction.rootFrameId,
        checkpointId: rootAction.checkpointId,
        presentationRevision: rootAction.presentationRevision,
        rootEventId: rootAction.rootEventId,
        sourceId,
        targetId,
        action: "ATTACK",
        cardKind: "Attack",
        physicalCardKind: scenario.converted ? "Dodge" : "Attack",
      });
      expect(afterView.presentationSnapshot.rootAction.playedAs).toBe(scenario.converted ? "attack" : undefined);
      expect(afterView.presentationSnapshot.attackDodgeResponses ?? []).toEqual([]);
      expect(afterView.timeline.some((event) => event.type === "card" && event.card.kind === "Dodge" && event.action === "play")).toBe(scenario.converted);

      if (scenario.remeasure) {
        phase = "remeasure-layout";
        const remeasureFrameStarts = await Promise.all(viewers.map((viewer) => viewer.evaluate(() => window.__wtkAttackVisibleFrames.length)));
        await Promise.all(viewers.map((viewer) => viewer.evaluate(() => {
          window.visualViewport?.dispatchEvent(new Event("resize"));
          window.dispatchEvent(new Event("resize"));
        })));
        await Promise.all(viewers.map((viewer, viewerIndex) => expect.poll(() => viewer.evaluate((start) =>
          window.__wtkAttackVisibleFrames.slice(start).length, remeasureFrameStarts[viewerIndex]), {
          timeout: 3_000,
          message: "window " + index + " samples after viewport remeasurement",
        }).toBeGreaterThan(10)));
      }
      const selectedFrameEnds = await Promise.all(viewers.map((viewer) => viewer.evaluate(() => window.__wtkAttackVisibleFrames.length)));
      phase = "verify-selected-frames";
      selectedStates = await Promise.all(viewers.map((viewer) => captureAttackGraphFrameDiagnostic(viewer)));
      selectedFrames = await Promise.all(viewers.map((viewer, viewerIndex) => viewer.evaluate(({ from, to }) =>
        window.__wtkAttackVisibleFrames.slice(from, to),
      { from: selectedFrameStarts[viewerIndex], to: selectedFrameEnds[viewerIndex] })));
      for (const [viewerIndex, state] of selectedStates.entries()) {
        expectWholeDockAttackHighlight(state, targetId, "window " + index + " viewer " + viewerIndex + " with Dodge selected");
        expect(state.selectedHandCardCount).toBe(viewerIndex === 1 ? 1 : 0);
        expect(state.overlay).toMatchObject({
          eventId: rootAction.rootEventId,
          interactionId: rootAction.interactionId,
          rootFrameId: rootAction.rootFrameId,
          presentationRevision: String(rootAction.presentationRevision),
          sourceId,
          targetId,
          enabled: "true",
          ready: "true",
          mode: "graph",
          layout: "ready",
          fallbackReason: null,
          rootCardVisible: true,
          sourceEdge: expect.objectContaining({ d: expect.any(String), opacity: "1", visibility: "visible" }),
          targetEdge: expect.objectContaining({ d: expect.any(String), opacity: "1", visibility: "visible" }),
          svg: expect.objectContaining({ visible: true, targetMarkerCount: 1 }),
        });
        expect(state.stageCount).toBe(0);
        expect(state.visibleLegacyAttackCards).toBe(0);
        expect(state.visibleResponseNodeCount).toBe(0);
        expect(Math.abs(state.overlay.root.x - beforeDom[viewerIndex].overlay.root.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(state.overlay.root.y - beforeDom[viewerIndex].overlay.root.y)).toBeLessThanOrEqual(1);
        expect(selectedFrames[viewerIndex].length).toBeGreaterThan(30);
        expect(selectedFrames[viewerIndex].every((frame) => frame.rootEventId === rootAction.rootEventId
          && frame.interactionId === rootAction.interactionId
          && frame.rootFrameId === rootAction.rootFrameId
          && frame.presentationRevision === String(rootAction.presentationRevision)
          && frame.mode === "graph" && frame.layoutState === "ready" && frame.fallbackGate === null
          && frame.rootCardVisible && frame.sourceEdgeVisible && frame.targetEdgeVisible && frame.targetMarkerPresent && frame.svgVisible
          && frame.targetHighlightVisible && frame.targetHighlightPlayerId === targetId && frame.targetHighlightState === "active"
          && frame.interactionStageCount === 0 && frame.activeTableRevealCardCount === 0 && frame.legacyAttackCardCount === 0
          && frame.selectedHandCardCount === (viewerIndex === 1 ? 1 : 0)
          && frame.classification === "graph-visible")).toBe(true);
        for (const frame of selectedFrames[viewerIndex]) {
          expect(Math.abs(frame.rootCardX - beforeDom[viewerIndex].overlay.root.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(frame.rootCardY - beforeDom[viewerIndex].overlay.root.y)).toBeLessThanOrEqual(1);
          expect(frame.sourceAnchorResidual).toBeLessThanOrEqual(2.1);
          expect(frame.targetAnchorResidual).toBeLessThanOrEqual(2.1);
        }
      }
      if ([0, 2, 3, 9].includes(index)) {
        await testInfo.attach("four-player-selected-dodge-" + index + "-" + viewport.width + (scenario.converted ? "-converted" : "-ordinary") + ".png", {
          body: await defenderPage.screenshot(), contentType: "image/png",
        });
      }
      const selectedPolls = [attackerPolls, defenderPolls].map((polls, viewerIndex) => polls.slice(pollStarts[viewerIndex])
        .filter((sample) => sample.requestedAt >= selectedRequestedAfter && attackPollMatches(sample, rootAction)));
      expect(selectedPolls.every((polls) => polls.length >= 2)).toBe(true);

      phase = "unselect-private-dodge";
      const unselectFrameStarts = await Promise.all(viewers.map((viewer) => viewer.evaluate(() => window.__wtkAttackVisibleFrames.length)));
      await dodgeCard.click();
      await expect(dodgeCard).not.toHaveClass(/selected/);
      await Promise.all(viewers.map((viewer, viewerIndex) => expect.poll(() => viewer.evaluate(({ start, expectedSelectionCount }) =>
        window.__wtkAttackVisibleFrames.slice(start).filter((frame) => frame.selectedHandCardCount === expectedSelectionCount).length,
      { start: unselectFrameStarts[viewerIndex], expectedSelectionCount: 0 }), {
        timeout: 3_000,
        message: "window " + index + " clears only the private local Dodge selection",
      }).toBeGreaterThan(10)));
      const unselectedStates = await Promise.all(viewers.map((viewer) => captureAttackGraphFrameDiagnostic(viewer)));
      for (const [viewerIndex, state] of unselectedStates.entries()) {
        expectWholeDockAttackHighlight(state, targetId, "window " + index + " viewer " + viewerIndex + " after unselection");
        expect(state.overlay.mode).toBe("graph");
        expect(state.overlay.ready).toBe("true");
        expect(state.overlay.eventId).toBe(rootAction.rootEventId);
        expect(state.overlay.sourceEdge).not.toBeNull();
        expect(state.overlay.targetEdge).not.toBeNull();
        expect(state.stageCount).toBe(0);
        expect(state.visibleLegacyAttackCards).toBe(0);
        expect(state.visibleResponseNodeCount).toBe(0);
        expect(state.selectedHandCardCount).toBe(0);
        expect(Math.abs(state.overlay.root.x - beforeDom[viewerIndex].overlay.root.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(state.overlay.root.y - beforeDom[viewerIndex].overlay.root.y)).toBeLessThanOrEqual(1);
      }
      expect((await roomView(request, seed, 1)).presentationSnapshot.attackDodgeResponses ?? []).toEqual([]);

      if (scenario.skip) {
        phase = "submit-manual-skip";
        const skip = defenderPage.locator('[data-action-slot="decline"] button');
        await expect(skip).toHaveText("Skip");
        await expect(skip).toBeEnabled();
        const skipRequest = defenderPage.waitForResponse((response) => {
          if (response.url() !== API + "/api/rooms" || response.request().method() !== "POST") return false;
          try { return JSON.parse(response.request().postData() ?? "{}").action === "decline_response"; }
          catch { return false; }
        });
        await skip.click();
        expect((await skipRequest).ok()).toBe(true);
        await expect.poll(async () => (await roomView(request, seed, 1)).currentAction?.kind ?? "none", {
          timeout: 10_000,
          message: "Skip submits through the normal response control after the graph survived selection",
        }).not.toBe("response");
      }

      windows.push({
        index,
        viewport,
        mobileEmulation: scenario.mobile ? "Chromium isMobile/hasTouch, iPhone-sized CSS viewport and DPR 3" : null,
        converted: scenario.converted,
        targetHandSize: targetCards.length,
        remeasure: Boolean(scenario.remeasure),
        skip: Boolean(scenario.skip),
        rootEventId: rootAction.rootEventId,
        physicalCardKind: rootAction.physicalCardKind,
        playedAs: rootAction.playedAs ?? null,
        selectedFrameCounts: selectedFrames.map((frames) => frames.length),
        selectedPollCounts: selectedPolls.map((polls) => polls.length),
        selectedStates,
        unselectedStates,
        selectedFrames,
      });
      phase = "completed";
    } catch (error) {
      await testInfo.attach("four-player-attack-window-" + index + "-failure.json", {
        body: JSON.stringify({
          index,
          phase,
          completedWindowCount: windows.length,
          error: error instanceof Error ? error.message : String(error),
          viewport,
          converted: scenario.converted,
          rootAction: rootAction ? {
            interactionId: rootAction.interactionId,
            rootFrameId: rootAction.rootFrameId,
            presentationRevision: rootAction.presentationRevision,
            rootEventId: rootAction.rootEventId,
            sourceId: rootAction.sourceId,
            targetId: rootAction.targetId,
            action: rootAction.action,
            cardKind: rootAction.cardKind,
            physicalCardKind: rootAction.physicalCardKind,
            playedAs: rootAction.playedAs ?? null,
          } : null,
          selectedStates,
          selectedFrames,
          fitDiagnostics: await Promise.all(viewers.map(async (viewer) => {
            try { return await viewer.evaluate(() => window.__wtkAttackFitDiagnostics.slice(-20)); }
            catch (diagnosticError) { return { unavailable: diagnosticError instanceof Error ? diagnosticError.message : String(diagnosticError) }; }
          })),
        }, null, 2),
        contentType: "application/json",
      });
      throw error;
    } finally {
      await Promise.all([attackerContext.close(), defenderContext.close()]);
    }
  }
  expect(rootEventIds.size).toBeGreaterThanOrEqual(10);
  await testInfo.attach("four-player-attack-unsubmitted-dodge-ten-window-traces.json", {
    body: JSON.stringify(windows, null, 2),
    contentType: "application/json",
  });
});

test("real Longdan Dodge-as-Attack is intercepted by a real Dodge in both viewers", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(60_000);
  const seed = await seedGame(request, 4, { sourceCard: longdanDodge, targetCard: dodge });
  const sourceId = seed.players[0].id;
  const targetId = seed.players[1].id;
  const viewport = { width: 390, height: 844 };
  await openGame(page, seed, 0, viewport);

  const sourceBefore = await roomView(request, seed, 0);
  expect(sourceBefore.currentAction).toMatchObject({ kind: "turn", actorId: sourceId, canDeclareAttack: true });
  expect(sourceBefore.currentAction.playPhaseActions).toContainEqual(expect.objectContaining({ cardId: longdanDodge.id, canPlayAs: "attack" }));
  const braveheart = page.getByRole("button", { name: "Braveheart", exact: true });
  const braveheartDuplicate = page.locator('[data-action-extras="true"]').getByRole("button", { name: /Braveheart/ });
  await expect(braveheart).toBeEnabled();
  await expect(braveheartDuplicate).toHaveCount(0);
  await braveheart.click();
  await expect(braveheart).toHaveClass(/active/);
  await expect(braveheartDuplicate).toHaveCount(0);

  const selectedDodge = page.locator(`[data-hand-card-id="${longdanDodge.id}"] .game-card`);
  await expect(selectedDodge).toBeEnabled();
  await selectedDodge.click();
  await expect(selectedDodge).toHaveClass(/selected/);
  await page.getByRole("button", { name: "Select TARGET", exact: true }).click();
  const selectedTargetSeat = page.locator(`[data-player-anchor="${targetId}"]`);
  await expect(selectedTargetSeat).toHaveClass(/selected-target/);
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const playRequest = page.waitForRequest((candidate) => {
    if (candidate.url() !== `${API}/api/rooms` || candidate.method() !== "POST") return false;
    try { return JSON.parse(candidate.postData() ?? "{}").action === "play_card"; }
    catch { return false; }
  });
  await confirm.click();
  const submitted = JSON.parse((await playRequest).postData() ?? "{}");
  expect(submitted).toMatchObject({ action: "play_card", cardId: longdanDodge.id, playAs: "attack", targetId });

  await expect.poll(async () => {
    const view = await roomView(request, seed, 1);
    return {
      actionKind: view.currentAction?.kind,
      actorId: view.currentAction?.actorId,
      requirement: view.currentAction?.requirement,
      rootAction: view.presentationSnapshot?.rootAction ?? null,
    };
  }, { timeout: 20_000, message: "the real defender projection receives this converted single-target Attack" }).toMatchObject({
    actionKind: "response", actorId: targetId, requirement: "dodge",
    rootAction: {
      semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", physicalCardKind: "Dodge", playedAs: "attack",
      sourceId, targetId,
    },
  });

  const defenderView = await roomView(request, seed, 1);
  const rootAction = defenderView.presentationSnapshot.rootAction;
  expect(defenderView.currentAction.legalActions).toContain("respond");
  expect(defenderView.timeline.filter((event) => event.id === rootAction.rootEventId)).toHaveLength(1);
  expect(defenderView.timeline.find((event) => event.id === rootAction.rootEventId)).toMatchObject({
    action: "play", playedAs: "attack", card: { id: longdanDodge.id, kind: "Dodge" },
  });
  expect(JSON.stringify(rootAction)).not.toContain(longdanDodge.id);

  await expectAttackGraphIdentity(page, rootAction);
  const sourceRootCard = page.locator('[data-root-action-card="true"]');
  await expect(sourceRootCard).toHaveAttribute("data-root-action-card-face-kind", "Dodge");
  await expect(sourceRootCard.locator(".played-card.dodge")).toBeVisible();
  await expect(page.locator(".interaction-stage")).toHaveCount(0);

  const defenderPage = await browser.newPage();
  try {
    await openGame(defenderPage, seed, 1, viewport);
    const defenderHandDodge = defenderPage.locator(`[data-hand-card-id="${dodge.id}"] .game-card`);
    await expect(defenderHandDodge).toBeEnabled();
    await expectAttackGraphIdentity(defenderPage, rootAction);
    const defenderRootCard = defenderPage.locator('[data-root-action-card="true"]');
    await expect(defenderRootCard).toHaveAttribute("data-root-action-card-face-kind", "Dodge");
    await expect(defenderRootCard.locator(".played-card.dodge")).toBeVisible();
    await expect(defenderPage.locator(".interaction-stage")).toHaveCount(0);
    await testInfo.attach("longdan-physical-dodge-attack-defender.png", {
      body: await defenderPage.screenshot(), contentType: "image/png",
    });

    const sourceBaseline = await sourceRootCard.boundingBox();
    const defenderBaseline = await defenderRootCard.boundingBox();
    const viewers = [page, defenderPage];
    const frameStarts = await Promise.all(viewers.map((viewer) => viewer.evaluate(() => {
      window.__wtkStartAttackVisibleFrameSampling();
      return window.__wtkAttackVisibleFrames.length;
    })));
    await Promise.all(viewers.map((viewer) => observeAttackDodgeSettlement(viewer, sourceId, targetId)));
    await playDodgeThroughPage(defenderPage, dodge);
    await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.attackDodgeResponses?.length ?? 0, {
      timeout: 20_000,
      message: "server publishes the actual defender Dodge against the Longdan Attack root",
    }).toBe(1);

    const [sourceAfterDodge, defenderAfterDodge] = await Promise.all([
      roomView(request, seed, 0), roomView(request, seed, 1),
    ]);
    const responseProof = defenderAfterDodge.presentationSnapshot.attackDodgeResponses[0];
    expect(sourceAfterDodge.presentationSnapshot.attackDodgeResponses).toEqual(defenderAfterDodge.presentationSnapshot.attackDodgeResponses);
    expect(responseProof).toMatchObject({
      semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
      interactionId: rootAction.interactionId, rootFrameId: rootAction.rootFrameId,
      rootEventId: rootAction.rootEventId, rootSourceId: sourceId, targetId,
      responseActorId: targetId, rootCardKind: "Attack", responseCardKind: "Dodge",
    });
    expect(JSON.stringify(responseProof)).not.toContain(longdanDodge.id);
    expect(JSON.stringify(responseProof)).not.toContain(dodge.id);
    for (const view of [sourceAfterDodge, defenderAfterDodge]) {
      expect(view.timeline.find((event) => event.id === rootAction.rootEventId)).toMatchObject({
        action: "play", playedAs: "attack", card: { id: longdanDodge.id, kind: "Dodge" },
      });
      expect(view.timeline.find((event) => event.id === responseProof.responseEventId)).toMatchObject({
        action: "play", card: { id: dodge.id, kind: "Dodge" },
      });
    }

    const readResponseFrame = (viewer, start) => viewer.evaluate(({ frameStart, rootEventId, responseEventId }) =>
      window.__wtkAttackVisibleFrames.slice(frameStart).find((frame) => frame.rootEventId === rootEventId
        && frame.responseEventId === responseEventId && frame.responseCardVisible) ?? null,
    { frameStart: start, rootEventId: rootAction.rootEventId, responseEventId: responseProof.responseEventId });
    try {
      await Promise.all(viewers.map(async (viewer, index) => expect.poll(
        () => readResponseFrame(viewer, frameStarts[index]), {
          timeout: 8_000,
          message: `viewer ${index} captures the Longdan-root Dodge graph before settlement cleanup`,
        },
      ).toBeTruthy()));
    } catch (error) {
      const diagnostics = await Promise.all(viewers.map((viewer, index) => viewer.evaluate(({ frameStart, expectedRootEventId, expectedResponseEventId }) => {
        const overlay = document.querySelector('[data-root-action-overlay="true"]');
        const relevantFrames = window.__wtkAttackVisibleFrames.slice(frameStart)
          .filter((frame) => frame.rootEventId === expectedRootEventId || frame.responseEventId === expectedResponseEventId);
        return {
          viewport: { width: innerWidth, height: innerHeight },
          overlay: overlay ? { ...overlay.dataset } : null,
          relevantFrames: relevantFrames.slice(-20),
          latestFrames: window.__wtkAttackVisibleFrames.slice(-5),
          fitDiagnostics: window.__wtkAttackFitDiagnostics.slice(-30),
          rootCards: [...document.querySelectorAll('[data-root-action-card="true"]')].map((card) => ({ ...card.dataset, visible: card.getBoundingClientRect().width > 0 })),
          responseCards: [...document.querySelectorAll('[data-root-action-response-card="true"]')].map((card) => ({ ...card.dataset, visible: card.getBoundingClientRect().width > 0 })),
        };
      }, { frameStart: frameStarts[index], expectedRootEventId: rootAction.rootEventId, expectedResponseEventId: responseProof.responseEventId })));
      await testInfo.attach("longdan-response-frame-diagnostics.json", {
        body: JSON.stringify(diagnostics, null, 2), contentType: "application/json",
      });
      throw error;
    }
    const responseFrames = await Promise.all(viewers.map((viewer, index) => readResponseFrame(viewer, frameStarts[index])));
    for (const [index, frame] of responseFrames.entries()) {
      expect(frame).toMatchObject({
        mode: "graph", layoutState: "ready", rootEventId: rootAction.rootEventId,
        rootCardVisible: true, responseActorId: targetId, responseCardKind: "Dodge",
        attackDodgePathVisible: true, dodgeSourcePathVisible: true,
      });
      expect(Math.abs(frame.rootCardX - (index === 0 ? sourceBaseline.x : defenderBaseline.x))).toBeLessThanOrEqual(1);
      expect(Math.abs(frame.rootCardY - (index === 0 ? sourceBaseline.y : defenderBaseline.y))).toBeLessThanOrEqual(1);
      expect(await viewers[index].locator(".interaction-stage").count()).toBe(0);
      await testInfo.attach(`longdan-attack-dodge-${index === 0 ? "attacker" : "defender"}-response.png`, {
        body: await viewers[index].screenshot(), contentType: "image/png",
      });
    }

    const [sourceSettlement, defenderSettlement] = await Promise.all([
      assertAttackDodgeSettlementCleanup(page, {
        rootAction, responseProof, baselineRoot: sourceBaseline, rootCardFaceKind: "Dodge", label: "Longdan attacker",
      }),
      assertAttackDodgeSettlementCleanup(defenderPage, {
        rootAction, responseProof, baselineRoot: defenderBaseline, rootCardFaceKind: "Dodge", label: "Longdan defender",
      }),
    ]);
    for (const [label, settlement] of [["attacker", sourceSettlement], ["defender", defenderSettlement]]) {
      expect(settlement.visual.root.dataset.rootActionCardFaceKind, `${label}: Attack root keeps its physical Longdan Dodge face`).toBe("Dodge");
      expect(settlement.visual.root.faceVisible).toBe(true);
      expect(settlement.visual.response.dataset).toMatchObject({
        responseEventId: responseProof.responseEventId,
        responseActorId: targetId,
        responseCardFaceKind: "Dodge",
      });
      expect(settlement.visual.response.faceVisible).toBe(true);
      expect(settlement.visual.geometry.stageCount).toBe(0);
      expect(settlement.visual.geometry.documentWidth).toBeLessThanOrEqual(settlement.visual.geometry.viewportWidth);
      expect(settlement.visual.geometry.interception.mode).toMatch(/^(direct|adjacent)$/);
      expect(settlement.visual.geometry.interception.centerFraction).toBeGreaterThanOrEqual(.35);
      expect(settlement.visual.geometry.interception.centerFraction).toBeLessThanOrEqual(.70);
      expect(settlement.visual.geometry.interception.pathEndpointToMarkCenter).toBeLessThanOrEqual(2.1);
      expect(settlement.visual.geometry.edges.map((edge) => edge.edge)).toEqual(expect.arrayContaining([
        "source", "attack-dodge-interception", "response-source", "interception-mark",
      ]));
      expect(settlement.visual.geometry.edges.every((edge) => edge.markerEnd === null)).toBe(true);
      await testInfo.attach(`longdan-attack-dodge-${label}-settlement.json`, {
        body: JSON.stringify(settlement, null, 2), contentType: "application/json",
      });
    }
  } finally {
    await defenderPage.close();
  }
});

test("real Guan Yu red Peach-as-Attack is intercepted by a real Dodge in both viewers", async ({ page, browser, request }, testInfo) => {
  test.setTimeout(60_000);
  const redPeach = { id: "root-overlay-real-wusheng-red-peach", kind: "Peach", suit: "♥", rank: "6" };
  const blackPeach = { id: "root-overlay-real-wusheng-black-peach", kind: "Peach", suit: "♠", rank: "7" };
  const seed = await seedGame(request, 4, { sourceCards: [redPeach, blackPeach], sourceHero: "guan-yu", targetCard: dodge });
  const sourceId = seed.players[0].id;
  const targetId = seed.players[1].id;
  const viewport = { width: 390, height: 844 };

  const sourceBefore = await roomView(request, seed, 0);
  expect(sourceBefore.currentAction).toMatchObject({ kind: "turn", actorId: sourceId, canDeclareAttack: true });
  expect(sourceBefore.currentAction.playPhaseActions).toEqual([{ cardId: redPeach.id, canPlayAs: "attack" }]);
  const otherBefore = await roomView(request, seed, 1);
  expect(otherBefore.currentAction.playPhaseActions).toBeUndefined();

  await openGame(page, seed, 0, viewport);
  const godOfWar = page.getByRole("button", { name: "God of War", exact: true });
  const godOfWarDuplicate = page.locator('[data-action-extras="true"]').getByRole("button", { name: /God of War/ });
  await expect(godOfWar).toBeEnabled();
  await expect(godOfWarDuplicate).toHaveCount(0);
  await godOfWar.click();
  await expect(godOfWar).toHaveClass(/active/);
  await expect(godOfWarDuplicate).toHaveCount(0);
  const selectedPeach = page.locator(`[data-hand-card-id="${redPeach.id}"] .game-card`);
  const blackPeachInHand = page.locator(`[data-hand-card-id="${blackPeach.id}"] .game-card`);
  await expect(selectedPeach).toBeEnabled();
  await expect(blackPeachInHand).toBeDisabled();
  await selectedPeach.click();
  await expect(selectedPeach).toHaveClass(/selected/);
  await page.getByRole("button", { name: "Select TARGET", exact: true }).click();
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const playRequest = page.waitForRequest((candidate) => {
    if (candidate.url() !== `${API}/api/rooms` || candidate.method() !== "POST") return false;
    try { return JSON.parse(candidate.postData() ?? "{}").action === "play_card"; }
    catch { return false; }
  });
  await confirm.click();
  const submitted = JSON.parse((await playRequest).postData() ?? "{}");
  expect(submitted).toMatchObject({ action: "play_card", cardId: redPeach.id, playAs: "attack", targetId });

  await expect.poll(async () => {
    const view = await roomView(request, seed, 1);
    return {
      actionKind: view.currentAction?.kind,
      actorId: view.currentAction?.actorId,
      requirement: view.currentAction?.requirement,
      rootAction: view.presentationSnapshot?.rootAction ?? null,
    };
  }, { timeout: 20_000, message: "the server projects Guan Yu's red Peach as the exact semantic Attack for its defender" }).toMatchObject({
    actionKind: "response", actorId: targetId, requirement: "dodge",
    rootAction: {
      semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", physicalCardKind: "Peach", playedAs: "attack",
      sourceId, targetId,
    },
  });

  const targetView = await roomView(request, seed, 1);
  const sourceView = await roomView(request, seed, 0);
  const rootAction = targetView.presentationSnapshot.rootAction;
  expect(sourceView.presentationSnapshot.rootAction).toEqual(rootAction);
  expect(targetView.currentAction.legalActions).toContain("respond");
  expect(targetView.currentAction.playPhaseActions).toBeUndefined();
  expect(targetView.timeline.filter((event) => event.id === rootAction.rootEventId)).toHaveLength(1);
  expect(targetView.timeline.find((event) => event.id === rootAction.rootEventId)).toMatchObject({
    action: "play", playedAs: "attack", card: { id: redPeach.id, kind: "Peach", suit: "♥", rank: "6" },
  });
  expect(JSON.stringify(rootAction)).not.toContain(redPeach.id);

  await expectAttackGraphIdentity(page, rootAction);
  const sourceRootCard = page.locator('[data-root-action-card="true"]');
  await expect(sourceRootCard).toHaveAttribute("data-root-action-card-face-kind", "Peach");
  await expect(sourceRootCard.locator(".played-card.peach")).toBeVisible();
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
  const sourceBaseline = await sourceRootCard.boundingBox();
  await testInfo.attach("wusheng-red-peach-attack-source.png", { body: await page.screenshot(), contentType: "image/png" });

  const defenderPage = await browser.newPage({ viewport });
  try {
    await openGame(defenderPage, seed, 1, viewport);
    await expectAttackGraphIdentity(defenderPage, rootAction);
    const defenderRootCard = defenderPage.locator('[data-root-action-card="true"]');
    await expect(defenderRootCard).toHaveAttribute("data-root-action-card-face-kind", "Peach");
    await expect(defenderRootCard.locator(".played-card.peach")).toBeVisible();
    await expect(defenderPage.locator(".interaction-stage")).toHaveCount(0);
    const defenderBaseline = await defenderRootCard.boundingBox();
    await testInfo.attach("wusheng-red-peach-attack-defender.png", { body: await defenderPage.screenshot(), contentType: "image/png" });

    const viewers = [page, defenderPage];
    const frameStarts = await Promise.all(viewers.map((viewer) => viewer.evaluate(() => {
      window.__wtkStartAttackVisibleFrameSampling();
      return window.__wtkAttackVisibleFrames.length;
    })));
    await Promise.all(viewers.map((viewer) => observeAttackDodgeSettlement(viewer, sourceId, targetId)));
    await playDodgeThroughPage(defenderPage, dodge);
    await expect.poll(async () => (await roomView(request, seed, 0)).presentationSnapshot?.attackDodgeResponses?.length ?? 0, {
      timeout: 20_000,
      message: "the server publishes the defender Dodge against Guan Yu's converted Peach Attack",
    }).toBe(1);

    const [sourceAfterDodge, defenderAfterDodge] = await Promise.all([
      roomView(request, seed, 0), roomView(request, seed, 1),
    ]);
    const responseProof = defenderAfterDodge.presentationSnapshot.attackDodgeResponses[0];
    expect(sourceAfterDodge.presentationSnapshot.attackDodgeResponses).toEqual(defenderAfterDodge.presentationSnapshot.attackDodgeResponses);
    expect(responseProof).toMatchObject({
      semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
      interactionId: rootAction.interactionId, rootFrameId: rootAction.rootFrameId,
      rootEventId: rootAction.rootEventId, rootSourceId: sourceId, targetId,
      responseActorId: targetId, rootCardKind: "Attack", responseCardKind: "Dodge",
    });
    expect(JSON.stringify(responseProof)).not.toContain(redPeach.id);
    expect(JSON.stringify(responseProof)).not.toContain(dodge.id);
    const settledRootEvent = sourceAfterDodge.timeline.find((event) => event.id === rootAction.rootEventId);
    const settledResponseEvent = sourceAfterDodge.timeline.find((event) => event.id === responseProof.responseEventId);
    expect(responseProof.rootResolutionId).toBe(settledRootEvent.resolutionId);
    expect(responseProof.responseResolutionId).toBe(settledRootEvent.resolutionId);
    expect(settledResponseEvent.resolutionId).toBe(settledRootEvent.resolutionId);
    for (const view of [sourceAfterDodge, defenderAfterDodge]) {
      expect(view.timeline.find((event) => event.id === rootAction.rootEventId)).toMatchObject({
        action: "play", playedAs: "attack", card: { id: redPeach.id, kind: "Peach", suit: "♥", rank: "6" },
      });
      expect(view.timeline.find((event) => event.id === responseProof.responseEventId)).toMatchObject({
        action: "play", card: { id: dodge.id, kind: "Dodge" },
      });
    }

    const readResponseFrame = (viewer, start) => viewer.evaluate(({ frameStart, rootEventId, responseEventId }) =>
      window.__wtkAttackVisibleFrames.slice(frameStart).find((frame) => frame.rootEventId === rootEventId
        && frame.responseEventId === responseEventId && frame.responseCardVisible) ?? null,
    { frameStart: start, rootEventId: rootAction.rootEventId, responseEventId: responseProof.responseEventId });
    const responseScreenshots = [null, null];
    await Promise.all(viewers.map(async (viewer, index) => expect.poll(
      async () => {
        const frame = await readResponseFrame(viewer, frameStarts[index]);
        if (frame && !responseScreenshots[index]) responseScreenshots[index] = await viewer.screenshot();
        return frame;
      }, {
        timeout: 8_000,
        message: `viewer ${index} captures the Guan Yu-root Dodge graph before settlement cleanup`,
      },
    ).toBeTruthy()));
    const responseFrames = await Promise.all(viewers.map((viewer, index) => readResponseFrame(viewer, frameStarts[index])));
    for (const [index, frame] of responseFrames.entries()) {
      expect(frame).toMatchObject({
        mode: "graph", layoutState: "ready", rootEventId: rootAction.rootEventId,
        rootCardVisible: true, responseActorId: targetId, responseCardKind: "Dodge",
        attackDodgePathVisible: true, dodgeSourcePathVisible: true,
      });
      expect(Math.abs(frame.rootCardX - (index === 0 ? sourceBaseline.x : defenderBaseline.x))).toBeLessThanOrEqual(1);
      expect(Math.abs(frame.rootCardY - (index === 0 ? sourceBaseline.y : defenderBaseline.y))).toBeLessThanOrEqual(1);
      expect(frame.interactionStageCount).toBe(0);
      await testInfo.attach(`wusheng-peach-attack-dodge-${index === 0 ? "attacker" : "defender"}.png`, {
        body: responseScreenshots[index], contentType: "image/png",
      });
    }

    const [sourceSettlement, defenderSettlement] = await Promise.all([
      assertAttackDodgeSettlementCleanup(page, {
        rootAction, responseProof, baselineRoot: sourceBaseline, rootCardFaceKind: "Peach", label: "Guan Yu attacker",
      }),
      assertAttackDodgeSettlementCleanup(defenderPage, {
        rootAction, responseProof, baselineRoot: defenderBaseline, rootCardFaceKind: "Peach", label: "Guan Yu defender",
      }),
    ]);
    for (const [label, settlement] of [["attacker", sourceSettlement], ["defender", defenderSettlement]]) {
      expect(settlement.visual.root.faceVisible, `${label}: the physical Peach root face remains visible`).toBe(true);
      expect(settlement.visual.response.faceVisible, `${label}: the physical Dodge response remains visible`).toBe(true);
      expect(settlement.visual.geometry.stageCount).toBe(0);
      expect(settlement.visual.geometry.documentWidth).toBeLessThanOrEqual(settlement.visual.geometry.viewportWidth);
      expect(settlement.visual.geometry.interception.mode).toMatch(/^(direct|adjacent)$/);
      expect(settlement.visual.geometry.interception.centerFraction).toBeGreaterThanOrEqual(.35);
      expect(settlement.visual.geometry.interception.centerFraction).toBeLessThanOrEqual(.70);
      expect(settlement.visual.geometry.interception.pathEndpointToMarkCenter).toBeLessThanOrEqual(2.1);
      expect(settlement.visual.geometry.edges.map((edge) => edge.edge)).toEqual(expect.arrayContaining([
        "source", "attack-dodge-interception", "response-source", "interception-mark",
      ]));
      expect(settlement.visual.geometry.edges.every((edge) => edge.markerEnd === null)).toBe(true);
      await testInfo.attach(`wusheng-peach-attack-dodge-${label}-settlement.json`, {
        body: JSON.stringify(settlement, null, 2), contentType: "application/json",
      });
    }
  } finally {
    await defenderPage.close();
  }
});

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
      await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.exitingAt ?? null), { timeout: 22_000 }).not.toBeNull();
      await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.removedAt ?? null), { timeout: 2_000 }).not.toBeNull();
      const settlementTiming = await targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming);
      expect(settlementTiming.outcome).toBe("ATTACK_BLOCKED_BY_DODGE");
      expect(settlementTiming.exitingAt - settlementTiming.shownAt).toBeGreaterThanOrEqual(19_800);
      expect(settlementTiming.exitingAt - settlementTiming.shownAt).toBeLessThanOrEqual(20_200);
      expect(settlementTiming.removedAt - settlementTiming.exitingAt).toBeGreaterThanOrEqual(100);
      expect(settlementTiming.removedAt - settlementTiming.exitingAt).toBeLessThanOrEqual(250);
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
    const expectedPlacementClearanceOrder = playerCount === 8 && viewport.width === 390 ? [8, 12] : [12, 8];
    const seed = await seedGame(request, playerCount, { targetCard: dodge });
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    await openGame(page, seed, 0, viewport);
    const targetPage = await browser.newPage({ viewport });
    try {
      await openGame(targetPage, seed, 1, viewport);
      const readPileBounds = (participantPage) => participantPage.evaluate(() => {
        const element = document.querySelector(".play-center");
        const table = document.querySelector(".play-table");
        if (!element) throw new Error("Deck/Discard table object is missing");
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const tableBounds = table?.getBoundingClientRect();
        return { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom,
          width: bounds.width, height: bounds.height, display: style.display, visibility: style.visibility,
          opacity: Number.parseFloat(style.opacity), computedTop: Number.parseFloat(style.top), tableHeight: tableBounds?.height ?? null };
      });
      const pileBoundsBeforeAttack = await Promise.all([page, targetPage].map(readPileBounds));
      await playAttackThroughPage(page, "TARGET");
      await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, { timeout: 20_000 }).not.toBeNull();
      const targetRoomView = await roomView(request, seed, 1);
      const rootAction = targetRoomView.presentationSnapshot.rootAction;
      expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", sourceId, targetId });
      await Promise.all([page, targetPage].map((participantPage) => participantPage.evaluate(() => window.__wtkStartAttackVisibleFrameSampling())));
      let actorLayout = await assertAttackGraphOrSafeFallback(page, viewport, `${playerCount}p ${viewport.width}px attacker`);
      await expect.poll(() => targetPage.evaluate(() => Boolean(document.querySelector('[data-root-action-overlay="true"]')
        || document.querySelector('.interaction-stage[data-stage="ATTACK_RESPONSE"]'))), { timeout: 10_000,
        message: "defender DOM receives the server-proven Attack response scene" }).toBe(true);
      await expect(targetPage.locator('[data-root-action-overlay="true"]'),
        "server-proven single-target Attack has a public root overlay container").toHaveCount(1);
      let targetLayout = await assertAttackGraphOrSafeFallback(targetPage, viewport, `${playerCount}p ${viewport.width}px defender`);
      const pileBoundsWithAttack = await Promise.all([page, targetPage].map(readPileBounds));
      const densePhoneAttackReflow = playerCount === 8 && viewport.width === 390;
      if (densePhoneAttackReflow) {
        expect(actorLayout.mode, "the local attacker uses the physical-seat Attack graph at 8p/390").toBe("graph");
        expect(actorLayout.fitStep).toBe("minimum");
        expect(await page.locator('[data-root-action-overlay="true"]').getAttribute("data-root-action-dodge-slot-reserved")).toBe("true");
        expect(targetLayout.mode, "the defender retains the same public graph at 8p/390").toBe("graph");
        for (let index = 0; index < pileBoundsBeforeAttack.length; index += 1) {
          const before = pileBoundsBeforeAttack[index];
          const active = pileBoundsWithAttack[index];
          expect(active.y, `viewer ${index}: Attack reflow moves Deck/Discard upward`).toBeLessThan(before.y);
          expect(active.computedTop, `viewer ${index}: the active 8p/390 reflow applies its 202px top inset`)
            .toBeCloseTo(Math.max(270, Math.min(active.tableHeight * .66, 460)) - 202, 1);
          expect(active.width).toBeCloseTo(before.width, 1);
          expect(active.height).toBeCloseTo(before.height, 1);
          expect(active.display).not.toBe("none");
          expect(active.visibility).toBe("visible");
          expect(active.opacity).toBe(1);
        }
        for (const [role, layout, pile] of [
          ["attacker", actorLayout, pileBoundsWithAttack[0]],
          ["defender", targetLayout, pileBoundsWithAttack[1]],
        ]) {
          const { table, anchors, obstacles } = layout.diagnostics;
          expect(pile.x).toBeGreaterThanOrEqual(table.x);
          expect(pile.y).toBeGreaterThanOrEqual(table.y);
          expect(pile.right).toBeLessThanOrEqual(table.right);
          expect(pile.bottom).toBeLessThanOrEqual(table.bottom);
          const separated = (box) => {
            const right = box.right ?? box.x + box.width;
            const bottom = box.bottom ?? box.y + box.height;
            return pile.right <= box.x || pile.x >= right || pile.bottom <= box.y || pile.y >= bottom;
          };
          expect(separated(layout.root), `${role}: persistent Deck/Discard does not cover the Attack card`).toBe(true);
          for (const anchor of anchors) {
            expect(separated(anchor), `${role}: persistent Deck/Discard does not cover Seat/Dock ${anchor.id}`).toBe(true);
          }
          for (const obstacle of obstacles.filter((candidate) => !candidate.className.includes("play-center"))) {
            expect(separated(obstacle), `${role}: persistent Deck/Discard does not cover ${obstacle.className}`).toBe(true);
          }
        }
        await testInfo.attach("dense-attack-8p-390-pile-reflow.json", {
          body: JSON.stringify({ before: pileBoundsBeforeAttack, active: pileBoundsWithAttack, actorLayout, targetLayout }, null, 2),
          contentType: "application/json",
        });
      }
      actorLayout.fitDiagnostics = await page.evaluate((rootEventId) => window.__wtkAttackFitDiagnostics
        .filter((diagnostic) => diagnostic.rootEventId === rootEventId), rootAction.rootEventId);
      targetLayout.fitDiagnostics = await targetPage.evaluate((rootEventId) => window.__wtkAttackFitDiagnostics
        .filter((diagnostic) => diagnostic.rootEventId === rootEventId), rootAction.rootEventId);
      for (const [role, layout] of [["attacker", actorLayout], ["defender", targetLayout]]) {
        if (layout.mode !== "fallback") continue;
        const fitDiagnostic = layout.fitDiagnostics.at(-1);
        expect(fitDiagnostic, `${playerCount}p ${viewport.width}px ${role}: fallback has a measured fit cause`).toBeTruthy();
        expect(fitDiagnostic.cause).toMatch(/^(missing-table-or-card-rect|missing-or-invalid-player-anchor|table-smaller-than-card-margin|no-attack-root-candidate|no-reserved-dodge-candidate)$/);
        if (fitDiagnostic.cause === "no-attack-root-candidate") {
          expect(fitDiagnostic.candidateCount, `${role}: diagnostic records the attempted path-based candidate set`).toBeGreaterThan(0);
          expect(fitDiagnostic.rootFitCandidateCount, `${role}: no sampled root rectangle clears all measured obstacles`).toBe(0);
          expect(fitDiagnostic.rootRejectedBySeatOrDock + fitDiagnostic.rootRejectedByControl,
            `${role}: all rejected roots are attributed to measured seat/dock or control collisions`).toBeGreaterThan(0);
        }
        if (fitDiagnostic.cause === "no-reserved-dodge-candidate") {
          expect(fitDiagnostic.candidateCount, `${role}: the sampled root search was measured`).toBeGreaterThan(0);
          expect(fitDiagnostic.rootFitWithDodgeSlotCount, `${role}: no root has a proven safe Dodge response slot`).toBe(0);
          const fieldRootFitCount = fitDiagnostic.placementFieldSearch?.passes.reduce((count, pass) => count + pass.connectorClearCount, 0) ?? 0;
          expect(fitDiagnostic.rootFitCandidateCount + fieldRootFitCount,
            `${role}: the diagnostic distinguishes a root-only fit from a complete root/Dodge pair`).toBeGreaterThan(0);
          if (fitDiagnostic.rootFitCandidateCount > 0) {
            expect(fitDiagnostic.rootFitWithoutDodgeSlotCount).toBe(fitDiagnostic.rootFitCandidateCount);
          } else {
            expect(fitDiagnostic.rootFitWithoutDodgeSlotCount).toBe(0);
          }
          expect(fitDiagnostic.placementSearchEligibility).toMatchObject({
            attempted: true, unansweredAttackRoot: true, viewportWidth: viewport.width,
          });
          expect(fitDiagnostic.placementFieldSearch?.passes.map((pass) => pass.clearance)).toEqual(expectedPlacementClearanceOrder);
          expect(fitDiagnostic.placementFieldSearch?.selectedClearance).toBeUndefined();
        }
      }
      const selectedActorFieldFit = actorLayout.fitDiagnostics.find((diagnostic) => diagnostic.cause === "placement-field-root-selected");
      const selectedActorPathFit = actorLayout.fitDiagnostics.find((diagnostic) => diagnostic.cause === "sampled-path-root-selected");
      if (playerCount === 8 && viewport.width === 390) {
        expect(actorLayout.mode, "the 8-player 390px local attacker uses the proven Attack graph").toBe("graph");
        expect(actorLayout.fitStep).toBe("minimum");
        expect(selectedActorFieldFit).toBeTruthy();
        expect(selectedActorFieldFit.placementFieldSearch.sampleStep).toBe(4);
        expect([8, 12]).toContain(selectedActorFieldFit.placementFieldSearch.selectedClearance);
        expect(await page.locator('[data-root-action-overlay="true"]')
          .getAttribute("data-root-action-dodge-slot-reserved")).toBe("true");
      }
      if (actorLayout.mode === "fallback") {
        const exhaustedSearches = actorLayout.fitDiagnostics.filter((diagnostic) => diagnostic.placementSearchEligibility?.attempted);
        expect(new Set(exhaustedSearches.map((diagnostic) => diagnostic.fitStep)))
          .toEqual(new Set(["target", "compact", "minimum"]));
        expect(exhaustedSearches.at(-1)?.cause).toBe("no-reserved-dodge-candidate");
        for (const diagnostic of exhaustedSearches) {
          expect(diagnostic.placementSearchEligibility).toMatchObject({
            attempted: true, unansweredAttackRoot: true, viewportWidth: viewport.width,
          });
          expect(diagnostic.placementFieldSearch?.passes.map((pass) => pass.clearance)).toEqual(expectedPlacementClearanceOrder);
          expect(diagnostic.placementFieldSearch?.selectedClearance).toBeUndefined();
          expect(diagnostic.rootFitWithDodgeSlotCount).toBe(0);
          expect(diagnostic.rootFitCandidateCount + (diagnostic.placementFieldSearch?.passes
            .reduce((count, pass) => count + pass.connectorClearCount, 0) ?? 0)).toBeGreaterThan(0);
        }
      } else {
        expect(actorLayout.mode, `${playerCount}p ${viewport.width}px local attacker uses the proven graph`).toBe("graph");
        expect(selectedActorFieldFit || selectedActorPathFit,
          "the graph records whether its measured placement came from field search or the valid sampled-path candidate set").toBeTruthy();
        const selectedRoot = selectedActorFieldFit
          ? selectedActorFieldFit.placementFieldSearch.selected
          : {
            left: selectedActorPathFit.selectedSampledPathRoot.rootCard.left,
            top: selectedActorPathFit.selectedSampledPathRoot.rootCard.top,
            projection: selectedActorPathFit.selectedSampledPathRoot.projection,
          };
        expect(selectedRoot.projection).toBeGreaterThanOrEqual(.16);
        expect(selectedRoot.projection).toBeLessThanOrEqual(.92);
        expect(Math.abs(selectedRoot.left - (actorLayout.root.x - actorLayout.diagnostics.shell.x))).toBeLessThanOrEqual(1);
        expect(Math.abs(selectedRoot.top - (actorLayout.root.y - actorLayout.diagnostics.shell.y))).toBeLessThanOrEqual(1);
        if (selectedActorFieldFit) {
          expect([8, 12]).toContain(selectedActorFieldFit.placementFieldSearch.selectedClearance);
        } else {
          expect(selectedActorPathFit.selectedSampledPathRoot.candidateCount).toBeGreaterThan(0);
          if (selectedActorPathFit.selectedSampledPathRoot.selection === "sampled-path") {
            expect(selectedActorPathFit.selectedSampledPathRoot.selectedIndex).toBeGreaterThanOrEqual(0);
            expect(selectedActorPathFit.selectedSampledPathRoot.selectedIndex)
              .toBeLessThan(selectedActorPathFit.selectedSampledPathRoot.candidateCount);
          }
        }

        const actorGeometry = await measure(page, sourceId, targetId);
        const causalConnectors = actorGeometry.connectorPoints.filter(({ edge }) => edge === "source" || edge === "target");
        expect(causalConnectors.map(({ edge }) => edge).sort()).toEqual(["source", "target"]);
        for (const connector of causalConnectors) {
          expect(connector.points.length, `${connector.edge} connector is sampled from the rendered SVG`).toBeGreaterThan(1);
          for (const point of connector.points) {
            expect(point.x).toBeGreaterThanOrEqual(actorGeometry.shell.x - 1);
            expect(point.x).toBeLessThanOrEqual(actorGeometry.shell.right + 1);
            expect(point.y).toBeGreaterThanOrEqual(actorGeometry.shell.y - 1);
            expect(point.y).toBeLessThanOrEqual(actorGeometry.shell.bottom + 1);
            for (const anchor of actorGeometry.playerAnchors.filter(({ id }) => id !== sourceId && id !== targetId)) {
              expect(point.x < anchor.x - 2 || point.x > anchor.right + 2 || point.y < anchor.y - 2 || point.y > anchor.bottom + 2,
                `${connector.edge} remains unobscured by unrelated player ${anchor.id}`).toBe(true);
            }
            for (const obstacle of [actorGeometry.playCenter, actorGeometry.systemCluster, actorGeometry.gameMessages, actorGeometry.gameExit].filter(Boolean)) {
              expect(point.x < obstacle.x - 2 || point.x > obstacle.right + 2 || point.y < obstacle.y - 2 || point.y > obstacle.bottom + 2,
                `${connector.edge} remains unobscured by ${obstacle}`).toBe(true);
            }
          }
        }
      }
      await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px.json`, {
        body: JSON.stringify({ actorLayout, targetLayout }, null, 2), contentType: "application/json",
      });
      await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px-attacker.png`, { body: await page.screenshot(), contentType: "image/png" });
      await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px-defender.png`, { body: await targetPage.screenshot(), contentType: "image/png" });

      const attackerDodgeFrameStart = await page.evaluate(() => window.__wtkAttackVisibleFrames.length);
      const defenderDodgeFrameStart = await targetPage.evaluate(() => window.__wtkAttackVisibleFrames.length);
      await Promise.all([
        observeAttackDodgeSettlement(page, sourceId, targetId),
        observeAttackDodgeSettlement(targetPage, sourceId, targetId),
      ]);
      await playDodgeThroughPage(targetPage);
      await expect.poll(async () => (await roomView(request, seed, 2)).presentationSnapshot?.attackDodgeResponses?.length ?? 0, { timeout: 20_000 }).toBe(1);
      const responseProof = (await roomView(request, seed, 2)).presentationSnapshot.attackDodgeResponses[0];
      expect(responseProof).toMatchObject({
        semantics: "PROVEN", counterRelation: "BLOCKS_TARGET_EFFECT",
        rootEventId: rootAction.rootEventId, rootSourceId: rootAction.sourceId,
        targetId, responseActorId: targetId,
        rootCardKind: "Attack", responseCardKind: "Dodge",
      });
      const readDefenderDodgeOutcome = () => targetPage.evaluate(({ start, rootEventId, responseEventId }) => {
        const frames = window.__wtkAttackVisibleFrames.slice(start);
        const responseFrame = frames.find((frame) => frame.responseCardVisible
          && frame.rootEventId === rootEventId && frame.responseEventId === responseEventId);
        if (responseFrame) return { kind: "rendered", responseFrame };
        const fitDiagnostic = window.__wtkAttackFitDiagnostics.filter((diagnostic) => diagnostic.rootEventId === rootEventId
          && diagnostic.phase === "dodge-response").at(-1) ?? null;
        const fallbackFrame = frames.find((frame) => frame.rootEventId === rootEventId
          && frame.mode === "fallback" && frame.layoutState === "unavailable" && frame.fallbackGate === "geometry-unavailable");
        if (fitDiagnostic && fallbackFrame) return { kind: "geometry-unavailable", fallbackFrame, fitDiagnostic };
        return { kind: "pending", latestFrame: frames.at(-1) ?? null, fitDiagnostic };
      }, { start: defenderDodgeFrameStart, rootEventId: rootAction.rootEventId, responseEventId: responseProof.responseEventId });
      const expectedDefenderDodgeOutcome = playerCount === 8 && viewport.width === 390 ? "rendered" : /^(rendered|geometry-unavailable)$/;
      const defenderDodgeOutcomeExpectation = expect.poll(async () => (await readDefenderDodgeOutcome()).kind, {
        timeout: 8_000,
        message: `${playerCount}p ${viewport.width}px defender captures the proven Dodge graph or measured geometry fallback`,
      });
      try {
        if (typeof expectedDefenderDodgeOutcome === "string") {
          await defenderDodgeOutcomeExpectation.toBe(expectedDefenderDodgeOutcome);
        } else {
          await defenderDodgeOutcomeExpectation.toMatch(expectedDefenderDodgeOutcome);
        }
      } catch (error) {
        await testInfo.attach(`dense-attack-dodge-${playerCount}p-${viewport.width}px-defender-outcome-diagnostic.json`, {
          body: JSON.stringify(await readDefenderDodgeOutcome(), null, 2),
          contentType: "application/json",
        });
        throw error;
      }
      const defenderDodgeOutcome = await readDefenderDodgeOutcome();
      const defenderResponseFrame = defenderDodgeOutcome.kind === "rendered" ? defenderDodgeOutcome.responseFrame : null;
      let responseLayout = await captureAttackOverlayDiagnostics(targetPage);
      const defenderInterceptionAtFirstFrame = defenderResponseFrame
        ? await captureAttackDodgeInterceptionGeometry(targetPage)
        : null;
      if (defenderInterceptionAtFirstFrame) await testInfo.attach(`dense-attack-dodge-${playerCount}p-${viewport.width}px-defender-interception.json`, {
        body: JSON.stringify(defenderInterceptionAtFirstFrame, null, 2),
        contentType: "application/json",
      });
      responseLayout.fitDiagnostics = await targetPage.evaluate((rootEventId) => window.__wtkAttackFitDiagnostics
        .filter((diagnostic) => diagnostic.rootEventId === rootEventId), rootAction.rootEventId);
      await testInfo.attach(`dense-attack-dodge-${playerCount}p-${viewport.width}px-defender-first-response.png`, {
        body: await targetPage.screenshot(),
        contentType: "image/png",
      });
      const attackerAndDefenderViews = await Promise.all([0, 1].map(async (playerIndex) => {
        const view = await roomView(request, seed, playerIndex);
        return {
          playerIndex,
          currentActionKind: view.currentAction?.kind ?? null,
          currentActionActorId: view.currentAction?.actorId ?? null,
          rootAction: view.presentationSnapshot?.rootAction ? {
            interactionId: view.presentationSnapshot.rootAction.interactionId,
            rootFrameId: view.presentationSnapshot.rootAction.rootFrameId,
            rootEventId: view.presentationSnapshot.rootAction.rootEventId,
            sourceId: view.presentationSnapshot.rootAction.sourceId,
            targetId: view.presentationSnapshot.rootAction.targetId,
            action: view.presentationSnapshot.rootAction.action,
          } : null,
          attackDodgeResponses: (view.presentationSnapshot?.attackDodgeResponses ?? []).map((proof) => ({
            semantics: proof.semantics,
            counterRelation: proof.counterRelation,
            interactionId: proof.interactionId,
            rootFrameId: proof.rootFrameId,
            rootEventId: proof.rootEventId,
            responseEventId: proof.responseEventId,
            responseActorId: proof.responseActorId,
            rootResolutionId: proof.rootResolutionId,
            responseResolutionId: proof.responseResolutionId,
          })),
          linkedTimelineEvents: view.timeline.filter((event) => [rootAction.rootEventId, responseProof.responseEventId].includes(event.id))
            .map((event) => ({ id: event.id, action: event.action, presentation: event.presentation ?? null, resolutionId: event.resolutionId,
              cardKind: event.type === "card" ? event.card.kind : null, playedAs: event.type === "card" ? event.playedAs ?? null : null })),
        };
      }));
      const responseProofShape = {
        semantics: responseProof.semantics,
        counterRelation: responseProof.counterRelation,
        interactionId: responseProof.interactionId,
        rootFrameId: responseProof.rootFrameId,
        rootEventId: responseProof.rootEventId,
        responseEventId: responseProof.responseEventId,
        responseActorId: responseProof.responseActorId,
        rootResolutionId: responseProof.rootResolutionId,
        responseResolutionId: responseProof.responseResolutionId,
      };
      for (const view of attackerAndDefenderViews) {
        expect(view.attackDodgeResponses, `player ${view.playerIndex} receives the same server-proven public Dodge relation`).toEqual([responseProofShape]);
        expect(view.linkedTimelineEvents.map(({ id, action, resolutionId, cardKind, playedAs }) => ({ id, action, resolutionId, cardKind, playedAs }))).toEqual([
          { id: rootAction.rootEventId, action: "play", resolutionId: responseProof.rootResolutionId, cardKind: "Attack", playedAs: null },
          { id: responseProof.responseEventId, action: "play", resolutionId: responseProof.responseResolutionId, cardKind: "Dodge", playedAs: null },
        ]);
      }
      let actorDodgeOutcome = null;
      if (actorLayout.mode === "graph") {
        const readActorDodgeOutcome = () => page.evaluate(({ start, rootEventId, responseEventId }) => {
          const responseFrame = window.__wtkAttackVisibleFrames.slice(start).find((frame) => frame.responseCardVisible
            && frame.rootEventId === rootEventId && frame.responseEventId === responseEventId);
          if (responseFrame) return { kind: "rendered", responseFrame };
          const overlay = document.querySelector('[data-root-action-overlay="true"]');
          const fitDiagnostic = window.__wtkAttackFitDiagnostics.filter((diagnostic) => diagnostic.rootEventId === rootEventId
            && diagnostic.phase === "dodge-response").at(-1) ?? null;
          const rootCard = overlay?.querySelector('[data-root-action-card="true"]');
          if (overlay?.dataset.rootActionLayoutState === "unavailable"
            && overlay.dataset.rootActionFallbackReason === "geometry-unavailable"
            && fitDiagnostic?.cause === "no-dodge-interception-candidate") {
            return { kind: "geometry-unavailable", overlay: {
              layout: overlay.dataset.rootActionLayoutState,
              mode: overlay.dataset.rootActionDisplayMode,
              fallbackReason: overlay.dataset.rootActionFallbackReason,
            }, rootCardVisible: Boolean(rootCard && getComputedStyle(rootCard).visibility !== "hidden"
              && getComputedStyle(rootCard).display !== "none" && Number(getComputedStyle(rootCard).opacity) > 0),
            edgeCount: overlay.querySelectorAll("[data-root-action-edge]").length, fitDiagnostic };
          }
          return { kind: "pending", overlay: overlay ? {
            layout: overlay.dataset.rootActionLayoutState ?? null,
            mode: overlay.dataset.rootActionDisplayMode ?? null,
            fallbackReason: overlay.dataset.rootActionFallbackReason ?? null,
          } : null, fitDiagnostic, visibilityState: document.visibilityState,
          recentFrames: window.__wtkAttackVisibleFrames.slice(start).slice(-8),
          stageCount: document.querySelectorAll(".interaction-stage").length,
          actionText: document.querySelector(".action-strip")?.innerText ?? null };
        }, { start: attackerDodgeFrameStart, rootEventId: rootAction.rootEventId, responseEventId: responseProof.responseEventId });
        const expectedAttackerDodgeOutcome = playerCount === 8 && viewport.width === 390
          ? "rendered" : viewport.width === 390 ? "geometry-unavailable" : "rendered";
        try {
          await expect.poll(async () => (await readActorDodgeOutcome()).kind, {
            timeout: 8_000,
            message: `${playerCount}p ${viewport.width}px attacker presents the proven Dodge or records exhausted legal geometry`,
          }).toBe(expectedAttackerDodgeOutcome);
        } catch (error) {
          await testInfo.attach(`dense-attack-dodge-${playerCount}p-${viewport.width}px-attacker-pending.json`, {
            body: JSON.stringify({ outcome: await readActorDodgeOutcome(), serverViews: attackerAndDefenderViews }, null, 2),
            contentType: "application/json",
          });
          throw error;
        }
        actorDodgeOutcome = await readActorDodgeOutcome();
        const actorResponseLayout = await captureAttackOverlayDiagnostics(page);
        actorResponseLayout.fitDiagnostics = await page.evaluate((rootEventId) => window.__wtkAttackFitDiagnostics
          .filter((diagnostic) => diagnostic.rootEventId === rootEventId), rootAction.rootEventId);
        actorResponseLayout.dodgeOutcome = actorDodgeOutcome;
        if (actorDodgeOutcome.kind === "rendered" && !actorDodgeOutcome.responseFrame.attackDodgePathVisible) {
          await testInfo.attach(`dense-attack-dodge-${playerCount}p-${viewport.width}px-attacker-missing-interception.json`, {
            body: JSON.stringify({
              outcome: actorDodgeOutcome,
              serverProof: responseProofShape,
              liveDom: await page.evaluate(() => {
                const overlay = document.querySelector('[data-root-action-overlay="true"]');
                const path = overlay?.querySelector('[data-root-action-edge="attack-dodge-interception"]');
                const target = overlay?.querySelector('[data-root-action-edge="target"]');
                const response = overlay?.querySelector('[data-root-action-response-card="true"]');
                return {
                  overlay: overlay ? {
                    ready: overlay.dataset.rootActionReady,
                    mode: overlay.dataset.rootActionDisplayMode,
                    layout: overlay.dataset.rootActionLayoutState,
                    cardKind: overlay.dataset.rootActionCardKind,
                    rootEffectState: overlay.dataset.rootEffectState,
                    settlementEventId: overlay.dataset.rootActionSettlementEventId,
                    responseCount: overlay.dataset.rootActionResponseCount,
                    targetPath: overlay.querySelector('[data-root-action-edge]')?.getAttribute("d") ?? null,
                  } : null,
                  attackInterceptionPath: path?.getAttribute("d") ?? null,
                  ordinaryTargetPath: target?.getAttribute("d") ?? null,
                  response: response ? {
                    eventId: response.dataset.responseEventId,
                    actorId: response.dataset.responseActorId,
                    cardKind: response.dataset.responseCardFaceKind,
                    countersRoot: response.dataset.responseRelation,
                    rect: (() => { const { x, y, width, height } = response.getBoundingClientRect(); return { x, y, width, height }; })(),
                  } : null,
                };
              }),
            }, null, 2),
            contentType: "application/json",
          });
          await testInfo.attach(`dense-attack-dodge-${playerCount}p-${viewport.width}px-attacker-missing-interception.png`, {
            body: await page.screenshot(), contentType: "image/png",
          });
        }
        if (actorDodgeOutcome.kind === "rendered") {
          expect(actorDodgeOutcome.responseFrame).toMatchObject({
            mode: "graph", layoutState: "ready", rootEventId: rootAction.rootEventId,
            rootCardVisible: true,
            responseActorId: targetId, responseCardKind: "Dodge", attackDodgePathVisible: true,
            dodgeSourcePathVisible: true,
          });
          expect(Math.abs(actorDodgeOutcome.responseFrame.rootCardX - actorLayout.root.x)).toBeLessThanOrEqual(1);
          expect(Math.abs(actorDodgeOutcome.responseFrame.rootCardY - actorLayout.root.y)).toBeLessThanOrEqual(1);
          const actorResponseGeometry = actorDodgeOutcome.responseFrame.responseGeometry;
          expect(actorResponseGeometry, "the sampled attacker frame captures exact card, Seat/Dock and control rectangles").toBeTruthy();
          const responseFitStep = actorDodgeOutcome.responseFrame.cardFitStep;
          expect(["target", "compact", "minimum"]).toContain(responseFitStep);
          expect(actorResponseGeometry.root.width).toBeCloseTo(expectedAttackCardFaceSize(viewport, "Attack", responseFitStep).width, 1);
          expect(actorResponseGeometry.root.height).toBeCloseTo(expectedAttackCardFaceSize(viewport, "Attack", responseFitStep).height, 1);
          expect(actorResponseGeometry.response.width).toBeCloseTo(expectedAttackCardFaceSize(viewport, "Dodge", responseFitStep).width, 1);
          expect(actorResponseGeometry.response.height).toBeCloseTo(expectedAttackCardFaceSize(viewport, "Dodge", responseFitStep).height, 1);
          const separatedBy = (left, right, clearance) => left.right + clearance <= right.x
            || right.right + clearance <= left.x || left.bottom + clearance <= right.y || right.bottom + clearance <= left.y;
          const requiredTableInset = playerCount === 8 && viewport.width === 390 ? 12 : 0;
          for (const [name, card] of [["Attack root", actorResponseGeometry.root], ["Dodge", actorResponseGeometry.response]]) {
            expect(card.x, `${name} stays inside the playable table`).toBeGreaterThanOrEqual(actorResponseGeometry.table.x + requiredTableInset);
            expect(card.y, `${name} stays inside the playable table`).toBeGreaterThanOrEqual(actorResponseGeometry.table.y + requiredTableInset);
            expect(card.right, `${name} stays inside the playable table`).toBeLessThanOrEqual(actorResponseGeometry.table.right - requiredTableInset);
            expect(card.bottom, `${name} stays inside the playable table`).toBeLessThanOrEqual(actorResponseGeometry.table.bottom - requiredTableInset);
            for (const anchor of actorResponseGeometry.anchors) {
              const anchorRole = anchor.id === sourceId ? "source" : anchor.id === targetId ? "target" : "other";
              expect(separatedBy(card, anchor.rect, 8), `${name} clears ${anchorRole} Seat/Dock ${anchor.id} by 8px; card=${JSON.stringify(card)} anchor=${JSON.stringify(anchor.rect)}`).toBe(true);
            }
            for (const obstacle of actorResponseGeometry.obstacles) {
              expect(separatedBy(card, obstacle.rect, 8), `${name} clears ${obstacle.label} by 8px`).toBe(true);
            }
          }
          await testInfo.attach(`dense-attack-dodge-${playerCount}p-${viewport.width}px-attacker-response-geometry.json`, {
            body: JSON.stringify(actorResponseGeometry, null, 2),
            contentType: "application/json",
          });
        } else {
          const fitDiagnostic = actorDodgeOutcome.fitDiagnostic;
          expect(actorDodgeOutcome.overlay).toEqual({ layout: "unavailable", mode: "fallback", fallbackReason: "geometry-unavailable" });
          expect(actorDodgeOutcome.rootCardVisible).toBe(false);
          expect(actorDodgeOutcome.edgeCount).toBe(0);
          expect(fitDiagnostic?.cause).toBe("no-dodge-interception-candidate");
          expect(fitDiagnostic.dodgePlacementFieldSearch?.selected).toBeUndefined();
          expect(fitDiagnostic.dodgePlacementFieldSearch?.directPathIntersectionCount).toBe(0);
          expect(fitDiagnostic.dodgePlacementFieldSearch?.adjacentEdgeGapCount).toBe(0);
        }
        await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px-attacker-after-dodge.json`, {
          body: JSON.stringify(actorResponseLayout, null, 2),
          contentType: "application/json",
        });
        await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px-attacker-after-dodge.png`, {
          body: await page.screenshot(),
          contentType: "image/png",
        });
      }
      const [actorSettlement, defenderSettlement] = await Promise.all([
        actorDodgeOutcome?.kind === "rendered"
          ? assertAttackDodgeSettlementCleanup(page, {
            rootAction, responseProof, baselineRoot: actorLayout.root,
            label: `${playerCount}p ${viewport.width}px attacker`,
          })
          : Promise.resolve(null),
        defenderResponseFrame
          ? assertAttackDodgeSettlementCleanup(targetPage, {
            rootAction, responseProof, baselineRoot: targetLayout.root,
            label: `${playerCount}p ${viewport.width}px defender`,
          })
          : Promise.resolve(null),
      ]);
      if (defenderSettlement) {
        const { visual } = defenderSettlement;
        responseLayout = {
          ...responseLayout,
          overlay: {
            ready: visual.overlay.ready,
            mode: visual.overlay.mode,
            layout: visual.overlay.layout,
            fitStep: visual.overlay.cardFitStep,
            fallbackReason: visual.overlay.fallbackReason,
          },
          table: visual.bounds.table,
          shell: visual.bounds.shell,
          rootCard: visual.bounds.root,
          responseCard: visual.bounds.response,
          anchors: visual.bounds.anchors,
          obstacles: visual.bounds.obstacles,
          documentWidth: visual.geometry.documentWidth,
          viewportWidth: visual.geometry.viewportWidth,
        };
      }
      if (responseLayout.overlay?.layout === "ready" && responseLayout.overlay.mode === "graph") {
        expect(defenderDodgeOutcome.kind).toBe("rendered");
        expect(defenderResponseFrame).toMatchObject({
          mode: "graph", layoutState: "ready", rootEventId: rootAction.rootEventId,
          rootCardVisible: true, responseActorId: targetId, responseCardKind: "Dodge",
          attackDodgePathVisible: true, dodgeSourcePathVisible: true,
        });
        expect(Math.abs(defenderResponseFrame.rootCardX - targetLayout.root.x)).toBeLessThanOrEqual(1);
        expect(Math.abs(defenderResponseFrame.rootCardY - targetLayout.root.y)).toBeLessThanOrEqual(1);
      }
      await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px-after-dodge.json`, {
        body: JSON.stringify(responseLayout, null, 2),
        contentType: "application/json",
      });
      await testInfo.attach(`dense-attack-layout-${playerCount}p-${viewport.width}px-after-dodge.png`, {
        body: await targetPage.screenshot(),
        contentType: "image/png",
      });
      if (defenderResponseFrame) {
        expect(targetLayout.mode, "Dodge cannot promote a previously unsupported root to a shifted graph").toBe("graph");
        const visual = defenderSettlement.visual;
        expect(visual.overlay).toMatchObject({ ready: "true", mode: "graph", layout: "ready" });
        expect(visual.root.dataset.rootActionCardFaceKind).toBe("Attack");
        expect(visual.root.faceVisible).toBe(true);
        expect(visual.response.dataset).toMatchObject({
          responseEventId: responseProof.responseEventId,
          responseActorId: targetId,
          responseCardFaceKind: "Dodge",
        });
        expect(visual.response.faceVisible).toBe(true);
        expect(visual.geometry.stageCount).toBe(0);
        expect(visual.geometry.documentWidth).toBeLessThanOrEqual(visual.geometry.viewportWidth);
        const interception = defenderInterceptionAtFirstFrame ?? {
          mode: visual.geometry.interception.mode,
          fraction: visual.geometry.interception.centerFraction,
          lineIntersectsCard: visual.geometry.interception.lineIntersectsCard,
          edgeGap: visual.geometry.interception.nearestPathToCardEdge,
          pathEndpointToMark: visual.geometry.interception.pathEndpointToMarkCenter,
          markerEnd: visual.geometry.edges.find((edge) => edge.edge === "attack-dodge-interception")?.markerEnd ?? null,
          falseCounterArrows: visual.geometry.edges.filter((edge) => edge.edge === "negation-counters-root").length,
        };
        expect(interception.mode).toMatch(/^(direct|adjacent)$/);
        expect(interception.fraction).toBeGreaterThanOrEqual(.35);
        expect(interception.fraction).toBeLessThanOrEqual(.70);
        expect(interception.pathEndpointToMark).toBeLessThanOrEqual(2.1);
        expect(interception.markerEnd).toBeNull();
        expect(interception.falseCounterArrows).toBe(0);
        const fitStep = responseLayout.overlay.fitStep;
        const dodgeBounds = visual.response.rect;
        const expectedDodgeSize = expectedAttackCardFaceSize(viewport, "Dodge", fitStep);
        expect(dodgeBounds.width).toBeCloseTo(expectedDodgeSize.width, 1);
        expect(dodgeBounds.height).toBeCloseTo(expectedDodgeSize.height, 1);
        expect(dodgeBounds.width / dodgeBounds.height).toBeCloseTo(2 / 3, 2);
        const dodgeRight = dodgeBounds.x + dodgeBounds.width;
        const dodgeBottom = dodgeBounds.y + dodgeBounds.height;
        const table = responseLayout.table;
        const targetAnchorTop = Math.max(...responseLayout.anchors.filter((anchor) => anchor.id === targetId).map((anchor) => anchor.y));
        const stableStageBottom = Math.max(table.bottom, targetAnchorTop);
        expect(dodgeBounds.x).toBeGreaterThanOrEqual(table.x + 11);
        expect(dodgeBounds.y).toBeGreaterThanOrEqual(table.y + 11);
        expect(dodgeRight).toBeLessThanOrEqual(table.right - 11);
        expect(dodgeBottom).toBeLessThanOrEqual(stableStageBottom - 11);
        const dodgeObstacles = [...responseLayout.anchors, ...responseLayout.obstacles];
        for (const obstacle of dodgeObstacles) {
          expect(dodgeRight <= obstacle.x - 8 || dodgeBounds.x >= obstacle.right + 8
            || dodgeBottom <= obstacle.y - 8 || dodgeBounds.y >= obstacle.bottom + 8,
          `Dodge card clears ${obstacle.label ?? obstacle.className ?? obstacle.id ?? "stage control"} by 8px`).toBe(true);
        }
        expect(dodgeRight <= responseLayout.rootCard.x - 8 || dodgeBounds.x >= responseLayout.rootCard.right + 8
          || dodgeBottom <= responseLayout.rootCard.y - 8 || dodgeBounds.y >= responseLayout.rootCard.bottom + 8,
        "Dodge card clears the stable Attack root by 8px").toBe(true);
        if (interception.mode === "direct") expect(interception.lineIntersectsCard).toBe(true);
        else {
          expect(interception.lineIntersectsCard).toBe(false);
          expect(interception.edgeGap).toBeGreaterThanOrEqual(12);
          expect(interception.edgeGap).toBeLessThanOrEqual(20);
        }
        expect(responseLayout.rootCard, "the captured Dodge graph includes the Attack root").toBeTruthy();
        expect(Math.abs(responseLayout.rootCard.x - targetLayout.root.x), "dense Attack root keeps its x when Dodge appears").toBeLessThanOrEqual(1);
        expect(Math.abs(responseLayout.rootCard.y - targetLayout.root.y), "dense Attack root keeps its y when Dodge appears").toBeLessThanOrEqual(1);
        const fieldSelection = responseLayout.fitDiagnostics
          .filter((diagnostic) => diagnostic.cause === "placement-field-dodge-selected").at(-1);
        if (fieldSelection) {
          const search = fieldSelection.dodgePlacementFieldSearch;
          expect(search).toMatchObject({
            sampleStep: viewport.width <= 400 ? 1 : 2,
            relationBand: [.05, .95],
            preferredFractionBand: [.35, .70],
          });
          expect(search.selected).toMatchObject({ mode: interception.mode });
          expect(Math.abs(search.selected.projection - interception.fraction)).toBeLessThanOrEqual(.01);
          expect(Math.abs(search.selected.left - (dodgeBounds.x - responseLayout.shell.x))).toBeLessThanOrEqual(1);
          expect(Math.abs(search.selected.top - (dodgeBounds.y - responseLayout.shell.y))).toBeLessThanOrEqual(1);
          expect(search.inspectedPositions).toBe(search.clearRectCount + search.rejectedByRootCard
            + search.rejectedBySeatOrDock + search.rejectedByControl);
          expect(search.directPathIntersectionCount).toBeLessThanOrEqual(search.clearRectCount);
          expect(search.adjacentEdgeGapCount).toBeLessThanOrEqual(search.clearRectCount);
          expect(fitStep).toBe(responseLayout.overlay.fitStep);
        }
      } else {
        expect(defenderDodgeOutcome.kind).toBe("geometry-unavailable");
        expect(defenderDodgeOutcome.fallbackFrame).toMatchObject({
          mode: "fallback", layoutState: "unavailable", fallbackGate: "geometry-unavailable",
          rootCardVisible: false, responseCardVisible: false,
          sourceEdgeVisible: false, targetEdgeVisible: false, attackDodgePathVisible: false,
        });
        expect(defenderDodgeOutcome.fallbackFrame.interactionStageCount).toBeLessThanOrEqual(1);
        const dodgeFitDiagnostic = defenderDodgeOutcome.fitDiagnostic;
        expect(dodgeFitDiagnostic, "safe Dodge fallback records a test-only geometry cause for the same proven root").toBeTruthy();
        expect(dodgeFitDiagnostic.cause).toMatch(/^(missing-table-or-card-rect|missing-or-invalid-player-anchor|missing-dodge-response-card|dodge-interception-point-unavailable|table-smaller-than-card-margin|no-attack-root-candidate|no-dodge-interception-candidate|no-reserved-dodge-candidate|dodge-response-without-stable-root)$/);
        if (dodgeFitDiagnostic.cause === "dodge-response-without-stable-root") {
          expect(dodgeFitDiagnostic.placementIdentity).toMatchObject({
            rememberedRootKey: null,
            hasStableRootForInteraction: false,
          });
          expect(dodgeFitDiagnostic.placementIdentity.currentRootPlacementKey).toEqual(expect.any(String));
        }
        if (playerCount === 6 && viewport.width === 390) {
          if (targetLayout.mode === "graph") {
            expect(dodgeFitDiagnostic.cause, "a stable 6-player 390px root records exhausted Dodge interception candidates").toBe("no-dodge-interception-candidate");
          } else {
            expect(targetLayout.mode).toBe("fallback");
            expect(dodgeFitDiagnostic.cause, "a 6-player 390px response without a measurable defender root fails closed explicitly")
              .toBe("dodge-response-without-stable-root");
          }
        }
        if (dodgeFitDiagnostic.cause === "no-dodge-interception-candidate") {
          expect(dodgeFitDiagnostic.dodgeDirectCandidateCount + dodgeFitDiagnostic.dodgeAdjacentCandidateCount,
            "the actual Dodge was checked against direct and adjacent interception placements").toBeGreaterThan(0);
          expect(dodgeFitDiagnostic.dodgeDirectCandidateCount).toBe(
            dodgeFitDiagnostic.dodgeDirectRejectedBySafeRegion
              + dodgeFitDiagnostic.dodgeDirectRejectedByRootCard
              + dodgeFitDiagnostic.dodgeDirectRejectedBySeatOrDock
              + dodgeFitDiagnostic.dodgeDirectRejectedByControl
              + dodgeFitDiagnostic.dodgeDirectFitCandidateCount,
          );
          expect(dodgeFitDiagnostic.dodgeAdjacentCandidateCount).toBe(
            dodgeFitDiagnostic.dodgeAdjacentRejectedBySafeRegion
              + dodgeFitDiagnostic.dodgeAdjacentRejectedByRootCard
              + dodgeFitDiagnostic.dodgeAdjacentRejectedBySeatOrDock
              + dodgeFitDiagnostic.dodgeAdjacentRejectedByControl
              + dodgeFitDiagnostic.dodgeAdjacentFitCandidateCount,
          );
          expect(dodgeFitDiagnostic.dodgeDirectFitCandidateCount).toBe(
            dodgeFitDiagnostic.dodgeDirectRejectedByProjection + dodgeFitDiagnostic.dodgeDirectRejectedWithoutPathIntersection,
          );
          expect(dodgeFitDiagnostic.dodgeAdjacentFitCandidateCount).toBe(
            dodgeFitDiagnostic.dodgeAdjacentRejectedByProjection
              + dodgeFitDiagnostic.dodgeAdjacentRejectedByPathIntersection
              + dodgeFitDiagnostic.dodgeAdjacentRejectedByEdgeGap,
          );
          const search = dodgeFitDiagnostic.dodgePlacementFieldSearch;
          expect(search, "failed placement also records the exhaustive field search").toBeTruthy();
          expect(search).toMatchObject({
            sampleStep: viewport.width <= 400 ? 1 : 2,
            relationBand: [.05, .95],
            preferredFractionBand: [.35, .70],
          });
          expect(search.inspectedPositions).toBe(search.clearRectCount + search.rejectedByRootCard
            + search.rejectedBySeatOrDock + search.rejectedByControl);
          expect(search.directPathIntersectionCount, "no collision-free full Dodge card intersects the Attack path").toBe(0);
          expect(search.adjacentEdgeGapCount, "no collision-free full Dodge card satisfies the adjacent 12–20px contact band").toBe(0);
          expect(search.selected).toBeUndefined();
        }
      }
      const settlementEvidence = [];
      if (actorSettlement) {
        settlementEvidence.push({
          role: "attacker",
          outcome: "rendered-and-cleaned",
          ...actorSettlement,
        });
      } else {
        settlementEvidence.push({
          role: "attacker",
          outcome: actorDodgeOutcome?.kind ?? actorLayout.mode,
          fitCause: actorDodgeOutcome?.fitDiagnostic?.cause ?? actorLayout.fitDiagnostics.at(-1)?.cause ?? null,
        });
      }
      if (defenderResponseFrame) {
        settlementEvidence.push({
          role: "defender",
          outcome: "rendered-and-cleaned",
          ...defenderSettlement,
        });
      } else {
        settlementEvidence.push({
          role: "defender", outcome: defenderDodgeOutcome.kind,
          fitCause: defenderDodgeOutcome.fitDiagnostic?.cause ?? null,
        });
      }
      const dodgeWindowFrames = await Promise.all([
        page.evaluate((start) => window.__wtkAttackVisibleFrames.slice(start), attackerDodgeFrameStart),
        targetPage.evaluate((start) => window.__wtkAttackVisibleFrames.slice(start), defenderDodgeFrameStart),
      ]);
      const dodgeWindowEvidence = {
        playerCount,
        viewport,
        rootEventId: rootAction.rootEventId,
        responseEventId: responseProof.responseEventId,
        responseProof,
        attackerAndDefenderViews,
        actorDodgeOutcome,
        defenderDodgeOutcome,
        defenderResponseFrame,
        settlementEvidence,
        attacker: {
          initialMode: actorLayout.mode,
          rootBeforeResponse: actorLayout.root,
          frames: dodgeWindowFrames[0],
        },
        defender: {
          initialMode: targetLayout.mode,
          responseMode: responseLayout.overlay?.mode ?? null,
          responseLayout: responseLayout.overlay?.layout ?? null,
          fallbackReason: responseLayout.overlay?.fallbackReason ?? null,
          rootBeforeResponse: targetLayout.root,
          rootAfterResponse: responseLayout.rootCard,
          frames: dodgeWindowFrames[1],
        },
      };
      await testInfo.attach(`dense-attack-dodge-${playerCount}p-${viewport.width}px-window-frames.json`, {
        body: JSON.stringify(dodgeWindowEvidence, null, 2),
        contentType: "application/json",
      });
    } finally {
      await targetPage.close();
    }
  });
}

test("real Attack→Dodge keeps its 20-second public graph without an exit animation under reduced motion", async ({ page, browser, request }) => {
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
    await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.readWindowFrames?.length ?? 0), { timeout: 21_000 }).toBe(3);
    const readWindowFrames = await targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming.readWindowFrames);
    expect(readWindowFrames.map((frame) => frame.scheduledOffsetMs)).toEqual([0, 1000, 19900]);
    for (const frame of readWindowFrames) {
      expect(frame.elapsedMs).toBeGreaterThanOrEqual(frame.scheduledOffsetMs - 100);
      expect(frame.elapsedMs).toBeLessThanOrEqual(frame.scheduledOffsetMs + 200);
      expect(frame).toMatchObject({
        overlayReady: true,
        rootCard: { visible: true, opacity: 1, faceVisible: true, settlementOutcome: "ATTACK_BLOCKED_BY_DODGE" },
        responseCard: { visible: true, opacity: 1, faceVisible: true, cardKind: "Dodge" },
        sourceEdge: expect.objectContaining({ visible: true, opacity: 1 }),
        responseSourceEdge: expect.objectContaining({ visible: true, opacity: 1 }),
        interceptionEdge: expect.objectContaining({ visible: true, opacity: 1 }),
        interceptionMarkVisible: true,
        targetHighlight: expect.objectContaining({ visible: true, state: "blocked" }),
        legacyAttackCount: 0,
      });
    }
    await expect.poll(() => targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.removedAt ?? null), { timeout: 22_000 }).not.toBeNull();
    const timing = await targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming);
    expect(timing.outcome).toBe("ATTACK_BLOCKED_BY_DODGE");
    expect(timing.exitingAt).toBeNull();
    expect(timing.removedAt - timing.shownAt).toBeGreaterThanOrEqual(19_800);
    expect(timing.removedAt - timing.shownAt).toBeLessThanOrEqual(20_200);
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
    && sample.rootAction?.action === "ATTACK" && sample.rootAction?.cardKind === "Attack"
    && sample.rootAction?.physicalCardKind === rootAction.physicalCardKind
    && sample.rootAction?.playedAs === rootAction.playedAs;
}

async function waitForAttackProofPolls(samples, fromIndex, rootAction, count, timeout = 10_000, requestedAfter = null) {
  await expect.poll(() => samples.slice(fromIndex).filter((sample) => attackPollMatches(sample, rootAction)
    && (requestedAfter === null || sample.requestedAt >= requestedAfter)).length, {
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
  const fitDiagnostics = unexpected.length ? await page.evaluate((rootEventId) => window.__wtkAttackFitDiagnostics
    .filter((diagnostic) => diagnostic.rootEventId === rootEventId).slice(-8), rootAction.rootEventId) : [];
  const geometrySnapshot = unexpected.length ? await page.evaluate(() => {
    const rect = (element) => {
      if (!element) return null;
      const bounds = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return { x: bounds.x, y: bounds.y, right: bounds.right, bottom: bounds.bottom,
        width: bounds.width, height: bounds.height, display: style.display,
        visibility: style.visibility, opacity: style.opacity, position: style.position };
    };
    const playCenter = document.querySelector(".play-center");
    const attackDenseLaneSelector = ".game-shell:has(> .interaction-root-overlay[data-root-action-card-kind=\"Attack\"]) .play-table[data-seat-topology=\"side-column\"]:has(> .player-board[data-player-count=\"8\"]) > .play-center";
    const table = document.querySelector(".play-table");
    const centerStyleRules = [...document.styleSheets].flatMap((sheet) => {
      try { return [...sheet.cssRules]; } catch { return []; }
    }).flatMap((rule) => rule.cssRules ? [...rule.cssRules] : [rule])
      .filter((rule) => rule.selectorText?.includes(".play-center") && rule.selectorText?.includes("player-count"))
      .map((rule) => ({ selector: rule.selectorText, top: rule.style?.top ?? null, media: rule.parentRule?.conditionText ?? null }));
    return {
      viewport: { width: innerWidth, height: innerHeight, scrollY },
      shell: rect(document.querySelector(".game-shell")),
      table: { ...rect(table), offsetHeight: table?.offsetHeight ?? null, clientHeight: table?.clientHeight ?? null, computedHeight: table ? getComputedStyle(table).height : null, transform: table ? getComputedStyle(table).transform : null, zoom: table ? getComputedStyle(table).zoom : null },
      playCenterComputedTop: playCenter ? getComputedStyle(playCenter).top : null,
      playCenterOffsetTop: playCenter?.offsetTop ?? null,
      playCenterOffsetParent: playCenter?.offsetParent ? { className: String(playCenter.offsetParent.className), offsetHeight: playCenter.offsetParent.offsetHeight, rect: rect(playCenter.offsetParent) } : null,
      centerStyleRules,
      attackDenseLaneSelectorMatches: document.querySelector(attackDenseLaneSelector) === playCenter,
      rootCard: rect(document.querySelector('[data-root-action-overlay="true"] [data-root-action-card="true"]')),
      anchors: [...document.querySelectorAll("[data-player-anchor]")].map((element) => ({
        id: element.dataset.playerAnchor, rect: rect(element),
      })),
      obstacles: [...document.querySelectorAll(".play-center, .stage-system-cluster, .game-messages, .game-exit")]
        .map((element) => ({ className: String(element.className), rect: rect(element) })),
      localHeroSource: rect(document.querySelector(".local-player-dock .local-hero-card")),
      stageSystemResponseTimerActive: document.querySelector(".stage-system-cluster")?.dataset.responseTimerActive ?? null,
      timer: rect(document.querySelector(".visible-countdown-response")),
      rootFitStep: document.querySelector('[data-root-action-overlay="true"]')?.dataset.rootActionCardFitStep ?? null,
    };
  }) : null;
  expect(unexpected, `${label}: every sampled frame must retain the same proven, visibly connected graph; first unexpected frames: ${JSON.stringify(unexpected.slice(0, 5))}; latest fit diagnostics: ${JSON.stringify(fitDiagnostics)}; failure geometry: ${JSON.stringify(geometrySnapshot)}`).toEqual([]);
  expect(frames.slice(1).every((frame, index) => frame.frameNumber === frames[index].frameNumber + 1), `${label}: no unobserved rAF sample gap`).toBe(true);
  return frames;
}

async function assertAttackFallbackFrames(page, rootAction, startTimeMs, endTimeMs, label) {
  const frames = await page.evaluate(({ start, end }) => window.__wtkAttackVisibleFrames
    .filter((frame) => frame.sampleTimeMs >= start && frame.sampleTimeMs <= end), { start: startTimeMs, end: endTimeMs });
  expect(frames.length, label + ": rAF trace covers the observation interval").toBeGreaterThan(10);
  expect(frames.at(-1).sampleTimeMs - frames[0].sampleTimeMs, label + ": measured frame coverage")
    .toBeGreaterThanOrEqual(endTimeMs - startTimeMs - 50);
  const revealCounts = frames.map((frame) => frame.activeTableRevealCardCount);
  expect(revealCounts.every((count) => count === 0 || count === 1),
    label + ": at most one ordinary Attack reveal is visible").toBe(true);
  const unexpected = frames.filter((frame) => frame.rootEventId !== rootAction.rootEventId
    || frame.interactionId !== rootAction.interactionId
    || frame.rootFrameId !== rootAction.rootFrameId
    || frame.checkpointId !== rootAction.checkpointId
    || frame.presentationRevision !== String(rootAction.presentationRevision)
    || frame.sourceId !== rootAction.sourceId || frame.targetId !== rootAction.targetId
    || frame.rootCardKind !== "Attack" || frame.mode !== "fallback" || frame.layoutState !== "unavailable"
    || frame.fallbackGate !== "geometry-unavailable" || frame.rootCardVisible || !frame.interactionStageVisible
    || frame.localUiMode !== null || frame.activeTableRevealCardCount > 1
    || frame.sourceEdgeVisible || frame.targetEdgeVisible
    || frame.classification !== "geometry-unavailable");
  expect(unexpected.map((frame) => ({
    frameNumber: frame.frameNumber,
    classification: frame.classification,
    mode: frame.mode,
    layoutState: frame.layoutState,
    fallbackGate: frame.fallbackGate,
    activeTableRevealCardCount: frame.activeTableRevealCardCount,
    rootEventId: frame.rootEventId,
    interactionId: frame.interactionId,
  })).slice(0, 5), label + ": every sampled frame stays in explicit geometry-safe fallback").toEqual([]);
  expect(frames.slice(1).every((frame, index) => frame.frameNumber === frames[index].frameNumber + 1),
    label + ": no unobserved rAF sample gap").toBe(true);
  return frames;
}

async function expectAttackPresentationIdentity(page, rootAction, mode, label) {
  const overlay = page.locator('[data-root-action-overlay="true"]');
  await expect(overlay).toHaveAttribute("data-root-action-event-id", rootAction.rootEventId);
  await expect(overlay).toHaveAttribute("data-root-action-interaction-id", rootAction.interactionId);
  await expect(overlay).toHaveAttribute("data-root-action-root-frame-id", rootAction.rootFrameId);
  await expect(overlay).toHaveAttribute("data-root-action-checkpoint-id", rootAction.checkpointId);
  await expect(overlay).toHaveAttribute("data-root-action-presentation-revision", String(rootAction.presentationRevision));
  await expect(overlay).toHaveAttribute("data-root-action-source-id", rootAction.sourceId);
  await expect(overlay).toHaveAttribute("data-root-action-target-id", rootAction.targetId);
  await expect(overlay).toHaveAttribute("data-root-action-card-kind", "Attack");
  await expect(overlay).toHaveAttribute("data-root-action-display-mode", mode);
  if (mode === "graph") {
    await expectAttackGraphIdentity(page, rootAction);
    return;
  }
  await expect(overlay).toHaveAttribute("data-root-action-ready", "false");
  await expect(overlay).toHaveAttribute("data-root-action-layout-state", "unavailable");
  await expect(overlay).toHaveAttribute("data-root-action-fallback-reason", "geometry-unavailable");
  await expect(overlay.locator('[data-root-action-card="true"]')).toBeHidden();
  await expect(overlay.locator("[data-root-action-edge]")).toHaveCount(0);
  await expect(page.locator(".interaction-stage")).toHaveCount(1);
  expect(label.length).toBeGreaterThan(0);
}

async function captureAttackFallbackAnchorStability(page, playerCount, viewport, label) {
  const before = await page.evaluate(() => window.__wtkRootOverlayPreGraphAnchors);
  const after = await captureAttackOverlayDiagnostics(page);
  expect(before, label + ": capture physical seats before graph ownership").toBeTruthy();
  expect(Object.keys(before)).toHaveLength(playerCount);
  expect(after.anchors).toHaveLength(playerCount);
  expect(after.documentWidth).toBeLessThanOrEqual(after.viewportWidth);
  for (const anchor of after.anchors) {
    const baseline = before[anchor.id];
    expect(baseline, label + ": baseline exists for physical player " + anchor.id).toBeTruthy();
    for (const dimension of ["x", "y", "right", "bottom", "width", "height"]) {
      expect(Math.abs(anchor[dimension] - baseline[dimension]), label + ": " + anchor.id + " " + dimension + " stays fixed")
        .toBeLessThanOrEqual(0.5);
    }
  }
  return { playerCount, viewport, before, after };
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

async function captureReconnectAttackGraph(page, rootAction, playerCount, viewport, label) {
  await expectAttackGraphIdentity(page, rootAction);
  await expect.poll(() => page.evaluate(({ rootEventId, interactionId }) => {
    const frame = window.__wtkAttackVisibleFrames.at(-1);
    return frame?.rootEventId === rootEventId && frame?.interactionId === interactionId
      && frame.mode === "graph" && frame.layoutState === "ready"
      && frame.sourceEdgeVisible && frame.targetEdgeVisible && frame.targetMarkerPresent && frame.svgVisible
      && frame.sourceAnchorResidual <= 2.1 && frame.targetAnchorResidual <= 2.1;
  }, { rootEventId: rootAction.rootEventId, interactionId: rootAction.interactionId }), {
    timeout: 20_000,
    message: `${label}: a sampled frame confirms both connectors reach the same proven source/root/target anchors`,
  }).toBe(true);

  const frame = await page.evaluate(() => window.__wtkAttackVisibleFrames.at(-1));
  const geometry = await captureAttackGraphGeometry(page, rootAction.sourceId, rootAction.targetId, playerCount, viewport, label);
  expect(geometry.after.stageCount, `${label}: graph does not duplicate the legacy Interaction Stage`).toBe(0);
  expect(geometry.after.documentWidth, `${label}: no horizontal overflow`).toBeLessThanOrEqual(viewport.width);
  return { frame, geometry };
}

function expectReconnectGeometryStable(before, after, label) {
  const priorAnchors = new Map(before.geometry.after.playerAnchors.map((anchor) => [anchor.id, anchor]));
  expect(after.geometry.after.playerAnchors).toHaveLength(priorAnchors.size);
  for (const anchor of after.geometry.after.playerAnchors) {
    const prior = priorAnchors.get(anchor.id);
    expect(prior, `${label}: existing physical Seat/Dock ${anchor.id} is present before and after reload`).toBeTruthy();
    for (const dimension of ["x", "y", "right", "bottom", "width", "height"]) {
      expect(Math.abs(anchor[dimension] - prior[dimension]), `${label}: ${anchor.id} ${dimension} is stable across reload`)
        .toBeLessThanOrEqual(1);
    }
  }
  for (const dimension of ["x", "y", "right", "bottom", "width", "height"]) {
    expect(Math.abs(after.geometry.after.card[dimension] - before.geometry.after.card[dimension]),
      `${label}: the same Attack card ${dimension} is stable across reload`).toBeLessThanOrEqual(1);
  }
}

test("a real third-party viewer sees the same public Attack graph without the defender's private Dodge controls", async ({ browser, request }, testInfo) => {
  test.setTimeout(75_000);
  const viewport = { width: 390, height: 844 };
  const seed = await seedGame(request, 4, { targetCard: dodge });
  const sourceId = seed.players[0].id;
  const targetId = seed.players[1].id;
  const attackerPage = await browser.newPage({ viewport });
  const defenderPage = await browser.newPage({ viewport });
  const observerPage = await browser.newPage({ viewport });
  const pollSets = [attackerPage, defenderPage, observerPage].map((page) => observePublicAttackProofPolls(page));
  try {
    await Promise.all([
      openGame(attackerPage, seed, 0, viewport),
      openGame(defenderPage, seed, 1, viewport),
      openGame(observerPage, seed, 2, viewport),
    ]);
    await Promise.all([attackerPage, defenderPage, observerPage].map((page) =>
      page.evaluate(() => window.__wtkStartAttackVisibleFrameSampling())));
    await playAttackThroughPage(attackerPage, "TARGET");

    await expect.poll(async () => (await roomView(request, seed, 2)).presentationSnapshot?.rootAction?.rootEventId ?? null, {
      timeout: 20_000,
      message: "the non-participant's server projection receives the public Attack root",
    }).not.toBeNull();
    const [attackerView, defenderView, observerView] = await Promise.all([
      roomView(request, seed, 0), roomView(request, seed, 1), roomView(request, seed, 2),
    ]);
    const rootAction = observerView.presentationSnapshot.rootAction;
    expect(rootAction).toMatchObject({
      semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", sourceId, targetId,
    });
    expect(attackerView.presentationSnapshot.rootAction).toEqual(rootAction);
    expect(defenderView.presentationSnapshot.rootAction).toEqual(rootAction);
    expect(defenderView.currentAction).toMatchObject({ kind: "response", actorId: targetId });
    expect(observerView.currentAction?.targetCardSelection).toBeUndefined();
    expect(JSON.stringify(observerView.currentAction ?? {})).not.toContain(dodge.id);
    expect(observerView.currentAction?.legalActions ?? []).not.toContain("respond");
    await expect(observerPage.locator('.local-player-dock [data-action-slot="primary"] button')).toHaveCount(0);
    await expect(observerPage.locator('.local-player-dock [data-action-slot="decline"] button')).toHaveCount(0);
    await expect(observerPage.locator(".local-player-dock .card-slot.selected")).toHaveCount(0);

    await Promise.all([attackerPage, defenderPage, observerPage].map((page) => expectAttackGraphIdentity(page, rootAction)));
    const identityByViewer = await Promise.all([attackerPage, defenderPage, observerPage].map((page) =>
      page.locator('[data-root-action-overlay="true"]').evaluate((overlay) => ({
        eventId: overlay.dataset.rootActionEventId,
        interactionId: overlay.dataset.rootActionInteractionId,
        frameId: overlay.dataset.rootActionRootFrameId,
        sourceId: overlay.dataset.rootActionSourceId,
        targetId: overlay.dataset.rootActionTargetId,
        displayMode: overlay.dataset.rootActionDisplayMode,
      }))));
    expect(identityByViewer).toEqual([attackerPage, defenderPage, observerPage].map(() => ({
      eventId: rootAction.rootEventId,
      interactionId: rootAction.interactionId,
      frameId: rootAction.rootFrameId,
      sourceId,
      targetId,
      displayMode: "graph",
    })));

    for (const [index, [page, polls]] of [
      [attackerPage, pollSets[0]],
      [defenderPage, pollSets[1]],
      [observerPage, pollSets[2]],
    ].entries()) {
      await waitForAttackProofPolls(polls, 0, rootAction, 1, 20_000);
      await expect.poll(() => page.evaluate((rootEventId) => window.__wtkAttackVisibleFrames
        .filter((frame) => frame.rootEventId === rootEventId && frame.classification === "graph-visible").length,
      rootAction.rootEventId), {
        timeout: 8_000,
        message: `viewer ${index} samples the same public Attack graph in rendered animation frames`,
      }).toBeGreaterThan(5);
      const geometry = await captureAttackGraphGeometry(page, sourceId, targetId, 4, viewport, `viewer ${index} public Attack graph`);
      await testInfo.attach(`attack-observer-view-${index}.png`, { body: await page.screenshot(), contentType: "image/png" });
      await testInfo.attach(`attack-observer-view-${index}-geometry.json`, {
        body: JSON.stringify({ rootAction, geometry }, null, 2), contentType: "application/json",
      });
    }
  } finally {
    await Promise.all([attackerPage.close(), defenderPage.close(), observerPage.close()]);
  }
});

test("a new authoritative Attack root preempts the unexpired Dodge read graph without delaying play", async ({ browser, request }, testInfo) => {
  test.setTimeout(75_000);
  const viewport = { width: 390, height: 844 };
  const firstAttack = { ...attack, id: `attack-preempt-first-${Date.now()}` };
  const nextAttack = { ...attack, id: `attack-preempt-next-${Date.now()}` };
  const firstDodge = { ...dodge, id: `dodge-preempt-first-${Date.now()}` };
  const nextDodge = { ...dodge, id: `dodge-preempt-next-${Date.now()}` };
  const seed = await seedGame(request, 4, {
    sourceHero: "zhang-fei",
    sourceCards: [firstAttack, nextAttack],
    targetCards: [firstDodge, nextDodge],
  });
  const sourceId = seed.players[0].id;
  const targetId = seed.players[1].id;
  const sourcePage = await browser.newPage({ viewport });
  const targetPage = await browser.newPage({ viewport });
  try {
    await Promise.all([
      openGame(sourcePage, seed, 0, viewport),
      openGame(targetPage, seed, 1, viewport),
    ]);
    await playAttackThroughPage(sourcePage, "TARGET", firstAttack);
    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, {
      timeout: 20_000, message: "first real Attack root is committed before the public Dodge hold",
    }).not.toBeNull();
    const firstRoot = (await roomView(request, seed, 1)).presentationSnapshot.rootAction;
    expect(firstRoot).toMatchObject({ semantics: "PROVEN", action: "ATTACK", sourceId, targetId });
    await expect.poll(async () => {
      const view = await roomView(request, seed, 1);
      return view.currentAction?.kind === "response" && view.currentAction.actorId === targetId
        && view.currentAction.legalActions?.includes("respond");
    }, { timeout: 20_000, message: "the first Dodge is an authoritative, ready response decision" }).toBe(true);
    await expect(targetPage.locator(`[data-hand-card-id="${firstDodge.id}"] .game-card`)).toBeEnabled({ timeout: 20_000 });
    await observeAttackDodgeSettlement(targetPage, sourceId, targetId);
    const dodgeGraphReady = expect.poll(() => targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming?.outcome ?? null), {
      timeout: 10_000, message: "the actual browser Dodge creates the old root's public read graph",
    }).toBe("ATTACK_BLOCKED_BY_DODGE");
    const sourceTurnReady = expect.poll(async () => {
      const view = await roomView(request, seed, 0);
      return view.isMyTurn && view.currentAction?.actorId === sourceId
        && view.currentAction?.legalActions?.includes("play_card") === true;
    }, { timeout: 15_000, message: "Zhang Fei can immediately start another legal Attack while the previous graph is within its read window" }).toBe(true);
    const nextAttackReady = expect(sourcePage.locator(`[data-hand-card-id="${nextAttack.id}"] .game-card`))
      .toBeEnabled({ timeout: 15_000 });
    await playDodgeThroughPage(targetPage, firstDodge);
    await Promise.all([dodgeGraphReady, sourceTurnReady, nextAttackReady]);
    const firstGraphShownAt = await targetPage.evaluate(() => window.__wtkAttackDodgeSettlementTiming.shownAt);
    expect(firstGraphShownAt).not.toBeNull();

    const nextAttackResponse = await request.post(`${API}/api/rooms`, {
      data: { action: "play_card", cardId: nextAttack.id, targetId, code: seed.code, token: seed.players[0].token },
    });
    if (!nextAttackResponse.ok()) throw new Error(`Second independent Attack failed (${nextAttackResponse.status()}): ${await nextAttackResponse.text()}`);
    await expect.poll(async () => {
      const view = await roomView(request, seed, 1);
      const nextRoot = view.presentationSnapshot?.rootAction;
      return nextRoot?.rootEventId !== firstRoot.rootEventId
        && nextRoot?.action === "ATTACK" && nextRoot?.cardKind === "Attack"
        && nextRoot?.sourceId === sourceId && nextRoot?.targetId === targetId
        ? nextRoot : null;
    }, { timeout: 20_000, message: "the new play_card creates an independent public Attack root before the first 3-second read window expires" }).not.toBeNull();
    const nextRoot = (await roomView(request, seed, 1)).presentationSnapshot.rootAction;
    expect(nextRoot.rootEventId).not.toBe(firstRoot.rootEventId);
    expect(nextRoot).toMatchObject({ semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", sourceId, targetId });
    await expect.poll(() => targetPage.locator('[data-root-action-overlay="true"]').getAttribute("data-root-action-event-id"), {
      timeout: 2_500,
      message: "the viewer reading the committed Dodge graph immediately observes the superseding Attack root",
    }).toBe(nextRoot.rootEventId);
    await expectAttackGraphIdentity(targetPage, nextRoot);
    const newRootVisibleAt = await targetPage.evaluate((rootEventId) => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      return overlay?.getAttribute("data-root-action-event-id") === rootEventId ? performance.now() : null;
    }, nextRoot.rootEventId);
    expect(newRootVisibleAt).not.toBeNull();
    expect(newRootVisibleAt - firstGraphShownAt).toBeLessThan(3_000);
    await expect(targetPage.locator('[data-root-action-response-card="true"]')).toHaveCount(0);
    await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-event-id", nextRoot.rootEventId);
    await expect.poll(async () => (await roomView(request, seed, 0)).currentAction?.kind ?? null, {
      timeout: 15_000, message: "the new Attack's real Dodge decision is active immediately rather than waiting for visual cleanup",
    }).toBe("response");
    await testInfo.attach("attack-dodge-new-root-preempts-old-read.png", { body: await targetPage.screenshot(), contentType: "image/png" });
    await testInfo.attach("attack-dodge-new-root-preempts-old-read.json", {
      body: JSON.stringify({ firstRoot, nextRoot, firstGraphShownAt, newRootVisibleAt,
        elapsedMs: newRootVisibleAt - firstGraphShownAt,
        sourceAction: (await roomView(request, seed, 0)).currentAction,
        targetAction: (await roomView(request, seed, 1)).currentAction }, null, 2),
      contentType: "application/json",
    });
  } finally {
    await Promise.all([sourcePage.close(), targetPage.close()]);
  }
});

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

test("real Attack reconnect restores the same proven graph and fails closed without root proof", async ({ browser, request }, testInfo) => {
  test.setTimeout(120_000);
  const viewport = { width: 390, height: 844 };
  const sourceCard = { ...attack, id: `attack-reconnect-${Date.now()}` };
  const targetCard = { ...dodge, id: `dodge-reconnect-${Date.now()}` };
  const seed = await seedGame(request, 4, { sourceCard, targetCard });
  const sourceId = seed.players[0].id;
  const targetId = seed.players[1].id;
  const attackerPage = await browser.newPage({ viewport });
  const defenderPage = await browser.newPage({ viewport });
  const attackerPolls = observePublicAttackProofPolls(attackerPage);
  const defenderPolls = observePublicAttackProofPolls(defenderPage);

  try {
    await Promise.all([
      openGame(attackerPage, seed, 0, viewport),
      openGame(defenderPage, seed, 1, viewport),
    ]);
    await playAttackThroughPage(attackerPage, "TARGET", sourceCard);
    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, {
      timeout: 20_000,
      message: "real play_card creates an authoritative Attack root before reconnect",
    }).not.toBeNull();

    const openView = await roomView(request, seed, 1);
    const rootAction = openView.presentationSnapshot.rootAction;
    expect(openView.currentAction).toMatchObject({ kind: "response", actorId: targetId });
    expect(rootAction).toMatchObject({
      semantics: "PROVEN", action: "ATTACK", cardKind: "Attack", physicalCardKind: "Attack",
      sourceId, targetId,
    });
    expect(openView.timeline.some((event) => event.id === rootAction.rootEventId
      && event.action === "play" && event.card?.kind === "Attack")).toBe(true);
    expect(JSON.stringify(rootAction)).not.toContain(sourceCard.id);

    const pages = [attackerPage, defenderPage];
    await Promise.all(pages.map((page) => page.evaluate(() => window.__wtkStartAttackVisibleFrameSampling())));
    await Promise.all(pages.map((page) => expectAttackGraphIdentity(page, rootAction)));
    const beforeReload = await Promise.all(pages.map((page, index) => captureReconnectAttackGraph(
      page, rootAction, 4, viewport, index === 0 ? "attacker before reload" : "defender before reload",
    )));
    for (const [index, page] of pages.entries()) {
      await testInfo.attach(`attack-reconnect-${index === 0 ? "attacker" : "defender"}-before.png`, {
        body: await page.screenshot(), contentType: "image/png",
      });
    }

    await Promise.all(pages.map((page) => page.reload({ waitUntil: "domcontentloaded" })));
    await Promise.all(pages.map((page) => expect(page.locator(".game-shell")).toBeVisible()));
    await Promise.all(pages.map((page) => page.evaluate(() => window.__wtkStartAttackVisibleFrameSampling())));
    await Promise.all(pages.map((page) => expectAttackGraphIdentity(page, rootAction)));
    const afterReload = await Promise.all(pages.map((page, index) => captureReconnectAttackGraph(
      page, rootAction, 4, viewport, index === 0 ? "attacker after reload" : "defender after reload",
    )));
    for (const [index, page] of pages.entries()) {
      expectReconnectGeometryStable(beforeReload[index], afterReload[index], `${index === 0 ? "attacker" : "defender"} reconnect`);
      await testInfo.attach(`attack-reconnect-${index === 0 ? "attacker" : "defender"}-after.png`, {
        body: await page.screenshot(), contentType: "image/png",
      });
    }
    expect(afterReload.map(({ frame }) => ({
      rootEventId: frame.rootEventId,
      interactionId: frame.interactionId,
      sourceAnchorResidual: frame.sourceAnchorResidual,
      targetAnchorResidual: frame.targetAnchorResidual,
      sourceEdgeVisible: frame.sourceEdgeVisible,
      targetEdgeVisible: frame.targetEdgeVisible,
      targetMarkerPresent: frame.targetMarkerPresent,
    }))).toEqual(pages.map(() => ({
      rootEventId: rootAction.rootEventId,
      interactionId: rootAction.interactionId,
      sourceAnchorResidual: expect.any(Number),
      targetAnchorResidual: expect.any(Number),
      sourceEdgeVisible: true,
      targetEdgeVisible: true,
      targetMarkerPresent: true,
    })));

    const roomViewMatcher = (url) => url.origin === API && url.pathname === "/api/rooms";
    const strippedViews = [];
    const stripRootProof = async (route) => {
      if (route.request().method() !== "GET") return route.continue();
      const response = await route.fetch();
      const view = await response.json();
      if (view.presentationSnapshot?.rootAction?.rootEventId !== rootAction.rootEventId) {
        return route.fulfill({ response });
      }
      const presentationSnapshot = { ...view.presentationSnapshot };
      delete presentationSnapshot.rootAction;
      strippedViews.push({
        phase: view.phase,
        currentAction: view.currentAction,
        rootActionPresent: Object.hasOwn(presentationSnapshot, "rootAction"),
      });
      await route.fulfill({ response, json: { ...view, presentationSnapshot } });
    };
    await defenderPage.route(roomViewMatcher, stripRootProof);
    await expect.poll(() => strippedViews.length, {
      timeout: 25_000,
      message: "test transport withholds only the public root proof while the server response decision remains live",
    }).toBeGreaterThan(0);
    await expect(defenderPage.locator('[data-root-action-overlay="true"]')).toHaveCount(0, { timeout: 25_000 });
    await expect(defenderPage.locator(".interaction-root-connectors")).toHaveCount(0);
    await expect(defenderPage.locator('[data-root-action-card="true"]')).toHaveCount(0);
    await expect(defenderPage.locator(".interaction-stage")).toHaveCount(1);
    expect(strippedViews.some(({ currentAction, rootActionPresent }) => currentAction?.kind === "response"
      && currentAction.actorId === targetId && rootActionPresent === false)).toBe(true);
    const serverProofRemains = await roomView(request, seed, 1);
    expect(serverProofRemains.currentAction).toMatchObject({ kind: "response", actorId: targetId });
    expect(serverProofRemains.presentationSnapshot.rootAction.rootEventId).toBe(rootAction.rootEventId);
    await testInfo.attach("attack-reconnect-missing-proof-fails-closed.png", {
      body: await defenderPage.screenshot(), contentType: "image/png",
    });

    await defenderPage.unroute(roomViewMatcher, stripRootProof);
    await expectAttackGraphIdentity(defenderPage, rootAction);
    await defenderPage.evaluate(() => window.__wtkStartAttackVisibleFrameSampling());
    const proofRestored = await captureReconnectAttackGraph(defenderPage, rootAction, 4, viewport, "defender proof restored");
    expectReconnectGeometryStable(afterReload[1], proofRestored, "defender proof recovery");
    await testInfo.attach("attack-reconnect-same-root-restored.png", {
      body: await defenderPage.screenshot(), contentType: "image/png",
    });

    const skip = defenderPage.locator(`.local-player-dock[data-player-anchor="${targetId}"] [data-action-slot="decline"] button`);
    await expect(skip).toHaveText("Skip");
    await expect(skip).toBeEnabled();
    const skipResponse = defenderPage.waitForResponse((response) => {
      if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
      try { return JSON.parse(response.request().postData() ?? "{}").action === "decline_response"; }
      catch { return false; }
    });
    await skip.click();
    const decisionResponse = await skipResponse;
    if (!decisionResponse.ok()) throw new Error(`Real Attack Skip failed (${decisionResponse.status()}): ${await decisionResponse.text()}`);

    await expect.poll(async () => {
      const views = await Promise.all([roomView(request, seed, 0), roomView(request, seed, 1)]);
      return views.every((view) => view.presentationSnapshot?.rootAction?.rootEventId !== rootAction.rootEventId);
    }, { timeout: 20_000, message: "server decision advances and retires the original Attack root" }).toBe(true);
    const pollStarts = [attackerPolls.length, defenderPolls.length];
    await Promise.all(pages.map((page) => page.reload({ waitUntil: "domcontentloaded" })));
    await Promise.all(pages.map((page) => expect(page.locator(".game-shell")).toBeVisible()));
    await Promise.all(pages.map((page, index) => expect.poll(() => {
      const samples = (index === 0 ? attackerPolls : defenderPolls).slice(pollStarts[index]);
      return samples.some((sample) => sample.rootAction === null && sample.currentActionKind !== "response");
    }, {
      timeout: 25_000,
      message: `${index === 0 ? "attacker" : "defender"} reconnect receives the advanced server state without the old root`,
    }).toBe(true)));
    await Promise.all(pages.map((page) => expect(page.locator('[data-root-action-overlay="true"]')).toHaveCount(0)));
    await Promise.all(pages.map((page) => expect(page.locator(".interaction-root-connectors")).toHaveCount(0)));
    expect(attackerPolls.slice(pollStarts[0]).some((sample) => sample.rootAction?.rootEventId === rootAction.rootEventId)).toBe(false);
    expect(defenderPolls.slice(pollStarts[1]).some((sample) => sample.rootAction?.rootEventId === rootAction.rootEventId)).toBe(false);

    await testInfo.attach("attack-reconnect-lifecycle.json", {
      body: JSON.stringify({
        rootAction,
        beforeReload,
        afterReload,
        strippedViews,
        proofRestored,
        settledPolls: {
          attacker: attackerPolls.slice(pollStarts[0]),
          defender: defenderPolls.slice(pollStarts[1]),
        },
      }, null, 2),
      contentType: "application/json",
    });
  } finally {
    await Promise.all([attackerPage.close(), defenderPage.close()]);
  }
});

test("real 6/8-player mobile Attack presentation stays stable for attacker and defender", async ({ browser, request }, testInfo) => {
  test.setTimeout(240_000);
  const scenarios = [
    { playerCount: 6, viewport: { width: 390, height: 844 } },
    { playerCount: 6, viewport: { width: 480, height: 900 } },
    { playerCount: 8, viewport: { width: 390, height: 844 } },
    { playerCount: 8, viewport: { width: 480, height: 900 } },
  ];
  const rootEventIds = new Set();
  const frameEvidence = [];
  const pollEvidence = [];
  const geometryEvidence = [];

  for (const [index, scenario] of scenarios.entries()) {
    const playerCount = scenario.playerCount;
    const viewport = scenario.viewport;
    const sourceCard = { ...attack, id: "attack-dense-continuity-" + index };
    const targetCard = { ...dodge, id: "dodge-dense-continuity-" + index };
    const seed = await seedGame(request, playerCount, { sourceCard, targetCard });
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    const attackerPage = await browser.newPage({ viewport });
    const defenderPage = await browser.newPage({ viewport });
    const attackerPolls = observePublicAttackProofPolls(attackerPage);
    const defenderPolls = observePublicAttackProofPolls(defenderPage);
    const label = playerCount + " players / " + viewport.width + "x" + viewport.height;
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
      await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, {
        timeout: 20_000,
        message: label + ": server creates the public Attack root",
      }).not.toBeNull();
      const targetView = await roomView(request, seed, 1);
      const rootAction = targetView.presentationSnapshot.rootAction;
      expect(targetView.currentAction.kind).toBe("response");
      expect(rootAction).toMatchObject({
        semantics: "PROVEN", action: "ATTACK", cardKind: "Attack",
        physicalCardKind: "Attack", sourceId, targetId,
      });
      expect(targetView.timeline.some((event) => event.id === rootAction.rootEventId
        && event.action === "play" && event.card?.kind === "Attack")).toBe(true);
      expect(JSON.stringify(rootAction)).not.toContain(sourceCard.id);
      expect(rootEventIds.has(rootAction.rootEventId), "independent seeded windows have distinct server root events").toBe(false);
      rootEventIds.add(rootAction.rootEventId);

      await Promise.all([
        [attackerPage, "attacker"], [defenderPage, "defender"],
      ].map(([page, role]) => expect.poll(() => page.locator('[data-root-action-overlay="true"]').getAttribute("data-root-action-layout-state"), {
        timeout: 20_000,
        message: label + " " + role + ": wait for the room poll to deliver the proven root and layout measurement",
      }).toMatch(/^(ready|unavailable)$/)));
      const layouts = await Promise.all([
        assertAttackGraphOrSafeFallback(attackerPage, viewport, label + " attacker"),
        assertAttackGraphOrSafeFallback(defenderPage, viewport, label + " defender"),
      ]);
      const roles = [
        { role: "attacker", page: attackerPage, polls: attackerPolls, layout: layouts[0] },
        { role: "defender", page: defenderPage, polls: defenderPolls, layout: layouts[1] },
      ];
      for (const entry of roles) {
        await expectAttackPresentationIdentity(entry.page, rootAction, entry.layout.mode, label + " " + entry.role);
      }

      const pollStarts = roles.map((entry) => entry.polls.length);
      const observationStartedAt = Date.now();
      const observations = await Promise.all(roles.map(async (entry) => ({
        entry,
        start: await entry.page.evaluate(() => performance.now()),
      })));
      await Promise.all(observations.map(({ entry, start }) => expect.poll(() => entry.page.evaluate(({ startTime, rootEventId }) =>
        window.__wtkAttackVisibleFrames.some((frame) => frame.sampleTimeMs >= startTime + 12_000
          && frame.rootEventId === rootEventId),
      { startTime: start, rootEventId: rootAction.rootEventId }), {
        timeout: 25_000,
        message: label + " " + entry.role + ": collect at least 12 seconds of real RAF samples",
      }).toBe(true)));
      if (playerCount === 8 && viewport.width === 390) {
        await expect(defenderPage.locator(".stage-system-cluster")).toHaveAttribute("data-public-response-timer-pending", "true");
        await expect(defenderPage.locator(".visible-countdown-response")).toBeVisible();
        await testInfo.attach("dense-attack-8p-390-public-timer.png", {
          body: await defenderPage.screenshot(), contentType: "image/png",
        });
      }
      await Promise.all(roles.map((entry, index) => waitForAttackProofPolls(
        entry.polls, pollStarts[index], rootAction, 5, 25_000,
      )));
      const observationEndedAt = Date.now();
      const ends = await Promise.all(roles.map((entry) => entry.page.evaluate(() => performance.now())));

      for (const [index, entry] of roles.entries()) {
        const start = observations[index].start;
        const end = ends[index];
        expect(end - start, label + " " + entry.role + ": observation spans 12 seconds").toBeGreaterThanOrEqual(12_000);
        const frames = entry.layout.mode === "graph"
          ? await assertContinuousAttackGraphFrames(entry.page, rootAction, start, end, label + " " + entry.role)
          : await assertAttackFallbackFrames(entry.page, rootAction, start, end, label + " " + entry.role);
        const matchingPolls = entry.polls.slice(pollStarts[index]).filter((sample) =>
          sample.observedAt >= observationStartedAt && sample.observedAt <= observationEndedAt);
        expect(matchingPolls.length, label + " " + entry.role + ": repeated room projection polls were observed").toBeGreaterThanOrEqual(5);
        expect(matchingPolls.every((sample) => attackPollMatches(sample, rootAction)),
          label + " " + entry.role + ": every observed response poll retained the same authoritative root").toBe(true);
        expect(matchingPolls.at(-1).observedAt - matchingPolls[0].observedAt,
          label + " " + entry.role + ": matching polls span the observation window").toBeGreaterThanOrEqual(9_000);

        const geometry = entry.layout.mode === "graph"
          ? await captureAttackGraphGeometry(entry.page, sourceId, targetId, playerCount, viewport, label + " " + entry.role)
          : await captureAttackFallbackAnchorStability(entry.page, playerCount, viewport, label + " " + entry.role);
        const fitDiagnostics = await entry.page.evaluate((rootEventId) => window.__wtkAttackFitDiagnostics
          .filter((diagnostic) => diagnostic.rootEventId === rootEventId), rootAction.rootEventId);
        const latestFitDiagnostic = fitDiagnostics.at(-1);
        if (latestFitDiagnostic?.cause === "no-reserved-dodge-candidate") {
          expect(latestFitDiagnostic.rootFitCandidateCount, label + " " + entry.role + ": Attack has a collision-free root placement").toBeGreaterThan(0);
          expect(latestFitDiagnostic.rootFitWithDodgeSlotCount, label + " " + entry.role + ": the only missing fit is an optional future Dodge reservation").toBe(0);
          expect(entry.layout.mode, label + " " + entry.role + ": missing future Dodge slot does not hide the ready Attack graph").toBe("graph");
        }
        if (entry.layout.mode === "fallback") {
          expect(fitDiagnostics.length, label + " " + entry.role + ": test-only layout fit diagnostics identify the geometry failure").toBeGreaterThan(0);
          expect(latestFitDiagnostic.cause).toMatch(/^(missing-table-or-card-rect|missing-or-invalid-player-anchor|table-smaller-than-card-margin|no-attack-root-candidate)$/);
        }
        frameEvidence.push({ label, role: entry.role, mode: entry.layout.mode, rootAction, frames });
        geometryEvidence.push({ label, role: entry.role, mode: entry.layout.mode, geometry, fitDiagnostics });
        pollEvidence.push({ label, role: entry.role, polls: matchingPolls });
        await testInfo.attach("dense-attack-" + index + "-" + entry.role + "-layout.json", {
          body: Buffer.from(JSON.stringify({ layout: entry.layout, rootAction, fitDiagnostics }, null, 2)),
          contentType: "application/json",
        });
        await testInfo.attach("dense-attack-" + index + "-" + entry.role + "-frames.json", {
          body: Buffer.from(JSON.stringify(frames, null, 2)),
          contentType: "application/json",
        });
        if (entry.layout.mode === "fallback") {
          const revealTransitions = frames
            .filter((frame, frameIndex) => frameIndex === 0
              || frame.activeTableRevealCardCount !== frames[frameIndex - 1].activeTableRevealCardCount)
            .map((frame) => ({
              frameNumber: frame.frameNumber,
              elapsedMs: frame.elapsedMs,
              activeTableRevealCardCount: frame.activeTableRevealCardCount,
              fallbackGate: frame.fallbackGate,
            }));
          const revealVisibleRuns = revealTransitions.filter((transition, transitionIndex) =>
            transition.activeTableRevealCardCount === 1
              && (transitionIndex === 0 || revealTransitions[transitionIndex - 1].activeTableRevealCardCount === 0)).length;
          expect(revealVisibleRuns, label + " " + entry.role + ": one authoritative reveal may appear once, without repeated flashes; transitions: "
            + JSON.stringify(revealTransitions)).toBeLessThanOrEqual(1);
        }
        await testInfo.attach("dense-attack-" + index + "-" + entry.role + "-projection-polls.json", {
          body: Buffer.from(JSON.stringify(matchingPolls, null, 2)),
          contentType: "application/json",
        });
        await testInfo.attach("dense-attack-" + index + "-" + entry.role + "-screenshot.png", {
          body: await entry.page.screenshot(),
          contentType: "image/png",
        });
      }
    } finally {
      await attackerPage.close();
      await defenderPage.close();
    }
  }

  expect(rootEventIds.size).toBe(4);
  await testInfo.attach("dense-attack-continuity-rAF.json", {
    body: Buffer.from(JSON.stringify(frameEvidence, null, 2)), contentType: "application/json",
  });
  await testInfo.attach("dense-attack-continuity-polls.json", {
    body: Buffer.from(JSON.stringify(pollEvidence, null, 2)), contentType: "application/json",
  });
  await testInfo.attach("dense-attack-continuity-geometry.json", {
    body: Buffer.from(JSON.stringify(geometryEvidence, null, 2)), contentType: "application/json",
  });
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
