import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";

async function loadFixture(page, width = 390) {
  await page.setViewportSize({ width, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=target-eligibility&count=5");
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function selectAttack(page) {
  await page.locator('[data-hand-card-id="browser-target-eligibility-attack"] .game-card').click();
}

test("mobile target highlights and same-tap rejection follow CurrentAction, with Inspector and Card Details still usable", async ({ page }) => {
  await loadFixture(page);
  await selectAttack(page);

  await expect(page.locator(".opponent-seat-inspect-button")).toHaveCount(0);
  await expect(page.locator(".local-target-selection")).toHaveCount(0);
  await expect(page.locator(".local-target-cancel")).toHaveCount(0);

  const eligibleNear = page.locator('.opponent-player-card[data-player-anchor="p2"]');
  const blockedFar = page.locator('.opponent-player-card[data-player-anchor="p3"]');
  await expect(eligibleNear).toHaveAttribute("data-target-selectable", "true");
  await expect(blockedFar).not.toHaveAttribute("data-target-selectable", "true");
  await expect(eligibleNear).toHaveClass(/targetable-target/);
  await expect(blockedFar).not.toHaveClass(/targetable-target/);
  await expect(blockedFar.locator(".opponent-hero-target")).toBeEnabled();

  await blockedFar.locator(".opponent-hero-target").click();
  await expect(page.locator(".decision-status")).toContainText("Cannot attack Player 3 — distance 2; Attack range 1.");
  await expect(page.locator(".decision-status")).toHaveAttribute("data-local-target-notice", "rejected");
  await expect(blockedFar).not.toHaveClass(/selected-target/);
  await expect(eligibleNear).not.toHaveClass(/selected-target/);
  await expect(page.locator('.opponent-inspection-panel[data-inspect-player-id="p3"]')).toBeVisible();
  await expect(page.locator('[data-console-surface="local-operation"] button.primary')).toBeDisabled();
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);

  const details = page.getByTestId("hand-card-details-action").first();
  await expect(details).toBeVisible();
  await details.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator('.card-details-panel[data-card-details-context="private-hand"]')).toBeVisible();
  await page.getByRole("button", { name: "Close card details" }).click();

  await blockedFar.locator(".opponent-hero-target").click();
  await expect(page.getByRole("region", { name: "Player 3 opponent inspection" })).toBeVisible();
  await expect(blockedFar).not.toHaveClass(/selected-target/);
  await expect(page.locator(".decision-status")).toContainText("Cannot attack Player 3 — distance 2; Attack range 1.");
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await eligibleNear.locator(".opponent-hero-target").click();
  await expect(eligibleNear).toHaveClass(/selected-target/);
  await expect(page.locator(".decision-status")).not.toHaveAttribute("data-local-target-notice", "rejected");
  await expect(page.locator('[data-console-surface="local-operation"] button.primary')).toBeEnabled();
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

  await page.keyboard.press("Escape");
  await blockedFar.locator(".opponent-hero-target").click();
  await expect(page.locator(".decision-status")).toContainText("Cannot attack Player 3 — distance 2; Attack range 1.");
  await expect(eligibleNear).toHaveClass(/selected-target/);
  await expect(blockedFar).not.toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary')).toBeEnabled();
  await expect(page.locator('.opponent-inspection-panel[data-inspect-player-id="p3"]')).toBeVisible();
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

  await page.keyboard.press("Escape");
  await page.locator('[data-hand-card-id="browser-target-eligibility-attack"] .game-card').click();
  await expect(page.locator('[data-hand-card-id="browser-target-eligibility-attack"]')).toHaveAttribute("data-card-selected", "false");
  await expect(page.locator(".opponent-player-card.selected-target")).toHaveCount(0);
  await expect(page.locator(".decision-status")).not.toHaveAttribute("data-local-target-notice", "rejected");
  await expect(page.locator('[data-console-surface="local-operation"] button.primary')).toBeDisabled();
  await expect(page.locator(".local-target-selection, .local-target-cancel")).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

test("five-seat phone Attack selection uses portrait touch and retap deselection at approved viewport sizes", async ({ browser }) => {
  test.setTimeout(120_000);
  for (const viewport of [{ width: 390, height: 700 }, { width: 390, height: 844 }, { width: 440, height: 766 }, { width: 440, height: 894 }, { width: 480, height: 900 }]) {
    const context = await browser.newContext({ viewport, isMobile: true, hasTouch: true });
    try {
      const page = await context.newPage();
      await page.goto("http://127.0.0.1:4177/tests/browser/fixture.html?state=target-eligibility&count=5");
      await expect(page.locator(".game-shell")).toBeVisible();
      const seatGeometry = () => page.locator(".opponent-player-card").evaluateAll((seats) => seats.map((seat) => {
        const rect = seat.getBoundingClientRect();
        return { id: seat.dataset.playerAnchor, x: +rect.x.toFixed(2), y: +rect.y.toFixed(2), width: +rect.width.toFixed(2), height: +rect.height.toFixed(2) };
      }));
      const seatsBefore = await seatGeometry();
      const attack = page.locator('[data-hand-card-id="browser-target-eligibility-attack"] .game-card');
      await attack.tap();

      await expect(page.locator(".opponent-seat-inspect-button")).toHaveCount(0);
      await expect(page.locator(".local-target-selection, .local-target-cancel")).toHaveCount(0);
      expect(await seatGeometry()).toEqual(seatsBefore);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      const portraitHit = await page.locator('.opponent-player-card[data-player-anchor="p2"] .opponent-hero-target').evaluate((target) => {
        const rect = target.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
        return Boolean(hit?.closest(".opponent-hero-target") === target);
      });
      expect(portraitHit, JSON.stringify(viewport)).toBe(true);

      const target = page.locator('.opponent-player-card[data-player-anchor="p2"] .opponent-hero-target');
      const bounds = await target.boundingBox();
      expect(bounds).toBeTruthy();
      await page.touchscreen.tap(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2);
      await expect(page.locator('.opponent-inspection-panel[data-inspect-player-id="p2"]')).toBeVisible();
      await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
      await expect(page.locator('[data-console-surface="local-operation"] button.primary')).toBeEnabled();
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

      await page.keyboard.press("Escape");
      await attack.tap();
      await expect(page.locator('[data-hand-card-id="browser-target-eligibility-attack"]')).toHaveAttribute("data-card-selected", "false");
      await expect(page.locator(".opponent-player-card.selected-target")).toHaveCount(0);
      await expect(page.locator('[data-console-surface="local-operation"] button.primary')).toBeDisabled();
      await expect(page.locator(".local-target-selection, .local-target-cancel")).toHaveCount(0);
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
    } finally {
      await context.close();
    }
  }
});

test("five-seat non-Attack and four/six/eight-seat mobile selection keep existing Inspect and Cancel controls", async ({ page }) => {
  for (const count of [4, 6, 8]) {
    await page.setViewportSize({ width: 390, height: 700 });
    await page.goto(`/tests/browser/fixture.html?state=target-eligibility&count=${count}`);
    await expect(page.locator(".game-shell")).toBeVisible();
    await selectAttack(page);
    await expect(page.locator(".opponent-seat-inspect-button")).toHaveCount(count - 1);
    await expect(page.locator(".local-target-selection")).toBeVisible();
    await expect(page.locator(".local-target-cancel")).toBeVisible();
  }

  await page.setViewportSize({ width: 390, height: 700 });
  await page.goto("/tests/browser/fixture.html?state=target-eligibility&count=5");
  await expect(page.locator(".game-shell")).toBeVisible();
  await page.locator('[data-hand-card-id="browser-target-eligibility-steal"] .game-card').click();
  await expect(page.locator(".opponent-seat-inspect-button")).toHaveCount(4);
  await expect(page.locator(".local-target-selection")).toBeVisible();
  await expect(page.locator(".local-target-cancel")).toBeVisible();
});

test("a target excluded by a newer CurrentAction revision is cleared and reported", async ({ page }) => {
  await loadFixture(page, 480);
  await selectAttack(page);
  await page.locator('.opponent-player-card[data-player-anchor="p2"] .opponent-hero-target').click();
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);

  await page.evaluate(() => window.__updateBrowserRoom((room) => ({
    ...room,
    actionRevision: `${room.actionRevision}-next`,
    currentAction: {
      ...room.currentAction,
      playTargetEligibility: room.currentAction.playTargetEligibility.map((entry) => entry.cardId === "browser-target-eligibility-attack"
        ? { ...entry, eligibleTargetIds: ["p5"], rejections: [{ targetId: "p2", code: "OUT_OF_RANGE", distance: 2, range: 1 }] }
        : entry),
    },
  })));

  await expect(page.locator(".decision-status")).toContainText("Target is no longer eligible. Select another target.");
  await expect(page.locator(".decision-status")).toHaveAttribute("data-local-target-notice", "stale");
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).not.toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary:enabled')).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

test("live five-seat mobile targeting preserves private authority, Inspector, Details and TEST SWITCH", async ({ page, request }) => {
  test.setTimeout(120_000);
  const hostName = "TARGET ELIGIBILITY MOBILE";
  const created = await request.post(`${API}/api/rooms`, { data: { action: "create", name: hostName } });
  expect(created.status()).toBe(201);
  const createdBody = await created.json();
  const { code, token } = { code: createdBody.room.code, token: createdBody.token };
  const post = async (action, values = {}) => {
    const response = await request.post(`${API}/api/rooms`, { data: { action, code, token, ...values } });
    const body = await response.json();
    expect(response.status(), JSON.stringify(body)).toBeLessThan(300);
    return body.room;
  };
  const getViewer = async (viewerId) => {
    const query = new URLSearchParams({ code, token, ...(viewerId ? { testViewerId: viewerId } : {}) });
    const response = await request.get(`${API}/api/rooms?${query}`);
    if (!response.ok()) throw new Error(`Viewer projection failed: ${response.status()} ${await response.text()}`);
    return response.json();
  };

  let room = await post("add_test_players", { count: 4 });
  expect(room.players).toHaveLength(5);
  room = await post("enable_test_room");
  const handsBySeat = Object.fromEntries(room.players.map((player) => [player.seat, ["Attack"]]));
  room = await post("configure_test_hands", { presetId: "custom", handsBySeat, expectedRevision: 0 });
  room = await post("start");
  const safeHeroes = new Set([
    "cao-cao", "xiahou-dun", "liu-bei", "guan-yu", "zhang-fei", "zhao-yun",
    "sun-quan", "gan-ning", "huang-gai", "lu-xun", "huaxiong", "pan-feng",
    "simayi", "guo-jia",
  ]);
  while (room.status === "heroes") {
    const hero = room.myHeroOptions.find((candidate) => candidate.hp >= 4 && safeHeroes.has(candidate.id));
    expect(hero, "test mode exposes a Standard hero without an automatic turn-start target prompt").toBeTruthy();
    room = await post("choose_hero", { heroId: hero.id });
  }
  expect(room.status).toBe("playing");
  expect(room.currentAction?.actorId).toBeTruthy();
  let actorView = await getViewer(room.currentAction.actorId);
  expect(actorView.isMyAction).toBe(true);
  if (actorView.phase?.startsWith("draw")) {
    room = await post("draw", { context: {
      actionRevision: actorView.actionRevision,
      meId: actorView.meId,
      phase: actorView.phase,
      pendingKind: actorView.pending?.kind ?? null,
      actorId: actorView.currentAction?.actorId ?? null,
    } });
    actorView = await getViewer(room.currentAction?.actorId ?? actorView.meId);
  }
  expect(actorView.phase?.startsWith("play")).toBe(true);
  expect(actorView.currentAction?.kind).toBe("turn");
  const attack = actorView.myHand.find((item) => item.kind === "Attack");
  expect(attack, "the acting test player has an actual Standard Attack card").toBeTruthy();
  const attackProjection = actorView.currentAction.playTargetEligibility?.find((entry) => entry.mode === "card" && entry.cardId === attack.id && entry.effectiveKind === "Attack");
  expect(attackProjection, "actor CurrentAction includes the card-specific eligibility projection").toBeTruthy();
  const blockedId = attackProjection.rejections.find((entry) => entry.code === "OUT_OF_RANGE")?.targetId;
  const eligibleId = attackProjection.eligibleTargetIds[0];
  expect(blockedId, "five-seat board has a projected out-of-range opponent").toBeTruthy();
  expect(eligibleId, "five-seat board has a projected eligible opponent").toBeTruthy();
  const blockedPlayer = actorView.players.find((player) => player.id === blockedId);
  const eligiblePlayer = actorView.players.find((player) => player.id === eligibleId);
  expect(blockedPlayer).toBeTruthy();
  expect(eligiblePlayer).toBeTruthy();
  const otherViewer = room.players.find((player) => player.id !== actorView.meId && player.id !== blockedId && player.id !== eligibleId);
  expect(otherViewer).toBeTruthy();
  const observerView = await getViewer(otherViewer.id);
  expect(observerView.currentAction.actorId).toBe(actorView.meId);
  expect(observerView.currentAction.playTargetEligibility).toBeUndefined();

  await page.setViewportSize({ width: 390, height: 844 });
  await page.addInitScript(({ roomCode, sessionToken, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code: roomCode, token: sessionToken, name }));
  }, { roomCode: code, sessionToken: token, name: hostName });
  const playPosts = [];
  page.on("request", (browserRequest) => {
    if (browserRequest.url() !== `${API}/api/rooms` || browserRequest.method() !== "POST") return;
    try {
      const body = JSON.parse(browserRequest.postData() ?? "{}");
      if (body.action === "play_card") playPosts.push(body);
    } catch { /* Non-JSON requests are outside this gameplay assertion. */ }
  });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  const initialViewerId = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
  if (initialViewerId !== actorView.meId) {
    const switchToActor = page.getByTestId(`test-view-switch-${actorView.meId}`);
    const actorSwitchResponsePromise = page.waitForResponse((response) => response.request().method() === "GET"
      && response.url().startsWith(`${API}/api/rooms?`)
      && new URL(response.url()).searchParams.get("testViewerId") === actorView.meId);
    await switchToActor.click();
    expect((await actorSwitchResponsePromise).ok()).toBeTruthy();
  }
  await expect(page.locator(`.local-player-dock[data-player-anchor="${actorView.meId}"]`)).toBeVisible();
  await page.locator(`[data-hand-card-id="${attack.id}"] .game-card`).click();
  const blockedTarget = page.locator(`.opponent-player-card[data-player-anchor="${blockedId}"]`);
  const eligibleTarget = page.locator(`.opponent-player-card[data-player-anchor="${eligibleId}"]`);
  await expect(eligibleTarget).toHaveAttribute("data-target-selectable", "true");
  await expect(blockedTarget).not.toHaveAttribute("data-target-selectable", "true");
  await expect(blockedTarget.locator(".opponent-hero-target")).toBeEnabled();
  await expect(page.locator(".opponent-seat-inspect-button")).toHaveCount(0);
  const portraitHit = await blockedTarget.evaluate((seat) => {
    const target = seat.querySelector(".opponent-hero-target").getBoundingClientRect();
    const hit = document.elementFromPoint(target.left + target.width / 2, target.top + target.height / 2);
    return Boolean(hit?.closest(".opponent-hero-target") === seat.querySelector(".opponent-hero-target"));
  });
  expect(portraitHit).toBe(true);
  await blockedTarget.locator(".opponent-hero-target").click();
  const distanceRejection = attackProjection.rejections.find((entry) => entry.targetId === blockedId);
  await expect(page.locator(".decision-status")).toContainText(
    `Cannot attack ${blockedPlayer.name} — distance ${distanceRejection.distance}; Attack range ${distanceRejection.range}.`,
  );
  await expect(blockedTarget).not.toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary')).toBeDisabled();
  await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${blockedId}"]`)).toBeVisible();
  expect(playPosts).toHaveLength(0);

  await expect(page.getByRole("region", { name: `${blockedPlayer.name} opponent inspection` })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  const cardDetails = page.getByTestId("hand-card-details-action").first();
  await expect(cardDetails).toBeVisible();
  await cardDetails.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close card details" }).click();

  const inspector = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-panel');
  await blockedTarget.locator(".opponent-hero-target").click();
  await expect(inspector).toHaveAttribute("data-inspect-player-id", blockedId);
  const inspectorAnchorMetrics = () => page.evaluate((subjectId) => {
    const rect = (element) => {
      if (!element) return null;
      const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { left, top, right, bottom, width, height };
    };
    const panel = document.querySelector('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-panel');
    const shell = panel?.closest(".opponent-inspection-floating-shell");
    const table = panel?.closest(".play-table");
    const seat = [...(table?.querySelectorAll(".player-board [data-player-anchor]") ?? [])]
      .find((element) => element.dataset.playerAnchor === subjectId);
    const board = table?.querySelector(".player-board");
    const seatBox = rect(seat);
    const shellBox = rect(shell);
    return {
      subjectId: panel?.dataset.inspectPlayerId,
      seat: seatBox,
      shell: shellBox,
      centerDelta: seatBox && shellBox
        ? Math.abs((seatBox.top + seatBox.height / 2) - (shellBox.top + shellBox.height / 2))
        : null,
      topology: table?.dataset.seatTopology,
      playerCount: board?.dataset.playerCount,
      mobileMedia: matchMedia("(max-width: 520px)").matches,
      shellPosition: shell ? getComputedStyle(shell).position : null,
      documentWidth: document.documentElement.scrollWidth,
      viewportWidth: innerWidth,
    };
  }, blockedId);
  const openBlockedInspector = async () => {
    const inspectButton = blockedTarget.locator(".opponent-seat-inspect-button");
    if (await inspectButton.count()) await inspectButton.click();
    else await blockedTarget.locator(".opponent-hero-target").click();
  };

  const switchToOther = page.getByTestId(`test-view-switch-${otherViewer.id}`);
  const otherViewResponsePromise = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().startsWith(`${API}/api/rooms?`)
    && new URL(response.url()).searchParams.get("testViewerId") === otherViewer.id);
  await switchToOther.click();
  const otherViewResponse = await otherViewResponsePromise;
  expect(otherViewResponse.ok()).toBeTruthy();
  const otherViewBody = await otherViewResponse.json();
  expect((otherViewBody.room ?? otherViewBody).currentAction.playTargetEligibility).toBeUndefined();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${otherViewer.id}"]`)).toBeVisible();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await openBlockedInspector();
  await expect(inspector).toHaveAttribute("data-inspect-player-id", blockedId);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const otherViewerInspectorGeometry = await inspectorAnchorMetrics();
  expect(otherViewerInspectorGeometry.centerDelta, JSON.stringify(otherViewerInspectorGeometry)).toBeLessThanOrEqual(24);
  expect(otherViewerInspectorGeometry.documentWidth).toBeLessThanOrEqual(otherViewerInspectorGeometry.viewportWidth);
  await expect(blockedTarget).not.toHaveClass(/selected-target/);
  await expect(page.locator(".decision-status")).not.toHaveAttribute("data-local-target-notice", "rejected");

  const switchBack = page.getByTestId(`test-view-switch-${actorView.meId}`);
  await page.keyboard.press("Escape");
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  const actorViewResponsePromise = page.waitForResponse((response) => response.request().method() === "GET"
    && response.url().startsWith(`${API}/api/rooms?`)
    && new URL(response.url()).searchParams.get("testViewerId") === actorView.meId);
  await switchBack.click();
  const actorViewResponse = await actorViewResponsePromise;
  expect(actorViewResponse.ok()).toBeTruthy();
  const actorViewBody = await actorViewResponse.json();
  const restoredActorView = actorViewBody.room ?? actorViewBody;
  expect(restoredActorView.currentAction.playTargetEligibility).toBeTruthy();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${actorView.meId}"]`)).toBeVisible();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await openBlockedInspector();
  await expect(inspector).toHaveAttribute("data-inspect-player-id", blockedId);
  await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  const returnedViewerInspectorGeometry = await inspectorAnchorMetrics();
  expect(returnedViewerInspectorGeometry.centerDelta, JSON.stringify(returnedViewerInspectorGeometry)).toBeLessThanOrEqual(24);
  await expect(page.locator(".decision-status")).not.toContainText("Cannot attack");

  await page.setViewportSize({ width: 440, height: 894 });
  await page.locator(`[data-hand-card-id="${attack.id}"] .game-card`).click();
  await eligibleTarget.locator(".opponent-hero-target").click();
  await expect(eligibleTarget).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary')).toBeEnabled();
  const playResponsePromise = page.waitForResponse((response) => response.url() === `${API}/api/rooms`
    && response.request().method() === "POST"
    && (() => { try { return JSON.parse(response.request().postData() ?? "{}").action === "play_card"; } catch { return false; } })());
  await page.locator('[data-console-surface="local-operation"] button.primary').click();
  const playResponse = await playResponsePromise;
  expect(playResponse.ok(), await playResponse.text()).toBeTruthy();
  expect(playPosts).toHaveLength(1);
  expect(playPosts[0]).toMatchObject({ action: "play_card", cardId: attack.id, targetId: eligibleId });
  expect(playPosts[0].targetIds).toBeUndefined();
});
