import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const evidenceRoot = process.env.U13_D_F_EVIDENCE_DIR;
const FOUR_SEAT_VIEWPORTS = [
  { width: 390, height: 700 },
  { width: 390, height: 844 },
  { width: 440, height: 894 },
  { width: 480, height: 900 },
];
const EQUIPMENT_CASES = [
  { name: "none", value: "empty", slots: [] },
  { name: "one", value: "weapon", slots: ["weapon"] },
  { name: "two", value: "weaponArmor", slots: ["weapon", "armor"] },
  { name: "four", value: "multiple", slots: ["weapon", "armor", "defensiveHorse", "offensiveHorse"] },
];
const EQUIPMENT_KIND_BY_SLOT = {
  weapon: "ZhugeCrossbow",
  armor: "NioShield",
  defensiveHorse: "Shadowrunner",
  offensiveHorse: "FerganaSteed",
};
const EQUIPMENT_LABEL_BY_SLOT = {
  weapon: "Weapon equipped:",
  armor: "Armour equipped:",
  defensiveHorse: "Plus-one horse equipped:",
  offensiveHorse: "Minus-one horse equipped:",
};
const MATRIX_SLOTS_BY_PLAYER = {
  p2: ["weapon"],
  p3: ["armor"],
  p4: ["defensiveHorse"],
  p5: ["offensiveHorse"],
  p6: ["weapon", "armor"],
  p7: ["weapon", "armor", "defensiveHorse", "offensiveHorse"],
};

async function loadFixture(page, { count, viewport, equipmentCase, defeatedSeat }) {
  await page.setViewportSize(viewport);
  const params = new URLSearchParams({ state: "rest", count: String(count), equipmentCase });
  if (defeatedSeat) params.set("defeatedSeat", defeatedSeat);
  await page.goto(`/tests/browser/fixture.html?${params}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function readEquipmentGeometry(seat) {
  return seat.evaluate((element) => {
    const box = (node) => {
      if (!node) return null;
      const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
      return { left, right, top, bottom, width, height };
    };
    const strip = element.querySelector(".opponent-status-equipment-strip");
    const hp = strip?.querySelector(".opponent-hp-chip");
    const summary = strip?.querySelector(".opponent-equipment-summary");
    const indicators = [...(summary?.querySelectorAll(".opponent-equipment-indicator") ?? [])];
    const hpBox = box(hp);
    const stripBox = box(strip);
    const indicatorBoxes = indicators.map((indicator) => ({
      slot: indicator.dataset.slot,
      kind: indicator.dataset.cardKind,
      ariaLabel: indicator.getAttribute("aria-label"),
      title: indicator.title,
      rect: box(indicator),
      glyph: box(indicator.querySelector("svg")),
      glyphKind: indicator.querySelector("svg")?.dataset.equipmentGlyph ?? null,
      glyphParts: [...(indicator.querySelectorAll("svg [data-sword-part]") ?? [])].map((part) => part.dataset.swordPart),
    }));
    const intersects = (a, b) => Boolean(a && b
      && a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top);
    return {
      id: element.dataset.playerAnchor,
      topology: element.closest(".player-board")?.dataset.seatTopology,
      seat: box(element),
      strip: stripBox,
      hp: {
        text: hp?.textContent?.trim() ?? "",
        ariaLabel: hp?.getAttribute("aria-label") ?? "",
        rect: hpBox,
        fontSize: Number.parseFloat(getComputedStyle(hp).fontSize),
        fontWeight: getComputedStyle(hp).fontWeight,
      },
      summary: {
        rect: box(summary),
        justifyContent: getComputedStyle(summary).justifyContent,
        slotCount: Number(summary?.dataset.slotCount ?? 0),
      },
      indicators: indicatorBoxes,
      hpLeftInset: hpBox && stripBox ? hpBox.left - stripBox.left : null,
      equipmentRightInset: indicatorBoxes.length && stripBox
        ? stripBox.right - indicatorBoxes.at(-1).rect.right
        : null,
      hpEquipmentGap: indicatorBoxes.length && hpBox
        ? indicatorBoxes[0].rect.left - hpBox.right
        : null,
      overlapsHp: indicatorBoxes.some((indicator) => intersects(hpBox, indicator.rect)),
      clipsIndicator: indicatorBoxes.some((indicator) => indicator.rect.left < stripBox.left || indicator.rect.right > stripBox.right),
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
}

async function captureEvidence(page, testInfo, name, geometry) {
  const screenshot = await page.screenshot({ animations: "disabled" });
  await testInfo.attach(`${name}-screenshot`, { body: screenshot, contentType: "image/png" });
  await testInfo.attach(`${name}-geometry`, {
    body: JSON.stringify(geometry, null, 2),
    contentType: "application/json",
  });
  if (evidenceRoot) {
    await mkdir(evidenceRoot, { recursive: true });
    await writeFile(join(evidenceRoot, `${name}.png`), screenshot);
    await writeFile(join(evidenceRoot, `${name}.json`), `${JSON.stringify(geometry, null, 2)}\n`);
  }
}

for (const viewport of FOUR_SEAT_VIEWPORTS) {
  for (const equipment of EQUIPMENT_CASES) {
    test(`U13-D-F four-seat ${equipment.name} equipment at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await loadFixture(page, { count: 4, viewport, equipmentCase: equipment.value });
      const seat = page.locator('.player-board[data-seat-topology="top-row"][data-player-count="4"] > .opponent-player-card[data-player-anchor="p2"]');
      const geometry = await readEquipmentGeometry(seat);

      expect(geometry.topology).toBe("top-row");
      expect(geometry.hp.text).toMatch(/^HP \d+\/\d+$/);
      expect(geometry.hp.ariaLabel).toMatch(/^HP \d+ of \d+$/);
      expect(geometry.hp.fontSize).toBeGreaterThanOrEqual(11);
      expect(geometry.hp.fontSize).toBeLessThanOrEqual(12.5);
      expect(geometry.hp.fontWeight).toMatch(/^(700|800|900)$/);
      expect(geometry.hpLeftInset).toBeGreaterThanOrEqual(3);
      expect(geometry.hpLeftInset).toBeLessThanOrEqual(7);
      expect(geometry.summary.slotCount).toBe(equipment.slots.length);
      expect(geometry.indicators.map((indicator) => indicator.slot)).toEqual(equipment.slots);
      for (const indicator of geometry.indicators) {
        expect(indicator.kind, indicator.slot).toBe(EQUIPMENT_KIND_BY_SLOT[indicator.slot]);
        expect(indicator.ariaLabel, indicator.slot).toContain(EQUIPMENT_LABEL_BY_SLOT[indicator.slot]);
        expect(indicator.title, indicator.slot).toMatch(/: .+/);
        expect(indicator.rect.width, indicator.slot).toBeGreaterThanOrEqual(11);
        expect(indicator.rect.height, indicator.slot).toBeGreaterThanOrEqual(11);
      }
      expect(geometry.overlapsHp).toBe(false);
      expect(geometry.clipsIndicator).toBe(false);
      expect(geometry.documentWidth).toBeLessThanOrEqual(geometry.viewportWidth);

      geometry.hpSizeVariants = await seat.locator(".opponent-hp-chip").evaluate((hp) => {
        const originalText = hp.textContent;
        const originalLabel = hp.getAttribute("aria-label");
        const values = ["HP 3/3", "HP 5/5", "HP 10/10", "HP 0/4"];
        const measurements = values.map((text) => {
          hp.textContent = text;
          const rect = hp.getBoundingClientRect();
          const firstIndicator = hp.parentElement.querySelector(".opponent-equipment-indicator");
          const equipmentLeft = firstIndicator?.getBoundingClientRect().left ?? null;
          return {
            text,
            width: rect.width,
            height: rect.height,
            right: rect.right,
            equipmentGap: equipmentLeft === null ? null : equipmentLeft - rect.right,
          };
        });
        hp.textContent = originalText;
        hp.setAttribute("aria-label", originalLabel);
        return measurements;
      });
      for (const variant of geometry.hpSizeVariants) {
        expect(variant.height, variant.text).toBeGreaterThanOrEqual(10);
        expect(variant.height, variant.text).toBeLessThanOrEqual(14);
        expect(variant.width, variant.text).toBeGreaterThan(0);
        if (geometry.indicators.length) {
          expect(variant.right, variant.text).toBeLessThanOrEqual(geometry.indicators[0].rect.left);
          expect(variant.equipmentGap, variant.text).toBeGreaterThanOrEqual(0);
        }
      }

      if (geometry.indicators.length) {
        expect(geometry.summary.justifyContent).toBe("flex-end");
        expect(geometry.equipmentRightInset).toBeGreaterThanOrEqual(3);
        expect(geometry.equipmentRightInset).toBeLessThanOrEqual(5.5);
        expect(geometry.hpEquipmentGap).toBeGreaterThanOrEqual(4);
        for (const indicator of geometry.indicators) {
          if (indicator.slot === "weapon") {
            expect(indicator.kind).toBe("ZhugeCrossbow");
            expect(indicator.ariaLabel).toContain("Weapon equipped:");
            expect(indicator.glyphKind).toBe("sword");
            expect(indicator.glyphParts).toEqual(["blade", "crossguard", "grip", "pommel"]);
            expect(indicator.glyph.width).toBeGreaterThanOrEqual(11);
            expect(indicator.glyph.height).toBeGreaterThanOrEqual(11);
          }
        }
      }

      if (equipment.name === "four" && viewport.width === 390) {
        expect(geometry.hpEquipmentGap).toBeGreaterThanOrEqual(6);
        const maximumHp = geometry.hpSizeVariants.find((variant) => variant.text === "HP 10/10");
        expect(maximumHp.equipmentGap).toBeGreaterThanOrEqual(6);
      }
      await captureEvidence(page, testInfo, `${viewport.width}x${viewport.height}-${equipment.name}`, geometry);
    });
  }
}

test("U13-D-F zero-HP opponent keeps HP readable in the four-equipment strip", async ({ page }) => {
  const viewport = { width: 390, height: 700 };
  await loadFixture(page, { count: 4, viewport, equipmentCase: "multiple", defeatedSeat: "p2" });
  const seat = page.locator('.player-board[data-seat-topology="top-row"][data-player-count="4"] > .opponent-player-card[data-player-anchor="p2"]');
  const geometry = await readEquipmentGeometry(seat);
  expect(geometry.hp.text).toBe("HP 0/4");
  expect(geometry.hp.ariaLabel).toBe("HP 0 of 4");
  expect(geometry.hp.fontSize).toBeGreaterThanOrEqual(11);
  expect(geometry.overlapsHp).toBe(false);
  expect(geometry.indicators).toHaveLength(4);
});

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }]) {
  for (const count of [6, 8, 10]) {
    test(`U13-D-F ${count}-seat side equipment right-aligns without clipping at ${viewport.width}x${viewport.height}`, async ({ page }, testInfo) => {
      await loadFixture(page, { count, viewport, equipmentCase: "matrix" });
      const board = page.locator(`.player-board[data-seat-topology="side-column"][data-player-count="${count}"]`);
      const seats = board.locator(":scope > .opponent-player-card[data-player-anchor]");
      const geometries = [];
      for (let index = 0; index < await seats.count(); index += 1) {
        geometries.push(await readEquipmentGeometry(seats.nth(index)));
      }

      expect(geometries).toHaveLength(count - 1);
      for (const geometry of geometries) {
        const expectedSlots = MATRIX_SLOTS_BY_PLAYER[geometry.id] ?? [];
        expect(geometry.topology).toBe("side-column");
        expect(geometry.hp.rect.width).toBeGreaterThan(0);
        expect(geometry.hp.rect.height).toBeGreaterThanOrEqual(7);
        expect(geometry.hp.fontSize).toBeGreaterThanOrEqual(7);
        expect(geometry.summary.slotCount).toBe(geometry.indicators.length);
        expect(geometry.indicators.map((indicator) => indicator.slot), geometry.id).toEqual(expectedSlots);
        expect(geometry.overlapsHp, geometry.id).toBe(false);
        expect(geometry.clipsIndicator, geometry.id).toBe(false);
        expect(geometry.seat.left).toBeLessThanOrEqual(geometry.indicators[0]?.rect.left ?? geometry.seat.right);
        if (geometry.indicators.length) {
          expect(geometry.summary.justifyContent, geometry.id).toBe("flex-end");
          expect(geometry.equipmentRightInset, geometry.id).toBeGreaterThanOrEqual(1);
          expect(geometry.equipmentRightInset, geometry.id).toBeLessThanOrEqual(3.5);
          expect(geometry.hpEquipmentGap, geometry.id).toBeGreaterThanOrEqual(1);
          for (const indicator of geometry.indicators) {
            expect(indicator.kind, `${geometry.id} ${indicator.slot}`).toBe(EQUIPMENT_KIND_BY_SLOT[indicator.slot]);
            expect(indicator.ariaLabel, `${geometry.id} ${indicator.slot}`).toContain(EQUIPMENT_LABEL_BY_SLOT[indicator.slot]);
            expect(indicator.title, `${geometry.id} ${indicator.slot}`).toMatch(/: .+/);
            expect(indicator.rect.width, `${geometry.id} ${indicator.slot}`).toBeGreaterThanOrEqual(7);
            expect(indicator.rect.height, `${geometry.id} ${indicator.slot}`).toBeGreaterThanOrEqual(7);
          }
        }
      }
      expect(geometries.some((geometry) => geometry.indicators.length === 4)).toBe(count >= 8);
      expect(geometries.every((geometry) => geometry.documentWidth <= geometry.viewportWidth)).toBe(true);
      await captureEvidence(page, testInfo, `${count}side-${viewport.width}x${viewport.height}`, geometries);
    });
  }
}
