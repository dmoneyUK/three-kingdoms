import { expect, test } from "@playwright/test";

const API = "http://127.0.0.1:3137";
const card = (kind, id, suit, rank) => ({ kind, id, suit, rank });
const revealedCards = [
  card("Attack", "real-stargazing-attack", "♠", "A"),
  card("Dodge", "real-stargazing-dodge", "♣", "2"),
  card("Peach", "real-stargazing-peach", "♥", "Q"),
  card("Duel", "real-stargazing-duel", "♦", "K"),
];

async function seedStargazingRoom(request) {
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: {
      phase: "play",
      turnSeat: 0,
      players: [
        { name: "TURN PLAYER", role: "Lord", hero: "guan-yu", hp: 4, maxHp: 4, hand: [] },
        { name: "ZHU GE LIANG", role: "Loyalist", hero: "zhuge-liang", hp: 3, maxHp: 3, hand: [] },
        { name: "OBSERVER", role: "Rebel", hero: "sun-quan", hp: 4, maxHp: 4, hand: [] },
        { name: "FOURTH", role: "Renegade", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
      ],
      deck: [
        ...revealedCards,
        card("Negation", "real-stargazing-next-a", "♠", "5"),
        card("Attack", "real-stargazing-next-b", "♥", "8"),
      ],
    },
  });
  if (!response.ok()) throw new Error(`Stargazing room seed failed: ${await response.text()}`);
  return response.json();
}

async function openPlayer(page, seed, playerIndex, viewport) {
  const member = seed.players[playerIndex];
  await page.setViewportSize(viewport);
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: seed.code, token: member.token, name: member.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  return member;
}

async function roomView(request, seed, playerIndex) {
  const member = seed.players[playerIndex];
  const response = await request.get(`${API}/api/rooms?code=${seed.code}&token=${member.token}`);
  expect(response.ok()).toBeTruthy();
  return response.json();
}

function postedAction(page, action) {
  return page.waitForResponse((response) => {
    if (response.url() !== `${API}/api/rooms` || response.request().method() !== "POST") return false;
    try { return JSON.parse(response.request().postData() ?? "{}").action === action; }
    catch { return false; }
  });
}

async function openRealStargazingDecision({ page, request, viewport }) {
  const seed = await seedStargazingRoom(request);
  const turnPage = page;
  const turnPlayer = await openPlayer(turnPage, seed, 0, viewport);
  const turnDock = turnPage.locator(`.local-player-dock[data-player-anchor="${turnPlayer.id}"]`);
  const turn = await roomView(request, seed, 0);
  expect(turn.isMyAction).toBe(true);
  expect(turn.currentAction.legalActions).toContain("end_turn");

  const endTurnResponse = postedAction(turnPage, "end_turn");
  await turnDock.getByRole("button", { name: "End", exact: true }).click();
  const ended = await endTurnResponse;
  expect(ended.ok()).toBeTruthy();

  const actorPage = await page.context().newPage();
  const actor = await openPlayer(actorPage, seed, 1, viewport);
  const offered = await roomView(request, seed, 1);
  expect(offered.isMyAction).toBe(true);
  expect(offered.currentAction).toMatchObject({ kind: "trigger", actorId: actor.id });
  expect(offered.currentAction.triggerOptions.map((option) => option.effectId)).toContain("zhuge_liang_stargazing");

  const actorDock = actorPage.locator(`.local-player-dock[data-player-anchor="${actor.id}"]`);
  const stargazing = actorDock.locator(".local-hero-skills").getByRole("button", { name: "Stargazing", exact: true });
  await expect(stargazing).toBeEnabled();
  await expect(actorDock.locator('[data-action-extras="true"]').getByRole("button", { name: /Stargazing/i })).toHaveCount(0);
  const triggerResponse = postedAction(actorPage, "trigger");
  await stargazing.click();
  const triggered = await triggerResponse;
  expect(triggered.ok()).toBeTruthy();
  expect(JSON.parse(triggered.request().postData() ?? "{}")).toMatchObject({
    action: "trigger", code: seed.code, token: actor.token, providerId: "zhuge_liang_stargazing",
  });

  const actorView = await roomView(request, seed, 1);
  expect(actorView.isMyAction).toBe(true);
  expect(actorView.currentAction).toMatchObject({ kind: "deck_reorder", actorId: actor.id });
  expect(actorView.currentAction.deckReorder.cards.map((item) => item.id)).toEqual(revealedCards.map((item) => item.id));
  const dialog = actorPage.getByRole("dialog", { name: "Stargazing deck reorder" });
  await expect(dialog).toBeVisible();
  await expect.poll(() => dialog.evaluate((element) => element.contains(document.activeElement))).toBe(true);
  return { seed, turnPage, actorPage, actor, actorDock, actorView, dialog };
}

async function waitBeyondGenericCardAnimation(page) {
  const durationMs = await page.evaluate(() => {
    const value = getComputedStyle(document.documentElement).getPropertyValue("--played-card-display").trim();
    const amount = Number.parseFloat(value);
    return amount * (value.endsWith("ms") ? 1 : 1000);
  });
  expect(durationMs).toBeGreaterThan(0);
  // This wait is tied to the app's actual generic played-card duration: the
  // design specifically requires checking persistence after that animation.
  await page.waitForTimeout(durationMs + 120);
}

async function assertResponsiveComposition({ page, dialog, viewport, screenshotName, testInfo }) {
  await waitBeyondGenericCardAnimation(page);
  const groups = dialog.locator(".deck-reorder-group");
  await expect(groups).toHaveCount(2);
  await expect(dialog.locator('[data-deck-sequence="top"]')).toBeVisible();
  await expect(dialog.locator('[data-deck-sequence="bottom"]')).toBeVisible();
  await expect(dialog.locator(".deck-reorder-empty")).toHaveText("No cards placed here yet.");

  const composition = await dialog.evaluate((element) => {
    const panel = element.getBoundingClientRect();
    const row = element.querySelector('[data-deck-reorder-sequence="bottom"]');
    const rowBox = row.getBoundingClientRect();
    const empty = element.querySelector(".deck-reorder-empty").getBoundingClientRect();
    const faces = [...element.querySelectorAll(".deck-reorder-card")].map((item) => {
      const face = item.querySelector(".played-card");
      const box = face.getBoundingClientRect();
      const style = getComputedStyle(face);
      return {
        id: item.getAttribute("data-deck-card-id"),
        width: box.width,
        height: box.height,
        opacity: Number(style.opacity),
        animation: style.animationName,
        transform: style.transform,
        transformIdentity: new DOMMatrixReadOnly(style.transform).isIdentity,
        name: face.querySelector(".card-name-mark")?.textContent?.trim(),
        rankAndSuit: face.querySelector("i")?.textContent?.replaceAll("\n", "").replaceAll(" ", ""),
      };
    });
    const completion = element.querySelector("[data-deck-reorder-submit]").getBoundingClientRect();
    return {
      panel: { x: panel.x, y: panel.y, right: panel.right, bottom: panel.bottom, height: panel.height },
      emptyHeight: empty.height,
      row: { left: rowBox.left, right: rowBox.right, width: row.clientWidth, scrollWidth: row.scrollWidth },
      faces,
      completion: { x: completion.x, y: completion.y, right: completion.right, bottom: completion.bottom, height: completion.height },
      viewport: { width: innerWidth, height: innerHeight, documentWidth: document.documentElement.scrollWidth },
    };
  });

  expect(composition.panel.x).toBeGreaterThanOrEqual(0);
  expect(composition.panel.y).toBeGreaterThanOrEqual(0);
  expect(composition.panel.right).toBeLessThanOrEqual(viewport.width);
  expect(composition.panel.bottom).toBeLessThanOrEqual(viewport.height);
  expect(composition.emptyHeight).toBeLessThan(40);
  expect(composition.faces.map((face) => face.id)).toEqual(revealedCards.map((item) => item.id));
  expect(composition.faces.every((face) => face.width >= 68 && face.height >= 90)).toBe(true);
  expect(composition.faces.every((face) => face.opacity === 1 && face.animation === "none" && face.transformIdentity)).toBe(true);
  expect(composition.faces.map((face) => [face.name, face.rankAndSuit])).toEqual([
    ["Attack", "A♠"], ["Dodge", "2♣"], ["Peach", "Q♥"], ["Duel", "K♦"],
  ]);
  expect(composition.viewport.documentWidth).toBeLessThanOrEqual(viewport.width);
  expect(composition.completion.x).toBeGreaterThanOrEqual(0);
  expect(composition.completion.y).toBeGreaterThanOrEqual(0);
  expect(composition.completion.right).toBeLessThanOrEqual(viewport.width);
  expect(composition.completion.bottom).toBeLessThanOrEqual(viewport.height);
  expect(composition.completion.height).toBeGreaterThanOrEqual(44);

  if (viewport.width === 320) {
    expect(composition.row.scrollWidth).toBeGreaterThan(composition.row.width);
    const scrollHint = dialog.locator('.deck-reorder-group[data-card-count="4"] .deck-reorder-scroll-hint');
    await expect(scrollHint).toBeVisible();
    const beforeScroll = await page.evaluate(() => scrollY);
    const firstCard = dialog.locator('[data-deck-card-id="real-stargazing-attack"] .deck-reorder-card-face');
    const initialFirstCardBox = await firstCard.boundingBox();
    const initialRowBox = await dialog.locator('[data-deck-reorder-sequence="bottom"]').boundingBox();
    expect(initialFirstCardBox && initialRowBox).toBeTruthy();
    expect(initialFirstCardBox.x).toBeGreaterThanOrEqual(initialRowBox.x - 1);
    expect(initialFirstCardBox.x + initialFirstCardBox.width).toBeLessThanOrEqual(initialRowBox.x + initialRowBox.width + 1);
    await dialog.locator('[data-deck-card-id="real-stargazing-duel"]').scrollIntoViewIfNeeded();
    expect(await page.evaluate(() => scrollY)).toBe(beforeScroll);
    const finalCard = dialog.locator('[data-deck-card-id="real-stargazing-duel"] .deck-reorder-card-face');
    const finalCardBox = await finalCard.boundingBox();
    const rowBox = await dialog.locator('[data-deck-reorder-sequence="bottom"]').boundingBox();
    expect(finalCardBox && rowBox).toBeTruthy();
    expect(finalCardBox.x).toBeGreaterThanOrEqual(rowBox.x - 1);
    expect(finalCardBox.x + finalCardBox.width).toBeLessThanOrEqual(rowBox.x + rowBox.width + 1);
    await dialog.locator('[data-deck-reorder-sequence="bottom"]').evaluate((row) => { row.scrollLeft = 0; });
  } else {
    expect(composition.row.scrollWidth).toBeLessThanOrEqual(composition.row.width);
    for (const face of composition.faces) {
      expect(face.width).toBeGreaterThanOrEqual(70);
    }
  }

  await page.screenshot({ path: testInfo.outputPath(`${screenshotName}.png`), animations: "disabled" });
  await testInfo.attach(screenshotName, { path: testInfo.outputPath(`${screenshotName}.png`), contentType: "image/png" });
  return composition;
}

for (const viewport of [
  { width: 390, height: 844 },
  { width: 480, height: 900 },
  { width: 320, height: 640 },
  { width: 1440, height: 900 },
]) {
  test(`real four-card Stargazing stays readable and ordered at ${viewport.width}×${viewport.height}`, async ({ page, request }, testInfo) => {
    const opened = await openRealStargazingDecision({ page, request, viewport });
    await assertResponsiveComposition({
      page: opened.actorPage,
      dialog: opened.dialog,
      viewport,
      screenshotName: `stargazing-real-${viewport.width}x${viewport.height}`,
      testInfo,
    });

    const dockGeometry = await opened.actorPage.evaluate(async (actorId) => {
      const overlay = document.querySelector(".deck-reorder-overlay");
      const dock = document.querySelector(`.local-player-dock[data-player-anchor="${actorId}"]`);
      if (!overlay || !dock) return null;
      const originalDisplay = overlay.style.display;
      const measure = () => {
        const { x, y, width, height } = dock.getBoundingClientRect();
        return { x, y, width, height };
      };
      const visible = measure();
      const overlayPosition = getComputedStyle(overlay).position;
      overlay.style.display = "none";
      await new Promise(requestAnimationFrame);
      const hidden = measure();
      overlay.style.display = originalDisplay;
      await new Promise(requestAnimationFrame);
      const restored = measure();
      return { visible, hidden, restored, overlayPosition };
    }, opened.actor.id);
    expect(dockGeometry).toBeTruthy();
    expect(dockGeometry.overlayPosition).toBe("fixed");
    for (const key of ["x", "y", "width", "height"]) {
      expect(Math.abs(dockGeometry.visible[key] - dockGeometry.hidden[key])).toBeLessThanOrEqual(0.5);
      expect(Math.abs(dockGeometry.visible[key] - dockGeometry.restored[key])).toBeLessThanOrEqual(0.5);
    }

    if (viewport.width !== 390) return;

    const focusableButtons = opened.dialog.locator("button:not(:disabled)");
    const firstFocusable = focusableButtons.first();
    const lastFocusable = focusableButtons.last();
    await firstFocusable.focus();
    await opened.actorPage.keyboard.press("Shift+Tab");
    await expect(lastFocusable).toBeFocused();
    await opened.actorPage.keyboard.press("Tab");
    await expect(firstFocusable).toBeFocused();
    const backgroundControl = opened.actorPage.getByRole("button", { name: /Inspect/ }).first();
    const backgroundBox = await backgroundControl.boundingBox();
    expect(backgroundBox).toBeTruthy();
    const intercepted = await opened.actorPage.evaluate(({ x, y }) => {
      const hit = document.elementFromPoint(x, y);
      return Boolean(hit?.closest(".deck-reorder-overlay"));
    }, { x: backgroundBox.x + backgroundBox.width / 2, y: backgroundBox.y + backgroundBox.height / 2 });
    expect(intercepted).toBe(true);

    // A non-acting real player receives the same public room but no private
    // Stargazing cards or reorder controls.
    const observer = await roomView(request, opened.seed, 2);
    expect(observer.currentAction.kind).toBe("deck_reorder");
    expect(observer.currentAction.deckReorder).toBeUndefined();
    const observerJson = JSON.stringify(observer.currentAction);
    for (const item of revealedCards) expect(observerJson).not.toContain(item.id);
    await expect(opened.turnPage.getByRole("dialog", { name: "Stargazing deck reorder" })).toHaveCount(0);
    await expect(opened.turnPage.locator(".deck-reorder-card")).toHaveCount(0);
    const observerMarkup = await opened.turnPage.locator("body").innerHTML();
    for (const item of revealedCards) expect(observerMarkup).not.toContain(item.id);

    const bottom = opened.dialog.locator('[data-deck-reorder-sequence="bottom"]');
    const order = async (sequence) => sequence.locator("[data-deck-card-id]").evaluateAll((items) => items.map((item) => item.getAttribute("data-deck-card-id")));
    expect(await order(bottom)).toEqual(revealedCards.map((item) => item.id));
    await expect(bottom.locator('[data-deck-card-id="real-stargazing-attack"] button[aria-label="Move Attack earlier"]')).toBeDisabled();
    await expect(bottom.locator('[data-deck-card-id="real-stargazing-duel"] button[aria-label="Move Duel later"]')).toBeDisabled();

    await bottom.locator('[data-deck-card-id="real-stargazing-attack"] button[aria-label="Move Attack later"]').click();
    expect(await order(bottom)).toEqual([
      "real-stargazing-dodge", "real-stargazing-attack", "real-stargazing-peach", "real-stargazing-duel",
    ]);
    await bottom.locator('[data-deck-card-id="real-stargazing-duel"] button[aria-label="Move Duel earlier"]').click();
    expect(await order(bottom)).toEqual([
      "real-stargazing-dodge", "real-stargazing-attack", "real-stargazing-duel", "real-stargazing-peach",
    ]);
    await bottom.locator('[data-deck-card-id="real-stargazing-dodge"] button[aria-label="Move Dodge to top of deck"]').click();
    const top = opened.dialog.locator('[data-deck-reorder-sequence="top"]');
    expect(await order(top)).toEqual(["real-stargazing-dodge"]);
    expect(await order(bottom)).toEqual(["real-stargazing-attack", "real-stargazing-duel", "real-stargazing-peach"]);

    const submit = opened.dialog.locator("[data-deck-reorder-submit]");
    await expect(submit).toBeEnabled();
    const submitBox = await submit.boundingBox();
    expect(submitBox).toBeTruthy();
    expect(submitBox.y + submitBox.height).toBeLessThanOrEqual(viewport.height);
    const revisionBeforeSubmit = opened.actorView.actionRevision;
    const completionResponse = postedAction(opened.actorPage, "trigger");
    await submit.click();
    const completed = await completionResponse;
    expect(completed.ok()).toBeTruthy();
    expect(JSON.parse(completed.request().postData() ?? "{}")).toMatchObject({
      action: "trigger",
      providerId: "private_deck_reorder",
      topCardIds: ["real-stargazing-dodge"],
      bottomCardIds: ["real-stargazing-attack", "real-stargazing-duel", "real-stargazing-peach"],
    });
    await expect(opened.dialog).toHaveCount(0);
    const resumed = await roomView(request, opened.seed, 1);
    expect(resumed.actionRevision).not.toBe(revisionBeforeSubmit);
    for (const item of revealedCards) expect(JSON.stringify(observer.currentAction)).not.toContain(item.id);
    await opened.actorPage.close();
  });
}
