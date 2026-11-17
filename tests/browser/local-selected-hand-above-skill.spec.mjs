import { expect, test } from "@playwright/test";

test("§10.63 selected Kirin Bow visually covers Cao Cao's overlapping Treachery Skill", async ({ browser }, testInfo) => {
  const context = await browser.newContext({
    viewport: { width: 440, height: 844 },
    screen: { width: 440, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto("/tests/browser/fixture.html?state=normal&count=4&handSize=11&handKind=KirinBow&hero=cao-cao&equipmentCase=localInspectPair");
    const rail = page.locator(".local-hand-rail");
    const selectedCard = rail.locator(".card-slot").nth(1).locator(".game-card");
    const skill = page.locator('.local-status-panel .hero-skill-button[aria-label="Treachery"]');
    await expect(selectedCard).toBeVisible();
    await expect(selectedCard).toHaveClass(/kirinbow/);
    await expect(skill).toBeVisible();
    await selectedCard.tap();
    await expect(selectedCard).toHaveAttribute("aria-pressed", "true");

    const overlap = await page.evaluate(() => {
      const card = document.querySelector(".local-hand-rail .card-slot.single-selected .game-card");
      const rail = document.querySelector(".local-hand-rail");
      const handSection = rail?.closest(".local-hand-section");
      const skillButton = document.querySelector('.local-status-panel .hero-skill-button[aria-label="Treachery"]');
      const equipmentButton = document.querySelector(".local-equipment-panel .local-zone-card-button");
      if (!card || !rail || !handSection || !skillButton || !equipmentButton) return null;
      const cardRect = card.getBoundingClientRect();
      const skillRect = skillButton.getBoundingClientRect();
      const rect = {
        left: Math.max(cardRect.left, skillRect.left),
        right: Math.min(cardRect.right, skillRect.right),
        top: Math.max(cardRect.top, skillRect.top),
        bottom: Math.min(cardRect.bottom, skillRect.bottom),
      };
      if (rect.right <= rect.left || rect.bottom <= rect.top) return { rect, hasOverlap: false };
      const point = { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 };
      const top = document.elementFromPoint(point.x, point.y);
      let uncoveredSkillPoint = null;
      for (let y = skillRect.top + 1; y < skillRect.bottom - 1 && !uncoveredSkillPoint; y += 2) {
        for (let x = skillRect.left + 1; x < skillRect.right - 1; x += 2) {
          if (x >= cardRect.left && x < cardRect.right && y >= cardRect.top && y < cardRect.bottom) continue;
          const target = document.elementFromPoint(x, y);
          if (target?.closest(".hero-skill-button") === skillButton) {
            uncoveredSkillPoint = { x, y };
            break;
          }
        }
      }
      const equipmentRect = equipmentButton.getBoundingClientRect();
      const equipmentPoint = { x: equipmentRect.left + equipmentRect.width / 2, y: equipmentRect.top + equipmentRect.height / 2 };
      const equipmentHit = document.elementFromPoint(equipmentPoint.x, equipmentPoint.y)?.closest(".local-zone-card-button") === equipmentButton;
      return {
        rect,
        hasOverlap: true,
        point,
        topIsSelectedCard: top?.closest(".game-card") === card,
        cardId: card.closest(".card-slot")?.getAttribute("data-hand-card-id"),
        rail: {
          zIndex: getComputedStyle(rail).zIndex,
          pointerEvents: getComputedStyle(rail).pointerEvents,
          overflowX: getComputedStyle(rail).overflowX,
          overflowY: getComputedStyle(rail).overflowY,
          touchAction: getComputedStyle(rail).touchAction,
        },
        handSectionZIndex: getComputedStyle(handSection).zIndex,
        cardSlotPointerEvents: getComputedStyle(card.closest(".card-slot")).pointerEvents,
        skillZIndex: getComputedStyle(skillButton).zIndex,
        uncoveredSkillPoint,
        equipmentHit,
      };
    });

    expect(overlap?.hasOverlap).toBe(true);
    expect(overlap?.rect.right - overlap?.rect.left).toBeGreaterThan(0);
    expect(overlap?.rect.bottom - overlap?.rect.top).toBeGreaterThan(0);
    expect(overlap?.topIsSelectedCard).toBe(true);
    expect(overlap?.cardId).toBe("browser-hand-2");
    expect(overlap?.rail).toEqual({ zIndex: "80", pointerEvents: "none", overflowX: "auto", overflowY: "hidden", touchAction: "pan-x" });
    expect(overlap?.handSectionZIndex).toBe("80");
    expect(overlap?.cardSlotPointerEvents).toBe("auto");
    expect(Number(overlap?.skillZIndex)).toBeLessThan(Number(overlap?.handSectionZIndex));
    expect(overlap?.uncoveredSkillPoint).not.toBeNull();
    expect(overlap?.equipmentHit).toBe(true);

    await testInfo.attach("selected-kirin-bow-over-treachery-crop", {
      body: await page.screenshot({ clip: {
        x: overlap.rect.left,
        y: overlap.rect.top,
        width: overlap.rect.right - overlap.rect.left,
        height: overlap.rect.bottom - overlap.rect.top,
      } }),
      contentType: "image/png",
    });

    await selectedCard.tap();
    await expect(selectedCard).toHaveAttribute("aria-pressed", "false");
    expect(await rail.evaluate((element) => getComputedStyle(element).zIndex)).toBe("60");
    expect(await rail.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("auto");
  } finally {
    await context.close();
  }
});
