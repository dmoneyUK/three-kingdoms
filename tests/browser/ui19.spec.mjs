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

async function loadFixture(page, { state = "normal", count = 4, width, height, reducedMotion = false }) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: reducedMotion ? "reduce" : "no-preference" });
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

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
  test(`UX2.0VIS-04A ${width}x${height} keeps public identity and hand count while hiding zone card faces`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count: 4, width, height });
    for (const playerId of ["p2", "p3", "p4"]) {
      const seat = page.locator(`[data-player-anchor="${playerId}"]`);
      await assertVisible(seat.locator(".opponent-player-name"), `${playerId} name`);
      await assertVisible(seat.locator(".opponent-hero-name"), `${playerId} hero name`);
      await assertVisible(seat.locator(".player-hp"), `${playerId} HP text`);
      await assertVisible(seat.locator(".opponent-hand-footer .player-hand-count"), `${playerId} hand count`);
    }

    const equipmentSeat = page.locator('[data-player-anchor="p2"]');
    await expect(equipmentSeat.locator(".opponent-equipment-zone")).toBeHidden();
    await expect(equipmentSeat.locator(".opponent-equipment-slots .mini-zone-card")).toHaveCount(1);
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
  test(`UX2.0VIS-04A ${width}x${height} leaves 6-player side-column seats and public zones unchanged`, async ({ page }) => {
    await loadFixture(page, { state: "rest", count: 6, width, height });
    const result = await geometry(page);
    const board = page.locator('.player-board[data-seat-topology="side-column"]');

    await expect(board).toHaveCount(1);
    await expect(board.locator("[data-player-anchor]")).toHaveCount(5);
    await expect(board.locator('[data-player-anchor="p2"] .opponent-equipment-zone')).toBeVisible();
    await expect(board.locator('[data-player-anchor="p3"] .opponent-judgement-zone')).toBeVisible();
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
        expect(seat.width).toBe(viewport.seat.width);
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

test("UX2.0VIS-04B Dying 650x900 proves old top offset overflow and new geometry contains content", async ({ page }) => {
  const viewport = VIS_04B_VIEWPORTS.find(({ width }) => width === 650);
  await loadFixture(page, { state: "dying", count: 4, width: viewport.width, height: viewport.height });
  const playTable = page.locator(".play-table");

  await playTable.evaluate((element, previousTop) => element.style.setProperty("--interaction-safe-top", previousTop), viewport.previousTop);
  const previous = await interactionGeometry(page);
  expect(previous.stage.bottom).toBeGreaterThan(previous.safeZone.bottom + 4);

  await playTable.evaluate((element) => element.style.removeProperty("--interaction-safe-top"));
  const current = await interactionGeometry(page);
  await assertVisible(page.locator('[data-dying-handoff="proven"]'), "Dying handoff");
  expect(current.stage.height).toBe(previous.stage.height);
  expect(current.dyingHandoff.height).toBe(previous.dyingHandoff.height);
  expect(current.stage.bottom).toBeLessThanOrEqual(current.safeZone.bottom + 4);
  expect(current.stage.bottom).toBeLessThanOrEqual(current.playTable.bottom - 1);
  expect(current.dyingHandoff.bottom).toBeLessThanOrEqual(current.stage.bottom + 4);
  expect(current.stageDockOverlap).toBe(0);
  expect(current.safeZoneDockOverlap).toBe(0);
});

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
        expect(result.stageRegions, "stable hero, event, and meta regions remain mounted").toHaveLength(3);
        expect(result.stageRegions.every((region) => region.insideStage), "all three stable regions remain inside the Interaction Stage DOM").toBe(true);
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
      if (width > 650) {
        if (result.eventRegionVisible) expect(result.heroEventOverlap, "Hero and visible Event regions do not overlap").toBe(0);
        expect(result.heroMetaOverlap, "Hero and Meta regions do not overlap").toBe(0);
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
      await expect(page.locator(".interaction-stage-meta-region"), "Meta region hook remains mounted once").toHaveCount(1);
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
