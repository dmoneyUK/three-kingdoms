import { expect, test } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const evidenceRoot = process.env.U13_D_F_EVIDENCE_DIR;
const FOUR_SEAT_VIEWPORTS = [
  { width: 390, height: 700 },
  { width: 440, height: 766 },
  { width: 390, height: 844 },
  { width: 440, height: 894 },
  { width: 480, height: 900 },
];
const EQUIPMENT_CASES = [
  { name: "none", value: "empty", slots: [] },
  { name: "one", value: "weapon", slots: ["weapon"] },
  { name: "horse-only", value: "plusHorse", slots: ["defensiveHorse"] },
  { name: "minus-horse-only", value: "minusHorse", slots: ["offensiveHorse"] },
  { name: "two", value: "weaponArmor", slots: ["weapon", "armor"] },
  { name: "three", value: "three", slots: ["weapon", "armor", "defensiveHorse"] },
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
    const slots = [...(summary?.querySelectorAll(":scope > .opponent-equipment-slot") ?? [])];
    const indicators = slots.flatMap((slot) => {
      const indicator = slot.querySelector(":scope > .opponent-equipment-indicator");
      return indicator ? [{ slotElement: slot, indicator }] : [];
    });
    const hpBox = box(hp);
    const stripBox = box(strip);
    const slotBoxes = slots.map((slot) => ({
      slot: slot.dataset.slot,
      occupied: slot.dataset.occupied === "true",
      rect: box(slot),
      hasIndicator: Boolean(slot.querySelector(":scope > .opponent-equipment-indicator")),
    }));
    const indicatorBoxes = indicators.map(({ slotElement, indicator }) => ({
      slot: slotElement.dataset.slot,
      kind: indicator.dataset.cardKind,
      ariaLabel: indicator.getAttribute("aria-label"),
      title: indicator.title,
      rect: box(indicator),
      slotRect: box(slotElement),
      glyph: box(indicator.querySelector("svg")),
      glyphKind: indicator.querySelector("svg")?.dataset.equipmentGlyph ?? null,
      glyphParts: [...(indicator.querySelectorAll("svg [data-sword-part]") ?? [])].map((part) => part.dataset.swordPart),
      glyphMetrics: (() => {
        const svg = indicator.querySelector('svg[data-equipment-glyph="sword"]');
        if (!svg) return null;
        const viewBox = svg.viewBox.baseVal;
        const parts = [...svg.querySelectorAll("[data-sword-part]")].map((part) => {
          const { x, y, width, height } = part.getBBox();
          return {
            name: part.dataset.swordPart,
            x,
            y,
            width,
            height,
            diagonalSpan: Math.hypot(width, height),
          };
        });
        const blade = parts.find((part) => part.name === "blade");
        const grip = parts.find((part) => part.name === "grip");
        return {
          viewBox: { x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height },
          parts,
          bladeToGripDiagonalRatio: blade && grip ? blade.diagonalSpan / grip.diagonalSpan : null,
          allPartsInsideViewBox: parts.every((part) => part.x >= viewBox.x
            && part.y >= viewBox.y
            && part.x + part.width <= viewBox.x + viewBox.width
            && part.y + part.height <= viewBox.y + viewBox.height),
          groovePresent: Boolean(svg.querySelector("[data-sword-groove]")),
        };
      })(),
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
      slots: slotBoxes,
      indicators: indicatorBoxes,
      hpLeftInset: hpBox && stripBox ? hpBox.left - stripBox.left : null,
      equipmentRightInset: slotBoxes.length && stripBox
        ? stripBox.right - slotBoxes.at(-1).rect.right
        : null,
      hpEquipmentGap: slotBoxes.length && hpBox
        ? slotBoxes[0].rect.left - hpBox.right
        : null,
      overlapsHp: slotBoxes.some((slot) => intersects(hpBox, slot.rect)),
      clipsIndicator: slotBoxes.some((slot) => slot.rect.left < stripBox.left || slot.rect.right > stripBox.right),
      viewportWidth: innerWidth,
      documentWidth: document.documentElement.scrollWidth,
    };
  });
}

async function captureEvidence(page, testInfo, name, geometry, seat = null) {
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
  if (!seat) return;
  const weaponBadge = seat.locator('.opponent-equipment-slot[data-slot="weapon"] .opponent-equipment-indicator');
  if (await weaponBadge.count() === 0) return;
  const nativeBadge = await weaponBadge.screenshot({ animations: "disabled" });
  await testInfo.attach(`${name}-weapon-badge-native`, { body: nativeBadge, contentType: "image/png" });
  if (evidenceRoot) await writeFile(join(evidenceRoot, `${name}-weapon-badge-native.png`), nativeBadge);

  await weaponBadge.evaluate((badge) => {
    const host = document.createElement("div");
    host.className = "hud4-weapon-zoom-evidence";
    host.setAttribute("aria-hidden", "true");
    host.style.cssText = "position:fixed;left:0;top:0;width:148px;height:148px;display:grid;place-items:center;background:#0d100c;z-index:2147483647;pointer-events:none";
    const clone = badge.cloneNode(true);
    const badgeStyle = getComputedStyle(badge);
    clone.removeAttribute("role");
    clone.removeAttribute("aria-label");
    clone.style.cssText = `display:grid;place-items:center;box-sizing:border-box;width:136px;height:136px;border:4px solid ${badgeStyle.borderTopColor};border-radius:12px;background:${badgeStyle.backgroundColor};color:${badgeStyle.color};box-shadow:none`;
    const svg = clone.querySelector("svg");
    svg.style.cssText = "display:block;width:120px;height:120px;overflow:hidden;fill:currentColor";
    host.append(clone);
    document.body.append(host);
  });
  try {
    const zoomedOutline = await page.locator(".hud4-weapon-zoom-evidence").screenshot({ animations: "disabled" });
    await testInfo.attach(`${name}-weapon-outline-zoomed-diagnostic`, { body: zoomedOutline, contentType: "image/png" });
    if (evidenceRoot) await writeFile(join(evidenceRoot, `${name}-weapon-outline-zoomed-diagnostic.png`), zoomedOutline);
  } finally {
    await page.locator(".hud4-weapon-zoom-evidence").evaluate((host) => host.remove());
  }
}

function expectSwordGlyph(indicator, context) {
  expect(indicator.glyphKind, context).toBe("sword");
  expect(indicator.glyphParts, context).toEqual(["blade", "crossguard", "grip", "pommel"]);
  expect(indicator.glyphMetrics, context).not.toBeNull();
  expect(indicator.glyphMetrics.viewBox, context).toEqual({ x: 0, y: 0, width: 18, height: 18 });
  expect(indicator.glyphMetrics.parts.map(({ name }) => name), context).toEqual(["blade", "crossguard", "grip", "pommel"]);
  expect(indicator.glyphMetrics.allPartsInsideViewBox, `${context} stays inside the square`).toBe(true);
  expect(indicator.glyphMetrics.bladeToGripDiagonalRatio, `${context} has a long blade and short hilt`).toBeGreaterThanOrEqual(1.7);
  expect(indicator.glyphMetrics.groovePresent, `${context} keeps the blade split visible`).toBe(true);
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
      expect(geometry.slots.map((slot) => slot.slot)).toEqual(["weapon", "armor", "defensiveHorse", "offensiveHorse"]);
      expect(geometry.slots.every((slot) => slot.rect.width === geometry.slots[0].rect.width)).toBe(true);
      expect(geometry.slots.filter((slot) => slot.occupied).map((slot) => slot.slot)).toEqual(equipment.slots);
      expect(geometry.indicators.map((indicator) => indicator.slot)).toEqual(equipment.slots);
      for (const indicator of geometry.indicators) {
        expect(indicator.kind, indicator.slot).toBe(EQUIPMENT_KIND_BY_SLOT[indicator.slot]);
        expect(indicator.ariaLabel, indicator.slot).toContain(EQUIPMENT_LABEL_BY_SLOT[indicator.slot]);
        expect(indicator.title, indicator.slot).toMatch(/: .+/);
        expect(indicator.rect.width, indicator.slot).toBeGreaterThanOrEqual(11);
        expect(indicator.rect.height, indicator.slot).toBeGreaterThanOrEqual(11);
        expect(indicator.rect.left, `${indicator.slot} icon stays within its fixed slot`).toBeGreaterThanOrEqual(indicator.slotRect.left);
        expect(indicator.rect.right, `${indicator.slot} icon stays within its fixed slot`).toBeLessThanOrEqual(indicator.slotRect.right);
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
          const firstSlot = hp.parentElement.querySelector(".opponent-equipment-slot");
          const equipmentLeft = firstSlot?.getBoundingClientRect().left ?? null;
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
        expect(variant.right, variant.text).toBeLessThanOrEqual(geometry.slots[0].rect.left);
        expect(variant.equipmentGap, variant.text).toBeGreaterThanOrEqual(4);
      }

      expect(geometry.equipmentRightInset).toBeGreaterThanOrEqual(3);
      expect(geometry.equipmentRightInset).toBeLessThanOrEqual(5.5);
      expect(geometry.hpEquipmentGap).toBeGreaterThanOrEqual(4);
      for (const indicator of geometry.indicators) {
        if (indicator.slot === "weapon") {
          expect(indicator.kind).toBe("ZhugeCrossbow");
          expect(indicator.ariaLabel).toContain("Weapon equipped:");
          expect(indicator.glyphKind).toBe("sword");
          expectSwordGlyph(indicator, `${viewport.width}x${viewport.height} top-row weapon`);
          expect(indicator.glyph.width).toBeGreaterThanOrEqual(9);
          expect(indicator.glyph.width).toBeLessThanOrEqual(12);
          expect(indicator.glyph.height).toBeGreaterThanOrEqual(9);
        }
      }

      if (equipment.name === "four" && viewport.width === 390) {
        expect(geometry.hpEquipmentGap).toBeGreaterThanOrEqual(6);
        const maximumHp = geometry.hpSizeVariants.find((variant) => variant.text === "HP 10/10");
        expect(maximumHp.equipmentGap).toBeGreaterThanOrEqual(6);
      }
      await captureEvidence(page, testInfo, `${viewport.width}x${viewport.height}-${equipment.name}`, geometry, seat);
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
  expect(geometry.slots).toHaveLength(4);
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
        expect(geometry.slots).toHaveLength(4);
        expect(geometry.indicators.map((indicator) => indicator.slot), geometry.id).toEqual(expectedSlots);
        expect(geometry.overlapsHp, geometry.id).toBe(false);
        expect(geometry.clipsIndicator, geometry.id).toBe(false);
        expect(geometry.seat.left).toBeLessThanOrEqual(geometry.slots[0]?.rect.left ?? geometry.seat.right);
        expect(geometry.slots.every((slot) => slot.rect.width === geometry.slots[0].rect.width), geometry.id).toBe(true);
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
          expect(indicator.rect.left, `${geometry.id} ${indicator.slot} stays within slot`).toBeGreaterThanOrEqual(indicator.slotRect.left);
          expect(indicator.rect.right, `${geometry.id} ${indicator.slot} stays within slot`).toBeLessThanOrEqual(indicator.slotRect.right);
            if (indicator.slot === "weapon") {
              expectSwordGlyph(indicator, `${count}-seat ${viewport.width}px side-column weapon`);
              expect(indicator.glyph.width).toBeGreaterThanOrEqual(6);
              expect(indicator.glyph.width).toBeLessThanOrEqual(12);
              expect(indicator.glyph.height).toBeGreaterThanOrEqual(6);
              expect(indicator.glyph.height).toBeLessThanOrEqual(12);
            }
          }
        }
      }
      expect(geometries.some((geometry) => geometry.indicators.length === 4)).toBe(count >= 8);
      expect(geometries.every((geometry) => geometry.documentWidth <= geometry.viewportWidth)).toBe(true);
      const weaponSeat = board.locator('.opponent-player-card[data-player-anchor="p2"]');
      await captureEvidence(page, testInfo, `${count}side-${viewport.width}x${viewport.height}`, geometries, weaponSeat);
    });
  }
}

for (const viewport of [{ width: 390, height: 700 }, { width: 440, height: 766 }]) {
  test(`HUD-4 equipment slot positions stay fixed through equip, replace and discard at ${viewport.width}px`, async ({ page }, testInfo) => {
    await loadFixture(page, { count: 4, viewport, equipmentCase: "empty" });
    const seat = page.locator('.player-board[data-seat-topology="top-row"] > .opponent-player-card[data-player-anchor="p2"]');
    const positions = async () => readEquipmentGeometry(seat);
    const initial = await positions();
    await captureEvidence(page, testInfo, `${viewport.width}x${viewport.height}-initial-empty`, initial);
    const transitions = [
      { name: "equip weapon", cards: [{ id: "hud4-weapon-a", kind: "ZhugeCrossbow", suit: "♦", rank: "A" }] },
      { name: "equip horse only", cards: [{ id: "hud4-horse", kind: "Shadowrunner", suit: "♠", rank: "5" }] },
      { name: "equip four slots", cards: [
        { id: "hud4-weapon-b", kind: "KirinBow", suit: "♥", rank: "Q" },
        { id: "hud4-armor", kind: "NioShield", suit: "♣", rank: "2" },
        { id: "hud4-plus", kind: "Shadowrunner", suit: "♠", rank: "5" },
        { id: "hud4-minus", kind: "FerganaSteed", suit: "♠", rank: "K" },
      ] },
      { name: "replace weapon", cards: [
        { id: "hud4-weapon-c", kind: "BlueSteelSword", suit: "♣", rank: "6" },
        { id: "hud4-armor", kind: "NioShield", suit: "♣", rank: "2" },
        { id: "hud4-plus", kind: "Shadowrunner", suit: "♠", rank: "5" },
        { id: "hud4-minus", kind: "FerganaSteed", suit: "♠", rank: "K" },
      ] },
      { name: "discard weapon and armour", cards: [
        { id: "hud4-plus", kind: "Shadowrunner", suit: "♠", rank: "5" },
        { id: "hud4-minus", kind: "FerganaSteed", suit: "♠", rank: "K" },
      ] },
      { name: "discard all", cards: [] },
    ];

    for (const transition of transitions) {
      await page.evaluate(({ playerId, equipmentCards }) => window.__setBrowserPlayerEquipment(playerId, equipmentCards), {
        playerId: "p2",
        equipmentCards: transition.cards,
      });
      const geometry = await positions();
      expect(geometry.slots.map(({ slot }) => slot), transition.name).toEqual(initial.slots.map(({ slot }) => slot));
      for (const [index, slot] of geometry.slots.entries()) {
        for (const edge of ["left", "right", "top", "bottom", "width", "height"]) {
          expect(slot.rect[edge], `${transition.name} ${slot.slot} ${edge}`)
            .toBeCloseTo(initial.slots[index].rect[edge], 1);
        }
      }
      expect(geometry.overlapsHp, transition.name).toBe(false);
      expect(geometry.hpEquipmentGap, transition.name).toBeGreaterThanOrEqual(4);
      expect(geometry.indicators.map(({ slot }) => slot), transition.name).toEqual(
        ["weapon", "armor", "defensiveHorse", "offensiveHorse"].filter((slot) => transition.cards.some((card) => ({
          weapon: ["ZhugeCrossbow", "KirinBow", "BlueSteelSword"],
          armor: ["NioShield"],
          defensiveHorse: ["Shadowrunner"],
          offensiveHorse: ["FerganaSteed"],
        })[slot].includes(card.kind))),
      );
      await captureEvidence(page, testInfo, `${viewport.width}x${viewport.height}-${transition.name.replaceAll(" ", "-")}`, geometry, seat);
    }
  });
}

for (const count of [6, 8, 10]) {
  test(`HUD-4 ${count}-seat side equipment DOMRects stay fixed from empty to occupied at 390px`, async ({ page }, testInfo) => {
    const viewport = { width: 390, height: 844 };
    await loadFixture(page, { count, viewport, equipmentCase: "empty" });
    const board = page.locator(`.player-board[data-seat-topology="side-column"][data-player-count="${count}"]`);
    const seats = board.locator(":scope > .opponent-player-card[data-player-anchor]");
    const readAllSlotRects = async () => {
      const rects = [];
      for (let index = 0; index < await seats.count(); index += 1) {
        const seat = seats.nth(index);
        const playerId = await seat.getAttribute("data-player-anchor");
        const geometry = await readEquipmentGeometry(seat);
        rects.push({ playerId, slots: geometry.slots.map(({ slot, rect }) => ({ slot, rect })) });
      }
      return rects;
    };
    const empty = await readAllSlotRects();
    expect(empty.every(({ slots }) => slots.length === 4)).toBe(true);
    await captureEvidence(page, testInfo, `${count}side-390x844-empty`, empty, board.locator('.opponent-player-card[data-player-anchor="p2"]'));

    await loadFixture(page, { count, viewport, equipmentCase: "matrix" });
    const occupied = await readAllSlotRects();
    expect(occupied.map(({ playerId }) => playerId)).toEqual(empty.map(({ playerId }) => playerId));
    for (const [seatIndex, player] of occupied.entries()) {
      expect(player.slots.map(({ slot }) => slot)).toEqual(empty[seatIndex].slots.map(({ slot }) => slot));
      for (const [slotIndex, { slot, rect }] of player.slots.entries()) {
        for (const edge of ["left", "right", "top", "bottom", "width", "height"]) {
          expect(rect[edge], `${player.playerId} ${slot} ${edge}`).toBeCloseTo(empty[seatIndex].slots[slotIndex].rect[edge], 1);
        }
      }
    }
    const weaponSeat = board.locator('.opponent-player-card[data-player-anchor="p2"]');
    const weaponGeometry = await readEquipmentGeometry(weaponSeat);
    await captureEvidence(page, testInfo, `${count}side-390x844-occupied`, weaponGeometry, weaponSeat);
  });
}
