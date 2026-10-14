import { expect, test } from "@playwright/test";

async function loadFixture(page, { count = 4, width, height = 900, state = "rest", equipmentCase = "matrix", targetHero = null, judgementCase = null }) {
  await page.setViewportSize({ width, height });
  const params = new URLSearchParams({ state, count: String(count), equipmentCase });
  if (targetHero) params.set("targetHero", targetHero);
  if (judgementCase) params.set("judgementCase", judgementCase);
  await page.goto(`/tests/browser/fixture.html?${params}`);
  await expect(page.locator(".game-shell")).toBeVisible();
}

async function seatGeometry(page) {
  return page.locator(".player-board [data-player-anchor]").evaluateAll((seats) => seats.map((seat) => {
    const { x, y, width, height } = seat.getBoundingClientRect();
    return { id: seat.dataset.playerAnchor, x, y, width, height };
  }));
}

function overlaps(a, b) {
  return Math.min(a.x + a.width, b.x + b.width) > Math.max(a.x, b.x)
    && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);
}

function expectStableBox(before, after) {
  for (const dimension of ["x", "y", "width", "height"]) {
    expect(Math.abs(after[dimension] - before[dimension]), `Dock ${dimension} changed`).toBeLessThanOrEqual(2);
  }
}

test("clicking an opponent Hero opens the unified inspector without changing Stage identity", async ({ page }) => {
  await loadFixture(page, { state: "interaction", width: 480, height: 900 });
  const stage = page.locator('.play-table[data-seat-topology="top-row"] .interaction-stage');
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  const stageIdentity = await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage"].map((name) => [name, element.getAttribute(name)]),
  ));

  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  await expect(page.getByRole("dialog", { name: "Player 2 opponent inspection" })).toBeVisible();
  await expect(stage).toHaveAttribute("data-local-ui-mode", "INSPECT");
  expect(await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage"].map((name) => [name, element.getAttribute(name)]),
  ))).toEqual(stageIdentity);

  await page.getByRole("button", { name: "Close Player 2 inspection" }).click();
  await expect(stage).toBeVisible();
  await expect(stage).not.toHaveAttribute("data-local-ui-mode");
});

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`opponent Inspect uses the measured Stage safe zone at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, viewport);
    const before = await seatGeometry(page);
    const dockBefore = await page.locator(".local-player-dock").boundingBox();
    const opponentSeat = page.locator('[data-player-anchor="p2"]');
    await expect(opponentSeat.locator(".hero-card-info-button")).toHaveCount(0);
    await expect(opponentSeat.locator(".opponent-hand-footer, .player-hand-count")).toHaveCount(0);
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();

    const stage = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"]');
    const layer = stage.locator(":scope > .opponent-inspection-layer");
    const shell = layer.locator(":scope > .opponent-inspection-floating-shell");
    const inspect = shell.locator(".hero-focus-inspect");
    await expect(inspect).toHaveAttribute("data-hero-focus-mode", "INSPECT");
    await expect(inspect.locator(".hero-focus-heading strong")).toHaveText("INSPECT · Player 2");
    await expect(inspect).not.toContainText("HERO FOCUS");
    await expect(page.getByRole("dialog", { name: "Player 2 opponent inspection" })).toBeVisible();
    await expect(stage.locator(":scope > header")).toHaveCount(0);
    await expect(stage.getByText("INSPECT · Player 2", { exact: true })).toHaveCount(1);
    await expect(inspect.locator(".hero-focus-identity")).not.toContainText("Player 2");
    await expect(inspect.locator(".hero-focus-identity-hero")).toBeVisible();
    await expect(inspect.locator(".hero-focus-inspect-profile b")).toHaveCount(0);
    await expect(inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill').first()).toBeVisible();
    const skills = inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill');
    await expect(skills).toHaveCount(2);
    for (const skill of await skills.all()) {
      expect(Number.parseFloat(await skill.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(10);
    }
    await expect(inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]')).toHaveCount(1);
    await expect(inspect.locator(".hero-focus-identity [data-public-hand-count]")).toHaveText("Hand · 2");
    await expect(inspect.locator('[aria-label="Concealed Hand"]')).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-inspect-hand-backs")).toHaveCount(0);
    await expect(inspect).not.toHaveAttribute("aria-modal", "true");
    await expect(layer).toBeVisible();
    await expect(layer.locator(".opponent-inspection-backdrop")).toBeVisible();
    expect(await inspect.evaluate((element) => /\b(Lord|Loyalist|Rebel|Renegade|Spy)\b/.test(element.textContent ?? ""))).toBe(false);

    const [stageBox, safeBox, shellBox, inspectBox, backdropBox, titleBox, closeBox, portraitBox, identityBox, identityType, menuBox, guidanceBox, dockOpen] = await Promise.all([
      stage.boundingBox(),
      page.locator(".interaction-safe-zone").boundingBox(),
      shell.boundingBox(),
      inspect.boundingBox(),
      layer.locator(".opponent-inspection-backdrop").boundingBox(),
      inspect.locator(".hero-focus-heading strong").boundingBox(),
      inspect.getByRole("button", { name: "Close Player 2 inspection" }).boundingBox(),
      inspect.locator(".hero-focus-portrait").boundingBox(),
      inspect.locator(".hero-focus-identity").boundingBox(),
      inspect.locator(".hero-focus-identity").evaluate((element) => ({
        hero: Number.parseFloat(getComputedStyle(element.querySelector(".hero-focus-identity-hero")).fontSize),
        hp: Number.parseFloat(getComputedStyle(element.querySelector(".hero-focus-identity-stats small")).fontSize),
        hand: Number.parseFloat(getComputedStyle(element.querySelector("[data-public-hand-count]")).fontSize),
      })),
      page.locator(".stage-system-menu-trigger").boundingBox(),
      page.locator(".local-player-dock .console-guidance").boundingBox(),
      page.locator(".local-player-dock").boundingBox(),
    ]);
    for (const box of [stageBox, safeBox, shellBox, inspectBox, backdropBox, titleBox, closeBox, portraitBox, identityBox, menuBox, guidanceBox, dockBefore, dockOpen]) expect(box).not.toBeNull();
    expect(Math.abs(stageBox.x - safeBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(stageBox.y - safeBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(stageBox.width - safeBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(stageBox.height - safeBox.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.x - stageBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.y - stageBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.width - stageBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.height - stageBox.height)).toBeLessThanOrEqual(1);
    expect(Math.abs((shellBox.x + shellBox.width / 2) - (stageBox.x + stageBox.width / 2))).toBeLessThanOrEqual(1);
    expect(shellBox.y).toBeGreaterThanOrEqual(stageBox.y + 10);
    expect(shellBox.y).toBeLessThanOrEqual(stageBox.y + 14);
    expect(shellBox.y + shellBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height - 10);
    expect(shellBox.height).toBeLessThan(stageBox.height);
    expect(identityType.hero).toBeGreaterThanOrEqual(12);
    expect(identityType.hp).toBeGreaterThanOrEqual(10);
    expect(identityType.hand).toBeGreaterThanOrEqual(10);
    expect(portraitBox.width).toBeLessThanOrEqual(82);
    if (viewport.width <= 520) {
      expect(portraitBox.width).toBeGreaterThanOrEqual(58);
      expect(identityBox.width).toBeGreaterThan(portraitBox.width);
      expect(identityBox.x).toBeGreaterThanOrEqual(portraitBox.x + portraitBox.width);
      expect(identityBox.x + identityBox.width).toBeLessThanOrEqual(shellBox.x + shellBox.width);
      expect(shellBox.width / stageBox.width).toBeGreaterThanOrEqual(0.88);
      expect(shellBox.width / stageBox.width).toBeLessThanOrEqual(0.94);
      const leftInset = shellBox.x - stageBox.x;
      const rightInset = stageBox.x + stageBox.width - shellBox.x - shellBox.width;
      expect(Math.abs(leftInset - rightInset)).toBeLessThanOrEqual(1);
    } else {
      expect(portraitBox.height).toBeLessThanOrEqual(125);
    }
    expect(Math.abs((titleBox.y + titleBox.height / 2) - (closeBox.y + closeBox.height / 2))).toBeLessThanOrEqual(2);
    expect(overlaps(shellBox, menuBox)).toBe(false);
    expect(overlaps(shellBox, guidanceBox)).toBe(false);
    expect(overlaps(shellBox, dockOpen)).toBe(false);
    for (const seatBox of before) expect(overlaps(shellBox, seatBox)).toBe(false);
    expectStableBox(dockBefore, dockOpen);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

    await inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]').click();
    const cardDetail = inspect.locator('[data-inspector-card-detail="true"]');
    await expect(cardDetail).toBeVisible();
    await expect(cardDetail).toContainText("Zhuge Crossbow");
    await expect(cardDetail).toContainText("Equip this weapon during your Play Phase");
    await expect(cardDetail.locator(".hero-focus-inspect-card-metadata")).toHaveText("A♦ · EQUIPMENT CARD");
    await expect(page.locator(".card-info-dialog")).toHaveCount(0);
    await expect(inspect).toBeVisible();
    await expect(inspect.getByRole("button", { name: /^Back/ })).toHaveCount(0);
    const firstSkill = inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill').first();
    const firstSkillName = await firstSkill.innerText();
    await firstSkill.click();
    await expect(cardDetail).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText(firstSkillName);
    await expect(inspect).toBeVisible();

    await page.getByRole("button", { name: "Close Player 2 inspection", exact: true }).click();
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    expectStableBox(dockBefore, await page.locator(".local-player-dock").boundingBox());
    expect(await seatGeometry(page)).toEqual(before);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 440, height: 894 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`Inspect keeps one public skill compact beside one equipment card at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, targetHero: "xiahou-dun", equipmentCase: "weapon" });
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const skills = inspect.locator('[aria-label="Public Skills"]');
    await expect(skills.locator("h3")).toHaveText("Public Skills");
    await expect(skills.locator(".hero-focus-inspect-skill")).toHaveCount(1);
    await expect(skills.locator(".hero-focus-inspect-skill")).toHaveText("Stauchness");
    const [skillZoneBox, skillType] = await Promise.all([
      skills.boundingBox(),
      skills.locator(".hero-focus-inspect-skill").evaluate((element) => Number.parseFloat(getComputedStyle(element).fontSize)),
    ]);
    expect(skillZoneBox).not.toBeNull();
    expect(skillZoneBox.height).toBeLessThanOrEqual(60);
    expect(skillType).toBeGreaterThanOrEqual(10);
    const equipment = inspect.locator('[aria-label="Equipment"]');
    const equipmentCard = equipment.locator('.opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]');
    await expect(equipmentCard).toHaveCount(1);
    const [equipmentZoneBox, equipmentCardBox] = await Promise.all([equipment.boundingBox(), equipmentCard.boundingBox()]);
    expect(equipmentZoneBox).not.toBeNull();
    expect(equipmentCardBox).not.toBeNull();
    expect(equipmentCardBox.width).toBeGreaterThanOrEqual(36);
    expect(equipmentCardBox.height / equipmentCardBox.width).toBeGreaterThanOrEqual(1.45);
    expect(equipmentCardBox.height / equipmentCardBox.width).toBeLessThanOrEqual(1.55);
    expect(equipmentCardBox.x).toBeGreaterThanOrEqual(equipmentZoneBox.x);
    expect(equipmentCardBox.x + equipmentCardBox.width).toBeLessThanOrEqual(equipmentZoneBox.x + equipmentZoneBox.width);

    const stauchness = skills.getByRole("button", { name: "Show Stauchness description" });
    await stauchness.click();
    const description = inspect.getByRole("region", { name: "Stauchness description" });
    await expect(description).toContainText("After you take damage, you may enter Judgement phase");
    await expect(stauchness).toHaveAttribute("aria-expanded", "true");
    const details = inspect.locator(".hero-focus-inspect-details");
    const savedSkillScroll = await description.evaluate((element) => { element.scrollTop = element.scrollHeight; return element.scrollTop; });
    const savedDetailsScroll = await details.evaluate((element) => { element.scrollTop = element.scrollHeight; return element.scrollTop; });
    const descriptionGeometry = await description.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const style = getComputedStyle(element);
      const lineHeight = Number.parseFloat(style.lineHeight);
      const verticalPadding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);
      const elementBox = element.getBoundingClientRect();
      const scrollportBox = element.parentElement.getBoundingClientRect();
      return {
        naturalLines: range.getClientRects().length,
        visibleLines: Math.floor((Math.min(elementBox.bottom, scrollportBox.bottom) - Math.max(elementBox.top, scrollportBox.top) - verticalPadding + 0.5) / lineHeight),
        maxHeight: Number.parseFloat(style.maxHeight),
        lineHeight,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      };
    });
    expect(descriptionGeometry.visibleLines).toBeGreaterThanOrEqual(Math.min(5, descriptionGeometry.naturalLines));
    expect(descriptionGeometry.maxHeight).toBeLessThanOrEqual(5 * descriptionGeometry.lineHeight + 1);
    await equipmentCard.click();
    const cardDetail = inspect.locator('[data-inspector-card-detail="true"]');
    await expect(cardDetail).toBeVisible();
    await expect(cardDetail).toContainText("Zhuge Crossbow");
    await expect(cardDetail).toContainText("unlimited number of Attack cards");
    await expect(equipmentCard).toHaveAttribute("aria-pressed", "true");
    await expect(page.locator(".card-info-dialog")).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(cardDetail).toHaveCount(0);
    await expect(inspect).toBeVisible();
    await expect(stauchness).toHaveAttribute("aria-expanded", "true");
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Stauchness");
    expect(await description.evaluate((element) => element.scrollTop)).toBe(savedSkillScroll);
    expect(await details.evaluate((element) => element.scrollTop)).toBe(savedDetailsScroll);
    await equipmentCard.click();
    await expect(cardDetail).toBeVisible();
    await stauchness.click();
    await expect(cardDetail).toHaveCount(0);
    await expect(description).toBeVisible();
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Stauchness");
    expect(await description.evaluate((element) => element.scrollTop)).toBe(0);
    expect(await details.evaluate((element) => element.scrollTop)).toBe(0);
    expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toBe("Show Stauchness description");
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`Inspect keeps multiple public Equipment cards compact at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, targetHero: "xiahou-dun", equipmentCase: "multiple" });
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const equipment = inspect.locator('[aria-label="Equipment"]');
    const cards = equipment.locator(".opponent-inspection-card");
    await expect(cards).toHaveCount(4);
    const [zoneBox, cardBoxes] = await Promise.all([
      equipment.boundingBox(),
      Promise.all((await cards.all()).map((card) => card.boundingBox())),
    ]);
    expect(zoneBox).not.toBeNull();
    for (const box of cardBoxes) {
      expect(box).not.toBeNull();
      expect(box.width).toBeLessThanOrEqual(60);
      expect(box.x).toBeGreaterThanOrEqual(zoneBox.x);
      expect(box.x + box.width).toBeLessThanOrEqual(zoneBox.x + zoneBox.width);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

const inspectorMiniatureViewports = [
  { width: 390, height: 844 },
  { width: 440, height: 894 },
  { width: 480, height: 900 },
  { width: 1440, height: 900 },
];
const inspectorMiniatureScenarios = [
  {
    equipmentCase: "weapon",
    cards: [{ name: "Zhuge Crossbow", rank: "A", suit: "♦", suitClass: "red-suit" }],
  },
  {
    equipmentCase: "miniaturePair",
    cards: [
      { name: "Nio Shield", rank: "2", suit: "♣", suitClass: "black-suit" },
      { name: "Shadowrunner", rank: "10", suit: "♥", suitClass: "red-suit" },
    ],
  },
  {
    equipmentCase: "miniatureSet",
    cards: [
      { name: "Zhuge Crossbow", rank: "A", suit: "♦", suitClass: "red-suit" },
      { name: "Nio Shield", rank: "2", suit: "♣", suitClass: "black-suit" },
      { name: "Shadowrunner", rank: "Q", suit: "♥", suitClass: "red-suit" },
      { name: "Fergana Steed", rank: "K", suit: "♠", suitClass: "black-suit" },
    ],
  },
];

for (const viewport of inspectorMiniatureViewports) {
  for (const scenario of inspectorMiniatureScenarios) {
    test(`Inspector equipment miniature preserves art and readable rank/suit (${scenario.cards.length} cards, ${viewport.width}px)`, async ({ page }, testInfo) => {
      await loadFixture(page, { ...viewport, targetHero: "xiahou-dun", equipmentCase: scenario.equipmentCase });
      await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
      const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
      const equipment = inspect.locator('[aria-label="Equipment"]');
      const cards = equipment.locator(".opponent-inspection-equipment-card");
      await expect(cards).toHaveCount(scenario.cards.length);

      const equipmentBox = await equipment.boundingBox();
      expect(equipmentBox).not.toBeNull();
      const geometry = [];
      for (let index = 0; index < scenario.cards.length; index += 1) {
        const expected = scenario.cards[index];
        const button = cards.nth(index);
        const face = button.locator(".played-card");
        const corner = face.locator(":scope > i");
        await expect(button).toHaveAttribute("aria-label", `Explain ${expected.name}`);
        await expect(face).toHaveClass(new RegExp(expected.suitClass));
        await expect(face.locator(":scope > .card-name-mark")).toHaveCSS("display", "none");
        await expect(face.locator(":scope > strong")).toHaveCSS("display", "none");
        await expect(corner.locator("small")).toHaveText(expected.suit);

        const [buttonBox, faceBox, cornerBox, rank, cornerStyle, faceStyle] = await Promise.all([
          button.boundingBox(),
          face.boundingBox(),
          corner.boundingBox(),
          corner.evaluate((element) => element.firstChild?.textContent?.trim()),
          corner.evaluate((element) => ({
            transform: getComputedStyle(element).transform,
            fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
            suitFontSize: Number.parseFloat(getComputedStyle(element.querySelector("small")).fontSize),
          })),
          face.evaluate((element) => getComputedStyle(element).backgroundImage),
        ]);
        expect(buttonBox).not.toBeNull();
        expect(faceBox).not.toBeNull();
        expect(cornerBox).not.toBeNull();
        expect(rank).toBe(expected.rank);
        expect(faceBox.height / faceBox.width).toBeGreaterThanOrEqual(1.45);
        expect(faceBox.height / faceBox.width).toBeLessThanOrEqual(1.55);
        expect(faceBox.width).toBeGreaterThanOrEqual(29);
        expect(faceBox.width).toBeLessThanOrEqual(38);
        expect(cornerBox.x).toBeGreaterThanOrEqual(faceBox.x - 0.5);
        expect(cornerBox.y).toBeGreaterThanOrEqual(faceBox.y - 0.5);
        expect(cornerBox.x + cornerBox.width).toBeLessThanOrEqual(faceBox.x + faceBox.width + 0.5);
        expect(cornerBox.y + cornerBox.height).toBeLessThanOrEqual(faceBox.y + faceBox.height + 0.5);
        expect(cornerBox.width).toBeGreaterThanOrEqual(11.5);
        expect(cornerBox.height).toBeGreaterThanOrEqual(17);
        expect(cornerStyle.transform).toBe("none");
        expect(cornerStyle.fontSize).toBeGreaterThanOrEqual(7);
        expect(cornerStyle.suitFontSize).toBeGreaterThanOrEqual(6);
        expect(faceStyle).not.toBe("none");
        expect(buttonBox.x).toBeGreaterThanOrEqual(equipmentBox.x);
        expect(buttonBox.x + buttonBox.width).toBeLessThanOrEqual(equipmentBox.x + equipmentBox.width);
        geometry.push({
          name: expected.name,
          rank: expected.rank,
          suit: expected.suit,
          button: buttonBox,
          face: faceBox,
          corner: cornerBox,
          cornerFontSize: cornerStyle.fontSize,
          suitFontSize: cornerStyle.suitFontSize,
        });
      }

      await expect(page.locator(".local-hand-rail .game-card .card-name-mark").first()).toBeVisible();
      await expect(page.locator(".local-hand-rail .game-card > strong").first()).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await testInfo.attach("equipment-miniature-geometry.json", {
        body: Buffer.from(JSON.stringify({ viewport, equipmentCase: scenario.equipmentCase, cards: geometry }, null, 2)),
        contentType: "application/json",
      });
      await testInfo.attach("equipment-miniature.png", {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    });
  }
}

for (const count of [6, 8]) {
  test(`Inspect keeps public Hand count private and Judgment compact with ${count} seats`, async ({ page }) => {
    const viewport = { width: 390, height: 844 };
    await loadFixture(page, { ...viewport, count, equipmentCase: "empty" });
    await page.locator('[data-player-anchor="p3"] .opponent-hero-target').click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const judgment = inspect.locator('[aria-label="Judgement Zone"]');
    const judgmentCard = judgment.locator('.opponent-inspection-card[aria-label="Explain Lightning"]');
    const publicZones = inspect.locator(".hero-focus-inspect-public-zones");
    await expect(judgmentCard).toHaveCount(1);
    const [inspectBox, publicZonesBox, judgmentBox, profileBox] = await Promise.all([
      inspect.boundingBox(),
      publicZones.boundingBox(),
      judgment.boundingBox(),
      inspect.locator(".hero-focus-inspect-profile").boundingBox(),
    ]);
    expect(inspectBox).not.toBeNull();
    expect(publicZonesBox).not.toBeNull();
    expect(profileBox).not.toBeNull();
    expect(publicZonesBox.x).toBeGreaterThanOrEqual(profileBox.x + profileBox.width);
    expect(publicZonesBox.width).toBeGreaterThan(inspectBox.width * 0.3);
    expect(judgmentBox).not.toBeNull();
    await expect(inspect.locator(".hero-focus-identity [data-public-hand-count]")).toBeVisible();
    await expect(inspect.locator('[aria-label="Concealed Hand"]')).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-inspect-hand-backs")).toHaveCount(0);
    const seatBoxes = await seatGeometry(page);
    const panelBox = await page.locator(".opponent-inspection-floating-shell").boundingBox();
    expect(panelBox).not.toBeNull();
    for (const seatBox of seatBoxes) expect(overlaps(panelBox, seatBox)).toBe(false);
    expect(await page.locator(".local-player-dock").boundingBox()).not.toBeNull();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

for (const viewport of [{ width: 390, height: 844 }, { width: 480, height: 900 }, { width: 1440, height: 900 }]) {
  test(`Inspect keeps an empty Judgment Zone compact at ${viewport.width}px`, async ({ page }) => {
    await loadFixture(page, { ...viewport, equipmentCase: "empty" });
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const judgment = inspect.locator('[aria-label="Judgement Zone"]');
    await expect(judgment.locator(".opponent-inspection-empty")).toHaveText("None");
    await expect(judgment.locator(".opponent-inspection-card")).toHaveCount(0);
    const [zoneBox, detailsBox] = await Promise.all([judgment.boundingBox(), inspect.locator(".hero-focus-inspect-details").boundingBox()]);
    expect(zoneBox).not.toBeNull();
    expect(detailsBox).not.toBeNull();
    expect(zoneBox.height).toBeLessThanOrEqual(38);
    const [profileBox, publicZonesBox] = await Promise.all([
      inspect.locator(".hero-focus-inspect-profile").boundingBox(),
      inspect.locator(".hero-focus-inspect-public-zones").boundingBox(),
    ]);
    expect(profileBox).not.toBeNull();
    expect(publicZonesBox).not.toBeNull();
    expect(publicZonesBox.x).toBeGreaterThanOrEqual(profileBox.x + profileBox.width);
    expect(zoneBox.x).toBeGreaterThanOrEqual(publicZonesBox.x);
    expect(zoneBox.x + zoneBox.width).toBeLessThanOrEqual(publicZonesBox.x + publicZonesBox.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

test("Inspect shows a compact None state when public Hero skills are unavailable", async ({ page }) => {
  await loadFixture(page, { width: 390, height: 844, targetHero: "unknown-fixture-hero", equipmentCase: "empty" });
  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
  const skills = inspect.locator('[aria-label="Public Skills"]');
  await expect(inspect.locator(".hero-focus-identity")).toContainText("Unknown Hero");
  await expect(skills.locator(".opponent-inspection-empty")).toHaveText("None");
  expect((await skills.boundingBox()).height).toBeLessThanOrEqual(42);
  await expect(inspect.locator(".hero-focus-identity .hero-focus-inspect-explain")).toHaveCount(0);
});

test("unified Inspector changes its subject without changing the legal target", async ({ page }) => {
  await loadFixture(page, { state: "ordinary-turn", width: 480, height: 900, equipmentCase: "weapon" });
  await page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card').click();
  await page.getByRole("button", { name: "Select Player 2", exact: true }).click();
  const panel = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-panel');
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p2");
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(1);

  await page.getByRole("button", { name: "Inspect Player 2", exact: true }).click();
  await expect(panel).toBeVisible();
  await expect(panel).not.toContainText("HERO FOCUS");
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
  await expect(page.locator('[data-console-surface="local-operation"] button.local-target-cancel')).toBeVisible();
  expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);

  await panel.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]').click();
  const cardDetail = panel.locator('[data-inspector-card-detail="true"]');
  const crossbow = panel.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]');
  await expect(cardDetail).toBeVisible();
  await expect(crossbow).toHaveAttribute("aria-pressed", "true");
  await expect(panel.getByRole("button", { name: /^Back/ })).toHaveCount(0);
  const publicSkill = panel.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill').first();
  const publicSkillName = await publicSkill.innerText();
  await publicSkill.click();
  await expect(cardDetail).toHaveCount(0);
  await expect(panel.locator(".hero-focus-inspect-skill-name")).toHaveText(publicSkillName);
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();

  await page.getByRole("button", { name: "Inspect Player 3", exact: true }).click();
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
  await expect(panel.locator("[data-inspector-card-detail]")).toHaveCount(0);
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('.opponent-player-card[data-player-anchor="p3"]')).not.toHaveClass(/selected-target/);
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(1);

  await page.getByRole("button", { name: "Close Player 3 inspection", exact: true }).click();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
  expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);
});

test("Inspect restores authoritative Hero Focus without changing Stage identity or sending actions", async ({ page }) => {
  await loadFixture(page, { state: "interaction", width: 480, height: 900 });
  const stage = page.locator('[aria-label="Interaction Stage"]');
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  const identity = await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage", "data-continuity"].map((name) => [name, element.getAttribute(name)]),
  ));
  const actionsBefore = await page.evaluate(() => window.__browserActions.length);

  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  await expect(stage).toHaveAttribute("data-local-ui-mode", "INSPECT");
  await expect(stage.locator('.hero-focus-inspect[data-inspect-player-id="p2"]')).toBeVisible();
  await expect(stage).toHaveAttribute("data-stage", "ATTACK_RESPONSE");
  await page.getByRole("button", { name: "Close Player 2 inspection", exact: true }).click();

  await expect(stage.locator('[data-hero-focus="true"]')).toBeVisible();
  expect(await stage.evaluate((element) => Object.fromEntries(
    ["data-interaction-id", "data-checkpoint-id", "data-presentation-revision", "data-stage", "data-continuity"].map((name) => [name, element.getAttribute(name)]),
  ))).toEqual(identity);
  expect(await page.evaluate(() => window.__browserActions.length)).toBe(actionsBefore);
});

test("Side Column Inspect keeps public Judgement details inside the centre Stage", async ({ page }) => {
  await loadFixture(page, { count: 6, width: 480, height: 900, judgementCase: "public-lightning" });
  const before = await seatGeometry(page);
  await page.locator('[data-player-anchor="p3"] .opponent-hero-target').click();
  const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
  await expect(inspect).toBeVisible();
  const judgmentCard = inspect.locator('[aria-label="Judgement Zone"] .opponent-inspection-card[aria-label="Explain Lightning"]');
  await expect(judgmentCard).toHaveCount(1);
  await expect(judgmentCard).not.toHaveClass(/opponent-inspection-equipment-card/);
  await judgmentCard.click();
  const detail = inspect.locator('[data-inspector-card-detail="true"]');
  await expect(detail).toBeVisible();
  await expect(detail).toContainText("Lightning");
  await expect(detail).toContainText("During your next Judgement Phase");
  await expect(detail.locator(".hero-focus-inspect-card-metadata")).toHaveText("Q♥ · STRATAGEM CARD");
  await expect(page.locator(".card-info-dialog")).toHaveCount(0);
  await expect(inspect.getByRole("button", { name: /^Back/ })).toHaveCount(0);
  const publicSkill = inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill').first();
  const skillName = await publicSkill.innerText();
  await publicSkill.click();
  await expect(detail).toHaveCount(0);
  await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText(skillName);
  expect(await page.evaluate(() => document.activeElement?.textContent?.trim())).toBe(skillName);
  await judgmentCard.click();
  await expect(detail).toBeVisible();
  await expect(detail).toContainText("Lightning");
  expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);
  expect(await seatGeometry(page)).toEqual(before);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(480);
});

for (const viewport of [{ count: 4, width: 390, height: 844 }, { count: 6, width: 440, height: 894 }, { count: 8, width: 480, height: 900 }]) {
  test(`Da Qiao Inspector switches named details in either direction (${viewport.count} seats, ${viewport.width}px)`, async ({ page }) => {
    await loadFixture(page, { ...viewport, targetHero: "daqiao", equipmentCase: "inspectorNamedDetails" });
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    await expect(inspect.locator(".hero-focus-identity-hero")).toHaveText("Da Qiao");
    await expect(inspect.locator("[data-public-hand-count]")).toHaveText("Hand · 2");
    await expect(inspect.locator('[aria-label="Concealed Hand"]')).toHaveCount(0);
    const actionsBefore = await page.evaluate(() => window.__browserActions.length);
    const skills = inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill');
    const captivating = skills.filter({ hasText: "Captivating" });
    const deflection = skills.filter({ hasText: "Deflection" });
    const frostSword = inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Frost Sword"]');
    const nioShield = inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Nio Shield"]');
    const cardDetail = inspect.locator('[data-inspector-card-detail="true"]');

    await captivating.focus();
    await expect(captivating).toBeFocused();
    await page.keyboard.press("Enter");
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Captivating");
    await expect(inspect.getByRole("region", { name: "Captivating description" })).toContainText("♦ suit card");
    await expect(captivating).toHaveAttribute("aria-expanded", "true");

    await frostSword.click();
    await expect(cardDetail).toBeVisible();
    await expect(cardDetail).toContainText("Frost Sword");
    await expect(cardDetail).toContainText("prevent that damage");
    await expect(cardDetail.locator(".hero-focus-inspect-card-metadata")).toHaveText("J♠ · EQUIPMENT CARD");
    await expect(frostSword).toHaveAttribute("aria-pressed", "true");
    await expect(captivating).toHaveAttribute("aria-expanded", "false");
    await frostSword.click();
    await expect(cardDetail).toContainText("Frost Sword");
    await expect(frostSword).toHaveAttribute("aria-pressed", "true");

    await nioShield.click();
    await expect(cardDetail).toContainText("Nio Shield");
    await expect(cardDetail).toContainText("immune to the effects of black Attack cards");
    await expect(nioShield).toHaveAttribute("aria-pressed", "true");
    await expect(frostSword).toHaveAttribute("aria-pressed", "false");

    await deflection.click();
    await expect(cardDetail).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Deflection");
    await expect(inspect.getByRole("region", { name: "Deflection description" })).toContainText("transfer this [Attack]");
    await expect(deflection).toHaveAttribute("aria-expanded", "true");
    await expect(inspect.getByRole("button", { name: /^Back/ })).toHaveCount(0);

    await deflection.click();
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Deflection");
    await nioShield.click();
    await expect(cardDetail).toContainText("Nio Shield");
    await frostSword.click();
    await expect(cardDetail).toContainText("Frost Sword");
    await captivating.click();
    await expect(cardDetail).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Captivating");
    expect(await page.evaluate(() => window.__browserActions.length)).toBe(actionsBefore);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

test("Hua Tuo's long skill stays titled and direct switching preserves local controls", async ({ page }) => {
  await loadFixture(page, { state: "interaction", width: 390, height: 844, targetHero: "hua-tuo", equipmentCase: "inspectorNamedDetails" });
  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
  const prodigalHealer = inspect.getByRole("button", { name: "Show Prodigal Healer description" });
  const firstAid = inspect.getByRole("button", { name: "Show First Aid description" });
  const actionsBefore = await page.evaluate(() => window.__browserActions.length);
  const controlsBefore = await page.locator('[data-console-surface="local-operation"] button').evaluateAll((buttons) => buttons.map((button) => ({ text: button.textContent.trim(), disabled: button.disabled, pressed: button.getAttribute("aria-pressed") })));
  expect(controlsBefore.length).toBeGreaterThan(0);

  await prodigalHealer.click();
  await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Prodigal Healer");
  await expect(inspect.getByRole("region", { name: "Prodigal Healer description" })).toContainText("discard 1 card from your hand");
  await firstAid.click();
  await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("First Aid");
  await expect(inspect.getByRole("region", { name: "First Aid description" })).toContainText("Red suited card as a [Peach]");
  await prodigalHealer.click();
  await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Prodigal Healer");
  const controlsAfter = await page.locator('[data-console-surface="local-operation"] button').evaluateAll((buttons) => buttons.map((button) => ({ text: button.textContent.trim(), disabled: button.disabled, pressed: button.getAttribute("aria-pressed") })));
  expect(controlsAfter).toEqual(controlsBefore);
  expect(await page.evaluate(() => window.__browserActions.length)).toBe(actionsBefore);
});

test("Inspector skill and equipment details activate with touch", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const page = await context.newPage();
  try {
    await loadFixture(page, { width: 390, height: 844, targetHero: "daqiao", equipmentCase: "inspectorNamedDetails" });
    await page.locator('[data-player-anchor="p2"] .opponent-hero-target').tap();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const actionsBefore = await page.evaluate(() => window.__browserActions.length);
    const captivating = inspect.getByRole("button", { name: "Show Captivating description" });
    const frostSword = inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Frost Sword"]');
    await captivating.tap();
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Captivating");
    expect(await page.evaluate(() => window.__browserActions.length)).toBe(actionsBefore);
    await frostSword.tap();
    await expect(inspect.locator('[data-inspector-card-detail="true"]')).toContainText("Frost Sword");
    await captivating.tap();
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Captivating");
  } finally {
    await context.close();
  }
});
