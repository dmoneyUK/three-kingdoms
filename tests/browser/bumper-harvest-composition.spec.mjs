import { expect, test } from "@playwright/test";

async function loadBumperHarvest(page, { width = 390, height = 844, state = "bumper-harvest-open", count = 4, history = null } = {}) {
  await page.setViewportSize({ width, height });
  const historyQuery = history ? `&negationHistory=${encodeURIComponent(history)}` : "";
  await page.goto(`/tests/browser/fixture.html?state=${state}&count=${count}${historyQuery}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

for (const viewport of [
  { width: 390, height: 640 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
]) {
  test(`Bumper Harvest causal geometry stays stable as public Negation branches grow at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const measure = async (history) => {
      await loadBumperHarvest(page, { ...viewport, history });
      const stage = page.locator('.interaction-stage[data-bumper-harvest-composition="true"]');
      const source = stage.locator('[data-bumper-harvest-source="proven"]');
      const root = stage.locator('[data-bumper-harvest-root-action="BumperHarvest"]');
      const participants = stage.locator('[data-bumper-harvest-participants="proven"]');
      await expect(stage).toBeVisible();
      await expect(root).toBeVisible();
      await expect(participants).toBeVisible();
      return {
        source: await source.boundingBox(),
        root: await root.boundingBox(),
        participants: await participants.boundingBox(),
        branchCount: await stage.locator("[data-bumper-harvest-negation-node]").count(),
        branchPresent: await stage.locator("[data-bumper-harvest-negation-branch]").count() > 0,
        geometry: await stage.evaluate((element) => {
          const stageRect = element.getBoundingClientRect();
          const dockRect = document.querySelector(".local-player-dock")?.getBoundingClientRect();
          const stripRect = element.querySelector('[data-bumper-harvest-participants="proven"]')?.getBoundingClientRect();
          const track = element.querySelector(".bumper-harvest-participant-track");
          return {
            stageBottom: stageRect.bottom,
            dockTop: dockRect?.top ?? -Infinity,
            stripRight: stripRect?.right ?? Infinity,
            viewportWidth: window.innerWidth,
            trackClientWidth: track?.clientWidth ?? 0,
            trackScrollWidth: track?.scrollWidth ?? 0,
          };
        }),
      };
    };

    const open = await measure(null);
    expect(open.branchPresent).toBe(false);
    expect(open.branchCount).toBe(0);
    expect(open.source).not.toBeNull();
    expect(open.source.y + open.source.height).toBeLessThanOrEqual(open.root.y + 1);
    expect(open.root.y + open.root.height).toBeLessThanOrEqual(open.participants.y + 1);
    expect(open.geometry.stageBottom).toBeLessThanOrEqual(open.geometry.dockTop + 1);
    expect(open.geometry.stripRight).toBeLessThanOrEqual(viewport.width + 1);
    expect(open.geometry.trackScrollWidth).toBeGreaterThanOrEqual(open.geometry.trackClientWidth);

    for (const [history, expectedNodes] of [["single", 1], ["double", 2]]) {
      const submitted = await measure(history);
      expect(submitted.branchPresent).toBe(true);
      expect(submitted.branchCount).toBe(expectedNodes);
      for (const region of ["source", "root", "participants"]) {
        for (const edge of ["x", "y", "width", "height"]) {
          expect(Math.abs(submitted[region][edge] - open[region][edge]), `${history} ${region}.${edge}`).toBeLessThanOrEqual(1);
        }
      }
      const stage = page.locator('.interaction-stage[data-bumper-harvest-composition="true"]');
      await expect(stage.locator('[data-bumper-harvest-root-action="BumperHarvest"]')).toHaveAttribute("data-active-head", "false");
      await expect(stage.locator("[data-bumper-harvest-negation-node]").last()).toHaveAttribute("data-active-head", "true");
    }
  });
}

test("Bumper Harvest renders only the proven chooser strip and keeps open Negation private", async ({ page }) => {
  await loadBumperHarvest(page, { state: "bumper-harvest-open-local" });
  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  const participants = stage.locator('[data-bumper-harvest-participants="proven"]');
  const room = await page.evaluate(() => window.__browserRoom);

  await expect(stage).toHaveAttribute("data-bumper-harvest-composition", "true");
  await expect(stage.locator('[data-bumper-harvest-root-action="BumperHarvest"]')).toHaveAttribute("aria-label", "Bumper Harvest, active root action");
  expect(await participants.locator("[data-bumper-harvest-participant-id]").evaluateAll((nodes) => nodes.map((node) => node.dataset.bumperHarvestParticipantId))).toEqual(["p1", "p2", "p3", "p4"]);
  await expect(participants.locator('[data-bumper-harvest-participant-id="p1"]')).toHaveAttribute("data-participant-outcome", "CHOSE_CARD");
  await expect(participants.locator('[data-bumper-harvest-participant-id="p2"]')).toHaveAttribute("data-participant-status", "CURRENT");
  await expect(participants.locator('[data-bumper-harvest-participant-id="p3"]')).toHaveAttribute("data-participant-status", "PENDING");
  await expect(stage.locator(".hero-focus, .medium-participant-card, .interaction-stage-current-effect, [data-stage-event-summary], .reaction-chain, .group-target-scope")).toHaveCount(0);
  await expect(stage.locator("[data-decision-actor-id], [data-active-resolver-id]")).toHaveCount(0);
  await expect(stage).not.toContainText("Decision");
  await expect(stage).not.toContainText("Waiting for Player 3");
  expect(room.currentAction.actorId).toBe("p3", "the local viewer is privately responding");
  expect(room.pendingNegation.actorId).toBeNull();
  await expect(page.locator('.local-player-dock[data-player-anchor="p3"] .console-guidance .decision-status strong')).toHaveText("Play Negation or Skip.");
  await expect(page.locator('[data-hand-card-id="browser-bumper-harvest-private-negation"]')).toBeVisible();
  await expect(stage).not.toContainText("browser-bumper-harvest-private-negation");
  await expect(stage.locator("button")).toHaveCount(0);
});

test("choice, Negation return, and terminal progress keep one participant focus", async ({ page }) => {
  await loadBumperHarvest(page, { state: "bumper-harvest-choice" });
  let stage = page.locator('.interaction-stage[data-bumper-harvest-composition="true"]');
  await expect(stage).toHaveAttribute("data-stage", "SEQUENTIAL_CHOICE");
  await expect(stage.locator('[data-bumper-harvest-root-action="BumperHarvest"]')).toHaveAttribute("data-active-head", "true");
  await expect(stage.locator('[data-bumper-harvest-participant-id="p2"]')).toHaveAttribute("data-participant-status", "CURRENT");
  await expect(stage.locator(".hero-focus, .interaction-stage-current-effect, .reaction-chain")).toHaveCount(0);

  await loadBumperHarvest(page, { state: "bumper-harvest-returned" });
  stage = page.locator('.interaction-stage[data-bumper-harvest-composition="true"]');
  await expect(stage).toHaveAttribute("data-stage", "SEQUENTIAL_CHOICE");
  await expect(stage.locator('[data-bumper-harvest-root-action="BumperHarvest"]')).toHaveAttribute("data-active-head", "true");
  await expect(stage.locator('[data-bumper-harvest-participant-id="p2"]')).toHaveAttribute("data-participant-outcome", "NEGATED");
  await expect(stage.locator('[data-bumper-harvest-participant-id="p3"]')).toHaveAttribute("data-participant-status", "CURRENT");
  await expect(stage.locator("[data-bumper-harvest-negation-branch]")).toHaveCount(0);

  await loadBumperHarvest(page, { state: "bumper-harvest-complete" });
  stage = page.locator('.interaction-stage[data-bumper-harvest-composition="true"]');
  await expect(stage).toHaveAttribute("data-stable-kind", "SPECIAL");
  await expect(stage.locator('[data-bumper-harvest-root-action="BumperHarvest"]')).toHaveAttribute("data-active-head", "false");
  await expect(stage.locator('[data-bumper-harvest-participant-id="p3"]')).toHaveAttribute("data-participant-status", "NO_LONGER_APPLICABLE");
  await expect(stage.locator('[data-bumper-harvest-participant-id][data-participant-status="CURRENT"]')).toHaveCount(0);
});

test("Bumper Harvest source-viewer stays in the Dock while their participant marker remains compact", async ({ page }) => {
  await loadBumperHarvest(page, { state: "bumper-harvest-source-viewer" });
  const stage = page.locator('.interaction-stage[data-bumper-harvest-composition="true"]');
  const sourceMember = stage.locator('[data-bumper-harvest-participant-id="p1"]');
  await expect(stage.locator("[data-bumper-harvest-source]")).toHaveCount(0);
  await expect(sourceMember).toContainText("You");
  await expect(sourceMember.locator(".bumper-harvest-participant-portrait")).toHaveCount(0);
  await expect(page.locator('.local-player-dock[data-player-anchor="p1"]')).toBeVisible();
});

test("dense Bumper Harvest keeps every ordered participant scrollable and the current chooser visible", async ({ page }) => {
  await loadBumperHarvest(page, { width: 390, height: 844, state: "bumper-harvest-dense", count: 10 });
  const stage = page.locator('.interaction-stage[data-bumper-harvest-composition="true"]');
  const strip = stage.locator('[data-bumper-harvest-participants="proven"]');
  const ids = await strip.locator("[data-bumper-harvest-participant-id]").evaluateAll((nodes) => nodes.map((node) => node.dataset.bumperHarvestParticipantId));
  expect(ids).toEqual(Array.from({ length: 10 }, (_, index) => `p${index + 1}`));
  const geometry = await page.evaluate(() => {
    const stageElement = document.querySelector('.interaction-stage[data-bumper-harvest-composition="true"]');
    const dockElement = document.querySelector(".local-player-dock");
    const track = stageElement?.querySelector(".bumper-harvest-participant-track");
    const current = stageElement?.querySelector('[data-participant-status="CURRENT"]');
    if (!stageElement || !dockElement || !track || !current) return null;
    const stageRect = stageElement.getBoundingClientRect();
    const dockRect = dockElement.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const currentRect = current.getBoundingClientRect();
    return {
      stageBottom: stageRect.bottom,
      dockTop: dockRect.top,
      clientWidth: track.clientWidth,
      scrollWidth: track.scrollWidth,
      scrollLeft: track.scrollLeft,
      trackLeft: trackRect.left,
      trackRight: trackRect.right,
      currentLeft: currentRect.left,
      currentRight: currentRect.right,
    };
  });
  expect(geometry).not.toBeNull();
  expect(geometry.scrollWidth).toBeGreaterThan(geometry.clientWidth);
  expect(geometry.scrollLeft).toBeGreaterThan(0);
  expect(geometry.currentLeft).toBeGreaterThanOrEqual(geometry.trackLeft - 1);
  expect(geometry.currentRight).toBeLessThanOrEqual(geometry.trackRight + 1);
  expect(geometry.stageBottom).toBeLessThanOrEqual(geometry.dockTop + 1);
});

test("missing Bumper Harvest progress fails closed to the existing generic stage", async ({ page }) => {
  await loadBumperHarvest(page, { state: "bumper-harvest-unproven" });
  const stage = page.locator('.interaction-stage[data-stage="SEQUENTIAL_CHOICE"]');
  await expect(stage).not.toHaveAttribute("data-bumper-harvest-composition", "true");
  await expect(stage.locator("[data-bumper-harvest-root-action], [data-bumper-harvest-participants]")).toHaveCount(0);
  await expect(stage.locator(".hero-focus")).toBeVisible();
});
