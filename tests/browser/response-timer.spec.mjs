import { expect, test } from "@playwright/test";

test("UX2.3 response timer is glanceable, urgent near expiry, and stays top-right", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=negation&timedResponse=1");

  const timer = page.locator(".play-table > .visible-countdown-response");
  await expect(timer).toBeVisible();
  await expect(timer).toHaveAttribute("role", "timer");
  await expect(timer).toHaveAttribute("data-countdown-urgency", "calm");
  await expect(timer).toHaveAttribute("aria-label", "Response Time 25 seconds");
  await expect(timer.locator(".countdown-hourglass")).toHaveAttribute("aria-hidden", "true");
  await expect(timer).toContainText("Response Time");
  await expect(timer).toContainText("25s");
  await expect(timer).not.toContainText(/Player\s+\d/i);

  for (const { width, height, inset } of [
    { width: 390, height: 844, inset: 8 },
    { width: 480, height: 900, inset: 8 },
    { width: 1440, height: 900, inset: 14 },
  ]) {
    await page.setViewportSize({ width, height });
    const geometry = await timer.evaluate((element) => {
      const rect = (node) => {
        const { left, right, top, bottom } = node.getBoundingClientRect();
        return { left, right, top, bottom };
      };
      return {
        timer: rect(element),
        table: rect(element.closest(".play-table")),
        board: rect(element.closest(".play-table").querySelector(".player-board")),
      };
    });
    expect(geometry.timer.left).toBeGreaterThanOrEqual(0);
    expect(geometry.timer.right).toBeLessThanOrEqual(width);
    expect(Math.abs(geometry.timer.right - geometry.table.right + inset)).toBeLessThanOrEqual(1);
    expect(Math.abs(geometry.timer.top - geometry.table.top - inset)).toBeLessThanOrEqual(1);
    expect(geometry.timer.bottom).toBeLessThanOrEqual(geometry.board.top);
  }

  const calmBorder = await timer.evaluate((element) => getComputedStyle(element).borderTopColor);
  await page.clock.runFor(16_000);
  await expect(timer).toHaveAttribute("data-countdown-urgency", "urgent");
  await expect(timer).toHaveAttribute("aria-label", "Response Time 9 seconds");
  const urgentBorder = await timer.evaluate((element) => getComputedStyle(element).borderTopColor);
  expect(urgentBorder).not.toBe(calmBorder);

  await page.clock.runFor(5_000);
  await expect(timer).toHaveAttribute("data-countdown-urgency", "critical");
  await expect(timer).toHaveAttribute("aria-label", "Response Time 4 seconds");
  const criticalBorder = await timer.evaluate((element) => getComputedStyle(element).borderTopColor);
  expect(criticalBorder).not.toBe(urgentBorder);
});

test("UX2.3 response timer keeps the visible Exit control clear across viewport widths", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });

  for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=negation&count=10&timedResponse=1&timedObserver=1");

    const timer = page.locator('.play-table > .visible-countdown-response');
    const exit = page.locator('.play-table > .game-exit');
    const messages = page.locator(".play-table > .game-messages");
    await expect(timer).toBeVisible();
    await expect(exit).toBeVisible();
    await expect(exit).toBeEnabled();
    await expect(messages).toBeVisible();

    const geometry = await page.evaluate(() => {
      const rect = (element) => {
        const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const intersects = (left, right) => Math.min(left.right, right.right) > Math.max(left.left, right.left)
        && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top);
      const table = document.querySelector(".play-table");
      const timer = rect(table.querySelector(":scope > .visible-countdown-response"));
      const exit = rect(table.querySelector(":scope > .game-exit"));
      const messages = rect(table.querySelector(":scope > .game-messages"));
      const statusElement = table.querySelector(":scope > .player-board-status");
      const status = statusElement ? rect(statusElement) : null;
      return {
        viewport: { width: innerWidth, height: innerHeight },
        timer,
        exit,
        messages,
        status,
        timerExitOverlap: intersects(timer, exit),
        timerExitClearance: Math.max(timer.left - exit.right, exit.left - timer.right),
        exitMessagesOverlap: intersects(exit, messages),
        exitStatusOverlap: status ? intersects(exit, status) : false,
      };
    });

    expect(geometry.exit.width, JSON.stringify(geometry)).toBeGreaterThan(0);
    expect(geometry.exit.height, JSON.stringify(geometry)).toBeGreaterThan(0);
    expect(geometry.timerExitOverlap, JSON.stringify(geometry)).toBe(false);
    expect(geometry.timerExitClearance, JSON.stringify(geometry)).toBeGreaterThanOrEqual(8);
    expect(geometry.exitMessagesOverlap, JSON.stringify(geometry)).toBe(false);
    expect(geometry.exit.left, JSON.stringify(geometry)).toBeGreaterThanOrEqual(0);
    expect(geometry.exit.right, JSON.stringify(geometry)).toBeLessThanOrEqual(viewport.width);

    await exit.click();
    await messages.getByRole("button", { name: "Expand game messages" }).click();
    await expect(messages.locator(":scope > div")).toBeVisible();
    await expect(exit).toBeVisible();
    const expandedMessages = await messages.boundingBox();
    const expandedExit = await exit.boundingBox();
    expect(expandedMessages).not.toBeNull();
    expect(expandedExit).not.toBeNull();
    expect(Math.min(expandedMessages.x + expandedMessages.width, expandedExit.x + expandedExit.width)
      > Math.max(expandedMessages.x, expandedExit.x)
      && Math.min(expandedMessages.y + expandedMessages.height, expandedExit.y + expandedExit.height)
      > Math.max(expandedMessages.y, expandedExit.y), JSON.stringify({ viewport, expandedMessages, expandedExit })).toBe(false);
  }
});

test("UX2.3 response timer stays clear of 10-player Side Column content for an observer", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });
  await page.setViewportSize({ width: 480, height: 900 });
  await page.goto("/tests/browser/fixture.html?state=negation&count=10&timedResponse=1&timedObserver=1");

  const table = page.locator('.play-table[data-seat-topology="side-column"]');
  const timer = table.locator(":scope > .visible-countdown-response");
  const stage = table.locator('.interaction-stage[data-stage="NEGATION"]');
  await expect(table.locator('.player-board[data-player-count="10"]')).toBeVisible();
  await expect(timer).toBeVisible();
  await expect(timer).toHaveAttribute("role", "timer");
  await expect(timer).toHaveAttribute("aria-label", /^Response Time \d+ seconds$/);
  await expect(timer).toContainText("Response Time");
  await expect(timer).not.toContainText(/Player\s+\d/i);
  await expect(stage).toBeVisible();
  await expect(stage).not.toContainText("Player 4");
  await expect(page.locator('[data-action-slot="primary"] button, [data-action-slot="decline"] button')).toHaveCount(0);

  const observer = await page.evaluate(() => ({
    actionPlayerId: window.__browserRoom.actionPlayerId,
    currentAction: window.__browserRoom.currentAction,
    handCount: window.__browserRoom.myHand.length,
  }));
  expect(observer.actionPlayerId).toBeNull();
  expect(observer.currentAction.kind).toBe("response");
  expect(observer.currentAction.actorId).toBeNull();
  expect(observer.currentAction.deadline).toBeGreaterThan(0);
  expect(observer.currentAction.legalActions).toEqual([]);
  expect(observer.currentAction).not.toHaveProperty("options");
  expect(observer.handCount).toBe(0);

  const geometry = await page.evaluate(() => {
    const bounds = (element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const table = document.querySelector('.play-table[data-seat-topology="side-column"]');
    const timer = table.querySelector(":scope > .visible-countdown-response");
    const dock = document.querySelector(".local-player-dock");
    const stage = table.querySelector('.interaction-stage[data-stage="NEGATION"]');
    const stageContent = [...stage.querySelectorAll(":scope > header, .interaction-stage-event-summary, .medium-participant-card, .interaction-stage-current-effect, .current-effect-arrow, .hero-focus, .reaction-chain")]
      .filter(visible).map(bounds);
    const overlaps = (left, right) => Math.min(left.right, right.right) > Math.max(left.left, right.left)
      && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top);
    return {
      timer: bounds(timer), table: bounds(table), dock: bounds(dock),
      seats: [...table.querySelectorAll('.player-board[data-player-count="10"] [data-player-anchor]')].map((seat) => ({ id: seat.dataset.playerAnchor, ...bounds(seat) })),
      stageContent,
      seatOverlaps: [...table.querySelectorAll('.player-board[data-player-count="10"] [data-player-anchor]')]
        .flatMap((seat) => [seat, ...seat.querySelectorAll("*")]
          .filter(visible)
          .filter((element) => overlaps(bounds(timer), bounds(element)))
          .map((element) => ({ id: seat.dataset.playerAnchor, className: typeof element.className === "string" ? element.className : element.tagName, bounds: bounds(element) }))),
      stageOverlaps: stageContent.filter((content) => overlaps(bounds(timer), content)),
    };
  });
  expect(geometry.timer.left).toBeGreaterThanOrEqual(0);
  expect(geometry.timer.right).toBeLessThanOrEqual(480);
  expect(Math.abs(geometry.timer.right - geometry.table.right + 8)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.timer.top - geometry.table.top - 8)).toBeLessThanOrEqual(1);
  expect(geometry.timer.bottom).toBeLessThanOrEqual(geometry.dock.top);
  expect(geometry.seats).toHaveLength(9);
  expect(Math.min(...geometry.seats.map((seat) => seat.top))).toBeGreaterThanOrEqual(geometry.timer.bottom);
  expect(geometry.stageContent.length).toBeGreaterThan(0);
  expect(geometry.seatOverlaps, JSON.stringify({ timer: geometry.timer, overlaps: geometry.seatOverlaps }, null, 2)).toEqual([]);
  expect(geometry.stageOverlaps, JSON.stringify({ timer: geometry.timer, overlaps: geometry.stageOverlaps }, null, 2)).toEqual([]);
});

test("UX2.3 390px 10-player observer timer clears every Side Column seat and Stage content", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=negation&count=10&timedResponse=1&timedObserver=1");

  const table = page.locator('.play-table[data-seat-topology="side-column"]');
  const timer = table.locator(":scope > .visible-countdown-response");
  const stage = table.locator('.interaction-stage[data-stage="NEGATION"]');
  await expect(table.locator('.player-board[data-player-count="10"]')).toBeVisible();
  await expect(timer).toBeVisible();
  await expect(timer).toHaveAttribute("role", "timer");
  await expect(timer).toHaveAttribute("aria-label", /^Response Time \d+ seconds$/);
  await expect(timer).toContainText("Response Time");
  await expect(timer).not.toContainText(/Player\s+\d/i);
  await expect(stage).toBeVisible();
  await expect(stage).not.toContainText("Player 4");
  await expect(page.locator('[data-action-slot="primary"] button, [data-action-slot="decline"] button')).toHaveCount(0);

  const observer = await page.evaluate(() => ({
    actionPlayerId: window.__browserRoom.actionPlayerId,
    currentAction: window.__browserRoom.currentAction,
    handCount: window.__browserRoom.myHand.length,
  }));
  expect(observer.actionPlayerId).toBeNull();
  expect(observer.currentAction.kind).toBe("response");
  expect(observer.currentAction.actorId).toBeNull();
  expect(observer.currentAction.deadline).toBeGreaterThan(0);
  expect(observer.currentAction.legalActions).toEqual([]);
  expect(observer.currentAction).not.toHaveProperty("options");
  expect(observer.handCount).toBe(0);

  const geometry = await page.evaluate(() => {
    const bounds = (element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const table = document.querySelector('.play-table[data-seat-topology="side-column"]');
    const timer = table.querySelector(":scope > .visible-countdown-response");
    const dock = document.querySelector(".local-player-dock");
    const stage = table.querySelector('.interaction-stage[data-stage="NEGATION"]');
    const stageContent = [...stage.querySelectorAll(":scope > header, .interaction-stage-event-summary, .medium-participant-card, .interaction-stage-current-effect, .current-effect-arrow, .hero-focus, .reaction-chain")]
      .filter(visible).map(bounds);
    const overlaps = (left, right) => Math.min(left.right, right.right) > Math.max(left.left, right.left)
      && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top);
    return {
      timer: bounds(timer), table: bounds(table), dock: bounds(dock),
      seats: [...table.querySelectorAll('.player-board[data-player-count="10"] [data-player-anchor]')].map((seat) => ({ id: seat.dataset.playerAnchor, ...bounds(seat) })),
      stageContent,
      seatOverlaps: [...table.querySelectorAll('.player-board[data-player-count="10"] [data-player-anchor]')]
        .flatMap((seat) => [seat, ...seat.querySelectorAll("*")]
          .filter(visible)
          .filter((element) => overlaps(bounds(timer), bounds(element)))
          .map((element) => ({ id: seat.dataset.playerAnchor, className: typeof element.className === "string" ? element.className : element.tagName, bounds: bounds(element) }))),
      stageOverlaps: stageContent.filter((content) => overlaps(bounds(timer), content)),
    };
  });
  expect(geometry.timer.left, JSON.stringify(geometry)).toBeGreaterThanOrEqual(0);
  expect(geometry.timer.right, JSON.stringify(geometry)).toBeLessThanOrEqual(390);
  expect(Math.abs(geometry.timer.right - geometry.table.right + 8), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
  expect(Math.abs(geometry.timer.top - geometry.table.top - 8), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
  expect(geometry.timer.bottom, JSON.stringify(geometry)).toBeLessThanOrEqual(geometry.dock.top);
  expect(geometry.seats, JSON.stringify(geometry)).toHaveLength(9);
  expect(Math.min(...geometry.seats.map((seat) => seat.top)), JSON.stringify(geometry)).toBeGreaterThanOrEqual(geometry.timer.bottom);
  expect(geometry.stageContent.length, JSON.stringify(geometry)).toBeGreaterThan(0);
  expect(geometry.seatOverlaps, JSON.stringify({ timer: geometry.timer, overlaps: geometry.seatOverlaps }, null, 2)).toEqual([]);
  expect(geometry.stageOverlaps, JSON.stringify({ timer: geometry.timer, overlaps: geometry.stageOverlaps }, null, 2)).toEqual([]);
});

test("UX2.3 response timer describes the shared window without exposing its responder", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });
  await page.setViewportSize({ width: 480, height: 900 });

  let sharedDeadline;
  for (const view of ["responder", "observer"]) {
    const observerQuery = view === "observer" ? "&timedObserver=1" : "";
    await page.goto(`/tests/browser/fixture.html?state=negation&timedResponse=1${observerQuery}`);

    const timer = page.locator(".play-table > .visible-countdown-response");
    await expect(timer).toBeVisible();
    const visibleTimer = await timer.evaluate((element) => ({
      label: element.querySelector(".countdown-label")?.textContent,
      accessibleName: element.getAttribute("aria-label"),
      value: element.querySelector("b")?.textContent,
    }));
    expect(visibleTimer.label).toContain("Response Time");
    const seconds = visibleTimer.accessibleName?.match(/^Response Time (\d+) seconds$/)?.[1];
    expect(seconds).toBeTruthy();
    expect(visibleTimer.value).toBe(`${seconds}s`);
    await expect(timer).not.toContainText(/Player\s+2/i);

    const viewState = await page.evaluate(() => ({
      meId: window.__browserRoom.meId,
      actionPlayerId: window.__browserRoom.actionPlayerId,
      currentAction: window.__browserRoom.currentAction,
      handCount: window.__browserRoom.myHand.length,
    }));
    if (view === "observer") {
      expect(viewState.currentAction.deadline).toBe(sharedDeadline);
      expect(viewState.actionPlayerId).toBeNull();
      expect(viewState.currentAction.actorId).toBeNull();
      expect(viewState.currentAction.legalActions).toEqual([]);
      expect(viewState.currentAction).not.toHaveProperty("options");
      expect(viewState.handCount).toBe(0);
      await expect(page.locator('[data-action-slot="primary"] button')).toHaveCount(0);
      await expect(page.locator('[data-action-slot="decline"] button')).toHaveCount(0);
    } else {
      sharedDeadline = viewState.currentAction.deadline;
      expect(viewState.actionPlayerId).toBe(viewState.meId);
      expect(viewState.currentAction.legalActions).toContain("respond");
      expect(viewState.handCount).toBeGreaterThan(0);
      await expect(page.locator('[data-action-slot="primary"] button')).toHaveText("Confirm");
      await expect(page.locator('[data-action-slot="decline"] button')).toHaveText("Skip");
    }
  }
});

test("UX2.3 response timer stays hidden when the authoritative response deadline is absent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=negation&timedObserver=1");

  await expect(page.locator(".play-table > .visible-countdown-response")).toHaveCount(0);
  const currentAction = await page.evaluate(() => window.__browserRoom.currentAction);
  expect(currentAction.kind).toBe("response");
  expect(currentAction.actorId).toBeNull();
  expect(currentAction.deadline).toBe(0);
});
