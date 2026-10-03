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
  { state: "interaction", label: "Interaction" },
  { state: "negation", label: "Negation" },
  { state: "dying", label: "Dying" },
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
  await expect(page.locator('[data-hero-focus-role="CURRENT PARTICIPANT"]')).toBeVisible();
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
