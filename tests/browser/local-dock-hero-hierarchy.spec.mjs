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
