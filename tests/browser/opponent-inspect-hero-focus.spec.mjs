import { expect, test } from "@playwright/test";

async function loadFixture(page, { count = 4, width, height = 900, state = "rest", equipmentCase = "matrix", targetHero = null, judgementCase = null, playerNamePrefix = null }) {
  await page.setViewportSize({ width, height });
  const params = new URLSearchParams({ state, count: String(count), equipmentCase });
  if (targetHero) params.set("targetHero", targetHero);
  if (judgementCase) params.set("judgementCase", judgementCase);
  if (playerNamePrefix) params.set("playerNamePrefix", playerNamePrefix);
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

async function visibleBoundingBox(locator) {
  return locator.evaluate((element) => {
    const style = getComputedStyle(element);
    const rect = element.getBoundingClientRect();
    if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 || rect.width <= 0 || rect.height <= 0) return null;
    return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
  });
}

async function inspectorWidthAndScrollGeometry(page) {
  return page.evaluate(() => {
    const inspect = document.querySelector(".hero-focus-inspect");
    const shell = document.querySelector(".opponent-inspection-floating-shell");
    const selectors = {
      shell: ".opponent-inspection-floating-shell",
      inspector: ".hero-focus-inspect",
      body: ".hero-focus-body",
      portrait: ".hero-focus-inspect-portrait-column",
      portraitImage: ".hero-focus-inspect-portrait-column > .hero-focus-portrait",
      caption: ".hero-focus-inspect-identity-caption",
      main: ".hero-focus-inspect-main",
      upper: ".hero-focus-inspect-upper",
      identity: ".hero-focus-identity",
      skills: ".hero-focus-inspect-public-skills",
      judgement: ".hero-focus-inspect-judgement",
      equipment: ".hero-focus-inspect-equipment",
      details: ".hero-focus-inspect-details",
      skillDetail: ".hero-focus-inspect-skill-detail",
      skillDescription: ".hero-focus-inspect-skill-description",
      cardDetail: ".hero-focus-inspect-card-detail",
      cardRules: ".hero-focus-inspect-card-rules",
    };
    const rectangle = (element) => {
      if (!element) return null;
      const { x, y, left, top, right, bottom, width, height } = element.getBoundingClientRect();
      return { x, y, left, top, right, bottom, width, height };
    };
    const metrics = Object.fromEntries(Object.entries(selectors).map(([key, selector]) => {
      const element = key === "shell" ? shell : key === "inspector" ? inspect : inspect?.querySelector(selector);
      if (!element) return [key, null];
      const style = getComputedStyle(element);
      return [key, {
        rect: rectangle(element),
        width: style.width,
        maxWidth: style.maxWidth,
        minWidth: style.minWidth,
        display: style.display,
        gridTemplateColumns: style.gridTemplateColumns,
        overflowY: style.overflowY,
        boxSizing: style.boxSizing,
        padding: style.padding,
        gap: style.gap,
        maxHeight: style.maxHeight,
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
      }];
    }));
    const shellStyle = shell ? getComputedStyle(shell) : null;
    const inspectRect = inspect?.getBoundingClientRect();
    const inspectStyle = inspect ? getComputedStyle(inspect) : null;
    const equipment = inspect?.querySelector(".hero-focus-inspect-equipment");
    const details = inspect?.querySelector(".hero-focus-inspect-details");
    const equipmentRect = equipment?.getBoundingClientRect();
    const detailsRect = details?.getBoundingClientRect();
    const protectedCollisions = shell ? [...document.querySelectorAll(
      ".opponent-player-card, .public-activity-chip, .stage-system-menu-trigger, .local-player-dock, .local-hand-rail, .console-guidance, .visible-countdown, [data-public-card-announcement='true']",
    )].filter((element) => {
      const style = getComputedStyle(element);
      const rect = element.getBoundingClientRect();
      if (style.display === "none" || style.visibility === "hidden" || Number(style.opacity) === 0 || rect.width <= 0 || rect.height <= 0) return false;
      const shellBounds = shell.getBoundingClientRect();
      return shellBounds.left < rect.right - 0.5 && shellBounds.right > rect.left + 0.5
        && shellBounds.top < rect.bottom - 0.5 && shellBounds.bottom > rect.top + 0.5;
    }).map((element) => ({
      label: typeof element.className === "string" ? element.className : element.tagName,
      selector: element.matches("[data-public-card-announcement='true']") ? "public-card-announcement" : null,
      rect: rectangle(element),
    })) : [];
    const rightContent = inspectRect && inspectStyle
      ? inspectRect.right - Number.parseFloat(inspectStyle.borderRightWidth) - Number.parseFloat(inspectStyle.paddingRight)
      : null;
    const leftContent = inspectRect && inspectStyle
      ? inspectRect.left + Number.parseFloat(inspectStyle.borderLeftWidth) + Number.parseFloat(inspectStyle.paddingLeft)
      : null;
    const paragraph = (element) => {
      if (!element) return null;
      const style = getComputedStyle(element);
      return {
        text: element.innerText,
        rect: rectangle(element),
        scrollHeight: element.scrollHeight,
        clientHeight: element.clientHeight,
        scrollTop: element.scrollTop,
        overflowX: style.overflowX,
        overflowY: style.overflowY,
        lineHeight: style.lineHeight,
        fontSize: style.fontSize,
        boxSizing: style.boxSizing,
        padding: style.padding,
      };
    };
    return {
      viewport: { width: window.innerWidth, height: window.innerHeight },
      customWidths: shellStyle ? {
        portrait: shellStyle.getPropertyValue("--inspector-portrait-width").trim(),
        slot: shellStyle.getPropertyValue("--inspector-slot-width").trim(),
      } : null,
      inspectorContentWidth: rightContent !== null && leftContent !== null ? rightContent - leftContent : null,
      inspectorRightContent: rightContent,
      inspectorLeftContent: leftContent,
      equipmentRightGutter: rightContent !== null && equipmentRect ? rightContent - equipmentRect.right : null,
      detailsRightGutter: rightContent !== null && detailsRect ? rightContent - detailsRect.right : null,
      protectedCollisions,
      metrics,
      skillParagraph: paragraph(inspect?.querySelector(".hero-focus-inspect-skill-description")),
      cardParagraph: paragraph(inspect?.querySelector(".hero-focus-inspect-card-rules")),
    };
  });
}

async function touchScrollToBottom(page, locator) {
  const box = await locator.boundingBox();
  expect(box).not.toBeNull();
  const scrollMetrics = () => locator.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const parentRect = element.parentElement?.getBoundingClientRect();
    return {
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: style.overflowY,
      height: style.height,
      maxHeight: style.maxHeight,
      rect: { top: rect.top, bottom: rect.bottom, height: rect.height },
      parent: parentRect ? { top: parentRect.top, bottom: parentRect.bottom, height: parentRect.height } : null,
    };
  });
  const session = await page.context().newCDPSession(page);
  let didScroll = false;
  try {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      const before = await scrollMetrics();
      if (before.scrollTop + before.clientHeight >= before.scrollHeight - 1) break;
      didScroll = true;
      const x = box.x + box.width / 2;
      const bottom = box.y + box.height - 2;
      const top = box.y + 2;
      await session.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ id: 1, x, y: bottom }] });
      for (const progress of [0.25, 0.5, 0.75, 1]) {
        await session.send("Input.dispatchTouchEvent", {
          type: "touchMove",
          touchPoints: [{ id: 1, x, y: bottom + (top - bottom) * progress }],
        });
      }
      await session.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      const afterTouch = await scrollMetrics();
      if (afterTouch.scrollTop <= before.scrollTop) {
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(0, Math.max(32, box.height * 2));
      }
      const afterWheel = await scrollMetrics();
      if (afterWheel.scrollTop <= before.scrollTop) {
        await locator.evaluate((element) => { element.scrollTop = element.scrollHeight; });
      }
      const afterScroll = await scrollMetrics();
      expect(afterScroll.scrollTop, `Phone detail scroll did not advance: ${JSON.stringify({ before, afterTouch, afterWheel, afterScroll })}`)
        .toBeGreaterThan(before.scrollTop);
    }
  } finally {
    await session.detach();
  }
  const visibleFinalText = await locator.evaluate((element) => {
    const text = element.innerText.trim();
    const sentenceBoundary = text.lastIndexOf(". ", Math.max(0, text.length - 2));
    const lastSentenceStart = sentenceBoundary >= 0 ? sentenceBoundary + 2 : 0;
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const textNode = walker.nextNode();
    if (!textNode) return { visible: false, text, scrollTop: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight };
    const range = document.createRange();
    const textLength = textNode.textContent?.length ?? 0;
    const finalLineStart = Math.max(lastSentenceStart, textLength - 12);
    range.setStart(textNode, finalLineStart);
    range.setEnd(textNode, textLength);
    const elementRect = element.getBoundingClientRect();
    const style = getComputedStyle(element);
    const insetTop = Number.parseFloat(style.paddingTop) || 0;
    const insetBottom = Number.parseFloat(style.paddingBottom) || 0;
    const textRects = [...range.getClientRects()];
    const visible = textRects.length > 0 && textRects.every((rect) => (
      rect.top >= elementRect.top + insetTop - 1
      && rect.bottom <= elementRect.bottom - insetBottom + 1
      && rect.left >= elementRect.left
      && rect.right <= elementRect.right + 1
    ));
    return {
      visible,
      lastSentence: text.slice(lastSentenceStart),
      finalLine: text.slice(finalLineStart),
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      elementRect: { top: elementRect.top, bottom: elementRect.bottom, left: elementRect.left, right: elementRect.right },
      rangeRects: textRects.map((rect) => ({ top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right })),
      padding: { top: insetTop, bottom: insetBottom },
    };
  });
  visibleFinalText.didScroll = didScroll;
  if (visibleFinalText.didScroll) {
    expect(visibleFinalText.scrollHeight).toBeGreaterThan(visibleFinalText.clientHeight);
    expect(visibleFinalText.scrollTop + visibleFinalText.clientHeight).toBeGreaterThanOrEqual(visibleFinalText.scrollHeight - 1);
  }
  expect(visibleFinalText.visible, JSON.stringify(visibleFinalText)).toBe(true);
  return visibleFinalText;
}

async function scrollInspectorDetailsToBottom(locator) {
  const result = await locator.evaluate((element) => {
    const before = { scrollTop: element.scrollTop, scrollHeight: element.scrollHeight, clientHeight: element.clientHeight };
    element.scrollTop = element.scrollHeight;
    return {
      before,
      scrollTop: element.scrollTop,
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
      overflowY: getComputedStyle(element).overflowY,
    };
  });
  if (result.scrollHeight > result.clientHeight) {
    expect(result.overflowY).toBe("auto");
    expect(result.scrollTop + result.clientHeight).toBeGreaterThanOrEqual(result.scrollHeight - 1);
  }
  return result;
}

function expectStableBox(before, after) {
  for (const dimension of ["x", "y", "width", "height"]) {
    expect(Math.abs(after[dimension] - before[dimension]), `Dock ${dimension} changed`).toBeLessThanOrEqual(2);
  }
}

test("clicking an opponent Hero opens the unified Inspector without changing CurrentAction", async ({ page }) => {
  await loadFixture(page, { state: "interaction", width: 480, height: 900 });
  const currentAction = await page.evaluate(() => window.__browserRoom.currentAction);
  const actionsBefore = await page.evaluate(() => window.__browserActions.length);
  await expect(page.locator(".interaction-stage")).toHaveCount(0);

  const opener = page.locator('[data-player-anchor="p2"] .opponent-hero-target');
  await opener.click();
  await expect(page.getByRole("region", { name: "Player 2 opponent inspection" })).toBeVisible();
  await expect(opener).toHaveAttribute("aria-pressed", "true");
  await expect(opener).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator('.interaction-stage[data-local-ui-mode="INSPECT"]')).toHaveCount(1);
  expect(await page.evaluate(() => window.__browserRoom.currentAction)).toEqual(currentAction);
  expect(await page.evaluate(() => window.__browserActions.length)).toBe(actionsBefore);

  await page.keyboard.press("Escape");
  await expect(page.locator(".interaction-stage")).toHaveCount(0);
  await expect(opener).toBeFocused();
  await expect(opener).toHaveAttribute("aria-pressed", "false");
  await expect(opener).toHaveAttribute("aria-expanded", "false");
  expect(await page.evaluate(() => window.__browserRoom.currentAction)).toEqual(currentAction);
  expect(await page.evaluate(() => window.__browserActions.length)).toBe(actionsBefore);
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
    const opener = opponentSeat.locator(".opponent-hero-target");
    await expect(inspect).toHaveAttribute("data-hero-focus-mode", "INSPECT");
    await expect(inspect).not.toContainText("HERO FOCUS");
    await expect(page.getByRole("region", { name: "Player 2 opponent inspection" })).toBeVisible();
    await expect(stage.locator(":scope > header")).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-heading, .hero-focus-inspect-close")).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-inspect-identity-caption .hero-focus-identity-hero")).toBeVisible();
    await expect(inspect.locator(".hero-focus-inspect-identity-caption .hero-focus-identity-player")).toHaveText("Player 2");
    await expect(inspect.locator(".hero-focus-inspect-profile b")).toHaveCount(0);
    await expect(inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill').first()).toBeVisible();
    const skills = inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill');
    await expect(skills).toHaveCount(2);
    for (const skill of await skills.all()) {
      expect(Number.parseFloat(await skill.evaluate((element) => getComputedStyle(element).fontSize))).toBeGreaterThanOrEqual(10);
    }
    await expect(inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]')).toHaveCount(1);
    await expect(inspect.locator(".hero-focus-identity-stats [data-public-hand-count]")).toHaveText("Hand · 2");
    await expect(opener).toHaveAttribute("aria-pressed", "true");
    await expect(opener).toHaveAttribute("aria-expanded", "true");
    await expect(inspect.locator('[aria-label="Concealed Hand"]')).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-inspect-hand-backs")).toHaveCount(0);
    await expect(inspect).not.toHaveAttribute("aria-modal", "true");
    await expect(layer).toBeVisible();
    await expect(layer.locator(".opponent-inspection-backdrop")).toBeVisible();
    expect(await inspect.evaluate((element) => /\b(Lord|Loyalist|Rebel|Renegade|Spy)\b/.test(element.textContent ?? ""))).toBe(false);

    const [stageBox, safeBox, shellBox, inspectBox, backdropBox, bodyBox, portraitColumnBox, portraitBox, captionBox, identityBox, identityType, menuBox, guidanceBox, dockOpen, activityBox] = await Promise.all([
      stage.boundingBox(),
      page.locator(".interaction-safe-zone").boundingBox(),
      shell.boundingBox(),
      inspect.boundingBox(),
      layer.locator(".opponent-inspection-backdrop").boundingBox(),
      inspect.locator(".hero-focus-body").boundingBox(),
      inspect.locator(".hero-focus-inspect-portrait-column").boundingBox(),
      inspect.locator(".hero-focus-portrait").boundingBox(),
      inspect.locator(".hero-focus-inspect-identity-caption").boundingBox(),
      inspect.locator(".hero-focus-identity").boundingBox(),
      inspect.locator(".hero-focus-identity").evaluate((element) => ({
        hero: Number.parseFloat(getComputedStyle(document.querySelector(".hero-focus-inspect-identity-caption .hero-focus-identity-hero")).fontSize),
        hp: Number.parseFloat(getComputedStyle(element.querySelector(".hero-focus-identity-stats small")).fontSize),
        hand: Number.parseFloat(getComputedStyle(element.querySelector("[data-public-hand-count]")).fontSize),
      })),
      page.locator(".stage-system-menu-trigger").boundingBox(),
      page.locator(".local-player-dock .console-guidance").boundingBox(),
      page.locator(".local-player-dock").boundingBox(),
      visibleBoundingBox(page.locator(".public-activity-chip")),
    ]);
    for (const box of [stageBox, safeBox, shellBox, inspectBox, backdropBox, bodyBox, portraitColumnBox, portraitBox, captionBox, identityBox, menuBox, guidanceBox, dockBefore, dockOpen]) expect(box).not.toBeNull();
    expect(Math.abs(stageBox.x - safeBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(stageBox.y - safeBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(stageBox.width - safeBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(stageBox.height - safeBox.height)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.x - stageBox.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.y - stageBox.y)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.width - stageBox.width)).toBeLessThanOrEqual(1);
    expect(Math.abs(backdropBox.height - stageBox.height)).toBeLessThanOrEqual(1);
    expect(Math.abs((shellBox.x + shellBox.width / 2) - (stageBox.x + stageBox.width / 2))).toBeLessThanOrEqual(1);
    expect(shellBox.y).toBeGreaterThanOrEqual(stageBox.y + 2);
    expect(shellBox.y).toBeGreaterThanOrEqual(Math.max(...before.map(({ y, height }) => y + height)) + 8);
    expect(shellBox.y + shellBox.height).toBeLessThanOrEqual(stageBox.y + stageBox.height - 10);
    expect(shellBox.height).toBeLessThan(stageBox.height);
    expect(identityType.hero).toBeGreaterThanOrEqual(10);
    expect(identityType.hp).toBeGreaterThanOrEqual(10);
    expect(identityType.hand).toBeGreaterThanOrEqual(10);
    expect(portraitBox.x).toBeGreaterThanOrEqual(portraitColumnBox.x);
    expect(portraitBox.x + portraitBox.width).toBeLessThanOrEqual(portraitColumnBox.x + portraitColumnBox.width + 1);
    expect(captionBox.y).toBeGreaterThanOrEqual(portraitBox.y + portraitBox.height - 1);
    expect(captionBox.x).toBeGreaterThanOrEqual(portraitBox.x - 1);
    expect(captionBox.x + captionBox.width).toBeLessThanOrEqual(portraitBox.x + portraitBox.width + 1);
    expect(portraitBox.height / portraitBox.width).toBeGreaterThanOrEqual(1.2);
    expect(portraitBox.height / portraitBox.width).toBeLessThanOrEqual(1.3);
    if (viewport.width <= 520) {
      expect(portraitBox.width).toBeGreaterThanOrEqual(viewport.count <= 4 ? 74 : 50);
      expect(shellBox.width / stageBox.width).toBeLessThanOrEqual(0.92);
      const leftInset = shellBox.x - stageBox.x;
      const rightInset = stageBox.x + stageBox.width - shellBox.x - shellBox.width;
      expect(Math.abs(leftInset - rightInset)).toBeLessThanOrEqual(1);
    }
    const hpBox = await inspect.locator(".hero-focus-identity-stats small").first().boundingBox();
    const handBox = await inspect.locator(".hero-focus-identity-stats small").nth(1).boundingBox();
    expect(Math.abs((hpBox.y + hpBox.height / 2) - (handBox.y + handBox.height / 2))).toBeLessThanOrEqual(3);
    expect(overlaps(shellBox, menuBox)).toBe(false);
    expect(overlaps(shellBox, guidanceBox)).toBe(false);
    if (activityBox) expect(overlaps(shellBox, activityBox)).toBe(false);
    expect(overlaps(shellBox, dockOpen)).toBe(false);
    for (const seatBox of before) expect(overlaps(shellBox, seatBox)).toBe(false);
    expectStableBox(dockBefore, dockOpen);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

    const crossbow = inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]');
    await crossbow.click();
    const cardDetail = inspect.locator('[data-inspector-card-detail="true"]');
    await expect(cardDetail).toBeVisible();
    await expect(cardDetail).toContainText("Zhuge Crossbow");
    await expect(cardDetail).toContainText("Equip this weapon during your Play Phase");
    await expect(cardDetail.locator(".hero-focus-inspect-card-metadata")).toHaveText("A♦ · EQUIPMENT CARD");
    await expect(page.locator(".card-info-dialog")).toHaveCount(0);
    await expect(inspect).toBeVisible();
    await expect(inspect.getByRole("button", { name: /^Back/ })).toHaveCount(0);
    await page.keyboard.press("Escape");
    await expect(cardDetail).toHaveCount(0);
    await expect(inspect).toBeVisible();
    await expect(crossbow).toBeFocused();
    await crossbow.click();
    await expect(cardDetail).toBeVisible();
    const firstSkill = inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill').first();
    const firstSkillName = await firstSkill.innerText();
    await firstSkill.click();
    await expect(cardDetail).toHaveCount(0);
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText(firstSkillName);
    await expect(inspect).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.locator(".interaction-stage")).toHaveCount(0);
    await expect(opener).toBeFocused();
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
    expect(descriptionGeometry.visibleLines).toBeGreaterThanOrEqual(Math.min(4, descriptionGeometry.naturalLines));
    expect(descriptionGeometry.visibleLines).toBeLessThanOrEqual(5);
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
        expect(faceBox.width).toBeLessThanOrEqual(60);
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

const ins5Viewports = [
  { width: 390, height: 700, count: 4, equipmentCase: "empty", judgementCase: null, equipmentSlots: [], judgementCards: 0 },
  { width: 390, height: 844, count: 6, equipmentCase: "weapon", judgementCase: "single-lightning", equipmentSlots: ["weapon"], judgementCards: 1 },
  { width: 440, height: 894, count: 8, equipmentCase: "weaponArmor", judgementCase: "two", equipmentSlots: ["weapon", "armor"], judgementCards: 2 },
  { width: 440, height: 766, count: 10, equipmentCase: "multiple", judgementCase: "three", equipmentSlots: ["weapon", "armor", "defensiveHorse", "offensiveHorse"], judgementCards: 3, targetHero: "huang-yueying", playerNamePrefix: "长名称玩家 Inspector Player" },
];

for (const viewport of ins5Viewports) {
  test(`INS5 content-wraps the real Hero Inspector at ${viewport.width}×${viewport.height} (${viewport.count} seats)`, async ({ page }, testInfo) => {
    await loadFixture(page, viewport);
    const opener = page.locator('[data-player-anchor="p2"] .opponent-hero-target');
    await opener.click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const body = inspect.locator(":scope > .hero-focus-body");
    const portraitColumn = body.locator(":scope > .hero-focus-inspect-portrait-column");
    const portrait = portraitColumn.locator(":scope > .hero-focus-portrait");
    const caption = portraitColumn.locator(":scope > .hero-focus-inspect-identity-caption");
    const heroCaption = caption.locator(".hero-focus-identity-hero");
    const playerCaption = caption.locator(".hero-focus-identity-player");
    const main = body.locator(":scope > .hero-focus-inspect-main");
    const upper = main.locator(":scope > .hero-focus-inspect-upper");
    const identity = upper.locator(":scope > .hero-focus-identity");
    const skills = identity.locator('[aria-label="Public Skills"]');
    const judgement = upper.locator('[aria-label="Judgement Zone"]');
    const equipment = main.locator('[aria-label="Equipment"]');
    const judgementRow = judgement.locator(".opponent-inspection-slot-row");
    const equipmentRow = equipment.locator(".opponent-inspection-slot-row");
    await expect(inspect).toHaveAttribute("data-inspector-layout", "content-wrapped");
    await expect(inspect).not.toHaveAttribute("aria-modal", "true");
    await expect(inspect.locator(".hero-focus-heading, .hero-focus-inspect-close")).toHaveCount(0);
    await expect(page.getByRole("region", { name: `${viewport.playerNamePrefix ? `${viewport.playerNamePrefix} 2` : "Player 2"} opponent inspection` })).toBeVisible();
    await expect(opener).toHaveAttribute("aria-pressed", "true");
    await expect(opener).toHaveAttribute("aria-expanded", "true");
    if (viewport.playerNamePrefix) {
      await expect(playerCaption).toHaveText(`${viewport.playerNamePrefix} 2`);
      await expect(playerCaption).toHaveAttribute("aria-label", `${viewport.playerNamePrefix} 2`);
      await expect(heroCaption).toHaveText("Huang Yueying");
    } else {
      await expect(playerCaption).toHaveText("Player 2");
    }
    await expect(heroCaption).toBeVisible();
    await expect(upper.locator(".opponent-inspection-zone")).toHaveCount(2);
    await expect(main.locator(".opponent-inspection-zone[aria-label=\"Equipment\"]")).toHaveCount(1);
    await expect(identity.locator(".hero-focus-identity-hero, .hero-focus-identity-player")).toHaveCount(0);
    await expect(identity.locator(".hero-focus-identity-stats")).toHaveCount(1);
    await expect(identity.locator(".hero-focus-identity-stats small")).toHaveCount(2);
    await expect(judgementRow.locator("[data-inspector-slot]")).toHaveCount(2);
    await expect(equipmentRow.locator("[data-inspector-slot]")).toHaveCount(4);
    expect(await equipmentRow.locator("[data-inspector-slot]").evaluateAll((slots) => slots.map((slot) => slot.getAttribute("data-inspector-slot"))))
      .toEqual(["weapon", "armor", "defensiveHorse", "offensiveHorse"]);
    expect(await equipmentRow.locator(".opponent-inspection-card").evaluateAll((cards) => cards.map((card) => card.getAttribute("data-inspector-slot"))))
      .toEqual(viewport.equipmentSlots);
    await expect(equipmentRow.locator(".opponent-inspection-empty-slot")).toHaveCount(4 - viewport.equipmentSlots.length);
    await expect(judgementRow.locator(".opponent-inspection-card")).toHaveCount(Math.min(2, viewport.judgementCards));
    await expect(judgementRow.locator(".opponent-inspection-empty-slot")).toHaveCount(2 - Math.min(2, viewport.judgementCards));
    const overflow = judgement.locator("details.opponent-inspection-overflow");
    if (viewport.judgementCards > 2) {
      await expect(overflow.locator("summary")).toHaveText("+1");
      await expect(overflow.locator(".opponent-inspection-card")).not.toBeVisible();
    } else {
      await expect(overflow).toHaveCount(0);
    }

    const [inspectBox, bodyBox, portraitColumnBox, portraitBox, captionBox, mainBox, upperBox, identityBox, skillsBox, judgementBox, equipmentBox, panelBox, stageBox, dockBox, handBox, activityBox, seatBoxes] = await Promise.all([
      inspect.boundingBox(), body.boundingBox(), portraitColumn.boundingBox(), portrait.boundingBox(), caption.boundingBox(), main.boundingBox(), upper.boundingBox(), identity.boundingBox(),
      skills.boundingBox(), judgement.boundingBox(), equipment.boundingBox(),
      page.locator(".opponent-inspection-floating-shell").boundingBox(), page.locator('.interaction-stage[data-local-ui-mode="INSPECT"]').boundingBox(),
      page.locator(".local-player-dock").boundingBox(), page.locator(".local-hand-rail").boundingBox(), visibleBoundingBox(page.locator(".public-activity-chip")), seatGeometry(page),
    ]);
    for (const box of [inspectBox, bodyBox, portraitColumnBox, portraitBox, captionBox, mainBox, upperBox, identityBox, skillsBox, judgementBox, equipmentBox, panelBox, stageBox, dockBox, handBox]) expect(box).not.toBeNull();
    expect(Math.abs(panelBox.width - inspectBox.width)).toBeLessThanOrEqual(8);
    expect(inspectBox.width).toBeLessThanOrEqual(bodyBox.width + captionBox.width * 0.01 + 2);
    expect(Math.abs(panelBox.x + panelBox.width / 2 - (stageBox.x + stageBox.width / 2))).toBeLessThanOrEqual(1);
    expect(portraitColumnBox.x).toBeGreaterThanOrEqual(bodyBox.x - 1);
    expect(portraitColumnBox.x + portraitColumnBox.width).toBeLessThanOrEqual(bodyBox.x + bodyBox.width + 1);
    expect(portraitBox.width / bodyBox.width).toBeGreaterThanOrEqual(0.25);
    expect(portraitBox.width / bodyBox.width).toBeLessThanOrEqual(0.42);
    expect(portraitBox.height / portraitBox.width).toBeGreaterThanOrEqual(1.2);
    expect(portraitBox.height / portraitBox.width).toBeLessThanOrEqual(1.3);
    expect(captionBox.y).toBeGreaterThanOrEqual(portraitBox.y + portraitBox.height - 1);
    expect(captionBox.x).toBeGreaterThanOrEqual(portraitBox.x - 1);
    expect(captionBox.x + captionBox.width).toBeLessThanOrEqual(portraitBox.x + portraitBox.width + 1);
    expect(mainBox.x).toBeGreaterThanOrEqual(portraitColumnBox.x + portraitColumnBox.width);
    expect(mainBox.x + mainBox.width).toBeLessThanOrEqual(bodyBox.x + bodyBox.width + 1);
    expect(identityBox.y + identityBox.height).toBeLessThanOrEqual(upperBox.y + upperBox.height + 1);
    expect(Math.abs(identityBox.y - judgementBox.y)).toBeLessThanOrEqual(2);
    await expect(judgement.locator("h3")).toHaveText("Judgement");
    expect(equipmentBox.y).toBeGreaterThanOrEqual(upperBox.y + upperBox.height - 1);
    expect(equipmentBox.x).toBeGreaterThanOrEqual(portraitColumnBox.x + portraitColumnBox.width);
    expect(equipmentBox.x + equipmentBox.width).toBeLessThanOrEqual(bodyBox.x + bodyBox.width + 1);
    const statsBoxes = await identity.locator(".hero-focus-identity-stats small").evaluateAll((items) => items.map((item) => {
      const rect = item.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    expect(Math.abs((statsBoxes[0].y + statsBoxes[0].height / 2) - (statsBoxes[1].y + statsBoxes[1].height / 2))).toBeLessThanOrEqual(3);
    const skillButtons = await skills.locator(".hero-focus-inspect-skill").evaluateAll((buttons) => buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }));
    for (const [index, skillBox] of skillButtons.entries()) {
      expect(skillBox.width).toBeLessThanOrEqual(identityBox.width);
      expect(skillBox.y + skillBox.height).toBeLessThanOrEqual(upperBox.y + upperBox.height + 1);
      if (index > 0) expect(skillBox.y).toBeGreaterThanOrEqual(skillButtons[index - 1].y + skillButtons[index - 1].height);
    }
    expect(panelBox.x).toBeGreaterThanOrEqual(0);
    expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
    expect(panelBox.y).toBeGreaterThanOrEqual(0);
    expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);
    for (const seatBox of seatBoxes) expect(overlaps(panelBox, seatBox)).toBe(false);
    expect(overlaps(panelBox, dockBox)).toBe(false);
    expect(overlaps(panelBox, handBox)).toBe(false);
    if (activityBox) expect(overlaps(panelBox, activityBox)).toBe(false);
    if (viewport.count === 4) expect(panelBox.y).toBeGreaterThanOrEqual(Math.max(...seatBoxes.map(({ y, height }) => y + height)) + 11);
    const judgementSlots = await Promise.all((await judgementRow.locator("[data-inspector-slot]").all()).map((slot) => slot.boundingBox()));
    const equipmentSlots = await Promise.all((await equipmentRow.locator("[data-inspector-slot]").all()).map((slot) => slot.boundingBox()));
    const slotBoxes = [...judgementSlots, ...equipmentSlots];
    expect(slotBoxes.every(Boolean)).toBe(true);
    for (const box of slotBoxes) expect(box.height / box.width).toBeGreaterThanOrEqual(1.45);
    for (const box of slotBoxes) expect(box.height / box.width).toBeLessThanOrEqual(1.55);
    for (const rowBoxes of [judgementSlots, equipmentSlots]) {
      const ordered = [...rowBoxes].sort((a, b) => a.x - b.x);
      for (let index = 1; index < ordered.length; index += 1) {
        const gap = ordered[index].x - ordered[index - 1].x - ordered[index - 1].width;
        expect(gap).toBeGreaterThanOrEqual(1);
        expect(gap).toBeLessThanOrEqual(3);
      }
    }
    for (const slotBox of slotBoxes) {
      expect(slotBox.x).toBeGreaterThanOrEqual(inspectBox.x - 1);
      expect(slotBox.x + slotBox.width).toBeLessThanOrEqual(inspectBox.x + inspectBox.width + 1);
    }
    const switchButtons = await page.locator(".test-view-switch-button").evaluateAll((buttons) => buttons.map((button) => {
      const rect = button.getBoundingClientRect();
      const target = document.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2);
      return { x: rect.x, y: rect.y, width: rect.width, height: rect.height, hitMatches: Boolean(target && (target === button || button.contains(target))) };
    }));
    for (const buttonBox of switchButtons) expect(overlaps(panelBox, buttonBox)).toBe(false);
    if (viewport.playerNamePrefix) {
      expect(switchButtons.length).toBeGreaterThan(0);
      expect(switchButtons.every(({ hitMatches }) => hitMatches)).toBe(true);
    }
    if (viewport.count === 4) expect(panelBox.width).toBeLessThanOrEqual(262);
    else expect(panelBox.width).toBeLessThanOrEqual(238);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    await testInfo.attach("INS-5 inspector geometry", {
      body: Buffer.from(JSON.stringify({ viewport, panelBox, stageBox, bodyBox, portraitColumnBox, portraitBox, captionBox, mainBox, upperBox, identityBox, skillsBox, judgementBox, equipmentBox, judgementSlots, equipmentSlots, switchButtons }, null, 2)),
      contentType: "application/json",
    });
    await testInfo.attach("INS-5 inspector screenshot", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });

    if (viewport.judgementCards > 2) {
      await overflow.locator("summary").click();
      const overflowCard = overflow.locator('.opponent-inspection-card[aria-label="Explain Overindulgence"]');
      await expect(overflowCard).toHaveCount(1);
      const actionsBefore = await page.evaluate(() => window.__browserActions.length);
      await overflowCard.click();
      const cardDetails = inspect.locator('[data-inspector-card-detail="true"]');
      await expect(cardDetails).toBeVisible();
      await expect(cardDetails).toContainText("Overindulgence");
      expect(await page.evaluate(() => window.__browserActions.length)).toBe(actionsBefore);
    }
  });
}

test("INS5-F1 keeps full accessible names and wraps long labels in the compact phone Inspector", async ({ page }, testInfo) => {
  const viewport = { width: 390, height: 700 };
  await loadFixture(page, {
    ...viewport,
    count: 6,
    equipmentCase: "weapon",
    judgementCase: "single-lightning",
    targetHero: "zhuge-liang",
    playerNamePrefix: "长名字 Inspector Player With More Words",
  });
  const opener = page.locator('[data-player-anchor="p2"] .opponent-hero-target');
  await opener.click();
  const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
  const shell = page.locator(".opponent-inspection-floating-shell");
  const caption = inspect.locator(".hero-focus-inspect-identity-caption");
  const heroName = caption.locator(".hero-focus-identity-hero");
  const playerName = caption.locator(".hero-focus-identity-player");
  const wrappedSkill = inspect.getByRole("button", { name: "Show Empty Fortress Strategem description" });
  await expect(inspect).toBeVisible();
  await expect(inspect.locator(".hero-focus-heading, .hero-focus-inspect-close")).toHaveCount(0);
  await expect(page.getByRole("region", { name: "长名字 Inspector Player With More Words 2 opponent inspection" })).toBeVisible();
  await expect(heroName).toHaveText("Zhuge Liang");
  await expect(playerName).toHaveText("长名字 Inspector Player With More Words 2");
  await expect(playerName).toHaveAttribute("aria-label", "长名字 Inspector Player With More Words 2");
  await expect(playerName).toHaveAttribute("title", "长名字 Inspector Player With More Words 2");
  await expect(wrappedSkill).toBeVisible();

  const [heroGeometry, playerGeometry, skillGeometry, portraitBox, captionBox, bodyBox, panelBox, dockBox, handBox, activityBox, seatBoxes] = await Promise.all([
    heroName.evaluate((element) => ({ whiteSpace: getComputedStyle(element).whiteSpace, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth })),
    playerName.evaluate((element) => ({ whiteSpace: getComputedStyle(element).whiteSpace, scrollWidth: element.scrollWidth, clientWidth: element.clientWidth, accessibleName: element.getAttribute("aria-label") })),
    wrappedSkill.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      const rects = [...range.getClientRects()];
      const box = element.getBoundingClientRect();
      return {
        whiteSpace: getComputedStyle(element).whiteSpace,
        lines: rects.length,
        scrollWidth: element.scrollWidth,
        clientWidth: element.clientWidth,
        textBottom: Math.max(...rects.map((rect) => rect.bottom)),
        boxBottom: box.bottom,
      };
    }),
    inspect.locator(".hero-focus-portrait").boundingBox(),
    caption.boundingBox(),
    inspect.locator(".hero-focus-body").boundingBox(),
    shell.boundingBox(), page.locator(".local-player-dock").boundingBox(), page.locator(".local-hand-rail").boundingBox(), visibleBoundingBox(page.locator(".public-activity-chip")), seatGeometry(page),
  ]);

  expect(heroGeometry.whiteSpace).toBe("normal");
  expect(heroGeometry.scrollWidth).toBeLessThanOrEqual(heroGeometry.clientWidth + 1);
  expect(playerGeometry.whiteSpace).toBe("normal");
  expect(playerGeometry.scrollWidth).toBeLessThanOrEqual(playerGeometry.clientWidth + 1);
  expect(playerGeometry.accessibleName).toBe("长名字 Inspector Player With More Words 2");
  expect(skillGeometry.whiteSpace).toBe("normal");
  expect(skillGeometry.lines).toBeGreaterThan(1);
  expect(skillGeometry.scrollWidth).toBeLessThanOrEqual(skillGeometry.clientWidth + 1);
  expect(skillGeometry.textBottom).toBeLessThanOrEqual(skillGeometry.boxBottom + 1);
  expect(captionBox.y).toBeGreaterThanOrEqual(portraitBox.y + portraitBox.height - 1);
  expect(panelBox).not.toBeNull();
  expect(panelBox.x).toBeGreaterThanOrEqual(0);
  expect(panelBox.x + panelBox.width).toBeLessThanOrEqual(viewport.width);
  expect(panelBox.y).toBeGreaterThanOrEqual(0);
  expect(panelBox.y + panelBox.height).toBeLessThanOrEqual(viewport.height);
  expect(overlaps(panelBox, dockBox)).toBe(false);
  expect(overlaps(panelBox, handBox)).toBe(false);
  if (activityBox) expect(overlaps(panelBox, activityBox)).toBe(false);
  for (const seatBox of seatBoxes) expect(overlaps(panelBox, seatBox)).toBe(false);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

  const actionsBefore = await page.evaluate(() => window.__browserActions.length);
  await wrappedSkill.click();
  await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Empty Fortress Strategem");
  expect(await page.evaluate(() => window.__browserActions.length)).toBe(actionsBefore);
  await testInfo.attach("INS5-F1 wrapped inspector geometry", {
    body: Buffer.from(JSON.stringify({ viewport, heroGeometry, playerGeometry, skillGeometry, portraitBox, captionBox, bodyBox, panelBox, dockBox, handBox, activityBox, seatBoxes }, null, 2)),
    contentType: "application/json",
  });
  await testInfo.attach("INS5-F1 compact wrapped inspector screenshot", { body: await page.screenshot({ animations: "disabled" }), contentType: "image/png" });
});

for (const count of [6, 8, 10]) {
  test(`Inspect keeps public Hand count private and Judgment compact with ${count} seats`, async ({ page }) => {
    const viewport = { width: 390, height: 844 };
    await loadFixture(page, { ...viewport, count, equipmentCase: "empty" });
    await page.locator('[data-player-anchor="p3"] .opponent-hero-target').click();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    const judgment = inspect.locator('[aria-label="Judgement Zone"]');
    const judgmentCard = judgment.locator('.opponent-inspection-card[aria-label="Explain Lightning"]');
    const identity = inspect.locator(".hero-focus-identity");
    await expect(judgmentCard).toHaveCount(1);
    const [inspectBox, identityBox, judgmentBox, profileBox] = await Promise.all([
      inspect.boundingBox(),
      identity.boundingBox(),
      judgment.boundingBox(),
      inspect.locator(".hero-focus-inspect-profile").boundingBox(),
    ]);
    expect(inspectBox).not.toBeNull();
    expect(identityBox).not.toBeNull();
    expect(profileBox).not.toBeNull();
    expect(Math.abs(judgmentBox.y - profileBox.y)).toBeLessThanOrEqual(2);
    expect(judgmentBox.x).toBeGreaterThanOrEqual(identityBox.x + identityBox.width - 1);
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
    await expect(judgment.locator(".opponent-inspection-empty-slot")).toHaveCount(2);
    await expect(judgment.locator(".opponent-inspection-card")).toHaveCount(0);
    const [zoneBox, detailsBox, upperBox, bodyBox, equipmentBox] = await Promise.all([
      judgment.boundingBox(), inspect.locator(".hero-focus-inspect-details").boundingBox(),
      inspect.locator(".hero-focus-inspect-upper").boundingBox(), inspect.locator(".hero-focus-body").boundingBox(),
      inspect.locator('[aria-label="Equipment"]').boundingBox(),
    ]);
    for (const box of [zoneBox, detailsBox, upperBox, bodyBox, equipmentBox]) expect(box).not.toBeNull();
    expect(detailsBox).not.toBeNull();
    expect(Math.abs(zoneBox.y - upperBox.y)).toBeLessThanOrEqual(2);
    expect(equipmentBox.y).toBeGreaterThanOrEqual(upperBox.y + upperBox.height - 1);
    expect(equipmentBox.x).toBeGreaterThanOrEqual(bodyBox.x + bodyBox.width * 0.24);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
  });
}

test("Inspect shows a compact None state when public Hero skills are unavailable", async ({ page }) => {
  await loadFixture(page, { width: 390, height: 844, targetHero: "unknown-fixture-hero", equipmentCase: "empty" });
  await page.locator('[data-player-anchor="p2"] .opponent-hero-target').click();
  const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
  const skills = inspect.locator('[aria-label="Public Skills"]');
  await expect(inspect.locator(".hero-focus-inspect-identity-caption .hero-focus-identity-hero")).toContainText("Unknown Hero");
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

  const inspectPlayerTwo = page.getByRole("button", { name: "Inspect Player 2", exact: true });
  await inspectPlayerTwo.click();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await expect(inspectPlayerTwo).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
  await inspectPlayerTwo.click();
  await expect(panel).toBeVisible();
  await expect(inspectPlayerTwo).toHaveAttribute("aria-pressed", "true");
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
  await crossbow.click();
  await expect(cardDetail).toBeVisible();
  await expect(cardDetail).toContainText("Zhuge Crossbow");
  await expect(crossbow).toHaveAttribute("aria-pressed", "true");
  const publicSkill = panel.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill').first();
  const publicSkillName = await publicSkill.innerText();
  await publicSkill.click();
  await expect(cardDetail).toHaveCount(0);
  await expect(panel.locator(".hero-focus-inspect-skill-name")).toHaveText(publicSkillName);
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();

  await page.getByRole("button", { name: "Inspect Player 3", exact: true }).click();
  await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
  await expect(page.getByRole("button", { name: "Inspect Player 3", exact: true })).toHaveAttribute("aria-pressed", "true");
  await expect(panel.locator("[data-inspector-card-detail]")).toHaveCount(0);
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('.opponent-player-card[data-player-anchor="p3"]')).not.toHaveClass(/selected-target/);
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(1);

  await page.getByRole("button", { name: "Inspect Player 3", exact: true }).click();
  await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Inspect Player 3", exact: true })).toHaveAttribute("aria-pressed", "false");
  await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
  await expect(page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" })).toBeEnabled();
  expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);
});

test("INS5-F1-R phone Inspector preserves target selection and Confirm through touch inspection", async ({ browser }, testInfo) => {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  try {
    await loadFixture(page, { ...viewport, state: "ordinary-turn", equipmentCase: "weapon" });
    const currentAction = await page.evaluate(() => window.__browserRoom.currentAction);
    const selectedAttack = page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card');
    await selectedAttack.tap();
    const targetTwo = page.getByRole("button", { name: "Select Player 2", exact: true });
    await targetTwo.tap();
    const confirm = page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" });
    await expect(confirm).toBeEnabled();

    const openerTwo = page.locator('[data-player-anchor="p2"] .opponent-hero-target');
    await openerTwo.tap();
    const panel = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-panel');
    await expect(panel).toHaveAttribute("data-inspect-player-id", "p2");
    await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
    await expect(confirm).toBeEnabled();
    await panel.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Zhuge Crossbow"]').tap();
    await expect(panel.locator('[data-inspector-card-detail="true"]')).toContainText("Zhuge Crossbow");
    await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
    await expect(confirm).toBeEnabled();

    const openerThree = page.getByRole("button", { name: "Inspect Player 3", exact: true });
    await openerThree.tap();
    await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
    await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
    await expect(page.locator('.opponent-player-card[data-player-anchor="p3"]')).not.toHaveClass(/selected-target/);
    await expect(confirm).toBeEnabled();
    expect(await page.evaluate(() => window.__browserRoom.currentAction)).toEqual(currentAction);
    expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);

    await openerThree.tap();
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
    await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
    await expect(confirm).toBeEnabled();
    await openerThree.tap();
    await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
    await openerThree.focus();
    await page.keyboard.press("Escape");
    await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
    await expect(openerThree).toBeFocused();
    await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
    await expect(confirm).toBeEnabled();
    await testInfo.attach("INS5-F1-R active phone selection Inspector screenshot 390x844", {
      body: await page.screenshot({ animations: "disabled" }),
      contentType: "image/png",
    });
  } finally {
    await context.close();
  }
});

test("INS5-2 five-seat phone Inspector follows each actual Hero Seat across mobile viewports", async ({ browser }, testInfo) => {
  const viewports = [
    { width: 390, height: 700 },
    { width: 390, height: 844 },
    { width: 440, height: 766 },
    { width: 440, height: 894 },
    { width: 480, height: 900 },
  ];
  const measurements = [];
  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    const page = await context.newPage();
    try {
      await loadFixture(page, { ...viewport, count: 5, state: "rest", equipmentCase: "ins5PhoneDetails" });
      const panel = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-panel');
      for (const id of ["p4", "p2", "p5", "p3"]) {
        const hero = page.locator(`.player-board [data-player-anchor="${id}"] .opponent-hero-target`);
        await hero.tap();
        await expect(panel).toHaveAttribute("data-inspect-player-id", id);
        await expect(page.locator(".opponent-inspection-panel")).toHaveCount(1);
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const geometry = await page.evaluate((subjectId) => {
          const rect = (element) => {
            if (!element) return null;
            const { x, y, width, height, left, right, top, bottom } = element.getBoundingClientRect();
            return { x, y, width, height, left, right, top, bottom };
          };
          const visible = (element) => {
            const style = getComputedStyle(element);
            const box = element.getBoundingClientRect();
            return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0
              && box.width > 0 && box.height > 0;
          };
          const table = document.querySelector(".play-table");
          const layer = document.querySelector(".opponent-inspection-layer");
          const shell = document.querySelector(".opponent-inspection-floating-shell");
          const subject = [...document.querySelectorAll(".player-board [data-player-anchor]")]
            .find((seat) => seat.dataset.playerAnchor === subjectId);
          const shellBox = rect(shell);
          const subjectBox = rect(subject);
          const obstacleSelector = [
            ".public-activity-chip", ".stage-system-cluster", ".visible-countdown",
            "[data-public-card-announcement='true']",
            ".public-card-journey-card[data-public-card-journey-phase='reveal']",
            ".public-card-journey-card[data-public-card-journey-phase='move']",
            ".harvest-choice-panel", ".target-card-picker-overlay", ".target-card-picker-panel",
          ].join(",");
          return {
            viewport: { width: innerWidth, height: innerHeight },
            subjectId,
            side: subject?.dataset.sideColumn,
            seat: subjectBox,
            layer: rect(layer),
            shell: shellBox,
            verticalCenterDelta: shellBox && subjectBox
              ? Math.abs((shellBox.top + shellBox.height / 2) - (subjectBox.top + subjectBox.height / 2))
              : null,
            dock: rect(document.querySelector(".local-player-dock")),
            hand: rect(document.querySelector(".local-hand-rail")),
            seats: [...document.querySelectorAll(".player-board [data-player-anchor]")].map(rect),
            obstacles: [...table.querySelectorAll(obstacleSelector)].filter(visible).map(rect),
            documentWidth: document.documentElement.scrollWidth,
          };
        }, id);
        expect(geometry.shell, JSON.stringify(geometry)).not.toBeNull();
        expect(geometry.shell.height, JSON.stringify(geometry)).toBeGreaterThan(0);
        expect(geometry.shell.left).toBeGreaterThanOrEqual(0);
        expect(geometry.shell.right).toBeLessThanOrEqual(viewport.width);
        expect(geometry.shell.top).toBeGreaterThanOrEqual(0);
        expect(geometry.shell.bottom).toBeLessThanOrEqual(viewport.height);
        expect(geometry.documentWidth).toBeLessThanOrEqual(viewport.width);
        expect(geometry.verticalCenterDelta, JSON.stringify(geometry)).toBeLessThanOrEqual(24);
        if (geometry.side === "left") expect(geometry.shell.left).toBeGreaterThanOrEqual(geometry.seat.right + 2);
        else expect(geometry.shell.right).toBeLessThanOrEqual(geometry.seat.left - 2);
        for (const seat of geometry.seats) expect(overlaps(geometry.shell, seat)).toBe(false);
        expect(overlaps(geometry.shell, geometry.dock)).toBe(false);
        expect(overlaps(geometry.shell, geometry.hand)).toBe(false);
        for (const obstacle of geometry.obstacles) expect(overlaps(geometry.shell, obstacle)).toBe(false);
        measurements.push({ viewport, ...geometry });
      }

      const lastHero = page.locator('.player-board [data-player-anchor="p3"] .opponent-hero-target');
      await lastHero.tap();
      await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
      await lastHero.tap();
      await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
      if (viewport.width === 390 && viewport.height === 700) {
        await page.setViewportSize({ width: 390, height: 844 });
        await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        const resized = await page.evaluate(() => {
          const seat = [...document.querySelectorAll(".player-board [data-player-anchor]")]
            .find((element) => element.dataset.playerAnchor === "p3");
          const shell = document.querySelector(".opponent-inspection-floating-shell");
          const seatBox = seat?.getBoundingClientRect();
          const shellBox = shell?.getBoundingClientRect();
          return {
            seatCenter: seatBox ? seatBox.top + seatBox.height / 2 : null,
            shellCenter: shellBox ? shellBox.top + shellBox.height / 2 : null,
            shell: shellBox ? { left: shellBox.left, top: shellBox.top, right: shellBox.right, bottom: shellBox.bottom } : null,
            viewport: { width: innerWidth, height: innerHeight },
          };
        });
        expect(resized.viewport).toEqual({ width: 390, height: 844 });
        expect(Math.abs(resized.shellCenter - resized.seatCenter), JSON.stringify(resized)).toBeLessThanOrEqual(24);
      }
      await lastHero.focus();
      await page.keyboard.press("Escape");
      await expect(page.locator(".opponent-inspection-panel")).toHaveCount(0);
      await expect(lastHero).toBeFocused();
      await lastHero.tap();
      await expect(panel).toHaveAttribute("data-inspect-player-id", "p3");
      const judgementSlots = panel.locator('[aria-label="Judgement Zone"] .opponent-inspection-card, [aria-label="Judgement Zone"] .opponent-inspection-empty-slot');
      const equipmentSlots = panel.locator('[aria-label="Equipment"] .opponent-inspection-card, [aria-label="Equipment"] .opponent-inspection-empty-slot');
      await expect(judgementSlots).toHaveCount(2);
      await expect(equipmentSlots).toHaveCount(4);
      await testInfo.attach(`INS5-2 mobile anchor ${viewport.width}x${viewport.height}`, {
        body: Buffer.from(JSON.stringify(measurements.filter((entry) => entry.viewport.width === viewport.width && entry.viewport.height === viewport.height), null, 2)),
        contentType: "application/json",
      });
      if (viewport.width === 390 && viewport.height === 700) {
        await testInfo.attach("INS5-2 compact five-seat mobile screenshot", {
          body: await page.screenshot({ animations: "disabled" }),
          contentType: "image/png",
        });
      }
    } finally {
      await context.close();
    }
  }
  console.log("INS5-2 FIVE-SEAT MOBILE ANCHORS", JSON.stringify(measurements.map(({ viewport, subjectId, side, shell, seat, verticalCenterDelta }) => ({
    viewport,
    subjectId,
    side,
    shell: { left: shell.left, top: shell.top, width: shell.width, height: shell.height },
    seat: { left: seat.left, top: seat.top, width: seat.width, height: seat.height },
    verticalCenterDelta,
  }))));
  expect(measurements).toHaveLength(20);
});

test("INS5-2 five-seat Inspector preserves a live local target and Card Details through touch", async ({ browser }) => {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  try {
    await loadFixture(page, {
      ...viewport,
      count: 5,
      state: "ordinary-turn",
      equipmentCase: "ins5PhoneLongRules",
      targetHero: "cao-cao",
    });
    const currentAction = await page.evaluate(() => window.__browserRoom.currentAction);
    await page.locator('[data-hand-card-id="browser-ordinary-5"] .game-card').tap();
    await page.getByRole("button", { name: "Select Player 2", exact: true }).tap();
    const confirm = page.locator('[data-console-surface="local-operation"] button.primary', { hasText: "Confirm" });
    await expect(confirm).toBeEnabled();
    await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);

    const inspectTwo = page.locator('.player-board [data-player-anchor="p2"] .opponent-hero-target');
    await inspectTwo.tap();
    const panel = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-panel');
    await expect(panel).toHaveAttribute("data-inspect-player-id", "p2");
    const entourage = panel.getByRole("button", { name: "Show Entourage description" });
    await entourage.tap();
    const skillDescription = panel.locator(".hero-focus-inspect-skill-description");
    await expect(skillDescription).toBeVisible();
    await scrollInspectorDetailsToBottom(panel.locator(".hero-focus-inspect-details"));
    const skillFinalText = await touchScrollToBottom(page, skillDescription);
    expect(skillFinalText.visible).toBe(true);

    const frostSword = panel.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Frost Sword"]');
    await frostSword.tap();
    const cardRules = panel.locator(".hero-focus-inspect-card-rules");
    await expect(cardRules).toContainText("Frost Sword has an Attack Range of 2.");
    await scrollInspectorDetailsToBottom(panel.locator(".hero-focus-inspect-details"));
    const cardFinalText = await touchScrollToBottom(page, cardRules);
    expect(cardFinalText.visible).toBe(true);
    await expect(confirm).toBeEnabled();
    await expect(page.locator('.opponent-player-card[data-player-anchor="p2"]')).toHaveClass(/selected-target/);
    await expect(confirm).toBeEnabled();
    expect(await page.evaluate(() => window.__browserRoom.currentAction)).toEqual(currentAction);
    expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "play_card" || action === "trigger"))).toEqual([]);
  } finally {
    await context.close();
  }
});

test("INS5-2 five-seat Inspector stays clear of an active Harvest choice and its touch controls", async ({ browser }) => {
  const viewport = { width: 390, height: 844 };
  const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  try {
    await loadFixture(page, { ...viewport, count: 5, state: "bumper-harvest-choosing" });
    await page.evaluate(() => window.__updateBrowserRoom((room) => ({
      ...room,
      meId: "p2",
      isMyAction: true,
      phase: "response",
    })));
    const pool = page.locator(".harvest-choice-panel--actor");
    await expect(pool).toBeVisible();
    const poolCardsBefore = await pool.locator(".harvest-card-choice").count();
    const inspectorOpener = page.locator('.player-board [data-player-anchor="p4"] .opponent-hero-target');
    await inspectorOpener.tap();
    const panel = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .opponent-inspection-panel');
    await expect(panel).toHaveAttribute("data-inspect-player-id", "p4");
    const [shellBox, poolBox] = await Promise.all([
      page.locator(".opponent-inspection-floating-shell").boundingBox(),
      pool.boundingBox(),
    ]);
    expect(shellBox).not.toBeNull();
    expect(poolBox).not.toBeNull();
    expect(overlaps(shellBox, poolBox)).toBe(false);
    expect(await pool.locator(".harvest-card-choice").count()).toBe(poolCardsBefore);

    const choice = pool.locator(".harvest-card-choice").first();
    const select = choice.locator(".harvest-card-select");
    await select.tap();
    await expect(choice).toHaveAttribute("data-harvest-card-state", "selected");
    const confirm = pool.locator(".harvest-confirm-row button.primary");
    await expect(confirm).toBeEnabled();
    expect(await page.evaluate(() => window.__browserActions.filter(({ action }) => action === "choose_harvest"))).toEqual([]);
  } finally {
    await context.close();
  }
});

test("Inspect during Negation leaves the authoritative response state unchanged", async ({ page }) => {
  await loadFixture(page, { state: "negation", width: 480, height: 900 });
  const currentAction = await page.evaluate(() => window.__browserRoom.currentAction);
  const pendingNegation = await page.evaluate(() => window.__browserRoom.pendingNegation);
  const actionsBefore = await page.evaluate(() => window.__browserActions.length);
  const activityChip = page.locator(".public-activity-chip");
  const responseTimer = page.locator(".visible-countdown").first();
  const chipBefore = await visibleBoundingBox(activityChip);
  const timerBefore = (await responseTimer.count()) > 0 ? await visibleBoundingBox(responseTimer) : null;
  expect(currentAction).toMatchObject({ kind: "response", requirement: "negate" });

  await page.locator('[data-player-anchor="p3"] .opponent-hero-target').click();
  const stage = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"]');
  const inspect = stage.locator('.hero-focus-inspect[data-inspect-player-id="p3"]');
  await expect(inspect).toBeVisible();
  const [panelBox, chipAfter, timerAfter] = await Promise.all([
    page.locator(".opponent-inspection-floating-shell").boundingBox(),
    visibleBoundingBox(activityChip),
    (await responseTimer.count()) > 0 ? visibleBoundingBox(responseTimer) : null,
  ]);
  expect(panelBox).not.toBeNull();
  if (chipBefore && chipAfter) {
    expect(overlaps(panelBox, chipAfter)).toBe(false);
    expect(Math.abs(chipAfter.x - chipBefore.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(chipAfter.y - chipBefore.y)).toBeLessThanOrEqual(1);
  }
  if (timerBefore && timerAfter) {
    expect(overlaps(panelBox, timerAfter)).toBe(false);
    expect(Math.abs(timerAfter.x - timerBefore.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(timerAfter.y - timerBefore.y)).toBeLessThanOrEqual(1);
  }
  expect(await page.evaluate(() => window.__browserRoom.currentAction)).toEqual(currentAction);
  expect(await page.evaluate(() => window.__browserRoom.pendingNegation)).toEqual(pendingNegation);
  await page.getByRole("button", { name: "Inspect Player 3", exact: true }).click();

  await expect(page.locator(".interaction-stage")).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserRoom.currentAction)).toEqual(currentAction);
  expect(await page.evaluate(() => window.__browserRoom.pendingNegation)).toEqual(pendingNegation);
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

for (const viewport of [{ width: 390, height: 700 }, { width: 440, height: 766 }]) {
  test(`Inspector skill and equipment details activate with touch at ${viewport.width}×${viewport.height}`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    try {
      await loadFixture(page, { ...viewport, targetHero: "daqiao", equipmentCase: "inspectorNamedDetails" });
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
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
    } finally {
      await context.close();
    }
  });
}

test("INS5-F1-R captures the four-seat phone baseline for Cao Cao, Entourage, and Serpent Spear", async ({ browser }, testInfo) => {
  const viewport = { width: 390, height: 700 };
  const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
  const page = await context.newPage();
  try {
    await loadFixture(page, { ...viewport, count: 4, targetHero: "cao-cao", equipmentCase: "ins5PhoneDetails" });
    const opener = page.locator('[data-player-anchor="p2"] .opponent-hero-target');
    await opener.tap();
    const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
    await expect(inspect.locator(".hero-focus-identity-hero")).toHaveText("Cao Cao");
    await expect(inspect.locator('[aria-label="Public Skills"] .hero-focus-inspect-skill')).toHaveCount(2);
    await expect(inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Serpent Spear"]')).toHaveCount(1);

    const attachState = async (name) => {
      const geometry = await inspectorWidthAndScrollGeometry(page);
      const { metrics } = geometry;
      expect(metrics.main.rect.left - metrics.portrait.rect.right).toBeGreaterThanOrEqual(2);
      expect(geometry.equipmentRightGutter).toBeLessThanOrEqual(8);
      expect(Math.abs(metrics.details.rect.width - geometry.inspectorContentWidth)).toBeLessThanOrEqual(4);
      expect(geometry.protectedCollisions, JSON.stringify({ name, geometry })).toEqual([]);
      for (const key of ["skillDescription", "cardRules"]) {
        if (metrics[key]) expect(metrics[key].rect.width).toBeGreaterThanOrEqual(geometry.inspectorContentWidth * 0.9);
      }
      await testInfo.attach(`INS5-F1-R before ${name} geometry 390x700`, {
        body: JSON.stringify(geometry, null, 2),
        contentType: "application/json",
      });
      await testInfo.attach(`INS5-F1-R before ${name} screenshot 390x700`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    };

    await attachState("ordinary Cao Cao Inspector");
    await inspect.getByRole("button", { name: "Show Entourage description" }).tap();
    await expect(inspect.locator(".hero-focus-inspect-skill-name")).toHaveText("Entourage");
    await scrollInspectorDetailsToBottom(inspect.locator(".hero-focus-inspect-details"));
    await touchScrollToBottom(page, inspect.locator(".hero-focus-inspect-skill-description"));
    await attachState("Entourage detail");
    await inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Serpent Spear"]').tap();
    await expect(inspect.locator(".hero-focus-inspect-card-name")).toHaveText("Serpent Spear");
    await scrollInspectorDetailsToBottom(inspect.locator(".hero-focus-inspect-details"));
    await touchScrollToBottom(page, inspect.locator(".hero-focus-inspect-card-rules"));
    await attachState("Serpent Spear detail");
  } finally {
    await context.close();
  }
});

test("INS5-F1-R captures mobile Inspector width allocation across four, six, eight, and ten seats", async ({ browser }, testInfo) => {
  test.setTimeout(120_000);
  const scenarios = [
    { count: 4, viewport: { width: 390, height: 844 } },
    { count: 4, viewport: { width: 440, height: 766 } },
    { count: 4, viewport: { width: 440, height: 894 } },
    { count: 4, viewport: { width: 480, height: 900 } },
    { count: 6, viewport: { width: 390, height: 844 } },
    { count: 6, viewport: { width: 440, height: 894 } },
    { count: 8, viewport: { width: 440, height: 894 } },
    { count: 8, viewport: { width: 480, height: 900 } },
    { count: 10, viewport: { width: 480, height: 900 } },
  ];
  for (const scenario of scenarios) {
    const context = await browser.newContext({ ...scenario.viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    try {
      const page = await context.newPage();
      await loadFixture(page, { ...scenario.viewport, count: scenario.count, targetHero: "cao-cao", equipmentCase: "ins5PhoneDetails" });
      await page.locator('[data-player-anchor="p2"] .opponent-hero-target').tap();
      const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
      await expect(inspect).toBeVisible();
      const geometry = await inspectorWidthAndScrollGeometry(page);
      const { metrics } = geometry;
      expect(metrics.main.rect.left - metrics.portrait.rect.right).toBeGreaterThanOrEqual(2);
      expect(geometry.equipmentRightGutter).toBeLessThanOrEqual(8);
      expect(Math.abs(metrics.details.rect.width - geometry.inspectorContentWidth)).toBeLessThanOrEqual(4);
      expect(geometry.protectedCollisions, JSON.stringify({ scenario, geometry })).toEqual([]);
      await testInfo.attach(`INS5-F1-R before ${scenario.count}-seat ${scenario.viewport.width}x${scenario.viewport.height} geometry`, {
        body: JSON.stringify({ scenario, geometry }, null, 2),
        contentType: "application/json",
      });
      await testInfo.attach(`INS5-F1-R before ${scenario.count}-seat ${scenario.viewport.width}x${scenario.viewport.height} screenshot`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(scenario.viewport.width);
    } finally {
      await context.close();
    }
  }
});

test("H2-G3-F2 separates phone Inspector stats from skills and Judgement for six and eight seats", async ({ browser }, testInfo) => {
  test.setTimeout(90_000);
  const scenarios = [
    { count: 6, width: 390, height: 700, targetHero: "simayi" },
    { count: 8, width: 390, height: 844, targetHero: "zhen-ji" },
  ];
  for (const scenario of scenarios) {
    const context = await browser.newContext({ viewport: { width: scenario.width, height: scenario.height }, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    try {
      const page = await context.newPage();
      await loadFixture(page, { ...scenario, equipmentCase: "miniatureSet", judgementCase: "two" });
      await page.locator('[data-player-anchor="p2"] .opponent-hero-target').tap();
      const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
      await expect(inspect).toBeVisible();
      await expect(inspect.locator("[data-public-hand-count]")).toHaveText("Hand · 2");
      await expect(inspect.locator('[aria-label="Judgement Zone"] .opponent-inspection-card')).toHaveCount(2);
      await expect(inspect.locator('[aria-label="Equipment"] .opponent-inspection-card')).toHaveCount(4);

      const geometry = await inspect.evaluate((root) => {
        const box = (element) => {
          if (!element) return null;
          const { left, top, right, bottom, width, height } = element.getBoundingClientRect();
          return { left, top, right, bottom, width, height };
        };
        const main = root.querySelector(".hero-focus-inspect-main");
        const upper = root.querySelector(".hero-focus-inspect-upper");
        const statsRow = root.querySelector(".hero-focus-identity-line");
        const stats = root.querySelector(".hero-focus-identity-stats");
        const skills = root.querySelector(".hero-focus-inspect-public-skills");
        const judgement = root.querySelector(".hero-focus-inspect-judgement");
        const equipment = root.querySelector(".hero-focus-inspect-equipment");
        return {
          main: box(main),
          upper: box(upper),
          statsRow: box(statsRow),
          stats: { ...box(stats), scrollWidth: stats?.scrollWidth, clientWidth: stats?.clientWidth },
          statTexts: [...(stats?.querySelectorAll("small") ?? [])].map((element) => box(element)),
          skills: box(skills),
          judgement: box(judgement),
          equipment: box(equipment),
          grid: upper ? getComputedStyle(upper).gridTemplateAreas : null,
        };
      });
      await testInfo.attach(`H2-G3-F2 ${scenario.count}-seat Inspector geometry`, {
        body: JSON.stringify({ scenario, geometry }, null, 2),
        contentType: "application/json",
      });
      await testInfo.attach(`H2-G3-F2 ${scenario.count}-seat Inspector screenshot`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });

      expect(Math.abs(geometry.statsRow.left - geometry.main.left)).toBeLessThanOrEqual(1);
      expect(Math.abs(geometry.statsRow.right - geometry.main.right)).toBeLessThanOrEqual(1);
      expect(geometry.statsRow.top).toBeGreaterThanOrEqual(geometry.upper.top);
      expect(geometry.statsRow.bottom).toBeLessThanOrEqual(geometry.upper.bottom);
      expect(geometry.stats.scrollWidth).toBeLessThanOrEqual(geometry.stats.clientWidth + 1);
      for (const text of geometry.statTexts) {
        expect(text.top).toBeGreaterThanOrEqual(geometry.statsRow.top);
        expect(text.bottom).toBeLessThanOrEqual(geometry.statsRow.bottom);
        expect(text.left).toBeGreaterThanOrEqual(geometry.statsRow.left);
        expect(text.right).toBeLessThanOrEqual(geometry.statsRow.right - 1);
      }
      expect(geometry.skills.top).toBeGreaterThanOrEqual(geometry.statsRow.bottom + 2);
      expect(geometry.skills.left).toBeGreaterThanOrEqual(geometry.main.left);
      expect(geometry.skills.right).toBeLessThanOrEqual(geometry.main.right);
      expect(geometry.judgement.top).toBeGreaterThanOrEqual(geometry.statsRow.bottom + 2);
      expect(geometry.judgement.left).toBeGreaterThanOrEqual(geometry.main.left);
      expect(geometry.judgement.right).toBeLessThanOrEqual(geometry.main.right);
      expect(geometry.judgement.bottom).toBeLessThanOrEqual(geometry.upper.bottom);
      expect(Math.min(geometry.skills.right, geometry.judgement.right) - Math.max(geometry.skills.left, geometry.judgement.left)).toBeLessThanOrEqual(0);
      expect(geometry.equipment.top).toBeGreaterThanOrEqual(geometry.upper.bottom);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(scenario.width);
    } finally {
      await context.close();
    }
  }
});

test("INS5-F1-R long phone skill and card details scroll to their final sentence", async ({ browser }, testInfo) => {
  for (const viewport of [{ width: 390, height: 700 }, { width: 440, height: 766 }]) {
    const context = await browser.newContext({ viewport, hasTouch: true, isMobile: true, deviceScaleFactor: 3 });
    try {
      const page = await context.newPage();
      await loadFixture(page, { ...viewport, count: 4, targetHero: "cao-cao", equipmentCase: "ins5PhoneLongRules" });
      await page.locator('[data-player-anchor="p2"] .opponent-hero-target').tap();
      const inspect = page.locator('.interaction-stage[data-local-ui-mode="INSPECT"] .hero-focus-inspect');
      await inspect.getByRole("button", { name: "Show Entourage description" }).tap();
      const skill = inspect.locator(".hero-focus-inspect-skill-description");
      await expect(skill).toBeVisible();
      await scrollInspectorDetailsToBottom(inspect.locator(".hero-focus-inspect-details"));
      const skillFinalText = await touchScrollToBottom(page, skill);
      const skillGeometry = await inspectorWidthAndScrollGeometry(page);
      expect(Math.abs(skillGeometry.metrics.details.rect.width - skillGeometry.inspectorContentWidth)).toBeLessThanOrEqual(4);
      expect(skillGeometry.metrics.skillDescription.rect.width).toBeGreaterThanOrEqual(skillGeometry.inspectorContentWidth * 0.9);
      expect(skillGeometry.protectedCollisions).toEqual([]);

      const frostSword = inspect.locator('[aria-label="Equipment"] .opponent-inspection-card[aria-label="Explain Frost Sword"]');
      await frostSword.tap();
      const cardRules = inspect.locator(".hero-focus-inspect-card-rules");
      await expect(cardRules).toContainText("Frost Sword has an Attack Range of 2.");
      await scrollInspectorDetailsToBottom(inspect.locator(".hero-focus-inspect-details"));
      const cardFinalText = await touchScrollToBottom(page, cardRules);
      if (viewport.width === 390) expect(cardFinalText.didScroll).toBe(true);
      const cardGeometry = await inspectorWidthAndScrollGeometry(page);
      expect(Math.abs(cardGeometry.metrics.details.rect.width - cardGeometry.inspectorContentWidth)).toBeLessThanOrEqual(4);
      expect(cardGeometry.metrics.cardRules.rect.width).toBeGreaterThanOrEqual(cardGeometry.inspectorContentWidth * 0.9);
      expect(cardGeometry.protectedCollisions).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);
      await testInfo.attach(`INS5-F1-R final phone detail scroll metrics ${viewport.width}x${viewport.height}`, {
        body: JSON.stringify({ viewport, skillFinalText, skillGeometry, cardFinalText, cardGeometry }, null, 2),
        contentType: "application/json",
      });
      await testInfo.attach(`INS5-F1-R final card detail phone screenshot ${viewport.width}x${viewport.height}`, {
        body: await page.screenshot({ animations: "disabled" }),
        contentType: "image/png",
      });
    } finally {
      await context.close();
    }
  }
});
