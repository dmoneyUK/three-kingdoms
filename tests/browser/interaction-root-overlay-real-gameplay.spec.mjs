import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const attack = { id: "root-overlay-real-attack", kind: "Attack", suit: "♠", rank: "7" };
const dismantle = { id: "root-overlay-real-dismantle", kind: "Dismantle", suit: "♠", rank: "7" };
const steal = { id: "root-overlay-real-steal", kind: "Steal", suit: "♠", rank: "7" };
const dodge = { id: "root-overlay-real-dodge", kind: "Dodge", suit: "♥", rank: "3" };
const peach = { id: "root-overlay-real-peach", kind: "Peach", suit: "♥", rank: "3" };

async function seedGame(request, playerCount = 4, { sourceCard = attack, sourceHp = 4, targetCard = null } = {}) {
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
    hand: index === 0 ? [sourceCard] : index === 1 && targetCard ? [targetCard] : [],
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
        if (rootEventId || interactionStageVisible || activeRevealCards.length) {
          window.__wtkAttackVisibleFrames.push({
            frameNumber: frameNumber++,
            elapsedMs: Math.round(performance.now() - startedAt),
            mode: overlay?.dataset.rootActionDisplayMode ?? (interactionStageVisible ? "fallback" : "inactive"),
            fallbackGate: overlay?.dataset.rootActionFallbackReason ?? (rootEventId ? null : "no-proven-root"),
            layoutState: overlay?.dataset.rootActionLayoutState ?? null,
            rootEventId,
            sourceId: overlay?.dataset.rootActionSourceId ?? null,
            targetId: overlay?.dataset.rootActionTargetId ?? null,
            rootCardKind: overlay?.dataset.rootActionCardKind ?? null,
            rootCardVisible: isVisible(rootCard),
            interactionStageVisible,
            attackResponseStageVisible,
            activeTableRevealCardCount: activeRevealCards.length,
          });
        }
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

async function playAttackThroughPage(page, targetName) {
  await page.locator(`[data-hand-card-id="${attack.id}"] .game-card`).click();
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

async function playDodgeThroughPage(page) {
  const dodgeButton = page.locator(`[data-hand-card-id="${dodge.id}"] .game-card`);
  await expect(dodgeButton).toBeEnabled();
  await dodgeButton.click();
  await expect(dodgeButton).toHaveClass(/selected/);
  const confirm = page.locator('[data-console-surface="local-operation"] button.primary');
  await expect(confirm).toBeEnabled();
  const responsePromise = page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === "respond"; }
    catch { return false; }
  });
  await confirm.click();
  const response = await responsePromise;
  if (!response.ok()) throw new Error(`Dodge submission failed: ${await response.text()}`);
}

async function observeAttackDodgeSettlement(page) {
  await page.evaluate(() => {
    const timing = window.__wtkAttackDodgeSettlementTiming = { shownAt: null, exitingAt: null, removedAt: null, outcome: null };
    const capture = () => {
      const overlay = document.querySelector('[data-root-action-overlay="true"]');
      const node = overlay?.querySelector('[data-root-action-settled="true"]');
      if (node && overlay?.dataset.rootActionReady === "true" && timing.shownAt === null) {
        timing.shownAt = performance.now();
        timing.outcome = node.dataset.rootActionSettlementOutcome ?? null;
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
      targetPortrait: rect(document.querySelector(`[data-player-anchor="${target}"] .opponent-hero-portrait, [data-player-anchor="${target}"] .local-hero-card`)),
      targetHighlightStrokeWidth: Number.parseFloat(getComputedStyle(document.querySelector('[data-root-action-target-highlight="true"]') ?? document.documentElement).strokeWidth),
      targetHighlightPlayerId: document.querySelector('[data-root-action-target-highlight="true"]')?.dataset.rootActionTargetHighlightPlayerId ?? null,
      targetHighlightStrokeColor: getComputedStyle(document.querySelector('[data-root-action-target-highlight="true"]') ?? document.documentElement).stroke,
      targetHighlightFill: getComputedStyle(document.querySelector('[data-root-action-target-highlight="true"]') ?? document.documentElement).fill,
      targetHighlightFilter: getComputedStyle(document.querySelector('[data-root-action-target-highlight="true"]') ?? document.documentElement).filter,
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

    const rootCard = page.locator('[data-root-action-card="true"]');
    await expect(rootCard).toBeVisible({ timeout: 20_000 });
    await expect(rootCard).toHaveAttribute("aria-label", "SOURCE played Attack targeting TARGET");
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true");
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
    expect(after.sourceStrokeWidth).toBeGreaterThanOrEqual(4.5);
    expect(after.targetStrokeWidth).toBeGreaterThanOrEqual(6);
    expect(after.sourceStrokeColor).toBe("rgb(227, 223, 201)");
    expect(after.targetStrokeColor).toBe("rgb(255, 209, 102)");
    expect(after.targetOpacity).toBe("1");
    expect(after.targetMarkerWidth).toBe("20");
    expect(after.targetMarkerHeight).toBe("20");
    expect(after.targetHighlight).not.toBeNull();
    expect(after.targetPortrait).not.toBeNull();
    expect(Math.abs(after.targetHighlight.x - (after.targetPortrait.x - 5))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after.targetHighlight.y - (after.targetPortrait.y - 5))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after.targetHighlight.width - (after.targetPortrait.width + 10))).toBeLessThanOrEqual(0.5);
    expect(Math.abs(after.targetHighlight.height - (after.targetPortrait.height + 10))).toBeLessThanOrEqual(0.5);
    expect(after.targetHighlightPlayerId).toBe(targetId);
    expect(after.targetHighlightStrokeColor).toBe("rgb(255, 224, 138)");
    expect(after.targetHighlightFill).toBe("rgba(255, 209, 102, 0.36)");
    expect(after.targetHighlightFilter).toContain("drop-shadow");
    expect(after.overlayCardKind).toBe("Attack");
    expect(after.targetHighlightStrokeWidth).toBeGreaterThanOrEqual(4.5);
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
    expect(after.card.width, "root action card remains at the 112px readable minimum").toBeGreaterThanOrEqual(112);
    expect(after.card.height, "root action card remains at the 78px readable minimum").toBeGreaterThanOrEqual(78);
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
    await testInfo.attach("attack-root-overlay", { body: await page.screenshot(), contentType: "image/png" });

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

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`real Attack→Dodge graph visibly blocks the exact target relation at ${viewport.width}×${viewport.height}`, async ({ page, browser, request }, testInfo) => {
    test.setTimeout(60_000);
    const seed = await seedGame(request, 4, { targetCard: dodge });
    const sourceId = seed.players[0].id;
    const targetId = seed.players[1].id;
    await openGame(page, seed, 0, viewport);
    await playAttackThroughPage(page, "TARGET");
    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, { timeout: 20_000 }).not.toBeNull();
    const rootAction = (await roomView(request, seed, 1)).presentationSnapshot.rootAction;

    const targetPage = await browser.newPage({ viewport });
    try {
      await openGame(targetPage, seed, 1, viewport);
      const openOverlay = targetPage.locator('[data-root-action-overlay="true"]');
      await expect(openOverlay).toHaveAttribute("data-root-action-enabled", "true");
      await expect(openOverlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
      await expect(openOverlay).toHaveAttribute("role", "img");
      await expect(openOverlay).toHaveAttribute("aria-label", "SOURCE played Attack targeting TARGET.");
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
      await targetPage.emulateMedia({ reducedMotion: "no-preference" });
      await observeAttackDodgeSettlement(targetPage);

      await playDodgeThroughPage(targetPage);
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

      const overlay = targetPage.locator('[data-root-action-overlay="true"]');
      const rootCard = targetPage.locator('[data-root-action-card="true"]');
      const dodgeCard = targetPage.locator('[data-root-action-response-card="true"]');
      await expect(overlay).toHaveAttribute("data-root-action-enabled", "true");
      try {
        await expect(overlay).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
      } catch (error) {
        await testInfo.attach("attack-dodge-layout-failure.json", {
          body: JSON.stringify(await targetPage.evaluate(() => {
            const bounds = (element) => {
              if (!element) return null;
              const rect = element.getBoundingClientRect();
              return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
            };
            return {
              overlay: { ready: document.querySelector('[data-root-action-overlay="true"]')?.dataset.rootActionReady, mode: document.querySelector('[data-root-action-overlay="true"]')?.dataset.rootActionMode },
              root: bounds(document.querySelector('[data-root-action-card="true"]')),
              response: bounds(document.querySelector('[data-root-action-response-card="true"]')),
              table: bounds(document.querySelector('.play-table')),
              anchors: [...document.querySelectorAll('[data-player-anchor]')].map((element) => ({ id: element.dataset.playerAnchor, ...bounds(element) })),
              obstacles: [...document.querySelectorAll('.play-center, .stage-system-cluster, .game-messages, .game-exit')].map((element) => ({ className: element.className, ...bounds(element) })),
            };
          }), null, 2), contentType: "application/json",
        });
        throw error;
      }
      await expect(dodgeCard).toBeVisible({ timeout: 20_000 });
      await expect(rootCard).toHaveAttribute("data-root-action-settled", "true");
      await expect(rootCard).toHaveAttribute("data-root-action-settlement-event-id", proof.responseEventId);
      await expect(rootCard).toHaveAttribute("data-root-action-settlement-outcome", "ATTACK_BLOCKED_BY_DODGE");
      await expect(rootCard.locator("small")).toHaveText("RESOLVED");
      await expect(dodgeCard).toHaveAttribute("data-response-event-id", proof.responseEventId);
      await expect(dodgeCard).toHaveAttribute("aria-label", "TARGET played Dodge to block SOURCE's Attack against TARGET");
      await expect(rootCard).toHaveAttribute("aria-label", "SOURCE played Attack targeting TARGET");
      await expect(overlay).toHaveAttribute("aria-label", "SOURCE played Attack targeting TARGET. TARGET played Dodge to block SOURCE's Attack against TARGET. Attack resolution complete.");
      await expect(targetPage.getByRole("img", { name: /SOURCE played Attack targeting TARGET.*Attack resolution complete/ })).toHaveCount(1);
      await expect(overlay.getByRole("img")).toHaveCount(0);
      await expect(targetPage.locator('[data-root-action-edge="target"]')).toHaveCount(0);
      await expect(targetPage.locator('[data-root-action-edge="target-blocked"]')).toHaveCount(1);
      await expect(targetPage.locator('[data-root-action-edge="response-source"]')).toHaveCount(1);
      await expect(targetPage.locator('[data-root-action-blocked="true"]')).toHaveCount(1);
      await expect(targetPage.locator('.table-resolution-layer .table-played-card')).toHaveCount(0);

      const geometry = await targetPage.evaluate(({ source, target }) => {
        const bounds = (element) => {
          if (!element) return null;
          const rect = element.getBoundingClientRect();
          return { x: rect.x, y: rect.y, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height };
        };
        const sourceSeat = [...document.querySelectorAll("[data-player-anchor]")].find((element) => element.dataset.playerAnchor === source);
        const targetSeat = [...document.querySelectorAll("[data-player-anchor]")].find((element) => element.dataset.playerAnchor === target);
        const root = document.querySelector('[data-root-action-card="true"]');
        const response = document.querySelector('[data-root-action-response-card="true"]');
        const connector = document.querySelector(".interaction-root-connectors");
        const connectorRect = connector.getBoundingClientRect();
        const pointSamples = [...document.querySelectorAll('[data-root-action-edge="source"], [data-root-action-edge="target-blocked"], [data-root-action-edge="response-source"], [data-root-action-blocked="true"]')].map((path) => {
          const length = path.getTotalLength();
          const points = [];
          for (let distance = 4; distance < length - 4; distance += 4) {
            const point = path.getPointAtLength(distance);
            points.push({ x: point.x + connectorRect.x, y: point.y + connectorRect.y });
          }
          return { edge: path.dataset.rootActionEdge ?? "blocked-mark", markerEnd: path.getAttribute("marker-end"), points };
        });
        const project = (point, start, end) => {
          const dx = end.x - start.x;
          const dy = end.y - start.y;
          return ((point.x - start.x) * dx + (point.y - start.y) * dy) / (dx * dx + dy * dy || 1);
        };
        const sourceRect = bounds(sourceSeat);
        const targetRect = bounds(targetSeat);
        const sourceCenter = { x: sourceRect.x + sourceRect.width / 2, y: sourceRect.y + sourceRect.height / 2 };
        const targetCenter = { x: targetRect.x + targetRect.width / 2, y: targetRect.y + targetRect.height / 2 };
        const rootRect = bounds(root);
        const responseRect = bounds(response);
        const rootCenter = { x: rootRect.x + rootRect.width / 2, y: rootRect.y + rootRect.height / 2 };
        const responseCenter = { x: responseRect.x + responseRect.width / 2, y: responseRect.y + responseRect.height / 2 };
        return {
          source: sourceRect, target: targetRect, root: rootRect, response: responseRect,
          table: bounds(document.querySelector(".play-table")), shell: bounds(document.querySelector(".game-shell")),
          anchors: [...document.querySelectorAll("[data-player-anchor]")].map((element) => ({ id: element.dataset.playerAnchor, ...bounds(element) })),
          obstacles: [...document.querySelectorAll("[data-player-anchor], .play-center, .stage-system-cluster, .game-messages, .game-exit")].map(bounds).filter(Boolean),
          projection: { root: project(rootCenter, sourceCenter, targetCenter), response: project(responseCenter, sourceCenter, targetCenter) },
          edges: pointSamples,
          pointerEvents: getComputedStyle(document.querySelector('[data-root-action-overlay="true"]')).pointerEvents,
          documentWidth: document.documentElement.scrollWidth, viewportWidth: innerWidth,
        };
      }, { source: sourceId, target: targetId });
      await testInfo.attach("attack-dodge-block-geometry.json", { body: JSON.stringify({ viewport, before, geometry }, null, 2), contentType: "application/json" });
      await testInfo.attach("attack-dodge-block-graph", { body: await targetPage.screenshot(), contentType: "image/png" });
      expect(geometry.pointerEvents).toBe("none");
      expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
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
      expect(geometry.edges.every((edge) => edge.markerEnd === null), "blocked relation and source tether have no false arrowhead").toBe(true);
      expect(geometry.edges.flatMap((edge) => edge.points).every((point) => point.x >= geometry.shell.x && point.x <= geometry.shell.right
        && point.y >= geometry.shell.y && point.y <= geometry.shell.bottom)).toBe(true);
      expect(geometry.anchors).toHaveLength(4);
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
      await expect(targetPage.locator('.table-resolution-layer .table-played-card')).toHaveCount(0);
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
