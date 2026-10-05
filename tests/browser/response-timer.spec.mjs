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
