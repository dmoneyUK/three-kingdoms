import { expect, test } from "@playwright/test";

function overlaps(left, right) {
  return Math.min(left.right, right.right) > Math.max(left.left, right.left)
    && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top);
}

test("UX2 response timer and System Menu stay compact at the Stage/Guidance boundary", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=negation&count=10&timedResponse=1&timedObserver=1");

  const table = page.locator('.play-table[data-seat-topology="side-column"]');
  const safeZone = table.locator(":scope > .interaction-safe-zone");
  const cluster = safeZone.locator(":scope > .stage-system-cluster");
  const timer = cluster.locator(":scope > .visible-countdown-response");
  const menu = cluster.getByRole("button", { name: "System menu" });
  const stage = safeZone.locator('.interaction-stage[data-stage="NEGATION"]');

  await expect(timer).toBeVisible();
  await expect(timer).toHaveAttribute("role", "timer");
  await expect(timer).toHaveAttribute("data-countdown-urgency", "calm");
  await expect(timer).toHaveAttribute("aria-label", "Response Time 60 seconds");
  await expect(timer.locator(".countdown-hourglass")).toHaveAttribute("aria-hidden", "true");
  await expect(timer).toContainText("60s");
  await expect(timer).not.toContainText("Response Time");
  await expect(timer).not.toContainText(/Player\s+\d/i);
  await expect(stage).toBeVisible();
  await expect(stage).not.toContainText("Player 4");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('[data-action-slot="primary"] button, [data-action-slot="decline"] button')).toHaveCount(0);

  const clockState = await page.evaluate(() => ({
    now: Date.now(),
    deadline: window.__browserRoom.currentAction.deadline,
  }));
  const pauseAt = clockState.now + 5_000;
  await page.clock.pauseAt(pauseAt);

  for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    const geometry = await page.evaluate(() => {
      const bounds = (element) => {
        const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const visible = (element) => {
        const style = getComputedStyle(element);
        const box = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
      };
      const tableNode = document.querySelector('.play-table[data-seat-topology="side-column"]');
      const safe = tableNode.querySelector(":scope > .interaction-safe-zone");
      const stageNode = safe.querySelector('.interaction-stage[data-stage="NEGATION"]');
      const clusterNode = safe.querySelector(":scope > .stage-system-cluster");
      const timerNode = clusterNode.querySelector(":scope > .visible-countdown-response");
      const menuNode = clusterNode.querySelector(".stage-system-menu-trigger");
      const guidanceNode = document.querySelector(".local-player-dock .console-guidance");
      const dockNode = document.querySelector(".local-player-dock");
      const rect = bounds;
      return {
        safeZone: rect(safe), cluster: rect(clusterNode), timer: rect(timerNode), menu: rect(menuNode),
        guidance: rect(guidanceNode), dock: rect(dockNode), pageWidth: document.documentElement.scrollWidth,
        stageContent: [...stageNode.children].filter(visible).map(rect),
        seats: [...tableNode.querySelectorAll('.player-board[data-player-count="10"] [data-player-anchor]')].map(rect),
      };
    });
    expect(geometry.pageWidth, JSON.stringify(geometry)).toBeLessThanOrEqual(viewport.width);
    expect(Math.abs(geometry.cluster.right - geometry.safeZone.right + 14), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
    const stageBoundaryOffset = viewport.width >= 600 ? 5 : 4;
    expect(Math.abs(geometry.cluster.bottom - geometry.safeZone.bottom - stageBoundaryOffset), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
    expect(geometry.menu.width).toBeGreaterThanOrEqual(44);
    expect(geometry.menu.height).toBeGreaterThanOrEqual(44);
    expect(geometry.timer.width).toBeGreaterThanOrEqual(52);
    expect(geometry.timer.width).toBeLessThanOrEqual(68);
    expect(geometry.timer.height).toBeGreaterThanOrEqual(36);
    expect(geometry.timer.height).toBeLessThanOrEqual(44);
    expect(Math.abs(geometry.timer.right - geometry.menu.left + 8)).toBeLessThanOrEqual(1);
    expect(geometry.cluster.bottom).toBeLessThanOrEqual(geometry.guidance.top);
    expect(geometry.guidance.top - geometry.cluster.bottom).toBeGreaterThanOrEqual(8);
    expect(geometry.guidance.top - geometry.cluster.bottom).toBeLessThanOrEqual(12);
    expect(geometry.cluster.bottom).toBeLessThanOrEqual(geometry.dock.top);
    expect(geometry.stageContent.filter((content) => overlaps(geometry.cluster, content))).toEqual([]);
    expect(geometry.seats.filter((seat) => overlaps(geometry.cluster, seat))).toEqual([]);
  }

  const calmBorder = await timer.evaluate((element) => getComputedStyle(element).borderTopColor);
  const untilNineSeconds = clockState.deadline - pauseAt - 9_000;
  expect(untilNineSeconds).toBeGreaterThan(0);
  await page.clock.fastForward(untilNineSeconds);
  await expect(timer).toHaveAttribute("data-countdown-urgency", "urgent");
  await expect(timer).toHaveAttribute("aria-label", "Response Time 9 seconds");
  const urgentBorder = await timer.evaluate((element) => getComputedStyle(element).borderTopColor);
  expect(urgentBorder).not.toBe(calmBorder);

  await page.clock.fastForward(5_000);
  await expect(timer).toHaveAttribute("data-countdown-urgency", "critical");
  await expect(timer).toHaveAttribute("aria-label", "Response Time 4 seconds");
  const criticalBorder = await timer.evaluate((element) => getComputedStyle(element).borderTopColor);
  expect(criticalBorder).not.toBe(urgentBorder);
});

test("UX2 System Menu is keyboard-accessible and confirms Exit without changing leave callback semantics", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=negation&count=10&timedResponse=1&timedObserver=1");

  const menu = page.getByRole("button", { name: "System menu" });
  const actions = page.getByLabel("System menu actions");
  const exit = actions.getByRole("button", { name: "Exit Game" });
  await expect(menu).toHaveAttribute("aria-controls", "stage-system-menu-actions");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(exit).toBeHidden();

  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(exit).toBeVisible();
  const popupGeometry = await page.evaluate(() => {
    const bounds = (element) => {
      const { left, right, top, bottom } = element.getBoundingClientRect();
      return { left, right, top, bottom };
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const popup = document.querySelector(".stage-system-menu-actions");
    const stage = document.querySelector('.interaction-stage[data-stage="NEGATION"]');
    const guidance = document.querySelector(".console-guidance");
    return {
      viewportWidth: innerWidth,
      popup: bounds(popup),
      content: [...stage.children].filter(visible).map(bounds),
      guidance: bounds(guidance),
      pageWidth: document.documentElement.scrollWidth,
    };
  });
  expect(popupGeometry.popup.left).toBeGreaterThanOrEqual(0);
  expect(popupGeometry.popup.right).toBeLessThanOrEqual(popupGeometry.viewportWidth);
  expect(popupGeometry.pageWidth).toBeLessThanOrEqual(popupGeometry.viewportWidth);
  expect(popupGeometry.popup.bottom).toBeLessThanOrEqual(popupGeometry.guidance.top);
  expect(popupGeometry.content.filter((content) => overlaps(popupGeometry.popup, content))).toEqual([]);

  let cancelledDialogMessage = "";
  page.once("dialog", async (dialog) => {
    expect(dialog.type()).toBe("confirm");
    cancelledDialogMessage = dialog.message();
    await dialog.dismiss();
  });
  await exit.click();
  expect(cancelledDialogMessage).toBe("Exit this game?");
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  expect(await page.evaluate(() => window.__browserLeaves)).toBe(0);

  await page.keyboard.press("Escape");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(menu).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(menu).toHaveAttribute("aria-expanded", "true");

  page.once("dialog", async (dialog) => dialog.accept());
  await exit.click();
  expect(await page.evaluate(() => window.__browserLeaves)).toBe(1);
});

test("UX2 response timer describes a shared window without exposing its responder", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });
  await page.setViewportSize({ width: 480, height: 900 });

  let sharedDeadline;
  for (const view of ["responder", "observer"]) {
    const observerQuery = view === "observer" ? "&timedObserver=1" : "";
    await page.goto(`/tests/browser/fixture.html?state=negation&timedResponse=1${observerQuery}`);

    const timer = page.locator(".stage-system-cluster > .visible-countdown-response");
    await expect(timer).toBeVisible();
    await expect(timer).toHaveAttribute("aria-label", /^Response Time \d+ seconds$/);
    await expect(timer.locator(".countdown-hourglass")).toHaveAttribute("aria-hidden", "true");
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

test("UX2 response timer stays hidden when the authoritative deadline is absent", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=negation&timedObserver=1");

  await expect(page.locator(".stage-system-cluster > .visible-countdown-response")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "System menu" })).toBeVisible();
  const currentAction = await page.evaluate(() => window.__browserRoom.currentAction);
  expect(currentAction.kind).toBe("response");
  expect(currentAction.actorId).toBeNull();
  expect(currentAction.deadline).toBe(0);
});
