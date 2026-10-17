import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

test.use({ hasTouch: true });

const h2EvidenceRoot = process.env.H2_F_EVIDENCE_DIR;

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
  { state: "dodge-no-provider", requirement: "dodge", label: "Skip" },
  { state: "duel-no-attack", requirement: "attack", label: "Skip" },
  { state: "dodge", requirement: "dodge", label: "Skip" },
  { state: "duel-response", requirement: "attack", label: "Skip" },
  { state: "provider-extra", requirement: "attack", label: "Skip" },
  { state: "raining-arrows-response", requirement: "dodge", label: "TAKE DAMAGE" },
]) {
  test(`UI-2 ${scenario.state} uses only its proven damage-decline context`, async ({ page }) => {
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

const H2_VIEWPORTS = [
  { width: 390, height: 900 },
  { width: 440, height: 894 },
  { width: 480, height: 900 },
  { width: 1280, height: 900 },
];
const H2_FOUR_SEAT_VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 390, height: 700 },
  { width: 440, height: 894 },
  { width: 480, height: 900 },
  { width: 1280, height: 900 },
];

for (const count of [4, 6, 8, 10]) {
  const viewports = count === 4 ? H2_FOUR_SEAT_VIEWPORTS : H2_VIEWPORTS;
  for (const viewport of viewports) {
  const { width, height } = viewport;
  test(`H2 separates opponent Hero, player, HP and Equipment at ${count} seats / ${width}x${height}`, async ({ page }, testInfo) => {
    await page.setViewportSize(viewport);
    const namePrefix = width === 390 && height === 700 ? "诸葛孔明的长玩家姓名" : "A Long Player Identity Name";
    await page.goto(`/tests/browser/fixture.html?state=normal&count=${count}&equipmentCase=matrix&judgementCase=public-lightning&lowHpSeat=p2&defeatedSeat=p4&turnSeat=1&playerNamePrefix=${encodeURIComponent(namePrefix)}`);

    const board = page.locator(".player-board");
    await expect(board).toHaveAttribute("data-player-count", String(count));
    const seats = page.locator(".opponent-player-card[data-player-anchor]");
    await expect(seats).toHaveCount(count - 1);
    const measuredSeats = [];
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
        const anchorBounds = bounds(element);
        const cardWidth = 48;
        const cardHeight = 72;
        const centerX = (anchorBounds.left + anchorBounds.right) / 2;
        const centerY = (anchorBounds.top + anchorBounds.bottom) / 2;
        const historySlots = [
          { left: centerX - cardWidth / 2, right: centerX + cardWidth / 2, top: anchorBounds.bottom + 6, bottom: anchorBounds.bottom + 6 + cardHeight },
          { left: anchorBounds.left - 6 - cardWidth, right: anchorBounds.left - 6, top: centerY - cardHeight / 2, bottom: centerY + cardHeight / 2 },
          { left: anchorBounds.right + 6, right: anchorBounds.right + 6 + cardWidth, top: centerY - cardHeight / 2, bottom: centerY + cardHeight / 2 },
          { left: centerX - cardWidth / 2, right: centerX + cardWidth / 2, top: anchorBounds.top - 6 - cardHeight, bottom: anchorBounds.top - 6 },
        ];
        const equipmentBounds = bounds(element.querySelector(".opponent-equipment-summary"));
        const judgementNode = element.querySelector(".opponent-judgement-zone");
        const judgementStyle = judgementNode ? getComputedStyle(judgementNode) : null;
        const judgementVisible = Boolean(judgementNode && judgementStyle?.display !== "none"
          && judgementStyle?.visibility !== "hidden" && bounds(judgementNode).width > 0 && bounds(judgementNode).height > 0);
        const judgementBounds = judgementVisible ? bounds(judgementNode) : null;
        const visibleJudgementCards = [...element.querySelectorAll(".opponent-judgement-zone .mini-zone-card")]
          .filter((node) => {
            const style = getComputedStyle(node);
            const rect = bounds(node);
            return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
          })
          .map(bounds);
        return {
          topology: element.closest(".player-board").dataset.seatTopology,
          anchor: anchorBounds,
          portrait: bounds(element.querySelector(".opponent-hero-card")),
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
          nameStrip: bounds(element.querySelector(".opponent-player-name-strip")),
          equipmentRow: bounds(element.querySelector(".opponent-equipment-summary")),
          judgement: judgementBounds,
          judgementExists: Boolean(judgementNode),
          judgementVisible,
          judgementCards: visibleJudgementCards,
          equipmentPosition: getComputedStyle(element.querySelector(".opponent-equipment-summary")).position,
          indicators: [...element.querySelectorAll(".opponent-equipment-indicator")].map((node) => ({
            rect: bounds(node),
            slot: node.getAttribute("data-slot"),
          })),
          historyParkingSlots: historySlots,
          equipmentOverlapsHistorySlot: historySlots.some((slot) => overlap(equipmentBounds, slot)),
          equipmentOverlapsJudgement: Boolean(overlap(equipmentBounds, judgementBounds)),
          playerNameOverlapsHero: overlap(nameBounds, bounds(element.querySelector(".opponent-hero-name"))),
          heroOverlapsHp: overlap(bounds(element.querySelector(".opponent-hero-name")), bounds(element.querySelector(".player-hp"))),
          heroOverlapsSwitch: overlap(bounds(element.querySelector(".opponent-hero-name")), bounds(element.querySelector(".test-view-switch-button"))),
          hpOverlapsSwitch: overlap(bounds(element.querySelector(".player-hp")), bounds(element.querySelector(".test-view-switch-button"))),
          fullName: name.getAttribute("aria-label"),
        };
      });
      expect(geometry.nameDisplay).not.toBe("none");
      expect(geometry.nameFontSize).toBeGreaterThanOrEqual(9);
      expect(geometry.heroFontSize).toBeGreaterThanOrEqual(9);
      if (count === 4 && width >= 390 && width <= 480) {
        expect(geometry.heroFontSize, "four-seat phone Hero names use the refined 10–11px size").toBeGreaterThanOrEqual(10);
        expect(geometry.heroFontSize, "four-seat phone Hero names remain within the approved modest reduction").toBeLessThanOrEqual(11);
        expect(geometry.nameFontSize, "four-seat phone player names use the refined 9–10px size").toBeGreaterThanOrEqual(9);
        expect(geometry.nameFontSize, "four-seat phone player names remain legible").toBeLessThanOrEqual(10);
      }
      expect(geometry.name.width).toBeGreaterThan(0);
      expect(geometry.name.height).toBeGreaterThan(0);
      expect(geometry.nameOverflowBehavior).toBe("hidden");
      expect(geometry.nameOverflow).toBe("ellipsis");
      expect(geometry.nameWhiteSpace).toBe("nowrap");
      expect(geometry.fullName).toBe(expectedName);
      expect(geometry.portrait.left).toBeLessThanOrEqual(geometry.hero.left);
      expect(geometry.portrait.right).toBeGreaterThanOrEqual(geometry.hero.right);
      expect(geometry.portrait.top).toBeLessThanOrEqual(geometry.hero.top);
      expect(geometry.portrait.bottom).toBeGreaterThanOrEqual(geometry.hero.bottom);
      expect(geometry.nameStrip.top).toBeGreaterThanOrEqual(geometry.portrait.bottom - 0.5);
      expect(geometry.nameStrip.bottom).toBeLessThanOrEqual(geometry.equipmentRow.top + 0.5);
      expect(geometry.equipmentPosition).toBe("static");
      expect(geometry.equipmentRow.top).toBeGreaterThanOrEqual(geometry.nameStrip.bottom - 0.5);
      expect(geometry.equipmentRow.bottom).toBeLessThanOrEqual(geometry.anchor.bottom + 0.5);
      expect(geometry.hp.right).toBeGreaterThan(geometry.portrait.left + geometry.portrait.width * 0.65);
      expect(geometry.hp.top).toBeLessThan(geometry.portrait.top + geometry.portrait.height * 0.7);
      expect(geometry.hp.right).toBeLessThanOrEqual(geometry.portrait.right + 0.5);
      expect(geometry.heroOverlapsHp).toBe(false);
      expect(geometry.heroOverlapsSwitch).toBe(false);
      expect(geometry.hpOverlapsSwitch).toBe(false);
      expect(geometry.indicators.every(({ rect }) => rect.left >= geometry.equipmentRow.left - 0.5
        && rect.right <= geometry.equipmentRow.right + 0.5
        && rect.top >= geometry.equipmentRow.top - 0.5
        && rect.bottom <= geometry.equipmentRow.bottom + 0.5)).toBe(true);
      expect(geometry.indicators.every(({ rect }) => rect.width >= 12 && rect.height >= 12)).toBe(true);
      expect(geometry.equipmentOverlapsHistorySlot).toBe(false);
      expect(geometry.equipmentOverlapsJudgement).toBe(false);
      if (index === 3) {
        expect(geometry.judgementExists).toBe(true);
        expect(geometry.judgementVisible).toBe(false);
        expect(geometry.judgementCards).toHaveLength(0);
      }
      if (geometry.equipmentRow.width >= 68) {
        expect(geometry.indicators.every(({ rect }) => rect.width >= 14 && rect.height >= 14)).toBe(true);
      }
      expect(geometry.topology).toBe(count >= 5 ? "side-column" : "top-row");
      measuredSeats.push({ playerId: `p${index}`, ...geometry });
      if (index === 2) {
        await expect(seat.locator(".player-hp")).toHaveText("HP 1/4");
        await expect(seat).toHaveClass(/turn-square/);
      }
      if (index === 4) {
        await expect(seat.locator(".player-hp")).toHaveText("HP 0/4");
        await expect(seat).toHaveClass(/defeated-square/);
      }
      await expect(seat.getByTestId(`test-view-switch-p${index}`)).toBeVisible();
    }
    await testInfo.attach(`H2-seat-geometry-${count}-${width}`, {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
    await testInfo.attach(`H2-seat-rectangles-${count}-${width}`, {
      body: Buffer.from(JSON.stringify({ viewport, seats: measuredSeats }, null, 2)),
      contentType: "application/json",
    });
    if (h2EvidenceRoot) {
      await mkdir(h2EvidenceRoot, { recursive: true });
      const label = `${count}-seats-${width}x${height}`;
      await page.screenshot({ path: join(h2EvidenceRoot, `${label}.png`), animations: "disabled" });
      await writeFile(join(h2EvidenceRoot, `${label}.json`), `${JSON.stringify({ viewport, seats: measuredSeats }, null, 2)}\n`);
    }
  });
  }
}

for (const width of [390, 440, 480, 1280]) {
  test(`H2 top-row four-seat Equipment reserves a separate 0/1/4 glyph row at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const scenario of [
      { equipmentCase: "empty", slots: 0 },
      { equipmentCase: "weapon", slots: 1 },
      { equipmentCase: "multiple", slots: 4 },
    ]) {
      await page.goto(`/tests/browser/fixture.html?state=normal&count=4&equipmentCase=${scenario.equipmentCase}&playerNamePrefix=Seat`);
      const seat = page.locator('[data-player-anchor="p2"]');
      const row = seat.locator(".opponent-equipment-summary");
      await expect(row).toHaveAttribute("data-slot-count", String(scenario.slots));
      await expect(row.locator(".opponent-equipment-indicator")).toHaveCount(scenario.slots);
      const measured = await seat.evaluate((element) => {
        const read = (node) => {
          const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
          return { left, right, top, bottom, width, height };
        };
        const art = read(element.querySelector(".opponent-hero-card"));
        const name = read(element.querySelector(".opponent-player-name-strip"));
        const equipment = read(element.querySelector(".opponent-equipment-summary"));
        const indicators = [...element.querySelectorAll(".opponent-equipment-indicator")].map(read);
        return { art, name, equipment, indicators, anchor: read(element) };
      });
      expect(measured.name.top).toBeGreaterThanOrEqual(measured.art.bottom - 0.5);
      expect(measured.equipment.top).toBeGreaterThanOrEqual(measured.name.bottom - 0.5);
      expect(measured.equipment.bottom).toBeLessThanOrEqual(measured.anchor.bottom + 0.5);
      expect(measured.indicators.every((icon) => icon.left >= measured.equipment.left - 0.5
        && icon.right <= measured.equipment.right + 0.5
        && icon.top >= measured.equipment.top - 0.5
        && icon.bottom <= measured.equipment.bottom + 0.5)).toBe(true);
    }
  });
}

for (const { count, topology } of [{ count: 4, topology: "top-row" }, { count: 8, topology: "side-column" }]) {
  test(`H2 target-selection affordance remains separate from portrait identity at ${count} seats`, async ({ page }) => {
    await page.setViewportSize({ width: 440, height: 894 });
    await page.goto(`/tests/browser/fixture.html?state=long-guidance&count=${count}&equipmentCase=multiple&playerNamePrefix=Target`);
    await page.getByRole("button", { name: "Assault", exact: true }).click();
    const seat = page.locator('[data-player-anchor="p2"]');
    await expect(page.locator(`.player-board[data-seat-topology="${topology}"]`)).toBeVisible();
    await expect(seat).toHaveAttribute("data-target-selectable", "true");
    await expect(seat.locator(".opponent-hero-target")).toBeEnabled();
    const geometry = await seat.evaluate((element) => {
      const rect = (node) => {
        const { left, right, top, bottom } = node.getBoundingClientRect();
        return { left, right, top, bottom };
      };
      const overlap = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left))
        * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) > 0;
      return {
        hero: rect(element.querySelector(".opponent-hero-name")),
        hp: rect(element.querySelector(".player-hp")),
        switch: rect(element.querySelector(".test-view-switch-button")),
        row: rect(element.querySelector(".opponent-equipment-summary")),
        anchor: rect(element),
        target: rect(element.querySelector(".opponent-hero-target")),
        heroHitsHp: overlap(rect(element.querySelector(".opponent-hero-name")), rect(element.querySelector(".player-hp"))),
        heroHitsSwitch: overlap(rect(element.querySelector(".opponent-hero-name")), rect(element.querySelector(".test-view-switch-button"))),
        hpHitsSwitch: overlap(rect(element.querySelector(".player-hp")), rect(element.querySelector(".test-view-switch-button"))),
      };
    });
    expect(geometry.heroHitsHp).toBe(false);
    expect(geometry.heroHitsSwitch).toBe(false);
    expect(geometry.hpHitsSwitch).toBe(false);
    expect(geometry.row.bottom).toBeLessThanOrEqual(geometry.anchor.bottom + 0.5);
    expect(geometry.target.top).toBeLessThanOrEqual(geometry.hero.top);
    await seat.locator(".opponent-hero-target").click();
    await expect(seat).toHaveClass(/selected-target/);
  });
}
