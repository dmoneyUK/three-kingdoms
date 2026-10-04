import { expect, test } from "@playwright/test";

const MATRIX = [
  { width: 1440, height: 900, counts: [2, 4, 6, 10] },
  { width: 650, height: 900, counts: [4, 6, 10] },
  { width: 480, height: 900, counts: [4, 6, 10] },
];

const TOPOLOGY_MATRIX = [
  { width: 1440, height: 900 },
  { width: 650, height: 900 },
  { width: 480, height: 900 },
];

const INTERACTION_STATES = [
  { state: "interaction", label: "Interaction", viewerId: "p1", publicPrimaryPlayerId: "p1", projectedPlayerId: "p2" },
  { state: "negation", label: "Negation", viewerId: "p2", publicPrimaryPlayerId: "p2", projectedPlayerId: "p1" },
  { state: "dying", label: "Dying", viewerId: "p3", publicPrimaryPlayerId: "p2", projectedPlayerId: "p2" },
];

const HERO_FOCUS_VIEWPORTS = [
  { width: 1440, height: 900, minimumPortrait: { width: 88, height: 112 } },
  { width: 650, height: 900, minimumPortrait: { width: 72, height: 90 } },
  { width: 480, height: 900, minimumPortrait: { width: 64, height: 80 } },
];

const VIS_04B_VIEWPORTS = [
  { width: 1440, height: 900, seat: { width: 180, height: 108 }, focus: { width: 90, height: 113 }, medium: { width: 56, height: 70 }, previousTop: "385px" },
  { width: 650, height: 900, seat: { width: 112, height: 88 }, focus: { width: 72, height: 90 }, medium: { width: 48, height: 60 }, previousTop: "319px" },
  { width: 480, height: 900, seat: { width: 100, height: 78 }, focus: { width: 64, height: 80 }, medium: { width: 42, height: 53 }, previousTop: "326px" },
];

const VIS_04B_ACTIVE_STATES = [
  { state: "interaction", label: "Interaction" },
  { state: "negation", label: "Negation" },
  { state: "dying", label: "Dying" },
  { state: "group-observer", label: "Group observer" },
];

const VIS_04C_VIEWPORTS = [
  { width: 1440, height: 900, boardInset: 68, seat: { width: 180, height: 108 }, seatLefts: [10, 630, 1250] },
  { width: 650, height: 900, boardInset: 60, seat: { width: 112, height: 88 }, seatLefts: [21.5, 269, 516.5] },
  { width: 480, height: 900, boardInset: 55, seat: { width: 100, height: 78 }, seatLefts: [15.5, 190, 364.5] },
];

function expectedVis12bSeatWidth(boardWidth) {
  return Math.min(146, (boardWidth - 18) / 3);
}

async function loadFixture(page, { state = "normal", count = 4, width, height, reducedMotion = false, handSize, equipmentCase, hero, source }) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}${handSize === undefined ? "" : `&handSize=${handSize}`}${equipmentCase ? `&equipmentCase=${equipmentCase}` : ""}${hero ? `&hero=${encodeURIComponent(hero)}` : ""}${source ? `&source=${encodeURIComponent(source)}` : ""}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function readHandViewport(rail) {
  return rail.evaluate((element) => {
    const viewport = element.getBoundingClientRect();
    const cards = Array.from(element.querySelectorAll("[data-hand-card-id]")).map((slot, index) => {
      const bounds = slot.getBoundingClientRect();
      return {
        id: slot.dataset.handCardId,
        index,
        left: bounds.left - viewport.left,
        right: bounds.right - viewport.left,
        visible: bounds.left < viewport.right && bounds.right > viewport.left,
        fullyVisible: bounds.left >= viewport.left && bounds.right <= viewport.right,
      };
    });
    return { scrollLeft: element.scrollLeft, viewportWidth: viewport.width, scrollWidth: element.scrollWidth, cards };
  });
}

function visibleHandAnchor(snapshot) {
  return snapshot.cards
    .filter((card) => card.visible)
    .sort((left, right) => Math.abs((left.left + left.right) / 2 - snapshot.viewportWidth / 2) - Math.abs((right.left + right.right) / 2 - snapshot.viewportWidth / 2) || left.index - right.index)[0];
}

for (const width of [1440, 650, 480, 360, 320]) {
  for (const handSize of [5, 10, 15, 20, 25, 30]) {
    const task = width <= 360 ? "UX2.0VIS-12F" : "UX2.0VIS-09B";
    test(`${task} ${handSize} hand cards at ${width}px fit or scroll in one layer`, async ({ page }, testInfo) => {
      await loadFixture(page, { width, height: 900, handSize });
      const rail = page.locator(".local-hand-rail");
      await expect(rail).toHaveAttribute("data-hand-layout", "measured");
      const measure = () => rail.evaluate((element) => {
        const rect = (node) => {
          const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
          return { left, right, top, bottom, width, height };
        };
        return {
          viewport: rect(element), available: element.clientWidth, extent: element.scrollWidth,
          pageWidth: document.documentElement.scrollWidth,
          cards: [...element.querySelectorAll(".game-card")].map(rect),
          ids: [...element.querySelectorAll("[data-hand-card-id]")].map((card) => card.dataset.handCardId),
          actionTop: document.querySelector(".turn-controls").getBoundingClientRect().top,
        };
      });
      const initial = await measure();
      expect(initial.ids).toEqual(Array.from({ length: handSize }, (_, i) => `browser-hand-${i + 1}`));
      expect(initial.pageWidth).toBeLessThanOrEqual(width);
      for (const [i, card] of initial.cards.entries()) {
        expect(card.width).toBeCloseTo(68, 0);
        expect(card.height).toBeCloseTo(102, 0);
        expect(card.top).toBeCloseTo(initial.cards[0].top, 0);
        expect(card.bottom).toBeLessThanOrEqual(initial.actionTop);
        if (i) expect(card.left - initial.cards[i - 1].left).toBeGreaterThanOrEqual(29.9);
      }
      const overflows = 68 + (handSize - 1) * 30 > initial.available + 1;
      if (overflows) {
        expect(initial.extent).toBeGreaterThan(initial.available);
        await page.mouse.move(initial.viewport.left + 80, initial.cards[0].bottom - 10);
        await page.mouse.wheel(10000, 0);
        await expect.poll(async () => (await measure()).cards.at(-1).right)
          .toBeLessThanOrEqual(initial.viewport.right + 1);
      } else {
        expect(initial.extent).toBeLessThanOrEqual(initial.available + 1);
      }
      const last = rail.locator(`[data-hand-card-id="browser-hand-${handSize}"]`);
      await last.locator(".game-card").click();
      await expect(last.locator(".game-card")).toHaveClass(/selected/);
      await expect.poll(async () => {
        const geometry = await measure();
        return geometry.cards[0].top - geometry.cards.at(-1).top;
      }).toBeCloseTo(65, 0);
      const selected = await measure();
      expect(selected.cards.at(-1).top).toBeGreaterThanOrEqual(selected.viewport.top - 1);
      expect(selected.cards.at(-1).bottom).toBeLessThanOrEqual(selected.viewport.bottom + 1);
      expect(selected.cards.at(-1).right).toBeLessThanOrEqual(selected.viewport.right + 1);
      expect(selected.cards.at(-1).top).toBeCloseTo(selected.cards[0].top - 65, 0);
      expect(selected.cards.at(-1).bottom).toBeLessThanOrEqual(selected.actionTop);
      if (width <= 360 && handSize === 25) {
        await testInfo.attach(`vis-12f-hand-${width}-25-cards-selected`, {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      }
      await last.locator(".card-info-button").click();
      await expect(page.getByRole("dialog").getByRole("heading", { name: "Attack", exact: true })).toBeVisible();
      await page.getByRole("button", { name: "Close card explanation" }).click();
      // The transparent space reserved for lifted cards must not steal skill hits.
      expect(await page.locator(".hero-skill-button").first().evaluate((button) => {
        const r = button.getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2)?.closest(".hero-skill-button") === button;
      })).toBe(true);
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
      if (overflows) {
        await rail.focus();
        const previousOffset = await rail.evaluate((element) => element.scrollLeft);
        const keyboardScrollFinished = rail.evaluate((element) => new Promise((resolve) => {
          element.addEventListener("scrollend", () => resolve(), { once: true });
        }));
        await page.keyboard.press("ArrowLeft");
        await keyboardScrollFinished;
        expect(await rail.evaluate((element) => element.scrollLeft)).toBeLessThan(previousOffset);
        const current = await measure();
        await page.mouse.move(current.viewport.left + 80, current.cards[0].bottom - 10);
        await page.mouse.wheel(-10000, 0);
        await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBe(0);
        const first = rail.locator('[data-hand-card-id="browser-hand-1"] .game-card');
        await first.click({ position: { x: 10, y: 50 } });
        await expect(first).toHaveClass(/selected/);
      }
    });
  }
}

test("UX2.0VIS-09B tapping a clipped edge reveals that same physical card", async ({ page }) => {
  await loadFixture(page, { width: 480, height: 900, handSize: 25 });
  const rail = page.locator(".local-hand-rail");
  await expect(rail).toHaveAttribute("data-hand-layout", "measured");
  const bounds = await rail.boundingBox();
  const baseline = await rail.locator(".game-card").first().boundingBox();
  await page.mouse.move(bounds.x + 80, baseline.y + 50);
  await page.mouse.wheel(15, 0);
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBe(15);
  // Direct user coordinates avoid Playwright's automatic scrollIntoView.
  await page.mouse.click(bounds.x + 5, baseline.y + 50);
  await expect(rail.locator('[data-hand-card-id="browser-hand-1"] .game-card')).toHaveClass(/selected/);
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBe(0);
  await page.mouse.move(bounds.x + 80, baseline.y + 50);
  await page.mouse.wheel(120, 0);
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBe(120);
  const edge = await rail.evaluate((element) => {
    const viewport = element.getBoundingClientRect();
    const slot = [...element.querySelectorAll("[data-hand-card-id]")].filter((node) => {
      const r = node.getBoundingClientRect();
      return r.left < viewport.right - 8 && r.right > viewport.right;
    }).at(-1);
    const r = slot.getBoundingClientRect();
    return { id: slot.dataset.handCardId, x: r.left + 5, y: r.top + 50 };
  });
  await page.mouse.click(edge.x, edge.y);
  const selected = rail.locator(`[data-hand-card-id="${edge.id}"] .game-card`);
  await expect(selected).toHaveClass(/selected/);
  await expect.poll(async () => {
    const r = await selected.boundingBox();
    return r.x + r.width;
  }).toBeLessThanOrEqual(bounds.x + bounds.width + 1);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

test.describe("UX2.0VIS-09B native touch navigation", () => {
  test.use({ hasTouch: true });
  for (const width of [320, 360, 480, 650]) {
    const task = width <= 360 ? "UX2.0VIS-12F" : "UX2.0VIS-09B";
    test(`${task} ${width}px native pan scrolls without selecting or submitting`, async ({ page, context }) => {
      await loadFixture(page, { width, height: 900, handSize: 25 });
      const rail = page.locator(".local-hand-rail");
      await expect(rail).toHaveAttribute("data-hand-layout", "measured");
      const viewport = await rail.boundingBox();
      const first = await rail.locator(".game-card").first().boundingBox();
      const cdp = await context.newCDPSession(page);
      const startX = Math.round(viewport.x + viewport.width - 40);
      const touchY = Math.round(first.y + 50);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: startX, y: touchY, id: 0 }],
      });
      // Send an explicit browser touch sequence instead of relying on
      // Chromium's platform-dependent synthesized-scroll helper. This still
      // exercises native overflow scrolling and click suppression.
      for (let step = 1; step <= 6; step += 1) {
        await cdp.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ x: Math.round(startX - (220 * step) / 6), y: touchY, id: 0 }],
        });
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(30);
      await expect(rail.locator(".game-card.selected")).toHaveCount(0);
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
      await cdp.detach();
    });

    test(`${task} ${width}px ordinary touch tap selects a card and opens its explanation`, async ({ page }) => {
      await loadFixture(page, { width, height: 900, handSize: 25 });
      const rail = page.locator(".local-hand-rail");
      await expect(rail).toHaveAttribute("data-hand-layout", "measured");
      const tapTarget = await rail.evaluate((element) => {
        const viewport = element.getBoundingClientRect();
        const slot = [...element.querySelectorAll("[data-hand-card-id]")].find((node) => {
          const r = node.getBoundingClientRect();
          return r.left >= viewport.left && r.right <= viewport.right;
        });
        const r = slot.getBoundingClientRect();
        return { id: slot.dataset.handCardId, x: r.left + 8, y: r.top + 45 };
      });
      const hitCardId = await page.evaluate(({ x, y }) =>
        document.elementFromPoint(x, y)?.closest("[data-hand-card-id]")?.getAttribute("data-hand-card-id"), tapTarget);
      expect(hitCardId).toBe(tapTarget.id);
      await page.touchscreen.tap(tapTarget.x, tapTarget.y);
      const selected = rail.locator(`[data-hand-card-id="${tapTarget.id}"]`);
      await expect(selected.locator(".game-card")).toHaveClass(/selected/);
      await selected.locator(".card-info-button").tap();
      await expect(page.getByRole("dialog").getByRole("heading", { name: "Attack", exact: true })).toBeVisible();
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
    });
  }
});

test.describe("UX2.0VIS-09C preserve the Hand viewport across membership changes", () => {
  for (const width of [480, 650]) {
    test(`${width}px preserves a surviving anchor and uses a nearby survivor when it is removed`, async ({ page }) => {
      await loadFixture(page, { width, height: 900, handSize: 25 });
      const rail = page.locator(".local-hand-rail");
      await expect(rail).toHaveAttribute("data-hand-layout", "measured");
      await rail.evaluate((element) => { element.scrollLeft = (element.scrollWidth - element.clientWidth) * 0.45; });
      await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(30);

      const initial = await readHandViewport(rail);
      const anchor = visibleHandAnchor(initial);
      expect(anchor).toBeTruthy();
      expect(anchor.index).toBeGreaterThan(3);
      const remainingIds = initial.cards.slice(3).map((card) => card.id);
      await page.evaluate((ids) => window.__setBrowserHandIds(ids), remainingIds);
      await expect(rail.locator('[data-hand-card-id="browser-hand-1"]')).toHaveCount(0);
      await expect.poll(async () => {
        const snapshot = await readHandViewport(rail);
        return Math.abs(snapshot.cards.find((card) => card.id === anchor.id).left - anchor.left);
      }).toBeLessThanOrEqual(1);

      const beforeAnchorRemoval = await readHandViewport(rail);
      const removedAnchor = visibleHandAnchor(beforeAnchorRemoval);
      const nearbySurvivor = beforeAnchorRemoval.cards
        .filter((card) => card.visible && card.id !== removedAnchor.id)
        .sort((left, right) => Math.abs(left.index - removedAnchor.index) - Math.abs(right.index - removedAnchor.index) || left.index - right.index)[0];
      expect(nearbySurvivor).toBeTruthy();
      const afterAnchorRemovalIds = beforeAnchorRemoval.cards.filter((card) => card.id !== removedAnchor.id).map((card) => card.id);
      await page.evaluate((ids) => window.__setBrowserHandIds(ids), afterAnchorRemovalIds);
      await expect(rail.locator(`[data-hand-card-id="${removedAnchor.id}"]`)).toHaveCount(0);
      await expect.poll(async () => {
        const snapshot = await readHandViewport(rail);
        return Math.abs(snapshot.cards.find((card) => card.id === nearbySurvivor.id).left - nearbySurvivor.left);
      }).toBeLessThanOrEqual(1);
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
    });

    test(`${width}px appending cards does not move the viewport or change selection`, async ({ page }) => {
      await loadFixture(page, { width, height: 900, handSize: 25 });
      const rail = page.locator(".local-hand-rail");
      await expect(rail).toHaveAttribute("data-hand-layout", "measured");
      await rail.evaluate((element) => { element.scrollLeft = (element.scrollWidth - element.clientWidth) * 0.5; });
      await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(30);

      const initial = await readHandViewport(rail);
      const selected = initial.cards.find((card) => card.fullyVisible && card.index > 0);
      expect(selected).toBeTruthy();
      const selectedCard = rail.locator(`[data-hand-card-id="${selected.id}"] .game-card`);
      await selectedCard.click({ position: { x: 8, y: 45 } });
      await expect(selectedCard).toHaveClass(/selected/);

      const beforeAppend = await readHandViewport(rail);
      const anchor = visibleHandAnchor(beforeAppend);
      expect(anchor).toBeTruthy();
      const appendedIds = [...beforeAppend.cards.map((card) => card.id), "browser-hand-added-1", "browser-hand-added-2", "browser-hand-added-3"];
      await page.evaluate((ids) => window.__setBrowserHandIds(ids), appendedIds);
      await expect(rail.locator('[data-hand-card-id="browser-hand-added-3"]')).toHaveCount(1);
      await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeCloseTo(beforeAppend.scrollLeft, 0);
      await expect.poll(async () => {
        const snapshot = await readHandViewport(rail);
        return Math.abs(snapshot.cards.find((card) => card.id === anchor.id).left - anchor.left);
      }).toBeLessThanOrEqual(1);
      await expect(rail.locator(`[data-hand-card-id="${selected.id}"] .game-card`)).toHaveClass(/selected/);
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
    });
  }
});

test.describe("UX2.0VIS-10A / VIS-11A short-portrait Top Row Stage containment", () => {
  const states = [
    { state: "interaction", required: [".hero-focus", ".interaction-stage-meta-region"] },
    { state: "negation", required: [".hero-focus", '[data-reaction-chain="proven"]', '[data-reaction-node="root"]', '[data-reaction-node="active"]', ".interaction-stage-meta-region"] },
    { state: "dying", required: [".hero-focus", '[data-dying-handoff="proven"]', ".dying-handoff-grid", ".dying-handoff-guidance"] },
    { state: "group-observer", required: [".hero-focus", ".medium-participant-card", '[data-group-target-scope="original"]', ".interaction-stage-meta-region"] },
    { state: "long-guidance", required: [".hero-focus", ".interaction-stage-meta-region"] },
  ];
  for (const viewport of [{ width: 480, height: 640 }, { width: 650, height: 700 }, { width: 320, height: 640 }, { width: 360, height: 640 }]) {
    for (const { state, required } of states) {
      test(`${state} at ${viewport.width}x${viewport.height} stays inside the Safe Zone without losing Stage content`, async ({ page }) => {
        await loadFixture(page, { state, count: 4, ...viewport, handSize: 25 });
        const stage = page.locator('.play-table[data-seat-topology="top-row"] .interaction-stage');
        const dock = page.locator(".local-player-dock");
        await expect(stage).toBeVisible();
        for (const selector of required) await expect(stage.locator(selector)).toBeVisible();
        const heroFocus = stage.locator(".hero-focus");
        await expect(heroFocus.locator(".hero-focus-identity b")).not.toHaveText("");
        await expect(heroFocus.locator(".hero-focus-identity span")).toBeVisible();
        await expect(heroFocus.locator(".hero-focus-identity small")).toBeVisible();
        if (state === "negation") {
          await expect(stage.locator('[data-reaction-node="root"] b, [data-reaction-node="root"] span')).toHaveCount(2);
          await expect(stage.locator('[data-reaction-node="active"] b')).toBeVisible();
          await expect(stage.locator('[data-reaction-node="active"] span')).toBeVisible();
        }
        if (state === "dying") {
          await expect(stage.locator(".dying-handoff > header strong")).toBeVisible();
          await expect(stage.locator(".dying-handoff-grid > span")).toHaveCount(3);
          await expect(stage.locator(".dying-handoff-guidance")).not.toHaveText("");
        }
        if (state === "group-observer") {
          await expect(stage.locator(".medium-participant-identity b")).not.toHaveText("");
          await expect(stage.locator(".medium-participant-identity span")).toBeVisible();
          await expect(stage.locator('[data-group-target-scope="original"] .group-target-card')).toHaveCount(1);
          await expect(stage.locator('[data-group-target-scope="original"] .group-target-identity b')).not.toHaveText("");
        }
        if (state !== "dying") {
          await expect(stage.locator(".interaction-stage-meta-region .interaction-stage-focus")).toBeVisible();
          const sourceAlreadyVisible = await stage.locator(".medium-participant-card, .hero-focus-source").count() > 0;
          await expect(stage.locator(".interaction-stage-focus > [data-stage-meta-role]")).toHaveCount(sourceAlreadyVisible ? 1 : 2);
          await expect(stage.locator('[data-stage-meta-role="focus"], [data-stage-meta-role="scope"]')).toBeVisible();
        }
        for (const selector of [".local-hero-card", ".local-status-panel", ".local-equipment-panel", ".local-hand-rail", ".console-guidance", ".turn-controls"]) {
          await expect(dock.locator(selector), `the persistent Dock must retain ${selector}`).toBeVisible();
        }
        if (state === "long-guidance") {
          const guidance = dock.locator(".console-guidance .decision-status");
          await expect(guidance).not.toHaveText("");
          expect(await guidance.evaluate((element) => element.scrollHeight <= element.clientHeight + 1), "required long guidance stays fully readable").toBe(true);
        }
        await expect(dock.locator(".local-hand-rail")).toHaveAttribute("data-hand-layout", "measured");

        const layout = await page.evaluate(() => {
          const rect = (selector) => {
            const element = document.querySelector(selector);
            if (!element) return null;
            const bounds = element.getBoundingClientRect();
            return { top: bounds.top, bottom: bounds.bottom, left: bounds.left, right: bounds.right };
          };
          const overlap = (left, right) => Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left))
            * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
          const stage = document.querySelector('.play-table[data-seat-topology="top-row"] .interaction-stage');
          const safeZone = document.querySelector('.play-table[data-seat-topology="top-row"] > .interaction-safe-zone');
          const dock = document.querySelector('.local-player-dock');
          const stageBounds = stage.getBoundingClientRect();
          const safeZoneBounds = safeZone.getBoundingClientRect();
          const dockBounds = dock.getBoundingClientRect();
          const bounds = (element) => {
            const value = element.getBoundingClientRect();
            return { top: value.top, bottom: value.bottom, left: value.left, right: value.right };
          };
          return {
            stage: rect('.play-table[data-seat-topology="top-row"] .interaction-stage'),
            stageContent: [...stage.querySelectorAll(':scope > header, .interaction-stage-body, .hero-focus, .interaction-stage-meta-region, .interaction-stage-focus, .interaction-stage-context, .dying-handoff, .dying-handoff-grid, .dying-handoff-guidance')]
              .filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; })
              .map((element) => ({ selector: element.className || element.tagName, ...bounds(element) })),
            stageTextMetrics: [...stage.querySelectorAll(':scope > header, .hero-focus-identity, .medium-participant-identity, .interaction-stage-focus, .interaction-stage-context, .group-target-identity, .dying-handoff-grid, .dying-handoff-guidance')]
              .filter((element) => { const box = element.getBoundingClientRect(); return box.width > 0 && box.height > 0; })
              .map((element) => ({ selector: element.className || element.tagName, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })),
            safeZone: rect('.play-table[data-seat-topology="top-row"] > .interaction-safe-zone'),
            table: rect('.play-table'),
            dock: rect('.local-player-dock'),
            board: rect('.player-board[data-seat-topology="top-row"]'),
            opponents: [...document.querySelectorAll('.player-board[data-seat-topology="top-row"] [data-player-anchor]')].map(bounds),
            stageDockOverlap: overlap(stageBounds, dockBounds),
            safeZoneDockOverlap: overlap(safeZoneBounds, dockBounds),
            viewportWidth: window.innerWidth,
            documentWidth: document.documentElement.scrollWidth,
            stageOverflow: { x: getComputedStyle(stage).overflowX, y: getComputedStyle(stage).overflowY },
            dockParts: [".local-hero-card", ".local-status-panel", ".local-equipment-panel", ".local-hand-rail", ".console-guidance", ".turn-controls"].map(rect),
            handLayout: (() => {
              const rail = document.querySelector(".local-hand-rail");
              const style = getComputedStyle(rail);
              return { wrap: style.flexWrap, scrollHeight: rail.scrollHeight, clientHeight: rail.clientHeight };
            })(),
            guidance: rect('.local-player-dock .console-guidance'),
            actions: rect('.local-player-dock .turn-controls'),
            documentHeight: document.documentElement.scrollHeight,
            viewportHeight: window.innerHeight,
          };
        });
        expect(layout.stage.top).toBeGreaterThanOrEqual(layout.safeZone.top - 1);
        expect(layout.stage.bottom, `Stage remains in the Safe Zone: ${JSON.stringify({ stage: layout.stage, safeZone: layout.safeZone, stageContent: layout.stageContent })}`).toBeLessThanOrEqual(layout.safeZone.bottom + 1);
        expect(layout.stage.bottom).toBeLessThanOrEqual(layout.table.bottom + 1);
        expect(layout.stage.bottom).toBeLessThanOrEqual(layout.dock.top - 4);
        expect(layout.stageDockOverlap).toBe(0);
        expect(layout.safeZoneDockOverlap).toBe(0);
        if (viewport.width <= 360) {
          for (const part of layout.stageContent) {
            expect(part.top, `${part.selector} stays below the Safe Zone top`).toBeGreaterThanOrEqual(layout.safeZone.top - 1);
            expect(part.bottom, `${part.selector} stays above the Safe Zone bottom`).toBeLessThanOrEqual(layout.safeZone.bottom + 1);
            expect(part.left, `${part.selector} stays right of the Safe Zone left`).toBeGreaterThanOrEqual(layout.safeZone.left - 1);
            expect(part.right, `${part.selector} stays left of the Safe Zone right: ${JSON.stringify(part)}`).toBeLessThanOrEqual(layout.safeZone.right + 1);
          }
          for (const metrics of layout.stageTextMetrics) {
            expect(metrics.scrollWidth, `${metrics.selector} has no horizontally clipped text`).toBeLessThanOrEqual(metrics.clientWidth + 1);
          }
        }
        expect(layout.documentWidth).toBeLessThanOrEqual(layout.viewportWidth);
        expect(layout.stageOverflow).toEqual({ x: "visible", y: "visible" });
        expect(layout.opponents).toHaveLength(3);
        for (const seat of layout.opponents) {
          expect(seat.top - layout.board.top).toBeGreaterThanOrEqual(0);
          expect(seat.top - layout.board.top).toBeLessThanOrEqual(4);
          expect(seat.bottom).toBeLessThanOrEqual(layout.stage.top - 6);
        }
        for (const part of layout.dockParts) {
          expect(part.top).toBeGreaterThanOrEqual(layout.dock.top - 1);
          expect(part.bottom).toBeLessThanOrEqual(layout.dock.bottom + 1);
          expect(part.left).toBeGreaterThanOrEqual(layout.dock.left - 1);
          expect(part.right).toBeLessThanOrEqual(layout.dock.right + 1);
        }
        expect(layout.handLayout.wrap).toBe("nowrap");
        expect(layout.handLayout.scrollHeight).toBeLessThanOrEqual(layout.handLayout.clientHeight + 1);
        expect(layout.guidance.top).toBeGreaterThanOrEqual(layout.dock.top);
        expect(layout.actions.bottom).toBeLessThanOrEqual(layout.dock.bottom);
        expect(layout.dock.bottom).toBeLessThanOrEqual(layout.viewportHeight);
        expect(layout.documentHeight).toBeLessThanOrEqual(layout.viewportHeight);
      });
    }
  }
});

async function assertVisible(locator, label) {
  await expect(locator, label).toBeVisible();
  await expect(locator).not.toHaveCSS("display", "none");
}

async function geometry(page) {
  return page.evaluate(() => {
    const visible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return rect.width > 0 && rect.height > 0 && style.display !== "none" && style.visibility !== "hidden";
    };
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    const anchors = [...document.querySelectorAll("[data-player-anchor]")].filter(visible).map(rect);
    const opponentAnchors = [...document.querySelectorAll('.player-board [data-player-anchor]')].filter(visible).map((element) => {
      const relativeIndexClass = [...element.classList].find((name) => /^player-square-[1-9]\d*$/.test(name));
      return { relativeIndex: Number(relativeIndexClass?.replace("player-square-", "")), ...rect(element) };
    });
    const localDockAnchors = [...document.querySelectorAll('.local-player-dock[data-player-anchor]')].filter(visible).map(rect);
    const controls = [
      document.querySelector(".local-player-dock"),
      document.querySelector(".local-hand"),
      document.querySelector('[data-console-surface="local-operation"]'),
    ].filter(Boolean).filter(visible).map(rect);
    const overlap = (left, right) => Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left)) * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
    const severeAnchorOverlaps = [];
    for (let index = 0; index < anchors.length; index += 1) {
      for (let other = index + 1; other < anchors.length; other += 1) {
        const area = overlap(anchors[index], anchors[other]);
        const smaller = Math.min(anchors[index].width * anchors[index].height, anchors[other].width * anchors[other].height);
        if (smaller > 0 && area / smaller > 0.2) severeAnchorOverlaps.push({ index, other, ratio: area / smaller });
      }
    }
    const severeOpponentOverlaps = [];
    for (let index = 0; index < opponentAnchors.length; index += 1) {
      for (let other = index + 1; other < opponentAnchors.length; other += 1) {
        const area = overlap(opponentAnchors[index], opponentAnchors[other]);
        const smaller = Math.min(opponentAnchors[index].width * opponentAnchors[index].height, opponentAnchors[other].width * opponentAnchors[other].height);
        if (smaller > 0 && area / smaller > 0.2) severeOpponentOverlaps.push({ index, other, ratio: area / smaller });
      }
    }
    const stage = document.querySelector(".interaction-stage");
    const stageRect = stage && visible(stage) ? rect(stage) : null;
    const controlOverlap = stageRect ? controls.map((control) => overlap(stageRect, control)).some((area) => area > 0) : false;
    return {
      anchorCount: anchors.length,
      anchors,
      opponentAnchors,
      localDockAnchorCount: localDockAnchors.length,
      controls,
      severeAnchorOverlaps,
      severeOpponentOverlaps,
      controlOverlap,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

async function interactionGeometry(page) {
  return page.evaluate(() => {
    const rect = (element) => {
      const value = element.getBoundingClientRect();
      return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
    };
    const overlap = (left, right) => Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left)) * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
    const safeZone = document.querySelector(".interaction-safe-zone");
    const stage = document.querySelector(".interaction-stage");
    const playTable = document.querySelector(".play-table");
    const localDock = document.querySelector(".local-player-dock");
    const reactionChain = document.querySelector('[data-reaction-chain="proven"]');
    const dyingHandoff = document.querySelector('[data-dying-handoff="proven"]');
    const stageBody = document.querySelector(".interaction-stage-body");
    const stageRegions = [...document.querySelectorAll(".interaction-stage-hero-region, .interaction-stage-event-region, .interaction-stage-meta-region")].map((element) => {
      const style = getComputedStyle(element);
      const bounds = rect(element);
      return {
        className: element.className,
        bounds,
        display: style.display,
        hasContent: Boolean(element.textContent?.trim()),
        insideStage: stage?.contains(element) ?? false,
        visible: bounds.width > 0 && bounds.height > 0 && style.display !== "none" && style.visibility !== "hidden",
      };
    });
    const opponents = [...document.querySelectorAll('.player-board [data-player-anchor]')].map(rect);
    const safeZoneRect = safeZone ? rect(safeZone) : null;
    const stageRect = stage ? rect(stage) : null;
    const playTableRect = playTable ? rect(playTable) : null;
    const localDockRect = localDock ? rect(localDock) : null;
    const safeZoneStyle = safeZone ? getComputedStyle(safeZone) : null;
    const stageStyle = stage ? getComputedStyle(stage) : null;
    return {
      safeZone: safeZoneRect,
      stage: stageRect,
      playTable: playTableRect,
      localDock: localDockRect,
      reactionChain: reactionChain ? rect(reactionChain) : null,
      dyingHandoff: dyingHandoff ? rect(dyingHandoff) : null,
      stageBody: stageBody ? { bounds: rect(stageBody), display: getComputedStyle(stageBody).display, gridTemplateColumns: getComputedStyle(stageBody).gridTemplateColumns } : null,
      stageRegions,
      opponents,
      stageDockOverlap: stageRect && localDockRect ? overlap(stageRect, localDockRect) : null,
      safeZoneDockOverlap: safeZoneRect && localDockRect ? overlap(safeZoneRect, localDockRect) : null,
      safeZoneOverflow: safeZoneStyle ? { x: safeZoneStyle.overflowX, y: safeZoneStyle.overflowY } : null,
      stageOverflow: stageStyle ? { x: stageStyle.overflowX, y: stageStyle.overflowY } : null,
      scrollWidth: document.documentElement.scrollWidth,
      viewportWidth: window.innerWidth,
    };
  });
}

for (const { width, height } of TOPOLOGY_MATRIX) {
  for (const totalPlayers of [2, 3, 4]) {
    test(`UX2.0VIS-01 ${width}x${height} places ${totalPlayers}-player opponents in one top row`, async ({ page }) => {
      await loadFixture(page, { state: totalPlayers === 2 ? "rest" : "normal", count: totalPlayers, width, height });
      const result = await geometry(page);
      const opponentAnchors = [...result.opponentAnchors].sort((left, right) => left.relativeIndex - right.relativeIndex);

      expect(opponentAnchors, "one visible opponent anchor per non-local player").toHaveLength(totalPlayers - 1);
      expect(result.localDockAnchorCount, "exactly one local dock anchor").toBe(1);
      expect(opponentAnchors.map(({ relativeIndex }) => relativeIndex), "relative seat order remains stable").toEqual(Array.from({ length: totalPlayers - 1 }, (_, index) => index + 1));
      expect(Math.max(...opponentAnchors.map(({ top }) => top)) - Math.min(...opponentAnchors.map(({ top }) => top)), "all opponent anchors share one top row").toBeLessThanOrEqual(4);
      for (let index = 1; index < opponentAnchors.length; index += 1) {
        expect(opponentAnchors[index].left + opponentAnchors[index].width / 2, `seat ${index} is right of seat ${index - 1}`).toBeGreaterThan(opponentAnchors[index - 1].left + opponentAnchors[index - 1].width / 2);
      }
      expect(result.severeOpponentOverlaps, "opponent anchors do not severely overlap").toEqual([]);
      expect(result.scrollWidth, "top-row layout does not introduce horizontal overflow").toBeLessThanOrEqual(result.viewportWidth);
    });
  }
}

for (const { width, height } of TOPOLOGY_MATRIX) {
  const maxHeight = width === 1440 ? 110 : width === 650 ? 92 : 82;
  test(`UX2.0VIS-04A ${width}x${height} renders compact landscape 4-player opponent thumbnails`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count: 4, width, height });
    const result = await geometry(page);
    const seats = [...result.opponentAnchors].sort((left, right) => left.relativeIndex - right.relativeIndex);
    expect(seats, "three opponent anchors remain mounted").toHaveLength(3);
    expect(result.localDockAnchorCount, "exactly one local player remains in the dock").toBe(1);
    expect(seats.map(({ relativeIndex }) => relativeIndex), "relative seat order remains unchanged").toEqual([1, 2, 3]);
    expect(Math.max(...seats.map(({ top }) => top)) - Math.min(...seats.map(({ top }) => top)), "opponents remain on one row").toBeLessThanOrEqual(4);
    for (const [index, seat] of seats.entries()) {
      expect(seat.width, `seat ${index + 1} is landscape`).toBeGreaterThan(seat.height);
      expect(seat.height, `seat ${index + 1} stays below the ${maxHeight}px height cap`).toBeLessThanOrEqual(maxHeight);
      if (index > 0) {
        expect(seat.left + seat.width / 2, `seat ${index + 1} stays to the right of its predecessor`).toBeGreaterThan(seats[index - 1].left + seats[index - 1].width / 2);
      }
    }
    expect(result.severeOpponentOverlaps, "opponent thumbnails do not overlap").toEqual([]);
    expect(result.scrollWidth, "opponent thumbnails do not create horizontal overflow").toBeLessThanOrEqual(result.viewportWidth);
  });
}

for (const { width, height } of TOPOLOGY_MATRIX) {
  test(`UX2.0VIS-04A ${width}x${height} keeps public identity and hand count with equipment at a glance`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count: 4, width, height });
    for (const playerId of ["p2", "p3", "p4"]) {
      const seat = page.locator(`[data-player-anchor="${playerId}"]`);
      await assertVisible(seat.locator(".opponent-player-name"), `${playerId} name`);
      await assertVisible(seat.locator(".opponent-hero-name"), `${playerId} hero name`);
      await assertVisible(seat.locator(".player-hp"), `${playerId} HP text`);
      await assertVisible(seat.locator(".opponent-hand-footer .player-hand-count"), `${playerId} hand count`);
    }

    const equipmentSeat = page.locator('[data-player-anchor="p2"]');
    const equipmentSummary = equipmentSeat.locator(".opponent-equipment-summary");
    await expect(equipmentSummary).toBeVisible();
    await expect(equipmentSummary.locator('[data-slot="weapon"][data-card-kind="ZhugeCrossbow"]')).toHaveCount(1);
    const judgementSeat = page.locator('[data-player-anchor="p3"]');
    await expect(judgementSeat.locator(".opponent-judgement-zone")).toBeHidden();
    await expect(judgementSeat.locator(".opponent-judgement-cards .mini-zone-card")).toHaveCount(1);
  });
}

for (const { width, height } of [{ width: 1440, height: 900 }, { width: 480, height: 900 }]) {
  test(`UX2.0VIS-04A ${width}x${height} preserves opponent Inspect and seat anchors`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count: 4, width, height });
    const before = await page.locator(".player-board [data-player-anchor]").evaluateAll((elements) => elements.map((element) => {
      const { x, y, width: seatWidth, height: seatHeight } = element.getBoundingClientRect();
      return { id: element.getAttribute("data-player-anchor"), x, y, width: seatWidth, height: seatHeight };
    }));

    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
    await expect(page.getByRole("dialog", { name: "Player 2 opponent inspection" })).toBeVisible();
    await expect(page.locator('.opponent-inspection-zone[aria-label="Equipment"] .opponent-inspection-card')).toHaveCount(1);
    await page.getByRole("button", { name: "Close Player 2 inspection" }).click();
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);

    await page.locator('[data-player-anchor="p3"] .opponent-hero-target').click();
    await expect(page.getByRole("dialog", { name: "Player 3 opponent inspection" })).toBeVisible();
    await expect(page.locator('.opponent-inspection-zone[aria-label="Judgement Zone"] .opponent-inspection-card[aria-label="Explain Lightning"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Close Player 3 inspection" }).click();
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);

    const after = await page.locator(".player-board [data-player-anchor]").evaluateAll((elements) => elements.map((element) => {
      const { x, y, width: seatWidth, height: seatHeight } = element.getBoundingClientRect();
      return { id: element.getAttribute("data-player-anchor"), x, y, width: seatWidth, height: seatHeight };
    }));
    expect(after, "Inspect open/close leaves every opponent anchor in place").toEqual(before);
  });
}

for (const { width, height } of TOPOLOGY_MATRIX) {
  test(`UX2.0VIS-09A ${width}x${height} anchors persistent local Judgement to the Hero`, async ({ page }) => {
    const cases = [
      { state: "local-judgement-empty", ids: [] },
      { state: "local-judgement-one", ids: ["browser-local-lightning"] },
      { state: "local-judgement-two", ids: ["browser-local-lightning", "browser-local-overindulgence"] },
    ];

    for (const { state, ids } of cases) {
      await loadFixture(page, { state, count: 4, width, height });
      const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
      const hero = dock.locator(".local-hero-card");
      const anchor = dock.locator(".local-hero-anchor");
      const overlay = anchor.locator(":scope > .local-judgement-overlay");

      await expect(dock.locator(".local-judgement-panel")).toHaveCount(0);
      await expect(dock.locator(".local-dock-zones > *")).toHaveCount(2);
      if (ids.length === 0) {
        await expect(overlay).toHaveCount(0);
        await expect(dock.locator('[data-judgement-id^="browser-local-"]')).toHaveCount(0);
        continue;
      }

      await expect(hero).toHaveCount(1);
      await expect(overlay).toHaveCount(1);
      await expect(overlay.locator(":scope > .local-judgement-card-slot")).toHaveCount(ids.length);
      await expect(overlay).toHaveAttribute("data-judgement-layout", "measured");
      for (const [index, id] of ids.entries()) {
        const card = overlay.locator(`[data-judgement-id="${id}"]`);
        await expect(page.locator(`[data-judgement-id="${id}"]`), `${id} is rendered exactly once`).toHaveCount(1);
        await expect(card.locator(".played-card")).toBeVisible();
        const explanation = card.locator(".zone-info-button");
        await expect(explanation).toHaveAccessibleName(index === 0 ? "Explain Lightning" : "Explain Overindulgence");
        await explanation.click();
        await expect(page.getByRole("dialog").getByRole("heading", { name: index === 0 ? "Lightning" : "Overindulgence" })).toBeVisible();
        await page.getByRole("button", { name: "Close card explanation" }).click();
        await expect(page.getByRole("dialog")).toHaveCount(0);
      }

      const geometry = await dock.evaluate((element) => {
        const rect = (node) => {
          const bounds = node.getBoundingClientRect();
          return { left: bounds.left, top: bounds.top, right: bounds.right, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
        };
        const overlaps = (a, b) => Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left)) * Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top)) > 0;
        const heroAnchor = rect(element.querySelector(".local-hero-anchor"));
        const heroCard = rect(element.querySelector(".local-hero-card"));
        const judgement = [...element.querySelectorAll(".local-judgement-overlay .local-zone-card")].map(rect);
        const hand = rect(element.querySelector(".local-hand-section"));
        const actions = rect(element.querySelector(".turn-controls"));
        return {
          heroAnchor,
          heroCard,
          judgement,
          hand,
          actions,
          cardOutsideHeroAnchor: judgement.some((card) => card.left < heroAnchor.left - 1 || card.right > heroAnchor.right + 1),
          cardBlocksHandOrActions: judgement.some((card) => overlaps(card, hand) || overlaps(card, actions)),
          heroLowerHitTarget: Boolean(document.elementFromPoint(heroCard.left + heroCard.width / 2, heroCard.bottom - 8)?.closest(".local-hero-card")),
          overflow: document.documentElement.scrollWidth > window.innerWidth,
        };
      });
      expect(geometry.cardOutsideHeroAnchor, "overlay cards stay within the responsive Hero width").toBe(false);
      expect(geometry.cardBlocksHandOrActions, "overlay cards do not cover Hand or action controls").toBe(false);
      expect(geometry.heroLowerHitTarget, "the unobscured Hero remains a usable info target").toBe(true);
      expect(geometry.overflow, "Hero overlay introduces no horizontal page overflow").toBe(false);
      expect(geometry.judgement).toHaveLength(ids.length);

      await hero.click({ position: { x: geometry.heroCard.width / 2, y: geometry.heroCard.height - 8 } });
      await expect(page.getByRole("dialog").getByRole("heading", { name: "Cao Cao" })).toBeVisible();
      await page.getByRole("button", { name: "Close hero information" }).click();
    }
  });
}

for (const { width, height, portraitSize } of [
  { width: 1440, height: 900, portraitSize: { width: 90, height: 113 } },
  { width: 650, height: 900, portraitSize: { width: 72, height: 90 } },
  { width: 480, height: 900, portraitSize: { width: 64, height: 80 } },
]) {
  test(`UX2.0VIS-04A ${width}x${height} keeps compact opponents above the unchanged Interaction Stage`, async ({ page }) => {
    await loadFixture(page, { state: "interaction", count: 4, width, height });
    const result = await interactionGeometry(page);
    const focusPortrait = await page.locator(".hero-focus-portrait").boundingBox();
    const localDockAnchors = await page.locator('.local-player-dock[data-player-anchor="p1"]').count();

    await expect(page.locator(".interaction-stage")).toBeVisible();
    await expect(page.locator('.player-board [data-player-anchor="p1"]')).toHaveCount(0);
    expect(localDockAnchors, "the local hero remains in the dock only").toBe(1);
    expect(focusPortrait, "the established Hero Focus portrait remains mounted").not.toBeNull();
    expect(focusPortrait.width).toBeCloseTo(portraitSize.width, 0);
    expect(focusPortrait.height).toBeCloseTo(portraitSize.height, 0);
    expect(result.opponents, "three opponent seats remain above the stage").toHaveLength(3);
    expect(Math.max(...result.opponents.map(({ bottom }) => bottom)), "opponents clear the Interaction Stage by six pixels").toBeLessThanOrEqual(result.stage.top - 6);
    for (const seat of result.opponents) {
      expect(seat.height, "each opponent seat is shorter than the Hero Focus portrait").toBeLessThan(focusPortrait.height);
    }
    expect(result.stage.left).toBeGreaterThanOrEqual(result.safeZone.left - 4);
    expect(result.stage.top).toBeGreaterThanOrEqual(result.safeZone.top - 4);
    expect(result.stage.right).toBeLessThanOrEqual(result.safeZone.right + 4);
    expect(result.stage.bottom).toBeLessThanOrEqual(result.safeZone.bottom + 4);
    expect(result.safeZoneDockOverlap, "Safe Zone remains separate from the local dock").toBe(0);
    expect(result.scrollWidth).toBeLessThanOrEqual(result.viewportWidth);
  });
}

for (const { width, height } of [{ width: 1440, height: 900 }, { width: 480, height: 900 }]) {
  test(`UX2.0VIS-05A-FIX1 ${width}x${height} retains side-column public zones for Inspect`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count: 6, width, height });
    const result = await geometry(page);
    const board = page.locator('.player-board[data-seat-topology="side-column"]');

    await expect(board).toHaveCount(1);
    await expect(board.locator("[data-player-anchor]")).toHaveCount(5);
    const publicEquipment = board.locator('[data-player-anchor="p2"] .opponent-equipment-summary');
    await expect(publicEquipment).toHaveCount(1);
    await expect(publicEquipment).toBeVisible();
    await expect(publicEquipment.locator('.opponent-equipment-indicator[data-slot="weapon"][data-equipment-id="browser-zhuge-crossbow"]')).toHaveCount(1);
    await expect(board.locator('[data-player-anchor="p3"] .opponent-judgement-zone')).toHaveCount(1);
    await expect(board.locator('[data-player-anchor="p3"] .opponent-judgement-zone')).toBeHidden();
    const sideSeatAspectRatios = await board.locator("[data-player-anchor]").evaluateAll((elements) => elements.map((element) => {
      const aspectRatio = getComputedStyle(element).aspectRatio;
      const fraction = aspectRatio.match(/([\d.]+)\s*\/\s*([\d.]+)/);
      return fraction ? Number(fraction[1]) / Number(fraction[2]) : Number(aspectRatio);
    }));
    expect(sideSeatAspectRatios, "all five seats retain the side-column portrait ratio").toHaveLength(5);
    for (const ratio of sideSeatAspectRatios) expect(ratio).toBeCloseTo(2 / 3, 2);
    expect(result.scrollWidth).toBeLessThanOrEqual(result.viewportWidth);
  });
}

for (const viewport of VIS_04B_VIEWPORTS) {
  for (const count of [2, 3, 4]) {
    test(`UX2.0VIS-04B REST ${viewport.width}x${viewport.height} reclaims the gap for ${count} players`, async ({ page }) => {
      await loadFixture(page, { state: "rest", count, width: viewport.width, height: viewport.height });
      const seats = await geometry(page);
      const layout = await interactionGeometry(page);
      const board = await page.locator('.player-board[data-seat-topology="top-row"]').boundingBox();
      const orderedSeats = [...seats.opponentAnchors].sort((left, right) => left.relativeIndex - right.relativeIndex);
      const maxOpponentBottom = Math.max(...orderedSeats.map(({ bottom }) => bottom));
      const clearance = layout.safeZone.top - maxOpponentBottom;
      const safeZoneVisuals = await page.locator(".interaction-safe-zone").evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          borders: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth],
          text: element.textContent?.trim() ?? "",
        };
      });

      expect(await page.locator('.play-table[data-seat-topology="top-row"] .interaction-safe-zone').count()).toBe(1);
      expect(layout.safeZone.bottom).toBeCloseTo(layout.playTable.bottom - 1, 4);
      await expect(page.locator(".interaction-stage")).toHaveCount(0);
      expect(safeZoneVisuals.background).toBe("rgba(0, 0, 0, 0)");
      expect(safeZoneVisuals.borders).toEqual(["0px", "0px", "0px", "0px"]);
      expect(safeZoneVisuals.text).toBe("");
      expect(orderedSeats).toHaveLength(count - 1);
      expect(seats.localDockAnchorCount).toBe(1);
      expect(Math.max(...orderedSeats.map(({ top }) => top)) - Math.min(...orderedSeats.map(({ top }) => top))).toBeLessThanOrEqual(4);
      expect(orderedSeats.map(({ relativeIndex }) => relativeIndex)).toEqual(Array.from({ length: count - 1 }, (_, index) => index + 1));
      for (let index = 0; index < orderedSeats.length; index += 1) {
        const seat = orderedSeats[index];
        const expectedWidth = count === 4 && viewport.width <= 650
          ? expectedVis12bSeatWidth(board.width)
          : viewport.seat.width;
        if (count === 4 && viewport.width <= 650) {
          expect(seat.width).toBeGreaterThanOrEqual(136);
          expect(seat.width).toBeLessThanOrEqual(146);
        } else {
          expect(seat.width).toBeCloseTo(expectedWidth, 1);
        }
        expect(seat.height).toBe(viewport.seat.height);
        if (index > 0) expect(seat.left + seat.width / 2).toBeGreaterThan(orderedSeats[index - 1].left + orderedSeats[index - 1].width / 2);
      }
      expect(clearance).toBeGreaterThanOrEqual(6);
      expect(clearance).toBeLessThanOrEqual(24);
      expect(seats.scrollWidth).toBeLessThanOrEqual(seats.viewportWidth);
    });
  }
}

for (const viewport of VIS_04B_VIEWPORTS) {
  for (const { state, label } of VIS_04B_ACTIVE_STATES) {
    test(`UX2.0VIS-04B ${label} ${viewport.width}x${viewport.height} preserves full stage containment`, async ({ page }) => {
      await loadFixture(page, { state, count: 4, width: viewport.width, height: viewport.height });
      const seats = await geometry(page);
      const result = await interactionGeometry(page);
      const focusPortrait = await page.locator(".hero-focus-portrait").boundingBox();

      await expect(page.locator(".interaction-stage")).toBeVisible();
      await assertVisible(page.locator(".local-player-dock"), "local player dock");
      expect(result.safeZone).not.toBeNull();
      expect(result.stage).not.toBeNull();
      expect(result.playTable).not.toBeNull();
      expect(result.opponents).toHaveLength(3);
      expect(Math.max(...result.opponents.map(({ bottom }) => bottom))).toBeLessThanOrEqual(result.stage.top - 6);
      expect(result.stage.left).toBeGreaterThanOrEqual(result.safeZone.left - 4);
      expect(result.stage.top).toBeGreaterThanOrEqual(result.safeZone.top);
      expect(result.stage.right).toBeLessThanOrEqual(result.safeZone.right + 4);
      expect(result.stage.bottom).toBeLessThanOrEqual(result.safeZone.bottom + 4);
      expect(result.safeZone.bottom).toBeCloseTo(result.playTable.bottom - 1, 4);
      expect(result.stage.bottom).toBeLessThanOrEqual(result.playTable.bottom - 1);
      expect(result.stageDockOverlap).toBe(0);
      expect(result.safeZoneDockOverlap).toBe(0);
      expect(result.safeZoneOverflow).toEqual({ x: "visible", y: "visible" });
      expect(result.stageOverflow).toEqual({ x: "visible", y: "visible" });
      expect(result.scrollWidth).toBeLessThanOrEqual(result.viewportWidth);
      expect(seats.localDockAnchorCount).toBe(1);
      expect(focusPortrait.width).toBe(viewport.focus.width);
      expect(focusPortrait.height).toBe(viewport.focus.height);

      if (state === "negation") await assertVisible(page.locator('[data-reaction-chain="proven"]'), "Reaction Chain");
      if (state === "dying") {
        await assertVisible(page.locator('[data-dying-handoff="proven"]'), "Dying handoff");
        expect(result.dyingHandoff.bottom).toBeLessThanOrEqual(result.stage.bottom + 4);
      }
      if (state === "group-observer") {
        const mediumPortrait = await page.locator(".medium-participant-portrait").boundingBox();
        expect(mediumPortrait.width).toBe(viewport.medium.width);
        expect(mediumPortrait.height).toBe(viewport.medium.height);
      }
    });
  }
}

test("UX2.0VIS-04B Dying 650x900 applies compact pressure when the Safe Zone contracts", async ({ page }) => {
  const viewport = VIS_04B_VIEWPORTS.find(({ width }) => width === 650);
  await loadFixture(page, { state: "dying", count: 4, width: viewport.width, height: viewport.height });
  const playTable = page.locator(".play-table");

  await playTable.evaluate((element, previousTop) => element.style.setProperty("--interaction-safe-top", previousTop), viewport.previousTop);
  const pressured = await interactionGeometry(page);
  await assertVisible(page.locator('[data-dying-handoff="proven"]'), "Dying handoff remains visible under pressure");
  expect(pressured.safeZone.height).toBeLessThanOrEqual(330);
  expect(pressured.stageBody.display).toBe("grid");
  expect(pressured.stage.top).toBeGreaterThanOrEqual(pressured.safeZone.top);
  expect(pressured.stage.bottom).toBeLessThanOrEqual(pressured.safeZone.bottom + 4);
  expect(pressured.stage.bottom).toBeLessThanOrEqual(pressured.playTable.bottom - 1);
  expect(pressured.dyingHandoff.bottom).toBeLessThanOrEqual(pressured.stage.bottom + 4);
  expect(pressured.stageDockOverlap).toBe(0);
  expect(pressured.safeZoneDockOverlap).toBe(0);

  await playTable.evaluate((element) => element.style.removeProperty("--interaction-safe-top"));
  const current = await interactionGeometry(page);
  await assertVisible(page.locator('[data-dying-handoff="proven"]'), "Dying handoff");
  expect(current.stageBody.display).toBe("flex");
  expect(current.stage.height).toBeGreaterThan(pressured.stage.height);
  expect(current.stage.bottom).toBeLessThanOrEqual(current.safeZone.bottom + 4);
  expect(current.stage.bottom).toBeLessThanOrEqual(current.playTable.bottom - 1);
  expect(current.dyingHandoff.bottom).toBeLessThanOrEqual(current.stage.bottom + 4);
  expect(current.stageDockOverlap).toBe(0);
  expect(current.safeZoneDockOverlap).toBe(0);
});

for (const viewport of VIS_04C_VIEWPORTS) {
  for (const count of [2, 3, 4]) {
    test(`UX2.0VIS-04C REST ${viewport.width}x${viewport.height} anchors ${count}-player seats to the top band`, async ({ page }) => {
      await loadFixture(page, { state: "rest", count, width: viewport.width, height: viewport.height });
      const board = await page.locator('.player-board[data-seat-topology="top-row"]').boundingBox();
      const layout = await interactionGeometry(page);
      const anchors = await geometry(page);
      const seats = [...anchors.opponentAnchors].sort((left, right) => left.relativeIndex - right.relativeIndex);
      const expectedLefts = count === 2 ? [viewport.seatLefts[1]] : count === 3 ? [viewport.seatLefts[0], viewport.seatLefts[2]] : [...viewport.seatLefts];
      expect(board.y - layout.playTable.top).toBeCloseTo(viewport.boardInset, 0);
      expect(seats).toHaveLength(count - 1);
      expect(seats.map(({ relativeIndex }) => relativeIndex)).toEqual(Array.from({ length: count - 1 }, (_, index) => index + 1));
      expect(anchors.localDockAnchorCount).toBe(1);
      expect(Math.max(...seats.map(({ top }) => top)) - Math.min(...seats.map(({ top }) => top))).toBeLessThanOrEqual(4);
      for (const [index, seat] of seats.entries()) {
        expect(seat.top - board.y, `seat ${index + 1} starts in the top band`).toBeGreaterThanOrEqual(0);
        expect(seat.top - board.y, `seat ${index + 1} starts in the top band`).toBeLessThanOrEqual(4);
        const expectedWidth = count === 4 && viewport.width <= 650
          ? expectedVis12bSeatWidth(board.width)
          : viewport.seat.width;
        if (count === 4 && viewport.width <= 650) {
          const trackWidth = (board.width - 18) / 3;
          const expectedLeft = board.x + index * (trackWidth + 9) + (trackWidth - expectedWidth) / 2;
          expect(seat.left, `seat ${index + 1} follows its centered responsive track`).toBeCloseTo(expectedLeft, 0);
          expect(seat.width).toBeCloseTo(expectedWidth, 1);
        } else {
          expect(seat.left, `seat ${index + 1} keeps its X anchor`).toBeCloseTo(expectedLefts[index], 0);
          expect(seat.width).toBeCloseTo(expectedWidth, 1);
        }
        expect(seat.height).toBe(viewport.seat.height);
      }
      const clearance = layout.safeZone.top - Math.max(...seats.map(({ bottom }) => bottom));
      expect(clearance).toBeGreaterThanOrEqual(6);
      expect(clearance).toBeLessThanOrEqual(24);
      expect(layout.safeZone.bottom).toBeCloseTo(layout.playTable.bottom - 1, 4);
      await expect(page.locator('.play-table[data-seat-topology="top-row"] .interaction-safe-zone')).toHaveCount(1);
      await expect(page.locator(".interaction-stage")).toHaveCount(0);
      expect(anchors.scrollWidth).toBeLessThanOrEqual(anchors.viewportWidth);
    });
  }

  for (const { state, label } of VIS_04B_ACTIVE_STATES) {
    test(`UX2.0VIS-04C ${label} ${viewport.width}x${viewport.height} keeps anchored seats and Stage contained`, async ({ page }) => {
      await loadFixture(page, { state, count: 4, width: viewport.width, height: viewport.height });
      const board = await page.locator('.player-board[data-seat-topology="top-row"]').boundingBox();
      const layout = await interactionGeometry(page);
      const focusPortrait = await page.locator(".hero-focus-portrait").boundingBox();
      const acceptedSizes = VIS_04B_VIEWPORTS.find(({ width }) => width === viewport.width);

      expect(layout.opponents).toHaveLength(3);
      for (const seat of layout.opponents) expect(seat.top - board.y).toBeGreaterThanOrEqual(0);
      for (const seat of layout.opponents) expect(seat.top - board.y).toBeLessThanOrEqual(4);
      expect(Math.max(...layout.opponents.map(({ bottom }) => bottom))).toBeLessThanOrEqual(layout.stage.top - 6);
      expect(layout.stage.left).toBeGreaterThanOrEqual(layout.safeZone.left - 4);
      expect(layout.stage.top).toBeGreaterThanOrEqual(layout.safeZone.top);
      expect(layout.stage.right).toBeLessThanOrEqual(layout.safeZone.right + 4);
      expect(layout.stage.bottom).toBeLessThanOrEqual(layout.safeZone.bottom + 4);
      expect(layout.stageDockOverlap).toBe(0);
      expect(layout.safeZoneDockOverlap).toBe(0);
      expect(layout.scrollWidth).toBeLessThanOrEqual(layout.viewportWidth);
      expect(focusPortrait.width).toBe(acceptedSizes.focus.width);
      expect(focusPortrait.height).toBe(acceptedSizes.focus.height);
      if (state === "negation") {
        await assertVisible(page.locator('[data-reaction-chain="proven"]'), "Reaction Chain");
        expect(layout.reactionChain.bottom).toBeLessThanOrEqual(layout.stage.bottom + 4);
      }
      if (state === "dying") {
        await assertVisible(page.locator('[data-dying-handoff="proven"]'), "Dying handoff");
        expect(layout.dyingHandoff.bottom).toBeLessThanOrEqual(layout.stage.bottom + 4);
      }
      if (state === "group-observer") {
        const mediumPortrait = await page.locator(".medium-participant-portrait").boundingBox();
        expect(mediumPortrait.width).toBe(acceptedSizes.medium.width);
        expect(mediumPortrait.height).toBe(acceptedSizes.medium.height);
      }
    });
  }
}

for (const width of [700, 701]) {
  test(`UX2.0VIS-04C REST ${width}x900 keeps Safe Zone close across the 700px board breakpoint`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count: 4, width, height: 900 });
    const board = await page.locator('.player-board[data-seat-topology="top-row"]').boundingBox();
    const layout = await interactionGeometry(page);
    const seats = (await geometry(page)).opponentAnchors;
    expect(seats).toHaveLength(3);
    expect(board.y - layout.playTable.top).toBe(width === 700 ? 60 : 68);
    for (const seat of seats) expect(seat.top - board.y).toBeGreaterThanOrEqual(0);
    for (const seat of seats) expect(seat.top - board.y).toBeLessThanOrEqual(4);
    const clearance = layout.safeZone.top - Math.max(...seats.map(({ bottom }) => bottom));
    expect(clearance).toBeGreaterThanOrEqual(6);
    expect(clearance).toBeLessThanOrEqual(24);
  });
}

test("UX2.0VIS-04C REST 480x900 rejects the old flexible-row centre alignment", async ({ page }) => {
  await loadFixture(page, { state: "rest", count: 4, width: 480, height: 900 });
  const board = page.locator('.player-board[data-seat-topology="top-row"]');
  const seats = board.locator(".opponent-player-card");
  await board.evaluate((element) => { element.style.gridTemplateRows = "minmax(120px,1fr) auto minmax(120px,1fr)"; });
  await seats.evaluateAll((elements) => { for (const element of elements) element.style.alignSelf = "center"; });
  const boardBounds = await board.boundingBox();
  const oldSeats = await geometry(page);
  expect(Math.min(...oldSeats.opponentAnchors.map(({ top }) => top)) - boardBounds.y).toBeGreaterThan(40);

  await board.evaluate((element) => { element.style.removeProperty("grid-template-rows"); });
  await seats.evaluateAll((elements) => { for (const element of elements) element.style.removeProperty("align-self"); });
  const currentSeats = await geometry(page);
  for (const [index, seat] of currentSeats.opponentAnchors.entries()) {
    expect(seat.top - boardBounds.y).toBeGreaterThanOrEqual(0);
    expect(seat.top - boardBounds.y).toBeLessThanOrEqual(4);
    expect(seat.left).toBe(oldSeats.opponentAnchors[index].left);
    expect(seat.width).toBe(oldSeats.opponentAnchors[index].width);
    expect(seat.height).toBe(oldSeats.opponentAnchors[index].height);
  }
});
const SIDE_COLUMN_MAPPING = {
  5: [["right", 2], ["right", 1], ["left", 2], ["left", 1]],
  6: [["right", 3], ["right", 2], ["right", 1], ["left", 2], ["left", 1]],
  7: [["right", 3], ["right", 2], ["right", 1], ["left", 3], ["left", 2], ["left", 1]],
  8: [["right", 4], ["right", 3], ["right", 2], ["right", 1], ["left", 3], ["left", 2], ["left", 1]],
  9: [["right", 4], ["right", 3], ["right", 2], ["right", 1], ["left", 4], ["left", 3], ["left", 2], ["left", 1]],
  10: [["right", 5], ["right", 4], ["right", 3], ["right", 2], ["right", 1], ["left", 4], ["left", 3], ["left", 2], ["left", 1]],
};

async function sideColumnGeometry(page) {
  return page.locator('.player-board[data-seat-topology="side-column"]').evaluate((board) => {
    const bounds = (element) => {
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    return {
      board: bounds(board), dock: bounds(document.querySelector(".local-player-dock")),
      seats: [...board.querySelectorAll("[data-player-anchor]")].map((element) => ({
        id: element.dataset.playerAnchor, side: element.dataset.sideColumn, row: Number(element.dataset.sideRow),
        relativeIndex: Number([...element.classList].find((name) => /^player-square-\d+$/.test(name)).replace("player-square-", "")),
        gridColumn: getComputedStyle(element).gridColumnStart, ...bounds(element),
      })),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function sideThumbnailGeometry(page) {
  return page.locator('.player-board[data-seat-topology="side-column"]').evaluate((board) => {
    const bounds = (element) => {
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0;
    };
    return {
      board: bounds(board), dock: bounds(document.querySelector(".local-player-dock")),
      rowHeights: getComputedStyle(board).gridTemplateRows.split(" ").map(Number.parseFloat),
      seats: [...board.querySelectorAll("[data-player-anchor]")].map((seat) => {
        const target = seat.querySelector(".opponent-hero-target");
        const targetBox = target.getBoundingClientRect();
        const hit = document.elementFromPoint(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
        const required = [".opponent-hero-card", ".opponent-hero-target", ".opponent-hero-portrait", ".opponent-hero-name", ".player-hp", ".opponent-hand-footer", ".player-hand-count"];
        return {
          id: seat.dataset.playerAnchor, side: seat.dataset.sideColumn, row: Number(seat.dataset.sideRow),
          ...bounds(seat), target: bounds(target), hitSafe: Boolean(hit && target.contains(hit)),
          requiredVisible: required.map((selector) => ({ selector, visible: visible(seat.querySelector(selector)) })),
          descendants: [...seat.querySelectorAll("*")].filter(visible).map((element) => {
            const elementBounds = bounds(element);
            const cropTarget = element.matches(".opponent-hero-portrait > .hero-art-image") ? element.closest(".opponent-hero-target") : null;
            if (!cropTarget) return { className: element.className, ...elementBounds };
            const clip = bounds(cropTarget);
            const x = Math.max(elementBounds.x, clip.x);
            const y = Math.max(elementBounds.y, clip.y);
            const right = Math.min(elementBounds.right, clip.right);
            const bottom = Math.min(elementBounds.bottom, clip.bottom);
            return {
              className: element.className,
              x, y, right, bottom, width: Math.max(0, right - x), height: Math.max(0, bottom - y),
              clippedByHeroTarget: true,
              rawBounds: elementBounds,
            };
          }),
        };
      }),
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    };
  });
}

async function sideSafeZoneGeometry(page) {
  return page.evaluate(() => {
    const bounds = (element) => {
      const { x, y, width, height, right, bottom } = element.getBoundingClientRect();
      return { x, y, width, height, right, bottom };
    };
    const visibleBounds = (element) => {
      const elementBounds = bounds(element);
      const cropTarget = element.matches(".opponent-hero-portrait > .hero-art-image") ? element.closest(".opponent-hero-target") : null;
      if (!cropTarget) return elementBounds;
      const clip = bounds(cropTarget);
      const x = Math.max(elementBounds.x, clip.x);
      const y = Math.max(elementBounds.y, clip.y);
      const right = Math.min(elementBounds.right, clip.right);
      const bottom = Math.min(elementBounds.bottom, clip.bottom);
      return { x, y, right, bottom, width: Math.max(0, right - x), height: Math.max(0, bottom - y) };
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const zone = document.querySelector(".interaction-safe-zone");
    const stage = zone.querySelector(".interaction-stage");
    const seatElements = [...document.querySelectorAll('.player-board [data-player-anchor]')];
    const seatBounds = seatElements.flatMap((seat) => [seat, ...seat.querySelectorAll("*")].filter(visible).map((element) => ({
      id: seat.dataset.playerAnchor, side: seat.dataset.sideColumn, className: element.className, ...visibleBounds(element),
    })));
    const stageStyle = getComputedStyle(stage);
    const zoneStyle = getComputedStyle(zone);
    return {
      table: bounds(document.querySelector(".play-table")), dock: bounds(document.querySelector(".local-player-dock")),
      zone: bounds(zone), stage: bounds(stage), seatBounds,
      stageBounds: [stage, ...stage.querySelectorAll("*")].filter(visible).map((element) => ({ className: element.className, ...bounds(element) })),
      stageStyle: { position: stageStyle.position, translate: stageStyle.translate, transform: stageStyle.transform, overflowX: stageStyle.overflowX, overflowY: stageStyle.overflowY },
      zoneStyle: { position: zoneStyle.position, display: zoneStyle.display, background: zoneStyle.backgroundColor, border: zoneStyle.borderWidth, overflowX: zoneStyle.overflowX, overflowY: zoneStyle.overflowY },
      reaction: Boolean(stage.querySelector('[data-reaction-chain="proven"]')),
      dying: Boolean(stage.querySelector('[data-dying-handoff="proven"]')),
      scrollWidth: document.documentElement.scrollWidth, viewport: window.innerWidth,
    };
  });
}

async function opponentSeatPresentation(page, playerId) {
  return page.locator(`[data-player-anchor="${playerId}"]`).evaluate((seat) => {
    const bounds = (element) => {
      const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
      return { x, y, right, bottom, width, height };
    };
    const containsPoint = (box, x, y) => Boolean(box && x >= box.x && x <= box.right && y >= box.y && y <= box.bottom);
    const portrait = seat.querySelector(".opponent-hero-portrait");
    const artImage = portrait.querySelector(".hero-art-image");
    const artStyle = artImage ? getComputedStyle(artImage) : null;
    const overlay = seat.querySelector(".opponent-hero-overlay");
    const summary = seat.querySelector(".opponent-equipment-summary");
    const target = seat.querySelector(".opponent-hero-target");
    const art = bounds(portrait);
    const artImageBounds = artImage ? bounds(artImage) : null;
    const focus = { x: art.x + art.width * 0.45, y: art.y + art.height * 0.42 };
    const identityText = [...seat.querySelectorAll(".opponent-player-name, .opponent-hero-name, .player-hp, .player-hearts")];
    const targetBox = bounds(target);
    const hit = document.elementFromPoint(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
    return {
      topology: seat.closest(".player-board").dataset.seatTopology,
      seat: bounds(seat), hero: bounds(seat.querySelector(".opponent-hero-card")), art,
      heroArtId: artImage?.getAttribute("data-hero-art-id") ?? null,
      artObjectFit: artStyle?.objectFit ?? null,
      artObjectPosition: artStyle?.objectPosition ?? null,
      artNaturalSize: artImage ? { width: artImage.naturalWidth, height: artImage.naturalHeight } : null,
      artImage: artImageBounds,
      artImageRatio: artImageBounds ? artImageBounds.width / artImageBounds.height : null,
      artCropBoundaryOverflow: getComputedStyle(target).overflow,
      overlay: bounds(overlay), summary: summary ? bounds(summary) : null,
      playerNameFits: seat.querySelector(".opponent-player-name").scrollWidth <= seat.querySelector(".opponent-player-name").clientWidth,
      heroNameFits: seat.querySelector(".opponent-hero-name").scrollWidth <= seat.querySelector(".opponent-hero-name").clientWidth,
      focusCoveredByText: identityText.some((element) => {
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && containsPoint(bounds(element), focus.x, focus.y);
      }),
      focusCoveredByEquipment: containsPoint(summary ? bounds(summary) : null, focus.x, focus.y),
      targetHitSafe: Boolean(hit && target.contains(hit)),
      slots: [...seat.querySelectorAll(".opponent-equipment-indicator")].map((item) => ({ slot: item.dataset.slot, kind: item.dataset.cardKind, equipmentId: item.dataset.equipmentId, label: item.getAttribute("aria-label"), ...bounds(item) })),
      imageLoaded: Boolean(seat.querySelector(".opponent-hero-portrait .hero-art-image")?.naturalWidth),
    };
  });
}

const VIS_10C_EQUIPMENT_CASES = [
  { scenario: "empty", slots: [] },
  { scenario: "weapon", slots: ["weapon"] },
  { scenario: "armor", slots: ["armor"] },
  { scenario: "plusHorse", slots: ["defensiveHorse"] },
  { scenario: "minusHorse", slots: ["offensiveHorse"] },
  { scenario: "weaponArmor", slots: ["weapon", "armor"] },
  { scenario: "multiple", slots: ["weapon", "armor", "defensiveHorse", "offensiveHorse"] },
];

for (const width of [480, 650]) {
  for (const count of [6, 10]) {
    test(`UX2.0VIS-12H ${count}-player Side Column Hero art uses a proportional upper-body crop at ${width}px`, async ({ page }, testInfo) => {
      await loadFixture(page, { state: "interaction", count, width, height: 900, equipmentCase: "matrix" });
      const seatIds = await page.locator('.player-board[data-seat-topology="side-column"] > [data-player-anchor]').evaluateAll((seats) => seats.map((seat) => seat.dataset.playerAnchor));
      expect(seatIds).toHaveLength(count - 1);

      for (const playerId of seatIds) {
        const presentation = await opponentSeatPresentation(page, playerId);
        expect(presentation.topology).toBe("side-column");
        expect(presentation.heroArtId, `${playerId} has its projected Hero art`).toBeTruthy();
        expect(presentation.imageLoaded, `${playerId} repository Hero asset is loaded`).toBe(true);
        expect(presentation.artNaturalSize.width).toBeGreaterThan(0);
        expect(presentation.artNaturalSize.height).toBeGreaterThan(0);
        expect(presentation.artImageRatio).toBeCloseTo(presentation.artNaturalSize.width / presentation.artNaturalSize.height, 2);
        expect(presentation.artObjectFit).toBe("cover");
        expect(presentation.artObjectPosition).toBe("50% 20%");
        expect(presentation.artCropBoundaryOverflow).toBe("hidden");
        expect(presentation.artImage.height / presentation.art.height).toBeCloseTo(1.15, 2);
        expect((presentation.art.y - presentation.artImage.y) / presentation.art.height).toBeCloseTo(0.05, 2);
        expect(presentation.artImage.x + presentation.artImage.width / 2).toBeCloseTo(presentation.art.x + presentation.art.width / 2, 1);
        expect(presentation.focusCoveredByText, `${playerId} portrait focus remains clear of identity text`).toBe(false);
        expect(presentation.focusCoveredByEquipment, `${playerId} portrait focus remains clear of public equipment`).toBe(false);
        expect(presentation.targetHitSafe, `${playerId} target hit area remains safe`).toBe(true);
      }

      const pageWidth = await page.locator("html").evaluate((html) => html.scrollWidth);
      expect(pageWidth, "Side Column Hero crop does not create horizontal page overflow").toBeLessThanOrEqual(width);
      if (count === 10) {
        await testInfo.attach(`vis-12h-side-column-${width}-10-player`, {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      }
    });
  }
}

for (const width of [480, 650]) {
  for (const equipmentCase of VIS_10C_EQUIPMENT_CASES) {
    test(`UX2.0VIS-10C Top Row ${equipmentCase.scenario} at ${width}px keeps Hero art and public slot state readable`, async ({ page }, testInfo) => {
      await loadFixture(page, { state: "rest", count: 4, width, height: 900, equipmentCase: equipmentCase.scenario });
      const seat = page.locator('[data-player-anchor="p2"]');
      const presentation = await opponentSeatPresentation(page, "p2");
      expect(presentation.topology).toBe("top-row");
      expect(presentation.imageLoaded).toBe(true);
      expect(presentation.art.width).toBeGreaterThanOrEqual(width === 480 ? 39 : 42);
      expect(presentation.art.height).toBeGreaterThanOrEqual(width === 480 ? 44 : 52);
      expect(presentation.art.x).toBeGreaterThanOrEqual(presentation.hero.x);
      expect(presentation.art.right).toBeLessThanOrEqual(presentation.hero.right);
      expect(presentation.art.y).toBeGreaterThanOrEqual(presentation.hero.y);
      expect(presentation.art.bottom).toBeLessThanOrEqual(presentation.hero.bottom);
      expect(presentation.focusCoveredByText).toBe(false);
      expect(presentation.focusCoveredByEquipment).toBe(false);
      expect(presentation.targetHitSafe).toBe(true);
      expect(presentation.seat.height).toBe(width === 480 ? 78 : 88);
      expect(presentation.slots.map(({ slot }) => slot)).toEqual(equipmentCase.slots);
      expect(presentation.slots.every(({ width: slotWidth, height: slotHeight }) => slotWidth > 0 && slotHeight > 0)).toBe(true);
      await assertVisible(seat.locator(".opponent-player-name"), "player identity");
      await assertVisible(seat.locator(".opponent-hero-name"), "Hero identity");
      expect(presentation.playerNameFits).toBe(true);
      expect(presentation.heroNameFits).toBe(true);
      await assertVisible(seat.locator(".opponent-hero-overlay .player-hp"), "HP");
      await assertVisible(seat.locator(".opponent-hand-footer .player-hand-count"), "concealed Hand count");
      await expect(seat.locator(".game-card")).toHaveCount(0);
      if (equipmentCase.scenario === "multiple") await testInfo.attach("top-row-equipment-art", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
      const bounds = await seat.evaluate((element) => {
        const rect = (node) => { const box = node.getBoundingClientRect(); return { left: box.left, right: box.right, top: box.top, bottom: box.bottom }; };
        const box = rect(element); const dock = rect(document.querySelector(".local-player-dock"));
        const stage = document.querySelector(".interaction-stage");
        const stageBox = stage ? rect(stage) : null;
        const overlap = stageBox && Math.max(0, Math.min(box.right, stageBox.right) - Math.max(box.left, stageBox.left)) * Math.max(0, Math.min(box.bottom, stageBox.bottom) - Math.max(box.top, stageBox.top));
        return { seat: box, dock, stageOverlap: overlap ?? 0, pageWidth: document.documentElement.scrollWidth, viewport: window.innerWidth };
      });
      expect(bounds.seat.bottom).toBeLessThanOrEqual(bounds.dock.top);
      expect(bounds.stageOverlap).toBe(0);
      expect(bounds.pageWidth).toBeLessThanOrEqual(bounds.viewport);
    });
  }
}

for (const width of [480, 650]) {
  for (const count of [6, 10]) {
    test(`UX2.0VIS-10C Side Column ${count} players at ${width}px keeps every equipment category inside its seat`, async ({ page }, testInfo) => {
      await loadFixture(page, { state: "interaction", count, width, height: 900, equipmentCase: "matrix" });
      const result = await sideThumbnailGeometry(page);
      expect(result.seats).toHaveLength(count - 1);
      expect(result.overflow).toBe(false);
      for (const seatGeometry of result.seats) {
        expect(seatGeometry.hitSafe, `${seatGeometry.id} target hit`).toBe(true);
        for (const required of seatGeometry.requiredVisible) expect(required.visible, `${seatGeometry.id} ${required.selector}`).toBe(true);
        for (const child of seatGeometry.descendants) {
          expect(child.x, `${seatGeometry.id} ${child.className}`).toBeGreaterThanOrEqual(seatGeometry.x - 2);
          expect(child.right, `${seatGeometry.id} ${child.className}`).toBeLessThanOrEqual(seatGeometry.right + 2);
          expect(child.bottom, `${seatGeometry.id} ${child.className}`).toBeLessThanOrEqual(result.dock.y - 6);
        }
        const expected = VIS_10C_EQUIPMENT_CASES[Number(seatGeometry.id.slice(1)) - 1]?.slots ?? [];
        const presentation = await opponentSeatPresentation(page, seatGeometry.id);
        expect(presentation.topology).toBe("side-column");
        expect(presentation.imageLoaded).toBe(true);
        expect(presentation.art.width).toBeGreaterThanOrEqual(42);
        expect(presentation.art.height).toBeGreaterThanOrEqual(90);
        expect(presentation.focusCoveredByText, `${seatGeometry.id} Hero focal art remains clear`).toBe(false);
        expect(presentation.focusCoveredByEquipment, `${seatGeometry.id} equipment stays off the Hero focal area`).toBe(false);
        expect(presentation.slots.map(({ slot }) => slot), seatGeometry.id).toEqual(expected);
      }
      const safeZone = await sideSafeZoneGeometry(page);
      for (const stage of safeZone.stageBounds) {
        for (const seat of safeZone.seatBounds) {
          const clearance = seat.side === "left" ? stage.x - seat.right : seat.x - stage.right;
          expect(clearance, `${stage.className} clears ${seat.id} ${seat.className}`).toBeGreaterThanOrEqual(6);
        }
      }
      const emptySeat = page.locator('[data-player-anchor="p8"]');
      if (count === 10) await expect(emptySeat.locator(".opponent-equipment-summary")).toHaveCount(0);
      if (count === 10) await testInfo.attach("side-column-equipment-art", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
    });
  }
}

for (const width of [480, 650]) {
  test(`UX2.0VIS-10C opponent Inspect and target selection remain reachable at ${width}px`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count: 4, width, height: 900, equipmentCase: "matrix" });
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
    await expect(page.getByRole("dialog", { name: "Player 2 opponent inspection" })).toBeVisible();
    await expect(page.locator('.opponent-inspection-zone[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]')).toHaveCount(1);
    await page.getByRole("button", { name: "Close Player 2 inspection" }).click();

    await loadFixture(page, { state: "confirm-cancel", count: 4, width, height: 900, equipmentCase: "matrix" });
    await page.locator('[data-player-anchor="p3"] .opponent-hero-target').click();
    await expect(page.locator('[data-player-anchor="p3"]')).toHaveClass(/selected-target/);
    await expect(page.locator(".borrowed-sword-notice")).toContainText("Target selected");
  });
}

for (const width of [390, 480, 650]) {
  test(`UX2.0VIS-12B four-player Top Row seats follow the Hero-first width at ${width}px`, async ({ page }, testInfo) => {
    await loadFixture(page, { state: "interaction", count: 4, width, height: 900 });
    const layout = await interactionGeometry(page);
    const board = await page.locator('.player-board[data-seat-topology="top-row"]').boundingBox();
    const seats = [...layout.opponents].sort((left, right) => left.left - right.left);
    const geometryResult = await geometry(page);
    const expectedWidth = expectedVis12bSeatWidth(board.width);

    expect(seats).toHaveLength(3);
    expect(Math.max(...seats.map(({ top }) => top)) - Math.min(...seats.map(({ top }) => top))).toBeLessThanOrEqual(4);
    expect([...geometryResult.opponentAnchors].sort((left, right) => left.relativeIndex - right.relativeIndex).map(({ relativeIndex }) => relativeIndex)).toEqual([1, 2, 3]);
    for (const [index, seat] of seats.entries()) {
      expect(seat.width, `seat ${index + 1} follows the responsive width`).toBeCloseTo(expectedWidth, 1);
      expect(seat.bottom, `seat ${index + 1} clears the active Interaction Stage`).toBeLessThanOrEqual(layout.stage.top - 6);
      if (index > 0) expect(seat.left - seats[index - 1].right, `seat ${index + 1} remains separated`).toBeGreaterThanOrEqual(0);
    }
    if (width === 480) {
      for (const seat of seats) expect(seat.width).toBeGreaterThanOrEqual(136);
      for (const seat of seats) expect(seat.width).toBeLessThanOrEqual(146);
      expect(seats[0].left).toBeGreaterThanOrEqual(12);
      expect(width - seats.at(-1).right).toBeGreaterThanOrEqual(12);
      for (let index = 1; index < seats.length; index += 1) {
        const gap = seats[index].left - seats[index - 1].right;
        expect(gap, "480px cards have the approved compact gap").toBeGreaterThanOrEqual(8);
        expect(gap, "480px cards have the approved compact gap").toBeLessThanOrEqual(10);
      }
      await testInfo.attach("vis-12b-four-player-top-row-480", {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    }
    if (width === 650) for (const seat of seats) expect(seat.width).toBeCloseTo(146, 0);

    expect(geometryResult.severeOpponentOverlaps).toEqual([]);
    expect(geometryResult.scrollWidth).toBeLessThanOrEqual(width);
    for (const playerId of ["p2", "p3", "p4"]) {
      const presentation = await opponentSeatPresentation(page, playerId);
      expect(presentation.topology).toBe("top-row");
      expect(presentation.imageLoaded).toBe(true);
      expect(presentation.targetHitSafe).toBe(true);
      expect(presentation.playerNameFits).toBe(true);
      expect(presentation.heroNameFits).toBe(true);
      expect(presentation.art.width).toBeGreaterThanOrEqual(39);
      await assertVisible(page.locator(`[data-player-anchor="${playerId}"] .player-hp`), `${playerId} HP`);
      await assertVisible(page.locator(`[data-player-anchor="${playerId}"] .opponent-hand-footer .player-hand-count`), `${playerId} Hand count`);
    }
  });
}

for (const width of [390, 480, 650]) {
  for (const state of ["rest", "ordinary-turn", "interaction"]) {
    test(`UX2.0VIS-12I four-player ${state} seats keep Hero-first content proportions at ${width}px`, async ({ page }, testInfo) => {
      await loadFixture(page, { state, count: 4, width, height: 900, equipmentCase: "matrix" });
      const seats = await page.locator('.player-board[data-seat-topology="top-row"][data-player-count="4"] > .opponent-player-card').evaluateAll((items) => {
        const bounds = (element) => {
          const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
          return { x, y, right, bottom, width, height };
        };
        return items.map((seat) => {
          const seatBox = bounds(seat);
          const art = seat.querySelector(".opponent-hero-portrait");
          const artBox = bounds(art);
          const name = seat.querySelector(".opponent-hero-name");
          const nameBox = bounds(name);
          const summary = seat.querySelector(".opponent-hand-footer");
          const summaryBox = bounds(summary);
          const target = seat.querySelector(".opponent-hero-target");
          const targetBox = bounds(target);
          const hit = document.elementFromPoint(targetBox.x + targetBox.width / 2, targetBox.y + targetBox.height / 2);
          const image = art.querySelector(".hero-art-image");
          const artStyle = getComputedStyle(image);
          return {
            id: seat.dataset.playerAnchor,
            seat: seatBox,
            art: artBox,
            artShare: artBox.width * artBox.height / (seatBox.width * seatBox.height),
            heroName: name.textContent.trim(),
            heroNameBox: nameBox,
            heroNameShare: nameBox.width * nameBox.height / (seatBox.width * seatBox.height),
            summary: summaryBox,
            summaryShare: summaryBox.width * summaryBox.height / (seatBox.width * seatBox.height),
            playerNameFits: seat.querySelector(".opponent-player-name").scrollWidth <= seat.querySelector(".opponent-player-name").clientWidth,
            heroNameFits: name.scrollWidth <= name.clientWidth,
            imageLoaded: Boolean(image.naturalWidth && image.naturalHeight),
            imageFit: artStyle.objectFit,
            imagePosition: artStyle.objectPosition,
            equipmentCount: seat.querySelectorAll(".opponent-equipment-indicator").length,
            handCount: seat.querySelector(".player-hand-count").textContent.trim(),
            hpVisible: (() => { const box = seat.querySelector(".player-hp").getBoundingClientRect(); return box.width > 0 && box.height > 0; })(),
            targetHitSafe: Boolean(hit && target.contains(hit)),
            pageWidth: document.documentElement.scrollWidth,
          };
        });
      });
      const board = await page.locator('.player-board[data-seat-topology="top-row"][data-player-count="4"]').boundingBox();
      const stage = state === "interaction" ? await page.locator(".interaction-stage").boundingBox() : null;

      expect(seats.map(({ id }) => id).sort()).toEqual(["p2", "p3", "p4"]);
      expect(Math.max(...seats.map(({ seat }) => seat.y)) - Math.min(...seats.map(({ seat }) => seat.y))).toBeLessThanOrEqual(1);
      expect(Math.max(...seats.map(({ pageWidth }) => pageWidth))).toBeLessThanOrEqual(width);
      for (const seat of seats) {
        expect(seat.seat.width).toBeCloseTo(expectedVis12bSeatWidth(board.width), 1);
        expect(seat.artShare, `${seat.id} Hero image is the dominant 62–68% card area`).toBeGreaterThanOrEqual(0.62);
        expect(seat.artShare, `${seat.id} Hero image is the dominant 62–68% card area`).toBeLessThanOrEqual(0.68);
        expect(seat.heroNameShare, `${seat.id} Hero-name strip occupies 14–17%`).toBeGreaterThanOrEqual(0.14);
        expect(seat.heroNameShare, `${seat.id} Hero-name strip occupies 14–17%`).toBeLessThanOrEqual(0.17);
        expect(seat.summaryShare, `${seat.id} Equipment/Hand summary occupies 18–21%`).toBeGreaterThanOrEqual(0.18);
        expect(seat.summaryShare, `${seat.id} Equipment/Hand summary occupies 18–21%`).toBeLessThanOrEqual(0.21);
        expect(seat.imageLoaded, `${seat.id} uses its real Hero artwork`).toBe(true);
        expect(seat.imageFit).toBe("cover");
        expect(seat.imagePosition).toBe("50% 20%");
        expect(seat.playerNameFits).toBe(true);
        expect(seat.heroNameFits).toBe(true);
        expect(seat.hpVisible).toBe(true);
        expect(seat.equipmentCount).toBe(1);
        expect(seat.handCount).toBe("2");
        expect(seat.targetHitSafe).toBe(true);
        expect(seat.art.x).toBeGreaterThanOrEqual(seat.seat.x);
        expect(seat.art.right).toBeLessThanOrEqual(seat.seat.right);
        expect(seat.heroNameBox.x).toBeGreaterThanOrEqual(seat.seat.x);
        expect(seat.heroNameBox.right).toBeLessThanOrEqual(seat.seat.right);
        expect(seat.summary.bottom).toBeLessThanOrEqual(seat.seat.bottom);
        if (stage) expect(seat.seat.bottom).toBeLessThanOrEqual(stage.y - 6);
      }
      const orderedSeats = [...seats].sort((left, right) => left.seat.x - right.seat.x);
      const rightmost = orderedSeats.at(-1).seat.right;
      const leftmost = orderedSeats[0].seat.x;
      expect(leftmost).toBeGreaterThanOrEqual(8);
      expect(width - rightmost).toBeGreaterThanOrEqual(8);
      for (let index = 1; index < orderedSeats.length; index += 1) {
        expect(orderedSeats[index].seat.x - orderedSeats[index - 1].seat.right).toBeGreaterThanOrEqual(0);
      }
      if (width === 480) {
        await testInfo.attach(`vis-12i-four-player-${state}-480`, {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      }
    });
  }
}

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 650, height: 900 }, { width: 390, height: 640 }]) {
  test(`UX2.0VIS-12K four-player ordinary turn protects the complete Dock at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
    await loadFixture(page, { state: "ordinary-turn", count: 4, ...viewport });
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    const seats = await geometry(page);
    expect(seats.opponentAnchors).toHaveLength(3);
    expect(seats.localDockAnchorCount).toBe(1);
    expect(seats.severeOpponentOverlaps).toEqual([]);
    expect(seats.scrollWidth).toBeLessThanOrEqual(viewport.width);
    const rail = page.locator(".local-hand-rail");
    await expect(rail).toHaveAttribute("data-hand-layout", "measured");
    const hand = await readHandViewport(rail);
    expect(hand.cards).toHaveLength(6);
    expect(new Set(hand.cards.map(({ id }) => id)).size).toBe(6);
    expect(hand.cards.every(({ visible }) => visible)).toBe(true);
    await expect(page.locator('[data-action-slot="decline"] button')).toHaveText("End");
    await expect(page.locator('[data-action-slot="decline"] button')).toBeEnabled();

    const measureDock = () => page.locator(".local-player-dock").evaluate((dock) => {
      const box = (element) => {
        const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const parts = Object.fromEntries(Object.entries({ hero: ".local-hero-card", skills: ".local-status-panel", equipment: ".local-equipment-panel", hand: ".local-hand", guidance: ".console-guidance", actions: ".turn-controls" }).map(([name, selector]) => [name, box(dock.querySelector(selector))]));
      return { dock: box(dock), parts, cards: [...dock.querySelectorAll(".local-hand-rail .game-card")].map(box), buttons: ["primary", "decline"].map((slot) => ({ slot, ...box(dock.querySelector(`[data-action-slot="${slot}"] button`)) })), pageWidth: document.documentElement.scrollWidth };
    });
    const layout = await measureDock();
    const { hero, skills, equipment, hand: handArea, guidance, actions } = layout.parts;
    expect(hero.right).toBeLessThanOrEqual(handArea.left + 1);
    expect(skills.right).toBeLessThanOrEqual(equipment.left + 1);
    expect(handArea.top).toBeGreaterThanOrEqual(Math.max(skills.bottom, equipment.bottom) - 1);
    expect(handArea.bottom, "guidance belongs below Hand").toBeLessThanOrEqual(guidance.top);
    expect(guidance.bottom, "guidance stays above bottom actions").toBeLessThanOrEqual(actions.top);
    for (const [name, part] of Object.entries(layout.parts)) {
      expect(part.width, `${name} remains visible`).toBeGreaterThan(0);
      expect(part.left, `${name} stays in the Dock`).toBeGreaterThanOrEqual(layout.dock.left - 1);
      expect(part.right, `${name} stays in the Dock`).toBeLessThanOrEqual(layout.dock.right + 1);
      expect(part.bottom, `${name} stays in the Dock`).toBeLessThanOrEqual(layout.dock.bottom + 1);
    }
    for (const card of layout.cards) {
      expect(card.width).toBeGreaterThanOrEqual(68);
      expect(card.height).toBeGreaterThanOrEqual(102);
      expect(card.bottom).toBeLessThanOrEqual(actions.top);
    }
    for (const button of layout.buttons) {
      expect(button.width).toBeGreaterThanOrEqual(78);
      expect(button.height).toBeGreaterThanOrEqual(32);
    }
    if (viewport.width <= 480) expect(layout.buttons[1].left - layout.buttons[0].right).toBeGreaterThanOrEqual(32);
    await testInfo.attach("four-player-ordinary-geometry", { body: JSON.stringify(layout, null, 2), contentType: "application/json" });
    await testInfo.attach("four-player-ordinary", { body: await page.screenshot({ path: testInfo.outputPath("ordinary.png"), animations: "disabled" }), contentType: "image/png" });

    const card = rail.locator('[data-hand-card-id="browser-ordinary-5"] .game-card');
    const before = await card.boundingBox();
    await card.click({ position: { x: 8, y: 45 } });
    await expect(card).toHaveClass(/selected/);
    const selected = await card.boundingBox();
    expect(selected.y).toBeLessThan(before.y);
    expect(selected.y + selected.height).toBeLessThanOrEqual(actions.top);
    expect((await measureDock()).pageWidth).toBeLessThanOrEqual(viewport.width);
    await expect(page.locator('[data-action-slot="decline"] button')).toBeEnabled();
    await testInfo.attach("four-player-selected", { body: await page.screenshot({ path: testInfo.outputPath("selected.png"), animations: "disabled" }), contentType: "image/png" });
  });
}

test("UX2.0VIS-12I four-player desktop retains its existing Hero and Equipment anchors", async ({ page }) => {
  await loadFixture(page, { state: "rest", count: 4, width: 1440, height: 900, equipmentCase: "matrix" });
  const seats = await page.locator('.player-board[data-seat-topology="top-row"][data-player-count="4"] > .opponent-player-card').evaluateAll((items) => items.map((seat) => {
    const bounds = (element) => {
      const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
      return { x, y, right, bottom, width, height };
    };
    return {
      id: seat.dataset.playerAnchor,
      seat: bounds(seat),
      hero: bounds(seat.querySelector(".opponent-hero-card")),
      art: bounds(seat.querySelector(".opponent-hero-portrait")),
      equipment: bounds(seat.querySelector(".opponent-equipment-summary")),
      target: (() => {
        const target = seat.querySelector(".opponent-hero-target");
        const rect = target.getBoundingClientRect();
        const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
        return Boolean(hit && target.contains(hit));
      })(),
    };
  }));

  expect(seats.map(({ id }) => id).sort()).toEqual(["p2", "p3", "p4"]);
  for (const seat of seats) {
    expect(seat.art.width).toBeCloseTo(52, 0);
    expect(seat.art.height).toBeCloseTo(70, 0);
    expect(seat.equipment.y).toBeCloseTo(seat.hero.y + 2, 0);
    expect(seat.target).toBe(true);
  }
});

for (const width of [390, 480]) {
  for (const count of [2, 3, 4]) {
    test(`UX2.0VIS-12J ${count}-player single-target Stage stays centered at ${width}px`, async ({ page }, testInfo) => {
      await loadFixture(page, { state: "interaction", count, width, height: 900 });
    const layout = await interactionGeometry(page);
    const stage = await page.locator(".interaction-stage").evaluate((element) => {
      const bounds = (node) => {
        const { x, y, right, bottom, width, height } = node.getBoundingClientRect();
        return { x, y, right, bottom, width, height };
      };
      const visibleRegions = [...element.querySelectorAll(":scope > header, :scope > .interaction-stage-body, .interaction-stage-body > .interaction-stage-hero-region, .interaction-stage-body > .interaction-stage-event-region, .interaction-stage-body > .interaction-stage-meta-region")]
        .filter((node) => {
          const box = node.getBoundingClientRect();
          const style = getComputedStyle(node);
          return box.width > 0 && box.height > 0 && style.display !== "none" && style.visibility !== "hidden";
        })
        .map((node) => ({ className: node.className || node.tagName, ...bounds(node) }));
      return {
        stage: bounds(element),
        safeZone: bounds(element.parentElement),
        visibleRegions,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
      };
    });

    expect(stage.stage.width).toBeCloseTo(Math.min(stage.safeZone.width * 0.88, 410), 0);
    expect(stage.stage.x + stage.stage.width / 2).toBeCloseTo(stage.safeZone.x + stage.safeZone.width / 2, 0);
    expect(stage.stage.x).toBeGreaterThanOrEqual(stage.safeZone.x);
    expect(stage.stage.right).toBeLessThanOrEqual(stage.safeZone.right);
    expect(stage.scrollWidth).toBeLessThanOrEqual(stage.clientWidth);
    expect(stage.visibleRegions.length).toBeGreaterThanOrEqual(3);
    for (const region of stage.visibleRegions) {
      expect(region.x, `${region.className} stays inside the centered Stage`).toBeGreaterThanOrEqual(stage.stage.x - 1);
      expect(region.right, `${region.className} stays inside the centered Stage`).toBeLessThanOrEqual(stage.stage.right + 1);
    }
    expect(layout.opponents).toHaveLength(count - 1);
    expect(Math.max(...layout.opponents.map(({ bottom }) => bottom))).toBeLessThanOrEqual(layout.stage.top - 6);
    expect(layout.stageDockOverlap).toBe(0);
    expect(layout.safeZoneDockOverlap).toBe(0);
    expect(layout.scrollWidth).toBeLessThanOrEqual(width);
    await expect(page.locator(".hero-focus")).toBeVisible();
    if (width === 480 && count === 4) {
      await testInfo.attach("vis-12j-four-player-single-target-480", {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    }
    });
  }
}

for (const width of [390, 480, 650]) {
  for (const state of ["rest", "interaction"]) {
    test(`UX2.0VIS-12C ${state} keeps mobile card piles secondary at ${width}px`, async ({ page }, testInfo) => {
      await loadFixture(page, { state, count: 4, width, height: 900 });
      const piles = await page.locator(".play-center").evaluate((center) => {
        const rect = (element) => {
          const box = element.getBoundingClientRect();
          const style = getComputedStyle(element);
          return {
            left: box.left, top: box.top, right: box.right, bottom: box.bottom,
            width: box.width, height: box.height,
            background: style.backgroundColor, borderColor: style.borderTopColor,
          };
        };
        const table = document.querySelector(".play-table").getBoundingClientRect();
        const draw = center.querySelector(".draw-stack");
        const discard = center.querySelector(".discard-stack");
        return {
          center: rect(center), table: { left: table.left, top: table.top, width: table.width, height: table.height, bottom: table.bottom },
          draw: { ...rect(draw), label: draw.getAttribute("aria-label"), text: draw.textContent },
          discard: { ...rect(discard), label: discard.getAttribute("aria-label"), text: discard.textContent },
          pileZ: getComputedStyle(center).zIndex,
          stageZ: document.querySelector(".interaction-stage") ? getComputedStyle(document.querySelector(".interaction-stage")).zIndex : null,
          pageWidth: document.documentElement.scrollWidth,
        };
      });

      for (const [name, pile] of [["Deck", piles.draw], ["Discard", piles.discard]]) {
        expect(pile.width, `${name} remains compact`).toBe(56);
        expect(pile.height, `${name} remains compact`).toBe(78);
      }
      expect(piles.center.left + piles.center.width / 2).toBeCloseTo(piles.table.left + piles.table.width / 2, 0);
      expect(piles.center.top + piles.center.height / 2).toBeGreaterThan(piles.table.top + piles.table.height * 0.45);
      expect(piles.center.bottom).toBeLessThanOrEqual(piles.table.bottom);
      expect(piles.draw.background).toBe("rgb(18, 21, 16)");
      expect(piles.discard.background).toBe("rgb(52, 49, 39)");
      expect(piles.draw.label).toMatch(/^Draw pile, \d+ cards$/);
      expect(piles.discard.label).toBe("Discard pile, empty");
      expect(piles.draw.text).toContain("DECK");
      expect(piles.discard.text).toContain("DISCARD");
      expect(piles.pageWidth).toBeLessThanOrEqual(width);
      if (state === "interaction") {
        expect(Number(piles.stageZ)).toBeGreaterThan(Number(piles.pileZ));
        await assertVisible(page.locator(".interaction-stage"), "active Interaction Stage remains prominent");
      }
      if (width === 480 && state === "interaction") {
        await testInfo.attach("vis-12c-mobile-card-piles-480", {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      }
    });
  }
}

for (const width of [480, 650]) {
  test(`UX2.0VIS-12D four-player Top Row Hero art uses the upper-body crop at ${width}px`, async ({ page }, testInfo) => {
    await loadFixture(page, { state: "rest", count: 4, width, height: 900, equipmentCase: "matrix" });
    const seatIds = await page.locator(".player-board [data-player-anchor]").evaluateAll((seats) => seats.map((seat) => seat.getAttribute("data-player-anchor")));
    expect(seatIds).toHaveLength(3);

    for (const playerId of seatIds) {
      const presentation = await opponentSeatPresentation(page, playerId);
      expect(presentation.heroArtId, `${playerId} uses a real repository Hero asset`).not.toBeNull();
      expect(presentation.imageLoaded, `${playerId} Hero art is loaded`).toBe(true);
      expect(presentation.artNaturalSize.width, `${playerId} source art retains intrinsic width`).toBeGreaterThan(0);
      expect(presentation.artNaturalSize.height, `${playerId} source art retains intrinsic height`).toBeGreaterThan(0);
      expect(presentation.artObjectFit, `${playerId} art keeps its aspect ratio`).toBe("cover");
      expect(presentation.artObjectPosition, `${playerId} crop uses the approved upper-body focal range`).toBe("50% 20%");
      expect(presentation.focusCoveredByText, `${playerId} face/upper-body focus stays clear of identity text`).toBe(false);
      expect(presentation.focusCoveredByEquipment, `${playerId} face/upper-body focus stays clear of Equipment`).toBe(false);
      expect(presentation.targetHitSafe, `${playerId} target hit area remains reachable`).toBe(true);
      expect(presentation.art.x).toBeGreaterThanOrEqual(presentation.seat.x - 1);
      expect(presentation.art.right).toBeLessThanOrEqual(presentation.seat.right + 1);
    }

    if (width === 480) {
      await testInfo.attach("vis-12d-top-row-hero-crop-480", {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    }
  });
}

for (const count of [4, 10]) {
  for (const width of [480, 650]) {
    test(`UX2.0VIS-12E ${count}-player Hero Focus uses the upper-body crop at ${width}px`, async ({ page }, testInfo) => {
      await loadFixture(page, { state: "interaction", count, width, height: 900 });
      const heroFocus = page.locator('[data-hero-focus="true"]');
      await expect(heroFocus).toHaveCount(1);
      const crop = await heroFocus.locator(".hero-focus-portrait").evaluate((portrait) => {
        const art = portrait.querySelector(".hero-art-image");
        const style = art ? getComputedStyle(art) : null;
        const portraitRect = portrait.getBoundingClientRect();
        const artRect = art?.getBoundingClientRect() ?? null;
        return {
          heroId: portrait.getAttribute("data-hero-id"),
          loaded: Boolean(art?.naturalWidth && art.naturalHeight),
          naturalSize: art ? { width: art.naturalWidth, height: art.naturalHeight } : null,
          objectFit: style?.objectFit ?? null,
          objectPosition: style?.objectPosition ?? null,
          portraitOverflow: getComputedStyle(portrait).overflow,
          portrait: { left: portraitRect.left, top: portraitRect.top, right: portraitRect.right, bottom: portraitRect.bottom },
          artIntersectsPortrait: Boolean(artRect && artRect.left < portraitRect.right && artRect.right > portraitRect.left && artRect.top < portraitRect.bottom && artRect.bottom > portraitRect.top),
        };
      });

      expect(crop.heroId, "Hero Focus uses the proven projected Hero").not.toBeNull();
      expect(crop.loaded, "the repository Hero artwork is loaded").toBe(true);
      expect(crop.naturalSize.width).toBeGreaterThan(0);
      expect(crop.naturalSize.height).toBeGreaterThan(0);
      expect(crop.objectFit).toBe("cover");
      expect(crop.objectPosition, "Hero Focus uses the approved upper-body focal range").toBe("50% 20%");
      expect(crop.portraitOverflow, "the portrait clips source-art overflow to its visible viewport").toBe("hidden");
      expect(crop.artIntersectsPortrait, "the art remains visible within the portrait viewport").toBe(true);

      if (width === 480) {
        await testInfo.attach(`vis-12e-hero-focus-${count}-players-480`, {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      }
    });
  }
}

for (const hero of ["cao-cao", "liu-bei"]) {
  for (const width of [480, 650]) {
    test(`UX2.0VIS-12G local ${hero} art uses a proportional upper-body crop at ${width}px`, async ({ page }, testInfo) => {
      await loadFixture(page, { state: "rest", count: 4, width, height: 900, hero });
      const localHero = page.locator('.local-player-dock[data-player-anchor="p1"] .local-hero-card');
      const crop = await localHero.locator(".hero-art-image").evaluate((art) => {
        const frame = art.parentElement;
        const frameRect = frame.getBoundingClientRect();
        const artRect = art.getBoundingClientRect();
        const style = getComputedStyle(art);
        return {
          heroId: frame.getAttribute("data-hero-id"),
          loaded: Boolean(art.naturalWidth && art.naturalHeight),
          naturalRatio: art.naturalWidth / art.naturalHeight,
          renderedRatio: artRect.width / artRect.height,
          objectFit: style.objectFit,
          objectPosition: style.objectPosition,
          overflow: getComputedStyle(frame).overflow,
          frame: { left: frameRect.left, top: frameRect.top, width: frameRect.width, height: frameRect.height },
          art: { left: artRect.left, top: artRect.top, width: artRect.width, height: artRect.height },
          pageWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });

      expect(crop.heroId).toBe(hero);
      expect(crop.loaded, "the original repository Hero art loads").toBe(true);
      expect(crop.naturalRatio).toBeGreaterThan(0);
      expect(crop.renderedRatio).toBeCloseTo(crop.naturalRatio, 2);
      expect(crop.objectFit).toBe("cover");
      expect(crop.objectPosition).toBe("50% 20%");
      expect(crop.overflow).toBe("hidden");
      expect(crop.art.height / crop.frame.height).toBeCloseTo(1.15, 2);
      expect((crop.frame.top - crop.art.top) / crop.frame.height).toBeCloseTo(0.05, 2);
      expect(crop.pageWidth, "the local Hero crop does not create horizontal page overflow").toBeLessThanOrEqual(crop.viewportWidth);
      await expect(localHero.locator(".local-hero-label")).toBeVisible();
      await expect(localHero.locator(".local-hero-role")).toBeVisible();
      await expect(localHero.locator(".local-hero-hp")).toBeVisible();

      if (width === 480) {
        await testInfo.attach(`vis-12g-local-${hero}-480`, {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      }
    });
  }
}

for (const state of ["local-judgement-one", "local-judgement-two"]) {
  test(`UX2.0VIS-12G ${state} keeps the persistent Judgement overlay and local Hero crop`, async ({ page }, testInfo) => {
    await loadFixture(page, { state, count: 4, width: 480, height: 900, hero: "cao-cao" });
    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const hero = dock.locator(".local-hero-card");
    await expect(hero.locator(".hero-art-image")).toBeVisible();
    await expect(hero.locator(".local-hero-label")).toHaveText("Cao Cao");
    const judgement = dock.locator(".local-judgement-overlay .local-zone-card");
    await expect(judgement).toHaveCount(state === "local-judgement-one" ? 1 : 2);
    await expect(judgement.first().locator(".zone-info-button")).toBeVisible();
    await expect(hero).toBeVisible();
    const pageWidth = await page.locator("html").evaluate((html) => html.scrollWidth);
    expect(pageWidth, "the local Hero crop and Judgement overlay do not create horizontal page overflow").toBeLessThanOrEqual(480);
    await testInfo.attach(`vis-12g-${state}-480`, {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  });
}

for (const width of [1440, 650, 480]) {
  for (const count of [6, 10]) {
    for (const state of count === 6 ? ["interaction", "negation", "dying", "group-observer"] : ["interaction", "negation"]) {
      test(`UX2.0VIS-05B ${count} players ${state} at ${width}px preserve the central safe zone`, async ({ page }, testInfo) => {
        await loadFixture(page, { state, count, width, height: 900 });
        const result = await sideSafeZoneGeometry(page);
        await testInfo.attach("side-safe-zone-geometry", { body: JSON.stringify(result, null, 2), contentType: "application/json" });
        expect(result.zoneStyle).toEqual({ position: "absolute", display: "flex", background: "rgba(0, 0, 0, 0)", border: "0px", overflowX: "visible", overflowY: "visible" });
        expect(result.stageStyle).toEqual({ position: "relative", translate: "none", transform: "none", overflowX: "visible", overflowY: "visible" });
        expect(result.zone.width).toBeGreaterThan(0);
        expect(result.zone.height).toBeGreaterThan(0);
        for (const box of [result.zone, ...result.stageBounds]) {
          expect(box.x, box.className).toBeGreaterThanOrEqual(result.zone.x - .5);
          expect(box.right, box.className).toBeLessThanOrEqual(result.zone.right + .5);
          expect(box.y, box.className).toBeGreaterThanOrEqual(result.table.y);
          expect(box.bottom, box.className).toBeLessThanOrEqual(result.table.bottom);
          expect(box.bottom, box.className).toBeLessThanOrEqual(result.dock.y);
          for (const seat of result.seatBounds) {
            const clearance = seat.side === "left" ? box.x - seat.right : seat.x - box.right;
            expect(clearance, `${box.className ?? "safe zone"} / ${seat.id} ${seat.className}`).toBeGreaterThanOrEqual(6);
          }
        }
        expect(result.scrollWidth).toBeLessThanOrEqual(result.viewport);
        if (state === "negation") {
          expect(result.reaction).toBe(true);
          await expect(page.locator('[data-reaction-chain="proven"]')).toBeVisible();
        }
        if (state === "dying") {
          expect(result.dying).toBe(true);
          await expect(page.locator('[data-dying-handoff="proven"]')).toBeVisible();
        }
        await expect(page.locator(".interaction-stage button")).toHaveCount(0);
        const thumbnails = await sideThumbnailGeometry(page);
        expect(thumbnails.seats.every((seat) => seat.hitSafe)).toBe(true);
      });
    }
  }
}

test("UX2.0VIS-05B rejects legacy absolute Stage placement at 480px", async ({ page }) => {
  await loadFixture(page, { state: "negation", count: 10, width: 480, height: 900 });
  const stage = page.locator(".interaction-stage");
  await stage.evaluate((element) => Object.assign(element.style, { position: "absolute", left: "50%", top: "7px", width: "96vw", maxWidth: "none", translate: "-50% 0" }));
  const legacy = await sideSafeZoneGeometry(page);
  expect(legacy.stage.x < legacy.zone.x || legacy.stage.right > legacy.zone.right).toBe(true);
  await stage.evaluate((element) => element.removeAttribute("style"));
  const restored = await sideSafeZoneGeometry(page);
  expect(restored.stage.x).toBeGreaterThanOrEqual(restored.zone.x);
  expect(restored.stage.right).toBeLessThanOrEqual(restored.zone.right);
});

for (const width of [1440, 650, 480]) {
  for (const count of [4, 6, 10]) {
    test(`UX2.0VIS-07A neutral ${count}-player Group scope at ${width}px remains contained`, async ({ page }, testInfo) => {
      await loadFixture(page, { state: "group-density", count, width, height: 900 });
      const scope = page.locator('[data-group-target-scope="original"]');
      const renderedSecondaryCount = count - 3; // fixture excludes viewer, primary, and source
      await expect(scope).toHaveAttribute("data-participant-density", renderedSecondaryCount >= 4 ? "compact" : "medium");
      const cards = scope.locator("[data-group-target-id]");
      await expect(cards).toHaveCount(renderedSecondaryCount);
      const ids = await cards.evaluateAll(elements => elements.map(element => element.dataset.groupTargetId));
      expect(ids).not.toContain("p3"); // viewer
      expect(ids).not.toContain("p1"); // authoritative current primary
      expect(ids).not.toContain("p4"); // distinct source
      expect(new Set(ids).size).toBe(ids.length);
      await expect(page.locator(".hero-focus")).toHaveAttribute("data-hero-focus-player-id", "p1");
      expect(await scope.innerText()).not.toMatch(/completed|pending|resolved|remaining|outcome|order|eligible|target \d+ of/i);
      await expect(scope.locator("button")).toHaveCount(0);
      const focusPortrait = await page.locator(".hero-focus-portrait").boundingBox();
      const secondary = await scope.locator(".group-target-portrait").first().boundingBox();
      expect(secondary.width).toBeLessThan(focusPortrait.width);
      const result = await page.locator(".interaction-stage").evaluate(stage => {
        const rect = element => { const r=element.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom}; };
        const visible = element => { const s=getComputedStyle(element),r=element.getBoundingClientRect();return s.display!=="none"&&s.visibility!=="hidden"&&r.width>0&&r.height>0; };
        return {zone:rect(stage.parentElement),dock:rect(document.querySelector(".local-player-dock")),boxes:[stage,...stage.querySelectorAll("*")].filter(visible).map(rect)};
      });
      await testInfo.attach("group-scope-bounds", {body:JSON.stringify(result),contentType:"application/json"});
      for (const box of result.boxes) {
        expect(box.x).toBeGreaterThanOrEqual(result.zone.x - .5);
        expect(box.right).toBeLessThanOrEqual(result.zone.right + .5);
        expect(box.bottom).toBeLessThanOrEqual(result.zone.bottom + .5);
        expect(box.bottom).toBeLessThanOrEqual(result.dock.y);
      }
      if (count > 4) {
        const layout = await sideSafeZoneGeometry(page);
        for (const box of [layout.zone,...layout.stageBounds]) for (const seat of layout.seatBounds) {
          expect(seat.side === "left" ? box.x-seat.right : seat.x-box.right).toBeGreaterThanOrEqual(6);
        }
        expect((await sideThumbnailGeometry(page)).seats.every(seat => seat.hitSafe)).toBe(true);
      }
    });
  }
}

for (const width of [1440, 650, 480]) {
  for (const state of ["interaction", "negation", "dying", "group-observer"]) {
    test(`UX2.0VIS-08A ${state} at ${width}px keeps an open Side Column Stage shell`, async ({ page }) => {
      await loadFixture(page, { state, count: 6, width, height: 900 });
      const stage = page.locator(".interaction-stage");
      await expect(stage).toHaveCount(1);
      const shell = await stage.evaluate(element => {
        const style = getComputedStyle(element);
        const header = element.querySelector(":scope > header");
        const headerStyle = getComputedStyle(header);
        const stageRect = element.getBoundingClientRect();
        const headerRect = header.getBoundingClientRect();
        return {
          background: style.backgroundColor,
          borderWidth: style.borderTopWidth,
          boxShadow: style.boxShadow,
          padding: style.padding,
          headerDisplay: headerStyle.display,
          headerBorderWidth: headerStyle.borderBottomWidth,
          headerWidth: headerRect.width,
          stageWidth: stageRect.width,
        };
      });
      expect(shell.background).toBe("rgba(0, 0, 0, 0)");
      expect(shell.borderWidth).toBe("0px");
      expect(shell.boxShadow).toBe("none");
      expect(shell.padding).toBe("0px");
      expect(shell.headerDisplay).toBe("inline-flex");
      expect(shell.headerBorderWidth).toBe("0px");
      expect(shell.headerWidth).toBeLessThanOrEqual(shell.stageWidth + 0.5);
      await expect(stage).toContainText("INTERACTION STAGE");

      const retainedPanel = state === "negation" ? page.locator(".reaction-chain")
        : state === "dying" ? page.locator(".dying-handoff")
        : page.locator(".hero-focus");
      await expect(retainedPanel).toBeVisible();
      const panelBackground = await retainedPanel.evaluate(element => getComputedStyle(element).backgroundColor);
      expect(panelBackground).not.toBe("rgba(0, 0, 0, 0)");

      const geometry = await sideSafeZoneGeometry(page);
      expect(geometry.stage.x).toBeGreaterThanOrEqual(geometry.zone.x - 0.5);
      expect(geometry.stage.right).toBeLessThanOrEqual(geometry.zone.right + 0.5);
      expect(geometry.stage.bottom).toBeLessThanOrEqual(geometry.dock.y);
    });
  }
}

test("UX2.0VIS-08B ambiguous Group scope does not fabricate a single Stage focus", async ({ page }) => {
  await loadFixture(page, { state: "group-unfocused", count: 6, width: 650, height: 900 });
  const stage = page.locator(".interaction-stage");
  const scopeRow = page.locator(".interaction-stage-meta-region .interaction-stage-focus > div").nth(1);
  await expect(stage).toHaveCount(1);
  await expect(page.locator(".hero-focus")).toHaveCount(0);
  await expect(scopeRow.locator("small")).toHaveText("SCOPE");
  await expect(scopeRow.locator("b")).toHaveText("No proven focus");
  await expect(scopeRow.locator("em")).toHaveText("Active scope: Player 1, Player 2");
  await expect(stage.locator(".interaction-stage-meta-region")).not.toContainText("FOCUS");
});

for (const width of [1440, 480]) {
  test(`UX2.0VIS-08C ${width}px Dying handoff omits duplicate role metadata`, async ({ page }) => {
    await loadFixture(page, { state: "dying", count: 6, width, height: 900 });
    await expect(page.locator('[data-medium-participant="source"]')).toHaveAttribute("data-medium-participant-player-id", "p1");
    await expect(page.locator(".hero-focus")).toHaveAttribute("data-hero-focus-player-id", "p2");
    const handoff = page.locator('[data-dying-handoff="proven"]');
    await expect(handoff).toBeVisible();
    await expect(handoff).toContainText("Player 2");
    await expect(handoff).toContainText("Player 3");
    await expect(page.locator(".interaction-stage-meta-region")).toHaveCount(0);
  });
}

test("UX2.0VIS-12M omits a source summary already named by Hero Focus", async ({ page }) => {
  await loadFixture(page, { state: "interaction", count: 4, width: 650, height: 900 });
  const stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage.locator(".hero-focus")).toHaveAttribute("data-hero-focus-source-id", "p1");
  await expect(stage.locator(".hero-focus-source")).toHaveText("SOURCE · Player 1");
  await expect(stage.locator('[data-stage-meta-role="source"]')).toHaveCount(0);
  await expect(stage.locator(".interaction-stage-focus")).toHaveClass(/interaction-stage-focus--single/);
  await expect(stage.locator('[data-stage-meta-role="focus"]')).toContainText("FOCUS");
  await expect(stage.locator('[data-stage-meta-role="focus"]')).toContainText("Current participant: Player 1");
});

test("UX2.0VIS-12M omits a source summary already named by Medium Source", async ({ page }) => {
  await loadFixture(page, { state: "group-observer", count: 4, width: 480, height: 900 });
  const stage = page.locator('[aria-label="Interaction Stage"]');
  const source = stage.locator('[data-medium-participant="source"]');
  await expect(source).toBeVisible();
  await expect(source).toHaveAttribute("data-medium-participant-player-id", "p4");
  await expect(source.locator(".medium-participant-role")).toHaveText("SOURCE");
  await expect(stage.locator('[data-stage-meta-role="source"]')).toHaveCount(0);
  await expect(stage.locator(".interaction-stage-focus")).toHaveClass(/interaction-stage-focus--single/);
  await expect(stage.locator('[data-stage-meta-role="focus"]')).toContainText("FOCUS");
});

test("UX2.0VIS-12M keeps source and scope metadata when no source presentation is rendered", async ({ page }) => {
  await loadFixture(page, { state: "group-unfocused", count: 4, width: 650, height: 900 });
  const stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage.locator(".hero-focus")).toHaveCount(0);
  await expect(stage.locator(".medium-participant-card")).toHaveCount(0);
  await expect(stage.locator('[data-stage-meta-role="source"]')).toContainText("Player 4");
  await expect(stage.locator('[data-stage-meta-role="scope"]')).toContainText("No proven focus");
});

test("UX2.0VIS-12M keeps source fallback when Stage source identity is missing", async ({ page }) => {
  await loadFixture(page, { state: "interaction", count: 4, width: 650, height: 900, source: "none" });
  const stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage.locator(".hero-focus-source")).toHaveCount(0);
  await expect(stage.locator('[data-stage-meta-role="source"]')).toContainText("Unknown source");
  await expect(stage.locator('[data-stage-meta-role="focus"]')).toContainText("FOCUS");
});

for (const { width, focus, medium } of [
  { width: 1440, focus: [90, 113], medium: [56, 70] },
  { width: 650, focus: [72, 90], medium: [48, 60] },
  { width: 480, focus: [64, 80], medium: [42, 53] },
]) {
  for (const state of ["interaction", "negation", "dying", "group-observer"]) {
    test(`UX2.0VIS-05C ${state} at ${width}px preserves proven participant hierarchy`, async ({ page }) => {
      await loadFixture(page, { state, count: 6, width, height: 900 });
      const primary = page.locator(".hero-focus-portrait");
      const portrait = await primary.boundingBox();
      expect(portrait.width).toBe(focus[0]);
      expect(portrait.height).toBe(focus[1]);
      const source = page.locator('[data-medium-participant="source"]');
      if (state === "dying" || state === "group-observer") {
        await expect(source).toHaveCount(1);
        await expect(source).toHaveAttribute("data-medium-participant-player-id", state === "dying" ? "p1" : "p4");
        await expect(page.locator(".hero-focus")).toHaveAttribute("data-hero-focus-player-id", state === "dying" ? "p2" : "p1");
        const sourcePortrait = await source.locator(".medium-participant-portrait").boundingBox();
        expect(sourcePortrait.width).toBe(medium[0]);
        expect(sourcePortrait.height).toBe(medium[1]);
        expect(sourcePortrait.width).toBeLessThan(portrait.width);
        expect((await source.boundingBox()).y + (await source.boundingBox()).height).toBeLessThanOrEqual(portrait.y);
        await expect(page.locator('[data-medium-source-arrow="true"]')).toHaveText("↓");
      } else {
        await expect(source).toHaveCount(0); // local source or source already primary
      }
      const localId = await page.locator(".local-player-dock").getAttribute("data-player-anchor");
      await expect(page.locator(`.interaction-stage [data-hero-focus-player-id="${localId}"], .interaction-stage [data-medium-participant-player-id="${localId}"]`)).toHaveCount(0);
      const result = await sideSafeZoneGeometry(page);
      for (const box of result.stageBounds) {
        expect(box.x, box.className).toBeGreaterThanOrEqual(result.zone.x - .5);
        expect(box.right, box.className).toBeLessThanOrEqual(result.zone.right + .5);
        expect(box.bottom, box.className).toBeLessThanOrEqual(result.zone.bottom);
      }
    });
  }
}

for (const width of [480, 650, 1440]) {
  for (const count of [5, 6, 7, 8, 9, 10]) {
    test(`UX2.0VIS-05A-FIX1 ${count} players at ${width}px contain every thumbnail descendant and hit target`, async ({ page }, testInfo) => {
      await loadFixture(page, { state: "rest", count, width, height: 900 });
      const result = await sideThumbnailGeometry(page);
      const left30 = result.board.x + result.board.width * .3;
      const right70 = result.board.x + result.board.width * .7;
      expect(result.seats).toHaveLength(count - 1);
      for (const seat of result.seats) {
        expect(seat.hitSafe, `${seat.id} hero centre must hit its own target`).toBe(true);
        expect(seat.width).toBeGreaterThanOrEqual(44);
        expect(seat.width).toBeLessThanOrEqual(86);
        expect(seat.height).toBeLessThanOrEqual(result.rowHeights[seat.row - 1] + 2);
        for (const required of seat.requiredVisible) expect(required.visible, `${seat.id} ${required.selector} remains directly visible`).toBe(true);
        for (const child of seat.descendants) {
          const label = `${seat.id} ${child.className}`;
          expect(child.x, label).toBeGreaterThanOrEqual(seat.x - 2);
          expect(child.y, label).toBeGreaterThanOrEqual(seat.y - 2);
          expect(child.right, label).toBeLessThanOrEqual(seat.right + 2);
          expect(child.bottom, label).toBeLessThanOrEqual(seat.bottom + 2);
          expect(child.bottom, label).toBeLessThanOrEqual(result.dock.y - 6);
          if (seat.side === "left") expect(child.right, label).toBeLessThanOrEqual(left30 + 2);
          else expect(child.x, label).toBeGreaterThanOrEqual(right70 - 2);
          for (const other of result.seats.filter(({ id }) => id !== seat.id)) {
            const target = other.target;
            const overlap = Math.max(0, Math.min(child.right, target.right) - Math.max(child.x, target.x)) * Math.max(0, Math.min(child.bottom, target.bottom) - Math.max(child.y, target.y));
            expect(overlap, `${label} must not overlap ${other.id} target`).toBe(0);
          }
        }
      }
      expect(result.overflow).toBe(false);
      await testInfo.attach("thumbnail-containment", { body: JSON.stringify(result), contentType: "application/json" });
    });
  }
}

for (const width of [480, 1440]) {
  for (const count of [6, 10]) {
    test(`UX2.0VIS-05A-FIX1 ${count} players at ${width}px inspect both column extremes and preserve public data`, async ({ page }) => {
      await loadFixture(page, { state: "rest", count, width, height: 900 });
      const before = await sideColumnGeometry(page);
      const extremes = ["left", "right"].flatMap((side) => {
        const seats = before.seats.filter((seat) => seat.side === side).sort((a, b) => a.row - b.row);
        return [seats[0].id, seats.at(-1).id];
      });
      for (const id of new Set([...extremes, "p3"])) {
        const number = id.slice(1);
        await page.locator(`[data-player-anchor="${id}"] .opponent-hero-target`).click();
        await expect(page.getByRole("dialog", { name: `Player ${number} opponent inspection` })).toBeVisible();
        if (id === "p2") await expect(page.locator('.opponent-inspection-zone[aria-label="Equipment"] .opponent-inspection-card')).toHaveCount(1);
        if (id === "p3") await expect(page.locator('.opponent-inspection-zone[aria-label="Judgement Zone"] .opponent-inspection-card[aria-label="Explain Lightning"]')).toHaveCount(1);
        await page.getByRole("button", { name: `Close Player ${number} inspection` }).click();
        await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
        expect((await sideColumnGeometry(page)).seats).toEqual(before.seats);
      }
      await expect(page.locator('.player-board .opponent-equipment-zone .mini-zone-card').first()).toBeHidden();
      await expect(page.locator('.player-board .opponent-judgement-zone .mini-zone-card').first()).toBeHidden();
    });
  }
}

for (const width of [480, 650, 1440]) {
  for (const count of [5, 6, 7, 8, 9, 10]) {
    test(`UX2.0VIS-05A ${count} players at ${width}x900 have explicit side columns and a seat-free corridor`, async ({ page }, testInfo) => {
      await loadFixture(page, { state: "rest", count, width, height: 900 });
      const result = await sideColumnGeometry(page);
      expect(result.seats).toHaveLength(count - 1);
      expect(result.seats.map(({ relativeIndex, id, side, row }) => ({ relativeIndex, id, side, row }))).toEqual(
        SIDE_COLUMN_MAPPING[count].map(([side, row], index) => ({ relativeIndex: index + 1, id: `p${index + 2}`, side, row }))
      );
      const left30 = result.board.x + result.board.width * .30;
      const right70 = result.board.x + result.board.width * .70;
      for (const side of ["left", "right"]) {
        const seats = result.seats.filter((seat) => seat.side === side).sort((a, b) => a.row - b.row);
        expect(Math.max(...seats.map(({ x }) => x)) - Math.min(...seats.map(({ x }) => x))).toBeLessThanOrEqual(4);
        for (let index = 1; index < seats.length; index += 1) expect(seats[index - 1].bottom).toBeLessThanOrEqual(seats[index].y);
        for (const seat of seats) {
          expect(seat.gridColumn).toBe(side === "left" ? "1" : "3");
          if (side === "left") expect(seat.right).toBeLessThanOrEqual(left30 + 4);
          else expect(seat.x).toBeGreaterThanOrEqual(right70 - 4);
        }
      }
      for (const seat of result.seats) {
        expect(seat.x).toBeGreaterThanOrEqual(result.board.x - 4);
        expect(seat.y).toBeGreaterThanOrEqual(result.board.y - 4);
        expect(seat.right).toBeLessThanOrEqual(result.board.right + 4);
        expect(seat.bottom).toBeLessThanOrEqual(result.board.bottom + 4);
        expect(seat.bottom).toBeLessThanOrEqual(result.dock.y - 6);
      }
      for (let a = 0; a < result.seats.length; a += 1) for (let b = a + 1; b < result.seats.length; b += 1) {
        const first = result.seats[a]; const second = result.seats[b];
        expect(Math.max(0, Math.min(first.right, second.right) - Math.max(first.x, second.x)) * Math.max(0, Math.min(first.bottom, second.bottom) - Math.max(first.y, second.y))).toBe(0);
      }
      expect(result.overflow).toBe(false);
      await testInfo.attach("side-column-geometry", { body: JSON.stringify({ count, width, left30, right70, ...result }), contentType: "application/json" });
    });
  }
}

for (const [count, left, right] of [
  [5, ["p5", "p4"], ["p3", "p2"]],
  [7, ["p7", "p6", "p5"], ["p4", "p3", "p2"]],
  [10, ["p10", "p9", "p8", "p7"], ["p6", "p5", "p4", "p3", "p2"]],
]) {
  test(`UX2.0VIS-05A published ${count}-player example matches clockwise topology`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count, width: 480, height: 900 });
    const { seats } = await sideColumnGeometry(page);
    const order = (side) => seats.filter((seat) => seat.side === side).sort((a, b) => a.y - b.y).map(({ id }) => id);
    expect(order("left")).toEqual(left);
    expect(order("right")).toEqual(right);
    if (count === 10) expect(seats.filter(({ side, row }) => side === "left" && row === 5)).toEqual([]);
  });
}

for (const { width, height } of [
  { width: 320, height: 640 },
  { width: 360, height: 640 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 650, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`UX2.0VIS-12A keeps both Zhen Ji skill names readable and hit-sized at ${width}px`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count: 4, width, height, hero: "zhen-ji" });
    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const skills = dock.locator(".local-status-panel .local-hero-skills");
    const buttons = skills.locator(".hero-skill-button");
    await expect(buttons).toHaveText(["Empress Dowager", "Godess of Luo River"]);

    const geometry = await dock.evaluate((element) => {
      const rect = (node) => {
        const { left, right, top, bottom, width: boxWidth, height: boxHeight } = node.getBoundingClientRect();
        return { left, right, top, bottom, width: boxWidth, height: boxHeight };
      };
      const skillPanel = element.querySelector(".local-status-panel");
      const equipmentPanel = element.querySelector(".local-equipment-panel");
      const controls = [...element.querySelectorAll(".local-hero-skills .hero-skill-button")];
      return {
        skills: rect(skillPanel),
        equipment: rect(equipmentPanel),
        buttons: controls.map((button) => {
          const label = button.firstChild;
          const words = [...label.textContent.matchAll(/\S+/g)].map((match) => {
            const range = document.createRange();
            range.setStart(label, match.index);
            range.setEnd(label, match.index + match[0].length);
            return range.getClientRects().length;
          });
          const bounds = button.getBoundingClientRect();
          return {
            ...rect(button),
            clientWidth: button.clientWidth,
            scrollWidth: button.scrollWidth,
            clientHeight: button.clientHeight,
            scrollHeight: button.scrollHeight,
            wordLineCounts: words,
            hitTarget: document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)?.closest(".hero-skill-button") === button,
          };
        }),
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });

    expect(geometry.skills.right).toBeLessThanOrEqual(geometry.equipment.left + 1);
    expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);
    for (const button of geometry.buttons) {
      expect(button.top).toBeGreaterThanOrEqual(geometry.skills.top - 1);
      expect(button.bottom).toBeLessThanOrEqual(geometry.skills.bottom + 1);
      expect(button.width).toBeGreaterThanOrEqual(44);
      expect(button.height).toBeGreaterThanOrEqual(44);
      expect(button.height).toBeLessThanOrEqual(56);
      expect(button.scrollWidth).toBeLessThanOrEqual(button.clientWidth + 1);
      expect(button.scrollHeight).toBeLessThanOrEqual(button.clientHeight + 1);
      expect(button.wordLineCounts.every((lineCount) => lineCount === 1), JSON.stringify({ width, button })).toBe(true);
      expect(button.hitTarget).toBe(true);
    }
  });
}

for (const width of [480, 1440]) {
  test(`UX2.0VIS-05A ${width}px Inspect preserves side and row`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count: 6, width, height: 900 });
    const before = await sideColumnGeometry(page);
    await page.locator('[data-player-anchor="p4"] .opponent-hero-target').click();
    await expect(page.getByRole("dialog", { name: "Player 4 opponent inspection" })).toBeVisible();
    await page.getByRole("button", { name: "Close Player 4 inspection" }).click();
    expect((await sideColumnGeometry(page)).seats).toEqual(before.seats);
  });
  for (const count of [2, 3, 4]) {
    test(`UX2.0VIS-05A ${count} players at ${width}px retain Top Row and action slots`, async ({ page }) => {
      await loadFixture(page, { state: "rest", count, width, height: 900 });
      const board = page.locator('.player-board[data-seat-topology="top-row"]');
      await expect(board).toHaveCount(1);
      await expect(board.locator("[data-side-column], [data-side-row]")).toHaveCount(0);
      const result = await interactionGeometry(page);
      const top = (await board.boundingBox()).y;
      for (const seat of result.opponents) expect(seat.top - top).toBeGreaterThanOrEqual(0);
      for (const seat of result.opponents) expect(seat.top - top).toBeLessThanOrEqual(4);
      const clearance = result.safeZone.top - Math.max(...result.opponents.map(({ bottom }) => bottom));
      expect(clearance).toBeGreaterThanOrEqual(6);
      expect(clearance).toBeLessThanOrEqual(24);
      for (const slot of ["cancel", "primary", "decline"]) await expect(page.locator(`[data-action-slot="${slot}"]`)).toHaveCount(1);
    });
  }
}

for (const { width, height, counts } of MATRIX) {
  for (const count of counts) {
    test(`UI-19 ${width}x${height} keeps ${count}-player anchors and controls usable`, async ({ page }) => {
      await loadFixture(page, { state: count === 2 ? "rest" : "normal", count, width, height });
      const result = await geometry(page);
      expect(result.anchorCount, "one local dock plus N-1 opponent anchors").toBe(count);
      expect(result.scrollWidth, "no horizontal overflow").toBeLessThanOrEqual(result.viewportWidth);
      expect(result.severeAnchorOverlaps, "no severe seat overlap").toEqual([]);
      expect(result.controls.length, "local dock, hand, and console remain visible").toBe(3);
      if (count >= 5) await expect(page.locator('.player-board[data-seat-topology="side-column"]')).toHaveCount(1);
      else await expect(page.locator('.player-board[data-seat-topology="top-row"]')).toHaveCount(1);
    });
  }
}

for (const { width, height } of TOPOLOGY_MATRIX) {
  for (const { state, label } of INTERACTION_STATES) {
    test(`UX2.0VIS-02-FIX1 ${label} ${width}x${height} stays fully inside the 4-player safe zone`, async ({ page }) => {
      await loadFixture(page, { state, count: 4, width, height });
      await expect(page.locator(".interaction-safe-zone")).toHaveCount(1);
      await expect(page.locator(".interaction-stage")).toBeVisible();
      await assertVisible(page.locator(".local-player-dock"), "local dock");
      await assertVisible(page.locator(".local-hand"), "local hand");
      await assertVisible(page.locator('[data-console-surface="local-operation"]'), "local console");
      if (state === "negation") await expect(page.locator('[data-reaction-chain="proven"]')).toBeVisible();
      if (state === "dying") await expect(page.locator('[data-dying-handoff="proven"]')).toBeVisible();
      const result = await interactionGeometry(page);
      expect(result.safeZone, "safe-zone bounds").not.toBeNull();
      expect(result.stage, "Interaction Stage bounds").not.toBeNull();
      expect(result.playTable, "play-table bounds").not.toBeNull();
      expect(result.localDock, "local dock bounds").not.toBeNull();
      expect(result.opponents).toHaveLength(3);
      expect(Math.max(...result.opponents.map(({ top }) => top)) - Math.min(...result.opponents.map(({ top }) => top)), "VIS-01 opponent anchors remain in one row").toBeLessThanOrEqual(4);
      expect(Math.max(...result.opponents.map(({ bottom }) => bottom)), "opponents clear the Interaction Stage by six pixels").toBeLessThanOrEqual(result.stage.top - 6);
      expect(result.stage.left, "stage stays inside the safe zone").toBeGreaterThanOrEqual(result.safeZone.left - 4);
      expect(result.stage.top, "stage stays inside the safe zone").toBeGreaterThanOrEqual(result.safeZone.top - 4);
      expect(result.stage.right, "stage stays inside the safe zone").toBeLessThanOrEqual(result.safeZone.right + 4);
      expect(result.stage.bottom, "stage stays inside the safe zone").toBeLessThanOrEqual(result.safeZone.bottom + 4);
      expect(result.stage.bottom, "stage remains above the play-table bottom").toBeLessThanOrEqual(result.playTable.bottom - 1);
      expect(result.stageDockOverlap, "Interaction Stage does not overlap the local dock").toBe(0);
      expect(result.safeZoneDockOverlap, "safe zone does not overlap the local dock").toBe(0);
      expect(result.safeZoneOverflow, "safe zone does not clip or scroll content").toEqual({ x: "visible", y: "visible" });
      expect(result.stageOverflow, "Interaction Stage does not clip or scroll content").toEqual({ x: "visible", y: "visible" });
      expect(result.scrollWidth, "safe zone does not introduce horizontal overflow").toBeLessThanOrEqual(result.viewportWidth);
      if (width === 1440) {
        expect(result.stageBody, "desktop stage body geometry").not.toBeNull();
        expect(result.stageBody.display, "desktop stage body uses the horizontal grid composition").toBe("grid");
        expect(result.stageBody.gridTemplateColumns.trim().split(/\s+/).length, "desktop stage body resolves to multiple columns").toBeGreaterThanOrEqual(2);
        const expectedRegionCount = state === "dying" ? 2 : 3;
        expect(result.stageRegions, "all applicable stable regions remain mounted").toHaveLength(expectedRegionCount);
        expect(result.stageRegions.every((region) => region.insideStage), "all mounted stable regions remain inside the Interaction Stage DOM").toBe(true);
        expect(
          result.stageRegions.some((region) => region.className === "interaction-stage-meta-region"),
          "Dying omits the empty duplicate metadata region while other states retain it",
        ).toBe(state !== "dying");
        const visibleRegions = result.stageRegions.filter((region) => region.visible && region.hasContent);
        for (const region of visibleRegions) {
          expect(region.bounds.left, `${region.className} stays inside the stage`).toBeGreaterThanOrEqual(result.stage.left - 4);
          expect(region.bounds.top, `${region.className} stays inside the stage`).toBeGreaterThanOrEqual(result.stage.top - 4);
          expect(region.bounds.right, `${region.className} stays inside the stage`).toBeLessThanOrEqual(result.stage.right + 4);
          expect(region.bounds.bottom, `${region.className} stays inside the stage`).toBeLessThanOrEqual(result.stage.bottom + 4);
        }
        for (let index = 0; index < visibleRegions.length; index += 1) {
          for (let other = index + 1; other < visibleRegions.length; other += 1) {
            const left = visibleRegions[index].bounds;
            const right = visibleRegions[other].bounds;
            const overlapWidth = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
            const overlapHeight = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
            expect(overlapWidth * overlapHeight, `${visibleRegions[index].className} does not overlap ${visibleRegions[other].className}`).toBe(0);
          }
        }
      }
      if (state === "negation") {
        expect(result.reactionChain, "Reaction Chain bounds").not.toBeNull();
        expect(result.reactionChain.bottom, "Reaction Chain remains inside the visible stage").toBeLessThanOrEqual(result.stage.bottom + 4);
      }
      if (state === "dying") {
        expect(result.dyingHandoff, "Dying handoff bounds").not.toBeNull();
        expect(result.dyingHandoff.bottom, "Dying handoff remains inside the visible stage").toBeLessThanOrEqual(result.stage.bottom + 4);
      }
    });
  }
}

for (const { width, height, minimumPortrait } of HERO_FOCUS_VIEWPORTS) {
  for (const { state, label, projectedPlayerId } of INTERACTION_STATES) {
    test(`UX2.0VIS-03B ${label} ${width}x${height} enlarges only the proven primary Hero Focus`, async ({ page }) => {
      await loadFixture(page, { state, count: 4, width, height });
      const heroFocus = page.locator('[data-hero-focus="true"]');
      await expect(heroFocus, "exactly one semantic Hero Focus is rendered").toHaveCount(1);
      await expect(heroFocus).toBeVisible();
      await expect(heroFocus, "the viewer projection keeps the expected proven external identity").toHaveAttribute("data-hero-focus-player-id", projectedPlayerId);
      await assertVisible(page.locator(".local-player-dock"), "local dock");

      const result = await page.evaluate(() => {
        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
        };
        const overlap = (left, right) => Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left)) * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
        const focus = document.querySelector('[data-hero-focus="true"]');
        const portrait = document.querySelector(".hero-focus-portrait");
        const heroRegion = document.querySelector(".interaction-stage-hero-region");
        const eventRegion = document.querySelector(".interaction-stage-event-region");
        const metaRegion = document.querySelector(".interaction-stage-meta-region");
        const stage = document.querySelector(".interaction-stage");
        const safeZone = document.querySelector(".interaction-safe-zone");
        const localDock = document.querySelector(".local-player-dock");
        const focusRect = focus ? rect(focus) : null;
        const portraitRect = portrait ? rect(portrait) : null;
        const heroRect = heroRegion ? rect(heroRegion) : null;
        const eventRect = eventRegion ? rect(eventRegion) : null;
        const metaRect = metaRegion ? rect(metaRegion) : null;
        const stageRect = stage ? rect(stage) : null;
        const safeZoneRect = safeZone ? rect(safeZone) : null;
        const dockRect = localDock ? rect(localDock) : null;
        return {
          heroFocusCount: document.querySelectorAll('[data-hero-focus="true"]').length,
          focus: focusRect,
          portrait: portraitRect,
          heroRegion: heroRect,
          eventRegion: eventRect,
          eventRegionVisible: Boolean(eventRegion && eventRect && eventRect.width > 0 && eventRect.height > 0 && getComputedStyle(eventRegion).display !== "none"),
          metaRegion: metaRect,
          stage: stageRect,
          safeZone: safeZoneRect,
          heroEventOverlap: heroRect && eventRect ? overlap(heroRect, eventRect) : null,
          heroMetaOverlap: heroRect && metaRect ? overlap(heroRect, metaRect) : null,
          stageDockOverlap: stageRect && dockRect ? overlap(stageRect, dockRect) : null,
          focusDockOverlap: focusRect && dockRect ? overlap(focusRect, dockRect) : null,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });

      expect(result.heroFocusCount, "negative regression: no duplicate Hero Focus is rendered").toBe(1);
      expect(result.portrait, "Hero Focus portrait geometry").not.toBeNull();
      expect(result.portrait.width, "portrait meets the viewport width minimum").toBeGreaterThanOrEqual(minimumPortrait.width);
      expect(result.portrait.height, "portrait meets the viewport height minimum").toBeGreaterThanOrEqual(minimumPortrait.height);
      expect(result.portrait.width / result.portrait.height, "portrait preserves the established 4:5 aspect ratio").toBeCloseTo(0.8, 1);
      expect(result.heroRegion, "Hero region geometry").not.toBeNull();
      expect(result.stage, "Interaction Stage geometry").not.toBeNull();
      expect(result.safeZone, "safe-zone geometry").not.toBeNull();
      expect(result.portrait.left, "portrait stays inside the Hero region").toBeGreaterThanOrEqual(result.heroRegion.left - 1);
      expect(result.portrait.top, "portrait stays inside the Hero region").toBeGreaterThanOrEqual(result.heroRegion.top - 1);
      expect(result.portrait.right, "portrait stays inside the Hero region").toBeLessThanOrEqual(result.heroRegion.right + 1);
      expect(result.portrait.bottom, "portrait stays inside the Hero region").toBeLessThanOrEqual(result.heroRegion.bottom + 1);
      expect(result.heroRegion.left, "Hero region stays inside the Stage").toBeGreaterThanOrEqual(result.stage.left - 1);
      expect(result.heroRegion.top, "Hero region stays inside the Stage").toBeGreaterThanOrEqual(result.stage.top - 1);
      expect(result.heroRegion.right, "Hero region stays inside the Stage").toBeLessThanOrEqual(result.stage.right + 1);
      expect(result.heroRegion.bottom, "Hero region stays inside the Stage").toBeLessThanOrEqual(result.stage.bottom + 1);
      expect(result.stage.left, "Stage stays inside the safe zone").toBeGreaterThanOrEqual(result.safeZone.left - 4);
      expect(result.stage.top, "Stage stays inside the safe zone").toBeGreaterThanOrEqual(result.safeZone.top - 4);
      expect(result.stage.right, "Stage stays inside the safe zone").toBeLessThanOrEqual(result.safeZone.right + 4);
      expect(result.stage.bottom, "Stage stays inside the safe zone").toBeLessThanOrEqual(result.safeZone.bottom + 4);
      expect(result.stageDockOverlap, "Stage remains unobstructed by the LocalPlayerDock").toBe(0);
      expect(result.focusDockOverlap, "Hero Focus remains unobstructed by the LocalPlayerDock").toBe(0);
      expect(result.scrollWidth, "enlarged Hero Focus introduces no page overflow").toBeLessThanOrEqual(result.viewportWidth);
      if (state === "dying") {
        expect(result.metaRegion, "empty duplicate Dying metadata is omitted").toBeNull();
      } else {
        expect(result.metaRegion, "non-Dying metadata remains available").not.toBeNull();
      }
      if (width > 650) {
        if (result.eventRegionVisible) expect(result.heroEventOverlap, "Hero and visible Event regions do not overlap").toBe(0);
        if (result.metaRegion) expect(result.heroMetaOverlap, "Hero and Meta regions do not overlap").toBe(0);
      }
    });
  }
}

for (const { width, height } of HERO_FOCUS_VIEWPORTS) {
  for (const { state, label, viewerId, publicPrimaryPlayerId, projectedPlayerId } of INTERACTION_STATES) {
    test(`UX2.0VIS-03D ${label} ${width}x${height} keeps the viewer hero only in LocalPlayerDock`, async ({ page }) => {
      await loadFixture(page, { state, count: 4, width, height });
      const heroFocus = page.locator('[data-hero-focus="true"]');
      await expect(heroFocus, "exactly one central Hero Focus remains").toHaveCount(1);
      await expect(heroFocus).toBeVisible();
      await expect(heroFocus).toHaveAttribute("data-hero-focus-player-id", projectedPlayerId);
      await expect(page.locator(`[data-hero-focus-player-id="${viewerId}"]`), `viewer ${viewerId} is not duplicated centrally`).toHaveCount(0);
      await expect(page.locator(`.local-player-dock[data-player-anchor="${viewerId}"]`), `viewer ${viewerId} remains in LocalPlayerDock`).toBeVisible();
      if (publicPrimaryPlayerId === viewerId) expect(projectedPlayerId, "local public primary is replaced by an external proven counterpart").not.toBe(viewerId);
      if (state === "dying") {
        await expect(page.locator('[data-dying-handoff="proven"]')).toHaveAttribute("data-dying-player-id", "p2");
        await expect(page.locator('[data-dying-handoff="proven"]')).toHaveAttribute("data-dying-decision-actor-id", "p3");
      }

      const result = await interactionGeometry(page);
      expect(result.stage, "Interaction Stage bounds").not.toBeNull();
      expect(result.safeZone, "safe-zone bounds").not.toBeNull();
      expect(result.stage.left, "Stage stays inside the safe zone").toBeGreaterThanOrEqual(result.safeZone.left - 4);
      expect(result.stage.top, "Stage stays inside the safe zone").toBeGreaterThanOrEqual(result.safeZone.top - 4);
      expect(result.stage.right, "Stage stays inside the safe zone").toBeLessThanOrEqual(result.safeZone.right + 4);
      expect(result.stage.bottom, "Stage stays inside the safe zone").toBeLessThanOrEqual(result.safeZone.bottom + 4);
      expect(result.stageDockOverlap, "viewer projection does not overlap LocalPlayerDock").toBe(0);
      expect(result.safeZoneDockOverlap, "safe zone remains clear of LocalPlayerDock").toBe(0);
      expect(result.scrollWidth, "viewer projection introduces no horizontal overflow").toBeLessThanOrEqual(result.viewportWidth);
    });
  }
}

for (const { width, height, minimumPortrait } of HERO_FOCUS_VIEWPORTS) {
  for (const { state, label } of INTERACTION_STATES) {
    test(`UX2.0VIS-03C ${label} ${width}x${height} keeps an open top-row Stage shell`, async ({ page }) => {
      await loadFixture(page, { state, count: 4, width, height });
      const stage = page.locator(".interaction-stage");
      await expect(stage, "exactly one semantic Interaction Stage remains mounted").toHaveCount(1);
      await expect(stage).toBeVisible();
      await expect(stage.locator(":scope > header"), "the existing Stage header remains visible").toBeVisible();
      await expect(page.locator(".interaction-stage-hero-region"), "Hero region hook remains mounted once").toHaveCount(1);
      await expect(page.locator(".interaction-stage-event-region"), "Event region hook remains mounted once").toHaveCount(1);
      await expect(
        page.locator(".interaction-stage-meta-region"),
        state === "dying" ? "empty duplicate Dying metadata is omitted" : "non-Dying Meta region remains mounted once",
      ).toHaveCount(state === "dying" ? 0 : 1);
      await assertVisible(page.locator(".local-player-dock"), "local dock");
      if (state === "negation") await expect(page.locator('[data-reaction-chain="proven"]')).toBeVisible();
      if (state === "dying") await expect(page.locator('[data-dying-handoff="proven"]')).toBeVisible();

      const result = await page.evaluate(() => {
        const rect = (element) => {
          const value = element.getBoundingClientRect();
          return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
        };
        const overlap = (left, right) => Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left)) * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
        const stage = document.querySelector(".interaction-stage");
        const header = stage?.querySelector(":scope > header") ?? null;
        const portrait = document.querySelector(".hero-focus-portrait");
        const safeZone = document.querySelector(".interaction-safe-zone");
        const localDock = document.querySelector(".local-player-dock");
        const innerPanel = document.querySelector('[data-reaction-chain="proven"], [data-dying-handoff="proven"]');
        const stageRect = stage ? rect(stage) : null;
        const headerRect = header ? rect(header) : null;
        const portraitRect = portrait ? rect(portrait) : null;
        const safeZoneRect = safeZone ? rect(safeZone) : null;
        const dockRect = localDock ? rect(localDock) : null;
        const stageStyle = stage ? getComputedStyle(stage) : null;
        const headerStyle = header ? getComputedStyle(header) : null;
        const innerPanelStyle = innerPanel ? getComputedStyle(innerPanel) : null;
        return {
          stage: stageRect,
          header: headerRect,
          portrait: portraitRect,
          safeZone: safeZoneRect,
          stageStyle: stageStyle ? {
            backgroundColor: stageStyle.backgroundColor,
            borderWidths: [stageStyle.borderTopWidth, stageStyle.borderRightWidth, stageStyle.borderBottomWidth, stageStyle.borderLeftWidth],
            boxShadow: stageStyle.boxShadow,
            paddingWidths: [stageStyle.paddingTop, stageStyle.paddingRight, stageStyle.paddingBottom, stageStyle.paddingLeft],
            pointerEvents: stageStyle.pointerEvents,
          } : null,
          headerStyle: headerStyle ? { borderBottomWidth: headerStyle.borderBottomWidth, display: headerStyle.display } : null,
          innerPanelBackground: innerPanelStyle?.backgroundColor ?? null,
          stageDockOverlap: stageRect && dockRect ? overlap(stageRect, dockRect) : null,
          safeZoneDockOverlap: safeZoneRect && dockRect ? overlap(safeZoneRect, dockRect) : null,
          scrollWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        };
      });

      expect(result.stageStyle, "computed Stage shell style").not.toBeNull();
      expect(result.stageStyle.backgroundColor, "outer Stage background is transparent").toBe("rgba(0, 0, 0, 0)");
      expect(result.stageStyle.borderWidths, "outer Stage border is removed").toEqual(["0px", "0px", "0px", "0px"]);
      expect(result.stageStyle.boxShadow, "outer Stage shadow is removed").toBe("none");
      expect(result.stageStyle.paddingWidths, "old dashboard shell padding is removed").toEqual(["0px", "0px", "0px", "0px"]);
      expect(result.stageStyle.pointerEvents, "open shell remains non-interactive").toBe("none");
      expect(result.headerStyle, "computed Stage header style").not.toBeNull();
      expect(result.headerStyle.borderBottomWidth, "full-width header divider is removed").toBe("0px");
      expect(result.headerStyle.display, "header uses a fitted inline label treatment").toBe("inline-flex");
      expect(result.header.width, "header does not reserve a full-width blank row").toBeLessThan(result.stage.width);
      expect(result.portrait.width, "VIS-03B portrait width remains at or above its minimum").toBeGreaterThanOrEqual(minimumPortrait.width);
      expect(result.portrait.height, "VIS-03B portrait height remains at or above its minimum").toBeGreaterThanOrEqual(minimumPortrait.height);
      expect(result.stage.left, "Stage stays inside the safe zone").toBeGreaterThanOrEqual(result.safeZone.left - 4);
      expect(result.stage.top, "Stage stays inside the safe zone").toBeGreaterThanOrEqual(result.safeZone.top - 4);
      expect(result.stage.right, "Stage stays inside the safe zone").toBeLessThanOrEqual(result.safeZone.right + 4);
      expect(result.stage.bottom, "Stage stays inside the safe zone").toBeLessThanOrEqual(result.safeZone.bottom + 4);
      expect(result.stageDockOverlap, "open Stage does not overlap LocalPlayerDock").toBe(0);
      expect(result.safeZoneDockOverlap, "safe zone does not overlap LocalPlayerDock").toBe(0);
      expect(result.scrollWidth, "open shell introduces no horizontal page overflow").toBeLessThanOrEqual(result.viewportWidth);
      if (state === "negation" || state === "dying") {
        expect(result.innerPanelBackground, "Event panel keeps its own non-transparent chrome").not.toBe("rgba(0, 0, 0, 0)");
        expect(result.innerPanelBackground, "Event panel keeps its own background").not.toBe("transparent");
      }
    });
  }
}

for (const { width, height } of HERO_FOCUS_VIEWPORTS) {
  test(`UX2.0VIS-03E ${width}x${height} shows an external source beside the active-target Hero Focus`, async ({ page }) => {
    await loadFixture(page, { state: "group-observer", count: 4, width, height });
    const source = page.locator('[data-medium-participant="source"]');
    const arrow = page.locator('[data-medium-source-arrow="true"]');
    const focus = page.locator('[data-hero-focus="true"]');
    await expect(source).toHaveCount(1);
    await expect(source).toBeVisible();
    await expect(source).toHaveAttribute("data-medium-participant-player-id", "p4");
    await expect(source.locator(".medium-participant-role")).toHaveText("SOURCE");
    await expect(arrow).toBeVisible();
    await expect(focus, "exactly one Large Hero Focus remains").toHaveCount(1);
    await expect(focus).toHaveAttribute("data-hero-focus-player-id", "p1");
    await expect(page.locator('[data-hero-focus-player-id="p3"]')).toHaveCount(0);
    await expect(page.locator('.local-player-dock[data-player-anchor="p3"]')).toBeVisible();
    const sourceSeat = page.locator('.player-board [data-player-anchor="p4"]');
    await expect(sourceSeat).toBeVisible();
    await expect(sourceSeat).toHaveClass(/player-square-1/);

    const result = await page.evaluate(() => {
      const rect = (element) => {
        const value = element.getBoundingClientRect();
        return { left: value.left, top: value.top, right: value.right, bottom: value.bottom, width: value.width, height: value.height };
      };
      const overlap = (left, right) => Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left)) * Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
      const card = document.querySelector('[data-medium-participant="source"]');
      const arrow = document.querySelector('[data-medium-source-arrow="true"]');
      const focus = document.querySelector('[data-hero-focus="true"]');
      const region = document.querySelector('.interaction-stage-hero-region');
      const sourcePortrait = card?.querySelector('.medium-participant-portrait');
      const focusPortrait = focus?.querySelector('.hero-focus-portrait');
      const sourceSeat = document.querySelector('.player-board [data-player-anchor="p4"]');
      const stage = document.querySelector('.interaction-stage');
      const safeZone = document.querySelector('.interaction-safe-zone');
      const dock = document.querySelector('.local-player-dock');
      const cardRect = card && rect(card);
      const arrowRect = arrow && rect(arrow);
      const focusRect = focus && rect(focus);
      const regionRect = region && rect(region);
      const stageRect = stage && rect(stage);
      const safeZoneRect = safeZone && rect(safeZone);
      const dockRect = dock && rect(dock);
      return {
        card: cardRect,
        arrow: arrowRect,
        focus: focusRect,
        region: regionRect,
        sourcePortrait: sourcePortrait && rect(sourcePortrait),
        focusPortrait: focusPortrait && rect(focusPortrait),
        sourceSeat: sourceSeat && rect(sourceSeat),
        sourceIsInPlayerBoard: Boolean(sourceSeat?.closest('.player-board')?.contains(card)),
        stage: stageRect,
        safeZone: safeZoneRect,
        stageDockOverlap: stageRect && dockRect ? overlap(stageRect, dockRect) : null,
        safeZoneDockOverlap: safeZoneRect && dockRect ? overlap(safeZoneRect, dockRect) : null,
        scrollWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
      };
    });
    const expectedSourcePortrait = width > 650 ? { width: 56, height: 70 } : width > 480 ? { width: 48, height: 60 } : { width: 42, height: 53 };
    expect(result.card, "medium source card bounds").not.toBeNull();
    expect(result.arrow, "source-to-target arrow bounds").not.toBeNull();
    expect(result.focus, "large active-target focus bounds").not.toBeNull();
    expect(result.sourceIsInPlayerBoard, "central source copy stays independent of the fixed seat anchor").toBe(false);
    expect(result.card.right, "source precedes the arrow").toBeLessThanOrEqual(result.arrow.left + 1);
    expect(result.arrow.right, "arrow precedes the active target").toBeLessThanOrEqual(result.focus.left + 1);
    for (const item of [result.card, result.arrow, result.focus]) {
      expect(item.left, "source-target composition stays inside the hero region").toBeGreaterThanOrEqual(result.region.left - 1);
      expect(item.right, "source-target composition stays inside the hero region").toBeLessThanOrEqual(result.region.right + 1);
    }
    expect(result.sourcePortrait.width, "medium portrait width follows the responsive spec").toBe(expectedSourcePortrait.width);
    expect(result.sourcePortrait.height, "medium portrait height follows the responsive spec").toBe(expectedSourcePortrait.height);
    expect(result.sourcePortrait.width, "source portrait remains smaller than Hero Focus").toBeLessThan(result.focusPortrait.width);
    expect(result.sourcePortrait.height, "source portrait remains shorter than Hero Focus").toBeLessThan(result.focusPortrait.height);
    expect(result.stage.left, "stage stays inside the safe zone").toBeGreaterThanOrEqual(result.safeZone.left - 4);
    expect(result.stage.top, "stage stays inside the safe zone").toBeGreaterThanOrEqual(result.safeZone.top - 4);
    expect(result.stage.right, "stage stays inside the safe zone").toBeLessThanOrEqual(result.safeZone.right + 4);
    expect(result.stage.bottom, "stage stays inside the safe zone").toBeLessThanOrEqual(result.safeZone.bottom + 4);
    expect(result.stageDockOverlap, "stage remains unobstructed by the local dock").toBe(0);
    expect(result.safeZoneDockOverlap, "safe zone remains unobstructed by the local dock").toBe(0);
    expect(result.scrollWidth, "medium source introduces no horizontal page overflow").toBeLessThanOrEqual(result.viewportWidth);
  });
}

for (const width of [1440, 480]) {
  test(`UX2.0VIS-03E ${width}px hides a viewer-owned self source`, async ({ page }) => {
    await loadFixture(page, { state: "interaction", count: 4, width, height: 900 });
    await expect(page.locator('[data-medium-participant="source"]')).toHaveCount(0);
    await expect(page.locator('[data-medium-source-arrow="true"]')).toHaveCount(0);
    await expect(page.locator('[data-hero-focus="true"]')).toHaveAttribute("data-hero-focus-player-id", "p2");
    await expect(page.locator('[data-hero-focus-player-id="p1"]')).toHaveCount(0);
    await expect(page.locator('.local-player-dock[data-player-anchor="p1"]')).toBeVisible();
  });
}

test("UX2.0VIS-03E keeps NEGATION Reaction Chain without a medium source", async ({ page }) => {
  await loadFixture(page, { state: "negation", count: 4, width: 480, height: 900 });
  await expect(page.locator('[data-medium-participant="source"]')).toHaveCount(0);
  await expect(page.locator('[data-medium-source-arrow="true"]')).toHaveCount(0);
  await expect(page.locator('[data-reaction-chain="proven"]')).toBeVisible();
});

test("UX2.0VIS-02 keeps an empty safe-zone hook in REST", async ({ page }) => {
  await loadFixture(page, { state: "rest", count: 4, width: 480, height: 900 });
  const safeZone = page.locator(".interaction-safe-zone");
  await expect(safeZone).toHaveCount(1);
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
  const emptyGeometry = await safeZone.evaluate((element) => {
    const style = getComputedStyle(element);
    return {
      hasBackground: style.backgroundColor !== "rgba(0, 0, 0, 0)" && style.backgroundColor !== "transparent",
      hasBorder: [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth].some((width) => width !== "0px"),
      text: element.textContent?.trim() ?? "",
    };
  });
  expect(emptyGeometry, "empty safe zone has no visible panel or placeholder").toEqual({ hasBackground: false, hasBorder: false, text: "" });
});

test("UI-19 semantic Interaction Stage and Hero Focus remain viewer-visible", async ({ page }) => {
  await loadFixture(page, { state: "interaction", count: 4, width: 1440, height: 900 });
  await expect(page.locator('[data-stage="ATTACK_RESPONSE"]')).toBeVisible();
  await expect(page.locator('.interaction-stage[data-presentation-transition="INTERACTION_TRANSITION"]')).toBeVisible();
  await expect(page.locator('[data-hero-focus="true"]')).toBeVisible();
  await expect(page.locator('[aria-label="Interaction Stage"]')).toContainText("INTERACTION STAGE");
  await expect(page.locator('[data-interaction-decision-actor="true"]')).toHaveCount(1);
});

test("UI-19 multi-target preview decorates the existing public recipients", async ({ page }) => {
  await loadFixture(page, { state: "group", count: 6, width: 650, height: 900 });
  await page.locator('[data-hand-card-id="browser-raining-arrows"] button.game-card').click();
  await expect(page.locator('[data-group-scope-preview="RainingArrows"]')).toBeVisible();
  await expect(page.locator('[data-local-group-preview="true"]')).toHaveCount(5);
  await expect(page.locator('[data-console-surface="local-operation"]')).toBeVisible();
});

test("UI-19 Duel responder remains bounded at the 650px breakpoint", async ({ page }) => {
  await loadFixture(page, { state: "duel", count: 4, width: 650, height: 900 });
  await expect(page.locator('[data-stage="DUEL_EXCHANGE"]')).toBeVisible();
  await assertVisible(page.locator('[data-console-surface="local-operation"]'), "Duel console");
  await expect(page.locator('[data-console-surface="local-operation"] button')).toHaveCount(2);
  await expect(page.locator('[data-hero-focus-role="CURRENT TARGET"]')).toBeVisible();
});

test("UI-19 Negation reaction chain keeps semantic labels at 480px", async ({ page }) => {
  await loadFixture(page, { state: "negation", count: 4, width: 480, height: 900 });
  await expect(page.locator('[data-stage="NEGATION"]')).toBeVisible();
  await expect(page.locator('[data-reaction-chain="proven"]')).toBeVisible();
  await expect(page.locator('[aria-label="Reaction Chain"]')).toContainText("REACTION CHAIN");
  await expect(page.locator('[data-console-surface="local-operation"]')).toBeVisible();
});

test("UI-19 Dying/Peach handoff remains semantic and operable at 480px", async ({ page }) => {
  await loadFixture(page, { state: "dying", count: 4, width: 480, height: 900 });
  await expect(page.locator('[data-stage="DYING"]')).toBeVisible();
  await expect(page.locator('[data-dying-handoff="proven"]')).toBeVisible();
  await expect(page.locator('[data-hero-focus-role="DYING PLAYER"]')).toBeVisible();
  await expect(page.locator('[data-hand-card-id="browser-peach"] button.game-card')).toBeEnabled();
  await expect(page.locator('[data-console-surface="local-operation"] button')).toHaveCount(2);
});

test("UI-19 retained target-card picker stays bounded and scroll-safe at 480px", async ({ page }) => {
  await loadFixture(page, { state: "picker", count: 4, width: 480, height: 900 });
  const panel = page.locator('[role="dialog"][aria-label="Retaliation target card selection"]');
  await expect(panel).toBeVisible();
  const bounds = await panel.evaluate((element) => {
    const box = element.getBoundingClientRect();
    const row = element.querySelector(".target-card-picker-card-row");
    return {
      withinViewport: box.left >= 0 && box.top >= 0 && box.right <= window.innerWidth && box.bottom <= window.innerHeight,
      rowScrollSafe: Boolean(row && row.scrollWidth >= row.clientWidth && getComputedStyle(row).overflowX === "auto"),
      actionButtonsVisible: [...element.querySelectorAll(".target-card-picker-actions button")].every((button) => {
        const buttonBox = button.getBoundingClientRect();
        return buttonBox.width > 0 && buttonBox.height > 0;
      }),
    };
  });
  expect(bounds, "picker panel stays within the mobile viewport").toEqual({ withinViewport: true, rowScrollSafe: true, actionButtonsVisible: true });
  await expect(page.locator("html")).toHaveJSProperty("scrollWidth", 480);
});

test("UI-19 reduced motion removes nonessential transition animation without hiding meaning", async ({ page }) => {
  await loadFixture(page, { state: "interaction", count: 4, width: 480, height: 900, reducedMotion: true });
  const stage = page.locator('.interaction-stage[data-presentation-transition="INTERACTION_TRANSITION"]');
  await expect(stage).toBeVisible();
  await expect(stage).toHaveCSS("animation-name", "none");
  await expect(page.locator('[data-hero-focus="true"]')).toBeVisible();
  await expect(page.locator('[aria-label="Your hand"]')).toBeVisible();
  await expect(page.locator('[data-console-surface="local-operation"]')).toHaveCSS("pointer-events", "auto");
  await page.locator('[data-console-surface="local-operation"] button:not(:disabled)').first().focus();
  await expect(page.locator(':focus')).toHaveClass(/primary|end|serpent-control/);
});

const VIS_06A_STATES = [
  { state: "confirm-cancel", buttons: { primary: "Confirm", cancel: "Cancel", decline: "" } },
  { state: "confirm-skip", buttons: { primary: "Confirm", cancel: "", decline: "Skip" } },
  { state: "confirm-cancel-skip", buttons: { primary: "Confirm", cancel: "Cancel", decline: "Skip" } },
  { state: "turn-play-end", buttons: { primary: "Play", cancel: "", decline: "End" } },
  { state: "provider-extra", buttons: { primary: "Confirm", cancel: "", decline: "Skip" } },
  { state: "long-guidance", buttons: { primary: "Confirm", cancel: "Cancel", decline: "Skip" } },
];

async function loadConsoleState(page, state, width) {
  await loadFixture(page, { state, count: 4, width, height: 900 });
  if (state === "confirm-cancel") await page.locator('[data-player-anchor="p3"] .opponent-hero-target').click();
  if (state === "confirm-skip") await page.locator('[data-hand-card-id="browser-negation"] .game-card').click();
  if (state === "confirm-cancel-skip" || state === "long-guidance") {
    await page.getByRole("button", { name: "Assault", exact: true }).click();
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  }
  if (state === "provider-extra") {
    await page.locator('[data-action-extras="true"] button').first().click();
    await page.locator('[data-hand-card-id="browser-attack"] .game-card').click();
  }
}

for (const width of [360, 480, 1440]) {
  test(`UX2.0VIS-06A ${width}x900 keeps semantic action slots invariant across local flows`, async ({ page }) => {
    const snapshots = [];
    for (const { state, buttons } of VIS_06A_STATES) {
      await loadConsoleState(page, state, width);
      const dock = page.locator(".local-player-dock");
      const guidance = dock.locator('[data-console-guidance="true"]');
      const controls = dock.locator('[data-console-surface="local-operation"]');
      const extras = controls.locator('[data-action-extras="true"]');
      const slots = controls.locator('[data-action-slots="true"]');
      const slotNames = ["cancel", "primary", "decline"];
      const orderedSlots = slotNames.map((name) => slots.locator(`[data-action-slot="${name}"]`));
      await expect(guidance, `${state} has one guidance row`).toHaveCount(1);
      await expect(extras, `${state} has one extras region`).toHaveCount(1);
      await expect(slots, `${state} has one slot region`).toHaveCount(1);
      await expect(controls.locator(".decision-status"), `${state} does not duplicate guidance`).toHaveCount(0);
      await expect(guidance.locator('.decision-status[role="status"][aria-live="polite"][aria-atomic="true"]')).toHaveCount(1);
      for (const attribute of ["data-console-decision-kind", "data-console-coherent", "data-console-primary", "data-console-primary-enabled", "data-console-local-cancel", "data-console-authoritative-decline"]) await expect(guidance.locator(".decision-status")).toHaveAttribute(attribute, /.+/);
      for (let index = 0; index < orderedSlots.length; index += 1) {
        await expect(orderedSlots[index], `${state} keeps slot ${index}`).toHaveCount(1);
        const action = orderedSlots[index].locator("button");
        if (buttons[slotNames[index]]) await expect(action).toHaveText(buttons[slotNames[index]]);
        else await expect(action).toHaveCount(0);
      }
      const dockBox = await dock.boundingBox();
      const guidanceBox = await guidance.boundingBox();
      const controlBox = await controls.boundingBox();
      const actionGeometry = await controls.evaluate((element) => {
        const rect = (name) => {
          const button = element.querySelector(`[data-action-slot="${name}"] button`);
          if (!button) return null;
          const box = button.getBoundingClientRect();
          return { left: box.left, right: box.right, top: box.top, bottom: box.bottom };
        };
        const bounds = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        const leftInset = bounds.left + Number.parseFloat(style.borderLeftWidth) + Number.parseFloat(style.paddingLeft);
        const rightInset = bounds.right - Number.parseFloat(style.borderRightWidth) - Number.parseFloat(style.paddingRight);
        const slotsElement = element.querySelector('[data-action-slots="true"]');
        const actionButtons = ["cancel", "primary", "decline"].map((name) => slotsElement.querySelector(`[data-action-slot="${name}"] button`)).filter(Boolean);
        const keyboardOrder = actionButtons.every((button, index) => index === actionButtons.length - 1 || Boolean(button.compareDocumentPosition(actionButtons[index + 1]) & Node.DOCUMENT_POSITION_FOLLOWING));
        const primary = rect("primary");
        const cancel = rect("cancel");
        const decline = rect("decline");
        const actionWidth = rightInset - leftInset;
        const primaryCenter = primary ? (primary.left + primary.right) / 2 : null;
        return {
          leftInset,
          rightInset,
          actionWidth,
          primary,
          cancel,
          decline,
          primaryCenterRatio: primaryCenter === null ? null : (primaryCenter - leftInset) / actionWidth,
          declineViewportMargin: decline === null ? null : window.innerWidth - decline.right,
          keyboardOrder,
        };
      });
      if (width <= 700) {
        expect(actionGeometry.primaryCenterRatio, `${state} Primary is in the centre-right phone thumb zone`).toBeGreaterThanOrEqual(0.55);
        expect(actionGeometry.primaryCenterRatio, `${state} Primary stays safely away from the far-right edge`).toBeLessThanOrEqual(0.70);
      }
      if (actionGeometry.cancel) {
        expect(Math.abs(actionGeometry.cancel.left - actionGeometry.leftInset), `${state} contextual Cancel starts at the left safety zone`).toBeLessThanOrEqual(1);
        expect(actionGeometry.primary.left - actionGeometry.cancel.right, `${state} Cancel remains visually separated from Primary`).toBeGreaterThanOrEqual(width <= 700 ? 32 : 4);
      }
      if (actionGeometry.decline) {
        expect(Math.abs(actionGeometry.decline.right - actionGeometry.rightInset), `${state} Decline is anchored in the far-right secondary zone`).toBeLessThanOrEqual(1);
        expect(actionGeometry.decline.left - actionGeometry.primary.right, `${state} has a clear Primary-to-Decline safety gutter`).toBeGreaterThanOrEqual(32);
        expect(actionGeometry.declineViewportMargin, `${state} Decline keeps a visible margin from the phone edge`).toBeGreaterThanOrEqual(8);
      }
      expect(actionGeometry.keyboardOrder, `${state} keyboard traversal matches left-to-right visual order`).toBe(true);
      expect(guidanceBox.width).toBeGreaterThanOrEqual(dockBox.width - 16);
      expect(guidanceBox.y + guidanceBox.height).toBeLessThanOrEqual(controlBox.y);
      const visual = await controls.evaluate((element) => {
        const rects = [...element.querySelectorAll("button")].map((button) => {
          const bounds = button.getBoundingClientRect();
          return { text: button.textContent?.trim() ?? "", left: bounds.left, right: bounds.right, top: bounds.top, bottom: bounds.bottom, width: bounds.width, height: bounds.height };
        });
        const overlaps = [];
        for (let first = 0; first < rects.length; first += 1) for (let second = first + 1; second < rects.length; second += 1) {
          const a = rects[first]; const b = rects[second];
          if (Math.min(a.right, b.right) > Math.max(a.left, b.left) && Math.min(a.bottom, b.bottom) > Math.max(a.top, b.top)) overlaps.push([a.text, b.text]);
        }
        return { rects, overlaps, overflow: document.documentElement.scrollWidth > window.innerWidth };
      });
      expect(visual.overlaps, `${state} buttons do not overlap`).toEqual([]);
      expect(visual.overflow, `${state} has no horizontal page overflow`).toBe(false);
      for (const button of visual.rects) {
        expect(button.width, `${state} ${button.text} touch width`).toBeGreaterThanOrEqual(78);
        expect(button.height, `${state} ${button.text} touch height`).toBeGreaterThanOrEqual(32);
        expect(button.top, `${state} buttons stay below guidance`).toBeGreaterThanOrEqual(guidanceBox.y + guidanceBox.height);
      }
      const extrasLabels = await extras.locator("button").allTextContents();
      expect(extrasLabels.map((label) => label.trim()).filter((label) => /^(Confirm|Cancel|Skip|End)$/.test(label))).toEqual([]);
      if (state === "provider-extra") expect(extrasLabels).toContain("Cancel Alternate Attack");
      if (extrasLabels.length > 0) {
        const extrasBox = await extras.boundingBox();
        expect(extrasBox.y + extrasBox.height).toBeLessThanOrEqual(actionGeometry.primary.top);
      }
      snapshots.push({ state, primary: actionGeometry.primary, decline: actionGeometry.decline });
    }
    const primaryLefts = snapshots.map(({ primary }) => primary.left);
    const primaryWidths = snapshots.map(({ primary }) => primary.right - primary.left);
    const rightEdges = snapshots.filter(({ decline }) => decline).map(({ decline }) => decline.right);
    expect(Math.max(...primaryLefts) - Math.min(...primaryLefts), `Primary X is stable at ${width}px`).toBeLessThanOrEqual(4);
    expect(Math.max(...primaryWidths) - Math.min(...primaryWidths), `Primary width is stable at ${width}px`).toBeLessThanOrEqual(4);
    expect(Math.max(...rightEdges) - Math.min(...rightEdges), `Decline edge is stable at ${width}px`).toBeLessThanOrEqual(4);
  });
}

test("UX2.0VIS-06A 480x900 shows long guidance and leaves raised hand cards clear", async ({ page }) => {
  await loadConsoleState(page, "long-guidance", 480);
  const guidance = page.locator('[data-console-guidance="true"]');
  const status = guidance.locator(".decision-status");
  const instruction = status.locator("strong");
  const metrics = await instruction.evaluate((element) => {
    const style = getComputedStyle(element);
    const bounds = element.getBoundingClientRect();
    return { height: bounds.height, lineHeight: Number.parseFloat(style.lineHeight), overflow: getComputedStyle(element.closest('[data-console-guidance="true"]')).overflowY, scrollHeight: element.closest('[data-console-guidance="true"]').scrollHeight, clientHeight: element.closest('[data-console-guidance="true"]').clientHeight };
  });
  expect(metrics.height / metrics.lineHeight).toBeGreaterThanOrEqual(3);
  expect(metrics.overflow).not.toBe("hidden");
  expect(metrics.scrollHeight).toBeLessThanOrEqual(metrics.clientHeight + 1);
  await expect(status.locator("em")).toBeVisible();
  await expect(status.locator('[data-local-target-selection="true"]')).toBeVisible();
  await loadConsoleState(page, "turn-play-end", 480);
  await page.locator('[data-hand-card-id="browser-attack"] .game-card').click();
  const selectedCard = await page.locator('.card-slot.single-selected .game-card').boundingBox();
  const guidanceBox = await page.locator('[data-console-guidance="true"]').boundingBox();
  expect(selectedCard.y + selectedCard.height).toBeLessThanOrEqual(guidanceBox.y);
});

for (const width of [480, 1440]) {
  test(`UX2.0VIS-06B ${width}x900 owns Daredevil in Hero Skills and preserves Skip`, async ({ page }) => {
    await loadFixture(page, { state: "sun-shangxiang-daredevil", count: 4, width, height: 900 });
    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const skills = dock.locator('.local-status-panel .local-hero-skills');
    await expect(dock.locator('.local-dock-identity .local-hero-card [data-hero-id="sun-shangxiang"]')).toHaveCount(1);
    await expect(skills.locator('button')).toHaveText(["Betrothment", "Daredevil"]);
    await expect(skills.getByRole('button', { name: "Betrothment", exact: true })).toBeDisabled();
    const daredevil = skills.getByRole('button', { name: "Daredevil", exact: true });
    await expect(daredevil).toBeEnabled();
    const actions = dock.locator('[data-console-surface="local-operation"]');
    await expect(actions.getByRole('button', { name: /Daredevil/ })).toHaveCount(0);
    await expect(actions.locator('[data-action-slot="cancel"] button')).toHaveCount(0);
    await expect(actions.locator('[data-action-slot="primary"] button')).toHaveCount(0);
    await expect(actions.locator('[data-action-slot="decline"] button')).toHaveText("Skip");
    const regions = await dock.evaluate((element) => ({
      identity: getComputedStyle(element.querySelector('.local-dock-identity')).gridArea,
      zones: getComputedStyle(element.querySelector('.local-status-panel').parentElement).gridArea,
      overflow: document.documentElement.scrollWidth > window.innerWidth,
    }));
    expect(regions.identity).toBe("identity");
    expect(regions.zones).toBe("zones");
    expect(regions.overflow).toBe(false);
    await daredevil.click();
    // Mounting the response decision also starts its existing timer; assert
    // the exact gameplay submission independently of that lifecycle action.
    expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action !== "start_response_timer"))).toEqual([{ action: "trigger", extra: { providerId: "sun_shangxiang_daredevil" } }]);
    await actions.locator('[data-action-slot="decline"] button').click();
    expect(await page.evaluate(() => window.__browserActions.at(-1))).toEqual({ action: "decline_trigger" });
  });

  test(`UX2.0VIS-06B ${width}x900 keeps inactive Daredevil visible and generic providers in extras`, async ({ page }) => {
    await loadFixture(page, { state: "sun-shangxiang-inactive", count: 4, width, height: 900 });
    const dock = page.locator('.local-player-dock');
    await expect(dock.locator('.local-hero-skills button')).toHaveText(["Betrothment", "Daredevil"]);
    await expect(dock.locator('.local-hero-skills').getByRole('button', { name: "Daredevil", exact: true })).toBeVisible();
    await expect(dock.locator('.local-hero-skills').getByRole('button', { name: "Daredevil", exact: true })).toBeDisabled();
    await expect(dock.locator('[data-console-surface="local-operation"]').getByRole('button', { name: /Daredevil/ })).toHaveCount(0);
    await loadConsoleState(page, "provider-extra", width);
    await expect(page.locator('[data-action-extras="true"]').getByRole('button', { name: "Cancel Alternate Attack", exact: true })).toBeVisible();
    await expect(page.locator('.local-hero-skills').getByRole('button', { name: /Alternate Attack/ })).toHaveCount(0);
  });
}
