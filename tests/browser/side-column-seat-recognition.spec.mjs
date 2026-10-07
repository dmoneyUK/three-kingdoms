import { expect, test } from "@playwright/test";

const VIEWPORTS = [320, 390, 480, 610, 620, 650];
const PLAYER_COUNTS = [6, 10];

async function loadFixture(page, { width, count }) {
  await page.setViewportSize({ width, height: 900 });
  await page.goto(`/tests/browser/fixture.html?state=interaction&count=${count}&equipmentCase=matrix`);
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
    const safeZone = table.querySelector(":scope > .interaction-safe-zone");
    const stage = safeZone.querySelector(":scope > .interaction-stage");
    const systemCluster = safeZone.querySelector(":scope > .stage-system-cluster");
    const guidance = document.querySelector(".local-player-dock .console-guidance");
    const dock = document.querySelector(".local-player-dock");
    return {
      viewportWidth: window.innerWidth,
      pageWidth: document.documentElement.scrollWidth,
      safeZone: bounds(safeZone),
      systemCluster: bounds(systemCluster),
      guidance: bounds(guidance),
      dock: bounds(dock),
      menu: bounds(systemCluster.querySelector(".stage-system-menu-trigger")),
      stage: [stage, ...stage.querySelectorAll("*")].filter(visible).map(bounds),
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
          side: seat.dataset.sideColumn,
          seat: bounds(seat),
          target: targetBounds,
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
