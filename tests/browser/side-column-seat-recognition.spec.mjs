import { expect, test } from "@playwright/test";

const VIEWPORTS = [320, 390, 480, 610, 620, 650];
const PLAYER_COUNTS = [6, 10];

async function loadFixture(page, { width, height = 900, count, state = "interaction", playerNamePrefix }) {
  await page.setViewportSize({ width, height });
  const testPlayers = playerNamePrefix ? `&playerNamePrefix=${encodeURIComponent(playerNamePrefix)}` : "";
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}&equipmentCase=matrix${testPlayers}`);
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect.poll(() => page.locator('.player-board[data-seat-topology="side-column"] .opponent-hero-portrait .hero-art-image').evaluateAll(images => images.length > 0 && images.every(image => image.complete && image.naturalWidth > 0))).toBe(true);
}

async function readLayout(page) {
  return page.locator('.player-board[data-seat-topology="side-column"]').evaluate((board) => {
    const bounds = (element) => {
      const { x, y, right, bottom, width, height } = element.getBoundingClientRect();
      return { x, y, right, bottom, width, height };
    };
    const visible = (element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.display !== "none" && style.visibility !== "hidden" && box.width > 0 && box.height > 0;
    };
    const table = board.closest(".play-table");
    const localPlayerId = document.querySelector(".local-player-dock")?.getAttribute("data-player-anchor") ?? null;
    const safeZone = table.querySelector(":scope > .interaction-safe-zone");
    const stage = safeZone.querySelector(":scope > .interaction-stage");
    const systemCluster = safeZone.querySelector(":scope > .stage-system-cluster");
    const guidance = document.querySelector(".local-player-dock .console-guidance");
    const dock = document.querySelector(".local-player-dock");
    return {
      viewportWidth: window.innerWidth,
      localPlayerId,
      pageWidth: document.documentElement.scrollWidth,
      board: bounds(board),
      boardStyle: {
        gridTemplateRows: getComputedStyle(board).gridTemplateRows,
        rowGap: getComputedStyle(board).rowGap,
        alignContent: getComputedStyle(board).alignContent,
        alignItems: getComputedStyle(board).alignItems,
      },
      safeZone: bounds(safeZone),
      systemCluster: bounds(systemCluster),
      guidance: bounds(guidance),
      dock: bounds(dock),
      menu: bounds(document.querySelector(".local-player-dock .console-guidance-row .stage-system-menu-trigger")),
      stage: stage ? [stage, ...stage.querySelectorAll("*")].filter(visible).map(bounds) : [],
      publicCards: [...document.querySelectorAll(".public-card-journey-card")].map((card) => ({
        id: card.getAttribute("data-public-card-journey-card-id"),
        eventId: card.getAttribute("data-public-card-journey-event-id"),
        actorId: card.getAttribute("data-public-card-journey-actor-id"),
        role: card.getAttribute("data-public-card-journey-role"),
        phase: card.getAttribute("data-public-card-journey-phase"),
        rect: bounds(card),
      })),
      announcements: [...document.querySelectorAll("[data-public-card-announcement='true']")].map((element) => bounds(element)),
      timers: [...document.querySelectorAll(".visible-countdown")].map((element) => bounds(element)),
      harvestPools: [...document.querySelectorAll(".harvest-choice-panel")].map((element) => bounds(element)),
      seats: [...board.querySelectorAll(":scope > [data-player-anchor]")].map((seat) => {
        const target = seat.querySelector(".opponent-hero-target");
        const targetBounds = bounds(target);
        const hit = document.elementFromPoint(
          targetBounds.x + targetBounds.width / 2,
          targetBounds.y + targetBounds.height / 2,
        );
        const portrait = seat.querySelector(".opponent-hero-portrait");
        const image = portrait.querySelector(".hero-art-image");
        const art = bounds(portrait);
        const focalPoint = { x: art.x + art.width * 0.45, y: art.y + art.height * 0.42 };
        const focalText = [...seat.querySelectorAll(".opponent-player-name, .opponent-hero-name, .player-hp, .player-hearts")]
          .filter(visible)
          .some((element) => {
            const box = bounds(element);
            return focalPoint.x >= box.x && focalPoint.x <= box.right && focalPoint.y >= box.y && focalPoint.y <= box.bottom;
          });
        const equipment = seat.querySelector(".opponent-equipment-summary");
        const equipmentBox = equipment && visible(equipment) ? bounds(equipment) : null;
        const focalEquipment = Boolean(equipmentBox
          && focalPoint.x >= equipmentBox.x && focalPoint.x <= equipmentBox.right
          && focalPoint.y >= equipmentBox.y && focalPoint.y <= equipmentBox.bottom);
        return {
          id: seat.dataset.playerAnchor,
          relativeIndex: localPlayerId && /^p\d+$/.test(localPlayerId) && /^p\d+$/.test(seat.dataset.playerAnchor)
            ? (Number(seat.dataset.playerAnchor.slice(1)) - Number(localPlayerId.slice(1)) + 5) % 5
            : null,
          side: seat.dataset.sideColumn,
          seat: bounds(seat),
          row: Number(seat.dataset.sideRow),
          target: targetBounds,
          switch: (() => {
            const button = seat.querySelector(".test-view-switch-button");
            if (!button) return null;
            const rect = bounds(button);
            const hit = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
            return { ...rect, hitSafe: Boolean(hit && button.contains(hit)) };
          })(),
          art,
          imageLoaded: Boolean(image?.naturalWidth),
          hitSafe: Boolean(hit && target.contains(hit)),
          focalText,
          focalEquipment,
          equipment: [...seat.querySelectorAll(".opponent-equipment-indicator")].map(bounds),
        };
      }),
    };
  });
}

const FIVE_PLAYER_PHONE_VIEWPORTS = [
  { width: 390, height: 700 },
  { width: 390, height: 844 },
  { width: 440, height: 766 },
  { width: 440, height: 894 },
  { width: 480, height: 900 },
];

function expectFivePlayerRelativeMapping(seats) {
  const expected = new Map([
    [1, { side: "right", row: 2 }],
    [2, { side: "right", row: 1 }],
    [3, { side: "left", row: 2 }],
    [4, { side: "left", row: 1 }],
  ]);
  for (const seat of seats) expect({ side: seat.side, row: seat.row }).toEqual(expected.get(seat.relativeIndex));
}

for (const viewport of FIVE_PLAYER_PHONE_VIEWPORTS) {
  test(`ST5-1 five-player opponent rows are compact at ${viewport.width}x${viewport.height}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
      await loadFixture(page, { ...viewport, count: 5, playerNamePrefix: "Five-seat" });
      const result = await readLayout(page);
      const rowOne = result.seats.filter((seat) => seat.row === 1);
      const rowTwo = result.seats.filter((seat) => seat.row === 2);
      const rowGap = Math.min(...rowTwo.map((seat) => seat.seat.y)) - Math.max(...rowOne.map((seat) => seat.seat.bottom));
      const geometry = { ...result, rowGap };

      await testInfo.attach(`st5-1-after-${viewport.width}x${viewport.height}.json`, {
        body: Buffer.from(JSON.stringify(geometry, null, 2)),
        contentType: "application/json",
      });
      await testInfo.attach(`st5-1-after-${viewport.width}x${viewport.height}.png`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });

      expect(result.seats).toHaveLength(4);
      expect(result.pageWidth, "five-player mobile layout stays within the viewport").toBeLessThanOrEqual(viewport.width);
      expect(rowOne).toHaveLength(2);
      expect(rowTwo).toHaveLength(2);
      expectFivePlayerRelativeMapping(result.seats);
      expect(result.boardStyle.alignContent).toBe("start");
      expect(result.boardStyle.alignItems).toBe("start");
      expect(rowGap).toBeGreaterThanOrEqual(8);
      expect(rowGap).toBeLessThanOrEqual(16);
      expect(Math.abs(Math.min(...rowOne.map((seat) => seat.seat.y)) - result.board.y)).toBeLessThanOrEqual(1);
      for (const seat of result.seats) expect(seat.seat.height).toBe(108);
      for (const seat of result.seats) {
        expect(seat.hitSafe, `${seat.id} Hero/Inspect target remains clickable`).toBe(true);
        expect(seat.switch?.hitSafe, `${seat.id} TEST SWITCH remains clickable`).toBe(true);
      }

      for (const seat of result.seats) {
        const hero = page.locator(`.opponent-player-card[data-player-anchor="${seat.id}"] .opponent-hero-target`);
        await hero.tap();
        await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${seat.id}"]`)).toBeVisible();
        await hero.tap();
        await expect(page.locator(`.opponent-inspection-panel[data-inspect-player-id="${seat.id}"]`)).toHaveCount(0);
        await page.locator(`.test-view-switch-button[data-test-viewer-id="${seat.id}"]`).tap();
      }

      console.log(`ST5-1 ${viewport.width}x${viewport.height}: ${JSON.stringify({ rowGap, board: result.board, boardStyle: result.boardStyle, seats: result.seats.map(({ id, side, row, seat, switch: switchRect }) => ({ id, side, row, seat, switch: switchRect })) })}`);
    } finally {
      await context.close();
    }
  });
}

for (const viewport of [{ width: 390, height: 700 }, { width: 440, height: 766 }]) {
  test(`ST5-1 grouped five-player seats clear public Harvest at ${viewport.width}x${viewport.height}`, async ({ browser }, testInfo) => {
    const context = await browser.newContext({ viewport, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
      await loadFixture(page, { ...viewport, count: 5, state: "bumper-harvest-choosing", playerNamePrefix: "Five-seat" });
      const result = await readLayout(page);
      const rowOne = result.seats.filter((seat) => seat.row === 1);
      const rowTwo = result.seats.filter((seat) => seat.row === 2);
      const rowGap = Math.min(...rowTwo.map((seat) => seat.seat.y)) - Math.max(...rowOne.map((seat) => seat.seat.bottom));
      const geometry = { ...result, rowGap };
      await testInfo.attach(`st5-1-harvest-${viewport.width}x${viewport.height}.json`, {
        body: Buffer.from(JSON.stringify(geometry, null, 2)),
        contentType: "application/json",
      });
      await testInfo.attach(`st5-1-harvest-${viewport.width}x${viewport.height}.png`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
      expect(result.seats).toHaveLength(4);
      expect(result.harvestPools, "the public Harvest pool remains rendered").toHaveLength(1);
      expect(result.pageWidth).toBeLessThanOrEqual(viewport.width);
      expectFivePlayerRelativeMapping(result.seats);
      expect(rowGap).toBeGreaterThanOrEqual(8);
      expect(rowGap).toBeLessThanOrEqual(16);
      expect(Math.min(...rowOne.map((seat) => seat.seat.y))).toBeCloseTo(result.board.y, 0);
      for (const seat of result.seats) {
        expect(seat.seat.height).toBe(108);
        for (const obstacle of [...result.harvestPools, ...result.announcements, ...result.timers, result.dock, result.menu]) {
          expect(overlaps(seat.seat, obstacle), `${seat.id} does not cover a public or local control`).toBe(false);
        }
        expect(seat.switch?.hitSafe, `${seat.id} TEST SWITCH remains hittable during Harvest choice`).toBe(true);
      }
      console.log(`ST5-1 Harvest ${viewport.width}x${viewport.height}: ${JSON.stringify({ rowGap, publicCards: result.publicCards, announcements: result.announcements, timers: result.timers, harvestPools: result.harvestPools, seats: result.seats.map(({ id, side, row, seat }) => ({ id, side, row, seat })) })}`);
    } finally {
      await context.close();
    }
  });
}

for (const width of [390, 480]) {
  test(`ST5-1 five-seat-only grid rule leaves eight-player phone rows unchanged at ${width}px`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const page = await context.newPage();
    try {
      await loadFixture(page, { width, height: 844, count: 8 });
      const result = await readLayout(page);
      expect(result.seats).toHaveLength(7);
      expect(result.pageWidth).toBeLessThanOrEqual(width);
      expect(result.boardStyle.alignContent).toBe("normal");
      expect(result.boardStyle.alignItems).toBe("center");
      expect(result.boardStyle.gridTemplateRows.trim().split(/\s+/)).toHaveLength(4);
      for (const seat of result.seats) {
        expect(seat.seat.height).toBe(108);
        expect(seat.hitSafe).toBe(true);
      }
    } finally {
      await context.close();
    }
  });
}

function overlaps(left, right) {
  return left.x < right.right && left.right > right.x && left.y < right.bottom && left.bottom > right.y;
}

for (const width of VIEWPORTS) {
  for (const count of PLAYER_COUNTS) {
    test(`UX2.3 Side Column ${count}-player Hero thumbnails stay recognisable at ${width}px`, async ({ page }, testInfo) => {
      await loadFixture(page, { width, count });
      const result = await readLayout(page);
      const minimumWidth = width >= 480 ? 74 : 56;
      const minimumHeight = count === 10 && width >= 600 ? 100 : 108;
      expect(result.seats).toHaveLength(count - 1);
      expect(result.pageWidth, "seat sizing does not create horizontal page overflow").toBeLessThanOrEqual(width);
      expect(result.systemCluster.right, "system cluster uses the Stage's lower-right inset").toBeCloseTo(result.safeZone.right - 14, 0);
      const stageBoundaryOffset = width >= 600 ? 5 : 4;
      expect(result.systemCluster.bottom, "system cluster stays anchored at the Stage/Guidance boundary").toBeCloseTo(result.safeZone.bottom + stageBoundaryOffset, 0);
      expect(result.menu.width, "System Menu meets the minimum touch target").toBeGreaterThanOrEqual(44);
      expect(result.menu.height, "System Menu meets the minimum touch target").toBeGreaterThanOrEqual(44);
      expect(Math.abs(result.menu.right - (result.guidance.right - 8)), "System Menu aligns to the right edge of player guidance").toBeLessThanOrEqual(1);
      expect(result.menu.y).toBeGreaterThanOrEqual(result.guidance.y);
      expect(result.menu.bottom).toBeLessThanOrEqual(result.guidance.bottom);
      expect(result.guidance.y - result.systemCluster.bottom, "system cluster clears Guidance by 8–12px").toBeGreaterThanOrEqual(8);
      expect(result.guidance.y - result.systemCluster.bottom, "system cluster clears Guidance by 8–12px").toBeLessThanOrEqual(12);
      expect(overlaps(result.systemCluster, result.guidance), "system controls do not cover Local Guidance").toBe(false);
      for (const stageElement of result.stage) {
        expect(overlaps(result.systemCluster, stageElement), "system controls do not cover Interaction Stage content").toBe(false);
      }

      for (const seat of result.seats) {
        expect(seat.seat.width, `${seat.id} Hero seat width`).toBeGreaterThanOrEqual(minimumWidth);
        expect(seat.seat.height, `${seat.id} portrait seat height`).toBeGreaterThanOrEqual(minimumHeight);
        if (width >= 480) {
          expect(seat.seat.width / seat.seat.height, `${seat.id} keeps a portrait-oriented silhouette`).toBeLessThanOrEqual(0.75);
        }
        expect(seat.art.width, `${seat.id} dedicated Hero-art width`).toBeGreaterThanOrEqual(minimumWidth - 2);
        expect(seat.imageLoaded, `${seat.id} uses loaded repository Hero art`).toBe(true);
        expect(seat.hitSafe, `${seat.id} centre remains a normal target hit`).toBe(true);
        expect(seat.focalText, `${seat.id} identity text does not cover the Hero focal point`).toBe(false);
        expect(seat.focalEquipment, `${seat.id} equipment does not cover the Hero focal point`).toBe(false);
        expect(seat.seat.bottom, `${seat.id} remains above the Local Player Dock`).toBeLessThanOrEqual(result.dock.y - 6);

        const safeGap = seat.side === "left"
          ? result.safeZone.x - seat.seat.right
          : seat.seat.x - result.safeZone.right;
        expect(safeGap, `${seat.id} remains outside the Interaction Safe Zone`).toBeGreaterThanOrEqual(7.9);

        for (const stageElement of result.stage) {
          if (!overlaps(seat.seat, stageElement)) continue;
          const clearance = seat.side === "left"
            ? stageElement.x - seat.seat.right
            : seat.seat.x - stageElement.right;
          expect(clearance, `${stageElement.x} Stage content clears ${seat.id}`).toBeGreaterThanOrEqual(6);
        }

        for (const indicator of seat.equipment) {
          expect(indicator.x, `${seat.id} public equipment remains within the seat`).toBeGreaterThanOrEqual(seat.seat.x - 1);
          expect(indicator.right, `${seat.id} public equipment remains within the seat`).toBeLessThanOrEqual(seat.seat.right + 1);
        }
      }

      if (count === 10) {
        for (const seat of result.seats) {
          expect(overlaps(result.systemCluster, seat.seat), `${seat.id} is not covered by the System Menu`).toBe(false);
        }
      }

      if (count === 10 && (width === 480 || width === 650)) {
        await testInfo.attach(`side-column-${width}-10-player-hero-recognition`, {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      }
    });
  }
}
