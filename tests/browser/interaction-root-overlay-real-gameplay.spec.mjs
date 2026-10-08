import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const attack = { id: "root-overlay-real-attack", kind: "Attack", suit: "♠", rank: "7" };

async function seedGame(request, playerCount = 4) {
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
    hp: 4,
    maxHp: 4,
    hand: index === 0 ? [attack] : [],
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
    await playAttackThroughPage(page, "TARGET");

    await expect.poll(async () => (await roomView(request, seed, 1)).presentationSnapshot?.rootAction?.rootEventId ?? null, { timeout: 20_000 }).not.toBeNull();
    const targetServerView = await roomView(request, seed, 1);
    const rootAction = targetServerView.presentationSnapshot.rootAction;
    expect(targetServerView.currentAction.kind).toBe("response");
    expect(rootAction).toMatchObject({ semantics: "PROVEN", action: "ATTACK", sourceId, targetId });
    expect(targetServerView.timeline.some((event) => event.id === rootAction.rootEventId && event.action === "play" && event.card?.kind === "Attack")).toBe(true);
    expect(JSON.stringify(rootAction)).not.toContain(attack.id);

    const rootCard = page.locator('[data-root-action-card="true"]');
    await expect(rootCard).toBeVisible({ timeout: 20_000 });
    await expect(rootCard).toHaveAttribute("aria-label", "SOURCE played Attack targeting TARGET");
    await expect(page.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true");
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    await expect(page.locator(".stage-system-cluster")).toBeVisible();
    const after = await measure(page, sourceId, targetId);
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

    const targetPage = await browser.newPage({ viewport });
    try {
      await openGame(targetPage, seed, 1, viewport);
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true", { timeout: 20_000 });
      const dock = targetPage.locator(`.local-player-dock[data-player-anchor="${targetId}"]`);
      const hiddenAnchorStyle = await targetPage.addStyleTag({ content: `.local-player-dock[data-player-anchor="${targetId}"] { display: none !important; }` });
      await expect(dock).toBeHidden();
      await targetPage.evaluate(() => window.dispatchEvent(new Event("resize")));
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "false");
      await expect(targetPage.locator(".interaction-stage")).toHaveCount(1);
      await hiddenAnchorStyle.evaluate((style) => style.remove());
      await expect(targetPage.locator('[data-root-action-overlay="true"]')).toHaveAttribute("data-root-action-ready", "true");
      await expect(targetPage.locator(".interaction-stage")).toHaveCount(0);
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
    } finally {
      await targetPage.close();
    }
  });
}
