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
