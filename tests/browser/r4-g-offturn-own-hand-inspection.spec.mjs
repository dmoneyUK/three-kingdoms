import { expect, test } from "@playwright/test";

test.use({ hasTouch: true });

const API = "http://127.0.0.1:3137";
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 390, height: 700 },
  { width: 440, height: 894 },
  { width: 480, height: 900 },
];

for (const viewport of VIEWPORTS) {
  for (const handSize of [3, 5, 8]) {
    test(`R4-G read-only off-turn inspection at ${viewport.width}×${viewport.height} with ${handSize} overlapping cards`, async ({ page }, testInfo) => {
      await page.setViewportSize(viewport);
      await page.goto(`/tests/browser/fixture.html?state=active-attack-observer&count=4&handSize=${handSize}&handKind=Attack`);

      const dock = page.locator('.local-player-dock[data-player-anchor="p3"]');
      const room = await page.evaluate(() => window.__browserRoom);
      expect(room.meId).toBe("p3");
      expect(room.currentAction).toMatchObject({ kind: "response", actorId: "p2", legalActions: [] });
      expect(room.myHand).toHaveLength(handSize);
      await expect(dock.locator("[data-hand-card-id]")).toHaveCount(handSize);
      await expect(dock.locator('[data-action-slot="primary"] button.primary')).toHaveCount(0);

      const firstSlot = dock.locator('[data-hand-card-id="browser-offturn-1"]');
      const firstFace = firstSlot.locator(".game-card");
      await expect(firstFace).toBeDisabled();
      await expect(firstFace).toHaveAttribute("aria-pressed", "false");
      await expect(firstSlot).toHaveAttribute("data-card-selected", "false");
      expect(await firstSlot.getAttribute("data-card-inspect-focused")).not.toBe("true");
      await expect(firstSlot.getByTestId("hand-card-details-action")).toHaveCount(0);

      const inspectionButton = firstSlot.getByTestId("hand-card-inspection-action");
      await expect(inspectionButton).toHaveAccessibleName("Inspect Attack");
      await expect(inspectionButton).toHaveAttribute("aria-pressed", "false");
      await inspectionButton.focus();
      await page.keyboard.press("Enter");
      await expect(firstSlot).toHaveAttribute("data-card-inspect-focused", "true");
      await expect(inspectionButton).toHaveAttribute("aria-pressed", "true");
      await expect(firstSlot).toHaveAttribute("data-card-selected", "false");
      await expect(firstFace).toBeDisabled();
      await expect(firstFace).toHaveAttribute("aria-pressed", "false");

      const detailsAction = firstSlot.getByTestId("hand-card-details-action");
      const detailsGeometry = await detailsAction.evaluate((button) => {
        const face = button.closest(".card-slot").querySelector(".game-card");
        const faceRect = face.getBoundingClientRect();
        const buttonRect = button.getBoundingClientRect();
        const center = document.elementFromPoint(buttonRect.left + buttonRect.width / 2, buttonRect.top + buttonRect.height / 2);
        return {
          face: { left: faceRect.left, top: faceRect.top, right: faceRect.right, bottom: faceRect.bottom },
          button: { left: buttonRect.left, top: buttonRect.top, right: buttonRect.right, bottom: buttonRect.bottom, width: buttonRect.width, height: buttonRect.height },
          centerHit: center === button || button.contains(center),
        };
      });
      expect(detailsGeometry.button.width).toBeGreaterThanOrEqual(44);
      expect(detailsGeometry.button.height).toBeGreaterThanOrEqual(44);
      expect(detailsGeometry.button.left).toBeGreaterThanOrEqual(detailsGeometry.face.left - 1);
      expect(detailsGeometry.button.top).toBeGreaterThanOrEqual(detailsGeometry.face.top - 1);
      expect(detailsGeometry.button.right).toBeLessThanOrEqual(detailsGeometry.face.right + 1);
      expect(detailsGeometry.button.bottom).toBeLessThanOrEqual(detailsGeometry.face.bottom + 1);
      expect(detailsGeometry.centerHit).toBe(true);

      await detailsAction.focus();
      await page.keyboard.press("Enter");
      const dialog = page.getByRole("dialog");
      await expect(dialog).toBeVisible();
      await expect(dialog.getByRole("textbox", { name: "Canonical rules for Attack" })).toHaveValue(/.+/);
      await expect(dialog.getByRole("img", { name: /Attack/ })).toBeVisible();
      await page.keyboard.press("Escape");
      await expect(dialog).toHaveCount(0);
      await expect(detailsAction).toBeFocused();

      const lastSlot = dock.locator(`[data-hand-card-id="browser-offturn-${handSize}"]`);
      await lastSlot.getByTestId("hand-card-inspection-action").tap();
      await expect(firstSlot).toHaveAttribute("data-card-inspect-focused", "false");
      await expect(inspectionButton).toHaveAttribute("aria-pressed", "false");
      await expect(lastSlot).toHaveAttribute("data-card-inspect-focused", "true");
      await expect(lastSlot.getByTestId("hand-card-inspection-action")).toHaveAttribute("aria-pressed", "true");
      await expect(lastSlot).toHaveAttribute("data-card-selected", "false");
      await expect(lastSlot.locator(".game-card")).toBeDisabled();
      await expect(lastSlot.getByTestId("hand-card-details-action")).toBeVisible();
      expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(viewport.width);

      await testInfo.attach(`r4-g-offturn-${handSize}-cards-${viewport.width}x${viewport.height}.png`, {
        body: await page.screenshot(),
        contentType: "image/png",
      });
    });
  }
}

test("R4-G inspection focus closes on hand loss and viewer change without exposing the prior Hand", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=active-attack-observer&count=4&handSize=5&handKind=Attack");

  const oldSlot = page.locator('[data-hand-card-id="browser-offturn-1"]');
  await oldSlot.getByTestId("hand-card-inspection-action").click();
  await oldSlot.getByTestId("hand-card-details-action").click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();

  await page.evaluate(() => window.__switchQuickTestViewer("p2"));
  await expect(dialog).toHaveCount(0);
  await expect(page.locator('.local-player-dock[data-player-anchor="p2"]')).toBeVisible();
  await expect(page.locator('[data-hand-card-id="browser-offturn-1"]')).toHaveCount(0);
  await expect(page.locator('[data-card-inspect-focused="true"]')).toHaveCount(0);

  await page.goto("/tests/browser/fixture.html?state=active-attack-observer&count=4&handSize=3&handKind=Attack");
  const removedSlot = page.locator('[data-hand-card-id="browser-offturn-1"]');
  await removedSlot.getByTestId("hand-card-inspection-action").click();
  await removedSlot.getByTestId("hand-card-details-action").click();
  await page.evaluate(() => window.__setBrowserHandIds([]));
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await expect(page.locator('[data-card-inspect-focused="true"]')).toHaveCount(0);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

test("R4-G touch inspection remains separate from card selection while the Hand rail scrolls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/tests/browser/fixture.html?state=active-attack-observer&count=4&handSize=8&handKind=Attack");
  const dock = page.locator('.local-player-dock[data-player-anchor="p3"]');
  const rail = dock.locator(".local-hand-rail");
  const firstSlot = dock.locator('[data-hand-card-id="browser-offturn-1"]');
  await firstSlot.getByTestId("hand-card-inspection-action").tap({ position: { x: 8, y: 50 } });
  await expect(firstSlot).toHaveAttribute("data-card-inspect-focused", "true");
  await expect(firstSlot).toHaveAttribute("data-card-selected", "false");
  const initial = await rail.evaluate((element) => ({ clientWidth: element.clientWidth, scrollWidth: element.scrollWidth }));
  expect(initial.scrollWidth).toBeGreaterThan(initial.clientWidth);
  const railBounds = await rail.boundingBox();
  expect(railBounds).toBeTruthy();
  const faceBounds = await firstSlot.locator(".game-card").boundingBox();
  expect(faceBounds).toBeTruthy();
  const touchY = Math.round(faceBounds.y + 60);
  const startX = Math.round(railBounds.x + railBounds.width - 20);
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: startX, y: touchY, id: 0 }] });
  for (let step = 1; step <= 6; step += 1) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: startX - step * 24, y: touchY, id: 0 }],
    });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await expect.poll(() => rail.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);
  await cdp.detach();
  await expect(firstSlot).toHaveAttribute("data-card-inspect-focused", "true");
  await expect(firstSlot.locator(".game-card")).toBeDisabled();
  await expect(firstSlot).toHaveAttribute("data-card-selected", "false");
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);
  expect(await page.evaluate(() => window.__browserActions)).toEqual([]);
});

function gameplayCard(kind, id, suit = "♠", rank = "7") {
  return { kind, id, suit, rank };
}

async function seedR4GGame(request) {
  const inspectedCard = gameplayCard("Attack", "r4g-viewer-inspection-attack");
  const dodgeCard = gameplayCard("Dodge", "r4g-viewer-response-dodge", "♣", "8");
  const attackerCard = gameplayCard("Attack", "r4g-attacker-attack", "♥", "9");
  const players = [
    { name: "R4-G Viewer", role: "Lord", hero: "cao-cao", hp: 4, maxHp: 4, hand: [inspectedCard, dodgeCard, gameplayCard("Peach", "r4g-viewer-peach", "♦", "3")] },
    { name: "R4-G Attacker", role: "Loyalist", hero: "sun-quan", hp: 4, maxHp: 4, hand: [attackerCard] },
    { name: "R4-G Third", role: "Rebel", hero: "xiahou-dun", hp: 4, maxHp: 4, hand: [] },
    { name: "R4-G Fourth", role: "Renegade", hero: "huang-gai", hp: 4, maxHp: 4, hand: [] },
  ];
  const response = await request.post(`${API}/__test/seed-playing-game`, {
    data: { phase: "play", turnSeat: 1, players },
  });
  if (!response.ok()) throw new Error(`R4-G Worker/D1 room seed failed: ${await response.text()}`);
  return { ...(await response.json()), inspectedCard, dodgeCard, attackerCard };
}

async function openR4GPlayer(page, room, index) {
  const player = room.players[index];
  await page.setViewportSize({ width: 440, height: 894 });
  await page.addInitScript(({ code, token, name }) => {
    localStorage.setItem("three-realms-session", JSON.stringify({ code, token, name }));
  }, { code: room.code, token: player.token, name: player.name });
  await page.goto(`${API}/`);
  await expect(page.locator(".game-shell")).toBeVisible();
  await expect(page.locator(`.local-player-dock[data-player-anchor="${player.id}"]`)).toBeVisible();
  return player;
}

function trackGameplayPosts(page) {
  const posts = [];
  page.on("request", (request) => {
    if (request.method() !== "POST" || !request.url().endsWith("/api/rooms")) return;
    try { posts.push(request.postDataJSON()); } catch { posts.push({ invalidJson: true }); }
  });
  return posts;
}

function gameplayChoicePosts(posts) {
  return posts.filter((post) => !["expire_inactive_room", "start_response_timer"].includes(post.action));
}

test("R4-G authenticated off-turn inspection preserves private ownership and the real Dodge response", async ({ browser, page, request }, testInfo) => {
  test.setTimeout(90_000);
  const room = await seedR4GGame(request);
  const viewerPosts = trackGameplayPosts(page);
  const viewer = await openR4GPlayer(page, room, 0);
  const attackerPage = await browser.newPage({ viewport: { width: 440, height: 894 } });
  const attackerPosts = trackGameplayPosts(attackerPage);
  const attacker = await openR4GPlayer(attackerPage, room, 1);

  const viewerSnapshotResponse = await request.get(`${API}/api/rooms?code=${room.code}&token=${viewer.token}`);
  expect(viewerSnapshotResponse.ok()).toBeTruthy();
  const viewerSnapshot = await viewerSnapshotResponse.json();
  expect(viewerSnapshot.meId).toBe(viewer.id);
  expect(viewerSnapshot.currentAction).toMatchObject({ kind: "turn", actorId: attacker.id });
  expect(viewerSnapshot.myHand.map((item) => item.id)).toEqual([room.inspectedCard.id, room.dodgeCard.id, "r4g-viewer-peach"]);
  expect(JSON.stringify(viewerSnapshot)).not.toContain(room.attackerCard.id);

  const viewerDock = page.locator(`.local-player-dock[data-player-anchor="${viewer.id}"]`);
  const inspectedSlot = viewerDock.locator(`[data-hand-card-id="${room.inspectedCard.id}"]`);
  const inspectedFace = inspectedSlot.locator(".game-card");
  await expect(inspectedFace).toBeDisabled();
  await expect(viewerDock.locator(".game-card:not(:disabled)")).toHaveCount(0);
  await expect(viewerDock.locator('[data-action-slot="primary"] button.primary')).toHaveCount(0);
  await expect(viewerDock.getByRole("button", { name: /^(Play|Confirm)$/ })).toHaveCount(0);
  const viewerActionCountBeforeInspection = gameplayChoicePosts(viewerPosts).length;
  await inspectedSlot.getByTestId("hand-card-inspection-action").tap();
  await expect(inspectedSlot).toHaveAttribute("data-card-inspect-focused", "true");
  await expect(inspectedSlot.getByTestId("hand-card-inspection-action")).toHaveAttribute("aria-pressed", "true");
  await expect(inspectedFace).toBeDisabled();
  await expect(inspectedSlot).toHaveAttribute("data-card-selected", "false");
  await inspectedSlot.getByTestId("hand-card-details-action").tap();
  const details = page.getByRole("dialog");
  await expect(details).toHaveAttribute("data-card-details-context", "private-hand");
  await expect(details).toHaveAttribute("data-card-details-card-id", room.inspectedCard.id);
  await expect(details.getByRole("textbox", { name: "Canonical rules for Attack" })).toHaveValue(/.+/);
  await expect(details.getByRole("img", { name: /Attack/ })).toBeVisible();
  expect(gameplayChoicePosts(viewerPosts)).toHaveLength(viewerActionCountBeforeInspection);
  await page.waitForTimeout(1_500);
  await expect(inspectedSlot).toHaveAttribute("data-card-inspect-focused", "true");
  await expect(details).toBeVisible();
  expect(gameplayChoicePosts(viewerPosts)).toHaveLength(viewerActionCountBeforeInspection);
  await testInfo.attach("r4-g-real-offturn-inspection.png", { body: await page.screenshot(), contentType: "image/png" });

  const attackerDock = attackerPage.locator(`.local-player-dock[data-player-anchor="${attacker.id}"]`);
  const attackFace = attackerDock.locator(`[data-hand-card-id="${room.attackerCard.id}"] .game-card`);
  await expect(attackFace).toBeEnabled();
  const attackerActionCountBeforePlay = gameplayChoicePosts(attackerPosts).length;
  await attackFace.click();
  await attackerPage.getByRole("button", { name: `Select ${viewer.name}`, exact: true }).click();
  const play = attackerDock.locator('[data-action-slot="primary"] button.primary');
  await expect(play).toBeEnabled();
  const playSubmitted = attackerPage.waitForResponse((candidate) => candidate.url() === `${API}/api/rooms`
    && candidate.request().method() === "POST"
    && candidate.request().postDataJSON()?.action === "play_card");
  await play.click();
  const playResponse = await playSubmitted;
  expect(playResponse.ok()).toBeTruthy();
  expect(playResponse.request().postDataJSON()).toMatchObject({
    action: "play_card", code: room.code, token: attacker.token,
    cardId: room.attackerCard.id, targetId: viewer.id,
  });

  await expect(details).toHaveCount(0, { timeout: 20_000 });
  await expect(inspectedSlot).toHaveAttribute("data-card-inspect-focused", "false");
  const dodgeSlot = viewerDock.locator(`[data-hand-card-id="${room.dodgeCard.id}"]`);
  const dodgeFace = dodgeSlot.locator(".game-card");
  await expect(dodgeFace).toBeEnabled({ timeout: 20_000 });
  await expect(dodgeSlot.getByTestId("hand-card-inspection-action")).toHaveCount(0);
  await dodgeFace.click();
  const confirm = viewerDock.locator('[data-action-slot="primary"] button.primary');
  await expect(confirm).toBeEnabled();
  const responseSubmitted = page.waitForResponse((candidate) => candidate.url() === `${API}/api/rooms`
    && candidate.request().method() === "POST"
    && candidate.request().postDataJSON()?.action === "respond");
  await confirm.click();
  const dodgeResponse = await responseSubmitted;
  expect(dodgeResponse.ok()).toBeTruthy();
  expect(dodgeResponse.request().postDataJSON()).toMatchObject({
    action: "respond", code: room.code, token: viewer.token,
    providerId: "card", cardId: room.dodgeCard.id,
  });
  const viewerActions = gameplayChoicePosts(viewerPosts);
  expect(viewerActions).toHaveLength(viewerActionCountBeforeInspection + 1);
  expect(viewerActions.at(-1)).toMatchObject({ action: "respond", cardId: room.dodgeCard.id });
  const attackerActions = gameplayChoicePosts(attackerPosts);
  expect(attackerActions).toHaveLength(attackerActionCountBeforePlay + 1);
  expect(attackerActions.at(-1)).toMatchObject({ action: "play_card", cardId: room.attackerCard.id });
  await attackerPage.close();
});
