import { expect, test } from "@playwright/test";

const viewports = [
  { width: 320, height: 640 },
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];

for (const viewport of viewports) {
  test(`Local Hero peer skills keep equal, readable hit areas at ${viewport.width}px`, async ({ page }) => {
    await page.setViewportSize(viewport);
    await page.goto("/tests/browser/fixture.html?state=rest&count=4&hero=zhou-yu");

    const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-status-panel .local-hero-skills');
    const buttons = skills.locator(".hero-skill-button");
    await expect(buttons).toHaveText(["Heroic", "Sowing Distrust"]);

    const geometry = await skills.evaluate((element) => {
      const rect = (node) => {
        const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      return {
        skills: rect(element),
        viewportWidth: window.innerWidth,
        documentWidth: document.documentElement.scrollWidth,
        buttons: [...element.querySelectorAll(".hero-skill-button")].map((button) => {
          const bounds = rect(button);
          const range = document.createRange();
          range.selectNodeContents(button);
          return {
            ...bounds,
            label: button.textContent,
            labelLines: range.getClientRects().length,
            scrollWidth: button.scrollWidth,
            clientWidth: button.clientWidth,
            scrollHeight: button.scrollHeight,
            clientHeight: button.clientHeight,
            disabled: button.disabled,
            ariaPressed: button.getAttribute("aria-pressed"),
            disabledOpacity: Number.parseFloat(getComputedStyle(button).opacity),
            hitTarget: document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)?.closest(".hero-skill-button") === button,
          };
        }),
      };
    });

    expect(geometry.documentWidth, JSON.stringify({ viewport, geometry })).toBeLessThanOrEqual(viewport.width);
    expect(geometry.buttons).toHaveLength(2);
    expect(Math.abs(geometry.buttons[0].width - geometry.buttons[1].width), JSON.stringify({ viewport, geometry })).toBeLessThanOrEqual(1);

    for (const button of geometry.buttons) {
      expect(button.width, JSON.stringify({ viewport, button })).toBeGreaterThanOrEqual(44);
      expect(button.height, JSON.stringify({ viewport, button })).toBeGreaterThanOrEqual(44);
      expect(button.height, JSON.stringify({ viewport, button })).toBeLessThanOrEqual(56);
      expect(button.left, JSON.stringify({ viewport, button, skills: geometry.skills })).toBeGreaterThanOrEqual(geometry.skills.left - 1);
      expect(button.right, JSON.stringify({ viewport, button, skills: geometry.skills })).toBeLessThanOrEqual(geometry.skills.right + 1);
      expect(button.top, JSON.stringify({ viewport, button, skills: geometry.skills })).toBeGreaterThanOrEqual(geometry.skills.top - 1);
      expect(button.bottom, JSON.stringify({ viewport, button, skills: geometry.skills })).toBeLessThanOrEqual(geometry.skills.bottom + 1);
      expect(button.labelLines, JSON.stringify({ viewport, button })).toBeLessThanOrEqual(2);
      expect(button.scrollWidth, JSON.stringify({ viewport, button })).toBeLessThanOrEqual(button.clientWidth + 1);
      expect(button.scrollHeight, JSON.stringify({ viewport, button })).toBeLessThanOrEqual(button.clientHeight + 1);
      expect(button.disabled).toBe(true);
      expect(button.ariaPressed).toBe("false");
      expect(button.disabledOpacity).toBeLessThan(1);
      expect(button.hitTarget).toBe(true);
    }
  });
}

for (const width of [390, 1440]) {
  test(`Projected Ma Chao Cavalry activates from the Skills band at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tests/browser/fixture.html?state=ma-chao-cavalry&count=4&hero=ma-chao");

    const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-status-panel .local-hero-skills');
    const horseRiding = skills.getByRole("button", { name: "Horse Riding", exact: true });
    const cavalry = skills.getByRole("button", { name: "Cavalry", exact: true });
    await expect(horseRiding).toBeDisabled();
    await expect(cavalry).toBeEnabled();
    await expect(page.locator('[data-action-extras="true"]')).not.toContainText("Cavalry");

    await page.evaluate(() => { window.__browserActions = []; });
    await cavalry.click();
    await expect.poll(() => page.evaluate(() => window.__browserActions)).toEqual([
      { action: "trigger", extra: { providerId: "ma_chao_cavalry" } },
    ]);
  });
}

test("Ma Chao passive and optional skill stay unavailable without a projected CurrentAction option", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=rest&count=4&hero=ma-chao");

  const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-status-panel .local-hero-skills');
  await expect(skills.getByRole("button", { name: "Horse Riding", exact: true })).toBeDisabled();
  await expect(skills.getByRole("button", { name: "Cavalry", exact: true })).toBeDisabled();
  await expect(page.locator('[data-action-extras="true"]')).not.toContainText("Cavalry");
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});
