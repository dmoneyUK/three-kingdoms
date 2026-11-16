import { expect, test } from "@playwright/test";

const viewports = [
  { width: 390, height: 844 },
  { width: 414, height: 896 },
  { width: 480, height: 900 },
];

async function loadDock(page, viewport, handSize) {
  await page.setViewportSize(viewport);
  await page.goto(`/tests/browser/fixture.html?state=normal&count=4&handSize=${handSize}&equipmentCase=multiple`);
  await page.locator(".local-player-dock").waitFor();
}

function overlaps(first, second) {
  return first.x < second.x + second.width
    && first.x + first.width > second.x
    && first.y < second.y + second.height
    && first.y + first.height > second.y;
}

for (const viewport of viewports) {
  test(`Local Hero hierarchy preserves a usable ${viewport.width}px Dock with five cards`, async ({ page }) => {
    await loadDock(page, viewport, 5);

    const geometry = await page.evaluate(() => {
      const rect = (selector) => {
        const element = document.querySelector(selector);
        if (!element) return null;
        const { x, y, width, height } = element.getBoundingClientRect();
        return { x, y, width, height };
      };
      const rail = document.querySelector(".local-hand-rail");
      const cards = [...document.querySelectorAll(".local-hand-rail .card-slot")];
      return {
        dock: rect(".local-player-dock"),
        identity: rect(".local-dock-identity"),
        hero: rect(".local-hero-card"),
        zones: rect(".local-dock-zones"),
        status: rect(".local-status-panel"),
        equipment: rect(".local-equipment-panel"),
        slots: [...document.querySelectorAll(".local-equipment-slot")].map((slot) => {
          const { x, y, width, height } = slot.getBoundingClientRect();
          return { x, y, width, height };
        }),
        skills: [...document.querySelectorAll(".local-status-panel .hero-skill-button")].map((button) => {
          const { x, y, width, height } = button.getBoundingClientRect();
          return { x, y, width, height };
        }),
        guidance: rect(".local-player-dock .console-guidance"),
        actions: rect(".local-player-dock .turn-controls"),
        rail: rect(".local-hand-rail"),
        railOverflow: rail?.dataset.handOverflow,
        cardScrollWidth: rail?.scrollWidth,
        cardClientWidth: rail?.clientWidth,
        cards: cards.map((card) => {
          const { x, y, width, height } = card.getBoundingClientRect();
          return { x, y, width, height };
        }),
      };
    });

    expect(geometry.hero.width).toBeCloseTo(88, 0);
    expect(geometry.hero.height).toBeCloseTo(132, 0);
    expect(geometry.hero.x).toBeGreaterThanOrEqual(geometry.identity.x);
    expect(geometry.hero.x + geometry.hero.width).toBeLessThanOrEqual(geometry.identity.x + geometry.identity.width + 1);
    expect(geometry.hero.y).toBeGreaterThanOrEqual(geometry.identity.y);
    expect(geometry.hero.y + geometry.hero.height).toBeLessThanOrEqual(geometry.identity.y + geometry.identity.height + 1);
    expect(geometry.zones.x).toBeGreaterThanOrEqual(geometry.identity.x + geometry.identity.width);
    expect(geometry.cards).toHaveLength(5);
    expect(geometry.railOverflow).toBe("false");
    expect(geometry.cardScrollWidth).toBeLessThanOrEqual(geometry.cardClientWidth + 1);
    expect(geometry.cards.every((card) => Math.abs(card.width - 68) < 0.5)).toBe(true);
    expect(geometry.cards.every((card) => Math.abs(card.y - geometry.cards[0].y) < 0.5)).toBe(true);
    expect(geometry.cards.every((card) => !overlaps(geometry.hero, card))).toBe(true);

    expect(geometry.skills.length).toBeGreaterThan(0);
    expect(geometry.skills.every((skill) => skill.height >= 44)).toBe(true);
    expect(geometry.skills.every((skill) => skill.x >= geometry.status.x - 1 && skill.x + skill.width <= geometry.status.x + geometry.status.width + 1)).toBe(true);
    expect(geometry.slots).toHaveLength(4);
    expect(geometry.slots.every((slot) => slot.width > 0 && slot.height > 0)).toBe(true);
    expect(geometry.slots.every((slot) => slot.x >= geometry.equipment.x - 1 && slot.x + slot.width <= geometry.equipment.x + geometry.equipment.width + 1)).toBe(true);
    expect(geometry.guidance.x).toBeCloseTo(geometry.dock.x, 0);
    expect(geometry.guidance.width).toBeCloseTo(geometry.dock.width, 0);
    expect(geometry.actions.x).toBeCloseTo(geometry.dock.x, 0);
    expect(geometry.actions.width).toBeCloseTo(geometry.dock.width, 0);
    expect(geometry.actions.y + geometry.actions.height).toBeLessThanOrEqual(geometry.dock.y + geometry.dock.height + 1);
  });

  test(`Local Hero hierarchy keeps a 25-card Hand pannable at ${viewport.width}px`, async ({ page }) => {
    await loadDock(page, viewport, 25);
    const rail = page.locator(".local-hand-rail");
    const cardSlots = rail.locator(".card-slot");
    const lastCard = cardSlots.last();

    await expect(cardSlots).toHaveCount(25);
    await expect(rail).toHaveAttribute("data-hand-overflow", "true");
    const initial = await rail.evaluate((element) => ({
      clientWidth: element.clientWidth,
      scrollWidth: element.scrollWidth,
      cards: [...element.querySelectorAll(".card-slot")].map((card) => {
        const { x, y, width } = card.getBoundingClientRect();
        return { x, y, width };
      }),
    }));
    expect(initial.scrollWidth).toBeGreaterThan(initial.clientWidth);
    expect(initial.cards.every((card) => Math.abs(card.width - 68) < 0.5)).toBe(true);
    expect(initial.cards.every((card) => Math.abs(card.y - initial.cards[0].y) < 0.5)).toBe(true);
    expect(initial.cards.slice(1).every((card, index) => card.x - initial.cards[index].x >= 30)).toBe(true);

    await rail.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
    const [railBox, lastCardBox] = await Promise.all([rail.boundingBox(), lastCard.boundingBox()]);
    expect(railBox).not.toBeNull();
    expect(lastCardBox).not.toBeNull();
    expect(lastCardBox.x).toBeGreaterThanOrEqual(railBox.x - 1);
    expect(lastCardBox.x + lastCardBox.width).toBeLessThanOrEqual(railBox.x + railBox.width + 1);
  });
}

test("§10.60 Step 3 440px phone Hand swipes to the last card and taps it without acting during scroll", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 440, height: 844 },
    screen: { width: 440, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:4177/tests/browser/fixture.html?state=normal&count=4&handSize=11&equipmentCase=localInspectPair");
    const rail = page.locator(".local-hand-rail");
    await expect(rail.locator(".card-slot")).toHaveCount(11);
    await expect(rail).toHaveAttribute("data-hand-overflow", "true");

    const [railBox, firstCardBox, before] = await Promise.all([
      rail.boundingBox(),
      rail.locator(".card-slot").first().boundingBox(),
      rail.evaluate((element) => ({
        scrollLeft: element.scrollLeft,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        selected: [...element.querySelectorAll(".game-card")].some((card) => card.getAttribute("aria-pressed") === "true"),
      })),
    ]);
    expect(railBox).not.toBeNull();
    expect(firstCardBox).not.toBeNull();
    expect(before.scrollWidth).toBeGreaterThan(before.clientWidth);
    expect(await rail.evaluate((element) => getComputedStyle(element).touchAction)).toBe("pan-x");
    expect(await rail.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("auto");
    expect(await rail.locator(".game-card").first().evaluate((element) => getComputedStyle(element).touchAction)).toBe("pan-x");
    const skillHit = await page.evaluate(() => {
      const skill = document.querySelector(".local-status-panel .hero-skill-button");
      if (!skill) return null;
      const rect = skill.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)?.closest(".hero-skill-button") !== null;
    });
    expect(skillHit).toBe(true);
    const equipmentButton = page.locator(".local-equipment-panel .local-zone-card-button").first();
    await expect(equipmentButton).toBeVisible();
    const equipmentHit = await equipmentButton.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === button;
    });
    expect(equipmentHit).toBe(true);

    const point = { x: firstCardBox.x + 20, y: firstCardBox.y + Math.min(20, firstCardBox.height / 2) };
    const hit = await page.evaluate(({ x, y }) => {
      const target = document.elementFromPoint(x, y);
      return {
        tag: target?.tagName ?? null,
        cardId: target?.closest(".card-slot")?.getAttribute("data-hand-card-id") ?? null,
      };
    }, point);
    expect(hit.cardId).toBe("browser-hand-1");

    const session = await context.newCDPSession(page);
    const swipe = async (start, distance) => {
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, ...start }] });
      for (const progress of [0.25, 0.5, 0.75, 1]) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ id: 1, x: start.x - distance * progress, y: start.y }],
        });
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    };
    try {
      await swipe(point, 100);
      await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(before.scrollLeft);
      await expect.poll(() => rail.evaluate((element) => [...element.querySelectorAll(".game-card")]
        .some((card) => card.getAttribute("aria-pressed") === "true"))).toBe(false);

      for (let attempt = 0; attempt < 5; attempt++) {
        const progress = await rail.evaluate((element) => ({ left: element.scrollLeft, max: element.scrollWidth - element.clientWidth }));
        if (progress.left >= progress.max - 1) break;
        const currentRailBox = await rail.boundingBox();
        const start = { x: currentRailBox.x + currentRailBox.width - 18, y: firstCardBox.y + Math.min(20, firstCardBox.height / 2) };
        const currentHit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest(".card-slot")?.getAttribute("data-hand-card-id") ?? null, start);
        expect(currentHit, "A visible Hand card must receive each real swipe start").toBeTruthy();
        await swipe(start, Math.min(90, currentRailBox.width / 3));
        await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(progress.left);
        await expect.poll(() => rail.evaluate((element) => [...element.querySelectorAll(".game-card")]
          .some((card) => card.getAttribute("aria-pressed") === "true"))).toBe(false);
      }
    } finally {
      await session.detach();
    }

    const lastCard = rail.locator(".card-slot").last();
    const lastCardId = await lastCard.getAttribute("data-hand-card-id");
    const lastCardBox = await lastCard.boundingBox();
    const finalRailBox = await rail.boundingBox();
    const finalScroll = await rail.evaluate((element) => ({ left: element.scrollLeft, max: element.scrollWidth - element.clientWidth }));
    expect(finalScroll.left).toBeGreaterThanOrEqual(finalScroll.max - 1);
    expect(lastCardBox.x).toBeGreaterThanOrEqual(finalRailBox.x - 1);
    expect(lastCardBox.x + lastCardBox.width).toBeLessThanOrEqual(finalRailBox.x + finalRailBox.width + 1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(440);

    await lastCard.locator(".game-card").tap();
    await expect(lastCard.locator(".game-card")).toHaveAttribute("aria-pressed", "true");
    expect(await lastCard.getAttribute("data-hand-card-id")).toBe(lastCardId);
    expect(await rail.locator('.game-card[aria-pressed="true"]').count()).toBe(1);
    expect(await rail.locator('.card-slot[data-card-selected="true"]').getAttribute("data-hand-card-id")).toBe(lastCardId);
    await equipmentButton.click();
    await expect(page.locator(".card-details-close")).toBeVisible();
  } finally {
    await context.close();
  }
});

test("§10.63 440px phone selected Hand card wins overlap without blocking uncovered skill targets", async ({ browser }) => {
  const context = await browser.newContext({
    viewport: { width: 440, height: 844 },
    screen: { width: 440, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  try {
    await page.goto("http://127.0.0.1:4177/tests/browser/fixture.html?state=normal&count=4&handSize=11&hero=liu-bei&equipmentCase=localInspectPair");
    const rail = page.locator(".local-hand-rail");
    const selectedSlot = rail.locator(".card-slot").nth(1);
    const selectedCard = selectedSlot.locator(".game-card");
    const skill = page.locator(".local-status-panel .hero-skill-button").filter({ hasText: /Influencing/i });
    await expect(selectedCard).toBeVisible();
    await expect(skill).toBeVisible();
    await selectedCard.tap();
    await expect(selectedCard).toHaveAttribute("aria-pressed", "true");

    const overlap = await page.evaluate(() => {
      const card = document.querySelector(".local-hand-rail .card-slot.single-selected .game-card");
      const skillButton = [...document.querySelectorAll(".local-status-panel .hero-skill-button")]
        .find((button) => /Influencing/i.test(button.textContent ?? ""));
      if (!card || !skillButton) return null;
      const cardRect = card.getBoundingClientRect();
      const skillRect = skillButton.getBoundingClientRect();
      const rect = {
        left: Math.max(cardRect.left, skillRect.left),
        right: Math.min(cardRect.right, skillRect.right),
        top: Math.max(cardRect.top, skillRect.top),
        bottom: Math.min(cardRect.bottom, skillRect.bottom),
      };
      if (rect.right <= rect.left || rect.bottom <= rect.top) return { cardRect: cardRect.toJSON(), skillRect: skillRect.toJSON(), rect, hasOverlap: false };
      const point = { x: (rect.left + rect.right) / 2, y: (rect.top + rect.bottom) / 2 };
      const stack = document.elementsFromPoint(point.x, point.y);
      const top = stack[0];
      const rail = document.querySelector(".local-hand-rail");
      let uncoveredSkillPoint = null;
      for (let y = skillRect.top + 1; y < skillRect.bottom - 1 && !uncoveredSkillPoint; y += 2) {
        for (let x = skillRect.left + 1; x < skillRect.right - 1; x += 2) {
          if (x >= cardRect.left && x < cardRect.right && y >= cardRect.top && y < cardRect.bottom) continue;
          const target = document.elementFromPoint(x, y);
          const railRect = rail.getBoundingClientRect();
          if (target?.closest(".hero-skill-button") === skillButton) {
            uncoveredSkillPoint = { x, y, insideRail: x >= railRect.left && x <= railRect.right && y >= railRect.top && y <= railRect.bottom };
            break;
          }
        }
      }
      const hand = document.querySelector(".local-hand");
      const handSection = document.querySelector(".local-hand-section");
      return {
        cardRect: cardRect.toJSON(), skillRect: skillRect.toJSON(), rect, hasOverlap: true, point,
        topSelector: top?.className?.baseVal ?? top?.className ?? top?.tagName,
        topCardId: top?.closest(".card-slot")?.getAttribute("data-hand-card-id") ?? null,
        selectedCardId: card.closest(".card-slot")?.getAttribute("data-hand-card-id") ?? null,
        uncoveredSkillPoint,
        paintLayer: { section: getComputedStyle(handSection).zIndex, hand: getComputedStyle(hand).zIndex, rail: getComputedStyle(rail).zIndex },
        railInteraction: { overflowX: getComputedStyle(rail).overflowX, overflowY: getComputedStyle(rail).overflowY, pointerEvents: getComputedStyle(rail).pointerEvents, touchAction: getComputedStyle(rail).touchAction },
      };
    });
    expect(overlap?.hasOverlap).toBe(true);
    expect(overlap?.rect.right - overlap?.rect.left).toBeGreaterThan(0);
    expect(overlap?.rect.bottom - overlap?.rect.top).toBeGreaterThan(0);
    expect(overlap?.topCardId).toBe(overlap?.selectedCardId);
    expect(overlap?.paintLayer).toEqual({ section: "auto", hand: "auto", rail: "auto" });
    expect(overlap?.railInteraction).toEqual({ overflowX: "auto", overflowY: "hidden", pointerEvents: "auto", touchAction: "pan-x" });
    expect(overlap?.uncoveredSkillPoint).not.toBeNull();
    expect(overlap?.uncoveredSkillPoint.insideRail).toBe(true);
    const uncoveredHit = await page.evaluate(({ x, y }) => document.elementFromPoint(x, y)?.closest(".hero-skill-button")?.textContent ?? null, overlap.uncoveredSkillPoint);
    expect(uncoveredHit).toMatch(/Influencing/i);
    const equipmentButton = page.locator(".local-equipment-panel .local-zone-card-button").first();
    await expect(equipmentButton).toBeVisible();
    expect(await equipmentButton.evaluate((button) => {
      const rect = button.getBoundingClientRect();
      return document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2) === button;
    })).toBe(true);

    await selectedCard.tap();
    await expect(selectedCard).toHaveAttribute("aria-pressed", "false");
    const swipeStart = await selectedSlot.boundingBox();
    const session = await context.newCDPSession(page);
    try {
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, x: swipeStart.x + 14, y: swipeStart.y + 18 }] });
      for (const progress of [0.25, 0.5, 0.75, 1]) {
        await session.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ id: 1, x: swipeStart.x + 14 - 100 * progress, y: swipeStart.y + 18 }] });
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
      await rail.evaluate((element) => { element.scrollLeft = element.scrollWidth; });
      const [railBox, lastCardBox] = await Promise.all([rail.boundingBox(), rail.locator(".card-slot").last().boundingBox()]);
      expect(lastCardBox.x).toBeGreaterThanOrEqual(railBox.x - 1);
      expect(lastCardBox.x + lastCardBox.width).toBeLessThanOrEqual(railBox.x + railBox.width + 1);
      expect(await rail.locator('.game-card[aria-pressed="true"]').count()).toBe(0);
      expect(await rail.evaluate((element) => getComputedStyle(element).touchAction)).toBe("pan-x");
      expect(await rail.evaluate((element) => getComputedStyle(element).pointerEvents)).toBe("auto");
    } finally {
      await session.detach();
    }
  } finally {
    await context.close();
  }
});
