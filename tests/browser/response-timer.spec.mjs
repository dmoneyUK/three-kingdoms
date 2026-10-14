import { expect, test } from "@playwright/test";

function overlaps(left, right) {
  return Math.min(left.right, right.right) > Math.max(left.left, right.left)
    && Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top);
}

test("UX2 shared Negation timer is eight seconds and System Menu occupies the Dock guidance edge", async ({ page }) => {
  await page.clock.install({ time: new Date("2026-01-01T00:00:00.000Z") });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=negation&count=10&timedResponse=1&privateNegationResponder=1&negationAuthority=missing-provider");

  const table = page.locator('.play-table[data-seat-topology="side-column"]');
  const safeZone = table.locator(":scope > .interaction-safe-zone");
  const cluster = safeZone.locator(":scope > .stage-system-cluster");
  const timer = cluster.locator(":scope > .visible-countdown-response");
  const menu = page.locator(".local-player-dock .console-guidance-row .stage-system-menu-trigger");

  await expect(timer).toBeVisible();
  await expect(timer).toHaveAttribute("role", "timer");
  await expect(timer).toHaveAttribute("data-countdown-urgency", "urgent");
  await expect(timer).toHaveAttribute("aria-label", "Response Time 8 seconds");
  await expect(timer.locator(".countdown-hourglass")).toHaveAttribute("aria-hidden", "true");
  await expect(timer).toContainText("8s");
  await expect(timer).not.toContainText("Response Time");
  await expect(timer).not.toContainText(/Player\s+\d/i);
  await expect(safeZone.locator('.interaction-stage[data-stage="NEGATION"]')).toHaveCount(0);
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(page.locator('[data-action-slot="primary"] button')).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Pass", exact: true })).toBeEnabled();

  const clockState = await page.evaluate(() => ({
    now: Date.now(),
    deadline: window.__browserRoom.currentAction.deadline,
  }));
  expect(clockState.deadline - clockState.now).toBeGreaterThan(7_000);
  expect(clockState.deadline - clockState.now).toBeLessThanOrEqual(8_000);
  const urgentBorder = await timer.evaluate((element) => getComputedStyle(element).borderTopColor);
  await page.clock.fastForward(2_000);
  await expect(timer).toHaveAttribute("data-countdown-urgency", "urgent");
  await expect(timer).toHaveAttribute("aria-label", "Response Time 6 seconds");
  await page.clock.fastForward(1_000);
  await expect(timer).toHaveAttribute("data-countdown-urgency", "critical");
  await expect(timer).toHaveAttribute("aria-label", "Response Time 5 seconds");
  const criticalBorder = await timer.evaluate((element) => getComputedStyle(element).borderTopColor);
  expect(criticalBorder).not.toBe(urgentBorder);

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
      const clusterNode = safe.querySelector(":scope > .stage-system-cluster");
      const timerNode = clusterNode.querySelector(":scope > .visible-countdown-response");
      const menuNode = document.querySelector(".local-player-dock .console-guidance-row .stage-system-menu-trigger");
      const guidanceRowNode = document.querySelector(".local-player-dock .console-guidance-row");
      const guidanceNode = document.querySelector(".local-player-dock .console-guidance");
      const dockNode = document.querySelector(".local-player-dock");
      const rect = bounds;
      return {
        safeZone: rect(safe), cluster: rect(clusterNode), timer: rect(timerNode), menu: rect(menuNode), guidanceRow: rect(guidanceRowNode),
        guidance: rect(guidanceNode), dock: rect(dockNode), pageWidth: document.documentElement.scrollWidth,
        publicContent: [...safe.querySelectorAll('.public-card-display, .table-resolution-layer, .active-table-reveal, .interaction-stage')].filter(visible).map(rect),
        seats: [...tableNode.querySelectorAll('.player-board[data-player-count="10"] [data-player-anchor]')].map(rect),
      };
    });
    expect(geometry.pageWidth, JSON.stringify(geometry)).toBeLessThanOrEqual(viewport.width);
    expect(Math.abs(geometry.cluster.right - geometry.safeZone.right + 14), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
    const stageBoundaryOffset = viewport.width >= 600 ? 5 : 4;
    expect(Math.abs(geometry.cluster.bottom - geometry.safeZone.bottom - stageBoundaryOffset), JSON.stringify(geometry)).toBeLessThanOrEqual(1);
    expect(geometry.menu.width).toBeGreaterThanOrEqual(44);
    expect(geometry.menu.height).toBeGreaterThanOrEqual(44);
    expect(Math.abs(geometry.menu.right - (geometry.guidance.right - 8))).toBeLessThanOrEqual(1);
    expect(geometry.menu.top).toBeGreaterThanOrEqual(geometry.guidance.top);
    expect(geometry.menu.bottom).toBeLessThanOrEqual(geometry.guidance.bottom);
    expect(geometry.timer.width).toBeGreaterThanOrEqual(52);
    expect(geometry.timer.width).toBeLessThanOrEqual(68);
    expect(geometry.timer.height).toBeGreaterThanOrEqual(36);
    expect(geometry.timer.height).toBeLessThanOrEqual(44);
    expect(geometry.cluster.bottom).toBeLessThanOrEqual(geometry.guidance.top);
    expect(geometry.guidance.top - geometry.cluster.bottom).toBeGreaterThanOrEqual(8);
    expect(geometry.guidance.top - geometry.cluster.bottom).toBeLessThanOrEqual(12);
    expect(geometry.cluster.bottom).toBeLessThanOrEqual(geometry.dock.top);
    expect(geometry.publicContent.filter((content) => overlaps(geometry.cluster, content))).toEqual([]);
    expect(geometry.seats.filter((seat) => overlaps(geometry.cluster, seat))).toEqual([]);
  }

});

test("UX2 System Menu is keyboard-accessible and confirms Exit without changing leave callback semantics", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=negation&count=10&timedResponse=1&timedObserver=1");

  const menu = page.getByRole("button", { name: "System menu" });
  const actions = page.getByLabel("System menu actions");
  const exit = actions.getByRole("button", { name: "Exit Game" });
  const messages = actions.locator("aside.game-messages");
  const messagesToggle = messages.locator(".stage-system-game-messages-toggle");
  const buildInfo = actions.locator(".stage-system-build-sha");
  await expect(menu).toHaveAttribute("aria-controls", "stage-system-menu-actions");
  await expect(menu).toContainText("⚙");
  await expect(menu).toHaveAttribute("aria-expanded", "false");
  await expect(exit).toBeHidden();
  await expect(buildInfo).toBeHidden();
  await expect(page.locator(".stage-build-version")).toHaveCount(0);
  await expect(page.locator(".play-table > .game-messages")).toHaveCount(0);
  await expect(messages).toBeHidden();

  await menu.click();
  await expect(menu).toHaveAttribute("aria-expanded", "true");
  await expect(exit).toBeVisible();
  await expect(buildInfo).toBeVisible();
  const buildSha = await buildInfo.getAttribute("data-build-sha");
  expect(buildSha).toBeTruthy();
  await expect(buildInfo.locator("span")).toHaveText(`BUILD ${buildSha === "development" ? "DEV" : buildSha.slice(0, 7)}`);
  await expect(buildInfo.locator("code")).toContainText(buildSha);
  await expect(messages).toBeVisible();
  await expect(messagesToggle).toHaveAccessibleName("Expand game messages");
  await expect(messagesToggle).toHaveAttribute("aria-expanded", "false");
  await messagesToggle.click();
  await expect(messagesToggle).toHaveAccessibleName("Collapse game messages");
  await expect(messagesToggle).toHaveAttribute("aria-expanded", "true");
  await expect(messages.locator(".stage-system-game-messages-list")).toBeVisible();
  await messagesToggle.click();
  await expect(messagesToggle).toHaveAttribute("aria-expanded", "false");
  await expect(messages.locator(".stage-system-game-messages-list")).toBeHidden();
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
    const guidance = document.querySelector(".console-guidance");
    const menu = document.querySelector(".stage-system-menu-trigger");
    return {
      viewportWidth: innerWidth,
      popup: bounds(popup),
      menu: bounds(menu),
      content: [...document.querySelectorAll('.public-card-display, .table-resolution-layer, .active-table-reveal, .interaction-stage')].filter(visible).map(bounds),
      guidance: bounds(guidance),
      pageWidth: document.documentElement.scrollWidth,
    };
  });
  expect(popupGeometry.popup.left).toBeGreaterThanOrEqual(0);
  expect(popupGeometry.popup.right).toBeLessThanOrEqual(popupGeometry.viewportWidth);
  expect(popupGeometry.pageWidth).toBeLessThanOrEqual(popupGeometry.viewportWidth);
  expect(popupGeometry.popup.bottom).toBeLessThanOrEqual(popupGeometry.menu.top - 4);
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
    const observerQuery = view === "observer" ? "&timedObserver=1" : "&privateNegationResponder=1";
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
      expect(viewState.currentAction.actorId).toBe(viewState.meId);
      expect(viewState.currentAction.presentation.readyAfterEventId).toBe("browser-unpresented-negation-root");
      expect(viewState.currentAction.legalActions).toEqual(["decline_response"]);
      expect(viewState.currentAction.options).toEqual([]);
      expect(viewState.handCount).toBe(0);
      await expect(page.locator('[data-action-slot="primary"] button')).toHaveCount(0);
      await expect(page.locator('[data-action-slot="decline"] button')).toHaveText("Pass");
      await expect(page.locator('[data-action-slot="decline"] button')).toBeEnabled();
    } else {
      sharedDeadline = viewState.currentAction.deadline;
      // Shared windows deliberately keep the public actionPlayerId anonymous;
      // the private CurrentAction still grants this viewer their own controls.
      expect(viewState.actionPlayerId).toBeNull();
      expect(viewState.currentAction.legalActions).toContain("respond");
      expect(viewState.handCount).toBeGreaterThan(0);
      await expect(page.locator('[data-action-slot="primary"] button')).toHaveText("Confirm");
      await expect(page.locator('[data-action-slot="decline"] button')).toHaveText("Pass");
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
  expect(currentAction.negationWindowId).toBeUndefined();
});
