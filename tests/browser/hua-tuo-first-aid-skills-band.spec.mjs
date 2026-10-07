import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 640 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

test("Hua Tuo First Aid selects only the authoritative card from the Local Skills band", async ({ page }) => {
  for (const viewport of viewports) {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=hua-tuo-first-aid&count=4&hero=hua-tuo");

    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const skills = dock.locator(".local-hero-skills");
    const firstAid = skills.getByRole("button", { name: "First Aid", exact: true });
    const peach = page.locator('[data-hand-card-id="browser-first-aid-peach"] .game-card');
    const eligible = page.locator('[data-hand-card-id="browser-first-aid-red"] .game-card');
    const ineligible = page.locator('[data-hand-card-id="browser-first-aid-black"] .game-card');

    await expect(firstAid).toBeEnabled();
    await expect(firstAid).toHaveAttribute("aria-pressed", "false");
    await expect(dock.locator('[data-console-surface="local-operation"] [data-action-slot] button')).toHaveText(["Peach", "Skip"]);
    await expect(dock.locator('[data-action-slot="decline"] button')).toBeEnabled();
    await expect(dock.locator('[data-action-extras="true"]')).not.toContainText("First Aid");

    const geometry = await firstAid.evaluate((button) => {
      const box = (element) => {
        const { left, right, top, bottom, width, height } = element.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const skillsBox = box(button.closest(".local-hero-skills"));
      const dockBox = box(button.closest(".local-player-dock"));
      const stage = document.querySelector(".interaction-stage");
      const stageBox = stage ? box(stage) : null;
      const overlapWidth = stageBox ? Math.max(0, Math.min(stageBox.right, dockBox.right) - Math.max(stageBox.left, dockBox.left)) : 0;
      const overlapHeight = stageBox ? Math.max(0, Math.min(stageBox.bottom, dockBox.bottom) - Math.max(stageBox.top, dockBox.top)) : 0;
      const buttonBox = box(button);
      return {
        button: buttonBox,
        skills: skillsBox,
        dock: dockBox,
        stageDockOverlapArea: overlapWidth * overlapHeight,
        documentWidth: document.documentElement.scrollWidth,
        viewportWidth: window.innerWidth,
        hitTarget: document.elementFromPoint(buttonBox.left + buttonBox.width / 2, buttonBox.top + buttonBox.height / 2)?.closest("button") === button,
      };
    });
    const context = JSON.stringify({ viewport, geometry });
    expect(geometry.documentWidth, context).toBeLessThanOrEqual(viewport.width);
    expect(geometry.button.width, context).toBeGreaterThanOrEqual(44);
    expect(geometry.button.height, context).toBeGreaterThanOrEqual(44);
    expect(geometry.button.left, context).toBeGreaterThanOrEqual(geometry.skills.left - 1);
    expect(geometry.button.right, context).toBeLessThanOrEqual(geometry.skills.right + 1);
    expect(geometry.button.top, context).toBeGreaterThanOrEqual(geometry.dock.top - 1);
    expect(geometry.button.bottom, context).toBeLessThanOrEqual(geometry.dock.bottom + 1);
    expect(geometry.stageDockOverlapArea, context).toBe(0);
    expect(geometry.hitTarget, context).toBe(true);

    await expect(eligible).toBeDisabled();
    await expect(ineligible).toBeDisabled();
    await expect(peach).toBeEnabled();
    await firstAid.click();
    await expect(firstAid).toHaveAttribute("aria-pressed", "true");
    await expect(eligible).toBeEnabled();
    await expect(ineligible).toBeDisabled();
    await expect(peach).toBeDisabled();
    await expect(dock.locator('[data-action-slot="decline"] button')).toHaveText("Skip");
    await expect(dock.locator('[data-action-extras="true"]')).not.toContainText("First Aid");

    await eligible.click();
    const confirm = dock.locator('[data-action-slot="primary"] button');
    await expect(confirm).toHaveText("Confirm");
    await expect(confirm).toBeEnabled();
    await confirm.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions.at(-1))).toEqual({
      action: "respond",
      extra: { providerId: "hua_tuo_first_aid", cardId: "browser-first-aid-red" },
    });
  }
});

test("Hua Tuo First Aid fails closed without the viewer's legal response option", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const state of ["hua-tuo-first-aid-no-option", "hua-tuo-first-aid-no-respond", "hua-tuo-first-aid-observer"]) {
    await page.goto(`/tests/browser/fixture.html?state=${state}&count=4&hero=hua-tuo`);
    const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
    const firstAid = dock.locator(".local-hero-skills").getByRole("button", { name: "First Aid", exact: true });

    await expect(firstAid).toBeDisabled();
    await expect(dock.locator('[data-action-extras="true"]')).not.toContainText("First Aid");
    await expect(page.locator("body")).not.toContainText("hua_tuo_first_aid");
    const providerIdExposed = await page.evaluate(() => Array.from(document.querySelectorAll("*"))
      .some((element) => Array.from(element.attributes).some((attribute) => attribute.value.includes("hua_tuo_first_aid"))));
    expect(providerIdExposed).toBe(false);
    await expect(dock.locator('[data-action-slot="primary"] button', { hasText: "Confirm" })).toHaveCount(0);
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);

    if (state === "hua-tuo-first-aid-observer") {
      await expect(dock.locator('[data-console-surface="local-operation"] [data-action-slot] button')).toHaveCount(0);
    }
  }
});

test("Hua Tuo rescue keeps Peach and Skip available beside the First Aid skill", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=hua-tuo-first-aid&count=4&hero=hua-tuo");
  const dock = page.locator('.local-player-dock[data-player-anchor="p1"]');
  const peach = page.locator('[data-hand-card-id="browser-first-aid-peach"] .game-card');

  await peach.click();
  const givePeach = dock.locator('[data-action-slot="primary"] button');
  await expect(givePeach).toHaveText("Peach");
  await expect(givePeach).toBeEnabled();
  await givePeach.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.at(-1))).toEqual({
    action: "give_peach",
    extra: { cardId: "browser-first-aid-peach" },
  });

  await page.goto("/tests/browser/fixture.html?state=hua-tuo-first-aid&count=4&hero=hua-tuo");
  const skip = page.locator('.local-player-dock[data-player-anchor="p1"] [data-action-slot="decline"] button');
  await expect(skip).toHaveText("Skip");
  await expect(skip).toBeEnabled();
  await skip.click();
  await expect.poll(() => page.evaluate(() => window.__browserActions.at(-1)?.action)).toBe("skip_rescue");
});
