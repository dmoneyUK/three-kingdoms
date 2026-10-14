import { expect, test } from "@playwright/test";

test.use({ hasTouch: true });

test("UI-2 Hand Details is a separate 44px action and preserves selected Hand state", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=normal&count=4&handSize=25");

  const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  const details = dock.getByTestId("hand-card-details-action");
  const firstCard = dock.locator('[data-hand-card-id="browser-hand-1"] .game-card');
  await expect(details).toHaveCount(0);
  await firstCard.click({ position: { x: 5, y: 12 } });
  await expect(firstCard).toHaveClass(/selected/);
  await expect(details).toBeVisible();
  await expect(details).toHaveAccessibleName("Details for Attack");

  const bounds = await details.boundingBox();
  expect(bounds.width).toBeGreaterThanOrEqual(44);
  expect(bounds.height).toBeGreaterThanOrEqual(44);
  await details.focus();
  await page.keyboard.press("Enter");

  const preview = page.getByRole("dialog");
  await expect(preview).toHaveAttribute("data-card-details-context", "private-hand");
  await expect(preview).toHaveAttribute("data-card-details-card-id", "browser-hand-1");
  await expect(firstCard).toHaveClass(/selected/);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

  await page.keyboard.press("Escape");
  await expect(preview).toHaveCount(0);
  await expect(details).toBeFocused();
  await expect(firstCard).toHaveClass(/selected/);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  await firstCard.click({ position: { x: 5, y: 12 } });
  await expect(firstCard).not.toHaveClass(/selected/);
  await expect(details).toHaveCount(0);
});

test("UI-2 Details remains separate from touch selection and multi-card skill costs", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=liu-bei-benevolence&count=4&hero=liu-bei");

  const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  const skill = dock.locator(".local-hero-skills").getByRole("button", { name: "Benevolence", exact: true });
  await skill.click();
  const first = dock.locator('[data-hand-card-id="browser-rende-eligible-one"] .game-card');
  const second = dock.locator('[data-hand-card-id="browser-rende-eligible-two"] .game-card');
  const firstBox = await first.boundingBox();
  await page.touchscreen.tap(firstBox.x + 5, firstBox.y + 12);
  await expect(first).toHaveClass(/selected/);

  const details = dock.getByTestId("hand-card-details-action");
  await expect(details).toHaveAccessibleName("Details for Attack");
  await details.tap();
  await expect(page.getByRole("dialog")).toHaveAttribute("data-card-details-card-id", "browser-rende-eligible-one");
  await expect(first).toHaveClass(/selected/);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  await page.keyboard.press("Escape");

  const secondBox = await second.boundingBox();
  await page.touchscreen.tap(secondBox.x + 5, secondBox.y + 12);
  await expect(first).toHaveClass(/selected/);
  await expect(second).toHaveClass(/selected/);
  await expect(details).toHaveAccessibleName("Details for Peach");
  await details.tap();
  await expect(page.getByRole("dialog")).toHaveAttribute("data-card-details-card-id", "browser-rende-eligible-two");
  await expect(first).toHaveClass(/selected/);
  await expect(second).toHaveClass(/selected/);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
  await second.tap({ position: { x: 5, y: 12 } });
  await expect(second).not.toHaveClass(/selected/);
  await expect(first).toHaveClass(/selected/);
  await expect(details).toHaveAccessibleName("Details for Attack");
});

for (const scenario of [
  { state: "dodge-no-provider", requirement: "dodge", label: "TAKE DAMAGE" },
  { state: "duel-no-attack", requirement: "attack", label: "TAKE DAMAGE" },
  { state: "dodge", requirement: "dodge", label: "Skip" },
  { state: "raining-arrows-response", requirement: "dodge", label: "Skip" },
]) {
  test(`UI-2 ${scenario.state} labels decline from CurrentAction and providers`, async ({ page }) => {
    await page.setViewportSize({ width: 480, height: 900 });
    await page.goto(`/tests/browser/fixture.html?state=${scenario.state}&groupProgress=valid`);

    const action = await page.evaluate(() => window.__browserRoom.currentAction);
    const dock = page.locator(`.local-player-dock[data-player-anchor="${action.actorId}"]`);
    const decline = dock.locator('[data-action-slot="decline"] button');
    expect(action.kind).toBe("response");
    expect(action.requirement).toBe(scenario.requirement);
    expect(action.legalActions).toContain("decline_response");
    await expect(decline).toHaveText(scenario.label);
    await expect(decline).toBeEnabled();

    if (action.options.length === 0) {
      const unprojectedMatchingCard = dock.locator(".game-card");
      if (await unprojectedMatchingCard.count()) await expect(unprojectedMatchingCard.first()).toBeDisabled();
      await expect(dock.locator('[data-action-slot="primary"] button')).toHaveCount(0);
    } else {
      const matchingOptions = action.options.filter((option) => option.satisfies === action.requirement);
      expect(matchingOptions.length).toBeGreaterThan(0);
    }
  });
}

for (const count of [4, 6, 8, 10]) {
  for (const width of [390, 480]) {
  test(`UI-2 keeps full opponent player identity accessible at ${count} seats / ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    const namePrefix = "A Long Player Identity Name";
    await page.goto(`/tests/browser/fixture.html?state=normal&count=${count}&playerNamePrefix=${encodeURIComponent(namePrefix)}`);

    const board = page.locator(".player-board");
    await expect(board).toHaveAttribute("data-player-count", String(count));
    const seats = page.locator(".opponent-player-card[data-player-anchor]");
    await expect(seats).toHaveCount(count - 1);
    for (let index = 2; index <= count; index += 1) {
      const seat = page.locator(`[data-player-anchor="p${index}"]`);
      const playerName = seat.locator(".opponent-player-name");
      const heroName = seat.locator(".opponent-hero-name");
      const expectedName = `${namePrefix} ${index}`;
      await expect(playerName).toBeVisible();
      await expect(playerName).toHaveAttribute("aria-label", expectedName);
      await expect(playerName).toHaveAttribute("title", expectedName);
      await expect(heroName).toBeVisible();

      const geometry = await seat.evaluate((element) => {
        const bounds = (node) => {
          if (!node) return null;
          const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
          return { left, right, top, bottom, width, height };
        };
        const overlap = (a, b) => a && b && Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
          * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) > 0;
        const name = element.querySelector(".opponent-player-name");
        const nameStyle = getComputedStyle(name);
        const nameBounds = bounds(name);
        return {
          topology: element.closest(".player-board").dataset.seatTopology,
          name: nameBounds,
          nameFontSize: Number.parseFloat(nameStyle.fontSize),
          nameDisplay: nameStyle.display,
          nameOverflowBehavior: nameStyle.overflow,
          nameOverflow: nameStyle.textOverflow,
          nameWhiteSpace: nameStyle.whiteSpace,
          heroFontSize: Number.parseFloat(getComputedStyle(element.querySelector(".opponent-hero-name")).fontSize),
          hero: bounds(element.querySelector(".opponent-hero-name")),
          hp: bounds(element.querySelector(".player-hp")),
          switch: bounds(element.querySelector(".test-view-switch-button")),
          playerNameOverlapsHero: overlap(nameBounds, bounds(element.querySelector(".opponent-hero-name"))),
          playerNameOverlapsHp: overlap(nameBounds, bounds(element.querySelector(".player-hp"))),
          playerNameOverlapsSwitch: overlap(nameBounds, bounds(element.querySelector(".test-view-switch-button"))),
          fullName: name.getAttribute("aria-label"),
        };
      });
      expect(geometry.nameDisplay).not.toBe("none");
      expect(geometry.nameFontSize).toBeGreaterThanOrEqual(9);
      expect(geometry.heroFontSize).toBeGreaterThan(geometry.nameFontSize);
      expect(geometry.name.width).toBeGreaterThan(0);
      expect(geometry.name.height).toBeGreaterThan(0);
      expect(geometry.nameOverflowBehavior).toBe("hidden");
      expect(geometry.nameOverflow).toBe("ellipsis");
      expect(geometry.nameWhiteSpace).toBe("nowrap");
      expect(geometry.fullName).toBe(expectedName);
      expect(geometry.playerNameOverlapsHero).toBe(false);
      expect(geometry.playerNameOverlapsHp).toBe(false);
      expect(geometry.playerNameOverlapsSwitch).toBe(false);
      expect(geometry.topology).toBe(count >= 5 ? "side-column" : "top-row");
      await expect(seat.getByTestId(`test-view-switch-p${index}`)).toBeVisible();
    }
  });
  }
}
