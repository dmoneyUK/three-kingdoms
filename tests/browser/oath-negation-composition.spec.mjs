import { expect, test } from "@playwright/test";

async function loadOath(page, { width, height, state = "oath-negation", count = 4, history = null }) {
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
  test(`Oath recipient scope and root branch remain stable at ${viewport.width}x${viewport.height}`, async ({ page }) => {
    const measure = async (history) => {
      await loadOath(page, { ...viewport, history });
      const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
      const source = stage.locator('[data-oath-source="proven"]');
      const root = stage.locator('[data-oath-root-action="Oath"]');
      const scope = stage.locator('[data-oath-recipient-scope="proven"]');
      await expect(stage).toHaveAttribute("data-oath-composition", "true");
      await expect(root).toBeVisible();
      await expect(scope).toBeVisible();
      return {
        source: await source.count() > 0 ? await source.boundingBox() : null,
        root: await root.boundingBox(),
        scope: await scope.boundingBox(),
        branchCount: await stage.locator("[data-oath-negation-node]").count(),
        branchPresent: await stage.locator("[data-oath-negation-branch]").count() > 0,
        geometry: await stage.evaluate((element) => {
          const stageRect = element.getBoundingClientRect();
          const dockRect = document.querySelector(".local-player-dock")?.getBoundingClientRect();
          const scopeRect = element.querySelector("[data-oath-recipient-scope]")?.getBoundingClientRect();
          const track = element.querySelector(".oath-recipient-track");
          return {
            stageBottom: stageRect.bottom,
            dockTop: dockRect?.top ?? -Infinity,
            scopeRight: scopeRect?.right ?? Infinity,
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
    expect(open.root).not.toBeNull();
    expect(open.scope).not.toBeNull();
    expect(open.source).not.toBeNull();
    expect(open.source.y + open.source.height).toBeLessThanOrEqual(open.root.y + 1);
    expect(open.root.y + open.root.height).toBeLessThanOrEqual(open.scope.y + 1);
    expect(open.geometry.stageBottom).toBeLessThanOrEqual(open.geometry.dockTop + 1);
    expect(open.geometry.scopeRight).toBeLessThanOrEqual(viewport.width + 1);
    expect(open.geometry.trackScrollWidth).toBeGreaterThanOrEqual(open.geometry.trackClientWidth);

    for (const [history, expectedNodes] of [["single", 1], ["double", 2]]) {
      const submitted = await measure(history);
      expect(submitted.branchPresent).toBe(true);
      expect(submitted.branchCount).toBe(expectedNodes);
      expect(submitted.source).not.toBeNull();
      for (const region of ["root", "scope"]) {
        for (const edge of ["x", "y", "width", "height"]) {
          expect(Math.abs(submitted[region][edge] - open[region][edge]), `${history} ${region}.${edge}`).toBeLessThanOrEqual(1);
        }
      }
    }
  });
}

test("Oath composition uses only the proven recipients and keeps response identity and controls in the Dock", async ({ page }) => {
  await loadOath(page, { width: 390, height: 844 });
  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  const scope = stage.locator('[data-oath-recipient-scope="proven"]');
  const root = stage.locator('[data-oath-root-action="Oath"]');
  const recipients = scope.locator("[data-oath-recipient-id]");
  const publicRoom = await page.evaluate(() => window.__browserRoom);

  await expect(stage).toHaveAttribute("data-oath-composition", "true");
  await expect(root).toHaveAttribute("aria-label", "Oath of the Peach Garden, active root action");
  await expect(scope).toHaveAttribute("aria-label", "Oath Recipient Scope");
  expect(await recipients.evaluateAll((nodes) => nodes.map((node) => node.dataset.oathRecipientId))).toEqual(["p1", "p2"]);
  expect(publicRoom.presentationSnapshot.interaction.targetIds).toEqual(["p1"]);
  expect(publicRoom.presentationSnapshot.oathRecipientScope.recipientIds).toEqual(["p1", "p2"]);
  expect(publicRoom.players.map(({ id, hp, alive }) => ({ id, hp, alive })).slice(0, 4)).toEqual([
    { id: "p1", hp: 3, alive: true },
    { id: "p2", hp: 2, alive: true },
    { id: "p3", hp: 4, alive: true },
    { id: "p4", hp: 0, alive: false },
  ]);
  await expect(stage.locator(".hero-focus, .medium-participant-card, .interaction-stage-current-effect, [data-stage-event-summary], .reaction-chain, .group-target-scope")).toHaveCount(0);
  await expect(stage.locator("[data-group-composition], [data-group-source], [data-group-root-action]")).toHaveCount(0);
  await expect(stage.locator("[data-oath-source]")).toContainText("Player 1");
  await expect(stage.locator("[data-oath-source]")).not.toContainText("Cao Cao");
  await expect(stage.locator("[data-oath-recipient-id='p3'], [data-oath-recipient-id='p4']")).toHaveCount(0);
  await expect(stage.locator("button")).toHaveCount(0);
  await expect(page.locator(".local-player-dock")).toBeVisible();
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

test("the Oath source remains Dock-only when the viewer is the source", async ({ page }) => {
  await loadOath(page, { width: 390, height: 844, state: "oath-negation-source-viewer" });
  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  const sourceRecipient = stage.locator('[data-oath-recipient-id="p1"]');
  await expect(stage).toHaveAttribute("data-oath-composition", "true");
  await expect(stage.locator("[data-oath-source]")).toHaveCount(0);
  await expect(sourceRecipient).toContainText("You");
  await expect(sourceRecipient.locator(".oath-recipient-portrait")).toHaveCount(0);
  await expect(page.locator('.local-player-dock[data-player-anchor="p1"]')).toBeVisible();
});

test("compact Oath scope preserves and exposes every proven recipient in a ten-player mobile room", async ({ page }) => {
  await loadOath(page, { width: 390, height: 844, state: "oath-negation-dense", count: 10 });
  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  const scope = stage.locator('[data-oath-recipient-scope="proven"]');
  const track = scope.locator(".oath-recipient-track");
  const recipients = scope.locator("[data-oath-recipient-id]");

  await expect(stage).toHaveAttribute("data-oath-composition", "true");
  await expect(scope).toHaveAttribute("data-recipient-density", "compact");
  await expect(track).toBeVisible();
  expect(await recipients.evaluateAll((nodes) => nodes.map((node) => node.dataset.oathRecipientId))).toEqual([
    "p1", "p2", "p5", "p6", "p7", "p8", "p9", "p10",
  ]);
  const compactPortrait = await scope.locator(".oath-recipient-portrait").first().boundingBox();
  expect(compactPortrait.width).toBeLessThanOrEqual(20);
  expect(compactPortrait.height).toBeLessThanOrEqual(25);
  const room = await page.evaluate(() => window.__browserRoom);
  expect(room.presentationSnapshot.interaction.targetIds).toEqual(["p1"]);
  expect(room.presentationSnapshot.oathRecipientScope.recipientIds).toHaveLength(8);
  expect(room.players.find(({ id }) => id === "p3")).toMatchObject({ hp: 4, alive: true });
  expect(room.players.find(({ id }) => id === "p4")).toMatchObject({ hp: 0, alive: false });
  const geometry = await page.evaluate(() => {
    const stageElement = document.querySelector('.interaction-stage[data-oath-composition="true"]');
    const dockElement = document.querySelector(".local-player-dock");
    const scopeElement = stageElement?.querySelector('[data-oath-recipient-scope="proven"]');
    const trackElement = scopeElement?.querySelector(".oath-recipient-track");
    const finalRecipient = scopeElement?.querySelector('[data-oath-recipient-id="p10"]');
    if (!stageElement || !dockElement || !scopeElement || !trackElement || !finalRecipient) return null;
    const stageRect = stageElement.getBoundingClientRect();
    const dockRect = dockElement.getBoundingClientRect();
    const scopeRect = scopeElement.getBoundingClientRect();
    trackElement.scrollLeft = trackElement.scrollWidth;
    const trackRect = trackElement.getBoundingClientRect();
    const finalRect = finalRecipient.getBoundingClientRect();
    return {
      stageBottom: stageRect.bottom,
      dockTop: dockRect.top,
      scopeLeft: scopeRect.left,
      scopeRight: scopeRect.right,
      viewportWidth: window.innerWidth,
      trackLeft: trackRect.left,
      trackRight: trackRect.right,
      trackClientWidth: trackElement.clientWidth,
      trackScrollWidth: trackElement.scrollWidth,
      scrollLeft: trackElement.scrollLeft,
      finalLeft: finalRect.left,
      finalRight: finalRect.right,
    };
  });

  expect(geometry).not.toBeNull();
  expect(geometry.trackScrollWidth).toBeGreaterThan(geometry.trackClientWidth);
  expect(geometry.scrollLeft).toBeGreaterThan(0);
  expect(geometry.finalLeft).toBeGreaterThanOrEqual(geometry.trackLeft - 1);
  expect(geometry.finalRight).toBeLessThanOrEqual(geometry.trackRight + 1);
  expect(geometry.scopeLeft).toBeGreaterThanOrEqual(-1);
  expect(geometry.scopeRight).toBeLessThanOrEqual(geometry.viewportWidth + 1);
  expect(geometry.stageBottom).toBeLessThanOrEqual(geometry.dockTop + 1);
});

test("a missing Oath scope does not claim the specialized composition", async ({ page }) => {
  await loadOath(page, { width: 390, height: 844, state: "oath-negation-unproven" });
  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  await expect(stage).not.toHaveAttribute("data-oath-composition", "true");
  await expect(stage.locator("[data-oath-recipient-scope], [data-oath-root-action]")).toHaveCount(0);
});

test("an authorized Oath responder keeps Negation guidance and the physical card in the Local Dock", async ({ page }) => {
  await loadOath(page, { width: 390, height: 844, state: "oath-negation-local" });
  const stage = page.locator('.interaction-stage[data-stage="NEGATION"]');
  const dock = page.locator('.local-player-dock[data-player-anchor="p3"]');
  const guidance = dock.locator(".console-guidance .decision-status");
  const privateCardId = "browser-oath-private-negation";

  await expect(stage).toHaveAttribute("data-oath-composition", "true");
  await expect(stage).not.toContainText("Player 3");
  await expect(stage).not.toContainText(privateCardId);
  await expect(stage).not.toContainText("YOUR RESPONSE");
  await expect(stage.locator("button")).toHaveCount(0);
  await expect(dock).toBeVisible();
  await expect(guidance.locator("small")).toHaveText("YOUR RESPONSE");
  await expect(guidance.locator("strong")).toHaveText("Play Negation or Skip.");
  await expect(page.locator(`[data-hand-card-id="${privateCardId}"] .game-card`)).toBeVisible();
  expect(await page.evaluate(() => window.__browserRoom.currentAction.options[0].selection.eligibleCardIds)).toEqual([privateCardId]);
});
