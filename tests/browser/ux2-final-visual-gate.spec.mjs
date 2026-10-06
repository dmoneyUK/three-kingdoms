import { expect, test } from "@playwright/test";

async function loadFixture(page, { state, count, width, height, params = {} }) {
  await page.setViewportSize({ width, height });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const query = new URLSearchParams({ state, count: String(count), ...params });
  await page.goto(`/tests/browser/fixture.html?${query}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function measureStageDock(page) {
  return page.evaluate(() => {
    const rect = (node) => {
      if (!node) return null;
      const { x, y, width, height } = node.getBoundingClientRect();
      return { x, y, width, height, right: x + width, bottom: y + height };
    };
    const safeZone = rect(document.querySelector(".interaction-safe-zone"));
    const stage = rect(document.querySelector(".interaction-stage"));
    const dock = rect(document.querySelector(".local-player-dock"));
    const overlapWidth = safeZone && stage && dock
      ? Math.max(0, Math.min(stage.right, dock.right) - Math.max(stage.x, dock.x))
      : 0;
    const overlapHeight = safeZone && stage && dock
      ? Math.max(0, Math.min(stage.bottom, dock.bottom) - Math.max(stage.y, dock.y))
      : 0;
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      safeZone,
      stage,
      dock,
      stageDockOverlapArea: overlapWidth * overlapHeight,
      documentScrollWidth: document.documentElement.scrollWidth,
      stageCount: document.querySelectorAll(".interaction-stage").length,
      dockCount: document.querySelectorAll(".local-player-dock").length,
    };
  });
}

const topologyCases = [
  { label: "2-player wide", state: "rest", count: 2, width: 1440, height: 900 },
  { label: "4-player short portrait", state: "rest", count: 4, width: 390, height: 640 },
  { label: "6-player Side Column", state: "rest", count: 6, width: 480, height: 900 },
  { label: "10-player wide", state: "rest", count: 10, width: 1440, height: 900 },
];

for (const scenario of topologyCases) {
  test(`UX2 §12.9 topology containment — ${scenario.label}`, async ({ page }) => {
    await loadFixture(page, scenario);
    const geometry = await measureStageDock(page);
    expect(geometry.dock, "Local Player Dock is measurable").not.toBeNull();
    expect(geometry.dock.x).toBeGreaterThanOrEqual(-1);
    expect(geometry.dock.right).toBeLessThanOrEqual(scenario.width + 1);
    expect(geometry.documentScrollWidth, "topology does not create horizontal overflow").toBeLessThanOrEqual(scenario.width);
    expect(geometry.dockCount).toBe(1);
    if (geometry.stage) {
      expect(geometry.stageDockOverlapArea, "Stage and Dock do not overlap").toBe(0);
      expect(geometry.stage.x).toBeGreaterThanOrEqual(geometry.safeZone.x - 1);
      expect(geometry.stage.y).toBeGreaterThanOrEqual(geometry.safeZone.y - 1);
      expect(geometry.stage.right).toBeLessThanOrEqual(geometry.safeZone.right + 1);
      expect(geometry.stage.bottom).toBeLessThanOrEqual(geometry.safeZone.bottom + 1);
    }
  });
}

const activeCases = [
  {
    id: "group-4p-390x640",
    state: "group-observer",
    count: 4,
    width: 390,
    height: 640,
    params: { groupProgress: "valid", effect: "RainingArrows" },
    required: ['[data-group-composition="true"]', '[data-group-source="proven"]', '[data-group-root-action="RainingArrows"]', '[aria-label="Group Target Strip"]'],
    capture: true,
  },
  {
    id: "group-6p-480x900",
    state: "group-observer",
    count: 6,
    width: 480,
    height: 900,
    params: { groupProgress: "valid", effect: "RainingArrows" },
    required: ['[data-group-composition="true"]', '[data-group-root-action="RainingArrows"]', '[aria-label="Group Target Strip"]'],
    capture: true,
  },
  {
    id: "group-10p-390x844",
    state: "group-observer",
    count: 10,
    width: 390,
    height: 844,
    params: { groupProgress: "valid", effect: "RainingArrows" },
    required: ['[data-group-composition="true"]', '[data-group-root-action="RainingArrows"]', '[aria-label="Group Target Strip"]'],
  },
  {
    id: "attack-dodge-4p-1440x900",
    state: "active-attack-observer",
    count: 4,
    width: 1440,
    height: 900,
    required: ['[data-stage="ATTACK_RESPONSE"][data-current-effect="Attack"]', '.local-player-dock'],
    capture: true,
  },
  {
    id: "duel-6p-480x900",
    state: "duel",
    count: 6,
    width: 480,
    height: 900,
    params: { duelObserver: "1" },
    required: ['[data-stage="DUEL_EXCHANGE"][data-current-effect="Duel"]'],
    capture: true,
  },
  {
    id: "negation-4p-390x844",
    state: "negation",
    count: 4,
    width: 390,
    height: 844,
    required: ['[data-stage="NEGATION"]', '.local-player-dock'],
    capture: true,
  },
  {
    id: "oath-4p-390x844",
    state: "oath-negation",
    count: 4,
    width: 390,
    height: 844,
    required: ['[data-oath-composition="true"]', '[data-oath-source="proven"]', '[data-oath-root-action="Oath"]', '[data-oath-recipient-scope="proven"]'],
    capture: true,
  },
  {
    id: "oath-wide-1440x900",
    state: "oath-negation",
    count: 4,
    width: 1440,
    height: 900,
    required: ['[data-oath-composition="true"]', '[data-oath-root-action="Oath"]', '[data-oath-recipient-scope="proven"]'],
  },
  {
    id: "bumper-10p-390x844",
    state: "bumper-harvest-dense",
    count: 10,
    width: 390,
    height: 844,
    required: ['[data-bumper-harvest-composition="true"]', '[data-bumper-harvest-root-action="BumperHarvest"]', '[data-bumper-harvest-participants="proven"]'],
    capture: true,
  },
  {
    id: "bumper-wide-1440x900",
    state: "bumper-harvest-open",
    count: 4,
    width: 1440,
    height: 900,
    required: ['[data-bumper-harvest-composition="true"]', '[data-bumper-harvest-root-action="BumperHarvest"]', '[data-bumper-harvest-participants="proven"]'],
    capture: true,
  },
  {
    id: "judgement-6p-480x900",
    state: "judgement",
    count: 6,
    width: 480,
    height: 900,
    required: ['[data-stage="JUDGEMENT"][data-current-effect="Overindulgence"]', '[data-stage-event-summary="proven"]'],
    capture: true,
  },
  {
    id: "dying-4p-390x640",
    state: "dying",
    count: 4,
    width: 390,
    height: 640,
    required: ['[data-stage="DYING"][data-current-effect="Attack"]', '[data-dying-handoff="proven"]'],
    capture: true,
  },
  {
    id: "borrowed-sword-2p-390x844",
    state: "borrowed-sword-active-two-player",
    count: 2,
    width: 390,
    height: 844,
    required: ['[data-borrowed-sword-forced-attack="true"]', '[data-hero-focus-player-id="p2"]', '.local-player-dock[data-player-anchor="p1"]'],
  },
  {
    id: "borrowed-sword-4p-390x844",
    state: "borrowed-sword-active",
    count: 4,
    width: 390,
    height: 844,
    required: ['[data-borrowed-sword-forced-attack="true"]', '[data-medium-participant-player-id="p2"]', '[aria-label="Current Effect"]', '[data-hero-focus-player-id="p3"]'],
    capture: true,
  },
  {
    id: "borrowed-sword-wide-1440x900",
    state: "borrowed-sword-active",
    count: 4,
    width: 1440,
    height: 900,
    required: ['[data-borrowed-sword-forced-attack="true"]', '[data-current-effect="Attack"]'],
    capture: true,
  },
];

for (const scenario of activeCases) {
  test(`UX2 §12.9 ${scenario.id} stays contained with no Stage/Dock overlap or page overflow`, async ({ page }, testInfo) => {
    await loadFixture(page, scenario);
    const stage = page.locator(".interaction-stage");
    await expect(stage).toBeVisible();
    for (const selector of scenario.required) await expect(page.locator(selector).first()).toBeVisible();

    const geometry = await measureStageDock(page);
    expect(geometry.stageCount).toBe(1);
    expect(geometry.dockCount).toBe(1);
    expect(geometry.stage && geometry.safeZone && geometry.dock).toBeTruthy();
    expect(geometry.stageDockOverlapArea, "Stage and Dock do not overlap").toBe(0);
    expect(geometry.stage.x).toBeGreaterThanOrEqual(geometry.safeZone.x - 1);
    expect(geometry.stage.y).toBeGreaterThanOrEqual(geometry.safeZone.y - 1);
    expect(geometry.stage.right).toBeLessThanOrEqual(geometry.safeZone.right + 1);
    expect(geometry.stage.bottom).toBeLessThanOrEqual(geometry.safeZone.bottom + 1);
    expect(geometry.dock.x).toBeGreaterThanOrEqual(-1);
    expect(geometry.dock.right).toBeLessThanOrEqual(scenario.width + 1);
    expect(geometry.documentScrollWidth, "ACTIVE composition does not create horizontal overflow").toBeLessThanOrEqual(scenario.width);

    if (scenario.capture) {
      const screenshotPath = testInfo.outputPath(`ux2-final-${scenario.id}.png`);
      await page.screenshot({ path: screenshotPath, animations: "disabled" });
      await testInfo.attach(`ux2-final-${scenario.id}`, { path: screenshotPath });
      await testInfo.attach(`ux2-final-${scenario.id}-geometry`, {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
    }
  });
}
