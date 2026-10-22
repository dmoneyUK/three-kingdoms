import { expect, test } from "@playwright/test";

const viewports = [
  { width: 1440, height: 900 },
  { width: 480, height: 900 },
  { width: 390, height: 844 },
  { width: 320, height: 640 },
];

const implementedHeroIds = [
  "cao-cao", "simayi", "xiahou-dun", "zhang-liao", "xu-chu", "guo-jia", "zhen-ji", "yue-jin",
  "liu-bei", "guan-yu", "zhang-fei", "zhuge-liang", "zhao-yun", "sun-quan", "gan-ning", "lü-meng",
  "huang-gai", "zhou-yu", "daqiao", "lu-xun", "sun-shangxiang", "hua-tuo", "lü-bu", "diao-chan",
  "huaxiong", "gongsun-zan", "pan-feng", "ma-chao", "huang-yueying", "lady-gan",
];

const passiveSkillNamesByHero = {
  "zhang-fei": ["Battle Cry"],
  "zhuge-liang": ["Empty Fortress Strategem"],
  "ma-chao": ["Horse Riding"],
  "huang-yueying": ["Wizardry"],
  "sun-quan": ["Deliverance"],
  "lu-xun": ["Modesty"],
  "lü-bu": ["Unrivaled"],
  huaxiong: ["Triumphant"],
  "gongsun-zan": ["Militia"],
  "pan-feng": ["Axe of Insanity"],
};

test("implemented Hero skill bands fill their allocation and keep natural labels across the roster", async ({ page }) => {
  test.setTimeout(120_000);

  for (const heroId of implementedHeroIds) {
    await page.goto(`/tests/browser/fixture.html?state=rest&count=4&hero=${encodeURIComponent(heroId)}`);
    const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-status-panel .local-hero-skills');
    await expect(skills.locator(".hero-skill-button").first()).toBeVisible();

    for (const viewport of viewports) {
      await page.setViewportSize(viewport);
      const geometry = await skills.evaluate((element) => {
        const rect = (node) => {
          const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
          return { left, right, top, bottom, width, height };
        };
        const panel = element.closest(".local-status-panel");
        const panelRect = rect(panel);
        const panelStyle = getComputedStyle(panel);
        const availableWidth = panelRect.width
          - parseFloat(panelStyle.borderLeftWidth) - parseFloat(panelStyle.borderRightWidth)
          - parseFloat(panelStyle.paddingLeft) - parseFloat(panelStyle.paddingRight);
        const dock = element.closest(".local-player-dock");
        const zones = dock.querySelector(".local-dock-zones");
        const equipment = dock.querySelector(".local-equipment-panel");
        const equipmentStyle = getComputedStyle(equipment);
        const buttons = [...element.querySelectorAll(".hero-skill-button")].map((button) => {
          const bounds = rect(button);
          const labelRange = document.createRange();
          labelRange.selectNodeContents(button);
          const labelRects = [...labelRange.getClientRects()];
          const visibleTextNodes = [];
          const walker = document.createTreeWalker(button, NodeFilter.SHOW_TEXT);
          while (walker.nextNode()) {
            const textNode = walker.currentNode;
            if (!textNode.textContent.trim()) continue;
            let parent = textNode.parentElement;
            let visible = true;
            while (parent && parent !== button) {
              if (getComputedStyle(parent).display === "none" || parent.hidden) {
                visible = false;
                break;
              }
              parent = parent.parentElement;
            }
            if (visible) visibleTextNodes.push(textNode);
          }
          const wordFragments = visibleTextNodes.flatMap((textNode) => [...textNode.textContent.matchAll(/\S+/g)].map((match) => {
            const wordRange = document.createRange();
            wordRange.setStart(textNode, match.index);
            wordRange.setEnd(textNode, match.index + match[0].length);
            const wordRects = [...wordRange.getClientRects()].map((bounds) => ({ left: bounds.left, right: bounds.right }));
            return { word: match[0], rectCount: wordRects.length, rects: wordRects };
          }));
          const lineTops = [];
          for (const line of labelRects.sort((first, second) => first.top - second.top)) {
            if (lineTops.every((top) => Math.abs(top - line.top) > 2)) lineTops.push(line.top);
          }
          return {
            ...bounds,
            label: button.querySelector(".diao-chan-beauty-label")
              ? [...button.querySelectorAll(".diao-chan-beauty-label")].find((node) => getComputedStyle(node).display !== "none")?.textContent.trim().replace(/\s+/g, " ") ?? ""
              : button.textContent.trim(),
            labelLines: lineTops.length,
            wordFragments,
            role: button.getAttribute("role"),
            ariaLabel: button.getAttribute("aria-label"),
            scrollWidth: button.scrollWidth,
            clientWidth: button.clientWidth,
            scrollHeight: button.scrollHeight,
            clientHeight: button.clientHeight,
            disabled: button.disabled,
            ariaPressed: button.getAttribute("aria-pressed"),
            disabledOpacity: Number.parseFloat(getComputedStyle(button).opacity),
            cursor: getComputedStyle(button).cursor,
            hitTarget: document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)?.closest(".hero-skill-button") === button,
          };
        });
        const intersects = (first, second) => first.left < second.right && first.right > second.left && first.top < second.bottom && first.bottom > second.top;
        const exclusionSelectors = [".local-dock-identity", ".local-equipment-panel", ".local-hand-section", ".console-guidance", ".turn-controls"];
        const overlaps = buttons.flatMap((button) => exclusionSelectors.flatMap((selector) => {
          const other = dock.querySelector(selector);
          return other && intersects(button, rect(other)) ? [{ label: button.label, selector }] : [];
        }));
        return {
          skills: rect(element),
          status: rect(panel),
          zones: rect(zones),
          equipment: rect(equipment),
          equipmentVisible: equipmentStyle.display !== "none" && equipmentStyle.visibility !== "hidden",
          equipmentSlotCount: equipment.querySelectorAll(".local-equipment-slot").length,
          availableWidth,
          viewportWidth: window.innerWidth,
          documentWidth: document.documentElement.scrollWidth,
          overlaps,
          buttons,
        };
      });
      const context = JSON.stringify({ heroId, viewport, geometry });

      expect(geometry.documentWidth, context).toBeLessThanOrEqual(viewport.width);
      expect(Math.abs(geometry.skills.width - geometry.availableWidth), context).toBeLessThanOrEqual(1);
      expect(geometry.equipmentVisible, context).toBe(true);
      expect(geometry.equipmentSlotCount, context).toBe(4);
      expect(geometry.equipment.width, context).toBeGreaterThan(0);
      expect(geometry.equipment.height, context).toBeGreaterThan(0);
      expect(geometry.buttons.length, context).toBeGreaterThanOrEqual(1);
      expect(geometry.buttons.length, context).toBeLessThanOrEqual(2);
      expect(geometry.overlaps, context).toEqual([]);
      if (viewport.width <= 390 && viewport.height >= 700) {
        expect(geometry.equipment.top, context).toBeGreaterThanOrEqual(geometry.status.bottom - 1);
        expect(geometry.equipment.bottom, context).toBeLessThanOrEqual(geometry.zones.bottom + 1);
        expect(Math.abs(geometry.equipment.right - geometry.zones.right), context).toBeLessThanOrEqual(1);
      } else {
        expect(geometry.equipment.left, context).toBeGreaterThanOrEqual(geometry.status.right - 1);
        expect(geometry.equipment.top, context).toBeLessThan(geometry.status.bottom);
        expect(geometry.equipment.bottom, context).toBeGreaterThan(geometry.status.top);
      }
      if (geometry.buttons.length === 2) {
        expect(Math.abs(geometry.buttons[0].width - geometry.buttons[1].width), context).toBeLessThanOrEqual(1);
        expect(Math.abs(geometry.buttons[0].height - geometry.buttons[1].height), context).toBeLessThanOrEqual(1);
      }

      for (const button of geometry.buttons) {
        expect(button.width, context).toBeGreaterThanOrEqual(44);
        expect(button.height, context).toBeGreaterThanOrEqual(44);
        expect(button.height, context).toBeLessThanOrEqual(56);
        expect(button.left, context).toBeGreaterThanOrEqual(geometry.skills.left - 1);
        expect(button.right, context).toBeLessThanOrEqual(geometry.skills.right + 1);
        expect(button.label, context).not.toBe("");
        expect(button.labelLines, context).toBeLessThanOrEqual(2);
        expect(button.wordFragments.every(({ rectCount }) => rectCount === 1), context).toBe(true);
        expect(button.wordFragments.flatMap(({ rects }) => rects).every((word) => word.left >= button.left - 0.5 && word.right <= button.right + 0.5), context).toBe(true);
        expect(button.scrollWidth, context).toBeLessThanOrEqual(button.clientWidth + 2);
        expect(button.scrollHeight, context).toBeLessThanOrEqual(button.clientHeight + 1);
        if (passiveSkillNamesByHero[heroId]?.includes(button.label)) {
          expect(button.role, context).toBe("group");
          expect(button.ariaLabel, context).toBe(`${button.label}, passive skill`);
          expect(button.disabled, context).toBeUndefined();
          expect(button.ariaPressed, context).toBeNull();
          expect(button.disabledOpacity, context).toBe(1);
          expect(button.cursor, context).toBe("default");
          expect(button.hitTarget, context).toBe(true);
          continue;
        }
        expect(button.disabled, context).toBe(true);
        expect(button.ariaPressed, context).toBe("false");
        expect(button.disabledOpacity, context).toBeLessThan(1);
        expect(button.hitTarget, context).toBe(true);
        if (heroId === "cao-cao" && [390, 480].includes(viewport.width) && button.label === "Entourage") {
          expect(button.labelLines, context).toBe(1);
        }
      }
    }
  }
});

test("Diao Chan local skills have equal readable controls and a balanced Beauty label", async ({ page }, testInfo) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=rest&count=4&hero=diao-chan");

  const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-status-panel .local-hero-skills');
  const lust = skills.getByRole("button", { name: "Lust", exact: true });
  const beauty = skills.getByRole("button", { name: "Beauty Outshining the Moon", exact: true });
  await expect(lust).toBeVisible();
  await expect(beauty).toBeVisible();
  await expect(lust).toHaveAccessibleName("Lust");
  await expect(beauty).toHaveAccessibleName("Beauty Outshining the Moon");
  await expect(lust).toBeDisabled();
  await expect(beauty).toBeDisabled();
  await expect(lust).toHaveAttribute("aria-pressed", "false");
  await expect(beauty).toHaveAttribute("aria-pressed", "false");

  for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 320, height: 640 }, { width: 1440, height: 900 }]) {
    await page.setViewportSize(viewport);
    const geometry = await skills.evaluate((element) => {
      const rect = (node) => {
        const { left, right, top, bottom, width, height } = node.getBoundingClientRect();
        return { left, right, top, bottom, width, height };
      };
      const buttons = [...element.querySelectorAll(".hero-skill-button")].map((button) => {
        const bounds = rect(button);
        const style = getComputedStyle(button);
        const range = document.createRange();
        range.selectNodeContents(button);
        const labelRects = [...range.getClientRects()].filter((line) => line.width > 0 && line.height > 0);
        const lineTops = [];
        for (const line of labelRects.sort((first, second) => first.top - second.top)) {
          if (lineTops.every((top) => Math.abs(top - line.top) > 1)) lineTops.push(line.top);
        }
        return {
          ...bounds,
          label: button.querySelector(".diao-chan-beauty-label")
            ? [...button.querySelectorAll(".diao-chan-beauty-label")].find((node) => getComputedStyle(node).display !== "none")?.textContent.trim().replace(/\s+/g, " ") ?? ""
            : button.textContent.trim().replace(/\s+/g, " "),
          ariaLabel: button.getAttribute("aria-label"),
          lineCount: lineTops.length,
          lineCenters: labelRects.map((line) => line.left + line.width / 2),
          fontSize: Number.parseFloat(style.fontSize),
          lineHeight: Number.parseFloat(style.lineHeight),
          scrollWidth: button.scrollWidth,
          clientWidth: button.clientWidth,
          scrollHeight: button.scrollHeight,
          clientHeight: button.clientHeight,
          disabled: button.disabled,
          ariaPressed: button.getAttribute("aria-pressed"),
          centerHitTarget: document.elementFromPoint(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2)?.closest(".hero-skill-button") === button,
        };
      });
      const dock = element.closest(".local-player-dock");
      const excludedRects = [".local-hero-anchor", ".local-equipment-panel", ".local-hand-section", ".turn-controls"]
        .map((selector) => ({ selector, bounds: rect(dock.querySelector(selector)) }));
      const overlaps = buttons.flatMap((button) => excludedRects.filter(({ bounds }) =>
        button.left < bounds.right && button.right > bounds.left && button.top < bounds.bottom && button.bottom > bounds.top)
        .map(({ selector }) => ({ label: button.label, selector })));
      return {
        skills: rect(element),
        hand: rect(dock.querySelector(".local-hand-section")),
        actions: rect(dock.querySelector(".turn-controls")),
        documentWidth: document.documentElement.scrollWidth,
        overlaps,
        buttons,
      };
    });
    const context = JSON.stringify({ viewport, geometry });
    const [lustBox, beautyBox] = geometry.buttons;
    expect(geometry.buttons.map(({ ariaLabel }) => ariaLabel), context).toEqual(["Lust", "Beauty Outshining the Moon"]);
    expect(Math.abs(lustBox.width - beautyBox.width), context).toBeLessThanOrEqual(1);
    expect(Math.abs(lustBox.height - beautyBox.height), context).toBeLessThanOrEqual(1);
    for (const button of geometry.buttons) {
      expect(button.width, context).toBeGreaterThanOrEqual(44);
      expect(button.height, context).toBeGreaterThanOrEqual(44);
      expect(button.lineCenters.every((center) => Math.abs(center - (button.left + button.width / 2)) <= 2), context).toBe(true);
      expect(button.scrollWidth, context).toBeLessThanOrEqual(button.clientWidth + 1);
      expect(button.scrollHeight, context).toBeLessThanOrEqual(button.clientHeight + 1);
      expect(button.centerHitTarget, context).toBe(true);
    }
    expect(lustBox.label).toBe("Lust");
    expect(lustBox.lineCount).toBe(1);
    expect(beautyBox.label).toBe("Beauty Outshining the Moon");
    expect(beautyBox.lineCount, context).toBeLessThanOrEqual(2);
    expect(geometry.overlaps, context).toEqual([]);
    expect(geometry.documentWidth, context).toBeLessThanOrEqual(viewport.width);
    if (viewport.width === 390) {
      expect(geometry.buttons.every(({ fontSize }) => fontSize >= 11.5), context).toBe(true);
      expect(beautyBox.lineCount, context).toBe(2);
      await testInfo.attach("diao-chan-skill-buttons-390x844.png", { body: await page.screenshot(), contentType: "image/png" });
    }
  }
});

test("passive-only Hero skill tiles never submit an action", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });

  for (const [heroId, skillNames] of Object.entries(passiveSkillNamesByHero)) {
    await page.goto(`/tests/browser/fixture.html?state=rest&count=4&hero=${encodeURIComponent(heroId)}`);
    const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-status-panel .local-hero-skills');
    for (const skillName of skillNames) {
      const passive = skills.getByRole("group", { name: `${skillName}, passive skill` });
      await expect(passive).toBeVisible();
      await expect(skills.getByRole("button", { name: skillName, exact: true })).toHaveCount(0);
      await page.evaluate(() => { window.__browserActions = []; });
      await passive.click();
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
    }
  }
});

test("Zhuge Liang skill labels stay readable within two lines at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.goto("/tests/browser/fixture.html?state=rest&count=4&hero=zhuge-liang");

  const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-status-panel .local-hero-skills');
  const stargazing = skills.locator(".hero-skill-button").nth(0);
  const emptyFortress = skills.locator(".hero-skill-button").nth(1);
  const lineCount = (button) => button.evaluate((element) => {
    const range = document.createRange();
    range.selectNodeContents(element);
    const lineTops = [...new Set([...range.getClientRects()]
      .filter((rect) => rect.width > 0 && rect.height > 0)
      .map((rect) => Math.round(rect.top * 2) / 2))];
    return lineTops.length;
  });

  await expect(stargazing).toHaveText("Stargazing");
  await expect(emptyFortress).toHaveText("Empty Fortress Strategem");
  expect(await lineCount(stargazing)).toBe(1);
  expect(await lineCount(emptyFortress)).toBeLessThanOrEqual(2);

  const [stargazingBox, emptyFortressBox, documentWidth] = await Promise.all([
    stargazing.boundingBox(),
    emptyFortress.boundingBox(),
    page.evaluate(() => document.documentElement.scrollWidth),
  ]);
  expect(stargazingBox && emptyFortressBox).toBeTruthy();
  expect(Math.abs(stargazingBox.width - emptyFortressBox.width)).toBeLessThanOrEqual(1);
  expect(Math.abs(stargazingBox.height - emptyFortressBox.height)).toBeLessThanOrEqual(1);
  expect(stargazingBox.width).toBeGreaterThanOrEqual(44);
  expect(stargazingBox.height).toBeGreaterThanOrEqual(44);
  expect(documentWidth).toBeLessThanOrEqual(320);
});

for (const width of [390, 1440]) {
  test(`Projected Ma Chao Cavalry activates from the Skills band at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/tests/browser/fixture.html?state=ma-chao-cavalry&count=4&hero=ma-chao");

    const skills = page.locator('.local-player-dock[data-player-anchor="p1"] .local-status-panel .local-hero-skills');
    const horseRiding = skills.getByRole("group", { name: "Horse Riding, passive skill" });
    const cavalry = skills.getByRole("button", { name: "Cavalry", exact: true });
    await expect(horseRiding).toBeVisible();
    await expect(cavalry).toBeEnabled();
    await expect(page.locator('[data-action-extras="true"]')).not.toContainText("Cavalry");

    await page.evaluate(() => { window.__browserActions = []; });
    await horseRiding.click();
    expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
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
  await expect(skills.getByRole("group", { name: "Horse Riding, passive skill" })).toBeVisible();
  await expect(skills.getByRole("button", { name: "Cavalry", exact: true })).toBeDisabled();
  await expect(page.locator('[data-action-extras="true"]')).not.toContainText("Cavalry");
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});
